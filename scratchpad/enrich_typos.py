import re

file_path = "src/memorymap/ai/question_noise.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

typos = {
    # Keyboard typos and common errors for typical query words
    "whate": "what", "hw": "how", "whrn": "when", "qhere": "where", "wherr": "where", 
    "y": "why", "whu": "who", "ehat": "what", "qhat": "what", "ehich": "which",
    "tjis": "this", "thsi": "this", "tjay": "that", "thst": "that",
    "teh": "the", "hre": "here", "tjere": "there", "ther": "there",
    "wroye": "wrote", "rote": "wrote", "writte": "write", "qrote": "wrote",
    "notess": "notes", "bk": "book", "ntoes": "notes", "motes": "notes",
    "notw": "note", "noye": "note", "ntoe": "note", "nites": "notes",
    "srch": "search", "searchh": "search", "zearch": "search", "ssearach": "search",
    "fnd": "find", "fimd": "find", "dimd": "find",
    "shlw": "show", "shiw": "show", "sohw": "show",
    "telll": "tell", "twll": "tell", "telly": "tell",
    "lsit": "list", "lidt": "list", "lust": "list",
    "todo": "to do", "to-do": "to do",
    "reming": "remind", "rekjnd": "remind", "remimd": "remind",
    "tomorow": "tomorrow", "tommorow": "tomorrow", "tomorro": "tomorrow",
    "yeserday": "yesterday", "yestarday": "yesterday", "yeseterday": "yesterday",
    "tday": "today", "todsy": "today", "todya": "today",
    "wk": "week", "wekk": "week", "wek": "week",
    "mnth": "month", "monfh": "month", "momth": "month",
    "yr": "year", "yesr": "year", "yaer": "year",
    "bc": "because", "cuz": "because", "bcus": "because",
    "abt": "about", "abou": "about", "abwt": "about",
    "gnna": "going to", "gona": "going to",
    "wanna": "want to", "wana": "want to",
    "gimme": "give me", "lemme": "let me",
    "dunno": "do not know", "idk": "i don't know",
    "alot": "a lot",
    "im": "i am", "ive": "i have", "ill": "i will", "id": "i would",
    "u": "you", "ur": "your", "urs": "yours",
    "r": "are", "b": "be", "c": "see",
    "thx": "thanks", "tks": "thanks", "ty": "thank you",
    "pls": "please", "plz": "please", "plx": "please",
    # Additional generic English typos
    "definately": "definitely", "definatly": "definitely",
    "wierd": "weird",
    "recieve": "receive",
    "seperate": "separate",
    "occured": "occurred",
    "until": "until", "untill": "until",
    "suprise": "surprise",
    "tommorrow": "tomorrow",
    "tounge": "tongue",
    "truely": "truly",
    "alright": "all right",
    "basicly": "basically",
    "existance": "existence",
    "fourty": "forty",
    "foward": "forward",
    "knowlege": "knowledge",
    "persue": "pursue",
    "reccomend": "recommend",
    "sence": "sense",
    "tendancy": "tendency",
    "therefor": "therefore",
    "arguement": "argument",
    "independant": "independent",
    "posession": "possession",
    "priviledge": "privilege",
    "publically": "publicly",
    "rythm": "rhythm",
    "succesful": "successful",
    "unforseen": "unforeseen",
    "weather": "whether", # commonly confused
    "whereever": "wherever",
    "wich": "which"
}

# The dictionary is inside question_noise.py. Let's find the `# --- 2. typo repair ---` section and insert these right before it.
formatted_typos = "\n".join([f'    "{k}": "{v}",' for k, v in typos.items()])

content = re.sub(
    r'(# --- 2\. typo repair)',
    formatted_typos + r'\n\n\1',
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected massive typo expansions.")
