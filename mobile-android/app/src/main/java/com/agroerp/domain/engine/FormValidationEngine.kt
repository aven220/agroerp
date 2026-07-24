package com.agroerp.domain.engine

import com.agroerp.domain.model.FormField
import com.agroerp.domain.model.FormSchema
import com.agroerp.domain.model.GpsPoint
import javax.inject.Inject
import javax.inject.Singleton

class FormValidationException(
    val errors: List<String>,
) : Exception(errors.joinToString("; "))

@Singleton
class FormValidationEngine @Inject constructor(
    private val conditional: ConditionalLogicEngine,
    private val calculated: CalculatedFieldEngine,
) {

    companion object {
        private val LAYOUT_TYPES = setOf(
            "heading", "separator", "html", "markdown", "hyperlink",
            "button", "indicator", "hidden",
        )
        private val GEO_TYPES = setOf("geo", "geo_point", "map")
    }

    fun validate(
        schema: FormSchema,
        rawData: Map<String, Any?>,
        gpsLocation: GpsPoint? = null,
    ): Map<String, Any?> {
        val withCalculated = calculated.resolve(schema.fields, rawData)
        val validated = mutableMapOf<String, Any?>()
        val errors = mutableListOf<String>()

        if (schema.settings.requireGps && gpsLocation == null) {
            errors.add("Se requiere ubicación GPS para este formulario")
        }

        schema.settings.geofence?.let { fence ->
            if (gpsLocation != null) {
                val center = fence["center"] as? Map<*, *>
                val radius = (fence["radiusMeters"] as? Number)?.toDouble()
                if (center != null && radius != null) {
                    val lat = (center["lat"] as? Number)?.toDouble() ?: return@let
                    val lng = (center["lng"] as? Number)?.toDouble() ?: return@let
                    val distance = haversineMeters(gpsLocation.lat, gpsLocation.lng, lat, lng)
                    if (distance > radius) {
                        errors.add("La ubicación GPS está fuera del área permitida")
                    }
                }
            }
        }

        for (field in schema.fields) {
            if (field.type in LAYOUT_TYPES) continue
            if (field.type == "calculated" || field.type == "derived") continue
            if (!conditional.isVisible(field.visibleWhen, withCalculated)) continue

            val required = conditional.isRequired(
                field.required,
                field.requiredWhen,
                withCalculated,
            )
            val value = withCalculated[field.key]
            val hasValue = value != null && value != ""

            if (required && !hasValue) {
                errors.add("El campo \"${field.label}\" es obligatorio")
                continue
            }
            if (!hasValue) continue

            try {
                validated[field.key] = validateField(field, value)
            } catch (e: Exception) {
                errors.add(e.message ?: "Invalid field ${field.key}")
            }
        }

        if (errors.isNotEmpty()) throw FormValidationException(errors)
        return validated
    }

    private fun validateField(field: FormField, value: Any?): Any? = when (field.type) {
        "text", "barcode" -> validateText(field, value)
        "number" -> validateNumber(field, value)
        "boolean" -> validateBoolean(value)
        "checkbox" -> {
            if (field.options.isNotEmpty()) validateMultiSelect(field, value)
            else validateBoolean(value)
        }
        "radio", "select" -> validateSelect(field, value)
        "multi_select" -> validateMultiSelect(field, value)
        "date", "datetime", "time" -> value.toString()
        in GEO_TYPES -> validateGeo(field, value)
        "geo_track" -> validateGeoTrack(value)
        "photo", "video", "audio", "signature", "file" -> validateMediaRef(value)
        "relation" -> value.toString()
        else -> value
    }

    private fun validateText(field: FormField, value: Any?): String {
        val str = value.toString()
        val v = field.validation
        v?.get("minLength")?.let {
            if (str.length < (it as Number).toInt()) {
                throw IllegalArgumentException("Min length ${it.toInt()}")
            }
        }
        v?.get("maxLength")?.let {
            if (str.length > (it as Number).toInt()) {
                throw IllegalArgumentException("Max length ${it.toInt()}")
            }
        }
        v?.get("pattern")?.let {
            if (!Regex(it.toString()).matches(str)) {
                throw IllegalArgumentException("Pattern mismatch")
            }
        }
        return str
    }

    private fun validateNumber(field: FormField, value: Any?): Double {
        val num = (value as? Number)?.toDouble() ?: value.toString().toDoubleOrNull()
            ?: throw IllegalArgumentException("Must be a number")
        field.validation?.get("min")?.let {
            if (num < (it as Number).toDouble()) throw IllegalArgumentException("Below min")
        }
        field.validation?.get("max")?.let {
            if (num > (it as Number).toDouble()) throw IllegalArgumentException("Above max")
        }
        return num
    }

    private fun validateBoolean(value: Any?): Boolean = when (value) {
        is Boolean -> value
        "true" -> true
        "false" -> false
        else -> throw IllegalArgumentException("Must be boolean")
    }

    private fun validateSelect(field: FormField, value: Any?): String {
        val str = value.toString()
        val allowed = field.options.map { it.value }
        if (allowed.isNotEmpty() && str !in allowed) {
            throw IllegalArgumentException("Opción no válida para ${field.label}")
        }
        return str
    }

    private fun validateMultiSelect(field: FormField, value: Any?): List<String> {
        val list = value as? List<*> ?: throw IllegalArgumentException("Debe seleccionar al menos una opción")
        val allowed = field.options.map { it.value }.toSet()
        return list.map { item ->
            val str = item.toString()
            if (allowed.isNotEmpty() && str !in allowed) {
                throw IllegalArgumentException("Opción no válida: $str")
            }
            str
        }
    }

    private fun validateGeo(field: FormField, value: Any?): Map<String, Any?> {
        val map = value as? Map<*, *> ?: throw IllegalArgumentException("Must be geo object")
        val lat = (map["lat"] as? Number)?.toDouble() ?: throw IllegalArgumentException("Invalid lat")
        val lng = (map["lng"] as? Number)?.toDouble() ?: throw IllegalArgumentException("Invalid lng")
        val result = mutableMapOf<String, Any?>("lat" to lat, "lng" to lng)
        val accuracy = (map["accuracy"] as? Number)?.toFloat()
        if (accuracy != null) {
            result["accuracy"] = accuracy
            val maxAcc = (field.validation?.get("maxAccuracyMeters") as? Number)?.toDouble()
            // Advisory only: outdoor GPS often exceeds studio thresholds; still store the value.
            if (maxAcc != null && accuracy > maxAcc) {
                // do not block local submit — server accepts coordinates
            }
        }
        return result
    }

    private fun validateGeoTrack(value: Any?): List<Map<String, Any?>> {
        val list = value as? List<*> ?: throw IllegalArgumentException("Track must be array")
        if (list.isEmpty()) throw IllegalArgumentException("Track cannot be empty")
        return list.map { validateGeo(FormField(key = "t", type = "geo", label = ""), it) }
    }

    private fun validateMediaRef(value: Any?): Any {
        val uuidRegex = Regex(
            """^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$""",
            RegexOption.IGNORE_CASE,
        )
        if (value is List<*>) {
            return value.map {
                val id = it.toString()
                if (!uuidRegex.matches(id)) throw IllegalArgumentException("Invalid media id")
                id
            }
        }
        val id = value.toString()
        if (!uuidRegex.matches(id)) throw IllegalArgumentException("Invalid media id")
        return id
    }

    private fun haversineMeters(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val r = 6371000.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
        return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }
}
