package com.agroerp.presentation.components

import android.graphics.Bitmap
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.RadioButton
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.agroerp.domain.model.GpsPoint
import com.agroerp.domain.model.RenderedField
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DynamicFormFields(
    fields: List<RenderedField>,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
    onCapturePhoto: (String, File) -> Unit,
    onCaptureSignature: (String, File) -> Unit,
    currentGps: GpsPoint?,
    onRequestGps: (() -> Unit)? = null,
    onButtonAction: ((String) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        fields.filter { it.visible }.forEach { rendered ->
            when (rendered.field.type) {
                "heading", "indicator" -> Text(
                    rendered.field.label,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(vertical = 4.dp),
                )
                "separator" -> Text("—", modifier = Modifier.padding(vertical = 8.dp))
                "button" -> ButtonFieldInput(rendered, onButtonAction)
                "textarea" -> TextFieldInput(rendered, values, onValueChange, multiline = true)
                "text", "barcode", "qrcode", "autocomplete" -> TextFieldInput(rendered, values, onValueChange)
                "number", "integer", "decimal", "currency" -> NumberFieldInput(rendered, values, onValueChange)
                "boolean" -> BooleanFieldInput(rendered, values, onValueChange)
                "checkbox" -> CheckboxFieldInput(rendered, values, onValueChange)
                "date" -> DateFieldInput(rendered, values, onValueChange)
                "datetime", "time" -> TextFieldInput(
                    rendered,
                    values,
                    onValueChange,
                    placeholder = if (rendered.field.type == "time") "HH:MM" else "AAAA-MM-DD HH:MM",
                )
                "select" -> SelectFieldInput(rendered, values, onValueChange)
                "radio" -> RadioFieldInput(rendered, values, onValueChange)
                "multi_select" -> MultiCheckboxFieldInput(rendered, values, onValueChange)
                "geo", "geo_point", "map" -> GeoFieldDisplay(
                    rendered,
                    values,
                    currentGps,
                    onValueChange,
                    onRequestGps,
                )
                "photo", "gallery", "file", "pdf" -> PhotoFieldInput(rendered, values, onCapturePhoto)
                "video", "audio" -> PhotoFieldInput(rendered, values, onCapturePhoto)
                "signature" -> SignatureFieldInput(rendered, values, onCaptureSignature)
                "calculated", "derived" -> CalculatedFieldDisplay(rendered)
                "rating", "scale", "likert", "emoji" -> RatingFieldInput(rendered, values, onValueChange)
                else -> TextFieldInput(rendered, values, onValueChange)
            }
        }
    }
}

@Composable
private fun TextFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
    multiline: Boolean = false,
    placeholder: String? = null,
) {
    OutlinedTextField(
        value = values[rendered.field.key]?.toString() ?: "",
        onValueChange = { onValueChange(rendered.field.key, it) },
        label = { Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "") },
        placeholder = placeholder?.let { { Text(it) } },
        modifier = Modifier.fillMaxWidth(),
        singleLine = !multiline && rendered.field.type != "textarea",
        minLines = if (multiline) 3 else 1,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    var showPicker by remember { mutableStateOf(false) }
    val value = values[rendered.field.key]?.toString() ?: ""

    OutlinedTextField(
        value = value,
        onValueChange = {},
        readOnly = true,
        label = { Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "") },
        placeholder = { Text("Toca para elegir fecha") },
        modifier = Modifier
            .fillMaxWidth()
            .clickable { showPicker = true },
    )

    if (showPicker) {
        val datePickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(
                    onClick = {
                        datePickerState.selectedDateMillis?.let { millis ->
                            val formatted = Instant.ofEpochMilli(millis)
                                .atZone(ZoneId.systemDefault())
                                .format(DateTimeFormatter.ISO_LOCAL_DATE)
                            onValueChange(rendered.field.key, formatted)
                        }
                        showPicker = false
                    },
                ) { Text("Aceptar") }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text("Cancelar") }
            },
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun ButtonFieldInput(
    rendered: RenderedField,
    onButtonAction: ((String) -> Unit)?,
) {
    val action = rendered.field.metadata?.get("action")?.toString() ?: "submit"
    Button(
        onClick = { onButtonAction?.invoke(action) },
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(rendered.field.label)
    }
}

@Composable
private fun RatingFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    val current = (values[rendered.field.key] as? Number)?.toInt() ?: 3
    Column(Modifier.fillMaxWidth()) {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 4.dp)) {
            (1..5).forEach { n ->
                Button(onClick = { onValueChange(rendered.field.key, n) }) {
                    Text(if (n <= current) "★" else "☆")
                }
            }
        }
    }
}

@Composable
private fun NumberFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    OutlinedTextField(
        value = values[rendered.field.key]?.toString() ?: "",
        onValueChange = { onValueChange(rendered.field.key, it.toDoubleOrNull() ?: it) },
        label = { Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "") },
        modifier = Modifier.fillMaxWidth(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        singleLine = true,
    )
}

@Composable
private fun BooleanFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(rendered.field.label, modifier = Modifier.weight(1f))
        Switch(
            checked = values[rendered.field.key] as? Boolean ?: false,
            onCheckedChange = { onValueChange(rendered.field.key, it) },
        )
    }
}

@Composable
private fun CheckboxFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    val options = rendered.field.options
    if (options.isEmpty()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(
                checked = values[rendered.field.key] as? Boolean ?: false,
                onCheckedChange = { onValueChange(rendered.field.key, it) },
            )
            Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        }
        return
    }
    MultiCheckboxFieldInput(rendered, values, onValueChange)
}

@Composable
private fun MultiCheckboxFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    val selected = (values[rendered.field.key] as? List<*>)?.map { it.toString() }?.toSet() ?: emptySet()
    Column(Modifier.fillMaxWidth()) {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        if (rendered.field.options.isEmpty()) {
            Text(
                "Configure las opciones en el diseñador web.",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
        } else {
            rendered.field.options.forEach { option ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Checkbox(
                        checked = selected.contains(option.value),
                        onCheckedChange = { checked ->
                            val next = if (checked) {
                                selected + option.value
                            } else {
                                selected - option.value
                            }
                            onValueChange(rendered.field.key, next.toList())
                        },
                    )
                    Text(option.label)
                }
            }
        }
    }
}

@Composable
private fun RadioFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    val selected = values[rendered.field.key]?.toString() ?: ""
    Column(Modifier.fillMaxWidth()) {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        rendered.field.options.forEach { option ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
            ) {
                RadioButton(
                    selected = selected == option.value,
                    onClick = { onValueChange(rendered.field.key, option.value) },
                )
                Text(option.label)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onValueChange: (String, Any?) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = values[rendered.field.key]?.toString() ?: ""

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = rendered.field.options.find { it.value == selected }?.label ?: selected,
            onValueChange = {},
            readOnly = true,
            label = { Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier.menuAnchor().fillMaxWidth(),
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            rendered.field.options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onValueChange(rendered.field.key, option.value)
                        expanded = false
                    },
                )
            }
        }
    }
}

@Composable
private fun GeoFieldDisplay(
    rendered: RenderedField,
    values: Map<String, Any?>,
    currentGps: GpsPoint?,
    onValueChange: (String, Any?) -> Unit,
    onRequestGps: (() -> Unit)?,
) {
    val stored = values[rendered.field.key] as? Map<*, *>
    val gps = currentGps ?: stored?.let {
        val lat = (it["lat"] as? Number)?.toDouble()
        val lng = (it["lng"] as? Number)?.toDouble()
        if (lat != null && lng != null) {
            GpsPoint(lat, lng, (it["accuracy"] as? Number)?.toFloat())
        } else {
            null
        }
    }

    LaunchedEffect(currentGps) {
        if (currentGps != null) {
            onValueChange(
                rendered.field.key,
                mapOf(
                    "lat" to currentGps.lat,
                    "lng" to currentGps.lng,
                    "accuracy" to currentGps.accuracy,
                ),
            )
        }
    }

    Column(Modifier.fillMaxWidth()) {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        if (gps != null) {
            Text(
                "Lat: ${"%.6f".format(gps.lat)}, Lng: ${"%.6f".format(gps.lng)}",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
            gps.accuracy?.let {
                Text("Precisión: ${it}m", style = MaterialTheme.typography.bodySmall)
            }
        } else {
            Text("Sin ubicación GPS", style = MaterialTheme.typography.bodySmall)
            OutlinedButton(
                onClick = { onRequestGps?.invoke() },
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Text("Obtener ubicación GPS")
            }
        }
    }
}

@Composable
private fun PhotoFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onCapturePhoto: (String, File) -> Unit,
) {
    val context = LocalContext.current
    var photoFile by remember { mutableStateOf<File?>(null) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success && photoFile != null) {
            onCapturePhoto(rendered.field.key, photoFile!!)
        }
    }

    Column {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        val captured = values[rendered.field.key]?.toString()
        if (captured != null) {
            Text("Foto capturada: $captured", style = MaterialTheme.typography.bodySmall)
        }
        Button(
            onClick = {
                val file = File(context.cacheDir, "photo_${System.currentTimeMillis()}.jpg")
                photoFile = file
                val uri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    file,
                )
                launcher.launch(uri)
            },
            modifier = Modifier.padding(top = 4.dp),
        ) {
            Text("Tomar foto")
        }
    }
}

@Composable
private fun SignatureFieldInput(
    rendered: RenderedField,
    values: Map<String, Any?>,
    onCaptureSignature: (String, File) -> Unit,
) {
    val context = LocalContext.current
    val padState = rememberSignaturePadState()
    var saved by remember { mutableStateOf(values[rendered.field.key]?.toString()) }

    Column {
        Text(rendered.field.label + if (rendered.effectiveRequired) " *" else "")
        SignaturePad(state = padState, modifier = Modifier.padding(vertical = 8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SignaturePadActions(state = padState)
            Button(
                onClick = {
                    if (!padState.hasInk) return@Button
                    val file = File(context.cacheDir, "signature_${System.currentTimeMillis()}.png")
                    val bitmap = padState.exportToBitmap()
                    FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 90, it) }
                    saved = file.name
                    onCaptureSignature(rendered.field.key, file)
                },
                enabled = padState.hasInk,
            ) {
                Text(if (saved != null) "Firma guardada" else "Guardar firma")
            }
        }
    }
}

@Composable
private fun CalculatedFieldDisplay(rendered: RenderedField) {
    Column(Modifier.fillMaxWidth()) {
        Text(rendered.field.label, style = MaterialTheme.typography.labelLarge)
        Text(
            rendered.computedValue?.toString() ?: "—",
            style = MaterialTheme.typography.bodyLarge,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
