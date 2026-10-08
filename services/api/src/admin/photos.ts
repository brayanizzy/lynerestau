import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { failure } from "../errors.js";
const MAX_BYTES = 2 * 1024 * 1024;
export async function normalizePhoto(data: string) {
    const input = Buffer.from(data, "base64");
    if (!input.length || input.length > MAX_BYTES)
        failure(400, "INVALID_PHOTO", "Photo limitée à 2 Mo.");
    try {
        const image = sharp(input, { limitInputPixels: 16000000, failOn: "warning", animated: false });
        const metadata = await image.metadata();
        if (!["jpeg", "png", "webp"].includes(metadata.format) || (metadata.pages ?? 1) !== 1)
            throw new Error("Invalid image format");
        // Metadata (including EXIF/GPS) is not copied to the private output.
        return await image.rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).timeout({ seconds: 5 }).toBuffer();
    }
    catch {
        return failure(400, "INVALID_PHOTO", "Photo invalide. Utilisez une image JPEG, PNG ou WebP non animée, de 16 mégapixels maximum.");
    }
}
export function createPhotoStore(directory: string) {
    const root = resolve(directory);
    return {
        async save(data: Buffer) {
            await mkdir(root, { recursive: true, mode: 0o700 });
            const key = `${randomUUID()}.jpg`;
            await writeFile(join(root, key), data, { flag: "wx", mode: 0o600 });
            return key;
        },
        async read(key: string) {
            if (!/^[a-f0-9-]{36}\.jpg$/.test(key))
                return failure(404, "PHOTO_NOT_FOUND", "Photo indisponible.");
            try {
                return await readFile(join(root, key));
            }
            catch {
                return failure(404, "PHOTO_NOT_FOUND", "Photo indisponible.");
            }
        },
    };
}

export type PhotoStore = ReturnType<typeof createPhotoStore>;
