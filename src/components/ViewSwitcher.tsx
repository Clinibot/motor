"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserProfile {
    role: string;
}

interface ViewSwitcherProps {
    user?: UserProfile | null;
}

export default function ViewSwitcher({ user }: ViewSwitcherProps) {
    const pathname = usePathname();

    const views = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Agentes', href: '/dashboard/agents' },
        { label: 'Números', href: '/dashboard/numbers' },
    ];

    const adminViews = [
        { label: 'Plataforma', href: '/admin' },
    ];

    return (
        <div className="vs">
            <div className="vs-label">ACCESO RÁPIDO:</div>
            {views.map((view) => (
                <Link
                    key={view.href}
                    href={view.href}
                    className={`vb ${pathname === view.href ? 'active' : ''}`}
                    style={{ textDecoration: 'none' }}
                >
                    {view.label}
                </Link>
            ))}
            
            {user?.role === 'superadmin' && (
                <>
                    <div className="vs-sep"></div>
                    {adminViews.map((view) => (
                        <Link
                            key={view.href}
                            href={view.href}
                            className={`vb ${pathname === view.href ? 'active' : ''}`}
                            style={{ textDecoration: 'none' }}
                        >
                            {view.label}
                        </Link>
                    ))}
                </>
            )}
        </div>
    );
}
