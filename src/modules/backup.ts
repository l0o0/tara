import Addon from "../addon";
import { getString } from "../utils/locale";

const { AddonManager } = ChromeUtils.import(
  "resource://gre/modules/AddonManager.jsm",
);

interface AddonInfo {
  id: string;
  userDisabled: boolean;
  version: string;
}

const zotero = ztoolkit.getGlobal("Zotero");

export async function getFilteredPrefs() {
  const prefs = await readPrefsFromFile();
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

export function getStyleInfos() {
  return zotero.Styles.getAll();
}

export async function getTranslatorInfos() {
  const infos = await zotero.Translators.getAll();
  const keepKeys = ["translatorID", "path", "fileName"];
  return infos.map(function (e: any) {
    return keepKeys.reduce((p: any, c) => {
      p[c] = e[c];
      return p;
    }, {});
  });
}

export async function getBackupInfos() {
  const addonInfos = await getAddonInfos();
  const prefsInfos = await getFilteredPrefs();
  const cslInfos = getStyleInfos();
  const tInfos = await getTranslatorInfos();
  return {
    createTime: new Date().toISOString(),
    meta: {
      prefNum: Object.keys(prefsInfos).length,
      addonNum: addonInfos.length,
      cslNum: Object.keys(cslInfos).length,
      tNum: tInfos.length,
    },
    preferences: prefsInfos,
    addons: addonInfos,
    styles: cslInfos,
    translators: tInfos,
  };
}

export async function createBackupFile(isExport = false) {
  // await _Addon.views.openProgressWindow(
  //   _Addon.locale.getString("backup.header"),
  // );
  // Create a temporary folder. Data in backup folder
  const cacheTmp = zotero.getTempDirectory();
  const tmpDir = cacheTmp.path;
  const zipFilename = `${new Date().toLocaleString()}_backup.zip`.replace(
    /[\s\/:]/g,
    "_",
  );
  // Remove existing backup data.
  cacheTmp.append("Backup");
  if (cacheTmp.exists()) {
    cacheTmp.remove(true);
  }
  cacheTmp.append(zipFilename);
  if (cacheTmp.exists()) {
    cacheTmp.remove(false);
  }
  // Create backup item
  await createBackupItem();
  const outDir = PathUtils.join(tmpDir, "Backup");
  await zotero.File.createDirectoryIfMissingAsync(outDir);
  const profileDir: string = zotero.Profile.dir;
  const dataDir: string = zotero.Prefs.get("dataDir") as string;
  let backupInfos;
  let s: string, t: string;
  const totalTasks: number = addon.data.queue?.length || 0;
  zotero.debug(`** Tara ${totalTasks}`);
  while (totalTasks > 0) {
    const task = addon.data.queue?.shift();
    try {
      if (task == "preferences") {
        zotero.debug("** Tara preferences");
        backupInfos = await getBackupInfos();
        const backupInfosText = JSON.stringify(backupInfos);
        // Save preference
        const pf = PathUtils.join(outDir, "backup.json");
        await zotero.File.putContentsAsync(
          zotero.File.pathToFile(pf),
          backupInfosText,
        );
      } else if (task == "addons") {
        zotero.debug("** Tara addons");
        s = PathUtils.join(profileDir, "extensions");
        t = PathUtils.join(outDir, "extensions");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "styles") {
        zotero.debug("** Tara styles");
        s = PathUtils.join(dataDir, "styles");
        t = PathUtils.join(outDir, "styles");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "translators") {
        zotero.debug("** Tara translators");
        s = PathUtils.join(dataDir, "translators");
        t = PathUtils.join(outDir, "translators");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "locate") {
        zotero.debug("** Tara locate");
        s = PathUtils.join(dataDir, "locate");
        t = PathUtils.join(outDir, "locate");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "createZIP") {
        zotero.debug("** Tara createZIP");
        const saveDir = (
          isExport ? zotero.Prefs.get("tara.exportDir") : tmpDir
        ) as string;
        await zotero.File.zipDirectory(
          outDir,
          PathUtils.join(saveDir, zipFilename),
          null,
        );
      } else if (task == "importAttachment") {
        zotero.debug("** Tara importAttachment");
        const zipfile = PathUtils.join(
          zotero.Prefs.get("dataDir") as string,
          "tmp",
          zipFilename,
        );
        const item = zotero.Items.get(
          zotero.Prefs.get("tara.itemID") as number,
        );
        const timeString = new Date().toLocaleString();
        const importOptions = {
          file: zipfile,
          title: timeString + "_backup.zip",
          parentItemID: item.id,
        };
        await zotero.Attachments.importFromFile(importOptions);
      } else if (task == "keepTaraXPI") {
        zotero.debug("** Tara keepTaraXPI");
        await zotero.File.copyToUnique(
          PathUtils.join(profileDir, "extensions", "tara@linxzh.com.xpi"),
          PathUtils.join(
            zotero.Prefs.get("tara.exportDir") as string,
            "tara.xpi",
          ),
        );
      }
      const pvalue = getProgress(addon.data.queue.length, totalTasks);
      _Addon.views.updateProgressWindow(task, true, pvalue);
    } catch (e) {
      _Addon.views.updateProgressWindow(task, false);
    }
  }
  _Addon.views.completeProgressWindow(isExport);
  zotero.debug("Create backup zip complete");
}

export async function createBackupAsAttachment() {
  ztoolkit.log("**create Backup As Attachment");

  // Backup parts in a queue
  let queue: any = {
    preferences: zotero.Prefs.get("tara.keepPrefs"),
    addons: zotero.Prefs.get("tara.keepAddon"),
    styles: zotero.Prefs.get("tara.keepCSLs"),
    translators: zotero.Prefs.get("tara.keepTranslators"),
    createZIP: true,
    importAttachment: true,
  };
  queue = Object.keys(queue).filter((k) => queue[k]);
  await createBackupFile();
  ztoolkit.log("** Tara Tara finish create Backup As Attachment");
}

export async function exportBackup() {
  zotero.debug("** Tara Tara start export backup");
  let queue: any = {
    preferences: zotero.Prefs.get("tara.keepPrefs"),
    addons: zotero.Prefs.get("tara.keepAddon"),
    styles: zotero.Prefs.get("tara.keepCSLs"),
    translators: zotero.Prefs.get("tara.keepTranslators"),
    createZIP: true,
    keepTaraXPI: true,
  };
  queue = Object.keys(queue).filter((k) => queue[k]);
  await createBackupFile(true);
  zotero.debug("** Tara Tara finish export backup");
}

export async function unzipToTemporaryDir(filename: string, tmpDir: string) {
  zotero.debug(tmpDir);
  await zotero.File.createDirectoryIfMissingAsync(tmpDir);
  const zipFile = zotero.File.pathToFile(filename);
  const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
  ].createInstance(Components.interfaces.nsIZipReader);
  zipReader.open(zipFile);

  await zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "translators"),
  );
  await zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "extensions"),
  );
  await zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "styles"),
  );
  await zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "locate"),
  );

  // Extract files
  const entries = zipReader.findEntries("*");
  while (entries.hasMore()) {
    const entry = entries.getNext();
    if (entry.substr(-1) === "/") {
      continue;
    }
    const destPath = PathUtils.join(tmpDir, ...entry.split(/\//));
    zipReader.extract(entry, zotero.File.pathToFile(destPath));
  }
  zipReader.close();
}

export async function importFromBackup() {
  // Import from an export backup zip
  if (!zotero.Prefs.get("tara.itemID")) {
    await createBackupItem();
  }
  const backupItemID = zotero.Prefs.get("tara.itemID") as number;
  const zoteroPane = zotero.getActiveZoteroPane();
  await zoteroPane.addAttachmentFromDialog(false, backupItemID);
  const attachmentID = zotero.Items.get(backupItemID).getAttachments()[0];
  const attachment = zotero.Items.get(attachmentID);
  await restoreFromFile(attachment);
}

export async function restoreFromBackup() {
  const backupItemID = zotero.Prefs.get("tara.itemID") as number;
  const io: any = {
    title: getString("select.title"),
    deferred: zotero.Promise.defer(),
  };
  let attachment;
  if (
    backupItemID &&
    zotero.Items.get(backupItemID) &&
    zotero.Items.get(backupItemID).getAttachments()
  ) {
    const backupItem = zotero.Items.get(backupItemID);
    const attachmentIDs = backupItem.getAttachments();
    const files = {};
    attachmentIDs.reduce((p: any, r) => {
      p[zotero.Items.get(r).getField("title") as string] = r;
      return p;
    }, files);
    io["items"] = Object.keys(files);
    io["items"].sort().reverse();
    zotero.debug(io["items"]);
    _Addon.views.openSelectWindow(io);
    await io.deferred.promise;
    zotero.debug("** Tara Tara select promise");
    zotero.debug(io["attachment"]);
    // No item selected
    if (!io["attachment"]) return;
    attachment = zotero.Items.get(files[io["attachment"]] as number);
  }
  await restoreFromFile(attachment);
}

export async function restoreFromFile(attachment: Zotero.Item) {
  const cacheTmp = zotero.getTempDirectory();
  cacheTmp.append("Backup");
  if (cacheTmp.exists()) {
    cacheTmp.remove(true);
  }
  const tmpDir = cacheTmp.path;
  const queue: any = {
    unzip: true,
    addons: zotero.Prefs.get("tara.keepAddon"),
    styles: zotero.Prefs.get("tara.keepCSLs"),
    translators: zotero.Prefs.get("tara.keepTranslators"),
    locate: zotero.Prefs.get("tara.keepLocate"),
    preferences: zotero.Prefs.get("tara.keepPrefs"),
  };
  _Addon.views.queue = Object.keys(queue).filter((k) => queue[k]);
  const totalTasks = _Addon.views.queue;
  const dataDir = zotero.Prefs.get("dataDir") as string;
  const profileDir: string = zotero.Profile.dir;
  await _Addon.views.openProgressWindow(
    _Addon.locale.getString("restore.header"),
  );
  while (_Addon.views.queue.length > 0) {
    const task = _Addon.views.queue.shift();
    let s: any, t: any;
    try {
      if (task == "unzip") {
        await unzipToTemporaryDir(attachment.getFilePath() as string, tmpDir);
      } else if (task == "addons") {
        const backupPrefsPath = PathUtils.join(tmpDir, "backup.json");
        const backupPrefs = JSON.parse(
          (await zotero.File.getContentsAsync(backupPrefsPath)) as string,
        );
        for (const addon of backupPrefs.addons) {
          ztoolkit.log(`** Tara Tara install addon ${addon.path}`);
          if (addon.path.endsWith(".xpi")) {
            const xpi = PathUtils.join(
              tmpDir,
              "extensions",
              PathUtils.basename(addon.path),
            );
            const xpiFile = zotero.File.pathToFile(xpi);
            // If addon is installed, set userDisabled
            AddonManager.getAddonByID(addon.id, function (a: any) {
              if (a) {
                a.userDisabled = addon.userDisabled;
              } else {
                AddonManager.getInstallForFile(xpiFile, (a: any) =>
                  a.install(),
                );
              }
            });
          } else {
            const isExist = await IOUtils.exists(addon.path);
            if (isExist) {
              const s = PathUtils.join(tmpDir, "extensions", addon.id);
              const t = PathUtils.join(profileDir, "extensions", addon.id);
              const tExists = await IOUtils.exists(t);
              if (!tExists) {
                await zotero.File.copyToUnique(s, t);
              }
            } else {
              zotero.debug(`** Tara Tara missing addon ${addon.path}`);
            }
          }
        }
      } else if (task == "styles") {
        s = PathUtils.join(tmpDir, "styles");
        t = PathUtils.join(dataDir, "styles");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "translators") {
        s = PathUtils.join(tmpDir, "translators");
        t = PathUtils.join(dataDir, "translators");
        await zotero.File.copyDirectory(s, t);
      } else if (task == "locate") {
        s = PathUtils.join(tmpDir, "locate");
        t = PathUtils.join(dataDir, "locate");
        await zotero.File.iterateDirectory(s, async function (entry: any) {
          if (entry.name === "engines.json") {
            const contentsBackup = (await zotero.File.getContentsAsync(
              PathUtils.join(s, entry.name),
            )) as string;
            const enginesBackup = JSON.parse(contentsBackup);
            const contents = (await zotero.File.getContentsAsync(
              PathUtils.join(t, entry.name),
            )) as string;
            const engines = JSON.parse(contents);
            const allContents = enginesBackup.concat(engines);
            await zotero.File.putContentsAsync(
              zotero.File.pathToFile(PathUtils.join(t, entry.name)),
              allContents,
            );
          } else {
            await zotero.File.copyToUnique(
              PathUtils.join(s, entry.name),
              PathUtils.join(t, entry.name),
            );
          }
        });
      } else if (task == "preferences") {
        const backupPrefsPath = PathUtils.join(tmpDir, "backup.json");
        const backupPrefs = JSON.parse(
          (await zotero.File.getContentsAsync(backupPrefsPath)) as string,
        );
        for (let pkey in backupPrefs.preferences) {
          pkey = pkey.replace(/^extensions\./, "");
          if (pkey.search(/dir|path|folder/i)) {
            const isExists = await IOUtils.exists(
              backupPrefs.preferences[pkey],
            );
            if (!isExists) continue;
          }
          zotero.Prefs.set(pkey, backupPrefs.preferences[pkey]);
        }
      }
      const pvalue = getProgress(_Addon.views.queue.length, totalTasks);
      _Addon.views.updateProgressWindow(task, true, pvalue);
    } catch (e) {
      zotero.debug(e);
      _Addon.views.updateProgressWindow(task, false);
    }
  }
  _Addon.views.completeProgressWindow(false, "restore.complete.msg");
}
