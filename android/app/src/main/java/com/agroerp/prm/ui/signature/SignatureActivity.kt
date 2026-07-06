package com.agroerp.prm.ui.signature

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.agroerp.prm.databinding.ActivitySignatureBinding
import java.io.File
import java.io.FileOutputStream

class SignatureView(context: android.content.Context) : View(context) {
    private val paint = android.graphics.Paint().apply {
        color = android.graphics.Color.BLACK
        strokeWidth = 5f
        style = android.graphics.Paint.Style.STROKE
        isAntiAlias = true
    }
    private val path = android.graphics.Path()
    private var lastX = 0f
    private var lastY = 0f

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                path.moveTo(event.x, event.y)
                lastX = event.x
                lastY = event.y
            }
            MotionEvent.ACTION_MOVE -> {
                path.quadTo(lastX, lastY, (event.x + lastX) / 2, (event.y + lastY) / 2)
                lastX = event.x
                lastY = event.y
            }
        }
        invalidate()
        return true
    }

    override fun onDraw(canvas: android.graphics.Canvas) {
        canvas.drawPath(path, paint)
    }

    fun clear() {
        path.reset()
        invalidate()
    }

    fun exportBitmap(): Bitmap {
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(1), height.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = android.graphics.Canvas(bitmap)
        canvas.drawColor(android.graphics.Color.WHITE)
        draw(canvas)
        return bitmap
    }
}

class SignatureActivity : AppCompatActivity() {
    private lateinit var binding: ActivitySignatureBinding
    private lateinit var signatureView: SignatureView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignatureBinding.inflate(layoutInflater)
        setContentView(binding.root)

        signatureView = SignatureView(this)
        binding.signatureContainer.addView(signatureView)

        binding.btnClear.setOnClickListener { signatureView.clear() }
        binding.btnSave.setOnClickListener {
            val file = File(cacheDir, "signature_${System.currentTimeMillis()}.png")
            FileOutputStream(file).use { out ->
                signatureView.exportBitmap().compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_PATH, file.absolutePath))
            finish()
        }
    }

    companion object {
        const val EXTRA_PATH = "signature_path"
    }
}
