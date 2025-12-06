import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Types for the simulation
export interface SecurityNode {
  id: string
  name: string
  ip: string
  position: { x: number; y: number; z: number }
  trust: number // 0-1 scale
  orbit: 'north' | 'equator' | 'south'
  status: 'active' | 'attacked' | 'isolated' | 'recovering'
  connections: string[] // Array of node IDs
  metrics: {
    packetRate: number
    anomalyCount: number
    cpuUsage: number
    lastUpdate: number
  }
  history: {
    timestamp: number
    trust: number
    orbit: string
    event: string
  }[]
}

export interface Connection {
  id: string
  from: string
  to: string
  distance: number
  trust: number
  stability: number
  ttl: number
  traffic: number
}

export interface AttackEvent {
  id: string
  targetNodeId: string
  type: 'ssh_brute' | 'ddos' | 'packet_sniffing' | 'malware'
  intensity: number // 1-10 scale
  duration: number // milliseconds
  startTime: number
  endTime?: number
  status: 'active' | 'completed' | 'failed'
}

export interface LogEntry {
  id: string
  timestamp: number
  level: 'INFO' | 'WARNING' | 'ERROR' | 'ATTACK' | 'SUCCESS'
  source: string // e.g., 'Pulsar', 'Trust Engine', 'CDijkstra'
  message: string
  details?: any
}

export interface PulsarState {
  lastReshuffle: number
  nextReshuffle: number
  isActive: boolean
  entropyLevel: number // 0-1 scale
  timerId?: NodeJS.Timeout
}

interface SimulationState {
  // Node management
  nodes: Map<string, SecurityNode>
  connections: Connection[]

  // Orbits (North = green, Equator = yellow, South = red)
  orbits: {
    north: string[]    // trust > 0.8
    equator: string[]  // trust 0.7-0.8
    south: string[]    // trust < 0.7
  }

  // Pulsar entropy system
  pulsar: PulsarState

  // Attack simulation
  attacks: AttackEvent[]
  selectedNode: string | null

  // Routing
  currentPath: string[] | null
  pathValidityWindow: number // PVW in seconds

  // Logs
  logs: LogEntry[]

  // Simulation control
  isRunning: boolean
  simulationSpeed: number
  deterministicSeed?: number
}

interface SimulationActions {
  // Node management
  addNode: (node: SecurityNode) => void
  updateNode: (nodeId: string, updates: Partial<SecurityNode>) => void
  removeNode: (nodeId: string) => void
  selectNode: (nodeId: string | null) => void

  // Trust management
  updateTrust: (nodeId: string, newTrust: number, reason: string) => void
  adjustOrbitAssignments: () => void

  // Connection management
  addConnection: (connection: Connection) => void
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void
  removeConnection: (connectionId: string) => void

  // Pulsar entropy
  startPulsarTimer: () => void
  stopPulsarTimer: () => void
  triggerReshuffle: () => void
  calculateNextReshuffle: (baseInterval?: number) => number

  // Attack simulation
  startAttack: (attack: Omit<AttackEvent, 'id' | 'startTime' | 'status'>) => void
  stopAttack: (attackId: string) => void
  updateAttack: (attackId: string, updates: Partial<AttackEvent>) => void

  // Routing
  calculatePath: (fromNodeId: string, toNodeId: string) => string[] | null
  updatePVW: (path: string[], dttl: number) => number

  // Logging
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
  clearLogs: () => void

  // Simulation control
  startSimulation: () => void
  stopSimulation: () => void
  resetSimulation: () => void
  setSimulationSpeed: (speed: number) => void
}

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

function calculateOrbit(trust: number): 'north' | 'equator' | 'south' {
  if (trust > 0.8) return 'north'
  if (trust >= 0.7) return 'equator'
  return 'south'
}

// Initial simulation state
const initialState: SimulationState = {
  nodes: new Map(),
  connections: [],
  orbits: {
    north: [],
    equator: [],
    south: []
  },
  pulsar: {
    lastReshuffle: Date.now(),
    nextReshuffle: Date.now() + 30000,
    isActive: false,
    entropyLevel: 0.1
  },
  attacks: [],
  selectedNode: null,
  currentPath: null,
  pathValidityWindow: 45, // Default 45 seconds
  logs: [],
  isRunning: false,
  simulationSpeed: 1
}

// Create the store
export const useSimulationStore = create<SimulationState & SimulationActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Node management
    addNode: (node) => {
      set((state) => {
        const newNodes = new Map(state.nodes)
        newNodes.set(node.id, node)

        // Update orbit assignments
        const orbits = { ...state.orbits }
        const nodeOrbit = calculateOrbit(node.trust)
        orbits[nodeOrbit].push(node.id)

        return {
          nodes: newNodes,
          orbits
        }
      })

      // Log node creation
      get().addLog({
        level: 'INFO',
        source: 'System',
        message: `Node ${node.name} (${node.id}) added to ${calculateOrbit(node.trust)} orbit`
      })
    },

    updateNode: (nodeId, updates) => {
      set((state) => {
        const newNodes = new Map(state.nodes)
        const existingNode = newNodes.get(nodeId)

        if (!existingNode) return state

        const updatedNode = { ...existingNode, ...updates }
        newNodes.set(nodeId, updatedNode)

        // Update orbit assignments if trust changed
        let orbits = { ...state.orbits }
        if (updates.trust !== undefined) {
          const oldOrbit = calculateOrbit(existingNode.trust)
          const newOrbit = calculateOrbit(updatedNode.trust)

          if (oldOrbit !== newOrbit) {
            orbits = {
              north: orbits.north.filter(id => id !== nodeId),
              equator: orbits.equator.filter(id => id !== nodeId),
              south: orbits.south.filter(id => id !== nodeId),
              ...{ [newOrbit]: [...orbits[newOrbit], nodeId] }
            }
          }
        }

        return {
          nodes: newNodes,
          orbits
        }
      })
    },

    removeNode: (nodeId) => {
      set((state) => {
        const newNodes = new Map(state.nodes)
        const node = newNodes.get(nodeId)

        if (!node) return state

        newNodes.delete(nodeId)

        // Remove from orbits
        const orbits = {
          north: state.orbits.north.filter(id => id !== nodeId),
          equator: state.orbits.equator.filter(id => id !== nodeId),
          south: state.orbits.south.filter(id => id !== nodeId)
        }

        // Remove related connections
        const connections = state.connections.filter(
          conn => conn.from !== nodeId && conn.to !== nodeId
        )

        return {
          nodes: newNodes,
          orbits,
          connections
        }
      })

      // Log node removal
      get().addLog({
        level: 'INFO',
        source: 'System',
        message: `Node ${nodeId} removed from simulation`
      })
    },

    selectNode: (nodeId) => {
      set({ selectedNode: nodeId })

      if (nodeId) {
        const node = get().nodes.get(nodeId)
        if (node) {
          get().addLog({
            level: 'INFO',
            source: 'UI',
            message: `Selected node ${node.name} (${nodeId})`
          })
        }
      }
    },

    // Trust management
    updateTrust: (nodeId, newTrust, reason) => {
      const state = get()
      const node = state.nodes.get(nodeId)

      if (!node) return

      const oldTrust = node.trust
      const clampedTrust = Math.max(0, Math.min(1, newTrust))

      get().updateNode(nodeId, {
        trust: clampedTrust,
        history: [
          ...node.history,
          {
            timestamp: Date.now(),
            trust: clampedTrust,
            orbit: calculateOrbit(clampedTrust),
            event: reason
          }
        ].slice(-20) // Keep last 20 events
      })

      // Log trust change
      const level = clampedTrust < 0.3 ? 'ERROR' : clampedTrust < 0.7 ? 'WARNING' : 'INFO'
      get().addLog({
        level,
        source: 'Trust Engine',
        message: `Node ${node.name} trust change: ${oldTrust.toFixed(2)} → ${clampedTrust.toFixed(2)}`,
        details: { nodeId, oldTrust, newTrust: clampedTrust, reason }
      })
    },

    adjustOrbitAssignments: () => {
      const state = get()
      const orbits = {
        north: [] as string[],
        equator: [] as string[],
        south: [] as string[]
      }

      state.nodes.forEach((node, nodeId) => {
        const orbit = calculateOrbit(node.trust)
        orbits[orbit].push(nodeId)

        // Update node orbit if it doesn't match
        if (node.orbit !== orbit) {
          get().updateNode(nodeId, { orbit })
        }
      })

      set({ orbits })
    },

    // Connection management
    addConnection: (connection) => {
      set((state) => ({
        connections: [...state.connections, connection]
      }))
    },

    updateConnection: (connectionId, updates) => {
      set((state) => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId ? { ...conn, ...updates } : conn
        )
      }))
    },

    removeConnection: (connectionId) => {
      set((state) => ({
        connections: state.connections.filter(conn => conn.id !== connectionId)
      }))
    },

    // Pulsar entropy
    startPulsarTimer: () => {
      const state = get()
      if (state.pulsar.timerId) {
        clearInterval(state.pulsar.timerId)
      }

      const scheduleNextReshuffle = () => {
        const nextDelay = get().calculateNextReshuffle()
        const timerId = setTimeout(() => {
          get().triggerReshuffle()
          scheduleNextReshuffle() // Schedule next one
        }, nextDelay)

        set((state) => ({
          pulsar: {
            ...state.pulsar,
            nextReshuffle: Date.now() + nextDelay,
            timerId
          }
        }))
      }

      // Start the timer cycle
      scheduleNextReshuffle()

      set((state) => ({
        pulsar: {
          ...state.pulsar,
          isActive: true
        }
      }))

      get().addLog({
        level: 'INFO',
        source: 'Pulsar',
        message: 'Pulsar entropy timer started'
      })
    },

    stopPulsarTimer: () => {
      const state = get()
      if (state.pulsar.timerId) {
        clearTimeout(state.pulsar.timerId)
      }

      set((state) => ({
        pulsar: {
          ...state.pulsar,
          isActive: false,
          timerId: undefined
        }
      }))

      get().addLog({
        level: 'INFO',
        source: 'Pulsar',
        message: 'Pulsar entropy timer stopped'
      })
    },

    triggerReshuffle: () => {
      const state = get()

      // Update positions and recalculate orbits
      get().adjustOrbitAssignments()

      // Recalculate connections and trust scores
      // This would trigger CDijkstra recalculation in a full implementation

      set((state) => ({
        pulsar: {
          ...state.pulsar,
          lastReshuffle: Date.now(),
          entropyLevel: Math.random() * 0.5 + 0.5 // Random entropy spike
        }
      }))

      get().addLog({
        level: 'WARNING',
        source: 'Pulsar',
        message: 'Entropy spike → Topology reshuffled',
        details: { timestamp: Date.now() }
      })
    },

    calculateNextReshuffle: (baseInterval = 30000) => {
      const jitter = (Math.random() - 0.5) * 10000 // ±5s jitter
      return baseInterval + jitter
    },

    // Attack simulation
    startAttack: (attackData) => {
      const attack: AttackEvent = {
        ...attackData,
        id: generateId(),
        startTime: Date.now(),
        status: 'active'
      }

      set((state) => ({
        attacks: [...state.attacks, attack]
      }))

      // Apply attack effects
      const targetNode = get().nodes.get(attack.targetNodeId)
      if (targetNode) {
        const trustReduction = attack.intensity * 0.05
        get().updateTrust(attack.targetNodeId, targetNode.trust - trustReduction, `Attack: ${attack.type}`)

        get().updateNode(attack.targetNodeId, {
          status: 'attacked',
          metrics: {
            ...targetNode.metrics,
            anomalyCount: targetNode.metrics.anomalyCount + attack.intensity
          }
        })
      }

      get().addLog({
        level: 'ATTACK',
        source: 'Attack Simulator',
        message: `Attack started: ${attack.type} on node ${attack.targetNodeId} (intensity: ${attack.intensity}/10)`,
        details: attack
      })

      // Schedule attack end
      setTimeout(() => {
        get().stopAttack(attack.id)
      }, attack.duration)
    },

    stopAttack: (attackId) => {
      const state = get()
      const attack = state.attacks.find(a => a.id === attackId)

      if (!attack) return

      get().updateAttack(attackId, {
        status: 'completed',
        endTime: Date.now()
      })

      // Start recovery for target node
      const targetNode = get().nodes.get(attack.targetNodeId)
      if (targetNode) {
        get().updateNode(attack.targetNodeId, {
          status: 'recovering'
        })
      }

      get().addLog({
        level: 'SUCCESS',
        source: 'Attack Simulator',
        message: `Attack completed: ${attack.type} on node ${attack.targetNodeId}`,
        details: { attackId, duration: Date.now() - attack.startTime }
      })
    },

    updateAttack: (attackId, updates) => {
      set((state) => ({
        attacks: state.attacks.map(attack =>
          attack.id === attackId ? { ...attack, ...updates } : attack
        )
      }))
    },

    // Routing (simplified CDijkstra placeholder)
    calculatePath: (fromNodeId, toNodeId) => {
      // This is a simplified placeholder - full CDijkstra implementation would go here
      const state = get()
      const fromNode = state.nodes.get(fromNodeId)
      const toNode = state.nodes.get(toNodeId)

      if (!fromNode || !toNode) return null

      // Simple path through direct connection
      const directConnection = state.connections.find(
        conn => (conn.from === fromNodeId && conn.to === toNodeId) ||
                (conn.from === toNodeId && conn.to === fromNodeId)
      )

      if (directConnection && directConnection.trust >= 0.7) {
        return [fromNodeId, toNodeId]
      }

      return null // No safe path found
    },

    updatePVW: (path, dttl) => {
      const state = get()
      const pathConnections = path.slice(0, -1).map((nodeId, index) => {
        const nextNodeId = path[index + 1]
        return state.connections.find(
          conn => (conn.from === nodeId && conn.to === nextNodeId) ||
                  (conn.from === nextNodeId && conn.to === nodeId)
        )
      }).filter(Boolean) as Connection[]

      if (pathConnections.length === 0) return dttl

      const pvw = Math.min(dttl, ...pathConnections.map(conn => conn.ttl))

      set({ pathValidityWindow: pvw })

      get().addLog({
        level: 'INFO',
        source: 'PVW',
        message: `Path validity window updated: ${pvw}s`,
        details: { path, dttl, pvw }
      })

      return pvw
    },

    // Logging
    addLog: (entry) => {
      const logEntry: LogEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now()
      }

      set((state) => ({
        logs: [...state.logs, logEntry].slice(-1000) // Keep last 1000 logs
      }))
    },

    clearLogs: () => {
      set({ logs: [] })
    },

    // Simulation control
    startSimulation: () => {
      set({ isRunning: true })
      get().startPulsarTimer()

      get().addLog({
        level: 'INFO',
        source: 'System',
        message: 'Simulation started'
      })
    },

    stopSimulation: () => {
      set({ isRunning: false })
      get().stopPulsarTimer()

      get().addLog({
        level: 'INFO',
        source: 'System',
        message: 'Simulation stopped'
      })
    },

    resetSimulation: () => {
      get().stopSimulation()
      set(initialState)

      get().addLog({
        level: 'INFO',
        source: 'System',
        message: 'Simulation reset'
      })
    },

    setSimulationSpeed: (speed) => {
      set({ simulationSpeed: speed })
    }
  }))
)

// Selectors for common operations
export const useNodes = () => useSimulationStore((state) => state.nodes)
export const useConnections = () => useSimulationStore((state) => state.connections)
export const useOrbits = () => useSimulationStore((state) => state.orbits)
export const usePulsar = () => useSimulationStore((state) => state.pulsar)
export const useAttacks = () => useSimulationStore((state) => state.attacks)
export const useLogs = () => useSimulationStore((state) => state.logs)
export const useSelectedNode = () => useSimulationStore((state) =>
  state.selectedNode ? state.nodes.get(state.selectedNode) : null
)