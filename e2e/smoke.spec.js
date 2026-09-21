import {test,expect} from "@playwright/test";

test("landing boots without page errors and exposes the current version",async({page})=>{
 const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
 await page.goto("/");
 await expect(page.locator("body")).toHaveAttribute("data-screen","landing");
 await expect(page.locator("#newWorldBtn")).toBeVisible();
 await expect(page.locator("#continueBtn")).toBeVisible();
 await expect(page.locator("#versionBadge")).toHaveText("v0.34.4");
 expect(await page.evaluate(()=>globalThis.__ELYNDRA_BOOTED__)).toBe(true);
 expect(pageErrors).toEqual([])
});

test("creator opens and random-world action updates reviewable settings",async({page})=>{
 await page.goto("/");
 await page.locator("#newWorldBtn").click();
 await expect(page.locator("#creator")).toHaveClass(/active/);
 await page.locator("#randomWorldBtn").click();
 await expect(page.locator("#styleHint")).toContainText("已隨機產生：");
 for(const id of ["danger","magic","politics"]){
  const value=await page.locator("#"+id).inputValue();
  await expect(page.locator("#"+id+"Value")).toHaveText(value)
 }
});

test("world generation stays blocked until a Provider is configured",async({page})=>{
 await page.goto("/");
 await page.locator("#newWorldBtn").click();
 const dialogPromise=page.waitForEvent("dialog");
 await page.locator("#generateBtn").click();
 const dialog=await dialogPromise;
 expect(dialog.message()).toContain("需要先在 AI 設定連接 Provider");
 await dialog.accept();
 await expect(page.locator("#creator")).toHaveClass(/active/)
});

test("saved API keys are never rendered back into the settings DOM",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("elyndra:ai-settings:v3",JSON.stringify({
   provider:"openai",
   profiles:{openai:{endpoint:"https://api.openai.com/v1/chat/completions",model:"ignored",apiKey:"smoke-secret-key-123",optimization:"standard"}}
  }))
 });
 await page.goto("/");
 await page.locator("#aiSettingsBtn").click();
 await expect(page.locator("#aiKey")).toHaveValue("");
 await expect(page.locator("#aiKey")).toHaveAttribute("placeholder",/已保存/);
 await expect(page.locator("body")).not.toContainText("smoke-secret-key-123")
});

test("malformed .elyndra import is rejected through the real browser file-input path",async({page})=>{
 await page.goto("/");
 const dialogPromise=page.waitForEvent("dialog");
 await page.locator("#importFile").setInputFiles({name:"broken.elyndra",mimeType:"application/json",buffer:Buffer.from("{")});
 const dialog=await dialogPromise;
 expect(dialog.message()).toBe("SAVE_JSON_INVALID");
 await dialog.accept();
 await expect(page.locator("body")).toHaveAttribute("data-screen","landing")
});

test("mobile landing remains usable without horizontal overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("/");
 await expect(page.locator("#newWorldBtn")).toBeVisible();
 await expect(page.locator("#aiSettingsBtn")).toBeAttached();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 expect(overflow).toBeLessThanOrEqual(1)
});
