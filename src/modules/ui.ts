import { config } from "../../package.json";
import { getString } from "../utils/locale";
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
    this.tickIcon = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path fill="#4CAF50" d="m10.6 13.8l-2.15-2.15q-.275-.275-.7-.275t-.7.275t-.275.7t.275.7L9.9 15.9q.3.3.7.3t.7-.3l5.65-5.65q.275-.275.275-.7t-.275-.7t-.7-.275t-.7.275zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" />
</svg>`;
    this.crossIcon = `<svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
		<path fill="#F44336" d="M12 17q.425 0 .713-.288T13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17m0-4q.425 0 .713-.288T13 12V8q0-.425-.288-.712T12 7t-.712.288T11 8v4q0 .425.288.713T12 13m0 9q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8" />
	</svg>`;
  }

  getProgress(progress: number, total: number): string {
    return ((1 - progress / total) * 100).toString();
  }

  async openWindow(html: string, chromeargs: string, io: any) {
    ztoolkit.log(`open window ${io.header || "默认"}`);
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
      "chrome,close=yes,resizable=no,dependent,dialog,centerscreen,height=310,width=380",
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
      innerHTML = `${this.tickIcon} ${row}`;
      const value = `${(1 - this.queue!.length / this.totalTasks!) * 100}`;
      ztoolkit.log(
        `Progress ${value}, ${this.queue!.length} / ${this.totalTasks!}`,
      );
      doc.querySelector("#progress")!.setAttribute("value", value);
    } else {
      innerHTML = `${this.crossIcon} ${row}`;
    }
    ele.innerHTML = innerHTML;
    doc.querySelector("#listbox")!.appendChild(ele);
  }

  completeProgressWindow(
    status: boolean,
    headerMsg: string,
    footerMsg: string = "",
    bodyMsg: string = "",
  ) {
    if (!this.progressWindow) return;
    const doc = this.progressWindow.document;
    if (!status) doc.querySelector("#box")!.className = "blink_box";
    doc.querySelector("#progress")!.setAttribute("value", "100");
    doc.querySelector("#button1")!.textContent = "OK";
    doc.querySelector("#msg")!.innerHTML = footerMsg;
    doc.querySelector("#status")!.textContent = headerMsg;
    if (bodyMsg != "") {
      const p = doc.createElement("p");
      p.textContent = bodyMsg;
      const listbox = doc.getElementById("listbox") as HTMLElement;
      listbox.parentNode!.insertBefore(p, listbox.nextSibling);
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
