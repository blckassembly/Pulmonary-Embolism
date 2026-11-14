/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Activity, Gauge } from 'lucide-react';
import { ExplorerAnatomyId } from '../types/biomedical.ts';

export interface ClotHemodynamicSample {
  progress: number; // 0.0 to 1.0
  mpap: number; // Mean Pulmonary Artery Pressure (mmHg)
  pvr: number; // Pulmonary Vascular Resistance (Wood Units)
  milestoneId?: ExplorerAnatomyId | 'bifurcation';
  milestoneLabel?: string;
  shortLabel?: string;
  clinicalNote?: string;
}

interface ClotHemodynamicsChartProps {
  clotPathProgress: number;
  lyticFraction?: number;
  onSeekClotPath?: (progress: number) => void;
  onSelectStructure?: (id: ExplorerAnatomyId) => void;
  isDarkTheme?: boolean;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  sample: ClotHemodynamicSample;
  isMilestone: boolean;
}

const KEY_MILESTONES: ClotHemodynamicSample[] = [
  {
    progress: 0.05,
    mpap: 14.0,
    pvr: 1.1,
    milestoneId: 'deepVeins',
    milestoneLabel: 'Deep Veins (DVT Origin)',
    shortLabel: 'DVT',
    clinicalNote: 'Venous thrombus assembly in lower extremity; baseline pulmonary pressure.',
  },
  {
    progress: 0.38,
    mpap: 16.5,
    pvr: 1.35,
    milestoneId: 'heart',
    milestoneLabel: 'Heart (Right Atrium / RV)',
    shortLabel: 'Heart',
    clinicalNote: 'Embolus transits tricuspid & pulmonary valves prior to arterial arrest.',
  },
  {
    progress: 0.62,
    mpap: 25.0,
    pvr: 2.75,
    milestoneId: 'bifurcation',
    milestoneLabel: 'Main PA Bifurcation',
    shortLabel: 'Bifurc.',
    clinicalNote: 'Luminal narrowing initiates mechanical impaction and rising RV afterload.',
  },
  {
    progress: 0.85,
    mpap: 38.0,
    pvr: 4.6,
    milestoneId: 'pulmonaryArtery',
    milestoneLabel: 'Pulmonary Artery Occlusion',
    shortLabel: 'PA',
    clinicalNote: 'Acute lobar occlusion (~85% cross-section); surge in mPAP and RV strain.',
  },
  {
    progress: 1.0,
    mpap: 39.0,
    pvr: 4.8,
    milestoneId: 'lungs',
    milestoneLabel: 'Lungs (V/Q Mismatch)',
    shortLabel: 'Lung',
    clinicalNote: 'Distal alveolar hypoperfusion, dead-space ventilation, and max PVR.',
  },
];

function evaluateHemodynamics(progress: number, lyticFraction = 0): ClotHemodynamicSample {
  const p = Math.max(0, Math.min(1, progress));

  // Piecewise smooth cosine interpolation across physiological milestones
  const anchors: Array<{ p: number; mpap: number; pvr: number }> = [
    { p: 0.0, mpap: 14.0, pvr: 1.1 },
    { p: 0.05, mpap: 14.0, pvr: 1.1 },
    { p: 0.38, mpap: 16.5, pvr: 1.35 },
    { p: 0.62, mpap: 25.0, pvr: 2.75 },
    { p: 0.85, mpap: 38.0, pvr: 4.6 },
    { p: 1.0, mpap: 39.0, pvr: 4.8 },
  ];

  let left = anchors[0];
  let right = anchors[anchors.length - 1];
  for (let i = 0; i < anchors.length - 1; i++) {
    if (p >= anchors[i].p && p <= anchors[i + 1].p) {
      left = anchors[i];
      right = anchors[i + 1];
      break;
    }
  }

  const span = Math.max(0.0001, right.p - left.p);
  const rawT = (p - left.p) / span;
  const smoothT = (1 - Math.cos(rawT * Math.PI)) * 0.5;

  const baseMpap = left.mpap + (right.mpap - left.mpap) * smoothT;
  const basePvr = left.pvr + (right.pvr - left.pvr) * smoothT;

  // Reflect active thrombolytic dissolution if drug infusion is active
  const relief = Math.max(0, Math.min(0.85, lyticFraction * 0.85));
  const mpap = 14.0 + (baseMpap - 14.0) * (1 - relief);
  const pvr = 1.1 + (basePvr - 1.1) * (1 - relief);

  const nearMilestone = KEY_MILESTONES.find((m) => Math.abs(m.progress - p) <= 0.035);

  return {
    progress: p,
    mpap: Number(mpap.toFixed(1)),
    pvr: Number(pvr.toFixed(2)),
    milestoneId: nearMilestone?.milestoneId,
    milestoneLabel: nearMilestone?.milestoneLabel,
    shortLabel: nearMilestone?.shortLabel,
    clinicalNote: nearMilestone?.clinicalNote,
  };
}

export const ClotHemodynamicsChart: React.FC<ClotHemodynamicsChartProps> = ({
  clotPathProgress,
  lyticFraction = 0,
  onSeekClotPath,
  onSelectStructure,
  isDarkTheme = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cursorGroupRef = useRef<SVGGElement>(null);
  const [chartWidth, setChartWidth] = useState(330);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const height = 180;
  const margin = useMemo(() => ({ top: 16, right: 38, bottom: 28, left: 38 }), []);

  // Measure container width dynamically so SVG fits cleanly inside ExplainViewPanel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      if (el.clientWidth > 0) {
        setChartWidth(el.clientWidth);
      }
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Build curve dataset + adjusted milestone points
  const { series, milestones } = useMemo(() => {
    const samples: ClotHemodynamicSample[] = [];
    for (let i = 0; i <= 50; i++) {
      samples.push(evaluateHemodynamics(i / 50, lyticFraction));
    }

    const adjustedMilestones = KEY_MILESTONES.map((m) => ({
      ...m,
      mpap: evaluateHemodynamics(m.progress, lyticFraction).mpap,
      pvr: evaluateHemodynamics(m.progress, lyticFraction).pvr,
    }));

    return { series: samples, milestones: adjustedMilestones };
  }, [lyticFraction]);

  // Live current reading correlated with clotPathProgress
  const currentSample = useMemo(
    () => evaluateHemodynamics(clotPathProgress, lyticFraction),
    [clotPathProgress, lyticFraction]
  );

  // D3 Scales
  const scales = useMemo(() => {
    const innerWidth = Math.max(120, chartWidth - margin.left - margin.right);
    const innerHeight = Math.max(60, height - margin.top - margin.bottom);

    const x = d3.scaleLinear().domain([0, 1]).range([0, innerWidth]);
    const yMpap = d3.scaleLinear().domain([10, 44]).range([innerHeight, 0]);
    const yPvr = d3.scaleLinear().domain([0.5, 5.5]).range([innerHeight, 0]);

    return { x, yMpap, yPvr, innerWidth, innerHeight };
  }, [chartWidth, height, margin]);

  // Render D3 static axes, grid, gradients, dual lines, milestone markers, and pointer overlay
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const { x, yMpap, yPvr, innerWidth, innerHeight } = scales;
    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const mpapGrad = defs
      .append('linearGradient')
      .attr('id', 'mpapAreaGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    mpapGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#38bdf8')
      .attr('stop-opacity', isDarkTheme ? 0.28 : 0.22);
    mpapGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#38bdf8')
      .attr('stop-opacity', 0.02);

    const root = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Horizontal grid lines aligned to mPAP ticks
    const gridTicks = [15, 25, 35];
    root
      .append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(gridTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yMpap(d))
      .attr('y2', (d) => yMpap(d))
      .attr('stroke', isDarkTheme ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.18)')
      .attr('stroke-dasharray', '2,3');

    // Vertical milestone reference guides
    root
      .selectAll('line.milestone-guide')
      .data(milestones)
      .enter()
      .append('line')
      .attr('class', 'milestone-guide')
      .attr('x1', (d) => x(d.progress))
      .attr('x2', (d) => x(d.progress))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', isDarkTheme ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.14)')
      .attr('stroke-width', 1);

    // mPAP area fill
    const mpapArea = d3
      .area<ClotHemodynamicSample>()
      .x((d) => x(d.progress))
      .y0(innerHeight)
      .y1((d) => yMpap(d.mpap))
      .curve(d3.curveMonotoneX);

    root
      .append('path')
      .datum(series)
      .attr('fill', 'url(#mpapAreaGrad)')
      .attr('d', mpapArea);

    // mPAP line (Left Axis - Sky Blue)
    const mpapLine = d3
      .line<ClotHemodynamicSample>()
      .x((d) => x(d.progress))
      .y((d) => yMpap(d.mpap))
      .curve(d3.curveMonotoneX);

    root
      .append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 2)
      .attr('d', mpapLine);

    // Vascular Resistance line (Right Axis - Engineering Gold)
    const pvrLine = d3
      .line<ClotHemodynamicSample>()
      .x((d) => x(d.progress))
      .y((d) => yPvr(d.pvr))
      .curve(d3.curveMonotoneX);

    root
      .append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', '#e6b65c')
      .attr('stroke-width', 1.75)
      .attr('stroke-dasharray', '4,2')
      .attr('d', pvrLine);

    // Axes
    const xAxis = d3
      .axisBottom(x)
      .tickValues([0.05, 0.38, 0.62, 0.85, 1.0])
      .tickFormat((val) => {
        const match = milestones.find((m) => Math.abs(m.progress - Number(val)) < 0.02);
        return match?.shortLabel || `${Math.round(Number(val) * 100)}%`;
      })
      .tickSize(3);

    const xAxisG = root
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);
    xAxisG.selectAll('text').attr('fill', isDarkTheme ? '#cbd5e1' : '#334155').style('font-size', '11px').style('font-family', 'ui-monospace, monospace');
    xAxisG.selectAll('path,line').attr('stroke', isDarkTheme ? '#334155' : '#cbd5e1');

    const leftAxis = d3.axisLeft(yMpap).tickValues([15, 25, 35]).tickSize(3);
    const leftAxisG = root.append('g').call(leftAxis);
    leftAxisG.selectAll('text').attr('fill', '#38bdf8').style('font-size', '11px').style('font-family', 'ui-monospace, monospace');
    leftAxisG.selectAll('path,line').attr('stroke', isDarkTheme ? '#334155' : '#cbd5e1');

    const rightAxis = d3.axisRight(yPvr).tickValues([1, 3, 5]).tickSize(3);
    const rightAxisG = root.append('g').attr('transform', `translate(${innerWidth},0)`).call(rightAxis);
    rightAxisG.selectAll('text').attr('fill', '#e6b65c').style('font-size', '11px').style('font-family', 'ui-monospace, monospace');
    rightAxisG.selectAll('path,line').attr('stroke', isDarkTheme ? '#334155' : '#cbd5e1');

    // Milestone nodes on curves
    const milestoneGroup = root.append('g').attr('class', 'milestone-nodes');
    milestoneGroup
      .selectAll('circle.ms-mpap')
      .data(milestones)
      .enter()
      .append('circle')
      .attr('class', 'ms-mpap')
      .attr('cx', (d) => x(d.progress))
      .attr('cy', (d) => yMpap(d.mpap))
      .attr('r', 3)
      .attr('fill', isDarkTheme ? '#0f1014' : '#ffffff')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.5);

    milestoneGroup
      .selectAll('circle.ms-pvr')
      .data(milestones)
      .enter()
      .append('circle')
      .attr('class', 'ms-pvr')
      .attr('cx', (d) => x(d.progress))
      .attr('cy', (d) => yPvr(d.pvr))
      .attr('r', 2.5)
      .attr('fill', isDarkTheme ? '#0f1014' : '#ffffff')
      .attr('stroke', '#e6b65c')
      .attr('stroke-width', 1.5);

    // Live cursor group (updated smoothly in separate effect)
    const cursorG = root.append('g').attr('class', 'live-cursor');
    cursorG
      .append('line')
      .attr('class', 'cursor-line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 1.4)
      .attr('stroke-dasharray', '3,2');

    cursorG
      .append('circle')
      .attr('class', 'cursor-mpap-halo')
      .attr('r', 6.5)
      .attr('fill', 'rgba(56, 189, 248, 0.25)');

    cursorG
      .append('circle')
      .attr('class', 'cursor-mpap-dot')
      .attr('r', 3.8)
      .attr('fill', '#38bdf8')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2);

    cursorG
      .append('circle')
      .attr('class', 'cursor-pvr-dot')
      .attr('r', 3.4)
      .attr('fill', '#e6b65c')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.2);

    cursorGroupRef.current = cursorG.node();

    // Pointer hover/click overlay with D3 bisector + milestone snapping
    const bisect = d3.bisector<ClotHemodynamicSample, number>((d) => d.progress).left;

    const resolvePointerSample = (mouseX: number) => {
      const clampedX = Math.max(0, Math.min(innerWidth, mouseX));
      const pVal = x.invert(clampedX);

      // Snap to milestone if within ~5% path progress
      let nearestMilestone: ClotHemodynamicSample | null = null;
      let nearestDist = Infinity;
      for (const m of milestones) {
        const dist = Math.abs(m.progress - pVal);
        if (dist < 0.045 && dist < nearestDist) {
          nearestDist = dist;
          nearestMilestone = m;
        }
      }

      if (nearestMilestone) {
        return { sample: nearestMilestone, isMilestone: true };
      }

      const idx = Math.min(series.length - 1, Math.max(0, bisect(series, pVal, 1)));
      const d0 = series[idx - 1] || series[0];
      const d1 = series[idx] || series[series.length - 1];
      const chosen = pVal - d0.progress > d1.progress - pVal ? d1 : d0;
      return { sample: chosen, isMilestone: Boolean(chosen.milestoneLabel) };
    };

    root
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('pointermove', (event: PointerEvent) => {
        const [mx] = d3.pointer(event);
        const { sample, isMilestone } = resolvePointerSample(mx);
        const sx = x(sample.progress) + margin.left;
        const sy = yMpap(sample.mpap) + margin.top;
        setTooltip({
          visible: true,
          x: sx,
          y: sy,
          sample,
          isMilestone,
        });
      })
      .on('pointerleave', () => {
        setTooltip(null);
      })
      .on('click', (event: MouseEvent) => {
        const [mx] = d3.pointer(event);
        const { sample } = resolvePointerSample(mx);
        onSeekClotPath?.(sample.progress);
        if (
          sample.milestoneId === 'deepVeins' ||
          sample.milestoneId === 'heart' ||
          sample.milestoneId === 'pulmonaryArtery' ||
          sample.milestoneId === 'lungs'
        ) {
          onSelectStructure?.(sample.milestoneId);
        }
      });
  }, [scales, series, milestones, isDarkTheme, margin, onSeekClotPath, onSelectStructure]);

  // Smooth real-time update of cursor position whenever clotPathProgress changes
  useEffect(() => {
    if (!cursorGroupRef.current) return;
    const { x, yMpap, yPvr } = scales;
    const cx = x(currentSample.progress);
    const cyMpap = yMpap(currentSample.mpap);
    const cyPvr = yPvr(currentSample.pvr);

    const cursorG = d3.select(cursorGroupRef.current);
    cursorG.select('line.cursor-line').attr('x1', cx).attr('x2', cx);
    cursorG.select('circle.cursor-mpap-halo').attr('cx', cx).attr('cy', cyMpap);
    cursorG.select('circle.cursor-mpap-dot').attr('cx', cx).attr('cy', cyMpap);
    cursorG.select('circle.cursor-pvr-dot').attr('cx', cx).attr('cy', cyPvr);
  }, [currentSample, scales]);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
        isDarkTheme
          ? 'bg-[#13151b] border-[#262934] text-slate-200'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      {/* Header & Real-Time Numeric Telemetry */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider truncate">
            Clot Path Hemodynamics
          </span>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
          Path {Math.round(currentSample.progress * 100)}%
        </span>
      </div>

      {/* Live Readout Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div
          className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
            isDarkTheme ? 'bg-[#181b24] border-[#292d3a]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
            <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
            mPAP
          </span>
          <span className="text-sm font-bold tabular-nums">{currentSample.mpap.toFixed(1)} mmHg</span>
        </div>
        <div
          className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
            isDarkTheme ? 'bg-[#181b24] border-[#292d3a]' : 'bg-white border-slate-200'
          }`}
        >
          <span className="flex items-center gap-1.5 text-[#e6b65c] font-semibold">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#e6b65c] inline-block" />
            PVR
          </span>
          <span className="text-sm font-bold tabular-nums">{currentSample.pvr.toFixed(2)} WU</span>
        </div>
      </div>

      {/* D3 SVG Canvas + Floating Tooltip */}
      <div ref={containerRef} className="relative w-full select-none">
        <div className="flex items-center justify-between text-[11px] font-mono px-1 mb-1 opacity-90">
          <span className="text-sky-400 font-semibold">mPAP (mmHg)</span>
          <span className="text-slate-400 flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Hover milestones · Click to seek
          </span>
          <span className="text-[#e6b65c] font-semibold">PVR (WU)</span>
        </div>

        <svg
          ref={svgRef}
          width={chartWidth}
          height={height}
          className="block overflow-visible"
        />

        {tooltip?.visible && (
          <div
            style={{
              left: `${Math.min(Math.max(tooltip.x, 110), Math.max(110, chartWidth - 110))}px`,
              top: `${Math.max(8, tooltip.y - 8)}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className={`pointer-events-none absolute z-30 w-60 rounded-lg border px-3 py-2.5 shadow-xl text-xs backdrop-blur-md transition-opacity ${
              isDarkTheme
                ? 'bg-[#0b0d12]/95 border-sky-400/40 text-slate-100 shadow-black/80'
                : 'bg-white/95 border-sky-400 text-slate-900 shadow-slate-300/60'
            }`}
          >
            <div className="flex items-center justify-between font-bold text-sky-400 mb-1.5">
              <span className="truncate">
                {tooltip.sample.milestoneLabel ||
                  `Clot Transit (${Math.round(tooltip.sample.progress * 100)}%)`}
              </span>
              {tooltip.isMilestone && (
                <span className="text-[10px] font-mono px-1.5 rounded bg-amber-500/20 text-amber-300 ml-1 shrink-0">
                  MILESTONE
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">mPAP</span>
                <span className="text-sm font-bold text-sky-400">{tooltip.sample.mpap.toFixed(1)} mmHg</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Vasc. Resist.</span>
                <span className="text-sm font-bold text-[#e6b65c]">{tooltip.sample.pvr.toFixed(2)} WU</span>
              </div>
            </div>
            {tooltip.sample.clinicalNote && (
              <p className="mt-1.5 pt-1.5 border-t border-slate-700/40 text-xs leading-snug text-slate-300">
                {tooltip.sample.clinicalNote}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Quick Milestone Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {milestones.map((m) => {
          const isNear = Math.abs(currentSample.progress - m.progress) < 0.08;
          return (
            <button
              key={m.shortLabel}
              type="button"
              onMouseEnter={() => {
                const { x, yMpap } = scales;
                setTooltip({
                  visible: true,
                  x: x(m.progress) + margin.left,
                  y: yMpap(m.mpap) + margin.top,
                  sample: m,
                  isMilestone: true,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => {
                onSeekClotPath?.(m.progress);
                if (
                  m.milestoneId === 'deepVeins' ||
                  m.milestoneId === 'heart' ||
                  m.milestoneId === 'pulmonaryArtery' ||
                  m.milestoneId === 'lungs'
                ) {
                  onSelectStructure?.(m.milestoneId);
                }
              }}
              className={`px-2 py-1 rounded text-xs font-mono border transition-colors shrink-0 ${
                isNear
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                  : isDarkTheme
                  ? 'bg-[#181b24] border-[#282c38] text-slate-300 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {m.shortLabel} · {m.mpap.toFixed(0)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
