package com.agroerp.prm.ui.eims

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
import com.agroerp.prm.data.api.EimsMovementRequest
import kotlinx.coroutines.launch

class EimsFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eims, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val itemsText = view.findViewById<TextView>(R.id.itemsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnScanQr).setOnClickListener {
            val code = app.eimsRepository.getCachedItems().firstOrNull()?.qrCode ?: "EIMS:CAF-PERG-001"
            app.eimsRepository.cacheScan("qr", code)
            Toast.makeText(requireContext(), R.string.eims_qr_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnScanBarcode).setOnClickListener {
            val code = app.eimsRepository.getCachedItems().firstOrNull()?.barcode ?: "CAFPERG001"
            app.eimsRepository.cacheScan("barcode", code)
            Toast.makeText(requireContext(), R.string.eims_barcode_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnScanLotQr).setOnClickListener {
            val code = app.eimsRepository.getCachedLots().firstOrNull()?.get("qrCode")?.toString()
                ?: "EIMS:LOT:CAF-PERG-001:LOT-DEMO"
            app.eimsRepository.cacheScan("qr", code)
            Toast.makeText(requireContext(), R.string.eims_lot_qr_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnScanLotBarcode).setOnClickListener {
            val code = app.eimsRepository.getCachedLots().firstOrNull()?.get("barcode")?.toString()
                ?: "CAFPERG001LOTDEMO"
            app.eimsRepository.cacheScan("barcode", code)
            Toast.makeText(requireContext(), R.string.eims_lot_barcode_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnLotIncident).setOnClickListener {
            val lotKey = app.eimsRepository.getCachedLots().firstOrNull()?.get("lotKey")?.toString()
                ?: app.eimsRepository.getCachedLot(
                    app.eimsRepository.getLastScan("qr") ?: app.eimsRepository.getLastScan("barcode") ?: "",
                )?.get("lotKey")?.toString()
                ?: "LOT-DEMO"
            app.eimsRepository.queueIncident(lotKey, "Incidencia móvil", "Registrada offline")
            Toast.makeText(requireContext(), R.string.eims_incident_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnCountCapture).setOnClickListener {
            val countKey = app.eimsRepository.getCachedCounts().firstOrNull()?.get("countKey")?.toString()
                ?: "CNT-DEMO"
            val code = app.eimsRepository.getLastScan("qr")
                ?: app.eimsRepository.getLastScan("barcode")
                ?: app.eimsRepository.getCachedItems().firstOrNull()?.qrCode
                ?: "EIMS:CAF-PERG-001"
            app.eimsRepository.queueCountCapture(
                countKey,
                mapOf(
                    "scannedCode" to code,
                    "quantity" to 1.0,
                    "round" to "first",
                    "method" to "qr",
                    "offline" to true,
                ),
            )
            Toast.makeText(requireContext(), R.string.eims_count_capture_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnCountPhoto).setOnClickListener {
            val countKey = app.eimsRepository.getCachedCounts().firstOrNull()?.get("countKey")?.toString()
                ?: "CNT-DEMO"
            app.eimsRepository.queueCountPhoto(countKey, "Incidencia física en conteo")
            Toast.makeText(requireContext(), R.string.eims_count_photo_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnEntryOffline).setOnClickListener {
            val itemKey = app.eimsRepository.getCachedItems().firstOrNull()?.itemKey ?: "CAF-PERG-001"
            app.eimsRepository.queueOfflineMovement(
                EimsMovementRequest(
                    movementType = "entry",
                    itemKey = itemKey,
                    quantity = 10.0,
                    toWarehouseKey = "WH-MAIN",
                    lotKey = "LOT-MOB-${System.currentTimeMillis() % 10000}",
                    unitCost = 12000.0,
                    reason = "Entrada móvil offline",
                ),
            )
            Toast.makeText(requireContext(), R.string.eims_movement_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnExitOffline).setOnClickListener {
            val itemKey = app.eimsRepository.getCachedItems().firstOrNull()?.itemKey ?: "CAF-PERG-001"
            app.eimsRepository.queueOfflineMovement(
                EimsMovementRequest(
                    movementType = "exit",
                    itemKey = itemKey,
                    quantity = 1.0,
                    fromWarehouseKey = "WH-MAIN",
                    reason = "Salida móvil offline",
                ),
            )
            Toast.makeText(requireContext(), R.string.eims_movement_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, itemsText, app)
        }

        view.findViewById<Button>(R.id.btnSyncEims).setOnClickListener {
            lifecycleScope.launch {
                app.eimsRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.eims_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, itemsText, app)
            }
        }

        lifecycleScope.launch {
            app.eimsRepository.syncOffline()
            refresh(statusText, itemsText, app)
        }
    }

    private fun refresh(statusText: TextView, itemsText: TextView, app: AgroErpApp) {
        val items = app.eimsRepository.getCachedItems()
        val lots = app.eimsRepository.getCachedLots()
        statusText.text = buildString {
            append(getString(R.string.eims_items_count, items.size))
            append('\n')
            append(getString(R.string.eims_lots_count, lots.size))
            append('\n')
            append(getString(R.string.eims_counts_count, app.eimsRepository.getCachedCounts().size))
            append('\n')
            append("Reservas: ${app.eimsRepository.getCachedReservations().size}")
            append('\n')
            append("Alertas abast.: ${app.eimsRepository.getCachedSupplyAlerts().size}")
            append('\n')
            append("Sugerencias: ${app.eimsRepository.getCachedSupplySuggestions().size}")
            append('\n')
            val opsKpis = app.eimsRepository.getCachedOpsKpis()
            append("KPI rotación: ${opsKpis?.get("turnover") ?: "—"}")
            append('\n')
            append("Alertas ops: ${app.eimsRepository.getCachedOpsAlerts().size}")
            append('\n')
            append("Reportes: ${app.eimsRepository.getCachedOpsReportRuns().size}")
            append('\n')
            append(getString(R.string.eims_pending_movements, app.eimsRepository.pendingMovementCount()))
            append('\n')
            append(getString(R.string.eims_pending_incidents, app.eimsRepository.pendingIncidentCount()))
            append('\n')
            append(getString(R.string.eims_pending_count_captures, app.eimsRepository.pendingCountCaptureCount()))
            append('\n')
            append(getString(R.string.eims_catalogs_count, app.eimsRepository.catalogCountOffline()))
            append('\n')
            append("Stock líneas: ${app.eimsRepository.getCachedStock().size}")
            append('\n')
            append("Kardex líneas: ${app.eimsRepository.getCachedKardex().size}")
            append('\n')
            append("Valor inventario: ${app.eimsRepository.getCachedCosts()?.get("total") ?: "—"}")
            append('\n')
            append("QR: ${app.eimsRepository.getLastScan("qr") ?: "—"}")
            append('\n')
            append("Barcode: ${app.eimsRepository.getLastScan("barcode") ?: "—"}")
            val code = app.eimsRepository.getLastScan("qr") ?: app.eimsRepository.getLastScan("barcode")
            if (code != null) {
                val item = app.eimsRepository.getCachedItem(code)
                val lot = app.eimsRepository.getCachedLot(code)
                append('\n')
                append("Artículo: ${item?.get("name") ?: item?.get("itemKey") ?: "offline"}")
                append('\n')
                append("Lote: ${lot?.get("lotKey") ?: "offline"}")
                val lotKey = lot?.get("lotKey")?.toString()
                if (lotKey != null) {
                    val timeline = app.eimsRepository.getCachedLotTimeline(lotKey)
                    append('\n')
                    append("Historial offline: ${timeline.size} eventos")
                    timeline.takeLast(3).forEach { event ->
                        append('\n')
                        append(" · ${event["title"] ?: event["eventType"]}")
                    }
                }
            }
        }
        itemsText.text = buildString {
            append(items.joinToString("\n") {
                "• ${it.itemKey} ${it.name} [${it.itemTypeKey}]"
            }.ifBlank { getString(R.string.eims_no_items) })
            if (lots.isNotEmpty()) {
                append("\n\nLotes:\n")
                append(lots.take(10).joinToString("\n") {
                    "• ${it["lotKey"]} ${it["status"]} qty=${it["onHandQty"]}"
                })
            }
            val reservations = app.eimsRepository.getCachedReservations()
            if (reservations.isNotEmpty()) {
                append("\n\nReservas:\n")
                append(reservations.take(8).joinToString("\n") {
                    "• ${it["reservationKey"]} ${it["itemKey"]} ${it["status"]}"
                })
            }
            val alerts = app.eimsRepository.getCachedSupplyAlerts()
            if (alerts.isNotEmpty()) {
                append("\n\nAlertas:\n")
                append(alerts.take(5).joinToString("\n") {
                    "• ${it["alertType"]} ${it["itemKey"]}"
                })
            }
            val suggestions = app.eimsRepository.getCachedSupplySuggestions()
            if (suggestions.isNotEmpty()) {
                append("\n\nSugerencias:\n")
                append(suggestions.take(5).joinToString("\n") {
                    "• ${it["suggestionType"]} ${it["itemKey"]} qty=${it["suggestedQty"]}"
                })
            }
        }
    }
}
