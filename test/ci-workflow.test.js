import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("Pages CI tests supported Node versions, least privilege, and pinned external actions",async()=>{
 const yml=await readFile(new URL("../.github/workflows/pages.yml",import.meta.url),"utf8");
 assert.match(yml,/node-version:[^\n]*'20'[^\n]*'24'/);assert.match(yml,/node-version:[^\n]*'24'[^\n]*'20'/);
 assert.match(yml,/Verify deployed v0\.61\.8 source and rendered badge/);assert.match(yml,/APP_VERSION=\"0\.61\.8\"/);assert.match(yml,/version\.js\?v=61008/);
 const permissionsStart=yml.indexOf("permissions:"),concurrencyStart=yml.indexOf("concurrency:",permissionsStart),workflowPermissions=yml.slice(permissionsStart,concurrencyStart);
 assert.match(workflowPermissions,/contents:\s*read/);
 assert.doesNotMatch(workflowPermissions,/pages:\s*write/);
 assert.doesNotMatch(workflowPermissions,/id-token:\s*write/);
 const deployBlock=(yml.split(/\r?\n  deploy:\r?\n/)[1]||"");
 assert.match(deployBlock,/permissions:\r?\n\s+contents:\s*read\r?\n\s+pages:\s*write\r?\n\s+id-token:\s*write/);
 const uses=[...yml.matchAll(/uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)].map(x=>x[1]);
 assert.ok(uses.length>=5);
 for(const ref of uses)assert.match(ref,/^[^@\s]+@[0-9a-f]{40}$/,"unpinned action: "+ref);
 assert.match(yml,/actions\/configure-pages@45bfe0192ca1faeb007ade9deae92b16b8254a0d/);
 assert.match(yml,/actions\/upload-pages-artifact@fc324d3547104276b827a68afc52ff2a11cc49c9/);
 assert.match(yml,/actions\/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346/)
});
