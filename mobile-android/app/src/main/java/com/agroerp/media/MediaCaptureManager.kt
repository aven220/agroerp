package com.agroerp.media

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MediaCaptureManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val mediaRoot: File
        get() = File(context.filesDir, "media").also { it.mkdirs() }

    fun createPhotoFile(): File = createFile("photos", "jpg")
    fun createVideoFile(): File = createFile("videos", "mp4")
    fun createAudioFile(): File = createFile("audio", "m4a")
    fun createSignatureFile(): File = createFile("signatures", "png")

    private fun createFile(subdir: String, extension: String): File {
        val dir = File(mediaRoot, subdir).also { it.mkdirs() }
        val timestamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())
        return File(dir, "AGRO_${timestamp}_${UUID.randomUUID()}.${extension}")
    }
}

@Singleton
class MediaCompressor @Inject constructor() {

    fun compressImage(source: File, maxDimension: Int = 1920, quality: Int = 80): File {
        if (!source.exists()) return source
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(source.absolutePath, options)
        val scale = calculateScale(options.outWidth, options.outHeight, maxDimension)
        val decodeOptions = BitmapFactory.Options().apply { inSampleSize = scale }
        val bitmap = BitmapFactory.decodeFile(source.absolutePath, decodeOptions) ?: return source

        val output = File(source.parent, "compressed_${source.name}")
        FileOutputStream(output).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
        }
        bitmap.recycle()
        if (output.length() < source.length()) {
            source.delete()
            output.renameTo(source)
            return source
        }
        output.delete()
        return source
    }

    private fun calculateScale(width: Int, height: Int, maxDimension: Int): Int {
        var scale = 1
        var w = width
        var h = height
        while (w / scale > maxDimension || h / scale > maxDimension) {
            scale *= 2
        }
        return scale
    }
}
