package com.agroerp.prm.ui.eace

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class EaceFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eace, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val contractsText = view.findViewById<TextView>(R.id.contractsText)
        val visitsText = view.findViewById<TextView>(R.id.visitsText)
        val notificationsText = view.findViewById<TextView>(R.id.notificationsText)
        val evidenceInput = view.findViewById<EditText>(R.id.evidenceInput)
        val visitKeyInput = view.findViewById<EditText>(R.id.visitKeyInput)
        val profileSpinner = view.findViewById<Spinner>(R.id.profileSpinner)
        val app = requireActivity().application as AgroErpApp

        val roles = listOf("producer", "cooperative", "contractor", "advisor", "executive")
        profileSpinner.adapter = ArrayAdapter(requireContext(), android.R.layout.simple_spinner_dropdown_item, roles)
        profileSpinner.setSelection(roles.indexOf(app.eaceRepository.getProfileRole()).coerceAtLeast(0))

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val role = profileSpinner.selectedItem as String
                app.eaceRepository.setProfileRole(role)
                val result = app.eaceRepository.syncAll(role)
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eace_sync_ok else R.string.eace_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, contractsText, visitsText, notificationsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEvidence).setOnClickListener {
            lifecycleScope.launch {
                val visitKey = visitKeyInput.text.toString().trim()
                val evidence = evidenceInput.text.toString().trim()
                if (visitKey.isBlank() || evidence.isBlank()) return@launch
                val result = app.eaceRepository.uploadVisitEvidence(visitKey, listOf(evidence), emptyList())
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eace_evidence_ok else R.string.eace_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eaceRepository.syncAll()
            refresh(statusText, contractsText, visitsText, notificationsText, app)
        }
    }

    private fun refresh(
        statusText: TextView,
        contractsText: TextView,
        visitsText: TextView,
        notificationsText: TextView,
        app: AgroErpApp,
    ) {
        val sync = app.eaceRepository.getCachedSync()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eace_producers))
            append(": ")
            append(indicators?.get("activeProducers") ?: "—")
            append("\n")
            append(getString(R.string.eace_contracts))
            append(": ")
            append(indicators?.get("activeContracts") ?: "—")
            append("\n")
            append(getString(R.string.eace_ecosystem_score))
            append(": ")
            append(indicators?.get("ecosystemScore") ?: "—")
        }
        contractsText.text = app.eaceRepository.getCachedContracts().take(5).joinToString("\n") { c ->
            "${c["title"] ?: c["contractKey"]}"
        }.ifBlank { getString(R.string.eace_no_contracts) }
        visitsText.text = app.eaceRepository.getCachedVisits().take(5).joinToString("\n") { v ->
            "${v["visitKey"]}: ${v["summary"] ?: v["status"]}"
        }.ifBlank { getString(R.string.eace_no_visits) }
        notificationsText.text = app.eaceRepository.getCachedNotifications().take(5).joinToString("\n") { n ->
            "${n["title"]}"
        }.ifBlank { getString(R.string.eace_no_notifications) }
    }
}
