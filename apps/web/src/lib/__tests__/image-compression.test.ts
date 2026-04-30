import { beforeEach, describe, expect, it, vi } from "vitest";

const imageCompressionMock = vi.hoisted(() => vi.fn());

vi.mock("browser-image-compression", () => ({
  default: imageCompressionMock,
}));

import { compressImageForUpload } from "../image-compression";

describe("compressImageForUpload", () => {
  beforeEach(() => {
    imageCompressionMock.mockReset();
  });

  it("skips non-image files and GIF images", async () => {
    const textFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    const gifFile = new File(["gif"], "animation.gif", { type: "image/gif" });

    await expect(compressImageForUpload(textFile, "avatar")).resolves.toBe(
      textFile,
    );
    await expect(compressImageForUpload(gifFile, "featured")).resolves.toBe(
      gifFile,
    );
    expect(imageCompressionMock).not.toHaveBeenCalled();
  });

  it("returns a webp file when compression makes the upload smaller", async () => {
    const original = new File(["original image content"], "Cover.PNG", {
      type: "image/png",
      lastModified: 123,
    });
    const compressed = new File(["small"], "compressed.webp", {
      type: "image/webp",
      lastModified: 456,
    });

    imageCompressionMock.mockResolvedValue(compressed);

    const result = await compressImageForUpload(original, "featured");

    expect(imageCompressionMock).toHaveBeenCalledWith(
      original,
      expect.objectContaining({
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        fileType: "image/webp",
        useWebWorker: true,
      }),
    );
    expect(result).not.toBe(original);
    expect(result.name).toBe("Cover.webp");
    expect(result.type).toBe("image/webp");
    expect(result.lastModified).toBe(123);
    expect(result.size).toBeLessThan(original.size);
  });

  it("falls back to the original file when compression is not smaller", async () => {
    const original = new File(["small"], "avatar.jpg", { type: "image/jpeg" });
    const compressed = new File(["larger"], "avatar.webp", {
      type: "image/webp",
    });

    imageCompressionMock.mockResolvedValue(compressed);

    await expect(compressImageForUpload(original, "avatar")).resolves.toBe(
      original,
    );
  });

  it("falls back to the original file when compression fails", async () => {
    const original = new File(["image"], "banner.jpg", { type: "image/jpeg" });
    imageCompressionMock.mockRejectedValue(new Error("worker failed"));

    await expect(compressImageForUpload(original, "banner")).resolves.toBe(
      original,
    );
  });
});
