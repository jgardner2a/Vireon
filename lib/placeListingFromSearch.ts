import type { SearchLocation } from "./geocodeSearch";
import type { PlaceListing } from "./placesCatalog";

/** Maps a geocode search result to the saved-places listing shape. */
export function placeListingFromSearchLocation(
  location: SearchLocation
): PlaceListing {
  const parts = location.formattedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const address = parts[0] ?? location.name;
  const city =
    parts.length > 1 ? parts.slice(1).join(", ") : location.name;

  return {
    id: location.id,
    name: location.name,
    address,
    city,
    beds: "Place",
    price: "",
    neighborhood: "",
  };
}
