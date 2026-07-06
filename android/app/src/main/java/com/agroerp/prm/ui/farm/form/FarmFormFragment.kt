package com.agroerp.prm.ui.farm.form

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
import com.agroerp.prm.data.api.CreateFarmRequest
import com.agroerp.prm.databinding.FragmentFarmFormBinding
import com.agroerp.prm.geometry.PolygonHelper
import com.agroerp.prm.location.GpsHelper
import com.agroerp.prm.ui.signature.SignatureActivity
import kotlinx.coroutines.launch
import java.io.File

class FarmFormFragment : Fragment() {
    private var _binding: FragmentFarmFormBinding? = null
    private val binding get() = _binding!!
    private var photoUri: Uri? = null
    private var photoPath: String? = null
    private var videoPath: String? = null
    private var signaturePath: String? = null
    private var latitude: Double? = null
    private var longitude: Double? = null
    private val polygonVertices = mutableListOf<Pair<Double, Double>>()

    private val takePhoto = registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        if (ok) {
            binding.imagePreview.setImageURI(photoUri)
            photoPath = photoUri?.toString()
        }
    }

    private val captureVideo = registerForActivityResult(ActivityResultContracts.CaptureVideo()) { ok ->
        if (ok) videoPath = videoUri?.toString()
    }
    private var videoUri: Uri? = null

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
        _binding = FragmentFarmFormBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        val repo = (requireActivity().application as AgroErpApp).farmRepository

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

        binding.btnAddVertex.setOnClickListener {
            if (latitude == null || longitude == null) {
                Toast.makeText(requireContext(), "Capture GPS primero", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            polygonVertices.add(latitude!! to longitude!!)
            val area = PolygonHelper.areaHectares(polygonVertices)
            binding.textPolygon.text = "Polígono: ${polygonVertices.size} vértices"
            binding.textArea.text = "Área calculada: %.2f ha".format(area)
        }

        binding.btnPhoto.setOnClickListener {
            val file = File(requireContext().cacheDir, "farm_${System.currentTimeMillis()}.jpg")
            photoUri = FileProvider.getUriForFile(
                requireContext(),
                "${requireContext().packageName}.fileprovider",
                file,
            )
            takePhoto.launch(photoUri)
        }

        binding.btnVideo.setOnClickListener {
            val file = File(requireContext().cacheDir, "farm_${System.currentTimeMillis()}.mp4")
            videoUri = FileProvider.getUriForFile(
                requireContext(),
                "${requireContext().packageName}.fileprovider",
                file,
            )
            captureVideo.launch(videoUri)
        }

        binding.btnSignature.setOnClickListener {
            captureSignature.launch(Intent(requireContext(), SignatureActivity::class.java))
        }

        binding.btnSave.setOnClickListener {
            val farmName = binding.inputFarmName.text.toString().trim()
            if (farmName.isEmpty()) {
                Toast.makeText(requireContext(), "Nombre de finca requerido", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                try {
                    val boundaryGeo = if (polygonVertices.size >= 3) {
                        PolygonHelper.toGeoJson(polygonVertices)
                    } else null

                    repo.createOffline(
                        CreateFarmRequest(
                            farmName = farmName,
                            farmTypeCode = "coffee_estate",
                            municipalityCode = binding.inputMunicipality.text.toString().ifBlank { null },
                            veredaCode = binding.inputVereda.text.toString().ifBlank { null },
                            centroidLatitude = latitude,
                            centroidLongitude = longitude,
                            totalAreaHa = if (polygonVertices.size >= 3) {
                                PolygonHelper.areaHectares(polygonVertices)
                            } else null,
                            boundaryGeo = boundaryGeo,
                            observations = binding.inputNotes.text.toString().ifBlank { null },
                        ),
                        photoPath = photoPath,
                        videoPath = videoPath,
                        signaturePath = signaturePath,
                        polygonPoints = if (polygonVertices.size >= 3) polygonVertices else null,
                    )
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
        fun newInstance() = FarmFormFragment()
    }
}
