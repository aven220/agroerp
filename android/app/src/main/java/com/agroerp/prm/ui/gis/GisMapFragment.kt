package com.agroerp.prm.ui.gis

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.location.GpsHelper
import kotlinx.coroutines.launch

class GisMapFragment : Fragment() {
    private val trackPoints = mutableListOf<Pair<Double, Double>>()
    private lateinit var statusText: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? {
        val view = inflater.inflate(R.layout.fragment_gis_map, container, false)
        statusText = view.findViewById(R.id.textGisStatus)

        view.findViewById<Button>(R.id.btnGpsPoint).setOnClickListener {
            lifecycleScope.launch {
                try {
                    val loc = GpsHelper(requireContext()).getCurrentLocation()
                    trackPoints.add(loc.latitude to loc.longitude)
                    statusText.text = "Punto GPS: ${loc.latitude}, ${loc.longitude} (±${loc.accuracyMeters}m)"
                } catch (e: Exception) {
                    statusText.text = e.message ?: "Error GPS"
                }
            }
        }

        view.findViewById<Button>(R.id.btnSyncGis).setOnClickListener {
            lifecycleScope.launch {
                try {
                    val app = requireActivity().application as AgroErpApp
                    val result = app.gisRepository.syncMobile(trackPoints = trackPoints.toList())
                    statusText.text = "Sincronizado: ${result.layers.size} capas, ${result.basemaps.size} mapas base"
                    trackPoints.clear()
                } catch (e: Exception) {
                    statusText.text = "Error sync GIS: ${e.message}"
                }
            }
        }

        return view
    }
}
