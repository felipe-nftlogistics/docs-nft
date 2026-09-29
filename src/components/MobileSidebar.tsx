"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useSidebar } from "@/contexts/SidebarContext";
import { BrandLogo } from "./BrandLogo";
import {
  X,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  LogOut,
  Home,
  Globe,
  ClipboardList,
  Receipt,
  FolderKanban,
  Zap,
  Table,
  Users,
  FileEdit,
  ImageIcon,
  FileSpreadsheet,
  Workflow,
  Sparkles,
} from "lucide-react";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": Home,
  "/dashboard/comex": Globe,
  "/dashboard/controles": ClipboardList,
  "/dashboard/nota-fiscal": Receipt,
  "/dashboard/procedimentos": FolderKanban,
  "/dashboard/produtividade": Zap,
  "/dashboard/tabelas": Table,
};

const externalIconMap: Record<string, React.ReactNode> = {
  FileSpreadsheet: <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />,
  Workflow: <Workflow className="w-4 h-4 text-primary shrink-0" />,
};

function getCategorySubItems(menus: any, categoryLink: string, isAdmin: boolean): any[] {
  const categorySlug = categoryLink.split("/").pop();
  if (!categorySlug || categorySlug === "dashboard") return [];

  let rawList: any[] = [];
  if (categorySlug === "nota-fiscal") {
    rawList = (menus as any).notaList || (menus as any)["nota-fiscalList"] || [];
  } else {
    const listKey = `${categorySlug}List` as keyof typeof menus;
    rawList = (menus[listKey] as any[]) || [];
  }

  if (!Array.isArray(rawList)) return [];
  return rawList.filter((item: any) => isAdmin || item.ativo !== false);
}

export function MobileSidebar({ menus }: { menus: any }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isMobileOpen, closeMobile } = useSidebar();
  const isAdmin = !!(session?.user as any)?.isAdmin;

  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  // Fecha o drawer com a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        closeMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  const toggleAccordion = (link: string) => {
    const isAutoExpanded = link !== "/dashboard" && pathname.startsWith(link);
    const currentlyOpen = openAccordions[link] ?? isAutoExpanded;
    setOpenAccordions((prev) => ({
      ...prev,
      [link]: !currentlyOpen,
    }));
  };

  // Filtragem inteligente na busca mobile
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) {
      return menus.menuCategoriaList.map((cat: any) => ({
        ...cat,
        subItems: getCategorySubItems(menus, cat.link, isAdmin),
      }));
    }

    return menus.menuCategoriaList
      .map((cat: any) => {
        const subItems = getCategorySubItems(menus, cat.link, isAdmin);
        const catMatch = cat.titulo.toLowerCase().includes(normalizedQuery);
        const matchingSubItems = subItems.filter((sub) =>
          sub.titulo.toLowerCase().includes(normalizedQuery)
        );

        if (catMatch || matchingSubItems.length > 0) {
          return {
            ...cat,
            subItems: catMatch ? subItems : matchingSubItems,
            hasMatches: true,
          };
        }
        return null;
      })
      .filter(Boolean) as Array<
      (typeof menus.menuCategoriaList)[0] & { subItems: any[]; hasMatches?: boolean }
    >;
  }, [normalizedQuery, isAdmin]);

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop com blur escuro suave */}
      <div
        onClick={closeMobile}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer deslizante do menu */}
      <div
        className="relative w-[86vw] max-w-[340px] bg-muted border-r border-border shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-250 ease-out select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de Navegação Principal"
      >
        {/* Cabeçalho do Menu Lateral: Logo + Botão Fechar */}
        <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-background/50">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className="flex items-center gap-2 group transition-transform active:scale-95"
            title="Ir para o Início"
          >
            <BrandLogo variant="logo" width={36} height={36} />
          </Link>

          <button
            onClick={closeMobile}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pesquisa Rápida no Mobile */}
        <div className="p-3 border-b border-border shrink-0 bg-background/30">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento ou categoria..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground rounded-full"
                title="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Área de Navegação com Scroll */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Seção Principal de Categorias */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Navegação & Conteúdo
              </span>
              <span className="text-[11px] text-muted-foreground">
                {filteredCategories.length} categorias
              </span>
            </div>

            <nav className="flex flex-col gap-1">
              {filteredCategories.map((item: any) => {
                const isDashboard = item.link === "/dashboard";
                const isCurrentCategory =
                  pathname === item.link || (pathname.startsWith(item.link + "/") && !isDashboard);
                const isExactActive = pathname === item.link;
                const IconComponent = categoryIcons[item.link] || FolderKanban;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isAutoExpanded = item.link !== "/dashboard" && pathname.startsWith(item.link);
                const isExpanded = !!(normalizedQuery ? true : (openAccordions[item.link] ?? isAutoExpanded));

                return (
                  <div
                    key={item.link}
                    className={`rounded-xl transition-colors border ${
                      isCurrentCategory
                        ? "border-primary/20 bg-primary/5"
                        : "border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    {/* Linha da Categoria */}
                    <div className="flex items-center justify-between min-h-[44px] px-3">
                      <Link
                        href={item.link}
                        onClick={closeMobile}
                        className="flex items-center gap-3 py-2 flex-1 min-w-0"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isCurrentCategory
                              ? "bg-primary text-white"
                              : "bg-black/5 dark:bg-white/5 text-muted-foreground"
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-sm truncate ${
                            isExactActive
                              ? "font-bold text-primary"
                              : isCurrentCategory
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground"
                          }`}
                        >
                          {item.titulo}
                        </span>
                      </Link>

                      {/* Botão de Accordion se tiver subitens */}
                      {hasSubItems && (
                        <button
                          type="button"
                          onClick={() => toggleAccordion(item.link)}
                          className="p-2 -mr-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
                          aria-label={isExpanded ? "Recolher opções" : "Expandir opções"}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-primary" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Subitens da Categoria */}
                    {hasSubItems && isExpanded && (
                      <div className="ml-5 mb-2 pl-3 border-l-2 border-primary/20 flex flex-col gap-1 animate-in fade-in duration-150">
                        {item.subItems.map((sub: any) => {
                          const isSubActive = pathname === sub.link;
                          return (
                            <Link
                              key={sub.link}
                              href={sub.link}
                              onClick={closeMobile}
                              className={`flex items-center justify-between py-2 px-2.5 rounded-lg text-xs transition-colors min-h-[38px] ${
                                isSubActive
                                  ? "bg-primary text-white font-medium shadow-xs"
                                  : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <span className="truncate">{sub.titulo}</span>
                              {sub.ativo === false && (
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-1.5 ${
                                    isSubActive
                                      ? "bg-white/20 text-white"
                                      : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  }`}
                                >
                                  inativo
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Nenhum resultado encontrado para &quot;{searchQuery}&quot;.
                </div>
              )}
            </nav>
          </div>

          {/* Seção Administração (Somente para Admins) */}
          {isAdmin && (
            <div className="pt-2 border-t border-border">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2 block">
                Painel Administrativo
              </span>
              <div className="flex flex-col gap-1">
                <Link
                  href="/dashboard/admin/cms"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors ${
                    pathname === "/dashboard/admin/cms"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground shrink-0">
                    <FileEdit className="w-4 h-4" />
                  </div>
                  <span className="truncate">CMS / Gerenciar Páginas</span>
                </Link>

                <Link
                  href="/dashboard/admin/galeria"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors ${
                    pathname === "/dashboard/admin/galeria"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="truncate">Galeria de Imagens</span>
                </Link>

                <Link
                  href="/dashboard/admin"
                  onClick={closeMobile}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm min-h-[44px] transition-colors ${
                    pathname === "/dashboard/admin"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-muted-foreground shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="truncate">Gerenciar Usuários</span>
                </Link>
              </div>
            </div>
          )}

          {/* Seção Links Importantes (Planilhas & Fluxos de Trabalho) */}
          <div className="pt-2 border-t border-border">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2 block">
              Links Rápidos & Planilhas
            </span>
            <div className="flex flex-col gap-1">
              {(menus.linksList || []).map((link: any, idx: number) => (
                <Link
                  key={idx}
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors group min-h-[38px]"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {externalIconMap[link.icon] || (
                      <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="truncate">{link.titulo}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-opacity shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé do Menu Lateral Mobile (Usuário + Sair) */}
        <div className="p-3 border-t border-border bg-background/60 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {session?.user?.image ? (
              <Image
                src={`/api/images/${session.user.image}`}
                alt={session?.user?.name || ""}
                width={36}
                height={36}
                className="rounded-full w-9 h-9 object-cover border border-border shrink-0"
                unoptimized
              />
            ) : (
              <Image
                src="/assets/img/brand/nftlogo.webp"
                alt="Default User"
                width={36}
                height={36}
                className="rounded-full w-9 h-9 object-cover border border-border shrink-0"
              />
            )}
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-foreground truncate">
                {session?.user?.name || "Usuário"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {isAdmin ? "Administrador" : "Colaborador"}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-xs font-medium cursor-pointer shrink-0"
            title="Sair da conta"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}
