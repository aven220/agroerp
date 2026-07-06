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
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val forms: List<FormDefinition> = emptyList(),
    val isLoading: Boolean = true,
    val isOnline: Boolean = false,
    val pendingSubmissions: Int = 0,
    val isSyncing: Boolean = false,
    val syncMessage: String = "",
    val syncError: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val formRepository: FormRepository,
    submissionRepository: SubmissionRepository,
    networkMonitor: NetworkMonitor,
    private val authRepository: AuthRepository,
    private val syncEngine: SyncEngine,
    private val syncScheduler: SyncScheduler,
) : ViewModel() {

    private val _syncState = MutableStateFlow(SyncProgress())
    private val _isLoading = MutableStateFlow(true)

    val uiState: StateFlow<HomeUiState> = combine(
        formRepository.formsFlow,
        submissionRepository.pendingCountFlow,
        networkMonitor.connectivityFlow,
        _syncState,
        _isLoading,
    ) { forms, pending, online, sync, loading ->
        HomeUiState(
            forms = forms,
            isLoading = loading,
            isOnline = online,
            pendingSubmissions = pending,
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
