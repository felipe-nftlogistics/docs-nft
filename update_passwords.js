const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const newPassword = "NFT1652";
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.usuario.updateMany({
    data: {
      password: hashedPassword
    }
  });

  console.log("All passwords updated to 'NFT1652'");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
