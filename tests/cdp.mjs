/* Minimal Chrome DevTools Protocol driver — zero dependencies.
   Uses Node 22's built-in WebSocket and the Chrome already on the machine.
   Real mouse/keyboard input, real console capture, viewport emulation.
   Serve the site on :8899 first, then:  node tests/site.test.mjs  */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
export const BASE = process.env.BASE || 'http://127.0.0.1:8899';

export async function launch() {
  const dir = mkdtempSync(join(tmpdir(), 'nb-chrome-'));
  const proc = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`, '--headless=new',
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--hide-scrollbars', 'about:blank'
  ], { stdio: 'ignore' });
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) break; } catch {}
    await new Promise(s => setTimeout(s, 200));
  }
  return { proc, dir };
}

export async function newPage() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  return connect(t.webSocketDebuggerUrl);
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0; const pending = new Map(); const listeners = []; const consoleLogs = [];
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id != null && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      return m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type))
      consoleLogs.push({ level: m.params.type, text: m.params.args.map(a => a.value ?? a.description ?? a.type).join(' ') });
    if (m.method === 'Runtime.exceptionThrown')
      consoleLogs.push({ level: 'exception', text: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text });
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error')
      consoleLogs.push({ level: 'error', text: m.params.entry.text });
    listeners.forEach(fn => fn(m));
  };
  const send = async (method, params = {}) => {
    await ready; const myId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(myId, { resolve, reject });
      ws.send(JSON.stringify({ id: myId, method, params }));
      setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); reject(new Error('timeout ' + method)); } }, 30000);
    });
  };
  const page = {
    send, consoleLogs,
    async init() { for (const d of ['Page', 'Runtime', 'Log', 'Network']) await send(d + '.enable'); return page; },
    async setViewport(width, height) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }); },
    async goto(url) {
      const done = new Promise(res => listeners.push(m => { if (m.method === 'Page.loadEventFired') res(); }));
      await send('Page.navigate', { url });
      await Promise.race([done, new Promise(r => setTimeout(r, 4000))]);
      await new Promise(s => setTimeout(s, 450));
    },
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: `(async()=>{ ${expr} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    async clickSel(sel, { index = 0 } = {}) {
      const box = await page.eval(`
        const e=document.querySelectorAll(${JSON.stringify(sel)})[${index}]; if(!e) return null;
        e.scrollIntoView({block:'center',behavior:'instant'});
        let prev=null, stable=0;
        for(let i=0;i<40;i++){ await new Promise(s=>requestAnimationFrame(s));
          const r=e.getBoundingClientRect(); if(prev!==null&&Math.abs(r.top-prev)<.5){ if(++stable>=3) break; } else stable=0; prev=r.top; }
        const r=e.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};`);
      if (!box || !box.w || !box.h) throw new Error('no clickable element for ' + sel);
      const p = { x: Math.round(box.x), y: Math.round(box.y), button: 'left', clickCount: 1 };
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p });
      await new Promise(s => setTimeout(s, 220));
    },
    async type(sel, text) {
      await page.eval(`document.querySelector(${JSON.stringify(sel)}).focus(); return 1;`);
      for (const ch of text) { await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch }); }
      await new Promise(s => setTimeout(s, 90));
    },
    async key(key, code, keyCode) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode });
      await new Promise(s => setTimeout(s, 200));
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
    },
    clearConsole() { consoleLogs.length = 0; },
  };
  return page.init();
}

export async function kill(h) { try { await fetch(`http://127.0.0.1:${PORT}/json/close`); } catch {} h.proc.kill('SIGKILL'); }
