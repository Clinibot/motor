"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import DashboardSidebar from '../../components/DashboardSidebar';

interface Workspace {
    id: string;
    name: string;
    retell_api_key?: string;
    is_free?: boolean;
    users_count?: number;
}

interface AdminUser {
    id: string;
    full_name: string | null;
    email: string;
    workspace_name: string;
    workspace_id: string;
    phone_numbers: string[];
    total_minutes: number;
    calls_count: number;
}

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
}

import DashboardTopbar from '../../components/DashboardTopbar';

export default function PlatformManagement() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // Form states
    const [name, setName] = useState('');
    const [retellApiKey, setRetellApiKey] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'workspaces' | 'protocolo' | 'users' | 'alerts'>('workspaces');
    const [users, setUsers] = useState<AdminUser[]>([]);

    const [editingId, setEditingId] = useState<string | null>(null);

    // Initial load
    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            const { data: profile } = await supabase
                .from('users').select('full_name, email, role')
                .eq('id', session.user.id).single();
            
            if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
                router.push('/dashboard');
                return;
            }
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user' });
        };
        load();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const fetchWorkspaces = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/workspaces');
            const data = await res.json();
            if (data.success) {
                setWorkspaces(data.workspaces);
            } else {
                setError(data.error);
            }
        } catch {
            setError("Error de conexión al cargar workspaces.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                setError(data.error);
            }
        } catch {
            setError("Error de conexión al cargar usuarios.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'workspaces') {
            fetchWorkspaces();
        } else if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            const method = editingId ? 'PATCH' : 'POST';
            const url = editingId ? `/api/admin/workspaces?id=${editingId}` : '/api/admin/workspaces';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, retell_api_key: retellApiKey })
            });
            const data = await res.json();

            if (data.success) {
                setName('');
                setRetellApiKey('');
                setEditingId(null);
                fetchWorkspaces();
            } else {
                setError(data.error || `Error al ${editingId ? 'actualizar' : 'crear'} workspace`);
            }
        } catch {
            setError("Error de conexión al servidor.");
        } finally {
            setIsCreating(false);
        }
    };

    const startEditing = (ws: Workspace) => {
        setEditingId(ws.id);
        setName(ws.name);
        setRetellApiKey(ws.retell_api_key || '');
        const form = document.getElementById('create-form');
        form?.scrollIntoView({ behavior: 'smooth' });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setName('');
        setRetellApiKey('');
    };

    const handleDeleteWorkspace = async (id: string, name: string) => {
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/workspaces?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) fetchWorkspaces();
            else setError(data.error || "Error al eliminar");
        } catch { setError("Error de conexión."); }
    };

    const dropdownRef = useRef<HTMLDivElement>(null);

    return (
        <div className="app-container">
            <DashboardSidebar user={user} />

            <main className="main-view">
                <DashboardTopbar 
                    title="Gestión de la plataforma"
                    user={user}
                    isAlertPanelOpen={false}
                    setIsAlertPanelOpen={() => {}}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleLogout={handleLogout}
                    handleCreateAgent={() => router.push('/dashboard/agents?create=true')}
                    dropdownRef={dropdownRef}
                />

                <div className="dashboard-content">
                    <div className="adm-tabs-container">
                        <button 
                            className={`adm-tab ${activeTab === 'workspaces' ? 'on' : ''}`}
                            onClick={() => setActiveTab('workspaces')}
                        >
                            <i className="bi bi-buildings"></i>
                            <span>Workspaces</span>
                        </button>
                        <button 
                            className={`adm-tab ${activeTab === 'users' ? 'on' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <i className="bi bi-people"></i>
                            <span>Usuarios</span>
                        </button>
                    </div>

                    {error && <div className="error-banner" style={{ marginBottom: '32px' }}>{error}</div>}

                    {activeTab === 'workspaces' && (
                        <div style={{ maxWidth: '1200px' }}>
                            <div className="card-premium" style={{ padding: 0, overflow: 'hidden', marginBottom: '40px' }}>
                                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)' }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>Workspaces registrados</h2>
                                    <button className="btn-p" onClick={() => {
                                        const form = document.getElementById('create-form');
                                        form?.scrollIntoView({ behavior: 'smooth' });
                                    }}>
                                        <i className="bi bi-plus-lg"></i>
                                        <span>Nuevo Workspace</span>
                                    </button>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Retell API Key</th>
                                                <th style={{ textAlign: 'center' }}>Usuarios</th>
                                                <th>Estado</th>
                                                <th style={{ textAlign: 'right' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr><td colSpan={5} style={{textAlign:'center', padding: '80px'}}><Loader2 className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--azul)' }} /> <div style={{ color: 'var(--slate-400)', fontWeight: 600 }}>Cargando workspaces...</div></td></tr>
                                            ) : workspaces.length === 0 ? (
                                                <tr><td colSpan={5} style={{textAlign:'center', padding: '80px', color: 'var(--slate-400)', fontWeight: 500 }}>No hay workspaces registrados en el sistema.</td></tr>
                                            ) : workspaces.map(ws => (
                                                <tr key={ws.id}>
                                                    <td style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{ws.name}</td>
                                                    <td><span className="mono-key">key_{ws.retell_api_key?.substring(0, 4)}...{ws.retell_api_key?.slice(-4)}</span></td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 800, background: 'var(--slate-100)', padding: '6px 12px', borderRadius: '10px', fontSize: '13px', color: 'var(--slate-700)' }}>{ws.users_count || 0}</span>
                                                    </td>
                                                    <td>
                                                        <div className="badge-ok">
                                                            <span style={{ width: '8px', height: '8px', background: 'var(--exito)', borderRadius: '50%' }}></span>
                                                            Activo
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button className="btn-s" title="Editar" onClick={() => startEditing(ws)} style={{ padding: '5px 8px' }}><i className="bi bi-pencil" style={{ fontSize: '12px' }}></i></button>
                                                            <button className="btn-s" title="Eliminar" onClick={() => handleDeleteWorkspace(ws.id, ws.name)} style={{ padding: '5px 8px', color: 'var(--error)', borderColor: '#fecaca' }}><i className="bi bi-trash" style={{ fontSize: '12px' }}></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card-premium" id="create-form" style={{ maxWidth: '800px' }}>
                                <div style={{ marginBottom: '32px' }}>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                                        {editingId ? 'Editar Workspace' : 'Configurar acceso'}
                                    </h2>
                                    <p style={{ fontSize: '15px', color: 'var(--slate-500)', lineHeight: 1.5 }}>Define las credenciales necesarias para que el cliente pueda operar en la plataforma.</p>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '10px', display: 'block' }}>Razón Social / Nombre</label>
                                            <input 
                                                type="text" 
                                                className="inp" 
                                                placeholder="Ej: Clínica Dental Madrid" 
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '10px', display: 'block' }}>Retell API Key</label>
                                            <input 
                                                type="password" 
                                                className="inp" 
                                                placeholder={editingId ? "********" : "key_..."}
                                                required={!editingId}
                                                value={retellApiKey}
                                                onChange={(e) => setRetellApiKey(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button className="btn-p" type="submit" disabled={isCreating}>
                                            {isCreating ? <Loader2 size={18} className="animate-spin" /> : (editingId ? <i className="bi bi-check-lg"></i> : <i className="bi bi-plus-lg"></i>)}
                                            <span style={{ marginLeft: '10px' }}>{editingId ? 'Guardar Cambios' : 'Confirmar y Crear'}</span>
                                        </button>
                                        {editingId && (
                                            <button className="btn-s" onClick={cancelEditing} type="button">Descartar</button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--slate-900)' }}>Usuarios globales</h2>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre Completo</th>
                                            <th>Email Acceso</th>
                                            <th>Workspace</th>
                                            <th>Números Asignados</th>
                                            <th style={{ textAlign: 'right' }}>Uso de Plataforma</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={5} style={{textAlign:'center', padding: '80px'}}><Loader2 className="animate-spin" style={{ margin: '0 auto 16px', color: 'var(--azul)' }} /> <div style={{ color: 'var(--slate-400)', fontWeight: 600 }}>Cargando usuarios...</div></td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan={5} style={{textAlign:'center', padding: '80px', color: 'var(--slate-400)', fontWeight: 500 }}>No hay usuarios en la base de datos.</td></tr>
                                        ) : users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{u.full_name || 'Sin identificar'}</td>
                                                <td style={{ color: 'var(--slate-500)' }}>{u.email}</td>
                                                <td><span style={{ background: 'var(--azul-light)', color: 'var(--azul)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{u.workspace_name}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {u.phone_numbers && u.phone_numbers.length > 0 ? u.phone_numbers.map((n, i) => (
                                                            <span key={i} style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <i className="bi bi-telephone" style={{ fontSize: '10px' }}></i>
                                                                {n}
                                                            </span>
                                                        )) : <span style={{ color: 'var(--slate-300)', fontSize: '12px', fontStyle: 'italic' }}>Sin líneas</span>}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '15px' }}>{u.total_minutes} <small style={{ color: 'var(--slate-400)', fontWeight: 500 }}>min</small></div>
                                                    <div style={{ fontSize: '12px', color: 'var(--slate-400)', fontWeight: 600 }}>{u.calls_count} interacciones</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
