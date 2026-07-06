package com.agroerp.prm.ui.epop

import android.os.Bundle
import android.os.SystemClock
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

class EpopFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_epop, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val localMetricsText = view.findViewById<TextView>(R.id.localMetricsText)
        val summaryText = view.findViewById<TextView>(R.id.summaryText)
        val app = requireActivity().application as AgroErpApp
        val deviceId = Settings.Secure.getString(requireContext().contentResolver, Settings.Secure.ANDROID_ID) ?: "android-perf"

        view.findViewById<Button>(R.id.btnCapturePerf).setOnClickListener {
            app.epopRepository.captureLocalSample(deviceId)
            Toast.makeText(requireContext(), R.string.epop_captured, Toast.LENGTH_SHORT).show()
            refresh(localMetricsText, summaryText, app)
        }

        view.findViewById<Button>(R.id.btnListRender).setOnClickListener {
            val start = SystemClock.elapsedRealtime()
            // Simulate optimized list render budget
            val items = List(1000) { "row-$it" }
            items.take(20)
            val elapsed = SystemClock.elapsedRealtime() - start
            app.epopRepository.captureLocalSample(deviceId, listRenderMs = elapsed.coerceAtLeast(1), fps = 60.0)
            refresh(localMetricsText, summaryText, app)
        }

        view.findViewById<Button>(R.id.btnOfflineOps).setOnClickListener {
            app.epopRepository.captureLocalSample(deviceId, offlineOps = 5)
            Toast.makeText(requireContext(), R.string.epop_offline_queued, Toast.LENGTH_SHORT).show()
            refresh(localMetricsText, summaryText, app)
        }

        view.findViewById<Button>(R.id.btnSyncPerf).setOnClickListener {
            lifecycleScope.launch {
                app.epopRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.epop_sync_done, Toast.LENGTH_SHORT).show()
                refresh(localMetricsText, summaryText, app)
            }
        }

        lifecycleScope.launch {
            app.epopRepository.syncOffline()
            refresh(localMetricsText, summaryText, app)
        }
    }

    private fun refresh(localMetricsText: TextView, summaryText: TextView, app: AgroErpApp) {
        val pending = app.epopRepository.getPending()
        localMetricsText.text = buildString {
            append(getString(R.string.epop_startup_ms, app.epopRepository.measureStartupMs()))
            append('\n')
            append(getString(R.string.epop_memory_mb, app.epopRepository.currentMemoryMb()))
            append('\n')
            append(getString(R.string.epop_battery_pct, app.epopRepository.currentBatteryPct()))
            append('\n')
            append(getString(R.string.epop_pending_count, pending.size))
        }
        val summary = app.epopRepository.getCachedSummary()
        summaryText.text = summary?.let {
            "avgStartup=${it.avgStartupMs.toInt()}ms fps=${it.avgFps} sync=${it.avgSyncMs.toInt()}ms offlineOps=${it.offlineOps}"
        } ?: getString(R.string.epop_no_summary)
    }
}
