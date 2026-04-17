import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getProjectId() {
  return process.env.LETSTART_PROJECT_ID || '';
}
function getApiUrl() {
  return process.env.LETSTART_API_URL || '';
}

// ── Supabase OAuth config ─────────────────────────────────────
const SUPABASE_API = 'https://api.supabase.com';
const SUPABASE_CLIENT_ID = '1219b244-4cbe-473c-ae41-a7e36ab7f0bd';
const SUPABASE_CLIENT_SECRET = process.env.SUPABASE_OAUTH_CLIENT_SECRET || 'sba_5f012a2787de4d555b5e992395f8dd7ec47094ec';

// ── Stateless encrypted state (no in-memory store needed) ─────
function getEncKey() {
  return crypto.createHash('sha256').update(SUPABASE_CLIENT_SECRET).digest();
}

function encryptState(data: Record<string, string>): string {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

function decryptState(token: string): Record<string, string> | null {
  try {
    const key = getEncKey();
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return JSON.parse(dec.toString('utf8'));
  } catch {
    return null;
  }
}

function generatePKCE() {
  const verifier = crypto.randomBytes(36).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function getOrigin(request: NextRequest): string {
  if (process.env.LETSTART_APP_URL) return process.env.LETSTART_APP_URL.replace(/\/$/, '');
  const fwdHost = request.headers.get('x-forwarded-host');
  if (fwdHost) {
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    return `${proto}://${fwdHost}`;
  }
  return request.nextUrl.origin;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function popupHtml(status: string, message: string, data?: Record<string, unknown>): string {
  const safeMsg = escapeHtml(message);
  const dataJson = data ? JSON.stringify(data).replace(/</g, '\\u003c') : 'null';
  return `<!DOCTYPE html>
<html><head><title>LetStart — Supabase</title></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center;max-width:420px;padding:20px">
  <p style="font-size:1.05rem;margin-bottom:8px">${safeMsg}</p>
  <p style="color:#888;font-size:0.85rem">This window will close automatically.</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({
      type: 'supabase-oauth',
      status: '${status}',
      message: ${JSON.stringify(message)},
      data: ${dataJson}
    }, '*');
  }
  setTimeout(function(){ window.close(); }, 2500);
</script>
</body></html>`;
}

// ── Synchronous provisioning (runs in callback request) ───────
async function provisionSync(accessToken: string, projectId: string): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  // 1. List organizations
  const orgsResp = await fetch(`${SUPABASE_API}/v1/organizations`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!orgsResp.ok) {
    const body = await orgsResp.text();
    return { ok: false, error: `List organizations failed (${orgsResp.status}): ${body.slice(0, 300)}` };
  }
  const orgs = (await orgsResp.json()) as Array<{ slug: string }>;
  if (!orgs.length) {
    return { ok: false, error: 'No Supabase organizations found. Create one at supabase.com first.' };
  }

  const orgSlug = orgs[0].slug;
  const dbPass = crypto.randomBytes(18).toString('base64url');
  const safeName = projectId.slice(0, 20) + '-db';

  // 2. Create project
  const createResp = await fetch(`${SUPABASE_API}/v1/projects`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: safeName, organization_slug: orgSlug, db_pass: dbPass, region: 'eu-central-1' }),
  });
  if (createResp.status !== 201) {
    const body = await createResp.text();
    return { ok: false, error: `Create project failed (${createResp.status}): ${body.slice(0, 300)}` };
  }
  const project = (await createResp.json()) as { ref: string; region: string };
  const ref = project.ref;
  const region = project.region || 'eu-central-1';

  // 3. Get API keys (retry — project may still be initializing)
  let keys: Array<{ name: string; api_key: string }> = [];
  for (let i = 0; i < 6; i++) {
    const keysResp = await fetch(`${SUPABASE_API}/v1/projects/${ref}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (keysResp.ok) {
      keys = await keysResp.json();
      if (keys.length > 0) break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const anonKey = keys.find(k => k.name === 'anon')?.api_key || '';
  const serviceKey = keys.find(k => k.name === 'service_role')?.api_key || '';
  const databaseUrl = `postgresql://postgres.${ref}:${dbPass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const supabaseUrl = `https://${ref}.supabase.co`;

  return {
    ok: true,
    data: {
      database_url: databaseUrl,
      supabase_url: supabaseUrl,
      supabase_anon_key: anonKey,
      supabase_service_role_key: serviceKey,
      supabase_ref: ref,
    },
  };
}

// ── Route handlers ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const projectId = getProjectId();

  // ── Supabase Callback: code + state ────────────────────────
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (code && state) {
    const sd = decryptState(state);
    if (!sd || !sd.verifier || !sd.projectId) {
      return new NextResponse(
        popupHtml('error', 'Invalid or expired OAuth state. Please try again.'),
        { headers: { 'Content-Type': 'text/html' } },
      );
    }
    if (Date.now() - Number(sd.ts || 0) > 600_000) {
      return new NextResponse(
        popupHtml('error', 'OAuth session expired (>10 min). Please try again.'),
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    const origin = getOrigin(request);
    const redirectUri = `${origin}/api/letstart-setup`;

    // Exchange code → token
    const tokenResp = await fetch(`${SUPABASE_API}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${SUPABASE_CLIENT_ID}:${SUPABASE_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: sd.verifier,
      }),
    });

    if (tokenResp.status !== 201) {
      const errBody = await tokenResp.text();
      return new NextResponse(
        popupHtml('error', `Token exchange failed (${tokenResp.status}): ${errBody.slice(0, 200)}`),
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    const tokens = (await tokenResp.json()) as { access_token: string };
    if (!tokens.access_token) {
      return new NextResponse(
        popupHtml('error', 'No access token received from Supabase.'),
        { headers: { 'Content-Type': 'text/html' } },
      );
    }

    // Provision synchronously — results go straight to the popup
    try {
      const result = await provisionSync(tokens.access_token, sd.projectId);
      if (!result.ok) {
        return new NextResponse(
          popupHtml('error', result.error || 'Provisioning failed.'),
          { headers: { 'Content-Type': 'text/html' } },
        );
      }
      return new NextResponse(
        popupHtml('ready', 'Database created successfully!', result.data),
        { headers: { 'Content-Type': 'text/html' } },
      );
    } catch (e) {
      return new NextResponse(
        popupHtml('error', `Provisioning error: ${String(e).slice(0, 300)}`),
        { headers: { 'Content-Type': 'text/html' } },
      );
    }
  }

  // ── Supabase Connect: initiate OAuth ───────────────────────
  if (action === 'supabase-connect') {
    if (!projectId) {
      return NextResponse.json({ error: 'LETSTART_PROJECT_ID not configured' }, { status: 503 });
    }

    const { verifier, challenge } = generatePKCE();
    const statePayload = encryptState({
      verifier,
      projectId,
      ts: String(Date.now()),
    });

    const origin = getOrigin(request);
    const redirectUri = `${origin}/api/letstart-setup`;

    const params = new URLSearchParams({
      client_id: SUPABASE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'all',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: statePayload,
    });

    // Use JS redirect instead of HTTP 307 — Cloudflare proxy follows 307 and returns
    // the target page directly, breaking the OAuth flow for the browser.
    const targetUrl = `${SUPABASE_API}/v1/oauth/authorize?${params}`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${targetUrl}"><title>Redirecting…</title></head><body style="background:#0a0a0a;color:#888;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh"><p>Redirecting to Supabase…</p><script>window.location.replace(${JSON.stringify(targetUrl)});</script></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }

  // ── Default: return config ─────────────────────────────────
  return NextResponse.json({
    configured: process.env.LETSTART_SETUP_COMPLETE === 'true',
    project_id: projectId,
    has_api_url: !!getApiUrl(),
    api_url: getApiUrl(),
  });
}

export async function POST(request: NextRequest) {
  if (!getProjectId()) {
    return NextResponse.json({ error: 'LETSTART_PROJECT_ID not configured' }, { status: 500 });
  }

  let body: { integrations: Record<string, Record<string, string>> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.integrations || typeof body.integrations !== 'object') {
    return NextResponse.json({ error: 'Missing integrations object' }, { status: 400 });
  }

  body.integrations['letstart'] = {
    LETSTART_SETUP_COMPLETE: 'true',
    LETSTART_PROJECT_ID: getProjectId(),
    LETSTART_API_URL: getApiUrl(),
  };

  // If API URL is configured, push to backend
  if (getApiUrl()) {
    try {
      const resp = await fetch(
        `${getApiUrl()}/api/v1/projects/${getProjectId()}/deployment/install`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (!resp.ok) {
        const errorText = await resp.text();
        return NextResponse.json({ error: 'LetStart API error', detail: errorText.slice(0, 500) }, { status: resp.status });
      }
      const result = await resp.json();
      return NextResponse.json({ status: 'ok', message: 'Configuration saved. Your app will redeploy.', ...result });
    } catch (err) {
      return NextResponse.json({ error: 'Failed to reach LetStart API', detail: String(err).slice(0, 500) }, { status: 502 });
    }
  }

  // No API URL — store locally
  return NextResponse.json({ status: 'ok', message: 'Configuration saved locally.' });
}
