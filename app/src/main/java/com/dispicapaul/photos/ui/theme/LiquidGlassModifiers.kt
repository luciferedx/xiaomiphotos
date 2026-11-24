package com.dispicapaul.photos.ui.theme

import android.graphics.RuntimeShader
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.HazeTint
import dev.chrisbanes.haze.hazeEffect

private const val LIQUID_GLASS_SPECULAR_AGSL = """
    uniform float2 resolution;
    half4 main(float2 fragCoord) {
        float2 uv = fragCoord / max(resolution, float2(1.0));
        float topLeft = smoothstep(0.65, 0.0, length(uv * float2(1.0, 1.35)));
        float bottomRight = smoothstep(0.55, 0.0, length((1.0 - uv) * float2(1.1, 1.4)));
        float edgeGlow = clamp(topLeft * 0.22 + bottomRight * 0.10, 0.0, 0.28);
        return half4(1.0, 1.0, 1.0, edgeGlow);
    }
"""

/**
 * Applies GPU-accelerated backdrop blur (Haze / RenderEffect) paired with
 * a 0.75dp luminous refraction gradient border and Android 13+ AGSL specular highlight.
 */
@Composable
fun Modifier.liquidGlassSurface(
    hazeState: HazeState,
    shape: Shape,
    blurRadius: Dp = 28.dp,
    tintAlpha: Float = 0.34f
): Modifier {
    val palette = LocalPhotosPalette.current
    val baseModifier = this.clip(shape)

    return when (palette.mode) {
        PhotosThemeMode.LIQUID_GLASS -> {
            val specularBorder = remember {
                Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.52f),
                        Color.White.copy(alpha = 0.10f),
                        Color.White.copy(alpha = 0.28f)
                    )
                )
            }
            val hazeStyle = remember(blurRadius, tintAlpha) {
                HazeStyle(
                    backgroundColor = Color(0xFF141822),
                    tint = HazeTint(Color(0xFF161A26).copy(alpha = tintAlpha)),
                    blurRadius = blurRadius,
                    noiseFactor = 0.03f
                )
            }

            baseModifier
                .hazeEffect(state = hazeState, style = hazeStyle)
                .then(
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        Modifier.drawWithCache {
                            val shader = RuntimeShader(LIQUID_GLASS_SPECULAR_AGSL).apply {
                                setFloatUniform("resolution", size.width, size.height)
                            }
                            val brush = ShaderBrush(shader)
                            onDrawWithContent {
                                drawContent()
                                drawRect(brush = brush)
                            }
                        }
                    } else {
                        Modifier
                    }
                )
                .border(width = 0.75.dp, brush = specularBorder, shape = shape)
        }

        PhotosThemeMode.LIGHT -> {
            val lightHaze = remember {
                HazeStyle(
                    backgroundColor = Color.White,
                    tint = HazeTint(Color.White.copy(alpha = 0.78f)),
                    blurRadius = 20.dp
                )
            }
            baseModifier
                .hazeEffect(state = hazeState, style = lightHaze)
                .border(width = 0.75.dp, color = palette.hairlineBorder, shape = shape)
        }

        PhotosThemeMode.TRUE_AMOLED_BLACK -> {
            baseModifier
                .background(palette.floatingBarTint)
                .border(width = 0.75.dp, color = palette.hairlineBorder, shape = shape)
        }
    }
}
