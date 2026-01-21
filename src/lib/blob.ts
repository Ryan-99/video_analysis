// src/lib/blob.ts
// Vercel Blob 存储工具库
import { put } from '@vercel/blob';

/**
 * 上传文件到 Vercel Blob 存储
 * @param file - 要上传的文件对象
 * @returns 文件的公开访问 URL
 */
export async function uploadFile(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: 'public',
  });
  return blob.url;
}

/**
 * 从 Vercel Blob 存储删除文件
 * @param url - 要删除的文件 URL
 */
export async function deleteFile(url: string): Promise<void> {
  await fetch(url, { method: 'DELETE' });
}
