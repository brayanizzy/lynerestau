import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createPhotoStore, normalizePhoto } from "../src/admin/photos.js";
describe("photos privées du personnel", () => {
  it("normalise en JPEG réduit sans conserver EXIF", async () => {
    const input = await sharp({ create: { width: 1000, height: 800, channels: 3, background: "red" } }).withExif({ IFD0: { Artist: "Confidential metadata" } }).jpeg().toBuffer();
    expect((await sharp(input).metadata()).exif).toBeDefined();
    const output = await normalizePhoto(input.toString("base64")); const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("jpeg"); expect(metadata.width).toBe(640); expect(metadata.height).toBe(512); expect(metadata.exif).toBeUndefined();
  });
  it("rejette les fichiers trop volumineux et trop grands", async () => {
    await expect(normalizePhoto(Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64"))).rejects.toMatchObject({ code: "INVALID_PHOTO" });
    const input = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: "white" } }).png().toBuffer();
    await expect(normalizePhoto(input.toString("base64"))).rejects.toMatchObject({ code: "INVALID_PHOTO" });
  });
  it("conserve les fichiers privés et refuse les traversées de chemin", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lyne-photo-test-"));
    try {
      const store = createPhotoStore(join(directory, "private")); const data = Buffer.from("private normalized photo"); const key = await store.save(data);
      expect(await store.read(key)).toEqual(data); expect((await stat(join(directory, "private", key))).mode & 0o777).toBe(0o600);
      expect((await stat(join(directory, "private"))).mode & 0o777).toBe(0o700);
      await expect(store.read("../secret")).rejects.toMatchObject({ code: "PHOTO_NOT_FOUND" });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
