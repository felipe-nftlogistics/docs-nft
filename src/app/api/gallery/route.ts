import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";



// Configuração do Cliente S3 apontando para o Cloudflare R2
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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

// GET /api/gallery -> Retorna lista de imagens do Banco de Dados
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const imagensDb = await prisma.imagem.findMany({
      orderBy: { updatedAt: "desc" }
    });

    const allImages = imagensDb.map((img) => ({
      id: img.id,
      name: img.nome,
      url: img.url,
      folder: img.folder,
      size: img.size,
      updatedAt: img.updatedAt.toISOString(),
      width: img.width || undefined,
      height: img.height || undefined,
      category: img.categoria,
      profiles: JSON.parse(img.profiles || "[]"),
    }));

    const uploads = allImages.filter(img => img.folder === "uploads");
    const prints = allImages.filter(img => img.folder === "prints");
    const categories = allImages.filter(img => img.folder === "categories");

    // Coleta categorias do sistema para opções
    const dbCategorias = await prisma.categoria.findMany({ select: { slug: true, titulo: true } });
    const systemCategories = dbCategorias.map((cat) => ({
      slug: cat.slug,
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

// POST /api/gallery -> Faz upload de uma nova imagem pro R2 e salva no Prisma
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
    let objectKey = `${targetFolder}/${finalFileName}`;

    // Verificar se já existe no banco
    let exists = await prisma.imagem.findUnique({ where: { url: `${R2_PUBLIC_URL}/${objectKey}` }});
    if (exists) {
      finalFileName = `${baseFileName}_${Date.now()}.webp`;
      objectKey = `${targetFolder}/${finalFileName}`;
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    
    // Converte e extrai dimensões se possível com sharp
    let width: number | undefined;
    let height: number | undefined;
    
    try {
      // Força a conversão para WebP e extrai metadados
      const imageInfo = await sharp(buffer).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      buffer = imageInfo.data;
      width = imageInfo.info.width;
      height = imageInfo.info.height;
    } catch (e) {
      console.warn("Sharp não conseguiu processar a imagem, fazendo upload original.", e);
      // Fallback pra imagem original
      try {
        const meta = await sharp(buffer).metadata();
        width = meta.width;
        height = meta.height;
      } catch (e2) {}
    }

    const publicUrl = `${R2_PUBLIC_URL}/${objectKey}`;

    // Upload para R2
    if (!R2_ACCOUNT_ID) {
       console.log("R2 credentials not found. Would upload:", objectKey);
    } else {
       await s3Client.send(new PutObjectCommand({
         Bucket: R2_BUCKET_NAME,
         Key: objectKey,
         Body: buffer,
         ContentType: "image/webp",
         ACL: "public-read" // Dependendo da configuração do bucket
       }));
    }

    // Salvar no Prisma
    const newImagem = await prisma.imagem.create({
      data: {
        nome: finalFileName,
        url: publicUrl,
        folder: targetFolder,
        size: buffer.length,
        width,
        height,
        categoria: category,
        profiles: JSON.stringify(profiles),
      }
    });

    const newImageRes: GalleryImage = {
      id: newImagem.id,
      name: finalFileName,
      url: publicUrl,
      folder: targetFolder,
      size: buffer.length,
      updatedAt: newImagem.updatedAt.toISOString(),
      width,
      height,
      category,
      profiles,
    };

    return NextResponse.json({
      success: true,
      message: "Imagem enviada e salva com sucesso!",
      image: newImageRes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao processar upload", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/gallery -> Atualiza metadados ou renomeia no R2
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

    const img = await prisma.imagem.findUnique({ where: { url } });
    if (!img) {
      return NextResponse.json({ error: "Imagem não encontrada no banco." }, { status: 404 });
    }

    let updatedName = img.nome;
    let newUrl = url;

    // Lógica para renomear
    if (newName && typeof newName === "string" && img.folder === "uploads") {
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
        if (targetFilename !== img.nome) {
          const oldKey = `${img.folder}/${img.nome}`;
          const newKey = `${img.folder}/${targetFilename}`;
          newUrl = `${R2_PUBLIC_URL}/${newKey}`;

          const exists = await prisma.imagem.findUnique({ where: { url: newUrl } });
          if (!exists) {
            // Renomear no R2 é Copiar + Deletar
            if (R2_ACCOUNT_ID) {
              await s3Client.send(new CopyObjectCommand({
                Bucket: R2_BUCKET_NAME,
                CopySource: `${R2_BUCKET_NAME}/${oldKey}`,
                Key: newKey
              }));
              await s3Client.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: oldKey
              }));
            }
            updatedName = targetFilename;
          }
        }
      }
    }

    const updated = await prisma.imagem.update({
      where: { id: img.id },
      data: {
        nome: updatedName,
        url: newUrl,
        categoria: category || img.categoria,
        profiles: profiles ? JSON.stringify(profiles) : img.profiles,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Informações da imagem atualizadas com sucesso!",
      image: {
        url: updated.url,
        name: updated.nome,
        category: updated.categoria,
        profiles: JSON.parse(updated.profiles),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar informações da imagem", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/gallery -> Exclui a imagem do R2 e do BD
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Acesso não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL da imagem é obrigatória" }, { status: 400 });
    }

    const img = await prisma.imagem.findUnique({ where: { url } });
    if (!img) {
      return NextResponse.json({ error: "Imagem não encontrada no banco." }, { status: 404 });
    }

    if (img.folder !== "uploads") {
      return NextResponse.json(
        { error: "Apenas imagens na pasta de uploads podem ser excluídas." },
        { status: 403 }
      );
    }

    const objectKey = `${img.folder}/${img.nome}`;
    
    // Deletar do R2
    if (R2_ACCOUNT_ID) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: objectKey
      }));
    }

    // Deletar do banco
    await prisma.imagem.delete({ where: { id: img.id } });

    return NextResponse.json({ success: true, message: "Imagem excluída com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao excluir imagem", details: error.message },
      { status: 500 }
    );
  }
}
