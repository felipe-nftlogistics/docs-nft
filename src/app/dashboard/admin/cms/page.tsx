import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { CMSClient } from "./CMSClient";
import { prisma } from "@/lib/prisma";

export default async function CMSPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  const catData = await prisma.categoria.findMany({
    include: {
      documentos: {
        orderBy: { id: "asc" }
      }
    },
    orderBy: { id: "asc" }
  });

  const categories = catData.map(cat => ({
    slug: cat.slug,
    name: cat.titulo,
    listKey: `${cat.slug}List`,
    thumb: cat.thumb || undefined,
    descricao: cat.descricao || "",
  }));

  const allPages: Array<{
    key: string;
    categorySlug: string;
    categoryName: string;
    title: string;
    slug: string;
    link: string;
    description: string;
    thumb?: string;
    content: string;
    ativo: boolean;
  }> = [];

  for (const cat of catData) {
    for (const doc of cat.documentos) {
      allPages.push({
        key: `${cat.slug}/${doc.slug}`,
        categorySlug: cat.slug,
        categoryName: cat.titulo,
        title: doc.titulo,
        slug: doc.slug,
        link: `/dashboard/${cat.slug}/${doc.slug}`,
        description: doc.descricao || "",
        thumb: doc.thumb || undefined,
        content: doc.html || "",
        ativo: doc.ativo,
      });
    }
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-heading">CMS - Gerenciador de Páginas</h1>
        <p className="text-muted-foreground mt-1">
          Crie, edite e organize facilmente todas as documentações e páginas da plataforma sem tocar em código.
        </p>
      </div>

      <CMSClient initialPages={allPages} categories={categories} />
    </div>
  );
}
