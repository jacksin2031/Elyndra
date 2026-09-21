export class AIProvider{
 constructor(config={}){this.config=config}
 get enabled(){return Boolean(this.config.endpoint&&this.config.model)}
 async generate(){throw new Error("AI Provider 尚未設定")}
}
export class OpenAICompatibleProvider extends AIProvider{
 async generate({system,messages,responseSchema}){
  if(!this.enabled)throw new Error("AI Provider 尚未設定");
  const headers={"Content-Type":"application/json",...(this.config.apiKey?{"Authorization":`Bearer ${this.config.apiKey}`}:{})};
  const body={model:this.config.model,messages:[{role:"system",content:system},...messages],temperature:.8};
  if(responseSchema)body.response_format={type:"json_schema",json_schema:responseSchema};
  const res=await fetch(this.config.endpoint,{method:"POST",headers,body:JSON.stringify(body)});
  if(!res.ok)throw new Error(`AI HTTP ${res.status}`);
  const data=await res.json();return data.choices?.[0]?.message?.content??data.output_text??data;
 }
}
export function buildNarratorContext(state,action,result){
 const visibleFacts=state.world.canon.facts.filter(f=>state.knowledge.some(k=>k.status==="VERIFIED"&&k.factId===f.id));
 return {system:`你是 Elyndra Narrator。不得修改骰子結果、Canon 或角色狀態。只能敘述 Game Engine 已決定的結果。世界憲法：${state.world.constitution.map(x=>x.text).join("；")}。可見 Canon：${visibleFacts.map(x=>x.text).join("；")}`,
 messages:[{role:"user",content:JSON.stringify({action,result,location:state.player.location,day:state.world.state.day})}]};
}