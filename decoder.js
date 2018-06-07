const os = require('os');
const fs = require('fs');
const path = require('path');

const outputDir = 'D:\\cloudMusicCache\\';
const inputDir = path.join(...[os.homedir(), 'AppData', 'Local', 'Netease', 'CloudMusic', 'Cache', 'Cache']);

function convert(idxFileName, infoFileName, ucFileName, outputFileName) {
  const idxJSON = fs.readFileSync(idxFileName);
  const idx = JSON.parse(idxJSON);
  const infoJSON = fs.readFileSync(infoFileName);
  const info = JSON.parse(infoJSON);

  const fileInfo = {
    size: parseInt(idx.size, 10),
    start: parseInt(idx.zone[0].split(' ')[0], 10),
    end: parseInt(idx.zone[0].split(' ')[1], 10),
    format: info.format,
    volume: info.volume,
  };

  const buffered = fileInfo.size <= fileInfo.end + 1;

  if (!buffered) {
    console.log('buffering');
    return;
  }

  const fd = fs.openSync(ucFileName, 'r');
  const buffer = new Uint8Array(idx.size);
  fs.read(fd, buffer, 0, idx.size, 0, (err, bytesRead, buf) => {
    if (err) {
      console.log('read .uc file error: ', err);
      return;
    }

    fs.closeSync(fd);

    for (let i = 0; i < buf.length; i++) {
      buf[i] = buf[i] ^ 0xa3;
    }

    const wfd = fs.openSync(outputFileName + '.' + fileInfo.format, 'w+');
    fs.write(wfd, buf, (werr, bytesWritten, wbuf) => {
      if (werr) {
        console.log('write converted file error', werr);
        return;
      }

      fs.closeSync(wfd);
    });

  });
}

if (!fs.existsSync(inputDir)) {
  console.log('can not find cache direcoty, exited');
  return;
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const allFiles = fs.readdirSync(inputDir)
  .reduce((dict, fileName) => {
    const [name, type] = fileName.split('.');
    const group = dict[name] || {};
    return { ...dict, [name]: { ...group, [type]: fileName } };
  }, {});

for (let fileName in allFiles) {
  const { idx, info, uc } = allFiles[fileName];
  if (!idx || !info || !uc) {
    continue;
  }
  convert(
    path.join(inputDir, idx),
    path.join(inputDir, info),
    path.join(inputDir, uc),
    path.join(outputDir, fileName),
  );
}