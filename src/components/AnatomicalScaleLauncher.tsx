/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ScaleLevel } from '../types/biomedical.ts';

interface AnatomicalScaleLauncherProps {
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  isDarkTheme: boolean;
  variant?: 'inline' | 'popover';
  onAfterSelect?: () => void;
}

interface PrimaryTileItem {
  id: ScaleLevel;
  label: string;
  metric: string;
  title: string;
  renderIcon: (sizePx: number, active: boolean, dark: boolean) => React.ReactNode;
}

const iconInk = (active: boolean, dark: boolean) =>
  active ? '#141514' : dark ? '#FAF7EC' : '#141514';

/**
 * Locked MVP Presentation Views: Artery, Thrombus, Fibrin & Vascular CAD Cutaway.
 */
const PRIMARY_SCALE_TILES: PrimaryTileItem[] = [
  {
    id: 'vessel',
    label: 'Artery',
    metric: '8 mm',
    title: 'Pulmonary Artery Cutaway (8 mm scale)',
    renderIcon: (size, active, dark) => {
      const ink = iconInk(active, dark);
      return (
        <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true">
          <path
            d="M20 33V19M20 19L10 10M20 19L30 10"
            stroke={ink}
            strokeWidth="4.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M20 33V19M20 19L10 10M20 19L30 10"
            stroke={active ? '#F5D547' : dark ? '#F5D547' : '#FAF7EC'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle
            cx="20"
            cy="19"
            r="3.4"
            fill={active ? '#141514' : '#D9534F'}
            stroke={ink}
            strokeWidth="1.4"
          />
        </svg>
      );
    },
  },
  {
    id: 'clot',
    label: 'Thrombus',
    metric: '4 mm',
    title: 'Impacted Thrombus Body (4 mm scale)',
    renderIcon: (size, active, dark) => {
      const ink = iconInk(active, dark);
      return (
        <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true">
          <rect
            x="5"
            y="10"
            width="30"
            height="20"
            rx="10"
            fill={active ? '#FAF7EC' : dark ? '#242620' : '#F2EDE0'}
            stroke={ink}
            strokeWidth="2"
          />
          <ellipse
            cx="20"
            cy="20"
            rx="7.5"
            ry="5.8"
            fill={active ? '#141514' : '#C82828'}
            stroke={ink}
            strokeWidth="1.5"
          />
          <path
            d="M16 18.5c2 1 6 1 8 0M16 21.8c2-1 6-1 8 0"
            stroke={active ? '#F5D547' : '#FAF7EC'}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    },
  },
  {
    id: 'microscopic',
    label: 'Fibrin',
    metric: '50 µm',
    title: 'Microscopic Fibrin Matrix (50 µm scale)',
    renderIcon: (size, active, dark) => {
      const ink = iconInk(active, dark);
      return (
        <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="15.5"
            fill={active ? '#FAF7EC' : dark ? '#242620' : '#F2EDE0'}
            stroke={ink}
            strokeWidth="2"
          />
          <path
            d="M9 15L31 25M12 29L28 11M10 22L30 18"
            stroke={ink}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="15" cy="17" r="2.6" fill={active ? '#141514' : '#D9534F'} />
          <circle cx="25" cy="23" r="2.6" fill={active ? '#141514' : '#D9534F'} />
          <circle
            cx="22"
            cy="14"
            r="1.9"
            fill={active ? '#141514' : dark ? '#F5D547' : '#141514'}
          />
        </svg>
      );
    },
  },
  {
    id: 'industrialCutaway',
    label: 'Cutaway',
    metric: 'CAD',
    title: 'Isolated Artery CAD Cutaway View',
    renderIcon: (size, active, dark) => {
      const ink = iconInk(active, dark);
      return (
        <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true">
          <rect
            x="6"
            y="8"
            width="28"
            height="24"
            rx="5"
            fill={active ? '#141514' : dark ? '#242620' : '#141514'}
            stroke={ink}
            strokeWidth="2"
          />
          <line x1="6" y1="15" x2="34" y2="15" stroke="#F5D547" strokeWidth="1.5" />
          <text
            x="20"
            y="26.5"
            textAnchor="middle"
            fill="#F5D547"
            fontSize="10.5"
            fontWeight="700"
            fontFamily="IBM Plex Mono, monospace"
          >
            3D
          </text>
        </svg>
      );
    },
  },
];

export const AnatomicalScaleLauncher: React.FC<AnatomicalScaleLauncherProps> = ({
  currentScale,
  onSelectScale,
  isDarkTheme,
  variant = 'inline',
  onAfterSelect,
}) => {
  const isPopover = variant === 'popover';
  const iconSize = isPopover ? 40 : 34;

  const containerClasses = isDarkTheme
    ? 'rounded-xl border border-[#2C2E28] overflow-hidden bg-[#191A17]'
    : 'rounded-xl border border-[#141514]/25 overflow-hidden bg-[#FAF7EC]';

  const activeTileClasses =
    'bg-[#F5D547] border border-[#141514] text-[#141514] font-bold';

  const idleTileClasses = isDarkTheme
    ? 'border border-transparent text-[#ECE9DF] hover:bg-[#242621] hover:border-[#34362F]'
    : 'border border-transparent text-[#141514] hover:bg-[#F2EDE0] hover:border-[#141514]/25';

  return (
    <div className={containerClasses}>
      <div className={isPopover ? 'p-3' : 'p-2.5'}>
        <div className={`grid grid-cols-2 ${isPopover ? 'gap-2.5' : 'gap-2'}`}>
          {PRIMARY_SCALE_TILES.map((tile) => {
            const isActive = currentScale === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                title={tile.title}
                aria-pressed={isActive}
                onClick={() => {
                  onSelectScale(tile.id);
                  onAfterSelect?.();
                }}
                className={`min-h-[82px] flex flex-col items-center justify-center rounded-lg transition-colors duration-150 cursor-pointer ${
                  isPopover ? 'py-3 px-2.5 gap-1.5' : 'py-2.5 px-2 gap-1.5'
                } ${isActive ? activeTileClasses : idleTileClasses}`}
              >
                <div className="flex items-center justify-center shrink-0">
                  {tile.renderIcon(iconSize, isActive, isDarkTheme)}
                </div>
                <span
                  className={`tracking-tight leading-tight text-center whitespace-nowrap truncate max-w-full ${
                    isPopover ? 'text-[13px]' : 'text-xs'
                  } ${isActive ? 'font-bold' : 'font-semibold'}`}
                >
                  {tile.label}
                </span>
                <span
                  className={`font-mono tabular-nums leading-none whitespace-nowrap ${
                    isPopover ? 'text-[11px]' : 'text-[10px]'
                  } ${
                    isActive
                      ? 'text-[#141514] font-semibold'
                      : isDarkTheme
                      ? 'text-[#B7B5AA]'
                      : 'text-[#555650]'
                  }`}
                >
                  {tile.metric}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
