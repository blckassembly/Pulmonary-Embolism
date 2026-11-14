/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface IndustrialCutawayOptions {
  cutawayAngle?: number;
  length?: number;
  outerRadius?: number;
  innerRadius?: number;
  fiberDensity?: number;
  ciliaCount?: number;
  mode?: 'airway' | 'vascular';
}

export interface IndustrialCutawayGroup extends THREE.Group {
  updateTime: (delta: number, elapsed: number) => void;
  setWireframeOpacity: (opacity: number) => void;
  setGlassOpacity: (opacity: number) => void;
  setFiberDensity: (density: number) => void;
  setExplodedOffset: (offset: number) => void;
  getExplodedOffset: () => number;
  setMode: (mode: 'airway' | 'vascular') => void;
  setDrugInfusion: (active: boolean, speedScale?: number) => void;
  setLyticFraction: (fraction: number) => void;
  getLyticFraction: () => number;
  isDrugInfusedActive: () => boolean;
  ciliaMesh?: THREE.InstancedMesh;
  particlesMesh?: THREE.Points;
  drugParticlesMesh?: THREE.Points;
  getAnchorWorldPositions: () => {
    epithelium: THREE.Vector3;
    accumulation: THREE.Vector3;
    lumen: THREE.Vector3;
    wallThickness: THREE.Vector3;
  };
}

/**
 * Creates the complete Industrial Anatomy Cutaway 3D rig matching Sketch A,
 * with multi-axis exploded view assembly and real-time pharmacological drug treatment.
 */
export function createIndustrialCutawayGroup(options: IndustrialCutawayOptions = {}): IndustrialCutawayGroup {
  const group = new THREE.Group() as IndustrialCutawayGroup;
  group.name = 'IndustrialCutawayGroup';

  const length = options.length ?? 16;
  const outerR = options.outerRadius ?? 3.4;
  const innerR = options.innerRadius ?? 2.75;
  const wallThickness = outerR - innerR;

  let currentExplodedOffset = 0;
  let currentLyticFraction = 0;
  let isDrugInfused = false;
  let flowSpeedScale = 1.0;

  // Materials
  // 1. Translucent glass shell material
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xddeeff),
    transmission: 0.88,
    opacity: 0.28,
    transparent: true,
    roughness: 0.18,
    ior: 1.45,
    metalness: 0.05,
    reflectivity: 0.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 2. White CAD wireframe lines material
  const cadLineMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });

  const faintCadLineMat = new THREE.LineBasicMaterial({
    color: 0x99bbdd,
    transparent: true,
    opacity: 0.35,
  });

  // 3. Wall strata material (sliced edge blocks)
  const wallEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x242830,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  // 4. Epithelium / endothelial block cellular layer
  const cellBlockMat = new THREE.MeshStandardMaterial({
    color: 0x485260,
    roughness: 0.4,
    metalness: 0.15,
  });

  // 5. Cilia hair material (fine white / light-silver filaments)
  const ciliaMat = new THREE.MeshStandardMaterial({
    color: 0xe6edf5,
    roughness: 0.6,
    metalness: 0.1,
  });

  // 6. Fibrous core materials
  const primaryFiberMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xddaf55),
    roughness: 0.32,
    metalness: 0.25,
    emissive: new THREE.Color(0x442c08),
    emissiveIntensity: 0.25,
  });

  const deepFiberMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xb58532),
    roughness: 0.45,
    metalness: 0.2,
  });

  const noduleMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xeed99a),
    roughness: 0.25,
    metalness: 0.3,
    emissive: new THREE.Color(0x382405),
    emissiveIntensity: 0.2,
  });

  // 7. CAD Exploded view guide axis dashed lines
  const guideLineMat = new THREE.LineDashedMaterial({
    color: 0x64b5f6,
    dashSize: 0.35,
    gapSize: 0.2,
    transparent: true,
    opacity: 0.75,
  });

  // Master container tilted to diagonal isometric orientation matching Sketch A
  const conduitContainer = new THREE.Group();
  conduitContainer.name = 'ConduitContainer';
  conduitContainer.rotation.set(-0.25, -0.65, -0.38);
  group.add(conduitContainer);

  // Distinct Exploded Layer Subgroups:
  // Layer 1: Outer Conduit & CAD Wireframe
  const outerConduitGroup = new THREE.Group();
  outerConduitGroup.name = 'Layer_OuterConduit';
  conduitContainer.add(outerConduitGroup);

  // Layer 2: Wall Strata & Cellular Epithelium
  const wallStrataGroup = new THREE.Group();
  wallStrataGroup.name = 'Layer_WallStrata';
  conduitContainer.add(wallStrataGroup);

  // Layer 3: Thrombus / Mucus Accumulation Core
  const thrombusCoreGroup = new THREE.Group();
  thrombusCoreGroup.name = 'Layer_ThrombusCore';
  conduitContainer.add(thrombusCoreGroup);

  // Layer 4: Patent Lumen Flow Streamlines
  const lumenFlowGroup = new THREE.Group();
  lumenFlowGroup.name = 'Layer_LumenFlow';
  conduitContainer.add(lumenFlowGroup);

  // Layer 5: CAD Exploded Assembly Guide Lines
  const explodedGuideLinesGroup = new THREE.Group();
  explodedGuideLinesGroup.name = 'Layer_ExplodedGuides';
  explodedGuideLinesGroup.visible = false;
  conduitContainer.add(explodedGuideLinesGroup);

  const troughStart = -Math.PI * 0.2;
  const troughLen = Math.PI * 1.35;
  const radialSegments = 48;
  const lengthSegments = 32;

  // ==========================================
  // LAYER 1: OUTER CONDUIT SHELL & CAD WIREFRAME
  // ==========================================
  const troughOuterGeo = new THREE.CylinderGeometry(
    outerR,
    outerR,
    length,
    radialSegments,
    lengthSegments,
    true,
    troughStart,
    troughLen
  );
  troughOuterGeo.rotateX(Math.PI / 2);
  const troughOuterMesh = new THREE.Mesh(troughOuterGeo, glassMat);
  outerConduitGroup.add(troughOuterMesh);

  const roofStart = Math.PI * 1.45;
  const roofLen = Math.PI * 0.42;
  const roofOuterGeo = new THREE.CylinderGeometry(
    outerR,
    outerR,
    length,
    32,
    lengthSegments,
    true,
    roofStart,
    roofLen
  );
  roofOuterGeo.rotateX(Math.PI / 2);
  const roofOuterMesh = new THREE.Mesh(roofOuterGeo, glassMat);
  outerConduitGroup.add(roofOuterMesh);

  // Transverse & Longitudinal CAD Wireframe
  const wireframeGroup = new THREE.Group();
  outerConduitGroup.add(wireframeGroup);

  const ringCount = 28;
  const zStep = length / (ringCount - 1);
  for (let i = 0; i < ringCount; i++) {
    const z = -length / 2 + i * zStep;
    const isMajor = i % 4 === 0;
    const mat = isMajor ? cadLineMat : faintCadLineMat;

    const troughOuterPts: THREE.Vector3[] = [];
    const steps = 36;
    for (let s = 0; s <= steps; s++) {
      const a = troughStart + (s / steps) * troughLen;
      troughOuterPts.push(new THREE.Vector3(Math.cos(a) * outerR, Math.sin(a) * outerR, z));
    }
    wireframeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(troughOuterPts), mat));

    const roofOuterPts: THREE.Vector3[] = [];
    const rSteps = 16;
    for (let s = 0; s <= rSteps; s++) {
      const a = roofStart + (s / rSteps) * roofLen;
      roofOuterPts.push(new THREE.Vector3(Math.cos(a) * outerR, Math.sin(a) * outerR, z));
    }
    wireframeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofOuterPts), mat));
  }

  const longSplineAngles = [
    troughStart,
    troughStart + troughLen * 0.25,
    troughStart + troughLen * 0.5,
    troughStart + troughLen * 0.75,
    troughStart + troughLen,
    roofStart,
    roofStart + roofLen * 0.5,
    roofStart + roofLen,
  ];

  longSplineAngles.forEach((a) => {
    const ptsOuter = [
      new THREE.Vector3(Math.cos(a) * outerR, Math.sin(a) * outerR, -length / 2),
      new THREE.Vector3(Math.cos(a) * outerR, Math.sin(a) * outerR, length / 2),
    ];
    wireframeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ptsOuter), cadLineMat));
  });

  // ==========================================
  // LAYER 2: WALL STRATA & CELLULAR EPITHELIUM
  // ==========================================
  const troughInnerGeo = new THREE.CylinderGeometry(
    innerR,
    innerR,
    length,
    radialSegments,
    lengthSegments,
    true,
    troughStart,
    troughLen
  );
  troughInnerGeo.rotateX(Math.PI / 2);
  const troughInnerMesh = new THREE.Mesh(troughInnerGeo, glassMat);
  wallStrataGroup.add(troughInnerMesh);

  const roofInnerGeo = new THREE.CylinderGeometry(
    innerR,
    innerR,
    length,
    32,
    lengthSegments,
    true,
    roofStart,
    roofLen
  );
  roofInnerGeo.rotateX(Math.PI / 2);
  const roofInnerMesh = new THREE.Mesh(roofInnerGeo, glassMat);
  wallStrataGroup.add(roofInnerMesh);

  // Inner rings on wireframe
  for (let i = 0; i < ringCount; i++) {
    const z = -length / 2 + i * zStep;
    const isMajor = i % 4 === 0;
    const mat = isMajor ? cadLineMat : faintCadLineMat;

    const troughInnerPts: THREE.Vector3[] = [];
    const steps = 36;
    for (let s = 0; s <= steps; s++) {
      const a = troughStart + (s / steps) * troughLen;
      troughInnerPts.push(new THREE.Vector3(Math.cos(a) * innerR, Math.sin(a) * innerR, z));
    }
    wallStrataGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(troughInnerPts), mat));

    const roofInnerPts: THREE.Vector3[] = [];
    const rSteps = 16;
    for (let s = 0; s <= rSteps; s++) {
      const a = roofStart + (s / rSteps) * roofLen;
      roofInnerPts.push(new THREE.Vector3(Math.cos(a) * innerR, Math.sin(a) * innerR, z));
    }
    wallStrataGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofInnerPts), mat));
  }

  function createEdgeStrip(angle: number, len: number): THREE.Mesh {
    const stripGeo = new THREE.PlaneGeometry(wallThickness, len, 1, 16);
    stripGeo.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(stripGeo, wallEdgeMat);
    const midR = (innerR + outerR) / 2;
    mesh.position.set(Math.cos(angle) * midR, Math.sin(angle) * midR, 0);
    mesh.rotation.z = angle;
    return mesh;
  }

  wallStrataGroup.add(createEdgeStrip(troughStart, length));
  wallStrataGroup.add(createEdgeStrip(troughStart + troughLen, length));
  wallStrataGroup.add(createEdgeStrip(roofStart, length));
  wallStrataGroup.add(createEdgeStrip(roofStart + roofLen, length));

  function createAnnularCap(zPos: number, angleStart: number, angleLength: number): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerR, angleStart, angleStart + angleLength, false);
    shape.absarc(0, 0, innerR, angleStart + angleLength, angleStart, true);
    shape.closePath();

    const capGeo = new THREE.ShapeGeometry(shape, 32);
    const mesh = new THREE.Mesh(capGeo, wallEdgeMat);
    mesh.position.z = zPos;
    return mesh;
  }

  wallStrataGroup.add(createAnnularCap(-length / 2, troughStart, troughLen));
  wallStrataGroup.add(createAnnularCap(length / 2, troughStart, troughLen));
  wallStrataGroup.add(createAnnularCap(-length / 2, roofStart, roofLen));
  wallStrataGroup.add(createAnnularCap(length / 2, roofStart, roofLen));

  // Cellular Wall Blocks
  const cellGroup = new THREE.Group();
  wallStrataGroup.add(cellGroup);

  const cellCountPerEdge = 24;
  const cellBoxGeo = new THREE.BoxGeometry(wallThickness * 0.88, 0.24, (length / cellCountPerEdge) * 0.85);

  function createCellRow(angle: number) {
    const midR = (innerR + outerR) / 2;
    const rowGroup = new THREE.Group();
    const instMesh = new THREE.InstancedMesh(cellBoxGeo, cellBlockMat, cellCountPerEdge);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < cellCountPerEdge; i++) {
      const z = -length / 2 + (i + 0.5) * (length / cellCountPerEdge);
      dummy.position.set(Math.cos(angle) * midR, Math.sin(angle) * midR, z);
      dummy.rotation.set(0, 0, angle);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    rowGroup.add(instMesh);
    return rowGroup;
  }

  cellGroup.add(createCellRow(troughStart + troughLen));
  cellGroup.add(createCellRow(roofStart));

  // Ciliated Epithelial Brush Border
  const ciliaCount = options.ciliaCount ?? 1400;
  const ciliaGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.38, 5);
  ciliaGeo.translate(0, 0.19, 0);
  const ciliaInstanced = new THREE.InstancedMesh(ciliaGeo, ciliaMat, ciliaCount);
  ciliaInstanced.name = 'CiliaBrushBorder';
  wallStrataGroup.add(ciliaInstanced);
  group.ciliaMesh = ciliaInstanced;

  const ciliaDummy = new THREE.Object3D();
  const ciliaBaseRotations: number[] = [];

  for (let i = 0; i < ciliaCount; i++) {
    const isRoof = Math.random() < 0.35;
    let angle: number;
    if (isRoof) {
      angle = roofStart + Math.random() * roofLen;
    } else {
      const edgeSpan = troughLen * 0.45;
      angle = troughStart + troughLen - Math.random() * edgeSpan;
    }

    const z = -length / 2 + 0.5 + Math.random() * (length - 1.0);
    const r = innerR - 0.02;

    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    ciliaDummy.position.set(px, py, z);

    const inwardAngle = angle + Math.PI;
    const tilt = (Math.random() - 0.5) * 0.35;
    ciliaDummy.rotation.set(tilt, (Math.random() - 0.5) * 0.2, inwardAngle - Math.PI / 2);
    ciliaDummy.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.6, 0.8 + Math.random() * 0.5);
    ciliaDummy.updateMatrix();
    ciliaInstanced.setMatrixAt(i, ciliaDummy.matrix);

    ciliaBaseRotations.push(tilt);
  }
  ciliaInstanced.instanceMatrix.needsUpdate = true;

  // ==========================================
  // LAYER 3: DENSE THROMBUS / MUCUS ACCUMULATION
  // ==========================================
  const fiberSplineCount = 42;
  const clotZCenter = 0.5;
  const clotZLength = length * 0.55;

  for (let f = 0; f < fiberSplineCount; f++) {
    const points: THREE.Vector3[] = [];
    const ptCount = 7 + Math.floor(Math.random() * 5);
    const startZ = clotZCenter - clotZLength / 2 + Math.random() * (clotZLength * 0.25);
    const endZ = startZ + (clotZLength * 0.4 + Math.random() * (clotZLength * 0.5));

    for (let p = 0; p < ptCount; p++) {
      const frac = p / (ptCount - 1);
      const z = startZ + frac * (endZ - startZ);
      const troughAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const r = innerR * 0.35 + Math.random() * (innerR * 0.45);

      const x = Math.cos(troughAngle) * r + (Math.random() - 0.5) * 0.3;
      const y = Math.sin(troughAngle) * r + (Math.random() - 0.5) * 0.3;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const radius = 0.035 + Math.random() * 0.045;
    const tubeGeo = new THREE.TubeGeometry(curve, 32, radius, 8, false);
    const mat = f % 3 === 0 ? deepFiberMat : primaryFiberMat;
    const tubeMesh = new THREE.Mesh(tubeGeo, mat);
    thrombusCoreGroup.add(tubeMesh);
  }

  // Platelet / Mucus Nodular Clusters
  const noduleCount = 280;
  const noduleGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const noduleInstanced = new THREE.InstancedMesh(noduleGeo, noduleMat, noduleCount);
  const noduleDummy = new THREE.Object3D();

  for (let n = 0; n < noduleCount; n++) {
    const z = clotZCenter - clotZLength / 2 + Math.random() * clotZLength;
    const troughAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.25;
    const r = innerR * 0.3 + Math.random() * (innerR * 0.5);

    const x = Math.cos(troughAngle) * r + (Math.random() - 0.5) * 0.4;
    const y = Math.sin(troughAngle) * r + (Math.random() - 0.5) * 0.4;

    noduleDummy.position.set(x, y, z);
    const s = 0.6 + Math.random() * 1.4;
    noduleDummy.scale.set(s, s * (0.8 + Math.random() * 0.4), s);
    noduleDummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    noduleDummy.updateMatrix();
    noduleInstanced.setMatrixAt(n, noduleDummy.matrix);
  }
  noduleInstanced.instanceMatrix.needsUpdate = true;
  thrombusCoreGroup.add(noduleInstanced);

  // Warm localized interior lighting
  const clotLight = new THREE.PointLight(0xffbe6b, 3.2, 8.5);
  clotLight.position.set(0, -innerR * 0.4, clotZCenter);
  thrombusCoreGroup.add(clotLight);

  // Exterior lighting
  const topRimLight = new THREE.DirectionalLight(0xffffff, 2.4);
  topRimLight.position.set(-8, 12, 8);
  group.add(topRimLight);

  const fillCadLight = new THREE.DirectionalLight(0x7799bb, 1.2);
  fillCadLight.position.set(8, -6, -6);
  group.add(fillCadLight);

  // ==========================================
  // LAYER 4: PATENT LUMEN FLOW STREAMLINES & DRUG INFUSION
  // ==========================================
  const particleCount = 260;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleVelocities: number[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * (innerR * 0.65);
    const z = -length / 2 + Math.random() * length;

    particlePositions[i * 3 + 0] = Math.cos(angle) * r;
    particlePositions[i * 3 + 1] = Math.sin(angle) * r + 0.4;
    particlePositions[i * 3 + 2] = z;

    particleVelocities.push(2.5 + Math.random() * 4.0);
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0x99ddff,
    size: 0.08,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });

  const particlesMesh = new THREE.Points(particleGeo, particleMat);
  lumenFlowGroup.add(particlesMesh);
  group.particlesMesh = particlesMesh;

  // Real-Time Drug Infusion Nanoparticles (Golden Amber Cleavage Droplets)
  const drugCount = 180;
  const drugGeo = new THREE.BufferGeometry();
  const drugPositions = new Float32Array(drugCount * 3);
  const drugVelocities: number[] = [];

  for (let i = 0; i < drugCount; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
    const r = Math.random() * (innerR * 0.6);
    const z = -length / 2 + Math.random() * (length * 0.7);

    drugPositions[i * 3 + 0] = Math.cos(angle) * r;
    drugPositions[i * 3 + 1] = Math.sin(angle) * r;
    drugPositions[i * 3 + 2] = z;

    drugVelocities.push(4.0 + Math.random() * 5.5);
  }

  drugGeo.setAttribute('position', new THREE.BufferAttribute(drugPositions, 3));
  const drugMat = new THREE.PointsMaterial({
    color: 0xffd152,
    size: 0.12,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  const drugParticlesMesh = new THREE.Points(drugGeo, drugMat);
  drugParticlesMesh.visible = false;
  lumenFlowGroup.add(drugParticlesMesh);
  group.drugParticlesMesh = drugParticlesMesh;

  // ==========================================
  // LAYER 5: 3D CAD EXPLODED ASSEMBLY GUIDE LINES
  // ==========================================
  function rebuildExplodedGuides(offset: number) {
    while (explodedGuideLinesGroup.children.length > 0) {
      const child = explodedGuideLinesGroup.children[0];
      explodedGuideLinesGroup.remove(child);
    }

    if (offset <= 0.01) {
      explodedGuideLinesGroup.visible = false;
      return;
    }
    explodedGuideLinesGroup.visible = true;

    const pOuter = outerConduitGroup.position;
    const pWall = wallStrataGroup.position;
    const pThrombus = thrombusCoreGroup.position;

    const stations = [-length * 0.35, 0, length * 0.35];

    stations.forEach((z) => {
      const pts1 = [
        new THREE.Vector3(pOuter.x, pOuter.y + outerR * 0.6, pOuter.z + z),
        new THREE.Vector3(pWall.x, pWall.y + innerR * 0.6, pWall.z + z),
      ];
      const geo1 = new THREE.BufferGeometry().setFromPoints(pts1);
      const line1 = new THREE.Line(geo1, guideLineMat);
      line1.computeLineDistances();
      explodedGuideLinesGroup.add(line1);

      const pts2 = [
        new THREE.Vector3(pWall.x, pWall.y - innerR * 0.5, pWall.z + z),
        new THREE.Vector3(pThrombus.x, pThrombus.y, pThrombus.z + z),
      ];
      const geo2 = new THREE.BufferGeometry().setFromPoints(pts2);
      const line2 = new THREE.Line(geo2, guideLineMat);
      line2.computeLineDistances();
      explodedGuideLinesGroup.add(line2);
    });
  }

  // ==========================================
  // 3D LOCAL ANCHORS FOR CALLOUTS
  // ==========================================
  const localAnchorEpithelium = new THREE.Vector3(
    Math.cos(roofStart) * innerR,
    Math.sin(roofStart) * innerR + 0.35,
    -2.2
  );

  const localAnchorAccumulation = new THREE.Vector3(0.3, -innerR * 0.55, 0.6);

  const localAnchorLumen = new THREE.Vector3(0.3, innerR * 0.1, length / 2 - 1.5);

  const localAnchorWall = new THREE.Vector3(
    Math.cos(troughStart + troughLen) * ((innerR + outerR) / 2),
    Math.sin(troughStart + troughLen) * ((innerR + outerR) / 2),
    1.2
  );

  group.getAnchorWorldPositions = () => {
    conduitContainer.updateWorldMatrix(true, true);
    return {
      epithelium: localAnchorEpithelium.clone().applyMatrix4(wallStrataGroup.matrixWorld),
      accumulation: localAnchorAccumulation.clone().applyMatrix4(thrombusCoreGroup.matrixWorld),
      lumen: localAnchorLumen.clone().applyMatrix4(lumenFlowGroup.matrixWorld),
      wallThickness: localAnchorWall.clone().applyMatrix4(wallStrataGroup.matrixWorld),
    };
  };

  // Exploded View Assembly Controller
  group.setExplodedOffset = (offset: number) => {
    currentExplodedOffset = Math.max(0, Math.min(1.0, offset));

    outerConduitGroup.position.set(
      -3.4 * currentExplodedOffset,
      4.6 * currentExplodedOffset,
      0
    );

    wallStrataGroup.position.set(
      0,
      1.1 * currentExplodedOffset,
      0
    );

    thrombusCoreGroup.position.set(
      3.6 * currentExplodedOffset,
      -5.0 * currentExplodedOffset,
      0.6 * currentExplodedOffset
    );

    lumenFlowGroup.position.set(
      1.4 * currentExplodedOffset,
      -1.8 * currentExplodedOffset,
      0
    );

    rebuildExplodedGuides(currentExplodedOffset);
  };

  group.getExplodedOffset = () => currentExplodedOffset;

  // Real-Time Drug Infusion & Thrombolytic Dissolution Controller
  group.setDrugInfusion = (active: boolean, speedScale = 1.0) => {
    isDrugInfused = active;
    flowSpeedScale = speedScale;
    drugParticlesMesh.visible = active;
  };

  group.isDrugInfusedActive = () => isDrugInfused;

  group.setLyticFraction = (fraction: number) => {
    currentLyticFraction = Math.max(0, Math.min(1.0, fraction));

    // Physically scale down and dissolve the thrombus core in CAD cutaway
    const scale = Math.max(0.12, 1.0 - currentLyticFraction * 0.85);
    thrombusCoreGroup.scale.set(scale, scale, Math.max(0.2, 1.0 - currentLyticFraction * 0.65));

    // Enzymatic cleavage coloration shift
    if (currentLyticFraction > 0.05) {
      primaryFiberMat.emissive.setHex(0xb45309);
      primaryFiberMat.emissiveIntensity = 0.45;
      noduleMat.emissive.setHex(0xd97706);
      noduleMat.emissiveIntensity = 0.4;
    } else {
      primaryFiberMat.emissive.setHex(0x442c08);
      primaryFiberMat.emissiveIntensity = 0.25;
      noduleMat.emissive.setHex(0x382405);
      noduleMat.emissiveIntensity = 0.2;
    }
  };

  group.getLyticFraction = () => currentLyticFraction;

  // Animation update loop
  group.updateTime = (_delta: number, elapsed: number) => {
    // 1. Cilia wave animation
    for (let i = 0; i < ciliaCount; i += 6) {
      ciliaInstanced.getMatrixAt(i, ciliaDummy.matrix);
      ciliaDummy.matrix.decompose(ciliaDummy.position, ciliaDummy.quaternion, ciliaDummy.scale);
      const baseTilt = ciliaBaseRotations[i] || 0;
      ciliaDummy.rotation.x = baseTilt + Math.sin(elapsed * 3.5 + i * 0.2) * 0.12;
      ciliaDummy.updateMatrix();
      ciliaInstanced.setMatrixAt(i, ciliaDummy.matrix);
    }
    ciliaInstanced.instanceMatrix.needsUpdate = true;

    // 2. Streamline particles forward flow
    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;
    const speedMult = (flowSpeedScale || 1.0) * (1.0 + currentLyticFraction * 1.5);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3 + 2;
      array[idx] += particleVelocities[i] * 0.016 * speedMult;
      if (array[idx] > length / 2) {
        array[idx] = -length / 2;
      }
    }
    posAttr.needsUpdate = true;

    // 3. Drug infusion particles forward flow
    if (isDrugInfused) {
      const drugPosAttr = drugGeo.attributes.position as THREE.BufferAttribute;
      const drugArray = drugPosAttr.array as Float32Array;

      for (let i = 0; i < drugCount; i++) {
        const idx = i * 3 + 2;
        drugArray[idx] += drugVelocities[i] * 0.018 * (flowSpeedScale || 1.0);
        if (drugArray[idx] > length / 2) {
          drugArray[idx] = -length / 2;
        }
      }
      drugPosAttr.needsUpdate = true;
    }
  };

  group.setWireframeOpacity = (opacity: number) => {
    cadLineMat.opacity = Math.max(0.05, Math.min(1.0, opacity));
    faintCadLineMat.opacity = Math.max(0.02, Math.min(0.6, opacity * 0.45));
  };

  group.setGlassOpacity = (opacity: number) => {
    glassMat.opacity = Math.max(0.05, Math.min(0.8, opacity));
  };

  group.setFiberDensity = (density: number) => {
    const clamped = Math.max(0.2, Math.min(1.0, density));
    if (currentLyticFraction <= 0.05) {
      thrombusCoreGroup.scale.set(1.0, clamped, clamped);
    }
  };

  group.setMode = (mode: 'airway' | 'vascular') => {
    if (mode === 'vascular') {
      glassMat.color.setHex(0xffe2e5);
      primaryFiberMat.color.setHex(0xdeb35a);
      noduleMat.color.setHex(0xb83838);
    } else {
      glassMat.color.setHex(0xddeeff);
      primaryFiberMat.color.setHex(0xddaf55);
      noduleMat.color.setHex(0xeed99a);
    }
  };

  return group;
}
