import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="font-serif text-5xl font-bold text-[var(--gold)]">
        AI Scripture Display
      </h1>
      <p className="max-w-md text-center text-lg text-gray-400">
        Real-time Bible verse display powered by voice recognition.
      </p>
      <Link
        href="/display"
        className="rounded-lg bg-[var(--gold)] px-8 py-3 text-lg font-semibold text-black transition hover:brightness-110"
      >
        Open Display
      </Link>
    </main>
  );
}
