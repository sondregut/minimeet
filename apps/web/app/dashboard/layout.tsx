import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { signOut } from '@/lib/auth-actions';
import { Sidebar } from '@/components/dashboard/sidebar';

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const userEmail = user?.email || 'Unknown';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const userName = user?.user_metadata?.full_name || 'User';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        userEmail={userEmail}
        userInitial={userInitial}
        userName={userName}
        signOutAction={signOut}
      />

      {/* Main content */}
      <main className="flex-1 pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
