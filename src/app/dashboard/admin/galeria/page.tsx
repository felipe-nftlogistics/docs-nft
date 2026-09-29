import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { GalleryClient } from "./GalleryClient";
import { prisma } from "@/lib/prisma";

export default async function AdminGalleryPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  // Busca as categorias do BD
  const dbCategorias = await prisma.categoria.findMany({ select: { slug: true, titulo: true } });
  const systemCategories = dbCategorias.map((cat) => ({
    slug: cat.slug,
    title: cat.titulo,
  }));

  // Busca as imagens do BD
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

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-heading">Galeria de Imagens & Mídia</h1>
        <p className="text-muted-foreground mt-1">
          As imagens agora são salvas na nuvem da Cloudflare (R2). O upload faz conversão inteligente para WebP.
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
