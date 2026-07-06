package com.agroerp.prm.geometry

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

object PolygonHelper {
    private const val EARTH_RADIUS_M = 6_371_000.0

    fun toGeoJson(points: List<Pair<Double, Double>>): Map<String, Any> {
        val ring = points.map { listOf(it.second, it.first) } + listOf(
            listOf(points.first().second, points.first().first),
        )
        return mapOf(
            "type" to "Polygon",
            "coordinates" to listOf(ring),
        )
    }

    fun areaHectares(points: List<Pair<Double, Double>>): Double {
        if (points.size < 3) return 0.0
        val refLat = Math.toRadians(points.first().first)
        val refLng = Math.toRadians(points.first().second)
        val projected = points.map { (lat, lng) ->
            val dLat = Math.toRadians(lat) - refLat
            val dLng = Math.toRadians(lng) - refLng
            val x = dLng * cos(refLat) * EARTH_RADIUS_M
            val y = dLat * EARTH_RADIUS_M
            x to y
        }
        var area = 0.0
        for (i in projected.indices) {
            val j = (i + 1) % projected.size
            area += projected[i].first * projected[j].second
            area -= projected[j].first * projected[i].second
        }
        return abs(area) / 2.0 / 10_000.0
    }

    fun distanceMeters(a: Pair<Double, Double>, b: Pair<Double, Double>): Double {
        val lat1 = Math.toRadians(a.first)
        val lat2 = Math.toRadians(b.first)
        val dLat = lat2 - lat1
        val dLng = Math.toRadians(b.second - a.second)
        val h = sin(dLat / 2) * sin(dLat / 2) +
            cos(lat1) * cos(lat2) * sin(dLng / 2) * sin(dLng / 2)
        return 2 * EARTH_RADIUS_M * sqrt(h)
    }
}
