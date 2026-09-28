import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { GalleryClient } from "./GalleryClient";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import menus from "@/data/menus.json";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  folder: string;
  size: number;
  updatedAt: string;
  width?: number;
  height?: number;
  category?: string;
  profiles?: string[];
}

const BASE_IMG_DIR = path.join(process.cwd(), "public", "assets", "img");
const METADATA_PATH = path.join(process.cwd(), "src", "data", "galleryMetadata.json");

function getMetadata(): Record<string, any> {
  try {
    if (fs.existsSync(METADATA_PATH)) {
      return JSON.parse(fs.readFileSync(METADATA_PATH, "utf-8"));
    }
  } catch {}
  return {};
}

function saveMetadata(data: any) {
  try {
    fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Erro ao salvar metadata da galeria:", err);
  }
}

async function scanDirectory(
  dirPath: string,
  folderName: string,
  baseRelative: string,
  metadataMap: Record<string, any>
): Promise<GalleryImage[]> {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: GalleryImage[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subResults = await scanDirectory(
        fullPath,
        folderName,
        `${baseRelative}/${entry.name}`,
        metadataMap
      );
      results.push(...subResults);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if ([".webp", ".png", ".jpg", ".jpeg", ".gif", ".svg"].includes(ext)) {
        try {
          const stats = fs.statSync(fullPath);
          const relativeUrl = `${baseRelative}/${entry.name}`;
          const meta = metadataMap[relativeUrl] || {};

          let width = meta.width;
          let height = meta.height;

          // Se dimensões não estão cacheadas, computa com sharp
          if ((!width || !height) && ext !== ".svg") {
            try {
              const imgMeta = await sharp(fullPath).metadata();
              if (imgMeta.width && imgMeta.height) {
                width = imgMeta.width;
                height = imgMeta.height;
                metadataMap[relativeUrl] = {
                  ...meta,
                  width,
                  height,
                };
              }
            } catch {}
          }

          results.push({
            id: `${folderName}_${entry.name}_${stats.mtimeMs}`,
            name: meta.name || entry.name,
            url: relativeUrl,
            folder: folderName,
            size: stats.size,
            updatedAt: stats.mtime.toISOString(),
            width,
            height,
            category: meta.category || (folderName === "categories" ? "Categorias" : folderName === "prints" ? "Prints" : "Geral"),
            profiles: meta.profiles || ["Administrador", "Usuário Padrão"],
          });
        } catch {
          // ignore stat errors
        }
      }
    }
  }

  return results;
}

export default async function AdminGalleryPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  const metadataMap = getMetadata();

  const uploads = await scanDirectory(
    path.join(BASE_IMG_DIR, "uploads"),
    "uploads",
    "/assets/img/uploads",
    metadataMap
  );
  const prints = await scanDirectory(
    path.join(BASE_IMG_DIR, "prints"),
    "prints",
    "/assets/img/prints",
    metadataMap
  );
  const categories = await scanDirectory(
    path.join(BASE_IMG_DIR, "categories"),
    "categories",
    "/assets/img/categories",
    metadataMap
  );

  saveMetadata(metadataMap);

  const allImages = [...uploads, ...prints, ...categories].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const systemCategories = (menus.menuCategoriaList || [])
    .filter((cat) => cat.link !== "/dashboard")
    .map((cat) => ({
      slug: cat.link.replace("/dashboard/", ""),
      title: cat.titulo,
    }));

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-heading">Galeria de Imagens & Mídia</h1>
        <p className="text-muted-foreground mt-1">
          Faça upload de imagens otimizadas para documentações e categorias. Todas as imagens passam por adaptação de resolução e conversão para WebP no seu navegador antes do envio ao servidor.
        </p>
      </div>

      <GalleryClient
        initialImages={allImages}
        systemCategories={systemCategories}
        initialCounts={{
          total: allImages.length,
          uploads: uploads.length,
          prints: prints.length,
          categories: categories.length,
        }}
      />
    </div>
  );
}
