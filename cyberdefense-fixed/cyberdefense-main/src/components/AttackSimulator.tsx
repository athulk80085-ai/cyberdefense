'use client'

import React, { useState } from 'react'
import { useSimulationStore } from '../store/simulationStore'

// Attack configuration
const ATTACK_TYPES = [
  { id: 'ssh_brute', name: 'SSH Brute Force', description: 'Attempt to guess SSH credentials', icon: '🔑' },
  { id: 'ddos', name: 'DDoS Attack', description: 'Distributed denial of service', icon: '🌐' },
  { id: 'packet_sniffing', name: 'Packet Sniffing', description: 'Intercept network traffic', icon: '📡' },
  { id: 'malware', name: 'Malware Injection', description: 'Deploy malicious software', icon: '🦠' }
] as const

const DURATION_OPTIONS = [
  { id: 10000, label: '10 seconds', value: 10 },
  { id: 30000, label: '30 seconds', value: 30 },
  { id: 60000, label: '1 minute', value: 60 },
  { id: 300000, label: '5 minutes', value: 300 }
] as const

export function AttackSimulator() {
  const [selectedNode, setSelectedNode] = useState<string>('')
  const [selectedAttackType, setSelectedAttackType] = useState<string>('ssh_brute')
  const [intensity, setIntensity] = useState<number>(5)
  const [duration, setDuration] = useState<number>(30000)
  const [isLaunching, setIsLaunching] = useState(false)

  const nodes = useSimulationStore((state) => state.nodes)
  const attacks = useSimulationStore((state) => state.attacks)
  const startAttack = useSimulationStore((state) => state.startAttack)

  const nodeOptions = Array.from(nodes.entries()).map(([id, node]) => ({
    id,
    name: node.name,
    trust: node.trust,
    status: node.status
  }))

  const handleLaunchAttack = async () => {
    if (!selectedNode) {
      alert('Please select a target node')
      return
    }

    setIsLaunching(true)

    try {
      await startAttack({
        targetNodeId: selectedNode,
        type: selectedAttackType as any,
        intensity,
        duration
      })

      // Reset form
      setSelectedNode('')
      setIntensity(5)
    } catch (error) {
      console.error('Failed to launch attack:', error)
    } finally {
      setIsLaunching(false)
    }
  }

  const getSelectedAttackInfo = () => {
    return ATTACK_TYPES.find(type => type.id === selectedAttackType)
  }

  const getSelectedNodeInfo = () => {
    return nodeOptions.find(node => node.id === selectedNode)
  }

  return (
    <div className="h-full p-4 overflow-y-auto">
      {/* Panel header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Attack Simulator</h2>
        <p className="text-sm text-gray-400">
          Configure and execute cyber attacks on the network
        </p>
      </div>

      {/* Attack configuration */}
      <div className="space-y-4 mb-6">
        {/* Target Node Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Node
          </label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a node...</option>
            {nodeOptions.map(node => (
              <option key={node.id} value={node.id}>
                {node.name} (Trust: {(node.trust * 100).toFixed(0)}%)
              </option>
            ))}
          </select>
          {getSelectedNodeInfo() && (
            <div className="mt-2 text-xs text-gray-400">
              Target: {getSelectedNodeInfo()?.name} | Status: {getSelectedNodeInfo()?.status}
            </div>
          )}
        </div>

        {/* Attack Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Attack Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ATTACK_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedAttackType(type.id)}
                className={`p-3 rounded-lg border transition-all duration-200 text-left ${
                  selectedAttackType === type.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{type.icon}</span>
                  <span className="font-medium text-sm">{type.name}</span>
                </div>
                <div className="text-xs opacity-75">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Intensity Slider */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Attack Intensity: {intensity}/10
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className={`w-12 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              intensity <= 3 ? 'bg-green-600 text-white' :
              intensity <= 6 ? 'bg-yellow-600 text-white' :
              intensity <= 8 ? 'bg-orange-600 text-white' :
              'bg-red-600 text-white'
            }`}>
              {intensity}
            </div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Attack Duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DURATION_OPTIONS.map(option => (
              <button
                key={option.id}
                onClick={() => setDuration(option.id)}
                className={`px-3 py-2 rounded-lg border transition-all duration-200 text-sm ${
                  duration === option.id
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Launch Button */}
      <button
        onClick={handleLaunchAttack}
        disabled={!selectedNode || isLaunching}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
          !selectedNode || isLaunching
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25'
        }`}
      >
        {isLaunching ? 'Launching Attack...' : 'Launch Attack'}
      </button>

      {/* Attack Preview */}
      {selectedNode && selectedAttackType && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
          <h3 className="text-sm font-medium text-red-400 mb-2">Attack Preview</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <div>• Target: {getSelectedNodeInfo()?.name}</div>
            <div>• Type: {getSelectedAttackInfo()?.name}</div>
            <div>• Intensity: {intensity}/10 ({intensity <= 3 ? 'Low' : intensity <= 6 ? 'Medium' : intensity <= 8 ? 'High' : 'Critical'})</div>
            <div>• Duration: {duration / 1000} seconds</div>
            <div>• Expected trust reduction: ~{(intensity * 5).toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Active Attacks */}
      {attacks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Active Attacks</h3>
          <div className="space-y-2">
            {attacks.map(attack => {
              const targetNode = nodes.get(attack.targetNodeId)
              const attackInfo = ATTACK_TYPES.find(t => t.id === attack.type)
              const progress = attack.endTime ?
                Math.min(1, (Date.now() - attack.startTime) / (attack.endTime - attack.startTime)) : 0

              return (
                <div key={attack.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{attackInfo?.icon}</span>
                      <span className="text-sm font-medium text-white">
                        {attackInfo?.name} on {targetNode?.name}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      attack.status === 'active' ? 'bg-red-600 text-white' :
                      attack.status === 'completed' ? 'bg-green-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {attack.status.toUpperCase()}
                    </span>
                  </div>

                  {attack.status === 'active' && (
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-500"
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                  )}

                  <div className="flex justify-between mt-2 text-xs text-gray-400">
                    <span>Intensity: {attack.intensity}/10</span>
                    <span>Duration: {attack.duration / 1000}s</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Attack Statistics */}
      <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/20 rounded-lg">
        <div className="text-xs text-blue-300">
          <div className="font-medium mb-1">Attack Impact:</div>
          <div>• High intensity attacks cause rapid trust degradation</div>
          <div>• Prolonged attacks can trigger orbit reassignment</div>
          <div>• Critical attacks may result in node isolation</div>
        </div>
      </div>
    </div>
  )
}