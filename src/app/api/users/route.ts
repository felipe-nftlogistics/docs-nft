import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password, isAdmin } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.usuario.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isAdmin,
      },
    });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
  } catch (error) {
    return NextResponse.json({ error: "Email already exists or internal error" }, { status: 400 });
  }
}
