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
    totalCost?: number;
    isAlertPanelOpen?: boolean;
    setIsAlertPanelOpen?: (open: boolean) => void;
    isDropdownOpen: boolean;
    setIsDropdownOpen: (open: boolean) => void;
    handleCreateAgent: (e: React.MouseEvent) => void;
    handleLogout: () => void;
    alertPanelRef?: React.RefObject<HTMLDivElement>;
    dropdownRef: React.RefObject<HTMLDivElement>;
}

export default function DashboardTopbar({
    title,
    user,
    totalCost = 0,
    isAlertPanelOpen = false,
    setIsAlertPanelOpen = () => {},
    isDropdownOpen,
    setIsDropdownOpen,
    handleCreateAgent,
    handleLogout,
    alertPanelRef,
    dropdownRef,
}: TopbarProps) {
    const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

    return (
        <header className="topbar">
            <h1 className="topbar-title">{title}</h1>
            
            <div className="topbar-actions">
                <button 
                    onClick={handleCreateAgent} 
                    className="btn-premium"
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Crear nuevo agente</span>
                </button>
                
                <div className="btn-pill">
                    <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Balance:</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 700 }}>€{totalCost.toFixed(3)}</span>
                </div>

                <div style={{ position: 'relative' }} ref={alertPanelRef}>
                    <button
                        className="nav-item"
                        onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
                        style={{ border: 'none', background: 'transparent', width: '40px', height: '40px', padding: 0, justifyContent: 'center' }}
                    >
                        <i className={`bi bi-bell${isAlertPanelOpen ? '-fill' : ''}`} style={{ fontSize: '20px' }}></i>
                    </button>
                    {isAlertPanelOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                            width: 380, background: '#fff', borderRadius: '16px',
                            border: '1px solid var(--slate-100)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.12)',
                            zIndex: 1000, overflow: 'hidden'
                        }}>
                            <NotificationsPanel workspaceId={user?.workspace_id || undefined} />
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        className="user-avatar"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ border: 'none', cursor: 'pointer' }}
                    >
                        {userInitial}
                    </button>
                    {isDropdownOpen && (
                        <div style={{ 
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0, 
                            width: 240, background: '#fff', border: '1px solid var(--slate-100)', 
                            borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                            zIndex: 1000, overflow: 'hidden' 
                        }}>
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--slate-50)', background: 'var(--slate-50)' }}>
                                <div className="user-name">
                                    {user?.full_name || 'Mi cuenta'}
                                </div>
                                <div className="user-role" style={{ textTransform: 'none' }}>
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <button 
                                    onClick={handleLogout} 
                                    className="nav-item"
                                    style={{ 
                                        width: '100%', color: '#ef4444', border: 'none', background: 'transparent',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-box-arrow-right"></i>
                                    <span>Cerrar sesión</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
