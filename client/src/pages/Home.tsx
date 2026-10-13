import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "match with closet",
    text: "see which clothes you already own fit an outfit you saved",
    href: "/inspiration",
    cta: "view your matches",
  },
  {
    title: "create outfits",
    text: "get outfit ideas put together only from clothes in your closet",
    href: "/outfit-creator",
    cta: "outfit creator",
  },
  {
    title: "missing pieces",
    text: "find out exactly what you'd need to buy to recreate a look",
    href: "/inspiration",
    cta: "try missing pieces",
  },
];

const STEPS = [
  { title: "upload your closet", text: "take photos of your clothes. each one gets tagged by type, color, and style" },
  { title: "save inspiration", text: "upload screenshots of outfits you want to recreate" },
  { title: "fill the gaps", text: "see what matches, get outfit ideas, and find what's missing" },
];

const darkButton = "border border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900";

export default function Home() {
  return (
    <>
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="mb-8 text-4xl font-light tracking-tight md:text-5xl">
            <span className="gradient-text">outfits from clothes you already own</span>
          </h1>
          <p className="mx-auto mb-12 max-w-2xl text-lg text-zinc-500 md:text-xl">
            upload your wardrobe and the looks you like. stylematch shows what you can already wear and what you're
            missing.
          </p>
          <div className="flex flex-col justify-center gap-6 sm:flex-row">
            <Button asChild className={`${darkButton} px-6 py-6 text-sm`}>
              <Link href="/closet-upload">add to my closet</Link>
            </Button>
            <Button asChild className={`${darkButton} px-6 py-6 text-sm`}>
              <Link href="/inspiration-upload">upload inspiration</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-8 text-center"
            >
              <div>
                <h3 className="mb-4 text-xl font-light text-zinc-300">{feature.title}</h3>
                <p className="mb-8 text-zinc-500">{feature.text}</p>
              </div>
              <Button asChild className={`${darkButton} px-6 py-5 text-sm`}>
                <Link href={feature.href}>{feature.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-900 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-12 text-center text-2xl font-light tracking-tight text-zinc-300">how it works</h2>
          <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex flex-col items-center text-center">
                <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-2xl text-zinc-400">
                  {i + 1}
                </span>
                <h3 className="mb-4 text-xl text-zinc-300">{step.title}</h3>
                <p className="text-zinc-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
