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

    const create_menu = doc.createElement("menuitem");
    const export_menu = doc.createElement("menuitem");
    const import_menu = doc.createElement("menuitem");
    const restore_menu = doc.createElement("menuitem");
    const pref_menu = doc.createElement("menuitem");

    create_menu.setAttribute("id", "zotero-tb-tara-create-backup");
    create_menu.setAttribute("class", "menuitem-iconic");
    create_menu.setAttribute(
      "style",
      "list-style-image: url('chrome://tara/skin/create_icon.png');",
    );
    create_menu.setAttribute(
      "oncommand",
      "Zotero.Tara.utils.createBackupAsAttachment();",
    );

    import_menu.setAttribute("id", "zotero-tb-tara-import-backup");
    import_menu.setAttribute("class", "menuitem-iconic");
    import_menu.setAttribute(
      "style",
      "list-style-image: url('chrome://tara/skin/import_icon.png');",
    );
    import_menu.setAttribute(
      "oncommand",
      "Zotero.Tara.utils.importFromBackup();",
    );

    export_menu.setAttribute("id", "zotero-tb-tara-export-backup");
    export_menu.setAttribute("class", "menuitem-iconic");
    export_menu.setAttribute(
      "style",
      "list-style-image: url('chrome://tara/skin/export_icon.png');",
    );
    export_menu.setAttribute("oncommand", "Zotero.Tara.utils.exportBackup();");

    restore_menu.setAttribute("id", "zotero-tb-tara-restore-backup");
    restore_menu.setAttribute("class", "menuitem-iconic");
    restore_menu.setAttribute(
      "style",
      "list-style-image: url('chrome://tara/skin/restore_icon.png');",
    );
    restore_menu.setAttribute(
      "oncommand",
      "Zotero.Tara.utils.restoreFromBackup();",
    );

    pref_menu.setAttribute("oncommand", "Zotero.Tara.views.openPreference();");

    menupopup.appendChild(create_menu);
    menupopup.appendChild(import_menu);
    menupopup.appendChild(export_menu);
    menupopup.appendChild(restore_menu);
    menupopup.appendChild(pref_menu);

    tool_button.appendChild(menupopup);
    doc.querySelector("#zotero-collections-toolbar")?.appendChild(tool_button);
  }
}
