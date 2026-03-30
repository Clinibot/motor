"use client";

import React from 'react';

export const Topbar: React.FC = () => {
    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'white',
            borderBottom: '1px solid var(--gris-borde)',
            padding: '0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px',
            flexShrink: 0,
        }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--oscuro)', letterSpacing: '-0.3px' }}>
                Crear agente IA
            </div>
            <div></div>
        </header>
    );
};
