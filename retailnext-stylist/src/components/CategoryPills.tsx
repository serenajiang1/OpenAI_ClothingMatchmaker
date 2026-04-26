import { Badge } from "@/components/ui/badge";

interface Props {
  articleTypes: string[];
  selected: string | null;
  onSelect: (t: string | null) => void;
}

export function CategoryPills({ articleTypes, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-12 px-12">
      <Badge
        variant={selected === null ? "default" : "outline"}
        className="cursor-pointer flex-shrink-0 rounded-soft border-ink/15 bg-panel text-xs uppercase tracking-wide text-ink"
        onClick={() => onSelect(null)}
      >
        All
      </Badge>
      {articleTypes.map((t) => (
        <Badge
          key={t}
          variant={selected === t ? "default" : "outline"}
          className="cursor-pointer flex-shrink-0 rounded-soft border-ink/15 bg-panel text-xs uppercase tracking-wide text-ink"
          onClick={() => onSelect(t)}
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}
