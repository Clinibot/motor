"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import DashboardSidebar from '../../../components/DashboardSidebar';
import { Search, Rocket, PhoneCall, ShieldCheck, ChevronRight, MessageSquare, Send } from 'lucide-react';

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
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f6f8;color:#1a1a1a}
                
                .main-content{flex:1;margin-left:250px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8}
                
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50;height:64px}
                .topbar-left h1{font-size:20px;font-weight:700;color:#1a1a1a}
                .topbar-right{display:flex;align-items:center;gap:16px}
                
                .elio-cta-btn { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; }
                .elio-cta-btn:hover { background: #f1f5f9; border-color: #cbd5e1; color: #1e293b; }
                
                .user-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2563eb 0%,#1e40af 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;cursor:pointer;border:none}
                .user-profile-container { position: relative; }
                .user-dropdown { position: absolute; top: calc(100% + 10px); right: 0; width: 220px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); z-index: 1000; overflow: hidden; animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top right; }
                .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f3f4f6; background: #f9fafb; text-align: center; }
                .user-dropdown-name { margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a; display: block; }
                .user-dropdown-email { margin: 4px 0 0; font-size: 12px; color: #6b7280; display: block; }
                .user-dropdown-body { padding: 8px; }
                .user-dropdown-item { width: 100%; padding: 10px 12px; display: flex; align-items: center; gap: 10px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 500; border-radius: 8px; transition: all 0.2s; color: #4b5563; }
                .user-dropdown-item:hover { background: #f3f4f6; color: #1a1a1a; }
                .user-dropdown-item.text-red { color: #dc2626; }

                .content-area{flex:1;padding:32px 48px;max-width:1400px;margin:0 auto;width:100%}
                
                .search-container { position: relative; max-width: 600px; margin-bottom: 32px; }
                .search-input { width: 100%; padding: 14px 20px 14px 48px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; transition: all 0.2s; outline: none; }
                .search-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #94a3b8; width: 20px; height: 20px; }

                .featured-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
                .f-card { padding: 28px; border-radius: 16px; border: 1px solid #e2e8f0; transition: all 0.3s ease; cursor: pointer; display: flex; flex-direction: column; gap: 16px; min-height: 160px; }
                .f-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1); }
                .f-card.blue { background: #1e5f91; color: #fff; border: none; }
                .f-card.blue .card-icon { background: rgba(255,255,255,0.1); color: #fff; }
                .f-card.white { background: #fff; color: #1e293b; }
                .f-card.white .card-icon { background: #f1f5f9; color: #2563eb; }
                .f-card.white .card-icon.orange { color: #f59e0b; background: #fff7ed; }
                
                .card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
                .card-title { font-size: 17px; font-weight: 700; }
                .card-desc { font-size: 14px; opacity: 0.9; line-height: 1.5; }

                .main-layout { display: grid; grid-template-columns: 1fr 340px; gap: 24px; }
                
                /* Left Column: Articles */
                .articles-container { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
                .section-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #fafafa; }
                .section-header h2 { font-size: 16px; font-weight: 700; color: #334155; }
                
                .article-item { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; transition: all 0.2s; cursor: pointer; }
                .article-item:last-child { border-bottom: none; }
                .article-item:hover { background: #f8fafc; }
                .article-info h3 { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
                .article-info span { font-size: 12px; color: #94a3b8; }
                .chevron { color: #cbd5e1; width: 18px; height: 18px; }

                /* Right Column: Elio Box */
                .elio-box { background: #1a2c3d; border-radius: 16px; padding: 24px; color: #fff; display: flex; flex-direction: column; gap: 20px; position: sticky; top: 88px; }
                .elio-header { display: flex; align-items: center; gap: 12px; }
                .elio-avatar { width: 40px; height: 40px; border-radius: 50%; background: #334155; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; border: 2px solid rgba(255,255,255,0.1); }
                .elio-title h4 { font-size: 15px; font-weight: 700; margin: 0; }
                .elio-title p { font-size: 12px; color: #94a3b8; margin: 0; }
                
                .elio-message { font-size: 14px; color: #cbd5e1; line-height: 1.6; }
                
                .suggestions { display: flex; flex-direction: column; gap: 8px; }
                .suggestion-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px 16px; border-radius: 8px; color: #e2e8f0; font-size: 13px; text-align: left; cursor: pointer; transition: all 0.2s; }
                .suggestion-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); }
                
                .elio-main-cta { background: #fff; color: #1a2c3d; border: none; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; margin-top: 8px; }
                .elio-main-cta:hover { background: #f8fafc; transform: translateY(-1px); }

                .floating-chat-btn { position: fixed; bottom: 32px; right: 32px; width: 60px; height: 60px; border-radius: 50%; background: #1a2c3d; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(0,0,0,0.2); cursor: pointer; transition: all 0.3s ease; z-index: 1000; border: none; }
                .floating-chat-btn:hover { transform: scale(1.1); background: #2563eb; }

                @keyframes slideDown{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
                
                @media (max-width: 1100px) {
                    .main-layout { grid-template-columns: 1fr; }
                    .elio-box { position: static; }
                    .featured-cards { grid-template-columns: 1fr; }
                }
            `}</style>

            <DashboardSidebar user={user} />
 
            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h1>Ayuda y soporte</h1>
                    </div>
                    <div className="topbar-right">
                        <button className="elio-cta-btn">
                            <MessageSquare size={16} />
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
                    <div className="search-container">
                        <Search className="search-icon" />
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Buscar en el centro de ayuda..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Featured Cards */}
                    <div className="featured-cards">
                        <div className="f-card blue">
                            <div className="card-icon">
                                <Rocket size={24} />
                            </div>
                            <div className="card-content">
                                <h3 className="card-title">Crear tu primer agente</h3>
                                <p className="card-desc">Guía paso a paso en 6 pasos.</p>
                            </div>
                        </div>
                        <div className="f-card white">
                            <div className="card-icon">
                                <PhoneCall size={24} />
                            </div>
                            <div className="card-content">
                                <h3 className="card-title">Asignar un número</h3>
                                <p className="card-desc">Conecta tu número SIP de netelip.</p>
                            </div>
                        </div>
                        <div className="f-card white">
                            <div className="card-icon orange">
                                <ShieldCheck size={24} />
                            </div>
                            <div className="card-content">
                                <h3 className="card-title">RGPD y LOPD</h3>
                                <p className="card-desc">Cumplimiento legal en España.</p>
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
                                            <ChevronRight className="chevron" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Elio AIS Column */}
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
                                    <button className="suggestion-btn">¿Cómo creo un agente?</button>
                                    <button className="suggestion-btn">¿Cómo asigno un número?</button>
                                    <button className="suggestion-btn">¿Qué es la tasa de éxito?</button>
                                </div>
                                
                                <button className="elio-main-cta">
                                    <MessageSquare size={16} />
                                    Abrir chat con Elio
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Chat Button */}
                <button className="floating-chat-btn">
                    <MessageSquare size={28} />
                </button>
            </main>
        </div>
    );
}
