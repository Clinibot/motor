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
            <div className="t-left">
                <h1 className="t-title" style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--slate-900)' }}>{title}</h1>
            </div>
            
            <div className="t-actions">
                <button 
                    onClick={handleCreateAgent} 
                    className="btn-p"
                    style={{ height: '44px', borderRadius: '12px', padding: '0 20px', fontWeight: 800, fontSize: '14px', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.1)' }}
                >
                    <i className="bi bi-plus-lg" style={{ marginRight: '8px' }}></i>
                    <span>Nuevo Agente</span>
                </button>

                <div style={{ 
                    padding: '10px 16px', background: 'white', borderRadius: '14px', 
                    display: 'flex', gap: '8px', fontSize: '13px', border: '1px solid var(--slate-100)',
                    alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                    <span style={{ color: 'var(--slate-400)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Balance</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 800, fontSize: '14px' }}>€{totalCost.toFixed(3)}</span>
                </div>

                <div style={{ position: 'relative' }} ref={alertPanelRef}>
                    <button
                        className="btn-s"
                        onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}
                        style={{ width: '44px', height: '44px', padding: 0, borderRadius: '14px', justifyContent: 'center', border: '1px solid var(--slate-100)', background: 'white' }}
                    >
                        <i className={`bi bi-bell${isAlertPanelOpen ? '-fill' : ''}`} style={{ fontSize: '20px', color: 'var(--slate-600)' }}></i>
                    </button>
                    {isAlertPanelOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                            width: 380, background: '#fff', borderRadius: '24px',
                            border: '1px solid var(--slate-100)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.12)',
                            zIndex: 1000, overflow: 'hidden'
                        }}>
                            <NotificationsPanel workspaceId={user?.workspace_id || undefined} />
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative', marginLeft: '4px' }} ref={dropdownRef}>
                    <button
                        className="btn-s"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{ 
                            width: '44px', height: '44px', padding: 0, borderRadius: '50%', 
                            justifyContent: 'center', background: 'var(--slate-900)', color: 'white',
                            border: 'none', fontWeight: 800, fontSize: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}
                    >
                        {userInitial}
                    </button>
                    {isDropdownOpen && (
                        <div style={{ 
                            position: 'absolute', top: 'calc(100% + 12px)', right: 0, 
                            width: 260, background: '#fff', border: '1px solid var(--slate-100)', 
                            borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
                            zIndex: 1000, overflow: 'hidden', padding: '8px'
                        }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-50)', background: 'white' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>
                                    {user?.full_name || 'Mi cuenta'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px', fontWeight: 500 }}>
                                    {user?.email || 'user@example.com'}
                                </div>
                            </div>
                            <div style={{ padding: '8px' }}>
                                <button 
                                    onClick={handleLogout} 
                                    className="nav-item"
                                    style={{ 
                                        width: '100%', color: '#ef4444', border: 'none', background: 'transparent',
                                        cursor: 'pointer', padding: '12px 16px', borderRadius: '16px', gap: '12px',
                                        display: 'flex', alignItems: 'center', transition: 'all 0.2s',
                                        fontSize: '14px', fontWeight: 700
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <i className="bi bi-box-arrow-right" style={{ fontSize: '18px' }}></i>
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
