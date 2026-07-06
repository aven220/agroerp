package com.agroerp.prm.ui.epscm

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

class EpscmFragment : Fragment() {
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_epscm, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val app = requireActivity().application as AgroErpApp
        val summaryText = view.findViewById<TextView>(R.id.epscmSummaryText)

        view.findViewById<Button>(R.id.btnEpscmSync).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.syncMobile()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.epscm_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEpscmAlerts).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getAlerts()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmDemand).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getDemandPanel()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmInventory).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getInventoryIndicators()
                app.epscmRepository.getDashboard()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmSupply).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getProposals()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmWms).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.syncWmsMobile()
                app.epscmRepository.getWmsDashboard()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.epscm_wms_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEpscmWmsPick).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getWmsPickTasks()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmTms).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.syncTmsMobile()
                app.epscmRepository.getTmsLogisticsDashboard()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.epscm_tms_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEpscmTmsTrips).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getTmsTrips()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEpscmCollab).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.syncCollabMobile()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.epscm_collab_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEpscmCollabTasks).setOnClickListener {
            lifecycleScope.launch {
                app.epscmRepository.getCollabTasks()
                refresh(summaryText, app)
            }
        }

        lifecycleScope.launch { refresh(summaryText, app) }
    }

    private suspend fun refresh(summaryText: TextView, app: AgroErpApp) {
        val dash = app.epscmRepository.getDashboard()
        val ind = dash["indicators"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val alerts = app.epscmRepository.getAlerts()
        val wmsDash = app.epscmRepository.getWmsDashboard()
        val picks = app.epscmRepository.getWmsPickTasks()
        val tmsDash = app.epscmRepository.getTmsLogisticsDashboard()
        val trips = app.epscmRepository.getTmsTrips()
        val collabTasks = app.epscmRepository.getCollabTasks()
        summaryText.text = buildString {
            append("— SCM —\n")
            append("Pronósticos: ${ind["forecastCount"] ?: 0}\n")
            append("Propuestas: ${ind["openProposals"] ?: 0}\n")
            append("Alertas: ${alerts.size}\n")
            append("Críticos: ${ind["criticalItems"] ?: 0}\n")
            append("Cobertura: ${ind["avgCoverageDays"] ?: 0} d\n")
            append("\n— WMS —\n")
            append("Ubicaciones: ${wmsDash["locationCount"] ?: 0}\n")
            append("Picking: ${wmsDash["openPickTasks"] ?: picks.size}\n")
            append("Transferencias: ${wmsDash["openTransfers"] ?: 0}\n")
            append("Recepciones: ${wmsDash["pendingReceipts"] ?: 0}\n")
            append("\n— TMS —\n")
            append("Vehículos: ${tmsDash["vehicleCount"] ?: 0}\n")
            append("Viajes activos: ${tmsDash["activeTrips"] ?: trips.size}\n")
            append("Entregas pend.: ${tmsDash["pendingDeliveries"] ?: 0}\n")
            append("\n— Colaboración —\n")
            append("Tareas abiertas: ${collabTasks.size}\n")
        }
    }
}
