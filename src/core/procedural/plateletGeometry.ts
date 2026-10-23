/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates an activated platelet (thrombocyte) geometry with a central discoid body
 * and radiating dendritic pseudopodia (tentacles) that adhere to fibrin strands.
 */
export function createPlateletGeometry(): THREE.BufferGeometry {
  const group = new THREE.Group();

  // Central irregular body
  const bodyGeo = new THREE.IcosahedronGeometry(0.35, 2);
  const pos = bodyGeo.attributes.position;
  // Apply organic noise to body vertices
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
    const factor = 1.0 + 0.18 * Math.sin(vx * 7 + vy * 5 + vz * 6);
    pos.setXYZ(i, (vx / len) * 0.35 * factor, (vy / len) * 0.28 * factor, (vz / len) * 0.35 * factor);
  }
  bodyGeo.computeVertexNormals();

  const bodyMesh = new THREE.Mesh(bodyGeo);
  group.add(bodyMesh);

  // Radiating pseudopodia (dendritic spines)
  const numSpines = 10;
  const spineGeo = new THREE.ConeGeometry(0.045, 0.45, 6);
  spineGeo.translate(0, 0.22, 0);

  for (let i = 0; i < numSpines; i++) {
    const spineMesh = new THREE.Mesh(spineGeo);
    // Distribute spines uniformly on sphere using fibonacci lattice
    const phi = Math.acos(1 - 2 * (i + 0.5) / numSpines);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ).normalize();

    spineMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    spineMesh.position.copy(dir.clone().multiplyScalar(0.28));
    spineMesh.scale.set(1, 0.7 + 0.6 * ((i * 13) % 7) / 7, 1);
    group.add(spineMesh);
  }

  // Merge into a single BufferGeometry for optimal instancing/rendering
  const geometries: THREE.BufferGeometry[] = [];
  group.updateMatrixWorld(true);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const cloned = child.geometry.clone();
      cloned.applyMatrix4(child.matrixWorld);
      geometries.push(cloned);
    }
  });

  // Simple merge
  let totalVerts = 0;
  for (const g of geometries) {
    totalVerts += g.attributes.position.count;
  }

  const mergedPos = new Float32Array(totalVerts * 3);
  const mergedNorm = new Float32Array(totalVerts * 3);
  let offset = 0;

  for (const g of geometries) {
    const p = g.attributes.position;
    const n = g.attributes.normal || g.computeVertexNormals();
    const count = p.count;
    for (let i = 0; i < count; i++) {
      mergedPos[(offset + i) * 3] = p.getX(i);
      mergedPos[(offset + i) * 3 + 1] = p.getY(i);
      mergedPos[(offset + i) * 3 + 2] = p.getZ(i);

      if (g.attributes.normal) {
        mergedNorm[(offset + i) * 3] = g.attributes.normal.getX(i);
        mergedNorm[(offset + i) * 3 + 1] = g.attributes.normal.getY(i);
        mergedNorm[(offset + i) * 3 + 2] = g.attributes.normal.getZ(i);
      }
    }
    offset += count;
  }

  const resultGeo = new THREE.BufferGeometry();
  resultGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  resultGeo.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  resultGeo.computeVertexNormals();

  return resultGeo;
}
