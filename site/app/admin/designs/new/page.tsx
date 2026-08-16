import Link from "next/link";
import { getCategories } from "@/lib/catalog";
import { DesignForm, type DesignFormInitial } from "@/components/admin/DesignForm";
import type { PatternType, Theme } from "@/lib/products";
import { PageHeader, Badge } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";

const PATTERNS: PatternType[] = [
  "gradient", "waves", "stripes", "dots", "rays", "floral", "grid", "camo",
];

function themeFromParams(sp: Record<string, string | string[] | undefined>): Theme | undefined {
  const pattern = typeof sp.pattern === "string" ? (sp.pattern as PatternType) : undefined;
  if (!pattern || !PATTERNS.includes(pattern)) return undefined;
  const colors = [sp.c1, sp.c2, sp.c3]
    .filter((c): c is string => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c));
  if (colors.length < 2) return undefined;
  return { pattern, colors: colors as Theme["colors"], dark: sp.dark === "1" };
}

export default async function NewDesignPage(props: PageProps<"/admin/designs/new">) {
  const sp = await props.searchParams;
  const categories = await getCategories();

  // pré-remplissage depuis une proposition de la veille (/admin/ideas)
  const initial: DesignFormInitial = {
    name: typeof sp.name === "string" ? sp.name : undefined,
    description: typeof sp.description === "string" ? sp.description : undefined,
    proposalId: typeof sp.pid === "string" ? sp.pid : undefined,
    theme: themeFromParams(sp),
    image:
      typeof sp.img === "string" && sp.img.startsWith("/designs/") ? sp.img : undefined,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Nouveau design
            {initial.proposalId && (
              <Badge label="Depuis la veille" cls="border-emerald-400/25 bg-emerald-400/10 text-emerald-300" />
            )}
          </span>
        }
        sub={
          <Link href="/admin/designs" className="text-flame hover:text-flame-deep">
            ← Tous les designs
          </Link>
        }
      />
      <DesignForm categories={categories} initial={initial} />
    </div>
  );
}
