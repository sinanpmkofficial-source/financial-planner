import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "success" | "danger" | "warning";
}

const variantStyles = {
  default: "text-foreground",
  success: "text-emerald-600",
  danger: "text-rose-600",
  warning: "text-amber-600",
};

const iconBgStyles = {
  default: "bg-muted",
  success: "bg-emerald-50",
  danger: "bg-rose-50",
  warning: "bg-amber-50",
};

const iconColorStyles = {
  default: "text-muted-foreground",
  success: "text-emerald-600",
  danger: "text-rose-600",
  warning: "text-amber-600",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p
              className={cn(
                "text-2xl font-bold tracking-tight",
                variantStyles[variant]
              )}
            >
              {value}
            </p>
            {trend && (
              <p className="text-xs text-muted-foreground">{trend}</p>
            )}
          </div>
          <div
            className={cn(
              "p-2.5 rounded-xl",
              iconBgStyles[variant]
            )}
          >
            <Icon
              className={cn("w-5 h-5", iconColorStyles[variant])}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
