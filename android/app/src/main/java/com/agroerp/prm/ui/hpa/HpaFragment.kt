package com.agroerp.prm.ui.hpa

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

class HpaFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_hpa, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val summaryText = view.findViewById<TextView>(R.id.hpaSummaryText)
        val notificationsText = view.findViewById<TextView>(R.id.hpaNotificationsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncHpa).setOnClickListener {
            lifecycleScope.launch {
                app.hpaRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.hpa_sync_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, notificationsText, app)
            }
        }

        lifecycleScope.launch {
            app.hpaRepository.syncOffline()
            refresh(summaryText, notificationsText, app)
        }
    }

    private fun refresh(summaryText: TextView, notificationsText: TextView, app: AgroErpApp) {
        val personal = app.hpaRepository.getCachedPersonal()
        val summary = personal["summary"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val objectives = personal["activeObjectives"] as? List<*> ?: emptyList<Any>()
        val evaluations = personal["pendingEvaluations"] as? List<*> ?: emptyList<Any>()
        val courses = personal["upcomingCourses"] as? List<*> ?: emptyList<Any>()
        val notifications = app.hpaRepository.getCachedNotifications()
        val kpis = app.hpaRepository.getCachedKpis()

        summaryText.text = buildString {
            append("— Mi dashboard —\n")
            append("${summary["fullName"] ?: "—"}\n")
            append("Vacaciones: ${personal["vacationsAvailable"] ?: "—"}\n")
            append("Objetivos activos: ${objectives.size}\n")
            objectives.take(3).forEach { row ->
                val o = row as? Map<*, *>
                append("• ${o?.get("title")} (${o?.get("currentValue")}/${o?.get("targetValue")})\n")
            }
            append("Evaluaciones pendientes: ${evaluations.size}\n")
            append("Cursos próximos: ${courses.size}\n")
            courses.take(3).forEach { row ->
                val c = row as? Map<*, *>
                append("• ${c?.get("courseTitle") ?: c?.get("courseKey")}\n")
            }
            if (kpis.isNotEmpty()) {
                append("\n— Indicadores RRHH —\n")
                append("Rotación: ${kpis["rotation"]}%\n")
                append("Ausentismo: ${kpis["absenteeism"]}%\n")
                append("Antigüedad prom.: ${kpis["averageTenureYears"]}\n")
                append("Horas extras: ${kpis["overtimeHours"]}\n")
            }
        }

        notificationsText.text = buildString {
            append("— Notificaciones (${notifications.size}) —\n")
            notifications.take(10).forEach { n ->
                append("• [${n["notificationType"]}] ${n["title"]}: ${n["message"]}\n")
            }
        }
    }
}
