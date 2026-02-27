"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/wizard/Sidebar';
import { Topbar } from '../../components/wizard/Topbar';
import { useWizardStore } from '../../store/wizardStore';
import { Step1_Type } from '../../components/wizard/steps/Step1_Type';
import { Step2_LLM } from '../../components/wizard/steps/Step2_LLM';
import { Step2_CompanyInfo } from '../../components/wizard/steps/Step2_CompanyInfo';
import { Step3_Voice } from '../../components/wizard/steps/Step3_Voice';
import { Step4_Conversation } from '../../components/wizard/steps/Step4_Conversation';
import { Step5_Timings } from '../../components/wizard/steps/Step5_Timings';
import { Step7_Tools } from '../../components/wizard/steps/Step7_Tools';
import { Step8_Summary } from '../../components/wizard/steps/Step8_Summary';

export default function WizardPage() {
    const currentStep = useWizardStore((state) => state.currentStep);
    const isSidebarOpen = useWizardStore((state) => state.isSidebarOpen);
    const toggleSidebar = useWizardStore((state) => state.toggleSidebar);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration errors — do not render until client-side mounted
    if (!mounted) return null;

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1_Type />;
            case 2: return <Step2_CompanyInfo />;
            case 3: return <Step3_Voice />;
            case 4: return <Step4_Conversation />;
            case 5: return <Step5_Timings />;
            case 6: return <Step7_Tools />;
            case 7: return <Step2_LLM />;
            case 8: return <Step8_Summary />;
            default: return <Step1_Type />;
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f5f6f8]">
            <Sidebar />

            {/* Mobile Overlay */}
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
