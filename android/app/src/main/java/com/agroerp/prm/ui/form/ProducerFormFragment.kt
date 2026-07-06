package com.agroerp.prm.ui.form

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import com.agroerp.prm.data.api.CreateProducerRequest
import com.agroerp.prm.databinding.FragmentProducerFormBinding
import com.agroerp.prm.location.GpsHelper
import com.agroerp.prm.ui.signature.SignatureActivity
import kotlinx.coroutines.launch
import java.io.File

class ProducerFormFragment : Fragment() {
    private var _binding: FragmentProducerFormBinding? = null
    private val binding get() = _binding!!
    private var photoUri: Uri? = null
    private var photoPath: String? = null
    private var signaturePath: String? = null
    private var latitude: Double? = null
    private var longitude: Double? = null

    private val takePhoto = registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        if (ok) {
            binding.imagePreview.setImageURI(photoUri)
            photoPath = photoUri?.toString()
        }
    }

    private val captureSignature = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            signaturePath = result.data?.getStringExtra(SignatureActivity.EXTRA_PATH)
            binding.textSignatureStatus.text = "Firma capturada"
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentProducerFormBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val editId = arguments?.getString(ARG_ID)
        val repo = (requireActivity().application as AgroErpApp).repository

        if (editId != null) {
            lifecycleScope.launch {
                val p = repo.getProducer(editId) ?: return@launch
                binding.inputLegalName.setText(p.legalName)
                binding.inputDocument.setText(p.documentNumber)
                binding.inputMunicipality.setText(p.municipalityCode)
                binding.inputVereda.setText(p.veredaCode)
                binding.inputNotes.setText(p.notes)
                latitude = p.latitude
                longitude = p.longitude
            }
        }

        binding.btnGps.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val gps = GpsHelper(requireContext()).getCurrentLocation()
                    latitude = gps.latitude
                    longitude = gps.longitude
                    binding.textGps.text = "GPS: ${gps.latitude}, ${gps.longitude} (±${gps.accuracyMeters}m)"
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), e.message, Toast.LENGTH_LONG).show()
                }
            }
        }

        binding.btnPhoto.setOnClickListener {
            val file = File(requireContext().cacheDir, "producer_${System.currentTimeMillis()}.jpg")
            photoUri = FileProvider.getUriForFile(
                requireContext(),
                "${requireContext().packageName}.fileprovider",
                file,
            )
            takePhoto.launch(photoUri)
        }

        binding.btnSignature.setOnClickListener {
            captureSignature.launch(Intent(requireContext(), SignatureActivity::class.java))
        }

        binding.btnSave.setOnClickListener {
            val legalName = binding.inputLegalName.text.toString().trim()
            val document = binding.inputDocument.text.toString().trim()
            if (legalName.isEmpty() || document.isEmpty()) {
                Toast.makeText(requireContext(), "Nombre y documento requeridos", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    if (editId != null) {
                        repo.updateOffline(
                            editId,
                            mapOf(
                                "legalName" to legalName,
                                "documentNumber" to document,
                                "municipalityCode" to binding.inputMunicipality.text.toString(),
                                "veredaCode" to binding.inputVereda.text.toString(),
                                "latitude" to latitude,
                                "longitude" to longitude,
                                "notes" to binding.inputNotes.text.toString(),
                            ),
                            photoPath,
                            signaturePath,
                        )
                    } else {
                        repo.createOffline(
                            CreateProducerRequest(
                                producerTypeCode = "natural",
                                legalName = legalName,
                                documentTypeCode = "CC",
                                documentNumber = document,
                                municipalityCode = binding.inputMunicipality.text.toString().ifBlank { null },
                                veredaCode = binding.inputVereda.text.toString().ifBlank { null },
                                latitude = latitude,
                                longitude = longitude,
                                notes = binding.inputNotes.text.toString().ifBlank { null },
                            ),
                            photoPath,
                            signaturePath,
                        )
                    }
                    try { repo.pushPendingSync() } catch (_: Exception) { }
                    parentFragmentManager.popBackStack()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), e.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_ID = "producerId"
        fun newInstance(id: String? = null) = ProducerFormFragment().apply {
            if (id != null) arguments = Bundle().apply { putString(ARG_ID, id) }
        }
    }
}
