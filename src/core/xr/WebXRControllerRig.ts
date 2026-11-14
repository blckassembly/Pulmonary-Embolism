/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { ScaleLevel } from '../../types/biomedical.ts';
import {
  AnatomicalLabelPayload,
  XRDiagnosticsState,
  XREventLogEntry,
  XRFeatureStatus,
  XRInputSourceInfo,
  XRTrackingState,
} from '../../types/webxr.ts';
import { AnatomicalInteractionAdapter, VRHudAction } from '../interaction/AnatomicalInteractionAdapter.ts';

interface DesktopSceneSnapshot {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

interface VRButtonEntry {
  mesh: THREE.Mesh;
  action: VRHudAction;
  label: string;
  baseColor: number;
  hoverColor: number;
  material: THREE.MeshStandardMaterial;
}

export interface WebXRHost {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sceneContainer: THREE.Group;
  adapter: AnatomicalInteractionAdapter;
  getCurrentScale: () => ScaleLevel;
  onDiagnosticsChange: (diagnostics: XRDiagnosticsState) => void;
  onSessionStateChange?: (isPresenting: boolean) => void;
}

const SESSION_INIT_OPTIONS: XRSessionInit = {
  optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
};

export class WebXRControllerRig {
  private host: WebXRHost;
  private handModelFactory = new XRHandModelFactory();

  // XR rig container attached to scene
  public xrRigGroup = new THREE.Group();
  private controllers: THREE.XRTargetRaySpace[] = [];
  private controllerGrips: THREE.XRGripSpace[] = [];
  private hands: THREE.XRHandSpace[] = [];
  private controllerRays: THREE.Line[] = [];
  private controllerReticles: THREE.Mesh[] = [];
  private handPinchIndicators: THREE.Mesh[] = [];

  // Seated pedestal & in-world spatial label HUD
  private seatedPedestalMesh!: THREE.Mesh;
  public vrHudGroup = new THREE.Group();
  private labelCardMesh!: THREE.Mesh;
  private labelCanvas: HTMLCanvasElement;
  private labelCtx: CanvasRenderingContext2D;
  private labelTexture: THREE.CanvasTexture;
  private vrHudButtons: VRButtonEntry[] = [];
  private hoveredHudButton: VRButtonEntry | null = null;
  private lastRenderedLabelHash = '';

  // Session & state tracking
  private currentSession: XRSession | null = null;
  private activeReferenceSpaceType: 'local-floor' | 'local' | 'none' = 'none';
  private desktopSnapshot: DesktopSceneSnapshot | null = null;
  private activeSelectSources = new Set<XRInputSource>();
  private activeSqueezeSources = new Set<XRInputSource>();
  private mountedVRButtonEl: HTMLElement | null = null;
  private lastDiagnosticsPush = 0;

  // Diagnostics state
  private diagnostics: XRDiagnosticsState;

  // Reusable math scratch objects
  private tempMatrix = new THREE.Matrix4();
  private tempOrigin = new THREE.Vector3();
  private tempDirection = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();
  private tempHandPos = new THREE.Vector3();
  private tempHandQuat = new THREE.Quaternion();
  private tempThumbPos = new THREE.Vector3();

  // Bound session handlers so they can be cleanly removed
  private boundOnSessionStart = () => {
    this.handleRendererSessionStart();
  };
  private boundOnSessionEnd = () => {
    this.handleRendererSessionEnd();
  };
  private boundOnInputSourcesChange = (e: XRInputSourcesChangeEvent) => {
    this.handleInputSourcesChange(e);
  };
  private boundOnSessionSelectStart = (e: XRInputSourceEvent) => {
    this.handleSessionSelectStart(e);
  };
  private boundOnSessionSelect = (e: XRInputSourceEvent) => {
    this.handleSessionSelect(e);
  };
  private boundOnSessionSelectEnd = (e: XRInputSourceEvent) => {
    this.handleSessionSelectEnd(e);
  };
  private boundOnSessionSqueezeStart = (e: XRInputSourceEvent) => {
    this.activeSqueezeSources.add(e.inputSource);
    this.logEvent('xr-input', `squeezestart (${e.inputSource.handedness})`, 'info');
  };
  private boundOnSessionSqueezeEnd = (e: XRInputSourceEvent) => {
    this.activeSqueezeSources.delete(e.inputSource);
  };

  constructor(host: WebXRHost) {
    this.host = host;

    this.xrRigGroup.name = 'WebXRRigGroup';
    this.xrRigGroup.visible = false;
    this.host.scene.add(this.xrRigGroup);

    // Initialize label canvas & texture
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 1024;
    this.labelCanvas.height = 576;
    const ctx = this.labelCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D canvas context for WebXR label card');
    }
    this.labelCtx = ctx;
    this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
    this.labelTexture.colorSpace = THREE.SRGBColorSpace;
    this.labelTexture.anisotropy = 4;

    const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'unknown';
    const hasXR = typeof navigator !== 'undefined' && 'xr' in navigator && Boolean(navigator.xr);

    this.diagnostics = {
      isSecureContext: isSecure,
      protocol,
      hasNavigatorXR: hasXR,
      isImmersiveVRSupported: hasXR ? null : false,
      supportCheckError: !isSecure
        ? 'Insecure context: WebXR requires HTTPS (or localhost for desktop/emulated testing).'
        : !hasXR
        ? 'navigator.xr API is unavailable in this browser.'
        : null,
      sessionActive: false,
      isPresenting: false,
      referenceSpaceType: 'none',
      viewerTrackingState: 'unavailable',
      environmentBlendMode: null,
      visibilityState: null,
      features: {
        immersiveVr: hasXR ? 'unknown' : 'unsupported',
        localFloor: 'unknown',
        boundedFloor: 'unknown',
        handTracking: 'unknown',
      },
      inputSources: [],
      activeInteractionSource: null,
      isManipulatingSpecimen: false,
      selectedTargetLabel: null,
      lastError: null,
      events: [],
    };

    this.setupControllersAndHands();
    this.setupSeatedPedestalAndHud();
    this.bindRendererEvents();
    void this.checkXRSupport();
  }

  public getHudInteractiveButtons(): THREE.Object3D[] {
    return this.vrHudButtons.map((b) => b.mesh);
  }

  public getDiagnostics(): XRDiagnosticsState {
    return {
      ...this.diagnostics,
      features: { ...this.diagnostics.features },
      inputSources: [...this.diagnostics.inputSources],
      events: [...this.diagnostics.events],
    };
  }

  /**
   * Probes navigator.xr.isSessionSupported('immersive-vr') cleanly.
   */
  public async checkXRSupport(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.xr) {
      this.diagnostics.hasNavigatorXR = false;
      this.diagnostics.isImmersiveVRSupported = false;
      this.diagnostics.features.immersiveVr = 'unsupported';
      this.diagnostics.features.handTracking = 'unsupported';
      this.diagnostics.features.localFloor = 'unsupported';
      this.diagnostics.features.boundedFloor = 'unsupported';
      this.logEvent(
        'webxr',
        this.diagnostics.isSecureContext
          ? 'navigator.xr unavailable — desktop 3D fallback active'
          : 'Non-HTTPS context — WebXR blocked, desktop fallback active',
        'warn'
      );
      this.emitDiagnostics(true);
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      this.diagnostics.hasNavigatorXR = true;
      this.diagnostics.isImmersiveVRSupported = supported;
      this.diagnostics.features.immersiveVr = supported ? 'available' : 'unsupported';
      this.diagnostics.features.localFloor = supported ? 'available' : 'unsupported';
      this.diagnostics.features.boundedFloor = supported ? 'available' : 'unsupported';
      this.diagnostics.features.handTracking = supported ? 'available' : 'unsupported';
      this.diagnostics.supportCheckError = supported
        ? null
        : 'Browser reports WebXR present, but no immersive-vr runtime/headset is currently available.';

      this.logEvent(
        'webxr',
        supported
          ? 'immersive-vr feature check passed (VR runtime available)'
          : 'immersive-vr unsupported on this device/browser — desktop mode ready',
        supported ? 'info' : 'warn'
      );
      this.emitDiagnostics(true);
      return supported;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.diagnostics.isImmersiveVRSupported = false;
      this.diagnostics.features.immersiveVr = 'unavailable';
      this.diagnostics.supportCheckError = msg;
      this.logEvent('webxr', `immersive-vr check failed: ${msg}`, 'error');
      this.emitDiagnostics(true);
      return false;
    }
  }

  /**
   * Mounts Three.js's official VRButton inside a target React container slot.
   */
  public mountVRButton(container: HTMLElement): () => void {
    container.innerHTML = '';
    const vrBtn = VRButton.createButton(this.host.renderer, SESSION_INIT_OPTIONS);
    // Override Three.js default absolute bottom-center positioning so it sits cleanly inside the panel
    vrBtn.style.position = 'relative';
    vrBtn.style.bottom = 'auto';
    vrBtn.style.left = 'auto';
    vrBtn.style.width = '100%';
    vrBtn.style.zIndex = '1';
    vrBtn.style.opacity = '1';
    vrBtn.style.padding = '10px 14px';
    vrBtn.style.borderRadius = '10px';
    vrBtn.style.fontWeight = '700';
    vrBtn.style.fontSize = '12px';
    vrBtn.style.letterSpacing = '0.04em';
    vrBtn.style.background = '#e6b65c';
    vrBtn.style.color = '#09090b';
    vrBtn.style.border = '1px solid #d4a13f';
    vrBtn.style.display = 'inline-flex';
    vrBtn.style.alignItems = 'center';
    vrBtn.style.justifyContent = 'center';

    container.appendChild(vrBtn);
    this.mountedVRButtonEl = vrBtn;

    return () => {
      if (this.mountedVRButtonEl && this.mountedVRButtonEl.parentElement === container) {
        container.removeChild(this.mountedVRButtonEl);
      }
      this.mountedVRButtonEl = null;
    };
  }

  /**
   * Programmatic Enter VR entry point (kept synchronized with VRButton via renderer.xr session events).
   */
  public async enterVR(): Promise<boolean> {
    if (this.currentSession) return true;

    if (!this.diagnostics.isSecureContext) {
      const msg = 'WebXR requires a secure HTTPS context (or localhost).';
      this.diagnostics.lastError = msg;
      this.logEvent('webxr', msg, 'error');
      this.emitDiagnostics(true);
      return false;
    }

    if (!navigator.xr) {
      const msg = 'WebXR API (navigator.xr) is not available in this browser.';
      this.diagnostics.lastError = msg;
      this.logEvent('webxr', msg, 'error');
      this.emitDiagnostics(true);
      return false;
    }

    try {
      this.diagnostics.lastError = null;
      this.host.renderer.xr.setReferenceSpaceType('local-floor');
      const session = await navigator.xr.requestSession('immersive-vr', SESSION_INIT_OPTIONS);

      try {
        await this.host.renderer.xr.setSession(session);
      } catch (refErr) {
        // Fallback if 'local-floor' reference space is unsupported by runtime
        this.logEvent('webxr', 'local-floor unavailable, falling back to local reference space', 'warn');
        this.host.renderer.xr.setReferenceSpaceType('local');
        await this.host.renderer.xr.setSession(session);
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.diagnostics.lastError = msg;
      this.logEvent('webxr', `Enter VR failed: ${msg}`, 'error');
      this.emitDiagnostics(true);
      return false;
    }
  }

  public async exitVR(): Promise<void> {
    if (this.currentSession) {
      try {
        await this.currentSession.end();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logEvent('webxr', `Session end notice: ${msg}`, 'warn');
      }
    }
  }

  /**
   * Resets specimen transform to comfortable seated VR placement (if in VR)
   * or signals desktop reset when not presenting.
   */
  public recenterSeatedSpecimen(): void {
    const isLocalFloor = this.activeReferenceSpaceType === 'local-floor';
    const scale = this.getSeatedScaleFactor(this.host.getCurrentScale());

    const specimenPos = isLocalFloor
      ? new THREE.Vector3(0, 1.05, -0.92)
      : new THREE.Vector3(0, -0.10, -0.92);

    const hudPos = isLocalFloor
      ? new THREE.Vector3(0.56, 1.12, -0.78)
      : new THREE.Vector3(0.56, -0.02, -0.78);

    this.host.sceneContainer.position.copy(specimenPos);
    this.host.sceneContainer.quaternion.identity();
    this.host.sceneContainer.scale.setScalar(scale);
    this.host.adapter.setSeatedOrigin(specimenPos);

    if (this.seatedPedestalMesh) {
      this.seatedPedestalMesh.position.set(specimenPos.x, specimenPos.y - 0.34, specimenPos.z);
    }

    this.vrHudGroup.position.copy(hudPos);
    this.vrHudGroup.rotation.set(-0.08, -0.42, 0);

    this.refreshSpatialLabel(true);
    this.logEvent('seated-rig', `Placed specimen at seated (${this.activeReferenceSpaceType}) comfort pose`, 'info');
    this.emitDiagnostics(true);
  }

  public refreshSpatialLabel(force = false): void {
    if (!this.host.renderer.xr.isPresenting && !force) return;
    const payload = this.host.adapter.getCurrentLabelPayload();
    const sourceLabel = this.host.adapter.getActiveSource() || 'ready';
    const hash = `${payload.id}|${payload.title}|${payload.scaleLabel}|${sourceLabel}|${this.diagnostics.features.handTracking}`;
    if (!force && hash === this.lastRenderedLabelHash) return;
    this.lastRenderedLabelHash = hash;
    this.drawSpatialLabelCanvas(payload);
  }

  /**
   * Called every XR/render frame from SceneManager's setAnimationLoop.
   */
  public updateFrame(delta: number): void {
    if (!this.host.renderer.xr.isPresenting || !this.currentSession) return;

    const frame = this.host.renderer.xr.getFrame();
    const refSpace = this.host.renderer.xr.getReferenceSpace();

    // 1. Check HMD viewer tracking state (handle tracking loss)
    if (frame && refSpace) {
      const viewerPose = frame.getViewerPose(refSpace);
      if (!viewerPose) {
        if (this.diagnostics.viewerTrackingState !== 'lost') {
          this.logEvent('tracking', 'Viewer pose temporarily lost', 'warn');
        }
        this.diagnostics.viewerTrackingState = 'lost';
      } else {
        const nextViewerState: XRTrackingState = viewerPose.emulatedPosition ? 'emulated' : 'tracked';
        if (this.diagnostics.viewerTrackingState === 'lost') {
          this.logEvent('tracking', 'Viewer pose restored', 'info');
        }
        this.diagnostics.viewerTrackingState = nextViewerState;
      }
    }

    // 2. Inspect connected XRInputSources, tracking state, hand joints, and active manipulation
    const inputInfos: XRInputSourceInfo[] = [];
    let anyHandActive = false;
    let anyTrackedHandJoints = false;

    const sources = Array.from(this.currentSession.inputSources);
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const hasHand = Boolean(source.hand);
      const handObj = this.hands[i];
      const ctrlObj = this.controllers[i];

      let visibleJoints = 0;
      if (hasHand && handObj && handObj.joints) {
        for (const joint of Object.values(handObj.joints)) {
          if (joint?.visible) {
            visibleJoints++;
          }
        }
      }

      if (hasHand) {
        anyHandActive = true;
        if (visibleJoints > 0) anyTrackedHandJoints = true;
      }

      let trackingState: XRTrackingState = 'unavailable';
      if (frame && refSpace && source.targetRaySpace) {
        const rayPose = frame.getPose(source.targetRaySpace, refSpace);
        if (!rayPose) {
          trackingState = 'lost';
        } else {
          trackingState = rayPose.emulatedPosition ? 'emulated' : 'tracked';
        }
      }

      const isSelecting = this.activeSelectSources.has(source);
      const isSqueezing = this.activeSqueezeSources.has(source);
      const buttonsPressed = source.gamepad
        ? source.gamepad.buttons.filter((b) => b.pressed).length
        : 0;

      inputInfos.push({
        id: `${source.handedness}-${i}-${source.targetRayMode}`,
        index: i,
        handedness: source.handedness,
        targetRayMode: source.targetRayMode,
        profiles: [...source.profiles],
        hasHand,
        handJointCount: source.hand ? source.hand.size : 0,
        visibleHandJoints: visibleJoints,
        hasGamepad: Boolean(source.gamepad),
        gamepadButtonsPressed: buttonsPressed,
        trackingState,
        isSelecting,
        isSqueezing,
        kind: hasHand ? 'hand' : source.gamepad ? 'controller' : 'pointer',
      });

      // Update laser ray / hand pinch cursor visuals & active manipulation
      this.updateInputVisualsAndManipulation(i, source, ctrlObj, handObj, visibleJoints, trackingState, delta);
    }

    this.diagnostics.inputSources = inputInfos;
    if (anyTrackedHandJoints) {
      this.diagnostics.features.handTracking = 'active';
    } else if (anyHandActive) {
      this.diagnostics.features.handTracking = 'awaiting-input';
    } else if (this.currentSession) {
      const enabledFeatures = (this.currentSession as XRSession & { enabledFeatures?: string[] }).enabledFeatures;
      if (enabledFeatures && !enabledFeatures.includes('hand-tracking')) {
        this.diagnostics.features.handTracking = 'unavailable';
      } else {
        this.diagnostics.features.handTracking = 'awaiting-input';
      }
    }

    this.diagnostics.activeInteractionSource = this.host.adapter.getActiveSource();
    this.diagnostics.isManipulatingSpecimen = this.host.adapter.isManipulating();
    this.diagnostics.selectedTargetLabel = this.host.adapter.getCurrentLabelPayload().title;
    this.refreshSpatialLabel(false);

    // Throttle React diagnostics updates to ~5 Hz while presenting
    const now = performance.now();
    if (now - this.lastDiagnosticsPush > 200) {
      this.lastDiagnosticsPush = now;
      this.emitDiagnostics(false);
    }
  }

  public dispose(): void {
    this.host.renderer.xr.removeEventListener('sessionstart', this.boundOnSessionStart);
    this.host.renderer.xr.removeEventListener('sessionend', this.boundOnSessionEnd);
    if (this.currentSession) {
      this.detachSessionListeners(this.currentSession);
    }
    this.labelTexture.dispose();
  }

  private setupControllersAndHands(): void {
    const rayGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -2.5),
    ]);

    for (let i = 0; i < 2; i++) {
      // 1. Target Ray Controller + procedural ray beam
      const controller = this.host.renderer.xr.getController(i);
      controller.name = `XRController_${i}`;

      const rayMat = new THREE.LineBasicMaterial({
        color: 0xe6b65c,
        transparent: true,
        opacity: 0.85,
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayLine.scale.z = 1;
      controller.add(rayLine);

      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.008, 0.014, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
      );
      reticle.visible = false;
      this.xrRigGroup.add(reticle);

      this.controllerRays.push(rayLine);
      this.controllerReticles.push(reticle);
      this.controllers.push(controller);
      this.xrRigGroup.add(controller);

      // 2. Controller Grip Fallback (procedural ergonomic Quest-style wand without external GLTF CDN dependency)
      const grip = this.host.renderer.xr.getControllerGrip(i);
      grip.name = `XRControllerGrip_${i}`;
      const gripGroup = this.createProceduralControllerGrip();
      grip.add(gripGroup);
      this.controllerGrips.push(grip);
      this.xrRigGroup.add(grip);

      // 3. Left & Right Hand Tracking (XRHandModelFactory 'spheres' procedural joint spheres)
      const hand = this.host.renderer.xr.getHand(i);
      hand.name = `XRHand_${i}`;
      const handModel = this.handModelFactory.createHandModel(hand, 'spheres');
      hand.add(handModel);

      // Pinch feedback orb shown near index tip when tracked
      const pinchOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.011, 12, 12),
        new THREE.MeshBasicMaterial({
          color: 0xe6b65c,
          transparent: true,
          opacity: 0.75,
        })
      );
      pinchOrb.visible = false;
      hand.add(pinchOrb);
      this.handPinchIndicators.push(pinchOrb);

      hand.addEventListener('connected', (event) => {
        const inputSrc = (event as unknown as { data: XRInputSource }).data;
        const handedness = inputSrc?.handedness || (i === 0 ? 'left' : 'right');
        this.logEvent(
          'hand-tracking',
          inputSrc?.hand
            ? `Hand connected (${handedness})`
            : `Input connected on slot ${i} (${handedness}, no hand data)`,
          'info'
        );
        this.emitDiagnostics(true);
      });

      hand.addEventListener('disconnected', () => {
        pinchOrb.visible = false;
        this.logEvent('hand-tracking', `Hand slot ${i} disconnected`, 'warn');
        this.emitDiagnostics(true);
      });

      controller.addEventListener('connected', (event) => {
        const inputSrc = (event as unknown as { data: XRInputSource }).data;
        // Show procedural grip only when this source is a controller (not pure hand tracking)
        gripGroup.visible = !inputSrc?.hand;
        rayLine.visible = true;
        this.logEvent(
          'controller',
          `Input source ${i} connected (${inputSrc?.handedness || 'unknown'} · ${inputSrc?.targetRayMode || 'pointer'})`,
          'info'
        );
        this.emitDiagnostics(true);
      });

      controller.addEventListener('disconnected', () => {
        reticle.visible = false;
        gripGroup.visible = false;
        rayLine.visible = false;
        this.logEvent('controller', `Controller slot ${i} disconnected`, 'warn');
        this.emitDiagnostics(true);
      });

      this.hands.push(hand);
      this.xrRigGroup.add(hand);
    }
  }

  private createProceduralControllerGrip(): THREE.Group {
    const group = new THREE.Group();
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x1e222b,
      roughness: 0.45,
      metalness: 0.35,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xe6b65c,
      roughness: 0.25,
      metalness: 0.8,
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.019, 0.11, 14), handleMat);
    handle.rotation.x = Math.PI / 2.4;
    handle.position.set(0, -0.025, 0.025);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.004, 10, 24), accentMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 0.008, -0.02);

    group.add(handle, halo);
    group.visible = false;
    return group;
  }

  private setupSeatedPedestalAndHud(): void {
    // Subtle seated tabletop reference ring
    const pedestalGeo = new THREE.RingGeometry(0.32, 0.34, 48);
    pedestalGeo.rotateX(-Math.PI / 2);
    const pedestalMat = new THREE.MeshBasicMaterial({
      color: 0xe6b65c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    this.seatedPedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    this.seatedPedestalMesh.name = 'SeatedVRPedestalRing';
    this.xrRigGroup.add(this.seatedPedestalMesh);

    // Spatial Label Card + Tactile VR Action Bar
    this.vrHudGroup.name = 'VRSpatialLabelHUD';
    this.xrRigGroup.add(this.vrHudGroup);

    const cardGeo = new THREE.PlaneGeometry(0.58, 0.326);
    const cardMat = new THREE.MeshBasicMaterial({
      map: this.labelTexture,
      transparent: true,
    });
    this.labelCardMesh = new THREE.Mesh(cardGeo, cardMat);
    this.labelCardMesh.name = 'VRSpatialLabelCard';
    this.vrHudGroup.add(this.labelCardMesh);

    const buttonDefs: Array<{ action: VRHudAction; label: string; color: number; hover: number }> = [
      { action: 'prevLabel', label: '< Label', color: 0x1e293b, hover: 0x38bdf8 },
      { action: 'nextLabel', label: 'Label >', color: 0x1e293b, hover: 0x38bdf8 },
      { action: 'cycleScale', label: 'Scale', color: 0x1e293b, hover: 0xe6b65c },
      { action: 'resetScene', label: 'Reset', color: 0x2b2416, hover: 0xf59e0b },
      { action: 'exitVR', label: 'Exit VR', color: 0x451a20, hover: 0xf43f5e },
    ];

    const btnWidth = 0.106;
    const gap = 0.01;
    const totalW = buttonDefs.length * btnWidth + (buttonDefs.length - 1) * gap;
    const startX = -totalW / 2 + btnWidth / 2;

    buttonDefs.forEach((def, idx) => {
      const btnGeo = new THREE.BoxGeometry(btnWidth, 0.044, 0.012);
      const btnMat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.35,
        metalness: 0.2,
      });
      const btnMesh = new THREE.Mesh(btnGeo, btnMat);
      btnMesh.name = `VRHudButton_${def.action}`;
      btnMesh.position.set(startX + idx * (btnWidth + gap), -0.195, 0.008);
      btnMesh.userData = { vrAction: def.action };

      // Crisp canvas label face on button front
      const lblTex = this.createButtonTexture(def.label, def.action === 'exitVR' ? '#fda4af' : '#f8fafc');
      const lblPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(btnWidth - 0.008, 0.036),
        new THREE.MeshBasicMaterial({ map: lblTex, transparent: true })
      );
      lblPlane.position.z = 0.0065;
      btnMesh.add(lblPlane);

      this.vrHudGroup.add(btnMesh);
      this.vrHudButtons.push({
        mesh: btnMesh,
        action: def.action,
        label: def.label,
        baseColor: def.color,
        hoverColor: def.hover,
        material: btnMat,
      });
    });
  }

  private createButtonTexture(text: string, color: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color;
      ctx.font = '700 32px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private drawSpatialLabelCanvas(payload: AnatomicalLabelPayload): void {
    const ctx = this.labelCtx;
    const w = this.labelCanvas.width;
    const h = this.labelCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background card
    ctx.fillStyle = 'rgba(11, 13, 19, 0.94)';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 26);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = payload.accentHex || '#e6b65c';
    ctx.stroke();

    // Header badge
    ctx.fillStyle = 'rgba(230, 182, 92, 0.16)';
    ctx.beginPath();
    ctx.roundRect(38, 34, 340, 42, 10);
    ctx.fill();

    ctx.fillStyle = payload.accentHex || '#e6b65c';
    ctx.font = '700 21px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(payload.badge.slice(0, 28), 54, 55);

    // Scale tag right side
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 20px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(payload.scaleLabel.slice(0, 32), w - 42, 55);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 40px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(payload.title.slice(0, 38), 38, 122);

    // Subtitle
    ctx.fillStyle = '#e6b65c';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(payload.subtitle.slice(0, 56), 38, 164);

    // Metric box
    if (payload.metricValue) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.72)';
      ctx.beginPath();
      ctx.roundRect(38, 192, w - 76, 68, 14);
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '700 28px ui-monospace, monospace';
      ctx.fillText(payload.metricValue.slice(0, 42), 58, 226);

      if (payload.metricLabel) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '500 20px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(payload.metricLabel.slice(0, 38), w - 58, 226);
        ctx.textAlign = 'left';
      }
    }

    // Wrapped educational summary
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 25px Inter, system-ui, sans-serif';
    this.wrapText(ctx, payload.summary, 38, 294, w - 76, 34, 5);

    // Footer interaction hint + diagnostics snippet
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 19px ui-monospace, monospace';
    const handStatus = `Hand Tracking: ${this.diagnostics.features.handTracking}  |  Pinch/Trigger: Select or Move+Rotate`;
    ctx.fillText(handStatus, 38, h - 44);

    this.labelTexture.needsUpdate = true;
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let lineCount = 0;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lineCount++;
        if (lineCount >= maxLines) {
          ctx.fillText(line.trimEnd() + '...', x, y);
          return;
        }
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line.trim()) {
      ctx.fillText(line.trim(), x, y);
    }
  }

  private bindRendererEvents(): void {
    this.host.renderer.xr.addEventListener('sessionstart', this.boundOnSessionStart);
    this.host.renderer.xr.addEventListener('sessionend', this.boundOnSessionEnd);
  }

  private handleRendererSessionStart(): void {
    const session = this.host.renderer.xr.getSession();
    if (!session) return;

    this.currentSession = session;
    this.attachSessionListeners(session);

    // Snapshot desktop specimen transform so desktop mode restores cleanly on exit
    this.desktopSnapshot = {
      position: this.host.sceneContainer.position.clone(),
      quaternion: this.host.sceneContainer.quaternion.clone(),
      scale: this.host.sceneContainer.scale.clone(),
    };

    // Determine effective reference space type
    const enabledFeatures = (session as XRSession & { enabledFeatures?: string[] }).enabledFeatures;
    const hasLocalFloor = enabledFeatures ? enabledFeatures.includes('local-floor') : true;
    this.activeReferenceSpaceType = hasLocalFloor ? 'local-floor' : 'local';

    this.xrRigGroup.visible = true;
    this.host.adapter.setVRPresenting(true);
    this.recenterSeatedSpecimen();

    this.diagnostics.sessionActive = true;
    this.diagnostics.isPresenting = true;
    this.diagnostics.referenceSpaceType = this.activeReferenceSpaceType;
    this.diagnostics.environmentBlendMode = session.environmentBlendMode || 'opaque';
    this.diagnostics.visibilityState = session.visibilityState || 'visible';
    this.diagnostics.features.localFloor = hasLocalFloor ? 'active' : 'unavailable';
    this.diagnostics.features.handTracking =
      enabledFeatures && !enabledFeatures.includes('hand-tracking')
        ? 'unavailable'
        : 'awaiting-input';

    this.logEvent(
      'session',
      `WebXR session started (refSpace: ${this.activeReferenceSpaceType}, blend: ${session.environmentBlendMode})`,
      'info'
    );
    this.host.onSessionStateChange?.(true);
    this.emitDiagnostics(true);
  }

  private handleRendererSessionEnd(): void {
    if (this.currentSession) {
      this.detachSessionListeners(this.currentSession);
    }
    this.currentSession = null;
    this.activeSelectSources.clear();
    this.activeSqueezeSources.clear();
    this.hoveredHudButton = null;

    this.xrRigGroup.visible = false;
    this.host.adapter.setVRPresenting(false);

    // Restore exact pre-VR desktop transform
    if (this.desktopSnapshot) {
      this.host.sceneContainer.position.copy(this.desktopSnapshot.position);
      this.host.sceneContainer.quaternion.copy(this.desktopSnapshot.quaternion);
      this.host.sceneContainer.scale.copy(this.desktopSnapshot.scale);
      this.desktopSnapshot = null;
    }

    this.diagnostics.sessionActive = false;
    this.diagnostics.isPresenting = false;
    this.diagnostics.referenceSpaceType = 'none';
    this.diagnostics.viewerTrackingState = 'unavailable';
    this.diagnostics.inputSources = [];
    this.diagnostics.activeInteractionSource = null;
    this.diagnostics.isManipulatingSpecimen = false;
    this.diagnostics.features.handTracking = this.diagnostics.isImmersiveVRSupported ? 'available' : 'unsupported';
    this.diagnostics.features.localFloor = this.diagnostics.isImmersiveVRSupported ? 'available' : 'unsupported';

    this.logEvent('session', 'WebXR session ended — desktop scene restored', 'info');
    this.host.onSessionStateChange?.(false);
    this.emitDiagnostics(true);
  }

  private attachSessionListeners(session: XRSession): void {
    session.addEventListener('inputsourceschange', this.boundOnInputSourcesChange);
    session.addEventListener('selectstart', this.boundOnSessionSelectStart);
    session.addEventListener('select', this.boundOnSessionSelect);
    session.addEventListener('selectend', this.boundOnSessionSelectEnd);
    session.addEventListener('squeezestart', this.boundOnSessionSqueezeStart);
    session.addEventListener('squeezeend', this.boundOnSessionSqueezeEnd);
  }

  private detachSessionListeners(session: XRSession): void {
    session.removeEventListener('inputsourceschange', this.boundOnInputSourcesChange);
    session.removeEventListener('selectstart', this.boundOnSessionSelectStart);
    session.removeEventListener('select', this.boundOnSessionSelect);
    session.removeEventListener('selectend', this.boundOnSessionSelectEnd);
    session.removeEventListener('squeezestart', this.boundOnSessionSqueezeStart);
    session.removeEventListener('squeezeend', this.boundOnSessionSqueezeEnd);
  }

  private handleInputSourcesChange(event: XRInputSourcesChangeEvent): void {
    for (const added of event.added) {
      this.logEvent(
        'inputsourceschange',
        `Added ${added.hand ? 'hand' : 'controller'} (${added.handedness}, ${added.targetRayMode})`,
        'info'
      );
    }
    for (const removed of event.removed) {
      this.activeSelectSources.delete(removed);
      this.activeSqueezeSources.delete(removed);
      this.logEvent(
        'inputsourceschange',
        `Removed ${removed.hand ? 'hand' : 'controller'} (${removed.handedness})`,
        'warn'
      );
    }
    this.emitDiagnostics(true);
  }

  private resolveSourceRay(inputSource: XRInputSource): {
    sourceId: string;
    sourceType: 'hand' | 'controller';
    origin: THREE.Vector3;
    direction: THREE.Vector3;
    orientation: THREE.Quaternion;
  } | null {
    if (!this.currentSession) return null;
    const sources = Array.from(this.currentSession.inputSources);
    const idx = sources.indexOf(inputSource);
    const slot = idx >= 0 && idx < 2 ? idx : inputSource.handedness === 'right' ? 1 : 0;
    const isHand = Boolean(inputSource.hand);
    const controller = this.controllers[slot];
    const hand = this.hands[slot];

    if (isHand && hand) {
      const indexTip = hand.joints?.['index-finger-tip'];
      const thumbTip = hand.joints?.['thumb-tip'];
      if (indexTip?.visible && thumbTip?.visible) {
        indexTip.getWorldPosition(this.tempHandPos);
        thumbTip.getWorldPosition(this.tempThumbPos);
        this.tempOrigin.lerpVectors(this.tempHandPos, this.tempThumbPos, 0.5);
        hand.getWorldQuaternion(this.tempHandQuat);

        // Compute ray direction from controller target ray if available, otherwise forward from hand
        if (controller) {
          this.tempMatrix.identity().extractRotation(controller.matrixWorld);
          this.tempDirection.set(0, 0, -1).applyMatrix4(this.tempMatrix).normalize();
        } else {
          this.tempDirection.set(0, 0, -1).applyQuaternion(this.tempHandQuat).normalize();
        }

        return {
          sourceId: `xr-hand-${inputSource.handedness}-${slot}`,
          sourceType: 'hand',
          origin: this.tempOrigin.clone(),
          direction: this.tempDirection.clone(),
          orientation: this.tempHandQuat.clone(),
        };
      }
    }

    if (controller) {
      controller.getWorldPosition(this.tempOrigin);
      controller.getWorldQuaternion(this.tempQuat);
      this.tempMatrix.identity().extractRotation(controller.matrixWorld);
      this.tempDirection.set(0, 0, -1).applyMatrix4(this.tempMatrix).normalize();
      return {
        sourceId: `xr-ctrl-${inputSource.handedness}-${slot}`,
        sourceType: isHand ? 'hand' : 'controller',
        origin: this.tempOrigin.clone(),
        direction: this.tempDirection.clone(),
        orientation: this.tempQuat.clone(),
      };
    }

    return null;
  }

  private handleSessionSelectStart(event: XRInputSourceEvent): void {
    const inputSource = event.inputSource;
    this.activeSelectSources.add(inputSource);
    const ray = this.resolveSourceRay(inputSource);
    if (!ray) return;

    const res = this.host.adapter.beginXRInteraction(
      ray.sourceId,
      ray.sourceType,
      ray.origin,
      ray.direction,
      ray.orientation
    );

    this.logEvent(
      ray.sourceType,
      `selectstart (${inputSource.handedness}) -> ${res.kind}`,
      'info'
    );
    this.emitDiagnostics(true);
  }

  private handleSessionSelect(event: XRInputSourceEvent): void {
    const inputSource = event.inputSource;
    const ray = this.resolveSourceRay(inputSource);
    this.logEvent(
      inputSource.hand ? 'hand' : 'controller',
      `select (${inputSource.handedness})`,
      'info'
    );
    if (!this.activeSelectSources.has(inputSource) && ray) {
      this.host.adapter.endXRInteraction(ray.sourceId, ray.origin, ray.direction);
    }
    this.emitDiagnostics(true);
  }

  private handleSessionSelectEnd(event: XRInputSourceEvent): void {
    const inputSource = event.inputSource;
    this.activeSelectSources.delete(inputSource);
    const ray = this.resolveSourceRay(inputSource);
    if (!ray) return;

    this.host.adapter.endXRInteraction(ray.sourceId, ray.origin, ray.direction);
    this.refreshSpatialLabel(true);
    this.emitDiagnostics(true);
  }

  private updateInputVisualsAndManipulation(
    slot: number,
    source: XRInputSource,
    ctrlObj: THREE.XRTargetRaySpace | undefined,
    handObj: THREE.XRHandSpace | undefined,
    visibleJoints: number,
    trackingState: XRTrackingState,
    delta: number
  ): void {
    const rayLine = this.controllerRays[slot];
    const reticle = this.controllerReticles[slot];
    const pinchOrb = this.handPinchIndicators[slot];

    // Show pinch orb near index finger tip when hand tracking is live
    if (pinchOrb && source.hand && handObj) {
      const indexTip = handObj.joints?.['index-finger-tip'];
      if (indexTip?.visible) {
        pinchOrb.visible = true;
        pinchOrb.position.copy(indexTip.position);
        (pinchOrb.material as THREE.MeshBasicMaterial).color.setHex(
          this.activeSelectSources.has(source) ? 0x38bdf8 : 0xe6b65c
        );
      } else {
        pinchOrb.visible = false;
      }
    } else if (pinchOrb) {
      pinchOrb.visible = false;
    }

    // Skip raycast or manipulation when tracking is lost to prevent wild transforms
    if (trackingState === 'lost' || trackingState === 'unavailable') {
      if (rayLine) rayLine.visible = false;
      if (reticle) reticle.visible = false;
      return;
    }

    if (rayLine) {
      rayLine.visible = !source.hand || visibleJoints > 0;
    }

    const ray = this.resolveSourceRay(source);
    if (!ray) return;

    // Hover feedback against HUD buttons & hotspots
    const hoverRes = this.host.adapter.handleHoverRay(ray.origin, ray.direction);
    if (reticle) {
      if (hoverRes.kind !== 'none' && hoverRes.point) {
        reticle.visible = true;
        reticle.position.copy(hoverRes.point);
        reticle.lookAt(this.host.renderer.xr.getCamera().position);
      } else {
        reticle.visible = false;
      }
    }

    if (slot === 1 || this.diagnostics.inputSources.length <= 1) {
      const hoveredAction = hoverRes.kind === 'hudAction' ? hoverRes.action : null;
      for (const btn of this.vrHudButtons) {
        const isHot = btn.action === hoveredAction;
        btn.material.color.setHex(isHot ? btn.hoverColor : btn.baseColor);
        if (isHot) this.hoveredHudButton = btn;
      }
    }

    // Active pinch / trigger manipulation
    if (this.activeSelectSources.has(source)) {
      this.host.adapter.updateXRInteraction(ray.sourceId, ray.origin, ray.orientation);
    }

    // Controller thumbstick fallback for seated rotation (left/right stick) and distance (right/left stick)
    if (source.gamepad && source.gamepad.axes.length >= 4) {
      const axisX = source.gamepad.axes[2] ?? 0;
      const axisY = source.gamepad.axes[3] ?? 0;
      this.host.adapter.applyThumbstickManipulation(axisX, axisY, delta, source.handedness === 'left');
    }
  }

  private getSeatedScaleFactor(scale: ScaleLevel): number {
    switch (scale) {
      case 'thoracic':
        return 0.018; // ~40 unit chest span -> ~0.72m comfortable tabletop size
      case 'vessel':
      case 'clot':
        return 0.028;
      case 'industrialCutaway':
        return 0.045;
      case 'microscopic':
      default:
        return 0.055;
    }
  }

  private logEvent(source: string, message: string, level: 'info' | 'warn' | 'error'): void {
    const entry: XREventLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      source,
      message,
      level,
    };
    this.diagnostics.events = [entry, ...this.diagnostics.events].slice(0, 14);
  }

  private emitDiagnostics(force: boolean): void {
    if (force) {
      this.lastDiagnosticsPush = performance.now();
    }
    this.host.onDiagnosticsChange(this.getDiagnostics());
  }
}
