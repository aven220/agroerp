package com.agroerp.prm.ui.eppm

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

class PluginsFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_plugins, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val pluginsText = view.findViewById<TextView>(R.id.pluginsText)
        val resourcesText = view.findViewById<TextView>(R.id.resourcesText)
        val app = requireActivity().application as AgroErpApp

        lifecycleScope.launch {
            val installed = app.pluginsRepository.syncOffline() ?: app.pluginsRepository.getCachedInstalled()
            val resources = app.pluginsRepository.getCachedResources()
            pluginsText.text = installed?.plugins?.joinToString("\n") {
                "• ${it.name} v${it.version} [${it.pluginType}]"
            } ?: "Sin plugins en caché offline"
            resourcesText.text = resources.joinToString("\n") {
                "${it.pluginKey}: ${it.screens.size} pantallas móviles"
            }.ifBlank { "Sin recursos móviles" }
        }
    }
}
