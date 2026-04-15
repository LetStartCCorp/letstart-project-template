import fs from "fs";
import path from "path";

export default function SetupPage() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "node_modules", "@letstartccorp", "setup", "wizard.html"),
    "utf-8",
  );

  return (
    <html lang="en" className="dark">
      <body dangerouslySetInnerHTML={{ __html: html }} />
    </html>
  );
}
