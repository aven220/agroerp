package com.agroerp.prm.ui.lot.detail

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.data.api.CreateFieldOperationRequest
import com.agroerp.prm.databinding.FragmentLotDetailBinding
import com.agroerp.prm.location.GpsHelper
import kotlinx.coroutines.launch

class LotDetailFragment : Fragment() {
    private var _binding: FragmentLotDetailBinding? = null
    private val binding get() = _binding!!
    private var lotId: String = ""
    private val polygonVertices = mutableListOf<Pair<Double, Double>>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lotId = arguments?.getString(ARG_LOT_ID).orEmpty()
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentLotDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).fieldLotRepository

        binding.btnMap.setOnClickListener {
            lifecycleScope.launch {
                val lot = repo.getLot(lotId) ?: return@launch
                if (lot.latitude != null && lot.longitude != null) {
                    val uri = Uri.parse("geo:${lot.latitude},${lot.longitude}?q=${lot.latitude},${lot.longitude}(${lot.lotName})")
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                } else {
                    Toast.makeText(requireContext(), R.string.no_gps, Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.btnAddVertex.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val gps = GpsHelper(requireContext()).getCurrentLocation()
                    polygonVertices.add(gps.latitude to gps.longitude)
                    Toast.makeText(requireContext(), "Vértice ${polygonVertices.size}", Toast.LENGTH_SHORT).show()
                    if (polygonVertices.size >= 3) {
                        try {
                            repo.uploadGeometry(lotId, polygonVertices.toList())
                            Toast.makeText(requireContext(), R.string.geometry_saved, Toast.LENGTH_SHORT).show()
                        } catch (_: Exception) {
                            Toast.makeText(requireContext(), R.string.sync_pending, Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), e.message ?: "GPS error", Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.btnRecordOperation.setOnClickListener {
            lifecycleScope.launch {
                val lot = repo.getLot(lotId) ?: return@launch
                val area = lot.plantedAreaHa ?: lot.totalAreaHa ?: 1.0
                repo.queueOperation(
                    lotId,
                    CreateFieldOperationRequest(
                        operationTypeCode = "fertilization",
                        operationDate = java.time.LocalDate.now().toString(),
                        areaTreatedHa = area,
                        notes = "Registrado offline Android",
                    ),
                )
                Toast.makeText(requireContext(), R.string.operation_queued, Toast.LENGTH_SHORT).show()
            }
        }

        lifecycleScope.launch {
            val lot = repo.getLot(lotId) ?: return@launch
            binding.detailTitle.text = "${lot.lotCode} — ${lot.lotName}"
            binding.detailStatus.text = lot.status
            binding.detailArea.text = getString(
                R.string.lot_area_label,
                lot.plantedAreaHa ?: lot.totalAreaHa ?: 0.0,
            )
            binding.detailCrop.text = lot.primaryCropCode ?: "—"
            binding.detailGps.text = if (lot.latitude != null) {
                "${lot.latitude}, ${lot.longitude}"
            } else {
                getString(R.string.no_gps)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_LOT_ID = "lotId"

        fun newInstance(lotId: String) = LotDetailFragment().apply {
            arguments = Bundle().apply { putString(ARG_LOT_ID, lotId) }
        }
    }
}
