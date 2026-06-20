import { supabase } from "@/integrations/supabase/client";
import type { Dataset, DatasetColumn, DatasetRow } from "./types";

function inferType(value: unknown): "number" | "date" | "boolean" | "string" {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") {
    const s = value.trim();
    if (s === "") return "string";
    if (!Number.isNaN(Number(s.replace(/[,$%]/g, "")))) return "number";
    if (!Number.isNaN(Date.parse(s)) && /\d{2,4}[-/]\d{1,2}/.test(s)) return "date";
  }
  return "string";
}

export function inferSchema(rows: DatasetRow[]): DatasetColumn[] {
  if (rows.length === 0) return [];
  const sample = rows.slice(0, 25);
  const keys = Object.keys(sample[0] ?? {});
  return keys.map((name) => {
    const types = sample.map((r) => inferType(r[name])).filter((t) => t !== "string");
    const dominant = types.sort(
      (a, b) =>
        types.filter((t) => t === b).length - types.filter((t) => t === a).length,
    )[0];
    return { name, type: (dominant ?? "string") as DatasetColumn["type"] };
  });
}

export async function listDatasets(): Promise<Dataset[]> {
  const { data, error } = await supabase
    .from("datasets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Dataset[];
}

export async function getDataset(id: string): Promise<Dataset | null> {
  const { data, error } = await supabase.from("datasets").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Dataset) ?? null;
}

export async function getDatasetRows(id: string, limit = 5000): Promise<DatasetRow[]> {
  const { data, error } = await supabase
    .from("dataset_rows")
    .select("data, row_index")
    .eq("dataset_id", id)
    .order("row_index", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.data as DatasetRow);
}

export async function createDataset(params: {
  name: string;
  source_filename: string;
  rows: DatasetRow[];
}): Promise<Dataset> {
  const schema = inferSchema(params.rows);
  // Coerce numeric strings to numbers based on inferred schema.
  const coerced = params.rows.map((row) => {
    const out: DatasetRow = {};
    for (const col of schema) {
      const v = row[col.name];
      if (col.type === "number" && typeof v === "string") {
        const n = Number(v.replace(/[,$%\s]/g, ""));
        out[col.name] = Number.isFinite(n) ? n : null;
      } else {
        out[col.name] = (v ?? null) as DatasetRow[string];
      }
    }
    return out;
  });

  const { data: created, error } = await supabase
    .from("datasets")
    .insert({
      name: params.name,
      source_filename: params.source_filename,
      row_count: coerced.length,
      column_count: schema.length,
      schema: schema as unknown as never,
    })
    .select()
    .single();
  if (error) throw error;
  const ds = created as unknown as Dataset;

  // Cap stored rows at 5000 to keep things snappy.
  const toStore = coerced.slice(0, 5000).map((data, row_index) => ({
    dataset_id: ds.id,
    row_index,
    data: data as unknown as never,
  }));
  // Insert in chunks of 500.
  for (let i = 0; i < toStore.length; i += 500) {
    const chunk = toStore.slice(i, i + 500);
    const { error: insErr } = await supabase.from("dataset_rows").insert(chunk);
    if (insErr) throw insErr;
  }
  return ds;
}

export async function deleteDataset(id: string): Promise<void> {
  const { error } = await supabase.from("datasets").delete().eq("id", id);
  if (error) throw error;
}
