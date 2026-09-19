import "dotenv/config"; // load .env explicitly — prisma.config.ts runs before any implicit env loading
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Used by the CLI (generate/db push/studio), e.g. `prisma db push`.
  // The app itself connects via the driver adapter in lib/prisma.ts.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
