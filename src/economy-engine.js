const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;return Math.abs(h)};
function loc(state){const name=String(state.player?.location||"");return (state.world?.registry?.locations||[]).find(x=>x.name===name)||null}
function goodsFor(location){
 const names=[...(location?.trade?.commonBarter||[]),...(location?.culture?.food||[])].filter(Boolean),seen=new Set(),out=[];
 for(const name of names){if(seen.has(name))continue;seen.add(name);out.push({id:"GOOD-"+hash(location.id+"|"+name),name,basePrice:2+(hash(name+"|"+location.id)%19),stock:3+(hash(location.id+"|stock|"+name)%8)})}
 return out.slice(0,12)
}
export function ensureLocalMarket(state){
 const l=loc(state);if(!l)return null;l.market??={version:1,goods:goodsFor(l),lastMinute:Number(state.world?.state?.clock?.totalMinutes)||0};if(!Array.isArray(l.market.goods))l.market.goods=goodsFor(l);return l.market
}
function priceMultiplier(state){const l=loc(state),ws=l?.worldState||{},pros=Number(ws.prosperity)||50,supply=Number(ws.supply)||50;return clamp(1+(50-supply)/100+(pros-50)/200,.5,1.8)}
export function marketSnapshot(state){
 const l=loc(state),m=ensureLocalMarket(state);if(!l||!m)return null;
 const currency=l.trade?.currencies?.[0]||null;
 const goods=m.goods.map(g=>({...g,price:Math.max(1,Math.round(g.basePrice*priceMultiplier(state)))}));
 return {locationId:l.id,mode:l.trade?.mode||"barter",currency,goods}
}
export function buyGood(state,goodId){
 const snap=marketSnapshot(state),m=ensureLocalMarket(state);if(!snap||!m)return {ok:false,reason:"NO_MARKET"};const good=m.goods.find(x=>x.id===goodId);if(!good||good.stock<=0)return {ok:false,reason:"OUT_OF_STOCK"};
 if(snap.mode==="barter"){const barter=(loc(state)?.trade?.commonBarter||[]),idx=(state.inventory||[]).findIndex(x=>barter.includes(x.name));if(idx<0)return {ok:false,reason:"BARTER_ITEM_REQUIRED"};state.inventory.splice(idx,1)}
 else{const cur=snap.currency;if(!cur)return {ok:false,reason:"NO_LOCAL_CURRENCY"};const price=Math.max(1,Math.round(good.basePrice*priceMultiplier(state)));state.player.wallet??={};if((Number(state.player.wallet[cur.id])||0)<price)return {ok:false,reason:"INSUFFICIENT_FUNDS"};state.player.wallet[cur.id]-=price}
 good.stock--;state.inventory.push({id:"BUY-"+Date.now()+"-"+good.id,name:good.name,description:"在 "+loc(state).name+" 的地方市場取得。",identified:true,equipped:false,source:"MARKET"});return {ok:true,good}
}
export function sellItem(state,itemId){
 const snap=marketSnapshot(state);if(!snap)return {ok:false,reason:"NO_MARKET"};const idx=(state.inventory||[]).findIndex(x=>x.id===itemId||x.name===itemId);if(idx<0)return {ok:false,reason:"ITEM_NOT_OWNED"};const item=state.inventory[idx];
 if(snap.mode==="barter")return {ok:false,reason:"BARTER_ONLY"};
 const cur=snap.currency;if(!cur)return {ok:false,reason:"NO_LOCAL_CURRENCY"};const value=Math.max(1,Math.round((2+(hash(item.name+"|sell")%12))*priceMultiplier(state)*.55));state.inventory.splice(idx,1);state.player.wallet??={};state.player.wallet[cur.id]=(Number(state.player.wallet[cur.id])||0)+value;return {ok:true,item,value,currency:cur}
}
export function exchangeCurrency(state,fromId,amount){
 const snap=marketSnapshot(state),trade=loc(state)?.trade;if(!snap?.currency||!trade)return {ok:false,reason:"NO_EXCHANGE_MARKET"};
 const n=Math.max(1,Math.round(Number(amount)||0)),wallet=state.player.wallet??={},fromKnown=(trade.foreignAcceptance||[]).includes(fromId)||(trade.foreignAcceptance||[]).some(x=>String(x).toLowerCase()===String(fromId).toLowerCase());
 if(!fromKnown||fromId===snap.currency.id)return {ok:false,reason:"CURRENCY_NOT_ACCEPTED"};if((Number(wallet[fromId])||0)<n)return {ok:false,reason:"INSUFFICIENT_FUNDS"};
 const received=Math.max(1,Math.floor(n*.8));wallet[fromId]-=n;wallet[snap.currency.id]=(Number(wallet[snap.currency.id])||0)+received;return {ok:true,fromId,toId:snap.currency.id,spent:n,received}
}
export function payForLodging(state){
 const snap=marketSnapshot(state),l=loc(state);if(!snap||!l)return {ok:false,reason:"NO_LOCAL_MARKET"};
 if(snap.mode==="barter"){const barter=(l.trade?.commonBarter||[]),idx=(state.inventory||[]).findIndex(x=>barter.includes(x.name));if(idx<0)return {ok:false,reason:"BARTER_ITEM_REQUIRED"};const [item]=state.inventory.splice(idx,1);return {ok:true,mode:"barter",item:item.name}}
 const cur=snap.currency;if(!cur)return {ok:false,reason:"NO_LOCAL_CURRENCY"};const cost=Math.max(1,Math.round((3+(hash(l.id+"|lodging")%5))*priceMultiplier(state)));state.player.wallet??={};if((Number(state.player.wallet[cur.id])||0)<cost)return {ok:false,reason:"INSUFFICIENT_FUNDS"};state.player.wallet[cur.id]-=cost;return {ok:true,mode:"currency",cost,currency:cur}
}
export function resolveEconomyAction(state,label,roll){
 const q=String(label||"");if(roll?.success===false)return null;const snap=marketSnapshot(state);if(!snap)return null;
 if(/住宿|旅店|投宿|lodging|inn|stay overnight/i.test(q))return {handled:true,...payForLodging(state)};
 if(/兌換|換錢|exchange/i.test(q)){const wallet=state.player.wallet||{},from=Object.keys(wallet).find(id=>id!==snap.currency?.id&&Number(wallet[id])>0&&q.includes(id));if(from)return {handled:true,...exchangeCurrency(state,from,Math.min(Number(wallet[from])||0,10))}}
 if(/購買|買下|buy/i.test(q)){const g=snap.goods.find(x=>q.includes(x.name));if(g)return {handled:true,...buyGood(state,g.id)}}
 if(/出售|賣掉|賣出|sell/i.test(q)){const item=(state.inventory||[]).find(x=>q.includes(x.name));if(item)return {handled:true,...sellItem(state,item.id)}}
 return null
}
