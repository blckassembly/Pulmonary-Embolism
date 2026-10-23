/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FibrinEdge, FibrinNetwork, FibrinNode } from '../../types/biomedical.ts';

export interface FibrinGenOptions {
  nodeCount?: number;
  connectionDistance?: number;
  maxDegree?: number;
  meanDiameterUm?: number;
  diameterVariation?: number;
  seed?: number;
  bounds?: { x: number; y: number; z: number };
}

/**
 * Pseudo-random generator with seed for reproducible biological networks.
 */
class SimpleRNG {
  private s: number;
  constructor(seed = 42) {
    this.s = seed;
  }
  next(): number {
    this.s = (this.s * 9301 + 49297) % 233280;
    return this.s / 233280;
  }
}

/**
 * Builds a biophysically plausible 3D graph representing a fibrin network.
 */
export function generateFibrinGraph(options: FibrinGenOptions = {}): FibrinNetwork {
  const {
    nodeCount = 110,
    connectionDistance = 3.6,
    maxDegree = 4,
    meanDiameterUm = 0.28,
    diameterVariation = 0.08,
    seed = 1042,
    bounds = { x: 7.5, y: 5.5, z: 6.0 },
  } = options;

  const rng = new SimpleRNG(seed);
  const nodes: FibrinNode[] = [];
  const edges: FibrinEdge[] = [];

  // Generate nodes within a biological cylindrical/ellipsoidal thrombus bundle
  for (let i = 0; i < nodeCount; i++) {
    // Ellipsoidal distribution with higher density in core
    const u = rng.next();
    const v = rng.next();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = Math.pow(rng.next(), 0.65); // radial concentration

    const px = r * bounds.x * Math.sin(phi) * Math.cos(theta);
    const py = r * bounds.y * Math.sin(phi) * Math.sin(theta);
    const pz = (rng.next() - 0.5) * 2.0 * bounds.z;

    nodes.push({
      id: `fn_${i}`,
      position: [px, py, pz],
      nodeType: 'junction',
    });
  }

  // Create biological network connectivity
  const degreeMap = new Map<number, number>();
  for (let i = 0; i < nodeCount; i++) degreeMap.set(i, 0);

  let edgeCounter = 0;

  for (let i = 0; i < nodeCount; i++) {
    const pA = nodes[i].position;
    const distances: { index: number; dist: number }[] = [];

    for (let j = 0; j < nodeCount; j++) {
      if (i === j) continue;
      const pB = nodes[j].position;
      const dx = pA[0] - pB[0];
      const dy = pA[1] - pB[1];
      const dz = pA[2] - pB[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < connectionDistance) {
        distances.push({ index: j, dist });
      }
    }

    // Sort by proximity
    distances.sort((a, b) => a.dist - b.dist);

    for (const neighbor of distances) {
      const j = neighbor.index;
      if (i >= j) continue; // avoid duplicate bidirectional edges

      const degA = degreeMap.get(i) || 0;
      const degB = degreeMap.get(j) || 0;

      if (degA < maxDegree && degB < maxDegree) {
        // Diameter variation
        const diam = Math.max(0.12, meanDiameterUm + (rng.next() - 0.5) * 2 * diameterVariation);
        const crossLinked = rng.next() > 0.35;

        edges.push({
          id: `fe_${edgeCounter++}`,
          fromNodeId: nodes[i].id,
          toNodeId: nodes[j].id,
          diameterUm: diam,
          fiberClass: diam > 0.32 ? 'bundle' : 'single_protofibril',
          crossLinked,
          intact: true,
        });

        degreeMap.set(i, degA + 1);
        degreeMap.set(j, degB + 1);
      }
    }
  }

  // Label node types based on connectivity
  for (let i = 0; i < nodeCount; i++) {
    const deg = degreeMap.get(i) || 0;
    if (deg <= 1) nodes[i].nodeType = 'endpoint';
    else if (deg >= 3) nodes[i].nodeType = 'junction';
    else nodes[i].nodeType = 'interior';
  }

  return {
    id: `net_${seed}`,
    seed,
    nodes,
    edges,
    evidenceType: 'illustrative',
    modelVersion: 'FibrinGraph-v2.1',
  };
}

/**
 * Builds 3D renderable spline tube geometry from a FibrinNetwork.
 * Uses curved CatmullRom splines with organic jitter to mirror electron micrographs.
 */
export function buildFibrinMeshes(
  network: FibrinNetwork,
  material: THREE.Material,
  lyticFraction = 0
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'FibrinMeshGroup';

  const nodeMap = new Map<string, [number, number, number]>();
  for (const n of network.nodes) {
    nodeMap.set(n.id, n.position);
  }

  // Pre-calculate edges to keep based on lytic progress (fibrinolysis)
  // Higher lyticFraction means more edges severed (intact: false)
  const edgesToRender = network.edges.filter((e, idx) => {
    if (lyticFraction <= 0) return true;
    // Non-crosslinked fibers degrade first, then crosslinked
    const fragility = e.crossLinked ? 0.65 : 1.0;
    const threshold = ((idx * 9301 + 49297) % 100) / 100.0;
    return threshold > lyticFraction * fragility;
  });

  // Group edges into smooth multi-point curves where possible or curved segments
  for (const edge of edgesToRender) {
    const posA = nodeMap.get(edge.fromNodeId);
    const posB = nodeMap.get(edge.toNodeId);
    if (!posA || !posB) continue;

    const vA = new THREE.Vector3(...posA);
    const vB = new THREE.Vector3(...posB);
    const mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);

    // Add organic biological sag/waver to fiber
    const len = vA.distanceTo(vB);
    const jitter = Math.min(0.25, len * 0.12);
    const seedVal = (vA.x * 13 + vB.y * 17 + vB.z * 19);
    mid.x += Math.sin(seedVal) * jitter;
    mid.y += Math.cos(seedVal * 1.3) * jitter;
    mid.z += Math.sin(seedVal * 0.7) * jitter;

    const curve = new THREE.CatmullRomCurve3([vA, mid, vB]);
    const radius = Math.max(0.025, (edge.diameterUm / 0.28) * 0.038);
    const tubeGeo = new THREE.TubeGeometry(curve, 8, radius, 6, false);

    const mesh = new THREE.Mesh(tubeGeo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}
