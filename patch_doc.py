import sys

with open('src/memorymap/ai/tools/documents.py', 'r', encoding='utf-8') as f:
    content = f.read()

get_doc_original = """def _get_document(session: Session, args: dict) -> dict:
    from memorymap.core.database import Document

    document = session.get(Document, int(args["document_id"]))
    if document is None:
        raise ToolError(f"No document with id {args.get('document_id')}")
    text = document.content
    clipped = _clip(text, DOCUMENT_CHARS)
    return {
        "id": document.id,
        "title": document.title,
        "content": clipped,
        "truncated": len(clipped) < len(text),
        "words": len(text.split()),
        "label": f"ph:file-text Read the document “{_clip(document.title, 40)}”",
    }"""

get_doc_new = """def _get_document(session: Session, args: dict) -> dict:
    from memorymap.core.database import Document
    from memorymap.core import deps

    document = session.get(Document, int(args["document_id"]))
    if document is None:
        raise ToolError(f"No document with id {args.get('document_id')}")
    text = document.content
    
    query = args.get("query")
    if query:
        # Simple semantic chunking for Local RAG
        from memorymap.ai.embeddings import cosine_similarity
        embeddings = deps.get_embeddings()
        
        # Split into paragraphs
        chunks = [p.strip() for p in text.split("\\n\\n") if len(p.strip()) > 20]
        if chunks:
            # Embed the query
            try:
                q_vec = embeddings.embed(embeddings.backend_id(), query)
                
                # We could embed all chunks, but that might be slow. 
                # For Local RAG polish, we embed them and rank:
                chunk_vecs = [embeddings.embed(embeddings.backend_id(), c) for c in chunks]
                scored = [(cosine_similarity(q_vec, cv), c) for cv, c in zip(chunk_vecs, chunks)]
                scored.sort(key=lambda x: x[0], reverse=True)
                
                # Take top 3 chunks
                best_chunks = [c for _, c in scored[:3]]
                clipped = "\\n\\n...\\n\\n".join(best_chunks)
            except Exception:
                # Fallback if embedding fails
                clipped = _clip(text, DOCUMENT_CHARS)
        else:
            clipped = _clip(text, DOCUMENT_CHARS)
    else:
        clipped = _clip(text, DOCUMENT_CHARS)
        
    return {
        "id": document.id,
        "title": document.title,
        "content": clipped,
        "truncated": len(clipped) < len(text),
        "words": len(text.split()),
        "label": f"ph:file-text Read the document “{_clip(document.title, 40)}”" + (f" (extracted snippets for query)" if query else ""),
    }"""

if get_doc_original in content:
    content = content.replace(get_doc_original, get_doc_new)
    with open('src/memorymap/ai/tools/documents.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("documents.py updated.")
else:
    print("Target not found!")
    sys.exit(1)
