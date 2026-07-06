package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.data.api.BootstrapResponse
import com.agroerp.prm.data.api.CreateProducerRequest
import com.agroerp.prm.data.api.PrmApi
import com.agroerp.prm.data.api.ProducerDto
import com.agroerp.prm.data.api.SyncItem
import com.agroerp.prm.data.api.SyncRequest
import com.agroerp.prm.data.db.ProducerDao
import com.agroerp.prm.data.db.ProducerEntity
import com.agroerp.prm.data.db.SyncQueueDao
import com.agroerp.prm.data.db.SyncQueueEntity
import com.google.gson.Gson
import kotlinx.coroutines.flow.Flow
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.network.AuthHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID

class ProducerRepository(
    private val context: Context,
    private val producerDao: ProducerDao,
    private val syncQueueDao: SyncQueueDao,
) {
    private val appContext = context.applicationContext
    private val gson = Gson()

    private val api: PrmApi by lazy {
        val client = AuthHttpClient.create(appContext)
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PrmApi::class.java)
    }

    fun observeProducers(): Flow<List<ProducerEntity>> = producerDao.observeAll()

    suspend fun getProducer(id: String): ProducerEntity? = producerDao.getById(id)

    fun getToken(): String? = AuthTokenStore.getAccessToken(appContext)

    fun saveToken(token: String) {
        val refresh = AuthTokenStore.getRefreshToken(appContext) ?: ""
        AuthTokenStore.saveTokens(appContext, token, refresh)
    }

    private fun authHeader(): String {
        val token = getToken() ?: throw IllegalStateException("No auth token")
        return "Bearer $token"
    }

    suspend fun pullFromServer(): BootstrapResponse {
        val response = api.bootstrap(authHeader())
        producerDao.upsertAll(response.producers.map { it.toEntity("synced") })
        return response
    }

    suspend fun createOffline(
        request: CreateProducerRequest,
        photoPath: String? = null,
        signaturePath: String? = null,
    ): ProducerEntity {
        val externalId = request.externalId ?: UUID.randomUUID().toString()
        val entity = ProducerEntity(
            id = externalId,
            externalId = externalId,
            producerNumber = "LOCAL-${externalId.take(8)}",
            producerTypeCode = request.producerTypeCode,
            legalName = request.legalName,
            documentTypeCode = request.documentTypeCode,
            documentNumber = request.documentNumber,
            municipalityCode = request.municipalityCode,
            veredaCode = request.veredaCode,
            latitude = request.latitude,
            longitude = request.longitude,
            lifecycleStatus = "pre_registered",
            categoryCode = null,
            qualityScore = 0,
            photoPath = photoPath,
            signaturePath = signaturePath,
            notes = request.notes,
            version = 1,
            syncStatus = "pending",
            updatedAt = System.currentTimeMillis(),
            payloadJson = gson.toJson(request.copy(externalId = externalId)),
        )
        producerDao.upsert(entity)
        syncQueueDao.enqueue(
            SyncQueueEntity(
                externalId = externalId,
                entityType = "producer",
                operation = "CREATE",
                payloadJson = entity.payloadJson,
                status = "pending",
                createdAt = System.currentTimeMillis(),
            ),
        )
        return entity
    }

    suspend fun updateOffline(
        id: String,
        updates: Map<String, Any?>,
        photoPath: String? = null,
        signaturePath: String? = null,
    ): ProducerEntity {
        val existing = producerDao.getById(id) ?: throw IllegalStateException("Producer not found")
        val updated = existing.copy(
            legalName = updates["legalName"] as? String ?: existing.legalName,
            municipalityCode = updates["municipalityCode"] as? String ?: existing.municipalityCode,
            veredaCode = updates["veredaCode"] as? String ?: existing.veredaCode,
            latitude = updates["latitude"] as? Double ?: existing.latitude,
            longitude = updates["longitude"] as? Double ?: existing.longitude,
            notes = updates["notes"] as? String ?: existing.notes,
            photoPath = photoPath ?: existing.photoPath,
            signaturePath = signaturePath ?: existing.signaturePath,
            version = existing.version + 1,
            syncStatus = "pending",
            updatedAt = System.currentTimeMillis(),
            payloadJson = gson.toJson(updates),
        )
        producerDao.upsert(updated)
        syncQueueDao.enqueue(
            SyncQueueEntity(
                externalId = existing.externalId ?: id,
                entityType = "producer",
                operation = "UPDATE",
                payloadJson = updated.payloadJson,
                status = "pending",
                createdAt = System.currentTimeMillis(),
            ),
        )
        return updated
    }

    suspend fun pushPendingSync(): Int {
        val pending = syncQueueDao.getPending("producer")
        if (pending.isEmpty()) return 0

        val createItems = pending
            .filter { it.operation == "CREATE" }
            .mapNotNull { item ->
                val data = gson.fromJson(item.payloadJson, CreateProducerRequest::class.java)
                SyncItem(externalId = item.externalId, data = data)
            }

        if (createItems.isNotEmpty()) {
            val response = api.syncBatch(authHeader(), SyncRequest(createItems))
            for (result in response.results) {
                val queueItem = pending.find { it.externalId == result.externalId } ?: continue
                if (result.status == "created" || result.status == "duplicate") {
                    val local = producerDao.getByExternalId(result.externalId)
                    if (local != null && result.producerId != null) {
                        producerDao.upsert(
                            local.copy(
                                id = result.producerId,
                                syncStatus = "synced",
                                producerNumber = local.producerNumber,
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

    private fun ProducerDto.toEntity(syncStatus: String) = ProducerEntity(
        id = id,
        externalId = null,
        producerNumber = producerNumber,
        producerTypeCode = producerTypeCode,
        legalName = legalName,
        documentTypeCode = documentTypeCode,
        documentNumber = documentNumber,
        municipalityCode = municipalityCode,
        veredaCode = veredaCode,
        latitude = latitude,
        longitude = longitude,
        lifecycleStatus = lifecycleStatus,
        categoryCode = categoryCode,
        qualityScore = qualityScore,
        photoPath = null,
        signaturePath = null,
        notes = notes,
        version = version,
        syncStatus = syncStatus,
        updatedAt = System.currentTimeMillis(),
        payloadJson = "{}",
    )
}
