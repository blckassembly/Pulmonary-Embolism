/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Waypoints along the anatomical clot trajectory:
 * 1. Deep Veins (Leg / Pelvis / Inferior Vena Cava)
 * 2. Right Atrium & Tricuspid Valve
 * 3. Right Ventricle & Pulmonary Valve
 * 4. Main Pulmonary Trunk & Bifurcation
 * 5. Lobar Branch Impaction Site (Pulmonary Embolism)
 */
export const CLOT_PATH_SPLINE_POINTS: [number, number, number][] = [
  [-1.0, -18.5, -0.2], // Left common iliac tributary
  [-0.2, -15.0, 0.2],  // Confluence of IVC
  [0.4, -10.5, 0.6],   // Infrarenal IVC
  [1.0, -7.0, 1.0],    // Suprahepatic IVC entering right atrium
  [1.8, -4.5, 1.4],    // Right atrium cavity
  [1.4, -2.8, 2.2],    // Tricuspid valve into right ventricle
  [0.8, -1.0, 2.8],    // Right ventricular outflow tract (RVOT)
  [0.4, 1.5, 2.2],     // Pulmonary valve into main trunk
  [-0.2, 5.0, 1.2],    // Pulmonary bifurcation (saddle area)
  [-4.5, 4.2, 0.5],    // Right pulmonary artery
  [-8.5, 2.0, 0.2],    // Right lower lobe trunk
  [-9.8, -2.5, 0.0],   // Lobar arrest / occlusive thrombus site
];

/**
 * Creates the complete thoracic anatomical model for Embolism Explorer:
 * - Transparent right & left lungs (anatomically shaped lobes)
 * - Cardiac silhouette (Right atrium, right ventricle, left ventricle)
 * - Deep veins & Inferior Vena Cava (IVC)
 * - Tracheobronchial tree
 * - Pulmonary vascular arterial tree (trunk, RPA, LPA, lower lobe artery)
 * - Engineering gold highlighted embolus occlusion site
 * - Clot path guide spline and travel markers
 */
export function createThoracicOrganGroup(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ThoracicOrganGroup';

  // 1. Lungs (Translucent smoky pleural envelope)
  const lungMat = new THREE.MeshPhysicalMaterial({
    color: 0x242a35,
    roughness: 0.35,
    metalness: 0.05,
    transmission: 0.55,
    transparent: true,
    opacity: 0.28,
    ior: 1.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const lungsGroup = new THREE.Group();
  lungsGroup.name = 'LungsGroup';

  // Right lung (3 lobes: superior, middle, inferior)
  const rightLungGroup = new THREE.Group();
  rightLungGroup.name = 'RightLung';

  const rSupGeo = new THREE.SphereGeometry(7.2, 24, 20);
  rSupGeo.scale(0.85, 1.3, 0.95);
  rSupGeo.translate(-9.0, 7.0, 0);
  const rSupMesh = new THREE.Mesh(rSupGeo, lungMat);

  const rMidGeo = new THREE.SphereGeometry(6.2, 24, 18);
  rMidGeo.scale(0.9, 0.8, 0.9);
  rMidGeo.translate(-9.6, -0.5, 0.8);
  const rMidMesh = new THREE.Mesh(rMidGeo, lungMat);

  const rInfGeo = new THREE.SphereGeometry(8.0, 24, 20);
  rInfGeo.scale(0.95, 1.4, 1.05);
  rInfGeo.translate(-9.4, -9.0, -0.4);
  const rInfMesh = new THREE.Mesh(rInfGeo, lungMat);

  rightLungGroup.add(rSupMesh, rMidMesh, rInfMesh);
  lungsGroup.add(rightLungGroup);

  // Left lung (2 lobes: superior, inferior with cardiac notch)
  const leftLungGroup = new THREE.Group();
  leftLungGroup.name = 'LeftLung';

  const lSupGeo = new THREE.SphereGeometry(7.0, 24, 20);
  lSupGeo.scale(0.8, 1.35, 0.92);
  lSupGeo.translate(9.0, 7.2, 0);
  const lSupMesh = new THREE.Mesh(lSupGeo, lungMat);

  const lInfGeo = new THREE.SphereGeometry(7.8, 24, 20);
  lInfGeo.scale(0.88, 1.45, 1.0);
  lInfGeo.translate(9.2, -8.5, -0.2);
  const lInfMesh = new THREE.Mesh(lInfGeo, lungMat);

  leftLungGroup.add(lSupMesh, lInfMesh);
  lungsGroup.add(leftLungGroup);
  root.add(lungsGroup);

  // 2. Cardiac Silhouette & Cavities (Right Atrium & Ventricle)
  const heartGroup = new THREE.Group();
  heartGroup.name = 'HeartAnatomyGroup';

  const heartGeo = new THREE.SphereGeometry(6.5, 24, 20);
  heartGeo.scale(0.9, 1.15, 0.95);
  heartGeo.translate(1.8, -4.0, 1.5);
  const heartMat = new THREE.MeshStandardMaterial({
    color: 0x4a1820,
    roughness: 0.5,
    metalness: 0.15,
    transparent: true,
    opacity: 0.45,
  });
  const heartMesh = new THREE.Mesh(heartGeo, heartMat);
  heartMesh.name = 'HeartAnatomy';
  heartGroup.add(heartMesh);

  // Highlighted Right Ventricle / Atrium contour (strain indicator)
  const rvGeo = new THREE.SphereGeometry(4.2, 20, 18);
  rvGeo.scale(0.9, 1.1, 0.9);
  rvGeo.translate(1.5, -3.2, 2.0);
  const rvMat = new THREE.MeshStandardMaterial({
    color: 0x661820,
    roughness: 0.4,
    transparent: true,
    opacity: 0.35,
  });
  const rvMesh = new THREE.Mesh(rvGeo, rvMat);
  rvMesh.name = 'RightVentricleMesh';
  heartGroup.add(rvMesh);
  root.add(heartGroup);

  // 3. Deep Veins & Inferior Vena Cava (IVC)
  const deepVeinsGroup = new THREE.Group();
  deepVeinsGroup.name = 'DeepVeinsGroup';

  const veinMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a, // deep royal venous blue
    roughness: 0.35,
    metalness: 0.25,
  });

  // Inferior Vena Cava trunk ascending to the right atrium
  const ivcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, -15.0, 0.2),
    new THREE.Vector3(0.4, -10.5, 0.6),
    new THREE.Vector3(1.0, -7.0, 1.0),
    new THREE.Vector3(1.8, -5.0, 1.4), // entry into RA
  ]);
  const ivcMesh = new THREE.Mesh(new THREE.TubeGeometry(ivcCurve, 20, 1.35, 12, false), veinMat);
  ivcMesh.name = 'InferiorVenaCava';
  deepVeinsGroup.add(ivcMesh);

  // Right common iliac vein
  const rIliacCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3.2, -19.5, -0.4),
    new THREE.Vector3(-1.8, -17.0, -0.1),
    new THREE.Vector3(-0.2, -15.0, 0.2),
  ]);
  const rIliacMesh = new THREE.Mesh(new THREE.TubeGeometry(rIliacCurve, 12, 1.0, 10, false), veinMat);
  deepVeinsGroup.add(rIliacMesh);

  // Left common iliac vein
  const lIliacCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.8, -19.5, -0.4),
    new THREE.Vector3(1.4, -17.0, -0.1),
    new THREE.Vector3(-0.2, -15.0, 0.2),
  ]);
  const lIliacMesh = new THREE.Mesh(new THREE.TubeGeometry(lIliacCurve, 12, 1.0, 10, false), veinMat);
  deepVeinsGroup.add(lIliacMesh);

  // Thrombus origin nodule in deep leg/pelvic vein
  const dvtOriginGeo = new THREE.SphereGeometry(1.2, 16, 14);
  dvtOriginGeo.scale(0.9, 1.5, 0.9);
  dvtOriginGeo.translate(-3.2, -19.5, -0.4);
  const dvtOriginMat = new THREE.MeshStandardMaterial({
    color: 0xb08d46, // engineering gold thrombus
    emissive: 0x6d4b1a,
    emissiveIntensity: 0.5,
    roughness: 0.3,
  });
  const dvtOriginMesh = new THREE.Mesh(dvtOriginGeo, dvtOriginMat);
  dvtOriginMesh.name = 'DVTOriginSite';
  deepVeinsGroup.add(dvtOriginMesh);
  root.add(deepVeinsGroup);

  // 4. Tracheobronchial Airway Tree
  const airwayMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8e2, // cartilaginous airway white/platinum
    roughness: 0.42,
    metalness: 0.1,
  });

  const tracheaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 19, 0),
    new THREE.Vector3(0.1, 12, 0.2),
    new THREE.Vector3(0.2, 6.5, 0.4), // Carina at T4/T5
  ]);
  const tracheaMesh = new THREE.Mesh(new THREE.TubeGeometry(tracheaCurve, 16, 1.25, 12, false), airwayMat);
  root.add(tracheaMesh);

  const rBronchusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 6.5, 0.4),
    new THREE.Vector3(-3.5, 4.0, -0.2),
    new THREE.Vector3(-7.2, 1.5, -0.8),
  ]);
  const rBronchusMesh = new THREE.Mesh(new THREE.TubeGeometry(rBronchusCurve, 14, 0.95, 10, false), airwayMat);
  root.add(rBronchusMesh);

  const lBronchusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 6.5, 0.4),
    new THREE.Vector3(4.2, 4.5, -0.3),
    new THREE.Vector3(8.0, 2.8, -0.6),
  ]);
  const lBronchusMesh = new THREE.Mesh(new THREE.TubeGeometry(lBronchusCurve, 14, 0.85, 10, false), airwayMat);
  root.add(lBronchusMesh);

  // 5. Pulmonary Arterial Tree (Vessels in deoxygenated arterial blue)
  const paGroup = new THREE.Group();
  paGroup.name = 'PulmonaryArteryGroup';

  const paMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.35,
    metalness: 0.2,
  });

  // Pulmonary trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.4, 1.5, 2.2),
    new THREE.Vector3(0.2, 3.2, 1.8),
    new THREE.Vector3(-0.2, 5.0, 1.2), // bifurcation
  ]);
  const trunkMesh = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 16, 1.5, 14, false), paMat);
  trunkMesh.name = 'PulmonaryTrunkMesh';
  paGroup.add(trunkMesh);

  // Right Pulmonary Artery
  const rpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 5.0, 1.2),
    new THREE.Vector3(-4.5, 4.2, 0.5),
    new THREE.Vector3(-8.5, 2.0, 0.2),
  ]);
  const rpaMesh = new THREE.Mesh(new THREE.TubeGeometry(rpaCurve, 16, 1.2, 12, false), paMat);
  rpaMesh.name = 'RightPulmonaryArteryMesh';
  paGroup.add(rpaMesh);

  // Right lower lobe lobar artery (site of embolus)
  const rllCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.5, 2.0, 0.2),
    new THREE.Vector3(-9.8, -2.5, 0.0),
    new THREE.Vector3(-10.8, -7.5, -0.4),
  ]);
  const rllMesh = new THREE.Mesh(new THREE.TubeGeometry(rllCurve, 16, 0.95, 10, false), paMat);
  rllMesh.name = 'RightLowerLobeArteryMesh';
  paGroup.add(rllMesh);

  // Left Pulmonary Artery
  const lpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 5.0, 1.2),
    new THREE.Vector3(4.2, 5.2, 0.8),
    new THREE.Vector3(8.5, 3.8, 0.4),
    new THREE.Vector3(10.5, -2.0, 0.1),
  ]);
  const lpaMesh = new THREE.Mesh(new THREE.TubeGeometry(lpaCurve, 20, 1.15, 12, false), paMat);
  lpaMesh.name = 'LeftPulmonaryArteryMesh';
  paGroup.add(lpaMesh);

  // 6. Embolus Highlight Site (Engineering Gold highlight on Right Lower Lobe Artery)
  const embolusHighlightGeo = new THREE.SphereGeometry(1.6, 20, 16);
  embolusHighlightGeo.scale(1.1, 1.8, 1.0);
  embolusHighlightGeo.translate(-9.8, -2.5, 0.0);

  const embolusHighlightMat = new THREE.MeshStandardMaterial({
    color: 0xb08d46, // engineering gold
    emissive: 0x8a6828,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.85,
  });

  const embolusHighlightMesh = new THREE.Mesh(embolusHighlightGeo, embolusHighlightMat);
  embolusHighlightMesh.name = 'ThoracicEmbolusSite';
  paGroup.add(embolusHighlightMesh);

  // Pulsing gold beacon ring around the occlusion site
  const beaconRingGeo = new THREE.TorusGeometry(2.4, 0.12, 12, 32);
  beaconRingGeo.rotateX(Math.PI / 2);
  beaconRingGeo.translate(-9.8, -2.5, 0.0);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xe6b65c,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });
  const beaconMesh = new THREE.Mesh(beaconRingGeo, beaconMat);
  beaconMesh.name = 'EmbolusBeaconRing';
  paGroup.add(beaconMesh);
  root.add(paGroup);

  // 7. Clot Trajectory Guide Spline Tube (Illuminated transit path from DVT to PE)
  const splineVectors = CLOT_PATH_SPLINE_POINTS.map((p) => new THREE.Vector3(...p));
  const clotPathCurve = new THREE.CatmullRomCurve3(splineVectors);
  const pathTubeGeo = new THREE.TubeGeometry(clotPathCurve, 64, 0.18, 8, false);
  const pathTubeMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.45,
    wireframe: false,
  });
  const pathTubeMesh = new THREE.Mesh(pathTubeGeo, pathTubeMat);
  pathTubeMesh.name = 'ClotTrajectoryGuideTube';
  root.add(pathTubeMesh);

  // 8. Interactive Travelling Embolus Particle Mesh (Scrubbable / Animatable along trajectory)
  const travelingClotGeo = new THREE.SphereGeometry(0.85, 18, 16);
  travelingClotGeo.scale(1.0, 1.4, 0.9);
  const travelingClotMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.9,
  });
  const travelingClotMesh = new THREE.Mesh(travelingClotGeo, travelingClotMat);
  travelingClotMesh.name = 'TravelingClotEmbolus';
  travelingClotMesh.position.copy(splineVectors[0]);
  root.add(travelingClotMesh);

  return root;
}
