/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  RefreshCw,
  ArrowLeftRight,
  Search,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Blocks,
} from 'lucide-react';
import {
  ExplorerAnatomyId,
  XdcBalanceResponse,
  XdcDigestVerificationResponse,
  XdcNetworkId,
  XdcNetworkStatusResponse,
  XdcTransactionResponse,
} from '../types/biomedical.ts';

interface XdcNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStructureId: ExplorerAnatomyId;
  clotPathProgress: number;
  isDarkTheme: boolean;
}

const SAMPLE_ADDRESS = 'xdc71C7656EC7ab88b098defB751B7401B5f6d8976F';

export const XdcNetworkModal: React.FC<XdcNetworkModalProps> = ({
  isOpen,
  onClose,
  selectedStructureId,
  clotPathProgress,
  isDarkTheme,
}) => {
  const [network, setNetwork] = useState<XdcNetworkId>('mainnet');
  const [statusLoading, setStatusLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<XdcNetworkStatusResponse | null>(null);

  const [addressInput, setAddressInput] = useState(SAMPLE_ADDRESS);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceResult, setBalanceResult] = useState<XdcBalanceResponse | null>(null);

  const [txHashInput, setTxHashInput] = useState('');
  const [txLoading, setTxLoading] = useState(false);
  const [txResult, setTxResult] = useState<XdcTransactionResponse | null>(null);

  const [digestLoading, setDigestLoading] = useState(false);
  const [digestResult, setDigestResult] = useState<XdcDigestVerificationResponse | null>(null);

  const fetchNetworkStatus = async (targetNet: XdcNetworkId) => {
    setStatusLoading(true);
    try {
      const resp = await fetch('/api/xdc/network-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network: targetNet }),
      });
      const data: XdcNetworkStatusResponse = await resp.json();
      setNetworkStatus(data);
    } catch (err: any) {
      setNetworkStatus({
        success: false,
        network: targetNet,
        endpointUsed: '',
        wsEndpoint: '',
        chainIdDecimal: targetNet === 'mainnet' ? 50 : 51,
        chainIdHex: targetNet === 'mainnet' ? '0x32' : '0x33',
        blockNumber: 0,
        blockNumberHex: '0x0',
        gasPriceGwei: '0',
        error: err?.message || 'Unable to query XDC RPC endpoint.',
        rpcCode: -32000,
      });
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchNetworkStatus(network);
    }
  }, [isOpen, network]);

  if (!isOpen) return null;

  // Real-time local format conversion preview (0x <-> xdc)
  const trimmedAddr = addressInput.trim();
  const hexSuffix = trimmedAddr.replace(/^(xdc|0x)/i, '');
  const isValidHexAddr = /^[0-9a-fA-F]{40}$/.test(hexSuffix);
  const previewEvm = isValidHexAddr ? `0x${hexSuffix.toLowerCase()}` : null;
  const previewXdc = isValidHexAddr ? `xdc${hexSuffix.toLowerCase()}` : null;

  const handleToggleAddressPrefix = () => {
    if (!isValidHexAddr) return;
    if (/^xdc/i.test(trimmedAddr)) {
      setAddressInput(`0x${hexSuffix}`);
    } else {
      setAddressInput(`xdc${hexSuffix}`);
    }
  };

  const handleQueryBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedAddr || balanceLoading) return;
    setBalanceLoading(true);
    try {
      const resp = await fetch('/api/xdc/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, address: trimmedAddr }),
      });
      const data: XdcBalanceResponse = await resp.json();
      setBalanceResult(data);
    } catch (err: any) {
      setBalanceResult({
        success: false,
        network,
        endpointUsed: '',
        evmAddress: '',
        xdcAddress: '',
        balanceWeiHex: '0x0',
        balanceXdc: '0',
        error: err?.message || 'Balance query failed.',
        rpcCode: -32000,
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleQueryTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = txHashInput.trim();
    if (!cleaned || txLoading) return;
    setTxLoading(true);
    try {
      const resp = await fetch('/api/xdc/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network, hash: cleaned }),
      });
      const data: XdcTransactionResponse = await resp.json();
      setTxResult(data);
    } catch (err: any) {
      setTxResult({
        success: false,
        network,
        endpointUsed: '',
        found: false,
        hash: cleaned,
        error: err?.message || 'Transaction lookup failed.',
        rpcCode: -32000,
      });
    } finally {
      setTxLoading(false);
    }
  };

  const handleVerifyDigest = async () => {
    if (digestLoading) return;
    setDigestLoading(true);
    try {
      const resp = await fetch('/api/xdc/verify-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          network,
          anatomyId: selectedStructureId,
          clotPathProgress,
        }),
      });
      const data: XdcDigestVerificationResponse = await resp.json();
      setDigestResult(data);
    } catch (err: any) {
      setDigestResult({
        success: false,
        network,
        endpointUsed: '',
        sha256Digest: '',
        blockNumber: 0,
        blockHash: '',
        blockTimestampIso: '',
        anatomyId: selectedStructureId,
        clotPathPct: Math.round(clotPathProgress * 100),
        error: err?.message || 'Digest verification failed.',
      });
    } finally {
      setDigestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-text">
      <div
        className={`w-full max-w-3xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isDarkTheme
            ? 'bg-[#101218] border-[#272b38] text-slate-100'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDarkTheme ? 'border-[#202431] bg-[#141720]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400 shrink-0">
              <Blocks className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight truncate">
                XDC Network JSON-RPC & Provenance Check
              </h2>
              <p className="text-xs font-mono text-slate-400 truncate">
                Live Mainnet (Chain 50) & Apothem Testnet (Chain 51) RPC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className={`inline-flex rounded-lg p-1 border text-xs font-semibold ${
                isDarkTheme ? 'bg-[#0b0d12] border-[#262a37]' : 'bg-slate-200/70 border-slate-300'
              }`}
            >
              <button
                onClick={() => setNetwork('mainnet')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  network === 'mainnet'
                    ? 'bg-sky-500 text-black font-bold'
                    : isDarkTheme
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Mainnet
              </button>
              <button
                onClick={() => setNetwork('apothem')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  network === 'apothem'
                    ? 'bg-amber-400 text-black font-bold'
                    : isDarkTheme
                    ? 'text-slate-300 hover:text-white'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Apothem Testnet
              </button>
            </div>

            <button
              onClick={() => void fetchNetworkStatus(network)}
              disabled={statusLoading}
              title="Refresh XDC RPC Status"
              className={`p-2 rounded-lg border transition-colors ${
                isDarkTheme
                  ? 'border-[#272b38] hover:bg-[#1e2230] text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              title="Close XDC Panel"
              className={`p-2 rounded-lg border transition-colors ${
                isDarkTheme
                  ? 'border-[#272b38] hover:bg-[#1e2230] text-slate-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* 1. Live RPC Snapshot */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isDarkTheme ? 'bg-[#141720] border-[#252938]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
                Live XDC RPC Node Response
              </span>
              {networkStatus?.endpointUsed && (
                <span className="text-xs font-mono text-slate-400">
                  {networkStatus.endpointUsed}
                </span>
              )}
            </div>

            {networkStatus?.error ? (
              <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-mono flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {networkStatus.rpcCode ? `[${networkStatus.rpcCode}] ` : ''}
                  {networkStatus.error}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`p-3 rounded-lg border ${
                    isDarkTheme ? 'bg-[#0e1017] border-[#242836]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-xs font-mono text-slate-400">Block Number</div>
                  <div className="text-base font-mono font-bold text-sky-400 tabular-nums mt-0.5">
                    {statusLoading
                      ? 'Querying...'
                      : networkStatus
                      ? `#${networkStatus.blockNumber.toLocaleString()}`
                      : '—'}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    isDarkTheme ? 'bg-[#0e1017] border-[#242836]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-xs font-mono text-slate-400">Chain ID</div>
                  <div className="text-base font-mono font-bold tabular-nums mt-0.5">
                    {networkStatus ? `${networkStatus.chainIdDecimal} (${networkStatus.chainIdHex})` : '—'}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${
                    isDarkTheme ? 'bg-[#0e1017] border-[#242836]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="text-xs font-mono text-slate-400">Gas Price</div>
                  <div className="text-base font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                    {networkStatus ? `${networkStatus.gasPriceGwei} Gwei` : '—'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Address Format Converter & eth_getBalance */}
          <form
            onSubmit={handleQueryBalance}
            className={`p-4 rounded-xl border space-y-3 ${
              isDarkTheme ? 'bg-[#141720] border-[#252938]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Address Format (xdc ↔ 0x) & Balance Query
              </span>
              <button
                type="button"
                onClick={handleToggleAddressPrefix}
                disabled={!isValidHexAddr}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-sky-500/40 text-sky-400 hover:bg-sky-500/15 disabled:opacity-40"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Swap xdc/0x</span>
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="Enter xdc... or 0x... address"
                className={`flex-1 px-3.5 py-2 rounded-lg border font-mono text-xs outline-none ${
                  isDarkTheme
                    ? 'bg-[#0e1017] border-[#292e3d] text-white focus:border-sky-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                }`}
              />
              <button
                type="submit"
                disabled={balanceLoading || !trimmedAddr}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-bold text-sm flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4" />
                <span>{balanceLoading ? 'Querying...' : 'Get Balance'}</span>
              </button>
            </div>

            {isValidHexAddr && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="px-2.5 py-1.5 rounded border border-slate-700/30 truncate">
                  <span className="text-slate-400">0x: </span>
                  <span>{previewEvm}</span>
                </div>
                <div className="px-2.5 py-1.5 rounded border border-slate-700/30 truncate">
                  <span className="text-slate-400">xdc: </span>
                  <span>{previewXdc}</span>
                </div>
              </div>
            )}

            {balanceResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  balanceResult.success
                    ? isDarkTheme
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                }`}
              >
                {balanceResult.success ? (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span>
                      Balance ({balanceResult.network}):{' '}
                      <strong className="text-sm">{balanceResult.balanceXdc} XDC</strong>
                    </span>
                    <span className="opacity-75">via {balanceResult.endpointUsed}</span>
                  </div>
                ) : (
                  <span>
                    {balanceResult.rpcCode ? `[${balanceResult.rpcCode}] ` : ''}
                    {balanceResult.error}
                  </span>
                )}
              </div>
            )}
          </form>

          {/* 3. Transaction Lookup (eth_getTransactionByHash) */}
          <form
            onSubmit={handleQueryTransaction}
            className={`p-4 rounded-xl border space-y-3 ${
              isDarkTheme ? 'bg-[#141720] border-[#252938]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
              Transaction Lookup (eth_getTransactionByHash)
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                placeholder="0x transaction hash (66 chars)"
                className={`flex-1 px-3.5 py-2 rounded-lg border font-mono text-xs outline-none ${
                  isDarkTheme
                    ? 'bg-[#0e1017] border-[#292e3d] text-white focus:border-sky-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                }`}
              />
              <button
                type="submit"
                disabled={txLoading || !txHashInput.trim()}
                className="px-4 py-2 rounded-lg bg-[#e6b65c] hover:bg-[#f3ca76] disabled:opacity-40 text-black font-bold text-sm shrink-0"
              >
                {txLoading ? 'Fetching...' : 'Inspect Tx'}
              </button>
            </div>

            {txResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  !txResult.success
                    ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                    : isDarkTheme
                    ? 'bg-[#0e1017] border-[#242836] text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {!txResult.success ? (
                  <span>
                    {txResult.rpcCode ? `[${txResult.rpcCode}] ` : ''}
                    {txResult.error}
                  </span>
                ) : !txResult.found ? (
                  <span className="text-slate-400">
                    Transaction hash not found on {txResult.network}.
                  </span>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sky-400 font-bold">
                        Status: {txResult.status?.toUpperCase()}
                      </span>
                      <span>Block: {txResult.blockNumber ?? 'Pending'}</span>
                    </div>
                    <div className="truncate">From: {txResult.fromXdc}</div>
                    <div className="truncate">To: {txResult.toXdc || 'Contract Creation'}</div>
                    <div>
                      Value: {txResult.valueXdc} XDC · Gas Price: {txResult.gasPriceGwei} Gwei
                    </div>
                  </>
                )}
              </div>
            )}
          </form>

          {/* 4. Disease POV Provenance SHA-256 Digest + XDC Block Checkpoint */}
          <div
            className={`p-4 rounded-xl border space-y-3 ${
              isDarkTheme ? 'bg-[#141720] border-[#252938]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Disease POV Provenance Digest Checkpoint
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Generates a deterministic SHA-256 digest for the active anatomical view ({selectedStructureId},{' '}
                  {Math.round(clotPathProgress * 100)}% path) bound to the latest live XDC block header.
                </p>
              </div>
              <button
                onClick={() => void handleVerifyDigest()}
                disabled={digestLoading}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold text-sm shrink-0"
              >
                {digestLoading ? 'Verifying...' : 'Stamp Digest'}
              </button>
            </div>

            {digestResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono space-y-1.5 ${
                  digestResult.success
                    ? isDarkTheme
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                }`}
              >
                {digestResult.success ? (
                  <>
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        Verified against XDC {digestResult.network} Block #{digestResult.blockNumber.toLocaleString()}
                      </span>
                    </div>
                    <div className="break-all">SHA-256: {digestResult.sha256Digest}</div>
                    <div className="break-all opacity-80">Block Hash: {digestResult.blockHash}</div>
                    <div className="opacity-80">Block Time: {digestResult.blockTimestampIso}</div>
                  </>
                ) : (
                  <span>{digestResult.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
