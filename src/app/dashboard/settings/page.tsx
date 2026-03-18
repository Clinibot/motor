"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import AlertSettings from '../../../components/AlertSettings';

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <style>{`
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;color:#1a1a1a}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:#fff;border-right:1px solid #e5e7eb;z-index:100;display:flex;flex-direction:column}
        .logo-container{padding:24px 20px;border-bottom:1px solid #e5e7eb}
        .nav-menu{flex:1;padding:20px 0;overflow-y:auto}
        .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left}
        .nav-item:hover{background:#f9fafb;color:#267ab0}
        .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0}
        .nav-icon{width:20px;height:20px;margin-right:12px;flex-shrink:0}
        .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column}
        .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
        .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
        .content{flex:1;padding:32px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      `}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="logo-container">
            <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
              <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
            </svg>
          </div>
          <nav className="nav-menu">
            {[
              { label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z', active: false },
              { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', active: false },
              { label: 'Mis números', href: '/dashboard/numbers', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', active: false },
              { label: 'Biblioteca de plantillas', href: '/dashboard/templates', icon: 'M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z', active: false },
              { label: 'Configuración', href: '/dashboard/settings', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z', active: true },
              { label: 'Ayuda y soporte', href: '#', icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z', active: false },
            ].map(item => (
              <Link key={item.label} href={item.href} className={`nav-item${item.active ? ' active' : ''}`}>
                <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
                </svg>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="main-content">
          <header className="topbar">
            <div className="topbar-left">
              <h1>Configuración</h1>
            </div>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 16px', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', color: '#dc2626', fontFamily: 'inherit' }}
            >
              Cerrar sesión
            </button>
          </header>

          <div className="content">
            <div style={{ maxWidth: 640 }}>

              {/* ALERTS SECTION */}
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#eff6fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" fill="none" stroke="#267ab0" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Alertas por email</h2>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0' }}>Recibe avisos automáticos cuando algo requiere tu atención.</p>
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  <AlertSettings />
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
