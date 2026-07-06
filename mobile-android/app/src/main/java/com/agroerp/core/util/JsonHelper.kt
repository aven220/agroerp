package com.agroerp.core.util

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.reflect.TypeToken

object JsonHelper {
    val gson: Gson = GsonBuilder().serializeNulls().create()

    inline fun <reified T> fromJson(json: String): T =
        gson.fromJson(json, object : TypeToken<T>() {}.type)

    fun toJson(value: Any?): String = gson.toJson(value)

    fun toMap(value: Any?): Map<String, Any?> {
        if (value == null) return emptyMap()
        val json = gson.toJson(value)
        return fromJson<Map<String, Any?>>(json)
    }
}
