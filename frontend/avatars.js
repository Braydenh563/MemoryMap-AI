// avatars.js: the generated faces. `nameMood` reads a name for what the
// face should be (mood, creature, costume, hands, limbs, hair, style) and
// `nameMark` draws it as an SVG; the CSS motion is in 08-consistency.css.
//
// Split out of app.js on 2026-09-24, when the faces themselves took the
// gzipped app.js over tests/test_static_compression.py's bound (762,903
// bytes): a whole surface of its own, which is the answer that test's comment
// asks for rather than a raised number.
//
// Loaded straight after app.js (see index.html), before every other boot
// file, so anything that paints a face at boot finds it. Its top level only
// declares tables and functions. It reads `CATEGORY_DOT_COLOURS` from app.js,
// and only inside `nameMark`, at call time; app.js, settings.js and the lazy
// bundles call `nameMark`/`nameMood` only from functions, never at parse time.

//: **What a name says about the face it gets** (the owner: "would it be funny
//: if ... the application detects the intent or mood from the name ... like
//: I have personas called 'overly dramatic narrator', and 'depressed
//: wizard'", then "most people wont do that ... if I put in the word
//: pandaSushi101, what would that generate"). `nameMood` reads a name in
//: four layers, most specific first, and `nameMark` draws what it found:
//:
//: 1. **Words.** A mood word ("depressed", "grumpy", "dramatic") or a noun
//:    that carries one ("coffee" is wired, "moon" is sleepy, "sushi" is
//:    hungry), an animal ("panda" draws a panda), and a costume ("wizard"
//:    is a hat, "academic" is glasses). camelCase, digits and underscores
//:    split a handle into words, so "pandaSushi101" is panda, sushi, 101;
//:    and a name typed as one lower-case run is scanned for the longer
//:    keywords (four letters and up) inside it, so "pandasushi" reads the
//:    same. A keyword of three letters only ever matches a whole word:
//:    "mad" is a mood and "Madison" is a name, "cat" is an animal and
//:    "education" is not a cat. A prefix (the `*`) only ever stands on four
//:    letters or more, for the same reason ("Sadie" is not sad).
//: 2. **Intensity.** "overly", "very", "extremely" and their friends turn the
//:    face up (a bigger gasp, steeper brows, a second tear).
//: 3. **How it is typed.** ALL CAPS shouts; "!" is excited, "?" confused,
//:    "..." sleepy; emoticons and emoji say what they say; a few numbers
//:    mean something to the people who type them (666, 007, 404, 1337).
//: 4. **Nothing at all.** A personality drawn from the name's own hash, so
//:    "Alice" is always the same Alice: a plain face about a quarter of the
//:    time, otherwise one of the milder moods. Never a costume or an animal:
//:    those only come from a word, so a seeded face never claims something
//:    about a name that the name did not say.
//:
//: All local, all instant, nothing stored: the reading is a pure function of
//: the name, pinned by tests/test_name_mood.py.
const NAME_MOOD_LEXICON = {
  moods: {
    happy: "happy happily cheer* jolly joy joyful glad merry upbeat optimis* bubbly friendly kind sweet delight* sunny sunshine smile* smiley smiling cheery chipper jovial rainbow* sun hopeful wholesome",
    excited: "excit* exita* hyper* eager* enthus* thrill* energ* zeal* manic stoked ecstatic giddy pumped wired peppy coffee* espresso* caffein* rocket* sparkl* glitter* party partying hype hyped yay woo woohoo wahoo yeet",
    sad: "sad sadly sadness depress* gloom* melanch* mope mopey sorrow* weep* crying cries miser* lonely forlorn glum morose pessim* emo heartbr* tragic* despair* dejected rain rainy raincloud* cloudy drizzl* blues oof rip sob sobbing",
    angry: "angry anger angrily grump* cranky furious rage raging irate mad grouch* hostile bitter annoy* irritab* livid fuming salty cantankerous storm* thunder* fire fiery flame* blaze* volcan* spicy",
    dramatic: "dramat* theatric* melodram* overact* flamboy* diva extra histrion* operatic shakespear* bard",
    surprised: "surpris* shock* astonish* amaz* startl* stunned gobsmack* flabbergast* awestruck ghost* spook* boo",
    sleepy: "sleep* tired drowsy lazy yawn* bored boring weary exhaust* sluggish nap napping snooz* lethargic moon* night* midnight* dream* insomnia* pillow* sloth*",
    nervous: "nervous anxious anxiet* worri* worry panic* paranoi* jitter* shy timid awkward neurotic scared fright* coward* skittish frazzled",
    sly: "sly sneak* mischiev* cunning sarcas* snark* smug cheeky devious trickster rogue sassy cynic* scheming shady ninja* spy spies agent hacker* shadow* gremlin* goblin* raccoon* thief",
    evil: "evil villain* sinister menac* maniac* muaha* mwaha* bwaha* mwuaha* cackl* diabolic* wicked malic* overlord* mastermind* nefarious dastard* supervillain*",
    sick: "sick sickly ill nause* queasy flu covid sneez* feverish fever germ* poorly",
    dead: "dead ded deceased skull* zombie* undead corpse* ghoul* lich skeleton*",
    starstruck: "starstruck star stars superstar* famous celeb* fangirl* fanboy* fan fans idol*",
    cute: "cute cutie smol tiny baby babies bby lil kawaii precious chibi bean",
    drunk: "drunk tipsy wasted hungover boozy sloshed",
    greedy: "rich money cash* greed* banker* billion* million* capitalist* crypto* stonks bitcoin* hustl* moneybag* loaded",
    calm: "calm* wise zen serene stoic* sage patient gentle mellow relax* peace* tranquil tea monk* yoga",
    serious: "serious stern strict formal pedant* logical deadpan dry grave solemn business* lawyer* accountant* judge* doom* void abyss",
    confused: "confus* baffl* bewild* puzzl* clueless perplex* muddled ditzy lost hm hmm um umm uh uhh erm huh",
    laughing: "lol lolol lols lmao* lmfao rofl haha* hehe* hihi* jaja* kek xd funny funnie* joke* joking jester* clown* comed* silly goof* giggl* laugh* chuckl* prank*",
    unimpressed: "meh ugh bleh bruh whatever unimpress* sceptic* skeptic* jaded blase fine okay ok",
    dizzy: "dizzy woozy spinning chaos* chaotic random* glitch* scrambl*",
    hungry: "hungry hunger* starv* sushi* pizza* taco* burger* cake* cookie* donut* doughnut* noodle* ramen* pasta* cheese* bacon* snack* candy candies choco* waffle* pancake* muffin* cupcake* fries dumpling* boba mochi* sandwich* burrito* nacho* bagel* pie toast* peach* mango* banana* berry cherry* foodie* yum yummy nom nomnom",
    cool: "cool coolest chill* rad dude swag boss suave slick shades",
    love: "love* lovely romantic* crush* heart* cupid* valentin* adorable darling sweetheart",
    uwu: "uwu owo nya nyaa rawr",
  },
  animals: {
    panda: "panda*",
    bear: "bear bears teddy grizzl*",
    koala: "koala*",
    mouse: "mouse mice",
    monkey: "monkey* chimp* ape",
    cat: "cat cats kitty kitten* kitteh meow* catto neko",
    fox: "fox foxy foxes",
    wolf: "wolf wolves",
    tiger: "tiger*",
    lion: "lion lions",
    bunny: "bunny bunnies rabbit* hare",
    dog: "dog dogs doggo* puppy puppies pup pupper* woof* corgi*",
    frog: "frog* toad*",
    pig: "pig pigs piggy piglet* oink",
    owl: "owl owls",
    chick: "chick chicks duck ducks duckling* chicken*",
    penguin: "penguin* pingu",
    ghost: "ghost* spook* boo",
    alien: "alien* ufo martian*",
    octopus: "octopus* octo octopi squid* kraken* cthulhu*",
    bat: "bat bats",
  },
  //: Not every character has hands (the owner: "some can have feet or
  //: tentacles or wings some none at all"). None is the default.
  limbs: {
    "wings-feather": "angel* bird* birb* cherub* pegasus* seraph* dove* feather*",
    "wings-bat": "bat bats dragon* demon* gargoyle* wyvern*",
    "wings-bug": "fairy fairies faerie* bee bees bumble* butterfl* moth moths pixie* sprite* wasp*",
    tentacles: "octopus* octo octopi squid* kraken* cthulhu* tentacle* jellyfish* eldritch",
    feet: "walker* runner* hiker* dancer* jogger* feet foot* toes sneaker* stomp*",
  },
  props: {
    hat: "wizard* witch* mage magi magician* sorcer* warlock* druid* necroman* enchant* merlin gandalf",
    chefhat: "chef chefs cook cooks baker* cooking",
    glasses: "academic* professor* prof scholar* scientist* nerd* librarian* teacher* tutor* researcher* historian* editor* critic* geek* analyst* philosoph* linguist* mathemat* physicist* chemist* boffin* smart",
    eyepatch: "pirate* buccaneer* arr arrr",
    crown: "king kings queen* prince* princess* royal* emperor* empress* monarch* regal duke duchess",
    halo: "angel* saint* guardian* cherub* holy",
    horns: "devil* demon* imp fiend* satan*",
    antenna: "robot* bot bots android* cyborg* droid* machine* automaton* ai",
    moustache: "butler* gentleman gentlemen baron* mustach* moustach* walrus* sir",
    headphones: "headphone* headset* dj music* gamer* gaming podcast* audio* beats",
    fangs: "vampire* vamp dracula* nosferatu",
    rednose: "clown* rudolph reindeer*",
    cowboy: "cowboy* cowgirl* sheriff* yeehaw rodeo* ranch* wrangler*",
    partyhat: "party partying birthday* bday celebrat* fiesta*",
    ninjamask: "ninja*",
    helmet: "astronaut* cosmonaut* space spaceman* rocketman",
  },
  //: What the hand does or holds. One hand, one thing: the first named.
  hands: {
    thumbsup: "nice thumbs* thumbsup gg approve* approved goodjob kudos noice",
    middlefinger: "rude fu fuk fuck* stfu screwyou flipoff hater haters",
    peace: "peace* peaceout hippie* namaste",
    wave: "hi hii hey heya hiya hello* howdy greetings welcome* sup yo bye goodbye",
    beer: "beer* brew* ale lager booze* cheers pint* drinks",
    wine: "wine* vino merlot sommelier* classy fancy champagne* prosecco",
    mug: "coffee* espresso* latte* mug cappucc* barista* tea",
    sword: "knight* warrior* samurai* sword* paladin* viking* gladiator*",
    magnifier: "detective* sherlock* investigat* sleuth* inspector*",
    mic: "karaoke* singer* rapper* mic vocal* diva",
    book: "book* reader* novel* poet* writer* author* bookworm* storyteller*",
    phone: "influencer* selfie* tiktok* texting doomscroll* insta* phone*",
    flower: "flower* garden* bloom* blossom* florist* daisy* sunflower* petal*",
    pizza: "pizza*",
    donut: "donut* doughnut*",
    balloon: "balloon*",
    tableflip: "tableflip* flip flipping ragequit",
  },
  //: Flavours stack on whatever mood the name set: "wink" winks, "ahhhh"
  //: screams, "cooked" sweats. A name that says five things gets all five.
  flavours: {
    wink: "wink winks winking winky",
    scream: "ah aah ahh scream* yell* shriek* help",
    doomed: "cooked doomed cursed rip finished panick* yikes",
    blush: "blush* flustered shy",
  },
  intensifiers: "overly very extremely super ultra really totally too so mega incredibly absurdly wildly insanely ridiculously deeply utterly perpetually chronically hella terribly awfully massively most",
};

function nameMood(name) {
  const raw = String(name || "").trim();
  const result = {
    mood: null, intense: false, animal: null, props: [], flavours: [], hand: null, limbs: null, mutant: null,
    style: { smile: "smile", features: [], nose: null }, source: "seed",
  };
  if (!raw) return result;
  //: One parsed table per page, not per mark: the lexicon is fixed.
  if (!nameMood.table) {
    const parse = (text) =>
      text.split(/\s+/).filter(Boolean).map((entry) => {
        const stem = entry.replace(/\*$/, "");
        //: A prefix needs four letters under it; a shorter one is exact.
        return { stem, prefix: entry.endsWith("*") && stem.length >= 4 };
      });
    const group = (table) =>
      Object.entries(table).map(([key, text]) => ({ key, entries: parse(text) }));
    nameMood.table = {
      moods: group(NAME_MOOD_LEXICON.moods),
      animals: group(NAME_MOOD_LEXICON.animals),
      props: group(NAME_MOOD_LEXICON.props),
      flavours: group(NAME_MOOD_LEXICON.flavours),
      hands: group(NAME_MOOD_LEXICON.hands),
      limbs: group(NAME_MOOD_LEXICON.limbs),
      intensifiers: new Set(NAME_MOOD_LEXICON.intensifiers.split(/\s+/)),
    };
  }
  const table = nameMood.table;
  const words = raw
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  //: A stretched word is still the word: "happyyyy" is happy, "sooo" is so,
  //: "hmmmm" is hm. Only a run of three or more is squeezed, so "cool" and
  //: "happy" keep their own double letters.
  const forms = words.map((word) => {
    const squeezed = word.replace(/(.)\1{2,}/g, "$1");
    return squeezed === word ? [word] : [word, squeezed];
  });
  const letters = raw.toLowerCase().replace(/[^a-z]/g, "");
  //: The earliest match wins, by where it sits in the name: "sad happy cat"
  //: is sad, the way a reader takes the first adjective as the character.
  const find = (groups) => {
    let best = null;
    for (const { key, entries } of groups) {
      for (const { stem, prefix } of entries) {
        forms.forEach((variants, index) => {
          const hit = variants.some((word) => (prefix ? word.startsWith(stem) : word === stem));
          if (hit && (!best || index * 1000 < best.at)) best = { key, at: index * 1000 };
        });
        //: The glued-name scan: only stems of four letters and up, and only
        //: behind every whole-word match (`+ 500000`).
        if (stem.length >= 4 && letters.length >= stem.length) {
          const at = letters.indexOf(stem);
          if (at >= 0 && (!best || at + 500000 < best.at)) best = { key, at: at + 500000 };
        }
      }
    }
    return best?.key || null;
  };
  const findAll = (groups) => {
    const keys = [];
    for (const { key, entries } of groups) {
      const hit = entries.some(({ stem, prefix }) =>
        forms.some((variants) => variants.some((word) => (prefix ? word.startsWith(stem) : word === stem))) ||
        (stem.length >= 4 && letters.length >= stem.length && letters.includes(stem))
      );
      if (hit) keys.push(key);
    }
    return keys;
  };
  result.mood = find(table.moods);
  result.hand = find(table.hands);
  result.limbs = find(table.limbs);
  result.animal = find(table.animals);
  result.props = findAll(table.props);
  //: One hat per head: "Party wizard" wears the party hat, the one named
  //: first, rather than a cone stacked through a cone.
  const hats = ["hat", "chefhat", "cowboy", "partyhat", "crown"];
  if (result.props.filter((prop) => hats.includes(prop)).length > 1) {
    const first = find(table.props.filter(({ key }) => hats.includes(key)));
    result.props = result.props.filter((prop) => !hats.includes(prop) || prop === first);
  }
  //: A flavour the mood already is (a scream on a scream) says nothing new.
  result.flavours = findAll(table.flavours);
  if (/;-?\)/.test(raw) && !result.flavours.includes("wink")) result.flavours.push("wink");
  //: (╯°□°)╯︵ ┻━┻ has no letters at all, and needs none.
  if (/\u253b\u2501+\u253b|\u256f\u00b0\u25a1\u00b0/.test(raw)) result.hand = "tableflip";
  const emojiHands = [
    [/\u{1F44D}/u, "thumbsup"], [/\u{1F595}/u, "middlefinger"], [/\u270C/u, "peace"], [/\u{1F44B}/u, "wave"],
    [/[\u{1F37A}\u{1F37B}]/u, "beer"], [/[\u{1F377}\u{1F942}]/u, "wine"], [/\u2615/u, "mug"],
    [/[\u2694\u{1F5E1}]/u, "sword"], [/[\u{1F50D}\u{1F50E}]/u, "magnifier"], [/\u{1F3A4}/u, "mic"],
    [/[\u{1F4DA}\u{1F4D6}]/u, "book"], [/\u{1F4F1}/u, "phone"], [/[\u{1F338}\u{1F339}\u{1F337}\u{1F33B}]/u, "flower"],
    [/\u{1F355}/u, "pizza"], [/\u{1F369}/u, "donut"], [/\u{1F388}/u, "balloon"],
  ];
  if (!result.hand) {
    for (const [pattern, hand] of emojiHands) {
      if (pattern.test(raw)) {
        result.hand = hand;
        break;
      }
    }
  }
  //: Nobody flips a table calmly.
  if (result.hand === "tableflip") {
    result.mood = "angry";
    result.intense = true;
  }
  if (result.hand && result.source === "seed") result.source = "words";
  result.intense = forms.some((variants) => variants.some((word) => table.intensifiers.has(word)));
  if (result.mood || result.animal || result.props.length) result.source = "words";

  //: Layer three, how it is typed. Read even when the words spoke, for the
  //: intensity ("Happy!!!"), and for the mood only when they did not.
  let hinted = null;
  const hint = (mood) => {
    if (!hinted) hinted = mood;
  };
  const emoji = [
    [/[\u{1F634}\u{1F4A4}\u{1F971}]/u, "sleepy"],
    [/[\u{1F60D}\u{1F970}\u{1F618}\u{2764}\u{1F495}\u{1F496}]/u, "love"],
    [/[\u{1F622}\u{1F62D}\u{1F61E}\u{1F614}\u{2639}\u{1F641}]/u, "sad"],
    [/[\u{1F620}\u{1F621}\u{1F92C}\u{1F4A2}]/u, "angry"],
    [/[\u{1F62E}\u{1F632}\u{1F631}\u{1F92F}]/u, "surprised"],
    [/\u{1F60E}/u, "cool"],
    [/\u{1F608}/u, "evil"],
    [/[\u{1F480}\u{2620}]/u, "dead"],
    [/[\u{1F922}\u{1F92E}\u{1F912}\u{1F927}]/u, "sick"],
    [/[\u{1F602}\u{1F923}\u{1F921}]/u, "laughing"],
    [/[\u{1F31F}\u{2B50}]/u, "starstruck"],
    [/\u{1F97A}/u, "cute"],
    [/\u{1F60F}/u, "sly"],
    [/[\u{1F911}\u{1F4B0}\u{1F4B8}]|\$\$/u, "greedy"],
    [/[\u{1F60B}\u{1F924}\u{1F363}\u{1F355}\u{1F354}\u{1F369}\u{1F370}]/u, "hungry"],
    [/[\u{1F914}\u{1F615}\u{2753}]/u, "confused"],
    [/\u{1F929}/u, "starstruck"],
    [/[\u{1F389}\u{2728}\u{26A1}\u{1F973}]/u, "excited"],
    [/[\u{1F600}\u{1F603}\u{1F604}\u{1F601}\u{1F642}\u{1F60A}\u{263A}]/u, "happy"],
  ];
  for (const [pattern, mood] of emoji) if (pattern.test(raw)) hint(mood);
  const emojiCreatures = [
    [/\u{1F43C}/u, "panda"], [/\u{1F431}/u, "cat"], [/\u{1F436}/u, "dog"], [/\u{1F430}/u, "bunny"],
    [/\u{1F98A}/u, "fox"], [/\u{1F43B}/u, "bear"], [/\u{1F438}/u, "frog"], [/\u{1F437}/u, "pig"],
    [/\u{1F989}/u, "owl"], [/\u{1F47B}/u, "ghost"], [/\u{1F47D}/u, "alien"], [/\u{1F427}/u, "penguin"],
  ];
  if (!result.animal) {
    for (const [pattern, animal] of emojiCreatures) {
      if (pattern.test(raw)) {
        result.animal = animal;
        break;
      }
    }
  }
  const emojiProps = [
    [/\u{1F916}/u, "antenna"], [/\u{1F451}/u, "crown"], [/\u{1F9D9}/u, "hat"], [/\u{1F913}/u, "glasses"],
    [/\u{1F608}/u, "horns"], [/\u{1F921}/u, "rednose"], [/\u{1F9DB}/u, "fangs"], [/\u{1F920}/u, "cowboy"],
    [/\u{1F973}/u, "partyhat"], [/\u{1F977}/u, "ninjamask"],
  ];
  for (const [pattern, prop] of emojiProps) if (pattern.test(raw) && !result.props.includes(prop)) result.props.push(prop);
  const emoticons = [
    [/>:\(|>:-\(/, "angry"],
    [/:-?\)|\(:|\^_?\^|=\)/, "happy"],
    [/:-?\(|T_T|;_;|=\(/, "sad"],
    [/:-?D|\bx-?D\b/i, "excited"],
    [/:-?[Pp]\b|:-?[Pp]$/, "hungry"],
    [/:-?[Oo]\b|:-?[Oo]$|\b[oO]_[oO]\b/, "surprised"],
    [/-_-|\bz{3,}\b/i, "sleepy"],
    [/;-?\)/, "sly"],
    [/<3/, "love"],
    [/\b[B8]-?\)/, "cool"],
    [/^x+X|X+x+$/, "sly"],
  ];
  for (const [pattern, mood] of emoticons) if (pattern.test(raw)) hint(mood);
  const numbers = { 666: ["sly", "horns"], "007": ["cool", null], 404: ["confused", null], 1337: ["sly", "glasses"], 9000: ["excited", null], 420: ["calm", null] };
  for (const word of words) {
    const known = numbers[word];
    if (!known) continue;
    hint(known[0]);
    if (known[1] && !result.props.includes(known[1])) result.props.push(known[1]);
    if (word === "9000") result.intense = true;
  }
  if (/\.\.\.|…/.test(raw)) hint("sleepy");
  if (/\?\s*$/.test(raw)) hint("confused");
  const bangs = (raw.match(/!/g) || []).length;
  if (bangs) hint("excited");
  if (bangs >= 2) result.intense = true;
  const capitals = raw.replace(/[^A-Za-z]/g, "");
  //: Shouting is three capitals or more and no lower case at all; "AI" and
  //: "DJ" are initials, not raised voices.
  if (capitals.length >= 3 && capitals === capitals.toUpperCase()) {
    result.intense = true;
    hint("excited");
  }
  if (!result.mood && hinted) {
    result.mood = hinted;
    if (result.source === "seed") result.source = "hint";
  } else if (result.source === "seed" && (result.props.length || result.animal || result.intense)) {
    result.source = "hint";
  }

  //: **Names that make no sense** (the owner: "can you improve or expand it
  //: even more for names which just make no sence haha??"). When neither the
  //: words nor the typing said anything, the letters themselves still can:
  //: a held key is a scream ("aaaaaaa"), a run along one keyboard row is a
  //: dizzy mash ("asdfgh"), and a handle nobody could pronounce (no vowels,
  //: five consonants in a row, or letters and digits shuffled together) is
  //: a little mutant whose traits come from its characters. That last idea
  //: is helixlabs's (the owner's own MIT project, sketch.js): sum each
  //: character's code times its position, so order matters, and let that
  //: number decide the species. Here it decides how many eyes, whether they
  //: are googly or on stalks, how many spots, and whether there are fangs.
  if (!result.mood && !result.animal && !result.props.length && letters.length >= 3) {
    const compact = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    const digits = compact.replace(/[a-z]/g, "").length;
    const mash = /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|rtyu|tyui|yuio|uiop|zxcv|xcvb|cvbn|vbnm|jkjk|fjfj/;
    const unsayable =
      !/[aeiouy]/.test(letters) || /[^aeiouy]{5,}/.test(letters) || (digits >= 2 && compact.length <= 8 && /[a-z]\d[a-z]/.test(compact));
    if (/([a-z])\1{3,}/.test(letters) && new Set(letters).size <= 2) {
      result.mood = "surprised";
      result.intense = true;
      result.source = "nonsense";
    } else if (mash.test(letters)) {
      result.mood = "dizzy";
      result.source = "nonsense";
    } else if (unsayable) {
      let mix = 0;
      for (let i = 0; i < compact.length; i += 1) mix += compact.charCodeAt(i) * (i + 1);
      const pick = (n) => {
        mix = Math.imul(mix ^ (mix >>> 7), 2654435761) >>> 0;
        return mix % n;
      };
      result.mutant = {
        eyes: [1, 2, 3, 1, 3, 2][pick(6)],
        googly: pick(3) === 0,
        stalks: pick(4) === 0,
        spots: pick(5),
        spotAt: pick(6),
        fangs: pick(3) === 0,
      };
      //: And its own limbs, or none: a mutant is the one character the
      //: letters alone may give wings.
      result.limbs = [null, "feet", "tentacles", "wings-bug", "wings-bat", null][pick(6)];
      result.source = "nonsense";
    }
  }

  //: Layer four: the name's own hash picks a personality. FNV-1a, the same
  //: family `nameMark` uses, seeded differently so the two draws are
  //: independent of each other.
  if (!result.mood) {
    let h = 2166136261 ^ 0x9e3779b9;
    for (const ch of raw.toLowerCase()) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13;
    const pool = [
      null, null, null, null, "happy", "happy", "calm", "sly", "surprised",
      "sleepy", "serious", "nervous", "excited", "confused", "cool", "love",
    ];
    result.mood = pool[(h >>> 0) % pool.length];
  }
  //: **The face's own style**, for every name: which smile, which small
  //: features (the owner: "there can be variations of types of smiles and
  //: other features as well"). A third hash of the name, so it is stable
  //: and independent of both the colours and the personality.
  let sh = 2166136261 ^ 0x85ebca6b;
  for (const ch of raw.toLowerCase()) {
    sh ^= ch.codePointAt(0);
    sh = Math.imul(sh, 16777619) >>> 0;
  }
  const roll = (n) => {
    sh ^= sh >>> 13;
    sh = Math.imul(sh, 3266489917) >>> 0;
    sh = (sh ^ (sh >>> 16)) >>> 0;
    return sh % n;
  };
  const smiles = ["smile", "grin", "toothy", "lopsided", "bigD", "buck", "gap", "cat3", "smile", "grin"];
  result.style.smile = smiles[roll(smiles.length)];
  for (const feature of ["freckles", "mole", "lashes", "blush"]) {
    if (roll(4) === 0) result.style.features.push(feature);
  }
  result.style.nose = [null, null, "dot", "button"][roll(4)];
  return result;
}

//: How each mood draws: eyes, brows, mouth, and the small things around a
//: face that carry the joke (a tear, a sweat drop, a "zz", a vein). An
//: intense reading swaps in the louder mouth and adds the louder extras.
const NAME_MARK_FACES = {
  happy: { eyes: "happy", mouth: "smile", loud: "grin", extras: ["blush"] },
  excited: { eyes: "sparkle", brows: "raised", mouth: "grin", extras: ["blush"], louder: ["spark"] },
  sad: { eyes: "glossy", brows: "sad", mouth: "frown", extras: ["tear"], louder: ["tear2"] },
  angry: { eyes: "narrow", brows: "angry", mouth: "frown", loud: "teeth", louder: ["vein"] },
  dramatic: { eyes: "wide", brows: "dramatic", mouth: "gasp", louder: ["tear", "spark"] },
  surprised: { eyes: "wide", brows: "raised", mouth: "o", louder: ["sweat"] },
  sleepy: { eyes: "closed", mouth: "yawn", extras: ["zz"] },
  nervous: { eyes: "dot", brows: "sad", mouth: "wavy", extras: ["sweat"], louder: ["sweat2"] },
  sly: { eyes: "narrow", brows: "sly", mouth: "smirk" },
  calm: { eyes: "content", mouth: "smile" },
  serious: { eyes: "dot", brows: "flat", mouth: "flat" },
  confused: { eyes: "mismatch", brows: "confused", mouth: "wavy", extras: ["question"] },
  hungry: { eyes: "happy", mouth: "tongue", extras: ["blush"], louder: ["drool"] },
  cool: { eyes: "shades", mouth: "smirk" },
  love: { eyes: "heart", mouth: "smile", extras: ["blush"], louder: ["heart"] },
  laughing: { eyes: "squeeze", mouth: "grin", extras: ["tear", "tear2"], louder: ["spark"] },
  unimpressed: { eyes: "halflid", brows: "flat", mouth: "flat" },
  dizzy: { eyes: "spiral", mouth: "wavy", extras: ["stars"] },
  uwu: { eyes: "closed", mouth: "cat", extras: ["blush"], louder: ["heart"] },
  evil: { eyes: "evil", brows: "angry", mouth: "evil", extras: ["glint"], louder: ["glint2"] },
  sick: { eyes: "halflid", brows: "sad", mouth: "wavy", extras: ["greenblush", "thermometer"] },
  dead: { eyes: "x", mouth: "tongue" },
  starstruck: { eyes: "star", brows: "raised", mouth: "grin", extras: ["spark"] },
  cute: { eyes: "sparkle", mouth: "cat", extras: ["blush"], louder: ["heart"] },
  drunk: { eyes: "halflid", mouth: "smirk", extras: ["blush", "bubble"] },
  greedy: { eyes: "dollar", mouth: "grin", extras: ["spark"] },
};

//: The creatures a name can ask for. `head` fixes the head's colour where
//: the animal has one (a panda is white, a fox is orange); the others keep
//: the name's own palette colour, so two cats still differ.
const NAME_MARK_CREATURES = {
  panda: { head: "#f5f4ef", ears: "round", ear: "#2b2a28", patches: "#2b2a28" },
  bear: { head: "#9c755f", ears: "round", muzzle: "#d9b38c" },
  koala: { head: "#a9aaa4", ears: "round", earSize: 4.6, inner: "#f3c6cf", nose: true },
  mouse: { head: "#b9b9b3", ears: "round", earSize: 5, inner: "#ff9da7" },
  monkey: { head: "#9c755f", ears: "side", muzzle: "#e8c9a4" },
  cat: { ears: "pointy", mouth: "cat", whiskers: true },
  fox: { head: "#f28e2c", ears: "pointy", mouth: "cat", muzzle: "#f5f4ef" },
  wolf: { head: "#8e9aa6", ears: "pointy", mouth: "cat", muzzle: "#dfe3e8" },
  tiger: { head: "#f28e2c", ears: "round", stripes: true, mouth: "cat", whiskers: true },
  lion: { head: "#edc949", mane: "#b0703a", ears: "round", mouth: "cat" },
  bunny: { ears: "long", inner: "#ff9da7", mouth: "cat" },
  dog: { head: "#d9b38c", ears: "floppy", ear: "#9c755f", nose: true },
  frog: { head: "#59a14f", eyesUp: true },
  pig: { head: "#ff9da7", ears: "pointy", snout: "#f07a8e" },
  owl: { head: "#9c755f", ears: "tufts", rings: "#f5f4ef", beak: "#f28e2c" },
  chick: { head: "#edc949", beak: "#f28e2c", tuft: true, limbs: "feet", foot: "#f28e2c" },
  penguin: { head: "#2b2a28", mask: "#f5f4ef", beak: "#f28e2c", limbs: "feet", foot: "#f28e2c" },
  ghost: { head: "#f5f4ef", shape: "ghost" },
  alien: { head: "#8cd17d", eyes: "alien", antenna: true },
  octopus: { head: "#af7aa1", limbs: "tentacles" },
  bat: { head: "#6b5b73", ears: "pointy", limbs: "wings-bat", inner: "#ff9da7" },
};

//: Which palette colours each mood's ground leans to, when the name said
//: the mood out loud (a seeded mood keeps the name's own colour).
const NAME_MARK_MOOD_GROUNDS = {
  happy: [5, 1, 9, 7], excited: [1, 5, 7, 2], sad: [0, 3, 6, 8], angry: [2, 1, 8],
  dramatic: [6, 2, 7], surprised: [5, 7, 1], sleepy: [6, 0, 3], nervous: [3, 9, 5],
  sly: [6, 4, 8], calm: [3, 4, 9, 0], serious: [0, 8, 3], confused: [9, 6, 3],
  hungry: [1, 5, 7], cool: [0, 6, 3], love: [7, 2, 6],
  laughing: [5, 1, 7], unimpressed: [8, 0, 3], dizzy: [9, 6, 5], uwu: [7, 6, 9],
  evil: [6, 2, 8], sick: [9, 4, 3], dead: [8, 0, 6], starstruck: [5, 1, 7], cute: [7, 9, 5], drunk: [2, 7, 1],
  greedy: [4, 9, 5],
};

//: A sentence for the tooltip: what the mark was read as, so the joke can be
//: found by hovering ("Very dramatic face", "Hungry panda").
const NAME_MARK_MOOD_WORDS = {
  angry: "grumpy", love: "smitten", sly: "sly", cool: "cool", drunk: "tipsy", greedy: "money-eyed",
};
const NAME_MARK_PROP_WORDS = {
  hat: "a wizard hat", chefhat: "a chef's hat", glasses: "glasses", eyepatch: "an eyepatch",
  crown: "a crown", halo: "a halo", horns: "horns", antenna: "an antenna",
  moustache: "a moustache", headphones: "headphones", fangs: "fangs", rednose: "a clown nose",
  cowboy: "a cowboy hat", partyhat: "a party hat", ninjamask: "a ninja mask", helmet: "a space helmet",
};

const NAME_MARK_HAND_WORDS = {
  thumbsup: "giving a thumbs up", middlefinger: "flipping you off", peace: "throwing a peace sign",
  wave: "waving", beer: "with a beer", wine: "with a glass of wine", mug: "with a hot drink",
  sword: "with a sword", magnifier: "with a magnifying glass", mic: "with a microphone",
  book: "with a book", phone: "on their phone", flower: "with a flower", pizza: "with pizza",
  donut: "with a donut", balloon: "with a balloon", tableflip: "flipping a table",
};

function nameMarkTitle(reading) {
  if (!reading.mood && !reading.animal && !reading.props.length && !reading.mutant && !reading.flavours?.length && !reading.hand) return "";
  const mood = reading.mood ? NAME_MARK_MOOD_WORDS[reading.mood] || reading.mood : "";
  const mutant = reading.mutant;
  const creatureWord = mutant
    ? mutant.eyes === 1 ? "cyclops" : mutant.eyes === 3 ? "three-eyed critter" : "critter"
    : "face";
  const words = [reading.intense && mood ? "very" : "", mood, reading.animal || creatureWord].filter(Boolean);
  const props = reading.props.map((prop) => NAME_MARK_PROP_WORDS[prop]).filter(Boolean);
  const tail = props.length ? ` with ${props.join(" and ")}` : "";
  const doing = { wink: "winking", scream: "screaming", doomed: "sweating", blush: "blushing" };
  const flavours = (reading.flavours || []).map((flavour) => doing[flavour]).filter(Boolean);
  const also = flavours.length
    ? `, ${flavours.length > 1 ? `${flavours.slice(0, -1).join(", ")} and ${flavours.at(-1)}` : flavours[0]}`
    : "";
  const hand = reading.hand ? `, ${NAME_MARK_HAND_WORDS[reading.hand]}` : "";
  const text = `${words.join(" ")}${tail}${also}${hand}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

//: **A mark generated from a name** (INBOX 405, then 409, then the owner's
//: "make the avatars, their generation and use very impressive ... funny
//: ... cute ... can they be animated as a togglable option"). The same name
//: always draws the same mark, with nothing stored: a hash of the name seeds
//: the geometry, and `nameMood` reads the name for what the face should be.
//:
//: The base is the "beam" idea from boring-avatars (the idea, not its code):
//: a rounded head in one colour set at an angle over a ground in another,
//: moved by the seed. Measured by `scratchpad/ui-sweeps/namemarks.js` (23
//: everyday names at 40px): the closest pair differs in 19.1% of pixels and
//: the mean pair in 71.9% (the floor is 15%). On top of it
//: sit the reading's face (nineteen moods, each with its own eyes, brows,
//: mouth and extras), a creature when the name names one (nineteen, from
//: ears and patches to a ghost's hem), a costume when it names one (ten),
//: flavours stacked on top (a wink, a scream, a sweat), and for a name that
//: makes no sense, a mutant with one, two or three eyes.
//:
//: Motion is CSS only, keyed off classes set here: the eyes blink, the face
//: breathes, and each mood has its own move (the tear falls, the "zz"
//: drifts, the vein throbs, an excited face bounces). Settings > Appearance >
//: Avatar animation chooses off, on hover, or always; Reduce motion wins.
//: Each mark starts its loop at its own point (`--nm-delay`, from the seed),
//: so a list of faces does not blink in unison.
//:
//: Colours are `CATEGORY_DOT_COLOURS`, the app's own ten, plus a creature's
//: fixed coat. The features are ink or white by the head's own luminance, so
//: a face never vanishes into a light head. Decorative (`aria-hidden`): the
//: name beside it is what a screen reader says; the `<title>` is for a
//: pointer's tooltip.
let nameMarkSerial = 0;

function nameMark(seed, size = 20) {
  let h = 2166136261;
  for (const ch of String(seed || "?").trim().toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  //: FNV alone leaves short, similar names close together in the low bits;
  //: a few xorshift rounds spread them before anything is drawn from it.
  const rnd = () => {
    h ^= h << 13;
    h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5;
    h >>>= 0;
    return h / 4294967296;
  };
  for (let i = 0; i < 4; i += 1) rnd();
  const reading = nameMood(seed);
  const creature = reading.animal ? NAME_MARK_CREATURES[reading.animal] : null;
  const face = reading.mood ? NAME_MARK_FACES[reading.mood] : null;
  const loud = reading.intense;
  const palette = CATEGORY_DOT_COLOURS;

  //: The draws happen in the order the plain mark always made them, so a
  //: name the reading leaves plain draws exactly the mark it drew before.
  const groundRoll = rnd();
  const headRoll = rnd();
  const bias = reading.source !== "seed" && reading.mood ? NAME_MARK_MOOD_GROUNDS[reading.mood] : null;
  const groundIndex = bias
    ? bias[Math.floor(groundRoll * bias.length)]
    : Math.floor(groundRoll * palette.length);
  const headIndex = (groundIndex + 1 + Math.floor(headRoll * (palette.length - 1))) % palette.length;
  let ground = palette[groundIndex];
  const head = creature?.head || palette[headIndex];
  //: A creature's fixed coat can land on its own ground colour (a fox on the
  //: orange); the next colour round keeps the head against something.
  if (ground.toLowerCase() === head.toLowerCase()) ground = palette[(groundIndex + 3) % palette.length];
  const luminance = (hex) => {
    const channels = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const faceGround = creature?.mask || head;
  const ink = luminance(faceGround) > 0.4 ? "#1c1c1a" : "#ffffff";
  //: The one colour a feature can take that always stands off the ink:
  //: the head's own (a catchlight in an ink eye, the teeth in an ink mouth).
  const paper = faceGround;

  let offX = (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 7);
  let offY = (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 7);
  const turn = Math.floor(rnd() * 360);
  let grow = 0.85 + rnd() * 0.2;
  let round = rnd() < 0.5;
  let tilt = Math.round((rnd() * 2 - 1) * 12);
  let eyeSpread = rnd() * 3.5;
  let mouthDrop = rnd() * 2.5;
  const mouthOpen = rnd() < 0.5;
  const delay = rnd();

  const topProps = ["hat", "chefhat", "crown", "halo", "horns", "antenna", "headphones", "cowboy", "partyhat"];
  const wearsTop = reading.props.some((prop) => topProps.includes(prop)) || creature?.antenna;
  const hasEars = Boolean(creature?.ears || creature?.mane || creature?.eyesUp || creature?.tuft);
  //: A plain face rides half the head's offset, which is the beam look; a
  //: face with a mood has more to show, so it sits most of the way on.
  let follow = face ? 0.8 : 0.5;
  //: A creature or a hat needs room above the face: the head shrinks a
  //: little, drops, turns round, and the face follows it all the way.
  if (creature || wearsTop) {
    grow = Math.min(grow, hasEars || wearsTop ? 0.78 : 0.86);
    offX *= 0.35;
    offY = 2.4 + Math.abs(offY) * 0.18;
    round = creature ? true : round;
    follow = 1;
  }
  //: A face with a mood has brows and extras that need the head under them;
  //: the beam's far corners are for a plain face.
  if (face && !creature && !wearsTop) {
    offX *= 0.6;
    offY *= 0.6;
  }
  if (creature?.ears === "long") offY = 4.2;
  if (creature?.shape === "ghost") {
    offX = 0;
    offY = 1.6;
  }
  //: Limbs need somewhere to stand out from: wings and feet lift and shrink
  //: the head a little; tentacles lift it more, since they hang the
  //: furthest.
  const limbs = reading.limbs || creature?.limbs || null;
  if (limbs) {
    grow = Math.min(grow, limbs.startsWith("wings") ? 0.64 : limbs === "tentacles" ? 0.7 : 0.78);
    offX *= 0.4;
    offY = limbs === "tentacles" ? -2.2 : limbs === "feet" ? Math.min(offY, 0) : 3;
    round = true;
  }
  const mutant = reading.mutant;
  if (reading.props.length || creature || face || mutant) eyeSpread = Math.min(eyeSpread, 1.6);
  if (face) mouthDrop = Math.min(mouthDrop, 1.2);
  if (reading.mood === "dramatic" && loud) tilt = tilt < 0 ? -20 : 20;
  //: A hand comes up at the lower right, so the face steps left for it.
  if (reading.hand && reading.hand !== "tableflip") offX = Math.min(offX, 0) - 2.4;
  const faceX = offX * follow;
  const faceY = offY * follow;

  const svgNs = "http://www.w3.org/2000/svg";
  const make = (tag, attrs) => {
    const el = document.createElementNS(svgNs, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    return el;
  };
  const f = (n) => n.toFixed(2);
  const stroke = (d, width = 1.4, colour = ink) =>
    make("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const svg = make("svg", {
    viewBox: "0 0 36 36",
    width: size,
    height: size,
    class: `name-mark nm-${reading.mood || "plain"}${creature ? ` nm-${reading.animal}` : ""}${reading.mutant ? " nm-mutant" : ""}${reading.hand ? ` nm-hand-${reading.hand}` : ""}`,
    "aria-hidden": "true",
  });
  svg.style.setProperty("--nm-delay", `${f(-delay * 6)}s`);
  const title = nameMarkTitle(reading);
  if (title) {
    const titleEl = make("title", {});
    titleEl.textContent = title;
    svg.appendChild(titleEl);
  }
  //: A serial rather than the hash for the clip's id: the same name drawn
  //: twice on one page (a persona row and the chat picker) would otherwise
  //: put two elements with one id in the document.
  nameMarkSerial += 1;
  const clipId = `nm-${nameMarkSerial.toString(36)}`;
  const clip = make("clipPath", { id: clipId });
  clip.appendChild(make("circle", { cx: 18, cy: 18, r: 18 }));
  const group = make("g", { "clip-path": `url(#${clipId})` });
  group.appendChild(make("rect", { width: 36, height: 36, fill: ground }));

  //: Everything that belongs to the face moves with it: one transform for
  //: the layer behind the head (ears, a mane) and one for the face on it.
  const faceTransform = `translate(${f(faceX)} ${f(faceY)}) rotate(${tilt} 18 18)`;
  const behind = make("g", { transform: faceTransform, class: "nm-behind" });
  const onFace = make("g", { transform: faceTransform, class: "nm-face" });
  const shade = "rgba(0,0,0,0.22)";

  // --- behind the head: ears, a mane, a frog's eye bulges ---
  if (creature?.mane) {
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      behind.appendChild(make("circle", { cx: f(18 + Math.cos(a) * 12.6), cy: f(18 + Math.sin(a) * 12.6), r: 4.4, fill: creature.mane }));
    }
  }
  const earFill = creature?.ear || head;
  if (creature?.ears === "round") {
    const r = creature.earSize || 3.8;
    for (const side of [-1, 1]) {
      const cx = 18 + side * 8;
      const cy = 7.8;
      behind.appendChild(make("circle", { cx, cy, r, fill: earFill }));
      behind.appendChild(make("circle", { cx, cy, r: f(r * 0.48), fill: creature.inner || shade }));
    }
  } else if (creature?.ears === "side") {
    for (const side of [-1, 1]) {
      behind.appendChild(make("circle", { cx: 18 + side * 13.2, cy: 16.5, r: 4, fill: earFill }));
      behind.appendChild(make("circle", { cx: 18 + side * 13.2, cy: 16.5, r: 2.2, fill: creature.muzzle || shade }));
    }
  } else if (creature?.ears === "pointy" || creature?.ears === "tufts") {
    const tall = creature.ears === "tufts" ? 4.4 : 0;
    for (const side of [-1, 1]) {
      const x = (n) => f(18 + side * n);
      behind.appendChild(make("path", { d: `M${x(10)} 12.5L${x(9.6)} ${f(1.8 + tall)}L${x(3.6)} 7.6z`, fill: earFill }));
      if (creature.ears === "pointy") {
        behind.appendChild(make("path", { d: `M${x(8.9)} 10.2L${x(8.8)} 4.6L${x(5.4)} 7.6z`, fill: creature.inner || shade }));
      }
    }
  } else if (creature?.ears === "long") {
    for (const side of [-1, 1]) {
      const cx = 18 + side * 4.8;
      const rot = side * 11;
      behind.appendChild(make("ellipse", { cx, cy: 3.4, rx: 2.9, ry: 8, fill: earFill, transform: `rotate(${rot} ${cx} 10)` }));
      behind.appendChild(make("ellipse", { cx, cy: 3.6, rx: 1.4, ry: 5.8, fill: creature.inner || shade, transform: `rotate(${rot} ${cx} 10)` }));
    }
  }
  //: Wings come off the upper sides, angled up into the ground the head
  //: leaves free; feet and tentacles from below it. All behind the head,
  //: so it sits on them. Each side is one path, mirrored for the other.
  const mirror = (el, side) => {
    if (side > 0) el.setAttribute("transform", "translate(36 0) scale(-1 1)");
    return el;
  };
  const wingLine = { stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" };
  if (limbs && limbs.startsWith("wings")) {
    for (const side of [-1, 1]) {
      const beat = make("g", { class: `nm-wing nm-wing-${side < 0 ? "l" : "r"}` });
      //: Drawn small in the corner, then set lower and a third larger about
      //: the joint, so the wing stands clear of the head at its side.
      const jx = side < 0 ? 10 : 26;
      const wing = make("g", { transform: `translate(${jx} 21) scale(1.3) translate(${-jx} -16)` });
      beat.appendChild(wing);
      if (limbs === "wings-feather") {
        wing.appendChild(mirror(make("path", { d: "M10 16C4.6 14.2 1.6 9.8 2 3.8c1.4 2 2.7 2.6 3.8 2.4-.1 1.9.9 3 2.2 3.3-.2 1.7.6 2.9 1.9 3.4z", fill: "#f5f4ef", ...wingLine }), side));
        wing.appendChild(mirror(stroke("M4.4 7.4c1 2.4 2.6 4.2 4.8 5.4", 0.4, "#1c1c1a"), side));
      } else if (limbs === "wings-bat") {
        wing.appendChild(mirror(make("path", { d: "M10.4 16L1.4 4.6q1.9 2.9 4.1 2.3.1 2.8 2.3 3.1.2 2.4 2.4 2.8z", fill: "#3b3440", ...wingLine }), side));
      } else {
        wing.appendChild(mirror(make("ellipse", { cx: 5.8, cy: 8.6, rx: 4.2, ry: 2.6, transform: "rotate(-38 5.8 8.6)", fill: "#d6ecff", "fill-opacity": 0.8, ...wingLine, "stroke-width": 0.4 }), side));
        wing.appendChild(mirror(make("ellipse", { cx: 6, cy: 13.8, rx: 2.8, ry: 1.7, transform: "rotate(22 6 13.8)", fill: "#d6ecff", "fill-opacity": 0.8, ...wingLine, "stroke-width": 0.4 }), side));
      }
      behind.appendChild(beat);
    }
  }
  if (limbs === "feet") {
    const foot = creature?.foot || head;
    for (const side of [-1, 1]) {
      behind.appendChild(make("ellipse", { cx: 18 + side * 4.4, cy: 33.2, rx: 3, ry: 1.6, fill: foot, class: `nm-foot nm-foot-${side < 0 ? "l" : "r"}`, ...wingLine }));
    }
  }
  if (limbs === "tentacles") {
    for (const [i, x] of [10.6, 14.4, 18.2, 22, 25.8].entries()) {
      const bend = i % 2 ? -1 : 1;
      const d = `M${f(x)} 24q${f(bend * -1.6)} 3 0 5.6q${f(bend * 1.6)} 2.4-.6 4.6`;
      const t = make("g", { class: `nm-tentacle${i % 2 ? " nm-tentacle-late" : ""}` });
      t.appendChild(stroke(d, 3.2, "#1c1c1a"));
      t.appendChild(stroke(d, 2.2, head));
      behind.appendChild(t);
    }
  }
  if (creature?.tuft) {
    behind.appendChild(make("path", { d: "M18 7.5c-1.2-2.6-.4-4.6 1.4-5.3-.3 1.6.4 2.7 1.6 3.3-1.1.2-2 .9-3 2z", fill: head }));
  }
  if (creature?.eyesUp) {
    for (const side of [-1, 1]) behind.appendChild(make("circle", { cx: 18 + side * 5.2, cy: 8.8, r: 4.6, fill: head }));
  }
  //: Everything that moves as one when the face is animated: the ears, the
  //: head, the sheen and the face. A group with no transform attribute of
  //: its own, so the CSS transform has nothing to overwrite.
  const body = make("g", { class: "nm-body" });
  body.appendChild(behind);

  // --- the head, over its own shadow ---
  //: The shadow is the head again, darker and nudged down and right, which
  //: is what lifts a flat disc into a thing sitting on the ground. The same
  //: light falls on the sheen below.
  const headShape = (fill, dx = 0, dy = 0) => {
    if (creature?.shape === "ghost") {
      return make("path", {
        d: "M7 33V17.5a11 11 0 0 1 22 0V33l-2.75-2.4-2.75 2.4-2.75-2.4L18 33l-2.75-2.4-2.75 2.4-2.75-2.4L7 33z",
        fill,
        transform: `translate(${f(faceX + dx)} ${f(faceY + dy)})`,
      });
    }
    return make("rect", {
      width: 36,
      height: 36,
      rx: round ? 18 : 7,
      fill,
      //: Scaled about the middle, written out: SVG scales about the corner.
      transform: `translate(${f(offX + dx)} ${f(offY + dy)}) rotate(${turn} 18 18) translate(18 18) scale(${f(grow)}) translate(-18 -18)`,
    });
  };
  group.appendChild(headShape("rgba(0,0,0,0.16)", 1.2, 1.8));
  body.appendChild(headShape(head));
  const sheenId = `${clipId}-l`;
  const sheen = make("radialGradient", { id: sheenId, cx: "32%", cy: "24%", r: "80%" });
  for (const [offset, colour, opacity] of [[0, "#ffffff", 0.3], [0.45, "#ffffff", 0], [1, "#000000", 0.14]]) {
    sheen.appendChild(make("stop", { offset, "stop-color": colour, "stop-opacity": opacity }));
  }
  group.appendChild(make("circle", { cx: 18, cy: 18, r: 18, fill: `url(#${sheenId})`, class: "nm-sheen" }));
  group.appendChild(body);

  // --- the face ---
  const lift = creature?.eyesUp ? -6.2 : wearsTop ? 1 : 0;
  const eyeY = 15 + lift;
  const L = 13.7 - eyeSpread;
  const R = 22.3 + eyeSpread;
  const eyes = make("g", { class: "nm-eyes", fill: ink });

  if (creature?.mask) onFace.appendChild(make("ellipse", { cx: 18, cy: 18.6, rx: 8.6, ry: 8.2, fill: creature.mask }));
  if (creature?.muzzle && creature.ears !== "side") onFace.appendChild(make("ellipse", { cx: 18, cy: 21, rx: 5.2, ry: 3.8, fill: creature.muzzle }));
  if (creature?.ears === "side") onFace.appendChild(make("ellipse", { cx: 18, cy: 19.6, rx: 7.6, ry: 6.4, fill: creature.muzzle }));
  if (creature?.stripes) {
    for (const d of ["M18 6.4v3.4", "M13.6 7.4l1.3 2.6", "M22.4 7.4l-1.3 2.6", "M8.6 16h2.6", "M27.4 16h-2.6"]) onFace.appendChild(stroke(d, 1.3, "#2b2a28"));
  }
  if (creature?.patches) {
    for (const [x, rot] of [[L, 22], [R, -22]]) {
      onFace.appendChild(make("ellipse", { cx: f(x), cy: f(eyeY + 0.4), rx: 2.9, ry: 3.6, fill: creature.patches, transform: `rotate(${rot} ${f(x)} ${f(eyeY)})` }));
    }
  }
  if (creature?.rings) {
    for (const x of [L, R]) onFace.appendChild(make("circle", { cx: f(x), cy: f(eyeY), r: 3.5, fill: creature.rings }));
  }
  const flavours = reading.flavours || [];
  const extrasList = face ? [...(face.extras || []), ...(loud ? face.louder || [] : [])] : [];
  if (flavours.includes("doomed")) extrasList.push("sweat", "sweat2");
  if (flavours.includes("blush") && !extrasList.includes("blush")) extrasList.push("blush");
  if (extrasList.includes("blush")) {
    for (const x of [L - 1, R + 1]) onFace.appendChild(make("ellipse", { cx: f(x), cy: f(eyeY + 3.6), rx: 1.9, ry: 1.05, fill: "#ff5f7e", opacity: 0.5 }));
  }

  if (reading.props.includes("ninjamask")) {
    onFace.appendChild(make("path", { d: `M5 ${f(eyeY - 2.8)}H31v5.4H5zM30.4 ${f(eyeY - 1.6)}l4.6-2.6-.6 3.6 1.4 2.8-5.4-1.4z`, fill: "#2b2a28" }));
  }
  //: The eye ink over a panda's patches, an owl's rings or a ninja's mask
  //: is the other ink.
  const eyeInk = creature?.patches || reading.props.includes("ninjamask") ? "#ffffff" : creature?.rings ? "#1c1c1a" : ink;
  const glint = creature?.patches ? "#1c1c1a" : paper;
  eyes.setAttribute("fill", eyeInk);
  let eyeStyle = face?.eyes || "dot";
  if (creature?.eyes === "alien") eyeStyle = "alien";
  if (reading.props.includes("antenna") && !face && !creature) eyeStyle = "square";
  if (mutant?.googly && !["shades", "heart", "happy", "closed", "content", "squeeze", "spiral"].includes(eyeStyle)) eyeStyle = "googly";
  const blinkers = ["dot", "glossy", "sparkle", "wide", "narrow", "mismatch", "alien", "square", "googly", "halflid", "evil"];
  if (blinkers.includes(eyeStyle)) eyes.classList.add("nm-blinks");
  //: A wink closes the right eye and makes sure the left one is open, or a
  //: face whose eyes were already shut would wink with nothing.
  const winks = flavours.includes("wink") && eyeStyle !== "shades";
  if (winks && ["closed", "content", "happy", "squeeze", "heart"].includes(eyeStyle)) eyeStyle = "glossy";
  const drawEye = (x, side, y = eyeY) => {
    if (reading.props.includes("eyepatch") && side === 1) return;
    if (winks && side === 1) {
      eyes.appendChild(stroke(`M${f(x - 1.7)} ${f(y + 1)}q1.7-2.8 3.4 0`, 1.5, eyeInk));
      return;
    }
    if (eyeStyle === "dot") {
      eyes.appendChild(make("rect", { x: f(x - 1.2), y: f(y - 1.5), width: 2.4, height: 3, rx: 1.2 }));
    } else if (eyeStyle === "square") {
      eyes.appendChild(make("rect", { x: f(x - 1.4), y: f(y - 1.4), width: 2.8, height: 2.8, rx: 0.4 }));
    } else if (eyeStyle === "glossy" || eyeStyle === "sparkle") {
      const r = eyeStyle === "sparkle" && loud ? 2.4 : 2;
      eyes.appendChild(make("circle", { cx: f(x), cy: f(y), r }));
      eyes.appendChild(make("circle", { cx: f(x + 0.7), cy: f(y - 0.7), r: 0.75, fill: glint }));
      eyes.appendChild(make("circle", { cx: f(x - 0.6), cy: f(y + 0.8), r: 0.35, fill: glint }));
    } else if (eyeStyle === "wide") {
      const r = loud ? 2.8 : 2.4;
      eyes.appendChild(make("circle", { cx: f(x), cy: f(y), r, fill: "#ffffff", stroke: "#1c1c1a", "stroke-width": 0.7 }));
      eyes.appendChild(make("circle", { cx: f(x + side * 0.3), cy: f(y + 0.2), r: loud ? 0.9 : 1.1, fill: "#1c1c1a" }));
    } else if (eyeStyle === "narrow") {
      eyes.appendChild(make("rect", { x: f(x - 1.5), y: f(y - 0.4), width: 3, height: 1.4, rx: 0.7 }));
    } else if (eyeStyle === "mismatch") {
      if (side < 0) {
        eyes.appendChild(make("circle", { cx: f(x), cy: f(y), r: 2.3, fill: "#ffffff", stroke: "#1c1c1a", "stroke-width": 0.7 }));
        eyes.appendChild(make("circle", { cx: f(x), cy: f(y), r: 1, fill: "#1c1c1a" }));
      } else {
        eyes.appendChild(make("rect", { x: f(x - 1), y: f(y - 1), width: 2, height: 2.2, rx: 1 }));
      }
    } else if (eyeStyle === "happy") {
      eyes.appendChild(stroke(`M${f(x - 1.7)} ${f(y + 1)}q1.7-2.8 3.4 0`, 1.5, eyeInk));
    } else if (eyeStyle === "closed") {
      eyes.appendChild(stroke(`M${f(x - 1.7)} ${f(y + 0.2)}q1.7 1.7 3.4 0`, 1.4, eyeInk));
    } else if (eyeStyle === "content") {
      eyes.appendChild(stroke(`M${f(x - 1.6)} ${f(y)}q1.6 1.3 3.2 0`, 1.3, eyeInk));
    } else if (eyeStyle === "heart") {
      eyes.appendChild(make("path", {
        d: `M${f(x)} ${f(y + 2)}c-2.6-1.8-3.1-3.3-2.3-4.2.7-.8 1.8-.6 2.3.3.5-.9 1.6-1.1 2.3-.3.8.9.3 2.4-2.3 4.2z`,
        fill: "#e8364f",
        stroke: "#1c1c1a",
        "stroke-width": 0.35,
      }));
    } else if (eyeStyle === "googly") {
      eyes.appendChild(make("circle", { cx: f(x), cy: f(y), r: 2.6, fill: "#ffffff", stroke: "#1c1c1a", "stroke-width": 0.6 }));
      //: The pupil sits off-centre at an angle of its own, and when the
      //: face is animated it rolls round the eye it sits in.
      const angle = ((x * 7.3 + y * 3.1) % 6.28);
      const pupil = make("circle", { cx: f(x + Math.cos(angle) * 1.2), cy: f(y + Math.sin(angle) * 1.2), r: 1.15, fill: "#1c1c1a", class: "nm-pupil" });
      pupil.style.transformOrigin = `${f(x)}px ${f(y)}px`;
      eyes.appendChild(pupil);
    } else if (eyeStyle === "dollar") {
      const dollar = make("text", { x: f(x), y: f(y + 2.3), "text-anchor": "middle", "font-size": 6.4, "font-weight": 800, fill: "#2f9e44", stroke: "#1c1c1a", "stroke-width": 0.35, "font-family": "system-ui, sans-serif" });
      dollar.textContent = "$";
      eyes.appendChild(dollar);
    } else if (eyeStyle === "evil") {
      //: A slanted lid: the inner end low, so the eye looks down its nose.
      const d = side < 0 ? 1 : -1;
      eyes.appendChild(make("path", { d: `M${f(x - d * 1.9)} ${f(y - 1)}L${f(x + d * 1.9)} ${f(y + 0.6)}L${f(x + d * 1.3)} ${f(y + 1.7)}L${f(x - d * 1.5)} ${f(y + 1.2)}z` }));
    } else if (eyeStyle === "x") {
      eyes.appendChild(stroke(`M${f(x - 1.5)} ${f(y - 1.5)}l3 3m0-3l-3 3`, 1.4, eyeInk));
    } else if (eyeStyle === "star") {
      const p = [];
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 ? 1.2 : 2.9;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        p.push(`${f(x + Math.cos(a) * r)} ${f(y + Math.sin(a) * r)}`);
      }
      eyes.appendChild(make("path", { d: `M${p.join("L")}z`, fill: "#ffd84a", stroke: "#1c1c1a", "stroke-width": 0.45, "stroke-linejoin": "round" }));
    } else if (eyeStyle === "squeeze") {
      const d = side < 0 ? 1 : -1;
      eyes.appendChild(stroke(`M${f(x - d * 1.4)} ${f(y - 1.6)}l${f(d * 2.6)} 1.6l${f(-d * 2.6)} 1.6`, 1.5, eyeInk));
    } else if (eyeStyle === "halflid") {
      eyes.appendChild(make("rect", { x: f(x - 1.2), y: f(y - 0.2), width: 2.4, height: 1.9, rx: 0.9 }));
      eyes.appendChild(stroke(`M${f(x - 1.9)} ${f(y - 0.4)}h3.8`, 1.2, eyeInk));
    } else if (eyeStyle === "spiral") {
      eyes.appendChild(stroke(`M${f(x)} ${f(y)}m-.3 0a.5 .5 0 1 1 .7.6a1.2 1.2 0 1 1-1.5-1.4a1.9 1.9 0 1 1 2.3 2.4`, 0.8, eyeInk));
    } else if (eyeStyle === "alien") {
      eyes.appendChild(make("ellipse", { cx: f(x), cy: f(y + 0.4), rx: 2.1, ry: 3, fill: "#1c1c1a", transform: `rotate(${side * -24} ${f(x)} ${f(y)})` }));
      eyes.appendChild(make("circle", { cx: f(x + 0.5), cy: f(y - 0.6), r: 0.6, fill: "#ffffff" }));
    }
  };
  //: Where the eyes go: two, or a mutant's one or three, or up on stalks.
  const eyeCount = mutant?.eyes || 2;
  const eyeAt = eyeCount === 1 ? [[18, 0, eyeY]] : eyeCount === 3 ? [[L - 0.6, -1, eyeY + 0.6], [18, 0, eyeY - 2.4], [R + 0.6, 1, eyeY + 0.6]] : [[L, -1, eyeY], [R, 1, eyeY]];
  if (mutant?.stalks) {
    for (const spot of eyeAt) {
      onFace.appendChild(stroke(`M${f(spot[0])} ${f(spot[2] - 1)}L${f(spot[0] + spot[1] * 0.8)} ${f(spot[2] - 6.4)}`, 1.1, ink));
      spot[0] += spot[1] * 0.8;
      spot[2] -= 7.4;
    }
  }
  if (mutant?.spots) {
    const places = [[9.4, 21.6], [26.6, 22.4], [11.2, 9.8], [25, 10.4], [20.6, 27], [8.4, 15.2]];
    for (let i = 0; i < mutant.spots; i += 1) {
      const [cx, cy] = places[(mutant.spotAt + i) % places.length];
      onFace.appendChild(make("circle", { cx, cy, r: 1 + (i % 2) * 0.5, fill: ink, "fill-opacity": 0.22 }));
    }
  }
  if (eyeStyle !== "shades") {
    for (const [x, side, y] of eyeAt) {
      //: A cyclops's one eye is the face's whole expression: half as big again.
      if (eyeCount === 1) {
        const before = eyes.childNodes.length;
        drawEye(x, side, y);
        const big = make("g", { transform: `translate(${f(x)} ${f(y)}) scale(1.55) translate(${f(-x)} ${f(-y)})` });
        while (eyes.childNodes.length > before) big.prepend(eyes.lastChild);
        eyes.appendChild(big);
      } else {
        drawEye(x, side, y);
      }
    }
  }
  onFace.appendChild(eyes);

  // brows
  const browY = eyeY - 4;
  const brows = make("g", { class: "nm-brows" });
  const browStyle = creature?.eyesUp || eyeCount !== 2 || mutant?.stalks ? null : face?.brows;
  const steep = loud ? 0.6 : 0;
  const bl = (x0, y0, x1, y1) => brows.appendChild(stroke(`M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`, 1.3));
  const arc = (x, y) => brows.appendChild(stroke(`M${f(x - 1.9)} ${f(y)}q1.9-1.9 3.8 0`, 1.3));
  if (browStyle === "angry") {
    bl(L - 1.9, browY - 0.6 - steep, L + 1.9, browY + 1.2 + steep);
    bl(R - 1.9, browY + 1.2 + steep, R + 1.9, browY - 0.6 - steep);
  } else if (browStyle === "sad") {
    bl(L - 1.9, browY + 1, L + 1.9, browY - 0.6 - steep);
    bl(R - 1.9, browY - 0.6 - steep, R + 1.9, browY + 1);
  } else if (browStyle === "raised") {
    arc(L, browY - (loud ? 1 : 0.3));
    arc(R, browY - (loud ? 1 : 0.3));
  } else if (browStyle === "dramatic") {
    arc(L, browY - (loud ? 2 : 1.2));
    bl(R - 1.9, browY + 1, R + 1.9, browY - 0.2);
  } else if (browStyle === "sly") {
    bl(L - 1.9, browY + 0.8, L + 1.9, browY + 0.8);
    arc(R, browY - 0.6);
  } else if (browStyle === "flat") {
    bl(L - 1.9, browY + 0.4, L + 1.9, browY + 0.4);
    bl(R - 1.9, browY + 0.4, R + 1.9, browY + 0.4);
  } else if (browStyle === "confused") {
    arc(L, browY - 0.8);
    bl(R - 1.9, browY + 0.2, R + 1.9, browY + 1.2);
  }
  if (brows.childNodes.length) onFace.appendChild(brows);

  //: The name's own small features. Not on a creature, which has its own
  //: markings, and not where a costume already covers the spot.
  const features = creature ? [] : reading.style?.features || [];
  if (features.includes("freckles")) {
    for (const [x, dir] of [[L, -1], [R, 1]]) {
      for (const [dx, dy] of [[0, 0], [dir * 1.1, 0.5], [dir * 0.3, 1.1]]) {
        onFace.appendChild(make("circle", { cx: f(x + dir * 0.4 + dx), cy: f(eyeY + 3.2 + dy), r: 0.34, fill: ink, "fill-opacity": 0.45 }));
      }
    }
  }
  if (features.includes("mole")) onFace.appendChild(make("circle", { cx: f(R + 0.6), cy: f(eyeY + 6.4), r: 0.45, fill: ink, "fill-opacity": 0.8 }));
  if (features.includes("lashes") && ["dot", "glossy", "sparkle"].includes(eyeStyle)) {
    for (const [x, dir] of [[L, -1], [R, 1]]) onFace.appendChild(stroke(`M${f(x + dir * 1.2)} ${f(eyeY - 1.3)}l${f(dir * 0.9)}-.8M${f(x + dir * 0.4)} ${f(eyeY - 1.7)}l${f(dir * 0.4)}-.9`, 0.55, eyeInk));
  }
  if (features.includes("blush") && !extrasList.includes("blush") && !extrasList.includes("greenblush")) {
    for (const x of [L - 1, R + 1]) onFace.appendChild(make("ellipse", { cx: f(x), cy: f(eyeY + 3.6), rx: 1.8, ry: 1, fill: "#ff5f7e", opacity: 0.4 }));
  }
  const nose = creature || reading.props.includes("rednose") ? null : reading.style?.nose;
  if (nose === "dot") onFace.appendChild(make("ellipse", { cx: 18, cy: f(eyeY + 3.4), rx: 0.75, ry: 0.55, fill: ink, "fill-opacity": 0.55 }));
  if (nose === "button") onFace.appendChild(stroke(`M17 ${f(eyeY + 3.1)}q1 1.1 2 0`, 0.85, ink)).setAttribute("stroke-opacity", "0.6");

  // mouth
  let my = 20.5 + mouthDrop + (wearsTop ? 0.6 : 0);
  if (reading.props.includes("moustache")) my += 1.2;
  if (creature?.snout) my += 2.2;
  const k = loud ? 1.3 : 1;
  const mouth = make("g", { class: "nm-mouth" });
  const fillPath = (d, colour = ink) => make("path", { d, fill: colour });
  //: A plain face, and a happy one, smile the name's own way (toothy,
  //: lopsided, a big D, buck teeth, a gap); every other mood keeps its own.
  const ownSmile = reading.style?.smile || (mouthOpen ? "grin" : "smile");
  let mouthStyle = face ? (loud && face.loud ? face.loud : face.mouth) : ownSmile;
  if (reading.mood === "happy" && !loud) mouthStyle = ownSmile;
  if (mouthStyle === "cat3") mouthStyle = "cat";
  if (creature?.mouth === "cat" && (!face || ["smile", "grin"].includes(mouthStyle))) mouthStyle = "cat";
  if (creature?.beak || creature?.rings) mouthStyle = face && ["gasp", "o", "tongue"].includes(face.mouth) ? face.mouth : null;
  if (reading.props.includes("antenna") && !face && !creature) mouthStyle = "grille";
  if (flavours.includes("scream") && mouthStyle !== "o") mouthStyle = "gasp";
  const w = 7 * k;
  if (mouthStyle === "smile") {
    mouth.appendChild(stroke(`M${f(18 - w / 2)} ${f(my)}c${f(w * 0.29)} ${f(1.6 * k)} ${f(w * 0.71)} ${f(1.6 * k)} ${f(w)} 0`, 1.8));
  } else if (mouthStyle === "grin") {
    const r = 4.5 * (face ? k : 1);
    mouth.appendChild(fillPath(`M${f(18 - r)} ${f(my)}a${f(r)} ${f(3.4 * (face ? k : 1))} 0 0 0 ${f(r * 2)} 0z`));
    if (face) mouth.appendChild(fillPath(`M${f(18 - r * 0.55)} ${f(my + 2.1 * k)}q${f(r * 0.55)}-1.3 ${f(r * 1.1)} 0q${f(-r * 0.55)} 1.1 ${f(-r * 1.1)} 0z`, "#ff6b8a"));
  } else if (mouthStyle === "frown") {
    mouth.appendChild(stroke(`M${f(18 - w / 2)} ${f(my + 1.6)}c${f(w * 0.29)} ${f(-1.7 * k)} ${f(w * 0.71)} ${f(-1.7 * k)} ${f(w)} 0`, 1.8));
  } else if (mouthStyle === "teeth") {
    mouth.appendChild(make("rect", { x: 14, y: f(my - 0.4), width: 8, height: 3, rx: 1.2, fill: ink }));
    mouth.appendChild(stroke(`M14.6 ${f(my + 1.1)}h6.8M16.7 ${f(my - 0.2)}v2.6M19.3 ${f(my - 0.2)}v2.6`, 0.6, paper));
  } else if (mouthStyle === "flat") {
    mouth.appendChild(stroke(`M15 ${f(my + 0.8)}h6`, 1.7));
  } else if (mouthStyle === "o") {
    mouth.appendChild(make("ellipse", { cx: 18, cy: f(my + 1), rx: f(1.6 * k), ry: f(2 * k), fill: ink }));
  } else if (mouthStyle === "gasp") {
    mouth.appendChild(make("ellipse", { cx: 18, cy: f(my + 1.4), rx: f(2.3 * k), ry: f(3 * k), fill: ink }));
    mouth.appendChild(make("ellipse", { cx: 18, cy: f(my + 1.4 + 1.6 * k), rx: f(1.3 * k), ry: f(0.9 * k), fill: "#ff6b8a" }));
  } else if (mouthStyle === "yawn") {
    mouth.appendChild(make("ellipse", { cx: 18, cy: f(my + 1), rx: 1.4, ry: 1.8, fill: ink }));
  } else if (mouthStyle === "wavy") {
    mouth.appendChild(stroke(`M13.6 ${f(my + 0.8)}q1.47-1.4 2.93 0t2.93 0t2.93 0`, 1.4));
  } else if (mouthStyle === "smirk") {
    mouth.appendChild(stroke(`M14.8 ${f(my + 1.1)}q3.6 1.2 6.6-1.8`, 1.7));
  } else if (mouthStyle === "tongue") {
    mouth.appendChild(stroke(`M14.2 ${f(my)}c2.2 2 5.4 2 7.6 0`, 1.7));
    mouth.appendChild(make("path", { d: `M17.9 ${f(my + 1.2)}v1.4a1.6 1.6 0 0 0 3.2 0v-2.1z`, fill: "#ff6b8a", stroke: "#1c1c1a", "stroke-width": 0.4 }));
  } else if (mouthStyle === "toothy" || mouthStyle === "gap") {
    mouth.appendChild(fillPath(`M13.5 ${f(my)}a4.5 3.6 0 0 0 9 0z`));
    if (mouthStyle === "toothy") {
      mouth.appendChild(make("rect", { x: 14.2, y: f(my + 0.2), width: 7.6, height: 1.3, rx: 0.4, fill: "#ffffff" }));
    } else {
      mouth.appendChild(make("rect", { x: 14.4, y: f(my + 0.2), width: 3.2, height: 1.3, rx: 0.4, fill: "#ffffff" }));
      mouth.appendChild(make("rect", { x: 18.5, y: f(my + 0.2), width: 3.1, height: 1.3, rx: 0.4, fill: "#ffffff" }));
    }
  } else if (mouthStyle === "lopsided") {
    mouth.appendChild(stroke(`M14.2 ${f(my + 0.4)}q3.6 2.6 7.6-1.6`, 1.7));
  } else if (mouthStyle === "bigD") {
    mouth.appendChild(fillPath(`M12.8 ${f(my - 0.4)}h10.4a5.2 4.6 0 0 1-10.4 0z`));
    mouth.appendChild(fillPath(`M15.4 ${f(my + 2.8)}q2.6-1.6 5.2 0q-2.6 1.4-5.2 0z`, "#ff6b8a"));
  } else if (mouthStyle === "buck") {
    mouth.appendChild(stroke(`M14.5 ${f(my)}c2 1.6 5 1.6 7 0`, 1.8));
    for (const x of [16.9, 18.1]) mouth.appendChild(make("rect", { x, y: f(my + 1.05), width: 1.1, height: 1.5, rx: 0.3, fill: "#ffffff", stroke: "#1c1c1a", "stroke-width": 0.3 }));
  } else if (mouthStyle === "evil") {
    //: The villain's grin: a crescent wider than the face's own smile,
    //: turned up at both ends, with a saw of teeth along its top.
    const e = loud ? 1.2 : 1;
    mouth.appendChild(fillPath(`M${f(18 - 6 * e)} ${f(my - 1)}Q18 ${f(my + 6 * e)} ${f(18 + 6 * e)} ${f(my - 1)}Q18 ${f(my + 2.4 * e)} ${f(18 - 6 * e)} ${f(my - 1)}z`));
    const teeth = [];
    for (let i = 0; i <= 6; i += 1) teeth.push(`${f(18 - 4.2 * e + i * 1.4 * e)} ${f(my + 0.7 + (i % 2 ? 1.1 : 0) + Math.abs(i - 3) * -0.28)}`);
    mouth.appendChild(stroke(`M${teeth.join("L")}`, 0.6, paper));
  } else if (mouthStyle === "cat") {
    mouth.appendChild(stroke(`M15 ${f(my)}q1.5 1.7 3 0q1.5 1.7 3 0`, 1.4));
  } else if (mouthStyle === "grille") {
    mouth.appendChild(make("rect", { x: 14, y: f(my - 0.2), width: 8, height: 2.8, rx: 0.8, fill: ink }));
    mouth.appendChild(stroke(`M16 ${f(my)}v2.4M18 ${f(my)}v2.4M20 ${f(my)}v2.4`, 0.6, paper));
  }
  if (reading.props.includes("rednose")) {
    onFace.appendChild(make("circle", { cx: 18, cy: f(my - 2.4), r: 2, fill: "#e8364f", stroke: "#1c1c1a", "stroke-width": 0.4 }));
    onFace.appendChild(make("circle", { cx: 17.4, cy: f(my - 3), r: 0.55, fill: "#ffffff", opacity: 0.8 }));
  }
  if (creature?.nose) onFace.appendChild(make("ellipse", { cx: 18, cy: f(my - 2), rx: 1.5, ry: 1.05, fill: "#2b2a28" }));
  if (creature?.whiskers) {
    for (const side of [-1, 1]) onFace.appendChild(stroke(`M${f(18 + side * 5.5)} ${f(my - 1.2)}l${side * 3.4}-.8M${f(18 + side * 5.5)} ${f(my - 0.2)}l${side * 3.4}.5`, 0.6));
  }
  if (creature?.snout) {
    onFace.appendChild(make("ellipse", { cx: 18, cy: f(my - 2.6), rx: 3.2, ry: 2.2, fill: creature.snout, stroke: "#1c1c1a", "stroke-width": 0.4 }));
    for (const x of [16.9, 19.1]) onFace.appendChild(make("ellipse", { cx: x, cy: f(my - 2.6), rx: 0.55, ry: 0.8, fill: "#1c1c1a" }));
  }
  if (creature?.beak) {
    onFace.appendChild(make("path", { d: `M16.2 ${f(eyeY + 3)}h3.6l-1.8 2.9z`, fill: creature.beak, stroke: "#1c1c1a", "stroke-width": 0.4, "stroke-linejoin": "round" }));
  }
  if (mouth.childNodes.length) onFace.appendChild(mouth);
  if ((mutant?.fangs || reading.props.includes("fangs")) && mouthStyle) {
    for (const x of [16.2, 19.8]) {
      onFace.appendChild(make("path", { d: `M${f(x - 0.8)} ${f(my + 0.5)}l.8 2.1.8-2.1z`, fill: "#ffffff", stroke: "#1c1c1a", "stroke-width": 0.35, "stroke-linejoin": "round" }));
    }
  }

  // costumes that sit on the face
  if (reading.props.includes("moustache")) {
    onFace.appendChild(fillPath(`M18 ${f(my - 1.6)}c-1.3-1.5-4.1-1.4-5.5 1 2.1-.2 3.9 0 5.5-1zM18 ${f(my - 1.6)}c1.3-1.5 4.1-1.4 5.5 1-2.1-.2-3.9 0-5.5-1z`, "#2b2a28"));
  }
  if (reading.props.includes("glasses") && eyeStyle !== "shades") {
    for (const x of [L, R]) onFace.appendChild(make("circle", { cx: f(x), cy: f(eyeY), r: 3.1, fill: "#ffffff", "fill-opacity": 0.16, stroke: ink, "stroke-width": 0.9 }));
    onFace.appendChild(stroke(`M${f(L + 3.1)} ${f(eyeY)}q${f((R - L - 6.2) / 2)}-1.1 ${f(R - L - 6.2)} 0`, 0.9));
  }
  if (eyeStyle === "shades") {
    const lens = (x) => make("path", { d: `M${f(x - 3.1)} ${f(eyeY - 1.8)}h6.2v1.6a2.4 2.4 0 0 1-2.4 2.4h-1.4a2.4 2.4 0 0 1-2.4-2.4z`, fill: "#1c1c1a" });
    onFace.appendChild(lens(L));
    onFace.appendChild(lens(R));
    onFace.appendChild(stroke(`M${f(L + 3.1)} ${f(eyeY - 1.4)}H${f(R - 3.1)}`, 0.9, "#1c1c1a"));
    onFace.appendChild(stroke(`M${f(L - 2)} ${f(eyeY - 0.8)}l1.4 0`, 0.7, "rgba(255,255,255,0.85)"));
  }
  if (reading.props.includes("eyepatch")) {
    onFace.appendChild(stroke(`M${f(L - 5)} ${f(eyeY - 4.5)}Q18 ${f(eyeY - 3.2)} ${f(R + 5)} ${f(eyeY - 1)}`, 0.9, "#1c1c1a"));
    onFace.appendChild(make("ellipse", { cx: f(R), cy: f(eyeY), rx: 2.8, ry: 2.5, fill: "#1c1c1a" }));
  }

  // costumes on top
  const hatColour = palette[[6, 0, 2, 4].find((i) => palette[i] !== head && palette[i] !== ground)];
  if (reading.props.includes("hat")) {
    const hat = make("g", { class: "nm-hat" });
    hat.appendChild(make("path", { d: "M9.6 9.4L21.6-.6 26.4 9.4z", fill: hatColour, stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" }));
    hat.appendChild(make("ellipse", { cx: 18, cy: 9.6, rx: 10.6, ry: 1.9, fill: hatColour, stroke: "#1c1c1a", "stroke-width": 0.5 }));
    hat.appendChild(make("path", { d: "M19.6 3.2l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z", fill: "#edc949" }));
    onFace.appendChild(hat);
  }
  if (reading.props.includes("chefhat")) {
    const hat = make("g", { fill: "#f5f4ef", stroke: "#1c1c1a", "stroke-width": 0.5 });
    hat.appendChild(make("rect", { x: 12.4, y: 5.2, width: 11.2, height: 4.6, rx: 0.8 }));
    for (const [cx, cy, r] of [[13.6, 4.6, 3.2], [18, 3, 3.6], [22.4, 4.6, 3.2]]) hat.appendChild(make("circle", { cx, cy, r }));
    hat.appendChild(make("rect", { x: 12.9, y: 4.8, width: 10.2, height: 3.6, stroke: "none" }));
    onFace.appendChild(hat);
  }
  if (reading.props.includes("cowboy")) {
    const hat = make("g", { fill: "#9c755f", stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" });
    hat.appendChild(make("path", { d: "M11.8 9.4Q11.6 2.6 15.2 3.2Q18 4.8 20.8 3.2Q24.4 2.6 24.2 9.4z" }));
    hat.appendChild(make("path", { d: "M4.6 8.4Q18 14.2 31.4 8.4Q28.6 11.6 18 11.8Q7.4 11.6 4.6 8.4z" }));
    hat.appendChild(make("path", { d: "M12 8.2Q18 9.6 24 8.2", fill: "none", stroke: "#2b2a28", "stroke-width": 1.1 }));
    onFace.appendChild(hat);
  }
  if (reading.props.includes("partyhat")) {
    const cone = make("g", { class: "nm-partyhat" });
    cone.appendChild(make("path", { d: "M12.8 9.6L18.4.2L23.4 9.6z", fill: "#e15759", stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" }));
    cone.appendChild(stroke("M15.2 5.4l4.6 2M16.9 2.6l3 1.3", 1.1, "#ffd84a"));
    cone.appendChild(make("circle", { cx: 18.4, cy: 0.9, r: 1.6, fill: "#ffd84a", stroke: "#1c1c1a", "stroke-width": 0.4 }));
    onFace.appendChild(cone);
  }
  if (reading.props.includes("crown")) {
    onFace.appendChild(make("path", { d: "M11.6 9.6L11.1 3.6l3.7 3 3.2-4.4 3.2 4.4 3.7-3-.5 6z", fill: "#edc949", stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" }));
    onFace.appendChild(make("circle", { cx: 18, cy: 7.4, r: 0.9, fill: "#e15759" }));
  }
  if (reading.props.includes("halo")) {
    const halo = make("g", { class: "nm-halo", fill: "none" });
    halo.appendChild(make("ellipse", { cx: 18, cy: 3.4, rx: 6.4, ry: 1.9, stroke: "#1c1c1a", "stroke-width": 2.4 }));
    halo.appendChild(make("ellipse", { cx: 18, cy: 3.4, rx: 6.4, ry: 1.9, stroke: "#ffd84a", "stroke-width": 1.4 }));
    onFace.appendChild(halo);
  }
  if (reading.props.includes("horns")) {
    for (const side of [-1, 1]) {
      const x = (n) => f(18 + side * n);
      onFace.appendChild(make("path", { d: `M${x(6.4)} 9.2Q${x(9.4)} 5.4 ${x(7.6)} 1.6Q${x(5)} 5.6 ${x(3)} 7.6z`, fill: "#e15759", stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" }));
    }
  }
  if (reading.props.includes("antenna") || creature?.antenna) {
    const antenna = make("g", { class: "nm-antenna" });
    antenna.appendChild(stroke("M18 8.6V3.8", 1.1, "#1c1c1a"));
    antenna.appendChild(make("circle", { cx: 18, cy: 3.2, r: 1.6, fill: "#e15759", stroke: "#1c1c1a", "stroke-width": 0.4, class: "nm-bulb" }));
    onFace.appendChild(antenna);
  }
  if (reading.props.includes("headphones")) {
    onFace.appendChild(stroke("M8.6 16.5a9.4 9.4 0 0 1 18.8 0", 1.6, "#1c1c1a"));
    for (const x of [6.8, 26]) onFace.appendChild(make("rect", { x, y: 14.4, width: 3.2, height: 5.6, rx: 1.4, fill: hatColour, stroke: "#1c1c1a", "stroke-width": 0.5 }));
  }
  if (creature?.ears === "floppy") {
    for (const side of [-1, 1]) {
      const cx = 18 + side * 9.6;
      onFace.appendChild(make("ellipse", { cx, cy: 14.4, rx: 3.1, ry: 5.8, fill: earFill, transform: `rotate(${side * -16} ${cx} 10)` }));
    }
  }

  if (reading.props.includes("helmet")) {
    //: A glass bowl over the whole head, with the one highlight that makes
    //: a circle read as glass.
    onFace.appendChild(make("circle", { cx: 18, cy: 17.4, r: 13.4, fill: "#dff1ff", "fill-opacity": 0.18, stroke: "#dfe3e8", "stroke-width": 1.8 }));
    onFace.appendChild(stroke("M8.4 13.2a10.6 10.6 0 0 1 6-6.4", 1.2, "rgba(255,255,255,0.85)"));
  }

  // the extras that carry the joke
  const drop = (x, y, cls) =>
    make("path", { d: `M${f(x)} ${f(y)}q-1.4 2.1 0 3.1 1.4-1 0-3.1z`, fill: "#6cb8ff", stroke: "#1c1c1a", "stroke-width": 0.35, class: cls });
  const extras = make("g", { class: "nm-extras" });
  if (extrasList.includes("tear")) extras.appendChild(drop(L - 0.3, eyeY + 2, "nm-tear"));
  if (extrasList.includes("tear2")) extras.appendChild(drop(R + 0.3, eyeY + 2, "nm-tear nm-tear-late"));
  if (extrasList.includes("sweat")) extras.appendChild(drop(R + 4.2, eyeY - 6, "nm-sweat"));
  if (extrasList.includes("sweat2")) extras.appendChild(drop(L - 4.2, eyeY - 5, "nm-sweat nm-tear-late"));
  if (extrasList.includes("drool")) extras.appendChild(drop(20.2, my + 3.6, "nm-tear"));
  if (extrasList.includes("zz")) {
    extras.appendChild(stroke(`M${f(R + 1.8)} 6.4h2.4l-2.4 2.6h2.4`, 0.9, ink)).classList.add("nm-z");
    extras.appendChild(stroke(`M${f(R + 4.6)} 2.8h1.8l-1.8 2h1.8`, 0.8, ink)).classList.add("nm-z", "nm-z-late");
  }
  const star = (x, y, s, fill) =>
    make("path", { d: `M${f(x)} ${f(y - s)}Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)}Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}z`, fill, stroke: "#1c1c1a", "stroke-width": 0.3, class: "nm-spark" });
  if (extrasList.includes("spark")) {
    extras.appendChild(star(R + 4.4, eyeY - 6.2, 2.3, "#ffd84a"));
    extras.appendChild(star(L - 4.2, eyeY - 4.6, 1.4, "#ffd84a")).classList.add("nm-spark-late");
  }
  if (extrasList.includes("glint")) extras.appendChild(star(R + 2.6, eyeY - 1.8, 1.3, "#ffffff"));
  if (extrasList.includes("glint2")) extras.appendChild(star(L - 2.4, eyeY - 1.4, 1, "#ffffff")).classList.add("nm-spark-late");
  if (extrasList.includes("greenblush")) {
    for (const x of [L - 1, R + 1]) extras.appendChild(make("ellipse", { cx: f(x), cy: f(eyeY + 3.6), rx: 2, ry: 1.1, fill: "#59a14f", opacity: 0.55 }));
  }
  if (extrasList.includes("thermometer")) {
    const t = make("g", { class: "nm-thermo" });
    t.appendChild(stroke(`M${f(20.2)} ${f(my + 0.9)}l5.2-2.4`, 2.2, "#1c1c1a"));
    t.appendChild(stroke(`M${f(20.2)} ${f(my + 0.9)}l5.2-2.4`, 1.2, "#ffffff"));
    t.appendChild(make("circle", { cx: f(25.6), cy: f(my - 1.6), r: 1.1, fill: "#e8364f", stroke: "#1c1c1a", "stroke-width": 0.35 }));
    extras.appendChild(t);
  }
  if (extrasList.includes("bubble")) {
    extras.appendChild(make("circle", { cx: f(R + 3.8), cy: f(eyeY - 5), r: 1.3, fill: "#ffffff", "fill-opacity": 0.6, stroke: ink, "stroke-width": 0.4, class: "nm-z" }));
    extras.appendChild(make("circle", { cx: f(R + 5.4), cy: f(eyeY - 8), r: 0.9, fill: "#ffffff", "fill-opacity": 0.6, stroke: ink, "stroke-width": 0.4, class: "nm-z nm-z-late" }));
  }
  if (extrasList.includes("stars")) {
    extras.appendChild(star(11.4, 6.2, 1.7, "#ffd84a"));
    extras.appendChild(star(24.8, 4.8, 2, "#ffd84a")).classList.add("nm-spark-late");
    extras.appendChild(star(18.4, 3.2, 1.2, "#ffffff")).classList.add("nm-spark-late");
  }
  if (extrasList.includes("vein")) {
    extras.appendChild(stroke(`M${f(R + 2.6)} 6.2q.9.9 0 1.8M${f(R + 5)} 6.2q-.9.9 0 1.8M${f(R + 2.9)} 5.9q.9-.9 1.8 0M${f(R + 2.9)} 8.3q.9.9 1.8 0`, 0.9, "#e8364f")).classList.add("nm-vein");
  }
  if (extrasList.includes("heart")) {
    extras.appendChild(make("path", { d: `M${f(R + 4.4)} 8.6c-2-1.4-2.4-2.6-1.8-3.3.5-.6 1.4-.5 1.8.2.4-.7 1.3-.8 1.8-.2.6.7.2 1.9-1.8 3.3z`, fill: "#e8364f", class: "nm-heart" }));
  }
  if (extrasList.includes("question")) {
    const q = make("text", { x: f(R + 3), y: 9.6, "font-size": 8, "font-weight": 700, fill: ink, class: "nm-q", "font-family": "system-ui, sans-serif" });
    q.textContent = "?";
    extras.appendChild(q);
  }
  if (extras.childNodes.length) onFace.appendChild(extras);

  body.appendChild(onFace);

  // --- the hand, and what is in it ---
  if (reading.hand) {
    //: The character's own hand, in the head's colour with an ink outline,
    //: coming up at the lower right; what it holds stands behind the fist,
    //: so the fist reads as gripping it.
    const hand = make("g", { class: `nm-hand${reading.hand === "wave" ? " nm-wave" : ""}` });
    const line = { stroke: "#1c1c1a", "stroke-width": 0.5, "stroke-linejoin": "round" };
    const part = (tag, attrs) => hand.appendChild(make(tag, { ...line, ...attrs }));
    const skin = head;
    const fist = (x, y) => {
      part("rect", { x: f(x - 2.8), y: f(y - 2.2), width: 5.6, height: 4.6, rx: 1.8, fill: skin });
      hand.appendChild(stroke(`M${f(x - 0.9)} ${f(y - 2.1)}v1.1M${f(x + 0.9)} ${f(y - 2.1)}v1.1`, 0.4, "#1c1c1a"));
    };
    const cx = 27.4;
    const cy = 29.2;
    const kind = reading.hand;
    if (kind === "thumbsup") {
      part("rect", { x: f(cx - 2.8), y: f(cy - 6.4), width: 2.1, height: 4.8, rx: 1.05, fill: skin });
      fist(cx, cy);
    } else if (kind === "middlefinger") {
      part("rect", { x: f(cx - 0.9), y: f(cy - 7.6), width: 1.8, height: 6, rx: 0.9, fill: skin });
      fist(cx, cy);
    } else if (kind === "peace") {
      part("rect", { x: f(cx - 2.1), y: f(cy - 7.2), width: 1.6, height: 5.6, rx: 0.8, fill: skin, transform: `rotate(-13 ${f(cx - 1.3)} ${f(cy - 2)})` });
      part("rect", { x: f(cx + 0.5), y: f(cy - 7.2), width: 1.6, height: 5.6, rx: 0.8, fill: skin, transform: `rotate(13 ${f(cx + 1.3)} ${f(cy - 2)})` });
      fist(cx, cy);
    } else if (kind === "wave") {
      for (const [dx, tall] of [[-2.7, 3.4], [-1.35, 4], [0, 4.1], [1.35, 3.6]]) {
        part("rect", { x: f(cx + dx), y: f(cy - 2.6 - tall), width: 1.25, height: tall + 1, rx: 0.62, fill: skin });
      }
      part("rect", { x: f(cx - 2.9), y: f(cy - 3), width: 5.8, height: 5.2, rx: 1.9, fill: skin });
      hand.appendChild(stroke(`M${f(cx + 3.8)} ${f(cy - 6.6)}q1.2 1.6 0 3.2M${f(cx + 5.2)} ${f(cy - 7.6)}q1.9 2.6 0 5.2`, 0.6, "#1c1c1a"));
    } else if (kind === "beer") {
      part("path", { d: `M${f(cx - 0.8)} ${f(cy - 8.2)}v-2.6h1.6v2.6z`, fill: "#8a5a2b" });
      part("rect", { x: f(cx - 1.9), y: f(cy - 8.6), width: 3.8, height: 7.4, rx: 1.1, fill: "#8a5a2b" });
      part("rect", { x: f(cx - 0.95), y: f(cy - 11.7), width: 1.9, height: 1.1, rx: 0.3, fill: "#edc949" });
      part("rect", { x: f(cx - 1.9), y: f(cy - 7), width: 3.8, height: 2.2, fill: "#f5f4ef", "stroke-width": 0.3 });
      fist(cx, cy);
    } else if (kind === "wine") {
      hand.appendChild(stroke(`M${f(cx)} ${f(cy - 6)}V${f(cy - 1.2)}`, 0.9, "#1c1c1a"));
      part("path", { d: `M${f(cx - 2.5)} ${f(cy - 10.4)}h5q0 3.9-2.5 4.1-2.5-.2-2.5-4.1z`, fill: "#ffffff", "fill-opacity": 0.55 });
      hand.appendChild(make("path", { d: `M${f(cx - 2.3)} ${f(cy - 8.7)}h4.6q-.3 2.2-2.3 2.3-2-.1-2.3-2.3z`, fill: "#9b1b30" }));
      fist(cx, cy + 0.4);
    } else if (kind === "mug") {
      part("path", { d: `M${f(cx + 2.1)} ${f(cy - 6.4)}q2.4 0 2.4 1.9t-2.4 1.9`, fill: "none", "stroke-width": 0.9 });
      part("rect", { x: f(cx - 2.9), y: f(cy - 7.6), width: 5.2, height: 5.8, rx: 0.9, fill: "#f5f4ef" });
      hand.appendChild(make("rect", { x: f(cx - 2.5), y: f(cy - 7.2), width: 4.4, height: 1, fill: "#6b4a2f" }));
      const steam = stroke(`M${f(cx - 1.2)} ${f(cy - 8.4)}q-.8-1 0-2q.8-1 0-2M${f(cx + 0.9)} ${f(cy - 8.6)}q-.8-1 0-2`, 0.6, "#1c1c1a");
      steam.classList.add("nm-steam");
      hand.appendChild(steam);
      fist(cx - 0.3, cy + 0.6);
    } else if (kind === "sword") {
      part("path", { d: `M${f(cx - 0.7)} ${f(cy - 3.4)}V${f(cy - 14.4)}L${f(cx)} ${f(cy - 16)}L${f(cx + 0.7)} ${f(cy - 14.4)}V${f(cy - 3.4)}z`, fill: "#dfe3e8" });
      part("rect", { x: f(cx - 2.9), y: f(cy - 3.7), width: 5.8, height: 1.2, rx: 0.5, fill: "#b0703a" });
      fist(cx, cy);
    } else if (kind === "magnifier") {
      hand.appendChild(stroke(`M${f(cx - 0.2)} ${f(cy - 1.4)}L${f(cx - 2.2)} ${f(cy - 5.4)}`, 1.6, "#6b4a2f"));
      part("circle", { cx: f(cx - 3.4), cy: f(cy - 8), r: 2.9, fill: "#bfe3ff", "fill-opacity": 0.6, "stroke-width": 0.9 });
      hand.appendChild(stroke(`M${f(cx - 5)} ${f(cy - 8.6)}a1.8 1.8 0 0 1 1.4-1.3`, 0.6, "#ffffff"));
      fist(cx, cy);
    } else if (kind === "mic") {
      part("rect", { x: f(cx - 0.75), y: f(cy - 6.6), width: 1.5, height: 4.8, fill: "#2b2a28" });
      part("circle", { cx: f(cx), cy: f(cy - 8), r: 2.1, fill: "#8e9aa6" });
      hand.appendChild(stroke(`M${f(cx - 1.4)} ${f(cy - 8.4)}h2.8M${f(cx - 1.2)} ${f(cy - 7.4)}h2.4`, 0.4, "#1c1c1a"));
      fist(cx, cy);
    } else if (kind === "book") {
      part("path", { d: `M${f(cx - 4.4)} ${f(cy - 7.8)}q2.2-1.2 4.4 0v5.2q-2.2-1.2-4.4 0z`, fill: "#f5f4ef" });
      part("path", { d: `M${f(cx)} ${f(cy - 7.8)}q2.2-1.2 4.4 0v5.2q-2.2-1.2-4.4 0z`, fill: "#f5f4ef" });
      hand.appendChild(stroke(`M${f(cx - 3.6)} ${f(cy - 6.4)}q1.4-.6 2.8 0M${f(cx + 0.8)} ${f(cy - 6.4)}q1.4-.6 2.8 0M${f(cx - 3.6)} ${f(cy - 5)}q1.4-.6 2.8 0`, 0.35, "#1c1c1a"));
      hand.appendChild(stroke(`M${f(cx - 4.8)} ${f(cy - 2.2)}q2.4-1 4.8 0q2.4-1 4.8 0`, 1, "#4e79a7"));
      fist(cx, cy + 0.6);
    } else if (kind === "phone") {
      part("rect", { x: f(cx - 1.9), y: f(cy - 8.8), width: 3.8, height: 7, rx: 0.9, fill: "#2b2a28" });
      hand.appendChild(make("rect", { x: f(cx - 1.4), y: f(cy - 8.2), width: 2.8, height: 5.4, rx: 0.4, fill: "#76b7b2" }));
      fist(cx, cy);
    } else if (kind === "flower") {
      hand.appendChild(stroke(`M${f(cx)} ${f(cy - 2)}V${f(cy - 8)}`, 0.9, "#3f7f3a"));
      hand.appendChild(make("ellipse", { cx: f(cx + 1.2), cy: f(cy - 5), rx: 1.2, ry: 0.6, fill: "#59a14f", transform: `rotate(-30 ${f(cx + 1.2)} ${f(cy - 5)})` }));
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        part("circle", { cx: f(cx + Math.cos(a) * 1.5), cy: f(cy - 9.4 + Math.sin(a) * 1.5), r: 1.25, fill: "#ff9da7", "stroke-width": 0.35 });
      }
      part("circle", { cx: f(cx), cy: f(cy - 9.4), r: 0.9, fill: "#edc949", "stroke-width": 0.35 });
      fist(cx, cy);
    } else if (kind === "pizza") {
      part("path", { d: `M${f(cx - 3.2)} ${f(cy - 8.4)}Q${f(cx)} ${f(cy - 9.6)} ${f(cx + 3.2)} ${f(cy - 8.4)}L${f(cx)} ${f(cy - 1.8)}z`, fill: "#edc949" });
      hand.appendChild(stroke(`M${f(cx - 3.1)} ${f(cy - 8.3)}Q${f(cx)} ${f(cy - 9.5)} ${f(cx + 3.1)} ${f(cy - 8.3)}`, 1.3, "#d9a066"));
      for (const [dx, dy] of [[-1.2, -6.9], [1, -6.3], [-0.1, -4.6]]) hand.appendChild(make("circle", { cx: f(cx + dx), cy: f(cy + dy), r: 0.7, fill: "#e15759" }));
      fist(cx, cy);
    } else if (kind === "donut") {
      part("circle", { cx: f(cx), cy: f(cy - 6.2), r: 3.2, fill: "#d9a066" });
      hand.appendChild(make("circle", { cx: f(cx), cy: f(cy - 6.4), r: 2.6, fill: "#ff9da7" }));
      part("circle", { cx: f(cx), cy: f(cy - 6.2), r: 0.95, fill: ground, "stroke-width": 0.4 });
      for (const [dx, dy, c] of [[-1.6, -7.6, "#4e79a7"], [1.4, -7.8, "#edc949"], [1.6, -5.4, "#59a14f"], [-1.4, -5, "#ffffff"]]) {
        hand.appendChild(stroke(`M${f(cx + dx)} ${f(cy + dy)}l.5.3`, 0.45, c));
      }
      fist(cx, cy + 0.2);
    } else if (kind === "balloon") {
      hand.appendChild(stroke(`M${f(cx)} ${f(cy - 1.8)}q1-3-.2-5.4`, 0.5, "#1c1c1a"));
      const balloon = make("g", { class: "nm-balloon" });
      balloon.appendChild(make("ellipse", { cx: f(cx - 0.2), cy: f(cy - 10.6), rx: 2.8, ry: 3.4, fill: "#e15759", ...line }));
      balloon.appendChild(stroke(`M${f(cx - 1.6)} ${f(cy - 11.8)}a1.6 1.6 0 0 1 1-1.2`, 0.5, "#ffffff"));
      hand.appendChild(balloon);
      fist(cx, cy);
    } else if (kind === "tableflip") {
      //: (╯°□°)╯︵ ┻━┻ : both fists up at the head's shoulders, and the
      //: table already upside down and on its way.
      fist(7.2, 13.2);
      fist(28.8, 13.2);
      hand.appendChild(stroke("M9.6 8.4q2.8-2.8 5.6 0", 0.7, "#1c1c1a"));
      const table = make("g", { class: "nm-table" });
      const inner = make("g", { transform: "translate(21.4 6.4) rotate(-16)" });
      inner.appendChild(make("rect", { x: -5.4, y: -0.9, width: 10.8, height: 1.9, rx: 0.4, fill: "#9c755f", ...line }));
      inner.appendChild(make("rect", { x: -4.6, y: -4, width: 1.1, height: 3.2, fill: "#9c755f", ...line }));
      inner.appendChild(make("rect", { x: 3.5, y: -4, width: 1.1, height: 3.2, fill: "#9c755f", ...line }));
      table.appendChild(inner);
      hand.appendChild(table);
    }
    body.appendChild(hand);
  }
  svg.append(clip, sheen, group);
  return svg;
}
