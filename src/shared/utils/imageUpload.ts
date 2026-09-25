export function validateImage(
  file: File,
  label = "image",
  maxBytes = 2_000_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > maxBytes
    ) {
      const limit =
        maxBytes >= 1_000_000
          ? `${maxBytes / 1_000_000} MB`
          : `${maxBytes / 1000} KB`;
      reject(new Error(`Choose a PNG, JPEG or WebP ${label} up to ${limit}.`));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This is not a valid image."));
      img.onload = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
