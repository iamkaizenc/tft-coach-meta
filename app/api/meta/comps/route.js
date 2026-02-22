import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const patch = searchParams.get('patch') || 'latest';

    const { data, error } = await supabase
      .from('meta_comps')
      .select('*')
      .eq('patch', patch)
      .order('avg_placement', { ascending: true }) // En düşük (en iyi) sıralama önce
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ comps: data });
  } catch (error) {
    console.error('[API meta/comps] Hata:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
