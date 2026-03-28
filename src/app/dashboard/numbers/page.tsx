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
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
                // First get clinic for this user
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



    const handleAssignAgent = async (numberId: string, phone: string, retellAgentId: string) => {
        setIsUpdatingId(numberId);
        try {
            const agentIdToAssign = retellAgentId === 'none' ? null : retellAgentId;

            const response = await fetch('/api/retell/phone-number/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number_id: numberId,
                    phone_number: phone,
                    agent_id: agentIdToAssign,
                    workspace_id: user?.workspace_id
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Error al asignar agente");

            const newList = numbers.map(n => n.id === numberId ? { ...n, agent_id: agentIdToAssign } : n);
            setNumbers(newList);
            setNotification({
                message: "Agente asignado correctamente. Ya puedes llamarle directamente desde este número de teléfono.",
                type: 'success'
            });
        } catch (error: unknown) {
            console.error("Error updating agent assignment:", error);
            setNotification({
                message: `Error: ${(error as Error).message || "No se pudo actualizar la asignación."}`,
                type: 'error'
            });
        } finally {
            setIsUpdatingId(null);
        }
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

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
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

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    <div className="notification-message">{notification.message}</div>
                </div>
            )}
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
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f8fafc;}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;height:64px;}
                .topbar-left h1{font-size:20px;font-weight:700;color:#1e293b;letter-spacing:-0.02em}
                .topbar-right{display:flex;align-items:center;gap:20px}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                
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
                
                .content{flex:1;padding:32px;max-width:1200px;margin:0 auto;width:100%}
                
                .card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);overflow:hidden}
                .card-intro{padding:24px 28px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;font-weight:500;}
                
                .numbers-table{width:100%;border-collapse:collapse}
                .numbers-table th{padding:12px 28px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;background:#fcfdfe;border-bottom:1px solid #f1f5f9;letter-spacing:0.05em}
                .numbers-table td{padding:16px 28px;border-bottom:1px solid #f8fafc;font-size:14px;color:#1e293b;vertical-align:middle}
                
                .phone-number{font-weight:700;color:#0f172a;font-size:15px;display:block}
                .phone-pretty{color:#94a3b8;font-size:12px;margin-top:2px;display:block}

                .agent-selector-wrapper { position: relative; width: 280px; }
                .agent-selector { 
                    appearance: none;
                    width: 100%;
                    padding: 9px 36px 9px 16px;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    font-size: 14px;
                    color: #475569;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    background-size: 14px;
                }
                .agent-selector:hover { border-color: #cbd5e1; }
                .agent-selector:focus { border-color: #267ab0; box-shadow: 0 0 0 3px rgba(38,122,176,0.1); outline: none; }

                .badge-status{padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;background:#dcfce7;color:#15803d;display:inline-flex;align-items:center;gap:6px}
                
                .btn-add{padding:9px 18px;background:#267ab0;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:8px}
                .btn-add:hover{background:#1e5a87;box-shadow:0 4px 12px rgba(38,122,176,0.15)}
                
                .btn-delete-row{width:36px;height:36px;border-radius:10px;border:1px solid #fee2e2;background:#fff;color:#ef4444;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;opacity: 0.8;}
                .btn-delete-row:hover{background:#fef2f2;border-color:#f87171;opacity: 1;}

                .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000}
                .modal-content{background:#fff;border-radius:16px;width:100%;max-width:400px;padding:32px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)}
                .modal-title{font-size:20px;font-weight:700;margin-bottom:24px}
                .help-link{color:#267ab0;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;display:flex;align-items:center;gap:4px;margin-bottom:12px;transition:all 0.2s;background:none;border:none;padding:0}
                .help-link:hover{text-decoration:underline;color:#1e5a87}
                .help-step{margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid #f3f4f6}
                .help-step:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none}
                .help-step-title{font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:8px;display:flex;align-items:center;gap:8px}
                .help-step-number{width:20px;height:20px;background:#267ab0;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px}
                .help-data-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
                .help-data-label{color:#6b7280}
                .help-data-value{font-family:monospace;background:#f3f4f6;padding:2px 6px;border-radius:4px;color:#1a1a1a}
                .form-group{margin-bottom:16px}
                .form-label{display:block;font-size:13px;font-weight:600;margin-bottom:8px;color:#4b5563}
                .form-input{width:100%;padding:10px 14px;border-radius:8px;border:1px solid #d1d5db;outline:none}
                .form-input:focus{border-color:#267ab0;box-shadow:0 0 0 2px rgba(38,122,176,0.1)}
                .modal-actions{display:flex;gap:12px;margin-top:24px}
                .btn-cancel{flex:1;padding:10px;border-radius:8px;background:#f3f4f6;border:none;font-weight:600;cursor:pointer}
                .btn-confirm{flex:1;padding:10px;border-radius:8px;background:#267ab0;color:#fff;border:none;font-weight:600;cursor:pointer}

                .notification-toast {
                    position: fixed;
                    top: 24px;
                    right: 32px;
                    padding: 16px 24px;
                    border-radius: 12px;
                    background: #fff;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 2000;
                    animation: toastSlideIn 0.3s ease-out;
                    max-width: 400px;
                }
                .notification-toast.success { border-left: 4px solid #16a34a; }
                .notification-toast.error { border-left: 4px solid #ef4444; }
                .notification-message { font-size: 14px; font-weight: 500; color: #1a1a1a; line-height: 1.5; }
                @keyframes toastSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            `}</style>

            <DashboardSidebar user={user} />

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Mis números</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="btn-add" onClick={() => setShowAddModal(true)}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Añadir número
                        </button>
                    </div>
                </header>

                <div className="content">
                    <div className="card">
                        <div className="card-intro">
                            Conecta tu número de netelip a la IA y luego asígnaselo a tu agente
                        </div>

                        {isLoading ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                <div className="spinner" style={{ marginBottom: '16px' }}></div>
                                Cargando telefonía...
                            </div>
                        ) : numbers.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                                <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📞</div>
                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>No hay números conectados</p>
                                <p style={{ fontSize: '14px', marginTop: '8px' }}>Empieza por añadir un número SIP de Netelip</p>
                            </div>
                        ) : (
                            <table className="numbers-table">
                                <thead>
                                    <tr>
                                        <th>Número de Teléfono</th>
                                        <th>Estado</th>
                                        <th>Agente IA Asignado</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {numbers.map(num => (
                                        <tr key={num.id}>
                                            <td>
                                                <span className="phone-number">{num.phone_number_pretty}</span>
                                                <span className="phone-pretty">{num.phone_number}</span>
                                            </td>
                                            <td>
                                                <span className="badge-status">
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                    </svg>
                                                    Conectado
                                                </span>
                                            </td>
                                            <td>
                                                <div className="agent-selector-wrapper">
                                                    <select
                                                        className="agent-selector"
                                                        value={num.agent_id || 'none'}
                                                        onChange={(e) => handleAssignAgent(num.id, num.phone_number, e.target.value)}
                                                        disabled={isUpdatingId === num.id}
                                                    >
                                                        <option value="none">Sin agente (Desactivado)</option>
                                                        {agents.map(agent => (
                                                            <option key={agent.id} value={agent.id}>
                                                                {agent.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button className="btn-delete-row" onClick={() => handleDeleteNumber(num.id, num.phone_number)} title="Borrar número">
                                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                        </svg>
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
                                style={{ padding: '12px 16px', fontSize: '14px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>URI de Terminación</label>
                            <input
                                className="form-input"
                                placeholder="Introduce la URI de terminación (NO la URI del servidor SIP de Retell)"
                                value={newNumber.termination_uri}
                                onChange={e => setNewNumber({ ...newNumber, termination_uri: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Nombre de Usuario del Trunk SIP</label>
                            <input
                                className="form-input"
                                placeholder="Introduce el nombre de usuario del Trunk SIP"
                                value={newNumber.username}
                                onChange={e => setNewNumber({ ...newNumber, username: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px' }}
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
                                style={{ padding: '12px 16px', fontSize: '14px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Apodo / Etiqueta <span style={{ color: '#6b7280', fontWeight: 400 }}>(Opcional)</span></label>
                            <input
                                className="form-input"
                                placeholder="Introduce un apodo para este número"
                                value={newNumber.nickname}
                                onChange={e => setNewNumber({ ...newNumber, nickname: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px' }}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                            <label className="form-label" style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>Transporte de salida</label>
                            <select
                                className="form-input"
                                value={newNumber.transport}
                                onChange={e => setNewNumber({ ...newNumber, transport: e.target.value })}
                                style={{ padding: '12px 16px', fontSize: '14px', background: '#f9fafb' }}
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
                            style={{ width: '100%', marginTop: '32px', padding: '14px' }}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
