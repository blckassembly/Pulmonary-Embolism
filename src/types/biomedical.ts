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

export type ScaleLevel = 'microscopic' | 'clot' | 'vessel' | 'thoracic' | 'industrialCutaway';

export interface IndustrialCalloutPoint {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  anchorX: number;
  anchorY: number;
  visible: boolean;
  align: 'left' | 'right';
  badge: string;
  description: string;
}

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


export type DrugId =
  | 'alteplase_tpa'
  | 'tenecteplase_tnk'
  | 'heparin_anticoag'
  | 'aspirin_antiplatelet'
  | 'ekos_ultrasound_cdt'
  | 'acetaminophen_apap'
  | (string & {});

export interface DrugInfo {
  id: DrugId;
  name: string;
  genericName: string;
  category:
    | 'Fibrinolytic (Thrombolytic)'
    | 'Anticoagulant'
    | 'Antiplatelet'
    | 'Catheter-Directed'
    | 'Analgesic / Antipyretic'
    | 'Non-lytic / Other';
  targetEnzyme: string;
  mechanism: string;
  dissolutionCapability: boolean; // Does it directly dissolve the clot?
  maxLysisPct: number; // 0 to 100%
  lysisRateMultiplier: number;
  clinicalRisk: string;
  indicationNotes: string;
  doseMg?: number;
  toxicityAlert?: {
    isToxic: boolean;
    severity: 'none' | 'moderate' | 'critical';
    title: string;
    details: string;
    napqiRisk?: string;
  };
}

export type EmbolismDrugClass =
  | 'fibrinolytic'
  | 'catheter_directed'
  | 'anticoagulant_direct_xa'
  | 'anticoagulant_direct_thrombin'
  | 'anticoagulant_heparin'
  | 'antiplatelet'
  | 'lipid_lowering_pleiotropic'
  | 'antidote_reversal';

export interface EmbolismDrugEntity {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  drugClass: EmbolismDrugClass;
  classLabel: string;
  targetEnzymeOrReceptor: string;
  canBreakClot: boolean; // Direct enzymatic fibrin dissolution vs halting propagation / plaque stabilization
  clotAction: 'dissolves_clot' | 'prevents_propagation' | 'stabilizes_plaque_antiinflammatory' | 'inhibits_platelet_mesh' | 'reversal_agent';
  mechanismOfAction: string;
  clinicalIndication: string;
  physicianRationale: string; // What an attending physician / interventionalist looks for in real-time
  typicalDosing: string;
  maxLysisPct: number; // 0 to 95%
  lysisRateMultiplier: number;
  onsetMinutes: number;
  bleedingRisk: 'low' | 'moderate' | 'high' | 'severe';
  reversalAgent?: string;
  keyGuideline: string;
  clinicalTrials: string[];
  uComEvidenceQuery: string; // Engineered You.com query for real-time medical literature
  contraindications?: string[];
  synonyms: string[];
  lipidOrPlaqueNote?: string;
}


export interface FibrinInspectorParams {
  networkDensity: number; // 0.1 to 1.0 (sparse to compact)
  fiberRadiusUm: number; // 0.08 to 0.50 µm
  branchProbability: number; // 0.1 to 0.95
  crossLinkProbability: number; // 0.1 to 0.95
  poreSizeUm: number; // 0.5 to 8.0 µm
  orientationBias: number; // 0 (isotropic) to 1.0 (aligned)
  nodeCount?: number;
  activePanel?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export interface ReconstructedPresentation {
  id: string;
  title: string;
  bodyPart: string;
  system: string;
  summary: string;
  imageUrls: string[];
  imageCount: number;
  createdAt: string;
  stages: DiseaseStage[];
  networkParams: FibrinInspectorParams;
  threeJsConfig: {
    primaryColorHex: string;
    accentColorHex: string;
    vesselColorHex: string;
    organScaleLabel: string;
    vesselScaleLabel: string;
    clotScaleLabel: string;
    microScaleLabel: string;
  };
  panels: {
    panelA_description: string;
    panelB_fiberRadius: string;
    panelC_crossLinks: string;
    panelD_poreArea: string;
    panelE_graphTopology: string;
    panelF_densitySummary: string;
  };
}

export type AnnotationCategory =
  | 'ultrastructure'
  | 'cellular'
  | 'hemodynamics'
  | 'biomechanical'
  | 'pharmacology';

export interface ClotAnnotation {
  id: string;
  title: string;
  scale: 'microscopic' | 'clot' | 'vessel' | 'both';
  position: [number, number, number]; // 3D coordinates in sceneContainer local space
  category: AnnotationCategory;
  metricValue: string;
  metricLabel: string;
  badge: string;
  summary: string;
  biologicalDetails: string;
  clinicalSignificance: string;
  molecularMarkers: string[];
  colorHex?: string;
}

export interface AnnotationScreenPosition {
  id: string;
  x: number; // viewport pixel x
  y: number; // viewport pixel y
  visible: boolean;
  isInFront: boolean;
}

export interface YouSearchResultItem {
  title: string;
  url: string;
  description: string;
  highlights?: string[];
  favicon?: string;
  pageAge?: string;
  domain: string;
}

export interface YouSearchResponse {
  success: boolean;
  query: string;
  mode: 'search' | 'answer';
  source: 'you_rest_api' | 'you_mcp_free';
  latencyMs: number;
  answer?: string;
  results: YouSearchResultItem[];
  count: number;
  error?: string;
}

export interface YouMcpInfoResponse {
  success: boolean;
  service: string;
  status: {
    apiKeyConfigured: boolean;
    mcpHealthy: boolean;
    mcpPingMs: number;
    activeSource: string;
  };
  mcpServerUrl: string;
  mcpFreeUrl: string;
  availableTools: Array<{ name: string; description: string }>;
  restEndpoints: {
    webSearch: string;
    answer: string;
    contents: string;
  };
  configs: {
    claudeCodeCli: string;
    cursorMcp: {
      mcpServers: Record<string, { url: string; headers?: Record<string, string> }>;
    };
    claudeDesktop: {
      mcpServers: Record<string, { url: string }>;
    };
  };
}

// ----------------------------------------------------
// Embolism Explorer: Cited Conversational Learning Layer
// ----------------------------------------------------
export type ExplorerAnatomyId = 'deepVeins' | 'heart' | 'pulmonaryArtery' | 'lungs';

export interface AnatomyStructureInfo {
  id: ExplorerAnatomyId;
  label: string;
  sublabel: string;
  badge: string;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  prewrittenExplanation: string;
  clinicalRole: string;
  suggestedQuestions: string[];
  clotPathCheckpoint: number; // 0.0 to 1.0 progress along clot path
}

export interface ExplainViewSource {
  title: string;
  organization: string;
  url: string;
  accessDate?: string;
  snippet?: string;
}

export interface ExplainViewResponse {
  success: boolean;
  anatomyLabel: string;
  question: string;
  answer: string;
  sources: ExplainViewSource[];
  apiProvider?: string;
  isEmergencyPrompt: boolean;
  emergencyNotice: string | null;
  disclaimer: string;
  error?: string;
}

export type XdcNetworkId = 'mainnet' | 'apothem';

export interface XdcNetworkStatusResponse {
  success: boolean;
  network: XdcNetworkId;
  endpointUsed: string;
  wsEndpoint: string;
  chainIdDecimal: number;
  chainIdHex: string;
  blockNumber: number;
  blockNumberHex: string;
  gasPriceGwei: string;
  error?: string;
  rpcCode?: number;
}

export interface XdcBalanceResponse {
  success: boolean;
  network: XdcNetworkId;
  endpointUsed: string;
  evmAddress: string;
  xdcAddress: string;
  balanceWeiHex: string;
  balanceXdc: string;
  blockNumberHex?: string;
  error?: string;
  rpcCode?: number;
}

export interface XdcTransactionResponse {
  success: boolean;
  network: XdcNetworkId;
  endpointUsed: string;
  found: boolean;
  hash: string;
  fromXdc?: string;
  fromEvm?: string;
  toXdc?: string | null;
  toEvm?: string | null;
  valueXdc?: string;
  gasPriceGwei?: string;
  gasLimit?: number;
  nonce?: number;
  blockNumber?: number | null;
  status?: 'success' | 'failed' | 'pending';
  error?: string;
  rpcCode?: number;
}

export interface XdcDigestVerificationResponse {
  success: boolean;
  network: XdcNetworkId;
  endpointUsed: string;
  sha256Digest: string;
  blockNumber: number;
  blockHash: string;
  blockTimestampIso: string;
  anatomyId: string;
  clotPathPct: number;
  error?: string;
}

