package com.agroerp.prm.ui.efm

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

class EfmFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_efm, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val accountsText = view.findViewById<TextView>(R.id.accountsText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncEfm).setOnClickListener {
            lifecycleScope.launch {
                app.efmRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.efm_sync_done, Toast.LENGTH_SHORT).show()
                refresh(statusText, accountsText, app)
            }
        }

        lifecycleScope.launch {
            app.efmRepository.syncOffline()
            refresh(statusText, accountsText, app)
        }
    }

    private fun refresh(statusText: TextView, accountsText: TextView, app: AgroErpApp) {
        val accounts = app.efmRepository.getCachedAccounts()
        val parameters = app.efmRepository.getCachedParameters()
        val center = app.efmRepository.getCachedCenter()
        val vouchers = app.efmRepository.getCachedVouchers()
        val journalBook = app.efmRepository.getCachedJournalBook()
        val ledger = app.efmRepository.getCachedLedger()
        val apCenter = app.efmRepository.getCachedApCenter()
        val apPayables = app.efmRepository.getCachedApPayables()
        val apApprovals = app.efmRepository.getCachedApPendingApprovals()
        val trCenter = app.efmRepository.getCachedTrCenter()
        val trBalances = app.efmRepository.getCachedTrBalances()
        val faCenter = app.efmRepository.getCachedFaCenter()
        val faAssets = app.efmRepository.getCachedFaAssets()
        val bgCenter = app.efmRepository.getCachedBgCenter()
        val bgBudgets = app.efmRepository.getCachedBgBudgets()
        val foCenter = app.efmRepository.getCachedFoCenter()
        val foKpis = app.efmRepository.getCachedFoKpis()
        val foStatements = app.efmRepository.getCachedFoStatements()
        val foAlerts = app.efmRepository.getCachedFoAlerts()
        statusText.text = buildString {
            append(getString(R.string.efm_accounts_count, accounts.size))
            append("\n")
            append(getString(R.string.efm_parameters_count, parameters.size))
            append("\n")
            append(getString(R.string.efm_rules_count, center["rulesCount"]?.toString() ?: "0"))
            append("\n")
            append(getString(R.string.efm_journals_count, center["journalsCount"]?.toString() ?: "0"))
            append("\n")
            append("Comprobantes: ${vouchers.size}")
            append("\n")
            append("Libro diario: ${journalBook.size} líneas")
            append("\n")
            append("Libro mayor: ${ledger.size} cuentas")
            append("\n")
            append("CxP saldo: ${apCenter["totalOpenBalance"]?.toString() ?: "0"}")
            append("\n")
            append("Obligaciones: ${apPayables.size}")
            append("\n")
            append("Aprob. CxP: ${apApprovals.size}")
            append("\n")
            append("Tesorería: ${trCenter["totalLiquidity"]?.toString() ?: "0"}")
            append("\n")
            append("Cuentas banco: ${trBalances.size}")
            append("\n")
            append("Activos fijos VNB: ${faCenter["totalNetBookValue"]?.toString() ?: "0"}")
            append("\n")
            append("Activos: ${faAssets.size}")
            append("\n")
            append("Presupuesto: ${bgCenter["totalBudgetAmount"]?.toString() ?: "0"}")
            append("\n")
            append("Ejecutado: ${bgCenter["totalExecuted"]?.toString() ?: "0"}")
            append("\n")
            append("Presupuestos activos: ${bgBudgets.size}")
            append("\n")
            append("FOC estados: ${foStatements.size}")
            append("\n")
            append("FOC KPIs: ${foKpis.size}")
            append("\n")
            append("FOC alertas: ${foAlerts.size}")
            append("\n")
            append("FOC cierres activos: ${foCenter["activeClosings"]?.toString() ?: "0"}")
        }
        accountsText.text = accounts.take(15).joinToString("\n") { row ->
            "${row["code"]} — ${row["name"]} (${row["accountType"]})"
        }
    }
}
