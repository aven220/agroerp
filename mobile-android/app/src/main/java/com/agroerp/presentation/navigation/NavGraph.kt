package com.agroerp.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.agroerp.presentation.dashboard.MobileDashboardScreen
import com.agroerp.presentation.formfill.FormFillScreen
import com.agroerp.presentation.home.HomeScreen
import com.agroerp.presentation.login.LoginScreen
import com.agroerp.presentation.login.LoginViewModel
import com.agroerp.presentation.profile.ProfileScreen
import com.agroerp.presentation.sync.SyncQueueScreen

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val FORMS = "forms"
    const val SYNC = "sync"
    const val PROFILE = "profile"
    const val FORM_FILL = "form/{formId}"

    fun formFill(formId: String) = "form/$formId"
}

private val MAIN_TABS = listOf(
    BottomTab.Dashboard,
    BottomTab.Forms,
    BottomTab.Sync,
    BottomTab.Profile,
)

@Composable
fun AgroNavHost() {
    val navController = rememberNavController()
    val loginViewModel: LoginViewModel = hiltViewModel()
    val authState by loginViewModel.authState.collectAsStateWithLifecycle()
    val backStack by navController.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route

    LaunchedEffect(authState.isLoggedIn) {
        if (authState.isLoggedIn) {
            navController.navigate(Routes.DASHBOARD) {
                popUpTo(Routes.LOGIN) { inclusive = true }
            }
        }
    }

    val startDestination = if (authState.checked && authState.isLoggedIn) {
        Routes.DASHBOARD
    } else {
        Routes.LOGIN
    }

    val showBottomBar = authState.isLoggedIn &&
        currentRoute != Routes.LOGIN &&
        !currentRoute.orEmpty().startsWith("form/")

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    MAIN_TABS.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(Routes.DASHBOARD) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.LOGIN) {
                LoginScreen(
                    onLoginSuccess = {
                        navController.navigate(Routes.DASHBOARD) {
                            popUpTo(Routes.LOGIN) { inclusive = true }
                        }
                    },
                )
            }
            composable(Routes.DASHBOARD) {
                MobileDashboardScreen(
                    onNavigateTab = { route ->
                        navController.navigate(route) {
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(Routes.FORMS) {
                HomeScreen(
                    onOpenForm = { formId ->
                        navController.navigate(Routes.formFill(formId))
                    },
                    onLogout = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }
            composable(Routes.SYNC) {
                SyncQueueScreen()
            }
            composable(Routes.PROFILE) {
                ProfileScreen(
                    onLogout = {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }
            composable(
                route = Routes.FORM_FILL,
                arguments = listOf(navArgument("formId") { type = NavType.StringType }),
            ) { backStack ->
                val formId = backStack.arguments?.getString("formId") ?: return@composable
                FormFillScreen(
                    formId = formId,
                    onBack = { navController.popBackStack() },
                    onSubmitted = { navController.popBackStack() },
                )
            }
        }
    }
}
