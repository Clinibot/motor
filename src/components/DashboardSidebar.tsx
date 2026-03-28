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
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: (
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-5a1 1 0 011-1h2a1 1 0 011 1v5h4a1 1 0 001-1V10" />
                </svg>
            )
        },
        {
            label: 'Mis agentes IA',
            href: '/dashboard/agents',
            icon: (
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18V21M12 3V6M21 12H18M6 12H3M7.5 10.5V13.5M16.5 10.5V13.5M9.75 6H14.25C15.9069 6 17.25 7.34315 17.25 9V15C17.25 16.6569 15.9069 18 14.25 18H9.75C8.09315 18 6.75 16.6569 6.75 15V9C6.75 7.34315 8.09315 6 9.75 6ZM10.5 12H13.5" />
                </svg>
            )
        },
        {
            label: 'Mis números',
            href: '/dashboard/numbers',
            icon: (
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
            )
        },
        {
            label: 'Configuración',
            href: '/dashboard/settings',
            icon: (
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        {
            label: 'Ayuda y soporte',
            href: '/dashboard/help',
            icon: (
                <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
            )
        },
    ];

    return (
        <aside className="sidebar">
            <div className="logo-container">
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
                        {item.icon}
                        <span className="nav-text">{item.label}</span>
                    </Link>
                ))}

                {user?.role === 'superadmin' && (
                    <>
                        <div className="admin-sep">
                            <span className="admin-title">EQUIPO NETELIP</span>
                        </div>
                        <Link
                            href="/admin"
                            className={`nav-item admin-item platform-management ${pathname === '/admin' ? 'active' : ''}`}
                        >
                            <svg className="nav-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                            </svg>
                            <span className="nav-text">Gestión de la Plataforma</span>
                        </Link>
                    </>
                )}
            </nav>
        </aside>
    );
}
