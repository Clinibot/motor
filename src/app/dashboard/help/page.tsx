"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

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
            description: 'Crea tu primer agente y empieza a gestionar llamadas en minutos.',
            icon: (
                <svg className="card-icon-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: 'Configurar el agente',
            description: 'Guía completa de los 9 pasos del asistente de configuración.',
            icon: (
                <svg className="card-icon-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: 'Mis números',
            description: 'Asigna y gestiona los números de teléfono de tus agentes.',
            icon: (
                <svg className="card-icon-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
            )
        },
        {
            title: 'Llamadas',
            description: 'Entrantes, salientes, transferencias y grabaciones.',
            icon: (
                <svg className="card-icon-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm3 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: 'Analítica y métricas',
            description: 'Entiende el rendimiento de tus agentes con datos reales.',
            icon: (
                <svg className="card-icon-svg" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
            )
        },
        {
            title: 'Hablar con Elio',
            description: '¿No encuentras lo que buscas? Elio te responde al instante.',
            customIcon: <div className="elio-icon">elio</div>
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
                .nav-section-title{padding:12px 20px 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px}
                .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left;position:relative}
                .nav-item:hover{background:#f9fafb;color:#267ab0}
                .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0;font-weight:600}
                .nav-item.active svg{color:#267ab0}
                .nav-icon{width:18px;height:18px;margin-right:12px;flex-shrink:0;color:#9ca3af}
                .nav-chevron{position:absolute;right:20px;width:12px;height:12px;color:#d1d5db}
                .sidebar-footer{padding:20px;border-top:1px solid #e5e7eb}
                
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8}
                .top-bar{padding:16px 32px;display:flex;justify-content:center;position:sticky;top:0;z-index:50}
                .search-container{width:100%;max-width:500px;position:relative}
                .search-input{width:100%;padding:10px 16px 10px 40px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-size:14px;color:#1e293b;outline:none;transition:all .2s}
                .search-input:focus{border-color:#267ab0;background:#fff;box-shadow:0 0 0 3px rgba(38,122,176,0.1)}
                .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94a3b8}

                .content-area{flex:1;padding:48px 64px;max-width:1200px;margin:0 auto;width:100%}
                .hero-section{margin-bottom:48px;text-align:left}
                .hero-title{font-size:32px;font-weight:800;color:#0f172a;margin-bottom:12px}
                .hero-subtitle{font-size:16px;color:#64748b}

                .help-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px}
                .help-card{background:#fff;border-radius:16px;padding:32px;border:1px solid #e2e8f0;display:flex;flex-direction:column;gap:20px;position:relative;overflow:hidden;transition:all .2s}
                .help-card.disabled{pointer-events:none;opacity:0.95}
                .card-icon-wrapper{width:48px;height:48px;background:#eff6fb;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#267ab0}
                .card-icon-svg{width:24px;height:24px}
                .elio-icon{font-weight:800;font-size:16px;color:#1e293b}
                .card-title{font-size:18px;font-weight:700;color:#0f172a}
                .card-description{font-size:14px;color:#64748b;line-height:1.6}
                
                .coming-soon-badge{position:absolute;top:16px;right:16px;background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:0.5px}

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

            {/* SIDEBAR MOCKING THE IMAGE */}
            <aside className="sidebar">
                <div className="logo-container">
                    <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                        <text x="80" y="22" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="400" fill="#64748b" style={{ opacity: 0.6 }}>/ Fábrica de Agentes IA</text>
                    </svg>
                </div>
                <nav className="nav-menu">
                    <div className="nav-section-title">Ayuda y soporte</div>
                    <div className="nav-item active">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Primeros pasos
                        <svg className="nav-chevron" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="nav-item" style={{ fontSize: '12px', paddingLeft: '50px' }}>Crear tu primer agente</div>
                    <div className="nav-item" style={{ fontSize: '12px', paddingLeft: '50px' }}>Qué es la Fábrica de Agentes IA</div>
                    <div className="nav-item" style={{ fontSize: '12px', paddingLeft: '50px' }}>Tipos de agente disponibles</div>
                    <div className="nav-item" style={{ fontSize: '12px', paddingLeft: '50px' }}>Requisitos previos</div>

                    <div className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Configurar el agente
                        <svg className="nav-chevron" style={{ transform: 'rotate(-90deg)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Mis números
                        <svg className="nav-chevron" style={{ transform: 'rotate(-90deg)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        Llamadas
                        <svg className="nav-chevron" style={{ transform: 'rotate(-90deg)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Analítica y métricas
                        <svg className="nav-chevron" style={{ transform: 'rotate(-90deg)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>

                    <div className="nav-section-title" style={{ marginTop: '24px' }}>Soporte</div>
                    <div className="nav-item">
                        <svg className="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Contactar con soporte
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={() => router.push('/dashboard')} className="user-dropdown-item" style={{ fontSize: '12px' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al Dashboard
                    </button>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className="main-content">
                <header className="top-bar">
                    <div className="search-container">
                        <svg className="search-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input className="search-input" type="text" placeholder="Buscar en la documentación..." readOnly />
                    </div>

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
                </header>

                <div className="content-area">
                    <section className="hero-section">
                        <h1 className="hero-title">¿En qué podemos ayudarte?</h1>
                        <p className="hero-subtitle">Encuentra respuestas rápidas o habla directamente con Elio.</p>
                    </section>

                    <div className="help-grid">
                        {helpCards.map((card, i) => (
                            <div key={i} className="help-card disabled">
                                <div className="coming-soon-badge">Próximamente</div>
                                <div className="card-icon-wrapper">
                                    {card.customIcon || card.icon}
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
