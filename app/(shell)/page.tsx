import { redirect } from "next/navigation";

/**
 * The app has a single feature surface (Study), so the root route is a
 * redirect rather than its own dashboard. This also keeps deep-links like
 * `/` working from old bookmarks.
 */
export default function RootPage() {
  redirect("/study");
}
