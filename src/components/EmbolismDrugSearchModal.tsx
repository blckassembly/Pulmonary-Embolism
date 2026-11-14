/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FlaskConical,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Play,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  X,
  BookOpen,
  ArrowRight,
  Info,
  Clock,
  Zap,
} from 'lucide-react';
import { EmbolismDrugEntity } from '../types/biomedical.ts';
import { EMBOLISM_DRUGS_DATASET } from '../data/embolismDrugsDataset.ts';

interface EmbolismDrugSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme?: boolean;
  onSelectDrugForSimulation?: (drugId: string) => void;
}

type FilterCategory = 'all' | 'dissolves' | 'prevents' | 'statins' | 'antiplatelets_reversal';

export const EmbolismDrugSearchModal: React.FC<EmbolismDrugSearchModalProps> = ({
  isOpen,
  onClose,
  isDarkTheme = true,
  onSelectDrugForSimulation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [selectedDrug, setSelectedDrug] = useState<EmbolismDrugEntity>(EMBOLISM_DRUGS_DATASET[0]);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState(false);
  const [evidenceData, setEvidenceData] = useState<{
    citations: any[];
    clinicalBriefing: string | null;
    source?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence'>('overview');

  // Filtered drug list
  const filteredDrugs = useMemo(() => {
    let list = EMBOLISM_DRUGS_DATASET;

    if (filterCategory === 'dissolves') {
      list = list.filter((d) => d.canBreakClot);
    } else if (filterCategory === 'prevents') {
      list = list.filter((d) => d.clotAction === 'prevents_propagation');
    } else if (filterCategory === 'statins') {
      list = list.filter((d) => d.drugClass === 'lipid_lowering_pleiotropic');
    } else if (filterCategory === 'antiplatelets_reversal') {
      list = list.filter((d) => d.drugClass === 'antiplatelet' || d.drugClass === 'antidote_reversal');
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.brandNames.some((b) => b.toLowerCase().includes(q)) ||
        d.synonyms.some((s) => s.toLowerCase().includes(q)) ||
        d.mechanismOfAction.toLowerCase().includes(q) ||
        d.targetEnzymeOrReceptor.toLowerCase().includes(q) ||
        d.clinicalIndication.toLowerCase().includes(q) ||
        d.physicianRationale.toLowerCase().includes(q) ||
        (d.lipidOrPlaqueNote && d.lipidOrPlaqueNote.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, filterCategory]);

  // Load u.com evidence when selected drug changes or user switches to evidence tab
  useEffect(() => {
    if (activeTab === 'evidence' && selectedDrug) {
      fetchDrugEvidence(selectedDrug.id);
    }
  }, [selectedDrug.id, activeTab]);

  const fetchDrugEvidence = async (drugId: string) => {
    setIsLoadingEvidence(true);
    setEvidenceData(null);
    try {
      const res = await fetch('/api/drugs/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugId }),
      });
      const data = await res.json();
      if (data.success) {
        setEvidenceData({
          citations: data.citations || [],
          clinicalBriefing: data.clinicalBriefing,
          source: data.source,
        });
      }
    } catch (err) {
      console.error('Failed to fetch drug evidence from u.com:', err);
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/60 backdrop-blur-xs animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`ml-14 sm:ml-64 w-full max-w-4xl h-full flex flex-col border-r shadow-2xl overflow-hidden transition-colors ${
          isDarkTheme
            ? 'bg-[#0f1117] border-[#222530] text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDarkTheme ? 'border-[#1e2230] bg-[#141722]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Embolism Pharmacotherapy Formulary</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  20 Curated Agents
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  Powered by u.com API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeted drug search for pulmonary embolism: acute fibrin dissolution, propagation prevention, and statin plaque stabilization.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDarkTheme ? 'hover:bg-neutral-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div
          className={`px-5 py-3 border-b flex flex-col sm:flex-row items-center gap-3 ${
            isDarkTheme ? 'border-[#1e2230] bg-[#12141d]' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drug name, mechanism, target (e.g., 'tPA', 'high cholesterol', 'DOAC', 'heparin', 'Andexxa')..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                isDarkTheme
                  ? 'bg-[#181b26] border-[#262a3a] text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                  : 'bg-slate-100 border-slate-300 text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterCategory === 'all'
                  ? 'bg-slate-200 text-slate-900 font-bold dark:bg-white dark:text-black'
                  : isDarkTheme
                  ? 'text-slate-400 hover:bg-[#1a1e2c]'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({EMBOLISM_DRUGS_DATASET.length})
            </button>
            <button
              onClick={() => setFilterCategory('dissolves')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterCategory === 'dissolves'
                  ? 'bg-emerald-500 text-black font-bold'
                  : isDarkTheme
                  ? 'text-emerald-400 hover:bg-[#1a1e2c]'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span>💥 Breaks Clot</span>
              <span className="text-[10px] opacity-75">(6)</span>
            </button>
            <button
              onClick={() => setFilterCategory('prevents')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterCategory === 'prevents'
                  ? 'bg-amber-500 text-black font-bold'
                  : isDarkTheme
                  ? 'text-amber-400 hover:bg-[#1a1e2c]'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <span>🛡️ Anticoagulants</span>
              <span className="text-[10px] opacity-75">(9)</span>
            </button>
            <button
              onClick={() => setFilterCategory('statins')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterCategory === 'statins'
                  ? 'bg-blue-500 text-white font-bold'
                  : isDarkTheme
                  ? 'text-blue-400 hover:bg-[#1a1e2c]'
                  : 'text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span>🧬 Statins / Plaque</span>
              <span className="text-[10px] opacity-75">(2)</span>
            </button>
            <button
              onClick={() => setFilterCategory('antiplatelets_reversal')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                filterCategory === 'antiplatelets_reversal'
                  ? 'bg-purple-500 text-white font-bold'
                  : isDarkTheme
                  ? 'text-purple-400 hover:bg-[#1a1e2c]'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <span>🩸 Antiplatelet / Antidotes</span>
              <span className="text-[10px] opacity-75">(3)</span>
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div
          className={`px-5 py-2 border-b flex items-center gap-2 overflow-x-auto text-[11px] ${
            isDarkTheme ? 'border-[#1e2230] bg-[#10121a] text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
          }`}
        >
          <span className="font-semibold text-slate-500 whitespace-nowrap">Clinical Scenarios:</span>
          {[
            { label: 'High Cholesterol & Plaque Stabilization', term: 'cholesterol' },
            { label: 'Massive PE Emergency Lysis', term: 'alteplase' },
            { label: 'Single-Bolus Fibrinolysis (PEITHO)', term: 'tenecteplase' },
            { label: 'Low Bleeding Catheter Ultrasound (EKOS)', term: 'ekos' },
            { label: 'Oral DOAC Maintenance', term: 'apixaban' },
            { label: 'Reversal of DOAC Hemorrhage', term: 'andexanet' },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => setSearchQuery(chip.term)}
              className={`px-2 py-0.5 rounded-md border whitespace-nowrap transition-colors ${
                isDarkTheme
                  ? 'border-[#262a3a] hover:border-slate-500 bg-[#151822] text-slate-300'
                  : 'border-slate-300 hover:border-slate-400 bg-white text-slate-700'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Main Body: 2-Column Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Drug Cards List */}
          <div
            className={`w-full md:w-[420px] lg:w-[480px] border-r overflow-y-auto flex flex-col divide-y ${
              isDarkTheme
                ? 'border-[#1e2230] divide-[#191c28] bg-[#0c0e14]'
                : 'border-slate-200 divide-slate-100 bg-slate-50/50'
            }`}
          >
            {filteredDrugs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <FlaskConical className="w-10 h-10 mx-auto text-slate-500 mb-2 opacity-50" />
                <p className="font-medium text-xs">No matching pharmacotherapy agents found.</p>
                <p className="text-[11px] mt-1 text-slate-500">Try searching "cholesterol", "tPA", "heparin", or "DOAC".</p>
              </div>
            ) : (
              filteredDrugs.map((drug) => {
                const isSelected = selectedDrug?.id === drug.id;
                return (
                  <div
                    key={drug.id}
                    onClick={() => setSelectedDrug(drug)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? isDarkTheme
                          ? 'bg-[#181d2c] border-l-4 border-l-emerald-500 shadow-inner'
                          : 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                        : isDarkTheme
                        ? 'hover:bg-[#121520]'
                        : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-xs text-white dark:text-white text-slate-900">{drug.name}</h3>
                          {drug.canBreakClot ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Breaks Clot ({drug.maxLysisPct}%)
                            </span>
                          ) : drug.drugClass === 'lipid_lowering_pleiotropic' ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Plaque / Endothelial
                            </span>
                          ) : drug.clotAction === 'prevents_propagation' ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Halts Propagation
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              {drug.classLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">{drug.genericName}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 block">{drug.typicalDosing.split('(')[0].slice(0, 24)}...</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-700 line-clamp-2 mt-2 leading-relaxed">
                      {drug.mechanismOfAction}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-medium text-slate-500">Target: {drug.targetEnzymeOrReceptor.split('(')[0]}</span>
                      <span className="font-mono text-emerald-400 font-semibold">{drug.keyGuideline.split(';')[0].slice(0, 20)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Selected Drug Detail & Live u.com Evidence */}
          <div className="flex-1 flex flex-col overflow-hidden bg-transparent">
            {/* Detail Tabs */}
            <div
              className={`flex items-center justify-between px-6 py-3 border-b ${
                isDarkTheme ? 'border-[#1e2230] bg-[#121520]' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-emerald-500 text-black font-bold'
                      : isDarkTheme
                      ? 'text-slate-300 hover:bg-neutral-800'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Clinical Overview & Mechanism
                </button>
                <button
                  onClick={() => setActiveTab('evidence')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    activeTab === 'evidence'
                      ? 'bg-sky-500 text-black font-bold'
                      : isDarkTheme
                      ? 'text-sky-400 hover:bg-neutral-800'
                      : 'text-sky-700 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Live u.com Evidence & Citations</span>
                </button>
              </div>

              {/* Action: Simulate in 3D / CAD Cutaway */}
              {onSelectDrugForSimulation && (
                <button
                  onClick={() => {
                    onSelectDrugForSimulation(selectedDrug.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-md transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  <span>Simulate in 3D / CAD Cutaway</span>
                </button>
              )}
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {activeTab === 'overview' ? (
                <>
                  {/* Hero Drug Card */}
                  <div
                    className={`p-5 rounded-2xl border ${
                      isDarkTheme ? 'bg-[#151926] border-[#22273a]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-xl font-bold tracking-tight text-white dark:text-white text-slate-900">{selectedDrug.name}</h1>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {selectedDrug.classLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-1">Generic: {selectedDrug.genericName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Brand names: <span className="text-slate-300 font-medium">{selectedDrug.brandNames.join(', ')}</span>
                        </p>
                      </div>

                      {/* Clot Breaking Status Badge */}
                      <div className="text-right shrink-0">
                        {selectedDrug.canBreakClot ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              Direct Fibrin Clot Dissolution
                            </span>
                            <span className="text-[11px] font-mono text-emerald-300 mt-1">
                              Max Lysis: ~{selectedDrug.maxLysisPct}% | Speed: {selectedDrug.onsetMinutes}m
                            </span>
                          </div>
                        ) : selectedDrug.drugClass === 'lipid_lowering_pleiotropic' ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-blue-400" />
                              Plaque / Endothelial Stabilizer
                            </span>
                            <span className="text-[11px] text-blue-300 mt-1">Halts Thrombogenic State</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-amber-400" />
                              Propagation Prevention (Non-Lytic)
                            </span>
                            <span className="text-[11px] text-amber-300 mt-1">Does Not Lyse Existing Fibrin</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Statin / Cholesterol Real-Time Pearl */}
                    {selectedDrug.lipidOrPlaqueNote && (
                      <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-200 text-xs flex items-start gap-2.5">
                        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-blue-300">Physician Insight (High Cholesterol & Thrombosis): </span>
                          <span>{selectedDrug.lipidOrPlaqueNote}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Molecular Mechanism & Real-Time Physician Rationale */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-xl border ${
                        isDarkTheme ? 'bg-[#151926] border-[#22273a]' : 'bg-white border-slate-200'
                      }`}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
                        <FlaskConical className="w-3.5 h-3.5" />
                        Molecular Mechanism of Action
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300 text-slate-700">
                        {selectedDrug.mechanismOfAction}
                      </p>
                      <div className="mt-3 pt-3 border-t border-[#22273a] text-xs">
                        <span className="text-slate-400 font-semibold">Enzyme Target: </span>
                        <span className="text-emerald-300 font-mono">{selectedDrug.targetEnzymeOrReceptor}</span>
                      </div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        isDarkTheme ? 'bg-[#151926] border-[#22273a]' : 'bg-white border-slate-200'
                      }`}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-2">
                        <Activity className="w-3.5 h-3.5" />
                        Physician's Bedside Rationale
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-300 dark:text-slate-300 text-slate-700">
                        {selectedDrug.physicianRationale}
                      </p>
                      <div className="mt-3 pt-3 border-t border-[#22273a] text-xs">
                        <span className="text-slate-400 font-semibold">Typical Clinical Dosing: </span>
                        <span className="text-white font-mono">{selectedDrug.typicalDosing}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clinical Guidelines & Safety Matrix */}
                  <div
                    className={`p-4 rounded-xl border ${
                      isDarkTheme ? 'bg-[#151926] border-[#22273a]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-3">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Clinical Safety, Guidelines & Landmark Trials
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px] font-semibold">Guideline Recommendation</span>
                        <span className="font-medium text-slate-200">{selectedDrug.keyGuideline}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-semibold">Landmark Clinical Trials</span>
                        <span className="font-mono text-slate-300">{selectedDrug.clinicalTrials.join(' • ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] font-semibold">Specific Reversal Antidote</span>
                        <span className="font-medium text-amber-300">{selectedDrug.reversalAgent || 'Supportive care / FFP'}</span>
                      </div>
                    </div>

                    {selectedDrug.contraindications && selectedDrug.contraindications.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#22273a]">
                        <span className="text-[11px] font-bold text-red-400 block mb-1">Key Contraindications:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedDrug.contraindications.map((contra, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] rounded bg-red-950/40 text-red-300 border border-red-800/40"
                            >
                              {contra}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Live u.com Evidence Tab */
                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      isDarkTheme ? 'bg-[#151926] border-[#22273a]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                        <Sparkles className="w-4 h-4 text-sky-400" />
                        <span>Real-Time u.com Medical Evidence for {selectedDrug.name}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Query: <code className="font-mono text-sky-300">{selectedDrug.uComEvidenceQuery}</code>
                      </p>
                    </div>
                    <button
                      onClick={() => fetchDrugEvidence(selectedDrug.id)}
                      disabled={isLoadingEvidence}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 transition-colors disabled:opacity-50"
                    >
                      {isLoadingEvidence ? 'Querying u.com...' : 'Refresh Sourced Citations'}
                    </button>
                  </div>

                  {isLoadingEvidence ? (
                    <div className="p-12 text-center text-slate-400 space-y-3">
                      <div className="w-8 h-8 mx-auto border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-medium">Synthesizing live peer-reviewed citations via u.com API & MCP...</p>
                    </div>
                  ) : evidenceData ? (
                    <div className="space-y-4">
                      {/* Synthesized Physician Briefing */}
                      {evidenceData.clinicalBriefing && (
                        <div
                          className={`p-5 rounded-2xl border ${
                            isDarkTheme ? 'bg-[#131722] border-sky-900/40 text-slate-200' : 'bg-sky-50 border-sky-200 text-slate-800'
                          }`}
                        >
                          <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5 mb-2">
                            <BookOpen className="w-4 h-4" />
                            Physician Evidence Synthesis (Sourced via u.com)
                          </h4>
                          <div className="text-xs leading-relaxed space-y-2 whitespace-pre-line font-sans">
                            {evidenceData.clinicalBriefing}
                          </div>
                        </div>
                      )}

                      {/* Citation Links */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Sourced Literature & Clinical Trials ({evidenceData.citations.length})
                        </h4>
                        <div className="space-y-2">
                          {evidenceData.citations.length === 0 ? (
                            <p className="text-xs text-slate-400">No external URLs returned.</p>
                          ) : (
                            evidenceData.citations.map((cite, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border transition-all ${
                                  isDarkTheme
                                    ? 'bg-[#151926] border-[#22273a] hover:border-sky-500/50'
                                    : 'bg-white border-slate-200 hover:border-sky-400'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <a
                                    href={cite.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-xs text-sky-400 hover:underline flex items-center gap-1.5"
                                  >
                                    <span>{cite.title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  </a>
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {new URL(cite.url).hostname.replace('www.', '')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 dark:text-slate-300 text-slate-600 mt-1 line-clamp-2">
                                  {cite.description}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
