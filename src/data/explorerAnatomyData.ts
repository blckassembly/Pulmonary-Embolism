/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnatomyStructureInfo, ExplorerAnatomyId } from '../types/biomedical.ts';

export const EXPLORER_ANATOMY_STRUCTURES: Record<ExplorerAnatomyId, AnatomyStructureInfo> = {
  deepVeins: {
    id: 'deepVeins',
    label: 'Deep Veins',
    sublabel: 'Inferior Vena Cava & Lower Extremity Venous System',
    badge: 'Origin Site (DVT)',
    cameraPosition: [0, -14, 26],
    cameraLookAt: [0, -9, 0],
    clotPathCheckpoint: 0.05,
    clinicalRole: 'Venous Thrombus Formation (Virchow’s Triad)',
    prewrittenExplanation:
      'Most pulmonary emboli (over 90%) originate as a Deep Vein Thrombosis (DVT) in the deep veins of the lower extremities or pelvis. Venous stasis (prolonged immobility), endothelial injury, and hypercoagulability (Virchow’s triad) promote fibrin-erythrocyte mesh assembly. When a portion of the thrombus breaks loose, it becomes an embolus traveling upward through the inferior vena cava toward the heart.',
    suggestedQuestions: [
      'How does a clot form in the deep veins of the leg?',
      'What causes a deep vein thrombosis to break loose?',
      'What route does a venous clot travel to reach the heart?',
      'What is Virchow’s triad in relation to deep vein thrombosis?',
    ],
  },
  heart: {
    id: 'heart',
    label: 'Heart',
    sublabel: 'Right Atrium, Tricuspid Valve & Right Ventricle',
    badge: 'Transit & Strain Site',
    cameraPosition: [4, -4, 22],
    cameraLookAt: [1.8, -4, 1.5],
    clotPathCheckpoint: 0.38,
    clinicalRole: 'Right Heart Cavities & Hemodynamic Transit',
    prewrittenExplanation:
      'The traveling embolus enters the right atrium from the inferior vena cava, passes through the tricuspid valve into the right ventricle, and is pumped through the pulmonary valve into the pulmonary arterial trunk. While passage through the heart chambers is rapid, subsequent downstream arterial blockage causes acute right ventricular pressure overload (RV strain), tricuspid regurgitation, and potential hemodynamic collapse.',
    suggestedQuestions: [
      'How does an embolus pass through the heart chambers?',
      'Why is the right ventricle vulnerable to sudden pressure spikes?',
      'What is acute right ventricular strain in pulmonary embolism?',
      'How does pulmonary embolism cause right-sided heart failure?',
    ],
  },
  pulmonaryArtery: {
    id: 'pulmonaryArtery',
    label: 'Pulmonary Artery',
    sublabel: 'Main Pulmonary Trunk & Lobar Bifurcations',
    badge: 'Arterial Occlusion Site',
    cameraPosition: [-4, 1, 19],
    cameraLookAt: [-5, 1, 0.5],
    clotPathCheckpoint: 0.85,
    clinicalRole: 'Mechanical Lodgment & Luminal Obstruction',
    prewrittenExplanation:
      'The pulmonary arterial trunk carries deoxygenated blood from the right ventricle and bifurcates into the right and left pulmonary arteries. As these vessels divide into smaller lobar branches, their luminal diameter narrows. The embolus physically wedges into the bifurcation or lobar branches (predominantly in the lower lobes), abruptly obstructing blood flow, generating severe shear stress, and elevating pulmonary arterial pressure.',
    suggestedQuestions: [
      'What is the clot blocking in this view?',
      'Why do clots lodge at arterial bifurcations?',
      'What is a saddle pulmonary embolism?',
      'How does mechanical obstruction elevate pulmonary artery pressure?',
    ],
  },
  lungs: {
    id: 'lungs',
    label: 'Lungs',
    sublabel: 'Alveolar Capillary Bed & Gas Exchange Lobes',
    badge: 'V/Q Mismatch & Hypoxemia',
    cameraPosition: [0, 2, 34],
    cameraLookAt: [0, 0, 0],
    clotPathCheckpoint: 1.0,
    clinicalRole: 'Alveolar Perfusion Deficit & Respiratory Impact',
    prewrittenExplanation:
      'Downstream from the occluded pulmonary artery, the lung’s alveolar capillary bed experiences acute hypoperfusion. Although alveoli continue to be ventilated with inhaled oxygen, blood cannot circulate through the capillaries to absorb that oxygen. This severe ventilation-perfusion (V/Q) mismatch causes arterial hypoxemia, widened alveolar dead space, and compensatory rapid breathing (tachypnea).',
    suggestedQuestions: [
      'How does a pulmonary embolism impair oxygen exchange in the lungs?',
      'What is ventilation-perfusion (V/Q) mismatch?',
      'Can lung tissue undergo infarction from a blood clot?',
      'Why does a pulmonary embolism cause sudden shortness of breath?',
    ],
  },
};
