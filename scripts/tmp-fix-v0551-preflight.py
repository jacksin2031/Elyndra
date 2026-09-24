from pathlib import Path

# The forbidden rule metadata itself is not world content. Strip blueprintProfile
# before the causal audit scans the World Bible, matching the creation validator.
p=Path('src/causal-integrity.js')
s=p.read_text(encoding='utf-8')
old=''' const forbiddenSurfaces=[
  ["FORBIDDEN_WORLD_BIBLE","WORLD_BIBLE",state.world?.bible||{}],
  ["FORBIDDEN_WORLD_TIMELINE","WORLD_TIMELINE",state.world?.timeline||[]],'''
new=''' const causalBible={...(state.world?.bible||{})};delete causalBible.blueprintProfile;
 const forbiddenSurfaces=[
  ["FORBIDDEN_WORLD_BIBLE","WORLD_BIBLE",causalBible],
  ["FORBIDDEN_WORLD_TIMELINE","WORLD_TIMELINE",state.world?.timeline||[]],'''
if old not in s:
    raise SystemExit('causal forbidden surface anchor missing')
p.write_text(s.replace(old,new,1),encoding='utf-8')
