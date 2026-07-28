export type ProductType = 'plushie' | 'pattern';
export type ProductAvailability = 'available' | 'unavailable';
export type ProductSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
export type ProductSortKey = 'createdAt' | 'price' | 'title';
export type ProductSortDirection = 'asc' | 'desc';
export type ShopProductTypeFilter = ProductType | 'all';

export interface ProductColorVariation {
  name: string;
  imageUrl?: string;
}

export interface ProductBase {
  id: string;
  type: ProductType;
  title: string;
  price: number;
  salePrice?: number;
  isSaleItem: boolean;
  description: string;
  thumbnailImage: string;
  available: boolean;
  sizes: ProductSize[];
  tags?: string[];
  inventoryCount?: number;
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
  salePrice?: number;
  isSaleItem?: boolean;
  description: string;
  thumbnailImage: string;
  available?: boolean;
  sizes?: ProductSize[];
  tags?: string[];
  inventoryCount?: number;
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
  salePrice?: number;
  isSaleItem?: boolean;
  description?: string;
  thumbnailImage?: string;
  available?: boolean;
  readyToShip?: boolean;
  colorVariations?: ProductColorVariation[];
  pdfKey?: string;
  sizes?: ProductSize[];
  tags?: string[];
  inventoryCount?: number;
}

export interface ShopProductFilters {
  type?: ShopProductTypeFilter;
  saleOnly?: boolean;
  color?: string;
  size?: string;
  tags?: string[];
}

export interface ShopProductBatchRequest {
  filters?: ShopProductFilters;
  batchSize?: number;
  afterId?: string;
  sort?: ProductSortKey;
  direction?: ProductSortDirection;
}

export interface ShopProductBatchResponse {
  products: Product[];
  nextCursor?: string;
  hasMore: boolean;
  appliedFilters: ShopProductFilters;
}

export interface ShopProductFilterOptions {
  colors: string[];
  sizes: ProductSize[];
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
