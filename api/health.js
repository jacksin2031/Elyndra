import {json} from "./_ai.js";
export default async function handler(req,res){json(res,200,{ok:true,aiConfigured:Boolean(process.env.AI_API_URL&&process.env.AI_MODEL),version:"0.54.15"})}
