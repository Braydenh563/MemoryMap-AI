from memorymap.vendor.flashtext import KeywordProcessor

# A massive, comprehensive default taxonomy mapping keywords to categories
# This allows MemoryMap to instantly recognize concepts offline without AI.
from memorymap.vendor.flashtext import KeywordProcessor
from collections import Counter

# A massive, comprehensive default taxonomy mapping keywords to domains
# Researched from modern PKM strategies (PARA, Zettelkasten, Second Brain)
TAXONOMY_MAP = {
    # 1. Functional / Meta
    "Projects": ["deadline", "milestone", "sprint", "to-do", "todo", "task list", "finish by", "project", "deliverable"],
    "Journal": ["dear diary", "today i", "feeling", "reflection", "grateful for", "daily log", "journal entry"],
    "Reference": ["how to", "tutorial", "guide", "documentation", "cheatsheet", "instructions", "manual"],
    
    # 2. Topical Domains (Resources & Areas)
    "Fitness": ["gym", "workout", "fitness", "bench press", "squat", "deadlift", "cardio", "treadmill", "barbell", "dumbbell", "protein", "creatine", "muscle", "exercise", "weightlifting", "crossfit", "yoga", "pilates", "stretching", "warmup", "pushups", "pullups", "abs", "hypertrophy"],
    "Health": ["health", "medicine", "doctor", "dentist", "hospital", "clinic", "prescription", "meds", "symptoms", "pain", "injury", "recovery", "blood pressure", "heart rate", "cholesterol", "vaccine", "therapy", "mental health", "anxiety", "depression", "vitamin", "supplement", "nutrition", "diet", "calories", "macros"],
    "Software": ["programming", "software engineering", "coding", "code", "python", "javascript", "typescript", "java", "c++", "c#", "rust", "golang", "react", "vue", "angular", "node.js", "frontend", "backend", "fullstack", "api", "database", "sql", "nosql", "postgres", "mongodb", "docker", "kubernetes", "aws", "azure", "gcp", "git", "github", "debugging", "refactor", "algorithm", "data structures", "linux", "bash", "terminal"],
    "Tech": ["technology", "gadgets", "smartphone", "iphone", "android", "laptop", "macbook", "pc", "monitor", "keyboard", "mouse", "headphones", "bluetooth", "wifi", "router", "smartwatch", "tablet", "ipad", "hardware", "cpu", "gpu"],
    "AI": ["artificial intelligence", "ai", "machine learning", "ml", "deep learning", "neural network", "llm", "large language model", "gpt", "openai", "anthropic", "llama", "ollama", "transformers", "pytorch", "tensorflow", "prompt engineering", "nlp", "computer vision"],
    "Finance": ["finance", "budget", "expenses", "income", "salary", "paycheck", "taxes", "savings", "spending", "bank", "credit card", "debt", "loan", "mortgage", "rent", "insurance", "frugal", "net worth", "cost"],
    "Investing": ["investing", "stocks", "stock market", "etf", "mutual fund", "bonds", "dividend", "portfolio", "retirement", "401k", "ira", "crypto", "cryptocurrency", "bitcoin", "ethereum", "real estate", "dividends", "bull market", "bear market", "options trading"],
    "Brainstorming": ["idea", "concept", "brainstorm", "what if", "imagine", "maybe", "project idea", "thought", "shower thought", "epiphany", "innovation", "creativity"],
    "Travel": ["travel", "trip", "vacation", "holiday", "flight", "hotel", "airbnb", "itinerary", "passport", "visa", "tourism", "sightseeing", "luggage", "packing", "airport", "train", "road trip", "flight ticket", "boarding pass"],
    "Cooking": ["recipe", "cooking", "baking", "ingredients", "meal prep", "breakfast", "lunch", "dinner", "snack", "dessert", "oven", "stove", "boil", "simmer", "roast", "grill", "tbsp", "tsp", "flour", "sugar", "salt", "pepper", "spices", "kitchen", "chef"],
    "Entertainment": ["movie", "film", "cinema", "tv show", "netflix", "hulu", "video game", "gaming", "xbox", "playstation", "nintendo", "board game", "music", "album", "concert", "podcast", "youtube", "spotify", "playlist"],
    "Literature": ["book", "reading", "novel", "fiction", "non-fiction", "author", "chapter", "kindle", "audiobook", "literature", "biography", "science fiction", "fantasy", "poetry", "essay"],
    "Errands": ["chores", "errands", "groceries", "supermarket", "shopping", "cleaning", "laundry", "dishes", "vacuum", "trash", "maintenance", "repair", "plumber", "electrician", "mechanic", "car repair"],
    "Relationships": ["family", "friends", "partner", "husband", "wife", "boyfriend", "girlfriend", "kids", "children", "parents", "mom", "dad", "siblings", "brother", "sister", "meeting up", "hanging out", "date night", "anniversary", "birthday party"],
    "Education": ["school", "university", "college", "student", "teacher", "professor", "exam", "test", "quiz", "homework", "assignment", "essay", "lecture", "seminar", "degree", "diploma", "graduation", "study", "studying"],
    "Business": ["business", "company", "startup", "entrepreneur", "marketing", "sales", "revenue", "profit", "loss", "b2b", "b2c", "ceo", "management", "human resources", "hr", "strategy", "pitch deck", "meetings"],
}

def get_taxonomy_processor() -> KeywordProcessor:
    processor = KeywordProcessor(case_sensitive=False)
    for category, keywords in TAXONOMY_MAP.items():
        for keyword in keywords:
            # Output the category (domain) for the found keyword
            processor.add_keyword(keyword, category)
    return processor

def get_keyword_processor() -> KeywordProcessor:
    processor = KeywordProcessor(case_sensitive=False)
    for keywords in TAXONOMY_MAP.values():
        for keyword in keywords:
            processor.add_keyword(keyword)
    return processor

_cat_processor = None
_kw_processor = None

def extract_dynamic_categories(text: str) -> list[str]:
    """
    Intelligently extracts and joins domains.
    If it finds keywords for "Tech" and "Finance", it dynamically generates "Tech & Finance".
    If it finds "Projects" and "Software", it generates "Project: Software".
    """
    global _cat_processor
    if _cat_processor is None:
        _cat_processor = get_taxonomy_processor()
        
    domains_found = _cat_processor.extract_keywords(text)
    if not domains_found:
        return []
        
    # Count frequency of domains
    domain_counts = Counter(domains_found)
    
    # Separate functional tags from topical domains
    functional = {"Projects", "Journal", "Reference"}
    found_funcs = [d for d in domain_counts if d in functional]
    found_topics = [d for d in domain_counts if d not in functional]
    
    # Sort topics by frequency (most prominent first)
    found_topics.sort(key=lambda d: domain_counts[d], reverse=True)
    
    results = []
    
    # Intelligently join the top 2 topics (e.g. "Software & AI" or "Health & Fitness")
    if len(found_topics) >= 2:
        top_two = sorted([found_topics[0], found_topics[1]]) # Sort alphabetically for consistency
        joined_topic = f"{top_two[0]} & {top_two[1]}"
        results.append(joined_topic)
    elif len(found_topics) == 1:
        results.append(found_topics[0])
        
    # Apply functional prefixes if applicable (e.g. "Project: Software & AI")
    if found_funcs and results:
        primary_func = found_funcs[0]
        # Instead of just replacing, we add a highly specific composite category
        results.append(f"{primary_func}: {results[0]}")
    elif found_funcs:
        results.extend(found_funcs)
        
    return results

def extract_categories(text: str) -> list[str]:
    """Legacy wrapper for direct domain extraction."""
    global _cat_processor
    if _cat_processor is None:
        _cat_processor = get_taxonomy_processor()
    return _cat_processor.extract_keywords(text)
    
def extract_keywords(text: str) -> list[str]:
    """Instantly extracts raw taxonomy keywords from text for tag suggestions."""
    global _kw_processor
    if _kw_processor is None:
        _kw_processor = get_keyword_processor()
    return _kw_processor.extract_keywords(text)
