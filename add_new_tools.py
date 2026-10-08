import re

def insert_tools():
    filepath = 'src/memorymap/ai/tools/__init__.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # 1. Add handlers just before `def _get_current_time`
    handlers_code = """
def _search_help(session: Session, args: dict) -> dict:
    \"\"\"Reads the app's internal guide for a feature.\"\"\"
    from memorymap.ai import help_chat
    query = args.get("query") or ""
    text = help_chat.help_block_for(query)
    return {
        "guide_text": text,
        "label": f"ph:book-open Consulted guide for '{_clip(query, 40)}'",
    }

def _get_app_navigation(session: Session, args: dict) -> dict:
    \"\"\"Provides URL paths to different sections of the app.\"\"\"
    return {
        "links": {
            "Notes": "/notes",
            "Chat / Agent": "/chat",
            "Categories": "/categories",
            "Tags": "/tags",
            "Library (Files)": "/library",
            "Settings": "/settings",
            "Search": "/search",
            "Whiteboards": "/boards"
        },
        "instructions": "To provide a nav link, use markdown like [Go to Settings](/settings).",
        "label": "ph:compass Checked app navigation links",
    }
"""
    # Find _get_current_time and insert before it
    idx = content.find('def _get_current_time')
    content = content[:idx] + handlers_code + "\n\n" + content[idx:]
    
    # 2. Add to CORE_TOOLS
    core_tools_match = re.search(r'CORE_TOOLS\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if core_tools_match:
        core_tools_list = core_tools_match.group(1)
        if '"search_help"' not in core_tools_list:
            new_core = core_tools_list + '\n    "search_help",\n    "get_app_navigation",\n'
            content = content[:core_tools_match.start(1)] + new_core + content[core_tools_match.end(1):]
            
    # 3. Add ToolSpec to TOOLS
    toolspecs = """
        ToolSpec(
            "search_help",
            "Search the app's built-in help guide to learn how to use features, tabs, and settings in MemoryMap.",
            {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "What feature to learn about"}
                },
                "required": ["query"],
            },
            _search_help,
        ),
        ToolSpec(
            "get_app_navigation",
            "Get the URLs for the different sections of the app, so you can provide helpful markdown navigation links to the user.",
            {"type": "object", "properties": {}},
            _get_app_navigation,
        ),"""
        
    # Insert after `ToolSpec("get_current_time",`
    idx2 = content.find('ToolSpec(\n            "get_current_time",')
    if idx2 == -1:
        idx2 = content.find('ToolSpec(\n            "summarize_notes"') # Fallback
    
    content = content[:idx2] + toolspecs.strip() + ",\n        " + content[idx2:]
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added tools!")

if __name__ == '__main__':
    insert_tools()
