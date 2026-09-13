package com.salaria.app.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private fun createDarkColorScheme(palette: SalariaPalette) = darkColorScheme(
    primary = palette.emeraldPrimary,
    onPrimary = palette.textOnBrand,
    primaryContainer = palette.card,
    onPrimaryContainer = palette.emeraldLight,
    secondary = palette.cyanAccent,
    onSecondary = palette.textOnBrand,
    secondaryContainer = palette.card,
    onSecondaryContainer = palette.cyanLight,
    background = palette.bg,
    onBackground = palette.textPrimary,
    surface = palette.card,
    onSurface = palette.textPrimary,
    surfaceVariant = palette.cardBorder,
    onSurfaceVariant = palette.textSecondary,
    error = palette.expenseRed,
    onError = Color.White
)

private fun createLightColorScheme(palette: SalariaPalette) = lightColorScheme(
    primary = palette.emeraldPrimary,
    onPrimary = Color.White,
    primaryContainer = palette.card,
    onPrimaryContainer = palette.emeraldDark,
    secondary = palette.cyanAccent,
    onSecondary = Color.White,
    secondaryContainer = palette.cardSecondary,
    onSecondaryContainer = palette.cyanAccent,
    background = palette.bg,
    onBackground = palette.textPrimary,
    surface = palette.card,
    onSurface = palette.textPrimary,
    surfaceVariant = palette.cardBorder,
    onSurfaceVariant = palette.textSecondary,
    error = palette.expenseRed,
    onError = Color.White
)

@Composable
fun SalariaTheme(
    isDark: Boolean = true,
    content: @Composable () -> Unit
) {
    val palette = if (isDark) DarkSalariaPalette else GitHubLightPalette
    val colorScheme = if (isDark) createDarkColorScheme(palette) else createLightColorScheme(palette)

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = palette.bg.toArgb()
                window.navigationBarColor = palette.bg.toArgb()
                val insetsController = WindowCompat.getInsetsController(window, view)
                insetsController.isAppearanceLightStatusBars = !isDark
                insetsController.isAppearanceLightNavigationBars = !isDark
            }
        }
    }

    CompositionLocalProvider(LocalSalariaColors provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content
        )
    }
}
