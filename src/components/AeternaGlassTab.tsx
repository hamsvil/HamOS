// [AUTO-GENERATED-IMPORTS-START]
import { ActiveSessionTable } from './Aeterna/components/ActiveSessionTable';
import { AeternaHealthMeter } from './Aeterna/components/AeternaHealthMeter';
import { AeternaStatusBadge } from './Aeterna/components/AeternaStatusBadge';
import { AppLauncher } from './Aeterna/components/AppLauncher';
import { BatteryLevelMeter } from './Aeterna/components/BatteryLevelMeter';
import { BroadcastMessageForm } from './Aeterna/components/BroadcastMessageForm';
import { ClipboardSyncButton } from './Aeterna/components/ClipboardSyncButton';
import { CommandResponseLog } from './Aeterna/components/CommandResponseLog';
import { CommandTemplatePicker } from './Aeterna/components/CommandTemplatePicker';
import { ConnectionRetryConfig } from './Aeterna/components/ConnectionRetryConfig';
import { DeviceStatusGrid } from './Aeterna/components/DeviceStatusGrid';
import { EventStreamMonitor } from './Aeterna/components/EventStreamMonitor';
import { FileTransferControl } from './Aeterna/components/FileTransferControl';
import { ForceDisconnectButton } from './Aeterna/components/ForceDisconnectButton';
import { KeyInjectionPanel } from './Aeterna/components/KeyInjectionPanel';
import { LogExportControl } from './Aeterna/components/LogExportControl';
import { NetworkLatencyChart } from './Aeterna/components/NetworkLatencyChart';
import { PayloadJsonEditor } from './Aeterna/components/PayloadJsonEditor';
import { RebootRemoteButton } from './Aeterna/components/RebootRemoteButton';
import { RelayEndpointInput } from './Aeterna/components/RelayEndpointInput';
import { RelaySettingsPanel } from './Aeterna/components/RelaySettingsPanel';
import { RemoteHistoryList } from './Aeterna/components/RemoteHistoryList';
import { RemoteShellToggle } from './Aeterna/components/RemoteShellToggle';
import { ResourceUsageBar } from './Aeterna/components/ResourceUsageBar';
import { SavedDeviceManager } from './Aeterna/components/SavedDeviceManager';
import { ScreenshotViewer } from './Aeterna/components/ScreenshotViewer';
import { SecretKeyManager } from './Aeterna/components/SecretKeyManager';
import { SecurityPolicyEditor } from './Aeterna/components/SecurityPolicyEditor';
import { TargetDeviceSelector } from './Aeterna/components/TargetDeviceSelector';
import { WakeUpDeviceButton } from './Aeterna/components/WakeUpDeviceButton';
// [AUTO-GENERATED-IMPORTS-END]
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Glasses, Send, RefreshCw, Shield, ShieldOff, Smartphone, Server, Terminal as TerminalIcon, Bot } from 'lucide-react';
import { useAeternaGlass } from './HamAiStudio/hooks/useAeternaGlass';
import { useFeatureAgent } from './HamAiStudio/hooks/useFeatureAgent';
import { Badge } from './ui/badge';

interface LogEntry {
  ts: number;
  kind: 'info' | 'ok' | 'err';
  text: string;
}

export default function AeternaGlassTab() {
  const { boundInstance } = useFeatureAgent('aeterna-glass');
  const { status, loading: busy, error, sendCommand: apiSendCommand, refreshStatus } = useAeternaGlass();
  const [secret, setSecret] = useState<string>(() => localStorage.getItem('aeterna.secret') || '');
  const [command, setCommand] = useState<string>('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const log = (kind: LogEntry['kind'], text: string) =>
    setLogs(prev => [...prev.slice(-200), { ts: Date.now(), kind, text }]);

  useEffect(() => {
    if (error) log('err', error);
  }, [error]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [logs]);

  const saveSecret = () => {
    localStorage.setItem('aeterna.secret', secret);
    log('ok', 'Secret saved locally');
  };

  const handleSendCommand = async () => {
    if (!command.trim()) return;
    if (!secret) {
      log('err', 'Set a relay secret first (must match server RELAY_SECRET)');
      return;
    }
    
    const resultId = await apiSendCommand(command, secret);
    if (resultId) {
      log('ok', `Queued ${resultId}: ${command}`);
      setCommand('');
    }
  };

  const pollOnce = async () => {
    if (!secret) {
      log('err', 'Set a relay secret first');
      return;
    }
    try {
      const r = await fetch(`/api/aeterna/poll?secret=${encodeURIComponent(secret)}`);
      const j = await r.json();
      if (r.ok) {
        if (j.command) log('ok', `Pulled: ${j.command.command} (${j.command.id})`);
        else log('info', 'Queue empty');
        refreshStatus();
      } else {
        log('err', `${r.status}: ${j.error}`);
      }
    } catch (e: any) {
      log('err', `Poll failed: ${e.message}`);
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 text-white p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <header className="flex items-center gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/10">
            <Glasses size={28} className="text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold tracking-tight">AeternaGlass Relay</h1>
              {boundInstance && (
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 flex gap-2 items-center">
                  <Bot size={12} />
                  Agent: {boundInstance.agent.displayName} @ {boundInstance.ruleset.displayName}
                </Badge>
              )}
            </div>
            <p className="text-sm text-white/60">
              Bridge for the AeternaGlass Android floating-AI agent. Queue commands here,
              the on-device agent polls and executes them.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={<Server size={18} />}
            label="Relay"
            value={status ? (status.ok ? 'Online' : 'Down') : '…'}
            tone={status?.ok ? 'good' : 'warn'}
          />
          <StatCard
            icon={status?.secured ? <Shield size={18} /> : <ShieldOff size={18} />}
            label="Auth"
            value={status?.secured ? 'RELAY_SECRET set' : 'Unsecured'}
            tone={status?.secured ? 'good' : 'bad'}
          />
          <StatCard
            icon={<TerminalIcon size={18} />}
            label="Queued"
            value={status ? String(status.queueLength) : '0'}
            tone="info"
          />
        </div>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4 backdrop-blur">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Smartphone size={16} /> Relay Secret
          </h2>
          <div className="flex gap-2">
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Must match server RELAY_SECRET env"
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={saveSecret}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-sm transition"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Stored in this browser only. Server compares against the
            <code className="text-cyan-300 px-1">RELAY_SECRET</code> environment variable.
          </p>
        </section>

        <section className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4 backdrop-blur">
          <h2 className="text-sm font-semibold mb-3">Queue command for the Android agent</h2>
          <div className="flex gap-2">
            <input
              value={command}
              onChange={e => setCommand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendCommand()}
              placeholder='e.g. {"action":"open","app":"chrome"}'
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSendCommand}
              disabled={busy}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-sm flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send size={14} /> Queue
            </button>
            <button
              onClick={pollOnce}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm flex items-center gap-2 transition"
            >
              <RefreshCw size={14} /> Test poll
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-black/40 border border-white/10 p-4 backdrop-blur">
          <h2 className="text-sm font-semibold mb-3">Activity</h2>
          <div ref={logRef} className="h-64 overflow-auto font-mono text-xs space-y-1">
            {logs.length === 0 && (
              <div className="text-white/40">No activity yet. Queue a command to get started.</div>
            )}
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.kind === 'err'
                    ? 'text-rose-300'
                    : l.kind === 'ok'
                      ? 'text-emerald-300'
                      : 'text-white/70'
                }
              >
                [{new Date(l.ts).toLocaleTimeString()}] {l.text}
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-6 text-xs text-white/40 leading-relaxed">
          <p>
            Source extracted to <code className="text-cyan-300">/AeternaGlass/</code> (Android
            project + relay). The server replaces the standalone relay at
            <code className="text-cyan-300"> server/relay/index.js</code>. Set the
            <code className="text-cyan-300"> RELAY_SECRET</code> environment variable to enable
            authentication (required — endpoints fail-closed when unset).
          </p>
        </footer>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'good' | 'bad' | 'warn' | 'info';
}) {
  const colors = {
    good: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    bad: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    warn: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    info: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  } as const;
  return (
    <div className={`rounded-xl border p-4 backdrop-blur ${colors[tone]}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-8 opacity-50 border-t border-slate-800 pt-4">
          // [AUTO-GENERATED-COMPONENTS-START]
          <ActiveSessionTable />
          <AeternaHealthMeter />
          <AeternaStatusBadge />
          <AppLauncher />
          <BatteryLevelMeter />
          <BroadcastMessageForm />
          <ClipboardSyncButton />
          <CommandResponseLog />
          <CommandTemplatePicker />
          <ConnectionRetryConfig />
          <DeviceStatusGrid />
          <EventStreamMonitor />
          <FileTransferControl />
          <ForceDisconnectButton />
          <KeyInjectionPanel />
          <LogExportControl />
          <NetworkLatencyChart />
          <PayloadJsonEditor />
          <RebootRemoteButton />
          <RelayEndpointInput />
          <RelaySettingsPanel />
          <RemoteHistoryList />
          <RemoteShellToggle />
          <ResourceUsageBar />
          <SavedDeviceManager />
          <ScreenshotViewer />
          <SecretKeyManager />
          <SecurityPolicyEditor />
          <TargetDeviceSelector />
          <WakeUpDeviceButton />
          // [AUTO-GENERATED-COMPONENTS-END]
        </div>
</div>
  );
}
