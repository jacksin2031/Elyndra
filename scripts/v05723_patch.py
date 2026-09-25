from pathlib import Path


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f"missing patch anchor: {label}")
    return text.replace(old, new, 1)

# Preserve exact persisted Debug/world artifact bodies and filenames when a retained
# snapshot already contains the raw artifacts captured by the original run.
export_path = Path("src/autotest-export.js")
source = export_path.read_text(encoding="utf-8")
anchor = 'export function buildAutotestExportArtifacts(snapshot={}){\n const s=normalizeSnapshot(snapshot),debugEnabled=s.exportMode!=="world",worldEnabled=s.exportMode!=="debug",artifacts={debug:null,world:null,recovery:null};\n if(debugEnabled)artifacts.debug={kind:"debug",filename:`Elyndra-autotest-debug-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify(s.debugPayload,null,2)};\n if(worldEnabled&&s.worlds.length===1)artifacts.world={kind:"world",filename:`Elyndra-autotest-world-v${s.appVersion}-${s.stamp}.elyndra`,mime:"application/octet-stream",body:JSON.stringify(s.worlds[0].world,null,2)};\n else if(worldEnabled&&s.worlds.length)artifacts.world={kind:"world",filename:`Elyndra-autotest-worlds-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-worlds-v1",appVersion:s.appVersion,createdAt:s.createdAt,worlds:s.worlds},null,2)};\n if(artifacts.debug&&artifacts.world)artifacts.recovery={kind:"recovery",filename:`Elyndra-autotest-recovery-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-recovery-v1",appVersion:s.appVersion,createdAt:s.createdAt,debug:s.debugPayload,worlds:s.worlds},null,2)};\n return artifacts\n}\n'
replacement = '''function persistedAutotestArtifact(snapshot,kind){
 const rows=Object.values(snapshot?.downloadArtifacts||{});
 const row=rows.find(value=>value&&value.kind===kind&&typeof value.filename==="string"&&value.filename&&typeof value.body==="string");
 if(!row)return null;
 return {kind,filename:String(row.filename),mime:String(row.mime||"application/octet-stream"),body:row.body}
}
export function buildAutotestExportArtifacts(snapshot={}){
 const s=normalizeSnapshot(snapshot),debugEnabled=s.exportMode!=="world",worldEnabled=s.exportMode!=="debug",artifacts={debug:null,world:null,recovery:null};
 const persistedDebug=debugEnabled?persistedAutotestArtifact(s,"debug"):null,persistedWorld=worldEnabled?persistedAutotestArtifact(s,"world"):null;
 if(debugEnabled)artifacts.debug=persistedDebug||{kind:"debug",filename:`Elyndra-autotest-debug-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify(s.debugPayload,null,2)};
 if(worldEnabled&&persistedWorld)artifacts.world=persistedWorld;
 else if(worldEnabled&&s.worlds.length===1)artifacts.world={kind:"world",filename:`Elyndra-autotest-world-v${s.appVersion}-${s.stamp}.elyndra`,mime:"application/octet-stream",body:JSON.stringify(s.worlds[0].world,null,2)};
 else if(worldEnabled&&s.worlds.length)artifacts.world={kind:"world",filename:`Elyndra-autotest-worlds-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-worlds-v1",appVersion:s.appVersion,createdAt:s.createdAt,worlds:s.worlds},null,2)};
 if(artifacts.debug&&artifacts.world)artifacts.recovery={kind:"recovery",filename:`Elyndra-autotest-recovery-v${s.appVersion}-${s.stamp}.json`,mime:"application/json;charset=utf-8",body:JSON.stringify({schema:"elyndra-autotest-recovery-v1",appVersion:s.appVersion,createdAt:s.createdAt,debug:s.debugPayload,worlds:s.worlds},null,2)};
 return artifacts
}
'''
source = must_replace(source, anchor, replacement, "buildAutotestExportArtifacts exact raw preservation")
export_path.write_text(source, encoding="utf-8")

# Canonical release version.
pkg = Path("package.json")
pkg_text = pkg.read_text(encoding="utf-8")
pkg_text = must_replace(pkg_text, '"version": "0.57.22"', '"version": "0.57.23"', "package version")
pkg.write_text(pkg_text, encoding="utf-8")

version_path = Path("src/version.js")
version_text = version_path.read_text(encoding="utf-8")
version_text = must_replace(version_text, 'APP_VERSION="0.57.22"', 'APP_VERSION="0.57.23"', "APP_VERSION")
version_path.write_text(version_text, encoding="utf-8")

# Browser module graph and canonical cache assertions must move together.
for path in [Path("app.js"), Path("index.html"), *Path("src").glob("*.js"), *Path("test").glob("*.js")]:
    text = path.read_text(encoding="utf-8")
    if "57022" in text:
        path.write_text(text.replace("57022", "57023"), encoding="utf-8")

# Only canonical-release tests should move their semantic version expectation;
# keep historical v0.57.22 regression names/fixtures intact.
for name in ["test/version-0551-release.test.js", "test/version-ui.test.js"]:
    path = Path(name)
    text = path.read_text(encoding="utf-8")
    if "0.57.22" in text:
        path.write_text(text.replace("0.57.22", "0.57.23"), encoding="utf-8")
    if "0\\.57\\.22" in text:
        path.write_text(path.read_text(encoding="utf-8").replace("0\\.57\\.22", "0\\.57\\.23"), encoding="utf-8")

print("v0.57.23 exact retained artifact patch applied")
