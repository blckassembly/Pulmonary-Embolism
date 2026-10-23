/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Database, BookOpen } from 'lucide-react';
import { EvidenceType } from '../types/biomedical.ts';

interface ProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProvenanceModal: React.FC<ProvenanceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const objectTaxonomy: {
    name: string;
    scale: string;
    evidenceType: EvidenceType;
    source: string;
    uncertainty: string;
    details: string;
  }[] = [
    {
      name: 'Fibrin Network Strands',
      scale: '50 µm (Scale D)',
      evidenceType: 'illustrative',
      source: 'Procedural Graph Generator (Evans-Fung & Weisel Polymerization Models)',
      uncertainty: 'Synthetic representation; individual fibers not resolvable on patient CT.',
      details: 'Fiber diameter (0.18–0.42 µm), branching degree, and cross-linking derived from scanning electron microscopy literature.',
    },
    {
      name: 'Biconcave Erythrocytes (RBCs)',
      scale: '7.8 µm (Scale D)',
      evidenceType: 'illustrative',
      source: 'Evans-Fung Mathematical Parametric Profile',
      uncertainty: 'Illustrative trapped population; cell deformation under shear modeled synthetically.',
      details: 'Instanced 3D disc geometry with realistic biconcave dimple (1.0 µm center, 2.4 µm rim).',
    },
    {
      name: 'Dendritic Platelets',
      scale: '2.5 µm (Scale D)',
      evidenceType: 'illustrative',
      source: 'Activated Thrombocyte Stellate Model',
      uncertainty: 'Illustrative; pseudopodia adherence generated via graph node proximity.',
      details: 'Simulates hemostatic platelet activation and fibrin adhesion during acute clot formation.',
    },
    {
      name: 'Pulmonary Artery Tree',
      scale: '8–30 mm (Scale B & A)',
      evidenceType: 'segmented',
      source: 'Reference Anatomical CTPA Atlas (512x512 High-Res Matrix)',
      uncertainty: 'Voxel resolution ~0.625 mm; reconstructed smooth surface mesh.',
      details: 'Anatomical bifurcation geometry of main, lobar, and segmental branches with physiological wall thickness.',
    },
    {
      name: 'Hemodynamic Velocity & WSS Fields',
      scale: 'Vessel Lumen (Scale B)',
      evidenceType: 'simulated',
      source: 'Navier-Stokes Computational Fluid Dynamics (CFD Streamlines)',
      uncertainty: 'Assumes rigid vessel walls and Newtonian viscosity approximation.',
      details: 'Displays jet acceleration through stenosis (WSS up to 4.5 Pa) and post-stenotic recirculation eddies.',
    },
  ];

  const getBadgeStyle = (type: EvidenceType) => {
    switch (type) {
      case 'measured':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'segmented':
        return 'text-blue-400 bg-blue-950/60 border-blue-800';
      case 'simulated':
        return 'text-purple-400 bg-purple-950/60 border-purple-800';
      case 'illustrative':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#131416] border border-[#2a2b2e] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#24252a]">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#b08d46]" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Scientific Data Provenance & Ground Truth Reference
              </h2>
              <p className="text-xs text-[#8a8f9d]">
                Mandatory disclosure of data sources, segmentation uncertainties, and computational models
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8a8f9d] hover:text-white rounded-lg hover:bg-[#202227] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Reference Image Comparison Card */}
          <div className="bg-[#18191d] border border-[#2a2b2e] rounded-xl p-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#e6b65c]" />
              Microscopic Ground Truth Reference (Electron Microscopy Calibration)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="relative rounded-lg overflow-hidden border border-[#343538] bg-black">
                <img
                  src="/assets/aistudio/Pulmonary_Embolus_Fibrin_Mesh_c34319b1.png"
                  alt="Pulmonary Embolus Fibrin Mesh Conceptual Microscopic Structure"
                  className="w-full h-auto max-h-[260px] object-contain mx-auto"
                />
                <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 bg-black/75 backdrop-blur-sm rounded text-[11px] text-[#e6b65c] font-mono">
                  SEM Reference: Conceptual Microscopic Structure
                </div>
              </div>

              <div className="space-y-2 text-xs text-[#9aa0a6] leading-relaxed">
                <p>
                  <strong className="text-white">Physical vs Clinical Reality:</strong> In clinical practice, Computed Tomography Pulmonary Angiography (CTPA) operates at a spatial resolution limit of approximately <span className="font-mono text-white">0.5 to 0.625 mm</span>.
                </p>
                <p>
                  Consequently, individual fibrin protofibrils (~0.28 µm) and erythrocytes (~7.8 µm) <strong className="text-amber-400">cannot be directly resolved from patient CT scans</strong>.
                </p>
                <p>
                  Our engine bridges this gap by fusing macroscopic organ segmentations with literature-grounded procedural graph generators, enabling multiscale exploration while preserving strict provenance boundaries.
                </p>
              </div>
            </div>
          </div>

          {/* Component Provenance Taxonomy Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#b08d46]" />
              Component Classification Matrix
            </h3>

            <div className="border border-[#2a2b2e] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18191d] text-[#8a8f9d] border-b border-[#2a2b2e]">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">Component</th>
                    <th className="py-2.5 px-3 font-medium">Scale</th>
                    <th className="py-2.5 px-3 font-medium">Evidence Type</th>
                    <th className="py-2.5 px-3 font-medium">Source / Method</th>
                    <th className="py-2.5 px-3 font-medium">Known Limitations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24252a] text-[#c5c9d3]">
                  {objectTaxonomy.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#1a1b20] transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">{row.name}</td>
                      <td className="py-3 px-3 font-mono text-[#8a8f9d]">{row.scale}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase border ${getBadgeStyle(row.evidenceType)}`}>
                          {row.evidenceType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#9aa0a6]">{row.source}</td>
                      <td className="py-3 px-3 text-[#8a8f9d] text-[11px]">{row.uncertainty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#24252a] bg-[#18191d]">
          <span className="text-xs text-[#8a8f9d]">
            Research Engine Specification: PE-3D-001 · Not for unverified clinical intervention
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-black bg-[#e6b65c] hover:bg-[#f3ca76] rounded-lg transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
