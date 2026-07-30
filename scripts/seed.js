const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const units = [
        { nom: "Pièce", symbole: "pc" },
        { nom: "Sac", symbole: "sac" },
        { nom: "Kg", symbole: "kg" },
        { nom: "Tonne", symbole: "T" },
        { nom: "m²", symbole: "m²" },
        { nom: "m³", symbole: "m³" },
        { nom: "Mètre", symbole: "m" },
        { nom: "Litre", symbole: "L" },
        { nom: "Seau", symbole: "seau" },
        { nom: "Palette", symbole: "pal" },
        { nom: "Rouleau", symbole: "rouleau" },
        { nom: "Boîte", symbole: "boîte" },
    ];

    console.log('Début du seed des unités...');

    for (const unit of units) {
        await prisma.unite.upsert({
            where: { nom: unit.nom },
            update: {},
            create: unit,
        });
        console.log(`✅ Unité créée/mise à jour: ${unit.nom}`);
    }

    console.log('✅ Seed terminé avec succès!');
}

main()
    .catch((e) => {
        console.error('❌ Erreur lors du seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });