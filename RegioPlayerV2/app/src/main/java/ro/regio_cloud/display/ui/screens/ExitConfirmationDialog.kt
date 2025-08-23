@file:OptIn(ExperimentalTvMaterial3Api::class)

package ro.regio_cloud.display.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import kotlinx.coroutines.delay
import ro.regio_cloud.display.R
import ro.regio_cloud.display.ui.components.DialogButton // <-- MODIFICARE: Importăm noul buton

@Composable
fun ExitConfirmationDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    rotationDegrees: Int = 0
) {
    var countdown by remember { mutableStateOf(10) }
    val noButtonFocusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        while (countdown > 0) {
            delay(1000)
            countdown--
        }
        onDismiss()
    }

    LaunchedEffect(Unit) {
        noButtonFocusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.8f)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .width(550.dp)
                .background(Color(0xFF2E2E2E), shape = RoundedCornerShape(12.dp))
                .rotate(rotationDegrees.toFloat())
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(R.string.exit_dialog_title),
                color = Color.White,
                fontSize = 20.sp
            )
            Spacer(modifier = Modifier.height(24.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // --- MODIFICARE: Folosim noua componentă DialogButton ---
                DialogButton(
                    text = stringResource(R.string.dialog_yes),
                    onClick = onConfirm,
                    modifier = Modifier.weight(1f)
                )
                DialogButton(
                    text = stringResource(id = R.string.dialog_no, countdown),
                    onClick = onDismiss,
                    modifier = Modifier
                        .focusRequester(noButtonFocusRequester)
                        .weight(1f)
                )
            }
        }
    }
}

// --- MODIFICARE: Definiția locală a butonului a fost ștearsă ---