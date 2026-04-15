interface FilterChipsProps {
  categories: string[];
  active: string;
  onChange: (cat: string) => void;
}

const FilterChips = ({ categories, active, onChange }: FilterChipsProps) => (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {categories.map((cat) => (
      <button
        key={cat}
        onClick={() => onChange(cat)}
        className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
          active === cat
            ? "bg-secondary text-secondary-foreground elevation-1"
            : "border border-border bg-surface text-on-surface-variant hover:bg-surface-variant"
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

export default FilterChips;
