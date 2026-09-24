from pathlib import Path

# Hard state-layer invariant: a failed Engine outcome may reveal information or
# create consequences, but it may not complete item acquisition or player travel.
p = Path("src/state-sync.js")
s = p.read_text(encoding="utf-8")
old = '''  if(type==="ACQUIRE_ITEM"&&!acquiredItemGrounded(state,raw,context)){rejected.push({index,op:type,itemName:clean(raw?.item?.name,100),reason:"ITEM_NAME_NOT_OBSERVED"});deferredEvidence.push(structuredClone(raw));continue}
  if(type==="MOVE_PLAYER"){
'''
new = '''  if(type==="ACQUIRE_ITEM"&&context?.roll?.success!==true){rejected.push({index,op:type,itemName:clean(raw?.item?.name,100),reason:"ENGINE_OUTCOME_FAILURE"});continue}
  if(type==="ACQUIRE_ITEM"&&!acquiredItemGrounded(state,raw,context)){rejected.push({index,op:type,itemName:clean(raw?.item?.name,100),reason:"ITEM_NAME_NOT_OBSERVED"});deferredEvidence.push(structuredClone(raw));continue}
  if(type==="MOVE_PLAYER"&&context?.roll?.success!==true){rejected.push({index,op:type,location:clean(raw?.location,120),reason:"ENGINE_OUTCOME_FAILURE"});continue}
  if(type==="MOVE_PLAYER"){
'''
if old not in s:
    raise SystemExit("state grounding outcome anchor missing")
p.write_text(s.replace(old,new,1),encoding="utf-8")

p = Path("test/v0550-ai-contract-regressions.test.js")
s = p.read_text(encoding="utf-8")
old = 'import {groundStatePatch} from "../src/state-sync.js";'
if old not in s:
    raise SystemExit("test state-sync import anchor missing")
# import already sufficient; append focused commit-layer regression.
marker='test("v0.55.0 failed outcomes cannot acquire items or complete travel at state commit"'
if marker not in s:
    s += r'''

test("v0.55.0 failed outcomes cannot acquire items or complete travel at state commit",()=>{
 const state={player:{location:"起點"},world:{state:{day:1},registry:{locations:[{id:"L1",name:"起點",known:true},{id:"L2",name:"終點",known:true}],npcs:[],factions:[],sideQuests:[]},canon:{facts:[]}},events:[],inventory:[],knowledge:[]};
 const patch={baseRevision:0,operations:[
  {op:"ACQUIRE_ITEM",item:{name:"紅鑰匙",quantity:1}},
  {op:"MOVE_PLAYER",location:"終點"}
 ]};
 const grounded=groundStatePatch(state,patch,{action:"拿起紅鑰匙並前往終點",roll:{success:false,grade:"CRITICAL_FAILURE"},intent:{kind:"TRAVEL"},observableText:"你看見紅鑰匙與通往終點的道路。"});
 assert.equal(grounded.patch.operations.length,0);
 assert.equal(grounded.rejected.length,2);
 assert.deepEqual(grounded.rejected.map(x=>x.reason),["ENGINE_OUTCOME_FAILURE","ENGINE_OUTCOME_FAILURE"])
});
'''
    p.write_text(s,encoding="utf-8")
