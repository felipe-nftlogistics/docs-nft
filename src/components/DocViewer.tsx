"use client";

import { useState, useEffect, useRef } from "react";
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react";

interface DocViewerProps {
  html: string;
}

export function DocViewer({ html }: DocViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Adicionar listener de clique para todas as imagens no HTML renderizado
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleImageClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target && target.tagName.toLowerCase() === "img") {
        const img = target as HTMLImageElement;
        setSelectedImage({
          src: img.src,
          alt: img.alt || "Visualização de Imagem",
        });
        setZoomLevel(1);
        setPosition({ x: 0, y: 0 });
      }
    }

    container.addEventListener("click", handleImageClick);
    return () => {
      container.removeEventListener("click", handleImageClick);
    };
  }, [html]);

  // Tecla Escape para fechar modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeModal();
      }
    }

    if (selectedImage) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedImage]);

  const closeModal = () => {
    setSelectedImage(null);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.3, 3.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.3, 0.7);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // Dragging/pan when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="doc-content pt-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Modal de Zoom da Imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          {/* Barra Superior com Controles */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-neutral-900/90 border border-neutral-700/80 rounded-xl p-1.5 shadow-xl z-10 backdrop-blur-sm">
            <button
              onClick={handleZoomIn}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Aumentar Zoom (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Diminuir Zoom (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Restaurar Tamanho Original"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <span className="text-xs text-neutral-400 font-mono px-2">
              {Math.round(zoomLevel * 100)}%
            </span>
            <div className="w-px h-5 bg-neutral-700 mx-1" />
            <button
              onClick={closeModal}
              className="p-2 text-neutral-300 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dica de navegação */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/80 border border-neutral-800 text-neutral-400 text-xs px-3.5 py-1.5 rounded-full pointer-events-none shadow-md">
            Role o mouse para dar zoom {zoomLevel > 1 ? "• Arraste para mover" : ""} • Esc para sair
          </div>

          {/* Área da Imagem */}
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`,
                transition: isDragging ? "none" : "transform 0.15s ease-out",
                maxHeight: "85vh",
                maxWidth: "90vw",
              }}
              className="object-contain rounded-lg shadow-2xl select-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
