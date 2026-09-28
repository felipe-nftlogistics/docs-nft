import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import menus from "@/data/menus.json";
import docContent from "@/data/docContent.json";
import { CMSClient } from "./CMSClient";

export default async function CMSPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  // Coleta dinamicamente todas as categorias de menus.json
  const categories = (menus.menuCategoriaList || [])
    .filter(cat => cat.link !== "/dashboard")
    .map(cat => {
      const slug = cat.link.replace("/dashboard/", "");
      const listKey = slug === "nota-fiscal" ? "nota-fiscalList" : `${slug}List`;
      return {
        slug,
        name: cat.titulo,
        listKey,
        thumb: cat.thumb,
        descricao: (cat as any).descricao || "",
      };
    });

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

  const docs = docContent as Record<string, { title: string; html: string; ativo?: boolean }>;
  const registeredDocKeys = new Set<string>();

  // 1. Páginas de categorias ativas
  for (const cat of categories) {
    const list = (menus as any)[cat.listKey] || [];
    for (const item of list) {
      const parts = item.link.replace("/dashboard/", "").split("/");
      const slug = parts[1] || "";
      const key = `${cat.slug}/${slug}`;
      registeredDocKeys.add(key);
      const doc = docs[key];

      allPages.push({
        key,
        categorySlug: cat.slug,
        categoryName: cat.name,
        title: item.titulo,
        slug,
        link: item.link,
        description: item.descricao || "",
        thumb: item.thumb,
        content: doc?.html || "",
        ativo: item.ativo !== false && (doc?.ativo !== false),
      });
    }
  }

  // 2. Páginas de categorias excluídas salvas em semCategoriaList
  const semCategoriaList = (menus as any).semCategoriaList || [];
  for (const item of semCategoriaList) {
    const rawLink = item.originalLink || item.link || "";
    const cleanLink = rawLink.replace("/dashboard/", "");
    const parts = cleanLink.split("/");
    const slug = parts[1] || parts[0] || "";
    const origKey = `${parts[0]}/${slug}`;
    registeredDocKeys.add(origKey);
    registeredDocKeys.add(item.link);
    const doc = docs[origKey] || docs[item.link] || docs[slug];

    allPages.push({
      key: origKey || item.link || slug,
      categorySlug: "sem-categoria",
      categoryName: "Sem Categoria",
      title: item.titulo || doc?.title || slug,
      slug,
      link: item.link || `/dashboard/sem-categoria/${slug}`,
      description: item.descricao || "Página órfã sem categoria associada",
      thumb: item.thumb,
      content: doc?.html || "",
      ativo: false,
    });
  }

  // 3. Documentos em docContent.json que não pertencem a nenhuma categoria ativa (órfãos)
  for (const [docKey, docData] of Object.entries(docs)) {
    if (!registeredDocKeys.has(docKey)) {
      const parts = docKey.split("/");
      const formerCat = parts[0];
      const slug = parts[1] || parts[0];

      allPages.push({
        key: docKey,
        categorySlug: "sem-categoria",
        categoryName: "Sem Categoria",
        title: docData.title || slug,
        slug,
        link: "",
        description: `Conteúdo órfão preservado (antigo módulo: ${formerCat})`,
        thumb: undefined,
        content: docData.html || "",
        ativo: false,
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
