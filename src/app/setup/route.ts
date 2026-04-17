import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "node_modules", "@letstartccorp", "setup", "wizard.html"),
    "utf-8",
  );
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
