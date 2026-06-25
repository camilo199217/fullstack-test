import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';
import { Product } from './interfaces/product.interface';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  private products: Product[] = [];

  /** Load CSV file into memory when the module initializes */
  async onModuleInit() {
    await this.loadProducts();
  }

  /** Reads the products_list.csv and stores all rows in memory */
  private loadProducts(): Promise<void> {
    return new Promise((resolve, reject) => {
      const csvPath = path.join(__dirname, '..', 'data', 'products_list.csv');

      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row: Product) => {
          this.products.push(row);
        })
        .on('end', () => {
          this.logger.log(`Loaded ${this.products.length} products from CSV`);
          resolve();
        })
        .on('error', reject);
    });
  }

  /**
   * Searches products by scoring each one against the query terms.
   * Splits the query into individual words and counts how many appear
   * in the product's embeddingText (case-insensitive). Returns the top 2 matches.
   *
   * @param query - The user's search query
   * @returns An array of up to 2 matching products
   */
  searchProducts(query: string): Product[] {
    const queryTerms = query.toLowerCase().split(/\s+/);

    const scored = this.products.map((product) => {
      const text = product.embeddingText.toLowerCase();
      const score = queryTerms.reduce((acc, term) => {
        return acc + (text.includes(term) ? 1 : 0);
      }, 0);
      return { product, score };
    });

    return (
      scored
        // Exclude products with zero matches (no query term found in their text)
        .filter(({ score }) => score > 0)
        // Sort by relevance: products with more matching terms come first
        .sort((a, b) => b.score - a.score)
        // Keep only the top 2 most relevant results
        .slice(0, 2)
        // Strip the score — callers only need the product data
        .map(({ product }) => product)
    );
  }
}
