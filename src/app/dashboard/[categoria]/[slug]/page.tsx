import menus from "@/data/menus.json";
import docContent from "@/data/docContent.json";
import { notFound } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DocViewer } from "@/components/DocViewer";

export default async function ItemPage({ params }: { params: Promise<{ categoria: string, slug: string }> }) {
  const resolvedParams = await params;
  const categoryKey = `${resolvedParams.categoria}List` as keyof typeof menus;
  const categoryData = menus[categoryKey];

  if (!categoryData || !Array.isArray(categoryData)) {
    notFound();
  }

  const expectedPath = `/dashboard/${resolvedParams.categoria}/${resolvedParams.slug}`;
  const itemData = categoryData.find((item: any) => item.link === expectedPath);

  if (!itemData) {
    notFound();
  }

  const docKey = `${resolvedParams.categoria}/${resolvedParams.slug}`;
  const doc = (docContent as Record<string, { title: string; html: string }>)[docKey];

  const categoryInfo = menus.menuCategoriaList.find(c => c.link === `/dashboard/${resolvedParams.categoria}`);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2">
        <Link 
          href={`/dashboard/${resolvedParams.categoria}`} 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para {categoryInfo?.titulo || resolvedParams.categoria}</span>
        </Link>
      </div>

      <div className="bg-muted border border-border p-6 md:p-8 rounded-2xl shadow-xs">
        <div className="flex items-start sm:items-center gap-4 border-b border-border pb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">{itemData.titulo}</h1>
            {(itemData as any).descricao && (
              <p className="text-muted-foreground mt-1 text-sm" dangerouslySetInnerHTML={{__html: (itemData as any).descricao}}></p>
            )}
          </div>
        </div>
        
        {doc?.html ? (
          <DocViewer html={doc.html} />
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm italic">
            Nenhum conteúdo adicional disponível para este item no momento.
          </div>
        )}
      </div>
    </div>
  );
}
