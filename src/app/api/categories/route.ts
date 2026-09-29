import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/categories -> Retorna todas as categorias ativas e menus (para o Sidebar)
export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        documentos: {
          select: {
            titulo: true,
            slug: true,
            thumb: true,
            descricao: true,
            ativo: true,
          },
          orderBy: { id: "asc" }
        }
      },
      orderBy: { id: "asc" }
    });

    // Formatar no mesmo formato que o frontend espera (menuCategoriaList, e [slug]List)
    const menuCategoriaList = categorias.map((cat) => ({
      titulo: cat.titulo,
      link: `/dashboard/${cat.slug}`,
      thumb: cat.thumb || "/assets/img/categories/comex.webp",
      descricao: cat.descricao || ""
    }));

    // Inserir Início no começo
    menuCategoriaList.unshift({
      titulo: "Inicio",
      link: "/dashboard",
      thumb: "/assets/img/categories/comex.webp",
      descricao: "Vamos nos apresentar primeiros?<br> Somos a <span class=\"detalhe-palavra\">NFT Logistics</span>..."
    });

    const responseFormat: any = {
      menuCategoriaList
    };

    categorias.forEach(cat => {
      const listKey = cat.slug === "nota-fiscal" ? "nota-fiscalList" : `${cat.slug}List`;
      responseFormat[listKey] = cat.documentos.map(doc => ({
        titulo: doc.titulo,
        link: `/dashboard/${cat.slug}/${doc.slug}`,
        thumb: doc.thumb,
        descricao: doc.descricao,
        ativo: doc.ativo
      }));
      // compatibilidade
      if (cat.slug === "nota-fiscal") {
        responseFormat["notaList"] = responseFormat[listKey];
      }
    });

    return NextResponse.json(responseFormat);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erro ao buscar categorias" }, { status: 500 });
  }
}

// POST /api/categories -> Cria uma nova categoria
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { titulo, slug, descricao, thumb } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "O título da categoria é obrigatório." }, { status: 400 });
    }

    const baseSlug = (slug && slug.trim()) ? slug : titulo;
    const cleanSlug = baseSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const exists = await prisma.categoria.findUnique({ where: { slug: cleanSlug }});
    if (exists) {
       return NextResponse.json({ error: "Já existe uma categoria com este nome ou slug." }, { status: 400 });
    }

    const defaultThumb = thumb && thumb.trim() ? thumb.trim() : "/assets/img/categories/comex.webp";

    const cat = await prisma.categoria.create({
      data: {
        titulo: titulo.trim(),
        slug: cleanSlug,
        descricao: descricao?.trim() || `Documentações e procedimentos sobre ${titulo.trim()}.`,
        thumb: defaultThumb
      }
    });

    return NextResponse.json({
      success: true,
      category: {
        slug: cat.slug,
        name: cat.titulo,
        listKey: `${cat.slug}List`,
        thumb: cat.thumb,
        descricao: cat.descricao,
      },
    });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json({ error: "Erro interno ao cadastrar categoria." }, { status: 500 });
  }
}

// PUT /api/categories -> Atualiza uma categoria existente
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { originalSlug, titulo, descricao, thumb } = body;

    const cat = await prisma.categoria.findUnique({ where: { slug: originalSlug } });
    if (!cat) return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });

    const updated = await prisma.categoria.update({
      where: { id: cat.id },
      data: {
        titulo: titulo ? titulo.trim() : cat.titulo,
        descricao: descricao !== undefined ? descricao.trim() : cat.descricao,
        thumb: thumb !== undefined ? thumb.trim() : cat.thumb
      }
    });

    return NextResponse.json({
      success: true,
      category: {
        slug: updated.slug,
        name: updated.titulo,
        listKey: `${updated.slug}List`,
        thumb: updated.thumb,
        descricao: updated.descricao,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno ao atualizar categoria." }, { status: 500 });
  }
}

// DELETE /api/categories?slug=... -> Exclui uma categoria
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) return NextResponse.json({ error: "Slug obrigatório" }, { status: 400 });

    await prisma.categoria.delete({ where: { slug }});

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    return NextResponse.json({ error: "Erro interno ao excluir categoria." }, { status: 500 });
  }
}
