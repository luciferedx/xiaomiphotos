package com.dispicapaul.photos.ui.theme

import android.app.Activity
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

enum class PhotosThemeMode {
    LIGHT,
    TRUE_AMOLED_BLACK,
    LIQUID_GLASS
}

@Immutable
data class PhotosPalette(
    val mode: PhotosThemeMode,
    val background: Color,
    val cardSurface: Color,
    val elevatedSheet: Color,
    val floatingBarTint: Color,
    val hairlineBorder: Color,
    val primaryText: Color,
    val secondaryText: Color,
    val accent: Color,
    val pillActiveContainer: Color,
    val pillActiveContent: Color,
    val isLightStatusBar: Boolean
)

val LocalPhotosPalette = staticCompositionLocalOf {
    PhotosPalette(
        mode = PhotosThemeMode.TRUE_AMOLED_BLACK,
        background = Color(0xFF000000),
        cardSurface = Color(0xFF121214),
        elevatedSheet = Color(0xFF121214),
        floatingBarTint = Color(0xD90E0E10),
        hairlineBorder = Color(0x1FFFFFFF),
        primaryText = Color(0xFFFFFFFF),
        secondaryText = Color(0xFF8E8E93),
        accent = Color(0xFF0A84FF),
        pillActiveContainer = Color(0xFFFFFFFF),
        pillActiveContent = Color(0xFF000000),
        isLightStatusBar = false
    )
}

@Composable
fun PhotosTheme(
    mode: PhotosThemeMode,
    content: @Composable () -> Unit
) {
    val target = when (mode) {
        PhotosThemeMode.LIGHT -> PhotosPalette(
            mode = mode,
            background = Color(0xFFFFFFFF),
            cardSurface = Color(0xFFF2F2F7),
            elevatedSheet = Color(0xFFFFFFFF),
            floatingBarTint = Color(0xD1FFFFFF),
            hairlineBorder = Color(0x161C1C1E),
            primaryText = Color(0xFF1C1C1E),
            secondaryText = Color(0xFF636366),
            accent = Color(0xFF007AFF),
            pillActiveContainer = Color(0xFF1C1C1E),
            pillActiveContent = Color(0xFFFFFFFF),
            isLightStatusBar = true
        )

        PhotosThemeMode.TRUE_AMOLED_BLACK -> PhotosPalette(
            mode = mode,
            background = Color(0xFF000000),
            cardSurface = Color(0xFF121214),
            elevatedSheet = Color(0xFF121214),
            floatingBarTint = Color(0xDB0C0C0E),
            hairlineBorder = Color(0x1CFFFFFF),
            primaryText = Color(0xFFFFFFFF),
            secondaryText = Color(0xFF8E8E93),
            accent = Color(0xFF0A84FF),
            pillActiveContainer = Color(0xFFFFFFFF),
            pillActiveContent = Color(0xFF000000),
            isLightStatusBar = false
        )

        PhotosThemeMode.LIQUID_GLASS -> PhotosPalette(
            mode = mode,
            background = Color(0xFF07080C),
            cardSurface = Color(0x52181B24),
            elevatedSheet = Color(0x78141720),
            floatingBarTint = Color(0x59161922),
            hairlineBorder = Color(0x45FFFFFF),
            primaryText = Color(0xFFFFFFFF),
            secondaryText = Color(0xD1F2F4F8),
            accent = Color(0xFF3898FF),
            pillActiveContainer = Color(0xF0FFFFFF),
            pillActiveContent = Color(0xFF0B0C10),
            isLightStatusBar = false
        )
    }

    val animSpec = tween<Color>(durationMillis = 180)
    val palette = target.copy(
        background = animateColorAsState(target.background, animSpec, label = "bg").value,
        cardSurface = animateColorAsState(target.cardSurface, animSpec, label = "card").value,
        primaryText = animateColorAsState(target.primaryText, animSpec, label = "fg").value,
        secondaryText = animateColorAsState(target.secondaryText, animSpec, label = "sec").value
    )

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            val insetsController = WindowCompat.getInsetsController(window, view)
            insetsController.isAppearanceLightStatusBars = palette.isLightStatusBar
            insetsController.isAppearanceLightNavigationBars = palette.isLightStatusBar
        }
    }

    val colorScheme = if (mode == PhotosThemeMode.LIGHT) {
        lightColorScheme(
            background = palette.background,
            surface = palette.cardSurface,
            primary = palette.accent,
            onBackground = palette.primaryText,
            onSurface = palette.primaryText
        )
    } else {
        darkColorScheme(
            background = palette.background,
            surface = palette.cardSurface,
            primary = palette.accent,
            onBackground = palette.primaryText,
            onSurface = palette.primaryText
        )
    }

    CompositionLocalProvider(LocalPhotosPalette provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            content = content
        )
    }
}
