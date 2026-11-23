import { redirect } from "next/navigation";

// Design Firms and Contractors now live together on the Contacts tab. This route stays
// only so old bookmarks and links keep working.
export default async function FirmsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; allReps?: string }>;
}) {
  const params = await searchParams;
  const usp = new URLSearchParams({ type: "firms" });
  if (params.q) usp.set("q", params.q);
  if (params.allReps === "1") usp.set("allReps", "1");
  redirect(`/contacts?${usp.toString()}`);
}
