package com.agroerp.presentation.formfill

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.agroerp.presentation.components.DynamicFormFields

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FormFillScreen(
    formId: String,
    onBack: () -> Unit,
    onSubmitted: () -> Unit,
    viewModel: FormFillViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val context = LocalContext.current

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        val locationGranted = grants[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
            grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (locationGranted) viewModel.refreshGps()
    }

    LaunchedEffect(Unit) {
        val needed = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.CAMERA,
        ).filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        } else {
            viewModel.refreshGps()
        }
    }

    LaunchedEffect(state.error) {
        state.error?.let { snackbar.showSnackbar(it) }
    }

    LaunchedEffect(state.submitted) {
        if (state.submitted) {
            snackbar.showSnackbar("Envío guardado offline")
            onSubmitted()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text(state.form?.name ?: "Formulario") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                },
            )
        },
    ) { padding ->
        when {
            state.isLoading -> {
                CircularProgressIndicator(Modifier.padding(padding).padding(32.dp))
            }
            state.form == null -> {
                Text(
                    state.error ?: "Error",
                    modifier = Modifier.padding(padding).padding(16.dp),
                )
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                ) {
                    state.form?.description?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(16.dp))
                    }

                    DynamicFormFields(
                        fields = state.renderedFields,
                        values = state.values,
                        onValueChange = viewModel::onValueChange,
                        onCapturePhoto = viewModel::onPhotoCaptured,
                        onCaptureSignature = viewModel::onSignatureCaptured,
                        currentGps = state.currentGps,
                        onRequestGps = viewModel::refreshGps,
                        onButtonAction = { action ->
                            when (action) {
                                "draft" -> viewModel.submit(draft = true)
                                "reset" -> viewModel.resetForm()
                                else -> viewModel.submit()
                            }
                        },
                    )

                    Spacer(Modifier.height(24.dp))

                    Button(
                        onClick = { viewModel.submit() },
                        enabled = !state.isSubmitting,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (state.isSubmitting) {
                            CircularProgressIndicator()
                        } else {
                            Text("Guardar envío (offline)")
                        }
                    }
                }
            }
        }
    }
}
