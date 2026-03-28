"use client";

import React, { useState, useEffect } from 'react';

interface AlertSettingsData {
  alert_email: string | null;
  daily_summary_enabled: boolean;
  low_success_rate_enabled: boolean;
  low_success_rate_threshold: number;
  high_negative_sentiment_enabled: boolean;
  high_negative_sentiment_threshold: number;
  high_cost_enabled: boolean;
  high_cost_threshold: number;
}

const DEFAULT: AlertSettingsData = {
  alert_email: null,
  daily_summary_enabled: false,
  low_success_rate_enabled: false,
  low_success_rate_threshold: 70,
  high_negative_sentiment_enabled: false,
  high_negative_sentiment_threshold: 40,
  high_cost_enabled: false,
  high_cost_threshold: 5,
};

export default function AlertSettings({ isDropdown = false }: { isDropdown?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AlertSettingsData>(DEFAULT);
  const [emailInput, setEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/alerts/settings');
        const data = await res.json();
        if (data.settings) {
          setSettings({ ...DEFAULT, ...data.settings });
          setEmailInput(data.settings.alert_email || '');
        }
      } catch (e) {
        console.error("Error fetching settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) return;
    setSavingEmail(true);
    try {
      const payload = { ...settings, alert_email: emailInput };
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSettings(payload);
        showToast('success', 'Email guardado');
      } else throw new Error();
    } catch {
      showToast('error', 'Error al guardar el email');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) showToast('success', '✓ Alertas guardadas');
      else throw new Error();
    } catch {
      showToast('error', 'Error al guardar las alertas');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggle = (key: keyof AlertSettingsData) => {
    if (!settings.alert_email) return; // disabled
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const setThreshold = (key: keyof AlertSettingsData, value: number) => {
    if (!settings.alert_email) return; // disabled
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTop: '3px solid #267ab0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  const alertCards = [
    {
      icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>,
      title: 'Resumen diario',
      description: 'Recibe cada día un resumen con el total de llamadas, tasa de éxito, sentimiento y coste.',
      enabledKey: 'daily_summary_enabled' as keyof AlertSettingsData,
      thresholdKey: null,
      thresholdLabel: null,
      thresholdUnit: null,
      thresholdMin: null,
      thresholdMax: null,
    },
    {
      icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path></svg>,
      title: 'Tasa de éxito baja',
      description: 'Avísame si la tasa de éxito de las llamadas cae por debajo del umbral.',
      enabledKey: 'low_success_rate_enabled' as keyof AlertSettingsData,
      thresholdKey: 'low_success_rate_threshold' as keyof AlertSettingsData,
      thresholdLabel: 'Alertar si la tasa de éxito baja de',
      thresholdUnit: '%',
      thresholdMin: 1,
      thresholdMax: 100,
    },
    {
      icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>,
      title: 'Sentimiento negativo',
      description: 'Avísame si el porcentaje de llamadas con sentimiento negativo sube del umbral.',
      enabledKey: 'high_negative_sentiment_enabled' as keyof AlertSettingsData,
      thresholdKey: 'high_negative_sentiment_threshold' as keyof AlertSettingsData,
      thresholdLabel: 'Alertar si el sentimiento negativo supera',
      thresholdUnit: '%',
      thresholdMin: 5,
      thresholdMax: 100,
    },
    {
      icon: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
      title: 'Coste elevado',
      description: 'Avísame si el gasto acumulado del día supera el límite que elijas.',
      enabledKey: 'high_cost_enabled' as keyof AlertSettingsData,
      thresholdKey: 'high_cost_threshold' as keyof AlertSettingsData,
      thresholdLabel: 'Alertar si el coste diario supera',
      thresholdUnit: '€',
      thresholdMin: 1,
      thresholdMax: 500,
    },
  ];

  const hasEmail = Boolean(settings.alert_email);
  const emailMissingAlert = !hasEmail && (
    <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 8, color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
      Configura un email de alertas para poder activar y guardar tus preferencias.
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {/* Email Configurator section */}
      <div style={{ marginBottom: 24, padding: isDropdown ? 0 : '16px 20px', background: isDropdown ? 'transparent' : '#f8fafc', borderRadius: 12, border: isDropdown ? 'none' : '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          Email para recibir alertas
        </label>
        <form onSubmit={handleSetEmail} style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            required
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="Introduce tu correo electrónico"
            style={{
              flex: 1, padding: '10px 14px', fontSize: 14, borderRadius: 8,
              border: '1px solid #e5e7eb', outline: 'none',
              fontFamily: 'inherit', transition: 'border-color .2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#267ab0')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
          <button
            type="submit"
            disabled={savingEmail || !emailInput.trim()}
            style={{
              padding: '0 16px', background: emailInput.trim() !== settings.alert_email ? '#267ab0' : '#e5e7eb',
              color: emailInput.trim() !== settings.alert_email ? '#fff' : '#6b7280',
              border: 'none', borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: (savingEmail || !emailInput.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap'
            }}
          >
            {savingEmail ? 'Guardando...' : settings.alert_email ? 'Actualizar' : 'Guardar Email'}
          </button>
        </form>
      </div>

      {emailMissingAlert}

      <div style={{ display: 'grid', gridTemplateColumns: isDropdown ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {alertCards.map(card => {
          const enabled = !!settings[card.enabledKey];
          return (
            <div key={card.title} style={{
              border: `1px solid ${!hasEmail ? '#e5e7eb' : enabled ? '#267ab0' : '#e5e7eb'}`,
              borderRadius: 12,
              padding: '16px',
              transition: 'all .2s',
              boxShadow: enabled && hasEmail ? '0 0 0 3px rgba(38,122,176,0.08)' : 'none',
              background: !hasEmail ? '#f9fafb' : enabled ? '#fafcff' : '#fff',
              opacity: !hasEmail ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flex: 1, color: enabled && hasEmail ? '#267ab0' : '#4b5563' }}>
                  <div style={{ marginTop: 2 }}>{card.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: !hasEmail ? '#9ca3af' : '#1a1a1a', marginBottom: 3 }}>{card.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{card.description}</div>
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => toggle(card.enabledKey)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none',
                    cursor: hasEmail ? 'pointer' : 'not-allowed',
                    background: enabled && hasEmail ? '#267ab0' : '#d1d5db',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}
                  disabled={!hasEmail}
                  aria-label={enabled ? 'Desactivar' : 'Activar'}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: (enabled && hasEmail) ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  }} />
                </button>
              </div>

              {/* Threshold */}
              {card.thresholdKey && (
                <div style={{
                  marginTop: 14, paddingTop: 14, borderTop: `1px solid ${enabled && hasEmail ? '#bfdbfe' : '#e5e7eb'}`,
                  opacity: enabled ? 1 : 0.5,
                  pointerEvents: enabled && hasEmail ? 'auto' : 'none'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <span style={{ flex: 1, color: !hasEmail ? '#9ca3af' : '#374151' }}>{card.thresholdLabel}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {card.thresholdUnit === '€' && <span style={{ fontSize: 13, color: '#6b7280' }}>€</span>}
                      <input
                        type="number"
                        min={card.thresholdMin!}
                        max={card.thresholdMax!}
                        value={settings[card.thresholdKey] as number}
                        onChange={e => setThreshold(card.thresholdKey!, Number(e.target.value))}
                        disabled={!hasEmail || !enabled}
                        style={{
                          width: 64, padding: '5px 8px', border: '1px solid #d1d5db',
                          borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                          outline: 'none', textAlign: 'center', fontWeight: 600, color: '#267ab0',
                          background: (!hasEmail || !enabled) ? '#f3f4f6' : '#fff'
                        }}
                      />
                      {card.thresholdUnit !== '€' && <span style={{ fontSize: 13, color: '#6b7280' }}>{card.thresholdUnit}</span>}
                    </div>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSaveSettings}
        disabled={savingSettings || !hasEmail}
        style={{
          marginTop: 24, width: '100%', padding: '12px 0', background: '#267ab0',
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 600, cursor: (savingSettings || !hasEmail) ? 'not-allowed' : 'pointer',
          opacity: (savingSettings || !hasEmail) ? 0.6 : 1, fontFamily: 'inherit', transition: 'all .2s',
        }}
      >
        {savingSettings ? 'Guardando…' : 'Guardar alertas'}
      </button>

      {toast && <ToastBanner type={toast.type} msg={toast.msg} />}
    </div>
  );
}

function ToastBanner({ type, msg }: { type: 'success' | 'error'; msg: string }) {
  return (
    <div style={{
      marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      background: type === 'success' ? '#dcfce7' : '#fee2e2',
      color: type === 'success' ? '#15803d' : '#dc2626',
      border: `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`,
    }}>
      {msg}
    </div>
  );
}
