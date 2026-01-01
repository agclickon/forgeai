import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UploadOptions {
  onSuccess?: (response: { objectPath: string }) => void;
  onError?: (error: Error) => void;
  isPrivate?: boolean;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: Error | null;
}

export function useUpload(options: UploadOptions = {}) {
  const { onSuccess, onError, isPrivate = true } = options;
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, error: null });

      try {
        setState((prev) => ({ ...prev, progress: 10 }));

        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        setState((prev) => ({ ...prev, progress: 50 }));

        const response = await apiRequest("POST", "/api/uploads/request-url", {
          name: file.name,
          contentType: file.type,
          isPrivate,
          data: base64,
        });

        const { objectPath } = await response.json() as { objectPath: string };

        setState({ isUploading: false, progress: 100, error: null });
        onSuccess?.({ objectPath });

        return objectPath;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Upload failed");
        setState({ isUploading: false, progress: 0, error: err });
        onError?.(err);
        return null;
      }
    },
    [isPrivate, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null });
  }, []);

  return {
    uploadFile,
    reset,
    isUploading: state.isUploading,
    progress: state.progress,
    error: state.error,
  };
}
