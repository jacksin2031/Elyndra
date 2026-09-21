import {normalizeCalendar} from "./world-locality.js?v=271";
export function ensureClock(state){const w=state.world.state;w.clock??={day:Number.isFinite(w.day)?w.day:1,hour:8,minute:0,totalMinutes:0};w.day=w.clock.day;return w.clock}
export function advanceTime(state,minutes){const c=ensureClock(state),delta=Math.max(0,Math.round(minutes||0));c.totalMinutes+=delta;let absolute=(c.hour*60+c.minute)+delta;c.day+=Math.floor(absolute/1440);absolute%=1440;c.hour=Math.floor(absolute/60);c.minute=absolute%60;state.world.state.day=c.day;return c}
function periodName(calendar,minute){const p=calendar.periods.find(x=>x.fromMinute<=x.toMinute?minute>=x.fromMinute&&minute<=x.toMinute:minute>=x.fromMinute||minute<=x.toMinute);return p?.name||calendar.periods[0]?.name||""}
export function formatWorldTime(state){
 const c=ensureClock(state);if(state.player?.calendarKnown!==true)return "時序未知";
 const cal=normalizeCalendar(state.world?.calendar),dayIndex=Math.max(0,c.day-1),cycleIndex=Math.floor(dayIndex/cal.daysPerCycle),dayInCycle=dayIndex%cal.daysPerCycle+1,longIndex=Math.floor(cycleIndex/cal.cyclesPerLongCycle),cycleName=cal.cycles[cycleIndex%cal.cycles.length]||`${cal.cycleTerm}${cycleIndex+1}`,minute=c.hour*60+c.minute;
 return `${cal.epochName} · ${cal.longCycleTerm}${longIndex+1} · ${cycleName} · ${cal.dayTerm}${dayInCycle} · ${periodName(cal,minute)}`
}
export function period(h,state){const cal=normalizeCalendar(state?.world?.calendar),minute=Math.max(0,Math.min(1439,Math.round(Number(h)||0)*60));return periodName(cal,minute)}
