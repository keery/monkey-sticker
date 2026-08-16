import { SITE } from "@/lib/site";

// Lockup du wordmark : premier mot en coupe display très grasse et étendue,
// second mot fin dessous, ses lettres réparties par flexbox pour un calage
// exact sur la largeur du premier — quel que soit le rendu de la fonte.
// Dimensionné en em : la taille se règle via text-* sur le parent, la couleur
// via currentColor. aria-hidden : donner le nom accessible sur le conteneur
// (alt de l'image ou sr-only).
export function Wordmark({ className = "" }: { className?: string }) {
  const [top, ...rest] = SITE.name.toUpperCase().split(" ");
  const bottom = rest.join(" ");
  return (
    <span className={`inline-flex flex-col ${className}`} aria-hidden="true">
      <span className="font-display leading-none text-[1.25em]">{top}</span>
      {bottom && (
        <span className="flex justify-between leading-none mt-[0.18em] text-[0.62em] font-light">
          {bottom.split("").map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </span>
      )}
    </span>
  );
}
