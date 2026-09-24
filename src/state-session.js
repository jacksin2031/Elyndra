export function createStateSessionGuard(initialState=null){
 let epoch=0,state=initialState??null;
 return {
  capture(current=state){return {epoch,state:current??null}},
  replace(next){state=next??null;epoch+=1;return {epoch,state}},
  isCurrent(token,current=state){return Boolean(token)&&token.epoch===epoch&&token.state===state&&current===state},
  get epoch(){return epoch},
  get state(){return state}
 }
}
