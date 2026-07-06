package com.agroerp.prm.ui.ephp

import android.Manifest
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class EphpFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_ephp, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val alertsText = view.findViewById<TextView>(R.id.alertsText)
        val qrInput = view.findViewById<EditText>(R.id.qrInput)
        val notesInput = view.findViewById<EditText>(R.id.monitoringNotes)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.ephpRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.ephp_sync_ok else R.string.ephp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, alertsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnQr).setOnClickListener {
            lifecycleScope.launch {
                val code = qrInput.text.toString().trim()
                if (code.isBlank()) return@launch
                val lot = app.ephpRepository.resolveQr(code)
                Toast.makeText(
                    requireContext(),
                    if (lot != null) R.string.ephp_qr_ok else R.string.ephp_qr_fail,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnMonitoring).setOnClickListener {
            lifecycleScope.launch {
                val loc = lastKnownLocation()
                val result = app.ephpRepository.recordMonitoring(
                    fieldLotId = null,
                    latitude = loc?.first,
                    longitude = loc?.second,
                    observations = notesInput.text.toString().trim().ifBlank { null },
                    photoRefs = emptyList(),
                )
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.ephp_monitoring_ok else R.string.ephp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.ephpRepository.syncAll()
            refresh(statusText, alertsText, app)
        }
    }

    private fun lastKnownLocation(): Pair<Double, Double>? {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) return null
        val lm = requireContext().getSystemService(LocationManager::class.java)
        val loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        return loc?.let { it.latitude to it.longitude }
    }

    private fun refresh(statusText: TextView, alertsText: TextView, app: AgroErpApp) {
        val sync = app.ephpRepository.getCachedSync()
        val alerts = app.ephpRepository.getCachedAlerts()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.ephp_pests))
            append(": ")
            append(indicators?.get("pestCatalog") ?: "—")
            append("\n")
            append(getString(R.string.ephp_diseases))
            append(": ")
            append(indicators?.get("diseaseCatalog") ?: "—")
            append("\n")
            append(getString(R.string.ephp_alerts_count))
            append(": ")
            append(indicators?.get("activeAlerts") ?: alerts.size)
        }
        alertsText.text = alerts.take(6).joinToString("\n") { alert ->
            "${alert["alertType"]} → ${alert["title"]}"
        }.ifBlank { getString(R.string.ephp_no_alerts) }
    }
}
