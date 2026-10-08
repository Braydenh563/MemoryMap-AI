import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_synonyms = (
    r'    ("opinion", "view", "perspective", "stance", "thoughts", "belief", "take", "hot take"),\n'
    r'    # New massive world / concept understanding\n'
    r'    ("money", "cash", "funds", "budget", "finance", "finances", "capital", "currency", "wealth", "savings", "investment", "salary", "wage", "pay", "income"),\n'
    r'    ("cheap", "inexpensive", "affordable", "budget-friendly", "low-cost", "discounted", "sale"),\n'
    r'    ("expensive", "costly", "pricey", "premium", "luxury", "high-end", "overpriced"),\n'
    r'    ("buy", "purchase", "acquire", "get", "procure", "order", "invest in", "pay for"),\n'
    r'    ("sell", "vend", "trade", "auction", "pawn", "liquidate"),\n'
    r'    ("job", "work", "career", "occupation", "profession", "employment", "role", "position", "gig"),\n'
    r'    ("boss", "manager", "supervisor", "lead", "director", "employer", "chief"),\n'
    r'    ("colleague", "coworker", "teammate", "associate", "partner", "peer"),\n'
    r'    ("school", "college", "university", "academy", "institute", "class", "course", "education", "study"),\n'
    r'    ("teacher", "professor", "instructor", "tutor", "lecturer", "educator"),\n'
    r'    ("student", "pupil", "learner", "scholar", "undergrad", "grad"),\n'
    r'    ("test", "exam", "quiz", "assessment", "evaluation", "midterm", "final"),\n'
    r'    ("book", "novel", "textbook", "volume", "publication", "manuscript", "magazine", "journal", "read"),\n'
    r'    ("music", "song", "track", "tune", "audio", "album", "playlist", "record"),\n'
    r'    ("art", "painting", "drawing", "sketch", "sculpture", "artwork", "design", "illustration"),\n'
    r'    ("game", "videogame", "sport", "match", "play", "gaming", "boardgame"),\n'
    r'    ("health", "wellness", "fitness", "wellbeing", "condition", "medical"),\n'
    r'    ("doctor", "physician", "md", "specialist", "surgeon", "pediatrician", "dentist"),\n'
    r'    ("medicine", "medication", "drugs", "pills", "prescription", "treatment", "remedy"),\n'
    r'    ("disease", "illness", "sickness", "condition", "infection", "virus", "syndrome"),\n'
    r'    ("pet", "dog", "cat", "puppy", "kitten", "animal", "bird", "fish"),\n'
    r'    ("family", "relatives", "kin", "parents", "children", "siblings"),\n'
    r'    ("friend", "buddy", "pal", "companion", "mate", "bestie", "amigo"),\n'
    r'    ("clothes", "clothing", "apparel", "attire", "outfit", "garments", "wardrobe"),\n'
    r'    ("shoes", "sneakers", "boots", "footwear", "sandals", "heels"),\n'
    r'    ("weather", "climate", "temperature", "forecast", "conditions"),\n'
    r'    ("rain", "shower", "storm", "drizzle", "precipitation"),\n'
    r'    ("sun", "sunny", "clear", "sunshine", "bright"),\n'
    r'    ("snow", "blizzard", "ice", "winter", "cold"),\n'
    r'    ("time", "hour", "minute", "moment", "second", "period", "duration", "schedule", "clock"),\n'
    r'    ("day", "date", "afternoon", "morning", "evening", "night", "today", "tomorrow", "yesterday"),\n'
    r'    ("week", "weekend", "weekday", "fortnight"),\n'
    r'    ("month", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"),\n'
    r'    ("year", "annual", "yearly", "decade", "century"),\n'
    r'    ("future", "ahead", "upcoming", "soon", "later", "tomorrow", "eventually"),\n'
    r'    ("past", "history", "yesterday", "ago", "previously", "former"),\n'
    r'    ("fast", "quick", "rapid", "swift", "speedy", "hasty", "brisk"),\n'
    r'    ("slow", "leisurely", "sluggish", "gradual", "delayed"),\n'
    r'    ("big", "large", "huge", "massive", "giant", "enormous", "gigantic", "substantial"),\n'
    r'    ("small", "tiny", "little", "miniature", "compact", "micro", "petite"),\n'
    r'    ("good", "great", "excellent", "amazing", "wonderful", "fantastic", "superb", "awesome", "perfect", "ideal"),\n'
    r'    ("bad", "terrible", "awful", "horrible", "poor", "inferior", "dreadful", "lousy"),\n'
    r'    ("important", "crucial", "essential", "vital", "significant", "key", "major", "critical"),\n'
    r'    ("unimportant", "trivial", "minor", "insignificant", "marginal"),\n'
    r'    ("easy", "simple", "effortless", "straightforward", "basic", "uncomplicated"),\n'
    r'    ("hard", "difficult", "tough", "challenging", "complex", "complicated"),\n'
    r'    ("new", "fresh", "recent", "modern", "novel", "latest", "updated"),\n'
    r'    ("old", "ancient", "past", "outdated", "vintage", "antique", "obsolete"),\n'
    r'    ("right", "correct", "accurate", "true", "valid", "exact"),\n'
    r'    ("wrong", "incorrect", "false", "inaccurate", "invalid", "mistaken", "error"),\n'
    r'    ("problem", "issue", "trouble", "difficulty", "hitch", "bug", "glitch", "dilemma", "challenge", "obstacle"),\n'
    r'    ("solution", "answer", "fix", "workaround", "resolution", "remedy"),\n'
    r'    ("goal", "objective", "target", "aim", "ambition", "purpose"),\n'
    r'    ("plan", "strategy", "scheme", "blueprint", "proposal", "idea", "agenda"),\n'
    r'    ("success", "victory", "triumph", "achievement", "accomplishment"),\n'
    r'    ("failure", "defeat", "loss", "disaster", "flop"),\n'
    r'    ("agree", "concur", "consent", "assent", "approve"),\n'
    r'    ("disagree", "differ", "dissent", "object", "oppose", "argue"),\n'
    r'    ("help", "assist", "support", "aid", "guide", "advice", "advise"),\n'
    r'    ("stop", "halt", "end", "terminate", "cease", "pause", "quit", "abandon"),\n'
    r'    ("begin", "start", "commence", "initiate", "launch", "open"),\n'
    r'    ("continue", "proceed", "resume", "keep going", "persist"),\n'
    r'    ("change", "modify", "alter", "adjust", "adapt", "transform", "update"),\n'
    r'    ("use", "utilize", "employ", "apply", "operate", "consume"),\n'
    r'    ("make", "create", "build", "construct", "produce", "generate", "develop", "form"),\n'
    r'    ("find", "locate", "discover", "search", "seek", "uncover", "spot"),\n'
)

# Insert after ("opinion", "view", "perspective", "stance", "thoughts"),
content = re.sub(
    r'    \("opinion", "view", "perspective", "stance", "thoughts"\),',
    new_synonyms,
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected massive synonyms expansions.")
