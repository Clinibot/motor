"use client";

import React from 'react';
import NotificationsPanel from './NotificationsPanel';

interface UserProfile {
    full_name?: string | null;
    email?: string | null;
    workspace_id?: string | null;
}

interface TopbarProps {
    title: string;
    user: UserProfile | null;
    totalCost: number;
    isAlertPanelOpen: boolean;
    setIsAlertPanelOpen: (open: boolean) => void;
    isDropdownOpen: boolean;
    setIsDropdownOpen: (open: boolean) => void;
    handleCreateAgent: (e: React.MouseEvent) => void;
    handleLogout: () => void;
    alertPanelRef: React.RefObject<HTMLDivElement>;
    dropdownRef: React.RefObject<HTMLDivElement>;
}

export default function DashboardTopbar({
    title,
    user,
    totalCost,
    isAlertPanelOpen,
    setIsAlertPanelOpen,
    isDropdownOpen,
    setIsDropdownOpen,
    handleCreateAgent,
    handleLogout,
    alertPanelRef,
    dropdownRef,
}: TopbarProps) {
    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

    return (
        <header className="topbar">
            <div className="topbar-title">{title}</div>
            
            <div className="topbar-actions">
                <button 
                    onClick={handleCreateAgent} 
                    className="btn-p"
                >
                    <i className="bi bi-plus-lg"></i>
                    Crear nuevo agente
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--azul-light)', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 700, color: 'var(--azul)' }}>
                    <span>Créditos:</span>
                    <span>€{totalCost.toFixed(3)}</span>
                </div>

                <div style={{ position: 'relative' }} ref={alertPanelRef}>
                    <button
                        className="btn-s mini"
                        onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
                        style={{ border: 'none', background: isAlertPanelOpen ? 'var(--gris-bg)' : 'transparent', fontSize: '18px', padding: '6px' }}
                    >
                        <i className={`bi bi-bell${isAlertPanelOpen ? '-fill' : ''}`}></i>
                    </button>
                    {isAlertPanelOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            width: 380, background: '#fff', borderRadius: '16px',
                            border: '1px solid var(--gris-borde)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.12)',
                            zIndex: 1000, overflow: 'hidden', padding: 0
                        }}>
                            <NotificationsPanel workspaceId={user?.workspace_id || undefined} />
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        className="user-av"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ width: '32px', height: '32px', cursor: 'pointer', border: 'none' }}
                    >
                        {userInitial}
                    </button>
                    {isDropdownOpen && (
                        <div style={{ 
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0, 
                            width: 220, background: '#fff', border: '1px solid var(--gris-borde)', 
                            borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                            zIndex: 1000, overflow: 'hidden' 
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--oscuro)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.full_name || 'Mi cuenta'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <button 
                                    onClick={handleLogout} 
                                    style={{ 
                                        width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', 
                                        gap: '10px', border: 'none', background: 'transparent', cursor: 'pointer', 
                                        fontSize: '13px', fontWeight: 500, borderRadius: '8px', color: '#dc2626' 
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                    onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <i className="bi bi-box-arrow-right"></i>
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
