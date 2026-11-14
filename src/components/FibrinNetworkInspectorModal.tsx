/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sliders,
  Check,
  Maximize2,
  Dna,
  Share2,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { FibrinInspectorParams } from '../types/biomedical.ts';

interface FibrinNetworkInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: FibrinInspectorParams;
  onUpdateParams: (newParams: FibrinInspectorParams) => void;
  isDarkTheme: boolean;
}

export const FibrinNetworkInspectorModal: React.FC<FibrinNetworkInspectorModalProps> = ({
  isOpen,
  onClose,
  params,
  onUpdateParams,
  isDarkTheme,
}) => {
  const [localParams, setLocalParams] = useState<FibrinInspectorParams>(params);
  const [activePanel, setActivePanel] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('A');
  const [applied, setApplied] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    onUpdateParams(localParams);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const handleReset = () => {
    const defaultParams: FibrinInspectorParams = {
      networkDensity: 0.82,
      fiberRadiusUm: 0.28,
      branchProbability: 0.75,
      crossLinkProbability: 0.8,
      poreSizeUm: 3.4,
      orientationBias: 0.45,
    };
    setLocalParams(defaultParams);
    onUpdateParams(defaultParams);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
      />

      {/* Main Reference Dialog Container matching User's Provided Design */}
      <div
        className={`relative z-10 w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDarkTheme
            ? 'bg-[#0a0a0c] text-white border-[#2a2b2e]'
            : 'bg-[#101115] text-white border-slate-700 shadow-black/80'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="text-[#deb35a]">FIBRIN NETWORK</span>
                <span className="text-xs px-2 py-0.5 rounded-sm bg-[#deb35a]/20 text-[#deb35a] border border-[#deb35a]/40 font-mono">
                  3D MICROSTRUCTURAL MODEL
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-300 tracking-wide mt-0.5">
              3D Microstructural model of a blood clot with graph-based representation and parametric visualization (illustrative / microscopy-derived model).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Biophysical Indicators Bar (Directly from reference design) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-6 py-2.5 bg-black/60 border-b border-white/5 text-[11px]">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-[#deb35a]" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Diameter Distribution</div>
              <div className="font-semibold text-slate-200">
                {(localParams.fiberRadiusUm * 2).toFixed(2)} µm (Gaussian)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Connectivity</div>
              <div className="font-semibold text-slate-200">
                {(localParams.branchProbability * 4.2).toFixed(1)} branches / node
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Orientation</div>
              <div className="font-semibold text-slate-200">
                {localParams.orientationBias < 0.3 ? 'Isotropic (3D)' : 'Flow-Aligned'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Porosity</div>
              <div className="font-semibold text-slate-200">
                {(100 - localParams.networkDensity * 65).toFixed(0)}% Void Volume
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Network Density</div>
              <div className="font-semibold text-slate-200">
                {(localParams.networkDensity * 100).toFixed(0)}% Compact
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <div>
              <div className="text-slate-400 text-[10px] uppercase">Cross-link Status</div>
              <div className="font-semibold text-slate-200">
                {(localParams.crossLinkProbability * 100).toFixed(0)}% FXIIIa Covalent
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Center: Panels A through F Layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Panel A: Full Volumetric Fibrin Network (Left Large Area) */}
            <div
              onClick={() => setActivePanel('A')}
              className={`lg:col-span-6 rounded-xl border p-4 transition-all relative overflow-hidden group cursor-pointer ${
                activePanel === 'A'
                  ? 'border-[#deb35a] bg-gradient-to-b from-[#deb35a]/10 to-transparent'
                  : 'border-white/10 hover:border-white/20 bg-black/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-md bg-white/10 font-black text-xs text-white">
                    A
                  </span>
                  <div className="text-xs font-bold uppercase tracking-wider text-white">
                    Full Volumetric Fibrin Network
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Isometric perspective</span>
              </div>

              {/* Graphical Representation of Panel A */}
              <div className="relative aspect-4/3 w-full rounded-lg bg-radial from-[#deb35a]/25 via-black/80 to-black overflow-hidden flex items-center justify-center border border-white/5">
                {/* Embedded High-Fidelity User Attachment Snippet or Graphic Canvas */}
                <img
                  src="/assets/aistudio/Fibrin_Network__3D_Blood_Clot_Visualization_c016282a.png"
                  alt="Panel A Volumetric Fibrin Network"
                  className="w-full h-full object-cover object-left opacity-90 group-hover:scale-105 transition-transform duration-500"
                />

                {/* Overlaid Scale & Callouts */}
                <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-black/70 backdrop-blur-xs px-2.5 py-1 rounded-sm border border-white/10 text-[10px] font-mono text-slate-300">
                  <div className="w-8 h-0.5 bg-white" />
                  <span>50 µm Scale Bar</span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-black/70 text-[#deb35a] border border-[#deb35a]/30 text-[10px] font-mono">
                  <span>Three.js BufferGeometry</span>
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                Volumetric 3D scaffold formed by polymerized fibrin protofibrils under flow. Gold translucent fibers reflect physically-based transmission and clearcoat shader parameters.
              </p>
            </div>

            {/* Right Column: Panels B, C, D, E, F */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Panel B: Single Fibrin Fiber (Isolated) */}
              <div
                onClick={() => setActivePanel('B')}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  activePanel === 'B'
                    ? 'border-[#deb35a] bg-[#deb35a]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 font-bold text-xs">
                    B
                  </span>
                  <div className="text-xs font-bold uppercase text-white">Single Fibrin Fiber</div>
                </div>
                <div className="relative aspect-16/9 rounded-lg bg-black/60 overflow-hidden border border-white/5 flex items-center justify-center">
                  <div className="w-3/4 h-3 rounded-full bg-gradient-to-r from-[#c79a3b] via-[#deb35a] to-[#edd187] shadow-[0_0_15px_rgba(222,179,90,0.4)]" />
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-[#deb35a]">
                    Radius: {localParams.fiberRadiusUm} µm
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300">
                  Tubular fiber geometry with longitudinal surface striations and axial tensile strength.
                </div>
              </div>

              {/* Panel C: Fiber Junction Close-up */}
              <div
                onClick={() => setActivePanel('C')}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  activePanel === 'C'
                    ? 'border-[#deb35a] bg-[#deb35a]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 font-bold text-xs">
                    C
                  </span>
                  <div className="text-xs font-bold uppercase text-white">Fiber Junction & Cross-links</div>
                </div>
                <div className="relative aspect-16/9 rounded-lg bg-black/60 overflow-hidden border border-white/5 flex items-center justify-center">
                  {/* Intersection lines */}
                  <div className="absolute w-full h-1.5 bg-[#deb35a]/80 rotate-30" />
                  <div className="absolute w-full h-1.5 bg-[#deb35a]/80 -rotate-30" />
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-300 ring-4 ring-[#deb35a]/40 shadow-md" />
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-emerald-400">
                    FXIIIa Isopeptide
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300">
                  Covalent γ-chain cross-links joining triple-helical coiled-coils at critical bifurcations.
                </div>
              </div>

              {/* Panel D: Network Pore Geometry */}
              <div
                onClick={() => setActivePanel('D')}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  activePanel === 'D'
                    ? 'border-[#deb35a] bg-[#deb35a]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 font-bold text-xs">
                    D
                  </span>
                  <div className="text-xs font-bold uppercase text-white">Network Pore Geometry</div>
                </div>
                <div className="relative aspect-16/9 rounded-lg bg-black/60 overflow-hidden border border-white/5 flex items-center justify-center">
                  <div className="w-16 h-12 rounded-xl border-2 border-dashed border-sky-400 bg-sky-500/15 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-sky-300">
                      {localParams.poreSizeUm} µm void
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300">
                  Sectional view of void space governing interstitial fluid permeability and tPA diffusion.
                </div>
              </div>

              {/* Panel E: Graph-Node and Edge Construction */}
              <div
                onClick={() => setActivePanel('E')}
                className={`rounded-xl border p-3 cursor-pointer transition-all ${
                  activePanel === 'E'
                    ? 'border-[#deb35a] bg-[#deb35a]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 font-bold text-xs">
                    E
                  </span>
                  <div className="text-xs font-bold uppercase text-white">Graph Nodes & Edges</div>
                </div>
                <div className="relative aspect-16/9 rounded-lg bg-black/60 overflow-hidden border border-white/5 flex items-center justify-center">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-300/50" />
                    <div className="w-12 h-0.5 bg-blue-400" />
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-amber-300/50" />
                    <div className="w-8 h-0.5 bg-blue-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="absolute bottom-1 right-2 text-[9px] font-mono text-blue-300">
                    N1-N5 • E1-E3
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-300">
                  Abstracted mathematical network using Three.js sphere control points and spline curves.
                </div>
              </div>

              {/* Panel F: Low-Density vs High-Density Comparison (Full Width in Subgrid) */}
              <div
                onClick={() => setActivePanel('F')}
                className={`sm:col-span-2 rounded-xl border p-3 cursor-pointer transition-all ${
                  activePanel === 'F'
                    ? 'border-[#deb35a] bg-[#deb35a]/10'
                    : 'border-white/10 hover:border-white/20 bg-black/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/10 font-bold text-xs">
                      F
                    </span>
                    <div className="text-xs font-bold uppercase text-white">
                      Low-Density vs High-Density Network
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Synthetic Comparison</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-black/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Sparse / Open</div>
                    <div className="text-xs font-bold text-amber-200 mt-1">Density: 35%</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">High hydraulic flow</div>
                  </div>
                  <div className="p-2 rounded-lg bg-black/60 border border-white/5">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Compact / Occlusive</div>
                    <div className="text-xs font-bold text-[#deb35a] mt-1">Density: 88%</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Thrombotic arrest</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section: Synthetic Network Parameter Inspector (Live Sliders) */}
          <div className="p-5 rounded-2xl bg-black/70 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#deb35a]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Synthetic Network Parameter Inspector
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#deb35a] hover:bg-[#e6b65c] text-slate-950 transition-all shadow-md active:scale-95"
                >
                  {applied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Applied to 3D Scene!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Apply Parameters to 3D Scene</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sliders Grid matching reference design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* 1. Network Density */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Network Density</span>
                  <span className="font-mono text-[#deb35a]">
                    {(localParams.networkDensity * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.02"
                  value={localParams.networkDensity}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      networkDensity: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>

              {/* 2. Fiber Radius (distribution) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Fiber Radius (Distribution)</span>
                  <span className="font-mono text-[#deb35a]">
                    {localParams.fiberRadiusUm.toFixed(2)} µm
                  </span>
                </div>
                <input
                  type="range"
                  min="0.08"
                  max="0.50"
                  step="0.01"
                  value={localParams.fiberRadiusUm}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      fiberRadiusUm: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>

              {/* 3. Branch Probability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Branch Probability</span>
                  <span className="font-mono text-[#deb35a]">
                    {(localParams.branchProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="0.95"
                  step="0.05"
                  value={localParams.branchProbability}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      branchProbability: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>

              {/* 4. Cross-link Probability */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Cross-link Probability (FXIIIa)</span>
                  <span className="font-mono text-[#deb35a]">
                    {(localParams.crossLinkProbability * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={localParams.crossLinkProbability}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      crossLinkProbability: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>

              {/* 5. Pore Size (target) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Pore Size (Target Void)</span>
                  <span className="font-mono text-[#deb35a]">
                    {localParams.poreSizeUm.toFixed(1)} µm
                  </span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="8.0"
                  step="0.2"
                  value={localParams.poreSizeUm}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      poreSizeUm: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>

              {/* 6. Orientation Bias */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Orientation Bias (Shear Alignment)</span>
                  <span className="font-mono text-[#deb35a]">
                    {(localParams.orientationBias * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={localParams.orientationBias}
                  onChange={(e) =>
                    setLocalParams((prev) => ({
                      ...prev,
                      orientationBias: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full accent-[#deb35a]"
                />
              </div>
            </div>

            {/* Three.js Implementation Technical Specifications & Scene Elements Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-400 border-t border-white/5">
              <div className="space-y-1">
                <div className="font-semibold text-slate-200">Three.js Implementation</div>
                <div>• BufferGeometry-based tube/curve mesh generation with custom attributes</div>
                <div>• InstancedMesh for high performance across 200+ fiber segments</div>
                <div>• Physically-based material with gold/amber transmission (clearcoat 0.8)</div>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-slate-200">Scene Elements</div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-1 bg-[#deb35a] rounded-sm" /> Fibrin fiber
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Graph node
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-0.5 bg-blue-400" /> Graph edge
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 border border-sky-400" /> Pore boundary
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
