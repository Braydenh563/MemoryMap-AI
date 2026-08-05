# Handover & Changelog

This document summarizes the changes, design decisions, and architectural additions made during this session. It serves as a handover for future sessions.

## 1. N+1 Query Optimization
- **Problem**: Large notebooks caused UI lockups due to systemic N+1 database queries when fetching category names and paths.
- **Solution**: Implemented `bulk_category_names` in `src/memorymap/entry/manager.py` which retrieves all required categories in a single query.
- **Impacted Routes**: 
  - `routes_timeline.py` (`get_timeline`)
  - `routes_graph.py` (`get_graph`)
  - `routes_insights.py` (`get_dashboard_stats`)
  - `routes_settings.py` (during export generation)
- **Result**: The UI now loads large notebooks nearly instantly without database stalls.

## 2. Timeline UI Enhancements (D3.js)
- **Problem**: The Timeline feature was static and lacked interactivity.
- **Solution**: Re-implemented the Timeline view using D3.js.
  - Added a toggle between Grid View (chronological dots) and Branch View (interactive force-directed graph connecting notes).
  - Wired up D3 pan/zoom interactions and responsive sizing.
  - Clicking on nodes correctly triggers the `openTimelinePopup` logic.
- **Files Touched**: `frontend/app.js`, `frontend/index.html`.

## 3. Smart Model Routing & Background Jobs
- **Problem**: Background tasks (like vector indexing, autonomous tagging, and database maintenance) were occupying the main chat model, slowing down the user experience.
- **Solution**: 
  - Updated `src/memorymap/ai/agent.py` to accept a `use_utility_model` flag in `run_agent()` and `build_agent_messages()`.
  - Updated `src/memorymap/ai/autonomous.py` to trigger background agents using the utility model.
  - Added a `smart_model_routing_enabled` toggle in `config.py` (default: `True`) so users can override routing globally.
  - Wired the UI toggle for Smart Model Routing in `frontend/index.html` (under Settings -> AI Models) and `frontend/app.js`.

## 4. Autonomous Database Maintenance
- **Problem**: SQLite database fragmentation and orphaned vector records.
- **Solution**: 
  - Added a `VACUUM;` database command in the autonomous background loop (`autonomous.py`).
  - Implemented `clean_orphaned_vectors()` in `embeddings.py` and hooked it into the autonomous loop to delete `EmbeddingRecord` rows whose parent `Entry` no longer exists.

## 5. Semantic Search Integration
- **Problem**: The note search was strictly keyword-based, preventing users from searching by concepts.
- **Solution**: 
  - Updated `src/memorymap/api/routes_entries.py` (`list_entries`) to accept `semantic: bool` and `q: str`.
  - When `semantic=true`, it delegates to `search_manager.semantic_search()`, scoring entries by embedding similarity.
  - Added a "✨ Semantic" checkbox next to the search bar in `frontend/index.html`.
  - Wired `app.js` to dispatch a semantic search query (`/entries?q=...&semantic=true`) and redraw the UI when enabled.

## Design Decisions
- **Settings Exposure**: For `smart_model_routing_enabled`, the decision was made to place it near the Utility Model selection rather than Autonomous Tasks, as it directly impacts *which* model is chosen.
- **Client vs Server Search**: The app previously loaded all notes into `app.js` and filtered locally. For Semantic Search, vector cosine distance must be calculated on the backend. When Semantic Search is checked, `app.js` forces a fresh `apiJson("/entries?q=...&semantic=true")` request, replacing the client cache temporarily. When unchecked, it reverts to the local keyword filter, maintaining high performance for standard use.
- **D3 over Canvas**: Chosen for the Timeline Branch View for built-in collision and force-directed algorithms, maintaining aesthetic consistency with modern web apps.

## Outstanding Work / Next Steps
- **Semantic Search Refinement**: The threshold is currently `score >= 0.25`. This may need tuning depending on the user's selected embedding model (`nomic-embed-text` vs `sentence-transformers`).
- **End-to-End Testing**: Ensure comprehensive frontend testing for the newly added D3 timeline interactions.
