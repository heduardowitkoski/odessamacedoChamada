export function Avatar({ src, alt = "Avatar", size = 40, fallback }: { src?: string; alt?: string; size?: number; fallback?: string }) {
  const initial = fallback || (alt && alt.length > 0 ? alt[0] : '?');

  return (
    <div className="rounded-full overflow-hidden bg-amber-100 flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={alt} width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="text-amber-700 font-bold text-sm">{initial}</span>
      )}
    </div>
  );
}
