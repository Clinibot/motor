"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useWizardStore } from '../../../store/wizardStore';
import { RetellWebClient } from "retell-client-js-sdk";
import DashboardSidebar from '../../../components/DashboardSidebar';
import DashboardTopbar from '../../../components/DashboardTopbar';

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


    const getAgentTypeName = (type: string) => {
        const types: Record<string, string> = {
            'transferencia': 'Transferencia de llamadas',
            'agendamiento': 'Reserva de citas',
            'cualificacion': 'Cualificación y atención',
            'soporte': 'Soporte técnico'
        };
        return types[type] || type || 'Asistente Virtual';
    };

    return (
        <div className="app-container">
            <DashboardSidebar user={user} />

            <div className="main-view">
                <DashboardTopbar 
                    title="Mis agentes IA"
                    user={user}
                    isAlertPanelOpen={false}
                    setIsAlertPanelOpen={() => {}}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleCreateAgent={handleCreateAgent}
                    handleLogout={handleLogout}
                    dropdownRef={dropdownRef}
                />

                <div className="dashboard-content">
                    <div className="page-header" style={{ marginBottom: '24px' }}>
                        <div className="page-title-group">
                            {/* Title is already in Topbar */}
                        </div>
                        <button onClick={handleCreateAgent} className="btn-p">
                            <i className="bi bi-plus-lg"></i>
                            <span>Nuevo Agente</span>
                        </button>
                    </div>

                    {deleteError && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '16px',
                            padding: '16px 24px', marginBottom: '32px', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                            fontSize: '14px', color: '#ef4444', fontWeight: 600,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '18px' }}></i>
                                {deleteError}
                            </div>
                            <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '24px', lineHeight: 1 }}>×</button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="card-premium" style={{ textAlign: 'center', padding: '100px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid var(--slate-100)', borderTopColor: 'var(--azul)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <p style={{ color: 'var(--slate-500)', fontWeight: 600, fontSize: '16px' }}>Sincronizando tus agentes...</p>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="card-premium" style={{ textAlign: 'center', padding: '100px 40px', border: '2px dashed var(--slate-200)', background: 'rgba(248, 250, 252, 0.5)', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '80px', height: '80px', background: 'var(--azul-light)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', marginBottom: '24px' }}>🤖</div>
                            <h3 style={{ fontSize: '22px', color: 'var(--slate-900)', marginBottom: '12px', fontWeight: 800 }}>Todavía no has creado ningún agente</h3>
                            <p style={{ marginBottom: '40px', color: 'var(--slate-500)', maxWidth: '420px', fontSize: '15px', lineHeight: 1.6 }}>Comienza ahora creando tu primer asistente virtual y descubre el poder de la automatización por voz.</p>
                            <button onClick={handleCreateAgent} className="btn-p" style={{ padding: '16px 32px', fontSize: '16px' }}>
                                <i className="bi bi-magic"></i>
                                <span>Configurar mi primer agente</span>
                            </button>
                        </div>
                    ) : (
                        <div className="agents-grid">
                            {agents.map((agent, idx) => {
                                const colors = ['#eff6ff', '#fff7ed', '#f5f3ff', '#f0fdf4'];
                                const textColors = ['#2563eb', '#f97316', '#8b5cf6', '#10b981'];
                                const initial = (agent.name || 'A').charAt(0).toUpperCase();
                                const colorIndex = idx % colors.length;

                                return (
                                    <div key={agent.id} className="agent-card-v2">
                                        <div className="ac-header">
                                            <div className="ac-avatar" style={{ 
                                                background: colors[colorIndex],
                                                color: textColors[colorIndex]
                                            }}>
                                                {initial}
                                            </div>
                                            <div className="ac-name-group">
                                                <h3 className="ac-name">{agent.name}</h3>
                                                <p className="ac-role">{getAgentTypeName(agent.type)}</p>
                                            </div>
                                        </div>

                                        <div className="ac-stats-compact">
                                            <div className="ac-stat-row">
                                                <span className="ac-stat-label">Estado:</span>
                                                <span className="badge-pill active">
                                                    <span className="dot" style={{ background: 'var(--exito)' }}></span>
                                                    Activo
                                                </span>
                                            </div>
                                            <div className="ac-stat-row">
                                                <span className="ac-stat-label">Creación:</span>
                                                <span className="ac-stat-value" suppressHydrationWarning>
                                                    {new Date(agent.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ac-actions-v2">
                                            <button 
                                                className="ac-btn-test" 
                                                onClick={() => setTestAgent(agent)}
                                            >
                                                <i className="bi bi-headphones"></i>
                                                <span>Probar</span>
                                            </button>
                                            <Link href={`/wizard?editId=${agent.id}`} className="ac-btn-edit" style={{ textDecoration: 'none' }}>
                                                <i className="bi bi-pencil-square"></i>
                                                <span>Editar</span>
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(agent.id, agent.name)}
                                                disabled={isDeletingId === agent.id}
                                                className="ac-btn-delete"
                                            >
                                                {isDeletingId === agent.id ? (
                                                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: 'var(--error)', margin: 0 }} />
                                                ) : (
                                                    <i className="bi bi-trash3"></i>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Test Modal Overlay */}
            {testAgent && (
                <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (callStatus === 'inactive') setTestAgent(null) }}>
                    <div className="card-premium" style={{ width: '100%', maxWidth: '520px', padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '32px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-900)', margin: 0, letterSpacing: '-0.02em' }}>{testAgent.name}</h3>
                                <p style={{ fontSize: '14px', color: 'var(--slate-500)', margin: '4px 0 0 0', fontWeight: 500 }}>Prueba interactiva del asistente</p>
                            </div>
                            {callStatus === "inactive" && (
                                <button onClick={() => setTestAgent(null)} className="btn-s" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', justifyContent: 'center' }}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '48px 40px', textAlign: 'center' }}>
                            <div className={`voice-waves ${callStatus === "active" ? "active" : ""}`} style={{ 
                                width: '120px', height: '120px', borderRadius: '40px', background: 'var(--azul-light)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 40px',
                                position: 'relative', fontSize: '48px', color: 'var(--azul)',
                                boxShadow: callStatus === 'active' ? '0 0 0 10px rgba(37, 99, 235, 0.1)' : 'none',
                                transition: 'all 0.3s ease'
                            }}>
                                <i className={`bi bi-mic${callStatus === 'active' ? '-fill' : ''}`}></i>
                                {callStatus === "active" && (
                                    <div style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, background: 'var(--exito)', borderRadius: '50%', border: '4px solid white' }}></div>
                                )}
                            </div>

                            {callError && (
                                <div style={{
                                    background: 'var(--error-light)', border: '1px solid #fecaca', borderRadius: '16px',
                                    padding: '16px 20px', marginBottom: '32px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                                    fontSize: '14px', color: 'var(--error)', fontWeight: 600, textAlign: 'left',
                                }}>
                                    <span>{callError}</span>
                                    <button onClick={() => setCallError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '20px', lineHeight: 1 }}>×</button>
                                </div>
                            )}

                            <p style={{ color: 'var(--slate-600)', fontSize: '16px', lineHeight: '1.6', maxWidth: '380px', margin: '0 auto 40px', fontWeight: 500 }}>
                                {callStatus === "inactive" ? "Pulsa el botón para iniciar una conversación por voz. Asegúrate de permitir el acceso al micrófono." :
                                    callStatus === "connecting" ? "Conectando con los servidores de IA..." :
                                        "Llamada en curso. El agente está listo para escucharte."}
                            </p>

                            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '20px', padding: '24px', textAlign: 'left', marginBottom: '40px' }}>
                                <div style={{ marginBottom: '16px', color: '#92400e', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <i className="bi bi-info-circle-fill" style={{ fontSize: '16px' }}></i>
                                    IMPORTANTE
                                </div>
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <li style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.5', display: 'flex', gap: '10px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', marginTop: '6px', flexShrink: 0 }}></div>
                                        <span>Esta es una <strong>simulación web</strong>. El rendimiento puede variar según tu conexión a internet.</span>
                                    </li>
                                    <li style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.5', display: 'flex', gap: '10px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706', marginTop: '6px', flexShrink: 0 }}></div>
                                        <span>Utiliza cascos para evitar ecos y mejorar la experiencia de cancelación de ruido.</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                className="btn-p"
                                onClick={toggleCall}
                                disabled={callStatus === "connecting"}
                                style={{ 
                                    width: '100%', padding: '20px', borderRadius: '20px', fontSize: '18px', justifyContent: 'center',
                                    background: callStatus === "inactive" ? 'var(--exito)' : callStatus === "active" ? 'var(--error)' : 'var(--alerta)',
                                    boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)'
                                }}
                            >
                                {callStatus === "inactive" ? (
                                    <><i className="bi bi-mic-fill"></i> Iniciar Prueba de Voz</>
                                ) : callStatus === "active" ? (
                                    <><i className="bi bi-telephone-x-fill"></i> Colgar Llamada</>
                                ) : (
                                    <>Estableciendo conexión...</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
