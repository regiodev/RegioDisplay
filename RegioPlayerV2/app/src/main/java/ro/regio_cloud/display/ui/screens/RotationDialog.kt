@file:OptIn(ExperimentalTvMaterial3Api::class)

package ro.regio_cloud.display.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Tv
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import ro.regio_cloud.display.R

@Composable
fun RotationDialog(
    currentRotation: Int,
    onRotationSelected: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .width(600.dp)
                .background(Color(0xFF2E2E2E), shape = RoundedCornerShape(12.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = stringResource(id = R.string.rotation_dialog_title),
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(24.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                RotationOption(
                    label = stringResource(id = R.string.rotation_0),
                    rotationValue = 0,
                    currentRotation = currentRotation,
                    onSelected = { onRotationSelected(0) }
                )
                RotationOption(
                    label = stringResource(id = R.string.rotation_90),
                    rotationValue = 90,
                    currentRotation = currentRotation,
                    onSelected = { onRotationSelected(90) }
                )
                RotationOption(
                    label = stringResource(id = R.string.rotation_180),
                    rotationValue = 180,
                    currentRotation = currentRotation,
                    onSelected = { onRotationSelected(180) }
                )
                RotationOption(
                    label = stringResource(id = R.string.rotation_270),
                    rotationValue = 270,
                    currentRotation = currentRotation,
                    onSelected = { onRotationSelected(270) }
                )
            }
        }
    }
}

@Composable
private fun RowScope.RotationOption(
    label: String,
    rotationValue: Int,
    currentRotation: Int,
    onSelected: () -> Unit
) {
    val isSelected = rotationValue == currentRotation
    var isFocused by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }

    val borderColor = when {
        isFocused -> Color.White
        isSelected -> Color(0xFF007AFF)
        else -> Color.Transparent
    }

    LaunchedEffect(isSelected) {
        if (isSelected) {
            focusRequester.requestFocus()
        }
    }

    Column(
        modifier = Modifier
            .weight(1f)
            .focusRequester(focusRequester)
            .onFocusChanged { isFocused = it.isFocused }
            .clip(RoundedCornerShape(8.dp))
            .border(2.dp, borderColor, RoundedCornerShape(8.dp))
            .background(Color.DarkGray.copy(alpha = 0.5f))
            .clickable(onClick = onSelected)
            .padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Tv,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(48.dp).rotate(rotationValue.toFloat())
        )
        Text(text = label, color = Color.White, fontSize = 14.sp)
    }
}