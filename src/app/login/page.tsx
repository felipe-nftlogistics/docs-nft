import { LoginForm } from "./LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md bg-muted rounded-2xl p-8 shadow-xl">
        <div className="flex justify-center mb-8">
          <BrandLogo width={80} height={80} />
        </div>
        
        <LoginForm />

        <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed">
          Utilize suas credenciais para acessar ao site. Lembre-se, seu login,
          IP e informações importantes de acesso serão gravadas no servidor,
          essa ferramenta é confidencial e não deve ser compartilhada com
          ninguém fora da empresa.
        </p>
      </div>
    </main>
  );
}
