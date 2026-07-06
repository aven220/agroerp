package com.agroerp.prm.data.api

import com.google.gson.annotations.SerializedName
import retrofit2.http.GET
import retrofit2.http.Header

data class IotDeviceMobileDto(
    @SerializedName("deviceKey") val deviceKey: String,
    val name: String,
    @SerializedName("deviceType") val deviceType: String,
    val protocol: String,
    @SerializedName("batteryLevel") val batteryLevel: Int?,
    @SerializedName("lastSeenAt") val lastSeenAt: String?,
)

data class IotMobileDevicesResponse(
    val devices: List<IotDeviceMobileDto>,
    @SerializedName("syncedAt") val syncedAt: String,
)

data class IotTelemetryMobileDto(
    @SerializedName("deviceKey") val deviceKey: String,
    @SerializedName("metricKey") val metricKey: String,
    val value: Double?,
    @SerializedName("valueText") val valueText: String?,
    val unit: String?,
    @SerializedName("recordedAt") val recordedAt: String,
)

interface IotApi {
    @GET("eiesdp/mobile/devices")
    suspend fun mobileDevices(@Header("Authorization") authorization: String): IotMobileDevicesResponse

    @GET("eiesdp/mobile/telemetry")
    suspend fun mobileTelemetry(@Header("Authorization") authorization: String): List<IotTelemetryMobileDto>
}
