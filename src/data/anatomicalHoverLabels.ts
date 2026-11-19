/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type HoverLabelCategory =
  | 'Pulmonary Artery Segment'
  | 'Thrombus & Embolus'
  | 'Cardiopulmonary'
  | 'Venous System'
  | 'Airway & Parenchyma'
  | 'Fibrin & Cutaway';

export interface AnatomicalHoverLabelInfo {
  id: string;
  clinicalName: string;
  shortTag: string;
  category: HoverLabelCategory;
  description: string;
  clinicalNote?: string;
  isPulmonarySegment?: boolean;
}

export interface SceneHoverLabelState {
  info: AnatomicalHoverLabelInfo;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export const ANATOMICAL_HOVER_LABELS: Record<string, AnatomicalHoverLabelInfo> = {
  // Highlighted Pulmonary Artery Segments (Thoracic & 8mm Cutaway)
  PulmonaryTrunkMesh: {
    id: 'PulmonaryTrunkMesh',
    clinicalName: 'Main Pulmonary Trunk (MPA)',
    shortTag: 'MPA',
    category: 'Pulmonary Artery Segment',
    description:
      'Originates at the pulmonary valve from the right ventricular outflow tract (RVOT) and ascends to the carinal bifurcation.',
    clinicalNote: 'Distends when mean pulmonary artery pressure (mPAP) exceeds 25 mmHg.',
    isPulmonarySegment: true,
  },
  RightPulmonaryArteryMesh: {
    id: 'RightPulmonaryArteryMesh',
    clinicalName: 'Right Pulmonary Artery (RPA)',
    shortTag: 'RPA',
    category: 'Pulmonary Artery Segment',
    description:
      'Long horizontal mediastinal branch coursing posterior to the ascending aorta and SVC toward the right pulmonary hilum.',
    clinicalNote: 'Frequent proximal lodging site for migrating iliofemoral thromboemboli.',
    isPulmonarySegment: true,
  },
  RightLowerLobeArteryMesh: {
    id: 'RightLowerLobeArteryMesh',
    clinicalName: 'Right Lower Lobe Pulmonary Artery',
    shortTag: 'RLLPA',
    category: 'Pulmonary Artery Segment',
    description:
      'Descending lobar branch perfusing the dependent basal segments of the right lung.',
    clinicalNote: 'High resting flow directs gravity-driven emboli to this lobar conduit.',
    isPulmonarySegment: true,
  },
  LeftPulmonaryArteryMesh: {
    id: 'LeftPulmonaryArteryMesh',
    clinicalName: 'Left Pulmonary Artery (LPA)',
    shortTag: 'LPA',
    category: 'Pulmonary Artery Segment',
    description:
      'Superior-arching arterial branch passing anterior to the descending aorta and above the left mainstem bronchus.',
    clinicalNote: 'Receives compensatory hyper-perfusion during unilateral right-sided occlusion.',
    isPulmonarySegment: true,
  },
  CutawayMainTrunkMesh: {
    id: 'CutawayMainTrunkMesh',
    clinicalName: 'Main Pulmonary Artery (Luminal Cutaway)',
    shortTag: 'MPA · 8 mm',
    category: 'Pulmonary Artery Segment',
    description:
      'Elastic proximal pulmonary artery segment transporting low-pressure, high-volume systolic flow toward the bifurcation.',
    clinicalNote: 'Thin muscular media makes the arterial tree sensitive to acute afterload spikes.',
    isPulmonarySegment: true,
  },
  CutawayBifurcationCuffMesh: {
    id: 'CutawayBifurcationCuffMesh',
    clinicalName: 'Pulmonary Carinal Bifurcation',
    shortTag: 'BIFURCATION',
    category: 'Pulmonary Artery Segment',
    description:
      'Y-shaped arterial flow divider splitting main pulmonary trunk output into lobar daughter branches.',
    clinicalNote: 'Thrombi bridging this carina constitute a high-risk saddle pulmonary embolism.',
    isPulmonarySegment: true,
  },
  CutawaySuperiorBranchMesh: {
    id: 'CutawaySuperiorBranchMesh',
    clinicalName: 'Superior Lobar Arterial Branch',
    shortTag: 'PATENT BRANCH',
    category: 'Pulmonary Artery Segment',
    description:
      'Unobstructed upper arterial bifurcation limb receiving diverted cardiac output past the downstream occlusion.',
    clinicalNote: 'Elevated velocity increases local shear stress along the endothelial wall.',
    isPulmonarySegment: true,
  },
  CutawayInferiorBranchMesh: {
    id: 'CutawayInferiorBranchMesh',
    clinicalName: 'Inferior Lobar Arterial Branch',
    shortTag: 'OCCLUDED BRANCH',
    category: 'Pulmonary Artery Segment',
    description:
      'Distal pulmonary arterial branch narrowed by the impacted thromboembolic mass and sluggish residual perimeter flow.',
    clinicalNote: 'Creates alveolar dead space (high V/Q) downstream in basal lung segments.',
    isPulmonarySegment: true,
  },

  // Thrombus & Embolus Structures
  ThoracicEmbolusSite: {
    id: 'ThoracicEmbolusSite',
    clinicalName: 'Impacted Lobar Embolus (RLLPA)',
    shortTag: 'PE OCCLUSION',
    category: 'Thrombus & Embolus',
    description:
      'Cross-linked fibrin thromboembolus wedged inside the right lower lobe pulmonary artery, halting distal capillary perfusion.',
    clinicalNote: 'Triggers acute pulmonary vascular resistance rise and hypoxemic V/Q mismatch.',
  },
  EmbolusBeaconRing: {
    id: 'EmbolusBeaconRing',
    clinicalName: 'Impacted Lobar Embolus (RLLPA)',
    shortTag: 'PE OCCLUSION',
    category: 'Thrombus & Embolus',
    description:
      'Cross-linked fibrin thromboembolus wedged inside the right lower lobe pulmonary artery, halting distal capillary perfusion.',
    clinicalNote: 'Triggers acute pulmonary vascular resistance rise and hypoxemic V/Q mismatch.',
  },
  EmbolusMacroMesh: {
    id: 'EmbolusMacroMesh',
    clinicalName: 'Organized Thromboembolus Body',
    shortTag: 'THROMBUS · 4 mm',
    category: 'Thrombus & Embolus',
    description:
      'Venous clot cast displaying laminated Lines of Zahn formed from alternating fibrin-platelet strata and trapped red blood cells.',
    clinicalNote: 'Target substrate for plasminogen activators (tPA) along exposed fibrin surfaces.',
  },
  TravelingClotEmbolus: {
    id: 'TravelingClotEmbolus',
    clinicalName: 'Migrating Venous Embolus',
    shortTag: 'IN TRANSIT',
    category: 'Thrombus & Embolus',
    description:
      'Detached deep-vein thrombus traveling via the inferior vena cava and right heart chambers into the pulmonary arterial tree.',
  },

  // Cardiopulmonary & Venous Landmarks
  RightVentricleMesh: {
    id: 'RightVentricleMesh',
    clinicalName: 'Right Ventricle (RV Chamber)',
    shortTag: 'RV STRAIN',
    category: 'Cardiopulmonary',
    description:
      'Thin-walled anterior cardiac chamber pumping deoxygenated venous return through the pulmonary valve into the main trunk.',
    clinicalNote: 'Acute PA obstruction >50% precipitates RV dilation and interventricular septal bowing.',
  },
  HeartAnatomy: {
    id: 'HeartAnatomy',
    clinicalName: 'Mediastinal Cardiac Silhouette',
    shortTag: 'HEART',
    category: 'Cardiopulmonary',
    description:
      'Right atrium and ventricular complex bridging systemic venous inflow from the IVC to the pulmonary arterial trunk.',
  },
  InferiorVenaCava: {
    id: 'InferiorVenaCava',
    clinicalName: 'Inferior Vena Cava (IVC)',
    shortTag: 'IVC',
    category: 'Venous System',
    description:
      'Primary retroperitoneal venous trunk ascending from the iliac confluence directly into the right atrium.',
    clinicalNote: 'Major transit corridor for detached iliofemoral deep vein thrombi.',
  },
  RightCommonIliacVein: {
    id: 'RightCommonIliacVein',
    clinicalName: 'Right Common Iliac Vein',
    shortTag: 'ILIAC VEIN',
    category: 'Venous System',
    description:
      'Proximal pelvic deep venous tributary draining the lower extremity into the inferior vena cava.',
  },
  LeftCommonIliacVein: {
    id: 'LeftCommonIliacVein',
    clinicalName: 'Left Common Iliac Vein',
    shortTag: 'ILIAC VEIN',
    category: 'Venous System',
    description:
      'Proximal pelvic deep venous tributary susceptible to iliac compression and venous valve-pocket stasis.',
  },
  DVTOriginSite: {
    id: 'DVTOriginSite',
    clinicalName: 'Deep Vein Thrombosis (DVT) Origin',
    shortTag: 'DVT SOURCE',
    category: 'Venous System',
    description:
      'Initial venous valve-pocket thrombus formed under Virchow triad stasis, endothelial injury, and hypercoagulability.',
  },

  // Airways & Lungs
  TracheaAirway: {
    id: 'TracheaAirway',
    clinicalName: 'Trachea & Carina (T4/T5)',
    shortTag: 'AIRWAY',
    category: 'Airway & Parenchyma',
    description:
      'Cartilaginous central airway bifurcating posterior to the main pulmonary artery trunk.',
  },
  RightMainBronchus: {
    id: 'RightMainBronchus',
    clinicalName: 'Right Mainstem Bronchus',
    shortTag: 'RMB',
    category: 'Airway & Parenchyma',
    description:
      'Wider, more vertical conducting airway coursing alongside the right pulmonary artery into the right lung.',
  },
  LeftMainBronchus: {
    id: 'LeftMainBronchus',
    clinicalName: 'Left Mainstem Bronchus',
    shortTag: 'LMB',
    category: 'Airway & Parenchyma',
    description:
      'Conducting airway passing inferior to the left pulmonary artery arch toward the left lung lobes.',
  },
  RightLung: {
    id: 'RightLung',
    clinicalName: 'Right Lung Parenchyma (3 Lobes)',
    shortTag: 'RIGHT LUNG',
    category: 'Airway & Parenchyma',
    description:
      'Superior, middle, and inferior lobes containing ventilated alveolar units downstream of the occluded RLLPA.',
    clinicalNote: 'Continues to receive ventilation despite absent capillary perfusion (V/Q dead space).',
  },
  LeftLung: {
    id: 'LeftLung',
    clinicalName: 'Left Lung Parenchyma (2 Lobes)',
    shortTag: 'LEFT LUNG',
    category: 'Airway & Parenchyma',
    description:
      'Superior and inferior lobes receiving compensatory redistributed pulmonary arterial blood flow.',
  },

  // Microscopic & Industrial Cutaway
  Layer_OuterConduit: {
    id: 'Layer_OuterConduit',
    clinicalName: 'Arterial Adventitia & Conduit Shell',
    shortTag: 'CAD CONDUIT',
    category: 'Fibrin & Cutaway',
    description:
      'Outer vascular wall cutaway housing concentric arterial wall strata and intraluminal flow layers.',
  },
  Layer_WallStrata: {
    id: 'Layer_WallStrata',
    clinicalName: 'Tunica Media & Intimal Strata',
    shortTag: 'VESSEL WALL',
    category: 'Fibrin & Cutaway',
    description:
      'Elastic and smooth-muscle vascular wall strata regulating pulmonary arterial compliance.',
  },
  Layer_ThrombusCore: {
    id: 'Layer_ThrombusCore',
    clinicalName: 'Cutaway Intraluminal Thrombus Core',
    shortTag: 'CLOT CORE',
    category: 'Fibrin & Cutaway',
    description:
      'Dense cross-linked fibrin-erythrocyte plug obstructing the pulmonary arterial lumen.',
  },
  Layer_LumenFlow: {
    id: 'Layer_LumenFlow',
    clinicalName: 'Residual Luminal Flow Stream',
    shortTag: 'FLOW JET',
    category: 'Fibrin & Cutaway',
    description:
      'Accelerated hemodynamic boundary stream shearing past the thrombus margin.',
  },
  MicroscopicChamberRoot: {
    id: 'MicroscopicChamberRoot',
    clinicalName: 'Cross-Linked Fibrin Ultrastructure',
    shortTag: '50 µm MATRIX',
    category: 'Fibrin & Cutaway',
    description:
      'Three-dimensional Factor XIIIa cross-linked fibrin polymer lattice entrapping biconcave red blood cells and activated platelets.',
  },
};

/**
 * Walks up the Three.js parent chain from an intersected mesh to find the nearest
 * registered clinical hover label definition.
 */
export function resolveHoverLabelInfo(
  obj: THREE.Object3D | null
): { info: AnatomicalHoverLabelInfo; namedObject: THREE.Object3D } | null {
  let cursor: THREE.Object3D | null = obj;
  while (cursor) {
    if (cursor.name && ANATOMICAL_HOVER_LABELS[cursor.name]) {
      return {
        info: ANATOMICAL_HOVER_LABELS[cursor.name],
        namedObject: cursor,
      };
    }
    cursor = cursor.parent;
  }
  return null;
}
