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

    // Form state
    const [name, setName] = useState('');
    const [retellApiKey, setRetellApiKey] = useState('');
    const [error, setError] = useState('');

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

    useEffect(() => {
        fetchWorkspaces();
    }, []);

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
                    <a href="#" className="flex items-center gap-3 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md font-medium">
                        <Building className="w-5 h-5" />
                        Workspaces
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-md font-medium transition-colors">
                        <Users className="w-5 h-5" />
                        Usuarios Globales
                    </a>
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
                        <h1 className="text-3xl font-bold text-gray-900">Workspaces (Tenants)</h1>
                        <p className="text-gray-500 mt-1">Gestiona los clientes y sus credenciales de Retell AI.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Workspace List */}
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
                                                <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-medium border border-green-200">
                                                    Activo
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
                                        <p className="mt-1 text-xs text-gray-500">
                                            Esta key se usará estrictamente en el backend.
                                        </p>
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
            </div>
        </div>
    );
}
