package com.agroerp.presentation.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.agroerp.presentation.components.EmptyIllustration
import com.agroerp.presentation.components.EmptyState
import com.agroerp.presentation.components.LoadingState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    onOpenForm: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Formularios") },
                actions = {
                    IconButton(onClick = { viewModel.refreshForms() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
                    }
                    IconButton(onClick = { viewModel.syncNow() }) {
                        Icon(Icons.Default.Sync, contentDescription = "Sincronizar")
                    }
                    IconButton(onClick = {
                        viewModel.logout()
                        onLogout()
                    }) {
                        Icon(Icons.Default.Logout, contentDescription = "Salir")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            StatusBar(
                isOnline = state.isOnline,
                pending = state.pendingSubmissions,
                isSyncing = state.isSyncing,
                message = state.syncMessage,
                error = state.syncError,
            )

            if (state.isLoading) {
                LoadingState(message = "Cargando formularios…")
            } else if (state.forms.isEmpty()) {
                EmptyState(
                    title = "No hay formularios descargados",
                    illustration = EmptyIllustration.FOLDER,
                    description = "Descargue formularios disponibles para captura en campo.",
                    hint = "Conéctese a internet y pulse actualizar.",
                    primaryActionLabel = "Actualizar",
                    onPrimaryAction = { viewModel.refreshForms() },
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(state.forms, key = { it.id }) { form ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onOpenForm(form.id) },
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text(form.name, style = MaterialTheme.typography.titleMedium)
                                form.description?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall)
                                }
                                Text(
                                    "v${form.version} · ${form.formKey}",
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusBar(
    isOnline: Boolean,
    pending: Int,
    isSyncing: Boolean,
    message: String,
    error: String?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            if (isOnline) Icons.Default.CloudQueue else Icons.Default.CloudOff,
            contentDescription = null,
            tint = if (isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
        )
        Column(Modifier.weight(1f)) {
            Text(
                if (isOnline) "En línea" else "Sin conexión — modo offline",
                style = MaterialTheme.typography.labelMedium,
            )
            when {
                isSyncing && message.isNotBlank() ->
                    Text(message, style = MaterialTheme.typography.bodySmall)
                message.isNotBlank() && (message.startsWith("Sincronizados") || message.startsWith("Todo")) ->
                    Text(message, style = MaterialTheme.typography.bodySmall)
                pending > 0 ->
                    Text("$pending pendiente(s) por sincronizar", style = MaterialTheme.typography.bodySmall)
                message.isNotBlank() ->
                    Text(message, style = MaterialTheme.typography.bodySmall)
            }
            // Un solo resumen de error (no por envío)
            if (!isSyncing) {
                error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (isSyncing) CircularProgressIndicator()
    }
}
