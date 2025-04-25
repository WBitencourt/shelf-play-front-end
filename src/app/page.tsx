import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] min-h-screen font-[family-name:var(--font-inter-sans)]">
      <header>
        <h1>Shelf play app</h1>
      </header>
      <main className="flex flex-col items-center justify-center">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
      </main>
      <footer>Rodapé (20px)</footer>
    </div>
  );
}
