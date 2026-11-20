/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ScaleLevel } from '../../types/biomedical.ts';

export interface SpatialAudioState {
  active: boolean;
  muted: boolean;
  unlocked: boolean;
  proximity: number; // normalized [0..1] closeness to impacted fibrin microstructure
  distanceMeters: number;
}

export interface SpatialAudioUpdateParams {
  listenerCamera: THREE.Camera;
  targetWorldPosition: THREE.Vector3;
  isVRActive: boolean;
  isPresenting: boolean;
  scale: ScaleLevel;
  flowSpeedScale: number;
  elapsedSeconds: number;
}

/**
 * 3D HRTF Spatialized Audio Manager for VR/MR navigation.
 *
 * Procedurally synthesizes a subtle, organic "thrombus-pulse" ambient soundscape
 * anchored in 3D space to the impacted fibrin microstructure:
 *   1. Low-frequency sub-vascular systolic/diastolic pulse (~66-74 BPM)
 *   2. Resonant low-passed interstitial percolation shimmer that gently swells
 *      as the viewer approaches or enters the 50 µm fibrin matrix.
 *
 * Uses zero external audio assets and remains silent outside VR/Quest sessions.
 */
export class ThrombusSpatialAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private panner: PannerNode | null = null;

  // Sub-vascular pulse layer
  private pulseOsc: OscillatorNode | null = null;
  private pulseHarmonicOsc: OscillatorNode | null = null;
  private pulseFilter: BiquadFilterNode | null = null;
  private pulseGain: GainNode | null = null;

  // Fibrin interstitial percolation texture layer
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private muted = false;
  private isBuilt = false;
  private isDisposed = false;

  // Beat scheduling & smoothing state
  private nextBeatPhase = 0;
  private smoothedProximity = 0;
  private lastEmitTimeMs = 0;
  private lastEmittedSignature = '';

  // Reusable 3D math scratch vectors (zero per-frame allocations)
  private tempListenerPos = new THREE.Vector3();
  private tempListenerQuat = new THREE.Quaternion();
  private tempForward = new THREE.Vector3();
  private tempUp = new THREE.Vector3();

  /**
   * Must be called from a user interaction gesture (e.g., Enter VR / Quest Sim / Unmute)
   * to create and resume the browser Web Audio context.
   */
  public async unlock(): Promise<boolean> {
    if (this.isDisposed || typeof window === 'undefined') return false;

    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return false;

    if (!this.ctx) {
      this.ctx = new AudioCtxCtor();
      this.buildAudioGraph(this.ctx);
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }

    return this.ctx.state === 'running';
  }

  private buildAudioGraph(ctx: AudioContext): void {
    if (this.isBuilt) return;
    this.isBuilt = true;

    // Master output gain (starts silent; ramps smoothly with VR proximity)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0, ctx.currentTime);
    masterGain.connect(ctx.destination);
    this.masterGain = masterGain;

    // 3D HRTF Spatial Panner anchored to the impacted fibrin microstructure
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 0.5;
    panner.maxDistance = 24;
    panner.rolloffFactor = 1.15;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 1.0;
    panner.connect(masterGain);
    this.panner = panner;

    // --- Layer 1: Subtle Sub-Vascular "Thrombus-Pulse" Tone ---
    const pulseFilter = ctx.createBiquadFilter();
    pulseFilter.type = 'lowpass';
    pulseFilter.frequency.setValueAtTime(115, ctx.currentTime);
    pulseFilter.Q.setValueAtTime(1.8, ctx.currentTime);

    const pulseGain = ctx.createGain();
    pulseGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const pulseOsc = ctx.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.setValueAtTime(52, ctx.currentTime);

    const pulseHarmonicOsc = ctx.createOscillator();
    pulseHarmonicOsc.type = 'triangle';
    pulseHarmonicOsc.frequency.setValueAtTime(104, ctx.currentTime);

    const harmonicTrim = ctx.createGain();
    harmonicTrim.gain.setValueAtTime(0.24, ctx.currentTime);

    pulseOsc.connect(pulseFilter);
    pulseHarmonicOsc.connect(harmonicTrim);
    harmonicTrim.connect(pulseFilter);
    pulseFilter.connect(pulseGain);
    pulseGain.connect(panner);

    pulseOsc.start();
    pulseHarmonicOsc.start();

    this.pulseOsc = pulseOsc;
    this.pulseHarmonicOsc = pulseHarmonicOsc;
    this.pulseFilter = pulseFilter;
    this.pulseGain = pulseGain;

    // --- Layer 2: Soft Pink-Noise Fibrin Micro-Percolation Shimmer ---
    const sampleRate = ctx.sampleRate;
    const bufferLength = sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferLength, sampleRate);
    const channelData = noiseBuffer.getChannelData(0);

    // Paul Kellet pink-noise approximation for warm, organic fluid texture
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < bufferLength; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      channelData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(240, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.4, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(panner);
    noiseSource.start();

    this.noiseSource = noiseSource;
    this.noiseFilter = noiseFilter;
    this.noiseGain = noiseGain;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      if (muted) {
        this.masterGain.gain.setTargetAtTime(0.0, now, 0.06);
      }
    }
    this.lastEmittedSignature = '';
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMuted(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      void this.unlock();
    }
    return this.muted;
  }

  public isUnlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /**
   * Updates 3D listener pose, HRTF panner position, and proximity-driven thrombus-pulse
   * synthesis each frame. Returns a new SpatialAudioState only when throttled UI state changes.
   */
  public update(params: SpatialAudioUpdateParams): SpatialAudioState | null {
    if (this.isDisposed) return null;

    const {
      listenerCamera,
      targetWorldPosition,
      isVRActive,
      isPresenting,
      scale,
      flowSpeedScale,
      elapsedSeconds,
    } = params;

    listenerCamera.getWorldPosition(this.tempListenerPos);
    const rawDistance = this.tempListenerPos.distanceTo(targetWorldPosition);

    // Calibrate proximity envelope for real-world VR meters vs desktop Quest Sim scale
    const nearDist = isPresenting ? 0.28 : 4.5;
    const farDist = isPresenting ? 2.85 : 26.0;
    const linearProx = THREE.MathUtils.clamp(
      1.0 - (rawDistance - nearDist) / Math.max(0.01, farDist - nearDist),
      0,
      1
    );

    // Smoothstep + gentle boost when immersed directly at the 50 µm Fibrin microstructure scale
    const easedProx = linearProx * linearProx * (3 - 2 * linearProx);
    const scaleBoost = scale === 'microscopic' ? 0.22 : scale === 'clot' ? 0.08 : 0.0;
    const targetProximity = isVRActive
      ? THREE.MathUtils.clamp(easedProx + scaleBoost * (0.4 + 0.6 * easedProx), 0, 1)
      : 0;

    this.smoothedProximity = THREE.MathUtils.lerp(this.smoothedProximity, targetProximity, 0.1);

    const unlocked = this.isUnlocked();
    const shouldSound = isVRActive && !this.muted && unlocked && this.smoothedProximity > 0.02;

    if (this.ctx && this.masterGain && this.panner && this.pulseGain && this.pulseFilter && this.pulseOsc && this.pulseHarmonicOsc && this.noiseGain && this.noiseFilter) {
      const now = this.ctx.currentTime;

      // Keep panner attenuation aligned with active coordinate scale
      const desiredRef = isPresenting ? 0.45 : 5.0;
      if (Math.abs(this.panner.refDistance - desiredRef) > 0.05) {
        this.panner.refDistance = desiredRef;
        this.panner.maxDistance = isPresenting ? 8.0 : 48.0;
      }

      // 1. Update 3D AudioListener pose from active HMD / VR Camera
      listenerCamera.getWorldQuaternion(this.tempListenerQuat);
      this.tempForward.set(0, 0, -1).applyQuaternion(this.tempListenerQuat).normalize();
      this.tempUp.set(0, 1, 0).applyQuaternion(this.tempListenerQuat).normalize();

      const listener = this.ctx.listener;
      if (listener.positionX) {
        listener.positionX.setTargetAtTime(this.tempListenerPos.x, now, 0.02);
        listener.positionY.setTargetAtTime(this.tempListenerPos.y, now, 0.02);
        listener.positionZ.setTargetAtTime(this.tempListenerPos.z, now, 0.02);
        listener.forwardX.setTargetAtTime(this.tempForward.x, now, 0.02);
        listener.forwardY.setTargetAtTime(this.tempForward.y, now, 0.02);
        listener.forwardZ.setTargetAtTime(this.tempForward.z, now, 0.02);
        listener.upX.setTargetAtTime(this.tempUp.x, now, 0.02);
        listener.upY.setTargetAtTime(this.tempUp.y, now, 0.02);
        listener.upZ.setTargetAtTime(this.tempUp.z, now, 0.02);
      } else {
        listener.setPosition(this.tempListenerPos.x, this.tempListenerPos.y, this.tempListenerPos.z);
        listener.setOrientation(
          this.tempForward.x,
          this.tempForward.y,
          this.tempForward.z,
          this.tempUp.x,
          this.tempUp.y,
          this.tempUp.z
        );
      }

      // 2. Anchor 3D HRTF Panner directly to the impacted fibrin microstructure
      if (this.panner.positionX) {
        this.panner.positionX.setTargetAtTime(targetWorldPosition.x, now, 0.03);
        this.panner.positionY.setTargetAtTime(targetWorldPosition.y, now, 0.03);
        this.panner.positionZ.setTargetAtTime(targetWorldPosition.z, now, 0.03);
      } else {
        this.panner.setPosition(targetWorldPosition.x, targetWorldPosition.y, targetWorldPosition.z);
      }

      // 3. Modulate subtle "thrombus-pulse" cardiac envelope & fibrin percolation filter
      if (shouldSound) {
        const prox = this.smoothedProximity;
        // Subtle physiological cadence (~68 BPM baseline, gently responsive to flowSpeedScale)
        const bpm = (66 + prox * 6) * THREE.MathUtils.clamp(flowSpeedScale, 0.4, 1.4);
        const beatPeriod = 60 / bpm;
        const phase = (elapsedSeconds % beatPeriod) / beatPeriod; // [0..1]

        // Double-peak vascular pulse envelope: primary systolic thump (0.08) + softer dicrotic notch (0.34)
        const systolic = Math.exp(-Math.pow((phase - 0.08) / 0.065, 2));
        const diastolic = 0.52 * Math.exp(-Math.pow((phase - 0.34) / 0.085, 2));
        const pulseEnv = Math.min(1, systolic + diastolic);

        // Subtle pitch glide during systolic compression (56Hz -> 44Hz)
        const baseFreq = 45 + 11 * systolic + (scale === 'microscopic' ? 4 : 0);
        this.pulseOsc.frequency.setTargetAtTime(baseFreq, now, 0.025);
        this.pulseHarmonicOsc.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.025);

        // Warm lowpass opens gently with proximity and pulse peak
        const cutoff = 85 + prox * 90 + pulseEnv * 75;
        this.pulseFilter.frequency.setTargetAtTime(cutoff, now, 0.03);

        // Keep ambient gain genuinely subtle (max ~0.16 master * envelope)
        const subLevel = (0.04 + 0.16 * pulseEnv) * prox;
        this.pulseGain.gain.setTargetAtTime(subLevel, now, 0.025);

        // Interstitial percolation shimmer fades in mostly at close range / fibrin scale
        const microFactor = scale === 'microscopic' ? 1.0 : 0.45;
        const shimmerProx = Math.max(0, (prox - 0.2) / 0.8);
        const shimmerLevel = shimmerProx * shimmerProx * microFactor * (0.035 + 0.045 * pulseEnv);
        this.noiseFilter.frequency.setTargetAtTime(210 + prox * 240 + pulseEnv * 110, now, 0.04);
        this.noiseGain.gain.setTargetAtTime(shimmerLevel, now, 0.04);

        this.masterGain.gain.setTargetAtTime(0.85, now, 0.12);
        this.nextBeatPhase = phase;
      } else {
        this.masterGain.gain.setTargetAtTime(0.0, now, 0.14);
        this.nextBeatPhase = 0;
      }
    }

    // Throttle UI state emissions to ~4 Hz (or immediately on active/mute changes)
    const nowMs = performance.now();
    const roundedProx = Math.round(this.smoothedProximity * 100) / 100;
    const roundedDist = Math.round(rawDistance * 100) / 100;
    const sig = `${isVRActive ? 1 : 0}|${this.muted ? 1 : 0}|${unlocked ? 1 : 0}|${Math.round(roundedProx * 20)}`;

    if (sig !== this.lastEmittedSignature && (nowMs - this.lastEmitTimeMs >= 200 || !isVRActive)) {
      this.lastEmittedSignature = sig;
      this.lastEmitTimeMs = nowMs;
      return {
        active: isVRActive && !this.muted && unlocked,
        muted: this.muted,
        unlocked,
        proximity: roundedProx,
        distanceMeters: roundedDist,
      };
    }

    return null;
  }

  public getBeatPhase(): number {
    return this.nextBeatPhase;
  }

  public dispose(): void {
    this.isDisposed = true;
    try {
      this.pulseOsc?.stop();
      this.pulseHarmonicOsc?.stop();
      this.noiseSource?.stop();
    } catch {
      // Ignore already-stopped AudioScheduledSourceNode errors
    }
    this.pulseOsc?.disconnect();
    this.pulseHarmonicOsc?.disconnect();
    this.noiseSource?.disconnect();
    this.pulseFilter?.disconnect();
    this.pulseGain?.disconnect();
    this.noiseFilter?.disconnect();
    this.noiseGain?.disconnect();
    this.panner?.disconnect();
    this.masterGain?.disconnect();

    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.isBuilt = false;
  }
}
