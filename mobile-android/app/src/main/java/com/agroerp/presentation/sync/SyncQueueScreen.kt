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
        Text("Cola de sincronización", style = MaterialTheme.typography.headlineSmall)
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(
                if (state.isOnline) Icons.Default.CloudQueue else Icons.Default.CloudOff,
                contentDescription = null,
                tint = if (state.isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            )
            Column(Modifier.weight(1f)) {
                Text(if (state.isOnline) "Conectado" else "Sin conexión")
                Text(
                    "${state.pendingSubmissions} pendiente(s)",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            if (state.isSyncing) CircularProgressIndicator()
        }
        if (state.syncMessage.isNotBlank()) {
            Text(state.syncMessage, style = MaterialTheme.typography.bodySmall)
        }
        state.syncError?.let {
            Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
        if (state.pendingSubmissions == 0) {
            EmptyState(
                title = "Cola vacía",
                illustration = EmptyIllustration.INBOX,
                description = "No hay envíos pendientes de sincronización.",
                hint = "Los formularios capturados offline aparecerán aquí.",
            )
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
            "Los formularios capturados offline se envían automáticamente al reconectar.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
