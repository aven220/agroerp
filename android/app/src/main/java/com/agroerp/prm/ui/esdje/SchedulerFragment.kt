package com.agroerp.prm.ui.esdje

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class SchedulerFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_scheduler, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val jobsText = view.findViewById<TextView>(R.id.jobsText)
        val runsText = view.findViewById<TextView>(R.id.runsText)
        val app = requireActivity().application as AgroErpApp

        lifecycleScope.launch {
            val jobs = app.schedulerRepository.syncOffline() ?: app.schedulerRepository.getCachedJobs()
            val runs = app.schedulerRepository.getCachedRuns()
            jobsText.text = jobs?.jobs?.joinToString("\n") {
                "• ${it.name} [${it.status}] próx: ${it.nextRunAt ?: "—"}"
            } ?: "Sin tareas en caché offline"
            runsText.text = runs.take(20).joinToString("\n") {
                "${it.jobKey}: ${it.status} #${it.attempt} ${it.durationMs}ms"
            }.ifBlank { "Sin ejecuciones recientes" }
        }
    }
}
