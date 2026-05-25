export type Home = {
  id: string;
  name: string;
  address: string;
};

export type HomeRow = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  apartment_number: string | null;
  city: string;
  state: string;
  zip: string;
  created_at: string;
};

function formatHomeAddress(row: HomeRow): string {
  const parts: string[] = [row.address];
  if (row.apartment_number?.trim()) {
    parts.push(`Apt ${row.apartment_number.trim()}`);
  }
  const cityState = [row.city, row.state].filter(Boolean).join(", ");
  if (cityState) parts.push(cityState);
  if (row.zip?.trim()) parts.push(row.zip.trim());
  return parts.join(", ");
}

export function mapHomeRow(row: HomeRow): Home {
  return {
    id: row.id,
    name: row.name,
    address: formatHomeAddress(row),
  };
}
