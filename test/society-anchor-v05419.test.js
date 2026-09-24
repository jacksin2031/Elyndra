import test from "node:test";
import assert from "node:assert/strict";
import {worldGenerationLinkIssues} from "../src/world-compiler.js";

const anchor={
 startingLocation:"低語檔案館地下第三層觀察室",
 startingRegion:"灰誓核心環帶",
 startingSettlement:"低語檔案館"
};
const history=[{id:"HIST-2"},{id:"HIST-3"}];
const geography={location:{name:anchor.startingLocation,region:anchor.startingRegion}};

test("v0.54.19 recovers missing Society locationRef from faction locationName",()=>{
 const society={
  locationCulture:{identity:"順從的沉默者"},
  faction:{
   name:"低語殘響會",
   locationName:anchor.startingLocation,
   historyRefs:["HIST-2","HIST-3"]
  }
 };
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future:{worldTimeline:[]}});
 assert.equal(issues.includes("SOCIETY_LOCATION_REF_INVALID"),false,issues.join(","));
 assert.equal(issues.includes("SOCIETY_HISTORY_REF_REQUIRED"),false,issues.join(","));
 assert.equal(society.locationRef,anchor.startingLocation);
 assert.deepEqual(society.historyRefs,["HIST-2","HIST-3"]);
});

test("v0.54.19 still rejects a mismatched Society faction location",()=>{
 const society={
  faction:{name:"錯位勢力",locationName:"另一座城",historyRefs:["HIST-2"]}
 };
 const issues=worldGenerationLinkIssues({anchor,history,geography,society,future:{worldTimeline:[]}});
 assert.ok(issues.includes("SOCIETY_LOCATION_REF_INVALID"));
 assert.ok(issues.includes("SOCIETY_FACTION_LOCATION_INVALID"));
});
