/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { VRReticleHudState } from '../core/xr/VRCenterReticle.ts';

interface VRCenterReticleOverlayProps {
  reticleState: VRReticleHudState | null;
  isDarkTheme: boolean;
}

export const VRCenterReticleOverlay: React.FC<VRCenterReticleOverlayProps> = ({
  reticleState,
  isDarkTheme,
}) => {
  if (!reticleState?.visible2D || typeof document === 'undefined') {
    return null;
  }

  const { targetState, targetLabel } = reticleState;
  const isLocked = targetState !== 'idle';
  const isHotspot = targetState === 'hotspot';

  const primaryStroke = isLocked
    ? '#F5D547'
    : isDarkTheme
    ? 'rgba(250, 247, 236, 0.72)'
    : 'rgba(20, 21, 20, 0.72)';

  const haloStroke = isLocked
    ? 'rgba(20, 21, 20, 0.72)'
    : isDarkTheme
    ? 'rgba(14, 15, 13, 0.55)'
    : 'rgba(250, 247, 236, 0.65)';

  return createPortal(
    <div
      aria-hidden="true"
      style={{ zIndex: 2147483645 }}
      className="fixed inset-0 pointer-events-none flex items-center justify-center select-none"
    >
      <div className="relative flex flex-col items-center justify-center">
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          className={`transition-transform duration-150 ${
            isHotspot ? 'scale-110' : isLocked ? 'scale-105' : 'scale-100'
          }`}
        >
          {/* Subtle Target-Lock Outer Ring */}
          {isLocked && (
            <>
              <circle
                cx="18"
                cy="18"
                r={isHotspot ? 12.5 : 14}
                fill="none"
                stroke={haloStroke}
                strokeWidth="2.4"
              />
              <circle
                cx="18"
                cy="18"
                r={isHotspot ? 12.5 : 14}
                fill="none"
                stroke="#F5D547"
                strokeWidth={isHotspot ? 1.4 : 1}
                opacity={isHotspot ? 0.92 : 0.6}
              />
            </>
          )}

          {/* Contrast Backing Crosshair Hairlines */}
          <g stroke={haloStroke} strokeWidth="2.6" strokeLinecap="square">
            <line x1="6.5" y1="18" x2="12.5" y2="18" />
            <line x1="23.5" y1="18" x2="29.5" y2="18" />
            <line x1="18" y1="6.5" x2="18" y2="12.5" />
            <line x1="18" y1="23.5" x2="18" y2="29.5" />
          </g>

          {/* Primary Architectural Crosshair Hairlines */}
          <g stroke={primaryStroke} strokeWidth="1.25" strokeLinecap="square">
            <line x1="6.5" y1="18" x2="12.5" y2="18" />
            <line x1="23.5" y1="18" x2="29.5" y2="18" />
            <line x1="18" y1="6.5" x2="18" y2="12.5" />
            <line x1="18" y1="23.5" x2="18" y2="29.5" />
          </g>

          {/* Center Pinpoint Dot */}
          <circle cx="18" cy="18" r="2.2" fill={haloStroke} />
          <circle cx="18" cy="18" r="1.35" fill={primaryStroke} />
        </svg>

        {/* Quiet Unboxed Target Readout Under Crosshair When Aimed at Fibrin / Anatomy */}
        {targetLabel && (
          <div
            className={`absolute top-[40px] whitespace-nowrap font-mono text-[10px] font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded ${
              isDarkTheme
                ? 'bg-[#141513]/85 text-[#F5D547]'
                : 'bg-[#FAF7EC]/90 text-[#141514]'
            }`}
          >
            {targetLabel}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
