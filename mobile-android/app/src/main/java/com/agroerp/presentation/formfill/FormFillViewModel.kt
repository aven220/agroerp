package com.agroerp.presentation.formfill

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agroerp.data.mapper.CaptureFormMapper.toFormDefinition
import com.agroerp.data.repository.FormRepository
import com.agroerp.data.repository.MediaRepository
import com.agroerp.data.repository.SubmissionRepository
import com.agroerp.domain.engine.FormRendererEngine
import com.agroerp.domain.model.FormDefinition
import com.agroerp.domain.model.GpsPoint
import com.agroerp.domain.model.RenderedField
import com.agroerp.gis.LocationService
import com.agroerp.sync.LocalEventService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import javax.inject.Inject

data class FormFillUiState(
    val isLoading: Boolean = true,
    val form: FormDefinition? = null,
    val renderedFields: List<RenderedField> = emptyList(),
    val values: Map<String, Any?> = emptyMap(),
    val currentGps: GpsPoint? = null,
    val isSubmitting: Boolean = false,
    val error: String? = null,
    val submitted: Boolean = false,
)

@HiltViewModel
class FormFillViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val formRepository: FormRepository,
    private val submissionRepository: SubmissionRepository,
    private val mediaRepository: MediaRepository,
    private val renderer: FormRendererEngine,
    private val locationService: LocationService,
    private val localEventService: LocalEventService,
) : ViewModel() {

    private val formId: String = savedStateHandle["formId"] ?: ""
    private val _state = MutableStateFlow(FormFillUiState())
    val state: StateFlow<FormFillUiState> = _state.asStateFlow()

    init {
        loadForm()
    }

    fun refreshGps() {
        viewModelScope.launch {
            val gps = locationService.getCurrentLocation()
            _state.update { it.copy(currentGps = gps) }
            refreshRenderedFields()
        }
    }

    private fun loadForm() {
        viewModelScope.launch {
            val dynamicForm = formRepository.getDynamicForm(formId)
            if (dynamicForm == null) {
                val fallback = formRepository.getForm(formId)
                if (fallback == null) {
                    _state.update { it.copy(isLoading = false, error = "Formulario no encontrado") }
                    return@launch
                }
                applyLoadedForm(fallback)
                return@launch
            }

            val legacyForm = formRepository.getLegacyForm(formId)
            val form = dynamicForm.toFormDefinition(legacyForm)
            if (form.status != "published") {
                _state.update { it.copy(isLoading = false, error = "Formulario no disponible") }
                return@launch
            }
            applyLoadedForm(form)
        }
    }

    private fun applyLoadedForm(form: FormDefinition) {
        viewModelScope.launch {
            localEventService.recordFormOpened(formId)
            val rendered = renderer.render(form.schema)
            _state.update {
                it.copy(
                    isLoading = false,
                    form = form,
                    renderedFields = rendered,
                )
            }
            refreshGps()
        }
    }

    fun onValueChange(key: String, value: Any?) {
        _state.update { state ->
            val newValues = state.values.toMutableMap().apply { put(key, value) }
            state.copy(values = newValues)
        }
        refreshRenderedFields()
    }

    private fun refreshRenderedFields() {
        val form = _state.value.form ?: return
        val rendered = renderer.render(form.schema, _state.value.values)
        _state.update { it.copy(renderedFields = rendered) }
    }

    fun onPhotoCaptured(fieldKey: String, file: File) {
        viewModelScope.launch {
            val media = mediaRepository.registerCapturedFile(
                file = file,
                mimeType = "image/jpeg",
                mediaType = "photo",
                fieldKey = fieldKey,
                submissionExternalId = null,
                gps = _state.value.currentGps,
            )
            onValueChange(fieldKey, media.id)
        }
    }

    fun onSignatureCaptured(fieldKey: String, file: File) {
        viewModelScope.launch {
            val media = mediaRepository.registerCapturedFile(
                file = file,
                mimeType = "image/png",
                mediaType = "signature",
                fieldKey = fieldKey,
                submissionExternalId = null,
            )
            onValueChange(fieldKey, media.id)
        }
    }

    fun submit(draft: Boolean = false) {
        val form = _state.value.form ?: return
        viewModelScope.launch {
            _state.update { it.copy(isSubmitting = true, error = null) }
            val gps = _state.value.currentGps
            val result = submissionRepository.submit(
                form = form,
                data = _state.value.values,
                gpsLocation = gps,
                draft = draft,
            )
            result.fold(
                onSuccess = {
                    _state.update { it.copy(isSubmitting = false, submitted = true) }
                },
                onFailure = { e ->
                    _state.update {
                        it.copy(
                            isSubmitting = false,
                            error = e.message ?: "Error al enviar",
                        )
                    }
                },
            )
        }
    }

    fun resetForm() {
        _state.update { it.copy(values = emptyMap(), error = null) }
        refreshRenderedFields()
    }
}
