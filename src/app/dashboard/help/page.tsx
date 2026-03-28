/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";

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
    useEffect(() => {
        // Initialization
        (window as any).chatOpen = false;

        (window as any).onHelpSearch = function (q: string) {
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
                <div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;gap:10px;" onmouseover="this.style.background='var(--gris-bg)'" onmouseout="this.style.background='white'" onclick="showArticle('${id}')" >
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;background:var(--azul-light);color:var(--azul);padding:2px 7px;border-radius:4px;white-space:nowrap;" >${a.cat}</span>
                    <span style="font-size:13px;" >${a.title}</span>
                </div>`).join('');
            drop.style.display = 'block';
        };

        (window as any).showArticle = function (id: string) {
            const a = helpArticles[id];
            if (!a) return;
            const helpHome = document.getElementById('helpHome');
            const helpArticle = document.getElementById('helpArticle');
            if (helpHome) helpHome.style.display = 'none';
            if (helpArticle) helpArticle.style.display = 'block';

            const content = document.getElementById('articleContent');
            if (content) {
                content.innerHTML = `
                <div style="margin-bottom:14px;font-size:12px;color:var(--gris-texto);display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="showHelpHome()">
                    <i class="bi bi-arrow-left"></i>Volver a ayuda
                </div>
                <div style="background:white;border:1px solid var(--gris-borde);border-radius:var(--r-lg);padding:32px;max-width:700px;">
                    <div style="font-size:11px;font-weight:700;background:var(--azul-light);color:var(--azul);padding:3px 10px;border-radius:12px;display:inline-block;margin-bottom:14px;">${a.cat}</div>
                    <h1 style="font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:-.3px;">${a.title}</h1>
                    <div style="font-size:12px;color:var(--gris-texto);margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--gris-borde);">Actualizado el ${a.updated}</div>
                    <div class="help-body">${a.body}</div>
                    <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--gris-borde);display:flex;justify-content:space-between;align-items:center;">
                        <button class="btn-s" onclick="showHelpHome()"><i class="bi bi-arrow-left"></i>Volver a ayuda</button>
                        <button class="btn-p" onclick="askElio('Tengo una duda sobre: ${a.title}')"><i class="bi bi-chat-dots"></i>Preguntarle a Elio</button>
                    </div>
                </div>`;
            }
            window.scrollTo(0, 0);
        };

        (window as any).showHelpHome = function () {
            const helpHome = document.getElementById('helpHome');
            const helpArticle = document.getElementById('helpArticle');
            if (helpHome) helpHome.style.display = 'block';
            if (helpArticle) helpArticle.style.display = 'none';
            window.scrollTo(0, 0);
        };

        (window as any).toggleChat = function () {
            (window as any).chatOpen = !(window as any).chatOpen;
            const w = document.getElementById('chatWindow');
            const fab = document.getElementById('chatFab');
            if (!w || !fab) return;
            w.style.display = (window as any).chatOpen ? 'flex' : 'none';
            fab.style.display = (window as any).chatOpen ? 'none' : 'flex';

            const msgs = document.getElementById('chatMsgs');
            if ((window as any).chatOpen && msgs && msgs.children.length === 0) {
                (window as any).addMsg('bot', 'Hola 👋 Soy Elio, el asistente de la Fábrica. ¿En qué te puedo ayudar?');
            }
        };

        (window as any).addMsg = function (role: string, text: string) {
            const msgs = document.getElementById('chatMsgs');
            if (!msgs) return;
            const d = document.createElement('div');
            d.style.cssText = `display: flex; align-items: flex-start; gap: 8px; ${role === 'user' ? 'flex-direction:row-reverse;' : ''}`;

            if (role === 'bot') {
                d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a2428,#267ab0);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:230px;">${text}</div>`;
            } else {
                d.innerHTML = `<div style="background:var(--azul);color:white;border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:230px;">${text}</div>`;
            }

            msgs.appendChild(d);
            msgs.scrollTop = msgs.scrollHeight;
        };

        (window as any).showTyping = function () {
            const msgs = document.getElementById('chatMsgs');
            if (!msgs) return;
            const d = document.createElement('div');
            d.id = 'typingEl';
            d.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
            d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a2428,#267ab0);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:12px;padding:12px 16px;display:flex;gap:4px;"><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .0s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .15s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .3s;display:inline-block;"></span></div>`;
            msgs.appendChild(d);
            msgs.scrollTop = msgs.scrollHeight;
        };

        (window as any).removeTyping = function () {
            const t = document.getElementById('typingEl');
            if (t) t.remove();
        };

        (window as any).getBotResponse = function (text: string): { t: string; a: string | null } {
            const l = text.toLowerCase();
            for (const [k, v] of Object.entries(botMap)) {
                if (l.includes(k)) return v;
            }
            return {
                t: 'No tengo una respuesta específica para eso. Te recomiendo buscar en el centro de ayuda o escribir a <strong>soporte@netelip.com</strong>.',
                a: null
            };
        };

        (window as any).sendChat = function () {
            const inp = document.getElementById('chatInp') as HTMLInputElement;
            if (!inp) return;
            const txt = inp.value.trim();
            if (!txt) return;
            inp.value = '';
            (window as any).addMsg('user', txt);
            (window as any).showTyping();

            setTimeout(() => {
                (window as any).removeTyping();
                const r = (window as any).getBotResponse(txt);
                let html = r.t;
                if (r.a) html += `<br><br><span style="font-size:12px;color:var(--azul);cursor:pointer;text-decoration:underline;" onclick="showArticle('${r.a}')" >Ver artículo completo</span>`;
                (window as any).addMsg('bot', html);
            }, 800);
        };

        (window as any).askElio = function (q: string) {
            if (!(window as any).chatOpen) (window as any).toggleChat();
            setTimeout(() => {
                const inp = document.getElementById('chatInp') as HTMLInputElement;
                if (inp) {
                    inp.value = q;
                    (window as any).sendChat();
                }
            }, 100);
        };

        (window as any).buildArticleList = function () {
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
                    <div style="padding:12px 20px;border-bottom:1px solid var(--gris-borde);cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='var(--gris-bg)'" onmouseout="this.style.background='white'" onclick="showArticle('${artId}')" >
                        <div>
                            <div style="font-size:13px;font-weight:600;">${a.title}</div>
                            <div style="font-size:11px;color:var(--gris-texto);">${sec.cat}</div>
                        </div>
                        <i class="bi bi-chevron-right" style="color:var(--gris-texto);font-size:12px;"></i>
                    </div>`;
            }).join('')).join('');
        };

        (window as any).buildArticleList();
        (window as any).showHelpHome();
    }, []);

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", minHeight: '100vh', backgroundColor: '#f9fafb' }}>
            <DashboardSidebar />
            <main style={{ marginLeft: '260px', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <style dangerouslySetInnerHTML={{ __html: `
                    /* Restaura estilos del Sidebar (estándar en la app) */
                    .sidebar { width: 260px !important; background:#fff; border-right:1px solid #e5e7eb; height:100vh; position:fixed; left:0; top:0; display:flex; flex-direction:column; z-index:100; }
                    .sidebar-logo-container { padding: 24px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #f3f4f6; margin-bottom: 20px; }
                    .logo-badge { width: 36px; height: 36px; background: linear-gradient(135deg, #267ab0 0%, #1e5a87 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 18px; box-shadow: 0 4px 10px rgba(38,122,176,0.2); }
                    .logo-text-group { display: flex; flex-direction: column; }
                    .logo-main-text { font-size: 16px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.3px; line-height: 1.2; }
                    .logo-sub-text { font-size: 12px; color: #6b7280; font-weight: 500; }
                    .nav-menu { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
                    .nav-icon { width: 20px !important; height: 20px !important; margin-right: 12px; flex-shrink: 0; }
                    .nav-item { display: flex; align-items: center; padding: 12px 20px; color: #6b7280; text-decoration: none; transition: all .2s; font-size: 14px; font-weight: 500; cursor: pointer; border-right: 3px solid transparent; }
                    .nav-item:hover { background: #f9fafb; color: #267ab0; }
                    .nav-item.active { background: #eff6fb; color: #267ab0; border-right-color: #267ab0; font-weight: 600; }

                    .help-page-container {
                        --azul: #267ab0;
                        --azul-hover: #1e6291;
                        --azul-light: #eff6fb;
                        --gris-bg: #f5f6f8;
                        --gris-borde: #e5e7eb;
                        --gris-texto: #6c757d;
                        --oscuro: #1a2428;
                        --exito: #10b981;
                        --amarillo: #f59e0b;
                        --rojo: #ef4444;
                        --blanco: #ffffff;
                        --r-sm: 6px;
                        --r-md: 8px;
                        --r-lg: 12px;
                    }

                    .help-page-container .help-body h2 {
                        font-size: 16px;
                        font-weight: 700;
                        margin-top: 24px;
                        margin-bottom: 10px;
                        color: var(--oscuro);
                    }

                    .help-body p {
                        margin-bottom: 14px;
                        color: #4b5563;
                        font-size: 14px;
                    }

                    .help-callout {
                        background: #f0f9ff;
                        border-left: 4px solid var(--azul);
                        padding: 14px 16px;
                        border-radius: var(--r-sm);
                        margin: 20px 0;
                        display: flex;
                        gap: 12px;
                        font-size: 13px;
                        color: #0c4a6e;
                    }

                    .help-callout-warn {
                        background: #fffbeb;
                        border-left-color: var(--amarillo);
                        color: #92400e;
                    }

                    .help-body ul, .help-body ol {
                        padding-left: 20px;
                        margin-bottom: 14px;
                    }

                    .help-body li {
                        font-size: 14px;
                        color: #374151;
                        line-height: 1.75;
                        margin-bottom: 4px;
                    }

                    .help-body .step-list {
                        list-style: none;
                        padding: 0;
                        counter-reset: steps;
                    }

                    .help-body .step-list li {
                        counter-increment: steps;
                        display: flex;
                        gap: 12px;
                        align-items: flex-start;
                        margin-bottom: 10px;
                    }

                    .help-body .step-list li::before {
                        content: counter(steps);
                        min-width: 22px;
                        height: 22px;
                        background: var(--azul);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 11px;
                        font-weight: 800;
                        flex-shrink: 0;
                        margin-top: 3px;
                    }

                    .btn-p {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 18px;
                        background: var(--azul);
                        color: white;
                        border: none;
                        border-radius: var(--r-md);
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: inherit;
                        transition: background .2s;
                    }

                    .btn-p:hover {
                        background: var(--azul-hover);
                    }

                    .btn-s {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 18px;
                        background: var(--blanco);
                        color: var(--gris-texto);
                        border: 1px solid var(--gris-borde);
                        border-radius: var(--r-md);
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: inherit;
                        transition: all .15s;
                    }

                    .btn-s:hover {
                        border-color: #9ca3af;
                        color: var(--oscuro);
                    }

                    .inp {
                        width: 100%;
                        padding: 10px 14px;
                        border: 1px solid var(--gris-borde);
                        border-radius: var(--r-md);
                        font-size: 13px;
                        color: var(--oscuro);
                        background: var(--blanco);
                        outline: none;
                        font-family: inherit;
                        transition: border-color .15s;
                    }

                    .inp:focus {
                        border-color: var(--azul);
                        box-shadow: 0 0 0 3px rgba(38, 122, 176, .1);
                    }

                    @keyframes bounce {
                        0%, 80%, 100% { transform: translateY(0) }
                        40% { transform: translateY(-5px) }
                    }
                ` }} />
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

                <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] px-8 flex items-center justify-between h-14">
                    <h1 className="text-lg font-bold tracking-tight">Ayuda y soporte</h1>
                    <div className="flex items-center gap-2.5">
                        <button className="btn-s" onClick={() => (window as any).toggleChat()}>
                            <i className="bi bi-chat-dots"></i> Preguntarle a Elio
                        </button>
                    </div>
                </header>

                <div className="p-8 help-page-container">
                    <div id="helpHome">
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '0 16px', maxWidth: '500px' }}>
                                <i className="bi bi-search" style={{ color: 'var(--gris-texto)', fontSize: '15px', flexShrink: 0 }}></i>
                                <input id="helpSearch" className="inp" style={{ border: 'none', background: 'none', padding: '12px' }} placeholder="Buscar en el centro de ayuda..." onInput={(e: any) => (window as any).onHelpSearch(e.target.value)} autoCapitalize="off" />
                            </div>
                            <div id="searchDrop" style={{ display: 'none', maxWidth: '500px', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', boxShadow: '0 8px 24px rgba(0,0,0,.1)', marginTop: '4px', overflow: 'hidden' }}></div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
                            <div style={{ background: 'linear-gradient(135deg,var(--azul),var(--azul-hover))', borderRadius: 'var(--r-lg)', padding: '22px', color: 'white', cursor: 'pointer' }} onClick={() => (window as any).showArticle('crear-agente')}>
                                <i className="bi bi-rocket-takeoff" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', opacity: 0.85 }}></i>
                                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Crear tu primer agente</div>
                                <div style={{ fontSize: '12px', opacity: 0.75 }}>Guía paso a paso en 6 pasos.</div>
                            </div>
                            <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as any).showArticle('asignar-numero')}>
                                <i className="bi bi-telephone-plus" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: 'var(--exito)' }}></i>
                                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Asignar un número</div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Conecta tu número SIP de netelip.</div>
                            </div>
                            <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as any).showArticle('gdpr')}>
                                <i className="bi bi-shield-check" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: 'var(--amarillo)' }}></i>
                                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>RGPD y LOPD</div>
                                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Cumplimiento legal en España.</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
                            <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gris-borde)', fontSize: '14px', fontWeight: 700 }}>Artículos de ayuda</div>
                                <div id="helpArticleList"></div>
                            </div>

                            <div style={{ background: 'linear-gradient(135deg,#1a2428,#267ab0)', borderRadius: 'var(--r-lg)', padding: '24px', color: 'white', position: 'sticky', top: '80px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800 }}>E</div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>Pregúntale a Elio</div>
                                        <div style={{ fontSize: '11px', opacity: 0.7 }}>Asistente de la Fábrica</div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '12.5px', opacity: 0.8, marginBottom: '16px', lineHeight: 1.6 }}>Elio conoce toda la documentación y puede resolver tus dudas al instante.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                    <button onClick={() => (window as any).askElio('Cómo creo un agente')} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Cómo creo un agente?</button>
                                    <button onClick={() => (window as any).askElio('Cómo asigno un número')} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Cómo asigno un número?</button>
                                    <button onClick={() => (window as any).askElio('Qué es la tasa de éxito')} style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Qué es la tasa de éxito?</button>
                                </div>
                                <button onClick={() => (window as any).toggleChat()} style={{ width: '100%', background: 'white', color: 'var(--azul)', border: 'none', borderRadius: '8px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <i className="bi bi-chat-dots"></i> Abrir chat con Elio
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="helpArticle" style={{ display: 'none' }}>
                        <div id="articleContent"></div>
                    </div>

                    {/* CHAT ELIO */}
                    <div id="chatWindow" style={{ position: 'fixed', bottom: '60px', right: '20px', width: '340px', height: '480px', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', display: 'none', flexDirection: 'column', zIndex: 500 }}>
                        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#1a2428,#267ab0)', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>E</div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Elio</div>
                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Asistente de la Fábrica</div>
                                </div>
                            </div>
                            <button onClick={() => (window as any).toggleChat()} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        <div id="chatMsgs" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}></div>
                        <div style={{ padding: '12px', borderTop: '1px solid var(--gris-borde)', display: 'flex', gap: '8px' }}>
                            <input id="chatInp" className="inp" style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }} placeholder="Escribe tu pregunta..." onKeyDown={(e: any) => e.key === 'Enter' && (window as any).sendChat()} />
                            <button onClick={() => (window as any).sendChat()} className="btn-p" style={{ padding: '9px 14px' }}><i className="bi bi-send"></i></button>
                        </div>
                    </div>
                    <button onClick={() => (window as any).toggleChat()} style={{ position: 'fixed', bottom: '60px', right: '20px', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,#1a2428,#267ab0)', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(38,122,176,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 499 }} id="chatFab">
                        <i className="bi bi-chat-dots-fill"></i>
                    </button>
                </div>
            </main>
        </div>
    );
}
