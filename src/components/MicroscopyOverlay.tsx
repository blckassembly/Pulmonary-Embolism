/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScaleLevel } from '../types/biomedical.ts';

interface MicroscopyOverlayProps {
  currentScale: ScaleLevel;
  stageName: string;
  isDarkTheme?: boolean;
}

export const MicroscopyOverlay: React.FC<MicroscopyOverlayProps> = ({
  currentScale,
  stageName,
  isDarkTheme = false,
}) => {
  const scaleData = {
    microscopic: {
      label: 'Microscopic Fibrin Network',
      barLabel: '10 µm',
      barWidth: 'w-24',
      magnification: '2,800×',
      domain: 'Cellular Microstructure (Fibrin, RBCs, Platelets)',
    },
    clot: {
      label: 'Thrombus Architecture',
      barLabel: '2 mm',
      barWidth: 'w-28',
      magnification: '25×',
      domain: 'Saddle / Lobar Clot Cast & Residual Channels',
    },
    vessel: {
      label: 'Pulmonary Artery Branch',
      barLabel: '5 mm',
      barWidth: 'w-32',
      magnification: '8×',
      domain: 'Vascular Lumen & Bifurcation Hemodynamics',
    },
    thoracic: {
      label: 'Thoracic Organ Scale',
      barLabel: '10 cm',
      barWidth: 'w-36',
      magnification: '1×',
      domain: 'Whole Lungs, Trachea & Pulmonary Arterial Tree',
    },
    industrialCutaway: {
      label: 'Industrial CAD Cutaway',
      barLabel: '1 mm',
      barWidth: 'w-28',
      magnification: '40×',
      domain: 'Full Conduit Cutaway & Ciliated Brush Border (Sketch A)',
    },
  }[currentScale];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-6 pt-20 pb-36 select-none">
      {/* Top Left Scale Info */}
      <div className="flex flex-col gap-1 max-w-sm">
        <div
          className={`flex items-center gap-2 text-xs font-mono font-semibold ${
            isDarkTheme ? 'text-[#e6b65c]' : 'text-[#b08d46]'
          }`}
        >
          <span className="uppercase tracking-widest">{scaleData.label}</span>
          <span className={isDarkTheme ? 'text-[#555861]' : 'text-slate-400'}>·</span>
          <span>{scaleData.magnification}</span>
        </div>
        <p
          className={`text-[11px] leading-tight ${
            isDarkTheme ? 'text-[#8a8f9d]' : 'text-slate-600'
          }`}
        >
          {scaleData.domain}
        </p>
      </div>

      {/* Bottom Right Physical Scale Bar */}
      <div className="self-end flex flex-col items-end gap-1.5">
        <div
          className={`flex items-center justify-between text-[11px] font-mono w-full ${
            isDarkTheme ? 'text-[#c5c9d3]' : 'text-slate-700'
          }`}
        >
          <span>0</span>
          <span>{scaleData.barLabel}</span>
        </div>
        <div
          className={`h-1 ${
            isDarkTheme ? 'bg-[#e6b65c]' : 'bg-[#b08d46]'
          } ${scaleData.barWidth} relative flex justify-between`}
        >
          <div
            className={`w-[1px] h-2 -top-0.5 relative ${
              isDarkTheme ? 'bg-[#e6b65c]' : 'bg-[#b08d46]'
            }`}
          />
          <div
            className={`w-[1px] h-2 -top-0.5 relative ${
              isDarkTheme ? 'bg-[#e6b65c]' : 'bg-[#b08d46]'
            }`}
          />
        </div>
        <span
          className={`text-[10px] font-mono ${
            isDarkTheme ? 'text-[#6c7280]' : 'text-slate-400'
          }`}
        >
          Physically Calibrated Unit Dimension
        </span>
      </div>
    </div>
  );
};
