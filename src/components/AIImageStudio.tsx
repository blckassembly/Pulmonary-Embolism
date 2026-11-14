/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  X,
  Upload,
  Download,
  AlertCircle,
  RefreshCw,
  Wand2,
  CheckCircle2,
} from 'lucide-react';

interface AIImageStudioProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme: boolean;
}

const PRESET_IMAGE_PROMPTS = [
  {
    title: 'High-Mag Scanning Electron Micrograph (SEM)',
    aspectRatio: '1:1',
    prompt:
      'Ultra high-resolution colorized scanning electron micrograph (SEM) of a human pulmonary embolism clot at 6,000x magnification. Interlacing golden-yellow fibrin strands entrap biconcave red blood cells and stellate activated platelets with radiating pseudopodia. Scientific research grade.',
  },
  {
    title: 'CT Pulmonary Angiogram (CTPA) Saddle PE',
    aspectRatio: '1:1',
    prompt:
      'High-resolution axial computed tomography pulmonary angiography (CTPA) slice of human thorax. Contrast-opacified main pulmonary artery trunk with large low-attenuation saddle embolus straddling the bifurcation into right and left main pulmonary arteries.',
  },
  {
    title: 'Fluorescent Confocal Fibrinolysis Action',
    aspectRatio: '16:9',
    prompt:
      'Laser scanning confocal fluorescence microscopy of fibrin mesh dissolving in vitro under recombinant tPA treatment. Cleaved fibrin fragments highlighted in vibrant cyan, platelet aggregates in magenta, with progressive pore formation and structural degradation.',
  },
  {
    title: 'Dual-Energy CT Lung Perfusion Defect',
    aspectRatio: '1:1',
    prompt:
      'Dual-energy CT lung perfusion iodine map showing bilateral normal lung parenchyma with distinct wedge-shaped triangular hypo-attenuation perfusion defect in the right lower lobe posterior basal segment due to embolic arterial occlusion.',
  },
];

export const AIImageStudio: React.FC<AIImageStudioProps> = ({
  isOpen,
  onClose,
  isDarkTheme,
}) => {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState(PRESET_IMAGE_PROMPTS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultCaption, setResultCaption] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Edit Mode Image Source
  const [sourceImage, setSourceImage] = useState<string | null>(
    '/assets/aistudio/Pulmonary_Embolus_Fibrin_Mesh_c34319b1.png'
  );

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSourceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAction = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setResultImage(null);
    setResultCaption('');

    try {
      if (mode === 'create') {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio, imageSize: '1K' }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Image generation failed.');
        }

        setResultImage(data.imageUrl);
        setResultCaption(data.caption || '');
      } else {
        if (!sourceImage) {
          throw new Error('Please select or upload a reference image to edit.');
        }

        const res = await fetch('/api/edit-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: sourceImage,
            prompt,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Image editing failed.');
        }

        setResultImage(data.imageUrl);
        setResultCaption(data.caption || '');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
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
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Medical Imaging AI Studio</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/30">
                  gemini-nano-banana-2.1
                </span>
              </div>
              <p className="text-xs text-slate-500">
                High-fidelity 1K medical image generation and prompt-directed morphological editing
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

        {/* Mode Selector */}
        <div
          className={`flex items-center gap-2 px-6 py-2.5 border-b text-xs font-medium ${
            isDarkTheme ? 'border-[#232428] bg-[#15161a]' : 'border-slate-100 bg-slate-100/70'
          }`}
        >
          <button
            onClick={() => setMode('create')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'create'
                ? isDarkTheme
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-white text-sky-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Generate New Image</span>
          </button>
          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              mode === 'edit'
                ? isDarkTheme
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-white text-sky-700 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Edit / Enhance Existing Reference</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {mode === 'edit' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Reference Image to Edit
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                {sourceImage ? (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border shadow-sm shrink-0 bg-black">
                    <img
                      src={sourceImage}
                      alt="Source Reference"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border border-dashed flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
                    <span className="text-[10px]">No image selected</span>
                  </div>
                )}
                <div className="space-y-2 text-xs">
                  <p className="text-slate-500">
                    Currently utilizing SEM ground-truth reference image or upload custom histopathology/CTPA images.
                  </p>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-sky-500" />
                    <span>Upload New Custom Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Quick Presets (Create mode) */}
          {mode === 'create' && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Biomedical Imaging Presets
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {PRESET_IMAGE_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(preset.prompt);
                      setAspectRatio(preset.aspectRatio);
                    }}
                    className={`text-left p-3 rounded-xl border text-xs transition-all ${
                      prompt === preset.prompt
                        ? isDarkTheme
                          ? 'border-sky-500/60 bg-sky-500/10 text-sky-300'
                          : 'border-sky-500/60 bg-sky-50/80 text-sky-900 shadow-sm'
                        : isDarkTheme
                        ? 'border-[#28292f] bg-[#17181c] text-slate-300 hover:border-slate-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium mb-1">
                      <span>{preset.title}</span>
                      <span className="font-mono text-[10px] opacity-75">{preset.aspectRatio}</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] opacity-80">{preset.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Editor & Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {mode === 'create' ? 'Image Generation Prompt' : 'Editing Instruction Prompt'}
              </label>
              {mode === 'create' && (
                <div className="flex items-center gap-1 p-0.5 rounded-lg border text-xs font-medium border-slate-300 dark:border-slate-700">
                  {['1:1', '16:9', '4:3', '3:4'].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-2 py-0.5 rounded ${
                        aspectRatio === ratio
                          ? 'bg-sky-500 text-white font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                mode === 'create'
                  ? 'Describe the medical, anatomical, or microscopic image to generate...'
                  : 'Describe how to modify this image (e.g., "Add fluorescent gold stain to the fibrin network, dissolve 50% of the fiber bundles")...'
              }
              className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${
                isDarkTheme
                  ? 'bg-[#18191e] border-[#2b2c32] text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Powered by gemini-nano-banana-2.1 with 1K resolution support
              </span>
              <button
                onClick={handleAction}
                disabled={isLoading || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sky-500/10 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{mode === 'create' ? 'Synthesize Medical Image' : 'Apply Morphological Edit'}</span>
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
                <span className="font-semibold block mb-0.5">Studio Notice</span>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Result Output */}
          {resultImage && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Rendered Biomedical Output</span>
                </div>
                <a
                  href={resultImage}
                  download="pulmonary_embolism_medical_image.png"
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 1K PNG</span>
                </a>
              </div>
              <div className="rounded-xl overflow-hidden border shadow-lg bg-black flex items-center justify-center max-h-[480px]">
                <img
                  src={resultImage}
                  alt="AI Generated Result"
                  className="max-h-[480px] w-auto object-contain"
                />
              </div>
              {resultCaption && (
                <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  {resultCaption}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
