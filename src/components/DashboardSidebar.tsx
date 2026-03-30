"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserProfile {
    role: string;
    email?: string | null;
}

interface SidebarProps {
    user?: UserProfile | null;
}

export default function DashboardSidebar({ user }: SidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'bi-house-door' },
        { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'bi-robot' },
        { label: 'Mis números', href: '/dashboard/numbers', icon: 'bi-telephone' },
        { label: 'Configuración', href: '/dashboard/settings', icon: 'bi-sliders' },
        { label: 'Ayuda y soporte', href: '/dashboard/help', icon: 'bi-question-circle' },
    ];

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link href="/dashboard" className="sidebar-logo" style={{ textDecoration: 'none' }}>
                    <div className="logo-dot">F</div>
                    <div>
                        <div className="logo-text">Fábrica de Agentes</div>
                        <div className="logo-sub">Panel de Control</div>
                    </div>
                </Link>
            </div>

            <div className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-label">MENÚ PRINCIPAL</div>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-btn ${pathname === item.href ? 'active' : ''}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <i className={`bi ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {user?.role === 'superadmin' && (
                    <div className="nav-section">
                        <div className="nav-label">ADMINISTRACIÓN</div>
                        <Link
                            href="/admin"
                            className={`nav-btn ${pathname === '/admin' ? 'active' : ''}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <i className="bi bi-shield-lock"></i>
                            <span>Gestión Plataforma</span>
                        </Link>
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <div className="user-pill">
                    <div className="user-av">{userInitial}</div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--oscuro)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {user?.email || 'Usuario'}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--gris-texto)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {user?.role || 'Cliente'}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
