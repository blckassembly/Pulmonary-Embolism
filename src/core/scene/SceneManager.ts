/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LayerVisibility, ScaleLevel } from '../../types/biomedical.ts';
import { createThoracicOrganGroup } from '../procedural/thoracicGeometry.ts';
import { createEmbolusMacroMesh, createVesselCutawayGroup, HemodynamicParticles } from '../procedural/vesselGeometry.ts';
import { MicroscopicChamber } from './MicroscopicChamber.ts';

export interface SceneManagerCallbacks {
  onHoverObject?: (name: string | null) => void;
  onMeasurePoint?: (point: [number, number, number]) => void;
}

export class SceneManager {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Multi-scale scene roots
  public microscopicChamber: MicroscopicChamber;
  public vesselCutawayGroup: THREE.Group;
  public embolusMacroMesh: THREE.Mesh;
  public thoracicGroup: THREE.Group;
  public flowParticles: HemodynamicParticles;

  // Interactive tools
  public clippingPlane: THREE.Plane;
  private currentClipAxis: 'none' | 'x' | 'y' | 'z' = 'none';
  private clipConstant = 0;

  // Camera targets for multi-scale navigation
  private targetCameraPos = new THREE.Vector3(0, 0, 14);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private currentLookAt = new THREE.Vector3(0, 0, 0);
  private currentScale: ScaleLevel = 'microscopic';

  // Orbit / Interaction state
  private isPointerDown = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  private spherical = new THREE.Spherical(14, Math.PI / 2.2, 0);

  // Animation & timing
  private clock = new THREE.Clock();
  private frameId = 0;
  private isSoftwareGl = false;
  private callbacks: SceneManagerCallbacks = {};

  // Exploded view offset factor
  private explodeOffset = 0;

  constructor(container: HTMLDivElement, callbacks: SceneManagerCallbacks = {}) {
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

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080808); // obsidian research background
    this.scene.fog = new THREE.FogExp2(0x080808, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 14);

    // 4. Studio Environment Lighting
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light (warm technical gold tint)
    const keyLight = new THREE.DirectionalLight(0xfff3db, 2.4);
    keyLight.position.set(12, 18, 15);
    keyLight.castShadow = !this.isSoftwareGl;
    this.scene.add(keyLight);

    // Cool Hemisphere Fill
    const hemiLight = new THREE.HemisphereLight(0x7da4d4, 0x1b1b22, 1.2);
    this.scene.add(hemiLight);

    // Rim Light (sharp biological edge definition)
    const rimLight = new THREE.DirectionalLight(0xe6b65c, 2.0);
    rimLight.position.set(-15, -10, -12);
    this.scene.add(rimLight);

    // 5. Build Sub-Scenes
    // Scale D: Microscopic Chamber (Active by default)
    this.microscopicChamber = new MicroscopicChamber();
    this.scene.add(this.microscopicChamber.root);

    // Scale B & C: Vessel Cutaway & Macro Clot
    this.vesselCutawayGroup = createVesselCutawayGroup();
    this.vesselCutawayGroup.visible = false;
    this.scene.add(this.vesselCutawayGroup);

    this.embolusMacroMesh = createEmbolusMacroMesh();
    this.embolusMacroMesh.visible = false;
    this.scene.add(this.embolusMacroMesh);

    this.flowParticles = new HemodynamicParticles();
    this.flowParticles.mesh.visible = false;
    this.scene.add(this.flowParticles.mesh);

    // Scale A: Thoracic Organ Anatomy
    this.thoracicGroup = createThoracicOrganGroup();
    this.thoracicGroup.visible = false;
    this.scene.add(this.thoracicGroup);

    // 6. Clipping plane
    this.clippingPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    // 7. Interaction Listeners
    this.setupPointerControls(container);

    // 8. Start Loop
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);
  }

  private setupPointerControls(container: HTMLDivElement): void {
    const onDown = (e: MouseEvent | TouchEvent) => {
      this.isPointerDown = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isPointerDown) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - this.prevPointerX;
      const deltaY = clientY - this.prevPointerY;
      this.prevPointerX = clientX;
      this.prevPointerY = clientY;

      // Orbit controls math
      this.spherical.theta -= deltaX * 0.006;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi - deltaY * 0.006));
    };

    const onUp = () => {
      this.isPointerDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 1.0 + Math.sign(e.deltaY) * 0.08;
      this.spherical.radius = Math.max(3.5, Math.min(180, this.spherical.radius * zoomFactor));
    };

    container.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    container.addEventListener('touchstart', onDown);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    container.addEventListener('wheel', onWheel, { passive: false });
  }

  public setScale(scale: ScaleLevel): void {
    this.currentScale = scale;

    // Reset visibility based on scale
    this.microscopicChamber.root.visible = scale === 'microscopic';
    this.vesselCutawayGroup.visible = scale === 'vessel' || scale === 'clot';
    this.embolusMacroMesh.visible = scale === 'vessel' || scale === 'clot';
    this.flowParticles.mesh.visible = scale === 'vessel' || scale === 'clot';
    this.thoracicGroup.visible = scale === 'thoracic';

    // Set camera target distances
    switch (scale) {
      case 'microscopic':
        this.spherical.radius = 13.5;
        this.spherical.phi = Math.PI / 2.2;
        this.targetLookAt.set(0, 0, 0);
        break;
      case 'clot':
        this.spherical.radius = 20;
        this.spherical.phi = Math.PI / 2.0;
        this.targetLookAt.set(3.5, -1.3, -0.2); // center on embolus in vessel
        break;
      case 'vessel':
        this.spherical.radius = 32;
        this.spherical.phi = Math.PI / 2.1;
        this.targetLookAt.set(2.0, 0, 0);
        break;
      case 'thoracic':
        this.spherical.radius = 70;
        this.spherical.phi = Math.PI / 2.05;
        this.targetLookAt.set(0, 2.0, 0);
        break;
    }
  }

  public setClipping(axis: 'none' | 'x' | 'y' | 'z', distance = 0, invert = false): void {
    this.currentClipAxis = axis;
    this.clipConstant = distance;

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
    this.explodeOffset = offset;
    // Displace layers along outward vectors
    if (this.currentScale === 'microscopic') {
      this.microscopicChamber.root.position.set(0, 0, 0);
      // In microscopic scale, offset RBCs slightly from fibrin web
      // Handled via group children offsets if needed
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

  public setLayers(layers: LayerVisibility): void {
    this.microscopicChamber.setVisibility(
      layers.fibrinMesh,
      layers.redBloodCells,
      layers.platelets
    );
    this.vesselCutawayGroup.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.vesselWall;
    this.embolusMacroMesh.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.thrombusBody;
    this.flowParticles.mesh.visible = (this.currentScale === 'vessel' || this.currentScale === 'clot') && layers.flowStreamlines;
    this.thoracicGroup.visible = (this.currentScale === 'thoracic') && layers.thoracicLungs;
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private tick(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Smooth camera damping towards target spherical coordinates
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-6 * delta));
    this.camera.position.copy(this.currentLookAt).add(offset);
    this.camera.lookAt(this.currentLookAt);

    // Animate flow particles if active
    if (this.flowParticles.mesh.visible) {
      this.flowParticles.update(delta, 0.75);
    }

    // Gentle organic breathing/pulsing of thoracic beacon
    if (this.thoracicGroup.visible) {
      const beacon = this.thoracicGroup.getObjectByName('EmbolusBeaconRing');
      if (beacon) {
        const time = this.clock.getElapsedTime();
        beacon.rotation.z = time * 0.5;
        const scale = 1.0 + 0.15 * Math.sin(time * 3.5);
        beacon.scale.set(scale, scale, scale);
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.tick);
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}
