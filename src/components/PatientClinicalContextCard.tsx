/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  UserCheck,
  AlertCircle,
  ShieldAlert,
  Activity,
  X,
  Stethoscope,
} from 'lucide-react';
import { getPatientContextForProgress } from '../data/patientClinicalContextData.ts';

interface PatientClinicalContextCardProps {
  isOpen: boolean;
  onClose: () => void;
  clotPathProgress: number;
  isDarkTheme: boolean;
  hasTopHotspotsBar?: boolean;
}

export const PatientClinicalContextCard: React.FC<PatientClinicalContextCardProps> = ({
  isOpen,
  onClose,
  clotPathProgress,
  isDarkTheme,
  hasTopHotspotsBar = false,
}) => {
  if (!isOpen) return null;

  const ctx = getPatientContextForProgress(clotPathProgress);

  const vitalToneClass = (tone: 'normal' | 'elevated' | 'critical') => {
    if (tone === 'critical') {
      return isDarkTheme
        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
        : 'bg-rose-50 border-rose-300 text-rose-800';
    }
    if (tone === 'elevated') {
      return isDarkTheme
        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
        : 'bg-amber-50 border-amber-300 text-amber-900';
    }
    return isDarkTheme
      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
      : 'bg-emerald-50 border-emerald-300 text-emerald-800';
  };

  return (
    <aside
      aria-label="Patient Clinical Context"
      className={`fixed right-4 z-30 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 ${
        hasTopHotspotsBar ? 'top-28' : 'top-4'
      } ${
        isDarkTheme
          ? 'bg-[#0c0e13]/92 border-[#272a36] text-slate-100 shadow-black/75'
          : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/35'
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between gap-2 rounded-t-2xl ${
          isDarkTheme ? 'border-[#20232d] bg-[#12141c]/90' : 'border-slate-200 bg-slate-50/90'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-400 shrink-0">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold tracking-tight truncate">
                Patient Clinical Context
              </h3>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                Stage {ctx.stageNumber}/4
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 truncate">
              {ctx.stageTitle} · {Math.round(clotPathProgress * 100)}%
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          title="Hide Patient Clinical Context"
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-3 max-h-[calc(100vh-14rem)] overflow-y-auto">
        {/* Hypothetical Age & Baseline Identity Strip */}
        <div
          className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
            isDarkTheme ? 'bg-[#141720] border-[#252936]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">
                Age {ctx.age} · {ctx.sex}
              </span>
              <span className="text-xs font-mono text-sky-400">{ctx.patientLabel}</span>
            </div>
            <p className={`text-xs mt-0.5 leading-snug ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
              {ctx.baselineProfile}
            </p>
          </div>
        </div>

        {/* Stage Vitals Snapshot */}
        <div className="grid grid-cols-3 gap-1.5">
          {ctx.vitalSnapshot.map((vital) => (
            <div
              key={vital.label}
              className={`px-2.5 py-1.5 rounded-lg border text-center ${vitalToneClass(vital.tone)}`}
            >
              <div className="text-[11px] font-mono opacity-80">{vital.label}</div>
              <div className="text-sm font-mono font-bold tabular-nums">{vital.value}</div>
            </div>
          ))}
        </div>

        {/* Risk Profile */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Risk Profile</span>
          </div>
          <ul className={`space-y-1 text-xs leading-snug ${isDarkTheme ? 'text-slate-300' : 'text-slate-700'}`}>
            {ctx.riskFactors.map((risk, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stage-Corresponding Symptoms */}
        <div className="space-y-1">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Stage Symptoms & Signs</span>
          </div>
          <ul className={`space-y-1 text-xs leading-snug ${isDarkTheme ? 'text-slate-200' : 'text-slate-800'}`}>
            {ctx.symptoms.map((sym, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-rose-400 mt-0.5">•</span>
                <span>{sym}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Educational Case Note */}
        <div
          className={`px-2.5 py-2 rounded-lg border text-xs leading-snug flex items-start gap-1.5 ${
            isDarkTheme
              ? 'bg-[#12141b] border-[#222532] text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>{ctx.clinicalSummary}</span>
        </div>
      </div>
    </aside>
  );
};
