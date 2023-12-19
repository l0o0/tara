adm = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
xpiFile = Zotero.File.pathToFile(
    "C:\\Users\\E480\\Downloads\\Knowledge4Zotero@windingwind.com.xpi",
);
xpiFile = Zotero.File.pathToFile(
    "C:\\Users\\E480\\Downloads\\pdfpreview@windingwind.com.xpi",
);

installedResult = await adm.AddonManager.getInstallForFile(xpiFile);
installedResult.addon.userDisabled = true;
await installedResult.install();

const filename = "C:\\Users\\l0o0\\Zotero\\storage\\PGAGFN8N\\2023_12_18_21_33_12_backup.zip";
const tmpDir2 = "C:\\Users\\l0o0\\AppData\\Local\\Temp\\Zotero\\Backup";
const zipFile = Zotero.File.pathToFile(filename);
const zipReader = Components.classes[
    "@mozilla.org/libjar/zip-reader;1"
].createInstance(Components.interfaces.nsIZipReader);
zipReader.open(zipFile);

// 部分ZIP文件，解析时没有出现文件夹
let folderEntries = zipReader.findEntries("*/$");
while (folderEntries.hasMore()) {
    let entry = folderEntries.getNext();
    const folder = entry.split(/\//).reduce((a, c) => PathUtils.join(a, c), tmpDir2);
    console.log(folder);
    await Zotero.File.createDirectoryIfMissingAsync(folder, { from: tmpDir2 });
}

let entries = zipReader.findEntries("*");
while (entries.hasMore()) {
    const entry = entries.getNext();
    console.log(entry);
    if (entry.endsWith("/")) {
        continue;
    }
    const destPath = entry.split(/[/\\]/).reduce((a, c) => PathUtils.join(a, c), tmpDir2);
    console.log(destPath);
    zipReader.extract(entry, Zotero.File.pathToFile(destPath));
}