adm = ChromeUtils.import(
    "resource://gre/modules/AddonManager.jsm",
);
xpiFile = Zotero.File.pathToFile("C:\\Users\\E480\\Downloads\\Knowledge4Zotero@windingwind.com.xpi");
xpiFile = Zotero.File.pathToFile("C:\\Users\\E480\\Downloads\\pdfpreview@windingwind.com.xpi");

installedResult =
    await adm.AddonManager.getInstallForFile(xpiFile);
installedResult.addon.userDisabled = true;
await installedResult.install();