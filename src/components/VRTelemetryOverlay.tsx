/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VRPerformanceTelemetry } from '../types/webxr.ts';
import { ScaleLevel } from '../types/biomedical.ts';

interface VRTelemetryOverlayProps {
  telemetry: VRPerformanceTelemetry | null;
  isXRPresenting: boolean;
  isSidebarCollapsed: boolean;
  isDarkTheme: boolean;
}

const SCALE_SHORT_LABELS: Record<ScaleLevel, string> = {
  thoracic: 'Artery',
  vessel: 'Artery',
  clot: 'Thrombus',
  microscopic: 'Fibrin',
  industrialCutaway: 'Cutaway',
};

const SESSION_LABELS: Record<VRPerformanceTelemetry['sessionKind'], string> = {
  'immersive-vr': 'LIVE VR',
  'immersive-ar': 'LIVE MR',
  'quest-sim': 'QUEST SIM',
};

function formatTriangles(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

export const VRTelemetryOverlay: React.FC<VRTelemetryOverlayProps> = ({
  telemetry,
  isXRPresenting,
  isSidebarCollapsed,
  isDarkTheme,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!telemetry || typeof document === 'undefined') {
    return null;
  }

  // Always use low-glare carbon surface during active immersive VR presentation
  const useDarkSurface = isXRPresenting || isDarkTheme;

  const fpsColorClass =
    telemetry.fps >= 55
      ? useDarkSurface
        ? 'text-[#F5D547]'
        : 'text-[#141514]'
      : telemetry.fps >= 35
      ? 'text-[#D97706]'
      : 'text-[#DC2626]';

  // Position clear of LeftNav when Quest Sim is active outside immersive presentation
  const leftOffsetClass = isXRPresenting
    ? 'left-4'
    : isSidebarCollapsed
    ? 'left-4 md:left-[88px]'
    : 'left-4 md:left-[296px]';

  // Build compact 24-sample frame-time bar sparkline (target 16.7ms = 60fps; cap 40ms)
  const history = telemetry.frameHistoryMs;
  const sparkWidth = 72;
  const sparkHeight = 18;
  const maxBarMs = 40;
  const targetLineY = Math.round(sparkHeight - (16.7 / maxBarMs) * sparkHeight);
  const barStep = history.length > 0 ? sparkWidth / Math.max(history.length, 24) : 3;

  return createPortal(
    <aside
      role="status"
      aria-live="off"
      aria-label="VR Simulation Performance Telemetry"
      style={{ zIndex: 2147483646 }}
      className={`fixed bottom-4 ${leftOffsetClass} pointer-events-auto font-sans select-none transition-all duration-200 ${
        isExpanded ? 'w-[252px]' : 'w-auto'
      }`}
    >
      <div
        className={`rounded-lg border border-l-2 border-l-[#F5D547] shadow-lg overflow-hidden ${
          useDarkSurface
            ? 'bg-[#141513]/95 text-[#FAF7EC] border-[#34362F]'
            : 'bg-[#FAF7EC]/95 text-[#141514] border-[#141514]/80'
        }`}
      >
        {/* Compact Always-Visible FPS & Frame-Time Strip */}
        <div className="flex items-center gap-2.5 pl-2.5 pr-1.5 py-1.5">
          {/* FPS Readout */}
          <div className="flex items-baseline gap-1">
            <span className={`font-mono text-sm font-bold tabular-nums leading-none ${fpsColorClass}`}>
              {telemetry.fps}
            </span>
            <span
              className={`font-mono text-[9px] font-semibold uppercase tracking-wider ${
                useDarkSurface ? 'text-[#B7B5AA]' : 'text-[#555650]'
              }`}
            >
              FPS
            </span>
          </div>

          <span className="opacity-25 text-[10px]">|</span>

          {/* Frame Time */}
          <div className="font-mono text-[11px] font-semibold tabular-nums leading-none">
            {telemetry.frameTimeMs.toFixed(1)}
            <span className="text-[9px] opacity-65 ml-0.5">ms</span>
          </div>

          {/* Inline Frame-Time Sparkline */}
          <svg
            aria-hidden="true"
            width={sparkWidth}
            height={sparkHeight}
            viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
            className="shrink-0 overflow-visible"
          >
            {/* 16.7ms (60 FPS) reference hairline */}
            <line
              x1={0}
              y1={targetLineY}
              x2={sparkWidth}
              y2={targetLineY}
              stroke={useDarkSurface ? 'rgba(250,247,236,0.22)' : 'rgba(20,21,20,0.22)'}
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {history.map((ms, i) => {
              const clamped = Math.min(maxBarMs, Math.max(1, ms));
              const h = Math.max(2, (clamped / maxBarMs) * sparkHeight);
              const x = i * barStep;
              const y = sparkHeight - h;
              const fill =
                ms <= 18.5
                  ? '#F5D547'
                  : ms <= 28
                  ? '#F59E0B'
                  : '#EF4444';
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={Math.max(1.5, barStep - 1)}
                  height={h}
                  fill={fill}
                  opacity={0.92}
                />
              );
            })}
          </svg>

          {/* Expand / Collapse Detailed Performance Metrics */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse VR performance details' : 'Expand VR performance details'}
            title={isExpanded ? 'Compact telemetry' : 'Show detailed VR metrics'}
            className={`min-w-[28px] min-h-[28px] rounded flex items-center justify-center transition-colors cursor-pointer ${
              useDarkSurface
                ? 'text-[#B7B5AA] hover:text-[#F5D547] hover:bg-[#23251F]'
                : 'text-[#444540] hover:text-[#141514] hover:bg-[#EDE7D3]'
            }`}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Optional Expanded Diagnostics Drawer */}
        {isExpanded && (
          <div
            className={`px-2.5 pb-2.5 pt-2 border-t text-[10px] space-y-2 ${
              useDarkSurface ? 'border-[#2A2C26]' : 'border-[#141514]/15'
            }`}
          >
            {/* Session + Scale Eyebrow */}
            <div className="flex items-center justify-between gap-2 text-[9px] font-bold tracking-[0.16em] uppercase">
              <span className={useDarkSurface ? 'text-[#F5D547]' : 'text-[#5A5328]'}>
                {SESSION_LABELS[telemetry.sessionKind]}
                {telemetry.isSoftwareGl ? ' · SW-GL' : ''}
              </span>
              <span className="font-mono font-semibold tracking-normal opacity-75">
                {SCALE_SHORT_LABELS[telemetry.scale]} · {telemetry.pixelRatio.toFixed(1)}× DPR
              </span>
            </div>

            {/* Compact 2-Column Tabular Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono tabular-nums">
              <div className="flex items-center justify-between">
                <span className="opacity-60">LOW</span>
                <span className="font-semibold">{telemetry.minFps} fps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">PEAK</span>
                <span className="font-semibold">{telemetry.maxFrameTimeMs.toFixed(1)} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">DRAWS</span>
                <span className="font-semibold">{telemetry.drawCalls}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">TRIS</span>
                <span className="font-semibold">{formatTriangles(telemetry.triangles)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">GEO/TX</span>
                <span className="font-semibold">
                  {telemetry.geometries}/{telemetry.textures}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">HEAP</span>
                <span className="font-semibold">
                  {telemetry.jsHeapMB !== null ? `${telemetry.jsHeapMB} MB` : 'n/a'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>,
    document.body
  );
};
