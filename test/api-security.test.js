import test from "node:test";
import assert from "node:assert/strict";
import {methodGuard,safeBody,serverGatewayReady} from "../api/_ai.js";

function res(){
 return {statusCode:0,headers:{},body:"",setHeader(k,v){this.headers[String(k).toLowerCase()]=String(v)},end(v){this.body=String(v||"")}}
}
function req(overrides={}){
 return {method:"POST",url:"/api/turn",headers:{host:"elyndra.example","x-forwarded-proto":"https","x-forwarded-for":"203.0.113.10"},body:{action:"觀察"},...overrides}
}
function withEnv(values,fn){
 const prior={};
 for(const [k,v] of Object.entries(values)){prior[k]=process.env[k];if(v==null)delete process.env[k];else process.env[k]=String(v)}
 try{return fn()}finally{for(const [k,v] of Object.entries(prior)){if(v==null)delete process.env[k];else process.env[k]=v}}
}

test("server AI gateway is fail-closed until explicitly enabled and authenticated",()=>{
 withEnv({ELYNDRA_SERVER_AI_ENABLED:null,ELYNDRA_GATEWAY_TOKEN:null},()=>{
  assert.equal(serverGatewayReady(),false);
  const out=res();assert.equal(methodGuard(req(),out),false);assert.equal(out.statusCode,503);assert.match(out.body,/SERVER_AI_DISABLED/)
 });
 withEnv({ELYNDRA_SERVER_AI_ENABLED:"true",ELYNDRA_GATEWAY_TOKEN:null},()=>{
  const out=res();assert.equal(methodGuard(req(),out),false);assert.equal(out.statusCode,503);assert.match(out.body,/SERVER_AI_AUTH_REQUIRED/)
 });
 withEnv({ELYNDRA_SERVER_AI_ENABLED:"true",ELYNDRA_GATEWAY_TOKEN:"server-secret"},()=>{
  const out=res();assert.equal(methodGuard(req(),out),false);assert.equal(out.statusCode,401);assert.match(out.body,/UNAUTHORIZED/)
 })
});

test("authenticated same-origin request passes while cross-origin request is rejected",()=>{
 withEnv({ELYNDRA_SERVER_AI_ENABLED:"true",ELYNDRA_GATEWAY_TOKEN:"server-secret",ELYNDRA_ALLOWED_ORIGINS:null},()=>{
  const good=res(),goodReq=req({headers:{host:"elyndra.example","x-forwarded-proto":"https","x-forwarded-for":"203.0.113.11",origin:"https://elyndra.example","x-elyndra-gateway-token":"server-secret"}});
  assert.equal(methodGuard(goodReq,good),true);
  const bad=res(),badReq=req({headers:{host:"elyndra.example","x-forwarded-proto":"https","x-forwarded-for":"203.0.113.12",origin:"https://evil.example","x-elyndra-gateway-token":"server-secret"}});
  assert.equal(methodGuard(badReq,bad),false);assert.equal(bad.statusCode,403);assert.match(bad.body,/ORIGIN_NOT_ALLOWED/)
 })
});

test("request guard rejects oversized declared bodies and applies best-effort per-IP rate limiting",()=>{
 withEnv({ELYNDRA_SERVER_AI_ENABLED:"true",ELYNDRA_GATEWAY_TOKEN:"server-secret",ELYNDRA_MAX_REQUEST_BYTES:"16384",ELYNDRA_RATE_LIMIT_PER_MINUTE:"1"},()=>{
  const oversized=res();assert.equal(methodGuard(req({headers:{"x-elyndra-gateway-token":"server-secret","x-forwarded-for":"203.0.113.13","content-length":"20000"}}),oversized),false);assert.equal(oversized.statusCode,413);
  const headers={"x-elyndra-gateway-token":"server-secret","x-forwarded-for":"203.0.113.99"};
  const first=res();assert.equal(methodGuard(req({headers}),first),true);
  const second=res();assert.equal(methodGuard(req({headers}),second),false);assert.equal(second.statusCode,429);assert.ok(Number(second.headers["retry-after"])>=1)
 })
});

test("safeBody classifies malformed JSON and actual oversized bodies as 4xx",()=>{
 withEnv({ELYNDRA_MAX_REQUEST_BYTES:"16384"},()=>{
  assert.throws(()=>safeBody(req({body:"{"})),e=>e.code==="INVALID_JSON"&&e.statusCode===400);
  assert.throws(()=>safeBody(req({body:JSON.stringify({payload:"x".repeat(17000)})})),e=>e.code==="REQUEST_TOO_LARGE"&&e.statusCode===413);
  assert.deepEqual(safeBody(req({body:'{"ok":true}'})),{ok:true})
 })
});
