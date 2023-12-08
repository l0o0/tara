import { zip } from "compressing";
import { Addon } from "./addon";
import AddonModule from "./module";
import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker";
import ZoteroToolkit from "zotero-plugin-toolkit";

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/AddonManager.jsm");

class Utils extends AddonModule {
    constructor(parent: Addon) {
        super(parent);
    }

    public async createBackupItem() {
        // Search the exsiting Backup Item.
        var s = new this._Addon._Zotero.Search();
        s.addCondition('title', 'is', 'Tara_Backup');
        var itemID = await s.search();
        if (itemID.length) {
            // Use the first item returned.
            this._Addon._Zotero.Prefs.set("tara.itemID", itemID[0]);
        }
        else {
            // Create Docuement Item for store backup zip file.
            let item = new this._Addon._Zotero.Item("document");
            item.setField("title", "Tara_Backup");
            let itemID = await item.saveTx();
            this._Addon._Zotero.Prefs.set("tara.itemID", itemID);
        }
    }

    public getPrefsPath() {
        let profileDir: string = this._Addon._Zotero.Profile.dir;
        return OS.Path.join(profileDir, "prefs.js");
    }

    public async readPrefsFromFile() {
        let prefsFile: string = this.getPrefsPath();
        let prefs: Map<string, any> =
            await this._Addon._Zotero.Profile.readPrefsFromFile(prefsFile);
        return prefs;
    }

    public async getFilteredPrefs() {
        let prefs: Map<string, any> = await this.readPrefsFromFile();
        let dropPrefs: Array<string> = [
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

        for (let p in prefs) {
            if (p in dropPrefs) {
                prefs.delete(p);
            }
        }
        return prefs;
    }

    public getProgress(p: number, total: number): string {
        let pvalue: string = ((1 - p / total) * 100).toString();
        return parseInt(pvalue).toString();
    }

    public async getAddonInfos() {
        let keepKeys: Array<string> = ["id", "userDisabled", "path"];
        let wordPlugins: Array<string> = [
            "zoteroOpenOfficeIntegration@zotero.org",
            "zoteroWinWordIntegration@zotero.org",
        ];

        // Sometimes will throw Error: [JavaScript Error: "addon.getResourceURI is not a function"
        // {file: "chrome://zotero/content/xpcom/prefs.js" line: 439}]
        // let windows = Services.wm.getEnumerator('navigator:browser');
        // var addonManager: any;
        // while (windows.hasMoreElements()) {
        //     let tmpWin = windows.getNext();
        //     addonManager = tmpWin.AddonManager;
        // }
        // let infos: Array<any> = await addonManager.getAllAddons();
        let extensions = OS.Path.join(
            this._Addon._Zotero.Profile.dir,
            "extensions.json"
        );
        let extensionsContents = await this._Addon._Zotero.File.getContentsAsync(
            this._Addon._Zotero.File.pathToFile(extensions)
        );
        let extensionsInfo = JSON.parse(extensionsContents);

        let infos = extensionsInfo["addons"];

        infos = infos.filter(
            (e) => e.type == "extension" && !wordPlugins.includes(e.id)
        );

        let filteredInfos = infos.map(function (e) {
            var out = { name: e.defaultLocale.name };
            out = keepKeys.reduce((p, c) => {
                p[c] = e[c];
                return p;
            }, out);
            return out;
        });
        return filteredInfos;
    }

    public getStyleInfos(): Map<string, any> {
        return this._Addon._Zotero.Styles.getAll();
    }

    /** Tara
     * Get translator basic info for backup.
     * @returns Array of translator info map.
     */
    public async getTranslatorInfos() {
        var infos = await this._Addon._Zotero.Translators.getAll();
        let keepKeys = ["translatorID", "path", "fileName"];
        let filteredInfos = infos.map(function (e) {
            return keepKeys.reduce((p, c) => {
                p[c] = e[c];
                return p;
            }, {});
        });
        return filteredInfos;
    }

    public async getBackupInfos() {
        let addonInfos = await this.getAddonInfos();
        let prefsInfos = await this.getFilteredPrefs();
        let cslInfos = this.getStyleInfos();
        let tInfos = await this.getTranslatorInfos();
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

    public async createBackupZIP(isExport = false) {
        await this._Addon.views.openProgressWindow(this._Addon.locale.getString("backup.header"));
        // Create a temporary folder. Data in backup folder
        let cacheTmp = this._Addon._Zotero.getTempDirectory();
        const tmpDir = cacheTmp.path;
        const zipFilename = `${new Date().toLocaleString()}_backup.zip`.replace(/[\s\/:]/g, '_');
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
        await this.createBackupItem();
        const outDir = OS.Path.join(tmpDir, "Backup");
        await this._Addon._Zotero.File.createDirectoryIfMissingAsync(outDir);
        const profileDir: string = this._Addon._Zotero.Profile.dir;
        const dataDir: string = this._Addon._Zotero.Prefs.get("dataDir");
        var backupInfos;
        var s: string, t: string;
        const totalTasks: number = this._Addon.views.queue.length;
        this._Addon._Zotero.debug(`** Tara ${totalTasks}`);
        let completeStatus = true;
        while (this._Addon.views.queue.length > 0) {
            let task = this._Addon.views.queue.shift();
            try {
                if (task == "preferences") {
                    this._Addon._Zotero.debug("** Tara preferences");
                    backupInfos = await this.getBackupInfos();
                    let backupInfosText = JSON.stringify(backupInfos);
                    // Save preference
                    let pf = OS.Path.join(outDir, "backup.json");
                    this._Addon._Zotero.File.putContents(
                        this._Addon._Zotero.File.pathToFile(pf),
                        backupInfosText
                    );
                } else if (task == "addons") {
                    this._Addon._Zotero.debug("** Tara addons");
                    s = OS.Path.join(profileDir, "extensions");
                    t = OS.Path.join(outDir, "extensions");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == "styles") {
                    this._Addon._Zotero.debug("** Tara styles");
                    s = OS.Path.join(dataDir, "styles");
                    t = OS.Path.join(outDir, "styles");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == "translators") {
                    this._Addon._Zotero.debug("** Tara translators");
                    s = OS.Path.join(dataDir, "translators");
                    t = OS.Path.join(outDir, "translators");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == "locate") {
                    this._Addon._Zotero.debug("** Tara locate");
                    s = OS.Path.join(dataDir, "locate");
                    t = OS.Path.join(outDir, "locate");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == "createZIP") {
                    this._Addon._Zotero.debug("** Tara createZIP");
                    let saveDir = isExport
                        ? this._Addon._Zotero.Prefs.get("tara.exportDir")
                        : tmpDir;
                    await this._Addon._Zotero.File.zipDirectory(
                        outDir,
                        OS.Path.join(saveDir, zipFilename)
                    );
                } else if (task == "importAttachment") {
                    this._Addon._Zotero.debug("** Tara importAttachment");
                    let zipfile: string = OS.Path.join(
                        this._Addon._Zotero.Prefs.get("dataDir"),
                        "tmp",
                        zipFilename
                    );
                    let item = this._Addon._Zotero.Items.get(
                        this._Addon._Zotero.Prefs.get("tara.itemID")
                    );
                    let timeString = new Date().toLocaleString();
                    let importOptions = {
                        file: zipfile,
                        title: timeString + "_backup.zip",
                        parentItemID: item.id,
                    };
                    await this._Addon._Zotero.Attachments.importFromFile(
                        importOptions
                    );
                } else if (task == "keepTaraXPI") {
                    this._Addon._Zotero.debug("** Tara keepTaraXPI");
                    await this._Addon._Zotero.File.copyToUnique(
                        OS.Path.join(
                            profileDir,
                            "extensions",
                            "tara@linxzh.com.xpi"
                        ),
                        OS.Path.join(this._Addon._Zotero.Prefs.get("tara.exportDir"), "tara.xpi")
                    );
                }
                let pvalue = this.getProgress(this._Addon.views.queue.length, totalTasks)
                this._Addon.views.updateProgressWindow(task, true, pvalue);
            } catch (e) {
                completeStatus = false;
                this._Addon.views.updateProgressWindow(task, false);
            }
        }
        const msg = completeStatus ? OS.Path.join(this._Addon._Zotero.Prefs.get("dataDir"), 'Backup') : this._Addon.locale.getString("backup.error.msg");
        this._Addon.views.completeProgressWindow(msg);
        this._Addon._Zotero.debug("Create backup zip complete");
    }

    public async createBackupAsAttachment() {
        this._Addon._Zotero.debug("** Tara start create Backup As Attachment");

        // Backup parts in a queue
        let queue = {
            preferences: this._Addon._Zotero.Prefs.get("tara.keepPrefs"),
            addons: this._Addon._Zotero.Prefs.get("tara.keepAddon"),
            styles: this._Addon._Zotero.Prefs.get("tara.keepCSLs"),
            translators: this._Addon._Zotero.Prefs.get("tara.keepTranslators"),
            createZIP: true,
            importAttachment: true,
        };
        this._Addon.views.queue = Object.keys(queue).filter((k) => queue[k]);
        await this.createBackupZIP();
        this._Addon._Zotero.debug("** Tara finish create Backup As Attachment");
    }

    public async exportBackup() {
        this._Addon._Zotero.debug("** Tara start export backup");
        let queue = {
            preferences: this._Addon._Zotero.Prefs.get("tara.keepPrefs"),
            addons: this._Addon._Zotero.Prefs.get("tara.keepAddon"),
            styles: this._Addon._Zotero.Prefs.get("tara.keepCSLs"),
            translators: this._Addon._Zotero.Prefs.get("tara.keepTranslators"),
            createZIP: true,
            keepTaraXPI: true,
        };
        this._Addon.views.queue = Object.keys(queue).filter((k) => queue[k]);
        await this.createBackupZIP(true);
        this._Addon._Zotero.debug("** Tara finish export backup");
    }

    public async unzipToTemporaryDir(filename: string, tmpDir: string) {
        this._Addon._Zotero.debug(tmpDir);
        await this._Addon._Zotero.File.createDirectoryIfMissingAsync(tmpDir, { unixMode: 0o777 });
        let zipFile = this._Addon._Zotero.File.pathToFile(filename);
        var zipReader = Components.classes[
            "@mozilla.org/libjar/zip-reader;1"
        ].createInstance(Components.interfaces.nsIZipReader);
        zipReader.open(zipFile);

        // ZIP 文件中目录后面是 /
        let folderEntries = zipReader.findEntries("*/$");
        let folders = [];
        while (folderEntries.hasMore()) {
            let entry = folderEntries.getNext();
            let folder = OS.Path.join(tmpDir, this._Addon._Zotero.isWin ? entry.replace(/\//g, "\\") : entry);
            this._Addon._Zotero.debug(folder);
            folders.push(folder);
        }
        folders.sort();// 对文件夹排序，避免缺失父目录造成的异常
        folders.forEach( async(e) => {await this._Addon._Zotero.File.createDirectoryIfMissingAsync(
            e, { unixMode: 0o777 }
        );})
        // Extract files
        let entries = zipReader.findEntries("*");
        while (entries.hasMore()) {
            let entry = entries.getNext();
            if (entry.endsWith("\/")) {
                this._Addon._Zotero.debug("Pass folder: " + entry);
                continue;
            }
            // 注意：Win 与 Mac， Linux下压缩文件中的分隔符不同
            let destPath = OS.Path.join(tmpDir, ...entry.split(/[\/\\]/));
            this._Addon._Zotero.debug(entry);
            this._Addon._Zotero.debug(entry.split(/[\/\\]/));
            this._Addon._Zotero.debug(destPath);
            zipReader.extract(
                entry,
                this._Addon._Zotero.File.pathToFile(destPath)
            );
        }
        zipReader.close();
    }

    public async importFromBackup() {
        // Import from an export backup zip
        await this.createBackupItem();
        let backupItemID = this._Addon._Zotero.Prefs.get("tara.itemID");
        let zipfilename = await new FilePickerHelper(
            this._Addon.locale.getString("import.title"),
            "open",
            [["Zip File(*.zip)", "*.zip"]]
        ).open();
        if (zipfilename) {
            const importOptions = {
                file: zipfilename,
                title: OS.Path.basename(zipfilename),
                parentItemID: backupItemID,
            };
            let attachmentID = await this._Addon._Zotero.Attachments.importFromFile(
                importOptions
            );
            let attachment = this._Addon._Zotero.Items.get(attachmentID);
            this.restoreFromFile(attachment);
        }
    }

    public async restoreFromBackup() {
        await this.createBackupItem();
        let backupItemID = this._Addon._Zotero.Prefs.get("tara.itemID");
        var io = {
            title: this._Addon.locale.getString("select.title"),
            deferred: this._Addon._Zotero.Promise.defer(),
        };
        var attachment;
        if (backupItemID && this._Addon._Zotero.Items.get(backupItemID) && this._Addon._Zotero.Items.get(backupItemID).getAttachments()) {
            let backupItem = this._Addon._Zotero.Items.get(backupItemID);
            const attachmentIDs = backupItem.getAttachments();
            var files = {};
            attachmentIDs.reduce((p, r) => {
                p[this._Addon._Zotero.Items.get(r).getField("title")] = r;
                return p;
            }, files);
            io["items"] = Object.keys(files);
            io["items"].sort().reverse();
            this._Addon._Zotero.debug(io["items"]);
            this._Addon.views.openSelectWindow(io);
            await io.deferred.promise;
            this._Addon._Zotero.debug("** Tara select promise");
            this._Addon._Zotero.debug(io["attachment"]);
            // No item selected
            if (!io["attachment"]) return;
            attachment = this._Addon._Zotero.Items.get(files[io["attachment"]]);
        } 
        this.restoreFromFile(attachment);
    }

    public async restoreFromFile(attachment: _ZoteroItem) {
        let cacheTmp = this._Addon._Zotero.getTempDirectory();
        cacheTmp.append("Backup");
        if (cacheTmp.exists()) {
            cacheTmp.remove(true);
        }
        const tmpDir = cacheTmp.path;
        let queue = {
            unzip: true,
            addons: this._Addon._Zotero.Prefs.get("tara.keepAddon"),
            styles: this._Addon._Zotero.Prefs.get("tara.keepCSLs"),
            translators: this._Addon._Zotero.Prefs.get("tara.keepTranslators"),
            locate: this._Addon._Zotero.Prefs.get("tara.keepLocate"),
            preferences: this._Addon._Zotero.Prefs.get("tara.keepPrefs"),
        };
        this._Addon.views.queue = Object.keys(queue).filter((k) => queue[k]);
        this._Addon._Zotero.debug(this._Addon.views.queue);
        const totalTasks = this._Addon.views.queue;
        const dataDir: string =
                    this._Addon._Zotero.Prefs.get("dataDir");
        const profileDir: string = this._Addon._Zotero.Profile.dir;
        await this._Addon.views.openProgressWindow(this._Addon.locale.getString("restore.header"));
        let completeStatus = true;
        while (this._Addon.views.queue.length > 0) {
            let task = this._Addon.views.queue.shift();
            let s, t;
            try {
                if (task == 'unzip') {
                    await this.unzipToTemporaryDir(
                        attachment.getFilePath(),
                        tmpDir
                    );
                } else if (task == 'addons') {
                    const backupPrefsPath = OS.Path.join(tmpDir, "backup.json");
                    const backupPrefs = JSON.parse(
                       await this._Addon._Zotero.File.getContentsAsync(backupPrefsPath)
                    );
                    for (let addon of backupPrefs.addons) {
                        this._Addon._Zotero.debug(
                            `** Tara install addon ${addon.path}`
                        );
                        if (addon.path.endsWith(".xpi")) {
                            let xpi = OS.Path.join(
                                tmpDir,
                                "extensions",
                                addon.id + ".xpi"
                            );
                            let xpiFile = this._Addon._Zotero.File.pathToFile(xpi);
                            // If addon is installed, set userDisabled
                            AddonManager.getAddonByID(addon.id, function(a) {
                                if (a) {
                                    a.userDisabled = addon.userDisabled;
                                } else {
                                    AddonManager.getInstallForFile(
                                        xpiFile,
                                        (a) => a.install()
                                    );
                                }
                            });
                        } else {
                            let isExist = await OS.File.exists(addon.path);
                            if (isExist) {
                                let s = OS.Path.join(
                                    tmpDir,
                                    "extensions",
                                    addon.id
                                );
                                let t = OS.Path.join(
                                    profileDir,
                                    "extensions",
                                    addon.id
                                );
                                let tExists = await OS.File.exists(t);
                                if (!tExists) {
                                    await this._Addon._Zotero.File.copyToUnique(s, t);
                                }
                            } else {
                                this._Addon._Zotero.debug(
                                    `** Tara missing addon ${addon.path}`
                                );
                            }
                        }
                    }
                } else if (task == 'styles') {
                    s = OS.Path.join(tmpDir, "styles");
                    t = OS.Path.join(dataDir, "styles");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == 'translators') {
                    s = OS.Path.join(tmpDir, "translators");
                    t = OS.Path.join(dataDir, "translators");
                    await this._Addon._Zotero.File.copyDirectory(s, t);
                } else if (task == 'locate') {
                    s = OS.Path.join(tmpDir, "locate");
                    t = OS.Path.join(dataDir, "locate");
                    await this._Addon._Zotero.File.iterateDirectory(s, async function(entry) {
                        if (entry.name === 'engines.json') {
                            let contentsBackup = await this._Addon._Zotero.File.getContentsAsync(OS.Path.join(s, entry.name));
                            let enginesBackup = JSON.parse(contentsBackup);
                            let contents = await this._Addon._Zotero.File.getContentsAsync(OS.Path.join(t, entry.name));
                            let engines = JSON.parse(contents);
                            let allContents = enginesBackup.concat(engines);
                            await this._Addon._Zotero.File.putContentsAsync(
                                this._Addon._Zotero.File.pathToFile(OS.Path.join(t, entry.name)),
                                allContents
                            );
                        } else {
                            await this._Addon._Zotero.File.copyToUnique(
                                OS.Path.join(s, entry.name),
                                OS.Path.join(t, entry.name)
                            );
                        }
                    });
                } else if (task == 'preferences') {
                    const backupPrefsPath = OS.Path.join(tmpDir, "backup.json");
                    const backupPrefs = JSON.parse(
                        await this._Addon._Zotero.File.getContentsAsync(backupPrefsPath)
                    );
                    const retest = new RegExp("dir|path|folder", "i")
                    for (let pkey in backupPrefs.preferences) {
                        // 过滤非字符配置，导致文件判断异常
                        if (retest.test(pkey) && (typeof backupPrefs.preferences[pkey] == 'string')) {
                            let isExists = await OS.File.exists(
                                backupPrefs.preferences[pkey]
                            );
                            if (!isExists) continue;
                        }
                        this._Addon._Zotero.debug("set " + pkey + " " + backupPrefs.preferences[pkey]);
                        this._Addon._Zotero.Prefs.set(
                            pkey,
                            backupPrefs.preferences[pkey],
                            true
                        );
                    }
                }
                let pvalue = this.getProgress(this._Addon.views.queue.length, totalTasks)
                this._Addon.views.updateProgressWindow(task, true, pvalue);
            } catch (e) {
                if (task == 'unzip') { // 解压缩失败，后面就不需要执行了
                    this._Addon.views.queue = [];
                }
                completeStatus = false;
                this._Addon._Zotero.debug(e);
                this._Addon.views.updateProgressWindow(task, false);
            }
        }
        const msg = completeStatus ? this._Addon.locale.getString("restore.success.msg") : this._Addon.locale.getString("restore.error.msg");
        this._Addon.views.completeProgressWindow(msg, completeStatus);
    }
}

export default Utils;
