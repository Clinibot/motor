"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useWizardStore } from '../../../store/wizardStore';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface PhoneNumber {
    id: string;
    phone_number: string;
    phone_number_pretty: string;
    agent_id: string | null;
    retell_agent_id: string | null; // For info only
    nickname: string | null;
    sip_username: string | null;
    sip_password: string | null;
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
    const { resetWizard } = useWizardStore();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [savingNumberId, setSavingNumberId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null);
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
        resetWizard();
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
            setEditingNumber(null);
            setShowAddModal(false);
            setNotification({ message: editingNumber ? "¡Número SIP actualizado con éxito!" : "¡Número SIP conectado con éxito!", type: 'success' });
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
                        .select('id, phone_number, nickname, assigned_inbound_agent_id, sip_username, sip_password')
                        .in('clinic_id', clinicIds);

                    if (phoneError) throw phoneError;

                    if (phoneData) {
                        setNumbers(phoneData.map(n => ({
                            id: n.id,
                            phone_number: n.phone_number,
                            phone_number_pretty: n.phone_number,
                            nickname: n.nickname,
                            agent_id: n.assigned_inbound_agent_id,
                            retell_agent_id: null,
                            sip_username: n.sip_username || null,
                            sip_password: n.sip_password || null,
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

    const handleEditClick = (num: PhoneNumber) => {
        setEditingNumber(num);
        setNewNumber({
            phone: num.phone_number,
            nickname: num.nickname || '',
            termination_uri: '',
            username: num.sip_username || '',
            password: num.sip_password || '',
            transport: 'udp'
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingNumber(null);
        setNewNumber({ phone: '', nickname: '', termination_uri: '', username: '', password: '', transport: 'udp' });
    };

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
        setSavingNumberId(numberId);
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
        } finally {
            setSavingNumberId(null);
        }
    };

    return (
        <div className="app">
            {/* Toast notification */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 2000, padding: '14px 24px', borderRadius: '10px', color: 'white',
                    background: notification.type === 'success' ? 'var(--exito)' : 'var(--error)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 600, fontSize: '13px',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <i className={`bi bi-${notification.type === 'success' ? 'check-circle' : 'exclamation-circle'}`}></i>
                    {notification.message}
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
                    {/* Main table card */}
                    <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                        {/* Card header */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gris-borde)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--gris-texto)' }}>Conecta tu número de netelip a la IA y luego asígnaselo a tu agente</span>
                            <button className="btn-p" onClick={() => setShowAddModal(true)} style={{ whiteSpace: 'nowrap', gap: '6px', fontSize: '13px', padding: '8px 16px' }}>
                                <i className="bi bi-plus-lg"></i> Añadir número
                            </button>
                        </div>

                        {/* Table */}
                        {isLoading ? (
                            <div style={{ padding: '60px', textAlign: 'center' }}>
                                <div style={{ border: '3px solid var(--gris-borde)', borderTop: '3px solid var(--azul)', borderRadius: '50%', width: '36px', height: '36px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
                                <p style={{ color: 'var(--gris-texto)', fontSize: '13px' }}>Cargando números...</p>
                            </div>
                        ) : numbers.length === 0 ? (
                            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                                <i className="bi bi-telephone" style={{ fontSize: '32px', color: 'var(--gris-borde)', display: 'block', marginBottom: '16px' }}></i>
                                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>No hay números configurados</div>
                                <p style={{ fontSize: '13px', color: 'var(--gris-texto)', maxWidth: '360px', margin: '0 auto 24px' }}>Añade tu primer número SIP de netelip para que tus agentes puedan realizar transferencias.</p>
                                <button className="btn-p" onClick={() => setShowAddModal(true)}>
                                    <i className="bi bi-plus-lg"></i> Añadir número
                                </button>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--gris-bg)' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-texto)' }}>Número de teléfono</th>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-texto)' }}>Estado</th>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-texto)' }}>Agente IA asignado</th>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--gris-texto)' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {numbers.map(num => (
                                        <tr key={num.id} style={{ borderTop: '1px solid var(--gris-borde)' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: 600 }}>{num.phone_number_pretty || num.phone_number}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{num.nickname || num.phone_number}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: '#dcfce7', color: '#16a34a', padding: '4px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 700 }}>✓ Conectado</span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <select
                                                        className="inp sel"
                                                        style={{ width: '220px', fontSize: '13px', padding: '7px 36px 7px 12px', opacity: savingNumberId === num.id ? 0.5 : 1 }}
                                                        value={num.agent_id || 'none'}
                                                        disabled={savingNumberId === num.id}
                                                        onChange={(e) => handleAgentChange(num.id, num.phone_number, e.target.value)}
                                                    >
                                                        <option value="none">Sin agente (Desactivado)</option>
                                                        {agents.map(agent => (
                                                            <option key={agent.id} value={agent.id}>{agent.name}</option>
                                                        ))}
                                                    </select>
                                                    {savingNumberId === num.id && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--azul)', whiteSpace: 'nowrap' }}>
                                                            <i className="bi bi-telephone-fill" style={{ animation: 'pulse 1s ease-in-out infinite' }}></i>
                                                            Asignando…
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', display: 'flex', gap: '6px' }}>
                                                <button className="btn-s" onClick={() => handleEditClick(num)} style={{ padding: '6px 10px' }} title="Editar número">
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                                <button className="btn-s" style={{ color: 'var(--error)', borderColor: '#fecaca', padding: '6px 10px' }} onClick={() => handleDeleteNumber(num.id, num.phone_number)} title="Eliminar número">
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL GUÍA NETELIP */}
            {showHelpModal && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,.45)', zIndex: 700 }} onClick={() => setShowHelpModal(false)}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '520px', maxWidth: '90vw', position: 'relative', maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowHelpModal(false)} style={{ position: 'absolute', top: '16px', right: '20px', border: 'none', background: 'none', fontSize: '22px', color: 'var(--gris-texto)', cursor: 'pointer' }}>×</button>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px' }}>Guía de Configuración netelip</h2>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>1</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Llamadas Salientes (en este panel)</div>
                                <div style={{ fontSize: '13px', color: 'var(--gris-texto)', marginBottom: '12px' }}>Introduce estos datos en el formulario anterior:</div>
                                <div style={{ background: 'var(--gris-bg)', borderRadius: 'var(--r-md)', padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>Termination URI</span><code style={{ background: 'white', border: '1px solid var(--gris-borde)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>retellai.netelip.com</code></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>SIP Username</span><code style={{ background: 'white', border: '1px solid var(--gris-borde)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>Tu número de netelip</code></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>Outbound Transport</span><code style={{ background: 'white', border: '1px solid var(--gris-borde)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px' }}>UDP</code></div>
                                </div>
                            </div>
                        </div>

                        <hr className="divider" />

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--azul)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0 }}>2</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Llamadas Entrantes (en Panel netelip)</div>
                                <div style={{ fontSize: '13px', color: 'var(--gris-texto)', marginBottom: '12px' }}>Accede a tu panel de netelip y configura el desvío SIP del número:</div>
                                <div style={{ background: 'var(--gris-bg)', borderRadius: 'var(--r-md)', padding: '14px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>Servidor SIP</span><code style={{ background: 'white', border: '1px solid var(--gris-borde)', padding: '3px 10px', borderRadius: '6px', fontSize: '11px' }}>5t4n6j0wnrl.sip.livekit.cloud</code></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>Añadir &quot;+&quot; al número E.164</span><span style={{ fontWeight: 700, color: 'var(--exito)' }}>Activar</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: 'var(--gris-texto)' }}>Habilitar desvío</span><span style={{ fontWeight: 700, color: 'var(--exito)' }}>Activar</span></div>
                                </div>
                                <div style={{ background: '#eff6fb', border: '1px solid #bee3f8', borderRadius: 'var(--r-md)', padding: '12px 14px', marginTop: '12px', fontSize: '12px', color: '#1e4d7a', lineHeight: 1.6 }}>
                                    <strong>Nota:</strong> Tu usuario y contraseña SIP los encontrarás en <strong style={{ color: 'var(--azul)' }}>Línea SIP — Configurador de dispositivos</strong> dentro de tu panel de netelip.
                                </div>
                            </div>
                        </div>

                        <button onClick={() => setShowHelpModal(false)} className="btn-p" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px' }}>Entendido</button>
                    </div>
                </div>
            )}

            {/* MODAL FORMULARIO SIP */}
            {showAddModal && (
                <div className="modal-overlay" style={{ background: 'rgba(0,0,0,.45)', zIndex: 600 }} onClick={handleCloseModal}>
                    <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '560px', maxWidth: '92vw', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <button onClick={handleCloseModal} style={{ position: 'absolute', top: '16px', right: '20px', border: 'none', background: 'none', fontSize: '22px', color: 'var(--gris-texto)', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
                            {editingNumber ? 'Editar número SIP' : 'Conectar número vía SIP trunking'}
                        </h3>
                        <a href="#" onClick={(e) => { e.preventDefault(); handleCloseModal(); setShowHelpModal(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--azul)', fontWeight: 600, textDecoration: 'none', marginBottom: '22px' }}>
                            <i className="bi bi-exclamation-triangle" style={{ color: '#d97706' }}></i> Ver manual de configuración de netelip
                        </a>

                        <div className="fg">
                            <label className="lbl">Número de Teléfono <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input className="inp" placeholder="Introduce el número de teléfono (E.164)" value={newNumber.phone} onChange={e => setNewNumber({ ...newNumber, phone: e.target.value })} disabled={!!editingNumber} style={editingNumber ? { background: 'var(--gris-bg)', color: 'var(--gris-texto)' } : {}} />
                        </div>
                        <div className="fg">
                            <label className="lbl">URI de Terminación <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input className="inp" placeholder="Introduce la URI de terminación (NO la URI del servidor SIP de Retell)" value={newNumber.termination_uri} onChange={e => setNewNumber({ ...newNumber, termination_uri: e.target.value })} />
                        </div>
                        <div className="fg">
                            <label className="lbl">Nombre de Usuario del Trunk SIP <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input className="inp" placeholder="netelip@centrodemando.es" value={newNumber.username} onChange={e => setNewNumber({ ...newNumber, username: e.target.value })} />
                        </div>
                        <div className="fg">
                            <label className="lbl">Contraseña del Trunk SIP <span style={{ color: 'var(--error)' }}>*</span></label>
                            <input className="inp" type="password" placeholder="••••••••••••" value={newNumber.password} onChange={e => setNewNumber({ ...newNumber, password: e.target.value })} />
                        </div>
                        <div className="fg">
                            <label className="lbl">Apodo / Etiqueta <span style={{ color: 'var(--gris-texto)', fontWeight: 400, fontSize: '12px' }}>(Opcional)</span></label>
                            <input className="inp" placeholder="Introduce un apodo para este número" value={newNumber.nickname} onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })} />
                        </div>
                        <div className="fg">
                            <label className="lbl">Transporte de salida</label>
                            <div style={{ background: 'var(--gris-bg)', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>UDP</span>
                                <span style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Recomendado por netelip</span>
                            </div>
                            <div className="hint">El protocolo UDP es el estándar recomendado para la telefonía SIP con netelip.</div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button className="btn-s" onClick={handleCloseModal} style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                            <button className="btn-p" onClick={handleAddNumber} disabled={isSaving} style={{ flex: 2, justifyContent: 'center' }}>
                                {isSaving ? 'Guardando...' : (editingNumber ? 'Actualizar' : 'Guardar')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
