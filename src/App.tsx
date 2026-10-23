/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from './core/scene/SceneManager.ts';
import { DiseaseStage, LayerVisibility, ScaleLevel } from './types/biomedical.ts';
import { HeaderNav } from './components/HeaderNav.tsx';
import { CollapsibleDock } from './components/CollapsibleDock.tsx';
import { ProvenanceModal } from './components/ProvenanceModal.tsx';
import { MicroscopyOverlay } from './components/MicroscopyOverlay.tsx';

const DISEASE_STAGES: DiseaseStage[] = [
  {
    id: 1,
    code: '01',
    name: 'Patent Artery Baseline',
    description: 'Unobstructed pulmonary arterial branch with uniform laminar blood flow and normal mean pulmonary artery pressure (mPAP ~14 mmHg).',
    mPAP: 14,
    vascularResistance: 1.1,
    flowObstructionPct: 0,
    wallShearStressMax: 1.2,
    clotState: 'none',
  },
  {
    id: 2,
    code: '02',
    name: 'Embolus Transit & Arrival',
    description: 'Deep vein thrombosis (DVT) fragment migrates through the inferior vena cava, right atrium, right ventricle, and into the pulmonary arterial trunk.',
    mPAP: 16,
    vascularResistance: 1.3,
    flowObstructionPct: 15,
    wallShearStressMax: 1.6,
    clotState: 'migrating',
  },
  {
    id: 3,
    code: '03',
    name: 'Bifurcation Impaction',
    description: 'The embolus lodges at the bifurcation of the lower lobar artery where luminal caliber narrows, creating sudden mechanical arrest.',
    mPAP: 21,
    vascularResistance: 2.2,
    flowObstructionPct: 45,
    wallShearStressMax: 2.5,
    clotState: 'impacting',
  },
  {
    id: 4,
    code: '04',
    name: 'Partial Obstruction & Jet Shear',
    description: 'Eccentric residual patent channel forces blood into a high-velocity jet (WSS ~3.4 Pa), triggering local endothelial activation and platelet deposition.',
    mPAP: 28,
    vascularResistance: 3.1,
    flowObstructionPct: 65,
    wallShearStressMax: 3.8,
    clotState: 'partial',
  },
  {
    id: 5,
    code: '05',
    name: 'Critical Obstruction & RV Overload',
    description: 'Thrombus expansion and secondary in-situ fibrin accretion occlude 85% of vascular cross-section. mPAP surges to 38 mmHg, inducing acute right ventricular strain.',
    mPAP: 38,
    vascularResistance: 4.6,
    flowObstructionPct: 85,
    wallShearStressMax: 4.5,
    clotState: 'severe',
  },
  {
    id: 6,
    code: '06',
    name: 'Downstream Hypoperfusion & V/Q Mismatch',
    description: 'Post-stenotic flow velocity drops dramatically with extensive recirculation wake, causing severe alveolar dead-space ventilation and systemic arterial hypoxemia.',
    mPAP: 39,
    vascularResistance: 4.8,
    flowObstructionPct: 88,
    wallShearStressMax: 4.3,
    clotState: 'ischemia',
  },
  {
    id: 7,
    code: '07',
    name: 'Thrombolytic Remodeling (tPA Fibrinolysis)',
    description: 'Plasmin enzymatic cleavage severs cross-linked fibrin strands. Mesh porosity increases, widening residual flow channels and relieving upstream vascular pressure.',
    mPAP: 24,
    vascularResistance: 2.4,
    flowObstructionPct: 40,
    wallShearStressMax: 2.8,
    clotState: 'lysing',
  },
  {
    id: 8,
    code: '08',
    name: 'Post-Intervention Resolution',
    description: 'Restoration of arterial patency following endogenous lysis or mechanical thrombectomy. Pulmonary vascular resistance and cardiac output normalize.',
    mPAP: 16,
    vascularResistance: 1.2,
    flowObstructionPct: 8,
    wallShearStressMax: 1.4,
    clotState: 'resolved',
  },
];

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  // Application State
  const [currentScale, setCurrentScale] = useState<ScaleLevel>('microscopic');
  const [currentStageIndex, setCurrentStageIndex] = useState(3); // Start on Stage 04 Partial Obstruction
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);
  const [isXRSupported, setIsXRSupported] = useState(false);

  // Fibrin Micro-Lab State
  const [fiberDensity, setFiberDensity] = useState(1.0);
  const [fiberDiameterUm, setFiberDiameterUm] = useState(0.28);
  const [lyticFraction, setLyticFraction] = useState(0.0);

  // Slicing & Exploded View State
  const [clippingAxis, setClippingAxis] = useState<'none' | 'x' | 'y' | 'z'>('none');
  const [clipDistance, setClipDistance] = useState(0);
  const [explodedOffset, setExplodedOffset] = useState(0);

  // Layers
  const [layers, setLayers] = useState<LayerVisibility>({
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
    annotations: true,
  });

  // Initialize Three.js scene once
  useEffect(() => {
    if (!mountRef.current) return;

    const manager = new SceneManager(mountRef.current);
    sceneManagerRef.current = manager;

    // Detect WebXR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        setIsXRSupported(supported);
      }).catch(() => {});
    }

    // Set initial scale to microscopic (per user clarification preference)
    manager.setScale('microscopic');

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

  // Update Scale
  const handleSelectScale = (scale: ScaleLevel) => {
    setCurrentScale(scale);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setScale(scale);
    }
  };

  // Update Timeline Stage
  const handleSelectStage = (index: number) => {
    setCurrentStageIndex(index);
    const stage = DISEASE_STAGES[index];

    // Synchronize lytic fraction with remodeling stages
    if (stage.clotState === 'lysing') {
      setLyticFraction(0.45);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.microscopicChamber.updateParameters({ lyticFraction: 0.45 });
      }
    } else if (stage.clotState === 'resolved') {
      setLyticFraction(0.85);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.microscopicChamber.updateParameters({ lyticFraction: 0.85 });
      }
    } else {
      setLyticFraction(0.0);
      if (sceneManagerRef.current) {
        sceneManagerRef.current.microscopicChamber.updateParameters({ lyticFraction: 0.0 });
      }
    }
  };

  // Timeline playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStageIndex((prev) => {
        const next = (prev + 1) % DISEASE_STAGES.length;
        handleSelectStage(next);
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Fibrin Lab Handlers
  const handleFiberDensityChange = (density: number) => {
    setFiberDensity(density);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.microscopicChamber.updateParameters({
        nodeCount: Math.round(110 * density),
        meanDiameterUm: fiberDiameterUm,
        lyticFraction,
      });
    }
  };

  const handleFiberDiameterChange = (diam: number) => {
    setFiberDiameterUm(diam);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.microscopicChamber.updateParameters({
        meanDiameterUm: diam,
        lyticFraction,
      });
    }
  };

  const handleLyticFractionChange = (frac: number) => {
    setLyticFraction(frac);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.microscopicChamber.updateParameters({
        lyticFraction: frac,
      });
    }
  };

  // Layer Visibility
  const handleToggleLayer = (key: keyof LayerVisibility) => {
    const updated = { ...layers, [key]: !layers[key] };
    setLayers(updated);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setLayers(updated);
    }
  };

  // Slicing & Clipping Handlers
  const handleClippingAxisChange = (axis: 'none' | 'x' | 'y' | 'z') => {
    setClippingAxis(axis);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setClipping(axis, clipDistance, false);
    }
  };

  const handleClipDistanceChange = (dist: number) => {
    setClipDistance(dist);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setClipping(clippingAxis, dist, false);
    }
  };

  const handleExplodedOffsetChange = (offset: number) => {
    setExplodedOffset(offset);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setExplodedView(offset);
    }
  };

  const handleResetCamera = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setScale(currentScale);
    }
  };

  const handleToggleXR = async () => {
    if (!sceneManagerRef.current) return;
    const renderer = sceneManagerRef.current.renderer;

    if (navigator.xr) {
      try {
        const session = await navigator.xr.requestSession('immersive-vr', {
          optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
        });
        renderer.xr.setSession(session);
      } catch (err) {
        console.warn('WebXR session request failed, maintaining desktop 3D view:', err);
      }
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === '1') {
        handleSelectScale('microscopic');
      } else if (e.key === '2') {
        handleSelectScale('clot');
      } else if (e.key === '3') {
        handleSelectScale('vessel');
      } else if (e.key === '4') {
        handleSelectScale('thoracic');
      } else if (e.key.toLowerCase() === 'r') {
        handleResetCamera();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentScale]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#080808] font-sans text-white select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Navigation */}
      <HeaderNav
        currentScale={currentScale}
        onSelectScale={handleSelectScale}
        onOpenProvenance={() => setIsProvenanceOpen(true)}
        onResetCamera={handleResetCamera}
        onToggleXR={handleToggleXR}
        isXRSupported={isXRSupported}
      />

      {/* Microscopy HUD Overlay */}
      <MicroscopyOverlay
        currentScale={currentScale}
        stageName={DISEASE_STAGES[currentStageIndex].name}
      />

      {/* Collapsible Unified Bottom Control Dock */}
      <CollapsibleDock
        currentStageIndex={currentStageIndex}
        stages={DISEASE_STAGES}
        onSelectStage={handleSelectStage}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        fiberDensity={fiberDensity}
        onFiberDensityChange={handleFiberDensityChange}
        fiberDiameterUm={fiberDiameterUm}
        onFiberDiameterChange={handleFiberDiameterChange}
        lyticFraction={lyticFraction}
        onLyticFractionChange={handleLyticFractionChange}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        clippingAxis={clippingAxis}
        onClippingAxisChange={handleClippingAxisChange}
        clipDistance={clipDistance}
        onClipDistanceChange={handleClipDistanceChange}
        explodedOffset={explodedOffset}
        onExplodedOffsetChange={handleExplodedOffsetChange}
      />

      {/* Scientific Data Provenance & Ground Truth Modal */}
      <ProvenanceModal
        isOpen={isProvenanceOpen}
        onClose={() => setIsProvenanceOpen(false)}
      />
    </div>
  );
}
