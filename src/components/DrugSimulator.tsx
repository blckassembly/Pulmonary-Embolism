/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlaskConical,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  EyeOff,
  Eye,
  Gauge,
  Zap,
  ShieldAlert,
  AlertOctagon,
  Pill,
  Info,
  Globe,
} from 'lucide-react';
import { DrugInfo } from '../types/biomedical.ts';
import { EMBOLISM_DRUGS_DATASET } from '../data/embolismDrugsDataset.ts';

export interface ExtendedDrugInfo extends DrugInfo {
  synonyms: string[];
}

export const EXTENDED_DRUGS: ExtendedDrugInfo[] = [
  ...EMBOLISM_DRUGS_DATASET.map((d) => ({
    id: d.id,
    name: d.name,
    genericName: d.genericName,
    synonyms: d.synonyms,
    category: (d.canBreakClot
      ? 'Fibrinolytic (Thrombolytic)'
      : d.drugClass === 'lipid_lowering_pleiotropic'
      ? 'Non-lytic / Other'
      : d.drugClass === 'antiplatelet'
      ? 'Antiplatelet'
      : d.drugClass === 'catheter_directed'
      ? 'Catheter-Directed'
      : 'Anticoagulant') as any,
    targetEnzyme: d.targetEnzymeOrReceptor,
    mechanism: d.mechanismOfAction,
    dissolutionCapability: d.canBreakClot,
    maxLysisPct: d.maxLysisPct,
    lysisRateMultiplier: d.lysisRateMultiplier,
    clinicalRisk:
      d.bleedingRisk === 'severe'
        ? 'High risk of major hemorrhage (~1.5–3.0% ICH risk).'
        : d.bleedingRisk === 'high'
        ? 'High risk of hemorrhage.'
        : d.bleedingRisk === 'moderate'
        ? 'Moderate bleeding liability; monitor renal function/aPTT.'
        : 'Low systemic bleeding risk; plaque/endothelial stabilization.',
    indicationNotes: d.clinicalIndication,
    doseMg: d.typicalDosing.includes('mg') ? parseInt(d.typicalDosing.match(/(\d+)\s*mg/)?.[1] || '0', 10) : undefined,
  })),
  {
    id: 'acetaminophen_apap',
    name: 'Acetaminophen (Tylenol / APAP) 2,200 mg Caplet',
    genericName: 'Paracetamol / N-acetyl-p-aminophenol (2,200 mg / caplet)',
    synonyms: ['acetaminophen', 'paracetamol', 'tylenol', 'apap', '2200', '2200 mg', 'caplet'],
    category: 'Analgesic / Antipyretic',
    targetEnzyme: 'Prostaglandin H2 Synthase (Peroxidase COX-1/2)',
    mechanism:
      'Central non-opioid analgesic. Possesses ZERO fibrinolytic enzyme activity. Incapable of activating plasminogen or cleaving cross-linked fibrin networks in an embolus.',
    dissolutionCapability: false,
    maxLysisPct: 0,
    lysisRateMultiplier: 0.0,
    doseMg: 2200,
    clinicalRisk:
      'CRITICAL HEPATOTOXIC OVERDOSE: 2,200 mg in a single caplet is 220% of the maximum single safe adult dose (1,000 mg). Saturates hepatic sulfation/glucuronidation pathways, generating toxic electrophilic NAPQI and causing centrilobular liver necrosis.',
    indicationNotes:
      'CONTRAINDICATED for pulmonary embolism. Does not dissolve emboli. Accidental or intentional ingestion of a 2,200 mg caplet requires urgent emergency N-acetylcysteine (NAC) antidote protocol.',
    toxicityAlert: {
      isToxic: true,
      severity: 'critical',
      title: 'CRITICAL TOXICOLOGICAL ALERT: 2,200 mg / Caplet Overdose',
      details:
        'Standard adult caplet is 325 mg or 500 mg (max safe single dose = 1,000 mg; daily maximum = 3,000-4,000 mg). A 2,200 mg caplet is a massive supratherapeutic overdose that provides 0% clot lysis while risking acute liver failure.',
      napqiRisk:
        'Hepatic glucuronide and sulfate saturation shunts drug to Cytochrome P450 (CYP2E1), forming toxic N-acetyl-p-benzoquinone imine (NAPQI). Rapidly depletes hepatocellular glutathione, triggering irreversible centrilobular liver necrosis without affecting the intravascular embolus.',
    },
  },
];

interface DrugSimulatorProps {
  onApplyLyticFraction: (fraction: number) => void;
  onInfusionStateChange?: (state: { isInfusing: boolean; speedScale: number; isDrugInfused: boolean }) => void;
  hideBottomMenu: boolean;
  onToggleHideBottomMenu: () => void;
  isDarkTheme?: boolean;
  onOpenYouSearch?: (query?: string) => void;
  selectedDrugId?: string;
}

export const DrugSimulator: React.FC<DrugSimulatorProps> = ({
  onApplyLyticFraction,
  onInfusionStateChange,
  hideBottomMenu,
  onToggleHideBottomMenu,
  isDarkTheme = false,
  onOpenYouSearch,
  selectedDrugId,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<ExtendedDrugInfo>(EXTENDED_DRUGS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTimeSec, setSimulatedTimeSec] = useState(0);
  const [currentLysisPct, setCurrentLysisPct] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(0.2); // 0.2x Slow Motion default

  const [selectedDoseMg, setSelectedDoseMg] = useState<number>(2200);

  useEffect(() => {
    if (selectedDrugId) {
      const match = EXTENDED_DRUGS.find(
        (d) => d.id === selectedDrugId || d.name.toLowerCase().includes(selectedDrugId.toLowerCase())
      );
      if (match) {
        setSelectedDrug(match);
        setIsCollapsed(false);
      }
    }
  }, [selectedDrugId]);

  // Filtered drug suggestions based on typed input
  const filteredDrugs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return EXTENDED_DRUGS;

    const matches = EXTENDED_DRUGS.filter((d) => {
      if (d.name.toLowerCase().includes(q)) return true;
      if (d.genericName.toLowerCase().includes(q)) return true;
      if (d.category.toLowerCase().includes(q)) return true;
      if (d.synonyms.some((s) => q.includes(s) || s.includes(q))) return true;
      // Multi-word / fuzzy matching: e.g. "contains 2200 mg of acetaminophen per caplet to break up the embolus"
      const words = q.split(/\s+/).filter((w) => w.length > 2);
      const textToSearch = `${d.name} ${d.genericName} ${d.synonyms.join(' ')}`.toLowerCase();
      const matchCount = words.filter((w) => textToSearch.includes(w)).length;
      return matchCount >= 2;
    });

    if (matches.length > 0) return matches;

    // If user typed something completely custom (e.g. unknown substance), create a dynamic entry
    const isLikelyThrombolytic = /tpa|plase|kinase|fibrinoly|dissolv/i.test(q);
    return [
      {
        id: isLikelyThrombolytic ? 'alteplase_tpa' : 'heparin_anticoag',
        name: `Typed: "${searchQuery}"`,
        genericName: isLikelyThrombolytic ? 'Custom Thrombolytic Agent' : 'Non-lytic / Experimental Substance',
        synonyms: [q],
        category: isLikelyThrombolytic ? 'Fibrinolytic (Thrombolytic)' : 'Non-lytic / Other',
        targetEnzyme: isLikelyThrombolytic ? 'Plasminogen Activation' : 'Non-fibrinolytic Pathway',
        mechanism: isLikelyThrombolytic
          ? 'Enzymatic cleavage of cross-linked fibrin matrix.'
          : 'Does NOT hydrolyze fibrin fibers. Only thrombolytics dissolve clots directly.',
        dissolutionCapability: isLikelyThrombolytic,
        maxLysisPct: isLikelyThrombolytic ? 80 : 0,
        lysisRateMultiplier: 1.0,
        clinicalRisk: isLikelyThrombolytic ? 'Hemorrhagic risk.' : 'Vascular risk.',
        indicationNotes: 'Tested experimental agent in simulated bloodstream.',
      } as ExtendedDrugInfo,
    ];
  }, [searchQuery]);

  // Dynamic simulation ticker text
  const getSimulationTicker = () => {
    if (!isSimulating) {
      if (selectedDrug.id === 'acetaminophen_apap') {
        return `Ready to test ${selectedDoseMg} mg Acetaminophen caplet infusion. Notice: Has 0% fibrinolytic action on cross-linked fibrin.`;
      }
      return selectedDrug.dissolutionCapability
        ? `Ready to infuse ${selectedDrug.name}. Recombinant plasminogen activation will dissolve fibrin mesh.`
        : `Ready to infuse ${selectedDrug.name}. Clot will remain intact (0% direct dissolution).`;
    }

    if (selectedDrug.id === 'acetaminophen_apap') {
      if (simulatedTimeSec < 4) {
        return `T+${simulatedTimeSec}s: Golden infusion perfusing ${selectedDoseMg} mg APAP into pulmonary artery trunk in slow motion...`;
      }
      if (simulatedTimeSec < 9) {
        return `T+${simulatedTimeSec}s: APAP molecules wash over embolus. Zero plasminogen activation; crosslinked fibrin mesh unaffected (0% lysis).`;
      }
      if (simulatedTimeSec < 14) {
        return `T+${simulatedTimeSec}s: Luminal obstruction remains 85% (mPAP 38 mmHg). Right ventricular strain continues unabated.`;
      }
      return `T+${simulatedTimeSec}s: TOXICOLOGY ALERT: ${selectedDoseMg} mg single caplet overwhelms hepatic sulfation/glucuronidation. Toxic NAPQI formation risk active!`;
    }

    if (selectedDrug.dissolutionCapability) {
      return `T+${simulatedTimeSec}s: Infusing ${selectedDrug.name}. Plasmin cleavage progressing (${currentLysisPct}% lysed, WSS stabilizing).`;
    }

    return `T+${simulatedTimeSec}s: Perfusing non-lytic agent. Anticoagulation active, but mechanical embolus obstruction unchanged.`;
  };

  // Notify parent on infusion state & slow motion
  useEffect(() => {
    if (onInfusionStateChange) {
      onInfusionStateChange({
        isInfusing: isSimulating,
        speedScale: isSimulating ? speedMultiplier : 1.0,
        isDrugInfused: isSimulating,
      });
    }
  }, [isSimulating, speedMultiplier, onInfusionStateChange]);

  // Simulation execution loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulatedTimeSec((prevTime) => {
        const nextTime = prevTime + 1;

        if (selectedDrug.dissolutionCapability) {
          const rate = 0.035 * selectedDrug.lysisRateMultiplier;
          const lysis = selectedDrug.maxLysisPct * (1 - Math.exp(-rate * nextTime));
          const roundedLysis = Math.min(selectedDrug.maxLysisPct, Math.round(lysis));

          setCurrentLysisPct(roundedLysis);
          onApplyLyticFraction(roundedLysis / 100);

          if (roundedLysis >= selectedDrug.maxLysisPct - 1) {
            setIsSimulating(false);
          }
        } else {
          setCurrentLysisPct(0);
          onApplyLyticFraction(0);
          if (nextTime >= 15) {
            setIsSimulating(false);
          }
        }

        return nextTime;
      });
    }, 160);

    return () => clearInterval(interval);
  }, [isSimulating, selectedDrug, onApplyLyticFraction]);

  const handleSelectDrug = (drug: ExtendedDrugInfo) => {
    setSelectedDrug(drug);
    if (drug.id === 'acetaminophen_apap' && drug.doseMg) {
      setSelectedDoseMg(drug.doseMg);
    }
    setIsSimulating(false);
    setSimulatedTimeSec(0);
    setCurrentLysisPct(0);
    onApplyLyticFraction(0);
  };

  const handleDoseChange = (dose: number) => {
    setSelectedDoseMg(dose);
    handleReset();
  };

  const handleReset = () => {
    setIsSimulating(false);
    setSimulatedTimeSec(0);
    setCurrentLysisPct(0);
    onApplyLyticFraction(0);
  };

  const handleToggleSimulate = () => {
    const nextSimulating = !isSimulating;
    setIsSimulating(nextSimulating);
  };

  // Biomarkers computed from dissolution progress
  const dDimerNgMl = Math.round(1200 + (currentLysisPct / 100) * 7800);
  const residualStenosisPct = Math.round(85 - (currentLysisPct / 100) * 70);
  const simulatedMPAP = (38 - (currentLysisPct / 100) * 21).toFixed(1);

  return (
    <div className="fixed top-20 left-16 sm:left-[270px] z-20 select-none transition-all duration-300">
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-r-xl border shadow-lg font-medium text-xs transition-colors ${
            isDarkTheme
              ? 'bg-[#131416] border-[#2a2b2e] text-[#e6b65c] hover:bg-[#1a1b1f]'
              : 'bg-white border-slate-300 text-[#b08d46] hover:bg-slate-50'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-[#e6b65c]" />
          <span>Thrombolytic Drug Simulator</span>
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </button>
      ) : (
        <div
          className={`w-[360px] max-w-[92vw] max-h-[84vh] flex flex-col rounded-2xl border shadow-2xl p-4 space-y-3 backdrop-blur-md transition-colors overflow-hidden ${
            isDarkTheme
              ? 'bg-[#131416]/95 border-[#2a2b2e] text-white shadow-2xl'
              : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-[#24252a] shrink-0">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-[#e6b65c]" />
              <div>
                <h3 className="text-xs font-semibold tracking-tight uppercase">
                  Thrombolytic Drug Simulator
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">
                  Enzymatic Clot Dissolution Engine
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onToggleHideBottomMenu}
                title={hideBottomMenu ? 'Show Bottom Menu' : 'Hide Bottom Menu for Clean Testing'}
                className={`p-1 rounded text-xs transition-colors ${
                  hideBottomMenu
                    ? 'text-[#e6b65c] bg-amber-500/10'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {hideBottomMenu ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded transition-colors"
                title="Collapse Panel"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto pr-1 space-y-3 flex-1">
            {/* Golden Bloodstream Indicator Banner */}
            <div
              className={`p-2.5 rounded-xl border text-xs leading-relaxed transition-all ${
                isSimulating
                  ? 'bg-amber-500/15 border-[#e6b65c] text-amber-900 dark:text-amber-200 shadow-sm'
                  : isDarkTheme
                  ? 'bg-[#18191d] border-[#2a2b2e] text-[#c5c9d3]'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="font-semibold mb-0.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#e6b65c]" />
                  {isSimulating ? 'Golden Drug Infusion Active' : 'Bloodstream Drug Infusion'}
                </span>
                {isSimulating && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e6b65c] text-black font-mono font-bold animate-pulse">
                    GOLD FLOW
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-tight">
                {isSimulating
                  ? 'Therapeutic drug molecules enter the 3D bloodstream as radiant gold particles, penetrating the clot in slow motion.'
                  : 'Select or type any drug. Injected drug flows through the artery as luminous gold in slow motion.'}
              </p>
            </div>

            {/* Quick Drug Category Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Presets:</span>
              <button
                onClick={() => {
                  const drug = EXTENDED_DRUGS.find((d) => d.id === 'alteplase_tpa');
                  if (drug) handleSelectDrug(drug);
                }}
                className={`px-2 py-0.5 text-[10px] rounded border transition-all ${
                  selectedDrug.id === 'alteplase_tpa'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500 font-bold'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                }`}
              >
                Alteplase (tPA)
              </button>
              <button
                onClick={() => {
                  const drug = EXTENDED_DRUGS.find((d) => d.id === 'acetaminophen_apap');
                  if (drug) handleSelectDrug(drug);
                }}
                className={`px-2 py-0.5 text-[10px] rounded font-semibold border transition-all ${
                  selectedDrug.id === 'acetaminophen_apap'
                    ? 'bg-red-500/25 text-red-500 border-red-500 shadow-sm font-bold'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 hover:border-red-500/50'
                }`}
              >
                ⚠ Acetaminophen 2,200 mg
              </button>
              <button
                onClick={() => {
                  const drug = EXTENDED_DRUGS.find((d) => d.id === 'tenecteplase_tnk');
                  if (drug) handleSelectDrug(drug);
                }}
                className="px-2 py-0.5 text-[10px] rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 hover:border-sky-500/40"
              >
                Tenecteplase
              </button>
            </div>

            {/* Type-in Search Input */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Type or Search Drug:
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. tPA, Alteplase, Heparin, TNK, Eliquis..."
                  className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none font-mono transition-colors ${
                    isDarkTheme
                      ? 'bg-[#16171b] border-[#2a2b2e] text-white placeholder-slate-500 focus:border-[#e6b65c]'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#b08d46]'
                  }`}
                />
              </div>
              {onOpenYouSearch && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenYouSearch(selectedDrug.name);
                  }}
                  className={`w-full flex items-center justify-between gap-1.5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold border transition-all shadow-sm ${
                    isDarkTheme
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/40'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FlaskConical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">Open 20-Drug Formulary</span>
                  </div>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-200 shrink-0">
                    u.com API
                  </span>
                </button>
              )}
            </div>

            {/* Drug Selection Pills (Filtered) */}
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {filteredDrugs.map((drug, idx) => {
                const isSelected = selectedDrug.id === drug.id && selectedDrug.name === drug.name;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectDrug(drug)}
                    className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? isDarkTheme
                          ? 'bg-[#202227] border-[#e6b65c] text-white'
                          : 'bg-slate-100 border-[#b08d46] text-slate-900 shadow-sm'
                        : isDarkTheme
                        ? 'bg-[#16171b] border-[#24252a] text-[#8a8f9d] hover:bg-[#1a1b1f]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[11px] flex items-center gap-1.5">
                        {drug.name}
                        {drug.dissolutionCapability ? (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 font-mono font-medium">
                            Dissolves Clot
                          </span>
                        ) : (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 font-mono font-medium">
                            No Lysis
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {drug.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono font-bold text-[#b08d46] shrink-0">
                      {drug.maxLysisPct}% Lysis
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Acetaminophen Dosage & Toxicological Hazard Panel */}
            {selectedDrug.id === 'acetaminophen_apap' && (
              <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 dark:bg-red-950/30 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-red-700 dark:text-red-300">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-red-500" />
                    Acetaminophen Caplet Formulation:
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white shadow-sm">
                    {selectedDoseMg} mg / caplet
                  </span>
                </div>

                {/* Dose Preset Buttons */}
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
                  {[
                    { mg: 325, label: '325 mg (Reg)' },
                    { mg: 500, label: '500 mg (Extra)' },
                    { mg: 1000, label: '1,000 mg (Max)' },
                    { mg: 2200, label: '2,200 mg (Overdose)' },
                  ].map((preset) => (
                    <button
                      key={preset.mg}
                      onClick={() => handleDoseChange(preset.mg)}
                      className={`py-1.5 px-1 text-center rounded border transition-all ${
                        selectedDoseMg === preset.mg
                          ? preset.mg > 1000
                            ? 'bg-red-600 text-white font-bold border-red-700 shadow-sm'
                            : 'bg-amber-500 text-black font-bold border-amber-600 shadow-sm'
                          : isDarkTheme
                          ? 'bg-[#1e1f25] border-slate-700 text-slate-300 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Toxicological Warning Panel */}
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-[11px] text-red-800 dark:text-red-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
                    <AlertOctagon className="w-4 h-4 shrink-0 text-red-500" />
                    <span>
                      {selectedDoseMg > 1000
                        ? `CRITICAL OVERDOSE: ${Math.round((selectedDoseMg / 1000) * 100)}% of Max Single Adult Dose`
                        : 'ZERO CLOT LYSIS: Ineffective for Pulmonary Embolus'}
                    </span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    {selectedDoseMg > 1000 ? (
                      <>
                        <strong className="font-semibold text-red-900 dark:text-red-100">Biomedical Result: 0% Embolus Breakdown.</strong> Acetaminophen is an analgesic peroxidase inhibitor lacking serine protease activity; it cannot activate plasminogen or cleave fibrin. Ingesting a <strong>{selectedDoseMg} mg caplet</strong> saturates hepatic sulfation/glucuronidation, shunting drug through CYP2E1 into electrophilic <strong>NAPQI</strong>, causing glutathione depletion and centrilobular liver necrosis.
                      </>
                    ) : (
                      <>
                        Acetaminophen provides central analgesia/antipyresis but cannot digest intravascular fibrin clots. The pulmonary embolus remains 85% occlusive.
                      </>
                    )}
                  </p>
                  <div className="pt-1 text-[10px] font-mono border-t border-red-500/30 flex items-center justify-between text-red-900 dark:text-red-200">
                    <span>{selectedDoseMg > 1000 ? 'ANTIDOTE: N-acetylcysteine (NAC)' : 'STANDARD: Alteplase (tPA)'}</span>
                    <span className="font-bold">CLOT LYSIS: 0%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Slow-Motion Flow Speed Controls */}
            <div className="p-2.5 bg-slate-100 dark:bg-[#16171b] rounded-xl border border-slate-200 dark:border-[#24252a] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-mono text-[10px] uppercase flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-[#e6b65c]" />
                  Flow Speed in Bloodstream:
                </span>
                <span className="font-mono text-[#b08d46] font-bold text-xs">
                  {speedMultiplier}× {speedMultiplier <= 0.25 ? 'Slow-Mo' : 'Normal'}
                </span>
              </div>

              <div className="flex gap-1.5">
                {[
                  { label: '0.15× Ultra Slow', val: 0.15 },
                  { label: '0.25× Slow-Mo', val: 0.25 },
                  { label: '0.5× Half', val: 0.5 },
                  { label: '1.0× Real-Time', val: 1.0 },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setSpeedMultiplier(s.val)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded transition-colors ${
                      speedMultiplier === s.val
                        ? 'bg-[#e6b65c] text-black font-bold shadow-sm'
                        : isDarkTheme
                        ? 'bg-[#202227] text-slate-400 hover:text-white'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    {s.val}×
                  </button>
                ))}
              </div>
            </div>

            {/* Live Pharmacodynamic & Toxicological Telemetry Ticker */}
            <div className="p-2.5 rounded-xl bg-[#090a0c] border border-slate-800 text-[11px] font-mono text-[#e6b65c] space-y-1 shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#e6b65c]" />
                  PHARMACODYNAMIC TELEMETRY
                </span>
                <span className="tabular-nums">T+{simulatedTimeSec}s</span>
              </div>
              <p className="leading-snug text-white/95">
                {getSimulationTicker()}
              </p>
            </div>

            {/* Simulation Action Controls & Gold Progress Bar */}
            <div className="p-3 bg-[#0c0d0f] rounded-xl border border-[#24252a] space-y-2.5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-mono">
                  Dissolution & Gold Perfusion
                </span>
                <span className="text-xs font-mono font-bold text-[#e6b65c] tabular-nums">
                  {currentLysisPct}% Hydrolyzed
                </span>
              </div>

              {/* Gold Progress Bar */}
              <div className="w-full h-2 bg-[#1c1d22] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    selectedDrug.dissolutionCapability
                      ? 'bg-gradient-to-r from-[#ffd700] via-[#e6b65c] to-[#b08d46]'
                      : 'bg-amber-600'
                  }`}
                  style={{ width: `${currentLysisPct}%` }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleToggleSimulate}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold text-black transition-all ${
                    isSimulating
                      ? 'bg-amber-400 hover:bg-amber-300 shadow-md animate-pulse'
                      : 'bg-[#e6b65c] hover:bg-[#f3ca76] shadow-sm'
                  }`}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  <span>{isSimulating ? 'Pause Slow-Mo Test' : 'Test Drug in Bloodstream'}</span>
                </button>

                <button
                  onClick={handleReset}
                  title="Reset Infusion"
                  className="p-2 rounded-lg border border-[#2a2b2e] bg-[#16171a] text-slate-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Biomarker Readouts */}
            <div className={`grid ${selectedDrug.id === 'acetaminophen_apap' ? 'grid-cols-4' : 'grid-cols-3'} gap-2 text-center text-xs`}>
              <div className="p-1.5 bg-slate-100 dark:bg-[#16171b] rounded-lg border border-slate-200 dark:border-[#24252a]">
                <span className="text-[9px] text-slate-500 font-mono block">D-DIMER</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {dDimerNgMl} <span className="text-[8px] font-normal">ng/mL</span>
                </span>
              </div>

              <div className="p-1.5 bg-slate-100 dark:bg-[#16171b] rounded-lg border border-slate-200 dark:border-[#24252a]">
                <span className="text-[9px] text-slate-500 font-mono block">STENOSIS</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                  {residualStenosisPct}%
                </span>
              </div>

              <div className="p-1.5 bg-slate-100 dark:bg-[#16171b] rounded-lg border border-slate-200 dark:border-[#24252a]">
                <span className="text-[9px] text-slate-500 font-mono block">mPAP</span>
                <span className="text-[11px] font-mono font-bold text-[#e6b65c] tabular-nums">
                  {simulatedMPAP} <span className="text-[8px] font-normal">mmHg</span>
                </span>
              </div>

              {selectedDrug.id === 'acetaminophen_apap' && (
                <div className={`p-1.5 rounded-lg border ${
                  selectedDoseMg > 1000
                    ? 'bg-red-500/15 border-red-500/40 text-red-500'
                    : 'bg-slate-100 dark:bg-[#16171b] border-slate-200 dark:border-[#24252a]'
                }`}>
                  <span className="text-[9px] font-mono block opacity-80">DOSE LOAD</span>
                  <span className="text-[10px] font-mono font-bold tabular-nums block">
                    {selectedDoseMg} mg
                  </span>
                  <span className="text-[8px] font-mono font-bold uppercase block">
                    {selectedDoseMg > 1000 ? 'TOXIC' : 'SAFE'}
                  </span>
                </div>
              )}
            </div>

            {/* Mechanism & Safety Information */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-[#24252a] space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                {selectedDrug.dissolutionCapability ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>Target: {selectedDrug.targetEnzyme}</span>
              </div>
              <p className="leading-tight">{selectedDrug.mechanism}</p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 pt-0.5 font-mono">
                ⚠ {selectedDrug.clinicalRisk}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
