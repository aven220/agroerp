package com.agroerp.prm.ui.eip

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

class EipFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eip, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val errorsText = view.findViewById<TextView>(R.id.errorsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eipRepository.syncStatus()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eip_sync_ok else R.string.eip_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, errorsText, app)
            }
        }

        lifecycleScope.launch {
            app.eipRepository.syncStatus()
            refresh(statusText, errorsText, app)
        }
    }

    private suspend fun refresh(statusText: TextView, errorsText: TextView, app: AgroErpApp) {
        val status = app.eipRepository.getCachedStatus()
        val errors = app.eipRepository.getCachedErrors()
        val indicators = status?.get("indicators") as? Map<*, *>
        val critical = app.eipRepository.criticalAlerts()
        statusText.text = buildString {
            append(getString(R.string.eip_authorized))
            append(": ")
            append(status?.get("authorized") ?: false)
            append("\n")
            append(getString(R.string.eip_health))
            append(": ")
            append(indicators?.get("healthScore") ?: "—")
            append("\n")
            append(getString(R.string.eip_critical))
            append(": ")
            append(critical)
        }
        errorsText.text = errors.take(8).joinToString("\n") { err ->
            "${err["channel"] ?: "?"} → ${err["errorMessage"] ?: err["targetRef"]}"
        }.ifBlank { getString(R.string.eip_no_errors) }
    }
}
