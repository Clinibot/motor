"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface PhoneNumber {
    id: string;
    phone_number: string;
    phone_number_pretty: string;
    agent_id: string | null;
    retell_agent_id: string | null; // For info only
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

import DashboardTopbar from '../../../components/DashboardTopbar';

export default function NumbersPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [newNumber, setNewNumber] = useState({
        phone: '',
        nickname: '',
        termination_uri: '',
        username: '',
        password: '',
        transport: 'udp'
    });

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 6000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleCreateAgent = (e: React.MouseEvent) => {
        e.preventDefault();
        router.push('/wizard');
    };

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleAddNumber = async () => {
        if (!newNumber.phone || !newNumber.termination_uri || !newNumber.username || !newNumber.password) {
            alert("Por favor, rellena todos los campos (Teléfono, URI, Usuario y Contraseña). Son necesarios para las transferencias.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/retell/phone-number/sip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone_number: newNumber.phone,
                    termination_uri: newNumber.termination_uri,
                    sip_trunk_username: newNumber.username,
                    sip_trunk_password: newNumber.password,
                    nickname: newNumber.nickname,
                    outbound_transport: newNumber.transport,
                    workspace_id: user?.workspace_id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error al registrar el número");

            await loadData();

            setNewNumber({ phone: '', nickname: '', termination_uri: '', username: '', password: '', transport: 'udp' });
            setShowAddModal(false);
            setNotification({ message: "¡Número SIP conectado con éxito!", type: 'success' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado";
            setNotification({ message: `Error: ${errorMessage}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
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

            const currentWorkspaceId = profile?.workspace_id;
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user', workspace_id: currentWorkspaceId });

            if (currentWorkspaceId) {
                const { data: agentList } = await supabase
                    .from('agents')
                    .select('id, name, retell_agent_id')
                    .eq('workspace_id', currentWorkspaceId);
                setAgents(agentList ?? []);

                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('id')
                    .eq('user_id', session.user.id);

                const clinicIds = clinicData?.map(c => c.id) || [];

                if (clinicIds.length > 0) {
                    const { data: phoneData, error: phoneError } = await supabase
                        .from('phone_numbers')
                        .select('id, phone_number, nickname, assigned_inbound_agent_id')
                        .in('clinic_id', clinicIds);

                    if (phoneError) throw phoneError;

                    if (phoneData) {
                        setNumbers(phoneData.map(n => ({
                            id: n.id,
                            phone_number: n.phone_number,
                            phone_number_pretty: n.phone_number,
                            nickname: n.nickname,
                            agent_id: n.assigned_inbound_agent_id,
                            retell_agent_id: null
                        })));
                    }
                } else {
                    setNumbers([]);
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDeleteNumber = async (id: string, phone: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar el número ${phone}? Esta acción es irreversible.`)) return;

        try {
            const response = await fetch('/api/retell/phone-number/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number_id: id,
                    phone_number: phone,
                    workspace_id: user?.workspace_id
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Error al eliminar el número");
            }

            const newList = numbers.filter(n => n.id !== id);
            setNumbers(newList);
            setNotification({
                message: "Número eliminado correctamente.",
                type: 'success'
            });
        } catch (error: unknown) {
            console.error("Error deleting number:", error);
            setNotification({
                message: `Error: ${(error as Error).message || "No se pudo eliminar el número."}`,
                type: 'error'
            });
        }
    };

    const handleAgentChange = async (numberId: string, phoneNumber: string, agentId: string) => {
        try {
            const response = await fetch('/api/retell/phone-number/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number_id: numberId,
                    phone_number: phoneNumber,
                    agent_id: agentId,
                    workspace_id: user?.workspace_id
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Error al asignar el agente");
            }

            setNumbers(prev => prev.map(n => n.id === numberId ? { ...n, agent_id: agentId === 'none' ? null : agentId } : n));
            setNotification({
                message: "Agente asignado correctamente.",
                type: 'success'
            });
        } catch (error: unknown) {
            console.error("Error assigning agent:", error);
            setNotification({
                message: `Error: ${(error as Error).message || "No se pudo asignar el agente."}`,
                type: 'error'
            });
        }
    };

    return (
        <div className="app">
            {notification && (
                <div className={`notification-toast ${notification.type}`} style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 2000, padding: '16px 24px', borderRadius: '12px', color: 'white',
                    background: notification.type === 'success' ? '#10b981' : '#ef4444',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600
                }}>
                    <div className="flex-center gap-8">
                        <i className={`bi bi-${notification.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                        {notification.message}
                    </div>
                </div>
            )}

            <DashboardSidebar user={user} />

            <main className="main">
                <DashboardTopbar
                    title="Mis números"
                    user={user}
                    isAlertPanelOpen={false}
                    setIsAlertPanelOpen={() => {}}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleCreateAgent={handleCreateAgent}
                    handleLogout={handleLogout}
                    dropdownRef={dropdownRef}
                />

                <div className="content">
                    <div className="numbers-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid var(--slate-100)', borderRadius: '24px', padding: '24px 32px', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Conexión SIP Trunking</h2>
                            <p style={{ color: 'var(--slate-500)', fontSize: '14px', margin: 0, fontWeight: 500 }}>Conecta tu infraestructura de netelip para habilitar transferencias inteligentes.</p>
                        </div>
                        <button onClick={() => setShowAddModal(true)} className="btn-p" style={{ height: '48px', padding: '0 24px', borderRadius: '14px', fontWeight: 800 }}>
                            <i className="bi bi-plus-lg" style={{ marginRight: '10px' }}></i>
                            <span>Añadir número</span>
                        </button>
                    </div>

                    <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                        {isLoading ? (
                            <div style={{ padding: '80px', textAlign: 'center' }}>
                                <div className="spinner" style={{ border: '3px solid var(--slate-100)', borderTop: '3px solid var(--azul)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
                                <p style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Cargando números...</p>
                            </div>
                        ) : numbers.length === 0 ? (
                            <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', background: 'var(--slate-50)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--slate-300)', fontSize: '32px' }}>
                                    <i className="bi bi-telephone" />
                                </div>
                                <h3 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>No hay números configurados</h3>
                                <p style={{ fontSize: '14px', color: 'var(--slate-500)', maxWidth: '400px', margin: '0 auto 32px' }}>Añade tu primer número SIP de Netelip para que tus agentes puedan realizar transferencias.</p>
                                <button className="btn-premium" onClick={() => setShowAddModal(true)} style={{ margin: '0 auto' }}>
                                    <i className="bi bi-plus-lg"></i>
                                    Configurar primer número
                                </button>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Número de Teléfono</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agente IA Asignado</th>
                                            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {numbers.map(num => (
                                            <tr key={num.id} style={{ borderBottom: '1px solid var(--slate-50)' }} className="table-row-hover">
                                                <td style={{ padding: '20px 24px' }}>
                                                    <span className="number-title-v2">{num.phone_number_pretty || num.phone_number}</span>
                                                    <span className="number-subtitle-v2">{num.nickname || num.phone_number}</span>
                                                </td>
                                                <td style={{ padding: '20px 24px' }}>
                                                    <span className="badge-pill active">
                                                        <span className="dot" style={{ background: 'var(--exito)' }}></span>
                                                        Conectado
                                                    </span>
                                                </td>
                                                <td style={{ padding: '20px 24px' }}>
                                                    <select 
                                                        className="agent-select-v2"
                                                        value={num.agent_id || 'none'}
                                                        onChange={(e) => handleAgentChange(num.id, num.phone_number, e.target.value)}
                                                    >
                                                        <option value="none">Sin asignar</option>
                                                        {agents.map(agent => (
                                                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                                    <div className="flex-center gap-8" style={{ justifyContent: 'flex-end' }}>
                                                        <button 
                                                            className="btn-s" 
                                                            style={{ padding: '8px', width: '36px', height: '36px', justifyContent: 'center' }}
                                                            title="Configuración"
                                                        >
                                                            <i className="bi bi-pencil-square" style={{ fontSize: '16px' }}></i>
                                                        </button>
                                                        <button 
                                                            className="btn-s" 
                                                            style={{ padding: '8px', width: '36px', height: '36px', justifyContent: 'center', color: 'var(--error)', borderColor: '#fee2e2' }}
                                                            onClick={() => handleDeleteNumber(num.id, num.phone_number)}
                                                            title="Eliminar"
                                                        >
                                                            <i className="bi bi-trash3" style={{ fontSize: '16px' }}></i>
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
                </div>
            </main>

            {/* Modal Añadir Número - SIP TRUNKING */}
            {showAddModal && (
                <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 1000 }} onClick={() => setShowAddModal(false)}>
                    <div className="card-premium" style={{ width: '100%', maxWidth: '540px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Conectar número SIP</h3>
                                <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>Conexión directa con Netelip</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'var(--slate-200)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--slate-600)' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div style={{ padding: '32px', maxHeight: '75vh', overflowY: 'auto' }}>
                            <button
                                onClick={() => setShowHelpModal(true)}
                                style={{ 
                                    width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--azul)', color: 'white',
                                    border: 'none', fontWeight: 700, fontSize: '13px', marginBottom: '24px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(38,122,176,0.3)'
                                }}
                            >
                                <i className="bi bi-book"></i>
                                Guía de Configuración de Netelip
                            </button>

                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>Número de Teléfono (E.164)</label>
                                    <input
                                        type="text"
                                        placeholder="+34912345678"
                                        value={newNumber.phone}
                                        onChange={e => setNewNumber({ ...newNumber, phone: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>URI de Terminación</label>
                                    <input
                                        type="text"
                                        placeholder="retellai.netelip.com"
                                        value={newNumber.termination_uri}
                                        onChange={e => setNewNumber({ ...newNumber, termination_uri: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>Usuario SIP</label>
                                        <input
                                            type="text"
                                            value={newNumber.username}
                                            onChange={e => setNewNumber({ ...newNumber, username: e.target.value })}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>Contraseña</label>
                                        <input
                                            type="password"
                                            value={newNumber.password}
                                            onChange={e => setNewNumber({ ...newNumber, password: e.target.value })}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>Etiqueta (Opcional)</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Número de Ventas"
                                        value={newNumber.nickname}
                                        onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '6px', textTransform: 'uppercase' }}>Protocolo de Transporte</label>
                                    <select
                                        value={newNumber.transport}
                                        onChange={e => setNewNumber({ ...newNumber, transport: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--slate-200)', fontSize: '14px', background: 'white', outline: 'none' }}
                                    >
                                        <option value="udp">UDP (Recomendado)</option>
                                        <option value="tcp">TCP</option>
                                        <option value="tls">TLS (Seguro)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'var(--slate-100)', color: 'var(--slate-600)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddNumber}
                                    disabled={isSaving}
                                    style={{ flex: 2, padding: '14px', borderRadius: '12px', background: 'var(--azul)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {isSaving ? 'Guardando...' : 'Conectar Número'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ayuda */}
            {showHelpModal && (
                <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', zIndex: 1100 }} onClick={() => setShowHelpModal(false)}>
                    <div className="card-premium" style={{ width: '100%', maxWidth: '500px', padding: '32px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                            <div style={{ width: '60px', height: '60px', background: '#f0f9ff', color: 'var(--azul)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
                                <i className="bi bi-info-circle-fill"></i>
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Guía de Configuración</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '10px' }}>PASO 1: EN ESTE PANEL</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="flex-between"><span style={{ fontSize: '13px', color: 'var(--slate-600)' }}>Termination URI:</span> <code style={{ fontSize: '13px', fontWeight: 700 }}>retellai.netelip.com</code></div>
                                    <div className="flex-between"><span style={{ fontSize: '13px', color: 'var(--slate-600)' }}>Transporte:</span> <code style={{ fontSize: '13px', fontWeight: 700 }}>UDP</code></div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--slate-50)', padding: '16px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', marginBottom: '10px' }}>PASO 2: PANEL NETELIP</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div className="flex-between"><span style={{ fontSize: '13px', color: 'var(--slate-600)' }}>Servidor SIP:</span> <code style={{ fontSize: '12px', fontWeight: 700 }}>...sip.livekit.cloud</code></div>
                                    <div className="flex-between"><span style={{ fontSize: '13px', color: 'var(--slate-600)' }}>E.164 (+):</span> <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>ACTIVADO</span></div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowHelpModal(false)}
                            style={{ width: '100%', marginTop: '32px', padding: '14px', borderRadius: '12px', background: 'var(--azul)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Lo tengo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
