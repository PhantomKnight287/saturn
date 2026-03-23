import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createId } from '@paralleldrive/cuid2'
import { env } from '@/env'

const SIGNED_URL_EXPIRES_IN = 3600 // 1 hour

class S3Service {
  private readonly client: S3Client
  private readonly bucket: string

  constructor() {
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    })
    this.bucket = env.S3_BUCKET
  }

  async upload(
    buffer: Buffer,
    contentType: string,
    folder: string
  ): Promise<{ key: string }> {
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin'
    const key = `${folder}/${createId()}.${ext}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'private, max-age=3600',
      })
    )

    return { key }
  }

  async getSignedUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    return await getSignedUrl(this.client, command, {
      expiresIn: SIGNED_URL_EXPIRES_IN,
    })
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    )
  }
}

export const s3Service = new S3Service()
