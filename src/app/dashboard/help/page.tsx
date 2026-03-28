"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { Send } from 'lucide-react';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [isChatOpen, setIsChatOpen] = useState(false);

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

    const toggleChat = () => setIsChatOpen(!isChatOpen);

    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    const helpArticles = [
        { title: 'Crear tu primer agente', category: 'Primeros pasos' },
        { title: 'Qué es la Fábrica de Agentes IA', category: 'Primeros pasos' },
        { title: 'Tipos de agente disponibles', category: 'Primeros pasos' },
        { title: 'Requisitos previos para empezar', category: 'Primeros pasos' },
        { title: 'Paso 1 — Información básica', category: 'Guía del Wizard' },
        { title: 'Paso 2 — Configurar el LLM', category: 'Guía del Wizard' },
        { title: 'Paso 3 — Elegir una voz', category: 'Guía del Wizard' }
    ];

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex' }}>
            <style>{`
                :root {
                    --azul: #267ab0;
                    --azul-hover: #1e6291;
                    --azul-light: #eff6fb;
                    --gris-bg: #f5f6f8;
                    --gris-borde: #e5e7eb;
                    --gris-texto: #6c757d;
                    --oscuro: #1a2428;
                    --exito: #10b981;
                    --amarillo: #f59e0b;
                    --rojo: #ef4444;
                    --blanco: #ffffff;
                    --r-sm: 6px;
                    --r-md: 8px;
                    --r-lg: 12px;
                }

                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: 'Inter', -apple-system, sans-serif; background: var(--gris-bg); color: var(--oscuro); font-size: 14px; line-height: 1.6; }
                
                .main-content { flex: 1; margin-left: 260px; min-height: 100vh; display: flex; flex-direction: column; background: var(--gris-bg); }
                
                .topbar { background: var(--blanco); border-bottom: 1px solid var(--gris-borde); padding: 0 32px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 50; height: 56px; }
                .topbar-title { font-size: 18px; font-weight: 700; color: var(--oscuro); letter-spacing: -0.3px; }
                .topbar-right { display: flex; align-items: center; gap: 10px; }
                
                .btn-s { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; background: var(--blanco); color: var(--gris-texto); border: 1px solid var(--gris-borde); border-radius: var(--r-md); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
                .btn-s:hover { border-color: #9ca3af; color: var(--oscuro); }
                
                .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--azul), var(--azul-hover)); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; cursor: pointer; border: none; }
                .user-profile-container { position: relative; }
                .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: #fff; border: 1px solid var(--gris-borde); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top right; }
                .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; text-align: center; }
                .user-dropdown-name { margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a; display: block; }
                .user-dropdown-email { margin: 4px 0 0; font-size: 12px; color: #6b7280; display: block; }
                .user-dropdown-body { padding: 8px; }
                .user-dropdown-item { width: 100%; padding: 10px 12px; display: flex; align-items: center; gap: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; border-radius: 8px; transition: all 0.2s; color: #4b5563; }
                .user-dropdown-item:hover { background: #f3f4f6; color: #1a1a1a; }
                .user-dropdown-item.text-red { color: #dc2626; }

                .content-area { flex: 1; padding: 32px; max-width: 1400px; margin: 0 auto; width: 100%; }
                
                .search-box { display: flex; align-items: center; background: white; border: 1px solid var(--gris-borde); border-radius: var(--r-lg); padding: 0 16px; max-width: 500px; margin-bottom: 20px; }
                .search-input { border: none; background: none; padding: 12px; width: 100%; font-size: 14px; outline: none; font-family: inherit; }
                .search-icon { color: var(--gris-texto); font-size: 15px; flex-shrink: 0; }

                .card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
                .f-card { border-radius: var(--r-lg); padding: 22px; cursor: pointer; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 10px; }
                .f-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                .f-card.blue { background: linear-gradient(135deg, var(--azul), var(--azul-hover)); color: #fff; }
                .f-card.white { background: #fff; border: 1px solid var(--gris-borde); color: var(--oscuro); }
                
                .f-card-icon { font-size: 22px; display: block; margin-bottom: 0px; }
                .f-card.blue .f-card-icon { opacity: 0.85; }
                .f-card-title { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
                .f-card-desc { font-size: 12px; }
                .f-card.blue .f-card-desc { opacity: 0.75; }
                .f-card.white .f-card-desc { color: var(--gris-texto); }

                .main-layout { display: grid; grid-template-columns: 1fr 280px; gap: 20px; align-items: start; }
                
                .articles-container { background: #fff; border: 1px solid var(--gris-borde); border-radius: var(--r-lg); overflow: hidden; }
                .section-header { padding: 16px 20px; border-bottom: 1px solid var(--gris-borde); background: #fff; }
                .section-header h2 { font-size: 14px; font-weight: 700; color: var(--oscuro); }
                
                .article-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid var(--gris-borde); transition: all 0.2s; cursor: pointer; }
                .article-item:last-child { border-bottom: none; }
                .article-item:hover { background: var(--gris-bg); }
                .article-info h3 { font-size: 13px; font-weight: 600; color: var(--oscuro); margin-bottom: 2px; }
                .article-info span { font-size: 11px; color: var(--gris-texto); }
                .chevron { color: var(--gris-borde); font-size: 14px; }

                .elio-box { background: linear-gradient(135deg, #1a2428, #267ab0); border-radius: var(--r-lg); padding: 24px; color: #fff; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 80px; }
                .elio-header { display: flex; align-items: center; gap: 10px; }
                .elio-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; color: white; }
                .elio-title h4 { font-size: 14px; font-weight: 700; margin: 0; }
                .elio-title p { font-size: 11px; opacity: 0.7; margin: 0; }
                
                .elio-message { font-size: 12.5px; opacity: 0.8; line-height: 1.6; }
                
                .suggestions { display: flex; flex-direction: column; gap: 8px; }
                .suggestion-btn { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); padding: 9px 12px; border-radius: 8px; color: #fff; font-size: 12px; text-align: left; cursor: pointer; transition: all 0.2s; font-family: inherit; }
                .suggestion-btn:hover { background: rgba(255,255,255,0.2); }
                
                .elio-main-cta { background: #fff; color: var(--azul); border: none; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; font-family: inherit; }
                .elio-main-cta:hover { background: #f8fafc; transform: translateY(-1px); }

                @keyframes slideDown{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}

                /* Chat Window Styling */
                .chat-window { position: fixed; bottom: 85px; right: 20px; width: 340px; height: 480px; background: white; border: 1px solid var(--gris-borde); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 500; animation: slideDown 0.2s ease-out; }
                .chat-header { padding: 14px 16px; background: linear-gradient(135deg, #1a2428, #267ab0); border-radius: 16px 16px 0 0; display: flex; align-items: center; justify-content: space-between; }
                .chat-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
                .chat-footer { padding: 12px; border-top: 1px solid var(--gris-borde); display: flex; gap: 8px; }
                .chat-btn-fab { position: fixed; bottom: 20px; right: 20px; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #1a2428, #267ab0); border: none; color: white; font-size: 22px; cursor: pointer; box-shadow: 0 4px 16px rgba(38,122,176,0.4); display: flex; align-items: center; justify-content: center; z-index: 499; transition: transform 0.2s; }
                .chat-btn-fab:hover { transform: scale(1.05); }

                @media (max-width: 1023px) {
                    .main-content { margin-left: 0; }
                    .main-layout { grid-template-columns: 1fr; }
                    .elio-box { position: static; }
                    .card-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <DashboardSidebar user={user} />
 
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1 className="topbar-title">Ayuda y soporte</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="btn-s" onClick={toggleChat}>
                            <i className="bi bi-chat-dots"></i>
                            Preguntarle a Elio
                        </button>
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
                                            <Send size={16} style={{ transform: 'rotate(-45deg)' }} />
                                            Cerrar sesión
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="content-area">
                    {/* Search Section */}
                    <div className="search-box">
                        <i className="bi bi-search search-icon"></i>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Buscar en el centro de ayuda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Featured Cards */}
                    <div className="card-grid">
                        <div className="f-card blue">
                            <i className="bi bi-rocket-takeoff f-card-icon"></i>
                            <div className="f-card-content">
                                <h3 className="f-card-title">Crear tu primer agente</h3>
                                <p className="f-card-desc">Guía paso a paso en 6 pasos.</p>
                            </div>
                        </div>
                        <div className="f-card white">
                            <i className="bi bi-telephone-plus f-card-icon" style={{ color: 'var(--exito)' }}></i>
                            <div className="f-card-content">
                                <h3 className="f-card-title">Asignar un número</h3>
                                <p className="f-card-desc">Conecta tu número SIP de netelip.</p>
                            </div>
                        </div>
                        <div className="f-card white">
                            <i className="bi bi-shield-check f-card-icon" style={{ color: 'var(--amarillo)' }}></i>
                            <div className="f-card-content">
                                <h3 className="f-card-title">RGPD y LOPD</h3>
                                <p className="f-card-desc">Cumplimiento legal en España.</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Layout */}
                    <div className="main-layout">
                        {/* Articles Column */}
                        <div className="articles-column">
                            <div className="articles-container">
                                <div className="section-header">
                                    <h2>Artículos de ayuda</h2>
                                </div>
                                <div className="articles-list">
                                    {helpArticles.map((article, i) => (
                                        <div key={i} className="article-item">
                                            <div className="article-info">
                                                <h3>{article.title}</h3>
                                                <span>{article.category}</span>
                                            </div>
                                            <i className="bi bi-chevron-right chevron"></i>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Elio Column */}
                        <div className="elio-column">
                            <div className="elio-box">
                                <div className="elio-header">
                                    <div className="elio-avatar">E</div>
                                    <div className="elio-title">
                                        <h4>Pregúntale a Elio</h4>
                                        <p>Asistente de la Fábrica</p>
                                    </div>
                                </div>
                                
                                <p className="elio-message">
                                    Elio conoce toda la documentación y puede resolver tus dudas al instante.
                                </p>
                                
                                <div className="suggestions">
                                    <button className="suggestion-btn" onClick={() => {}}>¿Cómo creo un agente?</button>
                                    <button className="suggestion-btn" onClick={() => {}}>¿Cómo asigno un número?</button>
                                    <button className="suggestion-btn" onClick={() => {}}>¿Qué es la tasa de éxito?</button>
                                </div>
                                
                                <button className="elio-main-cta" onClick={toggleChat}>
                                    <i className="bi bi-chat-dots"></i>
                                    Abrir chat con Elio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Elio Chat FAB & Window */}
                <button className="chat-btn-fab" onClick={toggleChat}>
                    <i className="bi bi-chat-dots-fill"></i>
                </button>

                {isChatOpen && (
                    <div className="chat-window">
                        <div className="chat-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: 'white' }}>E</div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>Elio</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.7)' }}>Asistente de la Fábrica</div>
                                </div>
                            </div>
                            <button onClick={toggleChat} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        <div className="chat-body">
                            {/* Messages would go here */}
                        </div>
                        <div className="chat-footer">
                            <input className="search-input" style={{ flex: 1, border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-md)', padding: '9px 12px', fontSize: '13px', background: 'var(--blanco)' }} placeholder="Escribe tu pregunta..." />
                            <button className="btn-s" style={{ padding: '9px 14px', background: 'var(--azul)', color: 'white', borderColor: 'var(--azul)' }}>
                                <i className="bi bi-send"></i>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
