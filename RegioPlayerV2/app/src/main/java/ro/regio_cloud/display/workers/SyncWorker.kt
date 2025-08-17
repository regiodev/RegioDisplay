// Cale fișier: app/src/main/java/ro/regio_cloud/display/workers/SyncWorker.kt

package ro.regio_cloud.display.workers

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.google.gson.Gson
import kotlinx.coroutines.flow.first
import ro.regio_cloud.display.data.PlaylistRepository
import ro.regio_cloud.display.data.UserPreferencesRepository
import ro.regio_cloud.display.network.RetrofitClient

class SyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val TAG = "SyncWorker"

    override suspend fun doWork(): Result {
        Log.d(TAG, "SyncWorker a pornit.")

        val userPrefsRepo = UserPreferencesRepository(applicationContext)
        val screenKey = userPrefsRepo.uniqueKeyFlow.first()
        if (screenKey.isNullOrBlank()) {
            Log.d(TAG, "Aplicația nu este încă împerecheată. SyncWorker se oprește.")
            return Result.success()
        }

        val playlistRepository = PlaylistRepository(
            userPrefsRepo = userPrefsRepo,
            apiService = RetrofitClient.apiService,
            filesDir = applicationContext.filesDir,
            gson = Gson()
        )

        try {
            Log.d(TAG, "Se încearcă trimiterea log-urilor stocate...")

            // --- AICI ESTE CORECȚIA ---
            // Numele corect al funcției este 'submitPlaybackLogs'
            val logResult = playlistRepository.submitPlaybackLogs()

            if (logResult.isSuccess) {
                Log.d(TAG, "Verificarea/trimiterea log-urilor a fost finalizată cu succes.")
            } else {
                Log.w(TAG, "Trimiterea log-urilor a eșuat, se va reîncerca la următoarea rulare: ${logResult.exceptionOrNull()?.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "A apărut o eroare neașteptată la trimiterea log-urilor.", e)
        }

        Log.d(TAG, "Se pornește sincronizarea playlist-ului...")
        val syncResult = playlistRepository.syncRemotePlaylistAndCacheMedia()

        return if (syncResult.isSuccess) {
            Log.d(TAG, "Sincronizare finalizată cu succes.")
            Result.success()
        } else {
            val error = syncResult.exceptionOrNull()
            Log.e(TAG, "Sincronizarea a eșuat: ${error?.message}")
            Result.retry()
        }
    }
}