import {json} from "./_ai.js";
import {APP_VERSION} from "../src/version.js";
export default async function handler(req,res){json(res,200,{ok:true,aiConfigured:Boolean(process.env.AI_API_URL&&process.env.AI_MODEL&&process.env.ELYNDRA_SERVER_TOKEN),serverAuthRequired:true,version:APP_VERSION})}
