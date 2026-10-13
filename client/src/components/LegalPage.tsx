import { Separator } from "@/components/ui/separator";

export interface LegalSection {
  title: string;
  body: string[];
}

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: LegalSection[] }) {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl">{title}</h1>
      <p className="text-zinc-400">last updated: {updated}</p>
      <Separator className="my-6 bg-zinc-800" />

      <div className="space-y-8">
        {sections.map((section, i) => (
          <section key={section.title}>
            <h2 className="mb-3 text-xl text-zinc-300">
              {i + 1}. {section.title}
            </h2>
            <div className="space-y-3 text-zinc-400">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
