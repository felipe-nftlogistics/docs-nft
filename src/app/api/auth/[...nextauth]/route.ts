import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";



// In-memory rate limiting map (Simples proteção contra força bruta)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const MAX_ATTEMPTS = 5; // 5 tentativas
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos de bloqueio

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email;
        const now = Date.now();
        const limitRecord = rateLimitMap.get(email) || { count: 0, lastReset: now };

        // Reseta o limite se o tempo de bloqueio já passou
        if (now - limitRecord.lastReset > LOCKOUT_TIME) {
          limitRecord.count = 0;
          limitRecord.lastReset = now;
        }

        // Se excedeu o limite, rejeita a tentativa
        if (limitRecord.count >= MAX_ATTEMPTS) {
          console.warn(`[Segurança] Rate limit excedido para: ${email}`);
          throw new Error("Muitas tentativas falhas. Tente novamente mais tarde.");
        }

        // Salva o registro atualizado no mapa
        rateLimitMap.set(email, limitRecord);

        console.log("Login attempt for:", email);
        const user = await prisma.usuario.findUnique({
          where: { email }
        });

        if (!user) {
          console.log("User not found");
          // Incrementa tentativa falha para evitar enumeration attacks no tempo de resposta
          limitRecord.count += 1;
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          console.log("Invalid password for", email);
          limitRecord.count += 1;
          return null;
        }

        // Se o login for bem-sucedido, limpa o contador de rate limit
        rateLimitMap.delete(email);

        return { id: user.id.toString(), name: user.name, email: user.email, isAdmin: user.isAdmin, image: user.image };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin;
        session.user.image = token.image;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt" as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
