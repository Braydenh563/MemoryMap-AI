"""
Fast, purely deterministic NLU matching utilizing vendored FlashText.
Provides ultra-high-speed matching capabilities for synonyms, intent parsing,
and typo fixing without relying on slower regex engines.
"""

from memorymap.vendor.flashtext import KeywordProcessor
from memorymap.ai import composer_tables

class FastMatcher:
    def __init__(self):
        # Case-insensitive keyword extractor/replacer
        self.processor = KeywordProcessor(case_sensitive=False)
        self._load_synonyms()
        
    def _load_synonyms(self):
        # Feed all synonym clusters so we can rapidly detect core semantic concepts
        # For example, mapping "cash" -> "money", "funds" -> "money"
        concept_map = {}
        for group in composer_tables.EXTRA_SYNONYM_GROUPS:
            if not group:
                continue
            canonical_concept = group[0]
            for variant in group:
                if canonical_concept not in concept_map:
                    concept_map[canonical_concept] = []
                concept_map[canonical_concept].append(variant)
                
        self.processor.add_keywords_from_dict(concept_map)

    def extract_concepts(self, text: str) -> list[str]:
        """
        Extract canonical concepts (e.g., 'money', 'laptop') from a raw text query
        in milliseconds, skipping standard regex parsing.
        """
        return self.processor.extract_keywords(text)
        
    def normalize_text(self, text: str) -> str:
        """
        Replace all recognized synonyms and variations with their canonical
        concept counterpart in the text.
        """
        return self.processor.replace_keywords(text)

# Global singleton matcher instance
matcher = FastMatcher()
