package ro.regio_cloud.display

import android.app.Activity
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.os.LocaleListCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import ro.regio_cloud.display.data.PlaylistRepository
import ro.regio_cloud.display.data.UserPreferencesRepository
import ro.regio_cloud.display.kiosk.KioskManager
import ro.regio_cloud.display.network.RetrofitClient
import ro.regio_cloud.display.ui.screens.*
import ro.regio_cloud.display.ui.theme.RegioPlayerV2Theme
import ro.regio_cloud.display.viewmodels.PlayerUiState
import ro.regio_cloud.display.viewmodels.PlayerViewModel
import ro.regio_cloud.display.viewmodels.PlayerViewModelFactory
import ro.regio_cloud.display.workers.SyncWorker
import java.util.Locale
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private val userPrefsRepo by lazy { UserPreferencesRepository(this) }
    private val kioskManager by lazy { KioskManager(this) }
    private val workManager by lazy { WorkManager.getInstance(this) }

    private lateinit var appUpdateManager: AppUpdateManager
    private val updateResultLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK) { /* Handle or log update failure */ }
    }

    private val playerViewModel: PlayerViewModel by viewModels {
        PlayerViewModelFactory(
            repository = PlaylistRepository(
                userPrefsRepo = userPrefsRepo,
                apiService = RetrofitClient.apiService,
                filesDir = this.filesDir,
                gson = Gson()
            ),
            kioskManager = kioskManager
        )
    }

    private var isMenuVisible by mutableStateOf(false)
    private var showExitDialog by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Inițializăm Kiosk Mode pe baza preferințelor salvate
        lifecycleScope.launch {
            val autoRelaunch = userPrefsRepo.autoRelaunchOnCrashFlow.first()
            kioskManager.setAutoRelaunchState(autoRelaunch)
        }

        val resolution = getScreenResolutionString()
        playerViewModel.initialize(resolution)

        appUpdateManager = AppUpdateManagerFactory.create(applicationContext)
        checkForUpdate()
        startPeriodicSync()

        setContent {
            RegioPlayerV2Theme {
                val uiState by playerViewModel.uiState.collectAsState()
                val rotation by playerViewModel.rotation.collectAsState()
                val scope = rememberCoroutineScope()
                val currentLanguage by userPrefsRepo.languageFlow.collectAsState(initial = "ro")

                val successState = uiState as? PlayerUiState.Success
                if (successState != null) {
                    val currentItem by playerViewModel.currentItem.collectAsState()
                    val loopId by playerViewModel.playbackLoopId.collectAsState()
                    PlayerScreen(
                        playlist = successState.playlist,
                        currentItem = currentItem,
                        loopId = loopId,
                        rotationDegrees = rotation,
                        onVideoSequenceEnded = { lastIndex ->
                            playerViewModel.onVideoSequenceEnded(lastIndex)
                        }
                    )
                }

                when (val state = uiState) {
                    is PlayerUiState.Loading -> PairingScreen(pairingCode = "...", rotationDegrees = rotation)
                    is PlayerUiState.Downloading -> DownloadingScreen(
                        progress = state.progress,
                        filesDownloaded = state.filesDownloaded,
                        totalFiles = state.totalFiles,
                        rotationDegrees = rotation
                    )
                    is PlayerUiState.NeedsActivation -> PairingScreen(pairingCode = state.pairingCode, rotationDegrees = rotation)
                    is PlayerUiState.Error -> PairingScreen(pairingCode = "EROARE", rotationDegrees = rotation)
                    is PlayerUiState.Success -> { }
                }

                Box(modifier = Modifier.fillMaxSize()) {
                    if (isMenuVisible) {
                        val pairingCode by userPrefsRepo.pairingCodeFlow.collectAsState(initial = null)
                        val screenName by userPrefsRepo.screenNameFlow.collectAsState(initial = null)
                        val playlistName by userPrefsRepo.playlistNameFlow.collectAsState(initial = null)
                        val context = LocalContext.current

                        SettingsMenu(
                            uiState = uiState,
                            pairingCode = pairingCode,
                            screenName = screenName,
                            playlistName = playlistName,
                            isInternetConnected = isNetworkAvailable(context),
                            currentLanguageCode = currentLanguage,
                            onLanguageSelected = { langCode ->
                                scope.launch {
                                    userPrefsRepo.saveLanguage(langCode)
                                    val appLocale = LocaleListCompat.create(Locale(langCode))
                                    AppCompatDelegate.setApplicationLocales(appLocale)
                                }
                            },
                            onClose = { isMenuVisible = false },
                            onExitRequest = {
                                isMenuVisible = false
                                showExitDialog = true
                            },
                            currentRotation = rotation,
                            playerViewModel = playerViewModel // Am adăugat viewModel-ul
                        )
                    }

                    if (showExitDialog) {
                        ExitConfirmationDialog(
                            onConfirm = { finishAndRemoveTask() },
                            onDismiss = { showExitDialog = false },
                            rotationDegrees = rotation
                        )
                    }
                }
            }
        }
    }

    private fun getScreenResolutionString(): String {
        val windowManager = this.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val metrics = android.util.DisplayMetrics()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val display = this.display
            display?.getRealMetrics(metrics)
        } else {
            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getRealMetrics(metrics)
        }
        return "${metrics.widthPixels}x${metrics.heightPixels}"
    }

    override fun onResume() {
        super.onResume()
        appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                val updateOptions = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
                appUpdateManager.startUpdateFlowForResult(appUpdateInfo, updateResultLauncher, updateOptions)
            }
        }
    }

    private fun checkForUpdate() {
        val appUpdateInfoTask = appUpdateManager.appUpdateInfo
        appUpdateInfoTask.addOnSuccessListener { appUpdateInfo ->
            val isUpdateAvailable = appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
            val isImmediateUpdateAllowed = appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
            if (isUpdateAvailable && isImmediateUpdateAllowed) {
                val updateOptions = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build()
                appUpdateManager.startUpdateFlowForResult(appUpdateInfo, updateResultLauncher, updateOptions)
            }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        val isLongPress = event?.isLongPress == true
        val openMenu = when (keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_PROG_RED -> true
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_DPAD_CENTER -> isLongPress
            else -> false
        }
        if (openMenu) {
            val newMenuState = !isMenuVisible
            android.util.Log.d("MainActivity", "🎛️ Schimbare meniu: $isMenuVisible -> $newMenuState")
            isMenuVisible = newMenuState
            if (isMenuVisible) { showExitDialog = false }
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun startPeriodicSync() {
        val periodicRequest = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        workManager.enqueueUniquePeriodicWork("PeriodicPlaylistSync", ExistingPeriodicWorkPolicy.REPLACE, periodicRequest)
    }

    private fun isNetworkAvailable(context: Context): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val activeNetwork = connectivityManager.getNetworkCapabilities(network) ?: return false
        return when {
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> true
            activeNetwork.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> true
            else -> false
        }
    }
}