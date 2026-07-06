package com.agroerp.prm.ui.eaip

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

class EaipFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eaip, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val recommendationsText = view.findViewById<TextView>(R.id.recommendationsText)
        val simulationsText = view.findViewById<TextView>(R.id.simulationsText)
        val alertsText = view.findViewById<TextView>(R.id.alertsText)
        val assistantInput = view.findViewById<EditText>(R.id.assistantInput)
        val assistantResponse = view.findViewById<TextView>(R.id.assistantResponse)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eaipRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eaip_sync_ok else R.string.eaip_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, recommendationsText, simulationsText, alertsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnAssistant).setOnClickListener {
            lifecycleScope.launch {
                val question = assistantInput.text.toString().trim()
                if (question.isBlank()) return@launch
                val answer = app.eaipRepository.chatWithAssistant(question)
                assistantResponse.text = answer ?: getString(R.string.eaip_assistant_offline)
            }
        }

        lifecycleScope.launch {
            app.eaipRepository.syncAll()
            refresh(statusText, recommendationsText, simulationsText, alertsText, app)
        }
    }

    private fun refresh(
        statusText: TextView,
        recommendationsText: TextView,
        simulationsText: TextView,
        alertsText: TextView,
        app: AgroErpApp,
    ) {
        val sync = app.eaipRepository.getCachedSync()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eaip_models))
            append(": ")
            append(indicators?.get("activeModels") ?: "—")
            append("\n")
            append(getString(R.string.eaip_predictions))
            append(": ")
            append(indicators?.get("predictions30d") ?: "—")
            append("\n")
            append(getString(R.string.eaip_recommendations))
            append(": ")
            append(indicators?.get("recommendationsActive") ?: "—")
        }
        recommendationsText.text = app.eaipRepository.getCachedRecommendations().take(5).joinToString("\n") { r ->
            "${r["category"]}: ${r["summary"] ?: r["recommendationKey"]}"
        }.ifBlank { getString(R.string.eaip_no_recommendations) }
        simulationsText.text = app.eaipRepository.getCachedSimulations().take(5).joinToString("\n") { s ->
            "${s["title"] ?: s["simulationKey"]}"
        }.ifBlank { getString(R.string.eaip_no_simulations) }
        alertsText.text = app.eaipRepository.getCachedAlerts().take(5).joinToString("\n") { a ->
            "${a["alertType"]}: ${a["message"]}"
        }.ifBlank { getString(R.string.eaip_no_alerts) }
    }
}
