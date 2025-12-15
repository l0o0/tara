import { FilePickerHelper } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { setPref, getPref } from "../utils/prefs";

// Init complex preference value
export function initPrefs() {
  if (!getPref("exportDir"))
    setPref(
      "exportDir",
      PathUtils.join(Zotero.Prefs.get("dataDir") as string, "Tara"),
    );
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
    };
  } else {
    addon.data.prefs.window = _window;
  }
  // updatePrefsUI();
  bindPrefEvents();
}

// async function updatePrefsUI() {
//   // You can initialize some UI elements on prefs window
//   // with addon.data.prefs.window.document
//   // Or bind some events to the elements
//   const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
//   if (addon.data.prefs?.window == undefined) return;

//   await renderLock.promise;
//   ztoolkit.log("Preference table rendered!");
// }

function bindPrefEvents() {
  addon.data
    .prefs!.window.document.querySelector("#tara-choose-folder-button")
    ?.addEventListener("click", async (e) => {
      const f = await new FilePickerHelper(
        getString("choose-exportDir"),
        "folder",
      ).open();
      ztoolkit.log(f);
      ztoolkit.log(`${config.prefsPrefix}.exportDir`);
      if (f) {
        setPref("exportDir", f);
      }
    });
}
