/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Activity,
  Scissors,
  Layers,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { DiseaseStage, LayerVisibility } from '../types/biomedical.ts';

interface CollapsibleDockProps {
  currentStageIndex: number;
  stages: DiseaseStage[];
  onSelectStage: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;

  // Fibrin lab controls
  fiberDensity: number;
  onFiberDensityChange: (val: number) => void;
  fiberDiameterUm: number;
  onFiberDiameterChange: (val: number) => void;
  lyticFraction: number;
  onLyticFractionChange: (val: number) => void;

  // Layers
  layers: LayerVisibility;
  onToggleLayer: (key: keyof LayerVisibility) => void;

  // Slicing & Explode
  clippingAxis: 'none' | 'x' | 'y' | 'z';
  onClippingAxisChange: (axis: 'none' | 'x' | 'y' | 'z') => void;
  clipDistance: number;
  onClipDistanceChange: (val: number) => void;
  explodedOffset: number;
  onExplodedOffsetChange: (val: number) => void;
}

export const CollapsibleDock: React.FC<CollapsibleDockProps> = ({
  currentStageIndex,
  stages,
  onSelectStage,
  isPlaying,
  onTogglePlay,
  fiberDensity,
  onFiberDensityChange,
  fiberDiameterUm,
  onFiberDiameterChange,
  lyticFraction,
  onLyticFractionChange,
  layers,
  onToggleLayer,
  clippingAxis,
  onClippingAxisChange,
  clipDistance,
  onClipDistanceChange,
  explodedOffset,
  onExplodedOffsetChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'fibrin' | 'hemodynamics' | 'tools'>('timeline');

  const currentStage = stages[currentStageIndex];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-[920px] select-none transition-transform duration-300">
      {/* Collapse / Expand toggle button */}
      <div className="flex justify-center -mb-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-[#c5c9d3] hover:text-white bg-[#131416] border border-[#2a2b2e] rounded-t-md transition-colors"
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
        </button>
      </div>

      {!isCollapsed && (
        <div className="bg-[#131416] border border-[#2a2b2e] rounded-xl shadow-2xl p-3.5 space-y-3">
          {/* Sub-Tabs Header */}
          <div className="flex items-center justify-between border-b border-[#24252a] pb-2.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'timeline'
                    ? 'bg-[#202227] text-[#e6b65c]'
                    : 'text-[#8a8f9d] hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Disease Progression</span>
              </button>

              <button
                onClick={() => setActiveTab('fibrin')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'fibrin'
                    ? 'bg-[#202227] text-[#e6b65c]'
                    : 'text-[#8a8f9d] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Fibrin Micro-Lab</span>
              </button>

              <button
                onClick={() => setActiveTab('hemodynamics')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'hemodynamics'
                    ? 'bg-[#202227] text-[#e6b65c]'
                    : 'text-[#8a8f9d] hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Hemodynamics</span>
              </button>

              <button
                onClick={() => setActiveTab('tools')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'tools'
                    ? 'bg-[#202227] text-[#e6b65c]'
                    : 'text-[#8a8f9d] hover:text-white'
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Slicing & Layers</span>
              </button>
            </div>

            {/* Quick status pill without decorative pulsing dot */}
            <div className="text-xs font-mono text-[#8a8f9d] tabular-nums hidden sm:block">
              Stage: {currentStage.code} · Obstruction: {currentStage.flowObstructionPct}%
            </div>
          </div>

          {/* Tab 1: Timeline Content */}
          {activeTab === 'timeline' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <button
                  onClick={onTogglePlay}
                  className="p-2 text-black bg-[#e6b65c] hover:bg-[#f3ca76] rounded-lg transition-colors shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">
                      {currentStage.code}. {currentStage.name}
                    </span>
                    <span className="text-[#a0a5b0] text-[11px] font-mono tabular-nums">
                      mPAP: {currentStage.mPAP} mmHg · PVR: {currentStage.vascularResistance} Wood U
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={stages.length - 1}
                    value={currentStageIndex}
                    onChange={(e) => onSelectStage(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#24252a] rounded-lg appearance-none cursor-pointer accent-[#e6b65c]"
                  />
                </div>
              </div>

              <p className="text-xs text-[#9aa0a6] leading-relaxed">
                {currentStage.description}
              </p>
            </div>
          )}

          {/* Tab 2: Fibrin Microstructure Lab */}
          {activeTab === 'fibrin' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#c5c9d3]">Fiber Network Density</span>
                  <span className="font-mono text-[#e6b65c] tabular-nums">{Math.round(fiberDensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.5"
                  step="0.05"
                  value={fiberDensity}
                  onChange={(e) => onFiberDensityChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#24252a] rounded appearance-none cursor-pointer accent-[#e6b65c]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#c5c9d3]">Mean Fiber Caliber</span>
                  <span className="font-mono text-[#e6b65c] tabular-nums">{fiberDiameterUm.toFixed(2)} µm</span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.45"
                  step="0.02"
                  value={fiberDiameterUm}
                  onChange={(e) => onFiberDiameterChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#24252a] rounded appearance-none cursor-pointer accent-[#e6b65c]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#c5c9d3]">Fibrinolysis (tPA) Degradation</span>
                  <span className="font-mono text-[#e6b65c] tabular-nums">{Math.round(lyticFraction * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.05"
                  value={lyticFraction}
                  onChange={(e) => onLyticFractionChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#24252a] rounded appearance-none cursor-pointer accent-[#e6b65c]"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Hemodynamics */}
          {activeTab === 'hemodynamics' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-[#1a1b1f] border border-[#2a2b2e] rounded-lg">
                <div className="text-[#8a8f9d] text-[11px] uppercase tracking-wider">mPAP Pressure</div>
                <div className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                  {currentStage.mPAP} <span className="text-xs font-normal text-[#8a8f9d]">mmHg</span>
                </div>
                <div className="text-[11px] text-[#8a8f9d] mt-1">
                  {currentStage.mPAP > 25 ? 'Pulmonary Hypertension' : 'Normal Hemodynamics'}
                </div>
              </div>

              <div className="p-2.5 bg-[#1a1b1f] border border-[#2a2b2e] rounded-lg">
                <div className="text-[#8a8f9d] text-[11px] uppercase tracking-wider">Wall Shear Stress</div>
                <div className="text-lg font-mono font-bold text-[#e6b65c] tabular-nums mt-0.5">
                  {currentStage.wallShearStressMax.toFixed(1)} <span className="text-xs font-normal text-[#8a8f9d]">Pa</span>
                </div>
                <div className="text-[11px] text-[#8a8f9d] mt-1">Peak at stenotic jet</div>
              </div>

              <div className="p-2.5 bg-[#1a1b1f] border border-[#2a2b2e] rounded-lg">
                <div className="text-[#8a8f9d] text-[11px] uppercase tracking-wider">Vascular Load (PVR)</div>
                <div className="text-lg font-mono font-bold text-white tabular-nums mt-0.5">
                  {currentStage.vascularResistance.toFixed(1)} <span className="text-xs font-normal text-[#8a8f9d]">Wood U</span>
                </div>
                <div className="text-[11px] text-[#8a8f9d] mt-1">Right ventricular strain index</div>
              </div>

              <div className="p-2.5 bg-[#1a1b1f] border border-[#2a2b2e] rounded-lg flex flex-col justify-between">
                <div className="text-[#8a8f9d] text-[11px] uppercase tracking-wider">Flow Streamlines</div>
                <button
                  onClick={() => onToggleLayer('flowStreamlines')}
                  className={`mt-1 py-1 px-2.5 text-xs font-medium rounded-md transition-colors ${
                    layers.flowStreamlines
                      ? 'bg-[#e6b65c] text-black'
                      : 'bg-[#24252a] text-[#c5c9d3] hover:text-white'
                  }`}
                >
                  {layers.flowStreamlines ? 'Particles Active' : 'Particles Hidden'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Slicing, Layers & Exploded View */}
          {activeTab === 'tools' && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Clipping axis selector */}
                <div className="space-y-1.5">
                  <span className="text-[#c5c9d3]">Cross-Section Clipping Plane</span>
                  <div className="flex gap-1">
                    {(['none', 'x', 'y', 'z'] as const).map((axis) => (
                      <button
                        key={axis}
                        onClick={() => onClippingAxisChange(axis)}
                        className={`flex-1 py-1 text-xs font-mono uppercase rounded transition-colors ${
                          clippingAxis === axis
                            ? 'bg-[#e6b65c] text-black font-bold'
                            : 'bg-[#1a1b1f] text-[#8a8f9d] hover:text-white'
                        }`}
                      >
                        {axis}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slicing position */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#c5c9d3]">Plane Offset</span>
                    <span className="font-mono text-[#e6b65c] tabular-nums">{clipDistance.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="0.2"
                    value={clipDistance}
                    onChange={(e) => onClipDistanceChange(parseFloat(e.target.value))}
                    disabled={clippingAxis === 'none'}
                    className="w-full h-1.5 bg-[#24252a] rounded appearance-none cursor-pointer accent-[#e6b65c] disabled:opacity-30"
                  />
                </div>

                {/* Exploded view */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#c5c9d3]">Exploded Layer Separation</span>
                    <span className="font-mono text-[#e6b65c] tabular-nums">{Math.round(explodedOffset * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={explodedOffset}
                    onChange={(e) => onExplodedOffsetChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#24252a] rounded appearance-none cursor-pointer accent-[#e6b65c]"
                  />
                </div>
              </div>

              {/* Layer toggles */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#24252a]">
                <span className="text-[#8a8f9d] text-[11px] mr-1">Visible Components:</span>
                {(
                  [
                    ['fibrinMesh', 'Fibrin Mesh'],
                    ['redBloodCells', 'Red Blood Cells'],
                    ['platelets', 'Platelets'],
                    ['vesselWall', 'Vessel Wall'],
                    ['thrombusBody', 'Thrombus Body'],
                    ['thoracicLungs', 'Thoracic Lungs'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => onToggleLayer(key)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      layers[key]
                        ? 'bg-[#202227] text-[#e6b65c] border border-[#343538]'
                        : 'bg-[#151618] text-[#555861] border border-transparent hover:text-[#8a8f9d]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
