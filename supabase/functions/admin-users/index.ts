// Supabase Edge Function — server-side admin user operations.
// The service-role key lives ONLY here (Deno.env), never in the browser bundle.
// Client calls this via supabase.functions.invoke('admin-users', ...) — see src/lib/supabase.ts.
//
// MASTER §2.1.4: user-management is a sensitive action. The caller's JWT is
// verified and their role is checked server-side; non admin/manager are rejected
// with a real authorization error (never trust that the UI already checked).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Server-side role check (MASTER §2.1.4) ──────────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const { data: caller, error: callerErr } = await admin.auth.getUser(jwt)
    if (callerErr || !caller.user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: corsHeaders,
      })
    }
    const { data: callerProfile } = await admin
      .from('users')
      .select('role, active')
      .eq('id', caller.user.id)
      .maybeSingle()
    const callerRole = callerProfile?.role
    if (!callerProfile || callerProfile.active === false || !['admin', 'manager'].includes(callerRole)) {
      return new Response(JSON.stringify({ error: 'FORBIDDEN: user management requires admin or manager' }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    const { action, payload } = await req.json()

    let result: any
    if (action === 'deleteUser') {
      result = await admin.auth.admin.deleteUser(payload.id)
    } else if (action === 'createUser') {
      result = await admin.auth.admin.createUser(payload)
      // ── Self-heal orphaned auth users ──────────────────────────────────────
      // If this email already exists (e.g. a previously-failed create where the
      // public.users row never got written), don't fail. Find that auth user,
      // reset its password + metadata to the new values, and return it — so the
      // same email "just works" and the caller can link the public.users row.
      if (result.error && /already|exist|registered|duplicate/i.test(result.error.message || '')) {
        const targetEmail = String(payload.email || '').toLowerCase()
        let existing: any = null
        for (let page = 1; page <= 25 && !existing; page++) {
          const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 })
          const users = list?.users || []
          existing = users.find((u: any) => String(u.email || '').toLowerCase() === targetEmail) || null
          if (users.length < 200) break
        }
        if (existing) {
          const upd = await admin.auth.admin.updateUserById(existing.id, {
            password: payload.password,
            email_confirm: true,
            user_metadata: payload.user_metadata,
          })
          result = upd.error ? { data: { user: existing }, error: null } : upd
        }
      }
    } else if (action === 'updateUser') {
      result = await admin.auth.admin.updateUserById(payload.id, payload.updates)
    } else {
      return new Response(JSON.stringify({ error: 'unknown action: ' + action }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400,
        headers: corsHeaders,
      })
    }
    return new Response(JSON.stringify({ data: result.data }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
