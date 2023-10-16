import { config } from "../../package.json";
import { getString } from "../utils/locale";

export class UI {
  static registerToolsMenu() {
    const iconbase: string = `chrome://${config.addonRef}/content/icons`;
    ztoolkit.Menu.register("menuTools", {
      tag: "menuseparator",
    });

    ztoolkit.Menu.register("menuTools", {
      tag: "menu",
      label: getString("menuitem-tara"),
      icon: iconbase + "/tara_icon.png",
      children: [
        {
          tag: "menuitem",
          label: getString("menuitem-create"),
          icon: `${iconbase}/create_icon.png`,
          oncommand: "alert('create');",
        },
        {
          tag: "menuitem",
          label: getString("menuitem-export"),
          icon: `${iconbase}/export_icon.png`,
          oncommand: "alert('export');",
        },
        {
          tag: "menuitem",
          label: getString("menuitem-import"),
          icon: `${iconbase}/import_icon.png`,
          oncommand: "alert('import');",
        },
        {
          tag: "menuitem",
          label: getString("menuitem-restore"),
          icon: `${iconbase}/restore_icon.png`,
          oncommand: "alert('restore');",
        },
      ],
    });
  }

  static registerToolbarMenu() {
    const doc = ztoolkit.getGlobal("document");
    const tool_button = ztoolkit.UI.createElement(doc, "toolbarbutton", {
      id: "zotero-tb-tara",
      classList: ["zotero-tb-button"],
      attributes: {
        type: "menu",
        tooltiptext: "Tara",
        style:
          "list-style-image: url('chrome://tara/content/icons/tara_icon.png');",
      },
    });

    const menupopup = ztoolkit.UI.createElement(doc, "menupopup", {
      children: [
        {
          tag: "menuitem",
          attributes: {
            id: "zotero-tb-tara-create-backup",
            label: getString("toolbar-create"),
            class: "menuitem-iconic",
            style:
              "list-style-image: url('chrome://tara/content/icons/create_icon.png');",
            oncommand: "alert('create');",
          },
        },
        {
          tag: "menuitem",
          attributes: {
            id: "zotero-tb-tara-export-backup",
            label: getString("toolbar-export"),
            class: "menuitem-iconic",
            style:
              "list-style-image: url('chrome://tara/content/icons/export_icon.png');",
          },
        },
        {
          tag: "menuitem",
          attributes: {
            id: "zotero-tb-tara-import-backup",
            label: getString("toolbar-import"),
            class: "menuitem-iconic",
            style:
              "list-style-image: url('chrome://tara/content/icons/import_icon.png');",
          },
        },
        {
          tag: "menuitem",
          attributes: {
            id: "zotero-tb-tara-restore-backup",
            label: getString("toolbar-restore"),
            class: "menuitem-iconic",
            style:
              "list-style-image: url('chrome://tara/content/icons/restore_icon.png');",
          },
        },
      ],
    });

    tool_button.appendChild(menupopup);
    doc.querySelector("#zotero-collections-toolbar")?.appendChild(tool_button);
  }
}

export default class Progress {
  constructor() {}

  getProgress(progress: number, total: number): string {
    return ((1 - progress / total) * 100).toString();
  }

  async openProgressWindow(header = null) {
    ztoolkit.log("open progress window");
    const win = Services.wm.getMostRecentWindow("navigator:browser");
    let progressWindow: Window | undefined;
    if (win) {
      progressWindow = win.openDialog(
        "chrome://tara/content/progress.html",
        "",
        "chrome,close=yes,resizable=yes,dependent,dialog,centerscreen,height=260,width=380",
        { header: header },
      );
    } else {
      progressWindow = Services.ww.openWindow(
        null,
        "chrome://tara/content/progress.html",
        "",
        "chrome,close=yes,resizable=yes,dependent,dialog,centerscreen,height=260,width=380",
        { header: header },
      );
    }
    // Reset progressWindow when progres window is closed.
    // For window click close in an element
    (progressWindow as Window).onbeforeunload = (e) => {
      progressWindow = undefined;
      const queue = [];
    };
    // For close button in header bar
    progressWindow.onclose = (e) => {
      progressWindow = undefined;
      queue = [];
    };
    let t = 0;
    // Wait for window
    while (t < 500 && progressWindow.document.readyState !== "complete") {
      await zotero.Promise.delay(10);
      t += 1;
      zotero.debug("** Tara wait ");
    }
  }
}
