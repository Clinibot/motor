"use client";

import React from 'react';

export const Topbar: React.FC = () => {
    return (
        <header className="topbar" style={{ background: 'white', borderBottom: '1px solid var(--slate-100)', height: '64px' }}>
            <div></div> {/* Empty for alignment */}
            
            <div className="topbar-actions">
                <div className="btn-pill" style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-100)' }}>
                    <span style={{ color: 'var(--slate-500)', fontWeight: 500, fontSize: '12px' }}>Balance:</span>
                    <span style={{ color: 'var(--azul)', fontWeight: 800, fontSize: '13px' }}>€0.00</span>
                </div>

                <div className="user-avatar" style={{ background: 'var(--slate-100)', color: 'var(--slate-500)' }}>
                   <i className="bi bi-person"></i>
                </div>
            </div>
        </header>
    );
};
