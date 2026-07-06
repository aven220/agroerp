package com.agroerp.prm.ui.farm.detail

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.databinding.FragmentFarmDetailBinding
import kotlinx.coroutines.launch

class FarmDetailFragment : Fragment() {
    private var _binding: FragmentFarmDetailBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentFarmDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val farmId = arguments?.getString(ARG_ID) ?: return
        val repo = (requireActivity().application as AgroErpApp).farmRepository

        lifecycleScope.launch {
            val farm = repo.getFarm(farmId) ?: return@launch
            binding.textFarmCode.text = "${farm.farmCode} — ${farm.farmName}"
            binding.textStatus.text = "Estado: ${farm.status}"
            binding.textArea.text = farm.totalAreaHa?.let { "Área: %.2f ha".format(it) } ?: "Área: —"
            binding.textGps.text = if (farm.latitude != null) {
                "GPS: ${farm.latitude}, ${farm.longitude}"
            } else {
                "GPS: —"
            }
            binding.textPolygon.text = if (farm.boundaryGeoJson != null) {
                "Polígono registrado"
            } else {
                "Sin polígono"
            }
            binding.textObservations.text = farm.observations ?: ""

            binding.btnOpenMap.setOnClickListener {
                if (farm.latitude != null && farm.longitude != null) {
                    val uri = Uri.parse("geo:${farm.latitude},${farm.longitude}?q=${farm.latitude},${farm.longitude}(${farm.farmName})")
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_ID = "farmId"
        fun newInstance(id: String) = FarmDetailFragment().apply {
            arguments = Bundle().apply { putString(ARG_ID, id) }
        }
    }
}
