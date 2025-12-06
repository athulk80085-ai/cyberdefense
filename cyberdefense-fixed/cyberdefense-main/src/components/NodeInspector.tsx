'use client'

import React, { useState, useEffect } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import { getOrbitColor } from './GalaxyScene'

interface NodeInspectorProps {
  nodeId: string
}

export function NodeInspector({ nodeId }: NodeInspectorProps) {
  const node = useSimulationStore((state) => state.nodes.get(nodeId))
  const selectNode = useSimulationStore((state) => state.selectNode)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Auto-hide after 10 seconds of inactivity
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 10000)

    return () => clearTimeout(timer)
  }, [nodeId])

  if (!node || !isVisible) return null

  const handleClose = () => {
    setIsVisible(false)
    selectNode(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'attacked': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'isolated': return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      case 'recovering': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getOrbitLabel = (orbit: string) => {
    switch (orbit) {
      case 'north': return 'NORTH ORBIT'
      case 'equator': return 'EQUATOR ORBIT'
      case 'south': return 'SOUTH ORBIT'
      default: return 'UNKNOWN'
    }
  }

  return (
    <div className="w-80 bg-black/95 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-lg font-bold text-white">Node Inspector</h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Node Info */}
      <div className="p-4 space-y-4">
        {/* Node Name and Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: getOrbitColor(node.orbit) }}
            />
            <h4 className="text-xl font-bold text-white">{node.name}</h4>
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(node.status)}`}>
            {node.status.toUpperCase()}
          </div>
        </div>

        {/* Basic Information */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Node ID:</span>
            <span className="text-white font-mono">{node.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">IP Address:</span>
            <span className="text-white font-mono">{node.ip}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Orbit:</span>
            <span className="text-white" style={{ color: getOrbitColor(node.orbit) }}>
              {getOrbitLabel(node.orbit)}
            </span>
          </div>
        </div>

        {/* Trust Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Trust Score</span>
            <span className="text-lg font-bold text-white">{(node.trust * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                node.trust > 0.8 ? 'bg-green-500' :
                node.trust > 0.7 ? 'bg-yellow-500' :
                node.trust > 0.4 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${node.trust * 100}%` }}
            />
          </div>
        </div>

        {/* Real-time Metrics */}
        <div>
          <h5 className="text-sm font-medium text-gray-300 mb-2">Real-time Metrics</h5>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">Packet Rate</div>
              <div className="text-white font-medium">
                {Math.round(node.metrics.packetRate)}
              </div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">Anomalies</div>
              <div className="text-white font-medium">
                {node.metrics.anomalyCount}
              </div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">CPU Usage</div>
              <div className="text-white font-medium">
                {(node.metrics.cpuUsage * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/5 rounded p-2">
              <div className="text-gray-400 text-xs">Connections</div>
              <div className="text-white font-medium">
                {node.connections.length}
              </div>
            </div>
          </div>
        </div>

        {/* Trust History */}
        {node.history.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-300 mb-2">Recent Events</h5>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {node.history.slice(-5).reverse().map((event, index) => (
                <div key={index} className="text-xs bg-white/5 rounded p-2">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-300">{event.event}</span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-400 mt-1">
                    Trust: {(event.trust * 100).toFixed(1)}% → {event.orbit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POS Decisions */}
        <div>
          <h5 className="text-sm font-medium text-gray-300 mb-2">POS Decisions</h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                node.status === 'isolated' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              <span className="text-gray-300">
                {node.status === 'isolated' ? 'Node isolated due to low trust' : 'Node actively participating'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                node.orbit === 'south' ? 'bg-red-500' :
                node.orbit === 'equator' ? 'bg-yellow-500' :
                'bg-green-500'
              }`} />
              <span className="text-gray-300">
                Assigned to {node.orbit} orbit based on trust level
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-300">
                {node.connections.length > 0 ? 'Maintaining active connections' : 'No active connections'}
              </span>
            </div>
          </div>
        </div>

        {/* Position Information */}
        <div>
          <h5 className="text-sm font-medium text-gray-300 mb-2">Position</h5>
          <div className="text-xs font-mono text-gray-400">
            <div>X: {node.position.x.toFixed(2)}</div>
            <div>Y: {node.position.y.toFixed(2)}</div>
            <div>Z: {node.position.z.toFixed(2)}</div>
          </div>
        </div>

        {/* Last Update */}
        <div className="pt-2 border-t border-white/10">
          <div className="text-xs text-gray-500 text-center">
            Last updated: {new Date(node.metrics.lastUpdate).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}