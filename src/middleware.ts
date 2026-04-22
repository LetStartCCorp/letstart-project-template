// ⚠️ DO NOT REMOVE the letstart setup gate — it powers the first-run wizard.
import { withLetStartSetup } from "@letstartccorp/setup/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Add your app middleware logic here:
function appMiddleware(request: NextRequest) {
  // Example: protect routes, add headers, etc.
  return NextResponse.next();
}

// Wraps your middleware with the LetStart setup gate.
// When LETSTART_SETUP_COMPLETE is not set, ALL routes redirect to /setup.
export default withLetStartSetup(appMiddleware);

export const config = {
  matcher: ["/((?!_next|favicon.ico|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)"],
};
