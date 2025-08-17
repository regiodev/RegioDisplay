// Cale fișier: app/src/main/java/ro/regio_cloud/display/network/ApiService.kt

package ro.regio_cloud.display.network

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Streaming
import retrofit2.http.Url

interface ApiService {
    /**
     * Endpoint pentru a înregistra un client nou în sistem.
     */
    @POST("client/register")
    suspend fun registerClient(@Body payload: ScreenRegister): Response<Unit>

    /**
     * Endpoint pentru a sincroniza playlist-ul.
     */
    @GET("client/sync")
    suspend fun syncPlaylist(
        @Header("X-Screen-Key") screenKey: String,
        @Header("X-Playlist-Version") playlistVersion: String?
    ): Response<ClientPlaylistResponse>

    /**
     * Endpoint generic pentru a descărca un fișier de la un URL complet.
     */
    @Streaming
    @GET
    suspend fun downloadFile(@Url fileUrl: String): Response<ResponseBody>

    /**
     * Endpoint pentru a trimite un lot de log-uri de redare către server.
     */
    @POST("reports/player-logs/")
    suspend fun submitLogs(
        @Header("X-Screen-Key") screenKey: String,
        @Body logs: List<PlaybackLog>
    ): Response<Unit>

    /**
     * --- FUNCȚIE NOUĂ ADĂUGATĂ ---
     * Endpoint pentru a raporta o modificare a rotației de la player către server.
     */
    @POST("client/report_rotation")
    suspend fun reportRotation(
        @Header("X-Screen-Key") screenKey: String,
        @Body payload: ClientRotationUpdate
    ): Response<Unit>
}