/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Dna,
  ExternalLink,
  X,
  Search,
  Layers,
  Pill,
  BookOpen,
  ShieldCheck,
  Activity,
  Atom,
} from 'lucide-react';

interface BiologicalTarget {
  symbol: string;
  name: string;
  uniprotId: string;
  chemblId: string;
  pdbIds: string[];
  organism: string;
  function: string;
  catalyticTriad: string;
  domains: { name: string; role: string }[];
  approvedDrugs: { name: string; type: string; role: string; indication: string }[];
}

interface BioscienceTargetInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

export const BioscienceTargetInspector: React.FC<BioscienceTargetInspectorProps> = ({
  isOpen,
  onClose,
  isDarkTheme,
}) => {
  const [targets, setTargets] = useState<BiologicalTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<BiologicalTarget | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch('/api/science/targets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.targets) {
          setTargets(data.targets);
          if (!selectedTarget && data.targets.length > 0) {
            setSelectedTarget(data.targets[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to fetch bioscience targets:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTargets = targets.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.uniprotId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDarkTheme
            ? 'bg-[#121316] border-[#2a2b30] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkTheme ? 'border-[#232428] bg-[#16171b]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Dna className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Bioscience Target & Pharmacology Intelligence</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                  UniProtKB · ChEMBL · PDB
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Grounded biochemical data for coagulation enzymes, fibrin mesh substrates, and thrombolytic agents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkTheme
                ? 'hover:bg-slate-800 text-slate-400 border-transparent hover:border-slate-700'
                : 'hover:bg-slate-200 text-slate-500 border-transparent hover:border-slate-300'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two-Pane Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Left Navigation: Target List */}
          <div className="w-full md:w-80 flex flex-col p-4 space-y-3 shrink-0 bg-slate-50/50 dark:bg-[#141519]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbol, UniProt, or enzyme..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                  isDarkTheme
                    ? 'bg-[#18191e] border-[#2b2c32] text-slate-100 placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredTargets.map((target) => {
                const isSelected = selectedTarget?.symbol === target.symbol;
                return (
                  <button
                    key={target.symbol}
                    onClick={() => setSelectedTarget(target)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                      isSelected
                        ? isDarkTheme
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300 shadow-sm'
                          : 'border-emerald-500/60 bg-emerald-50 text-emerald-950 font-medium shadow-sm'
                        : isDarkTheme
                        ? 'border-[#28292f] bg-[#17181c] text-slate-300 hover:border-slate-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold mb-0.5">
                      <span className="text-sm font-mono">{target.symbol}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800">
                        {target.uniprotId}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 truncate">{target.name}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Pane: Selected Target Detail */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedTarget ? (
              <div className="space-y-6">
                {/* Title & Cross-References */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold font-mono tracking-tight">{selectedTarget.symbol}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium border border-emerald-500/20">
                        {selectedTarget.organism}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">{selectedTarget.name}</p>
                  </div>

                  {/* External Biological Database Links */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`https://www.uniprot.org/uniprotkb/${selectedTarget.uniprotId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>UniProt:{selectedTarget.uniprotId}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                    <a
                      href={`https://www.ebi.ac.uk/chembl/target_report_card/${selectedTarget.chemblId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-mono hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>ChEMBL:{selectedTarget.chemblId}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  </div>
                </div>

                {/* Function & Role */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Biological Mechanism in Thromboembolism</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#16171b] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    {selectedTarget.function}
                  </p>
                </div>

                {/* Catalytic Triad & Structural Crystallography */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16171b] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Atom className="w-3.5 h-3.5 text-sky-500" />
                      <span>Active Catalytic Residues</span>
                    </div>
                    <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      {selectedTarget.catalyticTriad}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16171b] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>RCSB PDB Crystal Structures</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedTarget.pdbIds.map((pdb) => (
                        <a
                          key={pdb}
                          href={`https://www.rcsb.org/structure/${pdb}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:border-amber-500/40"
                        >
                          {pdb}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Protein Domains */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Domain Architecture & Binding Sites</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedTarget.domains.map((dom, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{dom.name}</span>
                        <span className="text-slate-500 text-[11px] sm:max-w-md">{dom.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approved Pharmacological Agents */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Targeted Pharmacotherapy & Clinical Indications</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedTarget.approvedDrugs.map((drug, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#16171b]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{drug.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-400">
                              {drug.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{drug.role}</p>
                        </div>
                        <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          {drug.indication}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Select a biological target to inspect molecular data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
