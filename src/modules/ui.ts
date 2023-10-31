import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  createBackupAsAttachment,
  exportBackup,
  importFromBackup,
  restoreFromBackup,
} from "./backup";

export class UI {
  static registerToolsMenu() {
    const iconbase: string = `chrome://${config.addonRef}/content/icons`;
    ztoolkit.Menu.register("menuTools", {
      tag: "menuseparator",
    });

    ztoolkit.Menu.register("menuTools", {
      tag: "menu",
      label: getString("menuitem"),
      icon: iconbase + "/tara_icon.png",
      children: [
        {
          tag: "menuitem",
          label: getString("toolbar-create"),
          icon: `${iconbase}/create_icon.png`,
          commandListener: () => {
            createBackupAsAttachment();
          },
        },
        {
          tag: "menuitem",
          label: getString("toolbar-export"),
          icon: `${iconbase}/export_icon.png`,
          commandListener: () => exportBackup(),
        },
        {
          tag: "menuitem",
          label: getString("toolbar-import"),
          icon: `${iconbase}/import_icon.png`,
          commandListener: () => importFromBackup(),
        },
        {
          tag: "menuitem",
          label: getString("toolbar-restore"),
          icon: `${iconbase}/restore_icon.png`,
          commandListener: () => restoreFromBackup(),
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
  public queue?: Array<string> = [];
  public totalTasks?: number;
  public progressWindow?: Window;
  public selectionWindow?: Window;
  private tickIcon: string;
  private crossIcon: string;

  constructor() {
    this.tickIcon = "chrome://zotero/skin/tick.png";
    this.crossIcon = "chrome://zotero/skin/cross.png";
  }

  getProgress(progress: number, total: number): string {
    return ((1 - progress / total) * 100).toString();
  }

  async openWindow(html: string, chromeargs: string, io: any) {
    ztoolkit.log("open window ${io.header}");
    const win = Services.wm.getMostRecentWindow("navigator:browser");

    if (win) {
      return win.openDialog(html, "", chromeargs, io);
    } else {
      return Services.ww.openWindow(html, "", chromeargs, io);
    }
  }

  async openProgressWindow(io: any) {
    this.progressWindow = await this.openWindow(
      "chrome://tara/content/progress.html",
      "chrome,close=yes,resizable=no,dependent,dialog,centerscreen,height=290,width=380",
      io,
    );
    // Reset progressWindow when progres window is closed.
    // For window click close in an element
    this.progressWindow!.onbeforeunload = (e) => {
      this.progressWindow = undefined;
      this.queue = [];
    };
    // For close button in header bar
    this.progressWindow!.onclose = (e) => {
      this.progressWindow = undefined;
      this.queue = [];
    };
    let t = 0;
    // Wait for window
    while (t < 500 && this.progressWindow!.document.readyState !== "complete") {
      await ztoolkit.getGlobal("Zotero").Promise.delay(10);
      t += 1;
      ztoolkit.log("** Tara wait ");
    }
  }

  updateProgressWindow(row: string, status: boolean): void {
    if (!this.progressWindow) return;
    const doc = this.progressWindow.document;
    const ele = doc.createElement("li");
    ele.setAttribute("id", row);
    let innerHTML: string;
    if (status) {
      innerHTML = `<img src="${this.tickIcon}"> ${getString(row)}`;
      const value = `${(1 - this.queue!.length / this.totalTasks!) * 100}`;
      ztoolkit.log(
        `Progress ${value}, ${this.queue!.length} / ${this.totalTasks!}`,
      );
      doc.querySelector("#progress")!.setAttribute("value", value);
    } else {
      innerHTML = `<img src="${this.crossIcon}"> ${getString(row)}`;
    }
    ele.innerHTML = innerHTML;
    doc.querySelector("#listbox")!.appendChild(ele);
  }

  completeProgressWindow(isExport: boolean, msg: string = "") {
    if (!this.progressWindow) return;
    const doc = this.progressWindow.document;
    doc.querySelector("#progress")!.setAttribute("value", "100");
    doc.querySelector("#button1")!.textContent = "OK";
    if (isExport) {
      doc.querySelector("#msg")!.textContent = msg;
    } else {
      doc.querySelector('id="status')!.textContent = getString("finish");
      doc.querySelector("#msg")!.textContent = msg
        ? msg
        : getString("complete-msg");
    }
  }

  async openSelectWindow(io: any) {
    ztoolkit.log("** Tara open select window ");
    this.selectionWindow = await this.openWindow(
      "chrome://tara/content/select.html",
      "chrome,close=yes,resizable=yes,dependent,dialog,centerscreen,height=300,width=410",
      io,
    );
  }
}
