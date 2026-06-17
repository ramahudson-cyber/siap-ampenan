// src/components/SelfieCapture.jsx
import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { useSelfie } from '../hooks/useSelfie'

export default function SelfieCapture({ userId, onSuccess }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [preview, setPreview] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [status, setStatus] = useState(null) // 'success' | 'error'
  const { uploadSelfie, uploading, error } = useSelfie()

  // Buka kamera
  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      videoRef.current.srcObject = mediaStream
      setStream(mediaStream)
      setCameraOpen(true)
    } catch {
      alert('Tidak dapat mengakses kamera')
    }
  }

  // Ambil foto
  const capture = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setPreview(dataUrl)
    stream?.getTracks().forEach(t => t.stop())
    setCameraOpen(false)
  }, [stream])

  // Upload foto
  const handleUpload = async () => {
    if (!preview) return
    const blob = await fetch(preview).then(r => r.blob())
    const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' })
    const path = await uploadSelfie(file, userId)
    if (path) {
      setStatus('success')
      onSuccess?.(path)
    } else {
      setStatus('error')
    }
  }

  const reset = () => {
    setPreview(null)
    setStatus(null)
    stream?.getTracks().forEach(t => t.stop())
    setCameraOpen(false)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
        📸 Selfie Absensi
      </h3>

      {/* Video stream */}
      {cameraOpen && (
        <div className="relative rounded-xl overflow-hidden border-4 border-blue-500">
          <video ref={videoRef} autoPlay playsInline className="w-72 h-56 object-cover" />
          <button
            onClick={capture}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white text-blue-600 rounded-full px-6 py-2 font-bold shadow-lg hover:scale-105 transition"
          >
            Ambil Foto
          </button>
        </div>
      )}

      {/* Preview */}
      {preview && !cameraOpen && (
        <div className="relative">
          <img src={preview} alt="Preview" className="w-72 h-56 object-cover rounded-xl border-4 border-green-400" />
          <button onClick={reset} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
            <X size={14} />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Status */}
      {status === 'success' && (
        <div className="flex items-center gap-2 text-green-600 font-medium">
          <CheckCircle size={20} /> Selfie berhasil disimpan!
        </div>
      )}
      {(status === 'error' || error) && (
        <div className="flex items-center gap-2 text-red-500 font-medium">
          <AlertCircle size={20} /> {error || 'Gagal upload'}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!preview && !cameraOpen && (
          <button
            onClick={openCamera}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition"
          >
            <Camera size={18} /> Buka Kamera
          </button>
        )}
        {preview && status !== 'success' && (
          <>
            <button onClick={openCamera} className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition">
              Ulangi
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition disabled:opacity-60"
            >
              <Upload size={18} /> {uploading ? 'Mengupload...' : 'Simpan Selfie'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}