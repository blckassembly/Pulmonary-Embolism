/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import {
  EvidenceVerificationCheckResult,
  FederatedEvidenceItem,
  IEvidenceVerificationProvider,
} from '../types/federatedEvidence.ts';
import {
  defaultEvidenceVerificationProvider,
  formatVerificationStateLabel,
} from '../services/researchFederationService.ts';

interface EvidenceProvenancePanelProps {
  item: FederatedEvidenceItem | null;
  onClose: () => void;
  isDarkTheme?: boolean;
  layoutMode?: 'drawer' | 'pane';
  verificationProvider?: IEvidenceVerificationProvider;
}

export const EvidenceProvenancePanel: React.FC<EvidenceProvenancePanelProps> = ({
  item,
  onClose,
  isDarkTheme = true,
  layoutMode = 'pane',
  verificationProvider = defaultEvidenceVerificationProvider,
}) => {
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<EvidenceVerificationCheckResult | null>(null);

  useEffect(() => {
    setCopiedDigest(false);
    setVerificationResult(null);
    setIsVerifying(false);
  }, [item?.id]);

  // Strictly black-and-white wireframe tokens paired with app's dark/light base
  const frameBg = isDarkTheme
    ? 'bg-[#0b0c0f] text-white border-white/30'
    : 'bg-white text-black border-black/35';
  const subCell = isDarkTheme
    ? 'bg-[#111317] border-white/20 text-neutral-200'
    : 'bg-neutral-50 border-black/20 text-neutral-900';
  const mutedLabel = isDarkTheme ? 'text-neutral-400' : 'text-neutral-600';
  const monoBadge = isDarkTheme
    ? 'border-white/40 text-white bg-black/50'
    : 'border-black/50 text-black bg-white';
  const inverseBtn = isDarkTheme
    ? 'bg-white text-black border-white hover:bg-neutral-200'
    : 'bg-black text-white border-black hover:bg-neutral-800';

  if (!item) {
    if (layoutMode === 'drawer') return null;
    return (
      <div
        role="region"
        aria-label="Evidence Provenance Panel"
        className={`border h-full flex flex-col justify-center items-center p-6 text-center ${frameBg}`}
      >
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest mb-2">
          PROVENANCE // ENTHALPY × XDC
        </div>
        <p className={`text-xs font-mono max-w-xs leading-relaxed ${mutedLabel}`}>
          Select any evidence result on the left to inspect source metadata, dataset revision,
          SHA-256 digest, and simulated XDC subnet transaction reference.
        </p>
      </div>
    );
  }

  const handleCopyDigest = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(item.evidenceDigest).then(() => {
      setCopiedDigest(true);
      setTimeout(() => setCopiedDigest(false), 1600);
    });
  };

  const handleVerifyCheck = async () => {
    setIsVerifying(true);
    try {
      const res = await verificationProvider.verifyEvidence(item);
      setVerificationResult(res);
    } finally {
      setIsVerifying(false);
    }
  };

  const containerClasses =
    layoutMode === 'drawer'
      ? `border-t border-b shadow-xl shrink-0 max-h-[58%] flex flex-col font-sans ${frameBg}`
      : `border h-full flex flex-col font-sans overflow-hidden ${frameBg}`;

  return (
    <div
      role="region"
      aria-label="Evidence Provenance Panel"
      className={containerClasses}
    >
      {/* Wireframe Title Bar */}
      <div
        className={`px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0 ${
          isDarkTheme ? 'border-white/20 bg-black/60' : 'border-black/20 bg-neutral-100'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest truncate">
            PROVENANCE // ENTHALPY × XDC
          </span>
          {item.isMock && (
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${monoBadge}`}>
              MOCK / SIMULATED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Clear selected provenance"
          className={`p-1 border transition-colors ${
            isDarkTheme
              ? 'border-white/25 text-neutral-300 hover:bg-white hover:text-black'
              : 'border-black/25 text-neutral-700 hover:bg-black hover:text-white'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Wireframe Body */}
      <div className="p-3.5 overflow-y-auto space-y-3 text-xs flex-1">
        {/* Title & Channel Badges */}
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 border ${monoBadge}`}>
              {item.channel === 'on-chain' ? 'ON-CHAIN' : 'OFF-CHAIN'}
            </span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${monoBadge}`}>
              {formatVerificationStateLabel(item.verificationState)}
            </span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${monoBadge}`}>
              {item.associationType}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          <p className={`text-xs leading-relaxed mt-1.5 ${mutedLabel}`}>{item.snippet}</p>
        </div>

        {/* Source Metadata Grid */}
        <div className={`border p-2.5 space-y-1.5 ${subCell}`}>
          <div className={`text-[10px] font-mono uppercase tracking-wider ${mutedLabel}`}>
            Source Metadata
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className={`font-mono ${mutedLabel}`}>Source:</span>
              <span className="font-medium text-right truncate">{item.evidenceSource}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className={`font-mono ${mutedLabel}`}>Custodian:</span>
              <span className="font-medium text-right truncate">{item.sourceMetadata.custodian}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className={`font-mono ${mutedLabel}`}>Terminology:</span>
              <span className="font-mono text-right truncate">{item.researchTerminology}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className={`font-mono ${mutedLabel}`}>Anatomy Scope:</span>
              <span className="text-right truncate">{item.sourceMetadata.anatomyScope}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className={`font-mono ${mutedLabel}`}>Dataset Revision:</span>
              <span className="font-mono font-semibold text-right truncate">{item.datasetRevision}</span>
            </div>
          </div>

          {item.url && (
            <div className={`pt-1.5 mt-1 border-t flex justify-end ${isDarkTheme ? 'border-white/15' : 'border-black/15'}`}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] underline underline-offset-2 hover:opacity-80"
              >
                <span>Open External Off-Chain Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Evidence Digest */}
        <div className={`border p-2.5 space-y-1.5 ${subCell}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedLabel}`}>
              Evidence Digest (SHA-256 Format)
            </span>
            <button
              type="button"
              onClick={handleCopyDigest}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono uppercase transition-colors ${
                isDarkTheme
                  ? 'border-white/30 hover:bg-white hover:text-black'
                  : 'border-black/30 hover:bg-black hover:text-white'
              }`}
            >
              {copiedDigest ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedDigest ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <code className="block font-mono text-[11px] break-all select-all leading-relaxed">
            {item.evidenceDigest}
          </code>
        </div>

        {/* XDC Subnet Transaction Reference (when available) */}
        {item.xdcSubnetTxRef ? (
          <div className={`border p-2.5 space-y-1.5 ${subCell}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[10px] font-mono uppercase tracking-wider ${mutedLabel}`}>
                XDC Subnet Transaction Reference
              </span>
              <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${monoBadge}`}>
                SIMULATED RECORD
              </span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between gap-2">
                <span className={mutedLabel}>Network:</span>
                <span className="text-right truncate">{item.xdcSubnetTxRef.networkLabel}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={mutedLabel}>Subnet ID:</span>
                <span className="text-right truncate">{item.xdcSubnetTxRef.subnetId}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={mutedLabel}>Block #:</span>
                <span className="text-right">{item.xdcSubnetTxRef.blockNumber.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={mutedLabel}>Method:</span>
                <span className="text-right truncate">{item.xdcSubnetTxRef.contractOrMethod}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className={mutedLabel}>Timestamp:</span>
                <span className="text-right">{item.xdcSubnetTxRef.timestampIso}</span>
              </div>
              <div className="pt-1">
                <span className={`block ${mutedLabel}`}>Tx Hash (Simulated):</span>
                <code className="block break-all select-all mt-0.5">
                  {item.xdcSubnetTxRef.txHash}
                </code>
              </div>
            </div>
          </div>
        ) : (
          <div className={`border p-2.5 text-[11px] font-mono ${subCell}`}>
            <span className={mutedLabel}>
              XDC Subnet Transaction Reference: Not available (off-chain literature index only).
            </span>
          </div>
        )}

        {/* Modular Verification Provider Trigger */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleVerifyCheck}
            disabled={isVerifying}
            className={`w-full py-1.5 px-3 border font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${inverseBtn}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {isVerifying ? 'Checking Provenance...' : 'Run Modular Verification Check'}
            </span>
          </button>

          {verificationResult && (
            <div className={`border p-2 text-[11px] space-y-1 ${subCell}`}>
              <div className="flex items-center justify-between font-mono font-bold">
                <span>{verificationResult.statusLabel}</span>
                <span>{verificationResult.digestMatches ? 'DIGEST OK' : 'MISMATCH'}</span>
              </div>
              <p className={`leading-relaxed ${mutedLabel}`}>{verificationResult.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
