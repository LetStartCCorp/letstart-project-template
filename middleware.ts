import { letstartMiddleware } from "@letstart/setup/middleware";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return letstartMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
