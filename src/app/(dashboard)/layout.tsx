import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DbSyncIndicator } from "@/components/shared/db-sync-indicator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <BottomNav />
      {/* Mobile top bar — gives the sync indicator a standalone home on small screens */}
      <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-border bg-card/85 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">₹</span>
          </div>
          <span className="font-semibold tracking-tight">Finance</span>
        </div>
        <DbSyncIndicator />
      </header>
      <main className="lg:pl-64">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
