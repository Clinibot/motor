import { SupabaseClient } from '@supabase/supabase-js';
import { AgentPayload } from './types';
import { createLogger } from '@/lib/logger';

const log = createLogger('sip-enrichment');

export async function enrichSipCredentials(payload: AgentPayload, supabaseAdmin: SupabaseClient, agentId?: string) {
    if (!payload.enableTransfer || !payload.transferDestinations || !Array.isArray(payload.transferDestinations)) return;

    let workspaceSipUser: string | undefined;
    let workspaceSipPass: string | undefined;

    // 1. Intentar buscar por el ID del agente (si ya existe)
    if (agentId) {
        const { data: assignedNumber, error: fetchErr } = await supabaseAdmin
            .from('phone_numbers')
            .select('sip_username, sip_password, phone_number')
            .eq('assigned_inbound_agent_id', agentId)
            .maybeSingle();

        if (fetchErr) {
            log.error('Error fetching phone number for agent', { agent_id: agentId, db_error: fetchErr.message });
        }

        if (assignedNumber) {
            log.info('Found assigned number — using its SIP credentials', {
                agent_id: agentId,
                phone: assignedNumber.phone_number,
                has_user: !!assignedNumber.sip_username,
                has_pass: !!assignedNumber.sip_password,
            });
            workspaceSipUser = assignedNumber.sip_username;
            workspaceSipPass = assignedNumber.sip_password;
        }
    }

    // 2. Si no hay ID de agente o no tiene número asignado, buscamos por el número de destino (fallback original)
    for (const dest of payload.transferDestinations) {
        if (dest.destination_type === 'number' && dest.number) {
            // Prioridad 1: Credenciales del agente asociado
            if (workspaceSipUser && workspaceSipPass) {
                log.info('Enriching transfer with agent SIP credentials', { destination: dest.number });
                dest.sip_username = workspaceSipUser;
                dest.sip_password = workspaceSipPass;
                continue;
            }

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
                log.info('Enriching transfer with destination-based SIP credentials', { destination: dest.number });
                dest.sip_username = phoneData.sip_username;
                dest.sip_password = phoneData.sip_password;
            }
        }
    }
}
