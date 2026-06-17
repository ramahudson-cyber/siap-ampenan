// src/hooks/useSelfie.js
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const useSelfie = () => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const uploadSelfie = async (file, userId) => {
    try {
      setUploading(true)
      setError(null)

      // Validasi file
      if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar')
      if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran maksimal 5MB')

      const ext = file.name.split('.').pop()
      const filePath = `${userId}/${Date.now()}.${ext}`

      // Upload ke bucket selfies
      const { error: uploadError } = await supabase.storage
        .from('selfies')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Simpan path ke database
      const { error: dbError } = await supabase
        .from('attendance')
        .update({ selfie_path: filePath })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (dbError) throw dbError

      return filePath

    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setUploading(false)
    }
  }

  const getSelfieUrl = async (filePath) => {
    const { data, error } = await supabase.storage
      .from('selfies')
      .createSignedUrl(filePath, 3600) // URL valid 1 jam

    if (error) return null
    return data.signedUrl
  }

  const deleteSelfie = async (filePath) => {
    const { error } = await supabase.storage
      .from('selfies')
      .remove([filePath])
    return !error
  }

  return { uploadSelfie, getSelfieUrl, deleteSelfie, uploading, error }
}