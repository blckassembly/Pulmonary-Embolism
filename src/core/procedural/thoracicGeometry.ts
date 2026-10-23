/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates the whole thoracic anatomical model:
 * - Transparent right & left lungs (anatomically shaped lobes)
 * - Tracheobronchial tree (trachea, carina, mainstem bronchi)
 * - Pulmonary vascular arterial tree (trunk, right & left pulmonary arteries, segmental branches)
 * - Cardiac silhouette
 * - Engineering gold highlighted embolus occlusion site
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
  root.add(rightLungGroup);

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
  root.add(leftLungGroup);

  // 2. Cardiac Silhouette (Anatomical context at mediastinum)
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
  root.add(heartMesh);

  // 3. Tracheobronchial Airway Tree
  const airwayMat = new THREE.MeshStandardMaterial({
    color: 0xd4d8e2, // cartilaginous airway white/platinum
    roughness: 0.42,
    metalness: 0.1,
  });

  // Trachea
  const tracheaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 19, 0),
    new THREE.Vector3(0.1, 12, 0.2),
    new THREE.Vector3(0.2, 6.5, 0.4), // Carina at T4/T5
  ]);
  const tracheaMesh = new THREE.Mesh(new THREE.TubeGeometry(tracheaCurve, 16, 1.25, 12, false), airwayMat);
  root.add(tracheaMesh);

  // Right mainstem bronchus (steeper, wider)
  const rBronchusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 6.5, 0.4),
    new THREE.Vector3(-3.5, 4.0, -0.2),
    new THREE.Vector3(-7.2, 1.5, -0.8),
  ]);
  const rBronchusMesh = new THREE.Mesh(new THREE.TubeGeometry(rBronchusCurve, 14, 0.95, 10, false), airwayMat);
  root.add(rBronchusMesh);

  // Left mainstem bronchus (longer, more horizontal)
  const lBronchusCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.2, 6.5, 0.4),
    new THREE.Vector3(4.2, 4.5, -0.3),
    new THREE.Vector3(8.0, 2.8, -0.6),
  ]);
  const lBronchusMesh = new THREE.Mesh(new THREE.TubeGeometry(lBronchusCurve, 14, 0.85, 10, false), airwayMat);
  root.add(lBronchusMesh);

  // 4. Pulmonary Arterial Tree (Vessels in distinct deoxygenated arterial crimson/blue)
  const paMat = new THREE.MeshStandardMaterial({
    color: 0x3b82f6, // deoxygenated pulmonary blood blue/indigo
    roughness: 0.35,
    metalness: 0.2,
  });

  // Pulmonary trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.5, -1.5, 3.0),
    new THREE.Vector3(0.2, 2.5, 2.0),
    new THREE.Vector3(-0.2, 5.0, 1.2), // bifurcation
  ]);
  const trunkMesh = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 16, 1.5, 14, false), paMat);
  root.add(trunkMesh);

  // Right Pulmonary Artery (courses posterior to ascending aorta)
  const rpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 5.0, 1.2),
    new THREE.Vector3(-4.5, 4.2, 0.5),
    new THREE.Vector3(-8.5, 2.0, 0.2),
  ]);
  const rpaMesh = new THREE.Mesh(new THREE.TubeGeometry(rpaCurve, 16, 1.2, 12, false), paMat);
  root.add(rpaMesh);

  // Right lower lobe lobar artery (site of embolus)
  const rllCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.5, 2.0, 0.2),
    new THREE.Vector3(-9.8, -2.5, 0.0),
    new THREE.Vector3(-10.8, -7.5, -0.4),
  ]);
  const rllMesh = new THREE.Mesh(new THREE.TubeGeometry(rllCurve, 16, 0.95, 10, false), paMat);
  root.add(rllMesh);

  // Left Pulmonary Artery
  const lpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 5.0, 1.2),
    new THREE.Vector3(4.2, 5.2, 0.8),
    new THREE.Vector3(8.5, 3.8, 0.4),
    new THREE.Vector3(10.5, -2.0, 0.1),
  ]);
  const lpaMesh = new THREE.Mesh(new THREE.TubeGeometry(lpaCurve, 20, 1.15, 12, false), paMat);
  root.add(lpaMesh);

  // 5. Embolus Highlight Site (Engineering Gold highlight on Right Lower Lobe Artery)
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
  root.add(embolusHighlightMesh);

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
  root.add(beaconMesh);

  return root;
}
