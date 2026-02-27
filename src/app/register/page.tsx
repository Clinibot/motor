"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
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
                options: { data: { full_name: fullName } }
            });
            if (error) {
                setError(error.message);
                return;
            }
            setSuccess(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: '#f5f6f8',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px'
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <svg width="140" height="36" viewBox="0 0 140 36">
                        <text x="5" y="28" fontFamily="Inter, sans-serif" fontSize="26" fontWeight="700" fill="#267ab0">netelip</text>
                    </svg>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#6c757d', fontWeight: 500 }}>
                        Fábrica de Agentes IA
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '40px'
                }}>
                    {success ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
                            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a2428', marginBottom: '8px' }}>Revisa tu email</h2>
                            <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: 1.6 }}>
                                Hemos enviado un enlace de confirmación a <strong>{email}</strong>. Haz clic en él para activar tu cuenta.
                            </p>
                            <Link href="/login" style={{
                                display: 'inline-block', marginTop: '24px',
                                padding: '10px 24px', background: '#267ab0',
                                color: 'white', borderRadius: '8px', textDecoration: 'none',
                                fontSize: '14px', fontWeight: 600
                            }}>
                                Volver al login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2428', margin: '0 0 6px 0' }}>
                                Crear cuenta
                            </h1>
                            <p style={{ fontSize: '14px', color: '#6c757d', margin: '0 0 32px 0' }}>
                                Configura tu espacio de trabajo
                            </p>

                            {error && (
                                <div style={{
                                    background: '#fef2f2', border: '1px solid #fecaca',
                                    borderRadius: '8px', padding: '12px 16px',
                                    fontSize: '14px', color: '#dc2626', marginBottom: '20px'
                                }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRegister}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a2428', marginBottom: '6px' }}>
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Tu nombre y apellidos"
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            border: '1px solid #e5e7eb', borderRadius: '8px',
                                            fontSize: '14px', color: '#1a2428',
                                            outline: 'none', boxSizing: 'border-box',
                                            fontFamily: 'inherit', background: 'white'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#267ab0'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a2428', marginBottom: '6px' }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="tu@empresa.com"
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            border: '1px solid #e5e7eb', borderRadius: '8px',
                                            fontSize: '14px', color: '#1a2428',
                                            outline: 'none', boxSizing: 'border-box',
                                            fontFamily: 'inherit', background: 'white'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#267ab0'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>

                                <div style={{ marginBottom: '28px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#1a2428', marginBottom: '6px' }}>
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Mínimo 8 caracteres"
                                        minLength={8}
                                        style={{
                                            width: '100%', padding: '10px 14px',
                                            border: '1px solid #e5e7eb', borderRadius: '8px',
                                            fontSize: '14px', color: '#1a2428',
                                            outline: 'none', boxSizing: 'border-box',
                                            fontFamily: 'inherit', background: 'white'
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#267ab0'}
                                        onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        width: '100%', padding: '12px',
                                        background: isLoading ? '#6b9fc7' : '#267ab0',
                                        color: 'white', border: 'none', borderRadius: '8px',
                                        fontSize: '15px', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.2s', fontFamily: 'inherit'
                                    }}
                                    onMouseEnter={e => { if (!isLoading) (e.target as HTMLButtonElement).style.background = '#1e6291'; }}
                                    onMouseLeave={e => { if (!isLoading) (e.target as HTMLButtonElement).style.background = '#267ab0'; }}
                                >
                                    {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                                </button>
                            </form>

                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                                <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                    ¿Ya tienes cuenta?{' '}
                                    <Link href="/login" style={{ color: '#267ab0', fontWeight: 600, textDecoration: 'none' }}>
                                        Inicia sesión
                                    </Link>
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#9ca3af' }}>
                    © 2025 Netelip · Fábrica de Agentes IA
                </p>
            </div>
        </div>
    );
}
