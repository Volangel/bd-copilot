import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseSocial } from "@/lib/contact-workbench/parseSocial";

const schema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = schema.parse(body);
    const parsed = await parseSocial(url);
    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? "Invalid payload" }, { status: 400 });
    }
    console.error("parse-social failed", { err });
    return NextResponse.json({ error: "Failed to parse social" }, { status: 500 });
  }
}
