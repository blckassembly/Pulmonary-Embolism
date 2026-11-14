/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ClotAnnotation,
  AnnotationScreenPosition,
  ScaleLevel,
} from '../types/biomedical.ts';
import {
  X,
  Crosshair,
  Compass,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Dna,
  Activity,
  Layers,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface ClotAnnotationOverlayProps {
  annotations: ClotAnnotation[];
  activeAnnotation: ClotAnnotation | null;
  onSelectAnnotation: (annotation: ClotAnnotation | null) => void;
  onFocusAnnotation?: (id: string) => void;
  positions: Record<string, AnnotationScreenPosition>;
  isDarkTheme: boolean;
  currentScale: ScaleLevel;
  isLayerVisible: boolean;
  onToggleLayer: () => void;
}

export const ClotAnnotationOverlay: React.FC<ClotAnnotationOverlayProps> = ({
  annotations,
  activeAnnotation,
  onSelectAnnotation,
  onFocusAnnotation,
  positions,
  isDarkTheme,
  currentScale,
  isLayerVisible,
  onToggleLayer,
}) => {
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);

  if (!isLayerVisible) {
    return (
      <button
        onClick={onToggleLayer}
        title="Show 3D Clot Biological Annotations"
        className={`fixed top-16 right-4 z-20 flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg text-sm font-medium transition-all ${
          isDarkTheme
            ? 'bg-[#131416]/90 border-[#2a2b2e] text-[#e6b65c] hover:bg-[#1f2025]'
            : 'bg-white/90 border-slate-300 text-amber-700 hover:bg-slate-50'
        }`}
      >
        <Eye className="w-4 h-4" />
        <span>Show Bio-Annotations</span>
      </button>
    );
  }

  // Filter annotations relevant to current scale
  const scaleFilter = (ann: ClotAnnotation) => {
    if (currentScale === 'microscopic') return ann.scale === 'microscopic';
    if (currentScale === 'clot' || currentScale === 'vessel') return ann.scale === 'clot' || ann.scale === 'vessel';
    return true;
  };

  const visibleScaleAnnotations = annotations.filter(scaleFilter);
  const activeIndex = activeAnnotation
    ? visibleScaleAnnotations.findIndex((a) => a.id === activeAnnotation.id)
    : -1;

  const handleNext = () => {
    if (visibleScaleAnnotations.length === 0) return;
    const nextIdx = (activeIndex + 1) % visibleScaleAnnotations.length;
    const next = visibleScaleAnnotations[nextIdx];
    onSelectAnnotation(next);
    if (onFocusAnnotation) onFocusAnnotation(next.id);
  };

  const handlePrev = () => {
    if (visibleScaleAnnotations.length === 0) return;
    const prevIdx = (activeIndex - 1 + visibleScaleAnnotations.length) % visibleScaleAnnotations.length;
    const prev = visibleScaleAnnotations[prevIdx];
    onSelectAnnotation(prev);
    if (onFocusAnnotation) onFocusAnnotation(prev.id);
  };

  // Get active screen coordinate
  const activePos = activeAnnotation ? positions[activeAnnotation.id] : null;

  // Compute smart floating card position relative to 3D anchor point
  const getCardPlacement = () => {
    if (!activePos || !activePos.visible) {
      return { cardX: 24, cardY: 80, anchorX: 0, anchorY: 0, hasAnchor: false };
    }

    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;

    const cardWidth = Math.min(380, viewportW - 32);
    const cardHeight = 360;

    let cardX: number;
    if (activePos.x + cardWidth + 40 < viewportW) {
      // Place to the right of the anchor
      cardX = activePos.x + 40;
    } else if (activePos.x - cardWidth - 40 > 10) {
      // Place to the left of the anchor
      cardX = activePos.x - cardWidth - 40;
    } else {
      // Center horizontally on smaller screen
      cardX = Math.max(16, (viewportW - cardWidth) / 2);
    }

    // Clamp Y to stay nicely on screen
    let cardY = activePos.y - 60;
    if (cardY < 75) cardY = 75;
    if (cardY + cardHeight > viewportH - 80) cardY = Math.max(75, viewportH - cardHeight - 80);

    return {
      cardX,
      cardY,
      anchorX: activePos.x,
      anchorY: activePos.y,
      hasAnchor: true,
    };
  };

  const { cardX, cardY, anchorX, anchorY, hasAnchor } = getCardPlacement();

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'ultrastructure':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      case 'cellular':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
      case 'hemodynamics':
        return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30';
      case 'biomechanical':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {/* 1. Quick Target Hotspot Selector Bar (Top Right) */}
      <div className="pointer-events-auto absolute top-14 right-4 flex items-center gap-1.5 p-1.5 rounded-xl backdrop-blur-md border shadow-lg max-w-[calc(100vw-32px)] overflow-x-auto no-scrollbar transition-all bg-white/85 dark:bg-[#0c0d10]/85 border-slate-300 dark:border-[#26282e]">
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-600 dark:text-[#9ca3af] shrink-0">
          <Crosshair className="w-3.5 h-3.5 text-[#e6b65c]" />
          <span>Hotspots ({visibleScaleAnnotations.length})</span>
        </div>

        <div className="h-4 w-px bg-slate-300 dark:bg-[#2a2c33] shrink-0" />

        {visibleScaleAnnotations.map((ann) => {
          const isSelected = activeAnnotation?.id === ann.id;
          return (
            <button
              key={ann.id}
              onClick={() => {
                onSelectAnnotation(ann);
                if (onFocusAnnotation) onFocusAnnotation(ann.id);
              }}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#e6b65c] text-black font-semibold shadow-sm'
                  : 'text-slate-700 dark:text-[#c5c9d3] hover:bg-slate-200/60 dark:hover:bg-[#1a1c22]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ann.colorHex || '#e6b65c' }}
              />
              <span>{ann.title}</span>
            </button>
          );
        })}

        <button
          onClick={onToggleLayer}
          title="Toggle Annotations Layer"
          className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#1a1c22] text-slate-500 dark:text-[#8a8f9d] transition-colors ml-1 shrink-0"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Interactive 3D Screen Beacon Pins */}
      {visibleScaleAnnotations.map((ann) => {
        const pos = positions[ann.id];
        if (!pos || !pos.visible) return null;

        const isSelected = activeAnnotation?.id === ann.id;
        const isHovered = hoveredHotspotId === ann.id;

        return (
          <div
            key={`pin_${ann.id}`}
            style={{
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
            }}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 cursor-pointer group"
            onMouseEnter={() => setHoveredHotspotId(ann.id)}
            onMouseLeave={() => setHoveredHotspotId(null)}
            onClick={() => {
              onSelectAnnotation(ann);
              if (onFocusAnnotation) onFocusAnnotation(ann.id);
            }}
          >
            {/* Outer animated radar pulse */}
            <div
              className={`absolute -inset-2 rounded-full border border-dashed transition-all duration-300 animate-ping opacity-40`}
              style={{ borderColor: ann.colorHex || '#e6b65c' }}
            />

            {/* Glowing Hotspot Button */}
            <div
              className={`relative flex items-center justify-center w-7 h-7 rounded-full border shadow-lg transition-transform ${
                isSelected
                  ? 'scale-125 ring-2 ring-[#e6b65c] bg-black/90 text-[#e6b65c]'
                  : isHovered
                  ? 'scale-115 bg-black/80 text-white'
                  : 'bg-white/95 dark:bg-[#121316]/95 text-slate-800 dark:text-slate-100'
              }`}
              style={{
                borderColor: ann.colorHex || '#e6b65c',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ann.colorHex || '#e6b65c' }}
              />
            </div>

            {/* Mini Hover Label */}
            {!isSelected && isHovered && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-8 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shadow-xl border pointer-events-none z-30 animate-fadeIn ${
                  isDarkTheme
                    ? 'bg-[#0f1115]/95 border-[#2b2d35] text-white'
                    : 'bg-white/95 border-slate-300 text-slate-900'
                }`}
              >
                <div className="font-semibold">{ann.title}</div>
                <div className="text-xs text-[#e6b65c] font-mono">{ann.metricValue}</div>
              </div>
            )}
          </div>
        );
      })}

      {/* 3. SVG Connector Line from 3D Anchor Point to Floating Biological Card */}
      {activeAnnotation && hasAnchor && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 25 }}
        >
          <defs>
            <linearGradient id="connectorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={activeAnnotation.colorHex || '#e6b65c'} stopOpacity="0.9" />
              <stop offset="100%" stopColor={activeAnnotation.colorHex || '#e6b65c'} stopOpacity="0.25" />
            </linearGradient>
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Anchor ring around 3D point */}
          <circle
            cx={anchorX}
            cy={anchorY}
            r="8"
            fill="none"
            stroke={activeAnnotation.colorHex || '#e6b65c'}
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <circle
            cx={anchorX}
            cy={anchorY}
            r="3"
            fill={activeAnnotation.colorHex || '#e6b65c'}
          />

          {/* Bezier connector line to card */}
          {(() => {
            const targetX = cardX > anchorX ? cardX : cardX + 380;
            const targetY = cardY + 36;
            const cX1 = anchorX + (targetX - anchorX) * 0.5;
            const cY1 = anchorY;
            const cX2 = anchorX + (targetX - anchorX) * 0.5;
            const cY2 = targetY;

            return (
              <path
                d={`M ${anchorX} ${anchorY} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${targetX} ${targetY}`}
                fill="none"
                stroke="url(#connectorGradient)"
                strokeWidth="1.75"
                filter="url(#glowEffect)"
              />
            );
          })()}
        </svg>
      )}

      {/* 4. Sleek Floating Biological Detail Card */}
      {activeAnnotation && (
        <div
          style={{
            transform: `translate3d(${cardX}px, ${cardY}px, 0)`,
            width: 'min(420px, calc(100vw - 32px))',
          }}
          className={`pointer-events-auto absolute z-30 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-95 ${
            isDarkTheme
              ? 'bg-[#0c0d11]/95 border-[#282a32] text-slate-100 shadow-black/70'
              : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/40'
          }`}
        >
          {/* Card Top Header */}
          <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200 dark:border-[#1f2127]">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wider border ${getCategoryColor(
                  activeAnnotation.category
                )}`}
              >
                {activeAnnotation.category}
              </span>

              <span className="text-xs font-mono text-slate-500 dark:text-[#8a8f9d]">
                {activeAnnotation.scale === 'microscopic' ? '50 µm Micro-Network' : '4 mm Macro Thrombus'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onFocusAnnotation && (
                <button
                  onClick={() => onFocusAnnotation(activeAnnotation.id)}
                  title="Center Camera on this Hotspot"
                  className="p-1.5 rounded-lg text-slate-500 dark:text-[#8a8f9d] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] transition-colors"
                >
                  <Compass className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onSelectAnnotation(null)}
                title="Dismiss Annotation"
                className="p-1.5 rounded-lg text-slate-500 dark:text-[#8a8f9d] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1a1c22] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Biological Title & Sub-badge */}
          <div className="p-4 pt-3 space-y-3.5">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>{activeAnnotation.title}</span>
              </h3>
              <div className="text-xs text-[#e6b65c] font-medium mt-0.5">
                {activeAnnotation.badge}
              </div>
            </div>

            {/* Hero Metric Callout */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                isDarkTheme
                  ? 'bg-[#14151b] border-[#252833]'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-[#8a8f9d]">
                  Quantified Biophysical Metric
                </div>
                <div className="text-xl font-mono font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums mt-0.5">
                  {activeAnnotation.metricValue}
                </div>
              </div>

              <div className="text-right max-w-[165px]">
                <span className="text-xs font-mono text-slate-500 dark:text-[#a0a5b4] leading-tight block">
                  {activeAnnotation.metricLabel}
                </span>
              </div>
            </div>

            {/* Biological Details */}
            <div className="space-y-1.5 text-sm text-slate-600 dark:text-[#c5cad6] leading-relaxed">
              <p>{activeAnnotation.biologicalDetails}</p>
            </div>

            {/* Clinical Significance Callout */}
            <div
              className={`p-3 rounded-lg border text-sm leading-normal ${
                isDarkTheme
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-200/95'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5 text-xs mb-1 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Clinical & Therapeutic Relevance</span>
              </div>
              <p className="text-sm">{activeAnnotation.clinicalSignificance}</p>
            </div>

            {/* Molecular Markers Chips */}
            <div className="space-y-1.5 pt-1">
              <div className="text-xs font-mono text-slate-400 dark:text-[#8e94a4] uppercase tracking-wider flex items-center gap-1.5">
                <Dna className="w-3.5 h-3.5 text-emerald-500" />
                <span>Molecular Markers & Receptors</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeAnnotation.molecularMarkers.map((marker) => (
                  <span
                    key={marker}
                    className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-[#1a1c22] border border-slate-200 dark:border-[#2b2d35] text-slate-700 dark:text-[#c5c9d3]"
                  >
                    {marker}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls: Prev / Next Hotspot & Focus Button */}
          <div className="flex items-center justify-between p-3.5 border-t border-slate-200 dark:border-[#1f2127] bg-slate-50/70 dark:bg-[#101116]/70 rounded-b-2xl">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                title="Previous Hotspot"
                className="p-1.5 rounded-lg text-slate-600 dark:text-[#a0a5b4] hover:bg-slate-200/60 dark:hover:bg-[#1d1f27] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-400 dark:text-[#8a8f9d]">
                {activeIndex + 1} / {visibleScaleAnnotations.length}
              </span>
              <button
                onClick={handleNext}
                title="Next Hotspot"
                className="p-1.5 rounded-lg text-slate-600 dark:text-[#a0a5b4] hover:bg-slate-200/60 dark:hover:bg-[#1d1f27] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {onFocusAnnotation && (
              <button
                onClick={() => onFocusAnnotation(activeAnnotation.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold rounded-lg bg-[#e6b65c] text-black hover:bg-[#f3ca76] transition-colors shadow-sm"
              >
                <Compass className="w-4 h-4" />
                <span>Focus Camera</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
