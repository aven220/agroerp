package com.agroerp.prm.ui.eiwp

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class EiwpFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eiwp, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val alertsText = view.findViewById<TextView>(R.id.alertsText)
        val rainfallInput = view.findViewById<EditText>(R.id.rainfallInput)
        val incidentInput = view.findViewById<EditText>(R.id.incidentInput)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eiwpRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eiwp_sync_ok else R.string.eiwp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, alertsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnRainfall).setOnClickListener {
            lifecycleScope.launch {
                val depth = rainfallInput.text.toString().toDoubleOrNull() ?: return@launch
                val result = app.eiwpRepository.recordRainfall(depth, null, emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eiwp_rainfall_ok else R.string.eiwp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnIncident).setOnClickListener {
            lifecycleScope.launch {
                val desc = incidentInput.text.toString().trim()
                if (desc.isBlank()) return@launch
                val result = app.eiwpRepository.recordIncident("field", desc, emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eiwp_incident_ok else R.string.eiwp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eiwpRepository.syncAll()
            refresh(statusText, alertsText, app)
        }
    }

    private fun refresh(statusText: TextView, alertsText: TextView, app: AgroErpApp) {
        val sync = app.eiwpRepository.getCachedSync()
        val climate = app.eiwpRepository.getCachedClimate()
        val alerts = app.eiwpRepository.getCachedAlerts()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        val metrics = climate?.get("metrics") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eiwp_sources))
            append(": ")
            append(indicators?.get("waterSources") ?: "—")
            append("\n")
            append(getString(R.string.eiwp_temperature))
            append(": ")
            append(metrics?.get("temperature") ?: "—")
            append(" °C\n")
            append(getString(R.string.eiwp_alerts_count))
            append(": ")
            append(indicators?.get("activeAlerts") ?: alerts.size)
        }
        alertsText.text = alerts.take(6).joinToString("\n") { alert ->
            "${alert["alertType"]} → ${alert["title"]}"
        }.ifBlank { getString(R.string.eiwp_no_alerts) }
    }
}
