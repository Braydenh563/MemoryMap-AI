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
// declares tables and functions; app.js, settings.js and the lazy bundles
// call `nameMark`/`nameMood` only from functions, never at parse time.

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
//:    "Alice" is always the same Alice: a plain face a quarter of the time,
//:    otherwise a friendly one (happy, calm, a little excited, cute). Never
//:    a costume or an animal: those only come from a word, so a seeded face
//:    never claims something about a name that the name did not say.
//:
//: **The design rules** (the owner, 2026-09-24: "refine the avatar
//: generation as it is still a little messy and I'm not happy with what is
//: generated when I put in my name 'Brayden' or 'Sushicraft563,
//: SushiLord'"). Each is enforced here or in `drawCharacter`, and pinned by
//: tests/test_name_mood.py:
//:
//: - **A plain first name is a clean default.** One hairstyle, one colour
//:   pair, a friendly face, no costume, no animal, nothing held, and at most
//:   one subtle accessory. Its look (masculine or feminine) is the Profile
//:   look for your own name or Settings, Appearance, Face looks; never
//:   guessed from the first name. With neither, the styles that read as
//:   either, and no accessory at all.
//: - **Words drive at most two visual cues**, chosen by salience: a species
//:   first, then what is worn and held in the order the name says it, then
//:   food. "Sushicraft563" holds a pickaxe with sushi in its hair;
//:   "SushiLord" wears a crown and holds sushi. Numbers only nudge the
//:   seeded variety (they are in the hash); the few that mean something
//:   (666, 404) lean the mood and add nothing to wear.
//: - **A hard budget**: one head item, one face item, one held item, one
//:   body item. A second claim on a slot loses to the first; accessories
//:   only fill a slot the words left free. Nothing is drawn over the eyes
//:   but eyewear, and a flavour ("wink", "cooked") is drawn only when it
//:   does not fight the mood for the same features, one at most.
//: - **A curated palette** (`NM_CHAR_PAIRS`): each character's body, hair and
//:   clothes come from one of a few pairs chosen to sit together, each
//:   checked for contrast on the light and the dark page.
//: - **Readable at 28px**: the head-only mark at that size and under draws
//:   the face and at most one cue that breaks the outline.
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
    uwu: "uwu owo nya nyaa",
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
    chick: "chick chicks chicken*",
    duck: "duck ducks duckling* quack*",
    bird: "bird birds birb* parrot* robin* sparrow* crow* raven* tweet*",
    hamster: "hamster* gerbil*",
    sheep: "sheep lamb lambs ewe wool* baa",
    cow: "cow cows moo cattle bull bulls",
    deer: "deer reindeer* stag doe fawn* moose elk",
    unicorn: "unicorn*",
    dragon: "dragon* wyvern*",
    dino: "dino* trex raptor* dinosaur*",
    shark: "shark* jaws",
    snake: "snake* serpent* python* viper* cobra* sssnake",
    axolotl: "axolotl*",
    crab: "crab crabs crabby lobster*",
    raccoon: "raccoon* trashpanda*",
    hedgehog: "hedgehog* hedgie spiky",
    sloth: "sloth*",
    capybara: "capybara* capy",
    bee: "bee bees bumble* honeybee*",
    mermaid: "mermaid* siren* merfolk",
    elf: "elf elves elven elvish",
    goblin: "goblin* gremlin*",
    troll: "troll trolls trolling ogre* shrek",
    gnome: "gnome* garden gnome",
    genie: "genie* djinn* jinn",
    mummy: "mummy mummies pharaoh*",
    zombie: "zombie* undead walker",
    minotaur: "minotaur*",
    medusa: "medusa* gorgon*",
    cyclops: "cyclops cyclopes",
    phoenix: "phoenix*",
    yeti: "yeti* bigfoot* sasquatch* abominable",
    penguin: "penguin* pingu",
    ghost: "ghost* spook* boo",
    alien: "alien* ufo martian*",
    octopus: "octopus* octo octopi squid* kraken* cthulhu*",
    bat: "bat bats",
  },
  //: Not every character has hands (the owner: "some can have feet or
  //: tentacles or wings some none at all"). None is the default.
  limbs: {
    tentacles: "octopus* octo octopi squid* kraken* cthulhu* tentacle* jellyfish* eldritch",
    feet: "walker* runner* hiker* dancer* jogger* feet foot* toes sneaker* stomp*",
  },
  props: {
    hat: "wizard* witch* mage magi magician* sorcer* warlock* druid* necroman* enchant* merlin gandalf",
    chefhat: "chef chefs cook cooks baker* cooking",
    glasses: "academic* professor* prof scholar* librarian* teacher* tutor* researcher* historian* editor* critic* analyst* philosoph* linguist* mathemat* boffin* smart",
    squareglasses: "nerd* geek* coder* programmer* developer* dev hipster* techie*",
    monocle: "monocle* posh aristocrat* sophisticat* distinguished",
    goggles: "scientist* chemist* physicist* pilot* aviator* steampunk* welder* inventor* engineer* lab",
    threed: "3d cinema* movie* movies film* retro",
    starglasses: "rockstar* popstar* glam* fabulous",
    heartglasses: "heartbreaker* flirt* casanova",
    visor: "cyber* vr futur* hacker* neon synthwave",
    eyepatch: "pirate* buccaneer* arr arrr",
    crown: "king kings queen* prince princes royal* emperor* empress* monarch* regal duke duchess lord lords",
    tiara: "princess* tiara* pageant*",
    tricorn: "pirate* buccaneer* captain* corsair*",
    cap: "cap caps baseball* skater* skate* sporty jock* athlete* coach* trucker*",
    beanie: "beanie* cozy cosy winter* snowy chilly toque",
    flowercrown: "cottagecore boho* flowerchild* springtime maypole",
    headband: "karate* dojo* sensei* kungfu judo* taekwondo* blackbelt martial* rocky",
    bandana: "bandana* biker* rebel* rambo outlaw* bandit*",
    bow: "bow bows ribbon* coquette",
    beard: "beard* bearded lumberjack* santa hagrid dwarf* grizzled",
    halo: "angel angels angelic saint* guardian* cherub* holy",
    horns: "devil* demon* imp fiend* satan*",
    antenna: "robot* bot bots android* cyborg* droid* machine* automaton* ai",
    moustache: "butler* gentleman gentlemen baron* mustach* moustach* walrus* sir",
    headphones: "headphone* headset* dj music* gamer* gaming podcast* audio* beats",
    fangs: "vampire* vamp dracula* nosferatu",
    rednose: "clown* rudolph reindeer*",
    cowboy: "cowboy* cowgirl* sheriff* yeehaw rodeo* ranch* wrangler*",
    partyhat: "party partying birthday* bday celebrat* fiesta*",
    ninjamask: "ninja*",
    helmet: "astronaut* cosmonaut* spaceman* rocketman",
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
    sword: "knight* warrior* samurai* sword* paladin* viking* gladiator* slayer*",
    magnifier: "detective* sherlock* investigat* sleuth* inspector*",
    mic: "karaoke* singer* rapper* mic vocal* diva",
    book: "book* reader* novel* poet* writer* author* bookworm* storyteller*",
    phone: "influencer* selfie* tiktok* texting doomscroll* insta* phone*",
    flower: "flower* garden* bloom* blossom* florist* daisy* sunflower* petal*",
    pizza: "pizza*",
    donut: "donut* doughnut*",
    sushi: "sushi* nigiri* sashimi* onigiri* maki",
    balloon: "balloon*",
    tableflip: "tableflip* flip flipping ragequit",
    controller: "gamer* gaming xbox* playstation* ps5 nintendo* switch controller* joystick* gamepad* esports",
    pickaxe: "craft* miner* mining minecraft* pickaxe* digger*",
    axe: "axe axes lumberjack* woodcutter*",
    hammer: "hammer* thor builder* carpenter* blacksmith* smith mjolnir",
    blaster: "blaster* sniper* gunner* gunslinger* shooter* fps pewpew gun guns trigger* laser*",
    bow: "archer* archery hunter* legolas robinhood katniss arrow*",
    wand: "wand* wizard* spellcaster* sorcer* harrypotter hogwarts",
    fishingrod: "fisher* fishing angler* fisherman",
    paintbrush: "artist* painter* paint* picasso bobross",
    spear: "spear* spartan* lancer* pike pikeman javelin* hoplite*",
    trident: "trident* poseidon neptune merman mermaid* aquaman",
  },
  //: What the shoulders wear (the owner: "regular girls or guys, office,
  //: street attire"). A word picks it; otherwise the style below does.
  outfits: {
    suit: "office* corporate* business* ceo cfo cto boss manager* lawyer* banker* accountant* consultant* intern* clerk* executive* suit suits",
    hoodie: "street* hoodie* hypebeast* drip urban* skater* rapper* gamer* hacker* coder*",
    dress: "dress* gown* prom ball elegant fancy",
  },
  //: A look the name asks for in so many words. Never guessed from a first
  //: name: "Alice" gets whatever her hash gives her, like everyone else.
  looks: {
    feminine: "girl girls girly gal gals queen* princess* lady ladies miss mrs ms she her woman women sis sister* mom mum mama mother* aunt* grandma* granny babe bestie* diva wifey bride* goddess* empress* witch* waifu",
    masculine: "guy guys dude* bro bros brother* king kings man men mr he him dad dads papa father* uncle* grandpa* lad lads chap gentleman gentlemen husband* groom* lord lords sir",
  },
  //: Which wings, when a name has them: seven kinds, each drawn its own way.
  wings: {
    angel: "angel angels angelic cherub* seraph* dove* pegasus* holy",
    bird: "bird birds birb* feather* parrot* robin*",
    phoenix: "phoenix*",
    dragon: "dragon* wyvern*",
    bat: "bat bats demon* gargoyle*",
    fairy: "fairy fairies faerie* pixie* sprite*",
    bee: "bee bees bumble* wasp* honeybee*",
    butterfly: "butterfl* moth moths",
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

//: **Your own face, your way** (the owner: "what if i dont like how the
//: avatar it looks on my name??"). The profile saves a `variant` (which take
//: on the name; each Shuffle moves it on) and per-part overrides. They apply
//: to the person's own name only (`userMarkSeed`, app.js), so renaming keeps
//: the choices and every other name keeps its own reading.
//: `null` means "what is saved" (`prefsCache.avatar_style`); the profile's
//: controls set a draft while the form is unsaved.
let nameMarkOwn = null;
const NAME_MARK_HAT_KINDS = ["hat", "chefhat", "cowboy", "partyhat", "crown", "tiara", "tricorn", "cap", "beanie", "flowercrown", "bandana", "headband"];
const NAME_MARK_EYEWEAR_KINDS = ["glasses", "squareglasses", "monocle", "goggles", "threed", "starglasses", "heartglasses", "visor"];

//: The slots a character has room for, one thing each (see the budget in
//: `nameMood`): what sits on the head, what sits on the face, what the
//: hand holds, and what the body wears.
const NAME_MARK_HEAD_KINDS = [...NAME_MARK_HAT_KINDS, "halo", "horns", "antenna", "headphones", "helmet", "bow", "sushiclip", "flowerclip"];
const NAME_MARK_FACE_KINDS = [...NAME_MARK_EYEWEAR_KINDS, "eyepatch", "ninjamask", "rednose", "moustache", "beard", "fangs", "stubble", "earrings", "lipstick"];
const NAME_MARK_FOODS = ["sushi", "pizza", "donut"];

function nameMarkSlot(kind, key) {
  if (kind === "animal") return "species";
  if (kind === "hand") return "held";
  if (kind === "prop" || kind === "accessory") return NAME_MARK_FACE_KINDS.includes(key) ? "face" : "head";
  return "body";
}

function setOwnNameMarkStyle(style) {
  nameMarkOwn = style && typeof style === "object" ? { ...style } : {};
}

function ownNameMarkStyle() {
  return { ...(nameMarkOwn ?? ((typeof prefsCache !== "undefined" && prefsCache?.avatar_style) || {})) };
}

function nameMarkOwnFor(name) {
  if (typeof userMarkSeed !== "function") return null;
  const own = String(userMarkSeed() || "").trim().toLowerCase();
  return own && String(name || "").trim().toLowerCase() === own ? ownNameMarkStyle() : null;
}

//: The look a generated face takes when its name gives no cue: null for
//: Mixed (the name's own hash decides, as before), or one of the two.
function nameMarkLookLean() {
  const lean = typeof appearancePref === "function" ? appearancePref("face-look", "mixed") : "mixed";
  return lean === "feminine" || lean === "masculine" ? lean : null;
}

//: Every generated face on the page drawn again (a change of Face looks):
//: every size read first, then every face replaced, so it costs one layout.
function nameMarkRepaintAll() {
  const faces = [...document.querySelectorAll(".name-mark[data-nm-seed]:not(.nm-atlas)")].filter((el) => !el.closest("#nm-buddy"));
  const sizes = faces.map((el) => Math.round(el.getBoundingClientRect().width) || 20);
  faces.forEach((el, i) => el.replaceWith(nameMark(el.dataset.nmSeed, sizes[i])));
  if (typeof repaintOwnFace === "function") repaintOwnFace();
}

function nameMood(name) {
  const raw = String(name || "").trim();
  const own = nameMarkOwnFor(raw);
  const variant = Number(own?.variant) || 0;
  const result = {
    mood: null, intense: false, animal: null, props: [], flavours: [], hand: null, limbs: null, mutant: null,
    wing: null, look: null, cues: [],
    style: { smile: "smile", eyes: "dot", features: [], nose: null, hair: null, hairColour: 0, accessories: [], outfit: null, outfitColour: 0 },
    source: "seed",
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
      wings: group(NAME_MOOD_LEXICON.wings),
      looks: group(NAME_MOOD_LEXICON.looks),
      outfits: group(NAME_MOOD_LEXICON.outfits),
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
  //: Where a group's keywords first hit the name. `at` ranks a whole-word
  //: match ahead of every glued one (the mood and the hand take the
  //: earliest); `order` is the plain place in the name, word by word and
  //: letter by letter, which is what ranks the visual cues below.
  //:
  //: The glued-name scan looks inside one word at a time: a prefix stem
  //: anywhere in it, an exact stem only where the word ends, so
  //: "sushilord" is a lord and "cooked" is not a cook (the owner's "ur
  //: cooked buddy" wore a chef's hat until this). Only stems of four
  //: letters and up, and only three letters or more into the word, which
  //: is where a second word glued on would start: "Janice" is not "nice"
  //: and "Clover" is not in love.
  const hitAt = (entries) => {
    let best = null;
    const take = (at, order) => {
      if (!best || at < best.at) best = { at, order };
    };
    for (const { stem, prefix } of entries) {
      forms.forEach((variants, index) => {
        for (const word of variants) {
          if (prefix ? word.startsWith(stem) : word === stem) take(index * 1000, index * 1000);
          else if (stem.length >= 4 && word.length > stem.length) {
            const off = prefix ? word.indexOf(stem) : word.endsWith(stem) ? word.length - stem.length : -1;
            if (off >= 3) take(500000 + index * 1000 + off, index * 1000 + off);
          }
        }
      });
      //: A keyword typed as two words is still the keyword: "rage quit",
      //: "good job", "screw you".
      if (stem.length >= 4 && forms.length > 1 && letters === stem) take(500000, 0);
    }
    return best;
  };
  //: The earliest match wins, by where it sits in the name: "sad happy cat"
  //: is sad, the way a reader takes the first adjective as the character.
  const find = (groups) => {
    let best = null;
    for (const { key, entries } of groups) {
      const hit = hitAt(entries);
      if (hit && (!best || hit.at < best.at)) best = { key, ...hit };
    }
    return best;
  };
  //: Every group that hits, in the order the name says them.
  const findAll = (groups) =>
    groups
      .map(({ key, entries }) => ({ key, ...hitAt(entries) }))
      .filter((hit) => hit.at !== undefined)
      .sort((a, b) => a.order - b.order || a.at - b.at);
  const moodHit = find(table.moods);
  result.mood = moodHit?.key || null;
  //: Every thing the words ask to be seen, with where they said it; the
  //: budget below keeps at most two (`result.cues`).
  const heard = [];
  const hear = (kind, key, order) => {
    if (key && !heard.some((h) => h.kind === kind && h.key === key)) heard.push({ kind, key, order });
  };
  for (const hit of findAll(table.hands)) hear("hand", hit.key, hit.order);
  const limbsHit = find(table.limbs);
  const wingHit = find(table.wings);
  result.look = find(table.looks)?.key || null;
  //: Your own face's chosen look wins; any other name that says nothing
  //: either way takes the look Settings, Appearance, Face looks leans to
  //: (the owner: "the male and female choice avatars generation"). A name
  //: that does say ("Queen Mary", "Dude") keeps its own.
  const ownLook = own && ["feminine", "masculine"].includes(own.look) ? own.look : null;
  if (ownLook) result.look = ownLook;
  else if (!result.look) result.look = nameMarkLookLean();
  const animalHit = find(table.animals);
  if (animalHit) hear("animal", animalHit.key, animalHit.order);
  if (wingHit) hear("wing", wingHit.key, wingHit.order);
  if (limbsHit) hear("limbs", limbsHit.key, limbsHit.order);
  for (const hit of findAll(table.props)) hear("prop", hit.key, hit.order);
  const outfitHit = find(table.outfits);
  if (outfitHit) hear("outfit", outfitHit.key, outfitHit.order);
  //: Flavours stack on the mood only where they do not fight it for the
  //: same features, and only one of them is drawn (the owner, on "Uwu wink
  //: wink ahhhhhh ur cooked buddy": "still a little messy"): a wink needs
  //: an open eye to close, a scream takes over the eyes and mouth so it
  //: only draws when no word set the mood, and a sweat drop or a blush
  //: sits beside anything. The first named that fits wins.
  const flavoursHeard = findAll(table.flavours).map((hit) => hit.key);
  if (/;-?\)/.test(raw) && !flavoursHeard.includes("wink")) flavoursHeard.push("wink");
  const shutEyes = ["happy", "sleepy", "calm", "hungry", "laughing", "uwu", "love", "dead", "dizzy", "starstruck", "greedy", "cool"];
  const fits = {
    wink: () => !shutEyes.includes(result.mood),
    scream: () => !moodHit,
    doomed: () => true,
    blush: () => true,
  };
  result.flavours = flavoursHeard.filter((flavour) => fits[flavour]?.()).slice(0, 1);
  //: (╯°□°)╯︵ ┻━┻ has no letters at all, and needs none.
  const flipped = /┻━+┻|╯°□°/.test(raw);
  if (flipped) hear("hand", "tableflip", -2);
  const emojiHands = [
    [/\u{1F44D}/u, "thumbsup"], [/\u{1F595}/u, "middlefinger"], [/✌/u, "peace"], [/\u{1F44B}/u, "wave"],
    [/[\u{1F37A}\u{1F37B}]/u, "beer"], [/[\u{1F377}\u{1F942}]/u, "wine"], [/☕/u, "mug"],
    [/[⚔\u{1F5E1}]/u, "sword"], [/[\u{1F50D}\u{1F50E}]/u, "magnifier"], [/\u{1F3A4}/u, "mic"],
    [/[\u{1F4DA}\u{1F4D6}]/u, "book"], [/\u{1F4F1}/u, "phone"], [/[\u{1F338}\u{1F339}\u{1F337}\u{1F33B}]/u, "flower"],
    [/\u{1F355}/u, "pizza"], [/\u{1F369}/u, "donut"], [/\u{1F388}/u, "balloon"], [/\u{1F363}/u, "sushi"],
    [/\u{1F3AE}/u, "controller"], [/⛏/u, "pickaxe"], [/\u{1FA93}/u, "axe"], [/\u{1F528}/u, "hammer"],
    [/\u{1F52B}/u, "blaster"], [/\u{1F3F9}/u, "bow"], [/\u{1FA84}/u, "wand"], [/\u{1F3A3}/u, "fishingrod"],
    [/[\u{1F58C}\u{1F3A8}]/u, "paintbrush"],
  ];
  if (!heard.some((h) => h.kind === "hand")) {
    for (const [pattern, hand] of emojiHands) {
      if (pattern.test(raw)) {
        hear("hand", hand, 900000);
        break;
      }
    }
  }
  //: Nobody flips a table calmly.
  if (heard.some((h) => h.key === "tableflip")) {
    result.mood = "angry";
    result.intense = true;
  }
  result.intense = result.intense || forms.some((variants) => variants.some((word) => table.intensifiers.has(word)));
  if (result.mood || heard.length) result.source = "words";

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
  if (!heard.some((h) => h.kind === "animal")) {
    for (const [pattern, animal] of emojiCreatures) {
      if (pattern.test(raw)) {
        hear("animal", animal, 900000);
        break;
      }
    }
  }
  const emojiProps = [
    [/\u{1F916}/u, "antenna"], [/\u{1F451}/u, "crown"], [/\u{1F9D9}/u, "hat"], [/\u{1F913}/u, "glasses"],
    [/\u{1F608}/u, "horns"], [/\u{1F921}/u, "rednose"], [/\u{1F9DB}/u, "fangs"], [/\u{1F920}/u, "cowboy"],
    [/\u{1F973}/u, "partyhat"], [/\u{1F977}/u, "ninjamask"], [/\u{1F97D}/u, "goggles"], [/\u{1F9D0}/u, "monocle"],
  ];
  emojiProps.forEach(([pattern, prop], i) => {
    if (pattern.test(raw)) hear("prop", prop, 900001 + i);
  });
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
  //: A number a handle carries only nudges the seeded variety (it is in
  //: the hash); the few that mean something lean the mood, and none of them
  //: adds a thing to wear (the owner: "Sushicraft563").
  const numbers = { 666: "sly", "007": "cool", 404: "confused", 1337: "sly", 9000: "excited", 420: "calm" };
  for (const word of words) {
    if (!numbers[word]) continue;
    hint(numbers[word]);
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
  } else if (result.source === "seed" && (heard.length || result.intense)) {
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
  if (!result.mood && !heard.some((h) => h.kind === "animal" || h.kind === "prop") && letters.length >= 3) {
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
      if (result.limbs === "wings-bug") result.wing = ["fairy", "bee", "butterfly"][pick(3)];
      if (result.limbs === "wings-bat") result.wing = ["bat", "dragon"][pick(2)];
      result.source = "nonsense";
    }
  }

  //: **The budget** (the owner: "refine the avatar generation as it is
  //: still a little messy ... 'Sushicraft563', 'SushiLord'"). What the
  //: words asked to be seen is ranked by salience (a species first, then
  //: the things worn and held in the order the name says them, then food)
  //: and at most two are kept, one per slot: one head item, one face
  //: item, one held item, one body item (an outfit a word names, wings,
  //: feet, tentacles). A second claim on a full slot is dropped, except
  //: sushi, which goes in the hair as a clip when the hand is already
  //: full. So "Sushicraft563" holds a pickaxe with sushi in its hair,
  //: "SushiLord" wears a crown and holds sushi, and a handle that names
  //: five costumes wears two of them. Wings or tentacles that the species'
  //: own word brought ("Busy bee", "Kraken") are the species, not a cue.
  const species = heard.find((h) => h.kind === "animal") || null;
  const implied = (h) => species && (h.kind === "wing" || h.kind === "limbs") && h.order === species.order;
  const ranked = heard
    .filter((h) => !implied(h))
    .map((h) => ({ ...h, slot: nameMarkSlot(h.kind, h.key), rank: h.kind === "animal" ? 0 : h.kind === "hand" && NAME_MARK_FOODS.includes(h.key) ? 2 : 1 }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order);
  const taken = {};
  const kept = [];
  for (const cue of ranked) {
    if (kept.length >= 2) break;
    if (taken[cue.slot]) {
      if (cue.key === "sushi" && !taken.head) {
        taken.head = { ...cue, kind: "prop", key: "sushiclip", slot: "head" };
        kept.push(taken.head);
      }
      continue;
    }
    taken[cue.slot] = cue;
    kept.push(cue);
  }
  result.animal = taken.species?.key || null;
  result.props = kept.filter((c) => c.kind === "prop").map((c) => c.key);
  result.hand = taken.held?.key || null;
  result.cues = kept.map((c) => c.key);
  if (!result.mutant) {
    const worn = (kind) => kept.find((c) => c.kind === kind)?.key || heard.find((h) => h.kind === kind && implied(h))?.key || null;
    result.wing = worn("wing");
    result.limbs = worn("limbs");
    const wingLimbs = { angel: "wings-feather", bird: "wings-feather", dragon: "wings-bat", bat: "wings-bat", fairy: "wings-bug", bee: "wings-bug", butterfly: "wings-bug" };
    if (result.wing && !result.limbs) result.limbs = wingLimbs[result.wing];
  }
  const wornOutfit = kept.find((c) => c.kind === "outfit")?.key || null;

  //: Some creatures come with a temperament when the name gives none.
  const temperament = {
    sloth: "sleepy", capybara: "calm", shark: "sly", snake: "sly", hedgehog: "nervous",
    goblin: "sly", troll: "angry", zombie: "sick", mummy: "sleepy", medusa: "evil", genie: "happy", gnome: "happy",
  };
  if (!result.mood && temperament[result.animal]) result.mood = temperament[result.animal];

  //: Layer four: the name's own hash picks a personality. FNV-1a, the same
  //: family `nameMark` uses, seeded differently so the two draws are
  //: independent of each other. Only friendly ones (the owner, on his own
  //: name: a plain name gets "a clean, appealing default character"): plain,
  //: happy, calm, a little excited or cute. Never sly, sleepy, nervous,
  //: lovestruck or in sunglasses, which read as a claim about a person that
  //: their name never made.
  if (!result.mood) {
    let h = (2166136261 ^ 0x9e3779b9 ^ Math.imul(variant, 0x27d4eb2d)) >>> 0;
    for (const ch of raw.toLowerCase()) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h ^= h >>> 15;
    h = Math.imul(h, 2246822507) >>> 0;
    h ^= h >>> 13;
    const pool = [null, null, "happy", "happy", "calm", "calm", "excited", "cute"];
    result.mood = pool[(h >>> 0) % pool.length];
  }
  //: **The face's own style**, for every name: which smile, which small
  //: features (the owner: "there can be variations of types of smiles and
  //: other features as well"). A third hash of the name, so it is stable
  //: and independent of both the colours and the personality.
  let sh = (2166136261 ^ 0x85ebca6b ^ Math.imul(variant, 0x165667b1)) >>> 0;
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
  const smiles = ["smile", "grin", "toothy", "lopsided", "bigD", "cat3", "smile", "grin"];
  result.style.smile = smiles[roll(smiles.length)];
  //: One small feature at most: freckles, a beauty mark or a blush.
  const feature = [null, null, "freckles", "blush", "mole", null, "freckles", "blush"][roll(8)];
  if (feature) result.style.features.push(feature);
  result.style.nose = [null, null, "dot", "button"][roll(4)];
  result.style.eyes = ["dot", "dot", "oval", "anime", "button", "starry", "dot", "sparkle"][roll(8)];
  //: Hair (the owner: "some feminine ones definitely (a lot more ones), and
  //: masculine ones as well"), always one style: a bald bean read as
  //: unfinished. The look decides the pool, and the look is never guessed
  //: from a first name: it is a word the name says ("Queen", "Dude"), your
  //: own Profile look, or Settings, Appearance, Face looks. With none of
  //: those (Mixed), the styles that read as either: short, curly, a quiff,
  //: spikes, a bob, a ponytail.
  const feminineHair = ["long", "pigtails", "buns", "bob", "ponytail", "long", "curly", "bob"];
  const masculineHair = ["short", "spiky", "quiff", "buzz", "short", "curly"];
  const anyHair = ["short", "curly", "bob", "quiff", "ponytail", "spiky"];
  const pool = result.look === "feminine" ? feminineHair : result.look === "masculine" ? masculineHair : anyHair;
  result.style.hair = pool[roll(pool.length)];
  //: Which of the colour pair's hair tones (`NM_CHAR_PAIRS`, four each).
  result.style.hairColour = roll(4);
  //: At most one subtle accessory, and only while the words left room
  //: (fewer than two cues) and its slot is free: earrings, a flower clip or
  //: a bow for a feminine look, light stubble for a masculine one, nothing
  //: for Mixed. A beard, a moustache or lipstick is a costume, which only a
  //: word asks for.
  if (result.look === "feminine") result.style.features.push("lashes");
  const bits = result.look === "feminine" ? ["earrings", "flowerclip", "bow", null] : result.look === "masculine" ? ["stubble", null, null] : [null];
  const bit = bits[roll(bits.length)];
  if (bit && kept.length < 2 && !taken[nameMarkSlot("accessory", bit)]) result.style.accessories.push(bit);
  //: Everyday clothes for everyone a word does not dress: a T-shirt, a
  //: hoodie, a shirt and tie, a blazer, a jumper, a scoop neck with a
  //: necklace. The pool leans the way the hair does.
  const feminineWear = ["scoop", "scoop", "tee", "sweater", "blazer", "hoodie"];
  const masculineWear = ["tee", "hoodie", "collar", "blazer", "sweater", "suit"];
  const anyWear = ["tee", "hoodie", "scoop", "collar", "sweater", "blazer", "tee", "hoodie"];
  const wear = result.look === "feminine" ? feminineWear : result.look === "masculine" ? masculineWear : anyWear;
  result.style.outfit = wornOutfit || wear[roll(wear.length)];
  //: Which of the colour pair's two cloth tones.
  result.style.outfitColour = roll(2);
  //: The person's own overrides, last, so they win over every reading.
  //: A key the drawing code does not know is ignored rather than drawn.
  //: The budget's one-per-slot still holds: a chosen hat replaces whatever
  //: else sat on the head, chosen eyewear whatever sat on the face.
  if (own) {
    const pick = (value, known) => (value === "none" ? "none" : known.includes(value) ? value : "");
    const mood = pick(own.mood, Object.keys(NAME_MOOD_LEXICON.moods).concat(["dizzy", "uwu", "laughing", "unimpressed"]));
    if (mood) result.mood = mood === "none" ? null : mood;
    const hair = pick(own.hair, ["long", "bob", "pigtails", "buns", "ponytail", "curly", "short", "spiky", "quiff", "buzz"]);
    if (hair) result.style.hair = hair === "none" ? null : hair;
    const outfit = pick(own.outfit, ["tee", "hoodie", "scoop", "collar", "sweater", "blazer", "suit", "dress"]);
    if (outfit) result.style.outfit = outfit === "none" ? null : outfit;
    for (const [key, kinds, slot] of [["hat", NAME_MARK_HAT_KINDS, NAME_MARK_HEAD_KINDS], ["eyewear", NAME_MARK_EYEWEAR_KINDS, NAME_MARK_FACE_KINDS]]) {
      const chosen = pick(own[key], kinds);
      if (!chosen) continue;
      result.props = result.props.filter((prop) => !slot.includes(prop));
      result.style.accessories = result.style.accessories.filter((one) => !slot.includes(one));
      if (chosen !== "none") result.props.push(chosen);
    }
    const hand = pick(own.hand, Object.keys(NAME_MOOD_LEXICON.hands));
    if (hand) result.hand = hand === "none" ? null : hand;
  }
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
  hungry: { eyes: "sparkle", mouth: "yum", extras: ["blush"], loud: "tongue", louder: ["drool"] },
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
//: the name's own colour pair, so two cats still differ.
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
  bird: { beak: "#f28e2c", tuft: true, wing: "bird", limbs: "wings-feather" },
  duck: { head: "#f5f4ef", bill: "#f28e2c", limbs: "feet", foot: "#f28e2c", tuft: true },
  hamster: { head: "#e8b27a", ears: "round", earSize: 3, inner: "#ff9da7", cheeks: "#f7dcc2" },
  sheep: { head: "#4a4441", wool: "#f5f4ef", ears: "side", ear: "#4a4441" },
  cow: { head: "#f5f4ef", spots: "#2b2a28", snout: "#ffb3c1", ears: "side", ear: "#f5f4ef", smallHorns: "#e8dcc0" },
  deer: { head: "#b0703a", ears: "pointy", antlers: "#6b4a2f", muzzle: "#e8c9a4", nose: true },
  unicorn: { head: "#f5f4ef", ears: "pointy", unihorn: true, mane: "rainbow" },
  dragon: { head: "#59a14f", smallHorns: "#e8dcc0", wing: "dragon", limbs: "wings-bat", nostrils: true },
  dino: { head: "#8cd17d", spikes: "#59a14f", nostrils: true },
  shark: { head: "#7a8fa6", fin: true, muzzle: "#f5f4ef", mouth: "evil" },
  snake: { head: "#59a14f", tongue: true, scales: true },
  axolotl: { head: "#ff9da7", gills: "#e8364f" },
  crab: { head: "#e15759", stalks: true, claws: true },
  raccoon: { head: "#8e9aa6", ears: "pointy", bandit: "#2b2a28", muzzle: "#f5f4ef" },
  hedgehog: { head: "#d9b38c", quills: "#6b4a2f", nose: true },
  sloth: { head: "#9c755f", patches: "#5a4030", muzzle: "#d9b38c" },
  capybara: { head: "#a0714f", ears: "round", earSize: 2.4, muzzle: "#8a5f40", nose: true },
  bee: { head: "#edc949", beeStripes: true, antennae: true, wing: "bee", limbs: "wings-bug" },
  mermaid: { human: true, hairFixed: "long", hairTone: "#3fb8a8", shell: true, limbs: "tail" },
  elf: { human: true, sideEars: 1 },
  goblin: { head: "#8cd17d", sideEars: 1.6, nose: true },
  troll: { head: "#7fa06a", tusks: true, bigNose: true, sideEars: 0.8 },
  gnome: { human: true, gnomeHat: true, beard: "#f5f4ef", bigNose: true },
  genie: { head: "#59a9e8", topknot: "#2b2a28", earrings: true },
  mummy: { head: "#d8d0bc", bandages: true },
  zombie: { head: "#9bb58a", stitches: true },
  minotaur: { head: "#8a5a2b", bullHorns: true, noseRing: true, muzzle: "#b0703a" },
  medusa: { head: "#8cd17d", snakeHair: "#3f7f3a" },
  cyclops: { head: "#b3a0d6", oneEye: true },
  phoenix: { head: "#f28e2c", beak: "#edc949", flameCrest: true, wing: "phoenix", limbs: "wings-feather" },
  yeti: { head: "#f5f4ef", wool: "#e8eef5", mask: "#9fb8d0" },
  bat: { head: "#6b5b73", ears: "pointy", limbs: "wings-bat", wing: "bat", inner: "#ff9da7" },
};

//: Which colour pairs (`NM_CHAR_PAIRS`) each mood leans to, when the name
//: said the mood out loud (a seeded mood keeps the name's own pair):
//: grumpy is coral, gloomy is sky, sick is mint.
const NAME_MARK_MOOD_GROUNDS = {
  happy: [4, 0, 5], excited: [4, 5, 0], sad: [1, 7, 3], angry: [5], dramatic: [3, 6, 5],
  surprised: [4, 1, 7], sleepy: [3, 1], nervous: [2, 7, 4], sly: [3, 2], calm: [2, 7, 1],
  serious: [1, 3], confused: [7, 3, 2], hungry: [0, 4, 5], cool: [1, 7], love: [6, 5],
  laughing: [4, 0], unimpressed: [1, 3], dizzy: [7, 3, 6], uwu: [6, 3], evil: [3, 5],
  sick: [2], dead: [3, 1], starstruck: [4, 6], cute: [6, 0, 3], drunk: [5, 6], greedy: [4, 2],
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
  sushiclip: "sushi in its hair", tricorn: "a pirate hat", tiara: "a tiara", monocle: "a monocle",
};

const NAME_MARK_HAND_WORDS = {
  thumbsup: "giving a thumbs up", middlefinger: "flipping you off", peace: "throwing a peace sign",
  wave: "waving", beer: "with a beer", wine: "with a glass of wine", mug: "with a hot drink",
  sword: "with a sword", magnifier: "with a magnifying glass", mic: "with a microphone",
  book: "with a book", phone: "on their phone", flower: "with a flower", pizza: "with pizza",
  donut: "with a donut", balloon: "with a balloon", tableflip: "flipping a table",
  controller: "with a controller", pickaxe: "with a pickaxe", axe: "with an axe", hammer: "with a hammer",
  blaster: "with a blaster", bow: "with a bow and arrow", wand: "with a wand", fishingrod: "with a fishing rod",
  paintbrush: "with a paintbrush", spear: "with a spear", trident: "with a trident", sushi: "with sushi",
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
//: Colours are one of `NM_CHAR_PAIRS` (body, hair and cloth chosen to sit
//: together), or a creature's fixed coat. The features are ink or white by the head's own luminance, so
//: a face never vanishes into a light head. Decorative (`aria-hidden`): the
//: name beside it is what a screen reader says; the `<title>` is for a
//: pointer's tooltip.
let nameMarkSerial = 0;

//: **Only faces on screen move.** In "Always" mode a long persona list or
//: chat would otherwise animate every face in it, seen or not (the owner:
//: "make sure all the avatar ... animations and rendering are very light
//: weight"). One shared observer marks the visible ones, and the CSS only
//: animates a marked face. Hover mode needs none of this: a hovered face is
//: on screen by definition.
let nameMarkObserver = null;
//: The same faces as `[data-nm-on]`, kept as a set so the pointer-follow
//: frame below reads them without a document-wide `querySelectorAll` per
//: frame (INBOX 424: that query was the largest cost of a graph drag).
const nameMarkOnScreen = new Set();
function watchNameMark(svg) {
  //: Faces under 28px (a chat bubble's corner mark, a picker's glyph) are
  //: never watched: no always-on loop, no pointer-follow. At that size the
  //: motion is noise and a long chat has hundreds of them (the owner: "i
  //: dont think the really small faces on the message bubble corners should
  //: move even if it is selected as that might be too heavy"). Hover still
  //: wakes one.
  if ((Number(svg.dataset.nmSize || svg.getAttribute("width")) || 0) < 28) return;
  if (typeof IntersectionObserver !== "function") {
    svg.dataset.nmOn = "";
    nameMarkOnScreen.add(svg);
    nameMarkKeyboard(svg);
    return;
  }
  if (!nameMarkObserver) {
    nameMarkObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) nameMarkOnScreen.add(entry.target);
        else nameMarkOnScreen.delete(entry.target);
        if (entry.isIntersecting) entry.target.dataset.nmOn = "";
        if (entry.isIntersecting) nameMarkKeyboard(entry.target);
        else delete entry.target.dataset.nmOn;
        if (!entry.target.isConnected) nameMarkObserver.unobserve(entry.target);
      }
    });
  }
  nameMarkObserver.observe(svg);
}

//: **A face you can reach from the keyboard** (INBOX 425 h): one that is not
//: inside a control takes a tab stop and says what Enter does; one inside a
//: control (the Settings head button) stays the control's decoration.
function nameMarkKeyboard(face) {
  if (face.dataset.nmKb) return;
  face.dataset.nmKb = "1";
  if (!face.isConnected || face.closest("button, a, [role='button'], label, select, summary, #nm-buddy, .nm-viewer")) return;
  face.tabIndex = 0;
  face.setAttribute("role", "button");
  face.removeAttribute("aria-hidden");
  face.setAttribute("aria-label", `${face.dataset.nmSeed || "Atlas"}: open the large view`);
}

//: **Atlas's own face** lives in atlas.js, loaded straight after this file:
//: a character designed for it (`atlasDraw`), registered through
//: `registerCharacter` below, with its moods (`setAtlasMood`,
//: `atlasRestingMood`) beside it. This name stays for the callers that ask
//: for Atlas directly (the welcome, `nameMark`'s fallback).
function atlasMark(size = 20, mood) {
  return atlasDraw(size, mood);
}

// --- the character interface -----------------------------------------------------
//: **One way in to every face** (INBOX 425; so a renderer can be swapped
//: without touching a call site). `characterFor(seed)` answers a
//: *character*:
//:
//:   {
//:     kind:    "atlas" | "generated" | a registered renderer's own name,
//:     seed:    the name it was drawn for,
//:     mark(size):   an <svg class="name-mark"> head-only mark, for lists,
//:                   chat bubbles, pickers and heads (any size; under 40px
//:                   it is always head-only, and under 28px it never moves,
//:                   see `watchNameMark`),
//:     figure():     the full character for the companion and the large
//:                   view: an element laid out in a 64 by 92 px box (the
//:                   companion's own; the viewer scales it), whose parts
//:                   carry the classes below so the companion's behaviours
//:                   can act them out,
//:     poses:   the poses it can take (see below),
//:     moods:   the moods it can show (Atlas: calm, thinking, happy,
//:              surprised, sleepy; a generated face: its reading's mood),
//:   }
//:
//: **The parts a figure must carry**, all transform/opacity only:
//:   `.nm-buddy-head` (holding the head's `.name-mark`, whose `.nm-eyes`
//:   are moved by `--nm-lx`/`--nm-ly` and whose `.nm-blinks` close),
//:   `.nmb-torso`, `.nmb-arm-l`/`.nmb-arm-r` (resting arms, turning at the
//:   shoulder), `.nmb-hold` (both arms raised, for hanging, stretching and
//:   cheering; `.nmb-hold-l`/`.nmb-hold-r` each), `.nmb-leg-l`/`.nmb-leg-r`
//:   (turning at the hip). Geometry, in the 64 by 92 box: the head's top at
//:   0, the seat at 72 (`NMB_SEAT`), the soles at 90 (`NMB_FEET`), the
//:   raised hands at 5 once dropped by `NMB_DROP` (12) when hanging.
//:
//: **What the companion sets on its `#nm-buddy`**, for a figure's CSS:
//:   `data-pose`  stand | sit | hang | float | lean
//:   `data-legs`  "" | tuck (sitting where dangling legs would cover content)
//:   `data-turn`  "" | l | r (a three-quarter turn)
//:   classes      `nmb-act-<name>` for the behaviour running (blink, look,
//:                turn, glance, stretch, yawn, nap, hop, wave, scratch,
//:                dangle, kick, peek, swing, sloth, onehand, feet, emerge,
//:                cheer, startle, land), and the states `nmb-walking`,
//:                `nm-buddy-dragging`, `nmb-think`, `nmb-watch`,
//:                `nmb-sleep`, `nmb-duck`, `nmb-arrive`.
//:
//: **Prop slots**, each a group of class `nmp nmp-<name>` the figure draws
//: hidden (the CSS shows it while the class in brackets is on `#nm-buddy`):
//:   head-top  `nmp-headphones` (`nmb-music`), `nmp-nightcap` (`nmb-night`)
//:   face      `nmp-glasses` (`nmb-reading`), inside `.nm-buddy-head`
//:   hand-r    `nmp-note` (`nmb-act-carry`, a saved note),
//:             `nmp-bell` (`nmb-act-bell`), `nmp-lantern` (`nmb-act-lantern`,
//:             with an `nmp-lantern-glow`), inside `.nmb-arm-r`
//:   hand-l    `nmp-cable` (`nmb-offline`), inside `.nmb-arm-l`
//: Other states a figure can answer: `nmb-drowsy`, `nmb-nod` (with
//: `nmb-watch`), `nmb-act-wake`.
//:
//: A renderer registers with `registerCharacter({ name, matches(seed),
//: make(seed) })`; the latest registered that matches wins, and the built-in
//: two (Atlas, then the generated faces) answer everything else.
const CHARACTER_RENDERERS = [];

function registerCharacter(renderer) {
  if (renderer && typeof renderer.matches === "function" && typeof renderer.make === "function") {
    CHARACTER_RENDERERS.unshift(renderer);
  }
}

function characterRendererFor(seed) {
  for (const renderer of CHARACTER_RENDERERS) {
    try {
      if (renderer.matches(seed)) return renderer;
    } catch (e) {
      // A renderer that throws on a name gives it back to the built-in ones.
    }
  }
  return null;
}

function isAtlasSeed(seed) {
  const named = String(seed || "").trim().toLowerCase();
  const ai = typeof aiNameNow === "function" ? String(aiNameNow() || "").toLowerCase() : "atlas";
  return Boolean(named) && (named === ai || named === "atlas");
}

function characterFor(seed) {
  const own = characterRendererFor(seed);
  if (own) return own.make(seed);
  const atlas = isAtlasSeed(seed);
  return {
    kind: atlas ? "atlas" : "generated",
    seed,
    mark: (size) => nameMark(seed, size),
    figure: () => (atlas ? nameMarkFigure(seed) : nameCharacterFigure(seed)),
    poses: ["stand", "sit", "hang", "float", "lean"],
    moods: atlas ? ["calm", "thinking", "happy", "surprised", "sleepy"] : [nameMood(seed).mood || "plain"],
  };
}

// --- faces drawn once, moved on the compositor ------------------------------------
//: **Why every face is a few cached pictures, not a live SVG** (the owner:
//: "can caching be used to reduce the load of companion, bg, and other
//: animations??"). An SVG group that animates is restyled, laid out and
//: repainted on the main thread every frame: measured, the companion at
//: rest cost 106 layouts and 107 style recalcs a minute. So a face is drawn
//: once as SVG, cut into its moving parts, and each part (and each run of
//: still drawing between them, so the paint order holds) becomes a small
//: image in an HTML element that carries the part's own class. The CSS that
//: moved the SVG groups moves those elements instead, with transform and
//: opacity only, which the compositor runs without the main thread.
//:
//: - `nameMarkCompose(key, build, options)` keeps one cut-up template per
//:   key in `nameMarkFaceCache` (the least recently used goes past 160) and
//:   hands back a clone. The key names everything the drawing depends on
//:   (the name, your own style, the accent, Atlas's mood), so a new theme,
//:   accent or character simply asks for a new key; nothing runs on a timer.
//: - The pictures are vector (`data:` SVG), so one template serves every
//:   size; positions are percentages of the part they sit in.
//: - A part's pivot (`data-pivot="x y"` in drawing units, for a hip or a
//:   shoulder) becomes its `transform-origin`; every other part turns about
//:   its own middle, as `transform-box: fill-box` made it do in the SVG.
//: - An expression is part of the key, so a change of mood swaps pictures
//:   rather than attributes; a blink is a squash of the eyes' picture.
const NM_MARK_PARTS = [
  ".nm-body", ".nm-eyes", ".nm-blinks", ".nm-tear", ".nm-sweat", ".nm-z", ".nm-spark", ".nm-vein", ".nm-heart",
  ".nm-q", ".nm-bulb", ".nm-halo", ".nm-steam", ".nm-table", ".nm-balloon", ".nm-bow", ".nm-pompom", ".nm-gem",
  ".nm-wave", ".nm-wing", ".nm-tentacle", ".nm-foot", ".nm-flame", ".nm-tail", ".nm-tails", ".nm-starfield",
  ".nm-aura", ".nm-earring",
].join(", ");
const NM_FIGURE_PARTS = `${NM_MARK_PARTS}, .nmb-leg, .nmb-arm, .nmb-hold, .nm-buddy-head, .nmp, .nmp-lantern-glow, .nmc-shadow`;
const NM_FACE_CACHE_CAP = 160;
const nameMarkFaceCache = new Map();
let nameMarkMeasureHost = null;

function nameMarkCompose(key, build, { parts = "", pad = 0, size = 20, height = 0 } = {}) {
  let template = nameMarkFaceCache.get(key);
  if (template) {
    nameMarkFaceCache.delete(key);
  } else {
    template = nameMarkRasterise(build(), parts, pad);
    if (nameMarkFaceCache.size >= NM_FACE_CACHE_CAP) nameMarkFaceCache.delete(nameMarkFaceCache.keys().next().value);
  }
  nameMarkFaceCache.set(key, template);
  const face = template.cloneNode(true);
  face.style.width = `${size}px`;
  face.style.height = `${height || size}px`;
  face.dataset.nmSize = String(size);
  return face;
}

//: Cuts a drawn SVG into its parts (see above). The SVG is laid out once,
//: out of sight, to measure where each part is; everything after that is
//: string work.
function nameMarkRasterise(svg, parts, pad) {
  if (!nameMarkMeasureHost) {
    nameMarkMeasureHost = document.createElement("div");
    nameMarkMeasureHost.className = "nm-measure";
    nameMarkMeasureHost.setAttribute("aria-hidden", "true");
    document.body.appendChild(nameMarkMeasureHost);
  }
  nameMarkMeasureHost.appendChild(svg);
  const [vx, vy, vw, vh] = (svg.getAttribute("viewBox") || "0 0 36 36").split(/[\s,]+/).map(Number);
  const frame = svg.getBoundingClientRect();
  const unit = vw / (frame.width || vw);
  //: Document order, and where each element's subtree ends in it.
  const all = [];
  const end = [];
  const walk = (el) => {
    const at = all.length;
    all.push(el);
    end.push(at);
    for (const child of el.children) walk(child);
    end[at] = all.length - 1;
  };
  walk(svg);
  const order = new Map(all.map((el, i) => [el, i]));
  const isDef = (el) => Boolean(el.closest("defs, clipPath, linearGradient, radialGradient, mask, filter, pattern, symbol, title"));
  const drawable = (i) => all[i].children.length === 0 && !isDef(all[i]) && all[i] !== svg;
  const nodes = [{ el: svg, i: 0, parent: -1, box: { x: vx - pad, y: vy - pad, w: vw + pad * 2, h: vh + pad * 2 }, frame: { x: vx, y: vy, w: vw, h: vh } }];
  const nodeOf = new Map([[svg, 0]]);
  if (parts) {
    for (const el of svg.querySelectorAll(parts)) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      let up = el.parentElement;
      while (up && !nodeOf.has(up)) up = up.parentElement;
      const box = { x: vx + (r.left - frame.left) * unit - 2, y: vy + (r.top - frame.top) * unit - 2, w: r.width * unit + 4, h: r.height * unit + 4 };
      nodeOf.set(el, nodes.length);
      nodes.push({ el, i: order.get(el), parent: nodeOf.get(up) ?? 0, box, frame: box });
    }
  }
  //: One picture of the ordinals [from, to] of the drawing, framed on `box`.
  const serializer = new XMLSerializer();
  const picture = (from, to, box) => {
    let any = false;
    for (let i = from; i <= to && !any; i += 1) any = drawable(i);
    if (!any) return "";
    const copy = svg.cloneNode(true);
    const copies = [];
    const collect = (el) => {
      copies.push(el);
      for (const child of el.children) collect(child);
    };
    collect(copy);
    for (let i = copies.length - 1; i > 0; i -= 1) {
      const el = copies[i];
      if (el.tagName === "title") {
        el.remove();
        continue;
      }
      if (isDef(all[i])) continue;
      if (end[i] < from || i > to) el.remove();
    }
    for (const name of ["class", "style", "width", "height", "aria-hidden", "focusable", "overflow"]) copy.removeAttribute(name);
    copy.setAttribute("viewBox", `${box.x} ${box.y} ${box.w} ${box.h}`);
    copy.setAttribute("preserveAspectRatio", "none");
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializer.serializeToString(copy))}`;
  };
  const pct = (v) => `${(v * 100).toFixed(3)}%`;
  const place = (el, box, within) => {
    el.style.left = pct((box.x - within.x) / within.w);
    el.style.top = pct((box.y - within.y) / within.h);
    el.style.width = pct(box.w / within.w);
    el.style.height = pct(box.h / within.h);
  };
  const image = (url, box, within) => {
    const img = document.createElement("img");
    img.alt = "";
    img.draggable = false;
    img.decoding = "sync";
    img.src = url;
    place(img, box, within);
    return img;
  };
  const elements = nodes.map((node, n) => {
    if (n === 0) {
      const top = document.createElement("span");
      top.className = `${svg.getAttribute("class") || ""} nm-cached`;
      top.setAttribute("aria-hidden", "true");
      const title = svg.querySelector("title")?.textContent;
      if (title) top.title = title;
      for (const [k, v] of Object.entries(svg.dataset)) top.dataset[k] = v;
      const delay = svg.style.getPropertyValue("--nm-delay");
      if (delay) top.style.setProperty("--nm-delay", delay);
      return top;
    }
    const span = document.createElement("span");
    span.className = `${node.el.getAttribute("class") || ""} nmk`;
    place(span, node.box, nodes[node.parent].frame);
    const pivot = (node.el.getAttribute("data-pivot") || "").split(/\s+/).map(Number);
    if (pivot.length === 2 && pivot.every(Number.isFinite)) {
      span.style.transformOrigin = `${pct((pivot[0] - node.box.x) / node.box.w)} ${pct((pivot[1] - node.box.y) / node.box.h)}`;
    }
    return span;
  });
  //: Each element: its own drawing in runs, with its parts between them in
  //: the order the SVG painted them.
  nodes.forEach((node, n) => {
    const kids = nodes.map((k, m) => [k, m]).filter(([k]) => k.parent === n && k !== node).sort((a, b) => a[0].i - b[0].i);
    //: From the part itself: a part may be one shape (a star, a drop).
    let from = node.i;
    const own = node.box;
    const within = node.frame;
    for (const [kid, m] of kids) {
      const url = picture(from, kid.i - 1, own);
      if (url) elements[n].appendChild(image(url, own, within));
      elements[n].appendChild(elements[m]);
      from = end[kid.i] + 1;
    }
    const url = picture(from, end[node.i], own);
    if (url) elements[n].appendChild(image(url, own, within));
  });
  svg.remove();
  return elements[0];
}

function nameMark(seed, size = 20) {
  //: A registered renderer (a character drawn by hand) answers first.
  const own = characterRendererFor(seed);
  if (own) return own.make(seed).mark(size);
  //: The assistant's own name draws Atlas, not a face made from the name.
  const named = String(seed || "").trim().toLowerCase();
  const ai = typeof aiNameNow === "function" ? String(aiNameNow() || "").toLowerCase() : "atlas";
  if (named && (named === ai || named === "atlas")) return atlasMark(size);
  //: Under 28px a face never moves, so it is one picture; above, its parts.
  const moving = size >= 28;
  //: 28px and under is the small mark: the face and one cue (drawCharacter).
  const mini = size <= 28;
  const style = JSON.stringify(nameMarkOwnFor(seed) || {});
  const face = nameMarkCompose(`gen|${moving ? "p" : "f"}${mini ? "m" : ""}|${seed}|${style}|${nameMarkLookLean() || ""}`, () => drawCharacter(seed, 100, mini ? "mini" : "mark"), { parts: moving ? NM_MARK_PARTS : "", size });
  watchNameMark(face);
  return face;
}

// --- the generated characters ------------------------------------------------------
//: **One character, not a disc with a body stuck under it** (INBOX 425; the
//: owner: "get rid of the whole avatar circle with a body attached look, it
//: looks off and ai feel like they could be designed and generated a lot
//: better and more naturally"). Every generated face is now one small
//: mascot drawn as one silhouette: a soft bean whose head (about 58% of its
//: height) flows through a slight neck into the body, stubby limbs that
//: grow out from behind it with rounded ends, one linear gradient for its
//: shading, one outline (the body colour at half its lightness, 1.6 units,
//: the same on every part) and a flat contact shadow. The features sit on
//: that shape: eyes with whites and catchlights (readable on any body
//: colour), a mouth for the mood, brows, blush. The reading from `nameMood`
//: maps onto it: its colour, a species' own silhouette cues (ears break
//: the outline, a muzzle, a beak, a tail, wings, tentacles, a ghost's hem),
//: hair and clothes for people, the props on the head and the thing in its
//: hand.
//:
//: Drawn in the companion's 64 by 92 box (`NMB_*` below), so the figure
//: and the head-only mark are the same drawing: `mode` "figure" draws
//: everything; "mark" leaves out the legs, arms, hand and shadow and crops
//: the view to the head, which is what every list, bubble and picker shows;
//: "mini" is that mark at 28px and under (see `mini` in `drawCharacter`).
//:
//: **The colour pairs** (the owner: "no muddy or clashing combinations").
//: A character's colours are never picked one by one: the name picks one
//: pair, and the pair gives the body (a soft, light gel tone, in the family
//: of Atlas's), four hair tones that read against it (a near black, a
//: brown or chestnut, and a navy or plum, far enough apart that two names sharing a
//: pair and a style still differ, measured by ui-sweeps/namemarks.js), and
//: two cloth tones that sit with both. `tests/test_name_mood.py` checks every pair: the
//: body or its outline at 3:1 or more on the light page and on the dark
//: one, every hair tone at 3:1 against the body, and the cloth apart from
//: the body. The old way (the app's ten category colours for the body, ten
//: hair colours and ten cloth colours, each rolled on its own) gave a blue
//: body with orange hair and a grey top.
const NM_CHAR_PAIRS = [
  { name: "peach", body: "#f6b89a", hair: ["#2e2733", "#8a4526", "#2c3f7a", "#6e3563"], cloth: ["#2f8582", "#5569c0"] },
  { name: "sky", body: "#8fc9f2", hair: ["#2e2733", "#8a4526", "#6e3563", "#5b3a2e"], cloth: ["#f2b547", "#e5705f"] },
  { name: "mint", body: "#96dbbb", hair: ["#2e2733", "#8a4526", "#6e3563", "#2c3f7a"], cloth: ["#e8747c", "#7a64c8"] },
  { name: "lilac", body: "#c3aef0", hair: ["#2e2733", "#8a4526", "#2c3f7a", "#5b3a2e"], cloth: ["#f39b73", "#2f8582"] },
  { name: "butter", body: "#f6d87e", hair: ["#2e2733", "#8a4526", "#2c3f7a", "#6e3563"], cloth: ["#4f7fd9", "#2f8582"] },
  { name: "coral", body: "#f7a397", hair: ["#2e2733", "#2c3f7a", "#6b3f24", "#6e3563"], cloth: ["#3b6fb6", "#2f9e75"] },
  { name: "rose", body: "#f5afcc", hair: ["#2e2733", "#8a4526", "#5b3a2e", "#2c3f7a"], cloth: ["#3fa37e", "#5569c0"] },
  { name: "aqua", body: "#86d6d2", hair: ["#2e2733", "#8a4526", "#6e3563", "#2c3f7a"], cloth: ["#ef8a5b", "#e8747c"] },
  { name: "apricot", body: "#f9c38c", hair: ["#2e2733", "#2c3f7a", "#6e3563", "#8a4526"], cloth: ["#3f6fb5", "#8a5cc2"] },
  { name: "periwinkle", body: "#a8b6f4", hair: ["#2e2733", "#8a4526", "#6e3563", "#5b3a2e"], cloth: ["#f2b547", "#2f9e75"] },
  { name: "pistachio", body: "#bfe08f", hair: ["#2e2733", "#8a4526", "#2c3f7a", "#6e3563"], cloth: ["#e5705f", "#5569c0"] },
  { name: "sand", body: "#e9c9a6", hair: ["#2e2733", "#8a4526", "#2c3f7a", "#6e3563"], cloth: ["#2f8582", "#c9577a"] },
];
const NM_CHAR_INK = "#2a2330";
//: The body's outline, in one place: a figure reads as designed when every
//: part is drawn with the same line.
const NM_CHAR_LINE = 1.6;
//: The silhouette: head, neck and body in one path.
const NM_CHAR_BODY = "M32 4 C48 4 59 14 59 29 C59 40 55 46 50.5 50 C55 55 56.5 65 53 71.5 C48 76.5 16 76.5 11 71.5 C7.5 65 9 55 13.5 50 C9 46 5 40 5 29 C5 14 16 4 32 4 Z";
const NM_CHAR_GHOST = "M32 4 C48 4 59 14 59 29 C59 40 56 48 55 56 C56 66 58 76 56 84 C52 80 49 86 45 82 C41 88 37 82 32 86 C27 82 23 88 19 82 C15 86 12 80 8 84 C6 76 8 66 9 56 C8 48 5 40 5 29 C5 14 16 4 32 4 Z";

function nmHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : null;
}

function nmMix(hex, other, t) {
  const a = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map((i) => parseInt(other.slice(i, i + 2), 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

//: The one outline colour for a fill: half its lightness, except on a fill
//: that is nearly black already (dark hair, a pirate's hat, a suit), where a
//: darker line vanished into a dark page; there it is a lighter rim.
function nmLineFor(hex) {
  return nmLuma(hex) < 0.045 ? nmMix(hex, "#ffffff", 0.38) : nmMix(hex, "#000000", 0.5);
}

function nmLuma(hex) {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function drawCharacter(seed, size = 20, mode = "mark") {
  const full = mode === "figure";
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs = {}, parent = null) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== null) el.setAttribute(key, String(value));
    }
    if (parent) parent.appendChild(el);
    return el;
  };
  //: The name's own hash, as `nameMark` always took it, turned by your own
  //: shuffle when it is your name.
  let h = 2166136261;
  for (const ch of String(seed || "?").trim().toLowerCase()) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const own = nameMarkOwnFor(seed);
  if (own?.variant) h = (h ^ Math.imul(Number(own.variant), 0x2545f491)) >>> 0;
  //: A finaliser before the xorshift: FNV of a short name alone is weakly
  //: mixed, and measured over 26 everyday names it put 15 of them on two of
  //: the eight colour pairs.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0 || 1;
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
  const beast = creature && !creature.human ? creature : null;
  //: **The small mark** (28px and under, `nameMark`): the face and at most
  //: one cue that breaks the outline. A species' ears are its cue, so a
  //: creature's hat goes; the freckles, earrings, stubble and the floating
  //: extras (a "zz", a question mark, a heart) go too, since at that size
  //: they are specks; and the line is thicker so the shape still holds.
  const mini = mode === "mini";
  const LW = mini ? 2.4 : NM_CHAR_LINE;
  const worn = mini && beast ? reading.props.filter((p) => !NAME_MARK_HEAD_KINDS.includes(p)) : reading.props;
  const face = reading.mood ? NAME_MARK_FACES[reading.mood] || {} : {};
  const style = reading.style || {};
  const bias = reading.source !== "seed" && reading.mood ? NAME_MARK_MOOD_GROUNDS[reading.mood] : null;
  const colourRoll = rnd();
  const pair = NM_CHAR_PAIRS[bias ? bias[Math.floor(colourRoll * bias.length)] : Math.floor(colourRoll * NM_CHAR_PAIRS.length)];
  const base = nmHex(creature && !creature.human ? creature.head : null) || pair.body;
  const light = nmMix(base, "#ffffff", 0.28);
  const shade = nmMix(base, "#000000", 0.16);
  const line = nmLineFor(base);
  const spread = 9 + rnd() * 2.2;
  const delay = rnd();
  const tailRoll = rnd();
  const serial = (nameMarkSerial += 1);
  const id = (part) => `nmc-${serial}-${part}`;

  //: A head-only mark is cropped to the head and what stands on it; a tall
  //: hat, long ears or a horn widen the crop rather than lose their tops.
  const tall = worn.some((p) => ["hat", "partyhat", "chefhat", "halo", "antenna", "crown"].includes(p))
    || creature?.gnomeHat || creature?.unihorn || creature?.ears === "long" || creature?.antenna || creature?.flameCrest;
  const svg = make("svg", {
    class: `name-mark nm-char${reading.mood ? ` nm-${reading.mood}` : ""}`,
    viewBox: full ? "0 0 64 92" : tall ? (mini ? "-6 -18 76 76" : "-8 -21 80 80") : mini ? "-1 -5 66 66" : "-3 -9 70 70",
    width: size,
    height: full ? Math.round((size * 92) / 64) : size,
    "aria-hidden": "true",
    focusable: "false",
    overflow: full ? "visible" : null,
  });
  svg.dataset.nmSeed = String(seed || "");
  svg.style.setProperty("--nm-delay", `${(-delay * 5).toFixed(2)}s`);
  const title = nameMarkTitle(reading);
  if (title) make("title", {}, svg).textContent = title;
  const defs = make("defs", {}, svg);
  const grad = make("linearGradient", { id: id("g"), x1: 0.2, y1: 0, x2: 0.8, y2: 1 }, defs);
  make("stop", { offset: 0, "stop-color": light }, grad);
  make("stop", { offset: 0.55, "stop-color": base }, grad);
  make("stop", { offset: 1, "stop-color": shade }, grad);
  const bodyPath = creature?.shape === "ghost" ? NM_CHAR_GHOST : NM_CHAR_BODY;
  make("path", { d: bodyPath }, make("clipPath", { id: id("c") }, defs));

  const outlined = (d, colour, width, parent, extra = {}) => {
    const g = make("g", extra, parent);
    make("path", { d, fill: "none", stroke: line, "stroke-width": width + LW * 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    make("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  const shape = (tag, attrs, parent) => make(tag, { stroke: line, "stroke-width": LW, "stroke-linejoin": "round", ...attrs }, parent);

  if (full) make("ellipse", { class: "nmc-shadow", cx: 32, cy: 90.5, rx: 16, ry: 2.4, fill: "#000000", "fill-opacity": 0.16 }, svg);
  const body = make("g", { class: "nm-body" }, svg);
  const back = make("g", { class: "nmc-back" }, body);

  // --- behind the body: tail, wings, long hair, a mane, raised arms ---------
  const wing = reading.wing || creature?.wing || null;
  if (wing) {
    const wingColour = { angel: "#ffffff", bird: nmMix(base, "#ffffff", 0.35), phoenix: "#f28e2c", dragon: nmMix(base, "#000000", 0.25), bat: "#4a3f55", fairy: "#cfe8ff", bee: "#e8f4ff", butterfly: pair.cloth[0] }[wing] || "#ffffff";
    const soft = ["fairy", "bee"].includes(wing);
    for (const [side, sx] of [["l", -1], ["r", 1]]) {
      const w = make("g", { class: `nm-wing nm-wing-${side}` }, back);
      const x0 = 32 + sx * 14;
      const d = ["bat", "dragon"].includes(wing)
        ? `M${x0} 50 C${x0 + sx * 10} 38 ${x0 + sx * 24} 36 ${x0 + sx * 28} 42 C${x0 + sx * 24} 46 ${x0 + sx * 22} 50 ${x0 + sx * 24} 56 C${x0 + sx * 18} 54 ${x0 + sx * 14} 58 ${x0 + sx * 12} 62 C${x0 + sx * 8} 58 ${x0 + sx * 4} 58 ${x0} 60 Z`
        : `M${x0} 52 C${x0 + sx * 8} 36 ${x0 + sx * 24} 34 ${x0 + sx * 27} 44 C${x0 + sx * 22} 46 ${x0 + sx * 24} 52 ${x0 + sx * 19} 55 C${x0 + sx * 17} 60 ${x0 + sx * 8} 62 ${x0} 60 Z`;
      shape("path", { d, fill: wingColour, "fill-opacity": soft ? 0.7 : 1 }, w);
    }
  }
  const tails = {
    cat: "thin", tiger: "thin", lion: "tuft", wolf: "bushy", fox: "bushy", mouse: "thin", raccoon: "ringed", dog: "wag",
    bunny: "puff", sheep: "puff", pig: "curl", dino: "thick", dragon: "thick", monkey: "curly", bear: "puff", panda: "puff",
    hamster: "puff", deer: "puff", cow: "tuft", unicorn: "tuft", koala: "puff", shark: "thick", snake: "thick",
  };
  const tail = beast ? tails[reading.animal] : reading.mutant && tailRoll < 0.3 ? "thin" : null;
  if (tail && full) {
    const t = make("g", { class: "nm-tail" }, back);
    const tailColour = nmMix(base, "#000000", 0.08);
    if (tail === "puff") shape("circle", { cx: 50, cy: 70, r: 5, fill: nmMix(base, "#ffffff", 0.3) }, t);
    else if (tail === "curl") outlined("M50 66 C58 64 60 70 56 72 C52 74 52 68 57 67", tailColour, 2.2, t);
    else if (tail === "bushy" || tail === "ringed") {
      shape("path", { d: "M49 68 C58 70 64 60 62 50 C60 44 55 44 56 50 C57 58 54 62 48 62 Z", fill: tailColour }, t);
      if (reading.animal === "fox") shape("path", { d: "M62 50 C60 44 55 44 56 50 C57 52 60 53 62 50 Z", fill: "#f5f4ef" }, t);
      if (tail === "ringed") for (const y of [52, 57]) make("path", { d: `M55 ${y} L62 ${y - 1}`, stroke: "#2b2a28", "stroke-width": 2 }, t);
    } else if (tail === "thick") shape("path", { d: "M46 64 C56 66 62 72 66 80 C58 78 52 76 46 72 Z", fill: tailColour }, t);
    else if (tail === "wag") outlined("M50 66 C56 64 58 58 57 54", tailColour, 3.2, t);
    else if (tail === "curly") outlined("M50 68 C60 70 64 62 60 56 C57 52 53 56 56 59", tailColour, 2.4, t);
    else {
      outlined("M50 68 C58 70 62 64 60 56", tailColour, 2.4, t);
      if (tail === "tuft") shape("circle", { cx: 60, cy: 55, r: 2.8, fill: creature?.mane && creature.mane !== "rainbow" ? creature.mane : line }, t);
    }
  }
  const hairColour = creature?.hairTone || pair.hair[(style.hairColour || 0) % pair.hair.length];
  const hairLine = nmLineFor(hairColour);
  const hairShape = (d, parent) => make("path", { d, fill: hairColour, stroke: hairLine, "stroke-width": LW, "stroke-linejoin": "round" }, parent);
  const hair = beast ? null : creature?.hairFixed || style.hair;
  if (hair === "long") hairShape("M3 30 C2 10 16 0 32 0 C48 0 62 10 61 30 L63 60 C58 65 53 63 51 58 L13 58 C11 63 6 65 1 60 Z", back);
  if (hair === "ponytail") hairShape("M54 10 C66 14 70 30 64 46 C62 40 60 30 54 22 Z", back);
  if (creature?.mane) {
    const mane = creature.mane === "rainbow" ? null : creature.mane;
    if (mane) {
      for (let i = 0; i < 12; i += 1) {
        const a = (Math.PI * 2 * i) / 12;
        make("circle", { cx: 32 + Math.cos(a) * 27, cy: 28 + Math.sin(a) * 24, r: 8, fill: mane, stroke: nmMix(mane, "#000000", 0.45), "stroke-width": LW }, back);
      }
    } else {
      ["#e15759", "#f28e2c", "#edc949", "#59a14f", "#4e79a7"].forEach((c, i) => outlined(`M${40 + i * 3} ${2 + i * 2} C${54 + i * 2} ${8 + i * 3} ${60 + i} ${24 + i * 4} ${58 + i} ${40 + i * 3}`, c, 2.6, back));
    }
  }
  if (creature?.wool) {
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI + (Math.PI * i) / 8;
      make("circle", { cx: 32 + Math.cos(a) * 25, cy: 26 + Math.sin(a) * 21, r: 7.5, fill: creature.wool, stroke: nmMix(creature.wool, "#000000", 0.35), "stroke-width": LW }, back);
    }
  }
  if (creature?.quills) {
    for (let i = 0; i < 9; i += 1) {
      const a = Math.PI * 0.95 + (Math.PI * 1.1 * i) / 8;
      const x = 32 + Math.cos(a) * 26;
      const y = 32 + Math.sin(a) * 26;
      make("path", { d: `M${x - 5} ${y} L${32 + Math.cos(a) * 36} ${32 + Math.sin(a) * 36} L${x + 5} ${y + 2} Z`, fill: creature.quills, stroke: nmMix(creature.quills, "#000000", 0.4), "stroke-width": LW, "stroke-linejoin": "round" }, back);
    }
  }
  // Ears that stand above the head, behind it.
  const earInner = creature?.inner || nmMix(base, "#ff9da7", 0.45);
  const earColour = nmHex(creature?.ear) || base;
  const earScale = (creature?.earSize || 4) / 4;
  const ears = beast?.ears;
  if (ears === "pointy") {
    for (const sx of [-1, 1]) {
      shape("path", { d: `M${32 + sx * 13} 9 L${32 + sx * 25} -6 L${32 + sx * 26} 17 Z`, fill: earColour }, back);
      make("path", { d: `M${32 + sx * 16} 9 L${32 + sx * 23.5} 0 L${32 + sx * 24} 13 Z`, fill: earInner }, back);
    }
  } else if (ears === "round") {
    for (const sx of [-1, 1]) {
      shape("circle", { cx: 32 + sx * 20, cy: 8, r: 7.5 * earScale, fill: earColour }, back);
      make("circle", { cx: 32 + sx * 20, cy: 8.5, r: 4.2 * earScale, fill: earInner }, back);
    }
  } else if (ears === "long") {
    for (const sx of [-1, 1]) {
      shape("ellipse", { cx: 32 + sx * 11, cy: -6, rx: 5.5, ry: 14, transform: `rotate(${sx * 12} ${32 + sx * 11} 8)`, fill: earColour }, back);
      make("ellipse", { cx: 32 + sx * 11, cy: -5, rx: 2.8, ry: 10, transform: `rotate(${sx * 12} ${32 + sx * 11} 8)`, fill: earInner }, back);
    }
  } else if (ears === "tufts") {
    for (const sx of [-1, 1]) shape("path", { d: `M${32 + sx * 14} 8 L${32 + sx * 24} -3 L${32 + sx * 25} 14 Z`, fill: shade }, back);
  }
  if (creature?.eyesUp) for (const sx of [-1, 1]) shape("circle", { cx: 32 + sx * 11, cy: 8, r: 9, fill: base }, back);
  if (beast?.fin) shape("path", { d: "M26 6 C30 -6 38 -10 42 -8 C38 -2 38 2 40 6 Z", fill: shade }, back);
  if (beast?.spikes) for (const x of [18, 32, 46]) shape("path", { d: `M${x - 6} ${x === 32 ? 5 : 8} L${x} ${x === 32 ? -6 : -2} L${x + 6} ${x === 32 ? 5 : 8} Z`, fill: beast.spikes }, back);
  if (full) {
    for (const [side, d] of [["l", "M14 56 C-2 52 -6 18 6 -6"], ["r", "M50 56 C66 52 70 18 58 -6"]]) {
      outlined(d, base, 6, back, { class: `nmb-hold nmb-hold-${side}`, "data-pivot": side === "l" ? "14 56" : "50 56" });
    }
  }

  // --- legs, the body, and the arms in front ----------------------------------
  if (full) {
    const legColour = nmMix(base, "#000000", 0.1);
    const limbs = reading.limbs || creature?.limbs;
    const footColour = nmHex(beast?.foot) || legColour;
    if (creature?.shape === "ghost") {
      // A ghost has no legs to stand on; its hem is its feet.
    } else if (limbs === "tentacles") {
      for (const [side, x] of [["l", 22], ["l", 29], ["r", 35], ["r", 42]]) {
        outlined(`M${x} 66 C${x - 3} 76 ${x + 3} 82 ${x - 1} 89`, legColour, 5, body, { class: `nmb-leg nmb-leg-${side} nm-tentacle`, "data-pivot": `${x} 66` });
      }
    } else if (limbs === "tail") {
      const g = make("g", { class: "nmb-leg nmb-leg-l nmb-leg-r", "data-pivot": "32 66" }, body);
      shape("path", { d: "M20 66 C22 80 30 84 32 86 C34 84 42 80 44 66 Z", fill: hairColour === base ? "#3fb8a8" : "#3fb8a8" }, g);
      shape("path", { d: "M32 84 L22 91 L32 88 L42 91 Z", fill: "#3fb8a8" }, g);
    } else {
      for (const [side, x] of [["l", 25.5], ["r", 38.5]]) {
        const leg = make("g", { class: `nmb-leg nmb-leg-${side}`, "data-pivot": `${x} 68` }, body);
        outlined(`M${x} 68 L${x} 84`, legColour, 7, leg);
        shape("ellipse", { cx: x + (side === "l" ? -1.4 : 1.4), cy: 87, rx: 5.6, ry: 3.3, fill: footColour }, leg);
      }
    }
  }
  const torso = make("g", { class: "nmb-torso" }, body);
  shape("path", { d: bodyPath, fill: `url(#${id("g")})` }, torso);
  const clip = make("g", { "clip-path": `url(#${id("c")})` }, torso);
  //: People wear clothes on the lower half; creatures show a paler belly.
  const outfit = beast ? null : style.outfit;
  if (outfit) {
    let cloth = pair.cloth[(style.outfitColour || 0) % pair.cloth.length];
    if (outfit === "suit") cloth = "#33323a";
    const clothLine = nmLineFor(cloth);
    make("path", { d: "M0 52 C12 56 52 56 64 52 L64 92 L0 92 Z", fill: cloth }, clip);
    make("path", { d: "M0 52 C12 56 52 56 64 52", fill: "none", stroke: clothLine, "stroke-width": LW }, clip);
    if (outfit === "collar" || outfit === "suit" || outfit === "blazer") {
      make("path", { d: "M24 54 L32 66 L40 54 Z", fill: "#ffffff", stroke: clothLine, "stroke-width": 1 }, clip);
      if (outfit !== "blazer") make("path", { d: "M32 57 L30 61 L32 70 L34 61 Z", fill: "#e2574c", stroke: "#8e2a24", "stroke-width": 0.8 }, clip);
    } else if (outfit === "hoodie") {
      make("path", { d: "M22 54 C26 60 38 60 42 54", fill: "none", stroke: clothLine, "stroke-width": 1.4 }, clip);
      for (const x of [28, 36]) make("path", { d: `M${x} 58 L${x} 65`, stroke: "#f5f4ef", "stroke-width": 1.2, "stroke-linecap": "round" }, clip);
    } else if (outfit === "scoop") {
      make("path", { d: "M22 53 C26 61 38 61 42 53", fill: base, stroke: clothLine, "stroke-width": 1 }, clip);
      for (const x of [27, 32, 37]) make("circle", { cx: x, cy: x === 32 ? 59.5 : 58, r: 1, fill: "#f5f4ef" }, clip);
    } else if (outfit === "sweater") {
      for (const y of [68, 71]) make("path", { d: `M8 ${y} L56 ${y}`, stroke: clothLine, "stroke-width": 0.9 }, clip);
    } else if (outfit === "dress") {
      make("path", { d: "M8 63 L56 63", stroke: "#f5f4ef", "stroke-width": 2 }, clip);
    } else {
      make("path", { d: "M26 54 C28 58 36 58 38 54", fill: "none", stroke: clothLine, "stroke-width": 1.2 }, clip);
    }
  } else {
    make("ellipse", { cx: 32, cy: 64, rx: 12, ry: 8.5, fill: beast?.mask && reading.animal === "penguin" ? "#f5f4ef" : "#ffffff", "fill-opacity": beast?.mask ? 0.9 : 0.28 }, clip);
  }
  if (beast?.beeStripes) for (const y of [58, 66]) make("rect", { x: 0, y, width: 64, height: 4, fill: "#2b2a28" }, clip);
  if (beast?.stripes) for (const [x, y] of [[8, 24], [56, 24], [10, 32], [54, 32]]) make("path", { d: `M${x} ${y} L${x < 32 ? x + 7 : x - 7} ${y + 1.5}`, stroke: "#2b2a28", "stroke-width": 2, "stroke-linecap": "round" }, clip);
  if (beast?.stripes) make("path", { d: "M28 6 L32 12 L36 6", fill: "none", stroke: "#2b2a28", "stroke-width": 2, "stroke-linecap": "round" }, clip);
  if (beast?.spots || reading.mutant?.spots) {
    const spotColour = beast?.spots || nmMix(base, "#000000", 0.25);
    const count = beast?.spots ? 4 : reading.mutant.spots;
    const at = [[14, 18, 5], [50, 14, 4], [48, 60, 5], [18, 62, 4], [40, 8, 3]];
    for (let i = 0; i < count; i += 1) make("circle", { cx: at[i % 5][0], cy: at[i % 5][1], r: at[i % 5][2], fill: spotColour }, clip);
  }
  if (beast?.mask && reading.animal !== "penguin") make("ellipse", { cx: 32, cy: 33, rx: 20, ry: 16, fill: beast.mask }, clip);
  if (reading.animal === "penguin") make("path", { d: "M12 36 C12 18 22 14 32 20 C42 14 52 18 52 36 C52 50 12 50 12 36 Z", fill: "#f5f4ef" }, clip);
  if (beast?.bandit) make("path", { d: "M6 26 C16 22 48 22 58 26 L58 34 C48 31 16 31 6 34 Z", fill: beast.bandit }, clip);
  if (beast?.bandages) for (const y of [14, 24, 44, 60]) make("path", { d: `M0 ${y} L64 ${y + 4}`, stroke: "#f5f1e6", "stroke-width": 3, "stroke-opacity": 0.9 }, clip);
  if (beast?.stitches) make("path", { d: "M14 16 L24 20 M16 14 L16 18 M20 16 L20 20", stroke: "#2b2a28", "stroke-width": 1 }, clip);
  // Ears on the sides of the head, in front of it.
  if (ears === "floppy") for (const sx of [-1, 1]) shape("ellipse", { cx: 32 + sx * 25, cy: 22, rx: 5.5, ry: 11, transform: `rotate(${sx * -18} ${32 + sx * 25} 22)`, fill: earColour }, torso);
  if (ears === "side") for (const sx of [-1, 1]) shape("ellipse", { cx: 32 + sx * 28, cy: 22, rx: 7, ry: 4, fill: earColour }, torso);
  if (creature?.sideEars) for (const sx of [-1, 1]) shape("path", { d: `M${32 + sx * 26} 26 L${32 + sx * (34 + creature.sideEars * 4)} 18 L${32 + sx * 26} 34 Z`, fill: base }, torso);
  if (beast?.gills) for (const sx of [-1, 1]) for (const dy of [-5, 0, 5]) outlined(`M${32 + sx * 26} ${30 + dy} L${32 + sx * 34} ${27 + dy * 1.6}`, beast.gills, 2.4, torso);
  // The front hair.
  const fringe = {
    short: "M6 25 C4 11 16 1 32 1 C48 1 60 11 58 25 C55 22 53 20 50 19 C42 21 30 19 21 13 C17 18 11 21 6 25 Z",
    long: "M5 32 C4 12 18 1 32 1 C46 1 60 12 59 32 C56 24 50 18 42 16 C38 21 26 21 22 16 C14 18 8 24 5 32 Z",
    bob: "M3 42 C1 14 16 1 32 1 C48 1 63 14 61 42 C58 45 55 44 54 41 L55 28 C50 20 42 16 33 17 C24 16 15 20 9 28 L10 41 C9 44 6 45 3 42 Z",
    buzz: "M7 22 C10 8 22 3 32 3 C42 3 54 8 57 22 C48 14 16 14 7 22 Z",
    spiky: "M5 28 L4 14 L11 17 L12 4 L20 10 L25 -2 L31 7 L37 -3 L42 7 L49 2 L51 12 L58 8 L57 18 L60 17 L59 28 C52 20 42 17 32 18 C22 17 12 21 5 28 Z",
    quiff: "M6 25 C4 12 13 4 22 3 C26 -4 40 -6 47 -1 C54 3 60 12 58 25 C55 21 51 18 46 17 C40 20 31 20 25 16 C17 17 11 21 6 25 Z",
    curly: "M5 30 C4 12 18 2 32 2 C46 2 60 12 59 30 C55 22 48 18 40 17 C36 20 28 20 24 17 C16 18 10 23 5 30 Z",
    pigtails: "M5 30 C4 12 18 2 32 2 C46 2 60 12 59 30 C55 22 46 17 32 18 C18 17 9 22 5 30 Z",
    buns: "M5 30 C4 12 18 2 32 2 C46 2 60 12 59 30 C55 22 46 17 32 18 C18 17 9 22 5 30 Z",
    ponytail: "M5 30 C4 12 18 2 32 2 C46 2 60 12 59 30 C54 21 44 15 30 17 C20 18 10 22 5 30 Z",
  };
  if (hair && fringe[hair]) {
    if (hair === "curly") for (const [x, y] of [[10, 16], [18, 7], [28, 3], [38, 3], [48, 7], [55, 16]]) make("circle", { cx: x, cy: y, r: 6.5, fill: hairColour, stroke: hairLine, "stroke-width": LW }, torso);
    //: One bun on the crown: two at the sides read as a bear's ears.
    if (hair === "buns") make("circle", { cx: 32, cy: -3, r: 7.5, fill: hairColour, stroke: hairLine, "stroke-width": LW }, torso);
    if (hair === "pigtails") for (const sx of [-1, 1]) make("ellipse", { cx: 32 + sx * 30, cy: 38, rx: 5.5, ry: 10, transform: `rotate(${sx * -14} ${32 + sx * 30} 38)`, fill: hairColour, stroke: hairLine, "stroke-width": LW, class: "nm-tails" }, torso);
    hairShape(fringe[hair], torso);
    if (hair === "pigtails") for (const sx of [-1, 1]) make("circle", { cx: 32 + sx * 28, cy: 28, r: 2.4, fill: pair.cloth[0] }, torso);
    if (hair === "buns") make("ellipse", { cx: 32, cy: 3.2, rx: 4.2, ry: 1.7, fill: pair.cloth[0], stroke: nmLineFor(pair.cloth[0]), "stroke-width": 0.8 }, torso);
  }
  if (creature?.snakeHair) for (const x of [14, 24, 34, 44, 52]) outlined(`M${x} 10 C${x - 4} 2 ${x + 4} -2 ${x} -8`, creature.snakeHair, 3, torso);
  if (creature?.topknot) shape("circle", { cx: 32, cy: 0, r: 6, fill: creature.topknot }, torso);
  //: A soft sheen on the crown, top left, the gloss Atlas's gel has.
  if (!creature?.wool && !creature?.mane) make("path", { class: "nmc-sheen", d: "M12 14 Q16 6 25 4", fill: "none", stroke: "#ffffff", "stroke-opacity": hair ? 0.32 : 0.55, "stroke-width": 2.2, "stroke-linecap": "round" }, torso);

  // --- the face ---------------------------------------------------------------------
  const head = make("g", { class: "nm-buddy-head" }, body);
  const eyeY = creature?.eyesUp ? 10 : 30;
  const eyes = [];
  if (creature?.oneEye || reading.mutant?.eyes === 1) eyes.push([32, eyeY - 1, 1.35]);
  else if (reading.mutant?.eyes === 3) eyes.push([32 - spread, eyeY, 1], [32 + spread, eyeY, 1], [32, eyeY - 10, 0.8]);
  else eyes.push([32 - spread, eyeY, 1], [32 + spread, eyeY, 1]);
  if (beast?.patches) for (const [x, y] of eyes) make("ellipse", { cx: x, cy: y + 1, rx: 7, ry: 8.5, transform: `rotate(${x < 32 ? 25 : -25} ${x} ${y})`, fill: beast.patches }, head);
  if (beast?.rings) for (const [x, y] of eyes) make("circle", { cx: x, cy: y, r: 8, fill: beast.rings }, head);
  if (beast?.muzzle) make("ellipse", { cx: 32, cy: 40, rx: 10.5, ry: 7.5, fill: beast.muzzle }, head);
  if (beast?.snout) {
    shape("ellipse", { cx: 32, cy: 39, rx: 6.5, ry: 4.8, fill: beast.snout }, head);
    for (const x of [30, 34]) make("ellipse", { cx: x, cy: 39, rx: 1, ry: 1.6, fill: nmMix(beast.snout, "#000000", 0.45) }, head);
  }
  //: Eyes: whites and a pupil with a catchlight read on any body colour;
  //: a light body can have the beady ones too.
  let eyeStyle = face.eyes || (["dot", "button"].includes(style.eyes) && nmLuma(base) > 0.3 ? "beady" : style.eyes === "anime" || style.eyes === "sparkle" || style.eyes === "starry" ? "sparkle" : "round");
  if (reading.flavours?.includes("scream")) eyeStyle = "wide";
  if (beast?.eyes === "alien") eyeStyle = "alien";
  if (reading.mutant?.googly) eyeStyle = "googly";
  const eyesG = make("g", { class: "nm-eyes" }, head);
  const blinks = make("g", { class: "nm-blinks" }, eyesG);
  const stroke = (d, parent, width = 1.8, colour = NM_CHAR_INK) =>
    make("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" }, parent);
  const heart = (x, y, r, colour, parent, cls) =>
    make("path", { class: cls, d: `M${x} ${y + r * 0.9} C${x - r * 1.6} ${y - r * 0.2} ${x - r * 0.9} ${y - r * 1.3} ${x} ${y - r * 0.4} C${x + r * 0.9} ${y - r * 1.3} ${x + r * 1.6} ${y - r * 0.2} ${x} ${y + r * 0.9} Z`, fill: colour }, parent);
  const star = (x, y, r, colour, parent, cls) => {
    const pts = [];
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(`${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`);
    }
    return make("polygon", { class: cls, points: pts.join(" "), fill: colour, stroke: nmMix(colour, "#000000", 0.4), "stroke-width": 0.7, "stroke-linejoin": "round" }, parent);
  };
  const winkLeft = reading.flavours?.includes("wink");
  eyes.forEach(([x, y, k], index) => {
    const eye = make("g", {}, blinks);
    const s = winkLeft && index === 0 ? "happy" : eyeStyle;
    const white = (rx, ry) => make("ellipse", { cx: x, cy: y, rx: rx * k, ry: ry * k, fill: "#ffffff", stroke: line, "stroke-width": 0.9 }, eye);
    const pupil = (r, dx = 0, dy = 0.6) => {
      make("ellipse", { cx: x + dx, cy: y + dy, rx: r * k, ry: r * 1.15 * k, fill: NM_CHAR_INK }, eye);
      make("circle", { cx: x + dx + r * 0.4 * k, cy: y + dy - r * 0.45 * k, r: 0.9 * k, fill: "#ffffff" }, eye);
    };
    const out = index === 0 ? -1 : 1;
    //: On a dark patch (a panda, a sloth) a closed eye is drawn in white.
    const lidInk = beast?.patches ? "#ffffff" : NM_CHAR_INK;
    if (s === "squeeze") stroke(`M${x + out * 3} ${y - 3} L${x - out * 3} ${y} L${x + out * 3} ${y + 3}`, eye, 2, lidInk);
    else if (s === "happy" || s === "content") stroke(`M${x - 3.6} ${y + 1.2} Q${x} ${y - (s === "content" ? 2 : 3.6)} ${x + 3.6} ${y + 1.2}`, eye, 2, lidInk);
    else if (s === "closed") stroke(`M${x - 3.6} ${y - 0.6} Q${x} ${y + 3} ${x + 3.6} ${y - 0.6}`, eye, 2, lidInk);
    else if (s === "beady" && !beast?.patches) pupil(2.8, 0, 0);
    else if (s === "heart") heart(x, y, 4.2 * k, "#e8364f", eye);
    else if (s === "star") star(x, y, 5 * k, "#f5c518", eye);
    else if (s === "x") stroke(`M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}`, eye, 2);
    else if (s === "spiral") stroke(`M${x} ${y} m-0.8 0 a0.8 0.8 0 1 1 1.6 0 a1.8 1.8 0 1 1 -3.6 0 a2.8 2.8 0 1 1 5.6 0 a3.6 3.6 0 1 1 -7.2 0`, eye, 1.2);
    else if (s === "dollar") {
      make("circle", { cx: x, cy: y, r: 4.4, fill: "#f5c518", stroke: "#8a6d00", "stroke-width": 0.9 }, eye);
      stroke(`M${x + 1.6} ${y - 1.8} C${x - 2.6} ${y - 3} ${x - 2.6} ${y} ${x} ${y} C${x + 2.6} ${y} ${x + 2.6} ${y + 3} ${x - 1.6} ${y + 1.8} M${x} ${y - 3.4} L${x} ${y + 3.4}`, eye, 0.9, "#6b5300");
    } else if (s === "alien") make("ellipse", { cx: x, cy: y, rx: 4.6, ry: 6, transform: `rotate(${x < 32 ? 25 : -25} ${x} ${y})`, fill: NM_CHAR_INK }, eye);
    else if (s === "shades") {
      // Drawn with the eyewear below.
    } else if (s === "googly") {
      white(5, 5);
      pupil(2, (index % 2 ? 1 : -1) * 1.4, 1.2);
      const googly = eye.lastChild.previousSibling;
      //: A googly pupil rolls round its own eye (the `nm-roll` loop).
      googly?.setAttribute("class", "nm-pupil");
      googly?.style.setProperty("transform-origin", x + "px " + y + "px");
    } else if (s === "wide") {
      white(4.6, 5.4);
      pupil(1.7, 0, 0.2);
    } else if (s === "narrow" || s === "evil") {
      white(4.6, 3.4);
      pupil(2.2, index === 0 ? 0.8 : -0.8, 0.4);
      make("path", { d: `M${x - 5.4} ${y - (index === 0 ? 3.6 : 1)} L${x + 5.4} ${y - (index === 0 ? 1 : 3.6)} L${x + 5.4} ${y - 6} L${x - 5.4} ${y - 6} Z`, fill: base }, eye);
      stroke(`M${x - 5} ${y - (index === 0 ? 3.4 : 1.2)} L${x + 5} ${y - (index === 0 ? 1.2 : 3.4)}`, eye, 1.4);
    } else if (s === "halflid") {
      white(4.4, 4.8);
      pupil(2.3, 0, 1.2);
      make("path", { d: `M${x - 5.4} ${y + 0.4} L${x + 5.4} ${y + 0.4} L${x + 5.4} ${y - 6} L${x - 5.4} ${y - 6} Z`, fill: base }, eye);
      stroke(`M${x - 4.8} ${y + 0.4} L${x + 4.8} ${y + 0.4}`, eye, 1.3);
    } else if (s === "mismatch") {
      white(index ? 3.4 : 5, index ? 3.8 : 5.6);
      pupil(index ? 1.6 : 2.4);
    } else if (beast?.patches || nmLuma(base) < 0.12) {
      //: On a dark patch or a dark coat a dark iris would vanish: whites.
      const big = s === "sparkle" || s === "glossy";
      white(big ? 5 : 4.4, big ? 5.8 : 5.2);
      pupil(big ? 3 : 2.5);
      if (big) make("circle", { cx: x - 1.2 * k, cy: y + 2 * k, r: 0.7 * k, fill: "#ffffff" }, eye);
    } else {
      //: The default eye, in Atlas's family: a big dark iris, lighter at
      //: its foot, with a large catchlight and a small one. Whites around a
      //: small pupil read as startled at every size.
      const big = s === "sparkle" || s === "glossy";
      const rx = (big ? 3.7 : 3.2) * k;
      const ry = (big ? 4.5 : 4) * k;
      make("ellipse", { cx: x, cy: y + 0.4, rx, ry, fill: NM_CHAR_INK }, eye);
      make("ellipse", { cx: x, cy: y + 0.4 + ry * 0.5, rx: rx * 0.66, ry: ry * 0.34, fill: "#6d5a86", "fill-opacity": 0.9 }, eye);
      make("circle", { cx: x + rx * 0.32, cy: y - ry * 0.32, r: (big ? 1.6 : 1.3) * k, fill: "#ffffff" }, eye);
      make("circle", { cx: x - rx * 0.42, cy: y + ry * 0.42, r: 0.65 * k, fill: "#ffffff" }, eye);
    }
    if (style.features?.includes("lashes") && !["x", "spiral", "heart", "star", "dollar"].includes(s)) {
      stroke(`M${x + (index === 0 ? -4 : 4)} ${y - 3} L${x + (index === 0 ? -6 : 6)} ${y - 5}`, eye, 1.2);
    }
  });
  if (creature?.stalks || reading.mutant?.stalks) for (const [x] of eyes) stroke(`M${x} ${eyeY - 5} L${x} ${eyeY - 14}`, head, 2, line);
  // Brows.
  const browY = eyeY - 8.5;
  const browPaths = {
    raised: (x, i) => `M${x - 3.5} ${browY + 0.5} Q${x} ${browY - 2.5} ${x + 3.5} ${browY + 0.5}`,
    sad: (x, i) => (i === 0 ? `M${x - 3.5} ${browY + 1.2} L${x + 3.2} ${browY - 1.2}` : `M${x - 3.2} ${browY - 1.2} L${x + 3.5} ${browY + 1.2}`),
    angry: (x, i) => (i === 0 ? `M${x - 3.5} ${browY - 1} L${x + 3.5} ${browY + 2}` : `M${x - 3.5} ${browY + 2} L${x + 3.5} ${browY - 1}`),
    flat: (x) => `M${x - 3.5} ${browY + 1} L${x + 3.5} ${browY + 1}`,
    dramatic: (x) => `M${x - 4} ${browY} Q${x} ${browY - 4} ${x + 4} ${browY}`,
    sly: (x, i) => (i === 0 ? `M${x - 3.5} ${browY + 1} L${x + 3.5} ${browY + 1}` : `M${x - 3.5} ${browY} Q${x} ${browY - 3} ${x + 3.5} ${browY - 1}`),
    confused: (x, i) => (i === 0 ? `M${x - 3.5} ${browY - 1.5} Q${x} ${browY - 4} ${x + 3.5} ${browY - 1.5}` : `M${x - 3.5} ${browY + 1.5} L${x + 3.5} ${browY + 0.5}`),
  };
  if (face.brows && browPaths[face.brows] && eyes.length === 2) eyes.forEach(([x], i) => stroke(browPaths[face.brows](x, i), head, 1.6));
  // Cheeks: always a little blush; more when the mood or the name says so.
  const flushed = face.extras?.includes("blush") || style.features?.includes("blush") || reading.flavours?.includes("blush");
  const cheek = face.extras?.includes("greenblush") ? "#7fbf6a" : "#ff6f91";
  for (const sx of [-1, 1]) make("ellipse", { cx: 32 + sx * 16, cy: eyeY + 7.5, rx: 3.8, ry: 2.3, fill: cheek, "fill-opacity": flushed ? 0.55 : 0.28 }, head);
  if (!mini && style.features?.includes("freckles")) for (const sx of [-1, 1]) for (const [dx, dy] of [[0, 0], [2.4, 1], [-2, 1.4]]) make("circle", { cx: 32 + sx * 16 + dx, cy: eyeY + 6 + dy, r: 0.55, fill: nmMix(base, "#000000", 0.4) }, head);
  if (!mini && style.features?.includes("mole")) make("circle", { cx: 41, cy: eyeY + 13, r: 0.8, fill: NM_CHAR_INK }, head);
  if (beast?.whiskers) for (const sx of [-1, 1]) for (const dy of [-1.5, 1.5]) stroke(`M${32 + sx * 12} ${40 + dy} L${32 + sx * 20} ${39 + dy * 2}`, head, 0.8, line);
  // Nose, beak or bill.
  if (beast?.beak) shape("path", { d: "M27.5 36 L32 33.5 L36.5 36 L32 41 Z", fill: beast.beak }, head);
  else if (beast?.bill) shape("path", { d: "M25 37 C25 34 39 34 39 37 C39 41 25 41 25 37 Z", fill: beast.bill }, head);
  else if (beast?.muzzle || beast?.nose || creature?.nose || creature?.bigNose) make("ellipse", { cx: 32, cy: 36.5, rx: creature?.bigNose ? 3.6 : 2.4, ry: creature?.bigNose ? 2.8 : 1.7, fill: creature?.bigNose ? nmMix(base, "#000000", 0.2) : NM_CHAR_INK }, head);
  else if (style.nose === "button") make("ellipse", { cx: 32, cy: 36.5, rx: 1.6, ry: 1.2, fill: nmMix(base, "#000000", 0.25) }, head);
  if (worn.includes("rednose")) shape("circle", { cx: 32, cy: 36.5, r: 3.4, fill: "#e8364f" }, head);
  // The mouth.
  const my = beast?.beak || beast?.bill ? 44 : eyeY + 11;
  let mouth = face.mouth || { smile: "smile", grin: "grin", toothy: "toothy", lopsided: "lopsided", bigD: "grin", buck: "buck", gap: "gap", cat3: "cat" }[style.smile] || "smile";
  if (face.loud && reading.intense) mouth = face.loud;
  if (reading.flavours?.includes("scream")) mouth = "gasp";
  if (beast?.mouth && !face.mouth) mouth = beast.mouth;
  const inner = "#6b2238";
  const openMouth = (d) => {
    make("path", { d, fill: inner, stroke: NM_CHAR_INK, "stroke-width": 1.4, "stroke-linejoin": "round" }, head);
  };
  if (mouth === "smile") stroke(`M27 ${my - 1} Q32 ${my + 3.4} 37 ${my - 1}`, head);
  else if (mouth === "lopsided") stroke(`M27 ${my} Q33 ${my + 3} 37.5 ${my - 2}`, head);
  else if (mouth === "smirk") stroke(`M28 ${my + 0.5} Q33 ${my + 1.8} 37 ${my - 1.8}`, head);
  else if (mouth === "yum") {
    //: A smile licking its lip: the tip of a tongue at one corner.
    stroke(`M27 ${my - 1} Q32 ${my + 3.4} 37 ${my - 1}`, head);
    make("ellipse", { cx: 35.6, cy: my + 1.6, rx: 1.9, ry: 1.6, fill: "#ff7a95", stroke: NM_CHAR_INK, "stroke-width": 0.9 }, head);
  }
  else if (mouth === "frown") stroke(`M27.5 ${my + 1.6} Q32 ${my - 2} 36.5 ${my + 1.6}`, head);
  else if (mouth === "flat") stroke(`M28 ${my} L36 ${my}`, head);
  else if (mouth === "wavy") stroke(`M26.5 ${my} Q28.5 ${my - 1.8} 30.5 ${my} Q32.5 ${my + 1.8} 34.5 ${my} Q36.5 ${my - 1.8} 38 ${my}`, head, 1.5);
  else if (mouth === "cat") stroke(`M27 ${my - 1} Q29.5 ${my + 2} 32 ${my - 0.4} Q34.5 ${my + 2} 37 ${my - 1}`, head, 1.6);
  else if (mouth === "o") make("ellipse", { cx: 32, cy: my + 0.5, rx: 2.2, ry: 2.6, fill: inner, stroke: NM_CHAR_INK, "stroke-width": 1.3 }, head);
  else if (mouth === "gasp" || mouth === "yawn") make("ellipse", { cx: 32, cy: my + 1, rx: 3.4, ry: mouth === "yawn" ? 3.6 : 4.4, fill: inner, stroke: NM_CHAR_INK, "stroke-width": 1.4 }, head);
  else {
    // An open smile, with what the style or mood puts in it.
    openMouth(`M25.5 ${my - 1.5} Q32 ${my - 0.4} 38.5 ${my - 1.5} Q38 ${my + 6.5} 32 ${my + 6.5} Q26 ${my + 6.5} 25.5 ${my - 1.5} Z`);
    if (["grin", "tongue", "toothy", "gap", "buck", "evil", "teeth"].includes(mouth)) make("ellipse", { cx: 32, cy: my + 4.6, rx: 3.6, ry: 1.9, fill: "#ff7a95" }, head);
    if (mouth === "toothy" || mouth === "teeth") make("path", { d: `M26.6 ${my - 1.1} Q32 ${my - 0.2} 37.4 ${my - 1.1} L37 ${my + 1} Q32 ${my + 1.6} 27 ${my + 1} Z`, fill: "#ffffff" }, head);
    if (mouth === "buck") make("rect", { x: 29.8, y: my - 1, width: 4.4, height: 2.8, rx: 0.6, fill: "#ffffff", stroke: NM_CHAR_INK, "stroke-width": 0.6 }, head);
    if (mouth === "gap") for (const x of [28.4, 33.2]) make("rect", { x, y: my - 1, width: 2.4, height: 2.2, rx: 0.4, fill: "#ffffff" }, head);
    if (mouth === "evil" || worn.includes("fangs") || creature?.tusks) for (const x of [28.6, 35.4]) make("path", { d: `M${x - 1.3} ${my - 1} L${x} ${my + 2.4} L${x + 1.3} ${my - 1} Z`, fill: "#ffffff" }, head);
    if (mouth === "tongue") shape("ellipse", { cx: 33, cy: my + 6.6, rx: 2.6, ry: 2.6, fill: "#ff7a95", "stroke-width": 1 }, head);
  }
  if (style.accessories?.includes("lipstick")) make("path", { d: `M27 ${my - 1} Q32 ${my + 1.5} 37 ${my - 1}`, fill: "none", stroke: "#d6336c", "stroke-width": 1.2, "stroke-linecap": "round" }, head);
  if (!mini && style.accessories?.includes("stubble")) for (const [dx, dy] of [[-4, 4], [-1, 5], [2, 5], [5, 4], [-6, 2], [7, 2]]) make("circle", { cx: 32 + dx, cy: my + dy, r: 0.45, fill: nmMix(base, "#000000", 0.45) }, head);
  if (style.accessories?.includes("beard") || worn.includes("beard") || creature?.beard) {
    const beard = creature?.beard || hairColour;
    make("path", { d: `M12 ${my + 1.5} C13 ${my + 19} 51 ${my + 19} 52 ${my + 1.5} C45 ${my + 6} 38 ${my + 5} 32 ${my + 7} C26 ${my + 5} 19 ${my + 6} 12 ${my + 1.5} Z`, fill: beard, stroke: nmMix(beard, "#000000", 0.4), "stroke-width": LW, "stroke-linejoin": "round" }, head);
  }
  if (worn.includes("moustache") || style.accessories?.includes("moustache")) make("path", { d: `M32 ${my - 2.4} C29 ${my - 4.6} 24 ${my - 3.6} 23.5 ${my - 0.6} C26 ${my - 2} 29 ${my - 1} 32 ${my - 1.2} C35 ${my - 1} 38 ${my - 2} 40.5 ${my - 0.6} C40 ${my - 3.6} 35 ${my - 4.6} 32 ${my - 2.4} Z`, fill: hairColour === base ? "#2b2a33" : hairColour }, head);
  if (!mini && (style.accessories?.includes("earrings") || creature?.earrings)) for (const sx of [-1, 1]) make("circle", { cx: 32 + sx * 27, cy: 38, r: 1.6, fill: "#f5c518", stroke: "#8a6d00", "stroke-width": 0.6 }, head);

  // --- the extras a mood brings ----------------------------------------------------
  const extras = [...(face.extras || []), ...(reading.intense ? face.louder || [] : [])].filter((extra) => !mini || ["tear", "tear2", "blush"].includes(extra));
  if (!mini && reading.flavours?.includes("doomed")) extras.push("sweat");
  //: The extras that float above the head's right move down beside it
  //: when something sits on the head, so a "zz" never lands on a crown.
  const hatted = worn.some((p) => NAME_MARK_HEAD_KINDS.includes(p)) || style.accessories?.some((bit) => NAME_MARK_HEAD_KINDS.includes(bit)) || creature?.gnomeHat;
  const fx = hatted ? 6 : 0;
  const fy = hatted ? 14 : 0;
  const drop = (x, y, cls) => make("path", { class: cls, d: `M${x} ${y - 3.2} C${x + 2.4} ${y} ${x + 2.4} ${y + 2.4} ${x} ${y + 2.4} C${x - 2.4} ${y + 2.4} ${x - 2.4} ${y} ${x} ${y - 3.2} Z`, fill: "#7cc4f0", stroke: "#3d86b8", "stroke-width": 0.7 }, head);
  if (extras.includes("tear")) drop(32 - spread - 1, eyeY + 7, "nm-tear");
  if (extras.includes("tear2")) drop(32 + spread + 1, eyeY + 7, "nm-tear nm-tear-late");
  if (extras.includes("sweat")) drop(52, 16, "nm-sweat");
  if (extras.includes("sweat2")) drop(12, 18, "nm-sweat");
  if (extras.includes("zz")) {
    const z = make("g", { class: "nm-z" }, head);
    stroke(`M${50 + fx} ${4 + fy} L${55 + fx} ${4 + fy} L${50 + fx} ${9 + fy} L${55 + fx} ${9 + fy}`, z, 1.3);
  }
  if (extras.includes("heart")) heart(54 + fx, 6 + fy, 3.4, "#e8364f", head, "nm-heart");
  if (extras.includes("spark")) star(55 + fx, 7 + fy, 4, "#f5c518", head, "nm-spark");
  if (extras.includes("question")) {
    const q = make("g", { class: "nm-q" }, head);
    stroke(`M${52 + fx} ${3 + fy} C${52 + fx} ${-1 + fy} ${58 + fx} ${-1 + fy} ${58 + fx} ${3 + fy} C${58 + fx} ${6 + fy} ${55 + fx} ${6 + fy} ${55 + fx} ${9 + fy}`, q, 1.6);
    make("circle", { cx: 55 + fx, cy: 12 + fy, r: 0.9, fill: NM_CHAR_INK }, q);
  }
  if (extras.includes("vein")) stroke("M47 11 L50 14 M50 11 L47 14 M49 9 L49 11 M52 12 L50 12", make("g", { class: "nm-vein" }, head), 1.2, "#e8364f");
  if (extras.includes("glint") || extras.includes("glint2")) star(38, my + 1, 1.8, "#ffffff", head, "nm-spark");
  if (extras.includes("stars")) for (const [x, y] of [[14, 6], [32, 0], [50, 6]]) star(x, y, 2.6, "#f5c518", head, "nm-spark nm-spark-late");
  if (extras.includes("bubble")) make("circle", { class: "nm-heart", cx: 44, cy: my + 2, r: 2.4, fill: "#cfe8ff", stroke: "#7cc4f0", "stroke-width": 0.7 }, head);
  if (extras.includes("drool")) drop(36, my + 6, "nm-sweat");
  if (extras.includes("thermometer")) {
    make("rect", { x: 34, y: my - 1, width: 9, height: 2, rx: 1, fill: "#ffffff", stroke: line, "stroke-width": 0.6, transform: `rotate(-18 34 ${my})` }, head);
    make("circle", { cx: 34.5, cy: my, r: 1.3, fill: "#e8364f" }, head);
  }

  // --- what it wears on its head and face --------------------------------------------
  const top = make("g", { class: "nmc-top" }, body);
  const props = worn;
  const eyewear = props.find((p) => NAME_MARK_EYEWEAR_KINDS.includes(p)) || (eyeStyle === "shades" ? "shades" : null);
  if (eyewear && eyes.length === 2) {
    const [lx, ly] = eyes[0];
    const [rx2] = eyes[1];
    const rim = { glasses: "#2b2a33", squareglasses: "#2b2a33", monocle: "#b8860b", goggles: "#6b4a2f", threed: "#f5f4ef", starglasses: "#e36fa6", heartglasses: "#e8364f", visor: "#3fd0e0", shades: "#1c1b22" }[eyewear] || "#2b2a33";
    const g = make("g", { class: "nm-eyewear" }, top);
    if (eyewear === "visor") make("rect", { x: 9, y: ly - 5, width: 46, height: 10, rx: 5, fill: "#3fd0e0", "fill-opacity": 0.75, stroke: "#1b7f8c", "stroke-width": 1.2 }, g);
    else if (eyewear === "shades") {
      for (const x of [lx, rx2]) make("path", { d: `M${x - 6} ${ly - 3.5} L${x + 6} ${ly - 3.5} L${x + 5} ${ly + 3} Q${x} ${ly + 5.5} ${x - 5} ${ly + 3} Z`, fill: rim }, g);
      stroke(`M${lx + 6} ${ly - 3} L${rx2 - 6} ${ly - 3}`, g, 1.4, rim);
      stroke(`M${lx - 3} ${ly - 1.5} L${lx - 1} ${ly - 2.5}`, g, 1, "#ffffff");
    } else if (eyewear === "monocle") {
      make("circle", { cx: rx2, cy: ly, r: 6, fill: "#ffffff", "fill-opacity": 0.15, stroke: rim, "stroke-width": 1.4 }, g);
      stroke(`M${rx2 + 4} ${ly + 5} Q${rx2 + 6} ${ly + 14} ${rx2 + 1} ${ly + 20}`, g, 0.8, rim);
    } else if (eyewear === "starglasses" || eyewear === "heartglasses") {
      for (const x of [lx, rx2]) (eyewear === "starglasses" ? star(x, ly, 7, rim, g) : heart(x, ly, 5.2, rim, g)).setAttribute("fill-opacity", "0.85");
      stroke(`M${lx + 5} ${ly - 1} L${rx2 - 5} ${ly - 1}`, g, 1.2, rim);
    } else {
      const square = eyewear === "squareglasses";
      const lens = eyewear === "threed" ? ["#e8364f", "#3b82f6"] : eyewear === "goggles" ? ["#9fd8ef", "#9fd8ef"] : ["#ffffff", "#ffffff"];
      if (eyewear === "goggles") stroke(`M4 ${ly} L60 ${ly}`, g, 3, "#6b4a2f");
      [lx, rx2].forEach((x, i) => {
        if (square) make("rect", { x: x - 6, y: ly - 5, width: 12, height: 10, rx: 2.5, fill: lens[i], "fill-opacity": 0.18, stroke: rim, "stroke-width": 1.5 }, g);
        else make("circle", { cx: x, cy: ly, r: 6.2, fill: lens[i], "fill-opacity": eyewear === "threed" ? 0.55 : 0.18, stroke: rim, "stroke-width": eyewear === "goggles" ? 2.4 : 1.5 }, g);
      });
      stroke(`M${lx + 6} ${ly - 0.5} Q32 ${ly - 3} ${rx2 - 6} ${ly - 0.5}`, g, 1.4, rim);
    }
  }
  if (props.includes("eyepatch") && eyes.length === 2) {
    const [x, y] = eyes[1];
    stroke(`M8 ${y - 9} L56 ${y + 2}`, top, 1.2, "#1c1b22");
    make("ellipse", { cx: x, cy: y, rx: 5.6, ry: 5, fill: "#1c1b22" }, top);
  }
  if (props.includes("ninjamask")) {
    make("path", { d: `M6 ${my - 5} C12 ${my - 7} 52 ${my - 7} 58 ${my - 5} L56 ${my + 12} C44 ${my + 18} 20 ${my + 18} 8 ${my + 12} Z`, fill: "#2b2a33", stroke: nmLineFor("#2b2a33"), "stroke-width": LW }, top);
    make("path", { d: "M6 14 C16 10 48 10 58 14 L58 19 C48 16 16 16 6 19 Z", fill: "#2b2a33" }, top);
  }
  const headwear = props.find((p) => NAME_MARK_HAT_KINDS.includes(p) || ["halo", "horns", "antenna", "headphones", "helmet"].includes(p));
  const gold = "#f5c518";
  const goldLine = "#9a7300";
  if (props.includes("halo")) make("ellipse", { cx: 32, cy: -6, rx: 14, ry: 3.6, fill: "none", stroke: gold, "stroke-width": 2.4 }, top);
  if (props.includes("horns")) for (const sx of [-1, 1]) make("path", { d: `M${32 + sx * 14} 8 C${32 + sx * 16} 0 ${32 + sx * 20} -3 ${32 + sx * 22} -5 C${32 + sx * 22} 2 ${32 + sx * 21} 6 ${32 + sx * 19} 10 Z`, fill: "#c0392b", stroke: "#6e1f17", "stroke-width": LW, "stroke-linejoin": "round" }, top);
  if (props.includes("antenna") || beast?.antenna) {
    stroke("M32 5 L32 -8", top, 1.6, line);
    make("circle", { cx: 32, cy: -9, r: 3, fill: "#e8364f", stroke: "#7d1426", "stroke-width": 1 }, top);
  }
  if (beast?.antennae) for (const sx of [-1, 1]) {
    stroke(`M${32 + sx * 6} 6 Q${32 + sx * 10} -4 ${32 + sx * 14} -6`, top, 1.4, "#2b2a28");
    make("circle", { cx: 32 + sx * 14, cy: -6, r: 2, fill: "#2b2a28" }, top);
  }
  if (beast?.smallHorns || beast?.unihorn || beast?.bullHorns || beast?.antlers) {
    if (beast.unihorn) make("path", { d: "M28 6 L32 -14 L36 6 Z", fill: gold, stroke: goldLine, "stroke-width": LW, "stroke-linejoin": "round" }, top);
    if (beast.smallHorns) for (const sx of [-1, 1]) make("path", { d: `M${32 + sx * 10} 7 L${32 + sx * 13} -2 L${32 + sx * 16} 8 Z`, fill: beast.smallHorns, stroke: nmMix(beast.smallHorns, "#000000", 0.4), "stroke-width": LW, "stroke-linejoin": "round" }, top);
    if (beast.bullHorns) for (const sx of [-1, 1]) make("path", { d: `M${32 + sx * 20} 12 C${32 + sx * 30} 10 ${32 + sx * 32} 0 ${32 + sx * 28} -6 C${32 + sx * 28} 2 ${32 + sx * 24} 6 ${32 + sx * 18} 7 Z`, fill: "#e8dcc0", stroke: "#7a6a48", "stroke-width": LW, "stroke-linejoin": "round" }, top);
    if (beast.antlers) for (const sx of [-1, 1]) stroke(`M${32 + sx * 10} 6 L${32 + sx * 14} -8 M${32 + sx * 12.5} -3 L${32 + sx * 19} -6 M${32 + sx * 13.6} -6 L${32 + sx * 10} -12`, top, 2.4, beast.antlers);
  }
  if (beast?.tuft) outlined("M30 5 C28 -2 34 -3 32 -7", base, 2.4, top);
  if (creature?.flameCrest) for (const [x, hgt, c] of [[26, -6, "#f28e2c"], [32, -12, "#edc949"], [38, -6, "#e15759"]]) make("path", { d: `M${x - 4} 6 C${x - 4} ${hgt + 6} ${x} ${hgt + 2} ${x} ${hgt} C${x + 2} ${hgt + 4} ${x + 4} ${hgt + 6} ${x + 4} 6 Z`, fill: c }, top);
  if (creature?.gnomeHat || headwear) {
    const kind = creature?.gnomeHat ? "gnome" : headwear;
    const hat = make("g", { class: "nm-hat" }, top);
    const hatColour = pair.cloth[((style.outfitColour || 0) + 1) % pair.cloth.length];
    const hatLine = nmLineFor(hatColour);
    const fill = (d, colour = hatColour, lineColour = hatLine) => make("path", { d, fill: colour, stroke: lineColour, "stroke-width": LW, "stroke-linejoin": "round" }, hat);
    if (kind === "hat") {
      fill("M18 8 C24 -4 30 -18 40 -22 C36 -12 44 -2 48 8 Z", "#5b4bb5", "#2d2366");
      make("ellipse", { cx: 32, cy: 8, rx: 24, ry: 4.4, fill: "#5b4bb5", stroke: "#2d2366", "stroke-width": LW }, hat);
      star(31, -2, 2.4, gold, hat);
      star(38, -10, 1.6, gold, hat);
    } else if (kind === "gnome") {
      fill("M12 12 C18 0 28 -20 38 -24 C36 -12 46 0 52 12 Z", "#e2574c", "#7d231c");
    } else if (kind === "chefhat") {
      for (const [x, y] of [[20, -4], [32, -9], [44, -4]]) make("circle", { cx: x, cy: y, r: 8, fill: "#ffffff", stroke: "#9aa0a6", "stroke-width": LW }, hat);
      fill("M16 -2 L48 -2 L47 9 C38 7 26 7 17 9 Z", "#ffffff", "#9aa0a6");
    } else if (kind === "cowboy") {
      fill("M20 6 C20 -6 26 -8 32 -4 C38 -8 44 -6 44 6 Z", "#a0714f", "#4a3020");
      make("path", { d: "M2 8 C10 14 54 14 62 8 C58 4 50 7 32 7 C14 7 6 4 2 8 Z", fill: "#a0714f", stroke: "#4a3020", "stroke-width": LW, "stroke-linejoin": "round" }, hat);
      make("path", { d: "M20 4 L44 4", stroke: "#4a3020", "stroke-width": 2 }, hat);
    } else if (kind === "partyhat") {
      fill("M22 8 L33 -18 L44 8 Z", "#e36fa6", "#7a1f4f");
      stroke("M26 -1 L40 -1 M29 -8 L37 -8", hat, 1.6, "#f5c518");
      make("circle", { cx: 33, cy: -19, r: 3, fill: gold, stroke: goldLine, "stroke-width": 1 }, hat);
    } else if (kind === "crown") {
      fill("M16 9 L14 -6 L22 1 L32 -10 L42 1 L50 -6 L48 9 Z", gold, goldLine);
      for (const x of [22, 32, 42]) make("circle", { cx: x, cy: 5, r: 1.6, fill: "#e8364f" }, hat);
    } else if (kind === "tiara") {
      fill("M20 8 C22 2 28 -2 32 -6 C36 -2 42 2 44 8 C40 5 24 5 20 8 Z", "#dfe6ee", "#7a8796");
      make("circle", { cx: 32, cy: 0, r: 1.8, fill: "#e36fa6" }, hat);
    } else if (kind === "tricorn") {
      fill("M4 8 C14 -6 22 -8 32 -4 C42 -8 50 -6 60 8 C48 4 16 4 4 8 Z", "#2b2a33", nmLineFor("#2b2a33"));
      make("circle", { cx: 32, cy: 1, r: 2.4, fill: "#f5f4ef" }, hat);
    } else if (kind === "cap") {
      fill("M9 12 C9 -2 20 -6 32 -6 C44 -6 55 -2 55 12 Z");
      make("path", { d: "M40 10 C50 8 62 10 66 14 C58 16 46 14 40 12 Z", fill: hatColour, stroke: hatLine, "stroke-width": LW, "stroke-linejoin": "round" }, hat);
      make("circle", { cx: 32, cy: -6, r: 1.6, fill: hatLine }, hat);
    } else if (kind === "beanie") {
      fill("M8 13 C8 -4 20 -8 32 -8 C44 -8 56 -4 56 13 Z");
      make("rect", { x: 7, y: 8, width: 50, height: 7, rx: 3.5, fill: nmMix(hatColour, "#ffffff", 0.3), stroke: hatLine, "stroke-width": LW }, hat);
      make("circle", { cx: 32, cy: -10, r: 4, fill: "#f5f4ef", stroke: "#9aa0a6", "stroke-width": LW }, hat);
    } else if (kind === "flowercrown") {
      for (const [x, y, c] of [[12, 12, "#e36fa6"], [21, 5, "#f5c518"], [32, 3, "#ffffff"], [43, 5, "#e36fa6"], [52, 12, "#f5c518"]]) {
        for (let i = 0; i < 5; i += 1) {
          const a = (Math.PI * 2 * i) / 5;
          make("circle", { cx: x + Math.cos(a) * 2.2, cy: y + Math.sin(a) * 2.2, r: 1.9, fill: c, stroke: nmMix(c, "#000000", 0.3), "stroke-width": 0.5 }, hat);
        }
        make("circle", { cx: x, cy: y, r: 1.2, fill: "#f28e2c" }, hat);
      }
    } else if (kind === "bandana" || kind === "headband") {
      const band = kind === "bandana" ? "#e2574c" : "#e8364f";
      //: Across the forehead, clear of the brows (at 21.5) and the eyes.
      make("path", { d: "M5 16 C14 9 50 9 59 16 L59 21 C50 14 14 14 5 21 Z", fill: band, stroke: nmMix(band, "#000000", 0.4), "stroke-width": LW }, hat);
      make("path", { d: "M58 16 L66 12 L64 20 Z M58 19 L67 23 L60 25 Z", fill: band, stroke: nmMix(band, "#000000", 0.4), "stroke-width": 1 }, hat);
    } else if (kind === "headphones") {
      make("path", { d: "M8 30 C6 6 58 6 56 30", fill: "none", stroke: "#2b2a33", "stroke-width": 3 }, hat);
      for (const x of [4, 60]) make("rect", { x: x - 4, y: 24, width: 8, height: 13, rx: 4, fill: "#e2574c", stroke: "#2b2a33", "stroke-width": LW }, hat);
    } else if (kind === "helmet") {
      make("circle", { cx: 32, cy: 28, r: 32, fill: "#cfe8ff", "fill-opacity": 0.22, stroke: "#9aa0a6", "stroke-width": 2 }, hat);
      stroke("M12 12 Q18 6 24 5", hat, 1.6, "#ffffff");
    }
  }
  if (style.accessories?.includes("bow") || props.includes("bow")) {
    const g = make("g", { class: "nm-bow" }, top);
    make("path", { d: "M44 4 L38 0 L38 8 Z M44 4 L50 0 L50 8 Z", fill: "#e36fa6", stroke: "#7a1f4f", "stroke-width": 1, "stroke-linejoin": "round" }, g);
    make("circle", { cx: 44, cy: 4, r: 1.6, fill: "#e36fa6", stroke: "#7a1f4f", "stroke-width": 0.8 }, g);
  }
  if (props.includes("sushiclip")) {
    //: Sushi in the hair: the same nigiri, small, pinned at the crown's
    //: right, where a bow would sit.
    nameMarkSushi(make, shape, make("g", { class: "nm-clip", transform: "translate(47 7) rotate(-24) scale(0.66)" }, top));
  }
  if (style.accessories?.includes("flowerclip")) {
    for (let i = 0; i < 5; i += 1) make("circle", { cx: 14 + Math.cos(i * 1.26) * 2.2, cy: 12 + Math.sin(i * 1.26) * 2.2, r: 1.8, fill: "#ffffff", stroke: "#c9c3b8", "stroke-width": 0.5 }, top);
    make("circle", { cx: 14, cy: 12, r: 1.2, fill: "#f5c518" }, top);
  }

  // --- arms in front, and the thing in its hand (the figure only) ------------------
  if (full) {
    const armColour = base;
    const claw = beast?.claws;
    const arms = [["l", "M13.5 56 Q9 61 7.5 67"], ["r", "M50.5 56 Q55 61 56.5 67"]];
    for (const [side, d] of arms) {
      const arm = outlined(d, armColour, 6, body, { class: `nmb-arm nmb-arm-${side}`, "data-pivot": side === "l" ? "13.5 56" : "50.5 56" });
      if (claw) shape("path", { d: side === "l" ? "M7.5 67 L2 70 L6 72 L3 75 L10 72 Z" : "M56.5 67 L62 70 L58 72 L61 75 L54 72 Z", fill: nmMix(base, "#000000", 0.1) }, arm);
      if (side === "r" && reading.hand) nameCharacterHeld(reading.hand, arm, { make, shape, stroke, outlined, star, heart, base, line });
      //: The hand slots: a bell and a lantern held up in the right hand,
      //: the unplugged cable in the left.
      if (side === "r") {
        const note = make("g", { class: "nmp nmp-note" }, arm);
        make("rect", { x: 51, y: 60, width: 11, height: 13, rx: 1.5, fill: "#fffbe6", stroke: "#b8a55a", "stroke-width": LW, transform: "rotate(-10 56.5 66.5)" }, note);
        for (const ly of [64, 67, 70]) make("path", { d: `M53.5 ${ly} L59.5 ${ly - 1}`, stroke: "#c9b56a", "stroke-width": 0.8, "stroke-linecap": "round" }, note);
        const bell = make("g", { class: "nmp nmp-bell" }, arm);
        make("path", { d: "M51.5 73 C51.5 64 61.5 64 61.5 73 L63 75 L50 75 Z", fill: "#f5c518", stroke: "#8a6d00", "stroke-width": LW, "stroke-linejoin": "round" }, bell);
        make("circle", { cx: 56.5, cy: 77, r: 1.6, fill: "#8a6d00" }, bell);
        const lantern = make("g", { class: "nmp nmp-lantern" }, arm);
        make("circle", { class: "nmp-lantern-glow", cx: 56.5, cy: 74, r: 9, fill: "#ffd84a", "fill-opacity": 0.35 }, lantern);
        make("rect", { x: 52.5, y: 69, width: 8, height: 10, rx: 2, fill: "#ffe9a3", stroke: "#6b4a2f", "stroke-width": LW }, lantern);
        make("path", { d: "M54 69 C54 65 59 65 59 69", fill: "none", stroke: "#6b4a2f", "stroke-width": 1.2 }, lantern);
      } else {
        const cable = make("g", { class: "nmp nmp-cable" }, arm);
        make("path", { d: "M7 68 C4 76 12 82 6 90", fill: "none", stroke: "#33323a", "stroke-width": 1.6, "stroke-linecap": "round" }, cable);
        make("rect", { x: 3, y: 64, width: 8, height: 6, rx: 1.4, fill: "#6b7a8f", stroke: "#33323a", "stroke-width": 1 }, cable);
        for (const x of [5, 9]) make("path", { d: `M${x} 64 L${x} 61`, stroke: "#9aa0a6", "stroke-width": 1.2 }, cable);
      }
    }
    //: The head slots: headphones and a nightcap on top, reading glasses on
    //: the face (in the face group, so they follow the eyes).
    const phones = make("g", { class: "nmp nmp-headphones" }, top);
    make("path", { d: "M7 30 C5 3 59 3 57 30", fill: "none", stroke: "#2b2a33", "stroke-width": 3.2, "stroke-linecap": "round" }, phones);
    for (const x of [5, 59]) make("rect", { x: x - 4.5, y: 23, width: 9, height: 14, rx: 4.5, fill: "#e2574c", stroke: "#2b2a33", "stroke-width": LW }, phones);
    const cap = make("g", { class: "nmp nmp-nightcap" }, top);
    make("path", { d: "M9 15 C13 1 30 -5 42 -1 C52 3 59 11 63 24 L57 22 C51 12 41 9 31 11 C23 12 16 14 9 15 Z", fill: "#4f7fd9", stroke: "#23407a", "stroke-width": LW, "stroke-linejoin": "round" }, cap);
    make("path", { d: "M8 16 C18 9 46 7 58 14", fill: "none", stroke: "#f5f4ef", "stroke-width": 4, "stroke-linecap": "round" }, cap);
    make("circle", { cx: 63, cy: 24, r: 3.4, fill: "#f5f4ef", stroke: "#9aa0a6", "stroke-width": 1 }, cap);
    if (eyes.length === 2) {
      const glasses = make("g", { class: "nmp nmp-glasses" }, head);
      for (const [x, y] of eyes) make("circle", { cx: x, cy: y, r: 5.4, fill: "#ffffff", "fill-opacity": 0.18, stroke: "#6b4a2f", "stroke-width": 1.3 }, glasses);
      stroke(`M${eyes[0][0] + 5.4} ${eyes[0][1]} Q32 ${eyes[0][1] - 2.4} ${eyes[1][0] - 5.4} ${eyes[1][1]}`, glasses, 1.2, "#6b4a2f");
    }
  }
  svg.dataset.nmChar = "1";
  return svg;
}

//: A nigiri about (0, 0), about 18 units wide: held in a hand or, scaled
//: down, pinned in the hair.
function nameMarkSushi(make, shape, g) {
  shape("path", { d: "M-8 1.5 C-9 -3 9 -3 8 1.5 C7 4.5 -7 4.5 -8 1.5 Z", fill: "#fbf7ee" }, g);
  shape("path", { d: "M-9.5 -1 C-6 -8 6 -8.5 9.5 -1.5 C5 0.6 -5 0.6 -9.5 -1 Z", fill: "#f58a63" }, g);
  for (const x of [-4.5, -0.5, 4]) make("path", { d: `M${x} -5.6 L${x + 1.6} -1.2`, stroke: "#ffe1d2", "stroke-width": 0.9, "stroke-linecap": "round" }, g);
  make("rect", { x: -1.7, y: -6.4, width: 3.4, height: 10.6, rx: 0.8, fill: "#24352b" }, g);
}

//: The thing in its right hand, drawn about the hand at (56.5, 67). Every
//: kind the name can ask for has a shape; a gesture raises the arm.
function nameCharacterHeld(kind, arm, t) {
  const { make, shape, stroke, outlined, star, heart } = t;
  const hx = 57;
  const hy = 67;
  const g = make("g", { class: "nmc-held" }, arm);
  const wood = "#8a5a2b";
  const steel = "#c9d1d9";
  const pole = (x1, y1, x2, y2, colour = wood, width = 2) => outlined(`M${x1} ${y1} L${x2} ${y2}`, colour, width, g);
  switch (kind) {
    case "mug":
      shape("rect", { x: hx - 1, y: hy - 7, width: 8, height: 9, rx: 2, fill: "#f5f4ef" }, g);
      stroke(`M${hx + 7} ${hy - 5} C${hx + 11} ${hy - 5} ${hx + 11} ${hy} ${hx + 7} ${hy}`, g, 1.4, "#6b7a8f");
      make("path", { class: "nm-steam", d: `M${hx + 2} ${hy - 10} Q${hx + 4} ${hy - 13} ${hx + 2} ${hy - 16}`, fill: "none", stroke: "#9aa0a6", "stroke-width": 1, "stroke-linecap": "round" }, g);
      break;
    case "beer":
      shape("rect", { x: hx - 1, y: hy - 9, width: 8, height: 11, rx: 1.5, fill: "#f0b429" }, g);
      make("path", { d: `M${hx - 1.5} ${hy - 9} C${hx} ${hy - 13} ${hx + 7} ${hy - 13} ${hx + 7.5} ${hy - 9} Z`, fill: "#ffffff" }, g);
      break;
    case "wine":
      shape("path", { d: `M${hx - 2} ${hy - 12} L${hx + 6} ${hy - 12} C${hx + 6} ${hy - 6} ${hx - 2} ${hy - 6} ${hx - 2} ${hy - 12} Z`, fill: "#8e1b3a" }, g);
      stroke(`M${hx + 2} ${hy - 7} L${hx + 2} ${hy - 1} M${hx - 1} ${hy - 1} L${hx + 5} ${hy - 1}`, g, 1, "#9aa0a6");
      break;
    case "book":
      shape("rect", { x: hx - 2, y: hy - 8, width: 10, height: 12, rx: 1.2, fill: "#3b6fb6" }, g);
      stroke(`M${hx} ${hy - 6} L${hx + 6} ${hy - 6}`, g, 1, "#ffffff");
      break;
    case "phone":
      shape("rect", { x: hx - 1, y: hy - 10, width: 7, height: 12, rx: 1.6, fill: "#2b2a33" }, g);
      make("rect", { x: hx, y: hy - 9, width: 5, height: 9, rx: 0.8, fill: "#7cc4f0" }, g);
      break;
    case "flower":
      pole(hx, hy, hx + 2, hy - 12, "#59a14f", 1.2);
      for (let i = 0; i < 5; i += 1) make("circle", { cx: hx + 2 + Math.cos(i * 1.26) * 2.6, cy: hy - 14 + Math.sin(i * 1.26) * 2.6, r: 2.2, fill: "#e36fa6", stroke: "#7a1f4f", "stroke-width": 0.5 }, g);
      make("circle", { cx: hx + 2, cy: hy - 14, r: 1.5, fill: "#f5c518" }, g);
      break;
    case "balloon":
      stroke(`M${hx} ${hy} Q${hx + 4} ${hy - 12} ${hx + 2} ${hy - 22}`, g, 0.8, "#6b7a8f");
      shape("ellipse", { class: "nm-balloon", cx: hx + 2, cy: hy - 28, rx: 6, ry: 7.4, fill: "#e2574c" }, g);
      break;
    case "pizza":
      shape("path", { d: `M${hx - 3} ${hy - 4} L${hx + 11} ${hy - 8} L${hx + 4} ${hy + 5} Z`, fill: "#f5c542" }, g);
      for (const [dx, dy] of [[4, -4], [6, 0]]) make("circle", { cx: hx + dx, cy: hy + dy, r: 1.2, fill: "#c0392b" }, g);
      break;
    case "donut":
      shape("circle", { cx: hx + 3, cy: hy - 4, r: 6, fill: "#e8a0c0" }, g);
      make("circle", { cx: hx + 3, cy: hy - 4, r: 2, fill: "#c86a94", stroke: "#7a1f4f", "stroke-width": 1 }, g);
      break;
    case "sushi":
      //: A nigiri held up: a rice pillow, a salmon slice with its pale
      //: lines, a band of nori round the middle.
      nameMarkSushi(make, shape, make("g", { transform: `translate(${hx + 1.5} ${hy - 4}) rotate(-14)` }, g));
      break;
    case "sword":
      pole(hx, hy + 2, hx + 3, hy - 22, steel, 2.4);
      stroke(`M${hx - 3} ${hy - 2} L${hx + 5} ${hy - 1}`, g, 2, "#8a5a2b");
      break;
    case "spear":
    case "trident":
      pole(hx - 1, hy + 10, hx + 2, hy - 24);
      if (kind === "spear") shape("path", { d: `M${hx + 2} ${hy - 30} L${hx - 1} ${hy - 23} L${hx + 5} ${hy - 23} Z`, fill: steel }, g);
      else stroke(`M${hx - 3} ${hy - 30} L${hx - 3} ${hy - 24} L${hx + 7} ${hy - 24} L${hx + 7} ${hy - 30} M${hx + 2} ${hy - 32} L${hx + 2} ${hy - 24}`, g, 1.6, "#f5c518");
      break;
    case "wand":
      pole(hx - 1, hy + 2, hx + 6, hy - 12, "#2b2a33", 1.6);
      star(hx + 7, hy - 14, 3.4, "#f5c518", g, "nm-spark");
      break;
    case "magnifier":
      pole(hx, hy, hx + 4, hy - 6, "#2b2a33", 1.6);
      make("circle", { cx: hx + 7, cy: hy - 10, r: 4.6, fill: "#cfe8ff", "fill-opacity": 0.5, stroke: "#2b2a33", "stroke-width": 1.6 }, g);
      break;
    case "mic":
      pole(hx, hy, hx + 2, hy - 7, "#2b2a33", 2);
      shape("circle", { cx: hx + 2.5, cy: hy - 10, r: 3.4, fill: "#9aa0a6" }, g);
      break;
    case "controller":
      shape("path", { d: `M${hx - 5} ${hy - 6} C${hx - 7} ${hy + 2} ${hx - 2} ${hy + 3} ${hx} ${hy} L${hx + 6} ${hy} C${hx + 8} ${hy + 3} ${hx + 13} ${hy + 2} ${hx + 11} ${hy - 6} Z`, fill: "#33323a" }, g);
      make("circle", { cx: hx + 7, cy: hy - 3.5, r: 1, fill: "#e2574c" }, g);
      break;
    case "paintbrush":
      pole(hx, hy + 2, hx + 4, hy - 12);
      shape("path", { d: `M${hx + 3} ${hy - 12} L${hx + 6} ${hy - 12} L${hx + 5} ${hy - 18} Z`, fill: "#4e79a7" }, g);
      break;
    case "hammer":
    case "axe":
    case "pickaxe":
      pole(hx, hy + 4, hx + 2, hy - 16);
      if (kind === "hammer") shape("rect", { x: hx - 4, y: hy - 21, width: 12, height: 6, rx: 1.2, fill: "#6b7a8f" }, g);
      else if (kind === "axe") shape("path", { d: `M${hx + 2} ${hy - 16} C${hx + 10} ${hy - 20} ${hx + 12} ${hy - 10} ${hx + 2} ${hy - 10} Z`, fill: steel }, g);
      else shape("path", { d: `M${hx - 8} ${hy - 14} C${hx - 2} ${hy - 22} ${hx + 6} ${hy - 22} ${hx + 12} ${hy - 14} C${hx + 6} ${hy - 18} ${hx - 2} ${hy - 18} ${hx - 8} ${hy - 14} Z`, fill: "#4fd1c5" }, g);
      break;
    case "fishingrod":
      pole(hx, hy + 2, hx + 10, hy - 24, wood, 1.4);
      stroke(`M${hx + 10} ${hy - 24} L${hx + 12} ${hy - 6}`, g, 0.6, "#9aa0a6");
      break;
    case "bow":
      stroke(`M${hx + 2} ${hy - 16} C${hx + 12} ${hy - 8} ${hx + 12} ${hy + 4} ${hx + 2} ${hy + 10}`, g, 1.8, wood);
      stroke(`M${hx + 2} ${hy - 16} L${hx + 2} ${hy + 10}`, g, 0.6, "#dcdcdc");
      break;
    case "blaster":
      shape("path", { d: `M${hx - 3} ${hy - 6} L${hx + 11} ${hy - 6} L${hx + 11} ${hy - 2} L${hx + 3} ${hy - 2} L${hx + 1} ${hy + 3} L${hx - 2} ${hy + 3} Z`, fill: "#7b61c4" }, g);
      break;
    case "tableflip":
      shape("rect", { x: hx + 1, y: hy - 16, width: 12, height: 3, rx: 1, fill: wood, transform: `rotate(-35 ${hx + 7} ${hy - 14})` }, g);
      break;
    case "wave":
    case "thumbsup":
    case "peace":
    case "middlefinger":
      arm.classList.add("nmc-raised");
      if (kind === "thumbsup") shape("ellipse", { cx: hx + 1, cy: hy - 4, rx: 1.6, ry: 3, fill: t.base }, g);
      if (kind === "peace" || kind === "middlefinger") shape("ellipse", { cx: hx + 1, cy: hy - 4, rx: 1.3, ry: 3, fill: t.base }, g);
      if (kind === "peace") shape("ellipse", { cx: hx - 2, cy: hy - 3.5, rx: 1.3, ry: 3, fill: t.base, transform: `rotate(-20 ${hx - 2} ${hy - 3.5})` }, g);
      break;
    default:
      heart(hx + 2, hy - 4, 2.6, "#e8364f", g);
  }
}


// --- what a face does when you meet it ------------------------------------
//: The owner: "maybe the eyes and heads can tilt slightly to follow the
//: user's mouse if toggled?? and they can do something if clicked?? can
//: there also be a way to expand them or have them sit in the corner of the
//: screen ... but it has to be movable or hidable ... so it doesnt get
//: annoying". Four pieces, each behind its own Appearance setting where it
//: could get in the way: a click reaction, a large viewer, eyes that follow
//: the pointer, and a companion in the corner (off until asked for).

//: What a face says when it is poked, by mood. No exclamation marks: the
//: app's copy rule holds for the faces too.
const NAME_MARK_LINES = {
  happy: ["Hi there.", "Good to see you."], excited: ["Let's go.", "Ooh, what are we doing?"],
  sad: ["It's fine. I'm fine.", "..."], angry: ["Hmph.", "What now?"], dramatic: ["Alas.", "The drama of it all."],
  surprised: ["Oh.", "You startled me."], sleepy: ["Five more minutes.", "zzz..."], nervous: ["Is it the deadline?", "Um. Hi."],
  sly: ["I know things.", "Heh."], calm: ["Breathe.", "All is well."], serious: ["Focus.", "Back to work."],
  confused: ["Wait, what?", "Which tab was I on?"], hungry: ["Is it lunch yet?", "Snack break?"], cool: ["Sup.", "Stay cool."],
  love: ["You're doing great.", "Proud of you."], laughing: ["Ha. Good one.", "Stop, I can't."], unimpressed: ["Meh.", "Sure."],
  dizzy: ["Everything is spinning.", "Whoa."], uwu: ["Hewwo.", "Hi hi."], evil: ["Muahaha.", "All according to plan."],
  sick: ["I need soup.", "Achoo."], dead: ["Tell my notes I loved them.", "x_x"], starstruck: ["Wow.", "Amazing."],
  cute: ["Hi.", "Boop."], drunk: ["Heyyy.", "Who moved the floor."], greedy: ["Time is money.", "Stonks."],
};

function nameMarkLine(seed) {
  const reading = nameMood(seed);
  const lines = NAME_MARK_LINES[reading.mood] || ["Hello.", "Need anything?", "Still here."];
  return lines[Math.floor(Math.random() * lines.length)];
}

//: A face drawn to always move (the viewer, the companion, the dashboard):
//: its wrapper is what the CSS reads, not the Avatar animation setting,
//: which is for the faces that sit in lists. Off and Reduce motion still win.
function nameMarkLive(seed, size) {
  const holder = document.createElement("span");
  holder.className = "nm-live";
  holder.appendChild(nameMark(seed, size));
  return holder;
}

//: A poke: a hop and a spin. The class comes off when the animation ends.
function nameMarkReact(svg) {
  if (!svg) return;
  svg.classList.remove("nm-react");
  void svg.getBoundingClientRect();
  svg.classList.add("nm-react");
  setTimeout(() => svg.classList.remove("nm-react"), 800);
}

//: A speech bubble beside a face, for a moment.
function nameMarkSay(anchor, text) {
  if (!anchor) return;
  anchor.querySelector(".nm-say")?.remove();
  const bubble = document.createElement("span");
  bubble.className = "nm-say";
  bubble.setAttribute("role", "status");
  bubble.textContent = text;
  anchor.appendChild(bubble);
  //: Kept inside the window: a face at the edge (the companion at the
  //: right) used to say half its line off screen.
  const box = bubble.getBoundingClientRect();
  const shift = Math.max(0, box.right - (innerWidth - 8)) || -Math.max(0, 8 - box.left);
  if (shift) bubble.style.left = `calc(50% - ${Math.ceil(shift)}px)`;
  setTimeout(() => bubble.remove(), 2600);
}

//: **The large view.** A click on a face that is not part of a control
//: opens it big, animated, with what it was read as, so the joke can be
//: seen at a size where it lands.
function openNameMarkViewer(seed) {
  const opener = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay nm-viewer";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${seed || "Face"}, enlarged`);
  const card = document.createElement("div");
  card.className = "card modal-card nm-viewer-card";
  const stage = document.createElement("button");
  stage.type = "button";
  stage.className = "nm-viewer-stage";
  stage.title = "Poke it";
  //: The whole character, as the companion draws it, at 2.2 times.
  const figure = document.createElement("span");
  figure.className = "nm-viewer-figure";
  figure.appendChild(characterFor(seed).figure());
  stage.appendChild(figure);
  const name = document.createElement("h2");
  name.className = "nm-viewer-name";
  name.textContent = seed || "Unnamed";
  const reading = document.createElement("p");
  reading.className = "muted nm-viewer-reading";
  reading.textContent = nameMarkTitle(nameMood(seed)) || "A face of its own";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost";
  close.textContent = "Close";
  card.append(stage, name, reading, close);
  overlay.appendChild(card);
  const shut = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey, true);
    if (opener && typeof opener.focus === "function") opener.focus();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      shut();
    }
  };
  stage.addEventListener("click", () => {
    nameMarkReact(stage.querySelector(".name-mark"));
    nameMarkSay(stage, nameMarkLine(seed));
  });
  close.addEventListener("click", shut);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) shut();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  close.focus();
}

//: One delegated listener for every face in the app: a poke always, and the
//: large view when the face is not inside a control (a face in the Settings
//: head's profile button still opens the profile, and hops on the way).
document.addEventListener("click", (event) => {
  const svg = event.target.closest?.(".name-mark");
  if (!svg || svg.closest(".nm-viewer, #nm-buddy")) return;
  nameMarkReact(svg);
  if (svg.closest("button, a, [role='button'], label, select, summary")) return;
  openNameMarkViewer(svg.dataset.nmSeed || "");
});

//: **Eyes that follow the pointer**, when Appearance says so. One listener,
//: at most one update a frame, and only the faces on screen (the observer's
//: `data-nm-on`), each nudged by a pair of custom properties the CSS turns
//: into a small eye shift and head tilt. Nothing runs while it is off.
let nameMarkFollowFrame = 0;
let nameMarkPointer = null;
document.addEventListener("pointermove", (event) => {
  if (document.documentElement.dataset.avatarFollow !== "on") return;
  nameMarkPointer = [event.clientX, event.clientY];
  if (nameMarkFollowFrame) return;
  nameMarkFollowFrame = requestAnimationFrame(() => {
    nameMarkFollowFrame = 0;
    const [px, py] = nameMarkPointer;
    const faces = [];
    for (const face of nameMarkOnScreen) {
      if (!face.isConnected) nameMarkOnScreen.delete(face);
      //: Not the companion's: it has its own attention (`nameMarkBuddyNotice`)
      //: and does not follow every move.
      else if (faces.length < 40 && !face.closest("#nm-buddy")) faces.push(face);
    }
    //: Every box read first, then every property written: a write between
    //: two reads forces a style and layout pass per face.
    const boxes = faces.map((face) => face.getBoundingClientRect());
    faces.forEach((face, i) => {
      const box = boxes[i];
      const dx = px - (box.left + box.width / 2);
      const dy = py - (box.top + box.height / 2);
      const reach = Math.max(160, box.width * 3);
      face.style.setProperty("--nm-lx", Math.max(-1, Math.min(1, dx / reach)).toFixed(2));
      face.style.setProperty("--nm-ly", Math.max(-1, Math.min(1, dy / reach)).toFixed(2));
    });
  });
}, { passive: true });

//: **The corner companion.** Off by default; Appearance chooses you, the
//: chat's persona, or nobody. Draggable anywhere (its place is remembered),
//: hidden by its own close button, and it says something when poked.
function nameMarkBuddySeed() {
  const choice = typeof appearancePref === "function" ? appearancePref("avatar-buddy", "off") : "off";
  if (choice === "me") return typeof userMarkSeed === "function" ? userMarkSeed() : "You";
  //: The chat's persona, and Atlas when the chat speaks as the default
  //: voice (an empty picker value). Falling back to the person was the old
  //: rule from before Atlas had a face, and it put you in the corner when
  //: you had asked for the persona.
  if (choice === "persona") return document.getElementById("persona-select")?.value || "Atlas";
  //: Atlas itself, whichever persona the chat is using (the owner: "I want
  //: atlas to be a companion option regardless").
  if (choice === "atlas") return "Atlas";
  return null;
}

//: The companion follows the chat's picker when it is showing the persona.
document.addEventListener("change", (event) => {
  if (event.target?.id === "persona-select" && typeof syncNameMarkBuddy === "function") syncNameMarkBuddy();
});

//: The dashboard's mark, when Appearance swaps the logo for a face: yours,
//: or the persona the greeting speaks as (the chat's own when it matches
//: Chat). Null keeps the logo.
function dashboardMarkSeed() {
  const choice = typeof appearancePref === "function" ? appearancePref("dash-mark", "logo") : "logo";
  if (choice === "me") return typeof userMarkSeed === "function" ? userMarkSeed() : "You";
  if (choice === "persona") {
    return (typeof prefsCache !== "undefined" && prefsCache?.dashboard_persona) || document.getElementById("persona-select")?.value || "Atlas";
  }
  return null;
}


// --- the profile's "Your look" controls ------------------------------------
//: Shuffle, back to the name's own, and six pickers (mood, hair, clothes,
//: headwear, eyewear, holding), each "From your name" by default. Every
//: change redraws your face everywhere at once and marks the profile form
//: unsaved; Save preferences keeps it (`avatar_style`).
const PROFILE_LOOK_PARTS = [
  ["look", "Look", () => ["feminine", "masculine"]],
  ["mood", "Mood", () => ["happy", "excited", "calm", "cool", "cute", "sly", "evil", "sleepy", "dramatic", "love", "laughing", "unimpressed", "surprised", "serious", "nervous", "confused", "hungry", "greedy", "sad", "angry", "starstruck", "uwu", "dizzy", "sick", "dead", "drunk"]],
  ["hair", "Hair", () => ["long", "bob", "pigtails", "buns", "ponytail", "curly", "short", "spiky", "quiff", "buzz"]],
  ["outfit", "Clothes", () => ["tee", "hoodie", "scoop", "collar", "sweater", "blazer", "suit", "dress"]],
  ["hat", "Headwear", () => NAME_MARK_HAT_KINDS],
  ["eyewear", "Eyewear", () => NAME_MARK_EYEWEAR_KINDS],
  ["hand", "Holding", () => Object.keys(NAME_MOOD_LEXICON.hands)],
];
const PROFILE_LOOK_WORDS = {
  hat: "wizard hat", chefhat: "chef's hat", partyhat: "party hat", flowercrown: "flower crown", tricorn: "pirate hat",
  squareglasses: "square glasses", threed: "3D glasses", starglasses: "star shades", heartglasses: "heart shades", visor: "cyber visor",
  thumbsup: "thumbs up", middlefinger: "middle finger", mug: "hot drink", fishingrod: "fishing rod", tableflip: "table flip",
  tee: "T-shirt", scoop: "scoop neck", collar: "shirt and tie", sweater: "jumper", uwu: "uwu",
};

function repaintOwnFace() {
  if (typeof paintUserMarks === "function") paintUserMarks();
  const buddy = document.getElementById("nm-buddy");
  if (buddy) {
    delete buddy.dataset.seed;
    syncNameMarkBuddy();
  }
  if (typeof paintDashEmblem === "function") paintDashEmblem();
}

function mountProfileLook() {
  const host = document.getElementById("profile-look-parts");
  if (!host) return;
  if (!host.childElementCount) {
    for (const [key, label, options] of PROFILE_LOOK_PARTS) {
      const row = document.createElement("label");
      row.className = "profile-look-part";
      const text = document.createElement("span");
      text.className = "muted";
      text.textContent = label;
      const select = document.createElement("select");
      select.className = "small-select";
      select.id = `profile-look-${key}`;
      select.dataset.part = key;
      const auto = new Option("From your name", "");
      const none = new Option("None", "none");
      select.append(auto, none);
      for (const value of options()) {
        const word = PROFILE_LOOK_WORDS[value] || value.replace(/([a-z])([A-Z])/g, "$1 $2");
        select.append(new Option(word.charAt(0).toUpperCase() + word.slice(1), value));
      }
      if (key === "mood") none.textContent = "Plain";
      select.addEventListener("change", () => {
        const style = ownNameMarkStyle();
        style[key] = select.value;
        setOwnNameMarkStyle(style);
        repaintOwnFace();
        if (typeof markPrefsDirty === "function") markPrefsDirty();
      });
      row.append(text, select);
      host.appendChild(row);
    }
    document.getElementById("profile-look-shuffle")?.addEventListener("click", () => {
      const style = ownNameMarkStyle();
      style.variant = ((Number(style.variant) || 0) + 1) % 10000;
      setOwnNameMarkStyle(style);
      repaintOwnFace();
      if (typeof markPrefsDirty === "function") markPrefsDirty();
    });
    document.getElementById("profile-look-reset")?.addEventListener("click", () => {
      setOwnNameMarkStyle({});
      syncProfileLook();
      repaintOwnFace();
      if (typeof markPrefsDirty === "function") markPrefsDirty();
    });
  }
  syncProfileLook();
}

function syncProfileLook() {
  const style = ownNameMarkStyle();
  for (const [key] of PROFILE_LOOK_PARTS) {
    const select = document.getElementById(`profile-look-${key}`);
    if (select) select.value = style[key] || "";
  }
}


// --- the companion ----------------------------------------------------------
//: **A character, not a disc, with somewhere to be on every page** (INBOX
//: 425 b; the owner: "is there a way to make the corner companion more
//: lifelike and less a circle just chilling somewhere on the screen?? give
//: it life", and "set areas are assigned as possible areas for a companion
//: to sit or chill around while not being in the way on every interface and
//: page ... hang from a top bar, sit on a bottom bar, walk a top a feature
//: ... just so I dont move it to one area, and then it is annoying for it
//: to be there on another page").
//:
//: - **The body.** nameMark's face is the head, unchanged; under it a small
//:   body in the face's own two colours (`nameMarkBuddyBody`): a torso in
//:   the ground colour, hands in the head's, arms that hang, wave or hold
//:   on, and legs that stand, dangle or kick.
//: - **Perches.** Per tab, a short list of named places measured from the
//:   interface as it is now (`nameMarkBuddyPerches`): sitting on the bottom
//:   bar, hanging from the top bar's lower edge, standing on a dock or on a
//:   card's top edge. Each is checked against every control it must never
//:   cover (`NAME_MARK_BUDDY_NEVER_COVER`, measured with
//:   getBoundingClientRect), then scored against the text it would hide,
//:   and the tab's own order of preference breaks the tie. Its pose follows
//:   the perch.
//: - **Your spot, per tab.** Dragged somewhere on a tab, it stays there on
//:   that tab (`nm-buddy-spots`, per tab); the other tabs keep choosing.
//:   Dropped just above a surface it lands on it; dropped under the top bar
//:   it hangs from it.
//: - **Life, with one timer.** Between behaviours nothing runs: one
//:   `setTimeout` at a time picks the next (look around, blink, glance at
//:   the pointer, stretch, hop, kick its legs, swing, a yawn when you have
//:   been idle a while, sleep after three minutes), and each is a class the
//:   CSS acts out on transforms. The app's events cue the rest: typing near
//:   it makes it watch, a chat turn makes it think, a saved note makes it
//:   cheer. Nothing runs while the window is hidden or the app is locked,
//:   and Reduce motion or Avatar animation Off keeps it still: it simply
//:   appears at its perch.
const NMB_W = 64;
const NMB_H = 92;
const NMB_HEAD = 52;
//: Where the body meets a ledge, from the top of its box: sitting puts the
//: seat on the edge, standing the soles, hanging the middle of the hands.
const NMB_SEAT = 72;
const NMB_FEET = 90;
const NMB_GRIP = 5;
//: Hanging, the character drops this far below its box's top (the CSS's
//: `top: 12px` on `.nm-buddy-char`) so its arms show between the ledge and
//: its head; the hands are drawn this far above the drawing's top.
const NMB_DROP = 12;
const NMB_GUTTER = 12;
//: Away from the keyboard: drowsy at three minutes, asleep at eight.
const NMB_DROWSY_MS = 3 * 60 * 1000;
const NMB_SLEEP_MS = 8 * 60 * 1000;
const NMB_YAWN_MS = 45 * 1000;

//: What it must never stand in front of. Controls by role and by kind, the
//: chat's composer, the floating buttons that share its corners, toasts,
//: dialogs and open menus.
const NAME_MARK_BUDDY_NEVER_COVER = [
  "a[href]", "button", "input:not([type='hidden'])", "select", "textarea", "summary", "label",
  "[role='button']", "[role='tab']", "[role='link']", "[role='menuitem']", "[role='option']",
  "[role='switch']", "[role='slider']", "[role='checkbox']", "[contenteditable='true']",
  ".cm-editor", ".dock-fab", ".scroll-top.visible", ".chat-jump-latest:not(.hidden)",
  ".toast", ".modal-card", ".action-menu", "video", "iframe",
].join(", ");

//: The order each tab prefers its perches in. Hanging from the top bar
//: suits a page whose top is quiet; sitting on the bottom bar a page that
//: fills the screen (the graph, the timeline); standing on a dock a page
//: whose toolbar has room at its end.
const NAME_MARK_BUDDY_ORDER = {
  dashboard: ["hang", "card", "bar", "under", "dock"],
  notes: ["dock", "under", "bar", "hang", "card"],
  chat: ["hang", "bar", "dock", "card", "under"],
  graph: ["bar", "hang", "dock"],
  library: ["dock", "under", "bar", "hang", "card"],
  documents: ["dock", "bar", "hang", "card", "under"],
  timeline: ["bar", "hang", "dock", "card", "under"],
  reminders: ["card", "under", "hang", "bar", "dock"],
};

//: **Its behaviours, as a small game AI** (the owner: "more diverse
//: movement and actions, maybe they hang from the roof like a sloth or
//: with one hand or from their feet, maybe they are shy and hiding with
//: their eyes peeking behind some ui panels ... just like a game ai").
//: A weighted pick, one decision every 4 to 12 seconds from the one timer:
//: `ms` is how long a behaviour runs, `w` its base weight, `cool` how long
//: before it may run again, `poses` where it makes sense (`legs: "out"`
//: only with its legs over the edge, `edge: "top"` only on a panel's top
//: edge, which is what it hides behind to peek). `nameMarkBuddyDecide`
//: multiplies the weights by the moment: how long since you last did
//: anything, the hour, what the app just did, and the character's own mood
//: and species (`NAME_MARK_BUDDY_MOODS`, `NAME_MARK_BUDDY_KINDS`). A weight
//: of 0 is a behaviour only an event starts.
const NAME_MARK_BUDDY_ACTS = {
  blink: { ms: 700, w: 3, cool: 5000, poses: ["stand", "sit", "hang", "float", "lean"] },
  look: { ms: 2600, w: 3, cool: 12000, poses: ["stand", "sit", "hang", "float", "lean"] },
  turn: { ms: 3400, w: 2, cool: 14000, poses: ["stand", "sit", "float", "lean"] },
  glance: { ms: 1800, w: 2, cool: 8000, poses: ["stand", "sit", "hang", "float", "lean"] },
  stretch: { ms: 1600, w: 1, cool: 45000, poses: ["stand", "sit", "float"] },
  yawn: { ms: 2200, w: 0, cool: 40000, poses: ["stand", "sit", "hang", "float", "lean"] },
  nap: { ms: 30000, w: 0, cool: 150000, poses: ["stand", "sit", "hang", "float", "lean"] },
  hop: { ms: 800, w: 1, cool: 20000, poses: ["stand", "float"] },
  wave: { ms: 1500, w: 1, cool: 30000, poses: ["stand", "sit", "float", "lean"] },
  scratch: { ms: 2600, w: 1, cool: 30000, poses: ["stand", "sit", "hang", "lean"] },
  dangle: { ms: 6000, w: 5, cool: 5000, poses: ["sit"], legs: "out" },
  kick: { ms: 1600, w: 2, cool: 12000, poses: ["sit"], legs: "out" },
  peek: { ms: 14000, w: 2, cool: 70000, poses: ["sit", "stand"], edge: "top" },
  swing: { ms: 2600, w: 3, cool: 8000, poses: ["hang"] },
  sloth: { ms: 9000, w: 2, cool: 30000, poses: ["hang"] },
  onehand: { ms: 4200, w: 2, cool: 20000, poses: ["hang"] },
  feet: { ms: 7000, w: 1, cool: 45000, poses: ["hang"] },
  emerge: { ms: 800, w: 0, cool: 0, poses: ["sit", "stand"] },
  cheer: { ms: 1300, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
  startle: { ms: 700, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
  land: { ms: 450, w: 0, cool: 0, poses: ["stand", "sit", "float"] },
  shift: { ms: 1800, w: 2, cool: 9000, poses: ["stand", "sit", "lean"] },
  wake: { ms: 1400, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
  bell: { ms: 3000, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
  carry: { ms: 2400, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
  lantern: { ms: 3000, w: 0, cool: 0, poses: ["stand", "sit", "hang", "float", "lean"] },
};

//: How a character's mood leans its choices (multipliers on the weights).
const NAME_MARK_BUDDY_MOODS = {
  sleepy: { yawn: 3, nap: 3, sloth: 3, hop: 0.3 },
  sick: { yawn: 2, nap: 2, hop: 0.3, kick: 0.5 },
  drunk: { sloth: 2, swing: 2, hop: 0.5 },
  excited: { hop: 2.5, wave: 2, kick: 2 },
  happy: { hop: 1.5, wave: 1.5, dangle: 1.5 },
  laughing: { hop: 2, kick: 2 },
  cute: { wave: 2, peek: 1.5, dangle: 1.5 },
  uwu: { wave: 2, peek: 2 },
  love: { wave: 2, glance: 2 },
  nervous: { peek: 3, look: 2, hop: 0.5 },
  sad: { peek: 2, nap: 1.5, hop: 0.3 },
  confused: { look: 2, scratch: 3 },
  sly: { peek: 2.5, feet: 2, onehand: 2 },
  evil: { peek: 2, feet: 2.5 },
  cool: { onehand: 2.5, feet: 1.5, turn: 2 },
  dramatic: { stretch: 2.5, wave: 2 },
  starstruck: { hop: 2, glance: 2 },
  serious: { hop: 0.4, kick: 0.5 },
  unimpressed: { turn: 2, yawn: 2 },
  hungry: { scratch: 1.5, look: 1.5 },
};

//: And its species.
const NAME_MARK_BUDDY_KINDS = {
  sloth: { sloth: 5, nap: 2, hop: 0.2 },
  monkey: { onehand: 3, feet: 2, swing: 2 },
  bat: { feet: 6 },
  cat: { stretch: 3, nap: 2, peek: 2 },
  owl: { look: 3 },
  bunny: { hop: 3 },
  frog: { hop: 3 },
  koala: { sloth: 3, nap: 2 },
  hedgehog: { peek: 3 },
  mouse: { peek: 3 },
  ghost: { peek: 2 },
};

const nmb = {
  x: NaN, y: NaN, pose: "", legs: "", perch: "", tab: "", act: "", lastAct: "", timer: 0,
  lastInput: Date.now(), lastCheer: 0, lastPoke: 0, pointer: null, watchTimer: 0, watchAt: 0,
  cueTimer: 0, startledAt: 0, errandTimer: 0, readingErrand: false, shyAt: 0, shyTimer: 0, readTimer: 0, keyAt: 0, keyRun: 0,
  trail: 0, ex: 0, ey: 0, target: null, targetAt: 0, lastMove: null, headTimer: 0, releaseTimer: 0,
  leanSide: "", leanAt: 0, stirAt: 0, groggyUntil: 0, grumpyUntil: 0, pokes: [],
  mood: { energy: 0.7, curiosity: 0.6, sociability: 0.7 }, edgeType: "", edgeLine: 72, reading: null, cool: {},
  anim: null, hopAnim: null, anchor: null, anchorTop: 0, settle: [], checkFrame: 0,
};

//: The companion's own reading of Reduce motion and Avatar animation Off:
//: no travel and no behaviours, it simply appears where it is going. The
//: system's own hint stops the travel too (a walk across the screen is the
//: one motion here that moves something large), and leaves the small
//: behaviours to the CSS, which calms them like every other face.
function nameMarkBuddyStill() {
  const root = document.documentElement;
  return root.dataset.avatarMotion === "off" || root.dataset.motion === "reduced";
}
function nameMarkBuddyNoTravel() {
  return nameMarkBuddyStill() || (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function nameMarkShade(hex, t) {
  const to = t > 0 ? 0 : 255;
  const k = Math.min(1, Math.abs(t));
  return `#${[1, 3, 5]
    .map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - k) + to * k).toString(16).padStart(2, "0"))
    .join("")}`;
}

//: The body's two colours come from the face it is drawn under: the ground
//: for the clothes, the head for the hands. Atlas wears its accent.
function nameMarkBuddyColours(svg) {
  const hex = (value) => (/^#[0-9a-f]{6}$/i.test(value || "") ? value : null);
  if (svg?.classList.contains("nm-atlas")) {
    const accent = hex(typeof currentAccentHex === "function" ? currentAccentHex() : "") || "#6d5dfc";
    return { coat: nameMarkShade(accent, 0.15), skin: nameMarkShade(accent, -0.55) };
  }
  const coat = hex(svg?.querySelector(":scope > g > rect")?.getAttribute("fill")) || "#4e79a7";
  const skin = hex(svg?.querySelector(".nm-body > :is(rect, circle, ellipse, path)")?.getAttribute("fill")) || "#f1c9a5";
  return { coat, skin };
}

//: The body, drawn at 1:1 in the same 64 by 92 box as the whole character,
//: behind the head. The arms that hold on reach up either side of the head
//: and only their hands show above it, which is what hanging from an edge
//: looks like from the front.
function nameMarkBuddyBody(coat, skin) {
  const ns = "http://www.w3.org/2000/svg";
  const make = (tag, attrs, parent) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
    if (parent) parent.appendChild(el);
    return el;
  };
  const deep = nameMarkShade(coat, 0.3);
  const svg = make("svg", {
    class: "nmb-body", viewBox: `0 0 ${NMB_W} ${NMB_H}`, width: NMB_W, height: NMB_H,
    "aria-hidden": "true", focusable: "false",
  });
  const limb = (d, colour, width, parent) =>
    make("path", { d, fill: "none", stroke: colour, "stroke-width": width, "stroke-linecap": "round" }, parent);
  for (const [side, hip, foot] of [["l", 27.5, 26], ["r", 36.5, 38]]) {
    const leg = make("g", { class: `nmb-leg nmb-leg-${side}`, "data-pivot": `${hip} 68` }, svg);
    limb(`M${hip} 68 L${foot} 84.5`, deep, 5.5, leg);
    make("ellipse", { cx: foot + (side === "l" ? -1.5 : 1.5), cy: 86.5, rx: 5.2, ry: 3.2, fill: deep }, leg);
  }
  for (const [side, d, hx] of [["l", "M22 54 C 0 52, -6 16, 6 -6", 6], ["r", "M42 54 C 64 52, 70 16, 58 -6", 58]]) {
    const hold = make("g", { class: `nmb-hold nmb-hold-${side}`, "data-pivot": side === "l" ? "22 54" : "42 54" }, svg);
    limb(d, coat, 5, hold);
    make("circle", { cx: hx, cy: NMB_GRIP - NMB_DROP, r: 4.4, fill: skin, stroke: deep, "stroke-width": 0.8 }, hold);
  }
  make("rect", { class: "nmb-torso", x: 19, y: 43, width: 26, height: 31, rx: 12, fill: coat, stroke: deep, "stroke-width": 1 }, svg);
  make("ellipse", { cx: 32, cy: 63, rx: 7.5, ry: 6.5, fill: "#ffffff", "fill-opacity": 0.22 }, svg);
  for (const [side, d, hx, hy] of [["l", "M21.5 54 Q 14.5 59.5 13.8 66.5", 13.8, 68.2], ["r", "M42.5 54 Q 49.5 59.5 50.2 66.5", 50.2, 68.2]]) {
    const arm = make("g", { class: `nmb-arm nmb-arm-${side}`, "data-pivot": side === "l" ? "21.5 54" : "42.5 54" }, svg);
    limb(d, coat, 5, arm);
    make("circle", { cx: hx, cy: hy, r: 3.9, fill: skin, stroke: deep, "stroke-width": 0.8 }, arm);
  }
  return svg;
}

//: The built-in figure (the character interface's `figure()`): the head
//: mark over a body in its own two colours, in the companion's 64 by 92
//: box.
function nameCharacterFigure(seed) {
  const figure = document.createElement("span");
  figure.className = "nm-figure nm-live";
  const own = JSON.stringify(nameMarkOwnFor(seed) || {});
  figure.appendChild(nameMarkCompose(`fig|${seed}|${own}|${nameMarkLookLean() || ""}`, () => drawCharacter(seed, NMB_W, "figure"), { parts: NM_FIGURE_PARTS, pad: 24, size: NMB_W, height: NMB_H }));
  return figure;
}

function nameMarkFigure(seed) {
  const figure = document.createElement("span");
  figure.className = "nm-figure";
  const head = document.createElement("span");
  head.className = "nm-buddy-head";
  const live = nameMarkLive(seed, NMB_HEAD);
  head.appendChild(live);
  const { coat, skin } = nameMarkBuddyColours(live.querySelector(".name-mark"));
  const body = nameMarkCompose(`body|${coat}|${skin}`, () => nameMarkBuddyBody(coat, skin), { parts: ".nmb-leg, .nmb-arm, .nmb-hold", pad: 16, size: NMB_W, height: NMB_H });
  figure.append(body, head);
  return figure;
}

function nameMarkBuddyTab() {
  for (const name of typeof TABS !== "undefined" ? TABS : []) {
    const page = document.getElementById(`tab-${name}`);
    if (page && !page.classList.contains("hidden")) return name;
  }
  return "app";
}

function nameMarkBuddyShown(el) {
  if (!el) return null;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth ? box : null;
}

//: The two ledges every page has: the top bar's lower edge and the bottom
//: bar's upper one (the phone's tab dock where it has one).
function nameMarkBuddyLedges() {
  return {
    top: nameMarkBuddyShown(document.getElementById("top-bar")),
    bottom: nameMarkBuddyShown(document.getElementById("phone-tab-dock")) || nameMarkBuddyShown(document.getElementById("status-bar")),
  };
}

//: Every box it must stay clear of, measured once per placement: the tab's
//: own controls, the chrome's, and whatever floats over the page.
function nameMarkBuddyObstacles(tab) {
  nameMarkBuddyTextCache = new WeakMap();
  const roots = [
    document.getElementById(`tab-${tab}`), document.getElementById("top-bar"), document.getElementById("status-bar"),
    document.getElementById("phone-tab-dock"), document.getElementById("toast-box"), document.querySelector(".pointer-menu-host"),
    ...document.querySelectorAll(".modal-overlay:not(.hidden), .dock-fab, #scroll-top, .chat-jump-latest"),
  ];
  const boxes = [];
  for (const root of roots) {
    if (!root) continue;
    const found = root.matches(NAME_MARK_BUDDY_NEVER_COVER) ? [root] : [];
    for (const el of [...found, ...root.querySelectorAll(NAME_MARK_BUDDY_NEVER_COVER)]) {
      if (el.closest("#nm-buddy")) continue;
      const box = nameMarkBuddyShown(el);
      if (box) boxes.push(box);
    }
  }
  return boxes;
}

//: The parts of the character that are actually drawn, as boxes: the head
//: and the body (down to its seat when its legs are tucked), and the hands
//: above the head when it hangs.
function nameMarkBuddyShape(x, y, pose, legs = "") {
  if (legs === "peek") return [{ left: x + 8, top: y + NMB_SEAT - 36, right: x + 56, bottom: y + NMB_SEAT }];
  const drop = pose === "hang" ? NMB_DROP : 0;
  let bottom = y + drop + NMB_FEET;
  //: Standing or sitting tucked, it touches the edge it is on and nothing
  //: under it: a control can be its floor (a tile, a toolbar), never
  //: something it covers.
  if (pose === "stand") bottom -= 8;
  if (pose === "sit" && legs === "tuck") bottom = y + NMB_SEAT - 5;
  const shape = [
    { left: x + 5, top: y + drop, right: x + 59, bottom: y + drop + NMB_HEAD },
    { left: x + 8, top: y + drop + 43, right: x + 56, bottom },
  ];
  //: The arms that hold on, from just under the ledge.
  if (pose === "hang") shape.push({ left: x - 4, top: y + NMB_GRIP + 1, right: x + 68, bottom: y + drop + 30 });
  return shape;
}

function nameMarkBuddyHits(x, y, pose, obstacles, legs = "") {
  const gap = 4;
  for (const part of nameMarkBuddyShape(x, y, pose, legs)) {
    for (const box of obstacles) {
      if (part.right > box.left - gap && part.left < box.right + gap && part.bottom > box.top - gap && part.top < box.bottom + gap) return true;
    }
  }
  return false;
}

//: The share of the character that would sit over words or pictures,
//: sampled at a dozen points of its shape: a perch over an empty stretch
//: of card beats one over a paragraph.
function nameMarkBuddyCovers(x, y, pose, legs = "") {
  const drop = pose === "hang" ? NMB_DROP : 0;
  const points = [];
  for (const fx of [10, 24, 40, 54]) for (const fy of [8, 22, 36, 48]) points.push([x + fx, y + drop + fy]);
  points.push([x + 32, y + drop + 58], [x + 24, y + drop + 72], [x + 40, y + drop + 72]);
  if (legs !== "tuck") points.push([x + 32, y + drop + 84]);
  //: Tucked behind the bar only its eyes show.
  if (legs === "peek") {
    points.length = 0;
    for (const fx of [10, 24, 40, 54]) for (const fy of [NMB_SEAT - 30, NMB_SEAT - 14]) points.push([x + fx, y + fy]);
  }
  let covered = 0;
  for (const [px, py] of points) {
    if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) continue;
    const el = document.elementsFromPoint(px, py).find((node) => !node.closest("#nm-buddy"));
    if (!el || el === document.body || el === document.documentElement) continue;
    //: A picture counts; a canvas or a drawing the size of a pane (the
    //: graph, a board) is a ground, not a picture, or every perch over it
    //: would lose to one over the chrome.
    if (el.matches("img, picture, video")) {
      covered += 1;
      continue;
    }
    if (el.matches("svg, canvas")) {
      const box = el.getBoundingClientRect();
      if (box.width < 200 && box.height < 200) covered += 1;
      continue;
    }
    //: Words, measured as the boxes their lines actually take: a heading is
    //: a block the width of its card, and only its first few hundred pixels
    //: have anything in them.
    if (nameMarkBuddyTextBoxes(el).some((box) => px >= box.left - 3 && px <= box.right + 3 && py >= box.top - 3 && py <= box.bottom + 3)) covered += 1;
  }
  return covered / points.length;
}

//: The line boxes of an element's own words, kept for one placement (the
//: map is dropped with each `nameMarkBuddyObstacles` call).
let nameMarkBuddyTextCache = new WeakMap();
function nameMarkBuddyTextBoxes(el) {
  let boxes = nameMarkBuddyTextCache.get(el);
  if (boxes) return boxes;
  boxes = [];
  const range = document.createRange();
  for (const node of el.childNodes) {
    if (node.nodeType !== 3 || !node.textContent.trim()) continue;
    range.selectNodeContents(node);
    boxes.push(...range.getClientRects());
  }
  nameMarkBuddyTextCache.set(el, boxes);
  return boxes;
}

//: **Surfaces and their edges** (the owner: "sit on panels and dangle their
//: legs", then "why can atlas only be on some panels or hang from some
//: areas and not on other areas of the page or other panels??"). Every
//: visible surface on the tab is a candidate: cards, panels, widgets, docks
//: and toolbars, sidebars, headers, groups of rows, rows of chips and tabs.
//: Each gives a top edge to sit or stand on, an underside to hang from and
//: two sides to lean on. The list is one pass of getBoundingClientRect over
//: a bounded set of selectors, kept until the tab changes, the window
//: resizes or scrolls, or the tab page changes size (a ResizeObserver).
const NAME_MARK_BUDDY_SURFACES = [
  ".card", ".dock", ".dash-hero", ".dash-widget", ".widget", ".panel", ".settings-group", "aside", "header", "nav",
  "section", "form", "[role='toolbar']", "[role='tablist']", ".toolbar", ".sidebar", ".chip-row", ".chips",
  ".entry-list", ".msg", ".chat-composer", ".library-card", ".note-card", ".empty-state",
].join(", ");
const NMB_SURFACE_CAP = 80;
let nameMarkBuddyIndex = null;
let nameMarkBuddyIndexObserver = null;

function nameMarkBuddyIndexReset() {
  nameMarkBuddyIndex = null;
}

//: The tab's surfaces, found by walking it rather than by naming them all:
//: every element on screen at least 96 by 24 that draws a surface of its
//: own (a background, a border or a shadow), is one of the named kinds
//: above, or is a wide control (a tile, a big button: it can be stood on,
//: never covered). Bounded: eight levels deep, 600 elements looked at.
function nameMarkBuddySurfaceWalk(page) {
  const found = [];
  if (!page) return found;
  let looked = 0;
  const walk = (el, depth) => {
    for (const child of el.children) {
      if (looked >= 600 || found.length >= NMB_SURFACE_CAP) return;
      looked += 1;
      if (child.id === "nm-buddy") continue;
      const box = child.getBoundingClientRect();
      if (box.width < 96 || box.height < 24 || box.bottom < 0 || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
      let surface = child.matches(NAME_MARK_BUDDY_SURFACES) || (child.matches("button, a[href], [role='button']") && box.width >= 96);
      if (!surface) {
        const cs = getComputedStyle(child);
        surface = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.borderTopWidth !== "0px" || cs.boxShadow !== "none";
      }
      if (surface) found.push([child, box]);
      if (depth < 8 && !child.matches("button, a[href], [role='button'], svg, canvas")) walk(child, depth + 1);
    }
  };
  walk(page, 0);
  return found;
}

function nameMarkBuddyEdges(tab) {
  if (nameMarkBuddyIndex && nameMarkBuddyIndex.tab === tab) return nameMarkBuddyIndex.edges;
  const { top, bottom } = nameMarkBuddyLedges();
  const floor = top ? top.bottom : 0;
  const ceiling = bottom ? bottom.top : innerHeight;
  const edges = [];
  if (top) edges.push({ el: document.getElementById("top-bar"), type: "under", kind: "hang", y: top.bottom, left: top.left, right: top.right, top: top.top, bottom: top.bottom });
  if (bottom) {
    const dock = document.getElementById("phone-tab-dock");
    const el = nameMarkBuddyShown(dock) ? dock : document.getElementById("status-bar");
    edges.push({ el, type: "top", kind: "bar", y: bottom.top, left: bottom.left, right: bottom.right, top: bottom.top, bottom: bottom.bottom });
  }
  const page = document.getElementById(`tab-${tab}`);
  //: Two surfaces whose edges fall on the same line (a card and the list
  //: inside it) are one edge to stand on.
  const same = (type, y, left, right) => edges.some((e) => e.type === type && Math.abs(e.y - y) < 4 && Math.min(e.right, right) - Math.max(e.left, left) > (right - left) * 0.7);
  let count = 0;
  for (const [el, box] of nameMarkBuddySurfaceWalk(page)) {
    const kind = el.matches(".dock, [role='toolbar'], [role='tablist'], .toolbar, nav, header, .dash-toolbar") ? "dock" : "card";
    const span = { el, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    if (box.top > floor + 20 && box.top < ceiling - 20 && !same("top", box.top, box.left, box.right)) edges.push({ ...span, type: "top", kind, y: box.top });
    if (box.bottom > floor + 20 && box.bottom + NMB_H + 8 < ceiling && !same("under", box.bottom, box.left, box.right)) edges.push({ ...span, type: "under", kind: "under", y: box.bottom });
    if (box.height >= 80) edges.push({ ...span, type: "side", kind: "side" });
    count += 1;
    if (count >= NMB_SURFACE_CAP) break;
  }
  nameMarkBuddyIndex = { tab, edges };
  if (page && typeof ResizeObserver === "function") {
    if (!nameMarkBuddyIndexObserver) nameMarkBuddyIndexObserver = new ResizeObserver(nameMarkBuddyIndexReset);
    nameMarkBuddyIndexObserver.disconnect();
    nameMarkBuddyIndexObserver.observe(page);
  }
  return edges;
}
window.addEventListener("resize", nameMarkBuddyIndexReset, { passive: true });
document.addEventListener("scroll", nameMarkBuddyIndexReset, { passive: true, capture: true });

//: What it can do at a place on an edge: on a top edge sit with its legs
//: over (the owner's "dangle their legs"), sit with them tucked where they
//: would cover something, or stand; under one, hang.
function nameMarkBuddyStances(edge, x) {
  if (edge.type === "under") return [{ pose: "hang", legs: "", x, y: edge.y - NMB_GRIP }];
  if (edge.type !== "top") return [];
  return [
    { pose: "sit", legs: "", x, y: edge.y - NMB_SEAT },
    { pose: "sit", legs: "tuck", x, y: edge.y - NMB_SEAT, alt: 0.2 },
    { pose: "stand", legs: "", x, y: edge.y - NMB_FEET + 1, alt: 0.4 },
    //: The last resort on the bottom bar, for a small window with nowhere
    //: free: tucked behind the bar with only its eyes over the edge
    //: (`legs: "peek"`), ducking when the pointer comes near.
    ...(edge.kind === "bar" ? [{ pose: "sit", legs: "peek", x, y: edge.y - NMB_SEAT, alt: 7 }] : []),
  ];
}

//: The tab's candidate perches, in its own order of preference: each edge
//: kind at a few places along it from the right-hand end, every stance.
function nameMarkBuddyPerches(tab) {
  const { top } = nameMarkBuddyLedges();
  const floor = top ? top.bottom : 0;
  const lo = NMB_GUTTER;
  const hi = innerWidth - NMB_GUTTER - NMB_W;
  const along = (from, to, step, limit) => {
    const xs = [];
    for (let x = to; x >= from && xs.length < limit; x -= step) xs.push(Math.round(x));
    return xs;
  };
  const edges = nameMarkBuddyEdges(tab);
  const order = NAME_MARK_BUDDY_ORDER[tab] || ["bar", "hang", "dock", "card", "under"];
  const out = [];
  order.forEach((kind, rank) => {
    let i = 0;
    let used = 0;
    for (const edge of edges) {
      if (edge.kind !== kind) continue;
      //: The first dozen of each kind, top of the page first: enough to
      //: choose from, and a placement stays a few milliseconds.
      used += 1;
      if (used > 12) break;
      const wide = kind === "bar" || kind === "hang";
      const xs = along(Math.max(lo, edge.left + (wide ? 0 : 8)), Math.min(hi, edge.right - (wide ? 0 : 8) - NMB_W), wide ? 40 : 48, wide ? 40 : 5);
      for (const x of xs) {
        for (const stance of nameMarkBuddyStances(edge, x)) {
          //: Nothing but the top bar's own underside may put it over the
          //: top bar.
          if (stance.y < floor + 2 && !(kind === "hang")) continue;
          out.push({ ...stance, kind, edge, anchor: kind === "bar" || kind === "hang" ? null : edge.el, rank, i });
          i += 1;
        }
      }
    }
  });
  return out;
}

//: The best free perch: never over a control, then the least text hidden,
//: then the tab's preference, then the right-hand end. The perch it is on
//: already wins a close call, so a page that shifts a little does not send
//: it pacing.
function nameMarkBuddyChoose(tab, obstacles) {
  let best = null;
  let scored = 0;
  for (const perch of nameMarkBuddyPerches(tab)) {
    if (perch.x < 0 || perch.y < 0 || perch.y + NMB_H > innerHeight + 2) continue;
    if (nameMarkBuddyHits(perch.x, perch.y, perch.pose, obstacles, perch.legs)) continue;
    const covers = nameMarkBuddyCovers(perch.x, perch.y, perch.pose, perch.legs);
    const here = perch.kind === nmb.perch && perch.pose === nmb.pose && Math.abs(perch.x - nmb.x) < 24 && Math.abs(perch.y - nmb.y) < 24;
    //: Any words under it at all cost more than a step along the ledge:
    //: sampling is sparse, and one hit is usually a word half hidden.
    perch.score = 100 - (covers ? 25 + covers * 120 : 0) - perch.rank * 9 - perch.i * 0.2 - (perch.alt || 0) * 3 + (here ? 4 : 0);
    if (!best || perch.score > best.score) best = perch;
    scored += 1;
    if ((covers === 0 && perch.rank === 0) || scored >= 36) break;
  }
  if (best) return best;
  //: Nothing is free (a small window full of controls): the bottom corner,
  //: standing clear of the bar.
  const { bottom } = nameMarkBuddyLedges();
  return { kind: "corner", pose: "stand", legs: "", x: innerWidth - NMB_GUTTER - NMB_W, y: (bottom ? bottom.top : innerHeight) - NMB_FEET - NMB_GUTTER };
}

function nameMarkBuddySpots() {
  try {
    const spots = JSON.parse(localStorage.getItem("nm-buddy-spots") || "{}");
    return spots && typeof spots === "object" ? spots : {};
  } catch (e) {
    return {};
  }
}

function nameMarkBuddyKeepSpots(spots) {
  try {
    localStorage.setItem("nm-buddy-spots", JSON.stringify(spots));
  } catch (e) {
    // Remembered for this visit only; the companion stays where it is.
  }
}

//: A path back to a panel from the nearest ancestor with an id, so a spot
//: kept on it finds the same panel after a reload.
function nameMarkBuddySelector(el) {
  if (!el) return "";
  const parts = [];
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    if (node.id) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    let nth = 1;
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
      if (sib.tagName === node.tagName) nth += 1;
    }
    parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${nth})`);
  }
  return parts.join(" > ");
}

//: **What is kept of a spot you chose: the surface, not the pixels.** The
//: panel's selector, which of its edges, and how far along it from the
//: nearer end, so it stays on that panel when the layout moves or the
//: window resizes; a spot in open air keeps its place held to the nearer
//: window edges.
function nameMarkBuddySpotFor(spot) {
  const edge = spot.edge;
  if (edge?.el && ["top", "under", "side"].includes(edge.type)) {
    const fromRight = spot.x + NMB_W / 2 > (edge.left + edge.right) / 2;
    return {
      sel: nameMarkBuddySelector(edge.el), type: edge.type, side: spot.side || "", pose: spot.pose, legs: spot.legs || "",
      fromRight, along: Math.round(fromRight ? edge.right - spot.x : spot.x - edge.left), dy: Math.round(spot.y - edge.top),
    };
  }
  return { x: Math.round(spot.x), y: Math.round(spot.y), pose: spot.pose, legs: spot.legs || "", w: innerWidth, h: innerHeight };
}

//: A kept spot, for the page as it is now; null when its panel is gone,
//: and the tab's own best perch is used instead.
function nameMarkBuddyRestore(spot) {
  const clampX = (x) => Math.min(Math.max(0, x), innerWidth - NMB_W);
  const clampY = (y) => Math.min(Math.max(0, y), innerHeight - NMB_H);
  if (spot.sel) {
    let el = null;
    try {
      el = document.querySelector(spot.sel);
    } catch (e) {
      el = null;
    }
    const box = nameMarkBuddyShown(el);
    if (!box) return null;
    const edge = { el, type: spot.type, left: box.left, right: box.right, top: box.top, bottom: box.bottom, y: spot.type === "under" ? box.bottom : box.top };
    let x = spot.fromRight ? box.right - Number(spot.along) : box.left + Number(spot.along);
    let y = box.top + Number(spot.dy);
    if (spot.type === "under") y = box.bottom - NMB_GRIP;
    else if (spot.type === "top") y = box.top - (spot.pose === "sit" ? NMB_SEAT : NMB_FEET - 1);
    else x = spot.side === "left" ? box.left - NMB_W + 6 : box.right - 6;
    return { kind: "yours", pose: spot.pose, legs: spot.legs || "", side: spot.side || "", x: clampX(x), y: clampY(y), edge, anchor: el };
  }
  const w = Number(spot.w) || innerWidth;
  const h = Number(spot.h) || innerHeight;
  const x = Number(spot.x) + NMB_W / 2 > w / 2 ? innerWidth - (w - Number(spot.x)) : Number(spot.x);
  const y = Number(spot.y) + NMB_H / 2 > h / 2 ? innerHeight - (h - Number(spot.y)) : Number(spot.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { kind: "yours", pose: "float", legs: "", x: clampX(x), y: clampY(y) };
}

//: Your spot, unless something has come up under it since (the back-to-top
//: button, a toast): then the nearest free place along the same line, for
//: as long as it is there. The spot itself is kept.
function nameMarkBuddyStepAside(spot, obstacles) {
  if (!nameMarkBuddyHits(spot.x, spot.y, spot.pose, obstacles, spot.legs)) return spot;
  for (let d = 16; d <= 320; d += 16) {
    for (const x of [spot.x - d, spot.x + d]) {
      if (x < 0 || x > innerWidth - NMB_W) continue;
      if (!nameMarkBuddyHits(x, spot.y, spot.pose, obstacles, spot.legs)) return { ...spot, x };
    }
  }
  return spot;
}

//: **Where it lands when you let go** (the owner: "the surfaces I can drag
//: atlas onto are either at the top or bottom and nowhere else"): the
//: nearest surface edge within 80px of where it was let go, in any
//: direction, that it can take without covering a control: sitting or
//: standing on a top edge, hanging from an underside, leaning on a side.
//: Measured from the part of it that would touch the edge (its seat, its
//: soles, its hands, its side). With nothing that close it falls to the
//: first top edge under it; with nothing under it at all it floats where it
//: was let go.
function nameMarkBuddyDrop(x, y) {
  const tab = nameMarkBuddyTab();
  const obstacles = nameMarkBuddyObstacles(tab);
  const edges = nameMarkBuddyEdges(tab);
  const cx = x + NMB_W / 2;
  const fits = (spot) => spot.x >= 0 && spot.x <= innerWidth - NMB_W && spot.y >= 0 && spot.y <= innerHeight - NMB_H + 8
    && !nameMarkBuddyHits(spot.x, spot.y, spot.pose, obstacles, spot.legs);
  const touch = { sit: NMB_SEAT, stand: NMB_FEET, hang: NMB_GRIP };
  let best = null;
  const consider = (spot, d) => {
    if (d > 80 || (best && d >= best.d)) return;
    const free = fits(spot) ? spot : nameMarkBuddyStepAside({ ...spot }, obstacles);
    if (fits(free) && Math.abs(free.x - spot.x) <= 48) best = { ...free, d: d + Math.abs(free.x - spot.x) / 4 };
  };
  for (const edge of edges) {
    if (edge.type === "side") {
      const middle = y + 46;
      if (middle < edge.top || middle > edge.bottom) continue;
      const ly = Math.min(Math.max(y, edge.top), edge.bottom - NMB_H);
      consider({ kind: "yours", pose: "lean", side: "left", legs: "", x: edge.left - NMB_W + 6, y: ly, edge }, Math.abs(x + NMB_W - 6 - edge.left) + 12);
      consider({ kind: "yours", pose: "lean", side: "right", legs: "", x: edge.right - 6, y: ly, edge }, Math.abs(x + 6 - edge.right) + 12);
      continue;
    }
    //: Along the edge: where it is, held inside the edge's own length.
    const along = Math.min(Math.max(cx, edge.left + NMB_W / 2 - 8), edge.right - NMB_W / 2 + 8);
    const dx = Math.abs(along - cx);
    for (const stance of nameMarkBuddyStances(edge, along - NMB_W / 2)) {
      if (stance.legs === "peek") continue;
      const dy = Math.abs(y + touch[stance.pose] - edge.y);
      consider({ kind: "yours", ...stance, edge }, Math.hypot(dx, dy) + (stance.alt || 0) * 10);
    }
  }
  if (best) return best;
  let fall = null;
  for (const edge of edges) {
    if (edge.type !== "top" || cx < edge.left || cx > edge.right) continue;
    const sx = Math.min(Math.max(x, edge.left - 16), edge.right - NMB_W + 16);
    for (const stance of nameMarkBuddyStances(edge, sx)) {
      if (stance.y < y || stance.legs === "peek") continue;
      const d = stance.y - y + (stance.alt || 0) * 10;
      //: A little along the edge is still "below": the nearest free place
      //: within 96px of where it was let go.
      const spot = fits(stance) ? stance : nameMarkBuddyStepAside({ ...stance }, obstacles);
      if (Math.abs(spot.x - sx) > 96 || !fits(spot)) continue;
      if (!fall || d < fall.d) fall = { kind: "yours", ...spot, edge, d, falls: true };
    }
  }
  //: Nothing under it to stand on: it floats where it was let go, stepped
  //: aside if that is over a control.
  return fall || nameMarkBuddyStepAside({ kind: "yours", pose: "float", legs: "", x, y }, obstacles);
}

//: Moves it, walking when it has somewhere to go: the move is a
//: `translate` animated on the compositor from where it was, with a jump
//: arc on the character when it changes level, and legs that step. Reduce
//: motion and Avatar animation Off skip straight to the end.
function nameMarkBuddyMoveTo(buddy, spot, instant = false) {
  const x = Math.round(Math.min(Math.max(0, spot.x), innerWidth - NMB_W));
  const y = Math.round(Math.min(Math.max(0, spot.y), innerHeight - NMB_H));
  //: **Never a teleport** (the owner: "let the companions appear smoothly
  //: not just appear suddenly in different locations"): a move that starts
  //: while another is under way starts from where it is drawn now, not from
  //: where the last one was going.
  let was = { x: nmb.x, y: nmb.y };
  if (nmb.anim && nmb.anim.playState === "running") {
    const box = buddy.getBoundingClientRect();
    was = { x: box.left, y: box.top };
  }
  nmb.x = x;
  nmb.y = y;
  nmb.perch = spot.kind || "";
  nmb.spot = spot;
  nmb.anchor = spot.anchor || null;
  nmb.anchorTop = spot.anchor ? spot.anchor.getBoundingClientRect().top : 0;
  nmb.edgeType = spot.edge?.type || "";
  //: Where its panel's top edge crosses it, for peeking from behind it.
  nmb.edgeLine = spot.pose === "sit" ? NMB_SEAT : NMB_FEET - 1;
  buddy.style.setProperty("--nmb-edge", `${nmb.edgeLine}px`);
  buddy.dataset.perch = nmb.perch;
  buddy.style.left = `${x}px`;
  buddy.style.top = `${y}px`;
  const poseChanged = buddy.dataset.pose !== spot.pose;
  buddy.dataset.pose = spot.pose;
  buddy.dataset.legs = spot.legs || "";
  buddy.dataset.side = spot.side || "";
  nmb.pose = spot.pose;
  nmb.legs = spot.legs || "";
  const dx = was.x - x;
  const dy = was.y - y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (Math.abs(dx) < 1 && Math.abs(dy) < 1)) return;
  nmb.anim?.cancel();
  nmb.hopAnim?.cancel();
  if (instant || typeof buddy.animate !== "function") return;
  const distance = Math.hypot(dx, dy);
  nameMarkBuddyAct("");
  const char = buddy.querySelector(".nm-buddy-char");
  //: Far (over 700px), or with Reduce motion: it fades out where it was and
  //: back in at the new place with a small drop, rather than crossing the
  //: page. Reduce motion gets the fade alone.
  if (distance > 700 || nameMarkBuddyNoTravel()) {
    const still = nameMarkBuddyNoTravel();
    nmb.anim = buddy.animate([
      { opacity: 1, translate: `${dx}px ${dy}px` },
      { opacity: 0, translate: `${dx}px ${dy}px`, offset: 0.4 },
      { opacity: 0, translate: still ? "0px 0px" : "0px -12px", offset: 0.45 },
      { opacity: 1, translate: "0px 0px" },
    ], { duration: still ? 360 : 640, easing: "ease-in-out" });
    return;
  }
  //: Let go over open space, it falls: gravity's curve, straight down,
  //: and a squash where it lands.
  if (spot.falls) {
    const duration = Math.round(Math.min(700, 180 + Math.sqrt(Math.abs(dy)) * 30));
    nmb.anim = buddy.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration, easing: "cubic-bezier(0.55, 0, 1, 0.45)" });
    nmb.anim.onfinish = () => nameMarkBuddyAct("land");
    return;
  }
  const duration = Math.round(Math.min(900, 400 + distance * 0.75));
  buddy.style.setProperty("--nmb-lean", dx > 0 ? "-1" : "1");
  buddy.dataset.turn = dx > 0 ? "l" : "r";
  buddy.classList.add("nmb-walking");
  nmb.anim = buddy.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration, easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
  const done = () => {
    buddy.classList.remove("nmb-walking");
    delete buddy.dataset.turn;
  };
  nmb.anim.onfinish = done;
  nmb.anim.oncancel = done;
  const arc = Math.abs(dy) > 36 || poseChanged ? Math.min(80, 24 + Math.abs(dy) * 0.12) : 0;
  if (arc && char) {
    nmb.hopAnim = char.animate(
      [{ translate: "0px 0px", easing: "cubic-bezier(0.2, 0.8, 0.4, 1)" }, { translate: `0px ${-arc}px`, offset: 0.45, easing: "cubic-bezier(0.6, 0, 0.8, 0.6)" }, { translate: "0px 0px" }],
      { duration },
    );
  }
}

//: Chooses where it belongs on this tab now and goes there: your spot on
//: this tab (or everywhere) while its panel is there, else the tab's best
//: perch.
function placeNameMarkBuddy(buddy = document.getElementById("nm-buddy"), instant = false) {
  if (!buddy || buddy.classList.contains("nm-buddy-dragging")) return;
  const tab = nameMarkBuddyTab();
  const obstacles = nameMarkBuddyObstacles(tab);
  const spots = nameMarkBuddySpots();
  const own = spots[tab] || spots["*"];
  nmb.tab = tab;
  const restored = own ? nameMarkBuddyRestore(own) : null;
  const spot = restored ? nameMarkBuddyStepAside(restored, obstacles) : nameMarkBuddyChoose(tab, obstacles);
  nameMarkBuddyMoveTo(buddy, spot, instant);
}

//: The cheap check (a placement's worth of rects, no sampling unless it
//: has to move): still on this tab, still clear, still on its panel.
function nameMarkBuddyCheck() {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || buddy.classList.contains("nm-buddy-dragging") || buddy.classList.contains("nmb-walking")) return;
  const tab = nameMarkBuddyTab();
  const anchorMoved = nmb.anchor && (!nmb.anchor.isConnected || Math.abs(nmb.anchor.getBoundingClientRect().top - nmb.anchorTop) > 2);
  const justPlaced = Date.now() - (nmb.placedAt || 0) < 30000;
  if (tab !== nmb.tab || (anchorMoved && !justPlaced) || nameMarkBuddyHits(nmb.x, nmb.y, nmb.pose, nameMarkBuddyObstacles(tab), nmb.legs)) {
    nmb.moves = (nmb.moves || 0) + 1;
    nmb.moveWhy = tab !== nmb.tab ? "tab" : anchorMoved && !justPlaced ? "panel moved" : "covering a control";
    placeNameMarkBuddy(buddy);
  }
}

function queueNameMarkBuddyCheck() {
  if (nmb.checkFrame || !document.getElementById("nm-buddy")) return;
  nmb.checkFrame = requestAnimationFrame(() => {
    nmb.checkFrame = 0;
    nameMarkBuddyCheck();
  });
}

//: A tab switch (app.js's `revealTab` calls this): a first look once the
//: tab is drawn, and a second once its content has had time to arrive,
//: which only moves it if the first choice is now in the way.
function nameMarkBuddyTabChanged() {
  nameMarkBuddyIndexReset();
  if (!document.getElementById("nm-buddy")) return;
  for (const timer of nmb.settle) clearTimeout(timer);
  //: Once the tabs have stopped changing (someone moving through the
  //: notebook fast is not asking it to follow every stop): 450ms after the
  //: last change it chooses, and once more when the content is in; the
  //: perch it took stays unless a clearly better one appeared.
  nmb.settle = [
    setTimeout(() => placeNameMarkBuddy(), 450),
    setTimeout(() => placeNameMarkBuddy(), 1400),
  ];
}

// --- its behaviours -----------------------------------------------------------

function nameMarkBuddyAct(act, ms) {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy) return;
  const was = nmb.act;
  if (was) buddy.classList.remove(`nmb-act-${was}`);
  if (act !== "emerge") buddy.classList.remove("nmb-duck");
  if (was === "turn" || was === "glance") delete buddy.dataset.turn;
  nmb.act = "";
  clearTimeout(nmb.timer);
  clearTimeout(nmb.shyTimer);
  nmb.timer = 0;
  //: Out from behind the panel before anything else.
  if (was === "peek" && act !== "emerge" && !nameMarkBuddyStill()) act = act || "emerge";
  if (!act) {
    nameMarkBuddySchedule();
    return;
  }
  const spec = NAME_MARK_BUDDY_ACTS[act];
  if (act === "glance") nameMarkBuddyAim(nmb.pointer);
  if (act === "look" || act === "nap") nameMarkBuddyRelease();
  if (act === "turn" || act === "glance") {
    const lx = act === "glance" && nmb.pointer ? nmb.pointer[0] - (nmb.x + NMB_W / 2) : Math.random() - 0.5;
    buddy.dataset.turn = lx < 0 ? "l" : "r";
  }
  //: A class removed and added in one frame does not restart its animation,
  //: so the same act twice in a row (a second cheer) forces one style pass;
  //: any other act does not, since each style pass here is measurable.
  if (act === was) void buddy.offsetWidth;
  buddy.classList.add(`nmb-act-${act}`);
  nmb.act = act;
  nmb.lastAct = act;
  if (spec?.cool) nmb.cool[act] = Date.now() + spec.cool;
  nmb.timer = setTimeout(() => {
    const next = act === "land" && nmb.afterLand ? "look" : "";
    if (act === "land") nmb.afterLand = false;
    nameMarkBuddyAct(next);
  }, (ms || spec?.ms || 1200) * (act === "land" ? 1 : 1 + Math.random() * 0.3));
}

//: **Looks at a place: a saccade, then the head.** The eyes jump there at
//: once; the head follows 150 to 300ms later on a spring curve, and only as
//: far as a head turns (a dead zone below 0.15, so a small jitter moves
//: nothing). Everything is three custom properties on `#nm-buddy`
//: (`--nmb-ex`, `--nmb-ey` for the eyes, `--nmb-hx` for the head), read by
//: the CSS while `nmb-attend` is on; no frame loop.
function nameMarkBuddyAim(point) {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy) return;
  let lx = 0;
  let ly = 0;
  if (point) {
    const dx = point[0] - (nmb.x + NMB_W / 2);
    const dy = point[1] - (nmb.y + NMB_HEAD / 2 + (nmb.pose === "hang" ? NMB_DROP : 0));
    const reach = Math.max(160, Math.hypot(dx, dy));
    lx = Math.max(-1, Math.min(1, (dx / reach) * 1.6));
    ly = Math.max(-1, Math.min(1, (dy / reach) * 1.6));
  }
  if (Math.abs(lx - nmb.ex) < 0.15 && Math.abs(ly - nmb.ey) < 0.15) return;
  nmb.ex = lx;
  nmb.ey = ly;
  buddy.style.setProperty("--nmb-ex", lx.toFixed(2));
  buddy.style.setProperty("--nmb-ey", ly.toFixed(2));
  buddy.classList.add("nmb-attend");
  clearTimeout(nmb.headTimer);
  const groggy = Date.now() < nmb.groggyUntil;
  nmb.headTimer = setTimeout(() => {
    buddy.style.setProperty("--nmb-hx", (lx * 0.8).toFixed(2));
  }, (groggy ? 450 : 150) + Math.random() * 150);
}

//: Stops whatever it is doing, at once and without a follow-on: grabbed.
function nameMarkBuddyHalt(buddy) {
  if (nmb.act) buddy.classList.remove(`nmb-act-${nmb.act}`);
  nmb.act = "";
  nmb.afterLand = false;
  clearTimeout(nmb.timer);
  clearTimeout(nmb.shyTimer);
  nmb.timer = nmb.shyTimer = 0;
  buddy.classList.remove("nmb-walking", "nmb-sleep", "nmb-drowsy", "nmb-duck", "nmb-stir", "nmb-arrive");
  delete buddy.dataset.turn;
  if (buddy.dataset.legs === "peek") buddy.dataset.legs = nmb.legs = "";
}

//: Lets its attention go: eyes and head drift back to rest.
function nameMarkBuddyRelease() {
  const buddy = document.getElementById("nm-buddy");
  clearTimeout(nmb.releaseTimer);
  nmb.releaseTimer = 0;
  nmb.target = null;
  nmb.ex = nmb.ey = 0;
  nmb.leanSide = "";
  if (!buddy) return;
  buddy.classList.remove("nmb-attend");
  buddy.style.setProperty("--nmb-hx", "0");
  if (!buddy.classList.contains("nmb-walking") && nmb.act !== "turn") delete buddy.dataset.turn;
}

function nameMarkBuddySchedule() {
  clearTimeout(nmb.timer);
  nmb.timer = 0;
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || document.hidden || nameMarkBuddyStill() || buddy.classList.contains("nmb-sleep")) return;
  //: Calm (the owner: "fewer, longer, calmer behaviours at rest"):
  //: something every 20 to 60 seconds; between them it breathes and blinks
  //: on the compositor and nothing runs here.
  nmb.timer = setTimeout(nameMarkBuddyTick, 20000 + Math.random() * 40000);
}

//: The weighted pick: every behaviour that suits where it is and is off
//: its cooldown, weighted by the moment. No layout is read here: the pose,
//: the perch and the times are all kept in `nmb`.
function nameMarkBuddyDecide(now = Date.now(), hour = new Date().getHours()) {
  const idle = now - nmb.lastInput;
  const night = hour >= 22 || hour < 6;
  const reading = nmb.reading || {};
  const byMood = NAME_MARK_BUDDY_MOODS[reading.mood] || {};
  const byKind = NAME_MARK_BUDDY_KINDS[reading.animal] || {};
  const pool = [];
  let total = 0;
  for (const [act, spec] of Object.entries(NAME_MARK_BUDDY_ACTS)) {
    if (!spec.poses.includes(nmb.pose)) continue;
    if (spec.legs === "out" && nmb.legs) continue;
    //: Tucked behind the bottom bar, only what its eyes can do.
    if (nmb.legs === "peek" && !["blink", "look", "glance", "yawn", "nap"].includes(act)) continue;
    if (spec.edge && nmb.edgeType !== spec.edge) continue;
    if ((nmb.cool[act] || 0) > now || act === nmb.lastAct) continue;
    let w = spec.w;
    if (act === "yawn") w = idle > NMB_YAWN_MS ? 4 : night ? 2 : 0;
    if (act === "nap") w = idle > 90 * 1000 ? 3 : night ? 1 : 0;
    if (act === "glance" && !nmb.pointer) w = 0;
    w *= (byMood[act] || 1) * (byKind[act] || 1);
    //: Its own slow mood: energy, curiosity and sociability (0 to 1).
    const { energy, curiosity, sociability } = nmb.mood;
    if (["hop", "kick", "dangle", "wave", "stretch", "swing", "onehand", "feet"].includes(act)) w *= 0.4 + energy;
    if (["yawn", "nap", "sloth"].includes(act)) w *= 1.6 - energy;
    if (["look", "glance", "peek", "scratch"].includes(act)) w *= 0.5 + curiosity;
    if (["wave", "glance"].includes(act)) w *= 0.4 + sociability;
    if (["peek", "turn"].includes(act)) w *= 1.4 - sociability;
    if (now < nmb.grumpyUntil && ["wave", "glance", "hop", "cheer"].includes(act)) w = 0;
    //: Ignored for twenty minutes while you are busy: it tries for your
    //: attention with a wave.
    if (act === "wave" && now - nmb.lastPoke > 20 * 60 * 1000 && idle < 30000) w *= 4;
    if (night && ["hop", "wave", "kick"].includes(act)) w *= 0.5;
    if (now - nmb.lastCheer < 60000 && ["hop", "wave", "kick", "dangle"].includes(act)) w *= 2;
    if (now - nmb.lastPoke < 20000 && ["glance", "wave", "look"].includes(act)) w *= 2;
    if (w > 0) {
      pool.push([act, w]);
      total += w;
    }
  }
  let roll = Math.random() * total;
  for (const [act, w] of pool) {
    roll -= w;
    if (roll <= 0) return act;
  }
  return pool.length ? pool[pool.length - 1][0] : "blink";
}

//: The one timer: every few seconds, one decision, and a check that its
//: perch is still clear.
function nameMarkBuddyTick() {
  nmb.timer = 0;
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || document.hidden || nameMarkBuddyStill()) return;
  const locked = document.getElementById("lock-overlay") && !document.getElementById("lock-overlay").classList.contains("hidden");
  if (locked || buddy.classList.contains("nm-buddy-dragging") || buddy.classList.contains("nmb-walking") || buddy.classList.contains("nmb-think")) {
    nameMarkBuddySchedule();
    return;
  }
  nameMarkBuddyCheck();
  const idle = Date.now() - nmb.lastInput;
  nameMarkBuddyContext(buddy);
  if (idle > NMB_SLEEP_MS) {
    buddy.classList.remove("nmb-drowsy");
    buddy.classList.add("nmb-sleep");
    nameMarkBuddyRelease();
    return;
  }
  buddy.classList.toggle("nmb-drowsy", idle > NMB_DROWSY_MS);
  const hour = new Date().getHours();
  const night = hour >= 22 || hour < 6;
  const energyTarget = (night ? 0.3 : 0.75) - Math.min(0.3, idle / (20 * 60 * 1000));
  const drift = (value, toward) => value + (toward - value) * 0.1;
  nmb.mood.energy = drift(nmb.mood.energy, energyTarget);
  nmb.mood.curiosity = drift(nmb.mood.curiosity, 0.6);
  nmb.mood.sociability = drift(nmb.mood.sociability, 0.7);
  nameMarkBuddyAct(nameMarkBuddyDecide());
}

//: The app's own events, for the companion to react to: `think` while a
//: chat turn runs, `cheer` when a note is saved or an answer lands,
//: `startle` when one fails.
function nameMarkBuddyCue(cue, from = "") {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy) return;
  buddy.classList.toggle("nmb-think", cue === "think");
  //: A long answer: after a few seconds of thinking it puts on its reading
  //: glasses and follows along until the answer lands.
  clearTimeout(nmb.readTimer);
  if (cue === "think" && NMB_PROPS_DRAWN) {
    nmb.readTimer = setTimeout(() => {
      buddy.classList.add("nmb-reading");
      if (nameMarkBuddyChatErrand()) nmb.readingErrand = true;
    }, 4000);
  } else {
    buddy.classList.remove("nmb-reading");
    if (nmb.readingErrand) {
      nmb.readingErrand = false;
      clearTimeout(nmb.errandTimer);
      nmb.errandTimer = setTimeout(() => placeNameMarkBuddy(), 4000);
    }
  }
  if (cue === "cheer" || cue === "carry") nmb.lastCheer = Date.now();
  if ((cue === "bell" || cue === "lantern") && !NMB_PROPS_DRAWN) return;
  if (cue === "think" || cue === "rest" || nameMarkBuddyStill() || document.hidden) return;
  //: **A start only for a real error, and rarely** (the owner: "atlas
  //: startles a lot and it's kinda distracting ... because I navigate
  //: through the notebook so fast"): only an error toast may startle it,
  //: and at most once in two minutes; Atlas's own surprised face does not.
  if (cue === "startle" && (from !== "error" || Date.now() - nmb.startledAt < 120000)) return;
  //: **Reactions wait a moment** and the latest wins: an event is acted on
  //: 1.5s after it, unless another has come since, so a burst of them
  //: (moving fast through the notebook) is one reaction or none.
  clearTimeout(nmb.cueTimer);
  nmb.cueTimer = setTimeout(() => {
    nmb.cueTimer = 0;
    if (!buddy.isConnected || nameMarkBuddyStill() || document.hidden || buddy.classList.contains("nm-buddy-dragging")) return;
    if (cue === "startle") nmb.startledAt = Date.now();
    buddy.classList.remove("nmb-sleep", "nmb-drowsy");
    if (cue === "bell" && nameMarkBuddyBellErrand()) return;
    if (NAME_MARK_BUDDY_ACTS[cue]) nameMarkBuddyAct(cue);
  }, 1500);
}

//: Input keeps the idle clock at zero; a click is also something it may
//: notice, if it is near.
for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, (event) => {
    nameMarkBuddyAwake();
    if (type === "pointerdown" && !event.target?.closest?.("#nm-buddy")) nameMarkBuddyNotice(event.clientX, event.clientY, Date.now(), "click");
  }, { passive: true, capture: true });
}

//: Any input starts the idle clock again and lifts drowsiness. It does not
//: wake a sleeper: only something close and sudden might
//: (`nameMarkBuddyStir`), or being picked up or poked.
function nameMarkBuddyAwake() {
  nmb.lastInput = Date.now();
  document.getElementById("nm-buddy")?.classList.remove("nmb-drowsy");
}

function nameMarkBuddyWake() {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy) return;
  const slept = buddy.classList.contains("nmb-sleep") || nmb.act === "nap";
  buddy.classList.remove("nmb-sleep", "nmb-drowsy");
  if (!slept) return;
  //: Groggy for a few seconds: slower to look, heavier lids.
  nmb.groggyUntil = Date.now() + 5000;
  buddy.classList.add("nmb-groggy");
  setTimeout(() => buddy.classList.remove("nmb-groggy"), 5000);
  if (!nameMarkBuddyStill() && !document.hidden) nameMarkBuddyAct("wake");
}

//: **Stirred in its sleep** by a fast flick or a click close by: most of the
//: time an ear twitch and a mumble, and back to sleep; sometimes it wakes.
function nameMarkBuddyStir() {
  const now = Date.now();
  if (now - nmb.stirAt < 4000) return;
  nmb.stirAt = now;
  const buddy = document.getElementById("nm-buddy");
  if (!buddy) return;
  if (Math.random() < 0.3) {
    nameMarkBuddyWake();
    return;
  }
  buddy.classList.add("nmb-stir");
  setTimeout(() => buddy.classList.remove("nmb-stir"), 700);
}

//: **Attention, not pointer-follow** (the owner: "if the companion is
//: sleeping they dont move with every mouse movement ... so their body isnt
//: constantly twitching ... like realistic npcs"). Called at most ten times
//: a second from the pointer, and on a click. Asleep, it only notices
//: something fast or a click within 120px (and then may only stir). Drowsy,
//: only the sudden. Awake, it notices the pointer within 220px, or
//: anything fast or clicked within 300 to 400px; it picks a look target and
//: holds it, choosing again only when the pointer has gone 80px from it
//: (and not sooner than about 0.7s, slower when groggy) or something
//: louder happens. Out of range for a moment, it lets go. A target held
//: well to one side for 1.5s turns its body that way.
function nameMarkBuddyNotice(x, y, now, salient = "") {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || nameMarkBuddyStill() || document.hidden || buddy.classList.contains("nm-buddy-dragging")) return;
  const cx = nmb.x + NMB_W / 2;
  const cy = nmb.y + NMB_HEAD / 2 + (nmb.pose === "hang" ? NMB_DROP : 0);
  const dist = Math.hypot(x - cx, y - cy);
  const last = nmb.lastMove;
  const speed = last && now > last[2] ? (Math.hypot(x - last[0], y - last[1]) / (now - last[2])) * 1000 : 0;
  nmb.lastMove = [x, y, now];
  if (buddy.classList.contains("nmb-sleep") || nmb.act === "nap") {
    if ((speed > 2500 && dist < 120) || (salient === "click" && dist < 120)) nameMarkBuddyStir();
    return;
  }
  const loud = (speed > 1800 && dist < 400) || (salient && dist < 300);
  if (buddy.classList.contains("nmb-drowsy") && !loud) return;
  if (dist > 220 && !loud) {
    if (buddy.classList.contains("nmb-attend") && !nmb.releaseTimer) nmb.releaseTimer = setTimeout(nameMarkBuddyRelease, 1200 + Math.random() * 1200);
    return;
  }
  clearTimeout(nmb.releaseTimer);
  nmb.releaseTimer = 0;
  if (nmb.grumpyUntil > now) return;
  const t = nmb.target;
  const wait = (now < nmb.groggyUntil ? 1500 : 700) * (0.75 + Math.random() * 0.5);
  if (!loud && t && (Math.hypot(x - t[0], y - t[1]) < 80 || now - nmb.targetAt < wait)) return;
  nmb.target = [x, y];
  nmb.targetAt = now;
  nameMarkBuddyAim([x, y]);
  const side = nmb.ex < -0.7 ? "l" : nmb.ex > 0.7 ? "r" : "";
  if (side !== nmb.leanSide) {
    nmb.leanSide = side;
    nmb.leanAt = now;
  } else if (side && now - nmb.leanAt > 1500 && !buddy.classList.contains("nmb-walking")) {
    buddy.dataset.turn = side;
  }
}

//: A scroll counts as being here, at most once a second.
document.addEventListener("scroll", () => {
  if (Date.now() - nmb.lastInput > 1000) nameMarkBuddyAwake();
}, { passive: true, capture: true });

// --- errands ------------------------------------------------------------------------
//: **Things it does with a purpose** (the owner: "atlas and the companions
//: need better ai and behaviour and abilities"), each rare, calm and tied to
//: what the app is doing. A reminder falling due: it goes to the Reminders
//: tab's button (or the notifications bell), hangs by it, looks at it and
//: holds up its bell, then goes back. A chat answer being written while the
//: chat is open: it sits on the composer's edge and reads along, and goes
//: back when the answer has landed. A saved note: it holds up a tiny note.
//: Something new on screen (a toast): it looks at it. None of them moves a
//: companion you put somewhere in the last thirty seconds.
function nameMarkBuddyErrand(spot, act, forMs, look) {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || nameMarkBuddyStill() || document.hidden || buddy.classList.contains("nm-buddy-dragging")) return false;
  if (Date.now() - (nmb.placedAt || 0) < 30000) return false;
  const obstacles = nameMarkBuddyObstacles(nameMarkBuddyTab());
  const free = nameMarkBuddyHits(spot.x, spot.y, spot.pose, obstacles, spot.legs) ? nameMarkBuddyStepAside({ ...spot }, obstacles) : spot;
  if (nameMarkBuddyHits(free.x, free.y, free.pose, obstacles, free.legs)) return false;
  clearTimeout(nmb.errandTimer);
  nameMarkBuddyMoveTo(buddy, { kind: "errand", ...free });
  const arrive = nmb.anim && nmb.anim.playState === "running" ? nmb.anim.finished.catch(() => null) : Promise.resolve();
  arrive.then(() => {
    if (look) nameMarkBuddyAim(look);
    if (act) nameMarkBuddyAct(act);
  });
  if (forMs) nmb.errandTimer = setTimeout(() => placeNameMarkBuddy(), forMs);
  return true;
}

function nameMarkBuddyBellErrand() {
  const target = document.querySelector("#tab-bar button[data-tab='reminders']") || document.getElementById("notif-btn");
  const box = target && nameMarkBuddyShown(target);
  const { top } = nameMarkBuddyLedges();
  if (!box || !top) return false;
  const cx = box.left + box.width / 2;
  const x = Math.min(Math.max(NMB_GUTTER, cx - NMB_W / 2 + 40), innerWidth - NMB_W - NMB_GUTTER);
  return nameMarkBuddyErrand({ pose: "hang", legs: "", x, y: top.bottom - NMB_GRIP }, "bell", 14000, [cx, box.top + box.height / 2]);
}

function nameMarkBuddyChatErrand() {
  if (nameMarkBuddyTab() !== "chat") return false;
  const input = document.getElementById("chat-input");
  const composer = input?.closest("form, .chat-composer, .chat-input-row, .card") || input;
  const box = composer && nameMarkBuddyShown(composer);
  if (!box) return false;
  const x = box.right - NMB_W - 72;
  return nameMarkBuddyErrand({ pose: "sit", legs: "tuck", x, y: box.top - NMB_SEAT }, "", 0, [box.left + box.width / 2, box.top + 20]);
}

//: A look at something that has just appeared: eyes and a little of its
//: head, for two seconds, when it is awake and not busy.
function nameMarkBuddyGlanceAt(el) {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || nameMarkBuddyStill() || buddy.classList.contains("nmb-sleep") || buddy.classList.contains("nm-buddy-dragging") || nmb.act) return;
  requestAnimationFrame(() => {
    const box = el.getBoundingClientRect();
    if (!box.width) return;
    nameMarkBuddyAim([box.left + box.width / 2, box.top + box.height / 2]);
    clearTimeout(nmb.releaseTimer);
    nmb.releaseTimer = setTimeout(nameMarkBuddyRelease, 2000);
  });
}

// --- what is going on around it ---------------------------------------------
//: **Context, from events only** (the owner: "go to sleep if the user goes
//: afk for too long, or putting on headphones if music or sound is playing
//: ... or other things like that"). Each is a class on `#nm-buddy` that
//: shows a prop the figure carries (`.nmp-*`, see the character interface)
//: or changes a pose; nothing here polls.
//:
//: Sound: a page can only hear itself. What is detected is sound this app
//: plays: an <audio> or <video> element (a recording, a voice note) through
//: its play and pause events, and read aloud (`speakText`). Other apps'
//: audio, the system mixer and the microphone are not reachable, and no
//: permission is asked for.
const nmbSounds = new Set();
//: The props these show are drawn by the figure (`drawCharacter`'s prop
//: slots); a renderer without them simply shows nothing for them.
const NMB_PROPS_DRAWN = true;
function nameMarkBuddySound(source, playing) {
  if (playing) nmbSounds.add(source);
  else nmbSounds.delete(source);
  for (const media of [...nmbSounds]) {
    if (media instanceof HTMLMediaElement && (media.paused || media.muted || !media.isConnected)) nmbSounds.delete(media);
  }
  if (NMB_PROPS_DRAWN) document.getElementById("nm-buddy")?.classList.toggle("nmb-music", nmbSounds.size > 0);
}
for (const type of ["play", "playing"]) {
  document.addEventListener(type, (event) => {
    if (event.target instanceof HTMLMediaElement) nameMarkBuddySound(event.target, !event.target.muted);
  }, true);
}
for (const type of ["pause", "ended", "emptied"]) {
  document.addEventListener(type, (event) => {
    if (event.target instanceof HTMLMediaElement) nameMarkBuddySound(event.target, false);
  }, true);
}

//: The hour (a nightcap and heavier eyes from 23:00 to 05:00) and whether
//: the machine is online (unplugged, it holds its cable), checked on each
//: decision and when the network changes.
function nameMarkBuddyContext(buddy = document.getElementById("nm-buddy")) {
  if (!buddy || !NMB_PROPS_DRAWN) return;
  const hour = new Date().getHours();
  buddy.classList.toggle("nmb-night", hour >= 23 || hour < 5);
  buddy.classList.toggle("nmb-offline", navigator.onLine === false);
}
window.addEventListener("online", () => nameMarkBuddyContext());
window.addEventListener("offline", () => nameMarkBuddyContext());

//: Back to the window after five minutes away: a wave.
let nameMarkBuddyBlurAt = 0;
window.addEventListener("blur", () => {
  nameMarkBuddyBlurAt = Date.now();
});
window.addEventListener("focus", () => {
  if (nameMarkBuddyBlurAt && Date.now() - nameMarkBuddyBlurAt > 5 * 60 * 1000) nameMarkBuddyCue("wave");
  nameMarkBuddyBlurAt = 0;
});

//: The theme turned dark: it lights a little lantern for a moment.
if (typeof MutationObserver === "function") {
  let darkBefore = document.documentElement.dataset.theme === "dark";
  new MutationObserver(() => {
    const dark = document.documentElement.dataset.theme === "dark";
    if (dark && !darkBefore) nameMarkBuddyCue("lantern");
    darkBefore = dark;
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}

//: The pointer's place is kept for a glance; while it peeks, at most ten
//: times a second, a pointer within reach sends it ducking behind its
//: panel, and a moment after the pointer leaves it peeks out again. No
//: layout is read: its own place is in `nmb`.
document.addEventListener("pointermove", (event) => {
  nmb.pointer = [event.clientX, event.clientY];
  const now = Date.now();
  if (now - nmb.lastInput > 1000) nameMarkBuddyAwake();
  if (!document.getElementById("nm-buddy")) return;
  //: At most ten a second, and the last move of a burst is never lost: a
  //: pointer that stops inside the burst is looked at a moment later.
  if (now - nmb.shyAt < 100) {
    if (!nmb.trail) {
      nmb.trail = setTimeout(() => {
        nmb.trail = 0;
        nameMarkBuddyPointer(Date.now());
      }, 100 - (now - nmb.shyAt));
    }
    return;
  }
  nameMarkBuddyPointer(now);
}, { passive: true });

function nameMarkBuddyPointer(now) {
  if (!nmb.pointer) return;
  const [px, py] = nmb.pointer;
  nmb.shyAt = now;
  nameMarkBuddyNotice(px, py, now);
  nameMarkBuddyShy(now);
}

//: **Shy, with hysteresis** (the owner: "the peeking companion flashes in
//: and out?? and disappears when I try to move my mouse to it??"). While it
//: peeks, a pointer that comes within 120px and keeps approaching for 300ms
//: makes it sink to its eyes (never out of sight); it only comes back up
//: once the pointer is past 200px for a second; it changes its mind at most
//: once every three seconds. A pointer that arrives and stays is someone
//: reaching for it: after a second and a half curiosity wins, and it comes
//: out, looks at the pointer and can be picked up. One timer re-checks while
//: the pointer is still.
function nameMarkBuddyShy(now) {
  const buddy = document.getElementById("nm-buddy");
  if (!buddy || (nmb.act !== "peek" && nmb.legs !== "peek") || !nmb.pointer) return;
  const [px, py] = nmb.pointer;
  const dist = Math.hypot(px - (nmb.x + NMB_W / 2), py - (nmb.y + nmb.edgeLine - 16));
  const shy = buddy.classList.contains("nmb-duck");
  const settled = now - (nmb.shyChangedAt || 0) >= 3000;
  clearTimeout(nmb.shyTimer);
  nmb.shyTimer = 0;
  const again = (ms) => {
    nmb.shyTimer = setTimeout(() => {
      nmb.shyTimer = 0;
      nameMarkBuddyShy(Date.now());
    }, ms);
  };
  if (dist < 120) {
    nmb.farSince = 0;
    if (!nmb.nearSince) nmb.nearSince = now;
    const near = now - nmb.nearSince;
    if (near >= 1500 && nmb.act === "peek") {
      nmb.nearSince = 0;
      buddy.classList.remove("nmb-duck");
      nmb.shyChangedAt = now;
      nameMarkBuddyAct("emerge");
      nameMarkBuddyAim([px, py]);
      return;
    }
    if (!shy && near >= 300 && settled) {
      buddy.classList.add("nmb-duck");
      nmb.shyChangedAt = now;
    }
    again(near < 300 ? 300 - near : 1500 - near > 0 ? 1500 - near : 3000);
    return;
  }
  nmb.nearSince = 0;
  if (dist > 200 && shy) {
    if (!nmb.farSince) nmb.farSince = now;
    const far = now - nmb.farSince;
    const wait = Math.max(1000 - far, 3000 - (now - (nmb.shyChangedAt || 0)));
    if (wait <= 0) {
      buddy.classList.remove("nmb-duck");
      nmb.shyChangedAt = now;
      nmb.farSince = 0;
    } else {
      again(wait);
    }
  }
}

//: Typing near it: it watches the field, for as long as the typing goes on
//: and a moment after. At most one measurement every 400ms.
document.addEventListener("keydown", (event) => {
  const buddy = document.getElementById("nm-buddy");
  const field = event.target;
  if (!buddy || nameMarkBuddyStill() || !(field instanceof Element)) return;
  if (!field.matches("input, textarea, [contenteditable='true'], [contenteditable=''], .cm-content")) return;
  const now = Date.now();
  if (now - nmb.watchAt > 400) {
    nmb.watchAt = now;
    const box = field.getBoundingClientRect();
    const px = Math.min(Math.max(nmb.x + NMB_W / 2, box.left), box.right);
    const py = Math.min(Math.max(nmb.y + NMB_HEAD / 2, box.top), box.bottom);
    if (Math.hypot(px - (nmb.x + NMB_W / 2), py - (nmb.y + NMB_HEAD / 2)) > 420) return;
    nameMarkBuddyAim([px, py]);
  }
  //: Typing fast (keys under 180ms apart, five in a row), it nods along.
  nmb.keyRun = now - nmb.keyAt < 180 ? nmb.keyRun + 1 : 0;
  nmb.keyAt = now;
  buddy.classList.add("nmb-watch");
  buddy.classList.toggle("nmb-nod", nmb.keyRun >= 5);
  clearTimeout(nmb.watchTimer);
  nmb.watchTimer = setTimeout(() => buddy.classList.remove("nmb-watch", "nmb-nod"), 1800);
}, { passive: true, capture: true });

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearTimeout(nmb.timer);
    nmb.timer = 0;
  } else {
    //: Back after a long absence, it is found asleep, and the next input
    //: wakes it.
    if (Date.now() - nmb.lastInput > NMB_SLEEP_MS) document.getElementById("nm-buddy")?.classList.add("nmb-sleep");
    nameMarkBuddyContext();
    nameMarkBuddySchedule();
  }
});

// --- building it ----------------------------------------------------------------

//: Hidden from its menu: off in Appearance, gone from the page, and a toast
//: that says where it comes back from.
function nameMarkBuddyHide(buddy) {
  try {
    localStorage.setItem("avatar-buddy", "off");
  } catch (e) {
    // Hidden for this session at least.
  }
  const select = document.getElementById("avatar-buddy");
  if (select) select.value = "off";
  buddy.remove();
  clearTimeout(nmb.timer);
  nmb.x = nmb.y = NaN;
  if (typeof toast === "function") toast("Companion hidden. Settings, Appearance brings it back.");
}

function nameMarkBuddyMenu(buddy, x, y) {
  if (typeof openMenuAtPoint !== "function") return;
  const face = buddy.querySelector(".nm-buddy-face");
  const tab = nameMarkBuddyTab();
  const spots = nameMarkBuddySpots();
  const forget = (all) => () => {
    const next = all ? {} : { ...spots };
    if (!all) delete next[tab];
    nameMarkBuddyKeepSpots(next);
    placeNameMarkBuddy(buddy);
  };
  const items = [
    { label: "ph:hand-waving Say hello", run: () => face.click() },
    { label: "ph:arrows-out Enlarge", run: () => openNameMarkViewer(buddy.dataset.seed || "") },
    { label: "ph:push-pin Stay here on every page", run: () => {
      nameMarkBuddyKeepSpots({ "*": nameMarkBuddySpotFor(nmb.spot || { x: nmb.x, y: nmb.y, pose: nmb.pose }) });
    } },
  ];
  if (spots[tab]) items.push({ label: "ph:sparkle Let it choose its spot here", run: forget(false) });
  if (Object.keys(spots).length) items.push({ label: "ph:shuffle-simple Let it choose on every page", run: forget(true) });
  items.push({ label: "ph:eye-slash Hide", run: () => nameMarkBuddyHide(buddy) });
  openMenuAtPoint(items, "Companion", x, y);
}

function nameMarkBuddyBuild() {
  const buddy = document.createElement("div");
  buddy.id = "nm-buddy";
  const face = document.createElement("button");
  face.type = "button";
  face.className = "nm-buddy-face";
  face.setAttribute("aria-haspopup", "menu");
  const char = document.createElement("span");
  char.className = "nm-buddy-char";
  const think = document.createElement("span");
  think.className = "nm-buddy-think";
  think.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i += 1) think.appendChild(document.createElement("i"));
  const sleep = document.createElement("span");
  sleep.className = "nm-buddy-z";
  sleep.setAttribute("aria-hidden", "true");
  sleep.textContent = "z";
  //: The figure itself (`characterFor(seed).figure()`) goes in first, when
  //: `syncNameMarkBuddy` knows whose it is.
  char.append(think, sleep);
  face.appendChild(char);
  //: No x on it (the owner: "the x button being on the companion the whole
  //: time is kinda annoying. keep it in the right click or hold popup
  //: menu"): Hide is in its menu, which the keyboard reaches too.
  buddy.append(face);
  document.body.appendChild(buddy);

  //: **A smooth drag** (the owner: "dragging the corner companion is jerky
  //: and kinda like a grid snap"): a `translate` applied once a frame from
  //: the latest pointer, held by its hands with its legs kicking, and the
  //: place written back once, on release, where it lands.
  let drag = null;
  let dragFrame = 0;
  const follow = () => {
    dragFrame = 0;
    if (!drag?.moved) return;
    const dx = Math.min(Math.max(-drag.box.left, drag.x - drag.sx), innerWidth - drag.box.right);
    const dy = Math.min(Math.max(-drag.box.top, drag.y - drag.sy), innerHeight - drag.box.bottom);
    buddy.style.translate = `${dx}px ${dy}px`;
    //: Carried, it swings with the pull: its legs and body lean against
    //: the way it is moved, by how fast, and settle when the pull stops.
    const vx = drag.x - (drag.lastX ?? drag.x);
    drag.lastX = drag.x;
    const sway = Math.max(-28, Math.min(28, -vx * 1.4));
    buddy.style.setProperty("--nmb-sway", sway.toFixed(1));
    if (Math.abs(vx) > 1) buddy.dataset.turn = vx < 0 ? "l" : "r";
    clearTimeout(drag.settle);
    drag.settle = setTimeout(() => buddy.style.setProperty("--nmb-sway", "0"), 120);
  };
  face.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    //: **Movable at all times** (the owner: "it needs to be movable at all
    //: times"): mid-walk, mid-hop, peeking, hanging or asleep, it is taken
    //: from where it is drawn this instant and everything it was doing
    //: stops.
    const box = buddy.getBoundingClientRect();
    nmb.anim?.cancel();
    nmb.hopAnim?.cancel();
    nameMarkBuddyHalt(buddy);
    buddy.style.left = `${Math.round(box.left)}px`;
    buddy.style.top = `${Math.round(box.top)}px`;
    nmb.x = Math.round(box.left);
    nmb.y = Math.round(box.top);
    drag = { box: buddy.getBoundingClientRect(), sx: event.clientX, sy: event.clientY, x: event.clientX, y: event.clientY, moved: false };
    face.setPointerCapture(event.pointerId);
  });
  face.addEventListener("pointermove", (event) => {
    if (!drag) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    //: A click wobbles a pixel or two; only a real pull is a drag.
    if (!drag.moved && Math.hypot(drag.x - drag.sx, drag.y - drag.sy) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      nameMarkBuddyAct("");
      buddy.classList.remove("nmb-sleep", "nmb-drowsy");
      nameMarkBuddyRelease();
      nmb.mood.energy = Math.min(1, nmb.mood.energy + 0.15);
      nmb.mood.sociability = Math.max(0, nmb.mood.sociability - 0.05);
      buddy.classList.add("nm-buddy-dragging");
    }
    if (!dragFrame) dragFrame = requestAnimationFrame(follow);
  });
  const release = () => {
    if (drag?.moved) {
      cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      follow();
      const box = buddy.getBoundingClientRect();
      buddy.style.translate = "";
      buddy.classList.remove("nm-buddy-dragging");
      clearTimeout(drag.settle);
      buddy.style.setProperty("--nmb-sway", "0");
      delete buddy.dataset.turn;
      nmb.x = Math.round(box.left);
      nmb.y = Math.round(box.top);
      buddy.style.left = `${nmb.x}px`;
      buddy.style.top = `${nmb.y}px`;
      const landed = nameMarkBuddyDrop(nmb.x, nmb.y);
      //: **Settling** (the owner: "how it acts and settles down when I move
      //: it"): it drops onto the surface under gravity's curve, lands with
      //: a squash and a small overshoot, looks around once, and then stays:
      //: nothing re-perches it for thirty seconds unless a control comes up
      //: under it.
      if (landed.y >= nmb.y - 2) landed.falls = true;
      nmb.placedAt = Date.now();
      nmb.afterLand = true;
      nameMarkBuddyMoveTo(buddy, landed);
      if (!nmb.anim || nmb.anim.playState === "finished" || nmb.anim.playState === "idle") nameMarkBuddyAct("land");
      const spots = nameMarkBuddySpots();
      delete spots["*"];
      spots[nameMarkBuddyTab()] = nameMarkBuddySpotFor(landed);
      nameMarkBuddyKeepSpots(spots);
      face.dataset.dragged = "1";
    }
    drag = null;
  };
  face.addEventListener("pointerup", release);
  face.addEventListener("pointercancel", release);
  face.addEventListener("click", () => {
    if (face.dataset.dragged) {
      delete face.dataset.dragged;
      return;
    }
    const now = Date.now();
    const wasAsleep = buddy.classList.contains("nmb-sleep") || nmb.act === "nap";
    nmb.lastPoke = now;
    nmb.pokes = [...nmb.pokes.filter((at) => now - at < 20000), now];
    nameMarkReact(face.querySelector(".name-mark"));
    if (wasAsleep) {
      nameMarkBuddyWake();
      return;
    }
    //: **Poked too often** (four times in twenty seconds): grumpy for half
    //: a minute. It turns away, says so, and will not look at you.
    if (nmb.pokes.length >= 4) {
      nmb.grumpyUntil = now + 30000;
      nmb.mood.sociability = Math.max(0, nmb.mood.sociability - 0.25);
      nameMarkBuddyRelease();
      buddy.classList.add("nmb-grumpy");
      buddy.dataset.turn = nmb.pointer && nmb.pointer[0] > nmb.x + NMB_W / 2 ? "l" : "r";
      setTimeout(() => {
        buddy.classList.remove("nmb-grumpy");
        if (buddy.dataset.turn && !buddy.classList.contains("nmb-walking")) delete buddy.dataset.turn;
      }, 30000);
      nameMarkSay(buddy, ["Hmph.", "Okay, that's enough.", "I'm not talking to you."][Math.floor(Math.random() * 3)]);
      return;
    }
    nmb.mood.sociability = Math.min(1, nmb.mood.sociability + 0.05);
    nmb.mood.curiosity = Math.min(1, nmb.mood.curiosity + 0.05);
    if (!nameMarkBuddyStill()) nameMarkBuddyAct(nmb.pose === "hang" ? "swing" : "wave");
    nameMarkSay(buddy, nameMarkLine(buddy.dataset.seed || ""));
  });
  face.addEventListener("dblclick", () => openNameMarkViewer(buddy.dataset.seed || ""));
  //: **Its own menu**, on right-click, a long press, or from the keyboard
  //: (the Menu key or Shift+F10 while it has focus).
  //: **Where the menu opens** (the owner: "the popup menu when right
  //: clicking on the companion doesnt appear next to the companion or
  //: cursor"): at the pointer for a right-click; beside the companion, on
  //: the side with room, for the keyboard and a long press (where a finger
  //: covers the point). `openMenuAtPoint` keeps it in the window.
  const beside = () => {
    const box = face.getBoundingClientRect();
    const right = innerWidth - box.right > 260;
    return [right ? box.right + 6 : box.left - 6, box.top + Math.min(box.height / 2, 40)];
  };
  face.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const keyboard = event.clientX === 0 && event.clientY === 0;
    const [x, y] = keyboard ? beside() : [event.clientX, event.clientY];
    nameMarkBuddyMenu(buddy, x, y);
  });
  face.addEventListener("keydown", (event) => {
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
      event.preventDefault();
      nameMarkBuddyMenu(buddy, ...beside());
    }
  });
  let hold = 0;
  face.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    clearTimeout(hold);
    hold = setTimeout(() => {
      drag = null;
      face.dataset.dragged = "1";
      nameMarkBuddyMenu(buddy, ...beside());
    }, 550);
  });
  for (const type of ["pointerup", "pointercancel", "pointermove"]) {
    face.addEventListener(type, () => {
      if (type !== "pointermove" || (drag && drag.moved)) clearTimeout(hold);
    });
  }
  //: The one-place and four-corner choices this replaces: a place kept for
  //: every page is the annoyance the perches exist to end.
  try {
    localStorage.removeItem("nm-buddy-pos");
    localStorage.removeItem("nm-buddy-corner");
  } catch (e) {
    // Nothing to tidy.
  }
  return buddy;
}

function syncNameMarkBuddy() {
  const seed = nameMarkBuddySeed();
  let buddy = document.getElementById("nm-buddy");
  if (!seed) {
    buddy?.remove();
    clearTimeout(nmb.timer);
    nmb.timer = 0;
    nmb.x = nmb.y = NaN;
    return;
  }
  const fresh = !buddy;
  if (fresh) buddy = nameMarkBuddyBuild();
  if (buddy.dataset.seed !== seed) {
    buddy.dataset.seed = seed;
    //: Its mood and species lean its choices (`nameMarkBuddyDecide`).
    nmb.reading = nameMood(seed);
    const char = buddy.querySelector(".nm-buddy-char");
    char.querySelector(".nm-figure")?.remove();
    char.prepend(characterFor(seed).figure());
    buddy.querySelector(".nm-buddy-face").setAttribute(
      "aria-label",
      `${seed}, your companion. Click to say hello, double-click to enlarge, drag to move, Shift+F10 for its menu.`,
    );
  }
  if (fresh) {
    placeNameMarkBuddy(buddy, true);
    if (!nameMarkBuddyNoTravel()) {
      buddy.classList.add("nmb-arrive");
      setTimeout(() => buddy.classList.remove("nmb-arrive"), 700);
    }
  }
  nameMarkBuddySchedule();
}

//: Re-checked when the body's classes change (the back-to-top button
//: toggles `scroll-top-visible`), when a toast comes or goes, when a scroll
//: settles (a card it stands on may have moved), and on resize, where it
//: chooses again.
if (typeof MutationObserver === "function") {
  new MutationObserver(queueNameMarkBuddyCheck).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  const toasts = document.getElementById("toast-box");
  if (toasts) {
    new MutationObserver((records) => {
      queueNameMarkBuddyCheck();
      //: Something new on screen: it looks at it.
      const added = records.flatMap((r) => [...r.addedNodes]).find((n) => n instanceof Element);
      if (added) nameMarkBuddyGlanceAt(added);
    }).observe(toasts, { childList: true });
  }
}
document.addEventListener("scrollend", queueNameMarkBuddyCheck, { passive: true, capture: true });
document.addEventListener("transitionend", (event) => {
  if (event.target?.closest?.("#scroll-top, .chat-jump-latest")) queueNameMarkBuddyCheck();
});
let nameMarkBuddyResize = 0;
window.addEventListener("resize", () => {
  clearTimeout(nameMarkBuddyResize);
  nameMarkBuddyResize = setTimeout(() => placeNameMarkBuddy(), 250);
}, { passive: true });

// --- being found ------------------------------------------------------------------
//: **A one-time nudge** (the owner: "the companion should be advertised or
//: made more learnable that it is a feature in some places"). Besides its
//: catalogue row, its Help line and its tour card: once, after three days
//: of use or the first time Appearance is opened, a toast asks whether you
//: want one, with Turn on; its own x is "not now". Either way it is never
//: shown again, and never while the companion is already on or the app is
//: locked.
const NMB_HINT_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
function nameMarkBuddyHint(fromAppearance = false) {
  let since = 0;
  try {
    if (localStorage.getItem("nm-buddy-hint") === "done") return;
    since = Number(localStorage.getItem("nm-buddy-first-seen")) || 0;
    if (!since) {
      since = Date.now();
      localStorage.setItem("nm-buddy-first-seen", String(since));
    }
  } catch (e) {
    return;
  }
  if (!fromAppearance && Date.now() - since < NMB_HINT_AFTER_MS) return;
  if (nameMarkBuddySeed() || typeof toastAction !== "function") return;
  const lock = document.getElementById("lock-overlay");
  if (lock && !lock.classList.contains("hidden")) return;
  try {
    localStorage.setItem("nm-buddy-hint", "done");
  } catch (e) {
    // Shown this once at least.
  }
  toastAction("Want a companion on screen? It finds a free spot on each page and reacts to what you do.", "Turn on", () => {
    try {
      localStorage.setItem("avatar-buddy", "me");
    } catch (e) {
      // On for this visit.
    }
    const select = document.getElementById("avatar-buddy");
    if (select) select.value = "me";
    syncNameMarkBuddy();
  });
}
//: Checked once a little after start, and again a minute later in case the
//: app was still locked.
setTimeout(() => nameMarkBuddyHint(), 20000);
setTimeout(() => nameMarkBuddyHint(), 80000);
