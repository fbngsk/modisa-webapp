import Link from 'next/link'
import { Camera, Eye } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          <span className="text-modisa-green">Modisa</span> Camera Trap
        </h1>
        <p className="text-gray-400 max-w-md">
          Wildlife monitoring system for the Kalahari, Botswana
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/login" className="btn-primary flex items-center gap-2">
          <Camera size={20} />
          Ranger Login
        </Link>
        <Link href="/sightings" className="btn-secondary flex items-center gap-2">
          <Eye size={20} />
          View Sightings
        </Link>
      </div>
      
      <footer className="absolute bottom-8 text-gray-500 text-sm">
        Modisa Wildlife Project
      </footer>
    </main>
  )
}
