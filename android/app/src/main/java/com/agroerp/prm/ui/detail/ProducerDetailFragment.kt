package com.agroerp.prm.ui.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.commit
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.databinding.FragmentProducerDetailBinding
import com.agroerp.prm.ui.form.ProducerFormFragment
import kotlinx.coroutines.launch

class ProducerDetailFragment : Fragment() {
    private var _binding: FragmentProducerDetailBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentProducerDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val producerId = requireArguments().getString(ARG_ID)!!
        val repo = (requireActivity().application as AgroErpApp).repository

        lifecycleScope.launch {
            val producer = repo.getProducer(producerId) ?: return@launch
            binding.textName.text = producer.legalName
            binding.textNumber.text = producer.producerNumber
            binding.textDocument.text = "${producer.documentTypeCode} ${producer.documentNumber}"
            binding.textStatus.text = producer.lifecycleStatus
            binding.textLocation.text = buildString {
                append(producer.municipalityCode ?: "—")
                if (producer.latitude != null && producer.longitude != null) {
                    append("\nGPS: ${producer.latitude}, ${producer.longitude}")
                }
            }
            binding.textQuality.text = "Calidad: ${producer.qualityScore}"
            binding.textSync.text = "Sync: ${producer.syncStatus}"
            binding.textNotes.text = producer.notes ?: "Sin observaciones"
            if (producer.photoPath != null) {
                binding.imagePhoto.setImageURI(android.net.Uri.parse(producer.photoPath))
                binding.imagePhoto.visibility = View.VISIBLE
            }
            if (producer.signaturePath != null) {
                binding.imageSignature.setImageURI(android.net.Uri.parse(producer.signaturePath))
                binding.imageSignature.visibility = View.VISIBLE
            }
        }

        binding.btnEdit.setOnClickListener {
            parentFragmentManager.commit {
                replace(R.id.fragmentContainer, ProducerFormFragment.newInstance(producerId))
                addToBackStack(null)
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_ID = "producerId"
        fun newInstance(id: String) = ProducerDetailFragment().apply {
            arguments = Bundle().apply { putString(ARG_ID, id) }
        }
    }
}
