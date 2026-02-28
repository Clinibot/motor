"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useWizardStore } from '../../store/wizardStore';
import Script from 'next/script';

interface Call {
    id: string;
    retell_call_id: string;
    retell_agent_id: string;
    call_status: string;
    duration_ms: number | null;
    transcript: string | null;
    recording_url: string | null;
    call_cost: number | null;
    disconnection_reason: string | null;
    call_analysis: { user_sentiment?: string; call_successful?: boolean } | null;
    created_at: string;
}

interface Agent {
    id: string;
    name: string;
    retell_agent_id: string | null;
    type: string;
    status: string;
}

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
    workspace_id: string | null;
}

export default function DashboardPage() {
    const router = useRouter();
    const { resetWizard } = useWizardStore();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [calls, setCalls] = useState<Call[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chartJsReady, setChartJsReady] = useState(false);
    const callsChartRef = useRef<HTMLCanvasElement>(null);
    const sentimentChartRef = useRef<HTMLCanvasElement>(null);
    const disconnectChartRef = useRef<HTMLCanvasElement>(null);
    const agentsChartRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartsInstances = useRef<any[]>([]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }

            const { data: profile } = await supabase
                .from('users').select('full_name, email, role, workspace_id')
                .eq('id', session.user.id).single();

            let currentWorkspaceId = profile?.workspace_id;

            if (profile && !currentWorkspaceId && profile.role !== 'superadmin') {
                // Try to auto-assign a free workspace
                try {
                    const assignRes = await fetch('/api/admin/workspaces/auto-assign', { method: 'POST' });
                    const assignData = await assignRes.json();
                    if (assignData.success && assignData.workspace_id) {
                        currentWorkspaceId = assignData.workspace_id;
                        profile.workspace_id = currentWorkspaceId;
                    }
                } catch (e) {
                    console.error("Failed to auto-assign workspace", e);
                }
            }

            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user', workspace_id: currentWorkspaceId });

            if (currentWorkspaceId) {
                const [{ data: agentList }, { data: callList }] = await Promise.all([
                    supabase.from('agents').select('*').eq('workspace_id', currentWorkspaceId).order('created_at', { ascending: false }),
                    supabase.from('calls').select('*').eq('workspace_id', currentWorkspaceId).order('created_at', { ascending: false }).limit(100),
                ]);
                setAgents(agentList ?? []);
                setCalls(callList ?? []);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleCreateAgent = (e: React.MouseEvent) => {
        e.preventDefault();
        resetWizard();
        router.push('/wizard');
    };

    // Build charts when both data and Chart.js are ready
    useEffect(() => {
        if (!chartJsReady || isLoading) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Chart = (window as any).Chart;
        if (!Chart) return;

        // Destroy previous charts
        chartsInstances.current.forEach(c => c.destroy());
        chartsInstances.current = [];

        // ── 1. Calls timeline (line) ──
        if (callsChartRef.current) {
            const last7 = getLast7DaysData(calls);
            const c = new Chart(callsChartRef.current, {
                type: 'line',
                data: {
                    labels: last7.labels,
                    datasets: [{
                        label: 'Llamadas',
                        data: last7.data,
                        borderColor: '#267ab0',
                        backgroundColor: 'rgba(38,122,176,0.08)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#267ab0',
                    }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
            });
            chartsInstances.current.push(c);
        }

        // ── 2. Sentiment donut ──
        if (sentimentChartRef.current) {
            const sentCounts = getSentimentCounts(calls);
            const c = new Chart(sentimentChartRef.current, {
                type: 'doughnut',
                data: {
                    labels: ['Positivo', 'Neutral', 'Negativo'],
                    datasets: [{ data: [sentCounts.positive, sentCounts.neutral, sentCounts.negative], backgroundColor: ['#22c55e', '#9ca3af', '#f97316'], borderWidth: 0 }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } }, cutout: '65%' },
            });
            chartsInstances.current.push(c);
        }

        // ── 3. Disconnection reasons bar ──
        if (disconnectChartRef.current) {
            const reasons = getDisconnectionReasons(calls);
            const c = new Chart(disconnectChartRef.current, {
                type: 'bar',
                data: {
                    labels: reasons.labels,
                    datasets: [{ data: reasons.data, backgroundColor: '#267ab0', borderRadius: 4 }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
            });
            chartsInstances.current.push(c);
        }

        // ── 4. Calls per agent donut ──
        if (agentsChartRef.current) {
            const byAgent = getCallsByAgent(calls, agents);
            const c = new Chart(agentsChartRef.current, {
                type: 'doughnut',
                data: {
                    labels: byAgent.labels,
                    datasets: [{ data: byAgent.data, backgroundColor: ['#267ab0', '#22c55e', '#9333ea', '#f97316', '#ef4444'], borderWidth: 0 }],
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } }, cutout: '65%' },
            });
            chartsInstances.current.push(c);
        }
    }, [chartJsReady, isLoading, calls, agents]);

    // ---- Stats computed from real data ----
    const totalCalls = calls.length;
    const successCalls = calls.filter(c => c.call_analysis?.call_successful).length;
    const successRate = totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) + '%' : '0%';
    const avgDurMs = totalCalls > 0 ? calls.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / totalCalls : 0;
    const avgDur = formatDuration(avgDurMs);
    const totalCost = calls.reduce((s, c) => s + (c.call_cost ?? 0), 0);
    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const getAgentName = (retellAgentId: string) => {
        const a = agents.find(ag => ag.retell_agent_id === retellAgentId);
        return a?.name ?? retellAgentId.slice(0, 10) + '…';
    };

    const sentimentLabel = (s?: string) => {
        const map: Record<string, string> = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' };
        return map[s?.toLowerCase() ?? ''] ?? '—';
    };
    const sentimentClass = (s?: string) => {
        const map: Record<string, string> = { positive: 'positive', neutral: 'neutral', negative: 'negative' };
        return map[s?.toLowerCase() ?? ''] ?? 'neutral';
    };

    return (
        <>
            <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" onLoad={() => setChartJsReady(true)} />
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;color:#1a1a1a}
                .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:#fff;border-right:1px solid #e5e7eb;z-index:100;display:flex;flex-direction:column}
                .logo-container{padding:24px 20px;border-bottom:1px solid #e5e7eb}
                .nav-menu{flex:1;padding:20px 0;overflow-y:auto}
                .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left}
                .nav-item:hover{background:#f9fafb;color:#267ab0}
                .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0}
                .nav-item.admin-item{color:#7c3aed}
                .nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}
                .nav-icon{width:20px;height:20px;margin-right:12px;flex-shrink:0}
                .admin-sep{margin:0 20px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px}
                .admin-sep span{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;padding:0 0 8px 0;display:block}
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
                .topbar-right{display:flex;align-items:center;gap:20px}
                .balance{display:flex;align-items:center;gap:8px;padding:8px 16px;background:#f9fafb;border-radius:8px;font-size:14px;font-weight:600;color:#1a1a1a}
                .balance-amount{color:#267ab0}
                .notification-bell{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f9fafb;cursor:pointer;border:none;transition:all .2s}
                .notification-bell:hover{background:#e5e7eb}
                .notification-badge{position:absolute;top:8px;right:8px;width:8px;height:8px;background:#ef4444;border-radius:50%;border:2px solid #fff}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .content{flex:1;padding:32px}
                .stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-bottom:32px}
                .stat-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;transition:all .3s;cursor:default}
                .stat-card:hover{transform:translateY(-4px);box-shadow:0 12px 24px rgba(0,0,0,.08)}
                .stat-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}
                .stat-title{font-size:14px;color:#6b7280;font-weight:500}
                .stat-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center}
                .stat-icon.blue{background:#eff6fb}.stat-icon.green{background:#f0fdf4}.stat-icon.purple{background:#faf5ff}.stat-icon.orange{background:#fff7ed}
                .stat-value{font-size:32px;font-weight:700;color:#1a1a1a;margin-bottom:8px}
                .stat-footer{display:flex;align-items:center;gap:8px;font-size:13px}
                .stat-period{color:#9ca3af}
                .charts-section{display:grid;grid-template-columns:2fr 1fr;gap:24px;margin-bottom:32px}
                .chart-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb}
                .chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
                .chart-title{font-size:18px;font-weight:600;color:#1a1a1a}
                .chart-filters{display:flex;gap:8px}
                .filter-btn{padding:6px 12px;border:1px solid #e5e7eb;background:#fff;border-radius:6px;font-size:13px;font-weight:500;color:#6b7280;cursor:pointer;transition:all .2s;font-family:inherit}
                .filter-btn:hover{border-color:#267ab0;color:#267ab0}
                .filter-btn.active{background:#267ab0;border-color:#267ab0;color:#fff}
                .chart-container{position:relative;height:280px}
                .table-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb}
                .table-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
                .table-title{font-size:18px;font-weight:600;color:#1a1a1a}
                .table-actions{display:flex;gap:12px}
                .btn-secondary{padding:8px 16px;border:1px solid #e5e7eb;background:#fff;border-radius:8px;font-size:14px;font-weight:500;color:#6b7280;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px;font-family:inherit;text-decoration:none}
                .btn-secondary:hover{border-color:#267ab0;color:#267ab0}
                .btn-primary{padding:10px 20px;background:#267ab0;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px;font-family:inherit;text-decoration:none}
                .btn-primary:hover{background:#1e5a87;transform:translateY(-1px);box-shadow:0 4px 12px rgba(38,122,176,.3)}
                .calls-table{width:100%;border-collapse:collapse}
                .calls-table thead{background:#f9fafb;border-bottom:1px solid #e5e7eb}
                .calls-table th{padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
                .calls-table td{padding:16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1a1a1a}
                .calls-table tbody tr{transition:all .2s;cursor:pointer}
                .calls-table tbody tr:hover{background:#f9fafb}
                .agent-info{display:flex;align-items:center;gap:12px}
                .agent-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;flex-shrink:0}
                .agent-name{font-weight:600;color:#1a1a1a}
                .badge{padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
                .badge.success{background:#dcfce7;color:#16a34a}
                .badge.error{background:#fee2e2;color:#dc2626}
                .badge.positive{background:#dbeafe;color:#2563eb}
                .badge.neutral{background:#f3f4f6;color:#6b7280}
                .badge.negative{background:#fef3c7;color:#d97706}
                .action-btns{display:flex;gap:8px}
                .action-btn{width:32px;height:32px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
                .action-btn:hover{background:#f9fafb;border-color:#267ab0}
                .spinner{border:3px solid #f3f4f6;border-top:3px solid #267ab0;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 16px}
                @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
                .table-wrapper{overflow-x:auto}
                .empty-state{padding:60px 40px;text-align:center;color:#9ca3af;font-size:14px}
                @media(max-width:1024px){.charts-section{grid-template-columns:1fr}}
            `}</style>

            <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
                {/* SIDEBAR */}
                <aside className="sidebar">
                    <div className="logo-container">
                        <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                            <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                        </svg>
                    </div>
                    <nav className="nav-menu">
                        {[
                            { label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z', active: true },
                            { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', active: false },
                            { label: 'Mis números', href: '/dashboard/numbers', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', active: false },
                            { label: 'Biblioteca de plantillas', href: '#', icon: 'M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z', active: false },
                            { label: 'Configuración', href: '#', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z', active: false },
                            { label: 'Ayuda y soporte', href: '#', icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z', active: false },
                        ].map(item => (
                            <Link key={item.label} href={item.href} className={`nav-item${item.active ? ' active' : ''}`}>
                                <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
                                </svg>
                                {item.label}
                            </Link>
                        ))}

                        {/* Superadmin admin link */}
                        {user?.role === 'superadmin' && (
                            <>
                                <div className="admin-sep">
                                    <span>Administración</span>
                                </div>
                                <Link href="/admin" className="nav-item admin-item">
                                    <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                                    </svg>
                                    Panel de Admin
                                </Link>
                            </>
                        )}
                    </nav>
                </aside>

                {/* MAIN CONTENT */}
                <main className="main-content">
                    {/* TOPBAR */}
                    <header className="topbar">
                        <div className="topbar-left">
                            <h1>Dashboard principal</h1>
                        </div>
                        <div className="topbar-right">
                            <button onClick={handleCreateAgent} className="btn-primary">
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Crear nuevo agente
                            </button>
                            <div className="balance">
                                <span>Balance:</span>
                                <span className="balance-amount">€{totalCost.toFixed(2)}</span>
                            </div>
                            <button className="notification-bell">
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                </svg>
                                <span className="notification-badge" />
                            </button>
                            <button className="user-avatar" onClick={handleLogout} title="Cerrar sesión">
                                {userInitial}
                            </button>
                        </div>
                    </header>

                    <div className="content">
                        {isLoading ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                                <div className="spinner" />
                                <p>Cargando métricas...</p>
                            </div>
                        ) : (
                            <>
                                {/* STATS CARDS */}
                                <div className="stats-grid">
                                    {[
                                        {
                                            title: 'Total de llamadas', value: totalCalls.toString(), iconColor: '#267ab0', iconClass: 'blue',
                                            icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z'
                                        },
                                        {
                                            title: 'Tasa de éxito', value: successRate, iconColor: '#16a34a', iconClass: 'green',
                                            icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                                        },
                                        {
                                            title: 'Duración promedio', value: avgDur, iconColor: '#9333ea', iconClass: 'purple',
                                            icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z'
                                        },
                                        {
                                            title: 'Costo total', value: `€${totalCost.toFixed(2)}`, iconColor: '#ea580c', iconClass: 'orange',
                                            icon: 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z'
                                        },
                                    ].map(stat => (
                                        <div key={stat.title} className="stat-card">
                                            <div className="stat-header">
                                                <span className="stat-title">{stat.title}</span>
                                                <div className={`stat-icon ${stat.iconClass}`}>
                                                    <svg width="20" height="20" fill={stat.iconColor} viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d={stat.icon} clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="stat-value">{stat.value}</div>
                                            <div className="stat-footer">
                                                <span className="stat-period">vs. semana anterior</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* CHARTS ROW 1 */}
                                <div className="charts-section">
                                    <div className="chart-card">
                                        <div className="chart-header">
                                            <h3 className="chart-title">Llamadas en el tiempo</h3>
                                            <div className="chart-filters">
                                                <button className="filter-btn active">7D</button>
                                                <button className="filter-btn">30D</button>
                                                <button className="filter-btn">90D</button>
                                            </div>
                                        </div>
                                        <div className="chart-container">
                                            <canvas ref={callsChartRef} />
                                        </div>
                                    </div>
                                    <div className="chart-card">
                                        <div className="chart-header">
                                            <h3 className="chart-title">Sentimiento de usuarios</h3>
                                        </div>
                                        <div className="chart-container">
                                            <canvas ref={sentimentChartRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* CHARTS ROW 2 */}
                                <div className="charts-section">
                                    <div className="chart-card">
                                        <div className="chart-header">
                                            <h3 className="chart-title">Motivos de desconexión</h3>
                                        </div>
                                        <div className="chart-container">
                                            <canvas ref={disconnectChartRef} />
                                        </div>
                                    </div>
                                    <div className="chart-card">
                                        <div className="chart-header">
                                            <h3 className="chart-title">Llamadas por agente</h3>
                                        </div>
                                        <div className="chart-container">
                                            <canvas ref={agentsChartRef} />
                                        </div>
                                    </div>
                                </div>

                                {/* RECENT CALLS TABLE */}
                                <div className="table-card">
                                    <div className="table-header">
                                        <h3 className="table-title">Llamadas recientes</h3>
                                        <div className="table-actions">
                                            <button className="btn-secondary">
                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Exportar
                                            </button>
                                        </div>
                                    </div>
                                    {calls.length === 0 ? (
                                        <div className="empty-state">
                                            Las llamadas aparecerán aquí automáticamente una vez que los agentes realicen conversaciones.
                                        </div>
                                    ) : (
                                        <div className="table-wrapper">
                                            <table className="calls-table">
                                                <thead>
                                                    <tr>
                                                        <th>Fecha y Hora</th>
                                                        <th>Usuario</th>
                                                        <th>Agente</th>
                                                        <th>Duración</th>
                                                        <th>Sentimiento</th>
                                                        <th>Estado</th>
                                                        <th>Costo</th>
                                                        <th>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calls.map(call => {
                                                        const sentiment = call.call_analysis?.user_sentiment;
                                                        const successful = call.call_analysis?.call_successful;
                                                        const userName = extractUserName(call.transcript);
                                                        const agentName = getAgentName(call.retell_agent_id);
                                                        const initial = agentName[0]?.toUpperCase() ?? 'A';
                                                        return (
                                                            <tr key={call.id}>
                                                                <td suppressHydrationWarning>{new Date(call.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                                <td>{userName}</td>
                                                                <td>
                                                                    <div className="agent-info">
                                                                        <div className="agent-avatar">{initial}</div>
                                                                        <span className="agent-name">{agentName}</span>
                                                                    </div>
                                                                </td>
                                                                <td>{formatDuration(call.duration_ms)}</td>
                                                                <td><span className={`badge ${sentimentClass(sentiment)}`}>{sentimentLabel(sentiment)}</span></td>
                                                                <td><span className={`badge ${successful ? 'success' : 'error'}`}>{successful ? '✓ Exitosa' : '✗ Fallida'}</span></td>
                                                                <td>{call.call_cost ? `€${call.call_cost.toFixed(2)}` : '—'}</td>
                                                                <td>
                                                                    <div className="action-btns">
                                                                        <button className="action-btn" title="Ver detalle">
                                                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                        <button className="action-btn" title="Reproducir">
                                                                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

// ---- Helper functions ----
function formatDuration(ms: number | null): string {
    if (!ms || ms === 0) return '—';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function extractUserName(transcript: string | null): string {
    if (!transcript) return '—';
    const match = transcript.match(/(?:me llamo|soy|habla|nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i);
    return match ? match[1] : '—';
}

function getLast7DaysData(calls: Call[]) {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        const count = calls.filter(c => {
            const cd = new Date(c.created_at);
            return cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        }).length;
        days.push({ label, count });
    }
    return { labels: days.map(d => d.label), data: days.map(d => d.count) };
}

function getSentimentCounts(calls: Call[]) {
    return calls.reduce((acc, c) => {
        const s = c.call_analysis?.user_sentiment?.toLowerCase();
        if (s === 'positive') acc.positive++;
        else if (s === 'negative') acc.negative++;
        else acc.neutral++;
        return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
}

function getDisconnectionReasons(calls: Call[]) {
    const counts: Record<string, number> = {};
    calls.forEach(c => {
        const r = c.disconnection_reason ?? 'Desconocido';
        const label = r === 'agent_hangup' ? 'Agente finalizó' : r === 'user_hangup' ? 'Usuario colgó' : r === 'transfer' ? 'Transferencia' : r === 'inactivity' ? 'Inactividad' : r === 'error' ? 'Error' : r;
        counts[label] = (counts[label] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
}

function getCallsByAgent(calls: Call[], agents: Agent[]) {
    const counts: Record<string, number> = {};
    calls.forEach(c => {
        const agent = agents.find(a => a.retell_agent_id === c.retell_agent_id);
        const name = agent?.name ?? c.retell_agent_id.slice(0, 8);
        counts[name] = (counts[name] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
}
