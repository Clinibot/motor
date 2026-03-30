"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useWizardStore } from '../../store/wizardStore';
import Script from 'next/script';
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
            const chartData = getChartDataTimeline(calls);
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
                    labels: ['Positivo', 'Neutro', 'Negativo'],
                    datasets: [{ 
                        data: [sentCounts.positive, sentCounts.neutral, sentCounts.negative], 
                        backgroundColor: ['#22c55e', '#ecf0f1', '#f97316'], 
                        borderWidth: 0 
                    }],
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { 
                        legend: { 
                            position: 'right', 
                            labels: { 
                                boxWidth: 12,
                                padding: 20, 
                                font: { size: 12, weight: '500' },
                                color: '#64748b'
                            } 
                        } 
                    }, 
                    cutout: '70%' 
                },
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
                    datasets: [{ 
                        data: reasons.data, 
                        backgroundColor: '#5faad9', 
                        borderRadius: 6,
                        barThickness: 32
                    }],
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { display: false } }, 
                    scales: { 
                        x: { 
                            grid: { display: false },
                            ticks: { font: { size: 11 }, color: '#94a3b8' }
                        }, 
                        y: { 
                            beginAtZero: true, 
                            grid: { color: '#f1f5f9' },
                            ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' } 
                        } 
                    } 
                },
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
                    datasets: [{ 
                        data: byAgent.data, 
                        backgroundColor: ['#267ab0', '#22c55e', '#9333ea', '#f97316', '#ef4444'], 
                        borderWidth: 0 
                    }],
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { 
                        legend: { 
                            position: 'right', 
                            labels: { 
                                boxWidth: 12,
                                padding: 20, 
                                font: { size: 12, weight: '500' },
                                color: '#64748b'
                            } 
                        } 
                    }, 
                    cutout: '70%' 
                },
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


    return (
        <div className="app-container">
            <Script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" onLoad={() => setChartJsReady(true)} />
            
            <DashboardSidebar user={user} />

            <div className="main-view">
                <DashboardTopbar 
                    title="Dashboard principal"
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

                <div className="dashboard-content">
                    <div className="content-header">
                        <div>
                            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                                Vista general de rendimiento
                            </h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: '14px', margin: 0 }}>
                                Monitorea las métricas clave de tus agentes en tiempo real.
                            </p>
                        </div>
                        <div className="flex-center gap-12">
                            <select
                                className="inp"
                                value={timeFilter}
                                onChange={(e) => setTimeFilter(e.target.value)}
                                style={{ width: 'auto', minWidth: '160px' }}
                            >
                                <option value="today">Hoy</option>
                                <option value="yesterday">Ayer</option>
                                <option value="7d">Últimos 7 días</option>
                                <option value="30d">Últimos 30 días</option>
                                <option value="custom">Personalizado</option>
                            </select>
                            {timeFilter === 'custom' && (
                                <div className="flex-center gap-8">
                                    <input type="date" className="inp" value={customDateRange.start} onChange={e => setCustomDateRange({ ...customDateRange, start: e.target.value })} style={{ width: 'auto' }} />
                                    <span style={{ color: 'var(--slate-400)' }}>-</span>
                                    <input type="date" className="inp" value={customDateRange.end} onChange={e => setCustomDateRange({ ...customDateRange, end: e.target.value })} style={{ width: 'auto' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="card-premium" style={{ textAlign: 'center', padding: '80px 0' }}>
                            <div className="spinner" style={{ border: '3px solid var(--slate-100)', borderTop: '3px solid var(--azul)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                            <p style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Cargando métricas de rendimiento...</p>
                        </div>
                    ) : (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon icon-blue">
                                        <i className="bi bi-telephone"></i>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-label">Llamadas Totales</div>
                                        <div className="stat-value">{totalCalls}</div>
                                        <div className="stat-diff positive">
                                            <i className="bi bi-arrow-up"></i>
                                            <span>En el periodo</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon icon-green">
                                        <i className="bi bi-check2-circle"></i>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-label">Tasa de Éxito</div>
                                        <div className="stat-value">{successRate}</div>
                                        <div className="stat-diff positive">
                                            <i className="bi bi-shield-check"></i>
                                            <span>Conversiones</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon icon-purple">
                                        <i className="bi bi-clock"></i>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-label">Duración Media</div>
                                        <div className="stat-value">{avgDur}</div>
                                        <div className="stat-diff">
                                            <i className="bi bi-lightning-charge"></i>
                                            <span>Por llamada</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="stat-card">
                                    <div className="stat-icon icon-orange">
                                        <i className="bi bi-currency-euro"></i>
                                    </div>
                                    <div className="stat-info">
                                        <div className="stat-label">Gasto Total</div>
                                        <div className="stat-value">€{totalCost.toFixed(3)}</div>
                                        <div className="stat-diff">
                                            <i className="bi bi-wallet2"></i>
                                            <span>Coste estimado</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Charts (Time, Sentiment) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="card-premium" style={{ height: '340px' }}>
                                    <div className="card-header" style={{ marginBottom: '12px' }}>
                                        <h3 className="card-title" style={{ fontSize: '15px' }}>Llamadas en el tiempo</h3>
                                    </div>
                                    <div style={{ height: '220px', position: 'relative' }}>
                                        <canvas ref={callsChartRef} />
                                    </div>
                                </div>
                                <div className="card-premium" style={{ height: '340px' }}>
                                    <div className="card-header" style={{ marginBottom: '12px' }}>
                                        <h3 className="card-title" style={{ fontSize: '15px' }}>Sentimiento de usuarios</h3>
                                    </div>
                                    <div style={{ height: '220px', position: 'relative' }}>
                                        <canvas ref={sentimentChartRef} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Charts (Disconnection, By Agent) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px', marginBottom: '24px' }}>
                                <div className="card-premium" style={{ height: '340px' }}>
                                    <div className="card-header" style={{ marginBottom: '12px' }}>
                                        <h3 className="card-title" style={{ fontSize: '15px' }}>Motivos de desconexión</h3>
                                    </div>
                                    <div style={{ height: '220px', position: 'relative' }}>
                                        <canvas ref={disconnectChartRef} />
                                    </div>
                                </div>
                                <div className="card-premium" style={{ height: '340px' }}>
                                    <div className="card-header" style={{ marginBottom: '12px' }}>
                                        <h3 className="card-title" style={{ fontSize: '15px' }}>Llamadas por agente</h3>
                                    </div>
                                    <div style={{ height: '220px', position: 'relative' }}>
                                        <canvas ref={agentsChartRef} />
                                    </div>
                                </div>
                            </div>

                            <div className="card-premium">
                                <div className="flex-between" style={{ marginBottom: '24px', alignItems: 'center' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--slate-800)', margin: 0 }}>Llamadas recientes</h3>
                                    <button className="btn-s" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                                        <i className="bi bi-download" style={{ fontSize: '14px' }}></i>
                                        Exportar
                                    </button>
                                </div>

                                <div className="flex-center gap-12" style={{ marginBottom: '24px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <i className="bi bi-search" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: '14px' }}></i>
                                        <input
                                            type="text"
                                            className="inp"
                                            placeholder="Buscar por número o nombre..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ paddingLeft: '42px', height: '42px', fontSize: '14px', background: 'var(--slate-50)', border: '1px solid var(--slate-100)' }}
                                        />
                                    </div>
                                    <select
                                        className="inp"
                                        value={agentFilter}
                                        onChange={(e) => setAgentFilter(e.target.value)}
                                        style={{ width: '200px', height: '42px', fontSize: '14px', background: 'var(--slate-50)', border: '1px solid var(--slate-100)' }}
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
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-500)', background: 'var(--slate-50)', borderRadius: '12px', border: '1px dashed var(--slate-200)' }}>
                                        {calls.length === 0
                                            ? 'No hay llamadas registradas aún.'
                                            : 'No hay resultados para esta búsqueda.'}
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto', margin: '0 -24px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-100)' }}>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>FECHA Y HORA</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>USUARIO</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AGENTE</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DURACIÓN</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SENTIMIENTO</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ESTADO</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>COSTE</th>
                                                    <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACCIONES</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredCalls.map(call => {
                                                    const sentiment = call.call_analysis?.user_sentiment;
                                                    const successful = call.call_analysis?.call_successful;
                                                    const isExpanded = expandedCallId === call.id;
                                                    const internalAgentId = agents.find(a => a.retell_agent_id === call.retell_agent_id)?.id;
                                                    
                                                    let sBadgeStyle = { background: '#f1f5f9', color: '#64748b' };
                                                    if (sentiment?.toLowerCase() === 'positive') sBadgeStyle = { background: '#ecfdf5', color: '#10b981' };
                                                    if (sentiment?.toLowerCase() === 'negative') sBadgeStyle = { background: '#fef2f2', color: '#ef4444' };

                                                    return (
                                                        <React.Fragment key={call.id}>
                                                            <tr 
                                                                style={{ borderBottom: '1px solid var(--slate-100)', cursor: 'pointer', background: isExpanded ? 'var(--slate-50)' : 'transparent', transition: 'background 0.2s' }}
                                                                onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                                                                onMouseOver={(e) => !isExpanded && (e.currentTarget.style.background = '#fcfdfe')}
                                                                onMouseOut={(e) => !isExpanded && (e.currentTarget.style.background = 'transparent')}
                                                            >
                                                                <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--slate-600)', fontWeight: 500 }} suppressHydrationWarning>
                                                                    {(() => {
                                                                        const d = new Date(call.created_at);
                                                                        return `${d.getDate()}/${d.getMonth() + 1}, ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                                    })()}
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--slate-900)', marginBottom: '2px' }}>{call.customer_number || '+34 000 000 000'}</div>
                                                                    <div style={{ fontSize: '10px', color: 'var(--slate-400)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <i className="bi bi-telephone-fill" style={{ fontSize: '9px' }}></i>
                                                                        TELÉFONO
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                                                                            {getAgentName(call.retell_agent_id).charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span style={{ fontSize: '13px', color: 'var(--slate-700)', fontWeight: 600 }}>{getAgentName(call.retell_agent_id)}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--slate-600)', fontWeight: 500 }}>{formatDuration(call.duration_ms)}</td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <span style={{ 
                                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
                                                                        ...sBadgeStyle
                                                                    }}>
                                                                        {sentimentLabel(sentiment)}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '16px 24px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: successful ? '#10b981' : '#ef4444' }}>
                                                                        {successful && <i className="bi bi-check-lg" style={{ fontSize: '14px' }}></i>}
                                                                        {successful ? 'Exitosa' : 'Fallida'}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '16px 24px', fontSize: '13px', color: 'var(--slate-800)', fontWeight: 700 }}>
                                                                    €{Number(call.call_cost || 0).toFixed(3)}
                                                                </td>
                                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: isExpanded ? 'var(--azul)' : 'var(--slate-50)', color: isExpanded ? 'white' : 'var(--slate-300)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                                                                        <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: '12px' }}></i>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={8} style={{ background: '#fcfdfe', padding: '32px 48px', borderBottom: '1px solid var(--slate-100)' }}>
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '48px' }}>
                                                                            <div>
                                                                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '20px' }}>GRABACIÓN Y TRANSCRIPCIÓN</h4>
                                                                                {call.recording_url && (
                                                                                    <div style={{ marginBottom: '24px', background: 'white', padding: '12px', borderRadius: '12px', border: '1px solid var(--slate-100)' }}>
                                                                                        <audio controls src={call.recording_url} style={{ width: '100%', height: '36px' }} />
                                                                                    </div>
                                                                                )}
                                                                                <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid var(--slate-100)', fontSize: '14px', lineHeight: '1.7', color: 'var(--slate-700)', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                                                                    {call.transcript ? (
                                                                                        call.transcript.split('\n').map((line, i) => {
                                                                                            const isAgent = line.toLowerCase().includes('agent:') || line.toLowerCase().includes('elio:');
                                                                                            const isUser = line.toLowerCase().includes('user:') || line.toLowerCase().includes('customer:');
                                                                                            if (isAgent || isUser) {
                                                                                                const [role, ...text] = line.split(':');
                                                                                                return (
                                                                                                    <div key={i} style={{ marginBottom: '12px' }}>
                                                                                                        <strong style={{ color: 'var(--slate-900)' }}>{role}:</strong> {text.join(':')}
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return <div key={i} style={{ marginBottom: '8px' }}>{line}</div>;
                                                                                        })
                                                                                    ) : (
                                                                                        <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>No hay transcripción disponible para esta llamada.</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '20px' }}>DATOS EXTRAÍDOS</h4>
                                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                                                    {(() => {
                                                                                        const customVars = (call.call_analysis?.custom_variables || call.call_analysis?.custom_analysis_data || {}) as Record<string, unknown>;
                                                                                        if (Object.keys(customVars).length > 0) {
                                                                                            return Object.entries(customVars).map(([key, value]) => (
                                                                                                <div key={key} style={{ background: 'var(--azul-light)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(38,122,176,0.1)' }}>
                                                                                                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--azul)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{key}</div>
                                                                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-900)' }}>{String(value)}</div>
                                                                                                </div>
                                                                                            ));
                                                                                        }
                                                                                        return (
                                                                                            <div style={{ gridColumn: 'span 2', fontSize: '13px', color: 'var(--slate-400)', fontStyle: 'italic', padding: '24px', background: 'var(--slate-50)', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--slate-200)' }}>
                                                                                                No se han detectado datos específicos.
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>

                                                                                {internalAgentId && (
                                                                                    <div style={{ marginTop: '32px' }}>
                                                                                        <Link href={`/wizard?editId=${internalAgentId}&step=8#extraction`} style={{ fontSize: '12px', color: 'var(--azul)', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                            <i className="bi bi-gear-fill"></i>
                                                                                            Configurar extracción de datos
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
            </div>
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

function getChartDataTimeline(calls: Call[] /*, filter: string, customRange: { start: string; end: string } */) {
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
