import { NextRequest, NextResponse } from 'next/server';

function getApiUrl() {
  return process.env.LETSTART_API_URL || '';
}

function getProjectId() {
  return process.env.LETSTART_PROJECT_ID || '';
}

/**
 * GET /api/letstart-setup — returns setup status
 * GET /api/letstart-setup?action=supabase-status — proxies Supabase provisioning status
 */
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action');

  // Proxy: redirect to Supabase OAuth connect on the backend
  if (action === 'supabase-connect') {
    if (!getProjectId() || !getApiUrl()) {
      return NextResponse.json(
        { error: 'API not configured. Backend not deployed yet.' },
        { status: 503 },
      );
    }
    const url = `${getApiUrl()}/api/v1/integrations/supabase/connect/${getProjectId()}`;
    return NextResponse.redirect(url);
  }

  // Proxy Supabase provisioning status (avoids CORS issues)
  if (action === 'supabase-status') {
    if (!getProjectId() || !getApiUrl()) {
      return NextResponse.json({ status: 'idle' });
    }
    try {
      const resp = await fetch(
        `${getApiUrl()}/api/v1/integrations/supabase/status/${getProjectId()}`,
      );
      const data = await resp.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ status: 'idle' });
    }
  }

  const isComplete = process.env.LETSTART_SETUP_COMPLETE === 'true';

  return NextResponse.json({
    configured: isComplete,
    project_id: getProjectId(),
    has_api_url: !!getApiUrl(),
    api_url: getApiUrl(),
  });
}

/**
 * POST /api/letstart-setup — saves integration config
 *
 * Body: { integrations: { clerk: { KEY: "value" }, stripe: { KEY: "value" } } }
 *
 * This calls the LetStart API which:
 * 1. Saves config to database
 * 2. Pushes .env.local to the GitHub repo
 * 3. GitHub Actions triggers auto-redeploy with new env vars
 */
export async function POST(request: NextRequest) {
  if (!getProjectId()) {
    return NextResponse.json(
      { error: 'LETSTART_PROJECT_ID not configured' },
      { status: 500 },
    );
  }

  let body: { integrations: Record<string, Record<string, string>> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.integrations || typeof body.integrations !== 'object') {
    return NextResponse.json(
      { error: 'Missing integrations object' },
      { status: 400 },
    );
  }

  // Add LETSTART_SETUP_COMPLETE=true to the env push
  // so after redeploy, middleware stops redirecting
  body.integrations['letstart'] = {
    LETSTART_SETUP_COMPLETE: 'true',
    LETSTART_PROJECT_ID: getProjectId(),
    LETSTART_API_URL: getApiUrl(),
  };

  try {
    const resp = await fetch(
      `${getApiUrl()}/api/v1/projects/${getProjectId()}/deployment/install`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      return NextResponse.json(
        { error: 'LetStart API error', detail: errorText.slice(0, 500) },
        { status: resp.status },
      );
    }

    const result = await resp.json();
    return NextResponse.json({
      status: 'ok',
      message: 'Configuration saved. Your app will redeploy with the new settings.',
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to reach LetStart API', detail: String(err).slice(0, 500) },
      { status: 502 },
    );
  }
}
