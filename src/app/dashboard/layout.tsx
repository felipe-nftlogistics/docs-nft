import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AttentionCopyEnhancer } from "@/components/AttentionCopyEnhancer";
import { prisma } from "@/lib/prisma";
import { getMenusFromDB } from "@/utils/db-helpers";



export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch the latest user data from DB so the image updates immediately without relogin
  const dbUser = await prisma.usuario.findUnique({
    where: { email: session.user?.email || "" },
    select: { id: true, name: true, email: true, isAdmin: true, image: true }
  });

  const menus = await getMenusFromDB();

  return (
    <SidebarProvider>
      <AttentionCopyEnhancer />
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar menus={menus} />
        <div className="flex flex-col flex-1 w-full min-w-0">
          <Navbar user={dbUser || session.user} menus={menus} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
