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
    language?: unknown;
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
    voiceId?: string;
    workspace_id?: string;

    // Company Info (for prompt generation)
    companyAddress?: string;
    companyPhone?: string;
    companyWebsite?: string;
    companyDescription?: string;
    businessHours?: { day: string; open: string; close: string; closed: boolean }[];
}
