import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/docs?key=comex/cct
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (key) {
    const [catSlug, docSlug] = key.split("/");
    const doc = await prisma.documento.findFirst({
      where: {
        slug: docSlug,
        categoria: { slug: catSlug }
      }
    });

    if (!doc) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      title: doc.titulo,
      html: doc.html,
      ativo: doc.ativo
    });
  }

  // Se não passar key, retorna um objeto com todas as chaves (para compatibilidade, caso necessite)
  const allDocs = await prisma.documento.findMany({
    include: { categoria: true }
  });

  const docContent: Record<string, any> = {};
  allDocs.forEach(d => {
    docContent[`${d.categoria.slug}/${d.slug}`] = {
      title: d.titulo,
      html: d.html,
      ativo: d.ativo
    };
  });

  return NextResponse.json(docContent);
}

// POST /api/docs -> Cria uma nova página
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { categoria, slug, title, description, content, thumb, ativo = true } = body;

    const cat = await prisma.categoria.findUnique({ where: { slug: categoria } });
    if (!cat) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

    const cleanSlug = slug.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w\-]+/g, "");

    const newDoc = await prisma.documento.create({
      data: {
        titulo: title,
        slug: cleanSlug,
        descricao: description,
        thumb: thumb || `/assets/img/categories/${categoria}.webp`,
        html: content || `<p>${description || title}</p>`,
        ativo: Boolean(ativo),
        categoriaId: cat.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      key: `${categoria}/${cleanSlug}`, 
      link: `/dashboard/${categoria}/${cleanSlug}`,
      ativo: Boolean(ativo)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar documento." }, { status: 500 });
  }
}

// PUT /api/docs -> Atualiza uma página existente
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, title, description, content, ativo, newCategory } = body;
    const [catSlug, docSlug] = key.split("/");

    const doc = await prisma.documento.findFirst({
      where: { slug: docSlug, categoria: { slug: catSlug } }
    });

    if (!doc) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    let finalCatId = doc.categoriaId;
    let finalCatSlug = catSlug;

    // Se mudou de categoria
    if (newCategory && newCategory !== catSlug) {
      const targetCat = await prisma.categoria.findUnique({ where: { slug: newCategory }});
      if (targetCat) {
        finalCatId = targetCat.id;
        finalCatSlug = targetCat.slug;
      }
    }

    const updated = await prisma.documento.update({
      where: { id: doc.id },
      data: {
        titulo: title !== undefined ? title : doc.titulo,
        descricao: description !== undefined ? description : doc.descricao,
        html: content !== undefined ? content : doc.html,
        ativo: ativo !== undefined ? Boolean(ativo) : doc.ativo,
        categoriaId: finalCatId
      }
    });

    return NextResponse.json({
      success: true,
      key: `${finalCatSlug}/${updated.slug}`,
      link: `/dashboard/${finalCatSlug}/${updated.slug}`,
      categorySlug: finalCatSlug,
      ativo: updated.ativo,
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar documento." }, { status: 500 });
  }
}

// DELETE /api/docs -> Exclui uma página
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "Chave obrigatória" }, { status: 400 });

    const [catSlug, docSlug] = key.split("/");
    const doc = await prisma.documento.findFirst({
      where: { slug: docSlug, categoria: { slug: catSlug } }
    });

    if (doc) {
      await prisma.documento.delete({ where: { id: doc.id }});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir." }, { status: 500 });
  }
}
