import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'knowledge.db');

async function initializeDB() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function POST(request: Request) {
  try {
    const { embedding, threshold = 0.7, limit = 5 } = await request.json();
    const db = await initializeDB();
    
    const results = await db.all('SELECT * FROM documents');
    
    // Convert query embedding to Float32Array for comparison
    const queryVector = new Float32Array(embedding);
    
    // Calculate cosine similarity for each document
    const scoredResults = results.map((doc: any) => {
      const docVector = new Float32Array(
        new Uint8Array(doc.embedding).buffer
      );
      
      // Calculate cosine similarity
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < queryVector.length; i++) {
        dotProduct += queryVector[i] * docVector[i];
        normA += queryVector[i] * queryVector[i];
        normB += docVector[i] * docVector[i];
      }
      
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      
      return {
        id: doc.id,
        content: doc.content,
        metadata: JSON.parse(doc.metadata),
        similarity
      };
    });
    
    // Filter and sort by similarity
    const filteredResults = scoredResults
      .filter(doc => doc.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        fileName: doc.metadata.fileName,
        snippet: doc.content,
        score: doc.similarity
      }));

    await db.close();
    
    return NextResponse.json(filteredResults);
  } catch (error) {
    console.error('Error in SQLite search:', error);
    return NextResponse.json(
      { error: 'Failed to search SQLite database' },
      { status: 500 }
    );
  }
}
