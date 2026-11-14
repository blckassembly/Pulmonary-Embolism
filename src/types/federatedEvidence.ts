/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExplorerAnatomyId } from './biomedical.ts';

export type EvidenceSourceMode = 'all' | 'off-chain' | 'on-chain';

export type EvidenceChannel = 'off-chain' | 'on-chain';

export type EvidenceAssociationType =
  | 'Disease Pathophysiology'
  | 'Protein Target'
  | 'Biomarker Correlation'
  | 'Toxicological Exposure'
  | 'Hemodynamic Anomaly';

export type EvidenceVerificationState =
  | 'VERIFIED_OFFCHAIN'
  | 'VERIFIED_MOCK'
  | 'SIMULATED_PENDING'
  | 'PROVISIONAL_UNANCHORED';

export interface XdcSubnetTransactionRef {
  networkLabel: string;
  subnetId: string;
  txHash: string;
  blockNumber: number;
  timestampIso: string;
  contractOrMethod: string;
  isSimulated: true;
}

export interface EvidenceSourceMetadata {
  custodian: string;
  domainOrRegistry: string;
  jurisdictionOrScope: string;
  recordKind: string;
  anatomyScope: string;
}

export interface FederatedEvidenceItem {
  id: string;
  title: string;
  evidenceSource: string;
  researchTerminology: string;
  associationType: EvidenceAssociationType;
  channel: EvidenceChannel;
  verificationState: EvidenceVerificationState;
  snippet: string;
  url?: string;
  accessDate?: string;
  datasetRevision: string;
  evidenceDigest: string;
  isMock: boolean;
  anatomyStages?: ExplorerAnatomyId[];
  keywords?: string[];
  sourceMetadata: EvidenceSourceMetadata;
  xdcSubnetTxRef?: XdcSubnetTransactionRef;
}

export interface ResearchFederationQuery {
  query: string;
  anatomyId: ExplorerAnatomyId;
  anatomyLabel: string;
  mode: EvidenceSourceMode;
}

export interface ResearchFederationResult {
  query: string;
  mode: EvidenceSourceMode;
  anatomyLabel: string;
  answer: string;
  apiProvider: string;
  evidenceItems: FederatedEvidenceItem[];
  isEmergencyPrompt: boolean;
  emergencyNotice: string | null;
  disclaimer: string;
  containsMockRecords: boolean;
}

export interface EvidenceVerificationCheckResult {
  itemId: string;
  verified: boolean;
  isSimulatedCheck: boolean;
  checkedAtIso: string;
  statusLabel: string;
  summary: string;
  computedDigest: string;
  digestMatches: boolean;
}

export interface IOffChainSearchConnector {
  readonly connectorId: string;
  search(query: ResearchFederationQuery): Promise<{
    answer: string;
    apiProvider: string;
    items: FederatedEvidenceItem[];
    isEmergencyPrompt: boolean;
    emergencyNotice: string | null;
    disclaimer: string;
  }>;
}

export interface IOnChainEvidenceConnector {
  readonly connectorId: string;
  search(query: ResearchFederationQuery): Promise<{
    items: FederatedEvidenceItem[];
    summaryText: string;
  }>;
}

export interface IEvidenceVerificationProvider {
  readonly providerId: string;
  verifyEvidence(item: FederatedEvidenceItem): Promise<EvidenceVerificationCheckResult>;
}

export interface IResearchFederationService {
  searchFederatedEvidence(query: ResearchFederationQuery): Promise<ResearchFederationResult>;
}
