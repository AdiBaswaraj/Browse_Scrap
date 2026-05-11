import { QueryBox } from "@/components/QueryBox";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="fyndra-blob" />
      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.3em] text-accent-400">Project Fyndra</p>
          <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
            Research anything,<br />
            <span className="text-accent-400">comprehensively.</span>
          </h1>
          <p className="mt-4 text-sm text-ink-500">
            Scrapes 20–40 sources concurrently · synthesizes structured results · streams them into a live workspace
          </p>
        </div>
        <QueryBox />
        <div className="mt-2 grid grid-cols-1 gap-2 text-left text-xs text-ink-500 md:grid-cols-3 md:text-center">
          <span>Try: best mechanical keyboards under $150</span>
          <span>Try: latest research on GLP-1 drugs</span>
          <span>Try: Toyota RAV4 vs Honda CR-V 2024</span>
        </div>
      </div>
    </main>
  );
}
