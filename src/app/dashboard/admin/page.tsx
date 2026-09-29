import { prisma } from "@/lib/prisma";
import { AdminClient } from "./AdminClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";



export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    redirect("/dashboard");
  }

  const users = await prisma.usuario.findMany({
    select: { id: true, name: true, email: true, isAdmin: true, image: true },
    orderBy: { id: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-heading">Gerenciar Usuários</h1>
        <p className="text-muted-foreground mt-2">
          Crie novos acessos para a plataforma NFT Logistics.
        </p>
      </div>

      <AdminClient initialUsers={users} />
    </div>
  );
}
