import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar el Service Role Key para ignorar el RLS interno para acciones de administrador global
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
    try {
        const { data: workspaces, error } = await supabaseAdmin
            .from('workspaces')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, workspaces });
    } catch (error: any) {
        console.error("Error fetching workspaces:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to fetch workspaces" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, retell_api_key } = body;

        if (!name) {
            return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
        }

        const { data: newWorkspace, error } = await supabaseAdmin
            .from('workspaces')
            .insert([{ name, retell_api_key }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, workspace: newWorkspace });
    } catch (error: any) {
        console.error("Error creating workspace:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to create workspace" },
            { status: 500 }
        );
    }
}
