"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Save, Bell, Globe, Activity, Repeat, Wrench, AlertTriangle } from 'lucide-react';

interface AdminAlertSettingsData {
  emails: string[];
  webhook_url: string;
  api_errors_enabled: boolean;
  transfer_failures_enabled: boolean;
  custom_functions_enabled: boolean;
  concurrency_enabled: boolean;
}

export default function AdminAlertSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdminAlertSettingsData>({
    emails: [''],
    webhook_url: '',
    api_errors_enabled: false,
    transfer_failures_enabled: false,
    custom_functions_enabled: false,
    concurrency_enabled: false,
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/alerts')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          // ensure at least one email input box is shown
          const loadedEmails = (data.settings.emails && data.settings.emails.length > 0) ? data.settings.emails : [''];
          setSettings({ ...data.settings, emails: loadedEmails, webhook_url: data.settings.webhook_url || '' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    // filter out empty emails before sending
    const cleanedEmails = settings.emails.filter(e => e.trim() !== '');
    const payload = { ...settings, emails: cleanedEmails };

    try {
      const res = await fetch('/api/admin/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Configuración de alertas globales guardada.');
        // Ensure UI maintains at least one empty box if needed, or simply reflects DB state
        setSettings({ ...payload, emails: cleanedEmails.length > 0 ? cleanedEmails : [''] });
      } else {
        showToast('error', data.error || 'Error al guardar.');
      }
    } catch {
      showToast('error', 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const updateEmail = (index: number, val: string) => {
    const newEmails = [...settings.emails];
    newEmails[index] = val;
    setSettings({ ...settings, emails: newEmails });
  };

  const addEmailSlot = () => {
    if (settings.emails.length >= 3) return;
    setSettings({ ...settings, emails: [...settings.emails, ''] });
  };

  const removeEmailSlot = (index: number) => {
    if (settings.emails.length <= 1) {
      setSettings({...settings, emails: ['']}); // just empty it if it's the last one
      return;
    }
    const newEmails = [...settings.emails];
    newEmails.splice(index, 1);
    setSettings({ ...settings, emails: newEmails });
  };

  const toggleParam = (key: keyof AdminAlertSettingsData) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  if (loading) {
     return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  }

  const alertTypes = [
    {
      key: 'api_errors_enabled' as const,
      title: 'Errores de API (Integraciones)',
      description: 'Notificar fallos graves de comunicación con Retell, Supabase o servicios vitales.',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-rose-500', bg: 'bg-rose-100'
    },
    {
      key: 'transfer_failures_enabled' as const,
      title: 'Fallos en Transferencias',
      description: 'Avisar cuando una llamada no logra ser transferida a un número destino.',
      icon: <Repeat className="w-5 h-5" />,
      color: 'text-amber-500', bg: 'bg-amber-100'
    },
    {
      key: 'custom_functions_enabled' as const,
      title: 'Fallo de Funciones Personalizadas',
      description: 'Detectar errores internos cuando el agente ejecuta una herramienta (custom tool).',
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-indigo-500', bg: 'bg-indigo-100'
    },
    {
      key: 'concurrency_enabled' as const,
      title: 'Picos de Concurrencia',
      description: 'Alertar sobre rechazos debido a alcanzar límites de simultaneidad globales rápidos.',
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-orange-500', bg: 'bg-orange-100'
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex gap-4 items-start shadow-sm">
         <div className="bg-white p-2 rounded-lg shadow-sm">
             <Bell className="w-6 h-6 text-indigo-600" />
         </div>
         <div>
             <h4 className="text-base font-bold text-indigo-900 mb-1">Centro de Monitoreo Crítico (Super Admin)</h4>
             <p className="text-sm text-indigo-700 leading-relaxed">
                 Configura los receptores (canales) y qué tipo de anomalías globales dispararán alertas automáticas a tu equipo de desarrollo o administración.<br/>
                 Puedes asignar hasta 3 correos y un Webhook de tu propio sistema (ej. un canal de Slack/Discord).
             </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Email Settings */}
          <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-semibold text-gray-800 flex justify-between items-center">
                  <span>Emails Receptores</span>
                  <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">{settings.emails.length}/3</span>
              </div>
              <div className="p-6 space-y-4">
                  {settings.emails.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                          <input 
                             type="email"
                             value={email}
                             placeholder={`admin${idx+1}@tuempresa.com`}
                             onChange={e => updateEmail(idx, e.target.value)}
                             className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => removeEmailSlot(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  ))}
                  {settings.emails.length < 3 && (
                      <button 
                         onClick={addEmailSlot}
                         className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800"
                      >
                         <Plus className="w-4 h-4"/> Añadir otro correo
                      </button>
                  )}
              </div>
          </div>

          {/* Webhook Settings */}
          <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-semibold text-gray-800 flex gap-2 items-center">
                  <Globe className="w-4 h-4" /> Endpoint Webhook (REST)
              </div>
              <div className="p-6">
                 <p className="text-sm text-gray-500 mb-3">
                   Recibe un <code className="bg-gray-100 px-1 rounded text-red-600">POST</code> instantáneo con el JSON entero del error en cada eventualidad.
                 </p>
                 <input 
                    type="url"
                    value={settings.webhook_url}
                    onChange={e => setSettings({...settings, webhook_url: e.target.value})}
                    placeholder="https://hook.eu1.make.com/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
              </div>
          </div>
      </div>

      <div className="bg-white border text-gray-800 border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 font-semibold text-gray-800">
                  Tipos de Anomalias Activas
              </div>
              <div className="p-6 flex flex-col gap-4">
                  {alertTypes.map(card => {
                      const enabled = settings[card.key as keyof AdminAlertSettingsData];
                      return (
                          <div 
                              key={card.key} 
                              onClick={() => toggleParam(card.key)}
                              className={`flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition-colors ${enabled ? 'border-indigo-400 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-300'}`}
                           >
                              <div className={`p-2 rounded-lg ${enabled ? card.bg : 'bg-gray-100'} ${enabled ? card.color : 'text-gray-400'}`}>
                                  {card.icon}
                              </div>
                              <div className="flex-1">
                                  <div className={`font-semibold ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{card.title}</div>
                                  <div className="text-sm text-gray-500 mt-1 leading-snug">{card.description}</div>
                              </div>
                              <div className="ml-4 pt-1">
                                  <button
                                    className={`w-11 h-6 rounded-full border-none relative transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                                  >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>
      </div>

      <div className="flex items-center gap-4 border-t pt-6">
        <button
           onClick={handleSave}
           disabled={saving}
           className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
           {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
           Guardar Cambios
        </button>

        {toast && (
            <div className={`text-sm font-semibold ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'} transition-opacity animation-fade-in`}>
                {toast.type === 'success' ? '✓ ' : '✕ '} {toast.msg}
            </div>
        )}
      </div>

    </div>
  );
}
