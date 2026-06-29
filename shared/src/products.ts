export type ProductType = 'plushie' | 'pattern';
export type ProductAvailability = 'available' | 'unavailable';

export interface ProductColorVariation {
  name: string;
  imageUrl?: string;
}

export interface ProductBase {
  id: string;
  type: ProductType;
  title: string;
  price: number;
  description: string;
  thumbnailImage: string;
  available: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlushieProduct extends ProductBase {
  type: 'plushie';
  readyToShip: boolean;
  colorVariations: ProductColorVariation[];
}

export interface PatternProduct extends ProductBase {
  type: 'pattern';
  pdfKey: string;
}

export type Product = PlushieProduct | PatternProduct;

export interface CreateProductBase {
  type: ProductType;
  title: string;
  price: number;
  description: string;
  thumbnailImage: string;
  available?: boolean;
}

export interface CreatePlushieProduct extends CreateProductBase {
  type: 'plushie';
  readyToShip: boolean;
  colorVariations: ProductColorVariation[];
}

export interface CreatePatternProduct extends CreateProductBase {
  type: 'pattern';
  pdfKey: string;
}

export type CreateProductInput = CreatePlushieProduct | CreatePatternProduct;

export interface UpdateProductInput {
  title?: string;
  price?: number;
  description?: string;
  thumbnailImage?: string;
  available?: boolean;
  readyToShip?: boolean;
  colorVariations?: ProductColorVariation[];
  pdfKey?: string;
}

export interface ProductPhotoUploadResult {
  bucket: string;
  key: string;
  publicUrl: string;
}

export interface PatternPdfUploadResult {
  bucket: string;
  key: string;
}
