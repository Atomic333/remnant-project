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
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          active === cat
            ? "bg-primary text-primary-foreground"
            : "bg-card text-muted-foreground hover:bg-accent"
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
);

export default FilterChips;
