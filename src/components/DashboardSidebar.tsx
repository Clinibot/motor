"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserProfile {
    role: string;
}

interface SidebarProps {
    user?: UserProfile | null;
}

export default function DashboardSidebar({ user }: SidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { label: 'Mis agentes IA', href: '/dashboard/agents', iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
        { label: 'Mis números', href: '/dashboard/numbers', iconPath: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
        { label: 'Ayuda y soporte', href: '/dashboard/help', iconPath: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo-container">
                <div className="logo-badge">F</div>
                <div className="logo-text-group">
                    <span className="logo-main-text">Fábrica de Agentes IA</span>
                    <span className="logo-sub-text">netelip</span>
                </div>
            </div>
            <nav className="nav-menu">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${pathname === item.href ? 'active' : ''}`}
                    >
                        <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d={item.iconPath} clipRule="evenodd" />
                        </svg>
                        {item.label}
                    </Link>
                ))}

                {user?.role === 'superadmin' && (
                    <>
                        <div className="admin-sep">
                            <span>EQUIPO NETELIP</span>
                        </div>
                        <Link
                            href="/admin"
                            className={`nav-item admin-item platform-management ${pathname === '/admin' ? 'active' : ''}`}
                        >
                            <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Gestión de la Plataforma
                        </Link>
                    </>
                )}
            </nav>
        </aside>
    );
}
