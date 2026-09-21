import {json,serverGatewayReady} from "./_ai.js";
export default async function handler(req,res){json(res,200,{ok:true,aiConfigured:Boolean(process.env.AI_API_URL&&process.env.AI_MODEL&&serverGatewayReady()),serverGatewayReady:serverGatewayReady(),version:"0.3.0"})}
