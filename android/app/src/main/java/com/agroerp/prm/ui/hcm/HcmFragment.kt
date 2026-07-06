package com.agroerp.prm.ui.hcm

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class HcmFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_hcm, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val employeesText = view.findViewById<TextView>(R.id.employeesText)
        val rcText = view.findViewById<TextView>(R.id.rcText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncHcm).setOnClickListener {
            lifecycleScope.launch {
                app.hcmRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.hcm_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, employeesText, rcText, app)
            }
        }

        lifecycleScope.launch {
            app.hcmRepository.syncOffline()
            refresh(statusText, employeesText, rcText, app)
        }
    }

    private fun refresh(statusText: TextView, employeesText: TextView, rcText: TextView, app: AgroErpApp) {
        val center = app.hcmRepository.getCachedCenter()
        val employees = app.hcmRepository.getCachedEmployees()
        val org = app.hcmRepository.getCachedOrg()
        val departments = org["departments"] as? List<*> ?: emptyList<Any>()
        val orgChart = org["orgChart"] as? List<*> ?: emptyList<Any>()

        statusText.text = buildString {
            append("Colaboradores: ${center["employeeCount"]?.toString() ?: "0"}")
            append("\n")
            append("Activos: ${center["activeEmployees"]?.toString() ?: "0"}")
            append("\n")
            append("Departamentos: ${departments.size}")
            append("\n")
            append("Nodos organigrama: ${orgChart.size}")
            append("\n")
            append("Contratos activos: ${center["activeContracts"]?.toString() ?: "0"}")
        }
        employeesText.text = employees.take(15).joinToString("\n") { row ->
            "${row["employeeNumber"]} — ${row["displayName"]} (${row["employmentStatus"]})"
        }

        val rcCenter = app.hcmRepository.getCachedRcCenter()
        val vacancies = app.hcmRepository.getCachedRcVacancies()
        val interviews = app.hcmRepository.getCachedRcInterviews()
        val onboarding = app.hcmRepository.getCachedRcOnboarding()

        rcText.text = buildString {
            append("— Reclutamiento —\n")
            append("Vacantes abiertas: ${rcCenter["openVacancies"]?.toString() ?: vacancies.size}\n")
            append("Candidatos: ${rcCenter["candidateCount"]?.toString() ?: "0"}\n")
            append("Entrevistas: ${interviews.size}\n")
            append("Onboarding activo: ${rcCenter["activeOnboarding"]?.toString() ?: onboarding.size}\n\n")
            append("Vacantes:\n")
            vacancies.take(5).forEach { v ->
                append("• ${v["title"]} (${v["status"]})\n")
            }
            append("\nEntrevistas próximas:\n")
            interviews.take(5).forEach { i ->
                append("• ${i["scheduledAt"]} — ${i["status"]}\n")
            }
            append("\n— Asistencia —\n")
            val taCenter = app.hcmRepository.getCachedTaCenter()
            val taShifts = app.hcmRepository.getCachedTaShifts()
            val taPunches = app.hcmRepository.getCachedTaPunches()
            append("Marcaciones hoy: ${taCenter["punchCountToday"]?.toString() ?: taPunches.size}\n")
            append("Turnos: ${taShifts.size}\n")
            append("Correcciones pend.: ${taCenter["pendingCorrections"]?.toString() ?: "0"}\n")
            append("\n— Nómina —\n")
            val pyCenter = app.hcmRepository.getCachedPyCenter()
            val pyPayslips = app.hcmRepository.getCachedPyPayslips()
            val pyVacation = app.hcmRepository.getCachedPyVacation()
            append("Procesos: ${pyCenter["runCount"]?.toString() ?: "0"}\n")
            append("Desprendibles: ${pyPayslips.size}\n")
            append("Vacaciones disp.: ${pyVacation["availableDays"]?.toString() ?: "—"}\n")
            append("\n— Talento —\n")
            val tdCenter = app.hcmRepository.getCachedTdCenter()
            val tdCourses = app.hcmRepository.getCachedTdCourses()
            val tdEvaluations = app.hcmRepository.getCachedTdEvaluations()
            val tdReminders = app.hcmRepository.getCachedTdReminders()
            append("Cursos: ${tdCenter["courseCount"]?.toString() ?: tdCourses.size}\n")
            append("Evaluaciones pend.: ${tdCenter["pendingEvaluations"]?.toString() ?: tdEvaluations.size}\n")
            append("Recordatorios: ${tdReminders.size}\n")
            append("\n— SST —\n")
            val ssCenter = app.hcmRepository.getCachedSsCenter()
            val ssPpe = app.hcmRepository.getCachedSsPpe()
            val ssRisks = app.hcmRepository.getCachedSsRisks()
            val ssRestrictions = app.hcmRepository.getCachedSsRestrictions()
            append("EPP catálogo: ${ssCenter["ppeCount"]?.toString() ?: ssPpe.size}\n")
            append("Riesgos: ${ssCenter["riskCount"]?.toString() ?: ssRisks.size}\n")
            append("Restricciones: ${ssCenter["activeRestrictions"]?.toString() ?: ssRestrictions.size}\n")
            append("EPP por vencer: ${ssCenter["ppeExpiring"]?.toString() ?: "0"}\n")
            append("Incidentes abiertos: ${ssCenter["openIncidents"]?.toString() ?: app.hcmRepository.getCachedSsIncidents().size}\n")
            append("Inspecciones: ${ssCenter["inspectionCount"]?.toString() ?: app.hcmRepository.getCachedSsInspections().size}\n")
        }
    }
}
