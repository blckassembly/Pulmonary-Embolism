/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type VRReticleTargetState = 'idle' | 'structure' | 'hotspot';

export interface VRReticleHudState {
  visible2D: boolean;
  targetState: VRReticleTargetState;
  targetLabel: string | null;
}

/**
 * Subtle, non-intrusive fixed-center crosshair reticle for VR navigation and
 * fibrin microstructure target selection.
 *
 * - During stereo `immersive-vr` / `immersive-ar` presentation, renders a
 *   world-locked 3D stereo-safe reticle at 1.25 m directly along the HMD gaze
 *   axis so both eyes see a crisp, zero-clipping center crosshair.
 * - During monoscopic Quest Simulator preview (`!isPresenting && isVRActive`),
 *   hides the 3D mesh and drives a matching 2D SVG viewport-center overlay.
 */
export class VRCenterReticle {
  public readonly group = new THREE.Group();

  private dotMat: THREE.MeshBasicMaterial;
  private tickMat: THREE.MeshBasicMaterial;
  private backingMat: THREE.MeshBasicMaterial;
  private ringMat: THREE.MeshBasicMaterial;
  private ringMesh: THREE.Mesh;
  private geometries: THREE.BufferGeometry[] = [];

  private currentScale = 1.0;
  private currentRingOpacity = 0.0;
  private lastSignature = '';

  // Reusable scratch math objects
  private tempCamPos = new THREE.Vector3();
  private tempCamQuat = new THREE.Quaternion();
  private tempForward = new THREE.Vector3();

  constructor() {
    this.group.name = 'VRCenterCrosshairReticle';
    this.group.visible = false;
    this.group.frustumCulled = false;

    const baseMaterialConfig = {
      transparent: true,
      depthTest: false,
      depthWrite: false,
      fog: false,
      side: THREE.DoubleSide,
    };

    this.backingMat = new THREE.MeshBasicMaterial({
      ...baseMaterialConfig,
      color: 0x141514,
      opacity: 0.42,
    });

    this.dotMat = new THREE.MeshBasicMaterial({
      ...baseMaterialConfig,
      color: 0xfaf7ec,
      opacity: 0.85,
    });

    this.tickMat = new THREE.MeshBasicMaterial({
      ...baseMaterialConfig,
      color: 0xfaf7ec,
      opacity: 0.72,
    });

    this.ringMat = new THREE.MeshBasicMaterial({
      ...baseMaterialConfig,
      color: 0xf5d547,
      opacity: 0.0,
    });

    // 1. Center micro-dot with subtle contrast backing
    const dotBackingGeo = new THREE.CircleGeometry(0.0032, 16);
    const dotGeo = new THREE.CircleGeometry(0.0021, 16);
    this.geometries.push(dotBackingGeo, dotGeo);

    const dotBacking = new THREE.Mesh(dotBackingGeo, this.backingMat);
    dotBacking.renderOrder = 998;
    const dotMesh = new THREE.Mesh(dotGeo, this.dotMat);
    dotMesh.renderOrder = 999;
    this.group.add(dotBacking, dotMesh);

    // 2. Four minimal architectural crosshair ticks around an open center gap
    const tickLen = 0.0085;
    const tickThickness = 0.0014;
    const tickOffset = 0.0115;

    const hBackingGeo = new THREE.PlaneGeometry(tickLen + 0.002, tickThickness + 0.0018);
    const hTickGeo = new THREE.PlaneGeometry(tickLen, tickThickness);
    const vBackingGeo = new THREE.PlaneGeometry(tickThickness + 0.0018, tickLen + 0.002);
    const vTickGeo = new THREE.PlaneGeometry(tickThickness, tickLen);
    this.geometries.push(hBackingGeo, hTickGeo, vBackingGeo, vTickGeo);

    const addTick = (
      x: number,
      y: number,
      backingGeo: THREE.PlaneGeometry,
      tickGeo: THREE.PlaneGeometry
    ) => {
      const back = new THREE.Mesh(backingGeo, this.backingMat);
      back.position.set(x, y, 0);
      back.renderOrder = 998;
      const fore = new THREE.Mesh(tickGeo, this.tickMat);
      fore.position.set(x, y, 0.0001);
      fore.renderOrder = 999;
      this.group.add(back, fore);
    };

    addTick(-tickOffset, 0, hBackingGeo, hTickGeo);
    addTick(tickOffset, 0, hBackingGeo, hTickGeo);
    addTick(0, tickOffset, vBackingGeo, vTickGeo);
    addTick(0, -tickOffset, vBackingGeo, vTickGeo);

    // 3. Subtle target-lock outer ring (fades in smoothly when aiming over fibrin/thrombus)
    const ringGeo = new THREE.RingGeometry(0.0205, 0.0226, 36);
    this.geometries.push(ringGeo);
    this.ringMesh = new THREE.Mesh(ringGeo, this.ringMat);
    this.ringMesh.renderOrder = 999;
    this.group.add(this.ringMesh);
  }

  public update(params: {
    camera: THREE.Camera;
    isPresenting: boolean;
    isVRActive: boolean;
    targetState: VRReticleTargetState;
    targetLabel: string | null;
    delta: number;
  }): VRReticleHudState | null {
    const { camera, isPresenting, isVRActive, targetState, targetLabel, delta } = params;

    // 3D stereo reticle is shown during active stereo presentation; 2D SVG handles Quest Sim preview
    this.group.visible = isPresenting;

    if (isPresenting) {
      camera.getWorldPosition(this.tempCamPos);
      camera.getWorldQuaternion(this.tempCamQuat);
      this.tempForward.set(0, 0, -1).applyQuaternion(this.tempCamQuat).normalize();

      // Comfortable stereo convergence plane (1.25 m in front of viewer eyes)
      this.group.position.copy(this.tempCamPos).addScaledVector(this.tempForward, 1.25);
      this.group.quaternion.copy(this.tempCamQuat);

      const desiredScale =
        targetState === 'hotspot' ? 1.18 : targetState === 'structure' ? 1.07 : 1.0;
      const desiredRingOpacity =
        targetState === 'hotspot' ? 0.88 : targetState === 'structure' ? 0.45 : 0.0;

      this.currentScale = THREE.MathUtils.damp(this.currentScale, desiredScale, 14, delta);
      this.currentRingOpacity = THREE.MathUtils.damp(
        this.currentRingOpacity,
        desiredRingOpacity,
        14,
        delta
      );

      this.group.scale.setScalar(this.currentScale);
      this.ringMat.opacity = this.currentRingOpacity;
      this.ringMesh.scale.setScalar(targetState === 'hotspot' ? 0.94 : 1.05);

      const accentHex = targetState === 'idle' ? 0xfaf7ec : 0xf5d547;
      this.dotMat.color.setHex(accentHex);
      this.tickMat.color.setHex(accentHex);
      this.tickMat.opacity = targetState === 'idle' ? 0.68 : 0.92;
      this.dotMat.opacity = targetState === 'idle' ? 0.82 : 0.96;
    }

    const visible2D = !isPresenting && isVRActive;
    const sig = `${visible2D ? 1 : 0}|${targetState}|${targetLabel ?? ''}`;
    if (sig !== this.lastSignature) {
      this.lastSignature = sig;
      return {
        visible2D,
        targetState,
        targetLabel: visible2D ? targetLabel : null,
      };
    }

    return null;
  }

  public dispose(): void {
    for (const geo of this.geometries) {
      geo.dispose();
    }
    this.geometries = [];
    this.backingMat.dispose();
    this.dotMat.dispose();
    this.tickMat.dispose();
    this.ringMat.dispose();
    this.group.clear();
  }
}
