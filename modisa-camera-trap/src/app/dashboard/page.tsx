'use client';

import Link from 'next/link';
import { Camera, Upload, CheckCircle, Eye } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            <span className="text-green-500">Modisa</span> Camera Traps
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/upload" className="block">
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-green-500">
              <Upload className="w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Upload Images</h2>
              <p className="text-gray-400">Upload new camera trap images for identification</p>
            </div>
          </Link>

          <Link href="/review" className="block">
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-green-500">
              <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Review Pending</h2>
              <p className="text-gray-400">Review and confirm species identifications</p>
            </div>
          </Link>

          <Link href="/sightings" className="block">
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors border border-gray-700 hover:border-green-500">
              <Eye className="w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">View Sightings</h2>
              <p className="text-gray-400">Browse all confirmed wildlife sightings</p>
            </div>
          </Link>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <Camera className="w-12 h-12 text-gray-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Camera Stations</h2>
            <p className="text-gray-400">Manage camera trap locations (coming soon)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
