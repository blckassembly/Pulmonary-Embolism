/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Layers,
  Cpu,
  Brain,
  Heart,
  Activity,
  FileCheck2,
  Loader2,
  Play,
} from 'lucide-react';
import { ReconstructedPresentation } from '../types/biomedical.ts';

interface BodyPartUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPresentationReady: (presentation: ReconstructedPresentation) => void;
  currentPresentationId: string;
  presentations: ReconstructedPresentation[];
  onSelectPresentation: (presentation: ReconstructedPresentation | null) => void;
  isDarkTheme: boolean;
}

interface UploadedFilePreview {
  id: string;
  name: string;
  size: string;
  dataUrl: string;
}

export const BodyPartUploadDrawer: React.FC<BodyPartUploadDrawerProps> = ({
  isOpen,
  onClose,
  onPresentationReady,
  currentPresentationId,
  presentations,
  onSelectPresentation,
  isDarkTheme,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);
  const [bodyPartHint, setBodyPartHint] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick preset loader
  const handleLoadReferenceFibrin = async () => {
    try {
      const response = await fetch('/assets/aistudio/Fibrin_Network__3D_Blood_Clot_Visualization_c016282a.png');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles([
          {
            id: `ref_${Date.now()}`,
            name: 'Fibrin_Network__3D_Blood_Clot_Visualization.png',
            size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
            dataUrl: reader.result as string,
          },
        ]);
        setBodyPartHint('Fibrin Network: 3D Microstructural Model of a Blood Clot');
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Failed to load local reference image:', e);
    }
  };

  const handleSelectPreset = (name: string, hint: string) => {
    setBodyPartHint(hint);
    // Provide a placeholder image if none uploaded yet
    if (uploadedFiles.length === 0) {
      handleLoadReferenceFibrin();
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles: UploadedFilePreview[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          newFiles.push({
            id: `${file.name}_${Date.now()}_${Math.random()}`,
            name: file.name,
            size: `${(file.size / 1024).toFixed(1)} KB`,
            dataUrl: reader.result,
          });
          if (newFiles.length === files.length) {
            setUploadedFiles((prev) => [...prev, ...newFiles]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAll = () => {
    setUploadedFiles([]);
  };

  const handleStartReconstruction = async () => {
    if (uploadedFiles.length === 0) {
      // Auto load reference if user clicks generate without uploading
      await handleLoadReferenceFibrin();
    }

    setIsProcessing(true);
    setProcessingStep('Step 1/4: Analyzing multi-image anatomical features & morphology...');

    try {
      // Multi-step animated clinical progress feedback
      const stepTimer1 = setTimeout(() => {
        setProcessingStep('Step 2/4: Segmenting microvascular boundaries and volumetric tissue contours...');
      }, 900);

      const stepTimer2 = setTimeout(() => {
        setProcessingStep('Step 3/4: Generating biophysical graph nodes, edges & Three.js fiber meshes...');
      }, 1800);

      const stepTimer3 = setTimeout(() => {
        setProcessingStep('Step 4/4: Compiling 4-scale presentation and clinical hemodynamics...');
      }, 2700);

      const response = await fetch('/api/reconstruct-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: uploadedFiles.map((f) => f.dataUrl),
          bodyPartHint: bodyPartHint || 'Microstructural Blood Clot & Vasculature',
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const data = await response.json();
      if (data.success && data.presentation) {
        onPresentationReady(data.presentation);
        onClose();
      } else {
        throw new Error(data.error || 'Reconstruction failed.');
      }
    } catch (err: any) {
      console.error('Error reconstructing 3D presentation:', err);
      alert(`Reconstruction error: ${err.message || 'Please try again.'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      />

      {/* Slide-over Drawer */}
      <aside
        aria-label="3D Presentation Studio"
        className={`relative z-10 w-full max-w-xl h-full flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-r ${
          isDarkTheme
            ? 'bg-[#101114] text-white border-[#2a2b2e]'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#deb35a]/15 text-[#deb35a] border border-[#deb35a]/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">3D Presentation Studio</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload multiple images to reconstruct other body parts in Three.js
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkTheme
                ? 'hover:bg-[#1f2025] text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Quick Presets Carousel */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Anatomical Presets
              </label>
              <button
                type="button"
                onClick={handleLoadReferenceFibrin}
                className="text-xs font-medium text-[#deb35a] hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load Attached Reference</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleSelectPreset(
                    'Fibrin Microstructure',
                    'Fibrin Network: 3D Microstructural Model of a Blood Clot'
                  )
                }
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isDarkTheme
                    ? 'border-[#2a2b2e] hover:border-[#deb35a]/50 bg-[#15161a] hover:bg-[#1a1b22]'
                    : 'border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50'
                }`}
              >
                <Activity className="w-4 h-4 text-[#deb35a] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Fibrin Clot Network</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    User attachment (Panels A–F)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectPreset(
                    'Brain Stroke',
                    'Cerebrovascular Stroke: Middle Cerebral Artery (MCA)'
                  )
                }
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isDarkTheme
                    ? 'border-[#2a2b2e] hover:border-blue-500/50 bg-[#15161a] hover:bg-[#1a1b22]'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50'
                }`}
              >
                <Brain className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Cerebral Artery Stroke</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    MCA Ischemic Thromboembolus
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectPreset(
                    'Coronary LAD',
                    'Coronary Thrombosis: Left Anterior Descending (LAD) Artery'
                  )
                }
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isDarkTheme
                    ? 'border-[#2a2b2e] hover:border-red-500/50 bg-[#15161a] hover:bg-[#1a1b22]'
                    : 'border-slate-200 hover:border-red-400 bg-slate-50 hover:bg-red-50/50'
                }`}
              >
                <Heart className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Coronary LAD Artery</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Myocardial Infarction Plaque
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSelectPreset(
                    'Deep Vein Thrombosis',
                    'Deep Vein Thrombosis (DVT): Femoral & Popliteal Vein'
                  )
                }
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                  isDarkTheme
                    ? 'border-[#2a2b2e] hover:border-purple-500/50 bg-[#15161a] hover:bg-[#1a1b22]'
                    : 'border-slate-200 hover:border-purple-400 bg-slate-50 hover:bg-purple-50/50'
                }`}
              >
                <Layers className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold">Deep Vein (DVT)</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Venous Valve Embolus Origin
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Multiple Image Drop Zone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Upload Diagnostic Images
              </label>
              {uploadedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All ({uploadedFiles.length})</span>
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-[#deb35a] bg-[#deb35a]/10'
                  : isDarkTheme
                  ? 'border-[#2a2b2e] hover:border-[#deb35a]/60 bg-[#15161a]'
                  : 'border-slate-300 hover:border-amber-400 bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-[#deb35a]/15 text-[#deb35a]">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-medium">
                  Drag and drop multiple CT, MRI, histology, or SEM micrographs
                </div>
                <div className="text-[11px] text-slate-400">
                  Direct in-app processing (PNG, JPG, WEBP)
                </div>
              </div>
            </div>

            {/* Uploaded Files Gallery */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} staged for Three.js synthesis:
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`relative group flex items-center gap-2.5 p-2 rounded-xl border text-left overflow-hidden ${
                        isDarkTheme
                          ? 'border-[#2a2b2e] bg-[#1a1b20]'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <img
                        src={file.dataUrl}
                        alt={file.name}
                        className="w-10 h-10 object-cover rounded-lg shrink-0 border border-black/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{file.name}</div>
                        <div className="text-[10px] text-slate-400">{file.size}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(file.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Body Part Label / Description */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Organ / Clinical Focus (Optional)
            </label>
            <input
              type="text"
              value={bodyPartHint}
              onChange={(e) => setBodyPartHint(e.target.value)}
              placeholder="e.g. Brain Circle of Willis, Coronary LAD, Microscopic Fibrin"
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs border transition-colors outline-hidden ${
                isDarkTheme
                  ? 'bg-[#15161a] border-[#2a2b2e] focus:border-[#deb35a] text-white'
                  : 'bg-white border-slate-300 focus:border-amber-500 text-slate-900'
              }`}
            />
          </div>

          {/* Existing Presentations Library */}
          <div className="space-y-2.5 pt-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active & Generated Presentations
            </label>

            <div className="space-y-2">
              {/* Default Presentation */}
              <div
                onClick={() => onSelectPresentation(null)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  currentPresentationId === 'default'
                    ? isDarkTheme
                      ? 'border-[#deb35a] bg-[#deb35a]/10'
                      : 'border-amber-400 bg-amber-50/70'
                    : isDarkTheme
                    ? 'border-[#2a2b2e] bg-[#15161a] hover:bg-[#1a1b20]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Pulmonary Embolism 3D Intelligence</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Thoracic Lungs • Bifurcation • Saddle Thrombus • 8 Stages
                    </div>
                  </div>
                </div>
                {currentPresentationId === 'default' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#deb35a] text-slate-950">
                    ACTIVE
                  </span>
                ) : (
                  <Play className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              {/* Custom Generated Presentations */}
              {presentations.map((p) => {
                const isActive = currentPresentationId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPresentation(p)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? isDarkTheme
                          ? 'border-[#deb35a] bg-[#deb35a]/10'
                          : 'border-amber-400 bg-amber-50/70'
                        : isDarkTheme
                        ? 'border-[#2a2b2e] bg-[#15161a] hover:bg-[#1a1b20]'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#deb35a]/15 text-[#deb35a] border border-[#deb35a]/30">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold truncate">{p.title}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {p.bodyPart} • {p.imageCount} image{p.imageCount > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#deb35a] text-slate-950 shrink-0">
                        ACTIVE
                      </span>
                    ) : (
                      <Play className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with Action Button */}
        <div className="p-5 border-t border-inherit space-y-3">
          {isProcessing && (
            <div className="p-3 rounded-xl bg-[#deb35a]/10 border border-[#deb35a]/30 space-y-2 animate-pulse">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#b08d46] dark:text-[#f3cc77]">
                <Loader2 className="w-4 h-4 animate-spin text-[#deb35a]" />
                <span>Reconstructing 3D Presentation</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                {processingStep}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleStartReconstruction}
            className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-[0.99] ${
              isProcessing
                ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#deb35a] to-[#c79a3b] hover:from-[#e6b65c] hover:to-[#deb35a] text-slate-950 shadow-amber-500/20'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Medical Image Set...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Reconstruct 3D Presentation {uploadedFiles.length > 0 ? `(${uploadedFiles.length} Images)` : ''}
                </span>
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
};
