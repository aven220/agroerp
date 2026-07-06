package com.agroerp.prm.data.repository

import android.content.Context
import com.agroerp.prm.BuildConfig
import com.agroerp.prm.auth.AuthTokenStore
import com.agroerp.prm.data.api.HcmApi
import com.agroerp.prm.network.AuthHttpClient
import com.google.gson.Gson
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class HcmRepository(context: Context) {
    private val appContext = context.applicationContext
    private val prefs = appContext.getSharedPreferences("agroerp_hcm", Context.MODE_PRIVATE)
    private val gson = Gson()

    private val api: HcmApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(AuthHttpClient.create())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(HcmApi::class.java)
    }

    fun getCachedCenter(): Map<String, Any> {
        val json = prefs.getString("center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedEmployees(): List<Map<String, Any>> = readList("employees")

    fun getCachedOrg(): Map<String, Any> {
        val json = prefs.getString("org", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedContracts(): List<Map<String, Any>> = readList("contracts")

    fun getCachedDocuments(): List<Map<String, Any>> = readList("documents")

    fun getCachedRcVacancies(): List<Map<String, Any>> = readList("rc_vacancies")

    fun getCachedRcInterviews(): List<Map<String, Any>> = readList("rc_interviews")

    fun getCachedRcOnboarding(): List<Map<String, Any>> = readList("rc_onboarding")

    fun getCachedTaCenter(): Map<String, Any> {
        val json = prefs.getString("ta_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedTaShifts(): List<Map<String, Any>> = readList("ta_shifts")

    fun getCachedTaAssignments(): List<Map<String, Any>> = readList("ta_assignments")

    fun getCachedTaPunches(): List<Map<String, Any>> = readList("ta_punches")

    fun getCachedTaNovelties(): List<Map<String, Any>> = readList("ta_novelties")

    fun getCachedPyCenter(): Map<String, Any> {
        val json = prefs.getString("py_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedPyPayslips(): List<Map<String, Any>> = readList("py_payslips")

    fun getCachedPyDocuments(): List<Map<String, Any>> = readList("py_documents")

    fun getCachedPyVacation(): Map<String, Any> {
        val json = prefs.getString("py_vacation", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedTdCenter(): Map<String, Any> {
        val json = prefs.getString("td_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedTdCourses(): List<Map<String, Any>> = readList("td_courses")

    fun getCachedTdEnrollments(): List<Map<String, Any>> = readList("td_enrollments")

    fun getCachedTdEvaluations(): List<Map<String, Any>> = readList("td_evaluations")

    fun getCachedTdObjectives(): List<Map<String, Any>> = readList("td_objectives")

    fun getCachedTdCertifications(): List<Map<String, Any>> = readList("td_certifications")

    fun getCachedTdReminders(): List<Map<String, Any>> = readList("td_reminders")

    fun getCachedSsCenter(): Map<String, Any> {
        val json = prefs.getString("ss_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedSsPpe(): List<Map<String, Any>> = readList("ss_ppe")

    fun getCachedSsAssignments(): List<Map<String, Any>> = readList("ss_assignments")

    fun getCachedSsDeliveries(): List<Map<String, Any>> = readList("ss_deliveries")

    fun getCachedSsRisks(): List<Map<String, Any>> = readList("ss_risks")

    fun getCachedSsRestrictions(): List<Map<String, Any>> = readList("ss_restrictions")

    fun getCachedSsIncidents(): List<Map<String, Any>> = readList("ss_incidents")

    fun getCachedSsInspections(): List<Map<String, Any>> = readList("ss_inspections")

    fun getCachedRcCenter(): Map<String, Any> {
        val json = prefs.getString("rc_center", null) ?: return emptyMap()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    fun getCachedEmployee(employeeKey: String): Map<String, Any>? {
        val json = prefs.getString("employee_$employeeKey", null) ?: return null
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, Map::class.java) as Map<String, Any>
    }

    private fun readList(key: String): List<Map<String, Any>> {
        val json = prefs.getString(key, null) ?: return emptyList()
        @Suppress("UNCHECKED_CAST")
        return gson.fromJson(json, List::class.java) as List<Map<String, Any>>
    }

    suspend fun syncOffline(): Map<String, Any> {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return offlineFallback()
        return try {
            val auth = "Bearer $token"
            val sync = api.sync(auth)
            val editor = prefs.edit()
                .putString("center", gson.toJson(sync["center"]))
                .putString("employees", gson.toJson(sync["employees"]))
                .putString("org", gson.toJson(sync["org"]))
                .putString("contracts", gson.toJson(sync["contracts"]))
                .putString("documents", gson.toJson(sync["documents"]))
                .putString("syncedAt", sync["syncedAt"]?.toString())

            val employees = sync["employees"] as? List<Map<String, Any>> ?: emptyList()
            for (emp in employees.take(20)) {
                val key = emp["employeeKey"]?.toString() ?: continue
                try {
                    val detail = api.employee(auth, key)
                    editor.putString("employee_$key", gson.toJson(detail))
                } catch (_: Exception) {
                }
            }
            editor.apply()

            try {
                val rcSync = api.rcSync(auth)
                prefs.edit()
                    .putString("rc_center", gson.toJson(rcSync["center"]))
                    .putString("rc_vacancies", gson.toJson(rcSync["vacancies"]))
                    .putString("rc_interviews", gson.toJson(rcSync["interviews"]))
                    .putString("rc_onboarding", gson.toJson(rcSync["onboardingPlans"]))
                    .apply()
            } catch (_: Exception) {
            }

            try {
                val taSync = api.taSync(auth)
                prefs.edit()
                    .putString("ta_center", gson.toJson(taSync["center"]))
                    .putString("ta_shifts", gson.toJson(taSync["shifts"]))
                    .putString("ta_assignments", gson.toJson(taSync["assignments"]))
                    .putString("ta_punches", gson.toJson(taSync["punches"]))
                    .putString("ta_novelties", gson.toJson(taSync["novelties"]))
                    .apply()
            } catch (_: Exception) {
            }

            try {
                val pySync = api.pySync(auth)
                prefs.edit()
                    .putString("py_center", gson.toJson(pySync["center"]))
                    .putString("py_payslips", gson.toJson(pySync["payslips"]))
                    .putString("py_documents", gson.toJson(pySync["documents"]))
                    .putString("py_vacation", gson.toJson(pySync["vacation"]))
                    .apply()
            } catch (_: Exception) {
            }

            try {
                val tdSync = api.tdSync(auth)
                prefs.edit()
                    .putString("td_center", gson.toJson(tdSync["center"]))
                    .putString("td_courses", gson.toJson(tdSync["courses"]))
                    .putString("td_enrollments", gson.toJson(tdSync["enrollments"]))
                    .putString("td_evaluations", gson.toJson(tdSync["evaluations"]))
                    .putString("td_objectives", gson.toJson(tdSync["objectives"]))
                    .putString("td_certifications", gson.toJson(tdSync["certifications"]))
                    .putString("td_reminders", gson.toJson(tdSync["reminders"]))
                    .apply()
            } catch (_: Exception) {
            }

            try {
                val ssSync = api.ssSync(auth)
                prefs.edit()
                    .putString("ss_center", gson.toJson(ssSync["center"]))
                    .putString("ss_ppe", gson.toJson(ssSync["ppeItems"]))
                    .putString("ss_assignments", gson.toJson(ssSync["assignments"]))
                    .putString("ss_deliveries", gson.toJson(ssSync["deliveries"]))
                    .putString("ss_risks", gson.toJson(ssSync["risks"]))
                    .putString("ss_restrictions", gson.toJson(ssSync["restrictions"]))
                    .putString("ss_incidents", gson.toJson(ssSync["incidents"]))
                    .putString("ss_inspections", gson.toJson(ssSync["inspections"]))
                    .apply()
            } catch (_: Exception) {
            }

            sync
        } catch (_: Exception) {
            offlineFallback()
        }
    }

    suspend fun updateAuthorizedOffline(employeeKey: String, phone: String?, email: String?): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.updateAuthorized("Bearer $token", employeeKey, mapOf("phone" to phone, "email" to email))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun offlineFallback(): Map<String, Any> = mapOf(
        "center" to getCachedCenter(),
        "employees" to getCachedEmployees(),
        "org" to getCachedOrg(),
        "contracts" to getCachedContracts(),
        "documents" to getCachedDocuments(),
        "rcCenter" to getCachedRcCenter(),
        "rcVacancies" to getCachedRcVacancies(),
        "rcInterviews" to getCachedRcInterviews(),
        "rcOnboarding" to getCachedRcOnboarding(),
        "taCenter" to getCachedTaCenter(),
        "taShifts" to getCachedTaShifts(),
        "taPunches" to getCachedTaPunches(),
        "pyCenter" to getCachedPyCenter(),
        "pyPayslips" to getCachedPyPayslips(),
        "pyDocuments" to getCachedPyDocuments(),
        "pyVacation" to getCachedPyVacation(),
        "tdCenter" to getCachedTdCenter(),
        "tdCourses" to getCachedTdCourses(),
        "tdEnrollments" to getCachedTdEnrollments(),
        "tdEvaluations" to getCachedTdEvaluations(),
        "tdObjectives" to getCachedTdObjectives(),
        "tdCertifications" to getCachedTdCertifications(),
        "tdReminders" to getCachedTdReminders(),
        "ssCenter" to getCachedSsCenter(),
        "ssPpe" to getCachedSsPpe(),
        "ssAssignments" to getCachedSsAssignments(),
        "ssDeliveries" to getCachedSsDeliveries(),
        "ssRisks" to getCachedSsRisks(),
        "ssRestrictions" to getCachedSsRestrictions(),
        "ssIncidents" to getCachedSsIncidents(),
        "ssInspections" to getCachedSsInspections(),
    )

    suspend fun scheduleInterviewOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.scheduleRcInterview("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun evaluateCandidateOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.recordRcEvaluation("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun punchOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.taPunch("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun syncTaPunchesOffline(employeeKey: String, deviceId: String?, punches: List<Map<String, Any?>>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.taOfflineSync("Bearer $token", mapOf("employeeKey" to employeeKey, "deviceId" to deviceId, "punches" to punches))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun createNoveltyOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.taCreateNovelty("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun signOfferOffline(offerKey: String, body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.signRcOffer("Bearer $token", offerKey, body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun requestVacationOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.pyRequestVacation("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun deliverPpeOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssDeliverPpe("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun syncSsPpeOffline(employeeKey: String, deviceId: String?, deliveries: List<Map<String, Any?>>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssOfflineSync("Bearer $token", mapOf("employeeKey" to employeeKey, "deviceId" to deviceId, "deliveries" to deliveries))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun reportIncidentOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssReportIncident("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun syncSsIncidentsOffline(employeeKey: String, deviceId: String?, incidents: List<Map<String, Any?>>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssIncidentOfflineSync("Bearer $token", mapOf("employeeKey" to employeeKey, "deviceId" to deviceId, "incidents" to incidents))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun uploadEvidenceOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssUploadEvidence("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun createInspectionOffline(body: Map<String, Any?>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssCreateInspection("Bearer $token", body)
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }

    suspend fun syncSsInspectionsOffline(employeeKey: String, deviceId: String?, inspections: List<Map<String, Any?>>): Boolean {
        val token = AuthTokenStore.getAccessToken(appContext) ?: return false
        return try {
            api.ssInspectionOfflineSync("Bearer $token", mapOf("employeeKey" to employeeKey, "deviceId" to deviceId, "inspections" to inspections))
            syncOffline()
            true
        } catch (_: Exception) {
            false
        }
    }
}
