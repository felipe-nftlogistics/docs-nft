const fs = require('fs');
const path = require('path');

const files = [
  'comex/cct.php',
  'comex/desbloqueio-bl.php',
  'comex/dta-remocao.php',
  'comex/exportacao.php',
  'comex/importacao.php',
  'comex/mercante.php',
  'comex/reexportacao.php',
  'controles/processos.php',
  'controles/shipping-instructions.php',
  'nota-fiscal/cfop.php',
  'nota-fiscal/emissor.php',
  'nota-fiscal/planilha-xml.php',
  'procedimentos/ati-multilog.php',
  'procedimentos/coleta-transportadora.php',
  'procedimentos/epi.php',
  'procedimentos/referencia-despachante.php',
  'procedimentos/referencia-interna.php',
  'procedimentos/traducao.php',
  'produtividade/codigos-programacao.php',
  'produtividade/excel.php',
  'tabelas/lista-contatos.php',
  'tabelas/lista-expositores.php',
  'tabelas/lista-feiras.php'
];

const basePath = path.resolve('../public_html/doc');
const result = {};

files.forEach(f => {
  const full = path.join(basePath, f);
  if (!fs.existsSync(full)) {
    console.log('NOT FOUND:', f);
    return;
  }
  const content = fs.readFileSync(full, 'utf8');
  const match = content.match(/<section id="doc-info">([\s\S]*?)<\/section>/i);
  if (match) {
    const inner = match[1].trim();
    // Extract title if present
    const titleMatch = inner.match(/<h1 id="page-name">([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    
    // Clean content
    const clean = inner
      .replace(/<h1 id="page-name">[\s\S]*?<\/h1>/i, '')
      .replace(/<p id="page-description">[\s\S]*?<\/p>/i, '')
      .replace(/<hr\s*\/?>/i, '')
      .trim();

    // category and slug: e.g. comex/cct.php -> key = "comex/cct"
    const key = f.replace('.php', '').replace(/\\/g, '/');
    result[key] = {
      title,
      html: clean
    };
    console.log(key, '-> Length:', clean.length, 'chars');
  } else {
    console.log(f, '-> NO doc-info matched!');
  }
});

const outputPath = path.resolve('./src/data/docContent.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
console.log('Successfully wrote', Object.keys(result).length, 'documents to', outputPath);
