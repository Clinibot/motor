"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';

const AGENDA_PROMPT = `# GESTIÓN DE AGENDA Y DISPONIBILIDAD

Tienes acceso a dos herramientas para gestionar citas: \`check_availability\` y \`book_appointment\`. Úsalas siempre que el usuario quiera reservar, pregunte por horarios o quiera agendar una visita.

## HORARIO COMERCIAL — REGLA CRÍTICA
Antes de ofrecer cualquier hueco, filtra los resultados por el horario de apertura de la empresa (ver sección "# Horario comercial" más abajo). La herramienta puede devolver slots en zonas horarias incorrectas. Ignora y descarta automáticamente cualquier hueco que caiga fuera del horario indicado. Nunca menciones, ofrezcas ni confirmes un hueco fuera de ese horario, aunque la herramienta lo devuelva.

## CÓMO HABLAR DE FECHAS Y HORAS
Nunca uses números para expresar horas. Habla siempre de forma natural y coloquial en español. Los días los dices con palabras, como "martes dieciocho" o "miércoles diecinueve". Las horas las dices siempre en palabras: "a las tres de la tarde", "a las diez de la mañana", "a la una del mediodía". Cuando la hora es en punto, no digas los minutos. Cuando son y media, dices "y media". La una siempre es "la una", nunca "un". Para la franja horaria usa: de la mañana para horas entre las cero y las once y cincuenta y nueve, del mediodía para las doce, de la tarde para horas entre las doce y media y las siete y cincuenta y nueve, y de la noche para las ocho en adelante.

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
        badgeColor: '#267ab0',
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
            setUser(profile ?? { full_name: session.user.email ?? null, email: session.user.email ?? null, role: 'user' });
        };
        load();
    }, [router]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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

    const userInitial = (user?.full_name || user?.email || 'U')[0].toUpperCase();

    const navItems = [
        { label: 'Dashboard', href: '/dashboard', icon: 'M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z', active: false },
        { label: 'Mis agentes IA', href: '/dashboard/agents', icon: 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', active: false },
        { label: 'Mis números', href: '/dashboard/numbers', icon: 'M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z', active: false },
        { label: 'Biblioteca de plantillas', href: '/dashboard/templates', icon: 'M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z', active: true },
        { label: 'Configuración', href: '#', icon: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z', active: false },
        { label: 'Ayuda y soporte', href: '#', icon: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z', active: false },
    ];

    return (
        <div suppressHydrationWarning style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                *{margin:0;padding:0;box-sizing:border-box}
                body{font-family:'Inter',-apple-system,sans-serif;background:#f5f5f5;color:#1a1a1a}
                .sidebar{position:fixed;left:0;top:0;bottom:0;width:260px;background:#fff;border-right:1px solid #e5e7eb;z-index:100;display:flex;flex-direction:column}
                .logo-container{padding:24px 20px;border-bottom:1px solid #e5e7eb}
                .nav-menu{flex:1;padding:20px 0;overflow-y:auto}
                .nav-item{display:flex;align-items:center;padding:12px 20px;color:#6b7280;text-decoration:none;transition:all .2s;font-size:14px;font-weight:500;cursor:pointer;border:none;background:none;width:100%;text-align:left}
                .nav-item:hover{background:#f9fafb;color:#267ab0}
                .nav-item.active{background:#eff6fb;color:#267ab0;border-right:3px solid #267ab0}
                .nav-icon{width:20px;height:20px;margin-right:12px;flex-shrink:0}
                .main-content{margin-left:260px;min-height:100vh;display:flex;flex-direction:column;background:#f5f6f8}
                .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:50}
                .user-profile-container{position:relative}
                .user-dropdown{position:absolute;top:calc(100% + 10px);right:0;width:220px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 25px -5px rgba(0,0,0,.1);z-index:1000;overflow:hidden;animation:slideDown .2s cubic-bezier(.16,1,.3,1);transform-origin:top right}
                .user-dropdown-header{padding:16px;border-bottom:1px solid #f3f4f6;background:#f9fafb;text-align:center}
                .user-dropdown-name{font-size:14px;font-weight:600;color:#1a1a1a;display:block}
                .user-dropdown-email{margin:4px 0 0;font-size:12px;color:#6b7280;display:block}
                .user-dropdown-body{padding:8px}
                .user-dropdown-item{width:100%;padding:10px 12px;display:flex;align-items:center;gap:10px;border:none;background:transparent;cursor:pointer;font-size:14px;font-weight:500;border-radius:8px;transition:all .2s;color:#4b5563}
                .user-dropdown-item:hover{background:#f3f4f6;color:#1a1a1a}
                .user-dropdown-item.text-red{color:#dc2626}
                .user-dropdown-item.text-red:hover{background:#fef2f2;color:#b91c1c}
                .user-avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#267ab0 0%,#1e5a87 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;cursor:pointer;border:none}
                .content{flex:1;padding:32px}
                @keyframes slideDown{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}

                /* Templates grid */
                .templates-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;margin-top:24px}
                .template-card{background:#fff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;cursor:pointer;transition:all .25s;display:flex;flex-direction:column;gap:16px}
                .template-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(38,122,176,.12);border-color:#267ab0}
                .template-icon{font-size:36px;width:64px;height:64px;background:#eff6fb;border-radius:14px;display:flex;align-items:center;justify-content:center}
                .template-badge{display:inline-flex;align-items:center;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}
                .template-title{font-size:18px;font-weight:700;color:#1a1a1a}
                .template-desc{font-size:13px;color:#6b7280;line-height:1.6}
                .template-cta{margin-top:auto;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#267ab0}

                /* Modal */
                .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px}
                .modal-box{background:#1e1e2e;border-radius:20px;width:100%;max-width:760px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 30px 60px rgba(0,0,0,.4);animation:modal-enter .25s cubic-bezier(.16,1,.3,1);overflow:hidden}
                .modal-header{padding:20px 28px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,.08);background:#16162a}
                .modal-title{font-size:17px;font-weight:700;color:#f8f8f2;display:flex;align-items:center;gap:10px}
                .modal-close{width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(255,255,255,.08);border:none;cursor:pointer;color:#cdd6f4;transition:all .2s}
                .modal-close:hover{background:rgba(255,255,255,.15)}
                .modal-body{flex:1;overflow-y:auto;padding:24px 28px}
                .prompt-editor{width:100%;background:transparent;border:none;outline:none;color:#f8f8f2;font-family:'Fira Code','Fira Mono','Cascadia Code',monospace;font-size:13px;line-height:1.75;resize:none;min-height:420px}
                .modal-footer{padding:16px 28px;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:flex-end;gap:12px;background:#16162a}
                .btn-copy{padding:10px 22px;background:#267ab0;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:8px}
                .btn-copy:hover{background:#1e5a87;transform:translateY(-1px)}
                .btn-copy.copied{background:#10b981}
                .btn-cancel{padding:10px 22px;background:rgba(255,255,255,.07);color:#cdd6f4;border:1px solid rgba(255,255,255,.12);border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
                .btn-cancel:hover{background:rgba(255,255,255,.12)}
                @keyframes modal-enter{from{opacity:0;transform:scale(.96)translateY(8px)}to{opacity:1;transform:scale(1)translateY(0)}}
            `}</style>

            {/* SIDEBAR */}
            <aside className="sidebar">
                <div className="logo-container">
                    <svg width="120" height="30" viewBox="0 0 120 30" style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                        <text x="5" y="22" fontFamily="Inter, sans-serif" fontSize="20" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                </div>
                <nav className="nav-menu">
                    {navItems.map(item => (
                        <Link key={item.label} href={item.href} className={`nav-item${item.active ? ' active' : ''}`}>
                            <svg className="nav-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d={item.icon} clipRule="evenodd" />
                            </svg>
                            {item.label}
                        </Link>
                    ))}
                    {user?.role === 'superadmin' && (
                        <>
                            <div style={{ margin: '0 20px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.8px', display: 'block', paddingBottom: '8px' }}>Administración</span>
                            </div>
                            <Link href="/admin" className="nav-item" style={{ color: '#7c3aed' }}>Panel de Admin</Link>
                        </>
                    )}
                </nav>
            </aside>

            {/* MAIN */}
            <main className="main-content">
                <header className="topbar">
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a' }}>Biblioteca de plantillas</h1>
                    </div>
                    <div ref={dropdownRef} className="user-profile-container">
                        <button className="user-avatar" onClick={() => setIsDropdownOpen(!isDropdownOpen)} title="Mi perfil">
                            {userInitial}
                        </button>
                        {isDropdownOpen && (
                            <div className="user-dropdown">
                                <div className="user-dropdown-header">
                                    <span className="user-dropdown-name">{user?.full_name || 'Mi cuenta'}</span>
                                    <span className="user-dropdown-email">{user?.email}</span>
                                </div>
                                <div className="user-dropdown-body">
                                    <button onClick={handleLogout} className="user-dropdown-item text-red">
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Cerrar sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <div className="content">
                    <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '600px' }}>
                        Aquí encontrarás los prompts que se inyectan automáticamente en tu agente según las herramientas que actives. Puedes consultarlos y copiarlos para adaptarlos si lo necesitas.
                    </p>

                    <div className="templates-grid">
                        {TEMPLATES.map(t => (
                            <div key={t.id} className="template-card" onClick={() => setSelectedTemplate(t)}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div className="template-icon">{t.icon}</div>
                                    <span className="template-badge" style={{ background: `${t.badgeColor}18`, color: t.badgeColor }}>
                                        {t.badge}
                                    </span>
                                </div>
                                <div>
                                    <div className="template-title">{t.title}</div>
                                    <div className="template-desc" style={{ marginTop: '6px' }}>{t.description}</div>
                                </div>
                                <div className="template-cta">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Ver prompt completo
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* MODAL */}
            {selectedTemplate && (
                <div className="modal-overlay" onClick={() => setSelectedTemplate(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">
                                <span>{selectedTemplate.icon}</span>
                                {selectedTemplate.title}
                                <span className="template-badge" style={{ background: `${selectedTemplate.badgeColor}25`, color: selectedTemplate.badgeColor, fontSize: '10px' }}>
                                    {selectedTemplate.badge}
                                </span>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedTemplate(null)}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="modal-body">
                            <textarea
                                className="prompt-editor"
                                value={selectedTemplate.prompt}
                                readOnly
                                spellCheck={false}
                                rows={30}
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setSelectedTemplate(null)}>Cerrar</button>
                            <button className={`btn-copy${copied ? ' copied' : ''}`} onClick={handleCopy}>
                                {copied ? (
                                    <><svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Copiado!</>
                                ) : (
                                    <><svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copiar prompt</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
