package com.agroerp.prm.ui.bre

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.launch

class RulesFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_rules, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val rulesText = view.findViewById<TextView>(R.id.rulesText)
        val execText = view.findViewById<TextView>(R.id.executionsText)
        val app = requireActivity().application as AgroErpApp

        lifecycleScope.launch {
            val config = app.breRepository.syncOffline() ?: app.breRepository.getCachedConfig()
            val executions = app.breRepository.getCachedExecutions()
            rulesText.text = config?.rules?.joinToString("\n") { "• ${it.ruleKey} (${it.eventCategory}) v${it.version}" }
                ?: "Sin reglas en caché offline"
            execText.text = executions.take(20).joinToString("\n") {
                "${it.ruleKey}: ${it.status} match=${it.matched} ${it.durationMs}ms"
            }.ifBlank { "Sin ejecuciones recientes" }
        }
    }
}
