/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FibrinNetwork } from '../../types/biomedical.ts';
import { buildFibrinMeshes, generateFibrinGraph } from '../procedural/fibrinGenerator.ts';
import { createPlateletGeometry } from '../procedural/plateletGeometry.ts';
import { createRBCGeometry } from '../procedural/rbcGeometry.ts';

export interface MicroscopicChamberState {
  fiberDensity: number; // 0 to 1
  fiberDiameterUm: number;
  lyticFraction: number; // 0 to 1
  rbcCount: number;
  plateletCount: number;
  showFibrin: boolean;
  showRBC: boolean;
  showPlatelets: boolean;
}

export class MicroscopicChamber {
  public root = new THREE.Group();
  public network: FibrinNetwork;

  private fibrinGroup = new THREE.Group();
  private rbcInstancedMesh!: THREE.InstancedMesh;
  private plateletInstancedMesh!: THREE.InstancedMesh;

  private fibrinMaterial: THREE.MeshStandardMaterial;
  private rbcMaterial: THREE.MeshPhysicalMaterial;
  private plateletMaterial: THREE.MeshStandardMaterial;

  private rbcCount = 85;
  private plateletCount = 28;
  private dummy = new THREE.Object3D();

  constructor() {
    this.root.name = 'MicroscopicChamberRoot';

    // Materials matching reference image:
    // Fibrin: Lustrous biological engineering gold (#E6B65C, roughness 0.28, metalness 0.55)
    this.fibrinMaterial = new THREE.MeshStandardMaterial({
      color: 0xdeb35a,
      roughness: 0.32,
      metalness: 0.48,
    });

    // Erythrocytes: Glossy, deep oxygenated/thrombus crimson (#941d24, transmission 0.25, clearcoat 0.6)
    this.rbcMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa82028,
      roughness: 0.24,
      metalness: 0.08,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      transmission: 0.15,
      ior: 1.4,
    });

    // Platelets: Golden-crystalline stellate bodies (#f0cd7d, roughness 0.35, metalness 0.65)
    this.plateletMaterial = new THREE.MeshStandardMaterial({
      color: 0xedd187,
      roughness: 0.35,
      metalness: 0.6,
    });

    // Generate initial graph
    this.network = generateFibrinGraph({
      nodeCount: 120,
      connectionDistance: 3.8,
      meanDiameterUm: 0.28,
      bounds: { x: 7.2, y: 5.2, z: 5.8 },
    });

    this.initMeshes();
  }

  private initMeshes(): void {
    // 1. Fibrin mesh
    this.rebuildFibrin(0);
    this.root.add(this.fibrinGroup);

    // 2. RBC Instanced Mesh
    const rbcGeo = createRBCGeometry(28, 36);
    this.rbcInstancedMesh = new THREE.InstancedMesh(rbcGeo, this.rbcMaterial, this.rbcCount);
    this.rbcInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rbcInstancedMesh.castShadow = true;
    this.rbcInstancedMesh.receiveShadow = true;

    // Distribute RBCs nested within and around the fibrin mesh
    const rng = (s: number) => ((s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < this.rbcCount; i++) {
      const u = rng(i * 13 + 7);
      const v = rng(i * 17 + 11);
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);
      const rad = 1.0 + Math.pow(rng(i * 19 + 5), 0.7) * 4.8;

      const px = rad * 1.35 * Math.sin(phi) * Math.cos(theta);
      const py = rad * 0.95 * Math.sin(phi) * Math.sin(theta);
      const pz = (rng(i * 23 + 3) - 0.5) * 6.5;

      this.dummy.position.set(px, py, pz);
      // Random biological tilt
      this.dummy.rotation.set(
        rng(i * 31) * Math.PI,
        rng(i * 37) * Math.PI * 2,
        rng(i * 41) * Math.PI
      );
      // Slight scale variation
      const s = 1.1 + (rng(i * 43) - 0.5) * 0.28;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();

      this.rbcInstancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.rbcInstancedMesh.instanceMatrix.needsUpdate = true;
    this.rbcInstancedMesh.computeBoundingSphere();
    this.root.add(this.rbcInstancedMesh);

    // 3. Platelets Instanced Mesh
    const plateletGeo = createPlateletGeometry();
    this.plateletInstancedMesh = new THREE.InstancedMesh(plateletGeo, this.plateletMaterial, this.plateletCount);
    this.plateletInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.plateletInstancedMesh.castShadow = true;
    this.plateletInstancedMesh.receiveShadow = true;

    for (let i = 0; i < this.plateletCount; i++) {
      // Platelets adhere directly to nodes of the fibrin graph
      const targetNode = this.network.nodes[i % this.network.nodes.length];
      const p = targetNode.position;

      this.dummy.position.set(p[0] + (rng(i * 7) - 0.5) * 0.4, p[1] + (rng(i * 11) - 0.5) * 0.4, p[2] + (rng(i * 13) - 0.5) * 0.4);
      this.dummy.rotation.set(rng(i * 5) * Math.PI * 2, rng(i * 17) * Math.PI * 2, rng(i * 23) * Math.PI * 2);
      const s = 0.9 + rng(i * 29) * 0.4;
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();

      this.plateletInstancedMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.plateletInstancedMesh.instanceMatrix.needsUpdate = true;
    this.plateletInstancedMesh.computeBoundingSphere();
    this.root.add(this.plateletInstancedMesh);
  }

  public rebuildFibrin(lyticFraction = 0): void {
    // Clear previous children
    while (this.fibrinGroup.children.length > 0) {
      const child = this.fibrinGroup.children[0] as THREE.Mesh;
      this.fibrinGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    const newMeshGroup = buildFibrinMeshes(this.network, this.fibrinMaterial, lyticFraction);
    // Move children into fibrinGroup
    while (newMeshGroup.children.length > 0) {
      this.fibrinGroup.add(newMeshGroup.children[0]);
    }
  }

  public updateParameters(options: {
    nodeCount?: number;
    meanDiameterUm?: number;
    lyticFraction?: number;
  }): void {
    if (options.nodeCount !== undefined || options.meanDiameterUm !== undefined) {
      this.network = generateFibrinGraph({
        nodeCount: options.nodeCount ?? this.network.nodes.length,
        meanDiameterUm: options.meanDiameterUm ?? 0.28,
        connectionDistance: 3.8,
        bounds: { x: 7.2, y: 5.2, z: 5.8 },
      });
    }
    this.rebuildFibrin(options.lyticFraction ?? 0);
  }

  public setVisibility(showFibrin: boolean, showRBC: boolean, showPlatelets: boolean): void {
    this.fibrinGroup.visible = showFibrin;
    this.rbcInstancedMesh.visible = showRBC;
    this.plateletInstancedMesh.visible = showPlatelets;
  }
}
