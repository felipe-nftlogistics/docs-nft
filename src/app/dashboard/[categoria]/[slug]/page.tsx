import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DocViewer } from "@/components/DocViewer";
import { DocPageHeader } from "@/components/DocPageHeader";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export default async function ItemPage({ params }: { params: Promise<{ categoria: string, slug: string }> }) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = !!(session?.user as any)?.isAdmin;

  const categoria = await prisma.categoria.findUnique({
    where: { slug: resolvedParams.categoria },
    include: {
      documentos: {
        where: { slug: resolvedParams.slug }
      }
    }
  });

  if (!categoria || categoria.documentos.length === 0) {
    notFound();
  }

  const doc = categoria.documentos[0];
  const itemData = {
    titulo: doc.titulo,
    descricao: doc.descricao
  };

  const docKey = `${resolvedParams.categoria}/${resolvedParams.slug}`;
  const isItemAtivo = doc.ativo;
  const categoryInfo = categoria;

  // Se o item estiver inativo e o usuário não for administrador
  if (!isItemAtivo && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-heading">Conteúdo Desativado</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Esta página está temporariamente desativada ou em processo de atualização pela equipe.
        </p>
        <Link
          href={`/dashboard/${resolvedParams.categoria}`}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para {categoryInfo?.titulo || resolvedParams.categoria}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Link 
          href={`/dashboard/${resolvedParams.categoria}`} 
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para {categoryInfo?.titulo || resolvedParams.categoria}</span>
        </Link>
      </div>

      {!isItemAtivo && isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Aviso de Administrador:</strong> Esta página está marcada como <strong>INATIVA</strong>. Ela está invisível para os usuários comuns.
          </span>
        </div>
      )}

      <div className="bg-muted border border-border p-6 md:p-8 rounded-2xl shadow-xs">
        <DocPageHeader
          docKey={docKey}
          title={itemData.titulo}
          description={(itemData as any).descricao}
          initialContent={doc?.html || ""}
          ativo={isItemAtivo}
          isAdmin={isAdmin}
        />
        
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
