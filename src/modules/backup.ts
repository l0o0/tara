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
    "keepAddon",
    "keepCSLs",
    "keepTranslators",
    "keepLocate",
    "keepPrefs",
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
    "extensions.Zotero.dataDir",
    "extensions.Zotero.firstRun.skipFirefoxProfileAccessCheck",
    "extensions.Zotero.firstRun2",
    "extensions.Zotero.lastWebDAVOrphanPurge",
    "extensions.Zotero.prefVersion",
    "extensions.Zotero.scaffold.translatorsDir",
    "extensions.Zotero.sync.reminder.setUp.enabled",
    "extensions.Zotero.sync.reminder.setUp.lastDisplayed",
    "extensions.Zotero.sync.storage.verified",
    "extensions.Zotero.recentSaveTargets",
    "extensions.Zotero.lastViewedFolder", // Last viewd collection
    "extensions.Zotero.scaffold.translatorsDir",
    "extensions.Zotero.scaffold.eslint.enabled",
    "extensions.Zotero.tara.itemID",
  ];
  for (const p in prefs) {
    if (p in dropPrefs) {
      prefs.delete(p);
    }
  }
  return prefs;
}

export async function createBackupItem() {
  const itemID = Zotero.Prefs.get("tara.itemID");
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
  // await addon.data.progress.openProgressWindow(
  //   _Addon.locale.getString("backup.header"),
  // );
  // Create a temporary folder. Data in backup folder
  const cacheTmp = Zotero.getTempDirectory();
  const tmpDir = cacheTmp.path;
  const zipFilename = `${new Date().toLocaleString()}_backup.zip`.replace(
    /[\s/:]/g,
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
  await Zotero.File.createDirectoryIfMissingAsync(outDir);
  const profileDir: string = Zotero.Profile.dir;
  const dataDir: string = Zotero.Prefs.get("dataDir") as string;
  let backupInfos;
  let s: string, t: string;
  while (addon.data.progress.queue) {
    const task = addon.data.progress.queue?.shift();
    ztoolkit.log(task);
    continue;
    try {
      switch (task) {
        case "preferences": {
          Zotero.debug("** Tara preferences");
          backupInfos = await getBackupInfos();
          const backupInfosText = JSON.stringify(backupInfos);
          // Save preference
          const pf = PathUtils.join(outDir, "backup.json");
          await Zotero.File.putContentsAsync(
            Zotero.File.pathToFile(pf),
            backupInfosText,
          );
          break;
        }
        case "addons":
          Zotero.debug("** Tara addons");
          s = PathUtils.join(profileDir, "extensions");
          t = PathUtils.join(outDir, "extensions");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "styles":
          Zotero.debug("** Tara styles");
          s = PathUtils.join(dataDir, "styles");
          t = PathUtils.join(outDir, "styles");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "translators":
          Zotero.debug("** Tara translators");
          s = PathUtils.join(dataDir, "translators");
          t = PathUtils.join(outDir, "translators");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "locate":
          Zotero.debug("** Tara locate");
          s = PathUtils.join(dataDir, "locate");
          t = PathUtils.join(outDir, "locate");
          await Zotero.File.copyDirectory(s, t);
          break;
        case "createZIP": {
          Zotero.debug("** Tara createZIP");
          const saveDir = (
            isExport ? Zotero.Prefs.get("tara.exportDir") : tmpDir
          ) as string;
          await Zotero.File.zipDirectory(
            outDir,
            PathUtils.join(saveDir, zipFilename),
            null,
          );
          break;
        }
        case "importAttachment": {
          Zotero.debug("** Tara importAttachment");
          const zipfile = PathUtils.join(
            Zotero.Prefs.get("dataDir") as string,
            "tmp",
            zipFilename,
          );
          const item = Zotero.Items.get(
            Zotero.Prefs.get("tara.itemID") as number,
          );
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
          Zotero.debug("** Tara keepTaraXPI");
          await Zotero.File.copyToUnique(
            PathUtils.join(profileDir, "extensions", "tara@linxzh.com.xpi"),
            PathUtils.join(
              Zotero.Prefs.get("tara.exportDir") as string,
              "tara.xpi",
            ),
          );
          break;
      }
      addon.data.progress.updateProgressWindow(task, true);
    } catch (e) {
      addon.data.progress.updateProgressWindow(task, false);
    }
  }
  addon.data.progress.completeProgressWindow(isExport);
  Zotero.debug("Create backup zip complete");
}

export async function createBackupAsAttachment() {
  ztoolkit.log("**create Backup As Attachment");

  // init Progress queue
  addon.data.progress.queue = ["createZIP", "importAttachment"].concat(
    getQueue(),
  );
  addon.data.progress.totalTasks = addon.data.progress.queue.length;

  await createBackupFile();
  ztoolkit.log("** Tara Tara finish create Backup As Attachment");
}

export async function exportBackup() {
  Zotero.debug("** Tara Tara start export backup");
  let queue: any = {
    preferences: Zotero.Prefs.get("tara.keepPrefs"),
    addons: Zotero.Prefs.get("tara.keepAddon"),
    styles: Zotero.Prefs.get("tara.keepCSLs"),
    translators: Zotero.Prefs.get("tara.keepTranslators"),
    createZIP: true,
    keepTaraXPI: true,
  };
  queue = Object.keys(queue).filter((k) => queue[k]);
  await createBackupFile(true);
  Zotero.debug("** Tara Tara finish export backup");
}

export async function unzipToTemporaryDir(filename: string, tmpDir: string) {
  Zotero.debug(tmpDir);
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
    if (entry.substr(-1) === "/") {
      continue;
    }
    const destPath = PathUtils.join(tmpDir, ...entry.split(/\//));
    zipReader.extract(entry, Zotero.File.pathToFile(destPath));
  }
  zipReader.close();
}

export async function importFromBackup() {
  // Import from an export backup zip
  if (!Zotero.Prefs.get("tara.itemID")) {
    await createBackupItem();
  }
  const backupItemID = Zotero.Prefs.get("tara.itemID") as number;
  const ZoteroPane = Zotero.getActiveZoteroPane();
  await ZoteroPane.addAttachmentFromDialog(false, backupItemID);
  const attachmentID = Zotero.Items.get(backupItemID).getAttachments()[0];
  const attachment = Zotero.Items.get(attachmentID);
  await restoreFromFile(attachment);
}

export async function restoreFromBackup() {
  const backupItemID = Zotero.Prefs.get("tara.itemID") as number;
  const io: any = {
    title: getString("select.title"),
    deferred: Zotero.Promise.defer(),
  };
  let attachment;
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
    Zotero.debug(io["items"]);
    addon.data.progress.openSelectWindow(io);
    await io.deferred.promise;
    Zotero.debug("** Tara Tara select promise");
    Zotero.debug(io["attachment"]);
    // No item selected
    if (!io["attachment"]) return;
    attachment = Zotero.Items.get(files[io["attachment"]] as number);
  }
  await restoreFromFile(attachment!);
}

export async function restoreFromFile(attachment: Zotero.Item) {
  const cacheTmp = Zotero.getTempDirectory();
  cacheTmp.append("Backup");
  if (cacheTmp.exists()) {
    cacheTmp.remove(true);
  }
  const tmpDir = cacheTmp.path;
  const queue: any = {
    unzip: true,
    addons: Zotero.Prefs.get("tara.keepAddon"),
    styles: Zotero.Prefs.get("tara.keepCSLs"),
    translators: Zotero.Prefs.get("tara.keepTranslators"),
    locate: Zotero.Prefs.get("tara.keepLocate"),
    preferences: Zotero.Prefs.get("tara.keepPrefs"),
  };
  addon.data.progress.queue = Object.keys(queue).filter((k) => queue[k]);
  const totalTasks = addon.data.progress.queue;
  const dataDir = Zotero.Prefs.get("dataDir") as string;
  const profileDir: string = Zotero.Profile.dir;
  await addon.data.progress.openProgressWindow(getString("restore.header"));
  while (addon.data.progress.queue.length > 0) {
    const task = addon.data.progress.queue.shift();
    let s: any, t: any;
    try {
      if (task == "unzip") {
        await unzipToTemporaryDir(attachment.getFilePath() as string, tmpDir);
      } else if (task == "addons") {
        const backupPrefsPath = PathUtils.join(tmpDir, "backup.json");
        const backupPrefs = JSON.parse(
          (await Zotero.File.getContentsAsync(backupPrefsPath)) as string,
        );
        for (const addon of backupPrefs.addons) {
          ztoolkit.log(`** Tara Tara install addon ${addon.path}`);
          if (addon.path.endsWith(".xpi")) {
            const xpi = PathUtils.join(
              tmpDir,
              "extensions",
              PathUtils.filename(addon.path),
            );
            const xpiFile = Zotero.File.pathToFile(xpi);
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
                await Zotero.File.copyToUnique(s, t);
              }
            } else {
              Zotero.debug(`** Tara Tara missing addon ${addon.path}`);
            }
          }
        }
      } else if (task == "styles") {
        s = PathUtils.join(tmpDir, "styles");
        t = PathUtils.join(dataDir, "styles");
        await Zotero.File.copyDirectory(s, t);
      } else if (task == "translators") {
        s = PathUtils.join(tmpDir, "translators");
        t = PathUtils.join(dataDir, "translators");
        await Zotero.File.copyDirectory(s, t);
      } else if (task == "locate") {
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
            const allContents = enginesBackup.concat(engines);
            await Zotero.File.putContentsAsync(
              Zotero.File.pathToFile(PathUtils.join(t, entry.name)),
              allContents,
            );
          } else {
            await Zotero.File.copyToUnique(
              PathUtils.join(s, entry.name),
              PathUtils.join(t, entry.name),
            );
          }
        });
      } else if (task == "preferences") {
        const backupPrefsPath = PathUtils.join(tmpDir, "backup.json");
        const backupPrefs = JSON.parse(
          (await Zotero.File.getContentsAsync(backupPrefsPath)) as string,
        );
        for (let pkey in backupPrefs.preferences) {
          pkey = pkey.replace(/^extensions\./, "");
          if (pkey.search(/dir|path|folder/i)) {
            const isExists = await IOUtils.exists(
              backupPrefs.preferences[pkey],
            );
            if (!isExists) continue;
          }
          Zotero.Prefs.set(pkey, backupPrefs.preferences[pkey]);
        }
      }
      const pvalue = addon.data.progress.getProgress(
        addon.data.progress.queue.length,
        totalTasks,
      );
      addon.data.progress.updateProgressWindow(task, true, pvalue);
    } catch (e) {
      Zotero.debug(e);
      addon.data.progress.updateProgressWindow(task, false);
    }
  }
  addon.data.progress.completeProgressWindow(false, "restore.complete.msg");
}
