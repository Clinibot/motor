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
  factory_errors_enabled: boolean;
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
    factory_errors_enabled: false,
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
    },
    {
      key: 'factory_errors_enabled' as const,
      title: 'Errores Técnicos de la Fábrica',
      description: 'Notificar fallos en el backend propio (Base de Datos, Vercel, Edge Functions).',
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-purple-500', bg: 'bg-purple-100'
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
                             placeholder={`admin${idx+1}@netelip.com`}
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

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5 flex gap-4 items-start shadow-sm mt-4">
         <div className="bg-white p-2 rounded-lg shadow-sm">
             <Globe className="w-5 h-5 text-indigo-600" />
         </div>
         <div className="flex-1">
             <h4 className="text-sm font-bold text-indigo-900 mb-2">Pasos obligatorios para la activación real en Retell:</h4>
             <p className="text-sm text-indigo-800 leading-relaxed mb-3">
                 Retell no expone API pública para la configuración de alertas. Tras activar estos interruptores aquí, deberás configurar el envío del Webhook manualmente en la cuenta de Retell de cada cliente (Tenant) para que la Fábrica sea notificada:
             </p>
             <ol className="list-decimal ml-4 space-y-2 text-sm text-indigo-800">
               <li>Accede al Dashboard de <strong>Retell AI</strong> y selecciona el Workspace del cliente.</li>
               <li>Navega a la sección secundaria <strong>Alerting</strong> y haz click en <strong>Create Rule</strong>.</li>
               <li>Selecciona la métrica a medir (ej. Call Count &gt; 20 para concurrencia o API Error Count &gt; 0).</li>
               <li>En el campo inferior <strong>Webhook URL</strong>, deberás pegar SIEMPRE nuestra ruta especializada adjuntando el ID del cliente:</li>
             </ol>
             <div className="mt-4 p-3 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-600 break-all select-all">
                https://lafabrica.netelip.com/api/retell/alerts-webhook?workspace_id=ID_DEL_WORKSPACE_AQUI
             </div>
             <p className="text-xs text-indigo-500 mt-3 font-semibold">
               * Nuestro sistema interceptará esa llamada y la validará usando la API Key privada del workspace para que sea 100% segura antes de avisarte vía Email o Webhook externo.
             </p>
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
