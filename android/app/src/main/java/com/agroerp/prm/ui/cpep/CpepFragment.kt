package com.agroerp.prm.ui.cpep

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
import com.agroerp.prm.data.api.CpepTicketRequest
import kotlinx.coroutines.launch

class CpepFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_cpep, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val queueText = view.findViewById<TextView>(R.id.queueText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnReceiveOffline).setOnClickListener {
            app.cpepRepository.queueOfflineTicket(
                CpepTicketRequest(
                    producerName = "Productor móvil",
                    identityDoc = "CC-MOVIL",
                    vehiclePlate = "MOV123",
                    farmName = "Finca móvil",
                    lotCode = "LOT-MOB-${System.currentTimeMillis() % 10000}",
                    latitude = 4.71,
                    longitude = -74.07,
                    notes = "Recepción offline wizard",
                ),
            )
            app.cpepRepository.cacheScan("nfc", "NFC-PRODUCER-DEMO")
            Toast.makeText(requireContext(), R.string.cpep_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }


        view.findViewById<Button>(R.id.btnPhoto).setOnClickListener {
            app.cpepRepository.cacheScan("photo", "photo://reception-${System.currentTimeMillis()}")
            Toast.makeText(requireContext(), R.string.cpep_photo_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnSign).setOnClickListener {
            app.cpepRepository.cacheScan("signature", "sig-producer")
            Toast.makeText(requireContext(), R.string.cpep_sign_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnQr).setOnClickListener {
            app.cpepRepository.cacheScan("qr", "CPEP:RCP-DEMO")
            Toast.makeText(requireContext(), R.string.cpep_qr_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnBarcode).setOnClickListener {
            app.cpepRepository.cacheScan("barcode", "RCPDEMO001")
            Toast.makeText(requireContext(), R.string.cpep_barcode_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnBleScale).setOnClickListener {
            app.cpepRepository.cacheBleScale("AA:BB:CC:DD:EE:01", 1250.0)
            app.cpepRepository.cacheScan("photo", "photo://weighing-ble-${System.currentTimeMillis()}")
            Toast.makeText(requireContext(), R.string.cpep_ble_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnUsbScale).setOnClickListener {
            app.cpepRepository.cacheUsbScale("USB-OTG-SCALE", 250.0)
            Toast.makeText(requireContext(), R.string.cpep_usb_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnWeighOffline).setOnClickListener {
            val ticketKey = app.cpepRepository.getCachedWeighPending().firstOrNull()?.ticketKey
                ?: app.cpepRepository.getCachedQueue().firstOrNull()?.ticketKey
                ?: "RCP-MOB-${System.currentTimeMillis() % 100000}"
            val gross = app.cpepRepository.getBleWeight() ?: 1250.0
            val tare = app.cpepRepository.getUsbWeight() ?: 250.0
            app.cpepRepository.captureWeightOffline(
                ticketKey = ticketKey,
                grossWeightKg = gross,
                tareWeightKg = tare,
                reason = "Operación offline Android (BLE/USB OTG)",
                source = "manual_contingency",
                scaleKey = "scale-ble-01",
                photoUrl = app.cpepRepository.getLastScan("photo"),
            )
            Toast.makeText(requireContext(), R.string.cpep_weigh_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnQualityOffline).setOnClickListener {
            val ticketKey = app.cpepRepository.getCachedQualityPending().firstOrNull()?.ticketKey
                ?: app.cpepRepository.getCachedWeighPending().firstOrNull()?.ticketKey
                ?: app.cpepRepository.getCachedQueue().firstOrNull()?.ticketKey
                ?: "RCP-MOB-${System.currentTimeMillis() % 100000}"
            val photoKey = "quality-photo-${System.currentTimeMillis()}"
            app.cpepRepository.cacheScan("photo", "photo://$photoKey")
            app.cpepRepository.captureQualityOffline(ticketKey, photoKey)
            Toast.makeText(requireContext(), R.string.cpep_quality_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnSettlementOffline).setOnClickListener {
            val ticketKey = app.cpepRepository.getCachedSettlementPending().firstOrNull()?.ticketKey
                ?: app.cpepRepository.getCachedQualityPending().firstOrNull()?.ticketKey
                ?: app.cpepRepository.getCachedQueue().firstOrNull()?.ticketKey
                ?: "RCP-MOB-${System.currentTimeMillis() % 100000}"
            app.cpepRepository.captureSettlementOffline(ticketKey, "Productor móvil")
            Toast.makeText(requireContext(), R.string.cpep_settlement_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnOpsIndicators).setOnClickListener {
            Toast.makeText(requireContext(), R.string.cpep_ops_loaded, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnScanInventoryQr).setOnClickListener {
            val lots = app.cpepRepository.getCachedInventoryLots()
            val code = lots.firstOrNull()?.get("qrCode")?.toString()
                ?: lots.firstOrNull()?.get("lotKey")?.toString()
                ?: "CPEP-INV:LOT-DEMO"
            app.cpepRepository.cacheScan("inventory_qr", code)
            val cached = app.cpepRepository.getCachedTrace(code)
            if (cached == null) {
                app.cpepRepository.cacheTrace(
                    code,
                    mapOf(
                        "lotKey" to code,
                        "offline" to true,
                        "movements" to emptyList<Any>(),
                    ),
                )
            }
            Toast.makeText(requireContext(), R.string.cpep_inventory_qr_saved, Toast.LENGTH_SHORT).show()
            refresh(statusText, queueText, app)
        }

        view.findViewById<Button>(R.id.btnSyncCoffee).setOnClickListener {
            lifecycleScope.launch {
                app.cpepRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.cpep_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, queueText, app)
            }
        }

        lifecycleScope.launch {
            app.cpepRepository.syncOffline()
            refresh(statusText, queueText, app)
        }
    }

    private fun refresh(statusText: TextView, queueText: TextView, app: AgroErpApp) {
        val pending = app.cpepRepository.getPendingTickets()
        statusText.text = buildString {
            append(getString(R.string.cpep_pending_count, pending.size))
            append('\n')
            append(getString(R.string.cpep_pending_weighs, app.cpepRepository.pendingWeighCount()))
            append('\n')
            append(getString(R.string.cpep_pending_qualities, app.cpepRepository.pendingQualityCount()))
            append('\n')
            append(getString(R.string.cpep_pending_settlements, app.cpepRepository.pendingSettlementCount()))
            append('\n')
            append(getString(R.string.cpep_config_catalogs, app.cpepRepository.catalogCountOffline()))
            append('\n')
            append(getString(R.string.cpep_config_parameters, app.cpepRepository.parameterCountOffline()))
            append('\n')
            append("QR: ${app.cpepRepository.getLastScan("qr") ?: "—"}")
            append('\n')
            append("Barcode: ${app.cpepRepository.getLastScan("barcode") ?: "—"}")
            append('\n')
            append("NFC: ${app.cpepRepository.getLastScan("nfc") ?: "—"}")
            append('\n')
            append("BLE: ${app.cpepRepository.getLastScan("ble") ?: "—"}")
            append('\n')
            append("USB OTG: ${app.cpepRepository.getLastScan("usb") ?: "—"}")
            append('\n')
            append("GPS: 4.71,-74.07")
            append('\n')
            append("Firma: ${app.cpepRepository.getLastScan("signature") ?: "—"}")
            append('\n')
            append("Balanzas: ${app.cpepRepository.getCachedScales().size}")
        }


        queueText.text = buildString {
            append(app.cpepRepository.getCachedQueue().joinToString("\n") {
                "• ${it.ticketKey} ${it.producerName} [${it.status}]"
            }.ifBlank { getString(R.string.cpep_no_queue) })
            append('\n')
            append(app.cpepRepository.getCachedWeighPending().joinToString("\n") {
                "⚖ ${it.ticketKey} ${it.producerName} T${it.turnNumber ?: "-"}"
            })
            append('\n')
            append(app.cpepRepository.getCachedQualityPending().joinToString("\n") {
                "🔬 ${it.ticketKey} ${it.producerName}"
            })
            append('\n')
            append("Historial calidad: ${app.cpepRepository.getCachedQualityHistory().size}")
            append('\n')
            append(app.cpepRepository.getCachedSettlementPending().joinToString("\n") {
                "💰 ${it.ticketKey} ${it.producerName}"
            })
            append('\n')
            append("Liquidaciones: ${app.cpepRepository.getCachedSettlements().size}")
            append('\n')
            append(getString(R.string.cpep_inventory_lots, app.cpepRepository.getCachedInventoryLots().size))
            append('\n')
            append("QR inventario: ${app.cpepRepository.getLastScan("inventory_qr") ?: "—"}")
            val qr = app.cpepRepository.getLastScan("inventory_qr")
            if (qr != null) {
                val trace = app.cpepRepository.getCachedTrace(qr)
                append('\n')
                append("Trazabilidad offline: ${trace?.get("lotKey") ?: trace?.keys?.size ?: "—"}")
            }
            val ops = app.cpepRepository.getCachedOps()
            val kpis = app.cpepRepository.getCachedKpis()
            val alerts = app.cpepRepository.getCachedAlerts()
            append('\n')
            append("Ops compras hoy: ${ops?.get("purchasesToday") ?: "—"}")
            append('\n')
            append("KPI kg: ${kpis?.get("kgTotal") ?: "—"}")
            append('\n')
            append("Alertas: ${alerts.size}")
            alerts.take(3).forEach { alert ->
                append('\n')
                append("⚠ ${alert["title"] ?: alert["alertType"]}")
            }
        }
    }
}
