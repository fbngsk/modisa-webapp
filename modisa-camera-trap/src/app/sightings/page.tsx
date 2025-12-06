'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { SightingWithDetections } from '@/types/database'
import { ArrowLeft, X, Calendar, MapPin } from 'lucide-react'

export default function SightingsPage() {
  const [sightings, setSightings] = useState<SightingWithDetections[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSighting, setSelectedSighting] = useState<SightingWithDetections | null>(null)

  useEffect(() => {
    fetchSightings()
  }, [])

  const fetchSightings = async () => {
    const { data: sightingsData } = await supabase
      .from('sightings')
      .select('*')
      .eq('status', 'verified')
      .order('verified_at', { ascending: false })

    if (sightingsData) {
      // Fetch detections for each sighting
      const sightingsWithDetections = await Promise.all(
        sightingsData.map(async (sighting) => {
          const { data: detections } = await supabase
            .from('detections')
            .select('*')
            .eq('sighting_id', sighting.id)
          
          return {
            ...sighting,
            detections: detections || []
          }
        })
      )
      setSightings(sightingsWithDetections)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-modisa-surface border-b border-modisa-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
              Back
            </Link>
            <h1 className="text-lg font-semibold">
              <span className="text-modisa-green">Kalahari</span> Wildlife Sightings
            </h1>
            <div className="w-16" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Loading sightings...</div>
        ) : sightings.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No verified sightings yet
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sightings.map((sighting) => (
              <button
                key={sighting.id}
                onClick={() => setSelectedSighting(sighting)}
                className="card p-0 overflow-hidden text-left hover:border-modisa-green transition-colors group"
              >
                <div className="relative aspect-video bg-black">
                  <Image
                    src={sighting.image_url}
                    alt="Wildlife sighting"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                </div>
                <div className="p-3">
                  {sighting.detections.length > 0 ? (
                    <p className="font-medium">
                      {sighting.detections.map(d => 
                        `${d.species_common}${d.count > 1 ? ` (${d.count})` : ''}`
                      ).join(', ')}
                    </p>
                  ) : (
                    <p className="text-gray-400">Unknown</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {sighting.verified_at && new Date(sighting.verified_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedSighting && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSighting(null)}
        >
          <div 
            className="bg-modisa-surface border border-modisa-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <Image
                src={selectedSighting.image_url}
                alt="Wildlife sighting"
                fill
                className="object-contain"
                unoptimized
              />
              <button
                onClick={() => setSelectedSighting(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSighting.detections.map((d, i) => (
                  <span key={i} className="bg-modisa-green/20 text-modisa-green px-3 py-1 rounded-full text-sm">
                    {d.species_common} {d.count > 1 && `×${d.count}`}
                  </span>
                ))}
              </div>
              
              <div className="flex flex-wrap gap-6 text-sm text-gray-400">
                {selectedSighting.verified_at && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    {new Date(selectedSighting.verified_at).toLocaleDateString()}
                  </div>
                )}
                {selectedSighting.camera_id && (
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    Camera: {selectedSighting.camera_id}
                  </div>
                )}
              </div>
              
              {selectedSighting.notes && (
                <p className="mt-4 text-gray-300">{selectedSighting.notes}</p>
              )}
              
              {selectedSighting.detections[0]?.species_scientific && (
                <p className="mt-2 text-sm text-gray-500 italic">
                  {selectedSighting.detections[0].species_scientific}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
