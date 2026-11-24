package com.dispicapaul.photos.data

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.net.Uri
import androidx.core.content.ContextCompat
import androidx.documentfile.provider.DocumentFile
import kotlinx.collections.immutable.ImmutableList
import kotlinx.collections.immutable.persistentListOf
import kotlinx.collections.immutable.toImmutableList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.coroutines.coroutineContext

class UsbStorageManager(private val context: Context) {

    private val _mountedDrives =
        MutableStateFlow<ImmutableList<ExternalDriveInfo>>(persistentListOf())
    val mountedDrives: StateFlow<ImmutableList<ExternalDriveInfo>> = _mountedDrives.asStateFlow()

    private var isRegistered = false

    private val usbReceiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context, intent: Intent) {
            when (intent.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED,
                UsbManager.ACTION_USB_DEVICE_DETACHED,
                Intent.ACTION_MEDIA_MOUNTED,
                Intent.ACTION_MEDIA_UNMOUNTED,
                Intent.ACTION_MEDIA_EJECT -> refreshPersistedDrives()
            }
        }
    }

    fun register() {
        if (isRegistered) return
        val filter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
            addAction(Intent.ACTION_MEDIA_MOUNTED)
            addAction(Intent.ACTION_MEDIA_UNMOUNTED)
            addAction(Intent.ACTION_MEDIA_EJECT)
        }
        ContextCompat.registerReceiver(
            context,
            usbReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
        isRegistered = true
        refreshPersistedDrives()
    }

    fun unregister() {
        if (!isRegistered) return
        runCatching { context.unregisterReceiver(usbReceiver) }
        isRegistered = false
    }

    /**
     * Persists SAF tree URI permission from ACTION_OPEN_DOCUMENT_TREE so NVMe SSDs
     * and USB-OTG drives stay accessible across reboots without repeated permission popups.
     */
    fun persistTreePermission(treeUri: Uri) {
        val flags =
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        runCatching {
            context.contentResolver.takePersistableUriPermission(treeUri, flags)
        }
        refreshPersistedDrives()
    }

    fun refreshPersistedDrives() {
        val usbManager = context.getSystemService(Context.USB_SERVICE) as? UsbManager
        val activeUsbNames = usbManager?.deviceList?.values
            ?.mapNotNull { device: UsbDevice -> device.productName ?: device.deviceName }
            .orEmpty()

        val drives = context.contentResolver.persistedUriPermissions
            .filter { it.isReadPermission }
            .mapNotNull { perm ->
                val tree = DocumentFile.fromTreeUri(context, perm.uri)
                val reachable = runCatching { tree != null && tree.exists() && tree.canRead() }
                    .getOrDefault(false)
                if (!reachable || tree == null) return@mapNotNull null

                ExternalDriveInfo(
                    id = perm.uri.toString().hashCode().toString(),
                    label = tree.name ?: "External NVMe Drive",
                    treeUri = perm.uri,
                    isMounted = true,
                    deviceName = activeUsbNames.firstOrNull() ?: "USB-C OTG Storage"
                )
            }
            .toImmutableList()

        _mountedDrives.value = drives
    }

    /**
     * Non-blocking directory indexer for mounted NVMe/USB-OTG volumes.
     * Cancels cleanly on fast scrolling or mid-browse hot-unplug without crashing.
     */
    suspend fun indexExternalDrive(drive: ExternalDriveInfo): ImmutableList<MediaAsset> =
        withContext(Dispatchers.IO) {
            val root = DocumentFile.fromTreeUri(context, drive.treeUri)
                ?: return@withContext persistentListOf()
            if (!root.exists() || !root.canRead()) return@withContext persistentListOf()

            val monthKeyFmt = SimpleDateFormat("yyyy-MM", Locale.US)
            val monthLabelFmt = SimpleDateFormat("MMMM yyyy", Locale.US)
            val collected = ArrayList<MediaAsset>(256)

            suspend fun walk(dir: DocumentFile, depth: Int) {
                coroutineContext.ensureActive()
                if (depth > 4) return
                val children = runCatching { dir.listFiles() }.getOrElse { emptyArray() }
                for (doc in children) {
                    coroutineContext.ensureActive()
                    if (doc.isDirectory) {
                        if (!doc.name.orEmpty().startsWith(".")) walk(doc, depth + 1)
                        continue
                    }
                    val mime = doc.type.orEmpty()
                    val name = doc.name.orEmpty()
                    val isImage = mime.startsWith("image/") || name.endsWith(".dng", ignoreCase = true)
                    val isVideo = mime.startsWith("video/")
                    if (!isImage && !isVideo) continue

                    val ts = doc.lastModified().takeIf { it > 0L } ?: System.currentTimeMillis()
                    val date = Date(ts)
                    collected.add(
                        MediaAsset(
                            id = "usb_${doc.uri.hashCode()}",
                            uri = doc.uri,
                            displayName = name,
                            mimeType = mime.ifEmpty { "image/jpeg" },
                            dateTakenMillis = ts,
                            monthKey = monthKeyFmt.format(date),
                            monthHeader = monthLabelFmt.format(date),
                            width = 0,
                            height = 0,
                            sizeBytes = doc.length(),
                            relativePath = drive.label,
                            bucketName = drive.label,
                            kind = when {
                                isVideo -> MediaKind.VIDEO
                                name.endsWith(".dng", ignoreCase = true) -> MediaKind.RAW_DNG
                                else -> MediaKind.PHOTO
                            },
                            origin = StorageOrigin.EXTERNAL_USB_OTG,
                            driveId = drive.id
                        )
                    )
                }
            }

            walk(root, 0)
            collected.sortByDescending { it.dateTakenMillis }
            collected.toImmutableList()
        }
}
