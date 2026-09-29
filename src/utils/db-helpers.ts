import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getMenusFromDB = cache(async () => {
  const categorias = await prisma.categoria.findMany({
    include: {
      documentos: {
        orderBy: { id: "asc" }
      }
    },
    orderBy: { id: "asc" }
  });

  const menuCategoriaList = categorias.map((cat) => ({
    titulo: cat.titulo,
    link: `/dashboard/${cat.slug}`,
    thumb: cat.thumb || "/assets/img/categories/comex.webp",
    descricao: cat.descricao || ""
  }));

  menuCategoriaList.unshift({
    titulo: "Inicio",
    link: "/dashboard",
    thumb: "/assets/img/categories/comex.webp",
    descricao: "Vamos nos apresentar primeiros?<br> Somos a <span class=\"detalhe-palavra\">NFT Logistics</span> empresa especialista..."
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
    if (cat.slug === "nota-fiscal") {
      responseFormat["notaList"] = responseFormat[listKey];
    }
  });

  responseFormat.linksList = [
    {
      "titulo": "Controle de Processos",
      "link": "https://docs.google.com/spreadsheets/d/1AdyWmSlqCaVaPJ0khW2siap-kVzNxu-n8kdyZu5u7SU/",
      "icon": "FileSpreadsheet"
    },
    {
      "titulo": "Shipping Instructions",
      "link": "https://docs.google.com/spreadsheets/d/1SmcXzTR6JgtUghmTnnsb4R60YviUd97ubPx2U9S9DCM/",
      "icon": "FileSpreadsheet"
    },
    {
      "titulo": "Condições Tarifarias",
      "link": "https://docs.google.com/spreadsheets/d/1s4AkHDImm_9_K_ZmxqoOR8XW8Z_PDnGNYX8-GnKbTR4/",
      "icon": "FileSpreadsheet"
    },
    {
      "titulo": "Criação de NF 3.0",
      "link": "https://docs.google.com/spreadsheets/d/15XUuIXBEIPooHuejX-UIDM1A8ce32rvr8hKXch6rIFU/",
      "icon": "FileSpreadsheet"
    },
    {
      "titulo": "Criação de E-mail Transporte",
      "link": "https://docs.google.com/spreadsheets/d/1SiqiMWd6oiFbe6trus6tzDG1C87yJyT7X2BU12V22x4/",
      "icon": "FileSpreadsheet"
    },
    {
      "titulo": "Fluxo de Trabalho - ADM",
      "link": "https://docs.google.com/drawings/d/1RHly08ko7_6ZIVB0NGY1-yfoUkbIeVy5Yw8DkYbp8po/edit",
      "icon": "Workflow"
    },
    {
      "titulo": "Fluxo de Trabalho - Feira",
      "link": "https://docs.google.com/drawings/d/1RHly08ko7_6ZIVB0NGY1-yfoUkbIeVy5Yw8DkYbp8po/edit",
      "icon": "Workflow"
    }
  ];

  return responseFormat;
});
export const getDocContentFromDB = cache(async (key: string) => {
  const [catSlug, docSlug] = key.split("/");
  const doc = await prisma.documento.findFirst({
    where: { slug: docSlug, categoria: { slug: catSlug } }
  });
  if (!doc) return null;
  return {
    title: doc.titulo,
    html: doc.html,
    ativo: doc.ativo
  };
});
