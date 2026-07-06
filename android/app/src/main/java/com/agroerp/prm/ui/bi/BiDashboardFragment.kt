package com.agroerp.prm.ui.bi

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class BiDashboardFragment : Fragment() {
    private lateinit var container: LinearLayout
    private lateinit var statusText: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? {
        val view = inflater.inflate(R.layout.fragment_bi_dashboard, container, false)
        this.container = view.findViewById(R.id.biKpiContainer)
        this.statusText = view.findViewById(R.id.biStatusText)
        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadData()
    }

    private fun loadData() {
        val repo = (requireActivity().application as AgroErpApp).biRepository
        lifecycleScope.launch {
            try {
                val realtime = withContext(Dispatchers.IO) { repo.fetchRealtime() }
                statusText.text = "Actualizado: ${realtime.timestamp.take(19)}"
                container.removeAllViews()
                for (kpi in realtime.kpis) {
                    val card = layoutInflater.inflate(R.layout.item_bi_kpi, container, false)
                    card.findViewById<TextView>(R.id.kpiName).text = kpi.name
                    card.findViewById<TextView>(R.id.kpiValue).text =
                        "${kpi.currentValue?.toInt() ?: "—"}${kpi.unit?.let { " $it" } ?: ""}"
                    card.findViewById<TextView>(R.id.kpiTarget).text =
                        "Meta: ${kpi.targetValue?.toInt() ?: "—"}"
                    container.addView(card)
                }
                if (realtime.kpis.isEmpty()) {
                    statusText.text = "Sin KPIs configurados"
                }
            } catch (e: Exception) {
                statusText.text = "Error: ${e.message}"
            }
        }
    }
}
