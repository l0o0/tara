adm = ChromeUtils.import(
    "resource://gre/modules/AddonManager.jsm",
);
xpiFile = Zotero.File.pathToFile("C:\\Users\\E480\\AppData\\Local\\Temp\\Zotero\\Backup\\extensions\\Knowledge4Zotero@windingwind.com.xpi");

installedResult =
    await adm.AddonManager.getInstallForFile(xpiFile);