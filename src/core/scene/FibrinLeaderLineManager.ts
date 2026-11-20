/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ClotAnnotation } from '../../types/biomedical.ts';
import { CLOT_ANNOTATIONS } from '../../data/clotAnnotations.ts';
import { MicroscopicChamber } from './MicroscopicChamber.ts';

export interface FibrinLeaderLineItem {
  id: string;
  annotation: ClotAnnotation;
  anchorX: number;
  anchorY: number;
  elbowX: number;
  elbowY: number;
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
  visible: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

interface AnchorNodeEntry {
  annotation: ClotAnnotation;
  localPosition: THREE.Vector3;
  markerGroup: THREE.Group;
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
}

/**
 * Dynamic 3D-anchored leader-line annotation manager attached directly to the
 * MicroscopicChamber fibrin microstructure.
 *
 * Activates automatically at the microscopic (50 µm) scale, projecting real
 * fibrin junctions, platelet aggregates, entrapped erythrocytes, and interstitial
 * void channels into collision-free elbowed leader lines for clinical data pop-ups.
 */
export class FibrinLeaderLineManager {
  public readonly root = new THREE.Group();

  private chamber: MicroscopicChamber;
  private entries: AnchorNodeEntry[] = [];
  private active = false;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;
  private lastSignature = '';

  private coreGeo: THREE.SphereGeometry | null = null;
  private ringGeo: THREE.RingGeometry | null = null;

  // Reusable projection scratch vectors
  private tempWorldPos = new THREE.Vector3();
  private tempNdcPos = new THREE.Vector3();

  constructor(chamber: MicroscopicChamber) {
    this.chamber = chamber;
    this.root.name = 'FibrinMicrostructureLeaderAnchors';
    this.root.visible = false;
    this.chamber.root.add(this.root);

    this.buildAnchors();
  }

  private buildAnchors(): void {
    const microAnnotations = CLOT_ANNOTATIONS.filter((a) => a.scale === 'microscopic');
    const snappedPositions = this.chamber.getMicrostructureAnchorPositions();

    const coreGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.14, 0.195, 28);
    this.coreGeo = coreGeo;
    this.ringGeo = ringGeo;

    for (const ann of microAnnotations) {
      const snapped = snappedPositions[ann.id] ?? new THREE.Vector3(...ann.position);

      const markerGroup = new THREE.Group();
      markerGroup.name = `FibrinAnchor_${ann.id}`;
      markerGroup.position.copy(snapped);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xf5d547,
        transparent: true,
        opacity: 0.96,
        depthTest: false,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      coreMesh.renderOrder = 20;

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x141514,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.renderOrder = 19;

      markerGroup.add(ringMesh, coreMesh);
      this.root.add(markerGroup);

      this.entries.push({
        annotation: ann,
        localPosition: snapped.clone(),
        markerGroup,
        coreMesh,
        ringMesh,
        coreMat,
        ringMat,
      });
    }
  }

  /**
   * Re-snaps all 3D anchor markers whenever the fibrin network parameters change.
   */
  public syncAnchorsToMicrostructure(): void {
    const snappedPositions = this.chamber.getMicrostructureAnchorPositions();
    for (const entry of this.entries) {
      const next = snappedPositions[entry.annotation.id];
      if (next) {
        entry.localPosition.copy(next);
        entry.markerGroup.position.copy(next);
      }
    }
    this.lastSignature = '';
  }

  public getAnchorLocalPosition(id: string): THREE.Vector3 | null {
    const found = this.entries.find((e) => e.annotation.id === id);
    return found ? found.localPosition.clone() : null;
  }

  public getMicroscopicAnnotations(): ClotAnnotation[] {
    return this.entries.map((e) => e.annotation);
  }

  public setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.root.visible = active;
    if (!active) {
      this.hoveredId = null;
      this.lastSignature = '';
    }
  }

  public setSelectedId(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    this.lastSignature = '';
  }

  public setHoveredId(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.lastSignature = '';
  }

  /**
   * Projects 3D fibrin microstructure anchors into screen-space elbowed leader lines
   * with automatic vertical de-collision so labels never overlap during orbiting or zooming.
   * Returns a new array only when visual output changes, or `null` if unchanged.
   */
  public update(
    camera: THREE.Camera,
    viewportWidth: number,
    viewportHeight: number,
    elapsedSeconds: number,
    isSidebarCollapsed: boolean
  ): FibrinLeaderLineItem[] | null {
    if (!this.active || viewportWidth <= 0 || viewportHeight <= 0) {
      if (this.lastSignature !== 'INACTIVE') {
        this.lastSignature = 'INACTIVE';
        return [];
      }
      return null;
    }

    // Safe viewport margins keeping clear of LeftNav, top-left readout, and bottom-right ZoomControlsBar
    const isDesktop = viewportWidth >= 768;
    const leftSafe = isDesktop ? (isSidebarCollapsed ? 92 : 298) : 16;
    const rightSafe = viewportWidth - 16;
    const topSafe = isDesktop ? 92 : 72;
    const bottomSafe = viewportHeight - 92;
    const centerX = (leftSafe + rightSafe) * 0.5;

    interface RawProjection {
      entry: AnchorNodeEntry;
      anchorX: number;
      anchorY: number;
      side: 'left' | 'right';
      visible: boolean;
    }

    const projected: RawProjection[] = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const isSelected = this.selectedId === entry.annotation.id;
      const isHovered = this.hoveredId === entry.annotation.id;

      // Subtle billboard orientation & scale emphasis on the 3D fibrin surface pin
      entry.ringMesh.lookAt(camera.position);
      const pulse = 1.0 + (isSelected ? 0.28 : isHovered ? 0.2 : 0.08) * Math.sin(elapsedSeconds * 3.4 + i * 1.1);
      entry.ringMesh.scale.setScalar(pulse * (isSelected ? 1.35 : isHovered ? 1.2 : 1.0));
      entry.coreMesh.scale.setScalar(isSelected ? 1.35 : isHovered ? 1.2 : 1.0);
      entry.coreMat.color.setHex(isSelected || isHovered ? 0xf5d547 : 0xfaf7ec);
      entry.ringMat.color.setHex(isSelected ? 0xf5d547 : 0x141514);

      entry.markerGroup.getWorldPosition(this.tempWorldPos);
      this.tempNdcPos.copy(this.tempWorldPos).project(camera);

      const isInFront = this.tempNdcPos.z > -1 && this.tempNdcPos.z < 1;
      const anchorX = Math.round((this.tempNdcPos.x * 0.5 + 0.5) * viewportWidth);
      const anchorY = Math.round((-this.tempNdcPos.y * 0.5 + 0.5) * viewportHeight);

      const inBounds =
        isInFront &&
        anchorX >= leftSafe - 24 &&
        anchorX <= rightSafe + 24 &&
        anchorY >= 12 &&
        anchorY <= viewportHeight - 12;

      const side: 'left' | 'right' = anchorX < centerX ? 'left' : 'right';

      projected.push({
        entry,
        anchorX,
        anchorY,
        side,
        visible: inBounds,
      });
    }

    // Separate into left & right stacks and de-collide vertically so callouts stay legible
    const leftGroup = projected
      .filter((p) => p.visible && p.side === 'left')
      .sort((a, b) => a.anchorY - b.anchorY);
    const rightGroup = projected
      .filter((p) => p.visible && p.side === 'right')
      .sort((a, b) => a.anchorY - b.anchorY);

    const minVerticalGap = isDesktop ? 66 : 56;

    const distributeY = (items: RawProjection[]): number[] => {
      if (items.length === 0) return [];
      const ys = items.map((item) => Math.max(topSafe, Math.min(bottomSafe, item.anchorY)));

      // Forward push down
      for (let i = 1; i < ys.length; i++) {
        if (ys[i] - ys[i - 1] < minVerticalGap) {
          ys[i] = ys[i - 1] + minVerticalGap;
        }
      }
      // Clamp bottom and push back up if overflowed
      const overflow = ys[ys.length - 1] - bottomSafe;
      if (overflow > 0) {
        for (let i = ys.length - 1; i >= 0; i--) {
          ys[i] -= overflow;
          if (i > 0 && ys[i] - ys[i - 1] < minVerticalGap) {
            ys[i - 1] = ys[i] - minVerticalGap;
          }
        }
      }
      // Final safe clamp
      for (let i = 0; i < ys.length; i++) {
        ys[i] = Math.round(Math.max(topSafe, Math.min(bottomSafe, ys[i])));
      }
      return ys;
    };

    const leftYs = distributeY(leftGroup);
    const rightYs = distributeY(rightGroup);

    const labelWidth = isDesktop ? 214 : 168;
    const leftLabelEdgeX = Math.round(leftSafe + labelWidth);
    const rightLabelEdgeX = Math.round(rightSafe - labelWidth);

    const results: FibrinLeaderLineItem[] = [];

    const buildItem = (p: RawProjection, labelY: number): FibrinLeaderLineItem => {
      const isLeft = p.side === 'left';
      // Elbow lands horizontally cleanly between anchor and label card
      const labelX = isLeft
        ? Math.min(leftLabelEdgeX, Math.max(leftSafe + 120, p.anchorX - 36))
        : Math.max(rightLabelEdgeX, Math.min(rightSafe - 120, p.anchorX + 36));

      const horizontalLead = isDesktop ? 28 : 16;
      const elbowX = isLeft
        ? Math.round(Math.min(p.anchorX - 10, labelX + horizontalLead))
        : Math.round(Math.max(p.anchorX + 10, labelX - horizontalLead));
      const elbowY = labelY;

      return {
        id: p.entry.annotation.id,
        annotation: p.entry.annotation,
        anchorX: p.anchorX,
        anchorY: p.anchorY,
        elbowX,
        elbowY,
        labelX: Math.round(labelX),
        labelY,
        side: p.side,
        visible: true,
        isSelected: this.selectedId === p.entry.annotation.id,
        isHovered: this.hoveredId === p.entry.annotation.id,
      };
    };

    leftGroup.forEach((p, idx) => results.push(buildItem(p, leftYs[idx])));
    rightGroup.forEach((p, idx) => results.push(buildItem(p, rightYs[idx])));

    // Stable order by annotation id so React DOM nodes never thrash
    results.sort((a, b) => a.id.localeCompare(b.id));

    const sig = results
      .map(
        (r) =>
          `${r.id}:${r.anchorX},${r.anchorY},${r.elbowX},${r.elbowY},${r.labelX},${r.labelY},${r.side},${r.isSelected ? 1 : 0},${r.isHovered ? 1 : 0}`
      )
      .join('|');

    if (sig === this.lastSignature) {
      return null;
    }
    this.lastSignature = sig;
    return results;
  }

  public dispose(): void {
    for (const entry of this.entries) {
      entry.coreMat.dispose();
      entry.ringMat.dispose();
      this.root.remove(entry.markerGroup);
    }
    this.coreGeo?.dispose();
    this.ringGeo?.dispose();
    this.coreGeo = null;
    this.ringGeo = null;
    this.entries = [];
    this.chamber.root.remove(this.root);
  }
}
