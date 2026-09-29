import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import sharp from "sharp";



export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
// ...
  // Keeping DELETE logic exactly the same
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    await prisma.usuario.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting user" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id, 10);

  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const isAdminStr = formData.get("isAdmin") as string;
    const imageFile = formData.get("image") as File | null;

    const isAdmin = isAdminStr === "true";

    const updateData: any = {
      name,
      email,
      isAdmin,
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    if (imageFile && imageFile.size > 0) {
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const filename = `user_${id}_${Date.now()}.webp`;
      const uploadDir = path.join(process.cwd(), "data", "uploads");
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const filepath = path.join(uploadDir, filename);
      
      // Compress the image with Sharp to WebP
      await sharp(buffer)
        .resize(300, 300, { fit: "cover", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);
      
      updateData.image = filename;
    }

    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      image: updatedUser.image,
    });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json({ error: "Error updating user" }, { status: 500 });
  }
}
