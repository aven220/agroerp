package com.agroerp.presentation.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agroerp.data.repository.AuthRepository
import com.agroerp.data.repository.FormRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val checked: Boolean = false,
    val isLoggedIn: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val formRepository: FormRepository,
) : ViewModel() {

    private val _authState = MutableStateFlow(AuthUiState())
    val authState: StateFlow<AuthUiState> = _authState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.sessionFlow.collect { session ->
                val hasSession = session != null
                _authState.update {
                    it.copy(checked = true, isLoggedIn = hasSession)
                }
                if (hasSession) {
                    formRepository.bootstrapForms()
                }
            }
        }
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _authState.update { it.copy(isLoading = true, error = null) }
            when (val result = authRepository.login(email, password)) {
                is com.agroerp.data.repository.AuthResult.Success -> {
                    formRepository.bootstrapForms()
                    _authState.update {
                        it.copy(isLoading = false, isLoggedIn = true, checked = true)
                    }
                }
                is com.agroerp.data.repository.AuthResult.Error -> {
                    _authState.update {
                        it.copy(isLoading = false, error = result.message)
                    }
                }
            }
        }
    }
}
