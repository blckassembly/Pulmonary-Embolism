/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  Layers,
  Maximize2,
  RotateCcw,
  Sparkles,
  Move3d,
  CheckCircle2,
  Minimize2,
  FlaskConical,
  ZoomIn,
  Activity,
  Zap,
} from 'lucide-react';
import { IndustrialCalloutPoint } from '../types/biomedical.ts';

interface TechnicalCadOverlayProps {
  callouts: IndustrialCalloutPoint[];
  mode: 'airway' | 'vascular';
  wireframeOpacity: number;
  glassOpacity: number;
  fiberDensity: number;
  explodedOffset: number;
  lyticFraction?: number;
  isDrugInfused?: boolean;
  showDrugSimulator?: boolean;
  onToggleDrugSimulator?: () => void;
  onModeChange: (mode: 'airway' | 'vascular') => void;
  onWireframeOpacityChange: (val: number) => void;
  onGlassOpacityChange: (val: number) => void;
  onFiberDensityChange: (val: number) => void;
  onExplodedOffsetChange: (val: number) => void;
  onCameraPreset: (preset: 'reference' | 'axial' | 'side' | 'isometric' | 'lumenBore') => void;
  onExit: () => void;
}

export const TechnicalCadOverlay: React.FC<TechnicalCadOverlayProps> = ({
  callouts,
  mode,
  wireframeOpacity,
  glassOpacity,
  fiberDensity,
  explodedOffset,
  lyticFraction = 0,
  isDrugInfused = false,
  showDrugSimulator = false,
  onToggleDrugSimulator,
  onModeChange,
  onWireframeOpacityChange,
  onGlassOpacityChange,
  onFiberDensityChange,
  onExplodedOffsetChange,
  onCameraPreset,
  onExit,
}) => {
  const [showControls, setShowControls] = useState<boolean>(false);
  const [showExplodedPanel, setShowExplodedPanel] = useState<boolean>(false);
  const [showCalloutLines, setShowCalloutLines] = useState<boolean>(true);

  const isExploded = explodedOffset > 0.02;

  // Real-time calculated pharmacological metrics
  const residualObstructionPct = Math.max(8, Math.round(68 * (1 - lyticFraction * 0.88)));
  const lumenPatencyPct = 100 - residualObstructionPct;
  const isLysisActive = isDrugInfused || lyticFraction > 0.01;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20 font-sans">
      {/* Top Left: Reference Title Header matching Sketch A */}
      <div className="absolute top-6 left-8 pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 bg-white rounded-none animate-pulse" />
          <h1 className="text-xl md:text-2xl font-mono tracking-[0.25em] text-white font-semibold uppercase">
            {mode === 'airway' ? 'SKETCH A — FULL AIRWAY CUTAWAY' : 'SKETCH B — ARTERIAL EMBOLUS CUTAWAY'}
          </h1>
          {isExploded && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/15 border border-amber-400/50 text-amber-300 font-mono text-[10px] tracking-widest font-bold uppercase animate-in fade-in duration-200">
              <Move3d className="w-3 h-3 text-amber-400" />
              3D AXIS EXPLODED VIEW ({Math.round(explodedOffset * 100)}%)
            </span>
          )}
          {isLysisActive && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] tracking-widest font-bold uppercase animate-in fade-in duration-200">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
              RX TREATMENT ACTIVE ({Math.round(lyticFraction * 100)}% LYSED)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono tracking-widest text-neutral-400">
          <span className="bg-neutral-900 border border-neutral-700/80 px-2 py-0.5 text-neutral-300">
            CAD SECTION · 1:1 RATIO
          </span>
          <span className="text-neutral-500">|</span>
          <span>{isExploded ? 'DISASSEMBLED 3-LAYER STRATA' : 'LONGITUDINAL ASSEMBLED PROFILE'}</span>
          <span className="text-neutral-500">|</span>
          <span className="text-amber-400/90 font-medium">3D WIREFRAME VOLUMETRIC</span>
          <span className="text-neutral-500">|</span>
          <span className="text-sky-400">ISOLATED ZOOM ENABLED</span>
        </div>
      </div>

      {/* Top Right: Mode Switcher & Quick Exit */}
      <div className="absolute top-6 right-8 flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center bg-black/85 backdrop-blur-md border border-neutral-800 rounded-none p-1">
          <button
            onClick={() => onModeChange('airway')}
            className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-colors ${
              mode === 'airway'
                ? 'bg-neutral-100 text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            AIRWAY (SKETCH A)
          </button>
          <button
            onClick={() => onModeChange('vascular')}
            className={`px-3 py-1.5 text-xs font-mono tracking-wider transition-colors ${
              mode === 'vascular'
                ? 'bg-neutral-100 text-black font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            VASCULAR (THROMBUS)
          </button>
        </div>

        <button
          onClick={onExit}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 px-3.5 py-1.5 text-xs font-mono tracking-wider transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
          <span>RETURN TO LAB</span>
        </button>
      </div>

      {/* Real-Time Drug Treatment Telemetry Card (When Rx is infusing or lysis > 0) */}
      {isLysisActive && (
        <div className="absolute top-20 left-8 w-88 bg-black/90 backdrop-blur-md border border-emerald-500/40 p-3.5 pointer-events-auto z-20 shadow-2xl animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
                CAD PHARMACOLOGICAL THESIS
              </span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800">
              {isDrugInfused ? 'INFUSING' : 'POST-INFUSION'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mb-2">
            <div className="bg-neutral-950 p-2 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">THROMBUS CLEARANCE</span>
              <span className="text-emerald-400 font-bold text-sm">
                {Math.round(lyticFraction * 100)}% LYSED
              </span>
            </div>
            <div className="bg-neutral-950 p-2 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">RESIDUAL OCCLUSION</span>
              <span className="text-amber-400 font-bold text-sm">
                {residualObstructionPct}% BORE
              </span>
            </div>
            <div className="bg-neutral-950 p-2 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">LUMEN PATENCY</span>
              <span className="text-sky-400 font-bold text-sm">
                {lumenPatencyPct}% RECOVERED
              </span>
            </div>
            <div className="bg-neutral-950 p-2 border border-neutral-800">
              <span className="text-neutral-500 block text-[10px]">FIBROUS CORE EROSION</span>
              <span className="text-neutral-200 font-semibold text-xs">
                Enzymatic Cleavage
              </span>
            </div>
          </div>

          <div className="w-full bg-neutral-900 h-1.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${Math.round(lyticFraction * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Exploded View 3-Layer Assembly Legend (Top Right below mode switcher) */}
      {isExploded && showExplodedPanel && (
        <div className="absolute top-20 right-8 w-80 bg-black/90 backdrop-blur-md border border-neutral-800 p-3.5 pointer-events-auto z-20 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono font-bold tracking-widest text-neutral-200 uppercase">
                ASSEMBLY STRATA LAYERS
              </span>
            </div>
            <button
              onClick={() => setShowExplodedPanel(false)}
              className="text-[10px] font-mono text-neutral-500 hover:text-neutral-300"
            >
              [MINIMIZE]
            </button>
          </div>

          <div className="space-y-2 text-[11px] font-mono">
            {/* Layer 1 */}
            <div className="p-2 bg-neutral-950/80 border border-sky-500/30 flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-sky-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-neutral-200 font-bold uppercase tracking-wider">
                  LAYER 01 · EXTERNAL CONDUIT
                </div>
                <div className="text-neutral-400 text-[10px] mt-0.5">
                  Translucent glass shell & CAD wireframe rings
                </div>
                <div className="text-sky-400 text-[10px] mt-1 flex items-center justify-between">
                  <span>DISPLACEMENT: -3.4X · +4.6Y</span>
                  <span className="text-neutral-500 font-mono">▲ ELEVATED</span>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="p-2 bg-neutral-950/80 border border-slate-500/30 flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-neutral-200 font-bold uppercase tracking-wider">
                  LAYER 02 · WALL STRATA & CILIA
                </div>
                <div className="text-neutral-400 text-[10px] mt-0.5">
                  Columnar epithelium blocks & 1,400 brush cilia
                </div>
                <div className="text-slate-300 text-[10px] mt-1 flex items-center justify-between">
                  <span>DISPLACEMENT: 0.0X · +1.1Y</span>
                  <span className="text-neutral-500 font-mono">■ REFERENCE CORE</span>
                </div>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="p-2 bg-neutral-950/80 border border-amber-500/30 flex items-start gap-2.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-neutral-200 font-bold uppercase tracking-wider">
                  LAYER 03 · {mode === 'airway' ? 'MUCUS PLUG CORE' : 'THROMBUS OBSTRUCTION'}
                </div>
                <div className="text-neutral-400 text-[10px] mt-0.5">
                  Cross-linked fibrin splines & nodular aggregates
                </div>
                <div className="text-amber-400 text-[10px] mt-1 flex items-center justify-between">
                  <span>DISPLACEMENT: +3.6X · -5.0Y</span>
                  <span className="text-neutral-500 font-mono">▼ DEPRESSED</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5 text-sky-400">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              CAD AXIS GUIDES ACTIVE
            </span>
            <button
              onClick={() => onExplodedOffsetChange(0)}
              className="text-neutral-400 hover:text-white underline cursor-pointer"
            >
              SNAP ASSEMBLE
            </button>
          </div>
        </div>
      )}

      {/* SVG Angled Leader Lines layer */}
      {showCalloutLines && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
          <defs>
            <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </radialGradient>
          </defs>

          {callouts.map((c) => {
            if (!c.visible) return null;
            const strokeColor = '#ffffff';
            const strokeWidth = 1.4;

            const dx = c.x - c.anchorX;
            const dy = c.y - c.anchorY;
            const elbowX = c.align === 'left' ? c.x + 20 : c.x - 20;
            const elbowY = c.anchorY + dy * 0.45;

            return (
              <g key={`leader-${c.id}`} className="transition-all duration-200">
                {/* Anchor Target Circle */}
                <circle
                  cx={c.anchorX}
                  cy={c.anchorY}
                  r={3.5}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={1.5}
                />
                <circle
                  cx={c.anchorX}
                  cy={c.anchorY}
                  r={6}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={0.75}
                  strokeDasharray="2,2"
                />

                {/* Angled Leader Polyline */}
                <polyline
                  points={`${c.anchorX},${c.anchorY} ${elbowX},${elbowY} ${c.x},${c.y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Label Terminal End Dot */}
                <circle cx={c.x} cy={c.y} r={2.5} fill="#ffffff" />
              </g>
            );
          })}
        </svg>
      )}

      {/* Static Technical Drawing Callout Labels matching Sketch A */}
      {showCalloutLines &&
        callouts.map((c) => {
          if (!c.visible) return null;

          return (
            <div
              key={`label-${c.id}`}
              style={{
                position: 'absolute',
                left: `${c.x}px`,
                top: `${c.y}px`,
                transform: c.align === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
                paddingLeft: c.align === 'left' ? '0' : '10px',
                paddingRight: c.align === 'left' ? '10px' : '0',
                zIndex: 10,
              }}
              className="pointer-events-none select-none"
            >
              <div className="flex flex-col border border-neutral-700/90 bg-black/85 px-3 py-1.5 text-neutral-200 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] md:text-[14px] font-bold tracking-[0.16em] uppercase whitespace-nowrap text-white">
                    {c.title}
                  </span>
                  <span className="text-[10px] font-mono px-1 py-0.2 bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {c.badge}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 tracking-wider">
                  {c.subtitle}
                </div>
              </div>
            </div>
          );
        })}


      {/* Bottom Floating CAD Inspection Toolbar */}
      <div className="absolute bottom-6 left-16 sm:left-[270px] max-w-[calc(100vw-5rem)] overflow-x-auto flex items-center gap-2.5 bg-black/90 backdrop-blur-md border border-neutral-800 px-4 py-2 pointer-events-auto shadow-2xl z-20">
        {/* Camera Preset Quick Buttons */}
        <div className="flex items-center gap-1.5 border-r border-neutral-800 pr-3">
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mr-1 hidden sm:inline">
            CAMERA:
          </span>
          <button
            onClick={() => onCameraPreset('reference')}
            title="Snap to Sketch A reference angle"
            className="px-2.5 py-1 text-xs font-mono text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 transition-colors"
          >
            SKETCH A (ISOMETRIC)
          </button>
          <button
            onClick={() => onCameraPreset('lumenBore')}
            title="Zoom directly into the airway/vessel lumen bore"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-900/80 border border-sky-700/60 transition-colors"
          >
            <ZoomIn className="w-3 h-3 text-sky-400" />
            <span>ZOOM LUMEN</span>
          </button>
          <button
            onClick={() => onCameraPreset('axial')}
            title="Look directly down the axial bore"
            className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors hidden sm:inline"
          >
            AXIAL
          </button>
          <button
            onClick={() => onCameraPreset('side')}
            title="Side profile cutaway"
            className="px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-white bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 transition-colors hidden sm:inline"
          >
            PROFILE
          </button>
        </div>

        {/* 3D-Axis Exploded View Toggle Button */}
        <button
          onClick={() => onExplodedOffsetChange(isExploded ? 0 : 0.75)}
          title="Physically separate the conduit, wall strata, and thrombus layers"
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono border transition-all ${
            isExploded
              ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-[0_0_12px_rgba(251,191,36,0.35)]'
              : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-amber-400 hover:text-white'
          }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>3D EXPLODED VIEW {isExploded ? `[${Math.round(explodedOffset * 100)}%]` : '[ASSEMBLED]'}</span>
        </button>

        {/* Drug Simulator Integration Toggle Button */}
        {onToggleDrugSimulator && (
          <button
            onClick={onToggleDrugSimulator}
            title="Toggle Thrombolytic Drug Dissolution Simulator"
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono border transition-all ${
              showDrugSimulator || isDrugInfused
                ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:border-emerald-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>
              DRUG SIMULATOR{' '}
              {isDrugInfused
                ? '[INFUSING]'
                : lyticFraction > 0
                ? `[${Math.round(lyticFraction * 100)}% LYSED]`
                : ''}
            </span>
          </button>
        )}

        {/* Shaders popover toggle */}
        <button
          onClick={() => setShowControls(!showControls)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
            showControls
              ? 'bg-neutral-800 text-white border-neutral-600'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>SHADERS</span>
        </button>

        {/* Callouts Toggle */}
        <button
          onClick={() => setShowCalloutLines(!showCalloutLines)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono border transition-colors ${
            showCalloutLines
              ? 'bg-neutral-800 text-white border-neutral-600'
              : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-white'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>CALLOUTS</span>
        </button>
      </div>

      {/* Exploded View Separation & Shaders Popover */}
      {showControls && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-96 bg-black/95 backdrop-blur-md border border-neutral-800 p-4 pointer-events-auto z-30 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <span className="text-xs font-mono tracking-widest text-neutral-300 uppercase font-semibold">
              CAD DISASSEMBLY & SHADERS
            </span>
            <button
              onClick={() => setShowControls(false)}
              className="text-[10px] font-mono text-neutral-500 hover:text-white"
            >
              [HIDE]
            </button>
          </div>

          <div className="space-y-3.5 font-mono text-xs">
            {/* 3D-Axis Exploded Offset Slider */}
            <div className="bg-neutral-900/60 p-2.5 border border-amber-500/30">
              <div className="flex justify-between items-center text-neutral-300 mb-1.5">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Move3d className="w-3.5 h-3.5 text-amber-400" />
                  3D Exploded Separation
                </span>
                <span className="text-amber-400 font-bold">{Math.round(explodedOffset * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={explodedOffset}
                onChange={(e) => onExplodedOffsetChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1.5 bg-neutral-800 rounded-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 mt-1.5">
                <button
                  onClick={() => onExplodedOffsetChange(0)}
                  className={`hover:text-white ${explodedOffset === 0 ? 'text-amber-300 font-semibold' : ''}`}
                >
                  Assembled (0%)
                </button>
                <button
                  onClick={() => onExplodedOffsetChange(0.5)}
                  className={`hover:text-white ${Math.abs(explodedOffset - 0.5) < 0.05 ? 'text-amber-300 font-semibold' : ''}`}
                >
                  Mid Dissect (50%)
                </button>
                <button
                  onClick={() => onExplodedOffsetChange(1.0)}
                  className={`hover:text-white ${explodedOffset === 1.0 ? 'text-amber-300 font-semibold' : ''}`}
                >
                  Full Explode (100%)
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>CAD Wireframe Intensity</span>
                <span className="text-white">{Math.round(wireframeOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={wireframeOpacity}
                onChange={(e) => onWireframeOpacityChange(parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-neutral-800 rounded-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>Conduit Glass Opacity</span>
                <span className="text-white">{Math.round(glassOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={glassOpacity}
                onChange={(e) => onGlassOpacityChange(parseFloat(e.target.value))}
                className="w-full accent-white h-1 bg-neutral-800 rounded-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-neutral-400 mb-1">
                <span>Obstruction / Fiber Volume</span>
                <span className="text-amber-400">{Math.round(fiberDensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.0"
                step="0.05"
                value={fiberDensity}
                onChange={(e) => onFiberDensityChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
