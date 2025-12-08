'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Check, X, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SPECIES_LIST, CAMERA_STATIONS } from '@/lib/species';

interface AIAnimal {
  species_id: string;
  common_name: string;
  scientific_name: string;
  quantity: number;
  confidence: number;
}

interface Sighting {
  id: string;
  image_url: string;
  camera_station: string;
  species_id: string | null;
  ai_suggestion: string | null;
  ai_confidence: number | null;
  ai_quantity: number | null;
  ai_all_animals: AIAnimal[] | null;
  time_of_day: string | null;
  date_time: string | null;
  captured_at: string;
  status: string;
  needs_review: boolean;
}

export default function ReviewPage() {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSpecies, setSelectedSpecies] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPendingSightings();
  }, []);

  const fetchPendingSightings = async () => {
    const { data, error } = await supabase
      .from('sightings')
      .select('*')
      .or('status.eq.pending_review,needs_review.eq.true')
      .order('captured_at', { ascending: false });

    if (!error && data) {
      setSightings(data);
      if (data.length > 0) {
        setSelectedSpecies(data[0].ai_suggestion || '');
        setQuantity(data[0].ai_quantity || 1);
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
        confirmed_species: selectedSpecies,
        confirmed_quantity: quantity,
        status: 'confirmed',
        needs_review: false,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id);

    if (!error) {
      moveToNext();
    }
    setSaving(false);
  };

  const handleNoAnimal = async () => {
    if (!currentSighting) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('sightings')
      .update({
        species_id: 'empty',
        confirmed_species: 'empty',
        confirmed_quantity: 0,
        status: 'confirmed',
        needs_review: false,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id);

    if (!error) {
      moveToNext();
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
        needs_review: false,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id);

    if (!error) {
      moveToNext();
    }
    setSaving(false);
  };

  const moveToNext = () => {
    const newSightings = sightings.filter((_, i) => i !== currentIndex);
    setSightings(newSightings);
    
    const newIndex = Math.min(currentIndex, newSightings.length - 1);
    setCurrentIndex(Math.max(0, newIndex));
    
    if (newSightings.length > 0) {
      const next = newSightings[newIndex];
      setSelectedSpecies(next?.ai_suggestion || '');
      setQuantity(next?.ai_quantity || 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < sightings.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      const next = sightings[newIndex];
      setSelectedSpecies(next?.ai_suggestion || '');
      setQuantity(next?.ai_quantity || 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const prev = sightings[newIndex];
      setSelectedSpecies(prev?.ai_suggestion || '');
      setQuantity(prev?.ai_quantity || 1);
    }
  };

  const getStationName = (id: string) => {
    return CAMERA_STATIONS.find(s => s.id === id)?.name || id;
  };

  const formatTimeOfDay = (time: string | null) => {
    if (!time) return null;
    const labels: Record<string, string> = {
      'day': '☀️ Day',
      'night': '🌙 Night',
      'dawn': '🌅 Dawn',
      'dusk': '🌆 Dusk',
    };
    return labels[time] || time;
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
            <span className="text-yellow-500">Review</span> Pending
          </h1>
          <span className="text-gray-400">
            {sightings.length} pending
          </span>
        </div>

        {sightings.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-white text-xl mb-2">All caught up!</p>
            <p className="text-gray-400 mb-4">No images need review right now.</p>
            <Link href="/upload" className="text-green-500 hover:underline">
              Upload new images
            </Link>
          </div>
        ) : currentSighting && (
          <div className="space-y-6">
            {/* Image viewer */}
            <div className="relative bg-gray-800 rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                <Image
                  src={currentSighting.image_url}
                  alt="Camera trap image"
                  fill
                  className="object-contain"
                />
              </div>
              
              {/* Navigation arrows */}
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

              {/* Counter */}
              <div className="absolute bottom-4 left-4 bg-black/70 px-3 py-1 rounded">
                <p className="text-white text-sm">
                  {currentIndex + 1} of {sightings.length}
                </p>
              </div>
            </div>

            {/* Info panel */}
            <div className="bg-gray-800 rounded-lg p-4">
              {/* Metadata row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-400 block">Station</span>
                  <span className="text-white">{getStationName(currentSighting.camera_station)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Time</span>
                  <span className="text-white">
                    {formatTimeOfDay(currentSighting.time_of_day) || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Date from image</span>
                  <span className="text-white">
                    {currentSighting.date_time || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Uploaded</span>
                  <span className="text-white">
                    {new Date(currentSighting.captured_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* AI Suggestion */}
              {currentSighting.ai_suggestion && (
                <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <p className="text-yellow-400 text-sm font-medium mb-1">AI Suggestion</p>
                  <p className="text-white">
                    <strong>
                      {SPECIES_LIST.find(s => s.id === currentSighting.ai_suggestion)?.commonName || currentSighting.ai_suggestion}
                    </strong>
                    {currentSighting.ai_quantity && currentSighting.ai_quantity > 1 && (
                      <span className="text-gray-300"> × {currentSighting.ai_quantity}</span>
                    )}
                    {currentSighting.ai_confidence && (
                      <span className={`ml-2 ${currentSighting.ai_confidence >= 0.85 ? 'text-green-400' : 'text-yellow-400'}`}>
                        ({Math.round(currentSighting.ai_confidence * 100)}% confidence)
                      </span>
                    )}
                  </p>
                  
                  {/* Show all detected animals if multiple */}
                  {currentSighting.ai_all_animals && currentSighting.ai_all_animals.length > 1 && (
                    <div className="mt-2 pt-2 border-t border-yellow-700/50">
                      <p className="text-yellow-400/70 text-xs mb-1">All detections:</p>
                      {currentSighting.ai_all_animals.map((animal, i) => (
                        <p key={i} className="text-gray-300 text-sm">
                          {animal.common_name} × {animal.quantity} ({Math.round(animal.confidence * 100)}%)
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Species selection */}
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">Species</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select species...</option>
                  <option value="unknown">Unknown species</option>
                  {SPECIES_LIST.map(species => (
                    <option key={species.id} value={species.id}>
                      {species.commonName} ({species.scientificName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity selection */}
              <div>
                <label className="block text-gray-300 mb-2">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-lg flex items-center justify-center"
                  >
                    <Minus className="w-5 h-5 text-white" />
                  </button>
                  <span className="text-3xl font-bold text-white w-16 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="bg-gray-700 hover:bg-gray-600 w-12 h-12 rounded-lg flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleConfirm}
                disabled={saving || !selectedSpecies}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm Identification
              </button>
              
              <button
                onClick={handleNoAnimal}
                disabled={saving}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
              >
                No Animal in Image
              </button>

              <button
                onClick={handleReject}
                disabled={saving}
                className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-600 text-red-500 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5 mr-2" />
                Reject / Bad Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
