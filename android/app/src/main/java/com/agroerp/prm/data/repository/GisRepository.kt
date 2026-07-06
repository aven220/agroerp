package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.GisApi
import com.agroerp.prm.data.api.GisCaptureItem
import com.agroerp.prm.data.api.GisMobileSyncRequest
import com.agroerp.prm.data.api.GisMobileSyncResponse
import com.agroerp.prm.data.api.GisTrackBatch
import com.agroerp.prm.data.api.GisTrackPoint
import com.agroerp.prm.geometry.PolygonHelper
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.time.Instant

class GisRepository(context: Context) {
    private val prefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)
    private val gisPrefs = context.getSharedPreferences("agroerp_gis", Context.MODE_PRIVATE)

    private val api: GisApi by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            })
            .build()
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(GisApi::class.java)
    }

    private fun token(): String {
        val t = prefs.getString("token", null) ?: error("No autenticado")
        return "Bearer $t"
    }

    suspend fun syncMobile(
        trackPoints: List<Pair<Double, Double>> = emptyList(),
        polygon: List<Pair<Double, Double>>? = null,
        line: List<Pair<Double, Double>>? = null,
        point: Pair<Double, Double>? = null,
        expectedLotId: String? = null,
    ): GisMobileSyncResponse {
        val tracks = if (trackPoints.isNotEmpty()) {
            listOf(
                GisTrackBatch(
                    points = trackPoints.map {
                        GisTrackPoint(
                            lat = it.first,
                            lng = it.second,
                            capturedAt = Instant.now().toString(),
                        )
                    },
                    expectedLotId = expectedLotId,
                ),
            )
        } else {
            null
        }

        val captures = buildList {
            polygon?.takeIf { it.size >= 3 }?.let { pts ->
                add(
                    GisCaptureItem(
                        captureType = "polygon",
                        geometry = PolygonHelper.toGeoJson(pts),
                        capturedAt = Instant.now().toString(),
                    ),
                )
            }
            line?.takeIf { it.size >= 2 }?.let { pts ->
                val coords = pts.map { listOf(it.second, it.first) }
                add(
                    GisCaptureItem(
                        captureType = "line",
                        geometry = mapOf("type" to "LineString", "coordinates" to coords),
                        capturedAt = Instant.now().toString(),
                    ),
                )
            }
            point?.let { (lat, lng) ->
                add(
                    GisCaptureItem(
                        captureType = "point",
                        geometry = mapOf("type" to "Point", "coordinates" to listOf(lng, lat)),
                        capturedAt = Instant.now().toString(),
                    ),
                )
            }
        }.ifEmpty { null }

        val response = api.mobileSync(
            token(),
            GisMobileSyncRequest(
                tracks = tracks,
                captures = captures,
                layerRefresh = true,
            ),
        )

        gisPrefs.edit()
            .putString("last_sync", response.syncedAt)
            .putInt("layer_count", response.layers.size)
            .apply()

        return response
    }

    fun getOfflineBasemaps(): List<String> =
        gisPrefs.getStringSet("offline_basemaps", emptySet())?.toList() ?: emptyList()

    fun cacheOfflineBasemap(code: String) {
        val current = gisPrefs.getStringSet("offline_basemaps", mutableSetOf())?.toMutableSet()
            ?: mutableSetOf()
        current.add(code)
        gisPrefs.edit().putStringSet("offline_basemaps", current).apply()
    }
}
