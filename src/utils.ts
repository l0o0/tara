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
            "name",
            "description",
            "isActive",
            "userDisabled",
            "spec"
        ];
        let wordPlugins: Array<string> = [
            'zoteroOpenOfficeIntegration@zotero.org',
            'zoteroWinWordIntegration@zotero.org'
        ];

        let windows = Services.wm.getEnumerator('navigator:browser');
        var addonManager: any;
        while (windows.hasMoreElements()) {
            let tmpWin = windows.getNext();
            addonManager = tmpWin.AddonManager;
        }
        let infos: Array<any> = await addonManager.getAllAddons();

        infos = infos.filter(e => e.type == 'extension' &&
            !(wordPlugins.includes(e.id))
        );

        let filteredInfos: Array<any> = infos.map(function (e) {
            var out = { 'filePath': e.sourceURI.spec };
            let tmp = out.filePath.split(/[\/\\]/)
            out['fileName'] = tmp[tmp.length - 1];
            out = keepKeys.reduce(
                (p, c) => { p[c] = e[c]; return p },
                out);
            return out;
        });
        return filteredInfos;
    }

    public async getBackupInfos() {
        let addonInfos = await this.getAddonInfos();
        let prefsInfos = await this.getFilteredPrefs();
        return {
            "preferences": prefsInfos,
            "addons" : addonInfos
        }
    }


}

export default Utils;