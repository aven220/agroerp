package com.agroerp.prm.ui.portal

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

class PortalFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_portal, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val profileText = view.findViewById<TextView>(R.id.portalProfileText)
        val newsText = view.findViewById<TextView>(R.id.portalNewsText)
        val linksText = view.findViewById<TextView>(R.id.portalLinksText)
        val app = requireActivity().application as AgroErpApp

        view.findViewById<Button>(R.id.btnSyncPortal).setOnClickListener {
            lifecycleScope.launch {
                app.portalRepository.syncOffline()
                Toast.makeText(requireContext(), R.string.portal_sync_done, Toast.LENGTH_SHORT).show()
                refresh(profileText, newsText, linksText, app)
            }
        }

        lifecycleScope.launch {
            app.portalRepository.syncOffline()
            refresh(profileText, newsText, linksText, app)
        }
    }

    private fun refresh(
        profileText: TextView,
        newsText: TextView,
        linksText: TextView,
        app: AgroErpApp,
    ) {
        val profile = app.portalRepository.getCachedProfile()
        val news = app.portalRepository.getCachedNews()
        val notices = app.portalRepository.getCachedNotices()
        val links = app.portalRepository.getCachedQuickLinks()
        val birthdays = app.portalRepository.getCachedBirthdays()
        val position = profile["position"] as? Map<*, *>
        val area = profile["area"] as? Map<*, *>
        val manager = profile["manager"] as? Map<*, *>
        val contact = profile["contact"] as? Map<*, *>
        val contract = profile["contract"] as? Map<*, *>

        profileText.text = buildString {
            append("— Perfil —\n")
            append("${profile["fullName"] ?: "—"}\n")
            append("Cargo: ${position?.get("name") ?: "—"}\n")
            append("Área: ${area?.get("name") ?: "—"}\n")
            append("Jefe: ${manager?.get("fullName") ?: "—"}\n")
            append("Estado: ${profile["employmentStatus"] ?: "—"}\n")
            append("Contrato: ${contract?.get("contractType") ?: "—"}\n")
            append("Contacto: ${contact?.get("email") ?: contact?.get("mobile") ?: "—"}\n")
            append("Foto: ${profile["photoUrl"] ?: "—"}\n")
        }

        newsText.text = buildString {
            append("— Avisos (${notices.size}) —\n")
            notices.take(5).forEach { n ->
                append("• ${n["title"]} [${n["priority"]}]\n")
            }
            append("\n— Noticias (${news.size}) —\n")
            news.take(5).forEach { n ->
                append("• ${n["title"]}\n")
            }
            append("\n— Cumpleaños (${birthdays.size}) —\n")
            birthdays.take(5).forEach { b ->
                append("• ${b["fullName"]}${if (b["isToday"] == true) " (hoy)" else ""}\n")
            }
        }

        val requests = app.portalRepository.getCachedRequests()
        val vacations = app.portalRepository.getCachedVacations()
        val balance = vacations["balance"] as? Map<*, *>
        val drafts = app.portalRepository.getDraftRequests()

        linksText.text = buildString {
            append("— Accesos rápidos (${links.size}) —\n")
            links.forEach { l ->
                append("${l["icon"] ?: ""} ${l["label"]} → ${l["routePath"]}\n")
            }
            append("\n— Solicitudes (${requests.size}) —\n")
            requests.take(5).forEach { r ->
                append("• ${r["title"]} [${r["status"]}]\n")
            }
            append("Vacaciones disponibles: ${balance?.get("availableDays") ?: "—"}\n")
            append("Borradores offline: ${drafts.size}\n")
            val payslips = app.portalRepository.getCachedPayslips()
            val offlineDocs = app.portalRepository.getCachedOfflineDocs()
            append("\n— Nómina y documentos —\n")
            append("Desprendibles: ${payslips.size}\n")
            payslips.take(3).forEach { p ->
                append("• ${p["periodCode"]} neto=${p["netPay"]}\n")
            }
            append("Guardados offline: ${offlineDocs.size}\n")
        }
    }
}
