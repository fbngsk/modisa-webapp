'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CAMERA_STATIONS } from '@/lib/species';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AnimalDetection {
  species_id: string;
  common_name: string;
  scientific_name: string;
  quantity: number;
  confidence: number;
}

interface AIResult {
  detected: boolean;
  animals: AnimalDetection[];
  time_of_day: 'day' | 'night' | 'dawn' | 'dusk' | 'unknown';
  date_time: string | null;
  needs_review: boolean;
}

interface ImageFile {
  file: File;
  preview: string;
  status: 'pending' | 'identifying' | 'done' | 'error' | 'retrying';
  aiResult?: AIResult;
  error?: string;
  retryCount: number;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function UploadPage() {
  const router = useRouter();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [stationId, setStationId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const identifyImage = async (file: File, index: number, retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = 2000;

    setImages(prev => prev.map((img, i) => 
      i === index ? { ...img, status: retryCount > 0 ? 'retrying' : 'identifying', retryCount } : img
    ));

    try {
      const base64 = await fileToBase64(file);
      
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });

      if (response.status === 429 && retryCount < maxRetries) {
        await delay(retryDelay * (retryCount + 1));
        return identifyImage(file, index, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        if (result.retryable && retryCount < maxRetries) {
          await delay(retryDelay * (retryCount + 1));
          return identifyImage(file, index, retryCount + 1);
        }
        throw new Error(result.error);
      }

      setImages(prev => prev.map((img, i) => 
        i === index ? { ...img, status: 'done', aiResult: result, retryCount } : img
      ));

    } catch (err) {
      if (retryCount < maxRetries) {
        await delay(retryDelay * (retryCount + 1));
        return identifyImage(file, index, retryCount + 1);
      }

      setImages(prev => prev.map((img, i) => 
        i === index ? { 
          ...img, 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Identification failed',
          retryCount 
        } : img
      ));
    }
  };

  const processImagesSequentially = async (files: File[], startIndex: number) => {
    for (let i = 0; i < files.length; i++) {
      const stateIndex = startIndex + i;
      setProcessingIndex(stateIndex);
      
      await identifyImage(files[i], stateIndex);
      
      if (i < files.length - 1) {
        await delay(500);
      }
    }
    setProcessingIndex(null);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const startIndex = images.length;

    const newImages: ImageFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
      retryCount: 0
    }));

    setImages(prev => [...prev, ...newImages]);
    
    setTimeout(() => {
      processImagesSequentially(files, startIndex);
    }, 100);

  }, [images.length]);

  const retryIdentification = async (index: number) => {
    const imageToRetry = images[index];
    if (imageToRetry) {
      await identifyImage(imageToRetry.file, index, 0);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleUpload = async () => {
    if (!stationId || images.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const image of images) {
        const fileName = `${Date.now()}-${image.file.name}`;
        const filePath = `${stationId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('camera-trap-images')
          .upload(filePath, image.file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('camera-trap-images')
          .getPublicUrl(filePath);

        // Insert one sighting per detected animal
        if (image.aiResult?.animals && image.aiResult.animals.length > 0) {
          for (const animal of image.aiResult.animals) {
            const { error: insertError } = await supabase
              .from('sightings')
              .insert({
                image_url: urlData.publicUrl,
                camera_station: stationId,
                ai_suggestion: animal.species_id,
                ai_confidence: animal.confidence,
                quantity: animal.quantity,
                time_of_day: image.aiResult.time_of_day,
                status: 'pending'
              });

            if (insertError) throw insertError;
          }
        } else {
          // No animals detected - still create record
          const { error: insertError } = await supabase
            .from('sightings')
            .insert({
              image_url: urlData.publicUrl,
              camera_station: stationId,
              ai_suggestion: null,
              ai_confidence: null,
              status: 'pending'
            });

          if (insertError) throw insertError;
        }
      }

      router.push('/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatTimeOfDay = (time: string) => {
    const labels: Record<string, string> = {
      day: '☀️ Day',
      night: '🌙 Night',
      dawn: '🌅 Dawn',
      dusk: '🌆 Dusk',
      unknown: '❓ Unknown'
    };
    return labels[time] || time;
  };

  const getStatusBadge = (image: ImageFile, index: number) => {
    switch (image.status) {
      case 'pending':
        return <span className="text-gray-400">Waiting...</span>;
      case 'identifying':
        return <span className="text-yellow-400">🔍 Identifying...</span>;
      case 'retrying':
        return <span className="text-orange-400">🔄 Retry {image.retryCount}/3...</span>;
      case 'done':
        const result = image.aiResult!;
        if (!result.detected || result.animals.length === 0) {
          return <span className="text-gray-400">No animals detected</span>;
        }
        return (
          <div className="space-y-2">
            {result.animals.map((animal, i) => (
              <div key={i} className="text-sm">
                <div className="text-green-400 font-medium">
                  {animal.common_name} <span className="text-gray-500 italic">({animal.scientific_name})</span>
                </div>
                <div className="text-gray-400">
                  Quantity: {animal.quantity} • {Math.round(animal.confidence * 100)}% confidence
                </div>
              </div>
            ))}
            <div className="text-gray-500 text-xs pt-1 border-t border-gray-700">
              {formatTimeOfDay(result.time_of_day)}
              {result.date_time && ` • ${result.date_time}`}
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <span className="text-red-400">Failed</span>
            <button 
              onClick={() => retryIdentification(index)}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              Retry
            </button>
          </div>
        );
    }
  };

  const isProcessing = images.some(img => img.status === 'identifying' || img.status === 'retrying');
  const hasImages = images.length > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-gray-400 hover:text-white mb-6 inline-block">
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-6">
          <span className="text-green-400">Upload</span> Images
        </h1>

        <div className="mb-6">
          <label className="block text-sm mb-2">Camera Station</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3"
          >
            <option value="">Select a station...</option>
            {CAMERA_STATIONS.map(station => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block border-2 border-dashed border-green-500/50 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 transition">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <div className="text-5xl mb-3">📷</div>
            <p className="text-lg">Click to select images</p>
            <p className="text-gray-400 text-sm">JPG, PNG up to 10MB each</p>
          </label>
        </div>

        {isProcessing && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-green-400 border-t-transparent rounded-full"></div>
              <span className="text-sm">
                Processing image {(processingIndex ?? 0) + 1} of {images.length}...
              </span>
            </div>
          </div>
        )}

        {images.length > 0 && (
          <div className="space-y-3 mb-6">
            {images.map((image, index) => (
              <div key={index} className="flex items-start gap-4 bg-gray-800 p-4 rounded-lg">
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <p className="font-medium mb-2">{image.file.name}</p>
                  {getStatusBadge(image, index)}
                </div>
                <button
                  onClick={() => removeImage(index)}
                  className="text-gray-400 hover:text-red-400 text-xl"
                  disabled={isProcessing}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!stationId || !hasImages || uploading || isProcessing}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed py-4 rounded-xl font-medium text-lg transition"
        >
          {uploading ? 'Uploading...' : isProcessing ? 'Identifying...' : `Upload ${images.length} Image${images.length !== 1 ? 's' : ''}`}
        </button>

        {hasImages && (
          <div className="mt-4 text-center text-sm text-gray-400">
            {images.filter(i => i.status === 'done').length} identified • 
            {images.filter(i => i.status === 'error').length} failed • 
            {images.filter(i => i.status === 'pending' || i.status === 'identifying' || i.status === 'retrying').length} processing
          </div>
        )}
      </div>
    </div>
  );
}
