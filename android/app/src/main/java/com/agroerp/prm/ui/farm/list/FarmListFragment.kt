package com.agroerp.prm.ui.farm.list

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
import com.agroerp.prm.data.db.FarmEntity
import com.agroerp.prm.databinding.FragmentFarmListBinding
import com.agroerp.prm.ui.farm.detail.FarmDetailFragment
import com.agroerp.prm.ui.farm.form.FarmFormFragment
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class FarmListFragment : Fragment() {
    private var _binding: FragmentFarmListBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: FarmAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentFarmListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).farmRepository
        adapter = FarmAdapter { openDetail(it) }
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener {
            lifecycleScope.launch {
                try { repo.pullFromServer() } catch (_: Exception) { }
                binding.swipeRefresh.isRefreshing = false
            }
        }

        binding.fabAdd.setOnClickListener {
            parentFragmentManager.commit {
                replace(R.id.fragmentContainer, FarmFormFragment.newInstance())
                addToBackStack(null)
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repo.observeFarms().collectLatest { items ->
                adapter.submitList(items)
                binding.emptyView.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
            }
        }

        lifecycleScope.launch {
            try { repo.pullFromServer() } catch (_: Exception) { }
        }
    }

    private fun openDetail(entity: FarmEntity) {
        parentFragmentManager.commit {
            replace(R.id.fragmentContainer, FarmDetailFragment.newInstance(entity.id))
            addToBackStack(null)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class FarmAdapter(
    private val onClick: (FarmEntity) -> Unit,
) : androidx.recyclerview.widget.ListAdapter<FarmEntity, FarmViewHolder>(
    object : androidx.recyclerview.widget.DiffUtil.ItemCallback<FarmEntity>() {
        override fun areItemsTheSame(a: FarmEntity, b: FarmEntity) = a.id == b.id
        override fun areContentsTheSame(a: FarmEntity, b: FarmEntity) = a == b
    },
) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): FarmViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_farm, parent, false)
        return FarmViewHolder(view, onClick)
    }

    override fun onBindViewHolder(holder: FarmViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}

class FarmViewHolder(
    itemView: View,
    private val onClick: (FarmEntity) -> Unit,
) : androidx.recyclerview.widget.RecyclerView.ViewHolder(itemView) {
    private val name = itemView.findViewById<android.widget.TextView>(R.id.textName)
    private val meta = itemView.findViewById<android.widget.TextView>(R.id.textMeta)
    private val sync = itemView.findViewById<android.widget.TextView>(R.id.textSync)

    fun bind(item: FarmEntity) {
        name.text = item.farmName
        val area = item.totalAreaHa?.let { " · %.2f ha".format(it) } ?: ""
        meta.text = "${item.farmCode} · ${item.municipalityCode ?: "—"}$area"
        sync.text = if (item.syncStatus == "pending") "⏳ Pendiente sync" else "✓ Sincronizado"
        itemView.setOnClickListener { onClick(item) }
    }
}
