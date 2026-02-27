"use client";

import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';
import { Loader2, Bot } from 'lucide-react';

export default function RegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });

            if (error) {
                setError(error.message);
                return;
            }

            // Show confirmation screen
            setSuccess(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
                fontFamily: "'Inter', sans-serif"
            }}>
                <div style={{
                    width: '100%', maxWidth: '420px', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)', padding: '40px', textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
                    <h2 style={{ color: 'white', fontWeight: 700, fontSize: '22px', margin: '0 0 12px 0' }}>¡Revisa tu email!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
                        Te hemos enviado un enlace de confirmación a <strong style={{ color: '#a78bfa' }}>{email}</strong>.
                        Haz clic en él para activar tu cuenta.
                    </p>
                    <Link href="/login" style={{
                        display: 'inline-block', marginTop: '28px', padding: '12px 28px', borderRadius: '10px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white', fontWeight: 600, fontSize: '14px', textDecoration: 'none'
                    }}>
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                width: '100%', maxWidth: '420px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center'
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
                    }}>
                        <Bot size={28} color="white" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: 0 }}>Crear cuenta</h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '4px 0 0 0' }}>Empieza a crear tus agentes de IA</p>
                    </div>
                </div>

                {/* Card */}
                <div style={{
                    width: '100%', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(20px)',
                    padding: '32px'
                }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px', padding: '12px 16px', color: '#fca5a5',
                            fontSize: '14px', marginBottom: '20px'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Sonia Ortiz"
                                style={{
                                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="tu@empresa.com"
                                style={{
                                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                                Contraseña
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                style={{
                                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                marginTop: '8px', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: 'white', fontWeight: 600, fontSize: '15px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s'
                            }}
                        >
                            {isLoading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
                            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '24px', color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
                            Inicia sesión
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
