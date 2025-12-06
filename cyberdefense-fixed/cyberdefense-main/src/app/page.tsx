'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  // Track mouse position for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-blue-950 to-black">
      {/* Animated starfield background */}
      <div className="absolute inset-0">
        <div className="stars absolute inset-0" />
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.8 + 0.2
            }}
          />
        ))}
      </div>

      {/* Interactive mouse-follow effect */}
      <div
        className="pointer-events-none absolute h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transition: 'all 0.3s ease-out'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        {/* POS Logo and branding */}
        <div className="mb-12 text-center">
          <div className="mb-8 inline-flex items-center justify-center">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-emerald-400 p-1">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 shadow-lg shadow-blue-500/50" />
                </div>
              </div>
              {/* Orbiting rings */}
              <div className="absolute -inset-8 animate-spin-slow">
                <div className="h-full w-full rounded-full border-2 border-emerald-500/30" />
              </div>
              <div className="absolute -inset-12 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}>
                <div className="h-full w-full rounded-full border border-blue-500/20" />
              </div>
            </div>
          </div>

          <h1 className="mb-4 text-6xl font-bold tracking-tight text-white md:text-8xl">
            POS
          </h1>

          <h2 className="mb-2 text-2xl font-semibold text-blue-300 md:text-3xl">
            Planetary Orbit Security
          </h2>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-300 md:text-xl">
            Bulletproof Moving Target Defense simulator that makes network topology
            impossible to map for more than 30 seconds
          </p>
        </div>

        {/* Launch button */}
        <Link href="/dashboard">
          <button className="group relative overflow-hidden rounded-full px-12 py-6 text-lg font-semibold text-white shadow-2xl transition-all duration-300 hover:scale-105 md:text-xl">
            {/* Button background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-600" />

            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />

            {/* Button content */}
            <div className="relative flex items-center gap-3">
              <span>Launch Simulation</span>
              <svg
                className="h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </button>
        </Link>

        {/* Feature highlights */}
        <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              title: "Pulsar Entropy",
              description: "Automatic topology reshuffling every 30s ± 5s jitter",
              color: "from-emerald-400 to-emerald-600"
            },
            {
              title: "CDijkstra Routing",
              description: "Trust-aware shortest path avoiding unsafe nodes",
              color: "from-blue-400 to-blue-600"
            },
            {
              title: "DTTL + PVW",
              description: "Dynamic token expiry prevents replay attacks",
              color: "from-purple-400 to-purple-600"
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20"
            >
              <div className={`mb-4 h-2 w-12 rounded-full bg-gradient-to-r ${feature.color}`} />
              <h3 className="mb-2 text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Vercel-optimized indicator */}
        <div className="absolute bottom-8 left-8 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Vercel Optimized</span>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }

        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }

        .stars {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
