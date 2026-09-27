from pathlib import Path
import json

def replace(path,old,new):
 p=Path(path); s=p.read_text(encoding='utf-8')
 if old not in s: raise SystemExit(f'MISSING:{path}:{old[:80]}')
 p.write_text(s.replace(old,new,1),encoding='utf-8')

# Fix the Social 2.0 result contract before integration.
social=Path('src/social-conflict-engine.js'); sx=social.read_text(encoding='utf-8')
sx=sx.replace('return {ok:true,tactic,outcome,summary,moraleDelta,relationship:updatedRelationship,','return {ok:true,tactic:t,outcome,summary,moraleDelta,relationship:updatedRelationship,',1)
social.write_text(sx,encoding='utf-8')

p=Path('src/combat-engine.js'); s=p.read_text(encoding='utf-8')
needle='import {activeEnemies,advanceEncounterRound,applyEnemyMorale,completeEncounterObjectives,consumeEnvironment,createEncounterFrame,encounterSnapshot,ensureEncounterFrame,movePlayerZone,recordEncounterAction,selectCombatTarget,setPrimaryEnemy,usableEnvironment} from "./encounter-engine.js?v=60001";'
if 'social-conflict-engine.js?v=60002' not in s:
 s=s.replace(needle,needle+'\nimport {resolveSocialAction,socialActionDc} from "./social-conflict-engine.js?v=60002";')
s=s.replace('function actionDc(kind,target,environment,intent){const base=Number(target?.defense)||11;if(kind==="SOCIAL"){const morale=Number(target?._morale)||100;return clamp(9+Math.ceil(morale/25),8,16)}','function actionDc(state,kind,target,environment,intent){const base=Number(target?.defense)||11;if(kind==="SOCIAL")return socialActionDc(state,target,intent,{combat:true,moraleBefore:Number(target?._morale)||100});')
s=s.replace('dc=actionDc(kind,target,environment,intent)','dc=actionDc(state,kind,target,environment,intent)')
s=s.replace('let damage=0,environmentDamage=0,movement=null,itemResult=null,magicResult=null,moraleResult=null,tacticalEffect=null,reduction=0,summary="";','let damage=0,environmentDamage=0,movement=null,itemResult=null,magicResult=null,moraleResult=null,socialResult=null,tacticalEffect=null,reduction=0,summary="";')
old='else if(kind==="SOCIAL"&&target){const delta=goalAchieved?(intent.approach==="INTIMIDATION"?-22:-14):-3;moraleResult=applyEnemyMorale(state.combat,target,delta,"combat_social");if(goalAchieved&&moraleResult.after<=18){target.combatState="SURRENDERED";summary=`${target.name} 的戰意被瓦解，停止繼續戰鬥。`}else summary=goalAchieved?`你的話動搖了 ${target.name} 的戰意。`:`${target.name} 沒有接受你的交涉。`}'
new='else if(kind==="SOCIAL"&&target){const before=Number(state.combat.encounter?.morale?.byCombatant?.[target.id]??100);socialResult=resolveSocialAction(state,target,intent,resolution,{combat:true,moraleBefore:before});moraleResult=applyEnemyMorale(state.combat,target,Number(socialResult.moraleDelta)||0,"combat_social_"+String(socialResult.tactic||"general").toLowerCase());if(socialResult.surrendered===true)target.combatState="SURRENDERED";summary=socialResult.summary||`${target.name} 沒有接受你的交涉。`}'
if old not in s: raise SystemExit('SOCIAL_BRANCH_NOT_FOUND')
s=s.replace(old,new,1)
s=s.replace('movement,itemResult,magicResult,moraleResult,tacticalEffect,phase:','movement,itemResult,magicResult,moraleResult,socialResult,tacticalEffect,phase:',1)
p.write_text(s,encoding='utf-8')

pkg=Path('package.json'); data=json.loads(pkg.read_text(encoding='utf-8')); data['version']='0.60.2'; pkg.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
Path('src/version.js').write_text('export const APP_VERSION="0.60.2";\n',encoding='utf-8')
replace('app.js','./src/version.js?v=60001','./src/version.js?v=60002')
replace('app.js','./src/combat-engine.js?v=60001','./src/combat-engine.js?v=60002')
idx=Path('index.html'); x=idx.read_text(encoding='utf-8').replace('"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60001"','"./src/combat-engine.js?v=59014":"./src/combat-engine.js?v=60002"').replace('app.js?v=60001','app.js?v=60002'); idx.write_text(x,encoding='utf-8')

vu=Path('test/version-ui.test.js'); x=vu.read_text(encoding='utf-8').replace('0.60.1','0.60.2').replace('60001','60002'); vu.write_text(x,encoding='utf-8')
combat_test=Path('test/combat-v0601.test.js'); x=combat_test.read_text(encoding='utf-8').replace('combat-engine\\.js\\?v=60001','combat-engine\\.js\\?v=60002'); combat_test.write_text(x,encoding='utf-8')

vr=Path('test/version-0551-release.test.js'); x=vr.read_text(encoding='utf-8')
x=x.replace('Official v0.60.0 release contract','Official v0.60.2 release contract')
x=x.replace('test("v0.60.0 is the canonical app and browser cache release"','test("v0.60.2 is the canonical app and browser cache release"')
x=x.replace('assert.equal(pkg.version,"0.60.0")','assert.equal(pkg.version,"0.60.2")')
x=x.replace('/APP_VERSION="0\\.60\\.0"/','/APP_VERSION="0\\.60\\.2"/')
x=x.replace('/app\\.js\\?v=60000/','/app\\.js\\?v=60002/')
x=x.replace('"59015","60000"].includes(x)','"59015","60000","60001","60002"].includes(x)')
x=x.replace('/\\.\\/src\\/version\\.js\\?v=60000/','/\\.\\/src\\/version\\.js\\?v=60002/')
x=x.replace('assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("60000"));','assert.ok(tokens.includes("57029"));assert.ok(tokens.includes("58000"));assert.ok(tokens.includes("59010"));assert.ok(tokens.includes("60002"));')
vr.write_text(x,encoding='utf-8')

pages=Path('.github/workflows/pages.yml'); x=pages.read_text(encoding='utf-8').replace('name: Focused v0.59.15 regressions','name: Focused release regressions')
if 'test/social-conflict-v0602.test.js' not in x: x=x.replace('node --test test/combat-v0601.test.js ','node --test test/social-conflict-v0602.test.js test/combat-v0601.test.js ')
pages.write_text(x,encoding='utf-8')
