export type PlaceListing = {
  id: string;
  name: string;
  address: string;
  city: string;
  beds: string;
  price: string;
  neighborhood: string;
};

export const PLACE_LISTINGS: PlaceListing[] = [
  {
    id: "l1",
    name: "Harbor View Lofts",
    address: "214 Waterfront Ave",
    city: "Seattle, WA",
    beds: "2 bd",
    price: "$2,450/mo",
    neighborhood: "Waterfront",
  },
  {
    id: "l2",
    name: "Elm Street Flat",
    address: "88 Elm St",
    city: "Austin, TX",
    beds: "1 bd",
    price: "$1,680/mo",
    neighborhood: "East Side",
  },
  {
    id: "l3",
    name: "Parkside Studios",
    address: "1200 Park Ln",
    city: "Denver, CO",
    beds: "Studio",
    price: "$1,320/mo",
    neighborhood: "Capitol Hill",
  },
  {
    id: "l4",
    name: "Northgate Commons",
    address: "4100 Meridian Ave N",
    city: "Seattle, WA",
    beds: "2 bd",
    price: "$2,190/mo",
    neighborhood: "Northgate",
  },
];

export function getPlaceListing(id: string): PlaceListing | undefined {
  return PLACE_LISTINGS.find((p) => p.id === id);
}
