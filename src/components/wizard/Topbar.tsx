"use client";

import React from 'react';

export const Topbar: React.FC = () => {
    return (
        <header className="topbar" style={{ 
            position: 'sticky', 
            top: 0, 
            zIndex: 10, 
            background: 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--gris-borde)',
            padding: '20px 32px'
        }}>
            <h1 className="form-title" style={{ margin: 0, fontSize: '18px' }}>Asistente de Configuración</h1>
        </header>
    );
};
