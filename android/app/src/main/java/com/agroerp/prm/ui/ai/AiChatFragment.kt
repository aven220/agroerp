package com.agroerp.prm.ui.ai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.Bundle
import android.speech.RecognizerIntent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Spinner
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.agroerp.prm.AgroErpApp
import com.agroerp.prm.R
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AiChatFragment : Fragment() {
    private lateinit var messagesContainer: LinearLayout
    private lateinit var input: EditText
    private lateinit var copilotSpinner: Spinner
    private var conversationId: String? = null

    private val speechLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        matches?.firstOrNull()?.let { input.setText(it) }
    }

    private val cameraLauncher = registerForActivityResult(ActivityResultContracts.TakePicturePreview()) { bitmap ->
        bitmap?.let { analyzeImage(it) }
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.fragment_ai_chat, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        messagesContainer = view.findViewById(R.id.aiMessagesContainer)
        input = view.findViewById(R.id.aiInput)
        copilotSpinner = view.findViewById(R.id.aiCopilotSpinner)
        view.findViewById<Button>(R.id.aiSendBtn).setOnClickListener { send() }
        view.findViewById<Button>(R.id.aiVoiceBtn).setOnClickListener { startVoice() }
        view.findViewById<Button>(R.id.aiCameraBtn).setOnClickListener { startCamera() }
        loadCopilots()
        showOfflineCache()
    }

    private fun loadCopilots() {
        val repo = (requireActivity().application as AgroErpApp).aiRepository
        lifecycleScope.launch {
            try {
                val copilots = withContext(Dispatchers.IO) { repo.fetchCopilots() }
                val adapter = android.widget.ArrayAdapter(
                    requireContext(),
                    android.R.layout.simple_spinner_item,
                    listOf("General") + copilots.map { it.name },
                )
                adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
                copilotSpinner.adapter = adapter
            } catch (_: Exception) { }
        }
    }

    private fun showOfflineCache() {
        val cache = (requireActivity().application as AgroErpApp).aiRepository.getOfflineCache()
        if (cache.isNotEmpty()) {
            addMessage("Sistema", "Consultas offline en caché: ${cache.size}")
        }
    }

    private fun send() {
        val prompt = input.text.toString().trim()
        if (prompt.isEmpty()) return
        input.setText("")
        addMessage("Usted", prompt)
        val repo = (requireActivity().application as AgroErpApp).aiRepository
        lifecycleScope.launch {
            try {
                val res = withContext(Dispatchers.IO) { repo.chat(prompt, conversationId = conversationId) }
                conversationId = res.conversationId
                addMessage("IA", res.content)
            } catch (e: Exception) {
                val cached = repo.findOfflineMatch(prompt)
                if (cached != null) {
                    addMessage("IA (offline)", cached)
                } else {
                    addMessage("Error", e.message ?: "Sin conexión")
                }
            }
        }
    }

    private fun analyzeImage(bitmap: Bitmap) {
        addMessage("Usted", "[Imagen capturada ${bitmap.width}x${bitmap.height}]")
        val repo = (requireActivity().application as AgroErpApp).aiRepository
        lifecycleScope.launch {
            try {
                val res = withContext(Dispatchers.IO) { repo.analyzeImage(bitmap) }
                addMessage("IA", res.content)
            } catch (e: Exception) {
                addMessage("Error", e.message ?: "No se pudo analizar la imagen")
            }
        }
    }

    private fun addMessage(who: String, text: String) {
        val tv = TextView(requireContext())
        tv.text = "$who: $text"
        tv.setPadding(0, 8, 0, 8)
        messagesContainer.addView(tv)
    }

    private fun startVoice() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 100)
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-CO")
        }
        speechLauncher.launch(intent)
    }

    private fun startCamera() {
        if (ContextCompat.checkSelfPermission(requireContext(), Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.CAMERA), 101)
            return
        }
        cameraLauncher.launch(null)
    }
}
