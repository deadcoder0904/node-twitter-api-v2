import * as fs from 'fs';
import type { TUploadableMedia, TUploadTypeV1 } from '../types';

// -------------
// Media helpers
// -------------

export type TFileHandle = fs.promises.FileHandle | number | Buffer;

export async function readFileIntoBuffer(file: TUploadableMedia) {
  const handle = await getFileHandle(file);

  if (typeof handle === 'number') {
    return new Promise<Buffer>((resolve, reject) => {
      fs.readFile(handle, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  } else if (handle instanceof Buffer) {
    return handle;
  } else {
    return handle.readFile();
  }
}

export function getFileHandle(file: TUploadableMedia) {
  if (typeof file === 'string') {
    return fs.promises.open(file, 'r');
  } else if (typeof file === 'number') {
    return file;
  } else if (typeof file === 'object' && !(file instanceof Buffer)) {
    return file;
  } else if (!(file instanceof Buffer)) {
    throw new Error('Given file is not valid, please check its type.');
  } else {
    return file;
  }
}

export async function getFileSizeFromFileHandle(fileHandle: TFileHandle) {
  // Get the file size
  if (typeof fileHandle === 'number') {
    const stats = await new Promise((resolve, reject) => {
      fs.fstat(fileHandle as number, (err, stats) => {
        if (err) reject(err);
        resolve(stats);
      });
    }) as fs.Stats;

    return stats.size;
  } else if (fileHandle instanceof Buffer) {
    return fileHandle.length;
  } else {
    return (await fileHandle.stat()).size;
  }
}

export function getMimeType(file: TUploadableMedia, type?: TUploadTypeV1 | string) {
  if (typeof file === 'string' && !type) {
    return getMimeByName(file);
  } else if (typeof type === 'string') {
    return getMimeByType(type);
  }

  throw new Error('You must specify type if file is a file handle or Buffer.');
}

function getMimeByName(name: string) {
  if (name.endsWith('.jpeg') || name.endsWith('.jpg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.mpeg4') || name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.srt')) return 'text/plain';

  return 'image/jpeg';
}

function getMimeByType(type: TUploadTypeV1 | string) {
  if (type === 'gif') return 'image/gif';
  if (type === 'jpg') return 'image/jpeg';
  if (type === 'png') return 'image/png';
  if (type === 'webp') return 'image/webp';
  if (type === 'srt') return 'text/plain';
  if (type === 'mp4' || type === 'longmp4') return 'video/mp4';

  return type;
}

export function getMediaCategoryByMime(name: string, target: 'tweet' | 'dm') {
  if (name === 'video/mp4') return target === 'tweet' ? 'TweetVideo' : 'DmVideo';
  if (name === 'image/gif') return target === 'tweet' ? 'TweetGif' : 'DmGif';
  if (name === 'text/plain') return 'Subtitles';
  else return target === 'tweet' ? 'TweetImage' : 'DmImage';
}

export function sleepSecs(seconds: number) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function readNextPartOf(file: TFileHandle, chunkLength: number, bufferOffset = 0, buffer?: Buffer): Promise<[Buffer, number]> {
  if (file instanceof Buffer) {
    const rt = file.slice(bufferOffset, bufferOffset + chunkLength);
    return [rt, rt.length];
  }

  if (!buffer) {
    throw new Error('Well, we will need a buffer to store file content.');
  }

  let bytesRead: number;

  if (typeof file === 'number') {
    bytesRead = await new Promise((resolve, reject) => {
      fs.read(file as number, buffer, 0, chunkLength, bufferOffset, (err, nread) => {
        if (err) reject(err);
        resolve(nread);
      });
    });
  }
  else {
    const res = await file.read(buffer, 0, chunkLength, bufferOffset);
    bytesRead = res.bytesRead;
  }

  return [buffer, bytesRead];
}
