/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScaleLevel } from '../types/biomedical.ts';

interface MicroscopyOverlayProps {
  currentScale: ScaleLevel;
  stageName: string;
}

export const MicroscopyOverlay: React.FC<MicroscopyOverlayProps> = ({ currentScale, stageName }) => {
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
  }[currentScale];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-6 pt-20 pb-28 select-none">
      {/* Top Left Scale Info */}
      <div className="flex flex-col gap-1 max-w-sm">
        <div className="flex items-center gap-2 text-xs font-mono text-[#e6b65c]">
          <span className="uppercase tracking-widest">{scaleData.label}</span>
          <span className="text-[#555861]">·</span>
          <span>{scaleData.magnification}</span>
        </div>
        <p className="text-[11px] text-[#8a8f9d] leading-tight">
          {scaleData.domain}
        </p>
      </div>

      {/* Bottom Right Physical Scale Bar */}
      <div className="self-end flex flex-col items-end gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#c5c9d3] w-full">
          <span>0</span>
          <span>{scaleData.barLabel}</span>
        </div>
        <div className={`h-1 bg-[#e6b65c] ${scaleData.barWidth} relative flex justify-between`}>
          <div className="w-[1px] h-2 bg-[#e6b65c] -top-0.5 relative" />
          <div className="w-[1px] h-2 bg-[#e6b65c] -top-0.5 relative" />
        </div>
        <span className="text-[10px] text-[#6c7280] font-mono">
          Physically Calibrated Unit Dimension
        </span>
      </div>
    </div>
  );
};
