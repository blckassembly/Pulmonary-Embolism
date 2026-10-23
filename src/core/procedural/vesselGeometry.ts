/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates the pulmonary arterial vessel cutaway geometry with bifurcation
 * and wall thickness.
 */
export function createVesselCutawayGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'VesselCutawayGroup';

  // Main arterial trunk path
  const curveMain = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-14, 0, 0),
    new THREE.Vector3(-6, 0.2, 0),
    new THREE.Vector3(0, 0, 0),
  ]);

  // Superior branch path
  const curveSup = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(6, 2.5, 0.5),
    new THREE.Vector3(14, 4.8, 1.2),
  ]);

  // Inferior branch path (where embolus lodges)
  const curveInf = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(6, -2.4, -0.5),
    new THREE.Vector3(14, -4.5, -1.0),
  ]);

  // Outer vessel wall (translucent vascular adventitia/media)
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: 0x8a2b36,
    roughness: 0.28,
    metalness: 0.08,
    transmission: 0.42,
    transparent: true,
    opacity: 0.65,
    ior: 1.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Inner luminal intima lining (smooth, pale pink/amber endothelial sheen)
  const intimaMat = new THREE.MeshStandardMaterial({
    color: 0x9e3845,
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });

  // Tube cutaways (using open cylinder / partial angle for cutaway inspection)
  // Three.js TubeGeometry generates full tubes. We can cut away a 110-degree window
  // using custom tube generation or clipping planes!
  // Let's create the branches with TubeGeometry
  const mainTube = new THREE.Mesh(new THREE.TubeGeometry(curveMain, 24, 2.8, 20, false), wallMat);
  const supTube = new THREE.Mesh(new THREE.TubeGeometry(curveSup, 24, 2.1, 20, false), wallMat);
  const infTube = new THREE.Mesh(new THREE.TubeGeometry(curveInf, 24, 2.3, 20, false), wallMat);

  mainTube.renderOrder = 2;
  supTube.renderOrder = 2;
  infTube.renderOrder = 2;

  group.add(mainTube);
  group.add(supTube);
  group.add(infTube);

  // Vessel bifurcation bifurcation cuff
  const cuffGeo = new THREE.SphereGeometry(3.0, 24, 16);
  cuffGeo.scale(1.1, 1.0, 0.9);
  const cuffMesh = new THREE.Mesh(cuffGeo, wallMat);
  cuffMesh.renderOrder = 2;
  group.add(cuffMesh);

  return group;
}

/**
 * Creates the macro thrombus body lodged in the arterial branch.
 */
export function createEmbolusMacroMesh(): THREE.Mesh {
  // Irregular oblong saddle/lobar embolus
  const clotGeo = new THREE.CylinderGeometry(1.65, 1.2, 5.8, 20, 16);
  clotGeo.rotateZ(Math.PI / 2);
  clotGeo.translate(3.5, -1.3, -0.2);

  // Deform vertices organically to simulate cast of deep vein valves and lines of Zahn
  const pos = clotGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    // Lines of Zahn ripple texture
    const wave = 0.16 * Math.sin(x * 6.0) + 0.12 * Math.cos(y * 5.0 + z * 4.0);
    // Flatten bottom against vessel wall
    const wallSquash = y < -1.0 ? 0.82 : 1.0;

    pos.setXYZ(i, x + wave * 0.5, (y + wave) * wallSquash, z + wave);
  }
  clotGeo.computeVertexNormals();

  const clotMat = new THREE.MeshStandardMaterial({
    color: 0x4a1218, // dark deoxygenated thrombus crimson
    roughness: 0.65,
    metalness: 0.1,
    bumpScale: 0.08,
  });

  const mesh = new THREE.Mesh(clotGeo, clotMat);
  mesh.name = 'EmbolusMacroMesh';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Procedural streamline flow particle system.
 * Flow advances along vascular paths, compressing through the stenosis.
 */
export class HemodynamicParticles {
  public mesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private count = 280;
  private particleData: {
    t: number;
    speed: number;
    branch: 'superior' | 'inferior';
    lateralOffset: THREE.Vector3;
    baseScale: number;
  }[] = [];
  private color = new THREE.Color();

  constructor() {
    const geom = new THREE.SphereGeometry(0.12, 8, 8);
    geom.scale(1.8, 0.8, 0.8); // elongated streamline particle
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });

    this.mesh = new THREE.InstancedMesh(geom, mat, this.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize particles along vessel paths
    for (let i = 0; i < this.count; i++) {
      const branch = Math.random() > 0.45 ? 'inferior' : 'superior';
      const t = Math.random();
      const speed = 0.12 + Math.random() * 0.18;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.7) * 1.5;

      this.particleData.push({
        t,
        speed,
        branch,
        lateralOffset: new THREE.Vector3(0, Math.sin(angle) * r, Math.cos(angle) * r),
        baseScale: 0.8 + Math.random() * 0.5,
      });
    }

    this.update(0, 0.7); // initial update
  }

  public update(delta: number, obstructionFactor: number): void {
    for (let i = 0; i < this.count; i++) {
      const p = this.particleData[i];

      // Advance parameter t along vessel
      // Obstruction slows flow through inferior branch and accelerates at stenosis jet
      let speedMultiplier = 1.0;
      if (p.branch === 'inferior') {
        if (p.t > 0.4 && p.t < 0.7) {
          // Jet constriction acceleration
          speedMultiplier = 1.0 + obstructionFactor * 1.8;
        } else if (p.t >= 0.7) {
          // Post-stenotic recirculation & stagnation
          speedMultiplier = Math.max(0.18, 1.0 - obstructionFactor * 0.82);
        }
      } else {
        // Diversion of flow into unobstructed superior branch
        speedMultiplier = 1.0 + obstructionFactor * 0.5;
      }

      p.t += p.speed * speedMultiplier * (delta * 0.8 + 0.016);
      if (p.t > 1.0) p.t -= 1.0;

      // Calculate 3D position
      let pos = new THREE.Vector3();
      const t = p.t;

      if (t < 0.4) {
        // Main trunk: x from -14 to 0
        const localT = t / 0.4;
        pos.set(-14 + localT * 14, 0.1 * Math.sin(localT * Math.PI), 0);
        pos.add(p.lateralOffset.clone().multiplyScalar(1.0 - 0.2 * localT));
      } else {
        // In branch: x from 0 to 14
        const localT = (t - 0.4) / 0.6;
        if (p.branch === 'superior') {
          pos.set(localT * 14, localT * 4.8, localT * 1.2);
          pos.add(p.lateralOffset.clone().multiplyScalar(0.9));
        } else {
          // Inferior branch with clot
          const x = localT * 14;
          const y = -localT * 4.5;
          const z = -localT * 1.0;
          pos.set(x, y, z);

          // If passing through clot zone (x between 1 and 6), compress lateral offset into eccentric lumen
          if (x > 0.8 && x < 6.5) {
            const clotPush = Math.sin(((x - 0.8) / 5.7) * Math.PI) * obstructionFactor * 1.35;
            pos.y += clotPush; // squeezed toward upper vessel wall
            pos.add(p.lateralOffset.clone().multiplyScalar(Math.max(0.2, 1.0 - obstructionFactor * 0.75)));
          } else {
            pos.add(p.lateralOffset.clone().multiplyScalar(0.9));
          }
        }
      }

      // Orientation & velocity color mapping
      this.dummy.position.copy(pos);
      // Particle color: blue/cyan (slow/normal) -> green -> gold/orange (high velocity jet) -> purple (recirculation)
      let velocityMetric = speedMultiplier;
      if (p.branch === 'inferior' && p.t >= 0.7 && obstructionFactor > 0.5) {
        // Recirculation wake color (deep purple / cyan)
        this.color.setHex(0x38bdf8);
      } else if (velocityMetric > 1.7) {
        this.color.setHex(0xe6b65c); // high shear gold jet
      } else if (velocityMetric > 1.2) {
        this.color.setHex(0x10b981); // green accelerated
      } else {
        this.color.setHex(0x3b82f6); // laminar blue
      }

      this.mesh.setColorAt(i, this.color);
      this.dummy.scale.set(p.baseScale * (velocityMetric > 1.5 ? 1.8 : 1.0), p.baseScale, p.baseScale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
