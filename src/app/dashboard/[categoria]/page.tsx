import menus from "@/data/menus.json";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

export default async function CategoryPage({ params }: { params: Promise<{ categoria: string }> }) {
  const resolvedParams = await params;
  const categoryKey = `${resolvedParams.categoria}List` as keyof typeof menus;
  const categoryData = menus[categoryKey];

  if (!categoryData || !Array.isArray(categoryData)) {
    notFound();
  }

  const categoryInfo = menus.menuCategoriaList.find(c => c.link === `/dashboard/${resolvedParams.categoria}`);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-heading">{categoryInfo?.titulo || resolvedParams.categoria}</h1>
        {categoryInfo && (
          <p className="text-muted-foreground mt-2" dangerouslySetInnerHTML={{__html: categoryInfo.descricao}}></p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryData.map((item: any) => (
          <Link key={item.link} href={item.link} className="flex flex-col bg-muted border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
            <div className="h-32 w-full relative bg-black/5">
              <Image 
                src={item.thumb} 
                alt={item.titulo} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg text-heading mb-2">{item.titulo}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{__html: item.descricao}}></p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
