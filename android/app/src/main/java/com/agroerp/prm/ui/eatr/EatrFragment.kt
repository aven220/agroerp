package com.agroerp.prm.ui.eatr

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

class EatrFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eatr, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val historyText = view.findViewById<TextView>(R.id.historyText)
        val qrInput = view.findViewById<EditText>(R.id.qrInput)
        val lotInput = view.findViewById<EditText>(R.id.lotInput)
        val weightInput = view.findViewById<EditText>(R.id.weightInput)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eatrRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eatr_sync_ok else R.string.eatr_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, historyText, app)
            }
        }

        view.findViewById<Button>(R.id.btnQr).setOnClickListener {
            lifecycleScope.launch {
                val code = qrInput.text.toString().trim()
                if (code.isBlank()) return@launch
                val trace = app.eatrRepository.queryTrace(qrCode = code, lotKey = null)
                Toast.makeText(
                    requireContext(),
                    if (trace != null) R.string.eatr_qr_ok else R.string.eatr_qr_fail,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, historyText, app)
            }
        }

        view.findViewById<Button>(R.id.btnHarvest).setOnClickListener {
            lifecycleScope.launch {
                val lot = lotInput.text.toString().trim()
                val weight = weightInput.text.toString().toDoubleOrNull() ?: 0.0
                if (lot.isBlank()) return@launch
                val result = app.eatrRepository.recordHarvest(lot, weight, emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eatr_harvest_ok else R.string.eatr_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnWeighing).setOnClickListener {
            lifecycleScope.launch {
                val lot = lotInput.text.toString().trim()
                val weight = weightInput.text.toString().toDoubleOrNull() ?: 0.0
                if (lot.isBlank()) return@launch
                val result = app.eatrRepository.recordWeighing(lot, weight)
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eatr_weighing_ok else R.string.eatr_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnInspection).setOnClickListener {
            lifecycleScope.launch {
                val lot = lotInput.text.toString().trim()
                if (lot.isBlank()) return@launch
                val result = app.eatrRepository.recordInspection(lot, 70.0, 3.0, emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eatr_inspection_ok else R.string.eatr_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eatrRepository.syncAll()
            refresh(statusText, historyText, app)
        }
    }

    private fun refresh(statusText: TextView, historyText: TextView, app: AgroErpApp) {
        val sync = app.eatrRepository.getCachedSync()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eatr_production_lots))
            append(": ")
            append(indicators?.get("productionLots") ?: "—")
            append("\n")
            append(getString(R.string.eatr_commercial_lots))
            append(": ")
            append(indicators?.get("commercialLots") ?: "—")
            append("\n")
            append(getString(R.string.eatr_trace_score))
            append(": ")
            append(indicators?.get("traceScore") ?: "—")
        }
        historyText.text = app.eatrRepository.getCachedHistory().take(6).joinToString("\n") { entry ->
            "${entry["qrCode"] ?: entry["lotKey"]}"
        }.ifBlank { getString(R.string.eatr_no_history) }
    }
}
