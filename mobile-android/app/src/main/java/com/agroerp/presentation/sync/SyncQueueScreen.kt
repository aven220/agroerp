package com.agroerp.presentation.sync

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.agroerp.presentation.home.PendingSubmissionUi

@Composable
fun SyncQueueScreen(viewModel: HomeViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Cola de sincronización", style = MaterialTheme.typography.headlineSmall)
        SyncStatusHeader(
            isOnline = state.isOnline,
            pendingCount = state.pendingSubmissions,
            isSyncing = state.isSyncing,
        )
        if (state.syncMessage.isNotBlank()) {
            Text(state.syncMessage, style = MaterialTheme.typography.bodySmall)
        }
        state.syncError?.let { err ->
            Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        if (state.pendingSubmissions == 0) {
            EmptyState(
                title = "Cola vacía",
                illustration = EmptyIllustration.INBOX,
                description = "No hay envíos pendientes de sincronización.",
                hint = "Los formularios capturados offline aparecerán aquí.",
            )
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f, fill = false),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(state.pendingItems, key = { it.externalId }) { item ->
                    PendingSubmissionCard(item)
                }
            }
        }
        Button(
            onClick = { viewModel.syncNow() },
            enabled = state.isOnline && !state.isSyncing,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(Icons.Default.Sync, contentDescription = null)
            Text("Sincronizar ahora", modifier = Modifier.padding(start = 8.dp))
        }
        Text(
            "Si un envío falla, el error aparece arriba. Corrija GPS/datos o vuelva a sincronizar tras actualizar la app.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SyncStatusHeader(
    isOnline: Boolean,
    pendingCount: Int,
    isSyncing: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Icon(
            imageVector = if (isOnline) Icons.Default.CloudQueue else Icons.Default.CloudOff,
            contentDescription = null,
            tint = if (isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(if (isOnline) "Conectado" else "Sin conexión")
            Text(
                "$pendingCount pendiente(s)",
                style = MaterialTheme.typography.bodySmall,
            )
        }
        if (isSyncing) {
            CircularProgressIndicator()
        }
    }
}

@Composable
private fun PendingSubmissionCard(item: PendingSubmissionUi) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(item.formKey, style = MaterialTheme.typography.titleSmall)
            Text(
                "Estado: ${item.status}",
                style = MaterialTheme.typography.bodySmall,
            )
            item.error?.let { err ->
                Text(
                    err,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
