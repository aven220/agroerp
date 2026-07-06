package com.agroerp.gis

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.os.Looper
import com.agroerp.domain.model.GpsPoint
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume

@Singleton
class LocationService @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val fusedClient = LocationServices.getFusedLocationProviderClient(context)

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(): GpsPoint? {
        return try {
            val location = fusedClient.lastLocation.await()
            location?.toGpsPoint() ?: requestFreshLocation()
        } catch (_: Exception) {
            requestFreshLocation()
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun requestFreshLocation(): GpsPoint? =
        suspendCancellableCoroutine { cont ->
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 1000L)
                .setWaitForAccurateLocation(true)
                .setMaxUpdates(1)
                .build()
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    fusedClient.removeLocationUpdates(this)
                    cont.resume(result.lastLocation?.toGpsPoint())
                }
            }
            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
            cont.invokeOnCancellation { fusedClient.removeLocationUpdates(callback) }
        }

    @SuppressLint("MissingPermission")
    fun locationUpdates(intervalMs: Long = 5000L): Flow<GpsPoint> = callbackFlow {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs / 2)
            .build()
        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.toGpsPoint()?.let { trySend(it) }
            }
        }
        fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
        awaitClose { fusedClient.removeLocationUpdates(callback) }
    }

    private fun Location.toGpsPoint(): GpsPoint = GpsPoint(
        lat = latitude,
        lng = longitude,
        accuracy = if (hasAccuracy()) accuracy else null,
        timestamp = time,
    )
}
