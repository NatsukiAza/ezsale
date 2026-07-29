import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: "admin" | "normal" | "success" | "warning" | "danger" | "info" | "neutral";
  children: React.ReactNode;
  className?: string;
};

const variantMap = {
  admin: "brand",
  normal: "outline",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
  neutral: "secondary",
} as const;

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant={variantMap[status]}
      className={cn(className)}
    >
      {children}
    </Badge>
  );
}
