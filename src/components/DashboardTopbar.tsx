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
        <header className="top-bar">
            <div className="t-left">
                <h1 className="t-title">{title}</h1>
                <div className="t-sep"></div>
                <div className="t-breadcrumb">Bienvenido al Centro de Control de IA</div>
            </div>
            
            <div className="t-actions">
                <div className="btn-pill" style={{ 
                    padding: '8px 16px', background: 'var(--slate-50)', borderRadius: '10px', 
                    display: 'flex', gap: '8px', fontSize: '13px', border: '1px solid var(--slate-100)'
                }}>
                    <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Balance:</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 700 }}>€{totalCost.toFixed(3)}</span>
                </div>

                <div style={{ position: 'relative' }} ref={alertPanelRef}>
                    <button
                        className="btn-s"
                        onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
                        style={{ width: '40px', height: '40px', padding: 0, justifyContent: 'center' }}
                    >
                        <i className={`bi bi-bell${isAlertPanelOpen ? '-fill' : ''}`} style={{ fontSize: '18px' }}></i>
                    </button>
                    {isAlertPanelOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                            width: 380, background: '#fff', borderRadius: '20px',
                            border: '1px solid var(--slate-100)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.12)',
                            zIndex: 1000, overflow: 'hidden'
                        }}>
                            <NotificationsPanel workspaceId={user?.workspace_id || undefined} />
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleCreateAgent} 
                    className="btn-p"
                    style={{ height: '44px' }}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Añadir Agente</span>
                </button>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        className="btn-s"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ 
                            width: '44px', height: '44px', padding: 0, borderRadius: '50%', 
                            justifyContent: 'center', background: 'var(--slate-900)', color: 'white',
                            border: 'none', fontWeight: 700, fontSize: '14px'
                        }}
                    >
                        {userInitial}
                    </button>
                    {isDropdownOpen && (
                        <div style={{ 
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0, 
                            width: 240, background: '#fff', border: '1px solid var(--slate-100)', 
                            borderRadius: '20px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                            zIndex: 1000, overflow: 'hidden' 
                        }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid var(--slate-50)', background: 'var(--slate-50)' }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-900)' }}>
                                    {user?.full_name || 'Mi cuenta'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px' }}>
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <button 
                                    onClick={handleLogout} 
                                    className="nav-item"
                                    style={{ 
                                        width: '100%', color: '#ef4444', border: 'none', background: 'transparent',
                                        cursor: 'pointer', padding: '12px', borderRadius: '12px', gap: '12px',
                                        display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                                        fontSize: '13px', fontWeight: 600
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
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
