package com.agroerp.prm.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.auth.BiometricHelper
import com.agroerp.prm.databinding.ActivityLoginBinding
import com.agroerp.prm.ui.MainActivity
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLoginBinding
    private var pendingMfaToken: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val app = application as AgroErpApp
        if (app.authRepository.isLoggedIn) {
            openMain()
            return
        }

        binding.emailInput.setText(AuthTokenStore.getLastEmail(this) ?: "admin@demo.agroerp.com")

        if (BiometricHelper.canAuthenticate(this) && AuthTokenStore.isBiometricEnabled(this)) {
            binding.biometricButton.visibility = View.VISIBLE
            binding.biometricButton.setOnClickListener { unlockWithBiometric() }
        }

        binding.loginButton.setOnClickListener {
            if (pendingMfaToken != null) {
                submitMfa()
            } else {
                submitLogin()
            }
        }
    }

    private fun unlockWithBiometric() {
        BiometricHelper.authenticate(
            this,
            onSuccess = { openMain() },
            onError = { msg -> showError(msg) },
        )
    }

    private fun submitLogin() {
        val email = binding.emailInput.text?.toString()?.trim().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        if (email.isEmpty() || password.isEmpty()) {
            showError("Ingrese correo y contraseña")
            return
        }

        binding.loginButton.isEnabled = false
        lifecycleScope.launch {
            try {
                val app = application as AgroErpApp
                val result = app.authRepository.login(email, password)
                if (result.mfaRequired && result.mfaToken != null) {
                    pendingMfaToken = result.mfaToken
                    binding.mfaLayout.visibility = View.VISIBLE
                    binding.loginButton.text = "Verificar MFA"
                    showError(null)
                } else {
                    onLoginSuccess()
                }
            } catch (e: Exception) {
                showError(e.message ?: "Error de autenticación")
            } finally {
                binding.loginButton.isEnabled = true
            }
        }
    }

    private fun submitMfa() {
        val code = binding.mfaInput.text?.toString()?.trim().orEmpty()
        val token = pendingMfaToken ?: return
        binding.loginButton.isEnabled = false
        lifecycleScope.launch {
            try {
                val app = application as AgroErpApp
                app.authRepository.completeMfa(token, code)
                onLoginSuccess()
            } catch (e: Exception) {
                showError(e.message ?: "Código MFA inválido")
            } finally {
                binding.loginButton.isEnabled = true
            }
        }
    }

    private fun onLoginSuccess() {
        if (binding.enableBiometricCheck.isChecked && BiometricHelper.canAuthenticate(this)) {
            AuthTokenStore.setBiometricEnabled(this, true)
        }
        openMain()
    }

    private fun openMain() {
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }

    private fun showError(message: String?) {
        if (message.isNullOrBlank()) {
            binding.errorText.visibility = View.GONE
        } else {
            binding.errorText.text = message
            binding.errorText.visibility = View.VISIBLE
        }
    }
}
