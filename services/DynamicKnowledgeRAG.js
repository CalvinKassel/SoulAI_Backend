// Dynamic Knowledge RAG System - Auto-ingestion for SoulAI
// Automatically processes new .md files and creates searchable knowledge base

const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const { Configuration, OpenAIApi } = require('openai');

class DynamicKnowledgeRAG {
  constructor() {
    this.knowledgeBasePath = path.join(__dirname, '../knowledgebase');
    this.vectorStore = new Map();
    this.metadataStore = new Map();
    this.fileWatcher = null;
    this.openai = null;
    this.initialized = false;
    
    // Knowledge categories mapped to hex code dimensions
    this.categoryMapping = {
      'hexcode-dimensions/metaphysical-core': {
        weight: 0.4,
        dimension: 'hue',
        type: 'metaphysical'
      },
      'hexcode-dimensions/manifested-self': {
        weight: 0.3,
        dimension: 'manifested',
        type: 'behavioral'
      },
      'hexcode-dimensions/human-soul': {
        weight: 0.3,
        dimension: 'soul',
        type: 'spiritual'
      },
      'core/personality': {
        weight: 0.35,
        dimension: 'hue',
        type: 'personality'
      },
      'core/compatibility': {
        weight: 0.6,
        dimension: 'compatibility',
        type: 'matching'
      },
      'relationships': {
        weight: 0.5,
        dimension: 'relational',
        type: 'relationship'
      },
      'matching': {
        weight: 0.7,
        dimension: 'compatibility',
        type: 'algorithm'
      },
      'specialized': {
        weight: 0.4,
        dimension: 'contextual',
        type: 'specialized'
      }
    };
    
    this.initializeOpenAI();
  }

  // Initialize OpenAI for embeddings
  initializeOpenAI() {
    try {
      if (process.env.OPENAI_API_KEY) {
        const configuration = new Configuration({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.openai = new OpenAIApi(configuration);
      }
    } catch (error) {
      console.log('OpenAI not available, using fallback embeddings');
    }
  }

  // Initialize the RAG system
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Ensure knowledge base directory exists
      await this.ensureDirectoryStructure();
      
      // Initial scan of existing files
      await this.scanAndProcessAllFiles();
      
      // Start file watcher
      this.startFileWatcher();
      
      this.initialized = true;
      console.log('Dynamic Knowledge RAG initialized successfully');
      
    } catch (error) {
      console.error('Error initializing Dynamic Knowledge RAG:', error);
      this.initialized = true; // Continue with fallback
    }
  }

  // Ensure directory structure exists
  async ensureDirectoryStructure() {
    const directories = [
      'core/personality',
      'core/compatibility', 
      'core/psychology',
      'hexcode-dimensions/metaphysical-core',
      'hexcode-dimensions/manifested-self',
      'hexcode-dimensions/human-soul',
      'relationships/stages',
      'relationships/communication',
      'relationships/coaching',
      'matching/algorithms',
      'matching/strategies',
      'specialized/therapeutic',
      'specialized/cultural',
      'specialized/developmental'
    ];

    for (const dir of directories) {
      const fullPath = path.join(this.knowledgeBasePath, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          console.error(`Error creating directory ${dir}:`, error);
        }
      }
    }
  }

  // Start file watcher for auto-ingestion
  startFileWatcher() {
    this.fileWatcher = chokidar.watch(this.knowledgeBasePath, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    this.fileWatcher
      .on('add', (filePath) => this.handleFileAdd(filePath))
      .on('change', (filePath) => this.handleFileChange(filePath))
      .on('unlink', (filePath) => this.handleFileDelete(filePath))
      .on('error', (error) => console.error('File watcher error:', error));

    console.log('File watcher started - monitoring knowledge base for changes');
  }

  // Handle new file addition
  async handleFileAdd(filePath) {
    if (path.extname(filePath) === '.md') {
      console.log(`New knowledge file detected: ${filePath}`);
      await this.processMarkdownFile(filePath);
    }
  }

  // Handle file changes
  async handleFileChange(filePath) {
    if (path.extname(filePath) === '.md') {
      console.log(`Knowledge file updated: ${filePath}`);
      await this.processMarkdownFile(filePath);
    }
  }

  // Handle file deletion
  async handleFileDelete(filePath) {
    if (path.extname(filePath) === '.md') {
      console.log(`Knowledge file deleted: ${filePath}`);
      this.vectorStore.delete(filePath);
      this.metadataStore.delete(filePath);
    }
  }

  // Scan and process all existing files
  async scanAndProcessAllFiles() {
    const files = await this.getAllMarkdownFiles(this.knowledgeBasePath);
    
    for (const file of files) {
      await this.processMarkdownFile(file);
    }
    
    console.log(`Processed ${files.length} knowledge files`);
  }

  // Get all markdown files recursively
  async getAllMarkdownFiles(dir) {
    const files = [];
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...await this.getAllMarkdownFiles(fullPath));
        } else if (path.extname(item) === '.md') {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return files;
  }

  // Process a markdown file
  async processMarkdownFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(this.knowledgeBasePath, filePath);
      
      // Extract metadata
      const metadata = this.extractMetadata(content, relativePath);
      
      // Create embeddings
      const embeddings = await this.createEmbeddings(content);
      
      // Store in vector store
      this.vectorStore.set(filePath, {
        content,
        embeddings,
        chunks: this.chunkContent(content),
        processed: new Date().toISOString()
      });
      
      // Store metadata
      this.metadataStore.set(filePath, metadata);
      
      console.log(`Processed: ${relativePath} (${metadata.category})`);
      
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  }

  // Extract metadata from file path and content
  extractMetadata(content, relativePath) {
    const pathParts = relativePath.split(path.sep);
    const filename = path.basename(relativePath, '.md');
    
    // Determine category from path
    let category = 'general';
    let subcategory = '';
    let hexcodeDimension = null;
    
    // Map to hex code dimensions
    if (pathParts.includes('metaphysical-core')) {
      category = 'metaphysical-core';
      hexcodeDimension = 'hue';
      subcategory = this.getArchetypeFromFilename(filename);
    } else if (pathParts.includes('manifested-self')) {
      category = 'manifested-self';
      hexcodeDimension = 'manifested';
      subcategory = filename.replace(/-/g, '_');
    } else if (pathParts.includes('human-soul')) {
      category = 'human-soul';
      hexcodeDimension = 'soul';
      subcategory = filename.replace(/-/g, '_');
    } else if (pathParts.includes('compatibility')) {
      category = 'compatibility';
      hexcodeDimension = 'compatibility';
    } else if (pathParts.includes('relationships')) {
      category = 'relationships';
      hexcodeDimension = 'relational';
    } else if (pathParts.includes('matching')) {
      category = 'matching';
      hexcodeDimension = 'compatibility';
    }
    
    // Extract title from content
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1] : filename.replace(/-/g, ' ');
    
    // Extract tags
    const tags = this.extractTags(content);
    
    return {
      filename,
      title,
      category,
      subcategory,
      hexcodeDimension,
      tags,
      relativePath,
      weight: this.getCategoryWeight(category),
      lastModified: new Date().toISOString()
    };
  }

  // Map filename to archetype for metaphysical core
  getArchetypeFromFilename(filename) {
    const archetypeMap = {
      'cognitive-intellectual': 0,
      'inventive-analytical': 45,
      'action-creative': 90,
      'empathetic-collaborative': 135,
      'relational-emotional': 180,
      'insightful-transformative': 225,
      'purpose-growth': 270,
      'contemplative-visionary': 315
    };
    
    return archetypeMap[filename] !== undefined ? archetypeMap[filename] : null;
  }

  // Get category weight
  getCategoryWeight(category) {
    for (const [key, value] of Object.entries(this.categoryMapping)) {
      if (key.includes(category)) {
        return value.weight;
      }
    }
    return 0.5; // Default weight
  }

  // Extract tags from content
  extractTags(content) {
    const tags = [];
    
    // Look for tags in front matter
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const frontMatter = frontMatterMatch[1];
      const tagsMatch = frontMatter.match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        tags.push(...tagsMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')));
      }
    }
    
    // Look for inline tags
    const inlineTags = content.match(/#\w+/g);
    if (inlineTags) {
      tags.push(...inlineTags.map(t => t.replace('#', '')));
    }
    
    return [...new Set(tags)];
  }

  // Create embeddings for content
  async createEmbeddings(content) {
    if (this.openai) {
      try {
        const chunks = this.chunkContent(content);
        const embeddings = [];
        
        for (const chunk of chunks) {
          const response = await this.openai.createEmbedding({
            model: 'text-embedding-ada-002',
            input: chunk
          });
          embeddings.push(response.data.data[0].embedding);
        }
        
        return embeddings;
      } catch (error) {
        console.error('Error creating embeddings:', error);
        return this.createFallbackEmbeddings(content);
      }
    } else {
      return this.createFallbackEmbeddings(content);
    }
  }

  // Create fallback embeddings using simple text analysis
  createFallbackEmbeddings(content) {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};
    
    words.forEach(word => {
      word = word.replace(/[^a-z]/g, '');
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    // Create simple vector representation
    const commonWords = ['personality', 'relationship', 'compatibility', 'emotion', 'behavior', 'psychology'];
    const vector = commonWords.map(word => wordFreq[word] || 0);
    
    return [vector];
  }

  // Chunk content for better processing
  chunkContent(content) {
    const chunks = [];
    const sections = content.split(/\n## /);
    
    for (const section of sections) {
      if (section.trim().length > 100) {
        // Split long sections into smaller chunks
        const words = section.split(' ');
        for (let i = 0; i < words.length; i += 200) {
          chunks.push(words.slice(i, i + 200).join(' '));
        }
      } else if (section.trim().length > 0) {
        chunks.push(section);
      }
    }
    
    return chunks;
  }

  // Query the knowledge base
  async query(queryText, options = {}) {
    const {
      hexcodeDimension = null,
      category = null,
      maxResults = 5,
      minSimilarity = 0.3
    } = options;
    
    const results = [];
    
    // Search through all stored knowledge
    for (const [filePath, data] of this.vectorStore.entries()) {
      const metadata = this.metadataStore.get(filePath);
      
      // Filter by dimension/category if specified
      if (hexcodeDimension && metadata.hexcodeDimension !== hexcodeDimension) {
        continue;
      }
      
      if (category && metadata.category !== category) {
        continue;
      }
      
      // Calculate similarity
      const similarity = this.calculateSimilarity(queryText, data.content);
      
      if (similarity >= minSimilarity) {
        results.push({
          filePath,
          content: data.content,
          chunks: data.chunks,
          metadata,
          similarity,
          relevantChunks: this.findRelevantChunks(queryText, data.chunks)
        });
      }
    }
    
    // Sort by similarity and apply weights
    results.sort((a, b) => {
      const scoreA = a.similarity * a.metadata.weight;
      const scoreB = b.similarity * b.metadata.weight;
      return scoreB - scoreA;
    });
    
    return results.slice(0, maxResults);
  }

  // Calculate similarity between query and content
  calculateSimilarity(query, content) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const querySet = new Set(queryWords);
    const contentSet = new Set(contentWords);
    
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    const union = new Set([...querySet, ...contentSet]);
    
    return intersection.size / union.size;
  }

  // Find relevant chunks for a query
  findRelevantChunks(query, chunks) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevantChunks = [];
    
    for (const chunk of chunks) {
      const chunkWords = chunk.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter(word => chunkWords.includes(word));
      
      if (commonWords.length > 0) {
        relevantChunks.push({
          content: chunk,
          relevance: commonWords.length / queryWords.length
        });
      }
    }
    
    return relevantChunks.sort((a, b) => b.relevance - a.relevance).slice(0, 3);
  }

  // Get knowledge for hex code dimension
  async getKnowledgeForHexCode(hexCode, queryContext = '') {
    const { hue, manifested, soul } = this.parseHexCode(hexCode);
    
    // Get archetype-specific knowledge
    const archetype = this.getArchetypeFromHue(hue);
    const archetypeKnowledge = await this.query(`${archetype} ${queryContext}`, {
      hexcodeDimension: 'hue',
      maxResults: 3
    });
    
    // Get manifested self knowledge
    const manifestedKnowledge = await this.query(`manifested self ${queryContext}`, {
      hexcodeDimension: 'manifested',
      maxResults: 2
    });
    
    // Get soul depth knowledge
    const soulKnowledge = await this.query(`soul depth ${queryContext}`, {
      hexcodeDimension: 'soul',
      maxResults: 2
    });
    
    return {
      archetype: {
        type: archetype,
        hue: hue,
        knowledge: archetypeKnowledge
      },
      manifested: {
        level: manifested,
        knowledge: manifestedKnowledge
      },
      soul: {
        depth: soul,
        knowledge: soulKnowledge
      }
    };
  }

  // Parse hex code to dimensions
  parseHexCode(hexCode) {
    const hex = hexCode.replace('#', '');
    const h = parseInt(hex.substr(0, 2), 16);
    const m = parseInt(hex.substr(2, 2), 16);
    const s = parseInt(hex.substr(4, 2), 16);
    
    return {
      hue: (h / 255) * 360,
      manifested: m,
      soul: s
    };
  }

  // Get archetype from hue
  getArchetypeFromHue(hue) {
    const archetypes = {
      0: 'Cognitive/Intellectual',
      45: 'Inventive/Analytical',
      90: 'Action/Creative',
      135: 'Empathetic/Collaborative',
      180: 'Relational/Emotional',
      225: 'Insightful/Transformative',
      270: 'Purpose/Growth',
      315: 'Contemplative/Visionary'
    };
    
    let closest = 0;
    let minDistance = Math.abs(hue - 0);
    
    for (const [degree, name] of Object.entries(archetypes)) {
      const distance = Math.abs(hue - parseInt(degree));
      if (distance < minDistance) {
        minDistance = distance;
        closest = parseInt(degree);
      }
    }
    
    return archetypes[closest];
  }

  // Get stats about the knowledge base
  getStats() {
    const totalFiles = this.vectorStore.size;
    const categoryCounts = {};
    
    for (const metadata of this.metadataStore.values()) {
      categoryCounts[metadata.category] = (categoryCounts[metadata.category] || 0) + 1;
    }
    
    return {
      totalFiles,
      categoryCounts,
      initialized: this.initialized,
      watchingPath: this.knowledgeBasePath
    };
  }

  // Clean up
  async cleanup() {
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
    
    this.vectorStore.clear();
    this.metadataStore.clear();
    this.initialized = false;
  }
}

module.exports = DynamicKnowledgeRAG;