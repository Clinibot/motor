"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserProfile {
    role: string;
    email?: string | null;
    full_name?: string | null;
}

interface SidebarProps {
    user?: UserProfile | null;
}

export default function DashboardSidebar({ user }: SidebarProps) {
    const pathname = usePathname();

    const mainNav = [
        { label: 'Dashboard', href: '/dashboard', icon: 'bi-house-door' },
        { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'bi-robot' },
        { label: 'Mis números', href: '/dashboard/numbers', icon: 'bi-telephone' },
        { label: 'Ayuda y soporte', href: '/dashboard/help', icon: 'bi-question-circle' },
    ];

    const adminNav = [
        { label: 'Gestión de la plataforma', href: '/admin', icon: 'bi-shield-check' },
        { label: 'Biblioteca de plantillas', href: '/dashboard/templates', icon: 'bi-collection' },
    ];

    const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link href="/dashboard" className="sidebar-logo">
                    <div className="logo-dot">F</div>
                    <div>
                        <div className="logo-text">Fábrica de Agentes IA</div>
                        <div className="logo-sub">netelip</div>
                    </div>
                </Link>
            </div>

            <div className="sidebar-nav">
                <div className="nav-section">
                    {mainNav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-btn ${pathname === item.href ? 'active' : ''}`}
                        >
                            <i className={`bi ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {user?.role === 'superadmin' && (
                    <div className="nav-section">
                        <div className="nav-label">Equipo Netelip</div>
                        {adminNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-btn ${pathname === item.href ? 'active' : ''}`}
                            >
                                <i className={`bi ${item.icon}`}></i>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <div className="user-pill">
                    <div className="user-av">{userInitial}</div>
                    <div>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{user?.full_name || user?.email?.split('@')[0] || 'Usuario'}</span>
                        <br />
                        <span style={{ fontSize: '11px', color: 'var(--gris-texto)' }}>{user?.role || 'Cliente'}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
