"""Leave-one-out evaluation of filing with no model (INBOX 434).

A hand-written notebook of short, realistic notes in ten categories. Each
note is filed by `lexical_filing` from all the others; prints precision (right
when it files), coverage (how often it files at all) and the confusions.

    PYTHONPATH=src .venv/bin/python scratchpad/filing_eval.py
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from collections import Counter

NOTES = {
    "Gym": [
        "Leg day: squats 5x5 at 80kg, deadlifts 3x5",
        "Bench press PR, 60kg for 3 reps",
        "Rowing machine 2k in 8 minutes",
        "Pull ups: 3 sets of 8, felt easier this week",
        "Rest day, stretched hamstrings and foam rolled",
        "Overhead press stalled at 40kg, deload next week",
        "Ran 5k on the treadmill in 27 minutes",
        "New program: push pull legs, four days a week",
        "Shoulder felt tight during bench, warm up longer",
        "Deadlift form check: keep the bar close to the shins",
    ],
    "Recipes": [
        "Pasta with garlic, chilli and lemon, serves two",
        "Banana bread: three bananas, flour, sugar, bake 50 minutes",
        "Lemon chicken traybake with potatoes",
        "Dal: red lentils, cumin, turmeric, simmer 25 minutes",
        "Pancakes: one cup flour, one egg, one cup milk",
        "Roast vegetables at 200C for 40 minutes with olive oil",
        "Chicken curry with coconut milk and spinach",
        "Overnight oats with yoghurt, oats and berries",
        "Tomato soup: roast tomatoes and onion, blend with stock",
        "Pizza dough: flour, water, yeast, salt, rest two hours",
    ],
    "Work": [
        "Standup: blocked on the API review, ask Sam",
        "Quarterly planning meeting moved to Thursday",
        "Ship the onboarding redesign before the sprint ends",
        "Write the incident report for the outage on Monday",
        "One on one with my manager: ask about the promotion",
        "Client wants the proposal by Friday",
        "Deploy failed on staging, rollback and check the logs",
        "Hiring: interview two candidates for the backend role",
        "Sprint retro: too many meetings, fewer standups",
        "Update the roadmap slides for the board meeting",
    ],
    "Travel": [
        "Flight to Tokyo departs 9:40, terminal 2",
        "Book the hotel in Kyoto near the station",
        "Pack passport, adapter and sunscreen",
        "Train from Rome to Florence takes 90 minutes",
        "Visa application for Vietnam, apply online",
        "Airport transfer booked for Sunday morning",
        "Itinerary: Lisbon three nights, Porto two nights",
        "Travel insurance renews in March",
        "Check in online 24 hours before the flight",
        "Rent a car in Iceland for the ring road",
    ],
    "Finance": [
        "Pay the credit card bill before the 15th",
        "Budget: rent, groceries, transport, savings",
        "Transfer 500 into the savings account",
        "Tax return due end of October",
        "Compare mortgage rates with two banks",
        "Cancel the unused streaming subscription",
        "Superannuation contribution this financial year",
        "Invoice the client for September",
        "Electricity bill was higher than usual",
        "Index fund buy order, monthly",
    ],
    "Health": [
        "Doctor appointment Tuesday 3pm about the cough",
        "Dentist cleaning booked for next month",
        "Take vitamin D every morning",
        "Slept badly, try no screens before bed",
        "Blood test results came back normal",
        "Physio for the knee, exercises twice a day",
        "Allergy tablets running low, refill the prescription",
        "Drink more water, aim for two litres",
        "Eye test overdue, book an optometrist",
        "Headache again after lunch, track caffeine",
    ],
    "Books": [
        "Finished Dune, the ending was great",
        "Reading list: Piranesi, The Overstory, Klara and the Sun",
        "Quote from Meditations about the present moment",
        "Borrow the sequel from the library",
        "Book club picks a novel for November",
        "Halfway through Sapiens, chapter on money",
        "Audiobook for the commute: Project Hail Mary",
        "Favourite author has a new novel out",
        "Notes on the chapter about habits",
        "Lend the paperback to Alex",
    ],
    "Garden": [
        "Water the tomatoes every second evening",
        "Plant garlic cloves in autumn",
        "Prune the roses in winter",
        "Basil is bolting, pinch the flowers",
        "Compost bin needs turning",
        "Seedlings: lettuce, rocket, spinach in trays",
        "Mulch the beds before summer",
        "Aphids on the chillies, spray soapy water",
        "Lawn needs mowing and edging",
        "Order seeds for the spring veggie patch",
    ],
    "Ideas": [
        "App idea: a habit tracker that uses voice",
        "Blog post about learning to cook at thirty",
        "What if the newsletter was weekly instead",
        "Startup idea: secondhand furniture marketplace",
        "Podcast episode on minimalism",
        "Side project: a recipe scaler that converts units",
        "Write a short story about a lighthouse keeper",
        "Idea for a board game about city planning",
        "Turn the photos into a zine",
        "Could build a plugin for the note app",
    ],
    "Home": [
        "Fix the leaking tap in the bathroom",
        "Call the landlord about the heater",
        "Buy light bulbs and batteries",
        "Clean the gutters before the rain",
        "Repaint the hallway, pick a colour",
        "Plumber coming Thursday morning",
        "Vacuum filter needs replacing",
        "Hang the shelves in the study",
        "Recycling goes out on Wednesday",
        "Smoke alarm battery is beeping",
    ],
}


def main() -> None:
    data_dir = tempfile.mkdtemp(prefix="mm-fileval-")
    os.environ["MEMORYMAP_DATA_DIR"] = data_dir
    sys.path.insert(0, "src")
    from memorymap.ai import lexical_filing
    from memorymap.core.database import DatabaseManager as Database
    from memorymap.entry import manager

    from pathlib import Path

    db = Database(Path(data_dir) / "eval.db")
    ids = []
    with db.session() as session:
        for category, notes in NOTES.items():
            for content in notes:
                entry = manager.create_entry(session, content, category_name=category)
                ids.append((entry.id, content, category))
        session.commit()
        filed = right = 0
        confusions = Counter()
        for entry_id, content, truth in ids:
            match = lexical_filing.lexical_category(session, content, exclude_entry_id=entry_id)
            if match is None:
                continue
            filed += 1
            if match.name == truth:
                right += 1
            else:
                confusions[(truth, match.name)] += 1
    total = len(ids)
    print(json.dumps({
        "notes": total,
        "filed": filed,
        "coverage": round(filed / total, 3),
        "precision": round(right / filed, 3) if filed else None,
        "right_overall": round(right / total, 3),
        "confusions": [f"{a}->{b} x{n}" for (a, b), n in confusions.most_common(8)],
    }, indent=1))


if __name__ == "__main__":
    main()
