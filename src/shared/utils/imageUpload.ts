export function validateImage(file: File, label = "image"): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 200000
    ) {
      reject(new Error(`Choose a PNG, JPEG or WebP ${label} under 200 KB.`));
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
