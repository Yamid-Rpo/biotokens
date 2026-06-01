import logo from "@/assets/bio-tokens-logo.png.asset.json";

export function Logo({ size = 36, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logo.url} alt="Bio Tokens" width={size} height={size} className="rounded-full" />
      {withText && (
        <span className="text-lg font-bold tracking-tight">
          <span style={{ color: "var(--leaf)" }}>Bio</span>{" "}
          <span style={{ color: "var(--circuit)" }}>Tokens</span>
        </span>
      )}
    </div>
  );
}
