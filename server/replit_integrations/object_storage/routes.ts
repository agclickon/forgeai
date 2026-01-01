import type { Express, RequestHandler, Request, Response } from "express";
import { objectStorageService } from "./objectStorage";

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/heic',
  'image/heif',
];

const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff', '.tif', '.heic', '.heif'
];

export function registerObjectStorageRoutes(app: Express, authMiddleware?: RequestHandler) {
  const serveHandler = async (req: Request, res: Response) => {
    try {
      const objectPath = req.params[0];
      if (!objectPath) {
        return res.status(400).json({ message: "Missing object path" });
      }

      const content = await objectStorageService.getFileContent(objectPath, 10 * 1024 * 1024);
      
      const ext = objectPath.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'webm': 'audio/webm',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
      };
      
      res.setHeader('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(content);
    } catch (error) {
      console.error("Error serving file:", error);
      res.status(404).json({ message: "File not found" });
    }
  };

  const uploadHandler = async (req: any, res: any) => {
    try {
      const { name, contentType, isPrivate = true, data } = req.body;

      if (!name || !contentType || !data) {
        return res.status(400).json({ message: "Missing required fields: name, contentType, data" });
      }

      const buffer = Buffer.from(data, "base64");
      
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }

      const result = await objectStorageService.uploadFile(
        name,
        buffer,
        contentType,
        isPrivate
      );

      res.json(result);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  };

  const downloadHandler = async (req: any, res: any) => {
    try {
      const { objectPath } = req.body;

      if (!objectPath) {
        return res.status(400).json({ message: "Missing objectPath" });
      }

      const content = await objectStorageService.getFileContent(objectPath);
      const downloadURL = objectStorageService.getPublicUrl(objectPath);
      res.json({ downloadURL, content: content.toString("base64") });
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  };

  app.get("/api/files/*", serveHandler);

  // Multipart file upload handler for client images and general uploads
  const multipartUploadHandler = async (req: Request, res: Response) => {
    try {
      // Parse multipart form data manually since we don't use multer
      const contentType = req.headers['content-type'] || '';
      
      if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ message: "Content-Type must be multipart/form-data" });
      }

      // Get the boundary from content-type
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        return res.status(400).json({ message: "No boundary found in multipart request" });
      }

      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      
      await new Promise<void>((resolve, reject) => {
        req.on('end', resolve);
        req.on('error', reject);
      });

      const body = Buffer.concat(chunks);
      const boundary = '--' + boundaryMatch[1];
      const parts = body.toString('binary').split(boundary);
      
      let fileName = '';
      let fileBuffer: Buffer | null = null;
      let fileMimeType = '';
      let directory = '.private';

      for (const part of parts) {
        if (!part || part === '--\r\n' || part === '--') continue;

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        const headers = part.substring(0, headerEnd);
        const content = part.substring(headerEnd + 4);
        
        // Check if this is the directory field
        if (headers.includes('name="directory"')) {
          directory = content.replace(/\r\n$/, '').trim();
          continue;
        }

        // Check if this is a file
        const fileNameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
          fileMimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';
          
          // Remove trailing boundary markers
          let contentEnd = content.lastIndexOf('\r\n');
          if (contentEnd === -1) contentEnd = content.length;
          
          fileBuffer = Buffer.from(content.substring(0, contentEnd), 'binary');
        }
      }

      if (!fileName || !fileBuffer) {
        return res.status(400).json({ message: "No file found in request" });
      }

      // Check file size (10MB max)
      if (fileBuffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
      }

      // Validate file extension for images
      const ext = '.' + fileName.split('.').pop()?.toLowerCase();
      const isImage = ALLOWED_IMAGE_EXTENSIONS.includes(ext) || 
                      ALLOWED_IMAGE_TYPES.includes(fileMimeType);

      // Generate unique filename
      const uniqueFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const objectPath = `${directory}/${uniqueFileName}`;

      // Upload to object storage
      const result = await objectStorageService.uploadFileToPath(
        objectPath,
        fileBuffer,
        fileMimeType
      );

      res.json({ objectPath: result.objectPath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  };

  if (authMiddleware) {
    app.post("/api/uploads/request-url", authMiddleware, uploadHandler);
    app.post("/api/uploads/download-url", authMiddleware, downloadHandler);
    app.post("/api/files/upload", authMiddleware, multipartUploadHandler);
  } else {
    app.post("/api/uploads/request-url", uploadHandler);
    app.post("/api/uploads/download-url", downloadHandler);
    app.post("/api/files/upload", multipartUploadHandler);
  }
}
