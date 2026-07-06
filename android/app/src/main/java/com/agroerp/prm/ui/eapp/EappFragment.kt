package com.agroerp.prm.ui.eapp

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

class EappFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eapp, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val lotsText = view.findViewById<TextView>(R.id.lotsText)
        val notesInput = view.findViewById<EditText>(R.id.inspectionNotes)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eappRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eapp_sync_ok else R.string.eapp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, lotsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnGps).setOnClickListener {
            lifecycleScope.launch {
                val loc = lastKnownLocation()
                if (loc == null) {
                    Toast.makeText(requireContext(), R.string.eapp_gps_fail, Toast.LENGTH_SHORT).show()
                    return@launch
                }
                val poi = app.eappRepository.registerGpsPoint(
                    "GPS-${System.currentTimeMillis()}",
                    loc.first,
                    loc.second,
                    null,
                )
                Toast.makeText(
                    requireContext(),
                    if (poi != null) R.string.eapp_gps_ok else R.string.eapp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnInspection).setOnClickListener {
            lifecycleScope.launch {
                val loc = lastKnownLocation()
                val result = app.eappRepository.recordInspection(
                    fieldLotId = null,
                    latitude = loc?.first,
                    longitude = loc?.second,
                    notes = notesInput.text.toString().trim().ifBlank { null },
                    photoRefs = emptyList(),
                )
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eapp_inspection_ok else R.string.eapp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eappRepository.syncAll()
            refresh(statusText, lotsText, app)
        }
    }

    private fun lastKnownLocation(): Pair<Double, Double>? {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        val lm = requireContext().getSystemService(LocationManager::class.java)
        val loc = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
        return loc?.let { it.latitude to it.longitude }
    }

    private fun refresh(statusText: TextView, lotsText: TextView, app: AgroErpApp) {
        val sync = app.eappRepository.getCachedSync()
        val lots = app.eappRepository.getCachedLots()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eapp_layers))
            append(": ")
            append(indicators?.get("layers") ?: "—")
            append("\n")
            append(getString(R.string.eapp_lot_polygons))
            append(": ")
            append(indicators?.get("lotPolygons") ?: lots.size)
            append("\n")
            append(getString(R.string.eapp_geo_score))
            append(": ")
            append(indicators?.get("geoScore") ?: "—")
        }
        lotsText.text = lots.take(6).joinToString("\n") { lot ->
            "${lot["lotCode"]} → ${lot["lotName"]}"
        }.ifBlank { getString(R.string.eapp_no_lots) }
    }
}
