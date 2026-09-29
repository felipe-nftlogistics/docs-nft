const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function main() {
  if (!R2_PUBLIC_URL) {
    console.log("R2_PUBLIC_URL não definido.");
    return;
  }
  
  const docs = await prisma.documento.findMany();
  let updated = 0;

  for (const doc of docs) {
    let newHtml = doc.html;
    // Replace /assets/img/uploads/ or /assets/img/prints/ with the R2 public URL
    newHtml = newHtml.replace(/\/assets\/img\/(uploads|prints)\//g, `${R2_PUBLIC_URL}/$1/`);
    
    if (newHtml !== doc.html) {
      await prisma.documento.update({
        where: { id: doc.id },
        data: { html: newHtml }
      });
      updated++;
    }
  }

  // Atualizar thumbs de categorias se necessário
  const cats = await prisma.categoria.findMany();
  for (const cat of cats) {
    if (cat.thumb && cat.thumb.startsWith('/assets/img/')) {
      const newThumb = cat.thumb.replace(/\/assets\/img\/(categories)\//g, `${R2_PUBLIC_URL}/$1/`);
      if (newThumb !== cat.thumb) {
        await prisma.categoria.update({
          where: { id: cat.id },
          data: { thumb: newThumb }
        });
      }
    }
  }

  console.log(`Atualizados ${updated} documentos com links do R2.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
