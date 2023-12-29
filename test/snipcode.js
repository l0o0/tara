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

const filename =
  "C:\\Users\\l0o0\\Zotero\\storage\\PGAGFN8N\\2023_12_18_21_33_12_backup.zip";
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
  const folder = entry
    .split(/\//)
    .reduce((a, c) => PathUtils.join(a, c), tmpDir2);
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
  const destPath = entry
    .split(/[/\\]/)
    .reduce((a, c) => PathUtils.join(a, c), tmpDir2);
  console.log(destPath);
  zipReader.extract(entry, Zotero.File.pathToFile(destPath));
}

// 测试Windows10 Z7生成的压缩文件，在Win Z6下的解析
// 在Win10系统上，手动创建 ZIP 文件，其路径格式 styles/hidden/，Zotero内置ZIP函数创建的路径分隔符为 \
// Ubuntu Z6 Zotero File 内置的创建的路径 /，有目录
filename =
  "C:\\Users\\E480\\Zotero\\storage\\HYX9FUMQ\\2023_12_19_15_45_46_backup.zip";
tmpDir2 = "C:\\Users\\l0o0\\AppData\\Local\\Temp\\Zotero\\Backup";
zipFile = Zotero.File.pathToFile(filename);
zipReader = Components.classes[
  "@mozilla.org/libjar/zip-reader;1"
].createInstance(Components.interfaces.nsIZipReader);
zipReader.open(zipFile);
folderEntries = zipReader.findEntries("*/$");
while (folderEntries.hasMore()) {
  let entry = folderEntries.getNext();
  Zotero.debug(entry);
  const folder = entry
    .split(/\//)
    .reduce((a, c) => PathUtils.join(a, c), tmpDir2);
  Zotero.debug(folder);
}

// 创建ZIP
saveDir = "C:\\Users\\E480\\Downloads";
outDir = "C:\\Users\\E480\\AppData\\Local\\Temp\\Zotero\\BackupyaotTFQT";
zipFilename = "test.zip";
await Zotero.File.zipDirectory(
  outDir,
  PathUtils.join(saveDir, zipFilename),
  null,
);
