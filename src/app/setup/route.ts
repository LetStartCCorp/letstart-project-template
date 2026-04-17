import { NextResponse } from "next/server";

const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Setup — LetStart</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: { sans: ['DM Sans', 'system-ui'], mono: ['JetBrains Mono', 'monospace'] },
          colors: {
            gold: { 50: '#fdf8ef', 400: '#e2a83e', DEFAULT: 'oklch(0.75 0.14 75)' },
            surface: { DEFAULT: '#09090b', 50: '#111113', 100: '#18181b', 200: '#1e1e22' },
            supabase: '#3ECF8E',
          },
        }
      }
    }
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'DM Sans', system-ui, sans-serif; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    .spinner { animation: spin 0.8s linear infinite; }
    .fade-up { animation: fadeUp 0.5s ease-out forwards; }
    .noise { background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); }
    .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.06); }
    .glass:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.09); }
    .btn-supabase { background: linear-gradient(135deg, #249361, #3ECF8E); }
    .btn-supabase:hover { background: linear-gradient(135deg, #1e7d52, #36b87e); }
    .glow-gold { box-shadow: 0 0 60px oklch(0.75 0.14 75 / 0.1); }
    .input-field:focus { border-color: oklch(0.75 0.14 75 / 0.4); box-shadow: 0 0 0 3px oklch(0.75 0.14 75 / 0.06); outline: none; }
    .step-dot { width: 8px; height: 8px; border-radius: 50%; transition: all 0.3s; }
    .step-dot.active { background: oklch(0.75 0.14 75); box-shadow: 0 0 10px oklch(0.75 0.14 75 / 0.4); }
    .step-dot.done { background: #3ECF8E; }
    .step-dot.pending { background: #27272a; }
    .checkmark { stroke-dasharray: 24; stroke-dashoffset: 24; animation: draw 0.4s ease-out 0.2s forwards; }
    details summary::-webkit-details-marker { display: none; }
    details summary { list-style: none; }
    details[open] .chevron { transform: rotate(180deg); }
  </style>
</head>
<body class="bg-surface text-white min-h-screen noise">
  <div class="fixed inset-0 pointer-events-none overflow-hidden">
    <div class="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full opacity-[0.03]" style="background:radial-gradient(circle, oklch(0.75 0.14 75) 0%, transparent 70%)"></div>
    <div class="absolute -bottom-[30%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-[0.02]" style="background:radial-gradient(circle, #3ECF8E 0%, transparent 70%)"></div>
  </div>

  <div class="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-8">
    <div id="app" class="w-full max-w-md">

      <div id="loading" class="text-center py-20 fade-up">
        <div class="w-10 h-10 border-2 border-gold-400/30 border-t-gold-400 rounded-full spinner mx-auto mb-5"></div>
        <p class="text-zinc-500 text-sm tracking-wide">Loading setup...</p>
      </div>

      <div id="configured" class="hidden text-center py-20 fade-up">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5" style="box-shadow:0 0 40px rgba(62,207,142,0.15)">
          <svg class="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 class="text-xl font-semibold tracking-tight">Already Configured</h1>
        <p class="text-zinc-500 text-sm mt-2">This app has already been set up.</p>
        <a href="/" class="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium rounded-xl transition-all">Go to App <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></a>
      </div>

      <div id="wizard" class="hidden">
        <div class="text-center mb-10 fade-up">
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400/20 to-gold-400/5 flex items-center justify-center mx-auto mb-5 glow-gold">
            <svg class="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h1 class="text-[1.65rem] font-bold tracking-tight">Set up your app</h1>
          <p class="text-zinc-500 text-[0.82rem] mt-2.5 leading-relaxed">Connect your services to get started.<br>Only database is required.</p>
        </div>

        <div class="flex justify-center gap-2 mb-8">
          <div class="step-dot active" id="dot-db"></div>
          <div class="step-dot pending" id="dot-extras"></div>
          <div class="step-dot pending" id="dot-done"></div>
        </div>

        <form id="setupForm">
          <!-- Step 1: Database -->
          <div id="step-db" class="space-y-4 fade-up">
            <div class="glass rounded-2xl p-5">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-9 h-9 rounded-xl bg-supabase/10 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 109 113" fill="none"><path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#s0)"/><path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#s1)" fill-opacity="0.2"/><path d="M45.317 2.07103C48.1765-1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922-2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/><defs><linearGradient id="s0" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"><stop stop-color="#249361"/><stop offset="1" stop-color="#3ECF8E"/></linearGradient><linearGradient id="s1" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse"><stop/><stop offset="1" stop-opacity="0"/></linearGradient></defs></svg>
                </div>
                <div>
                  <h3 class="text-sm font-semibold">Database</h3>
                  <p class="text-[0.72rem] text-zinc-500">PostgreSQL via Supabase</p>
                </div>
                <span class="ml-auto text-[0.65rem] font-medium text-gold-400 bg-gold-400/10 px-2 py-0.5 rounded-full tracking-wide uppercase">Required</span>
              </div>

              <div id="supabaseConnectArea">
                <button type="button" onclick="connectSupabase()" class="btn-supabase w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5 hover:shadow-lg hover:shadow-supabase/20 active:scale-[0.98]">
                  <svg width="16" height="16" viewBox="0 0 109 113" fill="none"><path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="white" fill-opacity="0.9"/><path d="M45.317 2.07103C48.1765-1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922-2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="white"/></svg>
                  Connect Supabase
                </button>
              </div>

              <div id="supabaseStatus" class="hidden">
                <div class="flex items-center gap-3 py-3">
                  <div class="w-5 h-5 border-2 border-supabase/50 border-t-supabase rounded-full spinner shrink-0"></div>
                  <span class="text-sm text-zinc-400" id="supabaseStatusText">Connecting...</span>
                </div>
                <div class="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                  <div id="supabaseProgress" class="h-full bg-gradient-to-r from-supabase/60 to-supabase rounded-full transition-all duration-700" style="width:10%"></div>
                </div>
              </div>

              <div id="supabaseReady" class="hidden">
                <div class="flex items-center gap-3 py-2">
                  <div class="w-6 h-6 rounded-full bg-supabase/15 flex items-center justify-center shrink-0">
                    <svg class="w-3.5 h-3.5 text-supabase" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div>
                    <span class="text-sm font-medium text-supabase">Database connected</span>
                    <p class="text-[0.7rem] text-zinc-500 mt-0.5 font-mono" id="supabaseRefText"></p>
                  </div>
                </div>
              </div>
            </div>

            <div id="errorBox" class="hidden rounded-xl bg-red-500/8 border border-red-500/20 p-3.5">
              <p class="text-red-400 text-sm" id="errorText"></p>
            </div>

            <button type="button" onclick="goToStep('extras')" id="nextToExtras" class="w-full py-3 px-4 bg-gold-400 text-surface font-semibold rounded-xl text-sm transition-all hover:bg-gold-400/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed" disabled>Continue</button>
            <button type="button" onclick="goToStep('extras')" class="w-full py-2.5 px-4 text-zinc-500 hover:text-zinc-300 font-medium rounded-xl text-xs transition-colors text-center">Skip for now</button>
          </div>

          <!-- Step 2: Extras -->
          <div id="step-extras" class="hidden space-y-3 fade-up">
            <div class="flex items-center justify-between mb-2">
              <button type="button" onclick="goToStep('db')" class="text-zinc-500 hover:text-zinc-300 text-xs flex items-center gap-1 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg> Back
              </button>
              <span class="text-[0.7rem] text-zinc-500 tracking-wide">Optional integrations</span>
            </div>
            <div id="integrationFields" class="space-y-3"></div>
            <div id="errorBox2" class="hidden rounded-xl bg-red-500/8 border border-red-500/20 p-3.5">
              <p class="text-red-400 text-sm" id="errorText2"></p>
            </div>
            <button type="submit" id="submitBtn" class="w-full py-3 px-4 bg-gold-400 text-surface font-semibold rounded-xl text-sm transition-all hover:bg-gold-400/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed mt-2">Deploy App</button>
          </div>
        </form>
      </div>

      <div id="success" class="hidden text-center py-20 fade-up">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400/20 to-supabase/10 flex items-center justify-center mx-auto mb-5 glow-gold">
          <svg class="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 class="text-xl font-semibold tracking-tight">You're all set!</h1>
        <p class="text-zinc-500 text-sm mt-2 leading-relaxed">Configuration saved. Your app is redeploying.</p>
        <div class="mt-8">
          <div class="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full spinner mx-auto"></div>
          <p class="text-xs text-zinc-500 mt-3">Waiting for deploy...</p>
        </div>
      </div>
    </div>
  </div>

<script>
  const INTEGRATIONS = {
    clerk: { name: 'Authentication', desc: 'Clerk', color: '#6C47FF',
      icon: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.568 1.568a5.7 5.7 0 0 1-2.01 6.334l1.568 1.568A7.92 7.92 0 0 0 17.894 8.22zm-3.787 0l-1.568 1.568a2.49 2.49 0 0 1-.004 3.203l1.572 1.572a4.71 4.71 0 0 0 0-6.343z"/></svg>',
      fields: [
        { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', label: 'Publishable Key', placeholder: 'pk_test_...' },
        { key: 'CLERK_SECRET_KEY', label: 'Secret Key', placeholder: 'sk_test_...', sensitive: true },
      ] },
    stripe: { name: 'Payments', desc: 'Stripe', color: '#635BFF',
      icon: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>',
      fields: [
        { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Publishable Key', placeholder: 'pk_test_...' },
        { key: 'STRIPE_SECRET_KEY', label: 'Secret Key', placeholder: 'sk_test_...', sensitive: true },
      ] },
    resend: { name: 'Email', desc: 'Resend', color: '#ffffff',
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>',
      fields: [{ key: 'RESEND_API_KEY', label: 'API Key', placeholder: 're_...', sensitive: true }] },
    openai: { name: 'AI', desc: 'OpenAI', color: '#10a37f',
      icon: '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0011 0a6.065 6.065 0 00-5.772 4.206 5.998 5.998 0 00-4.005 2.903 6.046 6.046 0 00.749 7.091 5.985 5.985 0 00.516 4.911 6.046 6.046 0 006.51 2.9A6.065 6.065 0 0013 24a6.065 6.065 0 005.772-4.206 5.998 5.998 0 004.005-2.903 6.046 6.046 0 00-.749-7.091z"/></svg>',
      fields: [{ key: 'OPENAI_API_KEY', label: 'API Key', placeholder: 'sk-...', sensitive: true }] },
  };

  let supabaseResult = null, letstartApiUrl = '', letstartProjectId = '';
  const API_PATH = '/api/letstart-setup';

  function goToStep(s) {
    document.getElementById('step-db').classList.toggle('hidden', s !== 'db');
    document.getElementById('step-extras').classList.toggle('hidden', s !== 'extras');
    document.getElementById('dot-db').className = s === 'db' ? 'step-dot active' : 'step-dot done';
    document.getElementById('dot-extras').className = s === 'extras' ? 'step-dot active' : 'step-dot pending';
  }

  async function init() {
    try {
      const resp = await fetch(API_PATH);
      const data = await resp.json();
      if (data.configured) { show('configured'); return; }
      letstartApiUrl = data.api_url || '';
      letstartProjectId = data.project_id || '';
      buildExtras();
      show('wizard');
    } catch (e) { buildExtras(); show('wizard'); }
  }

  function buildExtras() {
    const c = document.getElementById('integrationFields');
    Object.entries(INTEGRATIONS).forEach(([key, cfg]) => {
      const d = document.createElement('details');
      d.className = 'glass rounded-2xl transition-all';
      d.innerHTML = \`<summary class="flex items-center gap-3 p-4 cursor-pointer select-none">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style="background:\${cfg.color}15;color:\${cfg.color}">\${cfg.icon}</div>
        <div class="flex-1 min-w-0"><span class="text-sm font-medium">\${cfg.name}</span><span class="text-[0.7rem] text-zinc-500 ml-1.5">\${cfg.desc}</span></div>
        <svg class="w-4 h-4 text-zinc-500 transition-transform chevron shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </summary><div class="px-4 pb-4 space-y-2.5">\${cfg.fields.map(f => \`<div><label class="block text-[0.7rem] text-zinc-500 mb-1 font-medium tracking-wide">\${f.label}</label><input type="\${f.sensitive ? 'password' : 'text'}" name="\${key}::\${f.key}" placeholder="\${f.placeholder}" class="input-field w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-zinc-600 font-mono text-[0.8rem]"/></div>\`).join('')}</div>\`;
      c.appendChild(d);
    });
  }

  function show(id) { ['loading','configured','wizard','success'].forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id)); }

  function showError(msg) {
    ['errorBox','errorBox2'].forEach(id => { const el = document.getElementById(id); if (el) { el.querySelector('p').textContent = msg; el.classList.remove('hidden'); } });
  }

  function connectSupabase() {
    if (!letstartProjectId) { showError('Cannot connect: missing project configuration.'); return; }
    const popup = window.open(\`\${API_PATH}?action=supabase-connect\`, 'supabase-oauth', 'width=600,height=700,left=200,top=100');
    if (!popup) { showError('Popup blocked — please allow popups.'); return; }
    window.addEventListener('message', function h(ev) {
      if (ev.data?.type !== 'supabase-oauth') return;
      window.removeEventListener('message', h);
      if (ev.data.status === 'error') { showError(ev.data.message); return; }
      startSupabasePolling();
    });
  }

  async function startSupabasePolling() {
    const ca = document.getElementById('supabaseConnectArea'), sd = document.getElementById('supabaseStatus'), st = document.getElementById('supabaseStatusText'), pb = document.getElementById('supabaseProgress');
    ca.classList.add('hidden'); sd.classList.remove('hidden');
    const m = { listing_orgs:['Finding organization...','15%'], creating_project:['Creating database...','35%'], waiting_for_db:['Waiting for database (~1 min)...','60%'], fetching_keys:['Fetching API keys...','85%'] };
    for (let i = 0; i < 60; i++) {
      try {
        const r = await fetch(\`\${API_PATH}?action=supabase-status\`);
        if (!r.ok) throw 0;
        const d = await r.json();
        if (d.status === 'ready') { supabaseResult = d; pb.style.width = '100%'; setTimeout(() => onSupabaseReady(d), 400); return; }
        if (d.status === 'error') { sd.classList.add('hidden'); ca.classList.remove('hidden'); showError(d.error || 'Setup failed'); return; }
        if (m[d.status]) { st.textContent = m[d.status][0]; pb.style.width = m[d.status][1]; }
      } catch(e) {}
      await new Promise(r => setTimeout(r, 3000));
    }
    sd.classList.add('hidden'); ca.classList.remove('hidden'); showError('Provisioning timed out.');
  }

  function onSupabaseReady(d) {
    document.getElementById('supabaseStatus').classList.add('hidden');
    document.getElementById('supabaseReady').classList.remove('hidden');
    document.getElementById('supabaseRefText').textContent = d.supabase_ref;
    document.getElementById('nextToExtras').disabled = false;
  }

  document.getElementById('setupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerHTML = '<div class="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full spinner inline-block mr-2 align-middle"></div>Deploying...';
    ['errorBox','errorBox2'].forEach(id => document.getElementById(id)?.classList.add('hidden'));

    const fd = new FormData(e.target), integrations = {};
    if (supabaseResult) {
      integrations.database = { DATABASE_URL: supabaseResult.database_url };
      integrations.supabase = { NEXT_PUBLIC_SUPABASE_URL: supabaseResult.supabase_url, NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseResult.supabase_anon_key, SUPABASE_SERVICE_ROLE_KEY: supabaseResult.supabase_service_role_key };
    }
    for (const [n, v] of fd.entries()) { if (!v) continue; const [i, k] = n.split('::'); if (!integrations[i]) integrations[i] = {}; integrations[i][k] = v; }

    try {
      const r = await fetch(API_PATH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ integrations }) });
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error || err.detail || \`HTTP \${r.status}\`); }
      document.getElementById('dot-extras').className = 'step-dot done';
      document.getElementById('dot-done').className = 'step-dot active';
      show('success');
      setTimeout(async () => { for (let i = 0; i < 30; i++) { try { const r = await fetch('/', { method: 'HEAD' }); if (r.ok) { window.location.href = '/'; return; } } catch {} await new Promise(r => setTimeout(r, 5000)); } }, 10000);
    } catch (err) { showError(err.message); btn.disabled = false; btn.innerHTML = 'Deploy App'; }
  });

  init();
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
