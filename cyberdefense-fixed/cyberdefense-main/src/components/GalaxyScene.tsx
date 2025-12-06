'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useSimulationStore } from '../store/simulationStore'
import { SecurityNode } from './SecurityNode'
import { ConnectionLine } from './ConnectionLine'
import { PulsarEffect } from './PulsarEffect'

// Galaxy Scene Configuration
const GALAXY_CONFIG = {
  cameraPosition: [0, 30, 60] as [number, number, number],
  cameraFov: 60,
  starCount: 5000,
  starRadius: 100,
  starDepth: 50,

  // Orbital ring radii
  orbits: {
    north: { radius: 15, color: '#00ff88', emissive: '#00ff88' },
    equator: { radius: 25, color: '#ffaa00', emissive: '#ffaa00' },
    south: { radius: 35, color: '#ff3366', emissive: '#ff3366' }
  },

  // Security Core configuration
  securityCore: {
    radius: 2,
    color: '#ffffff',
    emissive: '#4488ff',
    intensity: 2
  }
}

// Scene background component with animated stars
function GalaxyBackground() {
  return (
    <Stars
      radius={GALAXY_CONFIG.starRadius}
      depth={GALAXY_CONFIG.starDepth}
      count={GALAXY_CONFIG.starCount}
      factor={4}
      saturation={0}
      fade
      speed={1}
    />
  )
}

// Security Core component at the center
function SecurityCore() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { pulsar } = useSimulationStore()

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulsing based on entropy level
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1 + (pulsar.entropyLevel * 0.2)
      meshRef.current.scale.setScalar(scale)

      // Rotate slowly
      meshRef.current.rotation.y += 0.005
      meshRef.current.rotation.x += 0.003
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[GALAXY_CONFIG.securityCore.radius, 32, 32]} />
      <meshStandardMaterial
        color={GALAXY_CONFIG.securityCore.color}
        emissive={GALAXY_CONFIG.securityCore.emissive}
        emissiveIntensity={GALAXY_CONFIG.securityCore.intensity}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

// Orbital rings for North/Equator/South tiers
function OrbitalRings() {
  const rings = useMemo(() => {
    return Object.entries(GALAXY_CONFIG.orbits).map(([orbitName, config]) => ({
      name: orbitName,
      ...config
    }))
  }, [])

  return (
    <group>
      {rings.map((ring) => (
        <mesh key={ring.name} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ring.radius, 0.2, 16, 100]} />
          <meshStandardMaterial
            color={ring.color}
            emissive={ring.emissive}
            emissiveIntensity={0.3}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

// Ambient lighting setup
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.2} color='#4080ff' />
      <pointLight position={[10, 10, 10]} intensity={1} color='#ffffff' />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color='#ff4080' />
      <directionalLight position={[0, 20, 20]} intensity={0.3} color='#ffffff' />
    </>
  )
}

// Camera controller with custom settings
function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (camera) {
      camera.position.set(...GALAXY_CONFIG.cameraPosition)
      camera.lookAt(0, 0, 0)
    }
  }, [camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={20}
      maxDistance={150}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.5}
      autoRotate={false}
      autoRotateSpeed={0.5}
    />
  )
}

// Main Galaxy Scene component
export function GalaxyScene() {
  const nodes = useSimulationStore((state) => state.nodes)
  const connections = useSimulationStore((state) => state.connections)
  const selectedNode = useSimulationStore((state) => state.selectedNode)
  const selectNode = useSimulationStore((state) => state.selectNode)

  // Convert nodes Map to array for rendering
  const nodesArray = useMemo(() => Array.from(nodes.values()), [nodes])

  // Handle node selection
  const handleNodeClick = (nodeId: string) => {
    selectNode(nodeId === selectedNode ? null : nodeId)
  }

  return (
    <div className="w-full h-full bg-black">
      <Canvas
        camera={{
          position: GALAXY_CONFIG.cameraPosition,
          fov: GALAXY_CONFIG.cameraFov,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        performance={{ min: 0.5, max: 1, debounce: 200 }}
        dpr={[1, 2]} // Dynamic pixel ratio for performance
      >
        {/* Scene Lighting */}
        <SceneLighting />

        {/* Background stars */}
        <GalaxyBackground />

        {/* Camera controls */}
        <CameraController />

        {/* Security Core at center */}
        <SecurityCore />

        {/* Orbital rings */}
        <OrbitalRings />

        {/* Network connections */}
        <group>
          {connections.map((connection) => (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              fromNode={nodes.get(connection.from)}
              toNode={nodes.get(connection.to)}
              isSelected={selectedNode === connection.from || selectedNode === connection.to}
            />
          ))}
        </group>

        {/* Security nodes */}
        <group>
          {nodesArray.map((node) => (
            <SecurityNode
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              onClick={() => handleNodeClick(node.id)}
            />
          ))}
        </group>

        {/* Pulsar entropy effect */}
        <PulsarEffect />

        {/* Scene fog for depth */}
        <fog attach="fog" args={['#000033', 50, 200]} />
      </Canvas>
    </div>
  )
}

// Configuration hook for scene settings
export function useGalaxyConfig() {
  return GALAXY_CONFIG
}

// Utility function to calculate orbital position
export function calculateOrbitalPosition(
  orbit: 'north' | 'equator' | 'south',
  angle: number,
  radius: number = GALAXY_CONFIG.orbits[orbit].radius
): [number, number, number] {
  const y = orbit === 'north' ? 5 : orbit === 'south' ? -5 : 0
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return [x, y, z]
}

// Utility function to get orbit color
export function getOrbitColor(orbit: 'north' | 'equator' | 'south'): string {
  return GALAXY_CONFIG.orbits[orbit].color
}

// Export for testing and external use
export { GALAXY_CONFIG }