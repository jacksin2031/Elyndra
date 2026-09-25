import {loadLastAutotestExportSnapshot,buildAutotestExportArtifacts} from "./src/autotest-export.js?v=57010";
const ENDPOINT="/__elyndra_autotest_download__";
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));
const disposition=filename=>{const safe=String(filename||"download.json").replace(/["\\\r\n]/g,"_");return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(String(filename||safe))}`};
self.addEventListener("fetch",event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=="GET"||!url.pathname.endsWith(ENDPOINT))return;
 event.respondWith((async()=>{
  const requested=String(url.searchParams.get("filename")||"");
  if(!requested)return new Response("AUTOTEST_DOWNLOAD_FILENAME_REQUIRED",{status:400,headers:{"Cache-Control":"no-store"}});
  const snapshot=await loadLastAutotestExportSnapshot();
  if(!snapshot)return new Response("AUTOTEST_DOWNLOAD_SNAPSHOT_MISSING",{status:404,headers:{"Cache-Control":"no-store"}});
  const artifacts=buildAutotestExportArtifacts(snapshot),artifact=Object.values(artifacts).find(row=>row?.filename===requested);
  if(!artifact)return new Response("AUTOTEST_DOWNLOAD_ARTIFACT_NOT_FOUND",{status:404,headers:{"Cache-Control":"no-store"}});
  return new Response(String(artifact.body??""),{status:200,headers:{"Content-Type":String(artifact.mime||"application/octet-stream"),"Content-Disposition":disposition(artifact.filename),"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff","X-Elyndra-Autotest-Delivery":"service-worker-http"}})
 })())
});
