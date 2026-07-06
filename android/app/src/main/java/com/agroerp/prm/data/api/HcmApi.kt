package com.agroerp.prm.data.api

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface HcmApi {
    @GET("hcm/mobile/sync")
    suspend fun sync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("hcm/employees")
    suspend fun employees(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = "active",
    ): List<Map<String, Any>>

    @GET("hcm/employees/{employeeKey}")
    suspend fun employee(
        @Header("Authorization") authorization: String,
        @Path("employeeKey") employeeKey: String,
    ): Map<String, Any>

    @GET("hcm/org/hierarchy")
    suspend fun hierarchy(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("hcm/employees/search")
    suspend fun search(
        @Header("Authorization") authorization: String,
        @Query("q") query: String,
    ): List<Map<String, Any>>

    @PUT("hcm/employees/{employeeKey}/authorized")
    suspend fun updateAuthorized(
        @Header("Authorization") authorization: String,
        @Path("employeeKey") employeeKey: String,
        @Body body: Map<String, String?>,
    ): Map<String, Any>

    @POST("hcm/employees/{employeeKey}/documents")
    suspend fun uploadDocument(
        @Header("Authorization") authorization: String,
        @Path("employeeKey") employeeKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/rc/mobile/sync")
    suspend fun rcSync(@Header("Authorization") authorization: String): Map<String, Any>

    @GET("hcm/rc/vacancies")
    suspend fun rcVacancies(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/rc/interviews")
    suspend fun rcInterviews(
        @Header("Authorization") authorization: String,
        @Query("upcoming") upcoming: String? = "true",
    ): List<Map<String, Any>>

    @POST("hcm/rc/interviews")
    suspend fun scheduleRcInterview(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/rc/interviews/{interviewKey}/complete")
    suspend fun completeRcInterview(
        @Header("Authorization") authorization: String,
        @Path("interviewKey") interviewKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/rc/evaluations")
    suspend fun recordRcEvaluation(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/rc/onboarding")
    suspend fun rcOnboarding(
        @Header("Authorization") authorization: String,
        @Query("status") status: String? = "active",
    ): List<Map<String, Any>>

    @POST("hcm/rc/offers/{offerKey}/sign")
    suspend fun signRcOffer(
        @Header("Authorization") authorization: String,
        @Path("offerKey") offerKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/ta/mobile/sync")
    suspend fun taSync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("hcm/ta/shifts")
    suspend fun taShifts(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("hcm/ta/assignments")
    suspend fun taAssignments(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @POST("hcm/ta/punches")
    suspend fun taPunch(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ta/punches/offline-sync")
    suspend fun taOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ta/novelties")
    suspend fun taCreateNovelty(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/ta/novelties")
    suspend fun taNovelties(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/py/mobile/sync")
    suspend fun pySync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("hcm/py/payslips")
    suspend fun pyPayslips(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/py/documents")
    suspend fun pyDocuments(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/py/vacations/balance")
    suspend fun pyVacationBalance(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String,
    ): Map<String, Any>

    @POST("hcm/py/vacations/request")
    suspend fun pyRequestVacation(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/py/salary-history/{employeeKey}")
    suspend fun pySalaryHistory(
        @Header("Authorization") authorization: String,
        @Path("employeeKey") employeeKey: String,
    ): Map<String, Any>

    @POST("hcm/py/documents/labor-certificate/{employeeKey}")
    suspend fun pyLaborCertificate(
        @Header("Authorization") authorization: String,
        @Path("employeeKey") employeeKey: String,
    ): Map<String, Any>

    @GET("hcm/td/mobile/sync")
    suspend fun tdSync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("hcm/td/courses")
    suspend fun tdCourses(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("hcm/td/enrollments")
    suspend fun tdEnrollments(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/td/evaluations")
    suspend fun tdEvaluations(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/td/objectives")
    suspend fun tdObjectives(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/td/certifications")
    suspend fun tdCertifications(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/td/reminders")
    suspend fun tdReminders(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @POST("hcm/td/evaluations/{evaluationKey}/scores")
    suspend fun tdSubmitEvaluationScores(
        @Header("Authorization") authorization: String,
        @Path("evaluationKey") evaluationKey: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/ss/mobile/sync")
    suspend fun ssSync(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): Map<String, Any>

    @GET("hcm/ss/ppe")
    suspend fun ssPpe(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("hcm/ss/ppe/assignments")
    suspend fun ssPpeAssignments(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @GET("hcm/ss/ppe/deliveries")
    suspend fun ssPpeDeliveries(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @POST("hcm/ss/ppe/deliveries")
    suspend fun ssDeliverPpe(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ss/ppe/offline-sync")
    suspend fun ssOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/ss/risks")
    suspend fun ssRisks(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @GET("hcm/ss/restrictions")
    suspend fun ssRestrictions(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
        @Query("status") status: String? = "active",
    ): List<Map<String, Any>>

    @GET("hcm/ss/incidents")
    suspend fun ssIncidents(
        @Header("Authorization") authorization: String,
        @Query("employeeKey") employeeKey: String? = null,
    ): List<Map<String, Any>>

    @POST("hcm/ss/incidents")
    suspend fun ssReportIncident(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ss/incidents/offline-sync")
    suspend fun ssIncidentOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ss/incidents/evidences")
    suspend fun ssUploadEvidence(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @GET("hcm/ss/inspections")
    suspend fun ssInspections(@Header("Authorization") authorization: String): List<Map<String, Any>>

    @POST("hcm/ss/inspections")
    suspend fun ssCreateInspection(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>

    @POST("hcm/ss/inspections/offline-sync")
    suspend fun ssInspectionOfflineSync(
        @Header("Authorization") authorization: String,
        @Body body: Map<String, Any?>,
    ): Map<String, Any>
}
