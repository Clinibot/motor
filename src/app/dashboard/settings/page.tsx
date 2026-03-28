"use client";

import React from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import AlertSettings from '../../../components/AlertSettings';
import DashboardSidebar from '../../../components/DashboardSidebar';

interface UserProfile {
  role: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      setUser(profile);
    };
    loadProfile();
  }, [router]);

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
        .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column}
        .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
        .topbar-left h1{font-size:24px;font-weight:600;color:#1a1a1a}
        .content{flex:1;padding:32px}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
      `}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <DashboardSidebar user={user} />

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
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

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
