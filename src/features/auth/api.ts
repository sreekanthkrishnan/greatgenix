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

export async function updateProfile(profile: {
  name: string;
  headline: string;
  bio: string;
}) {
  const name = profile.name.trim();
  const headline = profile.headline.trim();
  const bio = profile.bio.trim();
  if (!name || name.length > 100)
    throw new Error("Enter a display name between 1 and 100 characters.");
  if (headline.length > 120 || bio.length > 1000)
    throw new Error("Your profile text is too long.");
  const { error } = await database().auth.updateUser({
    data: { name, headline, bio },
  });
  if (error) throw error;
}
