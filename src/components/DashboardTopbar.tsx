"use client";

import React from 'react';

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
    isDropdownOpen,
    setIsDropdownOpen,
    handleCreateAgent,
    handleLogout,
    dropdownRef,
}: TopbarProps) {
    const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

    return (
        <header className="topbar">
            <span className="topbar-title">{title}</span>

            <div className="topbar-actions">
                <button
                    onClick={handleCreateAgent}
                    className="btn-p"
                    style={{ padding: '9px 18px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 600, boxShadow: 'none' }}
                >
                    <i className="bi bi-plus-lg" style={{ marginRight: '8px' }}></i>
                    <span>Nuevo Agente</span>
                </button>

                <div style={{
                    padding: '8px 14px', background: 'white', borderRadius: 'var(--r-md)',
                    display: 'flex', gap: '8px', fontSize: '13px', border: '1px solid var(--gris-borde)',
                    alignItems: 'center'
                }}>
                    <span style={{ color: 'var(--gris-texto)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Balance</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 800, fontSize: '14px' }}>€{totalCost.toFixed(3)}</span>
                </div>

                <div style={{ position: 'relative' }} ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        style={{
                            width: '36px', height: '36px', padding: 0, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--azul), var(--azul-hover))', color: 'white',
                            border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
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
