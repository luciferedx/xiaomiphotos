package com.dispicapaul.photos.data

import android.graphics.RectF
import android.net.Uri
import androidx.compose.runtime.Immutable

enum class StorageOrigin {
    INTERNAL,
    EXTERNAL_USB_OTG
}

enum class MediaKind {
    PHOTO,
    RAW_DNG,
    VIDEO,
    SCREENSHOT
}

enum class GridDensity(val columns: Int) {
    COMFORTABLE(3),
    DENSE(5),
    OVERVIEW(7)
}

@Immutable
data class LeicaExifData(
    val cameraModel: String,
    val focalLengthMm: String,
    val aperture: String,
    val iso: String,
    val shutterSpeed: String,
    val resolution: String,
    val fileSizeFormatted: String,
    val colorProfile: String,
    val absolutePath: String
)

@Immutable
data class MediaAsset(
    val id: String,
    val uri: Uri,
    val displayName: String,
    val mimeType: String,
    val dateTakenMillis: Long,
    val monthKey: String,
    val monthHeader: String,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val durationMillis: Long = 0L,
    val relativePath: String,
    val bucketName: String,
    val kind: MediaKind,
    val origin: StorageOrigin,
    val driveId: String? = null,
    val isFavorite: Boolean = false
)

@Immutable
data class FolderIsolationRule(
    val relativePath: String,
    val displayName: String,
    val isIncluded: Boolean,
    val itemCount: Int
)

@Immutable
data class ExternalDriveInfo(
    val id: String,
    val label: String,
    val treeUri: Uri,
    val isMounted: Boolean,
    val deviceName: String
)

@Immutable
data class TransformSpec(
    val flipHorizontal: Boolean = false,
    val flipVertical: Boolean = false,
    val rotation90Steps: Int = 0,
    val straightenDegrees: Float = 0f,
    val normalizedCrop: RectF = RectF(0f, 0f, 1f, 1f)
)
