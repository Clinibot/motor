"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { Sidebar } from '../../components/wizard/Sidebar';
import { Topbar } from '../../components/wizard/Topbar';
import { useWizardStore } from '../../store/wizardStore';
import { Step1_BasicInfo } from '../../components/wizard/steps/Step1_BasicInfo';
import { Step2_LLM } from '../../components/wizard/steps/Step2_LLM';
import { Step3_Voice } from '../../components/wizard/steps/Step3_Voice';
import { Step4_Audio } from '../../components/wizard/steps/Step4_Audio';
import { Step5_Tools } from '../../components/wizard/steps/Step5_Tools';
import { Step6_Summary } from '../../components/wizard/steps/Step6_Summary';

function WizardContent() {
    const currentStep = useWizardStore((state) => state.currentStep);
    const setEditingAgent = useWizardStore((state) => state.setEditingAgent);
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);

    useEffect(() => {
        setMounted(true);
        const loadEditData = async () => {
            const editId = searchParams.get('editId');
            const targetStep = searchParams.get('step');
            if (editId) {
                setIsLoadingEdit(true);
                try {
                    const supabase = createClient();
                    const { data: agent, error } = await supabase
                        .from('agents')
                        .select('configuration')
                        .eq('id', editId)
                        .single();

                    if (!error && agent?.configuration) {
                        setEditingAgent(editId, agent.configuration);
                        if (targetStep) {
                            const stepNum = parseInt(targetStep);
                            if (!isNaN(stepNum) && stepNum >= 1 && stepNum <= 6) {
                                useWizardStore.getState().setStep(stepNum);
                            }
                        }
                    } else {
                        console.error("Agent config not found:", error);
                        router.push('/dashboard/agents');
                    }
                } catch (err) {
                    console.error("Failed to load edit config:", err);
                } finally {
                    setIsLoadingEdit(false);
                }
            }
        };
        loadEditData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, router]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });

        // Also attempt to scroll the main scrolling container if the layout absorbs the scroll
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'instant' });
        }

        // As a fallback for deep flex-box layouts
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, [currentStep]);

    // Prevent hydration errors — do not render until client-side mounted
    if (!mounted) return null;

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1_BasicInfo />;
            case 2: return <Step2_LLM />;
            case 3: return <Step3_Voice />;
            case 4: return <Step4_Audio />;
            case 5: return <Step5_Tools />;
            case 6: return <Step6_Summary />;
            default: return <Step1_BasicInfo />;
        }
    };

    if (isLoadingEdit) {
        return (
            <div className="flex min-h-screen bg-[#f5f6f8] items-center justify-center">
                <div className="text-center text-gray-500">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <p>Cargando configuración del agente...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gris-bg)' }}>
            <Sidebar />

            <main className="wiz-main">
                <Topbar />
                <div className="wiz-content">
                    {renderStep()}
                </div>
            </main>
        </div>
    );
}

export default function WizardPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen bg-[#f5f6f8] items-center justify-center">
                <div className="text-center text-gray-500">
                    <div className="spinner-border text-primary mb-3" role="status"></div>
                    <p>Iniciando asistente...</p>
                </div>
            </div>
        }>
            <WizardContent />
        </Suspense>
    );
}
