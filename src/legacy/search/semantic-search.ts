import fetch from 'node-fetch';
import type { Logger } from '../utils/logger.js';
import type { 
  OptimizelyDocumentationResult, 
  SemanticSearchConfig 
} from '../types/index.js';

export interface DocumentEmbedding {
  documentId: string;
  embedding: number[];
  contentHash: string;
  createdAt: string;
}

export interface SemanticSearchResult {
  document: OptimizelyDocumentationResult;
  similarity: number;
  embeddingId: string;
}

export class SemanticSearchEngine {
  private logger: Logger;
  private config: SemanticSearchConfig;
  private embeddings: Map<string, DocumentEmbedding> = new Map();

  constructor(config: SemanticSearchConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing Semantic Search Engine...', {
      provider: this.config.provider,
      model: this.config.model,
      dimensions: this.config.dimensions,
    });

    if (this.config.provider === 'openai') {
      await this.validateOpenAIConfig();
    } else if (this.config.provider === 'local') {
      await this.initializeLocalModel();
    }

    this.logger.info('Semantic Search Engine initialized successfully');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (this.config.provider === 'openai') {
        return await this.generateOpenAIEmbedding(text);
      } else if (this.config.provider === 'local') {
        return await this.generateLocalEmbedding(text);
      } else {
        throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
      }
    } catch (error) {
      this.logger.error('Failed to generate embedding', { error, textLength: text.length });
      throw error;
    }
  }

  async embedDocument(document: OptimizelyDocumentationResult): Promise<DocumentEmbedding> {
    // Combine title and content for embedding, with emphasis on title
    const textToEmbed = this.prepareTextForEmbedding(document);
    
    this.logger.debug('Generating embedding for document', { 
      id: document.id, 
      textLength: textToEmbed.length 
    });

    const embedding = await this.generateEmbedding(textToEmbed);
    const contentHash = this.generateContentHash(textToEmbed);

    const documentEmbedding: DocumentEmbedding = {
      documentId: document.id,
      embedding,
      contentHash,
      createdAt: new Date().toISOString(),
    };

    // Cache the embedding
    this.embeddings.set(document.id, documentEmbedding);

    return documentEmbedding;
  }

  async searchSimilar(
    query: string, 
    documents: OptimizelyDocumentationResult[], 
    maxResults: number = 10
  ): Promise<SemanticSearchResult[]> {
    try {
      this.logger.debug('Performing semantic search', { 
        query: query.substring(0, 100), 
        documentCount: documents.length 
      });

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Calculate similarities with all documents
      const similarities: Array<{document: OptimizelyDocumentationResult, similarity: number}> = [];

      for (const doc of documents) {
        let docEmbedding = this.embeddings.get(doc.id);
        
        // Generate embedding if not cached
        if (!docEmbedding) {
          try {
            docEmbedding = await this.embedDocument(doc);
          } catch (error) {
            this.logger.warn('Failed to embed document, skipping', { 
              docId: doc.id, 
              error: error instanceof Error ? error.message : String(error) 
            });
            continue;
          }
        }

        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding.embedding);
        similarities.push({ document: doc, similarity });
      }

      // Sort by similarity (highest first) and limit results
      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxResults)
        .filter(result => result.similarity > this.config.similarityThreshold)
        .map(result => ({
          document: result.document,
          similarity: result.similarity,
          embeddingId: this.embeddings.get(result.document.id)?.documentId || '',
        }));

      this.logger.info('Semantic search completed', {
        query: query.substring(0, 50),
        resultCount: results.length,
        topSimilarity: results[0]?.similarity || 0,
      });

      return results;
    } catch (error) {
      this.logger.error('Semantic search failed', { error, query: query.substring(0, 100) });
      throw error;
    }
  }

  private async generateOpenAIEmbedding(text: string): Promise<number[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required for OpenAI embeddings');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.substring(0, 8000), // OpenAI has token limits
        model: this.config.model || 'text-embedding-3-small',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

         const data = await response.json() as any;
     if (!data.data?.[0]?.embedding) {
       throw new Error('Invalid response from OpenAI API');
     }
     return data.data[0].embedding;
  }

  private async generateLocalEmbedding(text: string): Promise<number[]> {
    // For local embeddings, we'll use a simple TF-IDF approach as a fallback
    // In a real implementation, this would use a local model like Sentence-BERT
    
    this.logger.debug('Generating local embedding (TF-IDF fallback)', { textLength: text.length });
    
    const words = this.tokenizeText(text);
    const vocabulary = this.buildVocabulary(words);
    const tfidf = this.calculateTFIDF(words, vocabulary);
    
    // Convert TF-IDF to fixed-dimension vector (pad or truncate to config.dimensions)
    const embedding = new Array(this.config.dimensions).fill(0);
    const tfidfEntries = Object.entries(tfidf);
    
    for (let i = 0; i < Math.min(embedding.length, tfidfEntries.length); i++) {
      const entry = tfidfEntries[i];
      if (entry) {
        embedding[i] = entry[1];
      }
    }
    
    // Normalize the vector
    return this.normalizeVector(embedding);
  }

  private async validateOpenAIConfig(): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Set OPENAI_API_KEY environment variable.');
    }

    // Test the API with a simple request
    try {
      await this.generateOpenAIEmbedding('test');
      this.logger.info('OpenAI API connection validated successfully');
    } catch (error) {
      this.logger.error('OpenAI API validation failed', { error });
      throw new Error('Failed to validate OpenAI API connection');
    }
  }

  private async initializeLocalModel(): Promise<void> {
    // For now, we'll use the TF-IDF fallback
    // In a real implementation, this would load a local model like:
    // - sentence-transformers/all-MiniLM-L6-v2
    // - Universal Sentence Encoder
    // - Or a custom fine-tuned model for Optimizely documentation
    
    this.logger.info('Local model initialized (TF-IDF fallback)');
  }

  private prepareTextForEmbedding(document: OptimizelyDocumentationResult): string {
    // Weight title more heavily and include key metadata
    let text = `${document.title} ${document.title} `; // Title twice for emphasis
    text += document.content;
    
    // Add tags and product info for better context
    if (document.tags && document.tags.length > 0) {
      text += ` Tags: ${document.tags.join(', ')}`;
    }
    
    text += ` Product: ${document.product} Category: ${document.category}`;
    
    // Limit text length to avoid token limits
    return text.substring(0, 6000);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length for cosine similarity');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Remove very short words
  }

  private buildVocabulary(words: string[]): Set<string> {
    return new Set(words);
  }

  private calculateTFIDF(words: string[], vocabulary: Set<string>): Record<string, number> {
    const termFreq: Record<string, number> = {};
    const totalWords = words.length;

    // Calculate term frequency
    for (const word of words) {
      termFreq[word] = (termFreq[word] || 0) + 1;
    }

    // Convert to TF-IDF (simplified version - IDF would need document corpus)
    const tfidf: Record<string, number> = {};
    for (const word of vocabulary) {
      const tf = (termFreq[word] || 0) / totalWords;
      // Simplified IDF - in practice this would use document frequency across corpus
      const idf = Math.log(100 / (1 + (termFreq[word] || 0)));
      tfidf[word] = tf * idf;
    }

    return tfidf;
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content change detection
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  // Cache management
  getCachedEmbedding(documentId: string): DocumentEmbedding | undefined {
    return this.embeddings.get(documentId);
  }

  clearCache(): void {
    this.embeddings.clear();
    this.logger.info('Embedding cache cleared');
  }

  getCacheStats(): { totalEmbeddings: number; memoryUsage: string } {
    const totalEmbeddings = this.embeddings.size;
    const avgEmbeddingSize = this.config.dimensions * 8; // 8 bytes per float64
    const memoryUsage = `${((totalEmbeddings * avgEmbeddingSize) / 1024 / 1024).toFixed(2)} MB`;
    
    return { totalEmbeddings, memoryUsage };
  }
} 