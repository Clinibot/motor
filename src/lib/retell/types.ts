export interface KBFile {
    id: string;
    name?: string;
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

export interface TransferDestination {
    destination_type: 'number' | 'agent';
    number?: string;
    agentId?: string;
    name: string;
    description?: string;
    transfer_mode?: 'cold' | 'warm';
    sip_username?: string;
    sip_password?: string;
}

/**
 * If a voice was selected before being imported into the workspace, the wizard
 * stores the ElevenLabs provider_voice_id instead of the Retell workspace voice_id.
 * This function normalises it to a safe fallback so agent creation never fails.
 */
const UNIMPORTED_VOICE_IDS = [
    '11labs-UOIqAnmS11Reiei1Ytkc', // Carolina (pre-import)
    '11labs-YDDaC9XKjODs7hY78qEW', // MariCarmen (pre-import)
    '11labs-gD1IexrzCvsXPHUuT0s3', // Sara Martin (pre-import)
];
const FALLBACK_VOICE_ID = '11labs-Adrian';
export function resolveVoiceId(voiceId?: string): string {
    if (!voiceId || UNIMPORTED_VOICE_IDS.includes(voiceId)) return FALLBACK_VOICE_ID;
    return voiceId;
}

export interface AgentPayload {
    id?: string;
    agentName: string;
    companyName: string;
    agentType: string;
    prompt: string;
    
    // Tools State (must match ToolsPayload in toolMapper.ts)
    enableEndCall?: boolean;
    endCallDescription?: string;
    enableCalBooking?: boolean;
    calUrl?: string;
    calApiKey?: string;
    calEventId?: string;
    enableCalAvailability?: boolean;
    calAvailabilityDays?: number;
    enableTransfer: boolean;
    transferDestinations: TransferDestination[];
    enableCustomTools?: boolean;
    customTools?: CustomTool[];
    enableExtractions?: boolean;
    extractionVariables?: ExtractionVariable[];
    enableAnalysis?: boolean;
    analysisModel?: string;
    webhookUrl?: string;
    customNotes?: string;

    // Retell Config
    kbFiles?: KBFile[];
    kbUsageInstructions?: string;
    model?: string;
    beginMessage?: string;
    temperature?: number;
    highPriority?: boolean;
    whoFirst?: 'agent' | 'user';
    language?: string;
    responsiveness?: number;
    interruptionSensitivity?: number;
    enableBackchannel?: boolean;
    backchannelFrequency?: number;
    backchannelWords?: string[];
    maxCallDurationMs?: number;
    beginMessageDelayMs?: number;
    endCallAfterSilenceMs?: number;
    ringDurationMs?: number;
    voiceSpeed?: number;
    voiceTemperature?: number;
    volume?: number;
    enableAmbientSound?: boolean;
    ambientSound?: unknown;
    ambientSoundVolume?: number;
    normalizeForSpeech?: boolean;
    boostedKeywords?: string[];
    voiceId?: string;
    voiceName?: string;
    workspace_id?: string;

    // Company Info (for prompt generation)
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyDescription?: string;
}
