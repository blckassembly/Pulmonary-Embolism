/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Navigation,
  Compass,
  CheckCircle2,
  Shield,
  Sparkles,
} from 'lucide-react';
import { ExplorerAnatomyId } from '../types/biomedical.ts';

interface ClotPathControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  onSeekProgress: (progress: number) => void;
  onReset: () => void;
  speed: number;
  onToggleSpeed: () => void;
  selectedStructureId: ExplorerAnatomyId;
  onSelectStructure: (id: ExplorerAnatomyId) => void;
  isDarkTheme?: boolean;
}

const CHECKPOINTS: { id: ExplorerAnatomyId; label: string; progress: number }[] = [
  { id: 'deepVeins', label: '1. Deep Veins (DVT)', progress: 0.05 },
  { id: 'heart', label: '2. Heart (Right Ventricle)', progress: 0.38 },
  { id: 'pulmonaryArtery', label: '3. Pulmonary Artery Occlusion', progress: 0.85 },
  { id: 'lungs', label: '4. Lung Perfusion Deficit', progress: 1.0 },
];

export const ClotPathControlBar: React.FC<ClotPathControlBarProps> = ({
  isPlaying,
  onTogglePlay,
  progress,
  onSeekProgress,
  onReset,
  speed,
  onToggleSpeed,
  selectedStructureId,
  onSelectStructure,
  isDarkTheme = true,
}) => {
  return (
    <div
      className={`fixed bottom-4 right-4 z-30 w-[calc(100vw-5rem)] max-w-2xl px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
        isDarkTheme
          ? 'bg-[#0f1014]/90 border-[#2a2c34] text-white shadow-black/60'
          : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-300/60'
      }`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Top row: Checkpoints and Title */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-bold tracking-tight text-sm flex items-center gap-2">
              <span>Clot Trajectory Guide</span>
              <span className="text-xs font-mono text-amber-400 font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                DVT → PE Transit
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm font-mono text-slate-400">
            <span>Path:</span>
            <span className="font-bold text-amber-400">{Math.round(progress * 100)}%</span>
          </div>
        </div>

        {/* Progress Scrubber Bar */}
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={(e) => onSeekProgress(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700/50 accent-amber-400"
          />
        </div>

        {/* Bottom row: Checkpoint Buttons & Play Controls */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* Checkpoint Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {CHECKPOINTS.map((cp) => {
              const isCurrent = Math.abs(progress - cp.progress) < 0.15 || selectedStructureId === cp.id;
              return (
                <button
                  key={cp.id}
                  onClick={() => {
                    onSeekProgress(cp.progress);
                    onSelectStructure(cp.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap border ${
                    isCurrent
                      ? isDarkTheme
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                        : 'bg-amber-100 border-amber-500 text-amber-900 font-bold shadow-xs'
                      : isDarkTheme
                      ? 'bg-[#181a20] border-transparent text-slate-300 hover:text-white hover:border-[#2a2c34]'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cp.label}
                </button>
              );
            })}
          </div>

          {/* Player controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Speed Toggle */}
            <button
              onClick={onToggleSpeed}
              title={`Animation speed: ${speed}x`}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                speed < 0.08
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : isDarkTheme
                  ? 'bg-[#181a20] border-[#2a2c34] text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {speed < 0.08 ? '0.5x Slow' : '1.0x Normal'}
            </button>

            {/* Reset */}
            <button
              onClick={onReset}
              title="Reset Clot to Deep Vein Origin"
              className={`p-2 rounded-lg border transition-colors ${
                isDarkTheme
                  ? 'bg-[#181a20] border-[#2a2c34] text-slate-400 hover:text-white hover:bg-[#22242c]'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause Animation' : 'Play Clot Path Animation'}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-black font-bold text-sm transition-all shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
              <span>{isPlaying ? 'Pause' : 'Play Path'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
