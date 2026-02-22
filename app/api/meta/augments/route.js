import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const patch = searchParams.get('patch') || 'latest';
        const sortBy = searchParams.get('sortBy') || 'win_rate';

        const ascending = sortBy === 'avg_placement';

        const { data, error } = await supabase
            .from('meta_augments')
            .select(`
        *,
        static_augments (name, description, rarity)
      `)
            .eq('patch', patch)
            .order(sortBy, { ascending })
            .limit(limit);

        if (error) throw error;

        return NextResponse.json({ augments: data });
    } catch (error) {
        console.error('[API meta/augments] Hata:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
