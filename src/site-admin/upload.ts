/**
 * Shrinks a photo in the browser before upload (longest side ≤ 2000 px, WebP, or JPEG where
 * WebP cannot be encoded) and sends it to the cabinet's storage. Returns the photo's URL.
 */
async function shrinkImage(file: File, maxSide = 2000): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Не получилось открыть файл. Нужна картинка JPG, PNG или WebP.');
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.86));
  // Safari before 17 cannot encode WebP and silently returns PNG; use JPEG there.
  let blob = await encode('image/webp');
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg');
  if (!blob) throw new Error('Не получилось подготовить фото. Попробуйте другой файл.');
  return blob;
}

const ERRORS: Record<string, string> = {
  size: 'Файл слишком большой — даже после сжатия больше 4 МБ.',
  type: 'Нужна картинка JPG, PNG или WebP.',
  storage: 'Хранилище для фото не подключено. В кабинете, в «Настройках», написано, как его включить.',
  unauthorized: 'Сессия закончилась — войдите снова.',
};

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await shrinkImage(file);
  const response = await fetch('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
  const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !body.url) throw new Error(ERRORS[body.error ?? ''] ?? 'Не удалось загрузить фото. Попробуйте ещё раз.');
  return body.url;
}

/** Opens the system file picker for one image. */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/heic' });
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
