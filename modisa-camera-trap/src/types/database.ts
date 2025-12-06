export type SightingStatus = 'pending' | 'verified' | 'rejected'
export type ImageQuality = 'clear' | 'motion_blur' | 'partial' | 'poor'
export type SpeciesCategory = 'mammal' | 'bird' | 'reptile' | 'plant'

export interface Species {
  id: string
  common_name: string
  scientific_name: string
  category: SpeciesCategory
  created_at: string
}

export interface Sighting {
  id: string
  image_url: string
  original_filename: string | null
  camera_id: string | null
  captured_at: string | null
  temperature_c: number | null
  moon_phase: string | null
  status: SightingStatus
  image_quality: ImageQuality
  auto_verified: boolean
  requires_review: boolean
  notes: string | null
  created_at: string
  verified_at: string | null
  verified_by: string | null
}

export interface Detection {
  id: string
  sighting_id: string
  species_common: string
  species_scientific: string | null
  count: number
  confidence: number | null
  behavior: string | null
  is_ai_generated: boolean
  created_at: string
}

export interface SightingWithDetections extends Sighting {
  detections: Detection[]
}
