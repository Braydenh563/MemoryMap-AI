"""A question typed the way people type: slang, typos, run-together words.

Asked for by the owner (INBOX 741): "does it cover any and ALL typos, maybe
use similarity or meaning, cover all slang like pls, ty, lol, u, r, wym,
etc?". The composer reads a question's kind (when, why, how many, a
comparison) from its words, so a question typed "whenis teh dentist rn pls"
must reach it as "when is the dentist right now please". Three layers, each
tested, each leaving the person's subject words as they typed them:

1. **Slang and text-speak** (`SLANG`, `SOCIAL`): a table, one entry per
   word, spelled out; pleasantries and laughter ("ty", "lol") are small
   talk, answered as such rather than searched for.
2. **Typo repair** (`repair`): a weighted edit distance against the
   composer's own small vocabulary of asking words (`VOCABULARY`), with a
   neighbouring key, a doubled letter and a swap of two letters cheaper
   than any other edit, scaled to the word's length; words run together
   ("whenis") split and words split ("wh en") joined when the result is
   an asking word. A real word near an asking word ("then", "show") is
   never changed. The subject's own typos are put right against the
   notebook's words by the composer (`composer._fit_terms`), for scoring
   only.
3. **Meaning as the fallback** (`guess_kind`): a question no rule read is
   compared with example questions of each kind, by the embedder's cosine
   when one is loaded and by character trigrams when not, and given a kind
   only when one is clearly nearest.

What is still missed is said in `docs/roadmap/agent-remaining/composer-voice-1006.md`
and measured by `tests/_composer_eval.py --noise`.
"""

from __future__ import annotations

import math
import re
from collections import Counter

# --- 1. slang and text-speak ----------------------------------------------------

#: Every entry a word people type for a longer one. Only words that are never
#: anything else in a question: "4" and "2" (numbers in "4 weeks"), "ill",
#: "sat", "sun", "mar" and "may" are left out on purpose.
SLANG: dict[str, str] = {
    # Pronouns, verbs, small words.
    "u": "you", "ya": "you", "yu": "you", "ur": "your", "urs": "yours", "r": "are", "y": "why",
    "yall": "you all", "y'all": "you all", "da": "the", "teh": "the", "dat": "that", "dis": "this",
    "cn": "can", "hv": "have", "hav": "have", "shld": "should", "shud": "should", "cld": "could",
    "cud": "could", "wld": "would", "wud": "would", "mny": "many", "meny": "many", "mch": "much",
    "mor": "more", "lng": "long", "oftn": "often", "wy": "why", "btwn": "between", "betw": "between",
    "kno": "know", "knw": "know", "ne": "any", "evry": "every", "abt": "about", "bout": "about", "abour": "about", "b4": "before", "w/": "with",
    "w/o": "without", "thru": "through", "tho": "though", "altho": "although", "bc": "because",
    "b/c": "because", "cuz": "because", "coz": "because", "cos": "because", "bcuz": "because",
    "becuz": "because", "v": "very", "rly": "really", "rlly": "really", "prolly": "probably",
    "prob": "probably", "def": "definitely", "deffo": "definitely", "obvs": "obviously",
    "obv": "obviously", "obvi": "obviously", "srsly": "seriously", "lil": "little", "ne1": "anyone",
    "any1": "anyone", "some1": "someone", "every1": "everyone", "no1": "no one", "sum1": "someone",
    # Question words.
    "wat": "what", "wot": "what", "wut": "what", "wht": "what", "wha": "what", "whut": "what",
    "whn": "when", "wen": "when", "wn": "when", "hw": "how", "hu": "who", "wher": "where",
    "whr": "where", "wer": "where", "whats": "what is", "wats": "what is", "hows": "how is",
    "wheres": "where is", "whens": "when is", "whos": "who is", "whys": "why is",
    "wym": "what do you mean", "wdym": "what do you mean", "wbu": "what about you",
    "hbu": "how about you",
    # Contractions typed without the apostrophe.
    "im": "I am", "ive": "I have", "dont": "do not", "didnt": "did not", "doesnt": "does not",
    "cant": "cannot", "wont": "will not", "isnt": "is not", "wasnt": "was not", "arent": "are not",
    "werent": "were not", "havent": "have not", "hasnt": "has not", "hadnt": "had not",
    "shouldnt": "should not", "couldnt": "could not", "wouldnt": "would not", "youre": "you are",
    "theyre": "they are", "thats": "that is", "theres": "there is", "aint": "is not",
    # Spoken run-togethers.
    "gonna": "going to", "wanna": "want to", "gotta": "got to", "kinda": "kind of",
    "sorta": "sort of", "lemme": "let me", "gimme": "give me", "dunno": "do not know",
    "tryna": "trying to", "outta": "out of", "lotta": "lot of", "whatcha": "what are you",
    "gotcha": "got it", "wassup": "what is up",
    # Abbreviations of a phrase.
    "idk": "I do not know", "idc": "I do not care", "imo": "in my opinion", "imho": "in my opinion",
    "tbh": "to be honest", "tbf": "to be fair", "ngl": "not going to lie", "rn": "right now",
    "atm": "at the moment", "nvm": "never mind", "fyi": "for your information", "btw": "by the way",
    "asap": "as soon as possible", "jk": "just kidding", "irl": "in real life",
    "iirc": "if I remember correctly", "afaik": "as far as I know", "tldr": "in short",
    "tl;dr": "in short", "ofc": "of course", "eta": "expected time", "smth": "something",
    "sth": "something", "smthn": "something", "smthng": "something", "pls": "please",
    "plz": "please", "plss": "please", "pleez": "please", "plox": "please",
    # Time.
    "2day": "today", "2nite": "tonight", "tonite": "tonight", "2moro": "tomorrow",
    "2morrow": "tomorrow", "tmrw": "tomorrow", "tmr": "tomorrow", "tmw": "tomorrow",
    "tmrow": "tomorrow", "2mrw": "tomorrow", "yday": "yesterday", "ystd": "yesterday",
    "wk": "week", "wks": "weeks", "wkend": "weekend", "wknd": "weekend", "yr": "year",
    "yrs": "years", "hr": "hour", "hrs": "hours", "mins": "minutes", "secs": "seconds",
    "l8r": "later", "l8": "late", "nxt": "next", "lst": "last", "prev": "previous",
    "mon": "Monday", "tue": "Tuesday", "tues": "Tuesday", "weds": "Wednesday", "thu": "Thursday",
    "thur": "Thursday", "thurs": "Thursday", "fri": "Friday", "feb": "February", "apr": "April",
    "aug": "August", "sept": "September", "oct": "October", "nov": "November", "dec": "December",
    "xmas": "Christmas", "bday": "birthday", "b-day": "birthday",
    # Things.
    "msg": "message", "msgs": "messages", "txt": "text", "pic": "picture", "pics": "pictures",
    "vid": "video", "vids": "videos", "info": "information", "appt": "appointment",
    "appts": "appointments", "mtg": "meeting", "mtgs": "meetings", "mgr": "manager",
    "dept": "department", "govt": "government", "hmwk": "homework", "ppl": "people",
    "peeps": "people", "bf": "boyfriend", "gf": "girlfriend", "bff": "best friend",
    "fam": "family", "sis": "sister", "convo": "conversation", "fave": "favourite",
    "fav": "favourite", "uni": "university", "pwd": "password", "pw": "password",
    "addr": "address", "num": "number", "nums": "numbers", "qty": "quantity", "amt": "amount",
    "approx": "approximately", "est": "estimated", "avg": "average", "dr": "doctor",
    "docs": "documents", "ref": "reference",
    "luv": "love", "gud": "good", "gr8": "great", "h8": "hate", "m8": "mate", "ez": "easy",
    "kewl": "cool", "pressie": "present", "brekkie": "breakfast", "sarnie": "sandwich",
}

#: Words that are small talk on their own: a message made only of these is
#: answered as small talk (`composer.social`), never searched for. The value
#: is the kind of reply.
SOCIAL: dict[str, str] = {
    "ty": "thanks", "tysm": "thanks", "tyvm": "thanks", "thx": "thanks", "thnx": "thanks",
    "thnks": "thanks", "tx": "thanks", "thanx": "thanks", "ta": "thanks", "cheers": "thanks",
    "thanks": "thanks", "thank": "thanks", "you": "thanks", "so": "thanks", "much": "thanks",
    "lol": "laugh", "lmao": "laugh", "lmfao": "laugh", "rofl": "laugh", "haha": "laugh",
    "hahaha": "laugh", "hehe": "laugh", "xd": "laugh", "lolz": "laugh", "lolol": "laugh",
    "np": "ack", "nw": "ack", "yw": "ack", "gg": "ack", "k": "ack", "kk": "ack", "ok": "ack",
    "okk": "ack", "okie": "ack", "oki": "ack", "okay": "ack", "cool": "ack", "nice": "ack",
    "ikr": "ack", "omg": "reaction", "wow": "reaction", "yep": "ack", "yup": "ack", "yeah": "ack",
    "yea": "ack", "nah": "ack", "nope": "ack", "jk": "ack", "nvm": "ack", "fair": "ack",
    "gm": "morning", "gn": "bye", "gnight": "bye", "brb": "bye", "cya": "bye", "ttyl": "bye",
    "bye": "bye", "byee": "bye", "later": "bye", "hiya": "greeting", "hi": "greeting",
    "hii": "greeting", "hiii": "greeting", "hey": "greeting", "heyy": "greeting",
    "heyyy": "greeting", "yo": "greeting", "sup": "greeting", "hello": "greeting",
    "wassup": "how", "wbu": "how", "hbu": "how", "xoxo": "bye", "ily": "thanks",
    "sorry": "sorry", "soz": "sorry", "sry": "sorry",
}

#: Words that ride along with small talk without making it a question:
#: "ty for the help", "thanks a lot mate".
_SOCIAL_FILLER = frozenset(
    "for the a lot help helping that this it again man mate bro dude buddy friend all very really much so".split()
)

#: Laughter typed long ("hahahaha", "lmaooo", "lollll").
_LAUGH = re.compile(r"^(?:(?:ha|he|ah){2,}h?|lo+l+(?:o+l+)*|lmf?a+o+|xd+)$", re.I)
_EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F900-\U0001F9FF\U00002300-\U000023FF\U0000FE0F\U0000200D]+"
)
#: Emoticons, read as small talk too.
_EMOTICON = re.compile(r"(?:^|\s)(?:[:;=8][-']?[)(DPp/\\|*]+|<3|\^_?\^)(?=\s|$)")


def strip_symbols(text: str) -> str:
    """Emoji and emoticons off, the rest kept."""
    text = _EMOJI.sub(" ", text or "")
    text = _EMOTICON.sub(" ", text)
    return " ".join(text.split())


#: Conversational turns of more than one word, read whole (INBOX 741, the
#: owner: "k is also ok", "right ok", "alright. any and all conversational
#: messages"). Longest first, so "wait what" is confusion before "what" is
#: anything at all.
SOCIAL_PHRASES: dict[str, str] = {
    "got it": "ack", "makes sense": "ack", "that makes sense": "ack", "sounds good": "ack",
    "right ok": "ack", "ok right": "ack", "fair enough": "ack", "all good": "ack", "no worries": "ack",
    "never mind": "ack", "fair point": "ack", "good to know": "ack", "i see": "ack", "ah i see": "ack",
    "oh ok": "ack", "oh okay": "ack", "ok cool": "ack", "cool cool": "ack", "will do": "ack",
    "that works": "ack", "perfect thanks": "thanks", "thank you": "thanks", "thanks a lot": "thanks",
    "appreciate it": "thanks", "much appreciated": "thanks", "thanks so much": "thanks",
    "good morning": "morning", "morning all": "morning", "good afternoon": "greeting",
    "good evening": "greeting", "good night": "bye", "see you": "bye", "see ya": "bye",
    "talk later": "bye", "talk to you later": "bye", "catch you later": "bye", "im off": "bye",
    "how are you": "how", "how r u": "how", "how are u": "how", "how r you": "how", "hows it going": "how",
    "how is it going": "how", "how's it going": "how", "whats up": "how", "what's up": "how",
    "what is up": "how", "how you doing": "how", "how are things": "how", "you good": "how",
    "what are you doing": "how", "what you up to": "how", "what are you up to": "how",
    "my bad": "sorry", "my mistake": "sorry", "sorry about that": "sorry",
    "wait what": "confused", "come again": "confused", "say again": "confused", "sorry what": "confused",
    "i dont get it": "confused", "i don't get it": "confused", "i dont understand": "confused",
    "i don't understand": "confused", "what do you mean": "confused", "what does that mean": "confused",
    "not sure what you mean": "confused", "that doesnt make sense": "confused",
    "that doesn't make sense": "confused", "no idea what that means": "confused",
    "oh no": "reaction", "oh wow": "reaction", "no way": "reaction", "thats great": "reaction",
    "that's great": "reaction", "nice one": "thanks", "well done": "reaction", "oh dear": "reaction",
    "who are you": "who", "whats your name": "who", "what's your name": "who",
}

#: One-word turns that are not in `SOCIAL` above: reactions and confusion.
SOCIAL.update({
    "okey": "ack", "alright": "ack", "aight": "ack", "ight": "ack", "right": "ack", "sure": "ack",
    "gotcha": "ack", "word": "ack", "bet": "ack", "noted": "ack", "understood": "ack", "great": "ack",
    "awesome": "ack", "perfect": "ack", "sweet": "ack", "lovely": "ack", "fine": "ack", "agreed": "ack",
    "true": "ack", "same": "ack", "yes": "ack", "no": "ack", "yeh": "ack", "ya": "ack", "mhm": "ack",
    "damn": "reaction", "oof": "reaction", "rip": "reaction", "yikes": "reaction", "whoa": "reaction",
    "woah": "reaction", "ugh": "reaction", "wild": "reaction", "crazy": "reaction", "dang": "reaction",
    "huh": "confused", "wym": "confused", "wdym": "confused", "eh": "confused", "hm": "confused",
    "hmm": "confused", "hmmm": "confused", "what": "confused", "confused": "confused",
    "wyd": "how", "morning": "morning", "evening": "greeting", "night": "bye", "goodbye": "bye",
    "apologies": "sorry", "oops": "sorry", "appreciated": "thanks", "thankyou": "thanks",
})


def social_kind(message: str) -> str | None:
    """The kind of conversational turn a message is when every part of it is
    one ("ty", "lol", "ok thx", "right ok", "wait what", "how r u", an emoji
    alone), else None: a turn with a question in it is a question."""
    raw = (message or "").strip()
    if raw and not strip_symbols(raw):
        return "reaction" if re.search(r"[\U0001F600-\U0001F64F]", raw) else "ack"
    text = strip_symbols(raw).lower()
    if re.fullmatch(r"[?\s]+", text):
        return "confused"
    text = " ".join(re.split(r"[^\w']+", text)).strip()
    kinds: list[str] = []
    for phrase in sorted(SOCIAL_PHRASES, key=len, reverse=True):
        pattern = rf"(?:^|\s){re.escape(phrase)}(?=\s|$)"
        if re.search(pattern, text):
            kinds.append(SOCIAL_PHRASES[phrase])
            text = re.sub(pattern, " ", text)
    words = [w for w in text.split() if w and w not in _SOCIAL_FILLER]
    if not words and not kinds:
        return None
    for word in words:
        if _LAUGH.match(word):
            kinds.append("laugh")
        elif word in SOCIAL:
            kinds.append(SOCIAL[word])
        else:
            return None
    #: "ok thanks" is thanks; "lol ok" is laughter: the most telling part.
    for kind in ("confused", "thanks", "sorry", "bye", "morning", "greeting", "how", "who", "reaction", "laugh"):
        if kind in kinds:
            return kind
    return "ack"


# --- 2. typo repair ------------------------------------------------------------

#: The words whose spelling decides how a question is read: the asking words,
#: the small words around them, and the words that name a kind of question.
VOCABULARY = frozenset(
    """what when where who whom whose why how which many much often long
    is are was were do does did can could should would will has have had am
    the a an my me i you your about for of on in to with and or
    compare versus between difference latest status progress update explain
    summarise summarize overview anything everything recently recent newest
    remind tell list show give name say said know think mean
    there this that these those it its
    week month year today tomorrow yesterday morning tonight
    time date day""".split()
)

#: Asking words: the ones a typo is repaired towards first, and the only
#: ones a run-together word is split into ("whenis" is "when is").
ASKING = frozenset(
    """what when where who whose why how which many much often long
    is are was were do does did can could should would will has have had
    compare versus between difference latest status progress update explain
    summarise summarize overview remind tell list""".split()
)

#: The long words that name a kind of question, repaired wherever they are.
KIND_WORDS = frozenset(
    """compare versus between difference latest status progress update explain
    summarise summarize overview anything everything recently newest""".split()
)

#: Real words one edit from an asking word, never "corrected": "then" is not
#: "when", "show" is not "how", "hat" is not "what". Also the words a
#: question's subject is often made of that sit near one.
REAL_WORDS = frozenset(
    """then than them they there here hat that wet wit shy now new few hen
    ten men hoe hot who how why any man main may mean many much lunch bunch
    such song along last lost late lest list lust state stat plain explains
    goes dues does dose lift gift wish wash with tell tall till fell sell
    well bell when what where which while whole whose those these hare care
    dare were wore wire mire ware wear year near dear bear fear gear hear
    rear tear the then toe tie tea ate eat oat cat car bar far jar tar war
    sing long lung hung rung sung wing king ring thing ling ding pong song
    has his hit hut had hid him her hen ham hay hey hi ho he hm mom mum dad
    one won own now how cow row low bow sow tow vow wow know knew knee
    box fox ox oil all ill well wall will mill fill hill kill pill till
    loan load lord lard list lost dentist""".split()
)

#: QWERTY neighbours: a slip to the next key is a cheaper edit than any other.
_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
_NEAR: dict[str, set[str]] = {}
for _r, _row in enumerate(_ROWS):
    for _c, _key in enumerate(_row):
        near = _NEAR.setdefault(_key, set())
        for dr in (-1, 0, 1):
            rr = _r + dr
            if 0 <= rr < len(_ROWS):
                for dc in (-1, 0, 1):
                    cc = _c + dc
                    if (dr or dc) and 0 <= cc < len(_ROWS[rr]):
                        near.add(_ROWS[rr][cc])


def _sub_cost(a: str, b: str) -> float:
    if a == b:
        return 0.0
    return 0.5 if b in _NEAR.get(a, ()) else 1.0


def distance(a: str, b: str) -> float:
    """Weighted edit distance: a neighbouring key 0.5, a swap of two letters
    0.6, a doubled letter added or dropped 0.4, a vowel 0.5, anything else 1."""
    a, b = a.lower(), b.lower()
    rows = [[0.0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        rows[i][0] = i * 1.0
    for j in range(1, len(b) + 1):
        rows[0][j] = j * 1.0
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            #: A doubled letter, or a vowel dropped as people do when they
            #: type fast ("lng", "whn", "mny"), is cheaper than other edits.
            drop = 0.4 if i > 1 and a[i - 1] == a[i - 2] else 0.5 if a[i - 1] in "aeiou" else 1.0
            add = 0.4 if j > 1 and b[j - 1] == b[j - 2] else 0.5 if b[j - 1] in "aeiou" else 1.0
            best = min(rows[i - 1][j] + drop, rows[i][j - 1] + add, rows[i - 1][j - 1] + _sub_cost(a[i - 1], b[j - 1]))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                best = min(best, rows[i - 2][j - 2] + 0.6)
            rows[i][j] = best
    return rows[-1][-1]


def allowance(word: str) -> float:
    """How far a word may be from the one it is read as, by its length: a
    three-letter word one slip, a long word two edits."""
    n = len(word)
    if n <= 2:
        return 0.0
    if n == 3:
        return 0.6
    if n <= 5:
        return 1.0
    if n <= 8:
        return 1.5
    return 2.0


_HOW_NEXT = frozenset("many much often long do does did to come can should far old big".split())


def nearest(word: str, vocabulary, after: str = "") -> str | None:  # noqa: ANN001
    """The one vocabulary word `word` is a typo of, or None: within its
    allowance, and nearer than any other by a clear margin (a tie is a
    guess, and no guess is made, except "how" against "who", which the next
    word settles)."""
    low = word.lower()
    if low in vocabulary or low in VOCABULARY or low in REAL_WORDS or not low.isalpha():
        return None
    limit = allowance(low)
    if not limit:
        return None
    scored = sorted((distance(low, v), v) for v in vocabulary if abs(len(v) - len(low)) <= 2)
    if not scored or scored[0][0] > limit:
        return None
    best = [v for d, v in scored if d <= scored[0][0] + 0.1]
    if set(best) == {"how", "who"}:
        how = after.lower() in _HOW_NEXT
        return "how" if how else "who"
    return best[0] if len(best) == 1 else None


#: How near a second reading must come to the chosen one, or how far the
#: chosen one may sit within its allowance, before the reading is unsure and
#: a "Did you mean ...?" offers the other (INBOX 741, the owner: "composer
#: could have clean fallback with did you mean to substitute??").
UNSURE_GAP = 0.35
UNSURE_SHARE = 0.75


def alternative(word: str, chosen: str, vocabulary) -> str | None:  # noqa: ANN001
    """The other word `word` could have meant when the reading as `chosen`
    is unsure, else None."""
    low = word.lower()
    limit = allowance(low)
    if not limit:
        return None
    mine = distance(low, chosen)
    others = sorted((distance(low, v), v) for v in vocabulary if v != chosen and abs(len(v) - len(low)) <= 2)
    near = [v for d, v in others if d <= limit and d - mine <= UNSURE_GAP]
    if near:
        return near[0]
    return None


def _split(word: str) -> str | None:
    """"whenis" is "when is", "howmany" is "how many": a run-together word
    whose two halves are an asking word and a vocabulary word."""
    low = word.lower()
    if len(low) < 5 or low in VOCABULARY or low in REAL_WORDS:
        return None
    for cut in range(2, len(low) - 1):
        head, tail = low[:cut], low[cut:]
        if head in ASKING and tail in VOCABULARY:
            return f"{head} {tail}"
    return None


def repair(text: str, report: list | None = None) -> str:
    """Slang spelled out, asking words put right, run-together words split
    and split words joined. The subject's words are left as typed. An unsure
    repair is added to `report` as {"typed", "chosen", "alternative"}."""
    tokens = strip_symbols(text).split(" ")
    out: list[str] = []
    i = 0
    while i < len(tokens):
        token = tokens[i]
        core = re.match(r"^(.*?)([?!.,:;]*)$", token)
        word, tail = core.group(1), core.group(2)
        low = word.lower()
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        #: Two pieces of one asking word ("wh en", "ho w"): joined.
        joined = (low + re.sub(r"[?!.,:;]+$", "", nxt).lower()) if nxt else ""
        if joined in ASKING and low not in VOCABULARY and len(low) <= 3:
            out.append(joined + re.match(r"^.*?([?!.,:;]*)$", nxt).group(1))
            i += 2
            continue
        if low in SLANG and not (low in ("r", "y") and not _at_asking_place(out)):
            out.append(SLANG[low] + tail)
        elif _split(low):
            out.append(_split(low) + tail)
        else:
            after = re.sub(r"\W+$", "", nxt)
            fixed = nearest(low, ASKING, after) if _at_asking_place(out) else None
            #: Past the opening words only the long words that name a kind
            #: of question are repaired ("diffrence", "lastest"): a subject
            #: word near a small word ("slow", "show") is the subject.
            pool = ASKING
            if not fixed and len(low) >= 6:
                fixed, pool = nearest(low, KIND_WORDS, after), KIND_WORDS
            if fixed and report is not None:
                other = alternative(low, fixed, pool)
                #: "hwo many" is how and "hwo asked" is who: the next word
                #: settles it, and nothing is offered.
                if {fixed, other} == {"how", "who"} and (after.lower() in _HOW_NEXT or after.lower().endswith("ed")):
                    other = None
                if other:
                    report.append({"typed": word, "chosen": fixed, "alternative": other})
            out.append((fixed + tail) if fixed else token)
        i += 1
    return " ".join(w for w in out if w)


def _at_asking_place(before: list[str]) -> bool:
    """The opening words of a question, or the word after "how" or a
    question word: where an asking word goes."""
    if len(before) <= 1:
        return True
    last = before[-1].lower().strip("?!.,:;")
    return last in ("how", "what", "when", "where", "who", "why", "which")


# --- 3. meaning as the fallback --------------------------------------------------

#: Example questions of each kind, read when no rule did. Several wordings
#: each, so the nearest example is about the asking, not the subject.
EXAMPLES: dict[str, tuple[str, ...]] = {
    "when": (
        "what date is it", "what day is it on", "what time is it", "the date of", "due date",
        "how soon", "by when", "what day", "date for the appointment", "when is it happening",
    ),
    "count": (
        "how many are there", "the number of", "how much does it cost", "total count",
        "how many times", "what is the amount", "the price of", "how long does it take",
    ),
    "where": (
        "where is it", "the address of", "the location of", "which place", "where did i put",
        "what room is it in", "where to stay",
    ),
    "who": ("who is it", "which person", "the name of the person", "who said", "who was it"),
    "explain": (
        "why is it", "the reason for", "reason the", "reason why", "how do i do it", "how does it work", "what caused",
        "steps to", "the way to", "how to make",
    ),
    "status": (
        "what is the latest", "how is it going", "any update", "the progress on", "where are we with",
        "status of", "news on",
    ),
    "list": ("list them", "what are all the", "which ones", "all the items", "show me the list"),
    "yesno": ("is it done", "did i do it", "have i finished", "is it true that", "was it paid"),
}

#: How close a question must come to an example, and by how much nearer to
#: one kind than the next, before it is given that kind.
TRIGRAM_FLOOR = 0.36
EMBED_FLOOR = 0.62
MARGIN = 0.06


def _trigrams(text: str) -> Counter:
    padded = f"  {re.sub(r'[^a-z ]', '', text.lower())}  "
    return Counter(padded[i : i + 3] for i in range(len(padded) - 2))


def _cosine(a: Counter, b: Counter) -> float:
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


_EXAMPLE_GRAMS = {kind: [_trigrams(e) for e in examples] for kind, examples in EXAMPLES.items()}
_EMBED_CACHE: dict[int, dict[str, list[list[float]]]] = {}


def _vector_cosine(a, b) -> float:  # noqa: ANN001
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def guess_kind(asking: str, embed=None) -> str | None:  # noqa: ANN001
    """The kind of question `asking` is nearest to, or None when none is
    clearly nearest. `asking` is the question less its subject words, so
    "the date of the dentist" is compared as "the date of the". With
    `embed` (the embedder's `embed_many`), by cosine of meaning; without,
    by character trigrams."""
    text = (asking or "").strip()
    if len(text) < 3:
        return None
    scores: dict[str, float] = {}
    floor = TRIGRAM_FLOOR
    if embed is not None:
        try:
            cache = _EMBED_CACHE.get(id(embed))
            if cache is None:
                cache = {kind: embed(list(examples)) for kind, examples in EXAMPLES.items()}
                _EMBED_CACHE[id(embed)] = cache
            vector = embed([text])[0]
            scores = {kind: max(_vector_cosine(vector, v) for v in vectors) for kind, vectors in cache.items()}
            floor = EMBED_FLOOR
        except Exception:  # noqa: BLE001 - meaning is a fallback; trigrams stand in
            scores = {}
            floor = TRIGRAM_FLOOR
    if not scores:
        grams = _trigrams(text)
        scores = {kind: max(_cosine(grams, g) for g in examples) for kind, examples in _EXAMPLE_GRAMS.items()}
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    if ranked[0][1] < floor or (len(ranked) > 1 and ranked[0][1] - ranked[1][1] < MARGIN):
        return None
    return ranked[0][0]
