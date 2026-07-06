package com.agroerp.prm.ui.workflow

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
import com.agroerp.prm.data.api.WorkflowAssignmentDto
import kotlinx.coroutines.launch

class WorkflowInboxFragment : Fragment() {

    private lateinit var container: LinearLayout
    private lateinit var statusText: TextView

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? {
        return inflater.inflate(R.layout.fragment_workflow_inbox, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        container = view.findViewById(R.id.inboxContainer)
        statusText = view.findViewById(R.id.inboxStatus)
        view.findViewById<Button>(R.id.btnRefreshInbox).setOnClickListener { loadInbox() }
        view.findViewById<Button>(R.id.btnSyncPending).setOnClickListener { syncPending() }
        loadInbox()
    }

    private fun loadInbox() {
        val app = requireActivity().application as AgroErpApp
        lifecycleScope.launch {
            try {
                val items = app.workflowRepository.fetchInbox()
                val bpmsTasks = app.bpmsRepository.fetchInbox()
                renderInbox(items)
                renderBpmsTasks(bpmsTasks)
                statusText.text = getString(R.string.workflow_inbox_count, items.size + bpmsTasks.size)
            } catch (e: Exception) {
                val cached = app.workflowRepository.getCachedInbox()
                val bpmsCached = app.bpmsRepository.getCachedInbox()
                renderInbox(cached)
                renderBpmsTasks(bpmsCached)
                statusText.text = getString(R.string.workflow_inbox_offline, cached.size + bpmsCached.size)
            }
        }
    }

    private fun syncPending() {
        val app = requireActivity().application as AgroErpApp
        lifecycleScope.launch {
            try {
                val result = app.workflowRepository.pushPendingTransitions()
                Toast.makeText(
                    requireContext(),
                    getString(R.string.workflow_sync_done, result.results.size),
                    Toast.LENGTH_SHORT,
                ).show()
                loadInbox()
            } catch (e: Exception) {
                Toast.makeText(requireContext(), R.string.workflow_sync_error, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun renderInbox(items: List<WorkflowAssignmentDto>) {
        container.removeAllViews()
        if (items.isEmpty()) {
            val empty = TextView(requireContext()).apply {
                text = getString(R.string.workflow_inbox_empty)
            }
            container.addView(empty)
            return
        }

        val app = requireActivity().application as AgroErpApp
        for (task in items) {
            val card = layoutInflater.inflate(R.layout.item_workflow_task, container, false)
            card.findViewById<TextView>(R.id.taskTitle).text =
                task.instance?.workflowDefinition?.name ?: task.stateKey
            card.findViewById<TextView>(R.id.taskState).text =
                "${task.stateKey} · ${task.status}"
            card.findViewById<TextView>(R.id.taskDue).text =
                task.dueAt?.let { getString(R.string.workflow_due, it) } ?: ""

            val approveBtn = card.findViewById<Button>(R.id.btnApprove)
            val transitionKey = task.transitionKey
            if (transitionKey != null && task.instance?.id != null) {
                approveBtn.visibility = View.VISIBLE
                approveBtn.text = transitionKey
                approveBtn.setOnClickListener {
                    lifecycleScope.launch {
                        try {
                            app.workflowRepository.executeTransitionOnline(
                                task.instance!!.id,
                                transitionKey,
                            )
                            Toast.makeText(requireContext(), R.string.workflow_approved, Toast.LENGTH_SHORT).show()
                            loadInbox()
                        } catch (_: Exception) {
                            app.workflowRepository.queueOfflineTransition(
                                instanceId = task.instance!!.id,
                                transitionKey = transitionKey,
                            )
                            Toast.makeText(requireContext(), R.string.workflow_queued_offline, Toast.LENGTH_SHORT).show()
                        }
                    }
                }
            } else {
                approveBtn.visibility = View.GONE
            }

            container.addView(card)
        }
    }

    private fun renderBpmsTasks(tasks: List<Map<String, Any>>) {
        val app = requireActivity().application as AgroErpApp
        for (task in tasks) {
            val card = layoutInflater.inflate(R.layout.item_workflow_task, container, false)
            val taskKey = task["taskKey"]?.toString() ?: continue
            card.findViewById<TextView>(R.id.taskTitle).text = task["title"]?.toString() ?: taskKey
            card.findViewById<TextView>(R.id.taskState).text = "BPMS · ${task["status"]}"
            card.findViewById<TextView>(R.id.taskDue).text = task["dueAt"]?.toString() ?: ""
            val approveBtn = card.findViewById<Button>(R.id.btnApprove)
            approveBtn.visibility = View.VISIBLE
            approveBtn.text = getString(R.string.workflow_approve)
            approveBtn.setOnClickListener {
                lifecycleScope.launch {
                    app.bpmsRepository.approveTask(taskKey, "mobile://signature/$taskKey")
                    Toast.makeText(requireContext(), R.string.workflow_approved, Toast.LENGTH_SHORT).show()
                    loadInbox()
                }
            }
            container.addView(card)
        }
    }
}
