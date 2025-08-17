@file:OptIn(ExperimentalTvMaterial3Api::class)

package ro.regio_cloud.display.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.tv.material3.*
import kotlinx.coroutines.delay
import ro.regio_cloud.display.BuildConfig
import ro.regio_cloud.display.R
import ro.regio_cloud.display.ui.components.DialogButton
import ro.regio_cloud.display.viewmodels.PlayerUiState
import androidx.compose.foundation.layout.fillMaxHeight

@Composable
fun SettingsMenu(
    uiState: PlayerUiState,
    pairingCode: String?,
    screenName: String?,
    playlistName: String?,
    isInternetConnected: Boolean,
    currentLanguageCode: String,
    onLanguageSelected: (String) -> Unit,
    onClose: () -> Unit,
    onExitRequest: () -> Unit,
    currentRotation: Int,
    onRotationSelected: (Int) -> Unit
) {
    val menuFocusRequester = remember { FocusRequester() }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showRotationDialog by remember { mutableStateOf(false) }

    val languageDisplayValue = when (currentLanguageCode) {
        "ro" -> stringResource(R.string.settings_language_ro)
        "en" -> stringResource(R.string.settings_language_en)
        else -> currentLanguageCode
    }

    val rotationDisplayValue = when (currentRotation) {
        90 -> stringResource(id = R.string.rotation_90)
        180 -> stringResource(id = R.string.rotation_180)
        270 -> stringResource(id = R.string.rotation_270)
        else -> stringResource(id = R.string.rotation_0)
    }

    val finalScreenName = when {
        screenName?.contains("Ecran neactivat", ignoreCase = true) == true -> stringResource(R.string.status_screen_not_activated)
        screenName.isNullOrBlank() -> "-"
        else -> screenName
    }

    val finalPlaylistName = when {
        playlistName?.contains("Ecran neactivat", ignoreCase = true) == true -> stringResource(R.string.status_screen_not_activated)
        playlistName?.contains("Niciun playlist", ignoreCase = true) == true -> stringResource(R.string.status_no_playlist_assigned)
        playlistName.isNullOrBlank() -> "-"
        else -> playlistName
    }

    // --- MODIFICARE 2: Adăugăm o mică întârziere înainte de a seta focusul ---
    LaunchedEffect(Unit) {
        delay(200) // Așteaptă 200 milisecunde
        menuFocusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.8f))
            .clickable(onClick = onClose),
        contentAlignment = Alignment.CenterStart
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(550.dp)
                .background(Color(0xFF1F1F1F))
                .clickable(enabled = false, onClick = {})
                // --- MODIFICARE 1: Aplicăm rotația pe întregul meniu ---
                .rotate(currentRotation.toFloat())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = "Setări", color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Bold)

                IconButton(
                    onClick = onClose,
                    colors = IconButtonDefaults.colors(
                        containerColor = Color.Transparent,
                        contentColor = Color.White,
                        focusedContainerColor = MaterialTheme.colorScheme.primary,
                        focusedContentColor = Color.White
                    )
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Închide", tint = Color.White)
                }
            }

            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF2D2D2D))
                    .padding(vertical = 4.dp)
            ) {
                ActionMenuItem(
                    text = stringResource(R.string.settings_language),
                    value = languageDisplayValue,
                    icon = Icons.Filled.Language,
                    modifier = Modifier.focusRequester(menuFocusRequester),
                    onClick = { showLanguageDialog = true }
                )
                ActionMenuItem(
                    text = stringResource(R.string.settings_orientation),
                    value = rotationDisplayValue,
                    icon = Icons.Filled.ScreenRotation,
                    onClick = { showRotationDialog = true }
                )
                ToggleMenuItem(
                    text = stringResource(R.string.settings_auto_relaunch),
                    icon = Icons.Filled.RestartAlt,
                    checked = false,
                    onCheckedChange = { /* TODO */ }
                )
                ToggleMenuItem(
                    text = stringResource(R.string.settings_auto_start),
                    icon = Icons.Filled.PowerSettingsNew,
                    checked = true,
                    onCheckedChange = { /* TODO */ }
                )
                ActionMenuItem(
                    text = stringResource(R.string.settings_exit),
                    icon = Icons.Filled.ExitToApp,
                    onClick = onExitRequest
                )
            }

            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF2D2D2D))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val statusText = if (uiState is PlayerUiState.Success) stringResource(R.string.settings_status_activated) else stringResource(R.string.settings_status_not_activated)
                val statusColor = if (uiState is PlayerUiState.Success) Color(0xFF34C759) else Color(0xFFFF3B30)
                InfoRow(label = stringResource(R.string.settings_status), value = statusText, valueColor = statusColor)
                InfoRow(label = stringResource(R.string.settings_screen_label), value = finalScreenName)
                InfoRow(label = stringResource(R.string.settings_playlist_label), value = finalPlaylistName)
                val internetText = if (isInternetConnected) stringResource(R.string.settings_internet_connected) else stringResource(R.string.settings_internet_disconnected)
                val internetColor = if (isInternetConnected) Color(0xFF34C759) else Color(0xFFFF3B30)
                InfoRow(label = stringResource(R.string.settings_internet_label), value = internetText, valueColor = internetColor)
                InfoRow(label = stringResource(R.string.settings_activation_code), value = pairingCode ?: "-")
            }

            Spacer(modifier = Modifier.weight(1f))

            Text(
                text = "${stringResource(R.string.settings_player_version)} ${BuildConfig.VERSION_NAME}",
                modifier = Modifier.align(Alignment.CenterHorizontally),
                color = Color.Gray,
                fontSize = 14.sp
            )
        }
    }

    if (showLanguageDialog) {
        LanguageSelectionDialog(
            onLanguageSelected = { langCode ->
                onLanguageSelected(langCode)
                showLanguageDialog = false
            },
            onDismiss = { showLanguageDialog = false }
        )
    }

    if (showRotationDialog) {
        RotationDialog(
            currentRotation = currentRotation,
            onRotationSelected = { newRotation ->
                onRotationSelected(newRotation)
                showRotationDialog = false
            },
            onDismiss = { showRotationDialog = false }
        )
    }
}

@Composable
private fun LanguageSelectionDialog(
    onLanguageSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val focusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .width(400.dp)
                .background(Color(0xFF2D2D2D), shape = RoundedCornerShape(12.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = stringResource(R.string.settings_language_dialog_title),
                fontSize = 18.sp,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            DialogButton(
                text = stringResource(R.string.settings_language_ro),
                onClick = { onLanguageSelected("ro") },
                modifier = Modifier.focusRequester(focusRequester)
            )
            DialogButton(
                text = stringResource(R.string.settings_language_en),
                onClick = { onLanguageSelected("en") }
            )
        }
    }
}

@Composable
private fun ActionMenuItem(
    text: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    value: String? = null,
    onClick: () -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val backgroundColor = if (isFocused) Color.White.copy(alpha = 0.9f) else Color.Transparent
    val contentColor = if (isFocused) Color.Black else Color.White

    Row(
        modifier = modifier
            .fillMaxWidth()
            .onFocusChanged { focusState -> isFocused = focusState.isFocused }
            .background(backgroundColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = text, tint = contentColor)
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = text, color = contentColor, fontSize = 16.sp)
        Spacer(modifier = Modifier.weight(1f))
        if (value != null) {
            Text(text = value, color = if (isFocused) Color.DarkGray else Color.LightGray, fontSize = 16.sp)
        }
    }
}

@Composable
private fun ToggleMenuItem(
    text: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    var isFocused by remember { mutableStateOf(false) }
    val backgroundColor = if (isFocused) Color.White.copy(alpha = 0.9f) else Color.Transparent
    val contentColor = if (isFocused) Color.Black else Color.White

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .onFocusChanged { focusState -> isFocused = focusState.isFocused }
            .background(backgroundColor)
            .clickable { onCheckedChange(!checked) }
            .padding(horizontal = 16.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = text, tint = contentColor)
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = text, color = contentColor, fontSize = 16.sp)
        Spacer(modifier = Modifier.weight(1f))
        Switch(
            checked = checked,
            onCheckedChange = null,
            modifier = Modifier.scale(0.8f)
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String, valueColor: Color = Color.White) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, color = Color.LightGray, fontSize = 16.sp)
        Text(text = value, color = valueColor, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    }
}