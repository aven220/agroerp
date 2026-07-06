package com.agroerp.prm.ui.eop

import android.os.Bundle
import android.provider.Settings
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

class EopFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eop, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val pendingText = view.findViewById<TextView>(R.id.pendingText)
        val telemetryText = view.findViewById<TextView>(R.id.telemetryText)
        val app = requireActivity().application as AgroErpApp
        val deviceId = Settings.Secure.getString(requireContext().contentResolver, Settings.Secure.ANDROID_ID) ?: "android-demo"

        view.findViewById<Button>(R.id.btnReportCrash).setOnClickListener {
            app.eopRepository.reportCrash(deviceId, "Simulated crash", "at EopFragment.onViewCreated")
            Toast.makeText(requireContext(), R.string.eop_crash_queued, Toast.LENGTH_SHORT).show()
            refresh(pendingText, telemetryText, app)
        }

        view.findViewById<Button>(R.id.btnReportPerf).setOnClickListener {
            app.eopRepository.reportPerformance(deviceId, 120L + (0..80).random())
            Toast.makeText(requireContext(), R.string.eop_perf_queued, Toast.LENGTH_SHORT).show()
            refresh(pendingText, telemetryText, app)
        }

        view.findViewById<Button>(R.id.btnOfflineUsage).setOnClickListener {
            app.eopRepository.reportOfflineUsage(deviceId)
            Toast.makeText(requireContext(), R.string.eop_offline_queued, Toast.LENGTH_SHORT).show()
            refresh(pendingText, telemetryText, app)
        }

        view.findViewById<Button>(R.id.btnSyncObs).setOnClickListener {
            lifecycleScope.launch {
                app.eopRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.eop_sync_done, Toast.LENGTH_SHORT).show()
                refresh(pendingText, telemetryText, app)
            }
        }

        lifecycleScope.launch {
            app.eopRepository.syncOffline()
            refresh(pendingText, telemetryText, app)
        }
    }

    private fun refresh(pendingText: TextView, telemetryText: TextView, app: AgroErpApp) {
        val pending = app.eopRepository.getPending()
        val telemetry = app.eopRepository.getCachedTelemetry()
        pendingText.text = getString(R.string.eop_pending_count, pending.size)
        telemetryText.text = telemetry.take(15).joinToString("\n") {
            "• ${it.eventType} offline=${it.isOffline} ${it.message ?: ""}"
        }.ifBlank { getString(R.string.eop_no_telemetry) }
    }
}
