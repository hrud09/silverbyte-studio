/**
 * Calculates standard CRC32 checksum for a buffer
 */
function getCrc32(buffer) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

const crcTable = (() => {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  return table;
})();

/**
 * Creates a placeholder ZIP/APK-shaped buffer used ONLY when a release has no real
 * uploaded build file. It is not a functional Android app — every string inside it
 * (including its own metadata) says so, so nobody mistakes it for the real thing.
 * @param {Object} options
 * @param {Object} options.app
 * @param {Object} options.version
 * @returns {Buffer}
 */
export function generateStarterApk({ app = {}, version = {} }) {
  const appName = app.name || 'Application';
  const packageId = app.packageId || `com.silverbyte.${app.slug || 'app'}`;
  const versionName = version.versionName || '1.0';
  const versionCode = version.versionCode || 1;

  const manifestContent = Buffer.from(
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n` +
    `    package="${packageId}"\n` +
    `    android:versionCode="${versionCode}"\n` +
    `    android:versionName="${versionName}">\n` +
    `    <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="34" />\n` +
    `    <application\n` +
    `        android:label="${appName}"\n` +
    `        android:allowBackup="true"\n` +
    `        android:supportsRtl="true">\n` +
    `        <activity android:name=".MainActivity" android:exported="true">\n` +
    `            <intent-filter>\n` +
    `                <action android:name="android.intent.action.MAIN" />\n` +
    `                <category android:name="android.intent.category.LAUNCHER" />\n` +
    `            </intent-filter>\n` +
    `        </activity>\n` +
    `    </application>\n` +
    `</manifest>\n`,
    'utf8'
  );

  const metadataJson = Buffer.from(
    JSON.stringify(
      {
        isSampleBuild: true,
        notice:
          'This is a placeholder package, not the real application. The developer has not ' +
          'uploaded a build file for this release yet — nothing in this archive will run.',
        appName,
        packageId,
        versionName,
        versionCode,
        developer: app.developerName || 'Silver Byte Studios',
        downloadedAt: new Date().toISOString(),
        store: "Silver Red Store",
        description: app.shortDescription || '',
        changelog: version.changelog || '',
      },
      null,
      2
    ),
    'utf8'
  );

  const manifestMf = Buffer.from(
    `Manifest-Version: 1.0\n` +
    `Created-By: Silver Red Store Package Builder\n` +
    `Notice: SAMPLE PACKAGE - not the real application\n` +
    `Application-Name: ${appName}\n` +
    `Package-Name: ${packageId}\n` +
    `Version: ${versionName}\n`,
    'utf8'
  );

  // Minimal valid dex header
  const dexStub = Buffer.from([
    0x64, 0x65, 0x78, 0x0a, 0x30, 0x33, 0x35, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x70, 0x00, 0x00, 0x00, 0x78, 0x56, 0x34, 0x12,
  ]);

  const files = [
    { name: 'AndroidManifest.xml', data: manifestContent },
    { name: 'classes.dex', data: dexStub },
    { name: 'META-INF/MANIFEST.MF', data: manifestMf },
    { name: 'assets/app-info.json', data: metadataJson },
  ];

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const data = file.data;
    const crc = getCrc32(data);
    const size = data.length;

    // Local Header (30 bytes + nameBuf.length)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // local signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression = 0 (stored)
    localHeader.writeUInt16LE(0x4000, 10); // time
    localHeader.writeUInt16LE(0x5621, 12); // date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(size, 18); // compressed size
    localHeader.writeUInt32LE(size, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // name length
    localHeader.writeUInt16LE(0, 28); // extra length
    nameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, data);

    // Central Directory Header (46 bytes + nameBuf.length)
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // central signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags
    centralHeader.writeUInt16LE(0, 10); // compression
    centralHeader.writeUInt16LE(0x4000, 12); // time
    centralHeader.writeUInt16LE(0x5621, 14); // date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(size, 20); // compressed size
    centralHeader.writeUInt32LE(size, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // name length
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk num
    centralHeader.writeUInt16LE(0, 36); // internal attr
    centralHeader.writeUInt32LE(0, 38); // external attr
    centralHeader.writeUInt32LE(offset, 42); // local header offset
    nameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + data.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk num
  eocd.writeUInt16LE(0, 6); // central dir disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}
