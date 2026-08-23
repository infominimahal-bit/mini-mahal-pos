export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, cache-control, pragma',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  // Without this, supabase-js hands invoke() the body as a raw string (not parsed
  // JSON), which breaks every client that expects an object. Keep it here.
  'Content-Type': 'application/json',
}
