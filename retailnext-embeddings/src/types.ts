export interface RawRow {
  id: string;
  gender: string;
  masterCategory: string;
  subCategory: string;
  articleType: string;
  baseColour: string;
  season: string;
  year: string;
  usage: string;
  productDisplayName: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  articleType: string;
  masterCategory: string;
  subCategory: string;
  gender: string;
  season: string;
  usage: string;
  baseColour: string;
  image: string; // "/images/{id}.jpg"
}

export interface EmbeddedProduct extends CatalogProduct {
  embedding: number[];
}
