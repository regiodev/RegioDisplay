@file:OptIn(ExperimentalTvMaterial3Api::class) // <-- AICI A FOST CORECȚIA

package ro.regio_cloud.display.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
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

@Composable
fun DownloadingScreen(
    progress: Int,
    filesDownloaded: Int,
    totalFiles: Int,
    rotationDegrees: Int = 0
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .rotate(rotationDegrees.toFloat())
            .padding(vertical = 32.dp, horizontal = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.regiodisplay_logo_main),
            contentDescription = stringResource(R.string.logo_content_description),
            modifier = Modifier.fillMaxWidth(0.5f)
        )

        Spacer(modifier = Modifier.height(48.dp))

        CircularProgressIndicator(
            progress = { progress / 100f },
            modifier = Modifier.size(80.dp),
            color = Color.White,
            strokeWidth = 6.dp
        )

        Spacer(modifier = Modifier.height(32.dp))

        Text(
            text = stringResource(R.string.downloading_title),
            fontSize = 24.sp,
            color = Color.White,
            fontWeight = FontWeight.Medium
        )

        Spacer(modifier = Modifier.height(12.dp))

        val progressText = if (totalFiles > 0) {
            stringResource(R.string.downloading_progress, filesDownloaded, totalFiles)
        } else {
            ""
        }

        Text(
            text = progressText,
            fontSize = 18.sp,
            color = Color.Gray,
            textAlign = TextAlign.Center
        )
    }
}