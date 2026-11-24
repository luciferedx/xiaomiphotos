package com.dispicapaul.photos.ui.gallery

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesomeMosaic
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FolderOpen
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Screenshot
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Usb
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.dispicapaul.photos.data.ExternalDriveInfo
import com.dispicapaul.photos.data.GridDensity
import com.dispicapaul.photos.data.MediaAsset
import com.dispicapaul.photos.data.MediaKind
import com.dispicapaul.photos.ui.theme.LocalPhotosPalette
import com.dispicapaul.photos.ui.theme.PhotosThemeMode
import com.dispicapaul.photos.ui.theme.liquidGlassSurface
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.hazeSource
import kotlinx.collections.immutable.ImmutableList
import kotlinx.coroutines.launch

enum class GalleryPillTab { LIBRARY, ALBUMS, DRIVES }

@Composable
fun GalleryScreen(
    title: String,
    isSubCollection: Boolean,
    items: ImmutableList<MediaAsset>,
    externalDrives: ImmutableList<ExternalDriveInfo>,
    themeMode: PhotosThemeMode,
    gridDensity: GridDensity,
    searchQuery: String,
    selectedIds: Set<String>,
    isSelectionMode: Boolean,
    onBackToLibrary: () -> Unit,
    onSearchQueryChange: (String) -> Unit,
    onCycleTheme: () -> Unit,
    onChangeDensity: (GridDensity) -> Unit,
    onToggleSelectMode: () -> Unit,
    onToggleSelectItem: (String) -> Unit,
    onBatchDelete: () -> Unit,
    onBatchShare: () -> Unit,
    onOpenViewer: (MediaAsset) -> Unit,
    onSelectMediaType: (MediaKind?, Boolean, String) -> Unit,
    onOpenDrive: (ExternalDriveInfo) -> Unit,
    onMountNewDrive: () -> Unit,
    onOpenFolderIsolation: () -> Unit
) {
    val palette = LocalPhotosPalette.current
    val hazeState = remember { HazeState() }
    val gridState = rememberLazyGridState()
    val scope = rememberCoroutineScope()
    var activeTab by remember { mutableStateOf(GalleryPillTab.LIBRARY) }
    var searchExpanded by remember { mutableStateOf(false) }
    var pinchAccumulator by remember { mutableFloatStateOf(1f) }

    val floatingMonthHeader by remember(items) {
        derivedStateOf {
            val firstIdx = gridState.firstVisibleItemIndex.coerceIn(0, (items.size - 1).coerceAtLeast(0))
            items.getOrNull(firstIdx)?.monthHeader.orEmpty()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.background)
    ) {
        // Liquid Glass Ambient Hero Bleed Backdrop
        if (themeMode == PhotosThemeMode.LIQUID_GLASS && items.isNotEmpty()) {
            AsyncImage(
                model = items.first().uri,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .blur(64.dp),
                alpha = 0.45f
            )
        }

        // Unified Single-View Scrollable Surface (Library Grid -> Collections & External Drives)
        LazyVerticalGrid(
            columns = GridCells.Fixed(gridDensity.columns),
            state = gridState,
            contentPadding = PaddingValues(top = 108.dp, bottom = 118.dp),
            horizontalArrangement = Arrangement.spacedBy(1.5.dp),
            verticalArrangement = Arrangement.spacedBy(1.5.dp),
            modifier = Modifier
                .fillMaxSize()
                .hazeSource(hazeState)
                .pointerInput(gridDensity) {
                    detectTransformGestures { _, _, zoom, _ ->
                        pinchAccumulator *= zoom
                        if (pinchAccumulator < 0.78f) {
                            pinchAccumulator = 1f
                            val next = when (gridDensity) {
                                GridDensity.COMFORTABLE -> GridDensity.DENSE
                                GridDensity.DENSE -> GridDensity.OVERVIEW
                                GridDensity.OVERVIEW -> GridDensity.OVERVIEW
                            }
                            onChangeDensity(next)
                        } else if (pinchAccumulator > 1.28f) {
                            pinchAccumulator = 1f
                            val next = when (gridDensity) {
                                GridDensity.OVERVIEW -> GridDensity.DENSE
                                GridDensity.DENSE -> GridDensity.COMFORTABLE
                                GridDensity.COMFORTABLE -> GridDensity.COMFORTABLE
                            }
                            onChangeDensity(next)
                        }
                    }
                }
        ) {
            if (items.isEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }, key = "empty_library_notice") {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 48.dp)
                    ) {
                        Text(
                            text = if (searchQuery.isNotBlank()) "No matching files" else "No media in this view",
                            color = palette.primaryText,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            text = "Only DCIM/Camera and your whitelisted folders appear in Library.",
                            color = palette.secondaryText,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            items(
                items = items,
                key = { it.id },
                contentType = { it.kind }
            ) { asset ->
                val isSelected = selectedIds.contains(asset.id)
                Box(
                    modifier = Modifier
                        .aspectRatio(1f)
                        .background(palette.cardSurface)
                        .clickable {
                            if (isSelectionMode) onToggleSelectItem(asset.id)
                            else onOpenViewer(asset)
                        }
                ) {
                    AsyncImage(
                        model = asset.uri,
                        contentDescription = asset.displayName,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    if (asset.kind == MediaKind.VIDEO && gridDensity != GridDensity.OVERVIEW) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .padding(4.dp)
                                .background(Color.Black.copy(alpha = 0.56f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 4.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Rounded.PlayArrow,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(11.dp)
                            )
                            Text(
                                text = formatVideoDuration(asset.durationMillis),
                                color = Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    } else if (asset.kind == MediaKind.RAW_DNG && gridDensity != GridDensity.OVERVIEW) {
                        Text(
                            text = "RAW",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(4.dp)
                                .background(Color.Black.copy(alpha = 0.55f), RoundedCornerShape(3.dp))
                                .padding(horizontal = 4.dp, vertical = 1.dp)
                        )
                    }

                    if (isSelected) {
                        Icon(
                            imageVector = Icons.Rounded.CheckCircle,
                            contentDescription = "Selected",
                            tint = palette.accent,
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(6.dp)
                                .size(22.dp)
                                .background(Color.White, CircleShape)
                        )
                    }
                }
            }

            // Bottom Section: Media Types & External Drives (revealed below main Library Grid)
            if (!isSubCollection) {
                item(span = { GridItemSpan(maxLineSpan) }, key = "collections_media_types") {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 28.dp, start = 16.dp, end = 16.dp)
                    ) {
                        Text(
                            text = "Collections & Media Types",
                            color = palette.primaryText,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(12.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            item(key = "col_videos") {
                                CollectionShortcutCard(
                                    label = "Videos",
                                    subtitle = "4K / 8K HDR",
                                    icon = Icons.Rounded.Videocam,
                                    hazeState = hazeState,
                                    onClick = { onSelectMediaType(MediaKind.VIDEO, false, "Videos") }
                                )
                            }
                            item(key = "col_favorites") {
                                CollectionShortcutCard(
                                    label = "Favorites",
                                    subtitle = "Starred media",
                                    icon = Icons.Rounded.Favorite,
                                    hazeState = hazeState,
                                    onClick = { onSelectMediaType(null, true, "Favorites") }
                                )
                            }
                            item(key = "col_raw") {
                                CollectionShortcutCard(
                                    label = "RAW / DNG",
                                    subtitle = "14-bit Leica",
                                    icon = Icons.Rounded.CameraAlt,
                                    hazeState = hazeState,
                                    onClick = { onSelectMediaType(MediaKind.RAW_DNG, false, "RAW / DNG") }
                                )
                            }
                            item(key = "col_screenshots") {
                                CollectionShortcutCard(
                                    label = "Screenshots",
                                    subtitle = "Isolated feed",
                                    icon = Icons.Rounded.Screenshot,
                                    hazeState = hazeState,
                                    onClick = {
                                        onSelectMediaType(MediaKind.SCREENSHOT, false, "Screenshots")
                                    }
                                )
                            }
                        }
                    }
                }

                item(span = { GridItemSpan(maxLineSpan) }, key = "external_drives_section") {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 24.dp, start = 16.dp, end = 16.dp)
                    ) {
                        Text(
                            text = "External Drives & USB-OTG",
                            color = palette.primaryText,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(Modifier.height(12.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(externalDrives, key = { it.id }) { drive ->
                                Column(
                                    modifier = Modifier
                                        .width(210.dp)
                                        .liquidGlassSurface(hazeState, RoundedCornerShape(18.dp))
                                        .clickable { onOpenDrive(drive) }
                                        .padding(14.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.Usb,
                                        contentDescription = null,
                                        tint = palette.primaryText
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        text = drive.label,
                                        color = palette.primaryText,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = drive.deviceName,
                                        color = palette.secondaryText,
                                        fontSize = 12.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            item(key = "mount_drive_card") {
                                Column(
                                    modifier = Modifier
                                        .width(176.dp)
                                        .liquidGlassSurface(hazeState, RoundedCornerShape(18.dp))
                                        .clickable { onMountNewDrive() }
                                        .padding(14.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Rounded.FolderOpen,
                                        contentDescription = null,
                                        tint = palette.accent
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        text = "Mount NVMe / USB",
                                        color = palette.primaryText,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "SAF Document Tree",
                                        color = palette.secondaryText,
                                        fontSize = 12.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Top Floating Glass Header (Edge-to-Edge safe around Xiaomi 15 Ultra punch-hole)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 10.dp)
                .liquidGlassSurface(hazeState, RoundedCornerShape(24.dp))
                .padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            if (searchExpanded) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Search,
                        contentDescription = null,
                        tint = palette.secondaryText,
                        modifier = Modifier.padding(start = 4.dp, end = 8.dp)
                    )
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = onSearchQueryChange,
                        singleLine = true,
                        textStyle = TextStyle(
                            color = palette.primaryText,
                            fontSize = 15.sp
                        ),
                        cursorBrush = SolidColor(palette.accent),
                        modifier = Modifier.weight(1f),
                        decorationBox = { inner ->
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Filename, folder, or month...",
                                    color = palette.secondaryText,
                                    fontSize = 14.sp
                                )
                            }
                            inner()
                        }
                    )
                    IconButton(
                        onClick = {
                            onSearchQueryChange("")
                            searchExpanded = false
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Close,
                            contentDescription = "Close Search",
                            tint = palette.primaryText
                        )
                    }
                }
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    if (isSubCollection) {
                        IconButton(onClick = onBackToLibrary) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                                contentDescription = "Back to Photos",
                                tint = palette.primaryText
                            )
                        }
                    }
                    Column(modifier = Modifier.padding(start = if (isSubCollection) 0.dp else 6.dp)) {
                        Text(
                            text = title,
                            color = palette.primaryText,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        AnimatedVisibility(
                            visible = floatingMonthHeader.isNotEmpty(),
                            enter = fadeIn(),
                            exit = fadeOut()
                        ) {
                            Text(
                                text = floatingMonthHeader,
                                color = palette.secondaryText,
                                fontSize = 12.sp
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { searchExpanded = true }) {
                        Icon(
                            imageVector = Icons.Rounded.Search,
                            contentDescription = "Filter Library",
                            tint = palette.primaryText
                        )
                    }
                    IconButton(onClick = onOpenFolderIsolation) {
                        Icon(
                            imageVector = Icons.Rounded.FolderOpen,
                            contentDescription = "Included Folders",
                            tint = palette.primaryText
                        )
                    }
                    IconButton(onClick = onCycleTheme) {
                        val icon = when (themeMode) {
                            PhotosThemeMode.LIGHT -> Icons.Rounded.LightMode
                            PhotosThemeMode.TRUE_AMOLED_BLACK -> Icons.Rounded.DarkMode
                            PhotosThemeMode.LIQUID_GLASS -> Icons.Rounded.AutoAwesomeMosaic
                        }
                        Icon(
                            imageVector = icon,
                            contentDescription = "Switch Theme Mode",
                            tint = palette.primaryText
                        )
                    }
                }
            }
        }

        // iOS-Style Floating Bottom Pill Bar anchored above HyperOS 3 gesture bar
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(bottom = 14.dp)
        ) {
            if (isSelectionMode) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .liquidGlassSurface(hazeState, CircleShape)
                        .padding(horizontal = 14.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${selectedIds.size} selected",
                        color = palette.primaryText,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    IconButton(
                        onClick = onBatchShare,
                        enabled = selectedIds.isNotEmpty()
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Share,
                            contentDescription = "Share Selected",
                            tint = palette.primaryText
                        )
                    }
                    IconButton(
                        onClick = onBatchDelete,
                        enabled = selectedIds.isNotEmpty()
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.DeleteOutline,
                            contentDescription = "Delete Selected",
                            tint = Color(0xFFFF453A)
                        )
                    }
                }
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .liquidGlassSurface(hazeState, CircleShape)
                        .padding(4.dp)
                ) {
                    listOf(
                        GalleryPillTab.LIBRARY to "Library",
                        GalleryPillTab.ALBUMS to "Albums",
                        GalleryPillTab.DRIVES to "Drives"
                    ).forEach { (tab, label) ->
                        val selected = activeTab == tab
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(
                                    if (selected) palette.pillActiveContainer else Color.Transparent
                                )
                                .clickable {
                                    activeTab = tab
                                    if (isSubCollection) onBackToLibrary()
                                    scope.launch {
                                        when (tab) {
                                            GalleryPillTab.LIBRARY -> gridState.animateScrollToItem(0)
                                            GalleryPillTab.ALBUMS -> gridState.animateScrollToItem(items.size)
                                            GalleryPillTab.DRIVES -> gridState.animateScrollToItem(
                                                (items.size + 1).coerceAtLeast(0)
                                            )
                                        }
                                    }
                                }
                                .padding(horizontal = 16.dp, vertical = 10.dp)
                        ) {
                            Text(
                                text = label,
                                color = if (selected) palette.pillActiveContent else palette.primaryText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }

            Box(
                modifier = Modifier
                    .liquidGlassSurface(hazeState, CircleShape)
                    .clickable { onToggleSelectMode() }
                    .padding(horizontal = 18.dp, vertical = 14.dp)
            ) {
                Text(
                    text = if (isSelectionMode) "Done" else "Select",
                    color = palette.primaryText,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun CollectionShortcutCard(
    label: String,
    subtitle: String,
    icon: ImageVector,
    hazeState: HazeState,
    onClick: () -> Unit
) {
    val palette = LocalPhotosPalette.current
    Column(
        modifier = Modifier
            .width(148.dp)
            .liquidGlassSurface(hazeState, RoundedCornerShape(18.dp))
            .clickable(onClick = onClick)
            .padding(14.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = palette.primaryText,
            modifier = Modifier.size(22.dp)
        )
        Spacer(Modifier.height(10.dp))
        Text(
            text = label,
            color = palette.primaryText,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = subtitle,
            color = palette.secondaryText,
            fontSize = 11.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private fun formatVideoDuration(durationMillis: Long): String {
    val totalSeconds = (durationMillis / 1000L).coerceAtLeast(0L)
    val minutes = totalSeconds / 60L
    val seconds = totalSeconds % 60L
    return "$minutes:${seconds.toString().padStart(2, '0')}"
}
