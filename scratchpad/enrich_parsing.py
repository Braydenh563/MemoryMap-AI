import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add gen-z slang to EXTRA_WRAPPERS
# find r"^(?:bro|bruh|broski|brotato|buddy|mate|dude|man)\b[,.:]?\s+",$ and add genz wrappers below it
genz_wrappers = (
    r'    r"^(?:no cap|lowkey|highkey|tbh|ngl|fr|for real|deadass|bet|bet|say less|say lesss|im dead|i am dead|omg|literally)\b[,.:]?\s+",'
    '\n'
    r'    r"^(?:so basically|like|i mean|bro|bruh|bruhh|dude|man|sis|bestie|besty|besties)\b[,.:]?\s+",'
    '\n'
    r'    r"^(?:its giving|it\'s giving|vibes|the vibes are)\b\s+",'
    '\n'
    r'    r"^(?:sus|kinda sus|hella sus)\b[,.:]?\s+",'
    '\n'
    r'    r"^(?:ok boomer|bruh moment)\b[,.:]?\s+",'
)
content = re.sub(
    r'(r"\^\(\?:bro\|bruh\|broski\|brotato\|buddy\|mate\|dude\|man\)\\b\[,\.:\]\?\\s\+",)',
    r'\1\n' + genz_wrappers,
    content
)

# Add gen-z slang to EXTRA_TRAILERS
# find "bro", "bruh", "broski", "brotato", "buddy", "mate", "dude", "man", "my guy", "dog", "dawg"
genz_trailers = (
    r'    "no cap", "fr", "for real", "deadass", "bet", "say less", "say lesss", "ngl", "tbh", '
    r'"lowkey", "highkey", "im dead", "literally", "omg", "bestie", "sis", "periodt", "period", "periodtt", '
    r'"vibes", "sus", "hella", "af", "asf", "on god", "ong"'
)
content = re.sub(
    r'("dude", "man", "my guy", "dog", "dawg"\s*\n)',
    r'\1    ' + genz_trailers + ',\n',
    content
)

# Add gen-z asking words to EXTRA_ASKING_WORDS
genz_asking_words = " cap nocap lowkey highkey tbh ngl fr deadass bet bestie sis periodt period vibes sus hella af asf ong"
content = re.sub(
    r'(different than similarities contrast)(""".split\(\)\s*\))',
    r'\1' + genz_asking_words + r'\2',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected genz parsing terms to wrappers, trailers, and asking words.")
