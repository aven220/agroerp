package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.CreateFieldLotRequest
import com.agroerp.prm.data.api.CreateFieldOperationRequest
import com.agroerp.prm.data.api.FieldLotBootstrapResponse
import com.agroerp.prm.data.api.FieldLotDto
import com.agroerp.prm.data.api.FieldLotSyncItem
import com.agroerp.prm.data.api.FieldLotSyncRequest
import com.agroerp.prm.data.api.FieldOperationSyncItem
import com.agroerp.prm.data.api.FmdtApi
import com.agroerp.prm.data.api.SetLotGeometryRequest
import com.agroerp.prm.data.db.FieldLotDao
import com.agroerp.prm.data.db.FieldLotEntity
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

class FieldLotRepository(
    context: Context,
    private val fieldLotDao: FieldLotDao,
    private val syncQueueDao: SyncQueueDao,
) {
    private val prefs = context.getSharedPreferences("agroerp_auth", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: FmdtApi by lazy {
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
            .create(FmdtApi::class.java)
    }

    fun observeLots(): Flow<List<FieldLotEntity>> = fieldLotDao.observeAll()

    suspend fun getLot(id: String): FieldLotEntity? = fieldLotDao.getById(id)

    private fun getToken(): String? = prefs.getString("token", null)

    private fun authHeader(): String {
        val token = getToken() ?: throw IllegalStateException("No auth token")
        return "Bearer $token"
    }

    suspend fun pullFromServer(): FieldLotBootstrapResponse {
        val response = api.bootstrap(authHeader())
        fieldLotDao.upsertAll(response.lots.map { it.toEntity("synced") })
        return response
    }

    suspend fun createOffline(
        request: CreateFieldLotRequest,
        photoPath: String? = null,
        videoPath: String? = null,
        signaturePath: String? = null,
        polygonPoints: List<Pair<Double, Double>>? = null,
    ): FieldLotEntity {
        val externalId = request.externalId ?: UUID.randomUUID().toString()
        val boundaryGeo = polygonPoints?.let { PolygonHelper.toGeoJson(it) }
        val areaHa = polygonPoints?.let { PolygonHelper.areaHectares(it) }

        val fullRequest = request.copy(
            externalId = externalId,
            boundaryGeoRef = boundaryGeo,
            totalAreaHa = areaHa ?: request.totalAreaHa,
            plantedAreaHa = areaHa ?: request.plantedAreaHa,
        )

        val entity = FieldLotEntity(
            id = externalId,
            externalId = externalId,
            ftipLotUnitId = request.ftipLotUnitId,
            farmUnitId = "",
            lotCode = "LOCAL-${externalId.take(8)}",
            lotName = request.lotName,
            lotTypeCode = request.lotTypeCode,
            primaryCropCode = request.primaryCropCode,
            latitude = request.centroidLatitude,
            longitude = request.centroidLongitude,
            totalAreaHa = areaHa ?: request.totalAreaHa,
            plantedAreaHa = areaHa ?: request.plantedAreaHa,
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
        fieldLotDao.upsert(entity)
        syncQueueDao.enqueue(
            SyncQueueEntity(
                externalId = externalId,
                entityType = "field_lot",
                operation = "CREATE",
                payloadJson = entity.payloadJson,
                status = "pending",
                createdAt = System.currentTimeMillis(),
            ),
        )
        return entity
    }

    suspend fun queueOperation(
        fieldLotId: String,
        request: CreateFieldOperationRequest,
    ) {
        val externalId = request.externalId ?: UUID.randomUUID().toString()
        val payload = gson.toJson(
            FieldOperationSyncItem(
                externalId = externalId,
                fieldLotId = fieldLotId,
                data = request.copy(externalId = externalId),
            ),
        )
        syncQueueDao.enqueue(
            SyncQueueEntity(
                externalId = externalId,
                entityType = "field_operation",
                operation = "CREATE",
                payloadJson = payload,
                status = "pending",
                createdAt = System.currentTimeMillis(),
            ),
        )
    }

    suspend fun pushPendingSync(): Int {
        val lotPending = syncQueueDao.getPending("field_lot")
        val opPending = syncQueueDao.getPending("field_operation")
        var processed = 0

        val createItems = lotPending
            .filter { it.operation == "CREATE" }
            .mapNotNull { item ->
                val data = gson.fromJson(item.payloadJson, CreateFieldLotRequest::class.java)
                FieldLotSyncItem(externalId = item.externalId, data = data)
            }

        if (createItems.isNotEmpty()) {
            val response = api.syncBatch(authHeader(), FieldLotSyncRequest(lots = createItems))
            for (result in response.results) {
                val queueItem = lotPending.find { it.externalId == result.externalId } ?: continue
                if (result.status == "created" || result.status == "duplicate") {
                    val local = fieldLotDao.getByExternalId(result.externalId)
                    if (local != null && result.fieldLotId != null) {
                        fieldLotDao.upsert(
                            local.copy(
                                id = result.fieldLotId,
                                syncStatus = "synced",
                            ),
                        )
                    }
                    syncQueueDao.update(queueItem.copy(status = "processed"))
                    processed++
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

        val operations = opPending.mapNotNull { item ->
            gson.fromJson(item.payloadJson, FieldOperationSyncItem::class.java)
        }
        if (operations.isNotEmpty()) {
            api.syncBatch(authHeader(), FieldLotSyncRequest(operations = operations))
            for (item in opPending) {
                syncQueueDao.update(item.copy(status = "processed"))
                processed++
            }
        }

        syncQueueDao.purgeProcessed()
        return processed
    }

    suspend fun uploadGeometry(lotId: String, points: List<Pair<Double, Double>>) {
        val geo = PolygonHelper.toGeoJson(points)
        api.setGeometry(lotId, SetLotGeometryRequest(applicationGeo = geo))
        val existing = fieldLotDao.getById(lotId)
        if (existing != null) {
            fieldLotDao.upsert(
                existing.copy(
                    boundaryGeoJson = gson.toJson(geo),
                    totalAreaHa = PolygonHelper.areaHectares(points),
                    plantedAreaHa = PolygonHelper.areaHectares(points),
                    updatedAt = System.currentTimeMillis(),
                ),
            )
        }
    }

    private fun FieldLotDto.toEntity(syncStatus: String) = FieldLotEntity(
        id = id,
        externalId = null,
        ftipLotUnitId = ftipLotUnitId,
        farmUnitId = farmUnitId,
        lotCode = lotCode,
        lotName = lotName,
        lotTypeCode = lotTypeCode,
        primaryCropCode = agronomicStates?.firstOrNull()?.primaryCropCode,
        latitude = centroidLatitude,
        longitude = centroidLongitude,
        totalAreaHa = totalAreaHa,
        plantedAreaHa = plantedAreaHa,
        status = status,
        photoPath = null,
        videoPath = null,
        signaturePath = null,
        boundaryGeoJson = boundaryGeoRef?.let { gson.toJson(it) },
        observations = observations,
        version = version,
        syncStatus = syncStatus,
        updatedAt = System.currentTimeMillis(),
        payloadJson = "{}",
    )
}
