"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/components/StatusBanner";
import type { Plant, Verification } from "./types";

/**
 * Bridge between the offline store and Supabase.
 *
 * The prototype's records are keyed by ids the device generated. Those travel
 * up as `client_id` and carry a unique constraint per user, so re-running a
 * sync is idempotent: a scan that is already up there is left alone rather
 * than duplicated.
 */

/** Data URL → Blob, so a captured frame can go to Storage as a real file. */
function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } | null {
  const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return { blob: new Blob([bytes], { type: mime }), ext };
}

/**
 * Upload one captured frame. The path is prefixed with the user id because the
 * storage policy keys off the first folder segment — that prefix is what stops
 * one household reading another's photographs.
 */
export async function uploadPhoto(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  dataUrl: string,
): Promise<string | null> {
  const parsed = dataUrlToBlob(dataUrl);
  if (!parsed) return null;

  const path = `${userId}/${key}.${parsed.ext}`;
  const { error } = await supabase.storage
    .from("plant-photos")
    .upload(path, parsed.blob, { contentType: parsed.blob.type, upsert: true });

  if (error) {
    console.warn("[nabta] photo upload failed:", error.message);
    notify("upload", "That photo could not be uploaded. The record is saved on this device and will retry.");
    return null;
  }
  return path;
}

/** Signed URL for a stored photo. The bucket is private, so this is the only way in. */
export async function photoUrl(
  supabase: SupabaseClient,
  path: string,
  seconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("plant-photos")
    .createSignedUrl(path, seconds);
  return error ? null : data.signedUrl;
}

/** Push a plant, returning its cloud uuid so scans can point at it. */
export async function pushPlant(
  supabase: SupabaseClient,
  userId: string,
  plant: Plant,
): Promise<string | null> {
  let coverPath: string | null = null;
  if (plant.cover) {
    coverPath = await uploadPhoto(supabase, userId, `plants/${plant.id}`, plant.cover);
  }

  const { data, error } = await supabase
    .from("plants")
    .upsert(
      {
        user_id: userId,
        client_id: plant.id,
        species: plant.species,
        species_arabic: plant.speciesArabic,
        nickname: plant.nickname,
        identity: plant.identity,
        history: plant.history,
        log_count: plant.logCount,
        created_at: new Date(plant.createdAt).toISOString(),
        last_seen_at: new Date(plant.lastSeenAt).toISOString(),
        ...(coverPath ? { cover_path: coverPath } : {}),
      },
      { onConflict: "user_id,client_id" },
    )
    .select("id")
    .maybeSingle();

  if (error) {
    console.warn("[nabta] plant sync failed:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Push one scan: user id, timestamp, and the scan payload as JSON.
 *
 * The captured frame is stripped out of the JSON and uploaded to Storage
 * instead, with only its path kept on the row. A base64 frame inside a jsonb
 * column would bloat every dashboard query that touches the table.
 */
export async function pushScan(
  supabase: SupabaseClient,
  userId: string,
  v: Verification,
  plantUuid: string | null,
  district?: { emirate?: string; area?: string },
): Promise<boolean> {
  let photoPath: string | null = null;
  if (v.image) {
    photoPath = await uploadPhoto(supabase, userId, `scans/${v.id}`, v.image);
  }

  const { image: _frame, ...payload } = v;

  const { error } = await supabase.from("scans").upsert(
    {
      user_id: userId,
      client_id: v.id,
      created_at: new Date(v.createdAt).toISOString(),
      scan: payload,
      plant_id: plantUuid,
      photo_path: photoPath,
      emirate: district?.emirate ?? null,
      area: district?.area ?? null,
    },
    { onConflict: "user_id,client_id" },
  );

  if (error) {
    console.warn("[nabta] scan sync failed:", error.message);
    notify("sync", "A record could not be saved to your account. It is kept on this device until it syncs.");
    return false;
  }
  return true;
}

/** Which client ids this user already has in the cloud. */
export async function fetchSyncedIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("scans")
    .select("client_id")
    .eq("user_id", userId);
  if (error || !data) return new Set();
  return new Set(
    data.map((r) => (r as { client_id: string | null }).client_id).filter(Boolean) as string[],
  );
}

export interface CloudPull {
  verifications: Verification[];
  plants: Plant[];
}

/**
 * Pull this user's records back down — what makes a new phone show the same
 * history instead of an empty account.
 */
export async function pullAll(
  supabase: SupabaseClient,
  userId: string,
): Promise<CloudPull> {
  const [scansRes, plantsRes] = await Promise.all([
    supabase
      .from("scans")
      .select("client_id, created_at, scan")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("plants")
      .select("client_id, species, species_arabic, nickname, identity, history, log_count, created_at, last_seen_at")
      .eq("user_id", userId)
      .order("last_seen_at", { ascending: false })
      .limit(200),
  ]);

  const verifications: Verification[] = (scansRes.data ?? []).map((r) => {
    const row = r as { client_id: string; created_at: string; scan: Verification };
    return {
      ...row.scan,
      id: row.client_id ?? row.scan.id,
      createdAt: new Date(row.created_at).getTime(),
      // Frames live in Storage; the local copy stays empty until it is asked for.
      image: "",
    };
  });

  const plants: Plant[] = (plantsRes.data ?? []).map((r) => {
    const row = r as {
      client_id: string;
      species: string;
      species_arabic: string;
      nickname: Plant["nickname"];
      identity: string;
      history: Plant["history"];
      log_count: number;
      created_at: string;
      last_seen_at: string;
    };
    return {
      id: row.client_id,
      species: row.species,
      speciesArabic: row.species_arabic,
      nickname: row.nickname,
      identity: row.identity,
      history: row.history ?? [],
      logCount: row.log_count ?? 0,
      createdAt: new Date(row.created_at).getTime(),
      lastSeenAt: new Date(row.last_seen_at).getTime(),
      cover: "",
    };
  });

  return { verifications, plants };
}

/** Keep the cloud profile in step with the local one. */
export async function pushProfile(
  supabase: SupabaseClient,
  userId: string,
  p: { name?: string; area?: string; emirate?: string; locale?: string },
): Promise<void> {
  const { error } = await supabase.from("profiles").update(p).eq("id", userId);
  if (error) console.warn("[nabta] profile sync failed:", error.message);
}
