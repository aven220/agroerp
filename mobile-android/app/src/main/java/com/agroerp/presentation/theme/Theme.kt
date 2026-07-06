package com.agroerp.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// AGROERP design tokens — aligned with web frontend
private val AgroPrimary = Color(0xFF1B6B42)
private val AgroPrimaryDark = Color(0xFF155A37)
private val AgroSecondary = Color(0xFF0F4C5C)
private val AgroAccent = Color(0xFFC9A227)
private val AgroSurface = Color(0xFFF4F6F9)

private val LightColors = lightColorScheme(
    primary = AgroPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE8F5EC),
    secondary = AgroSecondary,
    tertiary = AgroAccent,
    background = AgroSurface,
    surface = Color.White,
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF66BB6A),
    onPrimary = Color.Black,
    primaryContainer = AgroPrimaryDark,
    secondary = Color(0xFF4DB6AC),
    tertiary = AgroAccent,
)

@Composable
fun AgroErpTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
