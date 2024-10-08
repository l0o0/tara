import { config } from "../../package.json";
import { getString } from "../utils/locale";

export class BasicExampleFactory {
  // static exampleNotifierCallback() {
  //   new ztoolkit.ProgressWindow(config.addonName)
  //     .createLine({
  //       text: "Open Tab Detected!",
  //       type: "success",
  //       progress: 100,
  //     })
  //     .show();
  // }

  static registerPrefs() {
    const prefOptions = {
      pluginID: config.addonID,
      src: rootURI + "chrome/content/preferences.xhtml",
      label: getString("prefs-title"),
      image: `chrome://${config.addonRef}/content/icons/tara.png`,
      defaultXUL: true,
    };
    Zotero.PreferencePanes.register(prefOptions);
  }
}
