package com.agroerp.data.repository

import com.agroerp.core.network.NetworkMonitor
import com.agroerp.data.api.AgroErpApi
import com.agroerp.data.local.dao.FormDao
import com.agroerp.data.mapper.FormMappers.toDomain
import com.agroerp.data.mapper.FormMappers.toEntity
import com.agroerp.domain.model.FormDefinition
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FormRepository @Inject constructor(
    private val api: AgroErpApi,
    private val formDao: FormDao,
    private val networkMonitor: NetworkMonitor,
) {

    val formsFlow: Flow<List<FormDefinition>> = formDao.observeActive().map { list ->
        list.map { it.toDomain() }
    }

    suspend fun getForm(id: String): FormDefinition? {
        val entity = formDao.getById(id) ?: return null
        val domain = entity.toDomain()
        return if (domain.status == "published") domain else null
    }

    suspend fun bootstrapForms(): Result<Int> {
        if (!networkMonitor.isOnline) {
            val cached = formDao.getAll()
            return if (cached.isNotEmpty()) Result.success(cached.size) else {
                Result.failure(Exception("Sin conexión y sin formularios en caché"))
            }
        }
        return try {
            val response = api.bootstrapForms()
            if (!response.isSuccessful || response.body() == null) {
                return Result.failure(Exception("Error descargando formularios"))
            }
            val body = response.body()!!
            val now = System.currentTimeMillis()
            val activeForms = body.forms.filter { form ->
                form.status == null || form.status == "published"
            }
            val entities = activeForms.map { it.toEntity(now) }
            formDao.upsertAll(entities)
            val activeIds = activeForms.map { it.id }
            if (activeIds.isEmpty()) {
                formDao.deleteAll()
            } else {
                formDao.deleteNotIn(activeIds)
            }
            Result.success(entities.size)
        } catch (e: Exception) {
            val cached = formDao.getAll()
            if (cached.isNotEmpty()) Result.success(cached.size)
            else Result.failure(e)
        }
    }
}
