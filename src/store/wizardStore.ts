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

    // Step 2: LLM Config
    model: string;
    prompt: string;

    // Step 3: Voice Selection
    voiceId: string;
    voiceName: string;
    voiceProvider: string;
    voiceDescription: string;
    voiceSpeed: number;
    voiceTemperature: number;

    // Step 4: Conversation Settings
    language: string;
    responsiveness: number;
    interruptionSensitivity: number;
    enableBackchannel: boolean;
    backchannelFrequency: number;
    backchannelWords: string[];
    boostedKeywords: string[];
    normalizeForSpeech: boolean;

    // Step 5: Timings
    beginMessageDelayMs: number;
    endCallAfterSilenceMs: number;
    maxCallDurationMs: number;
    reminderTriggerMs: number;
    reminderMaxCount: number;
    ringDurationMs: number;
    enableVoicemailDetection: boolean;
    voicemailDetectionTimeoutMs: number;
    voicemailMessage: string;

    // Step 6: Audio & STT
    volume: number;
    enableAmbientSound: boolean;
    ambientSound: string;
    ambientSoundVolume: number;
    sttMode: string;
    enableTranscriptionFormatting: boolean;

    // Step 7: Tools
    enableEndCall: boolean;
    endCallDescription: string;
    enableCalBooking: boolean;
    calUrl: string;
    calApiKey: string;
    calEventId: string;
    enableCalAvailability: boolean;
    calAvailabilityDays: number;
    enableTransfer: boolean;
    transferDestinations: TransferDestination[];
    enableCustomTools: boolean;
    customTools: CustomTool[];

    // Step 7: Extraction & Webhooks
    useTemplate: boolean;
    extractionVariables: ExtractionVariable[];
    enableAnalysis: boolean;
    analysisModel: string;
    webhookUrl: string;
    webhookInbound: string;

    // Global Progress
    currentStep: number;

    // Actions
    updateField: (field: keyof WizardState, value: unknown) => void;
    nextStep: () => void;
    prevStep: () => void;
    setStep: (step: number) => void;
    resetWizard: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
    // Initial Fields
    agentName: '',
    companyName: '',
    agentType: 'cualificacion', // transfer, booking, etc.

    model: 'gpt-4.1',
    prompt: 'Eres un asistente útil.',

    voiceId: '11labs-Adrian',
    voiceName: 'Sofia',
    voiceProvider: 'retell',
    voiceDescription: 'Voz profesional española',
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
    enableCalAvailability: false,
    calAvailabilityDays: 7,
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

    // Actions
    updateField: (field, value) => set((state) => ({ ...state, [field]: value })),
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 7) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
    setStep: (step) => set({ currentStep: step }),
    resetWizard: () => set({
        agentName: '', companyName: '', agentType: 'cualificacion',
        model: 'gpt-4.1', prompt: 'Eres un asistente útil.',
        voiceId: '11labs-Adrian', voiceName: 'Sofia', voiceProvider: 'retell', voiceDescription: 'Voz profesional española', voiceSpeed: 1.0, voiceTemperature: 1.0,
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
        enableCalAvailability: false, calAvailabilityDays: 7,
        enableTransfer: false, transferDestinations: [], enableCustomTools: false, customTools: [],
        useTemplate: false, extractionVariables: [], enableAnalysis: false, analysisModel: 'gpt-4.1',
        webhookUrl: '', webhookInbound: '', currentStep: 1
    })
}));
