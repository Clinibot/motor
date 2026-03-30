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
    ];

    const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link href="/dashboard" className="sidebar-logo">
                    <div className="logo-box">F</div>
                    <div className="logo-text-group">
                        <div className="logo-title">Fábrica de Agentes IA</div>
                        <div className="logo-subtitle">netelip</div>
                    </div>
                </Link>
            </div>

            <div className="sidebar-nav">
                <div className="nav-group">
                    <div className="nav-label">Menú Principal</div>
                    {mainNav.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                        >
                            <i className={`bi ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                {user?.role === 'superadmin' && (
                    <div className="nav-group">
                        <div className="nav-label">Equipo Netelip</div>
                        {adminNav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                            >
                                <i className={`bi ${item.icon}`}></i>
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">{userInitial}</div>
                    <div className="user-info">
                        <span className="user-name">{user?.full_name || user?.email?.split('@')[0] || 'Usuario'}</span>
                        <span className="user-role">{user?.role || 'Cliente'}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
