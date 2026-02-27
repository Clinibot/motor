import { create } from 'zustand';

// Types for the Wizard State
export interface TransferDestination {
    name: string;
    number: string;
    description: string;
}

export interface CustomTool {
    name: string;
    url: string;
    description: string;
    speakDuring: boolean;
    speakAfter: boolean;
}

export interface ExtractionVariable {
    name: string;
    type: string;
    description: string;
}

export interface WizardState {
    // Step 1: Basic Info
    agentName: string;
    companyName: string;
    agentType: string;

    // Step 3: Company Info (New)
    companyAddress: string;
    companyPhone: string;
    companyWebsite: string;
    companyDescription: string;
    businessHours: { day: string; open: string; close: string; closed: boolean }[];

    // Knowledge Base (Moved to Step 2)
    kbFiles: { name: string; size: string; type: string }[];
    kbUsageInstructions: string;
    kbRetrievalChunks: number;
    kbSimilarityThreshold: number;

    // Step 2: LLM Config
    model: string;
    temperature: number;
    highPriority: boolean;
    whoFirst: 'agent' | 'user';
    beginMessage: string;
    personality: string[];
    tone: string;
    prompt: string;

    // Step 4: Voice Selection
    voiceId: string;
    voiceName: string;
    voiceProvider: string;
    voiceDescription: string;
    voiceSpeed: number;
    voiceTemperature: number;

    // Step 5: Conversation Settings
    language: string;
    responsiveness: number;
    interruptionSensitivity: number;
    enableBackchannel: boolean;
    backchannelFrequency: number;
    backchannelWords: string[];
    boostedKeywords: string[];
    normalizeForSpeech: boolean;

    // Step 6: Timings
    beginMessageDelayMs: number;
    endCallAfterSilenceMs: number;
    maxCallDurationMs: number;
    reminderTriggerMs: number;
    reminderMaxCount: number;
    ringDurationMs: number;
    enableVoicemailDetection: boolean;
    voicemailDetectionTimeoutMs: number;
    voicemailMessage: string;

    // Step 7: Audio & STT
    volume: number;
    enableAmbientSound: boolean;
    ambientSound: string;
    ambientSoundVolume: number;
    sttMode: string;
    enableTranscriptionFormatting: boolean;

    // Step 8: Tools
    enableEndCall: boolean;
    endCallDescription: string;
    enableCalBooking: boolean;
    calUrl: string;
    calApiKey: string;
    calEventId: string;
    enableTransfer: boolean;
    transferDestinations: TransferDestination[];
    enableCustomTools: boolean;
    customTools: CustomTool[];

    // Step 8: Extraction & Webhooks
    useTemplate: boolean;
    extractionVariables: ExtractionVariable[];
    enableAnalysis: boolean;
    analysisModel: string;
    webhookUrl: string;
    webhookInbound: string;

    // Global Progress
    currentStep: number;
    isSidebarOpen: boolean;

    // Actions
    updateField: (field: keyof WizardState, value: unknown) => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    resetWizard: () => void;
    toggleSidebar: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
    agentName: '',
    companyName: '',
    agentType: 'cualificacion',

    companyAddress: '',
    companyPhone: '',
    companyWebsite: '',
    companyDescription: '',
    businessHours: [
        { day: 'Lunes', open: '09:00', close: '20:00', closed: false },
        { day: 'Martes', open: '09:00', close: '20:00', closed: false },
        { day: 'Miércoles', open: '09:00', close: '20:00', closed: false },
        { day: 'Jueves', open: '09:00', close: '20:00', closed: false },
        { day: 'Viernes', open: '09:00', close: '20:00', closed: false },
        { day: 'Sábado', open: '09:00', close: '14:00', closed: true },
        { day: 'Domingo', open: '09:00', close: '14:00', closed: true },
    ],
    kbFiles: [],
    kbUsageInstructions: '',
    kbRetrievalChunks: 3,
    kbSimilarityThreshold: 0.7,

    model: 'gpt-4.1',
    temperature: 0.7,
    highPriority: false,
    whoFirst: 'agent',
    beginMessage: '',
    personality: ['Profesional'],
    tone: 'Semiformal',
    prompt: 'Eres un asistente útil.',

    voiceId: 'retell-11labs-Adrian',
    voiceName: 'Adrián',
    voiceProvider: 'retell',
    voiceDescription: 'Voz profesional y clara de España',
    voiceSpeed: 1.0,
    voiceTemperature: 1.0,

    language: 'es-ES',
    responsiveness: 1.0,
    interruptionSensitivity: 1.0,
    enableBackchannel: false,
    backchannelFrequency: 0.9,
    backchannelWords: ['Ajá', 'Entiendo', 'Mmm', 'Claro'],
    boostedKeywords: [],
    normalizeForSpeech: true,

    beginMessageDelayMs: 200,
    endCallAfterSilenceMs: 59000,
    maxCallDurationMs: 601000,
    reminderTriggerMs: 30000,
    reminderMaxCount: 1,
    ringDurationMs: 30000,
    enableVoicemailDetection: false,
    voicemailDetectionTimeoutMs: 5000,
    voicemailMessage: '',

    volume: 1.0,
    enableAmbientSound: false,
    ambientSound: 'none',
    ambientSoundVolume: 0.2,
    sttMode: 'accurate',
    enableTranscriptionFormatting: true,

    enableEndCall: true,
    endCallDescription: 'Finaliza la llamada de forma cordial después de confirmar que el usuario no necesita nada más.',
    enableCalBooking: false,
    calUrl: '',
    calApiKey: '',
    calEventId: '',
    enableTransfer: false,
    transferDestinations: [],
    enableCustomTools: false,
    customTools: [],

    useTemplate: false,
    extractionVariables: [],
    enableAnalysis: false,
    analysisModel: 'gpt-4.1',
    webhookUrl: '',
    webhookInbound: '',

    currentStep: 1,
    isSidebarOpen: false,

    updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 9), isSidebarOpen: false })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1), isSidebarOpen: false })),
    setStep: (step) => set({ currentStep: step, isSidebarOpen: false }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    resetWizard: () => set({
        agentName: '', companyName: '', agentType: 'cualificacion',
        model: 'gpt-4.1', temperature: 0.7, highPriority: false, whoFirst: 'agent', beginMessage: '',
        personality: ['Profesional'], tone: 'Semiformal', prompt: 'Eres un asistente útil.',
        voiceId: 'retell-11labs-Adrian', voiceName: 'Adrián', voiceProvider: 'retell', voiceDescription: 'Voz profesional y clara de España', voiceSpeed: 1.0, voiceTemperature: 1.0,
        language: 'es-ES', responsiveness: 1.0, interruptionSensitivity: 1.0,
        enableBackchannel: false, backchannelFrequency: 0.9, backchannelWords: ['Ajá', 'Entiendo', 'Mmm', 'Claro'],
        boostedKeywords: [], normalizeForSpeech: true,
        beginMessageDelayMs: 200, endCallAfterSilenceMs: 59000, maxCallDurationMs: 601000,
        reminderTriggerMs: 30000, reminderMaxCount: 1, ringDurationMs: 30000,
        enableVoicemailDetection: false, voicemailDetectionTimeoutMs: 5000, voicemailMessage: '',
        volume: 1.0, enableAmbientSound: false, ambientSound: 'none', ambientSoundVolume: 0.2,
        sttMode: 'accurate', enableTranscriptionFormatting: true,
        enableEndCall: true, endCallDescription: 'Finaliza la llamada de forma cordial después de confirmar que el usuario no necesita nada más.',
        enableCalBooking: false, calUrl: '', calApiKey: '', calEventId: '',
        enableTransfer: false, transferDestinations: [], enableCustomTools: false, customTools: [],
        useTemplate: false, extractionVariables: [], enableAnalysis: false, analysisModel: 'gpt-4.1',
        webhookUrl: '', webhookInbound: '', companyAddress: '', companyPhone: '', companyWebsite: '', companyDescription: '',
        businessHours: [
            { day: 'Lunes', open: '09:00', close: '20:00', closed: false },
            { day: 'Martes', open: '09:00', close: '20:00', closed: false },
            { day: 'Miércoles', open: '09:00', close: '20:00', closed: false },
            { day: 'Jueves', open: '09:00', close: '20:00', closed: false },
            { day: 'Viernes', open: '09:00', close: '20:00', closed: false },
            { day: 'Sábado', open: '09:00', close: '14:00', closed: true },
            { day: 'Domingo', open: '09:00', close: '14:00', closed: true },
        ],
        kbFiles: [], kbUsageInstructions: '', kbRetrievalChunks: 3, kbSimilarityThreshold: 0.7,
        currentStep: 1
    })
}));
