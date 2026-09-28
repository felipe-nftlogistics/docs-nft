"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Edit3 } from "lucide-react";
import { DocEditorModal } from "./DocEditorModal";

interface DocPageHeaderProps {
  docKey: string;
  title: string;
  description?: string;
  initialContent?: string;
  ativo?: boolean;
  isAdmin: boolean;
}

export function DocPageHeader({
  docKey,
  title,
  description,
  initialContent = "",
  ativo = true,
  isAdmin,
}: DocPageHeaderProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-heading">{title}</h1>
              {!ativo && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Inativo
                </span>
              )}
            </div>
            {description && (
              <p
                className="text-muted-foreground mt-1 text-sm"
                dangerouslySetInnerHTML={{ __html: description }}
              />
            )}
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsEditorOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium text-xs sm:text-sm transition-colors cursor-pointer self-start sm:self-center shrink-0 border border-primary/20"
          >
            <Edit3 className="w-4 h-4" />
            Editar Página
          </button>
        )}
      </div>

      <DocEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        docKey={docKey}
        initialTitle={title}
        initialDescription={description}
        initialContent={initialContent}
        initialAtivo={ativo}
        onSaveSuccess={(updatedData) => {
          if (updatedData?.link && typeof window !== "undefined") {
            if (window.location.pathname !== updatedData.link) {
              router.push(updatedData.link);
              return;
            }
          }
          router.refresh();
        }}
      />
    </>
  );
}
