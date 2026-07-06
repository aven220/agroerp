package com.agroerp.prm.location

import android.annotation.SuppressLint
import android.content.Context
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.tasks.await

data class GpsReading(
    val latitude: Double,
    val longitude: Double,
    val accuracyMeters: Float,
)

class GpsHelper(private val context: Context) {
    private val client = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(maxAccuracyM: Float = 50f): GpsReading {
        val location = client.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            CancellationTokenSource().token,
        ).await() ?: throw IllegalStateException("No GPS fix available")

        if (location.accuracy > maxAccuracyM) {
            throw IllegalStateException(
                "Precisión GPS insuficiente: ${location.accuracy}m (máx ${maxAccuracyM}m)",
            )
        }

        return GpsReading(
            latitude = location.latitude,
            longitude = location.longitude,
            accuracyMeters = location.accuracy,
        )
    }
}
