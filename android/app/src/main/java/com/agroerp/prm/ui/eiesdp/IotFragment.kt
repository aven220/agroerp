package com.agroerp.prm.ui.eiesdp

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

class IotFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_iot, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val devicesText = view.findViewById<TextView>(R.id.devicesText)
        val telemetryText = view.findViewById<TextView>(R.id.telemetryText)
        val localScansText = view.findViewById<TextView>(R.id.localScansText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnBleScan).setOnClickListener {
            val discovered = listOf("BLE-SOIL-01", "BLE-TEMP-02", "BLE-HUM-03")
            app.iotRepository.cacheBleDiscovery(discovered)
            Toast.makeText(requireContext(), getString(R.string.iot_ble_found, discovered.size), Toast.LENGTH_SHORT).show()
            refreshLocalScans(localScansText, app)
        }

        view.findViewById<Button>(R.id.btnNfcRead).setOnClickListener {
            app.iotRepository.cacheNfcTag("NFC-TAG-DEMO-${System.currentTimeMillis()}")
            Toast.makeText(requireContext(), R.string.iot_nfc_saved, Toast.LENGTH_SHORT).show()
            refreshLocalScans(localScansText, app)
        }

        view.findViewById<Button>(R.id.btnQrScan).setOnClickListener {
            app.iotRepository.cacheQrScan("device://scale-warehouse-01")
            Toast.makeText(requireContext(), R.string.iot_qr_saved, Toast.LENGTH_SHORT).show()
            refreshLocalScans(localScansText, app)
        }

        lifecycleScope.launch {
            val devices = app.iotRepository.syncOffline() ?: app.iotRepository.getCachedDevices()
            val telemetry = app.iotRepository.getCachedTelemetry()
            devicesText.text = devices?.devices?.joinToString("\n") {
                "• ${it.name} [${it.deviceType}] bat=${it.batteryLevel ?: "—"}%"
            } ?: getString(R.string.iot_offline_cache)
            telemetryText.text = telemetry.take(15).joinToString("\n") {
                "${it.deviceKey}: ${it.metricKey}=${it.value ?: it.valueText}"
            }.ifBlank { getString(R.string.iot_no_telemetry) }
            refreshLocalScans(localScansText, app)
        }
    }

    private fun refreshLocalScans(textView: TextView, app: AgroErpApp) {
        val ble = app.iotRepository.getBleDiscovered()
        val nfc = app.iotRepository.getLastNfcTag()
        val qr = app.iotRepository.getLastQrScan()
        textView.text = buildString {
            append("BLE: ${ble.joinToString()}\n")
            append("NFC: ${nfc ?: "—"}\n")
            append("QR: ${qr ?: "—"}")
        }
    }
}
