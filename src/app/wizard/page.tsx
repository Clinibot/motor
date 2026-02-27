"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { Sidebar } from '../../components/wizard/Sidebar';
import { Topbar } from '../../components/wizard/Topbar';
import { useWizardStore } from '../../store/wizardStore';
import { Step1_Type } from '../../components/wizard/steps/Step1_Type';
import { Step2_LLM } from '../../components/wizard/steps/Step2_LLM';
import { Step2_CompanyInfo } from '../../components/wizard/steps/Step2_CompanyInfo';
import { Step3_Voice } from '../../components/wizard/steps/Step3_Voice';
import { Step4_Conversation } from '../../components/wizard/steps/Step4_Conversation';
import { Step5_Timings } from '../../components/wizard/steps/Step5_Timings';
import { Step6_Audio } from '../../components/wizard/steps/Step6_Audio';
import { Step7_Tools } from '../../components/wizard/steps/Step7_Tools';
import { Step8_Summary } from '../../components/wizard/steps/Step8_Summary';

function WizardContent() {
    const currentStep = useWizardStore((state) => state.currentStep);
    const isSidebarOpen = useWizardStore((state) => state.isSidebarOpen);
    const toggleSidebar = useWizardStore((state) => state.toggleSidebar);
    const setEditingAgent = useWizardStore((state) => state.setEditingAgent);
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isLoadingEdit, setIsLoadingEdit] = useState(false);

    useEffect(() => {
        setMounted(true);
        const loadEditData = async () => {
            const editId = searchParams.get('editId');
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

    // Prevent hydration errors — do not render until client-side mounted
    if (!mounted) return null;

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1_Type />;
            case 2: return <Step2_LLM />;
            case 3: return <Step2_CompanyInfo />;
            case 4: return <Step3_Voice />;
            case 5: return <Step4_Conversation />;
            case 6: return <Step5_Timings />;
            case 7: return <Step6_Audio />;
            case 8: return <Step7_Tools />;
            case 9: return <Step8_Summary />;
            default: return <Step1_Type />;
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
        <div className="flex min-h-screen bg-[#f5f6f8]">
            <Sidebar />

            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={toggleSidebar}
            ></div>

            <main className="main-content flex-1">
                <Topbar />
                {renderStep()}
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
