// CDijkstra - Trust-aware shortest path routing algorithm
// Based on the POS specification: Cost = distance / (trust * stability)

import { SecurityNode, Connection } from '../store/simulationStore'

export interface GraphEdge {
  from: string
  to: string
  distance: number
  trust: number
  stability: number
  cost?: number
}

export interface GraphNode {
  id: string
  trust: number
  x: number
  y: number
  z: number
  edges: GraphEdge[]
}

export interface PathResult {
  path: string[]
  totalCost: number
  totalDistance: number
  minTrust: number
  isSafe: boolean
}

export interface CDijkstraOptions {
  trustMin?: number // Minimum trust threshold (default: 0.7)
  stabilityWeight?: number // Weight for stability in cost calculation (default: 1.0)
  distanceWeight?: number // Weight for distance in cost calculation (default: 1.0)
  maxPathLength?: number // Maximum number of hops (default: 10)
}

export class CDijkstra {
  private nodes: Map<string, GraphNode> = new Map()
  private options: Required<CDijkstraOptions>

  constructor(options: CDijkstraOptions = {}) {
    this.options = {
      trustMin: options.trustMin ?? 0.7,
      stabilityWeight: options.stabilityWeight ?? 1.0,
      distanceWeight: options.distanceWeight ?? 1.0,
      maxPathLength: options.maxPathLength ?? 10
    }
  }

  /**
   * Build graph from simulation state
   */
  buildGraph(nodes: Map<string, SecurityNode>, connections: Connection[]): void {
    this.nodes.clear()

    // Add all nodes to graph
    nodes.forEach((node, nodeId) => {
      this.nodes.set(nodeId, {
        id: nodeId,
        trust: node.trust,
        x: node.position.x,
        y: node.position.y,
        z: node.position.z,
        edges: []
      })
    })

    // Add connections as bidirectional edges
    connections.forEach(connection => {
      const fromNode = this.nodes.get(connection.from)
      const toNode = this.nodes.get(connection.to)

      if (fromNode && toNode) {
        // Calculate distance from node positions if not provided
        const distance = connection.distance || this.calculateDistance(fromNode, toNode)

        // Edge from -> to
        fromNode.edges.push({
          from: connection.from,
          to: connection.to,
          distance,
          trust: connection.trust,
          stability: connection.stability
        })

        // Edge to -> from (bidirectional)
        toNode.edges.push({
          from: connection.to,
          to: connection.from,
          distance,
          trust: connection.trust,
          stability: connection.stability
        })
      }
    })

    // Calculate edge costs
    this.calculateEdgeCosts()
  }

  /**
   * Calculate Euclidean distance between two nodes
   */
  private calculateDistance(nodeA: GraphNode, nodeB: GraphNode): number {
    const dx = nodeA.x - nodeB.x
    const dy = nodeA.y - nodeB.y
    const dz = nodeA.z - nodeB.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  /**
   * Calculate costs for all edges using the CDijkstra formula
   * Cost = distance / (trust * stability)
   */
  private calculateEdgeCosts(): void {
    this.nodes.forEach(node => {
      node.edges.forEach(edge => {
        const targetNode = this.nodes.get(edge.to)
        if (targetNode) {
          // Use minimum trust along the path (edge trust vs target node trust)
          const pathTrust = Math.min(edge.trust, targetNode.trust)

          // Calculate cost using the CDijkstra formula
          edge.cost = this.options.distanceWeight * edge.distance /
                     (pathTrust * this.options.stabilityWeight * edge.stability)
        }
      })
    })
  }

  /**
   * Check if a node is safe to use in routing
   */
  private isNodeSafe(node: GraphNode): boolean {
    return node.trust >= this.options.trustMin && node.trust > 0
  }

  /**
   * Check if an edge is safe to traverse
   */
  private isEdgeSafe(edge: GraphEdge): boolean {
    const targetNode = this.nodes.get(edge.to)
    if (!targetNode) return false

    return edge.trust >= this.options.trustMin &&
           edge.stability > 0 &&
           this.isNodeSafe(targetNode)
  }

  /**
   * Find the shortest safe path between two nodes using CDijkstra
   */
  findPath(startNodeId: string, endNodeId: string): PathResult | null {
    const startNode = this.nodes.get(startNodeId)
    const endNode = this.nodes.get(endNodeId)

    if (!startNode || !endNode) {
      return null
    }

    // Check if start or end nodes are unsafe
    if (!this.isNodeSafe(startNode) || !this.isNodeSafe(endNode)) {
      return null
    }

    // Dijkstra's algorithm with trust-aware costs
    const distances = new Map<string, number>()
    const previous = new Map<string, string | null>()
    const trustScores = new Map<string, number>()
    const unvisited = new Set<string>()

    // Initialize distances
    this.nodes.forEach((node, nodeId) => {
      distances.set(nodeId, nodeId === startNodeId ? 0 : Infinity)
      previous.set(nodeId, null)
      trustScores.set(nodeId, nodeId === startNodeId ? startNode.trust : 0)
      unvisited.add(nodeId)
    })

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentId: string | null = null
      let minDistance = Infinity

      unvisited.forEach(nodeId => {
        const distance = distances.get(nodeId) || Infinity
        if (distance < minDistance) {
          minDistance = distance
          currentId = nodeId
        }
      })

      if (currentId === null || minDistance === Infinity) {
        break // No more reachable nodes
      }

      const currentNode = this.nodes.get(currentId)
      if (!currentNode) break

      unvisited.delete(currentId)

      // If we reached the target, reconstruct path
      if (currentId === endNodeId) {
        const path = this.reconstructPath(previous, startNodeId, endNodeId)
        const totalCost = distances.get(endNodeId) || 0
        const totalDistance = this.calculatePathDistance(path)
        const minTrust = Math.min(...path.map(nodeId =>
          Math.min(this.nodes.get(nodeId)?.trust || 0,
                   this.getEdgeTrust(path, nodeId))
        ))

        return {
          path,
          totalCost,
          totalDistance,
          minTrust,
          isSafe: minTrust >= this.options.trustMin
        }
      }

      // Visit neighbors
      currentNode.edges.forEach(edge => {
        // Skip unsafe edges
        if (!this.isEdgeSafe(edge)) return

        const neighborId = edge.to
        if (!unvisited.has(neighborId)) return

        const currentDistance = distances.get(currentId!)
        if (currentDistance === undefined) return
        const altDistance = currentDistance + (edge.cost || 0)

        if (altDistance < (distances.get(neighborId) || Infinity)) {
          distances.set(neighborId, altDistance)
          previous.set(neighborId, currentId!)

          // Track minimum trust along path
          const neighborNode = this.nodes.get(neighborId)
          if (neighborNode) {
            const pathTrust = Math.min(
              trustScores.get(currentId!) || 1,
              edge.trust,
              neighborNode.trust
            )
            trustScores.set(neighborId, pathTrust)
          }
        }
      })

      // Safety check: prevent infinite loops
      if (this.getPathLength(previous, startNodeId, currentId) > this.options.maxPathLength) {
        break
      }
    }

    // No path found
    return null
  }

  /**
   * Reconstruct path from previous node mapping
   */
  private reconstructPath(previous: Map<string, string | null>, start: string, end: string): string[] {
    const path: string[] = []
    let current: string | null = end

    while (current !== null) {
      path.unshift(current)
      current = previous.get(current) || null

      if (current === start) {
        path.unshift(start)
        break
      }
    }

    return path[0] === start ? path : []
  }

  /**
   * Get path length in hops
   */
  private getPathLength(previous: Map<string, string | null>, start: string, current: string): number {
    let length = 0
    let node: string | null = current

    while (node && node !== start) {
      length++
      node = previous.get(node) || null
    }

    return length
  }

  /**
   * Calculate total distance of a path
   */
  private calculatePathDistance(path: string[]): number {
    let totalDistance = 0

    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = this.nodes.get(path[i])
      const toNode = this.nodes.get(path[i + 1])

      if (fromNode && toNode) {
        totalDistance += this.calculateDistance(fromNode, toNode)
      }
    }

    return totalDistance
  }

  /**
   * Get trust score for edge in path
   */
  private getEdgeTrust(path: string[], nodeId: string): number {
    const nodeIndex = path.indexOf(nodeId)
    if (nodeIndex === 0) return this.nodes.get(nodeId)?.trust || 0

    const prevNodeId = path[nodeIndex - 1]
    const prevNode = this.nodes.get(prevNodeId)

    if (!prevNode) return 0

    const edge = prevNode.edges.find(e => e.to === nodeId)
    return edge?.trust || 0
  }

  /**
   * Find all safe paths from a node (for network analysis)
   */
  findAllSafePaths(startNodeId: string): Map<string, PathResult> {
    const results = new Map<string, PathResult>()
    const startNode = this.nodes.get(startNodeId)

    if (!startNode || !this.isNodeSafe(startNode)) {
      return results
    }

    this.nodes.forEach((node, nodeId) => {
      if (nodeId !== startNodeId) {
        const path = this.findPath(startNodeId, nodeId)
        if (path && path.isSafe) {
          results.set(nodeId, path)
        }
      }
    })

    return results
  }

  /**
   * Analyze network connectivity and safety
   */
  analyzeNetwork(): {
    safeNodes: number
    unsafeNodes: number
    totalConnections: number
    safeConnections: number
    networkSafety: number // 0-1 scale
  } {
    const totalNodes = this.nodes.size
    let safeNodes = 0
    let totalConnections = 0
    let safeConnections = 0

    this.nodes.forEach(node => {
      if (this.isNodeSafe(node)) {
        safeNodes++
      }

      node.edges.forEach(edge => {
        totalConnections++
        if (this.isEdgeSafe(edge)) {
          safeConnections++
        }
      })
    })

    const networkSafety = totalConnections > 0 ? safeConnections / totalConnections : 0

    return {
      safeNodes,
      unsafeNodes: totalNodes - safeNodes,
      totalConnections,
      safeConnections,
      networkSafety
    }
  }

  /**
   * Get recommended routing actions based on current network state
   */
  getRoutingRecommendations(): {
    isolateNodes: string[] // Nodes that should be isolated
    rerouteConnections: Array<{ from: string; to: string; reason: string }>
    networkRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  } {
    const recommendations = {
      isolateNodes: [] as string[],
      rerouteConnections: [] as Array<{ from: string; to: string; reason: string }>,
      networkRisk: 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }

    const analysis = this.analyzeNetwork()

    // Determine network risk level
    if (analysis.networkSafety >= 0.8) {
      recommendations.networkRisk = 'LOW'
    } else if (analysis.networkSafety >= 0.6) {
      recommendations.networkRisk = 'MEDIUM'
    } else if (analysis.networkSafety >= 0.4) {
      recommendations.networkRisk = 'HIGH'
    } else {
      recommendations.networkRisk = 'CRITICAL'
    }

    // Find nodes that should be isolated
    this.nodes.forEach(node => {
      if (node.trust < 0.3) {
        recommendations.isolateNodes.push(node.id)
      }
    })

    // Find unsafe connections
    this.nodes.forEach(node => {
      node.edges.forEach(edge => {
        if (!this.isEdgeSafe(edge)) {
          recommendations.rerouteConnections.push({
            from: edge.from,
            to: edge.to,
            reason: edge.trust < this.options.trustMin ?
              'Low trust score' :
              'Low stability'
          })
        }
      })
    })

    return recommendations
  }
}

/**
 * Convenience function to run CDijkstra on simulation state
 */
export function runCDijkstra(
  nodes: Map<string, SecurityNode>,
  connections: Connection[],
  startNodeId: string,
  endNodeId: string,
  options?: CDijkstraOptions
): PathResult | null {
  const cdijkstra = new CDijkstra(options)
  cdijkstra.buildGraph(nodes, connections)
  return cdijkstra.findPath(startNodeId, endNodeId)
}

/**
 * Analyze entire network safety using CDijkstra
 */
export function analyzeNetworkSafety(
  nodes: Map<string, SecurityNode>,
  connections: Connection[],
  options?: CDijkstraOptions
): ReturnType<CDijkstra['analyzeNetwork']> {
  const cdijkstra = new CDijkstra(options)
  cdijkstra.buildGraph(nodes, connections)
  return cdijkstra.analyzeNetwork()
}