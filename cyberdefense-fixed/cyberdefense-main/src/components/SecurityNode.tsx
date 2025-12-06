'use client'

import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { SecurityNode as SecurityNodeType } from '../store/simulationStore'
import { calculateOrbitalPosition, getOrbitColor } from './GalaxyScene'

// Node configuration based on status and trust
const NODE_CONFIG = {
  // Base sizes
  baseSize: 0.8,
  selectedSize: 1.3,
  attackedSize: 1.1,

  // Colors based on orbit
  orbitColors: {
    north: { color: '#00ff88', emissive: '#00ff88', emissiveIntensity: 0.6 },
    equator: { color: '#ffaa00', emissive: '#ffaa00', emissiveIntensity: 0.4 },
    south: { color: '#ff3366', emissive: '#ff3366', emissiveIntensity: 0.8 }
  },

  // Status colors and effects
  statusColors: {
    active: { color: '#ffffff', intensity: 1 },
    attacked: { color: '#ff3333', intensity: 2 },
    isolated: { color: '#666666', intensity: 0.3 },
    recovering: { color: '#ffaa00', intensity: 1.5 }
  },

  // Animation parameters
  animations: {
    rotationSpeed: 0.01,
    pulseSpeed: 2,
    hoverPulseAmount: 0.2,
    attackPulseAmount: 0.4,
    selectionPulseAmount: 0.1
  }
}

interface SecurityNodeProps {
  node: SecurityNodeType
  isSelected: boolean
  onClick: () => void
}

// Node glow aura component
function NodeAura({ node, isSelected }: { node: SecurityNodeType; isSelected: boolean }) {
  const auraRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (auraRef.current) {
      // Pulsing based on node status and selection
      const time = state.clock.elapsedTime
      const basePulse = Math.sin(time * NODE_CONFIG.animations.pulseSpeed) * 0.1

      let pulseAmount = basePulse
      if (isSelected) pulseAmount += NODE_CONFIG.animations.selectionPulseAmount
      if (node.status === 'attacked') pulseAmount += Math.sin(time * 4) * NODE_CONFIG.animations.attackPulseAmount

      const scale = 1.5 + pulseAmount
      auraRef.current.scale.setScalar(scale)

      // Rotate aura
      auraRef.current.rotation.z += 0.005
    }
  })

  const orbitColor = NODE_CONFIG.orbitColors[node.orbit]
  const auraOpacity = node.status === 'isolated' ? 0.1 : 0.3

  return (
    <mesh ref={auraRef}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color={orbitColor.color}
        transparent
        opacity={auraOpacity}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

// Main node sphere
function NodeSphere({ node, isSelected, onHover }: {
  node: SecurityNodeType
  isSelected: boolean
  onHover: (hovering: boolean) => void
}) {
  const sphereRef = useRef<THREE.Mesh>(null)
  const [isHovered, setIsHovered] = useState(false)

  const handlePointerOver = () => {
    setIsHovered(true)
    onHover(true)
  }

  const handlePointerOut = () => {
    setIsHovered(false)
    onHover(false)
  }

  useFrame((state) => {
    if (sphereRef.current) {
      // Gentle rotation
      sphereRef.current.rotation.y += NODE_CONFIG.animations.rotationSpeed
      sphereRef.current.rotation.x += NODE_CONFIG.animations.rotationSpeed * 0.5

      // Scale based on state
      let scale = NODE_CONFIG.baseSize
      if (isSelected) scale *= NODE_CONFIG.selectedSize
      if (node.status === 'attacked') scale *= NODE_CONFIG.attackedSize
      if (isHovered) scale *= 1.2

      sphereRef.current.scale.setScalar(scale)
    }
  })

  // Determine material properties based on state
  const orbitColor = NODE_CONFIG.orbitColors[node.orbit]
  const statusColor = NODE_CONFIG.statusColors[node.status]
  const materialProps = useMemo(() => {
    const baseColor = node.status === 'isolated' ? '#333333' : orbitColor.color
    const emissiveColor = node.status === 'attacked' ? '#ff0000' : orbitColor.emissive
    const emissiveIntensity = node.status === 'attacked' ? 1.2 : orbitColor.emissiveIntensity

    return {
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity,
      metalness: 0.6,
      roughness: 0.4,
      transparent: node.status === 'isolated',
      opacity: node.status === 'isolated' ? 0.5 : 1
    }
  }, [node.orbit, node.status])

  return (
    <mesh
      ref={sphereRef}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[NODE_CONFIG.baseSize, 32, 32]} />
      <meshStandardMaterial {...materialProps} />
    </mesh>
  )
}

// Node label
function NodeLabel({ node, isVisible }: { node: SecurityNodeType; isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <Text
      position={[0, 2, 0]}
      fontSize={0.5}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.05}
      outlineColor="#000000"
    >
      {node.name}
    </Text>
  )
}

// Trust indicator
function TrustIndicator({ node }: { node: SecurityNodeType }) {
  const trustLevel = node.trust

  // Color based on trust level
  const getTrustColor = (trust: number): string => {
    if (trust > 0.8) return '#00ff00'
    if (trust > 0.6) return '#ffaa00'
    if (trust > 0.4) return '#ff6600'
    return '#ff0000'
  }

  return (
    <group position={[1.5, 0, 0]}>
      {/* Trust bar background */}
      <mesh>
        <planeGeometry args={[0.2, 2]} />
        <meshBasicMaterial color="#333333" transparent opacity={0.8} />
      </mesh>

      {/* Trust bar fill */}
      <mesh position={[0.01, 0, 0.01]}>
        <planeGeometry args={[0.1, trustLevel * 2]} />
        <meshBasicMaterial color={getTrustColor(trustLevel)} />
      </mesh>

      {/* Trust percentage text */}
      <Text
        position={[0.3, 0, 0]}
        fontSize={0.3}
        color={getTrustColor(trustLevel)}
        anchorX="left"
        anchorY="middle"
      >
        `${Math.round(trustLevel * 100)}%`
      </Text>
    </group>
  )
}

// Status indicator ring
function StatusRing({ node }: { node: SecurityNodeType }) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.02
      ringRef.current.rotation.y += 0.01

      // Pulse for attacked nodes
      if (node.status === 'attacked') {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.2
        ringRef.current.scale.setScalar(scale)
      }
    }
  })

  const getStatusColor = (): string => {
    switch (node.status) {
      case 'active': return '#00ff88'
      case 'attacked': return '#ff3333'
      case 'isolated': return '#666666'
      case 'recovering': return '#ffaa00'
      default: return '#ffffff'
    }
  }

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.4, 32]} />
      <meshBasicMaterial
        color={getStatusColor()}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export function SecurityNode({ node, isSelected, onClick }: SecurityNodeProps) {
  const [showLabel, setShowLabel] = useState(false)
  const [showTrust, setShowTrust] = useState(false)
  const groupRef = useRef<THREE.Group>(null)

  // Calculate orbital position
  const orbitalAngle = useMemo(() => {
    // Use node ID to create deterministic but varied positions
    const hash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return (hash % 1000) * (Math.PI * 2) / 1000
  }, [node.id])

  const position = useMemo(() => {
    const [x, y, z] = calculateOrbitalPosition(node.orbit, orbitalAngle)
    return [x, y, z]
  }, [node.orbit, orbitalAngle])

  // Animate orbital movement
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      const speed = node.orbit === 'north' ? 0.3 : node.orbit === 'equator' ? 0.2 : 0.1
      const currentAngle = orbitalAngle + (time * speed)

      const radius = node.orbit === 'north' ? 15 : node.orbit === 'equator' ? 25 : 35
      const y = node.orbit === 'north' ? 5 : node.orbit === 'south' ? -5 : 0
      const x = Math.cos(currentAngle) * radius
      const z = Math.sin(currentAngle) * radius

      groupRef.current.position.set(x, y, z)
    }
  })

  const handleNodeClick = (event: THREE.Event) => {
    event.stopPropagation()
    onClick()
  }

  const handleHover = (hovering: boolean) => {
    setShowLabel(hovering)
    setShowTrust(hovering)
  }

  return (
    <group
      ref={groupRef}
      position={position as [number, number, number]}
      onClick={handleNodeClick}
    >
      {/* Node aura */}
      <NodeAura node={node} isSelected={isSelected} />

      {/* Main node sphere */}
      <NodeSphere node={node} isSelected={isSelected} onHover={handleHover} />

      {/* Status ring */}
      <StatusRing node={node} />

      {/* Node label */}
      <NodeLabel node={node} isVisible={showLabel || isSelected} />

      {/* Trust indicator */}
      {(showTrust || isSelected) && <TrustIndicator node={node} />}

      {/* Selection indicator */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.2, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

// Utility function to get node size based on importance
export function getNodeSize(trust: number, status: string): number {
  let size = NODE_CONFIG.baseSize

  // Adjust based on trust
  size *= (0.5 + trust * 0.5)

  // Adjust based on status
  switch (status) {
    case 'attacked': size *= 1.2; break
    case 'isolated': size *= 0.7; break
    case 'recovering': size *= 0.9; break
  }

  return size
}

// Utility function to get node color based on state
export function getNodeColor(node: SecurityNodeType): string {
  // Use status color if critical
  if (node.status === 'attacked') return '#ff3333'
  if (node.status === 'isolated') return '#666666'

  // Use orbit color
  return getOrbitColor(node.orbit)
}

export { NODE_CONFIG }