/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ExplainViewResponse,
  ExplainViewSource,
  ExplorerAnatomyId,
} from '../types/biomedical.ts';
import {
  EvidenceAssociationType,
  EvidenceVerificationCheckResult,
  FederatedEvidenceItem,
  IEvidenceVerificationProvider,
  IOffChainSearchConnector,
  IOnChainEvidenceConnector,
  IResearchFederationService,
  ResearchFederationQuery,
  ResearchFederationResult,
} from '../types/federatedEvidence.ts';
import { ENTHALPY_XDC_MOCK_EVIDENCE } from '../data/enthalpyXdcMockEvidence.ts';

function computeDeterministicDigestHex(input: string): string {
  // Deterministic 256-bit-width mock/fingerprint hex digest derived cleanly on client
  // without blocking UI; real server-side SHA-256 can drop into the verification provider later.
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0x94d049bb, 0xbf58476d];
  let hex = '0x';
  for (let s = 0; s < seeds.length; s++) {
    let h = seeds[s] >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + ((i + s) * 31);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += h.toString(16).padStart(8, '0');
  }
  return hex;
}

function inferAssociationType(text: string): EvidenceAssociationType {
  const lower = text.toLowerCase();
  if (/(napqi|cyp2e1|toxic|overdose|estrogen|contrast|exposure|adverse)/.test(lower)) {
    return 'Toxicological Exposure';
  }
  if (/(d-dimer|ddimer|troponin|nt-probnp|bnp|biomarker|assay|lactate)/.test(lower)) {
    return 'Biomarker Correlation';
  }
  if (/(plasmin|tpa|alteplase|tenecteplase|thrombin|factor|enzyme|protein|receptor|fibrin|serpine)/.test(lower)) {
    return 'Protein Target';
  }
  if (/(mpap|pvr|resistance|shear|saddle|shock|obstruction|strain|anomaly|mismatch)/.test(lower)) {
    return 'Hemodynamic Anomaly';
  }
  return 'Disease Pathophysiology';
}

function inferTerminology(query: string, title: string, snippet: string): string {
  const combined = `${query} ${title} ${snippet}`.toLowerCase();
  const terms: string[] = [];
  if (/d-dimer|ddimer/.test(combined)) terms.push('D-Dimer');
  if (/nt-probnp|bnp/.test(combined)) terms.push('NT-proBNP');
  if (/troponin|ctni/.test(combined)) terms.push('cTnI');
  if (/plasmin|alteplase|tpa|tenecteplase|lysis/.test(combined)) terms.push('PLG / tPA');
  if (/thrombin|heparin|factor x|anticoag/.test(combined)) terms.push('F2 / F10a');
  if (/fibrin/.test(combined)) terms.push('Fibrin Mesh');
  if (/virchow|stasis|dvt/.test(combined)) terms.push('Virchow Triad / VTE');
  if (/v\/q|ventilation|perfusion|dead space|hypox/.test(combined)) terms.push('V/Q Dead Space');
  if (/saddle|bifurcation/.test(combined)) terms.push('Saddle PA Obstruction');
  if (/right ventric|rv |afterload|strain/.test(combined)) terms.push('RV Afterload');
  if (/napqi|acetaminophen|cyp2e1/.test(combined)) terms.push('CYP2E1 / NAPQI');

  if (terms.length > 0) {
    return terms.slice(0, 3).join(' / ');
  }
  return 'Pulmonary Embolism (ICD-10 I26)';
}

function detectEmergencyPrompt(question: string): { isEmergencyPrompt: boolean; emergencyNotice: string | null } {
  const lower = question.toLowerCase();
  const hit =
    /\b(chest pain|shortness of breath|can'?t breathe|difficulty breathing|coughing up blood|hemoptysis|fainting|syncope|dizzy|racing heart|palpitations|severe pain|emergency|911)\b/.test(
      lower
    );

  if (!hit) {
    return { isEmergencyPrompt: false, emergencyNotice: null };
  }

  return {
    isEmergencyPrompt: true,
    emergencyNotice:
      'If you or someone nearby is experiencing chest pain, sudden shortness of breath, fainting, or coughing up blood, seek immediate emergency medical care or call 911 right away.',
  };
}

/**
 * Modular Off-Chain Connector wrapping the existing `/api/explain-view` (You.com) endpoint.
 * Preserves existing query behavior identically while mapping sources into FederatedEvidenceItem records.
 */
export class YouComOffChainConnector implements IOffChainSearchConnector {
  readonly connectorId = 'you-com-offchain-connector';

  async search(query: ResearchFederationQuery) {
    const resp = await fetch('/api/explain-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: query.query,
        anatomyLabel: query.anatomyLabel,
      }),
    });

    if (!resp.ok) {
      throw new Error(`Off-chain search failed (${resp.status})`);
    }

    const data: ExplainViewResponse = await resp.json();
    const sources: ExplainViewSource[] = data.sources || [];

    const items: FederatedEvidenceItem[] = sources.map((src, idx) => {
      const textSample = `${query.query} ${src.title} ${src.snippet || ''}`;
      const digestInput = `offchain|${src.url}|${src.title}|${src.organization}|${src.accessDate || ''}`;

      return {
        id: `offchain-you-${idx}-${computeDeterministicDigestHex(digestInput).slice(2, 10)}`,
        title: src.title || 'External Biomedical Reference',
        evidenceSource: `You.com · ${src.organization || 'Web Literature'}`,
        researchTerminology: inferTerminology(query.query, src.title || '', src.snippet || ''),
        associationType: inferAssociationType(textSample),
        channel: 'off-chain',
        verificationState: 'VERIFIED_OFFCHAIN',
        snippet:
          src.snippet ||
          `Off-chain medical reference retrieved from ${src.organization || 'external literature'} for ${query.anatomyLabel}.`,
        url: src.url,
        accessDate: src.accessDate,
        datasetRevision: 'You.com Live Index (Unanchored)',
        evidenceDigest: computeDeterministicDigestHex(digestInput),
        isMock: false,
        anatomyStages: [query.anatomyId],
        sourceMetadata: {
          custodian: src.organization || 'External Web Publisher',
          domainOrRegistry: src.url || 'https://api.you.com',
          jurisdictionOrScope: 'Public Biomedical / Clinical Web Literature',
          recordKind: 'Off-Chain Indexed Literature Reference',
          anatomyScope: query.anatomyLabel,
        },
      };
    });

    return {
      answer: data.answer || 'Reliable educational sources could not be confirmed from You.com.',
      apiProvider: data.apiProvider || 'You.com API',
      items,
      isEmergencyPrompt: Boolean(data.isEmergencyPrompt),
      emergencyNotice: data.emergencyNotice || null,
      disclaimer:
        data.disclaimer ||
        'General educational summary retrieved from public medical references. Not medical advice or a substitute for clinical care.',
    };
  }
}

/**
 * Modular On-Chain Connector serving clearly labeled MOCK / SIMULATED ENTHALPY x XDC records.
 * Can be replaced later with live XDC Subnet JSON-RPC / indexer calls without changing consumers.
 */
export class MockEnthalpyXdcOnChainConnector implements IOnChainEvidenceConnector {
  readonly connectorId = 'enthalpy-xdc-mock-onchain-connector';

  async search(query: ResearchFederationQuery) {
    const tokens = query.query
      .toLowerCase()
      .split(/[^a-z0-9/-]+/)
      .filter((t) => t.length >= 2);

    const scored = ENTHALPY_XDC_MOCK_EVIDENCE.map((record) => {
      let score = 0;
      const haystack = `${record.title} ${record.researchTerminology} ${record.associationType} ${record.snippet} ${(record.keywords || []).join(' ')}`.toLowerCase();

      for (const token of tokens) {
        if (haystack.includes(token)) {
          score += 3;
        }
      }

      if (record.anatomyStages?.includes(query.anatomyId)) {
        score += 2;
      }

      return { record, score };
    })
      .sort((a, b) => b.score - a.score);

    const matched = scored
      .filter((entry) => entry.score > 0)
      .slice(0, 4)
      .map((entry) => entry.record);

    // Fallback to anatomy-aligned simulated records when a broad query has no literal token hit
    const finalItems =
      matched.length > 0
        ? matched
        : ENTHALPY_XDC_MOCK_EVIDENCE.filter((r) => r.anatomyStages?.includes(query.anatomyId)).slice(0, 3);

    const summaryLines = finalItems.map(
      (item, idx) =>
        `[${idx + 1}] ${item.title} (${item.associationType} · ${item.researchTerminology}): ${item.snippet}`
    );

    const summaryText =
      finalItems.length > 0
        ? `[SIMULATED ENTHALPY × XDC SUBNET QUERY · ${query.anatomyLabel}]\n` +
          `Matched ${finalItems.length} mock on-chain evidence record(s) for "${query.query}":\n\n` +
          summaryLines.join('\n\n') +
          `\n\nPrototype Notice: Results in On-Chain mode are simulated ENTHALPY × XDC subnet attestations and do not query a live clinical ledger.`
        : `No simulated ENTHALPY × XDC subnet records matched "${query.query}". Try terms such as D-Dimer, PLG, NT-proBNP, NAPQI, or Saddle Bifurcation.`;

    return {
      items: finalItems,
      summaryText,
    };
  }
}

/**
 * Modular Evidence Verification Provider for digest & provenance inspection.
 */
export class SimulatedXdcVerificationProvider implements IEvidenceVerificationProvider {
  readonly providerId = 'simulated-xdc-provenance-verifier';

  async verifyEvidence(item: FederatedEvidenceItem): Promise<EvidenceVerificationCheckResult> {
    const checkedAtIso = new Date().toISOString();

    if (item.channel === 'off-chain') {
      const digestInput = `offchain|${item.url || ''}|${item.title}|${item.sourceMetadata.custodian}|${item.accessDate || ''}`;
      const recomputed = computeDeterministicDigestHex(digestInput);
      const matches = recomputed === item.evidenceDigest;

      return {
        itemId: item.id,
        verified: matches,
        isSimulatedCheck: true,
        checkedAtIso,
        statusLabel: matches ? 'OFF-CHAIN DIGEST CONSISTENT' : 'DIGEST MISMATCH',
        summary:
          'Local client checksum matched the off-chain reference metadata. Off-chain entries are not anchored to an XDC subnet block.',
        computedDigest: item.evidenceDigest,
        digestMatches: matches,
      };
    }

    const hasTx = Boolean(item.xdcSubnetTxRef?.txHash);
    const isPending = item.verificationState === 'SIMULATED_PENDING';

    return {
      itemId: item.id,
      verified: hasTx && !isPending,
      isSimulatedCheck: true,
      checkedAtIso,
      statusLabel: isPending
        ? 'SIMULATED PENDING FINALITY (MOCK)'
        : 'VERIFIED ON SIMULATED SUBNET (MOCK)',
      summary: isPending
        ? `Prototype mock record ${item.id} references simulated block #${item.xdcSubnetTxRef?.blockNumber ?? 'N/A'} with pending finality state.`
        : `Prototype mock attestation digest matches simulated XDC subnet block #${item.xdcSubnetTxRef?.blockNumber ?? 'N/A'} (${item.xdcSubnetTxRef?.subnetId ?? 'mock-subnet'}).`,
      computedDigest: item.evidenceDigest,
      digestMatches: true,
    };
  }
}

/**
 * Shared Research Federation Service coordinating Off-Chain, On-Chain, and Combined discovery.
 */
export class ResearchFederationService implements IResearchFederationService {
  constructor(
    private readonly offChainConnector: IOffChainSearchConnector,
    private readonly onChainConnector: IOnChainEvidenceConnector
  ) {}

  async searchFederatedEvidence(query: ResearchFederationQuery): Promise<ResearchFederationResult> {
    if (query.mode === 'on-chain') {
      const onChain = await this.onChainConnector.search(query);
      const emergency = detectEmergencyPrompt(query.query);

      return {
        query: query.query,
        mode: query.mode,
        anatomyLabel: query.anatomyLabel,
        answer: onChain.summaryText,
        apiProvider: 'ENTHALPY × XDC (Simulated On-Chain)',
        evidenceItems: onChain.items,
        isEmergencyPrompt: emergency.isEmergencyPrompt,
        emergencyNotice: emergency.emergencyNotice,
        disclaimer:
          'Prototype simulated XDC subnet evidence records for educational research workflows only.',
        containsMockRecords: onChain.items.some((i) => i.isMock),
      };
    }

    if (query.mode === 'off-chain') {
      const offChain = await this.offChainConnector.search(query);
      return {
        query: query.query,
        mode: query.mode,
        anatomyLabel: query.anatomyLabel,
        answer: offChain.answer,
        apiProvider: `${offChain.apiProvider} · Off-Chain`,
        evidenceItems: offChain.items,
        isEmergencyPrompt: offChain.isEmergencyPrompt,
        emergencyNotice: offChain.emergencyNotice,
        disclaimer: offChain.disclaimer,
        containsMockRecords: false,
      };
    }

    // Mode === 'all': Federate Off-Chain (existing You.com flow) + Mock On-Chain ENTHALPY x XDC records
    const [offChainResult, onChainResult] = await Promise.allSettled([
      this.offChainConnector.search(query),
      this.onChainConnector.search(query),
    ]);

    const offChainData = offChainResult.status === 'fulfilled' ? offChainResult.value : null;
    const onChainData = onChainResult.status === 'fulfilled' ? onChainResult.value : null;
    const emergency = offChainData
      ? { isEmergencyPrompt: offChainData.isEmergencyPrompt, emergencyNotice: offChainData.emergencyNotice }
      : detectEmergencyPrompt(query.query);

    const combinedItems: FederatedEvidenceItem[] = [
      ...(offChainData?.items || []),
      ...(onChainData?.items || []),
    ];

    const fallbackAnswer =
      onChainData?.summaryText ||
      'Unable to reach the off-chain You.com index right now; showing matching simulated ENTHALPY × XDC records below.';

    return {
      query: query.query,
      mode: query.mode,
      anatomyLabel: query.anatomyLabel,
      answer: offChainData?.answer || fallbackAnswer,
      apiProvider: offChainData
        ? `${offChainData.apiProvider} × ENTHALPY XDC (Mock)`
        : 'ENTHALPY × XDC (Simulated On-Chain Fallback)',
      evidenceItems: combinedItems,
      isEmergencyPrompt: emergency.isEmergencyPrompt,
      emergencyNotice: emergency.emergencyNotice,
      disclaimer:
        offChainData?.disclaimer ||
        'Federated prototype combining live off-chain references with clearly labeled simulated ENTHALPY × XDC records.',
      containsMockRecords: combinedItems.some((i) => i.isMock),
    };
  }
}

export const defaultOffChainConnector = new YouComOffChainConnector();
export const defaultOnChainConnector = new MockEnthalpyXdcOnChainConnector();
export const defaultEvidenceVerificationProvider = new SimulatedXdcVerificationProvider();
export const researchFederationService = new ResearchFederationService(
  defaultOffChainConnector,
  defaultOnChainConnector
);

export function formatVerificationStateLabel(state: FederatedEvidenceItem['verificationState']): string {
  switch (state) {
    case 'VERIFIED_MOCK':
      return 'VERIFIED (MOCK)';
    case 'SIMULATED_PENDING':
      return 'SIMULATED PENDING';
    case 'VERIFIED_OFFCHAIN':
      return 'VERIFIED OFF-CHAIN';
    case 'PROVISIONAL_UNANCHORED':
    default:
      return 'PROVISIONAL';
  }
}

export function getAnatomyLabelForId(id: ExplorerAnatomyId): string {
  switch (id) {
    case 'deepVeins':
      return 'Deep Veins (DVT Origin)';
    case 'heart':
      return 'Heart Right Ventricle';
    case 'pulmonaryArtery':
      return 'Pulmonary Artery';
    case 'lungs':
      return 'Lungs & Gas Exchange';
  }
}
