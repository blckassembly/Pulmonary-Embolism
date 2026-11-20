/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Glasses,
  X,
  ShieldAlert,
  Hand,
  Gamepad2,
  RotateCcw,
  Compass,
  RefreshCw,
  Move,
  MousePointerClick,
  AlertTriangle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Navigation,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Aperture,
} from 'lucide-react';
import { DesktopInteractionMode, XRDiagnosticsState } from '../types/webxr.ts';

interface WebXRPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: XRDiagnosticsState | null;
  desktopInteractionMode: DesktopInteractionMode;
  onDesktopModeChange: (mode: DesktopInteractionMode) => void;
  zoomMultiplier: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  dofFocusRangeUm: number;
  onDOFFocusRangeChange: (rangeUm: number) => void;
  onEnterVR: () => void;
  onEnterMR: () => void;
  onExitVR: () => void;
  onToggleQuestEmulator: () => void;
  onTeleportIntoThorax: () => void;
  onResetLocomotion: () => void;
  onResetScene: () => void;
  onRecenterSeated: () => void;
  onRefreshSupport: () => void;
  mountVRButton: (el: HTMLElement) => (() => void) | undefined;
  isDarkTheme: boolean;
  isSidebarCollapsed?: boolean;
}

export const WebXRPanel: React.FC<WebXRPanelProps> = ({
  isOpen,
  onClose,
  diagnostics,
  desktopInteractionMode,
  onDesktopModeChange,
  zoomMultiplier,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  dofFocusRangeUm,
  onDOFFocusRangeChange,
  onEnterVR,
  onEnterMR,
  onExitVR,
  onToggleQuestEmulator,
  onTeleportIntoThorax,
  onResetLocomotion,
  onResetScene,
  onRecenterSeated,
  onRefreshSupport,
  mountVRButton,
  isDarkTheme,
  isSidebarCollapsed = false,
}) => {
  const vrButtonContainerRef = useRef<HTMLDivElement>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const isEmulatorActive = diagnostics?.isEmulatorActive === true;
  const runtimeMode = diagnostics?.runtimeMode ?? 'none';

  // Re-mount Three.js VRButton whenever emulator or WebXR runtime mode changes so button updates live
  useEffect(() => {
    if (!isOpen || !vrButtonContainerRef.current) return;
    const cleanup = mountVRButton(vrButtonContainerRef.current);
    return () => {
      cleanup?.();
    };
  }, [isOpen, mountVRButton, isEmulatorActive, runtimeMode]);

  const isPresenting = diagnostics?.isPresenting === true;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPresenting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isPresenting, onClose]);

  if (!isOpen) return null;

  const isSupported = diagnostics?.isImmersiveVRSupported === true;
  const isMRSupported = diagnostics?.isMixedRealitySupported === true;
  const isSecure = diagnostics?.isSecureContext ?? false;

  const statusTextColor = (status: string | boolean | null | undefined) => {
    if (
      status === true ||
      status === 'active' ||
      status === 'available' ||
      status === 'tracked' ||
      status === 'native' ||
      status === 'iwer-quest3'
    ) {
      return isDarkTheme ? 'text-[#86EFAC]' : 'text-[#15803D]';
    }
    if (status === 'awaiting-input' || status === 'emulated' || status === null) {
      return isDarkTheme ? 'text-[#F5D547]' : 'text-[#9A6700]';
    }
    return isDarkTheme ? 'text-[#FDA4AF]' : 'text-[#B91C1C]';
  };

  const formatStatusLabel = (status: string | boolean | null | undefined) => {
    if (status === true) return '● Ready';
    if (status === false) return '✕ Off';
    if (status === 'iwer-quest3') return '● Quest 3 Sim';
    if (status === 'native') return '● Native XR';
    if (status === 'active' || status === 'tracked') return '● Active';
    if (status === 'available') return '● Available';
    if (status === 'emulated') return '▲ Emulated';
    if (status === 'awaiting-input') return '▲ Waiting';
    if (status === 'unsupported') return '✕ Unsupported';
    if (status === 'unavailable') return '✕ Unavailable';
    return '— Unknown';
  };

  const locoPos = diagnostics?.locomotionPosition ?? [0, 0, 0];
  const mutedText = isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#4E5049]';
  const dividerClass = isDarkTheme ? 'border-[#2C2E28]' : 'border-[#141514]/15';
  const secondaryBtn = isDarkTheme
    ? 'bg-[#1B1C19] border-[#32342D] text-[#FAF7EC] hover:bg-[#252721]'
    : 'bg-[#FAF7EC] border-[#141514]/30 text-[#141514] hover:bg-[#F2EDE0]';

  return (
    <aside
      role="dialog"
      aria-label="WebAR, Meta Quest XR and Locomotion"
      className={`fixed top-3 bottom-3 left-3 right-3 md:right-auto md:w-[408px] z-40 rounded-xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isSidebarCollapsed ? 'md:left-[84px]' : 'md:left-[292px]'
      } ${
        isDarkTheme
          ? 'bg-[#141513] border-[#31332D] text-[#FAF7EC] shadow-black/80'
          : 'bg-[#FAF7EC] border-[#141514] text-[#141514] shadow-black/15'
      }`}
    >
      {/* Editorial Header Band */}
      <div
        className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDarkTheme
            ? 'border-[#2C2E28] bg-[#1A1B18]'
            : 'border-[#141514]/25 bg-[#F5D547]'
        }`}
      >
        <div className="min-w-0">
          <div
            className={`text-[9px] font-bold tracking-[0.2em] uppercase ${
              isDarkTheme ? 'text-[#F5D547]' : 'text-[#141514]/80'
            }`}
          >
            SPATIAL &amp; IMMERSIVE
          </div>
          <h2 className="font-display text-lg font-bold tracking-tight truncate leading-tight mt-0.5">
            WebXR &amp; <em className="italic font-semibold">Meta Quest</em>
          </h2>
          <div
            className={`flex items-center gap-2 text-xs mt-0.5 ${
              isDarkTheme ? 'text-[#B7B5AA]' : 'text-[#141514]/80'
            }`}
          >
            <span className="font-medium">
              {isPresenting
                ? diagnostics?.sessionMode === 'immersive-ar'
                  ? '● Mixed Reality Active'
                  : '● Immersive VR Active'
                : '○ Standby'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{isEmulatorActive ? 'Quest 3 Sim' : 'WebXR'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onRefreshSupport}
            title="Refresh WebXR Support"
            aria-label="Refresh WebXR Support"
            className={`w-10 h-10 inline-flex items-center justify-center rounded-lg border transition-colors ${
              isDarkTheme
                ? 'border-[#31332D] hover:bg-[#252721] text-[#FAF7EC]'
                : 'border-[#141514]/25 hover:bg-[#141514]/10 text-[#141514]'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close Panel (Esc)"
            aria-label="Close WebXR Panel"
            className={`w-10 h-10 inline-flex items-center justify-center rounded-lg border transition-colors ${
              isDarkTheme
                ? 'border-[#31332D] hover:bg-[#252721] text-[#FAF7EC]'
                : 'border-[#141514]/25 hover:bg-[#141514]/10 text-[#141514]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clean Hairline-Separated Sections (Single Elevation) */}
      <div
        className={`flex-1 overflow-y-auto divide-y ${
          isDarkTheme ? 'divide-[#2C2E28]' : 'divide-[#141514]/15'
        }`}
      >
        {/* 1. Runtime Readiness & Session Launch */}
        <section className="p-5 space-y-3.5">
          {!isSecure && !isEmulatorActive ? (
            <div
              className={`p-3 rounded-lg border flex gap-2.5 items-start ${
                isDarkTheme
                  ? 'bg-[#2A1515] border-[#7F1D1D] text-[#FECACA]'
                  : 'bg-[#FEF2F2] border-[#141514] text-[#7F1D1D]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Physical headsets require HTTPS. Enable the Meta Quest 3 Simulator below to preview VR locomotion on desktop.
              </p>
            </div>
          ) : !isSupported ? (
            <div
              className={`p-3 rounded-lg border flex gap-2.5 items-start ${
                isDarkTheme
                  ? 'bg-[#222015] border-[#F5D547]/40 text-[#FAF7EC]'
                  : 'bg-[#F2EDE0] border-[#141514]/30 text-[#141514]'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-[#B45309] dark:text-[#F5D547] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                No physical headset detected. Turn on the Quest 3 Simulator to test VR teleportation, hand tracking, and Mixed Reality.
              </p>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 text-xs font-semibold ${
                isDarkTheme ? 'text-[#86EFAC]' : 'text-[#15803D]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {isEmulatorActive
                  ? 'Meta Quest 3 Simulator ready for VR, AR & Hand Tracking'
                  : 'Headset WebXR runtime detected and ready'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleQuestEmulator}
            className={`w-full min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold tracking-[0.04em] border transition-colors flex items-center justify-center gap-2 ${
              isEmulatorActive
                ? isDarkTheme
                  ? 'bg-[#F5D547] border-[#F5D547] text-[#141514] hover:bg-[#EBC834]'
                  : 'bg-[#141514] border-[#141514] text-[#F5D547] hover:bg-[#2A2B28]'
                : secondaryBtn
            }`}
          >
            <Cpu className="w-4 h-4 shrink-0" />
            <span>
              {isEmulatorActive ? 'Disable Quest 3 Simulator' : 'Enable Meta Quest 3 Simulator'}
            </span>
          </button>

          {/* Official Three.js VRButton mount slot */}
          <div ref={vrButtonContainerRef} className="w-full" />

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={isPresenting ? onExitVR : onEnterVR}
              disabled={!isSupported && !isPresenting}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-bold tracking-[0.04em] border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                isPresenting
                  ? 'bg-[#C82828] border-[#141514] text-white hover:bg-[#B22222]'
                  : isSupported
                  ? 'bg-[#F5D547] border-[#141514] text-[#141514] hover:bg-[#EBC834]'
                  : 'opacity-40 cursor-not-allowed border-current/25'
              }`}
            >
              <Glasses className="w-4 h-4 shrink-0" />
              <span>{isPresenting ? 'Exit Session' : 'Launch VR'}</span>
            </button>

            <button
              type="button"
              onClick={onEnterMR}
              disabled={(!isMRSupported && !isEmulatorActive) || isPresenting}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                (isMRSupported || isEmulatorActive) && !isPresenting
                  ? secondaryBtn
                  : 'opacity-40 cursor-not-allowed border-current/25'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Mixed Reality</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onResetScene}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${secondaryBtn}`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Scene</span>
            </button>

            <button
              type="button"
              onClick={onRecenterSeated}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${secondaryBtn}`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Recenter Rig</span>
            </button>
          </div>
        </section>

        {/* 2. VR Teleportation Locomotion & Optical Zoom */}
        <section className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase">
              VR LOCOMOTION &amp; ZOOM
            </h3>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                isDarkTheme ? 'text-[#F5D547]' : 'text-[#141514]'
              }`}
            >
              {zoomMultiplier.toFixed(2)}×
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onZoomOut}
              className={`min-h-[40px] px-2.5 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 whitespace-nowrap ${secondaryBtn}`}
            >
              <ZoomOut className="w-3.5 h-3.5 shrink-0" />
              <span>Zoom Out</span>
            </button>
            <button
              type="button"
              onClick={onResetZoom}
              className={`min-h-[40px] px-2.5 py-2 rounded-lg text-xs font-mono font-semibold border tabular-nums ${secondaryBtn}`}
            >
              1.00×
            </button>
            <button
              type="button"
              onClick={onZoomIn}
              className={`min-h-[40px] px-2.5 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 whitespace-nowrap ${secondaryBtn}`}
            >
              <ZoomIn className="w-3.5 h-3.5 shrink-0" />
              <span>Zoom In</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onTeleportIntoThorax}
              className="min-h-[40px] px-3 py-2 rounded-lg text-xs font-bold border border-[#141514] bg-[#F5D547] text-[#141514] hover:bg-[#EBC834] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" />
              <span>Step Into Artery</span>
            </button>
            <button
              type="button"
              onClick={onResetLocomotion}
              className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 whitespace-nowrap ${secondaryBtn}`}
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Rig</span>
            </button>
          </div>

          <div className={`text-xs space-y-1.5 pt-1 ${mutedText}`}>
            <div className="flex justify-between gap-3">
              <span>Active Zone</span>
              <span className={`font-semibold truncate ${isDarkTheme ? 'text-[#FAF7EC]' : 'text-[#141514]'}`}>
                {diagnostics?.locomotionTargetLabel || 'Seated Observation'}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Rig Coordinates (m)</span>
              <span className={`font-mono tabular-nums ${isDarkTheme ? 'text-[#FAF7EC]' : 'text-[#141514]'}`}>
                {locoPos[0].toFixed(2)}, {locoPos[1].toFixed(2)}, {locoPos[2].toFixed(2)}
              </span>
            </div>
            <p className="text-xs leading-relaxed pt-1">
              Quest controls: Hold Grip or Left Stick ↑ to aim parabolic teleport · Left Stick ←/→ for 30° snap turn · Right Stick ↑/↓ to zoom.
            </p>
          </div>
        </section>

        {/* 3. Desktop Pointer Mode */}
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold tracking-[0.18em] uppercase">POINTER MODE</h3>
            <span className={`text-xs font-mono ${mutedText}`}>
              {diagnostics?.activeInteractionSource || desktopInteractionMode}
            </span>
          </div>

          <div
            className={`grid grid-cols-2 gap-1 p-1 rounded-lg border ${
              isDarkTheme
                ? 'bg-[#191A17] border-[#2C2E28]'
                : 'bg-[#F2EDE0] border-[#141514]/20'
            }`}
          >
            <button
              type="button"
              onClick={() => onDesktopModeChange('orbit')}
              className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                desktopInteractionMode === 'orbit'
                  ? isDarkTheme
                    ? 'bg-[#F5D547] text-[#141514] font-bold'
                    : 'bg-[#141514] text-[#FAF7EC] font-bold'
                  : mutedText
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5 shrink-0" />
              <span>Orbit + Inspect</span>
            </button>
            <button
              type="button"
              onClick={() => onDesktopModeChange('manipulate')}
              className={`min-h-[38px] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                desktopInteractionMode === 'manipulate'
                  ? isDarkTheme
                    ? 'bg-[#F5D547] text-[#141514] font-bold'
                    : 'bg-[#141514] text-[#FAF7EC] font-bold'
                  : mutedText
              }`}
            >
              <Move className="w-3.5 h-3.5 shrink-0" />
              <span>Grab Specimen</span>
            </button>
          </div>
        </section>

        {/* 4. Optical Depth-of-Field (DOF) Focus Range for Fibrin Microstructure Clarity */}
        <section className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="vr-dof-focus-range"
              className="text-[10px] font-bold tracking-[0.18em] uppercase flex items-center gap-1.5"
            >
              <Aperture className="w-3.5 h-3.5 shrink-0" />
              <span>DOF FOCUS RANGE</span>
            </label>
            <span
              className={`text-xs font-mono font-semibold tabular-nums ${
                dofFocusRangeUm < 49.5
                  ? isDarkTheme
                    ? 'text-[#F5D547]'
                    : 'text-[#141514]'
                  : mutedText
              }`}
            >
              {dofFocusRangeUm >= 49.5 ? '50 µm · Deep' : `${dofFocusRangeUm.toFixed(0)} µm Slice`}
            </span>
          </div>

          <div className="space-y-1.5">
            <input
              id="vr-dof-focus-range"
              type="range"
              min={5}
              max={50}
              step={1}
              value={dofFocusRangeUm}
              onChange={(e) => onDOFFocusRangeChange(Number(e.target.value))}
              aria-label="Depth-of-field focus range in micrometers"
              className={`w-full h-2 rounded-lg cursor-pointer ${
                isDarkTheme
                  ? 'bg-[#252721] accent-[#F5D547]'
                  : 'bg-[#E5DFCD] accent-[#141514]'
              }`}
            />
            <div className={`flex items-center justify-between font-mono text-[10px] tabular-nums ${mutedText}`}>
              <span>5 µm Macro</span>
              <span>25 µm Slice</span>
              <span>50 µm Deep</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Shallow', value: 12 },
              { label: 'Fibrin', value: 24 },
              { label: 'Deep', value: 50 },
            ].map((preset) => {
              const isSelected = Math.abs(dofFocusRangeUm - preset.value) <= 1;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onDOFFocusRangeChange(preset.value)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? isDarkTheme
                        ? 'bg-[#F5D547] border-[#F5D547] text-[#141514] font-bold'
                        : 'bg-[#141514] border-[#141514] text-[#FAF7EC] font-bold'
                      : secondaryBtn
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <p className={`text-xs leading-relaxed ${mutedText}`}>
            Auto-locks the focal plane onto the active fibrin depth to sharpen cross-linked strands. Stereo HMD sessions bypass post-DOF to preserve headset frame rate.
          </p>
        </section>

        {/* 5. Collapsible XR & RATK Technical Diagnostics */}
        <section className="p-5">
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            aria-expanded={showDiagnostics}
            className="w-full min-h-[36px] flex items-center justify-between text-[10px] font-bold tracking-[0.18em] uppercase"
          >
            <span>XR RUNTIME &amp; RATK DIAGNOSTICS</span>
            {showDiagnostics ? (
              <ChevronUp className={`w-4 h-4 ${mutedText}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${mutedText}`} />
            )}
          </button>

          {showDiagnostics && (
            <div className="mt-3.5 space-y-4 text-xs">
              {/* Zero-Pill Specification Table */}
              <dl
                className={`divide-y border-t border-b ${dividerClass} ${
                  isDarkTheme ? 'divide-[#2C2E28]' : 'divide-[#141514]/15'
                }`}
              >
                <div className="py-2 flex items-center justify-between">
                  <dt className={mutedText}>Runtime</dt>
                  <dd className={`font-mono font-medium ${statusTextColor(diagnostics?.runtimeMode)}`}>
                    {formatStatusLabel(diagnostics?.runtimeMode)}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className={mutedText}>Secure Context (HTTPS)</dt>
                  <dd className={`font-mono font-medium ${statusTextColor(isSecure)}`}>
                    {isSecure ? '● Verified' : '✕ Insecure'}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className={mutedText}>immersive-vr</dt>
                  <dd className={`font-mono font-medium ${statusTextColor(diagnostics?.features.immersiveVr)}`}>
                    {formatStatusLabel(diagnostics?.features.immersiveVr)}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className={mutedText}>Hand Tracking</dt>
                  <dd className={`font-mono font-medium ${statusTextColor(diagnostics?.features.handTracking)}`}>
                    {formatStatusLabel(diagnostics?.features.handTracking)}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <dt className={mutedText}>RATK Planes / Meshes</dt>
                  <dd className="font-mono tabular-nums">
                    {diagnostics?.ratkPlanesCount ?? 0} planes / {diagnostics?.ratkMeshesCount ?? 0} meshes
                  </dd>
                </div>
              </dl>

              {diagnostics?.lastError && (
                <div className="p-3 rounded-lg bg-[#C82828]/10 border border-[#C82828]/40 text-[#B91C1C] dark:text-[#FDA4AF] font-mono break-words">
                  {diagnostics.lastError}
                </div>
              )}

              {/* Connected Input Sources */}
              <div className="space-y-2">
                <div className={`font-semibold ${mutedText}`}>
                  Active Input Sources ({diagnostics?.inputSources.length || 0})
                </div>
                {!diagnostics?.inputSources.length ? (
                  <p className={mutedText}>
                    No active XR controllers or tracked hands connected yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {diagnostics.inputSources.map((src) => (
                      <li
                        key={src.id}
                        className={`py-2 border-t flex items-center justify-between gap-2 font-mono ${dividerClass}`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          {src.hasHand ? (
                            <Hand className="w-3.5 h-3.5 text-[#F5D547] shrink-0" />
                          ) : (
                            <Gamepad2 className="w-3.5 h-3.5 text-current shrink-0" />
                          )}
                          <span>
                            {src.handedness} {src.kind}
                          </span>
                        </span>
                        <span className={statusTextColor(src.trackingState)}>
                          {formatStatusLabel(src.trackingState)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Event Log */}
              <div className="space-y-1.5">
                <div className={`font-semibold ${mutedText}`}>Recent Session Events</div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {(diagnostics?.events || []).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-1.5 leading-snug">
                      <span className={mutedText}>{ev.timestamp}</span>
                      <span
                        className={
                          ev.level === 'error'
                            ? 'text-[#DC2626] dark:text-[#FDA4AF]'
                            : ev.level === 'warn'
                            ? 'text-[#B45309] dark:text-[#F5D547]'
                            : 'text-[#141514] dark:text-[#FAF7EC]'
                        }
                      >
                        [{ev.source}]
                      </span>
                      <span className="break-words">{ev.message}</span>
                    </div>
                  ))}
                  {!diagnostics?.events.length && (
                    <div className={mutedText}>Awaiting XR lifecycle events...</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
