import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Certification } from "@/types";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { studentId, certification } = await request.json();

    if (!studentId || !certification) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const certWithId: Certification = {
      ...certification,
      id: certification.id || crypto.randomUUID(),
    };

    const studentRef = doc(db!, "students", studentId);
    await updateDoc(studentRef, {
      certifications: arrayUnion(certWithId),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      certification: certWithId,
    });
  } catch (error) {
    console.error("Error adding certification:", error);
    return NextResponse.json(
      { error: "Failed to add certification" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { studentId, certificationId } = await request.json();

    if (!studentId || !certificationId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const studentRef = doc(db!, "students", studentId);

    await updateDoc(studentRef, {
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: "Certification removed successfully",
    });
  } catch (error) {
    console.error("Error removing certification:", error);
    return NextResponse.json(
      { error: "Failed to remove certification" },
      { status: 500 }
    );
  }
}
