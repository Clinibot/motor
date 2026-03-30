"use client";

import React, { useEffect, useState, useRef } from 'react';
import DashboardSidebar from '../../../components/DashboardSidebar';
import DashboardTopbar from '../../../components/DashboardTopbar';
import { createClient } from '../../../lib/supabase/client';
import { useRouter } from 'next/navigation';

interface UserProfile {
  full_name?: string | null;
  email?: string | null;
  role: string;
  workspace_id?: string | null;
}

interface ExtendedWindow extends Window {
  chatOpen?: boolean;
  onHelpSearch?: (q: string) => void;
  showArticle?: (id: string) => void;
  showHelpHome?: () => void;
  toggleChat?: () => void;
  addMsg?: (role: string, text: string) => void;
  showTyping?: () => void;
  removeTyping?: () => void;
  getBotResponse?: (text: string) => { t: string; a: string | null };
  sendChat?: () => void;
  askElio?: (q: string) => void;
  buildArticleList?: () => void;
}

interface HelpArticle { cat: string; title: string; updated: string; body: string; }

const helpArticles: Record<string, HelpArticle> = {
    'crear-agente': {
        cat: 'Primeros pasos', title: 'Crear tu primer agente', updated: '18 mar 2026', body: `<p>Crear tu primer agente en la Fábrica de Agentes IA es un proceso guiado en 6 pasos. El asistente de configuración te irá pidiendo la información necesaria para que tu agente esté listo en minutos.</p><h2>Antes de empezar</h2><p>Asegúrate de tener a mano:</p><ul><li>El nombre que quieres darle a tu agente</li><li>El nombre de tu empresa</li><li>Una descripción breve de para qué lo vas a usar</li></ul><h2>Pasos para crear el agente</h2><ol class="step-list" ><li>Desde el dashboard, haz clic en <strong>+ Crear nuevo agente</strong>.</li><li>Rellena la información básica: nombre del agente y empresa.</li><li>Selecciona el modelo de IA y configura el comportamiento.</li><li>Elige la voz.</li><li>Configura el audio y las herramientas.</li><li>Revisa el resumen, sube documentos y haz clic en <strong>Crear agente</strong>.</li></ol><div class="help-callout" ><span>ℹ</span><span>Una vez creado, tu agente estará listo para recibir llamadas si tienes un número asignado.</span></div>`
    },
    'que-es-fabrica': {
        cat: 'Primeros pasos', title: 'Qué es la Fábrica de Agentes IA', updated: '15 mar 2026', body: `<p>La <strong>Fábrica de Agentes IA</strong> es una plataforma de netelip que te permite crear, configurar y gestionar agentes de voz inteligentes para tu negocio, sin necesidad de conocimientos técnicos.</p><h2>¿Qué puede hacer un agente?</h2><ul><li>Atender llamadas entrantes de forma automática</li><li>Gestionar citas sin intervención humana</li><li>Transferir llamadas al equipo correcto</li><li>Recopilar información del cliente</li><li>Funcionar 24/7</li></ul>`
    },
    'tipos-agente': {
        cat: 'Primeros pasos', title: 'Tipos de agente disponibles', updated: '15 mar 2026', body: `<p>La Fábrica permite crear agentes multiherramienta: cualificación, transferencia y reserva de citas pueden coexistir en el mismo agente.</p><h2>Herramientas disponibles</h2><ul><li><strong>Cualificación de lead</strong> — Recoge datos del contacto.</li><li><strong>Transferencia de llamadas</strong> — Deriva a departamentos o personas.</li><li><strong>Reserva de citas</strong> — Integrado con Cal.com.</li></ul><div class="help-callout" ><span>ℹ</span><span>Activa las herramientas que necesites en el paso 5 del wizard.</span></div>`
    },
    'requisitos': {
        cat: 'Primeros pasos', title: 'Requisitos previos para empezar', updated: '14 mar 2026', body: `<p>Para empezar necesitas:</p><ul><li>Cuenta netelip activa con la Fábrica contratada</li><li>Saldo en tu cuenta netelip</li><li>Al menos un número de teléfono asignado</li></ul>`
    },
    'wizard-paso1': {
        cat: 'Configurar el agente', title: 'Paso 1 — Información básica', updated: '18 mar 2026', body: `<p>El primer paso define la identidad de tu agente.</p><h2>Nombre del agente</h2><p>Elige un nombre natural como <em>Sofía, Carlos, Laura</em>.</p><h2>Nombre de la empresa</h2><p>Se usará para que el agente se identifique en las llamadas.</p><h2>Descripción de la empresa</h2><p>1-2 frases que el agente usará para contextualizarse.</p>`
    },
    'wizard-llm': {
        cat: 'Configurar el agente', title: 'Paso 2 — Modelo de IA y comportamiento', updated: '18 mar 2026', body: `<p>Configura el cerebro de tu agente.</p><h2>Modelos disponibles</h2><ul><li><strong>Gemini 3.0 Flash</strong> — Recomendado. Rápido y preciso.</li><li><strong>GPT-4.1</strong> — Alta capacidad de razonamiento.</li></ul><h2>Mensaje de inicio</h2><p>Lo primero que dice el agente al responder. Debe incluir presentación y aviso de grabación (obligatorio por LOPD).</p><div class="help-callout help-callout-warn" ><span>⚠</span><span>No elimines el aviso de grabación del mensaje de inicio. Es obligatorio por ley española.</span></div>`
    },
    'wizard-voz': {
        cat: 'Configurar el agente', title: 'Paso 3 — Selección de voz', updated: '16 mar 2026', body: `<p>Selecciona la voz de tu agente entre las disponibles en español, inglés y catalán.</p><h2>Voces disponibles</h2><ul><li>Adrián, Paloma (ElevenLabs)</li><li>Dario, Elena (Cartesia)</li><li>Tony (OpenAI, inglés)</li></ul><p>Haz clic en ▶ para escuchar la muestra de cada voz antes de elegir.</p>`
    },
    'wizard-herramientas': {
        cat: 'Configurar el agente', title: 'Paso 5 — Herramientas e integraciones', updated: '17 mar 2026', body: `<p>Las herramientas amplían las capacidades de tu agente.</p><h2>Cualificación de lead</h2><p>Define qué datos recoge el agente: nombre, email, motivo...</p><h2>Transferencia de llamadas</h2><p>Configura a qué número o extensión deriva el agente las llamadas.</p><h2>Reserva de citas (Cal.com)</h2><p>Integración con Cal.com para reservar citas en tu calendario. Necesitas tu API Key de Cal.com.</p><div class="help-callout help-callout-warn" ><span>⚠</span><span>La transferencia a extensiones internas requiere coordinación con el equipo técnico de netelip.</span></div>`
    },
    'gdpr': {
        cat: 'Configurar el agente', title: 'Cumplimiento RGPD y LOPD', updated: '15 mar 2026', body: `<p>Todos los agentes deben cumplir la normativa española.</p><h2>Obligaciones legales</h2><ol class="step-list" ><li><strong>Identificación como IA</strong> — El agente debe identificarse como sistema de IA.</li><li><strong>Aviso de grabación</strong> — Si grabas llamadas, debes informar al inicio.</li></ol><p>El generador de prompts incluye ambas declaraciones automáticamente en el mensaje de inicio.</p><div class="help-callout help-callout-warn" ><span>⚠</span><span>No elimines estas declaraciones. Hacerlo podría implicar un incumplimiento legal.</span></div>`
    },
    'asignar-numero': {
        cat: 'Mis números', title: 'Asignar un número a tu agente', updated: '16 mar 2026', body: `<p>Desde <strong>Mis números</strong> en el menú lateral puedes gestionar tus números.</p><h2>Asignar un número</h2><ol class="step-list" ><li>Ve a <strong>Mis números</strong>.</li><li>Selecciona el número a configurar.</li><li>Asigna el agente que gestionará las llamadas.</li><li>Guarda los cambios.</li></ol><div class="help-callout" ><span>ℹ</span><span>El cambio es inmediato. La próxima llamada ya la gestionará el agente asignado.</span></div>`
    },
    'sip-trunk': {
        cat: 'Mis números', title: 'Conectar mediante SIP', updated: '14 mar 2026', body: `<p>La Fábrica se integra con la Centralita Virtual de netelip a través de SIP.</p><h2>Flujo de una llamada</h2><ol class="step-list" ><li>El cliente llama a tu número de netelip.</li><li>La Centralita Virtual enruta la llamada al agente de IA.</li><li>El agente gestiona la conversación.</li><li>Si es necesario, transfiere a un agente humano.</li></ol><div class="help-callout" ><span>ℹ</span><span>Esta integración la gestiona el equipo técnico de netelip. Contacta con soporte para configurarla.</span></div>`
    },
    'llamadas-entrantes': {
        cat: 'Llamadas', title: 'Llamadas entrantes', updated: '17 mar 2026', body: `<p>Una vez que tienes número asignado y agente configurado, tu agente empieza a atender llamadas automáticamente.</p><h2>Probar tu agente</h2><p>Haz una llamada real al número asignado o usa la herramienta de prueba desde "Mis agentes" .</p>`
    },
    'transferencia': {
        cat: 'Llamadas', title: 'Transferencia de llamadas', updated: '17 mar 2026', body: `<p>La transferencia permite que el agente derive la conversación a un humano cuando sea necesario.</p><h2>¿Cuándo transfiere el agente?</h2><ul><li>Cuando el cliente lo solicita.</li><li>Cuando la consulta supera sus capacidades.</li><li>Según las reglas configuradas en el paso de Herramientas.</li></ul>`
    },
    'grabacion': {
        cat: 'Llamadas', title: 'Grabación y transcripción', updated: '16 mar 2026', body: `<p>Todas las llamadas se graban y transcriben automáticamente.</p><h2>¿Dónde las encuentro?</h2><p>En el historial del dashboard. Cada llamada incluye grabación, transcripción, resumen y análisis de sentimiento.</p><p>Se conservan durante <strong>90 días</strong>.</p><div class="help-callout help-callout-warn" ><span>⚠</span><span>Grabar sin informar es ilegal en España. Asegúrate de incluir el aviso en el mensaje de inicio.</span></div>`
    },
    'dashboard-metricas': {
        cat: 'Analítica', title: 'Dashboard de métricas', updated: '18 mar 2026', body: `<p>El dashboard muestra el rendimiento de todos tus agentes en tiempo real.</p><h2>Métricas principales</h2><ul><li><strong>Total de llamadas</strong></li><li><strong>Tasa de éxito</strong></li><li><strong>Duración promedio</strong></li><li><strong>Coste total</strong></li></ul><p>Usa el selector de período para filtrar por 7 días, 30 días o rango personalizado.</p>`
    },
    'tasa-exito': {
        cat: 'Analítica', title: 'Tasa de éxito de llamadas', updated: '16 mar 2026', body: `<p>Mide el porcentaje de llamadas gestionadas correctamente.</p><h2>¿Qué hacer si baja?</h2><ol class="step-list" ><li>Revisa el prompt del agente.</li><li>Analiza las transcripciones de las llamadas fallidas.</li><li>Verifica que las herramientas necesarias están activadas.</li></ol>`
    },
    'sentimiento': {
        cat: 'Analítica', title: 'Análisis de sentimiento', updated: '16 mar 2026', body: `<p>Evalúa cómo se ha sentido el cliente durante cada llamada.</p><h2>Categorías</h2><ul><li><strong>Positivo</strong> — El cliente resolvió su consulta satisfactoriamente.</li><li><strong>Neutro</strong> — Llamada informativa sin carga emocional.</li><li><strong>Negativo</strong> — El cliente mostró frustración o insatisfacción.</li></ul>`
    },
    'alertas-cliente': {
        cat: 'Analítica', title: 'Alertas y notificaciones', updated: '18 mar 2026', body: `<p>Recibes un email cuando alguna métrica supera los umbrales configurados.</p><h2>Alertas disponibles</h2><ul><li>Volumen de llamadas inusual</li><li>Tasa de éxito baja</li><li>Sentimiento negativo elevado</li><li>Transferencias fallidas</li></ul>`
    },
};

const botMap: Record<string, { t: string; a: string | null }> = {
    'primer agente': { t: 'Para crear tu primer agente, haz clic en <strong>+ Crear nuevo agente</strong> desde el dashboard. Son 6 pasos guiados.', a: 'crear-agente' },
    'crear': { t: 'Haz clic en <strong>+ Crear nuevo agente</strong> en el dashboard. Son 6 pasos y puedes guardarlo en cualquier momento.', a: 'crear-agente' },
    'número': { t: 'Desde <strong>Mis números</strong> en el menú lateral puedes asignar y gestionar los números de teléfono.', a: 'asignar-numero' },
    'teléfono': { t: 'Ve a <strong>Mis números</strong> para asignar un número a tu agente. El cambio es inmediato.', a: 'asignar-numero' },
    'métrica': { t: 'El dashboard muestra llamadas totales, tasa de éxito, duración promedio y coste.', a: 'dashboard-metricas' },
    'dashboard': { t: 'En el dashboard encuentras todas las métricas de tus agentes.', a: 'dashboard-metricas' },
    'éxito': { t: 'La tasa de éxito mide el porcentaje de llamadas resueltas correctamente. Si baja, revisa el prompt.', a: 'tasa-exito' },
    'sentimiento': { t: 'El análisis de sentimiento clasifica cada llamada como positiva, neutral o negativa.', a: 'sentimiento' },
    'transferencia': { t: 'La transferencia se configura en el paso 5 del wizard.', a: 'transferencia' },
    'alerta': { t: 'Las alertas se activan cuando una métrica supera el umbral configurado. Te llega un email.', a: 'alertas-cliente' },
    'grabación': { t: 'Todas las llamadas se graban automáticamente. Las encuentras en el historial durante 90 días.', a: 'grabacion' },
    'lopd': { t: 'El agente debe identificarse como IA e informar de la grabación. El generador lo incluye automáticamente.', a: 'gdpr' },
    'rgpd': { t: 'La plataforma cumple RGPD y LOPD. El mensaje de inicio incluye las declaraciones legales.', a: 'gdpr' },
    'prompt': { t: 'El generador crea las instrucciones del agente a partir del wizard. Puedes ajustarlo después.', a: 'wizard-llm' },
    'sip': { t: 'La conexión SIP te permite usar tu numeración actual de netelip.', a: 'sip-trunk' },
    'voz': { t: 'En el paso 3 del wizard puedes escuchar y seleccionar la voz de tu agente.', a: 'wizard-voz' },
    'cualificación': { t: 'La cualificación recoge datos del contacto: nombre, email, motivo... Se configura en el paso 5.', a: 'wizard-herramientas' },
    'cal.com': { t: 'Cal.com se integra en el paso 5 del wizard. Necesitas tu API Key y el ID de tipo de evento.', a: 'wizard-herramientas' },
};

export default function HelpPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
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

        // Initialization for help features
        const extendedWindow = window as unknown as ExtendedWindow;
        extendedWindow.chatOpen = false;

        extendedWindow.onHelpSearch = function (q: string) {
            const drop = document.getElementById('searchDrop');
            if (!drop) return;
            if (!q.trim()) {
                drop.style.display = 'none';
                return;
            }
            const res = Object.entries(helpArticles).filter(([, a]) => 
                a.title.toLowerCase().includes(q.toLowerCase()) || 
                a.cat.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 6);

            if (!res.length) {
                drop.style.display = 'none';
                return;
            }

            drop.innerHTML = res.map(([id, a]) => `
                <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--slate-100);display:flex;align-items:center;gap:10px;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='white'" onclick="showArticle('${id}')" >
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;background:var(--slate-100);color:var(--azul);padding:2px 7px;border-radius:4px;white-space:nowrap;" >${a.cat}</span>
                    <span style="font-size:13px;color:var(--slate-900);" >${a.title}</span>
                </div>`).join('');
            drop.style.display = 'block';
        };

        extendedWindow.showArticle = function (id: string) {
            const a = helpArticles[id];
            if (!a) return;
            const helpHome = document.getElementById('helpHome');
            const helpArticle = document.getElementById('helpArticle');
            if (helpHome) helpHome.style.display = 'none';
            if (helpArticle) helpArticle.style.display = 'block';

            const content = document.getElementById('articleContent');
            if (content) {
                content.innerHTML = `
                <div style="margin-bottom:20px;font-size:13px;color:var(--slate-500);display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;" onclick="showHelpHome()">
                    <i class="bi bi-arrow-left"></i> Volver al Centro de Ayuda
                </div>
                <div class="card-premium" style="padding:40px; max-width:800px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:var(--azul-light);color:var(--azul);padding:4px 12px;border-radius:100px;display:inline-block;margin-bottom:20px;">${a.cat}</div>
                    <h1 style="font-size:28px;font-weight:800;color:var(--slate-900);margin-bottom:8px;letter-spacing:-0.5px;">${a.title}</h1>
                    <div style="font-size:13px;color:var(--slate-400);margin-bottom:32px;padding-top:16px;border-top:1px solid var(--slate-100);">Actualizado el ${a.updated}</div>
                    <div class="help-body">${a.body}</div>
                    <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--slate-100);display:flex;justify-content:space-between;align-items:center;">
                        <button class="btn-s" onclick="showHelpHome()"><i class="bi bi-arrow-left"></i> Salir</button>
                        <button class="btn-p" onclick="askElio('Tengo una duda sobre: ${a.title}')"><i class="bi bi-chat-dots"></i> Hablar con Elio</button>
                    </div>
                </div>`;
            }
            window.scrollTo(0, 0);
        };

        extendedWindow.showHelpHome = function () {
            const helpHome = document.getElementById('helpHome');
            const helpArticle = document.getElementById('helpArticle');
            if (helpHome) helpHome.style.display = 'block';
            if (helpArticle) helpArticle.style.display = 'none';
            window.scrollTo(0, 0);
        };

        extendedWindow.toggleChat = function () {
            extendedWindow.chatOpen = !extendedWindow.chatOpen;
            const w = document.getElementById('chatWindow');
            const fab = document.getElementById('chatFab');
            if (!w || !fab) return;
            w.style.display = extendedWindow.chatOpen ? 'flex' : 'none';
            fab.style.display = extendedWindow.chatOpen ? 'none' : 'flex';

            const msgs = document.getElementById('chatMsgs');
            if (extendedWindow.chatOpen && msgs && msgs.children.length === 0) {
                extendedWindow.addMsg?.('bot', 'Hola 👋 Soy Elio, el asistente de la Fábrica. ¿En qué te puedo ayudar?');
            }
        };

        extendedWindow.addMsg = function (role: string, text: string) {
            const msgs = document.getElementById('chatMsgs');
            if (!msgs) return;
            const d = document.createElement('div');
            d.style.cssText = `display: flex; align-items: flex-start; gap: 8px; ${role === 'user' ? 'flex-direction:row-reverse;' : ''}`;

            if (role === 'bot') {
                d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--slate-900),var(--azul));color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--slate-50);border:1px solid var(--slate-100);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:240px;color:var(--slate-900);">${text}</div>`;
            } else {
                d.innerHTML = `<div style="background:var(--azul);color:white;border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:240px;">${text}</div>`;
            }

            msgs.appendChild(d);
            msgs.scrollTop = msgs.scrollHeight;
        };

        extendedWindow.showTyping = function () {
            const msgs = document.getElementById('chatMsgs');
            if (!msgs) return;
            const d = document.createElement('div');
            d.id = 'typingEl';
            d.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
            d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--slate-900),var(--azul));color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--slate-50);border:1px solid var(--slate-100);border-radius:12px;padding:12px 16px;display:flex;gap:4px;"><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .0s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .15s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .3s;display:inline-block;"></span></div>`;
            msgs.appendChild(d);
            msgs.scrollTop = msgs.scrollHeight;
        };

        extendedWindow.removeTyping = function () {
            const t = document.getElementById('typingEl');
            if (t) t.remove();
        };

        extendedWindow.getBotResponse = function (text: string): { t: string; a: string | null } {
            const l = text.toLowerCase();
            for (const [k, v] of Object.entries(botMap)) {
                if (l.includes(k)) return v;
            }
            return {
                t: 'No tengo una respuesta específica para eso. Te recomiendo buscar en el centro de ayuda o escribir a <strong>soporte@netelip.com</strong>.',
                a: null
            };
        };

        extendedWindow.sendChat = function () {
            const inp = document.getElementById('chatInp') as HTMLInputElement;
            if (!inp) return;
            const txt = inp.value.trim();
            if (!txt) return;
            inp.value = '';
            extendedWindow.addMsg?.('user', txt);
            extendedWindow.showTyping?.();

            setTimeout(() => {
                extendedWindow.removeTyping?.();
                const r = extendedWindow.getBotResponse?.(txt);
                if (r) {
                  let html = r.t;
                  if (r.a) html += `<br><br><span style="font-size:12px;color:var(--azul);cursor:pointer;text-decoration:underline;font-weight:600;" onclick="showArticle('${r.a}')" >Leer artículo completo</span>`;
                  extendedWindow.addMsg?.('bot', html);
                }
            }, 800);
        };

        extendedWindow.askElio = function (q: string) {
            if (!extendedWindow.chatOpen) extendedWindow.toggleChat?.();
            setTimeout(() => {
                const inp = document.getElementById('chatInp') as HTMLInputElement;
                if (inp) {
                    inp.value = q;
                    extendedWindow.sendChat?.();
                }
            }, 100);
        };

        extendedWindow.buildArticleList = function () {
            const el = document.getElementById('helpArticleList');
            if (!el) return;

            const secs = [
                { cat: 'Primeros pasos', arts: ['crear-agente', 'que-es-fabrica', 'tipos-agente', 'requisitos'] },
                { cat: 'Configurar el agente', arts: ['wizard-paso1', 'wizard-llm', 'wizard-voz', 'wizard-herramientas', 'gdpr'] },
                { cat: 'Llamadas', arts: ['llamadas-entrantes', 'transferencia', 'grabacion'] },
                { cat: 'Mis números', arts: ['asignar-numero', 'sip-trunk'] },
                { cat: 'Analítica', arts: ['dashboard-metricas', 'tasa-exito', 'sentimiento', 'alertas-cliente'] },
            ];

            el.innerHTML = secs.map(sec => sec.arts.map(artId => {
                const a = helpArticles[artId];
                if (!a) return '';
                return `
                    <div style="padding:16px 24px;border-bottom:1px solid var(--slate-100);cursor:pointer;display:flex;justify-content:space-between;align-items:center; transition: all 0.2s;" onmouseover="this.style.background='var(--slate-50)'" onmouseout="this.style.background='white'" onclick="showArticle('${artId}')" >
                        <div>
                            <div style="font-size:14px;font-weight:600;color:var(--slate-900);">${a.title}</div>
                            <div style="font-size:11px;color:var(--slate-400);text-transform:uppercase;letter-spacing:0.3px;margin-top:2px;">${sec.cat}</div>
                        </div>
                        <i class="bi bi-chevron-right" style="color:var(--slate-300);font-size:12px;"></i>
                    </div>`;
            }).join('')).join('');
        };

        extendedWindow.buildArticleList();
        extendedWindow.showHelpHome?.();
    }, [router]);

    const handleCreateAgent = (e: React.MouseEvent) => {
        e.preventDefault();
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
                <style dangerouslySetInnerHTML={{ __html: `
                    .help-page-container .help-body h2 {
                        font-size: 18px;
                        font-weight: 700;
                        margin-top: 32px;
                        margin-bottom: 12px;
                        color: var(--slate-900);
                    }
                    .help-body p {
                        margin-bottom: 16px;
                        color: var(--slate-600);
                        font-size: 15px;
                        line-height: 1.6;
                    }
                    .help-callout {
                        background: var(--azul-light);
                        border-left: 4px solid var(--azul);
                        padding: 16px 20px;
                        border-radius: 12px;
                        margin: 24px 0;
                        display: flex;
                        gap: 14px;
                        font-size: 14px;
                        color: var(--azul);
                        line-height: 1.5;
                    }
                    .help-callout-warn {
                        background: #fffbeb;
                        border-left-color: #f59e0b;
                        color: #92400e;
                    }
                    .help-body ul, .help-body ol {
                        padding-left: 20px;
                        margin-bottom: 16px;
                    }
                    .help-body li {
                        font-size: 15px;
                        color: var(--slate-600);
                        line-height: 1.7;
                        margin-bottom: 6px;
                    }
                    .help-body .step-list {
                        list-style: none;
                        padding: 0;
                        counter-reset: steps;
                    }
                    .help-body .step-list li {
                        counter-increment: steps;
                        display: flex;
                        gap: 14px;
                        align-items: flex-start;
                        margin-bottom: 12px;
                    }
                    .help-body .step-list li::before {
                        content: counter(steps);
                        min-width: 24px;
                        height: 24px;
                        background: var(--azul);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        font-weight: 800;
                        flex-shrink: 0;
                        margin-top: 2px;
                    }
                    @keyframes bounce {
                        0%, 80%, 100% { transform: translateY(0) }
                        40% { transform: translateY(-5px) }
                    }
                    .ask-btn {
                        width: 100%; text-align: left; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); 
                        border-radius: 10px; padding: 12px 14px; font-size: 13px; color: white; cursor: pointer; 
                        font-family: inherit; transition: all 0.2s;
                    }
                    .ask-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.25); }
                ` }} />

                <DashboardTopbar 
                    title="Ayuda y Soporte"
                    user={user}
                    isAlertPanelOpen={false}
                    setIsAlertPanelOpen={() => {}}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleCreateAgent={handleCreateAgent}
                    handleLogout={handleLogout}
                    dropdownRef={dropdownRef}
                />

                <div className="dashboard-content help-page-container">
                    <div id="helpHome">
                        <div className="content-header">
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 4px 0' }}>Centro de Ayuda</h2>
                                <p style={{ color: 'var(--slate-500)', fontSize: '14px', margin: 0 }}>Todo lo que necesitas saber para dominar la Fábrica de Agentes.</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px', position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '16px', padding: '0 20px', maxWidth: '600px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                                <i className="bi bi-search" style={{ color: 'var(--slate-400)', fontSize: '18px', flexShrink: 0 }}></i>
                                <input id="helpSearch" className="inp" style={{ border: 'none', background: 'none', padding: '16px', width: '100%' }} placeholder="Buscar guías, tutoriales o herramientas..." onInput={(e: React.ChangeEvent<HTMLInputElement>) => (window as unknown as ExtendedWindow).onHelpSearch?.(e.target.value)} autoCapitalize="off" />
                            </div>
                            <div id="searchDrop" style={{ display: 'none', maxWidth: '600px', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '16px', boxShadow: '0 12px 32px rgba(0,0,0,0.1)', marginTop: '8px', overflow: 'hidden', position: 'absolute', zIndex: 100, width: '100%' }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px', marginBottom: '40px' }}>
                            <div className="card-premium" style={{ background: 'linear-gradient(135deg, var(--azul), var(--azul-hover))', border: 'none', padding: '24px', color: 'white', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('crear-agente')}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
                                    <i className="bi bi-rocket-takeoff"></i>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Empezar de cero</div>
                                <div style={{ fontSize: '13px', opacity: 0.8, lineHeight: 1.4 }}>Cómo configurar tu primer agente en solo 6 pasos guiados.</div>
                            </div>
                            <div className="card-premium" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('asignar-numero')}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--slate-50)', color: 'var(--azul)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
                                    <i className="bi bi-telephone-plus"></i>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: 'var(--slate-900)' }}>Gestionar Números</div>
                                <div style={{ fontSize: '13px', color: 'var(--slate-500)', lineHeight: 1.4 }}>Asigna números SIP de netelip y conecta con tus clientes.</div>
                            </div>
                            <div className="card-premium" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('gdpr')}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--slate-50)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '16px' }}>
                                    <i className="bi bi-shield-check"></i>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px', color: 'var(--slate-900)' }}>RGPD y LOPD</div>
                                <div style={{ fontSize: '13px', color: 'var(--slate-500)', lineHeight: 1.4 }}>Información clave sobre cumplimiento legal y protección de datos.</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start' }}>
                            <div className="card-premium" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--slate-100)', background: 'var(--slate-50)', fontSize: '14px', fontWeight: 700, color: 'var(--slate-600)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Explorar por temas
                                </div>
                                <div id="helpArticleList"></div>
                            </div>

                            <div className="card-premium" style={{ background: 'linear-gradient(135deg, var(--slate-900), var(--azul))', border: 'none', padding: '32px', color: 'white', position: 'sticky', top: '100px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>E</div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 700 }}>Habla con Elio</div>
                                        <div style={{ fontSize: '12px', opacity: 0.7 }}>Tu asistente inteligente</div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px', lineHeight: 1.6 }}>Domina la Fábrica preguntándole a Elio. Conoce cada rincón de la plataforma.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                    <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Cómo creo un agente')} className="ask-btn">¿Cómo crear un agente?</button>
                                    <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Cómo asigno un número')} className="ask-btn">¿Cómo asignar un número?</button>
                                    <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Qué es la tasa de éxito')} className="ask-btn">¿Qué es la tasa de éxito?</button>
                                </div>
                                <button onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()} style={{ width: '100%', background: 'white', color: 'var(--azul)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <i className="bi bi-chat-dots"></i> Abrir Chat con Elio
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="helpArticle" style={{ display: 'none' }}>
                        <div id="articleContent"></div>
                    </div>

                    {/* CHAT ELIO WINDOW */}
                    <div id="chatWindow" style={{ position: 'fixed', bottom: '80px', right: '30px', width: '360px', height: '520px', background: 'white', border: '1px solid var(--slate-200)', borderRadius: '24px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', display: 'none', flexDirection: 'column', zIndex: 500, overflow: 'hidden' }}>
                        <div style={{ padding: '20px', background: 'linear-gradient(135deg, var(--slate-900), var(--azul))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white' }}>E</div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Elio Assistant</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>En línea • Resolución instantánea</div>
                                </div>
                            </div>
                            <button onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        <div id="chatMsgs" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}></div>
                        <div style={{ padding: '16px', background: 'var(--slate-50)', borderTop: '1px solid var(--slate-100)', display: 'flex', gap: '10px' }}>
                            <input id="chatInp" className="inp" style={{ flex: 1, border: '1px solid var(--slate-200)', borderRadius: '12px', padding: '12px 14px', fontSize: '14px' }} placeholder="Escribe tu duda..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (window as unknown as ExtendedWindow).sendChat?.()} />
                            <button onClick={() => (window as unknown as ExtendedWindow).sendChat?.()} className="btn-p" style={{ padding: '12px 16px', borderRadius: '12px' }}><i className="bi bi-send-fill"></i></button>
                        </div>
                    </div>

                    <button onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()} id="chatFab" style={{ position: 'fixed', bottom: '40px', right: '40px', width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg, var(--slate-900), var(--azul))', border: 'none', color: 'white', fontSize: '28px', cursor: 'pointer', boxShadow: '0 8px 24px rgba(38,122,176,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 499 }}>
                        <i className="bi bi-chat-dots-fill"></i>
                    </button>
                </div>
            </div>
        </div>
    );
}
