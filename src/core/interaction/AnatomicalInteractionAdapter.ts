/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CLOT_ANNOTATIONS } from '../../data/clotAnnotations.ts';
import { EXPLORER_ANATOMY_STRUCTURES } from '../../data/explorerAnatomyData.ts';
import { ClotAnnotation, ExplorerAnatomyId, ScaleLevel } from '../../types/biomedical.ts';
import { AnatomicalLabelPayload, InteractionSourceType } from '../../types/webxr.ts';

export type VRHudAction = 'prevLabel' | 'nextLabel' | 'cycleScale' | 'resetScene' | 'exitVR';

export interface AnatomicalAdapterHost {
  sceneContainer: THREE.Group;
  annotationsGroup: THREE.Group;
  hotspotHitTargets: THREE.Object3D[];
  thoracicGroup: THREE.Group;
  vesselCutawayGroup: THREE.Group;
  embolusMacroMesh: THREE.Mesh;
  microscopicRoot: THREE.Group;
  industrialCutaway: THREE.Group;
  vrHudButtons: THREE.Object3D[];
  isAnnotationsVisible: () => boolean;
  getCurrentScale: () => ScaleLevel;
  getActiveAnnotationId: () => string | null;
  getActiveStructureId: () => ExplorerAnatomyId | null;
  onSelectAnnotation: (id: string | null) => void;
  onSelectStructure: (id: ExplorerAnatomyId, moveCamera: boolean) => void;
  onHoverAnnotation: (ann: ClotAnnotation | null) => void;
  onCycleScale: () => void;
  onResetScene: () => void;
  onExitVR: () => Promise<void>;
  onAdapterStateChange?: (state: {
    activeSource: InteractionSourceType | null;
    isManipulating: boolean;
    selectedLabel: string | null;
    eventMessage?: string;
  }) => void;
}

interface ActiveGrabState {
  sourceId: string;
  sourceType: InteractionSourceType;
  startedAt: number;
  lastOrigin: THREE.Vector3;
  lastQuaternion: THREE.Quaternion;
  cumulativeTravel: number;
  hitActionButton: VRHudAction | null;
  hitHotspotId: string | null;
  hitStructureId: ExplorerAnatomyId | null;
  hitSpecimen: boolean;
}

export interface RayResolutionResult {
  kind: 'hudAction' | 'hotspot' | 'structure' | 'specimen' | 'none';
  action?: VRHudAction;
  annotationId?: string;
  structureId?: ExplorerAnatomyId;
  point?: THREE.Vector3;
  distance?: number;
}

/**
 * Shared Anatomical Interaction Adapter.
 * Unifies Mouse, Touch, Quest Controller, and WebXR Hand Pinch interactions
 * for anatomical selection, 3D position/rotation manipulation, label inspection,
 * scene reset, and VR exit.
 */
export class AnatomicalInteractionAdapter {
  private host: AnatomicalAdapterHost;
  private raycaster = new THREE.Raycaster();
  private activeGrab: ActiveGrabState | null = null;
  private isVRPresenting = false;
  private seatedOrigin = new THREE.Vector3(0, 1.08, -0.92);

  // Reusable scratch objects to prevent per-frame allocations
  private tempDeltaPos = new THREE.Vector3();
  private tempDeltaQuat = new THREE.Quaternion();
  private tempInvLastQuat = new THREE.Quaternion();
  private tempAxisX = new THREE.Vector3();
  private tempAxisY = new THREE.Vector3();
  private tempQuatX = new THREE.Quaternion();
  private tempQuatY = new THREE.Quaternion();
  private tempWorldPos = new THREE.Vector3();

  constructor(host: AnatomicalAdapterHost) {
    this.host = host;
  }

  public setVRPresenting(presenting: boolean, seatedOrigin?: THREE.Vector3): void {
    this.isVRPresenting = presenting;
    if (seatedOrigin) {
      this.seatedOrigin.copy(seatedOrigin);
    }
    if (!presenting) {
      this.activeGrab = null;
      this.emitState(null, false);
    }
  }

  public setSeatedOrigin(origin: THREE.Vector3): void {
    this.seatedOrigin.copy(origin);
  }

  public isManipulating(): boolean {
    return Boolean(this.activeGrab && this.activeGrab.hitSpecimen && this.activeGrab.cumulativeTravel > 0.015);
  }

  public getActiveSource(): InteractionSourceType | null {
    return this.activeGrab?.sourceType ?? null;
  }

  /**
   * Resolves a ray against VR HUD buttons, anatomical hotspots, and existing organ meshes.
   */
  public resolveRay(rayOriginOrNdc: THREE.Vector3 | THREE.Vector2, rayDirectionOrCamera: THREE.Vector3 | THREE.Camera): RayResolutionResult {
    if (rayOriginOrNdc instanceof THREE.Vector2 && rayDirectionOrCamera instanceof THREE.Camera) {
      this.raycaster.setFromCamera(rayOriginOrNdc, rayDirectionOrCamera);
    } else if (rayOriginOrNdc instanceof THREE.Vector3 && rayDirectionOrCamera instanceof THREE.Vector3) {
      this.raycaster.set(rayOriginOrNdc, rayDirectionOrCamera.clone().normalize());
    } else {
      return { kind: 'none' };
    }

    // 1. VR Spatial HUD Action Buttons (highest priority when presenting in VR)
    if (this.isVRPresenting && this.host.vrHudButtons.length > 0) {
      const visibleButtons = this.host.vrHudButtons.filter((b) => b.visible);
      const hudHits = this.raycaster.intersectObjects(visibleButtons, false);
      if (hudHits.length > 0) {
        const action = hudHits[0].object.userData?.vrAction as VRHudAction | undefined;
        if (action) {
          return {
            kind: 'hudAction',
            action,
            point: hudHits[0].point.clone(),
            distance: hudHits[0].distance,
          };
        }
      }
    }

    // 2. 3D Anatomical Hotspot Targets
    if (this.host.isAnnotationsVisible()) {
      const activeHotspots = this.host.hotspotHitTargets.filter((t) => t.parent && t.parent.visible);
      const hotspotHits = this.raycaster.intersectObjects(activeHotspots, false);
      if (hotspotHits.length > 0) {
        const annotationId = hotspotHits[0].object.userData?.annotationId as string | undefined;
        if (annotationId) {
          return {
            kind: 'hotspot',
            annotationId,
            point: hotspotHits[0].point.clone(),
            distance: hotspotHits[0].distance,
          };
        }
      }
    }

    // 3. Existing Organ & Vessel / Clot Geometry
    const organTargets: THREE.Object3D[] = [];
    if (this.host.thoracicGroup.visible) organTargets.push(this.host.thoracicGroup);
    if (this.host.embolusMacroMesh.visible) organTargets.push(this.host.embolusMacroMesh);
    if (this.host.vesselCutawayGroup.visible) organTargets.push(this.host.vesselCutawayGroup);
    if (this.host.microscopicRoot.visible) organTargets.push(this.host.microscopicRoot);
    if (this.host.industrialCutaway.visible) organTargets.push(this.host.industrialCutaway);

    if (organTargets.length > 0) {
      const hits = this.raycaster.intersectObjects(organTargets, true);
      if (hits.length > 0) {
        const hit = hits[0];
        const structureId = this.inferExplorerStructureFromObject(hit.object);
        const nearestAnnId = this.findNearestVisibleHotspotId(hit.point, this.isVRPresenting ? 0.35 : 8.0);

        if (structureId) {
          return {
            kind: 'structure',
            structureId,
            annotationId: nearestAnnId ?? undefined,
            point: hit.point.clone(),
            distance: hit.distance,
          };
        }

        if (nearestAnnId) {
          return {
            kind: 'hotspot',
            annotationId: nearestAnnId,
            point: hit.point.clone(),
            distance: hit.distance,
          };
        }

        return {
          kind: 'specimen',
          point: hit.point.clone(),
          distance: hit.distance,
        };
      }
    }

    return { kind: 'none' };
  }

  /**
   * Hover handling shared across desktop pointer and VR ray pointers.
   */
  public handleHoverRay(
    rayOriginOrNdc: THREE.Vector3 | THREE.Vector2,
    rayDirectionOrCamera: THREE.Vector3 | THREE.Camera
  ): RayResolutionResult {
    const res = this.resolveRay(rayOriginOrNdc, rayDirectionOrCamera);
    if (res.kind === 'hotspot' && res.annotationId) {
      const ann = CLOT_ANNOTATIONS.find((a) => a.id === res.annotationId) || null;
      this.host.onHoverAnnotation(ann);
    } else {
      this.host.onHoverAnnotation(null);
    }
    return res;
  }

  /**
   * Click / quick-tap selection shared across Mouse and Touch on desktop.
   */
  public handleScreenTap(ndc: THREE.Vector2, camera: THREE.Camera, sourceType: InteractionSourceType): RayResolutionResult {
    const res = this.resolveRay(ndc, camera);
    this.commitSelection(res, sourceType);
    return res;
  }

  /**
   * Unified XR grab/pinch start (Controller Trigger or Hand Pinch `selectstart`).
   */
  public beginXRInteraction(
    sourceId: string,
    sourceType: InteractionSourceType,
    originWorld: THREE.Vector3,
    directionWorld: THREE.Vector3,
    orientationWorld: THREE.Quaternion
  ): RayResolutionResult {
    let resolution = this.resolveRay(originWorld, directionWorld);

    // Near-field direct hand pinch fallback: allow grabbing specimen when hand is within reach
    if (resolution.kind === 'none' && sourceType === 'hand') {
      this.host.sceneContainer.getWorldPosition(this.tempWorldPos);
      if (originWorld.distanceTo(this.tempWorldPos) < 0.72) {
        resolution = { kind: 'specimen', point: this.tempWorldPos.clone(), distance: originWorld.distanceTo(this.tempWorldPos) };
      }
    }

    this.activeGrab = {
      sourceId,
      sourceType,
      startedAt: performance.now(),
      lastOrigin: originWorld.clone(),
      lastQuaternion: orientationWorld.clone(),
      cumulativeTravel: 0,
      hitActionButton: resolution.kind === 'hudAction' ? (resolution.action ?? null) : null,
      hitHotspotId: resolution.annotationId ?? null,
      hitStructureId: resolution.structureId ?? null,
      hitSpecimen: resolution.kind === 'specimen' || resolution.kind === 'structure' || resolution.kind === 'hotspot',
    };

    const label = resolution.action
      ? `HUD:${resolution.action}`
      : resolution.annotationId || resolution.structureId || (resolution.kind === 'specimen' ? 'Specimen' : null);

    this.emitState(sourceType, false, label, `selectstart (${sourceType})`);
    return resolution;
  }

  /**
   * Per-frame XR grab/pinch update: manipulates specimen position & rotation smoothly.
   */
  public updateXRInteraction(
    sourceId: string,
    originWorld: THREE.Vector3,
    orientationWorld: THREE.Quaternion
  ): void {
    if (!this.activeGrab || this.activeGrab.sourceId !== sourceId) return;
    if (!this.activeGrab.hitSpecimen || this.activeGrab.hitActionButton) return;

    this.tempDeltaPos.subVectors(originWorld, this.activeGrab.lastOrigin);
    const stepDistance = this.tempDeltaPos.length();
    this.activeGrab.cumulativeTravel += stepDistance;

    // Require tiny threshold before applying manipulation so quick pinches select cleanly without jitter
    if (this.activeGrab.cumulativeTravel > 0.015) {
      // 1. Position manipulation (damped & bounded to seated reach comfort zone)
      this.host.sceneContainer.position.add(this.tempDeltaPos);
      this.clampSeatedSpecimenPosition();

      // 2. Rotation manipulation from wrist/controller delta quaternion
      this.tempInvLastQuat.copy(this.activeGrab.lastQuaternion).invert();
      this.tempDeltaQuat.multiplyQuaternions(orientationWorld, this.tempInvLastQuat);
      this.host.sceneContainer.quaternion.premultiply(this.tempDeltaQuat);
      this.host.sceneContainer.quaternion.normalize();

      this.emitState(
        this.activeGrab.sourceType,
        true,
        this.getCurrentLabelPayload().title
      );
    }

    this.activeGrab.lastOrigin.copy(originWorld);
    this.activeGrab.lastQuaternion.copy(orientationWorld);
  }

  /**
   * Unified XR grab/pinch release (`selectend` / `select`).
   * Triggers selection or HUD action if it was a pinch/trigger tap rather than a long drag.
   */
  public endXRInteraction(
    sourceId: string,
    fallbackRayOrigin?: THREE.Vector3,
    fallbackRayDir?: THREE.Vector3
  ): void {
    if (!this.activeGrab || this.activeGrab.sourceId !== sourceId) {
      // Handle standalone `select` event if `selectstart` was missed
      if (fallbackRayOrigin && fallbackRayDir) {
        const res = this.resolveRay(fallbackRayOrigin, fallbackRayDir);
        this.commitSelection(res, 'hand');
      }
      return;
    }

    const grab = this.activeGrab;
    this.activeGrab = null;

    const elapsedMs = performance.now() - grab.startedAt;
    const isTapPinch = grab.cumulativeTravel < 0.05 && elapsedMs < 650;

    if (grab.hitActionButton) {
      this.executeHudAction(grab.hitActionButton, grab.sourceType);
      return;
    }

    if (isTapPinch) {
      if (grab.hitHotspotId) {
        this.commitSelection({ kind: 'hotspot', annotationId: grab.hitHotspotId }, grab.sourceType);
      } else if (grab.hitStructureId) {
        this.commitSelection({ kind: 'structure', structureId: grab.hitStructureId }, grab.sourceType);
      } else if (grab.hitSpecimen) {
        this.cycleLabel(1, grab.sourceType);
      }
    } else {
      this.emitState(grab.sourceType, false, this.getCurrentLabelPayload().title, `Manipulated specimen (${grab.sourceType})`);
    }
  }

  /**
   * Controller thumbstick fallback for seated rotation & distance adjustment in VR.
   */
  public applyThumbstickManipulation(axisX: number, axisY: number, delta: number, isDistanceStick: boolean): void {
    const deadzone = 0.18;
    const x = Math.abs(axisX) > deadzone ? axisX : 0;
    const y = Math.abs(axisY) > deadzone ? axisY : 0;
    if (x === 0 && y === 0) return;

    if (isDistanceStick) {
      // Adjust Z distance and Y height in seated zone
      this.host.sceneContainer.position.z += y * 0.65 * delta;
      this.host.sceneContainer.position.x += x * 0.45 * delta;
      this.clampSeatedSpecimenPosition();
    } else {
      // Yaw & Pitch specimen smoothly around local axes
      this.tempAxisY.set(0, 1, 0);
      this.tempAxisX.set(1, 0, 0);
      this.tempQuatY.setFromAxisAngle(this.tempAxisY, -x * 1.9 * delta);
      this.tempQuatX.setFromAxisAngle(this.tempAxisX, -y * 1.4 * delta);
      this.host.sceneContainer.quaternion.premultiply(this.tempQuatY).premultiply(this.tempQuatX).normalize();
    }
  }

  /**
   * Shared desktop mouse/touch manipulation of specimen rotation & position
   * when desktop user switches into Manipulate mode or uses Shift+Drag.
   */
  public applyDesktopManipulationDelta(
    deltaX: number,
    deltaY: number,
    mode: 'rotate' | 'translate',
    camera: THREE.Camera
  ): void {
    if (mode === 'rotate') {
      this.tempAxisY.set(0, 1, 0);
      this.tempAxisX.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
      this.tempQuatY.setFromAxisAngle(this.tempAxisY, deltaX * 0.0075);
      this.tempQuatX.setFromAxisAngle(this.tempAxisX, deltaY * 0.0075);
      this.host.sceneContainer.quaternion.premultiply(this.tempQuatY).premultiply(this.tempQuatX).normalize();
      this.emitState('mouse', true, this.getCurrentLabelPayload().title);
    } else {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      this.host.sceneContainer.position.addScaledVector(right, deltaX * 0.015);
      this.host.sceneContainer.position.addScaledVector(up, -deltaY * 0.015);
      this.emitState('mouse', true, this.getCurrentLabelPayload().title);
    }
  }

  public executeHudAction(action: VRHudAction, sourceType: InteractionSourceType = 'controller'): void {
    switch (action) {
      case 'nextLabel':
        this.cycleLabel(1, sourceType);
        break;
      case 'prevLabel':
        this.cycleLabel(-1, sourceType);
        break;
      case 'cycleScale':
        this.host.onCycleScale();
        this.emitState(sourceType, false, this.getCurrentLabelPayload().title, 'Cycled anatomical scale');
        break;
      case 'resetScene':
        this.host.onResetScene();
        this.emitState(sourceType, false, this.getCurrentLabelPayload().title, 'Scene reset to initial placement');
        break;
      case 'exitVR':
        this.emitState(sourceType, false, this.getCurrentLabelPayload().title, 'Exiting WebXR session');
        void this.host.onExitVR();
        break;
    }
  }

  public cycleLabel(direction: 1 | -1, sourceType: InteractionSourceType = 'controller'): void {
    const scale = this.host.getCurrentScale();
    const candidates = CLOT_ANNOTATIONS.filter((a) => {
      if (scale === 'microscopic') return a.scale === 'microscopic';
      if (scale === 'clot' || scale === 'vessel') return a.scale === 'clot' || a.scale === 'vessel';
      return true;
    });

    if (scale === 'thoracic') {
      const structureOrder: ExplorerAnatomyId[] = ['deepVeins', 'heart', 'pulmonaryArtery', 'lungs'];
      const currentStruct = this.host.getActiveStructureId();
      const idx = currentStruct ? structureOrder.indexOf(currentStruct) : -1;
      const nextIdx = (idx + direction + structureOrder.length) % structureOrder.length;
      const nextId = structureOrder[nextIdx];
      this.host.onSelectStructure(nextId, false);
      this.host.onSelectAnnotation(null);
      this.emitState(sourceType, false, EXPLORER_ANATOMY_STRUCTURES[nextId].label, `Inspected ${EXPLORER_ANATOMY_STRUCTURES[nextId].label}`);
      return;
    }

    if (candidates.length === 0) return;
    const activeId = this.host.getActiveAnnotationId();
    const idx = activeId ? candidates.findIndex((c) => c.id === activeId) : -1;
    const nextIdx = (idx + direction + candidates.length) % candidates.length;
    const nextAnn = candidates[nextIdx];
    this.host.onSelectAnnotation(nextAnn.id);
    this.emitState(sourceType, false, nextAnn.title, `Inspected ${nextAnn.title}`);
  }

  /**
   * Builds a normalized label card payload from existing annotation / anatomy data.
   */
  public getCurrentLabelPayload(): AnatomicalLabelPayload {
    const activeAnnId = this.host.getActiveAnnotationId();
    if (activeAnnId) {
      const ann = CLOT_ANNOTATIONS.find((a) => a.id === activeAnnId);
      if (ann) {
        return {
          id: ann.id,
          kind: 'annotation',
          title: ann.title,
          subtitle: ann.badge,
          badge: ann.category.toUpperCase(),
          metricValue: ann.metricValue,
          metricLabel: ann.metricLabel,
          summary: ann.summary,
          scaleLabel: ann.scale === 'microscopic' ? '50 µm Fibrin Matrix' : '4–8 mm Vascular Thrombus',
          accentHex: ann.colorHex || '#e6b65c',
          scale: ann.scale === 'both' ? 'clot' : ann.scale,
        };
      }
    }

    const activeStructId = this.host.getActiveStructureId();
    if (activeStructId && EXPLORER_ANATOMY_STRUCTURES[activeStructId]) {
      const struct = EXPLORER_ANATOMY_STRUCTURES[activeStructId];
      return {
        id: struct.id,
        kind: 'structure',
        title: struct.label,
        subtitle: struct.sublabel,
        badge: struct.badge,
        metricValue: struct.clinicalRole,
        summary: struct.prewrittenExplanation,
        scaleLabel: '30 cm Thoracic & PE System',
        accentHex: '#38bdf8',
        structureId: struct.id,
        scale: 'thoracic',
      };
    }

    return {
      id: 'pulmonary-embolism-specimen',
      kind: 'specimen',
      title: 'Pulmonary Embolism Specimen',
      subtitle: 'Thoracic Vessels, Heart, Lungs & Thrombus Matrix',
      badge: 'ILLUSTRATIVE 3D MODEL',
      metricValue: 'Pinch or Point',
      summary: 'Pinch or trigger-click a structure or hotspot to inspect its anatomical label; pinch and move to rotate or reposition.',
      scaleLabel: this.host.getCurrentScale(),
      accentHex: '#e6b65c',
      scale: this.host.getCurrentScale(),
    };
  }

  private commitSelection(res: RayResolutionResult, sourceType: InteractionSourceType): void {
    if (res.kind === 'hudAction' && res.action) {
      this.executeHudAction(res.action, sourceType);
      return;
    }

    if (res.kind === 'hotspot' && res.annotationId) {
      const ann = CLOT_ANNOTATIONS.find((a) => a.id === res.annotationId);
      this.host.onSelectAnnotation(res.annotationId);
      this.emitState(sourceType, false, ann?.title || res.annotationId, `Selected hotspot via ${sourceType}`);
      return;
    }

    if (res.kind === 'structure' && res.structureId) {
      this.host.onSelectStructure(res.structureId, false);
      if (res.annotationId) {
        this.host.onSelectAnnotation(res.annotationId);
      }
      const struct = EXPLORER_ANATOMY_STRUCTURES[res.structureId];
      this.emitState(sourceType, false, struct?.label || res.structureId, `Selected ${struct?.label || res.structureId} via ${sourceType}`);
      return;
    }

    if (res.kind === 'none') {
      if (this.host.getActiveAnnotationId() !== null) {
        this.host.onSelectAnnotation(null);
      }
      this.emitState(sourceType, false, null);
    }
  }

  private inferExplorerStructureFromObject(obj: THREE.Object3D): ExplorerAnatomyId | null {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      const name = curr.name;
      if (name === 'DeepVeinsGroup' || name === 'InferiorVenaCava' || name === 'DVTOriginSite') {
        return 'deepVeins';
      }
      if (name === 'HeartAnatomyGroup' || name === 'HeartAnatomy' || name === 'RightVentricleMesh') {
        return 'heart';
      }
      if (
        name === 'PulmonaryArteryGroup' ||
        name === 'PulmonaryTrunkMesh' ||
        name === 'RightPulmonaryArteryMesh' ||
        name === 'RightLowerLobeArteryMesh' ||
        name === 'LeftPulmonaryArteryMesh' ||
        name === 'ThoracicEmbolusSite' ||
        name === 'TravelingClotEmbolus' ||
        name === 'VesselCutawayGroup' ||
        name === 'EmbolusMacroMesh'
      ) {
        return 'pulmonaryArtery';
      }
      if (name === 'LungsGroup' || name === 'RightLung' || name === 'LeftLung') {
        return 'lungs';
      }
      curr = curr.parent;
    }
    return null;
  }

  private findNearestVisibleHotspotId(worldHitPoint: THREE.Vector3, maxDistance: number): string | null {
    let closestId: string | null = null;
    let closestDist = Infinity;
    const tempVec = new THREE.Vector3();

    for (const target of this.host.hotspotHitTargets) {
      const group = target.parent;
      if (!group || !group.visible) continue;
      group.getWorldPosition(tempVec);
      const dist = tempVec.distanceTo(worldHitPoint);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = target.userData?.annotationId || null;
      }
    }

    return closestDist <= maxDistance ? closestId : null;
  }

  private clampSeatedSpecimenPosition(): void {
    const minX = this.seatedOrigin.x - 0.9;
    const maxX = this.seatedOrigin.x + 0.9;
    const minY = this.seatedOrigin.y - 0.55;
    const maxY = this.seatedOrigin.y + 0.65;
    const minZ = this.seatedOrigin.z - 1.2;
    const maxZ = this.seatedOrigin.z + 0.55;

    this.host.sceneContainer.position.x = THREE.MathUtils.clamp(this.host.sceneContainer.position.x, minX, maxX);
    this.host.sceneContainer.position.y = THREE.MathUtils.clamp(this.host.sceneContainer.position.y, minY, maxY);
    this.host.sceneContainer.position.z = THREE.MathUtils.clamp(this.host.sceneContainer.position.z, minZ, maxZ);
  }

  private emitState(
    activeSource: InteractionSourceType | null,
    isManipulating: boolean,
    selectedLabel: string | null = this.getCurrentLabelPayload().title,
    eventMessage?: string
  ): void {
    this.host.onAdapterStateChange?.({
      activeSource,
      isManipulating,
      selectedLabel,
      eventMessage,
    });
  }
}
