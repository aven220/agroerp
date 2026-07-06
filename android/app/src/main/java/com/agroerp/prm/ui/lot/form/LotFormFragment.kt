package com.agroerp.prm.ui.lot.form

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
import com.agroerp.prm.data.api.CreateFieldLotRequest
import com.agroerp.prm.databinding.FragmentLotFormBinding
import com.agroerp.prm.location.GpsHelper
import com.agroerp.prm.ui.signature.SignatureActivity
import kotlinx.coroutines.launch
import java.io.File

class LotFormFragment : Fragment() {
    private var _binding: FragmentLotFormBinding? = null
    private val binding get() = _binding!!
    private var photoPath: String? = null
    private var videoPath: String? = null
    private var signaturePath: String? = null
    private var latitude: Double? = null
    private var longitude: Double? = null
    private val polygonVertices = mutableListOf<Pair<Double, Double>>()
    private var photoUri: Uri? = null
    private var videoUri: Uri? = null

    private val takePhoto = registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        if (ok) photoPath = photoUri?.toString()
    }

    private val captureVideo = registerForActivityResult(ActivityResultContracts.CaptureVideo()) { ok ->
        if (ok) videoPath = videoUri?.toString()
    }

    private val captureSignature = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            signaturePath = result.data?.getStringExtra(SignatureActivity.EXTRA_PATH)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        _binding = FragmentLotFormBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).fieldLotRepository

        binding.btnGps.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val gps = GpsHelper(requireContext()).getCurrentLocation()
                    latitude = gps.latitude
                    longitude = gps.longitude
                    Toast.makeText(requireContext(), "${gps.latitude}, ${gps.longitude}", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), e.message ?: "GPS error", Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.btnPhoto.setOnClickListener {
            val file = File(requireContext().cacheDir, "lot_photo_${System.currentTimeMillis()}.jpg")
            photoUri = FileProvider.getUriForFile(requireContext(), "${requireContext().packageName}.fileprovider", file)
            takePhoto.launch(photoUri)
        }

        binding.btnVideo.setOnClickListener {
            val file = File(requireContext().cacheDir, "lot_video_${System.currentTimeMillis()}.mp4")
            videoUri = FileProvider.getUriForFile(requireContext(), "${requireContext().packageName}.fileprovider", file)
            captureVideo.launch(videoUri)
        }

        binding.btnSignature.setOnClickListener {
            captureSignature.launch(Intent(requireContext(), SignatureActivity::class.java))
        }

        binding.btnAddVertex.setOnClickListener {
            lifecycleScope.launch {
                try {
                    val gps = GpsHelper(requireContext()).getCurrentLocation()
                    polygonVertices.add(gps.latitude to gps.longitude)
                    Toast.makeText(requireContext(), "Vértice ${polygonVertices.size}", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Toast.makeText(requireContext(), e.message ?: "GPS error", Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.btnSave.setOnClickListener {
            val name = binding.inputLotName.text.toString().trim()
            val ftipId = binding.inputFtipLotId.text.toString().trim()
            if (name.isEmpty() || ftipId.isEmpty()) {
                Toast.makeText(requireContext(), R.string.required_fields, Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            lifecycleScope.launch {
                val area = binding.inputArea.text.toString().toDoubleOrNull()
                repo.createOffline(
                    CreateFieldLotRequest(
                        ftipLotUnitId = ftipId,
                        lotName = name,
                        primaryCropCode = binding.inputCrop.text.toString().ifBlank { "coffee" },
                        centroidLatitude = latitude,
                        centroidLongitude = longitude,
                        totalAreaHa = area,
                        plantedAreaHa = area,
                        observations = binding.inputNotes.text.toString().ifBlank { null },
                    ),
                    photoPath = photoPath,
                    videoPath = videoPath,
                    signaturePath = signaturePath,
                    polygonPoints = polygonVertices.takeIf { it.size >= 3 },
                )
                Toast.makeText(requireContext(), R.string.saved_offline, Toast.LENGTH_SHORT).show()
                parentFragmentManager.popBackStack()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        fun newInstance() = LotFormFragment()
    }
}
