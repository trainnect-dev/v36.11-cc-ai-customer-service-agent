import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@supabase/supabase-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if Supabase is enabled via environment variable
const isSupabaseEnabled = process.env.ENABLE_SUPABASE_RAG?.toLowerCase() !== 'false';

// Initialize Supabase client only if enabled
export const supabase = isSupabaseEnabled ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
) : null;

// RAGSource interface
export interface RAGSource {
  id: string;
  fileName: string;
  snippet: string;
  score: number;
}

interface SupabaseDocument {
  id: string;
  content: string;
  metadata: {
    fileName: string;
  };
  similarity: number;
}

// retrieveContext function
export async function retrieveContext(
  query: string,
  knowledgeBaseId?: string,
  similarityThreshold = 0.7,
  matchCount = 5,
  minContentLength = 10
): Promise<{ context: string; isRagWorking: boolean; ragSources: RAGSource[]; sourceUsed: 'supabase' | 'sqlite' | 'none' }> {
  try {
    console.log('Starting retrieval with query:', query);
    console.log('Supabase RAG enabled:', isSupabaseEnabled);
    
    // Generate embeddings through the API route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const embeddingResponse = await fetch(`${baseUrl}/api/generate-embedding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: query }),
    });

    if (!embeddingResponse.ok) {
      console.error('Embedding generation failed:', await embeddingResponse.text());
      throw new Error('Failed to generate embedding');
    }

    const { embedding } = await embeddingResponse.json();
    console.log('Embedding generated successfully');

    // Try Supabase first if enabled
    if (isSupabaseEnabled && supabase) {
      try {
        console.log('Attempting Supabase retrieval...');
        const { data: documents, error } = await supabase
          .rpc('match_documents', {
            query_embedding: embedding,
            match_threshold: similarityThreshold,
            match_count: matchCount,
          });

        console.log('Supabase response:', { documents, error });

        if (!error && documents?.length > 0) {
          const ragSources = (documents as SupabaseDocument[])
            .filter((doc: SupabaseDocument) => doc.content.length >= minContentLength)
            .map((doc: SupabaseDocument) => ({
              id: doc.id,
              fileName: doc.metadata.fileName,
              snippet: doc.content,
              score: doc.similarity,
            }));

          const context = ragSources.map((source: RAGSource) => source.snippet).join('\n\n');
          console.log('Successfully retrieved from Supabase');
          return { context, isRagWorking: true, ragSources, sourceUsed: 'supabase' };
        }
      } catch (error) {
        console.error('Supabase retrieval failed:', error);
      }
    } else {
      console.log('Supabase RAG is disabled, skipping Supabase retrieval');
    }

    // Use SQLite (either as fallback or primary if Supabase is disabled)
    try {
      console.log('Attempting SQLite retrieval...');
      const sqliteResponse = await fetch(`${baseUrl}/api/search-sqlite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embedding,
          threshold: similarityThreshold,
          limit: matchCount
        }),
      });

      if (!sqliteResponse.ok) {
        console.error('SQLite response not ok:', await sqliteResponse.text());
        throw new Error('SQLite search failed');
      }

      const ragSources = await sqliteResponse.json();
      console.log('SQLite response:', ragSources);
      if (ragSources.length > 0) {
        const context = ragSources.map((source: RAGSource) => source.snippet).join('\n\n');
        console.log('Successfully retrieved from SQLite');
        return { context, isRagWorking: true, ragSources, sourceUsed: 'sqlite' };
      }
    } catch (error) {
      console.error('SQLite retrieval failed:', error);
    }

    console.log('No results found in either database');
    return { context: "", isRagWorking: false, ragSources: [], sourceUsed: 'none' };
  } catch (error) {
    console.error('Error in retrieveContext:', error);
    return { context: "", isRagWorking: false, ragSources: [], sourceUsed: 'none' };
  }
}