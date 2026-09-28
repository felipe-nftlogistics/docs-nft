/**
 * Utilitário de adaptação e conversão de imagem para WebP no navegador
 * Executa antes de enviar ao servidor para economizar banda e armazenamento.
 */

export interface OptimizedImageResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  originalName: string;
  suggestedName: string;
  originalSize: number;
  compressedSize: number;
  originalWidth: number;
  originalHeight: number;
  adaptedWidth: number;
  adaptedHeight: number;
  compressionRatio: number; // Porcentagem economizada (ex: 85%)
}

export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 a 1.0 (padrão 0.82)
}

export async function optimizeAndConvertToWebP(
  sourceFile: File,
  options: OptimizationOptions = {}
): Promise<OptimizedImageResult> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    // Validação básica se é arquivo de imagem
    if (!sourceFile.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem válida."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar a imagem na memória."));
      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // Cálculo proporcional de adaptação de dimensões
          let adaptedWidth = originalWidth;
          let adaptedHeight = originalHeight;

          if (adaptedWidth > maxWidth || adaptedHeight > maxHeight) {
            const ratio = Math.min(maxWidth / adaptedWidth, maxHeight / adaptedHeight);
            adaptedWidth = Math.round(adaptedWidth * ratio);
            adaptedHeight = Math.round(adaptedHeight * ratio);
          }

          // Criação do Canvas de processamento
          const canvas = document.createElement("canvas");
          canvas.width = adaptedWidth;
          canvas.height = adaptedHeight;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Não foi possível inicializar o contexto 2D do Canvas."));
            return;
          }

          // Qualidade de interpolação máxima para manter nitidez
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Desenha a imagem redimensionada
          ctx.drawImage(img, 0, 0, adaptedWidth, adaptedHeight);

          // Converte para WebP com a taxa de qualidade definida
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Erro ao gerar o arquivo WebP no Canvas."));
                return;
              }

              // Gera nome sugerido limpo e com extensão .webp
              const cleanBaseName = sourceFile.name
                .replace(/\.[^/.]+$/, "")
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

              const suggestedName = `${cleanBaseName || "imagem"}.webp`;

              const webpFile = new File([blob], suggestedName, {
                type: "image/webp",
                lastModified: Date.now(),
              });

              const previewUrl = URL.createObjectURL(blob);
              const originalSize = sourceFile.size;
              const compressedSize = blob.size;
              const compressionRatio =
                originalSize > compressedSize
                  ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
                  : 0;

              resolve({
                file: webpFile,
                blob,
                previewUrl,
                originalName: sourceFile.name,
                suggestedName,
                originalSize,
                compressedSize,
                originalWidth,
                originalHeight,
                adaptedWidth,
                adaptedHeight,
                compressionRatio,
              });
            },
            "image/webp",
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(sourceFile);
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
