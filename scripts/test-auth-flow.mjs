import assert from "node:assert/strict";
import {
  isIOSOfIPadOS,
  kiesGoogleLoginMethode,
  maakEenmaligeAsyncTaak,
  wachtOpAuthInitialisatie,
} from "../src/auth/authStrategy.js";

const windowsChrome = {
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  platform: "Win32",
  maxTouchPoints: 0,
  userAgentData: { mobile: false },
};
const iphoneSafari = {
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  maxTouchPoints: 5,
};
const ipadOSDesktopUserAgent = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
  platform: "MacIntel",
  maxTouchPoints: 5,
};
const androidChrome = {
  userAgent: "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36",
  platform: "Linux armv8l",
  maxTouchPoints: 5,
  userAgentData: { mobile: true },
};

assert.equal(kiesGoogleLoginMethode(windowsChrome), "popup", "desktop moet popup gebruiken");
assert.equal(kiesGoogleLoginMethode(iphoneSafari), "redirect", "iOS moet redirect gebruiken");
assert.equal(isIOSOfIPadOS(ipadOSDesktopUserAgent), true, "iPadOS met desktop-user-agent moet worden herkend");
assert.equal(kiesGoogleLoginMethode(ipadOSDesktopUserAgent), "redirect", "iPadOS moet redirect gebruiken");
assert.equal(kiesGoogleLoginMethode(androidChrome), "redirect", "andere mobiele browsers moeten redirect gebruiken");

let aantalRedirectVerwerkingen = 0;
const verwerkRedirectEenmalig = maakEenmaligeAsyncTaak(async () => {
  aantalRedirectVerwerkingen += 1;
  return "verwerkt";
});
const [eersteResultaat, tweedeResultaat] = await Promise.all([
  verwerkRedirectEenmalig(),
  verwerkRedirectEenmalig(),
]);
assert.equal(eersteResultaat, "verwerkt");
assert.equal(tweedeResultaat, "verwerkt");
assert.equal(aantalRedirectVerwerkingen, 1, "redirectresultaat mag ook onder StrictMode maar eenmaal worden verwerkt");

let voltooid = false;
let rondRedirectAf;
let rondAuthStateAf;
const redirectAfhandeling = new Promise((resolve) => { rondRedirectAf = resolve; });
const eersteAuthState = new Promise((resolve) => { rondAuthStateAf = resolve; });
const initialisatie = wachtOpAuthInitialisatie(redirectAfhandeling, eersteAuthState)
  .then(() => { voltooid = true; });
rondAuthStateAf(null);
await Promise.resolve();
assert.equal(voltooid, false, "auth loading moet actief blijven zolang redirectafhandeling nog loopt");
rondRedirectAf(null);
await initialisatie;
assert.equal(voltooid, true, "auth loading mag stoppen zodra beide initialisatiestappen gereed zijn");

console.log("Alle authstrategie- en eenmalige redirecttests zijn geslaagd.");
