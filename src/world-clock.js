const pad=n=>String(n).padStart(2,"0");
export function ensureClock(state){const w=state.world.state;w.clock??={day:Number.isFinite(w.day)?w.day:1,hour:8,minute:0,totalMinutes:0};w.day=w.clock.day;return w.clock}
export function advanceTime(state,minutes){const c=ensureClock(state),delta=Math.max(0,Math.round(minutes||0));c.totalMinutes+=delta;let absolute=(c.hour*60+c.minute)+delta;c.day+=Math.floor(absolute/1440);absolute%=1440;c.hour=Math.floor(absolute/60);c.minute=absolute%60;state.world.state.day=c.day;return c}
export function formatWorldTime(state){const c=ensureClock(state);return `Day ${c.day} · ${pad(c.hour)}:${pad(c.minute)} · ${period(c.hour)}`}
export function period(h){return h<5?"深夜":h<8?"清晨":h<12?"上午":h<14?"正午":h<18?"午後":h<21?"黃昏":"夜晚"}
