package com.agroerp.prm.ui.lot.list

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.data.db.FieldLotEntity
import com.agroerp.prm.databinding.FragmentLotListBinding
import com.agroerp.prm.databinding.ItemLotBinding
import com.agroerp.prm.ui.lot.detail.LotDetailFragment
import com.agroerp.prm.ui.lot.form.LotFormFragment
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class LotListFragment : Fragment() {
    private var _binding: FragmentLotListBinding? = null
    private val binding get() = _binding!!
    private lateinit var adapter: LotAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentLotListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).fieldLotRepository
        adapter = LotAdapter { openDetail(it) }
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
                replace(R.id.fragmentContainer, LotFormFragment.newInstance())
                addToBackStack(null)
            }
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repo.observeLots().collectLatest { items ->
                adapter.submitList(items)
                binding.emptyView.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
            }
        }

        lifecycleScope.launch {
            try { repo.pullFromServer() } catch (_: Exception) { }
        }
    }

    private fun openDetail(entity: FieldLotEntity) {
        parentFragmentManager.commit {
            replace(R.id.fragmentContainer, LotDetailFragment.newInstance(entity.id))
            addToBackStack(null)
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class LotAdapter(
    private val onClick: (FieldLotEntity) -> Unit,
) : RecyclerView.Adapter<LotAdapter.VH>() {
    private var items: List<FieldLotEntity> = emptyList()

    fun submitList(list: List<FieldLotEntity>) {
        items = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemLotBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return VH(binding)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(items[position], onClick)
    }

    override fun getItemCount() = items.size

    class VH(private val binding: ItemLotBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: FieldLotEntity, onClick: (FieldLotEntity) -> Unit) {
            binding.lotCode.text = item.lotCode
            binding.lotName.text = item.lotName
            val area = item.plantedAreaHa ?: item.totalAreaHa
            binding.lotMeta.text = buildString {
                append(item.status)
                if (item.primaryCropCode != null) append(" · ").append(item.primaryCropCode)
                if (area != null) append(" · ").append(String.format("%.2f ha", area))
                if (item.syncStatus == "pending") append(" · pendiente sync")
            }
            binding.root.setOnClickListener { onClick(item) }
        }
    }
}
