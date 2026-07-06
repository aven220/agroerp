package com.agroerp.prm.ui.escm

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

class EscmFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_escm, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val customersText = view.findViewById<TextView>(R.id.customersText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnRefreshCustomers).setOnClickListener {
            lifecycleScope.launch {
                app.escmRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.escm_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, customersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnResolvePrice).setOnClickListener {
            val customer = app.escmRepository.getCachedCustomers().firstOrNull()
            lifecycleScope.launch {
                app.escmRepository.resolvePriceOnline("CAF-PERG-001", customer?.customerKey)
                Toast.makeText(requireContext(), R.string.escm_price_cached, Toast.LENGTH_SHORT).show()
                refresh(statusText, customersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnRecordVisit).setOnClickListener {
            val customerKey = app.escmRepository.getCachedCustomers().firstOrNull()?.customerKey ?: "CUS-DEMO"
            app.escmRepository.queueVisit(customerKey, "Visita comercial móvil", "Registrada offline")
            Toast.makeText(requireContext(), R.string.escm_visit_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnUpdateOpportunity).setOnClickListener {
            val opp = app.escmRepository.getCachedOpportunities().firstOrNull()
            val key = opp?.opportunityKey ?: "OPP-DEMO"
            app.escmRepository.queueOpportunityUpdate(key, "contact_made", 25.0)
            Toast.makeText(requireContext(), R.string.escm_opp_updated, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnApproveQuotation).setOnClickListener {
            val quote = app.escmRepository.getCachedQuotations().firstOrNull()
            val key = quote?.quotationKey ?: "QUO-DEMO"
            app.escmRepository.queueQuotationSignature(key)
            Toast.makeText(requireContext(), R.string.escm_quote_signed, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnCreateOrder).setOnClickListener {
            val customerKey = app.escmRepository.getCachedCustomers().firstOrNull()?.customerKey ?: "CUS-DEMO"
            app.escmRepository.queueOrder(customerKey)
            Toast.makeText(requireContext(), R.string.escm_create_order, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnApproveOrder).setOnClickListener {
            app.escmRepository.queueOrderApproval("APR-DEMO")
            Toast.makeText(requireContext(), R.string.escm_approve_order, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnRegisterDelivery).setOnClickListener {
            val dispatch = app.escmRepository.getCachedDispatches().firstOrNull()
            val key = dispatch?.get("dispatchKey")?.toString() ?: "DSP-DEMO"
            app.escmRepository.queueDelivery(
                key,
                listOf(mapOf("itemKey" to "CAF-PERG-001", "quantity" to 1.0)),
            )
            Toast.makeText(requireContext(), R.string.escm_register_delivery, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnWarrantyClaim).setOnClickListener {
            val customerKey = app.escmRepository.getCachedCustomers().firstOrNull()?.customerKey ?: "CUS-DEMO"
            val invoice = app.escmRepository.getCachedInvoices().firstOrNull()
            app.escmRepository.queueWarrantyClaim(
                customerKey = customerKey,
                invoiceKey = invoice?.get("invoiceKey")?.toString(),
                itemKey = "CAF-PERG-001",
                evidenceUrls = listOf("offline://evidence-${System.currentTimeMillis()}"),
            )
            Toast.makeText(requireContext(), R.string.escm_warranty_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnRegisterPayment).setOnClickListener {
            val customerKey = app.escmRepository.getCachedCustomers().firstOrNull()?.customerKey ?: "CUS-DEMO"
            app.escmRepository.queuePayment(customerKey)
            Toast.makeText(requireContext(), R.string.escm_payment_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnRegisterPromise).setOnClickListener {
            val customerKey = app.escmRepository.getCachedCustomers().firstOrNull()?.customerKey ?: "CUS-DEMO"
            val receivable = app.escmRepository.getCachedReceivables().firstOrNull()
            app.escmRepository.queuePromise(
                customerKey = customerKey,
                receivableKey = receivable?.get("receivableKey")?.toString(),
            )
            Toast.makeText(requireContext(), R.string.escm_promise_queued, Toast.LENGTH_SHORT).show()
            refresh(statusText, customersText, app)
        }

        view.findViewById<Button>(R.id.btnSyncEscm).setOnClickListener {
            lifecycleScope.launch {
                app.escmRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.escm_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, customersText, app)
            }
        }

        view.findViewById<Button>(R.id.btnOpsKpis).setOnClickListener {
            lifecycleScope.launch {
                app.escmRepository.syncOffline()
                refresh(statusText, customersText, app)
                Toast.makeText(requireContext(), R.string.escm_ops_kpis, Toast.LENGTH_SHORT).show()
            }
        }

        view.findViewById<Button>(R.id.btnOpsReport).setOnClickListener {
            lifecycleScope.launch {
                val report = app.escmRepository.fetchOpsReport("sales")
                val rows = (report?.get("rowCount") as? Double)?.toInt()
                    ?: (report?.get("rows") as? List<*>)?.size ?: 0
                Toast.makeText(requireContext(), getString(R.string.escm_ops_report_rows, rows), Toast.LENGTH_SHORT).show()
                refresh(statusText, customersText, app)
            }
        }

        lifecycleScope.launch {
            app.escmRepository.syncOffline()
            refresh(statusText, customersText, app)
        }
    }

    private fun refresh(statusText: TextView, customersText: TextView, app: AgroErpApp) {
        val customers = app.escmRepository.getCachedCustomers()
        val opportunities = app.escmRepository.getCachedOpportunities()
        val quotations = app.escmRepository.getCachedQuotations()
        val orders = app.escmRepository.getCachedOrders()
        val reservations = app.escmRepository.getCachedReservations()
        val routes = app.escmRepository.getCachedRoutes()
        val dispatches = app.escmRepository.getCachedDispatches()
        val invoices = app.escmRepository.getCachedInvoices()
        val returns = app.escmRepository.getCachedReturns()
        val warranties = app.escmRepository.getCachedWarranties()
        val receivables = app.escmRepository.getCachedReceivables()
        val paymentsCached = app.escmRepository.getCachedPayments()
        val promisesCached = app.escmRepository.getCachedPromises()
        val opsCenter = app.escmRepository.getCachedOpsCenter()
        val opsKpis = app.escmRepository.getCachedOpsKpis()
        val opsAlerts = app.escmRepository.getCachedOpsAlerts()
        statusText.text = buildString {
            append(getString(R.string.escm_customers_count, customers.size))
            append("\n")
            append(getString(R.string.escm_opportunities_count, opportunities.size))
            append("\n")
            append(getString(R.string.escm_quotations_count, quotations.size))
            append("\n")
            append(getString(R.string.escm_orders_count, orders.size))
            append("\n")
            append(getString(R.string.escm_reservations_count, reservations.size))
            append("\n")
            append(getString(R.string.escm_routes_count, routes.size))
            append("\n")
            append(getString(R.string.escm_dispatches_count, dispatches.size))
            append("\n")
            append(getString(R.string.escm_invoices_count, invoices.size))
            append("\n")
            append(getString(R.string.escm_returns_count, returns.size))
            append("\n")
            append(getString(R.string.escm_warranties_count, warranties.size))
            append("\n")
            append(getString(R.string.escm_pending_warranty_claims, app.escmRepository.pendingWarrantyClaimCount()))
            append("\n")
            append(getString(R.string.escm_receivables_count, receivables.size))
            append("\n")
            append(getString(R.string.escm_payments_count, paymentsCached.size))
            append("\n")
            append(getString(R.string.escm_promises_count, promisesCached.size))
            append("\n")
            append(getString(R.string.escm_pending_payments, app.escmRepository.pendingPaymentCount()))
            append("\n")
            append(getString(R.string.escm_pending_promises, app.escmRepository.pendingPromiseCount()))
            append("\n")
            append(getString(R.string.escm_pending_visits, app.escmRepository.pendingVisitCount()))
            append("\n")
            append(getString(R.string.escm_pending_opp_updates, app.escmRepository.pendingOpportunityUpdateCount()))
            append("\n")
            append(getString(R.string.escm_pending_quote_approvals, app.escmRepository.pendingQuotationApprovalCount()))
            append("\n")
            append(getString(R.string.escm_pending_orders, app.escmRepository.pendingOrderCount()))
            append("\n")
            append(getString(R.string.escm_pending_order_approvals, app.escmRepository.pendingOrderApprovalCount()))
            append("\n")
            append(getString(R.string.escm_pending_deliveries, app.escmRepository.pendingDeliveryCount()))
            append("\n")
            append(getString(R.string.escm_ops_alerts_count, opsAlerts.size))
            append("\n")
            append(getString(R.string.escm_ops_pipeline, opsCenter["pipelineValue"]?.toString() ?: "0"))
            append("\n")
            append("Conv. cotiz.: ${opsKpis["quotationConversion"] ?: 0}%")
            append("\n")
            val price = app.escmRepository.getCachedPrice(
                "CAF-PERG-001",
                customers.firstOrNull()?.customerKey,
            )
            append("\n")
            append(getString(R.string.escm_cached_price, price?.get("unitPrice")?.toString() ?: "—"))
        }
        customersText.text = if (customers.isEmpty() && opportunities.isEmpty() && quotations.isEmpty()) {
            getString(R.string.escm_no_customers)
        } else {
            buildString {
                customers.take(8).forEach { append("${it.customerKey} — ${it.legalName}\n") }
                opportunities.take(5).forEach { append("OPP ${it.opportunityKey} — ${it.title} [${it.stageKey}]\n") }
                quotations.take(5).forEach { append("QUO ${it.quotationKey} — ${it.status} — ${it.totalAmount}\n") }
                invoices.take(5).forEach { append("INV ${it["invoiceKey"]} — ${it["status"]} — ${it["totalAmount"]}\n") }
                receivables.take(5).forEach { append("AR ${it["receivableKey"]} — ${it["balanceAmount"]}\n") }
            }.trim()
        }
    }
}
