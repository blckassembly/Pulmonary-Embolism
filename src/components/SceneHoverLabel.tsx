/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SceneHoverLabelState } from '../data/anatomicalHoverLabels.ts';

interface SceneHoverLabelProps {
  hoverState: SceneHoverLabelState | null;
  isDarkTheme: boolean;
  isSidebarCollapsed?: boolean;
}

export const SceneHoverLabel: React.FC<SceneHoverLabelProps> = ({
  hoverState,
  isDarkTheme,
  isSidebarCollapsed = false,
}) => {
  if (!hoverState || !hoverState.visible) return null;

  const { info, screenX, screenY } = hoverState;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Keep tooltip safely clear of responsive sidebar, bottom zoom bar, and viewport edges
  const cardWidth = Math.min(312, vw - 32);
  const cardMaxHeight = 196;
  const minLeft = vw < 768 ? 16 : isSidebarCollapsed ? 84 : 292;
  const preferLeftSide = screenX + 20 + cardWidth > vw - 16;

  const rawLeft = preferLeftSide ? screenX - cardWidth - 18 : screenX + 18;
  const clampedLeft = Math.max(minLeft, Math.min(vw - cardWidth - 16, rawLeft));
  const clampedTop = Math.max(16, Math.min(vh - cardMaxHeight - 76, screenY - 32));

  const isPA = info.isPulmonarySegment === true;

  const cardSurface = isDarkTheme
    ? 'bg-[#141513] border-[#F5D547]/70 text-[#FAF7EC] shadow-2xl shadow-black/80'
    : 'bg-[#FAF7EC] border-[#141514] text-[#141514] shadow-xl shadow-black/15';

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none overflow-hidden">
      {/* Pinpoint Surface Marker */}
      <div
        style={{
          transform: `translate3d(${screenX - 6}px, ${screenY - 6}px, 0)`,
        }}
        className="absolute top-0 left-0 w-3 h-3 flex items-center justify-center"
      >
        <span
          className={`w-3 h-3 rounded-full border-2 ${
            isPA
              ? 'bg-[#F5D547] border-[#141514]'
              : 'bg-[#C82828] border-[#FAF7EC]'
          }`}
        />
      </div>

      {/* Editorial Clinical Anatomy Card */}
      <div
        role="status"
        aria-live="polite"
        style={{
          transform: `translate3d(${clampedLeft}px, ${clampedTop}px, 0)`,
          width: cardWidth,
        }}
        className={`absolute top-0 left-0 rounded-xl border overflow-hidden transition-opacity duration-150 ${cardSurface}`}
      >
        {/* Top Editorial Accent Bar */}
        <div
          className={`px-4 py-2 border-b flex items-center justify-between gap-2 ${
            isDarkTheme
              ? 'bg-[#1D1E1A] border-[#2C2E28]'
              : 'bg-[#F5D547] border-[#141514]/25'
          }`}
        >
          <span
            className={`text-[10px] font-bold tracking-[0.18em] uppercase truncate ${
              isDarkTheme ? 'text-[#F5D547]' : 'text-[#141514]'
            }`}
          >
            {info.category}
          </span>
          <span
            className={`text-[11px] font-mono font-semibold shrink-0 ${
              isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#141514]/80'
            }`}
          >
            {info.shortTag}
          </span>
        </div>

        <div className="p-4">
          <h3 className="font-display text-[17px] font-bold tracking-tight leading-snug">
            {info.clinicalName}
          </h3>

          <p
            className={`text-xs leading-relaxed mt-1.5 ${
              isDarkTheme ? 'text-[#D6D3C8]' : 'text-[#32332E]'
            }`}
          >
            {info.description}
          </p>

          {info.clinicalNote && (
            <div
              className={`mt-2.5 pt-2.5 border-t text-xs font-medium leading-snug ${
                isDarkTheme
                  ? 'border-[#2C2E28] text-[#F5D547]'
                  : 'border-[#141514]/15 text-[#141514]'
              }`}
            >
              {info.clinicalNote}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
