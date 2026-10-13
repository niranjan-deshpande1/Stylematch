import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-2 text-5xl font-light text-zinc-300">404</h1>
      <p className="mb-8 text-zinc-500">that page doesn't exist</p>
      <Button asChild className="border border-zinc-800 bg-black text-zinc-300 hover:bg-zinc-900">
        <Link href="/">back to home</Link>
      </Button>
    </div>
  );
}
