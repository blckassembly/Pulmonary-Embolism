/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Film,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Download,
  AlertCircle,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface AIVideoStudioProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

const PRESET_PROMPTS = [
  {
    title: 'Microscopic Fibrinolysis (tPA Action)',
    aspectRatio: '16:9' as const,
    duration: '5s' as const,
    prompt:
      'Ultra high-resolution confocal microscopy showing crosslinked fibrin fibers within a pulmonary artery thrombus dissolving rapidly as recombinant tPA enzyme activates plasmin. Gold-fluorescent enzyme perfusion.',
  },
  {
    title: 'Arterial Jet Shear & Platelet Activation',
    aspectRatio: '16:9' as const,
    duration: '5s' as const,
    prompt:
      'Medical scientific 3D cinematic animation inside a bifurcated human pulmonary artery: red blood cells and platelets squeeze through an eccentric thromboembolic occlusion under extreme jet shear stress.',
  },
  {
    title: 'Thoracic Wedge Infarction Perfusion',
    aspectRatio: '9:16' as const,
    duration: '5s' as const,
    prompt:
      'Vertical anatomical animation of transparent human lungs showing blood flow interruption in the right lower lobe, leading to wedge-shaped pulmonary parenchymal ischemia and alveolar hypoperfusion.',
  },
  {
    title: 'Erythrocyte Trapping in Catmull-Rom Mesh',
    aspectRatio: '16:9' as const,
    duration: '10s' as const,
    prompt:
      'SEM scanning electron microscopy animation moving through a dense three-dimensional mesh of fibrin strands, capturing Evans-Fung biconcave erythrocytes and dendritic activated platelets.',
  },
];

export const AIVideoStudio: React.FC<AIVideoStudioProps> = ({
  isOpen,
  onClose,
  isDarkTheme,
}) => {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<'5s' | '10s'>('5s');
  const [isLoading, setIsLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setVideoUrl(null);
    setElapsedSeconds(0);

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio, duration }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Video generation failed.');
      }

      if (data.videoData) {
        const mime = data.mimeType || 'video/mp4';
        setVideoUrl(`data:${mime};base64,${data.videoData}`);
      } else if (data.videoUri) {
        setVideoUrl(data.videoUri);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during video generation.');
    } finally {
      clearInterval(timer);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDarkTheme
            ? 'bg-[#121316] border-[#2a2b30] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkTheme ? 'border-[#232428] bg-[#16171b]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Gemini Omni Video Studio</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                  gemini-omni-1.1-flash
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Text-to-Video generation using Gemini Interactions API (16:9 Landscape & 9:16 Portrait)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDarkTheme
                ? 'hover:bg-slate-800 text-slate-400 border-transparent hover:border-slate-700'
                : 'hover:bg-slate-200 text-slate-500 border-transparent hover:border-slate-300'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Preset Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Scientific Visualization Presets
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(preset.prompt);
                    setAspectRatio(preset.aspectRatio);
                    setDuration(preset.duration);
                  }}
                  className={`text-left p-3 rounded-xl border text-xs transition-all ${
                    prompt === preset.prompt
                      ? isDarkTheme
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                        : 'border-amber-500/60 bg-amber-50/80 text-amber-900 shadow-sm'
                      : isDarkTheme
                      ? 'border-[#28292f] bg-[#17181c] text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-medium mb-1">
                    <span>{preset.title}</span>
                    <span className="font-mono text-[10px] opacity-75">{preset.aspectRatio} · {preset.duration}</span>
                  </div>
                  <p className="line-clamp-2 text-[11px] opacity-80">{preset.prompt}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Editor & Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Generation Prompt
              </label>
              <div className="flex items-center gap-3">
                {/* Aspect Ratio Selector */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg border text-xs font-medium border-slate-300 dark:border-slate-700">
                  <button
                    onClick={() => setAspectRatio('16:9')}
                    className={`px-2 py-0.5 rounded ${
                      aspectRatio === '16:9'
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`px-2 py-0.5 rounded ${
                      aspectRatio === '9:16'
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    9:16 Vertical
                  </button>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg border text-xs font-medium border-slate-300 dark:border-slate-700">
                  <button
                    onClick={() => setDuration('5s')}
                    className={`px-2 py-0.5 rounded ${
                      duration === '5s'
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    5s
                  </button>
                  <button
                    onClick={() => setDuration('10s')}
                    className={`px-2 py-0.5 rounded ${
                      duration === '10s'
                        ? 'bg-amber-500 text-black font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    10s
                  </button>
                </div>
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe the medical or anatomical simulation video to generate..."
              className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
                isDarkTheme
                  ? 'bg-[#18191e] border-[#2b2c32] text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Uses Google GenAI Interactions API with server-side proxy
              </span>
              <button
                onClick={handleGenerate}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/10 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Rendering Video ({elapsedSeconds}s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Simulation Video</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Generation Notice</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-8 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center space-y-3">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                <Film className="absolute inset-0 m-auto w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-medium">Processing with gemini-omni-1.1-flash</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Synthesizing temporal flow streamlines and biophysical rendering ({elapsedSeconds}s elapsed)...
                </p>
              </div>
            </div>
          )}

          {/* Generated Video Output */}
          {videoUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Generated Video Simulation</span>
                </div>
                <a
                  href={videoUrl}
                  download="pulmonary_embolism_simulation.mp4"
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
              </div>
              <div
                className={`relative rounded-xl overflow-hidden border shadow-lg flex items-center justify-center bg-black ${
                  aspectRatio === '9:16' ? 'max-w-xs mx-auto aspect-[9/16]' : 'w-full aspect-video'
                }`}
              >
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
