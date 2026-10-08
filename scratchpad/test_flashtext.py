import re
from memorymap.vendor.flashtext import KeywordProcessor
from memorymap.ai import question_noise

# Test using FlashText
processor = KeywordProcessor(case_sensitive=False)
processor.add_keywords_from_dict({v: [k] for k, v in question_noise.SLANG.items()})

print(processor.replace_keywords("I wroye a bk abt tomorow"))
