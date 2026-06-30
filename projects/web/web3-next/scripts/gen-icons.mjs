// Genera los PNG de icono (192/512 + maskable 512) a partir de los SVG de marca.
// Uso: node scripts/gen-icons.mjs   (requiere sharp)
import sharp from "sharp";
import { readFileSync } from "node:fs";

const icon = readFileSync("public/icon.svg");
const maskable = readFileSync("public/icon-maskable.svg");

async function gen(svg, size, out) {
  await sharp(svg, { density: 512 }).resize(size, size).png().toFile(`public/${out}`);
  console.log(`✓ public/${out} (${size}x${size})`);
}

await gen(icon, 192, "icon-192.png");
await gen(icon, 512, "icon-512.png");
await gen(maskable, 512, "icon-maskable-512.png");
console.log("Iconos PNG generados.");
