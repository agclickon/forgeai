import { Client } from "@replit/object-storage";

export function getBucketId(): string {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error("Object storage not configured. Please set up object storage first.");
  }
  return bucketId;
}

const client = new Client({ bucketId: getBucketId() });

export class ObjectStorageService {
  async uploadFile(
    filename: string,
    content: Buffer,
    contentType: string,
    isPrivate: boolean = true
  ): Promise<{ objectPath: string }> {
    const directory = isPrivate 
      ? process.env.PRIVATE_OBJECT_DIR?.split("/").pop() || ".private"
      : "public";
    const objectPath = `${directory}/${Date.now()}-${filename}`;
    
    const result = await client.uploadFromBytes(objectPath, content);
    
    if (!result.ok) {
      throw new Error(`Failed to upload file: ${result.error}`);
    }

    return { objectPath };
  }

  async uploadFileToPath(
    objectPath: string,
    content: Buffer,
    contentType: string
  ): Promise<{ objectPath: string }> {
    const result = await client.uploadFromBytes(objectPath, content);
    
    if (!result.ok) {
      throw new Error(`Failed to upload file: ${result.error}`);
    }

    return { objectPath };
  }

  async getFileContent(objectPath: string, maxSizeBytes: number = 512 * 1024): Promise<Buffer> {
    const result = await client.downloadAsBytes(objectPath);
    
    if (!result.ok) {
      throw new Error(`Failed to download file: ${result.error}`);
    }
    
    const buffer = result.value[0];
    if (buffer.length > maxSizeBytes) {
      throw new Error(`File too large: ${buffer.length} bytes (max: ${maxSizeBytes})`);
    }
    
    return buffer;
  }

  async deleteFile(objectPath: string): Promise<void> {
    const result = await client.delete(objectPath);
    if (!result.ok) {
      throw new Error(`Failed to delete file: ${result.error}`);
    }
  }

  getPublicUrl(objectPath: string): string {
    return `https://storage.googleapis.com/${getBucketId()}/${objectPath}`;
  }

  async exists(objectPath: string): Promise<boolean> {
    const result = await client.exists(objectPath);
    return result.ok && result.value;
  }
}

export const objectStorageService = new ObjectStorageService();
