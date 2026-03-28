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

export default function NumbersPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
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

            await loadData(); // Recargar todo desde Supabase para asegurar consistencia

            setNewNumber({ phone: '', nickname: '', termination_uri: '', username: '', password: '', transport: 'udp' });
            setShowAddModal(false);
            alert("¡Número SIP conectado con éxito!");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado";
            alert(`Error: ${errorMessage}`);
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
                // Fetch agents for the dropdown
                const { data: agentList } = await supabase
                    .from('agents')
                    .select('id, name, retell_agent_id')
                    .eq('workspace_id', currentWorkspaceId);
                setAgents(agentList ?? []);

                // Fetch real phone numbers from Supabase
                const { data: numData, error: numError } = await supabase
                    .from('phone_numbers')
                    .select('*')
                    .eq('workspace_id', currentWorkspaceId);

                if (numError) throw numError;
                setNumbers(numData ?? []);
                const { data: clinicData } = await supabase
                    .from('clinics')
                    .select('id')
                    .eq('user_id', session.user.id);

                const clinicIds = clinicData?.map(c => c.id) || [];

                if (clinicIds.length > 0) {
                    const { data: phoneData } = await supabase
                        .from('phone_numbers')
                        .select('id, phone_number, nickname, assigned_inbound_agent_id')
                        .in('clinic_id', clinicIds);

                    if (phoneData) {
                        setNumbers(phoneData.map(n => ({
                            id: n.id,
                            phone_number: n.phone_number,
                            phone_number_pretty: n.phone_number,
                            nickname: n.nickname,
                            agent_id: n.assigned_inbound_agent_id,
                            retell_agent_id: null // Will be resolved if needed, but we use agent_id for selector
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
                message: "Número eliminado correctamente de Retell y de la base de datos.",
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


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // setIsDropdownOpen(false); // Removed as it's unused
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-message">{notification.message}</div>
                </div>
            )}
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#fff;color:#1e293b}
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#fff;}
                .topbar{background:#fff;padding:40px 48px 24px;display:flex;justify-content:space-between;align-items:center;z-index:50;}
                .topbar-left h1{font-size:28px;font-weight:800;color:#0f172a;letter-spacing:-0.03em}
                
                .content{flex:1;padding:0 48px 48px;width:100%}
                
                .table-container{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 1px 2px rgba(0,0,0,0.03);overflow:hidden}
                
                .numbers-table{width:100%;border-collapse:collapse}
                .numbers-table th{padding:16px 24px;text-align:left;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;background:#fff;border-bottom:1px solid #f1f5f9;letter-spacing:0.05em}
                .numbers-table td{padding:20px 24px;border-bottom:1px solid #f8fafc;font-size:14px;color:#475569;vertical-align:middle}
                .numbers-table tr:last-child td{border-bottom:none}
                
                .status-connected{
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    background: #f0fdf4;
                    color: #16a34a;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    border: 1px solid #dcfce7;
                }
                .status-dot{width:6px;height:6px;border-radius:50%;background:#16a34a}

                .phone-link{font-weight:700;color:#0f172a;text-decoration:none;display:flex;align-items:center;gap:8px}
                .phone-link:hover{color:#267ab0}

                .agent-tag{
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: #f8fafc;
                    color: #475569;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    border: 1px solid #e2e8f0;
                }

                .btn-buy{
                    padding:10px 20px;
                    background:#267ab0;
                    color:#fff;
                    border:none;
                    border-radius:12px;
                    font-size:14px;
                    font-weight:700;
                    cursor:pointer;
                    transition:all 0.2s;
                    display:flex;
                    align-items:center;
                    gap:8px;
                    box-shadow: 0 4px 12px rgba(38, 122, 176, 0.2);
                }
                .btn-buy:hover{background:#1e5a87;transform:translateY(-1px);box-shadow: 0 6px 16px rgba(38, 122, 176, 0.25)}
                
                .action-btn{
                    width:36px;
                    height:36px;
                    border-radius:10px;
                    border:1px solid #f1f5f9;
                    background:#fff;
                    color:#64748b;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    cursor:pointer;
                    transition:all .2s;
                }
                .action-btn:hover{background:#f8fafc;color:#0f172a;border-color:#e2e8f0}
                .action-btn.delete:hover{background:#fef2f2;color:#ef4444;border-color:#fee2e2}

                .modal-overlay{position:fixed;inset:0;background:rgba(15, 23, 42, 0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000}
                .modal-content{background:#fff;border-radius:24px;width:100%;max-width:500px;padding:40px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15)}
                
                .notification-toast {
                    position: fixed;
                    left: 50%;
                    transform: translateX(-50%);
                    bottom: 32px;
                    padding: 16px 32px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 10000;
                    font-weight: 600;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                }
                .notification-toast.success { background: #10b981; color: white; }
                .notification-toast.error { background: #ef4444; color: white; }

                /* ===== SIDEBAR ===== */
                .nav-icon {
                  width: 20px;
                  height: 20px;
                  flex-shrink: 0;
                }
                
                .sidebar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    width: 250px;
                    background: white;
                    border-right: 1px solid #f1f5f9;
                    z-index: 2000;
                    display: flex;
                    flex-direction: column;
                }

                .help-link{
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    padding: 12px 16px;
                    border-radius: 12px;
                    color: #475569;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 24px;
                    transition: all 0.2s;
                    width: 100%;
                }
                .help-link:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                
                .help-step { margin-bottom: 24px; }
                .help-step-title { display: flex; align-items: center; gap: 10px; color: #0f172a; font-weight: 700; font-size: 15px; margin-bottom: 12px; }
                .help-step-number { width: 22px; height: 22px; background: #267ab0; color: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
                .help-data-row { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 10px; border: 1px solid #f1f5f9; margin-bottom: 6px; }
                .help-data-label { color: #64748b; font-size: 13px; font-weight: 500; }
                .help-data-value { color: #0f172a; font-size: 13px; font-weight: 700; }

                .form-input {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    width: 100%;
                    transition: all 0.2s;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #267ab0;
                    box-shadow: 0 0 0 4px rgba(38,122,176,0.1);
                }
            `}</style>

            <DashboardSidebar user={user} />

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Mis números</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="btn-buy" onClick={() => setShowAddModal(true)}>
                            <i className="bi bi-plus-lg" style={{ fontSize: '16px' }} />
                            Añadir número
                        </button>
                    </div>
                </header>

                <div className="content">
                    <div className="table-container">
                        {isLoading ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                                <p style={{ color: '#94a3b8', fontWeight: 600 }}>Cargando números...</p>
                            </div>
                        ) : numbers.length === 0 ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}>
                                <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <i className="bi bi-telephone text-[#94a3b8]" style={{ fontSize: '32px' }} />
                                </div>
                                <p style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>No hay números configurados</p>
                                <p style={{ fontSize: '14px', color: '#64748b', marginTop: '8px', marginBottom: '32px' }}>Añade tu primer número SIP para empezar a recibir llamadas.</p>
                                <button className="btn-buy" onClick={() => setShowAddModal(true)} style={{ margin: '0 auto' }}>
                                    Configurar primer número
                                </button>
                            </div>
                        ) : (
                            <table className="numbers-table">
                                <thead>
                                    <tr>
                                        <th>Estado</th>
                                        <th>Número</th>
                                        <th>Agente</th>
                                        <th>Última llamada</th>
                                        <th>Cantidad</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {numbers.map(num => (
                                        <tr key={num.id}>
                                            <td>
                                                <div className="status-connected">
                                                    <div className="status-dot"></div>
                                                    Conectado
                                                </div>
                                            </td>
                                            <td>
                                                <a href="#" className="phone-link">
                                                    <i className="bi bi-telephone" style={{ color: '#94a3b8' }} />
                                                    {num.phone_number_pretty || num.phone_number}
                                                </a>
                                            </td>
                                            <td>
                                                {num.agent_id ? (
                                                    <div className="agent-tag">
                                                        <i className="bi bi-robot" />
                                                        {agents.find(a => a.id === num.agent_id)?.name || 'Agente asignado'}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Sin asignar</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{ color: '#64748b', fontSize: '13px' }}>Hoy, 12:30</span>
                                            </td>
                                            <td>
                                                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>124</span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button className="action-btn" title="Editar configuración">
                                                        <i className="bi bi-pencil-square" />
                                                    </button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteNumber(num.id, num.phone_number)} title="Eliminar número">
                                                        <i className="bi bi-trash3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal Añadir Número - SIP TRUNKING COMPLETO */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '40px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '22px' }}>Conectar número vía SIP trunking</h3>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#9ca3af' }}>&times;</button>
                        </div>

                        <button
                            className="help-link"
                            onClick={() => setShowHelpModal(true)}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Ver manual de configuración de Netelip
                        </button>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Número de Teléfono</label>
                            <input
                                className="form-input"
                                placeholder="Introduce el número de teléfono (E.164)"
                                value={newNumber.phone}
                                onChange={e => setNewNumber({ ...newNumber, phone: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>URI de Terminación</label>
                            <input
                                className="form-input"
                                placeholder="Introduce la URI de terminación (NO la URI del servidor SIP de Retell)"
                                value={newNumber.termination_uri}
                                onChange={e => setNewNumber({ ...newNumber, termination_uri: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Nombre de Usuario del Trunk SIP</label>
                            <input
                                className="form-input"
                                placeholder="Introduce el nombre de usuario del Trunk SIP"
                                value={newNumber.username}
                                onChange={e => setNewNumber({ ...newNumber, username: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Contraseña del Trunk SIP</label>
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Introduce la contraseña del Trunk SIP"
                                value={newNumber.password}
                                onChange={e => setNewNumber({ ...newNumber, password: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Apodo / Etiqueta <span style={{ color: '#6b7280', fontWeight: 400 }}>(Opcional)</span></label>
                            <input
                                className="form-input"
                                placeholder="Introduce un apodo para este número"
                                value={newNumber.nickname}
                                onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', width: '100%' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Transporte de salida</label>
                            <select
                                className="form-input"
                                value={newNumber.transport}
                                onChange={e => setNewNumber({ ...newNumber, transport: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', background: '#f9fafb', width: '100%' }}
                            >
                                <option value="tcp">TCP</option>
                                <option value="udp">UDP (Recomendado)</option>
                                <option value="tls">TLS (Seguro)</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => setShowAddModal(false)}
                                style={{ background: '#f3f4f6', color: '#4b5563', padding: '12px 24px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                className="btn-confirm"
                                onClick={handleAddNumber}
                                disabled={isSaving}
                                style={{ background: '#267ab0', color: '#fff', padding: '12px 32px', borderRadius: '10px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px rgba(38,122,176,0.2)' }}
                            >
                                {isSaving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ayuda Netelip */}
            {showHelpModal && (
                <div className="modal-overlay" onClick={() => setShowHelpModal(false)} style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ maxWidth: '540px', padding: '40px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>Guía de Configuración Netelip</h3>
                            <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#9ca3af' }}>&times;</button>
                        </div>

                        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                            <div className="help-step">
                                <div className="help-step-title">
                                    <span className="help-step-number">1</span>
                                    Llamadas Salientes (en este panel)
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Introduce estos datos en el formulario anterior:</p>
                                <div className="help-data-row">
                                    <span className="help-data-label">Termination URI</span>
                                    <span className="help-data-value">retellai.netelip.com</span>
                                </div>
                                <div className="help-data-row">
                                    <span className="help-data-label">SIP Username</span>
                                    <span className="help-data-value">Tu número de Netelip</span>
                                </div>
                                <div className="help-data-row">
                                    <span className="help-data-label">Outbound Transport</span>
                                    <span className="help-data-value">UDP</span>
                                </div>
                            </div>

                            <div className="help-step">
                                <div className="help-step-title">
                                    <span className="help-step-number">2</span>
                                    Llamadas Entrantes (en Panel Netelip)
                                </div>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>Accede a tu panel de Netelip y configura el desvío SIP del número:</p>
                                <div className="help-data-row">
                                    <span className="help-data-label">Servidor SIP</span>
                                    <span className="help-data-value">5t4n6j0wnrl.sip.livekit.cloud</span>
                                </div>
                                <div className="help-data-row" style={{ marginTop: '4px' }}>
                                    <span className="help-data-label">Añadir &quot;+&quot; al número E.164</span>
                                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Activar</span>
                                </div>
                                <div className="help-data-row">
                                    <span className="help-data-label">Habilitar desvío</span>
                                    <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>Activar</span>
                                </div>
                            </div>

                            <div style={{ background: '#eff6fb', padding: '16px', borderRadius: '12px', border: '1px solid #dbeafe', marginTop: '8px' }}>
                                <p style={{ fontSize: '12px', color: '#267ab0', lineHeight: 1.5 }}>
                                    <strong>Nota:</strong> Tu usuario y contraseña SIP los encontrarás en <strong>Línea SIP - Configurador de dispositivos</strong> dentro de tu panel de Netelip.
                                </p>
                            </div>
                        </div>

                        <button
                            className="btn-confirm"
                            onClick={() => setShowHelpModal(false)}
                            style={{ width: '100%', marginTop: '32px', padding: '14px', background: '#267ab0', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
