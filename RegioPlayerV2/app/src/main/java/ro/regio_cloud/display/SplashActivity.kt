package ro.regio_cloud.display

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Lansăm imediat activitatea principală
        startActivity(Intent(this, MainActivity::class.java))

        // Închidem această activitate de splash pentru a nu rămâne în istoric
        finish()
    }
}