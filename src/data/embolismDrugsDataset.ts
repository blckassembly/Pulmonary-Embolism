/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmbolismDrugEntity } from '../types/biomedical.ts';

/**
 * 20 Clinically Verified Embolism & Thrombosis Pharmacotherapy Agents
 * Formatted to physician-grade schema with molecular targets, lysis dynamics,
 * guidelines, u.com evidence hooks, and real-time clinical pearls.
 */
export const EMBOLISM_DRUGS_DATASET: EmbolismDrugEntity[] = [
  // --------------------------------------------------------------------------
  // 1. SYSTEMIC FIBRINOLYTICS (THROMBOLYTICS) - Direct Clot Dissolution
  // --------------------------------------------------------------------------
  {
    id: 'alteplase_rtpa',
    name: 'Alteplase (rt-PA, Activase)',
    genericName: 'Recombinant Tissue-type Plasminogen Activator',
    brandNames: ['Activase', 'Cathflo Activase', 'Actilyse'],
    drugClass: 'fibrinolytic',
    classLabel: 'Systemic Fibrinolytic (Thrombolytic)',
    targetEnzymeOrReceptor: 'Plasminogen → Active Plasmin (Lysine-binding domains)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Directly binds fibrin in the thrombus via its Finger and Kringle 2 domains, enzymatically converting clot-bound plasminogen into active plasmin. Active plasmin cleaves the fibrin matrix into soluble D-dimers and degradation products.',
    clinicalIndication: 'Hemodynamically unstable (high-risk / massive) pulmonary embolism with systemic hypotension (SBP < 90 mmHg) or cardiac arrest.',
    physicianRationale:
      'Gold standard emergency systemic lytic. Restores right ventricular hemodynamics, reduces pulmonary vascular resistance within 60–120 min, but carries a 1.5–3.0% risk of catastrophic intracranial hemorrhage.',
    typicalDosing: '100 mg IV infusion over 2 hours (or accelerated 0.6 mg/kg over 15 min in peri-arrest resuscitation).',
    maxLysisPct: 88,
    lysisRateMultiplier: 1.0,
    onsetMinutes: 15,
    bleedingRisk: 'severe',
    reversalAgent: 'Aminocaproic acid / Tranexamic acid, Cryoprecipitate (fibrinogen repletion)',
    keyGuideline: 'Class I, Level A (ESC 2019 / AHA 2020) for massive PE with shock.',
    clinicalTrials: ['MOPETT (Moderate PE Treated with Thrombolysis)', 'ICOPER Registry', 'PEITHO Trial'],
    uComEvidenceQuery: 'alteplase rt-pa massive pulmonary embolism mortality intracranial hemorrhage trial',
    contraindications: [
      'Prior intracranial hemorrhage at any time',
      'Ischemic stroke within 6 months',
      'Known central nervous system neoplasm or vascular lesion',
      'Active internal bleeding or bleeding diathesis',
      'Major trauma, head injury, or surgery within 3 weeks',
    ],
    synonyms: ['alteplase', 'tpa', 'rtpa', 'activase', 'cathflo', 'rt-pa', 'thrombolytic'],
  },
  {
    id: 'tenecteplase_tnk',
    name: 'Tenecteplase (TNKase, Metalyse)',
    genericName: 'Modified Fibrin-Specific Recombinant t-PA (TNK-tPA)',
    brandNames: ['TNKase', 'Metalyse'],
    drugClass: 'fibrinolytic',
    classLabel: 'Genetically Engineered Fibrin-Specific Thrombolytic',
    targetEnzymeOrReceptor: 'Fibrin-bound Plasminogen (Engineered K1/K2 and Protease Domain)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Engineered mutant of wild-type t-PA with 3 site mutations (Thr103Asn, Asn117Gln, Lys-His-Arg-Arg 296-299 Tetra-Ala). Delivers 14× higher fibrin specificity, 80× resistance to Plasminogen Activator Inhibitor-1 (PAI-1), and an extended half-life enabling single IV bolus administration.',
    clinicalIndication: 'High-risk and selected intermediate-high risk pulmonary embolism; preferred for ultra-fast single-bolus emergency administration.',
    physicianRationale:
      'Single 5–10 second weight-adjusted IV push avoids cumbersome 2-hour infusions during resuscitation. Rapidly lyses the central saddle embolus with superior resistance to circulating inhibitory serpins.',
    typicalDosing: 'Weight-based single IV bolus over 5–10 seconds (30 mg for <60 kg up to 50 mg for ≥90 kg).',
    maxLysisPct: 92,
    lysisRateMultiplier: 1.3,
    onsetMinutes: 8,
    bleedingRisk: 'severe',
    reversalAgent: 'Tranexamic acid (TXA) 1g IV + Cryoprecipitate 10 units',
    keyGuideline: 'Evaluated in PEITHO (NEJM 2014); widely preferred off-label in cardiac arrest and PE code teams.',
    clinicalTrials: ['PEITHO Trial (Pulmonary Embolism Thrombolysis)', 'PEITHO-3 (Reduced-dose Tenecteplase)'],
    uComEvidenceQuery: 'tenecteplase pulmonary embolism PEITHO trial mortality hemodynamic collapse',
    contraindications: [
      'Active gastrointestinal or internal bleeding within 1 month',
      'Recent intracranial or intraspinal surgery',
      'Severe uncontrolled refractory hypertension (>180/110 mmHg)',
      'Aortic dissection suspicion',
    ],
    synonyms: ['tenecteplase', 'tnk', 'tnkase', 'metalyse', 'tnk-tpa'],
  },
  {
    id: 'reteplase_retavase',
    name: 'Reteplase (Retavase, Rapilysin)',
    genericName: 'Recombinant Deletion Mutant t-PA (r-PA)',
    brandNames: ['Retavase', 'Rapilysin'],
    drugClass: 'fibrinolytic',
    classLabel: 'Non-Glycosylated Deletion Mutant Fibrinolytic',
    targetEnzymeOrReceptor: 'Plasminogen (Lacks Finger & EGF domains)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Expressed in E. coli without carbohydrate chains, lacking the finger, EGF, and Kringle 1 domains. Penetrates deeper into the interior core of aged, dense fibrin clots due to reduced surface binding.',
    clinicalIndication: 'Acute pulmonary embolism and endovascular catheter-directed thrombolysis.',
    physicianRationale:
      'Superior interior clot permeation; often utilized in catheter-directed infusion protocols where local intra-thrombus penetration is prioritized over systemic surface lytic action.',
    typicalDosing: 'Two 10-unit IV boluses given 30 minutes apart (or catheter-directed infusion 0.5–1.0 U/hr).',
    maxLysisPct: 83,
    lysisRateMultiplier: 0.95,
    onsetMinutes: 20,
    bleedingRisk: 'high',
    reversalAgent: 'Tranexamic acid, Aminocaproic acid, Cryoprecipitate',
    keyGuideline: 'Alternative systemic/catheter fibrinolytic per AHA Scientific Statements.',
    clinicalTrials: ['RAPID Trial', 'INJECT Trial'],
    uComEvidenceQuery: 'reteplase pulmonary embolism catheter directed thrombolysis outcomes',
    synonyms: ['reteplase', 'retavase', 'rapilysin', 'rpa', 'r-pa'],
  },
  {
    id: 'streptokinase_streptase',
    name: 'Streptokinase (Streptase)',
    genericName: 'Bacterial Plasminogen Activator (Group C Beta-Hemolytic Streptococci)',
    brandNames: ['Streptase', 'Kabikinase'],
    drugClass: 'fibrinolytic',
    classLabel: 'Non-Enzymatic Systemic Fibrinolytic',
    targetEnzymeOrReceptor: 'Circulating & Fibrin-bound Plasminogen (1:1 stoichiometric complex)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Forms an equimolar 1:1 complex with plasminogen, undergoing a conformational shift that exposes the catalytic active site without proteolytic cleavage. Lacks fibrin selectivity, generating a massive systemic lytic state.',
    clinicalIndication: 'Acute massive PE in cost-constrained resource settings where recombinant tPA is unavailable.',
    physicianRationale:
      'Inexpensive WHO Essential Medicine, but highly antigenic. Neutralizing antibodies develop within 4–5 days; can never be re-administered to the same patient due to severe anaphylaxis risk.',
    typicalDosing: 'Loading dose of 250,000 IU IV over 30 minutes, followed by 100,000 IU/hour for 24 hours.',
    maxLysisPct: 76,
    lysisRateMultiplier: 0.75,
    onsetMinutes: 30,
    bleedingRisk: 'severe',
    reversalAgent: 'Aminocaproic acid, Fresh Frozen Plasma',
    keyGuideline: 'Alternative in resource-limited health systems (WHO Model List of Essential Medicines).',
    clinicalTrials: ['UPET (Urokinase Pulmonary Embolism Trial)', 'ISIS-2'],
    uComEvidenceQuery: 'streptokinase pulmonary embolism efficacy systemic fibrinogenolysis WHO',
    synonyms: ['streptokinase', 'streptase', 'sk'],
  },
  {
    id: 'urokinase_kinlytic',
    name: 'Urokinase (Kinlytic)',
    genericName: 'Two-Chain Urinary Plasminogen Activator (u-PA)',
    brandNames: ['Kinlytic', 'Abbokinase', 'Medikit'],
    drugClass: 'fibrinolytic',
    classLabel: 'Direct Proteolytic Plasminogen Activator',
    targetEnzymeOrReceptor: 'Plasminogen (Direct Arg560-Val561 cleavage)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Directly cleaves the Arg560-Val561 peptide bond in plasminogen to produce plasmin without requiring co-factor binding. Non-antigenic (human cell culture derived), enabling safe redosing if necessary.',
    clinicalIndication: 'Acute pulmonary embolism and localized catheter clearing.',
    physicianRationale:
      'Non-immunogenic alternative to streptokinase; historically validated in landmark NIH trials; frequently employed for catheter-clearing and intra-arterial regional delivery.',
    typicalDosing: 'Loading dose of 4,400 IU/kg IV over 10 minutes, then 4,400 IU/kg/hr for 12 hours.',
    maxLysisPct: 80,
    lysisRateMultiplier: 0.85,
    onsetMinutes: 25,
    bleedingRisk: 'high',
    reversalAgent: 'Tranexamic acid, Fresh Frozen Plasma',
    keyGuideline: 'Approved FDA indication for acute massive pulmonary embolism.',
    clinicalTrials: ['UPET Study (Landmark NIH Trial)', 'USPET Trial'],
    uComEvidenceQuery: 'urokinase kinlytic pulmonary embolism UPET trial dosing protocol',
    synonyms: ['urokinase', 'kinlytic', 'abbokinase', 'u-pa'],
  },

  // --------------------------------------------------------------------------
  // 2. PHARMACOMECHANICAL & CATHETER-DIRECTED THROMBOLYSIS (CDT)
  // --------------------------------------------------------------------------
  {
    id: 'ekos_acoustic_cdt',
    name: 'EKOS Acoustic-Pulse Thrombolysis (CDT rt-PA)',
    genericName: 'Ultrasound-Accelerated Catheter-Directed Thrombolysis',
    brandNames: ['EKOS Endovascular System', 'Boston Scientific Acoustic Pulse'],
    drugClass: 'catheter_directed',
    classLabel: 'Catheter-Directed Pharmacomechanical Lysis',
    targetEnzymeOrReceptor: 'Intra-thrombus Plasminogen + High-Frequency Ultrasound Waves (2.2 MHz)',
    canBreakClot: true,
    clotAction: 'dissolves_clot',
    mechanismOfAction:
      'Delivers radial high-frequency, low-power ultrasound (2.2 MHz) into the clot interior. Acoustic streaming and micro-cavitation physically uncoil compacted fibrin cross-links, exposing buried plasminogen receptor sites to localized micro-dose rt-PA (1 mg/hr).',
    clinicalIndication: 'Intermediate-high risk (submassive) pulmonary embolism with RV dysfunction/strain, or high-risk PE with high bleeding contraindications to full-dose systemic lytics.',
    physicianRationale:
      'Achieves massive thrombus dissolution with only 15–24 mg total tPA (compared to 100 mg systemic), plunging major bleeding complications from ~10% down to <2%.',
    typicalDosing: '0.5 to 1.0 mg/hr rt-PA per pulmonary artery catheter with ultrasound active over 12–15 hours.',
    maxLysisPct: 95,
    lysisRateMultiplier: 1.45,
    onsetMinutes: 10,
    bleedingRisk: 'low',
    reversalAgent: 'Stop infusion immediately; Protamine for concurrent heparin',
    keyGuideline: 'Endorsed in ACC/AHA & PERT (Pulmonary Embolism Response Team) interventional algorithms.',
    clinicalTrials: ['ULTIMA Trial (Ultrasound Accelerated Thrombolysis)', 'SEATTLE II', 'OPTALYSE PE'],
    uComEvidenceQuery: 'EKOS ultrasound accelerated catheter directed thrombolysis ULTIMA trial safety bleeding',
    synonyms: ['ekos', 'cdt', 'catheter thrombolysis', 'ultrasound lysis', 'optalyse', 'seattle ii'],
  },

  // --------------------------------------------------------------------------
  // 3. RAPID PARENTERAL ANTICOAGULANTS - Halt Propagation (No Direct Lysis)
  // --------------------------------------------------------------------------
  {
    id: 'unfractionated_heparin',
    name: 'Unfractionated Heparin (UFH)',
    genericName: 'Parenteral Sulfated Glycosaminoglycan',
    brandNames: ['Heparin Sodium'],
    drugClass: 'anticoagulant_heparin',
    classLabel: 'Immediate-Action Antithrombin III Activator',
    targetEnzymeOrReceptor: 'Antithrombin III (AT-III) → Inactivates Thrombin (IIa) & FXa (1:1 ratio)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Binds antithrombin III via a specific pentasaccharide sequence, causing an allosteric conformational shift that accelerates AT-III inhibition of thrombin and FXa by 1,000-fold. Halts clot growth; depends on native body tPA for gradual endogenous dissolution.',
    clinicalIndication: 'Initial parenteral anticoagulation in hemodynamically unstable PE, patients planned for reperfusion therapy, or severe renal impairment (CrCl < 30 mL/min).',
    physicianRationale:
      'Ultra-short half-life (60–90 min) with instant 100% reversal by Protamine sulfate. Critical safety buffer if an emergency surgical embolectomy or catheter intervention is suddenly required.',
    typicalDosing: '80 units/kg IV bolus, then 18 units/kg/hr infusion, titrated to target anti-Xa 0.3–0.7 IU/mL or aPTT 1.5–2.5× control.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 2,
    bleedingRisk: 'moderate',
    reversalAgent: 'Protamine sulfate (1 mg per 100 units heparin administered in previous 2–3 hours)',
    keyGuideline: 'Class I, Level A (ESC 2019) for immediate resuscitation in suspected acute PE.',
    clinicalTrials: ['Raschke Nomogram Validation Studies', 'CHEST VTE Trials'],
    uComEvidenceQuery: 'unfractionated heparin pulmonary embolism initial resuscitation aPTT titration',
    synonyms: ['heparin', 'ufh', 'heparin sodium'],
  },
  {
    id: 'enoxaparin_lovenox',
    name: 'Enoxaparin (Lovenox, Clexane)',
    genericName: 'Low-Molecular-Weight Heparin (LMWH)',
    brandNames: ['Lovenox', 'Clexane'],
    drugClass: 'anticoagulant_heparin',
    classLabel: 'Low-Molecular-Weight Heparin (LMWH)',
    targetEnzymeOrReceptor: 'Factor Xa >> Thrombin IIa (High Anti-Xa:Anti-IIa ratio 3.8:1)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Depolymerized heparin fragments (~4,500 Da) that bind Antithrombin III. Because most chains are too short to bridge thrombin and AT-III simultaneously, it preferentially inhibits Factor Xa with 3.8× selectivity over Factor IIa.',
    clinicalIndication: 'First-line parenteral treatment of acute hemodynamically stable PE and cancer-associated thrombosis (CAT).',
    physicianRationale:
      'Predictable weight-based pharmacokinetics without routine coagulation monitoring. Substantially lower rate of Heparin-Induced Thrombocytopenia (HIT < 0.2%) compared to UFH (2–3%).',
    typicalDosing: '1 mg/kg subcutaneously every 12 hours, or 1.5 mg/kg once daily.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 90,
    bleedingRisk: 'moderate',
    reversalAgent: 'Protamine sulfate (neutralizes ~60% of anti-Xa activity)',
    keyGuideline: 'Class I, Level A (ESC 2019 / CHEST) for stable acute pulmonary embolism.',
    clinicalTrials: ['CLOT Trial (Cancer-Associated PE)', 'REVIVAS Trial'],
    uComEvidenceQuery: 'enoxaparin lovenox acute pulmonary embolism dosing outcomes cancer VTE',
    synonyms: ['enoxaparin', 'lovenox', 'clexane', 'lmwh'],
  },
  {
    id: 'fondaparinux_arixtra',
    name: 'Fondaparinux (Arixtra)',
    genericName: 'Synthetic Pentasaccharide Factor Xa Inhibitor',
    brandNames: ['Arixtra'],
    drugClass: 'anticoagulant_direct_xa',
    classLabel: 'Indirect Factor Xa Selective Inhibitor',
    targetEnzymeOrReceptor: 'Antithrombin III-mediated Selective Factor Xa Neutralization',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Pure synthetic analogue of the antithrombin-binding pentasaccharide sequence. Selectively accelerates AT-III inactivation of Factor Xa without inhibiting thrombin (Factor IIa). Completely incapable of binding platelet factor 4 (PF4), eliminating HIT risk.',
    clinicalIndication: 'Acute PE in patients with a history of Heparin-Induced Thrombocytopenia (HIT) or hypersensitivity to animal heparins.',
    physicianRationale:
      'Clean synthetic profile with once-daily SC dosing and 100% bioavailability. Zero cross-reactivity with HIT antibodies.',
    typicalDosing: 'Subcutaneous once daily: 5 mg (<50 kg), 7.5 mg (50–100 kg), 10 mg (>100 kg).',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 120,
    bleedingRisk: 'moderate',
    reversalAgent: 'Recombinant Factor VIIa / FEIBA (No direct specific reversal agent approved)',
    keyGuideline: 'Class I recommendation as heparin alternative in confirmed/suspected HIT.',
    clinicalTrials: ['MATISSE-PE Trial', 'ASPECT Trial'],
    uComEvidenceQuery: 'fondaparinux arixtra pulmonary embolism MATISSE trial HIT safety',
    synonyms: ['fondaparinux', 'arixtra', 'pentasaccharide'],
  },

  // --------------------------------------------------------------------------
  // 4. DIRECT ORAL ANTICOAGULANTS (DOACs) - Modern Frontline Oral Therapy
  // --------------------------------------------------------------------------
  {
    id: 'apixaban_eliquis',
    name: 'Apixaban (Eliquis)',
    genericName: 'Direct Oral Factor Xa Inhibitor',
    brandNames: ['Eliquis'],
    drugClass: 'anticoagulant_direct_xa',
    classLabel: 'Direct Oral Factor Xa Inhibitor (DOAC)',
    targetEnzymeOrReceptor: 'Active Site of Free and Clot-bound Factor Xa (Ki = 0.08 nM)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Direct, highly selective, reversible inhibitor of both free and prothrombinase-complex-bound Factor Xa. Halts conversion of prothrombin (FII) into thrombin, preventing fibrin strand deposition and secondary embolus propagation.',
    clinicalIndication: 'Frontline oral treatment and secondary prevention of acute pulmonary embolism; oral monotherapy without requiring parenteral bridging.',
    physicianRationale:
      'Superior safety profile with significantly lower major bleeding and intracranial hemorrhage than warfarin or heparin. Rapid oral onset eliminates heparin bridge.',
    typicalDosing: '10 mg orally BID for the first 7 days, followed by maintenance 5 mg orally BID.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 120,
    bleedingRisk: 'moderate',
    reversalAgent: 'Andexanet alfa (Andexxa) or 4-Factor Prothrombin Complex Concentrate (4F-PCC)',
    keyGuideline: 'Class I, Level A (ESC 2019 / ACC / CHEST) as primary oral PE treatment.',
    clinicalTrials: ['AMPLIFY Trial (Apixaban for the Initial Management of PE and DVT)', 'AMPLIFY-EXT'],
    uComEvidenceQuery: 'apixaban eliquis acute pulmonary embolism AMPLIFY trial bleeding outcomes',
    synonyms: ['apixaban', 'eliquis', 'doac', 'noac', 'factor xa inhibitor'],
  },
  {
    id: 'rivaroxaban_xarelto',
    name: 'Rivaroxaban (Xarelto)',
    genericName: 'Direct Oral Factor Xa Inhibitor',
    brandNames: ['Xarelto'],
    drugClass: 'anticoagulant_direct_xa',
    classLabel: 'Direct Oral Factor Xa Inhibitor (DOAC)',
    targetEnzymeOrReceptor: 'Active Site of Factor Xa (Ki = 0.4 nM)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Direct active-site blocker of Factor Xa. Inhibits both intrinsic and extrinsic coagulation cascades. Does not require antithrombin co-factor. Halts thrombus extension.',
    clinicalIndication: 'Acute pulmonary embolism oral monotherapy and long-term extended secondary recurrence prevention.',
    physicianRationale:
      'First FDA-approved single-drug oral regimen for acute PE. High bioavailability (80–100% when taken with food) and convenient once-daily maintenance dosing.',
    typicalDosing: '15 mg orally BID with food for 21 days, followed by 20 mg orally once daily with evening meal.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 150,
    bleedingRisk: 'moderate',
    reversalAgent: 'Andexanet alfa (Andexxa) or 4F-PCC (50 IU/kg)',
    keyGuideline: 'Class I, Level A (ESC / AHA) for acute PE treatment.',
    clinicalTrials: ['EINSTEIN-PE Trial (NEJM 2012)', 'EINSTEIN-CHOICE'],
    uComEvidenceQuery: 'rivaroxaban xarelto EINSTEIN-PE trial oral monotherapy pulmonary embolism',
    synonyms: ['rivaroxaban', 'xarelto', 'doac', 'factor xa'],
  },
  {
    id: 'edoxaban_savaysa',
    name: 'Edoxaban (Savaysa, Lixiana)',
    genericName: 'Direct Oral Factor Xa Inhibitor',
    brandNames: ['Savaysa', 'Lixiana'],
    drugClass: 'anticoagulant_direct_xa',
    classLabel: 'Direct Oral Factor Xa Inhibitor (DOAC)',
    targetEnzymeOrReceptor: 'Factor Xa active site (Ki = 0.561 nM)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Rapid, competitive, highly selective inhibitor of free and prothrombinase-associated FXa. Blocks prothrombin-to-thrombin conversion, freezing clot growth.',
    clinicalIndication: 'Treatment of pulmonary embolism following 5 to 10 days of initial parenteral anticoagulation.',
    physicianRationale:
      'Once-daily dosing with proven efficacy non-inferior to warfarin and significantly reduced bleeding; requires 5 days of heparin lead-in per trial protocol.',
    typicalDosing: '60 mg orally once daily (reduced to 30 mg if CrCl 15–50 mL/min or body weight ≤60 kg) after 5-day heparin bridge.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 120,
    bleedingRisk: 'moderate',
    reversalAgent: '4-Factor Prothrombin Complex Concentrate (4F-PCC)',
    keyGuideline: 'Class I, Level A (ESC 2019) for stable PE after lead-in.',
    clinicalTrials: ['Hokusai-VTE Trial (NEJM 2013)', 'Hokusai-VTE Cancer'],
    uComEvidenceQuery: 'edoxaban savaysa Hokusai-VTE pulmonary embolism heparin lead in trial',
    synonyms: ['edoxaban', 'savaysa', 'lixiana'],
  },
  {
    id: 'dabigatran_pradaxa',
    name: 'Dabigatran (Pradaxa)',
    genericName: 'Direct Thrombin (Factor IIa) Inhibitor (DTI)',
    brandNames: ['Pradaxa'],
    drugClass: 'anticoagulant_direct_thrombin',
    classLabel: 'Direct Oral Thrombin Inhibitor',
    targetEnzymeOrReceptor: 'Catalytic Active Site of Free and Clot-bound Thrombin (Factor IIa)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Potent, competitive, reversible direct thrombin inhibitor. Directly binds the catalytic active site pocket of both free and fibrin-bound thrombin, blocking conversion of fibrinogen to fibrin and inhibiting thrombin-induced platelet activation.',
    clinicalIndication: 'Treatment of acute PE after 5–10 days of initial parenteral anticoagulation, especially advantageous when an immediate specific monoclonal reversal agent is valued.',
    physicianRationale:
      'Only oral DOAC with an FDA-approved humanized Fab antibody reversal agent (Idarucizumab / Praxbind) that reverses anticoagulation in under 5 minutes.',
    typicalDosing: '150 mg orally BID (after minimum 5 days of initial parenteral anticoagulation).',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 120,
    bleedingRisk: 'moderate',
    reversalAgent: 'Idarucizumab (Praxbind) 5g IV (complete immediate reversal in 5 minutes)',
    keyGuideline: 'Class I, Level A (ESC 2019 / ACC) for acute PE management.',
    clinicalTrials: ['RE-COVER I and RE-COVER II Trials', 'RE-MEDY'],
    uComEvidenceQuery: 'dabigatran pradaxa RE-COVER trial pulmonary embolism idarucizumab reversal',
    synonyms: ['dabigatran', 'pradaxa', 'direct thrombin inhibitor', 'dti'],
  },
  {
    id: 'argatroban_novastan',
    name: 'Argatroban (Novastan)',
    genericName: 'Small-Molecule Synthetic Direct Thrombin Inhibitor',
    brandNames: ['Novastan', 'Arganova'],
    drugClass: 'anticoagulant_direct_thrombin',
    classLabel: 'Parenteral Direct Thrombin Inhibitor',
    targetEnzymeOrReceptor: 'Thrombin Catalytic Pocket (Univalent active site binding)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Synthetic L-arginine derivative that binds univalently to the catalytic active site of thrombin. Inhibits all actions of thrombin without requiring antithrombin III. Does not interact with PF4.',
    clinicalIndication: 'Anticoagulation for prophylaxis or treatment of thrombosis in patients with Heparin-Induced Thrombocytopenia (HIT / HITT) presenting with PE.',
    physicianRationale:
      'Metabolized exclusively by the liver (safe in severe renal failure). Standard of care for heparin-induced thrombosis where any heparin derivative is strictly prohibited.',
    typicalDosing: 'Continuous IV infusion 2 mcg/kg/min, adjusted to achieve target aPTT of 1.5–3.0× baseline.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 30,
    bleedingRisk: 'moderate',
    reversalAgent: 'Discontinue infusion (half-life 45 min); no specific antidote',
    keyGuideline: 'CHEST & ASH Guidelines: First-line for HIT-associated thromboembolism with renal dysfunction.',
    clinicalTrials: ['ARG-911 and ARG-915 HIT Registry Trials'],
    uComEvidenceQuery: 'argatroban heparin induced thrombocytopenia pulmonary embolism dosing aPTT',
    synonyms: ['argatroban', 'novastan', 'dti'],
  },
  {
    id: 'bivalirudin_angiomax',
    name: 'Bivalirudin (Angiomax)',
    genericName: 'Synthetic 20-Amino-Acid Bivalent Peptide DTI',
    brandNames: ['Angiomax'],
    drugClass: 'anticoagulant_direct_thrombin',
    classLabel: 'Bivalent Direct Thrombin Inhibitor (DTI)',
    targetEnzymeOrReceptor: 'Thrombin Active Site + Exosite I (Bivalent binding)',
    canBreakClot: false,
    clotAction: 'prevents_propagation',
    mechanismOfAction:
      'Synthetic analogue of hirudin. Simultaneously binds both the catalytic active site and the substrate-recognition exosite I of thrombin. Cleaved slowly by thrombin itself, restoring enzyme activity over a 25-minute half-life.',
    clinicalIndication: 'Percutaneous mechanical thrombectomy suites and alternative anticoagulation in HIT with acute PE.',
    physicianRationale:
      'Predictable ultra-short half-life (25 minutes) with mixed enzymatic/renal clearance; ideal for cardiac catheterization laboratories and acute endovascular thrombectomy.',
    typicalDosing: 'IV bolus 0.75 mg/kg, then infusion 1.75 mg/kg/hr for duration of catheter procedure.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 5,
    bleedingRisk: 'moderate',
    reversalAgent: 'Short 25-min half-life; hemodialysis clears ~25%',
    keyGuideline: 'Alternative parenteral agent in interventional guidelines and HIT consensus panels.',
    clinicalTrials: ['CHOOSE Trial', 'REPLACE-2'],
    uComEvidenceQuery: 'bivalirudin angiomax pulmonary embolism endovascular thrombectomy HIT safety',
    synonyms: ['bivalirudin', 'angiomax'],
  },

  // --------------------------------------------------------------------------
  // 5. LIPID & PLAQUE STABILIZERS (STATINS) - Endothelial & Pleiotropic Thrombosis Defense
  // Direct response to physician scenario: "Say for example you have high cholesterol..."
  // --------------------------------------------------------------------------
  {
    id: 'atorvastatin_lipitor',
    name: 'Atorvastatin (Lipitor)',
    genericName: 'HMG-CoA Reductase Inhibitor (High-Intensity Statin)',
    brandNames: ['Lipitor', 'Atorvaliq'],
    drugClass: 'lipid_lowering_pleiotropic',
    classLabel: 'HMG-CoA Reductase Inhibitor & Pleiotropic Antithrombotic',
    targetEnzymeOrReceptor: 'Hepatic HMG-CoA Reductase + Endothelial Nitric Oxide Synthase (eNOS)',
    canBreakClot: false,
    clotAction: 'stabilizes_plaque_antiinflammatory',
    mechanismOfAction:
      'Competitively inhibits HMG-CoA reductase, slashing LDL cholesterol synthesis. Beyond lipid lowering, exhibits crucial "pleiotropic" antithrombotic actions: upregulates endothelial eNOS (improving nitric oxide vasodilation), suppresses tissue factor expression on monocytes, reduces circulating PAI-1, and stabilizes vulnerable atherosclerotic plaque cores against rupture.',
    clinicalIndication: 'Cardiovascular risk reduction, dyslipidemia, and prevention of recurrent venous thromboembolism via anti-inflammatory & endothelial stabilization.',
    physicianRationale:
      'Every physician knows high cholesterol drives thrombotic vulnerability. While statins CANNOT dissolve an acute mechanical fibrin clot, high-intensity atorvastatin halts systemic thrombogenicity, downregulates inflammation (hs-CRP), and reduces venous thrombosis recurrence by ~30–40%.',
    typicalDosing: '40 mg to 80 mg orally once daily in the evening.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 1440, // 24 hours for biochemical impact; weeks for structural plaque remodeling
    bleedingRisk: 'low',
    keyGuideline: 'AHA/ACC Secondary Prevention Guidelines; SAVER and JUPITER trials for VTE risk reduction.',
    clinicalTrials: ['SAVER Trial (Statins for Venous Event Reduction)', 'PROVE-IT TIMI 22', 'ASCOT-LLA'],
    uComEvidenceQuery: 'atorvastatin lipitor pleiotropic effects venous thromboembolism recurrence tissue factor',
    synonyms: ['atorvastatin', 'lipitor', 'statin', 'cholesterol', 'lipid', 'hmg-coa'],
    lipidOrPlaqueNote:
      'Physician Pearl: Like treating high cholesterol to stabilize coronary plaques, statins downregulate tissue factor and PAI-1, creating an endothelial environment resistant to secondary clot formation.',
  },
  {
    id: 'rosuvastatin_crestor',
    name: 'Rosuvastatin (Crestor)',
    genericName: 'High-Potency HMG-CoA Reductase Inhibitor',
    brandNames: ['Crestor', 'Ezallor'],
    drugClass: 'lipid_lowering_pleiotropic',
    classLabel: 'High-Potency Hydrophilic Statin & Antithrombotic',
    targetEnzymeOrReceptor: 'HMG-CoA Reductase + Nuclear Factor Kappa B (NF-κB) Downregulation',
    canBreakClot: false,
    clotAction: 'stabilizes_plaque_antiinflammatory',
    mechanismOfAction:
      'Potent hydrophilic inhibitor of HMG-CoA reductase. Suppresses pro-inflammatory cytokines (IL-6, TNF-alpha), reduces high-sensitivity C-reactive protein (hs-CRP), attenuates platelet hyper-reactivity, and preserves endothelial glycocalyx integrity.',
    clinicalIndication: 'Severe hypercholesterolemia, primary prevention of arterial/venous vascular events.',
    physicianRationale:
      'Landmark JUPITER trial demonstrated an astonishing 43% reduction in symptomatic venous thromboembolism (VTE) in patients randomized to rosuvastatin compared to placebo, proving the profound link between lipid/endothelial control and clot prevention.',
    typicalDosing: '20 mg to 40 mg orally once daily.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 1440,
    bleedingRisk: 'low',
    keyGuideline: 'JUPITER Landmark Study (NEJM 2009); AHA/ACC Class I for Atherosclerotic Cardiovascular Disease.',
    clinicalTrials: ['JUPITER Trial (43% reduction in VTE events, NEJM 2009)', 'CORONA Study'],
    uComEvidenceQuery: 'rosuvastatin crestor JUPITER trial venous thromboembolism reduction mechanism',
    synonyms: ['rosuvastatin', 'crestor', 'statin', 'cholesterol'],
    lipidOrPlaqueNote:
      'Physician Pearl: JUPITER proved that lowering LDL and hs-CRP with rosuvastatin dramatically cuts pulmonary embolism and DVT rates by remodeling vascular endothelium.',
  },

  // --------------------------------------------------------------------------
  // 6. ANTIPLATELET AGENTS - Arterial Mesh & Secondary Recurrence
  // --------------------------------------------------------------------------
  {
    id: 'aspirin_asa',
    name: 'Aspirin (Acetylsalicylic Acid, ASA)',
    genericName: 'Irreversible Cyclooxygenase-1 (COX-1) Inhibitor',
    brandNames: ['Bayer Aspirin', 'Ecotrin', 'Bufferin'],
    drugClass: 'antiplatelet',
    classLabel: 'Antiplatelet / Thromboxane A2 Blocker',
    targetEnzymeOrReceptor: 'Platelet COX-1 (Serine-529 acetylation)',
    canBreakClot: false,
    clotAction: 'inhibits_platelet_mesh',
    mechanismOfAction:
      'Irreversibly acetylates Ser-529 in the active site channel of platelet COX-1, permanently abolishing platelet synthesis of Thromboxane A2 (TXA2) for the 7–10 day lifespan of the platelet. Cannot lyse existing fibrin cross-links in venous clots.',
    clinicalIndication: 'Extended secondary prevention of recurrent venous thromboembolism in patients who have stopped anticoagulant therapy.',
    physicianRationale:
      'While ineffective for acute PE clot breakdown, trials (WARN, ASPIRE, INSPIRE) prove low-dose aspirin reduces recurrent VTE by ~32% without major bleeding liabilities when full anticoagulation is discontinued.',
    typicalDosing: '81 mg to 100 mg orally once daily.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 60,
    bleedingRisk: 'low',
    keyGuideline: 'Class IIb recommendation (CHEST / ESC) for secondary prevention after anticoagulation cessation.',
    clinicalTrials: ['ASPIRE Trial (NEJM 2012)', 'WARFASA Study (NEJM 2012)', 'INSPIRE Pooled Analysis'],
    uComEvidenceQuery: 'aspirin acetylsalicylic acid secondary prevention pulmonary embolism ASPIRE trial',
    synonyms: ['aspirin', 'asa', 'acetylsalicylic acid', 'bayer'],
  },
  {
    id: 'clopidogrel_plavix',
    name: 'Clopidogrel (Plavix)',
    genericName: 'Thienopyridine P2Y12 ADP Receptor Antagonist',
    brandNames: ['Plavix'],
    drugClass: 'antiplatelet',
    classLabel: 'Antiplatelet / ADP P2Y12 Receptor Antagonist',
    targetEnzymeOrReceptor: 'Platelet P2Y12 Purinergic Receptor',
    canBreakClot: false,
    clotAction: 'inhibits_platelet_mesh',
    mechanismOfAction:
      'Hepatic CYP2C19 bioactivated prodrug whose active thiol metabolite selectively and irreversibly locks the platelet P2Y12 purinergic receptor, preventing ADP-mediated activation of the GPIIb/IIIa complex. Blocks platelet aggregation.',
    clinicalIndication: 'Arterial thrombosis prevention, coronary stents, and secondary protection.',
    physicianRationale:
      'Targeted for arterial white clots (rich in platelets); ineffective at hydrolyzing venous red thrombi (rich in fibrin-erythrocyte meshes).',
    typicalDosing: '75 mg orally once daily (300–600 mg loading dose in acute coronary syndrome).',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 120,
    bleedingRisk: 'low',
    keyGuideline: 'ACC/AHA Guidelines for Dual Antiplatelet Therapy (DAPT).',
    clinicalTrials: ['CAPRIE Trial', 'CURE Trial'],
    uComEvidenceQuery: 'clopidogrel plavix P2Y12 platelet aggregation arterial vs venous thrombosis',
    synonyms: ['clopidogrel', 'plavix', 'p2y12', 'antiplatelet'],
  },

  // --------------------------------------------------------------------------
  // 7. SPECIFIC REVERSAL ANTIDOTE - Critical Clinical Safety Countermeasure
  // --------------------------------------------------------------------------
  {
    id: 'andexanet_alfa',
    name: 'Andexanet alfa (Andexxa, Ondexxya)',
    genericName: 'Recombinant Coagulation Factor Xa Decoy (Inactivated)',
    brandNames: ['Andexxa', 'Ondexxya'],
    drugClass: 'antidote_reversal',
    classLabel: 'Specific Direct FXa Decoy Reversal Antidote',
    targetEnzymeOrReceptor: 'Direct and Indirect Factor Xa Inhibitors (Apixaban, Rivaroxaban)',
    canBreakClot: false,
    clotAction: 'reversal_agent',
    mechanismOfAction:
      'Genetically modified human recombinant FXa decoy protein. Serine-to-alanine active-site mutation eliminates all procoagulant catalytic activity, while retaining high affinity for apixaban and rivaroxaban, sequestering circulating oral anticoagulants in plasma.',
    clinicalIndication: 'Life-threatening or uncontrolled catastrophic bleeding (e.g., hemorrhagic stroke, severe retroperitoneal bleed) in patients receiving apixaban or rivaroxaban during PE therapy.',
    physicianRationale:
      'The modern emergency antidote every physician relies on when DOAC anticoagulation for PE causes unexpected major hemorrhage. Restores endogenous thrombin generation in minutes.',
    typicalDosing: 'Low dose: 400 mg IV bolus at 30 mg/min, then 4 mg/min infusion for 2 hours; High dose: 800 mg bolus, then 8 mg/min infusion.',
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    onsetMinutes: 5,
    bleedingRisk: 'low',
    keyGuideline: 'FDA Accelerated Approval; Class I / IIa in AHA/ACC/ESC Emergency Bleeding Reversal Guidelines.',
    clinicalTrials: ['ANNEXA-4 Prospective Trial (NEJM 2019)', 'ANNEXA-I RCT (NEJM 2024)'],
    uComEvidenceQuery: 'andexanet alfa andexxa DOAC reversal apixaban rivaroxaban ANNEXA-4 trial',
    synonyms: ['andexanet', 'andexxa', 'ondexxya', 'reversal agent', 'antidote'],
  },
];

/**
 * Filter helper by clinical intention
 */
export function getDrugsByClotAction(action: 'all' | 'dissolves' | 'prevents' | 'statins' | 'antiplatelets_reversal'): EmbolismDrugEntity[] {
  switch (action) {
    case 'dissolves':
      return EMBOLISM_DRUGS_DATASET.filter((d) => d.canBreakClot);
    case 'prevents':
      return EMBOLISM_DRUGS_DATASET.filter((d) => d.clotAction === 'prevents_propagation');
    case 'statins':
      return EMBOLISM_DRUGS_DATASET.filter((d) => d.drugClass === 'lipid_lowering_pleiotropic');
    case 'antiplatelets_reversal':
      return EMBOLISM_DRUGS_DATASET.filter((d) => d.drugClass === 'antiplatelet' || d.drugClass === 'antidote_reversal');
    default:
      return EMBOLISM_DRUGS_DATASET;
  }
}
