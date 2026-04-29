"use client";
export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import DashboardSidebar from '../../../components/DashboardSidebar';
import DashboardTopbar from '../../../components/DashboardTopbar';

const AGENDA_PROMPT = `# GESTIÓN DE AGENDA Y DISPONIBILIDAD

Tienes acceso a dos herramientas para gestionar citas: \`check_availability\` y \`book_appointment\`. Úsalas siempre que el usuario quiera reservar, pregunte por horarios o quiera agendar una visita.

## HORARIO COMERCIAL — REGLA CRÍTICA
Antes de ofrecer cualquier hueco, filtra los resultados por el horario de apertura de la empresa (ver sección "# Horario comercial" más abajo). La herramienta puede devolver slots en zonas horarias incorrectas. Ignora y descarta automáticamente cualquier hueco que caiga fuera del horario indicado. Nunca menciones, ofrezcas ni confirmes un hueco fuera de ese horario, aunque la herramienta lo devuelva.

## CÓMO HABLAR DE FECHAS Y HORAS
Nunca uses números para expresar horas. Habla siempre de forma natural y coloquial en español. Los días los dices con palabras, como "martes dieciocho" o "miércoles diecinueve". Las horas las dices siempre en palabras: "a las tres de la tarde", "a las diez de la mañana", "a la una del mediodía". Cuando la hora es en punto, no digas los minutos. Cuando son y media, dices "y media". La una siempre es "la una", nunca "un". Para la franja horaria usa: de la mañana para horas entre las cero y las once y cincuenta y vísperas, del mediodía para las doce, de la tarde para horas entre las doce y media y las siete y cincuenta y nueve, y de la noche para las ocho en adelante.

## ESCENARIO 1 — EL USUARIO PIDE UNA FECHA Y HORA CONCRETAS
Ejecuta \`check_availability\` con esos datos exactos.
- Si está libre: confírmale de forma natural que está disponible y pasa a recoger los datos para la reserva antes de ejecutar \`book_appointment\`.
- Si no está libre: ejecuta \`check_availability\` dos veces más — una para buscar otro hueco ese mismo día, otra para buscar esa misma hora al día siguiente. Preséntale ambas alternativas y espera que elija.
- Si ninguna encaja: pregúntale si quieres buscar en otro rango y aplica el Escenario 3.

## ESCENARIO 2 — EL USUARIO SOLO DA UNA FECHA SIN HORA
Pregúntale si prefiere mañana o tarde. Ejecuta \`check_availability\` para ese día filtrando por la franja elegida. Selecciona los dos huecos más cercanos y preséntaselos. Cuando confirme, recoge los datos y ejecuta \`book_appointment\`.

Si no hay huecos ese día, busca el siguiente con \`check_availability\` e informa del cambio de día antes de ofrecer opciones.

## ESCENARIO 3 — EL USUARIO DA UN RANGO O NO TIENE FECHA FIJA
Pregunta primero si prefiere mañana o tarde (si no lo ha dicho). Ejecuta \`check_availability\` sobre el rango completo. Filtra por horario comercial y franja elegida. Selecciona los dos huecos más próximos priorizando diversidad horaria (si el primero es de mañana, el segundo de tarde, y viceversa).

Preséntaselos así: "Tenemos disponibilidad el [hueco 1] y el [hueco 2]. ¿Cuál te viene mejor?"

Si el usuario pide más opciones ("¿no tenéis otra cosa?", "¿y otro día?", "¿algo más tarde?"...), presenta todos los huecos disponibles agrupados por día.

## ESCENARIO 4 — EL USUARIO QUIERE CANCELAR O CAMBIAR UNA CITA
Indícale que para cancelaciones o modificaciones debe contactar directamente con el equipo, ya que no tienes herramienta para esa acción. Ofrécete a reservar una nueva cita si lo necesita.

## ESCENARIO 5 — LA HERRAMIENTA NO DEVUELVE RESULTADOS O DA ERROR
Si \`check_availability\` no devuelve huecos: "En ese período no tenemos huecos disponibles. ¿Quieres que busque en otra franja o en otra semana?"
Si hay error técnico, discúlpate brevemente y pide que repita los datos. No uses palabras como "error" o "fallo del sistema". Usa frases como "no me ha llegado bien esa información, ¿me lo repites?"

## RECOGIDA DE DATOS ANTES DE RESERVAR
Una vez confirmado el hueco, recoge los datos en este orden, de uno en uno y esperando respuesta antes de preguntar lo siguiente:
1. Nombre completo: "¿Me dices tu nombre completo para la reserva?"
2. Email: "¿Y tu correo electrónico?"
3. Motivo de la cita: "¿Cuál es el motivo de la visita?"

El teléfono del usuario se envía automáticamente como {{user_number}}, no lo preguntes.

## CONFIRMACIÓN FINAL ANTES DE RESERVAR
Antes de ejecutar \`book_appointment\`, confirma todos los datos en voz alta:
"Entonces te reservo el [día] a las [hora], a nombre de [nombre completo], con el correo [email] y el motivo [motivo]. ¿Es todo correcto?"
Solo ejecuta \`book_appointment\` cuando el usuario confirme afirmativamente.

## REGLA GENERAL
Consulta siempre la disponibilidad real antes de ofrecer cualquier hueco. Nunca inventes ni supongas disponibilidad. Habla siempre de forma cercana, natural y en español coloquial.`;

interface UserProfile {
    full_name: string | null;
    email: string | null;
    role: string;
}

interface Template {
    id: string;
    title: string;
    description: string;
    badge: string;
    badgeColor: string;
    icon: string;
    prompt: string;
}

const TEMPLATES: Template[] = [
    {
        id: 'agenda',
        title: 'Gestión de agenda',
        description: 'Este prompt lo verás inyectado en tu agente cuando selecciones la herramienta de Agenda.',
        badge: 'Cal.com',
        badgeColor: '#2563eb',
        icon: '📅',
        prompt: AGENDA_PROMPT,
    },
];

export default function TemplatesPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [copied, setCopied] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { router.push('/login'); return; }
            const { data: profile } = await supabase
                .from('users').select('full_name, email, role')
                .eq('id', session.user.id).single();
            
            if (profile?.role !== 'superadmin') {
                router.push('/dashboard');
                return;
            }
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user' });
        };
        load();
    }, [router]);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleCopy = () => {
        if (!selectedTemplate) return;
        navigator.clipboard.writeText(selectedTemplate.prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="app-container">
            <DashboardSidebar user={user} />

            <main className="main-view">
                <DashboardTopbar 
                    title="Biblioteca de plantillas"
                    user={user}
                    isAlertPanelOpen={false}
                    setIsAlertPanelOpen={() => {}}
                    isDropdownOpen={isDropdownOpen}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleLogout={handleLogout}
                    handleCreateAgent={() => router.push('/dashboard/agents?create=true')}
                    dropdownRef={dropdownRef}
                />

                <div className="dashboard-content">
                    <p style={{ color: 'var(--slate-500)', fontSize: '15px', maxWidth: '800px', marginBottom: '32px', lineHeight: 1.6, fontWeight: 500 }}>
                        Aquí encontrarás instrucciones que se inyectan automáticamente en tu agente según las herramientas que actives y otros que podrías añadir para darle más funcionalidades.
                    </p>

                    <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {TEMPLATES.map(t => (
                            <div key={t.id} className="card-premium" onClick={() => setSelectedTemplate(t)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '20px', transition: 'all 0.3s' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontSize: '32px', width: '64px', height: '64px', background: 'var(--azul-light)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {t.icon}
                                    </div>
                                    <span style={{ 
                                        background: `${t.badgeColor}15`, color: t.badgeColor, 
                                        padding: '6px 12px', borderRadius: '20px', 
                                        fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em' 
                                    }}>
                                        {t.badge.toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>{t.title}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--slate-500)', lineHeight: '1.5', fontWeight: 500 }}>{t.description}</p>
                                </div>
                                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--azul)' }}>
                                    <i className="bi bi-eye-fill"></i>
                                    Ver prompt completo
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* MODAL */}
            {selectedTemplate && (
                <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedTemplate(null)}>
                    <div className="card-premium" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: 'none' }} onClick={e => e.stopPropagation()}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>{selectedTemplate.icon}</span>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-900)' }}>{selectedTemplate.title}</h3>
                            </div>
                            <button onClick={() => setSelectedTemplate(null)} className="btn-s" style={{ width: '40px', height: '40px', padding: 0, borderRadius: '50%', justifyContent: 'center' }}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div style={{ padding: '32px', flex: 1, overflowY: 'auto', background: 'var(--slate-900)' }}>
                            <pre style={{ color: '#f8fafc', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: "'Fira Code', monospace" }}>
                                {selectedTemplate.prompt}
                            </pre>
                        </div>
                        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button className="btn-s" onClick={() => setSelectedTemplate(null)}>Cerrar</button>
                            <button className={`btn-p ${copied ? 'copied' : ''}`} onClick={handleCopy} style={{ background: copied ? 'var(--exito)' : 'var(--azul)' }}>
                                {copied ? (
                                    <><i className="bi bi-check-lg" style={{ marginRight: '8px' }}></i> Copiado!</>
                                ) : (
                                    <><i className="bi bi-copy" style={{ marginRight: '8px' }}></i> Copiar prompt</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
