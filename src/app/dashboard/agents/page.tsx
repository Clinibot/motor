"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

interface Agent {
    id: string;
    name: string;
    retell_agent_id: string | null;
    type: string;
    status: string;
    created_at: string;
}

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
    workspace_id: string | null;
}

export default function AgentsPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

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
                const { data: agentList } = await supabase
                    .from('agents')
                    .select('*')
                    .eq('workspace_id', currentWorkspaceId)
                    .order('created_at', { ascending: false });
                setAgents(agentList ?? []);
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

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el agente "${name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        setIsDeletingId(id);
        try {
            const response = await fetch(`/api/retell/agent?id=${id}`, {
                method: 'DELETE',
            });
            const data = await response.json();
            if (data.success) {
                setAgents(agents.filter(a => a.id !== id));
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error("Error deleting agent:", error);
            alert("Ocurrió un error al intentar eliminar el agente.");
        } finally {
            setIsDeletingId(null);
        }
    };

    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    const getAgentTypeName = (type: string) => {
        const types: Record<string, string> = {
            'transferencia': 'Transferencia',
            'agendamiento': 'Agendamiento',
            'cualificacion': 'Cualificación'
        };
        return types[type] || type || 'Desconocido';
    };

    return (
        <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8;}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
                .topbar-right{display:flex;align-items:center;gap:20px}
                .notification-bell{position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f9fafb;cursor:pointer;border:none;transition:all .2s}
                .notification-bell:hover{background:#e5e7eb}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .content{flex:1;padding:32px}
                .btn-primary{padding:10px 20px;background:#267ab0;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px;font-family:inherit;text-decoration:none}
                .btn-primary:hover{background:#1e5a87;transform:translateY(-1px);box-shadow:0 4px 12px rgba(38,122,176,.3)}
                .agents-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
                .agent-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;transition:all .3s;display:flex;flex-direction:column}
                .agent-card:hover{transform:translateY(-4px);box-shadow:0 12px 24px rgba(0,0,0,.08)}
                .agent-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
                .agent-info-left{display:flex;align-items:center;gap:12px}
                .agent-avatar-lg{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#eff6fb 0%,#dbeafe 100%);color:#267ab0;display:flex;align-items:center;justify-content:center;font-size:24px}
                .agent-title{font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:4px}
                .agent-type{font-size:13px;color:#6b7280;font-weight:500;}
                .agent-status{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#16a34a}
                .agent-meta{margin-top:auto;padding-top:16px;border-top:1px solid #f3f4f6;display:flex;flex-direction:column;gap:8px;font-size:13px;color:#6b7280}
                .agent-actions{display:flex;gap:10px;margin-top:20px}
                .btn-edit{flex:1;padding:8px;border:1px solid #e5e7eb;background:#fff;border-radius:8px;font-size:13px;font-weight:600;color:#267ab0;cursor:pointer;transition:all .2s;text-align:center;text-decoration:none}
                .btn-edit:hover{background:#eff6fb;border-color:#267ab0}
                .btn-delete{padding:8px 12px;border:1px solid #fee2e2;background:#fff;border-radius:8px;color:#ef4444;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
                .btn-delete:hover{background:#fef2f2;border-color:#ef4444}
                .spinner{border:3px solid #f3f4f6;border-top:3px solid #267ab0;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 16px}
                @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
                .empty-state{padding:80px 40px;text-align:center;color:#6b7280;background:#fff;border-radius:12px;border:1px dashed #d1d5db}
                .empty-icon{font-size:48px;color:#9ca3af;margin-bottom:16px}
            `}</style>

            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="logo-container">
                    <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                </div>
                <nav className="nav-menu">
                    {[
                        { label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z', active: false },
                        { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', active: true },
                        { label: 'Mis números', href: '#', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', active: false },
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
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Mis agentes IA</h1>
                    </div>
                    <div className="topbar-right">
                        <Link href="/wizard" className="btn-primary">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Crear nuevo agente
                        </Link>
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
                            <p>Cargando agentes...</p>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🤖</div>
                            <h3 style={{ fontSize: '20px', color: '#1a1a1a', marginBottom: '8px', fontWeight: 600 }}>Aún no tienes agentes</h3>
                            <p style={{ marginBottom: '24px' }}>Crea tu primer agente conversacional impulsado por IA para automatizar tus llamadas.</p>
                            <Link href="/wizard" className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                                Crear mi primer agente
                            </Link>
                        </div>
                    ) : (
                        <div className="agents-grid">
                            {agents.map(agent => (
                                <div key={agent.id} className="agent-card">
                                    <div className="agent-header">
                                        <div className="agent-info-left">
                                            <div className="agent-avatar-lg">
                                                {agent.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="agent-title">{agent.name}</h3>
                                                <div className="agent-type">{getAgentTypeName(agent.type)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="agent-meta">
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Estado:</span>
                                            <span className="agent-status">
                                                {agent.status === 'active' ? '✓ Activo' : agent.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Creación:</span>
                                            <span style={{ color: '#1a1a1a', fontWeight: 500 }}>
                                                {new Date(agent.created_at).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="agent-actions">
                                        <Link href={`/wizard?editId=${agent.id}`} className="btn-edit">
                                            Editar Configuración
                                        </Link>
                                        <button
                                            className="btn-delete"
                                            title="Eliminar agente"
                                            onClick={() => handleDelete(agent.id, agent.name)}
                                            disabled={isDeletingId === agent.id}
                                        >
                                            {isDeletingId === agent.id ? (
                                                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginBottom: 0, borderColor: '#ef4444', borderTopColor: 'transparent' }} />
                                            ) : (
                                                <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
