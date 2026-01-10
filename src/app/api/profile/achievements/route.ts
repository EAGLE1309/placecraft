import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Achievement } from "@/types";
import crypto from "crypto";
import { cleanUndefinedValues } from "@/lib/ai/resume-ai";

export async function POST(request: NextRequest) {
  try {
    const { studentId, achievement } = await request.json();

    if (!studentId || !achievement) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const achievementWithId: Achievement = {
      ...achievement,
      id: achievement.id || crypto.randomUUID(),
    };

    const studentRef = doc(db!, "students", studentId);
    await updateDoc(studentRef, cleanUndefinedValues({
      achievements: arrayUnion(achievementWithId),
      updatedAt: Timestamp.now(),
    }));

    return NextResponse.json({
      success: true,
      achievement: achievementWithId,
    });
  } catch (error) {
    console.error("Error adding achievement:", error);
    return NextResponse.json(
      { error: "Failed to add achievement" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { studentId, achievementId } = await request.json();

    if (!studentId || !achievementId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const studentRef = doc(db!, "students", studentId);

    await updateDoc(studentRef, cleanUndefinedValues({
      updatedAt: Timestamp.now(),
    }));

    return NextResponse.json({
      success: true,
      message: "Achievement removed successfully",
    });
  } catch (error) {
    console.error("Error removing achievement:", error);
    return NextResponse.json(
      { error: "Failed to remove achievement" },
      { status: 500 }
    );
  }
}
