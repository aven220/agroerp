package com.agroerp.prm.ui.eops

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

class EopsFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eops, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val alertsText = view.findViewById<TextView>(R.id.alertsText)
        val probesText = view.findViewById<TextView>(R.id.probesText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eopsRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eops_sync_ok else R.string.eops_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, alertsText, probesText, app)
            }
        }

        lifecycleScope.launch {
            app.eopsRepository.syncAll()
            refresh(statusText, alertsText, probesText, app)
        }
    }

    private fun refresh(
        statusText: TextView,
        alertsText: TextView,
        probesText: TextView,
        app: AgroErpApp,
    ) {
        val sync = app.eopsRepository.getCachedSync()
        val alerts = app.eopsRepository.getCachedAlerts()
        val probes = app.eopsRepository.getCachedProbes()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eops_ops_score))
            append(": ")
            append(indicators?.get("opsScore") ?: "—")
            append("\n")
            append(getString(R.string.eops_health_score))
            append(": ")
            append(indicators?.get("healthScore") ?: "—")
            append("\n")
            append(getString(R.string.eops_production_ready))
            append(": ")
            append(indicators?.get("productionReady") ?: false)
        }
        alertsText.text = alerts.take(6).joinToString("\n") { alert ->
            "${alert["title"] ?: alert["severity"]}"
        }.ifBlank { getString(R.string.eops_no_alerts) }
        probesText.text = probes.take(6).joinToString("\n") { probe ->
            "${probe["probeKey"]} → ${probe["lastStatus"]}"
        }.ifBlank { getString(R.string.eops_no_probes) }
    }
}
