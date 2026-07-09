import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LoginRequiredDialog } from "@/components/auth/login-required-dialog";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Block every dashboard route behind a login prompt when there's no session.
  // We render the dialog instead of the children so no protected data is
  // fetched or shown to unauthenticated visitors.
  if (!session?.user) {
    return <LoginRequiredDialog />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <BottomNav />
      <main className="lg:pl-64">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
