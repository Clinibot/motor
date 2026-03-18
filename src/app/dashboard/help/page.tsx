"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
}

export default function HelpPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            const { data: profile } = await supabase
                .from('users').select('full_name, email, role')
                .eq('id', session.user.id).single();
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user' });
        };
        load();
    }, [router]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    const helpCards = [
        {
            title: 'Primeros pasos',
            description: 'Aprende a crear tu primer agente y configurar los flujos básicos de atención.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            title: 'Configuración avanzada',
            description: 'Personaliza el comportamiento, la voz y las instrucciones de tus agentes IA.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
            )
        },
        {
            title: 'Gestión de números',
            description: 'Cómo conectar y administrar tus números de teléfono con la plataforma.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
            )
        },
        {
            title: 'Historial y grabaciones',
            description: 'Accede a todas las llamadas, transcripciones y grabaciones de audio.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            )
        },
        {
            title: 'Métricas de rendimiento',
            description: 'Analiza el éxito de tus agentes con gráficos detallados y KPIs.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            )
        },
        {
            title: 'Soporte Directo',
            description: '¿Tienes dudas específicas? Contacta con nuestro equipo de expertos.',
            icon: (
                <svg className="card-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            )
        }
    ];

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f6f8;color:#1a1a1a}
                .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:#fff;border-right:1px solid #e5e7eb;z-index:100;display:flex;flex-direction:column}
                .logo-container{padding:24px 20px;border-bottom:1px solid #e5e7eb}
                .nav-menu{flex:1;padding:20px 0;overflow-y:auto}
                .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left}
                .nav-item:hover{background:#f9fafb;color:#267ab0}
                .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0}
                .nav-icon{width:20px;height:20px;margin-right:12px;flex-shrink:0}
                .admin-sep{margin:0 20px;border-top:1px solid #e5e7eb;padding-top:16px;margin-top:8px}
                .admin-sep span{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px;padding:0 0 8px 0;display:block}
                
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
                .topbar-right{display:flex;align-items:center;gap:20px}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .user-profile-container { position: relative; }
                .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top right; }
                .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; text-align: center; }
                .user-dropdown-name { margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
                .user-dropdown-email { margin: 4px 0 0; font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
                .user-dropdown-body { padding: 8px; }
                .user-dropdown-item { width: 100%; padding: 10px 12px; display: flex; align-items: center; gap: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; border-radius: 8px; transition: all 0.2s; color: #4b5563; }
                .user-dropdown-item:hover { background: #f3f4f6; color: #1a1a1a; }
                .user-dropdown-item.text-red { color: #dc2626; }
                .user-dropdown-item.text-red:hover { background: #fef2f2; color: #b91c1c; }
                @keyframes slideDown { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

                .content-area{flex:1;padding:48px 64px;max-width:1200px;margin:0 auto;width:100%}
                .hero-section{margin-bottom:48px;text-align:left}
                .hero-title{font-size:32px;font-weight:800;color:#0f172a;margin-bottom:12px}
                .hero-subtitle{font-size:16px;color:#64748b}

                .help-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px}
                .help-card{background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:20px;position:relative;overflow:hidden;transition:all .3s ease;cursor:default}
                .help-card.disabled{opacity:0.9}
                .help-card.disabled:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,0,0,0.05);border-color:#267ab0}
                .card-icon-wrapper{width:48px;height:48px;background:#eff6fb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#267ab0}
                .card-icon-svg{width:24px;height:24px}
                .card-title{font-size:18px;font-weight:700;color:#0f172a}
                .card-description{font-size:14px;color:#64748b;line-height:1.6}
                
                .coming-soon-badge{position:absolute;top:16px;right:16px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0}


                .user-profile-container{position:fixed;top:16px;right:32px;z-index:60}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .user-dropdown{position:absolute;top:calc(100% + 10px);right:0;width:220px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1);z-index:1000;overflow:hidden;animation:slideDown .2s cubic-bezier(.16,1,.3,1);transform-origin:top right}
                .user-dropdown-header{padding:16px;border-bottom:1px solid #f3f4f6;background:#f9fafb;text-align:center}
                .user-dropdown-name{font-size:14px;font-weight:600;color:#1a1a1a;display:block}
                .user-dropdown-email{margin:4px 0 0;font-size:12px;color:#6b7280;display:block}
                .user-dropdown-body{padding:8px}
                .user-dropdown-item{width:100%;padding:10px 12px;display:flex;align-items:center;gap:10px;border:none;background:transparent;cursor:pointer;font-size:14px;font-weight:500;border-radius:8px;transition:all .2s;color:#4b5563}
                .user-dropdown-item:hover{background:#f3f4f6;color:#1a1a1a}
                .user-dropdown-item.text-red{color:#dc2626}
                .user-avatar:focus { outline: none; }
                @keyframes slideDown{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
            `}</style>

            <DashboardSidebar user={user} />
 
            {/* MAIN AREA */}
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Ayuda y Soporte</h1>
                    </div>
                    <div className="topbar-right">
                        <div ref={dropdownRef} className="user-profile-container">
                            <button className="user-avatar" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                                {userInitial}
                            </button>
                            {isDropdownOpen && (
                                <div className="user-dropdown">
                                    <div className="user-dropdown-header">
                                        <span className="user-dropdown-name">{user?.full_name || 'Mi cuenta'}</span>
                                        <span className="user-dropdown-email">{user?.email}</span>
                                    </div>
                                    <div className="user-dropdown-body">
                                        <button onClick={handleLogout} className="user-dropdown-item text-red">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="content-area">
                    <section className="hero-section">
                        <h1 className="hero-title">¿Cómo podemos ayudarte?</h1>
                        <p className="hero-subtitle">Explora nuestras guías o contacta con nuestro equipo para resolver tus dudas.</p>
                    </section>
 
                    <div className="help-grid">
                        {helpCards.map((card, i) => (
                            <div key={i} className="help-card disabled">
                                <div className="coming-soon-badge">Próximamente</div>
                                <div className="card-icon-wrapper">
                                    {card.icon}
                                </div>
                                <div>
                                    <h3 className="card-title">{card.title}</h3>
                                    <p className="card-description" style={{ marginTop: '8px' }}>{card.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
