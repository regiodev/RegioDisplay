// Cale fișier: app/src/main/java/com/example/regioplayerv2/network/RetrofitClient.kt

package ro.regio_cloud.display.network

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private const val BASE_URL = "https://display.regio-cloud.ro/api/"

    // --- AICI ESTE MODIFICAREA ---
    // Am eliminat interceptorul de logging care consuma memorie
    // și am setat timeout-uri mai mari pentru a gestiona fișiere mari sau rețele lente.
    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.MINUTES)  // Permitem până la 5 minute pentru descărcarea unui fișier mare
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    // --- SFÂRȘIT MODIFICARE ---

    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .client(okHttpClient) // Folosim clientul optimizat
            .build()
    }

    val apiService: ApiService by lazy {
        retrofit.create(ApiService::class.java)
    }
}