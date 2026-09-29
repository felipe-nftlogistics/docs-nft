const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (f !== 'prisma.ts' && fs.statSync(dirPath).isDirectory()) {
      walk(dirPath, callback);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx')) {
      callback(path.join(dir, f));
    }
  });
}

const dir = path.join(process.cwd(), 'src');

walk(dir, (filePath) => {
  if (filePath.endsWith('prisma.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = false;

  // Pattern 1: import { PrismaClient } ... const prisma = new PrismaClient();
  const pattern1 = /import\s*{\s*PrismaClient\s*}\s*from\s*(['"])@prisma\/client\1;[\s\n]*const\s+prisma\s*=\s*new\s+PrismaClient\(\);/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, 'import { prisma } from "@/lib/prisma";');
    changed = true;
  }

  // Pattern 2: (if separated)
  const pattern2 = /import\s*{\s*PrismaClient\s*}\s*from\s*(['"])@prisma\/client\1;/g;
  const pattern3 = /const\s+prisma\s*=\s*new\s+PrismaClient\(\);/g;
  
  if (!changed && pattern3.test(content)) {
    content = content.replace(pattern2, 'import { prisma } from "@/lib/prisma";');
    content = content.replace(pattern3, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log('Updated', filePath);
  }
});
