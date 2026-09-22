import { database } from "./supabase";
import type { DatabaseRows } from "../types/database";
export async function readScoped<K extends keyof DatabaseRows>(
  table: K,
  orgId: string,
): Promise<DatabaseRows[K][]> {
  const rows: DatabaseRows[K][] = [];
  const order =
    table === "memberships"
      ? "userId"
      : ["enrollments", "attendance", "completions"].includes(table)
        ? "studentId"
        : "id";
  for (let offset = 0; ; offset += 500) {
    let query = database()
      .from(table)
      .select("*")
      .eq("orgId", orgId)
      .order(order);
    if (table === "enrollments") query = query.order("courseId");
    if (table === "attendance") query = query.order("sessionId");
    if (table === "completions") query = query.order("lessonId");
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data as DatabaseRows[K][]));
    if (data.length < 500) break;
  }
  return rows;
}
