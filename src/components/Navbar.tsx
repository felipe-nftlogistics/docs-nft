"use client";

import { useState, useEffect, useRef } from "react";
import { 
  LogOut, 
  Menu, 
  X, 
  FileSpreadsheet, 
  Workflow, 
  ExternalLink,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { BrandLogo } from "./BrandLogo";
import { useSidebar } from "@/contexts/SidebarContext";

export function Navbar({ user, menus }: { user: any; menus?: any }) {
  const { toggleMobile, toggleDesktop, isMobileOpen, isDesktopPinned } = useSidebar();
  const isMenuExpanded = isMobileOpen || isDesktopPinned;
  const [isOpen, setIsOpen] = useState(false);
  const [dateInfo, setDateInfo] = useState({
    dayMonth: "",
    weekday: "",
  });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const agora = new Date();
    const dia = agora.getDate().toString().padStart(2, "0");
    const mesesAno = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];
    const mesAno = mesesAno[agora.getMonth()];
    const diasSemana = [
      "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", 
      "Quinta-feira", "Sexta-feira", "Sábado"
    ];
    const diaSemana = diasSemana[agora.getDay()];

    setDateInfo({
      dayMonth: `${dia}-${mesAno}`,
      weekday: diaSemana,
    });
  }, []);

  // Fechar ao clicar fora ou com a tecla Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const iconMap: Record<string, React.ReactNode> = {
    FileSpreadsheet: <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />,
    Workflow: <Workflow className="w-4 h-4 text-primary shrink-0" />,
  };

  return (
    <header className="h-16 border-b border-border bg-muted flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-30">
      {/* Lado Esquerdo: Botão Menu + Logo no Mobile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Botão de Menu Lateral: No mobile é um Hamburger fixo; No desktop/tablet alterna PanelLeftClose / PanelLeftOpen */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.innerWidth < 768) {
              toggleMobile();
            } else {
              toggleDesktop();
            }
          }}
          className="p-2 -ml-1 rounded-xl text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center shrink-0"
          title={isMenuExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          aria-label={isMenuExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
        >
          {/* No mobile: Hamburger clássico que não muda */}
          <Menu className="w-6 h-6 text-foreground md:hidden" />

          {/* No desktop e tablet: Alterna entre PanelLeftClose e PanelLeftOpen */}
          <div className="hidden md:flex items-center justify-center">
            {isDesktopPinned ? (
              <PanelLeftClose className="w-6 h-6 text-foreground" />
            ) : (
              <PanelLeftOpen className="w-6 h-6 text-foreground" />
            )}
          </div>
        </button>

        {/* LOGO NFT LOGISTICS - No Mobile vem ao lado do botão Hamburger */}
        <Link 
          href="/dashboard" 
          className="flex items-center md:hidden group shrink-0" 
          title="NFT Logistics - Ir para o início"
        >
          <BrandLogo 
            variant="logo" 
            width={36} 
            height={36} 
          />
        </Link>

        {/* Título de contexto no Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-semibold text-heading">
            Docs NFT Logistics
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4" ref={menuRef}>
        {/* Perfil do Usuário no Topo */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
          title="Minha Conta & Widgets"
        >
          {user?.image ? (
            <Image 
              src={`/api/images/${user.image}`} 
              alt={user?.name || ""} 
              width={34} 
              height={34} 
              className="rounded-full w-8 h-8 object-cover border border-border shrink-0" 
              unoptimized 
            />
          ) : (
            <Image 
              src="/assets/img/brand/nftlogo.webp" 
              alt="Default User" 
              width={34} 
              height={34} 
              className="rounded-full w-8 h-8 object-cover border border-border shrink-0" 
            />
          )}
          <div className="hidden sm:flex flex-col">
            <span className="text-sm font-medium text-foreground leading-tight truncate max-w-[140px]">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.isAdmin ? "Admin" : "User"}</span>
          </div>
        </button>

        {/* Botão Alternar Tema */}
        <ThemeToggle />

        {/* Botão Bento Widget / Ferramentas */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            isOpen 
              ? "bg-primary/10 border-primary text-primary" 
              : "border-border text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          }`}
          title="Ferramentas e Ações Rápidas"
          aria-label="Ferramentas e Ações Rápidas"
        >
          {isOpen ? <X className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>

        {/* Menu Suspenso (Dropdown Bento Widget) */}
        {isOpen && (
          <div className="absolute right-6 top-18 w-80 max-h-[85vh] overflow-y-auto bg-muted border border-border rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            {/* SEÇÃO 1: Data com Bandeira do Brasil e Dia da Semana */}
            <div className="bg-background border border-border rounded-xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="flex items-center justify-center gap-2.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-heading">
                  {dateInfo.dayMonth || "--"}
                </span>
                <Image 
                  src="/assets/img/icons/brazil.webp" 
                  alt="Brasil" 
                  width={28} 
                  height={20} 
                  className="rounded-xs object-contain drop-shadow-xs" 
                />
              </div>
              <span className="text-xs text-muted-foreground mt-0.5 capitalize">
                {dateInfo.weekday || ""}
              </span>
            </div>

            {/* SEÇÃO 2: Usuário & Sair do Sistema */}
            <div className="bg-background border border-border rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {user?.image ? (
                  <Image 
                    src={`/api/images/${user.image}`} 
                    alt={user?.name || ""} 
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
                  <span className="text-sm font-semibold text-foreground truncate">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">{user?.isAdmin ? "Administrador" : "User"}</span>
                </div>
              </div>

              <button 
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors text-xs font-medium shrink-0 cursor-pointer"
                title="Sair do sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            {/* SEÇÃO 3: Links Importantes (Google Sheets / Docs) */}
            <div className="bg-background border border-border rounded-xl p-3 shadow-xs flex flex-col">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Links Importantes
              </span>
              <div className="flex flex-col gap-1">
                {(menus?.linksList || []).map((item: any, idx: number) => (
                  <Link
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {iconMap[item.icon] || <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />}
                      <span className="truncate">{item.titulo}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-primary transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
