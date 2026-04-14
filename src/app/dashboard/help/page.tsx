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
  sendChat?: () => void;
  askElio?: (q: string) => void;
  buildArticleList?: () => void;
  toggleHelpSec?: (idx: number) => void;
  getBotResponse?: (text: string) => { t: string; a: string | null };
}

export default function HelpPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email, role, workspace_id')
        .eq('id', session.user.id)
        .single();
      setUser(profile);
    };
    loadProfile();

    const w = window as unknown as ExtendedWindow;
    w.chatOpen = false;

    const helpArticles: Record<string, { cat: string; title: string; updated: string; body: string }> = {
      'crear-agente': {
        cat: 'Primeros pasos', title: 'Crear tu primer agente', updated: '18 mar 2026',
        body: `<p>Crear tu primer agente en la Fábrica de Agentes IA es un proceso guiado paso a paso. El asistente de configuración te irá pidiendo la información necesaria para que tu agente esté listo en minutos.</p><h2>Antes de empezar</h2><p>Asegúrate de tener a mano:</p><ul><li>El nombre que quieres darle a tu agente (ej: Elio, Sofía, Laura)</li><li>El nombre de tu empresa</li><li>Una descripción breve de para qué lo vas a usar</li><li>El número de teléfono asignado (si ya tienes uno)</li></ul><h2>Los 6 pasos del asistente</h2><ol class="step-list"><li><strong>Información básica</strong> — Nombre del agente, empresa y descripción.</li><li><strong>Cerebro (LLM)</strong> — Modelo de IA, quién habla primero, mensaje de inicio, personalidad y tono.</li><li><strong>Voz</strong> — Selección de voz entre ElevenLabs, Cartesia y OpenAI. También puedes clonar tu propia voz.</li><li><strong>Audio</strong> — Volumen del agente y sonido ambiente opcional.</li><li><strong>Herramientas</strong> — Cualificación de lead, transferencia de llamadas y reserva de citas con Cal.com. Más análisis post-llamada.</li><li><strong>Resumen</strong> — Revisión completa, subida de documentos a la base de conocimiento y creación final del agente.</li></ol><div class="help-callout"><span>ℹ</span><span>Una vez creado, tu agente estará listo para recibir llamadas si tienes un número asignado. Puedes probarlo desde el panel.</span></div><h2>¿Y si me equivoco en algo?</h2><p>Puedes editar la configuración de tu agente en cualquier momento desde <strong>Mis agentes IA</strong> en el menú lateral. También puedes volver a cualquier paso del resumen (paso 6) antes de crear el agente.</p>`,
      },
      'que-es-fabrica': {
        cat: 'Primeros pasos', title: 'Qué es la Fábrica de Agentes IA', updated: '15 mar 2026',
        body: `<p>La <strong>Fábrica de Agentes IA</strong> es una plataforma de netelip que te permite crear, configurar y gestionar agentes de voz inteligentes para tu negocio, sin necesidad de conocimientos técnicos.</p><h2>¿Qué puede hacer un agente?</h2><ul><li>Atender llamadas entrantes de forma automática 24/7</li><li>Cualificar contactos antes de actuar (nombre, email, motivo...)</li><li>Gestionar citas y reservas sin intervención humana (vía Cal.com)</li><li>Transferir llamadas al equipo o persona correcta según el contexto</li><li>Recopilar información del cliente y enviarte un resumen por email</li><li>Analizar el sentimiento del usuario en cada llamada</li></ul><h2>¿Cómo se integra con mi empresa?</h2><p>Los agentes se conectan a través de la infraestructura de telefonía de netelip. Solo necesitas asignarle un número de teléfono y el agente empezará a gestionar las llamadas de forma inmediata.</p><div class="help-callout"><span>ℹ</span><span>La plataforma está diseñada para pymes españolas y latinoamericanas. Todos los agentes cumplen con la normativa RGPD y LOPD.</span></div>`,
      },
      'tipos-agente': {
        cat: 'Primeros pasos', title: 'Tipos de agente y casos de uso', updated: '15 mar 2026',
        body: `<p>La Fábrica permite crear agentes multiherramienta: cualificación, transferencia y reserva de citas pueden coexistir en el mismo agente. No tienes que elegir un tipo fijo.</p><h2>Casos de uso más comunes</h2><h3>Atención al cliente</h3><p>El agente atiende llamadas entrantes, responde preguntas frecuentes y gestiona incidencias básicas. Si la consulta requiere un humano, transfiere la llamada.</p><h3>Agendamiento de citas</h3><p>Perfecto para clínicas, talleres, despachos o cualquier negocio con citas. El agente consulta la disponibilidad en Cal.com y reserva la cita automáticamente durante la llamada.</p><h3>Cualificación de leads</h3><p>Filtra contactos automáticamente según tus criterios antes de agendar o transferir.</p><div class="help-callout"><span>ℹ</span><span>Puedes combinar varias herramientas en el mismo agente. Por ejemplo: cualificar primero y luego agendar cita, o cualificar y transferir según el resultado.</span></div>`,
      },
      'requisitos': {
        cat: 'Primeros pasos', title: 'Requisitos previos para empezar', updated: '14 mar 2026',
        body: `<p>Para empezar a usar la Fábrica de Agentes IA, necesitas cumplir con estos requisitos básicos.</p><h2>Cuenta netelip activa</h2><p>La Fábrica es un servicio de netelip. Necesitas tener una cuenta activa y haber contratado el servicio con tu gestor de netelip.</p><h2>Saldo en tu cuenta</h2><p>Los agentes consumen saldo de tu cuenta netelip por cada minuto de llamada. Asegúrate de tener saldo suficiente antes de activar tu agente.</p><h2>Número de teléfono</h2><p>Necesitas al menos un número de teléfono asignado para que tu agente pueda recibir o realizar llamadas.</p><h2>Para Cal.com (opcional)</h2><p>Si vas a usar la herramienta de reserva de citas, necesitas una cuenta en Cal.com con un tipo de evento configurado y tu API Key.</p>`,
      },
      'wizard-paso1': {
        cat: 'Configurar el agente', title: 'Paso 1 — Información básica', updated: '18 mar 2026',
        body: `<p>El primer paso del asistente define la identidad de tu agente. Esta información se usará en todas sus interacciones con clientes.</p><h2>Nombre del agente</h2><p>Elige un nombre natural para tu agente: <em>Elio, Sofía, Carlos, Laura, Marta</em>.</p><div class="help-callout"><span>ℹ</span><span>Elige un nombre que encaje con la imagen de tu empresa. Un nombre amigable y natural genera más confianza en los clientes.</span></div><h2>Nombre de la empresa</h2><p>Este dato se incluirá automáticamente en el prompt del agente para identificar a tu empresa.</p><h2>Descripción de la empresa</h2><p>1–2 frases que describan tu negocio. El agente la usará para contextualizar las conversaciones.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>El nombre del agente y la empresa son obligatorios. La descripción es opcional pero recomendada para mejorar la calidad de las respuestas.</span></div>`,
      },
      'wizard-llm': {
        cat: 'Configurar el agente', title: 'Paso 2 — Comportamiento del agente', updated: '14 abr 2026',
        body: `<p>En este paso configuras el cerebro de tu agente: cómo arranca las conversaciones y qué personalidad tiene. Todos los agentes usan <strong>Gemini 3.0 Flash</strong> — el modelo con mejor equilibrio entre calidad y velocidad.</p><h2>Mensaje de inicio</h2><p>Es lo primero que dice el agente. Debe incluir presentación, aviso de IA (obligatorio) y aviso de grabación (obligatorio por LOPD).</p><div class="help-callout help-callout-warn"><span>⚠</span><span><strong>Obligatorio por ley española:</strong> El mensaje de inicio debe incluir que es un asistente de voz con IA y que la llamada está siendo grabada. No elimines estas declaraciones.</span></div>`,
      },
      'wizard-voz': {
        cat: 'Configurar el agente', title: 'Paso 3 — Selección de voz', updated: '16 mar 2026',
        body: `<p>La voz es uno de los elementos más importantes de la experiencia de tu agente.</p><h2>Proveedores disponibles</h2><ul><li><strong>ElevenLabs</strong> — Voces de muy alta calidad en español. Incluye Adrián y Paloma.</li><li><strong>Cartesia</strong> — Voces naturales y rápidas. Incluye Dario y Elena.</li><li><strong>OpenAI</strong> — Voz en inglés (Tony). Ideal para agentes internacionales.</li></ul><p>Haz clic en ▶ para escuchar una muestra de cada voz antes de elegir.</p><div class="help-callout"><span>ℹ</span><span>Una voz cercana y natural mejora significativamente la experiencia del cliente.</span></div><h2>Clonar tu propia voz</h2><p>Desde la pestaña <strong>"Clonar voz"</strong> puedes subir muestras de audio y la IA generará un perfil de voz personalizado.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>Al clonar una voz confirmas que tienes todos los derechos y consentimientos necesarios sobre las muestras de audio.</span></div>`,
      },
      'wizard-audio': {
        cat: 'Configurar el agente', title: 'Paso 4 — Audio y procesamiento', updated: '18 mar 2026',
        body: `<p>En este paso configuras la calidad del audio de tu agente: el volumen de la voz y un sonido ambiente opcional.</p><h2>Volumen del agente</h2><p>Ajusta la intensidad de la voz del agente. El valor por defecto es <strong>100%</strong>.</p><h2>Sonido ambiente</h2><p>Añade un sonido de fondo sutil para hacer que la conversación suene más natural.</p><h3>Tipos disponibles</h3><ul><li><strong>Cafetería</strong> — Platos, ambiente de local</li><li><strong>Call Center</strong> — Voces de fondo, teclados</li><li><strong>Exterior de verano</strong> — Naturaleza, insectos</li><li><strong>Montaña</strong> — Viento, naturaleza</li></ul><div class="help-callout"><span>ℹ</span><span>El sonido de <strong>Call Center</strong> es uno de los más populares: da la impresión de que el agente trabaja desde una oficina real. El volumen ambiente al 20% es un buen punto de partida.</span></div>`,
      },
      'wizard-herramientas': {
        cat: 'Configurar el agente', title: 'Paso 5 — Herramientas e integraciones', updated: '17 mar 2026',
        body: `<p>Las herramientas amplían las capacidades de tu agente más allá de la conversación básica.</p><h2>Herramientas disponibles</h2><h3>1. Cualificar contacto antes de actuar</h3><p>Filtra leads automáticamente con hasta 3 preguntas de cualificación.</p><h3>2. Transferir llamada</h3><p>Configura a qué número o extensión deriva el agente las llamadas.</p><h3>3. Reservar cita en el calendario (Cal.com)</h3><p>Integración nativa con Cal.com. Necesitas tu API Key y el Event Type ID.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>Activa solo las herramientas que realmente necesites. Demasiadas herramientas activas pueden ralentizar las respuestas del agente.</span></div>`,
      },
      'wizard-resumen': {
        cat: 'Configurar el agente', title: 'Paso 6 — Resumen y confirmación', updated: '18 mar 2026',
        body: `<p>El último paso muestra un resumen completo de toda la configuración de tu agente para que puedas revisarlo antes de crearlo.</p><h2>Editar desde el resumen</h2><p>Puedes editar campos directamente en el resumen o hacer clic en <strong>"Ir al paso"</strong> para volver a cualquier paso.</p><h2>Base de conocimiento</h2><p>Antes de crear el agente, puedes subir documentos (PDF, Word, texto). El agente los usará para responder preguntas con mayor precisión.</p><div class="help-callout"><span>ℹ</span><span>Los documentos son opcionales. Si no subes nada, el agente funcionará con la información del prompt y las herramientas configuradas.</span></div><h2>Crear el agente</h2><p>Una vez que estés conforme con la configuración, haz clic en <strong>"Crear agente"</strong>. El proceso tarda unos segundos y tu agente estará listo para recibir llamadas.</p>`,
      },
      'prompt-generador': {
        cat: 'Configurar el agente', title: 'Generador de prompts', updated: '18 mar 2026',
        body: `<p>El generador de prompts crea automáticamente el prompt del agente a partir de la información que introduces en el asistente de configuración.</p><h2>¿Qué es un prompt?</h2><p>El prompt es el conjunto de instrucciones que le dice a la IA cómo debe comportarse durante las llamadas: personalidad, objetivo, cómo debe responder y qué no debe hacer nunca.</p><div class="help-callout"><span>ℹ</span><span>El prompt base está construido sobre una estructura probada para llamadas de voz con Retell AI. Los parámetros que introduces se integran de forma inteligente sin romper la coherencia.</span></div><h2>¿Puedo editarlo manualmente?</h2><p>Sí. Una vez generado, puedes revisar y ajustar el prompt desde la configuración del agente.</p>`,
      },
      'cualificacion': {
        cat: 'Herramientas y funciones', title: 'Preguntas de cualificación', updated: '18 mar 2026',
        body: `<p>La cualificación de contactos permite que tu agente filtre leads automáticamente durante la llamada, antes de agendar una cita o transferir a tu equipo.</p><h2>¿Cómo funcionan?</h2><p>Defines hasta <strong>3 preguntas</strong> que el agente hará al contacto. Para cada pregunta configuras:</p><ul><li><strong>La pregunta</strong> — Escríbela tal como la diría el agente. Ej: <em>"¿Tienes un presupuesto mensual definido?"</em></li><li><strong>Criterio de cualificación</strong> — Describe qué respuesta indica interés real.</li><li><strong>Acción si no cualifica</strong> — Terminar la llamada, agendar igualmente, o continuar sin cualificar.</li></ul><div class="help-callout help-callout-warn"><span>⚠</span><span><strong>Máximo 3 preguntas.</strong> En conversaciones de voz, más preguntas aumentan significativamente el abandono de la llamada.</span></div><h2>Ejemplos</h2><ul><li><em>"¿Cuántos empleados tiene tu empresa?"</em> → Cualifica si menciona más de 10</li><li><em>"¿Tienes un presupuesto definido?"</em> → Cualifica si menciona una cifra</li><li><em>"¿Cuándo necesitas implementar la solución?"</em> → Cualifica si menciona un plazo concreto</li></ul>`,
      },
      'calcom': {
        cat: 'Herramientas y funciones', title: 'Integración con Cal.com', updated: '18 mar 2026',
        body: `<p>Cal.com es la herramienta de agendamiento que se integra de forma nativa con la Fábrica de Agentes IA.</p><h2>Antes de empezar necesitas</h2><ul><li>Una cuenta en <strong>cal.com</strong></li><li>Un Event Type (tipo de evento) creado en tu cuenta</li><li>Tu API Key desde Configuración → Developer → API Keys</li></ul><h2>Pasos para configurar</h2><ol class="step-list"><li><strong>Crea una cuenta en Cal.com</strong> — Visita cal.com y crea tu cuenta si no tienes una.</li><li><strong>Configura un tipo de evento</strong> — Tipos de evento → Nuevo → Configura duración y disponibilidad → Guardar.</li><li><strong>Obtén el Event Type ID</strong> — Mira la URL: <code>https://app.cal.com/usuario/evento/<strong>1427703</strong></code></li><li><strong>Obtén tu API Key</strong> — En Cal.com: Configuración → Developer → API Keys → copia tu clave.</li><li><strong>Pega los datos en la Fábrica</strong> — En el paso 5, activa Cal.com e introduce la API Key, el Event Type ID y la zona horaria.</li></ol><div class="help-callout"><span>ℹ</span><span>El cliente recibirá la confirmación por email automáticamente desde Cal.com.</span></div>`,
      },
      'datos-postllamada': {
        cat: 'Herramientas y funciones', title: 'Análisis post-llamada', updated: '18 mar 2026',
        body: `<p>El análisis posterior a la llamada extrae información valiosa de cada conversación de forma automática una vez finalizada.</p><h2>Variables predefinidas</h2><ul><li><strong>Resumen de la llamada</strong> — Resumen de 1 a 3 frases con la información importante y acciones tomadas.</li><li><strong>Llamada exitosa</strong> — Evalúa si el agente completó la tarea correctamente (Sí/No).</li><li><strong>Sentimiento del usuario</strong> — Evalúa el estado de ánimo y nivel de satisfacción del usuario.</li></ul><h2>Categorías personalizadas</h2><ul><li><strong>Texto</strong> — Información textual. Ej: puntos de acción, observaciones.</li><li><strong>Selector</strong> — Lista fija de opciones. Ej: tipo de incidencia, departamento.</li><li><strong>Booleano</strong> — Sí o No. Ej: ¿es primera llamada?, ¿quiere newsletter?</li><li><strong>Número</strong> — Valor numérico. Ej: puntuación, importe estimado.</li></ul><div class="help-callout"><span>ℹ</span><span>Los campos no se completarán en llamadas que no llegaron a conectarse o en las que no hubo conversación real.</span></div>`,
      },
      'gdpr': {
        cat: 'Herramientas y funciones', title: 'Cumplimiento RGPD y LOPD', updated: '15 mar 2026',
        body: `<p>Todos los agentes creados en la Fábrica de Agentes IA están diseñados para cumplir con la normativa española de protección de datos (LOPD) y el Reglamento General de Protección de Datos europeo (RGPD).</p><h2>Obligaciones legales</h2><ol class="step-list"><li><strong>Identificación como IA</strong> — El agente debe identificarse al inicio de la llamada como un sistema de inteligencia artificial.</li><li><strong>Aviso de grabación</strong> — Si grabas las llamadas, debes informar al interlocutor al inicio de la conversación.</li></ol><h2>¿Cómo lo gestiona la plataforma?</h2><p>El generador de prompts incluye automáticamente ambas declaraciones en el mensaje de inicio.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>No elimines ni modifiques estas declaraciones del mensaje de inicio. Hacerlo podría implicar un incumplimiento legal con sanciones económicas significativas.</span></div>`,
      },
      'llamadas-entrantes': {
        cat: 'Llamadas', title: 'Llamadas entrantes', updated: '17 mar 2026',
        body: `<p>Las llamadas entrantes son aquellas que recibe tu agente de tus clientes. Una vez que tienes un número asignado y un agente configurado, tu agente empieza a atender llamadas automáticamente.</p><h2>Horarios de atención</h2><p>Los agentes funcionan 24/7 por defecto. Si necesitas restringir el horario, puedes hacerlo desde la configuración del agente.</p><h2>Probar tu agente</h2><p>Una vez configurado, la mejor forma de probarlo es hacer una llamada real al número asignado. También puedes usar la herramienta de prueba en el panel desde <strong>Mis agentes IA</strong>.</p>`,
      },
      'llamadas-salientes': {
        cat: 'Llamadas', title: 'Llamadas salientes', updated: '17 mar 2026',
        body: `<p>Además de atender llamadas entrantes, tu agente puede realizar llamadas salientes de forma automática.</p><h2>¿Cómo funciona?</h2><p>Para realizar llamadas salientes necesitas tener configurado un <strong>agente saliente</strong> en tu número. El agente marcará el número del destinatario y gestionará la conversación según su configuración.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>Las llamadas salientes consumen saldo de tu cuenta netelip. Revisa tu balance antes de lanzar campañas.</span></div><h2>Buenas prácticas</h2><ul><li>El agente debe identificarse como IA al inicio de la llamada.</li><li>Respeta los horarios legales para llamadas comerciales en España (9h–21h en días laborables).</li><li>Incluye siempre una opción para que el destinatario pueda rechazar futuras llamadas.</li></ul>`,
      },
      'transferencia': {
        cat: 'Llamadas', title: 'Transferencia de llamadas', updated: '17 mar 2026',
        body: `<p>La transferencia de llamadas permite que tu agente derive una conversación a un agente humano o a otra extensión cuando sea necesario.</p><h2>¿Cuándo transfiere el agente?</h2><ul><li>Cuando el cliente lo solicita expresamente.</li><li>Cuando la solicitud supera las capacidades del agente.</li><li>Cuando así lo has configurado en las condiciones de transferencia.</li></ul><h2>Configurar la transferencia</h2><p>En el <strong>paso 5 — Herramientas</strong>, activa la herramienta de transferencia y define las condiciones, el nombre del contacto de destino y el número de teléfono en formato E.164.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>La transferencia a extensiones internas de tu Centralita Virtual requiere coordinación con el equipo técnico de netelip.</span></div>`,
      },
      'grabacion': {
        cat: 'Llamadas', title: 'Grabación y transcripción', updated: '16 mar 2026',
        body: `<p>La Fábrica de Agentes IA genera automáticamente una grabación y una transcripción de cada llamada gestionada por tu agente.</p><h2>¿Dónde encuentro las grabaciones?</h2><p>En el historial de llamadas del dashboard. Cada llamada incluye:</p><ul><li>Grabación de audio completa</li><li>Transcripción automática del texto</li><li>Resumen generado por IA</li><li>Análisis de sentimiento del usuario</li></ul><h2>¿Cuánto tiempo se conservan?</h2><p>Las grabaciones y transcripciones se conservan durante <strong>90 días</strong> por defecto.</p><div class="help-callout help-callout-warn"><span>⚠</span><span>Grabar llamadas sin informar al interlocutor es ilegal en España. Asegúrate de que tu mensaje de inicio incluye el aviso de grabación obligatorio.</span></div>`,
      },
      'asignar-numero': {
        cat: 'Mis números', title: 'Asignar un número a tu agente', updated: '16 mar 2026',
        body: `<p>Para que tu agente pueda recibir o realizar llamadas, necesita tener asignado un número de teléfono. Puedes gestionar tus números desde <strong>Mis números</strong> en el menú lateral.</p><h2>Asignar un número existente</h2><ol class="step-list"><li>Ve a <strong>Mis números</strong> en el panel lateral.</li><li>Selecciona el número que quieres configurar.</li><li>En el campo <strong>Agente entrante</strong>, elige el agente que gestionará las llamadas recibidas.</li><li>Guarda los cambios.</li></ol><div class="help-callout"><span>ℹ</span><span>Una vez asignado el número, tu agente empezará a gestionar las llamadas entrantes de forma inmediata. El cambio es instantáneo.</span></div>`,
      },
      'sip-trunk': {
        cat: 'Mis números', title: 'Conectar mediante SIP', updated: '14 mar 2026',
        body: `<p>La Fábrica de Agentes IA se integra con la infraestructura de telefonía de netelip a través de SIP, lo que permite conectar tu agente con la Centralita Virtual existente.</p><h2>Flujo de una llamada con SIP</h2><ol class="step-list"><li>El cliente llama a tu número de netelip.</li><li>La Centralita Virtual enruta la llamada hacia el agente de IA.</li><li>El agente gestiona la conversación.</li><li>Si es necesario, transfiere la llamada a un agente humano o extensión.</li></ol><div class="help-callout"><span>ℹ</span><span>Esta integración la gestiona el equipo técnico de netelip. Si necesitas configurarla, contacta con soporte.</span></div>`,
      },
      'numero-apodo': {
        cat: 'Mis números', title: 'Gestionar y renombrar números', updated: '15 mar 2026',
        body: `<p>Desde la sección <strong>Mis números</strong> puedes ver todos los números asignados a tu cuenta y gestionar su configuración.</p><h2>Renombrar un número</h2><ol class="step-list"><li>Ve a <strong>Mis números</strong> en el menú lateral.</li><li>Haz clic en el número que quieres renombrar.</li><li>Edita el campo <strong>Apodo</strong> y guarda los cambios.</li></ol><h2>Cambiar el agente asignado</h2><p>Puedes cambiar en cualquier momento qué agente gestiona un número. El cambio es inmediato.</p>`,
      },
      'dashboard-metricas': {
        cat: 'Analítica y métricas', title: 'Dashboard de métricas', updated: '18 mar 2026',
        body: `<p>El dashboard principal te da una visión general del rendimiento de todos tus agentes en tiempo real.</p><h2>Métricas principales</h2><ul><li><strong>Total de llamadas</strong> — Número total de llamadas gestionadas en el período.</li><li><strong>Tasa de éxito</strong> — Porcentaje de llamadas resueltas correctamente.</li><li><strong>Duración promedio</strong> — Tiempo medio de cada conversación.</li><li><strong>Coste total</strong> — Gasto acumulado en el período.</li></ul><div class="help-callout"><span>ℹ</span><span>Usa el selector de período para filtrar por los últimos 7 días, 30 días o un rango personalizado.</span></div>`,
      },
      'tasa-exito': {
        cat: 'Analítica y métricas', title: 'Tasa de éxito de llamadas', updated: '16 mar 2026',
        body: `<p>La <strong>tasa de éxito</strong> mide el porcentaje de llamadas que tu agente ha gestionado correctamente en un período determinado.</p><h2>¿Qué se considera una llamada exitosa?</h2><ul><li>Ha resuelto la consulta del cliente sin necesidad de transferencia.</li><li>Ha completado el agendamiento de una cita.</li><li>Ha recogido la información solicitada y enviado el resumen.</li></ul><h2>¿Qué hacer si la tasa baja?</h2><ol class="step-list"><li>Revisa el prompt del agente.</li><li>Analiza las transcripciones de las llamadas fallidas.</li><li>Verifica que las herramientas necesarias están activadas.</li></ol>`,
      },
      'sentimiento': {
        cat: 'Analítica y métricas', title: 'Análisis de sentimiento', updated: '16 mar 2026',
        body: `<p>El análisis de sentimiento evalúa cómo se ha sentido el cliente durante cada llamada.</p><h2>Categorías</h2><ul><li><strong>Positivo</strong> — El cliente expresó satisfacción o resolvió su consulta sin problemas.</li><li><strong>Neutral</strong> — Llamada informativa sin carga emocional especial.</li><li><strong>Negativo</strong> — El cliente mostró frustración, confusión o insatisfacción.</li></ul><div class="help-callout"><span>ℹ</span><span>Si el sentimiento negativo supera el umbral configurado, recibirás una alerta por email para actuar de inmediato.</span></div>`,
      },
      'alertas-cliente': {
        cat: 'Analítica y métricas', title: 'Alertas y notificaciones', updated: '18 mar 2026',
        body: `<p>La Fábrica incluye un sistema de alertas que te notifica por email cuando alguna métrica supera los umbrales configurados.</p><h2>Alertas disponibles</h2><ul><li><strong>Llamadas recibidas</strong> — Si el volumen sube o baja de forma inesperada.</li><li><strong>Tasa de éxito</strong> — Si baja del umbral mínimo configurado.</li><li><strong>Llamadas con incidencia</strong> — Si el porcentaje de clientes insatisfechos sube.</li><li><strong>Transferencias fallidas</strong> — Si el agente no puede completar las transferencias.</li></ul><h2>¿Cómo configuro los umbrales?</h2><p>Desde la sección <strong>Configuración</strong>. Define el valor mínimo o máximo para cada métrica y el sistema las evaluará cada hora.</p>`,
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
      'transferencia': { t: 'La transferencia se configura en el paso 5 del wizard. Puedes definir condiciones y múltiples destinos.', a: 'transferencia' },
      'transferir': { t: 'En el paso 5, activa <strong>Transferir llamada</strong>. Define cuándo debe transferir y el número de destino.', a: 'transferencia' },
      'alerta': { t: 'Las alertas se activan cuando una métrica supera el umbral configurado. Te llega un email.', a: 'alertas-cliente' },
      'grabación': { t: 'Todas las llamadas se graban y transcriben automáticamente. Las encuentras en el historial durante 90 días.', a: 'grabacion' },
      'transcripción': { t: 'Cada llamada genera grabación, transcripción, resumen automático y análisis de sentimiento.', a: 'grabacion' },
      'lopd': { t: 'El agente debe identificarse como IA e informar de la grabación. El generador lo incluye automáticamente.', a: 'gdpr' },
      'rgpd': { t: 'La plataforma cumple RGPD y LOPD. El mensaje de inicio incluye las declaraciones legales obligatorias.', a: 'gdpr' },
      'legal': { t: 'El agente debe identificarse como IA e informar de la grabación al inicio de cada llamada. Es obligatorio por ley española.', a: 'gdpr' },
      'prompt': { t: 'El generador de prompts crea las instrucciones del agente a partir del wizard. Puedes ajustarlo manualmente después de crearlo.', a: 'prompt-generador' },
      'sip': { t: 'La conexión SIP te permite usar tu numeración actual de netelip. La gestiona el equipo técnico.', a: 'sip-trunk' },
      'voz': { t: 'En el paso 3 del wizard puedes escuchar y seleccionar la voz de tu agente entre ElevenLabs, Cartesia y OpenAI.', a: 'wizard-voz' },
      'clonar': { t: 'Puedes clonar tu propia voz desde la pestaña <strong>"Clonar voz"</strong> en el paso 3. Sube muestras de audio y la IA generará un perfil de voz personalizado.', a: 'wizard-voz' },
      'cualificación': { t: 'La cualificación filtra contactos con hasta 3 preguntas antes de agendar o transferir. Se configura en el paso 5.', a: 'cualificacion' },
      'cualificar': { t: 'Define hasta 3 preguntas clave que el agente hará al contacto. Si no cualifica, puedes terminar la llamada, agendar o continuar.', a: 'cualificacion' },
      'pregunta': { t: 'Las preguntas de cualificación filtran leads automáticamente. Máximo 3 preguntas — en voz, más preguntas aumentan el abandono.', a: 'cualificacion' },
      'cal.com': { t: 'Cal.com se integra en el paso 5. Necesitas tu API Key, el Event Type ID y la zona horaria. El agente podrá consultar disponibilidad y reservar citas.', a: 'calcom' },
      'cita': { t: 'Para agendar citas, activa la herramienta de <strong>Cal.com</strong> en el paso 5. Se integra con Google Calendar, Outlook, HubSpot y más.', a: 'calcom' },
      'agendar': { t: 'La reserva de citas usa Cal.com. Configúralo en el paso 5 con tu API Key y Event Type ID.', a: 'calcom' },
      'calendario': { t: 'Cal.com se conecta con Google Calendar, Outlook, HubSpot, Salesforce y Zoom para gestionar disponibilidad.', a: 'calcom' },
      'audio': { t: 'En el paso 4 configuras el volumen del agente y un sonido ambiente opcional (cafetería, call center, naturaleza...).', a: 'wizard-audio' },
      'volumen': { t: 'Ajusta el volumen de la voz del agente en el paso 4. El valor por defecto es 100%.', a: 'wizard-audio' },
      'ambiente': { t: 'Puedes añadir sonido de fondo (call center, cafetería, naturaleza...) en el paso 4 para una experiencia más natural.', a: 'wizard-audio' },
      'resumen': { t: 'El paso 6 muestra un resumen completo de la configuración. Puedes editar campos o volver a cualquier paso antes de crear el agente.', a: 'wizard-resumen' },
      'documento': { t: 'En el paso 6 puedes subir documentos (PDF, Word, texto) a la base de conocimiento. El agente los usará para responder con más precisión.', a: 'wizard-resumen' },
      'base de conocimiento': { t: 'Sube documentos con información de tu empresa en el paso 6. El agente los usará para responder preguntas durante las llamadas.', a: 'wizard-resumen' },
      'modelo': { t: 'Todos los agentes usan <strong>Gemini 3.0 Flash</strong>, el modelo con mejor equilibrio entre calidad y velocidad.', a: 'wizard-llm' },
      'gemini': { t: 'Gemini 3.0 Flash es el modelo que usan todos los agentes. Ofrece el mejor equilibrio entre calidad y velocidad de respuesta.', a: 'wizard-llm' },
      'personalidad': { t: 'En el paso 2 puedes elegir rasgos como profesional, empático, directo o amigable, y el tono: formal, semiformal o coloquial.', a: 'wizard-llm' },
      'mensaje de inicio': { t: 'Es lo primero que dice el agente. Debe incluir presentación, nombre de empresa y aviso de grabación (obligatorio por LOPD).', a: 'wizard-llm' },
      'post-llamada': { t: 'El análisis post-llamada extrae resumen, éxito y sentimiento de cada conversación. Puedes añadir variables personalizadas.', a: 'datos-postllamada' },
      'análisis': { t: 'Cada llamada genera automáticamente un resumen, evaluación de éxito y análisis de sentimiento. Configurable en el paso 5.', a: 'datos-postllamada' },
      'variable': { t: 'Puedes añadir variables personalizadas de análisis: texto, selector, booleano o número. Se configuran en el paso 5.', a: 'datos-postllamada' },
      'saliente': { t: 'Tu agente puede hacer llamadas salientes. Configura un agente saliente en tu número desde <strong>Mis números</strong>.', a: 'llamadas-salientes' },
      'apodo': { t: 'Puedes renombrar tus números desde <strong>Mis números</strong> editando el campo Apodo.', a: 'numero-apodo' },
      'coste': { t: 'El coste por minuto varía según el modelo de IA y el proveedor de voz. Revisa tu saldo desde el dashboard.', a: 'dashboard-metricas' },
    };

    w.getBotResponse = function(text: string): { t: string; a: string | null } {
      const l = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (/^(hola|hey|buenas|buenos|hi|ey|que tal|saludos|hello)/.test(l)) return { t: '¡Hola! Soy Elio, el asistente de la Fábrica de Agentes IA. Puedes preguntarme sobre cualquier paso del wizard, las herramientas, Cal.com, cualificación de leads, voces, audio... ¡lo que necesites!', a: null };
      if (/^(gracias|thanks|genial|perfecto|vale|ok|entendido|guay)/.test(l)) return { t: '¡De nada! Si tienes más dudas, aquí estoy. También puedes explorar los artículos del centro de ayuda.', a: null };
      for (const [k, v] of Object.entries(botMap)) if (l.includes(k)) return v;
      const words = l.split(/\s+/).filter((wrd: string) => wrd.length > 3);
      if (words.length > 0) {
        let bestMatch: { id: string; a: { cat: string; title: string; updated: string; body: string } } | null = null;
        let bestScore = 0;
        for (const [id, a] of Object.entries(helpArticles)) {
          const haystack = (a.title + ' ' + a.body).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/<[^>]*>/g, ' ');
          let score = 0;
          for (const wrd of words) { const matches = haystack.split(wrd).length - 1; score += matches; }
          if (score > bestScore) { bestScore = score; bestMatch = { id, a }; }
        }
        if (bestMatch && bestScore >= 2) {
          const plainBody = bestMatch.a.body.replace(/<[^>]*>/g, ' ').substring(0, 180).trim();
          return { t: `Encontré información relevante en <strong>${bestMatch.a.title}</strong>: ${plainBody}...`, a: bestMatch.id };
        }
      }
      return { t: 'No he encontrado información sobre eso en la documentación. Prueba a reformular tu pregunta o escríbenos a <strong>soporte@netelip.com</strong> y te ayudamos.', a: null };
    };

    w.onHelpSearch = function(q: string) {
      const drop = document.getElementById('searchDrop');
      if (!drop) return;
      if (!q.trim()) { drop.style.display = 'none'; return; }
      const ql = q.toLowerCase();
      const res = Object.entries(helpArticles).filter(([, a]) => a.title.toLowerCase().includes(ql) || a.cat.toLowerCase().includes(ql) || a.body.replace(/<[^>]*>/g, ' ').toLowerCase().includes(ql)).slice(0, 6);
      if (!res.length) { drop.style.display = 'none'; return; }
      drop.innerHTML = res.map(([id, a]) => `<div style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;gap:10px;" onmouseover="this.style.background='var(--gris-bg)'" onmouseout="this.style.background='white'" onclick="showArticle('${id}')"><span style="font-size:10px;font-weight:700;text-transform:uppercase;background:var(--azul-light);color:var(--azul);padding:2px 7px;border-radius:4px;white-space:nowrap;">${a.cat}</span><span style="font-size:13px;">${a.title}</span></div>`).join('');
      drop.style.display = 'block';
    };

    w.showArticle = function(id: string) {
      const a = helpArticles[id]; if (!a) return;
      const helpHome = document.getElementById('helpHome');
      const helpArticleEl = document.getElementById('helpArticle');
      if (helpHome) helpHome.style.display = 'none';
      if (helpArticleEl) helpArticleEl.style.display = 'block';
      const content = document.getElementById('articleContent');
      if (content) {
        content.innerHTML = `
          <div style="margin-bottom:14px;font-size:12px;color:var(--gris-texto);display:flex;align-items:center;gap:6px;cursor:pointer;" onclick="showHelpHome()">
            <i class="bi bi-arrow-left"></i> Volver a ayuda
          </div>
          <div style="background:white;border:1px solid var(--gris-borde);border-radius:var(--r-lg);padding:32px;max-width:700px;">
            <div style="font-size:11px;font-weight:700;background:var(--azul-light);color:var(--azul);padding:3px 10px;border-radius:12px;display:inline-block;margin-bottom:14px;">${a.cat}</div>
            <h1 style="font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:-.3px;">${a.title}</h1>
            <div style="font-size:12px;color:var(--gris-texto);margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--gris-borde);">Actualizado el ${a.updated}</div>
            <div class="help-body">${a.body}</div>
            <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--gris-borde);display:flex;justify-content:space-between;align-items:center;">
              <button class="btn-s" onclick="showHelpHome()"><i class="bi bi-arrow-left"></i> Volver a ayuda</button>
              <button class="btn-p" onclick="askElio('Tengo una duda sobre: ${a.title}')"><i class="bi bi-chat-dots"></i> Preguntarle a Elio</button>
            </div>
          </div>`;
      }
      window.scrollTo(0, 0);
      const mainView = document.querySelector('.main-view');
      if (mainView) mainView.scrollTop = 0;
    };

    w.showHelpHome = function() {
      const helpHome = document.getElementById('helpHome');
      const helpArticleEl = document.getElementById('helpArticle');
      if (helpHome) helpHome.style.display = 'block';
      if (helpArticleEl) helpArticleEl.style.display = 'none';
      window.scrollTo(0, 0);
    };

    w.toggleChat = function() {
      w.chatOpen = !w.chatOpen;
      const win = document.getElementById('chatWindow');
      const fab = document.getElementById('chatFab');
      if (!win || !fab) return;
      win.style.display = w.chatOpen ? 'flex' : 'none';
      fab.style.display = w.chatOpen ? 'none' : 'flex';
      const msgs = document.getElementById('chatMsgs');
      if (w.chatOpen && msgs && msgs.children.length === 0) {
        w.addMsg?.('bot', 'Hola 👋 Soy Elio, el asistente de la Fábrica. ¿En qué te puedo ayudar?');
      }
    };

    w.addMsg = function(role: string, text: string) {
      const msgs = document.getElementById('chatMsgs'); if (!msgs) return;
      const d = document.createElement('div');
      d.style.cssText = `display:flex;align-items:flex-start;gap:8px;${role === 'user' ? 'flex-direction:row-reverse;' : ''}`;
      if (role === 'bot') {
        d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a2428,#267ab0);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:230px;">${text}</div>`;
      } else {
        d.innerHTML = `<div style="background:var(--azul);color:white;border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:13px;line-height:1.6;max-width:230px;">${text}</div>`;
      }
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    };

    w.showTyping = function() {
      const msgs = document.getElementById('chatMsgs'); if (!msgs) return;
      const d = document.createElement('div'); d.id = 'typingEl'; d.style.cssText = 'display:flex;align-items:flex-start;gap:8px;';
      d.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#1a2428,#267ab0);color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;">E</div><div style="background:var(--gris-bg);border:1px solid var(--gris-borde);border-radius:12px;padding:12px 16px;display:flex;gap:4px;"><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .0s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .15s;display:inline-block;"></span><span style="width:6px;height:6px;background:#9ca3af;border-radius:50%;animation:bounce .8s infinite .3s;display:inline-block;"></span></div>`;
      msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
    };

    w.removeTyping = function() { const t = document.getElementById('typingEl'); if (t) t.remove(); };

    w.sendChat = function() {
      const inp = document.getElementById('chatInp') as HTMLInputElement; if (!inp) return;
      const txt = inp.value.trim(); if (!txt) return;
      inp.value = '';
      w.addMsg?.('user', txt); w.showTyping?.();
      setTimeout(() => {
        w.removeTyping?.();
        const r = w.getBotResponse?.(txt);
        if (r) {
          let html = r.t;
          if (r.a) html += `<br><br><span style="font-size:12px;color:var(--azul);cursor:pointer;text-decoration:underline;" onclick="showArticle('${r.a}')">Ver artículo completo</span>`;
          w.addMsg?.('bot', html);
        }
      }, 800);
    };

    w.askElio = function(q: string) {
      if (!w.chatOpen) w.toggleChat?.();
      setTimeout(() => {
        const inp = document.getElementById('chatInp') as HTMLInputElement;
        if (inp) { inp.value = q; w.sendChat?.(); }
      }, 100);
    };

    w.toggleHelpSec = function(idx: number) {
      const body = document.getElementById('helpSec-' + idx);
      const icon = document.getElementById('helpSecIcon-' + idx);
      if (!body || !icon) return;
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      icon.className = open ? 'bi bi-chevron-right' : 'bi bi-chevron-down';
    };

    w.buildArticleList = function() {
      const el = document.getElementById('helpArticleList'); if (!el) return;
      const secs = [
        { cat: 'Primeros pasos', icon: 'bi-rocket-takeoff', color: 'var(--azul)', arts: ['crear-agente', 'que-es-fabrica', 'tipos-agente', 'requisitos'] },
        { cat: 'Configurar el agente — Paso a paso', icon: 'bi-sliders', color: '#7c3aed', arts: ['wizard-paso1', 'wizard-llm', 'wizard-voz', 'wizard-audio', 'wizard-herramientas', 'wizard-resumen'] },
        { cat: 'Herramientas y funciones', icon: 'bi-tools', color: '#d97706', arts: ['cualificacion', 'calcom', 'datos-postllamada', 'prompt-generador', 'gdpr'] },
        { cat: 'Llamadas', icon: 'bi-telephone', color: 'var(--exito)', arts: ['llamadas-entrantes', 'llamadas-salientes', 'transferencia', 'grabacion'] },
        { cat: 'Mis números', icon: 'bi-hash', color: '#db2777', arts: ['asignar-numero', 'sip-trunk', 'numero-apodo'] },
        { cat: 'Analítica y métricas', icon: 'bi-bar-chart-line', color: 'var(--azul)', arts: ['dashboard-metricas', 'tasa-exito', 'sentimiento', 'alertas-cliente'] },
      ];
      el.innerHTML = secs.map((sec, i) => {
        const header = `<div onclick="toggleHelpSec(${i})" style="padding:14px 20px;background:var(--gris-bg);border-bottom:1px solid var(--gris-borde);display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;" onmouseover="this.style.background='#ebedf0'" onmouseout="this.style.background='var(--gris-bg)'">
          <i class="bi ${sec.icon}" style="color:${sec.color};font-size:15px;flex-shrink:0;"></i>
          <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--oscuro);">${sec.cat}</span>
          <span style="font-size:11px;color:var(--gris-texto);margin-left:auto;flex-shrink:0;">${sec.arts.length} artículos</span>
          <i id="helpSecIcon-${i}" class="bi bi-chevron-right" style="color:var(--gris-texto);font-size:11px;flex-shrink:0;margin-left:4px;transition:transform .15s;"></i>
        </div>`;
        const items = sec.arts.map(id => {
          const a = helpArticles[id]; if (!a) return '';
          return `<div style="padding:11px 20px 11px 46px;border-bottom:1px solid var(--gris-borde);cursor:pointer;display:flex;justify-content:space-between;align-items:center;transition:background .1s;" onmouseover="this.style.background='var(--gris-bg)'" onmouseout="this.style.background='white'" onclick="showArticle('${id}')"><div style="font-size:13px;font-weight:500;color:var(--oscuro);">${a.title}</div><i class="bi bi-chevron-right" style="color:var(--gris-texto);font-size:11px;"></i></div>`;
        }).join('');
        return header + `<div id="helpSec-${i}" style="display:none;">${items}</div>`;
      }).join('');
    };

    w.buildArticleList();
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
          .help-body h2 { font-size:18px;font-weight:700;margin-top:28px;margin-bottom:10px;color:var(--oscuro); }
          .help-body h3 { font-size:15px;font-weight:700;margin-top:20px;margin-bottom:8px;color:var(--oscuro); }
          .help-body h2:first-child { margin-top:0; }
          .help-body p { margin-bottom:14px;color:#374151;font-size:14px;line-height:1.65; }
          .help-body ul, .help-body ol { padding-left:20px;margin-bottom:14px; }
          .help-body li { font-size:14px;color:#374151;line-height:1.7;margin-bottom:5px; }
          .help-body em { color:var(--oscuro); font-style:italic; }
          .help-body code { font-size:12px;background:var(--gris-bg);padding:2px 6px;border-radius:4px;font-family:monospace; }
          .help-callout { background:var(--azul-light);border-left:4px solid var(--azul);padding:14px 18px;border-radius:10px;margin:20px 0;display:flex;gap:12px;font-size:13px;color:var(--azul);line-height:1.5; }
          .help-callout-warn { background:#fffbeb;border-left-color:#f59e0b;color:#92400e; }
          .help-body .step-list { list-style:none;padding:0;counter-reset:steps; }
          .help-body .step-list li { counter-increment:steps;display:flex;gap:12px;align-items:flex-start;margin-bottom:10px; }
          .help-body .step-list li::before { content:counter(steps);min-width:22px;height:22px;background:var(--azul);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;margin-top:1px; }
          @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-5px)} }
        ` }} />

        <DashboardTopbar
          title="Ayuda y soporte"
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

          <div id="helpHome">
            {/* Search */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '0 16px', maxWidth: '500px' }}>
                <i className="bi bi-search" style={{ color: 'var(--gris-texto)', fontSize: '15px', flexShrink: 0 }}></i>
                <input
                  id="helpSearch"
                  className="inp"
                  style={{ border: 'none', background: 'none', padding: '12px' }}
                  placeholder="Buscar en el centro de ayuda..."
                  onInput={(e) => (window as unknown as ExtendedWindow).onHelpSearch?.((e.target as HTMLInputElement).value)}
                  onFocus={(e) => { if (e.target.value.trim()) (window as unknown as ExtendedWindow).onHelpSearch?.(e.target.value); }}
                  onBlur={() => setTimeout(() => { const d = document.getElementById('searchDrop'); if (d) d.style.display = 'none'; }, 350)}
                  autoComplete="off"
                />
              </div>
              <div id="searchDrop" style={{ display: 'none', maxWidth: '500px', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', boxShadow: '0 8px 24px rgba(0,0,0,.1)', marginTop: '4px', overflow: 'hidden', position: 'relative', zIndex: 50 }}></div>
            </div>

            {/* Quick access cards row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '14px' }}>
              <div style={{ background: 'linear-gradient(135deg,var(--azul),var(--azul-hover))', borderRadius: 'var(--r-lg)', padding: '22px', color: 'white', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('crear-agente')}>
                <i className="bi bi-rocket-takeoff" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', opacity: .85 }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Crear tu primer agente</div>
                <div style={{ fontSize: '12px', opacity: .75 }}>Guía completa de los 6 pasos del wizard.</div>
              </div>
              <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('cualificacion')}>
                <i className="bi bi-person-check" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: '#7c3aed' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Cualificación de leads</div>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Filtra contactos automáticamente.</div>
              </div>
              <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('calcom')}>
                <i className="bi bi-calendar-check" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: 'var(--exito)' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Integración Cal.com</div>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Reserva citas automáticamente.</div>
              </div>
            </div>

            {/* Quick access cards row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '28px' }}>
              <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('wizard-llm')}>
                <i className="bi bi-cpu" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: 'var(--azul)' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Modelo de IA y prompt</div>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Gemini, GPT-4.1 y personalidad.</div>
              </div>
              <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('asignar-numero')}>
                <i className="bi bi-telephone-plus" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: '#d97706' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>Asignar un número</div>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Conecta tu número de netelip.</div>
              </div>
              <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', padding: '22px', cursor: 'pointer' }} onClick={() => (window as unknown as ExtendedWindow).showArticle?.('gdpr')}>
                <i className="bi bi-shield-check" style={{ fontSize: '22px', display: 'block', marginBottom: '10px', color: '#ef4444' }}></i>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '3px' }}>RGPD y LOPD</div>
                <div style={{ fontSize: '12px', color: 'var(--gris-texto)' }}>Cumplimiento legal obligatorio.</div>
              </div>
            </div>

            {/* Elio banner */}
            <div style={{ background: 'linear-gradient(135deg,#1a2428,#267ab0)', borderRadius: 'var(--r-lg)', padding: '22px 24px', color: 'white', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 800 }}>E</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Pregúntale a Elio</div>
                    <div style={{ fontSize: '11px', opacity: .7 }}>Asistente de la Fábrica — Conoce toda la documentación</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                  <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Cómo creo un agente')} style={{ textAlign: 'left', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Cómo creo un agente?</button>
                  <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Cómo asigno un número')} style={{ textAlign: 'left', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Cómo asigno un número?</button>
                  <button onClick={() => (window as unknown as ExtendedWindow).askElio?.('Qué herramientas tiene el agente')} style={{ textAlign: 'left', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>¿Qué herramientas tiene?</button>
                  <button onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()} style={{ background: 'white', color: 'var(--azul)', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    <i className="bi bi-chat-dots"></i> Abrir chat
                  </button>
                </div>
              </div>
            </div>

            {/* Article list */}
            <div style={{ background: 'white', border: '1px solid var(--gris-borde)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gris-borde)', fontSize: '14px', fontWeight: 700 }}>Artículos de ayuda</div>
              <div id="helpArticleList"></div>
            </div>
          </div>

          <div id="helpArticle" style={{ display: 'none' }}>
            <div id="articleContent"></div>
          </div>

        </div>
      </div>

      {/* Chat window */}
      <div id="chatWindow" style={{ position: 'fixed', bottom: '24px', right: '24px', width: '340px', top: '60px', background: 'white', border: '1px solid var(--gris-borde)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,.15)', display: 'none', flexDirection: 'column', zIndex: 500 }}>
        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#1a2428,#267ab0)', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: 'white' }}>E</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Elio</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.7)' }}>Asistente de la Fábrica</div>
            </div>
          </div>
          <button onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div id="chatMsgs" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}></div>
        <div style={{ padding: '12px', borderTop: '1px solid var(--gris-borde)', display: 'flex', gap: '8px' }}>
          <input
            id="chatInp"
            className="inp"
            style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
            placeholder="Escribe tu pregunta..."
            onKeyDown={(e) => { if (e.key === 'Enter') (window as unknown as ExtendedWindow).sendChat?.(); }}
          />
          <button onClick={() => (window as unknown as ExtendedWindow).sendChat?.()} className="btn-p" style={{ padding: '9px 14px' }}>
            <i className="bi bi-send"></i>
          </button>
        </div>
      </div>

      {/* Chat FAB */}
      <button
        id="chatFab"
        onClick={() => (window as unknown as ExtendedWindow).toggleChat?.()}
        style={{ position: 'fixed', bottom: '24px', right: '24px', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg,#1a2428,#267ab0)', border: 'none', color: 'white', fontSize: '22px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(38,122,176,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 499 }}
      >
        <i className="bi bi-chat-dots-fill"></i>
      </button>
    </div>
  );
}
