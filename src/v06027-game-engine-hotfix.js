import * as base from "./v06025-game-engine-hotfix.js?v=60025&base=1";
export * from "./v06025-game-engine-hotfix.js?v=60025&base=1";

const clean=(value,max=220)=>String(value??"").normalize("NFC").trim().slice(0,max);
const PLAYER_EVENT=/^PLAYER_(?:ACTION|ITEM_ACTION|ECONOMY_ACTION|REST|UTILITY_ACTION)$/u;

export function performAction(state,action="free",customText="",assessment=null){
 const before=Array.isArray(state?.events)?state.events.length:0,result=base.performAction(state,action,customText,assessment),events=Array.isArray(state?.events)?state.events.slice(before):[];
 const visible=clean(assessment?.playerVisibleAction||customText||action,180),engine=clean(assessment?.engineNormalizedAction||assessment?.normalizedAction,180);
 if(engine){
  for(const event of events){
   if(!PLAYER_EVENT.test(String(event?.type||"")))continue;
   event.engineAction=engine;
   if(visible)event.playerVisibleAction=visible
  }
 }
 return result
}
