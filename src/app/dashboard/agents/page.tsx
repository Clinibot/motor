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

                <div className="dashboard-content" style={{ padding: '32px' }}>
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 8px 0' }}>
                            Mis agentes IA
                        </h2>
                        <p style={{ color: 'var(--slate-500)', fontSize: '14px', margin: 0 }}>
                            Gestiona y optimiza el rendimiento de tus agentes virtuales.
                        </p>
                    </div>

                    {deleteError && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
                            padding: '16px 20px', marginBottom: '24px', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                            fontSize: '14px', color: '#ef4444', fontWeight: 500,
                        }}>
                            <div className="flex-center gap-8">
                                <i className="bi bi-exclamation-circle-fill"></i>
                                {deleteError}
                            </div>
                            <button onClick={() => setDeleteError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '20px' }}>×</button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="card-premium" style={{ textAlign: 'center', padding: '80px 0' }}>
                            <div className="spinner" style={{ border: '3px solid var(--slate-100)', borderTop: '3px solid var(--azul)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                            <p style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Cargando agentes...</p>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="card-premium" style={{ textAlign: 'center', padding: '80px 40px', border: '2px dashed var(--slate-200)', background: 'transparent', boxShadow: 'none' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
                            <h3 style={{ fontSize: '20px', color: 'var(--slate-900)', marginBottom: '8px', fontWeight: 700 }}>Aún no tienes agentes</h3>
                            <p style={{ marginBottom: '32px', color: 'var(--slate-500)', maxWidth: '400px', margin: '0 auto 32px' }}>Crea tu primer agente conversacional impulsado por IA para automatizar tus llamadas.</p>
                            <button onClick={handleCreateAgent} className="btn-premium" style={{ margin: '0 auto' }}>
                                <i className="bi bi-plus-lg"></i>
                                Crear mi primer agente
                            </button>
                        </div>
                    ) : (
                        <div className="agents-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                            {agents.map((agent, idx) => {
                                const colors = ['#eff6ff', '#fff7ed', '#f5f3ff', '#f0fdf4'];
                                const textColors = ['#1d4ed8', '#c2410c', '#6d28d9', '#15803d'];
                                const initial = (agent.name || 'A').charAt(0).toUpperCase();
                                const colorIndex = idx % colors.length;

                                return (
                                    <div key={agent.id} className="card-premium" style={{ display: 'flex', flexDirection: 'column', padding: '24px', borderRadius: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                            <div style={{ 
                                                width: '56px', height: '56px', borderRadius: '14px', 
                                                background: colors[colorIndex],
                                                color: textColors[colorIndex],
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                fontSize: '22px', fontWeight: 800,
                                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.03)'
                                            }}>
                                                {initial}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 2px 0' }}>{agent.name}</h3>
                                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 500 }}>
                                                    {getAgentTypeName(agent.type)}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--slate-500)' }}>Estado:</span>
                                                <span style={{ 
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 800, 
                                                    background: '#ecfdf5', color: '#10b981', textTransform: 'uppercase'
                                                }}>
                                                    <i className="bi bi-check-lg" style={{ fontSize: '12px' }}></i>
                                                    Activo
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--slate-50)', paddingTop: '12px' }}>
                                                <span style={{ fontSize: '13px', color: 'var(--slate-500)' }}>Creación:</span>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)' }} suppressHydrationWarning>
                                                    {new Date(agent.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <button 
                                                className="btn-premium" 
                                                onClick={() => setTestAgent(agent)}
                                                style={{ flex: 1.2, height: '42px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                            >
                                                <i className="bi bi-headset" style={{ fontSize: '16px' }}></i>
                                                Probar
                                            </button>
                                            <Link href={`/wizard?editId=${agent.id}`} style={{ flex: 1, height: '42px', fontSize: '13px', background: 'white', color: 'var(--slate-600)', border: '1px solid var(--slate-200)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none', fontWeight: 600 }}>
                                                <i className="bi bi-pencil" style={{ fontSize: '14px' }}></i>
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(agent.id, agent.name)}
                                                disabled={isDeletingId === agent.id}
                                                style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'white', color: '#ef4444', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                {isDeletingId === agent.id ? (
                                                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#ef4444', margin: 0 }} />
                                                ) : (
                                                    <i className="bi bi-trash" style={{ fontSize: '18px' }}></i>
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
                <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }} onClick={() => { if (callStatus === 'inactive') setTestAgent(null) }}>
                    <div className="card-premium" style={{ width: '100%', maxWidth: '480px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{testAgent.name}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>Prueba de agente por voz</p>
                            </div>
                            {callStatus === "inactive" && (
                                <button onClick={() => setTestAgent(null)} style={{ background: 'var(--slate-200)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--slate-600)' }}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>

                        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
                            <div className={`voice-waves ${callStatus === "active" ? "active" : ""}`} style={{ 
                                width: '100px', height: '100px', borderRadius: '50%', background: 'var(--slate-100)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px',
                                position: 'relative', fontSize: '40px', color: 'var(--azul)'
                            }}>
                                <i className="bi bi-mic-fill"></i>
                            </div>

                            {callError && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px',
                                    padding: '12px 16px', marginBottom: '24px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                                    fontSize: '13px', color: '#ef4444', fontWeight: 500, textAlign: 'left',
                                }}>
                                    <span>{callError}</span>
                                    <button onClick={() => setCallError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '18px' }}>×</button>
                                </div>
                            )}

                            <p style={{ color: 'var(--slate-600)', fontSize: '15px', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 32px' }}>
                                {callStatus === "inactive" ? "Pulsa el botón de abajo, autoriza el uso de tu micrófono y empieza a hablar con tu agente." :
                                    callStatus === "connecting" ? "Estableciendo conexión segura..." :
                                        "Escuchando y respondiendo..."}
                            </p>

                            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '16px', padding: '20px', textAlign: 'left', marginBottom: '32px' }}>
                                <div className="flex-center gap-8" style={{ marginBottom: '12px', color: '#9a3412', fontWeight: 700, fontSize: '13px' }}>
                                    <i className="bi bi-info-circle-fill"></i>
                                    NOTAS DE PRUEBA
                                </div>
                                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <li style={{ fontSize: '11px', color: '#c2410c', lineHeight: '1.5', display: 'flex', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', marginTop: '5px', flexShrink: 0 }}></div>
                                        <span><strong>Transferencias:</strong> Solo funcionan en llamadas reales desde un teléfono móvil.</span>
                                    </li>
                                    <li style={{ fontSize: '11px', color: '#c2410c', lineHeight: '1.5', display: 'flex', gap: '8px' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f97316', marginTop: '5px', flexShrink: 0 }}></div>
                                        <span><strong>Instrucciones:</strong> Puedes editarlas en el panel de edición si necesitas ajustar el comportamiento.</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                className="btn-premium"
                                onClick={toggleCall}
                                disabled={callStatus === "connecting"}
                                style={{ 
                                    width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', 
                                    background: callStatus === "inactive" ? '#10b981' : callStatus === "active" ? '#ef4444' : '#eab308'
                                }}
                            >
                                {callStatus === "inactive" ? (
                                    <><i className="bi bi-mic-fill"></i> Iniciar llamada</>
                                ) : callStatus === "active" ? (
                                    <><i className="bi bi-telephone-x-fill"></i> Finalizar llamada</>
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
