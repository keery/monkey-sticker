import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getCategories } from "@/lib/catalog";
import { DesignForm } from "@/components/admin/DesignForm";
import { PageHeader } from "@/components/admin/AdminUI";

export const dynamic = "force-dynamic";

export default async function EditDesignPage(
  props: PageProps<"/admin/designs/[handle]">,
) {
  const { handle } = await props.params;
  const { products } = await getCatalog();
  const design = products.find((p) => p.handle === handle && p.kind === "sticker");
  if (!design) notFound();

  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Modifier « ${design.name} »`}
        sub={
          <Link href="/admin/designs" className="text-flame hover:text-flame-deep">
            ← Tous les designs
          </Link>
        }
      />
      <DesignForm categories={categories} design={design} />
    </div>
  );
}
