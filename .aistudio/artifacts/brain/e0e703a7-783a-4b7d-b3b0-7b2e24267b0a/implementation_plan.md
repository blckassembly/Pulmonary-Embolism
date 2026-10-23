# Pulmonary Embolism — Immersive 3D Disease Mapping Platform

An interactive, multi-scale 3D biomedical intelligence platform for exploring pulmonary embolism pathophysiology across thoracic anatomy, arterial cutaway, clot architecture, and microscopic fibrin-mesh chamber with WebXR spatial support.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed via interactive clarification:
> - **Primary Default Entry View**: Microscopic Fibrin Network Chamber matching the uploaded research reference image (`Pulmonary_Embolus_Fibrin_Mesh_c34319b1.png`), with seamless zoom-out to vessel cutaway and whole-organ thoracic anatomy.
> - **Primary Simulation Focus**: Hemodynamic flow dynamics, velocity gradient streamlines, wall shear stress, and pulmonary arterial pressure alterations across obstructive disease stages.
> - **Spatial Interaction Model**: Dual-controller grab, ray-pointer selection, two-handed scaling, and spatial layer docking for WebXR headsets (Meta Quest & Apple Vision Pro) with lossless desktop 60fps orbit/pan/clipping fallback.

---

## 1. Overview & Core Concept

The **Pulmonary Embolism Disease Mapping Platform** connects patient-level macro-vascular anatomy with microscopic clot microstructure and computational blood-flow behavior. It is designed for medical researchers, biomedical engineers, educators, and clinicians to examine how an embolus lodges, traps cellular elements in a dense fibrin network, alters hemodynamics, and responds to fibrinolysis.

### Key Value
- **Continuous Multi-Scale Navigation**: Fluidly navigate between Thoracic Organ Scale (~30 cm), Pulmonary Artery Branch (~8 mm), Thrombus Body (~4 mm), and Microscopic Fibrin/Cellular Mesh (~50 µm).
- **Procedural Graph-Based Fibrin Generator**: Graph network of nodes and edges rendered with smoothed Catmull-Rom tubular splines, variable fiber calibers (0.15–0.45 µm), and branching angles.
- **Biophysically Plausible Biconcave RBCs & Platelets**: Procedurally generated biconcave disc geometry (never generic spheres) instanced via `THREE.InstancedMesh` alongside activated dendritic platelets.
- **Hemodynamics & Pressure Simulator**: Directional particle streamlines color-coded by velocity, recirculation vortices, wall shear stress (WSS), and right ventricular vascular resistance metrics.
- **Scientific Data Provenance**: Rigorous categorization of every visual element as *Measured*, *Segmented*, *Simulated*, *Illustrative*, or *Reference*.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Color System (60-30-10 Rule)**:
  - **60% Obsidian Canvas**: `#080808` to `#0B0C0E` deep lab stage with subtle atmospheric depth.
  - **30% Structural Anatomy & Panels**: `#131416` dark slate panels with `#2A2B2E` hairline borders; translucent arterial walls (`#8A3340` at 35% opacity with clearcoat); smoky thoracic lung surfaces (`#20242B` at 18% opacity).
  - **10% Precision Highlights**: Engineering gold (`#B08D46`) and luminous fibrin amber (`#E6B65C`), paired with deep oxygenated crimson (`#8B1E2B` / `#B91C1C`) for red blood cells.
- **Typography**: Clean technical sans (`Plus Jakarta Sans` / `DM Sans`) for labels and navigation, with tabular monospace (`font-mono tabular-nums`) for micro-measurements, porosity, Reynolds numbers, and pressure calculations. Zero decorative icons or pulsating dots.
- **Unobstructed Viewport & Collapsible Bottom Dock**: Floating bottom dock (<15% viewport height) with expandable tabs for Scale Navigator, Disease Timeline, Fibrin Lab Controls, Hemodynamics Inspector, and Clipping/Explode tools.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PULMONARY EMBOLISM · DISEASE MAPPING ENGINE      [Scale: Microscopic 50µm]  │
│ [Thoracic] [Artery Cutaway] [Clot Scale] [Fibrin Microstructure ★] [XR / 3D] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                                                                             │
│                        3D WEBGL / WEBXR VIEWPORT                            │
│           (Procedural Fibrin Network · Biconcave RBCs · Platelets)          │
│                [Active Clipping Plane] [Probe Crosshair]                    │
│                                                                             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [▼ Hide Dock]                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ◄ ► [State 04: Partial Obstruction] ──●──────────────── [Play/Pause 1x] │ │
│ │ Controls: [Fiber Density: 82%] [Porosity: 46%] [WSS: 3.2 Pa] [Slicing]  │ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Architecture & Component Hierarchy

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                 App.tsx                                   │
│              Global State Store (Zustand: Scale, Timeline, Tools)         │
└─────────────────────┬───────────────────────────────┬─────────────────────┘
                      │                               │
        ┌─────────────▼─────────────┐   ┌─────────────▼─────────────┐
        │   Three.js 3D Viewport    │   │      DOM Overlay HUD      │
        │   (Canvas Container Ref)  │   │  (Clean, Non-Occluding)   │
        └─────────────┬─────────────┘   └─────────────┬─────────────┘
                      │                               │
    ┌─────────────────┴─────────────────┐             ├─ Header & Scale Tabs
    │                                   │             ├─ Collapsible Bottom Dock
┌───▼─────────────────────┐ ┌───────────▼───────────┐ ├─ Research Inspector Drawer
│ Multiscale Scene Rigs   │ │ Physical & Flow Engine│ ├─ Clipping & Measure Panel
│ ├─ MicroscopicChamber   │ │ ├─ StreamlineParticles│ └─ WebXR Session Toggle
│ │  ├─ FibrinGraphMesh   │ │ ├─ HemodynamicsSim    │
│ │  ├─ RBCInstancedMesh  │ │ ├─ FibrinolysisEngine │
│ │  └─ PlateletGeometry  │ │ └─ PressureOverload   │
│ ├─ ArteryCutawayScene   │ └───────────────────────┘
│ └─ ThoracicOrganScene   │
└─────────────────────────┘
```

### Key Technical Strategy
1. **Three.js Direct Canvas Mounting in React**: Mount renderer in an isolated `useRef` container outside React's re-render cycle. Maintain 60fps with damped OrbitControls and PMREM Studio Lighting (`RoomEnvironment`).
2. **Procedural Microscopic Graph Engine**:
   - `FibrinNetworkGraph`: Node graph with random seeded distribution, cross-link probability, edge pruning for fibrinolysis.
   - `FibrinGeometry`: Pre-calculated curve tubes and instanced fiber segments with normal-mapped gold sheen.
   - `RBCGeometry`: Lathed biconcave profile ($y = \pm 0.5 \times (1 - r^2) \times \dots$), rendered as an `InstancedMesh` with random tilt and flow orientation.
   - `PlateletMesh`: Spiculated dendritic icosahedron with pseudopodia appendages.
3. **Hemodynamics Simulation**:
   - Upstream high-pressure laminations, severe shear constriction at the clot margin, and turbulent recirculation vortices in the downstream post-stenotic wake.
   - Live quantitative telemetry: mean pulmonary artery pressure (mPAP: $14 \rightarrow 38\,\text{mmHg}$), resistance index, wall shear stress ($0.8 \rightarrow 4.5\,\text{Pa}$).
4. **Interactive Tools**:
   - 3-axis clipping plane with capped cross-sections.
   - Real-time 3D caliper measurement tool (vessel diameter, clot length, fiber thickness).
   - Provenance inspector documenting clinical imaging limits vs computational models.
5. **WebXR Spatial Support**:
   - Direct WebXR `XRSession` integration for immersive VR (Meta Quest) and spatial viewing (Apple Vision Pro), featuring dual-controller raycasting, grab manipulation, and two-handed zoom scaling.

---

## 4. Execution Plan & Phased Milestones

- **Phase 1: Package Setup & Core Three.js Engine**:
  - Install `three`, `@types/three`.
  - Configure renderer with `ACESFilmicToneMapping`, `SRGBColorSpace`, studio lighting, and damping.
- **Phase 2: Procedural Geometry Engines**:
  - Build `FibrinGraphGenerator` (graph schema, node/edge buffers, tube splines).
  - Build `RBCGeometryEngine` (parametric biconcave disc geometry + `InstancedMesh`).
  - Build `PlateletGeometryEngine` (dendritic pseudopodia).
  - Build `PulmonaryArteryCutaway` (translucent lumen, bifurcation, lodged clot).
  - Build `ThoracicOrganModel` (transparent lung lobes, pulmonary arterial tree, airway tracheobronchial branching).
- **Phase 3: Multi-Scale Controller & Disease Progression Timeline**:
  - 8-stage timeline: Patent $\rightarrow$ Embolus arrival $\rightarrow$ Lodging $\rightarrow$ Partial obstruction $\rightarrow$ Severe obstruction $\rightarrow$ Downstream ischemia $\rightarrow$ Remodeling/tPA lysis $\rightarrow$ Post-intervention.
  - Hemodynamics flow visualization with particle streamlines and WSS color ramps.
- **Phase 4: Research Inspection, Measurement Tools & Clipping**:
  - 3-Axis clipping planes with solid cap rendering.
  - 3D caliper measurement and annotation pins.
  - Scientific Data Provenance modal & reference image comparison panel.
- **Phase 5: WebXR Integration & Performance Verification**:
  - WebXR feature detection, VR controllers, desktop fallback, TypeScript build verification.
