/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type EvidenceType =
  | 'measured'
  | 'segmented'
  | 'simulated'
  | 'illustrative'
  | 'reference'
  | 'unknown';

export type ScaleLevel = 'microscopic' | 'clot' | 'vessel' | 'thoracic';

export interface BiomedicalSceneObject {
  id: string;
  name: string;
  objectType: string;
  anatomicalRegion?: string;
  geometryAssetId: string;
  materialId: string;
  coordinateSystem: string;
  spatialScale: number;
  units: 'm' | 'mm' | 'um' | 'nm';
  visible: boolean;
  opacity: number;
  evidenceType: EvidenceType;
  datasetId?: string;
  modelVersion?: string;
  metadata: Record<string, unknown>;
}

export interface FibrinNode {
  id: string;
  position: [number, number, number];
  nodeType: 'endpoint' | 'junction' | 'interior';
}

export interface FibrinEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  diameterUm: number;
  fiberClass?: string;
  crossLinked: boolean;
  intact: boolean;
}

export interface FibrinNetwork {
  id: string;
  seed: number;
  nodes: FibrinNode[];
  edges: FibrinEdge[];
  evidenceType: EvidenceType;
  modelVersion: string;
}

export interface DiseaseStage {
  id: number;
  code: string;
  name: string;
  description: string;
  mPAP: number; // mean Pulmonary Artery Pressure in mmHg (normal 14, severe > 35)
  vascularResistance: number; // Wood units (normal 1.0, severe > 4.5)
  flowObstructionPct: number; // 0 to 100%
  wallShearStressMax: number; // Pa (normal 1.2, jet > 4.5)
  clotState: 'none' | 'migrating' | 'impacting' | 'partial' | 'severe' | 'ischemia' | 'lysing' | 'resolved';
}

export interface HemodynamicsMetrics {
  flowVelocity: number; // m/s
  upstreamPressure: number; // mmHg
  downstreamPressure: number; // mmHg
  reynoldsNumber: number;
  shearStress: number; // Pa
  perfusionRatio: number; // 0 to 1
}

export interface MeasurementState {
  mode: 'none' | 'caliper' | 'crosshair';
  pointA: [number, number, number] | null;
  pointB: [number, number, number] | null;
  distance: number | null;
  unit: string;
}

export interface LayerVisibility {
  thoracicLungs: boolean;
  pulmonaryArteries: boolean;
  tracheaAirway: boolean;
  vesselWall: boolean;
  thrombusBody: boolean;
  fibrinMesh: boolean;
  redBloodCells: boolean;
  platelets: boolean;
  flowStreamlines: boolean;
  velocityColorMap: boolean;
  annotations: boolean;
}
