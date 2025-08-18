package ro.regio_cloud.display.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DialogButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    var isFocused by remember { mutableStateOf(false) }
    val buttonShape = RoundedCornerShape(8.dp)

    // Stil mai evident pentru selecție: background alb solid și text negru
    val containerColor = if (isFocused) Color.White else Color(0xFF3D3D3D)
    val contentColor = if (isFocused) Color.Black else Color.White
    val fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Medium

    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth()
            .onFocusChanged { focusState -> isFocused = focusState.isFocused },
        shape = ButtonDefaults.shape(shape = buttonShape),
        colors = ButtonDefaults.colors(
            containerColor = containerColor,
            contentColor = contentColor
        )
    ) {
        Text(
            text = text, 
            fontSize = 15.sp, 
            fontWeight = fontWeight
        )
    }
}