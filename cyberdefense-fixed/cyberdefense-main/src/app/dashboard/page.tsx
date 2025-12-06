'use client'

import React, { useEffect, useState } from 'react'
import { GalaxyScene } from '../../components/GalaxyScene'
import { TrustEnginePanel } from '../../components/TrustEnginePanel'
import { AttackSimulator } from '../../components/AttackSimulator'
import { LogConsole } from '../../components/LogConsole'
import { NodeInspector } from '../../components/NodeInspector'
import { useSimulationStore } from '../../store/simulationStore'

// Dashboard layout configuration
const DASHBOARD_LAYOUT = {
  header: {
    height: 'h-16',
    background: 'bg-black/90 backdrop-blur-md',
    border: 'border-b border-white/10'
  },
  panels: {
    left: {
      width: 'w-80',
      background: 'bg-black/80 backdrop-blur-sm'
    },
    right: {
      width: 'w-80',
      background: 'bg-black/80 backdrop-blur-sm'
    },
    bottom: {
      height: 'h-64',
      background: 'bg-black/90 backdrop-blur-md'
    }
  }
}

// System status header component
function SystemHeader() {
  const { pulsar, isRunning, nodes, connections, pathValidityWindow } = useSimulationStore()

  const getNodeStatus = () => {
    const totalNodes = nodes.size
    const activeNodes = Array.from(nodes.values()).filter(n => n.status === 'active').length
    const attackedNodes = Array.from(nodes.values()).filter(n => n.status === 'attacked').length
    const isolatedNodes = Array.from(nodes.values()).filter(n => n.status === 'isolated').length

    return { totalNodes, activeNodes, attackedNodes, isolatedNodes }
  }

  const nodeStatus = getNodeStatus()
  const timeUntilReshuffle = pulsar.nextReshuffle - Date.now()
  const minutesUntilReshuffle = Math.max(0, Math.floor(timeUntilReshuffle / 60000))
  const secondsUntilReshuffle = Math.max(0, Math.floor((timeUntilReshuffle % 60000) / 1000))

  return (
    <div className={`${DASHBOARD_LAYOUT.header.height} ${DASHBOARD_LAYOUT.header.background} ${DASHBOARD_LAYOUT.header.border} flex items-center justify-between px-6`}>
      {/* Left side - System Status */}
      <div className="flex items-center gap-6">
        {/* Pulsar Status */}
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${pulsar.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <div>
            <div className="text-sm font-medium text-white">Pulsar</div>
            <div className="text-xs text-gray-400">
              {minutesUntilReshuffle}:{secondsUntilReshuffle.toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <div>
            <div className="text-sm font-medium text-white">Nodes</div>
            <div className="text-xs text-gray-400">
              {nodeStatus.activeNodes}/{nodeStatus.totalNodes} active
            </div>
          </div>
        </div>

        {/* Security Level */}
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-purple-500" />
          <div>
            <div className="text-sm font-medium text-white">PVW</div>
            <div className="text-xs text-gray-400">
              {pathValidityWindow}s
            </div>
          </div>
        </div>
      </div>

      {/* Center - Simulation Control */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => isRunning ? useSimulationStore.getState().stopSimulation() : useSimulationStore.getState().startSimulation()}
          className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>

        <button
          onClick={() => useSimulationStore.getState().resetSimulation()}
          className="px-6 py-2 rounded-full font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all duration-300"
        >
          Reset
        </button>
      </div>

      {/* Right side - System Metrics */}
      <div className="flex items-center gap-6">
        {/* Entropy Level */}
        <div className="text-right">
          <div className="text-sm font-medium text-white">Entropy</div>
          <div className="text-xs text-gray-400">
            {(pulsar.entropyLevel * 100).toFixed(1)}%
          </div>
        </div>

        {/* Threat Level */}
        <div className="text-right">
          <div className="text-sm font-medium text-white">Threats</div>
          <div className="text-xs text-gray-400">
            {nodeStatus.attackedNodes} active
          </div>
        </div>

        {/* Reshuffle Count */}
        <div className="text-right">
          <div className="text-sm font-medium text-white">Reshuffles</div>
          <div className="text-xs text-gray-400">
            {Math.floor(Date.now() / 1000) % 99}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize simulation with default nodes and connections
  useEffect(() => {
    const initializeSimulation = () => {
      const store = useSimulationStore.getState()

      // Create initial nodes
      const initialNodes = [
        // North Orbit (high trust)
        { id: 'node-A', name: 'Alpha', ip: '10.0.1.1', orbit: 'north' as const, trust: 0.95 },
        { id: 'node-B', name: 'Beta', ip: '10.0.1.2', orbit: 'north' as const, trust: 0.92 },
        { id: 'node-C', name: 'Gamma', ip: '10.0.1.3', orbit: 'north' as const, trust: 0.88 },

        // Equator Orbit (medium trust)
        { id: 'node-D', name: 'Delta', ip: '10.0.2.1', orbit: 'equator' as const, trust: 0.75 },
        { id: 'node-E', name: 'Epsilon', ip: '10.0.2.2', orbit: 'equator' as const, trust: 0.72 },
        { id: 'node-F', name: 'Zeta', ip: '10.0.2.3', orbit: 'equator' as const, trust: 0.78 },

        // South Orbit (low trust)
        { id: 'node-G', name: 'Eta', ip: '10.0.3.1', orbit: 'south' as const, trust: 0.55 },
        { id: 'node-H', name: 'Theta', ip: '10.0.3.2', orbit: 'south' as const, trust: 0.48 }
      ]

      // Add nodes to store with positions
      initialNodes.forEach((nodeData, index) => {
        const angle = (index / initialNodes.length) * Math.PI * 2
        const radius = nodeData.orbit === 'north' ? 15 : nodeData.orbit === 'equator' ? 25 : 35
        const height = nodeData.orbit === 'north' ? 5 : nodeData.orbit === 'south' ? -5 : 0

        store.addNode({
          ...nodeData,
          position: {
            x: Math.cos(angle) * radius,
            y: height,
            z: Math.sin(angle) * radius
          },
          status: 'active',
          connections: [],
          metrics: {
            packetRate: Math.random() * 1000,
            anomalyCount: 0,
            cpuUsage: Math.random() * 0.5,
            lastUpdate: Date.now()
          },
          history: [{
            timestamp: Date.now(),
            trust: nodeData.trust,
            orbit: nodeData.orbit,
            event: 'Initial deployment'
          }]
        })
      })

      // Create initial connections
      const initialConnections = [
        // North orbit connections
        { id: 'conn-A-B', from: 'node-A', to: 'node-B', distance: 10, trust: 0.9, stability: 0.95, ttl: 60, traffic: 0.3 },
        { id: 'conn-B-C', from: 'node-B', to: 'node-C', distance: 10, trust: 0.85, stability: 0.9, ttl: 55, traffic: 0.2 },
        { id: 'conn-A-C', from: 'node-A', to: 'node-C', distance: 15, trust: 0.8, stability: 0.85, ttl: 50, traffic: 0.1 },

        // Cross-orbit connections
        { id: 'conn-C-D', from: 'node-C', to: 'node-D', distance: 12, trust: 0.75, stability: 0.8, ttl: 45, traffic: 0.4 },
        { id: 'conn-B-E', from: 'node-B', to: 'node-E', distance: 18, trust: 0.7, stability: 0.75, ttl: 40, traffic: 0.3 },
        { id: 'conn-A-F', from: 'node-A', to: 'node-F', distance: 20, trust: 0.72, stability: 0.7, ttl: 42, traffic: 0.2 },

        // Equator orbit connections
        { id: 'conn-D-E', from: 'node-D', to: 'node-E', distance: 8, trust: 0.7, stability: 0.8, ttl: 35, traffic: 0.5 },
        { id: 'conn-E-F', from: 'node-E', to: 'node-F', distance: 8, trust: 0.68, stability: 0.75, ttl: 32, traffic: 0.4 },
        { id: 'conn-D-F', from: 'node-D', to: 'node-F', distance: 12, trust: 0.65, stability: 0.7, ttl: 30, traffic: 0.1 },

        // Equator to South connections
        { id: 'conn-F-G', from: 'node-F', to: 'node-G', distance: 15, trust: 0.5, stability: 0.6, ttl: 25, traffic: 0.2 },
        { id: 'conn-E-H', from: 'node-E', to: 'node-H', distance: 16, trust: 0.45, stability: 0.55, ttl: 22, traffic: 0.1 },

        // South orbit connections
        { id: 'conn-G-H', from: 'node-G', to: 'node-H', distance: 10, trust: 0.4, stability: 0.5, ttl: 20, traffic: 0.1 }
      ]

      initialConnections.forEach(conn => {
        store.addConnection(conn)
      })

      // Add initial log entry
      store.addLog({
        level: 'INFO',
        source: 'System',
        message: 'Simulation initialized with 8 nodes and 12 connections'
      })

      setIsInitialized(true)
    }

    initializeSimulation()
  }, [])

  // Subscribe to selected node changes
  useEffect(() => {
    const unsubscribe = useSimulationStore.subscribe(
      (state) => state.selectedNode,
      (nodeId) => setSelectedNode(nodeId)
    )

    return unsubscribe
  }, [])

  return (
    <div className="h-screen w-screen bg-black overflow-hidden">
      {/* Header */}
      <SystemHeader />

      {/* Main content area */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Panel - Trust Engine */}
        <div className={`${DASHBOARD_LAYOUT.panels.left.width} ${DASHBOARD_LAYOUT.panels.left.background} border-r border-white/10 overflow-y-auto`}>
          <TrustEnginePanel />
        </div>

        {/* Center - Galaxy Scene */}
        <div className="flex-1 relative">
          <GalaxyScene />

          {/* Node Inspector overlay */}
          {selectedNode && (
            <div className="absolute top-4 right-4 z-20">
              <NodeInspector nodeId={selectedNode} />
            </div>
          )}
        </div>

        {/* Right Panel - Attack Simulator */}
        <div className={`${DASHBOARD_LAYOUT.panels.right.width} ${DASHBOARD_LAYOUT.panels.right.background} border-l border-white/10 overflow-y-auto`}>
          <AttackSimulator />
        </div>
      </div>

      {/* Bottom Panel - Log Console */}
      <div className={`${DASHBOARD_LAYOUT.panels.bottom.height} ${DASHBOARD_LAYOUT.panels.bottom.background} border-t border-white/10`}>
        <LogConsole />
      </div>
    </div>
  )
}