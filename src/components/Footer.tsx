import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t mt-16">
      <div className="container mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <Logo size={28} />
        <p>© {new Date().getFullYear()} Bio Tokens - Certificación blockchain para reducir las emisiones de CO₂.</p>
      </div>
    </footer>
  );
}
