"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Search,
  Copy,
  Check,
  Code,
  Trash2,
  ZoomIn,
  Sliders,
  Image as ImageIcon,
  X,
  ArrowRight,
  RefreshCw,
  Edit2,
  Users,
  Shield,
  Tag,
  FolderOpen,
} from "lucide-react";
import {
  optimizeAndConvertToWebP,
  formatBytes,
  OptimizedImageResult,
} from "@/utils/imageOptimizer";

export interface GalleryImage {
  id: string;
  name: string;
  url: string;
  folder: string;
  size: number;
  updatedAt: string;
  width?: number;
  height?: number;
  category?: string;
  profiles?: string[];
}

interface SystemCategory {
  slug: string;
  title: string;
}

interface GalleryClientProps {
  initialImages: GalleryImage[];
  systemCategories: SystemCategory[];
  initialCounts: {
    total: number;
    uploads: number;
    prints: number;
    categories: number;
  };
}

interface StagedUploadItem {
  id: string;
  originalFile: File;
  result: OptimizedImageResult;
  customName: string;
  targetFolder: "uploads" | "prints" | "categories";
  category: string;
  profiles: string[];
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
}

const AVAILABLE_PROFILES = ["Administrador", "Usuário Padrão"];

export function GalleryClient({
  initialImages,
  systemCategories,
  initialCounts,
}: GalleryClientProps) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [counts, setCounts] = useState(initialCounts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // Configurações de Adaptação / Otimização
  const [maxWidth, setMaxWidth] = useState<number>(1600);
  const [quality, setQuality] = useState<number>(0.82);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Fila de imagens selecionadas para pré-visualização e upload
  const [stagedItems, setStagedItems] = useState<StagedUploadItem[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Feedback de cópia (ID da imagem ou tag copiada)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox
  const [previewModalImage, setPreviewModalImage] = useState<GalleryImage | null>(null);

  // Confirmação de exclusão
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estado para Edição de Informações da Imagem
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("Geral");
  const [editProfiles, setEditProfiles] = useState<string[]>(["Administrador", "Usuário Padrão"]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Atualiza as dimensões dinamicamente no cliente caso não tenham sido lidas no servidor
  const handleImageNaturalSize = (id: string, naturalWidth: number, naturalHeight: number) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === id && (!img.width || !img.height)
          ? { ...img, width: naturalWidth, height: naturalHeight }
          : img
      )
    );
  };

  // Abre modal de edição
  const handleOpenEdit = (img: GalleryImage) => {
    setEditingImage(img);
    setEditName(img.name);
    setEditCategory(img.category || "Geral");
    setEditProfiles(img.profiles && img.profiles.length > 0 ? img.profiles : ["Administrador", "Usuário Padrão"]);
    setEditError("");
    setEditSuccess(false);
  };

  // Alterna perfil no modal de edição
  const toggleProfile = (profile: string) => {
    if (editProfiles.includes(profile)) {
      if (editProfiles.length === 1) {
        setEditError("A imagem deve ter ao menos um perfil associado.");
        return;
      }
      setEditProfiles(editProfiles.filter((p) => p !== profile));
    } else {
      setEditProfiles([...editProfiles, profile]);
    }
    setEditError("");
  };

  // Salva alterações de informações da imagem
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingImage) return;

    if (!editName.trim()) {
      setEditError("O nome da imagem não pode ficar vazio.");
      return;
    }

    if (editProfiles.length === 0) {
      setEditError("Selecione ao menos um perfil de acesso.");
      return;
    }

    setEditLoading(true);
    setEditError("");

    try {
      const res = await fetch("/api/gallery", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editingImage.url,
          newName: editName.trim(),
          category: editCategory,
          profiles: editProfiles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar informações.");
      }

      // Atualiza o estado local
      setImages((prev) =>
        prev.map((img) =>
          img.url === editingImage.url
            ? {
                ...img,
                name: data.image.name,
                url: data.image.url,
                category: data.image.category,
                profiles: data.image.profiles,
              }
            : img
        )
      );

      setEditSuccess(true);
      setTimeout(() => {
        setEditingImage(null);
        setEditSuccess(false);
      }, 700);
    } catch (err: any) {
      setEditError(err.message || "Erro inesperado ao salvar alterações.");
    } finally {
      setEditLoading(false);
    }
  };

  // Processa arquivos selecionados convertendo para WebP no navegador
  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setIsProcessingQueue(true);
    const newStaged: StagedUploadItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!file.type.startsWith("image/")) continue;

      try {
        const result = await optimizeAndConvertToWebP(file, {
          maxWidth,
          maxHeight: maxWidth,
          quality,
        });

        newStaged.push({
          id: `stage_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          originalFile: file,
          result,
          customName: result.suggestedName.replace(/\.webp$/, ""),
          targetFolder: "uploads",
          category: systemCategories[0]?.title || "Geral",
          profiles: ["Administrador", "Usuário Padrão"],
          status: "idle",
        });
      } catch (err: any) {
        console.error("Erro na conversão da imagem:", err);
      }
    }

    setStagedItems((prev) => [...newStaged, ...prev]);
    setIsProcessingQueue(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload individual
  const handleUploadSingle = async (item: StagedUploadItem) => {
    setStagedItems((prev) =>
      prev.map((s) => (s.id === item.id ? { ...s, status: "uploading", errorMessage: "" } : s))
    );

    try {
      const formData = new FormData();
      formData.append("file", item.result.file);
      formData.append("folder", item.targetFolder);
      formData.append("name", item.customName);
      formData.append("category", item.category);
      formData.append("profiles", JSON.stringify(item.profiles));

      const res = await fetch("/api/gallery", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro no upload.");
      }

      setStagedItems((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, status: "success" } : s))
      );

      // Adiciona à lista local de imagens com dimensões obtidas
      const finalImage: GalleryImage = {
        ...data.image,
        width: item.result.adaptedWidth,
        height: item.result.adaptedHeight,
        category: item.category,
        profiles: item.profiles,
      };

      setImages((prev) => [finalImage, ...prev]);
      setCounts((prev) => ({
        ...prev,
        total: prev.total + 1,
        [item.targetFolder]: (prev as any)[item.targetFolder] + 1,
      }));

      // Remove do palco após 1.2s
      setTimeout(() => {
        setStagedItems((prev) => prev.filter((s) => s.id !== item.id));
      }, 1200);
    } catch (err: any) {
      setStagedItems((prev) =>
        prev.map((s) =>
          s.id === item.id ? { ...s, status: "error", errorMessage: err.message } : s
        )
      );
    }
  };

  // Upload em lote de todos os itens pendentes
  const handleUploadAll = async () => {
    const pending = stagedItems.filter((s) => s.status === "idle" || s.status === "error");
    for (const item of pending) {
      await handleUploadSingle(item);
    }
  };

  // Excluir imagem
  const handleDeleteImage = async () => {
    if (!imageToDelete) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/gallery?url=${encodeURIComponent(imageToDelete.url)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao excluir imagem.");
      }

      setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
      setCounts((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        [imageToDelete.folder]: Math.max(0, (prev as any)[imageToDelete.folder] - 1),
      }));
      setImageToDelete(null);
    } catch (err: any) {
      alert(err.message || "Não foi possível excluir a imagem.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Copiar link ou HTML com feedback visual
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  // Categorias únicas para filtro
  const allCategoryTags = Array.from(
    new Set([
      "Geral",
      ...systemCategories.map((c) => c.title),
      ...images.map((img) => img.category).filter(Boolean),
    ])
  ) as string[];

  // Filtros de imagens
  const filteredImages = images.filter((img) => {
    const matchesFolder = selectedFolder === "all" || img.folder === selectedFolder;
    const matchesCategory =
      selectedCategoryFilter === "all" || img.category === selectedCategoryFilter;
    const matchesSearch =
      img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (img.category && img.category.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFolder && matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* SEÇÃO 1: ÁREA DE UPLOAD E TRATAMENTO WEBP */}
      <div className="bg-muted border border-border rounded-2xl p-6 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-heading flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload & Otimização de Imagens
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste ou selecione arquivos. O navegador adaptará o tamanho em pixels e converterá para{" "}
              <span className="font-semibold text-primary">WebP</span> antes do upload.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              showSettings
                ? "bg-primary text-white border-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Ajustar Parâmetros ({maxWidth}px • {Math.round(quality * 100)}%)
          </button>
        </div>

        {/* Painel Expansível de Ajustes */}
        {showSettings && (
          <div className="p-4 bg-background border border-border rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Resolução Máxima: <span className="text-primary">{maxWidth}px</span>
              </label>
              <div className="flex items-center gap-2">
                {[1280, 1600, 1920, 2560].map((px) => (
                  <button
                    key={px}
                    type="button"
                    onClick={() => setMaxWidth(px)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                      maxWidth === px
                        ? "bg-primary text-white border-primary"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {px}px {px === 1600 && "(Padrão)"}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Imagens maiores serão proporcionalmente reduzidas para caber neste limite de pixels.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Qualidade de Compressão WebP:{" "}
                <span className="text-primary">{Math.round(quality * 100)}%</span>
              </label>
              <div className="flex items-center gap-2">
                {[
                  { label: "Leve (70%)", val: 0.7 },
                  { label: "Equilibrada (82%)", val: 0.82 },
                  { label: "Alta (90%)", val: 0.9 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setQuality(item.val)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-medium cursor-pointer transition-colors ${
                      quality === item.val
                        ? "bg-primary text-white border-primary"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                82% oferece nitidez excelente para prints e diagramas com economia de até 95%.
              </p>
            </div>
          </div>
        )}

        {/* Zona de Drop / Clique */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.005]"
              : "border-border hover:border-primary/50 hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/avif,image/bmp,image/gif"
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            {isProcessingQueue ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {isProcessingQueue
                ? "Processando adaptação de dimensões e gerando WebP..."
                : "Clique para selecionar imagens ou arraste para cá"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, JPEG, WEBP ou GIF • Conversão e adaptação instantâneas no seu navegador
            </p>
          </div>
        </div>

        {/* ITENS NO PALCO DE PRÉ-UPLOAD (STAGING) */}
        {stagedItems.length > 0 && (
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-heading uppercase tracking-wider">
                Imagens Prontas para Envio ({stagedItems.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStagedItems([])}
                  className="text-xs text-muted-foreground hover:text-red-500 font-medium px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Limpar Fila
                </button>
                <button
                  type="button"
                  onClick={handleUploadAll}
                  className="bg-primary hover:opacity-90 text-white font-medium px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-opacity shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  Subir Todas Otimizadas
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {stagedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-background border border-border rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Prévia + Dados de Economia */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 h-16 rounded-lg bg-black/5 dark:bg-white/5 border border-border overflow-hidden shrink-0 relative flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.result.previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                          {item.originalFile.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          -{item.result.compressionRatio}% Economia
                        </span>
                      </div>

                      {/* Comparativo de Tamanhos e Resolução em PX */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground mt-1">
                        <span className="line-through opacity-70">
                          {item.result.originalWidth}×{item.result.originalHeight} px •{" "}
                          {formatBytes(item.result.originalSize)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {item.result.adaptedWidth}×{item.result.adaptedHeight} px •{" "}
                          {formatBytes(item.result.compressedSize)} (WebP)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nome Personalizado + Categoria + Destino + Ações */}
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="flex items-center bg-muted border border-border rounded-lg px-2.5 py-1">
                      <input
                        type="text"
                        value={item.customName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStagedItems((prev) =>
                            prev.map((s) => (s.id === item.id ? { ...s, customName: val } : s))
                          );
                        }}
                        className="bg-transparent text-xs text-foreground focus:outline-none w-28 sm:w-36 font-mono"
                        placeholder="nome-do-arquivo"
                      />
                      <span className="text-xs text-muted-foreground font-mono select-none">
                        .webp
                      </span>
                    </div>

                    <select
                      value={item.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStagedItems((prev) =>
                          prev.map((s) => (s.id === item.id ? { ...s, category: val } : s))
                        );
                      }}
                      className="bg-muted border border-border text-xs rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none cursor-pointer"
                      title="Categoria da Imagem"
                    >
                      <option value="Geral">Cat: Geral</option>
                      {systemCategories.map((c) => (
                        <option key={c.slug} value={c.title}>
                          Cat: {c.title}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={item.status === "uploading"}
                      onClick={() => handleUploadSingle(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                        item.status === "success"
                          ? "bg-emerald-500 text-white"
                          : item.status === "error"
                          ? "bg-red-500 text-white"
                          : "bg-primary hover:opacity-90 text-white"
                      }`}
                    >
                      {item.status === "uploading" ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : item.status === "success" ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Enviado!</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Subir WebP</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStagedItems((prev) => prev.filter((s) => s.id !== item.id))}
                      className="p-1.5 text-muted-foreground hover:text-red-500 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      title="Descartar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GALERIA E GERENCIAMENTO */}
      <div className="flex flex-col gap-4">
        {/* Barra de Busca e Filtros */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Filtros em Linha / Wrap */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Pastas */}
            <div className="flex items-center bg-muted border border-border rounded-xl p-0.5">
              <button
                onClick={() => setSelectedFolder("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedFolder === "all"
                    ? "bg-foreground text-background font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas ({images.length})
              </button>
              <button
                onClick={() => setSelectedFolder("uploads")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedFolder === "uploads"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Uploads ({counts.uploads})
              </button>
              <button
                onClick={() => setSelectedFolder("prints")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedFolder === "prints"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Prints ({counts.prints})
              </button>
              <button
                onClick={() => setSelectedFolder("categories")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedFolder === "categories"
                    ? "bg-primary text-white shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Categorias ({counts.categories})
              </button>
            </div>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-muted border border-border text-xs rounded-xl px-3 py-1.5 text-foreground focus:outline-none cursor-pointer"
            >
              <option value="all">Todas Categorias</option>
              {allCategoryTags.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid de Imagens */}
        {filteredImages.length === 0 ? (
          <div className="bg-muted border border-border rounded-2xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <ImageIcon className="w-12 h-12 opacity-30" />
            <p className="text-sm">Nenhuma imagem encontrada com esses filtros ou termo de busca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((img) => (
              <div
                key={img.id}
                className="group bg-muted border border-border rounded-xl overflow-hidden shadow-xs hover:border-primary/50 transition-all flex flex-col"
              >
                {/* Visualizador da Imagem */}
                <div
                  className="relative aspect-4/3 bg-black/10 dark:bg-black/30 overflow-hidden cursor-pointer flex items-center justify-center"
                  onClick={() => setPreviewModalImage(img)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onLoad={(e) => {
                      if (!img.width || !img.height) {
                        handleImageNaturalSize(
                          img.id,
                          e.currentTarget.naturalWidth,
                          e.currentTarget.naturalHeight
                        );
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-2 bg-background/80 backdrop-blur-sm rounded-full text-foreground hover:scale-110 transition-transform">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>

                  {/* Badge de Pasta */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-black/60 backdrop-blur-sm text-white">
                    {img.folder}
                  </span>

                  {/* Badge de Resolução no Topo Direito */}
                  {img.width && img.height && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-black/60 backdrop-blur-sm text-white">
                      {img.width}×{img.height}
                    </span>
                  )}
                </div>

                {/* Detalhes da Imagem */}
                <div className="p-3 flex flex-col gap-2 flex-1 justify-between bg-background">
                  <div>
                    <h3
                      className="text-xs font-semibold text-foreground truncate"
                      title={img.name}
                    >
                      {img.name}
                    </h3>

                    {/* Exibição em destaque: Tamanho em PX do lado do tamanho em KB */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1 font-mono">
                      <span className="font-semibold text-foreground/90">
                        {img.width && img.height ? `${img.width}×${img.height} px` : "Calculando..."}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(img.size)}</span>
                    </div>

                    {/* Tags de Categoria e Perfis */}
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {img.category && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 truncate max-w-full">
                          <Tag className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{img.category}</span>
                        </span>
                      )}

                      {img.profiles && img.profiles.length > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-muted-foreground"
                          title={`Perfis: ${img.profiles.join(", ")}`}
                        >
                          <Users className="w-2.5 h-2.5 shrink-0" />
                          <span>
                            {img.profiles.length === AVAILABLE_PROFILES.length
                              ? "Todos"
                              : img.profiles[0]}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações: Editar Informações, Copiar URL, Copiar Tag, Excluir */}
                  <div className="flex items-center gap-1 pt-2 border-t border-border">
                    {/* Botão de Editar Informações */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(img)}
                      className="p-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors cursor-pointer border border-border"
                      title="Editar informações da imagem (Nome, Categoria, Perfis)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Copiar Link */}
                    <button
                      type="button"
                      onClick={() => copyToClipboard(img.url, `url_${img.id}`)}
                      className="flex-1 py-1 px-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer border border-border"
                      title="Copiar link relativo"
                    >
                      {copiedId === `url_${img.id}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Link</span>
                        </>
                      )}
                    </button>

                    {/* Copiar HTML */}
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `<img src="${img.url}" class="print" alt="${img.name.replace(/\.webp$/, "")}" />`,
                          `html_${img.id}`
                        )
                      }
                      className="p-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg text-muted-foreground transition-colors cursor-pointer border border-border"
                      title="Copiar tag HTML <img class='print' /> para o CMS"
                    >
                      {copiedId === `html_${img.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Code className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Excluir (somente uploads) */}
                    {img.folder === "uploads" && (
                      <button
                        type="button"
                        onClick={() => setImageToDelete(img)}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-border"
                        title="Excluir imagem do servidor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE EDIÇÃO DE INFORMAÇÕES DA IMAGEM */}
      {editingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => !editLoading && setEditingImage(null)}
        >
          <div
            className="bg-background border border-border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Editar Informações da Imagem
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Atualize nome, categoria de documentação e perfis de acesso.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingImage(null)}
                disabled={editLoading}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveEdit} className="p-5 flex flex-col gap-4">
              {editError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Informações atualizadas com sucesso!</span>
                </div>
              )}

              {/* Prévia da Imagem e Dimensões */}
              <div className="bg-muted border border-border rounded-xl p-3 flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-lg bg-black/5 dark:bg-white/5 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={editingImage.url}
                    alt={editingImage.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-mono font-semibold text-foreground truncate">
                    {editingImage.url}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                    <span className="font-semibold text-primary">
                      {editingImage.width && editingImage.height
                        ? `${editingImage.width}×${editingImage.height} px`
                        : "Dimensões dinâmicas"}
                    </span>
                    <span>•</span>
                    <span>{formatBytes(editingImage.size)}</span>
                  </div>
                </div>
              </div>

              {/* Campo: Nome da Imagem */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome do Arquivo
                </label>
                <div className="flex items-center bg-muted border border-border rounded-xl px-3 py-2 focus-within:border-primary transition-colors">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="nome-da-imagem"
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {editingImage.folder === "uploads"
                    ? "Para arquivos na pasta uploads, o arquivo será renomeado com segurança no disco."
                    : "Identificação amigável para busca e organização."}
                </p>
              </div>

              {/* Campo: Categoria */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Categoria da Imagem
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="Geral">Geral</option>
                  <option value="Prints">Prints / Manuais</option>
                  <option value="Categorias">Capas de Categorias</option>
                  {systemCategories.map((c) => (
                    <option key={c.slug} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ajuda a associar a imagem ao módulo correto da plataforma.
                </p>
              </div>

              {/* Campo: Perfis de Acesso */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Perfis com Permissão de Acesso
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {AVAILABLE_PROFILES.map((profile) => {
                    const isSelected = editProfiles.includes(profile);
                    return (
                      <div
                        key={profile}
                        onClick={() => toggleProfile(profile)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {profile === "Administrador" ? (
                            <Shield className="w-4 h-4 shrink-0" />
                          ) : (
                            <Users className="w-4 h-4 shrink-0" />
                          )}
                          <span className="text-xs">{profile}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected
                              ? "bg-primary border-primary text-white"
                              : "border-border"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé com Ações */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => setEditingImage(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {editLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ZOOM / LIGHTBOX */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="bg-background border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground truncate max-w-md">
                  {previewModalImage.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 font-mono">
                  <span className="font-semibold text-primary">
                    {previewModalImage.width && previewModalImage.height
                      ? `${previewModalImage.width}×${previewModalImage.height} px`
                      : "Carregando px..."}
                  </span>
                  <span>•</span>
                  <span>{formatBytes(previewModalImage.size)}</span>
                  <span>•</span>
                  <span>Cat: {previewModalImage.category || "Geral"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(previewModalImage);
                    setPreviewModalImage(null);
                  }}
                  className="px-3 py-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-medium border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Informações
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(previewModalImage.url, "modal_url")}
                  className="px-3 py-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-medium border border-border flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === "modal_url" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copiar URL
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalImage.url}
                alt={previewModalImage.name}
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {imageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Excluir Imagem?</h3>
                <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir o arquivo{" "}
              <strong className="text-foreground font-mono">{imageToDelete.name}</strong> do servidor?
              Se alguma documentação estiver utilizando esta imagem, ela deixará de carregar.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setImageToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleDeleteImage}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                {deleteLoading ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
