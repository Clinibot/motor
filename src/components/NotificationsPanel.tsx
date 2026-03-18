"use client";

import React, { useState, useEffect } from 'react';
import AlertSettings from './AlertSettings';
import { useRouter } from 'next/navigation';
type BaseNotification = { id: string, created_at: string, alert_type: string, content: { currentValue?: number, threshold?: number } };

export default function NotificationsPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const [view, setView] = useState<'notifications' | 'settings'>('notifications');
  const [notifications, setNotifications] = useState<BaseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!workspaceId) return;
    fetch(`/api/alerts/notifications?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading notifications:", err);
        setLoading(false);
      });
  }, [workspaceId]);

  const getAlertDetails = (n: BaseNotification) => {
    switch (n.alert_type) {
      case 'low_success_rate':
        return { icon: '📉', title: 'Tasa bajó a ' + Number(n.content.currentValue || 0).toFixed(1) + '%' };
      case 'high_negative_sentiment':
        return { icon: '😠', title: 'Sentimiento negativo superó ' + Number(n.content.threshold || 0) + '%' };
      case 'high_cost':
        return { icon: '💰', title: 'Coste diario alcanzó ' + Number(n.content.currentValue || 0).toFixed(2) + '€' };
      default:
        return { icon: '🔔', title: 'Nueva alerta' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '450px' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {view === 'settings' ? (
             <button onClick={() => setView('notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
             </button>
          ) : (
            <svg width="18" height="18" fill="none" stroke="#267ab0" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          )}
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>
            {view === 'settings' ? 'Configurar Alertas' : 'Avisos y Alertas'}
          </span>
        </div>
        
        {view === 'notifications' && (
          <button 
            onClick={() => setView('settings')}
            title="Configurar Alertas"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
        )}
      </div>

      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        {view === 'settings' ? (
          <AlertSettings isDropdown />
        ) : (
          <div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                 <div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTop: '3px solid #267ab0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#6b7280' }}>
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 10px', opacity: 0.5 }} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <p style={{ margin: 0, fontSize: 14 }}>No hay alertas recientes.</p>
                <button onClick={() => setView('settings')} style={{ background: 'none', border: 'none', color: '#267ab0', fontWeight: 600, fontSize: 13, marginTop: 10, cursor: 'pointer' }}>Configurar umbrales 👉</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notifications.map(n => {
                  const details = getAlertDetails(n);
                  return (
                    <div key={n.id} style={{ display: 'flex', gap: 12, padding: '12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: 20 }}>{details.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{details.title}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {notifications.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button onClick={() => router.push('/dashboard/settings')} style={{ background: 'none', border: 'none', color: '#267ab0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Ir a Configuración completa →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
