package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.CreateFarmRequest
import com.agroerp.prm.data.api.FarmBootstrapResponse
import com.agroerp.prm.data.api.FarmDto
import com.agroerp.prm.data.api.FarmSyncItem
import com.agroerp.prm.data.api.FarmSyncRequest
import com.agroerp.prm.data.api.FtipApi
import com.agroerp.prm.data.api.SetGeometryRequest
import com.agroerp.prm.data.db.FarmDao
import com.agroerp.prm.data.db.FarmEntity
import com.agroerp.prm.data.db.SyncQueueDao
import com.agroerp.prm.data.db.SyncQueueEntity
import com.agroerp.prm.geometry.PolygonHelper
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class FarmRepository(
    context: Context,
    private val farmDao: FarmDao,
    private val syncQueueDao: SyncQueueDao,
) {
    private val prefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: FtipApi by lazy {
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
            .create(FtipApi::class.java)
    }

    fun observeFarms(): Flow<List<FarmEntity>> = farmDao.observeAll()

    suspend fun getFarm(id: String): FarmEntity? = farmDao.getById(id)

    private fun getToken(): String? = prefs.getString("token", null)

    private fun authHeader(): String {
        val token = getToken() ?: throw IllegalStateException("No auth token")
        return "Bearer $token"
    }

    suspend fun pullFromServer(): FarmBootstrapResponse {
        val response = api.bootstrap(authHeader())
        farmDao.upsertAll(response.farms.map { it.toEntity("synced") })
        return response
    }

    suspend fun createOffline(
        request: CreateFarmRequest,
        photoPath: String? = null,
        videoPath: String? = null,
        signaturePath: String? = null,
        polygonPoints: List<Pair<Double, Double>>? = null,
    ): FarmEntity {
        val externalId = request.externalId ?: UUID.randomUUID().toString()
        val boundaryGeo = polygonPoints?.let { PolygonHelper.toGeoJson(it) }
        val areaHa = polygonPoints?.let { PolygonHelper.areaHectares(it) }

        val fullRequest = request.copy(
            externalId = externalId,
            boundaryGeo = boundaryGeo,
            totalAreaHa = areaHa ?: request.totalAreaHa,
        )

        val entity = FarmEntity(
            id = externalId,
            externalId = externalId,
            farmCode = "LOCAL-${externalId.take(8)}",
            farmName = request.farmName,
            farmTypeCode = request.farmTypeCode,
            municipalityCode = request.municipalityCode,
            veredaCode = request.veredaCode,
            latitude = request.centroidLatitude,
            longitude = request.centroidLongitude,
            totalAreaHa = areaHa ?: request.totalAreaHa,
            status = "draft",
            photoPath = photoPath,
            videoPath = videoPath,
            signaturePath = signaturePath,
            boundaryGeoJson = boundaryGeo?.let { gson.toJson(it) },
            observations = request.observations,
            version = 1,
            syncStatus = "pending",
            updatedAt = System.currentTimeMillis(),
            payloadJson = gson.toJson(fullRequest),
        )
        farmDao.upsert(entity)
        syncQueueDao.enqueue(
            SyncQueueEntity(
                externalId = externalId,
                entityType = "farm",
                operation = "CREATE",
                payloadJson = entity.payloadJson,
                status = "pending",
                createdAt = System.currentTimeMillis(),
            ),
        )
        return entity
    }

    suspend fun pushPendingSync(): Int {
        val pending = syncQueueDao.getPending("farm")
        if (pending.isEmpty()) return 0

        val createItems = pending
            .filter { it.operation == "CREATE" }
            .mapNotNull { item ->
                val data = gson.fromJson(item.payloadJson, CreateFarmRequest::class.java)
                FarmSyncItem(
                    externalId = item.externalId,
                    data = data,
                    boundaryGeo = data.boundaryGeo,
                )
            }

        if (createItems.isNotEmpty()) {
            val response = api.syncBatch(authHeader(), FarmSyncRequest(createItems))
            for (result in response.results) {
                val queueItem = pending.find { it.externalId == result.externalId } ?: continue
                if (result.status == "created" || result.status == "duplicate") {
                    val local = farmDao.getByExternalId(result.externalId)
                    if (local != null && result.farmId != null) {
                        farmDao.upsert(
                            local.copy(
                                id = result.farmId,
                                syncStatus = "synced",
                            ),
                        )
                    }
                    syncQueueDao.update(queueItem.copy(status = "processed"))
                } else {
                    syncQueueDao.update(
                        queueItem.copy(
                            status = "failed",
                            retryCount = queueItem.retryCount + 1,
                            lastError = result.error,
                        ),
                    )
                }
            }
        }
        syncQueueDao.purgeProcessed()
        return createItems.size
    }

    suspend fun uploadGeometry(farmId: String, points: List<Pair<Double, Double>>) {
        val geo = PolygonHelper.toGeoJson(points)
        api.setGeometry(farmId, SetGeometryRequest(geometryGeo = geo))
        val existing = farmDao.getById(farmId)
        if (existing != null) {
            farmDao.upsert(
                existing.copy(
                    boundaryGeoJson = gson.toJson(geo),
                    totalAreaHa = PolygonHelper.areaHectares(points),
                    updatedAt = System.currentTimeMillis(),
                ),
            )
        }
    }

    private fun FarmDto.toEntity(syncStatus: String) = FarmEntity(
        id = id,
        externalId = null,
        farmCode = farmCode,
        farmName = farmName,
        farmTypeCode = farmTypeCode,
        municipalityCode = municipalityCode,
        veredaCode = veredaCode,
        latitude = centroidLatitude,
        longitude = centroidLongitude,
        totalAreaHa = totalAreaHa,
        status = status,
        photoPath = null,
        videoPath = null,
        signaturePath = null,
        boundaryGeoJson = boundaryGeo?.let { gson.toJson(it) },
        observations = observations,
        version = version,
        syncStatus = syncStatus,
        updatedAt = System.currentTimeMillis(),
        payloadJson = "{}",
    )
}
