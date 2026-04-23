export interface UploadResult {
  id: string
}

export class UploadError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'UploadError'
  }
}

export async function uploadFile(
  file: File,
  projectId: string
): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new UploadError(data.error ?? 'Upload failed', res.status)
  }

  return (await res.json()) as UploadResult
}

export async function uploadDataUrl(
  dataUrl: string,
  projectId: string,
  filename: string,
  contentType = 'image/png'
): Promise<UploadResult> {
  const blob = await fetch(dataUrl).then((r) => r.blob())
  const file = new File([blob], filename, { type: contentType })
  return uploadFile(file, projectId)
}
