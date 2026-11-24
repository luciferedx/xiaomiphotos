package com.dispicapaul.photos.data

import android.content.ContentValues
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Matrix
import android.graphics.Rect
import android.net.Uri
import android.provider.MediaStore
import androidx.documentfile.provider.DocumentFile
import androidx.exifinterface.media.ExifInterface
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.OutputStream
import kotlin.math.roundToInt

class ImageTransformProcessor(private val context: Context) {

    /**
     * Applies exact Mirror + Rotation + Normalized Crop Rect onto the full-resolution
     * original image on Dispatchers.IO. Uses ExifInterface orientation normalization and
     * API 31+ BitmapRegionDecoder so 50MP/200MP Leica photos never trigger OutOfMemoryError.
     */
    suspend fun exportTransformed(
        asset: MediaAsset,
        spec: TransformSpec,
        overwriteOriginal: Boolean,
        externalTreeUri: Uri? = null
    ): Result<Uri> = withContext(Dispatchers.IO) {
        runCatching {
            val resolver = context.contentResolver

            val exifOrientation = resolver.openInputStream(asset.uri)?.use { stream ->
                ExifInterface(stream).getAttributeInt(
                    ExifInterface.TAG_ORIENTATION,
                    ExifInterface.ORIENTATION_NORMAL
                )
            } ?: ExifInterface.ORIENTATION_NORMAL

            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            resolver.openInputStream(asset.uri)?.use { stream ->
                BitmapFactory.decodeStream(stream, null, bounds)
            }

            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
                error("Unable to inspect image bounds for ${asset.displayName}")
            }

            val useRegionPath = spec.straightenDegrees == 0f &&
                exifOrientation == ExifInterface.ORIENTATION_NORMAL &&
                spec.rotation90Steps == 0 &&
                !spec.flipHorizontal &&
                !spec.flipVertical

            val sourceBitmap: Bitmap = if (useRegionPath) {
                resolver.openInputStream(asset.uri)?.use { stream ->
                    val decoder = BitmapRegionDecoder.newInstance(stream)
                        ?: error("Unable to create BitmapRegionDecoder")
                    val left = (spec.normalizedCrop.left * bounds.outWidth)
                        .roundToInt()
                        .coerceIn(0, bounds.outWidth - 1)
                    val top = (spec.normalizedCrop.top * bounds.outHeight)
                        .roundToInt()
                        .coerceIn(0, bounds.outHeight - 1)
                    val right = (spec.normalizedCrop.right * bounds.outWidth)
                        .roundToInt()
                        .coerceIn(left + 1, bounds.outWidth)
                    val bottom = (spec.normalizedCrop.bottom * bounds.outHeight)
                        .roundToInt()
                        .coerceIn(top + 1, bounds.outHeight)

                    try {
                        decoder.decodeRegion(
                            Rect(left, top, right, bottom),
                            BitmapFactory.Options().apply {
                                inPreferredConfig = Bitmap.Config.ARGB_8888
                            }
                        )
                    } finally {
                        decoder.recycle()
                    }
                } ?: error("Unable to open image stream")
            } else {
                // Safe working plane cap (~48MP) so 200MP HP9 captures transform without OOM
                val maxPixels = 48_000_000L
                val totalPixels = bounds.outWidth.toLong() * bounds.outHeight.toLong()
                var sampleSize = 1
                while ((totalPixels / (sampleSize.toLong() * sampleSize.toLong())) > maxPixels) {
                    sampleSize *= 2
                }

                val decoded = resolver.openInputStream(asset.uri)?.use { stream ->
                    BitmapFactory.decodeStream(
                        stream,
                        null,
                        BitmapFactory.Options().apply {
                            inSampleSize = sampleSize
                            inPreferredConfig = Bitmap.Config.ARGB_8888
                        }
                    )
                } ?: error("Unable to decode image bitmap")

                val matrix = Matrix().apply {
                    when (exifOrientation) {
                        ExifInterface.ORIENTATION_ROTATE_90 -> postRotate(90f)
                        ExifInterface.ORIENTATION_ROTATE_180 -> postRotate(180f)
                        ExifInterface.ORIENTATION_ROTATE_270 -> postRotate(270f)
                    }
                    if (spec.flipHorizontal || spec.flipVertical) {
                        postScale(
                            if (spec.flipHorizontal) -1f else 1f,
                            if (spec.flipVertical) -1f else 1f
                        )
                    }
                    val totalDeg = spec.rotation90Steps * 90f + spec.straightenDegrees
                    if (totalDeg != 0f) {
                        postRotate(totalDeg)
                    }
                }

                val rotated = Bitmap.createBitmap(
                    decoded,
                    0,
                    0,
                    decoded.width,
                    decoded.height,
                    matrix,
                    true
                )
                if (rotated !== decoded) decoded.recycle()

                val cropLeft = (spec.normalizedCrop.left * rotated.width)
                    .roundToInt()
                    .coerceIn(0, rotated.width - 1)
                val cropTop = (spec.normalizedCrop.top * rotated.height)
                    .roundToInt()
                    .coerceIn(0, rotated.height - 1)
                val cropWidth = ((spec.normalizedCrop.right - spec.normalizedCrop.left) * rotated.width)
                    .roundToInt()
                    .coerceIn(1, rotated.width - cropLeft)
                val cropHeight = ((spec.normalizedCrop.bottom - spec.normalizedCrop.top) * rotated.height)
                    .roundToInt()
                    .coerceIn(1, rotated.height - cropTop)

                Bitmap.createBitmap(rotated, cropLeft, cropTop, cropWidth, cropHeight).also {
                    if (it !== rotated) rotated.recycle()
                }
            }

            val outputUri = resolveOutputUri(asset, overwriteOriginal, externalTreeUri)
            try {
                resolver.openOutputStream(outputUri, "wt")?.use { out: OutputStream ->
                    sourceBitmap.compress(Bitmap.CompressFormat.JPEG, 96, out)
                    out.flush()
                } ?: error("Failed to open output stream for $outputUri")
            } finally {
                sourceBitmap.recycle()
            }

            outputUri
        }
    }

    private fun resolveOutputUri(
        asset: MediaAsset,
        overwriteOriginal: Boolean,
        externalTreeUri: Uri?
    ): Uri {
        if (overwriteOriginal) return asset.uri

        val base = asset.displayName.substringBeforeLast('.')
        val copyName = "${base}_edited.jpg"

        return if (asset.origin == StorageOrigin.EXTERNAL_USB_OTG && externalTreeUri != null) {
            val root = DocumentFile.fromTreeUri(context, externalTreeUri)
                ?: error("External USB-OTG drive is no longer mounted")
            root.createFile("image/jpeg", copyName)?.uri
                ?: error("Unable to create edited copy on external drive")
        } else {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, copyName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
                put(
                    MediaStore.Images.Media.RELATIVE_PATH,
                    asset.relativePath.ifBlank { "DCIM/Camera/" }
                )
            }
            context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: error("Failed to insert edited copy into MediaStore")
        }
    }
}
