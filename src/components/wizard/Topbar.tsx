"use client";

import React from 'react';

export const Topbar: React.FC = () => {
    return (
        <header className="topbar">
            <h1 className="topbar-title">Asistente de Configuración</h1>
            
            <div className="topbar-actions">
                <div className="btn-pill">
                    <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>Balance:</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 700 }}>€0.000</span>
                </div>

                <div className="user-avatar">
                   <i className="bi bi-person text-[18px]"></i>
                </div>
            </div>
        </header>
    );
};
