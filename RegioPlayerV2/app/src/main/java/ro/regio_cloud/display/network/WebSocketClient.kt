// Cale: app/src/main/java/com/example/regioplayerv2/network/WebSocketClient.kt

package ro.regio_cloud.display.network

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.*
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WebSocketClient(
    private val scope: CoroutineScope,
    private val onMessageReceived: (String) -> Unit
) {
    private var webSocket: WebSocket? = null
    private val client: OkHttpClient = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var currentScreenKey: String? = null
    private var isStarted = false

    // --- MODIFICARE AICI: Am adăugat parametri noi la funcția start ---
    fun start(screenKey: String, playerVersion: String, screenResolution: String) {
        if (isStarted && currentScreenKey == screenKey && webSocket != null) {
            return
        }
        this.currentScreenKey = screenKey
        this.isStarted = true
        connect(playerVersion, screenResolution)
    }

    private fun connect(playerVersion: String, screenResolution: String) {
        if (!isStarted || currentScreenKey == null) {
            return
        }

        val request = Request.Builder()
            .url("wss://display.regio-cloud.ro/api/ws/connect/$currentScreenKey")
            .build()

        Log.d("WebSocketClient", "Se încearcă conectarea la WebSocket: ${request.url}")
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i("WebSocketClient", "Conexiune WebSocket stabilită cu succes!")
                // --- MODIFICARE AICI: Trimitem informațiile la conectare ---
                try {
                    val deviceInfo = JSONObject().apply {
                        put("type", "device_info")
                        put("version", playerVersion)
                        put("resolution", screenResolution)
                    }
                    webSocket.send(deviceInfo.toString())
                    Log.i("WebSocketClient", "S-au trimis datele dispozitivului: $deviceInfo")
                } catch (e: Exception) {
                    Log.e("WebSocketClient", "Eroare la trimiterea datelor dispozitivului", e)
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.i("WebSocketClient", "Mesaj primit de la server: $text")
                // Ignorăm mesajele de tip 'ping' primite de la server
                if (text.contains("ping")) return

                onMessageReceived(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                super.onClosed(webSocket, code, reason)
                Log.w("WebSocketClient", "Conexiune închisă: $code. Se încearcă reconectarea.")
                reconnect(playerVersion, screenResolution)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e("WebSocketClient", "Eroare de conexiune WebSocket: ${t.message}", t)
                reconnect(playerVersion, screenResolution)
            }
        })
    }

    private fun reconnect(playerVersion: String, screenResolution: String) {
        if (!isStarted) return
        scope.launch {
            Log.d("WebSocketClient", "Reconectare în 15 secunde...")
            delay(15000)
            connect(playerVersion, screenResolution)
        }
    }

    fun stop() {
        isStarted = false
        webSocket?.close(1000, "Client-ul a fost oprit manual.")
        Log.d("WebSocketClient", "Client WebSocket oprit.")
    }
}