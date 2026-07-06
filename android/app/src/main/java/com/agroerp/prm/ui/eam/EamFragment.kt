package com.agroerp.prm.ui.eam

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

class EamFragment : Fragment() {
    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_eam, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val app = requireActivity().application as AgroErpApp
        val summaryText = view.findViewById<TextView>(R.id.eamSummaryText)

        view.findViewById<Button>(R.id.btnEamSync).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.syncMobile()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.eam_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEamAssets).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.listAssets()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEamScan).setOnClickListener {
            lifecycleScope.launch {
                val assets = app.eamRepository.listAssets()
                val first = assets.firstOrNull()
                if (first != null) {
                    val code = first["qrCode"]?.toString() ?: first["barcode"]?.toString() ?: ""
                    if (code.isNotEmpty()) app.eamRepository.scanAsset(code)
                }
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEamCmms).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.syncCmmsMobile()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.eam_cmms_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEamCmmsOrders).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.listCmmsWorkOrders()
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEamRelSync).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.syncReliabilityMobile()
                refresh(summaryText, app)
                Toast.makeText(requireContext(), R.string.eam_rel_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnEamRelReading).setOnClickListener {
            lifecycleScope.launch {
                val assets = app.eamRepository.listAssets()
                val first = assets.firstOrNull()
                val key = first?.get("assetKey")?.toString()
                if (key != null) {
                    app.eamRepository.recordConditionReading(key, "temperature", 40.0)
                }
                refresh(summaryText, app)
            }
        }

        view.findViewById<Button>(R.id.btnEamRelAlerts).setOnClickListener {
            lifecycleScope.launch {
                app.eamRepository.listReliabilityAlerts()
                refresh(summaryText, app)
            }
        }

        lifecycleScope.launch { refresh(summaryText, app) }
    }

    private suspend fun refresh(summaryText: TextView, app: AgroErpApp) {
        val assets = app.eamRepository.listAssets()
        val dash = app.eamRepository.getDashboard()
        val cmmsOrders = app.eamRepository.listCmmsWorkOrders()
        val relExec = app.eamRepository.getReliabilityExecutive()
        val relAlerts = app.eamRepository.listReliabilityAlerts()
        val relReadings = app.eamRepository.listReliabilityReadings()
        summaryText.text = buildString {
            append("— EAM —\n")
            append("Activos: ${assets.size}\n")
            append("Valor total: ${dash["totalValue"] ?: 0}\n")
            append("Operativos: ${dash["operationalPct"] ?: 0}%\n")
            append("Garantías por vencer: ${dash["expiringWarranties"] ?: 0}\n")
            append("\n— CMMS —\n")
            append("Órdenes: ${cmmsOrders.size}\n")
            append("\n— Confiabilidad —\n")
            val reliability = relExec["reliability"] as? Map<*, *>
            append("Disponibilidad: ${reliability?.get("availability") ?: "—"}%\n")
            append("Alertas: ${relAlerts.size}\n")
            append("Lecturas: ${relReadings.size}\n")
        }
    }
}
