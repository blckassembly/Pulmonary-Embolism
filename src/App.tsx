/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SceneManager } from './core/scene/SceneManager.ts';
import {
  ScaleLevel,
  ClotAnnotation,
  AnnotationScreenPosition,
  ExplorerAnatomyId,
} from './types/biomedical.ts';
import { DesktopInteractionMode, XRDiagnosticsState } from './types/webxr.ts';
import { CLOT_ANNOTATIONS } from './data/clotAnnotations.ts';
import { EXPLORER_ANATOMY_STRUCTURES } from './data/explorerAnatomyData.ts';
import { LeftNav } from './components/LeftNav.tsx';
import { ProvenanceModal } from './components/ProvenanceModal.tsx';
import { ClotAnnotationOverlay } from './components/ClotAnnotationOverlay.tsx';
import { ExplainViewPanel } from './components/ExplainViewPanel.tsx';
import { ClotPathControlBar } from './components/ClotPathControlBar.tsx';
import { WebXRPanel } from './components/WebXRPanel.tsx';
import { PatientClinicalContextCard } from './components/PatientClinicalContextCard.tsx';
import { XdcNetworkModal } from './components/XdcNetworkModal.tsx';
import { EnthalpyXdcSearchWindow } from './components/EnthalpyXdcSearchWindow.tsx';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Core Disease POV State
  const [currentScale, setCurrentScale] = useState<ScaleLevel>('thoracic');
  const [progress, setProgress] = useState(0.85);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [isXdcOpen, setIsXdcOpen] = useState(false);
  const [isBlockchainSearchOpen, setIsBlockchainSearchOpen] = useState(false);

  // Disease Focus Areas, Clot Path & You.com Cited Explainer
  const [selectedStructureId, setSelectedStructureId] = useState<ExplorerAnatomyId>('pulmonaryArtery');
  const [isExplainPanelOpen, setIsExplainPanelOpen] = useState(true);
  const [isClotPathActive, setIsClotPathActive] = useState(true);
  const [isPatientContextOpen, setIsPatientContextOpen] = useState(false);
  const [clotPathProgress, setClotPathProgress] = useState(0.85);
  const [isClotPathPlaying, setIsClotPathPlaying] = useState(false);
  const [clotPathSpeed, setClotPathSpeed] = useState(0.08);

  // 3D Hotspot Annotations (shown cleanly at vessel/clot/microscopic scales)
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [activeAnnotation, setActiveAnnotation] = useState<ClotAnnotation | null>(null);
  const [annotationPositions, setAnnotationPositions] = useState<Record<string, AnnotationScreenPosition>>({});

  // WebXR State & Diagnostics
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [isXRPresenting, setIsXRPresenting] = useState(false);
  const [isWebXRPanelOpen, setIsWebXRPanelOpen] = useState(false);
  const [xrDiagnostics, setXrDiagnostics] = useState<XRDiagnosticsState | null>(null);
  const [desktopInteractionMode, setDesktopInteractionMode] = useState<DesktopInteractionMode>('orbit');

  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new SceneManager(mountRef.current, {
      onProgressChange: (p) => {
        setProgress(p);
        if (p > 0.72) setCurrentScale('thoracic');
        else if (p > 0.48) setCurrentScale('vessel');
        else if (p > 0.22) setCurrentScale('clot');
        else setCurrentScale('microscopic');
      },
      onScaleChange: (scale) => {
        setCurrentScale(scale);
      },
      onSelectAnnotation: (ann) => {
        setActiveAnnotation(ann);
      },
      onSelectStructureFromScene: (structId) => {
        setSelectedStructureId(structId);
      },
      onAnnotationPositionsUpdate: (positions) => {
        setAnnotationPositions(positions);
      },
      onClotPathProgressChange: (p) => {
        setClotPathProgress(p);
        if (p >= 1.0) {
          setIsClotPathPlaying(false);
        }
      },
      onXRDiagnosticsChange: (diag) => {
        setXrDiagnostics(diag);
        setIsXRSupported(diag.isImmersiveVRSupported === true);
      },
      onXRSessionStateChange: (presenting) => {
        setIsXRPresenting(presenting);
      },
    });
    sceneManagerRef.current = manager;
    setXrDiagnostics(manager.webXR.getDiagnostics());

    // Launch directly in the Thoracic Pulmonary Embolism Disease POV
    manager.setTheme('light');
    manager.setProgress(0.85);
    manager.highlightExplorerStructure('pulmonaryArtery', false);
    manager.setClotPathProgress(0.85);

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
    setCurrentScale(scale);
    let p = 0.08;
    if (scale === 'clot') p = 0.35;
    else if (scale === 'vessel') p = 0.62;
    else if (scale === 'thoracic') p = 0.92;

    setProgress(p);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setScale(scale);
      sceneManagerRef.current.setProgress(p);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = !isDarkTheme;
    setIsDarkTheme(nextTheme);
    sceneManagerRef.current?.setTheme(nextTheme ? 'dark' : 'light');
  };

  const handleSelectExplorerStructure = (id: ExplorerAnatomyId) => {
    setSelectedStructureId(id);
    sceneManagerRef.current?.highlightExplorerStructure(id);
    const struct = EXPLORER_ANATOMY_STRUCTURES[id];
    if (struct) {
      setClotPathProgress(struct.clotPathCheckpoint);
      sceneManagerRef.current?.setClotPathProgress(struct.clotPathCheckpoint);
    }
    setIsExplainPanelOpen(true);
  };

  const handleToggleClotPathPlay = () => {
    if (isClotPathPlaying) {
      sceneManagerRef.current?.pauseClotPathAnimation();
      setIsClotPathPlaying(false);
    } else {
      if (clotPathProgress >= 0.99) {
        setClotPathProgress(0.0);
        sceneManagerRef.current?.setClotPathProgress(0.0);
      }
      sceneManagerRef.current?.playClotPathAnimation();
      setIsClotPathPlaying(true);
    }
  };

  const handleSeekClotPath = (p: number) => {
    setClotPathProgress(p);
    sceneManagerRef.current?.setClotPathProgress(p);
  };

  const handleResetClotPath = () => {
    sceneManagerRef.current?.resetClotPathAnimation();
    setClotPathProgress(0.0);
    setIsClotPathPlaying(false);
  };

  const handleToggleClotPathSpeed = () => {
    const nextSpeed = clotPathSpeed < 0.08 ? 0.08 : 0.04;
    setClotPathSpeed(nextSpeed);
    sceneManagerRef.current?.setClotPathSpeed(nextSpeed);
  };

  const handleSelectAnnotation = (ann: ClotAnnotation | null) => {
    setActiveAnnotation(ann);
    sceneManagerRef.current?.selectAnnotation(ann ? ann.id : null);
  };

  const handleFocusAnnotation = (id: string) => {
    sceneManagerRef.current?.focusAnnotation(id);
  };

  const handleToggleAnnotationsLayer = () => {
    const next = !showAnnotations;
    setShowAnnotations(next);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setLayers({
        thoracicLungs: true,
        pulmonaryArteries: true,
        tracheaAirway: true,
        vesselWall: true,
        thrombusBody: true,
        fibrinMesh: true,
        redBloodCells: true,
        platelets: true,
        flowStreamlines: true,
        velocityColorMap: true,
        annotations: next,
      });
    }
  };

  const handleResetCamera = () => {
    sceneManagerRef.current?.resetScene();
  };

  const handleDesktopModeChange = (mode: DesktopInteractionMode) => {
    setDesktopInteractionMode(mode);
    sceneManagerRef.current?.setDesktopInteractionMode(mode);
  };

  const handleEnterVR = async () => {
    await sceneManagerRef.current?.webXR.enterVR();
  };

  const handleExitVR = async () => {
    await sceneManagerRef.current?.webXR.exitVR();
  };

  const handleMountVRButton = useCallback((el: HTMLElement) => {
    return sceneManagerRef.current?.webXR.mountVRButton(el);
  }, []);

  // Minimal keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleClotPathPlay();
      } else if (e.key.toLowerCase() === 'r') {
        handleResetCamera();
      } else if (e.key.toLowerCase() === 't') {
        handleToggleTheme();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isClotPathPlaying, clotPathProgress, isDarkTheme]);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-300 ${
        isDarkTheme ? 'bg-[#080808] text-white' : 'bg-[#ebedf2] text-slate-900'
      }`}
    >
      {/* Full-Bleed 3D Disease Model Canvas */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Focused Left Navigation */}
      <LeftNav
        currentScale={currentScale}
        onSelectScale={handleSelectScale}
        selectedStructureId={selectedStructureId}
        onSelectStructure={handleSelectExplorerStructure}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        onResetCamera={handleResetCamera}
        onToggleXR={() => setIsWebXRPanelOpen((prev) => !prev)}
        isXRSupported={isXRSupported}
        isXRSessionActive={isXRPresenting}
        isWebXRPanelOpen={isWebXRPanelOpen}
        isDarkTheme={isDarkTheme}
        onToggleTheme={handleToggleTheme}
        onToggleExplainPanel={() => setIsExplainPanelOpen((p) => !p)}
        isExplainPanelOpen={isExplainPanelOpen}
        onToggleClotPath={() => setIsClotPathActive((p) => !p)}
        isClotPathActive={isClotPathActive}
        onTogglePatientContext={() => setIsPatientContextOpen((p) => !p)}
        isPatientContextOpen={isPatientContextOpen}
        onOpenBlockchainSearch={() => setIsBlockchainSearchOpen(true)}
        isBlockchainSearchOpen={isBlockchainSearchOpen}
        onOpenXdcNetwork={() => setIsXdcOpen(true)}
      />

      {/* Anatomical Clot Hotspots (visible cleanly when inspecting clot/vessel detail) */}
      {currentScale !== 'thoracic' && (
        <ClotAnnotationOverlay
          annotations={CLOT_ANNOTATIONS}
          activeAnnotation={activeAnnotation}
          onSelectAnnotation={handleSelectAnnotation}
          onFocusAnnotation={handleFocusAnnotation}
          positions={annotationPositions}
          isDarkTheme={isDarkTheme}
          currentScale={currentScale}
          isLayerVisible={showAnnotations}
          onToggleLayer={handleToggleAnnotationsLayer}
        />
      )}

      {/* Disease POV Explainer (Dedicated You.com Source-Agnostic Learning + D3 Clot Path Hemodynamics) */}
      <ExplainViewPanel
        selectedStructureId={selectedStructureId}
        onSelectStructure={handleSelectExplorerStructure}
        clotPathProgress={clotPathProgress}
        onSeekClotPath={handleSeekClotPath}
        isOpen={isExplainPanelOpen}
        onClose={() => setIsExplainPanelOpen(false)}
        onOpenBlockchainSearch={() => setIsBlockchainSearchOpen(true)}
        isDarkTheme={isDarkTheme}
      />

      {/* Clot Path Trajectory Guide (DVT -> Heart -> Pulmonary Artery -> Lungs) */}
      {isClotPathActive && (
        <ClotPathControlBar
          isPlaying={isClotPathPlaying}
          onTogglePlay={handleToggleClotPathPlay}
          progress={clotPathProgress}
          onSeekProgress={handleSeekClotPath}
          onReset={handleResetClotPath}
          speed={clotPathSpeed}
          onToggleSpeed={handleToggleClotPathSpeed}
          selectedStructureId={selectedStructureId}
          onSelectStructure={handleSelectExplorerStructure}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* Persistent, Non-Intrusive Hypothetical Patient Clinical Context Card */}
      <PatientClinicalContextCard
        isOpen={isPatientContextOpen}
        onClose={() => setIsPatientContextOpen(false)}
        clotPathProgress={clotPathProgress}
        isDarkTheme={isDarkTheme}
        hasTopHotspotsBar={currentScale !== 'thoracic' && showAnnotations}
      />

      {/* Scientific Data Provenance & Illustrative Disclosure */}
      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
      />

      {/* XDC Network JSON-RPC & Provenance Verification */}
      <XdcNetworkModal
        isOpen={isXdcOpen}
        onClose={() => setIsXdcOpen(false)}
        selectedStructureId={selectedStructureId}
        clotPathProgress={clotPathProgress}
        isDarkTheme={isDarkTheme}
      />

      {/* Separate ENTHALPY x XDC Blockchain Research Search Window */}
      <EnthalpyXdcSearchWindow
        isOpen={isBlockchainSearchOpen}
        onClose={() => setIsBlockchainSearchOpen(false)}
        selectedStructureId={selectedStructureId}
        onSelectStructure={handleSelectExplorerStructure}
        clotPathProgress={clotPathProgress}
        onSeekClotPath={handleSeekClotPath}
        isDarkTheme={isDarkTheme}
      />

      {/* Optional WebXR Spatial & Diagnostics Panel */}
      <WebXRPanel
        isOpen={isWebXRPanelOpen}
        onClose={() => setIsWebXRPanelOpen(false)}
        diagnostics={xrDiagnostics}
        desktopInteractionMode={desktopInteractionMode}
        onDesktopModeChange={handleDesktopModeChange}
        onEnterVR={handleEnterVR}
        onExitVR={handleExitVR}
        onResetScene={handleResetCamera}
        onRecenterSeated={() => sceneManagerRef.current?.webXR.recenterSeatedSpecimen()}
        onRefreshSupport={() => {
          void sceneManagerRef.current?.webXR.checkXRSupport();
        }}
        mountVRButton={handleMountVRButton}
        isDarkTheme={isDarkTheme}
      />
    </div>
  );
}
