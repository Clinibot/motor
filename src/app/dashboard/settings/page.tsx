"use client";
export const dynamic = "force-dynamic";

import React from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { useWizardStore } from '../../../store/wizardStore';
import DashboardSidebar from '../../../components/DashboardSidebar';

import DashboardTopbar from '../../../components/DashboardTopbar';

interface UserProfile {
  full_name?: string | null;
  email?: string | null;
  role: string;
  workspace_id?: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { resetWizard } = useWizardStore();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

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
        .select('full_name, email, role, workspace_id')
        .eq('id', session.user.id)
        .single();
      setUser(profile);
    };
    loadProfile();
  }, [router]);

  const handleCreateAgent = (e: React.MouseEvent) => {
    e.preventDefault();
    resetWizard();
    router.push('/wizard');
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="app-container">
      <DashboardSidebar user={user} />

      <div className="main-view">
        <DashboardTopbar 
            title="Configuración"
            user={user}
            isAlertPanelOpen={false}
            setIsAlertPanelOpen={() => {}}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            handleCreateAgent={handleCreateAgent}
            handleLogout={handleLogout}
            dropdownRef={dropdownRef}
        />

        <div className="dashboard-content">
          <div className="content-header">
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>
                Ajustes de la Cuenta
              </h2>
              <p style={{ color: 'var(--slate-500)', fontSize: '14px', margin: 0 }}>
                Gestiona tus preferencias, notificaciones y seguridad.
              </p>
            </div>
          </div>

          <div style={{ maxWidth: '800px' }}>
            {/* ACCOUNT INFO SECTION (FUTURE) */}
            <div className="card-premium" style={{ opacity: 0.7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--slate-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate-400)', fontSize: '20px' }}>
                  <i className="bi bi-person-fill"></i>
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Perfil de Usuario</h3>
                  <p style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '4px 0 0' }}>Próximamente: Cambia tu nombre, email y contraseña.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
