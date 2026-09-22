import type { Branding } from "../types";
export const defaultBranding: Branding = {
  logoUrl: "",
  primaryColor: "#365840",
  accentColor: "#dce6bf",
  fontFamily: "humanist",
  fontSize: 16,
  theme: "light",
  tagline: "Room to grow.",
};
export const fonts = {
  system: "system-ui, sans-serif",
  humanist: "'Avenir Next', 'Segoe UI', sans-serif",
  serif: "Georgia, serif",
};
export function foreground(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
    ? "#152019"
    : "#ffffff";
}
export function applyBranding(branding: Branding) {
  const root = document.documentElement;
  root.dataset.theme = branding.theme;
  root.style.setProperty("--green", branding.primaryColor);
  root.style.setProperty("--brand-text", foreground(branding.primaryColor));
  root.style.setProperty("--accent", branding.accentColor);
  root.style.setProperty("--accent-text", foreground(branding.accentColor));
  root.style.setProperty("--app-font", fonts[branding.fontFamily]);
  root.style.fontSize = `${branding.fontSize}px`;
}
export function validateLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 200000
    ) {
      reject(new Error("Choose a PNG, JPEG or WebP logo under 200 KB."));
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
