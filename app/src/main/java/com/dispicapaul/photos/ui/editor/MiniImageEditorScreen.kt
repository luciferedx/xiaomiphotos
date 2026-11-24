package com.dispicapaul.photos.ui.editor

import android.graphics.Bitmap
import android.graphics.RectF
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Flip
import androidx.compose.material.icons.rounded.Rotate90DegreesCcw
import androidx.compose.material.icons.rounded.Rotate90DegreesCw
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dispicapaul.photos.data.TransformSpec
import kotlin.math.abs
import kotlin.math.roundToInt

enum class CropAspect(val label: String, val ratio: Float?) {
    FREEFORM("Freeform", null),
    ORIGINAL("Original", 4f / 3f),
    SQUARE("1:1", 1f),
    FOUR_THREE("4:3", 4f / 3f),
    SIXTEEN_NINE("16:9", 16f / 9f),
    NINE_SIXTEEN("9:16", 9f / 16f)
}

@Composable
fun MiniImageEditorScreen(
    previewBitmap: Bitmap,
    isSaving: Boolean,
    onCancel: () -> Unit,
    onSaveCopy: (TransformSpec) -> Unit,
    onOverwriteOriginal: (TransformSpec) -> Unit
) {
    val haptic = LocalHapticFeedback.current
    var spec by remember { mutableStateOf(TransformSpec()) }
    var selectedAspect by remember { mutableStateOf(CropAspect.FREEFORM) }
    var isDraggingCrop by remember { mutableStateOf(false) }

    val animScaleX by animateFloatAsState(
        targetValue = if (spec.flipHorizontal) -1f else 1f,
        animationSpec = spring(),
        label = "mirrorX"
    )
    val animScaleY by animateFloatAsState(
        targetValue = if (spec.flipVertical) -1f else 1f,
        animationSpec = spring(),
        label = "mirrorY"
    )
    val animRotation by animateFloatAsState(
        targetValue = spec.rotation90Steps * 90f + spec.straightenDegrees,
        animationSpec = spring(),
        label = "rotate"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // Editor Header: Cancel | Overwrite | Save Copy
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Text(
                text = "Cancel",
                color = Color.White,
                fontSize = 15.sp,
                modifier = Modifier.clickable(enabled = !isSaving) { onCancel() }
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    text = "Overwrite",
                    color = Color(0xFFA1A1A6),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .background(Color(0xFF1C1C1E), CircleShape)
                        .clickable(enabled = !isSaving) { onOverwriteOriginal(spec) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                )
                Text(
                    text = if (isSaving) "Saving..." else "Save Copy",
                    color = Color.Black,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(Color(0xFFFFD60A), CircleShape)
                        .clickable(enabled = !isSaving) { onSaveCopy(spec) }
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                )
            }
        }

        // Interactive Crop Canvas Viewport (120fps screen-fitted preview bitmap)
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            Image(
                bitmap = previewBitmap.asImageBitmap(),
                contentDescription = "Photo Editor Preview",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = animScaleX
                        scaleY = animScaleY
                        rotationZ = animRotation
                    }
            )

            // Custom Jetpack Compose Crop Box + Rule-of-Thirds + Corner L-Brackets
            Canvas(
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        detectDragGestures(
                            onDragStart = { isDraggingCrop = true },
                            onDragEnd = { isDraggingCrop = false },
                            onDragCancel = { isDraggingCrop = false }
                        ) { change, dragAmount ->
                            change.consume()
                            val dx = dragAmount.x / size.width.coerceAtLeast(1)
                            val dy = dragAmount.y / size.height.coerceAtLeast(1)
                            val r = RectF(spec.normalizedCrop)
                            val w = r.width()
                            val h = r.height()
                            val nextLeft = (r.left + dx).coerceIn(0f, 1f - w)
                            val nextTop = (r.top + dy).coerceIn(0f, 1f - h)
                            spec = spec.copy(
                                normalizedCrop = RectF(nextLeft, nextTop, nextLeft + w, nextTop + h)
                            )
                        }
                    }
            ) {
                val r = spec.normalizedCrop
                val left = r.left * size.width
                val top = r.top * size.height
                val right = r.right * size.width
                val bottom = r.bottom * size.height
                val w = right - left
                val h = bottom - top

                val mask = Color.Black.copy(alpha = 0.56f)
                drawRect(mask, Offset.Zero, Size(size.width, top))
                drawRect(mask, Offset(0f, bottom), Size(size.width, size.height - bottom))
                drawRect(mask, Offset(0f, top), Size(left, h))
                drawRect(mask, Offset(right, top), Size(size.width - right, h))

                val gridAlpha = if (isDraggingCrop) 0.72f else 0.30f
                val gridColor = Color.White.copy(alpha = gridAlpha)
                for (i in 1..2) {
                    val x = left + (w / 3f) * i
                    val y = top + (h / 3f) * i
                    drawLine(gridColor, Offset(x, top), Offset(x, bottom), strokeWidth = 1.dp.toPx())
                    drawLine(gridColor, Offset(left, y), Offset(right, y), strokeWidth = 1.dp.toPx())
                }

                val bracketLen = 22.dp.toPx()
                val stroke = 3.dp.toPx()
                val corners = listOf(
                    Offset(left, top) to Pair(Offset(left + bracketLen, top), Offset(left, top + bracketLen)),
                    Offset(right, top) to Pair(Offset(right - bracketLen, top), Offset(right, top + bracketLen)),
                    Offset(left, bottom) to Pair(Offset(left + bracketLen, bottom), Offset(left, bottom - bracketLen)),
                    Offset(right, bottom) to Pair(Offset(right - bracketLen, bottom), Offset(right, bottom - bracketLen))
                )
                corners.forEach { (origin, arms) ->
                    drawLine(Color.White, origin, arms.first, strokeWidth = stroke, cap = StrokeCap.Square)
                    drawLine(Color.White, origin, arms.second, strokeWidth = stroke, cap = StrokeCap.Square)
                }
            }
        }

        // Aspect Ratio Presets
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            items(CropAspect.entries) { preset ->
                val active = preset == selectedAspect
                Text(
                    text = preset.label,
                    color = if (active) Color.Black else Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .background(
                            if (active) Color.White else Color(0xFF1C1C1E),
                            RoundedCornerShape(12.dp)
                        )
                        .clickable {
                            selectedAspect = preset
                            val ratio = preset.ratio
                            val nextRect = if (ratio == null) {
                                RectF(0f, 0f, 1f, 1f)
                            } else if (ratio >= 1f) {
                                val h = (1f / ratio).coerceIn(0.2f, 1f)
                                RectF(0f, (1f - h) / 2f, 1f, 1f - (1f - h) / 2f)
                            } else {
                                val w = ratio.coerceIn(0.2f, 1f)
                                RectF((1f - w) / 2f, 0f, 1f - (1f - w) / 2f, 1f)
                            }
                            spec = spec.copy(normalizedCrop = nextRect)
                        }
                        .padding(horizontal = 12.dp, vertical = 7.dp)
                )
            }
        }

        Spacer(Modifier.height(10.dp))

        // Fine Straightening Dial (-45° to +45° with haptic detent at 0°)
        Column(modifier = Modifier.padding(horizontal = 20.dp)) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Straighten", color = Color(0xFF8E8E93), fontSize = 12.sp)
                Text(
                    text = "${spec.straightenDegrees.roundToInt()}°",
                    color = Color.White,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp
                )
            }
            Slider(
                value = spec.straightenDegrees,
                onValueChange = { raw ->
                    val snapped = if (abs(raw) < 1.2f) {
                        if (spec.straightenDegrees != 0f) {
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                        }
                        0f
                    } else {
                        raw
                    }
                    spec = spec.copy(straightenDegrees = snapped)
                },
                valueRange = -45f..45f
            )
        }

        // Mirror H/V & 90° Rotate Controls (Strictly Zero AI / Zero Filters)
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            IconButton(onClick = { spec = spec.copy(flipHorizontal = !spec.flipHorizontal) }) {
                Icon(
                    imageVector = Icons.Rounded.Flip,
                    contentDescription = "Mirror Horizontal",
                    tint = if (spec.flipHorizontal) Color(0xFFFFD60A) else Color.White
                )
            }
            IconButton(onClick = { spec = spec.copy(flipVertical = !spec.flipVertical) }) {
                Icon(
                    imageVector = Icons.Rounded.Flip,
                    contentDescription = "Mirror Vertical",
                    tint = if (spec.flipVertical) Color(0xFFFFD60A) else Color.White,
                    modifier = Modifier.graphicsLayer { rotationZ = 90f }
                )
            }
            IconButton(onClick = { spec = spec.copy(rotation90Steps = (spec.rotation90Steps + 3) % 4) }) {
                Icon(
                    imageVector = Icons.Rounded.Rotate90DegreesCcw,
                    contentDescription = "Rotate 90 CCW",
                    tint = Color.White
                )
            }
            IconButton(onClick = { spec = spec.copy(rotation90Steps = (spec.rotation90Steps + 1) % 4) }) {
                Icon(
                    imageVector = Icons.Rounded.Rotate90DegreesCw,
                    contentDescription = "Rotate 90 CW",
                    tint = Color.White
                )
            }
            Text(
                text = "Reset",
                color = Color(0xFFFFD60A),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable {
                    spec = TransformSpec()
                    selectedAspect = CropAspect.FREEFORM
                }
            )
        }
    }
}
