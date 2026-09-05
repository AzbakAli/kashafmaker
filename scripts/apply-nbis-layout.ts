import fs from "fs";
import path from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { generateKashafPdf, getNbisKashafFieldConfig, getSampleContext } from "../src/lib/pdf";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const fieldConfig = getNbisKashafFieldConfig();
  const updated = await prisma.kashafTemplate.updateMany({
    where: { pageCount: 2, isActive: true },
    data: { fieldConfig: fieldConfig as unknown as Prisma.InputJsonValue },
  });
  console.log("updated templates", updated.count);

  const pdfBytes = await generateKashafPdf("templates/nbis-kashaf.pdf", fieldConfig, getSampleContext());
  const out = path.join(process.cwd(), "scripts", "pdf-preview", "layout-check.pdf");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, pdfBytes);
  console.log("wrote", out, pdfBytes.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
