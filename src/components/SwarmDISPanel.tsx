/**
 * ════════════════════════════════════════════════════════════════
 * SwarmDISPanel — Digital Immune System UI Panel (Phase 5)
 * ════════════════════════════════════════════════════════════════
 *
 * Floating panel yang menampilkan aktivitas real-time dari
 * SwarmDIS: error yang diintersepsi, agent yang menangani,
 * dan hasil resolusi. Non-intrusive, bisa collapse/expand.
 * ════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwarmDIS } from '../hooks/useSwarmDIS';
import type { DISEvent } from '../sAgent/coreAgents/SwarmDIS';

const AGENT_COLORS: Record<string, string> = {
  agent1: '#a78bfa', // purple — The Weaver
  agent2: '#60a5fa', // blue — The Logic Gate
  agent3: '#f87171', // red — The Sentinel
  agent4: '#34d399', // green — The Accelerator
  agent5: '#fbbf24', // amber — The Surgeon
  agent6: '#38bdf8', // sky — The Courier
  agent7: '#f472b6', // pink — The Architect
};

const STATUS_COLORS: Record<string, string> = {
  queued: '#94a3b8',
  healing: '#fbbf24',
  resolved: '#34d399',
  skipped: '#f87171',
};

const STATUS_ICONS: Record<string, string> = {
  queued: '⏳',
  healing: '⚡',
  resolved: '✅',
  skipped: '⚠️',
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s lalu`;
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`;
  return `${Math.floor(s / 3600)}j lalu`;
}

function EventCard({ event }: { event: DISEvent }) {
  const [expanded, setExpanded] = useState(false);
  const color = AGENT_COLORS[event.agentId] ?? '#94a3b8';
  const statusColor = STATUS_COLORS[event.status] ?? '#94a3b8';
  const statusIcon = STATUS_ICONS[event.status] ?? '•';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid rgba(255,255,255,0.08)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '8px 10px',
        marginBottom: 6,
        cursor: 'pointer',
        fontSize: 11,
      }}
      onClick={() => setExpanded(e => !e)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ color, fontWeight: 700, fontSize: 10 }}>{event.agentName}</span>
        <span style={{ color: statusColor, fontSize: 10 }}>{statusIcon} {event.status}</span>
      </div>
      <div style={{ color: '#94a3b8', fontSize: 10, wordBreak: 'break-all', lineHeight: 1.4 }}>
        {event.errorSnippet.slice(0, 80)}{event.errorSnippet.length > 80 ? '…' : ''}
      </div>
      <AnimatePresence>
        {expanded && event.resolution && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              marginTop: 6,
              padding: '6px 8px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 6,
              color: '#e2e8f0',
              fontSize: 10,
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}>
              {event.resolution}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ color: '#475569', fontSize: 9 }}>{timeAgo(event.timestamp)}</span>
        {event.durationMs && (
          <span style={{ color: '#475569', fontSize: 9 }}>{event.durationMs}ms</span>
        )}
      </div>
    </motion.div>
  );
}

interface SwarmDISPanelProps {
  autoActivate?: boolean;
}

export function SwarmDISPanel({ autoActivate = true }: SwarmDISPanelProps) {
  const { status, toggle } = useSwarmDIS(autoActivate);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'feed' | 'stats'>('feed');

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggle();
  }, [toggle]);

  const pulseColor = status.active
    ? status.healing ? '#fbbf24' : '#34d399'
    : '#475569';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 72,
        right: 16,
        zIndex: 9998,
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      {/* Floating Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Swarm Digital Immune System"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'rgba(15,23,42,0.95)',
          border: `1px solid ${pulseColor}40`,
          borderRadius: 20,
          color: '#e2e8f0',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 12px ${pulseColor}30`,
          letterSpacing: '0.03em',
        }}
      >
        {/* Pulse indicator */}
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: pulseColor,
            display: 'inline-block',
          }} />
          {status.healing && (
            <motion.span
              animate={{ scale: [1, 2], opacity: [0.8, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: 8, height: 8, borderRadius: '50%',
                background: pulseColor,
              }}
            />
          )}
        </span>
        <span>DIS</span>
        {status.active && (
          <span style={{ color: '#94a3b8', fontWeight: 400 }}>
            {status.totalResolved}✓ {status.totalIntercepted - status.totalResolved - status.totalSkipped > 0
              ? `${status.totalIntercepted - status.totalResolved - status.totalSkipped}⏳` : ''}
          </span>
        )}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              marginBottom: 8,
              width: 320,
              maxHeight: 480,
              background: 'rgba(10,14,26,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>
                  🛡️ Swarm Digital Immune System
                </div>
                <div style={{ color: '#475569', fontSize: 10, marginTop: 1 }}>
                  Phase 5 — Real-time self-healing
                </div>
              </div>
              <motion.button
                onClick={handleToggle}
                whileTap={{ scale: 0.9 }}
                style={{
                  padding: '4px 10px',
                  background: status.active ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
                  border: `1px solid ${status.active ? '#ef444440' : '#34d39940'}`,
                  borderRadius: 6,
                  color: status.active ? '#ef4444' : '#34d399',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {status.active ? 'DEAKTIF' : 'AKTIF'}
              </motion.button>
            </div>

            {/* Status Bar */}
            <div style={{
              padding: '8px 14px',
              background: 'rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: 16,
              fontSize: 10,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#60a5fa', fontWeight: 700, fontSize: 14 }}>{status.totalIntercepted}</div>
                <div style={{ color: '#475569' }}>Intersep</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#34d399', fontWeight: 700, fontSize: 14 }}>{status.totalResolved}</div>
                <div style={{ color: '#475569' }}>Resolved</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#f87171', fontWeight: 700, fontSize: 14 }}>{status.totalSkipped}</div>
                <div style={{ color: '#475569' }}>Skipped</div>
              </div>
              <div style={{ textAlign: 'center', marginLeft: 'auto' }}>
                <div style={{
                  color: status.healing ? '#fbbf24' : status.active ? '#34d399' : '#475569',
                  fontWeight: 700, fontSize: 10,
                }}>
                  {status.healing ? '⚡ HEALING' : status.active ? '✅ AKTIF' : '⏸ NONAKTIF'}
                </div>
                {status.lastActivity && (
                  <div style={{ color: '#334155', fontSize: 9 }}>{timeAgo(status.lastActivity)}</div>
                )}
              </div>
            </div>

            {/* Tab Nav */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              {(['feed', 'stats'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: '7px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent',
                    color: tab === t ? '#60a5fa' : '#475569',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {t === 'feed' ? '📡 Activity Feed' : '📊 Stats'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
              {tab === 'feed' && (
                <>
                  {status.recentEvents.length === 0 ? (
                    <div style={{
                      textAlign: 'center', color: '#334155', fontSize: 11,
                      padding: '30px 0', lineHeight: 1.8,
                    }}>
                      {status.active
                        ? '🔍 Memantau errors…\nBelum ada aktivitas.'
                        : '⏸ DIS nonaktif.\nAktifkan untuk mulai memantau.'}
                    </div>
                  ) : (
                    status.recentEvents.slice(0, 20).map(event => (
                      <EventCard key={event.id} event={event} />
                    ))
                  )}
                </>
              )}

              {tab === 'stats' && (
                <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 2 }}>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Routing Agents</div>
                    {Object.entries(AGENT_COLORS).map(([id, color]) => {
                      const count = status.recentEvents.filter(e => e.agentId === id).length;
                      return (
                        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ color }}>
                            ● {status.recentEvents.find(e => e.agentId === id)?.agentName ?? id}
                          </span>
                          <span style={{ color: '#475569' }}>{count} task</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Konfigurasi</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Circuit Breaker</span>
                      <span style={{ color: '#34d399' }}>5 fix/min</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dedup Window</span>
                      <span style={{ color: '#34d399' }}>30s</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Persistence</span>
                      <span style={{ color: '#60a5fa' }}>IDB + JSON</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Routing Rules</span>
                      <span style={{ color: '#a78bfa' }}>6 rules</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 9, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Event Sources</div>
                    <div style={{ color: '#475569', lineHeight: 1.6 }}>
                      • hamEventBus SYSTEM_ERROR<br />
                      • SAERE saere-notification<br />
                      • window unhandledrejection<br />
                      • Blackboard (Phase 4)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '6px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              color: '#1e293b',
              fontSize: 9,
              textAlign: 'center',
            }}>
              Swarm DIS v1.0 — Phase 5 Integration
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
