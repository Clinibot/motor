"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Users, Key, Loader2, Building } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    retell_api_key?: string;
    is_free?: boolean;
    users_count?: number;
}

export default function AdminDashboard() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const [name, setName] = useState('');
    const [retellApiKey, setRetellApiKey] = useState('');
    const [error, setError] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [activeTab, setActiveTab] = useState<'workspaces' | 'users'>('workspaces');
    const [users, setUsers] = useState<any[]>([]);

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
        } else {
            fetchUsers();
        }
    }, [activeTab]);

    const handleSyncAll = async () => {
        if (!window.confirm("¿Deseas sincronizar todos los agentes? Se aplicarán las nuevas reglas de herramientas y se preservarán las instrucciones manuales.")) {
            return;
        }

        setIsSyncing(true);
        setSyncMessage(null);
        setError('');

        try {
            const res = await fetch('/api/retell/sync-agents', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                setSyncMessage({
                    text: `Sincronización completada: ${data.updated} agentes actualizados.`,
                    type: 'success'
                });
            } else {
                setError(data.error || "Error durante la sincronización");
            }
        } catch {
            setError("Error de conexión al servidor de sincronización.");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsCreating(true);

        try {
            const res = await fetch('/api/admin/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, retell_api_key: retellApiKey })
            });
            const data = await res.json();

            if (data.success) {
                // Clear form & refresh
                setName('');
                setRetellApiKey('');
                fetchWorkspaces();
            } else {
                setError(data.error || "Error al crear workspace");
            }
        } catch {
            setError("Error de conexión al servidor.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Minimal Admin Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col h-screen sticky top-0">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl mb-10">
                    <Settings className="w-6 h-6" />
                    Super Admin
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('workspaces')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${activeTab === 'workspaces' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Building className="w-5 h-5" />
                        Workspaces
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Users className="w-5 h-5" />
                        Usuarios Globales
                    </button>
                </nav>

                <div className="mt-auto border-t border-gray-200 pt-4">
                    <a href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md font-medium transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Dashboard
                    </a>
                </div>
            </div>

            {/* Main Admin Area */}
            <div className="flex-1 p-10 max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {activeTab === 'workspaces' ? 'Workspaces (Tenants)' : 'Usuarios Globales'}
                        </h1>
                        <p className="text-gray-500 mt-1">
                            {activeTab === 'workspaces'
                                ? 'Gestiona los clientes y sus credenciales de Retell AI.'
                                : 'Detalle de registros, consumos y teléfonos de clientes.'}
                        </p>
                    </div>
                    <button
                        onClick={handleSyncAll}
                        disabled={isSyncing}
                        className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                        Sincronizar Agentes (Global)
                    </button>
                </div>

                {syncMessage && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6 border border-green-200 flex justify-between items-center">
                        <span>{syncMessage.text}</span>
                        <button onClick={() => setSyncMessage(null)} className="text-green-900 hover:text-green-700">×</button>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
                        {error}
                    </div>
                )}

                {activeTab === 'workspaces' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Workspace List content same as before but wrapped */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">
                                    Clientes Registrados ({workspaces.length})
                                </div>
                                {isLoading ? (
                                    <div className="p-12 flex justify-center items-center text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    </div>
                                ) : workspaces.length === 0 ? (
                                    <div className="p-10 text-center text-gray-500">
                                        No hay workspaces creados. Crea el primero.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {workspaces.map((ws) => (
                                            <li key={ws.id} className="p-6 hover:bg-gray-50 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">{ws.name}</h3>
                                                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">ID: {ws.id}</span>
                                                            {ws.is_free ? (
                                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Libre
                                                                </span>
                                                            ) : (
                                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Asignado ({ws.users_count} user{ws.users_count !== 1 ? 's' : ''})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Key className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">Retell API Key:</span>
                                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded select-all">
                                                            {ws.retell_api_key ? (
                                                                ws.retell_api_key.substring(0, 12) + '...'
                                                            ) : (
                                                                <span className="text-red-500 italic">No configurada</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Create Form */}
                        <div className="lg:col-span-1">
                            <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm sticky top-10">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-medium text-gray-700">
                                    Añadir Nuevo Workspace
                                </div>
                                <div className="p-6">
                                    <form onSubmit={handleCreateWorkspace} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa</label>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Ej. ACME Corp"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Retell API Key (Privada)</label>
                                            <input
                                                type="text"
                                                value={retellApiKey}
                                                onChange={(e) => setRetellApiKey(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                                placeholder="key_..."
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                            Crear Workspace
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Global Users View */
                    <div className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-4 items-start shadow-sm">
                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                <Settings className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-indigo-900 mb-1">Sincronización de Agentes</h4>
                                <p className="text-xs text-indigo-700 leading-relaxed">
                                    Utiliza el botón <strong>Sincronizar Agentes (Global)</strong> si realizas cambios en la estructura del prompt general o en las reglas de las herramientas. Esto propagará las mejoras a todos los clientes existentes de forma automática.
                                </p>
                            </div>
                            <button
                                onClick={handleSyncAll}
                                disabled={isSyncing}
                                className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-md transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                                Sincronizar Ahora
                            </button>
                        </div>

                        <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <span className="font-medium text-gray-700">Listado de Usuarios Registrados</span>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                    {users.length} TOTAL
                                </span>
                            </div>

                            {isLoading ? (
                                <div className="p-12 flex justify-center items-center text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                            ) : users.length === 0 ? (
                                <div className="p-10 text-center text-gray-500">
                                    No hay usuarios registrados.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                            <tr>
                                                <th className="px-6 py-3 border-b border-gray-200">Usuario</th>
                                                <th className="px-6 py-3 border-b border-gray-200">Email</th>
                                                <th className="px-6 py-3 border-b border-gray-200">Workspace</th>
                                                <th className="px-6 py-3 border-b border-gray-200">Teléfonos</th>
                                                <th className="px-6 py-3 border-b border-gray-200 text-right">Consumo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {users.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{u.full_name || 'Sin nombre'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">
                                                            {u.workspace_name}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {u.phone_numbers?.length > 0 ? (
                                                                u.phone_numbers.map((num: string, idx: number) => (
                                                                    <span key={idx} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                                                                        {num}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] text-gray-400 italic">Ninguno</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-bold text-gray-900">{u.total_minutes} min</span>
                                                            <span className="text-[10px] text-gray-500">{u.calls_count} llamadas</span>
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
                )}
            </div>
        </div>
    );
}
