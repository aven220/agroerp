package com.agroerp.data.repository

import com.agroerp.data.local.dao.DynamicFormDao
import com.agroerp.data.local.dao.FormDao
import com.agroerp.data.local.entities.DynamicFormEntity
import com.agroerp.data.local.entities.FormEntity
import com.agroerp.data.mapper.CaptureFormMapper.toFormDefinition
import com.agroerp.data.mapper.FormMappers.toDomain
import com.agroerp.domain.model.FormDefinition
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FormRepository @Inject constructor(
    private val captureRepository: CaptureRepository,
    private val dynamicFormDao: DynamicFormDao,
    private val formDao: FormDao,
) {

    /** Primary source: Capture Engine dynamic forms. */
    val dynamicFormsFlow: Flow<List<DynamicFormEntity>> = dynamicFormDao.observeAll()

    /** Legacy mirror kept for progressive migration compatibility. */
    val legacyFormsFlow: Flow<List<FormEntity>> = formDao.observeAll()

    val formsFlow: Flow<List<FormDefinition>> = observeFormDefinitions()

    fun observeFormDefinitions(): Flow<List<FormDefinition>> = combine(
        dynamicFormDao.observeAll(),
        formDao.observeAll(),
    ) { dynamicForms, legacyForms ->
        mapDynamicFormsToDefinitions(dynamicForms, legacyForms)
    }

    suspend fun getDynamicForm(id: String): DynamicFormEntity? =
        dynamicFormDao.getByFormId(id)

    suspend fun getLegacyForm(id: String): FormEntity? =
        formDao.getById(id)

    suspend fun getForm(id: String): FormDefinition? {
        val dynamic = dynamicFormDao.getByFormId(id) ?: return fallbackFromLegacy(id)
        return dynamic.toFormDefinition(formDao.getById(id))
            .takeIf { it.status == "published" }
    }

    suspend fun bootstrapForms(): Result<Int> = captureRepository.downloadOfflinePackage()

    private suspend fun fallbackFromLegacy(id: String): FormDefinition? {
        val legacy = formDao.getById(id) ?: return null
        return legacy.toDomain().takeIf { it.status == "published" }
    }

    companion object {
        internal fun mapDynamicFormsToDefinitions(
            dynamicForms: List<DynamicFormEntity>,
            legacyForms: List<FormEntity>,
        ): List<FormDefinition> {
            val legacyById = legacyForms.associateBy { it.id }
            return dynamicForms
                .map { dynamic -> dynamic.toFormDefinition(legacyById[dynamic.formId]) }
                .filter { it.status == "published" }
                .sortedBy { it.name }
        }

        internal fun mapDynamicFormToDefinition(
            dynamic: DynamicFormEntity,
            legacy: FormEntity?,
        ): FormDefinition = dynamic.toFormDefinition(legacy)
    }
}
