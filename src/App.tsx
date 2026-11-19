/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X } from 'lucide-react';
import { SceneManager } from './core/scene/SceneManager.ts';
import { ScaleLevel } from './types/biomedical.ts';
import { DesktopInteractionMode, XRDiagnosticsState } from './types/webxr.ts';
import { SceneHoverLabelState } from './data/anatomicalHoverLabels.ts';
import { LeftNav } from './components/LeftNav.tsx';
import { WebXRPanel } from './components/WebXRPanel.tsx';
import { SceneHoverLabel } from './components/SceneHoverLabel.tsx';
import { ZoomControlsBar } from './components/ZoomControlsBar.tsx';

const SCALE_STAGE_LABELS: Record<
  ScaleLevel,
  { eyebrow: string; titleLead: string; titleItalic: string; dimension: string }
> = {
  thoracic: {
    eyebrow: 'THORACIC SCALE',
    titleLead: 'Thoracic System',
    titleItalic: 'Overview',
    dimension: '30 cm',
  },
  vessel: {
    eyebrow: 'ARTERIAL SCALE',
    titleLead: 'Pulmonary Artery',
    titleItalic: 'Cutaway',
    dimension: '8 mm',
  },
  clot: {
    eyebrow: 'OCCLUSION SCALE',
    titleLead: 'Impacted Thrombus',
    titleItalic: 'Body',
    dimension: '4 mm',
  },
  microscopic: {
    eyebrow: 'CELLULAR SCALE',
    titleLead: 'Fibrin & Cellular',
    titleItalic: 'Matrix',
    dimension: '50 µm',
  },
  industrialCutaway: {
    eyebrow: 'ISOLATED SECTION',
    titleLead: 'Artery CAD',
    titleItalic: 'Cutaway',
    dimension: 'CAD 3D',
  },
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Core Anatomical Scale & Appearance State (Locked MVP: Artery, Thrombus, Fibrin, Cutaway)
  const [currentScale, setCurrentScale] = useState<ScaleLevel>('vessel');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoverLabel, setHoverLabel] = useState<SceneHoverLabelState | null>(null);
  const [zoomMultiplier, setZoomMultiplier] = useState(1.0);
  const [isWebGLContextLost, setIsWebGLContextLost] = useState(false);

  // WebAR / WebXR State
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [isXRPresenting, setIsXRPresenting] = useState(false);
  const [isWebXRPanelOpen, setIsWebXRPanelOpen] = useState(false);
  const [xrDiagnostics, setXrDiagnostics] = useState<XRDiagnosticsState | null>(null);
  const [desktopInteractionMode, setDesktopInteractionMode] = useState<DesktopInteractionMode>('orbit');

  // Keep <html> .dark class in sync with active theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkTheme);
  }, [isDarkTheme]);

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new SceneManager(mountRef.current, {
      onProgressChange: (p) => {
        if (p > 0.64) setCurrentScale('vessel');
        else if (p > 0.32) setCurrentScale('clot');
        else setCurrentScale('microscopic');
      },
      onScaleChange: (scale) => {
        setCurrentScale(scale === 'thoracic' ? 'vessel' : scale);
      },
      onZoomChange: (zoom) => {
        setZoomMultiplier(zoom);
      },
      onHoverStructureLabel: (label) => {
        setHoverLabel(label);
      },
      onXRDiagnosticsChange: (diag) => {
        setXrDiagnostics(diag);
        setIsXRSupported(diag.isImmersiveVRSupported === true);
      },
      onXRSessionStateChange: (presenting) => {
        setIsXRPresenting(presenting);
        if (presenting) setHoverLabel(null);
      },
      onWebGLContextChange: (lost) => {
        setIsWebGLContextLost(lost);
      },
    });
    sceneManagerRef.current = manager;
    setXrDiagnostics(manager.webXR.getDiagnostics());

    // Launch directly into the Pulmonary Artery Cutaway in clean light mode
    manager.setTheme('light');
    manager.setScale('vessel');

    const handleResize = () => {
      if (!mountRef.current) return;
      manager.resize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleSelectScale = (scale: ScaleLevel) => {
    const next = scale === 'thoracic' ? 'vessel' : scale;
    setCurrentScale(next);
    sceneManagerRef.current?.setScale(next);
  };

  const handleToggleTheme = () => {
    const nextTheme = !isDarkTheme;
    setIsDarkTheme(nextTheme);
    sceneManagerRef.current?.setTheme(nextTheme ? 'dark' : 'light');
  };

  const handleResetCamera = () => {
    sceneManagerRef.current?.resetScene();
    sceneManagerRef.current?.resetZoom();
  };

  const handleZoomIn = () => {
    sceneManagerRef.current?.zoomIn(1.25);
  };

  const handleZoomOut = () => {
    sceneManagerRef.current?.zoomOut(1.25);
  };

  const handleResetZoom = () => {
    sceneManagerRef.current?.resetZoom();
  };

  const handleDesktopModeChange = (mode: DesktopInteractionMode) => {
    setDesktopInteractionMode(mode);
    sceneManagerRef.current?.setDesktopInteractionMode(mode);
  };

  const handleEnterVR = async () => {
    await sceneManagerRef.current?.webXR.enterVR('immersive-vr');
  };

  const handleEnterMR = async () => {
    await sceneManagerRef.current?.webXR.enterVR('immersive-ar');
  };

  const handleExitVR = useCallback(async () => {
    await sceneManagerRef.current?.webXR.exitVR();
  }, []);

  const handleExitVRAndSim = useCallback(async () => {
    await sceneManagerRef.current?.webXR.exitVRAndDisableEmulator();
  }, []);

  const handleToggleQuestEmulator = async () => {
    await sceneManagerRef.current?.webXR.toggleMetaQuestEmulator();
  };

  const handleTeleportIntoThorax = () => {
    sceneManagerRef.current?.teleportIntoThoracicAnatomy();
  };

  const handleResetLocomotion = () => {
    sceneManagerRef.current?.resetVRLocomotion();
  };

  const handleMountVRButton = useCallback((el: HTMLElement) => {
    return sceneManagerRef.current?.webXR.mountVRButton(el);
  }, []);

  // Capture-phase Escape key exits live VR simulation immediately on laptops (even over IWER DevUI)
  useEffect(() => {
    if (!isXRPresenting) return;
    const onEscapeVR = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        void handleExitVR();
      }
    };
    window.addEventListener('keydown', onEscapeVR, true);
    return () => window.removeEventListener('keydown', onEscapeVR, true);
  }, [isXRPresenting, handleExitVR]);

  // Production keyboard shortcuts: R (Reset), T (Theme), +/= (Zoom in), -/_ (Zoom out), 0 (Reset zoom)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'r') {
        handleResetCamera();
      } else if (e.key.toLowerCase() === 't') {
        handleToggleTheme();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDarkTheme]);

  const activeScaleMeta = SCALE_STAGE_LABELS[currentScale];
  const isEmulatorActive = xrDiagnostics?.isEmulatorActive === true;

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-300 ${
        isDarkTheme ? 'bg-[#0E0F0D] text-[#FAF7EC]' : 'bg-[#EEECE2] text-[#141514]'
      }`}
    >
      {/* Full-Bleed 3D Anatomical Scale Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* WebGL Context Lost Fallback Notice */}
      {isWebGLContextLost && (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#141514]/85 text-[#FAF7EC]"
        >
          <div className="max-w-sm rounded-xl border border-[#F5D547] bg-[#141513] p-6 text-center space-y-3">
            <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#F5D547]">
              VIEWPORT NOTICE
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">
              3D Context <em className="italic">Paused</em>
            </h2>
            <p className="text-xs text-[#C6C3B8] leading-relaxed">
              The browser suspended the WebGL viewport to conserve memory. Reload or restore the tab to resume the 3D anatomical view.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg text-xs font-bold tracking-[0.06em] uppercase bg-[#F5D547] text-[#141514] border border-[#141514] hover:bg-[#EBC834]"
            >
              Reload Viewport
            </button>
          </div>
        </div>
      )}

      {/* Editorial Top-Left Clinical Scale Context Readout (Zero-Pill Unboxed Typography) */}
      {!isXRPresenting && !isWebXRPanelOpen && (
        <div
          aria-hidden="true"
          className={`hidden md:flex fixed top-5 z-10 pointer-events-none flex-col gap-0.5 transition-all duration-200 ${
            isSidebarCollapsed ? 'left-[88px]' : 'left-[296px]'
          } ${
            isDarkTheme || currentScale === 'industrialCutaway'
              ? 'text-[#FAF7EC]'
              : 'text-[#141514]'
          }`}
        >
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
            <span
              className={
                isDarkTheme || currentScale === 'industrialCutaway'
                  ? 'text-[#F5D547]'
                  : 'text-[#141514]'
              }
            >
              {activeScaleMeta.eyebrow}
            </span>
            <span className="opacity-35">/</span>
            <span className="font-mono font-semibold tracking-normal tabular-nums opacity-80">
              {activeScaleMeta.dimension}
            </span>
          </div>
          <div className="font-display text-[22px] font-bold leading-tight tracking-tight">
            {activeScaleMeta.titleLead}{' '}
            <em className="italic font-semibold">{activeScaleMeta.titleItalic}</em>
          </div>
        </div>
      )}

      {/* Quiet Bottom-Left Gesture Guide */}
      {!isXRPresenting && !isWebXRPanelOpen && (
        <div
          aria-hidden="true"
          className={`hidden lg:flex fixed bottom-5 z-10 pointer-events-none items-center gap-2 text-xs transition-all duration-200 ${
            isSidebarCollapsed ? 'left-[88px]' : 'left-[296px]'
          } ${
            isDarkTheme || currentScale === 'industrialCutaway'
              ? 'text-[#B7B5AA]'
              : 'text-[#444540]'
          }`}
        >
          <span>Drag to orbit</span>
          <span className="opacity-40">·</span>
          <span>Scroll or + / − to zoom</span>
          <span className="opacity-40">·</span>
          <span>Hover anatomy for clinical details</span>
        </div>
      )}

      {/* Floating 3D Clinical Hover Labels */}
      <SceneHoverLabel
        hoverState={isXRPresenting ? null : hoverLabel}
        isDarkTheme={isDarkTheme}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Production Navigation: Artery, Thrombus, Fibrin, Cutaway + Reset, Theme, WebAR/VR */}
      <LeftNav
        currentScale={currentScale}
        onSelectScale={handleSelectScale}
        onResetCamera={handleResetCamera}
        onToggleXR={() => setIsWebXRPanelOpen((prev) => !prev)}
        isXRSupported={isXRSupported}
        isXRSessionActive={isXRPresenting}
        isWebXRPanelOpen={isWebXRPanelOpen}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      {/* Minimal Optical Zoom & Reset Bar */}
      <ZoomControlsBar
        zoom={zoomMultiplier}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onResetView={handleResetCamera}
        isDarkTheme={isDarkTheme}
      />

      {/* Optional WebXR / Meta Quest Spatial & Locomotion Drawer */}
      <WebXRPanel
        isOpen={isWebXRPanelOpen}
        onClose={() => setIsWebXRPanelOpen(false)}
        diagnostics={xrDiagnostics}
        desktopInteractionMode={desktopInteractionMode}
        onDesktopModeChange={handleDesktopModeChange}
        zoomMultiplier={zoomMultiplier}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onEnterVR={handleEnterVR}
        onEnterMR={handleEnterMR}
        onExitVR={handleExitVR}
        onToggleQuestEmulator={handleToggleQuestEmulator}
        onTeleportIntoThorax={handleTeleportIntoThorax}
        onResetLocomotion={handleResetLocomotion}
        onResetScene={handleResetCamera}
        onRecenterSeated={() => sceneManagerRef.current?.webXR.recenterSeatedSpecimen()}
        onRefreshSupport={() => {
          void sceneManagerRef.current?.webXR.checkXRSupport();
        }}
        mountVRButton={handleMountVRButton}
        isDarkTheme={isDarkTheme}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      {/* Always-on-Top VR Simulation Escape Bar (Portaled to body above IWER / WebXR overlays for laptop users) */}
      {(isXRPresenting || isEmulatorActive) &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="region"
            aria-label="Exit VR Simulation Controls"
            style={{ zIndex: 2147483647 }}
            className="fixed top-4 right-4 flex items-center gap-2 pointer-events-auto font-sans select-none"
          >
            {isXRPresenting && (
              <button
                type="button"
                onClick={() => void handleExitVR()}
                title="Leave VR Simulation (Esc)"
                className="min-h-[44px] px-4 py-2 rounded-lg bg-[#F5D547] hover:bg-[#EBC834] active:bg-[#DFB922] text-[#141514] border-2 border-[#141514] shadow-xl text-xs font-bold tracking-[0.06em] uppercase flex items-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Exit VR</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[#141514] text-[#F5D547] font-mono text-[10px] font-semibold leading-none">
                  ESC
                </kbd>
              </button>
            )}

            {isEmulatorActive && (
              <button
                type="button"
                onClick={() => void handleExitVRAndSim()}
                title="Exit VR session and close Meta Quest 3 Simulator"
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#141514] hover:bg-[#252721] text-[#FAF7EC] border-2 border-[#F5D547] shadow-xl text-xs font-bold tracking-[0.06em] uppercase flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4 shrink-0 text-[#F5D547]" />
                <span>{isXRPresenting ? 'Exit VR & Sim' : 'Close Quest Sim'}</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
