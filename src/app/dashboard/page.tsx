"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useWizardStore } from '../../store/wizardStore';
import Script from 'next/script';
import NotificationsPanel from '../../components/NotificationsPanel';
import DashboardSidebar from '../../components/DashboardSidebar';
import DashboardTopbar from '../../components/DashboardTopbar';
import ViewSwitcher from '../../components/ViewSwitcher';

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
    call_analysis: {
        user_sentiment?: string;
        call_successful?: boolean;
        call_summary?: string;
        custom_variables?: Record<string, unknown>;
        custom_analysis_data?: Record<string, unknown>;
    } | null;
    customer_number: string | null;
    customer_name: string | null;
    call_type: string | null;
    cost_breakdown: {
        product_costs?: { product: string; cost: number; unit_price: number }[];
        combined_cost?: number;
    } | null;
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
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [agentFilter, setAgentFilter] = useState('all');
    const [timeFilter, setTimeFilter] = useState('7d');
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [chartJsReady, setChartJsReady] = useState(false);
    const callsChartRef = useRef<HTMLCanvasElement>(null);
    const sentimentChartRef = useRef<HTMLCanvasElement>(null);
    const disconnectChartRef = useRef<HTMLCanvasElement>(null);
    const agentsChartRef = useRef<HTMLCanvasElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(false);
    const alertPanelRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartsInstances = useRef<any[]>([]);

    // Check if Chart is already loaded (for client-side navigation)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).Chart) {
            setChartJsReady(true);
        }
    }, []);

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
                const { data: agentList } = await supabase.from('agents').select('*').eq('workspace_id', currentWorkspaceId).order('created_at', { ascending: false });

                let query = supabase.from('calls').select('*').eq('workspace_id', currentWorkspaceId).order('created_at', { ascending: false });

                const now = new Date();
                if (timeFilter === 'today') {
                    const start = new Date(now.setHours(0, 0, 0, 0));
                    query = query.gte('created_at', start.toISOString());
                } else if (timeFilter === 'yesterday') {
                    const start = new Date(now);
                    start.setDate(start.getDate() - 1);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(now);
                    end.setDate(end.getDate() - 1);
                    end.setHours(23, 59, 59, 999);
                    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
                } else if (timeFilter === '7d') {
                    const start = new Date(now);
                    start.setDate(start.getDate() - 7);
                    query = query.gte('created_at', start.toISOString());
                } else if (timeFilter === '30d') {
                    const start = new Date(now);
                    start.setDate(start.getDate() - 30);
                    query = query.gte('created_at', start.toISOString());
                } else if (timeFilter === 'custom' && customDateRange.start && customDateRange.end) {
                    const start = new Date(customDateRange.start);
                    start.setHours(0, 0, 0, 0);
                    const end = new Date(customDateRange.end);
                    end.setHours(23, 59, 59, 999);
                    query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString());
                } else if (timeFilter !== 'custom') {
                    query = query.limit(100);
                }

                const { data: callList } = await query;

                setAgents(agentList ?? []);
                setCalls(callList ?? []);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router, timeFilter, customDateRange.start, customDateRange.end]);

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
            const chartData = getChartDataTimeline(calls, timeFilter, customDateRange);
            const c = new Chart(callsChartRef.current, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: 'Llamadas',
                        data: chartData.data,
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
    }, [chartJsReady, isLoading, calls, agents, customDateRange, timeFilter]);

    // ---- Stats computed from real data ----
    const totalCalls = calls.length;
    const successCalls = calls.filter(c => c.call_analysis?.call_successful).length;
    const successRate = totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) + '%' : '0%';
    const avgDurMs = totalCalls > 0 ? calls.reduce((s, c) => s + (c.duration_ms ?? 0), 0) / totalCalls : 0;
    const avgDur = formatDuration(avgDurMs);
    const totalCost = calls.reduce((s, c) => s + Number(c.call_cost || 0), 0);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (alertPanelRef.current && !alertPanelRef.current.contains(event.target as Node)) {
                setIsAlertPanelOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

    // ---- Filtered calls ----
    const filteredCalls = calls.filter(call => {
        const matchesSearch = !searchTerm ||
            (call.customer_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (call.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAgent = agentFilter === 'all' || call.retell_agent_id === agentFilter;

        return matchesSearch && matchesAgent;
    });

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleExportCSV = () => {
        if (filteredCalls.length === 0) return;

        const headers = [
            'Fecha',
            'Nombre Cliente',
            'Número Cliente',
            'Agente',
            'Duración',
            'Sentimiento',
            'Estado',
            'Coste',
            'Resumen',
            'Datos Extraídos'
        ];

        const rows = filteredCalls.map(call => {
            const date = new Date(call.created_at).toLocaleString('es-ES');
            const agentName = getAgentName(call.retell_agent_id);
            const duration = formatDuration(call.duration_ms);
            const sentiment = sentimentLabel(call.call_analysis?.user_sentiment);
            const status = call.call_analysis?.call_successful ? 'Exitosa' : 'Fallida';
            const cost = `€${Number(call.call_cost || 0).toFixed(3)}`;
            const summary = (call.call_analysis?.call_summary || '').replace(/"/g, '""');
            
            const customVars = (call.call_analysis?.custom_variables || call.call_analysis?.custom_analysis_data || {}) as Record<string, unknown>;
            const extractedData = Object.entries(customVars)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ')
                .replace(/"/g, '""');

            return [
                `"${date}"`,
                `"${(call.customer_name || 'Web Call').replace(/"/g, '""')}"`,
                `"${call.customer_number || 'WEB'}"`,
                `"${agentName.replace(/"/g, '""')}"`,
                `"${duration}"`,
                `"${sentiment}"`,
                `"${status}"`,
                `"${cost}"`,
                `"${summary}"`,
                `"${extractedData}"`
            ];
        });

        // UTF-8 BOM for Excel compatibility with special characters
        const BOM = '\uFEFF';
        const csvContent = BOM + [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `llamadas_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getAgentName = (retellAgentId: string | null) => {
        if (!retellAgentId) return 'Desconocido';
        const a = agents.find(ag => ag.retell_agent_id === retellAgentId);
        return a?.name ?? retellAgentId.slice(0, 10) + '…';
    };

    const sentimentLabel = (s?: string) => {
        const map: Record<string, string> = { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' };
        return map[s?.toLowerCase() ?? ''] ?? 'Neutral';
    };

    const sentimentClass = (s?: string) => {
        const map: Record<string, string> = { positive: 'positive', neutral: 'neutral', negative: 'negative' };
        return map[s?.toLowerCase() ?? ''] ?? 'neutral';
    };

    return (
        <div className="app">
            <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" onLoad={() => setChartJsReady(true)} />
            
            <DashboardSidebar user={user} />

            <main className="main">
                <DashboardTopbar 
                    title="Dashboard de Control"
                    user={user}
                    totalCost={totalCost}
                    isAlertPanelOpen={isAlertPanelOpen}
                    setIsAlertPanelOpen={setIsAlertPanelOpen}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleCreateAgent={handleCreateAgent}
                    handleLogout={handleLogout}
                    alertPanelRef={alertPanelRef}
                    dropdownRef={dropdownRef}
                />

                <div className="content">
                    <div className="flex-between" style={{ marginBottom: '24px' }}>
                        <h2 className="form-title" style={{ margin: 0 }}>Vista general de rendimiento</h2>
                        <div className="flex-center gap-8">
                            <select
                                className="inp sel"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                style={{ width: 'auto', padding: '8px 36px 8px 12px' }}
                            >
                                <option value="today">Hoy</option>
                                <option value="yesterday">Ayer</option>
                                <option value="7d">Últimos 7 días</option>
                                <option value="30d">Últimos 30 días</option>
                                <option value="custom">Personalizado</option>
                            </select>
                            {timeFilter === 'custom' && (
                                <div className="flex-center gap-8">
                                    <input type="date" className="inp" value={customDateRange.start} onChange={e => setCustomDateRange({ ...customDateRange, start: e.target.value })} style={{ width: 'auto', padding: '8px 12px' }} />
                                    <span style={{ color: 'var(--gris-texto)' }}>-</span>
                                    <input type="date" className="inp" value={customDateRange.end} onChange={e => setCustomDateRange({ ...customDateRange, end: e.target.value })} style={{ width: 'auto', padding: '8px 12px' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="form-card" style={{ textAlign: 'center', padding: '60px' }}>
                            <div className="spinner" style={{ border: '3px solid var(--gris-bg)', borderTop: '3px solid var(--azul)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--gris-texto)' }}>Cargando métricas...</p>
                        </div>
                    ) : (
                        <>
                            <div className="stats-row">
                                <div className="stat-card">
                                    <div className="lbl" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '.5px' }}>LLAMADAS TOTALES</div>
                                    <div className="stat-val">{totalCalls}</div>
                                    <div className="hint"><i className="bi bi-telephone"></i> En el periodo</div>
                                </div>
                                <div className="stat-card">
                                    <div className="lbl" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '.5px' }}>TASA DE ÉXITO</div>
                                    <div className="stat-val" style={{ color: 'var(--exito)' }}>{successRate}</div>
                                    <div className="hint"><i className="bi bi-check-circle"></i> Conversiones</div>
                                </div>
                                <div className="stat-card">
                                    <div className="lbl" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '.5px' }}>DURACIÓN PROMEDIO</div>
                                    <div className="stat-val">{avgDur}</div>
                                    <div className="hint"><i className="bi bi-clock"></i> Por llamada</div>
                                </div>
                                <div className="stat-card">
                                    <div className="lbl" style={{ textTransform: 'uppercase', fontSize: '10px', letterSpacing: '.5px' }}>COSTE ESTIMADO</div>
                                    <div className="stat-val">€{totalCost.toFixed(3)}</div>
                                    <div className="hint"><i className="bi bi-currency-euro"></i> Gasto total</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="form-card" style={{ marginBottom: 0 }}>
                                    <div className="form-section-title"><i className="bi bi-bar-chart-line"></i> Volumen de llamadas</div>
                                    <div style={{ height: '240px', position: 'relative' }}>
                                        <canvas ref={callsChartRef} />
                                    </div>
                                </div>
                                <div className="form-card" style={{ marginBottom: 0 }}>
                                    <div className="form-section-title"><i className="bi bi-emoji-smile"></i> Análisis de sentimiento</div>
                                    <div style={{ height: '240px', position: 'relative' }}>
                                        <canvas ref={sentimentChartRef} />
                                    </div>
                                </div>
                            </div>

                            <div className="form-card">
                                <div className="flex-between" style={{ marginBottom: '20px' }}>
                                    <div className="form-section-title" style={{ margin: 0 }}><i className="bi bi-list-task"></i> Llamadas recientes</div>
                                    <div className="flex-center gap-8">
                                        <button className="btn-s mini" onClick={handleExportCSV}>
                                            <i className="bi bi-download"></i>
                                            Exportar CSV
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-center gap-12" style={{ marginBottom: '20px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--gris-texto)' }}></i>
                                        <input
                                            type="text"
                                            className="inp"
                                            placeholder="Buscar por número o nombre..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ paddingLeft: '36px' }}
                                        />
                                    </div>
                                    <select
                                        className="inp sel"
                                        value={agentFilter}
                                        onChange={(e) => setAgentFilter(e.target.value)}
                                        style={{ width: '220px' }}
                                    >
                                        <option value="all">Todos los agentes</option>
                                        {agents.map(ag => (
                                            <option key={ag.id} value={ag.retell_agent_id || ''}>
                                                {ag.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {filteredCalls.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gris-texto)', background: 'var(--gris-bg)', borderRadius: 'var(--r-md)', border: '1px dashed var(--gris-borde)' }}>
                                        {calls.length === 0
                                            ? 'No hay llamadas registradas aún.'
                                            : 'No hay resultados para esta búsqueda.'}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '2px solid var(--gris-bg)', textAlign: 'left' }}>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>FECHA</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>USUARIO</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>AGENTE</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>DURACIÓN</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>SNT</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>ESTADO</th>
                                                    <th className="lbl" style={{ padding: '12px 8px' }}>ACCIONES</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCalls.map(call => {
                                                    const sentiment = call.call_analysis?.user_sentiment;
                                                    const successful = call.call_analysis?.call_successful;
                                                    const isExpanded = expandedCallId === call.id;
                                                    const internalAgentId = agents.find(a => a.retell_agent_id === call.retell_agent_id)?.id;
                                                    
                                                    let sBadge = 'badge-gray';
                                                    if (sentiment?.toLowerCase() === 'positive') sBadge = 'badge-ok';
                                                    if (sentiment?.toLowerCase() === 'negative') sBadge = 'badge-err';
                                                    if (sentiment?.toLowerCase() === 'neutral') sBadge = 'badge-gray';

                                                    return (
                                                        <React.Fragment key={call.id}>
                                                            <tr 
                                                                style={{ borderBottom: '1px solid var(--gris-bg)', cursor: 'pointer', background: isExpanded ? 'var(--azul-light)' : 'transparent' }}
                                                                onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                                            >
                                                                <td style={{ padding: '14px 8px', fontSize: '13px' }} suppressHydrationWarning>
                                                                    {new Date(call.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                                </td>
                                                                <td style={{ padding: '14px 8px' }}>
                                                                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{call.customer_number || 'Web Call'}</div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{call.customer_name || 'Anónimo'}</div>
                                                                </td>
                                                                <td style={{ padding: '14px 8px', fontSize: '13px' }}>
                                                                    {getAgentName(call.retell_agent_id)}
                                                                </td>
                                                                <td style={{ padding: '14px 8px', fontSize: '13px' }}>{formatDuration(call.duration_ms)}</td>
                                                                <td style={{ padding: '14px 8px' }}>
                                                                    <span className={`badge ${sBadge}`}>{sentimentLabel(sentiment)}</span>
                                                                </td>
                                                                <td style={{ padding: '14px 8px' }}>
                                                                    <span className={`badge ${successful ? 'badge-ok' : 'badge-err'}`}>
                                                                        {successful ? 'Éxito' : 'Fallo'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '14px 8px' }}>
                                                                    <button className="btn-s mini">
                                                                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={7} style={{ background: 'var(--blanco)', padding: '24px', borderBottom: '1px solid var(--gris-borde)' }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                                                            <div>
                                                                                <div className="form-section-title"><i className="bi bi-mic"></i> Transcripción y Grabación</div>
                                                                                {call.recording_url && (
                                                                                    <audio controls src={call.recording_url} style={{ width: '100%', height: '36px', marginBottom: '16px' }} />
                                                                                )}
                                                                                <div style={{ background: 'var(--gris-bg)', padding: '16px', borderRadius: 'var(--r-md)', fontSize: '13px', maxHeight: '200px', overflowY: 'auto' }}>
                                                                                    {call.transcript || 'No hay transcripción disponible.'}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="form-section-title"><i className="bi bi-chat-quote"></i> Resumen del Agente</div>
                                                                                <div className="form-card" style={{ padding: '16px', fontSize: '13px', background: 'var(--azul-light)', borderColor: 'var(--azul)', marginBottom: '16px' }}>
                                                                                    {call.call_analysis?.call_summary || 'Resumen no disponible.'}
                                                                                </div>
                                                                                
                                                                                <div className="form-section-title" style={{ marginTop: '24px' }}><i className="bi bi-database"></i> Datos Extraídos</div>
                                                                                {(() => {
                                                                                    const customVars = (call.call_analysis?.custom_variables || call.call_analysis?.custom_analysis_data || {}) as Record<string, unknown>;
                                                                                    if (Object.keys(customVars).length > 0) {
                                                                                        return (
                                                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
                                                                                                {Object.entries(customVars).map(([key, value]) => (
                                                                                                    <div key={key} style={{ background: 'var(--blanco)', padding: '10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--gris-borde)' }}>
                                                                                                        <div className="lbl" style={{ fontSize: '9px', marginBottom: '4px' }}>{key}</div>
                                                                                                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--azul)' }}>{String(value)}</div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <div style={{ fontSize: '12px', color: 'var(--gris-texto)', fontStyle: 'italic' }}>
                                                                                            No hay datos extraídos para esta llamada.
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                                
                                                                                {internalAgentId && (
                                                                                    <div style={{ marginTop: '16px' }}>
                                                                                        <Link href={`/wizard?editId=${internalAgentId}&step=8#extraction`} className="btn-s mini" style={{ color: 'var(--azul)', background: 'transparent', padding: 0 }}>
                                                                                            <i className="bi bi-gear"></i> Configurar extracción
                                                                                        </Link>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
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
                <ViewSwitcher user={user} />
            </main>
        </div>
    );
}

// ---- Formatting helpers ----
function formatDuration(ms: number | null): string {
    if (!ms) return '0s';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
}

function getChartDataTimeline(calls: Call[], filter: string, customRange: { start: string; end: string }) {
    const labels: string[] = [];
    const data: number[] = [];
    const groups: Record<string, number> = {};

    calls.forEach(c => {
        const d = new Date(c.created_at).toLocaleDateString('es-ES');
        groups[d] = (groups[d] || 0) + 1;
    });

    Object.keys(groups).sort().forEach(k => {
        labels.push(k);
        data.push(groups[k]);
    });

    return { labels: labels.slice(-10), data: data.slice(-10) };
}

function getSentimentCounts(calls: Call[]) {
    return {
        positive: calls.filter(c => c.call_analysis?.user_sentiment?.toLowerCase() === 'positive').length,
        neutral: calls.filter(c => c.call_analysis?.user_sentiment?.toLowerCase() === 'neutral' || !c.call_analysis?.user_sentiment).length,
        negative: calls.filter(c => c.call_analysis?.user_sentiment?.toLowerCase() === 'negative').length,
    };
}

function getDisconnectionReasons(calls: Call[]) {
    const groups: Record<string, number> = {};
    calls.forEach(c => {
        const r = c.disconnection_reason || 'Otro';
        groups[r] = (groups[r] || 0) + 1;
    });
    return { labels: Object.keys(groups), data: Object.values(groups) };
}

function getCallsByAgent(calls: Call[], agents: Agent[]) {
    const groups: Record<string, number> = {};
    calls.forEach(c => {
        const a = agents.find(ag => ag.retell_agent_id === c.retell_agent_id)?.name || 'Desconocido';
        groups[a] = (groups[a] || 0) + 1;
    });
    return { labels: Object.keys(groups), data: Object.values(groups) };
}
