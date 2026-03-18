"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { useWizardStore } from '../../store/wizardStore';
import Script from 'next/script';
import NotificationsPanel from '../../components/NotificationsPanel';

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
                .nav-item.admin-item.active{background:#ede9fe;color:#6d28d9;border-right:3px solid #7c3aed}
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
                
                /* Dropdown */
                .user-profile-container { position: relative; }
                .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top right; }
                .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; text-align: center; }
                .user-dropdown-name { margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
                .user-dropdown-email { margin: 4px 0 0; font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
                .user-dropdown-body { padding: 8px; }
                .user-dropdown-item { width: 100%; padding: 10px 12px; display: flex; align-items: center; gap: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; border-radius: 8px; transition: all 0.2s; color: #4b5563; }
                .user-dropdown-item:hover { background: #f3f4f6; color: #1a1a1a; }
                .user-dropdown-item.text-red { color: #dc2626; }
                .user-dropdown-item.text-red:hover { background: #fef2f2; color: #b91c1c; }
                @keyframes slideDown { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                
                .calls-table{width:100%;border-collapse:collapse}
                .calls-table thead{background:#f9fafb;border-bottom:1px solid #e5e7eb}
                .calls-table th{padding:12px 16px;text-align:left;font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
                .calls-table td{padding:16px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1a1a1a}
                .calls-table tbody tr.main-row{transition:all .2s;cursor:pointer}
                .calls-table tbody tr.main-row:hover{background:#f9fafb}
                .calls-table tbody tr.main-row.expanded{background:#f8fafc}
                .expanded-row-content{background:#f8fafc;padding:0 !important;border-bottom:2px solid #e2e8f0}
                .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px}
                .details-section-title{font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:.5px;margin-bottom:12px}
                .transcript-box{background:#fff;padding:16px;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;line-height:1.6;color:#334155;max-height:250px;overflow-y:auto;white-space:pre-wrap}
                .audio-player{width:100%;height:40px;margin-top:8px}
                .cost-list{display:flex;flex-direction:column;gap:8px}
                .cost-item{display:flex;justify-content:space-between;padding:10px;background:#fff;border-radius:6px;border:1px solid #f1f5f9;font-size:13px}
                .post-data-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
                .post-data-card{background:#f0f9ff;padding:12px;border-radius:8px;border:1px solid #bae6fd}
                .post-data-label{font-size:11px;color:#0369a1;font-weight:600;text-transform:uppercase;margin-bottom:4px}
                .post-data-value{font-size:14px;color:#0c4a6e;font-weight:500}
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
                .filter-bar{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
                .filter-input-group{display:flex;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:0 12px;flex:1;min-width:200px;transition:all .2s;height:40px}
                .filter-input-group:focus-within{border-color:#267ab0;box-shadow:0 0 0 2px rgba(38,122,176,.1)}
                .filter-input{border:none;background:none;padding:10px 8px;font-size:14px;outline:none;width:100%;color:#1a1a1a}
                .filter-select{height:40px;padding:0 12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#1a1a1a;font-size:14px;outline:none;cursor:pointer;min-width:180px;transition:all .2s;font-family:inherit}
                .filter-select:focus{border-color:#267ab0}
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
                            { label: 'Configuración', href: '/dashboard/settings', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z', active: false },
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
                                <Link href="/dashboard/templates" className="nav-item admin-item">
                                    <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" clipRule="evenodd" />
                                    </svg>
                                    Biblioteca de plantillas
                                </Link>
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
                                <span className="balance-amount">€{totalCost.toFixed(3)}</span>
                            </div>
                            <div style={{ position: 'relative' }} ref={alertPanelRef}>
                                <button
                                    className="notification-bell"
                                    onClick={() => setIsAlertPanelOpen(o => !o)}
                                    title="Alertas"
                                    style={{ background: isAlertPanelOpen ? '#eff6fb' : undefined }}
                                >
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>
                                {isAlertPanelOpen && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                                        width: 380, background: '#fff', borderRadius: 16,
                                        border: '1px solid #e5e7eb', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.12)',
                                        zIndex: 1000, overflow: 'hidden', padding: 0,
                                        animation: 'slideDown 0.2s cubic-bezier(0.16,1,0.3,1)',
                                    }}>
                                        <NotificationsPanel workspaceId={user?.workspace_id || undefined} />
                                    </div>
                                )}
                            </div>
                            <div className="user-profile-container" ref={dropdownRef}>
                                <button
                                    className="user-avatar"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    title="Mi perfil"
                                >
                                    {userInitial}
                                </button>
                                {isDropdownOpen && (
                                    <div className="user-dropdown">
                                        <div className="user-dropdown-header">
                                            <span className="user-dropdown-name">{user?.full_name || 'Mi cuenta'}</span>
                                            <span className="user-dropdown-email">{user?.email || 'user@example.com'}</span>
                                        </div>
                                        <div className="user-dropdown-body">
                                            <button onClick={handleLogout} className="user-dropdown-item text-red">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Cerrar sesión
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <div className="content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a' }}>Vista general</h2>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <select
                                    value={timeFilter}
                                    onChange={(e) => setTimeFilter(e.target.value)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', outline: 'none', cursor: 'pointer', fontWeight: 500, color: '#4b5563' }}
                                >
                                    <option value="today">Hoy</option>
                                    <option value="yesterday">Ayer</option>
                                    <option value="7d">Últimos 7 días</option>
                                    <option value="30d">Últimos 30 días</option>
                                    <option value="custom">Personalizado</option>
                                </select>
                                {timeFilter === 'custom' && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input type="date" value={customDateRange.start} onChange={e => setCustomDateRange({ ...customDateRange, start: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', outline: 'none', color: '#4b5563' }} />
                                        <span style={{ color: '#6b7280' }}>-</span>
                                        <input type="date" value={customDateRange.end} onChange={e => setCustomDateRange({ ...customDateRange, end: e.target.value })} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', outline: 'none', color: '#4b5563' }} />
                                    </div>
                                )}
                            </div>
                        </div>

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
                                            title: 'Coste total', value: `€${totalCost.toFixed(3)}`, iconColor: '#ea580c', iconClass: 'orange',
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
                                            <button className="btn-secondary" onClick={handleExportCSV}>
                                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Exportar
                                            </button>
                                        </div>
                                    </div>

                                    {/* FILTERS */}
                                    <div className="filter-bar">
                                        <div className="filter-input-group">
                                            <svg width="18" height="18" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <input
                                                type="text"
                                                className="filter-input"
                                                placeholder="Buscar por número o nombre..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <select
                                            className="filter-select"
                                            value={agentFilter}
                                            onChange={(e) => setAgentFilter(e.target.value)}
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
                                        <div className="empty-state">
                                            {calls.length === 0
                                                ? 'Las llamadas aparecerán aquí automáticamente una vez que los agentes realicen conversaciones.'
                                                : 'No se encontraron llamadas que coincidan con los filtros aplicados.'}
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
                                                        <th>Coste</th>
                                                        <th>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredCalls.map(call => {
                                                        const sentiment = call.call_analysis?.user_sentiment;
                                                        const successful = call.call_analysis?.call_successful;
                                                        const agentName = getAgentName(call.retell_agent_id);
                                                        const initial = agentName[0]?.toUpperCase() ?? 'A';
                                                        const isExpanded = expandedCallId === call.id;
                                                        const internalAgentId = agents.find(a => a.retell_agent_id === call.retell_agent_id)?.id;

                                                        return (
                                                            <React.Fragment key={call.id}>
                                                                <tr className={`main-row ${isExpanded ? 'expanded' : ''}`} onClick={() => setExpandedCallId(isExpanded ? null : call.id)}>
                                                                    <td suppressHydrationWarning>{new Date(call.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <span style={{ fontWeight: 600 }}>{call.customer_number || 'Web Call'}</span>
                                                                            {call.customer_name && <span style={{ fontSize: '12px', color: '#6b7280' }}>{call.customer_name}</span>}
                                                                            <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase' }}>{call.call_type === 'phone_call' ? '📞 Teléfono' : '🌐 Web'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div className="agent-info">
                                                                            <div className="agent-avatar">{initial}</div>
                                                                            <span className="agent-name">{agentName}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>{formatDuration(call.duration_ms)}</td>
                                                                    <td><span className={`badge ${sentimentClass(sentiment)}`}>{sentimentLabel(sentiment)}</span></td>
                                                                    <td><span className={`badge ${successful ? 'success' : 'error'}`}>{successful ? '✓ Exitosa' : '✗ Fallida'}</span></td>
                                                                    <td>{call.call_cost ? `€${Number(call.call_cost).toFixed(3)}` : '—'}</td>
                                                                    <td>
                                                                        <div className="action-btns">
                                                                            <button
                                                                                className="action-btn"
                                                                                title={isExpanded ? "Cerrar" : "Ver detalle"}
                                                                            >
                                                                                <svg style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                                </svg>
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && (
                                                                    <tr>
                                                                        <td colSpan={8} className="expanded-row-content">
                                                                            <div className="details-grid">
                                                                                {/* LEFT COLUMN: AUDIO & TRANSCRIPT */}
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                                                    <div>
                                                                                        <h4 className="details-section-title" style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>Grabación y Transcripción</h4>
                                                                                        {call.recording_url && (
                                                                                            <audio controls src={call.recording_url} className="audio-player" style={{ width: '100%', borderRadius: '8px', outline: 'none' }} />
                                                                                        )}
                                                                                        <div className="transcript-box" style={{ marginTop: '16px', background: '#f9fafb', padding: '16px', borderRadius: '10px', maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6', color: '#374151', border: '1px solid #e5e7eb' }}>
                                                                                            {call.transcript || 'Transcripción no disponible.'}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* RIGHT COLUMN: SUMMARY & CUSTOM DATA */}
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                                                                                    {/* SUMMARY SECTION */}
                                                                                    {(() => {
                                                                                        // Prioritize custom variable "Resumen" (Spanish) if it exists
                                                                                        const customSummary = call.call_analysis?.custom_variables &&
                                                                                            Object.entries(call.call_analysis.custom_variables).find(([key]) =>
                                                                                                key.toLowerCase() === 'resumen'
                                                                                            )?.[1];

                                                                                        const summaryToDisplay = customSummary || call.call_analysis?.call_summary;

                                                                                        if (!summaryToDisplay) return null;

                                                                                        return (
                                                                                            <div>
                                                                                                <h4 className="details-section-title" style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563', marginBottom: '12px' }}>Resumen de la Llamada</h4>
                                                                                                <div style={{ background: '#fff', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
                                                                                                    {String(summaryToDisplay)}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })()}

                                                                                    {/* CUSTOM DATA SECTION (PREVIOUSLY EXTRACTED DATA) */}
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                            <h4 className="details-section-title" style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563', marginBottom: '0px' }}>Datos Extraídos</h4>
                                                                                            {internalAgentId && (
                                                                                                <Link
                                                                                                    href={`/wizard?editId=${internalAgentId}&step=8#extraction`}
                                                                                                    className="text-primary"
                                                                                                    style={{ fontSize: '12px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                                                >
                                                                                                    <i className="bi bi-gear-fill"></i>
                                                                                                    Configurar extracción
                                                                                                </Link>
                                                                                            )}
                                                                                        </div>
                                                                                        {(() => {
                                                                                            let customVars = call.call_analysis?.custom_variables || call.call_analysis?.custom_analysis_data;
                                                                                            
                                                                                            // Transformation to fix '0' or empty phone values on UI
                                                                                            if (customVars && Object.keys(customVars).length > 0) {
                                                                                                const phoneKeyPatterns = ['telefono', 'phone', 'numero', 'movil', 'cell'];
                                                                                                const transformedVars = { ...customVars };
                                                                                                
                                                                                                Object.keys(transformedVars).forEach(key => {
                                                                                                    const val = transformedVars[key];
                                                                                                    const isPhoneKey = phoneKeyPatterns.some(pattern => key.toLowerCase().includes(pattern));
                                                                                                    if (isPhoneKey && (val === '0' || val === 0 || !val || val === 'unknown')) {
                                                                                                        transformedVars[key] = call.customer_number || '—';
                                                                                                    }
                                                                                                });
                                                                                                customVars = transformedVars;

                                                                                                return (
                                                                                                    <div className="post-data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                                                                                        {Object.entries(customVars).map(([key, value]) => (
                                                                                                            <div key={key} className="post-data-card" style={{ background: '#f0f9ff', padding: '12px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                                                                                                <div className="post-data-label" style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>{key}</div>
                                                                                                                <div className="post-data-value" style={{ fontSize: '14px', color: '#0c4a6e', fontWeight: 500 }}>{String(value)}</div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                );
                                                                                            }
                                                                                            return (
                                                                                                <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px dotted #d1d5db' }}>
                                                                                                    No se extrajeron datos adicionales de esta llamada.
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
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
                </main>
            </div>

        </>
    );
}

// ---- Helper functions ----
function formatDuration(ms: number | null): string {
    if (!ms || ms === 0) return '—';
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}


function getChartDataTimeline(calls: Call[], timeFilter: string, customDateRange: { start: string, end: string }) {
    if (timeFilter === 'today' || timeFilter === 'yesterday') {
        const hours: { label: string; count: number }[] = [];
        for (let i = 0; i <= 23; i++) {
            const hStr = `${String(i).padStart(2, '0')}:00`;
            const count = calls.filter(c => {
                const cd = new Date(c.created_at);
                // Adjust per timezone if needed, this uses local timezone
                return cd.getHours() === i;
            }).length;
            hours.push({ label: hStr, count });
        }
        return { labels: hours.map(h => h.label), data: hours.map(h => h.count) };
    }

    let days = 7;
    let endDate = new Date();

    if (timeFilter === '30d') days = 30;
    if (timeFilter === 'custom') {
        if (customDateRange.start && customDateRange.end) {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            endDate = new Date(end);
        }
    }
    if (days > 90) days = 90;

    const daysData: { label: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        const count = calls.filter(c => {
            const cd = new Date(c.created_at);
            return cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        }).length;
        daysData.push({ label, count });
    }
    return { labels: daysData.map(d => d.label), data: daysData.map(d => d.count) };
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
        if (!c.retell_agent_id) return;
        const agent = agents.find(a => a.retell_agent_id === c.retell_agent_id);
        const name = agent?.name ?? c.retell_agent_id.slice(0, 8);
        counts[name] = (counts[name] ?? 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { labels: sorted.map(e => e[0]), data: sorted.map(e => e[1]) };
}
