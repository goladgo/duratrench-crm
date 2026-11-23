import { redirect } from "next/navigation";

// Contractors now live on the Contacts tab (filter: Contractors). This route stays only
// so old bookmarks and links keep working.
export default async function ContractorsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const usp = new URLSearchParams({ type: "contractors" });
  if (params.q) usp.set("q", params.q);
  redirect(`/contacts?${usp.toString()}`);
}
