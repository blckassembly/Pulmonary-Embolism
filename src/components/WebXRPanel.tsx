/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import {
  Glasses,
  X,
  ShieldCheck,
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
  Radio,
} from 'lucide-react';
import { DesktopInteractionMode, XRDiagnosticsState } from '../types/webxr.ts';

interface WebXRPanelProps {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: XRDiagnosticsState | null;
  desktopInteractionMode: DesktopInteractionMode;
  onDesktopModeChange: (mode: DesktopInteractionMode) => void;
  onEnterVR: () => void;
  onExitVR: () => void;
  onResetScene: () => void;
  onRecenterSeated: () => void;
  onRefreshSupport: () => void;
  mountVRButton: (el: HTMLElement) => (() => void) | undefined;
  isDarkTheme: boolean;
}

export const WebXRPanel: React.FC<WebXRPanelProps> = ({
  isOpen,
  onClose,
  diagnostics,
  desktopInteractionMode,
  onDesktopModeChange,
  onEnterVR,
  onExitVR,
  onResetScene,
  onRecenterSeated,
  onRefreshSupport,
  mountVRButton,
  isDarkTheme,
}) => {
  const vrButtonContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !vrButtonContainerRef.current) return;
    const cleanup = mountVRButton(vrButtonContainerRef.current);
    return () => {
      cleanup?.();
    };
  }, [isOpen, mountVRButton]);

  if (!isOpen) return null;

  const isSupported = diagnostics?.isImmersiveVRSupported === true;
  const isPresenting = diagnostics?.isPresenting === true;
  const isSecure = diagnostics?.isSecureContext ?? false;

  const badgeTone = (status: string | boolean | null | undefined) => {
    if (status === true || status === 'active' || status === 'available' || status === 'tracked') {
      return isDarkTheme
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (status === 'awaiting-input' || status === 'emulated' || status === null) {
      return isDarkTheme
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : 'bg-amber-50 text-amber-800 border-amber-300';
    }
    return isDarkTheme
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : 'bg-rose-50 text-rose-800 border-rose-300';
  };

  return (
    <aside
      className={`fixed top-3 bottom-3 left-[268px] z-40 w-[420px] max-w-[calc(100vw-280px)] rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden transition-colors ${
        isDarkTheme
          ? 'bg-[#0b0c10]/95 border-[#252730] text-slate-100 shadow-black/80'
          : 'bg-white/95 border-slate-300 text-slate-900 shadow-slate-400/30'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 py-3.5 border-b flex items-center justify-between shrink-0 ${
          isDarkTheme ? 'border-[#1e2028] bg-[#101117]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-[#e6b65c]/15 border border-[#e6b65c]/40 text-[#e6b65c]">
            <Glasses className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-wide uppercase truncate">
              WebXR Spatial & Diagnostics
            </h2>
            <p className="text-xs font-mono text-slate-400 truncate">
              Seated VR · Hand Tracking · Controller Fallback
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRefreshSupport}
            title="Re-run WebXR Feature Detection"
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkTheme ? 'hover:bg-neutral-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close WebXR Panel"
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkTheme ? 'hover:bg-neutral-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* 1. Graceful Fallback / HTTPS Notice */}
        {!isSecure ? (
          <div
            className={`p-3.5 rounded-xl border flex gap-2.5 items-start ${
              isDarkTheme
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm">HTTPS Required for WebXR</div>
              <p className="text-xs leading-relaxed opacity-90">
                Current protocol is <span className="font-mono">{diagnostics?.protocol}</span>. Desktop 3D remains active,
                but browsers disable <span className="font-mono">navigator.xr</span> outside HTTPS or{' '}
                <span className="font-mono">localhost</span>. Deploy over HTTPS or use an HTTPS tunnel for physical headset testing.
              </p>
            </div>
          </div>
        ) : !isSupported ? (
          <div
            className={`p-3.5 rounded-xl border flex gap-2.5 items-start ${
              isDarkTheme
                ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm">Graceful Desktop Fallback Active</div>
              <p className="text-xs leading-relaxed opacity-90">
                {diagnostics?.supportCheckError ||
                  'No active immersive-vr headset or WebXR emulator detected in this browser. All desktop 3D anatomy controls and shared interaction adapter tools remain fully operational.'}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`p-3 rounded-xl border flex gap-2 items-center ${
              isDarkTheme
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">
              WebXR <span className="font-mono">immersive-vr</span> runtime detected and ready.
            </span>
          </div>
        )}

        {/* 2. Primary VR Session Controls (Three.js VRButton + Direct Controls) */}
        <div
          className={`p-3.5 rounded-xl border space-y-3 ${
            isDarkTheme ? 'bg-[#12141b] border-[#232633]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              VR Session Controls
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-xs font-mono ${badgeTone(isPresenting)}`}
            >
              {isPresenting ? 'SESSION ACTIVE' : 'STANDBY'}
            </span>
          </div>

          {/* Official Three.js VRButton mount slot */}
          <div ref={vrButtonContainerRef} className="w-full" />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={isPresenting ? onExitVR : onEnterVR}
              disabled={!isSupported && !isPresenting}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                isPresenting
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                  : isSupported
                  ? isDarkTheme
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                    : 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                  : 'opacity-45 cursor-not-allowed bg-slate-800/30 border-slate-700/40 text-slate-400'
              }`}
            >
              <Glasses className="w-4 h-4" />
              <span>{isPresenting ? 'Exit VR' : 'Launch Session'}</span>
            </button>

            <button
              onClick={onResetScene}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                isDarkTheme
                  ? 'bg-[#181a24] border-[#2c3040] text-slate-200 hover:bg-[#222533]'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Reset Scene</span>
            </button>
          </div>

          {isPresenting && (
            <button
              onClick={onRecenterSeated}
              className={`w-full px-3 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 ${
                isDarkTheme
                  ? 'bg-[#181a24] border-[#2c3040] text-sky-300 hover:bg-[#222533]'
                  : 'bg-white border-slate-300 text-sky-700 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Recenter Seated Placement</span>
            </button>
          )}
        </div>

        {/* 3. Shared Interaction Adapter Mode (Desktop + XR Parity) */}
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDarkTheme ? 'bg-[#12141b] border-[#232633]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Shared Interaction Adapter
            </span>
            <span className="text-xs font-mono text-sky-400">
              {diagnostics?.activeInteractionSource || desktopInteractionMode}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onDesktopModeChange('orbit')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-all ${
                desktopInteractionMode === 'orbit'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-semibold'
                  : isDarkTheme
                  ? 'bg-[#171923] border-[#272a38] text-slate-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <MousePointerClick className="w-4 h-4" />
              <span>Orbit + Inspect</span>
            </button>
            <button
              onClick={() => onDesktopModeChange('manipulate')}
              className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center justify-center gap-1.5 transition-all ${
                desktopInteractionMode === 'manipulate'
                  ? 'bg-[#e6b65c]/20 border-[#e6b65c] text-[#e6b65c] font-semibold'
                  : isDarkTheme
                  ? 'bg-[#171923] border-[#272a38] text-slate-300'
                  : 'bg-white border-slate-300 text-slate-700'
              }`}
            >
              <Move className="w-4 h-4" />
              <span>Grab Specimen</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-snug">
            Desktop: Drag in <span className="font-semibold">Grab Specimen</span> (or hold Shift+Drag) to rotate/reposition via the same adapter used by VR hand pinch & controllers.
          </p>
        </div>

        {/* 4. Explicit WebXR Diagnostics */}
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDarkTheme ? 'bg-[#12141b] border-[#232633]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              WebXR Live Diagnostics
            </span>
            <span className="text-xs font-mono text-slate-400">
              {diagnostics?.referenceSpaceType || 'none'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">HTTPS</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(isSecure)}`}>
                {isSecure ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">navigator.xr</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(diagnostics?.hasNavigatorXR)}`}>
                {diagnostics?.hasNavigatorXR ? 'OK' : 'NONE'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">immersive-vr</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(diagnostics?.features.immersiveVr)}`}>
                {diagnostics?.features.immersiveVr || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">hand-tracking</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(diagnostics?.features.handTracking)}`}>
                {diagnostics?.features.handTracking || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">local-floor</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(diagnostics?.features.localFloor)}`}>
                {diagnostics?.features.localFloor || 'unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded border border-slate-700/30">
              <span className="text-slate-400">Viewer Pose</span>
              <span className={`px-1.5 py-0.5 rounded border ${badgeTone(diagnostics?.viewerTrackingState)}`}>
                {diagnostics?.viewerTrackingState || 'unavailable'}
              </span>
            </div>
          </div>

          {diagnostics?.lastError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono break-words">
              Error: {diagnostics.lastError}
            </div>
          )}

          {/* Connected Input Sources */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-700/30">
            <div className="text-xs font-mono text-slate-400 uppercase flex items-center justify-between">
              <span>XR Input Sources ({diagnostics?.inputSources.length || 0})</span>
              <span>{diagnostics?.isManipulatingSpecimen ? 'MANIPULATING' : 'IDLE'}</span>
            </div>

            {!diagnostics?.inputSources.length ? (
              <div className="text-xs font-mono text-slate-400 py-2 px-2.5 rounded border border-dashed border-slate-700/40">
                No active XRInputSources (enter VR with hands or controllers connected).
              </div>
            ) : (
              <div className="space-y-1.5">
                {diagnostics.inputSources.map((src) => (
                  <div
                    key={src.id}
                    className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                      isDarkTheme ? 'bg-[#161923] border-[#282c3a]' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold">
                        {src.hasHand ? (
                          <Hand className="w-3.5 h-3.5 text-[#e6b65c]" />
                        ) : (
                          <Gamepad2 className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        [{src.index}] {src.handedness.toUpperCase()} ({src.kind})
                      </span>
                      <span className={`px-1.5 rounded border ${badgeTone(src.trackingState)}`}>
                        {src.trackingState}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>ray: {src.targetRayMode}</span>
                      <span>
                        {src.hasHand
                          ? `joints: ${src.visibleHandJoints}/${src.handJointCount}`
                          : `gamepad: ${src.hasGamepad ? 'yes' : 'no'}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Log */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-700/30">
            <div className="text-xs font-mono text-slate-400 uppercase">Recent XR Events</div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
              {(diagnostics?.events || []).map((ev) => (
                <div
                  key={ev.id}
                  className="text-xs font-mono flex items-start gap-1.5 leading-snug"
                >
                  <span className="text-slate-500 shrink-0">{ev.timestamp}</span>
                  <span
                    className={
                      ev.level === 'error'
                        ? 'text-rose-400'
                        : ev.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-sky-300'
                    }
                  >
                    [{ev.source}]
                  </span>
                  <span className="text-slate-300 break-words">{ev.message}</span>
                </div>
              ))}
              {!diagnostics?.events.length && (
                <div className="text-xs font-mono text-slate-400">Awaiting XR lifecycle events...</div>
              )}
            </div>
          </div>
        </div>

        {/* Physical Device Disclaimer */}
        <div className="text-xs text-slate-400 leading-relaxed flex items-start gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            Reuses existing pulmonary/thoracic embolism geometry & labels. Meta Quest browser & hand tracking compatibility must be verified on a physical headset over HTTPS.
          </span>
        </div>
      </div>
    </aside>
  );
};
