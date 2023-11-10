import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

const { AddonManager } = ChromeUtils.import(
  "resource://gre/modules/AddonManager.jsm",
);

interface AddonInfo {
  id: string;
  userDisabled: boolean;
  version: string;
}

export function getQueue() {
  const qPrefs = [
    "keepPrefs",
    "keepAddons",
    "keepCSLs",
    "keepTranslators",
    "keepLocate",
  ];

  const queue: Array<string> = [];
  qPrefs.forEach((i) => {
    if (getPref(i)) {
      queue.push(i);
    }
  });
  return queue;
}

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
    "extensions.zotero.tara.exportDir",
    "extensions.zotero.thirdPartyCache",
    "extensions.zotero.zotero.asyncTemp",
    "extensions.zoteroWinWordIntegration.installed",
    "extensions.zoteroWinWordIntegration.version",
  ];
  for (const p in prefs) {
    if (dropPrefs.includes(p)) delete prefs[p];
  }
  return prefs;
}

export async function createBackupItem() {
  const itemID = getPref("itemID");
  if (itemID && Zotero.Items.get(itemID as number)) {
    ztoolkit.log("备份条目已存在，不必创建新条目");
    return;
  }
  const s = new Zotero.Search();
  s.addCondition("title", "is", "Tara_Backup");
  const itemIDs = await s.search();
  if (itemIDs.length) {
    // Use the first item returned.
    Zotero.Prefs.set("tara.itemID", itemIDs[0]);
  } else {
    // Create Docuement Item for store backup zip file.
    const item = new Zotero.Item("document");
    item.setField("title", "Tara_Backup");
    const itemID = (await item.saveTx()) as number;
    Zotero.Prefs.set("tara.itemID", itemID);
  }
}

export function getPrefsPath(): string {
  const profileDir = Zotero.Profile.dir;
  return PathUtils.join(profileDir, "prefs.js");
}

export async function readPrefsFromFile() {
  const prefsFile: string = getPrefsPath();
  return await Zotero.Profile.readPrefsFromFile(prefsFile);
}

export async function getAddonInfos() {
  const wordPluginIDs = [
    "ZoteroOpenOfficeIntegration@Zotero.org",
    "ZoteroWinWordIntegration@Zotero.org",
  ];
  const addoninfos: Array<AddonInfo> = [];
  for (const addon of await AddonManager.getAllAddons()) {
    // Weird plugin has undefined addon id
    if (wordPluginIDs.includes(addon.id) && !addon.id) continue;
    addoninfos.push({
      id: addon.id,
      userDisabled: addon.userDisabled,
      version: addon.version,
    });
  }

  return addoninfos;
}

export function getStyleInfos() {
  return Zotero.Styles.getAll();
}

export async function getTranslatorInfos() {
  const infos = await Zotero.Translators.getAll();
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
    ZoteroVersion: Zotero.version,
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
  // Create a temporary folder. Data in backup folder
  const cacheTmp = Zotero.getTempDirectory();
  const tmpDir = cacheTmp.path;
  const zipFilename = `${new Date().toLocaleString()}_backup.zip`.replace(
    /[\s/:]/g,
    "_",
  );
  const saveDir = (isExport ? getPref("exportDir") : tmpDir) as string;
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
  await Zotero.File.createDirectoryIfMissingAsync(outDir);
  const profileDir: string = Zotero.Profile.dir;
  const dataDir: string = Zotero.Prefs.get("dataDir") as string;
  let backupInfos;
  let s: string, t: string;
  let success = true;
  await addon.data.progress.openProgressWindow({
    header: isExport ? getString("export-header") : getString("backup-header"),
  });
  while (addon.data.progress.queue.length > 0) {
    const task = addon.data.progress.queue?.shift();
    ztoolkit.log(task);
    ztoolkit.log(addon.data.progress.queue);
    try {
      switch (task) {
        case "keepPrefs": {
          ztoolkit.log("** Tara preferences");
          backupInfos = await getBackupInfos();
          const backupInfosText = JSON.stringify(backupInfos);
          // Save preference
          const pf = PathUtils.join(outDir, "backup.json");
          ztoolkit.log(pf);
          await Zotero.File.putContentsAsync(
            Zotero.File.pathToFile(pf),
            backupInfosText,
          );
          break;
        }
        case "keepAddons":
          ztoolkit.log("** Tara addons");
          s = PathUtils.join(profileDir, "extensions");
          t = PathUtils.join(outDir, "extensions");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "keepCSLs":
          ztoolkit.log("** Tara styles");
          s = PathUtils.join(dataDir, "styles");
          t = PathUtils.join(outDir, "styles");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "keepTranslators":
          ztoolkit.log("** Tara translators");
          s = PathUtils.join(dataDir, "translators");
          t = PathUtils.join(outDir, "translators");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "keepLocate":
          ztoolkit.log("** Tara locate");
          s = PathUtils.join(dataDir, "locate");
          t = PathUtils.join(outDir, "locate");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "createZIP": {
          ztoolkit.log("** Tara createZIP");
          ztoolkit.log(saveDir);
          ztoolkit.log(outDir);
          await Zotero.File.zipDirectory(
            outDir,
            PathUtils.join(saveDir, zipFilename),
            null,
          );
          break;
        }
        case "importAttachment": {
          ztoolkit.log("** Tara importAttachment");
          const zipfile = PathUtils.join(saveDir, zipFilename);
          const item = Zotero.Items.get(getPref("itemID") as number);
          const timeString = new Date().toLocaleString();
          const importOptions = {
            file: zipfile,
            title: timeString + "_backup.zip",
            parentItemID: item.id,
          };
          await Zotero.Attachments.importFromFile(importOptions);
          break;
        }
        case "keepTaraXPI":
          ztoolkit.log("** Tara keepTaraXPI");
          await Zotero.File.removeIfExists(
            PathUtils.join(getPref("exportDir") as string, "tara.xpi"),
          );
          await Zotero.File.copyToUnique(
            PathUtils.join(profileDir, "extensions", "tara@linxzh.com.xpi"),
            PathUtils.join(getPref("exportDir") as string, "tara.xpi"),
          );
          break;
      }
      addon.data.progress.updateProgressWindow(task, true);
    } catch (e) {
      ztoolkit.log(e);
      success = false;
      addon.data.progress.updateProgressWindow(task, false);
      addon.data.progress.queue = [];
    }
  }

  let msg: string;
  if (isExport && success) {
    msg = getString("export-success-msg", {
      args: { folder: getPref("exportDir"), zipfile: zipFilename },
    });
  } else if (isExport && !success) {
    msg = getString("export-fail-msg");
  } else if (!isExport && !success) {
    msg = getString("export-item-fail-msg");
  } else {
    msg = getString("export-item-success-msg");
  }

  addon.data.progress.completeProgressWindow(
    success,
    success ? getString("export-success") : getString("export-fail"),
    msg,
  );
  ztoolkit.log("Create backup zip complete");
}

export async function createBackupAsAttachment() {
  ztoolkit.log("**create Backup As Attachment");

  // init Progress queue
  addon.data.progress.queue = getQueue().concat([
    "createZIP",
    "importAttachment",
  ]);
  addon.data.progress.totalTasks = addon.data.progress.queue.length;

  await createBackupFile();
  ztoolkit.log("Creating Backup as Attachment finished");
}

export async function exportBackup() {
  ztoolkit.log("** Tara Tara start export backup");
  addon.data.progress.queue = getQueue().concat(["createZIP", "keepTaraXPI"]);
  addon.data.progress.totalTasks = addon.data.progress.queue.length;
  await createBackupFile(true);
  ztoolkit.log("** Tara Tara finish export backup");
}

export async function unzipToTemporaryDir(filename: string, tmpDir: string) {
  ztoolkit.log(tmpDir);
  await Zotero.File.createDirectoryIfMissingAsync(tmpDir);
  const zipFile = Zotero.File.pathToFile(filename);
  const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
  ].createInstance(Components.interfaces.nsIZipReader);
  zipReader.open(zipFile);

  await Zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "translators"),
  );
  await Zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "extensions"),
  );
  await Zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "styles"),
  );
  await Zotero.File.createDirectoryIfMissingAsync(
    PathUtils.join(tmpDir, "locate"),
  );

  // Extract files
  const entries = zipReader.findEntries("*");
  while (entries.hasMore()) {
    const entry = entries.getNext();
    if (entry.substr(-1) === "/" || entry.substr(-1) === "\\") {
      continue;
    }
    const entryPath = entry.split(/[/\\]/);
    // 二级目录
    let destPath = PathUtils.join(tmpDir, entryPath[0]);
    if (entryPath.length == 2)
      destPath = PathUtils.join(destPath, entryPath[1]);
    zipReader.extract(entry, Zotero.File.pathToFile(destPath));
  }
  zipReader.close();
}

export async function importFromBackup() {
  // Import from an export backup zip
  const filename = await new FilePickerHelper(
    `${Zotero.getString("select-backup-file")}`,
    "open",
    [[`${getString("zip-file")}(*.zip)"`, "*.zip"]],
  ).open();

  if (!filename) return;

  await restoreFromFile(filename);
}

export async function restoreFromBackup() {
  const backupItemID = getPref("itemID") as number;
  const io: any = {
    title: getString("select-title"),
    deferred: Zotero.Promise.defer(),
  };
  let attachment: any;
  if (
    backupItemID &&
    Zotero.Items.get(backupItemID) &&
    Zotero.Items.get(backupItemID).getAttachments()
  ) {
    const backupItem = Zotero.Items.get(backupItemID);
    const attachmentIDs = backupItem.getAttachments();
    const files: any = {};
    attachmentIDs.reduce((p: any, r) => {
      p[Zotero.Items.get(r).getField("title") as string] = r;
      return p;
    }, files);
    io["items"] = Object.keys(files);
    io["items"].sort().reverse();
    ztoolkit.log(io["items"]);
    addon.data.progress.openSelectWindow(io);
    await io.deferred.promise;
    ztoolkit.log("** Tara Tara select promise");
    ztoolkit.log(io["attachment"]);
    // No item selected
    if (!io["attachment"]) return;
    attachment = Zotero.Items.get(files[io["attachment"]] as number);
  }
  await restoreFromFile(attachment!.getFilePath() as string);
}

export async function restoreFromFile(filename: string) {
  const cacheTmp = Zotero.getTempDirectory();
  cacheTmp.append("Backup");
  if (cacheTmp.exists()) {
    cacheTmp.remove(true);
  }
  const tmpDir = cacheTmp.path;
  addon.data.progress.queue = ["unzip"].concat(getQueue());
  addon.data.progress.totalTasks = addon.data.progress.queue.length;
  const dataDir = Zotero.Prefs.get("dataDir") as string;
  await addon.data.progress.openProgressWindow({
    header: getString("restore-header"),
  });
  const backupPrefsPath = PathUtils.join(tmpDir, "backup.json");
  let backupPrefs: any;
  let success = true;
  let backupZoteroVersion = "";
  while (addon.data.progress.queue.length > 0) {
    const task = addon.data.progress.queue.shift();
    let s: any, t: any;
    try {
      switch (task) {
        case "unzip":
          ztoolkit.log("restore unzip");
          await unzipToTemporaryDir(filename, tmpDir);
          break;
        case "keepAddons":
          ztoolkit.log("restore addons");
          backupPrefs = JSON.parse(
            (await Zotero.File.getContentsAsync(backupPrefsPath)) as string,
          );
          for (const addon of backupPrefs.addons) {
            ztoolkit.log(`install addon ${addon.id} ${addon.userDisabled}`);
            const addonFile =
              PathUtils.join(PathUtils.join(tmpDir, "extensions"), addon.id) +
              ".xpi";
            const isExist = await IOUtils.exists(addonFile);
            ztoolkit.log(addonFile);
            ztoolkit.log(isExist);
            if (isExist) {
              const xpiFile = Zotero.File.pathToFile(addonFile);
              const installedResult =
                await AddonManager.getInstallForFile(xpiFile);
              if (
                !installedResult.addon ||
                installedResult.isCompatible ||
                installedResult.isPlatformCompatible
              ) {
                ztoolkit.log("plugin install failed or incompatible");
              } else {
                await installedResult.install();
                const installedAddon = await AddonManager.getAddonByID(
                  addon.id,
                );
                if (addon.userDisabled) {
                  await installedAddon.disable();
                } else {
                  await installedAddon.enable();
                }
              }
            } else {
              ztoolkit.log(`**missing addon ${addon.id}`);
            }
          }
          break;
        case "keepCSLs":
          ztoolkit.log("restore CSLs");
          s = PathUtils.join(tmpDir, "styles");
          t = PathUtils.join(dataDir, "styles");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "keepTranslators":
          ztoolkit.log("restore translators");
          s = PathUtils.join(tmpDir, "translators");
          t = PathUtils.join(dataDir, "translators");
          ztoolkit.log(`restore locate, ${s}, ${t}`);
          await Zotero.File.copyDirectory(s, t);
          break;
        case "keepLocate":
          ztoolkit.log("restore locate");
          s = PathUtils.join(tmpDir, "locate");
          t = PathUtils.join(dataDir, "locate");
          await Zotero.File.iterateDirectory(s, async function (entry: any) {
            if (entry.name === "engines.json") {
              const contentsBackup = (await Zotero.File.getContentsAsync(
                PathUtils.join(s, entry.name),
              )) as string;
              const enginesBackup = JSON.parse(contentsBackup);
              const contents = (await Zotero.File.getContentsAsync(
                PathUtils.join(t, entry.name),
              )) as string;
              const engines = JSON.parse(contents);
              const engineNames = engines.map((e: any) => e._name);
              enginesBackup.forEach((e: any) => {
                if (!engineNames.includes(e._name)) {
                  engines.push(e);
                }
              });
              await Zotero.File.putContentsAsync(
                Zotero.File.pathToFile(PathUtils.join(t, entry.name)),
                JSON.stringify(engines),
              );
            } else {
              await Zotero.File.copyToUnique(
                PathUtils.join(s, entry.name),
                PathUtils.join(t, entry.name),
              );
            }
          });
          break;
        case "keepPrefs":
          ztoolkit.log("restore preferences");
          backupPrefs = JSON.parse(
            (await Zotero.File.getContentsAsync(backupPrefsPath)) as string,
          );
          backupZoteroVersion = backupPrefs.ZoteroVersion || '6'; // Old Tara in Zotero 6 do not have this pref.
          for (const pkey in backupPrefs.preferences) {
            // 过程个性化的目录设置
            if (pkey.search(/dir|path|folder/i) > 0) {
              ztoolkit.log(pkey);
              ztoolkit.log(backupPrefs.preferences[pkey]);
              let isExists = false;
              try {
                isExists = await IOUtils.exists(backupPrefs.preferences[pkey]);
              } catch (e) {
                ztoolkit.log(
                  `Is not a path ${pkey}:${backupPrefs.preferences[pkey]}`,
                );
              }
              if (!isExists) continue;
            }
            if (backupPrefs.preferences[pkey]) {
              Zotero.Prefs.set(
                pkey.replace(/^extensions\.zotero\./, ""),
                backupPrefs.preferences[pkey],
              );
            }
          }
          break;
      }
      addon.data.progress.updateProgressWindow(task, true);
    } catch (e) {
      ztoolkit.log(e);
      success = false;
      addon.data.progress.queue = [];
      addon.data.progress.updateProgressWindow(task, false);
    }
  }
  let caution = "";
  if (
    Zotero.version.slice(0, 1) == "7" &&
    backupZoteroVersion.slice(0, 1) == "6"
  )
    caution = getString("version-update-msg");
  addon.data.progress.completeProgressWindow(
    success,
    success ? getString("restore-success") : getString("restore-fail"),
    success
      ? getString("restore-success-msg") + caution
      : getString("restore-fail-msg"),
  );
}
