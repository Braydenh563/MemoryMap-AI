# Popup inventory (INBOX 456)

The owner, 2026-10-03: "make sure all the popup windows and panels are the same design and style."

One row per popup surface (42), measured with `scratchpad/ui-sweeps/popupinv.js` (Playwright, `getComputedStyle` and
`getBoundingClientRect`, no screenshot read as a number), at 1440x900 and 390x844, light and dark, before and after the
change. `scratchpad/ui-sweeps/popupall.sh before|after` writes the JSON, `popupmd.py` writes this file and `popupcmp.py`
counts the distinct values per property inside each tier.

Reading the columns: `close` is the kind, the box, then its offset from the card's right (`r`) and top (`t`) edge; `box`
is the card's width x height as opened; `scrim` is the overlay's colour (a `<dialog>`'s `::backdrop`). Phone rows read
inside their own geometry: a sheet is full width with square bottom corners, the agent panel docks to the edge.

Openers are the real ones where cheap (`openSheet`, `confirmDialog`, `openHelpChat`, the bell, a '?' press); the rest are
opened by taking `hidden` off the overlay or by `showModal()`, the shortcut `dialogheads.js` already takes. The head
and the close are found by the selectors in `popupinv.js` (named per surface where the generic search is wrong).

**Not tiers, by design** (named so the numbers below are read fairly): the welcome wizard (slides, no head), the confirm
alert (a question and its answers), the Ctrl+K palette (an input and a list), the popovers and menus (anchored, no head,
the popover shell), and the in-page columns (Ask history, the notes rail, the Web panel, the board's Library) which are
cards in the page and keep the panel-head recipe. They are listed in the DESIGN.md row.

## Surfaces, selectors, openers, tiers

| surface | shell selector | opener | tier |
| --- | --- | --- | --- |
| settings-modal | `#settings-modal .modal-card` | header gear, Ctrl+, | dialog |
| doc-ai-panel | `#doc-ai-panel .doc-ai-card` | Documents: AI assistant | dialog |
| extract-panel | `#extract-panel .modal-card` | Extract to notes (Writing room, Documents, board selection) | dialog |
| history-overlay | `#history-overlay .modal-card` | a note's Earlier versions | dialog |
| connections-overlay | `#connections-overlay .modal-card` | a note's Connections | dialog |
| binned-overlay | `#binned-overlay .modal-card` | the bin | dialog |
| skill-run-overlay | `#skill-run-overlay .modal-card` | Run a skill with fields | dialog |
| shortcuts-overlay | `#shortcuts-overlay .modal-card` | ? | dialog |
| meeting-overlay | `#meeting-overlay .modal-card` | Meeting notes | dialog |
| features-overlay | `#features-overlay .modal-card` | Tools and features | dialog |
| onboarding-overlay | `#onboarding-overlay .modal-card` | first run (slides) | wizard, not a tier |
| ocr-workspace | `#ocr-workspace .ocr-card` | Library: read text from an image or a document | dialog (full workspace) |
| confirm-dialog | `.confirm-overlay .confirm-card` | confirmDialog() | alert, not a tier |
| space-create-dialog | `#space-create-dialog` | New space | dialog |
| space-delete-dialog | `#space-delete-dialog` | Delete space | dialog |
| doc-storage-dialog | `#doc-storage-dialog` | Documents: where are they kept | dialog |
| doc-template-dialog | `#doc-template-dialog` | Documents: new from a template | dialog |
| quick-note | `#quick-note` | Alt+N | dialog |
| doc-history-dialog | `#doc-history-dialog` | Documents: history | dialog |
| doc-ai-history-dialog | `#doc-ai-history-dialog` | Documents: AI edit history | dialog |
| doc-word-goal-dialog | `#doc-word-goal-dialog` | Documents: word-count goal | dialog |
| tensions-dialog | `#tensions-dialog` | Tensions widget | dialog |
| dash-widgets-dialog | `#dash-widgets-dialog` | Dashboard: widgets | dialog |
| doc-dictionary-dialog | `#doc-dictionary-dialog` | Documents: writing dictionary | dialog |
| command-palette-overlay | `#command-palette-overlay .command-palette-card` | Ctrl+Shift+A (the popup agent) | dialog (palette) |
| finder-overlay | `#finder-overlay .finder-card` | Ctrl+P, Find | dialog (palette) |
| palette-overlay | `#palette-overlay > .card` | Ctrl+K | palette, not a tier |
| improve-overlay | `#improve-overlay > .card` | Improve writing | dialog |
| sketch-overlay | `#sketch-overlay > .card` | Quick sketch | dialog |
| sheet (openSheet) | `[data-sheet] .sheet-card` | openSheet({label, name, build}) | sheet |
| sheet corner (Atlas guide) | `[data-sheet="guide"] .sheet-card` | openHelpChat() (the guide) | sheet (corner) |
| notif-panel | `#notif-panel` | header bell | panel |
| agent-monitor | `#agent-monitor` | status bar activity | panel |
| chat-model-panel | `#chat-model-panel` | chat: the model's name | popover |
| status-clock-detail | `#status-clock-detail` | status bar clock | popover |
| tour-card | `#tour-card` | the guided tour | panel |
| lightbox (media viewer) | `.lightbox` | a picture or document tile | viewer, not a tier |
| help-popover | `.help-popover` | any [data-help-for] '?' | popover |
| graph-popup | `#graph-popup` | Graph: a node | panel |
| graph-new | `#graph-new` | Graph: add a note | panel |
| graph-options | `#graph-options` | Graph: Options | popover (dock menu) |
| graph-help-panel | `#graph-help-panel` | Graph: '?' | popover |
| wb-navigator | `#wb-navigator` | Board: overview (Shift+N) | panel |

## Distinct values per property inside each tier, before and after

Counts of distinct values (`popupcmp.py`); fewer is more alike, one is identical. Dialog+sheet is 23 surfaces, palette 4, panel 6 (the welcome wizard, the confirm alert, the Ctrl+K palette, the OCR workspace, the popovers and the lightbox are outside the counts, by design).

```
1440 light
  dialog+sheet
    radius       before  2 {'8px': 22, '8px/0px': 1}
                 after   2 {'8px': 22, '8px/0px': 1}
    padding      before  2 {'16px 20px 16px 20px': 22, '16px 20px 12.8px 20px': 1}
                 after   2 {'16px 20px 16px 20px': 22, '16px 20px 12.8px 20px': 1}
    border       before  1 {'1px rgb(227, 225, 221)': 23}
                 after   1 {'1px rgb(227, 225, 221)': 23}
    headH        before  3 {'32': 12, '28': 1, '40': 1}
                 after   2 {'32': 22, '40': 1}
    titleSize    before  2 {'16px': 13, '12px': 1}
                 after   1 {'16px': 23}
    titleWeight  before  1 {'600': 14}
                 after   1 {'600': 23}
    closeKind    before  3 {'icon': 13, 'no close': 9, 'text "Cancel"': 1}
                 after   1 {'icon': 23}
    closeW       before  3 {'32': 9, '28': 4, '78': 1}
                 after   1 {'32': 23}
    closeRight   before  1 {'21': 14}
                 after   1 {'21': 23}
    closeTop     before  3 {'17': 11, '19': 2, '23': 1}
                 after   2 {'17': 22, '21': 1}
  palette
    radius       before  1 {'8px': 4}
                 after   1 {'8px': 4}
    padding      before  2 {'0px 0px 0px 0px': 2, '16px 20px 16px 20px': 2}
                 after   2 {'0px 0px 0px 0px': 2, '16px 20px 16px 20px': 2}
    border       before  1 {'1px rgb(227, 225, 221)': 4}
                 after   1 {'1px rgb(227, 225, 221)': 4}
    headH        before  3 {'32': 2, '40': 1, '52': 1}
                 after   3 {'32': 2, '48': 1, '59': 1}
    titleSize    before  2 {'16px': 3, '12px': 1}
                 after   1 {'16px': 4}
    titleWeight  before  1 {'600': 4}
                 after   1 {'600': 4}
    closeKind    before  1 {'icon': 4}
                 after   1 {'icon': 4}
    closeW       before  2 {'28': 2, '32': 2}
                 after   1 {'32': 4}
    closeRight   before  1 {'21': 4}
                 after   1 {'21': 4}
    closeTop     before  3 {'17': 2, '11': 1, '13': 1}
                 after   1 {'17': 4}
  panel
    radius       before  2 {'8px': 5, '6.4px': 1}
                 after   1 {'8px': 6}
    padding      before  5 {'12.8px 12.8px 12.8px 12.8px': 2, '9.6px 12.8px 9.6px 12.8px': 1, '9.6px 9.6px 9.6px 9.6px': 1, '16px 20px 16px 20px': 1}
                 after   1 {'12.8px 12.8px 12.8px 12.8px': 6}
    border       before  2 {'1px rgb(227, 225, 221)': 5, '1px rgba(28, 28, 26, 0.1)': 1}
                 after   1 {'1px rgb(227, 225, 221)': 6}
    headH        before  4 {'32': 2, '28': 2, '37': 1, '36': 1}
                 after   3 {'32': 4, '41': 1, '36': 1}
    titleSize    before  4 {'14.72px': 2, '': 2, '12px': 1, '16px': 1}
                 after   2 {'16px': 4, '': 2}
    titleWeight  before  4 {'': 2, '700': 2, '400': 1, '600': 1}
                 after   2 {'600': 4, '': 2}
    closeKind    before  1 {'icon': 6}
                 after   1 {'icon': 6}
    closeW       before  3 {'28': 4, '32': 1, '36': 1}
                 after   1 {'32': 6}
    closeRight   before  4 {'14': 3, '11': 1, '21': 1, '9': 1}
                 after   1 {'14': 6}
    closeTop     before  3 {'11': 3, '14': 2, '17': 1}
                 after   1 {'14': 6}

1440 dark
  dialog+sheet
    radius       before  2 {'8px': 22, '8px/0px': 1}
                 after   2 {'8px': 22, '8px/0px': 1}
    padding      before  2 {'16px 20px 16px 20px': 22, '16px 20px 12.8px 20px': 1}
                 after   2 {'16px 20px 16px 20px': 22, '16px 20px 12.8px 20px': 1}
    border       before  1 {'1px rgb(47, 47, 44)': 23}
                 after   1 {'1px rgb(47, 47, 44)': 23}
    headH        before  3 {'32': 12, '28': 1, '40': 1}
                 after   2 {'32': 22, '40': 1}
    titleSize    before  2 {'16px': 13, '12px': 1}
                 after   1 {'16px': 23}
    titleWeight  before  1 {'600': 14}
                 after   1 {'600': 23}
    closeKind    before  3 {'icon': 13, 'no close': 9, 'text "Cancel"': 1}
                 after   1 {'icon': 23}
    closeW       before  3 {'32': 9, '28': 4, '78': 1}
                 after   1 {'32': 23}
    closeRight   before  1 {'21': 14}
                 after   1 {'21': 23}
    closeTop     before  3 {'17': 11, '19': 2, '23': 1}
                 after   2 {'17': 22, '21': 1}
  palette
    radius       before  1 {'8px': 4}
                 after   1 {'8px': 4}
    padding      before  2 {'0px 0px 0px 0px': 2, '16px 20px 16px 20px': 2}
                 after   2 {'0px 0px 0px 0px': 2, '16px 20px 16px 20px': 2}
    border       before  1 {'1px rgb(47, 47, 44)': 4}
                 after   1 {'1px rgb(47, 47, 44)': 4}
    headH        before  3 {'32': 2, '40': 1, '52': 1}
                 after   3 {'32': 2, '48': 1, '59': 1}
    titleSize    before  2 {'16px': 3, '12px': 1}
                 after   1 {'16px': 4}
    titleWeight  before  1 {'600': 4}
                 after   1 {'600': 4}
    closeKind    before  1 {'icon': 4}
                 after   1 {'icon': 4}
    closeW       before  2 {'28': 2, '32': 2}
                 after   1 {'32': 4}
    closeRight   before  1 {'21': 4}
                 after   1 {'21': 4}
    closeTop     before  3 {'17': 2, '11': 1, '13': 1}
                 after   1 {'17': 4}
  panel
    radius       before  2 {'8px': 5, '6.4px': 1}
                 after   1 {'8px': 6}
    padding      before  5 {'12.8px 12.8px 12.8px 12.8px': 2, '9.6px 12.8px 9.6px 12.8px': 1, '9.6px 9.6px 9.6px 9.6px': 1, '16px 20px 16px 20px': 1}
                 after   1 {'12.8px 12.8px 12.8px 12.8px': 6}
    border       before  2 {'1px rgb(47, 47, 44)': 5, '1px rgba(236, 235, 232, 0.1)': 1}
                 after   1 {'1px rgb(47, 47, 44)': 6}
    headH        before  4 {'32': 2, '28': 2, '37': 1, '36': 1}
                 after   3 {'32': 4, '41': 1, '36': 1}
    titleSize    before  4 {'14.72px': 2, '': 2, '12px': 1, '16px': 1}
                 after   2 {'16px': 4, '': 2}
    titleWeight  before  4 {'': 2, '700': 2, '400': 1, '600': 1}
                 after   2 {'600': 4, '': 2}
    closeKind    before  1 {'icon': 6}
                 after   1 {'icon': 6}
    closeW       before  3 {'28': 4, '32': 1, '36': 1}
                 after   1 {'32': 6}
    closeRight   before  4 {'14': 3, '11': 1, '21': 1, '9': 1}
                 after   1 {'14': 6}
    closeTop     before  3 {'11': 3, '14': 2, '17': 1}
                 after   1 {'14': 6}

390 light
  dialog+sheet
    radius       before  2 {'8px': 21, '8px/0px': 2}
                 after   2 {'8px': 21, '8px/0px': 2}
    padding      before  1 {'12.8px 16px 12.8px 16px': 23}
                 after   1 {'12.8px 16px 12.8px 16px': 23}
    border       before  1 {'1px rgb(227, 225, 221)': 23}
                 after   1 {'1px rgb(227, 225, 221)': 23}
    headH        before  3 {'44': 12, '78': 1, '32': 1}
                 after   3 {'44': 21, '78': 1, '32': 1}
    titleSize    before  2 {'16px': 13, '12px': 1}
                 after   1 {'16px': 23}
    titleWeight  before  1 {'600': 14}
                 after   1 {'600': 23}
    closeKind    before  3 {'icon': 13, 'no close': 9, 'text "Cancel"': 1}
                 after   1 {'icon': 23}
    closeW       before  2 {'44': 13, '78': 1}
                 after   1 {'44': 23}
    closeRight   before  2 {'17': 13, '55': 1}
                 after   2 {'17': 22, '55': 1}
    closeTop     before  3 {'14': 12, '47': 1, '8': 1}
                 after   3 {'14': 21, '47': 1, '8': 1}
  palette
    radius       before  1 {'8px': 4}
                 after   1 {'8px': 4}
    padding      before  2 {'0px 0px 0px 0px': 2, '12.8px 16px 12.8px 16px': 2}
                 after   2 {'0px 0px 0px 0px': 2, '12.8px 16px 12.8px 16px': 2}
    border       before  1 {'1px rgb(227, 225, 221)': 4}
                 after   1 {'1px rgb(227, 225, 221)': 4}
    headH        before  3 {'44': 2, '52': 1, '64': 1}
                 after   3 {'44': 2, '57': 1, '67': 1}
    titleSize    before  2 {'16px': 3, '12px': 1}
                 after   1 {'16px': 4}
    titleWeight  before  1 {'600': 4}
                 after   1 {'600': 4}
    closeKind    before  1 {'icon': 4}
                 after   1 {'icon': 4}
    closeW       before  1 {'44': 4}
                 after   1 {'44': 4}
    closeRight   before  1 {'17': 4}
                 after   1 {'17': 4}
    closeTop     before  3 {'14': 2, '9': 1, '11': 1}
                 after   1 {'14': 4}
  panel
    radius       before  3 {'8px': 3, '6.4px': 1, '4.8px/0px': 1}
                 after   1 {'8px': 5}
    padding      before  4 {'12.8px 12.8px 12.8px 12.8px': 2, '9.6px 12.8px 9.6px 12.8px': 1, '9.6px 9.6px 9.6px 9.6px': 1, '12.8px 16px 12.8px 16px': 1}
                 after   1 {'12.8px 12.8px 12.8px 12.8px': 5}
    border       before  2 {'1px rgb(227, 225, 221)': 4, '1px rgba(28, 28, 26, 0.1)': 1}
                 after   1 {'1px rgb(227, 225, 221)': 5}
    headH        before  2 {'44': 4, '53': 1}
                 after   2 {'44': 4, '53': 1}
    titleSize    before  4 {'14.72px': 2, '12px': 1, '': 1, '16px': 1}
                 after   2 {'16px': 4, '': 1}
    titleWeight  before  4 {'700': 2, '400': 1, '600': 1, '': 1}
                 after   2 {'600': 4, '': 1}
    closeKind    before  1 {'icon': 5}
                 after   1 {'icon': 5}
    closeW       before  1 {'44': 5}
                 after   1 {'44': 5}
    closeRight   before  3 {'14': 3, '13': 1, '17': 1}
                 after   2 {'14': 4, '16': 1}
    closeTop     before  2 {'14': 3, '11': 2}
                 after   1 {'14': 5}

390 dark
  dialog+sheet
    radius       before  2 {'8px': 21, '8px/0px': 2}
                 after   2 {'8px': 21, '8px/0px': 2}
    padding      before  1 {'12.8px 16px 12.8px 16px': 23}
                 after   1 {'12.8px 16px 12.8px 16px': 23}
    border       before  1 {'1px rgb(47, 47, 44)': 23}
                 after   1 {'1px rgb(47, 47, 44)': 23}
    headH        before  3 {'44': 12, '78': 1, '32': 1}
                 after   3 {'44': 21, '78': 1, '32': 1}
    titleSize    before  2 {'16px': 13, '12px': 1}
                 after   1 {'16px': 23}
    titleWeight  before  1 {'600': 14}
                 after   1 {'600': 23}
    closeKind    before  3 {'icon': 13, 'no close': 9, 'text "Cancel"': 1}
                 after   1 {'icon': 23}
    closeW       before  2 {'44': 13, '78': 1}
                 after   1 {'44': 23}
    closeRight   before  2 {'17': 13, '55': 1}
                 after   2 {'17': 22, '55': 1}
    closeTop     before  3 {'14': 12, '47': 1, '8': 1}
                 after   3 {'14': 21, '47': 1, '8': 1}
  palette
    radius       before  1 {'8px': 4}
                 after   1 {'8px': 4}
    padding      before  2 {'0px 0px 0px 0px': 2, '12.8px 16px 12.8px 16px': 2}
                 after   2 {'0px 0px 0px 0px': 2, '12.8px 16px 12.8px 16px': 2}
    border       before  1 {'1px rgb(47, 47, 44)': 4}
                 after   1 {'1px rgb(47, 47, 44)': 4}
    headH        before  3 {'44': 2, '52': 1, '64': 1}
                 after   3 {'44': 2, '57': 1, '67': 1}
    titleSize    before  2 {'16px': 3, '12px': 1}
                 after   1 {'16px': 4}
    titleWeight  before  1 {'600': 4}
                 after   1 {'600': 4}
    closeKind    before  1 {'icon': 4}
                 after   1 {'icon': 4}
    closeW       before  1 {'44': 4}
                 after   1 {'44': 4}
    closeRight   before  1 {'17': 4}
                 after   1 {'17': 4}
    closeTop     before  3 {'14': 2, '9': 1, '11': 1}
                 after   1 {'14': 4}
  panel
    radius       before  3 {'8px': 3, '6.4px': 1, '4.8px/0px': 1}
                 after   1 {'8px': 5}
    padding      before  4 {'12.8px 12.8px 12.8px 12.8px': 2, '9.6px 12.8px 9.6px 12.8px': 1, '9.6px 9.6px 9.6px 9.6px': 1, '12.8px 16px 12.8px 16px': 1}
                 after   1 {'12.8px 12.8px 12.8px 12.8px': 5}
    border       before  2 {'1px rgb(47, 47, 44)': 4, '1px rgba(236, 235, 232, 0.1)': 1}
                 after   1 {'1px rgb(47, 47, 44)': 5}
    headH        before  2 {'44': 4, '53': 1}
                 after   2 {'44': 4, '53': 1}
    titleSize    before  4 {'14.72px': 2, '12px': 1, '': 1, '16px': 1}
                 after   2 {'16px': 4, '': 1}
    titleWeight  before  4 {'700': 2, '400': 1, '600': 1, '': 1}
                 after   2 {'600': 4, '': 1}
    closeKind    before  1 {'icon': 5}
                 after   1 {'icon': 5}
    closeW       before  1 {'44': 5}
                 after   1 {'44': 5}
    closeRight   before  3 {'14': 3, '13': 1, '17': 1}
                 after   2 {'14': 4, '16': 1}
    closeTop     before  2 {'14': 3, '11': 2}
                 after   1 {'14': 5}

```

## After (the branch head)

### 1440px, light

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 16px 20px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 1024x792 |
| doc-ai-panel | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 736x197 |
| extract-panel | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 832x200 |
| history-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 704x93 |
| connections-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 704x123 |
| binned-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 880x181 |
| skill-run-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 880x140 |
| shortcuts-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 520x771 |
| meeting-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 880x286 |
| features-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 736x143 |
| onboarding-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | text "Back" 64x32 r92 t185 | rgba(17,20,32,0.45) | 480x234 |
| ocr-workspace | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 1382x792 |
| confirm-dialog | 8px | 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | none | rgba(17,20,32,0.45) | 480x134 |
| space-create-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 544x296 |
| space-delete-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 544x226 |
| doc-storage-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 544x328 |
| doc-template-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 736x564 |
| quick-note | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 576x328 |
| doc-history-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 480x291 |
| doc-ai-history-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 480x192 |
| doc-word-goal-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 544x262 |
| tensions-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 896x178 |
| dash-widgets-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 704x246 |
| doc-dictionary-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 512x491 |
| command-palette-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 48 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 600x319 |
| finder-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 59 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 832x378 |
| palette-overlay | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | rgba(17,20,32,0.45) | 704x115 |
| improve-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 760x275 |
| sketch-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 900x685 |
| sheet (openSheet) | 8px/0px | 16px 20px 12.8px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(17,20,32,0.45) | 544x112 |
| sheet corner (Atlas guide) | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 40 | 16px/600 | icon 32x32 r21 t21 | rgba(17,20,32,0.45) | 448x341 |
| notif-panel | 8px | 12.8px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 32 | 16px/600 | icon 32x32 r14 t14 | none | 400x246 |
| agent-monitor | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255)+grad | S1 | 41 | 16px/600 | icon 32x32 r14 t14 | none | 384x105 |
| chat-model-panel | 6.4px | 8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px | 1px rgb(227,225,221) | color(srgb 1 1 1)+grad | S1 | 32 |  | icon 32x32 r14 t14 | none | 336x104 |
| lightbox (media viewer) | 0px | 24px 16px | none | rgba(8,10,18,0.82) | S2 |  |  | icon 40x40 r24 t16 | rgba(8,10,18,0.82) | 1440x900 |
| help-popover | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 416x252 |
| graph-popup | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 36 | 16px/600 | icon 32x36 r14 t14 | none | 448x277 |
| graph-new | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r14 t14 | none | 448x313 |
| graph-options | 6.4px | 0px | 1px rgba(28,28,26,0.1) | rgb(255,255,255) | S1 | 32 |  | none | none | 400x457 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  | 14.72px/700 | none | none | 416x416 |
| wb-navigator | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 |  | icon 32x32 r14 t14 | none | 245x221 |

Shadows:
- S1: `rgba(28, 28, 26, 0.06) 0px 1px 2px 0px, rgba(28, 28, 26, 0.04) 0px 2px`
- S2: `none`

### 1440px, dark

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 16px 20px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 1024x792 |
| doc-ai-panel | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 736x197 |
| extract-panel | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 832x200 |
| history-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 704x93 |
| connections-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 704x123 |
| binned-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 880x181 |
| skill-run-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 880x140 |
| shortcuts-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 520x771 |
| meeting-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 880x286 |
| features-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 736x143 |
| onboarding-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | text "Back" 64x32 r92 t185 | rgba(5,7,14,0.6) | 480x234 |
| ocr-workspace | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 1382x792 |
| confirm-dialog | 8px | 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | none | rgba(5,7,14,0.6) | 480x134 |
| space-create-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 544x296 |
| space-delete-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 544x226 |
| doc-storage-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 544x328 |
| doc-template-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 736x564 |
| quick-note | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 576x328 |
| doc-history-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 480x291 |
| doc-ai-history-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 480x192 |
| doc-word-goal-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 544x262 |
| tensions-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 896x178 |
| dash-widgets-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 704x246 |
| doc-dictionary-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 512x491 |
| command-palette-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 48 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 600x319 |
| finder-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 59 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 832x378 |
| palette-overlay | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | rgba(5,7,14,0.6) | 704x115 |
| improve-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 760x275 |
| sketch-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 900x685 |
| sheet (openSheet) | 8px/0px | 16px 20px 12.8px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(5,7,14,0.6) | 544x112 |
| sheet corner (Atlas guide) | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 40 | 16px/600 | icon 32x32 r21 t21 | rgba(5,7,14,0.6) | 448x341 |
| notif-panel | 8px | 12.8px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 32 | 16px/600 | icon 32x32 r14 t14 | none | 400x246 |
| agent-monitor | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28)+grad | S1 | 41 | 16px/600 | icon 32x32 r14 t14 | none | 384x105 |
| chat-model-panel | 6.4px | 8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804)+grad | S1 | 32 |  | icon 32x32 r14 t14 | none | 336x104 |
| lightbox (media viewer) | 0px | 24px 16px | none | rgba(8,10,18,0.82) | S2 |  |  | icon 40x40 r24 t16 | rgba(8,10,18,0.82) | 1440x900 |
| help-popover | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 416x252 |
| graph-popup | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 36 | 16px/600 | icon 32x36 r14 t14 | none | 448x277 |
| graph-new | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r14 t14 | none | 448x313 |
| graph-options | 6.4px | 0px | 1px rgba(236,235,232,0.1) | rgb(30,30,28) | S1 | 32 |  | none | none | 400x457 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  | 14.72px/700 | none | none | 416x416 |
| wb-navigator | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 |  | icon 32x32 r14 t14 | none | 245x221 |

Shadows:
- S1: `rgba(0, 0, 0, 0.4) 0px 1px 2px 0px, rgba(0, 0, 0, 0.25) 0px 4px 12px 0`
- S2: `none`

### 390px, light

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 12.8px 16px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 78 | 16px/600 | icon 44x44 r55 t47 | rgba(17,20,32,0.45) | 342x777 |
| doc-ai-panel | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x256 |
| extract-panel | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x209 |
| history-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x99 |
| connections-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x128 |
| binned-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x199 |
| skill-run-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x158 |
| shortcuts-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 44x44 r17 t8 | rgba(17,20,32,0.45) | 342x810 |
| meeting-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x326 |
| features-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x149 |
| onboarding-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | text "Back" 64x44 r88 t182 | rgba(17,20,32,0.45) | 342x240 |
| ocr-workspace | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x776 |
| confirm-dialog | 8px | 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | none | rgba(17,20,32,0.45) | 342x146 |
| space-create-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x328 |
| space-delete-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x265 |
| doc-storage-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x426 |
| doc-template-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x212 |
| quick-note | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x360 |
| doc-history-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x360 |
| doc-ai-history-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x246 |
| doc-word-goal-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x293 |
| tensions-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x254 |
| dash-widgets-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x285 |
| doc-dictionary-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x582 |
| command-palette-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 57 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 390x374 |
| finder-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 67 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 390x405 |
| palette-overlay | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | rgba(17,20,32,0.45) | 359x133 |
| improve-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x416 |
| sketch-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 342x698 |
| sheet (openSheet) | 8px/0px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 390x123 |
| sheet corner (Atlas guide) | 8px/0px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(17,20,32,0.45) | 390x390 |
| notif-panel | 8px | 12.8px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 371x270 |
| agent-monitor | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255)+grad | S1 | 53 | 16px/600 | icon 44x44 r16 t14 | none | 390x119 |
| chat-model-panel | 6.4px | 8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px | 1px rgb(227,225,221) | color(srgb 1 1 1)+grad | S1 | 44 |  | icon 44x44 r14 t14 | none | 358x128 |
| lightbox (media viewer) | 0px | 24px 16px | none | rgba(8,10,18,0.82) | S2 |  |  | icon 40x40 r24 t16 | rgba(8,10,18,0.82) | 390x844 |
| help-popover | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 366x274 |
| graph-popup | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 346x288 |
| graph-new | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 346x342 |
| graph-options | 6.4px | 0px | 1px rgba(28,28,26,0.1) | rgb(255,255,255) | S1 | 44 |  | none | none | 350x364 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  | 14.72px/700 | none | none | 350x416 |
| wb-navigator | not measured (#wb-navigator) | | | | | | | | | | |

Shadows:
- S1: `rgba(28, 28, 26, 0.06) 0px 1px 2px 0px, rgba(28, 28, 26, 0.04) 0px 2px`
- S2: `none`

### 390px, dark

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 12.8px 16px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 78 | 16px/600 | icon 44x44 r55 t47 | rgba(5,7,14,0.6) | 342x777 |
| doc-ai-panel | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x256 |
| extract-panel | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x209 |
| history-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x99 |
| connections-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x128 |
| binned-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x199 |
| skill-run-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x158 |
| shortcuts-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 44x44 r17 t8 | rgba(5,7,14,0.6) | 342x810 |
| meeting-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x326 |
| features-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x149 |
| onboarding-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | text "Back" 64x44 r88 t182 | rgba(5,7,14,0.6) | 342x240 |
| ocr-workspace | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x776 |
| confirm-dialog | 8px | 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | none | rgba(5,7,14,0.6) | 342x146 |
| space-create-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x328 |
| space-delete-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x265 |
| doc-storage-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x426 |
| doc-template-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x212 |
| quick-note | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x360 |
| doc-history-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x360 |
| doc-ai-history-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x246 |
| doc-word-goal-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x293 |
| tensions-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x254 |
| dash-widgets-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x285 |
| doc-dictionary-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x582 |
| command-palette-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 57 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 390x374 |
| finder-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 67 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 390x405 |
| palette-overlay | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | rgba(5,7,14,0.6) | 359x133 |
| improve-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x416 |
| sketch-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 342x698 |
| sheet (openSheet) | 8px/0px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 390x123 |
| sheet corner (Atlas guide) | 8px/0px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(5,7,14,0.6) | 390x390 |
| notif-panel | 8px | 12.8px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 371x270 |
| agent-monitor | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28)+grad | S1 | 53 | 16px/600 | icon 44x44 r16 t14 | none | 390x119 |
| chat-model-panel | 6.4px | 8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804)+grad | S1 | 44 |  | icon 44x44 r14 t14 | none | 358x128 |
| lightbox (media viewer) | 0px | 24px 16px | none | rgba(8,10,18,0.82) | S2 |  |  | icon 40x40 r24 t16 | rgba(8,10,18,0.82) | 390x844 |
| help-popover | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 366x274 |
| graph-popup | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 346x288 |
| graph-new | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r14 t14 | none | 346x342 |
| graph-options | 6.4px | 0px | 1px rgba(236,235,232,0.1) | rgb(30,30,28) | S1 | 44 |  | none | none | 350x364 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  | 14.72px/700 | none | none | 350x416 |
| wb-navigator | not measured (#wb-navigator) | | | | | | | | | | |

Shadows:
- S1: `rgba(0, 0, 0, 0.4) 0px 1px 2px 0px, rgba(0, 0, 0, 0.25) 0px 4px 12px 0`
- S2: `none`


## Before (the base, f2ccd52 plus the merge of notes-flow-rebuild)

### 1440px, light

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 16px 20px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 1024x792 |
| doc-ai-panel | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 736x197 |
| extract-panel | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 28x28 r21 t19 | rgba(10,12,18,0.45) | 832x200 |
| history-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 704x93 |
| connections-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 704x123 |
| binned-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 880x181 |
| skill-run-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | text "Cancel" 78x32 r21 t17 | rgba(10,12,18,0.45) | 880x140 |
| shortcuts-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 520x771 |
| meeting-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 880x286 |
| features-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 736x143 |
| onboarding-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | text "Back" 64x32 r92 t185 | rgba(10,12,18,0.45) | 480x234 |
| ocr-workspace | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 1382x792 |
| confirm-dialog | 8px | 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 14.72px/600 | none | rgba(10,12,18,0.45) | 480x134 |
| space-create-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 851x260 |
| space-delete-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 504x212 |
| doc-storage-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 1332x226 |
| doc-template-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 736x550 |
| quick-note | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 12px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 576x328 |
| doc-history-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 480x277 |
| doc-ai-history-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 480x178 |
| doc-word-goal-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 818x226 |
| tensions-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 896x172 |
| dash-widgets-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 704x240 |
| doc-dictionary-dialog | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 28x28 r21 t19 | rgba(10,12,18,0.45) | 512x491 |
| command-palette-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 40 | 12px/600 | icon 28x28 r21 t11 | rgba(17,20,32,0.45) | 600x311 |
| finder-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 52 | 16px/600 | icon 28x28 r21 t13 | rgba(0,0,0,0) | 832x372 |
| palette-overlay | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | rgba(10,12,24,0.45) | 704x115 |
| improve-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,24,0.45) | 760x275 |
| sketch-overlay | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,24,0.45) | 900x685 |
| sheet (openSheet) | 8px/0px | 16px 20px 12.8px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 28 | 16px/600 | icon 28x28 r21 t17 | rgba(10,12,18,0.45) | 544x108 |
| sheet corner (Atlas guide) | 8px | 16px 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 40 | 16px/600 | icon 28x28 r21 t23 | rgba(10,12,18,0.45) | 448x341 |
| notif-panel | 6.4px | 9.6px 12.8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 | 32 | 14.72px/400 | icon 32x32 r14 t11 | none | 400x239 |
| agent-monitor | 8px | 9.6px | 1px rgb(227,225,221) | rgb(255,255,255)+grad | S1 | 37 | 12px/600 | icon 28x28 r11 t11 | none | 384x95 |
| chat-model-panel | 6.4px | 8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 16px 20px | 1px rgb(227,225,221) | color(srgb 1 1 1)+grad | S1 | 28 |  | icon 28x28 r21 t17 | none | 336x107 |
| help-popover | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 416x252 |
| graph-popup | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 36 | 16px/700 | icon 36x36 r14 t14 | none | 448x277 |
| graph-new | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 28 | 14.72px/700 | icon 28x28 r14 t14 | none | 448x309 |
| graph-options | 6.4px | 0px | 1px rgba(28,28,26,0.1) | rgb(255,255,255) | S1 | 32 |  | none | none | 400x457 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  | 14.72px/700 | none | none | 416x416 |
| wb-navigator | 8px | 8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 |  | icon 28x28 r9 t11 | none | 235x212 |

Shadows:
- S1: `rgba(28, 28, 26, 0.06) 0px 1px 2px 0px, rgba(28, 28, 26, 0.04) 0px 2px`

### 1440px, dark

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 16px 20px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 1024x792 |
| doc-ai-panel | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 736x197 |
| extract-panel | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 28x28 r21 t19 | rgba(10,12,18,0.45) | 832x200 |
| history-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 704x93 |
| connections-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 704x123 |
| binned-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 880x181 |
| skill-run-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | text "Cancel" 78x32 r21 t17 | rgba(10,12,18,0.45) | 880x140 |
| shortcuts-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 520x771 |
| meeting-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 880x286 |
| features-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 736x143 |
| onboarding-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | text "Back" 64x32 r92 t185 | rgba(10,12,18,0.45) | 480x234 |
| ocr-workspace | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 1382x792 |
| confirm-dialog | 8px | 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 14.72px/600 | none | rgba(10,12,18,0.45) | 480x134 |
| space-create-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 851x260 |
| space-delete-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 504x212 |
| doc-storage-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 1332x226 |
| doc-template-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 736x550 |
| quick-note | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 12px/600 | icon 32x32 r21 t17 | rgba(10,12,18,0.45) | 576x328 |
| doc-history-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 480x277 |
| doc-ai-history-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 480x178 |
| doc-word-goal-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 818x226 |
| tensions-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 896x172 |
| dash-widgets-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 704x240 |
| doc-dictionary-dialog | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 28x28 r21 t19 | rgba(10,12,18,0.45) | 512x491 |
| command-palette-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 40 | 12px/600 | icon 28x28 r21 t11 | rgba(5,7,14,0.6) | 600x311 |
| finder-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 52 | 16px/600 | icon 28x28 r21 t13 | rgba(0,0,0,0) | 832x372 |
| palette-overlay | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | rgba(10,12,24,0.45) | 704x115 |
| improve-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,24,0.45) | 760x275 |
| sketch-overlay | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 32x32 r21 t17 | rgba(10,12,24,0.45) | 900x685 |
| sheet (openSheet) | 8px/0px | 16px 20px 12.8px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 28 | 16px/600 | icon 28x28 r21 t17 | rgba(10,12,18,0.45) | 544x108 |
| sheet corner (Atlas guide) | 8px | 16px 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 40 | 16px/600 | icon 28x28 r21 t23 | rgba(10,12,18,0.45) | 448x341 |
| notif-panel | 6.4px | 9.6px 12.8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 | 32 | 14.72px/400 | icon 32x32 r14 t11 | none | 400x239 |
| agent-monitor | 8px | 9.6px | 1px rgb(47,47,44) | rgb(30,30,28)+grad | S1 | 37 | 12px/600 | icon 28x28 r11 t11 | none | 384x95 |
| chat-model-panel | 6.4px | 8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 16px 20px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804)+grad | S1 | 28 |  | icon 28x28 r21 t17 | none | 336x107 |
| help-popover | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 416x252 |
| graph-popup | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 36 | 16px/700 | icon 36x36 r14 t14 | none | 448x277 |
| graph-new | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 28 | 14.72px/700 | icon 28x28 r14 t14 | none | 448x309 |
| graph-options | 6.4px | 0px | 1px rgba(236,235,232,0.1) | rgb(30,30,28) | S1 | 32 |  | none | none | 400x457 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  | 14.72px/700 | none | none | 416x416 |
| wb-navigator | 8px | 8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 |  | icon 28x28 r9 t11 | none | 235x212 |

Shadows:
- S1: `rgba(0, 0, 0, 0.4) 0px 1px 2px 0px, rgba(0, 0, 0, 0.25) 0px 4px 12px 0`

### 390px, light

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 12.8px 16px | 1px rgb(227,225,221) | color(srgb 1 1 1) | S1 | 78 | 16px/600 | icon 44x44 r55 t47 | rgba(10,12,18,0.45) | 342x777 |
| doc-ai-panel | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x256 |
| extract-panel | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x209 |
| history-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x99 |
| connections-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x128 |
| binned-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x199 |
| skill-run-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | text "Cancel" 78x44 r17 t14 | rgba(10,12,18,0.45) | 342x158 |
| shortcuts-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 32 | 16px/600 | icon 44x44 r17 t8 | rgba(10,12,18,0.45) | 342x810 |
| meeting-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x326 |
| features-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x149 |
| onboarding-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 16px/600 | text "Back" 64x44 r88 t182 | rgba(10,12,18,0.45) | 342x240 |
| ocr-workspace | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x776 |
| confirm-dialog | 8px | 20px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 14.72px/600 | none | rgba(10,12,18,0.45) | 342x146 |
| space-create-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x302 |
| space-delete-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x239 |
| doc-storage-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x378 |
| doc-template-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x186 |
| quick-note | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 12px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 366x360 |
| doc-history-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x312 |
| doc-ai-history-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x198 |
| doc-word-goal-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x267 |
| tensions-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x236 |
| dash-widgets-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x267 |
| doc-dictionary-dialog | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 366x582 |
| command-palette-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 52 | 12px/600 | icon 44x44 r17 t9 | rgba(17,20,32,0.45) | 390x369 |
| finder-overlay | 8px | 0px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 64 | 16px/600 | icon 44x44 r17 t11 | rgba(0,0,0,0) | 390x402 |
| palette-overlay | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | rgba(10,12,24,0.45) | 359x133 |
| improve-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,24,0.45) | 358x416 |
| sketch-overlay | 8px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,24,0.45) | 358x707 |
| sheet (openSheet) | 8px/0px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 390x123 |
| sheet corner (Atlas guide) | 8px/0px | 12.8px 16px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 390x390 |
| notif-panel | 6.4px | 9.6px 12.8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 | 44 | 14.72px/400 | icon 44x44 r14 t11 | none | 371x263 |
| agent-monitor | 4.8px/0px | 9.6px | 1px rgb(227,225,221) | rgb(255,255,255)+grad | S1 | 53 | 12px/600 | icon 44x44 r13 t11 | none | 390x113 |
| chat-model-panel | 6.4px | 8px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px 16px | 1px rgb(227,225,221) | color(srgb 1 1 1)+grad | S1 | 44 |  | icon 44x44 r17 t14 | none | 358x128 |
| help-popover | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  |  | none | none | 366x274 |
| graph-popup | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 16px/700 | icon 44x44 r14 t14 | none | 346x288 |
| graph-new | 8px | 12.8px | 1px rgb(227,225,221) | rgb(255,255,255) | S1 | 44 | 14.72px/700 | icon 44x44 r14 t14 | none | 346x342 |
| graph-options | 6.4px | 0px | 1px rgba(28,28,26,0.1) | rgb(255,255,255) | S1 | 44 |  | none | none | 350x364 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(28,28,26,0.1) | color(srgb 1 1 1) | S1 |  | 14.72px/700 | none | none | 350x416 |
| wb-navigator | not measured (#wb-navigator) | | | | | | | | | | |

Shadows:
- S1: `rgba(28, 28, 26, 0.06) 0px 1px 2px 0px, rgba(28, 28, 26, 0.04) 0px 2px`

### 390px, dark

| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| settings-modal | 8px | 12.8px 16px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804) | S1 | 78 | 16px/600 | icon 44x44 r55 t47 | rgba(10,12,18,0.45) | 342x777 |
| doc-ai-panel | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x256 |
| extract-panel | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x209 |
| history-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x99 |
| connections-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x128 |
| binned-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x199 |
| skill-run-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | text "Cancel" 78x44 r17 t14 | rgba(10,12,18,0.45) | 342x158 |
| shortcuts-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 32 | 16px/600 | icon 44x44 r17 t8 | rgba(10,12,18,0.45) | 342x810 |
| meeting-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x326 |
| features-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x149 |
| onboarding-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 16px/600 | text "Back" 64x44 r88 t182 | rgba(10,12,18,0.45) | 342x240 |
| ocr-workspace | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 342x776 |
| confirm-dialog | 8px | 20px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 14.72px/600 | none | rgba(10,12,18,0.45) | 342x146 |
| space-create-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x302 |
| space-delete-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x239 |
| doc-storage-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x378 |
| doc-template-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x186 |
| quick-note | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 12px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 366x360 |
| doc-history-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x312 |
| doc-ai-history-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x198 |
| doc-word-goal-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x267 |
| tensions-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x236 |
| dash-widgets-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  | 12px/600 | none | rgba(10,12,18,0.45) | 366x267 |
| doc-dictionary-dialog | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 366x582 |
| command-palette-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 52 | 12px/600 | icon 44x44 r17 t9 | rgba(5,7,14,0.6) | 390x369 |
| finder-overlay | 8px | 0px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 64 | 16px/600 | icon 44x44 r17 t11 | rgba(0,0,0,0) | 390x402 |
| palette-overlay | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | rgba(10,12,24,0.45) | 359x133 |
| improve-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,24,0.45) | 358x416 |
| sketch-overlay | 8px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,24,0.45) | 358x707 |
| sheet (openSheet) | 8px/0px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 390x123 |
| sheet corner (Atlas guide) | 8px/0px | 12.8px 16px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/600 | icon 44x44 r17 t14 | rgba(10,12,18,0.45) | 390x390 |
| notif-panel | 6.4px | 9.6px 12.8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 | 44 | 14.72px/400 | icon 44x44 r14 t11 | none | 371x263 |
| agent-monitor | 4.8px/0px | 9.6px | 1px rgb(47,47,44) | rgb(30,30,28)+grad | S1 | 53 | 12px/600 | icon 44x44 r13 t11 | none | 390x113 |
| chat-model-panel | 6.4px | 8px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 288x18 |
| status-clock-detail | 6.4px | 8px 9.6px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 |  |  | none | none | 192x22 |
| tour-card | 8px | 12.8px 16px | 1px rgb(47,47,44) | color(srgb 0.117647 0.117647 0.109804)+grad | S1 | 44 |  | icon 44x44 r17 t14 | none | 358x128 |
| help-popover | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  |  | none | none | 366x274 |
| graph-popup | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 16px/700 | icon 44x44 r14 t14 | none | 346x288 |
| graph-new | 8px | 12.8px | 1px rgb(47,47,44) | rgb(30,30,28) | S1 | 44 | 14.72px/700 | icon 44x44 r14 t14 | none | 346x342 |
| graph-options | 6.4px | 0px | 1px rgba(236,235,232,0.1) | rgb(30,30,28) | S1 | 44 |  | none | none | 350x364 |
| graph-help-panel | 6.4px | 9.6px | 1px rgba(236,235,232,0.1) | color(srgb 0.117647 0.117647 0.109804) | S1 |  | 14.72px/700 | none | none | 350x416 |
| wb-navigator | not measured (#wb-navigator) | | | | | | | | | | |

Shadows:
- S1: `rgba(0, 0, 0, 0.4) 0px 1px 2px 0px, rgba(0, 0, 0, 0.25) 0px 4px 12px 0`


## The Attach picker (INBOX 467), before and after

Measured with `pickerinv.js` through the real `openNotePicker()` on the Chat tab (a sheet below 600), three notes seeded, one ticked. It is a panel (floating, with the dialog head), so its shell is the panel tier's; what changed is the rows (a second muted line, the category as a dot and quiet text instead of a filled chip) and the footer.

### 1440px, light

| property | before | after |
| --- | --- | --- |
| shell | note-picker-panel | note-picker-panel |
| radius | 8px | 8px |
| padding | 12.8px 12.8px 12.8px 12.8px | 12.8px 12.8px 12.8px 12.8px |
| box | 480 | 480 |
| head h | 32 | 32 |
| title | 16px/600 | 16px/600 |
| close | 32x32 r14 t14 | 32x32 r14 t14 |
| row height | 41 | 54 |
| row padding | 6.4px 6.4px 6.4px 6.4px | 8px 9.6px 8px 9.6px |
| row gap | 8px | 9.6px |
| checkbox | 28x28 x6 cy0 | 28x28 x10 cy0 |
| name | 13.6px/400 | 13.6px/400 |
| second line | none | 12px rgb(102, 100, 95) |
| filled chip | filled chip rgba(47, 91, 211, 0.1) | none |
| foot justify | space-between | flex-end |
| foot count font | 12.8px | 12px |
| foot buttons | clear ghost small 36px, done small 36px | clear ghost 36px, done accent 36px |

### 1440px, dark

| property | before | after |
| --- | --- | --- |
| shell | note-picker-panel | note-picker-panel |
| radius | 8px | 8px |
| padding | 12.8px 12.8px 12.8px 12.8px | 12.8px 12.8px 12.8px 12.8px |
| box | 480 | 480 |
| head h | 32 | 32 |
| title | 16px/600 | 16px/600 |
| close | 32x32 r14 t14 | 32x32 r14 t14 |
| row height | 41 | 54 |
| row padding | 6.4px 6.4px 6.4px 6.4px | 8px 9.6px 8px 9.6px |
| row gap | 8px | 9.6px |
| checkbox | 28x28 x6 cy0 | 28x28 x10 cy0 |
| name | 13.6px/400 | 13.6px/400 |
| second line | none | 12px rgb(181, 179, 173) |
| filled chip | filled chip rgba(120, 168, 255, 0.16) | none |
| foot justify | space-between | flex-end |
| foot count font | 12.8px | 12px |
| foot buttons | clear ghost small 36px, done small 36px | clear ghost 36px, done accent 36px |

### 390px, light

| property | before | after |
| --- | --- | --- |
| shell | card modal-card sheet-card attach-card | card modal-card sheet-card attach-card |
| radius | 8px | 8px |
| padding | 12.8px 16px 12.8px 16px | 12.8px 16px 12.8px 16px |
| box | 390 | 390 |
| head h | 44 | 44 |
| title | 16px/600 | 16px/600 |
| close | 44x44 r17 t14 | 44x44 r17 t14 |
| row height | 57 | 60 |
| row padding | 6.4px 6.4px 6.4px 6.4px | 8px 9.6px 8px 9.6px |
| row gap | 8px | 9.6px |
| checkbox | 44x44 x6 cy0 | 44x44 x10 cy0 |
| name | 13.6px/400 | 13.6px/400 |
| second line | none | 12px rgb(102, 100, 95) |
| filled chip | filled chip rgba(47, 91, 211, 0.1) | none |
| foot justify | space-between | flex-end |
| foot count font | 12.8px | 12px |
| foot buttons | clear ghost small 44px, done small 44px | clear ghost 44px, done accent 44px |

### 390px, dark

| property | before | after |
| --- | --- | --- |
| shell | card modal-card sheet-card attach-card | card modal-card sheet-card attach-card |
| radius | 8px | 8px |
| padding | 12.8px 16px 12.8px 16px | 12.8px 16px 12.8px 16px |
| box | 390 | 390 |
| head h | 44 | 44 |
| title | 16px/600 | 16px/600 |
| close | 44x44 r17 t14 | 44x44 r17 t14 |
| row height | 57 | 60 |
| row padding | 6.4px 6.4px 6.4px 6.4px | 8px 9.6px 8px 9.6px |
| row gap | 8px | 9.6px |
| checkbox | 44x44 x6 cy0 | 44x44 x10 cy0 |
| name | 13.6px/400 | 13.6px/400 |
| second line | none | 12px rgb(181, 179, 173) |
| filled chip | filled chip rgba(120, 168, 255, 0.16) | none |
| foot justify | space-between | flex-end |
| foot count font | 12.8px | 12px |
| foot buttons | clear ghost small 44px, done small 44px | clear ghost 44px, done accent 44px |

