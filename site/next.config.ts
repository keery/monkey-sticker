import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` (sockets) et `playwright-core` (lance un navigateur headless, binaires
  // natifs) sont des modules serveur : les garder hors du bundle Next pour
  // qu'ils s'exécutent tels quels côté Node.
  serverExternalPackages: ["pg", "playwright-core"],
  experimental: {
    // Les créations de design envoient l'image via une Server Action ; la limite
    // par défaut (1 Mo) est trop basse. Filet de sécurité — l'image est déjà
    // réduite côté navigateur avant l'envoi (voir DesignForm).
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
