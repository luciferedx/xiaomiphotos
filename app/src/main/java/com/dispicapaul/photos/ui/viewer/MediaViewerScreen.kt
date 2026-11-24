package com.dispicapaul.photos.ui.viewer

import android.net.Uri
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.DriveFileRenameOutline
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem as ExoMediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil3.compose.AsyncImage
import com.dispicapaul.photos.data.LeicaExifData
import com.dispicapaul.photos.data.MediaAsset
import com.dispicapaul.photos.data.MediaKind
import com.dispicapaul.photos.ui.theme.LocalPhotosPalette
import com.dispicapaul.photos.ui.theme.liquidGlassSurface
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.hazeSource
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun MediaViewerScreen(
    asset: MediaAsset,
    exifData: LeicaExifData?,
    onDismiss: () -> Unit,
    onOpenEditor: (MediaAsset) -> Unit,
    onToggleFavorite: (MediaAsset) -> Unit,
    onRename: (MediaAsset, String) -> Unit,
    onShare: (MediaAsset) -> Unit,
    onDelete: (MediaAsset) -> Unit,
    onLoadExif: suspend (MediaAsset) -> Unit
) {
    val palette = LocalPhotosPalette.current
    val hazeState = remember { HazeState() }
    val scope = rememberCoroutineScope()

    val scaleAnim = remember { Animatable(1f) }
    var panOffset by remember { mutableStateOf(Offset.Zero) }
    var dismissOffsetY by remember { mutableFloatStateOf(0f) }
    var showExifSheet by remember { mutableStateOf(false) }
    var showRenameDialog by remember { mutableStateOf(false) }
    var renameInput by remember(asset.id, asset.displayName) { mutableStateOf(asset.displayName) }

    LaunchedEffect(asset.id) {
        onLoadExif(asset)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Color.Black.copy(alpha = 1f - (dismissOffsetY / 700f).coerceIn(0f, 0.7f))
            )
    ) {
        // Main 120Hz Interactive Media Surface
        Box(
            modifier = Modifier
                .fillMaxSize()
                .hazeSource(hazeState)
                .offset { IntOffset(0, dismissOffsetY.roundToInt()) }
                .pointerInput(asset.id) {
                    detectTapGestures(
                        onDoubleTap = {
                            scope.launch {
                                val target = if (scaleAnim.value > 1.2f) 1f else 2.5f
                                if (target == 1f) panOffset = Offset.Zero
                                scaleAnim.animateTo(
                                    targetValue = target,
                                    animationSpec = spring(stiffness = Spring.StiffnessMediumLow)
                                )
                            }
                        }
                    )
                }
                .pointerInput(asset.id) {
                    detectTransformGestures { _, pan, zoom, _ ->
                        scope.launch {
                            val nextScale = (scaleAnim.value * zoom).coerceIn(1f, 5f)
                            scaleAnim.snapTo(nextScale)
                            panOffset = if (nextScale > 1.02f) panOffset + pan else Offset.Zero
                        }
                    }
                }
                .pointerInput(asset.id) {
                    detectVerticalDragGestures(
                        onDragEnd = {
                            when {
                                dismissOffsetY > 180f -> onDismiss()
                                dismissOffsetY < -110f -> {
                                    dismissOffsetY = 0f
                                    showExifSheet = true
                                }
                                else -> dismissOffsetY = 0f
                            }
                        },
                        onVerticalDrag = { _, dragAmount ->
                            if (scaleAnim.value <= 1.02f) {
                                dismissOffsetY = (dismissOffsetY + dragAmount).coerceIn(-160f, 420f)
                            }
                        }
                    )
                }
        ) {
            if (asset.kind == MediaKind.VIDEO) {
                HdrVideoPlayerSurface(uri = asset.uri)
            } else {
                AsyncImage(
                    model = asset.uri,
                    contentDescription = asset.displayName,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = scaleAnim.value
                            scaleY = scaleAnim.value
                            translationX = panOffset.x
                            translationY = panOffset.y
                        }
                )
            }
        }

        // Floating Top Bar with Back + Edit Pill Button
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            IconButton(
                onClick = onDismiss,
                modifier = Modifier.liquidGlassSurface(hazeState, CircleShape)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White
                )
            }

            if (asset.kind != MediaKind.VIDEO) {
                Box(
                    modifier = Modifier
                        .liquidGlassSurface(hazeState, CircleShape)
                        .clickable { onOpenEditor(asset) }
                        .padding(horizontal = 20.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = "Edit",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Bottom Floating Action Pill (Share, Favorite, Leica EXIF Info, Delete)
        Row(
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 16.dp)
                .liquidGlassSurface(hazeState, CircleShape)
                .padding(horizontal = 14.dp, vertical = 6.dp)
        ) {
            IconButton(onClick = { onShare(asset) }) {
                Icon(Icons.Rounded.Share, contentDescription = "Share", tint = Color.White)
            }
            IconButton(onClick = { onToggleFavorite(asset) }) {
                Icon(
                    imageVector = if (asset.isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder,
                    contentDescription = "Favorite",
                    tint = if (asset.isFavorite) Color(0xFFFF375F) else Color.White
                )
            }
            IconButton(onClick = { showExifSheet = true }) {
                Icon(Icons.Rounded.Info, contentDescription = "Leica EXIF Details", tint = Color.White)
            }
            IconButton(onClick = { onDelete(asset) }) {
                Icon(Icons.Rounded.DeleteOutline, contentDescription = "Delete", tint = Color.White)
            }
        }
    }

    // Leica Optics Pro Camera EXIF Swipe-Up Sheet
    if (showExifSheet && exifData != null) {
        ModalBottomSheet(
            onDismissRequest = { showExifSheet = false },
            containerColor = palette.elevatedSheet,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = asset.displayName,
                            color = palette.primaryText,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${exifData.cameraModel} · ${exifData.colorProfile}",
                            color = palette.secondaryText,
                            fontSize = 13.sp
                        )
                    }
                    IconButton(onClick = { showRenameDialog = true }) {
                        Icon(
                            imageVector = Icons.Rounded.DriveFileRenameOutline,
                            contentDescription = "Rename File",
                            tint = palette.primaryText
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(palette.cardSurface, RoundedCornerShape(14.dp))
                        .padding(14.dp)
                ) {
                    ExifSpecCell("FOCAL", exifData.focalLengthMm, palette.primaryText, palette.secondaryText)
                    ExifSpecCell("APERTURE", exifData.aperture, palette.primaryText, palette.secondaryText)
                    ExifSpecCell("ISO", exifData.iso, palette.primaryText, palette.secondaryText)
                    ExifSpecCell("SHUTTER", exifData.shutterSpeed, palette.primaryText, palette.secondaryText)
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    text = "${exifData.resolution}  ·  ${exifData.fileSizeFormatted}",
                    color = palette.primaryText,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = exifData.absolutePath,
                    color = palette.secondaryText,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp
                )
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showRenameDialog) {
        AlertDialog(
            onDismissRequest = { showRenameDialog = false },
            title = { Text("Rename File") },
            text = {
                OutlinedTextField(
                    value = renameInput,
                    onValueChange = { renameInput = it },
                    singleLine = true
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val trimmed = renameInput.trim()
                        if (trimmed.isNotEmpty()) onRename(asset, trimmed)
                        showRenameDialog = false
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRenameDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun ExifSpecCell(label: String, value: String, primary: Color, secondary: Color) {
    Column {
        Text(text = label, color = secondary, fontSize = 10.sp, fontWeight = FontWeight.Medium)
        Text(
            text = value,
            color = primary,
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun HdrVideoPlayerSurface(uri: Uri) {
    val context = LocalContext.current
    val player = remember(uri) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(ExoMediaItem.fromUri(uri))
            prepare()
            playWhenReady = true
        }
    }
    DisposableEffect(player) {
        onDispose { player.release() }
    }
    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                this.player = player
                useController = true
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}
