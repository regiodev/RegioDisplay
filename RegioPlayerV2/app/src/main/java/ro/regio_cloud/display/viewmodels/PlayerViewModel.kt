package ro.regio_cloud.display.viewmodels

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import ro.regio_cloud.display.BuildConfig
import ro.regio_cloud.display.data.PlaylistRepository
import ro.regio_cloud.display.data.ScreenNotActivatedException
import ro.regio_cloud.display.data.ScreenNotFoundException
import ro.regio_cloud.display.kiosk.KioskManager
import ro.regio_cloud.display.network.WebSocketClient
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import ro.regio_cloud.display.network.ClientPlaylistResponse
import ro.regio_cloud.display.network.PlaybackLog
import java.io.IOException
import java.time.Instant
import java.time.format.DateTimeFormatter
import java.util.UUID

class PlayerViewModel(
    private val repository: PlaylistRepository,
    private val kioskManager: KioskManager
) : ViewModel() {

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)
    val uiState: StateFlow<PlayerUiState> = _uiState

    private val _currentItem = MutableStateFlow<LocalMediaItem?>(null)
    val currentItem: StateFlow<LocalMediaItem?> = _currentItem

    private val _playbackLoopId = MutableStateFlow(0)
    val playbackLoopId: StateFlow<Int> = _playbackLoopId

    val rotation: StateFlow<Int> = repository.userPrefsRepo.rotationFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    // Kiosk Mode Flows
    val autoStartOnBoot = repository.userPrefsRepo.autoStartOnBootFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val autoRelaunchOnCrash = repository.userPrefsRepo.autoRelaunchOnCrashFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), true)

    private var stateManagementJob: Job? = null
    private var playbackJob: Job? = null
    private var webSocketClient: WebSocketClient? = null

    private val playerVersion: String = BuildConfig.VERSION_NAME
    private var screenResolution: String = "N/A"
    private var isInitialized = false

    private var currentPlaylistId: Int? = null
    private var activeItemForLogging: LocalMediaItem? = null

    fun initialize(resolution: String) {
        if (isInitialized) return
        this.screenResolution = resolution
        this.isInitialized = true
        startStateMachine()
    }

    // Kiosk Mode Setters
    fun setAutoStart(enabled: Boolean) {
        viewModelScope.launch {
            repository.userPrefsRepo.saveAutoStartOnBoot(enabled)
            kioskManager.setBootReceiverState(enabled)
        }
    }

    fun setAutoRelaunch(enabled: Boolean) {
        viewModelScope.launch {
            repository.userPrefsRepo.saveAutoRelaunchOnCrash(enabled)
            kioskManager.setAutoRelaunchState(enabled)
        }
    }

    private fun startStateMachine() {
        stateManagementJob?.cancel()
        stateManagementJob = viewModelScope.launch {
            val uniqueKey = repository.userPrefsRepo.uniqueKeyFlow.first()
            if (uniqueKey.isNullOrBlank()) {
                handleDeactivation()
            } else {
                startWebSocket(uniqueKey)
                checkScreenStatus()
            }
        }
    }

    private suspend fun checkScreenStatus() {
        val progressJob = viewModelScope.launch {
            repository.downloadProgress.collect { progress ->
                if (progress != null) {
                    _uiState.value = PlayerUiState.Downloading(progress.progressPercentage, progress.filesDownloaded, progress.totalFiles)
                }
            }
        }

        val syncResult = repository.syncRemotePlaylistAndCacheMedia()
        progressJob.cancel()

        if (syncResult.isSuccess) {
            Log.d("ViewModel", "Sincronizare reușită. Se trece la redare.")
            val playlist = syncResult.getOrNull()!!
            currentPlaylistId = playlist.id
            val localItems = mapPlaylistToLocalItems(playlist)
            _uiState.value = PlayerUiState.Success(localItems)
            startPlaybackLoop(localItems)
        } else {
            when (val exception = syncResult.exceptionOrNull()) {
                is ScreenNotFoundException, is ScreenNotActivatedException -> {
                    Log.w("ViewModel", "Ecran șters sau neactivat. Se resetează starea. Motiv: ${exception.message}")
                    handleDeactivation()
                }
                is IOException -> {
                    Log.w("ViewModel", "Eroare de rețea. Se încearcă modul offline.")
                    val cachedPlaylist = repository.getCachedPlaylist()
                    if (cachedPlaylist != null) {
                        Log.i("ViewModel", "Playlist găsit în cache. Se pornește redarea offline.")
                        currentPlaylistId = cachedPlaylist.id
                        val localItems = mapPlaylistToLocalItems(cachedPlaylist)
                        _uiState.value = PlayerUiState.Success(localItems)
                        startPlaybackLoop(localItems)
                    } else {
                        Log.e("ViewModel", "Fără conexiune și fără cache. Se afișează codul de împerechere.")
                        val code = repository.userPrefsRepo.pairingCodeFlow.first() ?: "----"
                        _uiState.value = PlayerUiState.NeedsActivation(code)
                    }
                }
                else -> {
                    Log.w("ViewModel", "Eroare de sincronizare temporară: ${exception?.message}")
                    val currentState = _uiState.value
                    if (currentState is PlayerUiState.NeedsActivation) {
                        Log.i("ViewModel", "Rămân în starea de activare pentru reîncercare")
                    } else {
                        Log.e("ViewModel", "Eroare persistentă de sincronizare, se setează Error")
                        _uiState.value = PlayerUiState.Error("Eroare necunoscută")
                    }
                }
            }
        }
    }

    private fun startWebSocket(key: String) {
        webSocketClient?.stop()
        webSocketClient = WebSocketClient(viewModelScope) { message ->
            Log.i("ViewModel", "🔔 NOTIFICARE WEBSOCKET PRIMITĂ: '$message'.")
            if (message.contains("playlist_updated") || message.contains("screen_deleted")) {
                Log.i("ViewModel", "🔄 Mesaj relevant, se repornește mașina de stări pentru sincronizare.")
                playbackJob?.cancel()
                logEvent(activeItemForLogging, "END")
                activeItemForLogging = null
                _currentItem.value = null
                stateManagementJob?.cancel()
                startStateMachine()
            } else {
                Log.d("ViewModel", "Mesaj ignorat (nu este playlist_updated sau screen_deleted)")
            }
        }
        webSocketClient?.start(key, playerVersion, screenResolution)
    }

    private suspend fun generateAndRegisterNewKey() {
        val newKey = UUID.randomUUID().toString()
        val newCode = generatePairingCode()
        repository.userPrefsRepo.saveUniqueKey(newKey)
        repository.userPrefsRepo.savePairingCode(newCode)
        _uiState.value = PlayerUiState.NeedsActivation(newCode)

        val registrationResult = repository.registerClient(newKey, newCode)
        if (registrationResult.isFailure) {
            _uiState.value = PlayerUiState.Error("Eroare de înregistrare")
            return
        }
        startWebSocket(newKey)
        startPollingForActivation()
    }

    private fun startPollingForActivation() {
        viewModelScope.launch {
            var attempts = 0
            val maxAttempts = 240 // 1 ora (240 * 15 secunde)
            
            while (isActive && _uiState.value is PlayerUiState.NeedsActivation && attempts < maxAttempts) {
                Log.d("ViewModel-Polling", "Se verifică starea de activare... (încercarea ${attempts + 1})")
                val syncResult = repository.syncRemotePlaylistAndCacheMedia()
                
                if (syncResult.isFailure && syncResult.exceptionOrNull() !is ScreenNotActivatedException) {
                    Log.w("ViewModel-Polling", "Polling oprit din cauza unei erori (ex: lipsă internet).")
                    break
                }
                
                if (syncResult.isSuccess) {
                    Log.d("ViewModel-Polling", "✅ Activare detectată prin polling! Se repornește mașina de stări.")
                    val playlist = syncResult.getOrNull()!!
                    currentPlaylistId = playlist.id
                    val localItems = mapPlaylistToLocalItems(playlist)
                    _uiState.value = PlayerUiState.Success(localItems)
                    startPlaybackLoop(localItems)
                    break
                }
                
                attempts++
                delay(15000)
            }
            
            if (attempts >= maxAttempts) {
                Log.w("ViewModel-Polling", "Polling timeout după $maxAttempts încercări")
            }
        }
    }

    private suspend fun handleDeactivation() {
        Log.i("ViewModel", "Se execută handleDeactivation: curățare cache și generare cheie nouă.")
        repository.userPrefsRepo.savePlaylistJson(null)
        repository.userPrefsRepo.savePlaylistVersion(null)
        repository.userPrefsRepo.saveScreenName(null)
        generateAndRegisterNewKey()
    }

    private fun startPlaybackLoop(playlist: List<LocalMediaItem>, startIndex: Int = 0) {
        playbackJob?.cancel()
        playbackJob = viewModelScope.launch {
            logEvent(activeItemForLogging, "END")
            activeItemForLogging = null
            _playbackLoopId.value = _playbackLoopId.value + 1
            if (playlist.isEmpty()) {
                Log.w("ViewModel", "Playlist-ul este gol.")
                _currentItem.value = null
                return@launch
            }
            var currentIndex = startIndex
            while (isActive) {
                val item = playlist[currentIndex]
                logEvent(activeItemForLogging, "END")
                _currentItem.value = item
                activeItemForLogging = item
                logEvent(activeItemForLogging, "START")
                if (item.type.startsWith("image/")) {
                    delay(item.duration * 1000L)
                    currentIndex = (currentIndex + 1) % playlist.size
                } else if (item.type.startsWith("video/")) {
                    break
                } else {
                    currentIndex = (currentIndex + 1) % playlist.size
                }
            }
        }
    }

    fun onVideoSequenceEnded(lastVideoIndex: Int) {
        val currentState = _uiState.value
        if (currentState is PlayerUiState.Success) {
            val playlist = currentState.playlist
            logEvent(activeItemForLogging, "END")
            activeItemForLogging = null
            val nextIndex = (lastVideoIndex + 1) % playlist.size
            startPlaybackLoop(playlist, nextIndex)
        }
    }

    private fun mapPlaylistToLocalItems(playlist: ClientPlaylistResponse): List<LocalMediaItem> {
        return playlist.items.mapNotNull { repoItem ->
            repository.getLocalFileFor(repoItem)?.let { file ->
                LocalMediaItem(file, repoItem.type, repoItem.duration, repoItem.url)
            }
        }
    }

    private fun generatePairingCode(length: Int = 4): String {
        val chars = ('A'..'Z') + ('0'..'9')
        return (1..length).map { chars.random() }.joinToString("")
    }

    private fun logEvent(item: LocalMediaItem?, eventType: String) {
        if (item == null || currentPlaylistId == null) return
        val mediaId = item.url.substringAfterLast('/').toIntOrNull() ?: return
        val timestamp = DateTimeFormatter.ISO_INSTANT.format(Instant.now())
        val log = PlaybackLog(mediaId = mediaId, playlistId = currentPlaylistId!!, eventType = eventType, timestamp = timestamp)
        repository.savePlaybackLog(log)
        Log.d("ViewModel-ProofOfPlay", "Log salvat: ${log.eventType} pentru media ID ${log.mediaId}")
    }

    override fun onCleared() {
        super.onCleared()
        logEvent(activeItemForLogging, "END")
        webSocketClient?.stop()
    }
}

class PlayerViewModelFactory(
    private val repository: PlaylistRepository,
    private val kioskManager: KioskManager
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(PlayerViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return PlayerViewModel(repository, kioskManager) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}