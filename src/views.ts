import { Addon } from "./addon";
import AddonModule from "./module";
const { addonRef } = require("../package.json");

class AddonViews extends AddonModule {
    // You can store some element in the object attributes
    private tickIcon: string;
    private crossIcon: string;
    private progressWindow: any;
    private queue: Array<string>;

    constructor(parent: Addon) {
        super(parent);
        this.tickIcon = "chrome://zotero/skin/tick.png";
        this.crossIcon = "chrome://zotero/skin/cross.png";
        this.queue = [];
    }

    public initViews(_Zotero) {
        // You can init the UI elements that
        // cannot be initialized with overlay.xul
        console.log("Initializing UI");
        var _window: Window = _Zotero.getMainWindow();
        var tool_button = _window.document.createElement("toolbarbutton");
        var menupopup = _window.document.createElement("menupopup");
        var create_menu = _window.document.createElement("menuitem");
        var export_menu = _window.document.createElement("menuitem");
        var restore_menu = _window.document.createElement("menuitem");

        const createLabel = this._Addon.locale.getString("toolbar.create");
        const exportLabel = this._Addon.locale.getString("toolbar.export");
        const restoreLabel = this._Addon.locale.getString("toolbar.restore");

        create_menu.setAttribute("id", "zotero-tb-tara-create-backup");
        create_menu.setAttribute("label", createLabel);
        create_menu.setAttribute("class", "menuitem-iconic");
        create_menu.setAttribute(
            "style",
            "list-style-image: url('chrome://tara/skin/create_icon.png');"
        );
        create_menu.setAttribute(
            "oncommand",
            "Zotero.Tara.utils.createBackupAsAttachment();"
        );

        export_menu.setAttribute("id", "zotero-tb-tara-export-backup");
        export_menu.setAttribute("label", exportLabel);
        export_menu.setAttribute("class", "menuitem-iconic");
        export_menu.setAttribute(
            "style",
            "list-style-image: url('chrome://tara/skin/export_icon.png');"
        );
        export_menu.setAttribute(
            "oncommand",
            "Zotero.Tara.utils.createBackupZIP();"
        );

        restore_menu.setAttribute("id", "zotero-tb-tara-restore-backup");
        restore_menu.setAttribute("label", restoreLabel);
        restore_menu.setAttribute("class", "menuitem-iconic");
        restore_menu.setAttribute(
            "style",
            "list-style-image: url('chrome://tara/skin/restore_icon.png');"
        );
        restore_menu.setAttribute("oncommand", "alert('Restore');");

        menupopup.appendChild(create_menu);
        menupopup.appendChild(export_menu);
        menupopup.appendChild(restore_menu);

        tool_button.id = "zotero-tb-tara";
        tool_button.setAttribute("type", "menu");
        tool_button.className = "zotero-tb-button";
        tool_button.style["list-style-image"] =
            "url('chrome://tara/skin/tara_icon.png')";
        tool_button.appendChild(menupopup);
        _window.document
            .querySelector("#zotero-collections-toolbar")
            .appendChild(tool_button);
    }

    // Remove UI element when remove addon
    public unInitViews(_Zotero) {
        console.log("Uninitializing UI");
        const _window: Window = _Zotero.getMainWindow();
        _window.document.querySelector("#zotero-tb-tara")?.remove();
    }

    public async openProgressWindow() {
        this._Addon._Zotero.debug("** Tara open window ");
        let win = Services.wm.getMostRecentWindow("navigator:browser");
        if (win) {
            this.progressWindow = win.openDialog(
                "chrome://tara/content/progress.html",
                "",
                "chrome,close=yes,resizable=yes,dependent,dialog,centerscreen"
            );
        } else {
            this.progressWindow = Services.ww.openWindow(
                null,
                "chrome://tara/content/progress.html",
                "",
                "chrome,close=yes,resizable=yes,dependent,dialog,centerscreen"
            );
        }
        // Reset progressWindow when progres window is closed.
        // For window click close in an element
        this.progressWindow.onbeforeunload  = (e) => {
            this.progressWindow = undefined;
            this.queue = [];
        }
        // For close button in header bar
        this.progressWindow.onclose  = (e) => {
            this.progressWindow = undefined;
            this.queue = [];
        }
        let t = 0;
        // Wait for window
        while (
            t < 500 &&
            this.progressWindow.document.readyState !== "complete"
        ) {
            await this._Addon._Zotero.Promise.delay(10);
            t += 1;
            this._Addon._Zotero.debug("** Tara wait ");
        }
    }

    public closeProgressWindow(): void {
        if (!this.progressWindow) {
            return;
        }
        this.progressWindow.close();
    }

    public updateProgressWindow(row: string, status: boolean, value: string=''): void {
        let doc = this.progressWindow.document;
        var ele = doc.createElement("li");
        ele.setAttribute("id", row);
        var innerHTML: string;
        if (status) {
            innerHTML = `<img src="${
                this.tickIcon
            }"> ${this._Addon.locale.getString(
                row
            )} ${this._Addon.locale.getString("progress.backupsuccess")}`;
        } else {
            innerHTML = `<img src="${
                this.crossIcon
            }"> ${this._Addon.locale.getString(
                row
            )} ${this._Addon.locale.getString("progress.backupfail")}`;
        }
        ele.innerHTML = innerHTML;
        doc.querySelector("#listbox").appendChild(ele);
        if (value != '') {
            doc.querySelector("#progress").setAttribute("value", value);
        }
    }

    public completeProgressWindow() {
        let doc = this.progressWindow.document;
        doc.querySelector("#progress").setAttribute("value", '100');
        doc.querySelector("#button1").textContent = 'OK';
    }
}

export default AddonViews;
