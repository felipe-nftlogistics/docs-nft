import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import menus from "@/data/menus.json";

export interface GalleryImage {
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

          // Se as dimensões ainda não estiverem cacheadas, tenta extrair com sharp
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
            } catch {
              // ignora falha em imagem corrompida
            }
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
          // ignora erro de stat
        }
      }
    }
  }

  return results;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const metadataMap = getMetadata();
    let metadataChanged = false;

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

    // Salva metadados cacheados caso dimensões tenham sido computadas
    saveMetadata(metadataMap);

    const allImages = [...uploads, ...prints, ...categories].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Coleta categorias do sistema para opções
    const systemCategories = (menus.menuCategoriaList || [])
      .filter((cat) => cat.link !== "/dashboard")
      .map((cat) => ({
        slug: cat.link.replace("/dashboard/", ""),
        title: cat.titulo,
      }));

    return NextResponse.json({
      images: allImages,
      systemCategories,
      counts: {
        total: allImages.length,
        uploads: uploads.length,
        prints: prints.length,
        categories: categories.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao listar imagens", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = ((formData.get("folder") as string) || "uploads").toLowerCase();
    const rawName = (formData.get("name") as string) || "";
    const category = (formData.get("category") as string) || "Geral";
    const profilesRaw = formData.get("profiles") as string;
    const profiles = profilesRaw ? JSON.parse(profilesRaw) : ["Administrador", "Usuário Padrão"];

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const allowedFolders = ["uploads", "prints", "categories"];
    const targetFolder = allowedFolders.includes(folder) ? folder : "uploads";
    const targetDir = path.join(BASE_IMG_DIR, targetFolder);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let baseFileName = rawName || file.name.replace(/\.[^/.]+$/, "");
    baseFileName = baseFileName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!baseFileName) {
      baseFileName = `img_${Date.now()}`;
    }

    let finalFileName = `${baseFileName}.webp`;
    let targetFilePath = path.join(targetDir, finalFileName);

    if (fs.existsSync(targetFilePath)) {
      finalFileName = `${baseFileName}_${Date.now()}.webp`;
      targetFilePath = path.join(targetDir, finalFileName);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(targetFilePath, buffer);

    const stats = await fs.promises.stat(targetFilePath);

    // Extrai dimensões via sharp
    let width: number | undefined;
    let height: number | undefined;
    try {
      const meta = await sharp(targetFilePath).metadata();
      width = meta.width;
      height = meta.height;
    } catch {}

    const relativeUrl = `/assets/img/${targetFolder}/${finalFileName}`;

    // Salva metadados personalizados
    const metadataMap = getMetadata();
    metadataMap[relativeUrl] = {
      name: finalFileName,
      category,
      profiles,
      width,
      height,
    };
    saveMetadata(metadataMap);

    const newImage: GalleryImage = {
      id: `${targetFolder}_${finalFileName}_${stats.mtimeMs}`,
      name: finalFileName,
      url: relativeUrl,
      folder: targetFolder,
      size: stats.size,
      updatedAt: stats.mtime.toISOString(),
      width,
      height,
      category,
      profiles,
    };

    return NextResponse.json({
      success: true,
      message: "Imagem enviada e salva com sucesso!",
      image: newImage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao processar upload", details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url, newName, category, profiles } = body;

    if (!url) {
      return NextResponse.json({ error: "URL da imagem é obrigatória" }, { status: 400 });
    }

    const metadataMap = getMetadata();
    let currentUrl = url;
    let updatedName = path.basename(url);

    // Se o usuário solicitou renomear o arquivo e ele está na pasta uploads
    if (newName && typeof newName === "string" && url.startsWith("/assets/img/uploads/")) {
      const cleanBase = newName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\.webp$/i, "")
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (cleanBase) {
        const targetFilename = `${cleanBase}.webp`;
        const currentFilename = path.basename(url);

        if (targetFilename !== currentFilename) {
          const oldFilePath = path.join(BASE_IMG_DIR, "uploads", currentFilename);
          const newFilePath = path.join(BASE_IMG_DIR, "uploads", targetFilename);

          if (fs.existsSync(oldFilePath) && !fs.existsSync(newFilePath)) {
            await fs.promises.rename(oldFilePath, newFilePath);
            const newUrl = `/assets/img/uploads/${targetFilename}`;

            // Transfere o metadata para a nova URL
            if (metadataMap[currentUrl]) {
              metadataMap[newUrl] = { ...metadataMap[currentUrl] };
              delete metadataMap[currentUrl];
            }

            currentUrl = newUrl;
            updatedName = targetFilename;
          }
        }
      }
    }

    // Atualiza os metadados (categoria e perfis)
    const existing = metadataMap[currentUrl] || {};
    metadataMap[currentUrl] = {
      ...existing,
      name: updatedName,
      category: category || existing.category || "Geral",
      profiles: Array.isArray(profiles) ? profiles : existing.profiles || ["Administrador", "Usuário Padrão"],
    };

    saveMetadata(metadataMap);

    return NextResponse.json({
      success: true,
      message: "Informações da imagem atualizadas com sucesso!",
      image: {
        url: currentUrl,
        name: updatedName,
        category: metadataMap[currentUrl].category,
        profiles: metadataMap[currentUrl].profiles,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar informações da imagem", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const relativeUrl = searchParams.get("url");

    if (!relativeUrl) {
      return NextResponse.json({ error: "URL da imagem é obrigatória" }, { status: 400 });
    }

    if (!relativeUrl.startsWith("/assets/img/uploads/")) {
      return NextResponse.json(
        { error: "Apenas imagens na pasta de uploads podem ser excluídas." },
        { status: 403 }
      );
    }

    const fileName = path.basename(relativeUrl);
    const targetFilePath = path.join(BASE_IMG_DIR, "uploads", fileName);

    if (!fs.existsSync(targetFilePath)) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    await fs.promises.unlink(targetFilePath);

    // Remove metadados
    const metadataMap = getMetadata();
    if (metadataMap[relativeUrl]) {
      delete metadataMap[relativeUrl];
      saveMetadata(metadataMap);
    }

    return NextResponse.json({ success: true, message: "Imagem excluída com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao excluir imagem", details: error.message },
      { status: 500 }
    );
  }
}
