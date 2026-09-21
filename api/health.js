import {json,serverGatewayReady} from "./_ai.js";
export default async function handler(req,res){json(res,200,{ok:true,aiConfigured:false,serverGatewayReady:serverGatewayReady(),version:"0.34.2"})}
