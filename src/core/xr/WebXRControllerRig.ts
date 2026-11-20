/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
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
import { MetaQuestIntegration } from './MetaQuestIntegration.ts';

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
  rigParent: THREE.Group;
  sceneContainer: THREE.Group;
  adapter: AnatomicalInteractionAdapter;
  getCurrentScale: () => ScaleLevel;
  getZoomMultiplier?: () => number;
  onZoomDelta?: (factor: number) => void;
  computeTeleportArc?: (origin: THREE.Vector3, direction: THREE.Vector3) => {
    points: THREE.Vector3[];
    hitPoint: THREE.Vector3 | null;
    hitNormal: THREE.Vector3 | null;
    hitLabel: string | null;
    hitKind: 'anatomy' | 'floor' | 'none';
    valid: boolean;
  };
  onTeleportExecute?: (
    worldPoint: THREE.Vector3,
    hitKind: 'anatomy' | 'floor',
    hitLabel: string | null
  ) => void;
  onSnapTurn?: (angleRadians: number) => void;
  onResetLocomotion?: () => void;
  getLocomotionState?: () => { position: [number, number, number]; targetLabel: string | null };
  onDiagnosticsChange: (diagnostics: XRDiagnosticsState) => void;
  onSessionStateChange?: (isPresenting: boolean) => void;
}

const VR_SESSION_INIT_OPTIONS: XRSessionInit = {
  optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
};

const AR_SESSION_INIT_OPTIONS: XRSessionInit = {
  optionalFeatures: [
    'local-floor',
    'bounded-floor',
    'hand-tracking',
    'plane-detection',
    'mesh-detection',
    'hit-test',
    'anchors',
  ],
};

const MAX_TELEPORT_ARC_POINTS = 32;

export class WebXRControllerRig {
  private host: WebXRHost;
  private handModelFactory = new XRHandModelFactory();
  private controllerModelFactory = new XRControllerModelFactory();
  public metaQuest: MetaQuestIntegration;

  // XR rig container attached to host.rigParent (vrPlayerRig)
  public xrRigGroup = new THREE.Group();
  private controllers: THREE.XRTargetRaySpace[] = [];
  private controllerGrips: THREE.XRGripSpace[] = [];
  private proceduralGrips: THREE.Group[] = [];
  private controllerModels: THREE.Object3D[] = [];
  private hands: THREE.XRHandSpace[] = [];
  private controllerRays: THREE.Line[] = [];
  private controllerReticles: THREE.Mesh[] = [];
  private handPinchIndicators: THREE.Mesh[] = [];

  // Teleportation arc & reticle visuals in world space
  private teleportVisualGroup = new THREE.Group();
  private teleportArcLine!: THREE.Line;
  private teleportArcGeo!: THREE.BufferGeometry;
  private teleportArcMat!: THREE.LineBasicMaterial;
  private teleportTargetRing!: THREE.Mesh;
  private teleportBeaconMesh!: THREE.Mesh;
  private activeTeleportSourceSlot: number | null = null;
  private pendingTeleportHit: {
    point: THREE.Vector3;
    kind: 'anatomy' | 'floor';
    label: string | null;
  } | null = null;
  private stickTeleportArmed: [boolean, boolean] = [false, false];
  private snapTurnArmed: [boolean, boolean] = [false, false];

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
  private activeSessionMode: 'immersive-vr' | 'immersive-ar' | null = null;
  private activeReferenceSpaceType: 'local-floor' | 'local' | 'none' = 'none';
  private desktopSnapshot: DesktopSceneSnapshot | null = null;
  private arBackdropSnapshot: {
    background: THREE.Scene['background'];
    fog: THREE.Scene['fog'];
    clearColor: THREE.Color;
    clearAlpha: number;
  } | null = null;
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
  private tempUpVec = new THREE.Vector3(0, 1, 0);
  private tempHandPos = new THREE.Vector3();
  private tempHandQuat = new THREE.Quaternion();
  private tempThumbPos = new THREE.Vector3();
  private tempCamWorldPos = new THREE.Vector3();
  private hoveredActionThisFrame: VRHudAction | null = null;

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
    this.logEvent('teleport', `Teleport arc armed (${e.inputSource.handedness})`, 'info');
  };
  private boundOnSessionSqueezeEnd = (e: XRInputSourceEvent) => {
    const wasSqueezing = this.activeSqueezeSources.has(e.inputSource);
    this.activeSqueezeSources.delete(e.inputSource);
    if (wasSqueezing) {
      this.commitPendingTeleport(e.inputSource.handedness);
    }
  };

  constructor(host: WebXRHost) {
    this.host = host;

    this.xrRigGroup.name = 'WebXRRigGroup';
    this.xrRigGroup.visible = false;
    this.host.rigParent.add(this.xrRigGroup);

    this.metaQuest = new MetaQuestIntegration(
      this.host.renderer,
      this.host.scene,
      (msg) => {
        this.logEvent('meta-ratk', msg, 'info');
        this.emitDiagnostics(false);
      }
    );

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
      isMixedRealitySupported: false,
      runtimeMode: hasXR ? 'native' : 'none',
      isEmulatorActive: false,
      supportCheckError: !isSecure
        ? 'Insecure context: WebXR requires HTTPS (or localhost for desktop/emulated testing).'
        : !hasXR
        ? 'navigator.xr unavailable natively — activate Meta Quest 3 Simulator (IWER) to test VR locomotion & controls on desktop.'
        : null,
      sessionActive: false,
      sessionMode: null,
      isPresenting: false,
      referenceSpaceType: 'none',
      viewerTrackingState: 'unavailable',
      environmentBlendMode: null,
      visibilityState: null,
      features: {
        immersiveVr: hasXR ? 'unknown' : 'unsupported',
        localFloor: hasXR ? 'unknown' : 'unsupported',
        boundedFloor: hasXR ? 'unknown' : 'unsupported',
        handTracking: hasXR ? 'unknown' : 'unsupported',
      },
      inputSources: [],
      activeInteractionSource: null,
      isManipulatingSpecimen: false,
      selectedTargetLabel: null,
      ratkPlanesCount: 0,
      ratkMeshesCount: 0,
      vrZoomMultiplier: 1.0,
      locomotionPosition: [0, 0, 0],
      locomotionTargetLabel: null,
      lastError: null,
      events: [],
    };

    this.setupControllersAndHands();
    this.setupTeleportVisuals();
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
    const emulatorOn = this.metaQuest.isEmulatorActive();
    this.diagnostics.isEmulatorActive = emulatorOn;

    if (typeof navigator === 'undefined' || !navigator.xr) {
      this.diagnostics.hasNavigatorXR = false;
      this.diagnostics.isImmersiveVRSupported = false;
      this.diagnostics.isMixedRealitySupported = false;
      this.diagnostics.runtimeMode = 'none';
      this.diagnostics.features.immersiveVr = 'unsupported';
      this.diagnostics.features.handTracking = 'unsupported';
      this.diagnostics.features.localFloor = 'unsupported';
      this.diagnostics.features.boundedFloor = 'unsupported';
      this.logEvent(
        'webxr',
        this.diagnostics.isSecureContext
          ? 'navigator.xr unavailable — enable Meta Quest 3 Simulator (IWER) or use desktop controls'
          : 'Non-HTTPS context — WebXR blocked, desktop fallback active',
        'warn'
      );
      this.emitDiagnostics(true);
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-vr');
      let arSupported = false;
      try {
        arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      } catch {
        arSupported = false;
      }

      this.diagnostics.hasNavigatorXR = true;
      this.diagnostics.isImmersiveVRSupported = supported;
      this.diagnostics.isMixedRealitySupported = arSupported;
      this.diagnostics.runtimeMode = emulatorOn ? 'iwer-quest3' : supported ? 'native' : 'none';
      this.diagnostics.features.immersiveVr = supported ? 'available' : 'unsupported';
      this.diagnostics.features.localFloor = supported ? 'available' : 'unsupported';
      this.diagnostics.features.boundedFloor = supported ? 'available' : 'unsupported';
      this.diagnostics.features.handTracking = supported ? 'available' : 'unsupported';
      this.diagnostics.supportCheckError = supported
        ? null
        : 'Browser reports WebXR present, but no immersive-vr headset is attached. Try activating the Meta Quest 3 Simulator (IWER).';

      this.logEvent(
        'webxr',
        emulatorOn
          ? 'Meta Quest 3 IWER simulator active (VR + AR + Hand Tracking ready)'
          : supported
          ? `Native WebXR ready (VR: yes, MR/Passthrough: ${arSupported ? 'yes' : 'no'})`
          : 'immersive-vr unsupported on this browser — Meta Quest 3 simulator available',
        supported ? 'info' : 'warn'
      );
      this.emitDiagnostics(true);
      return supported;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.diagnostics.isImmersiveVRSupported = false;
      this.diagnostics.isMixedRealitySupported = false;
      this.diagnostics.features.immersiveVr = 'unavailable';
      this.diagnostics.supportCheckError = msg;
      this.logEvent('webxr', `immersive-vr check failed: ${msg}`, 'error');
      this.emitDiagnostics(true);
      return false;
    }
  }

  public async toggleMetaQuestEmulator(): Promise<boolean> {
    if (this.metaQuest.isEmulatorActive()) {
      if (this.currentSession) {
        await this.exitVR();
      }
      this.metaQuest.disableQuestEmulator();
      this.logEvent('meta-iwer', 'Disabled Meta Quest 3 desktop simulator', 'info');
      await this.checkXRSupport();
      return false;
    }

    const ok = this.metaQuest.enableQuestEmulator();
    if (ok) {
      this.logEvent('meta-iwer', 'Activated Meta Quest 3 IWER runtime + DevUI overlay', 'info');
    } else {
      this.logEvent('meta-iwer', 'Failed to start Meta Quest 3 IWER runtime', 'error');
    }
    await this.checkXRSupport();
    return ok;
  }

  /**
   * Mounts Three.js's official VRButton inside a target React container slot.
   */
  public mountVRButton(container: HTMLElement): () => void {
    container.innerHTML = '';
    const vrBtn = VRButton.createButton(this.host.renderer, VR_SESSION_INIT_OPTIONS);
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
    vrBtn.style.letterSpacing = '0.08em';
    vrBtn.style.background = '#F5D547';
    vrBtn.style.color = '#141514';
    vrBtn.style.border = '1px solid #141514';
    vrBtn.style.display = 'inline-flex';
    vrBtn.style.alignItems = 'center';
    vrBtn.style.justifyContent = 'center';
    vrBtn.style.cursor = 'pointer';

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
   * Programmatic Enter VR / Mixed Reality entry point (synchronized with renderer.xr session events).
   */
  public async enterVR(mode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr'): Promise<boolean> {
    if (this.currentSession) return true;

    if (!this.diagnostics.isSecureContext && !this.metaQuest.isEmulatorActive()) {
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
      this.activeSessionMode = mode;
      this.host.renderer.xr.setReferenceSpaceType('local-floor');
      const initOpts = mode === 'immersive-ar' ? AR_SESSION_INIT_OPTIONS : VR_SESSION_INIT_OPTIONS;
      const session = await navigator.xr.requestSession(mode, initOpts);

      try {
        await this.host.renderer.xr.setSession(session);
      } catch {
        // Fallback if 'local-floor' reference space is unsupported by runtime
        this.logEvent('webxr', 'local-floor unavailable, falling back to local reference space', 'warn');
        this.host.renderer.xr.setReferenceSpaceType('local');
        await this.host.renderer.xr.setSession(session);
      }
      return true;
    } catch (err) {
      this.activeSessionMode = null;
      const msg = err instanceof Error ? err.message : String(err);
      this.diagnostics.lastError = msg;
      this.logEvent('webxr', `Enter ${mode} failed: ${msg}`, 'error');
      this.emitDiagnostics(true);
      return false;
    }
  }

  public async exitVR(): Promise<void> {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore pointer lock exit errors
      }
    }

    const activeSession = this.currentSession || this.host.renderer.xr.getSession();
    if (activeSession) {
      try {
        await activeSession.end();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logEvent('webxr', `Session end notice: ${msg}`, 'warn');
        // Safety fallback if runtime failed to fire sessionend
        if (this.currentSession || this.diagnostics.isPresenting) {
          this.handleRendererSessionEnd();
        }
      }
    } else if (this.diagnostics.isPresenting) {
      this.handleRendererSessionEnd();
    }
  }

  public async exitVRAndDisableEmulator(): Promise<void> {
    await this.exitVR();
    if (this.metaQuest.isEmulatorActive()) {
      this.metaQuest.disableQuestEmulator();
      this.logEvent('meta-iwer', 'Exited VR and disabled Meta Quest 3 simulator', 'info');
      await this.checkXRSupport();
    }
  }

  /**
   * Resets specimen transform to comfortable seated VR placement (if in VR)
   * or signals desktop reset when not presenting.
   */
  public recenterSeatedSpecimen(): void {
    const isLocalFloor = this.activeReferenceSpaceType === 'local-floor';
    const zoomMult = this.host.getZoomMultiplier?.() ?? 1.0;
    const scale = this.getSeatedScaleFactor(this.host.getCurrentScale()) * zoomMult;

    const specimenPos = isLocalFloor
      ? new THREE.Vector3(0, 1.05, -0.92)
      : new THREE.Vector3(0, -0.10, -0.92);

    const hudPos = isLocalFloor
      ? new THREE.Vector3(0.56, 1.12, -0.78)
      : new THREE.Vector3(0.56, -0.02, -0.78);

    this.host.onResetLocomotion?.();
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

  public applyVRZoomScale(): void {
    if (!this.host.renderer.xr.isPresenting) return;
    const zoomMult = this.host.getZoomMultiplier?.() ?? 1.0;
    const scale = this.getSeatedScaleFactor(this.host.getCurrentScale()) * zoomMult;
    this.host.sceneContainer.scale.setScalar(scale);
  }

  public refreshSpatialLabel(force = false): void {
    if (!this.host.renderer.xr.isPresenting && !force) return;
    const payload = this.host.adapter.getCurrentLabelPayload();
    const sourceLabel = this.host.adapter.getActiveSource() || 'ready';
    const zoomStr = (this.host.getZoomMultiplier?.() ?? 1).toFixed(2);
    const hash = `${payload.id}|${payload.title}|${payload.scaleLabel}|${sourceLabel}|${zoomStr}|${this.diagnostics.features.handTracking}`;
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
    this.hoveredActionThisFrame = null;

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

    // Apply unified VR HUD hover highlight across either left or right hand/controller
    this.hoveredHudButton = null;
    for (const btn of this.vrHudButtons) {
      const isHot = btn.action === this.hoveredActionThisFrame;
      btn.material.color.setHex(isHot ? btn.hoverColor : btn.baseColor);
      if (isHot) this.hoveredHudButton = btn;
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

    this.metaQuest.updateFrame(performance.now());
    this.applyVRZoomScale();

    this.diagnostics.activeInteractionSource = this.host.adapter.getActiveSource();
    this.diagnostics.isManipulatingSpecimen = this.host.adapter.isManipulating();
    this.diagnostics.selectedTargetLabel = this.host.adapter.getCurrentLabelPayload().title;
    const mqStats = this.metaQuest.getStats();
    this.diagnostics.ratkPlanesCount = mqStats.planesCount;
    this.diagnostics.ratkMeshesCount = mqStats.meshesCount;
    this.diagnostics.vrZoomMultiplier = this.host.getZoomMultiplier?.() ?? 1.0;
    const locoState = this.host.getLocomotionState?.();
    if (locoState) {
      this.diagnostics.locomotionPosition = locoState.position;
      this.diagnostics.locomotionTargetLabel = locoState.targetLabel;
    }

    if (this.activeTeleportSourceSlot === null) {
      this.teleportVisualGroup.visible = false;
    }

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
    this.metaQuest.dispose();
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
        color: 0xf5d547,
        transparent: true,
        opacity: 0.9,
      });
      const rayLine = new THREE.Line(rayGeo, rayMat);
      rayLine.scale.z = 1;
      controller.add(rayLine);

      // Keep raycast reticles in world space so they stay aligned after VR teleportation/snap-turn
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.008, 0.014, 16),
        new THREE.MeshBasicMaterial({ color: 0xf5d547, side: THREE.DoubleSide })
      );
      reticle.visible = false;
      this.host.scene.add(reticle);

      this.controllerRays.push(rayLine);
      this.controllerReticles.push(reticle);
      this.controllers.push(controller);
      this.xrRigGroup.add(controller);

      // 2. Official Meta Quest / WebXR Input Profiles controller model + procedural grip fallback
      const grip = this.host.renderer.xr.getControllerGrip(i);
      grip.name = `XRControllerGrip_${i}`;
      const gripGroup = this.createProceduralControllerGrip();
      grip.add(gripGroup);
      const controllerModel = this.controllerModelFactory.createControllerModel(grip);
      grip.add(controllerModel);
      this.proceduralGrips.push(gripGroup);
      this.controllerModels.push(controllerModel);
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
        // Show controller grip only when this source is a controller (not pure hand tracking)
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

  private setupTeleportVisuals(): void {
    this.teleportVisualGroup.name = 'VRTeleportLocomotionVisuals';
    this.teleportVisualGroup.visible = false;
    this.host.scene.add(this.teleportVisualGroup);

    const initialPts: THREE.Vector3[] = [];
    for (let i = 0; i < MAX_TELEPORT_ARC_POINTS; i++) {
      initialPts.push(new THREE.Vector3(0, 0, 0));
    }
    this.teleportArcGeo = new THREE.BufferGeometry().setFromPoints(initialPts);
    this.teleportArcMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
    });
    this.teleportArcLine = new THREE.Line(this.teleportArcGeo, this.teleportArcMat);
    this.teleportArcLine.frustumCulled = false;
    this.teleportVisualGroup.add(this.teleportArcLine);

    const ringGeo = new THREE.RingGeometry(0.14, 0.21, 32);
    ringGeo.rotateX(-Math.PI / 2);
    this.teleportTargetRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      })
    );
    this.teleportVisualGroup.add(this.teleportTargetRing);

    const beaconGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.22, 24, 1, true);
    beaconGeo.translate(0, 0.11, 0);
    this.teleportBeaconMesh = new THREE.Mesh(
      beaconGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    this.teleportVisualGroup.add(this.teleportBeaconMesh);
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
    // Stationary tabletop reference ring anchored beneath the specimen in world space
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
    this.seatedPedestalMesh.visible = false;
    this.host.scene.add(this.seatedPedestalMesh);

    // Spatial Label Card + Tactile VR Action Bar (travels with user rig)
    this.vrHudGroup.name = 'VRSpatialLabelHUD';
    this.xrRigGroup.add(this.vrHudGroup);

    const cardGeo = new THREE.PlaneGeometry(0.68, 0.34);
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
      { action: 'zoomOut', label: 'Zoom -', color: 0x1e293b, hover: 0x38bdf8 },
      { action: 'zoomIn', label: 'Zoom +', color: 0x1e293b, hover: 0x38bdf8 },
      { action: 'warpThoracic', label: 'Step In', color: 0x162b3b, hover: 0x38bdf8 },
      { action: 'cycleScale', label: 'Scale', color: 0x1e293b, hover: 0xe6b65c },
      { action: 'resetScene', label: 'Reset', color: 0x2b2416, hover: 0xf59e0b },
      { action: 'exitVR', label: 'Exit VR', color: 0x451a20, hover: 0xf43f5e },
    ];

    const btnWidth = 0.080;
    const gap = 0.006;
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
      btnMesh.position.set(startX + idx * (btnWidth + gap), -0.205, 0.008);
      btnMesh.userData = { vrAction: def.action };

      // Crisp canvas label face on button front
      const lblTex = this.createButtonTexture(def.label, def.action === 'exitVR' ? '#fda4af' : '#f8fafc');
      const lblPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(btnWidth - 0.006, 0.036),
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

    // Editorial Charcoal & Yellow Spatial Label Card
    ctx.fillStyle = 'rgba(20, 21, 20, 0.96)';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 22);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#F5D547';
    ctx.stroke();

    // Header badge
    ctx.fillStyle = '#F5D547';
    ctx.beginPath();
    ctx.roundRect(38, 34, 340, 42, 8);
    ctx.fill();

    ctx.fillStyle = '#141514';
    ctx.font = '700 20px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(payload.badge.slice(0, 26), 54, 55);

    // Scale tag right side
    ctx.fillStyle = '#B7B5AA';
    ctx.font = '600 20px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(payload.scaleLabel.slice(0, 32), w - 42, 55);

    // Title (Editorial Serif)
    ctx.fillStyle = '#FAF7EC';
    ctx.font = '700 40px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(payload.title.slice(0, 38), 38, 122);

    // Subtitle
    ctx.fillStyle = '#F5D547';
    ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
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
    ctx.font = '500 18px ui-monospace, monospace';
    const zoomStr = `${(this.host.getZoomMultiplier?.() ?? 1).toFixed(1)}x`;
    const handStatus = `Zoom: ${zoomStr}  |  Grip / L-Stick: Teleport  |  R-Stick: Zoom  |  Trigger: Select`;
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

    // Enable transparent passthrough when launching Mixed Reality (immersive-ar)
    const isPassthrough =
      this.activeSessionMode === 'immersive-ar' ||
      session.environmentBlendMode === 'alpha-blend' ||
      session.environmentBlendMode === 'additive';
    if (isPassthrough) {
      const clearColor = new THREE.Color();
      this.host.renderer.getClearColor(clearColor);
      this.arBackdropSnapshot = {
        background: this.host.scene.background,
        fog: this.host.scene.fog,
        clearColor,
        clearAlpha: this.host.renderer.getClearAlpha(),
      };
      this.host.scene.background = null;
      this.host.scene.fog = null;
      this.host.renderer.setClearColor(0x000000, 0);
    }

    // Determine effective reference space type
    const enabledFeatures = (session as XRSession & { enabledFeatures?: string[] }).enabledFeatures;
    const hasLocalFloor = enabledFeatures ? enabledFeatures.includes('local-floor') : true;
    this.activeReferenceSpaceType = hasLocalFloor ? 'local-floor' : 'local';

    this.xrRigGroup.visible = true;
    this.seatedPedestalMesh.visible = true;
    this.host.adapter.setVRPresenting(true);
    this.recenterSeatedSpecimen();

    this.diagnostics.sessionActive = true;
    this.diagnostics.sessionMode = this.activeSessionMode || 'immersive-vr';
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
      `WebXR ${this.diagnostics.sessionMode} started (refSpace: ${this.activeReferenceSpaceType}, blend: ${session.environmentBlendMode})`,
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
    this.activeSessionMode = null;
    this.activeSelectSources.clear();
    this.activeSqueezeSources.clear();
    this.activeTeleportSourceSlot = null;
    this.pendingTeleportHit = null;
    this.stickTeleportArmed = [false, false];
    this.snapTurnArmed = [false, false];
    this.hoveredHudButton = null;
    this.hoveredActionThisFrame = null;

    this.xrRigGroup.visible = false;
    this.seatedPedestalMesh.visible = false;
    this.teleportVisualGroup.visible = false;
    for (const reticle of this.controllerReticles) {
      reticle.visible = false;
    }
    this.host.onResetLocomotion?.();
    this.host.adapter.setVRPresenting(false);
    this.metaQuest.notifySessionEnded();

    // Restore scene backdrop if Mixed Reality passthrough cleared it
    if (this.arBackdropSnapshot) {
      this.host.scene.background = this.arBackdropSnapshot.background;
      this.host.scene.fog = this.arBackdropSnapshot.fog;
      this.host.renderer.setClearColor(
        this.arBackdropSnapshot.clearColor,
        this.arBackdropSnapshot.clearAlpha
      );
      this.arBackdropSnapshot = null;
    }

    // Restore exact pre-VR desktop transform
    if (this.desktopSnapshot) {
      this.host.sceneContainer.position.copy(this.desktopSnapshot.position);
      this.host.sceneContainer.quaternion.copy(this.desktopSnapshot.quaternion);
      this.host.sceneContainer.scale.copy(this.desktopSnapshot.scale);
      this.desktopSnapshot = null;
    }

    this.diagnostics.sessionActive = false;
    this.diagnostics.sessionMode = null;
    this.diagnostics.isPresenting = false;
    this.diagnostics.referenceSpaceType = 'none';
    this.diagnostics.viewerTrackingState = 'unavailable';
    this.diagnostics.inputSources = [];
    this.diagnostics.activeInteractionSource = null;
    this.diagnostics.isManipulatingSpecimen = false;
    this.diagnostics.ratkPlanesCount = 0;
    this.diagnostics.ratkMeshesCount = 0;
    this.diagnostics.locomotionPosition = [0, 0, 0];
    this.diagnostics.locomotionTargetLabel = null;
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

    // Hover feedback against HUD buttons & hotspots (world-space reticle + world-space HMD lookAt)
    const hoverRes = this.host.adapter.handleHoverRay(ray.origin, ray.direction);
    if (reticle) {
      if (hoverRes.kind !== 'none' && hoverRes.point) {
        reticle.visible = true;
        reticle.position.copy(hoverRes.point);
        this.host.renderer.xr.getCamera().getWorldPosition(this.tempCamWorldPos);
        reticle.lookAt(this.tempCamWorldPos);
      } else {
        reticle.visible = false;
      }
    }

    if (hoverRes.kind === 'hudAction' && hoverRes.action) {
      this.hoveredActionThisFrame = hoverRes.action;
    }

    // Prefer official Meta Quest / WebXR input profile model if loaded; keep procedural grip as offline fallback
    const ctrlModel = this.controllerModels[slot] as (THREE.Object3D & { motionController?: unknown }) | undefined;
    const procGrip = this.proceduralGrips[slot];
    if (procGrip && ctrlModel?.motionController) {
      procGrip.visible = false;
    }

    // Check Teleport Aiming (Grip Squeeze OR Left Thumbstick Forward)
    const slotKey = slot === 0 ? 0 : 1;
    const thumbstickX = source.gamepad && source.gamepad.axes.length >= 4 ? (source.gamepad.axes[2] ?? 0) : 0;
    const thumbstickY = source.gamepad && source.gamepad.axes.length >= 4 ? (source.gamepad.axes[3] ?? 0) : 0;

    const isLeftOrPrimaryStickTeleport = source.handedness === 'left' && thumbstickY < -0.55;
    if (isLeftOrPrimaryStickTeleport) {
      this.stickTeleportArmed[slotKey] = true;
    } else if (this.stickTeleportArmed[slotKey] && thumbstickY > -0.25) {
      this.stickTeleportArmed[slotKey] = false;
      this.commitPendingTeleport(source.handedness);
    }

    const isTeleportAiming = this.activeSqueezeSources.has(source) || this.stickTeleportArmed[slotKey];
    if (isTeleportAiming && this.host.computeTeleportArc) {
      this.activeTeleportSourceSlot = slot;
      const arc = this.host.computeTeleportArc(ray.origin, ray.direction);
      this.updateTeleportArcVisuals(arc);
      if (rayLine) rayLine.visible = false;
      if (reticle) reticle.visible = false;
    } else if (this.activeTeleportSourceSlot === slot) {
      this.activeTeleportSourceSlot = null;
      this.teleportVisualGroup.visible = false;
      this.pendingTeleportHit = null;
    }

    // Active pinch / trigger manipulation
    if (this.activeSelectSources.has(source)) {
      this.host.adapter.updateXRInteraction(ray.sourceId, ray.origin, ray.orientation);
    }

    // Controller thumbsticks:
    // - Left Thumbstick X: Comfort Snap Turn (±30°)
    // - Right Thumbstick Y: Continuous Zoom In / Zoom Out through thoracic anatomy
    // - Right Thumbstick X: Specimen Yaw Rotation
    if (source.gamepad && source.gamepad.axes.length >= 4) {
      if (source.handedness === 'left') {
        if (Math.abs(thumbstickX) > 0.68 && !this.snapTurnArmed[slotKey]) {
          this.snapTurnArmed[slotKey] = true;
          this.host.onSnapTurn?.(-Math.sign(thumbstickX) * (Math.PI / 6));
          this.logEvent('teleport', `Snap turned ${thumbstickX > 0 ? 'right' : 'left'} 30°`, 'info');
        } else if (Math.abs(thumbstickX) < 0.32) {
          this.snapTurnArmed[slotKey] = false;
        }
      } else {
        if (Math.abs(thumbstickY) > 0.18) {
          const factor = 1 - thumbstickY * 1.25 * delta;
          this.host.onZoomDelta?.(factor);
        }
        if (Math.abs(thumbstickX) > 0.18) {
          this.host.adapter.applyThumbstickManipulation(thumbstickX, 0, delta, false);
        }
      }
    }
  }

  private updateTeleportArcVisuals(arc: {
    points: THREE.Vector3[];
    hitPoint: THREE.Vector3 | null;
    hitNormal: THREE.Vector3 | null;
    hitLabel: string | null;
    hitKind: 'anatomy' | 'floor' | 'none';
    valid: boolean;
  }): void {
    if (arc.points.length < 2) {
      this.teleportVisualGroup.visible = false;
      this.pendingTeleportHit = null;
      return;
    }

    this.teleportVisualGroup.visible = true;
    const posAttr = this.teleportArcGeo.getAttribute('position') as THREE.BufferAttribute;
    const lastPt = arc.points[arc.points.length - 1];
    for (let i = 0; i < MAX_TELEPORT_ARC_POINTS; i++) {
      const pt = i < arc.points.length ? arc.points[i] : lastPt;
      posAttr.setXYZ(i, pt.x, pt.y, pt.z);
    }
    posAttr.needsUpdate = true;
    this.teleportArcGeo.setDrawRange(0, Math.min(arc.points.length, MAX_TELEPORT_ARC_POINTS));

    const arcHex = !arc.valid ? 0xf43f5e : arc.hitKind === 'anatomy' ? 0xe6b65c : 0x38bdf8;
    this.teleportArcMat.color.setHex(arcHex);
    (this.teleportTargetRing.material as THREE.MeshBasicMaterial).color.setHex(arcHex);
    (this.teleportBeaconMesh.material as THREE.MeshBasicMaterial).color.setHex(arcHex);

    if (arc.valid && arc.hitPoint && arc.hitKind !== 'none') {
      this.teleportTargetRing.visible = true;
      this.teleportBeaconMesh.visible = true;
      this.teleportTargetRing.position.copy(arc.hitPoint).addScaledVector(arc.hitNormal || this.tempUpVec, 0.015);
      this.teleportBeaconMesh.position.copy(arc.hitPoint);

      if (arc.hitNormal) {
        this.teleportTargetRing.quaternion.setFromUnitVectors(this.tempUpVec, arc.hitNormal);
      } else {
        this.teleportTargetRing.quaternion.identity();
      }

      this.pendingTeleportHit = {
        point: arc.hitPoint.clone(),
        kind: arc.hitKind,
        label: arc.hitLabel,
      };
    } else {
      this.teleportTargetRing.visible = false;
      this.teleportBeaconMesh.visible = false;
      this.pendingTeleportHit = null;
    }
  }

  private commitPendingTeleport(handedness: string): void {
    if (this.pendingTeleportHit && this.host.onTeleportExecute) {
      const { point, kind, label } = this.pendingTeleportHit;
      this.host.onTeleportExecute(point, kind, label);
      this.logEvent('teleport', `Teleported (${handedness}) -> ${label || kind}`, 'info');
    }
    this.activeTeleportSourceSlot = null;
    this.pendingTeleportHit = null;
    this.teleportVisualGroup.visible = false;
    this.emitDiagnostics(true);
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

  /**
   * Returns live world-space raycast origins & directions for all tracked VR controllers
   * (with gamepads) during an active WebXR session.
   */
  public getActiveControllerRays(): Array<{
    slot: number;
    handedness: XRHandedness;
    source: XRInputSource;
    origin: THREE.Vector3;
    direction: THREE.Vector3;
  }> {
    if (!this.host.renderer.xr.isPresenting || !this.currentSession) {
      return [];
    }

    const rays: Array<{
      slot: number;
      handedness: XRHandedness;
      source: XRInputSource;
      origin: THREE.Vector3;
      direction: THREE.Vector3;
    }> = [];

    const sources = Array.from(this.currentSession.inputSources);
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      if (source.hand || !source.gamepad) continue;
      const resolved = this.resolveSourceRay(source);
      if (!resolved) continue;
      rays.push({
        slot: i,
        handedness: source.handedness,
        source,
        origin: resolved.origin,
        direction: resolved.direction,
      });
    }

    return rays;
  }

  /**
   * Fires a single hardware haptic pulse on a VR controller via WebXR Gamepad
   * `hapticActuators` or Chromium/Quest `vibrationActuator`.
   */
  public pulseControllerHaptics(
    source: XRInputSource,
    intensity: number,
    durationMs: number
  ): boolean {
    const gamepad = source.gamepad as
      | (Gamepad & {
          hapticActuators?: Array<{ pulse?: (value: number, duration: number) => Promise<boolean> }>;
          vibrationActuator?: {
            playEffect?: (
              type: string,
              params: {
                startDelay?: number;
                duration?: number;
                weakMagnitude?: number;
                strongMagnitude?: number;
              }
            ) => Promise<string>;
          };
        })
      | null
      | undefined;

    if (!gamepad) return false;

    const clampedIntensity = THREE.MathUtils.clamp(intensity, 0.02, 1.0);
    const clampedDuration = THREE.MathUtils.clamp(Math.round(durationMs), 10, 200);

    try {
      const actuator = gamepad.hapticActuators?.[0];
      if (actuator && typeof actuator.pulse === 'function') {
        void Promise.resolve(actuator.pulse(clampedIntensity, clampedDuration)).catch(() => {});
        return true;
      }

      if (gamepad.vibrationActuator && typeof gamepad.vibrationActuator.playEffect === 'function') {
        void Promise.resolve(
          gamepad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: clampedDuration,
            weakMagnitude: Math.min(1, clampedIntensity * 0.72),
            strongMagnitude: clampedIntensity,
          })
        ).catch(() => {});
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  private emitDiagnostics(force: boolean): void {
    if (force) {
      this.lastDiagnosticsPush = performance.now();
    }
    this.host.onDiagnosticsChange(this.getDiagnostics());
  }
}
