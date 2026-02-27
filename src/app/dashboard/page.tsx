"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export const dynamic = 'force-dynamic';

// ---- Types ----
interface Agent {
    id: string;
    name: string;
    type: string;
    status: string;
    retell_agent_id: string | null;
    created_at: string;
}

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

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
    workspace_id: string | null;
}

// ---- Helper ----
function getInitials(name: string | null) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, { bg: string; color: string }> = {
        active: { bg: '#dcfce7', color: '#16a34a' },
        inactive: { bg: '#f3f4f6', color: '#6b7280' },
        error: { bg: '#fee2e2', color: '#dc2626' },
    };
    const c = colors[status] || colors.inactive;
    return (
        <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color }}>
            ● {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export default function DashboardPage() {
    const router = useRouter();

    const [user, setUser] = useState<UserProfile | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [calls, setCalls] = useState<Call[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [activeNav, setActiveNav] = useState('dashboard');
    const [expandedCallId, setExpandedCallId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }

            // Load user profile
            const { data: profile } = await supabase
                .from('users')
                .select('full_name, email, role, workspace_id')
                .eq('id', session.user.id)
                .single();

            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user', workspace_id: null });

            // Superadmin: redirect to admin panel
            if (profile?.role === 'superadmin') {
                router.push('/admin');
                return;
            }

            // Load agents for this workspace
            if (profile?.workspace_id) {
                const { data: agentList } = await supabase
                    .from('agents')
                    .select('*')
                    .eq('workspace_id', profile.workspace_id)
                    .order('created_at', { ascending: false });
                setAgents(agentList ?? []);

                // Load recent calls (last 50)
                const { data: callList } = await supabase
                    .from('calls')
                    .select('*')
                    .eq('workspace_id', profile.workspace_id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                setCalls(callList ?? []);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleDeleteAgent = async (agentId: string) => {
        if (!confirm('¿Eliminar este agente? Esta acción no se puede deshacer.')) return;
        setDeletingId(agentId);
        const supabase = createClient();
        const { error } = await supabase.from('agents').delete().eq('id', agentId);
        if (!error) setAgents(prev => prev.filter(a => a.id !== agentId));
        setDeletingId(null);
    };

    const activeCount = agents.filter(a => a.status === 'active').length;
    const successCount = calls.filter(c => c.call_analysis?.call_successful).length;
    const successRate = calls.length > 0 ? Math.round((successCount / calls.length) * 100) : null;
    const formatDuration = (ms: number | null) => {
        if (!ms) return '—';
        const s = Math.floor(ms / 1000);
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    const getSentimentBadge = (sentiment: string | undefined) => {
        const map: Record<string, { bg: string; color: string; label: string }> = {
            positive: { bg: '#dbeafe', color: '#2563eb', label: '😊 Positivo' },
            neutral: { bg: '#f3f4f6', color: '#6b7280', label: '😐 Neutral' },
            negative: { bg: '#fef3c7', color: '#d97706', label: '😞 Negativo' },
        };
        const c = map[sentiment?.toLowerCase() ?? ''] || { bg: '#f3f4f6', color: '#6b7280', label: '—' };
        return <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: c.bg, color: c.color }}>{c.label}</span>;
    };
    const getAgentName = (retellAgentId: string) => {
        const agent = agents.find(a => a.retell_agent_id === retellAgentId);
        return agent?.name ?? retellAgentId.slice(0, 12) + '...';
    };

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: '#f5f5f5', minHeight: '100vh', display: 'flex' }}>

            {/* ===== SIDEBAR ===== */}
            <aside style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: '260px',
                background: '#ffffff', borderRight: '1px solid #e5e7eb',
                zIndex: 100, display: 'flex', flexDirection: 'column'
            }}>
                {/* Logo */}
                <div style={{ padding: '24px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <svg width="120" height="30" viewBox="0 0 120 30">
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '20px 0', overflowY: 'auto' }}>
                    {[
                        { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
                        { key: 'wizard', label: 'Crear agente', href: '/wizard', icon: 'M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z' },
                    ].map(item => (
                        <Link key={item.key} href={item.href}
                            onClick={() => setActiveNav(item.key)}
                            style={{
                                display: 'flex', alignItems: 'center', padding: '12px 20px',
                                color: activeNav === item.key ? '#267ab0' : '#6b7280',
                                textDecoration: 'none', transition: 'all 0.2s', fontSize: '14px', fontWeight: 500,
                                background: activeNav === item.key ? '#eff6fb' : 'transparent',
                                borderRight: activeNav === item.key ? '3px solid #267ab0' : '3px solid transparent'
                            }}>
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" style={{ marginRight: '12px', flexShrink: 0 }}>
                                <path d={item.icon} fillRule="evenodd" clipRule="evenodd" />
                            </svg>
                            {item.label}
                        </Link>
                    ))}

                    {/* Superadmin-only section */}
                    {user?.role === 'superadmin' && (
                        <>
                            <div style={{ margin: '16px 20px 8px', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                    Administración
                                </span>
                            </div>
                            <Link href="/admin"
                                onClick={() => setActiveNav('admin')}
                                style={{
                                    display: 'flex', alignItems: 'center', padding: '12px 20px',
                                    color: activeNav === 'admin' ? '#7c3aed' : '#7c3aed',
                                    textDecoration: 'none', transition: 'all 0.2s', fontSize: '14px', fontWeight: 600,
                                    background: activeNav === 'admin' ? '#f5f3ff' : 'transparent',
                                    borderRight: activeNav === 'admin' ? '3px solid #7c3aed' : '3px solid transparent'
                                }}>
                                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" style={{ marginRight: '12px', flexShrink: 0 }}>
                                    <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                                </svg>
                                Panel de Admin
                            </Link>
                        </>
                    )}
                </nav>

                {/* Logout */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid #e5e7eb' }}>
                    <button onClick={handleLogout} style={{
                        width: '100%', padding: '10px 16px', border: '1px solid #e5e7eb',
                        background: 'white', borderRadius: '8px', cursor: 'pointer',
                        color: '#6b7280', fontSize: '14px', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* ===== MAIN ===== */}
            <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* Topbar */}
                <header style={{
                    background: '#ffffff', borderBottom: '1px solid #e5e7eb',
                    padding: '16px 32px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', position: 'sticky', top: 0, zIndex: 50
                }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Dashboard principal</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{
                            padding: '8px 16px', background: '#f9fafb', borderRadius: '8px',
                            fontSize: '14px', fontWeight: 500, color: '#6b7280'
                        }}>
                            {user?.role === 'superadmin' ? '🔑 Super Admin' : user?.workspace_id ? 'Workspace activo' : '⚠️ Sin workspace'}
                        </span>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #267ab0 0%, #1e5a87 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 600, fontSize: '14px'
                        }}>
                            {getInitials(user?.full_name ?? null)}
                        </div>
                    </div>
                </header>

                <div style={{ flex: 1, padding: '32px' }}>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        {[
                            { title: 'Agentes creados', value: agents.length.toString(), icon: '🤖', color: '#eff6fb' },
                            { title: 'Agentes activos', value: activeCount.toString(), icon: '✅', color: '#f0fdf4' },
                            { title: 'Total llamadas', value: calls.length.toString(), icon: '📞', color: '#faf5ff' },
                            { title: 'Tasa de éxito', value: successRate !== null ? `${successRate}%` : '—', icon: '📈', color: '#fff7ed' },
                        ].map(stat => (
                            <div key={stat.title} style={{
                                background: '#ffffff', borderRadius: '12px', padding: '24px',
                                border: '1px solid #e5e7eb', transition: 'all 0.3s', cursor: 'default'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>{stat.title}</span>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                        {stat.icon}
                                    </div>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px' }}>
                                    {isLoading ? '...' : stat.value}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Agents Table */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Mis Agentes IA</h3>
                            <Link href="/wizard" style={{
                                padding: '10px 20px', background: '#267ab0', color: 'white',
                                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none'
                            }}>
                                + Crear nuevo agente
                            </Link>
                        </div>

                        {isLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                <div style={{ width: '40px', height: '40px', border: '3px solid #f3f4f6', borderTopColor: '#267ab0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                                Cargando agentes...
                            </div>
                        ) : agents.length === 0 ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                                <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>
                                    {user?.workspace_id ? 'No tienes agentes aún' : 'Sin workspace asignado'}
                                </h4>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
                                    {user?.workspace_id
                                        ? 'Crea tu primer agente de IA con el Wizard de configuración.'
                                        : 'Un administrador debe asignarte a un workspace antes de poder crear agentes.'}
                                </p>
                                {user?.workspace_id && (
                                    <Link href="/wizard" style={{
                                        padding: '12px 24px', background: '#267ab0', color: 'white',
                                        borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '14px'
                                    }}>
                                        Crear mi primer agente →
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <tr>
                                            {['Agente', 'Tipo', 'Estado', 'Retell ID', 'Creado', 'Acciones'].map(col => (
                                                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agents.map(agent => (
                                            <tr key={agent.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.15s' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{
                                                            width: '36px', height: '36px', borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, #267ab0 0%, #1e5a87 100%)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: 'white', fontWeight: 600, fontSize: '14px', flexShrink: 0
                                                        }}>
                                                            {agent.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: '14px' }}>{agent.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{agent.id.slice(0, 8)}...</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>{agent.type}</td>
                                                <td style={{ padding: '16px' }}><StatusBadge status={agent.status} /></td>
                                                <td style={{ padding: '16px', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
                                                    {agent.retell_agent_id ? agent.retell_agent_id.slice(0, 16) + '...' : '—'}
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date(agent.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '16px' }}>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button title="Editar" style={{
                                                            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #e5e7eb',
                                                            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}>
                                                            <svg width="14" height="14" fill="#6b7280" viewBox="0 0 20 20">
                                                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            title="Eliminar"
                                                            onClick={() => handleDeleteAgent(agent.id)}
                                                            disabled={deletingId === agent.id}
                                                            style={{
                                                                width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #fee2e2',
                                                                background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                opacity: deletingId === agent.id ? 0.5 : 1
                                                            }}>
                                                            <svg width="14" height="14" fill="#dc2626" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent Calls */}
                    <div style={{ background: '#ffffff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Llamadas recientes</h3>
                            <span style={{ padding: '4px 12px', background: '#f3f4f6', color: '#6b7280', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                {calls.length} registradas
                            </span>
                        </div>
                        {isLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                <div style={{ width: '32px', height: '32px', border: '3px solid #f3f4f6', borderTopColor: '#267ab0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                                Cargando llamadas...
                            </div>
                        ) : calls.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>
                                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📞</div>
                                <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0 }}>
                                    Las llamadas aparecerán aquí automáticamente una vez que Retell envíe los webhooks tras cada conversación.
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <tr>
                                            {['Fecha', 'Agente', 'Duración', 'Sentimiento', 'Estado', 'Coste', ''].map(col => (
                                                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calls.map(call => (
                                            <>
                                                <tr key={call.id}
                                                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.15s' }}
                                                    onClick={() => setExpandedCallId(expandedCallId === call.id ? null : call.id)}
                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                        {new Date(call.created_at).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>
                                                        {getAgentName(call.retell_agent_id)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                        {formatDuration(call.duration_ms)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        {getSentimentBadge(call.call_analysis?.user_sentiment)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <span style={{
                                                            padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                                            background: call.call_analysis?.call_successful ? '#dcfce7' : '#fee2e2',
                                                            color: call.call_analysis?.call_successful ? '#16a34a' : '#dc2626'
                                                        }}>
                                                            {call.call_analysis?.call_successful ? '✓ Éxito' : '✗ Sin resolver'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                        {call.call_cost ? `€${call.call_cost.toFixed(4)}` : '—'}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontSize: '18px', color: '#9ca3af' }}>
                                                        {expandedCallId === call.id ? '▲' : '▼'}
                                                    </td>
                                                </tr>
                                                {expandedCallId === call.id && (
                                                    <tr key={`${call.id}-detail`}>
                                                        <td colSpan={7} style={{ padding: '0 16px 16px', background: '#f9fafb' }}>
                                                            <div style={{ padding: '16px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                                                <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', margin: '0 0 8px 0' }}>TRANSCRIPCIÓN</p>
                                                                <p style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.6, margin: '0 0 12px 0', whiteSpace: 'pre-wrap' }}>
                                                                    {call.transcript || 'Sin transcripción disponible.'}
                                                                </p>
                                                                {call.recording_url && (
                                                                    <audio controls src={call.recording_url} style={{ width: '100%', marginTop: '8px' }} />
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
