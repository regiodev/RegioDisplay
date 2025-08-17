package ro.regio_cloud.display.data

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import ro.regio_cloud.display.network.ApiService
import ro.regio_cloud.display.network.ClientPlaylistItem
import ro.regio_cloud.display.network.ClientPlaylistResponse
import ro.regio_cloud.display.network.ClientRotationUpdate
import ro.regio_cloud.display.network.PlaybackLog
import ro.regio_cloud.display.network.ScreenRegister
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

class ScreenNotActivatedException(message: String = "Ecranul nu este încă activat.") : Exception(message)
class ScreenNotFoundException(message: String = "Ecranul nu a fost găsit pe server (șters).") : Exception(message)

data class DownloadProgress(
    val progressPercentage: Int,
    val filesDownloaded: Int,
    val totalFiles: Int
)

class PlaylistRepository(
    val userPrefsRepo: UserPreferencesRepository,
    private val apiService: ApiService,
    private val filesDir: File,
    private val gson: Gson
) {

    private val mediaCacheDir = File(filesDir, "media_cache")
    private val logFile = File(filesDir, "playback_log.json")

    private val _downloadProgress = MutableStateFlow<DownloadProgress?>(null)
    val downloadProgress: StateFlow<DownloadProgress?> = _downloadProgress.asStateFlow()

    init {
        if (!mediaCacheDir.exists()) { mediaCacheDir.mkdirs() }
    }

    suspend fun getCachedPlaylist(): ClientPlaylistResponse? {
        val playlistJson = userPrefsRepo.cachedPlaylistJsonFlow.firstOrNull()
        return if (playlistJson != null) gson.fromJson(playlistJson, ClientPlaylistResponse::class.java) else null
    }

    suspend fun registerClient(uniqueKey: String, pairingCode: String): Result<Unit> {
        return try {
            val payload = ScreenRegister(uniqueKey, pairingCode)
            val response = apiService.registerClient(payload)
            if (response.isSuccessful) Result.success(Unit) else Result.failure(Exception("Server returned error: ${response.code()}"))
        } catch (e: IOException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun syncRemotePlaylistAndCacheMedia(): Result<ClientPlaylistResponse> {
        _downloadProgress.value = null
        val uniqueKey = userPrefsRepo.uniqueKeyFlow.firstOrNull() ?: return Result.failure(Exception("Cheia unică a ecranului nu este setată."))
        val localVersion = userPrefsRepo.cachedPlaylistVersionFlow.firstOrNull()

        return try {
            val response = apiService.syncPlaylist(uniqueKey, localVersion)

            when (response.code()) {
                200 -> {
                    val newPlaylist = response.body()!!
                    userPrefsRepo.saveScreenName(newPlaylist.screenName)
                    userPrefsRepo.savePlaylistName(newPlaylist.name)

                    // --- Logica de sincronizare rotație ---
                    val serverTimestamp = newPlaylist.rotationUpdatedAt
                    val localTimestamp = userPrefsRepo.rotationTimestampFlow.firstOrNull()
                    if (serverTimestamp != null && newPlaylist.rotation != null) {
                        if (localTimestamp == null || serverTimestamp > localTimestamp) {
                            userPrefsRepo.saveRotation(newPlaylist.rotation, serverTimestamp)
                            Log.i("RepoSync", "Rotație actualizată de la server: ${newPlaylist.rotation}°")
                        }
                    }

                    if (newPlaylist.name.contains("Ecran Neactivat", ignoreCase = true)) {
                        throw ScreenNotActivatedException()
                    }

                    handleMediaFileSync(newPlaylist)
                    _downloadProgress.value = null

                    val newPlaylistJson = gson.toJson(newPlaylist)
                    userPrefsRepo.savePlaylistJson(newPlaylistJson)
                    userPrefsRepo.savePlaylistVersion(newPlaylist.playlistVersion)
                    Result.success(newPlaylist)
                }
                304 -> {
                    val cachedPlaylist = getCachedPlaylist() ?: return Result.failure(Exception("State inconsistency: 304 with empty cache."))
                    Result.success(cachedPlaylist)
                }
                404 -> throw ScreenNotFoundException()
                else -> throw Exception("Server error response: ${response.code()}")
            }
        } catch (e: Exception) {
            _downloadProgress.value = null
            Result.failure(e)
        }
    }

    // --- FUNCȚIE NOUĂ ADĂUGATĂ ---
    suspend fun reportRotationChange(rotation: Int, timestamp: String): Result<Unit> {
        val uniqueKey = userPrefsRepo.uniqueKeyFlow.firstOrNull() ?: return Result.failure(Exception("Cheie unică lipsă."))
        return try {
            val payload = ClientRotationUpdate(rotation, timestamp)
            val response = apiService.reportRotation(uniqueKey, payload)
            if (response.isSuccessful) Result.success(Unit) else Result.failure(Exception("Server returned error: ${response.code()}"))
        } catch (e: IOException) {
            Result.failure(e)
        }
    }

    fun getLocalFileFor(item: ClientPlaylistItem): File? {
        val mediaId = item.url.substringAfterLast('/')
        val fileName = "media_$mediaId"
        val file = File(mediaCacheDir, fileName)
        return if (file.exists()) file else null
    }

    private suspend fun handleMediaFileSync(playlist: ClientPlaylistResponse) {
        val remoteFiles = playlist.items.associateBy { "media_${it.url.substringAfterLast('/')}" }
        val localFiles = mediaCacheDir.listFiles()?.map { it.name }?.toSet() ?: emptySet()
        val filesToDelete = localFiles - remoteFiles.keys
        filesToDelete.forEach { fileName -> File(mediaCacheDir, fileName).delete() }
        val filesToDownload = remoteFiles.filterKeys { it !in localFiles }
        var downloadedCount = 0
        filesToDownload.values.forEach { item ->
            val mediaId = item.url.substringAfterLast('/')
            val fileNameOnDisk = "media_$mediaId"
            val file = File(mediaCacheDir, fileNameOnDisk)
            downloadFile(item, file, downloadedCount, filesToDownload.size)
            downloadedCount++
        }
    }

    private suspend fun downloadFile(item: ClientPlaylistItem, destination: File, downloadedCount: Int, totalToDownload: Int) {
        try {
            val response = apiService.downloadFile(item.url)
            val body = response.body()
            if (response.isSuccessful && body != null) {
                body.byteStream().use { input ->
                    FileOutputStream(destination).use { output ->
                        val buffer = ByteArray(8 * 1024)
                        var read: Int
                        while (input.read(buffer).also { read = it } != -1) {
                            output.write(buffer, 0, read)
                        }
                    }
                }
            } else { if (destination.exists()) destination.delete() }
        } catch (e: Exception) { if (destination.exists()) destination.delete() }
    }

    @Synchronized
    fun savePlaybackLog(log: PlaybackLog) {
        try {
            val type = object : TypeToken<MutableList<PlaybackLog>>() {}.type
            val logs: MutableList<PlaybackLog> = if (logFile.exists() && logFile.length() > 0) {
                gson.fromJson(logFile.readText(), type) ?: mutableListOf()
            } else { mutableListOf() }
            logs.add(log)
            logFile.writeText(gson.toJson(logs))
        } catch (e: Exception) {
            Log.e("PlaylistRepository", "Eroare la salvarea log-ului local.", e)
        }
    }

    suspend fun submitPlaybackLogs(): Result<Unit> {
        if (!logFile.exists() || logFile.length() == 0L) return Result.success(Unit)
        val screenKey = userPrefsRepo.uniqueKeyFlow.firstOrNull() ?: return Result.failure(Exception("Cheie unică lipsă, nu se pot trimite log-urile."))
        val logJson = logFile.readText()
        if (logJson.isBlank()) { logFile.delete(); return Result.success(Unit) }
        val type = object : TypeToken<List<PlaybackLog>>() {}.type
        val logs: List<PlaybackLog> = gson.fromJson(logJson, type)
        if (logs.isEmpty()) { logFile.delete(); return Result.success(Unit) }
        return try {
            val response = apiService.submitLogs(screenKey, logs)
            if (response.isSuccessful) { logFile.delete(); Result.success(Unit)
            } else { Result.failure(Exception("Serverul a returnat eroare la trimiterea log-urilor: ${response.code()}")) }
        } catch (e: IOException) { Result.failure(e) }
    }
}