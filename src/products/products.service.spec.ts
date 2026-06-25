import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { Product } from './interfaces/product.interface';

// Mock fs and csv-parser to avoid reading the real file during tests
jest.mock('fs');
jest.mock('csv-parser');

describe('ProductsService', () => {
  let service: ProductsService;

  // Sample products injected directly into the service for testing
  const mockProducts: Product[] = [
    {
      displayTitle: 'Apple iPhone 14',
      embeddingText: 'Apple iPhone 14 Electronics phone smartphone mobile',
      url: 'https://example.com/iphone',
      imageUrl: 'https://example.com/iphone.png',
      productType: 'Electronics',
      discount: '0',
      price: '799.0 USD',
      variants: 'Color (Black, White)',
    },
    {
      displayTitle: 'Samsung Galaxy Watch',
      embeddingText:
        'Samsung Galaxy Watch Electronics watch smartwatch wearable',
      url: 'https://example.com/watch',
      imageUrl: 'https://example.com/watch.png',
      productType: 'Electronics',
      discount: '0',
      price: '299.0 USD',
      variants: 'Size (40mm, 44mm)',
    },
    {
      displayTitle: "Men's Leather Belt",
      embeddingText: "Men's Leather Belt Accessories gift dad fashion",
      url: 'https://example.com/belt',
      imageUrl: 'https://example.com/belt.png',
      productType: 'Accessories',
      discount: '1',
      price: '35.0 USD',
      variants: 'Size (S, M, L)',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);

    // Bypass CSV loading and inject mock data directly
    (service as unknown as { products: Product[] }).products = mockProducts;
  });

  describe('searchProducts', () => {
    it('should return up to 2 products matching the query', () => {
      const results = service.searchProducts('phone');
      expect(results.length).toBeLessThanOrEqual(2);
      expect(results[0].displayTitle).toBe('Apple iPhone 14');
    });

    it('should return the watch when searching for "watch"', () => {
      const results = service.searchProducts('watch');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].displayTitle).toBe('Samsung Galaxy Watch');
    });

    it('should return gift-related products when searching for "gift dad"', () => {
      const results = service.searchProducts('gift dad');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].displayTitle).toBe("Men's Leather Belt");
    });

    it('should return an empty array when no products match', () => {
      const results = service.searchProducts('zzznomatchzzz');
      expect(results).toEqual([]);
    });

    it('should never return more than 2 products', () => {
      // "electronics" matches both phone and watch
      const results = service.searchProducts('electronics');
      expect(results.length).toBeLessThanOrEqual(2);
    });
  });
});
