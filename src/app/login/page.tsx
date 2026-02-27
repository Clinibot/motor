"use client";

import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Bot } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                setError(error.message);
                return;
            }
            router.push('/dashboard');
            router.refresh();
        } finally {
            setIsLoading(false);
        }
    };

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
                        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 700, margin: 0 }}>Fábrica de Agentes</h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: '4px 0 0 0' }}>Inicia sesión en tu cuenta</p>
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

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
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
                            {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '24px', color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
                        ¿No tienes cuenta?{' '}
                        <Link href="/register" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
                            Regístrate
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
