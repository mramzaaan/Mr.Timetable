import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';

export const isNative = Capacitor.isNativePlatform();

export const shareFile = async ({
  name,
  data,
  mimeType,
  title = 'Share',
  text = ''
}: {
  name: string;
  data: string; // Base64 data (without data:image/png;base64, prefix) or raw data
  mimeType: string;
  title?: string;
  text?: string;
}) => {
  if (isNative) {
    try {
      const fileName = name;
      // Write file to cache
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: Directory.Cache,
      });

      // Share via Capacitor Share
      await Share.share({
        title,
        text,
        dialogTitle: title,
        url: writeResult.uri,
      });
      return true;
    } catch (e) {
      console.error('Error sharing file natively:', e);
      return false;
    }
  } else {
    return false;
  }
};

export const saveAndShareFile = async (blob: Blob, name: string, title?: string, text?: string) => {
  if (isNative) {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise((resolve) => {
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        // remove data url prefix
        const base64 = base64data.split(',')[1];
        const shared = await shareFile({
          name,
          data: base64,
          mimeType: blob.type,
          title,
          text,
        });
        resolve(shared);
      };
    });
  } else {
      // In web, if navigator.share supports files
      if (navigator.share && navigator.canShare) {
          const file = new File([blob], name, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
              try {
                  await navigator.share({
                      title,
                      text,
                      files: [file]
                  });
                  return true;
              } catch (e) {
                  console.error('Web share error', e);
                  return false;
              }
          }
      }
      return false;
  }
};

export const downloadFileNative = async (blob: Blob, name: string) => {
    if (isNative) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        return new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
                const base64data = reader.result as string;
                const base64 = base64data.split(',')[1];
                const writeResult = await Filesystem.writeFile({
                    path: name,
                    data: base64,
                    directory: Directory.Documents, // Or Data, etc. Documents works on Android 10+
                    recursive: true
                });
                alert(`File saved to documents: ${name}`);
                resolve(true);
            } catch (e) {
                console.error("Error saving file natively", e);
                alert("Failed to save file.");
                resolve(false);
            }
          };
        });
    }
    return false;
};

export const openUrlBrowser = async (url: string) => {
  if (isNative) {
    await Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
};
