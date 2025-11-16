import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config/app-config.service';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ConnectionStates } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly appConfig: AppConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  getHello(): string {
    const port = this.appConfig.apiPort;
    const cors = this.config.get<string>('CORS_ORIGIN') || 'N/A';
    const algolia = this.appConfig.algoliaBaseUrl;
    const mongo = this.config.get<string>('MONGODB_URI');
    const mongoFull = mongo || 'N/A';
    const env = process.env.NODE_ENV || 'development';
    const startedAt = new Date().toISOString();
    const uptime = Math.floor(process.uptime());
    const s = this.connection?.readyState;
    let initialDb = 'unknown';
    switch (s) {
      case ConnectionStates.connected:
        initialDb = 'connected';
        break;
      case ConnectionStates.connecting:
        initialDb = 'connecting';
        break;
      case ConnectionStates.disconnected:
        initialDb = 'disconnected';
        break;
      default:
        initialDb = 'unknown';
    }

    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const fmtMB = (b: number) => (b / 1048576).toFixed(1) + ' MB';
    const userMs = Math.round(cpu.user / 1000);
    const systemMs = Math.round(cpu.system / 1000);

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Social Network API</title>
  <style>
    :root { --bg: #0f172a; --card: #111827; --fg: #e5e7eb; --muted: #9ca3af; --accent: #60a5fa; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color: var(--fg); background: radial-gradient(1200px 600px at 10% 10%, rgba(96,165,250,.15), transparent 60%), radial-gradient(1000px 400px at 90% 20%, rgba(16,185,129,.12), transparent 60%), var(--bg); min-height:100dvh; display:grid; place-items:center; padding:24px; }
    .card { width: min(960px, 95%); background: linear-gradient(180deg, rgba(17,24,39,.9), rgba(17,24,39,.8)); border: 1px solid rgba(255,255,255,.08); border-radius:16px; overflow:hidden; box-shadow: 0 10px 40px rgba(0,0,0,.35); backdrop-filter: blur(8px); }
    .header { display:flex; align-items:center; gap:14px; padding:20px 24px; border-bottom:1px solid rgba(255,255,255,.08); background: linear-gradient(90deg, rgba(96,165,250,.12), transparent); }
    .pulse { width:12px; height:12px; border-radius:999px; background: #34d399; box-shadow:0 0 0 rgba(52,211,153,.7); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(52,211,153,.7);} 70% { box-shadow: 0 0 0 12px rgba(52,211,153,0);} 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0);} }
    h1 { margin:0; font-size: 20px; letter-spacing:.3px; }
    .sub { color: var(--muted); font-size: 13px; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; padding: 20px 24px; }
    .section { border: 1px solid rgba(255,255,255,.08); border-radius:12px; padding:16px; background: rgba(255,255,255,.03); }
    .section h2 { margin: 0 0 10px; font-size: 14px; color: var(--muted); font-weight: 600; letter-spacing:.3px; }
    .kv { display:grid; grid-template-columns: 160px 1fr; gap:8px 12px; font-size: 14px; }
    .kv div { padding:4px 0; }
    .key { color: var(--muted); }
    .val { color: var(--fg); white-space: nowrap; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
    .val::-webkit-scrollbar { height: 6px; }
    .val::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 8px; }
    .endpoints a { color: var(--accent); text-decoration: none; white-space: nowrap; }
    .endpoints a:hover { text-decoration: underline; }
    .footer { padding: 18px 24px; border-top:1px solid rgba(255,255,255,.08); display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; background: rgba(96,165,250,.15); color: #bfdbfe; border:1px solid rgba(96,165,250,.35); border-radius:10px; text-decoration:none; transition:.2s ease; }
    .btn:hover { transform: translateY(-1px); background: rgba(96,165,250,.25); }
    .spinner { width:18px; height:18px; border-radius:999px; border:2px solid rgba(255,255,255,.2); border-top-color:#60a5fa; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .kv { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="card" data-start="${startedAt}" data-uptime="${uptime}">
    <div class="header">
      <div class="pulse" aria-hidden="true"></div>
      <div>
        <h1>Social Network API • Running</h1>
        <div class="sub">NestJS server is up and serving requests.</div>
      </div>
    </div>
    <div class="grid">
      <div class="section">
        <h2>Runtime</h2>
        <div class="kv mono">
          <div class="key">Environment</div><div class="val">${env}</div>
          <div class="key">Port</div><div class="val">${port}</div>
          <div class="key">Started</div><div class="val">${startedAt}</div>
          <div class="key">Uptime</div><div class="val" id="uptime">${uptime}s</div>
          <div class="key">Node</div><div class="val">${process.version}</div>
        </div>
      </div>
      <div class="section">
        <h2>Configuration</h2>
        <div class="kv mono">
          <div class="key">CORS Origin</div><div class="val">${cors}</div>
          <div class="key">Algolia Base</div><div class="val">${algolia}</div>
          <div class="key">Mongo URI</div><div class="val mono">${mongoFull}</div>
        </div>
      </div>
      <div class="section">
        <h2>Health</h2>
        <div class="kv mono">
          <div class="key">Status</div><div class="val" id="health-status">ok</div>
          <div class="key">DB</div><div class="val" id="db-status">${initialDb}</div>
          <div class="key">PID</div><div class="val" id="pid">${process.pid}</div>
          <div class="key">RSS</div><div class="val" id="mem-rss">${fmtMB(mem.rss)}</div>
          <div class="key">Heap Used</div><div class="val" id="mem-heap-used">${fmtMB(mem.heapUsed)}</div>
          <div class="key">Heap Total</div><div class="val" id="mem-heap-total">${fmtMB(mem.heapTotal)}</div>
          <div class="key">CPU User</div><div class="val" id="cpu-user">${userMs} ms</div>
          <div class="key">CPU System</div><div class="val" id="cpu-system">${systemMs} ms</div>
        </div>
      </div>
      <div class="section">
        <h2>Architecture</h2>
        <div class="kv mono">
          <div class="key">Framework</div><div class="val">NestJS (Controllers · Services)</div>
          <div class="key">Modules</div><div class="val">auth · users · search</div>
          <div class="key">Persistence</div><div class="val">MongoDB via Mongoose</div>
          <div class="key">Auth</div><div class="val">JWT (passport strategy + guard)</div>
          <div class="key">Config</div><div class="val">@nestjs/config + AppConfigService</div>
          <div class="key">Flow</div><div class="val">HTTP → Controller → Service → Mongoose Model → Response</div>
          <div class="key">Contracts</div><div class="val">DTOs + typed responses</div>
        </div>
      </div>
      <div class="section endpoints" style="grid-column: 1 / -1;">
        <h2>Endpoints</h2>
        <div class="kv mono">
          <div class="key">Search</div><div class="val"><a href="/search?tags=front_page&hitsPerPage=10" target="_blank">GET /search?tags=front_page&amp;hitsPerPage=10</a></div>
          <div class="key">Front Page</div><div class="val"><a href="/front-page" target="_blank">GET /front-page</a></div>
          <div class="key">Tag</div><div class="val"><a href="/tag/show_hn" target="_blank">GET /tag/show_hn</a></div>
          <div class="key">Item</div><div class="val"><a href="/items/32174292" target="_blank">GET /items/:id</a></div>
          <div class="key">Users</div><div class="val">POST /users/register • POST /users/login • GET /users/me</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <a class="btn" href="http://localhost:3000" target="_blank" rel="noopener">Open Frontend (Next.js)</a>
      <div class="sub">To view the UI, run the frontend and open http://localhost:3000</div>
      <div class="spinner" aria-label="running"></div>
    </div>
  </div>
  <script>
    (function(){
      const root = document.querySelector('.card');
      if(!root) return;
      const startUptime = Number(root.getAttribute('data-uptime')||'0');
      const mountedAt = Date.now()/1000;
      const el = document.getElementById('uptime');
      function fmt(sec){
        const s = Math.floor(sec%60).toString().padStart(2,'0');
        const m = Math.floor((sec/60)%60).toString().padStart(2,'0');
        const h = Math.floor(sec/3600).toString().padStart(2,'0');
        return h+":"+m+":"+s;
      }
      function tick(){
        const now = Date.now()/1000;
        const total = Math.floor(startUptime + (now - mountedAt));
        if(el) el.textContent = fmt(total);
      }
      tick();
      setInterval(tick, 1000);

      async function refreshHealth(){
        try{
          const res = await fetch('/health');
          if(!res.ok) return;
          const data = await res.json();
          const hs = document.getElementById('health-status');
          const db = document.getElementById('db-status');
          if(hs) hs.textContent = data.status || 'unknown';
          if(db) db.textContent = (data.db && data.db.status) ? data.db.status : 'unknown';
          const pid = document.getElementById('pid');
          const mr = document.getElementById('mem-rss');
          const mhu = document.getElementById('mem-heap-used');
          const mht = document.getElementById('mem-heap-total');
          const cu = document.getElementById('cpu-user');
          const cs = document.getElementById('cpu-system');
          function fmtMB(b){ if(typeof b!== 'number') return '—'; return (b/1048576).toFixed(1)+' MB'; }
          function fmtMS(ms){ if(typeof ms!== 'number') return '—'; return ms.toFixed(0)+' ms'; }
          if(pid) pid.textContent = (data.pid!=null? String(data.pid): '—');
          if(mr) mr.textContent = data.memory ? fmtMB(data.memory.rss) : '—';
          if(mhu) mhu.textContent = data.memory ? fmtMB(data.memory.heapUsed) : '—';
          if(mht) mht.textContent = data.memory ? fmtMB(data.memory.heapTotal) : '—';
          if(cu) cu.textContent = data.cpu ? fmtMS(data.cpu.userMs) : '—';
          if(cs) cs.textContent = data.cpu ? fmtMS(data.cpu.systemMs) : '—';
        }catch(_){ /* ignore */ }
      }
      refreshHealth();
      setInterval(refreshHealth, 5000);

    })();
  </script>
</body>
</html>`;
  }

  getHealth() {
    const state = this.connection?.readyState;
    let dbStatus = 'unknown';
    switch (state) {
      case ConnectionStates.connected:
        dbStatus = 'connected';
        break;
      case ConnectionStates.connecting:
        dbStatus = 'connecting';
        break;
      case ConnectionStates.disconnected:
        dbStatus = 'disconnected';
        break;
      default:
        dbStatus = 'unknown';
    }
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
      port: this.appConfig.apiPort,
      db: { status: dbStatus },
      pid: process.pid,
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers,
      },
      cpu: {
        userMs: Math.round(cpu.user / 1000),
        systemMs: Math.round(cpu.system / 1000),
      },
    };
  }
}
