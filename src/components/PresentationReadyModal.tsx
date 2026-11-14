/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Sparkles, ArrowRight, Layers, Cpu, X, CheckCircle2 } from 'lucide-react';
import { ReconstructedPresentation } from '../types/biomedical.ts';

interface PresentationReadyModalProps {
  presentation: ReconstructedPresentation | null;
  isOpen: boolean;
  onLaunch: () => void;
  onInspectPanels: () => void;
  onClose: () => void;
  isDarkTheme: boolean;
}

export const PresentationReadyModal: React.FC<PresentationReadyModalProps> = ({
  presentation,
  isOpen,
  onLaunch,
  onInspectPanels,
  onClose,
  isDarkTheme,
}) => {
  // Play subtle biophysical Web Audio chime on appearance
  useEffect(() => {
    if (isOpen) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // audio context blocked or not supported
      }
    }
  }, [isOpen]);

  if (!isOpen || !presentation) return null;

  return (
    <aside
      aria-label="Presentation Ready Notification"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-6 duration-300"
    >
      <div
        className={`relative p-5 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          isDarkTheme
            ? 'bg-[#121316]/95 border-[#e6b65c]/40 text-white shadow-black/60'
            : 'bg-white/95 border-amber-300/80 text-slate-900 shadow-amber-900/10'
        }`}
      >
        {/* Glowing Gold Accent Pill */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#deb35a]/20 text-[#b08d46] dark:text-[#f3cc77] border border-[#deb35a]/40">
              <Sparkles className="w-3.5 h-3.5 text-[#deb35a] animate-pulse" />
              <span>3D Presentation Ready</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Three.js Compiled</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isDarkTheme
                ? 'text-[#8a8f9d] hover:text-white hover:bg-[#202227]'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presentation Title & Organ Details */}
        <div className="space-y-1.5 mb-3">
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {presentation.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {presentation.summary}
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg mb-4 text-[11px] bg-slate-100/70 dark:bg-[#1a1b20] border border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Layers className="w-3.5 h-3.5 text-[#deb35a]" />
            <span>4 Multi-Scale Stages</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-[#deb35a]" />
            <span>{presentation.imageCount} Uploaded Images</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Density: {(presentation.networkParams.networkDensity * 100).toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Pore: {presentation.networkParams.poreSizeUm} µm</span>
          </div>
        </div>

        {/* Primary and Secondary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLaunch}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#deb35a] to-[#c79a3b] hover:from-[#e6b65c] hover:to-[#deb35a] text-slate-950 text-xs font-semibold shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all"
          >
            <span>Launch 3D Presentation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onInspectPanels}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
              isDarkTheme
                ? 'border-[#2a2b2e] hover:bg-[#202227] text-white'
                : 'border-slate-300 hover:bg-slate-100 text-slate-800'
            }`}
          >
            Inspect Panels A–F
          </button>
        </div>
      </div>
    </aside>
  );
};
