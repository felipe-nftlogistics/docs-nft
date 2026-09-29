import Link from "next/link";
import { Sparkles, Verified } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLogo } from "@/components/BrandLogo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-background to-primary/10 relative">
      <div className="absolute top-8 left-8">
        <Link href="https://nftlogistics.com.br/" target="_blank">
          <BrandLogo width={80} height={80} />
        </Link>
      </div>

      <div className="absolute top-8 right-8">
        <ThemeToggle />
      </div>

      <section className="flex flex-col items-center text-center max-w-2xl gap-6">
        <Link 
          href="https://nftlogistics.com.br" 
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Plataforma de ensino NFT Logistics
        </Link>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-heading">
          Logistics with intelligent approach<br />
          <span className="text-primary mt-2 block">Let&apos;s get started</span>
        </h1>

        <p className="text-muted-foreground mt-4">
          Já possui um acesso? entre em contato com nosso suporte e solicite o seu acesso
        </p>

        <Link 
          href="/login"
          className="flex items-center gap-2 mt-8 px-8 py-3 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
        >
          Entrar na plataforma
          <Verified className="w-5 h-5" />
        </Link>
      </section>

      <p className="absolute bottom-8 text-sm text-muted-foreground">
        Copyright © NFT Logistics {new Date().getFullYear()}
      </p>
    </main>
  );
}
