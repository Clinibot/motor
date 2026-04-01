import { create } from 'zustand';

// Types for the Wizard State
export interface Voice {
    voice_id: string;
    voice_name: string;
    provider: string;
    language: string;
    gender: 'male' | 'female' | 'non-binary';
    accent?: string;
    preview_audio_url?: string;
    isComingSoon?: boolean;
}

export const CURATED_VOICES_V2: Voice[] = [
    { voice_id: 'custom-carolina', voice_name: 'Carolina', provider: 'premium', gender: 'female', language: 'es', accent: 'Natural, Neutral and Clear' },
    { voice_id: 'v2-manuel', voice_name: 'Manuel', provider: 'premium', gender: 'male', language: 'es', preview_audio_url: 'https://storage.googleapis.com/retell-api/manuel.mp3' },
    { voice_id: 'v2-santiago', voice_name: 'Santiago', provider: 'premium', gender: 'male', language: 'es', preview_audio_url: 'https://storage.googleapis.com/retell-api/santiago.mp3' },
    { voice_id: '11labs-YDDaC9XKjODs7hY78qEW', voice_name: 'MariCarmen', provider: 'premium', gender: 'female', language: 'es', accent: 'Hurried and Intimidating' },
    { voice_id: '11labs-gD1IexrzCvsXPHUuT0s3', voice_name: 'Sara Martin', provider: 'premium', gender: 'female', language: 'es', accent: 'Young and Reflective' },
    { voice_id: '11labs-Andrea', voice_name: 'Andrea', provider: 'premium', gender: 'female', language: 'es', accent: 'Mexicano' },
    { voice_id: 'retell-Nico', voice_name: 'Nico', provider: 'premium', gender: 'male', language: 'en' },
    { voice_id: 'v2-willa', voice_name: 'Willa', provider: 'premium', gender: 'female', language: 'en', preview_audio_url: 'https://storage.googleapis.com/retell-api/willa.mp3' },
    { voice_id: 'openai-Cimo', voice_name: 'Cimo', provider: 'premium', gender: 'female', language: 'ca', accent: 'Multilingüe', preview_audio_url: 'https://storage.googleapis.com/retell-api/cimo.mp3' },
    { voice_id: 'openai-Alloy', voice_name: 'Alloy', provider: 'standard', gender: 'male', language: 'ca' },
];

export interface TransferDestination {
    name: string;
    description: string;
    number?: string; // Para humanos
    agentId?: string; // Para otros agentes de Retell
    destination_type: 'number' | 'agent';
    transfer_mode?: 'cold' | 'warm';
}

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
}

export interface CustomTool {
    name: string;
    url: string;
    description: string;
    speakDuring: boolean;
    speakDuringMsg?: string;
    speakAfter: boolean;
    speakAfterMsg?: string;
    parameters: ToolParameter[];
}

export interface ExtractionVariable {
    name: string;
    type: string;
    description: string;
    required?: boolean;
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
    kbFiles: { id: string; name: string; retell_name?: string; size: string; type: string }[];
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
    calTimezone: string;
    enableCalCancellation: boolean;
    calSearchDays: number;
    enableTransfer: boolean;
    transferWhen: string;
    transferDestinations: TransferDestination[];
    enableCustomTools: boolean;
    customTools: CustomTool[];

    // Step 8: Extraction & Webhooks
    useTemplate: boolean;
    extractionVariables: ExtractionVariable[];
    leadQuestions: { question: string; key: string; failAction?: 'end_call' | 'transfer' | 'booking' | 'continue'; failTransferIdx?: number }[];
    enableAnalysis: boolean;
    analysisModel: string;
    webhookUrl: string;
    customNotes: string;

    // Edit Mode
    editingAgentId: string | null;

    // Global Progress
    currentStep: number;
    isSidebarOpen: boolean;

    // Actions
    updateField: (field: keyof WizardState, value: unknown) => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    setEditingAgent: (agentId: string, agentData: Partial<WizardState>) => void;
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

    model: 'gemini-3.0-flash',
    temperature: 0,
    highPriority: false,
    whoFirst: 'agent',
    beginMessage: '',
    personality: ['Profesional'],
    tone: 'Semiformal',
    prompt: 'Eres un asistente útil.',

    voiceId: 'custom-carolina',
    voiceName: 'Carolina',
    voiceProvider: 'elevenlabs',
    voiceDescription: 'Voz natural y profesional para atención al cliente',
    voiceSpeed: 1.0,
    voiceTemperature: 1.0,

    language: 'es-ES',
    responsiveness: 0.8,
    interruptionSensitivity: 0.8,
    enableBackchannel: true,
    backchannelFrequency: 0.9,
    backchannelWords: ['Ajá', 'Entiendo', 'Mmm', 'Claro'],
    boostedKeywords: [],
    normalizeForSpeech: true,

    beginMessageDelayMs: 200,
    endCallAfterSilenceMs: 59000,
    maxCallDurationMs: 540000,
    reminderTriggerMs: 30000,
    reminderMaxCount: 1,
    ringDurationMs: 30000,

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
    calTimezone: 'Europe/Madrid',
    enableCalCancellation: false,
    calSearchDays: 6,
    enableTransfer: false,
    transferWhen: '',
    transferDestinations: [],
    enableCustomTools: false,
    customTools: [],

    useTemplate: false,
    extractionVariables: [],
    leadQuestions: [],
    enableAnalysis: false,
    analysisModel: 'gpt-4.1',
    webhookUrl: '',
    customNotes: '',

    // Edit Mode
    editingAgentId: null,

    currentStep: 1,
    isSidebarOpen: false,

    updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 6), isSidebarOpen: false })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1), isSidebarOpen: false })),
    setStep: (step) => set({ currentStep: step, isSidebarOpen: false }),
    setEditingAgent: (agentId, agentData) => set((state) => ({
        ...state,
        ...agentData,
        editingAgentId: agentId,
        currentStep: 6, // Go straight to summary
        isSidebarOpen: false
    })),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    resetWizard: () => set({
        agentName: '', companyName: '', agentType: 'cualificacion',
        model: 'gemini-3.0-flash', temperature: 0, highPriority: false, whoFirst: 'agent', beginMessage: '',
        personality: ['Profesional'], tone: 'Semiformal', prompt: 'Eres un asistente útil.',
        voiceId: 'custom-carolina', voiceName: 'Carolina', voiceProvider: 'elevenlabs', voiceDescription: 'Voz natural y profesional para atención al cliente', voiceSpeed: 1.0, voiceTemperature: 1.0,
        language: 'es-ES', responsiveness: 0.8, interruptionSensitivity: 0.8,
        enableBackchannel: true, backchannelFrequency: 0.9, backchannelWords: ['Ajá', 'Entiendo', 'Mmm', 'Claro'],
        boostedKeywords: [], normalizeForSpeech: true,
        beginMessageDelayMs: 200, endCallAfterSilenceMs: 59000, maxCallDurationMs: 540000,
        reminderTriggerMs: 30000, reminderMaxCount: 1, ringDurationMs: 30000,
        volume: 1.0, enableAmbientSound: false, ambientSound: 'none', ambientSoundVolume: 0.2,
        sttMode: 'accurate', enableTranscriptionFormatting: true,
        enableEndCall: true, endCallDescription: 'Finaliza la llamada de forma cordial después de confirmar que el usuario no necesita nada más.',
        enableCalBooking: false, calUrl: '', calApiKey: '', calEventId: '', calTimezone: 'Europe/Madrid', enableCalCancellation: false, calSearchDays: 6,
        enableTransfer: false, transferWhen: '', transferDestinations: [], enableCustomTools: false, customTools: [],
        useTemplate: false, extractionVariables: [], leadQuestions: [], enableAnalysis: false, analysisModel: 'gpt-4.1',
        webhookUrl: '',
        customNotes: '',
        companyAddress: '', companyPhone: '', companyWebsite: '', companyDescription: '',
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
        editingAgentId: null,
        currentStep: 1
    })
}));
