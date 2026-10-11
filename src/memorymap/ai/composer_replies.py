"""More ways to say each conversational reply (the owner, 2026-10-11: "can it
have more varied responses??").

Every family reaches eight phrasings or more in both voices, and each holds
more than one shape: a few words, one sentence, two, a question, a longer
line. `phrasing.choose` then picks one unlike the last three replies and
shaped unlike the last. Plain and warm, sentence case, no exclamation marks.

`CALL` answers a message that only called the assistant ("yo brotato",
`vocative.py`); a `{name}` line says the name back, so a nickname is
acknowledged now and then rather than every time.
"""

from __future__ import annotations

SOCIAL_NATURAL: dict[str, tuple[str, ...]] = {
    "greeting": (
        "Hey, what's up?",
        "Hello, good to see you.",
        "Hi. I'm here whenever you want to look something up, plan the day or tidy a few notes.",
        "Hey hey. Ask me anything.",
    ),
    "morning": (
        "Good morning to you too.",
        "Morning, hope the day is starting gently. Want a look at what's on today?",
        "Morning. Coffee first, then notes?",
        "Good morning. Shall I pull up today's reminders?",
        "Morning. I'm ready when you are, whether that's today's plans or something you wrote last week.",
    ),
    "thanks": (
        "Sure thing.",
        "Glad it was useful. If anything else comes up, just ask and I'll dig it out of your notes.",
    ),
    "bye": (
        "Take it easy.",
        "Bye for now, and good luck with the rest of your day.",
        "Off you go then. I'll be right here with everything you wrote whenever you're back.",
        "Have a good one.",
    ),
    "ack": (
        "Sounds good.",
        "Cool, I'm here if you need anything else from your notes.",
        "Okay. Whenever you want something next, a date, a list or a note, just say.",
    ),
    "emotion": (
        "That sounds hard.",
        "Sorry you're feeling that way. If it helps, I can pull up today's plans, or you could jot down what's on your mind.",
    ),
    "glad": (
        "That's great to hear.",
        "Love that. Want to note it down while the mood is good?",
        "Good to hear. What can I find for you?",
        "Nice, enjoy it.",
        "That's lovely. Shall I save a note about it?",
        "Glad things are going well. I'm here if you need anything from your notes.",
        "Happy days. What's next?",
        "That's the spirit. Anything you want to look up while you're at it, a plan, a list or an old note?",
    ),
    "reaction": (
        "Right?",
        "Wild, isn't it?",
        "Quite something.",
        "It is a lot to take in. Say the word and I'll find more on it in your notes.",
        "Yeah, I thought so too.",
    ),
    "sorry": (
        "No worries.",
        "That's fine, honestly.",
        "You've nothing to be sorry for. Ask it however it comes out and I'll work out what you mean.",
    ),
    "confused": (
        "Which part lost you?",
        "Let me put it more simply: ask about one note, one date or one thing, and I'll answer just that.",
        "Fair, that was muddled.",
    ),
    "laugh": (
        "Ha, glad that amused you.",
        "Ha. Good one.",
        "Laughing is allowed. Ask me something when you're ready and I'll look it up.",
    ),
    "how": (
        "Not bad at all, you?",
        "Pretty good, thanks.",
        "All quiet here. Your notes are safe and I'm ready whenever you want something found.",
        "Good. How about you?",
    ),
    "insult": (
        "Fair. I can do better.",
        "Sorry, that one's on me.",
        "Point taken. Tell me what you were after, in any words, and I'll have another go.",
    ),
    "compliment": (
        "Aw, thanks.",
        "That's nice of you to say.",
        "Cheers. I'm only as good as the notes you write, so some of the credit is yours.",
    ),
    "who": (
        "I'm Atlas, your notebook's assistant.",
        "Atlas. I live in this notebook and know what's in it.",
        "Name's Atlas. What can I find for you?",
        "I'm Atlas. I stay on this computer and only know what you wrote.",
        "Atlas, the one who reads your notes so you don't have to. Want to try me?",
    ),
    "about_app": (
        "Plenty. I'm Atlas: I answer questions from your notes, set reminders, and tag, pin or move notes for you. With a model connected I can also write.",
        "Ask Atlas, that's me, what's on today, what you decided about something, or where a setting lives, and I'll answer from what you wrote.",
        "I'm Atlas. Think of me as a search that answers: dates, lists, decisions and how things are going, all from your notes.",
        "Short version: Atlas finds things in your notes and does small jobs like reminders and tags. Want to try one?",
        "Mostly, Atlas reads your notes for you. Try “what did I do last week” or “remind me to call the dentist on Friday”.",
    ),
    "joke": (
        "Here's one: why did the notebook never panic? It had everything written down.",
        "I only know one. What do you call a note with no title? Unfinished business.",
        "I'm a better finder than a comedian. Saved any good ones?",
        "Comedy isn't my strength. Finding your notes is.",
        "If you've written a joke down, I'll find it. Otherwise that notebook one is all I've got.",
        "Nothing funny in my head, only your notes. Want me to search them for a joke?",
    ),
    "unclear": (
        "I couldn't make that out. Try a word or two about what you need?",
        "Hmm, that looks like a stray key or two.",
        "Not sure what that was. Ask me about a note, a date or a reminder.",
        "That one didn't come through as words. Want to try again?",
        "Looks like the keyboard got there first. What did you mean to ask?",
        "I didn't catch that. You could start with “what's on today”.",
    ),
}

SOCIAL_PROFESSIONAL: dict[str, tuple[str, ...]] = {
    "morning": (
        "Good morning. Shall I list today's reminders?",
        "Good morning to you.",
        "Good morning. I am ready whenever you would like to review your plans or an earlier note.",
    ),
    "thanks": (
        "Certainly.",
        "You are most welcome. Please ask whenever you need something further.",
        "Happy to help. Is there anything else?",
        "Of course.",
    ),
    "how": (
        "Very well, thank you. And you?",
        "All is in order here.",
        "Everything is running as it should. What would you like to review?",
        "Well, thank you. Your notes are up to date and ready to search.",
        "Quite well. How may I assist?",
    ),
    "bye": (
        "Goodbye.",
        "Thank you, and goodbye for now.",
        "Until next time. Your notes and reminders are saved.",
        "Have a good day.",
        "Goodbye. I will be available whenever you return.",
    ),
    "sorry": (
        "Not at all.",
        "There is nothing to apologise for.",
        "No apology is needed. Please ask in whatever words suit you and I will work out the meaning.",
        "Quite all right. Shall we try again?",
        "That is fine. What would you like to find?",
    ),
    "laugh": (
        "Glad to hear it.",
        "Indeed. Is there anything further?",
        "Very good. Shall I look something up?",
        "I am pleased that was amusing. Please ask whenever you are ready.",
        "Quite so.",
    ),
    "reaction": (
        "Indeed.",
        "Quite remarkable.",
        "Understood. Shall I find further detail in your notes?",
        "Noted. Would you like anything related?",
        "It is a lot to take in. I can find more on it in your notes on request.",
    ),
    "confused": (
        "Which part was unclear?",
        "My apologies for the confusion.",
        "Please ask about one note, one date or one item, and I will answer only that.",
        "I may have misread the question. Could you rephrase it?",
        "Let me clarify. Which note or date did you have in mind?",
    ),
    "ack": (
        "Very good.",
        "Understood.",
        "Noted. I am ready for the next question.",
        "Certainly. Is there anything further?",
        "Thank you. Please let me know what you need next, whether a date, a list or a note.",
    ),
    "who": (
        "I am Atlas.",
        "Atlas, the notebook's assistant.",
        "My name is Atlas. How may I help?",
        "I am Atlas. I run on this computer and know only what you have recorded.",
        "This is Atlas, which reads your notes and reports what they contain. What would you like to find?",
        "Atlas, at your service.",
    ),
    "joke": (
        "I am not a comedian, I am afraid.",
        "A joke recorded in your notes can be found on request.",
        "Humour is not my strength. Locating your notes is.",
        "I know one: why was the notebook never anxious? Everything was written down.",
        "I do not keep jokes. Shall I search your notes for one?",
        "Regrettably, no. I report what your notes contain.",
    ),
    "unclear": (
        "That message was not clear.",
        "That appears to be a few stray keys.",
        "Please try again in a few words.",
        "I could not read that. What would you like to find?",
        "The message was not recognised. You could begin with “what is on today”.",
        "I did not understand that. Please ask about a note, a date or a reminder.",
    ),
    "about_app": (
        "Atlas answers questions from your notes.",
        "Atlas locates notes, answers from them and carries out small tasks such as reminders and tags.",
        "Ask Atlas what is on today, what was decided about a matter, or where a setting is located.",
        "I am Atlas. I answer from your notes and, on request, set reminders and tag, pin or move notes.",
        "In brief: Atlas searches your notes and answers from them. Shall I demonstrate?",
        "Atlas reads your notes on your behalf. With a model connected, it can also write and use tools.",
    ),
    "compliment": (
        "Thank you.",
        "That is kind of you.",
        "Thank you. What would you like to review next?",
        "I appreciate that. Is there anything further?",
        "Much appreciated. The quality of the answers owes a good deal to the quality of your notes.",
        "Thank you very much.",
    ),
    "insult": (
        "My apologies.",
        "Understood. I will try to do better.",
        "I am sorry that was not helpful. Please describe what you need and I will try again.",
        "Point taken. Shall we try another approach?",
        "Apologies for the frustration. What would be most useful?",
        "I regret the poor result.",
    ),
    "emotion": (
        "I understand.",
        "I am sorry to hear that.",
        "That sounds difficult. I can list today's plans, or you could note down what is on your mind.",
        "Understood. Take whatever time you need.",
        "I am here whenever you are ready.",
        "Thank you for saying so. Is there anything I can look up?",
    ),
    "glad": (
        "That is good to hear.",
        "I am glad to hear it.",
        "Excellent. Is there anything I can find for you?",
        "Very good. Would you like to record a note about it?",
        "That is welcome news.",
        "Pleased to hear it. Shall I look anything up?",
        "Good news indeed.",
        "I am glad things are going well. I am available whenever you need something from your notes.",
    ),
}

#: A message that only called the assistant ("brotatockiibidyrizzler", "yo
#: lil bro"): answered as a call, then offered `CALL_ASKS`.
CALL: dict[str, tuple[str, ...]] = {
    "natural": (
        "I'm here. What do you need?",
        "Yes? What can I do for you?",
        "Right here. What's up?",
        "That's me. What are we looking for?",
        "{name}, reporting in. What do you need?",
        "Present. Ask me anything about your notes.",
        "Here. Want today's plans, something you wrote, or something done?",
        "Ha, {name}. I'll answer to that. What do you need?",
        "You called? I'm listening.",
        "At your service. What should I find?",
        "Hey. I'm all ears, what's on your mind?",
    ),
    "professional": (
        "I am here. How can I help?",
        "Yes. How may I assist?",
        "Ready. What would you like to find?",
        "At your service.",
        "Listening. What can I look up for you?",
        "Here and ready. Please ask about any note, date or task.",
        "I am available. What would you like to do?",
        "How can I help today?",
    ),
}

#: What a call offers to do next, as chips: three of these.
CALL_ASKS: tuple[str, ...] = (
    "What's on today?",
    "What did I write this week?",
    "Show my open tasks",
    "What can you do?",
    "What did I do last week?",
    "Any reminders coming up?",
)

#: Nothing found, said eight ways or more in each voice (merged into
#: `composer_tables._FAMILIES`). Every "nothing" and "nothing_ask" line
#: stays a question: no answer is said plainly and asked back (CHAT_PLAN
#: decision 24). A "none_found" lead is followed by the words no note holds.
NOTHING_FAMILIES: dict[str, dict[str, list[str]]] = {
    "nothing": {
        "natural": [
            "I couldn't find that in your notes. Could you put it another way?",
            "Nothing I found answers that. Is there a word you might have used in the note?",
            "That doesn't seem to be in the notes I found. Which note might it be in?",
            "No luck in your notes for that one. Want to try a different word?",
            "I looked, but nothing answers that. Do you remember roughly when you wrote it?",
            "Your notes don't seem to cover that. Did you mean something else?",
            "Could you say that another way, since nothing I found answers it?",
        ],
        "professional": [
            "No entry found answers that. Could you rephrase the question?",
            "The notes found do not address that. Which entry might contain it?",
            "That does not appear in the notes found. Is there another term you may have used?",
            "No matching entry was found. Do you recall approximately when it was recorded?",
            "The notes do not appear to cover that. Could you name the relevant note?",
            "Nothing found answers the question. Would a different wording help?",
            "Which note would hold it, since no record found answers that?",
        ],
    },
    "none_found": {
        "natural": [
            "None of your notes mention ",
            "I couldn't find anything on ",
            "Your notes don't mention ",
            "No note I found says anything about ",
            "There's nothing in your notes about ",
            "I found no mention of ",
            "Nothing comes up for ",
        ],
        "professional": [
            "No note found mentions ",
            "No entry refers to ",
            "The notes contain no mention of ",
            "No record mentions ",
            "Nothing on file refers to ",
            "There is no entry about ",
            "The notes found do not mention ",
            "No reference was found to ",
        ],
    },
    "nothing_ask": {
        "natural": [
            "Could you say it another way?",
            "Is there another word you might have used?",
            "Which note would it be in?",
            "Do you remember when you wrote it?",
            "Want to try a different word?",
            "Could it be under another name?",
            "Did you mean something close to it?",
        ],
        "professional": [
            "Which note might hold it, or how else might it be phrased?",
            "Could you rephrase the question?",
            "Is there an alternative term?",
            "Which entry might contain it?",
            "Do you recall when it was recorded?",
            "Would another wording help?",
            "Might it be recorded under another name?",
            "Which note should be checked?",
        ],
    },
}
