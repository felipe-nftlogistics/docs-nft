import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs";
import path from "path";

const menusPath = path.join(process.cwd(), "src", "data", "menus.json");

function getMenus() {
  if (!fs.existsSync(menusPath)) return {};
  const data = fs.readFileSync(menusPath, "utf8");
  return JSON.parse(data);
}

function saveMenus(data: any) {
  fs.writeFileSync(menusPath, JSON.stringify(data, null, 2), "utf8");
}

// GET /api/categories -> Retorna todas as categorias ativas
export async function GET() {
  const menus = getMenus();
  const list = (menus.menuCategoriaList || [])
    .filter((cat: any) => cat.link !== "/dashboard")
    .map((cat: any) => {
      const slug = cat.link.replace("/dashboard/", "");
      const listKey = slug === "nota-fiscal" ? "nota-fiscalList" : `${slug}List`;
      return {
        slug,
        name: cat.titulo,
        listKey,
        thumb: cat.thumb,
        descricao: cat.descricao || "",
      };
    });

  return NextResponse.json(list);
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

    // Normaliza slug ou gera a partir do título
    const baseSlug = (slug && slug.trim()) ? slug : titulo;
    const cleanSlug = baseSlug
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "");

    if (!cleanSlug) {
      return NextResponse.json({ error: "Slug inválido para a categoria." }, { status: 400 });
    }

    const categoryLink = `/dashboard/${cleanSlug}`;
    const listKey = `${cleanSlug}List`;

    const menus = getMenus();
    if (!menus.menuCategoriaList) {
      menus.menuCategoriaList = [];
    }

    // Verifica se já existe
    const exists = menus.menuCategoriaList.some(
      (cat: any) => cat.link === categoryLink || cat.titulo.toLowerCase() === titulo.trim().toLowerCase()
    );

    if (exists) {
      return NextResponse.json(
        { error: "Já existe uma categoria com este nome ou slug." },
        { status: 400 }
      );
    }

    // Define thumbnail padrão
    const defaultThumb = thumb && thumb.trim() ? thumb.trim() : "/assets/img/categories/comex.webp";

    const newCategoryItem = {
      titulo: titulo.trim(),
      link: categoryLink,
      thumb: defaultThumb,
      descricao: descricao?.trim() || `Documentações e procedimentos sobre ${titulo.trim()}.`
    };

    menus.menuCategoriaList.push(newCategoryItem);

    // Inicializa a lista de páginas dessa categoria
    if (!menus[listKey]) {
      menus[listKey] = [];
    }

    saveMenus(menus);

    const createdCategory = {
      slug: cleanSlug,
      name: newCategoryItem.titulo,
      listKey,
      thumb: newCategoryItem.thumb,
      descricao: newCategoryItem.descricao,
    };

    return NextResponse.json({
      success: true,
      category: createdCategory,
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

    if (!originalSlug) {
      return NextResponse.json({ error: "Slug original da categoria é obrigatório." }, { status: 400 });
    }

    if (!titulo || !titulo.trim()) {
      return NextResponse.json({ error: "O título da categoria é obrigatório." }, { status: 400 });
    }

    const menus = getMenus();
    const originalLink = `/dashboard/${originalSlug}`;

    if (!menus.menuCategoriaList || !Array.isArray(menus.menuCategoriaList)) {
      return NextResponse.json({ error: "Categorias não encontradas." }, { status: 404 });
    }

    const catIndex = menus.menuCategoriaList.findIndex((c: any) => c.link === originalLink);
    if (catIndex === -1) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    // Atualiza os dados da categoria
    menus.menuCategoriaList[catIndex].titulo = titulo.trim();
    if (descricao !== undefined) {
      menus.menuCategoriaList[catIndex].descricao = descricao.trim();
    }
    if (thumb !== undefined && thumb.trim()) {
      menus.menuCategoriaList[catIndex].thumb = thumb.trim();
    }

    saveMenus(menus);

    const updatedCategory = {
      slug: originalSlug,
      name: menus.menuCategoriaList[catIndex].titulo,
      listKey: originalSlug === "nota-fiscal" ? "nota-fiscalList" : `${originalSlug}List`,
      thumb: menus.menuCategoriaList[catIndex].thumb,
      descricao: menus.menuCategoriaList[catIndex].descricao,
    };

    return NextResponse.json({
      success: true,
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Erro ao atualizar categoria:", error);
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

    if (!slug) {
      return NextResponse.json({ error: "Slug da categoria é obrigatório." }, { status: 400 });
    }

    const menus = getMenus();
    const linkToRemove = `/dashboard/${slug}`;
    const listKey = slug === "nota-fiscal" ? "nota-fiscalList" : `${slug}List`;

    // Preserva as páginas associadas na lista de órfãos (semCategoriaList) para que possam ser reatribuídas
    const categoryItems = (menus[listKey] || []).map((it: any) => ({
      ...it,
      originalCategory: slug,
      originalLink: it.link,
      link: it.link.replace(`/dashboard/${slug}/`, `/dashboard/sem-categoria/`),
      categorySlug: "sem-categoria",
      ativo: false, // Oculto para o usuário final
    }));

    if (categoryItems.length > 0) {
      menus.semCategoriaList = [
        ...(menus.semCategoriaList || []).filter((it: any) => it.originalCategory !== slug),
        ...categoryItems,
      ];
    }

    menus.menuCategoriaList = (menus.menuCategoriaList || []).filter((c: any) => c.link !== linkToRemove);
    if (menus[listKey]) {
      delete menus[listKey];
    }

    saveMenus(menus);

    return NextResponse.json({ success: true, slug });
  } catch (error) {
    console.error("Erro ao excluir categoria:", error);
    return NextResponse.json({ error: "Erro interno ao excluir categoria." }, { status: 500 });
  }
}
