import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase environment variables are not configured.');
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch all users with their workspace info
        const { data: users, error: userError } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                full_name,
                email,
                workspace_id,
                workspaces (
                    id,
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (userError) throw userError;

        // 2. Fetch all calls to calculate duration
        const { data: calls, error: callError } = await supabaseAdmin
            .from('calls')
            .select('workspace_id, duration_ms');

        if (callError) throw callError;

        // 3. Fetch phone numbers via clinics
        const { data: phoneNumbersData, error: phoneError } = await supabaseAdmin
            .from('phone_numbers')
            .select(`
                phone_number,
                clinics (
                    user_id
                )
            `);

        if (phoneError) throw phoneError;

        // Process data
        interface ClinicRow { user_id: string }

        const enhancedUsers = users?.map(user => {
            const userId = user.id;
            const workspaceId = user.workspace_id;

            // Calculate total minutes for this workspace
            const workspaceCalls = calls?.filter(c => c.workspace_id === workspaceId) || [];
            const totalMs = workspaceCalls.reduce((acc, call) => acc + (call.duration_ms || 0), 0);
            const totalMinutes = Math.floor(totalMs / 60000);

            // Extract phone numbers for this user via clinic association
            const userPhoneNumbers = Array.from(new Set(
                phoneNumbersData
                    ?.filter(p => {
                        const clinic = p.clinics as unknown as ClinicRow | ClinicRow[];
                        return Array.isArray(clinic)
                            ? clinic.some(c => c.user_id === userId)
                            : clinic?.user_id === userId;
                    })
                    .map(p => p.phone_number)
                    .filter(Boolean)
            ));

            // Handle workspaces being an object or an array depending on Supabase version/types
            const workspaceData = (user.workspaces as unknown as { name: string } | { name: string }[]) || null;
            const workspaceName = Array.isArray(workspaceData)
                ? (workspaceData[0]?.name || 'Sin Workspace')
                : (workspaceData?.name || 'Sin Workspace');

            return {
                id: userId,
                full_name: user.full_name,
                email: user.email,
                workspace_name: workspaceName,
                workspace_id: workspaceId,
                phone_numbers: userPhoneNumbers,
                total_minutes: totalMinutes,
                calls_count: workspaceCalls.length
            };
        });

        return NextResponse.json({ success: true, users: enhancedUsers });
    } catch (error: unknown) {
        console.error("Error fetching admin users:", error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : "Failed to fetch users" },
            { status: 500 }
        );
    }
}
