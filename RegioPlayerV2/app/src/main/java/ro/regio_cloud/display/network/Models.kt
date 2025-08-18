// Cale fișier: app/src/main/java/ro/regio_cloud/display/network/Models.kt

package ro.regio_cloud.display.network

import com.google.gson.annotations.SerializedName

data class ClientPlaylistResponse(
    @SerializedName("id") val id: Int,
    @SerializedName("name") val name: String,
    @SerializedName("items") val items: List<ClientPlaylistItem>,
    @SerializedName("playlist_version") val playlistVersion: String?,
    @SerializedName("screen_name") val screenName: String?,
    // --- MODIFICARE 1: Am adăugat câmpurile pentru rotație ---
    @SerializedName("rotation") val rotation: Int?,
    @SerializedName("rotation_updated_at") val rotationUpdatedAt: String?
)

data class ClientPlaylistItem(
    @SerializedName("url") val url: String,
    @SerializedName("type") val type: String,
    @SerializedName("duration") val duration: Int
)

data class ScreenRegister(
    @SerializedName("unique_key") val uniqueKey: String,
    @SerializedName("pairing_code") val pairingCode: String
)

data class PlaybackLog(
    @SerializedName("media_id") val mediaId: Int,
    @SerializedName("playlist_id") val playlistId: Int,
    @SerializedName("event_type") val eventType: String,
    @SerializedName("timestamp") val timestamp: String
)

