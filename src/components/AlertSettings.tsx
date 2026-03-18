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

export default function AlertSettings() {
  const [step, setStep] = useState<'loading' | 'email' | 'settings'>('loading');
  const [settings, setSettings] = useState<AlertSettingsData>(DEFAULT);
  const [emailInput, setEmailInput] = useState('');
  const [saving, setSaving] = useState(false);
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
          setStep(data.settings.alert_email ? 'settings' : 'email');
        } else {
          setStep('email');
        }
      } catch {
        setStep('email');
      }
    })();
  }, []);

  const handleSetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, alert_email: emailInput }),
      });
      if (res.ok) {
        setSettings(s => ({ ...s, alert_email: emailInput }));
        setStep('settings');
        showToast('success', 'Email guardado correctamente');
      } else throw new Error();
    } catch {
      showToast('error', 'Error al guardar el email');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
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
      setSaving(false);
    }
  };

  const toggle = (key: keyof AlertSettingsData) => {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const setThreshold = (key: keyof AlertSettingsData, value: number) => {
    setSettings(s => ({ ...s, [key]: value }));
  };

  if (step === 'loading') {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <div style={{ width: 28, height: 28, border: '3px solid #e5e7eb', borderTop: '3px solid #267ab0', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
      </div>
    );
  }

  if (step === 'email') {
    return (
      <div style={{ padding: '8px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6fb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="26" height="26" fill="none" stroke="#267ab0" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px' }}>Configura tus alertas</h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Introduce el email donde quieres recibir los avisos de tu agente.
          </p>
        </div>
        <form onSubmit={handleSetEmail}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Email para alertas
          </label>
          <input
            type="email"
            required
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            placeholder="tu@empresa.com"
            style={{
              width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8,
              border: '1px solid #e5e7eb', outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', transition: 'border-color .2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#267ab0')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 14, width: '100%', padding: '11px 0', background: '#267ab0',
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              fontFamily: 'inherit',
            }}
          >
            {saving ? 'Guardando…' : 'Continuar →'}
          </button>
        </form>
        {toast && <ToastBanner type={toast.type} msg={toast.msg} />}
      </div>
    );
  }

  const alertCards = [
    {
      icon: '📋',
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
      icon: '📉',
      title: 'Tasa de éxito baja',
      description: 'Avísame si la tasa de éxito de las llamadas cae por debajo del umbral.',
      enabledKey: 'low_success_rate_enabled' as keyof AlertSettingsData,
      thresholdKey: 'low_success_rate_threshold' as keyof AlertSettingsData,
      thresholdLabel: 'Alertar si la tasa de éxito baja de',
      thresholdUnit: '%',
      thresholdMin: 10,
      thresholdMax: 100,
    },
    {
      icon: '😟',
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
      icon: '💸',
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

  return (
    <div>
      {/* Email row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd', marginBottom: 20, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" fill="none" stroke="#267ab0" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 500 }}>{settings.alert_email}</span>
        </div>
        <button
          onClick={() => setStep('email')}
          style={{ fontSize: 12, color: '#267ab0', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
        >
          Cambiar
        </button>
      </div>

      {/* Alert cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {alertCards.map(card => {
          const enabled = !!settings[card.enabledKey];
          return (
            <div key={card.title} style={{
              border: `1px solid ${enabled ? '#267ab0' : '#e5e7eb'}`,
              borderRadius: 12,
              padding: '16px',
              transition: 'border-color .2s, box-shadow .2s',
              boxShadow: enabled ? '0 0 0 3px rgba(38,122,176,0.08)' : 'none',
              background: enabled ? '#fafcff' : '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{card.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 3 }}>{card.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{card.description}</div>
                  </div>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => toggle(card.enabledKey)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: enabled ? '#267ab0' : '#d1d5db',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}
                  aria-label={enabled ? 'Desactivar' : 'Activar'}
                >
                  <span style={{
                    position: 'absolute', top: 3, left: enabled ? 23 : 3,
                    width: 18, height: 18, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                  }} />
                </button>
              </div>

              {/* Threshold (only when enabled and has a threshold) */}
              {enabled && card.thresholdKey && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    <span style={{ flex: 1 }}>{card.thresholdLabel}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {card.thresholdUnit === '€' && <span style={{ fontSize: 13, color: '#6b7280' }}>€</span>}
                      <input
                        type="number"
                        min={card.thresholdMin!}
                        max={card.thresholdMax!}
                        value={settings[card.thresholdKey] as number}
                        onChange={e => setThreshold(card.thresholdKey!, Number(e.target.value))}
                        style={{
                          width: 64, padding: '5px 8px', border: '1px solid #d1d5db',
                          borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
                          outline: 'none', textAlign: 'center', fontWeight: 600, color: '#267ab0',
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

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          marginTop: 20, width: '100%', padding: '12px 0', background: '#267ab0',
          color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
          fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1, fontFamily: 'inherit', transition: 'all .2s',
        }}
      >
        {saving ? 'Guardando…' : 'Guardar alertas'}
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
