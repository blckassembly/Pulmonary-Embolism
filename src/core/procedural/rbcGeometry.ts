/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Generates an anatomically grounded biconcave disc geometry for erythrocytes (RBCs).
 * Radius R = 1.0 (scaled to ~7.8 µm in micro space), with typical Evans-Fung profile:
 * Thicker outer toroidal rim (~0.32), concave indented center (~0.12).
 */
export function createRBCGeometry(radialSegments = 32, latheSegments = 40): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  const R = 1.0;
  const count = radialSegments;

  // Profile along half-section from center r=0 to edge r=R and back along bottom
  // Top curve from r=0 to r=R:
  // Mathematical biconcave formulation:
  // z(r) = 0.5 * D * sqrt(1 - (r/R)^2) * (c0 + c1*(r/R)^2 + c2*(r/R)^4)
  // With parameters fitted to human erythrocyte morphology:
  // c0 = 0.207, c1 = 2.00, c2 = -1.122, D = 0.42
  const D = 0.44;
  const c0 = 0.21;
  const c1 = 2.05;
  const c2 = -1.15;

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const r = t * R;
    const term = Math.max(0, 1 - (r / R) * (r / R));
    const z = 0.5 * D * Math.sqrt(term) * (c0 + c1 * Math.pow(r / R, 2) + c2 * Math.pow(r / R, 4));
    points.push(new THREE.Vector2(r, Math.max(0.04, z)));
  }

  // Smoothly wrap around edge and return along bottom symmetry
  for (let i = count - 1; i >= 0; i--) {
    const t = i / count;
    const r = t * R;
    const term = Math.max(0, 1 - (r / R) * (r / R));
    const z = 0.5 * D * Math.sqrt(term) * (c0 + c1 * Math.pow(r / R, 2) + c2 * Math.pow(r / R, 4));
    points.push(new THREE.Vector2(r, -Math.max(0.04, z)));
  }

  const geometry = new THREE.LatheGeometry(points, latheSegments);
  geometry.computeVertexNormals();
  return geometry;
}
