'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore } from '../store/simulationStore'

// Pulsar effect configuration
const PULSAR_CONFIG = {
  // Pulse animation parameters
  pulseDuration: 2000, // 2 seconds
  maxRadius: 50, // Maximum expansion radius
  minRadius: 2, // Starting radius (security core size)

  // Visual properties
  baseColor: '#4488ff',
  spikeColor: '#ff8844',
  spikeIntensity: 2,

  // Wave parameters for multiple pulses
  waveCount: 3,
  waveDelay: 300, // Delay between waves

  // Particle effects
  particleCount: 50,
  particleSpeed: 10,
  particleSize: 0.2,
  particleLife: 1000, // milliseconds

  // Energy ring parameters
  ringSegments: 64,
  ringTubularSegments: 16,
  ringRadius: 0.5
}

interface PulseWave {
  id: string
  startTime: number
  maxRadius: number
  color: string
  intensity: number
  duration: number
}

interface PulsarParticle {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  color: string
}

// Individual pulse wave component
function PulseWave({ wave }: { wave: PulseWave }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = wave.startTime

  useFrame((state) => {
    if (meshRef.current) {
      const elapsed = state.clock.elapsedTime * 1000 - startTime
      const progress = Math.min(1, elapsed / wave.duration)

      if (progress >= 1) {
        // Wave completed
        meshRef.current.visible = false
        return
      }

      // Expand radius
      const currentRadius = wave.maxRadius * progress

      // Update scale
      meshRef.current.scale.setScalar(currentRadius / PULSAR_CONFIG.minRadius)

      // Fade out as it expands
      const opacity = 1 - progress
      meshRef.current.material.opacity = opacity * 0.6

      // Rotate slowly
      meshRef.current.rotation.z += 0.01
      meshRef.current.rotation.y += 0.005
    }
  })

  const geometry = useMemo(() => {
    return new THREE.RingGeometry(
      PULSAR_CONFIG.minRadius,
      PULSAR_CONFIG.minRadius * 2,
      PULSAR_CONFIG.ringSegments
    )
  }, [])

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: wave.color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    })
  }, [wave.color])

  return (
    <mesh ref={meshRef} geometry={geometry} material={material}>
      <primitive object={material} />
    </mesh>
  )
}

// Energy particle system
function PulsarParticles({ particles }: { particles: PulsarParticle[] }) {
  const particlesRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (particlesRef.current) {
      const delta = state.clock.getDelta()

      particles.forEach((particle, index) => {
        const particleMesh = particlesRef.current!.children[index] as THREE.Mesh

        if (particleMesh && particle.life > 0) {
          // Update position
          particle.position.add(
            particle.velocity.clone().multiplyScalar(delta * PULSAR_CONFIG.particleSpeed)
          )

          particleMesh.position.copy(particle.position)

          // Update life and opacity
          particle.life -= delta * 1000
          const opacity = particle.life / particle.maxLife
          ;(particleMesh.material as THREE.MeshBasicMaterial).opacity = opacity

          // Particle scale animation
          const scale = 1 + (1 - opacity) * 0.5
          particleMesh.scale.setScalar(scale)
        } else if (particleMesh) {
          particleMesh.visible = false
        }
      })
    }
  })

  return (
    <group ref={particlesRef}>
      {particles.map((particle) => (
        <mesh key={particle.id}>
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  )
}

// Main Pulsar Effect component
export function PulsarEffect() {
  const { pulsar } = useSimulationStore()

  // Active pulse waves
  const [pulseWaves, setPulseWaves] = React.useState<PulseWave[]>([])

  // Energy particles
  const [particles, setParticles] = React.useState<PulsarParticle[]>([])

  // Track last entropy level to detect spikes
  const lastEntropyRef = useRef(pulsar.entropyLevel)
  const lastReshuffleRef = useRef(pulsar.lastReshuffle)

  // Detect entropy spikes and reshuffle events
  useFrame((state) => {
    const currentEntropy = pulsar.entropyLevel
    const currentReshuffle = pulsar.lastReshuffle

    // Check for entropy spike
    if (currentEntropy > 0.7 && currentEntropy > lastEntropyRef.current) {
      triggerPulseWave('entropy', currentEntropy)
      generateEnergyParticles(currentEntropy)
    }

    // Check for reshuffle event
    if (currentReshuffle > lastReshuffleRef.current) {
      triggerPulseWave('reshuffle', 1.0)
      generateReshuffleParticles()
    }

    lastEntropyRef.current = currentEntropy
    lastReshuffleRef.current = currentReshuffle

    // Clean up old waves and particles
    cleanupOldEffects()
  })

  // Trigger a pulse wave
  const triggerPulseWave = (type: 'entropy' | 'reshuffle', intensity: number) => {
    const newWave: PulseWave = {
      id: `wave_${Date.now()}_${Math.random()}`,
      startTime: state.clock.elapsedTime * 1000,
      maxRadius: PULSAR_CONFIG.maxRadius * (0.5 + intensity * 0.5),
      color: type === 'entropy' ? PULSAR_CONFIG.spikeColor : PULSAR_CONFIG.baseColor,
      intensity: intensity * PULSAR_CONFIG.spikeIntensity,
      duration: PULSAR_CONFIG.pulseDuration * (1 + intensity)
    }

    setPulseWaves(prev => [...prev, newWave])

    // Create multiple waves for dramatic effect
    if (type === 'reshuffle') {
      setTimeout(() => {
        setPulseWaves(prev => [...prev, {
          ...newWave,
          id: `wave_delayed_${Date.now()}`,
          startTime: state.clock.elapsedTime * 1000,
          maxRadius: newWave.maxRadius * 0.8,
          color: '#ffaa44'
        }])
      }, PULSAR_CONFIG.waveDelay)
    }
  }

  // Generate energy particles for entropy spikes
  const generateEnergyParticles = (entropy: number) => {
    const particleCount = Math.floor(PULSAR_CONFIG.particleCount * entropy)
    const newParticles: PulsarParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      // Random direction in 3D space
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(0.5 + Math.random() * 0.5)

      newParticles.push({
        id: `particle_${Date.now()}_${i}`,
        position: new THREE.Vector3(0, 0, 0), // Start from center
        velocity,
        life: PULSAR_CONFIG.particleLife,
        maxLife: PULSAR_CONFIG.particleLife,
        size: PULSAR_CONFIG.particleSize * (0.5 + Math.random()),
        color: Math.random() > 0.5 ? PULSAR_CONFIG.spikeColor : PULSAR_CONFIG.baseColor
      })
    }

    setParticles(prev => [...prev, ...newParticles])
  }

  // Generate special particles for reshuffle events
  const generateReshuffleParticles = () => {
    const particleCount = PULSAR_CONFIG.particleCount * 2 // More particles for reshuffle
    const newParticles: PulsarParticle[] = []

    for (let i = 0; i < particleCount; i++) {
      // Spiral pattern for reshuffle
      const angle = (i / particleCount) * Math.PI * 2
      const height = (Math.random() - 0.5) * 10

      const velocity = new THREE.Vector3(
        Math.cos(angle) * 0.8,
        height * 0.1,
        Math.sin(angle) * 0.8
      ).multiplyScalar(1 + Math.random())

      newParticles.push({
        id: `reshuffle_particle_${Date.now()}_${i}`,
        position: new THREE.Vector3(0, 0, 0),
        velocity,
        life: PULSAR_CONFIG.particleLife * 1.5, // Longer life for reshuffle particles
        maxLife: PULSAR_CONFIG.particleLife * 1.5,
        size: PULSAR_CONFIG.particleSize * 1.2,
        color: `hsl(${Math.random() * 60 + 20}, 100%, 60%)` // Warm colors for reshuffle
      })
    }

    setParticles(prev => [...prev, ...newParticles])
  }

  // Clean up old effects
  const cleanupOldEffects = () => {
    const now = Date.now()

    // Clean up old waves
    setPulseWaves(prev => prev.filter(wave => {
      const age = now - wave.startTime
      return age < wave.duration + 1000 // Keep a little extra time
    }))

    // Clean up dead particles
    setParticles(prev => prev.filter(particle => particle.life > 0))
  }

  // Only render when there are active effects
  if (pulseWaves.length === 0 && particles.length === 0) {
    return null
  }

  return (
    <group>
      {/* Pulse waves */}
      {pulseWaves.map(wave => (
        <PulseWave key={wave.id} wave={wave} />
      ))}

      {/* Energy particles */}
      <PulsarParticles particles={particles} />

      {/* Central glow effect during high entropy */}
      {pulsar.entropyLevel > 0.5 && (
        <mesh>
          <sphereGeometry args={[PULSAR_CONFIG.minRadius * 1.5, 32, 32]} />
          <meshBasicMaterial
            color={PULSAR_CONFIG.spikeColor}
            transparent
            opacity={pulsar.entropyLevel * 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}

// Hook to get current pulsar state
export function usePulsarEffect() {
  const { pulsar } = useSimulationStore()

  return {
    isActive: pulsar.isActive,
    entropyLevel: pulsar.entropyLevel,
    isSpiking: pulsar.entropyLevel > 0.7,
    nextReshuffle: pulsar.nextReshuffle,
    timeUntilReshuffle: Math.max(0, pulsar.nextReshuffle - Date.now())
  }
}

// Utility function to trigger manual pulse effects
export function triggerManualPulse(type: 'entropy' | 'reshuffle' | 'test', intensity: number = 1.0) {
  // This would typically be called from UI components or simulation events
  console.log(`Manual pulse triggered: ${type} with intensity ${intensity}`)
}

export { PULSAR_CONFIG }