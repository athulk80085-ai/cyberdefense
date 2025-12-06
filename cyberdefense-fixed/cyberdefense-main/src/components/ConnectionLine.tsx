'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Connection } from '../store/simulationStore'

// Connection line configuration
const CONNECTION_CONFIG = {
  baseWidth: 0.05,
  selectedWidth: 0.15,
  activeFlowWidth: 0.1,

  // Colors based on trust level
  trustColors: {
    high: { color: '#00ff88', emissive: '#00ff88', intensity: 0.6 },    // 0.8+
    medium: { color: '#ffaa00', emissive: '#ffaa00', intensity: 0.4 },  // 0.6-0.8
    low: { color: '#ff6633', emissive: '#ff6633', intensity: 0.3 },     // 0.4-0.6
    critical: { color: '#ff3333', emissive: '#ff3333', intensity: 0.8 }  // <0.4
  },

  // Flow particle configuration
  particles: {
    count: 5,
    speed: 2,
    size: 0.1,
    opacity: 0.8
  }
}

interface ConnectionLineProps {
  connection: Connection
  fromNode?: { position: { x: number; y: number; z: number } }
  toNode?: { position: { x: number; y: number; z: number } }
  isSelected: boolean
}

// Data flow particle
function FlowParticle({ points, speed, delay }: {
  points: THREE.Vector3[]
  speed: number
  delay: number
}) {
  const particleRef = useRef<THREE.Mesh>(null)
  const [startTime] = useState(() => Date.now() + delay * 1000)

  useFrame(() => {
    if (particleRef.current && points.length > 1) {
      const elapsed = (Date.now() - startTime) / 1000
      const progress = ((elapsed * speed) % 1)

      // Interpolate position along the curve
      const position = new THREE.Vector3()
      const curve = new THREE.CatmullRomCurve3(points)
      position.copy(curve.getPoint(progress))

      particleRef.current.position.copy(position)

      // Pulse size
      const scale = 1 + Math.sin(elapsed * 5) * 0.3
      particleRef.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={particleRef}>
      <sphereGeometry args={[CONNECTION_CONFIG.particles.size, 8, 8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={CONNECTION_CONFIG.particles.opacity} />
    </mesh>
  )
}

// Animated connection line
function AnimatedLine({ points, trust, traffic, isSelected }: {
  points: THREE.Vector3[]
  trust: number
  traffic: number
  isSelected: boolean
}) {
  const lineRef = useRef<THREE.Line>(null)

  // Determine line properties based on trust and traffic
  const lineProps = useMemo(() => {
    let trustLevel: keyof typeof CONNECTION_CONFIG.trustColors = 'medium'

    if (trust > 0.8) trustLevel = 'high'
    else if (trust > 0.6) trustLevel = 'medium'
    else if (trust > 0.4) trustLevel = 'low'
    else trustLevel = 'critical'

    const config = CONNECTION_CONFIG.trustColors[trustLevel]

    // Width based on selection and traffic
    const width = isSelected ?
      CONNECTION_CONFIG.selectedWidth :
      CONNECTION_CONFIG.baseWidth + (traffic * 0.1)

    // Opacity based on trust
    const opacity = Math.max(0.3, Math.min(1, trust))

    return {
      color: config.color,
      emissive: config.emissive,
      emissiveIntensity: config.intensity,
      width,
      opacity
    }
  }, [trust, traffic, isSelected])

  // Create curve from points
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3(points)
  }, [points])

  // Create tube geometry
  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 64, lineProps.width, 8, false)
  }, [curve, lineProps.width])

  useFrame((state) => {
    if (lineRef.current) {
      // Subtle pulsing based on traffic
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1
      lineRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <mesh ref={lineRef} geometry={tubeGeometry}>
      <meshStandardMaterial
        color={lineProps.color}
        emissive={lineProps.emissive}
        emissiveIntensity={lineProps.emissiveIntensity}
        transparent
        opacity={lineProps.opacity}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

// Connection status indicator
function ConnectionStatus({ trust, stability }: { trust: number; stability: number }) {
  const getStatusColor = (): string => {
    if (trust < 0.4 || stability < 0.4) return '#ff3333'
    if (trust < 0.7 || stability < 0.7) return '#ffaa00'
    return '#00ff88'
  }

  const statusColor = getStatusColor()

  return (
    <group>
      {/* Status indicator at midpoint */}
      <mesh position={[0, 0.5, 0]}>
        <octahedronGeometry args={[0.1]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.8} />
      </mesh>

      {/* Pulsing ring for unstable connections */}
      {(trust < 0.7 || stability < 0.7) && (
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 16]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}

export function ConnectionLine({ connection, fromNode, toNode, isSelected }: ConnectionLineProps) {
  const groupRef = useRef<THREE.Group>(null)

  // Create curved path between nodes
  const curvePoints = useMemo(() => {
    if (!fromNode || !toNode) return []

    const from = new THREE.Vector3(fromNode.position.x, fromNode.position.y, fromNode.position.z)
    const to = new THREE.Vector3(toNode.position.x, toNode.position.y, toNode.position.z)

    // Create a gentle curve
    const midpoint = from.clone().lerp(to, 0.5)
    midpoint.y += 2 // Raise the curve slightly

    return [from, midpoint, to]
  }, [fromNode, toNode])

  // Determine if connection should show flow particles
  const shouldShowFlow = connection.traffic > 0.5

  useFrame((state) => {
    if (groupRef.current) {
      // Rotate status indicator
      const statusMesh = groupRef.current.children.find(child => child instanceof THREE.Mesh)
      if (statusMesh) {
        statusMesh.rotation.y += 0.02
      }
    }
  })

  // Don't render if nodes are not available
  if (!fromNode || !toNode || curvePoints.length === 0) {
    return null
  }

  return (
    <group ref={groupRef}>
      {/* Main connection line */}
      <AnimatedLine
        points={curvePoints}
        trust={connection.trust}
        traffic={connection.traffic}
        isSelected={isSelected}
      />

      {/* Flow particles for active connections */}
      {shouldShowFlow && (
        <group>
          {Array.from({ length: CONNECTION_CONFIG.particles.count }, (_, index) => (
            <FlowParticle
              key={index}
              points={curvePoints}
              speed={CONNECTION_CONFIG.particles.speed + (connection.traffic * 0.5)}
              delay={index / CONNECTION_CONFIG.particles.count}
            />
          ))}
        </group>
      )}

      {/* Connection status indicator */}
      <ConnectionStatus
        trust={connection.trust}
        stability={connection.stability}
      />
    </group>
  )
}

// Utility function to get connection color based on trust
export function getConnectionColor(trust: number): string {
  if (trust > 0.8) return CONNECTION_CONFIG.trustColors.high.color
  if (trust > 0.6) return CONNECTION_CONFIG.trustColors.medium.color
  if (trust > 0.4) return CONNECTION_CONFIG.trustColors.low.color
  return CONNECTION_CONFIG.trustColors.critical.color
}

// Utility function to get connection width based on traffic
export function getConnectionWidth(traffic: number, isSelected: boolean = false): number {
  const baseWidth = isSelected ? CONNECTION_CONFIG.selectedWidth : CONNECTION_CONFIG.baseWidth
  return baseWidth + (traffic * 0.1)
}

// Utility function to check if connection should show flow particles
export function shouldShowFlowParticles(traffic: number): boolean {
  return traffic > 0.5
}

// Utility function to create curved path between points
export function createCurvedPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
  const midpoint = from.clone().lerp(to, 0.5)
  midpoint.y += 2 // Add some height to create an arc

  return [from, midpoint, to]
}

export { CONNECTION_CONFIG }