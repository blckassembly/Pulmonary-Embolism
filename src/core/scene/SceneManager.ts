/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LayerVisibility, ScaleLevel, ClotAnnotation, AnnotationScreenPosition, IndustrialCalloutPoint, ExplorerAnatomyId } from '../../types/biomedical.ts';
import { DesktopInteractionMode, XRDiagnosticsState } from '../../types/webxr.ts';
import { CLOT_ANNOTATIONS } from '../../data/clotAnnotations.ts';
import { createEmbolusMacroMesh, createVesselCutawayGroup, HemodynamicParticles } from '../procedural/vesselGeometry.ts';
import { createIndustrialCutawayGroup, IndustrialCutawayGroup } from '../procedural/industrialCutaway.ts';
import { MicroscopicChamber } from './MicroscopicChamber.ts';
import { AnatomicalInteractionAdapter } from '../interaction/AnatomicalInteractionAdapter.ts';
import { WebXRControllerRig } from '../xr/WebXRControllerRig.ts';
import { AnatomicalHoverLabelInfo, SceneHoverLabelState, resolveHoverLabelInfo } from '../../data/anatomicalHoverLabels.ts';

export interface SceneManagerCallbacks {
  onHoverObject?: (name: string | null) => void;
  onHoverStructureLabel?: (label: SceneHoverLabelState | null) => void;
  onMeasurePoint?: (point: [number, number, number]) => void;
  onProgressChange?: (progress: number) => void;
  onScaleChange?: (scale: ScaleLevel) => void;
  onZoomChange?: (zoom: number) => void;
  onSelectAnnotation?: (annotation: ClotAnnotation | null) => void;
  onSelectStructureFromScene?: (structureId: ExplorerAnatomyId) => void;
  onHoverAnnotation?: (annotation: ClotAnnotation | null) => void;
  onAnnotationPositionsUpdate?: (positions: Record<string, AnnotationScreenPosition>) => void;
  onClotPathProgressChange?: (progress: number) => void;
  onXRDiagnosticsChange?: (diagnostics: XRDiagnosticsState) => void;
  onXRSessionStateChange?: (isPresenting: boolean) => void;
  onWebGLContextChange?: (lost: boolean) => void;
}

export type SceneTheme = 'light' | 'dark';

export class SceneManager {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Multi-scale scene roots
  public microscopicChamber: MicroscopicChamber;
  public vesselCutawayGroup: THREE.Group;
  public embolusMacroMesh: THREE.Mesh;
  public thoracicGroup: THREE.Group = new THREE.Group();
  public flowParticles: HemodynamicParticles;
  public industrialCutaway: IndustrialCutawayGroup;
  public industrialMode: 'airway' | 'vascular' = 'vascular';

  // Scene container group for 180° upside-down rotation
  public sceneContainer = new THREE.Group();

  // Immersive VR Player Rig (parents camera + XR controllers/hands/HUD for locomotion)
  public vrPlayerRig = new THREE.Group();

  // Interactive tools
  public clippingPlane: THREE.Plane;
  private currentClipAxis: 'none' | 'x' | 'y' | 'z' = 'none';

  // Camera targets & unified zoom multiplier [0.25x .. 5.0x]
  private targetLookAt = new THREE.Vector3(2.0, 0, 0);
  private currentLookAt = new THREE.Vector3(2.0, 0, 0);
  private currentScale: ScaleLevel = 'vessel';
  public targetZoomMultiplier = 1.0;
  public currentZoomMultiplier = 1.0;
  private activePinchDistance: number | null = null;

  // VR Teleportation Locomotion state & reusable math helpers
  private teleportRaycaster = new THREE.Raycaster();
  private teleportStartPos = new THREE.Vector3();
  private teleportTargetPos = new THREE.Vector3();
  private teleportTransitionProgress = 1.0;
  private locomotionCurrentLabel: string | null = null;
  private tempTeleportPos = new THREE.Vector3();
  private tempTeleportNext = new THREE.Vector3();
  private tempTeleportVel = new THREE.Vector3();
  private tempTeleportDir = new THREE.Vector3();
  private tempFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tempFloorHit = new THREE.Vector3();
  private tempHmdWorldPos = new THREE.Vector3();
  private tempCameraOffset = new THREE.Vector3();
  private tempParallaxOffset = new THREE.Vector3();

  // Continuous Hero Slider Progress [0.0 = deep microscopic, 1.0 = thoracic organ]
  private progress = 0.0;

  // Flow speed and drug infusion
  public flowSpeedScale = 1.0;
  public isDrugInfused = false;

  // Orbit / Interaction state
  private isPointerDown = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  private spherical = new THREE.Spherical(13.5, Math.PI / 2.2, 0);

  // Parallax state
  private mouseParallaxTarget = new THREE.Vector2(0, 0);
  private mouseParallaxCurrent = new THREE.Vector2(0, 0);

  // Upside down state
  public isUpsideDown = false;
  private currentFlipAngle = 0;
  private targetFlipAngle = 0;

  // Animation & timing
  private clock = new THREE.Clock();
  private isSoftwareGl = false;
  private callbacks: SceneManagerCallbacks = {};
  public container: HTMLDivElement;

  // Shared Anatomical Interaction Adapter & WebXR Rig
  public interactionAdapter!: AnatomicalInteractionAdapter;
  public webXR!: WebXRControllerRig;
  private desktopInteractionMode: DesktopInteractionMode = 'orbit';
  private pointerSourceType: 'mouse' | 'touch' = 'mouse';
  private cleanupPointerListeners?: () => void;
  private boundOnContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onWebGLContextChange?.(true);
  };
  private boundOnContextRestored = () => {
    this.callbacks.onWebGLContextChange?.(false);
  };

  // Annotations System
  public annotationsGroup = new THREE.Group();
  private hotspotMeshes: Map<string, THREE.Group> = new Map();
  private hotspotHitTargets: THREE.Object3D[] = [];
  private activeAnnotationId: string | null = null;
  private hoveredAnnotationId: string | null = null;
  private layersVisibility: LayerVisibility = {
    thoracicLungs: true,
    pulmonaryArteries: true,
    tracheaAirway: true,
    vesselWall: true,
    thrombusBody: true,
    fibrinMesh: true,
    redBloodCells: true,
    platelets: true,
    flowStreamlines: true,
    velocityColorMap: true,
    annotations: true,
  };
  private raycaster = new THREE.Raycaster();
  private mouseVec2 = new THREE.Vector2();
  private pointerDownTime = 0;
  private pointerDownPos = { x: 0, y: 0 };

  // Theme
  public currentTheme: SceneTheme = 'light';
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;

  // Embolism Explorer: Clot Path Animation & Structure Highlighting
  public isClotPathPlaying = false;
  public clotPathProgress = 0.0;
  public clotPathSpeed = 0.08; // smooth travel duration ~12.5 seconds
  public clotPathCurve!: THREE.CatmullRomCurve3;
  public travelingClotMesh: THREE.Object3D | null = null;
  public activeExplorerStructure: ExplorerAnatomyId | null = null;
  public structureHighlightBeacon: THREE.Group | null = null;

  // Hoverable 3D Anatomical Label & Segment Highlight State
  private hoveredLabelInfo: AnatomicalHoverLabelInfo | null = null;
  private hoveredHighlightObject: THREE.Object3D | null = null;
  private hoveredAnchorLocal = new THREE.Vector3();
  private hoveredSavedEmissives: Array<{
    material: THREE.MeshStandardMaterial;
    emissiveHex: number;
    emissiveIntensity: number;
  }> = [];
  private lastEmittedHoverKey = '';
  private tempHoverWorld = new THREE.Vector3();
  private tempHoverProj = new THREE.Vector3();

  constructor(container: HTMLDivElement, callbacks: SceneManagerCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.xr.enabled = true;

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.addEventListener('webglcontextlost', this.boundOnContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.boundOnContextRestored);

    // 3. Scene, VR Player Rig & Camera setup
    this.scene = new THREE.Scene();
    this.scene.add(this.sceneContainer);
    this.vrPlayerRig.name = 'VRPlayerLocomotionRig';
    this.scene.add(this.vrPlayerRig);

    this.camera = new THREE.PerspectiveCamera(
      42, // Wide, cinematic 27-inch perspective
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );
    this.camera.position.set(0, 0, 13.5);
    this.vrPlayerRig.add(this.camera);

    // 4. Studio Environment Lighting & Default Light Gray Background
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-point lighting rig
    this.keyLight = new THREE.DirectionalLight(0xfff6ea, 2.6);
    this.keyLight.position.set(16, 22, 18);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.scene.add(this.keyLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcfd4dc, 1.4);
    this.scene.add(this.hemiLight);

    this.rimLight = new THREE.DirectionalLight(0xe6b65c, 2.2);
    this.rimLight.position.set(-18, -12, -14);
    this.scene.add(this.rimLight);

    // Set default light gray theme
    this.setTheme('light');

    // 5. Build Sub-Scenes into sceneContainer
    this.microscopicChamber = new MicroscopicChamber();
    this.sceneContainer.add(this.microscopicChamber.root);

    this.vesselCutawayGroup = createVesselCutawayGroup();
    this.vesselCutawayGroup.visible = false;
    this.sceneContainer.add(this.vesselCutawayGroup);

    this.embolusMacroMesh = createEmbolusMacroMesh();
    this.embolusMacroMesh.visible = false;
    this.sceneContainer.add(this.embolusMacroMesh);

    this.flowParticles = new HemodynamicParticles();
    this.flowParticles.mesh.visible = true;
    this.sceneContainer.add(this.flowParticles.mesh);

    // Thoracic group intentionally kept empty and hidden — MVP focuses strictly on Artery, Thrombus & Fibrin
    this.thoracicGroup.visible = false;
    this.clotPathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, -1.2, 0),
    ]);
    this.travelingClotMesh = null;
    this.initStructureHighlightBeacon();

    // Isolated Vascular CAD Cutaway scene rig
    this.industrialCutaway = createIndustrialCutawayGroup({ mode: this.industrialMode });
    this.industrialCutaway.visible = false;
    this.sceneContainer.add(this.industrialCutaway);

    // Initialize 3D Clot Annotation Hotspots
    this.initAnnotationHotspots();

    // 6. Clipping plane
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    // 7. Shared Anatomical Interaction Adapter & WebXR Rig
    this.interactionAdapter = new AnatomicalInteractionAdapter({
      sceneContainer: this.sceneContainer,
      annotationsGroup: this.annotationsGroup,
      hotspotHitTargets: this.hotspotHitTargets,
      thoracicGroup: this.thoracicGroup,
      vesselCutawayGroup: this.vesselCutawayGroup,
      embolusMacroMesh: this.embolusMacroMesh,
      microscopicRoot: this.microscopicChamber.root,
      industrialCutaway: this.industrialCutaway,
      vrHudButtons: [],
      isAnnotationsVisible: () => this.layersVisibility.annotations,
      getCurrentScale: () => this.currentScale,
      getActiveAnnotationId: () => this.activeAnnotationId,
      getActiveStructureId: () => this.activeExplorerStructure,
      onSelectAnnotation: (id) => {
        this.selectAnnotation(id);
        this.webXR?.refreshSpatialLabel(true);
      },
      onSelectStructure: (id, moveCamera) => {
        const prevScale = this.currentScale;
        this.highlightExplorerStructure(id, moveCamera);
        this.callbacks.onSelectStructureFromScene?.(id);
        if (this.renderer.xr.isPresenting && prevScale !== this.currentScale) {
          this.webXR?.recenterSeatedSpecimen();
        } else {
          this.webXR?.refreshSpatialLabel(true);
        }
      },
      onHoverAnnotation: (ann) => {
        const nextId = ann ? ann.id : null;
        if (this.hoveredAnnotationId !== nextId) {
          this.hoveredAnnotationId = nextId;
          this.callbacks.onHoverAnnotation?.(ann);
        }
      },
      onCycleScale: () => this.cycleExplorerScale(),
      onZoomDelta: (factor) => this.setZoomMultiplier(this.targetZoomMultiplier * factor),
      onStepInsideThoracic: () => this.teleportIntoThoracicAnatomy(),
      onResetScene: () => this.resetScene(),
      onExitVR: () => this.webXR.exitVR(),
    });

    this.webXR = new WebXRControllerRig({
      renderer: this.renderer,
      scene: this.scene,
      rigParent: this.vrPlayerRig,
      sceneContainer: this.sceneContainer,
      adapter: this.interactionAdapter,
      getCurrentScale: () => this.currentScale,
      getZoomMultiplier: () => this.targetZoomMultiplier,
      onZoomDelta: (factor) => this.setZoomMultiplier(this.targetZoomMultiplier * factor),
      computeTeleportArc: (origin, dir) => this.computeVRTeleportArc(origin, dir),
      onTeleportExecute: (point, kind, label) => this.teleportVRToWorldPoint(point, kind, label),
      onSnapTurn: (angle) => this.rotateVRRigYaw(angle),
      onResetLocomotion: () => this.resetVRLocomotion(),
      getLocomotionState: () => this.getLocomotionState(),
      onDiagnosticsChange: (diag) => this.callbacks.onXRDiagnosticsChange?.(diag),
      onSessionStateChange: (presenting) => this.callbacks.onXRSessionStateChange?.(presenting),
    });

    // Expose VR HUD buttons directly to the shared adapter
    (this.interactionAdapter as unknown as { host: { vrHudButtons: THREE.Object3D[] } }).host.vrHudButtons =
      this.webXR.getHudInteractiveButtons();

    // 8. Interaction & Parallax Listeners
    this.setupPointerControls(container);

    // 9. Start single unified XR-compatible animation loop (no competing RAF loop)
    this.tick = this.tick.bind(this);
    this.renderer.setAnimationLoop(this.tick);
  }

  private initAnnotationHotspots(): void {
    this.annotationsGroup.name = 'AnnotationsHotspotGroup';
    this.sceneContainer.add(this.annotationsGroup);

    for (const ann of CLOT_ANNOTATIONS) {
      const group = new THREE.Group();
      group.name = `Hotspot_${ann.id}`;
      group.position.set(...ann.position);
      group.userData = { annotationId: ann.id, scale: ann.scale };

      const color = new THREE.Color(ann.colorHex || '#e6b65c');

      // 1. Center pulsing core
      const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const coreMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.name = 'HotspotCore';
      group.add(coreMesh);

      // 2. Animated breathing beacon ring
      const ringGeo = new THREE.RingGeometry(0.20, 0.28, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = 'HotspotRing';
      group.add(ringMesh);

      // 3. Subtle outer halo disc
      const haloGeo = new THREE.CircleGeometry(0.42, 24);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.name = 'HotspotHalo';
      group.add(haloMesh);

      // 4. Hit target (invisible larger sphere for easy clicking/tapping)
      const hitGeo = new THREE.SphereGeometry(0.65, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.name = `HitTarget_${ann.id}`;
      hitMesh.userData = { isHotspot: true, annotationId: ann.id };
      group.add(hitMesh);

      this.hotspotHitTargets.push(hitMesh);
      this.hotspotMeshes.set(ann.id, group);
      this.annotationsGroup.add(group);
    }
  }

  private initStructureHighlightBeacon(): void {
    // Beacon removed per user request for a clean view without visual artifacts
    this.structureHighlightBeacon = null;
  }

  public highlightExplorerStructure(structureId: ExplorerAnatomyId, moveCamera = true): void {
    this.activeExplorerStructure = structureId;

    // MVP focuses strictly on Artery, Thrombus, and Fibrin
    if (moveCamera && this.currentScale === 'industrialCutaway') {
      this.setScale('vessel');
      this.callbacks.onScaleChange?.('vessel');
      this.callbacks.onProgressChange?.(this.progress);
    }

    if (moveCamera) {
      this.targetLookAt.set(2.4, -0.6, 0.0);
      this.spherical.set(28.0, Math.PI / 2.15, -0.15);
    }
  }

  public setClotPathProgress(progress: number): void {
    this.clotPathProgress = Math.min(Math.max(progress, 0), 1);
    this.updateClotPosition();
    this.callbacks.onClotPathProgressChange?.(this.clotPathProgress);
  }

  public playClotPathAnimation(): void {
    if (this.clotPathProgress >= 0.99) {
      this.clotPathProgress = 0.0;
    }
    this.isClotPathPlaying = true;
  }

  public pauseClotPathAnimation(): void {
    this.isClotPathPlaying = false;
  }

  public resetClotPathAnimation(): void {
    this.isClotPathPlaying = false;
    this.setClotPathProgress(0.0);
  }

  public setClotPathSpeed(speed: number): void {
    this.clotPathSpeed = Math.max(speed, 0.01);
  }

  private updateClotPosition(): void {
    if (!this.travelingClotMesh || !this.clotPathCurve) return;
    const pt = this.clotPathCurve.getPointAt(this.clotPathProgress);
    this.travelingClotMesh.position.copy(pt);

    // Tangent orientation
    const tangent = this.clotPathCurve.getTangentAt(this.clotPathProgress);
    this.travelingClotMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

    // Dynamic scale as it impacts and expands
    const scale = 1.0 + 0.35 * Math.sin(this.clotPathProgress * Math.PI);
    this.travelingClotMesh.scale.set(scale, scale * 1.35, scale);
  }

  public setTheme(theme: SceneTheme): void {
    this.currentTheme = theme;

    // Keep transparent passthrough in immersive-ar or pitch-black backdrop in isolated CAD cutaway
    const isARPassthrough =
      this.renderer.xr.isPresenting && this.webXR?.getDiagnostics().sessionMode === 'immersive-ar';
    if (isARPassthrough || this.currentScale === 'industrialCutaway') {
      return;
    }

    if (theme === 'light') {
      // Warm editorial museum studio backdrop (#eeece2) harmonizing with #F5D547 & #141514 UI
      this.scene.background = new THREE.Color(0xeeece2);
      this.scene.fog = new THREE.FogExp2(0xeeece2, 0.0045);
      this.renderer.setClearColor(0xeeece2, 1.0);
      this.renderer.toneMappingExposure = 1.08;
      this.hemiLight.color.setHex(0xfffdf5);
      this.hemiLight.groundColor.setHex(0xd6d1c2);
      this.hemiLight.intensity = 1.5;
      this.keyLight.intensity = 2.4;
      this.rimLight.intensity = 1.8;
    } else {
      // Deep carbon charcoal (#0e0f0d)
      this.scene.background = new THREE.Color(0x0e0f0d);
      this.scene.fog = new THREE.FogExp2(0x0e0f0d, 0.0065);
      this.renderer.setClearColor(0x0e0f0d, 1.0);
      this.renderer.toneMappingExposure = 1.15;
      this.hemiLight.color.setHex(0x88a4c8);
      this.hemiLight.groundColor.setHex(0x1b1c19);
      this.hemiLight.intensity = 1.25;
      this.keyLight.intensity = 2.6;
      this.rimLight.intensity = 2.2;
    }
  }

  public toggleUpsideDown(): void {
    this.isUpsideDown = !this.isUpsideDown;
    this.targetFlipAngle = this.isUpsideDown ? Math.PI : 0;
  }

  public setDesktopInteractionMode(mode: DesktopInteractionMode): void {
    this.desktopInteractionMode = mode;
  }

  public setZoomMultiplier(zoom: number): void {
    const clamped = Math.round(Math.max(0.25, Math.min(5.0, zoom)) * 100) / 100;
    if (Math.abs(clamped - this.targetZoomMultiplier) < 0.001) return;
    this.targetZoomMultiplier = clamped;
    this.callbacks.onZoomChange?.(clamped);
  }

  public getZoomMultiplier(): number {
    return this.targetZoomMultiplier;
  }

  public zoomIn(factor = 1.25): void {
    this.setZoomMultiplier(this.targetZoomMultiplier * factor);
  }

  public zoomOut(factor = 1.25): void {
    this.setZoomMultiplier(this.targetZoomMultiplier / factor);
  }

  public resetZoom(): void {
    this.setZoomMultiplier(1.0);
  }

  /**
   * Computes a ballistic teleportation arc for immersive VR locomotion across both
   * thoracic/vascular anatomical geometry and the surrounding walkable floor plane.
   */
  public computeVRTeleportArc(
    originWorld: THREE.Vector3,
    directionWorld: THREE.Vector3
  ): {
    points: THREE.Vector3[];
    hitPoint: THREE.Vector3 | null;
    hitNormal: THREE.Vector3 | null;
    hitLabel: string | null;
    hitKind: 'anatomy' | 'floor' | 'none';
    valid: boolean;
  } {
    const points: THREE.Vector3[] = [originWorld.clone()];
    const speed = 6.2;
    const gravity = -7.6;
    const dt = 0.042;
    const maxSteps = 28;

    this.tempTeleportPos.copy(originWorld);
    this.tempTeleportVel.copy(directionWorld).normalize().multiplyScalar(speed);

    const floorY = Math.max(-1.4, this.sceneContainer.position.y - 1.05);
    this.tempFloorPlane.set(new THREE.Vector3(0, 1, 0), -floorY);

    const anatomyTargets: THREE.Object3D[] = [];
    if (this.vesselCutawayGroup.visible) anatomyTargets.push(this.vesselCutawayGroup);
    if (this.embolusMacroMesh.visible) anatomyTargets.push(this.embolusMacroMesh);
    if (this.microscopicChamber.root.visible) anatomyTargets.push(this.microscopicChamber.root);
    if (this.industrialCutaway.visible) anatomyTargets.push(this.industrialCutaway);

    for (let step = 0; step < maxSteps; step++) {
      this.tempTeleportVel.y += gravity * dt;
      this.tempTeleportNext.copy(this.tempTeleportPos).addScaledVector(this.tempTeleportVel, dt);

      this.tempTeleportDir.subVectors(this.tempTeleportNext, this.tempTeleportPos);
      const segLen = this.tempTeleportDir.length();
      if (segLen > 0.0001) {
        this.tempTeleportDir.divideScalar(segLen);

        // 1. Check arterial, thrombus & fibrin intersections along this parabolic segment
        if (anatomyTargets.length > 0) {
          this.teleportRaycaster.set(this.tempTeleportPos, this.tempTeleportDir);
          this.teleportRaycaster.near = 0;
          this.teleportRaycaster.far = segLen;

          const hits = this.teleportRaycaster.intersectObjects(anatomyTargets, true);
          const chosenHit = hits.find((h) => h.object.visible) || null;

          if (chosenHit) {
            const match = resolveHoverLabelInfo(chosenHit.object);
            const hitNormal = chosenHit.face
              ? chosenHit.face.normal
                  .clone()
                  .transformDirection(chosenHit.object.matrixWorld)
                  .normalize()
              : new THREE.Vector3(0, 1, 0);
            points.push(chosenHit.point.clone());
            return {
              points,
              hitPoint: chosenHit.point.clone(),
              hitNormal,
              hitLabel: match?.info.clinicalName || chosenHit.object.name || 'Arterial Lumen',
              hitKind: 'anatomy',
              valid: true,
            };
          }
        }

        // 2. Check intersection with walkable floor plane
        if (this.tempTeleportPos.y >= floorY && this.tempTeleportNext.y <= floorY) {
          const lineSeg = new THREE.Line3(this.tempTeleportPos, this.tempTeleportNext);
          if (this.tempFloorPlane.intersectLine(lineSeg, this.tempFloorHit)) {
            const dx = this.tempFloorHit.x - this.sceneContainer.position.x;
            const dz = this.tempFloorHit.z - this.sceneContainer.position.z;
            const distFromSpecimen = Math.hypot(dx, dz);
            const valid = distFromSpecimen <= 7.5;
            points.push(this.tempFloorHit.clone());
            return {
              points,
              hitPoint: this.tempFloorHit.clone(),
              hitNormal: new THREE.Vector3(0, 1, 0),
              hitLabel: valid ? 'Vascular Inspection Floor' : null,
              hitKind: valid ? 'floor' : 'none',
              valid,
            };
          }
        }
      }

      points.push(this.tempTeleportNext.clone());
      this.tempTeleportPos.copy(this.tempTeleportNext);
    }

    return {
      points,
      hitPoint: null,
      hitNormal: null,
      hitLabel: null,
      hitKind: 'none',
      valid: false,
    };
  }

  /**
   * Executes a smooth comfort-interpolated VR teleport to a floor coordinate or
   * directly into/onto a targeted thoracic anatomical structure.
   */
  public teleportVRToWorldPoint(
    worldPoint: THREE.Vector3,
    hitKind: 'anatomy' | 'floor',
    hitLabel: string | null = null
  ): void {
    const xrCam = this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
    xrCam.getWorldPosition(this.tempHmdWorldPos);
    const hmdOffsetX = this.tempHmdWorldPos.x - this.vrPlayerRig.position.x;
    const hmdOffsetY = Math.max(0.4, this.tempHmdWorldPos.y - this.vrPlayerRig.position.y);
    const hmdOffsetZ = this.tempHmdWorldPos.z - this.vrPlayerRig.position.z;

    let targetX = worldPoint.x - hmdOffsetX;
    let targetZ = worldPoint.z - hmdOffsetZ;
    let targetY = worldPoint.y;

    if (hitKind === 'anatomy') {
      // Elevate/align viewer head to the targeted vessel or pulmonary chamber for walkthrough inspection
      targetY = worldPoint.y - hmdOffsetY;
      if (this.targetZoomMultiplier < 2.0) {
        this.setZoomMultiplier(2.25);
      }
    }

    targetX = THREE.MathUtils.clamp(targetX, -7.5, 7.5);
    targetY = THREE.MathUtils.clamp(targetY, -1.5, 4.5);
    targetZ = THREE.MathUtils.clamp(targetZ, -7.5, 7.5);

    this.teleportStartPos.copy(this.vrPlayerRig.position);
    this.teleportTargetPos.set(targetX, targetY, targetZ);
    this.teleportTransitionProgress = 0.0;
    this.locomotionCurrentLabel = hitLabel || (hitKind === 'anatomy' ? 'Arterial & Thrombus Lumen' : 'Inspection Floor');
  }

  /**
   * Quick-warp directly inside the Pulmonary Artery & Thrombus Lumen during VR/Desktop sessions.
   */
  public teleportIntoThoracicAnatomy(): void {
    if (this.currentScale === 'industrialCutaway' || this.currentScale === 'thoracic') {
      this.setScale('vessel');
      this.callbacks.onScaleChange?.('vessel');
      this.callbacks.onProgressChange?.(this.progress);
    }

    if (!this.renderer.xr.isPresenting) {
      // On desktop, smoothly frame the impacted Thrombus inside the Artery Bifurcation
      this.resetVRLocomotion();
      this.targetLookAt.set(3.2, -1.1, -0.1);
      this.spherical.set(16.0, Math.PI / 2.15, -0.22);
      this.setZoomMultiplier(Math.max(this.targetZoomMultiplier, 2.0));
      this.locomotionCurrentLabel = 'Artery & Thrombus Lumen';
      this.webXR?.refreshSpatialLabel(true);
      return;
    }

    this.setZoomMultiplier(Math.max(this.targetZoomMultiplier, 2.4));

    const targetWorld = new THREE.Vector3(0, 0, 0);
    if (this.embolusMacroMesh.visible) {
      this.embolusMacroMesh.getWorldPosition(targetWorld);
    } else {
      targetWorld.copy(this.sceneContainer.position);
    }
    this.teleportVRToWorldPoint(targetWorld, 'anatomy', 'Artery & Thrombus Lumen');
  }

  /**
   * Comfort snap-turn around the HMD's current world XZ position.
   */
  public rotateVRRigYaw(angleRadians: number): void {
    const xrCam = this.renderer.xr.isPresenting ? this.renderer.xr.getCamera() : this.camera;
    xrCam.getWorldPosition(this.tempHmdWorldPos);

    const dx = this.vrPlayerRig.position.x - this.tempHmdWorldPos.x;
    const dz = this.vrPlayerRig.position.z - this.tempHmdWorldPos.z;
    const c = Math.cos(angleRadians);
    const s = Math.sin(angleRadians);
    const rotatedX = dx * c + dz * s;
    const rotatedZ = -dx * s + dz * c;

    this.vrPlayerRig.position.x = this.tempHmdWorldPos.x + rotatedX;
    this.vrPlayerRig.position.z = this.tempHmdWorldPos.z + rotatedZ;
    this.vrPlayerRig.rotateY(angleRadians);

    this.teleportStartPos.copy(this.vrPlayerRig.position);
    this.teleportTargetPos.copy(this.vrPlayerRig.position);
    this.teleportTransitionProgress = 1.0;
  }

  public resetVRLocomotion(): void {
    this.vrPlayerRig.position.set(0, 0, 0);
    this.vrPlayerRig.rotation.set(0, 0, 0);
    this.teleportStartPos.set(0, 0, 0);
    this.teleportTargetPos.set(0, 0, 0);
    this.teleportTransitionProgress = 1.0;
    this.locomotionCurrentLabel = null;
  }

  public getLocomotionState(): { position: [number, number, number]; targetLabel: string | null } {
    return {
      position: [
        Math.round(this.vrPlayerRig.position.x * 100) / 100,
        Math.round(this.vrPlayerRig.position.y * 100) / 100,
        Math.round(this.vrPlayerRig.position.z * 100) / 100,
      ],
      targetLabel: this.locomotionCurrentLabel,
    };
  }

  public resetScene(): void {
    this.isUpsideDown = false;
    this.targetFlipAngle = 0;
    this.currentFlipAngle = 0;
    this.sceneContainer.quaternion.identity();
    this.selectAnnotation(null);
    this.resetZoom();
    this.resetVRLocomotion();

    if (this.renderer.xr.isPresenting) {
      this.webXR.recenterSeatedSpecimen();
      return;
    }

    this.sceneContainer.position.set(0, 0, 0);
    this.sceneContainer.scale.set(1, 1, 1);

    if (this.currentScale === 'industrialCutaway') {
      this.snapIndustrialCamera('reference');
      return;
    }

    this.spherical.theta = 0;
    this.spherical.phi = Math.PI / 2.2;
    this.setProgress(this.progress);
  }

  public cycleExplorerScale(): void {
    const order: ScaleLevel[] = ['vessel', 'clot', 'microscopic', 'industrialCutaway'];
    const idx = order.indexOf(this.currentScale);
    const next = order[(idx + 1) % order.length];
    this.setScale(next);
    this.callbacks.onProgressChange?.(this.progress);
    this.callbacks.onScaleChange?.(next);
    if (this.renderer.xr.isPresenting) {
      this.webXR.recenterSeatedSpecimen();
    }
  }

  private restoreHoveredEmissives(): void {
    for (const saved of this.hoveredSavedEmissives) {
      saved.material.emissive.setHex(saved.emissiveHex);
      saved.material.emissiveIntensity = saved.emissiveIntensity;
    }
    this.hoveredSavedEmissives = [];
  }

  private clearHoveredStructureLabel(): void {
    this.restoreHoveredEmissives();
    this.hoveredLabelInfo = null;
    this.hoveredHighlightObject = null;
    if (this.lastEmittedHoverKey !== '') {
      this.lastEmittedHoverKey = '';
      this.callbacks.onHoverStructureLabel?.(null);
      this.callbacks.onHoverObject?.(null);
    }
  }

  private applyHoveredStructure(
    info: AnatomicalHoverLabelInfo,
    namedObject: THREE.Object3D,
    hitObject: THREE.Object3D,
    worldPoint: THREE.Vector3
  ): void {
    const targetObj: THREE.Object3D | null =
      namedObject.name === 'EmbolusBeaconRing'
        ? this.thoracicGroup.getObjectByName('ThoracicEmbolusSite') || null
        : namedObject.name === 'MicroscopicChamberRoot'
        ? hitObject
        : namedObject;

    if (targetObj !== this.hoveredHighlightObject || this.hoveredLabelInfo?.id !== info.id) {
      this.restoreHoveredEmissives();
      this.hoveredHighlightObject = targetObj;

      if (targetObj) {
        const highlightHex =
          info.category === 'Thrombus & Embolus'
            ? 0xf59e0b
            : 0x38bdf8;
        const highlightIntensity = info.isPulmonarySegment
          ? 0.48
          : info.category === 'Thrombus & Embolus'
          ? 0.52
          : 0.26;

        const seenMaterials = new Set<THREE.Material>();
        targetObj.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if (!(mat instanceof THREE.MeshStandardMaterial) || seenMaterials.has(mat)) continue;
            seenMaterials.add(mat);
            this.hoveredSavedEmissives.push({
              material: mat,
              emissiveHex: mat.emissive.getHex(),
              emissiveIntensity: mat.emissiveIntensity,
            });
            mat.emissive.setHex(highlightHex);
            mat.emissiveIntensity = Math.max(mat.emissiveIntensity, highlightIntensity);
          }
        });
      }

      this.callbacks.onHoverObject?.(info.clinicalName);
    }

    this.hoveredLabelInfo = info;
    this.hoveredAnchorLocal.copy(worldPoint);
    this.sceneContainer.worldToLocal(this.hoveredAnchorLocal);
    this.emitProjectedHoverLabel();
  }

  private isObjectVisibleInHierarchy(obj: THREE.Object3D | null): boolean {
    let curr: THREE.Object3D | null = obj;
    while (curr) {
      if (!curr.visible) return false;
      curr = curr.parent;
    }
    return true;
  }

  private emitProjectedHoverLabel(): void {
    if (!this.hoveredLabelInfo || this.renderer.xr.isPresenting) {
      if (this.lastEmittedHoverKey !== '') {
        this.clearHoveredStructureLabel();
      }
      return;
    }

    if (this.hoveredHighlightObject && !this.isObjectVisibleInHierarchy(this.hoveredHighlightObject)) {
      this.clearHoveredStructureLabel();
      return;
    }

    this.tempHoverWorld.copy(this.hoveredAnchorLocal);
    this.sceneContainer.localToWorld(this.tempHoverWorld);
    this.tempHoverProj.copy(this.tempHoverWorld).project(this.camera);

    const rect = this.container.getBoundingClientRect();
    const width = rect.width || this.container.clientWidth;
    const height = rect.height || this.container.clientHeight;
    if (width <= 0 || height <= 0) return;

    const isInFront = this.tempHoverProj.z < 1.0;
    const screenX = Math.round((this.tempHoverProj.x * 0.5 + 0.5) * width);
    const screenY = Math.round((-this.tempHoverProj.y * 0.5 + 0.5) * height);
    const visible =
      isInFront &&
      screenX >= 0 &&
      screenX <= width &&
      screenY >= 0 &&
      screenY <= height;

    const key = `${this.hoveredLabelInfo.id}|${visible ? 1 : 0}|${screenX}|${screenY}`;
    if (key !== this.lastEmittedHoverKey) {
      this.lastEmittedHoverKey = key;
      this.callbacks.onHoverStructureLabel?.({
        info: this.hoveredLabelInfo,
        screenX,
        screenY,
        visible,
      });
    }
  }

  private setupPointerControls(container: HTMLDivElement): void {
    const getPinchDistance = (touches: TouchList): number => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!('touches' in e) && e.button !== 0) {
        return;
      }
      if ('touches' in e && e.touches.length === 2) {
        this.activePinchDistance = getPinchDistance(e.touches);
        this.isPointerDown = false;
        this.clearHoveredStructureLabel();
        return;
      }
      if ('touches' in e && e.touches.length === 0) {
        return;
      }
      this.activePinchDistance = null;
      this.isPointerDown = true;
      this.clearHoveredStructureLabel();
      this.pointerSourceType = 'touches' in e ? 'touch' : 'mouse';
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;
      this.pointerDownTime = performance.now();
      this.pointerDownPos = { x: clientX, y: clientY };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length === 2) {
        const nextDist = getPinchDistance(e.touches);
        if (this.activePinchDistance && this.activePinchDistance > 0) {
          const ratio = nextDist / this.activePinchDistance;
          if (Math.abs(ratio - 1) > 0.005) {
            this.setZoomMultiplier(this.targetZoomMultiplier * ratio);
          }
        }
        this.activePinchDistance = nextDist;
        return;
      }

      if ('touches' in e && e.touches.length === 0) {
        return;
      }

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Parallax target from normalized cursor coordinates [-1, 1]
      const nx = (clientX / container.clientWidth) * 2 - 1;
      const ny = -(clientY / container.clientHeight) * 2 + 1;
      this.mouseParallaxTarget.set(nx * 0.85, ny * 0.65);

      // Shared hover detection via AnatomicalInteractionAdapter
      if (!this.isPointerDown && !this.renderer.xr.isPresenting) {
        const target = e.target as Node | null;
        const overCanvas = target === container || target === this.renderer.domElement;
        const rect = container.getBoundingClientRect();
        const insideCanvas =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;

        if (!overCanvas || !insideCanvas) {
          this.clearHoveredStructureLabel();
          return;
        }

        this.mouseVec2.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseVec2.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        const hoverRes = this.interactionAdapter.handleHoverRay(this.mouseVec2, this.camera);
        const anatomicalHover = this.interactionAdapter.resolveAnatomicalHover(this.mouseVec2, this.camera);

        if (anatomicalHover) {
          this.applyHoveredStructure(
            anatomicalHover.info,
            anatomicalHover.namedObject,
            anatomicalHover.hitObject,
            anatomicalHover.point
          );
          container.style.cursor = 'pointer';
        } else {
          this.clearHoveredStructureLabel();
          container.style.cursor =
            hoverRes.kind === 'hotspot'
              ? 'pointer'
              : this.desktopInteractionMode === 'manipulate'
              ? 'move'
              : 'grab';
        }
      }

      if (!this.isPointerDown) return;

      const deltaX = clientX - this.prevPointerX;
      const deltaY = clientY - this.prevPointerY;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;

      // Shared specimen manipulation (Mouse/Touch in 'manipulate' mode or Shift+Drag)
      if (this.desktopInteractionMode === 'manipulate' || ('shiftKey' in e && e.shiftKey)) {
        const manipMode = 'shiftKey' in e && e.shiftKey ? 'translate' : 'rotate';
        this.interactionAdapter.applyDesktopManipulationDelta(deltaX, deltaY, manipMode, this.camera);
        return;
      }

      // Default desktop camera orbit
      const invertFactor = this.isUpsideDown ? -1 : 1;
      this.spherical.theta -= deltaX * 0.006 * invertFactor;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - deltaY * 0.006 * invertFactor));
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length < 2) {
        this.activePinchDistance = null;
      }
      const wasPointerDown = this.isPointerDown;
      this.isPointerDown = false;
      if (!wasPointerDown) return;

      const touch = 'changedTouches' in e ? e.changedTouches[0] : undefined;
      const clientX = touch ? touch.clientX : !('changedTouches' in e) ? (e as MouseEvent).clientX : undefined;
      const clientY = touch ? touch.clientY : !('changedTouches' in e) ? (e as MouseEvent).clientY : undefined;

      if (clientX !== undefined && clientY !== undefined) {
        const dist = Math.hypot(clientX - this.pointerDownPos.x, clientY - this.pointerDownPos.y);
        const duration = performance.now() - this.pointerDownTime;
        if (dist < 8 && duration < 450) {
          this.handlePointerClick(clientX, clientY);
        }
      }
    };

    const onLeave = () => {
      this.clearHoveredStructureLabel();
    };

    // Scroll wheel & trackpad pinch-to-zoom:
    // - Ctrl/Meta+Wheel (trackpad pinch) or CAD Cutaway adjusts optical zoom multiplier smoothly
    // - Standard Wheel zooms continuously across scales, extending smoothly via zoomMultiplier at limits
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.clearHoveredStructureLabel();

      if (e.ctrlKey || e.metaKey) {
        const pinchFactor = Math.exp(-e.deltaY * 0.008);
        this.setZoomMultiplier(this.targetZoomMultiplier * pinchFactor);
        return;
      }

      if (this.currentScale === 'industrialCutaway' || this.industrialCutaway.visible) {
        // Isolate zoom inside the CAD cutaway: adjust camera distance without changing scale
        const zoomDelta = Math.sign(e.deltaY) * Math.max(0.6, this.spherical.radius * 0.08);
        this.spherical.radius = Math.max(2.5, Math.min(45.0, this.spherical.radius + zoomDelta));
        return;
      }

      if (e.deltaY > 0 && this.progress >= 0.995) {
        this.zoomOut(1.1);
        return;
      }
      if (e.deltaY < 0 && this.progress <= 0.005) {
        this.zoomIn(1.1);
        return;
      }

      const delta = Math.sign(e.deltaY) * 0.035;
      const newProgress = Math.max(0, Math.min(1.0, this.progress + delta));
      this.setProgress(newProgress);
      if (this.callbacks.onProgressChange) {
        this.callbacks.onProgressChange(newProgress);
      }
    };

    container.addEventListener('mousedown', onDown);
    container.addEventListener('mouseleave', onLeave);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    container.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    this.cleanupPointerListeners = () => {
      container.removeEventListener('mousedown', onDown);
      container.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      container.removeEventListener('touchstart', onDown);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
      container.removeEventListener('wheel', onWheel);
    };
  }

  private handlePointerClick(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    this.mouseVec2.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseVec2.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.interactionAdapter.handleScreenTap(this.mouseVec2, this.camera, this.pointerSourceType);
  }

  /**
   * Continuous Scale Progress (0.0 to 1.0) — Locked MVP: Fibrin -> Thrombus -> Artery
   * 0.00 - 0.34: Microscopic Fibrin Network Chamber (50 µm)
   * 0.34 - 0.66: Impacted Thrombus Body (4 mm)
   * 0.66 - 1.00: Pulmonary Artery Cutaway (8 mm)
   */
  public setProgress(p: number): void {
    if (this.currentScale === 'industrialCutaway') {
      return; // Maintain isolated CAD cutaway mode
    }
    this.progress = Math.max(0, Math.min(1.0, p));

    // Determine primary scale (strictly Fibrin / Thrombus / Artery)
    let scale: ScaleLevel = 'microscopic';
    if (this.progress > 0.64) scale = 'vessel';
    else if (this.progress > 0.32) scale = 'clot';

    this.currentScale = scale;

    // Visibility blending — thoracic group always hidden
    this.thoracicGroup.visible = false;
    this.microscopicChamber.root.visible = this.progress < 0.42;
    this.vesselCutawayGroup.visible = this.progress >= 0.24;
    this.embolusMacroMesh.visible = this.progress >= 0.24;
    this.flowParticles.mesh.visible = this.progress >= 0.24;

    // Continuous camera distance interpolation across Fibrin -> Thrombus -> Artery
    if (this.progress <= 0.34) {
      // Fibrin chamber zoom range
      const t = this.progress / 0.34;
      this.spherical.radius = THREE.MathUtils.lerp(4.6, 15.0, t);
      this.targetLookAt.set(0, 0, 0);
    } else if (this.progress <= 0.66) {
      // Thrombus close-up inside lumen
      const t = (this.progress - 0.34) / 0.32;
      this.spherical.radius = THREE.MathUtils.lerp(15.0, 22.5, t);
      this.targetLookAt.lerpVectors(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.5, -1.3, -0.2), t);
    } else {
      // Pulmonary artery bifurcation cutaway overview
      const t = (this.progress - 0.66) / 0.34;
      this.spherical.radius = THREE.MathUtils.lerp(22.5, 36.0, t);
      this.targetLookAt.lerpVectors(new THREE.Vector3(3.5, -1.3, -0.2), new THREE.Vector3(2.0, 0, 0), t);
    }
  }

  public getProgress(): number {
    return this.progress;
  }

  public setScale(scale: ScaleLevel): void {
    this.clearHoveredStructureLabel();
    // Redirect any legacy thoracic call straight to Pulmonary Artery Cutaway
    const effectiveScale: ScaleLevel = scale === 'thoracic' ? 'vessel' : scale;

    if (effectiveScale === 'industrialCutaway') {
      this.currentScale = 'industrialCutaway';
      this.microscopicChamber.root.visible = false;
      this.vesselCutawayGroup.visible = false;
      this.embolusMacroMesh.visible = false;
      this.flowParticles.mesh.visible = false;
      this.thoracicGroup.visible = false;
      this.annotationsGroup.visible = false;
      this.industrialCutaway.visible = true;

      // Pure pitch-black CAD backdrop
      this.scene.background = new THREE.Color(0x000000);
      this.scene.fog = null;
      this.renderer.setClearColor(0x000000, 1.0);

      // Camera angle matching cutaway framing
      this.spherical.radius = 16.5;
      this.spherical.phi = 1.05;
      this.spherical.theta = 0.72;
      this.targetLookAt.set(0, 0, 0);
      if (this.renderer.xr.isPresenting) {
        this.webXR.recenterSeatedSpecimen();
      }
      return;
    }

    // Leaving industrial cutaway: restore visibility & active theme cleanly
    const wasCutaway = this.currentScale === 'industrialCutaway' || this.industrialCutaway.visible;
    if (wasCutaway) {
      this.currentScale = effectiveScale;
      this.industrialCutaway.visible = false;
      this.annotationsGroup.visible = this.layersVisibility.annotations;
      this.setTheme(this.currentTheme);
    }

    switch (effectiveScale) {
      case 'microscopic':
        this.setProgress(0.14);
        break;
      case 'clot':
        this.setProgress(0.50);
        break;
      case 'vessel':
      default:
        this.setProgress(0.88);
        break;
    }

    if (this.renderer.xr.isPresenting) {
      this.webXR.recenterSeatedSpecimen();
    }
  }

  public snapIndustrialCamera(preset: 'reference' | 'axial' | 'side' | 'isometric' | 'lumenBore'): void {
    if (preset === 'reference' || preset === 'isometric') {
      this.targetLookAt.set(0, 0, 0);
      this.spherical.radius = 16.5;
      this.spherical.phi = 1.05;
      this.spherical.theta = 0.72;
    } else if (preset === 'lumenBore') {
      this.targetLookAt.set(0.2, -0.6, 0.4);
      this.spherical.radius = 5.8;
      this.spherical.phi = 1.15;
      this.spherical.theta = 0.82;
    } else if (preset === 'axial') {
      this.targetLookAt.set(0, 0, 0);
      this.spherical.radius = 17.0;
      this.spherical.phi = Math.PI / 2.0;
      this.spherical.theta = -0.38;
    } else if (preset === 'side') {
      this.targetLookAt.set(0, 0, 0);
      this.spherical.radius = 18.0;
      this.spherical.phi = Math.PI / 2.0;
      this.spherical.theta = Math.PI / 2 - 0.38;
    }
  }

  public setIndustrialMode(mode: 'airway' | 'vascular'): void {
    this.industrialMode = mode;
    this.industrialCutaway.setMode(mode);
  }

  public getIndustrialCalloutPositions(): IndustrialCalloutPoint[] {
    if (!this.industrialCutaway || !this.industrialCutaway.visible) return [];
    const anchors = this.industrialCutaway.getAnchorWorldPositions();
    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return [];

    const projectPoint = (worldPos: THREE.Vector3) => {
      const v = worldPos.clone().project(this.camera);
      const isInFront = v.z < 1.0;
      const x = ((v.x + 1) * 0.5) * rect.width;
      const y = ((-v.y + 1) * 0.5) * rect.height;
      return { x, y, isInFront };
    };

    const ep = projectPoint(anchors.epithelium);
    const acc = projectPoint(anchors.accumulation);
    const lum = projectPoint(anchors.lumen);

    return [
      {
        id: 'epithelium',
        title: this.industrialMode === 'airway' ? 'AIRWAY EPITHELIUM' : 'VESSEL ENDOTHELIUM',
        subtitle: 'Pseudostratified Ciliated Layer',
        badge: 'CAD STRATA',
        anchorX: ep.x,
        anchorY: ep.y,
        x: Math.max(120, ep.x - 120),
        y: Math.max(90, ep.y - 70),
        align: 'left',
        visible: ep.isInFront,
        description:
          this.industrialMode === 'airway'
            ? 'Columnar epithelial cells with active coordinated ciliary brush border for mucociliary clearance.'
            : 'Vascular endothelial monolayer lining the vessel lumen with basement membrane support.',
      },
      {
        id: 'accumulation',
        title: this.industrialMode === 'airway' ? 'MUCUS ACCUMULATION' : 'THROMBUS ACCUMULATION',
        subtitle: 'Viscoelastic Polymer Core',
        badge: 'OBSTRUCTION',
        anchorX: acc.x,
        anchorY: acc.y,
        x: Math.max(120, acc.x - 110),
        y: Math.min(rect.height - 120, acc.y + 80),
        align: 'left',
        visible: acc.isInFront,
        description:
          this.industrialMode === 'airway'
            ? 'Hyperconcentrated mucin polymers form entangled gel plugs entrapping cellular debris in chronic airway disease.'
            : 'Dense crosslinked fibrin fibers entrapping erythrocytes and activated platelets forming obstructive clot.',
      },
      {
        id: 'lumen',
        title: this.industrialMode === 'airway' ? 'AIRWAY LUMEN' : 'VASCULAR LUMEN',
        subtitle: 'Conduit Fluid Bore',
        badge: 'PATENT CHANNEL',
        anchorX: lum.x,
        anchorY: lum.y,
        x: Math.min(rect.width - 120, lum.x + 110),
        y: lum.y - 15,
        align: 'right',
        visible: lum.isInFront,
        description:
          this.industrialMode === 'airway'
            ? 'Cylindrical airway conduit providing cross-sectional area for laminar air transmission.'
            : 'Pulmonary arterial branch conduit carrying hemodynamics through vascular bed.',
      },
    ];
  }

  public setClipping(axis: 'none' | 'x' | 'y' | 'z', distance = 0, invert = false): void {
    this.currentClipAxis = axis;
    if (axis === 'none') {
      this.renderer.clippingPlanes = [];
    } else {
      const normal = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );
      if (invert) normal.negate();
      this.clippingPlane.set(normal, distance);
      this.renderer.clippingPlanes = [this.clippingPlane];
    }
  }

  public setExplodedView(offset: number): void {
    if (this.currentScale === 'industrialCutaway' || this.industrialCutaway.visible) {
      this.industrialCutaway.setExplodedOffset(offset);
    } else if (this.currentScale === 'vessel' || this.currentScale === 'clot') {
      this.embolusMacroMesh.position.set(0, -offset * 3.5, offset * 2.0);
      this.vesselCutawayGroup.position.set(0, offset * 2.0, -offset * 1.5);
    } else if (this.currentScale === 'thoracic') {
      const rightLung = this.thoracicGroup.getObjectByName('RightLung');
      const leftLung = this.thoracicGroup.getObjectByName('LeftLung');
      if (rightLung) rightLung.position.set(-offset * 12, 0, 0);
      if (leftLung) leftLung.position.set(offset * 12, 0, 0);
    }
  }

  public setIndustrialExplodedOffset(offset: number): void {
    if (this.industrialCutaway) {
      this.industrialCutaway.setExplodedOffset(offset);
    }
  }

  public getIndustrialExplodedOffset(): number {
    return this.industrialCutaway ? this.industrialCutaway.getExplodedOffset() : 0;
  }

  public setIndustrialDrugTreatment(isInfusing: boolean, lyticFraction: number, speedScale = 1.0): void {
    if (this.industrialCutaway) {
      this.industrialCutaway.setDrugInfusion(isInfusing, speedScale);
      this.industrialCutaway.setLyticFraction(lyticFraction);
    }
  }

  public setLayers(layers: LayerVisibility): void {
    this.layersVisibility = layers;
    this.microscopicChamber.setVisibility(
      layers.fibrinMesh,
      layers.redBloodCells,
      layers.platelets
    );
    this.vesselCutawayGroup.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.vesselWall;
    this.embolusMacroMesh.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.thrombusBody;
    this.flowParticles.mesh.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.flowStreamlines;
    this.thoracicGroup.visible = (this.currentScale === 'thoracic') && layers.thoracicLungs;
    this.annotationsGroup.visible = layers.annotations;
  }

  public selectAnnotation(id: string | null): void {
    this.activeAnnotationId = id;
    const ann = id ? CLOT_ANNOTATIONS.find((a) => a.id === id) || null : null;
    this.callbacks.onSelectAnnotation?.(ann);
  }

  public focusAnnotation(id: string): void {
    const ann = CLOT_ANNOTATIONS.find((a) => a.id === id);
    if (!ann) return;

    this.selectAnnotation(id);

    // Smoothly adjust scale and target look-at to center on the 3D annotation
    if (ann.scale === 'microscopic') {
      if (this.progress > 0.35) {
        this.setProgress(0.12);
        this.callbacks.onProgressChange?.(0.12);
      }
      this.targetLookAt.set(...ann.position);
      this.spherical.radius = 8.5;
    } else {
      if (this.progress < 0.20 || this.progress > 0.75) {
        this.setProgress(0.38);
        this.callbacks.onProgressChange?.(0.38);
      }
      this.targetLookAt.set(...ann.position);
      this.spherical.radius = 18.0;
    }
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public setDrugInfusion(active: boolean, isSlowMo = true): void {
    this.isDrugInfused = active;
    this.flowSpeedScale = isSlowMo ? 0.2 : 1.0;
    if (active) {
      this.flowParticles.mesh.visible = true;
    }
  }

  public setFlowSpeed(scale: number): void {
    this.flowSpeedScale = scale;
  }

  private tick(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const isPresenting = this.renderer.xr.isPresenting;

    // Smooth optical zoom damping shared across desktop and VR
    this.currentZoomMultiplier = THREE.MathUtils.damp(
      this.currentZoomMultiplier,
      this.targetZoomMultiplier,
      10.0,
      delta
    );

    if (!isPresenting) {
      // Desktop mode: smooth upside-down rotation transition (only when user triggered flip in desktop)
      this.currentFlipAngle = THREE.MathUtils.damp(
        this.currentFlipAngle,
        this.targetFlipAngle,
        8.0,
        delta
      );
      if (this.desktopInteractionMode === 'orbit') {
        this.sceneContainer.rotation.z = this.currentFlipAngle;
      }

      // Smooth mouse parallax damping
      this.mouseParallaxCurrent.lerp(this.mouseParallaxTarget, 1 - Math.exp(-5 * delta));

      // Smooth camera damping towards target spherical coordinates with optical zoom & parallax offset
      const effectiveRadius = THREE.MathUtils.clamp(
        this.spherical.radius / Math.max(0.25, this.currentZoomMultiplier),
        1.2,
        140
      );
      this.tempCameraOffset.setFromSphericalCoords(
        effectiveRadius,
        this.spherical.phi,
        this.spherical.theta
      );
      this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-6 * delta));

      // Apply parallax translation to camera position
      this.tempParallaxOffset.set(
        this.mouseParallaxCurrent.x * (effectiveRadius * 0.045),
        this.mouseParallaxCurrent.y * (effectiveRadius * 0.045),
        0
      );

      this.camera.position.copy(this.currentLookAt).add(this.tempCameraOffset).add(this.tempParallaxOffset);
      this.camera.lookAt(this.currentLookAt);

      if (this.hoveredLabelInfo) {
        this.emitProjectedHoverLabel();
      }
    } else {
      // Advance smooth VR teleportation transition before updating controller/hand world matrices
      if (this.teleportTransitionProgress < 1.0) {
        this.teleportTransitionProgress = Math.min(1.0, this.teleportTransitionProgress + delta * 7.5);
        const eased = 1 - Math.pow(1 - this.teleportTransitionProgress, 3);
        this.vrPlayerRig.position.lerpVectors(
          this.teleportStartPos,
          this.teleportTargetPos,
          eased
        );
        this.vrPlayerRig.updateMatrixWorld(true);
      }

      // WebXR presenting: let HMD drive camera inside vrPlayerRig; update hands, controllers, rays, teleportation & diagnostics
      this.webXR.updateFrame(delta);
    }

    // Animate flow particles if active (with slow motion and golden drug infusion)
    if (this.flowParticles.mesh.visible) {
      this.flowParticles.update(delta, 0.75, this.flowSpeedScale, this.isDrugInfused);
    }

    // Animate industrial cutaway if active
    if (this.industrialCutaway.visible) {
      this.industrialCutaway.updateTime(delta, this.clock.getElapsedTime());
    }

    // Breathing pulse of thoracic occlusion beacon
    if (this.thoracicGroup.visible) {
      const beacon = this.thoracicGroup.getObjectByName('EmbolusBeaconRing');
      if (beacon) {
        const time = this.clock.getElapsedTime();
        beacon.rotation.z = time * 0.5;
        const scale = 1.0 + 0.15 * Math.sin(time * 3.5);
        beacon.scale.set(scale, scale, scale);
      }
    }

    // Animate travelling embolus along clot path trajectory
    if (this.isClotPathPlaying) {
      this.clotPathProgress += delta * this.clotPathSpeed;
      if (this.clotPathProgress >= 1.0) {
        this.clotPathProgress = 1.0;
        this.isClotPathPlaying = false; // reached final arrest site
      }
      this.updateClotPosition();
      this.callbacks.onClotPathProgressChange?.(this.clotPathProgress);
    }

    // Animate 3D Clot Annotation Hotspots & project to screen-space coordinates (desktop)
    if (this.layersVisibility.annotations && this.currentScale !== 'industrialCutaway') {
      const cameraPos = isPresenting
        ? this.renderer.xr.getCamera().getWorldPosition(this.tempHmdWorldPos)
        : this.camera.position;
      const time = this.clock.getElapsedTime();
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      const tempVec = new THREE.Vector3();
      const positions: Record<string, AnnotationScreenPosition> = {};

      for (let i = 0; i < CLOT_ANNOTATIONS.length; i++) {
        const ann = CLOT_ANNOTATIONS[i];
        const group = this.hotspotMeshes.get(ann.id);
        if (!group) continue;

        // Scale visibility strictly across Fibrin (microscopic) and Artery/Thrombus (vessel/clot)
        let isScaleVisible = false;
        if (ann.scale === 'microscopic') {
          isScaleVisible = this.progress < 0.42;
        } else if (ann.scale === 'clot' || ann.scale === 'vessel') {
          isScaleVisible = this.progress >= 0.24;
        } else {
          isScaleVisible = true;
        }

        const isVisible = isScaleVisible && this.layersVisibility.annotations;
        group.visible = isVisible;

        if (isVisible) {
          const isSelected = this.activeAnnotationId === ann.id;
          const isHovered = this.hoveredAnnotationId === ann.id;
          const pulse = 1.0 + (isSelected ? 0.35 : 0.18) * Math.sin(time * 3.8 + i * 0.8);

          const ring = group.getObjectByName('HotspotRing');
          const halo = group.getObjectByName('HotspotHalo');
          const core = group.getObjectByName('HotspotCore');

          if (ring) {
            ring.lookAt(cameraPos);
            ring.scale.setScalar(pulse * (isSelected ? 1.4 : isHovered ? 1.25 : 1.0));
          }
          if (halo) {
            halo.lookAt(cameraPos);
            halo.scale.setScalar(pulse * (isSelected ? 1.6 : 1.0));
          }
          if (core) {
            core.scale.setScalar(isSelected ? 1.45 : isHovered ? 1.2 : 1.0);
          }

          if (!isPresenting) {
            // Calculate 2D screen coordinate for desktop HUD cards
            group.getWorldPosition(tempVec);
            tempVec.project(this.camera);

            const isInFront = tempVec.z < 1.0;
            const screenX = (tempVec.x * 0.5 + 0.5) * width;
            const screenY = (-tempVec.y * 0.5 + 0.5) * height;

            positions[ann.id] = {
              id: ann.id,
              x: screenX,
              y: screenY,
              visible: isInFront && screenX >= -80 && screenX <= width + 80 && screenY >= -80 && screenY <= height + 80,
              isInFront,
            };
          }
        }
      }

      if (!isPresenting) {
        this.callbacks.onAnnotationPositionsUpdate?.(positions);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.clearHoveredStructureLabel();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.boundOnContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.boundOnContextRestored);
    this.renderer.setAnimationLoop(null);
    this.cleanupPointerListeners?.();
    this.webXR.dispose();
    if (this.scene.environment) {
      this.scene.environment.dispose();
      this.scene.environment = null;
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
