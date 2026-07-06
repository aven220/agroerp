package com.agroerp.prm.ui.eacc

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

class EaccFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eacc, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val checklistsText = view.findViewById<TextView>(R.id.checklistsText)
        val itemInput = view.findViewById<EditText>(R.id.itemInput)
        val evidenceInput = view.findViewById<EditText>(R.id.evidenceInput)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eaccRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eacc_sync_ok else R.string.eacc_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, checklistsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnCompleteItem).setOnClickListener {
            lifecycleScope.launch {
                val key = itemInput.text.toString().trim()
                if (key.isBlank()) return@launch
                val result = app.eaccRepository.completeChecklistItem(key, "sig-mobile", emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eacc_checklist_ok else R.string.eacc_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnEvidence).setOnClickListener {
            lifecycleScope.launch {
                val title = evidenceInput.text.toString().trim()
                if (title.isBlank()) return@launch
                val result = app.eaccRepository.uploadEvidence(title, null, "sig-mobile")
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eacc_evidence_ok else R.string.eacc_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnAudit).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eaccRepository.recordAudit("internal")
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eacc_audit_ok else R.string.eacc_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        view.findViewById<Button>(R.id.btnInspection).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eaccRepository.recordSafetyInspection("sig-mobile", emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eacc_inspection_ok else R.string.eacc_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eaccRepository.syncAll()
            refresh(statusText, checklistsText, app)
        }
    }

    private fun refresh(statusText: TextView, checklistsText: TextView, app: AgroErpApp) {
        val sync = app.eaccRepository.getCachedSync()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eacc_certifications))
            append(": ")
            append(indicators?.get("activeCertifications") ?: "—")
            append("\n")
            append(getString(R.string.eacc_compliance))
            append(": ")
            append(indicators?.get("complianceRate") ?: "—")
            append("%\n")
            append(getString(R.string.eacc_findings))
            append(": ")
            append(indicators?.get("openFindings") ?: "—")
        }
        checklistsText.text = app.eaccRepository.getCachedChecklists().take(6).joinToString("\n") { chk ->
            "${chk["name"]} (${(chk["items"] as? List<*>)?.size ?: 0} items)"
        }.ifBlank { getString(R.string.eacc_no_checklists) }
    }
}
