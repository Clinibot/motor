import { SupabaseClient } from '@supabase/supabase-js';
import { AgentPayload } from './types';

export async function enrichSipCredentials(payload: AgentPayload, supabaseAdmin: SupabaseClient, agentId?: string) {
    if (!payload.enableTransfer || !payload.transferDestinations || !Array.isArray(payload.transferDestinations)) return;

    let workspaceSipUser: string | undefined;
    let workspaceSipPass: string | undefined;

    // 1. Intentar buscar por el ID del agente (si ya existe)
    if (agentId) {
        console.log(`Searching for SIP credentials associated with agent UUID: ${agentId}...`);
        const { data: assignedNumber, error: fetchErr } = await supabaseAdmin
            .from('phone_numbers')
            .select('sip_username, sip_password, phone_number')
            .eq('assigned_inbound_agent_id', agentId)
            .maybeSingle();

        if (fetchErr) {
            console.error(`Error fetching phone number for agent ${agentId}:`, fetchErr);
        }

        if (assignedNumber) {
            console.log(`Found assigned number ${assignedNumber.phone_number} for agent. Using its SIP credentials. Has user: ${!!assignedNumber.sip_username}, Has pass: ${!!assignedNumber.sip_password}`);
            workspaceSipUser = assignedNumber.sip_username;
            workspaceSipPass = assignedNumber.sip_password;
        } else {
            console.log(`No number found in phone_numbers table assigned to agent ${agentId}.`);
        }
    }

    // 2. Si no hay ID de agente o no tiene número asignado, buscamos por el número de destino (fallback original)
    for (const dest of payload.transferDestinations) {
        if (dest.destination_type === 'number' && dest.number) {
            // Prioridad 1: Credenciales del agente asociado
            if (workspaceSipUser && workspaceSipPass) {
                console.log(`Enriching transfer to ${dest.number} with agent's SIP credentials (${workspaceSipUser}).`);
                dest.sip_username = workspaceSipUser;
                dest.sip_password = workspaceSipPass;
                continue;
            }

            console.log(`Priority 2: Searching credentials for destination number ${dest.number}...`);
            // Fallback: Buscar credenciales del número de destino
            const baseNumber = dest.number.replace(/\s+/g, '');
            const variations = [baseNumber];
            if (!baseNumber.startsWith('+')) {
                variations.push('+' + baseNumber);
                if (!baseNumber.startsWith('34')) variations.push('+34' + baseNumber);
            } else {
                variations.push(baseNumber.substring(1));
            }

            const uniqueVariations = Array.from(new Set(variations));
            const { data: phoneData } = await supabaseAdmin
                .from('phone_numbers')
                .select('sip_username, sip_password')
                .in('phone_number', uniqueVariations)
                .maybeSingle();

            if (phoneData) {
                console.log(`Using destination-based SIP credentials for ${dest.number}.`);
                dest.sip_username = phoneData.sip_username;
                dest.sip_password = phoneData.sip_password;
            }
        }
    }
}
