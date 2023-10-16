import Addon from "../addon";

const { AddonManager } = ChromeUtils.import(
  "resource://gre/modules/AddonManager.jsm",
);

interface AddonInfo {
  id: string;
  userDisabled: boolean;
  version: string;
}

const zotero = ztoolkit.getGlobal("Zotero");

export function filterUnnecessaryPrefs(prefs: any) {
  const dropPrefs: Array<string> = [
    "extensions.zotero.dataDir",
    "extensions.zotero.firstRun.skipFirefoxProfileAccessCheck",
    "extensions.zotero.firstRun2",
    "extensions.zotero.lastWebDAVOrphanPurge",
    "extensions.zotero.prefVersion",
    "extensions.zotero.scaffold.translatorsDir",
    "extensions.zotero.sync.reminder.setUp.enabled",
    "extensions.zotero.sync.reminder.setUp.lastDisplayed",
    "extensions.zotero.sync.storage.verified",
    "extensions.zotero.recentSaveTargets",
    "extensions.zotero.lastViewedFolder", // Last viewd collection
    "extensions.zotero.scaffold.translatorsDir",
    "extensions.zotero.scaffold.eslint.enabled",
    "extensions.zotero.tara.itemID",
  ];
  for (const p in prefs) {
    if (p in dropPrefs) {
      prefs.delete(p);
    }
  }
  return prefs;
}

export async function createBackupItem() {
  const s = new zotero.Search();
  s.addCondition("title", "is", "Tara_Backup");
  const itemIDs = await s.search();
  if (itemIDs.length) {
    // Use the first item returned.
    zotero.Prefs.set("tara.itemID", itemIDs[0]);
  } else {
    // Create Docuement Item for store backup zip file.
    const item = new zotero.Item("document");
    item.setField("title", "Tara_Backup");
    const itemID = (await item.saveTx()) as number;
    zotero.Prefs.set("tara.itemID", itemID);
  }
}

export function getPrefsPath(): string {
  const profileDir = zotero.Profile.dir;
  return PathUtils.join(profileDir, "prefs.js");
}

export async function readPrefsFromFile() {
  const prefsFile: string = getPrefsPath();
  return await zotero.Profile.readPrefsFromFile(prefsFile);
}

export async function getAddonInfos() {
  const wordPluginIDs = [
    "zoteroOpenOfficeIntegration@zotero.org",
    "zoteroWinWordIntegration@zotero.org",
  ];
  const addoninfos: Array<AddonInfo> = [];
  for (const addon of await AddonManager.getAllAddons()) {
    if (wordPluginIDs.includes(addon.id)) continue;
    addoninfos.push({
      id: addon.id,
      userDisabled: addon.userDisabled,
      version: addon.version,
    });
  }

  return addoninfos;
}
