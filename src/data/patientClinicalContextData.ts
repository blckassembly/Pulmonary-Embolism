/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExplorerAnatomyId } from '../types/biomedical.ts';

export interface PatientStageContext {
  stageId: ExplorerAnatomyId;
  stageNumber: number;
  stageTitle: string;
  progressRangeLabel: string;
  patientLabel: string;
  age: number;
  sex: string;
  baselineProfile: string;
  riskFactors: string[];
  symptoms: string[];
  vitalSnapshot: {
    label: string;
    value: string;
    tone: 'normal' | 'elevated' | 'critical';
  }[];
  clinicalSummary: string;
}

export const PATIENT_STAGE_CONTEXTS: Record<ExplorerAnatomyId, PatientStageContext> = {
  deepVeins: {
    stageId: 'deepVeins',
    stageNumber: 1,
    stageTitle: 'Deep Veins (DVT Origin)',
    progressRangeLabel: '0% – 24% Path',
    patientLabel: 'Hypothetical Case #PE-01',
    age: 62,
    sex: 'Female',
    baselineProfile: 'Day 9 post-right total knee arthroplasty · Reduced mobility',
    riskFactors: [
      'Recent major orthopedic surgery (venous stasis & endothelial injury)',
      'Prolonged immobilization + dehydration',
      'Heterozygous Factor V Leiden (hypercoagulability)',
    ],
    symptoms: [
      'Unilateral left calf swelling (+3.2 cm vs contralateral)',
      'Deep aching calf tenderness & warmth along popliteal vein',
      'No chest pain or shortness of breath at this localized stage',
    ],
    vitalSnapshot: [
      { label: 'HR', value: '78 bpm', tone: 'normal' },
      { label: 'SpO₂', value: '98%', tone: 'normal' },
      { label: 'mPAP', value: '14 mmHg', tone: 'normal' },
    ],
    clinicalSummary:
      'Thrombus propagation inside the deep lower-extremity veins before proximal detachment. Systemic oxygenation remains normal while Virchow’s triad drives clot extension.',
  },
  heart: {
    stageId: 'heart',
    stageNumber: 2,
    stageTitle: 'Right Heart Transit',
    progressRangeLabel: '25% – 59% Path',
    patientLabel: 'Hypothetical Case #PE-01',
    age: 62,
    sex: 'Female',
    baselineProfile: 'Day 9 post-right total knee arthroplasty · Acute embolus detachment',
    riskFactors: [
      'Proximal iliofemoral DVT dislodgement upon ambulation',
      'Recent major orthopedic surgery & immobility',
      'Underlying hypercoagulable state',
    ],
    symptoms: [
      'Sudden brief palpitations & lightheadedness upon standing',
      'Transient presyncope as the free embolus crosses the tricuspid valve',
      'Early sense of chest tightness with rising jugular venous pressure',
    ],
    vitalSnapshot: [
      { label: 'HR', value: '104 bpm', tone: 'elevated' },
      { label: 'SpO₂', value: '95%', tone: 'normal' },
      { label: 'mPAP', value: '18 mmHg', tone: 'elevated' },
    ],
    clinicalSummary:
      'The detached venous clot ascends the inferior vena cava through the right atrium and right ventricle toward the pulmonary trunk, triggering early autonomic tachycardia.',
  },
  pulmonaryArtery: {
    stageId: 'pulmonaryArtery',
    stageNumber: 3,
    stageTitle: 'Pulmonary Artery Occlusion',
    progressRangeLabel: '60% – 91% Path',
    patientLabel: 'Hypothetical Case #PE-01',
    age: 62,
    sex: 'Female',
    baselineProfile: 'Day 9 post-right total knee arthroplasty · Acute lobar impaction',
    riskFactors: [
      'Acute mechanical obstruction at main/lobar pulmonary artery bifurcation',
      'Post-operative VTE cascade + prolonged venous stasis',
      'Hypercoagulable predisposition',
    ],
    symptoms: [
      'Abrupt-onset shortness of breath (dyspnea) at rest',
      'Substernal chest pressure from acute right ventricular strain',
      'Sinus tachycardia, diaphoresis, and marked anxiety',
    ],
    vitalSnapshot: [
      { label: 'HR', value: '118 bpm', tone: 'critical' },
      { label: 'SpO₂', value: '91%', tone: 'elevated' },
      { label: 'mPAP', value: '38 mmHg', tone: 'critical' },
    ],
    clinicalSummary:
      'Wedging of the embolus sharply narrows effective pulmonary arterial cross-section, driving pulmonary vascular resistance and acute right ventricular afterload.',
  },
  lungs: {
    stageId: 'lungs',
    stageNumber: 4,
    stageTitle: 'Lung Perfusion Deficit',
    progressRangeLabel: '92% – 100% Path',
    patientLabel: 'Hypothetical Case #PE-01',
    age: 62,
    sex: 'Female',
    baselineProfile: 'Day 9 post-right total knee arthroplasty · Distal alveolar hypoperfusion',
    riskFactors: [
      'Subsegmental arterial occlusion causing alveolar dead-space ventilation',
      'Post-surgical VTE & acute V/Q mismatch',
      'Elevated pulmonary vascular resistance & pleural irritation',
    ],
    symptoms: [
      'Sharp pleuritic chest pain worse on deep inspiration',
      'Rapid shallow breathing (tachypnea, RR 26/min)',
      'Hypoxemia (SpO₂ 88% on room air) from ventilated, unperfused alveoli',
    ],
    vitalSnapshot: [
      { label: 'HR', value: '122 bpm', tone: 'critical' },
      { label: 'SpO₂', value: '88%', tone: 'critical' },
      { label: 'mPAP', value: '39 mmHg', tone: 'critical' },
    ],
    clinicalSummary:
      'Ventilated alveoli downstream of the blocked pulmonary branches lack capillary perfusion, producing refractory ventilation-perfusion mismatch and peripheral pleuritic pain.',
  },
};

export function getPatientContextForProgress(clotPathProgress: number): PatientStageContext {
  const p = Math.max(0, Math.min(1, clotPathProgress));
  if (p < 0.25) return PATIENT_STAGE_CONTEXTS.deepVeins;
  if (p < 0.6) return PATIENT_STAGE_CONTEXTS.heart;
  if (p < 0.92) return PATIENT_STAGE_CONTEXTS.pulmonaryArtery;
  return PATIENT_STAGE_CONTEXTS.lungs;
}
