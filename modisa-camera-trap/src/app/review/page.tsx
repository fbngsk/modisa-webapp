'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { Sighting, Species } from '@/types/database'
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react'

export default function ReviewPage() {
  const [sightings, setSightings] = useState<Sighting[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [selectedSpecies, setSelectedSpecies] = useState('')
  const [count, setCount] = useState(1)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [sightingsRes, speciesRes] = await Promise.all([
      supabase
        .from('sightings')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase
        .from('species')
        .select('*')
        .order('common_name')
    ])

    if (sightingsRes.data) setSightings(sightingsRes.data)
    if (speciesRes.data) setSpecies(speciesRes.data)
    setLoading(false)
  }

  const currentSighting = sightings[currentIndex]

  const handleVerify = async () => {
    if (!currentSighting || !selectedSpecies) return
    setSaving(true)

    const selectedSpeciesData = species.find(s => s.common_name === selectedSpecies)

    // Create detection
    await supabase.from('detections').insert({
      sighting_id: currentSighting.id,
      species_common: selectedSpecies,
      species_scientific: selectedSpeciesData?.scientific_name || null,
      count: count,
      confidence: 1.0,
      is_ai_generated: false,
    })

    // Update sighting status
    await supabase
      .from('sightings')
      .update({
        status: 'verified',
        notes: notes || null,
        requires_review: false,
        verified_at: new Date().toISOString(),
      })
      .eq('id', currentSighting.id)

    // Remove from list and reset form
    setSightings(prev => prev.filter((_, i) => i !== currentIndex))
    resetForm()
    if (currentIndex >= sightings.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1))
    }
    setSaving(false)
  }

  const handleReject = async () => {
    if (!currentSighting) return
    setSaving(true)

    await supabase
      .from('sightings')
      .update({
        status: 'rejected',
        notes: notes || null,
        requires_review: false,
      })
      .eq('id', currentSighting.id)

    setSightings(prev => prev.filter((_, i) => i !== currentIndex))
    resetForm()
    if (currentIndex >= sightings.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1))
    }
    setSaving(false)
  }

  const resetForm = () => {
    setSelectedSpecies('')
    setCount(1)
    setNotes('')
  }

  const goNext = () => {
    if (currentIndex < sightings.length - 1) {
      setCurrentIndex(currentIndex + 1)
      resetForm()
    }
  }

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      resetForm()
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-gray-400">Loading...</div>
        </main>
      </ProtectedRoute>
    )
  }

  if (sightings.length === 0) {
    return (
      <ProtectedRoute>
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">Review Sightings</h1>
          <div className="card text-center py-12">
            <p className="text-gray-400">No pending sightings to review</p>
          </div>
        </main>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Review Sightings</h1>
          <span className="text-gray-400">
            {currentIndex + 1} of {sightings.length}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image viewer */}
          <div className="lg:col-span-2">
            <div className="card p-0 overflow-hidden">
              <div className="relative aspect-video bg-black">
                {currentSighting && (
                  <Image
                    src={currentSighting.image_url}
                    alt="Camera trap image"
                    fill
                    className="object-contain"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex items-center justify-between p-4 border-t border-modisa-border">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="btn-secondary disabled:opacity-30"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-400 truncate px-4">
                  {currentSighting?.original_filename}
                </span>
                <button
                  onClick={goNext}
                  disabled={currentIndex === sightings.length - 1}
                  className="btn-secondary disabled:opacity-30"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Review form */}
          <div className="card">
            <h2 className="font-semibold mb-4">Identify Species</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Species</label>
                <select
                  value={selectedSpecies}
                  onChange={(e) => setSelectedSpecies(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Select species...</option>
                  {species.map((s) => (
                    <option key={s.id} value={s.common_name}>
                      {s.common_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Count</label>
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input w-full h-20 resize-none"
                  placeholder="Behavior, age, condition..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleVerify}
                  disabled={!selectedSpecies || saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Verify
                </button>
                <button
                  onClick={handleReject}
                  disabled={saving}
                  className="btn-secondary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <X size={18} />
                  Reject
                </button>
              </div>
            </div>

            {currentSighting && (
              <div className="mt-6 pt-6 border-t border-modisa-border">
                <h3 className="text-sm text-gray-400 mb-2">Metadata</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Uploaded</dt>
                    <dd>{new Date(currentSighting.created_at).toLocaleDateString()}</dd>
                  </div>
                  {currentSighting.camera_id && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Camera</dt>
                      <dd>{currentSighting.camera_id}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </main>
    </ProtectedRoute>
  )
}
