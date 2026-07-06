package com.agroerp.prm.ui.eatp

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

class EatpFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_eatp, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val statusText = view.findViewById<TextView>(R.id.statusText)
        val lotsText = view.findViewById<TextView>(R.id.lotsText)
        val qrInput = view.findViewById<EditText>(R.id.qrInput)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSync).setOnClickListener {
            lifecycleScope.launch {
                val result = app.eatpRepository.syncAll()
                Toast.makeText(
                    requireContext(),
                    if (result != null) R.string.eatp_sync_ok else R.string.eatp_sync_offline,
                    Toast.LENGTH_SHORT,
                ).show()
                refresh(statusText, lotsText, app)
            }
        }

        view.findViewById<Button>(R.id.btnQr).setOnClickListener {
            lifecycleScope.launch {
                val code = qrInput.text.toString().trim()
                if (code.isBlank()) return@launch
                val lot = app.eatpRepository.resolveQr(code)
                Toast.makeText(
                    requireContext(),
                    if (lot != null) R.string.eatp_qr_ok else R.string.eatp_qr_fail,
                    Toast.LENGTH_SHORT,
                ).show()
            }
        }

        lifecycleScope.launch {
            app.eatpRepository.syncAll()
            refresh(statusText, lotsText, app)
        }
    }

    private fun refresh(statusText: TextView, lotsText: TextView, app: AgroErpApp) {
        val sync = app.eatpRepository.getCachedSync()
        val lots = app.eatpRepository.getCachedLots()
        val dashboard = sync?.get("dashboard") as? Map<*, *>
        val indicators = dashboard?.get("indicators") as? Map<*, *>
        statusText.text = buildString {
            append(getString(R.string.eatp_farms))
            append(": ")
            append(indicators?.get("activeFarms") ?: "—")
            append("\n")
            append(getString(R.string.eatp_lots))
            append(": ")
            append(indicators?.get("activeLots") ?: lots.size)
            append("\n")
            append(getString(R.string.eatp_hectares))
            append(": ")
            append(indicators?.get("hectares") ?: "—")
        }
        lotsText.text = lots.take(6).joinToString("\n") { lot ->
            "${lot["lotCode"]} → ${lot["status"]}"
        }.ifBlank { getString(R.string.eatp_no_lots) }
    }
}
