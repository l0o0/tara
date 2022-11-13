import { Addon } from "./addon";
import AddonModule from "./module";

Components.utils.import("resource://gre/modules/osfile.jsm");
Cu.import("resource://gre/modules/Services.jsm");

class Utils extends AddonModule {
    constructor(parent: Addon) {
        super(parent);
    }

    public getPrefsPath() {
        let profileDir: string = this._Addon._Zotero.Profile.dir;
        return OS.Path.join(profileDir, "prefs.js");
    }

    public getExtensionsPath() {
        let profileDir: string = this._Addon._Zotero.Profile.dir;
        return OS.Path.join(profileDir, "extensions");
    }

    public async readPrefsFromFile() {
        let prefsFile: string = this.getPrefsPath();
        let prefs: Map<string, any> = await this._Addon._Zotero.Profile.readPrefsFromFile(prefsFile);
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
            "extensions.zotero.lastViewedFolder"  // Last viewd collection
        ];

        for (let p in prefs) {
            if (p in dropPrefs) {
                prefs.delete(p);
            }
        }
        return prefs;
    }

    public async getAddonInfos() {
        let keepKeys: Array<string> = [
            'id',
            "userDisabled",
            "path"
        ];
        let wordPlugins: Array<string> = [
            'zoteroOpenOfficeIntegration@zotero.org',
            'zoteroWinWordIntegration@zotero.org'
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
        let extensions = OS.Path.join(this._Addon._Zotero.Profile.dir, "extensions.json");
        let extensionsContents = this._Addon._Zotero.File.getContents(this._Addon._Zotero.File.pathToFile(extensions));
        let extensionsInfo = JSON.parse(extensionsContents);
        
        let infos = extensionsInfo['addons'];

        infos = infos.filter(e => e.type == 'extension' &&
            !(wordPlugins.includes(e.id))
        );

        let filteredInfos = infos.map(function (e) {
            var out = {"name": e.defaultLocale.name};
            out = keepKeys.reduce(
                (p, c) => { p[c] = e[c]; return p },
                out);
            return out;
        });
        return filteredInfos;
    }

    public getStyleInfos(): Map<string, any> {
        return this._Addon._Zotero.Styles.getAll();
    }

    /**
     * Get translator basic info for backup.
     * @returns Array of translator info map.
     */
    public async getTranslatorInfos() {
        var infos =  await this._Addon._Zotero.Translators.getAll();
        let keepKeys = ["translatorID", "path", "fileName"];
        let filteredInfos = infos.map(function (e) {
            return keepKeys.reduce(
                (p, c) => {p[c] = e[c]; return p},
                {}
            )
        });
        return filteredInfos;
    }

    public async getBackupInfos() {
        let addonInfos = await this.getAddonInfos();
        let prefsInfos = await this.getFilteredPrefs();
        let cslInfos = this.getStyleInfos();
        let tInfos = await this.getTranslatorInfos();
        return {
            "createTime": (new Date()).toISOString(),
            "meta": {
                "prefNum": Object.keys(prefsInfos).length, 
                "addonNum": addonInfos.length, 
                "cslNum": Object.keys(cslInfos).length, 
                "tNum": tInfos.length},
            "preferences": prefsInfos,
            "addons" : addonInfos,
            "styles": cslInfos,
            "translators": tInfos
        }
    }


}

export default Utils;