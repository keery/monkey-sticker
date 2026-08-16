// Atelier des emails : liste et prévisualise tous les templates de l'application
// (source = lib/emails/registry). Les emails sont rendus côté serveur pour
// chaque langue, puis explorés dans un composant client.

import { PageHeader } from "@/components/admin/AdminUI";
import { EmailGallery, type PreviewData } from "@/components/admin/EmailGallery";
import { EMAIL_PREVIEWS } from "@/lib/emails/registry";
import { EMAIL_LOCALES, type EmailLocale, type RenderedEmail } from "@/lib/emails/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Emails — Atelier Monkey Sticker" };

export default function AdminEmailsPage() {
  const templates: PreviewData[] = EMAIL_PREVIEWS.map((p) => {
    const variants = {} as Record<EmailLocale, RenderedEmail>;
    for (const loc of EMAIL_LOCALES) variants[loc] = p.render(loc);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      translated: p.translated,
      variants,
    };
  });

  return (
    <div>
      <PageHeader
        title="Emails"
        sub={`${templates.length} templates transactionnels & marketing — aperçu multi-langues, tel que le client les recevra.`}
      />
      <EmailGallery templates={templates} />
    </div>
  );
}
