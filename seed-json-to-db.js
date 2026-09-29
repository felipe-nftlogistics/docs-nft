const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const menusPath = path.join(process.cwd(), 'src', 'data', 'menus.json');
  const docsPath = path.join(process.cwd(), 'src', 'data', 'docContent.json');

  if (!fs.existsSync(menusPath) || !fs.existsSync(docsPath)) {
    console.log('JSON files not found.');
    return;
  }

  const menus = JSON.parse(fs.readFileSync(menusPath, 'utf8'));
  const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'));

  const categorias = menus.menuCategoriaList || [];

  for (const cat of categorias) {
    // Ex: /dashboard/comex -> comex
    const slug = cat.link.replace('/dashboard/', '').replace('/dashboard', '');
    if (!slug) continue; // skip home

    console.log(`Creating category: ${slug}`);
    const createdCat = await prisma.categoria.upsert({
      where: { slug },
      update: {
        titulo: cat.titulo,
        thumb: cat.thumb,
        descricao: cat.descricao,
      },
      create: {
        titulo: cat.titulo,
        slug: slug,
        thumb: cat.thumb,
        descricao: cat.descricao,
      },
    });

    const listKey = slug === 'nota-fiscal' ? 'nota-fiscalList' : `${slug}List`;
    const docList = menus[listKey] || menus[`${slug}List`] || menus.notaList || [];

    for (const doc of docList) {
      const docSlug = doc.link.replace(`/dashboard/${slug}/`, '');
      const docKey = `${slug}/${docSlug}`;
      
      const content = docs[docKey] || { html: `<p>${doc.descricao}</p>`, ativo: true };
      
      console.log(`  Creating document: ${docSlug}`);
      await prisma.documento.upsert({
        where: {
          categoriaId_slug: {
            categoriaId: createdCat.id,
            slug: docSlug,
          }
        },
        update: {
          titulo: doc.titulo,
          thumb: doc.thumb,
          descricao: doc.descricao,
          html: content.html || '',
          ativo: content.ativo !== false,
        },
        create: {
          titulo: doc.titulo,
          slug: docSlug,
          thumb: doc.thumb,
          descricao: doc.descricao,
          html: content.html || '',
          ativo: content.ativo !== false,
          categoriaId: createdCat.id,
        }
      });
    }
  }

  console.log('Migration completed!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
