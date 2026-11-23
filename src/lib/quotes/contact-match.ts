// Matching a typed "person quoting" against the contacts already at a branch, so typing
// "john smith" reuses "John Smith" instead of creating a duplicate contact.

export interface ContactLite {
  id: string;
  name: string;
  title: string | null;
  phone: string | null;
  email: string | null;
}

export function normalizePersonName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findContactByName<T extends { name: string }>(contacts: T[], typed: string): T | null {
  const target = normalizePersonName(typed);
  if (!target) return null;
  return contacts.find((c) => normalizePersonName(c.name) === target) ?? null;
}

// Contacts whose name starts with / contains what's been typed, for suggestion chips.
export function suggestContacts<T extends { name: string }>(contacts: T[], typed: string, limit = 6): T[] {
  const target = normalizePersonName(typed);
  if (!target) return contacts.slice(0, limit);
  return contacts
    .filter((c) => normalizePersonName(c.name).includes(target))
    .slice(0, limit);
}
