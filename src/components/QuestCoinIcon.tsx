/** Quest Coin mark: a minted coin with a compass-pin, legible down to 12px. */
const QuestCoinIcon = ({ className = "h-4 w-4", title }: { className?: string; title?: string }) => (
  <svg viewBox="0 0 24 24" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <circle cx="12" cy="12" r="11" fill="hsl(var(--quest-gold))" />
    <circle cx="12" cy="12" r="8.6" fill="none" stroke="hsl(var(--quest-navy))" strokeOpacity="0.35" strokeWidth="1.2" />
    <path d="M12 5.2c-2.6 0-4.5 1.9-4.5 4.4 0 3.1 4.5 8.2 4.5 8.2s4.5-5.1 4.5-8.2c0-2.5-1.9-4.4-4.5-4.4z" fill="hsl(var(--quest-navy))" />
    <circle cx="12" cy="9.6" r="1.7" fill="hsl(var(--quest-gold))" />
  </svg>
);

export default QuestCoinIcon;

export const coinLabel = (n: number) => `${n.toLocaleString()} Quest ${Math.abs(n) === 1 ? "Coin" : "Coins"}`;
