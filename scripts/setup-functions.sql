-- Function to enable pgvector
create or replace function enable_pgvector()
returns void
language plpgsql
security definer
as $$
begin
  create extension if not exists vector;
end;
$$;

-- Function to create documents table
create or replace function create_documents_table()
returns void
language plpgsql
security definer
as $$
begin
  create table if not exists documents (
    id uuid primary key default gen_random_uuid(),
    content text,
    metadata jsonb,
    embedding vector(1536)
  );
end;
$$;

-- Function to create match_documents function
create or replace function create_match_documents_function()
returns void
language plpgsql
security definer
as $$
begin
  create or replace function match_documents(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
  )
  returns table (
    id uuid,
    content text,
    metadata jsonb,
    similarity float
  )
  language plpgsql
  as $func$
  begin
    return query
    select
      documents.id,
      documents.content,
      documents.metadata,
      1 - (documents.embedding <=> query_embedding) as similarity
    from documents
    where 1 - (documents.embedding <=> query_embedding) > match_threshold
    order by similarity desc
    limit match_count;
  end;
  $func$;
end;
$$;
