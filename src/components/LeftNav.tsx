/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Glasses,
  RotateCcw,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Menu,
  X,
} from 'lucide-react';
import { ScaleLevel } from '../types/biomedical.ts';
import { AnatomicalScaleLauncher } from './AnatomicalScaleLauncher.tsx';

export interface LeftNavProps {
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  onResetCamera: () => void;
  onToggleXR: () => void;
  isXRSupported: boolean;
  isXRSessionActive?: boolean;
  isWebXRPanelOpen?: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const BrandEmblem: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M16 3L27 7.5V16C27 22.8 22.1 27.6 16 29.5C9.9 27.6 5 22.8 5 16V7.5L16 3Z" />
    <path d="M16 9.5L17.9 13.7L22.5 14.2L19 17.3L20 21.8L16 19.4L12 21.8L13 17.3L9.5 14.2L14.1 13.7L16 9.5Z" />
  </svg>
);

export const LeftNav: React.FC<LeftNavProps> = ({
  currentScale,
  onSelectScale,
  onResetCamera,
  onToggleXR,
  isXRSupported,
  isXRSessionActive = false,
  isWebXRPanelOpen = false,
  isDarkTheme,
  onToggleTheme,
  onCollapsedChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isScaleLauncherOpen, setIsScaleLauncherOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapsedChange?.(next);
  };

  useEffect(() => {
    if (!isScaleLauncherOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsScaleLauncherOpen(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-scale-launcher-trigger="true"]')) {
        return;
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        setIsScaleLauncherOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isScaleLauncherOpen]);

  return (
    <>
      {/* Mobile Compact Floating Trigger (keeps 3D canvas unobstructed on <768px screens) */}
      <div className="fixed top-3 left-3 z-30 flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open Anatomical Scale Menu"
          className={`min-h-[44px] px-3.5 rounded-lg border text-xs font-bold tracking-[0.06em] uppercase flex items-center gap-2 transition-colors ${
            isDarkTheme
              ? 'bg-[#141513] border-[#34362F] text-[#FAF7EC] hover:bg-[#1E201C]'
              : 'bg-[#FAF7EC] border-[#141514] text-[#141514] hover:bg-[#F2EDE0]'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span>Scale</span>
        </button>

        <button
          type="button"
          onClick={onToggleXR}
          aria-label="Open WebAR and WebXR Controls"
          className={`min-h-[44px] px-3.5 rounded-lg border text-xs font-bold tracking-[0.06em] uppercase flex items-center gap-1.5 transition-colors ${
            isXRSessionActive
              ? 'bg-[#C82828] text-white border-[#141514]'
              : isWebXRPanelOpen
              ? 'bg-[#141514] text-[#F5D547] border-[#F5D547]'
              : 'bg-[#F5D547] text-[#141514] border-[#141514] hover:bg-[#EBC834]'
          }`}
        >
          <Glasses className="w-4 h-4" />
          <span>{isXRSessionActive ? 'VR Live' : 'WebAR'}</span>
        </button>
      </div>

      {/* Mobile Scrim */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-[#141514]/55 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Primary Editorial Sidebar Rail (Desktop collapsible rail + Mobile slide-in drawer) */}
      <nav
        aria-label="Anatomical Scale Navigation"
        className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col border-r select-none transition-transform md:transition-all duration-200 ${
          isMobileOpen ? 'translate-x-0 w-[284px]' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[68px]' : 'md:w-[276px]'} ${
          isDarkTheme
            ? 'bg-[#141513] border-[#2C2E28] text-[#FAF7EC]'
            : 'bg-[#FAF7EC] border-[#141514]/25 text-[#141514]'
        }`}
      >
        {/* 1. Signature Editorial Yellow Brand Header Band */}
        <div
          className={`px-3.5 py-3.5 border-b flex items-center justify-between shrink-0 transition-colors ${
            isDarkTheme
              ? 'bg-[#1A1B18] border-[#2C2E28] text-[#FAF7EC]'
              : 'bg-[#F5D547] border-[#141514]/25 text-[#141514]'
          }`}
        >
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                  isDarkTheme
                    ? 'bg-[#F5D547] border-[#F5D547] text-[#141514]'
                    : 'bg-[#F5D547] border-[#141514] text-[#141514]'
                }`}
              >
                <BrandEmblem className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-[9px] font-bold tracking-[0.22em] uppercase leading-none ${
                    isDarkTheme ? 'text-[#F5D547]' : 'text-[#141514]/80'
                  }`}
                >
                  THE ATLAS
                </span>
                <span className="font-display text-[17px] font-bold tracking-tight truncate leading-tight mt-0.5">
                  Anatomical <em className="italic font-semibold">Scale</em>
                </span>
              </div>
            </div>
          )}

          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            aria-label={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
            className={`hidden md:inline-flex min-w-[38px] min-h-[38px] items-center justify-center rounded-lg border transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            } ${
              isDarkTheme
                ? 'border-[#31332D] hover:bg-[#252721] text-[#FAF7EC]'
                : 'border-[#141514]/25 hover:bg-[#141514]/10 text-[#141514]'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close Navigation"
            className={`md:hidden min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border transition-colors ${
              isDarkTheme
                ? 'border-[#31332D] hover:bg-[#252721] text-[#FAF7EC]'
                : 'border-[#141514]/25 hover:bg-[#141514]/10 text-[#141514]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Primary Focus: Anatomical Scale at the Very Top */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3">
          {!isCollapsed || isMobileOpen ? (
            <div className="space-y-2.5">
              <div className="px-0.5 flex items-center justify-between gap-2">
                <span
                  className={`text-[10px] font-bold tracking-[0.18em] uppercase ${
                    isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#444540]'
                  }`}
                >
                  ANATOMICAL SCALE
                </span>
                <button
                  type="button"
                  data-scale-launcher-trigger="true"
                  onClick={() => setIsScaleLauncherOpen((prev) => !prev)}
                  title="Open expanded 3-column Anatomical Scale launcher"
                  className={`inline-flex items-center gap-1.5 px-2.5 min-h-[30px] rounded-lg text-[11px] font-bold tracking-[0.04em] border transition-colors whitespace-nowrap shrink-0 ${
                    isScaleLauncherOpen
                      ? 'bg-[#141514] text-[#F5D547] border-[#F5D547]'
                      : isDarkTheme
                      ? 'border-[#32342D] text-[#FAF7EC] hover:bg-[#20221D]'
                      : 'border-[#141514]/30 text-[#141514] bg-white/70 hover:bg-[#F5D547]/40'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{isScaleLauncherOpen ? 'Close' : 'Expand'}</span>
                </button>
              </div>

              <AnatomicalScaleLauncher
                currentScale={currentScale}
                onSelectScale={(scale) => {
                  onSelectScale(scale);
                  setIsMobileOpen(false);
                }}
                isDarkTheme={isDarkTheme}
                variant="inline"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                data-scale-launcher-trigger="true"
                onClick={() => setIsScaleLauncherOpen((prev) => !prev)}
                title="Open Anatomical Scale Launcher"
                aria-label="Open Anatomical Scale Launcher"
                className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors ${
                  isScaleLauncherOpen
                    ? 'bg-[#F5D547] text-[#141514] border-[#141514]'
                    : isDarkTheme
                    ? 'bg-[#1C1E1A] text-[#FAF7EC] border-[#31332D] hover:bg-[#252721]'
                    : 'bg-[#F2EDE0] text-[#141514] border-[#141514]/30 hover:bg-[#F5D547]/50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Single Editorial Utility Dock (Reset, Theme, WebAR/VR) */}
        <div
          className={`p-2.5 border-t shrink-0 flex ${
            isCollapsed && !isMobileOpen ? 'flex-col items-center gap-2' : 'items-center gap-1.5'
          } ${
            isDarkTheme
              ? 'border-[#2C2E28] bg-[#181916]'
              : 'border-[#141514]/20 bg-[#F2EDE0]'
          }`}
        >
          <button
            type="button"
            onClick={onResetCamera}
            title="Reset 3D View (R)"
            aria-label="Reset 3D View"
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition-colors ${
              isDarkTheme
                ? 'hover:bg-[#242621] text-[#FAF7EC] border-[#31332D] bg-[#141513]'
                : 'hover:bg-[#E7E1CF] text-[#141514] border-[#141514]/25 bg-[#FAF7EC]'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title={isDarkTheme ? 'Switch to Light Mode (T)' : 'Switch to Dark Mode (T)'}
            aria-label={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`min-h-[40px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isCollapsed && !isMobileOpen ? 'w-10 px-0' : ''
            } ${
              isDarkTheme
                ? 'hover:bg-[#242621] text-[#FAF7EC] border-[#31332D] bg-[#141513]'
                : 'hover:bg-[#E7E1CF] text-[#141514] border-[#141514]/25 bg-[#FAF7EC]'
            }`}
          >
            {isDarkTheme ? (
              <Sun className="w-4 h-4 text-[#F5D547] shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-[#141514] shrink-0" />
            )}
            {(!isCollapsed || isMobileOpen) && <span>{isDarkTheme ? 'Light' : 'Dark'}</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleXR();
              setIsMobileOpen(false);
            }}
            title={
              isXRSessionActive
                ? 'WebXR Session Active — Manage or Exit VR'
                : isXRSupported
                ? 'Enter WebAR / VR Session'
                : 'Open WebAR / WebXR Controls'
            }
            className={`min-h-[40px] flex items-center justify-center gap-1.5 px-3 text-xs font-bold tracking-[0.04em] rounded-lg transition-colors whitespace-nowrap border ${
              isCollapsed && !isMobileOpen ? 'w-10 px-0' : 'flex-1'
            } ${
              isXRSessionActive
                ? 'bg-[#C82828] text-white border-[#141514] hover:bg-[#B22222]'
                : isWebXRPanelOpen
                ? 'bg-[#141514] text-[#F5D547] border-[#F5D547]'
                : 'bg-[#F5D547] text-[#141514] border-[#141514] hover:bg-[#EBC834]'
            }`}
          >
            <Glasses className="w-4 h-4 shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span>{isXRSessionActive ? 'VR Live' : isXRSupported ? 'Enter VR' : 'WebAR'}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Expanded 3-Column Anatomical Scale Popover */}
      {isScaleLauncherOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Anatomical Scale Launcher"
          className={`fixed z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-xl border shadow-2xl overflow-hidden ${
            isCollapsed ? 'left-3 md:left-[80px] top-16 md:top-3' : 'left-3 md:left-[288px] top-16 md:top-3'
          } ${
            isDarkTheme
              ? 'bg-[#141513] border-[#F5D547]/50 text-[#FAF7EC] shadow-black/80'
              : 'bg-[#FAF7EC] border-[#141514] text-[#141514] shadow-black/15'
          }`}
        >
          <div
            className={`px-4 py-3 border-b flex items-center justify-between ${
              isDarkTheme
                ? 'border-[#2C2E28] bg-[#1A1B18]'
                : 'border-[#141514]/25 bg-[#F5D547]'
            }`}
          >
            <div>
              <div
                className={`text-[9px] font-bold tracking-[0.2em] uppercase ${
                  isDarkTheme ? 'text-[#F5D547]' : 'text-[#141514]/80'
                }`}
              >
                SPATIAL DEPTH
              </div>
              <div className="font-display text-base font-bold leading-tight mt-0.5">
                Anatomical <em className="italic font-semibold">Views</em>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScaleLauncherOpen(false)}
              title="Close Anatomical Scale Launcher"
              aria-label="Close Anatomical Scale Launcher"
              className={`min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border transition-colors ${
                isDarkTheme
                  ? 'border-[#31332D] hover:bg-[#252721] text-[#FAF7EC]'
                  : 'border-[#141514]/25 hover:bg-[#141514]/10 text-[#141514]'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnatomicalScaleLauncher
            currentScale={currentScale}
            onSelectScale={onSelectScale}
            isDarkTheme={isDarkTheme}
            variant="popover"
            onAfterSelect={() => setIsScaleLauncherOpen(false)}
          />
        </div>
      )}
    </>
  );
};
