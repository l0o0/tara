export function zipDirectory(source: string, zipfilename: string) {
  const dir = FileUtils.File(source);
  const zipfile = FileUtils.File(zipfilename);

  const zw = Cc['@mozilla.org/zipwriter;1'].createInstance(Ci.nsIZipWriter);

  //recursviely add all
  const dirArr = [dir]; //adds dirs to this as it finds it
  for (let i = 0; i < dirArr.length; i++) {
    ztoolkit.log('adding contents of dir[' + i + ']: ' + dirArr[i].leafName + ' PATH: ' + dirArr[i].path);
    const dirEntries = dirArr[i].directoryEntries;
    while (dirEntries.hasMoreElements()) {
      const entry = dirEntries.getNext().QueryInterface(Ci.nsIFile); //entry is instance of nsiFile so here https://developer.mozilla.org/docs/XPCOM_Interface_Reference/nsIFile
      if (entry.path == zipfile.path) {
        ztoolkit.log('skipping entry - will not add this entry to the zip file - as this is the zip itself: "' + zipfile.path + '" leafName:"' + zipfile.leafName + '"');
        continue;
      }
      if (entry.isDirectory()) {
        dirArr.push(entry);
      }
      const relPath = entry.path.replace(dirArr[0].path, ''); //need relative because we need to use this for telling addEntryFile where in the zip it should create it, and because zip is a copy of the directory
      ztoolkit.log('+' + relPath); //makes it relative to directory the parent dir (dir[0]) so it can succesfully populate files with same names but different folders in this parent dir, needed because recursviely going through all dirs
      let saveInZipAs = relPath.substr(1); //need to get ride of the first '\' forward slash at start otherwise it puts every file added in a folder of its own.
      saveInZipAs = saveInZipAs.replace(/\\/g, '/'); //remember MUST use forward slash (/)
      ztoolkit.log('--' + saveInZipAs);
      zw.addEntryFile(saveInZipAs, Ci.nsIZipWriter.COMPRESSION_NONE, entry, false);
    }
  }
  zw.close()
}