package com.agroerp.prm.ui.eint

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

class EintFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eint, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val kpisText = view.findViewById<TextView>(R.id.kpisText)
        val alertsText = view.findViewById<TextView>(R.id.alertsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eintRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eint_sync_ok else R.string.eint_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, kpisText, alertsText, app)
            }
        }

        lifecycleScope.launch {
            app.eintRepository.syncAll()
            refresh(statusText, kpisText, alertsText, app)
        }
    }

    private suspend fun refresh(
        statusText: TextView,
        kpisText: TextView,
        alertsText: TextView,
        app: AgroErpApp,
    ) {
        val sync = app.eintRepository.getCachedSync()
        val kpis = app.eintRepository.getCachedKpis()
        val dashboards = app.eintRepository.getCachedDashboards()
        val alerts = app.eintRepository.getCachedAlerts()
        val indicators = sync?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eint_dashboards))
            append(": ")
            append(dashboards.size)
            append("\n")
            append(getString(R.string.eint_ai_calls))
            append(": ")
            append(indicators?.get("aiCalls24h") ?: "—")
            append("\n")
            append(getString(R.string.eint_reliability))
            append(": ")
            append(indicators?.get("reliabilityPct") ?: "—")
            append("%")
        }
        kpisText.text = kpis.take(6).joinToString("\n") { kpi ->
            "${kpi["name"] ?: kpi["kpiKey"]} → ${kpi["category"] ?: "—"}"
        }.ifBlank { getString(R.string.eint_no_kpis) }
        alertsText.text = alerts.take(6).joinToString("\n") { alert ->
            "${alert["title"] ?: alert["eventType"] ?: "?"}"
        }.ifBlank { getString(R.string.eint_no_alerts) }
    }
}
