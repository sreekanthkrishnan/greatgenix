import { database } from "../../shared/lib/supabase";
export async function signIn(email: string, password: string) {
  const { error } = await database().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
}
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await database().auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
  return Boolean(data.session);
}
export async function recover(email: string) {
  const { error } = await database().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/?recovery=1",
  });
  if (error) throw error;
}
export async function updatePassword(password: string) {
  const { error } = await database().auth.updateUser({ password });
  if (error) throw error;
}
export async function signOut() {
  const { error } = await database().auth.signOut();
  if (error) throw error;
}
