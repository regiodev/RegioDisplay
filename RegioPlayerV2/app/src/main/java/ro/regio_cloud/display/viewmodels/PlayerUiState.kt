package ro.regio_cloud.display.viewmodels

import java.io.File

sealed interface PlayerUiState {
    object Loading : PlayerUiState
    data class NeedsActivation(val pairingCode: String) : PlayerUiState
    // --- MODIFICARE AICI: Am schimbat câmpurile pentru a fi numerice ---
    data class Downloading(
        val progress: Int,
        val filesDownloaded: Int,
        val totalFiles: Int
    ) : PlayerUiState
    data class Success(val playlist: List<LocalMediaItem>) : PlayerUiState
    data class Error(val message: String) : PlayerUiState
}

data class LocalMediaItem(
    val file: File,
    val type: String,
    val duration: Int,
    val url: String
)