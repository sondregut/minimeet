'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

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

export interface CompetitionResult {
  success?: boolean;
  error?: string;
  id?: string;
}

export async function createCompetition(formData: FormData): Promise<CompetitionResult> {
  const name = formData.get('name') as string;
  const date = formData.get('date') as string;
  const location = formData.get('location') as string;
  const venue = formData.get('venue') as string;
  const description = formData.get('description') as string;
  const organizationId = formData.get('organizationId') as string;

  if (!name || !date || !location) {
    return { error: 'Name, date, and location are required' };
  }

  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: 'You must be logged in to create a competition' };
  }

  // For now, we'll create the competition without requiring an organization
  // In a real app, you'd want to select or create an organization first
  const { data, error } = await supabase
    .from('competitions')
    .insert({
      name,
      date,
      location,
      venue: venue || null,
      description: description || null,
      organization_id: organizationId || null,
      created_by: user.id,
      status: 'draft',
      settings: {},
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating competition:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');

  return { success: true, id: data.id };
}

export async function getCompetitions() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('created_by', user.id)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching competitions:', error);
    return [];
  }

  return data || [];
}

export async function getCompetition(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .eq('created_by', user.id)
    .single();

  if (error) {
    console.error('Error fetching competition:', error);
    return null;
  }

  return data;
}

export async function updateCompetitionStatus(id: string, status: string): Promise<CompetitionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('competitions')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating competition status:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/competitions');
  revalidatePath(`/dashboard/competitions/${id}`);

  return { success: true };
}
