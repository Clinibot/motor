"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Plus, Users, Loader2, Trash2, 
    Shield, Layout, Edit2
} from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import DashboardSidebar from '../../components/DashboardSidebar';
import AdminAlertSettings from '../../components/AdminAlertSettings';

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

export default function PlatformManagement() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    
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

    const userInitial = (user?.full_name || user?.email || 'A')[0].toUpperCase();

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex' }}>
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f6f8;color:#1a1a1a}
                
                .main-content{flex:1;margin-left:250px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8}
                
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;height:64px}
                .topbar-left h1{font-size:20px;font-weight:700;color:#1a1a1a}
                
                .user-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;cursor:pointer;border:none}
                
                .tab-nav { display: flex; gap: 32px; border-bottom: 1px solid #e2e8f0; padding: 0 48px; background: #fff; }
                .tab-item { padding: 16px 4px; font-size: 14px; font-weight: 600; color: #64748b; cursor: pointer; position: relative; display: flex; align-items: center; gap: 8px; border: none; background: none; }
                .tab-item.active { color: #2563eb; }
                .tab-item.active::after { content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 2px; background: #2563eb; }
                
                .content-area { padding: 32px 48px; }
                
                /* Cards and Tables */
                .glass-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 24px; }
                .card-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
                .card-title { font-size: 16px; font-weight: 700; color: #1e293b; }
                
                .btn-primary { background: #1a6da1; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                .btn-primary:hover { background: #155a84; }
                
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th { text-align: left; padding: 12px 24px; background: #fafafa; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; }
                .data-table td { padding: 16px 24px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
                .data-table tr:hover { background: #fcfcfc; }
                
                .mono-badge { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #f1f5f9; padding: 4px 8px; border-radius: 6px; color: #475569; }
                
                .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 100px; font-size: 12px; font-weight: 600; }
                .status-badge.active { background: #dcfce7; color: #15803d; }
                .status-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

                /* Form Design */
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px; }
                .form-group label { display: block; font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; }
                .form-group label .required { color: #ef4444; }
                .form-input { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s; }
                .form-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                
                .protocol-box { padding: 32px; text-align: center; color: #64748b; }
                .protocol-box svg { color: #2563eb; margin-bottom: 16px; opacity: 0.8; }
                .protocol-info { max-width: 500px; margin: 0 auto; line-height: 1.6; }
                
                .action-btn { padding: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
                .action-btn:hover { background: #fff; color: #1e293b; border-color: #cbd5e1; }
                
                .error-banner { background: #fef2f2; border: 1px solid #fee2e2; color: #b91c1c; padding: 12px 24px; margin: 32px 48px 0 48px; border-radius: 8px; font-size: 14px; }
            `}</style>

            <DashboardSidebar user={user} />

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Gestión de la Plataforma</h1>
                    </div>
                    <div className="topbar-right">
                        <div className="user-avatar">{userInitial}</div>
                    </div>
                </header>

                <nav className="tab-nav">
                    <button 
                        className={`tab-item ${activeTab === 'workspaces' ? 'active' : ''}`}
                        onClick={() => setActiveTab('workspaces')}
                    >
                        <Layout size={18} />
                        Workspaces
                    </button>
                    <button 
                        className={`tab-item ${activeTab === 'protocolo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('protocolo')}
                    >
                        <Shield size={18} />
                        Protocolo
                    </button>
                    <button 
                        className={`tab-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        Usuarios
                    </button>
                    <button 
                        className={`tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('alerts')}
                    >
                        <Shield size={18} />
                        Alertas
                    </button>
                </nav>

                {error && <div className="error-banner">{error}</div>}

                <div className="content-area">
                    {activeTab === 'workspaces' && (
                        <>
                            <div className="glass-card">
                                <div className="card-header">
                                    <h2 className="card-title">Workspaces registrados</h2>
                                    <button className="btn-primary" onClick={() => {
                                        const form = document.getElementById('create-form');
                                        form?.scrollIntoView({ behavior: 'smooth' });
                                    }}>
                                        <Plus size={16} />
                                        Crear workspace
                                    </button>
                                </div>
                                <div className="table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Nombre</th>
                                                <th>Retell API Key</th>
                                                <th>Usuarios</th>
                                                <th>Estado</th>
                                                <th>Acc.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr><td colSpan={5} style={{textAlign:'center', padding: '40px', color: '#94a3b8'}}><Loader2 className="animate-spin inline mr-2" /> Cargando...</td></tr>
                                            ) : workspaces.length === 0 ? (
                                                <tr><td colSpan={5} style={{textAlign:'center', padding: '40px', color: '#94a3b8'}}>No hay workspaces registrados</td></tr>
                                            ) : workspaces.map(ws => (
                                                <tr key={ws.id}>
                                                    <td style={{fontWeight: 600}}>{ws.name}</td>
                                                    <td><span className="mono-badge">key_{ws.retell_api_key?.substring(0, 4)}...{ws.retell_api_key?.slice(-4)}</span></td>
                                                    <td>{ws.users_count || 0}</td>
                                                    <td><span className="status-badge active">Activo</span></td>
                                                    <td>
                                                        <div style={{display:'flex', gap: '8px'}}>
                                                            <button className="action-btn" title="Editar" onClick={() => startEditing(ws)}><Edit2 size={14} /></button>
                                                            <button className="action-btn" title="Eliminar" style={{color: '#ef4444'}} onClick={() => handleDeleteWorkspace(ws.id, ws.name)}><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="glass-card" id="create-form">
                                <div className="card-header" style={{border: 'none'}}>
                                    <h2 className="card-title" style={{display:'flex', alignItems:'center', gap: '8px'}}>
                                        {editingId ? <Edit2 size={18} style={{color: '#2563eb'}} /> : <Plus size={18} style={{color: '#2563eb'}} />}
                                        {editingId ? 'Editar workspace' : 'Crear nuevo workspace'}
                                    </h2>
                                    {editingId && (
                                        <button className="btn-secondary" onClick={cancelEditing} style={{
                                            background: '#f1f5f9', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                                        }}>
                                            Cancelar edición
                                        </button>
                                    )}
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label>Nombre <span className="required">*</span></label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                placeholder="Ej: Clínica Dr. García" 
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Retell API Key {editingId ? '(Dejar vacío para mantener actual)' : <span className="required">*</span>}</label>
                                            <input 
                                                type="password" 
                                                className="form-input" 
                                                placeholder={editingId ? "********" : "key_..."}
                                                required={!editingId}
                                                value={retellApiKey}
                                                onChange={(e) => setRetellApiKey(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div style={{padding: '0 24px 24px 24px', display: 'flex', gap: '12px'}}>
                                        <button className="btn-primary" type="submit" disabled={isCreating}>
                                            {isCreating ? <Loader2 size={16} className="animate-spin" /> : (editingId ? <Edit2 size={16} /> : <Plus size={16} />)}
                                            {editingId ? 'Actualizar workspace' : 'Crear workspace'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </>
                    )}

                    {activeTab === 'protocolo' && (
                        <div className="glass-card">
                            <div className="protocol-box">
                                <Shield size={48} />
                                <div className="protocol-info">
                                    <h2 style={{fontSize: '18px', fontWeight: 800, color: '#1e293b', marginBottom: '8px'}}>Protocolo de Telefonía Forzado</h2>
                                    <p style={{marginBottom: '20px'}}>
                                        Toda la infraestructura de la Fábrica está actualmente configurada para forzar el protocolo <strong>UDP</strong>. 
                                        Esto asegura la máxima compatibilidad y rendimiento con los troncales SIP de Netelip.
                                    </p>
                                    <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'left', fontSize: '13px'}}>
                                        <p><strong>Configuración actual:</strong></p>
                                        <ul style={{marginTop: '8px', marginLeft: '16px'}}>
                                            <li>SIP Transport: <strong>UDP</strong> (Enforced)</li>
                                            <li>RTP Encryption: SRTP (Optional)</li>
                                            <li>Audio Codecs: PCMU, PCMA</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="glass-card">
                            <div className="card-header">
                                <h2 className="card-title">Usuarios del sistema</h2>
                            </div>
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Email</th>
                                            <th>Workspace</th>
                                            <th>Teléfonos</th>
                                            <th style={{textAlign: 'right'}}>Consumo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr><td colSpan={5} style={{textAlign:'center', padding: '40px'}}><Loader2 className="animate-spin inline mr-2" /> Cargando...</td></tr>
                                        ) : users.length === 0 ? (
                                            <tr><td colSpan={5} style={{textAlign:'center', padding: '40px'}}>No hay usuarios registrados</td></tr>
                                        ) : users.map(u => (
                                            <tr key={u.id}>
                                                <td style={{fontWeight: 600}}>{u.full_name || 'Sin nombre'}</td>
                                                <td>{u.email}</td>
                                                <td><span className="mono-badge">{u.workspace_name}</span></td>
                                                <td>
                                                    <div style={{display:'flex', flexWrap:'wrap', gap: '4px'}}>
                                                        {u.phone_numbers?.map((n, i) => (
                                                            <span key={i} className="status-badge" style={{background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontSize: '10px'}}>{n}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{textAlign: 'right'}}>
                                                    <div style={{fontWeight: 700}}>{u.total_minutes} min</div>
                                                    <div style={{fontSize: '11px', color: '#94a3b8'}}>{u.calls_count} llamadas</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'alerts' && (
                        <div className="glass-card" style={{padding: '24px'}}>
                            <AdminAlertSettings />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
