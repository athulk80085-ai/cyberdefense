'use client'

import React, { useState, useEffect } from 'react'
import { useSimulationStore } from '../store/simulationStore'
import { getOrbitColor } from './GalaxyScene'

// Trust engine configuration
const TRUST_CONFIG = {
  thresholds: {
    high: 0.8,
    medium: 0.7,
    low: 0.4
  },
  colors: {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-orange-500',
    critical: 'bg-red-500'
  }
}

// Mini trust history chart component
function TrustHistoryChart({ history }: { history: Array<{ timestamp: number; trust: number }> }) {
  const maxHistoryLength = 10
  const recentHistory = history.slice(-maxHistoryLength)

  if (recentHistory.length < 2) {
    return (
      <div className="h-8 flex items-center justify-center text-xs text-gray-500">
        No history
      </div>
    )
  }

  const maxTrust = Math.max(...recentHistory.map(h => h.trust))
  const minTrust = Math.min(...recentHistory.map(h => h.trust))
  const range = maxTrust - minTrust || 0.1

  return (
    <div className="h-8 relative">
      <svg className="w-full h-full" viewBox="0 0 100 30">
        {/* Background grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((level) => (
          <line
            key={level}
            x1="0"
            y1={30 - (level * 30)}
            x2="100"
            y2={30 - (level * 30)}
            stroke="#374151"
            strokeWidth="0.5"
          />
        ))}

        {/* Trust line */}
        <polyline
          points={recentHistory.map((h, i) => {
            const x = (i / (maxHistoryLength - 1)) * 100
            const y = 30 - (((h.trust - minTrust) / range) * 25 + 2.5)
            return `${x},${y}`
          }).join(' ')}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
        />

        {/* Data points */}
        {recentHistory.map((h, i) => {
          const x = (i / (maxHistoryLength - 1)) * 100
          const y = 30 - (((h.trust - minTrust) / range) * 25 + 2.5)
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={h.trust > TRUST_CONFIG.thresholds.high ? '#10b981' :
                   h.trust > TRUST_CONFIG.thresholds.medium ? '#eab308' :
                   h.trust > TRUST_CONFIG.thresholds.low ? '#f97316' : '#ef4444'}
            />
          )
        })}
      </svg>
    </div>
  )
}

// Individual node trust entry
function NodeTrustEntry({ nodeId }: { nodeId: string }) {
  const node = useSimulationStore((state) => state.nodes.get(nodeId))
  const updateTrust = useSimulationStore((state) => state.updateTrust)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [tempTrust, setTempTrust] = useState(0)

  useEffect(() => {
    if (node) {
      setTempTrust(node.trust)
    }
  }, [node])

  if (!node) return null

  const getTrustColor = (trust: number) => {
    if (trust > TRUST_CONFIG.thresholds.high) return TRUST_CONFIG.colors.high
    if (trust > TRUST_CONFIG.thresholds.medium) return TRUST_CONFIG.colors.medium
    if (trust > TRUST_CONFIG.thresholds.low) return TRUST_CONFIG.colors.low
    return TRUST_CONFIG.colors.critical
  }

  const getOrbitLabel = (orbit: string) => {
    switch (orbit) {
      case 'north': return 'NORTH'
      case 'equator': return 'EQUATOR'
      case 'south': return 'SOUTH'
      default: return 'UNKNOWN'
    }
  }

  const handleTrustChange = (newTrust: number) => {
    setTempTrust(newTrust)
  }

  const applyTrustChange = () => {
    const difference = Math.abs(node.trust - tempTrust)
    if (difference > 0.01) {
      updateTrust(node.id, tempTrust, 'Manual adjustment')
    }
    setIsAdjusting(false)
  }

  const cancelTrustChange = () => {
    setTempTrust(node.trust)
    setIsAdjusting(false)
  }

  return (
    <div className="border border-white/10 rounded-lg p-3 bg-white/5 hover:bg-white/10 transition-all duration-200">
      {/* Node header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getOrbitColor(node.orbit) }}
          />
          <span className="font-medium text-white text-sm">{node.name}</span>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          node.orbit === 'north' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
          node.orbit === 'equator' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
          'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {getOrbitLabel(node.orbit)}
        </div>
      </div>

      {/* Trust score visualization */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Trust Score</span>
          <span className="text-xs font-medium text-white">
            {isAdjusting ? tempTrust.toFixed(2) : node.trust.toFixed(2)}
          </span>
        </div>
        <div className="relative">
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getTrustColor(isAdjusting ? tempTrust : node.trust)}`}
              style={{ width: `${(isAdjusting ? tempTrust : node.trust) * 100}%` }}
            />
          </div>
          {isAdjusting && (
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={tempTrust}
              onChange={(e) => handleTrustChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Trust controls */}
      {!isAdjusting ? (
        <button
          onClick={() => setIsAdjusting(true)}
          className="w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors duration-200"
        >
          Adjust Trust
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={applyTrustChange}
            className="flex-1 py-1 px-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors duration-200"
          >
            Apply
          </button>
          <button
            onClick={cancelTrustChange}
            className="flex-1 py-1 px-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Trust history */}
      <div className="mt-2">
        <div className="text-xs text-gray-400 mb-1">Recent History</div>
        <TrustHistoryChart history={node.history} />
      </div>

      {/* Node status */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">Status</span>
        <span className={`text-xs font-medium ${
          node.status === 'active' ? 'text-green-400' :
          node.status === 'attacked' ? 'text-red-400' :
          node.status === 'isolated' ? 'text-gray-400' :
          'text-yellow-400'
        }`}>
          {node.status.toUpperCase()}
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-400">Packets:</span>
          <span className="ml-1 text-white">
            {Math.round(node.metrics.packetRate)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Anomalies:</span>
          <span className="ml-1 text-white">
            {node.metrics.anomalyCount}
          </span>
        </div>
      </div>
    </div>
  )
}

// Trust statistics overview
function TrustOverview() {
  const nodes = useSimulationStore((state) => state.nodes)
  const nodesArray = Array.from(nodes.values())

  const stats = {
    total: nodesArray.length,
    high: nodesArray.filter(n => n.trust > TRUST_CONFIG.thresholds.high).length,
    medium: nodesArray.filter(n => n.trust > TRUST_CONFIG.thresholds.medium && n.trust <= TRUST_CONFIG.thresholds.high).length,
    low: nodesArray.filter(n => n.trust > TRUST_CONFIG.thresholds.low && n.trust <= TRUST_CONFIG.thresholds.medium).length,
    critical: nodesArray.filter(n => n.trust <= TRUST_CONFIG.thresholds.low).length
  }

  const averageTrust = nodesArray.length > 0 ?
    nodesArray.reduce((sum, node) => sum + node.trust, 0) / nodesArray.length :
    0

  return (
    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-3">Network Trust Overview</h3>

      {/* Average trust */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Average Trust</span>
          <span className="text-lg font-bold text-white">
            {(averageTrust * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              averageTrust > TRUST_CONFIG.thresholds.high ? TRUST_CONFIG.colors.high :
              averageTrust > TRUST_CONFIG.thresholds.medium ? TRUST_CONFIG.colors.medium :
              averageTrust > TRUST_CONFIG.thresholds.low ? TRUST_CONFIG.colors.low :
              TRUST_CONFIG.colors.critical
            }`}
            style={{ width: `${averageTrust * 100}%` }}
          />
        </div>
      </div>

      {/* Trust distribution */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center justify-between p-2 bg-green-500/10 rounded">
          <span className="text-green-400">High</span>
          <span className="text-white font-medium">{stats.high}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded">
          <span className="text-yellow-400">Medium</span>
          <span className="text-white font-medium">{stats.medium}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-orange-500/10 rounded">
          <span className="text-orange-400">Low</span>
          <span className="text-white font-medium">{stats.low}</span>
        </div>
        <div className="flex items-center justify-between p-2 bg-red-500/10 rounded">
          <span className="text-red-400">Critical</span>
          <span className="text-white font-medium">{stats.critical}</span>
        </div>
      </div>
    </div>
  )
}

export function TrustEnginePanel() {
  const nodes = useSimulationStore((state) => state.nodes)
  const nodeIds = Array.from(nodes.keys())

  return (
    <div className="h-full p-4 overflow-y-auto">
      {/* Panel header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Trust Engine</h2>
        <p className="text-sm text-gray-400">
          Real-time node trust scoring and orbit management
        </p>
      </div>

      {/* Trust overview */}
      <TrustOverview />

      {/* Node list */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Node Trust Scores</h3>
        {nodeIds.map(nodeId => (
          <NodeTrustEntry key={nodeId} nodeId={nodeId} />
        ))}
      </div>

      {/* Trust engine info */}
      <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="text-xs text-blue-300">
          <div className="font-medium mb-1">Trust Thresholds:</div>
          <div>• High Trust (&gt;80%): North Orbit</div>
          <div>• Medium Trust (70-80%): Equator Orbit</div>
          <div>• Low Trust (&lt;70%): South Orbit</div>
        </div>
      </div>
    </div>
  )
}