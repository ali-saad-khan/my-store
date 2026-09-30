import Link from "next/link";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  deltaPercent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  /** % change vs. the prior period, if this stat is trended. Omit for plain stats. */
  deltaPercent?: number;
}) {
  const body = (
    <CardContent className="flex items-start justify-between gap-3 p-4">
      <div>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {deltaPercent !== undefined && (
          <Badge
            variant={deltaPercent >= 0 ? "default" : "destructive"}
            className="mt-1"
          >
            {deltaPercent >= 0 ? <TrendingUp /> : <TrendingDown />}
            {Math.abs(deltaPercent).toFixed(1)}%
          </Badge>
        )}
      </div>
      <Icon className="text-muted-foreground size-5 shrink-0" />
    </CardContent>
  );

  return (
    <Card>
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}
