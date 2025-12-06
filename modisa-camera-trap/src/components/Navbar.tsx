'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LayoutDashboard, Upload, CheckSquare, LogOut } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="bg-modisa-surface border-b border-modisa-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-modisa-green font-semibold text-lg">
              Modisa
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
              <Link href="/upload" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <Upload size={18} />
                Upload
              </Link>
              <Link href="/review" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
                <CheckSquare size={18} />
                Review
              </Link>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
