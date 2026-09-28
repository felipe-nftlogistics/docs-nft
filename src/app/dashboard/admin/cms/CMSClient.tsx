"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  FileText, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Loader2, 
  X, 
  Check, 
  Heading1, 
  Heading2, 
  Bold, 
  Italic, 
  List, 
  AlertCircle, 
  Code, 
  Image as ImageIcon, 
  Eye, 
  BookOpen,
  FolderPlus,
  Folder,
  FolderArchive
} from "lucide-react";
import { DocEditorModal } from "@/components/DocEditorModal";

interface PageItem {
  key: string;
  categorySlug: string;
  categoryName: string;
  title: string;
  slug: string;
  link: string;
  description: string;
  thumb?: string;
  content: string;
  ativo: boolean;
}

interface CategoryInfo {
  slug: string;
  name: string;
  listKey: string;
  thumb?: string;
  descricao?: string;
}

interface CMSClientProps {
  initialPages: PageItem[];
  categories: CategoryInfo[];
}

export function CMSClient({ initialPages, categories }: CMSClientProps) {
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>(initialPages);
  const [categoryList, setCategoryList] = useState<CategoryInfo[]>(categories);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Estado para Modal de Criação / Edição de Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState<"create" | "edit">("create");
  
  // Campos de Criação
  const [newCatTitulo, setNewCatTitulo] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDescricao, setNewCatDescricao] = useState("");
  const [newCatThumb, setNewCatThumb] = useState("/assets/img/categories/comex.webp");
  const [newCatLoading, setNewCatLoading] = useState(false);
  const [newCatError, setNewCatError] = useState("");

  // Campos de Edição
  const [editCatSelectedSlug, setEditCatSelectedSlug] = useState<string>(categories[0]?.slug || "");
  const [editCatTitulo, setEditCatTitulo] = useState("");
  const [editCatDescricao, setEditCatDescricao] = useState("");
  const [editCatThumb, setEditCatThumb] = useState("/assets/img/categories/comex.webp");
  const [editCatLoading, setEditCatLoading] = useState(false);
  const [editCatError, setEditCatError] = useState("");
  const [editCatSuccess, setEditCatSuccess] = useState(false);

  // Estado para Confirmação de Exclusão de Categoria
  const [showDeleteCatConfirm, setShowDeleteCatConfirm] = useState(false);
  const [deleteCatLoading, setDeleteCatLoading] = useState(false);
  const [deleteCatError, setDeleteCatError] = useState("");

  const [editingPage, setEditingPage] = useState<PageItem | null>(null);

  // Estado para Modal de Atribuição de Categoria (Páginas Órfãs)
  const [pageToAssignCat, setPageToAssignCat] = useState<PageItem | null>(null);
  const [targetAssignCatSlug, setTargetAssignCatSlug] = useState<string>(categories[0]?.slug || "comex");
  const [assignCatLoading, setAssignCatLoading] = useState(false);
  const [assignCatError, setAssignCatError] = useState("");

  // Estado para Confirmação de Exclusão
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Estado para Modal de Criação de Nova Página
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState(categories[0]?.slug || "comex");
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createAtivo, setCreateAtivo] = useState(true);
  const [createTab, setCreateTab] = useState<"edit" | "preview">("edit");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // Alternar status ativo/inativo com atualização instantânea (otimista)
  const handleToggleAtivo = async (page: PageItem) => {
    const nextStatus = !page.ativo;
    setTogglingKey(page.key);

    // Atualização otimista local
    setPages((prev) =>
      prev.map((p) => (p.key === page.key ? { ...p, ativo: nextStatus } : p))
    );

    try {
      const res = await fetch("/api/docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: page.key,
          ativo: nextStatus,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao alterar status.");
      }

      router.refresh();
    } catch (err) {
      // Reverte em caso de erro
      setPages((prev) =>
        prev.map((p) => (p.key === page.key ? { ...p, ativo: page.ativo } : p))
      );
      alert("Não foi possível alterar o status da página.");
    } finally {
      setTogglingKey(null);
    }
  };

  // Auto-slugify ao digitar o título da categoria
  const handleCatTitleChange = (val: string) => {
    setNewCatTitulo(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "");
    setNewCatSlug(generatedSlug);
  };

  // Submissão do modal de criação de categoria
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatTitulo.trim()) {
      setNewCatError("O nome da categoria é obrigatório.");
      return;
    }

    setNewCatLoading(true);
    setNewCatError("");

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: newCatTitulo.trim(),
          slug: newCatSlug.trim(),
          descricao: newCatDescricao.trim(),
          thumb: newCatThumb.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao cadastrar categoria.");
      }

      const data = await res.json();
      const created = data.category;

      setCategoryList((prev) => [...prev, created]);
      // Se estava com o modal de nova página aberto, seleciona essa categoria criada
      setCreateCategory(created.slug);

      setIsCategoryModalOpen(false);
      setNewCatTitulo("");
      setNewCatSlug("");
      setNewCatDescricao("");
      router.refresh();
    } catch (err: any) {
      setNewCatError(err.message || "Erro inesperado ao cadastrar categoria.");
    } finally {
      setNewCatLoading(false);
    }
  };

  // Carregar dados da categoria selecionada para edição
  const selectCategoryForEditing = (slug: string) => {
    setEditCatSelectedSlug(slug);
    const cat = categoryList.find((c) => c.slug === slug);
    if (cat) {
      setEditCatTitulo(cat.name);
      setEditCatDescricao(cat.descricao || "");
      setEditCatThumb(cat.thumb || "/assets/img/categories/comex.webp");
    }
    setEditCatError("");
    setEditCatSuccess(false);
  };

  // Submissão do modal de edição de categoria
  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCatTitulo.trim()) {
      setEditCatError("O nome da categoria é obrigatório.");
      return;
    }

    setEditCatLoading(true);
    setEditCatError("");

    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSlug: editCatSelectedSlug,
          titulo: editCatTitulo.trim(),
          descricao: editCatDescricao.trim(),
          thumb: editCatThumb.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao atualizar categoria.");
      }

      const data = await res.json();
      const updated = data.category;

      setCategoryList((prev) =>
        prev.map((c) => (c.slug === editCatSelectedSlug ? updated : c))
      );

      // Atualiza o nome da categoria nas páginas da listagem
      setPages((prev) =>
        prev.map((p) =>
          p.categorySlug === editCatSelectedSlug
            ? { ...p, categoryName: updated.name }
            : p
        )
      );

      setEditCatSuccess(true);
      setTimeout(() => {
        setEditCatSuccess(false);
        setIsCategoryModalOpen(false);
      }, 800);
      router.refresh();
    } catch (err: any) {
      setEditCatError(err.message || "Erro inesperado ao atualizar categoria.");
    } finally {
      setEditCatLoading(false);
    }
  };

  // Exclusão de Categoria com aviso de conteúdo órfão
  const handleDeleteCategory = async () => {
    if (!editCatSelectedSlug) return;
    setDeleteCatLoading(true);
    setDeleteCatError("");

    try {
      const res = await fetch(`/api/categories?slug=${encodeURIComponent(editCatSelectedSlug)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao excluir categoria.");
      }

      const updatedCategories = categoryList.filter((c) => c.slug !== editCatSelectedSlug);
      setCategoryList(updatedCategories);

      // Remove páginas vinculadas àquela categoria da listagem atual do CMS (o conteúdo HTML permanece preservado em docContent.json)
      setPages((prev) => prev.filter((p) => p.categorySlug !== editCatSelectedSlug));

      if (selectedCategory === editCatSelectedSlug) {
        setSelectedCategory("all");
      }

      if (updatedCategories.length > 0) {
        selectCategoryForEditing(updatedCategories[0].slug);
      } else {
        setCategoryModalTab("create");
      }

      setShowDeleteCatConfirm(false);
      setIsCategoryModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setDeleteCatError(err.message || "Não foi possível excluir a categoria.");
    } finally {
      setDeleteCatLoading(false);
    }
  };

  // Atribuição de Categoria a uma página órfã
  const handleAssignCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageToAssignCat || !targetAssignCatSlug) return;

    setAssignCatLoading(true);
    setAssignCatError("");

    try {
      const res = await fetch("/api/docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: pageToAssignCat.key,
          newCategory: targetAssignCatSlug,
          title: pageToAssignCat.title,
          description: pageToAssignCat.description,
          content: pageToAssignCat.content,
          ativo: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao atribuir categoria.");
      }

      // Atualiza a página no estado local
      setPages((prev) =>
        prev.map((p) =>
          p.key === pageToAssignCat.key
            ? {
                ...p,
                key: data.key,
                categorySlug: data.categorySlug,
                categoryName: data.categoryName,
                link: data.link,
                ativo: data.ativo,
              }
            : p
        )
      );

      setPageToAssignCat(null);
      router.refresh();
    } catch (err: any) {
      setAssignCatError(err.message || "Erro ao atribuir categoria à página.");
    } finally {
      setAssignCatLoading(false);
    }
  };

  // Auto-slugify ao digitar o título no modal de criação
  const handleTitleChange = (val: string) => {
    setCreateTitle(val);
    const generatedSlug = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/[^\w\-]+/g, "");
    setCreateSlug(generatedSlug);
  };

  // Inserção rápida de snippets no modal de criação
  const insertCreateSnippet = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = document.getElementById("create-content-area") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selected = currentText.substring(start, end) || placeholder;

    const replacement = `${prefix}${selected}${suffix}`;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);

    setCreateContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 50);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateError("O título da página é obrigatório.");
      return;
    }
    if (!createSlug.trim()) {
      setCreateError("O slug (endereço URL) é obrigatório.");
      return;
    }

    setCreateLoading(true);
    setCreateError("");

    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria: createCategory,
          slug: createSlug.trim(),
          title: createTitle.trim(),
          description: createDescription.trim(),
          content: createContent.trim() || `<p>${createDescription.trim() || createTitle.trim()}</p>`,
          ativo: createAtivo,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao criar página.");
      }

      const data = await res.json();
      const catObj = categories.find((c) => c.slug === createCategory);

      const newPage: PageItem = {
        key: data.key,
        categorySlug: createCategory,
        categoryName: catObj ? catObj.name : createCategory,
        title: createTitle.trim(),
        slug: createSlug.trim(),
        link: data.link,
        description: createDescription.trim(),
        content: createContent.trim() || `<p>${createDescription.trim()}</p>`,
        ativo: createAtivo,
      };

      setPages([newPage, ...pages]);
      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateSlug("");
      setCreateDescription("");
      setCreateContent("");
      setCreateAtivo(true);
      router.refresh();
    } catch (err: any) {
      setCreateError(err.message || "Erro inesperado ao criar página.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pageToDelete) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/docs?key=${encodeURIComponent(pageToDelete.key)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao excluir página.");
      }

      setPages(pages.filter((p) => p.key !== pageToDelete.key));
      setPageToDelete(null);
      router.refresh();
    } catch (err) {
      alert("Não foi possível excluir a página.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filtros de páginas
  const filteredPages = pages.filter((page) => {
    const matchesCategory =
      selectedCategory === "all" || page.categorySlug === selectedCategory;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && page.ativo) ||
      (statusFilter === "inactive" && !page.ativo);

    const matchesSearch =
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const activeCount = pages.filter((p) => p.ativo).length;
  const inactiveCount = pages.filter((p) => !p.ativo).length;
  const orphanCount = pages.filter((p) => p.categorySlug === "sem-categoria").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de Ações: Busca e Botão Nova Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, slug ou texto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/admin/galeria"
            className="inline-flex items-center justify-center gap-2 bg-muted hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-border shadow-xs cursor-pointer"
            title="Galeria de Imagens & Otimização WebP"
          >
            <ImageIcon className="w-4 h-4 text-primary" />
            Galeria
          </Link>

          <button
            onClick={() => {
              setNewCatError("");
              setIsCategoryModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-muted hover:bg-black/5 dark:hover:bg-white/5 text-foreground font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-border shadow-xs cursor-pointer"
            title="Criar nova categoria de documentação"
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            Categoria
          </button>

          <button
            onClick={() => {
              setCreateError("");
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-primary hover:opacity-90 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-opacity shadow-xs cursor-pointer"
            title="Criar nova página de documentação"
          >
            <Plus className="w-4 h-4" />
            Nova Página
          </button>
        </div>
      </div>

      {/* Seção de Filtros (Status Categorias) */}
      <div className="flex flex-col gap-3">
        {/* Filtro por Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Status:</span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
              statusFilter === "all"
                ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Todos ({pages.length})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs"
                : "bg-muted border-border text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Ativos ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter("inactive")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center gap-1.5 ${
              statusFilter === "inactive"
                ? "bg-neutral-600 text-white border-neutral-600 font-semibold shadow-xs"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            Inativos ({inactiveCount})
          </button>
        </div>

        {/* Pílulas de Categorias */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
              selectedCategory === "all"
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            Todas as Categorias ({pages.length})
          </button>

          {/* Opção para Conteúdos Sem Categoria (Órfãos) */}
          <button
            onClick={() => setSelectedCategory("sem-categoria")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5 ${
              selectedCategory === "sem-categoria"
                ? "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs"
                : orphanCount > 0
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 font-semibold"
                : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
            }`}
            title="Ver conteúdos sem categoria associada"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Sem Categoria ({orphanCount})</span>
          </button>

          {categoryList.map((cat) => {
            const count = pages.filter((p) => p.categorySlug === cat.slug).length;
            return (
              <button
                key={cat.slug}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedCategory === cat.slug
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Páginas */}
      <div className="bg-muted border border-border rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-heading flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Páginas Cadastradas ({filteredPages.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            {activeCount} ativas • {inactiveCount} inativas
          </span>
        </div>

        {filteredPages.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <FileText className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhuma página encontrada com esses critérios.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPages.map((page) => (
              <div
                key={page.key}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  page.ativo
                    ? "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                    : "bg-black/[0.015] dark:bg-white/[0.015] opacity-80"
                }`}
              >
                <div className="flex items-start gap-3.5 max-w-2xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    page.categorySlug === "sem-categoria"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : page.ativo
                      ? "bg-primary/10 text-primary"
                      : "bg-neutral-500/10 text-neutral-400"
                  }`}>
                    {page.categorySlug === "sem-categoria" ? (
                      <FolderArchive className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-semibold leading-tight ${page.ativo ? "text-heading" : "text-muted-foreground line-through decoration-neutral-400/40"}`}>
                        {page.title}
                      </h3>
                      {page.categorySlug === "sem-categoria" ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <FolderArchive className="w-3 h-3" />
                          Sem Categoria (Órfão)
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-muted-foreground">
                          {page.categoryName}
                        </span>
                      )}
                      {!page.ativo && page.categorySlug !== "sem-categoria" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Inativo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      {page.link ? (
                        <span className="text-xs font-mono text-primary/80">
                          {page.link}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground italic">
                          Chave: {page.key}
                        </span>
                      )}
                      {page.categorySlug === "sem-categoria" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          • Conteúdo órfão (invisível para o usuário)
                        </span>
                      ) : page.ativo ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          • Conteúdo ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          • Conteúdo inativo
                        </span>
                      )}
                      {!page.content && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground italic">
                          (vazio)
                        </span>
                      )}
                    </div>

                    {page.description && (
                      <p
                        className="text-xs text-muted-foreground mt-1 line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: page.description }}
                      />
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                  {/* Botão Especial: Atribuir Categoria (apenas para órfãs) */}
                  {page.categorySlug === "sem-categoria" && (
                    <button
                      type="button"
                      onClick={() => {
                        setPageToAssignCat(page);
                        setTargetAssignCatSlug(categoryList[0]?.slug || "comex");
                        setAssignCatError("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                      title="Atribuir uma categoria a esta página órfã"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Atribuir Categoria
                    </button>
                  )}

                  {/* Botão de Toggle Ativo / Inativo (para páginas com categoria) */}
                  {page.categorySlug !== "sem-categoria" && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border">
                      <button
                        type="button"
                        onClick={() => handleToggleAtivo(page)}
                        disabled={togglingKey === page.key}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          page.ativo ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                        }`}
                        title={page.ativo ? "Clique para desativar página" : "Clique para ativar página"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            page.ativo ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-semibold select-none min-w-[46px] ${
                        page.ativo ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}>
                        {togglingKey === page.key ? "..." : page.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  )}

                  {page.link && page.categorySlug !== "sem-categoria" && (
                    <Link
                      href={page.link}
                      target="_blank"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer border border-border"
                      title="Visualizar Página Pública"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    onClick={() => setEditingPage(page)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 rounded-xl transition-colors cursor-pointer border border-primary/20"
                    title="Editar Conteúdo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>

                  <button
                    onClick={() => setPageToDelete(page)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-border"
                    title="Excluir Página"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingPage && (
        <DocEditorModal
          isOpen={!!editingPage}
          onClose={() => setEditingPage(null)}
          docKey={editingPage.key}
          initialTitle={editingPage.title}
          initialDescription={editingPage.description}
          initialContent={editingPage.content}
          initialAtivo={editingPage.ativo}
          categories={categoryList}
          onSaveSuccess={(updatedData) => {
            if (updatedData?.key && updatedData.key !== editingPage.key) {
              setPages((prev) =>
                prev.map((p) =>
                  p.key === editingPage.key
                    ? {
                        ...p,
                        key: updatedData.key,
                        link: updatedData.link || p.link,
                        categorySlug: updatedData.categorySlug || p.categorySlug,
                        categoryName: updatedData.categoryName || updatedData.categorySlug || p.categoryName,
                        title: updatedData.title || p.title,
                        description: updatedData.description !== undefined ? updatedData.description : p.description,
                        ativo: updatedData.ativo !== undefined ? updatedData.ativo : p.ativo,
                      }
                    : p
                )
              );
            } else {
              // Atualiza o estado local da página editada
              fetch(`/api/docs?key=${encodeURIComponent(editingPage.key)}`)
                .then((res) => res.json())
                .then((updatedDoc) => {
                  setPages(
                    pages.map((p) =>
                      p.key === editingPage.key
                        ? {
                            ...p,
                            title: updatedDoc.title || p.title,
                            content: updatedDoc.html || p.content,
                            ativo: updatedDoc.ativo !== undefined ? updatedDoc.ativo : p.ativo,
                          }
                        : p
                    )
                  );
                })
                .catch(() => {});
            }
            router.refresh();
          }}
        />
      )}

      {/* Modal de Criação de Nova Página */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted">
              <div>
                <h2 className="text-lg font-bold text-heading">Criar Nova Página</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A página será automaticamente disponibilizada no menu lateral e nos cards da categoria.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-background border border-border rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setCreateTab("edit")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      createTab === "edit"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      createTab === "preview"
                        ? "bg-primary text-white shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Pré-visualização
                  </button>
                </div>

                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo do Form */}
            <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Seletor de Categoria, Título e Slug */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-foreground">
                      Categoria
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCatError("");
                        setIsCategoryModalOpen(true);
                      }}
                      className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Nova Categoria
                    </button>
                  </div>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {categoryList.map((c) => (
                      <option key={c.slug} value={c.slug} className="bg-background">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Título da Página *
                  </label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ex: Novo Manual de Coleta"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Slug da URL *
                  </label>
                  <input
                    type="text"
                    value={createSlug}
                    onChange={(e) => setCreateSlug(e.target.value)}
                    placeholder="ex: novo-manual-de-coleta"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-8">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Descrição Curta (Exibida no Card)
                  </label>
                  <input
                    type="text"
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Ex: Instruções detalhadas para realizar a coleta de cargas..."
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Status Inicial
                  </label>
                  <div
                    onClick={() => setCreateAtivo(!createAtivo)}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl border cursor-pointer select-none transition-colors ${
                      createAtivo
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                    title="Alternar publicação imediata ou rascunho"
                  >
                    <span className="text-xs font-semibold">
                      {createAtivo ? "Ativo (Publicar agora)" : "Inativo (Rascunho)"}
                    </span>
                    <div className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      createAtivo ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                    }`}>
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        createAtivo ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Área de Conteúdo */}
              <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-muted">
                {/* Toolbar */}
                {createTab === "edit" && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-background border-b border-border text-xs">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1 uppercase">
                      Inserir:
                    </span>
                    <button
                      type="button"
                      onClick={() => insertCreateSnippet("<h2>", "</h2>", "Título da Seção")}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Heading1 className="w-3.5 h-3.5" />
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => insertCreateSnippet("<h3>", "</h3>", "Subtítulo da Seção")}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Heading2 className="w-3.5 h-3.5" />
                      H3
                    </button>
                    <button
                      type="button"
                      onClick={() => insertCreateSnippet("<p>", "</p>", "Texto explicativo")}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => insertCreateSnippet("<strong>", "</strong>", "destaque")}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertCreateSnippet("<em>", "</em>", "itálico")}
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertCreateSnippet(
                          '<div class="attention">\n  <p><strong>Atenção:</strong> Mensagem de aviso.</p>\n</div>\n'
                        )
                      }
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-primary" />
                      Alerta
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertCreateSnippet(
                          '<div class="attention-copy">\n  <p>Texto copiável</p>\n</div>\n'
                        )
                      }
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3.5 h-3.5" />
                      Código
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertCreateSnippet(
                          '<a class="btn" href="https://exemplo.com" target="_blank">\n  Acessar\n</a>\n'
                        )
                      }
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Botão
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertCreateSnippet(
                          '<img src="/assets/img/nomedaimagem.jpg" class="print" alt="Print" />\n'
                        )
                      }
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertCreateSnippet(
                          '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n'
                        )
                      }
                      className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <List className="w-3.5 h-3.5" />
                      Lista
                    </button>
                  </div>
                )}

                {/* Área de Texto ou Preview */}
                <div className="flex-1 overflow-auto p-4">
                  {createTab === "edit" ? (
                    <textarea
                      id="create-content-area"
                      value={createContent}
                      onChange={(e) => setCreateContent(e.target.value)}
                      placeholder="Escreva o conteúdo da documentação em HTML simples ou usando os botões acima..."
                      className="w-full h-full min-h-[300px] bg-transparent text-sm font-mono text-foreground focus:outline-none resize-none leading-relaxed"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="doc-content bg-background border border-border p-6 rounded-xl min-h-full">
                      <div className="border-b border-border pb-4 mb-6">
                        <h1 className="text-2xl font-bold text-heading">
                          {createTitle || "Título da Nova Página"}
                        </h1>
                        {createDescription && (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {createDescription}
                          </p>
                        )}
                      </div>
                      {createContent ? (
                        <div dangerouslySetInnerHTML={{ __html: createContent }} />
                      ) : (
                        <p className="text-muted-foreground italic text-sm">
                          Nenhum conteúdo para visualizar ainda.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted">
              <span className="text-xs font-mono text-muted-foreground">
                URL resultante: /dashboard/{createCategory}/{createSlug || "..."}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={createLoading}
                  className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Criar Página
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border w-full max-w-md rounded-2xl shadow-xl p-6">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-heading">Excluir Página?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Tem certeza que deseja excluir a página{" "}
              <strong className="text-foreground">{pageToDelete.title}</strong>? Essa ação removerá o conteúdo e o link da plataforma.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPageToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  "Sim, excluir"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Unificado de Gerenciamento de Categorias (Criar ou Editar) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background border border-border w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  {categoryModalTab === "create" ? (
                    <FolderPlus className="w-5 h-5" />
                  ) : (
                    <Edit3 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-heading">
                    {categoryModalTab === "create" ? "Criar Nova Categoria" : "Editar Categoria Existente"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {categoryModalTab === "create"
                      ? "A categoria será integrada ao menu e à página inicial."
                      : "Altere o nome, descrição ou imagem da categoria."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alternador de Modo (Tabs: Criar / Editar) */}
            <div className="flex px-6 pt-3 pb-2 bg-muted border-b border-border gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryModalTab("create");
                  setNewCatError("");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                  categoryModalTab === "create"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <FolderPlus className="w-4 h-4" />
                Criar Nova Categoria
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategoryModalTab("edit");
                  const initialSlug = editCatSelectedSlug || categoryList[0]?.slug;
                  if (initialSlug) selectCategoryForEditing(initialSlug);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                  categoryModalTab === "edit"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Editar Existente
              </button>
            </div>

            {/* Conteúdo Aba 1: Criar Categoria */}
            {categoryModalTab === "create" ? (
              <form onSubmit={handleCreateCategorySubmit} className="p-6 flex flex-col gap-4">
                {newCatError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{newCatError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={newCatTitulo}
                    onChange={(e) => handleCatTitleChange(e.target.value)}
                    placeholder="Ex: Financeiro, Recursos Humanos, Jurídico..."
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Slug da URL *
                  </label>
                  <div className="flex items-center bg-muted border border-border rounded-xl px-3.5 py-2.5 focus-within:border-primary transition-colors">
                    <span className="text-xs text-muted-foreground select-none font-mono mr-1">/dashboard/</span>
                    <input
                      type="text"
                      value={newCatSlug}
                      onChange={(e) => setNewCatSlug(e.target.value)}
                      placeholder="financeiro"
                      className="w-full bg-transparent text-sm font-mono text-foreground focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Descrição Curta (Exibida no Card)
                  </label>
                  <textarea
                    value={newCatDescricao}
                    onChange={(e) => setNewCatDescricao(e.target.value)}
                    placeholder="Ex: Procedimentos, regras e rotinas internas do setor financeiro da NFT Logistics."
                    rows={3}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Imagem de Capa (Caminho da Imagem)
                  </label>
                  <input
                    type="text"
                    value={newCatThumb}
                    onChange={(e) => setNewCatThumb(e.target.value)}
                    placeholder="/assets/img/categories/comex.webp"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Você pode usar imagens em <code>/assets/img/categories/</code> ou caminho público.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={newCatLoading}
                    className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {newCatLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4" />
                        Criar Categoria
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Conteúdo Aba 2: Editar Categoria */
              <form onSubmit={handleEditCategorySubmit} className="p-6 flex flex-col gap-4">
                {editCatError && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editCatError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Selecione a Categoria para Editar *
                  </label>
                  <select
                    value={editCatSelectedSlug}
                    onChange={(e) => selectCategoryForEditing(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    {categoryList.map((cat) => (
                      <option key={cat.slug} value={cat.slug} className="bg-background">
                        {cat.name} ({cat.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nome da Categoria *
                  </label>
                  <input
                    type="text"
                    value={editCatTitulo}
                    onChange={(e) => setEditCatTitulo(e.target.value)}
                    placeholder="Ex: Novo Nome da Categoria"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Link da Categoria
                  </label>
                  <div className="bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-muted-foreground select-none">
                    /dashboard/{editCatSelectedSlug}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Descrição da Categoria (Exibida no Card)
                  </label>
                  <textarea
                    value={editCatDescricao}
                    onChange={(e) => setEditCatDescricao(e.target.value)}
                    placeholder="Descrição da categoria..."
                    rows={3}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Imagem de Capa (Caminho da Imagem)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editCatThumb}
                      onChange={(e) => setEditCatThumb(e.target.value)}
                      placeholder="/assets/img/categories/comex.webp"
                      className="flex-1 bg-muted border border-border rounded-xl px-3.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    {editCatThumb && (
                      <div className="w-9 h-9 rounded-lg overflow-hidden border border-border shrink-0 bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editCatThumb}
                          alt="Prévia"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteCatError("");
                      setShowDeleteCatConfirm(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-red-500/20"
                    title="Excluir esta categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Categoria
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-4 py-2 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={editCatLoading}
                      className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {editCatLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : editCatSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          Salvo!
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Categoria com Alerta de Conteúdo Órfão */}
      {showDeleteCatConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !deleteCatLoading && setShowDeleteCatConfirm(false)}
        >
          <div
            className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Excluir Categoria &quot;{categoryList.find((c) => c.slug === editCatSelectedSlug)?.name || editCatSelectedSlug}&quot;?
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  /dashboard/{editCatSelectedSlug}
                </p>
              </div>
            </div>

            {deleteCatError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteCatError}</span>
              </div>
            )}

            {/* Alerta de Conteúdo Órfão */}
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 p-4 rounded-xl flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Aviso sobre os conteúdos existentes:</span>
              </div>
              <p className="leading-relaxed">
                As páginas e itens pertencentes a esta categoria ficarão <strong>órfãos</strong> (sem uma categoria pai no menu de navegação e na barra lateral).
              </p>
              <div className="pt-2 border-t border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300/90 font-medium">
                • <strong>Os conteúdos originais NÃO serão excluídos</strong> do sistema e permanecerão intactos na base de dados, podendo ser reassociados a qualquer outra categoria.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteCatLoading}
                onClick={() => setShowDeleteCatConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteCatLoading}
                onClick={handleDeleteCategory}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {deleteCatLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atribuição de Categoria para Páginas Órfãs */}
      {pageToAssignCat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !assignCatLoading && setPageToAssignCat(null)}
        >
          <div
            className="bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Atribuir Categoria
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Vincule esta página a uma categoria ativa da plataforma.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPageToAssignCat(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignCatError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignCatError}</span>
              </div>
            )}

            <form onSubmit={handleAssignCategorySubmit} className="flex flex-col gap-4">
              <div className="bg-muted border border-border rounded-xl p-3.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Página Selecionada
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {pageToAssignCat.title}
                </span>
                <span className="text-xs font-mono text-muted-foreground truncate">
                  Referência: {pageToAssignCat.key}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Selecione a Categoria de Destino *
                </label>
                <select
                  value={targetAssignCatSlug}
                  onChange={(e) => setTargetAssignCatSlug(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  required
                >
                  {categoryList.map((cat) => (
                    <option key={cat.slug} value={cat.slug} className="bg-background">
                      {cat.name} (/dashboard/{cat.slug})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  A página será integrada ao menu da categoria selecionada e passará a ficar disponível para consulta.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-1">
                <button
                  type="button"
                  disabled={assignCatLoading}
                  onClick={() => setPageToAssignCat(null)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={assignCatLoading}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {assignCatLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar e Vincular
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
