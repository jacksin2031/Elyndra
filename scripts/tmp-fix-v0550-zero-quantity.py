from pathlib import Path

p = Path("src/contextual-actions.js")
s = p.read_text(encoding="utf-8")
old = '''function sceneEventCount(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL").length}
function inventorySeal(state){return (state.inventory||[]).filter(x=>(Number(x?.quantity)||1)>0).map(x=>`${String(x?.id||x?.name||"")}:${Number(x?.quantity)||1}`).sort().join("|").slice(0,900)}
function requiredItemsAvailable(state,row){const required=Array.isArray(row?.requiredItemIds)?row.requiredItemIds:[];if(!required.length)return true;const have=new Set((state.inventory||[]).filter(x=>(Number(x?.quantity)||1)>0).flatMap(x=>[String(x?.id||""),String(x?.name||"")]).filter(Boolean));return required.every(x=>have.has(String(x)))}'''
new = '''function sceneEventCount(state){return (state.events||[]).filter(e=>e?.visibility!=="INTERNAL").length}
function inventoryQuantity(row){if(row?.quantity===undefined||row?.quantity===null)return 1;const n=Number(row.quantity);return Number.isFinite(n)?n:0}
function inventorySeal(state){return (state.inventory||[]).filter(x=>inventoryQuantity(x)>0).map(x=>`${String(x?.id||x?.name||"")}:${inventoryQuantity(x)}`).sort().join("|").slice(0,900)}
function requiredItemsAvailable(state,row){const required=Array.isArray(row?.requiredItemIds)?row.requiredItemIds:[];if(!required.length)return true;const have=new Set((state.inventory||[]).filter(x=>inventoryQuantity(x)>0).flatMap(x=>[String(x?.id||""),String(x?.name||"")]).filter(Boolean));return required.every(x=>have.has(String(x)))}'''
if old not in s:
    raise SystemExit("zero-quantity inventory anchor missing")
p.write_text(s.replace(old, new, 1), encoding="utf-8")

p = Path("test/v0550-ai-contract-regressions.test.js")
s = p.read_text(encoding="utf-8")
marker = 'test("v0.55.0 quantity zero does not satisfy required-item suggestions"'
if marker not in s:
    s += r'''

test("v0.55.0 quantity zero does not satisfy required-item suggestions",()=>{
 const state={world:{id:"W1",state:{day:1},registry:{locations:[],npcs:[]}},player:{location:"石室"},inventory:[{id:"ITEM-paper",name:"紙筆",quantity:0}],events:[],quests:{main:{objectives:["觀察石室"]}}};
 const set=buildContextualActionSet(state,[{label:"拿出紙筆",action:"拿出紙筆記下牆上的符號",kind:"GENERAL",risk:"LOW",requirementsSatisfied:true,requiredItemIds:["ITEM-paper"],causalBasis:"想記錄符號"}]);
 assert.equal(set.all.some(x=>x.label==="拿出紙筆"),false)
});
'''
    p.write_text(s, encoding="utf-8")
