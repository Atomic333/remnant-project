interface FilterChipsProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

const FilterChips = ({ categories, active, onChange }: FilterChipsProps) => (
  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
    {categories.map((cat) => (
      <button
        key={cat}
        onClick={() => onChange(cat)}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
          active === cat
            ? "bg-foreground text-background"
            : "border border-border bg-background text-foreground hover:border-foreground"
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

export default FilterChips;
