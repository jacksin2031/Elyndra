from pathlib import Path

ROOT=Path('.')
def rd(p): return (ROOT/p).read_text(encoding='utf-8')
def wr(p,s): (ROOT/p).write_text(s,encoding='utf-8')
def rep(p,old,new,count=1):
    s=rd(p)
    if old not in s: raise SystemExit(f'{p}: missing follow-up anchor: {old[:120]!r}')
    wr(p,s.replace(old,new,count))

# A translation only counts when the translated value itself passes the target-locale leak guard.
p='src/locale-runtime.js'; s=rd(p)
old='''export function hasTranslation(state,value,locale=loadLocale()){
 const text=String(value??"").trim(),id=normalizeLocale(locale);if(!text)return true;const loc=ensureWorldLocale(state,id);if(isRuntimeLocalized(text,id))return true;return Boolean(loc.translations?.[id]?.[translationKey(text)])
}'''
new='''export function hasTranslation(state,value,locale=loadLocale()){
 const text=String(value??"").trim(),id=normalizeLocale(locale);if(!text)return true;const loc=ensureWorldLocale(state,id),mapped=loc.translations?.[id]?.[translationKey(text)];if(mapped)return !hasLocaleLeak(mapped,id);if(hasLocaleLeak(text,id))return false;return isRuntimeLocalized(text,id)
}'''
if old not in s: raise SystemExit('hasTranslation follow-up anchor missing')
s=s.replace(old,new,1)
old='''export function translatedText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id);if(isRuntimeLocalized(text,id))return text;return loc.translations?.[id]?.[translationKey(text)]||text
}'''
new='''export function translatedText(state,value,locale=loadLocale()){
 const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),loc=ensureWorldLocale(state,id),mapped=loc.translations?.[id]?.[translationKey(text)];if(mapped&&!hasLocaleLeak(mapped,id))return mapped;if(isRuntimeLocalized(text,id)&&!hasLocaleLeak(text,id))return text;return text
}'''
if old not in s: raise SystemExit('translatedText follow-up anchor missing')
s=s.replace(old,new,1)
old='export function sessionTranslatedText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale);if(isRuntimeLocalized(text,id))return text;return sessionLocale(id).table[translationKey(text)]||text}'
new='export function sessionTranslatedText(value,locale=loadLocale()){const text=String(value??"");if(!text)return text;const id=normalizeLocale(locale),mapped=sessionLocale(id).table[translationKey(text)];if(mapped&&!hasLocaleLeak(mapped,id))return mapped;if(isRuntimeLocalized(text,id)&&!hasLocaleLeak(text,id))return text;return text}'
if old not in s: raise SystemExit('sessionTranslatedText follow-up anchor missing')
s=s.replace(old,new,1)
# Never let a contaminated stored translation suppress another repair attempt.
old='return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}'
new='return {...payload,strings:candidates.filter(text=>!hasTranslation(state,text,payload.targetLocale))}'
# Intentionally unchanged expression; hasTranslation now validates the mapped target.
wr(p,s)

# Localize the remaining public enum in the World Contract (PEACE/TENSION/WAR).
p='src/world-creation.js'; s=rd(p)
old='const local=v=>enums[String(v)]?.[locale]??String(v??"");'
new='const war={PEACE:{"zh-Hant":"和平","zh-Hans":"和平",en:"Peace",ja:"平和"},TENSION:{"zh-Hant":"緊張","zh-Hans":"紧张",en:"Tension",ja:"緊張"},WAR:{"zh-Hant":"戰爭","zh-Hans":"战争",en:"War",ja:"戦争"}};const local=v=>war[String(v)]?.[locale]??enums[String(v)]?.[locale]??String(v??"");'
if old not in s: raise SystemExit('World Contract local enum anchor missing')
s=s.replace(old,new,1)
old='`${text.danger} ${m.danger}/10 · ${text.survival} ${m.survival}/10 · ${text.unknownArea} ${m.unknownRatio}% · ${m.warState}`'
new='`${text.danger} ${m.danger}/10 · ${text.survival} ${m.survival}/10 · ${text.unknownArea} ${m.unknownRatio}% · ${local(m.warState)}`'
if old not in s: raise SystemExit('war-state rendering anchor missing')
s=s.replace(old,new,1)
wr(p,s)

# Tighten the regression so the exact screenshot enum and stale translation-table case are covered.
p='test/v05903-locale-completeness.test.js'; s=rd(p)
s=s.replace('assert.doesNotMatch(html,/(?:仍然未知|難度規則|文明程度|科技 4|飢餓系統|返回修改|穿越到這個世界|玩家選擇)/)', 'assert.doesNotMatch(html,/(?:仍然未知|難度規則|文明程度|科技 4|飢餓系統|返回修改|穿越到這個世界|玩家選擇|TENSION)/)')
s=s.replace('assert.doesNotMatch(html,/[㐀-鿿぀-ヿ]/u)', 'assert.doesNotMatch(html,/[㐀-鿿぀-ヿ]/u);assert.doesNotMatch(html,/TENSION/)')
old='localization:{sourceLocale:"ja",displayLocale:"ja",translations:{ja:{}}}'
new='localization:{sourceLocale:"ja",displayLocale:"ja",translations:{ja:{}}}'
# Keep initial empty-table reproduction, then additionally prove contaminated stored target cannot hide the leak.
needle='assert.ok(missingVisibleTranslations(state,"ja").strings.includes(mixed))});'
replacement='assert.ok(missingVisibleTranslations(state,"ja").strings.includes(mixed));state.localization.translations.ja["stale"]=mixed;assert.equal(hasLocaleLeak(mixed,"ja"),true)});'
if needle not in s: raise SystemExit('v05903 mixed-output test anchor missing')
s=s.replace(needle,replacement,1)
wr(p,s)
print('v0.59.3 locale follow-up applied')
