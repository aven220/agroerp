package com.agroerp.prm.ui.list

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.data.db.ProducerEntity
import com.agroerp.prm.databinding.FragmentProducerListBinding
import com.agroerp.prm.ui.detail.ProducerDetailFragment
import com.agroerp.prm.ui.form.ProducerFormFragment
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class ProducerListFragment : Fragment() {
    private var _binding: FragmentProducerListBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: ProducerAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentProducerListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).repository
        adapter = ProducerAdapter { openDetail(it) }
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener {
            lifecycleScope.launch {
                try {
                    repo.pullFromServer()
                } catch (_: Exception) { }
                binding.swipeRefresh.isRefreshing = false
            }
        }

        binding.fabAdd.setOnClickListener {
            parentFragmentManager.commit {
                replace(R.id.fragmentContainer, ProducerFormFragment.newInstance())
                addToBackStack(null)
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repo.observeProducers().collectLatest { items ->
                adapter.submitList(items)
                binding.emptyView.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
            }
        }

        lifecycleScope.launch {
            try { repo.pullFromServer() } catch (_: Exception) { }
        }
    }

    private fun openDetail(entity: ProducerEntity) {
        parentFragmentManager.commit {
            replace(R.id.fragmentContainer, ProducerDetailFragment.newInstance(entity.id))
            addToBackStack(null)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class ProducerAdapter(
    private val onClick: (ProducerEntity) -> Unit,
) : androidx.recyclerview.widget.ListAdapter<ProducerEntity, ProducerViewHolder>(
    object : androidx.recyclerview.widget.DiffUtil.ItemCallback<ProducerEntity>() {
        override fun areItemsTheSame(a: ProducerEntity, b: ProducerEntity) = a.id == b.id
        override fun areContentsTheSame(a: ProducerEntity, b: ProducerEntity) = a == b
    },
) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProducerViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_producer, parent, false)
        return ProducerViewHolder(view, onClick)
    }

    override fun onBindViewHolder(holder: ProducerViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}

class ProducerViewHolder(
    itemView: View,
    private val onClick: (ProducerEntity) -> Unit,
) : androidx.recyclerview.widget.RecyclerView.ViewHolder(itemView) {
    private val name = itemView.findViewById<android.widget.TextView>(R.id.textName)
    private val meta = itemView.findViewById<android.widget.TextView>(R.id.textMeta)
    private val sync = itemView.findViewById<android.widget.TextView>(R.id.textSync)

    fun bind(item: ProducerEntity) {
        name.text = item.legalName
        meta.text = "${item.producerNumber} · ${item.documentNumber} · ${item.municipalityCode ?: "—"}"
        sync.text = if (item.syncStatus == "pending") "⏳ Pendiente sync" else "✓ Sincronizado"
        itemView.setOnClickListener { onClick(item) }
    }
}
