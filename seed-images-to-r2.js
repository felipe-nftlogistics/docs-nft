const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_BUCKET_NAME) {
  console.error("ERRO: As variáveis de ambiente do Cloudflare R2 não estão configuradas no .env");
  process.exit(1);
}

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const prisma = new PrismaClient();
const BASE_IMG_DIR = path.join(process.cwd(), "public", "assets", "img");
const META_FILE = path.join(BASE_IMG_DIR, "gallery-meta.json");

async function main() {
  let metadataMap = {};
  if (fs.existsSync(META_FILE)) {
    metadataMap = JSON.parse(fs.readFileSync(META_FILE, "utf-8"));
  }

  const folders = ["uploads", "prints", "categories"];

  for (const folder of folders) {
    const folderPath = path.join(BASE_IMG_DIR, folder);
    if (!fs.existsSync(folderPath)) continue;

    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      if (!file.match(/\.(png|jpe?g|webp|gif|svg)$/i)) continue;

      const filePath = path.join(folderPath, file);
      const relativeUrl = `/assets/img/${folder}/${file}`;
      const objectKey = `${folder}/${file}`;
      const publicUrl = `${R2_PUBLIC_URL}/${objectKey}`;

      console.log(`Processando ${objectKey}...`);

      const stats = fs.statSync(filePath);
      let buffer = fs.readFileSync(filePath);
      
      let width = null;
      let height = null;
      
      try {
        const meta = await sharp(buffer).metadata();
        width = meta.width;
        height = meta.height;
      } catch(e) {}

      // Upload para o R2
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: objectKey,
          Body: buffer,
          ContentType: "image/" + (file.split('.').pop() === 'svg' ? 'svg+xml' : 'webp'),
        }));
        console.log(`  -> Upload concluído para o R2.`);
      } catch (err) {
        console.error(`  -> Erro ao enviar para o R2:`, err.message);
        continue;
      }

      // Salvar no Banco de Dados SQLite
      const metaInfo = metadataMap[relativeUrl] || {};
      const category = metaInfo.category || (folder === "categories" ? "Categorias" : folder === "prints" ? "Prints" : "Geral");
      const profiles = metaInfo.profiles || ["Administrador", "Usuário Padrão"];

      await prisma.imagem.upsert({
        where: { url: publicUrl },
        update: {
          nome: file,
          folder: folder,
          size: stats.size,
          width,
          height,
          categoria: category,
          profiles: JSON.stringify(profiles)
        },
        create: {
          nome: file,
          url: publicUrl,
          folder: folder,
          size: stats.size,
          width,
          height,
          categoria: category,
          profiles: JSON.stringify(profiles)
        }
      });
      console.log(`  -> Salvo no banco de dados SQLite.`);
    }
  }

  console.log("Migração concluída com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
