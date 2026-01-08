import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import crypto from "crypto";
import { AICache } from "@/types";

const CACHE_COLLECTION = "ai_cache";

function getDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Check your environment variables.");
  }
  return db;
}

function generateInputHash(input: unknown): string {
  const inputString = JSON.stringify(input);
  return crypto.createHash("sha256").update(inputString).digest("hex");
}

export async function getCachedResult(
  cacheKey: string,
  cacheType: AICache["cacheType"],
  input: unknown
): Promise<string | null> {
  try {
    const inputHash = generateInputHash(input);
    const docRef = doc(getDb(), CACHE_COLLECTION, `${cacheKey}-${inputHash}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const cacheData = docSnap.data() as AICache;

    if (cacheData.expiresAt && cacheData.expiresAt.toMillis() < Date.now()) {
      return null;
    }

    await updateDoc(docRef, {
      hitCount: cacheData.hitCount + 1,
      lastUsedAt: Timestamp.now(),
    });

    console.log(`[AI Cache] Cache HIT for ${cacheKey} (saved API call)`);
    return cacheData.output;
  } catch (error) {
    console.error("[AI Cache] Error reading cache:", error);
    return null;
  }
}

export async function generateWithCache(
  cacheKey: string,
  cacheType: AICache["cacheType"],
  input: unknown,
  output: string,
  expiresInDays?: number
): Promise<void> {
  try {
    const inputHash = generateInputHash(input);
    const now = Timestamp.now();

    const cacheData: Omit<AICache, "id"> = {
      cacheKey,
      cacheType,
      inputHash,
      output,
      metadata: { input },
      hitCount: 0,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: expiresInDays
        ? Timestamp.fromMillis(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : undefined,
    };

    const docRef = doc(getDb(), CACHE_COLLECTION, `${cacheKey}-${inputHash}`);
    await setDoc(docRef, cacheData);

    console.log(`[AI Cache] Cached result for ${cacheKey}`);
  } catch (error) {
    console.error("[AI Cache] Error writing cache:", error);
  }
}

export async function clearExpiredCache(): Promise<number> {
  try {
    const now = Timestamp.now();
    const q = query(
      collection(getDb(), CACHE_COLLECTION),
      where("expiresAt", "<=", now)
    );

    const querySnapshot = await getDocs(q);
    let deletedCount = 0;

    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(docSnap.ref);
      deletedCount++;
    }

    console.log(`[AI Cache] Cleared ${deletedCount} expired cache entries`);
    return deletedCount;
  } catch (error) {
    console.error("[AI Cache] Error clearing expired cache:", error);
    return 0;
  }
}

export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  byType: Record<string, number>;
}> {
  try {
    const querySnapshot = await getDocs(collection(getDb(), CACHE_COLLECTION));

    let totalHits = 0;
    const byType: Record<string, number> = {};

    querySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as AICache;
      totalHits += data.hitCount;
      byType[data.cacheType] = (byType[data.cacheType] || 0) + 1;
    });

    return {
      totalEntries: querySnapshot.size,
      totalHits,
      byType,
    };
  } catch (error) {
    console.error("[AI Cache] Error getting cache stats:", error);
    return { totalEntries: 0, totalHits: 0, byType: {} };
  }
}

export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    const q = query(
      collection(getDb(), CACHE_COLLECTION),
      where("cacheKey", "==", cacheKey)
    );

    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
      await deleteDoc(docSnap.ref);
    }

    console.log(`[AI Cache] Invalidated cache for ${cacheKey}`);
  } catch (error) {
    console.error("[AI Cache] Error invalidating cache:", error);
  }
}
