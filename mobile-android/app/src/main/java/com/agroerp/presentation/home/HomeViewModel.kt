package com.agroerp.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agroerp.core.network.NetworkMonitor
import com.agroerp.data.repository.AuthRepository
import com.agroerp.data.repository.FormRepository
import com.agroerp.data.repository.SubmissionRepository
import com.agroerp.domain.model.FormDefinition
import com.agroerp.sync.SyncEngine
import com.agroerp.sync.SyncProgress
import com.agroerp.sync.SyncScheduler
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val forms: List<FormDefinition> = emptyList(),
    val isLoading: Boolean = true,
    val isOnline: Boolean = false,
    val pendingSubmissions: Int = 0,
    val pendingItems: List<PendingSubmissionUi> = emptyList(),
    val isSyncing: Boolean = false,
    val syncMessage: String = "",
    val syncError: String? = null,
)

data class PendingSubmissionUi(
    val externalId: String,
    val formKey: String,
    val status: String,
    val error: String?,
    val createdAt: Long,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val formRepository: FormRepository,
    private val submissionRepository: SubmissionRepository,
    networkMonitor: NetworkMonitor,
    private val authRepository: AuthRepository,
    private val syncEngine: SyncEngine,
    private val syncScheduler: SyncScheduler,
) : ViewModel() {

    private val _syncState = MutableStateFlow(SyncProgress())
    private val _isLoading = MutableStateFlow(true)

    private val captureFormsFlow = combine(
        formRepository.dynamicFormsFlow,
        formRepository.legacyFormsFlow,
    ) { dynamicForms, legacyForms ->
        FormRepository.mapDynamicFormsToDefinitions(dynamicForms, legacyForms)
    }

    private val pendingItemsFlow = submissionRepository.submissionsFlow

    val uiState: StateFlow<HomeUiState> = combine(
        captureFormsFlow,
        pendingItemsFlow,
        networkMonitor.connectivityFlow,
        _syncState,
        _isLoading,
    ) { forms, submissions, online, sync, loading ->
        val pending = submissions.filter {
            it.syncState.name in setOf("PENDING", "FAILED", "SYNCING")
        }
        HomeUiState(
            forms = forms,
            isLoading = loading,
            isOnline = online,
            pendingSubmissions = pending.size,
            pendingItems = pending.map {
                PendingSubmissionUi(
                    externalId = it.externalId,
                    formKey = it.formKey,
                    status = it.syncState.name,
                    error = it.errorMessage,
                    createdAt = it.createdAt,
                )
            },
            isSyncing = sync.isRunning,
            syncMessage = sync.message,
            syncError = sync.lastError,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), HomeUiState())

    init {
        viewModelScope.launch {
            syncEngine.progress.collect { _syncState.value = it }
        }
        viewModelScope.launch {
            try {
                formRepository.bootstrapForms()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refreshForms() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                formRepository.bootstrapForms()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun syncNow() {
        viewModelScope.launch {
            syncScheduler.scheduleImmediateSync()
            syncEngine.syncAll()
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }
}
