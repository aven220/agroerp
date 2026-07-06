package com.agroerp.prm.ui.eih

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

class EihFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eih, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val connectorsText = view.findViewById<TextView>(R.id.connectorsText)
        val syncText = view.findViewById<TextView>(R.id.syncText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eihRepository.syncOffline()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eih_sync_ok else R.string.eih_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(connectorsText, syncText, app)
            }
        }

        view.findViewById<Button>(R.id.btnReceiveExternal).setOnClickListener {
            val payload = """{"source":"external","timestamp":${System.currentTimeMillis()}}"""
            app.eihRepository.cacheExternalPayload("payment-gateway", payload)
            Toast.makeText(requireContext(), R.string.eih_external_saved, Toast.LENGTH_SHORT).show()
        }

        lifecycleScope.launch {
            app.eihRepository.syncOffline()
            refresh(connectorsText, syncText, app)
        }
    }

    private fun refresh(connectorsText: TextView, syncText: TextView, app: AgroErpApp) {
        val connectors = app.eihRepository.getCachedConnectors()
        val syncRuns = app.eihRepository.getCachedSyncRuns()
        connectorsText.text = connectors?.connectors?.joinToString("\n") {
            "• ${it.name} [${it.protocol}/${it.category}]"
        } ?: getString(R.string.eih_offline_cache)
        syncText.text = syncRuns.take(10).joinToString("\n") {
            "${it.runKey}: ${it.status} in=${it.recordsIn} out=${it.recordsOut}"
        }.ifBlank { getString(R.string.eih_no_sync) }
    }
}
