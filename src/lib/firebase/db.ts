import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "./config";
import { Member, MemberFormData } from "@/types";
import { v4 as uuidv4 } from "uuid";

const MEMBERS_COLLECTION = "members";

function getDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Check your environment variables.");
  }
  return db;
}

export const getAllMembers = async (): Promise<Member[]> => {
  const querySnapshot = await getDocs(collection(getDb(), MEMBERS_COLLECTION));
  return querySnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Member[];
};

export const getMemberById = async (id: string): Promise<Member | null> => {
  const docRef = doc(getDb(), MEMBERS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Member;
  }
  return null;
};

export const getMemberByVerificationId = async (verificationId: string): Promise<Member | null> => {
  const q = query(collection(getDb(), MEMBERS_COLLECTION), where("verificationId", "==", verificationId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const docSnap = querySnapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Member;
};

export const createMember = async (data: MemberFormData, createdBy: string): Promise<Member> => {
  const now = Timestamp.now();
  const memberData: Record<string, unknown> = {
    ...data,
    verificationId: uuidv4(),
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };

  Object.keys(memberData).forEach((key) => {
    if (memberData[key] === undefined) {
      delete memberData[key];
    }
  });

  const docRef = await addDoc(collection(getDb(), MEMBERS_COLLECTION), memberData);
  return { id: docRef.id, ...memberData } as Member;
};

export const updateMember = async (id: string, data: Partial<MemberFormData>): Promise<void> => {
  const docRef = doc(getDb(), MEMBERS_COLLECTION, id);
  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: Timestamp.now(),
  };

  Object.keys(updateData).forEach((key) => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await updateDoc(docRef, updateData);
};

export const deleteMember = async (id: string): Promise<void> => {
  const docRef = doc(getDb(), MEMBERS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const createMembersInBulk = async (
  members: MemberFormData[],
  createdBy: string
): Promise<{ success: number; failed: number; errors: string[]; createdIds: string[] }> => {
  const results = { success: 0, failed: 0, errors: [] as string[], createdIds: [] as string[] };

  for (const memberData of members) {
    try {
      const created = await createMember(memberData, createdBy);
      results.success++;
      results.createdIds.push(created.id);
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Failed to create ${memberData.name}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return results;
};

export const deleteMembersInBulk = async (ids: string[]): Promise<{ success: number; failed: number }> => {
  const results = { success: 0, failed: 0 };

  for (const id of ids) {
    try {
      await deleteMember(id);
      results.success++;
    } catch {
      results.failed++;
    }
  }

  return results;
};
