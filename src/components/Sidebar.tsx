"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ChevronRight, 
  Settings, 
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
  PanelLeftClose, 
  PanelLeftOpen 
} from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { MobileSidebar } from "./MobileSidebar";
import { useSidebar } from "@/contexts/SidebarContext";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": Home,
  "/dashboard/comex": Globe,
  "/dashboard/controles": ClipboardList,
  "/dashboard/nota-fiscal": Receipt,
  "/dashboard/procedimentos": FolderKanban,
  "/dashboard/produtividade": Zap,
  "/dashboard/tabelas": Table,
};

export function Sidebar({ menus }: { menus: any }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isDesktopPinned, setIsDesktopPinned } = useSidebar();
  
  const [isHovered, setIsHovered] = useState(false);
  const suppressHoverRef = useRef(false);

  const handleMouseEnter = () => {
    // Em telas touch (tablet/mobile), não expande por hover para não travar aberto
    if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      return;
    }
    if (!suppressHoverRef.current) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    suppressHoverRef.current = false;
    setIsHovered(false);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExpanded) {
      // Recolher imediatamente e suprimir hover
      suppressHoverRef.current = true;
      setIsHovered(false);
      setIsDesktopPinned(false);
      localStorage.setItem("sidebar_pinned", "false");
    } else {
      // Expandir e fixar
      suppressHoverRef.current = false;
      setIsDesktopPinned(true);
      localStorage.setItem("sidebar_pinned", "true");
    }
  };

  const isExpanded = isDesktopPinned || (isHovered && !suppressHoverRef.current);

  const isLinkActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <>
      <aside 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`${
        isExpanded ? "w-64" : "w-[72px]"
      } bg-muted border-r border-border hidden md:flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out select-none relative z-20`}
    >
      {/* Topo do Sidebar (Logo + Botão de Fixar/Recolher) */}
      <div className={`h-16 flex items-center border-b border-border transition-all duration-300 ${
        isExpanded ? "justify-start px-5" : "justify-center px-3"
      }`}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden shrink-0" title="Início">
          <BrandLogo 
            variant={isExpanded ? "logo" : "icon"} 
            width={isExpanded ? 36 : 30} 
            height={isExpanded ? 36 : 30} 
          />
        </Link>
      </div>

      {/* Navegação */}
      <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
        <nav className="flex flex-col gap-1.5 px-2.5">


          {menus.menuCategoriaList.map((item: any) => {
            const isActive = isLinkActive(item.link) && item.link !== "/dashboard" || (item.link === "/dashboard" && pathname === "/dashboard");
            const isCategoryActive = isLinkActive(item.link) && item.link !== "/dashboard";
            const isAdmin = !!(session?.user as any)?.isAdmin;
            const categorySlug = item.link.split("/").pop();
            const subItemsKey = `${categorySlug}List` as keyof typeof menus;
            const rawSubItems = categorySlug === "nota-fiscal"
              ? ((menus as any).notaList || (menus as any)["nota-fiscalList"] || [])
              : (menus[subItemsKey] as any[]) || [];
            const subItems = Array.isArray(rawSubItems)
              ? rawSubItems.filter((sub) => isAdmin || sub.ativo !== false)
              : [];
            const IconComponent = categoryIcons[item.link] || FolderKanban;

            return (
              <div key={item.link} className="flex flex-col">
                <Link
                  href={item.link}
                  title={!isExpanded ? item.titulo : undefined}
                  className={`flex items-center rounded-xl text-sm transition-colors ${
                    isExpanded 
                      ? "justify-between px-3.5 py-2.5" 
                      : "justify-center p-2.5"
                  } ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <IconComponent className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    {isExpanded && (
                      <span className="truncate animate-in fade-in duration-200">
                        {item.titulo}
                      </span>
                    )}
                  </div>

                  {isExpanded && item.link !== "/dashboard" && (
                    <ChevronRight className={`w-4 h-4 transition-transform shrink-0 ${isCategoryActive ? "rotate-90 text-primary" : "opacity-40"}`} />
                  )}
                </Link>
                
                {/* Subitens da Categoria */}
                {isExpanded && isCategoryActive && subItems.length > 0 && (
                  <div className="flex flex-col ml-5 mt-1 border-l-2 border-border pl-2 gap-1 animate-in fade-in duration-200">
                    {subItems.map((sub) => (
                      <Link
                        key={sub.link}
                        href={sub.link}
                        className={`px-3 py-1.5 rounded-md text-xs transition-colors truncate flex items-center justify-between gap-1.5 ${
                          pathname === sub.link
                            ? "text-primary font-medium bg-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate">{sub.titulo}</span>
                        {sub.ativo === false && (
                          <span className="text-[10px] text-amber-500 font-medium shrink-0">
                            (inativo)
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Seção Administração */}
          {(session?.user as any)?.isAdmin && (
            <>
              {isExpanded && (
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 mt-5 truncate animate-in fade-in duration-200">
                  Administração
                </p>
              )}
              <div className="mt-1 flex flex-col gap-1">
                <Link
                  href="/dashboard/admin/cms"
                  title={!isExpanded ? "Gerenciar Páginas / CMS" : undefined}
                  className={`flex items-center rounded-xl text-sm transition-colors ${
                    isExpanded 
                      ? "gap-3 px-3.5 py-2.5" 
                      : "justify-center p-2.5"
                  } ${
                    isLinkActive("/dashboard/admin/cms", true)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <FileEdit className={`w-5 h-5 shrink-0 ${isLinkActive("/dashboard/admin/cms", true) ? "text-primary" : "text-muted-foreground"}`} />
                  {isExpanded && (
                    <span className="truncate animate-in fade-in duration-200">
                       CMS / Páginas
                    </span>
                  )}
                </Link>

                <Link
                  href="/dashboard/admin/galeria"
                  title={!isExpanded ? "Galeria de Imagens & Mídia" : undefined}
                  className={`flex items-center rounded-xl text-sm transition-colors ${
                    isExpanded 
                      ? "gap-3 px-3.5 py-2.5" 
                      : "justify-center p-2.5"
                  } ${
                    isLinkActive("/dashboard/admin/galeria", true)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <ImageIcon className={`w-5 h-5 shrink-0 ${isLinkActive("/dashboard/admin/galeria", true) ? "text-primary" : "text-muted-foreground"}`} />
                  {isExpanded && (
                    <span className="truncate animate-in fade-in duration-200">
                      Galeria de Imagens
                    </span>
                  )}
                </Link>

                <Link
                  href="/dashboard/admin"
                  title={!isExpanded ? "Gerenciar Usuários" : undefined}
                  className={`flex items-center rounded-xl text-sm transition-colors ${
                    isExpanded 
                      ? "gap-3 px-3.5 py-2.5" 
                      : "justify-center p-2.5"
                  } ${
                    isLinkActive("/dashboard/admin", true)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <Users className={`w-5 h-5 shrink-0 ${isLinkActive("/dashboard/admin", true) ? "text-primary" : "text-muted-foreground"}`} />
                  {isExpanded && (
                    <span className="truncate animate-in fade-in duration-200">
                      Usuários
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
        </nav>
      </div>
    </aside>
    <MobileSidebar menus={menus} />
    </>
  );
}
