'use client'

import { useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface UploadFile {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export default function UploadPage() {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      f.type.startsWith('image/')
    )
    addFiles(droppedFiles)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      status: 'pending'
    }))
    setFiles(prev => [...prev, ...uploadFiles])
  }

  const uploadFiles = async () => {
    setUploading(true)
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' } : f
      ))

      try {
        const file = files[i].file
        const timestamp = Date.now()
        const fileName = `${timestamp}-${file.name}`
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('camera-trap-images')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('camera-trap-images')
          .getPublicUrl(fileName)

        // Create sighting record
        const { error: insertError } = await supabase
          .from('sightings')
          .insert({
            image_url: publicUrl,
            original_filename: file.name,
            status: 'pending',
            image_quality: 'clear',
            requires_review: true,
          })

        if (insertError) throw insertError

        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success' } : f
        ))
      } catch (error) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: (error as Error).message } : f
        ))
      }
    }
    
    setUploading(false)
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'))
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const successCount = files.filter(f => f.status === 'success').length

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Upload Images</h1>
        
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="card border-dashed border-2 text-center py-12 mb-6"
        >
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-400 mb-4">Drag and drop images here</p>
          <label className="btn-primary cursor-pointer">
            Browse Files
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {files.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                {successCount > 0 && ` • ${successCount} uploaded`}
              </p>
              <div className="flex gap-2">
                {successCount > 0 && (
                  <button onClick={clearCompleted} className="btn-secondary text-sm">
                    Clear Completed
                  </button>
                )}
                {pendingCount > 0 && (
                  <button
                    onClick={uploadFiles}
                    disabled={uploading}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : `Upload ${pendingCount}`}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              {files.map((f, idx) => (
                <div key={idx} className="card py-3 px-4 flex items-center justify-between">
                  <span className="truncate flex-1 mr-4">{f.file.name}</span>
                  {f.status === 'pending' && (
                    <span className="text-gray-400 text-sm">Pending</span>
                  )}
                  {f.status === 'uploading' && (
                    <Loader2 className="animate-spin text-modisa-green" size={20} />
                  )}
                  {f.status === 'success' && (
                    <CheckCircle className="text-modisa-green" size={20} />
                  )}
                  {f.status === 'error' && (
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-sm">{f.error}</span>
                      <XCircle className="text-red-400" size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </ProtectedRoute>
  )
}
