import { apiResponse, apiError } from '@/lib/utils';
import { requireAuth } from '@/lib/auth';
import { uploadFile, deleteFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const folder = formData.get('folder') || 'uploads';

    if (!file || typeof file === 'string') {
      return apiError('No file uploaded', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadFile({
      buffer,
      fileName: file.name,
      folder,
      contentType: file.type || 'application/octet-stream',
    });

    return apiResponse({
      url: result.url,
      key: result.key,
      fileName: result.fileName,
      size: result.size,
      mimeType: result.mimeType,
      storage: result.storage,
    }, 201);
  } catch (error) {
    console.error('Upload error:', error);
    return apiError(error.message || 'File upload failed', 500);
  }
}

export async function DELETE(request) {
  try {
    const session = await requireAuth();
    if (!session) {
      return apiError('Unauthorized: Admin login required', 401);
    }

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return apiError('A file url/key is required', 400);
    }

    await deleteFile(url);
    return apiResponse({ deleted: true });
  } catch (error) {
    console.error('Delete upload error:', error);
    return apiError(error.message || 'Failed to delete file', 500);
  }
}

