from pathlib import Path
p=Path('.github/scripts/v05415_patch.py')
s=p.read_text(encoding='utf-8')
start=s.index("old='''async function runtimeExpansionStage")
end=s.index("t=t.replace('signal,state,plan,maxOutputTokens:1400", start)
replacement=r"""fn_start=t.index('async function runtimeExpansionStage(')
fn_end=t.index('\nfunction applyRuntimeLocationDetails',fn_start)
new='''async function runtimeExpansionStage(stage,{signal,system,user,maxOutputTokens=1200,timeoutMs=45000,temperature=.45,apply,state,plan}){
 let lastError=null;
 for(let attempt=1;attempt<=2;attempt++){
  try{
   const attemptTokens=attempt>1?Math.min(3600,Math.max(Number(maxOutputTokens)+700,Math.round(Number(maxOutputTokens)*1.5))):maxOutputTokens;
   const retryHint=attempt>1?"\\n上一輪未通過 Engine 驗證。只修正本階段 JSON，不得改動先前已鎖定的內容；若上一輪被截斷，縮短自由文字但必須完整閉合 JSON。":"";
   const value=await worldStage(stage,{aiTask:"runtime_expansion",signal,timeoutMs:attempt>1?Math.max(timeoutMs,50000):timeoutMs,retryOnTimeout:false,maxOutputTokens:attemptTokens,temperature:attempt>1?Math.min(.3,temperature):temperature,system:system+retryHint,user:JSON.stringify(typeof user==="function"?user():user)});
   const generation=apply(value);assertRuntimeProgress(state,plan,generation,stage);return generation
  }catch(e){lastError=e}
 }
 throw lastError||new Error(stage+"_FAILED")
}'''
t=t[:fn_start]+new+t[fn_end:]
"""
s=s[:start]+replacement+s[end:]
p.write_text(s,encoding='utf-8')
print('patcher matching repaired')
