const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'Felipe', email: 'felipe@nftlogistics.com.br', password: '$2a$12$pz7zmfeJTKkSr5mZdOs9p.50135reo7mgnTgCuBVQCFIkQM/mTJ1u', isAdmin: true },
    { name: 'Vitor', email: 'vitor@nftlogistics.com.br', password: '$2a$12$.FKbaqOu8OiXpF2bgsgdru1BcIagdXxksrljAcMM8GRYqx7LgqsDy', isAdmin: false },
    { name: 'Marcos', email: 'marcos@nftlogistics.com.br', password: '$2a$12$.FKbaqOu8OiXpF2bgsgdru1BcIagdXxksrljAcMM8GRYqx7LgqsDy', isAdmin: false },
    { name: 'Thiago', email: 'thiago@nftlogistics.com.br', password: '$2a$12$.FKbaqOu8OiXpF2bgsgdru1BcIagdXxksrljAcMM8GRYqx7LgqsDy', isAdmin: false }
  ];

  for (const u of users) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }

  console.log("Database seeded!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
