package com.agroerp.presentation.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Sync
import androidx.compose.ui.graphics.vector.ImageVector

enum class BottomTab(
    val route: String,
    val label: String,
    val icon: ImageVector,
) {
    Dashboard("dashboard", "Inicio", Icons.Default.Home),
    Forms("forms", "Captura", Icons.Default.Assignment),
    Sync("sync", "Sync", Icons.Default.Sync),
    Profile("profile", "Perfil", Icons.Default.Person),
}
