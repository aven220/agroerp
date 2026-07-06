package com.agroerp.presentation.dashboard

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.agroerp.presentation.home.HomeViewModel

data class QuickAction(val id: String, val label: String, val emoji: String, val formHint: String? = null)

private val DEFAULT_ACTIONS = listOf(
    QuickAction("capture", "Nueva captura", "📝", formHint = "forms"),
    QuickAction("sync", "Sincronizar", "🔄", formHint = "sync"),
    QuickAction("offline", "Modo offline", "☁", formHint = null),
    QuickAction("gps", "Ubicación GPS", "📍", formHint = null),
)

@Composable
fun MobileDashboardScreen(
    onNavigateTab: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("AGROERP Campo", style = MaterialTheme.typography.headlineSmall)
        Text(
            if (state.isOnline) "En línea · ${state.forms.size} formularios" else "Sin conexión · modo offline",
            style = MaterialTheme.typography.bodyMedium,
            color = if (state.isOnline) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
        )
        if (state.pendingSubmissions > 0) {
            Text(
                "${state.pendingSubmissions} envío(s) pendiente(s)",
                style = MaterialTheme.typography.labelLarge,
            )
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(0.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(DEFAULT_ACTIONS) { action ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            when (action.formHint) {
                                "forms" -> onNavigateTab("forms")
                                "sync" -> {
                                    viewModel.syncNow()
                                    onNavigateTab("sync")
                                }
                                else -> onNavigateTab("forms")
                            }
                        },
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(action.emoji, style = MaterialTheme.typography.headlineMedium)
                        Text(action.label, style = MaterialTheme.typography.titleSmall)
                    }
                }
            }
        }
    }
}
