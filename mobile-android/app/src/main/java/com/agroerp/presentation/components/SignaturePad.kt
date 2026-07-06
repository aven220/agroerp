package com.agroerp.presentation.components

import android.graphics.Bitmap
import android.graphics.Canvas as AndroidCanvas
import android.graphics.Paint
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp

@Stable
class SignaturePadState {
    val paths = mutableStateListOf<Path>()
    var activePath by mutableStateOf(Path())
        private set
    var hasInk by mutableStateOf(false)
        private set
    private var canvasWidth by mutableFloatStateOf(1f)
    private var canvasHeight by mutableFloatStateOf(1f)

    fun setCanvasSize(width: Float, height: Float) {
        canvasWidth = width.coerceAtLeast(1f)
        canvasHeight = height.coerceAtLeast(1f)
    }

    fun startStroke(offset: Offset) {
        activePath = Path().apply { moveTo(offset.x, offset.y) }
    }

    fun extendStroke(offset: Offset) {
        activePath.lineTo(offset.x, offset.y)
        hasInk = true
    }

    fun endStroke() {
        if (hasInk) {
            paths.add(activePath)
            activePath = Path()
        }
    }

    fun clear() {
        paths.clear()
        activePath = Path()
        hasInk = false
    }

    fun exportToBitmap(): Bitmap {
        val width = canvasWidth.toInt().coerceAtLeast(1)
        val height = canvasHeight.toInt().coerceAtLeast(1)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = AndroidCanvas(bitmap)
        canvas.drawColor(android.graphics.Color.WHITE)
        val paint = Paint().apply {
            color = android.graphics.Color.BLACK
            strokeWidth = 6f
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeJoin = Paint.Join.ROUND
            isAntiAlias = true
        }
        paths.forEach { path -> canvas.drawPath(path.asAndroidPath(), paint) }
        if (hasInk && paths.isEmpty()) {
            canvas.drawPath(activePath.asAndroidPath(), paint)
        }
        return bitmap
    }
}

@Composable
fun rememberSignaturePadState(): SignaturePadState = remember { SignaturePadState() }

@Composable
fun SignaturePad(
    state: SignaturePadState,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(180.dp)
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .onSizeChanged { size ->
                state.setCanvasSize(size.width.toFloat(), size.height.toFloat())
            }
            .pointerInput(state) {
                detectDragGestures(
                    onDragStart = { offset -> state.startStroke(offset) },
                    onDrag = { change, _ -> state.extendStroke(change.position) },
                    onDragEnd = { state.endStroke() },
                )
            },
    ) {
        val stroke = Stroke(width = 4f, cap = StrokeCap.Round, join = StrokeJoin.Round)
        state.paths.forEach { path ->
            drawPath(path, color = androidx.compose.ui.graphics.Color.Black, style = stroke)
        }
        drawPath(state.activePath, color = androidx.compose.ui.graphics.Color.Black, style = stroke)
    }
}

@Composable
fun SignaturePadActions(
    state: SignaturePadState,
    onClear: () -> Unit = { state.clear() },
) {
    OutlinedButton(onClick = onClear, enabled = state.hasInk) {
        Text("Limpiar firma")
    }
}
