package com.agroerp.prm.ui.eneac

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.data.api.EneacNotificationDto
import kotlinx.coroutines.launch

class NotificationsFragment : Fragment() {

    private lateinit var container: LinearLayout
    private lateinit var statusText: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? = inflater.inflate(R.layout.fragment_notifications, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        container = view.findViewById(R.id.notificationsContainer)
        statusText = view.findViewById(R.id.notificationsStatus)
        view.findViewById<Button>(R.id.btnRefreshNotifications).setOnClickListener { load() }
        view.findViewById<Button>(R.id.btnSyncNotifications).setOnClickListener { sync() }
        load()
    }

    private fun load() {
        val app = requireActivity().application as AgroErpApp
        lifecycleScope.launch {
            try {
                val items = app.eneacRepository.fetchInbox()
                render(items)
                statusText.text = getString(R.string.eneac_inbox_count, items.size)
            } catch (_: Exception) {
                val cached = app.eneacRepository.getCachedInbox()
                render(cached)
                statusText.text = getString(R.string.eneac_inbox_offline, cached.size)
            }
        }
    }

    private fun sync() {
        val app = requireActivity().application as AgroErpApp
        lifecycleScope.launch {
            try {
                val result = app.eneacRepository.syncMobile()
                Toast.makeText(
                    requireContext(),
                    getString(R.string.eneac_sync_done, result.unreadCount),
                    Toast.LENGTH_SHORT,
                ).show()
                render(result.inbox)
            } catch (_: Exception) {
                Toast.makeText(requireContext(), R.string.eneac_sync_error, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun render(items: List<EneacNotificationDto>) {
        container.removeAllViews()
        if (items.isEmpty()) {
            container.addView(TextView(requireContext()).apply {
                text = getString(R.string.eneac_inbox_empty)
            })
            return
        }

        val app = requireActivity().application as AgroErpApp
        for (item in items) {
            val card = layoutInflater.inflate(R.layout.item_notification, container, false)
            card.findViewById<TextView>(R.id.notifTitle).text = item.title
            card.findViewById<TextView>(R.id.notifBody).text = item.body ?: ""
            card.findViewById<TextView>(R.id.notifSeverity).text = item.alertSeverity

            card.findViewById<Button>(R.id.btnMarkRead).setOnClickListener {
                lifecycleScope.launch {
                    try {
                        app.eneacRepository.markReadOnline(item.id)
                    } catch (_: Exception) {
                        app.eneacRepository.queueOfflineRead(item.id)
                    }
                    load()
                }
            }

            card.findViewById<Button>(R.id.btnAttend).setOnClickListener {
                lifecycleScope.launch {
                    try {
                        app.eneacRepository.attendOnline(item.id)
                    } catch (_: Exception) {
                        app.eneacRepository.queueOfflineAttend(item.id)
                    }
                    load()
                }
            }

            container.addView(card)
        }
    }
}
