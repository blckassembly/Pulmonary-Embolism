/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { XRDevice, metaQuest3 } from 'iwer';
import { DevUI } from '@iwer/devui';
import { RealityAccelerator } from 'ratk';

export interface MetaQuestRuntimeStats {
  emulatorActive: boolean;
  planesCount: number;
  meshesCount: number;
  anchorsCount: number;
}

/**
 * Integrates Meta's WebXR developer ecosystem packages from developers.meta.com/vr:
 * - `iwer` + `@iwer/devui`: Official Meta Quest 3 WebXR emulation runtime & controller/hand DevUI
 *   for desktop testing without a physical headset.
 * - `ratk`: Meta Reality Accelerator Toolkit for Mixed Reality planes, room meshes, & spatial anchors.
 */
export class MetaQuestIntegration {
  public ratk: RealityAccelerator;
  private xrDevice: XRDevice | null = null;
  private isEmulatorEnabled = false;
  private onAnchorNotice?: (message: string) => void;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    onAnchorNotice?: (message: string) => void
  ) {
    this.onAnchorNotice = onAnchorNotice;
    this.ratk = new RealityAccelerator(renderer.xr);
    this.ratk.root.name = 'MetaRATKRoot';
    scene.add(this.ratk.root);

    this.ratk.onPlaneAdded = (plane) => {
      // Style detected spatial planes subtly for mixed reality thoracic placement
      if (plane.planeMesh) {
        const mat = plane.planeMesh.material;
        if (mat instanceof THREE.MeshBasicMaterial) {
          mat.transparent = true;
          mat.opacity = 0.14;
          mat.color.setHex(0x38bdf8);
          mat.wireframe = true;
        }
      }
      this.onAnchorNotice?.(`RATK detected spatial plane (${plane.orientation || 'surface'})`);
    };

    this.ratk.onMeshAdded = (rmesh) => {
      if (rmesh.meshMesh) {
        const mat = rmesh.meshMesh.material;
        if (mat instanceof THREE.MeshBasicMaterial) {
          mat.transparent = true;
          mat.opacity = 0.08;
          mat.wireframe = true;
        }
      }
    };
  }

  public isEmulatorActive(): boolean {
    return this.isEmulatorEnabled;
  }

  /**
   * Activates Meta's IWER (Immersive Web Emulation Runtime) configured as a Meta Quest 3
   * with the interactive @iwer/devui overlay so VR locomotion, controllers, and hand tracking
   * can be tested directly in any desktop browser.
   */
  public enableQuestEmulator(): boolean {
    if (this.isEmulatorEnabled && this.xrDevice) return true;

    try {
      const device = new XRDevice(metaQuest3, {
        stereoEnabled: false,
      });
      device.installRuntime({
        polyfillLayers: true,
        forceInstall: true,
      });
      device.installDevUI(DevUI);
      this.xrDevice = device;
      this.isEmulatorEnabled = true;
      return true;
    } catch (err) {
      console.warn('Meta IWER Quest 3 emulator initialization failed:', err);
      this.disableQuestEmulator();
      return false;
    }
  }

  public disableQuestEmulator(): void {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // Ignore pointer lock exit errors
      }
    }
    if (this.xrDevice) {
      try {
        const devui = this.xrDevice.devui as
          | (DevUI & { dispose?: () => void; devUIContainer?: HTMLElement })
          | undefined;
        devui?.dispose?.();
        if (devui?.devUIContainer?.parentElement) {
          devui.devUIContainer.parentElement.removeChild(devui.devUIContainer);
        }
      } catch {
        // Ignore cleanup errors from overlay DOM
      }
      try {
        this.xrDevice.uninstallRuntime();
      } catch {
        // Ignore runtime uninstall errors
      }
      this.xrDevice = null;
    }
    this.isEmulatorEnabled = false;
  }

  public notifySessionEnded(): void {
    if (this.xrDevice?.devui?.onSessionEnd) {
      this.xrDevice.devui.onSessionEnd();
    }
  }

  public updateFrame(timeMs: number): void {
    try {
      this.ratk.update();
    } catch {
      // Safe no-op if session lacks plane/mesh detection modules
    }

    if (this.isEmulatorEnabled && this.xrDevice?.devui) {
      this.xrDevice.devui.render(timeMs);
    }
  }

  public async anchorSpecimenInSpace(position: THREE.Vector3, quaternion: THREE.Quaternion): Promise<boolean> {
    try {
      await this.ratk.createAnchor(position, quaternion, false);
      this.onAnchorNotice?.('Created RATK spatial anchor at specimen pose');
      return true;
    } catch {
      return false;
    }
  }

  public getStats(): MetaQuestRuntimeStats {
    return {
      emulatorActive: this.isEmulatorEnabled,
      planesCount: this.ratk.planes.size,
      meshesCount: this.ratk.meshes.size,
      anchorsCount: this.ratk.anchors.size,
    };
  }

  public dispose(): void {
    this.disableQuestEmulator();
  }
}
