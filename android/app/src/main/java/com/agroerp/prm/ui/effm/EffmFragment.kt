package com.agroerp.prm.ui.effm

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

class EffmFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_effm, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val assignmentsText = view.findViewById<TextView>(R.id.assignmentsText)
        val qrInput = view.findViewById<EditText>(R.id.qrInput)
        val machineInput = view.findViewById<EditText>(R.id.machineInput)
        val fuelInput = view.findViewById<EditText>(R.id.fuelInput)
        val incidentInput = view.findViewById<EditText>(R.id.incidentInput)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.effmRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.effm_sync_ok else R.string.effm_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, assignmentsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnQr).setOnClickListener {
            lifecycleScope.launch {
                val code = qrInput.text.toString().trim()
                if (code.isBlank()) return@launch
                val machine = app.effmRepository.resolveQr(code)
                Toast.makeText(
                    requireContext(),
                    if (machine != null) R.string.effm_qr_ok else R.string.effm_qr_fail,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnStartOp).setOnClickListener {
            lifecycleScope.launch {
                val machineId = machineInput.text.toString().trim()
                if (machineId.isBlank()) return@launch
                val result = app.effmRepository.startOperation(machineId, null)
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.effm_operation_ok else R.string.effm_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnFuel).setOnClickListener {
            lifecycleScope.launch {
                val machineId = machineInput.text.toString().trim()
                val liters = fuelInput.text.toString().toDoubleOrNull() ?: 0.0
                if (machineId.isBlank()) return@launch
                val result = app.effmRepository.recordFuel(machineId, liters)
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.effm_fuel_ok else R.string.effm_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnIncident).setOnClickListener {
            lifecycleScope.launch {
                val desc = incidentInput.text.toString().trim()
                if (desc.isBlank()) return@launch
                val result = app.effmRepository.recordIncident(desc, machineInput.text.toString().trim().ifBlank { null }, emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.effm_incident_ok else R.string.effm_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.effmRepository.syncAll()
            refresh(statusText, assignmentsText, app)
        }
    }

    private fun refresh(statusText: TextView, assignmentsText: TextView, app: AgroErpApp) {
        val sync = app.effmRepository.getCachedSync()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.effm_machines))
            append(": ")
            append(indicators?.get("activeMachines") ?: "—")
            append("\n")
            append(getString(R.string.effm_utilization))
            append(": ")
            append((dashboard?.get("performance") as? Map<*, *>)?.get("utilizationPct") ?: "—")
            append("%\n")
            append(getString(R.string.effm_operations))
            append(": ")
            append(indicators?.get("operations30d") ?: "—")
        }
        assignmentsText.text = app.effmRepository.getCachedAssignments().take(6).joinToString("\n") { a ->
            "${a["employeeRef"]} → ${(a["machine"] as? Map<*, *>)?.get("name") ?: "—"}"
        }.ifBlank { getString(R.string.effm_no_assignments) }
    }
}
