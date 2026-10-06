"""The context budget counts CJK text as the tokens it is (audit 2026-10-05,
ARCH-15).

Every share was characters at four a token. Chinese, Japanese and Korean
run about one character a token, so a CJK notebook overfilled the window up
to four times over, and Ollama truncates from the front: the system prompt
and the grounding rule went first.
"""

from __future__ import annotations

from memorymap.ai import context


def test_cjk_counts_a_token_a_character():
    assert context.weighted_len("hello") == 5
    assert context.weighted_len("東京の天気") == 5 * context.CHARS_PER_TOKEN
    assert context.weighted_len("한국어") == 3 * context.CHARS_PER_TOKEN
    assert context.weighted_len("") == 0


def test_cjk_notes_fill_the_window_no_further_than_english_ones():
    budget = context.plan(4096, 400)
    english = [{"text": "word " * 40} for _ in range(20)]
    japanese = [{"text": "東京の天気は晴れ" * 25} for _ in range(20)]
    kept_en, _ = context.fit_notes(english, budget.notes_chars, lambda n: n["text"])
    kept_ja, _ = context.fit_notes(japanese, budget.notes_chars, lambda n: n["text"])
    tokens_en = sum(len(n["text"]) for n in kept_en) / context.CHARS_PER_TOKEN
    tokens_ja = sum(len(n["text"]) for n in kept_ja)  # about one token a character
    assert tokens_ja <= budget.notes_chars / context.CHARS_PER_TOKEN + 50
    assert tokens_en <= budget.notes_chars / context.CHARS_PER_TOKEN + 50


def test_history_is_measured_the_same_way():
    pairs = [{"role": "user", "content": "質問" * 300}, {"role": "assistant", "content": "答え" * 300}] * 5
    kept = context.fit_history(pairs, 2400)
    assert sum(context.weighted_len(m["content"]) for m in kept) <= 2400 or len(kept) == 2
