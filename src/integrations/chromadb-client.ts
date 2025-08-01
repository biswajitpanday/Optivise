/**
 * ChromaDB Integration Service
 * Manages vector database operations for Optimizely documentation storage
 */

import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { openAIClient, EmbeddingResponse } from './openai-client.js';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    product: string;
    url: string;
    title: string;
    section?: string;
    lastUpdated: string;
    contentType: 'documentation' | 'tutorial' | 'api' | 'example';
    tags?: string[];
  };
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentChunk['metadata'];
  similarity: number;
}

export interface ChromaConfig {
  host?: string;
  port?: number;
  ssl?: boolean;
  headers?: Record<string, string>;
}

export class ChromaDBService {
  private client: ChromaClient | null = null;
  private collections: Map<string, Collection> = new Map();
  private config: ChromaConfig;

  // Optimizely product collections
  private static readonly COLLECTIONS = {
    COMMERCE: 'optimizely_commerce_docs',
    CMS_PAAS: 'optimizely_cms_paas_docs',
    CMS_SAAS: 'optimizely_cms_saas_docs',
    EXPERIMENTATION: 'optimizely_experimentation_docs',
    DXP: 'optimizely_dxp_docs',
    PLATFORM: 'optimizely_platform_docs'
  } as const;

  constructor(config?: ChromaConfig) {
    this.config = {
      host: 'localhost',
      port: 8000,
      ssl: false,
      ...config
    };
  }

  /**
   * Initialize ChromaDB client and collections
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize ChromaDB client
      this.client = new ChromaClient({
        path: this.config.ssl 
          ? `https://${this.config.host}:${this.config.port}`
          : `http://${this.config.host}:${this.config.port}`
      });

      // Test connection
      const heartbeat = await this.client.heartbeat();
      if (!heartbeat) {
        console.error('ChromaDB connection failed - no heartbeat response');
        return false;
      }

      // Initialize collections for each Optimizely product
      await this.initializeCollections();

      console.log('ChromaDB initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize ChromaDB:', error);
      return false;
    }
  }

  /**
   * Initialize collections for each Optimizely product
   */
  private async initializeCollections(): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized');
    }

    const embeddingFunction = new OpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY || '',
      openai_model: 'text-embedding-ada-002'
    });

    for (const [productKey, collectionName] of Object.entries(ChromaDBService.COLLECTIONS)) {
      try {
        let collection: Collection;
        
        try {
          // Try to get existing collection
          collection = await this.client.getCollection({
            name: collectionName,
            embeddingFunction
          });
        } catch (error) {
          // Collection doesn't exist, create it
          collection = await this.client.createCollection({
            name: collectionName,
            embeddingFunction,
            metadata: {
              product: productKey.toLowerCase(),
              description: `Optimizely ${productKey} documentation and examples`,
              created: new Date().toISOString()
            }
          });
        }

        this.collections.set(collectionName, collection);
        console.log(`Collection ${collectionName} ready`);

      } catch (error) {
        console.error(`Failed to initialize collection ${collectionName}:`, error);
      }
    }
  }

  /**
   * Add document chunks to the appropriate collection
   */
  async addDocuments(documents: DocumentChunk[]): Promise<boolean> {
    if (!this.client || documents.length === 0) {
      return false;
    }

    try {
      // Group documents by product for batch insertion
      const documentsByProduct = new Map<string, DocumentChunk[]>();
      
      for (const doc of documents) {
        const collectionName = this.getCollectionName(doc.metadata.product);
        if (!documentsByProduct.has(collectionName)) {
          documentsByProduct.set(collectionName, []);
        }
        documentsByProduct.get(collectionName)!.push(doc);
      }

      // Insert documents into appropriate collections
      for (const [collectionName, docs] of documentsByProduct) {
        const collection = this.collections.get(collectionName);
        if (!collection) {
          console.warn(`Collection ${collectionName} not found, skipping documents`);
          continue;
        }

        // Generate embeddings using our OpenAI client
        const embeddings: number[][] = [];
        for (const doc of docs) {
          const embedding = await openAIClient.generateEmbedding({ text: doc.content });
          if (embedding) {
            embeddings.push(embedding.embedding);
          } else {
            console.warn(`Failed to generate embedding for document ${doc.id}`);
            embeddings.push(new Array(1536).fill(0)); // Default embedding size for ada-002
          }
        }

        // Add to collection (convert tags array to string for ChromaDB compatibility)
        const metadatas = docs.map(doc => ({
          ...doc.metadata,
          tags: doc.metadata.tags?.join(',') || ''
        }));

        await collection.add({
          ids: docs.map(doc => doc.id),
          documents: docs.map(doc => doc.content),
          metadatas: metadatas,
          embeddings: embeddings.length === docs.length ? embeddings : undefined
        });

        console.log(`Added ${docs.length} documents to ${collectionName}`);
      }

      return true;

    } catch (error) {
      console.error('Failed to add documents to ChromaDB:', error);
      return false;
    }
  }

  /**
   * Search for similar documents across all collections or specific product
   */
  async searchDocuments(
    query: string, 
    options: {
      product?: string;
      limit?: number;
      threshold?: number;
      contentTypes?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    if (!this.client) {
      return [];
    }

    try {
      const { product, limit = 10, threshold = 0.7, contentTypes } = options;
      const results: SearchResult[] = [];

      // Determine which collections to search
      const collectionsToSearch = product 
        ? [this.getCollectionName(product)]
        : Array.from(this.collections.keys());

      // Search each collection
      for (const collectionName of collectionsToSearch) {
        const collection = this.collections.get(collectionName);
        if (!collection) continue;

        try {
          const searchResults = await collection.query({
            queryTexts: [query],
            nResults: Math.min(limit, 50), // ChromaDB limit per query
            where: contentTypes ? { contentType: { $in: contentTypes } } : undefined
          });

          // Process results
          if (searchResults.ids?.[0] && searchResults.distances?.[0]) {
            const ids = searchResults.ids[0];
            const distances = searchResults.distances[0];
            
            for (let i = 0; i < ids.length; i++) {
              const distance = distances[i];
              const similarity = distance !== undefined
                ? 1 - distance // Convert distance to similarity
                : 0;

              if (similarity >= threshold) {
                const rawMetadata = searchResults.metadatas?.[0]?.[i];
                // Convert tags string back to array
                const metadata = rawMetadata ? {
                  ...rawMetadata as any,
                  tags: rawMetadata.tags ? (rawMetadata.tags as string).split(',') : []
                } as DocumentChunk['metadata'] : {} as DocumentChunk['metadata'];

                results.push({
                  id: ids[i] || `unknown_${i}`,
                  content: searchResults.documents?.[0]?.[i] || '',
                  metadata,
                  similarity
                });
              }
            }
          }

        } catch (error) {
          console.error(`Search failed for collection ${collectionName}:`, error);
        }
      }

      // Sort by similarity and limit results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    } catch (error) {
      console.error('Search operation failed:', error);
      return [];
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(): Promise<Record<string, any>> {
    if (!this.client) {
      return {};
    }

    const stats: Record<string, any> = {};

    for (const [collectionName, collection] of this.collections) {
      try {
        const count = await collection.count();
        stats[collectionName] = {
          documentCount: count,
          status: 'active'
        };
      } catch (error) {
        stats[collectionName] = {
          documentCount: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return stats;
  }

  /**
   * Delete documents by IDs
   */
  async deleteDocuments(ids: string[], product?: string): Promise<boolean> {
    if (!this.client || ids.length === 0) {
      return false;
    }

    try {
      const collectionsToUpdate = product 
        ? [this.getCollectionName(product)]
        : Array.from(this.collections.keys());

      for (const collectionName of collectionsToUpdate) {
        const collection = this.collections.get(collectionName);
        if (!collection) continue;

        try {
          await collection.delete({ ids });
          console.log(`Deleted ${ids.length} documents from ${collectionName}`);
        } catch (error) {
          console.error(`Failed to delete from ${collectionName}:`, error);
        }
      }

      return true;

    } catch (error) {
      console.error('Failed to delete documents:', error);
      return false;
    }
  }

  /**
   * Clear all documents from a collection
   */
  async clearCollection(product: string): Promise<boolean> {
    const collectionName = this.getCollectionName(product);
    const collection = this.collections.get(collectionName);

    if (!collection) {
      return false;
    }

    try {
      // Get all document IDs and delete them
      const allDocs = await collection.get();
      if (allDocs.ids && allDocs.ids.length > 0) {
        await collection.delete({ ids: allDocs.ids });
      }

      console.log(`Cleared collection ${collectionName}`);
      return true;

    } catch (error) {
      console.error(`Failed to clear collection ${collectionName}:`, error);
      return false;
    }
  }

  /**
   * Get collection name for a product
   */
  private getCollectionName(product: string): string {
    const productKey = product.toUpperCase().replace(/[^A-Z]/g, '_');
    return Object.values(ChromaDBService.COLLECTIONS).find(name => 
      name.includes(productKey.toLowerCase())
    ) || ChromaDBService.COLLECTIONS.PLATFORM;
  }

  /**
   * Check if ChromaDB is available
   */
  isAvailable(): boolean {
    return this.client !== null && this.collections.size > 0;
  }

  /**
   * Test ChromaDB connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const heartbeat = await this.client.heartbeat();
      return !!heartbeat;
    } catch (error) {
      console.error('ChromaDB connection test failed:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.collections.clear();
    this.client = null;
  }
}

// Singleton instance for global use
export const chromaDBService = new ChromaDBService();