const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const MarkdownIt = require('markdown-it');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');
const md = new MarkdownIt();
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize SQLite
const dbPath = path.join(process.cwd(), 'knowledge.db');
let db;

async function initializeSQLite() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      content TEXT,
      metadata TEXT,
      embedding BLOB
    );
  `);
}

// Initialize the embedding model
async function generateEmbeddings(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

// Function to chunk text into smaller pieces
function chunkText(text, maxChunkSize = 1500) {
  const sentences = text.split(/[.!?]+/);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += sentence + '. ';
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Process different file types
async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);
  let content = '';

  try {
    switch (ext) {
      case '.txt':
        content = await fs.readFile(filePath, 'utf-8');
        break;
      case '.md':
        const mdContent = await fs.readFile(filePath, 'utf-8');
        content = md.render(mdContent);
        // Remove HTML tags
        content = content.replace(/<[^>]*>/g, ' ');
        break;
      case '.pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        content = pdfData.text;
        break;
      default:
        console.warn(`Unsupported file type: ${ext}`);
        return [];
    }

    // Chunk the content
    const chunks = chunkText(content);
    console.log(`Processing ${fileName}: ${chunks.length} chunks created`);
    return chunks.map(chunk => ({
      content: chunk,
      metadata: {
        fileName,
        sourceType: ext.slice(1),
        createdAt: new Date().toISOString()
      }
    }));
  } catch (error) {
    console.error(`Error processing file ${fileName}:`, error);
    return [];
  }
}

// Generate embeddings and store in both databases
async function storeEmbeddings(documents) {
  console.log('💾 Storing documents in databases...');
  
  for (const doc of documents) {
    try {
      const embedding = await generateEmbeddings(doc.content);
      const id = crypto.randomUUID();

      // Store in Supabase
      const { error: supabaseError } = await supabase
        .from('documents')
        .insert({
          id,
          content: doc.content,
          metadata: doc.metadata,
          embedding
        });

      if (supabaseError) {
        console.error('Error storing in Supabase:', supabaseError);
      }

      // Store in SQLite
      const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);
      await db.run(
        'INSERT INTO documents (id, content, metadata, embedding) VALUES (?, ?, ?, ?)',
        [id, doc.content, JSON.stringify(doc.metadata), embeddingBlob]
      );

      console.log(`✅ Stored document: ${doc.metadata.fileName}`);
    } catch (error) {
      console.error(`Error processing document:`, error);
    }
  }
}

// Process directory recursively
async function processDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const documents = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subDirDocs = await processDirectory(fullPath);
        documents.push(...subDirDocs);
      } else {
        const docs = await processFile(fullPath);
        documents.push(...docs);
      }
    }

    return documents;
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    return [];
  }
}

// Main function
async function main() {
  const dirPath = process.argv[2];
  if (!dirPath) {
    console.error('Please provide a directory path');
    process.exit(1);
  }

  console.log('🚀 Initializing embedding model...');
  console.log('📂 Processing documents...');
  
  try {
    await initializeSQLite();
    const documents = await processDirectory(dirPath);
    console.log(`Found ${documents.length} document chunks to process`);
    await storeEmbeddings(documents);
    console.log('✨ Knowledge base seeding completed!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

main();