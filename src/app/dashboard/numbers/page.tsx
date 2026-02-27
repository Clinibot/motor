"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

interface PhoneNumber {
    id: string;
    phone_number: string;
    phone_number_pretty: string;
    retell_agent_id: string | null;
    nickname: string | null;
}

interface Agent {
    id: string;
    name: string;
    retell_agent_id: string | null;
}

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
    workspace_id: string | null;
}

export default function NumbersPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }

            const { data: profile } = await supabase
                .from('users').select('full_name, email, role, workspace_id')
                .eq('id', session.user.id).single();

            const currentWorkspaceId = profile?.workspace_id;
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user', workspace_id: currentWorkspaceId });

            if (currentWorkspaceId) {
                // Fetch agents for the dropdown
                const { data: agentList } = await supabase
                    .from('agents')
                    .select('id, name, retell_agent_id')
                    .eq('workspace_id', currentWorkspaceId);
                setAgents(agentList ?? []);

                // Mocking numbers for now since we don't have a table for them yet
                // In a real scenario, we would fetch from Retell or our DB
                setNumbers([
                    { id: '1', phone_number: '+34910000001', phone_number_pretty: '+34 910 000 001', retell_agent_id: null, nickname: 'Línea Principal' },
                    { id: '2', phone_number: '+34910000002', phone_number_pretty: '+34 910 000 002', retell_agent_id: agentList?.[0]?.retell_agent_id || null, nickname: 'Soporte Ventas' },
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleAssignAgent = async (numberId: string, retellAgentId: string) => {
        setIsUpdatingId(numberId);
        try {
            // Simulated update
            setNumbers(prev => prev.map(n => n.id === numberId ? { ...n, retell_agent_id: retellAgentId === 'none' ? null : retellAgentId } : n));
            // Here would go the API call to Retell to update the phone_number object
        } finally {
            setIsUpdatingId(null);
        }
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;color:#1a1a1a}
                .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:#fff;border-right:1px solid #e5e7eb;z-index:100;display:flex;flex-direction:column}
                .logo-container{padding:24px 20px;border-bottom:1px solid #e5e7eb}
                .nav-menu{flex:1;padding:20px 0;overflow-y:auto}
                .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left}
                .nav-item:hover{background:#f9fafb;color:#267ab0}
                .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0}
                .nav-icon{width:20px;height:20px;margin-right:12px;flex-shrink:0}
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8;}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
                .topbar-right{display:flex;align-items:center;gap:20px}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .content{flex:1;padding:32px}
                
                .tabs{display:flex;gap:32px;border-bottom:1px solid #e5e7eb;margin-bottom:32px}
                .tab-item{padding:12px 0;font-size:15px;font-weight:600;color:#6b7280;cursor:pointer;position:relative;transition:all .2s}
                .tab-item:hover{color:#1a1a1a}
                .tab-item.active{color:#267ab0}
                .tab-item.active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:#267ab0}

                .card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
                .table-header{padding:24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
                .table-title{font-size:18px;font-weight:600;color:#1a1a1a}
                
                .numbers-table{width:100%;border-collapse:collapse}
                .numbers-table th{padding:12px 24px;text-align:left;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;background:#f9fafb;border-bottom:1px solid #e5e7eb}
                .numbers-table td{padding:20px 24px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1a1a1a;vertical-align:middle}
                
                .phone-box{display:flex;flex-direction:column;gap:4px}
                .phone-number{font-weight:700;color:#1a1a1a;font-size:15px}
                .phone-nickname{color:#6b7280;font-size:12px}

                .agent-selector{padding:8px 12px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;font-size:14px;color:#1a1a1a;width:240px;cursor:pointer;outline:none;transition:all .2s}
                .agent-selector:hover{border-color:#267ab0}
                .agent-selector:focus{border-color:#267ab0;box-shadow:0 0 0 2px rgba(38,122,176,0.1)}

                .badge-status{padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;background:#dcfce7;color:#16a34a;display:inline-flex;align-items:center;gap:4px}
                
                .proximamente-container{padding:80px 40px;text-align:center;background:#fff;border-radius:12px;border:1px dashed #d1d5db}
                .proximamente-icon{font-size:48px;margin-bottom:16px;display:block}
                .proximamente-title{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:8px}
                .proximamente-text{color:#6b7280;max-width:400px;margin:0 auto}

                .btn-add{padding:10px 20px;background:#267ab0;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px}
                .btn-add:hover{background:#1e5a87;transform:translateY(-1px)}
            `}</style>

            <aside className="sidebar">
                <div className="logo-container">
                    <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                </div>
                <nav className="nav-menu">
                    {[
                        { label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z', active: false },
                        { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', active: false },
                        { label: 'Mis números', href: '/dashboard/numbers', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', active: true },
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
                </nav>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Telefonía e IA</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="user-avatar" onClick={handleLogout} title="Cerrar sesión">
                            {userInitial}
                        </button>
                    </div>
                </header>

                <div className="content">
                    <div className="tabs">
                        <div className={`tab-item ${activeTab === 'inbound' ? 'active' : ''}`} onClick={() => setActiveTab('inbound')}>
                            Recepción de Llamadas (Inbound)
                        </div>
                        <div className={`tab-item ${activeTab === 'outbound' ? 'active' : ''}`} onClick={() => setActiveTab('outbound')}>
                            Emisión de Llamadas (Outbound)
                        </div>
                    </div>

                    {activeTab === 'inbound' ? (
                        <div className="card">
                            <div className="table-header">
                                <h3 className="table-title">Mis números de Retell</h3>
                                <button className="btn-add">
                                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Añadir número
                                </button>
                            </div>

                            {isLoading ? (
                                <div style={{ padding: '60px', textAlign: 'center' }}>Cargando telefonía...</div>
                            ) : (
                                <table className="numbers-table">
                                    <thead>
                                        <tr>
                                            <th>Número de Teléfono</th>
                                            <th>Estado</th>
                                            <th>Agente IA Asignado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {numbers.map(num => (
                                            <tr key={num.id}>
                                                <td>
                                                    <div className="phone-box">
                                                        <span className="phone-number">{num.phone_number_pretty}</span>
                                                        <span className="phone-nickname">{num.nickname}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge-status">✓ Conectado</span>
                                                </td>
                                                <td>
                                                    <select
                                                        className="agent-selector"
                                                        value={num.retell_agent_id || 'none'}
                                                        onChange={(e) => handleAssignAgent(num.id, e.target.value)}
                                                        disabled={isUpdatingId === num.id}
                                                    >
                                                        <option value="none">Sin agente (Desactivado)</option>
                                                        {agents.map(agent => (
                                                            <option key={agent.id} value={agent.retell_agent_id || ''}>
                                                                {agent.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ) : (
                        <div className="proximamente-container">
                            <span className="proximamente-icon">🚀</span>
                            <h3 className="proximamente-title">Llamadas Outbound</h3>
                            <p className="proximamente-text">
                                Estamos trabajando para que pronto puedas realizar llamadas automáticas
                                de seguimiento, recordatorios y ventas directamente desde tu panel.
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
