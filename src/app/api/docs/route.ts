import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import fs from "fs";
import path from "path";

const docContentPath = path.join(process.cwd(), "src", "data", "docContent.json");
const menusPath = path.join(process.cwd(), "src", "data", "menus.json");

function getDocContent() {
  if (!fs.existsSync(docContentPath)) return {};
  const data = fs.readFileSync(docContentPath, "utf8");
  return JSON.parse(data);
}

function saveDocContent(data: any) {
  fs.writeFileSync(docContentPath, JSON.stringify(data, null, 2), "utf8");
}

function getMenus() {
  if (!fs.existsSync(menusPath)) return {};
  const data = fs.readFileSync(menusPath, "utf8");
  return JSON.parse(data);
}

function saveMenus(data: any) {
  fs.writeFileSync(menusPath, JSON.stringify(data, null, 2), "utf8");
}

// GET /api/docs?key=comex/cct
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const docContent = getDocContent();

  if (key) {
    if (!docContent[key]) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(docContent[key]);
  }

  // Retorna todos os documentos
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

    if (!categoria || !slug || !title) {
      return NextResponse.json({ error: "Categoria, slug e título são obrigatórios." }, { status: 400 });
    }

    // Normaliza slug
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "");

    const key = `${categoria}/${cleanSlug}`;
    const pageUrl = `/dashboard/${categoria}/${cleanSlug}`;

    // 1. Atualizar docContent.json
    const docContent = getDocContent();
    docContent[key] = {
      title,
      html: content || `<p>${description || title}</p>`,
      ativo: Boolean(ativo)
    };
    saveDocContent(docContent);

    // 2. Atualizar menus.json
    const menus = getMenus();
    const listKey = categoria === "nota-fiscal" ? "nota-fiscalList" : `${categoria}List`;

    if (!menus[listKey]) {
      menus[listKey] = [];
    }

    // Verifica se já existe na lista
    const existingIndex = menus[listKey].findIndex((item: any) => item.link === pageUrl);
    const newMenuItem = {
      titulo: title,
      link: pageUrl,
      thumb: thumb || `/assets/img/categories/${categoria}.webp`,
      descricao: description || "",
      ativo: Boolean(ativo)
    };

    if (existingIndex >= 0) {
      menus[listKey][existingIndex] = newMenuItem;
    } else {
      menus[listKey].push(newMenuItem);
    }

    // Se for nota-fiscal, sincroniza com notaList também
    if (categoria === "nota-fiscal" && menus["notaList"]) {
      const idxNota = menus["notaList"].findIndex((item: any) => item.link === pageUrl);
      if (idxNota >= 0) {
        menus["notaList"][idxNota] = newMenuItem;
      } else {
        menus["notaList"].push(newMenuItem);
      }
    }

    saveMenus(menus);

    return NextResponse.json({ 
      success: true, 
      key, 
      link: pageUrl,
      ativo: Boolean(ativo)
    });
  } catch (error) {
    console.error("Erro ao criar página:", error);
    return NextResponse.json({ error: "Erro ao criar documento." }, { status: 500 });
  }
}

// PUT /api/docs -> Atualiza uma página existente (incluindo status ativo/inativo)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, title, description, content, ativo, newCategory } = body;

    if (!key) {
      return NextResponse.json({ error: "Chave do documento é obrigatória." }, { status: 400 });
    }

    const docContent = getDocContent();
    const currentDoc = docContent[key] || {};
    const menus = getMenus();

    // Reatribuição de Categoria para páginas órfãs ou existentes
    if (newCategory) {
      const targetCat = (menus.menuCategoriaList || []).find(
        (c: any) => c.link === `/dashboard/${newCategory}`
      );

      if (!targetCat) {
        return NextResponse.json({ error: "Categoria de destino não encontrada." }, { status: 404 });
      }

      const rawSlug = key.includes("/") ? key.split("/")[1] : key;
      const cleanSlug = rawSlug
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^\w\-]+/g, "");

      const newKey = `${newCategory}/${cleanSlug}`;
      const newPageUrl = `/dashboard/${newCategory}/${cleanSlug}`;

      // 1. Atualiza docContent.json
      docContent[newKey] = {
        title: title || currentDoc.title || cleanSlug,
        html: content !== undefined ? content : currentDoc.html || `<p>${description || title || cleanSlug}</p>`,
        ativo: ativo !== undefined ? Boolean(ativo) : currentDoc.ativo !== false,
      };

      if (newKey !== key && docContent[key]) {
        delete docContent[key];
      }
      saveDocContent(docContent);

      // 2. Atualiza menus.json
      const targetListKey = newCategory === "nota-fiscal" ? "nota-fiscalList" : `${newCategory}List`;
      if (!menus[targetListKey]) {
        menus[targetListKey] = [];
      }

      // Remove da categoria anterior se mudou de categoria
      const oldCat = key.includes("/") ? key.split("/")[0] : null;
      if (oldCat && oldCat !== newCategory && oldCat !== "sem-categoria") {
        const oldListKey = oldCat === "nota-fiscal" ? "nota-fiscalList" : `${oldCat}List`;
        if (menus[oldListKey] && Array.isArray(menus[oldListKey])) {
          menus[oldListKey] = menus[oldListKey].filter(
            (it: any) =>
              it.link !== `/dashboard/${key}` &&
              it.link !== `/dashboard/${oldCat}/${cleanSlug}`
          );
        }
        if (oldCat === "nota-fiscal" && menus.notaList && Array.isArray(menus.notaList)) {
          menus.notaList = menus.notaList.filter(
            (it: any) =>
              it.link !== `/dashboard/${key}` &&
              it.link !== `/dashboard/${oldCat}/${cleanSlug}`
          );
        }
      }

      // Remove de semCategoriaList se constar lá
      if (menus.semCategoriaList && Array.isArray(menus.semCategoriaList)) {
        menus.semCategoriaList = menus.semCategoriaList.filter(
          (it: any) =>
            it.link !== `/dashboard/sem-categoria/${cleanSlug}` &&
            it.originalLink !== `/dashboard/${key}` &&
            it.key !== key
        );
      }

      const existingIdx = menus[targetListKey].findIndex((it: any) => it.link === newPageUrl);
      const newMenuItem = {
        titulo: title || currentDoc.title || cleanSlug,
        link: newPageUrl,
        thumb: `/assets/img/categories/${newCategory}.webp`,
        descricao: description !== undefined ? description : currentDoc.descricao || "",
        ativo: ativo !== undefined ? Boolean(ativo) : true,
      };

      if (existingIdx >= 0) {
        menus[targetListKey][existingIdx] = newMenuItem;
      } else {
        menus[targetListKey].push(newMenuItem);
      }

      // Sincroniza com notaList se a categoria for nota-fiscal
      if (newCategory === "nota-fiscal" && menus.notaList && Array.isArray(menus.notaList)) {
        const idxNota = menus.notaList.findIndex((it: any) => it.link === newPageUrl);
        if (idxNota >= 0) {
          menus.notaList[idxNota] = newMenuItem;
        } else {
          menus.notaList.push(newMenuItem);
        }
      }

      saveMenus(menus);

      return NextResponse.json({
        success: true,
        key: newKey,
        link: newPageUrl,
        categorySlug: newCategory,
        categoryName: targetCat.titulo,
        title: newMenuItem.titulo,
        description: newMenuItem.descricao,
        ativo: newMenuItem.ativo,
      });
    }

    // 1. Atualizar docContent.json padrão
    if (!docContent[key]) {
      docContent[key] = {};
    }
    
    if (title) docContent[key].title = title;
    if (content !== undefined) docContent[key].html = content;
    if (ativo !== undefined) docContent[key].ativo = Boolean(ativo);
    saveDocContent(docContent);

    // 2. Atualizar menus.json se título, descrição ou status mudaram
    const [categoria, slug] = key.split("/");
    const pageUrl = `/dashboard/${categoria}/${slug}`;
    const listKey = categoria === "nota-fiscal" ? "nota-fiscalList" : `${categoria}List`;

    if (menus[listKey] && Array.isArray(menus[listKey])) {
      const item = menus[listKey].find((it: any) => it.link === pageUrl);
      if (item) {
        if (title) item.titulo = title;
        if (description !== undefined) item.descricao = description;
        if (ativo !== undefined) item.ativo = Boolean(ativo);
      }
    }

    if (categoria === "nota-fiscal" && menus["notaList"]) {
      const item = menus["notaList"].find((it: any) => it.link === pageUrl);
      if (item) {
        if (title) item.titulo = title;
        if (description !== undefined) item.descricao = description;
        if (ativo !== undefined) item.ativo = Boolean(ativo);
      }
    }

    saveMenus(menus);

    return NextResponse.json({ success: true, key, ativo });
  } catch (error) {
    console.error("Erro ao atualizar documento:", error);
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

    if (!key) {
      return NextResponse.json({ error: "Chave do documento é obrigatória." }, { status: 400 });
    }

    // 1. Remover de docContent.json
    const docContent = getDocContent();
    if (docContent[key]) {
      delete docContent[key];
      saveDocContent(docContent);
    }

    // 2. Remover de menus.json
    const [categoria, slug] = key.split("/");
    const pageUrl = `/dashboard/${categoria}/${slug}`;
    const menus = getMenus();
    const listKey = categoria === "nota-fiscal" ? "nota-fiscalList" : `${categoria}List`;

    if (menus[listKey] && Array.isArray(menus[listKey])) {
      menus[listKey] = menus[listKey].filter((it: any) => it.link !== pageUrl);
    }

    if (categoria === "nota-fiscal" && menus["notaList"]) {
      menus["notaList"] = menus["notaList"].filter((it: any) => it.link !== pageUrl);
    }

    saveMenus(menus);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir página:", error);
    return NextResponse.json({ error: "Erro ao excluir página." }, { status: 500 });
  }
}
