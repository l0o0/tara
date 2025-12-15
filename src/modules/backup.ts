import { FilePickerHelper } from "zotero-plugin-toolkit";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  copyDirectory,
  findBackupItem,
  pathjoin,
  removeDirectory,
  unzipToTemporaryDir,
  zipDirectory,
} from "../utils/tools";

import { version } from "../../package.json";

// @ts-ignore
const { AddonManager } = ChromeUtils.import(
  "resource://gre/modules/AddonManager.jsm",
);

interface AddonInfo {
  id: string;
  userDisabled: boolean;
  version: string;
}

// TODO: Add user customed preferences
const DropPrefs: Array<string> = [
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

export function getQueue() {
  const qPrefs = [
    "keepPrefs",
    "keepAddons",
    "keepStyles",
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

export async function createBackupItem() {
  const itemID = await findBackupItem();
  if (itemID && Zotero.Items.get(itemID as number)) {
    ztoolkit.log("备份条目已存在，不必创建新条目");
    return;
  } else {
    // Create Docuement Item for store backup zip file.
    const item = new Zotero.Item("document");
    item.setField("title", "Tara_Backup");
    const itemID = (await item.saveTx()) as number;
    setPref("itemID", itemID);
  }
  ztoolkit.log(`found backup itemid: ${getPref("itemID")}`);
}

export function getPrefsPath(): string {
  const profileDir = Zotero.Profile.dir;
  return PathUtils.join(profileDir, "prefs.js");
}

export async function readPrefsFromFile() {
  const prefsFile: string = getPrefsPath();
  return await Zotero.Profile.readPrefsFromFile(prefsFile);
}

// Only user modified prefs will be kept
function getPrefInfos(filter = false) {
  const rootBranch = ztoolkit.getGlobal("Zotero").Prefs
    .rootBranch as rootBranch;
  let prefsKey: string[] = rootBranch
    .getChildList("extensions.")
    .filter((p: string) => rootBranch.prefHasUserValue(p));
  if (filter) {
    prefsKey = prefsKey.filter((p) => !DropPrefs.includes(p));
  }
  return prefsKey.reduce((a: any, c: string) => {
    a[c] = Zotero.Prefs.get(c, true);
    return a;
  }, {});
}

export async function getAddonInfos() {
  const wordPluginIDs = [
    "ZoteroOpenOfficeIntegration@Zotero.org",
    "ZoteroWinWordIntegration@Zotero.org",
    "tara@linxzh.com",
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
  const info: any = {
    createTime: new Date().toISOString(),
    ZoteroVersion: Zotero.version,
    taraVersion: version,
    meta: {},
  };
  if (getPref("keepAddons")) {
    const addonInfos = await getAddonInfos();
    info.meta.addonNum = addonInfos.length;
    info.addons = addonInfos;
  }
  if (getPref("keepPrefs")) {
    const prefsInfos = getPrefInfos(true);
    info.meta.prefNum = Object.keys(prefsInfos).length;
    info.preferences = prefsInfos;
  }
  if (getPref("keepStyles")) {
    const cslInfos = getStyleInfos();
    info.meta.cslNum = Object.keys(cslInfos).length;
    info.styles = cslInfos;
  }
  if (getPref("keepTranslators")) {
    const tInfos = await getTranslatorInfos();
    info.meta.tNum = tInfos.length;
    info.translators = tInfos;
  }
  return info;
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
    removeDirectory(cacheTmp.path);
  }
  cacheTmp.append(zipFilename);
  if (cacheTmp.exists()) {
    cacheTmp.remove(false);
  }
  // Create backup item
  await createBackupItem();
  const outDir = PathUtils.join(tmpDir, "Backup");
  await IOUtils.makeDirectory(outDir);
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
    // ztoolkit.log(addon.data.progress.queue);
    try {
      switch (task) {
        case "keepPrefs": {
          backupInfos = await getBackupInfos();
          // Save preference
          const pf = PathUtils.join(outDir, "backup.json");
          ztoolkit.log(pf);
          await IOUtils.writeJSON(pf, backupInfos);
          break;
        }
        case "keepAddons":
          s = PathUtils.join(profileDir, "extensions");
          await IOUtils.copy(s, outDir, { recursive: true });
          break;
        case "keepStyles":
        case "keepTranslators":
        case "keepLocate":
          s = PathUtils.join(dataDir, task.substring(4).toLowerCase());
          t = PathUtils.join(outDir, task.substring(4).toLowerCase());
          if (await IOUtils.exists(s))
            await IOUtils.copy(s, t, { recursive: true });
          break;
        case "createZIP": {
          ztoolkit.log(saveDir);
          ztoolkit.log(outDir);
          await zipDirectory(outDir, PathUtils.join(saveDir, zipFilename));
          break;
        }
        case "importAttachment": {
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
          await IOUtils.remove(
            PathUtils.join(getPref("exportDir") as string, "tara.xpi"),
          );
          if (
            await IOUtils.exists(
              pathjoin(profileDir, ["extensions", "tara@linxzh.com.xpi"]),
            )
          ) {
            await IOUtils.copy(
              pathjoin(profileDir, ["extensions", "tara@linxzh.com.xpi"]),
              PathUtils.join(getPref("exportDir") as string, "tara.xpi"),
            );
          }
          break;
      }
      ztoolkit.log("complete task " + task);

      addon.data.progress.updateProgressWindow(getString(task), true);
    } catch (e) {
      ztoolkit.log(e);
      success = false;
      addon.data.progress.updateProgressWindow(getString(task), false);
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
  ztoolkit.log("** Tara start export backup");
  addon.data.progress.queue = getQueue().concat(["createZIP", "keepTaraXPI"]);
  addon.data.progress.totalTasks = addon.data.progress.queue.length;
  await createBackupFile(true);
  ztoolkit.log("** Tara finish export backup");
}

export async function importFromBackup() {
  // Import from an export backup zip
  const filename = await new FilePickerHelper(
    getString("select-backup-file"),
    "open",
    [[`${getString("zip-file")}(*.zip)"`, "*.zip"]],
  ).open();

  if (!filename) return;

  await restoreFromFile(filename);
}

export async function restoreFromBackup() {
  const backupItemID = await findBackupItem();
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
    ztoolkit.log("** Tara select promise");
    ztoolkit.log(io["attachment"]);
    // No item selected in selection window
    if (!io["attachment"]) return;
    attachment = Zotero.Items.get(files[io["attachment"]] as number);
    await restoreFromFile(attachment!.getFilePath() as string);
  } else {
    await addon.data.progress.openProgressWindow({
      header: getString("restore-header"),
    });
    await addon.data.progress.completeProgressWindow(
      false,
      getString("missing-backup-item-header"),
      "",
      getString("missing-backup-item-body"),
    );
  }
}

export async function restoreFromFile(filename: string) {
  const cacheTmp = Zotero.getTempDirectory();
  cacheTmp.append("Backup");
  if (cacheTmp.exists()) {
    removeDirectory(cacheTmp.path);
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
  const retest = new RegExp("dir|path|folder", "i");
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
          backupPrefs = await IOUtils.readJSON(backupPrefsPath);
          for (const addon of backupPrefs.addons) {
            ztoolkit.log(`install addon ${addon.id} ${addon.userDisabled}`);

            if (addon.id == "tara@linxzh.com" || !addon.id) continue;

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
        case "keepStyles":
        case "keepTranslators":
          ztoolkit.log("restore task " + task);
          s = PathUtils.join(tmpDir, task.substring(4).toLowerCase());
          t = PathUtils.join(dataDir, task.substring(4).toLowerCase());
          if (await IOUtils.exists(s)) {
            ztoolkit.log(s + " " + t);
            await copyDirectory(s, t);
          } else {
            ztoolkit.log("missing source folder: " + task);
          }
          break;
        case "keepLocate":
          ztoolkit.log("restore locate");
          s = PathUtils.join(tmpDir, "locate");
          t = PathUtils.join(dataDir, "locate");
          if (await IOUtils.exists(s)) {
            await Zotero.File.iterateDirectory(s, async function (entry: any) {
              if (entry.name === "engines.json") {
                const enginesBackup = await IOUtils.readJSON(
                  PathUtils.join(s, entry.name),
                );
                const engines = await IOUtils.readJSON(
                  PathUtils.join(t, entry.name),
                );
                const engineNames = engines.map((e: any) => e._name);
                enginesBackup.forEach((e: any) => {
                  if (!engineNames.includes(e._name)) {
                    engines.push(e);
                  }
                });
                await IOUtils.writeJSON(PathUtils.join(t, entry.name), engines);
              } else {
                await IOUtils.copy(
                  PathUtils.join(s, entry.name),
                  PathUtils.join(t, entry.name),
                );
              }
            });
          } else {
            ztoolkit.log("missing source locate folder");
          }
          break;
        case "keepPrefs":
          ztoolkit.log("restore preferences");
          backupPrefs = await IOUtils.readJSON(backupPrefsPath);
          backupZoteroVersion = backupPrefs.ZoteroVersion || "6.xxxx";
          for (const pkey in backupPrefs.preferences) {
            // 过程个性化的目录设置，避免异常的设置值
            if (DropPrefs.includes(pkey)) continue;

            if (
              retest.test(pkey) &&
              typeof backupPrefs.preferences[pkey] == "string"
            ) {
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
                pkey,
                backupPrefs.preferences[pkey],
                true, // All preferences are set in global.
              );
            }
          }
          break;
      }
      addon.data.progress.updateProgressWindow(getString(task), true);
    } catch (e) {
      ztoolkit.log(e);
      success = false;
      addon.data.progress.queue = [];
      addon.data.progress.updateProgressWindow(getString(task), false);
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
      ? getString("restore-success-msg") + "<br />" + caution
      : getString("restore-fail-msg"),
  );
}
