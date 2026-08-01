import { cn } from "@/lib/utils";

type PhoneFrameProps = {
  children: React.ReactNode;
  className?: string;
};

export function PhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[min(100%,20rem)] overflow-hidden rounded-[2.5rem] border-[6px] border-neutral-900 bg-neutral-900 shadow-overlay",
        className,
      )}
    >
      <div className="absolute top-2 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-950" />
      <div className="aspect-[9/19] overflow-hidden rounded-[2rem] bg-card">
        {children}
      </div>
    </div>
  );
}
