import { SeloVerdeDashboard } from "@/components/SeloVerdeDashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_40%),linear-gradient(180deg,#f8fafc_0%,#eefbf3_100%)] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <SeloVerdeDashboard />
      </div>
    </main>
  );
}
