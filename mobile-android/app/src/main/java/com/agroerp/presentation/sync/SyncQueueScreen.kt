package com.agroerp.presentation.sync

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.CloudQueue
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.agroerp.presentation.components.EmptyIllustration
import com.agroerp.presentation.components.EmptyState
import com.agroerp.presentation.home.HomeViewModel

@Composable
fun SyncQueueScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Sincronización", style = MaterialTheme.typography.headlineSmall)

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                imageVector = if (state.isOnline) Icons.Default.CloudQueue else Icons.Default.CloudOff,
                contentDescription = null,
                tint = if (state.isOnline) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.error
                },
            )
            Text(
                if (state.isOnline) "Conectado" else "Sin conexión",
                modifier = Modifier.weight(1f),
            )
            if (state.isSyncing) {
                CircularProgressIndicator()
            }
        }

        if (state.pendingSubmissions == 0 && !state.isSyncing && state.lastAttempted == 0) {
            EmptyState(
                title = "Todo al día",
                illustration = EmptyIllustration.INBOX,
                description = "No hay envíos pendientes de sincronización.",
                hint = "Los formularios capturados offline aparecerán aquí como un resumen.",
            )
        } else {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                ),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        if (state.isSyncing) {
                            state.syncMessage.ifBlank { "Sincronizando…" }
                        } else if (state.lastAttempted > 0) {
                            "Sincronizados ${state.lastSynced} de ${state.lastAttempted}"
                        } else {
                            "${state.pendingSubmissions} pendiente(s) por enviar"
                        },
                        style = MaterialTheme.typography.titleMedium,
                    )
                    if (!state.isSyncing && state.lastAttempted > 0) {
                        Text(
                            buildString {
                                append("OK: ${state.lastSynced}")
                                if (state.lastFailed > 0) append(" · Fallaron: ${state.lastFailed}")
                                if (state.lastRemaining > 0) {
                                    append(" · Quedan: ${state.lastRemaining}")
                                }
                            },
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    } else if (!state.isSyncing && state.pendingSubmissions > 0) {
                        Text(
                            if (state.failedSubmissions > 0) {
                                "${state.failedSubmissions} con error previo — se reintentan al sincronizar"
                            } else {
                                "Listos para enviar al servidor"
                            },
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    state.syncError?.let { err ->
                        Text(
                            err,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                    if (!state.isSyncing && state.lastRemaining > 0) {
                        Text(
                            "Al sincronizar de nuevo solo se reintentan los que faltan.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }

        Button(
            onClick = { viewModel.syncNow() },
            enabled = state.isOnline && !state.isSyncing,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(Icons.Default.Sync, contentDescription = null)
            Text(
                when {
                    state.isSyncing -> "Sincronizando…"
                    state.pendingSubmissions > 0 -> "Sincronizar ${state.pendingSubmissions} pendiente(s)"
                    else -> "Sincronizar ahora"
                },
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}
