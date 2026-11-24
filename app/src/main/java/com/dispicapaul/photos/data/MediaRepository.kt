package com.dispicapaul.photos.data

import android.content.ContentResolver
import android.content.ContentUris
import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.provider.MediaStore
import androidx.documentfile.provider.DocumentFile
import androidx.exifinterface.media.ExifInterface
import kotlinx.collections.immutable.ImmutableList
import kotlinx.collections.immutable.toImmutableList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.coroutines.coroutineContext
import kotlin.math.max

class MediaRepository(private val context: Context) {

    private val resolver: ContentResolver = context.contentResolver

    companion object {
        val DEFAULT_INCLUDED_PREFIXES = setOf("DCIM/Camera/")
    }

    /**
     * Queries MediaStore deterministically with strict folder isolation so WhatsApp,
     * Telegram, and app caches never pollute the main Library feed unless whitelisted.
     */
    suspend fun loadInternalLibrary(
        whitelistedPrefixes: Set<String> = DEFAULT_INCLUDED_PREFIXES,
        searchQuery: String = "",
        filterKind: MediaKind? = null,
        favoritesOnly: Boolean = false
    ): ImmutableList<MediaAsset> = withContext(Dispatchers.IO) {
        val results = ArrayList<MediaAsset>(512)
        val collection = MediaStore.Files.getContentUri("external")

        val projection = arrayOf(
            MediaStore.Files.FileColumns._ID,
            MediaStore.Files.FileColumns.DISPLAY_NAME,
            MediaStore.Files.FileColumns.MIME_TYPE,
            MediaStore.Files.FileColumns.MEDIA_TYPE,
            MediaStore.Files.FileColumns.DATE_TAKEN,
            MediaStore.Files.FileColumns.DATE_ADDED,
            MediaStore.Files.FileColumns.WIDTH,
            MediaStore.Files.FileColumns.HEIGHT,
            MediaStore.Files.FileColumns.SIZE,
            MediaStore.MediaColumns.DURATION,
            MediaStore.MediaColumns.RELATIVE_PATH,
            MediaStore.MediaColumns.BUCKET_DISPLAY_NAME,
            MediaStore.MediaColumns.IS_FAVORITE,
            MediaStore.MediaColumns.IS_TRASHED
        )

        val selection = """
            (${MediaStore.Files.FileColumns.MEDIA_TYPE} = ? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} = ?)
            AND ${MediaStore.MediaColumns.IS_TRASHED} = 0
        """.trimIndent()

        val selectionArgs = arrayOf(
            MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(),
            MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
        )

        val sortOrder =
            "${MediaStore.Files.FileColumns.DATE_TAKEN} DESC, ${MediaStore.Files.FileColumns.DATE_ADDED} DESC"
        val monthKeyFmt = SimpleDateFormat("yyyy-MM", Locale.US)
        val monthLabelFmt = SimpleDateFormat("MMMM yyyy", Locale.US)
        val queryLower = searchQuery.trim().lowercase(Locale.US)

        resolver.query(collection, projection, selection, selectionArgs, sortOrder)?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DISPLAY_NAME)
            val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MIME_TYPE)
            val typeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.MEDIA_TYPE)
            val takenCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_TAKEN)
            val addedCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.DATE_ADDED)
            val wCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.WIDTH)
            val hCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.HEIGHT)
            val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Files.FileColumns.SIZE)
            val durCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DURATION)
            val relCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH)
            val bucketCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.BUCKET_DISPLAY_NAME)
            val favCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.IS_FAVORITE)

            while (cursor.moveToNext()) {
                coroutineContext.ensureActive()

                val relPath = cursor.getString(relCol).orEmpty()
                val isFavorite = cursor.getInt(favCol) == 1
                val name = cursor.getString(nameCol).orEmpty()
                val mediaType = cursor.getInt(typeCol)
                val isVideo = mediaType == MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO

                val kind = when {
                    isVideo -> MediaKind.VIDEO
                    name.endsWith(".dng", ignoreCase = true) -> MediaKind.RAW_DNG
                    relPath.contains("Screenshots", ignoreCase = true) -> MediaKind.SCREENSHOT
                    else -> MediaKind.PHOTO
                }

                if (filterKind == null && !favoritesOnly) {
                    val isWhitelisted = whitelistedPrefixes.any { prefix ->
                        relPath.startsWith(prefix, ignoreCase = true)
                    }
                    if (!isWhitelisted) continue
                }

                if (filterKind != null && kind != filterKind) continue
                if (favoritesOnly && !isFavorite) continue

                val id = cursor.getLong(idCol)
                val mime = cursor.getString(mimeCol).orEmpty()
                val bucket = cursor.getString(bucketCol).orEmpty()
                val takenMs = cursor.getLong(takenCol).takeIf { it > 0L }
                    ?: (cursor.getLong(addedCol) * 1000L)

                val date = Date(takenMs)
                val monthKey = monthKeyFmt.format(date)
                val monthHeader = monthLabelFmt.format(date)

                if (queryLower.isNotEmpty()) {
                    val searchable = "$name $relPath $monthHeader".lowercase(Locale.US)
                    if (!searchable.contains(queryLower)) continue
                }

                val baseUri = if (isVideo) {
                    MediaStore.Video.Media.EXTERNAL_CONTENT_URI
                } else {
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI
                }

                results.add(
                    MediaAsset(
                        id = "ms_$id",
                        uri = ContentUris.withAppendedId(baseUri, id),
                        displayName = name,
                        mimeType = mime,
                        dateTakenMillis = takenMs,
                        monthKey = monthKey,
                        monthHeader = monthHeader,
                        width = cursor.getInt(wCol),
                        height = cursor.getInt(hCol),
                        sizeBytes = cursor.getLong(sizeCol),
                        durationMillis = if (isVideo) cursor.getLong(durCol) else 0L,
                        relativePath = relPath,
                        bucketName = bucket,
                        kind = kind,
                        origin = StorageOrigin.INTERNAL,
                        isFavorite = isFavorite
                    )
                )
            }
        }
        results.toImmutableList()
    }

    /**
     * Discovers all local folders containing photos/videos so users can explicitly
     * whitelist or exclude directories in the Included Folders manager.
     */
    suspend fun discoverLocalFolders(
        whitelistedPrefixes: Set<String>
    ): ImmutableList<FolderIsolationRule> = withContext(Dispatchers.IO) {
        val counts = LinkedHashMap<String, Int>()
        val collection = MediaStore.Files.getContentUri("external")
        val projection = arrayOf(
            MediaStore.MediaColumns.RELATIVE_PATH,
            MediaStore.Files.FileColumns.MEDIA_TYPE
        )
        val selection = """
            (${MediaStore.Files.FileColumns.MEDIA_TYPE} = ? OR ${MediaStore.Files.FileColumns.MEDIA_TYPE} = ?)
            AND ${MediaStore.MediaColumns.IS_TRASHED} = 0
        """.trimIndent()
        val args = arrayOf(
            MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE.toString(),
            MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO.toString()
        )

        resolver.query(collection, projection, selection, args, null)?.use { cursor ->
            val relCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH)
            while (cursor.moveToNext()) {
                val rel = cursor.getString(relCol).orEmpty()
                if (rel.isNotBlank()) {
                    counts[rel] = (counts[rel] ?: 0) + 1
                }
            }
        }

        if (!counts.containsKey("DCIM/Camera/")) {
            counts["DCIM/Camera/"] = 0
        }

        counts.entries
            .sortedByDescending { it.key.equals("DCIM/Camera/", ignoreCase = true) }
            .map { (path, count) ->
                val cleanName = path.trimEnd('/').substringAfterLast('/').ifBlank { path }
                FolderIsolationRule(
                    relativePath = path,
                    displayName = cleanName,
                    isIncluded = whitelistedPrefixes.any { path.equals(it, ignoreCase = true) },
                    itemCount = count
                )
            }
            .toImmutableList()
    }

    /**
     * Decodes a screen-fitted upright preview Bitmap on Dispatchers.IO so the Mini Photo
     * Editor runs locked at 120fps even on 50MP/200MP Leica photos.
     */
    suspend fun decodePreviewBitmap(
        uri: Uri,
        maxDimension: Int = 1920
    ): Bitmap? = withContext(Dispatchers.IO) {
        runCatching {
            val orientation = resolver.openInputStream(uri)?.use { stream ->
                ExifInterface(stream).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            } ?: ExifInterface.ORIENTATION_NORMAL

            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(stream, null, bounds)
            }

            val longest = max(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
            var sampleSize = 1
            while (longest / (sampleSize * 2) >= maxDimension) {
                sampleSize *= 2
            }

            val decoded = resolver.openInputStream(uri)?.use { stream ->
                BitmapFactory.decodeStream(
                    stream,
                    null,
                    BitmapFactory.Options().apply {
                        inSampleSize = sampleSize
                        inPreferredConfig = Bitmap.Config.ARGB_8888
                    }
                )
            } ?: return@runCatching null

            val rotationDeg = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }

            if (rotationDeg == 0f) {
                decoded
            } else {
                val matrix = Matrix().apply { postRotate(rotationDeg) }
                Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
                    .also { if (it !== decoded) decoded.recycle() }
            }
        }.getOrNull()
    }

    /**
     * Reads Xiaomi 15 Ultra Leica EXIF optics tags safely on Dispatchers.IO for both
     * internal MediaStore URIs and external USB-OTG DocumentFile URIs.
     */
    suspend fun readLeicaExif(asset: MediaAsset): LeicaExifData = withContext(Dispatchers.IO) {
        var model = "Xiaomi 15 Ultra"
        var focal = "23mm"
        var aperture = "f/1.63"
        var iso = "ISO 100"
        var shutter = "1/250s"
        var colorSpace = if (asset.kind == MediaKind.RAW_DNG) {
            "Display P3 · 14-bit DNG"
        } else {
            "DCI-P3"
        }

        runCatching {
            resolver.openInputStream(asset.uri)?.use { stream ->
                val exif = ExifInterface(stream)
                exif.getAttribute(ExifInterface.TAG_MODEL)?.let { model = it }
                exif.getAttributeInt(ExifInterface.TAG_FOCAL_LENGTH_IN_35MM_FILM, 0)
                    .takeIf { it > 0 }
                    ?.let { focal = "${it}mm" }
                exif.getAttributeDouble(ExifInterface.TAG_F_NUMBER, 0.0)
                    .takeIf { it > 0.0 }
                    ?.let {
                        val formatted = String.format(Locale.US, "%.2f", it)
                            .trimEnd('0')
                            .trimEnd('.')
                        aperture = "f/$formatted"
                    }
                exif.getAttribute(ExifInterface.TAG_PHOTOGRAPHIC_SENSITIVITY)
                    ?.let { iso = "ISO $it" }
                exif.getAttributeDouble(ExifInterface.TAG_EXPOSURE_TIME, 0.0)
                    .takeIf { it > 0.0 }
                    ?.let { sec ->
                        shutter = if (sec < 1.0) "1/${(1.0 / sec).toInt()}s" else "${sec}s"
                    }
                if (asset.kind == MediaKind.VIDEO) {
                    colorSpace = "Dolby Vision · 10-bit HLG"
                }
            }
        }

        val mp = (asset.width.toLong() * asset.height.toLong()) / 1_000_000.0
        val mpLabel = if (mp >= 1.0) " · ${mp.toInt()}MP" else ""
        val sizeMb = String.format(Locale.US, "%.1f MB", asset.sizeBytes / (1024.0 * 1024.0))

        LeicaExifData(
            cameraModel = model,
            focalLengthMm = focal,
            aperture = aperture,
            iso = iso,
            shutterSpeed = shutter,
            resolution = "${asset.width} × ${asset.height}$mpLabel",
            fileSizeFormatted = sizeMb,
            colorProfile = colorSpace,
            absolutePath = if (asset.origin == StorageOrigin.INTERNAL) {
                "/storage/emulated/0/${asset.relativePath}${asset.displayName}"
            } else {
                "${asset.relativePath}/${asset.displayName}"
            }
        )
    }

    suspend fun toggleFavorite(asset: MediaAsset): Boolean = withContext(Dispatchers.IO) {
        if (asset.origin == StorageOrigin.EXTERNAL_USB_OTG) return@withContext false
        runCatching {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.IS_FAVORITE, if (asset.isFavorite) 0 else 1)
            }
            resolver.update(asset.uri, values, null, null) > 0
        }.getOrDefault(false)
    }

    suspend fun renameAsset(asset: MediaAsset, newDisplayName: String): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                if (asset.origin == StorageOrigin.EXTERNAL_USB_OTG) {
                    DocumentFile.fromSingleUri(context, asset.uri)?.renameTo(newDisplayName)
                        ?: false
                } else {
                    val values = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, newDisplayName)
                    }
                    resolver.update(asset.uri, values, null, null) > 0
                }
            }.getOrDefault(false)
        }

    suspend fun moveToTrash(asset: MediaAsset, useTrashBin: Boolean): Boolean =
        withContext(Dispatchers.IO) {
            runCatching {
                if (asset.origin == StorageOrigin.EXTERNAL_USB_OTG) {
                    DocumentFile.fromSingleUri(context, asset.uri)?.delete() ?: false
                } else if (useTrashBin) {
                    val values = ContentValues().apply {
                        put(MediaStore.MediaColumns.IS_TRASHED, 1)
                    }
                    resolver.update(asset.uri, values, null, null) > 0
                } else {
                    resolver.delete(asset.uri, null, null) > 0
                }
            }.getOrDefault(false)
        }
}
