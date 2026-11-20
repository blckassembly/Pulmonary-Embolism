/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExplorerAnatomyId, ScaleLevel } from './biomedical.ts';

export type InteractionSourceType = 'mouse' | 'touch' | 'controller' | 'hand';

export type DesktopInteractionMode = 'orbit' | 'manipulate';

export type XRTrackingState = 'tracked' | 'emulated' | 'lost' | 'unavailable';

export type XRFeatureStatus =
  | 'available'
  | 'active'
  | 'awaiting-input'
  | 'unavailable'
  | 'unsupported'
  | 'unknown';

export interface XRInputSourceInfo {
  id: string;
  index: number;
  handedness: 'left' | 'right' | 'none';
  targetRayMode: 'gaze' | 'tracked-pointer' | 'screen' | 'transient-pointer' | string;
  profiles: string[];
  hasHand: boolean;
  handJointCount: number;
  visibleHandJoints: number;
  hasGamepad: boolean;
  gamepadButtonsPressed: number;
  trackingState: XRTrackingState;
  isSelecting: boolean;
  isSqueezing: boolean;
  kind: 'hand' | 'controller' | 'pointer';
}

export interface XREventLogEntry {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface XRDiagnosticsState {
  isSecureContext: boolean;
  protocol: string;
  hasNavigatorXR: boolean;
  isImmersiveVRSupported: boolean | null; // null = checking
  isMixedRealitySupported: boolean;
  runtimeMode: 'native' | 'iwer-quest3' | 'none';
  isEmulatorActive: boolean;
  supportCheckError: string | null;
  sessionActive: boolean;
  sessionMode: 'immersive-vr' | 'immersive-ar' | null;
  isPresenting: boolean;
  referenceSpaceType: 'local-floor' | 'local' | 'none';
  viewerTrackingState: XRTrackingState;
  environmentBlendMode: string | null;
  visibilityState: string | null;
  features: {
    immersiveVr: XRFeatureStatus;
    localFloor: XRFeatureStatus;
    boundedFloor: XRFeatureStatus;
    handTracking: XRFeatureStatus;
  };
  inputSources: XRInputSourceInfo[];
  activeInteractionSource: InteractionSourceType | null;
  isManipulatingSpecimen: boolean;
  selectedTargetLabel: string | null;
  ratkPlanesCount: number;
  ratkMeshesCount: number;
  vrZoomMultiplier: number;
  locomotionPosition: [number, number, number];
  locomotionTargetLabel: string | null;
  lastError: string | null;
  events: XREventLogEntry[];
}

export interface AnatomicalLabelPayload {
  id: string;
  kind: 'annotation' | 'structure' | 'specimen';
  title: string;
  subtitle: string;
  badge: string;
  metricValue?: string;
  metricLabel?: string;
  summary: string;
  scaleLabel: string;
  accentHex: string;
  structureId?: ExplorerAnatomyId;
  scale?: ScaleLevel;
}

export interface SpecimenPlacementConfig {
  seatedPosition: [number, number, number];
  localFallbackPosition: [number, number, number];
  hudPosition: [number, number, number];
  hudLocalFallbackPosition: [number, number, number];
}

export interface VRPerformanceTelemetry {
  fps: number;
  minFps: number;
  frameTimeMs: number;
  maxFrameTimeMs: number;
  frameHistoryMs: number[];
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  pixelRatio: number;
  jsHeapMB: number | null;
  sessionKind: 'immersive-vr' | 'immersive-ar' | 'quest-sim';
  scale: ScaleLevel;
  isSoftwareGl: boolean;
}

