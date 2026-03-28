"use client";

import React from 'react';

export const Topbar: React.FC = () => {
    return (
        <div className="topbar" style={{ padding: '24px 32px', display: 'flex', alignItems: 'center' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Crear agente IA</h1>
        </div>
    );
};
