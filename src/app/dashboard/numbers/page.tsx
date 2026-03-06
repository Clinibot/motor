"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

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
        transport: 'tcp'
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

            setNewNumber({ phone: '', nickname: '', termination_uri: '', username: '', password: '', transport: 'tcp' });
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

    const handleDeleteNumber = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este número?')) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('phone_numbers')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const newList = numbers.filter(n => n.id !== id);
            setNumbers(newList);
        } catch (error) {
            console.error("Error deleting number:", error);
            alert("No se pudo eliminar el número de la base de datos.");
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
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8;}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
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
                .btn-add:hover{background:#1e5a87;transform:translateY(-1px);box-shadow:0 4px 12px rgba(38,122,176,0.2)}
                
                .btn-delete-row{width:32px;height:32px;border-radius:8px;border:1px solid #fee2e2;background:#fff;color:#ef4444;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s}
                .btn-delete-row:hover{background:#fef2f2;border-color:#ef4444}

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
                                <h3 className="table-title">Conecta tu número de Netelip a la IA y luego asignaselo a tu agente</h3>
                                <button className="btn-add" onClick={() => setShowAddModal(true)}>
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
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
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
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="btn-delete-row" onClick={() => handleDeleteNumber(num.id)} title="Borrar número">
                                                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
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
                                <option value="tcp">TCP (Recomendado)</option>
                                <option value="udp">UDP</option>
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
