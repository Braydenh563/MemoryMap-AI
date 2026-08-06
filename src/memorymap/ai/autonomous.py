"""Background worker that acts as a librarian to optimize the knowledge base."""

import threading
import time
import logging
from sqlalchemy import text
from memorymap.core import deps
from memorymap.ai import agent

_lock = threading.Lock()
_state = {"running": False, "thread": None, "stop_event": None}

def is_running() -> bool:
    with _lock:
        return _state["running"]

def _run_optimization():
    config = deps.get_config()
    db = deps.get_db()
    model_mgr = deps.get_model_manager()
    ollama = deps.get_ollama()
    
    if config.get_preference("battery_efficient_mode"):
        logging.getLogger("memorymap.autonomous").info("Autonomous optimization skipped: Battery Efficient Mode is enabled.")
        return

    logging.getLogger("memorymap.autonomous").info("Starting autonomous knowledge base optimization.")
    
    # Use the utility model or chat model based on user setting
    # We will let agent.py handle this via use_utility_model=True
        
    auto_tag = config.get_preference("auto_tag_enabled", True)
    auto_link = config.get_preference("auto_link_enabled", True)
    auto_dedupe = config.get_preference("auto_dedupe_enabled", True)
        
    with db.session() as session:
        # Prompt explicitly stating it is autonomous.
        tasks = []
        if auto_tag: tasks.append("tag untagged notes")
        if auto_link: tasks.append("create missing links between conceptually related notes")
        if auto_dedupe: tasks.append("identify and flag duplicates")
        
        if not tasks:
            logging.getLogger("memorymap.autonomous").info("Autonomous optimization skipped: All specific tasks are disabled in Settings.")
            return
            
        task_str = ", ".join(tasks)
        persona = (
            "You are an autonomous background process optimizing the user's knowledge base. "
            "You are running without user interaction. "
            f"Your task is to {task_str} using your tools. Do not ask questions or expect user replies. "
            "When you are finished making improvements, stop your turn."
        )
        
        if not auto_tag:
            persona += " Do NOT change or add tags."
        if not auto_link:
            persona += " Do NOT link notes."
            
        try:
            events = agent.run_agent(
                session=session,
                question=f"Analyze recent or isolated notes and {task_str}. Use find_similar_notes to traverse the graph conceptually. Stop when done.",
                notes=[],
                model_manager=model_mgr,
                ollama=ollama,
                persona_prompt=persona,
                blocked_tools=frozenset({"ask_user", "delete_note"}),
                max_rounds=15,
                mode="autonomous",
                use_utility_model=True,
            )
            
            for event in events:
                if event["type"] == "confirm":
                    logging.getLogger("memorymap.autonomous").info(f"Autonomous agent paused for confirmation on {event.get('name')}. Aborting.")
                    break
                if event["type"] == "tool" and not event["ok"]:
                    logging.getLogger("memorymap.autonomous").warning(f"Autonomous tool error: {event.get('error')}")
                
        except Exception as e:
             logging.getLogger("memorymap.autonomous").error(f"Autonomous execution failed: {e}", exc_info=True)
             
        finally:
             from memorymap.core import taskhistory
             taskhistory.record("autonomous", "Autonomous Knowledge Base Optimization", "completed", "Finished analyzing and linking notes.")
             
    logging.getLogger("memorymap.autonomous").info("Autonomous optimization complete.")

def _loop(stop_event):
    while not stop_event.is_set():
        config = deps.get_config()
        if config.get_preference("autonomous_tasks_enabled", False):
            try:
                _run_optimization()
            except Exception as e:
                logging.getLogger("memorymap.autonomous").error("Autonomous loop error", exc_info=True)
                
            # Run background database maintenance
            try:
                db = deps.get_db()
                with db.session() as session:
                    session.execute(text("VACUUM;"))
                    session.commit()
                logging.getLogger("memorymap.autonomous").info("Database VACUUM complete.")
                
                # Cleanup orphaned vectors
                from memorymap.ai import embeddings
                embeddings.clean_orphaned_vectors()
                
            except Exception as e:
                logging.getLogger("memorymap.autonomous").error("Database maintenance error", exc_info=True)
                
        # Sleep for the interval
        interval = int(config.get_preference("autonomous_tasks_interval_hours") or 6)
        sleep_secs = interval * 3600
        
        # Check stop_event frequently while sleeping
        for _ in range(int(sleep_secs)):
            if stop_event.is_set():
                break
            time.sleep(1)

def start():
    with _lock:
        if _state["running"]:
            return
        _state["stop_event"] = threading.Event()
        _state["thread"] = threading.Thread(target=_loop, args=(_state["stop_event"],), daemon=True, name="autonomous-agent")
        _state["thread"].start()
        _state["running"] = True

def trigger_now():
    """Manually trigger the optimization."""
    threading.Thread(target=_run_optimization, daemon=True, name="autonomous-manual").start()
