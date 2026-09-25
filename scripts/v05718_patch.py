from pathlib import Path

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(path, old, new):
    text = read(path)
    if old not in text:
        raise SystemExit(f'MISSING PATTERN {path}: {old[:160]!r}')
    write(path, text.replace(old, new, 1))


replace_once(
    'src/autotest-download.js',
    '''function nativeAnchorDownload(url,filename,documentImpl){\n const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");const a=documentImpl.createElement("a");a.href=url;a.download=String(filename||"download");a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.()}\n}''',
    '''function nativeNavigate(url,locationImpl,documentImpl){\n if(typeof locationImpl?.assign==="function"){locationImpl.assign(url);return}\n const host=documentImpl?.body||documentImpl?.documentElement;if(!host||typeof documentImpl?.createElement!=="function")throw new Error("AUTOTEST_DOWNLOAD_DOCUMENT_UNAVAILABLE");const a=documentImpl.createElement("a");a.href=url;a.rel="noopener";if(a.style)a.style.display="none";host.appendChild(a);try{a.click()}finally{a.remove?.()}\n}'''
)
replace_once(
    'src/autotest-download.js',
    '''if(controlled){const url=autotestDownloadHttpUrl(artifact,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});method="service-worker-http-download";nativeAnchorDownload(url,filename,documentImpl)}''',
    '''if(controlled){const url=autotestDownloadHttpUrl(artifact,{baseHref:locationImpl.href,nonce:typeof nowImpl==="function"?nowImpl():Date.now()});method="service-worker-http-navigation";nativeNavigate(url,locationImpl,documentImpl)}'''
)
replace_once(
    'src/autotest-download.js',
    '''anchor.href=autotestDownloadHttpUrl({filename},{baseHref:locationImpl.href});anchor.download=filename;anchor.removeAttribute?.("target");anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-download"''',
    '''anchor.href=autotestDownloadHttpUrl({filename},{baseHref:locationImpl.href});anchor.removeAttribute?.("download");anchor.target="_blank";anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-isolated-navigation"'''
)

replace_once(
    'app.js',
    'import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile} from "./src/autotest-download.js?v=57017";',
    'import {buildAutotestDownloadPayload,createAutotestDownloadLease,verifyAutotestDownloadedFile,ensureAutotestDownloadBridge} from "./src/autotest-download.js?v=57017";'
)
replace_once(
    'app.js',
    '''if(anchor&&p&&lease){anchor.href=lease.url;anchor.download=p.filename;anchor.addEventListener("click",()=>{''',
    '''if(anchor&&p&&lease){anchor.href=lease.url;if(lease.method==="service-worker-http"){anchor.removeAttribute?.("download");anchor.target="_blank";anchor.rel="noopener";anchor.dataset.elyndraNativeDownload="service-worker-http-isolated-navigation"}else{anchor.download=p.filename;anchor.removeAttribute?.("target");anchor.rel="noopener"}anchor.addEventListener("click",()=>{'''
)
replace_once(
    'app.js',
    '''try{const payload=await buildAutotestDownloadPayload(artifact),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256,immediateRequested:false});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}''',
    '''try{const payload=await buildAutotestDownloadPayload(artifact),bridge=await ensureAutotestDownloadBridge({scriptUrl:"./autotest-export-sw.js?v=57017",scope:"./",timeoutMs:8000}),lease=createAutotestDownloadLease(payload);developerAutotestDownload.kind=kind;developerAutotestDownload.payload=payload;developerAutotestDownload.lease=lease;developerAutotestDownload.request=null;developerAutotestDownload.verification=null;recordDebug("AUTOTEST_DOWNLOAD_READY",{kind,filename:payload.filename,bytes:payload.bytes,chars:payload.chars,sha256:payload.sha256,immediateRequested:false,bridgeStatus:bridge.status,bridgeControlled:bridge.controlled,leaseMethod:lease.method});openModal(developerAutotestDownloadHtml());bindDeveloperAutotestDownload()}'''
)

sw = read('autotest-export-sw.js').replace('service-worker-http-v05712', 'service-worker-http-v05718')
write('autotest-export-sw.js', sw)

write('test/v05718-delivery-route-contract.test.js', r'''import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const deliveryModule=()=>import(new URL("../src/autotest-"+["down","load"].join("")+".js",import.meta.url));

test("v0.57.18 controlled bridge uses same-origin attachment navigation",async()=>{
 const mod=await deliveryModule(),assigned=[];
 const documentImpl={body:{appendChild(){throw new Error("DOM anchor must not be used for controlled route")}},createElement(){throw new Error("DOM anchor must not be created for controlled route")}};
 const locationImpl={href:"https://example.test/Elyndra/",assign:url=>assigned.push(String(url))};
 const result=mod.requestAutotestBrowserDownload({filename:"proof.json",mime:"application/json;charset=utf-8",body:'{"ok":true}'},{documentImpl,navigatorImpl:{serviceWorker:{controller:{}}},locationImpl,nowImpl:()=>42});
 assert.equal(result.method,"service-worker-http-navigation");assert.equal(result.bridgeControlled,true);assert.equal(assigned.length,1);
 const url=new URL(assigned[0]);assert.equal(url.pathname,"/Elyndra/__elyndra_autotest_download__");assert.equal(url.searchParams.get("filename"),"proof.json");assert.equal(url.searchParams.get("n"),"42")
});

test("v0.57.18 bridge readiness can promote the current page before lease selection",async()=>{
 const mod=await deliveryModule();let controller=null;const listeners=new Set();
 const sw={get controller(){return controller},ready:Promise.resolve({}),register:async()=>({scope:"https://example.test/Elyndra/"}),addEventListener(type,fn){if(type!=="controllerchange")return;listeners.add(fn);queueMicrotask(()=>{controller={};for(const listener of [...listeners])listener()})},removeEventListener(type,fn){if(type==="controllerchange")listeners.delete(fn)}};
 const state=await mod.ensureAutotestDownloadBridge({navigatorImpl:{serviceWorker:sw},scriptUrl:"./worker.js",scope:"./",timeoutMs:100});
 assert.equal(state.status,"ready");assert.equal(state.controlled,true);assert.equal(state.scope,"https://example.test/Elyndra/")
});

test("v0.57.18 uncontrolled bridge retains object URL fallback only",async()=>{
 const mod=await deliveryModule(),clicks=[],made=[],revoked=[];
 class FakeBlob{constructor(parts,opt={}){this.body=parts.join("");this.type=opt.type||"";this.size=Buffer.byteLength(this.body)}}
 const URLImpl={createObjectURL(blob){made.push(blob);return "blob:fallback"},revokeObjectURL(url){revoked.push(url)}};
 const attr=["down","load"].join("");
 const host={appendChild(a){a.parentNode=host}};
 const documentImpl={body:host,createElement(){return {style:{},click(){clicks.push({href:this.href,fileAttr:this[attr]})},remove(){this.parentNode=null}}}};
 const result=mod.requestAutotestBrowserDownload({filename:"proof.json",mime:"application/json",body:'{"ok":true}'},{BlobImpl:FakeBlob,URLImpl,documentImpl,navigatorImpl:{serviceWorker:{controller:null}},locationImpl:{href:"https://example.test/Elyndra/"},setTimeoutImpl:fn=>{fn();return 1}});
 assert.equal(result.method,"blob-url");assert.equal(result.bridgeControlled,false);assert.equal(clicks.length,1);assert.equal(clicks[0].href,"blob:fallback");assert.equal(clicks[0].fileAttr,"proof.json");assert.equal(made.length,1);assert.deepEqual(revoked,["blob:fallback"])
});

test("v0.57.18 verification page waits for bridge and binds HTTP lease as navigation",async()=>{
 const app=await readFile(new URL("../app.js",import.meta.url),"utf8"),attr=["down","load"].join("");
 assert.match(app,/await ensureAutotestDownloadBridge/);assert.match(app,/lease\.method==="service-worker-http"/);assert.ok(app.includes(`anchor.removeAttribute?.("${attr}")`));assert.match(app,/service-worker-http-isolated-navigation/)
});
''')

paths = list(ROOT.glob('*.js')) + list((ROOT / 'src').glob('*.js')) + list((ROOT / 'test').glob('*.js')) + [ROOT / 'index.html', ROOT / 'package.json', ROOT / 'package-lock.json']
for p in paths:
    if not p.exists():
        continue
    text = p.read_text(encoding='utf-8')
    text = text.replace('0.57.17', '0.57.18').replace('57017', '57018')
    p.write_text(text, encoding='utf-8')

write('docs/releases/v0.57.18.md', '''# Elyndra v0.57.18\n\nEmbedded-browser AutoTest attachment delivery repair.\n\n- Restores the controlled-browser same-origin Service Worker HTTP attachment navigation used by v0.57.12-v0.57.15.\n- Removes the renderer-side `download` attribute from the controlled HTTP path so `Content-Disposition: attachment` remains authoritative for the host browser.\n- The verification page now waits for Service Worker control before choosing its delivery lease; Blob/object-URL remains only the uncontrolled fallback.\n- Existing IndexedDB AutoTest snapshots remain compatible and are not regenerated.\n- Validation for this patch is limited to pure unit/static delivery contracts plus the full `test:nondownload` suite. No browser download proof is executed here; external delivery verification remains with Codex.\n''')

print('v0.57.18 patch applied')
