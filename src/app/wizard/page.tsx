"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '../../components/wizard/Sidebar';
import { Topbar } from '../../components/wizard/Topbar';
import { useWizardStore } from '../../store/wizardStore';

// Import all steps
import { Step1_Type } from '../../components/wizard/steps/Step1_Type';
import { Step2_LLM } from '../../components/wizard/steps/Step2_LLM';
import { Step3_Voice } from '../../components/wizard/steps/Step3_Voice';
import { Step4_Conversation } from '../../components/wizard/steps/Step4_Conversation';
import { Step5_Timings } from '../../components/wizard/steps/Step5_Timings';
import { Step6_Audio } from '../../components/wizard/steps/Step6_Audio';
import { Step7_Tools } from '../../components/wizard/steps/Step7_Tools';
import { Step8_Summary } from '../../components/wizard/steps/Step8_Summary';

export default function WizardPage() {
    const currentStep = useWizardStore((state) => state.currentStep);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent hydration errors by not rendering the dynamic step until mounted
    if (!mounted) {
        return null;
    }

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <Step1_Type />;
            case 2: return <Step2_LLM />;
            case 3: return <Step3_Voice />;
            case 4: return <Step4_Conversation />;
            case 5: return <Step5_Timings />;
            case 6: return <Step6_Audio />;
            case 7: return <Step7_Tools />;
            case 8: return <Step8_Summary />;
            default: return <Step1_Type />;
        }
    };

    return (
        <div className="layout">
            <Sidebar />
            <div className="main-content">
                <Topbar />
                {renderStep()}
            </div>

            <style jsx global>{`
                /* Some additional global styles specific to the wizard structure if needed */
                .layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    height: 100vh;
                    overflow: hidden;
                    background: #f8fafc;
                }
                .main-content {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    overflow-y: auto;
                    position: relative;
                }
            `}</style>
        </div>
    );
}
