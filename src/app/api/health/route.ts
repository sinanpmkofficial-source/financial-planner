import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ status: "connected" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
