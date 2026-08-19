import { redirect } from "next/navigation";

/**
 * Rewards moved under the market tab. This route stays so older links, the
 * points chip from previous builds, and anything a judge has bookmarked all
 * land somewhere sensible instead of on a 404.
 */
export default function RewardsPage() {
  redirect("/market?view=rewards");
}
