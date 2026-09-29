const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function importData() {
  const rawData = fs.readFileSync('db-export.json', 'utf-8');
  const data = JSON.parse(rawData);

  console.log("Importando Usuários...");
  for (const user of data.usuarios) {
    await prisma.usuario.upsert({
      where: { email: user.email },
      update: user,
      create: user
    });
  }

  console.log("Importando Categorias...");
  for (const cat of data.categorias) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat
    });
  }

  console.log("Importando Documentos...");
  for (const doc of data.documentos) {
    await prisma.documento.upsert({
      where: { categoriaId_slug: { categoriaId: doc.categoriaId, slug: doc.slug } },
      update: doc,
      create: doc
    });
  }

  console.log("Importando Imagens...");
  for (const img of data.imagens) {
    await prisma.imagem.upsert({
      where: { url: img.url },
      update: img,
      create: img
    });
  }

  console.log("Migração concluída com sucesso para o Postgres!");
}

importData().catch(console.error).finally(() => prisma.$disconnect());
