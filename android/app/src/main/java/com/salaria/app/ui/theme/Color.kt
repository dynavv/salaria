package com.salaria.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

data class SalariaPalette(
    val bg: Color,
    val bgElevated: Color,
    val card: Color,
    val cardSecondary: Color,
    val cardBorder: Color,
    val cardBorderSubtle: Color,
    val cardBorderHighlight: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textDisabled: Color,
    val textOnBrand: Color,
    val emeraldPrimary: Color,
    val emeraldLight: Color,
    val emeraldDark: Color,
    val emeraldGlow: Color,
    val violetAI: Color,
    val violetAILight: Color,
    val violetGlow: Color,
    val cyanAccent: Color,
    val cyanLight: Color,
    val blueAccent: Color,
    val amberWarning: Color,
    val purpleAccent: Color,
    val expenseRed: Color,
    val incomeGreen: Color,
    val heroGradientStart: Color,
    val heroGradientEnd: Color,
    val isDark: Boolean
)

// Obsidian & Slate (Dark Theme)
val DarkSalariaPalette = SalariaPalette(
    bg = Color(0xFF090D16),
    bgElevated = Color(0xFF0F1624),
    card = Color(0xFF131B2B),
    cardSecondary = Color(0xFF0E1522),
    cardBorder = Color(0xFF223049),
    cardBorderSubtle = Color(0xFF192437),
    cardBorderHighlight = Color(0x2EFFFFFF),
    textPrimary = Color(0xFFF8FAFC),
    textSecondary = Color(0xFF94A3B8),
    textMuted = Color(0xFF64748B),
    textDisabled = Color(0xFF475569),
    textOnBrand = Color(0xFF090D16),
    emeraldPrimary = Color(0xFF10B981),
    emeraldLight = Color(0xFF34D399),
    emeraldDark = Color(0xFF059669),
    emeraldGlow = Color(0x3310B981),
    violetAI = Color(0xFF8B5CF6),
    violetAILight = Color(0xFFA78BFA),
    violetGlow = Color(0x338B5CF6),
    cyanAccent = Color(0xFF06B6D4),
    cyanLight = Color(0xFF22D3EE),
    blueAccent = Color(0xFF3B82F6),
    amberWarning = Color(0xFFF59E0B),
    purpleAccent = Color(0xFF8B5CF6),
    expenseRed = Color(0xFFF43F5E),
    incomeGreen = Color(0xFF10B981),
    heroGradientStart = Color(0xFF182338),
    heroGradientEnd = Color(0xFF0F1726),
    isDark = true
)

// GitHub Light (Primer) Scheme
val GitHubLightPalette = SalariaPalette(
    bg = Color(0xFFF6F8FA),                 // GitHub canvas subtle (light gray page canvas)
    bgElevated = Color(0xFFFFFFFF),         // GitHub canvas default (pure white)
    card = Color(0xFFFFFFFF),               // Clean white card surface
    cardSecondary = Color(0xFFF6F8FA),      // GitHub inset/subtle background for inner boxes
    cardBorder = Color(0xFFD0D7DE),         // Iconic GitHub light border
    cardBorderSubtle = Color(0xFFE1E4E8),   // Hairline border
    cardBorderHighlight = Color(0xFFD0D7DE),
    textPrimary = Color(0xFF1F2328),        // GitHub fg.default (deep charcoal)
    textSecondary = Color(0xFF656D76),      // GitHub fg.muted
    textMuted = Color(0xFF8C959F),          // GitHub fg.subtle
    textDisabled = Color(0xFFADB5BD),
    textOnBrand = Color(0xFFFFFFFF),        // White text on GitHub green buttons
    emeraldPrimary = Color(0xFF1F883D),     // GitHub success green (iconic commit / PR green)
    emeraldLight = Color(0xFF2DA44E),       // GitHub button green
    emeraldDark = Color(0xFF116329),
    emeraldGlow = Color(0x261F883D),
    violetAI = Color(0xFF8250DF),           // GitHub Copilot / issue purple
    violetAILight = Color(0xFFA371F7),
    violetGlow = Color(0x268250DF),
    cyanAccent = Color(0xFF0969DA),         // GitHub accent blue (links & active states)
    cyanLight = Color(0xFF218BFF),
    blueAccent = Color(0xFF0969DA),
    amberWarning = Color(0xFF9A6700),       // GitHub warning amber
    purpleAccent = Color(0xFF8250DF),
    expenseRed = Color(0xFFCF222E),         // GitHub danger / issue red
    incomeGreen = Color(0xFF1F883D),        // GitHub success green
    heroGradientStart = Color(0xFFFFFFFF),  // GitHub light hero card
    heroGradientEnd = Color(0xFFF6F8FA),
    isDark = false
)

val LocalSalariaColors = staticCompositionLocalOf { DarkSalariaPalette }

// Dynamic theme properties mapped to the active palette
val BgDark: Color @Composable get() = LocalSalariaColors.current.bg
val BgDarkElevated: Color @Composable get() = LocalSalariaColors.current.bgElevated
val CardDark: Color @Composable get() = LocalSalariaColors.current.card
val CardDarkSecondary: Color @Composable get() = LocalSalariaColors.current.cardSecondary
val CardBorder: Color @Composable get() = LocalSalariaColors.current.cardBorder
val CardBorderSubtle: Color @Composable get() = LocalSalariaColors.current.cardBorderSubtle
val CardBorderHighlight: Color @Composable get() = LocalSalariaColors.current.cardBorderHighlight

val HeroCardGradient: Brush @Composable get() = Brush.verticalGradient(
    listOf(LocalSalariaColors.current.heroGradientStart, LocalSalariaColors.current.heroGradientEnd)
)
val EmeraldGradient: Brush @Composable get() = Brush.horizontalGradient(
    listOf(LocalSalariaColors.current.emeraldPrimary, LocalSalariaColors.current.emeraldLight)
)
val VioletGradient: Brush @Composable get() = Brush.horizontalGradient(
    listOf(LocalSalariaColors.current.violetAI, LocalSalariaColors.current.violetAILight)
)

val EmeraldPrimary: Color @Composable get() = LocalSalariaColors.current.emeraldPrimary
val EmeraldLight: Color @Composable get() = LocalSalariaColors.current.emeraldLight
val EmeraldDark: Color @Composable get() = LocalSalariaColors.current.emeraldDark
val EmeraldGlow: Color @Composable get() = LocalSalariaColors.current.emeraldGlow

val VioletAI: Color @Composable get() = LocalSalariaColors.current.violetAI
val VioletAILight: Color @Composable get() = LocalSalariaColors.current.violetAILight
val VioletGlow: Color @Composable get() = LocalSalariaColors.current.violetGlow

val CyanAccent: Color @Composable get() = LocalSalariaColors.current.cyanAccent
val CyanLight: Color @Composable get() = LocalSalariaColors.current.cyanLight
val BlueAccent: Color @Composable get() = LocalSalariaColors.current.blueAccent
val AmberWarning: Color @Composable get() = LocalSalariaColors.current.amberWarning
val PurpleAccent: Color @Composable get() = LocalSalariaColors.current.purpleAccent

val ExpenseRed: Color @Composable get() = LocalSalariaColors.current.expenseRed
val IncomeGreen: Color @Composable get() = LocalSalariaColors.current.incomeGreen

val TextPrimary: Color @Composable get() = LocalSalariaColors.current.textPrimary
val TextSecondary: Color @Composable get() = LocalSalariaColors.current.textSecondary
val TextMuted: Color @Composable get() = LocalSalariaColors.current.textMuted
val TextDisabled: Color @Composable get() = LocalSalariaColors.current.textDisabled
val TextOnBrand: Color @Composable get() = LocalSalariaColors.current.textOnBrand
