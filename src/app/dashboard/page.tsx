import menus from "@/data/menus.json";
import Link from "next/link";
import Image from "next/image";
import { FileSpreadsheet, Workflow } from "lucide-react";

export default function DashboardPage() {
  const iconMap: Record<string, React.ReactNode> = {
    "FileSpreadsheet": <FileSpreadsheet className="w-5 h-5 text-primary" />,
    "Workflow": <Workflow className="w-5 h-5 text-primary" />,
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-heading">Início</h1>
        <p className="text-muted-foreground mt-2" dangerouslySetInnerHTML={{__html: menus.menuCategoriaList[0].descricao}}></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.menuCategoriaList.slice(1).map((cat) => (
          <Link key={cat.link} href={cat.link} className="flex flex-col bg-muted border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors group">
            <div className="h-32 w-full relative bg-black/5">
              <Image 
                src={cat.thumb} 
                alt={cat.titulo} 
                fill 
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-lg text-heading mb-2">{cat.titulo}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{__html: cat.descricao}}></p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-heading mb-4">Links Importantes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {menus.linksList.map((link, idx) => (
            <Link key={idx} href={link.link} target="_blank" className="flex items-center gap-3 p-4 bg-muted border border-border rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              {iconMap[link.icon] || <FileSpreadsheet className="w-5 h-5 text-primary" />}
              <span className="text-sm font-medium">{link.titulo}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
