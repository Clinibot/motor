"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useWizardStore } from '../../../store/wizardStore';
import { RetellWebClient } from "retell-client-js-sdk";
import DashboardSidebar from '../../../components/DashboardSidebar';

const retellWebClient = new RetellWebClient();

interface Agent {
    id: string;
    name: string;
    retell_agent_id: string | null;
    type: string;
    status: string;
    created_at: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    configuration?: any;
}

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
    workspace_id: string | null;
}

export default function AgentsPage() {
    const router = useRouter();
    const { resetWizard } = useWizardStore();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Testing State
    const [testAgent, setTestAgent] = useState<Agent | null>(null);
    const [callStatus, setCallStatus] = useState<"inactive" | "active" | "connecting">("inactive");
    const [callError, setCallError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleCreateAgent = (e: React.MouseEvent) => {
        e.preventDefault();
        resetWizard();
        router.push('/wizard');
    };

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

    // Retell Event Listeners Setup
    useEffect(() => {
        retellWebClient.on("call_started", () => setCallStatus("active"));
        retellWebClient.on("call_ended", () => setCallStatus("inactive"));
        retellWebClient.on("agent_start_talking", () => console.log("Agent started talking"));
        retellWebClient.on("agent_stop_talking", () => console.log("Agent stopped talking"));
        retellWebClient.on("error", (error) => {
            console.error("Retell Web Client error:", error);
            setCallStatus("inactive");
            retellWebClient.stopCall();
            setCallError("Ocurrió un error en la llamada. Por favor intenta nuevamente.");
        });

        // Cleanup
        return () => {
            retellWebClient.stopCall();
        };
    }, []);

    const toggleCall = async () => {
        if (!testAgent || !user?.workspace_id) return;

        if (callStatus === "active" || callStatus === "connecting") {
            retellWebClient.stopCall();
            setCallStatus("inactive");
        } else {
            try {
                setCallStatus("connecting");
                const response = await fetch("/api/retell/web-call", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agent_id: testAgent.retell_agent_id,
                        workspace_id: user.workspace_id
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Error HTTP: ${response.status}`);
                }

                if (data.success && data.access_token) {
                    await retellWebClient.startCall({ accessToken: data.access_token });
                } else {
                    throw new Error(data.error || "Failed to get access token");
                }
            } catch (error) {
                console.error("Error starting call:", error);
                setCallStatus("inactive");
                setCallError(`Error al iniciar la llamada: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
        }
    };

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
                setDeleteError(`Error al eliminar: ${data.error}`);
            }
        } catch (error) {
            console.error("Error deleting agent:", error);
            setDeleteError("Ocurrió un error al intentar eliminar el agente.");
        } finally {
            setIsDeletingId(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                .nav-item.admin-item{color:#7c3aed}
                .nav-item.admin-item:hover{background:#f5f3ff;color:#7c3aed}
                .nav-item.admin-item.active{background:#ede9fe;color:#6d28d9;border-right:3px solid #7c3aed}
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
                
                .agents-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
                .agent-card{background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;transition:all .3s;display:flex;flex-direction:column}
                .agent-card:hover{transform:translateY(-4px);box-shadow:0 12px 24px rgba(0,0,0,.08)}
                .agent-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
                .agent-info-left{display:flex;align-items:center;gap:12px}
                .agent-avatar-lg{width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#eff6fb 0%,#dbeafe 100%);color:#267ab0;display:flex;align-items:center;justify-content:center;font-size:24px}
                .agent-title{font-size:18px;font-weight:700;color:#1a1a1a;margin-bottom:4px}
                .agent-type{font-size:13px;color:#6b7280;font-weight:500;}
                .agent-status{padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#16a34a}
                .agent-meta{margin-top:auto;padding-top:16px;display:flex;flex-direction:column;gap:8px;font-size:13px;color:#6b7280}
                .agent-actions{display:flex;gap:10px;margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;}
                .btn-edit{flex:1;padding:8px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;font-weight:600;color:#4b5563;cursor:pointer;transition:all .2s;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;}
                .btn-edit:hover{background:#f9fafb;border-color:#d1d5db;color:#1a1a1a;}
                .btn-delete{padding:8px 12px;border:1px solid #fee2e2;background:#fff;border-radius:8px;color:#ef4444;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center}
                .btn-delete:hover{background:#fef2f2;border-color:#ef4444}
                .spinner{border:3px solid #f3f4f6;border-top:3px solid #267ab0;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 16px}
                @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
                .empty-state{padding:80px 40px;text-align:center;color:#6b7280;background:#fff;border-radius:12px;border:1px dashed #d1d5db}
                .empty-icon{font-size:48px;color:#9ca3af;margin-bottom:16px}
                .btn-test{flex:1;padding:8px;background:#267ab0;border:1px solid #267ab0;border-radius:8px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:all .2s;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;}
                .btn-test:hover{background:#1e5a87;border-color:#1e5a87}
                .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
                .modal-content{background:#fff;border-radius:24px;width:100%;max-width:480px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);overflow:hidden;animation:modal-enter 0.3s cubic-bezier(0.16,1,0.3,1)}
                .modal-header{padding:24px 32px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#f9fafb}
                .modal-close{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#f3f4f6;border:none;cursor:pointer;color:#6b7280;transition:all .2s}
                .modal-close:hover{background:#e5e7eb;color:#1a1a1a}
                .modal-body{padding:40px 32px;display:flex;flex-direction:column;align-items:center;text-align:center}
                .voice-waves{width:120px;height:120px;border-radius:50%;background:#eff6fb;display:flex;align-items:center;justify-content:center;margin-bottom:24px;position:relative}
                .voice-waves.active::before,.voice-waves.active::after{content:'';position:absolute;inset:-10px;border-radius:50%;border:2px solid #267ab0;animation:ripple 2s linear infinite;opacity:0}
                .voice-waves.active::after{animation-delay:1s}
                .voice-waves svg{width:48px;height:48px;color:#267ab0}
                @keyframes ripple{0%{transform:scale(0.8);opacity:0.5}100%{transform:scale(1.5);opacity:0}}
                @keyframes modal-enter{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
                .call-btn{width:100%;padding:16px;border-radius:16px;border:none;font-size:16px;font-weight:600;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:32px;transition:all .2s}
                .call-btn.start{background:#16a34a}
                .call-btn.start:hover{background:#15803d;transform:translateY(-1px);box-shadow:0 10px 15px -3px rgba(22,163,74,0.3)}
                .call-btn.stop{background:#ef4444}
                .call-btn.stop:hover{background:#dc2626;transform:translateY(-1px);box-shadow:0 10px 15px -3px rgba(239,68,68,0.3)}
                .call-btn.connecting{background:#ca8a04;cursor:wait;opacity:0.8}
            `}</style>

            <DashboardSidebar user={user} />

            {/* MAIN CONTENT */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Mis agentes IA</h1>
                    </div>
                    <div className="topbar-right">
                        <button onClick={handleCreateAgent} className="btn-primary">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Crear nuevo agente
                        </button>
                        <button className="notification-bell">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            <span className="notification-badge" />
                        </button>
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

                <div className="content" style={{ position: 'relative' }}>
                    {deleteError && (
                        <div style={{
                            background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '10px',
                            padding: '14px 20px', marginBottom: '20px', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                            fontSize: '14px', color: '#dc2626', fontWeight: 500,
                        }}>
                            <span>
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style={{ marginRight: '8px', verticalAlign: '-2px' }}>
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {deleteError}
                            </span>
                            <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '18px', lineHeight: 1 }}>×</button>
                        </div>
                    )}
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
                            <button onClick={handleCreateAgent} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                                Crear mi primer agente
                            </button>
                        </div>
                    ) : (
                        <div className="agents-grid">
                            {agents.map(agent => {
                                const modelNames: Record<string, string> = {
                                    'gpt-4.1': 'gpt-4.1',
                                    'gpt-5.1': 'gpt-5.1',
                                    'gpt-5.2': 'gpt-5.2',
                                    'gemini-3.0-flash': 'gemini-3.0-flash',
                                    'gemini-2.5-pro': 'gemini-2.5-pro',
                                    'claude-3.5-sonnet': 'claude-3.5-sonnet'
                                };
                                const _mdl = agent.configuration?.model || 'gpt-4.1';
                                const displayModel = modelNames[_mdl] || _mdl;

                                const displayVoiceMap: Record<string, string> = {
                                    '11labs-Adrian': 'Voz Adrián',
                                    'cartesia-Isabel': 'Voz Isabel',
                                    '11068': 'Voz Cristina',
                                    '11844': 'Voz Mari Carme',
                                    '12051': 'Voz Cimo',
                                    'cartesia-Manuel': 'Voz Manuel',
                                    '11375': 'Voz Santiago',
                                    '11753': 'Voz Adrian'
                                };
                                const _voice = agent.configuration?.voiceId || '11labs-Adrian';
                                const displayVoice = displayVoiceMap[_voice] || ('Voz ' + _voice.split('-').pop());

                                return (
                                    <div key={agent.id} className="agent-card">
                                        <div className="agent-header">
                                            <div className="agent-info-left">
                                                <div className="agent-avatar-lg" style={{ background: agent.type === 'transferencia' ? '#fff7ed' : '#eff6fb', color: agent.type === 'transferencia' ? '#f97316' : '#267ab0' }}>
                                                    {agent.type === 'transferencia' ? (
                                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 5h6m0 0v6m0-6l-7 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="agent-title">{agent.name}</h3>
                                                    <div className="agent-type">
                                                        {getAgentTypeName(agent.type)}
                                                        {agent.type === 'cualificacion' && ' y atención'}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="agent-status" style={{ background: agent.status === 'active' ? '#dcfce7' : undefined, color: agent.status === 'active' ? '#16a34a' : undefined }}>
                                                {agent.status === 'active' ? '● Activo' : agent.status}
                                            </span>
                                        </div>

                                        <div className="agent-meta">
                                            <div style={{ paddingBottom: '0px', color: '#6b7280', fontSize: '13px', display: 'flex', gap: '4px' }}>
                                                {displayModel} · {displayVoice} · <span suppressHydrationWarning>{new Date(agent.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                        </div>

                                        <div className="agent-actions">
                                            <Link href={`/wizard?editId=${agent.id}`} className="btn-edit">
                                                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                                Editar
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
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                            </button>
                                            <button className="btn-test" onClick={() => setTestAgent(agent)}>
                                                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                Probar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Test Modal Overlay */}
            {testAgent && (
                <div className="modal-overlay" onClick={() => { if (callStatus === 'inactive') setTestAgent(null) }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>{testAgent.name}</h3>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>Prueba de agente por voz</p>
                            </div>
                            {callStatus === "inactive" && (
                                <button className="modal-close" onClick={() => setTestAgent(null)}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <div className="modal-body">
                            <div className={`voice-waves ${callStatus === "active" ? "active" : ""}`}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                                </svg>
                            </div>

                            {callError && (
                                <div style={{
                                    background: '#fff1f2', border: '1px solid #fca5a5', borderRadius: '8px',
                                    padding: '12px 16px', marginBottom: '12px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                    fontSize: '13px', color: '#dc2626', fontWeight: 500, width: '100%', textAlign: 'left',
                                }}>
                                    <span>{callError}</span>
                                    <button onClick={() => setCallError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '16px', lineHeight: 1 }}>×</button>
                                </div>
                            )}
                            <p style={{ color: '#4b5563', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px' }}>
                                {callStatus === "inactive" ? "Pulsa el botón de abajo, autoriza el uso de tu micrófono y empieza a hablar con tu agente." :
                                    callStatus === "connecting" ? "Estableciendo conexión segura..." :
                                        "Escuchando y respondiendo..."}
                            </p>

                            <div className="mt-8 p-4 bg-orange-50 border border-orange-100 rounded-xl text-left w-full">
                                <div className="flex gap-3 items-start mb-2">
                                    <div className="bg-orange-100 p-1.5 rounded-lg">
                                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xs font-bold text-orange-900 pt-1">Notas de prueba</h4>
                                </div>
                                <div className="space-y-3 pl-1">
                                    <div className="flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                        <p className="text-[11px] text-orange-800 leading-normal">
                                            <strong>Transferencias:</strong> No funcionan desde La Fábrica de agentes, únicamente en llamadas reales desde un número de teléfono.
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                        <p className="text-[11px] text-orange-800 leading-normal">
                                            <strong>Instrucciones:</strong> Si necesitas perfilar o mejorar el comportamiento, puedes editar las instrucciones en el panel de edición con cuidado.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                className={`call-btn ${callStatus === "inactive" ? "start" : callStatus === "active" ? "stop" : "connecting"}`}
                                onClick={toggleCall}
                                disabled={callStatus === "connecting"}
                            >
                                {callStatus === "inactive" ? (
                                    <>
                                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                        </svg>
                                        Iniciar llamada
                                    </>
                                ) : callStatus === "active" ? (
                                    <>
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8H8V8h8z" />
                                        </svg>
                                        Finalizar llamada
                                    </>
                                ) : (
                                    <>Conectando...</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
