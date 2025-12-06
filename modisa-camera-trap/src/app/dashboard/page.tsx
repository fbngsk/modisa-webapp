'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase } from '@/lib/supabase'
import { Clock, CheckCircle, AlertTriangle, Upload, CheckSquare } from 'lucide-react'

interface Stats {
  pending: number
  verified: number
  needsReview: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ pending: 0, verified: 0, needsReview: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [pendingRes, verifiedRes, reviewRes] = await Promise.all([
        supabase.from('sightings').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('sightings').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
        supabase.from('sightings').select('id', { count: 'exact', head: true }).eq('requires_review', true),
      ])

      setStats({
        pending: pendingRes.count || 0,
        verified: verifiedRes.count || 0,
        needsReview: reviewRes.count || 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [])

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
        
        {loading ? (
          <div className="text-gray-400">Loading stats...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="text-yellow-500" size={24} />
                  <span className="text-gray-400">Pending</span>
                </div>
                <p className="text-3xl font-bold">{stats.pending}</p>
              </div>
              
              <div className="card">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="text-modisa-green" size={24} />
                  <span className="text-gray-400">Verified</span>
                </div>
                <p className="text-3xl font-bold">{stats.verified}</p>
              </div>
              
              <div className="card">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="text-orange-500" size={24} />
                  <span className="text-gray-400">Needs Review</span>
                </div>
                <p className="text-3xl font-bold">{stats.needsReview}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/upload" className="card hover:border-modisa-green transition-colors group">
                <div className="flex items-center gap-3">
                  <Upload className="text-modisa-green" size={24} />
                  <div>
                    <h3 className="font-semibold group-hover:text-modisa-green transition-colors">Upload Images</h3>
                    <p className="text-sm text-gray-400">Add new camera trap photos</p>
                  </div>
                </div>
              </Link>
              
              <Link href="/review" className="card hover:border-modisa-green transition-colors group">
                <div className="flex items-center gap-3">
                  <CheckSquare className="text-modisa-green" size={24} />
                  <div>
                    <h3 className="font-semibold group-hover:text-modisa-green transition-colors">Review Sightings</h3>
                    <p className="text-sm text-gray-400">Verify pending identifications</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </main>
    </ProtectedRoute>
  )
}
