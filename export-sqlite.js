const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportData() {
  const usuarios = await prisma.usuario.findMany();
  const categorias = await prisma.categoria.findMany();
  const documentos = await prisma.documento.findMany();
  const imagens = await prisma.imagem.findMany();

  const data = {
    usuarios,
    categorias,
    documentos,
    imagens
  };

  fs.writeFileSync('db-export.json', JSON.stringify(data, null, 2));
  console.log("Dados do SQLite exportados para db-export.json");
}

exportData().catch(console.error).finally(() => prisma.$disconnect());
