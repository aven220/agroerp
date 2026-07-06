package com.agroerp.prm.ui.hed

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

class HedFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_hed, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val kpisText = view.findViewById<TextView>(R.id.hedKpisText)
        val chartsText = view.findViewById<TextView>(R.id.hedChartsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncHed).setOnClickListener {
            lifecycleScope.launch {
                app.hedRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.hed_sync_done, Toast.LENGTH_SHORT).show()
                refresh(kpisText, chartsText, app)
            }
        }

        lifecycleScope.launch {
            app.hedRepository.syncOffline()
            refresh(kpisText, chartsText, app)
        }
    }

    private fun refresh(kpisText: TextView, chartsText: TextView, app: AgroErpApp) {
        val data = app.hedRepository.getCachedDashboard()
        val kpis = data["kpis"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val attendance = data["attendance"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val training = data["training"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val performance = data["performance"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val charts = data["charts"] as? Map<*, *> ?: emptyMap<Any, Any>()

        kpisText.text = buildString {
            append("— KPIs —\n")
            append("Total: ${kpis["totalEmployees"]}\n")
            append("Activos: ${kpis["activeEmployees"]} · Inactivos: ${kpis["inactiveEmployees"]}\n")
            append("Contrataciones: ${kpis["newHires"]} · Retiros: ${kpis["terminations"]}\n")
            append("Vacantes abiertas: ${kpis["openVacancies"]} · Cerradas: ${kpis["closedVacancies"]}\n")
            append("\n— Asistencia —\n")
            append("Ausentismo: ${attendance["absenteeism"]} · Tardanzas: ${attendance["lateArrivals"]}\n")
            append("Horas extras: ${attendance["overtimeHours"]} · Incapacidades: ${attendance["medicalLeaves"]}\n")
            append("Vacaciones activas: ${attendance["activeVacations"]}\n")
            append("\n— Capacitación —\n")
            append("Pendientes: ${training["pendingCourses"]} · Aprobados: ${training["approvedCourses"]}\n")
            append("Certificaciones por vencer: ${training["certificationsExpiring"]}\n")
            append("Cumplimiento plan: ${training["planCompliance"]}%\n")
            append("\n— Desempeño —\n")
            append("Evaluaciones pendientes: ${performance["pendingEvaluations"]}\n")
            append("Promedio: ${performance["averagePerformance"]}\n")
            append("Objetivos cumplidos: ${performance["objectivesCompleted"]}\n")
            append("Planes de mejora: ${performance["activeImprovementPlans"]}\n")
        }

        val rotation = charts["monthlyRotation"] as? List<*> ?: emptyList<Any>()
        val evolution = charts["headcountEvolution"] as? List<*> ?: emptyList<Any>()
        val byArea = charts["byArea"] as? List<*> ?: emptyList<Any>()
        chartsText.text = buildString {
            append("— Gráficos —\n")
            append("Rotación mensual (${rotation.size} puntos)\n")
            rotation.takeLast(3).forEach { row ->
                val m = row as? Map<*, *>
                append("• ${m?.get("month")}: ${m?.get("rate")}%\n")
            }
            append("Evolución personal (${evolution.size} puntos)\n")
            evolution.takeLast(3).forEach { row ->
                val m = row as? Map<*, *>
                append("• ${m?.get("month")}: ${m?.get("headcount")}\n")
            }
            append("Áreas (${byArea.size})\n")
            byArea.take(5).forEach { row ->
                val m = row as? Map<*, *>
                append("• ${m?.get("label")}: ${m?.get("count")}\n")
            }
        }
    }
}
