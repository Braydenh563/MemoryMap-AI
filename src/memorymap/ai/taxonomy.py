"""A fixed map from everyday words to the domain they belong to ("squat" is
Fitness, "lentils" Cooking), read by `lexical_filing._tally` as one small
vote for a category the notebook already has by that name.

From the Gemini branch, kept after the 2026-10-10 triage measured it
(decision 7, `tests/test_filing_accuracy.py`); its tag vote, its composite
names ("Tech & Finance") and its voting for categories nobody made were
taken out. Matching is FlashText (`memorymap.vendor.flashtext`, MIT): whole
words and phrases, case folded, in one pass over the text.
"""

from __future__ import annotations

from memorymap.vendor.flashtext import KeywordProcessor

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

_processor: KeywordProcessor | None = None


def extract_categories(text: str) -> list[str]:
    """The map's domain for each keyword found in `text`, once per mention."""
    global _processor
    if _processor is None:
        processor = KeywordProcessor(case_sensitive=False)
        for category, keywords in TAXONOMY_MAP.items():
            for keyword in keywords:
                processor.add_keyword(keyword, category)
        _processor = processor
    return _processor.extract_keywords(text or "")
