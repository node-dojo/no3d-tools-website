import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 (S3-compatible). Uses:
 * R2_ENDPOINT — e.g. https://<account_id>.r2.cloudflarestorage.com
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

export function isR2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
  );
}

/** @returns {S3Client} */
export function getR2Client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 env not configured (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true
  });
}

export function getR2Bucket() {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error('R2_BUCKET_NAME not set');
  return b;
}

/**
 * @param {string} objectKey - Full key e.g. no3d-tools-library/dojo-bolt-gen-v05.blend
 * @param {number} [expiresInSeconds] default 900 (15 min)
 */
export async function presignGetObject(objectKey, expiresInSeconds = 900) {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

/**
 * @param {string} objectKey
 * @returns {Promise<string>}
 */
export async function getObjectUtf8String(objectKey) {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
  const chunks = [];
  const stream = out.Body;
  if (!stream) throw new Error('Empty R2 object body');
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * @param {string} objectKey
 * @param {string} body
 * @param {string} [contentType]
 */
export async function putObjectString(objectKey, body, contentType = 'application/json') {
  const client = getR2Client();
  const bucket = getR2Bucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType
    })
  );
}

export function getManifestObjectKey() {
  return process.env.R2_MANIFEST_KEY?.trim() || 'no3d-tools-library/manifest.json';
}
