@file:OptIn(ExperimentalTvMaterial3Api::class)

package ro.regio_cloud.display.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import ro.regio_cloud.display.R
import androidx.compose.ui.draw.rotate

@Composable
fun PairingScreen(pairingCode: String, rotationDegrees: Int) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .rotate(rotationDegrees.toFloat()) // --- MODIFICARE: Am adăugat rotația pe containerul principal ---
            .padding(vertical = 32.dp, horizontal = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier.weight(1f),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.regiodisplay_logo_main),
                contentDescription = stringResource(R.string.logo_content_description),
                modifier = Modifier.fillMaxWidth(0.8f)
            )
        }

        Column(
            modifier = Modifier.weight(1.5f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = stringResource(R.string.pairing_title), fontSize = 28.sp, color = Color.White)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.pairing_subtitle),
                fontSize = 20.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(32.dp))
            Text(
                text = pairingCode,
                fontSize = 80.sp,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                letterSpacing = 10.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .background(Color.DarkGray.copy(alpha = 0.5f))
                    .padding(horizontal = 24.dp, vertical = 12.dp)
            )
        }

        Column(
            modifier = Modifier.weight(1f),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Bottom
        ) {
            Text(
                text = stringResource(R.string.pairing_footer_auto_activate),
                fontSize = 18.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.pairing_footer_url_intro),
                fontSize = 18.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center
            )
            Text(
                text = "https://display.regio-cloud.ro",
                fontSize = 18.sp,
                color = Color(0xFF007AFF),
                textAlign = TextAlign.Center
            )
        }
    }
}