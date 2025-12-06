'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Camera, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CAMERA_STATIONS, SPECIES_LIST } from '@/lib/species';

interface UploadFile {
  file: File;
  preview: string;
  status: 'pending' | 'identifying' | 'done' | 'error';
  aiResult?: {
    species_id: string;
    confidence: number;
    reasoning: string;
  };
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedStation, setSelectedStation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles: UploadFile[] = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Auto-identify each image
    for (let i = 0; i < newFiles.length; i++) {
      const fileIndex = files.length + i;
      await identifyImage(newFiles[i], fileIndex);
    }
  };

  const identifyImage = async (uploadFile: UploadFile, index: number) => {
    setFiles(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'identifying' } : f
    ));

    try {
      const base64 = await fileToBase64(uploadFile.file);
      
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 })
      });

      if (!response.ok) throw new Error('Identification failed');

      const result = await response.json();
      
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'done', aiResult: result } : f
      ));
    } catch (err) {
      setFiles(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error' } : f
      ));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getSpeciesName = (id: string) => {
    if (id === 'empty') return 'No animal visible';
    if (id === 'unknown') return 'Unknown species';
    return SPECIES_LIST.find(s => s.id === id)?.commonName || id;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }
    if (!selectedStation) {
      setError('Please select a camera station');
      return;
    }

    setUploading(true);
    setError('');

    try {
      for (const uploadFile of files) {
        const fileExt = uploadFile.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('camera-trap-images')
          .upload(filePath, uploadFile.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('camera-trap-images')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('sightings')
          .insert({
            image_url: publicUrl,
            camera_station: selectedStation,
            status: 'pending',
            captured_at: new Date().toISOString(),
            ai_suggestion: uploadFile.aiResult?.species_id || null,
            ai_confidence: uploadFile.aiResult?.confidence || null,
          });

        if (dbError) throw dbError;
      }

      router.push('/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">
          <span className="text-green-500">Upload</span> Images
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 mb-2">Camera Station</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 focus:outline-none"
            >
              <option value="">Select station...</option>
              {CAMERA_STATIONS.map(station => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
          >
            <Camera className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Click to select images</p>
            <p className="text-gray-500 text-sm">JPG, PNG up to 10MB each</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              {files.map((uploadFile, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <img 
                      src={uploadFile.preview} 
                      alt="Preview" 
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate text-sm mb-2">{uploadFile.file.name}</p>
                      
                      {uploadFile.status === 'identifying' && (
                        <div className="flex items-center text-yellow-500 text-sm">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Identifying species...
                        </div>
                      )}
                      
                      {uploadFile.status === 'done' && uploadFile.aiResult && (
                        <div className="text-sm">
                          <p className="text-green-400">
                            {getSpeciesName(uploadFile.aiResult.species_id)}
                            <span className="text-gray-500 ml-2">
                              ({Math.round(uploadFile.aiResult.confidence * 100)}%)
                            </span>
                          </p>
                          <p className="text-gray-500 text-xs mt-1">{uploadFile.aiResult.reasoning}</p>
                        </div>
                      )}
                      
                      {uploadFile.status === 'error' && (
                        <p className="text-red-500 text-sm">Identification failed</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || files.some(f => f.status === 'identifying')}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
          >
            {uploading ? (
              'Uploading...'
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload {files.length} Image{files.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
