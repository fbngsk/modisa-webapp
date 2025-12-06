'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPECIES_LIST, CAMERA_STATIONS } from '@/lib/species';

interface Sighting {
  id: string;
  image_url: string;
  camera_station: string;
  species_id: string | null;
  ai_suggestion: string | null;
  ai_confidence: number | null;
  captured_at: string;
  status: string;
}

export default function ReviewPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPendingSightings();
  }, []);

  const fetchPendingSightings = async () => {
    const { data, error } = await supabase
      .from('sightings')
      .select('*')
      .eq('status', 'pending')
      .order('captured_at', { ascending: false });

    if (!error && data) {
      setSightings(data);
      if (data.length > 0 && data[0].ai_suggestion) {
        setSelectedSpecies(data[0].ai_suggestion);
      }
    }
    setLoading(false);
  };

  const currentSighting = sightings[currentIndex];

  const handleConfirm = async () => {
    if (!currentSighting || !selectedSpecies) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('sightings')
      .update({
        species_id: selectedSpecies,
        status: 'confirmed',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id);

    if (!error) {
      const newSightings = sightings.filter((_, i) => i !== currentIndex);
      setSightings(newSightings);
      if (currentIndex >= newSightings.length && newSightings.length > 0) {
        setCurrentIndex(newSightings.length - 1);
      }
      if (newSightings[currentIndex]?.ai_suggestion) {
        setSelectedSpecies(newSightings[currentIndex].ai_suggestion);
      } else {
        setSelectedSpecies('');
      }
    }
    setSaving(false);
  };

  const handleReject = async () => {
    if (!currentSighting) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('sightings')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id);

    if (!error) {
      const newSightings = sightings.filter((_, i) => i !== currentIndex);
      setSightings(newSightings);
      if (currentIndex >= newSightings.length && newSightings.length > 0) {
        setCurrentIndex(newSightings.length - 1);
      }
    }
    setSaving(false);
  };

  const goToNext = () => {
    if (currentIndex < sightings.length - 1) {
      setCurrentIndex(currentIndex + 1);
      const next = sightings[currentIndex + 1];
      setSelectedSpecies(next?.ai_suggestion || '');
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prev = sightings[currentIndex - 1];
      setSelectedSpecies(prev?.ai_suggestion || '');
    }
  };

  const getStationName = (id: string) => {
    return CAMERA_STATIONS.find(s => s.id === id)?.name || id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            <span className="text-green-500">Review</span> Pending
          </h1>
          <span className="text-gray-400">
            {sightings.length} pending
          </span>
        </div>

        {sightings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">No pending sightings to review</p>
            <Link href="/upload" className="text-green-500 hover:underline mt-2 inline-block">
              Upload new images
            </Link>
          </div>
        ) : currentSighting && (
          <div className="space-y-6">
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                <Image
                  src={currentSighting.image_url}
                  alt="Camera trap image"
                  fill
                  className="object-contain"
                />
              </div>
              
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="bg-black/50 hover:bg-black/70 disabled:opacity-50 p-2 rounded-full"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === sightings.length - 1}
                  className="bg-black/50 hover:bg-black/70 disabled:opacity-50 p-2 rounded-full"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded">
                <p className="text-white text-sm">
                  {currentIndex + 1} of {sightings.length}
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-400">Station:</span>
                  <span className="text-white ml-2">{getStationName(currentSighting.camera_station)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Captured:</span>
                  <span className="text-white ml-2">
                    {new Date(currentSighting.captured_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {currentSighting.ai_suggestion && (
                <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm">
                    AI Suggestion: <strong>{SPECIES_LIST.find(s => s.id === currentSighting.ai_suggestion)?.commonName || currentSighting.ai_suggestion}</strong>
                    {currentSighting.ai_confidence && ` (${Math.round(currentSighting.ai_confidence * 100)}% confidence)`}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-300 mb-2">Select Species</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select species...</option>
                  <option value="empty">No animal visible</option>
                  <option value="unknown">Unknown species</option>
                  {SPECIES_LIST.map(species => (
                    <option key={species.id} value={species.id}>
                      {species.commonName} ({species.scientificName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReject}
                disabled={saving}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-600 text-red-500 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 mr-2" />
                Reject
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !selectedSpecies}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
