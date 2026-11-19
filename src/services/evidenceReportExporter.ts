/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EvidenceSourceMode,
  EvidenceVerificationCheckResult,
  FederatedEvidenceItem,
} from '../types/federatedEvidence.ts';
import { formatVerificationStateLabel } from './researchFederationService.ts';

export interface EvidenceReportContext {
  query: string;
  anatomyId: string;
  anatomyLabel: string;
  clotPathProgress: number;
  evidenceMode: EvidenceSourceMode;
  verificationResult?: EvidenceVerificationCheckResult | null;
}

export type ReportExportFormat = 'pdf' | 'json';

function sanitizeFileSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'evidence';
}

function buildReportFilename(item: FederatedEvidenceItem, ext: ReportExportFormat): string {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `enthalpy-xdc-${sanitizeFileSlug(item.id)}-${dateStamp}.${ext}`;
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildEvidenceReportPayload(
  item: FederatedEvidenceItem,
  context: EvidenceReportContext
) {
  return {
    reportSchema: 'enthalpy-xdc-provenance-report/v1',
    generatedAtIso: new Date().toISOString(),
    disclaimer: item.isMock
      ? 'PROTOTYPE MOCK / SIMULATED RECORD: Not a live mainnet/testnet clinical attestation.'
      : 'Educational biomedical literature summary retrieved from public sources.',
    searchContext: {
      query: context.query,
      anatomyId: context.anatomyId,
      anatomyLabel: context.anatomyLabel,
      clotPathProgressPct: Math.round(context.clotPathProgress * 100),
      evidenceSourceMode: context.evidenceMode,
    },
    evidence: {
      id: item.id,
      title: item.title,
      evidenceSource: item.evidenceSource,
      researchTerminology: item.researchTerminology,
      associationType: item.associationType,
      channel: item.channel,
      verificationState: item.verificationState,
      verificationStateLabel: formatVerificationStateLabel(item.verificationState),
      isMock: item.isMock,
      datasetRevision: item.datasetRevision,
      evidenceDigest: item.evidenceDigest,
      snippet: item.snippet,
      url: item.url ?? null,
      accessDate: item.accessDate ?? null,
    },
    sourceMetadata: item.sourceMetadata,
    xdcSubnetTransactionReference: item.xdcSubnetTxRef ?? null,
    verificationCheck: context.verificationResult ?? null,
  };
}

export function downloadEvidenceJsonReport(
  item: FederatedEvidenceItem,
  context: EvidenceReportContext
): void {
  const payload = buildEvidenceReportPayload(item, context);
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  triggerBlobDownload(blob, buildReportFilename(item, 'json'));
}

// ---------------------------------------------------------------------------
// Minimal Zero-Dependency PDF 1.4 Generator (byte-exact xref offsets)
// ---------------------------------------------------------------------------

function toPdfAscii(input: string): string {
  return input
    .replace(/\u00d7/g, 'x')
    .replace(/\u2192/g, '->')
    .replace(/\u00b7/g, '|')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, ' ');
}

function escapePdfString(input: string): string {
  return toPdfAscii(input)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapTextLines(text: string, maxChars: number): string[] {
  const clean = toPdfAscii(text).trim();
  if (!clean) return [''];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface PdfLineSpec {
  text: string;
  font: 'F1' | 'F2' | 'F3'; // F1=Helvetica, F2=Helvetica-Bold, F3=Courier
  size: number;
  leading: number;
  indent?: number;
  ruleAbove?: boolean;
}

export function generateEvidencePdfBytes(
  item: FederatedEvidenceItem,
  context: EvidenceReportContext
): Uint8Array {
  const payload = buildEvidenceReportPayload(item, context);
  const specs: PdfLineSpec[] = [];

  const pushWrapped = (
    text: string,
    font: 'F1' | 'F2' | 'F3',
    size: number,
    maxChars: number,
    indent = 0
  ) => {
    const wrapped = wrapTextLines(text, maxChars);
    wrapped.forEach((line, idx) => {
      specs.push({
        text: line,
        font,
        size,
        leading: size + 4,
        indent: idx === 0 ? indent : indent,
      });
    });
  };

  const pushKeyVal = (label: string, val: string, mono = false) => {
    pushWrapped(`${label}: ${val}`, mono ? 'F3' : 'F1', 9.5, mono ? 78 : 88, 6);
  };

  // Header
  specs.push({
    text: 'ENTHALPY x XDC // EVIDENCE & PROVENANCE REPORT',
    font: 'F2',
    size: 13,
    leading: 18,
  });
  specs.push({
    text: `Generated: ${payload.generatedAtIso}  |  Channel: ${item.channel.toUpperCase()}  |  State: ${payload.evidence.verificationStateLabel}`,
    font: 'F3',
    size: 8.5,
    leading: 13,
  });
  if (item.isMock) {
    specs.push({
      text: '[PROTOTYPE NOTICE] Clearly marked MOCK / SIMULATED record -- not a live ledger attestation.',
      font: 'F2',
      size: 9,
      leading: 14,
    });
  }

  // Search Context
  specs.push({
    text: 'SEARCH CONTEXT',
    font: 'F2',
    size: 10.5,
    leading: 16,
    ruleAbove: true,
  });
  pushKeyVal('Query', context.query || '(contextual open)');
  pushKeyVal(
    'Anatomical Scope',
    `${context.anatomyLabel} (Clot Path ${Math.round(context.clotPathProgress * 100)}%)`
  );
  pushKeyVal('Evidence Filter', context.evidenceMode.toUpperCase());

  // Evidence Summary
  specs.push({
    text: 'SELECTED EVIDENCE METADATA',
    font: 'F2',
    size: 10.5,
    leading: 16,
    ruleAbove: true,
  });
  pushWrapped(item.title, 'F2', 10.5, 82, 6);
  pushKeyVal('Record ID', item.id, true);
  pushKeyVal('Evidence Source', item.evidenceSource);
  pushKeyVal('Research Terminology', item.researchTerminology, true);
  pushKeyVal('Association Type', item.associationType);
  pushKeyVal('On-Chain / Off-Chain', item.channel === 'on-chain' ? 'ON-CHAIN' : 'OFF-CHAIN');
  pushKeyVal('Verification State', payload.evidence.verificationStateLabel);
  pushKeyVal('Dataset Revision', item.datasetRevision, true);
  pushWrapped(`Summary: ${item.snippet}`, 'F1', 9.5, 88, 6);
  if (item.url) {
    pushKeyVal('External URL', item.url, true);
  }

  // Provenance & Source Metadata
  specs.push({
    text: 'SOURCE METADATA & EVIDENCE DIGEST',
    font: 'F2',
    size: 10.5,
    leading: 16,
    ruleAbove: true,
  });
  pushKeyVal('Custodian', item.sourceMetadata.custodian);
  pushKeyVal('Registry / Domain', item.sourceMetadata.domainOrRegistry, true);
  pushKeyVal('Scope', item.sourceMetadata.jurisdictionOrScope);
  pushKeyVal('Record Kind', item.sourceMetadata.recordKind);
  pushKeyVal('Anatomy Scope', item.sourceMetadata.anatomyScope);
  pushKeyVal('Evidence Digest', item.evidenceDigest, true);

  // XDC Subnet Transaction Reference
  specs.push({
    text: 'XDC SUBNET TRANSACTION REFERENCE',
    font: 'F2',
    size: 10.5,
    leading: 16,
    ruleAbove: true,
  });
  if (item.xdcSubnetTxRef) {
    pushKeyVal('Network', `${item.xdcSubnetTxRef.networkLabel} (SIMULATED)`);
    pushKeyVal('Subnet ID', item.xdcSubnetTxRef.subnetId, true);
    pushKeyVal('Block Number', String(item.xdcSubnetTxRef.blockNumber), true);
    pushKeyVal('Contract / Method', item.xdcSubnetTxRef.contractOrMethod, true);
    pushKeyVal('Timestamp', item.xdcSubnetTxRef.timestampIso, true);
    pushKeyVal('Tx Hash (Simulated)', item.xdcSubnetTxRef.txHash, true);
  } else {
    pushWrapped(
      'Not available (off-chain literature index only; not anchored to an XDC subnet block).',
      'F1',
      9.5,
      86,
      6
    );
  }

  if (context.verificationResult) {
    specs.push({
      text: 'MODULAR VERIFICATION CHECK',
      font: 'F2',
      size: 10.5,
      leading: 16,
      ruleAbove: true,
    });
    pushKeyVal('Status', context.verificationResult.statusLabel, true);
    pushKeyVal('Digest Match', context.verificationResult.digestMatches ? 'DIGEST OK' : 'MISMATCH', true);
    pushKeyVal('Checked At', context.verificationResult.checkedAtIso, true);
    pushWrapped(context.verificationResult.summary, 'F1', 9.5, 86, 6);
  }

  // Paginate lines onto US Letter (612 x 792 pt)
  const pageLeft = 48;
  const pageRight = 564;
  const pageTopStart = 744;
  const pageBottomLimit = 54;

  const pageStreams: string[] = [];
  let cmds: string[] = [];
  let y = pageTopStart;

  const flushPage = () => {
    if (cmds.length > 0) {
      pageStreams.push(cmds.join('\n'));
      cmds = [];
    }
    y = pageTopStart;
  };

  for (const spec of specs) {
    const needed = spec.leading + (spec.ruleAbove ? 12 : 0);
    if (y - needed < pageBottomLimit) {
      flushPage();
    }
    if (spec.ruleAbove) {
      y -= 8;
      cmds.push(`0.6 w 0.75 G ${pageLeft} ${y} m ${pageRight} ${y} l S 0 G`);
      y -= 10;
    }
    const x = pageLeft + (spec.indent ?? 0);
    cmds.push(`BT /${spec.font} ${spec.size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfString(spec.text)}) Tj ET`);
    y -= spec.leading;
  }
  flushPage();

  // Assemble PDF Objects:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // 5: Font F3 (Courier)
  // 6..: Page + Content pairs
  const objects: string[] = [];
  const pageObjIds: number[] = [];
  let nextObjId = 6;

  const pageContentPairs = pageStreams.map((stream) => {
    const pageId = nextObjId++;
    const contentId = nextObjId++;
    pageObjIds.push(pageId);
    return { pageId, contentId, stream };
  });

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>`;
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>';

  for (const pair of pageContentPairs) {
    objects[pair.pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
      `/Contents ${pair.contentId} 0 R >>`;
    objects[pair.contentId] =
      `<< /Length ${pair.stream.length} >>\nstream\n${pair.stream}\nendstream`;
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const pushStr = (s: string) => {
    const bytes = encoder.encode(s);
    chunks.push(bytes);
    offset += bytes.length;
  };

  pushStr('%PDF-1.4\n');
  const offsets: number[] = [0];

  for (let id = 1; id < objects.length; id++) {
    offsets[id] = offset;
    pushStr(`${id} 0 obj\n${objects[id]}\nendobj\n`);
  }

  const xrefStart = offset;
  pushStr(`xref\n0 ${objects.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id < objects.length; id++) {
    pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  );

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
}

export function downloadEvidencePdfReport(
  item: FederatedEvidenceItem,
  context: EvidenceReportContext
): void {
  const bytes = generateEvidencePdfBytes(item, context);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'application/pdf' });
  triggerBlobDownload(blob, buildReportFilename(item, 'pdf'));
}
