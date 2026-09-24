from pathlib import Path

path = Path('src/world-compiler.js')
source = path.read_text(encoding='utf-8')
old = '''function normalizeOpeningSociety(society){
 if(!obj(society))return society;
 const refs=societyHistoryRefs(society);if(refs.length&&!uniq(society.historyRefs).length)society.historyRefs=refs;
 return society
}'''
new = '''function normalizeOpeningSociety(society){
 if(!obj(society))return society;
 const faction=obj(society.faction)?society.faction:{};
 const refs=societyHistoryRefs(society);if(refs.length&&!uniq(society.historyRefs).length)society.historyRefs=refs;
 const factionLocation=text(faction.locationName);if(!text(society.locationRef)&&factionLocation)society.locationRef=factionLocation;
 return society
}'''
if old in source:
    source = source.replace(old, new, 1)
    path.write_text(source, encoding='utf-8')
    print('restored missing Society locationRef from faction.locationName')
elif new in source:
    print('Society locationRef recovery already present')
else:
    raise SystemExit('normalizeOpeningSociety block not found')
