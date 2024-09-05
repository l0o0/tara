declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  window: Window;
  document: Document;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

declare class Localization {}

// Re-declare the _ZoteroTypes namespace and add the missing definition
declare namespace _ZoteroTypes {
  interface Prefs {
    /**
     * The root branch for preferences
     */
    rootBranch: rootBranch;
  }
}
declare interface rootBranch {
  prefHasUserValue(pref: string): boolean;
  getChildList(branch: string): string[];
}
