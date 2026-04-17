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

// In-memory store for PKCE state (single Cloud Run instance is fine)
const oauthStates = new Map<string, { projectId: string; verifier: string; createdAt: number }>();

// In-memory provisioning status
const provisionStatus = new Map<string, Record<string, unknown>>();

function generatePKCE() {
  const verifier = crypto.randomBytes(36).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function cleanupExpiredStates() {
  const now = Date.now();
  for (const [key, val] of oauthStates) {
    if (now - val.createdAt > 600_000) oauthStates.delete(key);
  }
}

function getOrigin(request: NextRequest): string {
  // Cloud Run / reverse proxy: use forwarded headers
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  if (host) return `${proto}://${host}`;
  return request.nextUrl.origin;
}

function popupHtml(statusVal: string, message: string): string {
  return `<!DOCTYPE html>
<html><head><title>LetStart — Supabase</title></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center">
  <p>${message}</p>
  <p style="color:#888;font-size:0.85rem">This window will close automatically.</p>
</div>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'supabase-oauth', status: '${statusVal}', message: '${message}' }, '*');
  }
  setTimeout(() => window.close(), 2000);
</script>
</body></html>`;
}

// ── Provisioning logic ────────────────────────────────────────
async function provisionProject(accessToken: string, projectId: string) {
  const setStatus = (s: string, extra: Record<string, unknown> = {}) => {
    provisionStatus.set(projectId, { status: s, ...extra });
  };

  try {
    setStatus('listing_orgs');
    const orgsResp = await fetch(`${SUPABASE_API}/v1/organizations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!orgsResp.ok) throw new Error(`List orgs failed: ${orgsResp.status}`);
    const orgs = await orgsResp.json() as Array<{ slug: string }>;
    if (!orgs.length) { setStatus('error', { error: 'No Supabase organizations found.' }); return; }

    const orgSlug = orgs[0].slug;
    const dbPass = crypto.randomBytes(18).toString('base64url');
    const safeName = (projectId.slice(0, 20) + '-db');

    setStatus('creating_project');
    const createResp = await fetch(`${SUPABASE_API}/v1/projects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: safeName, organization_slug: orgSlug, db_pass: dbPass, region: 'eu-central-1' }),
    });
    if (createResp.status !== 201) throw new Error(`Create project failed: ${createResp.status} ${(await createResp.text()).slice(0, 300)}`);
    const project = await createResp.json() as { ref: string; region: string };
    const ref = project.ref;
    const region = project.region || 'eu-central-1';

    setStatus('waiting_for_db', { supabase_ref: ref });
    const deadline = Date.now() + 180_000;
    let healthy = false;
    while (Date.now() < deadline) {
      try {
        const hResp = await fetch(`${SUPABASE_API}/v1/projects/${ref}/health?services=db`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (hResp.ok) {
          const services = await hResp.json() as Array<{ status: string }>;
          if (services.some(s => s.status === 'ACTIVE_HEALTHY')) { healthy = true; break; }
        }
      } catch { /* retry */ }
      await new Promise(r => setTimeout(r, 5000));
    }
    if (!healthy) { setStatus('error', { error: 'Database took too long. Try again.', supabase_ref: ref }); return; }

    setStatus('fetching_keys', { supabase_ref: ref });
    const keysResp = await fetch(`${SUPABASE_API}/v1/projects/${ref}/api-keys?reveal=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const keys = await keysResp.json() as Array<{ name: string; api_key: string }>;
    const anonKey = keys.find(k => k.name === 'anon')?.api_key || '';
    const serviceKey = keys.find(k => k.name === 'service_role')?.api_key || '';

    const databaseUrl = `postgresql://postgres.${ref}:${dbPass}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const supabaseUrl = `https://${ref}.supabase.co`;

    setStatus('ready', { database_url: databaseUrl, supabase_url: supabaseUrl, supabase_anon_key: anonKey, supabase_service_role_key: serviceKey, supabase_ref: ref });
  } catch (e) {
    setStatus('error', { error: String(e).slice(0, 500) });
  }
}

// ── Route handlers ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');
  const projectId = getProjectId();

  // ── Supabase Callback: detect by code+state params ─────────
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (code && state) {
    const stored = oauthStates.get(state);
    if (!stored) {
      return new NextResponse(popupHtml('error', 'Invalid or expired OAuth state'), { headers: { 'Content-Type': 'text/html' } });
    }
    oauthStates.delete(state);

    const origin = getOrigin(request);
    const redirectUri = `${origin}/api/letstart-setup`;

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
        code_verifier: stored.verifier,
      }),
    });

    if (tokenResp.status !== 201) {
      const errText = await tokenResp.text();
      return new NextResponse(popupHtml('error', `Token exchange failed (${tokenResp.status})`), { headers: { 'Content-Type': 'text/html' } });
    }

    const tokens = await tokenResp.json() as { access_token: string };
    if (!tokens.access_token) {
      return new NextResponse(popupHtml('error', 'No access token received'), { headers: { 'Content-Type': 'text/html' } });
    }

    // Start provisioning in background (non-blocking)
    provisionProject(tokens.access_token, stored.projectId);

    return new NextResponse(popupHtml('provisioning', 'Connected! Creating your database...'), { headers: { 'Content-Type': 'text/html' } });
  }

  // ── Supabase Connect: initiate OAuth directly ───────────────
  if (action === 'supabase-connect') {
    if (!projectId) {
      return NextResponse.json({ error: 'LETSTART_PROJECT_ID not configured' }, { status: 503 });
    }

    cleanupExpiredStates();
    const connectState = crypto.randomBytes(24).toString('base64url');
    const { verifier, challenge } = generatePKCE();
    oauthStates.set(connectState, { projectId, verifier, createdAt: Date.now() });

    const origin = getOrigin(request);
    const redirectUri = `${origin}/api/letstart-setup`;

    const params = new URLSearchParams({
      client_id: SUPABASE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: connectState,
    });
    return NextResponse.redirect(`${SUPABASE_API}/v1/oauth/authorize?${params}`);
  }

  // ── Supabase Status: check provisioning progress ────────────
  if (action === 'supabase-status') {
    const data = provisionStatus.get(projectId) || { status: 'idle' };
    return NextResponse.json(data);
  }

  // ── Default: return config ──────────────────────────────────
  return NextResponse.json({
    configured: process.env.LETSTART_SETUP_COMPLETE === 'true',
    project_id: projectId,
    has_api_url: !!getApiUrl(),
    api_url: getApiUrl(),
    origin: getOrigin(request),
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

  // No API URL — store locally (config is in provisionStatus already)
  return NextResponse.json({ status: 'ok', message: 'Configuration saved locally.' });
}
