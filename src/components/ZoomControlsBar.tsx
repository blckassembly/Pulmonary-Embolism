/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlsBarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onResetView?: () => void;
  isDarkTheme: boolean;
}

export const ZoomControlsBar: React.FC<ZoomControlsBarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onResetView,
  isDarkTheme,
}) => {
  const canZoomOut = zoom > 0.26;
  const canZoomIn = zoom < 4.95;

  return (
    <div
      className={`fixed bottom-4 right-4 z-20 flex items-center gap-1 p-1.5 rounded-xl border shadow-lg transition-colors ${
        isDarkTheme
          ? 'bg-[#141513] border-[#31332D] text-[#FAF7EC] shadow-black/70'
          : 'bg-[#FAF7EC] border-[#141514] text-[#141514] shadow-black/10'
      }`}
      role="group"
      aria-label="Viewport Zoom and Camera Controls"
    >
      <button
        type="button"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (-)"
        aria-label="Zoom Out"
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          !canZoomOut
            ? 'opacity-30 cursor-not-allowed'
            : isDarkTheme
            ? 'hover:bg-[#242621] text-[#FAF7EC] active:bg-[#2F312B]'
            : 'hover:bg-[#F2EDE0] text-[#141514] active:bg-[#E7E1CF]'
        }`}
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onResetZoom}
        title="Reset Zoom to 1.00× (0)"
        aria-label={`Current zoom ${zoom.toFixed(2)}x, click to reset`}
        className={`min-w-[62px] h-10 px-2.5 rounded-lg text-xs font-mono font-bold tabular-nums border transition-colors ${
          isDarkTheme
            ? 'bg-[#1E201C] border-[#31332D] hover:bg-[#F5D547] hover:text-[#141514] hover:border-[#F5D547] text-[#F5D547]'
            : 'bg-[#F5D547] border-[#141514] hover:bg-[#EBC834] text-[#141514]'
        }`}
      >
        {zoom.toFixed(2)}×
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (+)"
        aria-label="Zoom In"
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          !canZoomIn
            ? 'opacity-30 cursor-not-allowed'
            : isDarkTheme
            ? 'hover:bg-[#242621] text-[#FAF7EC] active:bg-[#2F312B]'
            : 'hover:bg-[#F2EDE0] text-[#141514] active:bg-[#E7E1CF]'
        }`}
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      {onResetView && (
        <>
          <div
            aria-hidden="true"
            className={`w-px h-6 mx-0.5 ${isDarkTheme ? 'bg-[#2C2E28]' : 'bg-[#141514]/20'}`}
          />
          <button
            type="button"
            onClick={onResetView}
            title="Reset Camera View (R)"
            aria-label="Reset Camera View"
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
              isDarkTheme
                ? 'hover:bg-[#242621] text-[#FAF7EC] active:bg-[#2F312B]'
                : 'hover:bg-[#F2EDE0] text-[#141514] active:bg-[#E7E1CF]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};
