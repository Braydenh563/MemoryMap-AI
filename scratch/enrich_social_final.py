import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    '"greeting"': [
        "Hey. What can I find for you?", "Hi again. Ask me anything about your notes.",
        "Hello. Your notes are all here, so ask away.", "Hey there. Want to look something up?",
        "Hi. What are we looking for today?", "Hello again. Need me to find something?",
        "Hey, I'm ready. What's on your mind?", "Hi there. How can I help with your notes?",
        "Hm, what can I find for you?", "Ah, hey there. Want to look something up?",
        "Well hello. Need me to find something?", "Mm, let's see what we can find for you today.",
        "Hmm, I'm ready. What's on your mind?", "Ah, hello again. Ready to dig into your notes?",
        "Let's see... how can I help with your notes today?", "Greetings! Ready to search your mind?",
        "Welcome back! What are we searching for?", "Hey! Feel free to ask me anything about your notes.",
        "Hello! I'm here and ready to help you navigate your notes.", "Hi! Let's find exactly what you need.",
        "Hey! How can I assist you with your notes right now?", "Hello there! Got a question about your notebook?",
        "Hi! What part of your notebook should we explore today?", "Hey! Let's track down whatever you're looking for.",
        "Yo! What do you need me to look up?", "Hey, ready when you are. What should we search?",
        "Hi! Tell me what you're trying to find."
    ],
    '"morning"': [
        "Good morning. What would you like to check first?", "Morning! Ready to look into your notes?",
        "Good morning. Need to find anything today?", "Morning! Let's get started, what do you need?",
        "Good morning! I'm ready to search your notes whenever you are.", "Morning! What's the first thing we're looking up?",
        "Good morning! How can I help kick off your day?", "Morning! Ready to dive into your notebook?",
        "Top of the morning to you! What are we searching for today?", "Good morning! Let's find what you need today."
    ],
    '"capabilities"': [
        "I can search your notes, answer questions about them, check the time, help you navigate the app, and search the web!",
        "I am an advanced assistant. I can look through your notes, provide detailed answers, check times, navigate memorymap, and even search the web if needed.",
        "My main job is helping you find and understand your notes. I can also help you navigate the app, search the web, and answer general questions.",
        "I'm here to search your notes, synthesize answers, check the current time, guide you through the app, and run web searches when your notes don't have the answer.",
        "I can explore your notebook, answer complex questions based on what you've written, run web searches, and navigate the MemoryMap app.",
        "Think of me like Siri for your notes. I can read your notes, answer questions, navigate the app, search the web, and more."
    ]
}

def inject():
    global content
    for key, items in replacements.items():
        # Match the tuple block
        pattern = r'(' + key + r':\s*\()([\s\S]*?)(\),)'
        def rep(m):
            formatted_items = ",\n        ".join([f'"{x}"' for x in items])
            return f'{m.group(1)}\n        {formatted_items}\n    {m.group(3)}'
        content = re.sub(pattern, rep, content)

inject()

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected additional social variations.")
