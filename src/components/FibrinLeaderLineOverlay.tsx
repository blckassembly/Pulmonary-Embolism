/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, X } from 'lucide-react';
import { ClotAnnotation } from '../types/biomedical.ts';
import { FibrinLeaderLineItem } from '../core/scene/FibrinLeaderLineManager.ts';

interface FibrinLeaderLineOverlayProps {
  items: FibrinLeaderLineItem[];
  selectedAnnotation: ClotAnnotation | null;
  allMicroscopicAnnotations: ClotAnnotation[];
  onSelectAnnotation: (id: string | null) => void;
  onHoverAnnotation: (id: string | null) => void;
  isDarkTheme: boolean;
}

const CATEGORY_LABELS: Record<ClotAnnotation['category'], string> = {
  ultrastructure: 'FIBRIN ULTRASTRUCTURE',
  cellular: 'CELLULAR INTERFACE',
  hemodynamics: 'MICRO-HEMODYNAMICS',
  biomechanical: 'BIOMECHANICS',
  pharmacology: 'THROMBOLYTIC PHARMACOLOGY',
};

export const FibrinLeaderLineOverlay: React.FC<FibrinLeaderLineOverlayProps> = ({
  items,
  selectedAnnotation,
  allMicroscopicAnnotations,
  onSelectAnnotation,
  onHoverAnnotation,
  isDarkTheme,
}) => {
  // Close clinical pop-up on Escape (bubble phase, so capture-phase VR escape takes precedence)
  useEffect(() => {
    if (!selectedAnnotation) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectAnnotation(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedAnnotation, onSelectAnnotation]);

  if (items.length === 0 && !selectedAnnotation) {
    return null;
  }

  const selectedIndex = selectedAnnotation
    ? allMicroscopicAnnotations.findIndex((a) => a.id === selectedAnnotation.id)
    : -1;

  const handleStep = (direction: -1 | 1) => {
    if (allMicroscopicAnnotations.length === 0) return;
    const base = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIdx = (base + direction + allMicroscopicAnnotations.length) % allMicroscopicAnnotations.length;
    onSelectAnnotation(allMicroscopicAnnotations[nextIdx].id);
  };

  // Architectural stroke palette tuned for legibility over fibrin/erythrocyte mesh in both themes
  const baseLineStroke = isDarkTheme ? '#FAF7EC' : '#141514';
  const baseLineHalo = isDarkTheme ? 'rgba(14, 15, 13, 0.72)' : 'rgba(250, 247, 236, 0.78)';
  const activeLineStroke = '#F5D547';
  const activeLineHalo = '#141514';

  return (
    <>
      {/* Dynamic SVG Elbowed Leader Lines Attached to 3D Fibrin Anchors */}
      <svg
        aria-hidden="true"
        className="fixed inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
      >
        {items.map((item) => {
          const isActive = item.isSelected || item.isHovered;
          const pts = `${item.anchorX},${item.anchorY} ${item.elbowX},${item.elbowY} ${item.labelX},${item.labelY}`;

          return (
            <g key={item.id}>
              {/* Contrast backing hairline for legibility over dense red blood cells & fibrin */}
              <polyline
                points={pts}
                fill="none"
                stroke={isActive ? activeLineHalo : baseLineHalo}
                strokeWidth={isActive ? 4 : 3}
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              {/* Primary architectural leader line */}
              <polyline
                points={pts}
                fill="none"
                stroke={isActive ? activeLineStroke : baseLineStroke}
                strokeWidth={isActive ? 2 : 1.25}
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              {/* Anchor reticle ring on 3D fibrin microstructure point */}
              <circle
                cx={item.anchorX}
                cy={item.anchorY}
                r={isActive ? 7.5 : 5.5}
                fill="none"
                stroke={isActive ? activeLineHalo : baseLineHalo}
                strokeWidth={2.5}
              />
              <circle
                cx={item.anchorX}
                cy={item.anchorY}
                r={isActive ? 7.5 : 5.5}
                fill="none"
                stroke={isActive ? activeLineStroke : baseLineStroke}
                strokeWidth={isActive ? 1.75 : 1.25}
              />
              {/* Anchor solid dot */}
              <circle
                cx={item.anchorX}
                cy={item.anchorY}
                r={isActive ? 3.2 : 2.4}
                fill={isActive ? activeLineStroke : baseLineStroke}
              />
              {/* Elbow vertex node */}
              <circle
                cx={item.elbowX}
                cy={item.elbowY}
                r={isActive ? 2.2 : 1.5}
                fill={isActive ? activeLineStroke : baseLineStroke}
              />
            </g>
          );
        })}
      </svg>

      {/* Interactive Leader-Line Callout Tags */}
      <div
        role="region"
        aria-label="Fibrin microstructure clinical annotations"
        className="fixed inset-0 pointer-events-none z-20"
      >
        {items.map((item) => {
          const isSelected = item.isSelected;
          const isHovered = item.isHovered;
          const isLeft = item.side === 'left';

          const tagColors = isSelected
            ? 'bg-[#F5D547] text-[#141514] border-[#141514] shadow-md'
            : isHovered
            ? isDarkTheme
              ? 'bg-[#20221D] text-[#FAF7EC] border-[#F5D547] shadow-md'
              : 'bg-[#FAF7EC] text-[#141514] border-[#141514] shadow-md'
            : isDarkTheme
            ? 'bg-[#141513] text-[#FAF7EC] border-[#34362F] hover:border-[#F5D547]'
            : 'bg-[#FAF7EC] text-[#141514] border-[#141514]/80 hover:border-[#141514]';

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectAnnotation(isSelected ? null : item.id)}
              onMouseEnter={() => onHoverAnnotation(item.id)}
              onMouseLeave={() => onHoverAnnotation(null)}
              onFocus={() => onHoverAnnotation(item.id)}
              onBlur={() => onHoverAnnotation(null)}
              aria-expanded={isSelected}
              style={{
                left: `${item.labelX}px`,
                top: `${item.labelY}px`,
                transform: isLeft ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
              }}
              className={`fixed pointer-events-auto min-h-[42px] max-w-[210px] px-2.5 py-1.5 rounded-md border text-left transition-colors cursor-pointer group ${tagColors}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-bold leading-tight tracking-tight truncate">
                    {item.annotation.title}
                  </div>
                  <div
                    className={`mt-0.5 font-mono text-[10px] font-semibold tabular-nums leading-none truncate ${
                      isSelected
                        ? 'text-[#141514]/85'
                        : isDarkTheme
                        ? 'text-[#F5D547]'
                        : 'text-[#5A5328]'
                    }`}
                  >
                    {item.annotation.metricValue}
                  </div>
                </div>
                <ArrowUpRight
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
                    isSelected
                      ? 'text-[#141514]'
                      : isDarkTheme
                      ? 'text-[#B7B5AA] group-hover:text-[#F5D547]'
                      : 'text-[#555650] group-hover:text-[#141514]'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Specific Clinical Data Pop-up Card */}
      {selectedAnnotation && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-labelledby="fibrin-clinical-popup-title"
          className={`fixed top-4 right-4 z-30 w-[min(368px,calc(100vw-32px))] max-h-[calc(100vh-96px)] flex flex-col rounded-xl border shadow-2xl overflow-hidden pointer-events-auto ${
            isDarkTheme
              ? 'bg-[#141513] text-[#FAF7EC] border-[#F5D547]'
              : 'bg-[#FAF7EC] text-[#141514] border-[#141514]'
          }`}
        >
          {/* Editorial Yellow Header Band */}
          <div className="bg-[#F5D547] text-[#141514] px-4 py-3 border-b border-[#141514] flex items-start justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] uppercase">
                <span>{CATEGORY_LABELS[selectedAnnotation.category]}</span>
                {selectedIndex >= 0 && (
                  <>
                    <span className="opacity-45">/</span>
                    <span className="font-mono tracking-normal tabular-nums">
                      0{selectedIndex + 1} OF 0{allMicroscopicAnnotations.length}
                    </span>
                  </>
                )}
              </div>
              <h2
                id="fibrin-clinical-popup-title"
                className="mt-1 font-display text-[20px] font-bold leading-tight tracking-tight"
              >
                {selectedAnnotation.title}
              </h2>
              <p className="mt-0.5 text-[11px] font-semibold text-[#141514]/80">
                {selectedAnnotation.badge}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onSelectAnnotation(null)}
              aria-label="Close clinical data pop-up"
              title="Close (Esc)"
              className="min-w-[40px] min-h-[40px] -mr-1.5 -mt-1 rounded-lg flex items-center justify-center text-[#141514] hover:bg-[#141514]/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Clinical Data Body */}
          <div className="px-4 py-3.5 space-y-3.5 overflow-y-auto">
            {/* Key Quantitative Metric Strip */}
            <div
              className={`pl-3 border-l-2 border-[#F5D547] py-0.5 ${
                isDarkTheme ? 'text-[#FAF7EC]' : 'text-[#141514]'
              }`}
            >
              <div className="font-mono text-lg font-bold tabular-nums leading-tight">
                {selectedAnnotation.metricValue}
              </div>
              <div
                className={`text-[11px] mt-0.5 ${
                  isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#4D4E47]'
                }`}
              >
                {selectedAnnotation.metricLabel}
              </div>
            </div>

            {/* Lead Summary */}
            <p
              className={`text-[12.5px] font-medium leading-relaxed ${
                isDarkTheme ? 'text-[#ECE9DC]' : 'text-[#1E201D]'
              }`}
            >
              {selectedAnnotation.summary}
            </p>

            {/* Ultrastructural Mechanism */}
            <div
              className={`pt-3 border-t ${
                isDarkTheme ? 'border-[#2A2C26]' : 'border-[#141514]/15'
              }`}
            >
              <div
                className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-1 ${
                  isDarkTheme ? 'text-[#F5D547]' : 'text-[#5A5328]'
                }`}
              >
                Ultrastructural Mechanism
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkTheme ? 'text-[#C6C3B8]' : 'text-[#3A3B36]'
                }`}
              >
                {selectedAnnotation.biologicalDetails}
              </p>
            </div>

            {/* Clinical & Thrombolytic Significance */}
            <div
              className={`pt-3 border-t ${
                isDarkTheme ? 'border-[#2A2C26]' : 'border-[#141514]/15'
              }`}
            >
              <div
                className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-1 ${
                  isDarkTheme ? 'text-[#F5D547]' : 'text-[#5A5328]'
                }`}
              >
                Clinical &amp; Thrombolytic Significance
              </div>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkTheme ? 'text-[#C6C3B8]' : 'text-[#3A3B36]'
                }`}
              >
                {selectedAnnotation.clinicalSignificance}
              </p>
            </div>

            {/* Molecular Markers — Unboxed Editorial Monospace Typography */}
            <div
              className={`pt-3 border-t ${
                isDarkTheme ? 'border-[#2A2C26]' : 'border-[#141514]/15'
              }`}
            >
              <div
                className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-1 ${
                  isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#555650]'
                }`}
              >
                Molecular Markers
              </div>
              <div
                className={`font-mono text-[11px] leading-relaxed ${
                  isDarkTheme ? 'text-[#FAF7EC]' : 'text-[#141514]'
                }`}
              >
                {selectedAnnotation.molecularMarkers.map((marker, idx) => (
                  <React.Fragment key={marker}>
                    {idx > 0 && <span className="mx-1.5 opacity-35">/</span>}
                    <span>{marker}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Compact Footer Navigation Across Fibrin Structures */}
          <div
            className={`px-3 py-2 border-t flex items-center justify-between gap-2 shrink-0 ${
              isDarkTheme
                ? 'bg-[#0E0F0D] border-[#2A2C26]'
                : 'bg-[#F2EDE0] border-[#141514]/15'
            }`}
          >
            <span
              className={`text-[10px] font-mono uppercase tracking-wider pl-1 ${
                isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#555650]'
              }`}
            >
              50 µm Matrix · 3D Anchored
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStep(-1)}
                aria-label="Previous fibrin annotation"
                className={`min-w-[40px] min-h-[40px] rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                  isDarkTheme
                    ? 'border-[#34362F] text-[#FAF7EC] hover:border-[#F5D547] hover:text-[#F5D547]'
                    : 'border-[#141514]/25 text-[#141514] hover:border-[#141514] hover:bg-[#F5D547]'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleStep(1)}
                aria-label="Next fibrin annotation"
                className={`min-w-[40px] min-h-[40px] rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                  isDarkTheme
                    ? 'border-[#34362F] text-[#FAF7EC] hover:border-[#F5D547] hover:text-[#F5D547]'
                    : 'border-[#141514]/25 text-[#141514] hover:border-[#141514] hover:bg-[#F5D547]'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};
