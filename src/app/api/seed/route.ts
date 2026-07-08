import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed";
import { getCurrentUserId } from "@/lib/session";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    const result = await seedDatabase(userId);
    return NextResponse.json({
      message: "Database seeded successfully",
      ...result,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Seed failed",
      },
      { status: 500 }
    );
  }
}
