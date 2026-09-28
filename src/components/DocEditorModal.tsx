"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Eye, 
  Edit3, 
  Heading1, 
  Heading2, 
  Bold, 
  Italic, 
  List, 
  AlertCircle, 
  Code, 
  ExternalLink, 
  Image as ImageIcon, 
  Save, 
  Loader2,
  Check,
  Folder,
  FolderPlus,
  Plus
} from "lucide-react";

interface CategoryOption {
  slug: string;
  name: string;
}

interface DocEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  docKey: string;
  initialTitle?: string;
  initialDescription?: string;
  initialContent?: string;
  initialAtivo?: boolean;
  categories?: CategoryOption[];
  onSaveSuccess?: (updatedData?: any) => void;
}

export function DocEditorModal({
  isOpen,
  onClose,
  docKey,
  initialTitle = "",
  initialDescription = "",
  initialContent = "",
  initialAtivo = true,
  categories: initialCategoriesProp,
  onSaveSuccess,
}: DocEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [ativo, setAtivo] = useState(initialAtivo);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Categoria
  const originalCategory = docKey.includes("/") ? docKey.split("/")[0] : "sem-categoria";
  const [selectedCategory, setSelectedCategory] = useState(originalCategory);
  const [categoryList, setCategoryList] = useState<CategoryOption[]>(initialCategoriesProp || []);

  // Popup de Alterar / Criar Categoria
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catModalMode, setCatModalMode] = useState<"select" | "create">("select");
  const [modalCatSelected, setModalCatSelected] = useState(originalCategory);

  // Formulário de Nova Categoria dentro do Popup
  const [newCatTitulo, setNewCatTitulo] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatLoading, setNewCatLoading] = useState(false);
  const [newCatError, setNewCatError] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inicialização ao abrir modal
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setContent(initialContent);
      setAtivo(initialAtivo !== false);
      const cat = docKey.includes("/") ? docKey.split("/")[0] : "sem-categoria";
      setSelectedCategory(cat);
      setModalCatSelected(cat);
      setActiveTab("edit");
      setErrorMessage("");
      setSaveSuccess(false);
      setIsCatModalOpen(false);
      setCatModalMode("select");

      // Buscar categorias atualizadas se não foram passadas ou para garantir sincronia
      fetch("/api/categories")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCategoryList(data.map((c: any) => ({ slug: c.slug, name: c.name })));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialTitle, initialDescription, initialContent, initialAtivo, docKey]);

  if (!isOpen) return null;

  // Função auxiliar para inserir marcação no textarea no ponto do cursor
  const insertSnippet = (prefix: string, suffix: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selected = currentText.substring(start, end) || placeholder;

    const replacement = `${prefix}${selected}${suffix}`;
    const newText = currentText.substring(0, start) + replacement + currentText.substring(end);

    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length
      );
    }, 50);
  };

  // Auto-slugify ao digitar título de nova categoria
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

  // Submissão de criação de nova categoria dentro do popup
  const handleCreateCategoryInsideModal = async (e: React.FormEvent) => {
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
          slug: newCatSlug.trim() || undefined,
          descricao: newCatDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao criar categoria.");
      }

      const createdCat: CategoryOption = {
        slug: data.category.slug,
        name: data.category.name,
      };

      setCategoryList((prev) => {
        if (prev.some((c) => c.slug === createdCat.slug)) return prev;
        return [...prev, createdCat];
      });

      setSelectedCategory(createdCat.slug);
      setModalCatSelected(createdCat.slug);
      setIsCatModalOpen(false);
      setNewCatTitulo("");
      setNewCatSlug("");
      setNewCatDesc("");
    } catch (err: any) {
      setNewCatError(err.message || "Erro ao criar nova categoria.");
    } finally {
      setNewCatLoading(false);
    }
  };

  // Salvar alterações da documentação
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage("O título da página é obrigatório.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const payload: any = {
        key: docKey,
        title: title.trim(),
        description: description.trim(),
        content,
        ativo,
      };

      // Se a categoria foi alterada ou se a página era sem-categoria
      if (selectedCategory && selectedCategory !== originalCategory) {
        payload.newCategory = selectedCategory;
      }

      const res = await fetch("/api/docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Falha ao salvar alterações");
      }

      const resData = await res.json().catch(() => ({}));

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        if (onSaveSuccess) onSaveSuccess(resData);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "Ocorreu um erro ao salvar o documento.");
    } finally {
      setSaving(false);
    }
  };

  const currentCatObj = categoryList.find((c) => c.slug === selectedCategory);
  const isCategoryChanged = selectedCategory !== originalCategory;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-background border border-border w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Cabeçalho do Modal */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-wider font-mono">
                  {docKey}
                </span>
                <h2 className="text-lg font-bold text-heading">Editar Documentação</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Edite os textos, status e a categoria de vinculação desta página.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Status de Visibilidade (compacto, sem título, do lado do botão editor) */}
              <button
                type="button"
                onClick={() => setAtivo(!ativo)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer select-none transition-colors text-xs font-semibold ${
                  ativo
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted border-border text-muted-foreground"
                }`}
                title="Alternar visibilidade (Ativo / Inativo)"
              >
                <span className={`inline-block w-2 h-2 rounded-full ${ativo ? "bg-emerald-500" : "bg-neutral-400"}`} />
                <span>{ativo ? "Ativo" : "Inativo"}</span>
                <div
                  className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    ativo ? "bg-emerald-500" : "bg-neutral-400 dark:bg-neutral-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ativo ? "translate-x-3" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              {/* Alternador de Abas */}
              <div className="flex bg-background border border-border rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Pré-visualização
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Corpo do Editor */}
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-3.5">
            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Campos: Linha 1 (Título + Categoria) e Linha 2 (Descrição Curta) */}
            <div className="flex flex-col gap-3">
              {/* Linha 1: Título + Categoria */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                <div className="md:col-span-8">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Título da Página
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: CCT - Antigo Mantra"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Categoria
                  </label>
                  <div className="flex items-center justify-between gap-2 bg-muted border border-border rounded-xl px-3 py-1.5 h-[38px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span
                        className="text-xs font-semibold text-foreground truncate"
                        title={currentCatObj?.name || (selectedCategory === "sem-categoria" ? "Sem Categoria (Órfã)" : selectedCategory)}
                      >
                        {currentCatObj?.name || (selectedCategory === "sem-categoria" ? "Sem Categoria" : selectedCategory)}
                      </span>
                      {isCategoryChanged && (
                        <span
                          className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0"
                          title={`Mudará para ${selectedCategory}`}
                        >
                          Novo
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCatModalMode("select");
                        setModalCatSelected(selectedCategory);
                        setNewCatError("");
                        setIsCatModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors cursor-pointer shrink-0"
                      title="Alterar ou criar nova categoria"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Alterar/Nova
                    </button>
                  </div>
                </div>
              </div>

              {/* Linha 2: Descrição Curta */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Descrição Curta (Subtítulo / Card)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Conheça o Conhecimento de embarque aéreo..."
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* Área Principal de Conteúdo */}
            <div className="flex-1 flex flex-col border border-border rounded-xl overflow-hidden bg-muted">
              {/* Barra de Ferramentas / Snippets Rápidos */}
              {activeTab === "edit" && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-background border-b border-border text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1 uppercase">
                    Inserir:
                  </span>
                  <button
                    type="button"
                    onClick={() => insertSnippet("<h2>", "</h2>", "Título da Seção")}
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Título Principal (H2)"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("<h3>", "</h3>", "Subtítulo da Seção")}
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Subtítulo (H3)"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                    H3
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("<p>", "</p>", "Texto do parágrafo.")}
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Parágrafo (<p>)"
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("<strong>", "</strong>", "texto em destaque")}
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Negrito"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippet("<em>", "</em>", "texto em itálico")}
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Itálico"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() =>
                      insertSnippet(
                        '<div class="attention">\n  <p><strong>Atenção:</strong> Insira aqui uma observação importante.</p>\n</div>\n'
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Caixa de Atenção / Alerta Laranja"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-primary" />
                    Alerta Laranja
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertSnippet(
                        '<div class="attention-copy">\n  <p>Texto ou comando para copiar</p>\n</div>\n'
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Bloco de Código / Texto para Copiar"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Bloco de Código
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertSnippet(
                        '<a class="btn" href="https://exemplo.com" target="_blank">\n  Acessar Sistema\n</a>\n'
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Botão de Link NFT"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Botão
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertSnippet(
                        '<img src="/assets/img/nomedaimagem.jpg" class="print" alt="Descrição da Imagem" />\n'
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Inserir Imagem / Print"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Print / Imagem
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      insertSnippet(
                        '<ul>\n  <li>Primeiro item</li>\n  <li>Segundo item</li>\n</ul>\n'
                      )
                    }
                    className="px-2 py-1 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    title="Lista com Marcadores"
                  >
                    <List className="w-3.5 h-3.5" />
                    Lista
                  </button>
                </div>
              )}

              {/* Visualização ou Edição */}
              <div className="flex-1 overflow-auto p-4">
                {activeTab === "edit" ? (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Escreva o conteúdo da documentação em HTML simples ou usando os atalhos acima..."
                    className="w-full h-full min-h-[350px] bg-transparent text-sm font-mono text-foreground focus:outline-none resize-none leading-relaxed"
                    spellCheck={false}
                  />
                ) : (
                  <div className="doc-content bg-background border border-border p-6 rounded-xl min-h-full">
                    <div className="border-b border-border pb-4 mb-6">
                      <h1 className="text-2xl font-bold text-heading">{title || "Sem Título"}</h1>
                      {description && (
                        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
                      )}
                    </div>
                    {content ? (
                      <div dangerouslySetInnerHTML={{ __html: content }} />
                    ) : (
                      <p className="text-muted-foreground italic text-sm">
                        Nenhum conteúdo para visualizar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted">
            <p className="text-xs text-muted-foreground">
              {content.length} caracteres • As alterações refletem imediatamente na plataforma.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium bg-primary text-white rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Salvo!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POPUP SECUNDÁRIO: Alterar / Atribuir / Adicionar Categoria */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-background border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Alterar Categoria da Documentação
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Selecione uma categoria existente ou crie uma nova categoria.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCatModalOpen(false);
                  setNewCatError("");
                }}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Alternador de Abas do Popup: Selecionar vs Nova Categoria */}
            <div className="p-3 border-b border-border bg-muted/40">
              <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCatModalMode("select");
                    setNewCatError("");
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    catModalMode === "select"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Selecionar Categoria
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCatModalMode("create");
                    setNewCatError("");
                  }}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    catModalMode === "create"
                      ? "bg-primary text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Categoria
                </button>
              </div>
            </div>

            {/* Conteúdo do Popup */}
            <div className="p-6">
              {catModalMode === "select" ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-muted/60 border border-border rounded-xl p-3.5 flex flex-col gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Documento Selecionado
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {title || "Página Sem Título"}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground truncate">
                      Referência: {docKey}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Selecione a Categoria de Destino *
                    </label>
                    <select
                      value={modalCatSelected}
                      onChange={(e) => setModalCatSelected(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors cursor-pointer"
                    >
                      {categoryList.map((cat) => (
                        <option key={cat.slug} value={cat.slug} className="bg-background">
                          {cat.name} (/dashboard/{cat.slug})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Ao salvar a edição principal, a página passará a pertencer a esta categoria.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCatModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(modalCatSelected);
                        setIsCatModalOpen(false);
                      }}
                      className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Aplicar Categoria
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateCategoryInsideModal} className="flex flex-col gap-4">
                  {newCatError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{newCatError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Nome da Nova Categoria *
                    </label>
                    <input
                      type="text"
                      value={newCatTitulo}
                      onChange={(e) => handleCatTitleChange(e.target.value)}
                      placeholder="Ex: Recursos Humanos"
                      className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Slug da Categoria (URL) *
                    </label>
                    <div className="flex items-center bg-muted border border-border rounded-xl overflow-hidden focus-within:border-primary transition-colors">
                      <span className="px-3 text-xs text-muted-foreground select-none">
                        /dashboard/
                      </span>
                      <input
                        type="text"
                        value={newCatSlug}
                        onChange={(e) =>
                          setNewCatSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[\s_]+/g, "-")
                              .replace(/[^\w\-]+/g, "")
                          )
                        }
                        placeholder="recursos-humanos"
                        className="w-full bg-transparent py-2 pr-3 text-sm text-foreground focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Descrição da Categoria (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      placeholder="Breve descrição da categoria..."
                      className="w-full bg-muted border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
                    <button
                      type="button"
                      disabled={newCatLoading}
                      onClick={() => {
                        setCatModalMode("select");
                        setNewCatError("");
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={newCatLoading}
                      className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary hover:opacity-90 text-white transition-opacity cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {newCatLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Criar e Selecionar
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
