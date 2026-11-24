package com.dispicapaul.photos

import android.Manifest
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.dispicapaul.photos.data.ExternalDriveInfo
import com.dispicapaul.photos.data.FolderIsolationRule
import com.dispicapaul.photos.data.GridDensity
import com.dispicapaul.photos.data.ImageTransformProcessor
import com.dispicapaul.photos.data.LeicaExifData
import com.dispicapaul.photos.data.MediaAsset
import com.dispicapaul.photos.data.MediaKind
import com.dispicapaul.photos.data.MediaRepository
import com.dispicapaul.photos.data.StorageOrigin
import com.dispicapaul.photos.data.ThemePreferences
import com.dispicapaul.photos.data.UsbStorageManager
import com.dispicapaul.photos.ui.editor.MiniImageEditorScreen
import com.dispicapaul.photos.ui.gallery.GalleryScreen
import com.dispicapaul.photos.ui.gallery.IncludedFoldersSheet
import com.dispicapaul.photos.ui.theme.PhotosTheme
import com.dispicapaul.photos.ui.theme.PhotosThemeMode
import com.dispicapaul.photos.ui.viewer.MediaViewerScreen
import kotlinx.collections.immutable.persistentListOf
import kotlinx.collections.immutable.toPersistentList
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private lateinit var usbStorageManager: UsbStorageManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Edge-to-edge layout respecting Xiaomi 15 Ultra punch-hole & HyperOS 3 gesture bar
        enableEdgeToEdge()

        val repository = MediaRepository(applicationContext)
        val processor = ImageTransformProcessor(applicationContext)
        val preferences = ThemePreferences(applicationContext)
        usbStorageManager = UsbStorageManager(applicationContext).also { it.register() }

        setContent {
            val themeMode by preferences.themeModeFlow.collectAsState(
                initial = PhotosThemeMode.TRUE_AMOLED_BLACK
            )
            val includedFolders by preferences.includedFoldersFlow.collectAsState(
                initial = MediaRepository.DEFAULT_INCLUDED_PREFIXES
            )
            val drives by usbStorageManager.mountedDrives.collectAsState()
            val scope = rememberCoroutineScope()
            val snackbarHostState = remember { SnackbarHostState() }

            var density by remember { mutableStateOf(GridDensity.COMFORTABLE) }
            var items by remember { mutableStateOf(persistentListOf<MediaAsset>()) }
            var folderRules by remember { mutableStateOf(persistentListOf<FolderIsolationRule>()) }

            var activeTitle by remember { mutableStateOf("Photos") }
            var activeDrive by remember { mutableStateOf<ExternalDriveInfo?>(null) }
            var activeFilterKind by remember { mutableStateOf<MediaKind?>(null) }
            var favoritesOnly by remember { mutableStateOf(false) }
            var searchQuery by remember { mutableStateOf("") }

            var isSelectionMode by remember { mutableStateOf(false) }
            var selectedIds by remember { mutableStateOf(setOf<String>()) }

            var activeViewer by remember { mutableStateOf<MediaAsset?>(null) }
            var activeExif by remember { mutableStateOf<LeicaExifData?>(null) }

            var editingAsset by remember { mutableStateOf<MediaAsset?>(null) }
            var editorPreviewBitmap by remember { mutableStateOf<Bitmap?>(null) }
            var isExportingEdit by remember { mutableStateOf(false) }
            var showFoldersSheet by remember { mutableStateOf(false) }

            suspend fun refreshCurrentFeed() {
                val drive = activeDrive
                items = if (drive != null) {
                    usbStorageManager.indexExternalDrive(drive).toPersistentList()
                } else {
                    repository.loadInternalLibrary(
                        whitelistedPrefixes = includedFolders,
                        searchQuery = searchQuery,
                        filterKind = activeFilterKind,
                        favoritesOnly = favoritesOnly
                    ).toPersistentList()
                }
                folderRules = repository.discoverLocalFolders(includedFolders).toPersistentList()
            }

            fun shareAssets(targets: List<MediaAsset>) {
                if (targets.isEmpty()) return
                val intent = if (targets.size == 1) {
                    val item = targets.first()
                    Intent(Intent.ACTION_SEND).apply {
                        type = item.mimeType.ifBlank { "image/*" }
                        putExtra(Intent.EXTRA_STREAM, item.uri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                } else {
                    Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                        type = "*/*"
                        putParcelableArrayListExtra(
                            Intent.EXTRA_STREAM,
                            ArrayList(targets.map { it.uri })
                        )
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                }
                runCatching {
                    startActivity(Intent.createChooser(intent, "Share via"))
                }
            }

            val permissionLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.RequestMultiplePermissions()
            ) {
                scope.launch { refreshCurrentFeed() }
            }

            val safTreeLauncher = rememberLauncherForActivityResult(
                ActivityResultContracts.OpenDocumentTree()
            ) { uri ->
                if (uri != null) {
                    usbStorageManager.persistTreePermission(uri)
                    scope.launch {
                        snackbarHostState.showSnackbar("External USB-OTG drive mounted")
                    }
                }
            }

            // Request Android 12–16 media permissions once on launch without loops
            LaunchedEffect(Unit) {
                val permissions = buildList {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                        add(Manifest.permission.READ_MEDIA_IMAGES)
                        add(Manifest.permission.READ_MEDIA_VIDEO)
                    } else {
                        add(Manifest.permission.READ_EXTERNAL_STORAGE)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        add(Manifest.permission.READ_MEDIA_VISUAL_USER_SELECTED)
                    }
                }.toTypedArray()
                permissionLauncher.launch(permissions)
            }

            // Re-index cleanly whenever filters, search, or whitelisted folders change
            LaunchedEffect(includedFolders, searchQuery, activeFilterKind, favoritesOnly, activeDrive) {
                refreshCurrentFeed()
            }

            // Crash-safe USB-OTG hot-unplug guard: return gracefully if active drive disconnects
            LaunchedEffect(drives) {
                val viewingDrive = activeDrive
                if (viewingDrive != null && drives.none { it.id == viewingDrive.id }) {
                    activeDrive = null
                    activeTitle = "Photos"
                    if (activeViewer?.origin == StorageOrigin.EXTERNAL_USB_OTG) {
                        activeViewer = null
                    }
                    if (editingAsset?.origin == StorageOrigin.EXTERNAL_USB_OTG) {
                        editorPreviewBitmap?.recycle()
                        editorPreviewBitmap = null
                        editingAsset = null
                    }
                    snackbarHostState.showSnackbar("${viewingDrive.label} disconnected safely")
                }
            }

            val isSubCollection = activeDrive != null || activeFilterKind != null || favoritesOnly

            BackHandler(enabled = editingAsset != null || activeViewer != null || isSubCollection) {
                when {
                    editingAsset != null -> {
                        editorPreviewBitmap?.recycle()
                        editorPreviewBitmap = null
                        editingAsset = null
                    }
                    activeViewer != null -> activeViewer = null
                    isSubCollection -> {
                        activeDrive = null
                        activeFilterKind = null
                        favoritesOnly = false
                        activeTitle = "Photos"
                    }
                }
            }

            PhotosTheme(mode = themeMode) {
                Box(modifier = Modifier.fillMaxSize()) {
                    val currentEditing = editingAsset
                    val currentPreview = editorPreviewBitmap
                    val currentViewer = activeViewer

                    when {
                        currentEditing != null && currentPreview != null -> {
                            MiniImageEditorScreen(
                                previewBitmap = currentPreview,
                                isSaving = isExportingEdit,
                                onCancel = {
                                    editorPreviewBitmap?.recycle()
                                    editorPreviewBitmap = null
                                    editingAsset = null
                                },
                                onSaveCopy = { spec ->
                                    scope.launch {
                                        isExportingEdit = true
                                        val driveTree = drives.firstOrNull {
                                            it.id == currentEditing.driveId
                                        }?.treeUri
                                        val result = processor.exportTransformed(
                                            asset = currentEditing,
                                            spec = spec,
                                            overwriteOriginal = false,
                                            externalTreeUri = driveTree
                                        )
                                        isExportingEdit = false
                                        editorPreviewBitmap?.recycle()
                                        editorPreviewBitmap = null
                                        editingAsset = null
                                        refreshCurrentFeed()
                                        snackbarHostState.showSnackbar(
                                            if (result.isSuccess) "Saved edited copy" else "Export failed"
                                        )
                                    }
                                },
                                onOverwriteOriginal = { spec ->
                                    scope.launch {
                                        isExportingEdit = true
                                        val driveTree = drives.firstOrNull {
                                            it.id == currentEditing.driveId
                                        }?.treeUri
                                        val result = processor.exportTransformed(
                                            asset = currentEditing,
                                            spec = spec,
                                            overwriteOriginal = true,
                                            externalTreeUri = driveTree
                                        )
                                        isExportingEdit = false
                                        editorPreviewBitmap?.recycle()
                                        editorPreviewBitmap = null
                                        editingAsset = null
                                        refreshCurrentFeed()
                                        snackbarHostState.showSnackbar(
                                            if (result.isSuccess) "Overwrote original file" else "Overwrite failed"
                                        )
                                    }
                                }
                            )
                        }

                        currentViewer != null -> {
                            MediaViewerScreen(
                                asset = currentViewer,
                                exifData = activeExif,
                                onDismiss = { activeViewer = null },
                                onOpenEditor = { asset ->
                                    scope.launch {
                                        val decoded = repository.decodePreviewBitmap(asset.uri)
                                        if (decoded != null) {
                                            editorPreviewBitmap = decoded
                                            editingAsset = asset
                                        } else {
                                            snackbarHostState.showSnackbar("Unable to decode image for editing")
                                        }
                                    }
                                },
                                onToggleFavorite = { asset ->
                                    scope.launch {
                                        val updated = repository.toggleFavorite(asset)
                                        if (updated) {
                                            activeViewer = asset.copy(isFavorite = !asset.isFavorite)
                                            refreshCurrentFeed()
                                        }
                                    }
                                },
                                onRename = { asset, newName ->
                                    scope.launch {
                                        val ok = repository.renameAsset(asset, newName)
                                        if (ok) {
                                            activeViewer = asset.copy(displayName = newName)
                                            refreshCurrentFeed()
                                            snackbarHostState.showSnackbar("Renamed to $newName")
                                        }
                                    }
                                },
                                onShare = { asset -> shareAssets(listOf(asset)) },
                                onDelete = { asset ->
                                    scope.launch {
                                        repository.moveToTrash(asset, useTrashBin = true)
                                        activeViewer = null
                                        refreshCurrentFeed()
                                        snackbarHostState.showSnackbar("Moved to Trash")
                                    }
                                },
                                onLoadExif = { asset ->
                                    activeExif = repository.readLeicaExif(asset)
                                }
                            )
                        }

                        else -> {
                            GalleryScreen(
                                title = activeTitle,
                                isSubCollection = isSubCollection,
                                items = items,
                                externalDrives = drives,
                                themeMode = themeMode,
                                gridDensity = density,
                                searchQuery = searchQuery,
                                selectedIds = selectedIds,
                                isSelectionMode = isSelectionMode,
                                onBackToLibrary = {
                                    activeDrive = null
                                    activeFilterKind = null
                                    favoritesOnly = false
                                    activeTitle = "Photos"
                                    isSelectionMode = false
                                    selectedIds = emptySet()
                                },
                                onSearchQueryChange = { searchQuery = it },
                                onCycleTheme = {
                                    val next = when (themeMode) {
                                        PhotosThemeMode.LIGHT -> PhotosThemeMode.TRUE_AMOLED_BLACK
                                        PhotosThemeMode.TRUE_AMOLED_BLACK -> PhotosThemeMode.LIQUID_GLASS
                                        PhotosThemeMode.LIQUID_GLASS -> PhotosThemeMode.LIGHT
                                    }
                                    scope.launch { preferences.saveThemeMode(next) }
                                },
                                onChangeDensity = { density = it },
                                onToggleSelectMode = {
                                    isSelectionMode = !isSelectionMode
                                    if (!isSelectionMode) selectedIds = emptySet()
                                },
                                onToggleSelectItem = { id ->
                                    selectedIds = if (selectedIds.contains(id)) {
                                        selectedIds - id
                                    } else {
                                        selectedIds + id
                                    }
                                },
                                onBatchDelete = {
                                    scope.launch {
                                        val targets = items.filter { selectedIds.contains(it.id) }
                                        targets.forEach { repository.moveToTrash(it, useTrashBin = true) }
                                        isSelectionMode = false
                                        selectedIds = emptySet()
                                        refreshCurrentFeed()
                                        snackbarHostState.showSnackbar("Moved ${targets.size} item(s) to Trash")
                                    }
                                },
                                onBatchShare = {
                                    val targets = items.filter { selectedIds.contains(it.id) }
                                    shareAssets(targets)
                                    isSelectionMode = false
                                    selectedIds = emptySet()
                                },
                                onOpenViewer = { activeViewer = it },
                                onSelectMediaType = { kind, favOnly, label ->
                                    activeDrive = null
                                    activeFilterKind = kind
                                    favoritesOnly = favOnly
                                    activeTitle = label
                                },
                                onOpenDrive = { drive ->
                                    activeFilterKind = null
                                    favoritesOnly = false
                                    activeDrive = drive
                                    activeTitle = drive.label
                                },
                                onMountNewDrive = { safTreeLauncher.launch(null) },
                                onOpenFolderIsolation = { showFoldersSheet = true }
                            )
                        }
                    }

                    if (showFoldersSheet) {
                        IncludedFoldersSheet(
                            folders = folderRules,
                            onToggleFolder = { path ->
                                val next = if (includedFolders.contains(path)) {
                                    includedFolders - path
                                } else {
                                    includedFolders + path
                                }
                                scope.launch { preferences.saveIncludedFolders(next) }
                            },
                            onResetCameraOnly = {
                                scope.launch {
                                    preferences.saveIncludedFolders(
                                        MediaRepository.DEFAULT_INCLUDED_PREFIXES
                                    )
                                }
                            },
                            onDismiss = { showFoldersSheet = false }
                        )
                    }

                    SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .navigationBarsPadding()
                            .padding(bottom = 76.dp)
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        usbStorageManager.unregister()
        super.onDestroy()
    }
}
