const clampUnit=value=>Math.max(0,Math.min(.999999999999,Number.isFinite(Number(value))?Number(value):0));
const pick=(items,random)=>items[Math.floor(clampUnit(random())*items.length)];
const level=random=>1+Math.floor(clampUnit(random())*5);

export function randomWorldSettings(options={},random=Math.random){
 const genres=(Array.isArray(options.genres)?options.genres:[]).filter(Boolean);
 const scales=(Array.isArray(options.scales)?options.scales:[]).filter(Boolean);
 if(!genres.length||!scales.length)throw new Error("RANDOM_WORLD_OPTIONS_REQUIRED");
 return {
  genre:pick(genres,random),
  danger:level(random),
  magic:level(random),
  politics:level(random),
  scale:pick(scales,random)
 }
}
