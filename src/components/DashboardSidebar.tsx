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
        { label: 'Dashboard', href: '/dashboard', iconPath: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z' },
        { label: 'Mis agentes IA', href: '/dashboard/agents', iconPath: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z' },
        { label: 'Mis números', href: '/dashboard/numbers', iconPath: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z' },
        { label: 'Configuración', href: '/dashboard/settings', iconPath: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z' },
        { label: 'Ayuda y soporte', href: '/dashboard/help', iconPath: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z' },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-container">
                <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                    <svg width="120" height="30" viewBox="0 0 120 30">
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                </Link>
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
                            <span>Administración</span>
                        </div>
                        <Link
                            href="/dashboard/templates"
                            className={`nav-item admin-item ${pathname === '/dashboard/templates' ? 'active' : ''}`}
                        >
                            <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" clipRule="evenodd" />
                            </svg>
                            Biblioteca de plantillas
                        </Link>
                        <Link
                            href="/admin"
                            className={`nav-item admin-item ${pathname === '/admin' ? 'active' : ''}`}
                        >
                            <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                            </svg>
                            Panel de Admin
                        </Link>
                    </>
                )}
            </nav>
        </aside>
    );
}
