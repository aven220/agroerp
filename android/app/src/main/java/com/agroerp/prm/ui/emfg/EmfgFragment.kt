package com.agroerp.prm.ui.emfg

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

class EmfgFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_emfg, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val summaryText = view.findViewById<TextView>(R.id.emfgSummaryText)
        val ordersText = view.findViewById<TextView>(R.id.emfgOrdersText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncEmfg).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnMesStart).setOnClickListener {
            lifecycleScope.launch {
                val orders = app.emfgRepository.getCachedOrders()
                val first = orders.firstOrNull() ?: return@launch
                val key = first["orderKey"]?.toString() ?: return@launch
                app.emfgRepository.mesExecute(key, "start")
                Toast.makeText(requireContext(), R.string.emfg_mes_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnMesProduce).setOnClickListener {
            lifecycleScope.launch {
                val orders = app.emfgRepository.getCachedOrders()
                val first = orders.firstOrNull() ?: return@launch
                val key = first["orderKey"]?.toString() ?: return@launch
                app.emfgRepository.mesProduce(key, "good", 1.0)
                Toast.makeText(requireContext(), R.string.emfg_mes_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnMesConsume).setOnClickListener {
            lifecycleScope.launch {
                val orders = app.emfgRepository.getCachedOrders()
                val first = orders.firstOrNull() ?: return@launch
                val key = first["orderKey"]?.toString() ?: return@launch
                val mats = first["materials"] as? List<*> ?: emptyList<Any>()
                val comp = (mats.firstOrNull() as? Map<*, *>)?.get("componentKey")?.toString() ?: "MAT-001"
                app.emfgRepository.mesConsume(key, comp, 1.0)
                Toast.makeText(requireContext(), R.string.emfg_mes_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnMesScan).setOnClickListener {
            lifecycleScope.launch {
                val orders = app.emfgRepository.getCachedOrders()
                val first = orders.firstOrNull() ?: return@launch
                val key = first["orderKey"]?.toString() ?: return@launch
                app.emfgRepository.mesCaptureBarcode(key, "SCAN-${System.currentTimeMillis()}")
                Toast.makeText(requireContext(), R.string.emfg_mes_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnMesFlush).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.flushOfflineQueue()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        var lastInspectionKey: String? = null

        view.findViewById<Button>(R.id.btnQmsInspect).setOnClickListener {
            lifecycleScope.launch {
                val result = app.emfgRepository.qmsCreateInspection(
                    mapOf("inspectionType" to "in_process", "itemKey" to "FG-001"),
                )
                lastInspectionKey = result["inspectionKey"]?.toString()
                app.emfgRepository.qmsAddMeasurement(lastInspectionKey ?: return@launch, "Peso", 1.0)
                Toast.makeText(requireContext(), R.string.emfg_qms_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnQmsScanLot).setOnClickListener {
            lifecycleScope.launch {
                val key = lastInspectionKey ?: return@launch
                app.emfgRepository.qmsScanLot(key, "LOT-SCAN-${System.currentTimeMillis()}")
                Toast.makeText(requireContext(), R.string.emfg_qms_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnQmsFlush).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.flushQmsOfflineQueue()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnResEquip).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.listResourceEquipment()
                Toast.makeText(requireContext(), R.string.emfg_res_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnResMaint).setOnClickListener {
            lifecycleScope.launch {
                val list = app.emfgRepository.listResourceEquipment()
                val first = list.firstOrNull() ?: return@launch
                val key = first["equipmentKey"]?.toString() ?: return@launch
                app.emfgRepository.resRecordMaintenance(key, "Mantenimiento desde móvil")
                Toast.makeText(requireContext(), R.string.emfg_res_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnResScan).setOnClickListener {
            lifecycleScope.launch {
                val list = app.emfgRepository.listResourceEquipment()
                val first = list.firstOrNull() ?: return@launch
                val key = first["equipmentKey"]?.toString() ?: return@launch
                app.emfgRepository.resScanEquipment(key, "EQ-${System.currentTimeMillis()}")
                Toast.makeText(requireContext(), R.string.emfg_res_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnResFlush).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.flushResOfflineQueue()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnCostDash).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.getCostDashboard()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnCostWip).setOnClickListener {
            lifecycleScope.launch {
                val orders = app.emfgRepository.getCachedOrders()
                val first = orders.firstOrNull() ?: return@launch
                val key = first["orderKey"]?.toString() ?: return@launch
                app.emfgRepository.getCostWip(key)
                app.emfgRepository.runCostCalculation(key)
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnIntelDash).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.getIntelligenceDashboard()
                app.emfgRepository.getAuthorizedSimulations()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
                refresh(summaryText, ordersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnIntelKpi).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.getIntelligenceKpis()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnIntelOee).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.getIntelligenceOee()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnIntelAlerts).setOnClickListener {
            lifecycleScope.launch {
                app.emfgRepository.getIntelligenceAlerts()
                Toast.makeText(requireContext(), R.string.emfg_sync_done, Toast.LENGTH_SHORT).show()
            }
        }

        lifecycleScope.launch {
            app.emfgRepository.syncOffline()
            refresh(summaryText, ordersText, app)
        }
    }

    private fun refresh(summaryText: TextView, ordersText: TextView, app: AgroErpApp) {
        val center = app.emfgRepository.getCachedCenter()
        val capacity = center["capacity"] as? Map<*, *> ?: emptyMap<Any, Any>()
        val orders = app.emfgRepository.getCachedOrders()
        val schedule = app.emfgRepository.getCachedSchedule()
        val conflicts = app.emfgRepository.getCachedConflicts()

        summaryText.text = buildString {
            append("— Producción —\n")
            append("Órdenes abiertas: ${center["openOrders"] ?: 0}\n")
            append("Conflictos: ${center["conflictCount"] ?: conflicts.size}\n")
            append("Utilización: ${capacity["utilizationPct"] ?: 0}%\n")
            append("Programaciones: ${schedule.size}\n")
            append("Cola offline MES: ${app.emfgRepository.getOfflineQueueSize()}\n")
            append("Cola offline QMS: ${app.emfgRepository.getQmsOfflineQueueSize()}\n")
            append("Cola offline Recursos: ${app.emfgRepository.getResOfflineQueueSize()}\n")
        }

        ordersText.text = buildString {
            append("— Órdenes activas (${orders.size}) —\n")
            orders.take(15).forEach { o ->
                append("• ${o["orderNumber"]} ${o["itemKey"]} [${o["status"]}] ")
                append("${o["producedQty"]}/${o["plannedQty"]}\n")
                val ops = o["operations"] as? List<*> ?: emptyList<Any>()
                ops.take(3).forEach { op ->
                    val row = op as? Map<*, *>
                    append("  ↳ ${row?.get("name")} (${row?.get("status")})\n")
                }
            }
        }
    }
}
