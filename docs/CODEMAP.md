# Code map

Generated 2026-10-11 by `python scripts/codemap.py` from the repository. Every row is `name | file:line`: grep this file, then `sed -n 'A,Bp'` the lines you need. A stale map fails `tests/test_codemap_fresh.py`.

Counts: frontend functions 5262, frontend ids 2313, CSS sections 490, backend routes 534, backend modules 4372, test files 1022, tests 9403, plan headings 962.

## Frontend functions (5262)

Top-level `function name(`, `async function name(` and `const name = (` in `frontend/js/` and `frontend/sw.js`, in index.html's script order; lazily loaded files after, by name. Rows sorted by name within each file.

### frontend/js/app.js (47)

| Name | File:line |
|---|---|
| `$` | frontend/js/app.js:167 |
| `api` | frontend/js/app.js:397 |
| `apiJson` | frontend/js/app.js:636 |
| `apiPagedList` | frontend/js/app.js:571 |
| `askPasswordPrompt` | frontend/js/app.js:754 |
| `authToken` | frontend/js/app.js:173 |
| `chip` | frontend/js/app.js:1366 |
| `chipWords` | frontend/js/app.js:1361 |
| `clearApiCache` | frontend/js/app.js:632 |
| `confirmDialog` | frontend/js/app.js:1454 |
| `confirmVerb` | frontend/js/app.js:1447 |
| `ensureModule` | frontend/js/app.js:2024 |
| `enterWithoutPassword` | frontend/js/app.js:711 |
| `hide` | frontend/js/app.js:169 |
| `hideBootSplash` | frontend/js/app.js:914 |
| `initAuth` | frontend/js/app.js:927 |
| `kickBackgroundTaskPoll` | frontend/js/app.js:601 |
| `lazyAssetStamp` | frontend/js/app.js:1963 |
| `lazyScript` | frontend/js/app.js:2004 |
| `lockNow` | frontend/js/app.js:888 |
| `mediaSrc` | frontend/js/app.js:256 |
| `mountNoteSurfaceNow` | frontend/js/app.js:2059 |
| `onDomReady` | frontend/js/app.js:1995 |
| `promptDialog` | frontend/js/app.js:1564 |
| `purgeLockedContent` | frontend/js/app.js:874 |
| `recordBrowserLog` | frontend/js/app.js:23 |
| `refreshActiveTab` | frontend/js/app.js:1211 |
| `refuseStagedUrls` | frontend/js/app.js:233 |
| `replaceMissingMedia` | frontend/js/app.js:304 |
| `resumeWithoutPassword` | frontend/js/app.js:721 |
| `setBusy` | frontend/js/app.js:1406 |
| `setLabel` | frontend/js/app.js:1280 |
| `settingsModalOpen` | frontend/js/app.js:1354 |
| `settleLockPrompt` | frontend/js/app.js:732 |
| `sharedCaptureText` | frontend/js/app.js:988 |
| `show` | frontend/js/app.js:168 |
| `showLockScreen` | frontend/js/app.js:795 |
| `smallButton` | frontend/js/app.js:1752 |
| `spinnerEl` | frontend/js/app.js:1397 |
| `stagePrimary` | frontend/js/app.js:1390 |
| `stagedImageByUrl` | frontend/js/app.js:201 |
| `startApp` | frontend/js/app.js:1020 |
| `startWithoutPassword` | frontend/js/app.js:696 |
| `takeSharedIntake` | frontend/js/app.js:999 |
| `whenScriptsLoaded` | frontend/js/app.js:1944 |
| `wireBackdropClose` | frontend/js/app.js:1740 |
| `zoomWheelDelta` | frontend/js/app.js:250 |

### frontend/js/prefs.js (5)

| Name | File:line |
|---|---|
| `chordLabel` | frontend/js/prefs.js:174 |
| `prefsMigrate` | frontend/js/prefs.js:122 |
| `prefsStore` | frontend/js/prefs.js:32 |
| `shortcutHint` | frontend/js/prefs.js:185 |
| `shortcutTitle` | frontend/js/prefs.js:192 |

### frontend/js/store.js (2)

| Name | File:line |
|---|---|
| `appState` | frontend/js/store.js:18 |
| `publishNotes` | frontend/js/store.js:68 |

### frontend/js/note-cards.js (36)

| Name | File:line |
|---|---|
| `answerTags` | frontend/js/note-cards.js:140 |
| `askAtlasAboutNote` | frontend/js/note-cards.js:2359 |
| `askAtlasAboutThing` | frontend/js/note-cards.js:2366 |
| `binNoteWithUndo` | frontend/js/note-cards.js:1189 |
| `entryCardControls` | frontend/js/note-cards.js:2379 |
| `entryItem` | frontend/js/note-cards.js:1368 |
| `entryListFocusStop` | frontend/js/note-cards.js:2392 |
| `entryListSetStop` | frontend/js/note-cards.js:2397 |
| `favouriteButton` | frontend/js/note-cards.js:1149 |
| `fitNoteMetas` | frontend/js/note-cards.js:1259 |
| `formatFileSize` | frontend/js/note-cards.js:1103 |
| `libraryListsBoard` | frontend/js/note-cards.js:1027 |
| `loadMapBoardIndex` | frontend/js/note-cards.js:962 |
| `makeUnlinkAccessible` | frontend/js/note-cards.js:2410 |
| `mapBoardById` | frontend/js/note-cards.js:990 |
| `mapBoardRows` | frontend/js/note-cards.js:1016 |
| `mapBoardTitled` | frontend/js/note-cards.js:1002 |
| `mapChip` | frontend/js/note-cards.js:900 |
| `mapCountLabel` | frontend/js/note-cards.js:851 |
| `mapPreview` | frontend/js/note-cards.js:379 |
| `mapPreviewEdge` | frontend/js/note-cards.js:262 |
| `mapPreviewFitText` | frontend/js/note-cards.js:164 |
| `mapPreviewMeasurer` | frontend/js/note-cards.js:115 |
| `mapPreviewOnColour` | frontend/js/note-cards.js:207 |
| `mapPreviewOnPaper` | frontend/js/note-cards.js:182 |
| `mapPreviewOverlaps` | frontend/js/note-cards.js:189 |
| `mapPreviewSketch` | frontend/js/note-cards.js:301 |
| `mapPreviewTextWidth` | frontend/js/note-cards.js:144 |
| `noteIsMeeting` | frontend/js/note-cards.js:1145 |
| `noteMetaMore` | frontend/js/note-cards.js:1351 |
| `noteReviewActions` | frontend/js/note-cards.js:2310 |
| `notesSpanSpaces` | frontend/js/note-cards.js:1210 |
| `publishDraft` | frontend/js/note-cards.js:1338 |
| `renderAttachmentCards` | frontend/js/note-cards.js:1223 |
| `round2` | frontend/js/note-cards.js:242 |
| `showNoteInGraph` | frontend/js/note-cards.js:2351 |

### frontend/js/menus.js (33)

| Name | File:line |
|---|---|
| `afterMenuExit` | frontend/js/menus.js:673 |
| `buildMenuGroupButton` | frontend/js/menus.js:1335 |
| `buildMenuItemButton` | frontend/js/menus.js:1305 |
| `cardOpener` | frontend/js/menus.js:372 |
| `closeActionMenus` | frontend/js/menus.js:70 |
| `closeActionMenusOnScroll` | frontend/js/menus.js:25 |
| `closeHelpPopovers` | frontend/js/menus.js:237 |
| `docBacklinkContext` | frontend/js/menus.js:1088 |
| `entryOverflowMenu` | frontend/js/menus.js:1499 |
| `escapeAndCapMenu` | frontend/js/menus.js:722 |
| `escapeMenuIfClipped` | frontend/js/menus.js:628 |
| `explainNote` | frontend/js/menus.js:1920 |
| `fitActionMenuInWindow` | frontend/js/menus.js:419 |
| `focusMenuItem` | frontend/js/menus.js:541 |
| `generateEntryTitle` | frontend/js/menus.js:1192 |
| `historyActorLabel` | frontend/js/menus.js:1131 |
| `inlineActionIs` | frontend/js/menus.js:8 |
| `isEditConflict` | frontend/js/menus.js:1910 |
| `menuClippingAncestor` | frontend/js/menus.js:555 |
| `menuExitMs` | frontend/js/menus.js:680 |
| `menuSidePlan` | frontend/js/menus.js:397 |
| `nearestScrollParent` | frontend/js/menus.js:120 |
| `openActionMenu` | frontend/js/menus.js:439 |
| `placeEscapedMenu` | frontend/js/menus.js:595 |
| `placeHelpPopover` | frontend/js/menus.js:151 |
| `removeEntryTitle` | frontend/js/menus.js:1216 |
| `restoreEscapedMenu` | frontend/js/menus.js:687 |
| `restoreEscapedMenuAfterExit` | frontend/js/menus.js:668 |
| `toggleEntryPrivacy` | frontend/js/menus.js:1154 |
| `wireEscapedActionMenu` | frontend/js/menus.js:791 |
| `wireEscapedMenuResize` | frontend/js/menus.js:1071 |
| `wireHelpPopover` | frontend/js/menus.js:290 |
| `wireMenuKeyboard` | frontend/js/menus.js:1244 |

### frontend/js/lightbox.js (7)

| Name | File:line |
|---|---|
| `attachFileTo` | frontend/js/lightbox.js:246 |
| `attachFromLibrary` | frontend/js/lightbox.js:285 |
| `attachmentObjectUrl` | frontend/js/lightbox.js:394 |
| `captionCredit` | frontend/js/lightbox.js:411 |
| `reevaluateEntry` | frontend/js/lightbox.js:10 |
| `renderInlineAction` | frontend/js/lightbox.js:141 |
| `renderReevaluateResult` | frontend/js/lightbox.js:35 |

### frontend/js/selection.js (30)

| Name | File:line |
|---|---|
| `appendSelectionToNote` | frontend/js/selection.js:80 |
| `bookmarkKind` | frontend/js/selection.js:414 |
| `clampSelectionMenu` | frontend/js/selection.js:877 |
| `clippingMarkdown` | frontend/js/selection.js:20 |
| `dialogHead` | frontend/js/selection.js:105 |
| `fieldSelection` | frontend/js/selection.js:713 |
| `hideSelectionPopup` | frontend/js/selection.js:868 |
| `initSelectionPopup` | frontend/js/selection.js:1042 |
| `libraryPickAbout` | frontend/js/selection.js:436 |
| `libraryPickLabel` | frontend/js/selection.js:427 |
| `noteFieldPickButton` | frontend/js/selection.js:328 |
| `openSelectionMenuFromKeyboard` | frontend/js/selection.js:1090 |
| `pickEntryDialog` | frontend/js/selection.js:297 |
| `pickLibraryItemDialog` | frontend/js/selection.js:468 |
| `pickMediaDialog` | frontend/js/selection.js:612 |
| `pickerDialog` | frontend/js/selection.js:131 |
| `pickerEmpty` | frontend/js/selection.js:215 |
| `pickerListState` | frontend/js/selection.js:195 |
| `pickerListbox` | frontend/js/selection.js:226 |
| `pickerNoteAbout` | frontend/js/selection.js:290 |
| `pickerRememberedSource` | frontend/js/selection.js:455 |
| `remindFromSelection` | frontend/js/selection.js:687 |
| `saveSelectionAsNote` | frontend/js/selection.js:30 |
| `selectionIsActionable` | frontend/js/selection.js:989 |
| `selectionMenuItems` | frontend/js/selection.js:743 |
| `selectionPopup` | frontend/js/selection.js:859 |
| `selectionSource` | frontend/js/selection.js:10 |
| `showSelectionPopupAt` | frontend/js/selection.js:913 |
| `syncSelectionPopup` | frontend/js/selection.js:1003 |
| `wrapFieldSelection` | frontend/js/selection.js:735 |

### frontend/js/notes-list.js (110)

| Name | File:line |
|---|---|
| `_loadEntries` | frontend/js/notes-list.js:2848 |
| `appendInline` | frontend/js/notes-list.js:1175 |
| `appendInlineRun` | frontend/js/notes-list.js:947 |
| `applyEntryListTabOrder` | frontend/js/notes-list.js:2386 |
| `applyNotesViewMode` | frontend/js/notes-list.js:2034 |
| `attachmentCard` | frontend/js/notes-list.js:637 |
| `attachmentExt` | frontend/js/notes-list.js:589 |
| `attachmentFacts` | frontend/js/notes-list.js:606 |
| `attachmentIconClass` | frontend/js/notes-list.js:522 |
| `attachmentKind` | frontend/js/notes-list.js:597 |
| `boardEmbedRef` | frontend/js/notes-list.js:1286 |
| `boardEmbedTarget` | frontend/js/notes-list.js:1306 |
| `bodyWithoutTitleLine` | frontend/js/notes-list.js:1192 |
| `categoryAutoDot` | frontend/js/notes-list.js:2480 |
| `categoryColour` | frontend/js/notes-list.js:2475 |
| `categoryColoursChanged` | frontend/js/notes-list.js:2492 |
| `categoryDotColour` | frontend/js/notes-list.js:2485 |
| `categoryMenuItems` | frontend/js/notes-list.js:2730 |
| `clearSkeletons` | frontend/js/notes-list.js:2796 |
| `compareCategoryNames` | frontend/js/notes-list.js:2684 |
| `dockConnectionsInRail` | frontend/js/notes-list.js:3506 |
| `engineQueryIds` | frontend/js/notes-list.js:195 |
| `ensureCardCounts` | frontend/js/notes-list.js:3197 |
| `ensureMapChipsFor` | frontend/js/notes-list.js:3239 |
| `ensureOneCardCount` | frontend/js/notes-list.js:3201 |
| `entryListItems` | frontend/js/notes-list.js:2384 |
| `entryListOrder` | frontend/js/notes-list.js:2968 |
| `entryNeedsReview` | frontend/js/notes-list.js:226 |
| `expandAngleAutolinks` | frontend/js/notes-list.js:859 |
| `fileCard` | frontend/js/notes-list.js:710 |
| `fileChip` | frontend/js/notes-list.js:555 |
| `fileKindLabel` | frontend/js/notes-list.js:548 |
| `fillCategoryOptions` | frontend/js/notes-list.js:101 |
| `filterNotesBy` | frontend/js/notes-list.js:2195 |
| `filterNotesByTag` | frontend/js/notes-list.js:2182 |
| `focusNoteRow` | frontend/js/notes-list.js:62 |
| `foldNoteToolbarForFirstPaint` | frontend/js/notes-list.js:17 |
| `highlightIconsInto` | frontend/js/notes-list.js:1635 |
| `highlightInto` | frontend/js/notes-list.js:1662 |
| `initEntryListKeyboardNav` | frontend/js/notes-list.js:2396 |
| `isRenderableUrl` | frontend/js/notes-list.js:490 |
| `libraryVisibleRows` | frontend/js/notes-list.js:2209 |
| `linkAppAddresses` | frontend/js/notes-list.js:870 |
| `listedNoteIds` | frontend/js/notes-list.js:2053 |
| `liveQueryBar` | frontend/js/notes-list.js:315 |
| `liveQueryIds` | frontend/js/notes-list.js:164 |
| `loadCategories` | frontend/js/notes-list.js:2501 |
| `loadEntries` | frontend/js/notes-list.js:2840 |
| `markSidebarRowCurrent` | frontend/js/notes-list.js:2688 |
| `matchesSearch` | frontend/js/notes-list.js:382 |
| `matchesTagCount` | frontend/js/notes-list.js:361 |
| `noteCountExcludingDrafts` | frontend/js/notes-list.js:2172 |
| `noteEditedTime` | frontend/js/notes-list.js:1763 |
| `noteFormMayClose` | frontend/js/notes-list.js:56 |
| `noteListed` | frontend/js/notes-list.js:2168 |
| `noteQueryIsEmpty` | frontend/js/notes-list.js:344 |
| `noteSemanticLoaded` | frontend/js/notes-list.js:378 |
| `noteSortName` | frontend/js/notes-list.js:1767 |
| `noteTopicChip` | frontend/js/notes-list.js:3128 |
| `notesRailFocusSubject` | frontend/js/notes-list.js:3499 |
| `notesRailHiddenByChoice` | frontend/js/notes-list.js:3326 |
| `notesRailNearGroup` | frontend/js/notes-list.js:3470 |
| `notesRailSync` | frontend/js/notes-list.js:3337 |
| `notesRailWanted` | frontend/js/notes-list.js:3354 |
| `nudgeReviewQueue` | frontend/js/notes-list.js:3250 |
| `nudgeUntaggedNotes` | frontend/js/notes-list.js:3271 |
| `offerWikiRename` | frontend/js/notes-list.js:3590 |
| `openNoteEditor` | frontend/js/notes-list.js:76 |
| `orderedNotesForCurrentView` | frontend/js/notes-list.js:1967 |
| `paginateNotesForDisplay` | frontend/js/notes-list.js:1933 |
| `paintCategoryDot` | frontend/js/notes-list.js:2488 |
| `paintEntriesProgress` | frontend/js/notes-list.js:2828 |
| `parseNoteQuery` | frontend/js/notes-list.js:248 |
| `propQuery` | frontend/js/notes-list.js:2189 |
| `readableUrl` | frontend/js/notes-list.js:886 |
| `referenceCountChip` | frontend/js/notes-list.js:3065 |
| `referenceCountText` | frontend/js/notes-list.js:3053 |
| `refreshEntries` | frontend/js/notes-list.js:2976 |
| `refreshNoteSearchWhy` | frontend/js/notes-list.js:1725 |
| `reminderCountChip` | frontend/js/notes-list.js:3108 |
| `renderEntries` | frontend/js/notes-list.js:2230 |
| `renderIncrementally` | frontend/js/notes-list.js:1838 |
| `renderInlineMarkdown` | frontend/js/notes-list.js:903 |
| `renderNoteInline` | frontend/js/notes-list.js:1552 |
| `renderNoteText` | frontend/js/notes-list.js:1424 |
| `renderNotesRail` | frontend/js/notes-list.js:3373 |
| `renderSidebar` | frontend/js/notes-list.js:2516 |
| `resolveCategoryChoice` | frontend/js/notes-list.js:128 |
| `resolveNotePage` | frontend/js/notes-list.js:2007 |
| `resolveWikiTarget` | frontend/js/notes-list.js:1314 |
| `safeHref` | frontend/js/notes-list.js:836 |
| `scheduleEntriesProgress` | frontend/js/notes-list.js:2835 |
| `scheduleNotesRail` | frontend/js/notes-list.js:3349 |
| `searchHighlightTerms` | frontend/js/notes-list.js:1697 |
| `setNotesRailHidden` | frontend/js/notes-list.js:3512 |
| `setNotesViewMode` | frontend/js/notes-list.js:2090 |
| `showEntrySkeletons` | frontend/js/notes-list.js:2767 |
| `showNotesFilter` | frontend/js/notes-list.js:237 |
| `showSkeletons` | frontend/js/notes-list.js:2785 |
| `sortEntries` | frontend/js/notes-list.js:1771 |
| `syncNotesRailToggle` | frontend/js/notes-list.js:3362 |
| `toggleExpandAllRows` | frontend/js/notes-list.js:2079 |
| `toggleRowExpanded` | frontend/js/notes-list.js:2112 |
| `unlatex` | frontend/js/notes-list.js:754 |
| `updateExpandAllButton` | frontend/js/notes-list.js:2059 |
| `whyThisResultChip` | frontend/js/notes-list.js:1709 |
| `wikiForms` | frontend/js/notes-list.js:1234 |
| `wikiStem` | frontend/js/notes-list.js:1252 |
| `wireCategoryDropTarget` | frontend/js/notes-list.js:2749 |
| `wireSidebarRowKeys` | frontend/js/notes-list.js:2697 |

### frontend/js/capture-ask.js (91)

| Name | File:line |
|---|---|
| `addInlineCitations` | frontend/js/capture-ask.js:1126 |
| `announce` | frontend/js/capture-ask.js:794 |
| `answerFigure` | frontend/js/capture-ask.js:1964 |
| `answerObject` | frontend/js/capture-ask.js:2057 |
| `askAsOf` | frontend/js/capture-ask.js:3321 |
| `askNotesOnTheRight` | frontend/js/capture-ask.js:2179 |
| `askQuestion` | frontend/js/capture-ask.js:2921 |
| `askStatusBusy` | frontend/js/capture-ask.js:2891 |
| `askStatusText` | frontend/js/capture-ask.js:2876 |
| `citationInsertionPoint` | frontend/js/capture-ask.js:1098 |
| `citationKey` | frontend/js/capture-ask.js:1051 |
| `citationMarker` | frontend/js/capture-ask.js:1217 |
| `citationNumbers` | frontend/js/capture-ask.js:1018 |
| `citationPeekText` | frontend/js/capture-ask.js:1384 |
| `citationTextIndex` | frontend/js/capture-ask.js:1065 |
| `clearAskAnswerFoot` | frontend/js/capture-ask.js:2108 |
| `clearCaptureStatusOnInput` | frontend/js/capture-ask.js:543 |
| `clearCaptureTagSuggestions` | frontend/js/capture-ask.js:484 |
| `clearCitedPassage` | frontend/js/capture-ask.js:1590 |
| `clickableResult` | frontend/js/capture-ask.js:977 |
| `closeCitationPeek` | frontend/js/capture-ask.js:1491 |
| `collapseCitationRuns` | frontend/js/capture-ask.js:1192 |
| `copyAnswer` | frontend/js/capture-ask.js:3250 |
| `createDocumentNamed` | frontend/js/capture-ask.js:289 |
| `everyRowScored` | frontend/js/capture-ask.js:2411 |
| `evidenceBlock` | frontend/js/capture-ask.js:1352 |
| `evidenceRows` | frontend/js/capture-ask.js:1888 |
| `evidenceSignals` | frontend/js/capture-ask.js:1330 |
| `evidenceSpan` | frontend/js/capture-ask.js:1323 |
| `evidenceToggle` | frontend/js/capture-ask.js:1855 |
| `filedByText` | frontend/js/capture-ask.js:218 |
| `filingOutcomeText` | frontend/js/capture-ask.js:179 |
| `flashCategory` | frontend/js/capture-ask.js:947 |
| `flashEntry` | frontend/js/capture-ask.js:843 |
| `flashReminder` | frontend/js/capture-ask.js:921 |
| `focusCaptureBox` | frontend/js/capture-ask.js:447 |
| `groundingThumbs` | frontend/js/capture-ask.js:1741 |
| `heldOffline` | frontend/js/capture-ask.js:557 |
| `holdPictureTokens` | frontend/js/capture-ask.js:1958 |
| `liveMarkdownRenderer` | frontend/js/capture-ask.js:2753 |
| `loadAskHistoryBadge` | frontend/js/capture-ask.js:3285 |
| `loadCaptureDocuments` | frontend/js/capture-ask.js:274 |
| `loadSuggestions` | frontend/js/capture-ask.js:3256 |
| `loadTemplates` | frontend/js/capture-ask.js:3355 |
| `matchReasonBadge` | frontend/js/capture-ask.js:2415 |
| `newChat` | frontend/js/capture-ask.js:2834 |
| `notePictures` | frontend/js/capture-ask.js:1726 |
| `noteSurfaceIfAny` | frontend/js/capture-ask.js:412 |
| `noteTemplateForUse` | frontend/js/capture-ask.js:394 |
| `noteTemplateText` | frontend/js/capture-ask.js:383 |
| `numberMatchingRecords` | frontend/js/capture-ask.js:1645 |
| `offerJumpToNewNote` | frontend/js/capture-ask.js:12 |
| `openCitationPeek` | frontend/js/capture-ask.js:1407 |
| `openDocumentFromNote` | frontend/js/capture-ask.js:416 |
| `openNoteAtPassage` | frontend/js/capture-ask.js:916 |
| `pictureItems` | frontend/js/capture-ask.js:1738 |
| `placeAnswerFigures` | frontend/js/capture-ask.js:1999 |
| `placeResultBadge` | frontend/js/capture-ask.js:972 |
| `renderAnswerGrounding` | frontend/js/capture-ask.js:1776 |
| `renderAnswerSupport` | frontend/js/capture-ask.js:1674 |
| `renderAskAnswerFoot` | frontend/js/capture-ask.js:2125 |
| `renderAskFollowups` | frontend/js/capture-ask.js:2196 |
| `renderAskHint` | frontend/js/capture-ask.js:2240 |
| `renderAskTrail` | frontend/js/capture-ask.js:2808 |
| `renderAskedQuestion` | frontend/js/capture-ask.js:2852 |
| `renderCaptureDocumentAdder` | frontend/js/capture-ask.js:347 |
| `renderCaptureDocuments` | frontend/js/capture-ask.js:309 |
| `renderCaptureTagSuggestions` | frontend/js/capture-ask.js:492 |
| `renderChatMeta` | frontend/js/capture-ask.js:2279 |
| `renderEvidenceView` | frontend/js/capture-ask.js:1910 |
| `renderRelatedElsewhere` | frontend/js/capture-ask.js:1602 |
| `renderToolsUnsupportedNotice` | frontend/js/capture-ask.js:1706 |
| `resetCaptureForm` | frontend/js/capture-ask.js:454 |
| `retryAnswer` | frontend/js/capture-ask.js:3246 |
| `saveEntry` | frontend/js/capture-ask.js:571 |
| `saveEntryAsDraft` | frontend/js/capture-ask.js:696 |
| `scheduleCaptureTagSuggestions` | frontend/js/capture-ask.js:518 |
| `scheduleCitationPeek` | frontend/js/capture-ask.js:1365 |
| `scheduleCitationPeekClose` | frontend/js/capture-ask.js:1376 |
| `scrollEditingEntryIntoView` | frontend/js/capture-ask.js:818 |
| `setAnsweredBy` | frontend/js/capture-ask.js:2270 |
| `setAskScope` | frontend/js/capture-ask.js:3313 |
| `setAsking` | frontend/js/capture-ask.js:2794 |
| `settleCaptureStatus` | frontend/js/capture-ask.js:123 |
| `showAskAsOf` | frontend/js/capture-ask.js:3327 |
| `showCitedPassage` | frontend/js/capture-ask.js:1559 |
| `stopAnswer` | frontend/js/capture-ask.js:2800 |
| `streamChat` | frontend/js/capture-ask.js:2446 |
| `streamChatEvents` | frontend/js/capture-ask.js:2483 |
| `watchFiling` | frontend/js/capture-ask.js:46 |
| `withTitle` | frontend/js/capture-ask.js:432 |

### frontend/js/chat.js (81)

| Name | File:line |
|---|---|
| `aiWritingTrace` | frontend/js/chat.js:2184 |
| `applyCompression` | frontend/js/chat.js:2044 |
| `askAboutPage` | frontend/js/chat.js:1433 |
| `assistantLabel` | frontend/js/chat.js:52 |
| `assistantMessageActions` | frontend/js/chat.js:162 |
| `atlasSuggestion` | frontend/js/chat.js:674 |
| `batteryModeOn` | frontend/js/chat.js:2086 |
| `bookmarkWebResult` | frontend/js/chat.js:1259 |
| `buildWebResultRow` | frontend/js/chat.js:1136 |
| `chatHistoryToSend` | frontend/js/chat.js:36 |
| `chatMessageActions` | frontend/js/chat.js:65 |
| `chatTranscriptText` | frontend/js/chat.js:1982 |
| `chatTurnTranscript` | frontend/js/chat.js:125 |
| `citeWebPage` | frontend/js/chat.js:1490 |
| `clearChatEmptyState` | frontend/js/chat.js:803 |
| `closeWebReader` | frontend/js/chat.js:872 |
| `compactTokens` | frontend/js/chat.js:490 |
| `compressChatContext` | frontend/js/chat.js:2010 |
| `continueRunControls` | frontend/js/chat.js:226 |
| `copyToClipboard` | frontend/js/chat.js:547 |
| `copyViaTextarea` | frontend/js/chat.js:514 |
| `copyWebLink` | frontend/js/chat.js:1251 |
| `fillPersonaMark` | frontend/js/chat.js:1765 |
| `flashCopied` | frontend/js/chat.js:536 |
| `forkFromBubble` | frontend/js/chat.js:626 |
| `livingInterval` | frontend/js/chat.js:2170 |
| `loadResponseModes` | frontend/js/chat.js:1720 |
| `loadWebSearchHistory` | frontend/js/chat.js:1291 |
| `manualPauseControls` | frontend/js/chat.js:272 |
| `messageMetaLine` | frontend/js/chat.js:340 |
| `metaItem` | frontend/js/chat.js:306 |
| `mountChatActionsMenu` | frontend/js/chat.js:1906 |
| `openWebPageExternally` | frontend/js/chat.js:1247 |
| `openWebReader` | frontend/js/chat.js:1450 |
| `personaOptions` | frontend/js/chat.js:1782 |
| `progressLine` | frontend/js/chat.js:2508 |
| `progressMotionWanted` | frontend/js/chat.js:2122 |
| `progressPhaseText` | frontend/js/chat.js:2376 |
| `pushWebSearchHistory` | frontend/js/chat.js:1300 |
| `questionForBubble` | frontend/js/chat.js:580 |
| `reducedMotionWanted` | frontend/js/chat.js:2092 |
| `refreshWebSearxngStrip` | frontend/js/chat.js:1052 |
| `regenerateFromBubble` | frontend/js/chat.js:598 |
| `regenerateLastAnswer` | frontend/js/chat.js:653 |
| `removeChatBubble` | frontend/js/chat.js:500 |
| `renderChatContextMeter` | frontend/js/chat.js:1856 |
| `renderChatEmptyState` | frontend/js/chat.js:694 |
| `renderChatTurnCount` | frontend/js/chat.js:1886 |
| `renderChatUsage` | frontend/js/chat.js:1839 |
| `renderCompressionState` | frontend/js/chat.js:2057 |
| `renderModelContextBox` | frontend/js/chat.js:1583 |
| `renderModelHealthNote` | frontend/js/chat.js:1683 |
| `renderModelSpec` | frontend/js/chat.js:1611 |
| `renderWebPageAttachment` | frontend/js/chat.js:1517 |
| `renderWebPanelMenu` | frontend/js/chat.js:977 |
| `renderWebSearchHistory` | frontend/js/chat.js:1319 |
| `rewriteAnswerWith` | frontend/js/chat.js:617 |
| `runWebSearch` | frontend/js/chat.js:1348 |
| `saveChatAsDocument` | frontend/js/chat.js:1958 |
| `scheduleThinkingWordTick` | frontend/js/chat.js:2298 |
| `setResponseMode` | frontend/js/chat.js:1743 |
| `setWebEngineDot` | frontend/js/chat.js:963 |
| `setWebSearxngRunning` | frontend/js/chat.js:1037 |
| `showCompressReview` | frontend/js/chat.js:2032 |
| `startThinkingWordRotation` | frontend/js/chat.js:2326 |
| `stopThinkingWordRotation` | frontend/js/chat.js:2348 |
| `stopWebRequest` | frontend/js/chat.js:857 |
| `togglePersonaPrompt` | frontend/js/chat.js:1831 |
| `toggleWebPanel` | frontend/js/chat.js:885 |
| `toolPhaseVerb` | frontend/js/chat.js:2391 |
| `typingDots` | frontend/js/chat.js:2405 |
| `webEngineWords` | frontend/js/chat.js:946 |
| `webPageContextBlock` | frontend/js/chat.js:1548 |
| `webPageMarkdown` | frontend/js/chat.js:1457 |
| `webQueryTerms` | frontend/js/chat.js:1123 |
| `webReaderIsOpen` | frontend/js/chat.js:868 |
| `webRequestEnd` | frontend/js/chat.js:847 |
| `webRequestStart` | frontend/js/chat.js:838 |
| `webResultMark` | frontend/js/chat.js:1102 |
| `wheelScrollsHorizontally` | frontend/js/chat.js:2233 |
| `wireHorizontalWheelScrolling` | frontend/js/chat.js:2266 |

### frontend/js/chat-agent.js (73)

| Name | File:line |
|---|---|
| `actNavigate` | frontend/js/chat-agent.js:1840 |
| `addAssistantBubble` | frontend/js/chat-agent.js:1147 |
| `addBubble` | frontend/js/chat-agent.js:414 |
| `agentTimeline` | frontend/js/chat-agent.js:504 |
| `assistantAvatar` | frontend/js/chat-agent.js:1082 |
| `assistantHeadRow` | frontend/js/chat-agent.js:1120 |
| `cancelDraft` | frontend/js/chat-agent.js:2796 |
| `cardTextPreview` | frontend/js/chat-agent.js:1536 |
| `changeDiff` | frontend/js/chat-agent.js:1284 |
| `changeRow` | frontend/js/chat-agent.js:1197 |
| `chatAttachmentStrip` | frontend/js/chat-agent.js:212 |
| `chatHeadIsAtlas` | frontend/js/chat-agent.js:1030 |
| `chatHeadKey` | frontend/js/chat-agent.js:1035 |
| `chatPositions` | frontend/js/chat-agent.js:99 |
| `chatScrollToEnd` | frontend/js/chat-agent.js:188 |
| `chatSourcesFrom` | frontend/js/chat-agent.js:2074 |
| `chatSourcesPanel` | frontend/js/chat-agent.js:2206 |
| `clearDraftTarget` | frontend/js/chat-agent.js:2676 |
| `deactivateControls` | frontend/js/chat-agent.js:2060 |
| `draftTranslateKind` | frontend/js/chat-agent.js:2536 |
| `followBottom` | frontend/js/chat-agent.js:39 |
| `followReleased` | frontend/js/chat-agent.js:28 |
| `isImageCardUrl` | frontend/js/chat-agent.js:1528 |
| `keepAtBottom` | frontend/js/chat-agent.js:136 |
| `markDraftQuickstart` | frontend/js/chat-agent.js:2571 |
| `markToolStep` | frontend/js/chat-agent.js:1701 |
| `nestedTakesWheelUp` | frontend/js/chat-agent.js:33 |
| `noteChatPosition` | frontend/js/chat-agent.js:104 |
| `paintAssistantAvatar` | frontend/js/chat-agent.js:1103 |
| `paintAssistantHeads` | frontend/js/chat-agent.js:1133 |
| `paintPersonaAvatar` | frontend/js/chat-agent.js:1042 |
| `paintUserMarks` | frontend/js/chat-agent.js:392 |
| `paneWordCount` | frontend/js/chat-agent.js:2692 |
| `planProposalCard` | frontend/js/chat-agent.js:1336 |
| `planStepWrites` | frontend/js/chat-agent.js:1301 |
| `pushAgentChangeUndo` | frontend/js/chat-agent.js:1317 |
| `pushDraftUndo` | frontend/js/chat-agent.js:2716 |
| `putDraftBack` | frontend/js/chat-agent.js:2741 |
| `refreshAfterToolChanges` | frontend/js/chat-agent.js:2004 |
| `rememberDraftVersion` | frontend/js/chat-agent.js:2644 |
| `renderAgentQuestion` | frontend/js/chat-agent.js:1934 |
| `renderDraftQuickstarts` | frontend/js/chat-agent.js:2546 |
| `renderDraftSources` | frontend/js/chat-agent.js:2583 |
| `renderDraftTarget` | frontend/js/chat-agent.js:2664 |
| `renderDraftVersions` | frontend/js/chat-agent.js:2615 |
| `renderMemoryProposal` | frontend/js/chat-agent.js:1859 |
| `renderRecordsDetails` | frontend/js/chat-agent.js:2385 |
| `renderToolConfirm` | frontend/js/chat-agent.js:1775 |
| `repaintAssistantAvatars` | frontend/js/chat-agent.js:1108 |
| `restoreChatPosition` | frontend/js/chat-agent.js:124 |
| `restoreDraftLocally` | frontend/js/chat-agent.js:2468 |
| `saveDraftLocally` | frontend/js/chat-agent.js:2446 |
| `savedPersona` | frontend/js/chat-agent.js:1005 |
| `setDraftBusy` | frontend/js/chat-agent.js:2785 |
| `setDraftStatus` | frontend/js/chat-agent.js:2684 |
| `settlePendingAgentQuestion` | frontend/js/chat-agent.js:1930 |
| `sourceHost` | frontend/js/chat-agent.js:2181 |
| `syncChatJumpLatest` | frontend/js/chat-agent.js:158 |
| `thinkingFold` | frontend/js/chat-agent.js:466 |
| `thinkingFoldIn` | frontend/js/chat-agent.js:486 |
| `thinkingPaint` | frontend/js/chat-agent.js:480 |
| `toolCardChips` | frontend/js/chat-agent.js:1616 |
| `toolCardsRow` | frontend/js/chat-agent.js:1675 |
| `toolChip` | frontend/js/chat-agent.js:1706 |
| `toolPreviewBody` | frontend/js/chat-agent.js:1559 |
| `toolPreviewPanel` | frontend/js/chat-agent.js:1594 |
| `toolTouchedRow` | frontend/js/chat-agent.js:1689 |
| `translateNoteInDesk` | frontend/js/chat-agent.js:2522 |
| `undoDraft` | frontend/js/chat-agent.js:2765 |
| `updateDraftCount` | frontend/js/chat-agent.js:2698 |
| `updateDraftUndoButton` | frontend/js/chat-agent.js:2752 |
| `userMarkEl` | frontend/js/chat-agent.js:405 |
| `userMarkSeed` | frontend/js/chat-agent.js:381 |

### frontend/js/chat-attach.js (69)

| Name | File:line |
|---|---|
| `appendRunResumeControls` | frontend/js/chat-attach.js:1383 |
| `attachBoardToChat` | frontend/js/chat-attach.js:577 |
| `attachChatFiles` | frontend/js/chat-attach.js:385 |
| `attachDocumentToChat` | frontend/js/chat-attach.js:630 |
| `attachImageFiles` | frontend/js/chat-attach.js:297 |
| `attachLibraryFile` | frontend/js/chat-attach.js:522 |
| `attachSelectionContext` | frontend/js/chat-attach.js:685 |
| `attachedNotes` | frontend/js/chat-attach.js:832 |
| `buildFollowupStrip` | frontend/js/chat-attach.js:2704 |
| `chatDeleteUndo` | frontend/js/chat-attach.js:3035 |
| `chatDockMoreOpen` | frontend/js/chat-attach.js:1322 |
| `chatWriteRecord` | frontend/js/chat-attach.js:3053 |
| `clearSelectionAttachment` | frontend/js/chat-attach.js:709 |
| `closeChatDockMore` | frontend/js/chat-attach.js:1359 |
| `closeExtractPreview` | frontend/js/chat-attach.js:164 |
| `closeNotePicker` | frontend/js/chat-attach.js:1307 |
| `commitExtractPreview` | frontend/js/chat-attach.js:169 |
| `commitStagedImages` | frontend/js/chat-attach.js:337 |
| `deleteChatTurn` | frontend/js/chat-attach.js:2810 |
| `deleteCurrentChat` | frontend/js/chat-attach.js:3009 |
| `exportChatMarkdown` | frontend/js/chat-attach.js:3058 |
| `extractRefLabel` | frontend/js/chat-attach.js:53 |
| `flattenNoteMarkdown` | frontend/js/chat-attach.js:861 |
| `followupChain` | frontend/js/chat-attach.js:2733 |
| `followupMatches` | frontend/js/chat-attach.js:2731 |
| `followupParent` | frontend/js/chat-attach.js:2724 |
| `followupTrail` | frontend/js/chat-attach.js:2750 |
| `importChatDocuments` | frontend/js/chat-attach.js:427 |
| `isImageFile` | frontend/js/chat-attach.js:378 |
| `isStreamingConversation` | frontend/js/chat-attach.js:2937 |
| `keepUnreadableChatFile` | frontend/js/chat-attach.js:398 |
| `markFollowup` | frontend/js/chat-attach.js:2774 |
| `mountChatTimer` | frontend/js/chat-attach.js:2863 |
| `newChatConversation` | frontend/js/chat-attach.js:2957 |
| `noteLabel` | frontend/js/chat-attach.js:838 |
| `notePickerColumns` | frontend/js/chat-attach.js:1171 |
| `notePickerEmpty` | frontend/js/chat-attach.js:1135 |
| `notePickerFacts` | frontend/js/chat-attach.js:981 |
| `notePickerKeydown` | frontend/js/chat-attach.js:1185 |
| `notePickerOpen` | frontend/js/chat-attach.js:1316 |
| `notePickerPage` | frontend/js/chat-attach.js:1152 |
| `notePickerRoving` | frontend/js/chat-attach.js:1161 |
| `notePickerShape` | frontend/js/chat-attach.js:991 |
| `notePickerUsedIn` | frontend/js/chat-attach.js:973 |
| `offerFollowups` | frontend/js/chat-attach.js:2635 |
| `openChatDockMore` | frontend/js/chat-attach.js:1335 |
| `openExtractPreview` | frontend/js/chat-attach.js:22 |
| `openNotePicker` | frontend/js/chat-attach.js:1272 |
| `paintChatTimer` | frontend/js/chat-attach.js:2876 |
| `plainText` | frontend/js/chat-attach.js:875 |
| `reattachStreamingTurn` | frontend/js/chat-attach.js:2948 |
| `refreshFollowupVisibility` | frontend/js/chat-attach.js:2684 |
| `releaseChatComposer` | frontend/js/chat-attach.js:2907 |
| `renderAttachments` | frontend/js/chat-attach.js:926 |
| `renderBoardAttachments` | frontend/js/chat-attach.js:590 |
| `renderDocumentAttachments` | frontend/js/chat-attach.js:643 |
| `renderExtractPreview` | frontend/js/chat-attach.js:59 |
| `renderFileAttachments` | frontend/js/chat-attach.js:531 |
| `renderFollowups` | frontend/js/chat-attach.js:2670 |
| `renderImageAttachments` | frontend/js/chat-attach.js:253 |
| `renderSelectionAttachment` | frontend/js/chat-attach.js:714 |
| `revalidateSelection` | frontend/js/chat-attach.js:761 |
| `saveFollowups` | frontend/js/chat-attach.js:2793 |
| `selectionContextBlock` | frontend/js/chat-attach.js:812 |
| `sendChatMessage` | frontend/js/chat-attach.js:1490 |
| `setNoteLabel` | frontend/js/chat-attach.js:883 |
| `setNotePickerSource` | frontend/js/chat-attach.js:1245 |
| `startChatTimer` | frontend/js/chat-attach.js:2888 |
| `stopChatTimer` | frontend/js/chat-attach.js:2897 |

### frontend/js/sheets-selects.js (52)

| Name | File:line |
|---|---|
| `aiNameNow` | frontend/js/sheets-selects.js:2148 |
| `annotateSliders` | frontend/js/sheets-selects.js:979 |
| `applySidebarSheetMode` | frontend/js/sheets-selects.js:199 |
| `applySidebarWidth` | frontend/js/sheets-selects.js:100 |
| `applyWebPanelWidth` | frontend/js/sheets-selects.js:506 |
| `builtinPersonas` | frontend/js/sheets-selects.js:2247 |
| `builtinThinkingWords` | frontend/js/sheets-selects.js:2197 |
| `clampToolbarMenu` | frontend/js/sheets-selects.js:1325 |
| `dateFieldFace` | frontend/js/sheets-selects.js:1008 |
| `eachSidebar` | frontend/js/sheets-selects.js:192 |
| `editChatAnswer` | frontend/js/sheets-selects.js:1790 |
| `editedMarker` | frontend/js/sheets-selects.js:1779 |
| `enhanceAllSelects` | frontend/js/sheets-selects.js:990 |
| `enhanceDateField` | frontend/js/sheets-selects.js:1018 |
| `enhanceSelect` | frontend/js/sheets-selects.js:686 |
| `focusSelect` | frontend/js/sheets-selects.js:1081 |
| `formatTokens` | frontend/js/sheets-selects.js:1544 |
| `initResizableSidebars` | frontend/js/sheets-selects.js:455 |
| `initSidebarSheetDismissal` | frontend/js/sheets-selects.js:262 |
| `kebabMenu` | frontend/js/sheets-selects.js:1178 |
| `labelledMenu` | frontend/js/sheets-selects.js:620 |
| `layoutIsStacked` | frontend/js/sheets-selects.js:42 |
| `layoutIsTablet` | frontend/js/sheets-selects.js:79 |
| `lightboxReadingsFor` | frontend/js/sheets-selects.js:1515 |
| `loadChatSuggestions` | frontend/js/sheets-selects.js:2078 |
| `loadConversationList` | frontend/js/sheets-selects.js:1613 |
| `makeMenuItem` | frontend/js/sheets-selects.js:600 |
| `makeSidebarResizable` | frontend/js/sheets-selects.js:318 |
| `makeWebPanelResizable` | frontend/js/sheets-selects.js:543 |
| `openConversation` | frontend/js/sheets-selects.js:1853 |
| `openKebabSheet` | frontend/js/sheets-selects.js:1124 |
| `parseServerTime` | frontend/js/sheets-selects.js:1553 |
| `personaDisplayName` | frontend/js/sheets-selects.js:2154 |
| `personaNamesNow` | frontend/js/sheets-selects.js:2272 |
| `relativeTime` | frontend/js/sheets-selects.js:1563 |
| `renderDashboardPersonaSelect` | frontend/js/sheets-selects.js:2488 |
| `renderPersonas` | frontend/js/sheets-selects.js:2277 |
| `replaceOpenToolbarMenus` | frontend/js/sheets-selects.js:1431 |
| `resetWebPanelWidth` | frontend/js/sheets-selects.js:524 |
| `savePersonaList` | frontend/js/sheets-selects.js:2262 |
| `shortModelName` | frontend/js/sheets-selects.js:1470 |
| `sidebarDefault` | frontend/js/sheets-selects.js:23 |
| `sidebarFittedWidth` | frontend/js/sheets-selects.js:86 |
| `sidebarWidth` | frontend/js/sheets-selects.js:25 |
| `sortConversations` | frontend/js/sheets-selects.js:1600 |
| `thinkingWordsFor` | frontend/js/sheets-selects.js:2213 |
| `trackSeparatorValue` | frontend/js/sheets-selects.js:297 |
| `wantsThinkingWords` | frontend/js/sheets-selects.js:2234 |
| `watchForSelects` | frontend/js/sheets-selects.js:1093 |
| `webPanelIsNarrow` | frontend/js/sheets-selects.js:490 |
| `webPanelMaxWidth` | frontend/js/sheets-selects.js:500 |
| `wireInPlaceSheetDismissal` | frontend/js/sheets-selects.js:244 |

### frontend/js/skills.js (60)

| Name | File:line |
|---|---|
| `allSkills` | frontend/js/skills.js:28 |
| `appendToolRow` | frontend/js/skills.js:954 |
| `applyToolFilter` | frontend/js/skills.js:1018 |
| `askSkillInputs` | frontend/js/skills.js:240 |
| `batchArchive` | frontend/js/skills.js:1348 |
| `batchDelete` | frontend/js/skills.js:1391 |
| `batchEach` | frontend/js/skills.js:1315 |
| `batchExport` | frontend/js/skills.js:1385 |
| `batchFavourite` | frontend/js/skills.js:1342 |
| `batchMove` | frontend/js/skills.js:1293 |
| `batchNoun` | frontend/js/skills.js:1338 |
| `batchPublish` | frontend/js/skills.js:1359 |
| `batchPut` | frontend/js/skills.js:1334 |
| `batchSelection` | frontend/js/skills.js:1287 |
| `batchTag` | frontend/js/skills.js:1307 |
| `blobToBase64` | frontend/js/skills.js:1084 |
| `buildSkillsPanel` | frontend/js/skills.js:438 |
| `customSkills` | frontend/js/skills.js:35 |
| `desktopShell` | frontend/js/skills.js:1076 |
| `downloadBlob` | frontend/js/skills.js:1116 |
| `downloadFromApi` | frontend/js/skills.js:1100 |
| `downloadJson` | frontend/js/skills.js:1054 |
| `enterSelectMode` | frontend/js/skills.js:1259 |
| `exitSelectMode` | frontend/js/skills.js:1277 |
| `fillBatchCategories` | frontend/js/skills.js:1232 |
| `fillBatchMore` | frontend/js/skills.js:1365 |
| `fillSkillSelect` | frontend/js/skills.js:393 |
| `inputsToText` | frontend/js/skills.js:56 |
| `loadChatSkills` | frontend/js/skills.js:322 |
| `loadSkills` | frontend/js/skills.js:19 |
| `looksLikeAnAgentRequest` | frontend/js/skills.js:617 |
| `pickJsonFile` | frontend/js/skills.js:1188 |
| `renderChatNudge` | frontend/js/skills.js:660 |
| `renderRunBudget` | frontend/js/skills.js:882 |
| `renderSkillFolderLine` | frontend/js/skills.js:824 |
| `renderSkillSettings` | frontend/js/skills.js:807 |
| `renderSkillToolPicker` | frontend/js/skills.js:102 |
| `renderSkillVerifyPicker` | frontend/js/skills.js:130 |
| `renderSmallModelMode` | frontend/js/skills.js:871 |
| `renderToolFocus` | frontend/js/skills.js:845 |
| `renderToolSettings` | frontend/js/skills.js:911 |
| `resetChatNudge` | frontend/js/skills.js:728 |
| `runSkill` | frontend/js/skills.js:173 |
| `saveFile` | frontend/js/skills.js:1132 |
| `saveSkillList` | frontend/js/skills.js:746 |
| `saveToolSwitch` | frontend/js/skills.js:893 |
| `setSkillVerify` | frontend/js/skills.js:150 |
| `skillMatchingDraft` | frontend/js/skills.js:627 |
| `skillPacePill` | frontend/js/skills.js:515 |
| `skillRow` | frontend/js/skills.js:756 |
| `skillSummary` | frontend/js/skills.js:733 |
| `startEditingSkill` | frontend/js/skills.js:69 |
| `startPlannedRun` | frontend/js/skills.js:185 |
| `startSkill` | frontend/js/skills.js:190 |
| `stepsToText` | frontend/js/skills.js:45 |
| `stopEditingSkill` | frontend/js/skills.js:87 |
| `syncSkillVerifyRow` | frontend/js/skills.js:165 |
| `textToInputs` | frontend/js/skills.js:62 |
| `textToSteps` | frontend/js/skills.js:49 |
| `updateBatchCount` | frontend/js/skills.js:1208 |

### frontend/js/shell-reminders.js (52)

| Name | File:line |
|---|---|
| `addReminder` | frontend/js/shell-reminders.js:1650 |
| `buildSelect` | frontend/js/shell-reminders.js:1806 |
| `clearDoneReminders` | frontend/js/shell-reminders.js:1125 |
| `clipText` | frontend/js/shell-reminders.js:777 |
| `curtainShell` | frontend/js/shell-reminders.js:1768 |
| `defaultDueValue` | frontend/js/shell-reminders.js:1711 |
| `glideStrip` | frontend/js/shell-reminders.js:296 |
| `liftLockScreen` | frontend/js/shell-reminders.js:1789 |
| `loadReminders` | frontend/js/shell-reminders.js:861 |
| `markScrollEdge` | frontend/js/shell-reminders.js:430 |
| `markTabBarRecede` | frontend/js/shell-reminders.js:501 |
| `noteAnyImage` | frontend/js/shell-reminders.js:707 |
| `noteFirstImage` | frontend/js/shell-reminders.js:714 |
| `notePreviewText` | frontend/js/shell-reminders.js:799 |
| `nudgeDue` | frontend/js/shell-reminders.js:1498 |
| `onScrollEdge` | frontend/js/shell-reminders.js:533 |
| `paginateDoneReminders` | frontend/js/shell-reminders.js:961 |
| `presetDate` | frontend/js/shell-reminders.js:1387 |
| `refreshMediaSession` | frontend/js/shell-reminders.js:1732 |
| `refreshReminderDefaults` | frontend/js/shell-reminders.js:1519 |
| `relativeWhen` | frontend/js/shell-reminders.js:1354 |
| `reminderComposeIsPristine` | frontend/js/shell-reminders.js:1507 |
| `reminderEditForm` | frontend/js/shell-reminders.js:1551 |
| `reminderItem` | frontend/js/shell-reminders.js:1164 |
| `reminderMadeUndo` | frontend/js/shell-reminders.js:1641 |
| `reminderPutUndoably` | frontend/js/shell-reminders.js:1629 |
| `reminderTarget` | frontend/js/shell-reminders.js:1335 |
| `renderReminderCalendar` | frontend/js/shell-reminders.js:984 |
| `revealActiveTab` | frontend/js/shell-reminders.js:256 |
| `safeMdSlice` | frontend/js/shell-reminders.js:659 |
| `setDue` | frontend/js/shell-reminders.js:1436 |
| `snoozeReminderTo` | frontend/js/shell-reminders.js:1528 |
| `startClockTicker` | frontend/js/shell-reminders.js:59 |
| `startMinuteTicker` | frontend/js/shell-reminders.js:34 |
| `stopClockTicker` | frontend/js/shell-reminders.js:63 |
| `stripFrontmatter` | frontend/js/shell-reminders.js:787 |
| `syncDueFromParts` | frontend/js/shell-reminders.js:1450 |
| `syncEdgeFade` | frontend/js/shell-reminders.js:369 |
| `syncPartsFromDue` | frontend/js/shell-reminders.js:1442 |
| `syncScrollEdges` | frontend/js/shell-reminders.js:584 |
| `syncTabOverflowFade` | frontend/js/shell-reminders.js:214 |
| `tabBarMode` | frontend/js/shell-reminders.js:208 |
| `tabCentreSpace` | frontend/js/shell-reminders.js:145 |
| `tabContentWidth` | frontend/js/shell-reminders.js:185 |
| `tabRowSpace` | frontend/js/shell-reminders.js:120 |
| `tickClocks` | frontend/js/shell-reminders.js:12 |
| `toLocalInputValue` | frontend/js/shell-reminders.js:1380 |
| `updateDueReadout` | frontend/js/shell-reminders.js:1462 |
| `updateReminderBadge` | frontend/js/shell-reminders.js:1094 |
| `wikiLinkLabel` | frontend/js/shell-reminders.js:738 |
| `wikiLinkShown` | frontend/js/shell-reminders.js:764 |
| `wikiLinkTarget` | frontend/js/shell-reminders.js:755 |

### frontend/js/markdown.js (33)

| Name | File:line |
|---|---|
| `boardEmbedElement` | frontend/js/markdown.js:694 |
| `boardEmbedFill` | frontend/js/markdown.js:752 |
| `boardEmbedMarkdown` | frontend/js/markdown.js:830 |
| `buildTableBlock` | frontend/js/markdown.js:858 |
| `columnAlign` | frontend/js/markdown.js:48 |
| `isTableSeparator` | frontend/js/markdown.js:15 |
| `linkAtEvent` | frontend/js/markdown.js:1387 |
| `linkCard` | frontend/js/markdown.js:1258 |
| `linkCardPath` | frontend/js/markdown.js:1226 |
| `linkMenuItems` | frontend/js/markdown.js:1344 |
| `mdCalloutElement` | frontend/js/markdown.js:212 |
| `mdCalloutHead` | frontend/js/markdown.js:193 |
| `mdColumnsElement` | frontend/js/markdown.js:286 |
| `mdColumnsFrom` | frontend/js/markdown.js:117 |
| `mdDividerKind` | frontend/js/markdown.js:140 |
| `mdDocumentCard` | frontend/js/markdown.js:566 |
| `mdEmbedElement` | frontend/js/markdown.js:610 |
| `mdFillTocs` | frontend/js/markdown.js:407 |
| `mdFootnotePrepare` | frontend/js/markdown.js:452 |
| `mdFootnotesFinish` | frontend/js/markdown.js:491 |
| `mdHeadingId` | frontend/js/markdown.js:64 |
| `mdInlineMathElement` | frontend/js/markdown.js:382 |
| `mdMathBlockFrom` | frontend/js/markdown.js:175 |
| `mdMathBox` | frontend/js/markdown.js:340 |
| `mdMathElement` | frontend/js/markdown.js:375 |
| `mdPageBreakElement` | frontend/js/markdown.js:304 |
| `mdQuoteAttribution` | frontend/js/markdown.js:148 |
| `mdQuoteElement` | frontend/js/markdown.js:323 |
| `mdRuleElement` | frontend/js/markdown.js:316 |
| `mdTocElement` | frontend/js/markdown.js:387 |
| `mdTocEntries` | frontend/js/markdown.js:157 |
| `openMenuAtPoint` | frontend/js/markdown.js:1295 |
| `splitTableRow` | frontend/js/markdown.js:24 |

### frontend/js/navigation.js (53)

| Name | File:line |
|---|---|
| `activeNotesSection` | frontend/js/navigation.js:2238 |
| `arrowNavTarget` | frontend/js/navigation.js:201 |
| `backgroundWriteFailed` | frontend/js/navigation.js:1754 |
| `chatMessagesEl` | frontend/js/navigation.js:2383 |
| `closeNavHistoryMenu` | frontend/js/navigation.js:845 |
| `confirmLeavingUnsavedWork` | frontend/js/navigation.js:1725 |
| `coversAFormPrimary` | frontend/js/navigation.js:2542 |
| `entryLabel` | frontend/js/navigation.js:943 |
| `formPrimaryButtons` | frontend/js/navigation.js:2503 |
| `goToTabHistory` | frontend/js/navigation.js:1034 |
| `hasUnsavedWork` | frontend/js/navigation.js:1692 |
| `initNotesSubtabs` | frontend/js/navigation.js:2297 |
| `initScrollTopButton` | frontend/js/navigation.js:2562 |
| `insideClosedDetails` | frontend/js/navigation.js:1528 |
| `loadSurface` | frontend/js/navigation.js:1276 |
| `measureSpacingPx` | frontend/js/navigation.js:2533 |
| `menuOfOpener` | frontend/js/navigation.js:1550 |
| `menuRowsOf` | frontend/js/navigation.js:1535 |
| `openHistoryEntry` | frontend/js/navigation.js:1094 |
| `openNavHistoryMenu` | frontend/js/navigation.js:865 |
| `openRowMenu` | frontend/js/navigation.js:144 |
| `openSelectionScope` | frontend/js/navigation.js:307 |
| `paintTabHistory` | frontend/js/navigation.js:892 |
| `placeDockMenuInWindow` | frontend/js/navigation.js:1347 |
| `positionScrollTopForNested` | frontend/js/navigation.js:2405 |
| `recordTabVisit` | frontend/js/navigation.js:980 |
| `renderMarkdown` | frontend/js/navigation.js:355 |
| `renderMemorySettings` | frontend/js/navigation.js:2703 |
| `resetNavigationForNewSession` | frontend/js/navigation.js:2200 |
| `resetNavigationToDefaults` | frontend/js/navigation.js:2219 |
| `restoreSettingsScroll` | frontend/js/navigation.js:1081 |
| `revealTab` | frontend/js/navigation.js:775 |
| `rowMenuAtEvent` | frontend/js/navigation.js:123 |
| `scrollTopTargetEl` | frontend/js/navigation.js:2387 |
| `scrollingPage` | frontend/js/navigation.js:2336 |
| `showNotesSection` | frontend/js/navigation.js:2243 |
| `spacingPx` | frontend/js/navigation.js:2526 |
| `stepTabHistory` | frontend/js/navigation.js:1024 |
| `stripMarkdownPreview` | frontend/js/navigation.js:2127 |
| `surfaceFailed` | frontend/js/navigation.js:1207 |
| `surfaceRecovered` | frontend/js/navigation.js:1254 |
| `switchTab` | frontend/js/navigation.js:1803 |
| `syncScrollLock` | frontend/js/navigation.js:2845 |
| `tabLabel` | frontend/js/navigation.js:931 |
| `tabPlaceholder` | frontend/js/navigation.js:2063 |
| `tabSkeletonBar` | frontend/js/navigation.js:2044 |
| `tabSkeletonDock` | frontend/js/navigation.js:2054 |
| `tabSkeletonPiece` | frontend/js/navigation.js:2033 |
| `usageCount` | frontend/js/navigation.js:1764 |
| `usageFeatureName` | frontend/js/navigation.js:1760 |
| `usageFlush` | frontend/js/navigation.js:1768 |
| `watchDockMenuPlacement` | frontend/js/navigation.js:1409 |
| `wireLongPress` | frontend/js/navigation.js:24 |

### frontend/js/router.js (13)

| Name | File:line |
|---|---|
| `appAddressHash` | frontend/js/router.js:92 |
| `appAddressLabel` | frontend/js/router.js:104 |
| `appLinkMenuItem` | frontend/js/router.js:85 |
| `copyObjectAddress` | frontend/js/router.js:71 |
| `routeEntry` | frontend/js/router.js:114 |
| `routeHash` | frontend/js/router.js:37 |
| `routeHashFor` | frontend/js/router.js:64 |
| `routerGo` | frontend/js/router.js:198 |
| `routerOnVisit` | frontend/js/router.js:178 |
| `routerOpen` | frontend/js/router.js:210 |
| `routerPaintTitle` | frontend/js/router.js:161 |
| `routerRestore` | frontend/js/router.js:236 |
| `routerSettle` | frontend/js/router.js:246 |

### frontend/js/settings-panes.js (39)

| Name | File:line |
|---|---|
| `autoGrow` | frontend/js/settings-panes.js:40 |
| `autoGrowInputs` | frontend/js/settings-panes.js:188 |
| `autoGrowLimit` | frontend/js/settings-panes.js:32 |
| `autoGrowStillFits` | frontend/js/settings-panes.js:170 |
| `autoGrowVisible` | frontend/js/settings-panes.js:201 |
| `catalogueRun` | frontend/js/settings-panes.js:1232 |
| `changePassword` | frontend/js/settings-panes.js:564 |
| `chatDockReleaseRing` | frontend/js/settings-panes.js:348 |
| `chatDockSuppressRing` | frontend/js/settings-panes.js:329 |
| `checkForSourceUpdateNotice` | frontend/js/settings-panes.js:840 |
| `currentZoom` | frontend/js/settings-panes.js:1083 |
| `downloadExport` | frontend/js/settings-panes.js:1056 |
| `fitChatEmpty` | frontend/js/settings-panes.js:290 |
| `fitComposerToDock` | frontend/js/settings-panes.js:244 |
| `flashRevealed` | frontend/js/settings-panes.js:1189 |
| `hud` | frontend/js/settings-panes.js:1128 |
| `initAutoGrow` | frontend/js/settings-panes.js:441 |
| `initComposerResize` | frontend/js/settings-panes.js:363 |
| `loadPreferences` | frontend/js/settings-panes.js:676 |
| `markPrefsDirty` | frontend/js/settings-panes.js:985 |
| `markPrefsSaved` | frontend/js/settings-panes.js:1001 |
| `nudgeZoom` | frontend/js/settings-panes.js:1149 |
| `paletteAbouts` | frontend/js/settings-panes.js:1508 |
| `paletteCommands` | frontend/js/settings-panes.js:1241 |
| `paletteKeys` | frontend/js/settings-panes.js:1494 |
| `paletteRowParts` | frontend/js/settings-panes.js:1519 |
| `refitComposer` | frontend/js/settings-panes.js:269 |
| `renderAccount` | frontend/js/settings-panes.js:488 |
| `renderAutonomousSettings` | frontend/js/settings-panes.js:757 |
| `renderPrefs` | frontend/js/settings-panes.js:694 |
| `renderWebSearch` | frontend/js/settings-panes.js:779 |
| `reportTimezone` | frontend/js/settings-panes.js:639 |
| `savePrefs` | frontend/js/settings-panes.js:881 |
| `saveSearchProvider` | frontend/js/settings-panes.js:818 |
| `setPreference` | frontend/js/settings-panes.js:863 |
| `setZoom` | frontend/js/settings-panes.js:1087 |
| `updateProfileCount` | frontend/js/settings-panes.js:1044 |
| `watchOverlays` | frontend/js/settings-panes.js:453 |
| `wirePrefsDirtyMarks` | frontend/js/settings-panes.js:1020 |

### frontend/js/media.js (20)

| Name | File:line |
|---|---|
| `closeSketch` | frontend/js/media.js:274 |
| `highlighterBlend` | frontend/js/media.js:61 |
| `highlighterWidth` | frontend/js/media.js:48 |
| `openSketch` | frontend/js/media.js:227 |
| `saveSketch` | frontend/js/media.js:456 |
| `sketchApplyBrush` | frontend/js/media.js:68 |
| `sketchContext` | frontend/js/media.js:196 |
| `sketchDrawBackground` | frontend/js/media.js:214 |
| `sketchEnd` | frontend/js/media.js:405 |
| `sketchMove` | frontend/js/media.js:326 |
| `sketchPaintHighlighter` | frontend/js/media.js:126 |
| `sketchPointer` | frontend/js/media.js:281 |
| `sketchSaveSnapshot` | frontend/js/media.js:182 |
| `sketchStart` | frontend/js/media.js:292 |
| `sketchStrokeLayer` | frontend/js/media.js:113 |
| `sketchUploadImage` | frontend/js/media.js:261 |
| `speakText` | frontend/js/media.js:701 |
| `startMicLevelMeter` | frontend/js/media.js:549 |
| `syncSketchSizeReadout` | frontend/js/media.js:256 |
| `toggleDictation` | frontend/js/media.js:630 |

### frontend/js/status.js (109)

| Name | File:line |
|---|---|
| `agentActivityNotice` | frontend/js/status.js:908 |
| `agentActivityQuiet` | frontend/js/status.js:900 |
| `agentModeAvailable` | frontend/js/status.js:2790 |
| `aiIsOff` | frontend/js/status.js:2042 |
| `aiOffGlyph` | frontend/js/status.js:2411 |
| `aiOfflineDismissed` | frontend/js/status.js:2217 |
| `aiStatusState` | frontend/js/status.js:2298 |
| `announcedReminders` | frontend/js/status.js:42 |
| `appStackIsNewer` | frontend/js/status.js:1616 |
| `armReminderTimer` | frontend/js/status.js:773 |
| `askNotificationPermission` | frontend/js/status.js:643 |
| `backendLabel` | frontend/js/status.js:2841 |
| `boardHistoryActive` | frontend/js/status.js:1585 |
| `checkDueReminders` | frontend/js/status.js:789 |
| `closeModelGate` | frontend/js/status.js:2059 |
| `closeNotifications` | frontend/js/status.js:623 |
| `dismissAiOffline` | frontend/js/status.js:2226 |
| `dismissNotification` | frontend/js/status.js:213 |
| `dismissToast` | frontend/js/status.js:1011 |
| `dismissedNotificationIds` | frontend/js/status.js:204 |
| `emailSupportReport` | frontend/js/status.js:1054 |
| `forcedReadIds` | frontend/js/status.js:162 |
| `forcedUnreadIds` | frontend/js/status.js:131 |
| `insightLine` | frontend/js/status.js:1511 |
| `insightSend` | frontend/js/status.js:1484 |
| `insightVerdicts` | frontend/js/status.js:1488 |
| `integrityWords` | frontend/js/status.js:1323 |
| `isNotificationUnread` | frontend/js/status.js:180 |
| `jobsRunning` | frontend/js/status.js:1906 |
| `keepToastAction` | frontend/js/status.js:325 |
| `lastAnswerLine` | frontend/js/status.js:2433 |
| `loadMostUsed` | frontend/js/status.js:1820 |
| `loadRecentQuestions` | frontend/js/status.js:1793 |
| `noteDamagedNotebook` | frontend/js/status.js:1327 |
| `noteServerDown` | frontend/js/status.js:1383 |
| `noteServerUp` | frontend/js/status.js:1392 |
| `noticeLiveValid` | frontend/js/status.js:347 |
| `noticeTaskTransitions` | frontend/js/status.js:3087 |
| `noticeUnwatchedAnswer` | frontend/js/status.js:943 |
| `notificationActionButton` | frontend/js/status.js:385 |
| `notificationGoes` | frontend/js/status.js:378 |
| `notificationsMuted` | frontend/js/status.js:885 |
| `notificationsReadAt` | frontend/js/status.js:113 |
| `notify` | frontend/js/status.js:717 |
| `nudgeEmbeddingProblem` | frontend/js/status.js:2476 |
| `offerUndo` | frontend/js/status.js:1527 |
| `openModelGate` | frontend/js/status.js:2069 |
| `openModelOffer` | frontend/js/status.js:2076 |
| `openNotifications` | frontend/js/status.js:425 |
| `openUndoHistoryMenu` | frontend/js/status.js:1734 |
| `paintStatusItem` | frontend/js/status.js:2530 |
| `paintTitle` | frontend/js/status.js:750 |
| `paintUndoDoor` | frontend/js/status.js:1694 |
| `performRedo` | frontend/js/status.js:1648 |
| `performUndo` | frontend/js/status.js:1625 |
| `plainHttpError` | frontend/js/status.js:1127 |
| `playReminderChime` | frontend/js/status.js:683 |
| `pollServerHealth` | frontend/js/status.js:1420 |
| `primeReminderAudio` | frontend/js/status.js:658 |
| `pushEntryPutUndo` | frontend/js/status.js:1560 |
| `pushUndo` | frontend/js/status.js:1457 |
| `recordNotification` | frontend/js/status.js:97 |
| `refreshBackgroundTasks` | frontend/js/status.js:3016 |
| `refreshModelStatus` | frontend/js/status.js:1934 |
| `rememberAnnounced` | frontend/js/status.js:50 |
| `renderAgentActivityMode` | frontend/js/status.js:979 |
| `renderAiOfflineNotice` | frontend/js/status.js:2241 |
| `renderAiPill` | frontend/js/status.js:2441 |
| `renderBackendPicker` | frontend/js/status.js:2851 |
| `renderChatModeSeg` | frontend/js/status.js:2794 |
| `renderNotifMuteToggle` | frontend/js/status.js:255 |
| `renderNotificationBadge` | frontend/js/status.js:235 |
| `renderSearchEngineHealth` | frontend/js/status.js:2719 |
| `renderSettings` | frontend/js/status.js:2884 |
| `renderStatusBar` | frontend/js/status.js:2566 |
| `renderUndoBar` | frontend/js/status.js:1679 |
| `reopenAnswerPanel` | frontend/js/status.js:958 |
| `resetStatusCadence` | frontend/js/status.js:1884 |
| `retryServerNow` | frontend/js/status.js:1433 |
| `runNotificationGo` | frontend/js/status.js:364 |
| `scheduleServerDownRetry` | frontend/js/status.js:1407 |
| `scheduleUndoBar` | frontend/js/status.js:1671 |
| `setChatMode` | frontend/js/status.js:2829 |
| `setForcedReadIds` | frontend/js/status.js:171 |
| `setForcedUnreadIds` | frontend/js/status.js:140 |
| `setNotificationUnread` | frontend/js/status.js:186 |
| `setTitleCount` | frontend/js/status.js:755 |
| `setTitleView` | frontend/js/status.js:760 |
| `settingsOpen` | frontend/js/status.js:1901 |
| `settleUndoFromToast` | frontend/js/status.js:1548 |
| `showServerDownBanner` | frontend/js/status.js:1366 |
| `startReminderWatch` | frontend/js/status.js:866 |
| `storedNotifications` | frontend/js/status.js:84 |
| `surfaceHistory` | frontend/js/status.js:1598 |
| `syncAgentPaletteAvailability` | frontend/js/status.js:2280 |
| `syncModelGatedControls` | frontend/js/status.js:2123 |
| `syncNotifBlocked` | frontend/js/status.js:638 |
| `taskKey` | frontend/js/status.js:3068 |
| `toast` | frontend/js/status.js:1182 |
| `toastAction` | frontend/js/status.js:1303 |
| `toastActionButton` | frontend/js/status.js:1284 |
| `toastCloseButton` | frontend/js/status.js:1019 |
| `toastHost` | frontend/js/status.js:1096 |
| `toastProgress` | frontend/js/status.js:1252 |
| `toastStack` | frontend/js/status.js:995 |
| `toggleAiStatusPopup` | frontend/js/status.js:2704 |
| `toggleNotificationMute` | frontend/js/status.js:271 |
| `unreadNotifications` | frontend/js/status.js:229 |
| `voiceLine` | frontend/js/status.js:1176 |

### frontend/js/ai-tools.js (42)

| Name | File:line |
|---|---|
| `_namesSignature` | frontend/js/ai-tools.js:264 |
| `applyEmbeddingBackend` | frontend/js/ai-tools.js:1283 |
| `applyFeatureModel` | frontend/js/ai-tools.js:628 |
| `applyImprove` | frontend/js/ai-tools.js:1265 |
| `applyPalette` | frontend/js/ai-tools.js:1570 |
| `clearEmbeddingBackendLatch` | frontend/js/ai-tools.js:1330 |
| `closeImprove` | frontend/js/ai-tools.js:1222 |
| `featureModelChoiceLabel` | frontend/js/ai-tools.js:622 |
| `featureModelMenuItem` | frontend/js/ai-tools.js:821 |
| `featureModelRow` | frontend/js/ai-tools.js:604 |
| `featureModelState` | frontend/js/ai-tools.js:612 |
| `fillModelSelect` | frontend/js/ai-tools.js:268 |
| `improveReady` | frontend/js/ai-tools.js:1211 |
| `looksLikeEmbeddingModel` | frontend/js/ai-tools.js:1279 |
| `mirroredUiKeys` | frontend/js/ai-tools.js:1404 |
| `openChatModelPanel` | frontend/js/ai-tools.js:435 |
| `openFeatureModelSheet` | frontend/js/ai-tools.js:746 |
| `openImprove` | frontend/js/ai-tools.js:1187 |
| `placeChatModelPanel` | frontend/js/ai-tools.js:403 |
| `renderAutonomousModelPicker` | frontend/js/ai-tools.js:954 |
| `renderChatActiveModelBadge` | frontend/js/ai-tools.js:328 |
| `renderChatModelPicker` | frontend/js/ai-tools.js:301 |
| `renderEmbeddingPicker` | frontend/js/ai-tools.js:969 |
| `renderFeatureModels` | frontend/js/ai-tools.js:648 |
| `renderOcrModelPicker` | frontend/js/ai-tools.js:935 |
| `renderReindex` | frontend/js/ai-tools.js:1131 |
| `renderTaskHistory` | frontend/js/ai-tools.js:191 |
| `renderTasks` | frontend/js/ai-tools.js:20 |
| `renderUtilityModelPicker` | frontend/js/ai-tools.js:529 |
| `renderVisionModelPicker` | frontend/js/ai-tools.js:552 |
| `runImprove` | frontend/js/ai-tools.js:1228 |
| `saveUiState` | frontend/js/ai-tools.js:1462 |
| `seedUiStateFromServer` | frontend/js/ai-tools.js:1532 |
| `syncEmbeddingPickerState` | frontend/js/ai-tools.js:1068 |
| `syncFeatureModelSelects` | frontend/js/ai-tools.js:856 |
| `taskElapsed` | frontend/js/ai-tools.js:142 |
| `taskSteps` | frontend/js/ai-tools.js:160 |
| `uiStateFingerprint` | frontend/js/ai-tools.js:1451 |
| `uiStatePayload` | frontend/js/ai-tools.js:1438 |
| `watchMirroredUiKeys` | frontend/js/ai-tools.js:1506 |
| `wireFeatureModelSelects` | frontend/js/ai-tools.js:917 |
| `wireReindexButton` | frontend/js/ai-tools.js:1110 |

### frontend/js/phone-shell.js (52)

| Name | File:line |
|---|---|
| `buildSettingsJumpList` | frontend/js/phone-shell.js:1620 |
| `clearAppCache` | frontend/js/phone-shell.js:1998 |
| `closeNotePageIfGone` | frontend/js/phone-shell.js:990 |
| `dockArrangeLabel` | frontend/js/phone-shell.js:1782 |
| `dockArrangeSlot` | frontend/js/phone-shell.js:1771 |
| `dockChatAttachments` | frontend/js/phone-shell.js:1105 |
| `dockChatTools` | frontend/js/phone-shell.js:1163 |
| `dockPhoneStatus` | frontend/js/phone-shell.js:719 |
| `dockTabBar` | frontend/js/phone-shell.js:581 |
| `emblemHue` | frontend/js/phone-shell.js:98 |
| `emblemRandom` | frontend/js/phone-shell.js:87 |
| `ensureP5` | frontend/js/phone-shell.js:60 |
| `floatPrimaryActions` | frontend/js/phone-shell.js:1708 |
| `focusTabPage` | frontend/js/phone-shell.js:390 |
| `foldDockActions` | frontend/js/phone-shell.js:1885 |
| `foldDockArrange` | frontend/js/phone-shell.js:1841 |
| `foldSiblingsIntoMenu` | frontend/js/phone-shell.js:1813 |
| `foldZoneIntoMenu` | frontend/js/phone-shell.js:1794 |
| `forceReloadApp` | frontend/js/phone-shell.js:2013 |
| `initBottomTabBar` | frontend/js/phone-shell.js:612 |
| `initDockActionFolding` | frontend/js/phone-shell.js:1928 |
| `initDockFolding` | frontend/js/phone-shell.js:1859 |
| `initHeaderHeightToken` | frontend/js/phone-shell.js:514 |
| `initKeyboardInset` | frontend/js/phone-shell.js:1579 |
| `initNotePage` | frontend/js/phone-shell.js:995 |
| `initNotesSubtabHeightToken` | frontend/js/phone-shell.js:537 |
| `initOcrPhonePage` | frontend/js/phone-shell.js:1082 |
| `initPhoneChatRow` | frontend/js/phone-shell.js:1218 |
| `initPhoneHeaderMore` | frontend/js/phone-shell.js:650 |
| `initPhoneStatus` | frontend/js/phone-shell.js:755 |
| `initPrimaryFab` | frontend/js/phone-shell.js:1734 |
| `initRowSwipe` | frontend/js/phone-shell.js:850 |
| `mountPhoneSidebarOpeners` | frontend/js/phone-shell.js:789 |
| `ocrPhonePage` | frontend/js/phone-shell.js:1046 |
| `openExportsFromNotification` | frontend/js/phone-shell.js:2022 |
| `openNotePage` | frontend/js/phone-shell.js:948 |
| `openPhoneMoreSheet` | frontend/js/phone-shell.js:1431 |
| `openSheet` | frontend/js/phone-shell.js:1258 |
| `phoneMoreRunCount` | frontend/js/phone-shell.js:1512 |
| `quitApp` | frontend/js/phone-shell.js:1967 |
| `releaseDetachedEmblems` | frontend/js/phone-shell.js:134 |
| `releaseEmblem` | frontend/js/phone-shell.js:117 |
| `renderAutonomousReview` | frontend/js/phone-shell.js:2099 |
| `renderBrandLogo` | frontend/js/phone-shell.js:245 |
| `renderEmblem` | frontend/js/phone-shell.js:140 |
| `renderEmblemWhenShown` | frontend/js/phone-shell.js:267 |
| `renderExportsList` | frontend/js/phone-shell.js:2038 |
| `sheetRow` | frontend/js/phone-shell.js:1405 |
| `syncPhoneMoreButton` | frontend/js/phone-shell.js:1544 |
| `syncPhoneMoreRuns` | frontend/js/phone-shell.js:1521 |
| `toggleAutonomousPanel` | frontend/js/phone-shell.js:2074 |
| `watchEmblemVisibility` | frontend/js/phone-shell.js:40 |

### frontend/js/wiring.js (34)

| Name | File:line |
|---|---|
| `addAtlasLine` | frontend/js/wiring.js:248 |
| `applyPendingChatTitle` | frontend/js/wiring.js:778 |
| `applyPlanMode` | frontend/js/wiring.js:1487 |
| `askAtlasAbout` | frontend/js/wiring.js:237 |
| `chatRecallStep` | frontend/js/wiring.js:838 |
| `clearDueNudges` | frontend/js/wiring.js:1757 |
| `closeGlobalFind` | frontend/js/wiring.js:664 |
| `dashboardGreetingPersona` | frontend/js/wiring.js:943 |
| `escapeForFind` | frontend/js/wiring.js:442 |
| `globalFindClearHighlights` | frontend/js/wiring.js:500 |
| `globalFindRun` | frontend/js/wiring.js:511 |
| `globalFindShowActive` | frontend/js/wiring.js:583 |
| `globalFindStep` | frontend/js/wiring.js:596 |
| `globalFindWalkableRoot` | frontend/js/wiring.js:475 |
| `initGraphOptionFolds` | frontend/js/wiring.js:1060 |
| `initHelpToggles` | frontend/js/wiring.js:257 |
| `noteSourceOn` | frontend/js/wiring.js:909 |
| `nudgeDueShown` | frontend/js/wiring.js:1761 |
| `openGlobalFind` | frontend/js/wiring.js:602 |
| `openReminderCompose` | frontend/js/wiring.js:1650 |
| `paintDashboardPersonaMark` | frontend/js/wiring.js:949 |
| `reflectOnlineState` | frontend/js/wiring.js:16 |
| `renameCurrentConversation` | frontend/js/wiring.js:751 |
| `renderPlanToggle` | frontend/js/wiring.js:1474 |
| `renderWebSearchToggle` | frontend/js/wiring.js:1430 |
| `setFullscreenSurface` | frontend/js/wiring.js:1297 |
| `setGraphOptionsOpen` | frontend/js/wiring.js:1081 |
| `setNoteSource` | frontend/js/wiring.js:924 |
| `settingsSectionContaining` | frontend/js/wiring.js:488 |
| `startNewNote` | frontend/js/wiring.js:1353 |
| `syncNoteSourceButtons` | frontend/js/wiring.js:917 |
| `timelineSelectableRows` | frontend/js/wiring.js:1405 |
| `toggleSelectAllRows` | frontend/js/wiring.js:1391 |
| `watchFullscreenSurface` | frontend/js/wiring.js:1303 |

### frontend/js/settings-wiring.js (43)

| Name | File:line |
|---|---|
| `_isChatComposer` | frontend/js/settings-wiring.js:1947 |
| `activeOverlay` | frontend/js/settings-wiring.js:838 |
| `buildShortcutList` | frontend/js/settings-wiring.js:1334 |
| `captureCountText` | frontend/js/settings-wiring.js:1630 |
| `captureShortcutKey` | frontend/js/settings-wiring.js:1382 |
| `clearStagedImages` | frontend/js/settings-wiring.js:2086 |
| `closeOverlaysForChord` | frontend/js/settings-wiring.js:1128 |
| `closeShortcuts` | frontend/js/settings-wiring.js:1444 |
| `comboFromEvent` | frontend/js/settings-wiring.js:1167 |
| `commitCaptureImages` | frontend/js/settings-wiring.js:2071 |
| `fileDropBox` | frontend/js/settings-wiring.js:1956 |
| `flashSaved` | frontend/js/settings-wiring.js:400 |
| `handleFileUpload` | frontend/js/settings-wiring.js:2118 |
| `hideChordGuide` | frontend/js/settings-wiring.js:1148 |
| `loadForgottenOrder` | frontend/js/settings-wiring.js:1516 |
| `loadShortcuts` | frontend/js/settings-wiring.js:1009 |
| `localizeStaticChords` | frontend/js/settings-wiring.js:1052 |
| `matchesShortcut` | frontend/js/settings-wiring.js:1185 |
| `maybeShowOnboarding` | frontend/js/settings-wiring.js:859 |
| `notebookLocked` | frontend/js/settings-wiring.js:385 |
| `openShortcuts` | frontend/js/settings-wiring.js:1412 |
| `persistSavedSearches` | frontend/js/settings-wiring.js:53 |
| `renderCaptureFiles` | frontend/js/settings-wiring.js:1603 |
| `renderEntryAttachmentChips` | frontend/js/settings-wiring.js:1583 |
| `renderInstallRow` | frontend/js/settings-wiring.js:1871 |
| `renderSavedSearches` | frontend/js/settings-wiring.js:17 |
| `renderShortcutList` | frontend/js/settings-wiring.js:1327 |
| `resetShortcuts` | frontend/js/settings-wiring.js:1298 |
| `restampShortcutHints` | frontend/js/settings-wiring.js:1062 |
| `rewriteStagedUrls` | frontend/js/settings-wiring.js:2059 |
| `runShortcut` | frontend/js/settings-wiring.js:1190 |
| `saveCurrentSearch` | frontend/js/settings-wiring.js:61 |
| `saveShortcutOverrides` | frontend/js/settings-wiring.js:1155 |
| `saveWhatIsInFront` | frontend/js/settings-wiring.js:463 |
| `savedSearches` | frontend/js/settings-wiring.js:13 |
| `setShortcutStatus` | frontend/js/settings-wiring.js:1314 |
| `setShortcutStatusError` | frontend/js/settings-wiring.js:1321 |
| `singleKeysOn` | frontend/js/settings-wiring.js:2254 |
| `stagedImageUrl` | frontend/js/settings-wiring.js:2036 |
| `stampShortcutTitles` | frontend/js/settings-wiring.js:1038 |
| `submitLockForm` | frontend/js/settings-wiring.js:247 |
| `textCounts` | frontend/js/settings-wiring.js:1620 |
| `uploadStagedFiles` | frontend/js/settings-wiring.js:2095 |

### frontend/js/spaces-find.js (27)

| Name | File:line |
|---|---|
| `activeSpaceId` | frontend/js/spaces-find.js:206 |
| `applyStatusBarSlots` | frontend/js/spaces-find.js:25 |
| `applyStatusClock` | frontend/js/spaces-find.js:49 |
| `authHeaders` | frontend/js/spaces-find.js:216 |
| `closeSpaceMenu` | frontend/js/spaces-find.js:411 |
| `closeStatusClockDetail` | frontend/js/spaces-find.js:135 |
| `customTemplates` | frontend/js/spaces-find.js:644 |
| `hiddenStatusSlots` | frontend/js/spaces-find.js:14 |
| `initSpaceSwitcher` | frontend/js/spaces-find.js:508 |
| `loadSpaces` | frontend/js/spaces-find.js:466 |
| `openSpaceCreate` | frontend/js/spaces-find.js:420 |
| `openSpaceDelete` | frontend/js/spaces-find.js:439 |
| `openSpaceEdit` | frontend/js/spaces-find.js:429 |
| `openStatusClockDetail` | frontend/js/spaces-find.js:106 |
| `paintStatusClock` | frontend/js/spaces-find.js:40 |
| `paintStatusClockDetail` | frontend/js/spaces-find.js:78 |
| `renderSpaceMenu` | frontend/js/spaces-find.js:355 |
| `renderTemplateSettings` | frontend/js/spaces-find.js:733 |
| `saveTemplateList` | frontend/js/spaces-find.js:678 |
| `setActiveSpace` | frontend/js/spaces-find.js:223 |
| `spaceIconPicker` | frontend/js/spaces-find.js:232 |
| `spaceMenuOption` | frontend/js/spaces-find.js:254 |
| `startEditingTemplate` | frontend/js/spaces-find.js:648 |
| `stopEditingTemplate` | frontend/js/spaces-find.js:667 |
| `templateRow` | frontend/js/spaces-find.js:692 |
| `toggleSpaceHidden` | frontend/js/spaces-find.js:334 |
| `updateCaptureSpaceLabel` | frontend/js/spaces-find.js:495 |

### frontend/js/agent-activity.js (21)

| Name | File:line |
|---|---|
| `addAgentRun` | frontend/js/agent-activity.js:170 |
| `agentRunAddStep` | frontend/js/agent-activity.js:260 |
| `agentRunPaintStep` | frontend/js/agent-activity.js:281 |
| `agentRunStep` | frontend/js/agent-activity.js:305 |
| `agentRunTitle` | frontend/js/agent-activity.js:161 |
| `agentRunTool` | frontend/js/agent-activity.js:337 |
| `agentRunWantsPanel` | frontend/js/agent-activity.js:391 |
| `appendAgentLog` | frontend/js/agent-activity.js:581 |
| `endAgentRun` | frontend/js/agent-activity.js:348 |
| `nudgeAgentMonitorIdle` | frontend/js/agent-activity.js:512 |
| `openActivity` | frontend/js/agent-activity.js:471 |
| `openPanelForRun` | frontend/js/agent-activity.js:399 |
| `renderActivityStatusItem` | frontend/js/agent-activity.js:411 |
| `renderAgentRunSummary` | frontend/js/agent-activity.js:105 |
| `runStateLabel` | frontend/js/agent-activity.js:96 |
| `setAgentMonitorLogVisible` | frontend/js/agent-activity.js:426 |
| `setAgentMonitorVisible` | frontend/js/agent-activity.js:484 |
| `showActivityTab` | frontend/js/agent-activity.js:466 |
| `stepStateWords` | frontend/js/agent-activity.js:59 |
| `streamAgentLogs` | frontend/js/agent-activity.js:621 |
| `verificationRow` | frontend/js/agent-activity.js:295 |

### frontend/js/avatars.js (235)

| Name | File:line |
|---|---|
| `atlasMark` | frontend/js/avatars.js:1167 |
| `characterFor` | frontend/js/avatars.js:1253 |
| `characterRendererFor` | frontend/js/avatars.js:1236 |
| `dashboardMarkSeed` | frontend/js/avatars.js:3066 |
| `drawCharacter` | frontend/js/avatars.js:1721 |
| `isAtlasSeed` | frontend/js/avatars.js:1247 |
| `mountBuddyActivities` | frontend/js/avatars.js:3620 |
| `mountBuddyCustom` | frontend/js/avatars.js:3192 |
| `mountBuddyPresets` | frontend/js/avatars.js:3567 |
| `mountProfileLook` | frontend/js/avatars.js:3222 |
| `nameCharacterFigure` | frontend/js/avatars.js:3842 |
| `nameCharacterHeld` | frontend/js/avatars.js:2533 |
| `nameMark` | frontend/js/avatars.js:1450 |
| `nameMarkBuddyAct` | frontend/js/avatars.js:6946 |
| `nameMarkBuddyActOff` | frontend/js/avatars.js:3477 |
| `nameMarkBuddyActions` | frontend/js/avatars.js:3654 |
| `nameMarkBuddyActivitiesOff` | frontend/js/avatars.js:3470 |
| `nameMarkBuddyAim` | frontend/js/avatars.js:7112 |
| `nameMarkBuddyAnimProps` | frontend/js/avatars.js:5283 |
| `nameMarkBuddyApplyPreset` | frontend/js/avatars.js:3547 |
| `nameMarkBuddyArrive` | frontend/js/avatars.js:6593 |
| `nameMarkBuddyAsleep` | frontend/js/avatars.js:7949 |
| `nameMarkBuddyAwake` | frontend/js/avatars.js:7862 |
| `nameMarkBuddyBand` | frontend/js/avatars.js:5017 |
| `nameMarkBuddyBeat` | frontend/js/avatars.js:6447 |
| `nameMarkBuddyBellErrand` | frontend/js/avatars.js:8350 |
| `nameMarkBuddyBlend` | frontend/js/avatars.js:7975 |
| `nameMarkBuddyBody` | frontend/js/avatars.js:3803 |
| `nameMarkBuddyBoredom` | frontend/js/avatars.js:8068 |
| `nameMarkBuddyBuild` | frontend/js/avatars.js:8704 |
| `nameMarkBuddyBurst` | frontend/js/avatars.js:6201 |
| `nameMarkBuddyCallBack` | frontend/js/avatars.js:6922 |
| `nameMarkBuddyCalmAllows` | frontend/js/avatars.js:7936 |
| `nameMarkBuddyCatchUp` | frontend/js/avatars.js:5216 |
| `nameMarkBuddyChatErrand` | frontend/js/avatars.js:8360 |
| `nameMarkBuddyCheck` | frontend/js/avatars.js:6365 |
| `nameMarkBuddyChoose` | frontend/js/avatars.js:4492 |
| `nameMarkBuddyClickReaction` | frontend/js/avatars.js:7922 |
| `nameMarkBuddyColours` | frontend/js/avatars.js:3788 |
| `nameMarkBuddyContext` | frontend/js/avatars.js:8423 |
| `nameMarkBuddyCoverPoint` | frontend/js/avatars.js:4160 |
| `nameMarkBuddyCovers` | frontend/js/avatars.js:4125 |
| `nameMarkBuddyCrossfade` | frontend/js/avatars.js:5640 |
| `nameMarkBuddyCue` | frontend/js/avatars.js:7655 |
| `nameMarkBuddyCurlUp` | frontend/js/avatars.js:7207 |
| `nameMarkBuddyCurtained` | frontend/js/avatars.js:6586 |
| `nameMarkBuddyCustom` | frontend/js/avatars.js:352 |
| `nameMarkBuddyDecide` | frontend/js/avatars.js:7278 |
| `nameMarkBuddyDodge` | frontend/js/avatars.js:3965 |
| `nameMarkBuddyDrift` | frontend/js/avatars.js:7523 |
| `nameMarkBuddyDrop` | frontend/js/avatars.js:4743 |
| `nameMarkBuddyEase` | frontend/js/avatars.js:8039 |
| `nameMarkBuddyEdges` | frontend/js/avatars.js:4286 |
| `nameMarkBuddyEmote` | frontend/js/avatars.js:3487 |
| `nameMarkBuddyEnter` | frontend/js/avatars.js:6695 |
| `nameMarkBuddyErrand` | frontend/js/avatars.js:8332 |
| `nameMarkBuddyExpress` | frontend/js/avatars.js:7435 |
| `nameMarkBuddyFarWay` | frontend/js/avatars.js:5599 |
| `nameMarkBuddyFeel` | frontend/js/avatars.js:7897 |
| `nameMarkBuddyFlies` | frontend/js/avatars.js:5623 |
| `nameMarkBuddyFlip` | frontend/js/avatars.js:6125 |
| `nameMarkBuddyFollow` | frontend/js/avatars.js:5097 |
| `nameMarkBuddyFollowFrame` | frontend/js/avatars.js:5259 |
| `nameMarkBuddyFrames` | frontend/js/avatars.js:7185 |
| `nameMarkBuddyGait` | frontend/js/avatars.js:5613 |
| `nameMarkBuddyGetUp` | frontend/js/avatars.js:7211 |
| `nameMarkBuddyGlue` | frontend/js/avatars.js:5048 |
| `nameMarkBuddyGlueBand` | frontend/js/avatars.js:5084 |
| `nameMarkBuddyGo` | frontend/js/avatars.js:5766 |
| `nameMarkBuddyGone` | frontend/js/avatars.js:8584 |
| `nameMarkBuddyHalt` | frontend/js/avatars.js:7227 |
| `nameMarkBuddyHasAtlas` | frontend/js/avatars.js:7182 |
| `nameMarkBuddyHeadAt` | frontend/js/avatars.js:8207 |
| `nameMarkBuddyHide` | frontend/js/avatars.js:8623 |
| `nameMarkBuddyHint` | frontend/js/avatars.js:9269 |
| `nameMarkBuddyHits` | frontend/js/avatars.js:4107 |
| `nameMarkBuddyHold` | frontend/js/avatars.js:7518 |
| `nameMarkBuddyHome` | frontend/js/avatars.js:2827 |
| `nameMarkBuddyHover` | frontend/js/avatars.js:6028 |
| `nameMarkBuddyHoverReaction` | frontend/js/avatars.js:8060 |
| `nameMarkBuddyIndexReset` | frontend/js/avatars.js:4215 |
| `nameMarkBuddyInsideCard` | frontend/js/avatars.js:4351 |
| `nameMarkBuddyJoy` | frontend/js/avatars.js:7483 |
| `nameMarkBuddyKeepCustom` | frontend/js/avatars.js:365 |
| `nameMarkBuddyKeepFrame` | frontend/js/avatars.js:7218 |
| `nameMarkBuddyKeepPresets` | frontend/js/avatars.js:3516 |
| `nameMarkBuddyKeepSpots` | frontend/js/avatars.js:4607 |
| `nameMarkBuddyKeepUp` | frontend/js/avatars.js:5254 |
| `nameMarkBuddyLean` | frontend/js/avatars.js:8287 |
| `nameMarkBuddyLeanSide` | frontend/js/avatars.js:8282 |
| `nameMarkBuddyLeave` | frontend/js/avatars.js:6851 |
| `nameMarkBuddyLedges` | frontend/js/avatars.js:3901 |
| `nameMarkBuddyLieDown` | frontend/js/avatars.js:7200 |
| `nameMarkBuddyLieRoom` | frontend/js/avatars.js:7033 |
| `nameMarkBuddyLimbs` | frontend/js/avatars.js:5712 |
| `nameMarkBuddyLockSync` | frontend/js/avatars.js:6317 |
| `nameMarkBuddyLoud` | frontend/js/avatars.js:7941 |
| `nameMarkBuddyMade` | frontend/js/avatars.js:3157 |
| `nameMarkBuddyMakeHint` | frontend/js/avatars.js:3177 |
| `nameMarkBuddyMakeIt` | frontend/js/avatars.js:3170 |
| `nameMarkBuddyMenuOpen` | frontend/js/avatars.js:6443 |
| `nameMarkBuddyMotion` | frontend/js/avatars.js:3730 |
| `nameMarkBuddyMotionApply` | frontend/js/avatars.js:3762 |
| `nameMarkBuddyMoveTo` | frontend/js/avatars.js:5501 |
| `nameMarkBuddyNextSpot` | frontend/js/avatars.js:6566 |
| `nameMarkBuddyNoTravel` | frontend/js/avatars.js:3774 |
| `nameMarkBuddyNoteOpen` | frontend/js/avatars.js:7630 |
| `nameMarkBuddyNoteOpened` | frontend/js/avatars.js:7623 |
| `nameMarkBuddyNotice` | frontend/js/avatars.js:8217 |
| `nameMarkBuddyObstacles` | frontend/js/avatars.js:3910 |
| `nameMarkBuddyOrigin` | frontend/js/avatars.js:4065 |
| `nameMarkBuddyOverCanvas` | frontend/js/avatars.js:4340 |
| `nameMarkBuddyOverhang` | frontend/js/avatars.js:4963 |
| `nameMarkBuddyPainted` | frontend/js/avatars.js:4280 |
| `nameMarkBuddyPanelMoving` | frontend/js/avatars.js:5297 |
| `nameMarkBuddyPerchShown` | frontend/js/avatars.js:3893 |
| `nameMarkBuddyPerches` | frontend/js/avatars.js:4440 |
| `nameMarkBuddyPet` | frontend/js/avatars.js:6047 |
| `nameMarkBuddyPickVariant` | frontend/js/avatars.js:7046 |
| `nameMarkBuddyPointer` | frontend/js/avatars.js:8475 |
| `nameMarkBuddyPoof` | frontend/js/avatars.js:6149 |
| `nameMarkBuddyPopups` | frontend/js/avatars.js:3952 |
| `nameMarkBuddyPout` | frontend/js/avatars.js:8050 |
| `nameMarkBuddyPresets` | frontend/js/avatars.js:3508 |
| `nameMarkBuddyPrewarm` | frontend/js/avatars.js:7505 |
| `nameMarkBuddyPut` | frontend/js/avatars.js:4804 |
| `nameMarkBuddyQueuePlace` | frontend/js/avatars.js:6432 |
| `nameMarkBuddyReact` | frontend/js/avatars.js:7559 |
| `nameMarkBuddyRefit` | frontend/js/avatars.js:6873 |
| `nameMarkBuddyRefitClear` | frontend/js/avatars.js:6908 |
| `nameMarkBuddyRelease` | frontend/js/avatars.js:7244 |
| `nameMarkBuddyResetSize` | frontend/js/avatars.js:4035 |
| `nameMarkBuddyRestore` | frontend/js/avatars.js:4654 |
| `nameMarkBuddyRide` | frontend/js/avatars.js:4827 |
| `nameMarkBuddyRideBox` | frontend/js/avatars.js:4910 |
| `nameMarkBuddyRideClip` | frontend/js/avatars.js:4897 |
| `nameMarkBuddyRideFrames` | frontend/js/avatars.js:4884 |
| `nameMarkBuddyRoute` | frontend/js/avatars.js:5674 |
| `nameMarkBuddyRubbed` | frontend/js/avatars.js:6092 |
| `nameMarkBuddySavePreset` | frontend/js/avatars.js:3524 |
| `nameMarkBuddyScaleSaved` | frontend/js/avatars.js:4006 |
| `nameMarkBuddyScaled` | frontend/js/avatars.js:4069 |
| `nameMarkBuddyScene` | frontend/js/avatars.js:7072 |
| `nameMarkBuddySchedule` | frontend/js/avatars.js:7262 |
| `nameMarkBuddyScrollAgo` | frontend/js/avatars.js:7945 |
| `nameMarkBuddyScroller` | frontend/js/avatars.js:5004 |
| `nameMarkBuddyScrollsWith` | frontend/js/avatars.js:5072 |
| `nameMarkBuddySeed` | frontend/js/avatars.js:3043 |
| `nameMarkBuddySeen` | frontend/js/avatars.js:4983 |
| `nameMarkBuddySelector` | frontend/js/avatars.js:4617 |
| `nameMarkBuddySetSize` | frontend/js/avatars.js:4015 |
| `nameMarkBuddySettle` | frontend/js/avatars.js:6626 |
| `nameMarkBuddyShape` | frontend/js/avatars.js:4076 |
| `nameMarkBuddyShapeAt1` | frontend/js/avatars.js:4079 |
| `nameMarkBuddyShowing` | frontend/js/avatars.js:8666 |
| `nameMarkBuddyShown` | frontend/js/avatars.js:3879 |
| `nameMarkBuddyShy` | frontend/js/avatars.js:8492 |
| `nameMarkBuddySizeSelect` | frontend/js/avatars.js:4044 |
| `nameMarkBuddySound` | frontend/js/avatars.js:8401 |
| `nameMarkBuddySpotFor` | frontend/js/avatars.js:4639 |
| `nameMarkBuddySpots` | frontend/js/avatars.js:4598 |
| `nameMarkBuddySquash` | frontend/js/avatars.js:5988 |
| `nameMarkBuddyStances` | frontend/js/avatars.js:4422 |
| `nameMarkBuddyStepAside` | frontend/js/avatars.js:4702 |
| `nameMarkBuddyStill` | frontend/js/avatars.js:3771 |
| `nameMarkBuddyStillGood` | frontend/js/avatars.js:6352 |
| `nameMarkBuddyStir` | frontend/js/avatars.js:8177 |
| `nameMarkBuddyStreak` | frontend/js/avatars.js:7608 |
| `nameMarkBuddyStrokes` | frontend/js/avatars.js:6065 |
| `nameMarkBuddySupportSoon` | frontend/js/avatars.js:6280 |
| `nameMarkBuddySupported` | frontend/js/avatars.js:6243 |
| `nameMarkBuddySurfaceWalk` | frontend/js/avatars.js:4224 |
| `nameMarkBuddyTab` | frontend/js/avatars.js:3871 |
| `nameMarkBuddyTabChanged` | frontend/js/avatars.js:6520 |
| `nameMarkBuddyTabSide` | frontend/js/avatars.js:6556 |
| `nameMarkBuddyTempo` | frontend/js/avatars.js:5336 |
| `nameMarkBuddyTextBoxes` | frontend/js/avatars.js:4180 |
| `nameMarkBuddyTick` | frontend/js/avatars.js:7349 |
| `nameMarkBuddyTilt` | frontend/js/avatars.js:7161 |
| `nameMarkBuddyToggle` | frontend/js/avatars.js:8681 |
| `nameMarkBuddyToggles` | frontend/js/avatars.js:3481 |
| `nameMarkBuddyToss` | frontend/js/avatars.js:6009 |
| `nameMarkBuddyTravel` | frontend/js/avatars.js:5756 |
| `nameMarkBuddyUnheld` | frontend/js/avatars.js:5232 |
| `nameMarkBuddyVary` | frontend/js/avatars.js:7055 |
| `nameMarkBuddyViewChanged` | frontend/js/avatars.js:6482 |
| `nameMarkBuddyVisit` | frontend/js/avatars.js:2774 |
| `nameMarkBuddyWake` | frontend/js/avatars.js:8137 |
| `nameMarkBuddyWander` | frontend/js/avatars.js:8081 |
| `nameMarkBuddyWarmthAt` | frontend/js/avatars.js:7893 |
| `nameMarkBuddyWatch` | frontend/js/avatars.js:5440 |
| `nameMarkBuddyWay` | frontend/js/avatars.js:5749 |
| `nameMarkBuddyWordsUnder` | frontend/js/avatars.js:4374 |
| `nameMarkBuddyWork` | frontend/js/avatars.js:7748 |
| `nameMarkBuddyWorkFor` | frontend/js/avatars.js:7744 |
| `nameMarkBuddyYoursObstacles` | frontend/js/avatars.js:4733 |
| `nameMarkCompose` | frontend/js/avatars.js:1302 |
| `nameMarkFigure` | frontend/js/avatars.js:3858 |
| `nameMarkIdleAct` | frontend/js/avatars.js:2887 |
| `nameMarkIdleQuiet` | frontend/js/avatars.js:2866 |
| `nameMarkIdleTick` | frontend/js/avatars.js:2872 |
| `nameMarkIdleWake` | frontend/js/avatars.js:2863 |
| `nameMarkKeyboard` | frontend/js/avatars.js:1152 |
| `nameMarkLean` | frontend/js/avatars.js:947 |
| `nameMarkLine` | frontend/js/avatars.js:2674 |
| `nameMarkLive` | frontend/js/avatars.js:2683 |
| `nameMarkLookLean` | frontend/js/avatars.js:381 |
| `nameMarkLookPickers` | frontend/js/avatars.js:3119 |
| `nameMarkOwnFor` | frontend/js/avatars.js:331 |
| `nameMarkRasterise` | frontend/js/avatars.js:1321 |
| `nameMarkReact` | frontend/js/avatars.js:2691 |
| `nameMarkRepaintAll` | frontend/js/avatars.js:388 |
| `nameMarkSay` | frontend/js/avatars.js:2700 |
| `nameMarkShade` | frontend/js/avatars.js:3778 |
| `nameMarkSlot` | frontend/js/avatars.js:287 |
| `nameMarkStyleClean` | frontend/js/avatars.js:305 |
| `nameMarkSushi` | frontend/js/avatars.js:2524 |
| `nameMarkTitle` | frontend/js/avatars.js:1057 |
| `nameMarkViewerBlinks` | frontend/js/avatars.js:2755 |
| `nameMarkViewerFit` | frontend/js/avatars.js:2952 |
| `nameMarkViewerFollow` | frontend/js/avatars.js:2726 |
| `nameMood` | frontend/js/avatars.js:395 |
| `nmHex` | frontend/js/avatars.js:1697 |
| `nmLineFor` | frontend/js/avatars.js:1710 |
| `nmLuma` | frontend/js/avatars.js:1714 |
| `nmMix` | frontend/js/avatars.js:1701 |
| `ownNameMarkStyle` | frontend/js/avatars.js:327 |
| `placeNameMarkBuddy` | frontend/js/avatars.js:6222 |
| `queueNameMarkBuddyCheck` | frontend/js/avatars.js:6415 |
| `registerCharacter` | frontend/js/avatars.js:1230 |
| `repaintOwnFace` | frontend/js/avatars.js:3106 |
| `setOwnNameMarkStyle` | frontend/js/avatars.js:294 |
| `syncNameMarkBuddy` | frontend/js/avatars.js:9177 |
| `syncProfileLook` | frontend/js/avatars.js:3248 |
| `watchNameMark` | frontend/js/avatars.js:1119 |

### frontend/js/atlas.js (95)

| Name | File:line |
|---|---|
| `atlasAlmond` | frontend/js/atlas.js:1543 |
| `atlasApply` | frontend/js/atlas.js:3324 |
| `atlasArmHand` | frontend/js/atlas.js:987 |
| `atlasArmPath` | frontend/js/atlas.js:982 |
| `atlasArmSegs` | frontend/js/atlas.js:973 |
| `atlasAuraAt` | frontend/js/atlas.js:2814 |
| `atlasAvatar` | frontend/js/atlas.js:3241 |
| `atlasBand` | frontend/js/atlas.js:1890 |
| `atlasBandPaths` | frontend/js/atlas.js:1470 |
| `atlasBandSplit` | frontend/js/atlas.js:1492 |
| `atlasBody` | frontend/js/atlas.js:2207 |
| `atlasBookProp` | frontend/js/atlas.js:1942 |
| `atlasBuild` | frontend/js/atlas.js:1070 |
| `atlasBuildDefs` | frontend/js/atlas.js:2555 |
| `atlasClassicFigure` | frontend/js/atlas.js:3480 |
| `atlasClassicMark` | frontend/js/atlas.js:3358 |
| `atlasCoilProp` | frontend/js/atlas.js:1975 |
| `atlasCue` | frontend/js/atlas.js:2078 |
| `atlasDefs` | frontend/js/atlas.js:2538 |
| `atlasDraw` | frontend/js/atlas.js:3182 |
| `atlasDrawFigure` | frontend/js/atlas.js:2837 |
| `atlasDressMarks` | frontend/js/atlas.js:3245 |
| `atlasDrift` | frontend/js/atlas.js:3679 |
| `atlasDrop` | frontend/js/atlas.js:1533 |
| `atlasEars` | frontend/js/atlas.js:1804 |
| `atlasExtras` | frontend/js/atlas.js:1646 |
| `atlasEye` | frontend/js/atlas.js:1559 |
| `atlasFigure` | frontend/js/atlas.js:3262 |
| `atlasFix` | frontend/js/atlas.js:211 |
| `atlasFoot` | frontend/js/atlas.js:391 |
| `atlasGroup` | frontend/js/atlas.js:169 |
| `atlasHairCap` | frontend/js/atlas.js:1741 |
| `atlasHand` | frontend/js/atlas.js:390 |
| `atlasHandProps` | frontend/js/atlas.js:2016 |
| `atlasHead` | frontend/js/atlas.js:2091 |
| `atlasHeadProps` | frontend/js/atlas.js:1915 |
| `atlasHeart` | frontend/js/atlas.js:1526 |
| `atlasHelixAt` | frontend/js/atlas.js:1410 |
| `atlasHelixSegs` | frontend/js/atlas.js:1423 |
| `atlasHelixSpan` | frontend/js/atlas.js:1459 |
| `atlasHelixWidth` | frontend/js/atlas.js:1449 |
| `atlasHemTip` | frontend/js/atlas.js:998 |
| `atlasHiddenSync` | frontend/js/atlas.js:3308 |
| `atlasLevelFor` | frontend/js/atlas.js:2790 |
| `atlasLids` | frontend/js/atlas.js:3150 |
| `atlasLimbShaped` | frontend/js/atlas.js:399 |
| `atlasLimbTo` | frontend/js/atlas.js:394 |
| `atlasLimbWidth` | frontend/js/atlas.js:895 |
| `atlasLook` | frontend/js/atlas.js:847 |
| `atlasLookReason` | frontend/js/atlas.js:851 |
| `atlasMake` | frontend/js/atlas.js:151 |
| `atlasMane` | frontend/js/atlas.js:1691 |
| `atlasMapProp` | frontend/js/atlas.js:1999 |
| `atlasMiniCap` | frontend/js/atlas.js:1777 |
| `atlasMiniShoulders` | frontend/js/atlas.js:1791 |
| `atlasMirror` | frontend/js/atlas.js:871 |
| `atlasMirrorPoints` | frontend/js/atlas.js:389 |
| `atlasNightcap` | frontend/js/atlas.js:1635 |
| `atlasOn` | frontend/js/atlas.js:3640 |
| `atlasOrbits` | frontend/js/atlas.js:3020 |
| `atlasPaw` | frontend/js/atlas.js:884 |
| `atlasPivot` | frontend/js/atlas.js:163 |
| `atlasPlay` | frontend/js/atlas.js:3627 |
| `atlasRepaint` | frontend/js/atlas.js:3505 |
| `atlasRestingMood` | frontend/js/atlas.js:3550 |
| `atlasRetune` | frontend/js/atlas.js:1366 |
| `atlasRing` | frontend/js/atlas.js:2156 |
| `atlasRings` | frontend/js/atlas.js:3089 |
| `atlasScalePath` | frontend/js/atlas.js:485 |
| `atlasScalePathX` | frontend/js/atlas.js:1359 |
| `atlasSegsAt` | frontend/js/atlas.js:216 |
| `atlasSegsCut` | frontend/js/atlas.js:228 |
| `atlasSheet` | frontend/js/atlas.js:2087 |
| `atlasSmooth` | frontend/js/atlas.js:262 |
| `atlasSpark` | frontend/js/atlas.js:1519 |
| `atlasSpecks` | frontend/js/atlas.js:411 |
| `atlasStarsProp` | frontend/js/atlas.js:1959 |
| `atlasStem` | frontend/js/atlas.js:282 |
| `atlasStemEdge` | frontend/js/atlas.js:403 |
| `atlasStemSides` | frontend/js/atlas.js:184 |
| `atlasStreak` | frontend/js/atlas.js:3700 |
| `atlasStyle` | frontend/js/atlas.js:3354 |
| `atlasTail` | frontend/js/atlas.js:1852 |
| `atlasTailMasks` | frontend/js/atlas.js:2504 |
| `atlasTailWake` | frontend/js/atlas.js:3255 |
| `atlasTaper` | frontend/js/atlas.js:418 |
| `atlasTipShape` | frontend/js/atlas.js:324 |
| `atlasTorsoEdge` | frontend/js/atlas.js:947 |
| `atlasTune` | frontend/js/atlas.js:1038 |
| `atlasTuneSegs` | frontend/js/atlas.js:1053 |
| `atlasTuneStyle` | frontend/js/atlas.js:2798 |
| `atlasTurnAbout` | frontend/js/atlas.js:968 |
| `atlasWake` | frontend/js/atlas.js:3731 |
| `atlasWatchFigure` | frontend/js/atlas.js:3295 |
| `setAtlasMood` | frontend/js/atlas.js:3570 |

### frontend/js/rich-picker.js (8)

| Name | File:line |
|---|---|
| `richPickerFillLabel` | frontend/js/rich-picker.js:42 |
| `richPickerGroup` | frontend/js/rich-picker.js:103 |
| `richPickerIconClass` | frontend/js/rich-picker.js:27 |
| `richPickerPreview` | frontend/js/rich-picker.js:171 |
| `richPickerRow` | frontend/js/rich-picker.js:118 |
| `richPickerSetActive` | frontend/js/rich-picker.js:154 |
| `richPickerSplitLabel` | frontend/js/rich-picker.js:33 |
| `richPickerTile` | frontend/js/rich-picker.js:86 |

### frontend/js/editor.js (70)

| Name | File:line |
|---|---|
| `askAboutSelection` | frontend/js/editor.js:2030 |
| `calloutHint` | frontend/js/editor.js:284 |
| `calloutKindOf` | frontend/js/editor.js:292 |
| `calloutRewriteHead` | frontend/js/editor.js:306 |
| `chatCommands` | frontend/js/editor.js:577 |
| `codeFamilyFor` | frontend/js/editor.js:2233 |
| `editorApplyAction` | frontend/js/editor.js:451 |
| `editorApplyNamed` | frontend/js/editor.js:509 |
| `editorBackOverTrail` | frontend/js/editor.js:895 |
| `editorBlock` | frontend/js/editor.js:760 |
| `editorBlockRows` | frontend/js/editor.js:801 |
| `editorCaretPoint` | frontend/js/editor.js:1015 |
| `editorChoiceDialog` | frontend/js/editor.js:2054 |
| `editorCloseMenu` | frontend/js/editor.js:1056 |
| `editorCodeLanguageRows` | frontend/js/editor.js:789 |
| `editorCommands` | frontend/js/editor.js:908 |
| `editorEnsureSurfaceModule` | frontend/js/editor.js:129 |
| `editorFinishFence` | frontend/js/editor.js:1073 |
| `editorFuzzyMatch` | frontend/js/editor.js:314 |
| `editorFuzzyRank` | frontend/js/editor.js:334 |
| `editorGroupStarts` | frontend/js/editor.js:1441 |
| `editorHandleInput` | frontend/js/editor.js:1586 |
| `editorHintAllPlaceholders` | frontend/js/editor.js:216 |
| `editorHintPlaceholder` | frontend/js/editor.js:190 |
| `editorInsertBlock` | frontend/js/editor.js:525 |
| `editorInsertBoardObject` | frontend/js/editor.js:555 |
| `editorInsertBookmarkLink` | frontend/js/editor.js:542 |
| `editorLinkMatches` | frontend/js/editor.js:1120 |
| `editorLoadFiles` | frontend/js/editor.js:1243 |
| `editorMenuIcon` | frontend/js/editor.js:1283 |
| `editorMenuList` | frontend/js/editor.js:1288 |
| `editorNextGroupStart` | frontend/js/editor.js:1451 |
| `editorNotifyHost` | frontend/js/editor.js:373 |
| `editorOpenMenu` | frontend/js/editor.js:1507 |
| `editorOpenMenuByShortcut` | frontend/js/editor.js:173 |
| `editorPickGlyph` | frontend/js/editor.js:432 |
| `editorPositionMenu` | frontend/js/editor.js:1029 |
| `editorRankCommands` | frontend/js/editor.js:1113 |
| `editorRecentIds` | frontend/js/editor.js:733 |
| `editorRefreshMenu` | frontend/js/editor.js:1521 |
| `editorRememberBlock` | frontend/js/editor.js:742 |
| `editorRenderMenu` | frontend/js/editor.js:1292 |
| `editorRenderPreview` | frontend/js/editor.js:1362 |
| `editorRevealRow` | frontend/js/editor.js:1418 |
| `editorRunItem` | frontend/js/editor.js:1463 |
| `editorSetActive` | frontend/js/editor.js:1398 |
| `editorSplice` | frontend/js/editor.js:398 |
| `editorSurfaceFor` | frontend/js/editor.js:105 |
| `editorSurfaceKind` | frontend/js/editor.js:72 |
| `editorTokenAt` | frontend/js/editor.js:1089 |
| `inlineAiAvailable` | frontend/js/editor.js:2418 |
| `inlineAiClose` | frontend/js/editor.js:2457 |
| `inlineAiDescribeScope` | frontend/js/editor.js:2398 |
| `inlineAiElement` | frontend/js/editor.js:2292 |
| `inlineAiOpen` | frontend/js/editor.js:2423 |
| `inlineAiPosition` | frontend/js/editor.js:2377 |
| `inlineAiRetry` | frontend/js/editor.js:2479 |
| `inlineAiSubmit` | frontend/js/editor.js:2490 |
| `inlineAiUndo` | frontend/js/editor.js:2470 |
| `isEditorSurface` | frontend/js/editor.js:1932 |
| `offerToCreateWikiTarget` | frontend/js/editor.js:2119 |
| `pickIconOrEmoji` | frontend/js/editor.js:424 |
| `selectionBarElement` | frontend/js/editor.js:1799 |
| `selectionBarHide` | frontend/js/editor.js:1860 |
| `selectionBarShow` | frontend/js/editor.js:1865 |
| `selectionBarSync` | frontend/js/editor.js:1936 |
| `selectionContextFrom` | frontend/js/editor.js:1978 |
| `selectionContextSource` | frontend/js/editor.js:2011 |
| `selectionOffsets` | frontend/js/editor.js:1988 |
| `skillCommands` | frontend/js/editor.js:645 |

### frontend/js/dashboard.js (141)

| Name | File:line |
|---|---|
| `activityActorName` | frontend/js/dashboard.js:4389 |
| `activityUndoControl` | frontend/js/dashboard.js:4467 |
| `activityUndoPlanText` | frontend/js/dashboard.js:4396 |
| `activityUndoStarts` | frontend/js/dashboard.js:4452 |
| `applyDashDensity` | frontend/js/dashboard.js:1187 |
| `artEaseOut` | frontend/js/dashboard.js:2387 |
| `artLineFade` | frontend/js/dashboard.js:2395 |
| `artRetarget` | frontend/js/dashboard.js:2405 |
| `artSeed` | frontend/js/dashboard.js:2302 |
| `buildArtParticles` | frontend/js/dashboard.js:2330 |
| `cachedGreetingPhrase` | frontend/js/dashboard.js:283 |
| `categoryHue` | frontend/js/dashboard.js:2286 |
| `closeFeatures` | frontend/js/dashboard.js:1527 |
| `dashActionRow` | frontend/js/dashboard.js:3952 |
| `dashActivityItems` | frontend/js/dashboard.js:4304 |
| `dashContinueNote` | frontend/js/dashboard.js:1384 |
| `dashCustomiseItems` | frontend/js/dashboard.js:1433 |
| `dashDensity` | frontend/js/dashboard.js:1084 |
| `dashDragOverCard` | frontend/js/dashboard.js:22 |
| `dashEmpty` | frontend/js/dashboard.js:4004 |
| `dashEntries` | frontend/js/dashboard.js:455 |
| `dashFillingSkeleton` | frontend/js/dashboard.js:1966 |
| `dashFillingSkeletonDone` | frontend/js/dashboard.js:1993 |
| `dashGlanceFacts` | frontend/js/dashboard.js:575 |
| `dashGridShape` | frontend/js/dashboard.js:1767 |
| `dashLayout` | frontend/js/dashboard.js:161 |
| `dashMarkMenu` | frontend/js/dashboard.js:1157 |
| `dashMeetingWhen` | frontend/js/dashboard.js:654 |
| `dashMoreItems` | frontend/js/dashboard.js:1401 |
| `dashRelativeTime` | frontend/js/dashboard.js:4558 |
| `dashReminders` | frontend/js/dashboard.js:435 |
| `dashStreak` | frontend/js/dashboard.js:2766 |
| `dashTensionRow` | frontend/js/dashboard.js:4790 |
| `dashWidgetRow` | frontend/js/dashboard.js:2049 |
| `dashWidgetToggle` | frontend/js/dashboard.js:2023 |
| `dashWidgetsSummary` | frontend/js/dashboard.js:2161 |
| `dashboardGreetingText` | frontend/js/dashboard.js:268 |
| `fallbackGreetingPhrase` | frontend/js/dashboard.js:240 |
| `fetchDashGraph` | frontend/js/dashboard.js:415 |
| `fetchDashStats` | frontend/js/dashboard.js:390 |
| `firstNoteImage` | frontend/js/dashboard.js:2850 |
| `focusTimeLabel` | frontend/js/dashboard.js:3806 |
| `focusTimerTick` | frontend/js/dashboard.js:3822 |
| `generateDigest` | frontend/js/dashboard.js:3113 |
| `gettingStartedCard` | frontend/js/dashboard.js:1603 |
| `greetingBlock` | frontend/js/dashboard.js:231 |
| `greetingCacheSlot` | frontend/js/dashboard.js:274 |
| `hueFor` | frontend/js/dashboard.js:2276 |
| `loadDigestCache` | frontend/js/dashboard.js:3099 |
| `miniEntryList` | frontend/js/dashboard.js:2886 |
| `mountWidgetBody` | frontend/js/dashboard.js:1694 |
| `moveDashWidget` | frontend/js/dashboard.js:2030 |
| `nightFactRow` | frontend/js/dashboard.js:4061 |
| `nightKindLine` | frontend/js/dashboard.js:4151 |
| `nightKindWords` | frontend/js/dashboard.js:4049 |
| `nightRunSummary` | frontend/js/dashboard.js:4054 |
| `noteRowFile` | frontend/js/dashboard.js:2881 |
| `noteRowImage` | frontend/js/dashboard.js:2867 |
| `noteSkillRun` | frontend/js/dashboard.js:948 |
| `openAskFromDashboard` | frontend/js/dashboard.js:854 |
| `openFeatures` | frontend/js/dashboard.js:1512 |
| `paintDashClock` | frontend/js/dashboard.js:359 |
| `paintDashEmblem` | frontend/js/dashboard.js:1111 |
| `paintFadedNotes` | frontend/js/dashboard.js:3621 |
| `paintFocusTimer` | frontend/js/dashboard.js:3812 |
| `quickAccessCurrent` | frontend/js/dashboard.js:1341 |
| `quickAccessItems` | frontend/js/dashboard.js:1305 |
| `quickCatalogue` | frontend/js/dashboard.js:1288 |
| `quickLinkButton` | frontend/js/dashboard.js:1248 |
| `quickTintColours` | frontend/js/dashboard.js:1242 |
| `quickTintKey` | frontend/js/dashboard.js:1231 |
| `quickTints` | frontend/js/dashboard.js:1318 |
| `recentSkillLinks` | frontend/js/dashboard.js:1019 |
| `refreshAiGreeting` | frontend/js/dashboard.js:303 |
| `refreshArtForTheme` | frontend/js/dashboard.js:2322 |
| `refreshDashWidgets` | frontend/js/dashboard.js:1742 |
| `renderActivityWidget` | frontend/js/dashboard.js:4317 |
| `renderArtWidget` | frontend/js/dashboard.js:2417 |
| `renderBoardsWidget` | frontend/js/dashboard.js:4025 |
| `renderBookmarksWidget` | frontend/js/dashboard.js:4534 |
| `renderCategoriesWidget` | frontend/js/dashboard.js:3514 |
| `renderDashGlance` | frontend/js/dashboard.js:671 |
| `renderDashMore` | frontend/js/dashboard.js:1482 |
| `renderDashSubmessage` | frontend/js/dashboard.js:461 |
| `renderDashWidgetsList` | frontend/js/dashboard.js:2190 |
| `renderDashboard` | frontend/js/dashboard.js:1771 |
| `renderDashboardGreeting` | frontend/js/dashboard.js:529 |
| `renderDayDigest` | frontend/js/dashboard.js:3176 |
| `renderDigestWidget` | frontend/js/dashboard.js:3226 |
| `renderDocumentsWidget` | frontend/js/dashboard.js:4498 |
| `renderFeatures` | frontend/js/dashboard.js:1533 |
| `renderFocusTimerWidget` | frontend/js/dashboard.js:3859 |
| `renderHeatmapWidget` | frontend/js/dashboard.js:3396 |
| `renderMostLinkedWidget` | frontend/js/dashboard.js:3019 |
| `renderMostOpenedWidget` | frontend/js/dashboard.js:2982 |
| `renderMostUsedWidget` | frontend/js/dashboard.js:3008 |
| `renderNameNudge` | frontend/js/dashboard.js:735 |
| `renderNightCard` | frontend/js/dashboard.js:4234 |
| `renderNightWidget` | frontend/js/dashboard.js:4206 |
| `renderOnThisDayWidget` | frontend/js/dashboard.js:4847 |
| `renderOrphanNotesWidget` | frontend/js/dashboard.js:4616 |
| `renderPaceWidget` | frontend/js/dashboard.js:4922 |
| `renderPinnedWidget` | frontend/js/dashboard.js:2977 |
| `renderQuestionsWidget` | frontend/js/dashboard.js:3068 |
| `renderQuickCaptureWidget` | frontend/js/dashboard.js:3305 |
| `renderQuickLinks` | frontend/js/dashboard.js:1345 |
| `renderRandomNoteWidget` | frontend/js/dashboard.js:3593 |
| `renderRandomShuffle` | frontend/js/dashboard.js:3677 |
| `renderRecentNotesWidget` | frontend/js/dashboard.js:3038 |
| `renderRemindersWidget` | frontend/js/dashboard.js:3358 |
| `renderReviewWidget` | frontend/js/dashboard.js:2987 |
| `renderStatsWidget` | frontend/js/dashboard.js:2807 |
| `renderStreakWidget` | frontend/js/dashboard.js:2775 |
| `renderTagCloudWidget` | frontend/js/dashboard.js:3780 |
| `renderTensionsWidget` | frontend/js/dashboard.js:4728 |
| `renderTopTagsWidget` | frontend/js/dashboard.js:3047 |
| `renderUnfinishedWidget` | frontend/js/dashboard.js:4579 |
| `saveDashLayout` | frontend/js/dashboard.js:194 |
| `saveQuickAccess` | frontend/js/dashboard.js:1314 |
| `saveQuickTint` | frontend/js/dashboard.js:1326 |
| `saveQuickTints` | frontend/js/dashboard.js:1333 |
| `setFocusTimer` | frontend/js/dashboard.js:3850 |
| `sizeDashWidgetSpan` | frontend/js/dashboard.js:783 |
| `sizeDashWidgets` | frontend/js/dashboard.js:787 |
| `skillRunTimes` | frontend/js/dashboard.js:939 |
| `startArt` | frontend/js/dashboard.js:2477 |
| `startDashClock` | frontend/js/dashboard.js:332 |
| `startFocusTimer` | frontend/js/dashboard.js:3834 |
| `stopArt` | frontend/js/dashboard.js:2310 |
| `stopDashClock` | frontend/js/dashboard.js:327 |
| `stopFocusTimer` | frontend/js/dashboard.js:3843 |
| `streamDigest` | frontend/js/dashboard.js:3132 |
| `todayStamp` | frontend/js/dashboard.js:3095 |
| `toggleDashWidgetHidden` | frontend/js/dashboard.js:205 |
| `toggleDashWidgetWide` | frontend/js/dashboard.js:213 |
| `truncateMarkdownSafe` | frontend/js/dashboard.js:3578 |
| `undoActorFrom` | frontend/js/dashboard.js:4414 |
| `watchDashWidgets` | frontend/js/dashboard.js:805 |
| `wireDashDensity` | frontend/js/dashboard.js:1216 |
| `withDisplayName` | frontend/js/dashboard.js:252 |
| `withoutLeadingEmoji` | frontend/js/dashboard.js:1005 |

### frontend/js/timeline.js (68)

| Name | File:line |
|---|---|
| `appendTimelineRows` | frontend/js/timeline.js:717 |
| `applyTimelineRowTabOrder` | frontend/js/timeline.js:1389 |
| `closeTimelineRow` | frontend/js/timeline.js:1605 |
| `dailyNotePair` | frontend/js/timeline.js:1064 |
| `dailyNoteTitle` | frontend/js/timeline.js:182 |
| `drawTimelineScrubber` | frontend/js/timeline.js:1930 |
| `drawTimelineWindow` | frontend/js/timeline.js:1998 |
| `fillTimelineBandOptions` | frontend/js/timeline.js:800 |
| `focusTimelineRow` | frontend/js/timeline.js:1555 |
| `openDayPage` | frontend/js/timeline.js:1032 |
| `openTimelineRowDetail` | frontend/js/timeline.js:1616 |
| `openTimelineTableDetail` | frontend/js/timeline.js:2328 |
| `openTodaysPage` | frontend/js/timeline.js:1020 |
| `paintTimeline` | frontend/js/timeline.js:863 |
| `paintTimelineFeed` | frontend/js/timeline.js:893 |
| `paintTimelineTable` | frontend/js/timeline.js:2152 |
| `renderTimeline` | frontend/js/timeline.js:556 |
| `renderTimelineDayStrip` | frontend/js/timeline.js:1149 |
| `renderTimelineKinds` | frontend/js/timeline.js:338 |
| `renderTimelineMonthPop` | frontend/js/timeline.js:1270 |
| `renderTimelineRecall` | frontend/js/timeline.js:611 |
| `renderTimelineRowMedia` | frontend/js/timeline.js:1710 |
| `setTimelineRowSelected` | frontend/js/timeline.js:2316 |
| `shortDate` | frontend/js/timeline.js:1859 |
| `startDayNote` | frontend/js/timeline.js:1095 |
| `startTodaysNote` | frontend/js/timeline.js:1091 |
| `syncTimelineDetailSpans` | frontend/js/timeline.js:2207 |
| `syncTimelineFilterChip` | frontend/js/timeline.js:830 |
| `syncTimelineKindsLabel` | frontend/js/timeline.js:394 |
| `syncTimelineSelectUi` | frontend/js/timeline.js:2345 |
| `syncTimelineViewSeg` | frontend/js/timeline.js:2389 |
| `timelineAutoScale` | frontend/js/timeline.js:448 |
| `timelineBucketKey` | frontend/js/timeline.js:215 |
| `timelineBucketLabel` | frontend/js/timeline.js:232 |
| `timelineBucketSection` | frontend/js/timeline.js:945 |
| `timelineDailyNote` | frontend/js/timeline.js:199 |
| `timelineDayKeys` | frontend/js/timeline.js:1213 |
| `timelineDayLabel` | frontend/js/timeline.js:1144 |
| `timelineDayPages` | frontend/js/timeline.js:1128 |
| `timelineDayShift` | frontend/js/timeline.js:1085 |
| `timelineDensitySpan` | frontend/js/timeline.js:1907 |
| `timelineDensitySpanOf` | frontend/js/timeline.js:1913 |
| `timelineForgetRows` | frontend/js/timeline.js:1993 |
| `timelineIsDailyNote` | frontend/js/timeline.js:304 |
| `timelineJumpToDay` | frontend/js/timeline.js:1257 |
| `timelineKindChoice` | frontend/js/timeline.js:288 |
| `timelineLoadMore` | frontend/js/timeline.js:672 |
| `timelineMonthKeys` | frontend/js/timeline.js:1324 |
| `timelineMonthShift` | frontend/js/timeline.js:1251 |
| `timelineMonthStart` | frontend/js/timeline.js:1247 |
| `timelineQuery` | frontend/js/timeline.js:526 |
| `timelineResolvedScale` | frontend/js/timeline.js:475 |
| `timelineRow` | frontend/js/timeline.js:115 |
| `timelineRowElement` | frontend/js/timeline.js:1417 |
| `timelineRowGroups` | frontend/js/timeline.js:786 |
| `timelineRowMoment` | frontend/js/timeline.js:102 |
| `timelineScaleChoice` | frontend/js/timeline.js:432 |
| `timelineScrubTo` | frontend/js/timeline.js:2046 |
| `timelineSortValue` | frontend/js/timeline.js:2123 |
| `timelineSortedRows` | frontend/js/timeline.js:2134 |
| `timelineStepScale` | frontend/js/timeline.js:1828 |
| `timelineTableColumnCount` | frontend/js/timeline.js:2187 |
| `timelineTableRow` | frontend/js/timeline.js:2214 |
| `timelineViewMode` | frontend/js/timeline.js:2096 |
| `timelineVisibleRows` | frontend/js/timeline.js:843 |
| `timelineWatchRow` | frontend/js/timeline.js:1982 |
| `toggleTimelineKind` | frontend/js/timeline.js:413 |
| `toggleTimelineRow` | frontend/js/timeline.js:1579 |

### frontend/js/palette.js (30)

| Name | File:line |
|---|---|
| `agentActStarters` | frontend/js/palette.js:184 |
| `agentCurrentTab` | frontend/js/palette.js:119 |
| `agentFocusStarter` | frontend/js/palette.js:1362 |
| `agentOpenSubject` | frontend/js/palette.js:260 |
| `agentPaletteShut` | frontend/js/palette.js:449 |
| `agentPhoneSheet` | frontend/js/palette.js:417 |
| `agentScopeForRun` | frontend/js/palette.js:313 |
| `agentStarterButtons` | frontend/js/palette.js:1358 |
| `agentStarterRecents` | frontend/js/palette.js:147 |
| `agentTabLabel` | frontend/js/palette.js:134 |
| `cmdNoteLink` | frontend/js/palette.js:800 |
| `cmdNoteName` | frontend/js/palette.js:787 |
| `cmdPaletteAsk` | frontend/js/palette.js:885 |
| `cmdPaletteBusy` | frontend/js/palette.js:582 |
| `cmdPaletteFacts` | frontend/js/palette.js:616 |
| `cmdPaletteGoToNote` | frontend/js/palette.js:654 |
| `cmdPaletteGrow` | frontend/js/palette.js:1340 |
| `cmdPaletteLinkNotes` | frontend/js/palette.js:835 |
| `cmdPaletteReset` | frontend/js/palette.js:493 |
| `cmdPaletteSaveAsChat` | frontend/js/palette.js:512 |
| `cmdPaletteSources` | frontend/js/palette.js:669 |
| `cmdSourceRow` | frontend/js/palette.js:708 |
| `paletteGoToCategory` | frontend/js/palette.js:1454 |
| `paletteLater` | frontend/js/palette.js:1440 |
| `paletteNotesInHand` | frontend/js/palette.js:1444 |
| `rememberAgentStarter` | frontend/js/palette.js:164 |
| `renderAgentStarters` | frontend/js/palette.js:197 |
| `renderCmdPaletteMenu` | frontend/js/palette.js:555 |
| `syncAgentOpenNoteToggle` | frontend/js/palette.js:336 |
| `toggleAgentPalette` | frontend/js/palette.js:394 |

### frontend/js/bg-art.js (27)

| Name | File:line |
|---|---|
| `bgArtApplyPause` | frontend/js/bg-art.js:1946 |
| `bgArtCovered` | frontend/js/bg-art.js:1964 |
| `bgArtFrameRate` | frontend/js/bg-art.js:1907 |
| `bgArtGenome` | frontend/js/bg-art.js:293 |
| `bgArtHalt` | frontend/js/bg-art.js:2012 |
| `bgArtRetire` | frontend/js/bg-art.js:2002 |
| `bgArtRun` | frontend/js/bg-art.js:2042 |
| `bgArtSeedOf` | frontend/js/bg-art.js:317 |
| `bgArtSeedText` | frontend/js/bg-art.js:354 |
| `bgArtSpeciesName` | frontend/js/bg-art.js:342 |
| `bgArtStrainCount` | frontend/js/bg-art.js:348 |
| `bgArtStrains` | frontend/js/bg-art.js:326 |
| `bgArtSurface` | frontend/js/bg-art.js:1923 |
| `bgArtWatch` | frontend/js/bg-art.js:1984 |
| `bgCapRgb` | frontend/js/bg-art.js:76 |
| `bgClamp` | frontend/js/bg-art.js:235 |
| `bgColourHue` | frontend/js/bg-art.js:183 |
| `bgFlow` | frontend/js/bg-art.js:119 |
| `bgGlowSprite` | frontend/js/bg-art.js:223 |
| `bgGrid` | frontend/js/bg-art.js:254 |
| `bgHslToRgb` | frontend/js/bg-art.js:162 |
| `bgHsla` | frontend/js/bg-art.js:99 |
| `bgLuma` | frontend/js/bg-art.js:71 |
| `bgP5Rgba` | frontend/js/bg-art.js:142 |
| `bgRand` | frontend/js/bg-art.js:132 |
| `bgRandom` | frontend/js/bg-art.js:240 |
| `bgSprite` | frontend/js/bg-art.js:210 |

### frontend/js/settings.js (139)

| Name | File:line |
|---|---|
| `_segActive` | frontend/js/settings.js:2393 |
| `activeAccent` | frontend/js/settings.js:1331 |
| `activeLogContainer` | frontend/js/settings.js:901 |
| `activePalette` | frontend/js/settings.js:2701 |
| `activeThemePreset` | frontend/js/settings.js:1651 |
| `appearancePref` | frontend/js/settings.js:1667 |
| `applyAccent` | frontend/js/settings.js:1353 |
| `applyAppearance` | frontend/js/settings.js:2252 |
| `applyContrast` | frontend/js/settings.js:1405 |
| `applyCustomAccent` | frontend/js/settings.js:2071 |
| `applyCustomCss` | frontend/js/settings.js:2112 |
| `applyCustomCssLegacy` | frontend/js/settings.js:2135 |
| `applyEffectiveAccent` | frontend/js/settings.js:1389 |
| `applyHarmony` | frontend/js/settings.js:1829 |
| `applyPageBackground` | frontend/js/settings.js:2085 |
| `applyResolvedMode` | frontend/js/settings.js:2343 |
| `applySavedTheme` | frontend/js/settings.js:1933 |
| `applyThemeChoice` | frontend/js/settings.js:2363 |
| `applyThemePreset` | frontend/js/settings.js:1686 |
| `bgArtOn` | frontend/js/settings.js:2797 |
| `bgArtRefreshSeed` | frontend/js/settings.js:2792 |
| `bgArtStyle` | frontend/js/settings.js:2811 |
| `browserLogRecords` | frontend/js/settings.js:779 |
| `bumpLogErrorBadge` | frontend/js/settings.js:1014 |
| `clearLogs` | frontend/js/settings.js:1189 |
| `clearManualOverrides` | frontend/js/settings.js:1729 |
| `closeLogs` | frontend/js/settings.js:1146 |
| `closeSettingsModal` | frontend/js/settings.js:698 |
| `collapseLongSettingHints` | frontend/js/settings.js:3601 |
| `contrastOn` | frontend/js/settings.js:1401 |
| `copyLogs` | frontend/js/settings.js:1155 |
| `cssVarNow` | frontend/js/settings.js:2056 |
| `currentAccentHex` | frontend/js/settings.js:1342 |
| `currentLookValues` | frontend/js/settings.js:1888 |
| `currentPageBackground` | frontend/js/settings.js:2096 |
| `deleteSavedTheme` | frontend/js/settings.js:1954 |
| `downloadSupportBundle` | frontend/js/settings.js:1212 |
| `effectiveDensity` | frontend/js/settings.js:2187 |
| `effectiveTheme` | frontend/js/settings.js:2305 |
| `ensureSettingsPaneTitle` | frontend/js/settings.js:74 |
| `filterSettings` | frontend/js/settings.js:645 |
| `focusSettingsHeading` | frontend/js/settings.js:3174 |
| `focusSettingsPane` | frontend/js/settings.js:3166 |
| `harmonyScheme` | frontend/js/settings.js:1809 |
| `hexToHsl` | frontend/js/settings.js:1761 |
| `hexToRgbParts` | frontend/js/settings.js:2061 |
| `hslToHex` | frontend/js/settings.js:1782 |
| `jobDurationWords` | frontend/js/settings.js:4394 |
| `jobLineEl` | frontend/js/settings.js:4455 |
| `jobRunLine` | frontend/js/settings.js:4405 |
| `learnedBulk` | frontend/js/settings.js:3940 |
| `learnedDelete` | frontend/js/settings.js:4116 |
| `learnedEdit` | frontend/js/settings.js:4081 |
| `learnedExport` | frontend/js/settings.js:4156 |
| `learnedForget` | frontend/js/settings.js:4137 |
| `learnedFromYouText` | frontend/js/settings.js:4254 |
| `learnedKindLabel` | frontend/js/settings.js:3801 |
| `learnedReset` | frontend/js/settings.js:4106 |
| `learnedRow` | frontend/js/settings.js:3967 |
| `learnedRunNow` | frontend/js/settings.js:4175 |
| `learnedSetSwitch` | frontend/js/settings.js:3908 |
| `lessTransparencyWanted` | frontend/js/settings.js:2159 |
| `loadChangelog` | frontend/js/settings.js:429 |
| `loadSamplingSettings` | frontend/js/settings.js:3387 |
| `logLevelRank` | frontend/js/settings.js:753 |
| `logMatchesFilters` | frontend/js/settings.js:801 |
| `logRecordText` | frontend/js/settings.js:894 |
| `logRow` | frontend/js/settings.js:823 |
| `logTerminalLineText` | frontend/js/settings.js:958 |
| `logTerminalRow` | frontend/js/settings.js:965 |
| `logTerminalTraceRow` | frontend/js/settings.js:979 |
| `manualOverrides` | frontend/js/settings.js:1723 |
| `measureLabelOptics` | frontend/js/settings.js:2216 |
| `nearLogBottom` | frontend/js/settings.js:905 |
| `noticePerfMode` | frontend/js/settings.js:3348 |
| `openSettingsModal` | frontend/js/settings.js:238 |
| `openTaskLog` | frontend/js/settings.js:3278 |
| `paintIntegrity` | frontend/js/settings.js:461 |
| `paintJobLine` | frontend/js/settings.js:4437 |
| `perfModeOn` | frontend/js/settings.js:2165 |
| `perfModeReason` | frontend/js/settings.js:2174 |
| `placeFoldHelp` | frontend/js/settings.js:4339 |
| `refreshJobRuns` | frontend/js/settings.js:4465 |
| `renderActiveLogView` | frontend/js/settings.js:1001 |
| `renderAppearance` | frontend/js/settings.js:2449 |
| `renderBgMotionHint` | frontend/js/settings.js:2599 |
| `renderBgStyleHint` | frontend/js/settings.js:2584 |
| `renderCopyLogsLabel` | frontend/js/settings.js:1170 |
| `renderCustomThemes` | frontend/js/settings.js:1965 |
| `renderHealthBlock` | frontend/js/settings.js:478 |
| `renderJobOverview` | frontend/js/settings.js:4487 |
| `renderLearned` | frontend/js/settings.js:4275 |
| `renderLearnedFromYou` | frontend/js/settings.js:4266 |
| `renderLearnedList` | frontend/js/settings.js:4041 |
| `renderLearnedSwitches` | frontend/js/settings.js:3805 |
| `renderLogErrorBadge` | frontend/js/settings.js:1020 |
| `renderLogGap` | frontend/js/settings.js:763 |
| `renderLogList` | frontend/js/settings.js:933 |
| `renderLogSharedUI` | frontend/js/settings.js:918 |
| `renderLogTerminal` | frontend/js/settings.js:986 |
| `renderLogs` | frontend/js/settings.js:1120 |
| `renderPaletteGrid` | frontend/js/settings.js:2708 |
| `renderProgressMotionHint` | frontend/js/settings.js:2566 |
| `renderSamplingRows` | frontend/js/settings.js:3394 |
| `renderThemePresets` | frontend/js/settings.js:2399 |
| `renderThemeToggle` | frontend/js/settings.js:2333 |
| `repaintThemeAtOnce` | frontend/js/settings.js:1257 |
| `resetAppearance` | frontend/js/settings.js:2760 |
| `resetThemeOnly` | frontend/js/settings.js:1741 |
| `resolvedTheme` | frontend/js/settings.js:2316 |
| `saveCurrentLook` | frontend/js/settings.js:1906 |
| `savedThemeCard` | frontend/js/settings.js:1999 |
| `savedThemes` | frontend/js/settings.js:1901 |
| `scheduleThemeArt` | frontend/js/settings.js:1273 |
| `scrollLogToBottom` | frontend/js/settings.js:911 |
| `serverLogRecord` | frontend/js/settings.js:788 |
| `setLogLive` | frontend/js/settings.js:1006 |
| `setSettingsPeek` | frontend/js/settings.js:210 |
| `settingsFoldState` | frontend/js/settings.js:4294 |
| `settingsPeekIsOn` | frontend/js/settings.js:222 |
| `settingsScroller` | frontend/js/settings.js:99 |
| `settingsSectionText` | frontend/js/settings.js:617 |
| `showSettingsSection` | frontend/js/settings.js:108 |
| `smallMachine` | frontend/js/settings.js:2152 |
| `sortLogRecords` | frontend/js/settings.js:792 |
| `startBgArt` | frontend/js/settings.js:2816 |
| `startLogStream` | frontend/js/settings.js:1050 |
| `stopBgArt` | frontend/js/settings.js:2801 |
| `stopLogStream` | frontend/js/settings.js:1109 |
| `syncLearnedSelectbar` | frontend/js/settings.js:3928 |
| `taskLogButton` | frontend/js/settings.js:3274 |
| `themeSwatch` | frontend/js/settings.js:1644 |
| `themeValue` | frontend/js/settings.js:1660 |
| `toggleBgArt` | frontend/js/settings.js:2881 |
| `toggleTheme` | frontend/js/settings.js:1285 |
| `updatePeekAvailability` | frontend/js/settings.js:226 |
| `wireFoldHelps` | frontend/js/settings.js:4350 |
| `wireLearnedSection` | frontend/js/settings.js:4209 |
| `wireSettingsFolds` | frontend/js/settings.js:4303 |

### frontend/js/account-recovery.js (16)

| Name | File:line |
|---|---|
| `closeForgotPassword` | frontend/js/account-recovery.js:104 |
| `forgotChoose` | frontend/js/account-recovery.js:41 |
| `forgotError` | frontend/js/account-recovery.js:112 |
| `makeRecoveryKey` | frontend/js/account-recovery.js:344 |
| `offerRecoveryKey` | frontend/js/account-recovery.js:289 |
| `openForgotPassword` | frontend/js/account-recovery.js:89 |
| `recoveryAccountRow` | frontend/js/account-recovery.js:381 |
| `recoveryFields` | frontend/js/account-recovery.js:31 |
| `saveRecoveryKeyFile` | frontend/js/account-recovery.js:213 |
| `showRecoveryKey` | frontend/js/account-recovery.js:268 |
| `showRecoveryOffer` | frontend/js/account-recovery.js:294 |
| `submitPasswordReset` | frontend/js/account-recovery.js:162 |
| `submitRecovery` | frontend/js/account-recovery.js:119 |
| `whenLockLifted` | frontend/js/account-recovery.js:194 |
| `wireForgotCard` | frontend/js/account-recovery.js:55 |
| `wireRecoveryDialog` | frontend/js/account-recovery.js:232 |

### frontend/js/activity-panel.js (10)

| Name | File:line |
|---|---|
| `activityModelLine` | frontend/js/activity-panel.js:28 |
| `activityRow` | frontend/js/activity-panel.js:38 |
| `activityRunningShown` | frontend/js/activity-panel.js:15 |
| `openActivityReport` | frontend/js/activity-panel.js:102 |
| `paintActivity` | frontend/js/activity-panel.js:85 |
| `renderActivity` | frontend/js/activity-panel.js:19 |
| `setActivityTab` | frontend/js/activity-panel.js:155 |
| `stopActivityJob` | frontend/js/activity-panel.js:106 |
| `stopActivityModel` | frontend/js/activity-panel.js:116 |
| `stopAllActivity` | frontend/js/activity-panel.js:127 |

### frontend/js/app-features.js (1)

| Name | File:line |
|---|---|
| `featureCatalog` | frontend/js/app-features.js:11 |

### frontend/js/app-import.js (5)

| Name | File:line |
|---|---|
| `importFromApp` | frontend/js/app-import.js:24 |
| `importReportButton` | frontend/js/app-import.js:73 |
| `importReportCounts` | frontend/js/app-import.js:105 |
| `importReportSection` | frontend/js/app-import.js:79 |
| `openImportReport` | frontend/js/app-import.js:113 |

### frontend/js/app-palette.js (33)

| Name | File:line |
|---|---|
| `closePalette` | frontend/js/app-palette.js:91 |
| `notesPaletteCommands` | frontend/js/app-palette.js:633 |
| `openPalette` | frontend/js/app-palette.js:55 |
| `paletteActRows` | frontend/js/app-palette.js:336 |
| `paletteBase` | frontend/js/app-palette.js:294 |
| `paletteDistance` | frontend/js/app-palette.js:486 |
| `paletteEditorMatches` | frontend/js/app-palette.js:130 |
| `paletteFeature` | frontend/js/app-palette.js:37 |
| `paletteFeatureRows` | frontend/js/app-palette.js:319 |
| `paletteFind` | frontend/js/app-palette.js:510 |
| `paletteFuzzyScore` | frontend/js/app-palette.js:110 |
| `paletteKeydown` | frontend/js/app-palette.js:591 |
| `paletteLight` | frontend/js/app-palette.js:573 |
| `paletteMatches` | frontend/js/app-palette.js:140 |
| `paletteNearest` | frontend/js/app-palette.js:466 |
| `paletteNearestCommand` | frontend/js/app-palette.js:515 |
| `paletteNearestRows` | frontend/js/app-palette.js:501 |
| `palettePick` | frontend/js/app-palette.js:441 |
| `palettePicks` | frontend/js/app-palette.js:437 |
| `palettePool` | frontend/js/app-palette.js:300 |
| `paletteRanked` | frontend/js/app-palette.js:417 |
| `paletteRefresh` | frontend/js/app-palette.js:311 |
| `paletteRun` | frontend/js/app-palette.js:44 |
| `paletteScore` | frontend/js/app-palette.js:404 |
| `paletteSettingRows` | frontend/js/app-palette.js:371 |
| `paletteStartAct` | frontend/js/app-palette.js:358 |
| `paletteTarget` | frontend/js/app-palette.js:305 |
| `paletteText` | frontend/js/app-palette.js:101 |
| `paletteWhy` | frontend/js/app-palette.js:455 |
| `paletteWords` | frontend/js/app-palette.js:394 |
| `renderPalette` | frontend/js/app-palette.js:526 |
| `scrollPaletteToActive` | frontend/js/app-palette.js:618 |
| `utilityPaletteRows` | frontend/js/app-palette.js:212 |

### frontend/js/ask-chart.js (8)

| Name | File:line |
|---|---|
| `askChartLabel` | frontend/js/ask-chart.js:36 |
| `askChartPng` | frontend/js/ask-chart.js:126 |
| `askChartSvg` | frontend/js/ask-chart.js:47 |
| `askChartSvgEl` | frontend/js/ask-chart.js:23 |
| `askChartTable` | frontend/js/ask-chart.js:98 |
| `askChartTicks` | frontend/js/ask-chart.js:30 |
| `drawAskChart` | frontend/js/ask-chart.js:185 |
| `renderAskChart` | frontend/js/ask-chart.js:169 |

### frontend/js/ask-compose.js (7)

| Name | File:line |
|---|---|
| `askAnswerFrom` | frontend/js/ask-compose.js:29 |
| `linkCitedTitles` | frontend/js/ask-compose.js:78 |
| `markSaidSentences` | frontend/js/ask-compose.js:139 |
| `renderActCard` | frontend/js/ask-compose.js:169 |
| `renderAskUseAi` | frontend/js/ask-compose.js:34 |
| `renderWebSources` | frontend/js/ask-compose.js:235 |
| `wireAskUseAi` | frontend/js/ask-compose.js:46 |

### frontend/js/ask-history.js (9)

| Name | File:line |
|---|---|
| `askAgainMenu` | frontend/js/ask-history.js:244 |
| `askHistoryRow` | frontend/js/ask-history.js:8 |
| `clearAskHistory` | frontend/js/ask-history.js:267 |
| `deleteAskHistoryTurn` | frontend/js/ask-history.js:226 |
| `forgetRecentQuestion` | frontend/js/ask-history.js:256 |
| `loadAskHistoryPage` | frontend/js/ask-history.js:76 |
| `toggleAskHistoryPanel` | frontend/js/ask-history.js:96 |
| `toggleAskHistoryPin` | frontend/js/ask-history.js:218 |
| `viewAskHistoryTurn` | frontend/js/ask-history.js:106 |

### frontend/js/assistant-avatar.js (2)

| Name | File:line |
|---|---|
| `assistantEmblemInto` | frontend/js/assistant-avatar.js:46 |
| `assistantEmblemShot` | frontend/js/assistant-avatar.js:22 |

### frontend/js/atlas-life.js (16)

| Name | File:line |
|---|---|
| `atlasBreathFrame` | frontend/js/atlas-life.js:529 |
| `atlasPropLoops` | frontend/js/atlas-life.js:461 |
| `atlasPropsFrame` | frontend/js/atlas-life.js:485 |
| `atlasRigLower` | frontend/js/atlas-life.js:623 |
| `atlasRigLowerAttach` | frontend/js/atlas-life.js:600 |
| `atlasRingLoops` | frontend/js/atlas-life.js:20 |
| `atlasTailAttach` | frontend/js/atlas-life.js:154 |
| `atlasTailBend` | frontend/js/atlas-life.js:105 |
| `atlasTailCalm` | frontend/js/atlas-life.js:344 |
| `atlasTailDraw` | frontend/js/atlas-life.js:388 |
| `atlasTailFrame` | frontend/js/atlas-life.js:253 |
| `atlasTailPaths` | frontend/js/atlas-life.js:140 |
| `atlasTailPick` | frontend/js/atlas-life.js:228 |
| `atlasTailRest` | frontend/js/atlas-life.js:364 |
| `atlasTailShape` | frontend/js/atlas-life.js:115 |
| `atlasTailUnrest` | frontend/js/atlas-life.js:378 |

### frontend/js/atlas-motion.js (12)

| Name | File:line |
|---|---|
| `atlasBlink` | frontend/js/atlas-motion.js:11 |
| `atlasBlinkMay` | frontend/js/atlas-motion.js:30 |
| `atlasBlinkStart` | frontend/js/atlas-motion.js:58 |
| `atlasBlinkTick` | frontend/js/atlas-motion.js:45 |
| `atlasLowerState` | frontend/js/atlas-motion.js:91 |
| `atlasMotionOK` | frontend/js/atlas-motion.js:109 |
| `atlasRigAttach` | frontend/js/atlas-motion.js:116 |
| `atlasRigFrame` | frontend/js/atlas-motion.js:217 |
| `atlasRigGesture` | frontend/js/atlas-motion.js:168 |
| `atlasRigRead` | frontend/js/atlas-motion.js:150 |
| `atlasRigSpring` | frontend/js/atlas-motion.js:188 |
| `atlasRigWake` | frontend/js/atlas-motion.js:201 |

### frontend/js/attach-to.js (4)

| Name | File:line |
|---|---|
| `notePickerRows` | frontend/js/attach-to.js:206 |
| `renderAttachToBoard` | frontend/js/attach-to.js:19 |
| `renderAttachToDocument` | frontend/js/attach-to.js:111 |
| `renderNotePickerList` | frontend/js/attach-to.js:261 |

### frontend/js/attachment-actions.js (6)

| Name | File:line |
|---|---|
| `attachmentAction` | frontend/js/attachment-actions.js:237 |
| `attachmentBlob` | frontend/js/attachment-actions.js:35 |
| `attachmentFileId` | frontend/js/attachment-actions.js:29 |
| `attachmentLabel` | frontend/js/attachment-actions.js:25 |
| `attachmentPlayer` | frontend/js/attachment-actions.js:47 |
| `attachmentUpload` | frontend/js/attachment-actions.js:17 |

### frontend/js/batch-space.js (3)

| Name | File:line |
|---|---|
| `batchMoveToSpace` | frontend/js/batch-space.js:43 |
| `batchSpaceRequest` | frontend/js/batch-space.js:13 |
| `pickSpaceDialog` | frontend/js/batch-space.js:21 |

### frontend/js/captions.js (9)

| Name | File:line |
|---|---|
| `captionDecimate` | frontend/js/captions.js:47 |
| `captionPaint` | frontend/js/captions.js:66 |
| `captionRelease` | frontend/js/captions.js:177 |
| `captionRunMerge` | frontend/js/captions.js:125 |
| `captionSendNext` | frontend/js/captions.js:76 |
| `captionsText` | frontend/js/captions.js:39 |
| `startLiveCaptions` | frontend/js/captions.js:132 |
| `stopLiveCaptions` | frontend/js/captions.js:185 |
| `toggleLiveCaptions` | frontend/js/captions.js:205 |

### frontend/js/categories-panel.js (27)

| Name | File:line |
|---|---|
| `categoryColourName` | frontend/js/categories-panel.js:944 |
| `chooseCategorySheet` | frontend/js/categories-panel.js:556 |
| `chooseNoteCategory` | frontend/js/categories-panel.js:860 |
| `colourCategoriesFromPanel` | frontend/js/categories-panel.js:459 |
| `createCategoryFromPanel` | frontend/js/categories-panel.js:542 |
| `deleteCategoriesFromPanel` | frontend/js/categories-panel.js:420 |
| `deleteCategory` | frontend/js/categories-panel.js:809 |
| `deleteCategoryFromPanel` | frontend/js/categories-panel.js:607 |
| `drawCategoryTidy` | frontend/js/categories-panel.js:275 |
| `drawManageCategoryFooter` | frontend/js/categories-panel.js:389 |
| `drawManageCategoryRows` | frontend/js/categories-panel.js:171 |
| `dropEmptyCategory` | frontend/js/categories-panel.js:927 |
| `manageCatHead` | frontend/js/categories-panel.js:145 |
| `mergeCategoriesFromPanel` | frontend/js/categories-panel.js:507 |
| `mergeCategoryFromPanel` | frontend/js/categories-panel.js:589 |
| `moveNotesToCategory` | frontend/js/categories-panel.js:901 |
| `offerCategoryUndo` | frontend/js/categories-panel.js:1039 |
| `openManageCategories` | frontend/js/categories-panel.js:19 |
| `pickCategoryColour` | frontend/js/categories-panel.js:999 |
| `refreshAfterCategoryChange` | frontend/js/categories-panel.js:1049 |
| `renameCategory` | frontend/js/categories-panel.js:759 |
| `restoreCategoryMoves` | frontend/js/categories-panel.js:838 |
| `saveCategoryColour` | frontend/js/categories-panel.js:991 |
| `showCategoryNotes` | frontend/js/categories-panel.js:330 |
| `splitCategoryFromPanel` | frontend/js/categories-panel.js:635 |
| `swatchPicker` | frontend/js/categories-panel.js:946 |
| `wireManageCategoryKeys` | frontend/js/categories-panel.js:351 |

### frontend/js/chat-edit.js (2)

| Name | File:line |
|---|---|
| `editAndResend` | frontend/js/chat-edit.js:19 |
| `showCopyFallback` | frontend/js/chat-edit.js:104 |

### frontend/js/chat-undo.js (8)

| Name | File:line |
|---|---|
| `chatArchiveUndo` | frontend/js/chat-undo.js:30 |
| `chatDocumentUndo` | frontend/js/chat-undo.js:48 |
| `chatForkUndo` | frontend/js/chat-undo.js:36 |
| `chatPinUndo` | frontend/js/chat-undo.js:25 |
| `chatPut` | frontend/js/chat-undo.js:13 |
| `chatRepaint` | frontend/js/chat-undo.js:6 |
| `chatTitleUndo` | frontend/js/chat-undo.js:17 |
| `chatTurnUndo` | frontend/js/chat-undo.js:59 |

### frontend/js/chip-menus.js (3)

| Name | File:line |
|---|---|
| `openCategoryChipMenu` | frontend/js/chip-menus.js:55 |
| `openChipMenu` | frontend/js/chip-menus.js:28 |
| `openTagChipMenu` | frontend/js/chip-menus.js:70 |

### frontend/js/chord-guide.js (4)

| Name | File:line |
|---|---|
| `chordGuideEl` | frontend/js/chord-guide.js:23 |
| `chordGuideGroup` | frontend/js/chord-guide.js:43 |
| `chordGuideKey` | frontend/js/chord-guide.js:76 |
| `showTabJumpHint` | frontend/js/chord-guide.js:83 |

### frontend/js/companion-menu.js (2)

| Name | File:line |
|---|---|
| `nameMarkBuddyMenu` | frontend/js/companion-menu.js:165 |
| `openNameMarkViewer` | frontend/js/companion-menu.js:30 |

### frontend/js/connections.js (6)

| Name | File:line |
|---|---|
| `buildConnectionGroups` | frontend/js/connections.js:159 |
| `connectionRowCues` | frontend/js/connections.js:53 |
| `connectionRowEl` | frontend/js/connections.js:131 |
| `linkNoteMention` | frontend/js/connections.js:110 |
| `openConnections` | frontend/js/connections.js:11 |
| `withBacklinks` | frontend/js/connections.js:100 |

### frontend/js/dash-boards.js (4)

| Name | File:line |
|---|---|
| `dashBoardThumb` | frontend/js/dash-boards.js:136 |
| `dashMapFeature` | frontend/js/dash-boards.js:30 |
| `dashMapFeatureHeight` | frontend/js/dash-boards.js:20 |
| `dashRenderBoards` | frontend/js/dash-boards.js:62 |

### frontend/js/date-field.js (3)

| Name | File:line |
|---|---|
| `dateFieldKey` | frontend/js/date-field.js:10 |
| `dateFieldShift` | frontend/js/date-field.js:11 |
| `dateFieldWire` | frontend/js/date-field.js:13 |

### frontend/js/documents-code.js (158)

| Name | File:line |
|---|---|
| `DOC_CSS_COLORS` | frontend/js/documents-code.js:728 |
| `docApplyCodeFix` | frontend/js/documents-code.js:5742 |
| `docBalanceRange` | frontend/js/documents-code.js:1012 |
| `docBeautifyText` | frontend/js/documents-code.js:1428 |
| `docBracketColours` | frontend/js/documents-code.js:2086 |
| `docBracketDepths` | frontend/js/documents-code.js:2069 |
| `docCmSyncCodeTools` | frontend/js/documents-code.js:677 |
| `docCodeActions` | frontend/js/documents-code.js:5757 |
| `docCodeCompletionData` | frontend/js/documents-code.js:636 |
| `docCodeCompletionSource` | frontend/js/documents-code.js:607 |
| `docCodeEditing` | frontend/js/documents-code.js:5494 |
| `docCodeFixNow` | frontend/js/documents-code.js:5724 |
| `docCodeFixes` | frontend/js/documents-code.js:5219 |
| `docCodeIndentAt` | frontend/js/documents-code.js:5479 |
| `docCodeIndentLevel` | frontend/js/documents-code.js:4767 |
| `docCodeInsertPoint` | frontend/js/documents-code.js:5210 |
| `docCodeInsertPointForString` | frontend/js/documents-code.js:5297 |
| `docCodeLastCodeBefore` | frontend/js/documents-code.js:5280 |
| `docCodeLineOf` | frontend/js/documents-code.js:4756 |
| `docCodeLintSource` | frontend/js/documents-code.js:340 |
| `docCodePairs` | frontend/js/documents-code.js:5468 |
| `docCodeProblemMessage` | frontend/js/documents-code.js:4782 |
| `docCodeProfile` | frontend/js/documents-code.js:4241 |
| `docCodeScan` | frontend/js/documents-code.js:4329 |
| `docCodeSnippetOptions` | frontend/js/documents-code.js:577 |
| `docCodeSymbols` | frontend/js/documents-code.js:2128 |
| `docCodeTools` | frontend/js/documents-code.js:647 |
| `docColorAt` | frontend/js/documents-code.js:1827 |
| `docColorSwatches` | frontend/js/documents-code.js:1867 |
| `docCompleteTab` | frontend/js/documents-code.js:1688 |
| `docCompletionExtras` | frontend/js/documents-code.js:4175 |
| `docConsoleEval` | frontend/js/documents-code.js:3429 |
| `docConsoleKey` | frontend/js/documents-code.js:3495 |
| `docConsoleLang` | frontend/js/documents-code.js:3421 |
| `docConsoleMessage` | frontend/js/documents-code.js:3475 |
| `docCssColorFormat` | frontend/js/documents-code.js:1103 |
| `docCssCompletionSource` | frontend/js/documents-code.js:1644 |
| `docCssInBlock` | frontend/js/documents-code.js:1484 |
| `docCssPropertyApply` | frontend/js/documents-code.js:1626 |
| `docCssSources` | frontend/js/documents-code.js:1680 |
| `docCssValueContext` | frontend/js/documents-code.js:935 |
| `docCssValueOptions` | frontend/js/documents-code.js:976 |
| `docCssValueTable` | frontend/js/documents-code.js:947 |
| `docDebugAct` | frontend/js/documents-code.js:2628 |
| `docDebugBegin` | frontend/js/documents-code.js:2598 |
| `docDebugBreakMenu` | frontend/js/documents-code.js:2802 |
| `docDebugBreaks` | frontend/js/documents-code.js:2666 |
| `docDebugEmpty` | frontend/js/documents-code.js:2931 |
| `docDebugEnded` | frontend/js/documents-code.js:2616 |
| `docDebugExtension` | frontend/js/documents-code.js:2686 |
| `docDebugHere` | frontend/js/documents-code.js:2828 |
| `docDebugKey` | frontend/js/documents-code.js:2656 |
| `docDebugLineButton` | frontend/js/documents-code.js:2939 |
| `docDebugOn` | frontend/js/documents-code.js:2567 |
| `docDebugRemoveButton` | frontend/js/documents-code.js:2952 |
| `docDebugRender` | frontend/js/documents-code.js:2968 |
| `docDebugStopped` | frontend/js/documents-code.js:2585 |
| `docDebugToggleAt` | frontend/js/documents-code.js:2781 |
| `docDebugToggleHere` | frontend/js/documents-code.js:2795 |
| `docDebugValueRow` | frontend/js/documents-code.js:2917 |
| `docDebugView` | frontend/js/documents-code.js:2841 |
| `docDefinitionsOf` | frontend/js/documents-code.js:2363 |
| `docDiagnosticRange` | frontend/js/documents-code.js:82 |
| `docEmmetAt` | frontend/js/documents-code.js:872 |
| `docEmmetBalance` | frontend/js/documents-code.js:1607 |
| `docEmmetExpandAtCaret` | frontend/js/documents-code.js:1544 |
| `docEmmetExpansion` | frontend/js/documents-code.js:907 |
| `docEmmetInfo` | frontend/js/documents-code.js:1507 |
| `docEmmetIntended` | frontend/js/documents-code.js:833 |
| `docEmmetMarkupSyntax` | frontend/js/documents-code.js:1556 |
| `docEmmetMatch` | frontend/js/documents-code.js:1493 |
| `docEmmetPlace` | frontend/js/documents-code.js:1476 |
| `docEmmetSnippets` | frontend/js/documents-code.js:816 |
| `docEmmetSource` | frontend/js/documents-code.js:1519 |
| `docEmmetWrap` | frontend/js/documents-code.js:1569 |
| `docEmmetWrapText` | frontend/js/documents-code.js:1033 |
| `docFindInDocuments` | frontend/js/documents-code.js:2454 |
| `docFormatChanges` | frontend/js/documents-code.js:5599 |
| `docFormatCode` | frontend/js/documents-code.js:5623 |
| `docFormatCodeText` | frontend/js/documents-code.js:4819 |
| `docFormatJsonText` | frontend/js/documents-code.js:5136 |
| `docFormatMarkupText` | frontend/js/documents-code.js:4899 |
| `docFormatRemoteRefusal` | frontend/js/documents-code.js:5578 |
| `docFormatTreeRefusal` | frontend/js/documents-code.js:5564 |
| `docGhostPlugin` | frontend/js/documents-code.js:1700 |
| `docGhostSuffix` | frontend/js/documents-code.js:994 |
| `docGoToDefinition` | frontend/js/documents-code.js:2407 |
| `docHoverDocs` | frontend/js/documents-code.js:1944 |
| `docHoverLine` | frontend/js/documents-code.js:1352 |
| `docHtmlDiagnostics` | frontend/js/documents-code.js:270 |
| `docHtmlTextAt` | frontend/js/documents-code.js:1450 |
| `docIndentGuides` | frontend/js/documents-code.js:2008 |
| `docIndentMixFixes` | frontend/js/documents-code.js:5383 |
| `docIndentSteps` | frontend/js/documents-code.js:1989 |
| `docJsonDiagnostics` | frontend/js/documents-code.js:221 |
| `docJsonErrorAt` | frontend/js/documents-code.js:103 |
| `docJsonFixes` | frontend/js/documents-code.js:5307 |
| `docJsxChildAt` | frontend/js/documents-code.js:1461 |
| `docLoadBeautify` | frontend/js/documents-code.js:1409 |
| `docLoadEmmet` | frontend/js/documents-code.js:1383 |
| `docNativeSnippets` | frontend/js/documents-code.js:591 |
| `docOpenCodeFixes` | frontend/js/documents-code.js:5772 |
| `docOpenSymbols` | frontend/js/documents-code.js:4154 |
| `docPanelChord` | frontend/js/documents-code.js:3376 |
| `docPanelToggle` | frontend/js/documents-code.js:3360 |
| `docPickDefinition` | frontend/js/documents-code.js:2396 |
| `docProblemsRender` | frontend/js/documents-code.js:3397 |
| `docPythonColonFix` | frontend/js/documents-code.js:5360 |
| `docPythonDefines` | frontend/js/documents-code.js:2352 |
| `docReferencesOf` | frontend/js/documents-code.js:2328 |
| `docRemoteDiagnostics` | frontend/js/documents-code.js:300 |
| `docRgbToHex` | frontend/js/documents-code.js:1093 |
| `docRunAfterSave` | frontend/js/documents-code.js:3551 |
| `docRunArmTimeout` | frontend/js/documents-code.js:3885 |
| `docRunAsk` | frontend/js/documents-code.js:3798 |
| `docRunCell` | frontend/js/documents-code.js:4028 |
| `docRunClear` | frontend/js/documents-code.js:3632 |
| `docRunClearTab` | frontend/js/documents-code.js:3386 |
| `docRunClose` | frontend/js/documents-code.js:3859 |
| `docRunCode` | frontend/js/documents-code.js:3900 |
| `docRunExtension` | frontend/js/documents-code.js:3558 |
| `docRunJobArm` | frontend/js/documents-code.js:3600 |
| `docRunJobCall` | frontend/js/documents-code.js:3593 |
| `docRunJobEnd` | frontend/js/documents-code.js:3623 |
| `docRunLiveOn` | frontend/js/documents-code.js:3529 |
| `docRunLiveSchedule` | frontend/js/documents-code.js:3542 |
| `docRunOpenPythonExtra` | frontend/js/documents-code.js:2546 |
| `docRunPanel` | frontend/js/documents-code.js:3090 |
| `docRunPythonMissing` | frontend/js/documents-code.js:3867 |
| `docRunPythonReady` | frontend/js/documents-code.js:2523 |
| `docRunRow` | frontend/js/documents-code.js:3641 |
| `docRunSelection` | frontend/js/documents-code.js:4017 |
| `docRunSend` | frontend/js/documents-code.js:3839 |
| `docRunSetLive` | frontend/js/documents-code.js:3533 |
| `docRunSetStatus` | frontend/js/documents-code.js:3578 |
| `docRunShowStdin` | frontend/js/documents-code.js:3519 |
| `docRunShowTab` | frontend/js/documents-code.js:3340 |
| `docRunShowTestMarks` | frontend/js/documents-code.js:3784 |
| `docRunStop` | frontend/js/documents-code.js:3848 |
| `docRunSyncAvailability` | frontend/js/documents-code.js:2532 |
| `docRunTable` | frontend/js/documents-code.js:3681 |
| `docRunTestDiagnostics` | frontend/js/documents-code.js:3750 |
| `docRunTestRow` | frontend/js/documents-code.js:3719 |
| `docRunTestsDone` | frontend/js/documents-code.js:3763 |
| `docRunnable` | frontend/js/documents-code.js:2516 |
| `docShowReferences` | frontend/js/documents-code.js:2428 |
| `docStickyHeaders` | frontend/js/documents-code.js:2201 |
| `docStickyScroll` | frontend/js/documents-code.js:2218 |
| `docTagLink` | frontend/js/documents-code.js:1758 |
| `docTagRename` | frontend/js/documents-code.js:1044 |
| `docTreeDiagnostics` | frontend/js/documents-code.js:244 |
| `docTreeHasJsx` | frontend/js/documents-code.js:5549 |
| `docWordAt` | frontend/js/documents-code.js:2317 |
| `docXmlAutoClose` | frontend/js/documents-code.js:1793 |
| `docXmlOpenedBy` | frontend/js/documents-code.js:1067 |
| `docXmlTextAt` | frontend/js/documents-code.js:1471 |
| `docXmlUnclosed` | frontend/js/documents-code.js:1074 |
| `docYamlBlockLines` | frontend/js/documents-code.js:5109 |

### frontend/js/documents-ide.js (28)

| Name | File:line |
|---|---|
| `docIdeChunks` | frontend/js/documents-ide.js:85 |
| `docIdeCloseKeys` | frontend/js/documents-ide.js:597 |
| `docIdeCloseSplit` | frontend/js/documents-ide.js:415 |
| `docIdeCodeView` | frontend/js/documents-ide.js:100 |
| `docIdeCompareMenu` | frontend/js/documents-ide.js:129 |
| `docIdeCompareWith` | frontend/js/documents-ide.js:156 |
| `docIdeExtensions` | frontend/js/documents-ide.js:25 |
| `docIdeFoldAll` | frontend/js/documents-ide.js:104 |
| `docIdeKeydown` | frontend/js/documents-ide.js:308 |
| `docIdeKeysOverlay` | frontend/js/documents-ide.js:452 |
| `docIdeOpenKeys` | frontend/js/documents-ide.js:585 |
| `docIdeOpenPalette` | frontend/js/documents-ide.js:344 |
| `docIdeProblems` | frontend/js/documents-ide.js:113 |
| `docIdeReconfigure` | frontend/js/documents-ide.js:77 |
| `docIdeRenderKeys` | frontend/js/documents-ide.js:528 |
| `docIdeRevertAtCaret` | frontend/js/documents-ide.js:175 |
| `docIdeRevertSpec` | frontend/js/documents-ide.js:93 |
| `docIdeRunApply` | frontend/js/documents-ide.js:229 |
| `docIdeRunGrip` | frontend/js/documents-ide.js:241 |
| `docIdeRunHeights` | frontend/js/documents-ide.js:204 |
| `docIdeRunSaveHeight` | frontend/js/documents-ide.js:215 |
| `docIdeRunSavedHeight` | frontend/js/documents-ide.js:224 |
| `docIdeSlot` | frontend/js/documents-ide.js:33 |
| `docIdeSplitFollow` | frontend/js/documents-ide.js:431 |
| `docIdeStopCompare` | frontend/js/documents-ide.js:167 |
| `docIdeToggleMinimap` | frontend/js/documents-ide.js:117 |
| `docIdeToggleSplit` | frontend/js/documents-ide.js:357 |
| `formatDocHistoryWhen` | frontend/js/documents-ide.js:151 |

### frontend/js/documents-prose.js (62)

| Name | File:line |
|---|---|
| `docAccessFindings` | frontend/js/documents-prose.js:630 |
| `docEmojiList` | frontend/js/documents-prose.js:1374 |
| `docEmojiMatches` | frontend/js/documents-prose.js:1387 |
| `docFillDate` | frontend/js/documents-prose.js:1247 |
| `docFillGhost` | frontend/js/documents-prose.js:1493 |
| `docFillOptions` | frontend/js/documents-prose.js:1427 |
| `docFillSig` | frontend/js/documents-prose.js:1304 |
| `docFillTable` | frontend/js/documents-prose.js:1264 |
| `docFillToc` | frontend/js/documents-prose.js:1278 |
| `docFillToken` | frontend/js/documents-prose.js:1408 |
| `docGrammarAsk` | frontend/js/documents-prose.js:76 |
| `docGrammarEnabled` | frontend/js/documents-prose.js:59 |
| `docGrammarFail` | frontend/js/documents-prose.js:65 |
| `docGrammarFindings` | frontend/js/documents-prose.js:140 |
| `docGrammarMessage` | frontend/js/documents-prose.js:115 |
| `docGrammarOutside` | frontend/js/documents-prose.js:129 |
| `docGrammarRequest` | frontend/js/documents-prose.js:203 |
| `docInCodeAt` | frontend/js/documents-prose.js:1631 |
| `docIsoDay` | frontend/js/documents-prose.js:1237 |
| `docListEnter` | frontend/js/documents-prose.js:1603 |
| `docLorem` | frontend/js/documents-prose.js:1225 |
| `docPairBackspace` | frontend/js/documents-prose.js:1588 |
| `docPairInput` | frontend/js/documents-prose.js:1548 |
| `docProseExtras` | frontend/js/documents-prose.js:218 |
| `docProseFillExtensions` | frontend/js/documents-prose.js:1797 |
| `docProseFillOn` | frontend/js/documents-prose.js:1617 |
| `docProseGhostPlugin` | frontend/js/documents-prose.js:1712 |
| `docProseGhostSet` | frontend/js/documents-prose.js:1697 |
| `docProseInputHandler` | frontend/js/documents-prose.js:1645 |
| `docProsePairKeymap` | frontend/js/documents-prose.js:1758 |
| `docProseRemap` | frontend/js/documents-prose.js:174 |
| `docProseToolExtensions` | frontend/js/documents-prose.js:1160 |
| `docReadAloudExtension` | frontend/js/documents-prose.js:1116 |
| `docReadAloudNext` | frontend/js/documents-prose.js:1045 |
| `docReadAloudSentences` | frontend/js/documents-prose.js:972 |
| `docReadAloudStart` | frontend/js/documents-prose.js:1025 |
| `docReadAloudStop` | frontend/js/documents-prose.js:1094 |
| `docReadAloudVoice` | frontend/js/documents-prose.js:1009 |
| `docSmartPunct` | frontend/js/documents-prose.js:1510 |
| `docSmartPunctOn` | frontend/js/documents-prose.js:1624 |
| `docSpeakable` | frontend/js/documents-prose.js:952 |
| `docSuggestActive` | frontend/js/documents-prose.js:706 |
| `docSuggestAll` | frontend/js/documents-prose.js:875 |
| `docSuggestApply` | frontend/js/documents-prose.js:833 |
| `docSuggestCodeMask` | frontend/js/documents-prose.js:386 |
| `docSuggestEdit` | frontend/js/documents-prose.js:460 |
| `docSuggestExtensions` | frontend/js/documents-prose.js:739 |
| `docSuggestFindingFor` | frontend/js/documents-prose.js:572 |
| `docSuggestForRead` | frontend/js/documents-prose.js:554 |
| `docSuggestMenu` | frontend/js/documents-prose.js:844 |
| `docSuggestMenuItems` | frontend/js/documents-prose.js:591 |
| `docSuggestModes` | frontend/js/documents-prose.js:698 |
| `docSuggestNext` | frontend/js/documents-prose.js:890 |
| `docSuggestNormalize` | frontend/js/documents-prose.js:424 |
| `docSuggestParse` | frontend/js/documents-prose.js:404 |
| `docSuggestResolve` | frontend/js/documents-prose.js:536 |
| `docSuggestResolveAll` | frontend/js/documents-prose.js:542 |
| `noteGrammarMenu` | frontend/js/documents-prose.js:334 |
| `noteGrammarPlugin` | frontend/js/documents-prose.js:253 |
| `renderDocReadAloudState` | frontend/js/documents-prose.js:1102 |
| `renderDocSuggestState` | frontend/js/documents-prose.js:906 |
| `setDocSuggestMode` | frontend/js/documents-prose.js:711 |

### frontend/js/documents-word.js (11)

| Name | File:line |
|---|---|
| `docWordBlob` | frontend/js/documents-word.js:130 |
| `docWordBlocks` | frontend/js/documents-word.js:242 |
| `docWordExport` | frontend/js/documents-word.js:163 |
| `docWordImport` | frontend/js/documents-word.js:59 |
| `docWordLib` | frontend/js/documents-word.js:22 |
| `docWordListShape` | frontend/js/documents-word.js:225 |
| `docWordMarkSuggestions` | frontend/js/documents-word.js:79 |
| `docWordPicture` | frontend/js/documents-word.js:95 |
| `docWordRuns` | frontend/js/documents-word.js:194 |
| `docWordText` | frontend/js/documents-word.js:178 |
| `docWordUploadPicture` | frontend/js/documents-word.js:42 |

### frontend/js/documents.js (580)

| Name | File:line |
|---|---|
| `acceptDocAiEdit` | frontend/js/documents.js:11349 |
| `applyDocComplete` | frontend/js/documents.js:16463 |
| `applyDocDim` | frontend/js/documents.js:13493 |
| `applyDocGutter` | frontend/js/documents.js:14245 |
| `applyDocProseDock` | frontend/js/documents.js:17368 |
| `applyDocSerif` | frontend/js/documents.js:13530 |
| `applyDocToolbarCollapsed` | frontend/js/documents.js:14314 |
| `applyDocToolbarLayoutButtons` | frontend/js/documents.js:14488 |
| `applyDocToolbarMode` | frontend/js/documents.js:14142 |
| `applyDocTypewriter` | frontend/js/documents.js:13510 |
| `applyDocWidth` | frontend/js/documents.js:13365 |
| `applyMarkdown` | frontend/js/documents.js:9917 |
| `archiveDocumentWithUndo` | frontend/js/documents.js:10892 |
| `asSurface` | frontend/js/documents.js:629 |
| `attachBookmarkToDocument` | frontend/js/documents.js:1432 |
| `calloutMenuItems` | frontend/js/documents.js:21332 |
| `chooseDocTemplate` | frontend/js/documents.js:1643 |
| `clearInlineFormatting` | frontend/js/documents.js:10117 |
| `closeDocAiPanel` | frontend/js/documents.js:11227 |
| `closeDocProsePanel` | frontend/js/documents.js:15839 |
| `closeDocSuggest` | frontend/js/documents.js:17606 |
| `cmSurface` | frontend/js/documents.js:467 |
| `createDocument` | frontend/js/documents.js:1615 |
| `deleteCurrentDocument` | frontend/js/documents.js:11015 |
| `deleteDocumentWithUndo` | frontend/js/documents.js:10846 |
| `docActiveBox` | frontend/js/documents.js:14783 |
| `docAfterFirstPaint` | frontend/js/documents.js:901 |
| `docAiCheckStatus` | frontend/js/documents.js:18508 |
| `docAiDiffTarget` | frontend/js/documents.js:11079 |
| `docAiDiscussInChat` | frontend/js/documents.js:18349 |
| `docAiDismiss` | frontend/js/documents.js:18420 |
| `docAiFindings` | frontend/js/documents.js:18398 |
| `docAiResultEdited` | frontend/js/documents.js:11142 |
| `docAiReview` | frontend/js/documents.js:18425 |
| `docAiVerb` | frontend/js/documents.js:11033 |
| `docAiVerbChanged` | frontend/js/documents.js:11198 |
| `docAiVerbIcon` | frontend/js/documents.js:11412 |
| `docAnnotateSelection` | frontend/js/documents.js:6724 |
| `docAppendRendered` | frontend/js/documents.js:3447 |
| `docApplyImageOptions` | frontend/js/documents.js:9273 |
| `docApplyPrintSetup` | frontend/js/documents.js:10684 |
| `docAutocorrectAt` | frontend/js/documents.js:16537 |
| `docAutocorrectEnabled` | frontend/js/documents.js:16528 |
| `docBacklinkItem` | frontend/js/documents.js:1286 |
| `docBlockBarClose` | frontend/js/documents.js:20975 |
| `docBlockBarEl` | frontend/js/documents.js:20956 |
| `docBlockBarShow` | frontend/js/documents.js:21004 |
| `docBlockBarSoon` | frontend/js/documents.js:20970 |
| `docBlockBounds` | frontend/js/documents.js:6091 |
| `docBlockDelete` | frontend/js/documents.js:21057 |
| `docBlockDocumentText` | frontend/js/documents.js:6260 |
| `docBlockEdit` | frontend/js/documents.js:21044 |
| `docBlockEnsureIdEdits` | frontend/js/documents.js:6178 |
| `docBlockFind` | frontend/js/documents.js:6206 |
| `docBlockIdOf` | frontend/js/documents.js:6130 |
| `docBlockIds` | frontend/js/documents.js:6143 |
| `docBlockInFence` | frontend/js/documents.js:6077 |
| `docBlockLines` | frontend/js/documents.js:20983 |
| `docBlockNewId` | frontend/js/documents.js:6158 |
| `docBlockRefAtCaret` | frontend/js/documents.js:6270 |
| `docBlockRefSplit` | frontend/js/documents.js:6062 |
| `docBlockStripIds` | frontend/js/documents.js:6237 |
| `docBookmarkWithUndo` | frontend/js/documents.js:10957 |
| `docBoxEl` | frontend/js/documents.js:376 |
| `docBuildVocabulary` | frontend/js/documents.js:16272 |
| `docCalloutFold` | frontend/js/documents.js:20871 |
| `docCalloutFoldRange` | frontend/js/documents.js:20860 |
| `docCalloutFolded` | frontend/js/documents.js:20881 |
| `docCalloutKindMenu` | frontend/js/documents.js:21100 |
| `docCanOutdent` | frontend/js/documents.js:3842 |
| `docCaretLine` | frontend/js/documents.js:2221 |
| `docCaretPoint` | frontend/js/documents.js:14856 |
| `docCaretStats` | frontend/js/documents.js:14873 |
| `docCaretVisibleLine` | frontend/js/documents.js:3106 |
| `docCmApplySpellcheck` | frontend/js/documents.js:20398 |
| `docCmDrawFor` | frontend/js/documents.js:20643 |
| `docCmExtensions` | frontend/js/documents.js:20273 |
| `docCmGutter` | frontend/js/documents.js:20743 |
| `docCmHighlight` | frontend/js/documents.js:20094 |
| `docCmIsolate` | frontend/js/documents.js:18748 |
| `docCmKeymap` | frontend/js/documents.js:20151 |
| `docCmLanguageFor` | frontend/js/documents.js:18898 |
| `docCmPartIs` | frontend/js/documents.js:7027 |
| `docCmRepaintFindings` | frontend/js/documents.js:20531 |
| `docCmSpellcheck` | frontend/js/documents.js:20388 |
| `docCmSyncFileType` | frontend/js/documents.js:20678 |
| `docCmSyncGutter` | frontend/js/documents.js:20729 |
| `docCmSyncLanguage` | frontend/js/documents.js:20712 |
| `docCmTheme` | frontend/js/documents.js:19051 |
| `docCmUpdate` | frontend/js/documents.js:20409 |
| `docCmViewLanguage` | frontend/js/documents.js:20704 |
| `docCmViewShown` | frontend/js/documents.js:21280 |
| `docCodeCommentAtCaret` | frontend/js/documents.js:4002 |
| `docCodeCommentRun` | frontend/js/documents.js:3998 |
| `docColumnsArrowKeymap` | frontend/js/documents.js:8687 |
| `docColumnsAt` | frontend/js/documents.js:5964 |
| `docColumnsBlocks` | frontend/js/documents.js:5901 |
| `docColumnsField` | frontend/js/documents.js:8593 |
| `docCommentContext` | frontend/js/documents.js:6582 |
| `docCommentFootnotes` | frontend/js/documents.js:6514 |
| `docCommentResolveEdit` | frontend/js/documents.js:6466 |
| `docCommentRow` | frontend/js/documents.js:6592 |
| `docCommentSkipMask` | frontend/js/documents.js:6379 |
| `docCommentStrip` | frontend/js/documents.js:6493 |
| `docComments` | frontend/js/documents.js:6575 |
| `docCommentsParse` | frontend/js/documents.js:6416 |
| `docCompleteEnabled` | frontend/js/documents.js:16265 |
| `docCompleteKeydown` | frontend/js/documents.js:16495 |
| `docCopyBlockRef` | frontend/js/documents.js:6286 |
| `docCrumbsEl` | frontend/js/documents.js:2144 |
| `docDesktopFs` | frontend/js/documents.js:13844 |
| `docDesktopFullscreenToggle` | frontend/js/documents.js:13849 |
| `docDictionary` | frontend/js/documents.js:17542 |
| `docDictionaryAdd` | frontend/js/documents.js:17577 |
| `docDictionaryAddTyped` | frontend/js/documents.js:18645 |
| `docDictionaryExport` | frontend/js/documents.js:18675 |
| `docDictionaryImport` | frontend/js/documents.js:18660 |
| `docDictionaryWordOk` | frontend/js/documents.js:18641 |
| `docDictionaryWrite` | frontend/js/documents.js:17556 |
| `docDiffApply` | frontend/js/documents.js:11663 |
| `docDiffHunkHead` | frontend/js/documents.js:11809 |
| `docDiffHunks` | frontend/js/documents.js:11644 |
| `docDiffLcs` | frontend/js/documents.js:11520 |
| `docDiffLines` | frontend/js/documents.js:11559 |
| `docDiffRows` | frontend/js/documents.js:11611 |
| `docDiffSplit` | frontend/js/documents.js:11590 |
| `docDiffSplitLayout` | frontend/js/documents.js:11758 |
| `docDiffStat` | frontend/js/documents.js:11595 |
| `docEditDistance` | frontend/js/documents.js:17660 |
| `docEditsOnce` | frontend/js/documents.js:15371 |
| `docEmbedChip` | frontend/js/documents.js:9446 |
| `docEmbedFill` | frontend/js/documents.js:9457 |
| `docEmbedNode` | frontend/js/documents.js:9197 |
| `docEmbedTarget` | frontend/js/documents.js:9181 |
| `docEventFromCm` | frontend/js/documents.js:623 |
| `docExportClean` | frontend/js/documents.js:10469 |
| `docExportEscape` | frontend/js/documents.js:10391 |
| `docExportHtmlDocument` | frontend/js/documents.js:10407 |
| `docExportInlineImages` | frontend/js/documents.js:10510 |
| `docExportPromoteHeadings` | frontend/js/documents.js:10456 |
| `docExportUnwrapControls` | frontend/js/documents.js:10432 |
| `docFenceGutterOn` | frontend/js/documents.js:20725 |
| `docFileType` | frontend/js/documents.js:101 |
| `docFillAt` | frontend/js/documents.js:16337 |
| `docFindMatches` | frontend/js/documents.js:1973 |
| `docFindSelect` | frontend/js/documents.js:1990 |
| `docFindStep` | frontend/js/documents.js:2004 |
| `docFindingAnchor` | frontend/js/documents.js:16866 |
| `docFindingAnswerRows` | frontend/js/documents.js:17873 |
| `docFindingAtOffset` | frontend/js/documents.js:16766 |
| `docFindingAtPoint` | frontend/js/documents.js:16931 |
| `docFindingIsPassage` | frontend/js/documents.js:17861 |
| `docFindingKeyBox` | frontend/js/documents.js:17116 |
| `docFindingKind` | frontend/js/documents.js:15753 |
| `docFindingLabel` | frontend/js/documents.js:17747 |
| `docFindingLine` | frontend/js/documents.js:17829 |
| `docFindingMarks` | frontend/js/documents.js:16804 |
| `docFindingOfMark` | frontend/js/documents.js:16894 |
| `docFindingStep` | frontend/js/documents.js:17129 |
| `docFindingsPlugin` | frontend/js/documents.js:20480 |
| `docFmNeedsQuote` | frontend/js/documents.js:5226 |
| `docFmRaw` | frontend/js/documents.js:5218 |
| `docFmSpan` | frontend/js/documents.js:5196 |
| `docFmSplitInline` | frontend/js/documents.js:5251 |
| `docFmWrite` | frontend/js/documents.js:5237 |
| `docFocusFill` | frontend/js/documents.js:13740 |
| `docFocusKey` | frontend/js/documents.js:13814 |
| `docFocusOn` | frontend/js/documents.js:13611 |
| `docFocusPointer` | frontend/js/documents.js:13807 |
| `docFocusRest` | frontend/js/documents.js:13795 |
| `docFocusSyncFullscreen` | frontend/js/documents.js:13860 |
| `docFocusSyncProse` | frontend/js/documents.js:15851 |
| `docFocusToggleFullscreen` | frontend/js/documents.js:13871 |
| `docFocusWake` | frontend/js/documents.js:13783 |
| `docFocusWatch` | frontend/js/documents.js:13762 |
| `docFoldMarkedCallouts` | frontend/js/documents.js:21136 |
| `docFrontmatterAddEdits` | frontend/js/documents.js:5432 |
| `docFrontmatterCreateEdits` | frontend/js/documents.js:5453 |
| `docFrontmatterEntry` | frontend/js/documents.js:5366 |
| `docFrontmatterParse` | frontend/js/documents.js:5278 |
| `docFrontmatterRemoveEdits` | frontend/js/documents.js:5444 |
| `docFrontmatterSetEdits` | frontend/js/documents.js:5376 |
| `docFrontmatterSetListEdits` | frontend/js/documents.js:5388 |
| `docFrontmatterStrip` | frontend/js/documents.js:5464 |
| `docFrontmatterTypeFields` | frontend/js/documents.js:5477 |
| `docGoToComment` | frontend/js/documents.js:6670 |
| `docGoToFinding` | frontend/js/documents.js:17146 |
| `docGoToFootnote` | frontend/js/documents.js:21153 |
| `docGuardGlobalShortcuts` | frontend/js/documents.js:20610 |
| `docGutterPref` | frontend/js/documents.js:14211 |
| `docGutterWanted` | frontend/js/documents.js:14219 |
| `docGutters` | frontend/js/documents.js:3595 |
| `docHeadingFold` | frontend/js/documents.js:21168 |
| `docHeadingTrail` | frontend/js/documents.js:2112 |
| `docHistoryDelta` | frontend/js/documents.js:11847 |
| `docHistoryPersist` | frontend/js/documents.js:21265 |
| `docHistoryRestore` | frontend/js/documents.js:21248 |
| `docHistoryRow` | frontend/js/documents.js:11936 |
| `docHistoryRowMenu` | frontend/js/documents.js:12038 |
| `docHistoryStamp` | frontend/js/documents.js:18773 |
| `docHtmlToMarkdown` | frontend/js/documents.js:4844 |
| `docImageAltWith` | frontend/js/documents.js:6008 |
| `docImageOptions` | frontend/js/documents.js:5972 |
| `docImageOptionsFromAlt` | frontend/js/documents.js:9420 |
| `docInsertProperties` | frontend/js/documents.js:5837 |
| `docInsertReferenceLink` | frontend/js/documents.js:1215 |
| `docKnownWords` | frontend/js/documents.js:17690 |
| `docLayerImageOptions` | frontend/js/documents.js:9431 |
| `docLiftToViewport` | frontend/js/documents.js:18118 |
| `docLineClipboardEvent` | frontend/js/documents.js:20794 |
| `docLineClipboardExtension` | frontend/js/documents.js:20821 |
| `docLineClipboardRange` | frontend/js/documents.js:20782 |
| `docLineOffset` | frontend/js/documents.js:20998 |
| `docLinePasteEvent` | frontend/js/documents.js:20807 |
| `docLinkBack` | frontend/js/documents.js:1226 |
| `docLinkMention` | frontend/js/documents.js:1241 |
| `docLinksTo` | frontend/js/documents.js:1188 |
| `docListGuides` | frontend/js/documents.js:19034 |
| `docLiveExtensions` | frontend/js/documents.js:8680 |
| `docLivePlugin` | frontend/js/documents.js:7053 |
| `docLoadNoteTypes` | frontend/js/documents.js:5657 |
| `docLoadWordlist` | frontend/js/documents.js:15269 |
| `docMapThroughAnchors` | frontend/js/documents.js:9743 |
| `docMarkAnchor` | frontend/js/documents.js:16841 |
| `docMarkRects` | frontend/js/documents.js:16829 |
| `docMatchCase` | frontend/js/documents.js:17706 |
| `docMathArgument` | frontend/js/documents.js:6868 |
| `docMathCommand` | frontend/js/documents.js:6893 |
| `docMathElement` | frontend/js/documents.js:7005 |
| `docMathLooksLikeMath` | frontend/js/documents.js:6991 |
| `docMathNodes` | frontend/js/documents.js:6936 |
| `docMathRender` | frontend/js/documents.js:7013 |
| `docMathRow` | frontend/js/documents.js:6863 |
| `docMathToken` | frontend/js/documents.js:6879 |
| `docMathTokens` | frontend/js/documents.js:6811 |
| `docMathTree` | frontend/js/documents.js:6974 |
| `docMentionsHost` | frontend/js/documents.js:1152 |
| `docMermaidBlocks` | frontend/js/documents.js:9099 |
| `docMermaidField` | frontend/js/documents.js:9108 |
| `docMermaidSvg` | frontend/js/documents.js:9054 |
| `docMirrorPoint` | frontend/js/documents.js:14820 |
| `docNameCurrentVersion` | frontend/js/documents.js:12103 |
| `docNameVersion` | frontend/js/documents.js:12079 |
| `docNearestWords` | frontend/js/documents.js:17720 |
| `docNextFootnote` | frontend/js/documents.js:10093 |
| `docNextName` | frontend/js/documents.js:1613 |
| `docOffsetOf` | frontend/js/documents.js:16773 |
| `docOpenBacklinkSource` | frontend/js/documents.js:1200 |
| `docOpenLink` | frontend/js/documents.js:9600 |
| `docOpenResolvedWikiTarget` | frontend/js/documents.js:9573 |
| `docOpenSuggestAtCaret` | frontend/js/documents.js:16998 |
| `docOpenSuggestAtPoint` | frontend/js/documents.js:17068 |
| `docOpenSuggestFor` | frontend/js/documents.js:16966 |
| `docOpenWikiTarget` | frontend/js/documents.js:9592 |
| `docOutlineClearDrop` | frontend/js/documents.js:2719 |
| `docOutlineDropAfter` | frontend/js/documents.js:2714 |
| `docOutlineFilterText` | frontend/js/documents.js:2295 |
| `docOutlineFoldKey` | frontend/js/documents.js:2291 |
| `docOutlineFoldStore` | frontend/js/documents.js:2259 |
| `docOutlineFolds` | frontend/js/documents.js:2267 |
| `docOutlineMoveSection` | frontend/js/documents.js:2676 |
| `docOutlineNudge` | frontend/js/documents.js:2735 |
| `docOutlineSetFolds` | frontend/js/documents.js:2280 |
| `docOutlineVisibility` | frontend/js/documents.js:2308 |
| `docPaletteCommands` | frontend/js/documents.js:2617 |
| `docPlaceFixed` | frontend/js/documents.js:18142 |
| `docPointerMenuOpen` | frontend/js/documents.js:16922 |
| `docPositionsRead` | frontend/js/documents.js:992 |
| `docPositionsWrite` | frontend/js/documents.js:1001 |
| `docPreviewShowing` | frontend/js/documents.js:324 |
| `docPrintCssString` | frontend/js/documents.js:10680 |
| `docPrintIsOurs` | frontend/js/documents.js:10615 |
| `docPrintMarginBoxes` | frontend/js/documents.js:10675 |
| `docPrintSetupDialog` | frontend/js/documents.js:10699 |
| `docPrintSetupRead` | frontend/js/documents.js:10662 |
| `docPromptInModal` | frontend/js/documents.js:12068 |
| `docPropsAddRow` | frontend/js/documents.js:5733 |
| `docPropsAdder` | frontend/js/documents.js:5606 |
| `docPropsChip` | frontend/js/documents.js:5584 |
| `docPropsDispatch` | frontend/js/documents.js:5525 |
| `docPropsField` | frontend/js/documents.js:5637 |
| `docPropsHost` | frontend/js/documents.js:5546 |
| `docPropsIconButton` | frontend/js/documents.js:5567 |
| `docPropsNow` | frontend/js/documents.js:5534 |
| `docPropsReadNode` | frontend/js/documents.js:3461 |
| `docPropsShowing` | frontend/js/documents.js:5538 |
| `docPropsTypeRows` | frontend/js/documents.js:5677 |
| `docProseApply` | frontend/js/documents.js:16197 |
| `docProseApplyWidth` | frontend/js/documents.js:17285 |
| `docProseDockChoice` | frontend/js/documents.js:17270 |
| `docProseDockSide` | frontend/js/documents.js:17279 |
| `docProseFindings` | frontend/js/documents.js:15544 |
| `docProseFix` | frontend/js/documents.js:16201 |
| `docProseFixAll` | frontend/js/documents.js:16221 |
| `docProseGroupList` | frontend/js/documents.js:16081 |
| `docProseHeader` | frontend/js/documents.js:15770 |
| `docProseIgnore` | frontend/js/documents.js:16059 |
| `docProseJump` | frontend/js/documents.js:16165 |
| `docProseKey` | frontend/js/documents.js:17592 |
| `docProseResizeHandle` | frontend/js/documents.js:17317 |
| `docProseRowAnswers` | frontend/js/documents.js:15982 |
| `docProseRowCollapse` | frontend/js/documents.js:15973 |
| `docProseRowKeys` | frontend/js/documents.js:16071 |
| `docProseSavedWidth` | frontend/js/documents.js:17303 |
| `docProseSkipMask` | frontend/js/documents.js:15521 |
| `docPutFields` | frontend/js/documents.js:10876 |
| `docReadingPlugin` | frontend/js/documents.js:13431 |
| `docRectHolds` | frontend/js/documents.js:16834 |
| `docRectUsable` | frontend/js/documents.js:16861 |
| `docRedo` | frontend/js/documents.js:18802 |
| `docRememberPosition` | frontend/js/documents.js:1042 |
| `docRememberPositionNow` | frontend/js/documents.js:1023 |
| `docRememberReading` | frontend/js/documents.js:13539 |
| `docRenderBody` | frontend/js/documents.js:3346 |
| `docRenderDiff` | frontend/js/documents.js:11692 |
| `docRenderFlow` | frontend/js/documents.js:3417 |
| `docRenderMermaidIn` | frontend/js/documents.js:9080 |
| `docReplaceAll` | frontend/js/documents.js:2034 |
| `docReplaceOne` | frontend/js/documents.js:2015 |
| `docReplacePattern` | frontend/js/documents.js:12187 |
| `docReplaceRange` | frontend/js/documents.js:3781 |
| `docReplaceScan` | frontend/js/documents.js:12214 |
| `docResetDocument` | frontend/js/documents.js:21206 |
| `docResolveComment` | frontend/js/documents.js:6704 |
| `docResolveConflict` | frontend/js/documents.js:1845 |
| `docResolveWikiTarget` | frontend/js/documents.js:9529 |
| `docRestorePosition` | frontend/js/documents.js:1106 |
| `docRestoreReading` | frontend/js/documents.js:13562 |
| `docReturnFromViewport` | frontend/js/documents.js:18127 |
| `docRevealBlock` | frontend/js/documents.js:6308 |
| `docRevealForSuggest` | frontend/js/documents.js:16955 |
| `docRevisionText` | frontend/js/documents.js:11894 |
| `docRichPasteEvent` | frontend/js/documents.js:4968 |
| `docRunControl` | frontend/js/documents.js:2437 |
| `docSaveToolPref` | frontend/js/documents.js:16625 |
| `docScanHeadings` | frontend/js/documents.js:2339 |
| `docScheduleSuggestFollow` | frontend/js/documents.js:18268 |
| `docScrollAnchors` | frontend/js/documents.js:9677 |
| `docSectionCount` | frontend/js/documents.js:1179 |
| `docSectionRange` | frontend/js/documents.js:2384 |
| `docSelectedLines` | frontend/js/documents.js:3764 |
| `docSetBookmark` | frontend/js/documents.js:10950 |
| `docSetCalloutHead` | frontend/js/documents.js:20925 |
| `docSetLiveDecorations` | frontend/js/documents.js:7032 |
| `docSetNoteLink` | frontend/js/documents.js:10931 |
| `docSetPlaceholder` | frontend/js/documents.js:385 |
| `docSetStatusText` | frontend/js/documents.js:14906 |
| `docSetVersionName` | frontend/js/documents.js:12086 |
| `docShowComment` | frontend/js/documents.js:6688 |
| `docShowSaved` | frontend/js/documents.js:10983 |
| `docSourceLineTop` | frontend/js/documents.js:9660 |
| `docSpellConfident` | frontend/js/documents.js:15449 |
| `docSpellGuesses` | frontend/js/documents.js:15401 |
| `docSpellLookup` | frontend/js/documents.js:15476 |
| `docSpellRoot` | frontend/js/documents.js:15391 |
| `docSpellable` | frontend/js/documents.js:15320 |
| `docSpellingVariant` | frontend/js/documents.js:17499 |
| `docSuggestAlternatives` | frontend/js/documents.js:17754 |
| `docSuggestAnswers` | frontend/js/documents.js:17924 |
| `docSuggestBand` | frontend/js/documents.js:18178 |
| `docSuggestFollowAnchor` | frontend/js/documents.js:18246 |
| `docSurface` | frontend/js/documents.js:597 |
| `docSurfaceById` | frontend/js/documents.js:611 |
| `docSurfaceChanged` | frontend/js/documents.js:590 |
| `docSurfaceInput` | frontend/js/documents.js:12413 |
| `docSyncFormatShow` | frontend/js/documents.js:14372 |
| `docTableAddColumnEdits` | frontend/js/documents.js:4309 |
| `docTableAddRowEdits` | frontend/js/documents.js:4282 |
| `docTableAlignEdits` | frontend/js/documents.js:4409 |
| `docTableAlignOf` | frontend/js/documents.js:4169 |
| `docTableApplyEdits` | frontend/js/documents.js:4425 |
| `docTableCaretTo` | frontend/js/documents.js:4695 |
| `docTableCellAt` | frontend/js/documents.js:4433 |
| `docTableCellClick` | frontend/js/documents.js:20230 |
| `docTableCellSpan` | frontend/js/documents.js:4253 |
| `docTableColumnPad` | frontend/js/documents.js:4267 |
| `docTableCommand` | frontend/js/documents.js:5102 |
| `docTableContext` | frontend/js/documents.js:4607 |
| `docTableDispatch` | frontend/js/documents.js:4619 |
| `docTableEscapeCell` | frontend/js/documents.js:4490 |
| `docTableFillRowEdits` | frontend/js/documents.js:4391 |
| `docTableFromGrid` | frontend/js/documents.js:4514 |
| `docTableGo` | frontend/js/documents.js:4644 |
| `docTableGridFromText` | frontend/js/documents.js:4503 |
| `docTableGridRules` | frontend/js/documents.js:18983 |
| `docTableIsDelimiter` | frontend/js/documents.js:4162 |
| `docTableJoinRow` | frontend/js/documents.js:4143 |
| `docTableKeyMove` | frontend/js/documents.js:4729 |
| `docTableMenu` | frontend/js/documents.js:5116 |
| `docTableParse` | frontend/js/documents.js:4187 |
| `docTablePasteEdits` | frontend/js/documents.js:4554 |
| `docTablePasteEvent` | frontend/js/documents.js:4781 |
| `docTableRemoveColumnEdits` | frontend/js/documents.js:4362 |
| `docTableRemoveEdits` | frontend/js/documents.js:4991 |
| `docTableRemoveRowEdits` | frontend/js/documents.js:4299 |
| `docTableRowLike` | frontend/js/documents.js:4156 |
| `docTableSetCellEdits` | frontend/js/documents.js:4526 |
| `docTableSplitRow` | frontend/js/documents.js:4104 |
| `docTableStepCell` | frontend/js/documents.js:4450 |
| `docTableStepRow` | frontend/js/documents.js:4480 |
| `docTableTab` | frontend/js/documents.js:16715 |
| `docTableTabStep` | frontend/js/documents.js:4681 |
| `docTakeTabEscape` | frontend/js/documents.js:3824 |
| `docTemplateFill` | frontend/js/documents.js:1571 |
| `docTemplateListKeys` | frontend/js/documents.js:1666 |
| `docText` | frontend/js/documents.js:603 |
| `docTocJump` | frontend/js/documents.js:20900 |
| `docToggleCalloutFold` | frontend/js/documents.js:21115 |
| `docToggleCodeDraw` | frontend/js/documents.js:20652 |
| `docToolPref` | frontend/js/documents.js:16616 |
| `docToolbarCollapsed` | frontend/js/documents.js:14296 |
| `docToolbarLayoutSignature` | frontend/js/documents.js:14706 |
| `docToolbarMarksAt` | frontend/js/documents.js:14987 |
| `docToolbarMode` | frontend/js/documents.js:14128 |
| `docToolsBoxFor` | frontend/js/documents.js:16674 |
| `docToolsOnInput` | frontend/js/documents.js:16638 |
| `docTopOffset` | frontend/js/documents.js:1016 |
| `docTranslatePassage` | frontend/js/documents.js:18283 |
| `docTypewriterExtension` | frontend/js/documents.js:13478 |
| `docUndo` | frontend/js/documents.js:18755 |
| `docUndoBreak` | frontend/js/documents.js:18741 |
| `docUndoDiffRange` | frontend/js/documents.js:18719 |
| `docUntitledName` | frontend/js/documents.js:1603 |
| `docVariantLookup` | frontend/js/documents.js:17503 |
| `docVisibleTopLine` | frontend/js/documents.js:3051 |
| `docWatchAppearance` | frontend/js/documents.js:20627 |
| `docWatchLock` | frontend/js/documents.js:21300 |
| `docWhereLine` | frontend/js/documents.js:3139 |
| `docWikiTargetLabel` | frontend/js/documents.js:9555 |
| `docWireImageEdit` | frontend/js/documents.js:9298 |
| `docWordFragment` | frontend/js/documents.js:16306 |
| `docWordGoalKey` | frontend/js/documents.js:1903 |
| `docWordKnown` | frontend/js/documents.js:15344 |
| `docWordlistReady` | frontend/js/documents.js:15265 |
| `docWriteContents` | frontend/js/documents.js:12254 |
| `docWriteOutsideHistory` | frontend/js/documents.js:10971 |
| `downloadDocumentExport` | frontend/js/documents.js:10205 |
| `ensureDocEditor` | frontend/js/documents.js:20569 |
| `ensureDocumentExists` | frontend/js/documents.js:1751 |
| `expandNoteIntoDocument` | frontend/js/documents.js:1874 |
| `exportDocumentBundle` | frontend/js/documents.js:10226 |
| `exportDocumentDocx` | frontend/js/documents.js:10232 |
| `exportDocumentHtml` | frontend/js/documents.js:10553 |
| `exportDocumentMarkdown` | frontend/js/documents.js:10239 |
| `exportDocumentPdf` | frontend/js/documents.js:10813 |
| `finishMarkdownEdit` | frontend/js/documents.js:10103 |
| `fitDocToolbarRow` | frontend/js/documents.js:14523 |
| `fitDocToolbars` | frontend/js/documents.js:14746 |
| `foldDocMenuGroup` | frontend/js/documents.js:235 |
| `forgetDocEditLocally` | frontend/js/documents.js:1069 |
| `getDocWordGoal` | frontend/js/documents.js:1907 |
| `hideDocComplete` | frontend/js/documents.js:16321 |
| `indentDocSelection` | frontend/js/documents.js:3848 |
| `initDocSidebarTabs` | frontend/js/documents.js:12331 |
| `initMarkdownToolbars` | frontend/js/documents.js:13287 |
| `insertAround` | frontend/js/documents.js:10064 |
| `jumpToDocLine` | frontend/js/documents.js:3223 |
| `keepDocEditLocally` | frontend/js/documents.js:1060 |
| `keepOutlineRowInView` | frontend/js/documents.js:3150 |
| `layerDocWikiLinks` | frontend/js/documents.js:3497 |
| `loadCodeMirror` | frontend/js/documents.js:18839 |
| `loadDocFileTypes` | frontend/js/documents.js:79 |
| `loadDocuments` | frontend/js/documents.js:733 |
| `loadDocumentsNow` | frontend/js/documents.js:744 |
| `markDocDirty` | frontend/js/documents.js:1776 |
| `markDocOutline` | frontend/js/documents.js:3164 |
| `markDocToolbarSepEdges` | frontend/js/documents.js:14653 |
| `mermaidFlowLayout` | frontend/js/documents.js:8849 |
| `mermaidFlowLink` | frontend/js/documents.js:8773 |
| `mermaidFlowNode` | frontend/js/documents.js:8757 |
| `mermaidFlowParse` | frontend/js/documents.js:8798 |
| `mermaidFlowSummary` | frontend/js/documents.js:9044 |
| `mermaidFlowSvgTree` | frontend/js/documents.js:9002 |
| `mermaidFlowUnquote` | frontend/js/documents.js:8750 |
| `mountDocEditor` | frontend/js/documents.js:20540 |
| `mountDocToolbarControls` | frontend/js/documents.js:14467 |
| `mountDocToolbarControlsFor` | frontend/js/documents.js:14393 |
| `mountEditorToolbarExtras` | frontend/js/documents.js:12547 |
| `mountGutterFor` | frontend/js/documents.js:3711 |
| `mountNoteSurface` | frontend/js/documents.js:13145 |
| `noteSourceWanted` | frontend/js/documents.js:13011 |
| `noteSurfaceExtensions` | frontend/js/documents.js:12851 |
| `noteSurfaceFor` | frontend/js/documents.js:12824 |
| `noteSurfaceGutter` | frontend/js/documents.js:20837 |
| `noteSurfaceKeymap` | frontend/js/documents.js:12936 |
| `noteSurfaceMeta` | frontend/js/documents.js:12839 |
| `noteSurfaceMirror` | frontend/js/documents.js:13042 |
| `noteSurfaceName` | frontend/js/documents.js:12919 |
| `noteSurfaceOwnValue` | frontend/js/documents.js:13071 |
| `noteSurfaceUpdate` | frontend/js/documents.js:13029 |
| `offerCreateUndo` | frontend/js/documents.js:10914 |
| `offerKeptDocEdit` | frontend/js/documents.js:1084 |
| `openDocAiHistory` | frontend/js/documents.js:11416 |
| `openDocAiPanel` | frontend/js/documents.js:11209 |
| `openDocDictionary` | frontend/js/documents.js:18561 |
| `openDocExtractPreview` | frontend/js/documents.js:11234 |
| `openDocHistory` | frontend/js/documents.js:11852 |
| `openDocPhoneInsert` | frontend/js/documents.js:12731 |
| `openDocReplace` | frontend/js/documents.js:12199 |
| `openDocSuggest` | frontend/js/documents.js:18051 |
| `openDocTemplateDialog` | frontend/js/documents.js:1686 |
| `openDocument` | frontend/js/documents.js:909 |
| `placeDocSuggest` | frontend/js/documents.js:18191 |
| `promptDocWordGoal` | frontend/js/documents.js:1959 |
| `pushDocAiUndo` | frontend/js/documents.js:11304 |
| `recordDocAiEditLog` | frontend/js/documents.js:11328 |
| `renameDocumentWithUndo` | frontend/js/documents.js:10880 |
| `renderDocAiDiff` | frontend/js/documents.js:11098 |
| `renderDocBacklinks` | frontend/js/documents.js:1319 |
| `renderDocBookmarks` | frontend/js/documents.js:1385 |
| `renderDocCaret` | frontend/js/documents.js:14918 |
| `renderDocComments` | frontend/js/documents.js:6645 |
| `renderDocComplete` | frontend/js/documents.js:16358 |
| `renderDocCounts` | frontend/js/documents.js:15034 |
| `renderDocCrumbs` | frontend/js/documents.js:2164 |
| `renderDocDictionary` | frontend/js/documents.js:18589 |
| `renderDocGutter` | frontend/js/documents.js:3676 |
| `renderDocHistoryList` | frontend/js/documents.js:11902 |
| `renderDocList` | frontend/js/documents.js:780 |
| `renderDocNotes` | frontend/js/documents.js:1353 |
| `renderDocOutline` | frontend/js/documents.js:2753 |
| `renderDocPreview` | frontend/js/documents.js:3278 |
| `renderDocProperties` | frontend/js/documents.js:5784 |
| `renderDocProse` | frontend/js/documents.js:15687 |
| `renderDocProsePanel` | frontend/js/documents.js:15865 |
| `renderDocReplace` | frontend/js/documents.js:12225 |
| `renderDocShortcutSheet` | frontend/js/documents.js:2639 |
| `renderDocStats` | frontend/js/documents.js:1932 |
| `renderDocStatusBar` | frontend/js/documents.js:15063 |
| `renderDocStorage` | frontend/js/documents.js:3239 |
| `renderDocToolbarState` | frontend/js/documents.js:15008 |
| `renderDocTools` | frontend/js/documents.js:17426 |
| `restoreDocVersionWithUndo` | frontend/js/documents.js:11001 |
| `runDocAiEdit` | frontend/js/documents.js:11242 |
| `runDocReplace` | frontend/js/documents.js:12261 |
| `saveDocument` | frontend/js/documents.js:1798 |
| `scheduleDocFacts` | frontend/js/documents.js:15086 |
| `scheduleDocOutlineSpy` | frontend/js/documents.js:3211 |
| `scheduleDocPreview` | frontend/js/documents.js:3264 |
| `setDocAiProposal` | frontend/js/documents.js:11085 |
| `setDocFocusSidebar` | frontend/js/documents.js:13653 |
| `setDocFocusTools` | frontend/js/documents.js:13623 |
| `setDocGutter` | frontend/js/documents.js:14234 |
| `setDocToolbarCollapsed` | frontend/js/documents.js:14346 |
| `setDocToolbarMode` | frontend/js/documents.js:14168 |
| `setDocView` | frontend/js/documents.js:644 |
| `setDocWidth` | frontend/js/documents.js:13388 |
| `setDocWordGoal` | frontend/js/documents.js:1912 |
| `setNoteSurfaceSource` | frontend/js/documents.js:13020 |
| `shiftDocIndent` | frontend/js/documents.js:10074 |
| `showDocAiResult` | frontend/js/documents.js:11044 |
| `showDocSidebarSection` | frontend/js/documents.js:12305 |
| `showDocTemplatePreview` | frontend/js/documents.js:1728 |
| `showNoDocument` | frontend/js/documents.js:878 |
| `syncDocAiPanel` | frontend/js/documents.js:11158 |
| `syncDocFileType` | frontend/js/documents.js:110 |
| `syncDocGutterMetrics` | frontend/js/documents.js:3635 |
| `syncDocScroll` | frontend/js/documents.js:9759 |
| `syncDocToolbarMore` | frontend/js/documents.js:14631 |
| `textareaSurface` | frontend/js/documents.js:396 |
| `toggleDocAiHunk` | frontend/js/documents.js:11128 |
| `toggleDocComment` | frontend/js/documents.js:3934 |
| `toggleDocFindBar` | frontend/js/documents.js:2052 |
| `toggleDocFocus` | frontend/js/documents.js:13676 |
| `toggleDocHistoryDiff` | frontend/js/documents.js:12120 |
| `toggleDocProseDock` | frontend/js/documents.js:17389 |
| `toggleDocToolbar` | frontend/js/documents.js:14380 |
| `toggleDocWidth` | frontend/js/documents.js:13397 |
| `trimDocToolbarGroup` | frontend/js/documents.js:14589 |
| `unlinkDocNoteWithUndo` | frontend/js/documents.js:10944 |
| `useDocTemplate` | frontend/js/documents.js:1657 |
| `watchDocGutter` | frontend/js/documents.js:3663 |
| `watchDocToolbarContents` | frontend/js/documents.js:14716 |
| `watchDocToolbarWidth` | frontend/js/documents.js:14677 |
| `wireDocScrollSync` | frontend/js/documents.js:9810 |
| `wireDocSurfaceScroll` | frontend/js/documents.js:9795 |
| `wireMarkdownToolbar` | frontend/js/documents.js:12616 |
| `wireMdFormatShortcuts` | frontend/js/documents.js:12696 |
| `withDocPreviewShown` | frontend/js/documents.js:3563 |
| `wrapDocSelection` | frontend/js/documents.js:10130 |

### frontend/js/drag-edge.js (3)

| Name | File:line |
|---|---|
| `dragEdgeTick` | frontend/js/drag-edge.js:29 |
| `dragEdgeZone` | frontend/js/drag-edge.js:45 |
| `initDragSelectEdgeScroll` | frontend/js/drag-edge.js:50 |

### frontend/js/edit-conflict.js (1)

| Name | File:line |
|---|---|
| `editConflictPrompt` | frontend/js/edit-conflict.js:6 |

### frontend/js/embed-choices.js (8)

| Name | File:line |
|---|---|
| `embedChoiceInstall` | frontend/js/embed-choices.js:153 |
| `embedChoiceRow` | frontend/js/embed-choices.js:44 |
| `embedChoiceUninstall` | frontend/js/embed-choices.js:171 |
| `embedChoiceUse` | frontend/js/embed-choices.js:248 |
| `embedFoundRow` | frontend/js/embed-choices.js:186 |
| `embedPullTyped` | frontend/js/embed-choices.js:220 |
| `embedToast` | frontend/js/embed-choices.js:19 |
| `renderEmbedChoices` | frontend/js/embed-choices.js:24 |

### frontend/js/entity-page.js (10)

| Name | File:line |
|---|---|
| `entityDateRow` | frontend/js/entity-page.js:134 |
| `entityIcon` | frontend/js/entity-page.js:14 |
| `entityMentionRow` | frontend/js/entity-page.js:118 |
| `entityMenuItems` | frontend/js/entity-page.js:156 |
| `entitySave` | frontend/js/entity-page.js:146 |
| `entitySection` | frontend/js/entity-page.js:101 |
| `entityWhen` | frontend/js/entity-page.js:21 |
| `openEntitiesSheet` | frontend/js/entity-page.js:194 |
| `openEntityPage` | frontend/js/entity-page.js:56 |
| `toastEntityMerge` | frontend/js/entity-page.js:33 |

### frontend/js/field-clear.js (6)

| Name | File:line |
|---|---|
| `fieldClearBoxes` | frontend/js/field-clear.js:46 |
| `fieldClearRun` | frontend/js/field-clear.js:65 |
| `fieldClearSync` | frontend/js/field-clear.js:50 |
| `fieldClearSyncAll` | frontend/js/field-clear.js:138 |
| `fieldClearWatchValue` | frontend/js/field-clear.js:109 |
| `fieldClearWrite` | frontend/js/field-clear.js:59 |

### frontend/js/graph-canvas.js (125)

| Name | File:line |
|---|---|
| `gcArmTouchLasso` | frontend/js/graph-canvas.js:3521 |
| `gcArrows` | frontend/js/graph-canvas.js:783 |
| `gcAutoFitDone` | frontend/js/graph-canvas.js:180 |
| `gcBalanceFit` | frontend/js/graph-canvas.js:1413 |
| `gcBornAlpha` | frontend/js/graph-canvas.js:1558 |
| `gcBowPoint` | frontend/js/graph-canvas.js:794 |
| `gcBoxLineCount` | frontend/js/graph-canvas.js:654 |
| `gcClampBox` | frontend/js/graph-canvas.js:568 |
| `gcClickNode` | frontend/js/graph-canvas.js:3902 |
| `gcClipEdge` | frontend/js/graph-canvas.js:641 |
| `gcCloseNodeMenu` | frontend/js/graph-canvas.js:3746 |
| `gcCurvedLinks` | frontend/js/graph-canvas.js:752 |
| `gcDraw` | frontend/js/graph-canvas.js:1850 |
| `gcDrawDrift` | frontend/js/graph-canvas.js:2679 |
| `gcDrawEdgeHover` | frontend/js/graph-canvas.js:2692 |
| `gcDrawLabels` | frontend/js/graph-canvas.js:2752 |
| `gcDrawNebulae` | frontend/js/graph-canvas.js:996 |
| `gcDrawPill` | frontend/js/graph-canvas.js:2729 |
| `gcDrawSelection` | frontend/js/graph-canvas.js:3570 |
| `gcDrawTopicHulls` | frontend/js/graph-canvas.js:1037 |
| `gcDrawTrace` | frontend/js/graph-canvas.js:2912 |
| `gcEaseOut` | frontend/js/graph-canvas.js:1571 |
| `gcEdgeAtWorld` | frontend/js/graph-canvas.js:2995 |
| `gcEdgeStyle` | frontend/js/graph-canvas.js:804 |
| `gcEl` | frontend/js/graph-canvas.js:1746 |
| `gcEnsureCanvas` | frontend/js/graph-canvas.js:845 |
| `gcExportPng` | frontend/js/graph-canvas.js:1797 |
| `gcFadeStep` | frontend/js/graph-canvas.js:1650 |
| `gcFadeToward` | frontend/js/graph-canvas.js:1637 |
| `gcFillSparks` | frontend/js/graph-canvas.js:2659 |
| `gcFilterChip` | frontend/js/graph-canvas.js:1113 |
| `gcFitInsets` | frontend/js/graph-canvas.js:1486 |
| `gcFrameIntro` | frontend/js/graph-canvas.js:4286 |
| `gcGlideFinish` | frontend/js/graph-canvas.js:1691 |
| `gcGlideStep` | frontend/js/graph-canvas.js:1672 |
| `gcHexToRgb` | frontend/js/graph-canvas.js:933 |
| `gcHideTopic` | frontend/js/graph-canvas.js:1184 |
| `gcHighlight` | frontend/js/graph-canvas.js:1760 |
| `gcHoverChanged` | frontend/js/graph-canvas.js:1579 |
| `gcHoverGrow` | frontend/js/graph-canvas.js:1590 |
| `gcHoverStep` | frontend/js/graph-canvas.js:1598 |
| `gcIsNote` | frontend/js/graph-canvas.js:338 |
| `gcKeyboardId` | frontend/js/graph-canvas.js:192 |
| `gcLabelCut` | frontend/js/graph-canvas.js:2889 |
| `gcLabelPlates` | frontend/js/graph-canvas.js:764 |
| `gcLabelText` | frontend/js/graph-canvas.js:2899 |
| `gcLabelWidth` | frontend/js/graph-canvas.js:2857 |
| `gcLabelZoom` | frontend/js/graph-canvas.js:771 |
| `gcLegendEdgeKey` | frontend/js/graph-canvas.js:4936 |
| `gcLineGrid` | frontend/js/graph-canvas.js:585 |
| `gcLinkKindHidden` | frontend/js/graph-canvas.js:1109 |
| `gcLinkSpark` | frontend/js/graph-canvas.js:2614 |
| `gcLinkWidth` | frontend/js/graph-canvas.js:777 |
| `gcLitAlpha` | frontend/js/graph-canvas.js:1643 |
| `gcMaxDegree` | frontend/js/graph-canvas.js:236 |
| `gcNodeAtWorld` | frontend/js/graph-canvas.js:2971 |
| `gcNodeSprite` | frontend/js/graph-canvas.js:940 |
| `gcOpenTopic` | frontend/js/graph-canvas.js:1385 |
| `gcPlaceLabels` | frontend/js/graph-canvas.js:443 |
| `gcPlacePill` | frontend/js/graph-canvas.js:701 |
| `gcPlateAtWorld` | frontend/js/graph-canvas.js:1357 |
| `gcPlateTitle` | frontend/js/graph-canvas.js:1364 |
| `gcPointInPolygon` | frontend/js/graph-canvas.js:3500 |
| `gcPost` | frontend/js/graph-canvas.js:3956 |
| `gcPruneSimilarity` | frontend/js/graph-canvas.js:386 |
| `gcQuadAt` | frontend/js/graph-canvas.js:2604 |
| `gcRadius` | frontend/js/graph-canvas.js:248 |
| `gcReadTokens` | frontend/js/graph-canvas.js:300 |
| `gcRefitForPanels` | frontend/js/graph-canvas.js:1516 |
| `gcRelinkPairs` | frontend/js/graph-canvas.js:5427 |
| `gcRenameTopicInline` | frontend/js/graph-canvas.js:1292 |
| `gcRenderFilterChips` | frontend/js/graph-canvas.js:1129 |
| `gcRequestDraw` | frontend/js/graph-canvas.js:1707 |
| `gcRequestMinimapFrame` | frontend/js/graph-canvas.js:1728 |
| `gcReshuffle` | frontend/js/graph-canvas.js:4009 |
| `gcResize` | frontend/js/graph-canvas.js:817 |
| `gcReveal` | frontend/js/graph-canvas.js:5436 |
| `gcRuleDomain` | frontend/js/graph-canvas.js:4741 |
| `gcRuleKey` | frontend/js/graph-canvas.js:4723 |
| `gcRuleScale` | frontend/js/graph-canvas.js:4747 |
| `gcSaveTopicName` | frontend/js/graph-canvas.js:1269 |
| `gcSelectedNodes` | frontend/js/graph-canvas.js:3613 |
| `gcSelectionChanged` | frontend/js/graph-canvas.js:3603 |
| `gcSetAutoFitDone` | frontend/js/graph-canvas.js:184 |
| `gcSetHovered` | frontend/js/graph-canvas.js:196 |
| `gcShape` | frontend/js/graph-canvas.js:3992 |
| `gcShowEmpty` | frontend/js/graph-canvas.js:4352 |
| `gcShowEveryNote` | frontend/js/graph-canvas.js:4381 |
| `gcShowNodeMenu` | frontend/js/graph-canvas.js:3803 |
| `gcShowTopic` | frontend/js/graph-canvas.js:1190 |
| `gcSimilarityBand` | frontend/js/graph-canvas.js:429 |
| `gcSimilarityCutoff` | frontend/js/graph-canvas.js:731 |
| `gcSmooth` | frontend/js/graph-canvas.js:1632 |
| `gcStartWorker` | frontend/js/graph-canvas.js:4033 |
| `gcStop` | frontend/js/graph-canvas.js:3960 |
| `gcSurface` | frontend/js/graph-canvas.js:43 |
| `gcTogglePin` | frontend/js/graph-canvas.js:3477 |
| `gcTooltip` | frontend/js/graph-canvas.js:3861 |
| `gcTooltipMatches` | frontend/js/graph-canvas.js:3886 |
| `gcTopicColour` | frontend/js/graph-canvas.js:1392 |
| `gcTopicCore` | frontend/js/graph-canvas.js:1379 |
| `gcTopicMembers` | frontend/js/graph-canvas.js:1372 |
| `gcTreeIndex` | frontend/js/graph-canvas.js:2957 |
| `gcTweenFromPrior` | frontend/js/graph-canvas.js:1530 |
| `gcUnlinkPairs` | frontend/js/graph-canvas.js:5420 |
| `gcVisibleAtTime` | frontend/js/graph-canvas.js:1784 |
| `gcWireInteraction` | frontend/js/graph-canvas.js:3037 |
| `gcWireLasso` | frontend/js/graph-canvas.js:3536 |
| `gcWireNodeMenu` | frontend/js/graph-canvas.js:3750 |
| `gcWireSelectionDock` | frontend/js/graph-canvas.js:3617 |
| `gcWorkerParams` | frontend/js/graph-canvas.js:3967 |
| `gcWorldFor` | frontend/js/graph-canvas.js:4303 |
| `gcWorldPoint` | frontend/js/graph-canvas.js:2981 |
| `gcWriteUnresolved` | frontend/js/graph-canvas.js:3940 |
| `graphPaneColour` | frontend/js/graph-canvas.js:5212 |
| `graphPaneDocumentNote` | frontend/js/graph-canvas.js:5348 |
| `graphPaneEnsure` | frontend/js/graph-canvas.js:5190 |
| `graphPaneFollow` | frontend/js/graph-canvas.js:5302 |
| `graphPaneWire` | frontend/js/graph-canvas.js:5357 |
| `graphRenderLegend` | frontend/js/graph-canvas.js:4764 |
| `graphRenderStats` | frontend/js/graph-canvas.js:4976 |
| `graphSyncTimeSlider` | frontend/js/graph-canvas.js:5017 |
| `graphWireTimePlay` | frontend/js/graph-canvas.js:5056 |
| `renderGraphCanvas` | frontend/js/graph-canvas.js:4399 |
| `renderGraphPane` | frontend/js/graph-canvas.js:5218 |

### frontend/js/graph-worker.js (50)

| Name | File:line |
|---|---|
| `KIND_LENGTH` | frontend/js/graph-worker.js:296 |
| `alphaDecayFor` | frontend/js/graph-worker.js:124 |
| `applyForces` | frontend/js/graph-worker.js:1308 |
| `applyGrouping` | frontend/js/graph-worker.js:1254 |
| `bridgeGroup` | frontend/js/graph-worker.js:556 |
| `centreScale` | frontend/js/graph-worker.js:355 |
| `clampToWorld` | frontend/js/graph-worker.js:1380 |
| `clearCurve` | frontend/js/graph-worker.js:998 |
| `clearNearest` | frontend/js/graph-worker.js:1025 |
| `clearPush` | frontend/js/graph-worker.js:1046 |
| `clearanceForce` | frontend/js/graph-worker.js:1077 |
| `clustered` | frontend/js/graph-worker.js:544 |
| `collidePadFor` | frontend/js/graph-worker.js:253 |
| `crossStrength` | frontend/js/graph-worker.js:321 |
| `densityScale` | frontend/js/graph-worker.js:331 |
| `ellipseWalk` | frontend/js/graph-worker.js:643 |
| `groupAnchors` | frontend/js/graph-worker.js:703 |
| `groupAnchorsOrganic` | frontend/js/graph-worker.js:687 |
| `groupCohesion` | frontend/js/graph-worker.js:450 |
| `groupDiscs` | frontend/js/graph-worker.js:632 |
| `groupGather` | frontend/js/graph-worker.js:461 |
| `groupOrder` | frontend/js/graph-worker.js:481 |
| `groupingOn` | frontend/js/graph-worker.js:1248 |
| `hubForce` | frontend/js/graph-worker.js:1136 |
| `introCancel` | frontend/js/graph-worker.js:231 |
| `introPick` | frontend/js/graph-worker.js:175 |
| `introSnapshot` | frontend/js/graph-worker.js:182 |
| `introStep` | frontend/js/graph-worker.js:223 |
| `leafForce` | frontend/js/graph-worker.js:1210 |
| `linkStrength` | frontend/js/graph-worker.js:324 |
| `loop` | frontend/js/graph-worker.js:1429 |
| `orbitForce` | frontend/js/graph-worker.js:961 |
| `orbitRadiusAt` | frontend/js/graph-worker.js:830 |
| `orbitReach` | frontend/js/graph-worker.js:797 |
| `orbitUpdate` | frontend/js/graph-worker.js:903 |
| `orbitUpdateGrouped` | frontend/js/graph-worker.js:849 |
| `portraitPull` | frontend/js/graph-worker.js:412 |
| `post` | frontend/js/graph-worker.js:1389 |
| `reshuffle` | frontend/js/graph-worker.js:1338 |
| `rimOffset` | frontend/js/graph-worker.js:1162 |
| `ringFor` | frontend/js/graph-worker.js:669 |
| `run` | frontend/js/graph-worker.js:1498 |
| `seededRandom` | frontend/js/graph-worker.js:579 |
| `setRingSeed` | frontend/js/graph-worker.js:590 |
| `shapeForce` | frontend/js/graph-worker.js:1184 |
| `shuffleStep` | frontend/js/graph-worker.js:1364 |
| `smallSpread` | frontend/js/graph-worker.js:345 |
| `stopLoop` | frontend/js/graph-worker.js:1418 |
| `tuning` | frontend/js/graph-worker.js:365 |
| `warmLayout` | frontend/js/graph-worker.js:193 |

### frontend/js/graph.js (115)

| Name | File:line |
|---|---|
| `applyGraphHighlight` | frontend/js/graph.js:3471 |
| `arcPath` | frontend/js/graph.js:454 |
| `askLinkDetails` | frontend/js/graph.js:1353 |
| `clearGraphKeyboardFocus` | frontend/js/graph.js:4461 |
| `clearTrace` | frontend/js/graph.js:821 |
| `closeGraphLinkPeek` | frontend/js/graph.js:3724 |
| `closeGraphNewNote` | frontend/js/graph.js:4546 |
| `closeGraphPopup` | frontend/js/graph.js:4448 |
| `drawTrace` | frontend/js/graph.js:1202 |
| `exportGraphPng` | frontend/js/graph.js:4679 |
| `fillTracePickers` | frontend/js/graph.js:629 |
| `fitGraphToView` | frontend/js/graph.js:3373 |
| `focusGraphNode` | frontend/js/graph.js:3137 |
| `frameTree` | frontend/js/graph.js:473 |
| `graphApplySettings` | frontend/js/graph.js:5871 |
| `graphApplyView` | frontend/js/graph.js:5403 |
| `graphCalmScheme` | frontend/js/graph.js:1749 |
| `graphCaptureSettings` | frontend/js/graph.js:5840 |
| `graphCaptureView` | frontend/js/graph.js:5349 |
| `graphCategoryScale` | frontend/js/graph.js:1759 |
| `graphCloseOtherMenus` | frontend/js/graph.js:5607 |
| `graphColourMode` | frontend/js/graph.js:1568 |
| `graphControlsSheetParts` | frontend/js/graph.js:5946 |
| `graphEndpoint` | frontend/js/graph.js:1793 |
| `graphFill` | frontend/js/graph.js:1819 |
| `graphFitFrame` | frontend/js/graph.js:3350 |
| `graphGroupColour` | frontend/js/graph.js:1599 |
| `graphGroupNode` | frontend/js/graph.js:212 |
| `graphGroups` | frontend/js/graph.js:1584 |
| `graphInlineComputedStyle` | frontend/js/graph.js:4625 |
| `graphLayout` | frontend/js/graph.js:133 |
| `graphLayoutIsComputed` | frontend/js/graph.js:157 |
| `graphLinkKind` | frontend/js/graph.js:3731 |
| `graphLocalQuery` | frontend/js/graph.js:1784 |
| `graphMinimapCanShow` | frontend/js/graph.js:4841 |
| `graphMinimapChildren` | frontend/js/graph.js:4870 |
| `graphMinimapEdgePairs` | frontend/js/graph.js:4782 |
| `graphMinimapFinite` | frontend/js/graph.js:5050 |
| `graphMinimapFrame` | frontend/js/graph.js:5064 |
| `graphMinimapPaint` | frontend/js/graph.js:4896 |
| `graphMinimapQueuePaint` | frontend/js/graph.js:4848 |
| `graphMinimapSet` | frontend/js/graph.js:4889 |
| `graphMinimapShown` | frontend/js/graph.js:4819 |
| `graphNeighbourInDirection` | frontend/js/graph.js:3116 |
| `graphNodeById` | frontend/js/graph.js:3109 |
| `graphNodeLabel` | frontend/js/graph.js:3837 |
| `graphNodeRadius` | frontend/js/graph.js:101 |
| `graphNodeScreenPoint` | frontend/js/graph.js:3161 |
| `graphNodeUnder` | frontend/js/graph.js:1314 |
| `graphPopupFileCard` | frontend/js/graph.js:4017 |
| `graphPopupMediaRefs` | frontend/js/graph.js:3994 |
| `graphQueryMatch` | frontend/js/graph.js:3464 |
| `graphRasterizeSvg` | frontend/js/graph.js:4636 |
| `graphReadPhrase` | frontend/js/graph.js:3449 |
| `graphRemoveLink` | frontend/js/graph.js:3679 |
| `graphRenderGroups` | frontend/js/graph.js:1621 |
| `graphRenderer` | frontend/js/graph.js:1730 |
| `graphResetToDefaults` | frontend/js/graph.js:5903 |
| `graphResolveGroups` | frontend/js/graph.js:1606 |
| `graphRestoreSwitches` | frontend/js/graph.js:5540 |
| `graphSaveCurrentView` | frontend/js/graph.js:5393 |
| `graphSavedViews` | frontend/js/graph.js:5340 |
| `graphSetGroups` | frontend/js/graph.js:1593 |
| `graphSettingsEqual` | frontend/js/graph.js:5860 |
| `graphShowNote` | frontend/js/graph.js:4128 |
| `graphSizeMode` | frontend/js/graph.js:1531 |
| `graphSizeRadius` | frontend/js/graph.js:1536 |
| `graphSyncFocusChip` | frontend/js/graph.js:1693 |
| `graphSyncSimilarityRow` | frontend/js/graph.js:5744 |
| `graphTopicFor` | frontend/js/graph.js:4184 |
| `graphZoomBy` | frontend/js/graph.js:5621 |
| `hierarchyPath` | frontend/js/graph.js:436 |
| `initGraphDockHeightToken` | frontend/js/graph.js:5151 |
| `initGraphGroups` | frontend/js/graph.js:1655 |
| `initGraphKeyboard` | frontend/js/graph.js:3179 |
| `initGraphMinimap` | frontend/js/graph.js:5169 |
| `initGraphViews` | frontend/js/graph.js:5497 |
| `layoutHierarchy` | frontend/js/graph.js:306 |
| `linkByDrop` | frontend/js/graph.js:1462 |
| `openGraphControlsSheet` | frontend/js/graph.js:5962 |
| `openGraphLinkPanel` | frontend/js/graph.js:3852 |
| `openGraphLinkPeek` | frontend/js/graph.js:3739 |
| `openGraphNewNote` | frontend/js/graph.js:4515 |
| `openGraphPopup` | frontend/js/graph.js:3587 |
| `pickTraceEnd` | frontend/js/graph.js:705 |
| `placeGraphPopup` | frontend/js/graph.js:4076 |
| `positionTraceLines` | frontend/js/graph.js:1186 |
| `radialFlip` | frontend/js/graph.js:268 |
| `radialRings` | frontend/js/graph.js:277 |
| `renderGraph` | frontend/js/graph.js:1767 |
| `renderGraphPopupActions` | frontend/js/graph.js:4299 |
| `renderGraphPopupHeader` | frontend/js/graph.js:3551 |
| `renderGraphPopupInfo` | frontend/js/graph.js:4249 |
| `renderGraphPopupMedia` | frontend/js/graph.js:4021 |
| `renderGraphPopupProps` | frontend/js/graph.js:4221 |
| `renderGraphPopupTopic` | frontend/js/graph.js:4159 |
| `renderGraphSvg` | frontend/js/graph.js:1842 |
| `renderGraphViews` | frontend/js/graph.js:5467 |
| `renderTraceReadout` | frontend/js/graph.js:1017 |
| `renderTraceState` | frontend/js/graph.js:733 |
| `replyLoops` | frontend/js/graph.js:297 |
| `runTrace` | frontend/js/graph.js:847 |
| `saveGraphNewNote` | frontend/js/graph.js:4551 |
| `saveGraphPopup` | frontend/js/graph.js:4476 |
| `selectTraceRoute` | frontend/js/graph.js:916 |
| `setGraphPhysicsEnabled` | frontend/js/graph.js:165 |
| `setTraceEnd` | frontend/js/graph.js:790 |
| `setTracePanelOpen` | frontend/js/graph.js:636 |
| `showTopicInGraph` | frontend/js/graph.js:4203 |
| `showTraceMessage` | frontend/js/graph.js:813 |
| `storyPrompt` | frontend/js/graph.js:1004 |
| `syncGraphPopupSave` | frontend/js/graph.js:3668 |
| `toggleGraphFullscreen` | frontend/js/graph.js:5636 |
| `traceLabel` | frontend/js/graph.js:726 |
| `tracePath` | frontend/js/graph.js:1172 |

### frontend/js/harper-worker.js (3)

| Name | File:line |
|---|---|
| `dialectOf` | frontend/js/harper-worker.js:47 |
| `linterFor` | frontend/js/harper-worker.js:51 |
| `suggestionOf` | frontend/js/harper-worker.js:69 |

### frontend/js/help-chat.js (21)

| Name | File:line |
|---|---|
| `askAtlas` | frontend/js/help-chat.js:682 |
| `atlasStartersFor` | frontend/js/help-chat.js:815 |
| `guideFirstControl` | frontend/js/help-chat.js:96 |
| `guideLand` | frontend/js/help-chat.js:101 |
| `guideOnScreen` | frontend/js/help-chat.js:91 |
| `guideShown` | frontend/js/help-chat.js:78 |
| `helpChatAppendRow` | frontend/js/help-chat.js:31 |
| `helpChatIsNearBottom` | frontend/js/help-chat.js:25 |
| `helpChatNewChat` | frontend/js/help-chat.js:579 |
| `helpChatOnScreenHelp` | frontend/js/help-chat.js:249 |
| `helpChatOpenButton` | frontend/js/help-chat.js:50 |
| `helpChatReveal` | frontend/js/help-chat.js:535 |
| `helpChatSetBusy` | frontend/js/help-chat.js:287 |
| `helpChatStop` | frontend/js/help-chat.js:308 |
| `helpChatStreamTurn` | frontend/js/help-chat.js:421 |
| `openHelpChat` | frontend/js/help-chat.js:713 |
| `renderAtlasStarters` | frontend/js/help-chat.js:629 |
| `renderHelpChatGreeting` | frontend/js/help-chat.js:662 |
| `renderHelpChatMenu` | frontend/js/help-chat.js:596 |
| `renderHelpChatMessage` | frontend/js/help-chat.js:128 |
| `submitHelpChatQuestion` | frontend/js/help-chat.js:313 |

### frontend/js/icon-picker.js (9)

| Name | File:line |
|---|---|
| `closeIconPicker` | frontend/js/icon-picker.js:316 |
| `iconPickerEmojiGroups` | frontend/js/icon-picker.js:212 |
| `iconPickerGlyph` | frontend/js/icon-picker.js:300 |
| `iconPickerIconGroups` | frontend/js/icon-picker.js:259 |
| `iconPickerPhosphorNames` | frontend/js/icon-picker.js:241 |
| `iconPickerRecent` | frontend/js/icon-picker.js:276 |
| `iconPickerRemember` | frontend/js/icon-picker.js:281 |
| `iconPickerText` | frontend/js/icon-picker.js:295 |
| `openIconPicker` | frontend/js/icon-picker.js:325 |

### frontend/js/library.js (239)

| Name | File:line |
|---|---|
| `activityDetailText` | frontend/js/library.js:1253 |
| `activitySettingValue` | frontend/js/library.js:1237 |
| `allBookmarkGroups` | frontend/js/library.js:10601 |
| `analyseMediaRow` | frontend/js/library.js:7738 |
| `applyLibraryMediaView` | frontend/js/library.js:3525 |
| `attachBoardTick` | frontend/js/library.js:10276 |
| `binRoutes` | frontend/js/library.js:1029 |
| `bookmarkAddress` | frontend/js/library.js:3731 |
| `bookmarkRow` | frontend/js/library.js:10970 |
| `bookmarkSiteSection` | frontend/js/library.js:10933 |
| `bookmarkSort` | frontend/js/library.js:10860 |
| `buildFileReadingSummary` | frontend/js/library.js:7896 |
| `bulkDeleteLibraryBoards` | frontend/js/library.js:10315 |
| `bulkDeleteLibraryLinks` | frontend/js/library.js:10518 |
| `bulkDeleteLibraryMedia` | frontend/js/library.js:8027 |
| `bulkMoveLibraryLinks` | frontend/js/library.js:10545 |
| `bulkUpdateLibraryLinks` | frontend/js/library.js:10528 |
| `clearLibraryBoardsSelection` | frontend/js/library.js:10307 |
| `clearLibraryLinksSelection` | frontend/js/library.js:10466 |
| `clearLibraryMediaSelection` | frontend/js/library.js:8021 |
| `closeBinnedReader` | frontend/js/library.js:1621 |
| `closeOcrWorkspace` | frontend/js/library.js:5280 |
| `contentsBuildSection` | frontend/js/library.js:11701 |
| `contentsDocRow` | frontend/js/library.js:11614 |
| `contentsGlyph` | frontend/js/library.js:11549 |
| `contentsGroupMark` | frontend/js/library.js:11685 |
| `contentsGroups` | frontend/js/library.js:11393 |
| `contentsMonthKey` | frontend/js/library.js:11386 |
| `contentsNoteFacts` | frontend/js/library.js:11576 |
| `contentsNoteMark` | frontend/js/library.js:11556 |
| `contentsNoteName` | frontend/js/library.js:11489 |
| `contentsNoteRow` | frontend/js/library.js:11588 |
| `contentsOpenDocument` | frontend/js/library.js:11507 |
| `contentsOrderedKeys` | frontend/js/library.js:11462 |
| `contentsRenameTopic` | frontend/js/library.js:11776 |
| `contentsRowBody` | frontend/js/library.js:11536 |
| `contentsSectionLabel` | frontend/js/library.js:11442 |
| `contentsSetAll` | frontend/js/library.js:11965 |
| `contentsTopicNames` | frontend/js/library.js:11451 |
| `contentsTreeItem` | frontend/js/library.js:11522 |
| `contentsTreeKeys` | frontend/js/library.js:11980 |
| `contentsWireTopicHeading` | frontend/js/library.js:11750 |
| `createLibrarySelectbar` | frontend/js/library.js:10211 |
| `deleteBookmarkGroup` | frontend/js/library.js:10637 |
| `deleteBookmarksWithUndo` | frontend/js/library.js:10477 |
| `deleteSkillWithUndo` | frontend/js/library.js:2482 |
| `duplicateSkill` | frontend/js/library.js:2454 |
| `emptyBookmarkGroups` | frontend/js/library.js:10578 |
| `ensureLibraryGridStop` | frontend/js/library.js:1489 |
| `fetchAllBookmarks` | frontend/js/library.js:10428 |
| `fileMetaLine` | frontend/js/library.js:3712 |
| `filterBookmarks` | frontend/js/library.js:10875 |
| `filterLibraryImagesGallery` | frontend/js/library.js:8275 |
| `flashLibraryItem` | frontend/js/library.js:1665 |
| `focusLibraryFile` | frontend/js/library.js:3659 |
| `importLibraryDocuments` | frontend/js/library.js:3077 |
| `isImageUrl` | frontend/js/library.js:3487 |
| `keepLibraryScroll` | frontend/js/library.js:1148 |
| `libraryActions` | frontend/js/library.js:759 |
| `libraryBackgroundRun` | frontend/js/library.js:3887 |
| `libraryCard` | frontend/js/library.js:1271 |
| `libraryColumnCount` | frontend/js/library.js:454 |
| `libraryCopyActions` | frontend/js/library.js:720 |
| `libraryDocSort` | frontend/js/library.js:3053 |
| `libraryDocsMatchesProperty` | frontend/js/library.js:2974 |
| `libraryDocsPropertyOptions` | frontend/js/library.js:2959 |
| `libraryImageOrigin` | frontend/js/library.js:8208 |
| `libraryImagesFingerprint` | frontend/js/library.js:3442 |
| `libraryKeyOf` | frontend/js/library.js:189 |
| `libraryLightboxItems` | frontend/js/library.js:7840 |
| `libraryMediaSort` | frontend/js/library.js:8165 |
| `librarySelectedItems` | frontend/js/library.js:1106 |
| `librarySorted` | frontend/js/library.js:364 |
| `libraryTitleAndPreview` | frontend/js/library.js:1189 |
| `libraryView` | frontend/js/library.js:185 |
| `linkNoteFromLibrary` | frontend/js/library.js:1050 |
| `loadLibrary` | frontend/js/library.js:205 |
| `manageBookmarkGroups` | frontend/js/library.js:10663 |
| `mediaFileIcon` | frontend/js/library.js:3673 |
| `mediaFileKind` | frontend/js/library.js:3755 |
| `mediaHasBeenRead` | frontend/js/library.js:7766 |
| `mediaReading` | frontend/js/library.js:7762 |
| `mediaReadingBadge` | frontend/js/library.js:7774 |
| `mediaReadingSummary` | frontend/js/library.js:7803 |
| `mediaRowDeleteEndpoint` | frontend/js/library.js:8007 |
| `mediaRowKey` | frontend/js/library.js:8000 |
| `metaLine` | frontend/js/library.js:3695 |
| `newBookmarkGroup` | frontend/js/library.js:10641 |
| `ocrAllText` | frontend/js/library.js:7064 |
| `ocrApplyFind` | frontend/js/library.js:6478 |
| `ocrApplyZoom` | frontend/js/library.js:5804 |
| `ocrAskRange` | frontend/js/library.js:6957 |
| `ocrBase` | frontend/js/library.js:7657 |
| `ocrBinField` | frontend/js/library.js:7713 |
| `ocrBinPage` | frontend/js/library.js:7708 |
| `ocrBuildPageRail` | frontend/js/library.js:5212 |
| `ocrBuildScrollPages` | frontend/js/library.js:6022 |
| `ocrCan` | frontend/js/library.js:6364 |
| `ocrCanOpen` | frontend/js/library.js:5423 |
| `ocrChooseReader` | frontend/js/library.js:6400 |
| `ocrCleanLoops` | frontend/js/library.js:7721 |
| `ocrClearRegionSelection` | frontend/js/library.js:4594 |
| `ocrCloseEdit` | frontend/js/library.js:7058 |
| `ocrDockApply` | frontend/js/library.js:6762 |
| `ocrDockFits` | frontend/js/library.js:6738 |
| `ocrDocumentReading` | frontend/js/library.js:4886 |
| `ocrFetchFileText` | frontend/js/library.js:5430 |
| `ocrFieldText` | frontend/js/library.js:7672 |
| `ocrFitDock` | frontend/js/library.js:6772 |
| `ocrFitLiveText` | frontend/js/library.js:4084 |
| `ocrFitStage` | frontend/js/library.js:5700 |
| `ocrIsLocal` | frontend/js/library.js:6357 |
| `ocrIsPdf` | frontend/js/library.js:3824 |
| `ocrIsTextFile` | frontend/js/library.js:5416 |
| `ocrKeepCentre` | frontend/js/library.js:5887 |
| `ocrLiveTextSelection` | frontend/js/library.js:4101 |
| `ocrLoadPage` | frontend/js/library.js:4946 |
| `ocrLoadReaders` | frontend/js/library.js:6148 |
| `ocrLoadReadersNow` | frontend/js/library.js:6153 |
| `ocrLoadSiblings` | frontend/js/library.js:5383 |
| `ocrLocalName` | frontend/js/library.js:6373 |
| `ocrMoveOverlays` | frontend/js/library.js:4586 |
| `ocrNaturalScale` | frontend/js/library.js:5800 |
| `ocrOfferBinUndo` | frontend/js/library.js:7692 |
| `ocrOfferTextUndo` | frontend/js/library.js:7686 |
| `ocrOpenEdit` | frontend/js/library.js:7048 |
| `ocrOpenReaderSettings` | frontend/js/library.js:6887 |
| `ocrOpenSibling` | frontend/js/library.js:5577 |
| `ocrPageImageUrl` | frontend/js/library.js:3847 |
| `ocrPaintEmpty` | frontend/js/library.js:6976 |
| `ocrPaintLiveText` | frontend/js/library.js:4058 |
| `ocrPaintRegionRect` | frontend/js/library.js:4604 |
| `ocrPlaceRegionPopover` | frontend/js/library.js:4621 |
| `ocrRailKey` | frontend/js/library.js:5262 |
| `ocrReadImage` | frontend/js/library.js:6508 |
| `ocrReadInFlight` | frontend/js/library.js:3929 |
| `ocrReadMenuItems` | frontend/js/library.js:6902 |
| `ocrReadRange` | frontend/js/library.js:6642 |
| `ocrReader` | frontend/js/library.js:6350 |
| `ocrReaderName` | frontend/js/library.js:6388 |
| `ocrReaderNameFor` | frontend/js/library.js:6377 |
| `ocrRefusedPress` | frontend/js/library.js:6342 |
| `ocrRegionCrop` | frontend/js/library.js:4685 |
| `ocrRegionPage` | frontend/js/library.js:6431 |
| `ocrRegionPoint` | frontend/js/library.js:4669 |
| `ocrRegionsUrl` | frontend/js/library.js:3828 |
| `ocrRenderOtherReadings` | frontend/js/library.js:3979 |
| `ocrRenderRail` | frontend/js/library.js:5528 |
| `ocrRenderRailSwitch` | frontend/js/library.js:5444 |
| `ocrRenderRegions` | frontend/js/library.js:4122 |
| `ocrRepaintReading` | frontend/js/library.js:7661 |
| `ocrRevealRegionsForPage` | frontend/js/library.js:6459 |
| `ocrRoveKeys` | frontend/js/library.js:7019 |
| `ocrRoveSync` | frontend/js/library.js:7010 |
| `ocrRunRegion` | frontend/js/library.js:4783 |
| `ocrScheduleFitDock` | frontend/js/library.js:6813 |
| `ocrScrollToPage` | frontend/js/library.js:6081 |
| `ocrSelectImage` | frontend/js/library.js:4578 |
| `ocrSelectRegion` | frontend/js/library.js:3956 |
| `ocrSelectStage` | frontend/js/library.js:4574 |
| `ocrSetViewMode` | frontend/js/library.js:5959 |
| `ocrSetZoom` | frontend/js/library.js:6892 |
| `ocrShowRegionResult` | frontend/js/library.js:4706 |
| `ocrShownZoom` | frontend/js/library.js:5842 |
| `ocrSizeStage` | frontend/js/library.js:5717 |
| `ocrStageRead` | frontend/js/library.js:6952 |
| `ocrStepPage` | frontend/js/library.js:6116 |
| `ocrStepZoom` | frontend/js/library.js:5870 |
| `ocrStopRead` | frontend/js/library.js:3936 |
| `ocrStoredPageReads` | frontend/js/library.js:4855 |
| `ocrStoredViewMode` | frontend/js/library.js:5934 |
| `ocrSyncCanRead` | frontend/js/library.js:6320 |
| `ocrSyncMoreMenu` | frontend/js/library.js:6575 |
| `ocrSyncPager` | frontend/js/library.js:6095 |
| `ocrSyncReadMenu` | frontend/js/library.js:6923 |
| `ocrSyncReaderButton` | frontend/js/library.js:6272 |
| `ocrSyncStopButton` | frontend/js/library.js:3946 |
| `ocrSyncToolsMenu` | frontend/js/library.js:6834 |
| `ocrSyncViewButtons` | frontend/js/library.js:5948 |
| `ocrSyncZoomButtons` | frontend/js/library.js:5901 |
| `ocrTearDownScroll` | frontend/js/library.js:6004 |
| `ocrTextWriter` | frontend/js/library.js:7679 |
| `ocrVisibleStages` | frontend/js/library.js:5707 |
| `ocrWatchDock` | frontend/js/library.js:6820 |
| `ocrWatchPane` | frontend/js/library.js:5766 |
| `ocrWatchScroll` | frontend/js/library.js:6056 |
| `ocrWireRegionJump` | frontend/js/library.js:6439 |
| `ocrZoomAbout` | frontend/js/library.js:5854 |
| `openBinnedNote` | frontend/js/library.js:1592 |
| `openLibraryCreatePicker` | frontend/js/library.js:2098 |
| `openLibraryItem` | frontend/js/library.js:1509 |
| `openOcrWorkspace` | frontend/js/library.js:5609 |
| `openPageReader` | frontend/js/library.js:5326 |
| `refreshLibraryPhrase` | frontend/js/library.js:1744 |
| `refreshLibrarySemantic` | frontend/js/library.js:412 |
| `refreshLibraryServerSearch` | frontend/js/library.js:1718 |
| `remindAbout` | frontend/js/library.js:12106 |
| `renameBookmarkGroup` | frontend/js/library.js:10613 |
| `renderBookmarkGroupChips` | frontend/js/library.js:10767 |
| `renderBookmarks` | frontend/js/library.js:10439 |
| `renderContents` | frontend/js/library.js:11814 |
| `renderLibrary` | frontend/js/library.js:487 |
| `renderLibraryContextBars` | frontend/js/library.js:1068 |
| `renderLibraryDocsPropertyFilter` | frontend/js/library.js:2991 |
| `renderLibraryDocuments` | frontend/js/library.js:3115 |
| `renderLibraryFilters` | frontend/js/library.js:292 |
| `renderLibraryImageOrigins` | frontend/js/library.js:8226 |
| `renderLibraryImagesGallery` | frontend/js/library.js:8061 |
| `renderLibraryOverview` | frontend/js/library.js:270 |
| `renderLibraryView` | frontend/js/library.js:193 |
| `renderSkillCards` | frontend/js/library.js:2529 |
| `renderSkillLogs` | frontend/js/library.js:2784 |
| `renderSkillsDashboard` | frontend/js/library.js:2632 |
| `reopenOcrWorkspace` | frontend/js/library.js:5299 |
| `runLibrarySearch` | frontend/js/library.js:1757 |
| `setEmptyBookmarkGroups` | frontend/js/library.js:10589 |
| `setLibraryCardStop` | frontend/js/library.js:1485 |
| `setLibraryMediaKind` | frontend/js/library.js:3597 |
| `setLibraryMediaView` | frontend/js/library.js:3555 |
| `showDetailDialog` | frontend/js/library.js:12057 |
| `shownTicksIn` | frontend/js/library.js:10180 |
| `skillCard` | frontend/js/library.js:2245 |
| `skillColumnCount` | frontend/js/library.js:2508 |
| `skillLastRunIndex` | frontend/js/library.js:2234 |
| `skillSort` | frontend/js/library.js:2441 |
| `startLibraryImagesPoll` | frontend/js/library.js:3464 |
| `stopLibraryImagesPoll` | frontend/js/library.js:3473 |
| `syncLibraryBoardsTicks` | frontend/js/library.js:10262 |
| `syncLibraryDocsSelectbar` | frontend/js/library.js:3376 |
| `syncLibraryFilterButton` | frontend/js/library.js:1794 |
| `syncLibraryMediaSelectbar` | frontend/js/library.js:8012 |
| `syncSelectAllLabels` | frontend/js/library.js:10184 |
| `syncSelectbarCount` | frontend/js/library.js:10157 |
| `toggleLibrarySelection` | frontend/js/library.js:1110 |
| `trackOcrRead` | frontend/js/library.js:3898 |
| `updateLibraryCreateButton` | frontend/js/library.js:2183 |
| `watchLibraryColumns` | frontend/js/library.js:473 |
| `watchSkillColumns` | frontend/js/library.js:2519 |
| `withLibraryCopyActions` | frontend/js/library.js:739 |

### frontend/js/lightbox-view.js (3)

| Name | File:line |
|---|---|
| `codeScanner` | frontend/js/lightbox-view.js:1966 |
| `highlightCodeInto` | frontend/js/lightbox-view.js:1939 |
| `openLightbox` | frontend/js/lightbox-view.js:25 |

### frontend/js/link-types.js (8)

| Name | File:line |
|---|---|
| `linkPropsParse` | frontend/js/link-types.js:19 |
| `linkPropsText` | frontend/js/link-types.js:15 |
| `linkTypesList` | frontend/js/link-types.js:10 |
| `newRelationType` | frontend/js/link-types.js:55 |
| `openLinkTypeSheet` | frontend/js/link-types.js:67 |
| `openRelationTypesSheet` | frontend/js/link-types.js:128 |
| `relationTypeDeleteUndo` | frontend/js/link-types.js:39 |
| `relationTypesRepaint` | frontend/js/link-types.js:37 |

### frontend/js/margin-reader.js (7)

| Name | File:line |
|---|---|
| `applyMarginReader` | frontend/js/margin-reader.js:173 |
| `marginAsk` | frontend/js/margin-reader.js:122 |
| `marginCard` | frontend/js/margin-reader.js:59 |
| `marginOffNote` | frontend/js/margin-reader.js:160 |
| `marginParagraphAtCaret` | frontend/js/margin-reader.js:38 |
| `marginRender` | frontend/js/margin-reader.js:107 |
| `marginSchedule` | frontend/js/margin-reader.js:167 |

### frontend/js/meetings.js (59)

| Name | File:line |
|---|---|
| `addMeetingMarker` | frontend/js/meetings.js:1550 |
| `binRecording` | frontend/js/meetings.js:1398 |
| `closeMeetingRecorder` | frontend/js/meetings.js:893 |
| `meetingActionRow` | frontend/js/meetings.js:265 |
| `meetingAppendUndoable` | frontend/js/meetings.js:542 |
| `meetingBinPair` | frontend/js/meetings.js:108 |
| `meetingClockText` | frontend/js/meetings.js:628 |
| `meetingContainerName` | frontend/js/meetings.js:641 |
| `meetingCreateUndoable` | frontend/js/meetings.js:561 |
| `meetingElapsedMs` | frontend/js/meetings.js:623 |
| `meetingElapsedText` | frontend/js/meetings.js:636 |
| `meetingFormRow` | frontend/js/meetings.js:89 |
| `meetingNowValue` | frontend/js/meetings.js:18 |
| `meetingPeaksSummary` | frontend/js/meetings.js:676 |
| `meetingPeopleField` | frontend/js/meetings.js:40 |
| `meetingRecordInto` | frontend/js/meetings.js:576 |
| `meetingRecordingStarted` | frontend/js/meetings.js:964 |
| `meetingRecordingStopped` | frontend/js/meetings.js:988 |
| `meetingRemind` | frontend/js/meetings.js:306 |
| `meetingSaveTranscript` | frontend/js/meetings.js:514 |
| `meetingSay` | frontend/js/meetings.js:959 |
| `meetingSummarise` | frontend/js/meetings.js:424 |
| `meetingTakeAppend` | frontend/js/meetings.js:661 |
| `meetingTakeBegin` | frontend/js/meetings.js:645 |
| `meetingTakeDiscard` | frontend/js/meetings.js:1042 |
| `meetingTakeFinish` | frontend/js/meetings.js:687 |
| `meetingTranscribeTake` | frontend/js/meetings.js:1019 |
| `meetingWhenText` | frontend/js/meetings.js:29 |
| `noteRecoveredRecordings` | frontend/js/meetings.js:1143 |
| `openMeetingRecorder` | frontend/js/meetings.js:871 |
| `openMeetingSheet` | frontend/js/meetings.js:334 |
| `openNewMeeting` | frontend/js/meetings.js:131 |
| `openRecordingTrim` | frontend/js/meetings.js:1429 |
| `openRecordings` | frontend/js/meetings.js:1181 |
| `openVoiceNote` | frontend/js/meetings.js:885 |
| `recordingFacts` | frontend/js/meetings.js:1219 |
| `recordingMarkers` | frontend/js/meetings.js:1366 |
| `recordingMenu` | frontend/js/meetings.js:1379 |
| `recordingPaint` | frontend/js/meetings.js:1341 |
| `recordingReady` | frontend/js/meetings.js:1272 |
| `recordingRow` | frontend/js/meetings.js:1230 |
| `recordingSpeed` | frontend/js/meetings.js:1294 |
| `recordingTrimField` | frontend/js/meetings.js:1474 |
| `recordingWav` | frontend/js/meetings.js:1518 |
| `recordingWave` | frontend/js/meetings.js:1312 |
| `recordingsEmpty` | frontend/js/meetings.js:1212 |
| `renameRecording` | frontend/js/meetings.js:1389 |
| `renderRecordings` | frontend/js/meetings.js:1195 |
| `resetMeetingUI` | frontend/js/meetings.js:850 |
| `saveMeetingDocument` | frontend/js/meetings.js:1092 |
| `saveMeetingNote` | frontend/js/meetings.js:1132 |
| `saveVoiceNoteText` | frontend/js/meetings.js:1150 |
| `setMeetingState` | frontend/js/meetings.js:833 |
| `startMeetingWave` | frontend/js/meetings.js:713 |
| `stopMeetingTimer` | frontend/js/meetings.js:814 |
| `toggleMeetingPause` | frontend/js/meetings.js:1064 |
| `toggleMeetingRecording` | frontend/js/meetings.js:911 |
| `transcribeRecording` | frontend/js/meetings.js:1411 |
| `trimRecording` | frontend/js/meetings.js:1494 |

### frontend/js/model-bench.js (7)

| Name | File:line |
|---|---|
| `benchFailureText` | frontend/js/model-bench.js:17 |
| `benchPercent` | frontend/js/model-bench.js:13 |
| `benchRow` | frontend/js/model-bench.js:22 |
| `benchShowReport` | frontend/js/model-bench.js:81 |
| `benchStatusLine` | frontend/js/model-bench.js:88 |
| `renderModelBench` | frontend/js/model-bench.js:100 |
| `runModelBench` | frontend/js/model-bench.js:138 |

### frontend/js/nav-history.js (11)

| Name | File:line |
|---|---|
| `navHistoryCaption` | frontend/js/nav-history.js:25 |
| `navHistoryClear` | frontend/js/nav-history.js:215 |
| `navHistoryEdited` | frontend/js/nav-history.js:224 |
| `navHistoryForget` | frontend/js/nav-history.js:202 |
| `navHistoryGroups` | frontend/js/nav-history.js:106 |
| `navHistoryItem` | frontend/js/nav-history.js:122 |
| `navHistoryNoteTitle` | frontend/js/nav-history.js:35 |
| `navHistoryPlain` | frontend/js/nav-history.js:47 |
| `navHistoryRow` | frontend/js/nav-history.js:62 |
| `navHistoryTabIcon` | frontend/js/nav-history.js:53 |
| `renderNavHistoryMenu` | frontend/js/nav-history.js:231 |

### frontend/js/note-edit-panels.js (10)

| Name | File:line |
|---|---|
| `closeNoteForm` | frontend/js/note-edit-panels.js:583 |
| `forgetNoteEditLocally` | frontend/js/note-edit-panels.js:610 |
| `keepNoteEditLocally` | frontend/js/note-edit-panels.js:606 |
| `noteEditToolbar` | frontend/js/note-edit-panels.js:680 |
| `noteFormParts` | frontend/js/note-edit-panels.js:198 |
| `offerKeptNoteEdit` | frontend/js/note-edit-panels.js:617 |
| `openBookmarkAttachPicker` | frontend/js/note-edit-panels.js:175 |
| `renderEditForm` | frontend/js/note-edit-panels.js:212 |
| `renderNoteBookmarksWhileEditing` | frontend/js/note-edit-panels.js:83 |
| `renderRelatedWhileEditing` | frontend/js/note-edit-panels.js:26 |

### frontend/js/note-history.js (3)

| Name | File:line |
|---|---|
| `openEntryHistory` | frontend/js/note-history.js:8 |
| `toggleThenAndNow` | frontend/js/note-history.js:249 |
| `undoSkillRun` | frontend/js/note-history.js:321 |

### frontend/js/note-panels.js (8)

| Name | File:line |
|---|---|
| `beginOrCompleteLink` | frontend/js/note-panels.js:334 |
| `notePanelStillOpen` | frontend/js/note-panels.js:46 |
| `similarNoteRow` | frontend/js/note-panels.js:279 |
| `toggleFaded` | frontend/js/note-panels.js:111 |
| `toggleNotePanel` | frontend/js/note-panels.js:36 |
| `toggleNoteReminders` | frontend/js/note-panels.js:162 |
| `toggleReferences` | frontend/js/note-panels.js:205 |
| `toggleRelated` | frontend/js/note-panels.js:51 |

### frontend/js/note-pick-preview.js (4)

| Name | File:line |
|---|---|
| `notePickExcerpt` | frontend/js/note-pick-preview.js:25 |
| `notePickText` | frontend/js/note-pick-preview.js:20 |
| `notePickThumb` | frontend/js/note-pick-preview.js:44 |
| `richPickerNote` | frontend/js/note-pick-preview.js:59 |

### frontend/js/note-properties.js (12)

| Name | File:line |
|---|---|
| `fillQueryRollups` | frontend/js/note-properties.js:420 |
| `noteTypeColourHex` | frontend/js/note-properties.js:251 |
| `noteTypeDeleteUndo` | frontend/js/note-properties.js:309 |
| `noteTypeFieldsParse` | frontend/js/note-properties.js:322 |
| `noteTypePickColour` | frontend/js/note-properties.js:260 |
| `openNotePropertiesSheet` | frontend/js/note-properties.js:38 |
| `openNoteTypesSheet` | frontend/js/note-properties.js:164 |
| `openQueryTable` | frontend/js/note-properties.js:333 |
| `propInput` | frontend/js/note-properties.js:14 |
| `propRead` | frontend/js/note-properties.js:30 |
| `queryTableRollupFoot` | frontend/js/note-properties.js:396 |
| `showQueryOnGraph` | frontend/js/note-properties.js:467 |

### frontend/js/note-templates.js (9)

| Name | File:line |
|---|---|
| `chooseNoteTemplate` | frontend/js/note-templates.js:67 |
| `noteTemplateFill` | frontend/js/note-templates.js:56 |
| `noteTemplateListKeys` | frontend/js/note-templates.js:120 |
| `noteTemplateRows` | frontend/js/note-templates.js:62 |
| `openNoteTemplateDialog` | frontend/js/note-templates.js:141 |
| `placeTemplateCaret` | frontend/js/note-templates.js:185 |
| `showNoteTemplatePreview` | frontend/js/note-templates.js:83 |
| `templateCatalogue` | frontend/js/note-templates.js:22 |
| `useNoteTemplate` | frontend/js/note-templates.js:95 |

### frontend/js/notes-rail-spy.js (4)

| Name | File:line |
|---|---|
| `notesRailMark` | frontend/js/notes-rail-spy.js:91 |
| `notesSpyActive` | frontend/js/notes-rail-spy.js:33 |
| `notesSpyPick` | frontend/js/notes-rail-spy.js:45 |
| `notesSpySchedule` | frontend/js/notes-rail-spy.js:83 |

### frontend/js/ocr-engine.js (9)

| Name | File:line |
|---|---|
| `ocrEngineFollow` | frontend/js/ocr-engine.js:309 |
| `ocrEngineLanguageName` | frontend/js/ocr-engine.js:77 |
| `ocrEngineLanguagePicker` | frontend/js/ocr-engine.js:235 |
| `ocrEngineMount` | frontend/js/ocr-engine.js:41 |
| `ocrEnginePaint` | frontend/js/ocr-engine.js:84 |
| `ocrEnginePaintAll` | frontend/js/ocr-engine.js:66 |
| `ocrEnginePaintFailure` | frontend/js/ocr-engine.js:212 |
| `ocrEngineStartInstall` | frontend/js/ocr-engine.js:286 |
| `ocrEngineStatusLine` | frontend/js/ocr-engine.js:223 |

### frontend/js/onboarding.js (13)

| Name | File:line |
|---|---|
| `closeOnboarding` | frontend/js/onboarding.js:351 |
| `firstRunSurfaceOpen` | frontend/js/onboarding.js:296 |
| `firstRunTurn` | frontend/js/onboarding.js:312 |
| `loadOnboardingDiagnostics` | frontend/js/onboarding.js:68 |
| `maybeShowConsoleViewIntro` | frontend/js/onboarding.js:405 |
| `onboardingBack` | frontend/js/onboarding.js:387 |
| `onboardingNext` | frontend/js/onboarding.js:368 |
| `openOnboarding` | frontend/js/onboarding.js:338 |
| `renderOnboardingActions` | frontend/js/onboarding.js:129 |
| `renderOnboardingSlide` | frontend/js/onboarding.js:224 |
| `showOnboarding` | frontend/js/onboarding.js:343 |
| `showOnboardingTurn` | frontend/js/onboarding.js:321 |
| `whenFirstRunClear` | frontend/js/onboarding.js:305 |

### frontend/js/pick-row.js (3)

| Name | File:line |
|---|---|
| `notePickerRow` | frontend/js/pick-row.js:7 |
| `notePickerThumb` | frontend/js/pick-row.js:64 |
| `updateNotePickerCount` | frontend/js/pick-row.js:79 |

### frontend/js/questions-view.js (6)

| Name | File:line |
|---|---|
| `initQuestionsView` | frontend/js/questions-view.js:148 |
| `loadQuestions` | frontend/js/questions-view.js:72 |
| `questionButton` | frontend/js/questions-view.js:19 |
| `questionRow` | frontend/js/questions-view.js:25 |
| `questionWhen` | frontend/js/questions-view.js:14 |
| `questionsForNote` | frontend/js/questions-view.js:140 |

### frontend/js/quick-access.js (8)

| Name | File:line |
|---|---|
| `quickAccessCommit` | frontend/js/quick-access.js:29 |
| `quickAccessEdit` | frontend/js/quick-access.js:119 |
| `quickAccessLeave` | frontend/js/quick-access.js:21 |
| `quickAccessManage` | frontend/js/quick-access.js:187 |
| `quickAccessMoved` | frontend/js/quick-access.js:165 |
| `quickAccessPickTint` | frontend/js/quick-access.js:80 |
| `quickAccessReslotted` | frontend/js/quick-access.js:178 |
| `quickAccessTile` | frontend/js/quick-access.js:36 |

### frontend/js/quick-note.js (23)

| Name | File:line |
|---|---|
| `clearQuickNote` | frontend/js/quick-note.js:248 |
| `clipPastedLink` | frontend/js/quick-note.js:349 |
| `createNoteSafely` | frontend/js/quick-note.js:74 |
| `flushNoteOutbox` | frontend/js/quick-note.js:96 |
| `keepQuickNoteDraft` | frontend/js/quick-note.js:238 |
| `newNoteClientKey` | frontend/js/quick-note.js:54 |
| `noteOutbox` | frontend/js/quick-note.js:30 |
| `noteOutboxAdd` | frontend/js/quick-note.js:64 |
| `noteServerGone` | frontend/js/quick-note.js:59 |
| `openQuickNote` | frontend/js/quick-note.js:208 |
| `pasteClipboardAsNote` | frontend/js/quick-note.js:413 |
| `quickNoteBox` | frontend/js/quick-note.js:198 |
| `quickNoteReminder` | frontend/js/quick-note.js:311 |
| `quickNoteStatus` | frontend/js/quick-note.js:202 |
| `quickNoteToCapture` | frontend/js/quick-note.js:327 |
| `reminderFromChatAnswer` | frontend/js/quick-note.js:479 |
| `renderNoteOutbox` | frontend/js/quick-note.js:139 |
| `renderPendingNoteRows` | frontend/js/quick-note.js:157 |
| `returnNoteToCapture` | frontend/js/quick-note.js:129 |
| `saveChatAnswerAsNote` | frontend/js/quick-note.js:452 |
| `saveQuickNote` | frontend/js/quick-note.js:256 |
| `scheduleNoteOutboxFlush` | frontend/js/quick-note.js:88 |
| `writeNoteOutbox` | frontend/js/quick-note.js:42 |

### frontend/js/quickadd.js (37)

| Name | File:line |
|---|---|
| `magicAddReminder` | frontend/js/quickadd.js:436 |
| `noteOfferKey` | frontend/js/quickadd.js:586 |
| `noteOfferReplace` | frontend/js/quickadd.js:668 |
| `noteOfferTake` | frontend/js/quickadd.js:690 |
| `noteOffersAttach` | frontend/js/quickadd.js:593 |
| `noteOffersDraw` | frontend/js/quickadd.js:649 |
| `noteOffersFetch` | frontend/js/quickadd.js:620 |
| `noteOffersSchedule` | frontend/js/quickadd.js:615 |
| `qaChipValue` | frontend/js/quickadd.js:153 |
| `qaChipWords` | frontend/js/quickadd.js:167 |
| `qaDateTime` | frontend/js/quickadd.js:93 |
| `qaDayWords` | frontend/js/quickadd.js:147 |
| `qaDraw` | frontend/js/quickadd.js:271 |
| `qaDue` | frontend/js/quickadd.js:372 |
| `qaFetch` | frontend/js/quickadd.js:62 |
| `qaIntent` | frontend/js/quickadd.js:267 |
| `qaIsOn` | frontend/js/quickadd.js:258 |
| `qaKey` | frontend/js/quickadd.js:177 |
| `qaMissing` | frontend/js/quickadd.js:379 |
| `qaNow` | frontend/js/quickadd.js:53 |
| `qaPad` | frontend/js/quickadd.js:89 |
| `qaPaletteRemind` | frontend/js/quickadd.js:515 |
| `qaRange` | frontend/js/quickadd.js:140 |
| `qaRead` | frontend/js/quickadd.js:226 |
| `qaRecurring` | frontend/js/quickadd.js:127 |
| `qaSchedule` | frontend/js/quickadd.js:211 |
| `qaSeconds` | frontend/js/quickadd.js:114 |
| `qaSetAsk` | frontend/js/quickadd.js:303 |
| `qaSlotsOf` | frontend/js/quickadd.js:312 |
| `qaSpans` | frontend/js/quickadd.js:240 |
| `qaStart` | frontend/js/quickadd.js:216 |
| `qaTimelineEnter` | frontend/js/quickadd.js:475 |
| `quickAddAsk` | frontend/js/quickadd.js:405 |
| `quickAddAttach` | frontend/js/quickadd.js:186 |
| `quickAddClear` | frontend/js/quickadd.js:415 |
| `quickAddPaletteRow` | frontend/js/quickadd.js:496 |
| `quickAddSlots` | frontend/js/quickadd.js:394 |

### frontend/js/reveal-targets.js (17)

| Name | File:line |
|---|---|
| `foldedText` | frontend/js/reveal-targets.js:622 |
| `markNotePassage` | frontend/js/reveal-targets.js:651 |
| `notePassageFor` | frontend/js/reveal-targets.js:610 |
| `passageRange` | frontend/js/reveal-targets.js:637 |
| `revealBoard` | frontend/js/reveal-targets.js:155 |
| `revealBoardsGallery` | frontend/js/reveal-targets.js:527 |
| `revealDashWidget` | frontend/js/reveal-targets.js:174 |
| `revealDetails` | frontend/js/reveal-targets.js:65 |
| `revealDocument` | frontend/js/reveal-targets.js:145 |
| `revealEntryMenu` | frontend/js/reveal-targets.js:82 |
| `revealFeature` | frontend/js/reveal-targets.js:540 |
| `revealGraphOptions` | frontend/js/reveal-targets.js:135 |
| `revealLibrarySub` | frontend/js/reveal-targets.js:536 |
| `revealQuery` | frontend/js/reveal-targets.js:72 |
| `revealStrip` | frontend/js/reveal-targets.js:127 |
| `revealSubmenuFor` | frontend/js/reveal-targets.js:109 |
| `revealWait` | frontend/js/reveal-targets.js:45 |

### frontend/js/run-core.js (8)

| Name | File:line |
|---|---|
| `runBase` | frontend/js/run-core.js:73 |
| `runDebugScript` | frontend/js/run-core.js:114 |
| `runIsP5` | frontend/js/run-core.js:106 |
| `runLanguage` | frontend/js/run-core.js:190 |
| `runPrepare` | frontend/js/run-core.js:197 |
| `runStripTypes` | frontend/js/run-core.js:87 |
| `runVendorFetch` | frontend/js/run-core.js:35 |
| `runVendorScript` | frontend/js/run-core.js:53 |

### frontend/js/run-debug.js (3)

| Name | File:line |
|---|---|
| `runDebugEdit` | frontend/js/run-debug.js:39 |
| `runDebugLower` | frontend/js/run-debug.js:54 |
| `runDebugQuote` | frontend/js/run-debug.js:46 |

### frontend/js/run-tests.js (3)

| Name | File:line |
|---|---|
| `runLooksLikeTests` | frontend/js/run-tests.js:15 |
| `runTestHarness` | frontend/js/run-tests.js:25 |
| `runTestHarnessSource` | frontend/js/run-tests.js:157 |

### frontend/js/search.js (30)

| Name | File:line |
|---|---|
| `closeFinder` | frontend/js/search.js:655 |
| `finderActions` | frontend/js/search.js:109 |
| `finderFeatureOffer` | frontend/js/search.js:352 |
| `finderKindOffer` | frontend/js/search.js:295 |
| `finderMove` | frontend/js/search.js:614 |
| `finderOffer` | frontend/js/search.js:286 |
| `finderOverlay` | frontend/js/search.js:104 |
| `finderRender` | frontend/js/search.js:442 |
| `finderRenderEmpty` | frontend/js/search.js:234 |
| `finderRenderFilters` | frontend/js/search.js:381 |
| `finderRenderNothing` | frontend/js/search.js:262 |
| `finderResultsRole` | frontend/js/search.js:230 |
| `finderSavedAs` | frontend/js/search.js:668 |
| `finderSearch` | frontend/js/search.js:131 |
| `finderSorted` | frontend/js/search.js:212 |
| `finderSpellingOffer` | frontend/js/search.js:339 |
| `finderSpellings` | frontend/js/search.js:327 |
| `finderSyncFilterEdges` | frontend/js/search.js:375 |
| `finderUse` | frontend/js/search.js:306 |
| `finderWhyNothing` | frontend/js/search.js:280 |
| `finderWordlist` | frontend/js/search.js:316 |
| `forgetSavedFind` | frontend/js/search.js:777 |
| `openFinder` | frontend/js/search.js:637 |
| `persistSavedFinds` | frontend/js/search.js:738 |
| `renameSavedFind` | frontend/js/search.js:768 |
| `renderSavedFinds` | frontend/js/search.js:786 |
| `saveFinderSearch` | frontend/js/search.js:747 |
| `savedFinds` | frontend/js/search.js:734 |
| `syncFinderStar` | frontend/js/search.js:672 |
| `wireFinder` | frontend/js/search.js:682 |

### frontend/js/semantic-notice.js (5)

| Name | File:line |
|---|---|
| `semanticDecline` | frontend/js/semantic-notice.js:38 |
| `semanticInstallNotice` | frontend/js/semantic-notice.js:70 |
| `semanticNoticeSeenBefore` | frontend/js/semantic-notice.js:21 |
| `semanticOnboardingOffer` | frontend/js/semantic-notice.js:109 |
| `semanticSetAutoInstall` | frontend/js/semantic-notice.js:29 |

### frontend/js/settings-controls.js (30)

| Name | File:line |
|---|---|
| `addMemoryByHand` | frontend/js/settings-controls.js:1559 |
| `addPersona` | frontend/js/settings-controls.js:1195 |
| `addSkill` | frontend/js/settings-controls.js:1793 |
| `addTemplate` | frontend/js/settings-controls.js:1385 |
| `applyBackendChoice` | frontend/js/settings-controls.js:1127 |
| `applyChatModel` | frontend/js/settings-controls.js:1309 |
| `applyOcrModel` | frontend/js/settings-controls.js:1325 |
| `applyUtilityModel` | frontend/js/settings-controls.js:1344 |
| `applyVisionModel` | frontend/js/settings-controls.js:1363 |
| `chosenSkillTools` | frontend/js/settings-controls.js:1855 |
| `chosenSkillVerify` | frontend/js/settings-controls.js:1834 |
| `deleteProfile` | frontend/js/settings-controls.js:1748 |
| `exportFullBackup` | frontend/js/settings-controls.js:1736 |
| `findDuplicates` | frontend/js/settings-controls.js:1517 |
| `mergeDuplicateGroup` | frontend/js/settings-controls.js:1638 |
| `mergeNamedPrompts` | frontend/js/settings-controls.js:1761 |
| `refreshSearxngHost` | frontend/js/settings-controls.js:1009 |
| `renderDuplicateGroups` | frontend/js/settings-controls.js:1580 |
| `renderLanAccess` | frontend/js/settings-controls.js:2028 |
| `renderLanState` | frontend/js/settings-controls.js:1988 |
| `renderMcpSnippet` | frontend/js/settings-controls.js:1964 |
| `renderStatusBarSettings` | frontend/js/settings-controls.js:1908 |
| `resetAllFeatureModels` | frontend/js/settings-controls.js:1292 |
| `restartMemoryMap` | frontend/js/settings-controls.js:1493 |
| `restoreFullBackup` | frontend/js/settings-controls.js:1699 |
| `runEmbeddingFallback` | frontend/js/settings-controls.js:1228 |
| `saveExportSaveDir` | frontend/js/settings-controls.js:1542 |
| `saveModelContextWindow` | frontend/js/settings-controls.js:1162 |
| `saveRunBudget` | frontend/js/settings-controls.js:1423 |
| `saveWebSearchSettings` | frontend/js/settings-controls.js:1460 |

### frontend/js/settings-data.js (14)

| Name | File:line |
|---|---|
| `backupNow` | frontend/js/settings-data.js:271 |
| `humanBytes` | frontend/js/settings-data.js:206 |
| `importDirectory` | frontend/js/settings-data.js:282 |
| `importDocument` | frontend/js/settings-data.js:389 |
| `importMarkdown` | frontend/js/settings-data.js:334 |
| `privacyDestinationRow` | frontend/js/settings-data.js:13 |
| `privacyWhen` | frontend/js/settings-data.js:8 |
| `renderBackupRetention` | frontend/js/settings-data.js:258 |
| `renderBackups` | frontend/js/settings-data.js:142 |
| `renderIntegrityNotice` | frontend/js/settings-data.js:246 |
| `renderPrivacyRange` | frontend/js/settings-data.js:42 |
| `renderPrivacyReceipt` | frontend/js/settings-data.js:91 |
| `renderStorageSpaceNotice` | frontend/js/settings-data.js:225 |
| `undoImport` | frontend/js/settings-data.js:305 |

### frontend/js/settings-find.js (32)

| Name | File:line |
|---|---|
| `findSettings` | frontend/js/settings-find.js:124 |
| `helpAlternation` | frontend/js/settings-find.js:559 |
| `helpApplySearch` | frontend/js/settings-find.js:666 |
| `helpEmphasis` | frontend/js/settings-find.js:565 |
| `helpFill` | frontend/js/settings-find.js:586 |
| `helpMarks` | frontend/js/settings-find.js:599 |
| `helpMatches` | frontend/js/settings-find.js:657 |
| `helpQueryTerms` | frontend/js/settings-find.js:653 |
| `helpSearchBind` | frontend/js/settings-find.js:707 |
| `helpTopicLink` | frontend/js/settings-find.js:528 |
| `helpTopicPaint` | frontend/js/settings-find.js:613 |
| `helpTopicRow` | frontend/js/settings-find.js:627 |
| `openSettingRow` | frontend/js/settings-find.js:172 |
| `renderHelpTopics` | frontend/js/settings-find.js:722 |
| `renderSettingResults` | frontend/js/settings-find.js:193 |
| `settingQueryAlts` | frontend/js/settings-find.js:110 |
| `settingResultsKey` | frontend/js/settings-find.js:219 |
| `settingRowText` | frontend/js/settings-find.js:33 |
| `settingRows` | frontend/js/settings-find.js:45 |
| `settingWordAlts` | frontend/js/settings-find.js:99 |
| `settingWordsAsk` | frontend/js/settings-find.js:88 |
| `settingsIndexBuild` | frontend/js/settings-find.js:407 |
| `settingsIndexClear` | frontend/js/settings-find.js:373 |
| `settingsIndexGo` | frontend/js/settings-find.js:290 |
| `settingsIndexHeads` | frontend/js/settings-find.js:251 |
| `settingsIndexJump` | frontend/js/settings-find.js:382 |
| `settingsIndexList` | frontend/js/settings-find.js:282 |
| `settingsIndexMark` | frontend/js/settings-find.js:341 |
| `settingsIndexOffset` | frontend/js/settings-find.js:276 |
| `settingsIndexWatchSection` | frontend/js/settings-find.js:496 |
| `settingsNavFollow` | frontend/js/settings-find.js:318 |
| `settingsPaneTitleHead` | frontend/js/settings-find.js:268 |

### frontend/js/settings-models.js (27)

| Name | File:line |
|---|---|
| `buildModelCard` | frontend/js/settings-models.js:310 |
| `checkCustomModel` | frontend/js/settings-models.js:659 |
| `modelBase` | frontend/js/settings-models.js:68 |
| `modelBytes` | frontend/js/settings-models.js:291 |
| `modelCancel` | frontend/js/settings-models.js:184 |
| `modelCardFor` | frontend/js/settings-models.js:443 |
| `modelDisplayName` | frontend/js/settings-models.js:109 |
| `modelDownload` | frontend/js/settings-models.js:165 |
| `modelFacts` | frontend/js/settings-models.js:133 |
| `modelFitTitle` | frontend/js/settings-models.js:124 |
| `modelGb` | frontend/js/settings-models.js:114 |
| `modelGroupOpen` | frontend/js/settings-models.js:470 |
| `modelHidesBig` | frontend/js/settings-models.js:60 |
| `modelInstalledName` | frontend/js/settings-models.js:78 |
| `modelMenuItems` | frontend/js/settings-models.js:227 |
| `modelProgressText` | frontend/js/settings-models.js:296 |
| `modelRemove` | frontend/js/settings-models.js:216 |
| `modelRoles` | frontend/js/settings-models.js:84 |
| `modelSame` | frontend/js/settings-models.js:72 |
| `modelSignature` | frontend/js/settings-models.js:302 |
| `modelState` | frontend/js/settings-models.js:95 |
| `modelUse` | frontend/js/settings-models.js:194 |
| `paintModelHardware` | frontend/js/settings-models.js:618 |
| `renderCustomCards` | frontend/js/settings-models.js:631 |
| `renderInstalledModels` | frontend/js/settings-models.js:495 |
| `renderSuggested` | frontend/js/settings-models.js:511 |
| `updateModelProgress` | frontend/js/settings-models.js:429 |

### frontend/js/settings-packages.js (14)

| Name | File:line |
|---|---|
| `packagesBulk` | frontend/js/settings-packages.js:439 |
| `packagesBulkFromBar` | frontend/js/settings-packages.js:487 |
| `packagesCan` | frontend/js/settings-packages.js:105 |
| `packagesInstallOne` | frontend/js/settings-packages.js:388 |
| `packagesPost` | frontend/js/settings-packages.js:425 |
| `packagesReinstallOne` | frontend/js/settings-packages.js:405 |
| `packagesRemoveOne` | frontend/js/settings-packages.js:415 |
| `packagesRenderBundles` | frontend/js/settings-packages.js:114 |
| `packagesRow` | frontend/js/settings-packages.js:239 |
| `packagesRowMenu` | frontend/js/settings-packages.js:367 |
| `packagesStatusLine` | frontend/js/settings-packages.js:90 |
| `packagesSyncBar` | frontend/js/settings-packages.js:466 |
| `renderEmbedModels` | frontend/js/settings-packages.js:509 |
| `renderExtras` | frontend/js/settings-packages.js:30 |

### frontend/js/statistics.js (14)

| Name | File:line |
|---|---|
| `openStatistics` | frontend/js/statistics.js:183 |
| `paintStatistics` | frontend/js/statistics.js:164 |
| `renderWeekWidget` | frontend/js/statistics.js:248 |
| `statsChange` | frontend/js/statistics.js:66 |
| `statsChart` | frontend/js/statistics.js:53 |
| `statsDay` | frontend/js/statistics.js:60 |
| `statsNotebookSection` | frontend/js/statistics.js:117 |
| `statsRemindersSection` | frontend/js/statistics.js:135 |
| `statsSection` | frontend/js/statistics.js:30 |
| `statsTile` | frontend/js/statistics.js:17 |
| `statsTiles` | frontend/js/statistics.js:45 |
| `statsUnused` | frontend/js/statistics.js:106 |
| `statsUsageSection` | frontend/js/statistics.js:141 |
| `statsWeekCard` | frontend/js/statistics.js:74 |

### frontend/js/suggestions-inbox.js (20)

| Name | File:line |
|---|---|
| `inboxCorrection` | frontend/js/suggestions-inbox.js:190 |
| `inboxCount` | frontend/js/suggestions-inbox.js:149 |
| `inboxDone` | frontend/js/suggestions-inbox.js:181 |
| `inboxEmpty` | frontend/js/suggestions-inbox.js:173 |
| `inboxHead` | frontend/js/suggestions-inbox.js:103 |
| `inboxLinkRow` | frontend/js/suggestions-inbox.js:590 |
| `inboxLinksPane` | frontend/js/suggestions-inbox.js:483 |
| `inboxMergeRow` | frontend/js/suggestions-inbox.js:230 |
| `inboxRows` | frontend/js/suggestions-inbox.js:163 |
| `inboxScore` | frontend/js/suggestions-inbox.js:222 |
| `inboxScoreBar` | frontend/js/suggestions-inbox.js:205 |
| `inboxShow` | frontend/js/suggestions-inbox.js:137 |
| `inboxTensionsPane` | frontend/js/suggestions-inbox.js:323 |
| `inboxTypeRow` | frontend/js/suggestions-inbox.js:269 |
| `inboxWhy` | frontend/js/suggestions-inbox.js:195 |
| `openSuggestionsInbox` | frontend/js/suggestions-inbox.js:35 |
| `tensionCard` | frontend/js/suggestions-inbox.js:375 |
| `tensionGapText` | frontend/js/suggestions-inbox.js:444 |
| `tensionResolve` | frontend/js/suggestions-inbox.js:432 |
| `tensionSide` | frontend/js/suggestions-inbox.js:452 |

### frontend/js/tag-manager.js (29)

| Name | File:line |
|---|---|
| `chooseTagSheet` | frontend/js/tag-manager.js:99 |
| `drawManageSuggestions` | frontend/js/tag-manager.js:333 |
| `drawTagFooter` | frontend/js/tag-manager.js:685 |
| `drawTagRows` | frontend/js/tag-manager.js:560 |
| `drawTurnedDown` | frontend/js/tag-manager.js:530 |
| `fetchTagCounts` | frontend/js/tag-manager.js:30 |
| `manageCountButton` | frontend/js/tag-manager.js:371 |
| `manageListControls` | frontend/js/tag-manager.js:274 |
| `manageLookAlikeKey` | frontend/js/tag-manager.js:310 |
| `manageLookAlikes` | frontend/js/tag-manager.js:317 |
| `manageRecent` | frontend/js/tag-manager.js:256 |
| `manageSorted` | frontend/js/tag-manager.js:266 |
| `manageStore` | frontend/js/tag-manager.js:247 |
| `manageStored` | frontend/js/tag-manager.js:239 |
| `mergeTagsInto` | frontend/js/tag-manager.js:176 |
| `openBulkTags` | frontend/js/tag-manager.js:714 |
| `openTagsSheet` | frontend/js/tag-manager.js:414 |
| `refreshAfterTagEdit` | frontend/js/tag-manager.js:35 |
| `removeTagFromNote` | frontend/js/tag-manager.js:205 |
| `removeTagsEverywhere` | frontend/js/tag-manager.js:189 |
| `renameTagEverywhere` | frontend/js/tag-manager.js:155 |
| `retargetTagFilter` | frontend/js/tag-manager.js:47 |
| `runTagEdit` | frontend/js/tag-manager.js:65 |
| `showTagNotes` | frontend/js/tag-manager.js:209 |
| `tagManagerHead` | frontend/js/tag-manager.js:389 |
| `tagMenuItems` | frontend/js/tag-manager.js:215 |
| `tagNamesWords` | frontend/js/tag-manager.js:22 |
| `tagNotesWord` | frontend/js/tag-manager.js:19 |
| `wireTagKeys` | frontend/js/tag-manager.js:651 |

### frontend/js/tag-suggest.js (8)

| Name | File:line |
|---|---|
| `answerSuggestedTags` | frontend/js/tag-suggest.js:224 |
| `closeTagSuggest` | frontend/js/tag-suggest.js:25 |
| `fillTagSuggest` | frontend/js/tag-suggest.js:58 |
| `openTagSuggest` | frontend/js/tag-suggest.js:147 |
| `placeTagSuggest` | frontend/js/tag-suggest.js:39 |
| `tagSuggestSaid` | frontend/js/tag-suggest.js:121 |
| `tagSuggestToken` | frontend/js/tag-suggest.js:19 |
| `takeTagSuggest` | frontend/js/tag-suggest.js:132 |

### frontend/js/tidy.js (21)

| Name | File:line |
|---|---|
| `openTidySheet` | frontend/js/tidy.js:84 |
| `tidyAfterChange` | frontend/js/tidy.js:594 |
| `tidyApply` | frontend/js/tidy.js:555 |
| `tidyApplyWords` | frontend/js/tidy.js:542 |
| `tidyBadge` | frontend/js/tidy.js:35 |
| `tidyCounts` | frontend/js/tidy.js:222 |
| `tidyDismiss` | frontend/js/tidy.js:472 |
| `tidyFoot` | frontend/js/tidy.js:491 |
| `tidyHead` | frontend/js/tidy.js:185 |
| `tidyHistory` | frontend/js/tidy.js:612 |
| `tidyOverview` | frontend/js/tidy.js:292 |
| `tidyOverviewDraw` | frontend/js/tidy.js:241 |
| `tidyOverviewRow` | frontend/js/tidy.js:250 |
| `tidyPatterns` | frontend/js/tidy.js:162 |
| `tidyRow` | frontend/js/tidy.js:418 |
| `tidyRows` | frontend/js/tidy.js:405 |
| `tidyRunLinkReasons` | frontend/js/tidy.js:603 |
| `tidyShow` | frontend/js/tidy.js:304 |
| `tidyTitle` | frontend/js/tidy.js:231 |
| `tidyTools` | frontend/js/tidy.js:345 |
| `tidyWatchList` | frontend/js/tidy.js:59 |

### frontend/js/tour.js (47)

| Name | File:line |
|---|---|
| `openTour` | frontend/js/tour.js:1749 |
| `renderTourReplay` | frontend/js/tour.js:1944 |
| `tourActiveTab` | frontend/js/tour.js:1245 |
| `tourAnchorFor` | frontend/js/tour.js:629 |
| `tourBack` | frontend/js/tour.js:1841 |
| `tourBlockPanels` | frontend/js/tour.js:932 |
| `tourBringIntoView` | frontend/js/tour.js:1041 |
| `tourCandidates` | frontend/js/tour.js:845 |
| `tourChoose` | frontend/js/tour.js:900 |
| `tourClamp` | frontend/js/tour.js:827 |
| `tourClearSpotlight` | frontend/js/tour.js:988 |
| `tourClearTheWay` | frontend/js/tour.js:1336 |
| `tourClose` | frontend/js/tour.js:1798 |
| `tourContext` | frontend/js/tour.js:1470 |
| `tourCovered` | frontend/js/tour.js:677 |
| `tourDisable` | frontend/js/tour.js:1982 |
| `tourFrame` | frontend/js/tour.js:1227 |
| `tourLibraryView` | frontend/js/tour.js:1404 |
| `tourNavigate` | frontend/js/tour.js:1376 |
| `tourNext` | frontend/js/tour.js:1830 |
| `tourOnScreen` | frontend/js/tour.js:645 |
| `tourOpenFoldsAround` | frontend/js/tour.js:1437 |
| `tourOpenSettings` | frontend/js/tour.js:1452 |
| `tourOrigin` | frontend/js/tour.js:811 |
| `tourOverlap` | frontend/js/tour.js:834 |
| `tourPinShell` | frontend/js/tour.js:1562 |
| `tourPlaceFixed` | frontend/js/tour.js:728 |
| `tourPosition` | frontend/js/tour.js:1080 |
| `tourPrepareSection` | frontend/js/tour.js:1496 |
| `tourReflow` | frontend/js/tour.js:1915 |
| `tourRender` | frontend/js/tour.js:1163 |
| `tourResolve` | frontend/js/tour.js:704 |
| `tourReveal` | frontend/js/tour.js:1624 |
| `tourSectionPlace` | frontend/js/tour.js:1214 |
| `tourSheetPlace` | frontend/js/tour.js:1145 |
| `tourShow` | frontend/js/tour.js:1629 |
| `tourSpotlight` | frontend/js/tour.js:1014 |
| `tourStep` | frontend/js/tour.js:1529 |
| `tourStepsFor` | frontend/js/tour.js:1728 |
| `tourStrand` | frontend/js/tour.js:1545 |
| `tourUsable` | frontend/js/tour.js:714 |
| `tourVerifyCard` | frontend/js/tour.js:1575 |
| `tourVisible` | frontend/js/tour.js:603 |
| `tourWaitForTarget` | frontend/js/tour.js:1295 |
| `tourWatch` | frontend/js/tour.js:778 |
| `tourWatchFrame` | frontend/js/tour.js:783 |
| `tourWhiteboard` | frontend/js/tour.js:1416 |

### frontend/js/translate-worker.js (5)

| Name | File:line |
|---|---|
| `translateAligned` | frontend/js/translate-worker.js:94 |
| `translateBytes` | frontend/js/translate-worker.js:88 |
| `translateLoadEngine` | frontend/js/translate-worker.js:50 |
| `translateModel` | frontend/js/translate-worker.js:100 |
| `translateRun` | frontend/js/translate-worker.js:122 |

### frontend/js/translate.js (6)

| Name | File:line |
|---|---|
| `translateAsk` | frontend/js/translate.js:51 |
| `translateCanReplace` | frontend/js/translate.js:80 |
| `translateCaught` | frontend/js/translate.js:87 |
| `translateReplace` | frontend/js/translate.js:64 |
| `translateStopWorker` | frontend/js/translate.js:43 |
| `translateWorker` | frontend/js/translate.js:22 |

### frontend/js/undo-store.js (6)

| Name | File:line |
|---|---|
| `undoStoreBoardValue` | frontend/js/undo-store.js:101 |
| `undoStoreClear` | frontend/js/undo-store.js:94 |
| `undoStoreDb` | frontend/js/undo-store.js:32 |
| `undoStoreGet` | frontend/js/undo-store.js:69 |
| `undoStorePut` | frontend/js/undo-store.js:78 |
| `undoStoreRequest` | frontend/js/undo-store.js:52 |

### frontend/js/update-dialogs.js (5)

| Name | File:line |
|---|---|
| `applyUpdateNow` | frontend/js/update-dialogs.js:132 |
| `askUpdateChoiceOnce` | frontend/js/update-dialogs.js:81 |
| `checkForUpdate` | frontend/js/update-dialogs.js:18 |
| `showSourceUpdatedDialog` | frontend/js/update-dialogs.js:242 |
| `showUpdateAvailableDialog` | frontend/js/update-dialogs.js:150 |

### frontend/js/usage-ledger.js (6)

| Name | File:line |
|---|---|
| `applySimpleMode` | frontend/js/usage-ledger.js:53 |
| `renderCaptureCommand` | frontend/js/usage-ledger.js:72 |
| `renderChatContextPop` | frontend/js/usage-ledger.js:106 |
| `renderSimpleMode` | frontend/js/usage-ledger.js:65 |
| `renderUsage` | frontend/js/usage-ledger.js:31 |
| `usageLabels` | frontend/js/usage-ledger.js:18 |

### frontend/js/utility-tools.js (12)

| Name | File:line |
|---|---|
| `countSelection` | frontend/js/utility-tools.js:109 |
| `insertTemplate` | frontend/js/utility-tools.js:126 |
| `paintUtilityChip` | frontend/js/utility-tools.js:33 |
| `startStopwatch` | frontend/js/utility-tools.js:72 |
| `startUtilityTimer` | frontend/js/utility-tools.js:64 |
| `stopUtilityClock` | frontend/js/utility-tools.js:77 |
| `utilityClockRun` | frontend/js/utility-tools.js:49 |
| `utilityClockSeconds` | frontend/js/utility-tools.js:27 |
| `utilityMinutesName` | frontend/js/utility-tools.js:58 |
| `utilitySelectedText` | frontend/js/utility-tools.js:101 |
| `utilityTimeText` | frontend/js/utility-tools.js:15 |
| `utilityTimerDone` | frontend/js/utility-tools.js:87 |

### frontend/js/vault-unlock.js (2)

| Name | File:line |
|---|---|
| `ensureVaultOpen` | frontend/js/vault-unlock.js:32 |
| `unlockPrivateNotes` | frontend/js/vault-unlock.js:11 |

### frontend/js/web-clip.js (8)

| Name | File:line |
|---|---|
| `readerBookmark` | frontend/js/web-clip.js:156 |
| `readerBookmarkMark` | frontend/js/web-clip.js:167 |
| `renderWebClip` | frontend/js/web-clip.js:31 |
| `saveWebPageAsNote` | frontend/js/web-clip.js:132 |
| `showWebReader` | frontend/js/web-clip.js:54 |
| `webClipBookmarklet` | frontend/js/web-clip.js:15 |
| `webFollowUp` | frontend/js/web-clip.js:189 |
| `webFollowUpRefers` | frontend/js/web-clip.js:185 |

### frontend/js/whiteboard-commands.js (25)

| Name | File:line |
|---|---|
| `renderWbShortcutSheet` | frontend/js/whiteboard-commands.js:343 |
| `wbClickId` | frontend/js/whiteboard-commands.js:88 |
| `wbCloseHelpSheet` | frontend/js/whiteboard-commands.js:672 |
| `wbCommandApplies` | frontend/js/whiteboard-commands.js:227 |
| `wbCommandMenuRow` | frontend/js/whiteboard-commands.js:266 |
| `wbCommandOneSketch` | frontend/js/whiteboard-commands.js:37 |
| `wbCommandSelectionCount` | frontend/js/whiteboard-commands.js:32 |
| `wbCommandTextTarget` | frontend/js/whiteboard-commands.js:43 |
| `wbCommandsLive` | frontend/js/whiteboard-commands.js:274 |
| `wbHelpRows` | frontend/js/whiteboard-commands.js:594 |
| `wbHelpSections` | frontend/js/whiteboard-commands.js:605 |
| `wbInitMoreMenu` | frontend/js/whiteboard-commands.js:490 |
| `wbOpenHelpSheet` | frontend/js/whiteboard-commands.js:660 |
| `wbPaletteActRow` | frontend/js/whiteboard-commands.js:308 |
| `wbPaletteCommands` | frontend/js/whiteboard-commands.js:288 |
| `wbPhoneCarries` | frontend/js/whiteboard-commands.js:411 |
| `wbPhoneReachable` | frontend/js/whiteboard-commands.js:395 |
| `wbRenderHelpSheet` | frontend/js/whiteboard-commands.js:611 |
| `wbRunBoardAct` | frontend/js/whiteboard-commands.js:330 |
| `wbRunCommand` | frontend/js/whiteboard-commands.js:237 |
| `wbSetSelectValue` | frontend/js/whiteboard-commands.js:384 |
| `wbSyncCommandRows` | frontend/js/whiteboard-commands.js:366 |
| `wbSyncMoreMapRows` | frontend/js/whiteboard-commands.js:456 |
| `wbSyncMoreMenu` | frontend/js/whiteboard-commands.js:425 |
| `wbTool` | frontend/js/whiteboard-commands.js:89 |

### frontend/js/whiteboard-format.js (18)

| Name | File:line |
|---|---|
| `wbFmtAngle` | frontend/js/whiteboard-format.js:185 |
| `wbFmtApply` | frontend/js/whiteboard-format.js:115 |
| `wbFmtBox` | frontend/js/whiteboard-format.js:143 |
| `wbFmtEntries` | frontend/js/whiteboard-format.js:34 |
| `wbFmtFlip` | frontend/js/whiteboard-format.js:191 |
| `wbFmtGeometry` | frontend/js/whiteboard-format.js:155 |
| `wbFmtKind` | frontend/js/whiteboard-format.js:44 |
| `wbFmtSketch` | frontend/js/whiteboard-format.js:73 |
| `wbFmtValue` | frontend/js/whiteboard-format.js:82 |
| `wbFormatClose` | frontend/js/whiteboard-format.js:252 |
| `wbFormatCommandButtons` | frontend/js/whiteboard-format.js:370 |
| `wbFormatIsOpen` | frontend/js/whiteboard-format.js:233 |
| `wbFormatOpen` | frontend/js/whiteboard-format.js:238 |
| `wbFormatPanel` | frontend/js/whiteboard-format.js:229 |
| `wbFormatSync` | frontend/js/whiteboard-format.js:282 |
| `wbFormatSyncSoon` | frontend/js/whiteboard-format.js:272 |
| `wbFormatToggle` | frontend/js/whiteboard-format.js:265 |
| `wbSetLinkRoute` | frontend/js/whiteboard-format.js:215 |

### frontend/js/whiteboard-history.js (16)

| Name | File:line |
|---|---|
| `wbChangeFromElsewhereSoon` | frontend/js/whiteboard-history.js:353 |
| `wbCloseHistory` | frontend/js/whiteboard-history.js:191 |
| `wbHistBoardParam` | frontend/js/whiteboard-history.js:41 |
| `wbHistGuard` | frontend/js/whiteboard-history.js:64 |
| `wbHistLoadOlder` | frontend/js/whiteboard-history.js:137 |
| `wbHistMoment` | frontend/js/whiteboard-history.js:47 |
| `wbHistRestore` | frontend/js/whiteboard-history.js:211 |
| `wbHistShow` | frontend/js/whiteboard-history.js:158 |
| `wbHistSync` | frontend/js/whiteboard-history.js:82 |
| `wbHistWords` | frontend/js/whiteboard-history.js:53 |
| `wbOpenHistory` | frontend/js/whiteboard-history.js:103 |
| `wbOpenSnapshots` | frontend/js/whiteboard-history.js:473 |
| `wbRestoreToEvent` | frontend/js/whiteboard-history.js:425 |
| `wbSnapshotPreviewBoard` | frontend/js/whiteboard-history.js:403 |
| `wbSnapshotRow` | frontend/js/whiteboard-history.js:434 |
| `wbTakeChangeFromElsewhere` | frontend/js/whiteboard-history.js:315 |

### frontend/js/whiteboard-interchange.js (32)

| Name | File:line |
|---|---|
| `wbBoardOutline` | frontend/js/whiteboard-interchange.js:323 |
| `wbBoardRowsFromSvg` | frontend/js/whiteboard-interchange.js:715 |
| `wbBoardSvgMetadata` | frontend/js/whiteboard-interchange.js:365 |
| `wbBoardToMermaid` | frontend/js/whiteboard-interchange.js:42 |
| `wbCardTitleForExport` | frontend/js/whiteboard-interchange.js:938 |
| `wbDrawioCells` | frontend/js/whiteboard-interchange.js:988 |
| `wbDrawioLook` | frontend/js/whiteboard-interchange.js:605 |
| `wbDrawioPath` | frontend/js/whiteboard-interchange.js:699 |
| `wbDrawioPlan` | frontend/js/whiteboard-interchange.js:638 |
| `wbDrawioShape` | frontend/js/whiteboard-interchange.js:622 |
| `wbDrawioStyle` | frontend/js/whiteboard-interchange.js:567 |
| `wbDrawioText` | frontend/js/whiteboard-interchange.js:584 |
| `wbExportMermaid` | frontend/js/whiteboard-interchange.js:957 |
| `wbExportOutline` | frontend/js/whiteboard-interchange.js:967 |
| `wbExportRows` | frontend/js/whiteboard-interchange.js:731 |
| `wbImportBoardRows` | frontend/js/whiteboard-interchange.js:764 |
| `wbImportDrawio` | frontend/js/whiteboard-interchange.js:1028 |
| `wbImportMermaid` | frontend/js/whiteboard-interchange.js:802 |
| `wbImportMermaidSequence` | frontend/js/whiteboard-interchange.js:885 |
| `wbImportText` | frontend/js/whiteboard-interchange.js:1087 |
| `wbMermaidCap` | frontend/js/whiteboard-interchange.js:851 |
| `wbMermaidClassParse` | frontend/js/whiteboard-interchange.js:457 |
| `wbMermaidFrameOf` | frontend/js/whiteboard-interchange.js:945 |
| `wbMermaidKind` | frontend/js/whiteboard-interchange.js:373 |
| `wbMermaidLayout` | frontend/js/whiteboard-interchange.js:209 |
| `wbMermaidLines` | frontend/js/whiteboard-interchange.js:383 |
| `wbMermaidParse` | frontend/js/whiteboard-interchange.js:110 |
| `wbMermaidPlaceNode` | frontend/js/whiteboard-interchange.js:858 |
| `wbMermaidSequenceParse` | frontend/js/whiteboard-interchange.js:517 |
| `wbMermaidStateParse` | frontend/js/whiteboard-interchange.js:392 |
| `wbMermaidText` | frontend/js/whiteboard-interchange.js:33 |
| `wbOpenImportDialog` | frontend/js/whiteboard-interchange.js:975 |

### frontend/js/whiteboard-library.js (80)

| Name | File:line |
|---|---|
| `wbCloseSidebar` | frontend/js/whiteboard-library.js:115 |
| `wbLayerButton` | frontend/js/whiteboard-library.js:1512 |
| `wbLayerEntry` | frontend/js/whiteboard-library.js:1775 |
| `wbLayerFocus` | frontend/js/whiteboard-library.js:1781 |
| `wbLayerIcon` | frontend/js/whiteboard-library.js:1764 |
| `wbLayerName` | frontend/js/whiteboard-library.js:1465 |
| `wbLayerRename` | frontend/js/whiteboard-library.js:1846 |
| `wbLayerRestack` | frontend/js/whiteboard-library.js:1874 |
| `wbLayerRows` | frontend/js/whiteboard-library.js:1470 |
| `wbLayerSelect` | frontend/js/whiteboard-library.js:1789 |
| `wbLayerToggleHidden` | frontend/js/whiteboard-library.js:1820 |
| `wbLayerToggleLock` | frontend/js/whiteboard-library.js:1833 |
| `wbLibAnnounceCount` | frontend/js/whiteboard-library.js:516 |
| `wbLibApplyPalette` | frontend/js/whiteboard-library.js:765 |
| `wbLibApplyStyle` | frontend/js/whiteboard-library.js:750 |
| `wbLibBranchOf` | frontend/js/whiteboard-library.js:1093 |
| `wbLibCentre` | frontend/js/whiteboard-library.js:553 |
| `wbLibContentBox` | frontend/js/whiteboard-library.js:571 |
| `wbLibCreate` | frontend/js/whiteboard-library.js:974 |
| `wbLibDelete` | frontend/js/whiteboard-library.js:887 |
| `wbLibDuplicate` | frontend/js/whiteboard-library.js:876 |
| `wbLibEmptyYours` | frontend/js/whiteboard-library.js:507 |
| `wbLibEntries` | frontend/js/whiteboard-library.js:222 |
| `wbLibExport` | frontend/js/whiteboard-library.js:1157 |
| `wbLibFits` | frontend/js/whiteboard-library.js:296 |
| `wbLibGrabPoint` | frontend/js/whiteboard-library.js:601 |
| `wbLibGroup` | frontend/js/whiteboard-library.js:383 |
| `wbLibIconEntry` | frontend/js/whiteboard-library.js:246 |
| `wbLibImportFile` | frontend/js/whiteboard-library.js:1168 |
| `wbLibInk` | frontend/js/whiteboard-library.js:542 |
| `wbLibMenuItems` | frontend/js/whiteboard-library.js:798 |
| `wbLibMove` | frontend/js/whiteboard-library.js:882 |
| `wbLibNewBoardFrom` | frontend/js/whiteboard-library.js:734 |
| `wbLibNewLibrary` | frontend/js/whiteboard-library.js:1187 |
| `wbLibOpenMenu` | frontend/js/whiteboard-library.js:838 |
| `wbLibPanelMenu` | frontend/js/whiteboard-library.js:1194 |
| `wbLibPlace` | frontend/js/whiteboard-library.js:633 |
| `wbLibRefBody` | frontend/js/whiteboard-library.js:623 |
| `wbLibRename` | frontend/js/whiteboard-library.js:859 |
| `wbLibReplace` | frontend/js/whiteboard-library.js:897 |
| `wbLibSelectionPayload` | frontend/js/whiteboard-library.js:910 |
| `wbLibSetActive` | frontend/js/whiteboard-library.js:522 |
| `wbLibTags` | frontend/js/whiteboard-library.js:866 |
| `wbLibThumb` | frontend/js/whiteboard-library.js:306 |
| `wbLibTile` | frontend/js/whiteboard-library.js:353 |
| `wbLibToggleFavourite` | frontend/js/whiteboard-library.js:845 |
| `wbLibVisibleTiles` | frontend/js/whiteboard-library.js:536 |
| `wbLoadIcons` | frontend/js/whiteboard-library.js:209 |
| `wbLoadLibrary` | frontend/js/whiteboard-library.js:161 |
| `wbLoadShapeSets` | frontend/js/whiteboard-library.js:195 |
| `wbMoveSelectionToLayer` | frontend/js/whiteboard-library.js:1562 |
| `wbNamedLayerItems` | frontend/js/whiteboard-library.js:1609 |
| `wbNamedLayerMenu` | frontend/js/whiteboard-library.js:1617 |
| `wbNamedLayerOf` | frontend/js/whiteboard-library.js:1534 |
| `wbNamedLayerSet` | frontend/js/whiteboard-library.js:1605 |
| `wbNewNamedLayer` | frontend/js/whiteboard-library.js:1595 |
| `wbOpenSidebar` | frontend/js/whiteboard-library.js:63 |
| `wbOpenStickerPicker` | frontend/js/whiteboard-library.js:285 |
| `wbPageFocus` | frontend/js/whiteboard-library.js:2034 |
| `wbPageGo` | frontend/js/whiteboard-library.js:2044 |
| `wbPageMove` | frontend/js/whiteboard-library.js:2056 |
| `wbPagePresent` | frontend/js/whiteboard-library.js:2074 |
| `wbPlaceSticker` | frontend/js/whiteboard-library.js:263 |
| `wbRenderLayers` | frontend/js/whiteboard-library.js:1696 |
| `wbRenderLibrary` | frontend/js/whiteboard-library.js:416 |
| `wbRenderNamedLayers` | frontend/js/whiteboard-library.js:1643 |
| `wbRenderPages` | frontend/js/whiteboard-library.js:1994 |
| `wbRenderSideMap` | frontend/js/whiteboard-library.js:153 |
| `wbSaveBoardAsTemplate` | frontend/js/whiteboard-library.js:1121 |
| `wbSaveBranchToLibrary` | frontend/js/whiteboard-library.js:1107 |
| `wbSaveNamedLayers` | frontend/js/whiteboard-library.js:1539 |
| `wbSavePaletteToLibrary` | frontend/js/whiteboard-library.js:1051 |
| `wbSavePresetToLibrary` | frontend/js/whiteboard-library.js:1071 |
| `wbSaveSelectionToLibrary` | frontend/js/whiteboard-library.js:989 |
| `wbSaveShapeToLibrary` | frontend/js/whiteboard-library.js:1003 |
| `wbSaveSideState` | frontend/js/whiteboard-library.js:53 |
| `wbSaveStyleToLibrary` | frontend/js/whiteboard-library.js:1029 |
| `wbSideRefreshSoon` | frontend/js/whiteboard-library.js:2162 |
| `wbSideState` | frontend/js/whiteboard-library.js:48 |
| `wbSyncSidebarKind` | frontend/js/whiteboard-library.js:134 |

### frontend/js/whiteboard-map.js (298)

| Name | File:line |
|---|---|
| `mapPaletteCommands` | frontend/js/whiteboard-map.js:4441 |
| `wbApplyMapFont` | frontend/js/whiteboard-map.js:324 |
| `wbBuildMapNode` | frontend/js/whiteboard-map.js:1658 |
| `wbClearMapNodeSizeCache` | frontend/js/whiteboard-map.js:3056 |
| `wbCloseMapLinkRadial` | frontend/js/whiteboard-map.js:7680 |
| `wbCloseMapRadial` | frontend/js/whiteboard-map.js:7244 |
| `wbColourChannels` | frontend/js/whiteboard-map.js:2002 |
| `wbCoreInkFor` | frontend/js/whiteboard-map.js:2044 |
| `wbDismissMapTemplates` | frontend/js/whiteboard-map.js:1352 |
| `wbFitMapRadialBand` | frontend/js/whiteboard-map.js:7048 |
| `wbForgetMapNodeSize` | frontend/js/whiteboard-map.js:3090 |
| `wbIndexMapNodeElements` | frontend/js/whiteboard-map.js:3073 |
| `wbInfoDialog` | frontend/js/whiteboard-map.js:1220 |
| `wbIsMap` | frontend/js/whiteboard-map.js:99 |
| `wbMapAccentInk` | frontend/js/whiteboard-map.js:2033 |
| `wbMapAddChild` | frontend/js/whiteboard-map.js:4237 |
| `wbMapAddReference` | frontend/js/whiteboard-map.js:4629 |
| `wbMapAddRootAt` | frontend/js/whiteboard-map.js:4600 |
| `wbMapAddSibling` | frontend/js/whiteboard-map.js:4660 |
| `wbMapAdoptProvisional` | frontend/js/whiteboard-map.js:4543 |
| `wbMapAfterRender` | frontend/js/whiteboard-map.js:9390 |
| `wbMapAgeBucket` | frontend/js/whiteboard-map.js:485 |
| `wbMapAskStructureWords` | frontend/js/whiteboard-map.js:8408 |
| `wbMapBraceGeometry` | frontend/js/whiteboard-map.js:8277 |
| `wbMapBranchBox` | frontend/js/whiteboard-map.js:8235 |
| `wbMapBranchDragOrigin` | frontend/js/whiteboard-map.js:2683 |
| `wbMapBySiblingOrder` | frontend/js/whiteboard-map.js:1405 |
| `wbMapCatchTypeahead` | frontend/js/whiteboard-map.js:4206 |
| `wbMapChooseMarkerFilter` | frontend/js/whiteboard-map.js:9339 |
| `wbMapClearDropTarget` | frontend/js/whiteboard-map.js:2737 |
| `wbMapClearEveryTopic` | frontend/js/whiteboard-map.js:914 |
| `wbMapClearFocus` | frontend/js/whiteboard-map.js:706 |
| `wbMapClearLinkCue` | frontend/js/whiteboard-map.js:2986 |
| `wbMapClearToOneTopic` | frontend/js/whiteboard-map.js:4887 |
| `wbMapCloseMarkers` | frontend/js/whiteboard-map.js:9148 |
| `wbMapCloseNote` | frontend/js/whiteboard-map.js:2314 |
| `wbMapCloudD` | frontend/js/whiteboard-map.js:8258 |
| `wbMapColors` | frontend/js/whiteboard-map.js:1496 |
| `wbMapColumnPositions` | frontend/js/whiteboard-map.js:5243 |
| `wbMapConcealed` | frontend/js/whiteboard-map.js:688 |
| `wbMapCopyBranch` | frontend/js/whiteboard-map.js:7365 |
| `wbMapCreateNode` | frontend/js/whiteboard-map.js:4149 |
| `wbMapCrossLinkInfo` | frontend/js/whiteboard-map.js:7694 |
| `wbMapCrossLinkLook` | frontend/js/whiteboard-map.js:5826 |
| `wbMapCrossLinkToBranch` | frontend/js/whiteboard-map.js:8024 |
| `wbMapCrossLinkType` | frontend/js/whiteboard-map.js:5885 |
| `wbMapCubicAt` | frontend/js/whiteboard-map.js:3376 |
| `wbMapCutCrossLink` | frontend/js/whiteboard-map.js:8046 |
| `wbMapDeleteEmptiesMap` | frontend/js/whiteboard-map.js:4865 |
| `wbMapDeleteSubtree` | frontend/js/whiteboard-map.js:4913 |
| `wbMapDrawn` | frontend/js/whiteboard-map.js:302 |
| `wbMapDropTargetAt` | frontend/js/whiteboard-map.js:2702 |
| `wbMapDueRow` | frontend/js/whiteboard-map.js:9104 |
| `wbMapDueWords` | frontend/js/whiteboard-map.js:9023 |
| `wbMapDuplicateTopic` | frontend/js/whiteboard-map.js:4689 |
| `wbMapEdgeAnchors` | frontend/js/whiteboard-map.js:3104 |
| `wbMapEdgeApply` | frontend/js/whiteboard-map.js:3856 |
| `wbMapEdgeContext` | frontend/js/whiteboard-map.js:3507 |
| `wbMapEdgeCubic` | frontend/js/whiteboard-map.js:3221 |
| `wbMapEdgeElbowTurn` | frontend/js/whiteboard-map.js:3249 |
| `wbMapEdgeElement` | frontend/js/whiteboard-map.js:3736 |
| `wbMapEdgeFractions` | frontend/js/whiteboard-map.js:3187 |
| `wbMapEdgeGeometry` | frontend/js/whiteboard-map.js:3677 |
| `wbMapEdgeHandlePoint` | frontend/js/whiteboard-map.js:3266 |
| `wbMapEdgeHasArrow` | frontend/js/whiteboard-map.js:3369 |
| `wbMapEdgeIsRibbon` | frontend/js/whiteboard-map.js:3480 |
| `wbMapEdgePathD` | frontend/js/whiteboard-map.js:3278 |
| `wbMapEdgePlusButton` | frontend/js/whiteboard-map.js:4010 |
| `wbMapEdgePlusPoint` | frontend/js/whiteboard-map.js:3909 |
| `wbMapEdgeStyle` | frontend/js/whiteboard-map.js:5239 |
| `wbMapEdgeWaypoint` | frontend/js/whiteboard-map.js:3162 |
| `wbMapEdgeWeight` | frontend/js/whiteboard-map.js:3356 |
| `wbMapEdgesFor` | frontend/js/whiteboard-map.js:3528 |
| `wbMapEditLink` | frontend/js/whiteboard-map.js:6762 |
| `wbMapEditNode` | frontend/js/whiteboard-map.js:4807 |
| `wbMapEditPicture` | frontend/js/whiteboard-map.js:6807 |
| `wbMapEndStudy` | frontend/js/whiteboard-map.js:8611 |
| `wbMapExpandAll` | frontend/js/whiteboard-map.js:2621 |
| `wbMapFacets` | frontend/js/whiteboard-map.js:470 |
| `wbMapFillOf` | frontend/js/whiteboard-map.js:274 |
| `wbMapFills` | frontend/js/whiteboard-map.js:1547 |
| `wbMapFocusHidden` | frontend/js/whiteboard-map.js:642 |
| `wbMapFoldToLevel` | frontend/js/whiteboard-map.js:2643 |
| `wbMapFontStack` | frontend/js/whiteboard-map.js:320 |
| `wbMapFreshPlace` | frontend/js/whiteboard-map.js:4512 |
| `wbMapFromDocument` | frontend/js/whiteboard-map.js:9448 |
| `wbMapGapBreadth` | frontend/js/whiteboard-map.js:77 |
| `wbMapGapDepth` | frontend/js/whiteboard-map.js:80 |
| `wbMapHeadingsOutline` | frontend/js/whiteboard-map.js:9413 |
| `wbMapHidden` | frontend/js/whiteboard-map.js:1571 |
| `wbMapIconOption` | frontend/js/whiteboard-map.js:6317 |
| `wbMapIndex` | frontend/js/whiteboard-map.js:1371 |
| `wbMapInlineText` | frontend/js/whiteboard-map.js:1610 |
| `wbMapInsertBetween` | frontend/js/whiteboard-map.js:4067 |
| `wbMapIsFollow` | frontend/js/whiteboard-map.js:6130 |
| `wbMapJoinByLink` | frontend/js/whiteboard-map.js:2913 |
| `wbMapJoinPlan` | frontend/js/whiteboard-map.js:2927 |
| `wbMapKeyBetween` | frontend/js/whiteboard-map.js:1418 |
| `wbMapLabel` | frontend/js/whiteboard-map.js:1586 |
| `wbMapLabelEdge` | frontend/js/whiteboard-map.js:7549 |
| `wbMapLayout` | frontend/js/whiteboard-map.js:103 |
| `wbMapLevelLook` | frontend/js/whiteboard-map.js:266 |
| `wbMapLevelLooks` | frontend/js/whiteboard-map.js:252 |
| `wbMapLevelOf` | frontend/js/whiteboard-map.js:248 |
| `wbMapLevels` | frontend/js/whiteboard-map.js:232 |
| `wbMapLinkCue` | frontend/js/whiteboard-map.js:2965 |
| `wbMapLiveDatum` | frontend/js/whiteboard-map.js:1646 |
| `wbMapMarkerGlyph` | frontend/js/whiteboard-map.js:9192 |
| `wbMapMarkerKeyWords` | frontend/js/whiteboard-map.js:9320 |
| `wbMapMarkerKeys` | frontend/js/whiteboard-map.js:9309 |
| `wbMapMarkerParts` | frontend/js/whiteboard-map.js:9010 |
| `wbMapMarkerSeg` | frontend/js/whiteboard-map.js:9161 |
| `wbMapMarkerWords` | frontend/js/whiteboard-map.js:9040 |
| `wbMapMarkersInUse` | frontend/js/whiteboard-map.js:9330 |
| `wbMapMoveAmongSiblings` | frontend/js/whiteboard-map.js:1431 |
| `wbMapMultiState` | frontend/js/whiteboard-map.js:6411 |
| `wbMapMultiTopics` | frontend/js/whiteboard-map.js:6373 |
| `wbMapNavigate` | frontend/js/whiteboard-map.js:4762 |
| `wbMapNodeColors` | frontend/js/whiteboard-map.js:518 |
| `wbMapNodeSize` | frontend/js/whiteboard-map.js:3043 |
| `wbMapNumberOf` | frontend/js/whiteboard-map.js:2224 |
| `wbMapNumbers` | frontend/js/whiteboard-map.js:2202 |
| `wbMapOpenIconPicker` | frontend/js/whiteboard-map.js:6304 |
| `wbMapOpenLink` | frontend/js/whiteboard-map.js:2513 |
| `wbMapOpenMarkers` | frontend/js/whiteboard-map.js:9209 |
| `wbMapOpenNote` | frontend/js/whiteboard-map.js:2262 |
| `wbMapOpenReference` | frontend/js/whiteboard-map.js:2996 |
| `wbMapOrderKey` | frontend/js/whiteboard-map.js:1400 |
| `wbMapOutdent` | frontend/js/whiteboard-map.js:4717 |
| `wbMapPaintMarkerFilter` | frontend/js/whiteboard-map.js:9365 |
| `wbMapPaintMarkers` | frontend/js/whiteboard-map.js:9056 |
| `wbMapPalette` | frontend/js/whiteboard-map.js:496 |
| `wbMapPasteText` | frontend/js/whiteboard-map.js:4319 |
| `wbMapPerspective` | frontend/js/whiteboard-map.js:447 |
| `wbMapPickGlyph` | frontend/js/whiteboard-map.js:6110 |
| `wbMapPickPreview` | frontend/js/whiteboard-map.js:6089 |
| `wbMapPickRow` | frontend/js/whiteboard-map.js:6134 |
| `wbMapPinOnDrag` | frontend/js/whiteboard-map.js:8215 |
| `wbMapPlaceAsChild` | frontend/js/whiteboard-map.js:2867 |
| `wbMapPresentSteps` | frontend/js/whiteboard-map.js:8440 |
| `wbMapProgressWords` | frontend/js/whiteboard-map.js:9032 |
| `wbMapQuietColour` | frontend/js/whiteboard-map.js:510 |
| `wbMapRadialBandFor` | frontend/js/whiteboard-map.js:7133 |
| `wbMapRadialClearance` | frontend/js/whiteboard-map.js:7112 |
| `wbMapRadialLabelSizes` | frontend/js/whiteboard-map.js:7094 |
| `wbMapRadialNode` | frontend/js/whiteboard-map.js:7348 |
| `wbMapRadialPx` | frontend/js/whiteboard-map.js:6996 |
| `wbMapRadialSectorPath` | frontend/js/whiteboard-map.js:7029 |
| `wbMapRadialSectorRect` | frontend/js/whiteboard-map.js:7179 |
| `wbMapRadialStep` | frontend/js/whiteboard-map.js:7202 |
| `wbMapRadialToward` | frontend/js/whiteboard-map.js:7220 |
| `wbMapRefuseLastTopic` | frontend/js/whiteboard-map.js:4872 |
| `wbMapRemoveKeepingBranch` | frontend/js/whiteboard-map.js:7458 |
| `wbMapRemovePicture` | frontend/js/whiteboard-map.js:6849 |
| `wbMapResetToBranch` | frontend/js/whiteboard-map.js:7577 |
| `wbMapResetTopicSize` | frontend/js/whiteboard-map.js:4496 |
| `wbMapRestoreRows` | frontend/js/whiteboard-map.js:4981 |
| `wbMapReverseCrossLink` | frontend/js/whiteboard-map.js:7984 |
| `wbMapReverseEdge` | frontend/js/whiteboard-map.js:8068 |
| `wbMapRibbonD` | frontend/js/whiteboard-map.js:3388 |
| `wbMapSetFocus` | frontend/js/whiteboard-map.js:698 |
| `wbMapSetLayout` | frontend/js/whiteboard-map.js:8190 |
| `wbMapSetLevelField` | frontend/js/whiteboard-map.js:1085 |
| `wbMapSetMarkerFilter` | frontend/js/whiteboard-map.js:9354 |
| `wbMapSetNodeStyle` | frontend/js/whiteboard-map.js:6744 |
| `wbMapSetNumbered` | frontend/js/whiteboard-map.js:2231 |
| `wbMapSetPerspective` | frontend/js/whiteboard-map.js:456 |
| `wbMapSetStructure` | frontend/js/whiteboard-map.js:8399 |
| `wbMapSetTask` | frontend/js/whiteboard-map.js:2340 |
| `wbMapSetTheme` | frontend/js/whiteboard-map.js:877 |
| `wbMapSetTopicIcon` | frontend/js/whiteboard-map.js:6295 |
| `wbMapSever` | frontend/js/whiteboard-map.js:7505 |
| `wbMapShowDropTarget` | frontend/js/whiteboard-map.js:2729 |
| `wbMapSiblingsOf` | frontend/js/whiteboard-map.js:1410 |
| `wbMapSizeStepper` | frontend/js/whiteboard-map.js:6219 |
| `wbMapSmoothThrough` | frontend/js/whiteboard-map.js:3461 |
| `wbMapSpacing` | frontend/js/whiteboard-map.js:74 |
| `wbMapSpillsOffCanvas` | frontend/js/whiteboard-map.js:5690 |
| `wbMapStartResizeDrag` | frontend/js/whiteboard-map.js:2553 |
| `wbMapStartStudy` | frontend/js/whiteboard-map.js:8555 |
| `wbMapStats` | frontend/js/whiteboard-map.js:754 |
| `wbMapStatsList` | frontend/js/whiteboard-map.js:1160 |
| `wbMapStepFocus` | frontend/js/whiteboard-map.js:713 |
| `wbMapStraightenEdge` | frontend/js/whiteboard-map.js:7849 |
| `wbMapStructureGroup` | frontend/js/whiteboard-map.js:8301 |
| `wbMapStructureText` | frontend/js/whiteboard-map.js:8312 |
| `wbMapStudyKey` | frontend/js/whiteboard-map.js:8516 |
| `wbMapStudyLoad` | frontend/js/whiteboard-map.js:8520 |
| `wbMapStudyMark` | frontend/js/whiteboard-map.js:8593 |
| `wbMapStudyQuestions` | frontend/js/whiteboard-map.js:8484 |
| `wbMapStudySave` | frontend/js/whiteboard-map.js:8526 |
| `wbMapStudyShow` | frontend/js/whiteboard-map.js:8583 |
| `wbMapStudySteps` | frontend/js/whiteboard-map.js:8536 |
| `wbMapStudySyncBar` | frontend/js/whiteboard-map.js:8575 |
| `wbMapStudyTally` | frontend/js/whiteboard-map.js:8509 |
| `wbMapStyleMany` | frontend/js/whiteboard-map.js:6390 |
| `wbMapSubtree` | frontend/js/whiteboard-map.js:1467 |
| `wbMapSuggestBranches` | frontend/js/whiteboard-map.js:9525 |
| `wbMapSummarise` | frontend/js/whiteboard-map.js:8418 |
| `wbMapSummariseBranch` | frontend/js/whiteboard-map.js:9498 |
| `wbMapSummaryRun` | frontend/js/whiteboard-map.js:8249 |
| `wbMapTakePicture` | frontend/js/whiteboard-map.js:6818 |
| `wbMapTaskTally` | frontend/js/whiteboard-map.js:2164 |
| `wbMapTemplatesDismissedKey` | frontend/js/whiteboard-map.js:1290 |
| `wbMapTheme` | frontend/js/whiteboard-map.js:120 |
| `wbMapThemeCheck` | frontend/js/whiteboard-map.js:1125 |
| `wbMapThemeDefault` | frontend/js/whiteboard-map.js:166 |
| `wbMapThemeDialog` | frontend/js/whiteboard-map.js:950 |
| `wbMapThemeLevelRows` | frontend/js/whiteboard-map.js:1039 |
| `wbMapThemeMapRows` | frontend/js/whiteboard-map.js:1009 |
| `wbMapThemeSelect` | frontend/js/whiteboard-map.js:1095 |
| `wbMapThemedData` | frontend/js/whiteboard-map.js:138 |
| `wbMapTidy` | frontend/js/whiteboard-map.js:5604 |
| `wbMapTidyBranch` | frontend/js/whiteboard-map.js:5709 |
| `wbMapTidyBranchPlan` | frontend/js/whiteboard-map.js:5727 |
| `wbMapTidyBranchScope` | frontend/js/whiteboard-map.js:5717 |
| `wbMapTidyFresh` | frontend/js/whiteboard-map.js:5673 |
| `wbMapTidyOrigin` | frontend/js/whiteboard-map.js:5638 |
| `wbMapTidyPositions` | frontend/js/whiteboard-map.js:5373 |
| `wbMapToggleCollapse` | frontend/js/whiteboard-map.js:5080 |
| `wbMapToggleTaskDone` | frontend/js/whiteboard-map.js:2349 |
| `wbMapToggleValue` | frontend/js/whiteboard-map.js:340 |
| `wbMapTopicStyle` | frontend/js/whiteboard-map.js:7605 |
| `wbMapTransplant` | frontend/js/whiteboard-map.js:2764 |
| `wbMapTreeMarkdown` | frontend/js/whiteboard-map.js:4369 |
| `wbMapTypeaheadLive` | frontend/js/whiteboard-map.js:4189 |
| `wbMapUseLookForLevel` | frontend/js/whiteboard-map.js:7618 |
| `wbMapWriteDocument` | frontend/js/whiteboard-map.js:4401 |
| `wbMarkMapRadialNode` | frontend/js/whiteboard-map.js:7236 |
| `wbMarkMapRadialSector` | frontend/js/whiteboard-map.js:7154 |
| `wbOpenMapCrossLinkRadial` | frontend/js/whiteboard-map.js:7911 |
| `wbOpenMapLinkRadial` | frontend/js/whiteboard-map.js:7890 |
| `wbOpenMapRadial` | frontend/js/whiteboard-map.js:7291 |
| `wbOutlineAddAfter` | frontend/js/whiteboard-map.js:8878 |
| `wbOutlineAfterSurface` | frontend/js/whiteboard-map.js:8659 |
| `wbOutlineCommit` | frontend/js/whiteboard-map.js:8818 |
| `wbOutlineEdit` | frontend/js/whiteboard-map.js:8725 |
| `wbOutlineEditing` | frontend/js/whiteboard-map.js:8719 |
| `wbOutlineFocus` | frontend/js/whiteboard-map.js:8797 |
| `wbOutlineFocusSelected` | frontend/js/whiteboard-map.js:8665 |
| `wbOutlineIndent` | frontend/js/whiteboard-map.js:8837 |
| `wbOutlineMirror` | frontend/js/whiteboard-map.js:8811 |
| `wbOutlineOutdent` | frontend/js/whiteboard-map.js:8858 |
| `wbOutlineRemoveEmpty` | frontend/js/whiteboard-map.js:8896 |
| `wbOutlineRowEl` | frontend/js/whiteboard-map.js:8682 |
| `wbOutlineRowOf` | frontend/js/whiteboard-map.js:8790 |
| `wbOutlineRowsNow` | frontend/js/whiteboard-map.js:8671 |
| `wbOutlineShowing` | frontend/js/whiteboard-map.js:8640 |
| `wbOutlineStep` | frontend/js/whiteboard-map.js:8912 |
| `wbOutlineStopEdit` | frontend/js/whiteboard-map.js:8736 |
| `wbOutlineSwitchShows` | frontend/js/whiteboard-map.js:8646 |
| `wbOutlineSync` | frontend/js/whiteboard-map.js:8751 |
| `wbOutlineTakeNewTopic` | frontend/js/whiteboard-map.js:8890 |
| `wbOutlineToggle` | frontend/js/whiteboard-map.js:8651 |
| `wbPaintMapNode` | frontend/js/whiteboard-map.js:2056 |
| `wbPaintMapNodeStyle` | frontend/js/whiteboard-map.js:2364 |
| `wbPathEnds` | frontend/js/whiteboard-map.js:5876 |
| `wbPlaceMapRadial` | frontend/js/whiteboard-map.js:6905 |
| `wbRefreshMapState` | frontend/js/whiteboard-map.js:361 |
| `wbRelativeLuminance` | frontend/js/whiteboard-map.js:2018 |
| `wbRenderMapEdgePluses` | frontend/js/whiteboard-map.js:3957 |
| `wbRenderMapEdges` | frontend/js/whiteboard-map.js:3587 |
| `wbRenderMapLegend` | frontend/js/whiteboard-map.js:563 |
| `wbRenderMapStructure` | frontend/js/whiteboard-map.js:8324 |
| `wbSelectedMapNode` | frontend/js/whiteboard-map.js:4129 |
| `wbShowMapStats` | frontend/js/whiteboard-map.js:1143 |
| `wbSizeMapRadial` | frontend/js/whiteboard-map.js:7004 |
| `wbSyncConnectWords` | frontend/js/whiteboard-map.js:5916 |
| `wbSyncMapChrome` | frontend/js/whiteboard-map.js:8091 |
| `wbSyncMapEdgeHandles` | frontend/js/whiteboard-map.js:7727 |
| `wbSyncMapEmpty` | frontend/js/whiteboard-map.js:1283 |
| `wbSyncMapFill` | frontend/js/whiteboard-map.js:6672 |
| `wbSyncMapFirstHint` | frontend/js/whiteboard-map.js:1330 |
| `wbSyncMapFocusChrome` | frontend/js/whiteboard-map.js:724 |
| `wbSyncMapLinkGlyph` | frontend/js/whiteboard-map.js:5896 |
| `wbSyncMapLinkRadial` | frontend/js/whiteboard-map.js:7933 |
| `wbSyncMapMulti` | frontend/js/whiteboard-map.js:6461 |
| `wbSyncMapRadialAlt` | frontend/js/whiteboard-map.js:7262 |
| `wbSyncMapStrip` | frontend/js/whiteboard-map.js:6493 |
| `wbSyncMapTemplates` | frontend/js/whiteboard-map.js:1296 |
| `wbSyncMapToolState` | frontend/js/whiteboard-map.js:5978 |
| `wbSyncMapViews` | frontend/js/whiteboard-map.js:1264 |
| `wbSyncToolSurfaces` | frontend/js/whiteboard-map.js:5948 |
| `wbTidyAncestor` | frontend/js/whiteboard-map.js:5168 |
| `wbTidyApportion` | frontend/js/whiteboard-map.js:5177 |
| `wbTidyDistance` | frontend/js/whiteboard-map.js:5134 |
| `wbTidyExecuteShifts` | frontend/js/whiteboard-map.js:5156 |
| `wbTidyFirstWalk` | frontend/js/whiteboard-map.js:5106 |
| `wbTidyMoveSubtree` | frontend/js/whiteboard-map.js:5146 |
| `wbTidyNextLeft` | frontend/js/whiteboard-map.js:5138 |
| `wbTidyNextRight` | frontend/js/whiteboard-map.js:5142 |
| `wbUpdateMapEdges` | frontend/js/whiteboard-map.js:3561 |
| `wbWireEdgeLabelDrag` | frontend/js/whiteboard-map.js:3815 |
| `wbWireMapChoices` | frontend/js/whiteboard-map.js:6345 |
| `wbWireMapEdgeGestures` | frontend/js/whiteboard-map.js:7865 |
| `wbWireMapEdgeHandle` | frontend/js/whiteboard-map.js:7769 |
| `wbWireMapIconMore` | frontend/js/whiteboard-map.js:6335 |
| `wbWireMapMulti` | frontend/js/whiteboard-map.js:6482 |

### frontend/js/whiteboard-templates.js (12)

| Name | File:line |
|---|---|
| `wbApplyMapTemplate` | frontend/js/whiteboard-templates.js:560 |
| `wbBlankThumbSpec` | frontend/js/whiteboard-templates.js:288 |
| `wbBoardThumbSpec` | frontend/js/whiteboard-templates.js:200 |
| `wbMapThumbSpec` | frontend/js/whiteboard-templates.js:47 |
| `wbOpenTemplateGallery` | frontend/js/whiteboard-templates.js:370 |
| `wbRenderMapTemplates` | frontend/js/whiteboard-templates.js:527 |
| `wbTemplateChoices` | frontend/js/whiteboard-templates.js:326 |
| `wbTemplateEntry` | frontend/js/whiteboard-templates.js:322 |
| `wbTemplatePicture` | frontend/js/whiteboard-templates.js:342 |
| `wbThumbRound` | frontend/js/whiteboard-templates.js:37 |
| `wbThumbSvg` | frontend/js/whiteboard-templates.js:293 |
| `wbUntitledNames` | frontend/js/whiteboard-templates.js:355 |

### frontend/js/whiteboard.js (481)

| Name | File:line |
|---|---|
| `addBoardToNote` | frontend/js/whiteboard.js:21069 |
| `boardItemCount` | frontend/js/whiteboard.js:20114 |
| `boardSort` | frontend/js/whiteboard.js:20118 |
| `boardTypeFilter` | frontend/js/whiteboard.js:20161 |
| `clearWbSelection` | frontend/js/whiteboard.js:4920 |
| `createConceptMap` | frontend/js/whiteboard.js:20599 |
| `createNewBoard` | frontend/js/whiteboard.js:15456 |
| `deleteWbSelection` | frontend/js/whiteboard.js:5409 |
| `dragEndNode` | frontend/js/whiteboard.js:19877 |
| `dragStart` | frontend/js/whiteboard.js:19706 |
| `dragging` | frontend/js/whiteboard.js:19765 |
| `drawLibraryBoardsGallery` | frontend/js/whiteboard.js:20250 |
| `fetchWhiteboardState` | frontend/js/whiteboard.js:15178 |
| `handleWbZoom` | frontend/js/whiteboard.js:499 |
| `initWhiteboard` | frontend/js/whiteboard.js:11273 |
| `openWhiteboardBoard` | frontend/js/whiteboard.js:20458 |
| `pickNotesDialog` | frontend/js/whiteboard.js:20981 |
| `redrawLibraryBoardsGallery` | frontend/js/whiteboard.js:20219 |
| `refreshBoardList` | frontend/js/whiteboard.js:15217 |
| `renameCurrentBoard` | frontend/js/whiteboard.js:15321 |
| `renderBoardTypeFilter` | frontend/js/whiteboard.js:20180 |
| `renderLibraryBoardsGallery` | frontend/js/whiteboard.js:20224 |
| `renderWbGestureHints` | frontend/js/whiteboard.js:20530 |
| `renderWbLibrary` | frontend/js/whiteboard.js:15100 |
| `renderWbObjects` | frontend/js/whiteboard.js:18737 |
| `renderWhiteboard` | frontend/js/whiteboard.js:17526 |
| `renderWhiteboardNow` | frontend/js/whiteboard.js:17504 |
| `selectWbItem` | frontend/js/whiteboard.js:4804 |
| `toggleWhiteboardFullscreen` | frontend/js/whiteboard.js:20678 |
| `uploadToLibrary` | frontend/js/whiteboard.js:10839 |
| `wbAddBoardToNote` | frontend/js/whiteboard.js:9768 |
| `wbAlignGuideColor` | frontend/js/whiteboard.js:1068 |
| `wbAlignSelection` | frontend/js/whiteboard.js:3658 |
| `wbAlignmentGuides` | frontend/js/whiteboard.js:934 |
| `wbAnchorDelta` | frontend/js/whiteboard.js:6641 |
| `wbAnchorPlaced` | frontend/js/whiteboard.js:6686 |
| `wbAnchorPoint` | frontend/js/whiteboard.js:2767 |
| `wbAnchorPositions` | frontend/js/whiteboard.js:2752 |
| `wbAngleFromCenterDeg` | frontend/js/whiteboard.js:8387 |
| `wbAnnounce` | frontend/js/whiteboard.js:4878 |
| `wbApplyBackground` | frontend/js/whiteboard.js:1130 |
| `wbApplyBulkMove` | frontend/js/whiteboard.js:5831 |
| `wbApplyContextRow` | frontend/js/whiteboard.js:4169 |
| `wbApplyGrid` | frontend/js/whiteboard.js:1102 |
| `wbApplyHistoryEntry` | frontend/js/whiteboard.js:8394 |
| `wbApplyLineJumps` | frontend/js/whiteboard.js:3479 |
| `wbApplySearchHighlight` | frontend/js/whiteboard.js:2434 |
| `wbApplySelectionHighlight` | frontend/js/whiteboard.js:4752 |
| `wbApplyZoomTransform` | frontend/js/whiteboard.js:382 |
| `wbArrangeGridSelection` | frontend/js/whiteboard.js:3749 |
| `wbArrangeMindMap` | frontend/js/whiteboard.js:4448 |
| `wbArrowHeadPath` | frontend/js/whiteboard.js:1330 |
| `wbAttachEditorMenu` | frontend/js/whiteboard.js:8155 |
| `wbAxisLock` | frontend/js/whiteboard.js:6103 |
| `wbBarSideEdges` | frontend/js/whiteboard.js:5083 |
| `wbBase64` | frontend/js/whiteboard.js:10683 |
| `wbBeginGesture` | frontend/js/whiteboard.js:5902 |
| `wbBeginTextEdit` | frontend/js/whiteboard.js:8100 |
| `wbBinBoard` | frontend/js/whiteboard.js:9799 |
| `wbBoardBackground` | frontend/js/whiteboard.js:1116 |
| `wbBoardBounds` | frontend/js/whiteboard.js:9916 |
| `wbBoardCountWords` | frontend/js/whiteboard.js:15299 |
| `wbBoardPointOf` | frontend/js/whiteboard.js:8976 |
| `wbBoardReplaceAll` | frontend/js/whiteboard.js:2361 |
| `wbBoardRows` | frontend/js/whiteboard.js:7829 |
| `wbBoardSearchGo` | frontend/js/whiteboard.js:2465 |
| `wbBoardSearchRun` | frontend/js/whiteboard.js:2397 |
| `wbBoardSettings` | frontend/js/whiteboard.js:7840 |
| `wbBoardTitleForExport` | frontend/js/whiteboard.js:10791 |
| `wbBoxCenter` | frontend/js/whiteboard.js:2598 |
| `wbBoxRayIntersection` | frontend/js/whiteboard.js:2883 |
| `wbBoxesOverlap` | frontend/js/whiteboard.js:5504 |
| `wbBucketFillSketch` | frontend/js/whiteboard.js:16234 |
| `wbBuildContextMenu` | frontend/js/whiteboard.js:6915 |
| `wbBuildExportSvg` | frontend/js/whiteboard.js:10103 |
| `wbBuildFrame` | frontend/js/whiteboard.js:9677 |
| `wbBulkGroupBox` | frontend/js/whiteboard.js:889 |
| `wbBulkMoveElement` | frontend/js/whiteboard.js:5825 |
| `wbBulkUndoEntries` | frontend/js/whiteboard.js:6113 |
| `wbBulletTextLines` | frontend/js/whiteboard.js:8083 |
| `wbCancelGesture` | frontend/js/whiteboard.js:5914 |
| `wbCanvasOrigin` | frontend/js/whiteboard.js:443 |
| `wbCanvasOriginRect` | frontend/js/whiteboard.js:413 |
| `wbCapPath` | frontend/js/whiteboard.js:1370 |
| `wbCaptureBulkMoveOrigin` | frontend/js/whiteboard.js:5675 |
| `wbCarryWaypoints` | frontend/js/whiteboard.js:6223 |
| `wbCenterOn` | frontend/js/whiteboard.js:1896 |
| `wbClearAlignmentGuides` | frontend/js/whiteboard.js:1098 |
| `wbClearAnchorHints` | frontend/js/whiteboard.js:3608 |
| `wbClearBoard` | frontend/js/whiteboard.js:9831 |
| `wbClearCanvasRectCache` | frontend/js/whiteboard.js:408 |
| `wbClearGuideBoxCache` | frontend/js/whiteboard.js:858 |
| `wbClearSelectionOverlays` | frontend/js/whiteboard.js:203 |
| `wbClearSketchHandles` | frontend/js/whiteboard.js:16357 |
| `wbClientToBoard` | frontend/js/whiteboard.js:459 |
| `wbClipboardText` | frontend/js/whiteboard.js:6466 |
| `wbClippedCardCount` | frontend/js/whiteboard.js:11071 |
| `wbCloneConnect` | frontend/js/whiteboard.js:6740 |
| `wbCloneSource` | frontend/js/whiteboard.js:6728 |
| `wbCloseBoardSearch` | frontend/js/whiteboard.js:2485 |
| `wbCloseComments` | frontend/js/whiteboard.js:9561 |
| `wbCloseContextMenu` | frontend/js/whiteboard.js:7319 |
| `wbCloseMapStripMenus` | frontend/js/whiteboard.js:4970 |
| `wbCommentAttachMarkdown` | frontend/js/whiteboard.js:9542 |
| `wbCommentRow` | frontend/js/whiteboard.js:9401 |
| `wbCommentWikiChips` | frontend/js/whiteboard.js:9527 |
| `wbCommitOpenEdit` | frontend/js/whiteboard.js:8617 |
| `wbContentBounds` | frontend/js/whiteboard.js:1709 |
| `wbContextKindOf` | frontend/js/whiteboard.js:4138 |
| `wbContextMoreWrap` | frontend/js/whiteboard.js:4198 |
| `wbCopySelectedStyle` | frontend/js/whiteboard.js:4038 |
| `wbCopySelection` | frontend/js/whiteboard.js:6391 |
| `wbCopyableSelection` | frontend/js/whiteboard.js:6360 |
| `wbCreateBlankBoard` | frontend/js/whiteboard.js:15526 |
| `wbCreateCopies` | frontend/js/whiteboard.js:6163 |
| `wbCreateFrame` | frontend/js/whiteboard.js:9602 |
| `wbCreateObject` | frontend/js/whiteboard.js:8659 |
| `wbCreateSticky` | frontend/js/whiteboard.js:8715 |
| `wbCreateTextBox` | frontend/js/whiteboard.js:8771 |
| `wbCubicAt` | frontend/js/whiteboard.js:3332 |
| `wbCullNow` | frontend/js/whiteboard.js:603 |
| `wbCursorForTool` | frontend/js/whiteboard.js:1456 |
| `wbCursorUrl` | frontend/js/whiteboard.js:1218 |
| `wbCurvePathD` | frontend/js/whiteboard.js:3342 |
| `wbCurveThroughSegs` | frontend/js/whiteboard.js:3314 |
| `wbCutSelection` | frontend/js/whiteboard.js:6885 |
| `wbDashArray` | frontend/js/whiteboard.js:1308 |
| `wbDeleteBoard` | frontend/js/whiteboard.js:9816 |
| `wbDeleteCurrentBoard` | frontend/js/whiteboard.js:9782 |
| `wbDetachEditorMenu` | frontend/js/whiteboard.js:8169 |
| `wbDetectArrowStyle` | frontend/js/whiteboard.js:16286 |
| `wbDistributeSelection` | frontend/js/whiteboard.js:3707 |
| `wbDragExcludeKeys` | frontend/js/whiteboard.js:929 |
| `wbDragIsBulkMove` | frontend/js/whiteboard.js:5666 |
| `wbDrawSketchHandles` | frontend/js/whiteboard.js:17273 |
| `wbDropCopies` | frontend/js/whiteboard.js:6145 |
| `wbDropUndoEntry` | frontend/js/whiteboard.js:7740 |
| `wbDuplicateSelection` | frontend/js/whiteboard.js:6867 |
| `wbEdgeNormal` | frontend/js/whiteboard.js:2806 |
| `wbEdgePoint` | frontend/js/whiteboard.js:2638 |
| `wbEditCommentRow` | frontend/js/whiteboard.js:9472 |
| `wbEditFrameTitle` | frontend/js/whiteboard.js:9645 |
| `wbEditLinkLabel` | frontend/js/whiteboard.js:16153 |
| `wbEditNodeText` | frontend/js/whiteboard.js:4592 |
| `wbEditShapeLabel` | frontend/js/whiteboard.js:16007 |
| `wbEditableSurface` | frontend/js/whiteboard.js:8175 |
| `wbEditedText` | frontend/js/whiteboard.js:8292 |
| `wbElbowCrosses` | frontend/js/whiteboard.js:3192 |
| `wbElbowDetour` | frontend/js/whiteboard.js:3283 |
| `wbElbowEnds` | frontend/js/whiteboard.js:3530 |
| `wbElbowFloat` | frontend/js/whiteboard.js:3514 |
| `wbElbowLeg` | frontend/js/whiteboard.js:3203 |
| `wbElbowPathD` | frontend/js/whiteboard.js:3298 |
| `wbElbowRoute` | frontend/js/whiteboard.js:3223 |
| `wbElbowSide` | frontend/js/whiteboard.js:3186 |
| `wbEllipseRayIntersection` | frontend/js/whiteboard.js:2838 |
| `wbEndGesture` | frontend/js/whiteboard.js:5907 |
| `wbEndPanShield` | frontend/js/whiteboard.js:495 |
| `wbEndTextEdit` | frontend/js/whiteboard.js:8354 |
| `wbEnsureReplaceRow` | frontend/js/whiteboard.js:2498 |
| `wbEntryBox` | frontend/js/whiteboard.js:16818 |
| `wbEntryOutlineBox` | frontend/js/whiteboard.js:16850 |
| `wbExportBoard` | frontend/js/whiteboard.js:11096 |
| `wbExportColour` | frontend/js/whiteboard.js:10020 |
| `wbExportDescription` | frontend/js/whiteboard.js:10826 |
| `wbExportFileName` | frontend/js/whiteboard.js:10800 |
| `wbExportFrame` | frontend/js/whiteboard.js:11087 |
| `wbExportMapText` | frontend/js/whiteboard.js:10487 |
| `wbExportPaint` | frontend/js/whiteboard.js:10051 |
| `wbExportPdf` | frontend/js/whiteboard.js:10922 |
| `wbExportPng` | frontend/js/whiteboard.js:10884 |
| `wbExportPngPrefs` | frontend/js/whiteboard.js:10810 |
| `wbExportSegment` | frontend/js/whiteboard.js:11033 |
| `wbExportSvg` | frontend/js/whiteboard.js:10758 |
| `wbExportTopicEffect` | frontend/js/whiteboard.js:10065 |
| `wbExportTopicGlyph` | frontend/js/whiteboard.js:10084 |
| `wbExtractNotes` | frontend/js/whiteboard.js:3834 |
| `wbFillComments` | frontend/js/whiteboard.js:9360 |
| `wbFillContextBar` | frontend/js/whiteboard.js:4255 |
| `wbFillPaperSwatches` | frontend/js/whiteboard.js:8733 |
| `wbFindItem` | frontend/js/whiteboard.js:9067 |
| `wbFinishDrag` | frontend/js/whiteboard.js:6206 |
| `wbFitToText` | frontend/js/whiteboard.js:18466 |
| `wbFlushNudge` | frontend/js/whiteboard.js:3903 |
| `wbFlushZoomFrame` | frontend/js/whiteboard.js:547 |
| `wbFollowLiveShape` | frontend/js/whiteboard.js:17239 |
| `wbForgetLinkItems` | frontend/js/whiteboard.js:2960 |
| `wbForgetLinks` | frontend/js/whiteboard.js:7922 |
| `wbForwardGripContextMenu` | frontend/js/whiteboard.js:16371 |
| `wbFrameContents` | frontend/js/whiteboard.js:9622 |
| `wbFrameDragOrigin` | frontend/js/whiteboard.js:9637 |
| `wbFrameMapOnOpen` | frontend/js/whiteboard.js:1882 |
| `wbFrameTitle` | frontend/js/whiteboard.js:9589 |
| `wbFrameZ` | frontend/js/whiteboard.js:9595 |
| `wbFramesInOrder` | frontend/js/whiteboard.js:20728 |
| `wbFreeArea` | frontend/js/whiteboard.js:1744 |
| `wbFreeCanvasRect` | frontend/js/whiteboard.js:6581 |
| `wbGenerateMapFromNotes` | frontend/js/whiteboard.js:10538 |
| `wbGridType` | frontend/js/whiteboard.js:784 |
| `wbGroupSelection` | frontend/js/whiteboard.js:1546 |
| `wbGuardMenuCorner` | frontend/js/whiteboard.js:7363 |
| `wbGuideBoxes` | frontend/js/whiteboard.js:831 |
| `wbHandleItemClick` | frontend/js/whiteboard.js:5365 |
| `wbHiddenOnBoard` | frontend/js/whiteboard.js:8885 |
| `wbHideSelectionActions` | frontend/js/whiteboard.js:4202 |
| `wbHighlighterBlend` | frontend/js/whiteboard.js:1262 |
| `wbHighlighterWidth` | frontend/js/whiteboard.js:1249 |
| `wbHistoryFor` | frontend/js/whiteboard.js:7693 |
| `wbHistoryFromRows` | frontend/js/whiteboard.js:7853 |
| `wbHistoryRestore` | frontend/js/whiteboard.js:7711 |
| `wbImportOutlineFile` | frontend/js/whiteboard.js:10690 |
| `wbIndentEditableLines` | frontend/js/whiteboard.js:8303 |
| `wbInlineSvgImages` | frontend/js/whiteboard.js:10421 |
| `wbIsBareCanvas` | frontend/js/whiteboard.js:128 |
| `wbIsEditingTarget` | frontend/js/whiteboard.js:7636 |
| `wbIsLinkRow` | frontend/js/whiteboard.js:7845 |
| `wbIsLocked` | frontend/js/whiteboard.js:8809 |
| `wbIsSticky` | frontend/js/whiteboard.js:8709 |
| `wbItemBBox` | frontend/js/whiteboard.js:1620 |
| `wbItemComments` | frontend/js/whiteboard.js:9061 |
| `wbItemEdgeDir` | frontend/js/whiteboard.js:2680 |
| `wbItemElement` | frontend/js/whiteboard.js:1601 |
| `wbItemHidden` | frontend/js/whiteboard.js:5566 |
| `wbItemRotation` | frontend/js/whiteboard.js:2584 |
| `wbItemSpokenName` | frontend/js/whiteboard.js:4859 |
| `wbItemTransform` | frontend/js/whiteboard.js:8361 |
| `wbKeepAspect` | frontend/js/whiteboard.js:15776 |
| `wbKeepMenuBesideBar` | frontend/js/whiteboard.js:7299 |
| `wbLaserTrail` | frontend/js/whiteboard.js:20868 |
| `wbLayoutCloneGrips` | frontend/js/whiteboard.js:6838 |
| `wbLayoutLinkLabel` | frontend/js/whiteboard.js:16122 |
| `wbLayoutShapeLabel` | frontend/js/whiteboard.js:15905 |
| `wbLeaveFullscreen` | frontend/js/whiteboard.js:20446 |
| `wbLineJumpsD` | frontend/js/whiteboard.js:3392 |
| `wbLinkAdjacency` | frontend/js/whiteboard.js:4406 |
| `wbLinkCandidateAt` | frontend/js/whiteboard.js:3014 |
| `wbLinkCandidates` | frontend/js/whiteboard.js:2981 |
| `wbLinkCaps` | frontend/js/whiteboard.js:3098 |
| `wbLinkDrawnLine` | frontend/js/whiteboard.js:16643 |
| `wbLinkEnd` | frontend/js/whiteboard.js:2830 |
| `wbLinkEndpoints` | frontend/js/whiteboard.js:3026 |
| `wbLinkItem` | frontend/js/whiteboard.js:2964 |
| `wbLinkLabelT` | frontend/js/whiteboard.js:16737 |
| `wbLinkMidpoint` | frontend/js/whiteboard.js:16100 |
| `wbLinkNearestT` | frontend/js/whiteboard.js:16744 |
| `wbLinkPathD` | frontend/js/whiteboard.js:3119 |
| `wbLinkRouteName` | frontend/js/whiteboard.js:3559 |
| `wbLinkSelectionBox` | frontend/js/whiteboard.js:5061 |
| `wbLinkShape` | frontend/js/whiteboard.js:3567 |
| `wbLinkSketchIndex` | frontend/js/whiteboard.js:19607 |
| `wbLinkTakesLabel` | frontend/js/whiteboard.js:16090 |
| `wbLinkWaypoints` | frontend/js/whiteboard.js:16631 |
| `wbLinkedSketchesFor` | frontend/js/whiteboard.js:19636 |
| `wbLinksTouching` | frontend/js/whiteboard.js:7912 |
| `wbLockHoverWanted` | frontend/js/whiteboard.js:9015 |
| `wbLockSelection` | frontend/js/whiteboard.js:8848 |
| `wbLockedItemAt` | frontend/js/whiteboard.js:8963 |
| `wbLockedItems` | frontend/js/whiteboard.js:8816 |
| `wbMapNodeScreenBox` | frontend/js/whiteboard.js:7351 |
| `wbMapNodeTakeBack` | frontend/js/whiteboard.js:18659 |
| `wbMapStripClearOfHandle` | frontend/js/whiteboard.js:5030 |
| `wbMapStripToggles` | frontend/js/whiteboard.js:4959 |
| `wbMapTaskTallyKey` | frontend/js/whiteboard.js:19588 |
| `wbMenuAnchorOk` | frontend/js/whiteboard.js:7345 |
| `wbMenuSpotBeside` | frontend/js/whiteboard.js:7457 |
| `wbMigrateBackground` | frontend/js/whiteboard.js:1184 |
| `wbMindMapAddCard` | frontend/js/whiteboard.js:4527 |
| `wbMindMapAddChild` | frontend/js/whiteboard.js:4713 |
| `wbMindMapAddSibling` | frontend/js/whiteboard.js:4741 |
| `wbMindMapEnsureMap` | frontend/js/whiteboard.js:4516 |
| `wbMindMapSpanningTree` | frontend/js/whiteboard.js:4430 |
| `wbMoveItemBy` | frontend/js/whiteboard.js:3630 |
| `wbMultiKey` | frontend/js/whiteboard.js:1537 |
| `wbMultiSelectionEntries` | frontend/js/whiteboard.js:16791 |
| `wbMultiSnapshot` | frontend/js/whiteboard.js:16873 |
| `wbNamedLayerFlag` | frontend/js/whiteboard.js:5575 |
| `wbNavigatorDragEnd` | frontend/js/whiteboard.js:2257 |
| `wbNavigatorDragFrame` | frontend/js/whiteboard.js:2236 |
| `wbNavigatorDragMove` | frontend/js/whiteboard.js:2229 |
| `wbNavigatorDragStart` | frontend/js/whiteboard.js:2182 |
| `wbNavigatorFrozenProjection` | frontend/js/whiteboard.js:2030 |
| `wbNavigatorIsSelected` | frontend/js/whiteboard.js:2044 |
| `wbNavigatorMapping` | frontend/js/whiteboard.js:2016 |
| `wbNavigatorOpen` | frontend/js/whiteboard.js:1926 |
| `wbNavigatorPlaceViewport` | frontend/js/whiteboard.js:2097 |
| `wbNavigatorProjectionFor` | frontend/js/whiteboard.js:1991 |
| `wbNavigatorSelectionKey` | frontend/js/whiteboard.js:2039 |
| `wbNavigatorSnapshot` | frontend/js/whiteboard.js:1964 |
| `wbNavigatorUpdateViewport` | frontend/js/whiteboard.js:2127 |
| `wbNearestAnchor` | frontend/js/whiteboard.js:2778 |
| `wbNewUntitledBoard` | frontend/js/whiteboard.js:15389 |
| `wbNudgeSelection` | frontend/js/whiteboard.js:3915 |
| `wbNudgeShapeLabel` | frontend/js/whiteboard.js:15953 |
| `wbObjectPaintKey` | frontend/js/whiteboard.js:19560 |
| `wbOnBoardCopy` | frontend/js/whiteboard.js:6484 |
| `wbOnLockHoverMove` | frontend/js/whiteboard.js:9023 |
| `wbOnLockPress` | frontend/js/whiteboard.js:9037 |
| `wbOpenBoardSearch` | frontend/js/whiteboard.js:2546 |
| `wbOpenComments` | frontend/js/whiteboard.js:9168 |
| `wbOpenContextMenuFor` | frontend/js/whiteboard.js:7522 |
| `wbOpenMapNodeMenu` | frontend/js/whiteboard.js:7384 |
| `wbOpenSketchLabelEditor` | frontend/js/whiteboard.js:16028 |
| `wbOwnsChord` | frontend/js/whiteboard.js:3878 |
| `wbPaintCommentMarks` | frontend/js/whiteboard.js:9094 |
| `wbPaintFrame` | frontend/js/whiteboard.js:9697 |
| `wbPaintHidden` | frontend/js/whiteboard.js:8898 |
| `wbPaintLinkLabel` | frontend/js/whiteboard.js:16133 |
| `wbPaintLockHover` | frontend/js/whiteboard.js:8980 |
| `wbPaintLocks` | frontend/js/whiteboard.js:8936 |
| `wbPaintShapeLabel` | frontend/js/whiteboard.js:15969 |
| `wbPaintStickyDates` | frontend/js/whiteboard.js:18686 |
| `wbPaintTextContent` | frontend/js/whiteboard.js:8048 |
| `wbParkContextOnRail` | frontend/js/whiteboard.js:4213 |
| `wbPasteClipboard` | frontend/js/whiteboard.js:6447 |
| `wbPasteCopiedStyle` | frontend/js/whiteboard.js:4062 |
| `wbPastePlan` | frontend/js/whiteboard.js:6505 |
| `wbPasteText` | frontend/js/whiteboard.js:6516 |
| `wbPastedLines` | frontend/js/whiteboard.js:6495 |
| `wbPathBBox` | frontend/js/whiteboard.js:15714 |
| `wbPathPolyline` | frontend/js/whiteboard.js:2605 |
| `wbPickStyle` | frontend/js/whiteboard.js:4027 |
| `wbPillRayIntersection` | frontend/js/whiteboard.js:2848 |
| `wbPlaceBox` | frontend/js/whiteboard.js:9717 |
| `wbPlaceCopies` | frontend/js/whiteboard.js:6425 |
| `wbPlacedBounds` | frontend/js/whiteboard.js:6655 |
| `wbPointInItem` | frontend/js/whiteboard.js:3006 |
| `wbPointerOnBoard` | frontend/js/whiteboard.js:6344 |
| `wbPolylineAt` | frontend/js/whiteboard.js:3540 |
| `wbPortFractions` | frontend/js/whiteboard.js:2700 |
| `wbPortsForPath` | frontend/js/whiteboard.js:2720 |
| `wbPresentLaser` | frontend/js/whiteboard.js:20838 |
| `wbPresentLaserButton` | frontend/js/whiteboard.js:20830 |
| `wbPresentShow` | frontend/js/whiteboard.js:20793 |
| `wbPresentSteps` | frontend/js/whiteboard.js:20749 |
| `wbPublishInvZoom` | frontend/js/whiteboard.js:764 |
| `wbPushDragUndo` | frontend/js/whiteboard.js:6198 |
| `wbPushMoveBatch` | frontend/js/whiteboard.js:3649 |
| `wbPushUndo` | frontend/js/whiteboard.js:7746 |
| `wbQueueSelectionBar` | frontend/js/whiteboard.js:5004 |
| `wbRasterizeSvg` | frontend/js/whiteboard.js:10444 |
| `wbRecordGesture` | frontend/js/whiteboard.js:7883 |
| `wbRedo` | frontend/js/whiteboard.js:8643 |
| `wbRefitIfFitted` | frontend/js/whiteboard.js:1782 |
| `wbRefreshHighlighterBlend` | frontend/js/whiteboard.js:1274 |
| `wbRefreshRaster` | frontend/js/whiteboard.js:756 |
| `wbRegenerateShapeCaps` | frontend/js/whiteboard.js:16266 |
| `wbRegisterCommentSurfaces` | frontend/js/whiteboard.js:9554 |
| `wbRegisterEditorContexts` | frontend/js/whiteboard.js:8151 |
| `wbRemapUndoIds` | frontend/js/whiteboard.js:7767 |
| `wbRememberedBoardKind` | frontend/js/whiteboard.js:15438 |
| `wbRenderCloneGrips` | frontend/js/whiteboard.js:6793 |
| `wbRenderLinkEndpointHandles` | frontend/js/whiteboard.js:16389 |
| `wbRenderLinkLabelGrip` | frontend/js/whiteboard.js:16688 |
| `wbRenderMultiSelectionHandles` | frontend/js/whiteboard.js:16924 |
| `wbRenderNavigator` | frontend/js/whiteboard.js:2049 |
| `wbRenderRelease` | frontend/js/whiteboard.js:5104 |
| `wbRenderSketchHandles` | frontend/js/whiteboard.js:17251 |
| `wbRenderWaypointHandles` | frontend/js/whiteboard.js:16537 |
| `wbReplaceText` | frontend/js/whiteboard.js:2344 |
| `wbResetRotation` | frontend/js/whiteboard.js:18432 |
| `wbResolveLinkEndpoints` | frontend/js/whiteboard.js:3053 |
| `wbRestoreBox` | frontend/js/whiteboard.js:6090 |
| `wbRestoreLinks` | frontend/js/whiteboard.js:7929 |
| `wbRestoreMove` | frontend/js/whiteboard.js:6062 |
| `wbRestoreMultiSnapshot` | frontend/js/whiteboard.js:16886 |
| `wbReviewMapProposal` | frontend/js/whiteboard.js:10585 |
| `wbRotatePoint` | frontend/js/whiteboard.js:2590 |
| `wbSameSizeSelection` | frontend/js/whiteboard.js:3781 |
| `wbSameView` | frontend/js/whiteboard.js:1776 |
| `wbSaveBulkMove` | frontend/js/whiteboard.js:6298 |
| `wbSaveExpandedNodes` | frontend/js/whiteboard.js:263 |
| `wbSaveMapBulkMove` | frontend/js/whiteboard.js:6272 |
| `wbSaveMultiSnapshot` | frontend/js/whiteboard.js:16904 |
| `wbSaveNode` | frontend/js/whiteboard.js:18589 |
| `wbSaveObject` | frontend/js/whiteboard.js:18612 |
| `wbSaveSketchD` | frontend/js/whiteboard.js:16225 |
| `wbSaveSketchProps` | frontend/js/whiteboard.js:16196 |
| `wbSaveToLibrary` | frontend/js/whiteboard.js:10913 |
| `wbScheduleCardClampSync` | frontend/js/whiteboard.js:311 |
| `wbScheduleCull` | frontend/js/whiteboard.js:586 |
| `wbScheduleRender` | frontend/js/whiteboard.js:17489 |
| `wbScheduleStickyDates` | frontend/js/whiteboard.js:18681 |
| `wbScreenToBoard` | frontend/js/whiteboard.js:434 |
| `wbSearchItem` | frontend/js/whiteboard.js:2430 |
| `wbSearchTextFor` | frontend/js/whiteboard.js:2311 |
| `wbSegmentCross` | frontend/js/whiteboard.js:3376 |
| `wbSelectAllItems` | frontend/js/whiteboard.js:4824 |
| `wbSelectableItems` | frontend/js/whiteboard.js:4837 |
| `wbSelectedKeys` | frontend/js/whiteboard.js:10000 |
| `wbSelectedSketchOrNull` | frontend/js/whiteboard.js:3992 |
| `wbSelectedTextObjectOrNull` | frontend/js/whiteboard.js:3997 |
| `wbSelectionBounds` | frontend/js/whiteboard.js:9963 |
| `wbSelectionEntries` | frontend/js/whiteboard.js:3615 |
| `wbSendSelectionZOrder` | frontend/js/whiteboard.js:5645 |
| `wbSetBackground` | frontend/js/whiteboard.js:1155 |
| `wbSetComments` | frontend/js/whiteboard.js:9072 |
| `wbSetExportPngPrefs` | frontend/js/whiteboard.js:10818 |
| `wbSetHidden` | frontend/js/whiteboard.js:8914 |
| `wbSetHiddenKeys` | frontend/js/whiteboard.js:8889 |
| `wbSetLocked` | frontend/js/whiteboard.js:8826 |
| `wbSetMenuSpot` | frontend/js/whiteboard.js:7493 |
| `wbSetStickyPaper` | frontend/js/whiteboard.js:8753 |
| `wbSetZOrder` | frontend/js/whiteboard.js:5465 |
| `wbShaftPoints` | frontend/js/whiteboard.js:3440 |
| `wbShapeDims` | frontend/js/whiteboard.js:1323 |
| `wbShapeLabelArea` | frontend/js/whiteboard.js:15847 |
| `wbShapeLabelInk` | frontend/js/whiteboard.js:15963 |
| `wbShapeLabelKind` | frontend/js/whiteboard.js:15835 |
| `wbShowAlignmentGuides` | frontend/js/whiteboard.js:1075 |
| `wbShowAnchorHints` | frontend/js/whiteboard.js:3579 |
| `wbShowBoardsLanding` | frontend/js/whiteboard.js:20080 |
| `wbShowCanvasView` | frontend/js/whiteboard.js:20074 |
| `wbShowToolSettings` | frontend/js/whiteboard.js:3978 |
| `wbSizeItemTo` | frontend/js/whiteboard.js:3804 |
| `wbSketchAngleFromCenterDeg` | frontend/js/whiteboard.js:8379 |
| `wbSketchCaps` | frontend/js/whiteboard.js:16322 |
| `wbSketchData` | frontend/js/whiteboard.js:8800 |
| `wbSketchHiddenOnBoard` | frontend/js/whiteboard.js:8877 |
| `wbSketchIsArrow` | frontend/js/whiteboard.js:16255 |
| `wbSketchIsClosedShape` | frontend/js/whiteboard.js:15816 |
| `wbSketchIsDrawable` | frontend/js/whiteboard.js:2919 |
| `wbSketchParsedData` | frontend/js/whiteboard.js:16177 |
| `wbSketchResizeTransform` | frontend/js/whiteboard.js:15781 |
| `wbSnap` | frontend/js/whiteboard.js:800 |
| `wbSnapOn` | frontend/js/whiteboard.js:788 |
| `wbSpacingSeries` | frontend/js/whiteboard.js:1025 |
| `wbSquareCorner` | frontend/js/whiteboard.js:9731 |
| `wbStableDragContainer` | frontend/js/whiteboard.js:8025 |
| `wbStampMenuRoles` | frontend/js/whiteboard.js:11257 |
| `wbStartPanShield` | frontend/js/whiteboard.js:488 |
| `wbStartPresenting` | frontend/js/whiteboard.js:20765 |
| `wbStepSelectionZOrder` | frontend/js/whiteboard.js:5583 |
| `wbStickerSize` | frontend/js/whiteboard.js:4034 |
| `wbStickyFolds` | frontend/js/whiteboard.js:8705 |
| `wbStickyRemind` | frontend/js/whiteboard.js:18719 |
| `wbStopPresenting` | frontend/js/whiteboard.js:20880 |
| `wbSvgEscape` | frontend/js/whiteboard.js:9873 |
| `wbSvgText` | frontend/js/whiteboard.js:9904 |
| `wbSvgWrapLines` | frontend/js/whiteboard.js:9885 |
| `wbSyncBoardCount` | frontend/js/whiteboard.js:15305 |
| `wbSyncCardClamps` | frontend/js/whiteboard.js:288 |
| `wbSyncExportSeg` | frontend/js/whiteboard.js:11050 |
| `wbSyncGridToTransform` | frontend/js/whiteboard.js:682 |
| `wbTakesComments` | frontend/js/whiteboard.js:9056 |
| `wbThemeBoardHex` | frontend/js/whiteboard.js:1122 |
| `wbToggleNavigator` | frontend/js/whiteboard.js:2276 |
| `wbToggleReplace` | frontend/js/whiteboard.js:2536 |
| `wbTrackMapStripMenu` | frontend/js/whiteboard.js:4983 |
| `wbTransformPathD` | frontend/js/whiteboard.js:15616 |
| `wbTranslateSelectionChrome` | frontend/js/whiteboard.js:5787 |
| `wbTrashDelete` | frontend/js/whiteboard.js:6021 |
| `wbTrashHide` | frontend/js/whiteboard.js:5970 |
| `wbTrashSetHot` | frontend/js/whiteboard.js:5963 |
| `wbTrashTake` | frontend/js/whiteboard.js:6006 |
| `wbTrashTarget` | frontend/js/whiteboard.js:5947 |
| `wbUndo` | frontend/js/whiteboard.js:8622 |
| `wbUngroupSelection` | frontend/js/whiteboard.js:1569 |
| `wbUnlockAll` | frontend/js/whiteboard.js:8865 |
| `wbUpdateContextBar` | frontend/js/whiteboard.js:4244 |
| `wbUpdateLinkedSketches` | frontend/js/whiteboard.js:19672 |
| `wbUpdateSearchCount` | frontend/js/whiteboard.js:2451 |
| `wbUpdateSelectionBar` | frontend/js/whiteboard.js:5121 |
| `wbUpdateUndoRedoButtons` | frontend/js/whiteboard.js:7725 |
| `wbViewCentre` | frontend/js/whiteboard.js:6614 |
| `wbVisibleBounds` | frontend/js/whiteboard.js:9983 |
| `wbVisibleCanvasRect` | frontend/js/whiteboard.js:6603 |
| `wbWalkItems` | frontend/js/whiteboard.js:4889 |
| `wbWaypointAddSpots` | frontend/js/whiteboard.js:16656 |
| `wbWaypointInsert` | frontend/js/whiteboard.js:3357 |
| `wbWireContextMenu` | frontend/js/whiteboard.js:7641 |
| `wbWithDir` | frontend/js/whiteboard.js:2822 |
| `wbWrapShapeLabel` | frontend/js/whiteboard.js:15872 |
| `wbWrapTextSelection` | frontend/js/whiteboard.js:8063 |
| `wbWriteZ` | frontend/js/whiteboard.js:5607 |
| `wbZOrderPeers` | frontend/js/whiteboard.js:5455 |
| `wbZOrderStepPeers` | frontend/js/whiteboard.js:5550 |
| `wbZOrderStepPlan` | frontend/js/whiteboard.js:5508 |
| `wbZOrderTargets` | frontend/js/whiteboard.js:5627 |
| `wbZoomFilter` | frontend/js/whiteboard.js:79 |
| `wbZoomFrameWork` | frontend/js/whiteboard.js:511 |
| `wbZoomToFit` | frontend/js/whiteboard.js:1794 |

### frontend/js/writing-desk.js (5)

| Name | File:line |
|---|---|
| `composeDraft` | frontend/js/writing-desk.js:19 |
| `draftWithHeading` | frontend/js/writing-desk.js:218 |
| `saveDraftAsNote` | frontend/js/writing-desk.js:223 |
| `streamDraft` | frontend/js/writing-desk.js:136 |
| `suggestDraftTitle` | frontend/js/writing-desk.js:174 |

### frontend/sw.js (3)

| Name | File:line |
|---|---|
| `cacheable` | frontend/sw.js:55 |
| `keepOfflinePage` | frontend/sw.js:72 |
| `storable` | frontend/sw.js:64 |

## Frontend ids (2313)

Every `id="..."` in `frontend/index.html`, sorted by id.

| Id | File:line |
|---|---|
| `about-emblem` | frontend/index.html:12997 |
| `about-force-reload` | frontend/index.html:13016 |
| `about-install` | frontend/index.html:13026 |
| `about-install-help` | frontend/index.html:13034 |
| `about-install-note` | frontend/index.html:13027 |
| `about-install-row` | frontend/index.html:13025 |
| `about-motion` | frontend/index.html:13007 |
| `about-restart` | frontend/index.html:13015 |
| `about-restart-row` | frontend/index.html:13014 |
| `about-shortcuts` | frontend/index.html:13345 |
| `about-take-tour` | frontend/index.html:13326 |
| `about-version` | frontend/index.html:13004 |
| `accent-custom` | frontend/index.html:10455 |
| `accent-custom-clear` | frontend/index.html:10456 |
| `accent-swatches` | frontend/index.html:10446 |
| `account-allow-lan` | frontend/index.html:12493 |
| `account-change` | frontend/index.html:12572 |
| `account-confirm` | frontend/index.html:12569 |
| `account-current` | frontend/index.html:12563 |
| `account-facts` | frontend/index.html:12417 |
| `account-help` | frontend/index.html:12406 |
| `account-idle-ttl` | frontend/index.html:12626 |
| `account-lan-cert` | frontend/index.html:12504 |
| `account-lan-cert-expiry` | frontend/index.html:12508 |
| `account-lan-cert-names` | frontend/index.html:12507 |
| `account-lan-download` | frontend/index.html:12510 |
| `account-lan-fingerprint` | frontend/index.html:12506 |
| `account-lan-regenerate` | frontend/index.html:12516 |
| `account-lan-state` | frontend/index.html:12499 |
| `account-lock-all` | frontend/index.html:12636 |
| `account-new` | frontend/index.html:12566 |
| `account-password-on-open` | frontend/index.html:12439 |
| `account-recovery-make` | frontend/index.html:12669 |
| `account-recovery-state` | frontend/index.html:12653 |
| `account-recovery-status` | frontend/index.html:12670 |
| `account-rekey` | frontend/index.html:12602 |
| `account-rekey-status` | frontend/index.html:12603 |
| `account-status` | frontend/index.html:12573 |
| `activity-empty` | frontend/index.html:860 |
| `activity-finished` | frontend/index.html:863 |
| `activity-help` | frontend/index.html:842 |
| `activity-list` | frontend/index.html:859 |
| `activity-model` | frontend/index.html:858 |
| `activity-more` | frontend/index.html:832 |
| `activity-running` | frontend/index.html:857 |
| `activity-runs` | frontend/index.html:865 |
| `activity-tab-running` | frontend/index.html:854 |
| `activity-tab-runs` | frontend/index.html:855 |
| `activity-tabs` | frontend/index.html:853 |
| `agent-monitor` | frontend/index.html:820 |
| `agent-monitor-clear` | frontend/index.html:833 |
| `agent-monitor-close` | frontend/index.html:838 |
| `agent-monitor-empty` | frontend/index.html:867 |
| `agent-monitor-log-toggle` | frontend/index.html:835 |
| `agent-monitor-logs` | frontend/index.html:868 |
| `agent-monitor-runs` | frontend/index.html:866 |
| `ai-answer` | frontend/index.html:2206 |
| `ai-answer-grounding` | frontend/index.html:2211 |
| `ai-mark` | frontend/index.html:8219 |
| `ai-status` | frontend/index.html:8221 |
| `ai-status-detail` | frontend/index.html:8228 |
| `ai-status-label` | frontend/index.html:8224 |
| `ai-status-popup` | frontend/index.html:8226 |
| `ai-status-title` | frontend/index.html:8227 |
| `always-available-help` | frontend/index.html:11269 |
| `answered-by` | frontend/index.html:2179 |
| `app-cache-help` | frontend/index.html:12378 |
| `app-main` | frontend/index.html:1242 |
| `app-quit` | frontend/index.html:12015 |
| `appearance-reset` | frontend/index.html:11120 |
| `ask` | frontend/index.html:1975 |
| `ask-answer-foot` | frontend/index.html:2221 |
| `ask-answer-related` | frontend/index.html:2222 |
| `ask-answer-sources` | frontend/index.html:2223 |
| `ask-as-of` | frontend/index.html:2057 |
| `ask-as-of-clear` | frontend/index.html:2058 |
| `ask-as-of-row` | frontend/index.html:2054 |
| `ask-btn` | frontend/index.html:2089 |
| `ask-chart` | frontend/index.html:2205 |
| `ask-clear` | frontend/index.html:2067 |
| `ask-feature-model` | frontend/index.html:2004 |
| `ask-followups` | frontend/index.html:2224 |
| `ask-history-badge` | frontend/index.html:2010 |
| `ask-history-clear` | frontend/index.html:2117 |
| `ask-history-close` | frontend/index.html:2123 |
| `ask-history-empty` | frontend/index.html:2128 |
| `ask-history-list` | frontend/index.html:2127 |
| `ask-history-more` | frontend/index.html:2131 |
| `ask-history-panel` | frontend/index.html:2108 |
| `ask-history-pinned-only` | frontend/index.html:2115 |
| `ask-history-search` | frontend/index.html:2111 |
| `ask-history-toggle` | frontend/index.html:2007 |
| `ask-idle` | frontend/index.html:2138 |
| `ask-mode-select` | frontend/index.html:2073 |
| `ask-offline` | frontend/index.html:2099 |
| `ask-scope` | frontend/index.html:2044 |
| `ask-scope-clear` | frontend/index.html:2047 |
| `ask-scope-text` | frontend/index.html:2046 |
| `ask-search-tune` | frontend/index.html:2086 |
| `ask-source-help` | frontend/index.html:2015 |
| `ask-status` | frontend/index.html:2133 |
| `ask-time-travel` | frontend/index.html:2083 |
| `ask-trail` | frontend/index.html:2198 |
| `ask-use-ai` | frontend/index.html:1988 |
| `ask-use-ai-row` | frontend/index.html:1987 |
| `asked-question` | frontend/index.html:2199 |
| `assistant-avatar` | frontend/index.html:10921 |
| `assistant-avatar-row` | frontend/index.html:10916 |
| `atlas-host` | frontend/index.html:494 |
| `atlas-look` | frontend/index.html:10932 |
| `atlas-look-row` | frontend/index.html:10927 |
| `atlas-open` | frontend/index.html:12974 |
| `atlas-row-help` | frontend/index.html:12977 |
| `atlas-row-starters` | frontend/index.html:12985 |
| `atlas-style` | frontend/index.html:10910 |
| `atlas-style-row` | frontend/index.html:10905 |
| `attach-image` | frontend/index.html:2998 |
| `attach-note` | frontend/index.html:2919 |
| `autonomous-ai-help` | frontend/index.html:11799 |
| `autonomous-review` | frontend/index.html:11962 |
| `autonomous-review-clear` | frontend/index.html:11966 |
| `autonomous-review-list` | frontend/index.html:11964 |
| `autonomous-review-title` | frontend/index.html:11963 |
| `autonomous-settings-panel` | frontend/index.html:11906 |
| `autonomous-trigger` | frontend/index.html:11953 |
| `avatar-buddy` | frontend/index.html:10809 |
| `avatar-buddy-actions` | frontend/index.html:10846 |
| `avatar-buddy-actions-row` | frontend/index.html:10841 |
| `avatar-buddy-activities` | frontend/index.html:10884 |
| `avatar-buddy-activities-fold` | frontend/index.html:10882 |
| `avatar-buddy-custom` | frontend/index.html:10889 |
| `avatar-buddy-make` | frontend/index.html:10821 |
| `avatar-buddy-make-go` | frontend/index.html:10821 |
| `avatar-buddy-make-text` | frontend/index.html:10821 |
| `avatar-buddy-motion` | frontend/index.html:10860 |
| `avatar-buddy-motion-row` | frontend/index.html:10855 |
| `avatar-buddy-motion-why` | frontend/index.html:10858 |
| `avatar-buddy-name` | frontend/index.html:10895 |
| `avatar-buddy-parts` | frontend/index.html:10902 |
| `avatar-buddy-preset-name` | frontend/index.html:10878 |
| `avatar-buddy-preset-save` | frontend/index.html:10879 |
| `avatar-buddy-presets` | frontend/index.html:10876 |
| `avatar-buddy-presets-fold` | frontend/index.html:10874 |
| `avatar-buddy-recall` | frontend/index.html:10816 |
| `avatar-buddy-row` | frontend/index.html:10803 |
| `avatar-buddy-shuffle` | frontend/index.html:10898 |
| `avatar-buddy-size` | frontend/index.html:10831 |
| `avatar-buddy-size-row` | frontend/index.html:10826 |
| `avatar-follow` | frontend/index.html:10796 |
| `avatar-follow-row` | frontend/index.html:10795 |
| `avatar-motion` | frontend/index.html:10787 |
| `avatar-motion-row` | frontend/index.html:10782 |
| `backend-config` | frontend/index.html:9041 |
| `backend-help` | frontend/index.html:9050 |
| `backup-list` | frontend/index.html:12336 |
| `backup-now` | frontend/index.html:12332 |
| `backup-retention` | frontend/index.html:12344 |
| `backup-retention-row` | frontend/index.html:12342 |
| `backup-retention-status` | frontend/index.html:12345 |
| `backup-status` | frontend/index.html:12333 |
| `backups-help` | frontend/index.html:12348 |
| `batch-bar` | frontend/index.html:2426 |
| `batch-cancel` | frontend/index.html:2439 |
| `batch-category-host` | frontend/index.html:2434 |
| `batch-count` | frontend/index.html:2427 |
| `batch-delete` | frontend/index.html:2436 |
| `batch-more-host` | frontend/index.html:2438 |
| `batch-select-all` | frontend/index.html:2428 |
| `batch-tag` | frontend/index.html:2435 |
| `battery-mode-help` | frontend/index.html:11982 |
| `bench-box` | frontend/index.html:9350 |
| `bench-help` | frontend/index.html:9360 |
| `bench-models` | frontend/index.html:9375 |
| `bench-results` | frontend/index.html:9385 |
| `bench-run` | frontend/index.html:9377 |
| `bench-status` | frontend/index.html:9384 |
| `bench-stop` | frontend/index.html:9381 |
| `bg-art-style` | frontend/index.html:10989 |
| `bg-art-toggle` | frontend/index.html:10970 |
| `bg-intensity` | frontend/index.html:11023 |
| `bg-intensity-row` | frontend/index.html:11017 |
| `bg-intensity-value` | frontend/index.html:11025 |
| `bg-motion` | frontend/index.html:11009 |
| `bg-motion-hint` | frontend/index.html:11007 |
| `bg-motion-row` | frontend/index.html:11000 |
| `bg-style-hint` | frontend/index.html:10982 |
| `bg-style-row` | frontend/index.html:10977 |
| `binned-body` | frontend/index.html:13470 |
| `binned-card` | frontend/index.html:13461 |
| `binned-close` | frontend/index.html:13465 |
| `binned-meta` | frontend/index.html:13469 |
| `binned-overlay` | frontend/index.html:13459 |
| `binned-purge` | frontend/index.html:13473 |
| `binned-restore` | frontend/index.html:13472 |
| `bookmark-add` | frontend/index.html:7946 |
| `bookmark-count` | frontend/index.html:7971 |
| `bookmark-empty` | frontend/index.html:7973 |
| `bookmark-form` | frontend/index.html:7957 |
| `bookmark-form-done` | frontend/index.html:7968 |
| `bookmark-group-chips` | frontend/index.html:7970 |
| `bookmark-group-input` | frontend/index.html:7962 |
| `bookmark-group-manage` | frontend/index.html:7942 |
| `bookmark-group-new` | frontend/index.html:7940 |
| `bookmark-group-options` | frontend/index.html:7964 |
| `bookmark-help` | frontend/index.html:7930 |
| `bookmark-help-toggle` | frontend/index.html:7927 |
| `bookmark-list` | frontend/index.html:7972 |
| `bookmark-more-menu` | frontend/index.html:7933 |
| `bookmark-no-match` | frontend/index.html:7979 |
| `bookmark-no-match-clear` | frontend/index.html:7983 |
| `bookmark-no-match-text` | frontend/index.html:7982 |
| `bookmark-note-input` | frontend/index.html:7965 |
| `bookmark-search` | frontend/index.html:7910 |
| `bookmark-sort` | frontend/index.html:7918 |
| `bookmark-title-input` | frontend/index.html:7960 |
| `bookmark-url-input` | frontend/index.html:7958 |
| `boot-splash` | frontend/index.html:91 |
| `boot-splash-progress-fill` | frontend/index.html:105 |
| `border-style-seg` | frontend/index.html:10589 |
| `brand-logo` | frontend/index.html:124 |
| `browse` | frontend/index.html:2287 |
| `builtin-embed-note` | frontend/index.html:9518 |
| `builtin-model-name` | frontend/index.html:9513 |
| `captions-copy` | frontend/index.html:8176 |
| `captions-dock` | frontend/index.html:8166 |
| `captions-help` | frontend/index.html:8180 |
| `captions-help-toggle` | frontend/index.html:8177 |
| `captions-meta` | frontend/index.html:8169 |
| `captions-past` | frontend/index.html:8172 |
| `captions-running` | frontend/index.html:8173 |
| `captions-stop` | frontend/index.html:8183 |
| `capture` | frontend/index.html:1450 |
| `capture-anywhere-box` | frontend/index.html:11314 |
| `capture-anywhere-help` | frontend/index.html:11324 |
| `capture-clear` | frontend/index.html:1595 |
| `capture-command` | frontend/index.html:11336 |
| `capture-command-copy` | frontend/index.html:11337 |
| `capture-help` | frontend/index.html:1463 |
| `capture-help-hint` | frontend/index.html:1480 |
| `capture-space-hint` | frontend/index.html:1701 |
| `category-list` | frontend/index.html:1359 |
| `change-password-help` | frontend/index.html:12554 |
| `changelog-body` | frontend/index.html:13319 |
| `changelog-fold` | frontend/index.html:13317 |
| `chat-actions-menu` | frontend/index.html:2773 |
| `chat-active-model` | frontend/index.html:2655 |
| `chat-attachments` | frontend/index.html:2858 |
| `chat-board-attachments` | frontend/index.html:2884 |
| `chat-clear` | frontend/index.html:3023 |
| `chat-compress` | frontend/index.html:2759 |
| `chat-compress-apply` | frontend/index.html:2786 |
| `chat-compress-cancel` | frontend/index.html:2787 |
| `chat-compress-panel` | frontend/index.html:2780 |
| `chat-compress-stats` | frontend/index.html:2782 |
| `chat-compress-text` | frontend/index.html:2783 |
| `chat-compressed` | frontend/index.html:2711 |
| `chat-context` | frontend/index.html:2680 |
| `chat-context-compact` | frontend/index.html:2694 |
| `chat-context-pop` | frontend/index.html:2683 |
| `chat-context-pop-fill` | frontend/index.html:2685 |
| `chat-context-pop-rows` | frontend/index.html:2686 |
| `chat-context-pop-total` | frontend/index.html:2684 |
| `chat-context-window` | frontend/index.html:2696 |
| `chat-doc-attachments` | frontend/index.html:2869 |
| `chat-dock-more-btn` | frontend/index.html:3142 |
| `chat-dock-more-panel` | frontend/index.html:3147 |
| `chat-elapsed` | frontend/index.html:3225 |
| `chat-feature-model` | frontend/index.html:3104 |
| `chat-file-attachments` | frontend/index.html:2876 |
| `chat-fork` | frontend/index.html:2756 |
| `chat-help` | frontend/index.html:2770 |
| `chat-help-text` | frontend/index.html:2771 |
| `chat-help-toggle` | frontend/index.html:2767 |
| `chat-image-attachments` | frontend/index.html:2863 |
| `chat-image-input` | frontend/index.html:3014 |
| `chat-input` | frontend/index.html:3021 |
| `chat-jump-latest` | frontend/index.html:2824 |
| `chat-jump-latest-dots` | frontend/index.html:2827 |
| `chat-jump-latest-label` | frontend/index.html:2828 |
| `chat-main` | frontend/index.html:2579 |
| `chat-messages` | frontend/index.html:2807 |
| `chat-mode-seg` | frontend/index.html:3107 |
| `chat-model-apply` | frontend/index.html:9103 |
| `chat-model-note` | frontend/index.html:9107 |
| `chat-model-panel` | frontend/index.html:8360 |
| `chat-model-select` | frontend/index.html:9102 |
| `chat-model-stop` | frontend/index.html:9105 |
| `chat-new` | frontend/index.html:2564 |
| `chat-nudge` | frontend/index.html:2906 |
| `chat-offline` | frontend/index.html:2853 |
| `chat-plan` | frontend/index.html:3070 |
| `chat-results` | frontend/index.html:2146 |
| `chat-selection-attachment` | frontend/index.html:2890 |
| `chat-send` | frontend/index.html:3025 |
| `chat-sidebar` | frontend/index.html:2543 |
| `chat-sidebar-sort` | frontend/index.html:2557 |
| `chat-skills` | frontend/index.html:3036 |
| `chat-status` | frontend/index.html:3213 |
| `chat-stop` | frontend/index.html:3026 |
| `chat-suggest` | frontend/index.html:2832 |
| `chat-title` | frontend/index.html:2644 |
| `chat-tune-search` | frontend/index.html:3190 |
| `chat-turns` | frontend/index.html:2663 |
| `chat-uncompress` | frontend/index.html:2713 |
| `chat-usage` | frontend/index.html:2706 |
| `chat-web-attachment` | frontend/index.html:2894 |
| `clear-app-cache` | frontend/index.html:12387 |
| `command-palette-clear` | frontend/index.html:639 |
| `command-palette-close` | frontend/index.html:605 |
| `command-palette-help` | frontend/index.html:609 |
| `command-palette-input` | frontend/index.html:636 |
| `command-palette-intro` | frontend/index.html:648 |
| `command-palette-menu` | frontend/index.html:694 |
| `command-palette-offline` | frontend/index.html:653 |
| `command-palette-overlay` | frontend/index.html:567 |
| `command-palette-results` | frontend/index.html:641 |
| `command-palette-starters` | frontend/index.html:670 |
| `command-palette-status` | frontend/index.html:685 |
| `command-palette-stop` | frontend/index.html:703 |
| `command-palette-use-note` | frontend/index.html:683 |
| `command-palette-use-note-label` | frontend/index.html:682 |
| `command-palette-use-note-text` | frontend/index.html:684 |
| `composer-voice-help` | frontend/index.html:9739 |
| `connections-card` | frontend/index.html:13431 |
| `connections-close` | frontend/index.html:13437 |
| `connections-dock` | frontend/index.html:13435 |
| `connections-list` | frontend/index.html:13443 |
| `connections-overlay` | frontend/index.html:13429 |
| `connections-status` | frontend/index.html:13442 |
| `connections-subject` | frontend/index.html:13441 |
| `connections-title` | frontend/index.html:13433 |
| `contents-collapse` | frontend/index.html:8078 |
| `contents-empty` | frontend/index.html:8096 |
| `contents-expand` | frontend/index.html:8076 |
| `contents-filter` | frontend/index.html:8046 |
| `contents-group` | frontend/index.html:8054 |
| `contents-help` | frontend/index.html:8066 |
| `contents-hint` | frontend/index.html:8093 |
| `contents-intro` | frontend/index.html:8084 |
| `contents-more` | frontend/index.html:8073 |
| `contents-no-match` | frontend/index.html:8095 |
| `contents-outline` | frontend/index.html:8094 |
| `contents-refresh` | frontend/index.html:8063 |
| `contents-summary` | frontend/index.html:8092 |
| `contrast-toggle` | frontend/index.html:10711 |
| `conv-browse-all` | frontend/index.html:2575 |
| `conv-empty` | frontend/index.html:2573 |
| `conversation-list` | frontend/index.html:2574 |
| `copy-btn` | frontend/index.html:2189 |
| `custom-css` | frontend/index.html:11108 |
| `custom-css-apply` | frontend/index.html:11111 |
| `custom-css-clear` | frontend/index.html:11112 |
| `custom-css-help` | frontend/index.html:11101 |
| `custom-css-status` | frontend/index.html:11113 |
| `custom-download` | frontend/index.html:9422 |
| `custom-model-cards` | frontend/index.html:9432 |
| `custom-model-check` | frontend/index.html:9429 |
| `custom-model-name` | frontend/index.html:9426 |
| `custom-model-note` | frontend/index.html:9431 |
| `custom-theme-name` | frontend/index.html:10394 |
| `custom-theme-save` | frontend/index.html:10398 |
| `custom-themes` | frontend/index.html:10392 |
| `dash-clock-date` | frontend/index.html:1274 |
| `dash-clock-time` | frontend/index.html:1273 |
| `dash-customise` | frontend/index.html:1315 |
| `dash-edit` | frontend/index.html:1344 |
| `dash-editbar` | frontend/index.html:1336 |
| `dash-find` | frontend/index.html:1306 |
| `dash-glance` | frontend/index.html:1271 |
| `dash-greeting` | frontend/index.html:1263 |
| `dash-grid` | frontend/index.html:1346 |
| `dash-help` | frontend/index.html:1321 |
| `dash-help-toggle` | frontend/index.html:1318 |
| `dash-hero` | frontend/index.html:1256 |
| `dash-hero-emblem` | frontend/index.html:1260 |
| `dash-hero-new` | frontend/index.html:1270 |
| `dash-hint` | frontend/index.html:1337 |
| `dash-mark` | frontend/index.html:10956 |
| `dash-mark-row` | frontend/index.html:10951 |
| `dash-more` | frontend/index.html:1324 |
| `dash-quicklinks` | frontend/index.html:1330 |
| `dash-submessage` | frontend/index.html:1264 |
| `dash-widgets-dialog` | frontend/index.html:1222 |
| `dash-widgets-list` | frontend/index.html:1231 |
| `dash-widgets-open` | frontend/index.html:1343 |
| `dash-widgets-search` | frontend/index.html:1230 |
| `dashboard-greeting-regenerate` | frontend/index.html:9763 |
| `dashboard-greeting-status` | frontend/index.html:9766 |
| `dashboard-persona-mark` | frontend/index.html:9761 |
| `dashboard-persona-select` | frontend/index.html:9762 |
| `density-seg` | frontend/index.html:10535 |
| `desktop-advanced-fold` | frontend/index.html:13305 |
| `desktop-console-hint` | frontend/index.html:13271 |
| `desktop-console-row` | frontend/index.html:13267 |
| `desktop-tray-hint` | frontend/index.html:13291 |
| `desktop-tray-row` | frontend/index.html:13287 |
| `doc-ai` | frontend/index.html:4733 |
| `doc-ai-accept` | frontend/index.html:5298 |
| `doc-ai-cancel` | frontend/index.html:5297 |
| `doc-ai-cancel-run` | frontend/index.html:5272 |
| `doc-ai-close` | frontend/index.html:5233 |
| `doc-ai-diff` | frontend/index.html:5292 |
| `doc-ai-diff-block` | frontend/index.html:5290 |
| `doc-ai-diff-head` | frontend/index.html:5291 |
| `doc-ai-history` | frontend/index.html:5230 |
| `doc-ai-history-dialog` | frontend/index.html:1160 |
| `doc-ai-history-empty` | frontend/index.html:1169 |
| `doc-ai-history-list` | frontend/index.html:1168 |
| `doc-ai-instruction` | frontend/index.html:5268 |
| `doc-ai-model` | frontend/index.html:4807 |
| `doc-ai-panel` | frontend/index.html:5207 |
| `doc-ai-result` | frontend/index.html:5295 |
| `doc-ai-result-block` | frontend/index.html:5281 |
| `doc-ai-run` | frontend/index.html:5271 |
| `doc-ai-scope` | frontend/index.html:5262 |
| `doc-ai-status` | frontend/index.html:5275 |
| `doc-ai-title` | frontend/index.html:5218 |
| `doc-ai-verb` | frontend/index.html:5247 |
| `doc-ai-verb-help` | frontend/index.html:5253 |
| `doc-attach-bookmark` | frontend/index.html:4577 |
| `doc-autocorrect` | frontend/index.html:4917 |
| `doc-autocorrect-row` | frontend/index.html:4914 |
| `doc-back` | frontend/index.html:4623 |
| `doc-backlinks` | frontend/index.html:4561 |
| `doc-backlinks-wrap` | frontend/index.html:4559 |
| `doc-bookmarks` | frontend/index.html:4576 |
| `doc-bookmarks-wrap` | frontend/index.html:4574 |
| `doc-browse-all` | frontend/index.html:4501 |
| `doc-caret` | frontend/index.html:5154 |
| `doc-code-format` | frontend/index.html:4741 |
| `doc-code-run` | frontend/index.html:4747 |
| `doc-code-run-why` | frontend/index.html:4752 |
| `doc-code-wrap` | frontend/index.html:4868 |
| `doc-code-wrap-row` | frontend/index.html:4865 |
| `doc-comments` | frontend/index.html:4549 |
| `doc-comments-count` | frontend/index.html:4548 |
| `doc-comments-wrap` | frontend/index.html:4547 |
| `doc-complete` | frontend/index.html:4922 |
| `doc-complete-list` | frontend/index.html:5176 |
| `doc-complete-row` | frontend/index.html:4919 |
| `doc-connections` | frontend/index.html:4790 |
| `doc-content` | frontend/index.html:5106 |
| `doc-copy-link` | frontend/index.html:4801 |
| `doc-counts` | frontend/index.html:5133 |
| `doc-crumbs` | frontend/index.html:5091 |
| `doc-delete` | frontend/index.html:4940 |
| `doc-dictionary-add` | frontend/index.html:8820 |
| `doc-dictionary-close` | frontend/index.html:8785 |
| `doc-dictionary-count` | frontend/index.html:8791 |
| `doc-dictionary-dialog` | frontend/index.html:8765 |
| `doc-dictionary-export` | frontend/index.html:8783 |
| `doc-dictionary-field-hint` | frontend/index.html:8822 |
| `doc-dictionary-file` | frontend/index.html:8824 |
| `doc-dictionary-help` | frontend/index.html:8792 |
| `doc-dictionary-import` | frontend/index.html:8781 |
| `doc-dictionary-list` | frontend/index.html:8823 |
| `doc-dictionary-search` | frontend/index.html:8817 |
| `doc-dictionary-title` | frontend/index.html:8769 |
| `doc-dim-others` | frontend/index.html:4888 |
| `doc-dock-menu` | frontend/index.html:4771 |
| `doc-editor` | frontend/index.html:5114 |
| `doc-empty` | frontend/index.html:4500 |
| `doc-export-docx` | frontend/index.html:4835 |
| `doc-export-html` | frontend/index.html:4822 |
| `doc-export-md` | frontend/index.html:4813 |
| `doc-export-pdf` | frontend/index.html:4837 |
| `doc-export-zip` | frontend/index.html:4831 |
| `doc-extract` | frontend/index.html:4809 |
| `doc-file-type` | frontend/index.html:4778 |
| `doc-file-type-label` | frontend/index.html:4777 |
| `doc-find-bar` | frontend/index.html:5075 |
| `doc-find-close` | frontend/index.html:5083 |
| `doc-find-count` | frontend/index.html:5077 |
| `doc-find-input` | frontend/index.html:5076 |
| `doc-find-next` | frontend/index.html:5079 |
| `doc-find-prev` | frontend/index.html:5078 |
| `doc-find-toggle` | frontend/index.html:5025 |
| `doc-focus-bar` | frontend/index.html:4432 |
| `doc-focus-exit` | frontend/index.html:4454 |
| `doc-focus-facts` | frontend/index.html:4434 |
| `doc-focus-fullscreen` | frontend/index.html:4452 |
| `doc-focus-prose` | frontend/index.html:4450 |
| `doc-focus-prose-count` | frontend/index.html:4451 |
| `doc-focus-saved` | frontend/index.html:4436 |
| `doc-focus-sidebar` | frontend/index.html:4442 |
| `doc-focus-title` | frontend/index.html:4433 |
| `doc-focus-toggle` | frontend/index.html:4768 |
| `doc-focus-tools` | frontend/index.html:4444 |
| `doc-focus-words` | frontend/index.html:4435 |
| `doc-format-show` | frontend/index.html:4731 |
| `doc-format-toggle` | frontend/index.html:4781 |
| `doc-format-toggle-label` | frontend/index.html:4782 |
| `doc-goal-label` | frontend/index.html:5140 |
| `doc-grammar-check` | frontend/index.html:8838 |
| `doc-gutter` | frontend/index.html:5105 |
| `doc-history` | frontend/index.html:4799 |
| `doc-history-dialog` | frontend/index.html:1129 |
| `doc-history-empty` | frontend/index.html:1154 |
| `doc-history-filter` | frontend/index.html:1145 |
| `doc-history-list` | frontend/index.html:1153 |
| `doc-history-name` | frontend/index.html:1133 |
| `doc-list` | frontend/index.html:4499 |
| `doc-map-headings` | frontend/index.html:4811 |
| `doc-margin` | frontend/index.html:5117 |
| `doc-margin-reader` | frontend/index.html:4895 |
| `doc-minimap` | frontend/index.html:4878 |
| `doc-minimap-row` | frontend/index.html:4875 |
| `doc-new` | frontend/index.html:4484 |
| `doc-new-template` | frontend/index.html:4494 |
| `doc-notes` | frontend/index.html:4568 |
| `doc-notes-wrap` | frontend/index.html:4566 |
| `doc-outline` | frontend/index.html:4527 |
| `doc-outline-count` | frontend/index.html:4509 |
| `doc-outline-empty` | frontend/index.html:4515 |
| `doc-outline-filter` | frontend/index.html:4524 |
| `doc-outline-wrap` | frontend/index.html:4508 |
| `doc-panes` | frontend/index.html:5094 |
| `doc-phone-bar` | frontend/index.html:5052 |
| `doc-phone-insert` | frontend/index.html:5066 |
| `doc-preview` | frontend/index.html:5119 |
| `doc-prose` | frontend/index.html:5143 |
| `doc-prose-count` | frontend/index.html:5145 |
| `doc-prose-panel` | frontend/index.html:5171 |
| `doc-read-aloud` | frontend/index.html:4938 |
| `doc-read-stop` | frontend/index.html:5151 |
| `doc-replace-all` | frontend/index.html:5082 |
| `doc-replace-case` | frontend/index.html:1190 |
| `doc-replace-dialog` | frontend/index.html:1176 |
| `doc-replace-find` | frontend/index.html:1185 |
| `doc-replace-input` | frontend/index.html:5080 |
| `doc-replace-list` | frontend/index.html:1193 |
| `doc-replace-one` | frontend/index.html:5081 |
| `doc-replace-regex` | frontend/index.html:1189 |
| `doc-replace-run` | frontend/index.html:1196 |
| `doc-replace-summary` | frontend/index.html:1192 |
| `doc-replace-title` | frontend/index.html:1178 |
| `doc-replace-with` | frontend/index.html:1187 |
| `doc-saved` | frontend/index.html:4653 |
| `doc-serif` | frontend/index.html:4898 |
| `doc-sidebar` | frontend/index.html:4466 |
| `doc-sidebar-list` | frontend/index.html:4480 |
| `doc-sidebar-outline` | frontend/index.html:4505 |
| `doc-sidebar-tabs` | frontend/index.html:4472 |
| `doc-smart-punctuation` | frontend/index.html:8845 |
| `doc-source-wrap` | frontend/index.html:5100 |
| `doc-spelling-variant` | frontend/index.html:8831 |
| `doc-status` | frontend/index.html:5121 |
| `doc-statusbar` | frontend/index.html:5132 |
| `doc-storage-dialog` | frontend/index.html:944 |
| `doc-storage-path` | frontend/index.html:956 |
| `doc-storage-toggle` | frontend/index.html:4585 |
| `doc-suggest-accept-all` | frontend/index.html:4934 |
| `doc-suggest-menu` | frontend/index.html:5183 |
| `doc-suggest-mode` | frontend/index.html:4930 |
| `doc-suggest-next` | frontend/index.html:4932 |
| `doc-suggest-reject-all` | frontend/index.html:4936 |
| `doc-suggest-row` | frontend/index.html:4927 |
| `doc-suggest-status` | frontend/index.html:5148 |
| `doc-template-dialog` | frontend/index.html:972 |
| `doc-template-list` | frontend/index.html:989 |
| `doc-template-preview` | frontend/index.html:990 |
| `doc-template-use` | frontend/index.html:994 |
| `doc-title` | frontend/index.html:4625 |
| `doc-toolbar` | frontend/index.html:4948 |
| `doc-toolbar-colour` | frontend/index.html:4990 |
| `doc-toolbar-insert` | frontend/index.html:5013 |
| `doc-toolbar-mode` | frontend/index.html:4858 |
| `doc-toolbar-mode-label` | frontend/index.html:4860 |
| `doc-typewriter` | frontend/index.html:4891 |
| `doc-view-menu` | frontend/index.html:4690 |
| `doc-view-seg` | frontend/index.html:4678 |
| `doc-whitespace` | frontend/index.html:4873 |
| `doc-whitespace-row` | frontend/index.html:4870 |
| `doc-width-menu` | frontend/index.html:4855 |
| `doc-width-menu-label` | frontend/index.html:4857 |
| `doc-width-toggle` | frontend/index.html:5031 |
| `doc-word-goal` | frontend/index.html:5139 |
| `doc-word-goal-dialog` | frontend/index.html:1200 |
| `doc-word-goal-input` | frontend/index.html:1212 |
| `doc-word-goal-submit` | frontend/index.html:1215 |
| `draft-add-source` | frontend/index.html:1901 |
| `draft-cancel` | frontend/index.html:1749 |
| `draft-compose` | frontend/index.html:1792 |
| `draft-continue-note` | frontend/index.html:1779 |
| `draft-copy` | frontend/index.html:1964 |
| `draft-count` | frontend/index.html:1918 |
| `draft-discard` | frontend/index.html:1788 |
| `draft-extract` | frontend/index.html:1772 |
| `draft-feature-model` | frontend/index.html:1746 |
| `draft-help` | frontend/index.html:1756 |
| `draft-help-body` | frontend/index.html:1795 |
| `draft-insert` | frontend/index.html:1966 |
| `draft-instruction` | frontend/index.html:1943 |
| `draft-kind` | frontend/index.html:1855 |
| `draft-length` | frontend/index.html:1895 |
| `draft-model` | frontend/index.html:1786 |
| `draft-more-menu` | frontend/index.html:1761 |
| `draft-offline` | frontend/index.html:1812 |
| `draft-quickstarts` | frontend/index.html:1819 |
| `draft-refine` | frontend/index.html:1946 |
| `draft-save` | frontend/index.html:1968 |
| `draft-sources` | frontend/index.html:1907 |
| `draft-sources-count` | frontend/index.html:1843 |
| `draft-status` | frontend/index.html:1909 |
| `draft-tags` | frontend/index.html:1957 |
| `draft-target` | frontend/index.html:1917 |
| `draft-text` | frontend/index.html:1930 |
| `draft-thinking` | frontend/index.html:1923 |
| `draft-thoughts` | frontend/index.html:1847 |
| `draft-thoughts-count` | frontend/index.html:1844 |
| `draft-title` | frontend/index.html:1769 |
| `draft-tone` | frontend/index.html:1887 |
| `draft-undo` | frontend/index.html:1751 |
| `draft-versions` | frontend/index.html:1936 |
| `duplicate-groups` | frontend/index.html:12131 |
| `duplicate-status` | frontend/index.html:12129 |
| `duplicate-threshold` | frontend/index.html:12125 |
| `duplicate-threshold-value` | frontend/index.html:12127 |
| `duplicates-help` | frontend/index.html:12114 |
| `editor-menu` | frontend/index.html:14021 |
| `editor-menu-list` | frontend/index.html:14022 |
| `editor-menu-preview` | frontend/index.html:14024 |
| `embed-choices` | frontend/index.html:9573 |
| `embed-choices-status` | frontend/index.html:9574 |
| `embed-found` | frontend/index.html:9579 |
| `embed-found-empty` | frontend/index.html:9580 |
| `embed-models-cache` | frontend/index.html:11230 |
| `embed-models-list` | frontend/index.html:11229 |
| `embed-models-status` | frontend/index.html:11231 |
| `embed-pull-go` | frontend/index.html:9589 |
| `embed-pull-name` | frontend/index.html:9586 |
| `embed-pull-status` | frontend/index.html:9591 |
| `embedding-apply` | frontend/index.html:9558 |
| `embedding-error` | frontend/index.html:9446 |
| `embedding-error-fix` | frontend/index.html:9455 |
| `embedding-error-fix-row` | frontend/index.html:9454 |
| `embedding-error-fix-status` | frontend/index.html:9458 |
| `embedding-model-select` | frontend/index.html:9557 |
| `embedding-models-help` | frontend/index.html:11220 |
| `embedding-offline-note` | frontend/index.html:9564 |
| `embedding-ollama-note` | frontend/index.html:9560 |
| `empty-message` | frontend/index.html:2468 |
| `entries-heading` | frontend/index.html:2311 |
| `entries-heading-label` | frontend/index.html:2311 |
| `entry-attach-existing` | frontend/index.html:1646 |
| `entry-attach-file` | frontend/index.html:1636 |
| `entry-attach-file-input` | frontend/index.html:1638 |
| `entry-attachment-chips` | frontend/index.html:1602 |
| `entry-category` | frontend/index.html:1672 |
| `entry-content` | frontend/index.html:1590 |
| `entry-count` | frontend/index.html:1596 |
| `entry-document-adder` | frontend/index.html:1684 |
| `entry-document-chips` | frontend/index.html:1685 |
| `entry-list` | frontend/index.html:2462 |
| `entry-preview-toggle` | frontend/index.html:1584 |
| `entry-tag-suggestions` | frontend/index.html:1620 |
| `entry-tags` | frontend/index.html:1610 |
| `entry-template` | frontend/index.html:1471 |
| `entry-title` | frontend/index.html:1537 |
| `export-backup-password` | frontend/index.html:12058 |
| `export-backup-zip` | frontend/index.html:12054 |
| `export-csv` | frontend/index.html:12051 |
| `export-folder` | frontend/index.html:12053 |
| `export-help` | frontend/index.html:12035 |
| `export-json` | frontend/index.html:12050 |
| `export-md` | frontend/index.html:12052 |
| `export-save-dir-row` | frontend/index.html:12080 |
| `export-save-dir-status` | frontend/index.html:12085 |
| `exports-empty` | frontend/index.html:12100 |
| `exports-list` | frontend/index.html:12101 |
| `exports-recent` | frontend/index.html:12093 |
| `exports-refresh` | frontend/index.html:12095 |
| `extract-cancel` | frontend/index.html:8869 |
| `extract-close` | frontend/index.html:8859 |
| `extract-commit` | frontend/index.html:8870 |
| `extract-links-list` | frontend/index.html:8865 |
| `extract-notes-list` | frontend/index.html:8864 |
| `extract-panel` | frontend/index.html:8853 |
| `extract-status` | frontend/index.html:8863 |
| `extras-bulk-done` | frontend/index.html:11174 |
| `extras-bulk-install` | frontend/index.html:11171 |
| `extras-bulk-reinstall` | frontend/index.html:11172 |
| `extras-bulk-remove` | frontend/index.html:11173 |
| `extras-bundles` | frontend/index.html:11166 |
| `extras-list` | frontend/index.html:11177 |
| `extras-log` | frontend/index.html:11181 |
| `extras-log-wrap` | frontend/index.html:11179 |
| `extras-selectbar` | frontend/index.html:11168 |
| `extras-selected-count` | frontend/index.html:11169 |
| `extras-status` | frontend/index.html:11178 |
| `face-look` | frontend/index.html:10944 |
| `face-look-row` | frontend/index.html:10939 |
| `feature-models-help` | frontend/index.html:9276 |
| `feature-models-list` | frontend/index.html:9270 |
| `feature-models-reset` | frontend/index.html:9272 |
| `feature-models-reset-note` | frontend/index.html:9275 |
| `features-card` | frontend/index.html:13906 |
| `features-close` | frontend/index.html:13910 |
| `features-count` | frontend/index.html:13922 |
| `features-list` | frontend/index.html:13923 |
| `features-overlay` | frontend/index.html:13904 |
| `features-search` | frontend/index.html:13919 |
| `find-duplicates` | frontend/index.html:12123 |
| `finder-close` | frontend/index.html:744 |
| `finder-filters` | frontend/index.html:791 |
| `finder-help` | frontend/index.html:748 |
| `finder-input` | frontend/index.html:780 |
| `finder-overlay` | frontend/index.html:728 |
| `finder-results` | frontend/index.html:806 |
| `finder-save` | frontend/index.html:742 |
| `finder-sort` | frontend/index.html:795 |
| `finder-summary` | frontend/index.html:805 |
| `font-seg` | frontend/index.html:10522 |
| `fontsize-seg` | frontend/index.html:10504 |
| `forgot-password-help` | frontend/index.html:12684 |
| `glass-blur` | frontend/index.html:10692 |
| `glass-blur-row` | frontend/index.html:10686 |
| `glass-blur-value` | frontend/index.html:10694 |
| `glass-opacity` | frontend/index.html:10704 |
| `glass-opacity-row` | frontend/index.html:10698 |
| `glass-opacity-value` | frontend/index.html:10706 |
| `glass-row` | frontend/index.html:10651 |
| `glass-sheen-row` | frontend/index.html:10667 |
| `glass-sheen-strength` | frontend/index.html:10680 |
| `glass-sheen-strength-row` | frontend/index.html:10675 |
| `glass-sheen-strength-value` | frontend/index.html:10682 |
| `glass-sheen-toggle` | frontend/index.html:10668 |
| `glass-toggle` | frontend/index.html:10652 |
| `global-find-bar` | frontend/index.html:13366 |
| `global-find-close` | frontend/index.html:13371 |
| `global-find-count` | frontend/index.html:13368 |
| `global-find-input` | frontend/index.html:13367 |
| `global-find-next` | frontend/index.html:13370 |
| `global-find-prev` | frontend/index.html:13369 |
| `graph-add-node` | frontend/index.html:3766 |
| `graph-arrows` | frontend/index.html:4127 |
| `graph-attachments` | frontend/index.html:4080 |
| `graph-box` | frontend/index.html:4284 |
| `graph-canvas` | frontend/index.html:4309 |
| `graph-card` | frontend/index.html:3642 |
| `graph-colour` | frontend/index.html:3885 |
| `graph-colour-label` | frontend/index.html:3884 |
| `graph-concept-maps` | frontend/index.html:3696 |
| `graph-curved` | frontend/index.html:4115 |
| `graph-display` | frontend/index.html:4106 |
| `graph-display-label` | frontend/index.html:4107 |
| `graph-documents` | frontend/index.html:4063 |
| `graph-empty` | frontend/index.html:4384 |
| `graph-empty-emblem` | frontend/index.html:4390 |
| `graph-empty-filtered` | frontend/index.html:4404 |
| `graph-empty-filtered-why` | frontend/index.html:4406 |
| `graph-empty-fresh` | frontend/index.html:4396 |
| `graph-empty-show-all` | frontend/index.html:4407 |
| `graph-entities` | frontend/index.html:4059 |
| `graph-export-png` | frontend/index.html:3763 |
| `graph-filter-label` | frontend/index.html:4145 |
| `graph-filter-section` | frontend/index.html:4144 |
| `graph-focus-clear` | frontend/index.html:3707 |
| `graph-focus-depth` | frontend/index.html:3932 |
| `graph-focus-in` | frontend/index.html:3938 |
| `graph-focus-label` | frontend/index.html:3929 |
| `graph-focus-neighbours` | frontend/index.html:3946 |
| `graph-focus-out` | frontend/index.html:3942 |
| `graph-focus-section` | frontend/index.html:3927 |
| `graph-fullscreen` | frontend/index.html:4382 |
| `graph-gravity` | frontend/index.html:3962 |
| `graph-group` | frontend/index.html:3984 |
| `graph-group-add` | frontend/index.html:4195 |
| `graph-group-query` | frontend/index.html:4193 |
| `graph-groups` | frontend/index.html:4198 |
| `graph-groups-label` | frontend/index.html:4184 |
| `graph-groups-section` | frontend/index.html:4183 |
| `graph-help-panel` | frontend/index.html:3789 |
| `graph-help-toggle` | frontend/index.html:3716 |
| `graph-hide-orphans` | frontend/index.html:4088 |
| `graph-highlight-clear` | frontend/index.html:3706 |
| `graph-label-fade` | frontend/index.html:4132 |
| `graph-label-plates` | frontend/index.html:4123 |
| `graph-labels` | frontend/index.html:4111 |
| `graph-layout` | frontend/index.html:3855 |
| `graph-layout-label` | frontend/index.html:3851 |
| `graph-legend` | frontend/index.html:4282 |
| `graph-legend-toggle` | frontend/index.html:3915 |
| `graph-length-score` | frontend/index.html:3978 |
| `graph-link-force` | frontend/index.html:3972 |
| `graph-link-kinds` | frontend/index.html:4147 |
| `graph-link-width` | frontend/index.html:4137 |
| `graph-maps` | frontend/index.html:4072 |
| `graph-minimap` | frontend/index.html:4287 |
| `graph-minimap-corner` | frontend/index.html:4205 |
| `graph-minimap-dots` | frontend/index.html:4298 |
| `graph-minimap-edges` | frontend/index.html:4297 |
| `graph-minimap-frame` | frontend/index.html:4300 |
| `graph-minimap-here` | frontend/index.html:4299 |
| `graph-minimap-label` | frontend/index.html:4202 |
| `graph-minimap-section` | frontend/index.html:4201 |
| `graph-minimap-size` | frontend/index.html:4216 |
| `graph-minimap-svg` | frontend/index.html:4295 |
| `graph-more-menu` | frontend/index.html:3741 |
| `graph-nebula` | frontend/index.html:4119 |
| `graph-new` | frontend/index.html:4360 |
| `graph-new-close` | frontend/index.html:4364 |
| `graph-new-content` | frontend/index.html:4369 |
| `graph-new-hint` | frontend/index.html:4366 |
| `graph-new-note-title` | frontend/index.html:4367 |
| `graph-new-save` | frontend/index.html:4374 |
| `graph-new-status` | frontend/index.html:4375 |
| `graph-new-tags` | frontend/index.html:4371 |
| `graph-new-title` | frontend/index.html:4363 |
| `graph-options` | frontend/index.html:3835 |
| `graph-options-reset` | frontend/index.html:4238 |
| `graph-options-toggle` | frontend/index.html:3736 |
| `graph-pane` | frontend/index.html:1382 |
| `graph-pane-body` | frontend/index.html:1398 |
| `graph-pane-box` | frontend/index.html:1399 |
| `graph-pane-canvas` | frontend/index.html:1400 |
| `graph-pane-count` | frontend/index.html:1385 |
| `graph-pane-depth` | frontend/index.html:1409 |
| `graph-pane-empty` | frontend/index.html:1402 |
| `graph-pane-focus` | frontend/index.html:1387 |
| `graph-pane-in` | frontend/index.html:1415 |
| `graph-pane-neighbours` | frontend/index.html:1423 |
| `graph-pane-options` | frontend/index.html:1405 |
| `graph-pane-out` | frontend/index.html:1419 |
| `graph-pane-toggle` | frontend/index.html:1391 |
| `graph-physics` | frontend/index.html:3951 |
| `graph-physics-label` | frontend/index.html:3959 |
| `graph-popup` | frontend/index.html:4312 |
| `graph-popup-actions` | frontend/index.html:4355 |
| `graph-popup-category` | frontend/index.html:4323 |
| `graph-popup-close` | frontend/index.html:4325 |
| `graph-popup-confidence` | frontend/index.html:4322 |
| `graph-popup-content` | frontend/index.html:4342 |
| `graph-popup-info` | frontend/index.html:4329 |
| `graph-popup-media` | frontend/index.html:4341 |
| `graph-popup-props` | frontend/index.html:4336 |
| `graph-popup-save` | frontend/index.html:4351 |
| `graph-popup-saverow` | frontend/index.html:4350 |
| `graph-popup-status` | frontend/index.html:4352 |
| `graph-popup-tags` | frontend/index.html:4343 |
| `graph-popup-title` | frontend/index.html:4321 |
| `graph-popup-topic` | frontend/index.html:4332 |
| `graph-prop-chips` | frontend/index.html:4149 |
| `graph-refresh` | frontend/index.html:3715 |
| `graph-reshuffle` | frontend/index.html:3993 |
| `graph-search` | frontend/index.html:3703 |
| `graph-selection-clear` | frontend/index.html:3787 |
| `graph-selection-count` | frontend/index.html:3782 |
| `graph-selection-dock` | frontend/index.html:3781 |
| `graph-selection-link` | frontend/index.html:3784 |
| `graph-selection-map` | frontend/index.html:3786 |
| `graph-selection-tag` | frontend/index.html:3783 |
| `graph-selection-unlink` | frontend/index.html:3785 |
| `graph-shape` | frontend/index.html:3872 |
| `graph-shape-label` | frontend/index.html:3871 |
| `graph-shape-row` | frontend/index.html:3870 |
| `graph-show-help` | frontend/index.html:4017 |
| `graph-show-label` | frontend/index.html:4001 |
| `graph-similarity` | frontend/index.html:4055 |
| `graph-similarity-min` | frontend/index.html:4098 |
| `graph-similarity-min-row` | frontend/index.html:4096 |
| `graph-size` | frontend/index.html:3904 |
| `graph-size-label` | frontend/index.html:3903 |
| `graph-spread` | frontend/index.html:3967 |
| `graph-stats` | frontend/index.html:3688 |
| `graph-svg` | frontend/index.html:4310 |
| `graph-tags` | frontend/index.html:4076 |
| `graph-temporal` | frontend/index.html:4151 |
| `graph-time-heading` | frontend/index.html:4153 |
| `graph-time-label` | frontend/index.html:4164 |
| `graph-time-play` | frontend/index.html:4156 |
| `graph-time-slider` | frontend/index.html:4158 |
| `graph-toggle-group` | frontend/index.html:3998 |
| `graph-topic` | frontend/index.html:4267 |
| `graph-trace` | frontend/index.html:4249 |
| `graph-trace-clear` | frontend/index.html:4261 |
| `graph-trace-ends` | frontend/index.html:4257 |
| `graph-trace-result` | frontend/index.html:4264 |
| `graph-trace-toggle` | frontend/index.html:3913 |
| `graph-unpin-all` | frontend/index.html:3987 |
| `graph-unresolved` | frontend/index.html:4084 |
| `graph-view-delete` | frontend/index.html:3761 |
| `graph-view-label` | frontend/index.html:3849 |
| `graph-view-picker` | frontend/index.html:3757 |
| `graph-view-save` | frontend/index.html:3759 |
| `graph-view-section` | frontend/index.html:3847 |
| `graph-zoom` | frontend/index.html:4378 |
| `graph-zoom-fit` | frontend/index.html:4381 |
| `graph-zoom-in` | frontend/index.html:4379 |
| `graph-zoom-out` | frontend/index.html:4380 |
| `harmony-apply` | frontend/index.html:10492 |
| `harmony-base` | frontend/index.html:10484 |
| `harmony-kind` | frontend/index.html:10486 |
| `harmony-note` | frontend/index.html:10494 |
| `health-checked` | frontend/index.html:13057 |
| `health-counts` | frontend/index.html:13101 |
| `health-data-dir` | frontend/index.html:13070 |
| `health-db-size` | frontend/index.html:13087 |
| `health-files-size` | frontend/index.html:13094 |
| `health-group` | frontend/index.html:13055 |
| `health-integrity` | frontend/index.html:13079 |
| `health-integrity-check` | frontend/index.html:13078 |
| `health-jobs` | frontend/index.html:13108 |
| `health-last-backup` | frontend/index.html:13063 |
| `health-last-error` | frontend/index.html:13136 |
| `health-latency` | frontend/index.html:13129 |
| `health-search` | frontend/index.html:13122 |
| `help-chat-empty` | frontend/index.html:529 |
| `help-chat-form` | frontend/index.html:544 |
| `help-chat-group` | frontend/index.html:495 |
| `help-chat-help` | frontend/index.html:554 |
| `help-chat-input` | frontend/index.html:545 |
| `help-chat-menu` | frontend/index.html:552 |
| `help-chat-messages` | frontend/index.html:503 |
| `help-chat-send` | frontend/index.html:546 |
| `help-chat-starters` | frontend/index.html:535 |
| `help-empty` | frontend/index.html:12953 |
| `help-search` | frontend/index.html:12917 |
| `help-search-status` | frontend/index.html:12920 |
| `help-topics` | frontend/index.html:12952 |
| `history-card` | frontend/index.html:13403 |
| `history-close` | frontend/index.html:13407 |
| `history-list` | frontend/index.html:13412 |
| `history-overlay` | frontend/index.html:13401 |
| `history-status` | frontend/index.html:13411 |
| `hud` | frontend/index.html:13381 |
| `import-app-box` | frontend/index.html:12224 |
| `import-app-help` | frontend/index.html:12234 |
| `import-app-status` | frontend/index.html:12273 |
| `import-apple` | frontend/index.html:12268 |
| `import-apple-file` | frontend/index.html:12266 |
| `import-dir` | frontend/index.html:12189 |
| `import-dir-path` | frontend/index.html:12188 |
| `import-dir-status` | frontend/index.html:12191 |
| `import-document` | frontend/index.html:12207 |
| `import-document-file` | frontend/index.html:12206 |
| `import-document-help` | frontend/index.html:12211 |
| `import-document-status` | frontend/index.html:12209 |
| `import-evernote` | frontend/index.html:12265 |
| `import-evernote-file` | frontend/index.html:12263 |
| `import-md` | frontend/index.html:12177 |
| `import-md-files` | frontend/index.html:12176 |
| `import-md-folder` | frontend/index.html:12178 |
| `import-md-folder-btn` | frontend/index.html:12181 |
| `import-md-status` | frontend/index.html:12184 |
| `import-memorymap` | frontend/index.html:12271 |
| `import-memorymap-file` | frontend/index.html:12269 |
| `import-notion` | frontend/index.html:12259 |
| `import-notion-file` | frontend/index.html:12257 |
| `import-obsidian` | frontend/index.html:12262 |
| `import-obsidian-file` | frontend/index.html:12260 |
| `improve-apply` | frontend/index.html:13639 |
| `improve-btn` | frontend/index.html:1662 |
| `improve-card` | frontend/index.html:13605 |
| `improve-close` | frontend/index.html:13609 |
| `improve-custom-go` | frontend/index.html:13622 |
| `improve-custom-input` | frontend/index.html:13620 |
| `improve-custom-row` | frontend/index.html:13619 |
| `improve-modes` | frontend/index.html:13613 |
| `improve-original` | frontend/index.html:13627 |
| `improve-overlay` | frontend/index.html:13604 |
| `improve-result` | frontend/index.html:13631 |
| `improve-retry` | frontend/index.html:13638 |
| `improve-status` | frontend/index.html:13634 |
| `installed-box` | frontend/index.html:9342 |
| `installed-list` | frontend/index.html:9345 |
| `integrity-notice` | frontend/index.html:12330 |
| `job-runs-group` | frontend/index.html:11762 |
| `job-runs-help` | frontend/index.html:11772 |
| `job-runs-list` | frontend/index.html:11786 |
| `lan-help` | frontend/index.html:12461 |
| `lan-trust-help` | frontend/index.html:12518 |
| `learned-bulk-delete` | frontend/index.html:10134 |
| `learned-bulk-done` | frontend/index.html:10135 |
| `learned-bulk-reset` | frontend/index.html:10133 |
| `learned-count` | frontend/index.html:10144 |
| `learned-empty` | frontend/index.html:10139 |
| `learned-export` | frontend/index.html:10153 |
| `learned-forget` | frontend/index.html:10154 |
| `learned-from-you` | frontend/index.html:10073 |
| `learned-help` | frontend/index.html:10074 |
| `learned-kind` | frontend/index.html:10120 |
| `learned-list` | frontend/index.html:10138 |
| `learned-next` | frontend/index.html:10145 |
| `learned-pager` | frontend/index.html:10142 |
| `learned-paused-banner` | frontend/index.html:10101 |
| `learned-prev` | frontend/index.html:10143 |
| `learned-run-note` | frontend/index.html:10110 |
| `learned-run-now` | frontend/index.html:10109 |
| `learned-search` | frontend/index.html:10123 |
| `learned-selectbar` | frontend/index.html:10130 |
| `learned-selected-count` | frontend/index.html:10131 |
| `learned-status` | frontend/index.html:10126 |
| `learned-switches` | frontend/index.html:10102 |
| `learned-switches-group` | frontend/index.html:10098 |
| `library-activity-export` | frontend/index.html:5687 |
| `library-activitybar` | frontend/index.html:5684 |
| `library-bin-empty` | frontend/index.html:5680 |
| `library-bin-note` | frontend/index.html:5678 |
| `library-binbar` | frontend/index.html:5677 |
| `library-boards-empty` | frontend/index.html:6147 |
| `library-boards-filter` | frontend/index.html:6144 |
| `library-boards-grid` | frontend/index.html:6146 |
| `library-boards-more` | frontend/index.html:6101 |
| `library-boards-new-map` | frontend/index.html:6156 |
| `library-boards-no-match` | frontend/index.html:6159 |
| `library-boards-refresh` | frontend/index.html:6075 |
| `library-boards-search` | frontend/index.html:6030 |
| `library-boards-sort` | frontend/index.html:6039 |
| `library-boards-view` | frontend/index.html:6052 |
| `library-bulk-delete` | frontend/index.html:5699 |
| `library-bulk-open` | frontend/index.html:5697 |
| `library-bulk-restore` | frontend/index.html:5698 |
| `library-clear-selection` | frontend/index.html:5700 |
| `library-docs-bulk-delete` | frontend/index.html:5847 |
| `library-docs-clear-selection` | frontend/index.html:5848 |
| `library-docs-empty` | frontend/index.html:5857 |
| `library-docs-help` | frontend/index.html:5792 |
| `library-docs-help-toggle` | frontend/index.html:5789 |
| `library-docs-import` | frontend/index.html:5806 |
| `library-docs-import-input` | frontend/index.html:5808 |
| `library-docs-list` | frontend/index.html:5851 |
| `library-docs-more-menu` | frontend/index.html:5795 |
| `library-docs-new` | frontend/index.html:5827 |
| `library-docs-no-match` | frontend/index.html:5863 |
| `library-docs-page-next` | frontend/index.html:5855 |
| `library-docs-page-prev` | frontend/index.html:5853 |
| `library-docs-page-size` | frontend/index.html:5818 |
| `library-docs-page-status` | frontend/index.html:5854 |
| `library-docs-pagination` | frontend/index.html:5852 |
| `library-docs-property` | frontend/index.html:5770 |
| `library-docs-refresh` | frontend/index.html:5787 |
| `library-docs-search` | frontend/index.html:5756 |
| `library-docs-selectbar` | frontend/index.html:5842 |
| `library-docs-selected-count` | frontend/index.html:5844 |
| `library-docs-sort` | frontend/index.html:5778 |
| `library-empty` | frontend/index.html:5710 |
| `library-empty-clear` | frontend/index.html:5719 |
| `library-empty-create` | frontend/index.html:5723 |
| `library-empty-text` | frontend/index.html:5715 |
| `library-empty-title` | frontend/index.html:5712 |
| `library-filter-menu` | frontend/index.html:5614 |
| `library-filters` | frontend/index.html:5671 |
| `library-grid` | frontend/index.html:5703 |
| `library-help` | frontend/index.html:5648 |
| `library-help-toggle` | frontend/index.html:5645 |
| `library-images-empty` | frontend/index.html:7858 |
| `library-images-grid` | frontend/index.html:7857 |
| `library-images-help` | frontend/index.html:7822 |
| `library-images-intro` | frontend/index.html:7840 |
| `library-images-no-match` | frontend/index.html:7864 |
| `library-images-refresh` | frontend/index.html:7821 |
| `library-images-search` | frontend/index.html:7756 |
| `library-images-upload` | frontend/index.html:7837 |
| `library-images-upload-input` | frontend/index.html:7820 |
| `library-media-bulk-delete` | frontend/index.html:7853 |
| `library-media-clear-selection` | frontend/index.html:7854 |
| `library-media-empty-body` | frontend/index.html:7861 |
| `library-media-empty-icon` | frontend/index.html:7859 |
| `library-media-empty-title` | frontend/index.html:7860 |
| `library-media-more-menu` | frontend/index.html:7833 |
| `library-media-origin-btn` | frontend/index.html:7790 |
| `library-media-origin-label` | frontend/index.html:7791 |
| `library-media-origin-menu` | frontend/index.html:7789 |
| `library-media-origins` | frontend/index.html:7792 |
| `library-media-read` | frontend/index.html:7774 |
| `library-media-selectbar` | frontend/index.html:7848 |
| `library-media-selected-count` | frontend/index.html:7850 |
| `library-media-sort` | frontend/index.html:7799 |
| `library-media-title` | frontend/index.html:7747 |
| `library-media-view-preview` | frontend/index.html:7813 |
| `library-media-view-type` | frontend/index.html:7815 |
| `library-more-menu` | frontend/index.html:5651 |
| `library-new-doc` | frontend/index.html:5665 |
| `library-overview` | frontend/index.html:5669 |
| `library-page-next` | frontend/index.html:5708 |
| `library-page-prev` | frontend/index.html:5706 |
| `library-page-size` | frontend/index.html:5656 |
| `library-page-status` | frontend/index.html:5707 |
| `library-pagination` | frontend/index.html:5705 |
| `library-refresh` | frontend/index.html:5643 |
| `library-search` | frontend/index.html:5610 |
| `library-selectbar` | frontend/index.html:5692 |
| `library-selected-count` | frontend/index.html:5694 |
| `library-semantic-toggle` | frontend/index.html:5619 |
| `library-show-binned` | frontend/index.html:5623 |
| `library-skills-section` | frontend/index.html:5870 |
| `library-sort` | frontend/index.html:5630 |
| `library-subtab-docs` | frontend/index.html:5568 |
| `library-subtabs` | frontend/index.html:5555 |
| `library-truncated` | frontend/index.html:5704 |
| `library-view` | frontend/index.html:5636 |
| `library-view-contents` | frontend/index.html:8029 |
| `library-view-docs` | frontend/index.html:5733 |
| `library-view-documents` | frontend/index.html:5587 |
| `library-view-links` | frontend/index.html:7872 |
| `library-view-media` | frontend/index.html:7727 |
| `library-view-recordings` | frontend/index.html:7999 |
| `library-view-skills` | frontend/index.html:5867 |
| `library-view-whiteboard` | frontend/index.html:5988 |
| `link-suggest-btn` | frontend/index.html:4236 |
| `live-region` | frontend/index.html:13384 |
| `llm-base-url` | frontend/index.html:9070 |
| `llm-privacy-warning` | frontend/index.html:9095 |
| `llm-provider-apply` | frontend/index.html:9071 |
| `llm-provider-note` | frontend/index.html:9075 |
| `llm-provider-select` | frontend/index.html:9066 |
| `llm-provider-status` | frontend/index.html:9091 |
| `local-only-ai` | frontend/index.html:9079 |
| `local-only-wrap` | frontend/index.html:9078 |
| `lock-btn` | frontend/index.html:293 |
| `lock-cancel` | frontend/index.html:329 |
| `lock-card` | frontend/index.html:302 |
| `lock-emblem` | frontend/index.html:303 |
| `lock-error` | frontend/index.html:338 |
| `lock-forgot` | frontend/index.html:337 |
| `lock-forgot-card` | frontend/index.html:348 |
| `lock-forgot-close` | frontend/index.html:357 |
| `lock-forgot-error` | frontend/index.html:419 |
| `lock-forgot-have` | frontend/index.html:385 |
| `lock-forgot-help` | frontend/index.html:361 |
| `lock-forgot-key-pane` | frontend/index.html:388 |
| `lock-forgot-lost` | frontend/index.html:386 |
| `lock-forgot-paths` | frontend/index.html:383 |
| `lock-forgot-remote` | frontend/index.html:379 |
| `lock-forgot-reset-pane` | frontend/index.html:401 |
| `lock-forgot-title` | frontend/index.html:350 |
| `lock-message` | frontend/index.html:305 |
| `lock-overlay` | frontend/index.html:301 |
| `lock-password` | frontend/index.html:307 |
| `lock-password-show` | frontend/index.html:309 |
| `lock-recovery-confirm` | frontend/index.html:397 |
| `lock-recovery-key` | frontend/index.html:391 |
| `lock-recovery-new` | frontend/index.html:394 |
| `lock-recovery-submit` | frontend/index.html:399 |
| `lock-reset-command` | frontend/index.html:409 |
| `lock-reset-confirm` | frontend/index.html:414 |
| `lock-reset-copy` | frontend/index.html:410 |
| `lock-reset-submit` | frontend/index.html:416 |
| `lock-setup-note` | frontend/index.html:324 |
| `lock-submit` | frontend/index.html:325 |
| `lock-title` | frontend/index.html:304 |
| `log-filter` | frontend/index.html:12806 |
| `log-follow` | frontend/index.html:12869 |
| `log-follow-label` | frontend/index.html:12867 |
| `log-level` | frontend/index.html:12857 |
| `log-list` | frontend/index.html:12901 |
| `log-live` | frontend/index.html:12801 |
| `log-requests` | frontend/index.html:12865 |
| `log-source` | frontend/index.html:12849 |
| `log-terminal` | frontend/index.html:12902 |
| `log-terminal-hint` | frontend/index.html:12896 |
| `log-view-toggle` | frontend/index.html:12811 |
| `logs-bundle` | frontend/index.html:12882 |
| `logs-clear` | frontend/index.html:12879 |
| `logs-copy` | frontend/index.html:12878 |
| `logs-dropped` | frontend/index.html:12900 |
| `logs-email-bundle` | frontend/index.html:12876 |
| `logs-empty` | frontend/index.html:12904 |
| `logs-filtered-out` | frontend/index.html:12905 |
| `logs-help` | frontend/index.html:12822 |
| `logs-help-toggle` | frontend/index.html:12819 |
| `logs-more-menu` | frontend/index.html:12825 |
| `manage-categories-btn` | frontend/index.html:1357 |
| `manage-categories-foot` | frontend/index.html:1363 |
| `mcp-config-copy` | frontend/index.html:10336 |
| `mcp-config-group` | frontend/index.html:10310 |
| `mcp-config-help` | frontend/index.html:10321 |
| `mcp-config-note` | frontend/index.html:10334 |
| `mcp-config-snippet` | frontend/index.html:10333 |
| `meeting-card` | frontend/index.html:13787 |
| `meeting-close` | frontend/index.html:13805 |
| `meeting-controls` | frontend/index.html:13837 |
| `meeting-copy` | frontend/index.html:13896 |
| `meeting-discard` | frontend/index.html:13897 |
| `meeting-help` | frontend/index.html:13810 |
| `meeting-marker` | frontend/index.html:13841 |
| `meeting-overlay` | frontend/index.html:13785 |
| `meeting-pause` | frontend/index.html:13839 |
| `meeting-progress` | frontend/index.html:13864 |
| `meeting-record` | frontend/index.html:13838 |
| `meeting-save` | frontend/index.html:13885 |
| `meeting-save-doc` | frontend/index.html:13891 |
| `meeting-save-row` | frontend/index.html:13881 |
| `meeting-stage` | frontend/index.html:13836 |
| `meeting-status` | frontend/index.html:13866 |
| `meeting-timer` | frontend/index.html:13842 |
| `meeting-title` | frontend/index.html:13826 |
| `meeting-transcript` | frontend/index.html:13871 |
| `meeting-wave` | frontend/index.html:13859 |
| `memory-add` | frontend/index.html:10038 |
| `memory-budget` | frontend/index.html:10032 |
| `memory-empty` | frontend/index.html:10042 |
| `memory-help` | frontend/index.html:10016 |
| `memory-list` | frontend/index.html:10041 |
| `memory-new` | frontend/index.html:10036 |
| `memory-status` | frontend/index.html:10040 |
| `mic-chat` | frontend/index.html:3024 |
| `mic-note` | frontend/index.html:1658 |
| `model-context-help` | frontend/index.html:9140 |
| `model-context-note` | frontend/index.html:9139 |
| `model-context-row` | frontend/index.html:9127 |
| `model-context-window` | frontend/index.html:9129 |
| `model-spec` | frontend/index.html:9113 |
| `model-spec-health` | frontend/index.html:9114 |
| `models-config` | frontend/index.html:9098 |
| `models-skeleton` | frontend/index.html:9021 |
| `most-used` | frontend/index.html:1366 |
| `most-used-box` | frontend/index.html:1364 |
| `motion-help` | frontend/index.html:10621 |
| `nav-group-about` | frontend/index.html:9008 |
| `nav-group-ai` | frontend/index.html:8964 |
| `nav-group-look` | frontend/index.html:8989 |
| `nav-group-security` | frontend/index.html:8995 |
| `nav-group-system` | frontend/index.html:9001 |
| `nav-group-you` | frontend/index.html:8976 |
| `new-chat-btn` | frontend/index.html:2011 |
| `no-match-message` | frontend/index.html:2474 |
| `note-outbox-notice` | frontend/index.html:1526 |
| `note-outbox-retry` | frontend/index.html:1528 |
| `note-picker-clear` | frontend/index.html:2984 |
| `note-picker-close` | frontend/index.html:2937 |
| `note-picker-count` | frontend/index.html:2983 |
| `note-picker-done` | frontend/index.html:2985 |
| `note-picker-help` | frontend/index.html:2941 |
| `note-picker-list` | frontend/index.html:2978 |
| `note-picker-panel` | frontend/index.html:2923 |
| `note-picker-search` | frontend/index.html:2975 |
| `note-picker-sources` | frontend/index.html:2954 |
| `note-search` | frontend/index.html:2316 |
| `note-sort` | frontend/index.html:2333 |
| `note-template-dialog` | frontend/index.html:1002 |
| `note-template-list` | frontend/index.html:1012 |
| `note-template-manage` | frontend/index.html:1016 |
| `note-template-preview` | frontend/index.html:1013 |
| `note-template-title` | frontend/index.html:1005 |
| `note-template-use` | frontend/index.html:1018 |
| `note-toolbar` | frontend/index.html:1549 |
| `notes-expand-all` | frontend/index.html:2393 |
| `notes-filter-menu` | frontend/index.html:2321 |
| `notes-manage-tags` | frontend/index.html:2391 |
| `notes-more-menu` | frontend/index.html:2368 |
| `notes-new-note` | frontend/index.html:2421 |
| `notes-page-next` | frontend/index.html:2466 |
| `notes-page-prev` | frontend/index.html:2464 |
| `notes-page-size` | frontend/index.html:2404 |
| `notes-page-status` | frontend/index.html:2465 |
| `notes-pagination` | frontend/index.html:2463 |
| `notes-rail` | frontend/index.html:2491 |
| `notes-rail-body` | frontend/index.html:2520 |
| `notes-rail-close` | frontend/index.html:2500 |
| `notes-rail-count` | frontend/index.html:2494 |
| `notes-rail-help` | frontend/index.html:2505 |
| `notes-rail-subject` | frontend/index.html:2519 |
| `notes-rail-title` | frontend/index.html:2493 |
| `notes-rail-toggle` | frontend/index.html:2400 |
| `notes-refresh` | frontend/index.html:2389 |
| `notes-subtabs` | frontend/index.html:1435 |
| `notes-tidy` | frontend/index.html:2366 |
| `notes-tidy-count` | frontend/index.html:2367 |
| `notes-view-cards` | frontend/index.html:2349 |
| `notes-view-rows` | frontend/index.html:2347 |
| `notif-activity-mode` | frontend/index.html:254 |
| `notif-btn` | frontend/index.html:204 |
| `notif-clear` | frontend/index.html:267 |
| `notif-close` | frontend/index.html:227 |
| `notif-list` | frontend/index.html:231 |
| `notif-mark-all-read` | frontend/index.html:265 |
| `notif-mute-toggle` | frontend/index.html:224 |
| `notif-panel` | frontend/index.html:207 |
| `notif-unread` | frontend/index.html:221 |
| `notifications-help` | frontend/index.html:11477 |
| `ocr-boxes` | frontend/index.html:8578 |
| `ocr-caption` | frontend/index.html:8614 |
| `ocr-clean-loops` | frontend/index.html:8671 |
| `ocr-close` | frontend/index.html:8417 |
| `ocr-copy-all` | frontend/index.html:8692 |
| `ocr-delete-reading` | frontend/index.html:8664 |
| `ocr-describe` | frontend/index.html:8685 |
| `ocr-describe-label` | frontend/index.html:8686 |
| `ocr-dock` | frontend/index.html:8433 |
| `ocr-edit-box` | frontend/index.html:8641 |
| `ocr-edit-cancel` | frontend/index.html:8644 |
| `ocr-edit-panel` | frontend/index.html:8639 |
| `ocr-edit-save` | frontend/index.html:8643 |
| `ocr-empty` | frontend/index.html:8650 |
| `ocr-engine` | frontend/index.html:8512 |
| `ocr-engine-dot` | frontend/index.html:8481 |
| `ocr-file` | frontend/index.html:8404 |
| `ocr-find` | frontend/index.html:8610 |
| `ocr-find-count` | frontend/index.html:8612 |
| `ocr-help` | frontend/index.html:8420 |
| `ocr-help-toggle` | frontend/index.html:8519 |
| `ocr-image` | frontend/index.html:8560 |
| `ocr-live-text` | frontend/index.html:8581 |
| `ocr-message` | frontend/index.html:8615 |
| `ocr-model-apply` | frontend/index.html:9231 |
| `ocr-model-help` | frontend/index.html:9235 |
| `ocr-model-note` | frontend/index.html:9233 |
| `ocr-model-select` | frontend/index.html:9230 |
| `ocr-more` | frontend/index.html:8713 |
| `ocr-next-page` | frontend/index.html:8414 |
| `ocr-other-readings` | frontend/index.html:8619 |
| `ocr-page-label` | frontend/index.html:8413 |
| `ocr-page-pane` | frontend/index.html:8558 |
| `ocr-pager` | frontend/index.html:8410 |
| `ocr-prev-page` | frontend/index.html:8411 |
| `ocr-rail` | frontend/index.html:8556 |
| `ocr-rail-switch` | frontend/index.html:8554 |
| `ocr-rapidocr-install` | frontend/index.html:8503 |
| `ocr-rapidocr-missing` | frontend/index.html:8501 |
| `ocr-read-menu-slot` | frontend/index.html:8539 |
| `ocr-read-page` | frontend/index.html:8534 |
| `ocr-read-page-label` | frontend/index.html:8535 |
| `ocr-read-split` | frontend/index.html:8533 |
| `ocr-reader` | frontend/index.html:8490 |
| `ocr-reader-menu` | frontend/index.html:8479 |
| `ocr-reader-name` | frontend/index.html:8482 |
| `ocr-region-cancel` | frontend/index.html:8595 |
| `ocr-region-describe` | frontend/index.html:8593 |
| `ocr-region-list` | frontend/index.html:8651 |
| `ocr-region-popover` | frontend/index.html:8588 |
| `ocr-region-read` | frontend/index.html:8591 |
| `ocr-region-results` | frontend/index.html:8635 |
| `ocr-region-size` | frontend/index.html:8590 |
| `ocr-regions` | frontend/index.html:8439 |
| `ocr-scroll` | frontend/index.html:8601 |
| `ocr-select` | frontend/index.html:8577 |
| `ocr-source` | frontend/index.html:8405 |
| `ocr-stage` | frontend/index.html:8559 |
| `ocr-stop-read` | frontend/index.html:8625 |
| `ocr-to-chat` | frontend/index.html:8705 |
| `ocr-to-note` | frontend/index.html:8714 |
| `ocr-tools-more` | frontend/index.html:8526 |
| `ocr-view` | frontend/index.html:8462 |
| `ocr-workspace` | frontend/index.html:8384 |
| `ocr-zoom` | frontend/index.html:8449 |
| `ocr-zoom-fit` | frontend/index.html:8456 |
| `ocr-zoom-in` | frontend/index.html:8454 |
| `ocr-zoom-level` | frontend/index.html:8452 |
| `ocr-zoom-out` | frontend/index.html:8450 |
| `offline-indicator` | frontend/index.html:8257 |
| `ollama-help` | frontend/index.html:9031 |
| `ollama-status` | frontend/index.html:9018 |
| `onboarding-actions` | frontend/index.html:13941 |
| `onboarding-atlas` | frontend/index.html:13933 |
| `onboarding-back` | frontend/index.html:13947 |
| `onboarding-card` | frontend/index.html:13930 |
| `onboarding-dots` | frontend/index.html:13943 |
| `onboarding-emblem` | frontend/index.html:13932 |
| `onboarding-icon` | frontend/index.html:13934 |
| `onboarding-next` | frontend/index.html:13948 |
| `onboarding-overlay` | frontend/index.html:13928 |
| `onboarding-skip` | frontend/index.html:13945 |
| `onboarding-slide` | frontend/index.html:13931 |
| `onboarding-text` | frontend/index.html:13936 |
| `onboarding-title` | frontend/index.html:13935 |
| `open-exports-folder` | frontend/index.html:12067 |
| `open-exports-row` | frontend/index.html:12066 |
| `packages-help` | frontend/index.html:11146 |
| `page-bg-clear` | frontend/index.html:10467 |
| `page-bg-custom` | frontend/index.html:10466 |
| `page-wash-row` | frontend/index.html:10659 |
| `page-wash-toggle` | frontend/index.html:10660 |
| `palette-card` | frontend/index.html:13387 |
| `palette-grid` | frontend/index.html:10426 |
| `palette-input` | frontend/index.html:13388 |
| `palette-list` | frontend/index.html:13391 |
| `palette-overlay` | frontend/index.html:13386 |
| `palette-preview` | frontend/index.html:13392 |
| `perf-mode` | frontend/index.html:10644 |
| `perf-mode-hint` | frontend/index.html:10642 |
| `perf-mode-row` | frontend/index.html:10638 |
| `persona-add` | frontend/index.html:9776 |
| `persona-export` | frontend/index.html:9783 |
| `persona-import` | frontend/index.html:9784 |
| `persona-import-file` | frontend/index.html:9785 |
| `persona-list` | frontend/index.html:9709 |
| `persona-name` | frontend/index.html:9771 |
| `persona-peek` | frontend/index.html:3164 |
| `persona-peek-panel` | frontend/index.html:3180 |
| `persona-placeholder-hint` | frontend/index.html:9774 |
| `persona-prompt` | frontend/index.html:3168 |
| `persona-prompt` | frontend/index.html:9772 |
| `persona-prompt-text` | frontend/index.html:3182 |
| `persona-select` | frontend/index.html:3159 |
| `persona-select-mark` | frontend/index.html:3158 |
| `persona-status` | frontend/index.html:9777 |
| `personas-help` | frontend/index.html:9700 |
| `phone-more-btn` | frontend/index.html:8159 |
| `phone-tab-dock` | frontend/index.html:8154 |
| `power-saver-indicator` | frontend/index.html:8247 |
| `pref-ai-first-filing` | frontend/index.html:11863 |
| `pref-auto-caption-images` | frontend/index.html:11898 |
| `pref-auto-capture` | frontend/index.html:11930 |
| `pref-auto-dedupe` | frontend/index.html:11916 |
| `pref-auto-file-sensitive` | frontend/index.html:11870 |
| `pref-auto-link` | frontend/index.html:11912 |
| `pref-auto-read-image-text` | frontend/index.html:11902 |
| `pref-auto-stale-review` | frontend/index.html:11920 |
| `pref-auto-tag` | frontend/index.html:11908 |
| `pref-auto-update` | frontend/index.html:13181 |
| `pref-autonomous-interval` | frontend/index.html:11945 |
| `pref-autonomous-model` | frontend/index.html:11948 |
| `pref-autonomous-tasks` | frontend/index.html:11815 |
| `pref-background-filing` | frontend/index.html:11879 |
| `pref-battery-mode` | frontend/index.html:11993 |
| `pref-bin-days` | frontend/index.html:11436 |
| `pref-chat-retention` | frontend/index.html:11442 |
| `pref-close-to-tray` | frontend/index.html:13288 |
| `pref-display-name` | frontend/index.html:11386 |
| `pref-export-dir` | frontend/index.html:12082 |
| `pref-export-dir-reset` | frontend/index.html:12083 |
| `pref-filing-style` | frontend/index.html:11856 |
| `pref-filing-wait` | frontend/index.html:11893 |
| `pref-filing-wait-reset` | frontend/index.html:11895 |
| `pref-new-window-on-launch` | frontend/index.html:13308 |
| `pref-notif-mute-except-reminders` | frontend/index.html:11460 |
| `pref-profile` | frontend/index.html:11400 |
| `pref-profile-count` | frontend/index.html:11402 |
| `pref-profile-enabled` | frontend/index.html:11397 |
| `pref-search-min-sim` | frontend/index.html:9672 |
| `pref-search-reset` | frontend/index.html:9679 |
| `pref-search-z-margin` | frontend/index.html:9676 |
| `pref-searxng` | frontend/index.html:11607 |
| `pref-semantic-auto-install` | frontend/index.html:9526 |
| `pref-show-console` | frontend/index.html:13268 |
| `pref-show-thinking-words` | frontend/index.html:10746 |
| `pref-simple-mode` | frontend/index.html:11504 |
| `pref-single-keys` | frontend/index.html:11247 |
| `pref-smart-model-routing` | frontend/index.html:9172 |
| `pref-smart-punctuation` | frontend/index.html:11486 |
| `pref-style` | frontend/index.html:9718 |
| `pref-update-channel-main` | frontend/index.html:13207 |
| `pref-update-check` | frontend/index.html:13157 |
| `pref-voice` | frontend/index.html:9726 |
| `pref-warm-search-model` | frontend/index.html:11885 |
| `pref-web-search` | frontend/index.html:11584 |
| `prefs-save` | frontend/index.html:11409 |
| `prefs-status` | frontend/index.html:11410 |
| `prefs-unsaved` | frontend/index.html:11411 |
| `privacy-covers` | frontend/index.html:12723 |
| `privacy-destinations` | frontend/index.html:12741 |
| `privacy-empty` | frontend/index.html:12742 |
| `privacy-help` | frontend/index.html:12722 |
| `privacy-listening` | frontend/index.html:12753 |
| `privacy-model` | frontend/index.html:12747 |
| `privacy-model-meta` | frontend/index.html:12748 |
| `privacy-range` | frontend/index.html:12735 |
| `privacy-range-note` | frontend/index.html:12740 |
| `privacy-refresh` | frontend/index.html:12763 |
| `privacy-switches` | frontend/index.html:12759 |
| `privacy-verdict` | frontend/index.html:12730 |
| `profile-avatar` | frontend/index.html:11349 |
| `profile-delete` | frontend/index.html:11421 |
| `profile-head-name` | frontend/index.html:11351 |
| `profile-look` | frontend/index.html:11355 |
| `profile-look-parts` | frontend/index.html:11366 |
| `profile-look-reset` | frontend/index.html:11362 |
| `profile-look-shuffle` | frontend/index.html:11359 |
| `progress-motion` | frontend/index.html:10734 |
| `progress-motion-hint` | frontend/index.html:10732 |
| `progress-motion-row` | frontend/index.html:10723 |
| `question` | frontend/index.html:2064 |
| `questions` | frontend/index.html:2240 |
| `questions-ask` | frontend/index.html:2258 |
| `questions-heading` | frontend/index.html:2243 |
| `questions-help-body` | frontend/index.html:2269 |
| `questions-help-toggle` | frontend/index.html:2262 |
| `questions-lead` | frontend/index.html:2281 |
| `questions-list` | frontend/index.html:2282 |
| `questions-more` | frontend/index.html:2283 |
| `questions-refresh` | frontend/index.html:2260 |
| `questions-state` | frontend/index.html:2251 |
| `quick-note` | frontend/index.html:1072 |
| `quick-note-clear` | frontend/index.html:1102 |
| `quick-note-close` | frontend/index.html:1081 |
| `quick-note-help` | frontend/index.html:1085 |
| `quick-note-more` | frontend/index.html:1103 |
| `quick-note-save` | frontend/index.html:1104 |
| `quick-note-status` | frontend/index.html:1100 |
| `quick-note-text` | frontend/index.html:1098 |
| `quick-note-title` | frontend/index.html:1074 |
| `quit-btn` | frontend/index.html:294 |
| `quit-help` | frontend/index.html:12008 |
| `radius-slider` | frontend/index.html:10549 |
| `radius-value` | frontend/index.html:10551 |
| `raw-results` | frontend/index.html:2232 |
| `recent-questions` | frontend/index.html:2101 |
| `recordings-help` | frontend/index.html:8016 |
| `recordings-list` | frontend/index.html:8025 |
| `recordings-record` | frontend/index.html:8020 |
| `recordings-search` | frontend/index.html:8008 |
| `recovery-key-copy` | frontend/index.html:470 |
| `recovery-key-dialog` | frontend/index.html:429 |
| `recovery-key-dialog-help` | frontend/index.html:442 |
| `recovery-key-done` | frontend/index.html:474 |
| `recovery-key-download` | frontend/index.html:471 |
| `recovery-key-error` | frontend/index.html:477 |
| `recovery-key-help` | frontend/index.html:12654 |
| `recovery-key-lead` | frontend/index.html:467 |
| `recovery-key-make` | frontend/index.html:463 |
| `recovery-key-offer` | frontend/index.html:459 |
| `recovery-key-show` | frontend/index.html:466 |
| `recovery-key-skip` | frontend/index.html:462 |
| `recovery-key-title` | frontend/index.html:431 |
| `recovery-key-value` | frontend/index.html:468 |
| `reduce-motion-row` | frontend/index.html:10751 |
| `reduce-motion-toggle` | frontend/index.html:10752 |
| `reindex-blurb` | frontend/index.html:9625 |
| `reindex-box` | frontend/index.html:9599 |
| `reindex-help` | frontend/index.html:9608 |
| `reindex-label` | frontend/index.html:9618 |
| `reindex-progress` | frontend/index.html:9617 |
| `reindex-stale` | frontend/index.html:9623 |
| `reindex-start` | frontend/index.html:9626 |
| `rekey-help` | frontend/index.html:12589 |
| `reminder-add` | frontend/index.html:5363 |
| `reminder-calendar` | frontend/index.html:5533 |
| `reminder-clear-done` | frontend/index.html:5459 |
| `reminder-clock` | frontend/index.html:5320 |
| `reminder-compose` | frontend/index.html:5317 |
| `reminder-date` | frontend/index.html:5349 |
| `reminder-due` | frontend/index.html:5351 |
| `reminder-due-day-down` | frontend/index.html:5419 |
| `reminder-due-day-up` | frontend/index.html:5422 |
| `reminder-due-nudge-down` | frontend/index.html:5412 |
| `reminder-due-nudge-up` | frontend/index.html:5415 |
| `reminder-due-readout` | frontend/index.html:5431 |
| `reminder-due-row` | frontend/index.html:5385 |
| `reminder-filter` | frontend/index.html:5516 |
| `reminder-groups` | frontend/index.html:5521 |
| `reminder-list-card` | frontend/index.html:5438 |
| `reminder-magic` | frontend/index.html:5332 |
| `reminder-magic-add` | frontend/index.html:5337 |
| `reminder-magic-row` | frontend/index.html:5326 |
| `reminder-magic-status` | frontend/index.html:5339 |
| `reminder-presets` | frontend/index.html:5388 |
| `reminder-presets-menu` | frontend/index.html:5386 |
| `reminder-priority` | frontend/index.html:5352 |
| `reminder-recurring` | frontend/index.html:5357 |
| `reminder-text` | frontend/index.html:5341 |
| `reminder-time` | frontend/index.html:5350 |
| `reminder-view-toggle` | frontend/index.html:5451 |
| `reminders-done-page-next` | frontend/index.html:5527 |
| `reminders-done-page-prev` | frontend/index.html:5525 |
| `reminders-done-page-status` | frontend/index.html:5526 |
| `reminders-done-pagination` | frontend/index.html:5524 |
| `reminders-empty` | frontend/index.html:5534 |
| `reminders-export-ics` | frontend/index.html:5475 |
| `reminders-help` | frontend/index.html:5466 |
| `reminders-help-toggle` | frontend/index.html:5463 |
| `reminders-more-menu` | frontend/index.html:5469 |
| `reminders-new` | frontend/index.html:5494 |
| `reminders-notif-help` | frontend/index.html:5509 |
| `reminders-page-size` | frontend/index.html:5480 |
| `response-mode-select` | frontend/index.html:3151 |
| `restore-bundle` | frontend/index.html:12158 |
| `restore-bundle-file` | frontend/index.html:12157 |
| `restore-bundle-help` | frontend/index.html:12144 |
| `restore-bundle-password` | frontend/index.html:12160 |
| `restore-bundle-status` | frontend/index.html:12163 |
| `retry-btn` | frontend/index.html:2187 |
| `run-budget-help` | frontend/index.html:10252 |
| `run-budget-seconds` | frontend/index.html:10284 |
| `run-budget-status` | frontend/index.html:10287 |
| `run-budget-tokens` | frontend/index.html:10276 |
| `sampling-box` | frontend/index.html:9316 |
| `sampling-help` | frontend/index.html:9324 |
| `sampling-model` | frontend/index.html:9331 |
| `sampling-note` | frontend/index.html:9339 |
| `sampling-reset` | frontend/index.html:9334 |
| `sampling-rows` | frontend/index.html:9332 |
| `save-btn` | frontend/index.html:1715 |
| `save-draft-btn` | frontend/index.html:1712 |
| `save-search` | frontend/index.html:2327 |
| `save-status` | frontend/index.html:1717 |
| `saved-finds` | frontend/index.html:1373 |
| `saved-finds-box` | frontend/index.html:1371 |
| `saved-searches` | frontend/index.html:2443 |
| `search-engine-config` | frontend/index.html:9466 |
| `search-engine-health` | frontend/index.html:9443 |
| `search-engine-help` | frontend/index.html:9475 |
| `search-help` | frontend/index.html:2355 |
| `search-help-hint` | frontend/index.html:2446 |
| `search-mode` | frontend/index.html:2230 |
| `search-provider-picker` | frontend/index.html:11591 |
| `search-provider-status` | frontend/index.html:11593 |
| `search-relevance-group` | frontend/index.html:9642 |
| `search-relevance-help` | frontend/index.html:9651 |
| `search-relevance-intro` | frontend/index.html:9658 |
| `searxng-autostart` | frontend/index.html:11678 |
| `searxng-backend` | frontend/index.html:11646 |
| `searxng-detect` | frontend/index.html:11609 |
| `searxng-help` | frontend/index.html:11614 |
| `searxng-host-help` | frontend/index.html:11640 |
| `searxng-host-state` | frontend/index.html:11637 |
| `searxng-host-status` | frontend/index.html:11666 |
| `searxng-install-line` | frontend/index.html:11685 |
| `searxng-install-progress` | frontend/index.html:11683 |
| `searxng-output` | frontend/index.html:11690 |
| `searxng-output-fold` | frontend/index.html:11688 |
| `searxng-port` | frontend/index.html:11649 |
| `searxng-reinstall` | frontend/index.html:11663 |
| `searxng-start` | frontend/index.html:11661 |
| `searxng-status` | frontend/index.html:11612 |
| `searxng-stop` | frontend/index.html:11662 |
| `select-btn` | frontend/index.html:2354 |
| `semantic-auto-install-help` | frontend/index.html:9536 |
| `semantic-search-toggle` | frontend/index.html:2325 |
| `sessions-help` | frontend/index.html:12617 |
| `settings-about` | frontend/index.html:12989 |
| `settings-account` | frontend/index.html:12394 |
| `settings-appearance` | frontend/index.html:10342 |
| `settings-btn` | frontend/index.html:286 |
| `settings-close` | frontend/index.html:8934 |
| `settings-data` | frontend/index.html:12020 |
| `settings-extras` | frontend/index.html:11133 |
| `settings-general` | frontend/index.html:11431 |
| `settings-guide-btn` | frontend/index.html:8915 |
| `settings-help` | frontend/index.html:12910 |
| `settings-learned` | frontend/index.html:10061 |
| `settings-logs` | frontend/index.html:12768 |
| `settings-manage-categories` | frontend/index.html:11840 |
| `settings-manage-tags` | frontend/index.html:11847 |
| `settings-memory` | frontend/index.html:10004 |
| `settings-modal` | frontend/index.html:8876 |
| `settings-modal-nav` | frontend/index.html:8917 |
| `settings-models` | frontend/index.html:9017 |
| `settings-nav` | frontend/index.html:8943 |
| `settings-nav-appearance` | frontend/index.html:8991 |
| `settings-nav-back` | frontend/index.html:8918 |
| `settings-nav-forward` | frontend/index.html:8919 |
| `settings-nav-help` | frontend/index.html:9010 |
| `settings-nav-models` | frontend/index.html:8966 |
| `settings-notif-help` | frontend/index.html:11470 |
| `settings-peek` | frontend/index.html:8930 |
| `settings-personas` | frontend/index.html:9686 |
| `settings-preferences` | frontend/index.html:11343 |
| `settings-privacy` | frontend/index.html:12710 |
| `settings-profile-btn` | frontend/index.html:8913 |
| `settings-results` | frontend/index.html:8956 |
| `settings-search` | frontend/index.html:8949 |
| `settings-search-count` | frontend/index.html:8952 |
| `settings-searchindex` | frontend/index.html:9442 |
| `settings-shortcuts` | frontend/index.html:11236 |
| `settings-skills` | frontend/index.html:9791 |
| `settings-skills-help` | frontend/index.html:9808 |
| `settings-tasks` | frontend/index.html:11714 |
| `settings-templates` | frontend/index.html:9951 |
| `settings-tools` | frontend/index.html:10159 |
| `settings-websearch` | frontend/index.html:11548 |
| `shadow-intensity` | frontend/index.html:10602 |
| `shadow-intensity-value` | frontend/index.html:10604 |
| `shortcut-head-whiteboard` | frontend/index.html:13550 |
| `shortcut-list` | frontend/index.html:13510 |
| `shortcut-list-documents` | frontend/index.html:13546 |
| `shortcut-list-documents-note` | frontend/index.html:13547 |
| `shortcut-list-settings` | frontend/index.html:11244 |
| `shortcut-list-whiteboard` | frontend/index.html:13555 |
| `shortcut-list-whiteboard-note` | frontend/index.html:13556 |
| `shortcut-status` | frontend/index.html:13511 |
| `shortcut-status-settings` | frontend/index.html:11245 |
| `shortcuts-card` | frontend/index.html:13501 |
| `shortcuts-close` | frontend/index.html:13505 |
| `shortcuts-overlay` | frontend/index.html:13499 |
| `shortcuts-overlay-always-help` | frontend/index.html:13525 |
| `shortcuts-reset` | frontend/index.html:13513 |
| `shortcuts-reset-settings` | frontend/index.html:11251 |
| `show-guide-btn` | frontend/index.html:12935 |
| `sidebar` | frontend/index.html:1353 |
| `sign-in-help` | frontend/index.html:12429 |
| `simple-mode-box` | frontend/index.html:11494 |
| `simple-mode-help` | frontend/index.html:11507 |
| `sketch-bg-canvas` | frontend/index.html:13758 |
| `sketch-bg-color-picker` | frontend/index.html:13752 |
| `sketch-btn` | frontend/index.html:1657 |
| `sketch-canvas` | frontend/index.html:13759 |
| `sketch-canvas-wrap` | frontend/index.html:13757 |
| `sketch-caption` | frontend/index.html:13769 |
| `sketch-card` | frontend/index.html:13674 |
| `sketch-clear` | frontend/index.html:13750 |
| `sketch-close` | frontend/index.html:13678 |
| `sketch-foot` | frontend/index.html:13768 |
| `sketch-image-input` | frontend/index.html:13756 |
| `sketch-overlay` | frontend/index.html:13673 |
| `sketch-redo` | frontend/index.html:13749 |
| `sketch-save` | frontend/index.html:13771 |
| `sketch-size` | frontend/index.html:13732 |
| `sketch-size-value` | frontend/index.html:13733 |
| `sketch-status` | frontend/index.html:13770 |
| `sketch-tool-arrow` | frontend/index.html:13695 |
| `sketch-tool-circ` | frontend/index.html:13697 |
| `sketch-tool-eraser` | frontend/index.html:13688 |
| `sketch-tool-highlighter` | frontend/index.html:13687 |
| `sketch-tool-line` | frontend/index.html:13694 |
| `sketch-tool-pen` | frontend/index.html:13686 |
| `sketch-tool-rect` | frontend/index.html:13696 |
| `sketch-tool-text` | frontend/index.html:13698 |
| `sketch-toolbar` | frontend/index.html:13682 |
| `sketch-undo` | frontend/index.html:13748 |
| `sketch-upload-image` | frontend/index.html:13751 |
| `skill-add` | frontend/index.html:9935 |
| `skill-add-fold` | frontend/index.html:9835 |
| `skill-cancel` | frontend/index.html:9936 |
| `skill-description` | frontend/index.html:9838 |
| `skill-export` | frontend/index.html:9943 |
| `skill-folder-line` | frontend/index.html:9833 |
| `skill-import` | frontend/index.html:9944 |
| `skill-import-file` | frontend/index.html:9945 |
| `skill-inputs` | frontend/index.html:9848 |
| `skill-list` | frontend/index.html:9832 |
| `skill-manual-toggle` | frontend/index.html:3203 |
| `skill-name` | frontend/index.html:9837 |
| `skill-prompt` | frontend/index.html:9840 |
| `skill-run-cancel` | frontend/index.html:13487 |
| `skill-run-card` | frontend/index.html:13483 |
| `skill-run-description` | frontend/index.html:13491 |
| `skill-run-fields` | frontend/index.html:13492 |
| `skill-run-go` | frontend/index.html:13494 |
| `skill-run-overlay` | frontend/index.html:13481 |
| `skill-run-title` | frontend/index.html:13485 |
| `skill-status` | frontend/index.html:9937 |
| `skill-steps` | frontend/index.html:9845 |
| `skill-tool-list` | frontend/index.html:9873 |
| `skill-tools-help` | frontend/index.html:9864 |
| `skill-verify-expect` | frontend/index.html:9914 |
| `skill-verify-help` | frontend/index.html:9897 |
| `skill-verify-tool` | frontend/index.html:9912 |
| `skill-verify-untagged` | frontend/index.html:9924 |
| `skill-verify-value` | frontend/index.html:9920 |
| `skills-add-new` | frontend/index.html:5933 |
| `skills-dashboard-list` | frontend/index.html:5945 |
| `skills-help` | frontend/index.html:5927 |
| `skills-intro` | frontend/index.html:5937 |
| `skills-kind` | frontend/index.html:5912 |
| `skills-logs-clear` | frontend/index.html:5980 |
| `skills-logs-heading` | frontend/index.html:5979 |
| `skills-logs-list` | frontend/index.html:5982 |
| `skills-search` | frontend/index.html:5898 |
| `skills-sidebar` | frontend/index.html:5977 |
| `skills-sort` | frontend/index.html:5920 |
| `skip-link` | frontend/index.html:120 |
| `small-model-mode` | frontend/index.html:10229 |
| `small-model-mode-help` | frontend/index.html:10211 |
| `small-model-mode-status` | frontend/index.html:10236 |
| `space-create-dialog` | frontend/index.html:880 |
| `space-create-error` | frontend/index.html:893 |
| `space-create-icon` | frontend/index.html:892 |
| `space-create-icon-picker` | frontend/index.html:891 |
| `space-create-name` | frontend/index.html:889 |
| `space-create-submit` | frontend/index.html:896 |
| `space-current-icon` | frontend/index.html:140 |
| `space-current-name` | frontend/index.html:141 |
| `space-delete-dialog` | frontend/index.html:920 |
| `space-delete-error` | frontend/index.html:933 |
| `space-delete-fate` | frontend/index.html:929 |
| `space-delete-id` | frontend/index.html:932 |
| `space-delete-submit` | frontend/index.html:936 |
| `space-edit-dialog` | frontend/index.html:900 |
| `space-edit-error` | frontend/index.html:913 |
| `space-edit-icon` | frontend/index.html:912 |
| `space-edit-icon-picker` | frontend/index.html:911 |
| `space-edit-id` | frontend/index.html:907 |
| `space-edit-name` | frontend/index.html:909 |
| `space-edit-submit` | frontend/index.html:916 |
| `space-menu` | frontend/index.html:144 |
| `space-switcher-btn` | frontend/index.html:137 |
| `speak-btn` | frontend/index.html:2191 |
| `status-activity` | frontend/index.html:8246 |
| `status-agent` | frontend/index.html:8271 |
| `status-back` | frontend/index.html:8308 |
| `status-bar` | frontend/index.html:8187 |
| `status-bar-clock-toggle` | frontend/index.html:11077 |
| `status-bar-items` | frontend/index.html:11063 |
| `status-clock` | frontend/index.html:8292 |
| `status-clock-detail` | frontend/index.html:8324 |
| `status-clock-detail-date` | frontend/index.html:8325 |
| `status-clock-detail-time` | frontend/index.html:8326 |
| `status-clock-detail-zone` | frontend/index.html:8327 |
| `status-command` | frontend/index.html:8262 |
| `status-find` | frontend/index.html:8283 |
| `status-forward` | frontend/index.html:8309 |
| `status-guide` | frontend/index.html:8278 |
| `status-nav-history` | frontend/index.html:8315 |
| `status-nav-history-menu` | frontend/index.html:8346 |
| `status-notes` | frontend/index.html:8231 |
| `status-redo` | frontend/index.html:8322 |
| `status-reminders` | frontend/index.html:8232 |
| `status-task` | frontend/index.html:8236 |
| `status-timer` | frontend/index.html:8239 |
| `status-undo` | frontend/index.html:8321 |
| `statusbar-help` | frontend/index.html:11055 |
| `stop-btn` | frontend/index.html:2090 |
| `storage-space-notice` | frontend/index.html:12329 |
| `suggested-box` | frontend/index.html:9392 |
| `suggested-hardware` | frontend/index.html:9401 |
| `suggested-help` | frontend/index.html:9402 |
| `suggested-hide-big` | frontend/index.html:9418 |
| `suggested-hide-wrap` | frontend/index.html:9417 |
| `suggested-list` | frontend/index.html:9421 |
| `suggested-questions` | frontend/index.html:2100 |
| `tab-bar` | frontend/index.html:147 |
| `tab-btn-chat` | frontend/index.html:152 |
| `tab-btn-dashboard` | frontend/index.html:148 |
| `tab-btn-graph` | frontend/index.html:154 |
| `tab-btn-library` | frontend/index.html:164 |
| `tab-btn-notes` | frontend/index.html:150 |
| `tab-btn-reminders` | frontend/index.html:168 |
| `tab-btn-timeline` | frontend/index.html:166 |
| `tab-chat` | frontend/index.html:2526 |
| `tab-dashboard` | frontend/index.html:1244 |
| `tab-documents` | frontend/index.html:4419 |
| `tab-graph` | frontend/index.html:3641 |
| `tab-library` | frontend/index.html:5554 |
| `tab-notes` | frontend/index.html:1350 |
| `tab-reminders` | frontend/index.html:5315 |
| `tab-timeline` | frontend/index.html:3346 |
| `task-history` | frontend/index.html:11752 |
| `task-history-box` | frontend/index.html:11745 |
| `task-history-clear` | frontend/index.html:11753 |
| `task-list` | frontend/index.html:11739 |
| `tasks-empty` | frontend/index.html:11740 |
| `tasks-live-group` | frontend/index.html:11720 |
| `tasks-live-help` | frontend/index.html:11730 |
| `template-add` | frontend/index.html:9993 |
| `template-body` | frontend/index.html:9985 |
| `template-cancel` | frontend/index.html:9997 |
| `template-description` | frontend/index.html:9983 |
| `template-draft` | frontend/index.html:9995 |
| `template-list` | frontend/index.html:9979 |
| `template-name` | frontend/index.html:9982 |
| `template-status` | frontend/index.html:9998 |
| `templates-help` | frontend/index.html:9965 |
| `theme-btn` | frontend/index.html:285 |
| `theme-clear-overrides` | frontend/index.html:10406 |
| `theme-override-note` | frontend/index.html:10365 |
| `theme-presets` | frontend/index.html:10364 |
| `theme-reset` | frontend/index.html:10403 |
| `theme-seg` | frontend/index.html:10434 |
| `themes-help` | frontend/index.html:10357 |
| `thinking-box` | frontend/index.html:2202 |
| `timeline-band` | frontend/index.html:3454 |
| `timeline-band-section` | frontend/index.html:3452 |
| `timeline-batch-bar` | frontend/index.html:3562 |
| `timeline-batch-category-host` | frontend/index.html:3569 |
| `timeline-batch-count` | frontend/index.html:3563 |
| `timeline-batch-delete` | frontend/index.html:3571 |
| `timeline-batch-done` | frontend/index.html:3576 |
| `timeline-batch-more-host` | frontend/index.html:3575 |
| `timeline-batch-select-all` | frontend/index.html:3564 |
| `timeline-batch-tag` | frontend/index.html:3570 |
| `timeline-clear-search` | frontend/index.html:3636 |
| `timeline-count` | frontend/index.html:3370 |
| `timeline-custom-range` | frontend/index.html:3482 |
| `timeline-days` | frontend/index.html:3470 |
| `timeline-days-earlier` | frontend/index.html:3523 |
| `timeline-days-later` | frontend/index.html:3530 |
| `timeline-daystrip` | frontend/index.html:3521 |
| `timeline-daystrip-days` | frontend/index.html:3532 |
| `timeline-density-path` | frontend/index.html:3618 |
| `timeline-empty` | frontend/index.html:3623 |
| `timeline-end-date` | frontend/index.html:3485 |
| `timeline-feed` | frontend/index.html:3588 |
| `timeline-filter-clear` | frontend/index.html:3411 |
| `timeline-group` | frontend/index.html:3441 |
| `timeline-help` | frontend/index.html:3492 |
| `timeline-intro` | frontend/index.html:3502 |
| `timeline-jump-today` | frontend/index.html:3497 |
| `timeline-kinds` | frontend/index.html:3405 |
| `timeline-kinds-btn` | frontend/index.html:3403 |
| `timeline-kinds-label` | frontend/index.html:3404 |
| `timeline-kinds-menu` | frontend/index.html:3402 |
| `timeline-month-btn` | frontend/index.html:3527 |
| `timeline-month-grid` | frontend/index.html:3548 |
| `timeline-month-next` | frontend/index.html:3546 |
| `timeline-month-pop` | frontend/index.html:3542 |
| `timeline-month-prev` | frontend/index.html:3544 |
| `timeline-month-text` | frontend/index.html:3529 |
| `timeline-month-title` | frontend/index.html:3545 |
| `timeline-no-match` | frontend/index.html:3632 |
| `timeline-options` | frontend/index.html:3425 |
| `timeline-options-menu` | frontend/index.html:3423 |
| `timeline-recall` | frontend/index.html:3541 |
| `timeline-scale` | frontend/index.html:3428 |
| `timeline-scale-group` | frontend/index.html:3426 |
| `timeline-scroll` | frontend/index.html:3587 |
| `timeline-scrubber` | frontend/index.html:3615 |
| `timeline-scrubber-window` | frontend/index.html:3619 |
| `timeline-search` | frontend/index.html:3377 |
| `timeline-select-btn` | frontend/index.html:3463 |
| `timeline-start-date` | frontend/index.html:3483 |
| `timeline-table` | frontend/index.html:3598 |
| `timeline-table-body` | frontend/index.html:3612 |
| `timeline-table-head` | frontend/index.html:3600 |
| `timeline-view-feed` | frontend/index.html:3420 |
| `timeline-view-seg` | frontend/index.html:3419 |
| `timeline-view-table` | frontend/index.html:3421 |
| `toast-box` | frontend/index.html:13375 |
| `tool-count` | frontend/index.html:10303 |
| `tool-filter` | frontend/index.html:10301 |
| `tool-filter-empty` | frontend/index.html:10306 |
| `tool-focus-help` | frontend/index.html:10174 |
| `tool-focus-status` | frontend/index.html:10193 |
| `tool-list` | frontend/index.html:10305 |
| `tools-toggle` | frontend/index.html:3054 |
| `top-bar` | frontend/index.html:123 |
| `tour-back` | frontend/index.html:14007 |
| `tour-block` | frontend/index.html:13985 |
| `tour-block-bottom` | frontend/index.html:13988 |
| `tour-block-left` | frontend/index.html:13989 |
| `tour-block-right` | frontend/index.html:13987 |
| `tour-block-top` | frontend/index.html:13986 |
| `tour-card` | frontend/index.html:13992 |
| `tour-close` | frontend/index.html:13998 |
| `tour-count` | frontend/index.html:13997 |
| `tour-next` | frontend/index.html:14008 |
| `tour-replay-buttons` | frontend/index.html:12936 |
| `tour-section` | frontend/index.html:13995 |
| `tour-skip` | frontend/index.html:14005 |
| `tour-spot` | frontend/index.html:13991 |
| `tour-text` | frontend/index.html:14003 |
| `tour-title` | frontend/index.html:14002 |
| `ui-motion-row` | frontend/index.html:10762 |
| `ui-motion-toggle` | frontend/index.html:10763 |
| `undo-history-menu` | frontend/index.html:8353 |
| `update-apply-now` | frontend/index.html:13168 |
| `update-channel-help` | frontend/index.html:13219 |
| `update-check-now` | frontend/index.html:13161 |
| `update-check-row` | frontend/index.html:13160 |
| `update-check-status` | frontend/index.html:13169 |
| `update-install-version` | frontend/index.html:13253 |
| `update-show-versions` | frontend/index.html:13251 |
| `update-version-row` | frontend/index.html:13250 |
| `update-version-select` | frontend/index.html:13252 |
| `update-version-status` | frontend/index.html:13255 |
| `usage-box` | frontend/index.html:11517 |
| `usage-clear` | frontend/index.html:11540 |
| `usage-help` | frontend/index.html:11527 |
| `usage-most` | frontend/index.html:11537 |
| `usage-unused` | frontend/index.html:11538 |
| `utility-model-apply` | frontend/index.html:9164 |
| `utility-model-help` | frontend/index.html:9177 |
| `utility-model-note` | frontend/index.html:9169 |
| `utility-model-select` | frontend/index.html:9163 |
| `vision-model-apply` | frontend/index.html:9201 |
| `vision-model-help` | frontend/index.html:9205 |
| `vision-model-note` | frontend/index.html:9203 |
| `vision-model-select` | frontend/index.html:9200 |
| `voice-model-select` | frontend/index.html:11189 |
| `voice-model-wrap` | frontend/index.html:11187 |
| `wb-add-image` | frontend/index.html:6881 |
| `wb-add-note` | frontend/index.html:6618 |
| `wb-add-sticker` | frontend/index.html:6888 |
| `wb-add-to-note` | frontend/index.html:6588 |
| `wb-align-bottom` | frontend/index.html:7159 |
| `wb-align-hcenter` | frontend/index.html:7155 |
| `wb-align-left` | frontend/index.html:7154 |
| `wb-align-right` | frontend/index.html:7156 |
| `wb-align-top` | frontend/index.html:7157 |
| `wb-align-vcenter` | frontend/index.html:7158 |
| `wb-announcer` | frontend/index.html:6255 |
| `wb-arrange-menu` | frontend/index.html:6415 |
| `wb-arrow-style` | frontend/index.html:7036 |
| `wb-back-to-boards` | frontend/index.html:6340 |
| `wb-bg-color-picker` | frontend/index.html:6479 |
| `wb-bg-color-reset` | frontend/index.html:6480 |
| `wb-bg-image` | frontend/index.html:6481 |
| `wb-bg-image-input` | frontend/index.html:6538 |
| `wb-board-kind` | frontend/index.html:6582 |
| `wb-board-kind-label` | frontend/index.html:6582 |
| `wb-board-menu` | frontend/index.html:6542 |
| `wb-board-select` | frontend/index.html:6342 |
| `wb-boards-generate` | frontend/index.html:6104 |
| `wb-boards-help` | frontend/index.html:6076 |
| `wb-boards-import` | frontend/index.html:6105 |
| `wb-boards-intro` | frontend/index.html:6135 |
| `wb-boards-landing` | frontend/index.html:5994 |
| `wb-boards-new` | frontend/index.html:6128 |
| `wb-boards-new-map` | frontend/index.html:6130 |
| `wb-boards-new-menu` | frontend/index.html:6124 |
| `wb-boards-new-template` | frontend/index.html:6129 |
| `wb-canvas-view` | frontend/index.html:6162 |
| `wb-clear-board` | frontend/index.html:6612 |
| `wb-context` | frontend/index.html:7027 |
| `wb-context-menu` | frontend/index.html:7189 |
| `wb-copy-link` | frontend/index.html:6596 |
| `wb-copy-style` | frontend/index.html:7196 |
| `wb-copy-style-row` | frontend/index.html:7193 |
| `wb-delete-board` | frontend/index.html:6613 |
| `wb-distribute-h` | frontend/index.html:7162 |
| `wb-distribute-v` | frontend/index.html:7163 |
| `wb-dock-toggle` | frontend/index.html:6472 |
| `wb-edit-menu` | frontend/index.html:6385 |
| `wb-empty-hint` | frontend/index.html:6300 |
| `wb-empty-hint-actions` | frontend/index.html:6314 |
| `wb-empty-hint-close` | frontend/index.html:6311 |
| `wb-empty-hint-dismiss` | frontend/index.html:6318 |
| `wb-empty-hint-keys` | frontend/index.html:6315 |
| `wb-export` | frontend/index.html:6572 |
| `wb-extract-notes` | frontend/index.html:7227 |
| `wb-fill-color` | frontend/index.html:7048 |
| `wb-fill-on` | frontend/index.html:7049 |
| `wb-fill-opacity` | frontend/index.html:7206 |
| `wb-fill-opacity-row` | frontend/index.html:7206 |
| `wb-fmt-align` | frontend/index.html:7687 |
| `wb-fmt-alpha` | frontend/index.html:7641 |
| `wb-fmt-alpha-out` | frontend/index.html:7641 |
| `wb-fmt-angle` | frontend/index.html:7708 |
| `wb-fmt-bold` | frontend/index.html:7682 |
| `wb-fmt-copy-style` | frontend/index.html:7671 |
| `wb-fmt-dash` | frontend/index.html:7631 |
| `wb-fmt-endcap` | frontend/index.html:7664 |
| `wb-fmt-fill` | frontend/index.html:7638 |
| `wb-fmt-fill-on` | frontend/index.html:7638 |
| `wb-fmt-flip-h` | frontend/index.html:7711 |
| `wb-fmt-flip-v` | frontend/index.html:7712 |
| `wb-fmt-fold` | frontend/index.html:7643 |
| `wb-fmt-h` | frontend/index.html:7706 |
| `wb-fmt-ink` | frontend/index.html:7679 |
| `wb-fmt-italic` | frontend/index.html:7683 |
| `wb-fmt-jumps` | frontend/index.html:7653 |
| `wb-fmt-label-t` | frontend/index.html:7667 |
| `wb-fmt-paste-style` | frontend/index.html:7672 |
| `wb-fmt-route` | frontend/index.html:7646 |
| `wb-fmt-save-style` | frontend/index.html:7673 |
| `wb-fmt-shadow` | frontend/index.html:7644 |
| `wb-fmt-size` | frontend/index.html:7678 |
| `wb-fmt-startcap` | frontend/index.html:7661 |
| `wb-fmt-stroke` | frontend/index.html:7628 |
| `wb-fmt-valign` | frontend/index.html:7694 |
| `wb-fmt-w` | frontend/index.html:7705 |
| `wb-fmt-width` | frontend/index.html:7629 |
| `wb-fmt-x` | frontend/index.html:7703 |
| `wb-fmt-y` | frontend/index.html:7704 |
| `wb-format` | frontend/index.html:7614 |
| `wb-format-body` | frontend/index.html:7624 |
| `wb-format-close` | frontend/index.html:7617 |
| `wb-format-commands` | frontend/index.html:7715 |
| `wb-format-empty` | frontend/index.html:7625 |
| `wb-format-none` | frontend/index.html:7626 |
| `wb-format-tab-arrange` | frontend/index.html:7622 |
| `wb-format-tab-style` | frontend/index.html:7620 |
| `wb-format-tab-text` | frontend/index.html:7621 |
| `wb-format-tabs` | frontend/index.html:7619 |
| `wb-format-title` | frontend/index.html:7616 |
| `wb-fullscreen` | frontend/index.html:6619 |
| `wb-gestures` | frontend/index.html:6175 |
| `wb-gestures-dismiss` | frontend/index.html:6180 |
| `wb-grid-select` | frontend/index.html:6486 |
| `wb-guide-color-center` | frontend/index.html:7222 |
| `wb-guide-color-edge` | frontend/index.html:7221 |
| `wb-guide-color-spacing` | frontend/index.html:7223 |
| `wb-help-about` | frontend/index.html:13586 |
| `wb-help-btn` | frontend/index.html:6603 |
| `wb-help-card` | frontend/index.html:13575 |
| `wb-help-close` | frontend/index.html:13582 |
| `wb-help-none` | frontend/index.html:13598 |
| `wb-help-overlay` | frontend/index.html:13573 |
| `wb-help-search` | frontend/index.html:13594 |
| `wb-help-sections` | frontend/index.html:13597 |
| `wb-help-title` | frontend/index.html:13577 |
| `wb-history-bar` | frontend/index.html:6977 |
| `wb-history-end` | frontend/index.html:6983 |
| `wb-history-restore` | frontend/index.html:6981 |
| `wb-history-restore-selection` | frontend/index.html:6982 |
| `wb-history-slider` | frontend/index.html:6979 |
| `wb-history-when` | frontend/index.html:6980 |
| `wb-html-layer` | frontend/index.html:6276 |
| `wb-image-file-input` | frontend/index.html:6891 |
| `wb-import-about` | frontend/index.html:1033 |
| `wb-import-choose` | frontend/index.html:1037 |
| `wb-import-dialog` | frontend/index.html:1026 |
| `wb-import-file` | frontend/index.html:1035 |
| `wb-import-go` | frontend/index.html:1039 |
| `wb-import-map-file` | frontend/index.html:6072 |
| `wb-import-text` | frontend/index.html:1034 |
| `wb-import-title` | frontend/index.html:1028 |
| `wb-insert-menu` | frontend/index.html:6362 |
| `wb-layers-tree` | frontend/index.html:7571 |
| `wb-lib-import` | frontend/index.html:7564 |
| `wb-lib-keys` | frontend/index.html:7563 |
| `wb-lib-list` | frontend/index.html:7562 |
| `wb-lib-more` | frontend/index.html:7553 |
| `wb-lib-search` | frontend/index.html:7559 |
| `wb-lib-status` | frontend/index.html:7561 |
| `wb-library-list` | frontend/index.html:7568 |
| `wb-lines-group` | frontend/index.html:6271 |
| `wb-link-cut` | frontend/index.html:7500 |
| `wb-link-label` | frontend/index.html:7499 |
| `wb-link-reverse` | frontend/index.html:7498 |
| `wb-map-add-root` | frontend/index.html:6711 |
| `wb-map-add-sticker` | frontend/index.html:6717 |
| `wb-map-align` | frontend/index.html:7304 |
| `wb-map-arrow` | frontend/index.html:6264 |
| `wb-map-bold` | frontend/index.html:7298 |
| `wb-map-chip` | frontend/index.html:6352 |
| `wb-map-core` | frontend/index.html:7342 |
| `wb-map-edge-arrow` | frontend/index.html:7434 |
| `wb-map-edge-dashed` | frontend/index.html:7428 |
| `wb-map-edge-shape` | frontend/index.html:7419 |
| `wb-map-edge-width` | frontend/index.html:7411 |
| `wb-map-effect` | frontend/index.html:7386 |
| `wb-map-empty` | frontend/index.html:6246 |
| `wb-map-empty-add` | frontend/index.html:6250 |
| `wb-map-expand-all` | frontend/index.html:6521 |
| `wb-map-fill` | frontend/index.html:7373 |
| `wb-map-filter` | frontend/index.html:6196 |
| `wb-map-filter-clear` | frontend/index.html:6199 |
| `wb-map-filter-item` | frontend/index.html:6522 |
| `wb-map-filter-label` | frontend/index.html:6198 |
| `wb-map-first-hint` | frontend/index.html:6233 |
| `wb-map-focus` | frontend/index.html:6186 |
| `wb-map-focus-clear` | frontend/index.html:6192 |
| `wb-map-focus-depth` | frontend/index.html:6189 |
| `wb-map-focus-here` | frontend/index.html:6714 |
| `wb-map-focus-label` | frontend/index.html:6188 |
| `wb-map-focus-less` | frontend/index.html:6190 |
| `wb-map-focus-more` | frontend/index.html:6191 |
| `wb-map-italic` | frontend/index.html:7299 |
| `wb-map-layout` | frontend/index.html:6788 |
| `wb-map-legend` | frontend/index.html:6203 |
| `wb-map-line-menu` | frontend/index.html:7407 |
| `wb-map-link-radial` | frontend/index.html:7497 |
| `wb-map-numbered` | frontend/index.html:6519 |
| `wb-map-perspective` | frontend/index.html:6504 |
| `wb-map-picture-input` | frontend/index.html:6899 |
| `wb-map-places-help` | frontend/index.html:6735 |
| `wb-map-radial` | frontend/index.html:7471 |
| `wb-map-reset` | frontend/index.html:7445 |
| `wb-map-shape` | frontend/index.html:7347 |
| `wb-map-shape-menu` | frontend/index.html:7333 |
| `wb-map-spine` | frontend/index.html:7361 |
| `wb-map-stats-item` | frontend/index.html:6523 |
| `wb-map-strip` | frontend/index.html:7273 |
| `wb-map-strip-color` | frontend/index.html:7274 |
| `wb-map-strip-icon` | frontend/index.html:7313 |
| `wb-map-study` | frontend/index.html:6595 |
| `wb-map-template-row` | frontend/index.html:6217 |
| `wb-map-templates` | frontend/index.html:6211 |
| `wb-map-templates-dismiss` | frontend/index.html:6215 |
| `wb-map-templates-title` | frontend/index.html:6213 |
| `wb-map-text-menu` | frontend/index.html:7293 |
| `wb-map-text-size` | frontend/index.html:7284 |
| `wb-map-theme-item` | frontend/index.html:6520 |
| `wb-map-tidy` | frontend/index.html:6800 |
| `wb-map-to-doc` | frontend/index.html:6592 |
| `wb-mapmulti-bold` | frontend/index.html:7179 |
| `wb-mapmulti-color` | frontend/index.html:7178 |
| `wb-mapmulti-fold` | frontend/index.html:7181 |
| `wb-mapmulti-summary` | frontend/index.html:7182 |
| `wb-mapmulti-task` | frontend/index.html:7180 |
| `wb-mindmap-radial` | frontend/index.html:7232 |
| `wb-mindmap-tree` | frontend/index.html:7231 |
| `wb-multi-group` | frontend/index.html:7150 |
| `wb-multi-ungroup` | frontend/index.html:7151 |
| `wb-navigator` | frontend/index.html:7509 |
| `wb-navigator-close` | frontend/index.html:7513 |
| `wb-navigator-empty` | frontend/index.html:7516 |
| `wb-navigator-fit` | frontend/index.html:7512 |
| `wb-navigator-map` | frontend/index.html:7515 |
| `wb-navigator-toggle` | frontend/index.html:6356 |
| `wb-new-board` | frontend/index.html:6556 |
| `wb-outline-tree` | frontend/index.html:7605 |
| `wb-overlay-layer` | frontend/index.html:6288 |
| `wb-overlay-zoom-group` | frontend/index.html:6289 |
| `wb-pages-keys` | frontend/index.html:7576 |
| `wb-pages-list` | frontend/index.html:7575 |
| `wb-panel-library` | frontend/index.html:6469 |
| `wb-panel-outline` | frontend/index.html:6470 |
| `wb-panel-overview` | frontend/index.html:6468 |
| `wb-panel-props` | frontend/index.html:6467 |
| `wb-panel-search` | frontend/index.html:6471 |
| `wb-paste-style` | frontend/index.html:7197 |
| `wb-present-bar` | frontend/index.html:6985 |
| `wb-present-count` | frontend/index.html:6987 |
| `wb-present-end` | frontend/index.html:6992 |
| `wb-present-next` | frontend/index.html:6988 |
| `wb-present-prev` | frontend/index.html:6986 |
| `wb-prop-align` | frontend/index.html:7138 |
| `wb-prop-bg` | frontend/index.html:7216 |
| `wb-prop-bg-none` | frontend/index.html:7216 |
| `wb-prop-bold` | frontend/index.html:7136 |
| `wb-prop-border` | frontend/index.html:7217 |
| `wb-prop-border-none` | frontend/index.html:7217 |
| `wb-prop-bullets` | frontend/index.html:7204 |
| `wb-prop-bullets-row` | frontend/index.html:7202 |
| `wb-prop-color` | frontend/index.html:7054 |
| `wb-prop-dash` | frontend/index.html:7115 |
| `wb-prop-endcap` | frontend/index.html:7092 |
| `wb-prop-fontsize` | frontend/index.html:7134 |
| `wb-prop-italic` | frontend/index.html:7137 |
| `wb-prop-md` | frontend/index.html:7201 |
| `wb-prop-md-row` | frontend/index.html:7201 |
| `wb-prop-nostroke` | frontend/index.html:7200 |
| `wb-prop-nostroke-row` | frontend/index.html:7200 |
| `wb-prop-route` | frontend/index.html:7064 |
| `wb-prop-shapefill` | frontend/index.html:7122 |
| `wb-prop-shapefill-on` | frontend/index.html:7124 |
| `wb-prop-startcap` | frontend/index.html:7071 |
| `wb-prop-width` | frontend/index.html:7057 |
| `wb-radial-child` | frontend/index.html:7472 |
| `wb-radial-collapse` | frontend/index.html:7474 |
| `wb-radial-connect` | frontend/index.html:7476 |
| `wb-radial-delete` | frontend/index.html:7475 |
| `wb-radial-more` | frontend/index.html:7477 |
| `wb-radial-sibling` | frontend/index.html:7473 |
| `wb-rail-ink` | frontend/index.html:6948 |
| `wb-redo` | frontend/index.html:6922 |
| `wb-rename-board` | frontend/index.html:6555 |
| `wb-same-height` | frontend/index.html:7167 |
| `wb-same-width` | frontend/index.html:7166 |
| `wb-search-bar` | frontend/index.html:7524 |
| `wb-search-close` | frontend/index.html:7530 |
| `wb-search-count` | frontend/index.html:7527 |
| `wb-search-input` | frontend/index.html:7526 |
| `wb-search-next` | frontend/index.html:7529 |
| `wb-search-prev` | frontend/index.html:7528 |
| `wb-search-toggle` | frontend/index.html:6355 |
| `wb-selbar-back` | frontend/index.html:7170 |
| `wb-selbar-delete` | frontend/index.html:7186 |
| `wb-selbar-duplicate` | frontend/index.html:7185 |
| `wb-selbar-export` | frontend/index.html:7236 |
| `wb-selbar-forward` | frontend/index.html:7171 |
| `wb-shape-menu` | frontend/index.html:6835 |
| `wb-shape-picker` | frontend/index.html:6830 |
| `wb-shape-toggle` | frontend/index.html:6831 |
| `wb-shape-toggle-icon` | frontend/index.html:6832 |
| `wb-shapes-group` | frontend/index.html:6270 |
| `wb-side-map-expand` | frontend/index.html:7586 |
| `wb-side-map-facts` | frontend/index.html:7583 |
| `wb-side-map-help` | frontend/index.html:7597 |
| `wb-side-map-look` | frontend/index.html:7585 |
| `wb-side-map-tidy` | frontend/index.html:7587 |
| `wb-side-tab-layers` | frontend/index.html:7545 |
| `wb-side-tab-library` | frontend/index.html:7543 |
| `wb-side-tab-map` | frontend/index.html:7547 |
| `wb-side-tab-notes` | frontend/index.html:7544 |
| `wb-side-tab-outline` | frontend/index.html:7548 |
| `wb-side-tab-pages` | frontend/index.html:7546 |
| `wb-sidebar` | frontend/index.html:7541 |
| `wb-sidebar-close` | frontend/index.html:7554 |
| `wb-sidebar-panel` | frontend/index.html:7550 |
| `wb-sidebar-title` | frontend/index.html:7552 |
| `wb-snap-toggle` | frontend/index.html:6493 |
| `wb-sticky-fold` | frontend/index.html:6494 |
| `wb-stroke-none` | frontend/index.html:7207 |
| `wb-stroke-none-row` | frontend/index.html:7207 |
| `wb-stroke-style` | frontend/index.html:7042 |
| `wb-stroke-width` | frontend/index.html:7034 |
| `wb-stroke-width-badge` | frontend/index.html:7241 |
| `wb-strokes-group` | frontend/index.html:6272 |
| `wb-study-knew` | frontend/index.html:6990 |
| `wb-study-missed` | frontend/index.html:6991 |
| `wb-study-show` | frontend/index.html:6989 |
| `wb-svg-layer` | frontend/index.html:6258 |
| `wb-template-create` | frontend/index.html:1067 |
| `wb-template-dialog` | frontend/index.html:1043 |
| `wb-template-kind` | frontend/index.html:1055 |
| `wb-template-list` | frontend/index.html:1062 |
| `wb-template-name` | frontend/index.html:1060 |
| `wb-template-preview` | frontend/index.html:1063 |
| `wb-template-title` | frontend/index.html:1046 |
| `wb-tool-group` | frontend/index.html:6623 |
| `wb-tools-opener` | frontend/index.html:6962 |
| `wb-tools-opener-label` | frontend/index.html:6965 |
| `wb-tools-panel` | frontend/index.html:6622 |
| `wb-topbar` | frontend/index.html:6338 |
| `wb-undo` | frontend/index.html:6919 |
| `wb-view-map-section` | frontend/index.html:6500 |
| `wb-view-menu` | frontend/index.html:6453 |
| `wb-zoom-actual` | frontend/index.html:6532 |
| `wb-zoom-fit` | frontend/index.html:6997 |
| `wb-zoom-group` | frontend/index.html:6269 |
| `wb-zoom-in` | frontend/index.html:6998 |
| `wb-zoom-out` | frontend/index.html:6996 |
| `web-clip-bookmarklet` | frontend/index.html:12305 |
| `web-clip-box` | frontend/index.html:12279 |
| `web-clip-copy` | frontend/index.html:12307 |
| `web-clip-help` | frontend/index.html:12289 |
| `web-clip-status` | frontend/index.html:12309 |
| `web-engine-dot` | frontend/index.html:3273 |
| `web-panel` | frontend/index.html:3264 |
| `web-panel-close` | frontend/index.html:3278 |
| `web-panel-menu` | frontend/index.html:3277 |
| `web-panel-title` | frontend/index.html:3267 |
| `web-query` | frontend/index.html:3287 |
| `web-reader` | frontend/index.html:3300 |
| `web-reader-ask` | frontend/index.html:3319 |
| `web-reader-back` | frontend/index.html:3305 |
| `web-reader-bookmark` | frontend/index.html:3332 |
| `web-reader-cite` | frontend/index.html:3325 |
| `web-reader-copy` | frontend/index.html:3310 |
| `web-reader-find` | frontend/index.html:3308 |
| `web-reader-open` | frontend/index.html:3312 |
| `web-reader-save` | frontend/index.html:3327 |
| `web-reader-source` | frontend/index.html:3317 |
| `web-reader-text` | frontend/index.html:3335 |
| `web-reader-title` | frontend/index.html:3316 |
| `web-results` | frontend/index.html:3299 |
| `web-search-history` | frontend/index.html:3297 |
| `web-search-toggle` | frontend/index.html:3057 |
| `web-status` | frontend/index.html:3293 |
| `web-stop` | frontend/index.html:3290 |
| `websearch-help` | frontend/index.html:11560 |
| `whiteboard-container` | frontend/index.html:6256 |
| `writing-room` | frontend/index.html:1722 |
| `writing-room-heading` | frontend/index.html:1737 |
| `zoom-in` | frontend/index.html:10577 |
| `zoom-out` | frontend/index.html:10573 |
| `zoom-reset` | frontend/index.html:10580 |
| `zoom-slider` | frontend/index.html:10575 |
| `zoom-value` | frontend/index.html:10579 |

## CSS sections (490)

Banner comments (`/* ===` or `/* ---`) in `frontend/css/*.css`, sorted by title.

| Section | File:line |
|---|---|
| "Tools it can use": the row, measured against a normal one | frontend/css/03-dashboard-widgets.css:4601 |
| "how are these connected?" | frontend/css/02-chat-graph.css:4386 |
| 08-consistency.css - one recipe per repeated shape | frontend/css/08-consistency.css:1 |
| 1. One menu row | frontend/css/08-consistency.css:24 |
| 1. touch targets, one step, one block | frontend/css/07-whiteboard-misc.css:9562 |
| 2. A disclosure inside a card is a header, not a button | frontend/css/08-consistency.css:301 |
| 2. the safe area | frontend/css/07-whiteboard-misc.css:9601 |
| 3. A dock is one bar, and its controls belong to it | frontend/css/08-consistency.css:455 |
| 4. One gap between an icon and the label it leads | frontend/css/08-consistency.css:873 |
| 5. The Write-with-AI footers are one row, primary on the right | frontend/css/08-consistency.css:1191 |
| 6. One toggle-row recipe: the switch says on, not the row | frontend/css/08-consistency.css:811 |
| 7. Meta looks like meta | frontend/css/08-consistency.css:1006 |
| 8. A panel head is identity, one fact, then the actions, and it does not | frontend/css/08-consistency.css:2412 |
| A CALMER TOP, NOTHING TAKEN AWAY (Full view) | frontend/css/03-dashboard-widgets.css:4774 |
| A card's date is in the same corner on every card (INBOX 719) | frontend/css/08-consistency.css:10438 |
| A chip's x: a round target inset evenly (INBOX 403) | frontend/css/08-consistency.css:4762 |
| A dialog's head: title, its '?', icon-only actions, Close last | frontend/css/08-consistency.css:9078 |
| A diff of two versions of the same text (DOCUMENTS_PLAN Phase 5 items 2, 3) | frontend/css/09-editor.css:633 |
| A member of a group selection shows that it is selected, not how to | frontend/css/library-lazy.css:4150 |
| A note card's text leads; its metadata steps back (INBOX 505) | frontend/css/08-consistency.css:9942 |
| A note's buttons stay while its own menu is open (INBOX 679) | frontend/css/08-consistency.css:10322 |
| A note's time: the same corner on every card | frontend/css/08-consistency.css:8431 |
| A notification's two controls take no width of their own (INBOX 523) | frontend/css/06-timeline-dialogs.css:3455 |
| A rail row's ⋮ overlays the row; it never reserves a column (INBOX 722) | frontend/css/08-consistency.css:10497 |
| A row is a pointer target (INBOX 719) | frontend/css/08-consistency.css:10422 |
| AN INK DOT FOR A FINGER | frontend/css/02-chat-graph.css:1858 |
| Ask history: the personal-notes-browser panel (§ROADMAP item 6) | frontend/css/01-forms-settings.css:2734 |
| Atlas's life: loops while the mark is on screen and motion is on | frontend/css/08-consistency.css:8031 |
| Atlas, the app's guide (INBOX 224) | frontend/css/08-consistency.css:1788 |
| Atlas, the assistant's own character (atlas.js) | frontend/css/08-consistency.css:6623 |
| BOARD NAVIGATOR AND BOARD SEARCH | frontend/css/07-whiteboard-misc.css:6335 |
| BREADCRUMBS: WHERE THE CARET IS | frontend/css/05-sidebars-themes.css:5717 |
| Boards, 2026-10-10 (boardmap-1010): lazy with the board, off the boot | frontend/css/library-lazy.css:3339 |
| Capture: the add tools as a quiet toolbar (INBOX 395) | frontend/css/08-consistency.css:4572 |
| Capture: the two labelled rows under the note box | frontend/css/07-whiteboard-misc.css:2723 |
| Capture: three families, three rows | frontend/css/07-whiteboard-misc.css:4696 |
| Carbon: near-monochrome, minimal colour, maximum text contrast. | frontend/css/05-sidebars-themes.css:3244 |
| Chat sources: every card reads from the top | frontend/css/08-consistency.css:8398 |
| Chat: the user's bubble as a quiet surface, not an accent slab | frontend/css/08-consistency.css:4905 |
| Columns and image options (DOCUMENTS_PLAN Phase 3 item 5) | frontend/css/09-editor.css:408 |
| Curated palettes (Settings → Appearance → Theme) | frontend/css/05-sidebars-themes.css:3005 |
| Documents: focus mode | frontend/css/07-whiteboard-misc.css:6031 |
| Editorial paper: off-white paper, black type, one red-orange for what | frontend/css/05-sidebars-themes.css:3329 |
| Ember: warm oranges over a dim ground. Best in the evening. | frontend/css/05-sidebars-themes.css:3174 |
| Files as a reading list | frontend/css/library-lazy.css:1203 |
| Files sub-tab: rows, not cards | frontend/css/library-lazy.css:1230 |
| Find anything | frontend/css/07-whiteboard-misc.css:10669 |
| Find anything, de-vibecoded | frontend/css/08-consistency.css:3696 |
| Find anything: group heads read as heads | frontend/css/08-consistency.css:4866 |
| GLASS THAT DOES NOT COST WHAT IT USED TO | frontend/css/03-dashboard-widgets.css:795 |
| GRIPS AT A CONSTANT SIZE ON SCREEN | frontend/css/07-whiteboard-misc.css:10596 |
| Graph options: one section-head style | frontend/css/08-consistency.css:4457 |
| Help & guide: the topics box and the "Ask the guide" box are two | frontend/css/08-consistency.css:1784 |
| INBOX 68: the board and map previews | frontend/css/10-responsive.css:352 |
| Icons | frontend/css/07-whiteboard-misc.css:2286 |
| Inline AI (editor.js) | frontend/css/07-whiteboard-misc.css:6441 |
| Lagoon: indigo and teal together | frontend/css/05-sidebars-themes.css:3122 |
| Library -> Contents: an outline (INBOX 496) | frontend/css/01-forms-settings.css:2355 |
| Library Activity, one line per record (INBOX 426 z, images 89, 90) | frontend/css/08-consistency.css:9017 |
| Library → Documents | frontend/css/03-dashboard-widgets.css:4208 |
| Library → Whiteboards | frontend/css/03-dashboard-widgets.css:4233 |
| Live preview | frontend/css/04-chat-dock-appearance.css:4545 |
| MICRO-ANIMATIONS | frontend/css/07-whiteboard-misc.css:591 |
| Ocean: cool teal and deep blue. Crisp rather than cosy. | frontend/css/05-sidebars-themes.css:3087 |
| On paper (DOCUMENTS_PLAN Phase 5 item 4, the print stylesheet) | frontend/css/09-editor.css:1073 |
| On this day | frontend/css/03-dashboard-widgets.css:4551 |
| One sidebar row recipe for every rail (INBOX 702) | frontend/css/08-consistency.css:10392 |
| One ⋯ opener, styled once (INBOX 722) | frontend/css/08-consistency.css:10467 |
| PLAN.md D1: the documents dock's formatting strip hides entirely | frontend/css/07-whiteboard-misc.css:7887 |
| Parchment: paper, ink and a little gold. Made for long writing. | frontend/css/05-sidebars-themes.css:3014 |
| Phase 10, INBOX 100: the scroll edge effect | frontend/css/10-responsive.css:159 |
| Phase 10, INBOX 101: concentric corners | frontend/css/10-responsive.css:185 |
| Phase 11 item 12: a dock's head is one row on a phone | frontend/css/10-responsive.css:1531 |
| Phase 11 item 12: a note row designed for a thumb | frontend/css/10-responsive.css:1482 |
| Phase 11 item 12: one bar at the foot of a phone, not two | frontend/css/10-responsive.css:1190 |
| Phase 11 item 12: the status bar on a tablet is a touch bar | frontend/css/10-responsive.css:1118 |
| Phase 11 item 1: the phone top bar is three controls, not six | frontend/css/10-responsive.css:1072 |
| Phase 11 item 2: a row swiped, star right and bin left | frontend/css/10-responsive.css:1404 |
| Phase 11 item 2: the note page, the sheet recipe's `page` variant | frontend/css/10-responsive.css:1859 |
| Phase 11 item 3: the chat composer on a phone | frontend/css/10-responsive.css:1886 |
| Phase 11 item 4: the graph's controls are one sheet on a phone | frontend/css/10-responsive.css:1947 |
| Phase 11 item 5: the Library reader as the page | frontend/css/10-responsive.css:2093 |
| Phase 11 item 7: the whiteboard and the mind map on a phone | frontend/css/10-responsive.css:2007 |
| Phase 11 item 9: 44px targets, the ones the docks sweep cannot see | frontend/css/10-responsive.css:946 |
| Phase 11 item 9: no hover-only affordance | frontend/css/10-responsive.css:1937 |
| Phase 11 items 2 and 3: no rail on a phone, an opener in the head | frontend/css/10-responsive.css:1290 |
| Phase 5: quick access + toasts | frontend/css/01-forms-settings.css:2715 |
| Phase 5: the three things a map says about itself | frontend/css/07-whiteboard-misc.css:4342 |
| Phones (roadmap §8: the layout had breakpoints but had never been driven at | frontend/css/05-sidebars-themes.css:3675 |
| Placed at the end of this file on purpose. A panel keeps its original class | frontend/css/03-dashboard-widgets.css:4244 |
| Plum: deep violet and magenta. The most saturated. | frontend/css/05-sidebars-themes.css:3209 |
| Progress that keeps moving (INBOX 95) | frontend/css/08-consistency.css:2187 |
| Quick access, and arranging it (INBOX 461) | frontend/css/03-dashboard-widgets.css:2011 |
| Quiet utilitarian: the default look (UI_MODERNISATION_PLAN decisions, | frontend/css/05-sidebars-themes.css:3279 |
| RESPONSIVE BY DEVICE (UI_MODERNISATION_PLAN.md: Phase 9) | frontend/css/07-whiteboard-misc.css:9484 |
| RESPONSIVE, CONTINUED, AND THE LIQUID GLASS ADOPTIONS | frontend/css/10-responsive.css:1 |
| Reading and focus (DOCUMENTS_PLAN Phase 5 item 4, PLAN D9) | frontend/css/09-editor.css:787 |
| Reminders: the time at the row's end, actions over it on hover | frontend/css/08-consistency.css:4469 |
| Ring room (INBOX 685, "a lot of borders get cut off on an edge") | frontend/css/08-consistency.css:10131 |
| Rows: the default way a list of notes is shown | frontend/css/01-forms-settings.css:1370 |
| Rules that used to be inline style="" attributes. | frontend/css/06-timeline-dialogs.css:625 |
| SETTINGS: one control height, one right edge | frontend/css/01-forms-settings.css:4989 |
| SETTINGS: spacing, hierarchy and proximity | frontend/css/01-forms-settings.css:5134 |
| SIDEBAR COLLAPSE & PEEK | frontend/css/07-whiteboard-misc.css:411 |
| SKILLS TAB | frontend/css/07-whiteboard-misc.css:727 |
| Sage: quiet greens. The calmest of the set. | frontend/css/05-sidebars-themes.css:3052 |
| Sans-serif system font override (macOS fix) | frontend/css/00-tokens-shell.css:1207 |
| Settings at phone width: nothing scrolls sideways (Phase 5.1, 390px) | frontend/css/07-whiteboard-misc.css:7969 |
| Settings form rows share a label column (Phase 5.1) | frontend/css/07-whiteboard-misc.css:7774 |
| Settings headings sit at one left edge | frontend/css/08-consistency.css:1431 |
| Settings rows that wrap their actions under the title (INBOX 82) | frontend/css/08-consistency.css:2200 |
| Settings: a section's intro sits under its heading, not above it | frontend/css/08-consistency.css:4564 |
| TENSIONS: THE DISAGREEMENT REVIEW | frontend/css/06-timeline-dialogs.css:3357 |
| THE CHAT ON A PHONE, MEASURED | frontend/css/04-chat-dock-appearance.css:5535 |
| THE OCR WORKSPACE | frontend/css/07-whiteboard-misc.css:5267 |
| THE QUIET SIDE OF THE BUTTON RAMP: A RUN OF ROW ACTIONS | frontend/css/08-consistency.css:2291 |
| THE WRITE WITH AI ROW, ON A NARROW COLUMN | frontend/css/04-chat-dock-appearance.css:5582 |
| THE WRITING PHASE: nodes, and an edge drawing itself | frontend/css/01-forms-settings.css:4856 |
| Technical mono: a cool graphite ground, monospace for the numbers and | frontend/css/05-sidebars-themes.css:3367 |
| Templates (INBOX 715) | frontend/css/library-lazy.css:2571 |
| Text on accent-coloured surfaces (roadmap §7: colour contrast was listed as | frontend/css/05-sidebars-themes.css:3793 |
| The Ask tab's records speak in the Notes list's voice (INBOX 510) | frontend/css/08-consistency.css:9993 |
| The Library's hover tick says what it is (INBOX 722) | frontend/css/library-lazy.css:3312 |
| The OCR workspace tool row (INBOX 717). Here rather than in the boot | frontend/css/library-lazy.css:2842 |
| The chat header stays one line (INBOX 91) | frontend/css/08-consistency.css:2234 |
| The compact row: one line, one anchor, one chevron (INBOX 676) | frontend/css/08-consistency.css:10255 |
| The connection pill's menu button, concentric with the pill | frontend/css/08-consistency.css:8411 |
| The documents editor: layout around the engine (DOCUMENTS_PLAN Phase 2) | frontend/css/09-editor.css:1 |
| The five whiteboard menus (Insert, Edit, Arrange, View, Board) | frontend/css/08-consistency.css:1260 |
| The guide panel as one surface (INBOX 270 part 4, the redesign) | frontend/css/08-consistency.css:1924 |
| The last icon-to-label gap family | frontend/css/08-consistency.css:1593 |
| The last two head rows that were not on the bar recipe | frontend/css/08-consistency.css:1399 |
| The m guide: one panel of key rows | frontend/css/08-consistency.css:4629 |
| The note surface (DOCUMENTS_PLAN Phase 8): one editor everywhere | frontend/css/09-editor.css:967 |
| The properties panel (DOCUMENTS_PLAN Phase 3 item 4) | frontend/css/09-editor.css:190 |
| The second level: `.tabs-line` (INBOX 522) | frontend/css/05-sidebars-themes.css:3833 |
| The surface model pickers on a phone | frontend/css/10-responsive.css:2164 |
| The thumb bar (DESIGN.md's recipe index: a bar of actions above the | frontend/css/09-editor.css:906 |
| The two dialogs reported as off the modal recipe | frontend/css/08-consistency.css:1464 |
| The two rows that still wrapped at 1024 | frontend/css/08-consistency.css:1334 |
| The whiteboard top bar's controls | frontend/css/08-consistency.css:1612 |
| Timeline rows with a snippet: mark and time on the title's line | frontend/css/08-consistency.css:4433 |
| Timeline: the density strip (TIMELINE_PLAN.md Phase 3) | frontend/css/06-timeline-dialogs.css:300 |
| Timeline: the feed (TIMELINE_PLAN.md Phase 1) | frontend/css/06-timeline-dialogs.css:1 |
| Timeline: the table view (TIMELINE_PLAN.md Phase 2) | frontend/css/06-timeline-dialogs.css:346 |
| Trace mode on the graph (§41) | frontend/css/07-whiteboard-misc.css:1978 |
| Two floating buttons that sit over content: opaque, readable hover | frontend/css/08-consistency.css:4956 |
| WCAG 2.5.8 target size | frontend/css/06-timeline-dialogs.css:3168 |
| WHITEBOARD TAB | frontend/css/06-timeline-dialogs.css:2260 |
| Wave B: threads, inline actions, templates | frontend/css/02-chat-graph.css:383 |
| Wave E: graph view | frontend/css/02-chat-graph.css:901 |
| Wave F: command palette | frontend/css/02-chat-graph.css:1570 |
| Wave F: mobile / PWA responsive pass | frontend/css/02-chat-graph.css:2002 |
| Wave F: whiteboard-lite | frontend/css/02-chat-graph.css:1630 |
| Wave G: agentic tools + skills | frontend/css/02-chat-graph.css:468 |
| Wave H: voice + read-aloud | frontend/css/02-chat-graph.css:2036 |
| Wave I: skeletons, focus, reduced motion | frontend/css/02-chat-graph.css:2214 |
| Wave J: accent presets + appearance picker | frontend/css/02-chat-graph.css:2504 |
| Wave J: generative art + note tools + undo toast | frontend/css/02-chat-graph.css:2370 |
| Wave K: empty states, mobile tap targets, high-contrast | frontend/css/02-chat-graph.css:2733 |
| Wave L: skip link, action menus, contrast + type polish | frontend/css/02-chat-graph.css:2852 |
| Wave M: graph filters, thumbnails, lightbox, batch bar | frontend/css/02-chat-graph.css:3308 |
| Wave N: improve-writing, link suggestions, tasks | frontend/css/03-dashboard-widgets.css:1 |
| Wave O: AI Tools toggles | frontend/css/03-dashboard-widgets.css:967 |
| Wave O: brand logo + a more present background | frontend/css/03-dashboard-widgets.css:555 |
| Wave O: expanded appearance (theme/size/density/glass) | frontend/css/03-dashboard-widgets.css:618 |
| Whiteboard chrome, restructured: one top bar, a centred tool dock, a | frontend/css/07-whiteboard-misc.css:6735 |
| Writing pace | frontend/css/03-dashboard-widgets.css:4560 |
| [[wiki links]] | frontend/css/05-sidebars-themes.css:669 |
| `.seg-multi`'s word, and the width that decides it | frontend/css/10-responsive.css:542 |
| `.seg-multi`: one well, independent toggles | frontend/css/03-dashboard-widgets.css:682 |
| `.selectbar`: the bar stays with you while the selection does | frontend/css/00-tokens-shell.css:1866 |
| a Files row's facts line, one register (INBOX 421 f) | frontend/css/08-consistency.css:3985 |
| a board or a map as an object in a note (INBOX 309) | frontend/css/05-sidebars-themes.css:1372 |
| a callout that folds (REDESIGN.md §R7.3 item 3) | frontend/css/05-sidebars-themes.css:1091 |
| a card that opens does not inflate the six beside it | frontend/css/08-consistency.css:2534 |
| a chip lane scrolls without drawing a scrollbar | frontend/css/07-whiteboard-misc.css:3801 |
| a chosen radio option is outlined, not only tinted (INBOX 464) | frontend/css/08-consistency.css:9515 |
| a disclosure arrow that matches the app's own carets | frontend/css/07-whiteboard-misc.css:3820 |
| a disclosure is a control, so it answers the pointer | frontend/css/07-whiteboard-misc.css:3412 |
| a face drawn once (avatars.js, `nameMarkCompose`) | frontend/css/08-consistency.css:5145 |
| a file says what it is attached to | frontend/css/07-whiteboard-misc.css:4853 |
| a file tile shows what it has, not what it lacks | frontend/css/07-whiteboard-misc.css:3377 |
| a fold head's '?', beside its <summary> (INBOX 433) | frontend/css/08-consistency.css:3432 |
| a generated face that moves (the owner: "can they be animated as a | frontend/css/08-consistency.css:5000 |
| a help popover opens over the surface that asked for it (INBOX 205) | frontend/css/08-consistency.css:2581 |
| a label that lost its capitals keeps its rank | frontend/css/08-consistency.css:4405 |
| a list of rows reads as a list | frontend/css/07-whiteboard-misc.css:4277 |
| a map's levels and a solid fill (MINDMAP_PLAN §14, decisions 38, 39) | frontend/css/library-lazy.css:2479 |
| a menu is one column: rows, section labels and icons (INBOX 403) | frontend/css/08-consistency.css:8667 |
| a model per feature (Settings → Models) | frontend/css/01-forms-settings.css:5503 |
| a named item in a Settings list: title, label, facts | frontend/css/08-consistency.css:3481 |
| a narrow measure for prose, wide chrome around it | frontend/css/07-whiteboard-misc.css:4928 |
| a note's connections: one pill each, its menu inside it | frontend/css/08-consistency.css:3261 |
| a notice: one line the app says about what is on screen | frontend/css/08-consistency.css:2642 |
| a poke, a look, a large view and a companion (avatars.js) | frontend/css/08-consistency.css:5112 |
| a segmented choice inside a dialog | frontend/css/06-timeline-dialogs.css:1011 |
| a settings group that says what depends on what | frontend/css/07-whiteboard-misc.css:4297 |
| a settings row where nothing squashes anything else | frontend/css/07-whiteboard-misc.css:4047 |
| a sheet (DESIGN.md's recipe index, "A sheet") | frontend/css/10-responsive.css:769 |
| a sticker (MINDMAP_PLAN decision 44, INBOX 642) | frontend/css/library-lazy.css:2513 |
| a stored file that is no longer stored | frontend/css/02-chat-graph.css:4768 |
| a traced path (§9) | frontend/css/02-chat-graph.css:1240 |
| a turn that is still working says so, for as long as it is | frontend/css/03-dashboard-widgets.css:4315 |
| a zone that cannot shrink says so, instead of spilling | frontend/css/10-responsive.css:1022 |
| account & security | frontend/css/01-forms-settings.css:3304 |
| activity heatmap + tag cloud widgets | frontend/css/03-dashboard-widgets.css:2259 |
| activity log | frontend/css/01-forms-settings.css:2690 |
| activity, as a timeline rather than as cards | frontend/css/library-lazy.css:2302 |
| an embedded document, drawn as a card (INBOX 421 b) | frontend/css/05-sidebars-themes.css:5825 |
| and inside a small phone | frontend/css/05-sidebars-themes.css:5623 |
| appearance settings: grouped, scannable rows | frontend/css/04-chat-dock-appearance.css:1989 |
| assistant message layout | frontend/css/05-sidebars-themes.css:4119 |
| attaching notes to a chat message | frontend/css/04-chat-dock-appearance.css:2847 |
| back / forward through pages | frontend/css/00-tokens-shell.css:4051 |
| back-to-top button | frontend/css/04-chat-dock-appearance.css:2666 |
| band 2 (820 to 1200): the tabs keep their names, set small | frontend/css/10-responsive.css:61 |
| band 2: 820-1100, iPad landscape and small laptops | frontend/css/07-whiteboard-misc.css:9658 |
| band 3 (600 to 820): the tab strip fits on its own row | frontend/css/10-responsive.css:20 |
| band 3: 600-820, iPad portrait, and the sheet that band 4 inherits | frontend/css/07-whiteboard-misc.css:9745 |
| band 4 (under 600): the editor's own targets (DOCUMENTS_PLAN Phase 6) | frontend/css/10-responsive.css:456 |
| band 4: an icon-only chip is still a target (Phase 11) | frontend/css/10-responsive.css:506 |
| band 4: below 600, the phone | frontend/css/07-whiteboard-misc.css:9928 |
| band 4: five columns, and the fifth is a sheet | frontend/css/10-responsive.css:592 |
| band 4: the settings sheet's head may wrap, but not be squashed | frontend/css/10-responsive.css:897 |
| boot splash | frontend/css/00-tokens-shell.css:4073 |
| callouts ("specialised boxes and frames") | frontend/css/05-sidebars-themes.css:1016 |
| category rename / delete | frontend/css/04-chat-dock-appearance.css:2735 |
| chat dock density pass (§37C) | frontend/css/04-chat-dock-appearance.css:1312 |
| chat page layout | frontend/css/04-chat-dock-appearance.css:540 |
| chat panel: answer and raw records side by side | frontend/css/01-forms-settings.css:997 |
| chat polish | frontend/css/03-dashboard-widgets.css:3446 |
| chat tab (Wave C) | frontend/css/02-chat-graph.css:1 |
| chat, de-vibecoded | frontend/css/08-consistency.css:3085 |
| chat: an organised sidebar, readable code, correctable answers | frontend/css/05-sidebars-themes.css:2224 |
| choice controls, the owner's 2026-09-24 pass (INBOX 409, 411) | frontend/css/08-consistency.css:8592 |
| column-flex cards keep their full width | frontend/css/07-whiteboard-misc.css:3622 |
| compressing a long conversation (§35I) | frontend/css/02-chat-graph.css:787 |
| curated themes | frontend/css/01-forms-settings.css:3340 |
| dark glass reads flatter, and here is which half of it does | frontend/css/10-responsive.css:296 |
| dashboard + reminders (Wave D) | frontend/css/01-forms-settings.css:3525 |
| dashboard quick links | frontend/css/03-dashboard-widgets.css:1799 |
| dashboard widgets, de-vibecoded | frontend/css/08-consistency.css:4236 |
| document formatting toolbar | frontend/css/05-sidebars-themes.css:1698 |
| documents tab | frontend/css/04-chat-dock-appearance.css:3632 |
| documents: outline, live stats, and where the file actually is | frontend/css/05-sidebars-themes.css:2570 |
| documents: the comments panel (DOCUMENTS_PLAN Phase 5 item 1) | frontend/css/05-sidebars-themes.css:2866 |
| drag to delete (INBOX 660) | frontend/css/library-lazy.css:2536 |
| duplicate tidy-up | frontend/css/05-sidebars-themes.css:1444 |
| editing a question in place | frontend/css/05-sidebars-themes.css:241 |
| empty states that sit where they should | frontend/css/08-consistency.css:4333 |
| entry actions + links (Phase 4) | frontend/css/01-forms-settings.css:2054 |
| entry lists | frontend/css/01-forms-settings.css:1329 |
| every control in a dock takes the touch floor | frontend/css/07-whiteboard-misc.css:10373 |
| every menu scrolls down, never sideways, and never runs off the page | frontend/css/07-whiteboard-misc.css:7690 |
| fields answer the pointer too | frontend/css/07-whiteboard-misc.css:3540 |
| filter help (the list inside `#search-help-hint`, a `.help-body`) | frontend/css/05-sidebars-themes.css:567 |
| finding a setting (§36B) | frontend/css/06-timeline-dialogs.css:1358 |
| finding your way about inside Settings (INBOX 444) | frontend/css/01-forms-settings.css:5605 |
| first-run onboarding tour | frontend/css/04-chat-dock-appearance.css:2329 |
| forms | frontend/css/01-forms-settings.css:220 |
| glass reaches the floating chrome that sat outside it | frontend/css/08-consistency.css:2688 |
| glass restraint (UI_MODERNISATION_PLAN.md, Phase 3) | frontend/css/07-whiteboard-misc.css:7760 |
| graph minimap | frontend/css/02-chat-graph.css:4236 |
| graph polish | frontend/css/03-dashboard-widgets.css:3666 |
| graph: depth, halos and legible labels | frontend/css/04-chat-dock-appearance.css:1547 |
| graph: physics sliders + node popup | frontend/css/04-chat-dock-appearance.css:1589 |
| heading hierarchy (§35L) | frontend/css/01-forms-settings.css:1 |
| held space pans, from any tool | frontend/css/07-whiteboard-misc.css:4776 |
| help guide accordion | frontend/css/04-chat-dock-appearance.css:2388 |
| help mini AI chat (item 40's second half) | frontend/css/04-chat-dock-appearance.css:2420 |
| hovering a node | frontend/css/02-chat-graph.css:1386 |
| icon-only buttons are square, everywhere | frontend/css/07-whiteboard-misc.css:3336 |
| left-aligned button lists stay left-aligned | frontend/css/07-whiteboard-misc.css:3596 |
| line numbers for any textarea (UI_MODERNISATION_PLAN Phase 7.2) | frontend/css/07-whiteboard-misc.css:7900 |
| live clock (reminders tab) | frontend/css/01-forms-settings.css:3526 |
| lock screen (Phase 4) | frontend/css/01-forms-settings.css:1958 |
| map nodes and their edges (MINDMAP_PLAN.md §5, Phase 2) | frontend/css/07-whiteboard-misc.css:8011 |
| markdown tables | frontend/css/04-chat-dock-appearance.css:1927 |
| meeting notes (§17) | frontend/css/02-chat-graph.css:2109 |
| model cards: the Models screen's suggested downloads (INBOX 444) | frontend/css/01-forms-settings.css:5743 |
| more than one route between the same two notes | frontend/css/02-chat-graph.css:1255 |
| motion: a heavy page's first visit (INBOX 580) | frontend/css/08-consistency.css:9788 |
| motion: a hover eases (2026-10-05) | frontend/css/08-consistency.css:9682 |
| motion: a list settles in where its skeleton was (2026-10-05) | frontend/css/08-consistency.css:9662 |
| motion: a menu or popover grows from what opened it (INBOX 103, 2026-10-05) | frontend/css/10-responsive.css:230 |
| motion: a page arrives (INBOX 459 (2), 580) | frontend/css/08-consistency.css:9761 |
| motion: a popup arrives, and leaves the way it came (INBOX 580, 2026-10-05) | frontend/css/08-consistency.css:9836 |
| motion: a sidebar's contents arrive from its edge (INBOX 459 (2)) | frontend/css/08-consistency.css:9692 |
| motion: one sliding indicator for every strip (INBOX 459 (2), 2026-10-05) | frontend/css/08-consistency.css:9550 |
| motion: the opening curtain lifts (INBOX 577) | frontend/css/08-consistency.css:9876 |
| moved from 07-whiteboard-misc.css (canvasui, the boot CSS budget): board-only rules whose class names no boot file draws and no later boot rule competes with, in their old order | frontend/css/library-lazy.css:3986 |
| moved from the boot sheets (the boot CSS budget, test_boot_budget.py): rules only the Library | frontend/css/library-lazy.css:16 |
| note card density (§36B) | frontend/css/06-timeline-dialogs.css:1539 |
| note history | frontend/css/05-sidebars-themes.css:1494 |
| notes page polish | frontend/css/03-dashboard-widgets.css:2442 |
| nothing interactive is bare text | frontend/css/07-whiteboard-misc.css:3875 |
| notifications | frontend/css/08-consistency.css:3719 |
| numbered citations inside an answer | frontend/css/02-chat-graph.css:4447 |
| one control height per Library header row | frontend/css/07-whiteboard-misc.css:5228 |
| one gap under every card heading | frontend/css/01-forms-settings.css:4743 |
| one line of facts: a note's meta row | frontend/css/08-consistency.css:2720 |
| one popup, three tiers (INBOX 456, DESIGN.md "A popup window or panel") | frontend/css/08-consistency.css:9226 |
| one size for every dropdown | frontend/css/01-forms-settings.css:4706 |
| one switch, everywhere a checkbox means "on or off" | frontend/css/06-timeline-dialogs.css:2050 |
| one ⋯ button, everywhere (INBOX 722) | frontend/css/00-tokens-shell.css:4230 |
| optional extras (Settings) | frontend/css/00-tokens-shell.css:1625 |
| page margins (Appearance > Page Margins) | frontend/css/07-whiteboard-misc.css:2638 |
| previews on the Library's document and board cards | frontend/css/library-lazy.css:648 |
| radio groups as choices, not as a list of dots (§35L) | frontend/css/06-timeline-dialogs.css:1227 |
| reading a scan against its own pages | frontend/css/02-chat-graph.css:3492 |
| rebindable shortcuts | frontend/css/05-sidebars-themes.css:621 |
| reminders page polish | frontend/css/03-dashboard-widgets.css:3060 |
| reminders, de-vibecoded | frontend/css/08-consistency.css:3151 |
| reminders: "when" is one decision, so it is one group | frontend/css/07-whiteboard-misc.css:3556 |
| reminders: month-grid view (ROADMAP.md gap 4) | frontend/css/01-forms-settings.css:3895 |
| resizable sidebars | frontend/css/05-sidebars-themes.css:1525 |
| results: the list-row recipe | frontend/css/03-dashboard-widgets.css:1470 |
| rich markdown blocks (tables, quotes, rules, task lists) | frontend/css/01-forms-settings.css:1163 |
| rows instead of cards | frontend/css/00-tokens-shell.css:2252 |
| rules recovered from inline style attributes (audit of §40) | frontend/css/07-whiteboard-misc.css:1003 |
| saved filters | frontend/css/05-sidebars-themes.css:580 |
| screen-reader-only announcements | frontend/css/04-chat-dock-appearance.css:2719 |
| scrollbars | frontend/css/07-whiteboard-misc.css:3490 |
| search match highlighting | frontend/css/05-sidebars-themes.css:277 |
| settings / model manager | frontend/css/01-forms-settings.css:1914 |
| settings modal + logs (Wave A) | frontend/css/01-forms-settings.css:3123 |
| settings rows: one shape at rest | frontend/css/01-forms-settings.css:4513 |
| settings, de-vibecoded | frontend/css/08-consistency.css:3166 |
| settings: one column for every "?", and a pane title that is a title | frontend/css/08-consistency.css:3366 |
| sidebar | frontend/css/01-forms-settings.css:108 |
| sidebar heading rows | frontend/css/05-sidebars-themes.css:1 |
| space dialogs | frontend/css/07-whiteboard-misc.css:2518 |
| space switcher (top bar) | frontend/css/07-whiteboard-misc.css:2347 |
| spacious density (third option alongside comfortable/compact) | frontend/css/04-chat-dock-appearance.css:1987 |
| tab navigation (Wave A; pill style inside the top bar in Wave L) | frontend/css/00-tokens-shell.css:3472 |
| text inputs (§36B) | frontend/css/01-forms-settings.css:221 |
| the "/" menu and block frames | frontend/css/05-sidebars-themes.css:741 |
| the "?" head row and its help body | frontend/css/01-forms-settings.css:5265 |
| the 464 round: Settings groups, switch rows, the phone's chrome | frontend/css/08-consistency.css:9886 |
| the AI skills dock: one row where it fits (INBOX 450, 599) | frontend/css/08-consistency.css:9474 |
| the AI status dot | frontend/css/00-tokens-shell.css:1489 |
| the Ask box explaining itself (§35A) | frontend/css/06-timeline-dialogs.css:1206 |
| the Ask box reads as one composer | frontend/css/07-whiteboard-misc.css:2994 |
| the Connections dialog (REDESIGN.md §R7.3) | frontend/css/07-whiteboard-misc.css:5044 |
| the Dashboard's dock on a phone (INBOX 436) | frontend/css/10-responsive.css:2422 |
| the Documents editor on a phone (INBOX 430) | frontend/css/10-responsive.css:2223 |
| the Documents editor on a small laptop (INBOX 430's re-scope) | frontend/css/10-responsive.css:2348 |
| the Graph dock's second row, and the nine pixels that cause it | frontend/css/08-consistency.css:2343 |
| the HUD: a momentary readout, not a notification | frontend/css/07-whiteboard-misc.css:7546 |
| the Library (§4, §36F) | frontend/css/00-tokens-shell.css:1773 |
| the Library on a phone (BACKLOG §116.1 item 3) | frontend/css/07-whiteboard-misc.css:9094 |
| the Library tab's floating action is not the whiteboard's | frontend/css/07-whiteboard-misc.css:10573 |
| the Library's Activity rows (library.js, `library-${item.kind}`) | frontend/css/library-lazy.css:2298 |
| the Library, de-vibecoded (the owner: "devibecode all the ui") | frontend/css/08-consistency.css:2930 |
| the Library, second pass: cards in reading order, one anatomy | frontend/css/08-consistency.css:3773 |
| the OCR rail's own switch | frontend/css/07-whiteboard-misc.css:6535 |
| the Skills dropdown | frontend/css/04-chat-dock-appearance.css:1172 |
| the Sources panel | frontend/css/02-chat-graph.css:4948 |
| the accessible card: the title opens it (INBOX 433) | frontend/css/08-consistency.css:2990 |
| the agent activity panel: nothing scrolls sideways, nothing folds onto | frontend/css/07-whiteboard-misc.css:10421 |
| the agent's run, as a timeline | frontend/css/02-chat-graph.css:577 |
| the app emblem, reused across the UI | frontend/css/03-dashboard-widgets.css:3296 |
| the app's one help popover | frontend/css/03-dashboard-widgets.css:4253 |
| the app's own dropdown | frontend/css/07-whiteboard-misc.css:3649 |
| the arrange zone, once it is inside the overflow menu | frontend/css/07-whiteboard-misc.css:9676 |
| the assistant's head and its three verbs (the owner, 2026-09-24: | frontend/css/04-chat-dock-appearance.css:4801 |
| the assistant's three verbs (INBOX 192) | frontend/css/09-editor.css:845 |
| the attachment card (INBOX 440 (2), DESIGN.md "A file attached to a | frontend/css/05-sidebars-themes.css:340 |
| the bar's three zones | frontend/css/00-tokens-shell.css:3218 |
| the block bar (INBOX 421 b) | frontend/css/09-editor.css:1225 |
| the board panel, sorted into the questions it answers | frontend/css/07-whiteboard-misc.css:4825 |
| the board's bar takes the floor of the whole touch band, not just 600 | frontend/css/10-responsive.css:2073 |
| the boot splash: one progress indicator, not two | frontend/css/08-consistency.css:4320 |
| the bottom docks | frontend/css/07-whiteboard-misc.css:9628 |
| the chat dock follows its own width (INBOX 694) | frontend/css/10-responsive.css:2504 |
| the chat page fills its height (§36A) | frontend/css/06-timeline-dialogs.css:1314 |
| the chat sidebar on a phone | frontend/css/02-chat-graph.css:5462 |
| the chat toolbar, grouped (§36B) | frontend/css/06-timeline-dialogs.css:1433 |
| the citation peek (INBOX 80) | frontend/css/02-chat-graph.css:4509 |
| the code editor: gutter + monospace | frontend/css/04-chat-dock-appearance.css:4396 |
| the code panel, one compact header and a padded body (the owner, | frontend/css/library-lazy.css:3919 |
| the composer dock (asked for directly) | frontend/css/04-chat-dock-appearance.css:936 |
| the composer, as one surface | frontend/css/04-chat-dock-appearance.css:5170 |
| the connections rail (WORLD_CLASS_PLAN D2; `renderNotesRail`) | frontend/css/04-chat-dock-appearance.css:321 |
| the context bar (WHITEBOARD_PLAN.md Phase 2, decision 2) | frontend/css/07-whiteboard-misc.css:7034 |
| the dashboard and the labels, de-vibecoded | frontend/css/08-consistency.css:3045 |
| the dashboard's greeting banner, on a phone | frontend/css/07-whiteboard-misc.css:10316 |
| the dashboard's quick actions stop wrapping | frontend/css/07-whiteboard-misc.css:10271 |
| the dashboard's three densities | frontend/css/07-whiteboard-misc.css:11012 |
| the day-one dashboard | frontend/css/05-sidebars-themes.css:3576 |
| the desk's own rows (WORLD_CLASS_PLAN D16) | frontend/css/04-chat-dock-appearance.css:3477 |
| the dock (UI_MODERNISATION_PLAN.md Phase 8) | frontend/css/07-whiteboard-misc.css:9142 |
| the dock above the editor | frontend/css/04-chat-dock-appearance.css:4063 |
| the dock row below 1100 | frontend/css/07-whiteboard-misc.css:9727 |
| the document editor's instruments | frontend/css/05-sidebars-themes.css:4353 |
| the document history, side by side (DOCUMENTS 24 row 4, Brief 76) | frontend/css/library-lazy.css:3746 |
| the document toolbar's two folds | frontend/css/07-whiteboard-misc.css:5151 |
| the documents editor | frontend/css/library-lazy.css:2389 |
| the documents sidebar's vertical budget (§41) | frontend/css/07-whiteboard-misc.css:2104 |
| the documents sidebar, redrawn as one tree (the owner, 2026-10-10: | frontend/css/library-lazy.css:3793 |
| the export dialog (WHITEBOARD_PLAN.md Phase 3, decision 4) | frontend/css/06-timeline-dialogs.css:2528 |
| the faded notes card (WORLD_CLASS_PLAN 15, I4) | frontend/css/03-dashboard-widgets.css:4710 |
| the field: the glyph inside, Stop only while something is loading | frontend/css/03-dashboard-widgets.css:1332 |
| the file picker, in the app's own clothes | frontend/css/08-consistency.css:8898 |
| the flat looks carry no glow on a button | frontend/css/08-consistency.css:3685 |
| the flat looks: a selected tab is a place, not an action | frontend/css/08-consistency.css:2912 |
| the formatting strip says what the caret is already in | frontend/css/09-editor.css:1204 |
| the glass card | frontend/css/00-tokens-shell.css:3744 |
| the graph node panel becomes a sheet (GRAPH_PLAN Phase 6) | frontend/css/07-whiteboard-misc.css:9948 |
| the graph's floating controls clear its New note (INBOX 430) | frontend/css/10-responsive.css:2209 |
| the graph's legend: one container, not a pill in a box | frontend/css/08-consistency.css:3122 |
| the graph's options panel | frontend/css/08-consistency.css:3325 |
| the guided tour (DESIGN.md, "A guided tour step") | frontend/css/04-chat-dock-appearance.css:5640 |
| the head: identity, one fact as a dot, an all-icon group | frontend/css/03-dashboard-widgets.css:1272 |
| the help popover is a popover, not a page (INBOX 206) | frontend/css/08-consistency.css:2558 |
| the in-app confirm dialog (§35F) | frontend/css/06-timeline-dialogs.css:1101 |
| the lightbox on a phone (INBOX 430) | frontend/css/10-responsive.css:2194 |
| the live action line | frontend/css/02-chat-graph.css:4799 |
| the lock screen | frontend/css/08-consistency.css:3755 |
| the log console (§1) | frontend/css/06-timeline-dialogs.css:721 |
| the map is the tab, and its controls float over it | frontend/css/02-chat-graph.css:5486 |
| the mind map's outline and markers (MINDMAP_PLAN decisions 33, 34) | frontend/css/library-lazy.css:2071 |
| the node edit strip (MINDMAP_PLAN.md §12.1 item 2) | frontend/css/07-whiteboard-misc.css:8460 |
| the node radial (MINDMAP_PLAN.md §12.1 item 3) | frontend/css/07-whiteboard-misc.css:8711 |
| the note card's metadata, ordered (§36B) | frontend/css/06-timeline-dialogs.css:1477 |
| the notifications centre (§36E) | frontend/css/06-timeline-dialogs.css:1636 |
| the one control in a dock that was not the dock's height | frontend/css/10-responsive.css:337 |
| the one generating animation | frontend/css/01-forms-settings.css:4646 |
| the one map chip (MINDMAP_PLAN.md §5 item 12) | frontend/css/05-sidebars-themes.css:690 |
| the one popover shell (UI_MODERNISATION_PLAN.md, Phase 2) | frontend/css/07-whiteboard-misc.css:7721 |
| the orphan-row pattern, everywhere else it appears (§36B) | frontend/css/06-timeline-dialogs.css:1618 |
| the overview strip | frontend/css/00-tokens-shell.css:1835 |
| the page scrollers scroll on the compositor | frontend/css/08-consistency.css:4351 |
| the page shell (§35L) | frontend/css/00-tokens-shell.css:3561 |
| the palette on a touch screen (INBOX 464) | frontend/css/10-responsive.css:2490 |
| the phone header fits inside the phone | frontend/css/05-sidebars-themes.css:5592 |
| the picker itself | frontend/css/05-sidebars-themes.css:3460 |
| the primary action floats, where a dock has one | frontend/css/07-whiteboard-misc.css:10165 |
| the quick-nav chord's guide | frontend/css/10-responsive.css:418 |
| the reader: one scroller, the page set as prose | frontend/css/03-dashboard-widgets.css:1621 |
| the reply head on Ask's answer, the draft and the guide (INBOX 471) | frontend/css/08-consistency.css:9530 |
| the rich picker (rich-picker.js; DESIGN.md's recipe index) | frontend/css/05-sidebars-themes.css:778 |
| the run list (AGENT_SKILLS_REFORM.md, Phase C) | frontend/css/07-whiteboard-misc.css:1383 |
| the scroll container (§36A) | frontend/css/00-tokens-shell.css:1101 |
| the selection tick in Rows (INBOX 426 z, image 91) | frontend/css/08-consistency.css:9039 |
| the selection tick, in the app's own language | frontend/css/07-whiteboard-misc.css:4163 |
| the settings jump list | frontend/css/07-whiteboard-misc.css:10335 |
| the settings sheet takes the touch floor | frontend/css/01-forms-settings.css:5398 |
| the sketch pad's tool palette | frontend/css/02-chat-graph.css:1689 |
| the spine | frontend/css/00-tokens-shell.css:2202 |
| the spine on the other edge (MINDMAP_PLAN.md §13e) | frontend/css/07-whiteboard-misc.css:8263 |
| the status bar (§36D) | frontend/css/00-tokens-shell.css:3136 |
| the status bar from 820 to 959: one item fewer | frontend/css/10-responsive.css:1148 |
| the status bar on a small phone | frontend/css/00-tokens-shell.css:3445 |
| the status line and the recent searches | frontend/css/03-dashboard-widgets.css:1401 |
| the step group (Perplexity's "Finished N steps") | frontend/css/02-chat-graph.css:4872 |
| the strip's three doors (MINDMAP_PLAN.md §13b) | frontend/css/07-whiteboard-misc.css:8555 |
| the strips that appear only when they apply | frontend/css/00-tokens-shell.css:1850 |
| the structural blocks (INBOX 421 b) | frontend/css/05-sidebars-themes.css:1200 |
| the suggestion menu, the dictionary, and the goal | frontend/css/05-sidebars-themes.css:4868 |
| the switch's hit target (MODERNISATION_AUDIT.md Brief 8) | frontend/css/07-whiteboard-misc.css:7866 |
| the tab strip is centred on the window, not on whatever is left of it | frontend/css/07-whiteboard-misc.css:7589 |
| the timeline, de-vibecoded | frontend/css/08-consistency.css:3134 |
| the tool rail (WHITEBOARD_PLAN.md Phase 1, decision 1) | frontend/css/07-whiteboard-misc.css:10491 |
| the tools panel, sorted into what each group of icons does | frontend/css/06-timeline-dialogs.css:2683 |
| the touch floor, for the two surfaces the dock rule cannot reach | frontend/css/03-dashboard-widgets.css:4674 |
| the trace strip | frontend/css/04-chat-dock-appearance.css:1 |
| the two radio-backed segmented bars | frontend/css/03-dashboard-widgets.css:3747 |
| the two whiteboard controls that never joined the strip | frontend/css/07-whiteboard-misc.css:3254 |
| the web-search engine picker | frontend/css/04-chat-dock-appearance.css:2549 |
| the whiteboard top bar and the documents editor join the families | frontend/css/07-whiteboard-misc.css:7794 |
| the whiteboard's panels are one surface each | frontend/css/07-whiteboard-misc.css:3453 |
| the whiteboard's tools become a bottom strip | frontend/css/07-whiteboard-misc.css:10231 |
| the writing room | frontend/css/04-chat-dock-appearance.css:3330 |
| tools & features browser | frontend/css/03-dashboard-widgets.css:2187 |
| top bar polish | frontend/css/05-sidebars-themes.css:4074 |
| transcluded notes (![[note]]) | frontend/css/05-sidebars-themes.css:1345 |
| two-up cards in tablet portrait | frontend/css/07-whiteboard-misc.css:9889 |
| user-tunable corner rounding | frontend/css/04-chat-dock-appearance.css:1956 |
| web panel (search + reader) | frontend/css/03-dashboard-widgets.css:1237 |
| what a wide screen is for | frontend/css/00-tokens-shell.css:3571 |
| what it learned (WORLD_CLASS_PLAN I9) | frontend/css/01-forms-settings.css:5456 |
| what the AI remembers (ROADMAP §39B) | frontend/css/07-whiteboard-misc.css:1907 |
| what the agent found, as things you can open | frontend/css/07-whiteboard-misc.css:5187 |
| what the answering model is | frontend/css/02-chat-graph.css:5295 |
| what the phone block assumed, and the sheet undoes | frontend/css/07-whiteboard-misc.css:9902 |
| whiteboard fixes (§41) | frontend/css/07-whiteboard-misc.css:2034 |
| whiteboard objects: images and text boxes, neither tied to a note | frontend/css/07-whiteboard-misc.css:1 |
| widget picker modal (roadmap §26) | frontend/css/07-whiteboard-misc.css:3136 |

### Lines per stylesheet

| File | Lines |
|---|---|
| frontend/css/00-tokens-shell.css | 4260 |
| frontend/css/01-forms-settings.css | 5984 |
| frontend/css/02-chat-graph.css | 5872 |
| frontend/css/03-dashboard-widgets.css | 5132 |
| frontend/css/04-chat-dock-appearance.css | 6433 |
| frontend/css/05-sidebars-themes.css | 5932 |
| frontend/css/06-timeline-dialogs.css | 3706 |
| frontend/css/07-whiteboard-misc.css | 11869 |
| frontend/css/08-consistency.css | 10538 |
| frontend/css/09-editor.css | 1375 |
| frontend/css/10-responsive.css | 2611 |
| frontend/css/ask-compose-lazy.css | 33 |
| frontend/css/atlas-lazy.css | 52 |
| frontend/css/captions-lazy.css | 78 |
| frontend/css/graph-lazy.css | 119 |
| frontend/css/help-chat-lazy.css | 32 |
| frontend/css/icon-picker.css | 100 |
| frontend/css/library-lazy.css | 4512 |
| frontend/css/meetings-lazy.css | 119 |
| frontend/css/nav-history-lazy.css | 89 |
| frontend/css/questions-lazy.css | 84 |
| frontend/css/quickadd-lazy.css | 35 |
| frontend/css/recovery-lazy.css | 115 |
| frontend/css/reveal-lazy.css | 10 |
| frontend/css/search-lazy.css | 85 |
| frontend/css/tidy-lazy.css | 330 |
| frontend/css/usage-lazy.css | 34 |
| frontend/css/utilities-lazy.css | 116 |

## Backend routes (534)

`@router.<method>(` and `@app.<method>(` decorators in `src/memorymap/api/*.py`, sorted by path. The line is the decorator's.

| Path | Method | Function | File:line |
|---|---|---|---|
|  | DELETE | `clear` | src/memorymap/api/routes_usage.py:40 |
|  | DELETE | `clear_ask_history` | src/memorymap/api/routes_ask_history.py:181 |
|  | DELETE | `forget_everything` | src/memorymap/api/routes_learned.py:212 |
|  | GET | `list_ask_history` | src/memorymap/api/routes_ask_history.py:47 |
|  | GET | `list_bookmarks` | src/memorymap/api/routes_bookmarks.py:116 |
|  | GET | `list_categories` | src/memorymap/api/routes_categories.py:149 |
|  | GET | `list_conversations` | src/memorymap/api/routes_conversations.py:286 |
|  | GET | `list_documents` | src/memorymap/api/routes_documents.py:342 |
|  | GET | `list_duplicates` | src/memorymap/api/routes_duplicates.py:78 |
|  | GET | `list_entities` | src/memorymap/api/routes_entities.py:68 |
|  | GET | `list_entries` | src/memorymap/api/routes_entries.py:2223 |
|  | GET | `list_facts` | src/memorymap/api/routes_learned.py:132 |
|  | GET | `list_questions` | src/memorymap/api/routes_questions.py:26 |
|  | GET | `list_reminders` | src/memorymap/api/routes_reminders.py:364 |
|  | GET | `list_tags` | src/memorymap/api/routes_tags.py:40 |
|  | GET | `list_types` | src/memorymap/api/routes_relations.py:65 |
|  | GET | `search` | src/memorymap/api/routes_search.py:59 |
|  | GET | `state` | src/memorymap/api/routes_bench.py:233 |
|  | GET | `suggestions` | src/memorymap/api/routes_inbox.py:124 |
|  | GET | `tidy_summary` | src/memorymap/api/routes_tidy.py:50 |
|  | GET | `timeline` | src/memorymap/api/routes_timeline.py:375 |
|  | GET | `today` | src/memorymap/api/routes_resurface.py:96 |
|  | POST | `chat` | src/memorymap/api/routes_chat.py:1547 |
|  | POST | `count` | src/memorymap/api/routes_usage.py:30 |
|  | POST | `create_bookmark` | src/memorymap/api/routes_bookmarks.py:143 |
|  | POST | `create_category` | src/memorymap/api/routes_categories.py:161 |
|  | POST | `create_conversation` | src/memorymap/api/routes_conversations.py:416 |
|  | POST | `create_document` | src/memorymap/api/routes_documents.py:470 |
|  | POST | `create_entry` | src/memorymap/api/routes_entries.py:701 |
|  | POST | `create_reminder` | src/memorymap/api/routes_reminders.py:409 |
|  | POST | `create_type` | src/memorymap/api/routes_relations.py:76 |
|  | POST | `start` | src/memorymap/api/routes_bench.py:193 |
| `/` | GET | `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:867 |
| `/account` | GET | `account` | src/memorymap/api/routes_auth.py:956 |
| `/activity` | GET | `list_activity` | src/memorymap/api/routes_tasks.py:814 |
| `/activity/{job_id:path}/stop` | POST | `stop_activity` | src/memorymap/api/routes_tasks.py:823 |
| `/all` | GET | `ranked` | src/memorymap/api/routes_resurface.py:119 |
| `/apply` | POST | `apply_update` | src/memorymap/api/routes_update.py:658 |
| `/apply/status` | GET | `apply_status` | src/memorymap/api/routes_update.py:752 |
| `/ask` | POST | `ask` | src/memorymap/api/routes_help.py:59 |
| `/ask/stream` | POST | `ask_stream` | src/memorymap/api/routes_help.py:71 |
| `/audit` | DELETE | `clear_audit_log` | src/memorymap/api/routes_settings.py:1714 |
| `/audit` | GET | `audit_log` | src/memorymap/api/routes_settings.py:1438 |
| `/audit/export.csv` | GET | `audit_export_csv` | src/memorymap/api/routes_settings.py:1529 |
| `/auto` | PUT | `tidy_auto` | src/memorymap/api/routes_tidy.py:60 |
| `/auto-session` | POST | `auto_session` | src/memorymap/api/routes_auth.py:693 |
| `/backups` | GET | `list_backups` | src/memorymap/api/routes_backups.py:105 |
| `/backups` | POST | `backup_now` | src/memorymap/api/routes_backups.py:114 |
| `/backups/bundle` | POST | `export_bundle` | src/memorymap/api/routes_backups.py:213 |
| `/backups/bundle/restore` | POST | `restore_bundle` | src/memorymap/api/routes_backups.py:254 |
| `/backups/integrity` | GET | `integrity_at_start` | src/memorymap/api/routes_backups.py:93 |
| `/backups/restore` | POST | `restore_backup` | src/memorymap/api/routes_backups.py:154 |
| `/backups/retention` | PUT | `set_retention` | src/memorymap/api/routes_backups.py:136 |
| `/backups/{name}` | DELETE | `delete_backup` | src/memorymap/api/routes_backups.py:185 |
| `/board-library` | GET | `list_library` | src/memorymap/api/routes_board_library.py:406 |
| `/board-library` | POST | `create_library_item` | src/memorymap/api/routes_board_library.py:496 |
| `/board-library/export` | GET | `export_library` | src/memorymap/api/routes_board_library.py:645 |
| `/board-library/import` | POST | `import_library` | src/memorymap/api/routes_board_library.py:674 |
| `/board-library/libraries` | POST | `create_library` | src/memorymap/api/routes_board_library.py:611 |
| `/board-library/libraries/{library_id}` | DELETE | `delete_library` | src/memorymap/api/routes_board_library.py:629 |
| `/board-library/libraries/{library_id}` | PUT | `rename_library` | src/memorymap/api/routes_board_library.py:621 |
| `/board-library/marks` | POST | `mark_builtin` | src/memorymap/api/routes_board_library.py:595 |
| `/board-library/new-board` | POST | `new_board_from_template` | src/memorymap/api/routes_board_library.py:1028 |
| `/board-library/{item_id}` | DELETE | `delete_library_item` | src/memorymap/api/routes_board_library.py:552 |
| `/board-library/{item_id}` | PUT | `update_library_item` | src/memorymap/api/routes_board_library.py:528 |
| `/board-library/{item_id}/duplicate` | POST | `duplicate_library_item` | src/memorymap/api/routes_board_library.py:574 |
| `/board-library/{item_id}/restore` | POST | `restore_library_item` | src/memorymap/api/routes_board_library.py:563 |
| `/boards` | GET | `list_boards` | src/memorymap/api/routes_whiteboard.py:2157 |
| `/boards` | POST | `create_board` | src/memorymap/api/routes_whiteboard.py:2414 |
| `/boards/generate` | POST | `generate_map` | src/memorymap/api/routes_whiteboard.py:5453 |
| `/boards/import` | POST | `import_board` | src/memorymap/api/routes_whiteboard.py:5527 |
| `/boards/propose` | POST | `propose_map` | src/memorymap/api/routes_whiteboard.py:5324 |
| `/boards/{board_id}` | PUT | `rename_board` | src/memorymap/api/routes_whiteboard.py:2621 |
| `/boards/{board_id}/duplicate` | POST | `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2456 |
| `/boards/{board_id}/export` | GET | `export_board` | src/memorymap/api/routes_whiteboard.py:4548 |
| `/boards/{board_id}/nodes` | POST | `create_map_node` | src/memorymap/api/routes_whiteboard.py:3525 |
| `/boards/{board_id}/nodes/clear-style` | POST | `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:3950 |
| `/boards/{board_id}/nodes/move-many` | PUT | `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3813 |
| `/boards/{board_id}/nodes/outline` | POST | `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3620 |
| `/boards/{board_id}/nodes/{node_id}/branches` | POST | `add_branches` | src/memorymap/api/routes_map_suggest.py:197 |
| `/boards/{board_id}/nodes/{node_id}/move` | PUT | `move_map_node` | src/memorymap/api/routes_whiteboard.py:3696 |
| `/boards/{board_id}/nodes/{node_id}/suggest` | POST | `suggest_branches` | src/memorymap/api/routes_map_suggest.py:146 |
| `/boards/{board_id}/nodes/{node_id}/summary` | POST | `summarise_branch` | src/memorymap/api/routes_map_suggest.py:308 |
| `/boards/{board_id}/tree` | GET | `board_tree` | src/memorymap/api/routes_whiteboard.py:3458 |
| `/budgets` | GET | `budgets` | src/memorymap/api/routes_bench.py:123 |
| `/bulk` | POST | `bulk_action` | src/memorymap/api/routes_learned.py:236 |
| `/bulk` | POST | `bulk_edit_tags` | src/memorymap/api/routes_tags.py:104 |
| `/capabilities` | GET | `capabilities` | src/memorymap/api/routes_capabilities.py:75 |
| `/change-password` | POST | `change_password` | src/memorymap/api/routes_auth.py:988 |
| `/changelog` | GET | `changelog` | src/memorymap/api/app.py:1402 |
| `/charts/question` | POST | `chart_for_question` | src/memorymap/api/routes_vision.py:380 |
| `/chat-model` | POST | `set_chat_model` | src/memorymap/api/routes_models.py:691 |
| `/check` | GET | `check_for_update` | src/memorymap/api/routes_update.py:425 |
| `/check-syntax` | POST | `check_syntax` | src/memorymap/api/routes_documents.py:310 |
| `/choice` | POST | `update_choice` | src/memorymap/api/routes_update.py:411 |
| `/clip` | POST | `clip` | src/memorymap/api/routes_webclip.py:44 |
| `/clip-page` | POST | `clip_page` | src/memorymap/api/routes_webclip.py:110 |
| `/command/run` | POST | `run_command` | src/memorymap/api/routes_chat.py:2400 |
| `/compose` | POST | `compose_draft` | src/memorymap/api/routes_drafts.py:75 |
| `/compose/stream` | POST | `compose_draft_stream` | src/memorymap/api/routes_drafts.py:110 |
| `/compress` | POST | `compress_history` | src/memorymap/api/routes_chat.py:3040 |
| `/compute` | POST | `compute` | src/memorymap/api/routes_resurface.py:85 |
| `/confirm` | POST | `confirm_insight` | src/memorymap/api/routes_insights.py:415 |
| `/contents` | POST | `write_contents` | src/memorymap/api/routes_documents.py:503 |
| `/corrections` | GET | `list_corrections` | src/memorymap/api/routes_learned.py:78 |
| `/corrections` | POST | `add_correction` | src/memorymap/api/routes_learned.py:53 |
| `/count` | GET | `count_entries` | src/memorymap/api/routes_entries.py:2384 |
| `/counts` | GET | `counts` | src/memorymap/api/routes_questions.py:45 |
| `/counts` | GET | `reminder_counts` | src/memorymap/api/routes_reminders.py:200 |
| `/daily` | GET | `daily_journal` | src/memorymap/api/routes_entries.py:935 |
| `/daily/{day}` | GET | `daily_note` | src/memorymap/api/routes_entries.py:977 |
| `/daily/{day}` | POST | `open_daily_note` | src/memorymap/api/routes_entries.py:993 |
| `/day` | GET | `day_digest_lines` | src/memorymap/api/routes_insights.py:376 |
| `/delete` | POST | `delete_model` | src/memorymap/api/routes_models.py:1003 |
| `/delete` | POST | `delete_tag` | src/memorymap/api/routes_tags.py:95 |
| `/desktop/fullscreen` | GET | `desktop_fullscreen_state` | src/memorymap/api/routes_tasks.py:692 |
| `/desktop/fullscreen` | POST | `desktop_fullscreen_toggle` | src/memorymap/api/routes_tasks.py:704 |
| `/digest` | POST | `weekly_digest` | src/memorymap/api/routes_insights.py:706 |
| `/digest/stream` | POST | `weekly_digest_stream` | src/memorymap/api/routes_insights.py:638 |
| `/dismiss` | POST | `dismiss_insight` | src/memorymap/api/routes_insights.py:429 |
| `/documents/run-sandbox` | GET | `run_sandbox` | src/memorymap/api/run_sandbox.py:713 |
| `/documents/run-sandbox/python` | GET | `run_sandbox_python` | src/memorymap/api/run_sandbox.py:1428 |
| `/embedding-backend` | POST | `set_embedding_backend` | src/memorymap/api/routes_models.py:914 |
| `/embedding-models` | GET | `list_embedding_models` | src/memorymap/api/routes_settings.py:1809 |
| `/embedding-models/choices` | GET | `embedding_model_choices` | src/memorymap/api/routes_settings.py:1836 |
| `/embedding-models/pull` | POST | `pull_embedding_model` | src/memorymap/api/routes_settings.py:1891 |
| `/embedding-models/use` | POST | `use_embedding_model` | src/memorymap/api/routes_settings.py:1868 |
| `/embedding-models/{model_id}` | DELETE | `remove_embedding_model` | src/memorymap/api/routes_settings.py:1947 |
| `/embedding-models/{model_id}/download` | POST | `download_embedding_model` | src/memorymap/api/routes_settings.py:1928 |
| `/entries/{entry_id}/files` | POST | `upload_file` | src/memorymap/api/routes_files.py:96 |
| `/entries/{entry_id}/meeting` | GET | `read_meeting` | src/memorymap/api/routes_meetings.py:89 |
| `/entries/{entry_id}/meeting/append` | POST | `append_to_meeting` | src/memorymap/api/routes_meetings.py:175 |
| `/entries/{entry_id}/meeting/remind` | POST | `remind_action` | src/memorymap/api/routes_meetings.py:134 |
| `/entries/{entry_id}/meeting/summarise` | POST | `summarise_meeting` | src/memorymap/api/routes_meetings.py:190 |
| `/entries/{entry_id}/properties` | GET | `entry_properties` | src/memorymap/api/routes_properties.py:45 |
| `/entries/{entry_id}/properties` | PUT | `put_properties` | src/memorymap/api/routes_properties.py:61 |
| `/events` | GET | `event_feed` | src/memorymap/api/routes_settings.py:1656 |
| `/events/undo` | POST | `undo_actor` | src/memorymap/api/routes_settings.py:1627 |
| `/export` | GET | `export_learned` | src/memorymap/api/routes_learned.py:150 |
| `/export.ics` | GET | `export_ics` | src/memorymap/api/routes_reminders.py:348 |
| `/export/backup` | GET | `export_backup` | src/memorymap/api/routes_settings.py:2318 |
| `/export/csv` | GET | `export_csv` | src/memorymap/api/routes_settings.py:3031 |
| `/export/folder` | GET | `export_notebook_folder` | src/memorymap/api/routes_import.py:119 |
| `/export/json` | GET | `export_json` | src/memorymap/api/routes_settings.py:2342 |
| `/export/markdown` | GET | `export_markdown` | src/memorymap/api/routes_settings.py:2472 |
| `/extract/commit` | POST | `extract_commit` | src/memorymap/api/routes_entries.py:3866 |
| `/extract/preview` | POST | `extract_preview` | src/memorymap/api/routes_entries.py:3820 |
| `/extras` | GET | `list_extras` | src/memorymap/api/routes_settings.py:1745 |
| `/extras/bulk` | POST | `bulk_extras` | src/memorymap/api/routes_settings.py:1777 |
| `/extras/{extra_id}/install` | POST | `install_extra` | src/memorymap/api/routes_settings.py:1786 |
| `/extras/{extra_id}/uninstall` | POST | `uninstall_extra` | src/memorymap/api/routes_settings.py:1799 |
| `/feature-model` | POST | `set_feature_model` | src/memorymap/api/routes_models.py:766 |
| `/feature-models/reset` | POST | `reset_feature_models` | src/memorymap/api/routes_models.py:816 |
| `/file-types` | GET | `list_file_types` | src/memorymap/api/routes_documents.py:285 |
| `/files/exports` | GET | `list_exports` | src/memorymap/api/routes_files.py:1132 |
| `/files/exports/{filename}` | GET | `download_export` | src/memorymap/api/routes_files.py:1170 |
| `/files/gallery` | GET | `list_attachment_gallery` | src/memorymap/api/routes_files.py:296 |
| `/files/open-exports-folder` | POST | `open_exports_folder` | src/memorymap/api/routes_files.py:1181 |
| `/files/readings` | GET | `file_readings` | src/memorymap/api/routes_files.py:272 |
| `/files/save` | POST | `save_generated_file` | src/memorymap/api/routes_files.py:1084 |
| `/files/{attachment_id}` | DELETE | `delete_file` | src/memorymap/api/routes_files.py:905 |
| `/files/{attachment_id}` | PUT | `rename_file` | src/memorymap/api/routes_files.py:927 |
| `/files/{attachment_id}/analyse` | POST | `analyse_attachment` | src/memorymap/api/routes_files.py:448 |
| `/files/{attachment_id}/ocr-clean-loops` | POST | `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3856 |
| `/files/{attachment_id}/ocr-page-read` | POST | `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3434 |
| `/files/{attachment_id}/ocr-range-read` | POST | `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3398 |
| `/files/{attachment_id}/ocr-regions` | GET | `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2530 |
| `/files/{attachment_id}/page-caption` | POST | `attachment_page_caption` | src/memorymap/api/routes_files.py:3639 |
| `/files/{attachment_id}/page-reads` | GET | `attachment_page_reads` | src/memorymap/api/routes_files.py:3677 |
| `/files/{attachment_id}/page-reads/{page}` | DELETE | `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3734 |
| `/files/{attachment_id}/pdf-info` | GET | `attached_file_pdf_info` | src/memorymap/api/routes_files.py:768 |
| `/files/{attachment_id}/readings/{source}` | DELETE | `delete_attachment_reading` | src/memorymap/api/routes_files.py:3793 |
| `/files/{attachment_id}/region-read` | POST | `attachment_region_read` | src/memorymap/api/routes_files.py:3605 |
| `/files/{attachment_id}/text` | GET | `attached_file_text` | src/memorymap/api/routes_files.py:663 |
| `/files/{attachment_id}/text` | PUT | `save_attached_file_text` | src/memorymap/api/routes_files.py:710 |
| `/followups` | POST | `chat_followups` | src/memorymap/api/routes_chat.py:290 |
| `/graph` | GET | `graph` | src/memorymap/api/routes_graph.py:742 |
| `/graph/local/{entry_id}` | GET | `graph_local` | src/memorymap/api/routes_graph.py:1201 |
| `/graph/match` | GET | `graph_match` | src/memorymap/api/routes_graph.py:328 |
| `/graph/path` | GET | `graph_path` | src/memorymap/api/routes_graph.py:1549 |
| `/graph/pin/{entry_id}` | PUT | `pin_node` | src/memorymap/api/routes_graph.py:1751 |
| `/graph/pins` | PUT | `pin_nodes` | src/memorymap/api/routes_graph.py:1788 |
| `/graph/structure` | GET | `graph_structure` | src/memorymap/api/routes_graph.py:1325 |
| `/graph/topics/name` | PUT | `name_topic` | src/memorymap/api/routes_graph.py:1400 |
| `/graph/topics/of` | GET | `graph_topics_of` | src/memorymap/api/routes_graph.py:1363 |
| `/graph/topics/summary` | POST | `topic_summary` | src/memorymap/api/routes_graph.py:1418 |
| `/graph/unpin-all` | POST | `unpin_all_nodes` | src/memorymap/api/routes_graph.py:1809 |
| `/greeting` | GET | `greeting` | src/memorymap/api/routes_insights.py:161 |
| `/hardware` | GET | `hardware_memory` | src/memorymap/api/routes_models.py:646 |
| `/health` | GET | `debug_health` | src/memorymap/api/routes_debug.py:79 |
| `/health` | GET | `health` | src/memorymap/api/app.py:1349 |
| `/health/integrity` | POST | `integrity_check` | src/memorymap/api/routes_debug.py:186 |
| `/heatmap` | GET | `heatmap` | src/memorymap/api/routes_insights.py:341 |
| `/history` | GET | `board_history` | src/memorymap/api/routes_board_history.py:271 |
| `/history` | GET | `tidy_history` | src/memorymap/api/routes_tidy.py:55 |
| `/history/snapshots` | GET | `list_snapshots` | src/memorymap/api/routes_board_history.py:331 |
| `/history/snapshots` | POST | `save_snapshot` | src/memorymap/api/routes_board_history.py:346 |
| `/history/snapshots/{snapshot_id}` | DELETE | `delete_snapshot` | src/memorymap/api/routes_board_history.py:372 |
| `/history/{event_id}` | GET | `board_at` | src/memorymap/api/routes_board_history.py:385 |
| `/history/{event_id}/restore` | POST | `restore_board` | src/memorymap/api/routes_board_history.py:416 |
| `/images` | GET | `list_images` | src/memorymap/api/routes_whiteboard.py:2346 |
| `/import` | POST | `import_document` | src/memorymap/api/routes_documents.py:529 |
| `/import/app` | POST | `import_app` | src/memorymap/api/routes_import.py:63 |
| `/import/directory` | POST | `import_directory` | src/memorymap/api/routes_settings.py:2813 |
| `/import/document` | POST | `import_document` | src/memorymap/api/routes_settings.py:2935 |
| `/import/markdown` | POST | `import_markdown` | src/memorymap/api/routes_settings.py:2828 |
| `/import/reports/{report_id}` | GET | `import_report_page` | src/memorymap/api/routes_import.py:110 |
| `/improve` | POST | `improve_writing` | src/memorymap/api/routes_entries.py:1548 |
| `/inspect` | POST | `inspect_model` | src/memorymap/api/routes_models.py:663 |
| `/instance` | GET | `instance` | src/memorymap/api/app.py:1363 |
| `/instance/focus` | POST | `instance_focus` | src/memorymap/api/app.py:1377 |
| `/jobs` | GET | `list_jobs` | src/memorymap/api/routes_tasks.py:499 |
| `/jobs/cancel` | POST | `cancel_job` | src/memorymap/api/routes_models.py:899 |
| `/jobs/last-runs` | GET | `jobs_last_runs` | src/memorymap/api/routes_tasks.py:465 |
| `/jobs/passes/{kind}/run` | POST | `run_pass_now` | src/memorymap/api/routes_tasks.py:485 |
| `/jobs/stream` | GET | `jobs_stream` | src/memorymap/api/routes_tasks.py:526 |
| `/jobs/{job_id}/cancel` | POST | `cancel_job` | src/memorymap/api/routes_tasks.py:507 |
| `/lan-access` | GET | `lan_access` | src/memorymap/api/routes_auth.py:836 |
| `/lan-access` | POST | `set_lan_access` | src/memorymap/api/routes_auth.py:876 |
| `/lan-certificate` | POST | `regenerate_lan_certificate` | src/memorymap/api/routes_auth.py:857 |
| `/lan-certificate.pem` | GET | `download_lan_certificate` | src/memorymap/api/routes_auth.py:842 |
| `/latest` | GET | `latest` | src/memorymap/api/routes_night.py:84 |
| `/library` | GET | `library` | src/memorymap/api/routes_library.py:1076 |
| `/link-reasons/run` | POST | `tidy_link_reasons_run` | src/memorymap/api/routes_tidy.py:78 |
| `/link-reasons/stop` | POST | `tidy_link_reasons_stop` | src/memorymap/api/routes_tidy.py:88 |
| `/link-suggestions` | GET | `link_suggestions` | src/memorymap/api/routes_entries.py:1662 |
| `/link-suggestions/reasons` | POST | `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:2009 |
| `/links/backfill-reasons` | POST | `backfill_link_reasons` | src/memorymap/api/routes_entries.py:2057 |
| `/lock` | POST | `lock` | src/memorymap/api/routes_auth.py:920 |
| `/lock-all` | POST | `lock_all` | src/memorymap/api/routes_auth.py:1429 |
| `/logs` | DELETE | `clear_server_logs` | src/memorymap/api/routes_settings.py:2037 |
| `/logs` | GET | `server_logs` | src/memorymap/api/routes_settings.py:1954 |
| `/logs/stats` | GET | `server_log_stats` | src/memorymap/api/routes_settings.py:2025 |
| `/logs/stream` | GET | `stream_server_logs` | src/memorymap/api/routes_settings.py:2053 |
| `/maps/from-notes` | POST | `map_from_notes` | src/memorymap/api/routes_map_from_notes.py:256 |
| `/media` | GET | `list_media` | src/memorymap/api/routes_files.py:1391 |
| `/media-session` | POST | `media_session` | src/memorymap/api/routes_auth.py:680 |
| `/media/meta/{filename}` | GET | `media_meta` | src/memorymap/api/routes_files.py:1548 |
| `/media/orphans` | DELETE | `clean_orphaned_media` | src/memorymap/api/routes_files.py:1523 |
| `/media/orphans` | GET | `list_orphaned_media` | src/memorymap/api/routes_files.py:1492 |
| `/media/pdf-info/{filename}` | GET | `media_pdf_info` | src/memorymap/api/routes_files.py:1666 |
| `/media/text/{filename}` | GET | `media_text` | src/memorymap/api/routes_files.py:1598 |
| `/media/upload` | POST | `upload_media` | src/memorymap/api/routes_files.py:1242 |
| `/media/{upload_id}` | DELETE | `delete_media` | src/memorymap/api/routes_files.py:1785 |
| `/media/{upload_id}` | PUT | `rename_media` | src/memorymap/api/routes_files.py:1818 |
| `/media/{upload_id}/caption` | POST | `caption_media` | src/memorymap/api/routes_files.py:1873 |
| `/media/{upload_id}/ocr` | POST | `ocr_media` | src/memorymap/api/routes_files.py:1978 |
| `/media/{upload_id}/ocr-clean-loops` | POST | `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3882 |
| `/media/{upload_id}/ocr-page-read` | POST | `media_ocr_page_read` | src/memorymap/api/routes_files.py:3451 |
| `/media/{upload_id}/ocr-range-read` | POST | `media_ocr_range_read` | src/memorymap/api/routes_files.py:3416 |
| `/media/{upload_id}/ocr-regions` | GET | `media_ocr_regions` | src/memorymap/api/routes_files.py:2496 |
| `/media/{upload_id}/page-caption` | POST | `media_page_caption` | src/memorymap/api/routes_files.py:3660 |
| `/media/{upload_id}/page-reads` | GET | `media_page_reads` | src/memorymap/api/routes_files.py:3693 |
| `/media/{upload_id}/page-reads/{page}` | DELETE | `delete_media_page_read` | src/memorymap/api/routes_files.py:3748 |
| `/media/{upload_id}/readings/{source}` | DELETE | `delete_media_reading` | src/memorymap/api/routes_files.py:3783 |
| `/media/{upload_id}/region-read` | POST | `media_region_read` | src/memorymap/api/routes_files.py:3625 |
| `/media/{upload_id}/vision-ocr` | POST | `vision_ocr_media` | src/memorymap/api/routes_files.py:3935 |
| `/meetings` | POST | `create_meeting` | src/memorymap/api/routes_meetings.py:51 |
| `/memory` | GET | `list_memory` | src/memorymap/api/routes_settings.py:1297 |
| `/memory` | POST | `add_memory` | src/memorymap/api/routes_settings.py:1332 |
| `/memory/{preference_id}` | DELETE | `forget_memory` | src/memorymap/api/routes_settings.py:1428 |
| `/memory/{preference_id}` | PATCH | `update_memory` | src/memorymap/api/routes_settings.py:1409 |
| `/memory/{preference_id}/answer` | POST | `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1375 |
| `/merge` | POST | `merge_notes` | src/memorymap/api/routes_duplicates.py:135 |
| `/merge` | POST | `merge_tags` | src/memorymap/api/routes_tags.py:86 |
| `/merges/accept` | POST | `accept_merge` | src/memorymap/api/routes_inbox.py:143 |
| `/merges/dismiss` | POST | `dismiss_merge` | src/memorymap/api/routes_inbox.py:157 |
| `/merges/{undo_id}/undo` | POST | `undo_merge_route` | src/memorymap/api/routes_entities.py:227 |
| `/modes` | GET | `list_modes` | src/memorymap/api/routes_chat.py:2976 |
| `/most-accessed` | GET | `most_accessed` | src/memorymap/api/routes_entries.py:2372 |
| `/most-opened` | GET | `most_opened` | src/memorymap/api/routes_vision.py:112 |
| `/move` | POST | `move_notes` | src/memorymap/api/routes_categories.py:171 |
| `/near/{entry_id}` | GET | `near` | src/memorymap/api/routes_resurface.py:145 |
| `/nodes` | POST | `create_node` | src/memorymap/api/routes_whiteboard.py:2726 |
| `/nodes/{node_id}` | DELETE | `delete_node` | src/memorymap/api/routes_whiteboard.py:2803 |
| `/nodes/{node_id}` | PUT | `update_node` | src/memorymap/api/routes_whiteboard.py:2771 |
| `/note-types` | GET | `list_note_types` | src/memorymap/api/routes_properties.py:133 |
| `/note-types` | POST | `create_note_type` | src/memorymap/api/routes_properties.py:145 |
| `/note-types/{type_id}` | DELETE | `delete_note_type` | src/memorymap/api/routes_properties.py:189 |
| `/note-types/{type_id}` | PATCH | `patch_note_type` | src/memorymap/api/routes_properties.py:167 |
| `/objects` | POST | `create_object` | src/memorymap/api/routes_whiteboard.py:2900 |
| `/objects/{object_id}` | DELETE | `delete_object` | src/memorymap/api/routes_whiteboard.py:2978 |
| `/objects/{object_id}` | PUT | `update_object` | src/memorymap/api/routes_whiteboard.py:2944 |
| `/ocr-model` | POST | `set_ocr_model` | src/memorymap/api/routes_models.py:745 |
| `/ocr-readers` | GET | `ocr_readers` | src/memorymap/api/routes_files.py:3204 |
| `/ocr/language` | POST | `set_ocr_language` | src/memorymap/api/routes_files.py:3253 |
| `/on-this-day` | GET | `on_this_day` | src/memorymap/api/routes_insights.py:453 |
| `/openapi.json` | GET | `openapi_schema` | src/memorymap/api/app.py:1332 |
| `/outline` | GET | `documents_outline` | src/memorymap/api/routes_documents.py:438 |
| `/parse` | POST | `magic_add_reminder` | src/memorymap/api/routes_reminders.py:462 |
| `/password-on-open` | POST | `set_password_on_open` | src/memorymap/api/routes_auth.py:781 |
| `/patterns` | GET | `patterns` | src/memorymap/api/routes_insights.py:393 |
| `/personas/suggest-thinking-words` | POST | `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:187 |
| `/preferences` | GET | `get_preferences` | src/memorymap/api/routes_settings.py:716 |
| `/preferences` | PUT | `update_preferences` | src/memorymap/api/routes_settings.py:960 |
| `/preview` | POST | `preview_merge` | src/memorymap/api/routes_duplicates.py:116 |
| `/provider` | POST | `set_provider` | src/memorymap/api/routes_models.py:833 |
| `/pull` | POST | `pull_model` | src/memorymap/api/routes_models.py:1037 |
| `/query` | GET | `query_entries` | src/memorymap/api/routes_entries.py:1600 |
| `/read` | GET | `read_text` | src/memorymap/api/routes_read.py:36 |
| `/read` | POST | `read` | src/memorymap/api/routes_editor.py:34 |
| `/read/acts` | GET | `act_rows` | src/memorymap/api/routes_read.py:126 |
| `/read/board` | GET | `board_act` | src/memorymap/api/routes_read.py:76 |
| `/read/dates` | POST | `date_chips` | src/memorymap/api/routes_read.py:91 |
| `/read/filter` | GET | `phrase_filter` | src/memorymap/api/routes_read.py:99 |
| `/read/offers` | POST | `note_offers` | src/memorymap/api/routes_read.py:64 |
| `/read/words` | GET | `setting_words` | src/memorymap/api/routes_read.py:117 |
| `/reading-bin/{bin_id}/purge` | DELETE | `purge_binned_reading` | src/memorymap/api/routes_files.py:3827 |
| `/reading-bin/{bin_id}/restore` | POST | `restore_binned_reading` | src/memorymap/api/routes_files.py:3809 |
| `/receipt` | GET | `receipt` | src/memorymap/api/routes_privacy.py:95 |
| `/recent` | DELETE | `forget_recent_question` | src/memorymap/api/routes_chat.py:170 |
| `/recent` | GET | `recent_questions` | src/memorymap/api/routes_chat.py:164 |
| `/recordings` | GET | `list_recordings` | src/memorymap/api/routes_recordings.py:78 |
| `/recordings` | POST | `create_recording` | src/memorymap/api/routes_recordings.py:108 |
| `/recordings/recover` | POST | `recover_recordings` | src/memorymap/api/routes_recordings.py:100 |
| `/recordings/{recording_id}` | DELETE | `bin_recording` | src/memorymap/api/routes_recordings.py:197 |
| `/recordings/{recording_id}` | GET | `read_recording` | src/memorymap/api/routes_recordings.py:177 |
| `/recordings/{recording_id}` | PATCH | `update_recording` | src/memorymap/api/routes_recordings.py:182 |
| `/recordings/{recording_id}/chunk` | POST | `append_chunk` | src/memorymap/api/routes_recordings.py:131 |
| `/recordings/{recording_id}/finish` | POST | `finish_recording` | src/memorymap/api/routes_recordings.py:159 |
| `/recordings/{recording_id}/purge` | POST | `purge_recording` | src/memorymap/api/routes_recordings.py:216 |
| `/recordings/{recording_id}/restore` | POST | `restore_recording` | src/memorymap/api/routes_recordings.py:207 |
| `/recordings/{recording_id}/transcribe` | POST | `transcribe_recording` | src/memorymap/api/routes_recordings.py:227 |
| `/recover` | POST | `recover` | src/memorymap/api/routes_auth.py:1350 |
| `/recovery-key` | POST | `make_recovery_key` | src/memorymap/api/routes_auth.py:1273 |
| `/recovery-key/save` | POST | `save_recovery_key` | src/memorymap/api/routes_auth.py:1320 |
| `/recycle-bin/empty` | POST | `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1730 |
| `/reference-counts` | GET | `entry_reference_counts` | src/memorymap/api/routes_entries.py:2404 |
| `/reindex` | POST | `rebuild_search_index` | src/memorymap/api/routes_models.py:963 |
| `/releases` | GET | `list_releases` | src/memorymap/api/routes_update.py:553 |
| `/rename` | POST | `rename_tag` | src/memorymap/api/routes_tags.py:76 |
| `/reset` | POST | `reset` | src/memorymap/api/routes_auth.py:1403 |
| `/restore` | POST | `restore_conversation` | src/memorymap/api/routes_conversations.py:946 |
| `/restore` | POST | `restore_tags` | src/memorymap/api/routes_tags.py:110 |
| `/review-queue` | GET | `review_queue` | src/memorymap/api/routes_vision.py:83 |
| `/review-queue/{entry_id}/accept` | POST | `accept_filing` | src/memorymap/api/routes_vision.py:94 |
| `/rotate-vault-key` | POST | `rotate_vault_key` | src/memorymap/api/routes_auth.py:1070 |
| `/run` | POST | `run_now` | src/memorymap/api/routes_night.py:50 |
| `/runs/{run_id}/facts` | GET | `run_facts` | src/memorymap/api/routes_night.py:92 |
| `/sampling` | GET | `sampling_settings` | src/memorymap/api/routes_models.py:542 |
| `/sampling` | PUT | `save_sampling_settings` | src/memorymap/api/routes_models.py:590 |
| `/seed-examples` | POST | `seed_example_entries` | src/memorymap/api/routes_entries.py:2389 |
| `/setup` | POST | `setup` | src/memorymap/api/routes_auth.py:603 |
| `/shutdown` | POST | `shutdown` | src/memorymap/api/routes_tasks.py:716 |
| `/sketches` | POST | `create_sketch` | src/memorymap/api/routes_whiteboard.py:2824 |
| `/sketches/{sketch_id}` | DELETE | `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2871 |
| `/sketches/{sketch_id}` | PUT | `update_sketch` | src/memorymap/api/routes_whiteboard.py:2846 |
| `/skills` | GET | `list_skills` | src/memorymap/api/routes_settings.py:1196 |
| `/source-status` | GET | `source_update_status` | src/memorymap/api/routes_update.py:623 |
| `/spaces` | GET | `get_spaces` | src/memorymap/api/routes_spaces.py:66 |
| `/spaces` | POST | `create_space` | src/memorymap/api/routes_spaces.py:71 |
| `/spaces/restore` | POST | `restore_space` | src/memorymap/api/routes_spaces.py:182 |
| `/spaces/{space_id}` | DELETE | `delete_space` | src/memorymap/api/routes_spaces.py:274 |
| `/spaces/{space_id}` | PUT | `update_space` | src/memorymap/api/routes_spaces.py:84 |
| `/spaces/{space_id}/move-notes` | POST | `move_notes_to_space` | src/memorymap/api/routes_spaces.py:462 |
| `/spec` | GET | `model_spec` | src/memorymap/api/routes_models.py:502 |
| `/start` | POST | `start` | src/memorymap/api/routes_captions.py:48 |
| `/statistics` | GET | `statistics` | src/memorymap/api/routes_statistics.py:24 |
| `/stats` | GET | `ask_history_stats` | src/memorymap/api/routes_ask_history.py:83 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_insights.py:33 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_search.py:144 |
| `/status` | GET | `status` | src/memorymap/api/routes_auth.py:579 |
| `/status` | GET | `status` | src/memorymap/api/routes_models.py:317 |
| `/status` | GET | `status` | src/memorymap/api/routes_translate.py:22 |
| `/status` | GET | `status` | src/memorymap/api/routes_voice.py:30 |
| `/stop` | POST | `stop` | src/memorymap/api/routes_bench.py:242 |
| `/storage` | GET | `storage_location` | src/memorymap/api/routes_backups.py:42 |
| `/stream` | POST | `chat_stream` | src/memorymap/api/routes_chat.py:2884 |
| `/suggest-tags` | POST | `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1264 |
| `/suggested` | GET | `suggested` | src/memorymap/api/routes_models.py:604 |
| `/suggestions` | GET | `suggestions` | src/memorymap/api/routes_chat.py:243 |
| `/summarize` | POST | `summarize` | src/memorymap/api/routes_voice.py:118 |
| `/summary` | GET | `learned_summary` | src/memorymap/api/routes_learned.py:189 |
| `/summary` | GET | `summary` | src/memorymap/api/routes_questions.py:53 |
| `/summary` | POST | `summary` | src/memorymap/api/routes_usage.py:35 |
| `/support-bundle` | GET | `support_bundle` | src/memorymap/api/routes_settings.py:2218 |
| `/switches` | GET | `get_switches` | src/memorymap/api/routes_learned.py:197 |
| `/switches` | PUT | `put_switches` | src/memorymap/api/routes_learned.py:203 |
| `/system/clear-static-cache` | POST | `system_clear_static_cache` | src/memorymap/api/app.py:1342 |
| `/system/console-mode` | POST | `set_console_mode` | src/memorymap/api/routes_settings.py:1029 |
| `/system/restart` | POST | `restart_app` | src/memorymap/api/routes_settings.py:1098 |
| `/tag-cloud` | GET | `tag_cloud` | src/memorymap/api/routes_insights.py:442 |
| `/tasks` | GET | `list_tasks` | src/memorymap/api/routes_tasks.py:451 |
| `/tasks/autonomous/last` | GET | `last_autonomous_pass` | src/memorymap/api/routes_tasks.py:651 |
| `/tasks/autonomous/last/clear` | POST | `clear_last_autonomous_pass` | src/memorymap/api/routes_tasks.py:668 |
| `/tasks/cancel` | POST | `cancel_task` | src/memorymap/api/routes_tasks.py:575 |
| `/tasks/history/clear` | POST | `clear_history` | src/memorymap/api/routes_tasks.py:677 |
| `/tasks/trigger-autonomous` | POST | `trigger_autonomous` | src/memorymap/api/routes_tasks.py:614 |
| `/templates/draft` | POST | `draft_template` | src/memorymap/api/routes_settings.py:214 |
| `/tensions` | GET | `find_tensions` | src/memorymap/api/routes_entries.py:1803 |
| `/tensions/accept` | POST | `accept_tension` | src/memorymap/api/routes_entries.py:1955 |
| `/tensions/dismiss` | POST | `dismiss_tension` | src/memorymap/api/routes_entries.py:1979 |
| `/tensions/known` | GET | `known_tensions` | src/memorymap/api/routes_entries.py:1899 |
| `/tidy-proposals` | GET | `tidy_proposals` | src/memorymap/api/routes_vision.py:195 |
| `/tidy-proposals/dismiss` | POST | `dismiss_tidy` | src/memorymap/api/routes_vision.py:249 |
| `/title` | POST | `draft_title` | src/memorymap/api/routes_drafts.py:147 |
| `/tools` | GET | `list_tools` | src/memorymap/api/routes_chat.py:2997 |
| `/tools/execute` | POST | `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:3079 |
| `/topics` | GET | `topics` | src/memorymap/api/routes_help.py:52 |
| `/transcribe` | POST | `transcribe` | src/memorymap/api/routes_voice.py:94 |
| `/transcribe-meeting` | POST | `transcribe_meeting` | src/memorymap/api/routes_voice.py:101 |
| `/turned-down` | GET | `list_turned_down` | src/memorymap/api/routes_tags.py:120 |
| `/turned-down/offer-again` | POST | `offer_tag_again` | src/memorymap/api/routes_tags.py:143 |
| `/types/accept` | POST | `accept_type` | src/memorymap/api/routes_inbox.py:169 |
| `/types/dismiss` | POST | `dismiss_type` | src/memorymap/api/routes_inbox.py:186 |
| `/undo/{undo_id}` | POST | `tidy_undo` | src/memorymap/api/routes_tidy.py:70 |
| `/unlock` | POST | `unlock` | src/memorymap/api/routes_auth.py:624 |
| `/unlock-vault` | POST | `unlock_vault` | src/memorymap/api/routes_auth.py:732 |
| `/utility-model` | POST | `set_utility_model` | src/memorymap/api/routes_models.py:710 |
| `/vision-model` | POST | `set_vision_model` | src/memorymap/api/routes_models.py:728 |
| `/warm` | POST | `warm` | src/memorymap/api/routes_search.py:35 |
| `/warm-filing` | POST | `warm_filing` | src/memorymap/api/routes_models.py:265 |
| `/websearch` | GET | `web_search` | src/memorymap/api/routes_websearch.py:53 |
| `/websearch/detect-searxng` | POST | `detect_searxng` | src/memorymap/api/routes_websearch.py:93 |
| `/websearch/providers` | GET | `web_search_providers` | src/memorymap/api/routes_websearch.py:36 |
| `/websearch/read` | GET | `web_read` | src/memorymap/api/routes_websearch.py:217 |
| `/websearch/searxng/reinstall` | POST | `searxng_reinstall` | src/memorymap/api/routes_websearch.py:167 |
| `/websearch/searxng/start` | POST | `searxng_start` | src/memorymap/api/routes_websearch.py:134 |
| `/websearch/searxng/status` | GET | `searxng_status` | src/memorymap/api/routes_websearch.py:120 |
| `/websearch/searxng/stop` | POST | `searxng_stop` | src/memorymap/api/routes_websearch.py:198 |
| `/when` | POST | `read_when` | src/memorymap/api/routes_reminders.py:443 |
| `/whiteboard/boards/{board_id}/place` | POST | `place_library_item` | src/memorymap/api/routes_board_library.py:968 |
| `/{bookmark_id}` | DELETE | `delete_bookmark` | src/memorymap/api/routes_bookmarks.py:183 |
| `/{bookmark_id}` | PUT | `update_bookmark` | src/memorymap/api/routes_bookmarks.py:162 |
| `/{category_id}` | DELETE | `delete_category` | src/memorymap/api/routes_categories.py:345 |
| `/{category_id}` | PUT | `rename_category` | src/memorymap/api/routes_categories.py:334 |
| `/{category_id}/colour` | PUT | `set_category_colour` | src/memorymap/api/routes_categories.py:323 |
| `/{category_id}/merge` | POST | `merge_category` | src/memorymap/api/routes_categories.py:179 |
| `/{category_id}/split` | POST | `split_category` | src/memorymap/api/routes_categories.py:193 |
| `/{category_id}/split/propose` | POST | `propose_split` | src/memorymap/api/routes_categories.py:275 |
| `/{conversation_id}` | DELETE | `delete_conversation` | src/memorymap/api/routes_conversations.py:923 |
| `/{conversation_id}` | GET | `get_conversation` | src/memorymap/api/routes_conversations.py:518 |
| `/{conversation_id}` | PUT | `rename_conversation` | src/memorymap/api/routes_conversations.py:895 |
| `/{conversation_id}/archive` | PUT | `archive_conversation` | src/memorymap/api/routes_conversations.py:376 |
| `/{conversation_id}/fork` | POST | `fork_conversation` | src/memorymap/api/routes_conversations.py:723 |
| `/{conversation_id}/pin` | PUT | `pin_conversation` | src/memorymap/api/routes_conversations.py:356 |
| `/{conversation_id}/retitle` | POST | `retitle_conversation` | src/memorymap/api/routes_conversations.py:557 |
| `/{conversation_id}/truncate` | POST | `truncate_conversation` | src/memorymap/api/routes_conversations.py:683 |
| `/{conversation_id}/turns` | POST | `append_turn` | src/memorymap/api/routes_conversations.py:528 |
| `/{conversation_id}/turns/last` | PUT | `replace_last_turn` | src/memorymap/api/routes_conversations.py:605 |
| `/{conversation_id}/turns/{index}` | DELETE | `delete_turn` | src/memorymap/api/routes_conversations.py:623 |
| `/{conversation_id}/turns/{index}/answer` | PUT | `edit_answer` | src/memorymap/api/routes_conversations.py:865 |
| `/{conversation_id}/turns/{index}/followups` | PUT | `set_turn_followups` | src/memorymap/api/routes_conversations.py:775 |
| `/{conversation_id}/turns/{index}/restore` | POST | `restore_turn` | src/memorymap/api/routes_conversations.py:657 |
| `/{conversation_id}/unarchive` | PUT | `unarchive_conversation` | src/memorymap/api/routes_conversations.py:399 |
| `/{document_id}` | DELETE | `delete_document` | src/memorymap/api/routes_documents.py:741 |
| `/{document_id}` | GET | `get_document` | src/memorymap/api/routes_documents.py:631 |
| `/{document_id}` | PUT | `update_document` | src/memorymap/api/routes_documents.py:636 |
| `/{document_id}/ai-check` | POST | `ai_check` | src/memorymap/api/routes_documents.py:1135 |
| `/{document_id}/ai-edit` | POST | `ai_edit` | src/memorymap/api/routes_documents.py:1044 |
| `/{document_id}/ai-edit-log` | GET | `list_ai_edits` | src/memorymap/api/routes_documents.py:1450 |
| `/{document_id}/ai-edit-log` | POST | `record_ai_edit` | src/memorymap/api/routes_documents.py:1410 |
| `/{document_id}/ai-edit-log/{entry_id}/revert` | POST | `revert_ai_edit` | src/memorymap/api/routes_documents.py:1464 |
| `/{document_id}/archive` | PUT | `archive_document` | src/memorymap/api/routes_documents.py:791 |
| `/{document_id}/backlinks` | GET | `document_backlinks` | src/memorymap/api/routes_documents.py:919 |
| `/{document_id}/bookmarks` | GET | `document_bookmarks` | src/memorymap/api/routes_documents.py:226 |
| `/{document_id}/bookmarks` | POST | `attach_bookmark` | src/memorymap/api/routes_documents.py:245 |
| `/{document_id}/bookmarks/{bookmark_id}` | DELETE | `detach_bookmark` | src/memorymap/api/routes_documents.py:262 |
| `/{document_id}/connections` | GET | `document_connections` | src/memorymap/api/routes_documents.py:925 |
| `/{document_id}/export.md` | GET | `export_markdown` | src/memorymap/api/routes_documents.py:956 |
| `/{document_id}/export.zip` | GET | `export_bundle` | src/memorymap/api/routes_documents.py:1001 |
| `/{document_id}/notes` | POST | `attach_note` | src/memorymap/api/routes_documents.py:826 |
| `/{document_id}/notes/{entry_id}` | DELETE | `detach_note` | src/memorymap/api/routes_documents.py:839 |
| `/{document_id}/purge` | DELETE | `purge_document` | src/memorymap/api/routes_documents.py:775 |
| `/{document_id}/rephrase` | POST | `rephrase_passage` | src/memorymap/api/routes_documents.py:1179 |
| `/{document_id}/restore` | POST | `restore_document` | src/memorymap/api/routes_documents.py:764 |
| `/{document_id}/revisions` | GET | `document_revisions` | src/memorymap/api/routes_documents.py:1231 |
| `/{document_id}/revisions` | POST | `name_current_version` | src/memorymap/api/routes_documents.py:1300 |
| `/{document_id}/revisions/{revision_id}` | GET | `document_revision` | src/memorymap/api/routes_documents.py:1276 |
| `/{document_id}/revisions/{revision_id}` | PUT | `rename_version` | src/memorymap/api/routes_documents.py:1323 |
| `/{document_id}/revisions/{revision_id}/restore` | POST | `restore_document_revision` | src/memorymap/api/routes_documents.py:1340 |
| `/{document_id}/unarchive` | PUT | `unarchive_document` | src/memorymap/api/routes_documents.py:805 |
| `/{entity_id}` | GET | `entity_page` | src/memorymap/api/routes_entities.py:103 |
| `/{entity_id}` | PATCH | `patch_entity` | src/memorymap/api/routes_entities.py:182 |
| `/{entity_id}/merge` | POST | `merge_into` | src/memorymap/api/routes_entities.py:215 |
| `/{entry_id}` | DELETE | `delete_entry` | src/memorymap/api/routes_entries.py:2695 |
| `/{entry_id}` | GET | `get_entry` | src/memorymap/api/routes_entries.py:2454 |
| `/{entry_id}` | PUT | `update_entry` | src/memorymap/api/routes_entries.py:2562 |
| `/{entry_id}/archive` | POST | `archive_entry` | src/memorymap/api/routes_entries.py:2723 |
| `/{entry_id}/backlinks` | GET | `entry_backlinks` | src/memorymap/api/routes_mentions.py:155 |
| `/{entry_id}/bookmarks` | GET | `entry_bookmarks` | src/memorymap/api/routes_entries.py:2155 |
| `/{entry_id}/bookmarks` | POST | `attach_bookmark` | src/memorymap/api/routes_entries.py:2176 |
| `/{entry_id}/bookmarks/{bookmark_id}` | DELETE | `detach_bookmark` | src/memorymap/api/routes_entries.py:2196 |
| `/{entry_id}/connections` | GET | `entry_connections` | src/memorymap/api/routes_entries.py:3468 |
| `/{entry_id}/context` | POST | `add_context` | src/memorymap/api/routes_entries.py:1342 |
| `/{entry_id}/export.md` | GET | `export_entry` | src/memorymap/api/routes_entries.py:2531 |
| `/{entry_id}/filing` | GET | `filing_status` | src/memorymap/api/routes_entries.py:1127 |
| `/{entry_id}/filing` | POST | `decide_filing` | src/memorymap/api/routes_entries.py:1077 |
| `/{entry_id}/filing/stop` | POST | `stop_filing_one` | src/memorymap/api/routes_entries.py:1058 |
| `/{entry_id}/generate-title` | POST | `generate_entry_title` | src/memorymap/api/routes_entries.py:3383 |
| `/{entry_id}/history` | GET | `entry_history` | src/memorymap/api/routes_entries.py:3186 |
| `/{entry_id}/history/{revision_id}/restore` | POST | `restore_revision` | src/memorymap/api/routes_entries.py:3332 |
| `/{entry_id}/links` | POST | `create_link` | src/memorymap/api/routes_entries.py:3686 |
| `/{entry_id}/links/{link_id}` | DELETE | `delete_link` | src/memorymap/api/routes_entries.py:3711 |
| `/{entry_id}/links/{link_id}` | PATCH | `patch_link` | src/memorymap/api/routes_entries.py:3723 |
| `/{entry_id}/links/{link_id}/generate-reason` | POST | `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3766 |
| `/{entry_id}/links/{link_id}/reason` | PUT | `update_link_reason` | src/memorymap/api/routes_entries.py:3745 |
| `/{entry_id}/mentions/link` | POST | `link_mention` | src/memorymap/api/routes_mentions.py:171 |
| `/{entry_id}/privacy` | POST | `set_entry_privacy` | src/memorymap/api/routes_entries.py:3357 |
| `/{entry_id}/purge` | DELETE | `purge_entry` | src/memorymap/api/routes_entries.py:2742 |
| `/{entry_id}/reevaluate` | POST | `reevaluate_entry` | src/memorymap/api/routes_entries.py:1425 |
| `/{entry_id}/references` | GET | `entry_references` | src/memorymap/api/routes_entries.py:3140 |
| `/{entry_id}/related` | GET | `related_entries` | src/memorymap/api/routes_entries.py:2120 |
| `/{entry_id}/remove-title` | POST | `remove_entry_title` | src/memorymap/api/routes_entries.py:3430 |
| `/{entry_id}/restore` | POST | `restore_entry` | src/memorymap/api/routes_entries.py:2715 |
| `/{entry_id}/restore/{event_id}` | POST | `restore_event` | src/memorymap/api/routes_entries.py:3268 |
| `/{entry_id}/suggested-tags` | POST | `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1314 |
| `/{entry_id}/then-and-now` | GET | `then_and_now` | src/memorymap/api/routes_entries.py:3148 |
| `/{entry_id}/then-and-now` | POST | `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3173 |
| `/{entry_id}/unarchive` | POST | `unarchive_entry` | src/memorymap/api/routes_entries.py:2734 |
| `/{entry_id}/wiki-rename` | POST | `wiki_rename` | src/memorymap/api/routes_entries.py:2683 |
| `/{fact_id}` | DELETE | `delete_fact` | src/memorymap/api/routes_learned.py:313 |
| `/{fact_id}` | GET | `get_fact` | src/memorymap/api/routes_learned.py:275 |
| `/{fact_id}` | PATCH | `patch_fact` | src/memorymap/api/routes_learned.py:283 |
| `/{fact_id}` | POST | `set_state` | src/memorymap/api/routes_questions.py:65 |
| `/{fact_id}/reset` | POST | `reset_fact` | src/memorymap/api/routes_learned.py:302 |
| `/{key}` | DELETE | `delete_type` | src/memorymap/api/routes_relations.py:130 |
| `/{key}` | GET | `tidy_rows` | src/memorymap/api/routes_tidy.py:94 |
| `/{key}` | PATCH | `patch_type` | src/memorymap/api/routes_relations.py:110 |
| `/{key}/apply` | POST | `tidy_apply` | src/memorymap/api/routes_tidy.py:118 |
| `/{key}/dismiss` | POST | `tidy_dismiss` | src/memorymap/api/routes_tidy.py:104 |
| `/{key}/undismiss` | POST | `tidy_undismiss` | src/memorymap/api/routes_tidy.py:112 |
| `/{reminder_id}` | DELETE | `delete_reminder` | src/memorymap/api/routes_reminders.py:598 |
| `/{reminder_id}` | PUT | `update_reminder` | src/memorymap/api/routes_reminders.py:536 |
| `/{reminder_id}/complete` | POST | `complete_reminder` | src/memorymap/api/routes_reminders.py:566 |
| `/{reminder_id}/export.ics` | GET | `export_one_ics` | src/memorymap/api/routes_reminders.py:357 |
| `/{reminder_id}/purge` | DELETE | `purge_reminder` | src/memorymap/api/routes_reminders.py:629 |
| `/{reminder_id}/restore` | POST | `restore_reminder` | src/memorymap/api/routes_reminders.py:619 |
| `/{session_id}/audio` | POST | `audio` | src/memorymap/api/routes_captions.py:64 |
| `/{session_id}/stop` | POST | `stop` | src/memorymap/api/routes_captions.py:83 |
| `/{turn_id}` | DELETE | `delete_ask_turn` | src/memorymap/api/routes_ask_history.py:171 |
| `/{turn_id}` | GET | `get_ask_turn` | src/memorymap/api/routes_ask_history.py:91 |
| `/{turn_id}/pin` | PUT | `pin_ask_turn` | src/memorymap/api/routes_ask_history.py:163 |
| `PYODIDE_PATH + '{name}'` | GET | `pyodide_file` | src/memorymap/api/run_sandbox.py:1458 |

## Backend modules (4372)

Module-level `def`, `async def` and `class` in `src/memorymap/**/*.py`, excluding `vendor/`, grouped by file.

### src/memorymap/__main__.py (48)

| Name | File:line |
|---|---|
| `_ancestor_console_hwnds` | src/memorymap/__main__.py:1249 |
| `_apply_console_visibility` | src/memorymap/__main__.py:1380 |
| `_boot_and_swap` | src/memorymap/__main__.py:1011 |
| `_bootloader_splash` | src/memorymap/__main__.py:707 |
| `_bring_forward` | src/memorymap/__main__.py:1574 |
| `_capture` | src/memorymap/__main__.py:2470 |
| `_claim_notebook` | src/memorymap/__main__.py:990 |
| `_close_bootloader_splash` | src/memorymap/__main__.py:745 |
| `_close_launch_splash` | src/memorymap/__main__.py:763 |
| `_console_window_targets` | src/memorymap/__main__.py:1365 |
| `_desktop_port` | src/memorymap/__main__.py:934 |
| `_ensure_std_streams` | src/memorymap/__main__.py:428 |
| `_existing_instance` | src/memorymap/__main__.py:1585 |
| `_export_markdown` | src/memorymap/__main__.py:2309 |
| `_finish_splash_start_step` | src/memorymap/__main__.py:792 |
| `_focus_window` | src/memorymap/__main__.py:1063 |
| `_get_console_hwnd` | src/memorymap/__main__.py:1095 |
| `_hand_off_to_running` | src/memorymap/__main__.py:1599 |
| `_loading_html` | src/memorymap/__main__.py:363 |
| `_mark_start_step_done` | src/memorymap/__main__.py:862 |
| `_maybe_relaunch_hidden` | src/memorymap/__main__.py:1210 |
| `_open_window_onto` | src/memorymap/__main__.py:1631 |
| `_password_exists` | src/memorymap/__main__.py:2348 |
| `_port_from_env` | src/memorymap/__main__.py:35 |
| `_port_holder` | src/memorymap/__main__.py:878 |
| `_push_status_to_window` | src/memorymap/__main__.py:845 |
| `_pythonw_path` | src/memorymap/__main__.py:1113 |
| `_recolour_loading_page` | src/memorymap/__main__.py:330 |
| `_repair_install` | src/memorymap/__main__.py:2431 |
| `_replace_process` | src/memorymap/__main__.py:1450 |
| `_reset_password` | src/memorymap/__main__.py:2361 |
| `_run_desktop` | src/memorymap/__main__.py:1658 |
| `_run_server` | src/memorymap/__main__.py:455 |
| `_run_server_holding_lock` | src/memorymap/__main__.py:2579 |
| `_serve_with_lan` | src/memorymap/__main__.py:539 |
| `_serves_this_notebook` | src/memorymap/__main__.py:917 |
| `_spawn_desktop` | src/memorymap/__main__.py:1124 |
| `_splash_status` | src/memorymap/__main__.py:730 |
| `_start_tray` | src/memorymap/__main__.py:1977 |
| `_stop_background_work` | src/memorymap/__main__.py:1416 |
| `_stop_lingering_worker_threads` | src/memorymap/__main__.py:642 |
| `_wait_for_server` | src/memorymap/__main__.py:678 |
| `_wait_for_server_with_progress` | src/memorymap/__main__.py:962 |
| `_warn_webview2_missing` | src/memorymap/__main__.py:1540 |
| `_webview2_runtime_missing` | src/memorymap/__main__.py:1476 |
| `_window_class_name` | src/memorymap/__main__.py:1349 |
| `main` | src/memorymap/__main__.py:2488 |
| `restart_in_console_mode` | src/memorymap/__main__.py:1192 |

### src/memorymap/ai/act_registry.py (7)

| Name | File:line |
|---|---|
| `Act` | src/memorymap/ai/act_registry.py:50 |
| `act_topic` | src/memorymap/ai/act_registry.py:256 |
| `ask_line` | src/memorymap/ai/act_registry.py:127 |
| `capability_line` | src/memorymap/ai/act_registry.py:114 |
| `guide_topic` | src/memorymap/ai/act_registry.py:142 |
| `palette_rows` | src/memorymap/ai/act_registry.py:134 |
| `propose` | src/memorymap/ai/act_registry.py:38 |

### src/memorymap/ai/acts.py (12)

| Name | File:line |
|---|---|
| `_align_slots` | src/memorymap/ai/acts.py:145 |
| `_distribute_slots` | src/memorymap/ai/acts.py:150 |
| `_grid_slots` | src/memorymap/ai/acts.py:135 |
| `_same_size_slots` | src/memorymap/ai/acts.py:155 |
| `board_label` | src/memorymap/ai/acts.py:182 |
| `board_parse` | src/memorymap/ai/acts.py:163 |
| `inverse` | src/memorymap/ai/acts.py:75 |
| `missing` | src/memorymap/ai/acts.py:57 |
| `parse` | src/memorymap/ai/acts.py:51 |
| `preview` | src/memorymap/ai/acts.py:63 |
| `propose` | src/memorymap/ai/acts.py:84 |
| `run` | src/memorymap/ai/acts.py:69 |

### src/memorymap/ai/agent.py (49)

| Name | File:line |
|---|---|
| `SizeTier` | src/memorymap/ai/agent.py:55 |
| `_TurnCard` | src/memorymap/ai/agent.py:168 |
| `_TurnPlan` | src/memorymap/ai/agent.py:1655 |
| `_TurnState` | src/memorymap/ai/agent.py:1951 |
| `_bare_host` | src/memorymap/ai/agent.py:1302 |
| `_change_category_name` | src/memorymap/ai/agent.py:1090 |
| `_change_diff` | src/memorymap/ai/agent.py:2349 |
| `_change_document_id` | src/memorymap/ai/agent.py:1046 |
| `_change_note_id` | src/memorymap/ai/agent.py:1028 |
| `_change_reminder_id` | src/memorymap/ai/agent.py:1068 |
| `_check_sources` | src/memorymap/ai/agent.py:234 |
| `_cleared_page` | src/memorymap/ai/agent.py:1333 |
| `_clip_strings` | src/memorymap/ai/agent.py:2022 |
| `_copies_what_was_read` | src/memorymap/ai/agent.py:1588 |
| `_dispatch_call` | src/memorymap/ai/agent.py:2458 |
| `_finish_handover` | src/memorymap/ai/agent.py:2306 |
| `_first_round_tools` | src/memorymap/ai/agent.py:2163 |
| `_fit_result` | src/memorymap/ai/agent.py:2033 |
| `_focus` | src/memorymap/ai/agent.py:1635 |
| `_hosts_named` | src/memorymap/ai/agent.py:1307 |
| `_labelled` | src/memorymap/ai/agent.py:246 |
| `_names_an_existing_category` | src/memorymap/ai/agent.py:2141 |
| `_page_key` | src/memorymap/ai/agent.py:1286 |
| `_picture_in_hand` | src/memorymap/ai/agent.py:1609 |
| `_plan_writes` | src/memorymap/ai/agent.py:2326 |
| `_plans` | src/memorymap/ai/agent.py:2342 |
| `_prefetch_outbound` | src/memorymap/ai/agent.py:2070 |
| `_prepare_turn` | src/memorymap/ai/agent.py:1683 |
| `_recent_text` | src/memorymap/ai/agent.py:1548 |
| `_recovery_hint` | src/memorymap/ai/agent.py:680 |
| `_requires_a_call` | src/memorymap/ai/agent.py:2098 |
| `_result_summary` | src/memorymap/ai/agent.py:749 |
| `_result_urls` | src/memorymap/ai/agent.py:1312 |
| `_round_stream` | src/memorymap/ai/agent.py:2211 |
| `_run_and_record` | src/memorymap/ai/agent.py:2356 |
| `_seen_ids` | src/memorymap/ai/agent.py:869 |
| `_tool_event` | src/memorymap/ai/agent.py:2223 |
| `_tool_events` | src/memorymap/ai/agent.py:2288 |
| `_tool_sources` | src/memorymap/ai/agent.py:916 |
| `_touched_items` | src/memorymap/ai/agent.py:806 |
| `_touched_kind` | src/memorymap/ai/agent.py:788 |
| `_wrap_up_round` | src/memorymap/ai/agent.py:2761 |
| `announces_unacted_tool` | src/memorymap/ai/agent.py:297 |
| `build_agent_messages` | src/memorymap/ai/agent.py:1346 |
| `plan_now` | src/memorymap/ai/agent.py:2333 |
| `run_agent` | src/memorymap/ai/agent.py:2798 |
| `size_tier` | src/memorymap/ai/agent.py:88 |
| `tools_guide` | src/memorymap/ai/agent.py:510 |
| `unsupported_claims` | src/memorymap/ai/agent.py:1219 |

### src/memorymap/ai/answer_trim.py (5)

| Name | File:line |
|---|---|
| `_is_only_opener` | src/memorymap/ai/answer_trim.py:97 |
| `_strip_closers` | src/memorymap/ai/answer_trim.py:108 |
| `_strip_opener` | src/memorymap/ai/answer_trim.py:76 |
| `strip_prompt_metadata` | src/memorymap/ai/answer_trim.py:151 |
| `trim_assistant_padding` | src/memorymap/ai/answer_trim.py:158 |

### src/memorymap/ai/arithmetic.py (5)

| Name | File:line |
|---|---|
| `NotArithmetic` | src/memorymap/ai/arithmetic.py:43 |
| `_walk` | src/memorymap/ai/arithmetic.py:47 |
| `evaluate` | src/memorymap/ai/arithmetic.py:69 |
| `spoken` | src/memorymap/ai/arithmetic.py:98 |
| `sum_in` | src/memorymap/ai/arithmetic.py:84 |

### src/memorymap/ai/autonomous.py (23)

| Name | File:line |
|---|---|
| `_enabled_tasks` | src/memorymap/ai/autonomous.py:255 |
| `_loop` | src/memorymap/ai/autonomous.py:762 |
| `_optimization_pass` | src/memorymap/ai/autonomous.py:301 |
| `_remember_pass` | src/memorymap/ai/autonomous.py:624 |
| `_run_optimization` | src/memorymap/ai/autonomous.py:266 |
| `_vacuum` | src/memorymap/ai/autonomous.py:655 |
| `cancelled` | src/memorymap/ai/autonomous.py:164 |
| `clean_orphaned_board_cards` | src/memorymap/ai/autonomous.py:729 |
| `clear_snooze` | src/memorymap/ai/autonomous.py:226 |
| `forget_last_pass` | src/memorymap/ai/autonomous.py:649 |
| `freeze_hold` | src/memorymap/ai/autonomous.py:196 |
| `is_running` | src/memorymap/ai/autonomous.py:154 |
| `last_pass` | src/memorymap/ai/autonomous.py:639 |
| `purge_old_conversations` | src/memorymap/ai/autonomous.py:675 |
| `request_stop` | src/memorymap/ai/autonomous.py:173 |
| `reset_state` | src/memorymap/ai/autonomous.py:233 |
| `scheduler_alive` | src/memorymap/ai/autonomous.py:249 |
| `snoozed_for` | src/memorymap/ai/autonomous.py:214 |
| `start` | src/memorymap/ai/autonomous.py:821 |
| `stop` | src/memorymap/ai/autonomous.py:835 |
| `thaw_hold` | src/memorymap/ai/autonomous.py:206 |
| `trigger_now` | src/memorymap/ai/autonomous.py:863 |
| `wake` | src/memorymap/ai/autonomous.py:851 |

### src/memorymap/ai/bench.py (13)

| Name | File:line |
|---|---|
| `Failure` | src/memorymap/ai/bench.py:121 |
| `Item` | src/memorymap/ai/bench.py:105 |
| `ModelScore` | src/memorymap/ai/bench.py:139 |
| `_Stop` | src/memorymap/ai/bench.py:269 |
| `_candidates` | src/memorymap/ai/bench.py:220 |
| `_tokens` | src/memorymap/ai/bench.py:275 |
| `_words` | src/memorymap/ai/bench.py:216 |
| `build_set` | src/memorymap/ai/bench.py:236 |
| `citation_score` | src/memorymap/ai/bench.py:180 |
| `cited_numbers` | src/memorymap/ai/bench.py:209 |
| `filing_right` | src/memorymap/ai/bench.py:197 |
| `fingerprint` | src/memorymap/ai/bench.py:262 |
| `run` | src/memorymap/ai/bench.py:282 |

### src/memorymap/ai/budget.py (4)

| Name | File:line |
|---|---|
| `RunBudget` | src/memorymap/ai/budget.py:85 |
| `current` | src/memorymap/ai/budget.py:156 |
| `from_settings` | src/memorymap/ai/budget.py:202 |
| `spending` | src/memorymap/ai/budget.py:166 |

### src/memorymap/ai/captioning.py (7)

| Name | File:line |
|---|---|
| `caption_and_store` | src/memorymap/ai/captioning.py:263 |
| `caption_in_background` | src/memorymap/ai/captioning.py:332 |
| `caption_text` | src/memorymap/ai/captioning.py:238 |
| `describe_document` | src/memorymap/ai/captioning.py:130 |
| `page_caption_prompt` | src/memorymap/ai/captioning.py:191 |
| `page_caption_text` | src/memorymap/ai/captioning.py:201 |
| `running_captions` | src/memorymap/ai/captioning.py:50 |

### src/memorymap/ai/captions.py (15)

| Name | File:line |
|---|---|
| `CaptionsError` | src/memorymap/ai/captions.py:79 |
| `Session` | src/memorymap/ai/captions.py:156 |
| `_clean` | src/memorymap/ai/captions.py:145 |
| `_http` | src/memorymap/ai/captions.py:101 |
| `_is_local` | src/memorymap/ai/captions.py:91 |
| `_rms` | src/memorymap/ai/captions.py:127 |
| `begin` | src/memorymap/ai/captions.py:299 |
| `end` | src/memorymap/ai/captions.py:325 |
| `expired` | src/memorymap/ai/captions.py:334 |
| `get` | src/memorymap/ai/captions.py:320 |
| `helper_url` | src/memorymap/ai/captions.py:83 |
| `infer` | src/memorymap/ai/captions.py:269 |
| `model_label` | src/memorymap/ai/captions.py:87 |
| `status` | src/memorymap/ai/captions.py:108 |
| `wav_of` | src/memorymap/ai/captions.py:135 |

### src/memorymap/ai/cards.py (16)

| Name | File:line |
|---|---|
| `_B` | src/memorymap/ai/cards.py:237 |
| `_D` | src/memorymap/ai/cards.py:229 |
| `_F` | src/memorymap/ai/cards.py:233 |
| `_N` | src/memorymap/ai/cards.py:225 |
| `_R` | src/memorymap/ai/cards.py:241 |
| `_Where` | src/memorymap/ai/cards.py:208 |
| `_board_item` | src/memorymap/ai/cards.py:160 |
| `_clip` | src/memorymap/ai/cards.py:84 |
| `_document_item` | src/memorymap/ai/cards.py:119 |
| `_file_item` | src/memorymap/ai/cards.py:134 |
| `_first_text` | src/memorymap/ai/cards.py:89 |
| `_flat` | src/memorymap/ai/cards.py:80 |
| `_note_item` | src/memorymap/ai/cards.py:101 |
| `_reminder_item` | src/memorymap/ai/cards.py:182 |
| `_rows` | src/memorymap/ai/cards.py:359 |
| `result_cards` | src/memorymap/ai/cards.py:366 |

### src/memorymap/ai/chunks.py (4)

| Name | File:line |
|---|---|
| `_blocks_with_offsets` | src/memorymap/ai/chunks.py:37 |
| `_split_long` | src/memorymap/ai/chunks.py:53 |
| `_word_count` | src/memorymap/ai/chunks.py:33 |
| `paragraph_chunks` | src/memorymap/ai/chunks.py:78 |

### src/memorymap/ai/commands.py (47)

| Name | File:line |
|---|---|
| `Command` | src/memorymap/ai/commands.py:517 |
| `__getattr__` | src/memorymap/ai/commands.py:59 |
| `_append` | src/memorymap/ai/commands.py:471 |
| `_attached` | src/memorymap/ai/commands.py:594 |
| `_bin_reminder` | src/memorymap/ai/commands.py:934 |
| `_cap` | src/memorymap/ai/commands.py:111 |
| `_card` | src/memorymap/ai/commands.py:650 |
| `_clip` | src/memorymap/ai/commands.py:876 |
| `_clock` | src/memorymap/ai/commands.py:685 |
| `_content_words` | src/memorymap/ai/commands.py:561 |
| `_delete` | src/memorymap/ai/commands.py:406 |
| `_drop_article` | src/memorymap/ai/commands.py:116 |
| `_existing_category` | src/memorymap/ai/commands.py:614 |
| `_find` | src/memorymap/ai/commands.py:329 |
| `_fold` | src/memorymap/ai/commands.py:89 |
| `_link` | src/memorymap/ai/commands.py:442 |
| `_meeting` | src/memorymap/ai/commands.py:357 |
| `_move` | src/memorymap/ai/commands.py:272 |
| `_navigate` | src/memorymap/ai/commands.py:380 |
| `_new_note` | src/memorymap/ai/commands.py:305 |
| `_notes_about` | src/memorymap/ai/commands.py:568 |
| `_one_target` | src/memorymap/ai/commands.py:392 |
| `_pin` | src/memorymap/ai/commands.py:418 |
| `_plan_one` | src/memorymap/ai/commands.py:835 |
| `_plan_read` | src/memorymap/ai/commands.py:880 |
| `_reminder` | src/memorymap/ai/commands.py:191 |
| `_reminder_note` | src/memorymap/ai/commands.py:713 |
| `_rename` | src/memorymap/ai/commands.py:456 |
| `_resolve_one` | src/memorymap/ai/commands.py:815 |
| `_split_allowed` | src/memorymap/ai/commands.py:624 |
| `_split_last` | src/memorymap/ai/commands.py:124 |
| `_start_meeting` | src/memorymap/ai/commands.py:919 |
| `_summarise` | src/memorymap/ai/commands.py:486 |
| `_tag` | src/memorymap/ai/commands.py:239 |
| `_tags` | src/memorymap/ai/commands.py:172 |
| `_target` | src/memorymap/ai/commands.py:146 |
| `_title` | src/memorymap/ai/commands.py:605 |
| `_untag` | src/memorymap/ai/commands.py:427 |
| `_when_words` | src/memorymap/ai/commands.py:681 |
| `_which` | src/memorymap/ai/commands.py:637 |
| `not_done` | src/memorymap/ai/commands.py:664 |
| `parse` | src/memorymap/ai/commands.py:529 |
| `plan` | src/memorymap/ai/commands.py:726 |
| `read` | src/memorymap/ai/commands.py:496 |
| `reminder_when` | src/memorymap/ai/commands.py:694 |
| `run` | src/memorymap/ai/commands.py:941 |
| `summarise_done` | src/memorymap/ai/commands.py:672 |

### src/memorymap/ai/composer.py (126)

| Name | File:line |
|---|---|
| `Dialogue` | src/memorymap/ai/composer.py:2699 |
| `FollowOn` | src/memorymap/ai/composer.py:2517 |
| `NoteView` | src/memorymap/ai/composer.py:701 |
| `Plan` | src/memorymap/ai/composer.py:3180 |
| `Sentence` | src/memorymap/ai/composer.py:675 |
| `_Answer` | src/memorymap/ai/composer.py:1278 |
| `_Meaning` | src/memorymap/ai/composer.py:1169 |
| `_WORDED_PHRASES` | src/memorymap/ai/composer.py:2760 |
| `_absent` | src/memorymap/ai/composer.py:3648 |
| `_alternatives` | src/memorymap/ai/composer.py:602 |
| `_answer_turn` | src/memorymap/ai/composer.py:3768 |
| `_as_typed` | src/memorymap/ai/composer.py:3658 |
| `_asked_span` | src/memorymap/ai/composer.py:2184 |
| `_body` | src/memorymap/ai/composer.py:2321 |
| `_brief_text` | src/memorymap/ai/composer.py:4047 |
| `_broad_pool` | src/memorymap/ai/composer.py:2300 |
| `_build_synonyms` | src/memorymap/ai/composer.py:593 |
| `_clarify` | src/memorymap/ai/composer.py:2838 |
| `_clusters` | src/memorymap/ai/composer.py:1921 |
| `_compare` | src/memorymap/ai/composer.py:2114 |
| `_compose` | src/memorymap/ai/composer.py:3777 |
| `_confirmed_lead` | src/memorymap/ai/composer.py:2218 |
| `_count_word` | src/memorymap/ai/composer.py:1532 |
| `_cue` | src/memorymap/ai/composer.py:999 |
| `_did_you_mean` | src/memorymap/ai/composer.py:3640 |
| `_disagreement` | src/memorymap/ai/composer.py:2046 |
| `_disagreements` | src/memorymap/ai/composer.py:2054 |
| `_distinct_ids` | src/memorymap/ai/composer.py:888 |
| `_due` | src/memorymap/ai/composer.py:1518 |
| `_earlier` | src/memorymap/ai/composer.py:2026 |
| `_filtered` | src/memorymap/ai/composer.py:3623 |
| `_fit_terms` | src/memorymap/ai/composer.py:2898 |
| `_follow_one` | src/memorymap/ai/composer.py:2585 |
| `_fusable` | src/memorymap/ai/composer.py:1697 |
| `_help_answer` | src/memorymap/ai/composer.py:3252 |
| `_holds` | src/memorymap/ai/composer.py:607 |
| `_in_window` | src/memorymap/ai/composer.py:3345 |
| `_insight_close` | src/memorymap/ai/composer.py:2237 |
| `_insight_lead` | src/memorymap/ai/composer.py:2256 |
| `_insights_for` | src/memorymap/ai/composer.py:2197 |
| `_jaccard` | src/memorymap/ai/composer.py:1089 |
| `_joined` | src/memorymap/ai/composer.py:1715 |
| `_lead_block` | src/memorymap/ai/composer.py:1870 |
| `_list_block` | src/memorymap/ai/composer.py:1743 |
| `_list_sentence` | src/memorymap/ai/composer.py:1732 |
| `_lowered` | src/memorymap/ai/composer.py:1571 |
| `_mentions` | src/memorymap/ai/composer.py:2268 |
| `_missing` | src/memorymap/ai/composer.py:2083 |
| `_month` | src/memorymap/ai/composer.py:3419 |
| `_multi` | src/memorymap/ai/composer.py:2798 |
| `_named_notes` | src/memorymap/ai/composer.py:2531 |
| `_newest` | src/memorymap/ai/composer.py:2394 |
| `_next_questions` | src/memorymap/ai/composer.py:2422 |
| `_nothing` | src/memorymap/ai/composer.py:3664 |
| `_one_syllable_cvc` | src/memorymap/ai/composer.py:523 |
| `_opening` | src/memorymap/ai/composer.py:1805 |
| `_others` | src/memorymap/ai/composer.py:1945 |
| `_overview_answer` | src/memorymap/ai/composer.py:3386 |
| `_overview_bullets` | src/memorymap/ai/composer.py:3509 |
| `_overview_groups` | src/memorymap/ai/composer.py:3493 |
| `_overview_lead` | src/memorymap/ai/composer.py:3470 |
| `_overview_line` | src/memorymap/ai/composer.py:3525 |
| `_overview_links` | src/memorymap/ai/composer.py:3561 |
| `_overview_list` | src/memorymap/ai/composer.py:3546 |
| `_overview_name_chip` | src/memorymap/ai/composer.py:3587 |
| `_overview_next` | src/memorymap/ai/composer.py:3573 |
| `_overview_over_broad` | src/memorymap/ai/composer.py:3444 |
| `_overview_subject` | src/memorymap/ai/composer.py:3426 |
| `_overview_tag_chip` | src/memorymap/ai/composer.py:3599 |
| `_pick` | src/memorymap/ai/composer.py:1547 |
| `_picture_run` | src/memorymap/ai/composer.py:1669 |
| `_picture_said` | src/memorymap/ai/composer.py:1641 |
| `_picture_spans` | src/memorymap/ai/composer.py:847 |
| `_picture_units` | src/memorymap/ai/composer.py:865 |
| `_quoted_lines` | src/memorymap/ai/composer.py:1661 |
| `_quotes` | src/memorymap/ai/composer.py:1603 |
| `_raw` | src/memorymap/ai/composer.py:3947 |
| `_readings` | src/memorymap/ai/composer.py:2877 |
| `_recall` | src/memorymap/ai/composer.py:3353 |
| `_recall_next` | src/memorymap/ai/composer.py:3611 |
| `_relation` | src/memorymap/ai/composer.py:1904 |
| `_respell` | src/memorymap/ai/composer.py:458 |
| `_result` | src/memorymap/ai/composer.py:3319 |
| `_said_before` | src/memorymap/ai/composer.py:1796 |
| `_said_insight` | src/memorymap/ai/composer.py:2211 |
| `_said_with_before` | src/memorymap/ai/composer.py:1635 |
| `_score` | src/memorymap/ai/composer.py:1021 |
| `_sentence_case` | src/memorymap/ai/composer.py:1707 |
| `_span` | src/memorymap/ai/composer.py:1852 |
| `_span_of` | src/memorymap/ai/composer.py:3457 |
| `_standing` | src/memorymap/ai/composer.py:2572 |
| `_stem` | src/memorymap/ai/composer.py:533 |
| `_subject_stems` | src/memorymap/ai/composer.py:3438 |
| `_summary` | src/memorymap/ai/composer.py:2287 |
| `_templates_in` | src/memorymap/ai/composer.py:2750 |
| `_time_phrase` | src/memorymap/ai/composer.py:3198 |
| `_timeline` | src/memorymap/ai/composer.py:2004 |
| `_title` | src/memorymap/ai/composer.py:781 |
| `_unit` | src/memorymap/ai/composer.py:799 |
| `_unlike_before` | src/memorymap/ai/composer.py:1789 |
| `_utility` | src/memorymap/ai/composer.py:3335 |
| `_was_said` | src/memorymap/ai/composer.py:1080 |
| `_with_context` | src/memorymap/ai/composer.py:1587 |
| `_without_length` | src/memorymap/ai/composer.py:2509 |
| `_words` | src/memorymap/ai/composer.py:616 |
| `_written` | src/memorymap/ai/composer.py:763 |
| `_yes_no_wrapped` | src/memorymap/ai/composer.py:487 |
| `brief` | src/memorymap/ai/composer.py:3953 |
| `centrality` | src/memorymap/ai/composer.py:1226 |
| `classify` | src/memorymap/ai/composer.py:492 |
| `compare_sides` | src/memorymap/ai/composer.py:660 |
| `compose` | src/memorymap/ai/composer.py:3689 |
| `disagree` | src/memorymap/ai/composer.py:1257 |
| `follow_on` | src/memorymap/ai/composer.py:2542 |
| `help_line` | src/memorymap/ai/composer.py:3285 |
| `length_wish` | src/memorymap/ai/composer.py:2170 |
| `phrase_options` | src/memorymap/ai/composer.py:317 |
| `plan` | src/memorymap/ai/composer.py:3203 |
| `read_note` | src/memorymap/ai/composer.py:909 |
| `rephrase` | src/memorymap/ai/composer.py:465 |
| `select` | src/memorymap/ai/composer.py:1094 |
| `social` | src/memorymap/ai/composer.py:3125 |
| `social_kind` | src/memorymap/ai/composer.py:3116 |
| `source_kind` | src/memorymap/ai/composer.py:901 |
| `split_parts` | src/memorymap/ai/composer.py:2781 |
| `subject_terms` | src/memorymap/ai/composer.py:623 |

### src/memorymap/ai/composer_overview.py (13)

| Name | File:line |
|---|---|
| `_head_word` | src/memorymap/ai/composer_overview.py:116 |
| `_holding` | src/memorymap/ai/composer_overview.py:63 |
| `_list_line` | src/memorymap/ai/composer_overview.py:218 |
| `_names` | src/memorymap/ai/composer_overview.py:112 |
| `_phrase` | src/memorymap/ai/composer_overview.py:232 |
| `_prose_line` | src/memorymap/ai/composer_overview.py:187 |
| `_wider` | src/memorymap/ai/composer_overview.py:91 |
| `best_line` | src/memorymap/ai/composer_overview.py:204 |
| `members` | src/memorymap/ai/composer_overview.py:73 |
| `names_by_note` | src/memorymap/ai/composer_overview.py:122 |
| `shared_names` | src/memorymap/ai/composer_overview.py:171 |
| `themes` | src/memorymap/ai/composer_overview.py:149 |
| `topic` | src/memorymap/ai/composer_overview.py:49 |

### src/memorymap/ai/composer_tables.py (2)

| Name | File:line |
|---|---|
| `_build` | src/memorymap/ai/composer_tables.py:751 |
| `voice_of` | src/memorymap/ai/composer_tables.py:33 |

### src/memorymap/ai/composer_voice.py (22)

| Name | File:line |
|---|---|
| `_Voice` | src/memorymap/ai/composer_voice.py:181 |
| `_back` | src/memorymap/ai/composer_voice.py:298 |
| `_clip` | src/memorymap/ai/composer_voice.py:226 |
| `_day` | src/memorymap/ai/composer_voice.py:255 |
| `_due` | src/memorymap/ai/composer_voice.py:274 |
| `_empty_day` | src/memorymap/ai/composer_voice.py:432 |
| `_on_this_day` | src/memorymap/ai/composer_voice.py:313 |
| `_open_items` | src/memorymap/ai/composer_voice.py:336 |
| `_patterns` | src/memorymap/ai/composer_voice.py:371 |
| `_salt` | src/memorymap/ai/composer_voice.py:267 |
| `_surface` | src/memorymap/ai/composer_voice.py:361 |
| `_this_week` | src/memorymap/ai/composer_voice.py:357 |
| `_views` | src/memorymap/ai/composer_voice.py:251 |
| `_week_count` | src/memorymap/ai/composer_voice.py:414 |
| `asks` | src/memorymap/ai/composer_voice.py:576 |
| `lead` | src/memorymap/ai/composer_voice.py:237 |
| `one_line` | src/memorymap/ai/composer_voice.py:588 |
| `remarks` | src/memorymap/ai/composer_voice.py:448 |
| `suggested_searches` | src/memorymap/ai/composer_voice.py:667 |
| `title_for` | src/memorymap/ai/composer_voice.py:639 |
| `today_line` | src/memorymap/ai/composer_voice.py:490 |
| `week_review` | src/memorymap/ai/composer_voice.py:519 |

### src/memorymap/ai/context.py (6)

| Name | File:line |
|---|---|
| `ContextBudget` | src/memorymap/ai/context.py:104 |
| `_wide` | src/memorymap/ai/context.py:59 |
| `fit_history` | src/memorymap/ai/context.py:205 |
| `fit_notes` | src/memorymap/ai/context.py:184 |
| `plan` | src/memorymap/ai/context.py:143 |
| `weighted_len` | src/memorymap/ai/context.py:64 |

### src/memorymap/ai/day_digest.py (9)

| Name | File:line |
|---|---|
| `_changed` | src/memorymap/ai/day_digest.py:100 |
| `_cut` | src/memorymap/ai/day_digest.py:44 |
| `_due` | src/memorymap/ai/day_digest.py:60 |
| `_first_line` | src/memorymap/ai/day_digest.py:36 |
| `_naive` | src/memorymap/ai/day_digest.py:32 |
| `_notes` | src/memorymap/ai/day_digest.py:56 |
| `_questions` | src/memorymap/ai/day_digest.py:85 |
| `_quiet` | src/memorymap/ai/day_digest.py:123 |
| `compose` | src/memorymap/ai/day_digest.py:146 |

### src/memorymap/ai/docreader.py (3)

| Name | File:line |
|---|---|
| `_fill_if_empty` | src/memorymap/ai/docreader.py:130 |
| `read_document_and_store` | src/memorymap/ai/docreader.py:41 |
| `read_in_background` | src/memorymap/ai/docreader.py:144 |

### src/memorymap/ai/drafter.py (14)

| Name | File:line |
|---|---|
| `_kind_prompt` | src/memorymap/ai/drafter.py:174 |
| `_parse_rephrasings` | src/memorymap/ai/drafter.py:562 |
| `_sources_block` | src/memorymap/ai/drafter.py:225 |
| `_steer` | src/memorymap/ai/drafter.py:209 |
| `build_messages` | src/memorymap/ai/drafter.py:248 |
| `compose` | src/memorymap/ai/drafter.py:282 |
| `compose_document_edit` | src/memorymap/ai/drafter.py:428 |
| `compose_stream` | src/memorymap/ai/drafter.py:319 |
| `offline_message` | src/memorymap/ai/drafter.py:31 |
| `parse_review_line` | src/memorymap/ai/drafter.py:616 |
| `rephrase` | src/memorymap/ai/drafter.py:521 |
| `review_stream` | src/memorymap/ai/drafter.py:647 |
| `suggest_title` | src/memorymap/ai/drafter.py:484 |
| `was_offline` | src/memorymap/ai/drafter.py:38 |

### src/memorymap/ai/embeddings.py (22)

| Name | File:line |
|---|---|
| `EmbeddingCacheBroken` | src/memorymap/ai/embeddings.py:50 |
| `EmbeddingService` | src/memorymap/ai/embeddings.py:650 |
| `_PinnedModels` | src/memorymap/ai/embeddings.py:1120 |
| `_backfill_chunks` | src/memorymap/ai/embeddings.py:360 |
| `_backfill_missing` | src/memorymap/ai/embeddings.py:302 |
| `_digest` | src/memorymap/ai/embeddings.py:546 |
| `_limit_torch_threads` | src/memorymap/ai/embeddings.py:261 |
| `_notebook_has_notes` | src/memorymap/ai/embeddings.py:101 |
| `_wait_for_idle` | src/memorymap/ai/embeddings.py:90 |
| `backfill_missing` | src/memorymap/ai/embeddings.py:278 |
| `bytes_to_vector` | src/memorymap/ai/embeddings.py:557 |
| `chunk_text` | src/memorymap/ai/embeddings.py:533 |
| `clean_orphaned_vectors` | src/memorymap/ai/embeddings.py:403 |
| `cosine_similarity` | src/memorymap/ai/embeddings.py:563 |
| `embed_threads` | src/memorymap/ai/embeddings.py:251 |
| `embedding_text` | src/memorymap/ai/embeddings.py:448 |
| `note_request` | src/memorymap/ai/embeddings.py:84 |
| `similar_pairs` | src/memorymap/ai/embeddings.py:584 |
| `start_warmup` | src/memorymap/ai/embeddings.py:121 |
| `vector_to_bytes` | src/memorymap/ai/embeddings.py:550 |
| `warmup_failed` | src/memorymap/ai/embeddings.py:399 |
| `warmup_running` | src/memorymap/ai/embeddings.py:395 |

### src/memorymap/ai/entities.py (10)

| Name | File:line |
|---|---|
| `MergeUndoError` | src/memorymap/ai/entities.py:247 |
| `_entity_state` | src/memorymap/ai/entities.py:198 |
| `_find_or_create_entity` | src/memorymap/ai/entities.py:114 |
| `_survivor` | src/memorymap/ai/entities.py:149 |
| `extract_entities_pass` | src/memorymap/ai/entities.py:310 |
| `merge_entities` | src/memorymap/ai/entities.py:159 |
| `merge_with_undo` | src/memorymap/ai/entities.py:208 |
| `suggest_entities` | src/memorymap/ai/entities.py:104 |
| `suggest_entities_with_kinds` | src/memorymap/ai/entities.py:60 |
| `undo_merge` | src/memorymap/ai/entities.py:256 |

### src/memorymap/ai/extractive.py (4)

| Name | File:line |
|---|---|
| `_trim` | src/memorymap/ai/extractive.py:68 |
| `answer` | src/memorymap/ai/extractive.py:123 |
| `passages_for` | src/memorymap/ai/extractive.py:82 |
| `recent` | src/memorymap/ai/extractive.py:164 |

### src/memorymap/ai/extractor.py (9)

| Name | File:line |
|---|---|
| `ExtractedNote` | src/memorymap/ai/extractor.py:123 |
| `_extract_json_object` | src/memorymap/ai/extractor.py:128 |
| `_reason_for` | src/memorymap/ai/extractor.py:221 |
| `_short_preview` | src/memorymap/ai/extractor.py:216 |
| `build_extraction` | src/memorymap/ai/extractor.py:275 |
| `find_related` | src/memorymap/ai/extractor.py:238 |
| `merge_near_duplicates` | src/memorymap/ai/extractor.py:180 |
| `offline_message` | src/memorymap/ai/extractor.py:103 |
| `propose_split` | src/memorymap/ai/extractor.py:145 |

### src/memorymap/ai/factgraph.py (16)

| Name | File:line |
|---|---|
| `Fact` | src/memorymap/ai/factgraph.py:42 |
| `_date_value` | src/memorymap/ai/factgraph.py:300 |
| `_inside` | src/memorymap/ai/factgraph.py:257 |
| `_mode` | src/memorymap/ai/factgraph.py:261 |
| `_note_facts` | src/memorymap/ai/factgraph.py:317 |
| `_object` | src/memorymap/ai/factgraph.py:277 |
| `_past_forms` | src/memorymap/ai/factgraph.py:106 |
| `_quoted_spans` | src/memorymap/ai/factgraph.py:242 |
| `_revision` | src/memorymap/ai/factgraph.py:519 |
| `_sentence_tense` | src/memorymap/ai/factgraph.py:306 |
| `_tables` | src/memorymap/ai/factgraph.py:131 |
| `_topics` | src/memorymap/ai/factgraph.py:504 |
| `_units` | src/memorymap/ai/factgraph.py:205 |
| `_written` | src/memorymap/ai/factgraph.py:195 |
| `facts` | src/memorymap/ai/factgraph.py:526 |
| `of_kind` | src/memorymap/ai/factgraph.py:540 |

### src/memorymap/ai/facts.py (48)

| Name | File:line |
|---|---|
| `Candidate` | src/memorymap/ai/facts.py:176 |
| `_Similar` | src/memorymap/ai/facts.py:765 |
| `_answered_next` | src/memorymap/ai/facts.py:275 |
| `_entries_to_read` | src/memorymap/ai/facts.py:460 |
| `_fingerprint` | src/memorymap/ai/facts.py:381 |
| `_judge` | src/memorymap/ai/facts.py:741 |
| `_known_pairs` | src/memorymap/ai/facts.py:865 |
| `_line_around` | src/memorymap/ai/facts.py:266 |
| `_local_answer` | src/memorymap/ai/facts.py:723 |
| `_local_disagreement` | src/memorymap/ai/facts.py:702 |
| `_narrow` | src/memorymap/ai/facts.py:405 |
| `_open_claims_and_questions` | src/memorymap/ai/facts.py:883 |
| `_pair_fact` | src/memorymap/ai/facts.py:897 |
| `_pair_json` | src/memorymap/ai/facts.py:1242 |
| `_pair_key` | src/memorymap/ai/facts.py:860 |
| `_pair_passes` | src/memorymap/ai/facts.py:932 |
| `_plain_words` | src/memorymap/ai/facts.py:698 |
| `_pref_key` | src/memorymap/ai/facts.py:96 |
| `_qa_pairs` | src/memorymap/ai/facts.py:324 |
| `_release` | src/memorymap/ai/facts.py:445 |
| `_retire_not_own_questions` | src/memorymap/ai/facts.py:358 |
| `_run_json` | src/memorymap/ai/facts.py:1079 |
| `_sentence_spans` | src/memorymap/ai/facts.py:119 |
| `_terms` | src/memorymap/ai/facts.py:688 |
| `_visible` | src/memorymap/ai/facts.py:1157 |
| `_words_alike` | src/memorymap/ai/facts.py:694 |
| `_written` | src/memorymap/ai/facts.py:888 |
| `as_json` | src/memorymap/ai/facts.py:1223 |
| `candidates` | src/memorymap/ai/facts.py:336 |
| `edit` | src/memorymap/ai/facts.py:1260 |
| `enabled` | src/memorymap/ai/facts.py:227 |
| `fingerprint_of` | src/memorymap/ai/facts.py:392 |
| `forget` | src/memorymap/ai/facts.py:1286 |
| `json_payload_value` | src/memorymap/ai/facts.py:1063 |
| `latest_card` | src/memorymap/ai/facts.py:1125 |
| `listing` | src/memorymap/ai/facts.py:1175 |
| `own_question` | src/memorymap/ai/facts.py:286 |
| `remove` | src/memorymap/ai/facts.py:1280 |
| `reset` | src/memorymap/ai/facts.py:1270 |
| `run` | src/memorymap/ai/facts.py:496 |
| `run_facts` | src/memorymap/ai/facts.py:1104 |
| `runner_enabled` | src/memorymap/ai/facts.py:1328 |
| `sentences` | src/memorymap/ai/facts.py:235 |
| `set_switches` | src/memorymap/ai/facts.py:212 |
| `stored_switches` | src/memorymap/ai/facts.py:189 |
| `switches` | src/memorymap/ai/facts.py:197 |
| `visible` | src/memorymap/ai/facts.py:1216 |
| `visible_counts` | src/memorymap/ai/facts.py:1094 |

### src/memorymap/ai/fence.py (6)

| Name | File:line |
|---|---|
| `AnswerScrubber` | src/memorymap/ai/fence.py:103 |
| `_could_become_marker` | src/memorymap/ai/fence.py:90 |
| `_defang` | src/memorymap/ai/fence.py:50 |
| `fence` | src/memorymap/ai/fence.py:56 |
| `fence_result` | src/memorymap/ai/fence.py:69 |
| `unfence` | src/memorymap/ai/fence.py:61 |

### src/memorymap/ai/filing_certainty.py (3)

| Name | File:line |
|---|---|
| `calibrate` | src/memorymap/ai/filing_certainty.py:46 |
| `calibrated` | src/memorymap/ai/filing_certainty.py:61 |
| `shown` | src/memorymap/ai/filing_certainty.py:81 |

### src/memorymap/ai/filters.py (16)

| Name | File:line |
|---|---|
| `_Reading` | src/memorymap/ai/filters.py:69 |
| `_midnight` | src/memorymap/ai/filters.py:140 |
| `_past_day` | src/memorymap/ai/filters.py:49 |
| `_read_contents` | src/memorymap/ai/filters.py:115 |
| `_read_dates` | src/memorymap/ai/filters.py:94 |
| `_read_labels` | src/memorymap/ai/filters.py:106 |
| `_read_links` | src/memorymap/ai/filters.py:86 |
| `_where_content` | src/memorymap/ai/filters.py:196 |
| `_where_dated` | src/memorymap/ai/filters.py:176 |
| `_where_has` | src/memorymap/ai/filters.py:161 |
| `_where_labelled` | src/memorymap/ai/filters.py:185 |
| `_where_links` | src/memorymap/ai/filters.py:144 |
| `_window` | src/memorymap/ai/filters.py:60 |
| `read` | src/memorymap/ai/filters.py:126 |
| `resolve` | src/memorymap/ai/filters.py:213 |
| `setting_words` | src/memorymap/ai/filters.py:258 |

### src/memorymap/ai/followups.py (3)

| Name | File:line |
|---|---|
| `_clean` | src/memorymap/ai/followups.py:101 |
| `parse_followups` | src/memorymap/ai/followups.py:124 |
| `suggest_followups` | src/memorymap/ai/followups.py:150 |

### src/memorymap/ai/grounding.py (17)

| Name | File:line |
|---|---|
| `SentenceGrounder` | src/memorymap/ai/grounding.py:460 |
| `_blocks` | src/memorymap/ai/grounding.py:317 |
| `_bm25` | src/memorymap/ai/grounding.py:201 |
| `_figures` | src/memorymap/ai/grounding.py:189 |
| `_graph_nearness` | src/memorymap/ai/grounding.py:394 |
| `_mark` | src/memorymap/ai/grounding.py:692 |
| `_note_passage_scores` | src/memorymap/ai/grounding.py:270 |
| `_passages` | src/memorymap/ai/grounding.py:121 |
| `_pool_passages` | src/memorymap/ai/grounding.py:235 |
| `_word_set` | src/memorymap/ai/grounding.py:372 |
| `_words_with_offsets` | src/memorymap/ai/grounding.py:110 |
| `best_passage` | src/memorymap/ai/grounding.py:144 |
| `ground_answer_sentences` | src/memorymap/ai/grounding.py:430 |
| `note_passage_scores` | src/memorymap/ai/grounding.py:300 |
| `paragraph_ordinal` | src/memorymap/ai/grounding.py:407 |
| `split_sentences` | src/memorymap/ai/grounding.py:352 |
| `support` | src/memorymap/ai/grounding.py:656 |

### src/memorymap/ai/help_chat.py (24)

| Name | File:line |
|---|---|
| `_act_of` | src/memorymap/ai/help_chat.py:2164 |
| `_edit_distance_at_most_one` | src/memorymap/ai/help_chat.py:2095 |
| `_guide_lead` | src/memorymap/ai/help_chat.py:2545 |
| `_guide_opening` | src/memorymap/ai/help_chat.py:2553 |
| `_help_sentences` | src/memorymap/ai/help_chat.py:2528 |
| `_keyword_pattern` | src/memorymap/ai/help_chat.py:2049 |
| `_matching_topics` | src/memorymap/ai/help_chat.py:2203 |
| `_normalise_keys` | src/memorymap/ai/help_chat.py:2072 |
| `_place` | src/memorymap/ai/help_chat.py:2523 |
| `_prompt_for` | src/memorymap/ai/help_chat.py:2396 |
| `_reading_topics` | src/memorymap/ai/help_chat.py:2186 |
| `_second_sentence` | src/memorymap/ai/help_chat.py:2532 |
| `answer` | src/memorymap/ai/help_chat.py:2689 |
| `answer_stream` | src/memorymap/ai/help_chat.py:2627 |
| `badges_for` | src/memorymap/ai/help_chat.py:2344 |
| `composed_answer` | src/memorymap/ai/help_chat.py:2567 |
| `help_block_for` | src/memorymap/ai/help_chat.py:2753 |
| `help_listing` | src/memorymap/ai/help_chat.py:2315 |
| `offline_answer` | src/memorymap/ai/help_chat.py:2585 |
| `social_reply` | src/memorymap/ai/help_chat.py:2496 |
| `source_names` | src/memorymap/ai/help_chat.py:2311 |
| `system_answer` | src/memorymap/ai/help_chat.py:2293 |
| `topic_title` | src/memorymap/ai/help_chat.py:2279 |
| `topics_for` | src/memorymap/ai/help_chat.py:2358 |

### src/memorymap/ai/help_topics_more.py (1)

| Name | File:line |
|---|---|
| `_act_topic` | src/memorymap/ai/help_topics_more.py:1972 |

### src/memorymap/ai/inbox.py (7)

| Name | File:line |
|---|---|
| `EntityFacts` | src/memorymap/ai/inbox.py:47 |
| `LinkFacts` | src/memorymap/ai/inbox.py:54 |
| `_noisy_or` | src/memorymap/ai/inbox.py:74 |
| `_signal` | src/memorymap/ai/inbox.py:70 |
| `_tokens` | src/memorymap/ai/inbox.py:66 |
| `merge_candidates` | src/memorymap/ai/inbox.py:81 |
| `type_candidates` | src/memorymap/ai/inbox.py:222 |

### src/memorymap/ai/insights.py (27)

| Name | File:line |
|---|---|
| `Insight` | src/memorymap/ai/insights.py:59 |
| `Memory` | src/memorymap/ai/insights.py:333 |
| `_count_word` | src/memorymap/ai/insights.py:75 |
| `_day` | src/memorymap/ai/insights.py:69 |
| `_fill` | src/memorymap/ai/insights.py:99 |
| `_from_payload` | src/memorymap/ai/insights.py:370 |
| `_holds` | src/memorymap/ai/insights.py:88 |
| `_said` | src/memorymap/ai/insights.py:309 |
| `_stems` | src/memorymap/ai/insights.py:293 |
| `_week` | src/memorymap/ai/insights.py:94 |
| `_written` | src/memorymap/ai/insights.py:80 |
| `after_lead` | src/memorymap/ai/insights.py:250 |
| `as_row` | src/memorymap/ai/insights.py:411 |
| `confirm` | src/memorymap/ai/insights.py:374 |
| `confirmed_line` | src/memorymap/ai/insights.py:326 |
| `contrast` | src/memorymap/ai/insights.py:170 |
| `dismiss` | src/memorymap/ai/insights.py:399 |
| `drift` | src/memorymap/ai/insights.py:143 |
| `for_subject` | src/memorymap/ai/insights.py:222 |
| `from_session` | src/memorymap/ai/insights.py:267 |
| `key` | src/memorymap/ai/insights.py:298 |
| `load` | src/memorymap/ai/insights.py:196 |
| `memory` | src/memorymap/ai/insights.py:348 |
| `notebook` | src/memorymap/ai/insights.py:422 |
| `recurrence` | src/memorymap/ai/insights.py:103 |
| `short` | src/memorymap/ai/insights.py:237 |
| `streak` | src/memorymap/ai/insights.py:121 |

### src/memorymap/ai/intent.py (5)

| Name | File:line |
|---|---|
| `_matches_any` | src/memorymap/ai/intent.py:111 |
| `_normalise` | src/memorymap/ai/intent.py:102 |
| `classify` | src/memorymap/ai/intent.py:118 |
| `is_mash` | src/memorymap/ai/intent.py:164 |
| `needs_retrieval` | src/memorymap/ai/intent.py:170 |

### src/memorymap/ai/janitor.py (24)

| Name | File:line |
|---|---|
| `CentroidMatch` | src/memorymap/ai/janitor.py:97 |
| `NeighbourMatch` | src/memorymap/ai/janitor.py:103 |
| `_Labelled` | src/memorymap/ai/janitor.py:423 |
| `_ask_llm` | src/memorymap/ai/janitor.py:601 |
| `_best_centroid_match` | src/memorymap/ai/janitor.py:479 |
| `_chat_within_deadline` | src/memorymap/ai/janitor.py:776 |
| `_confidence_of` | src/memorymap/ai/janitor.py:740 |
| `_extract_json` | src/memorymap/ai/janitor.py:842 |
| `_knn_match` | src/memorymap/ai/janitor.py:525 |
| `_labelled_vectors` | src/memorymap/ai/janitor.py:433 |
| `_late_answer` | src/memorymap/ai/janitor.py:744 |
| `_row` | src/memorymap/ai/janitor.py:709 |
| `_semantic_category` | src/memorymap/ai/janitor.py:343 |
| `_too_short_to_trust` | src/memorymap/ai/janitor.py:404 |
| `_uncount_late` | src/memorymap/ai/janitor.py:704 |
| `_unless_held` | src/memorymap/ai/janitor.py:133 |
| `activity_rows` | src/memorymap/ai/janitor.py:695 |
| `categorise` | src/memorymap/ai/janitor.py:146 |
| `filed_by_label` | src/memorymap/ai/janitor.py:714 |
| `filing_deadline` | src/memorymap/ai/janitor.py:729 |
| `is_ai_method` | src/memorymap/ai/janitor.py:119 |
| `review_words_filed` | src/memorymap/ai/janitor.py:274 |
| `settled_state` | src/memorymap/ai/janitor.py:123 |
| `warm_filing_model` | src/memorymap/ai/janitor.py:756 |

### src/memorymap/ai/learning.py (13)

| Name | File:line |
|---|---|
| `Correction` | src/memorymap/ai/learning.py:134 |
| `_as_correction` | src/memorymap/ai/learning.py:164 |
| `_payload` | src/memorymap/ai/learning.py:151 |
| `_words` | src/memorymap/ai/learning.py:584 |
| `boosts` | src/memorymap/ai/learning.py:338 |
| `centroid_excluded` | src/memorymap/ai/learning.py:446 |
| `corrections` | src/memorymap/ai/learning.py:226 |
| `decayed` | src/memorymap/ai/learning.py:333 |
| `excluded_categories` | src/memorymap/ai/learning.py:477 |
| `filing_accuracy` | src/memorymap/ai/learning.py:273 |
| `filing_evidence` | src/memorymap/ai/learning.py:511 |
| `record` | src/memorymap/ai/learning.py:184 |
| `signal_weights` | src/memorymap/ai/learning.py:397 |

### src/memorymap/ai/lexical_filing.py (32)

| Name | File:line |
|---|---|
| `Candidate` | src/memorymap/ai/lexical_filing.py:372 |
| `Decision` | src/memorymap/ai/lexical_filing.py:404 |
| `LexicalMatch` | src/memorymap/ai/lexical_filing.py:137 |
| `Proposal` | src/memorymap/ai/lexical_filing.py:390 |
| `_Corpus` | src/memorymap/ai/lexical_filing.py:797 |
| `_Doc` | src/memorymap/ai/lexical_filing.py:765 |
| `_auto_file_sensitive` | src/memorymap/ai/lexical_filing.py:487 |
| `_category_aggregates` | src/memorymap/ai/lexical_filing.py:712 |
| `_corpus_for` | src/memorymap/ai/lexical_filing.py:969 |
| `_cosine` | src/memorymap/ai/lexical_filing.py:450 |
| `_make_doc` | src/memorymap/ai/lexical_filing.py:935 |
| `_name_words` | src/memorymap/ai/lexical_filing.py:460 |
| `_quote_list` | src/memorymap/ai/lexical_filing.py:419 |
| `_scope` | src/memorymap/ai/lexical_filing.py:1035 |
| `_scope_key` | src/memorymap/ai/lexical_filing.py:1047 |
| `_tag_words` | src/memorymap/ai/lexical_filing.py:931 |
| `_tags` | src/memorymap/ai/lexical_filing.py:146 |
| `_tally` | src/memorymap/ai/lexical_filing.py:250 |
| `_why_line` | src/memorymap/ai/lexical_filing.py:426 |
| `_with_proposal` | src/memorymap/ai/lexical_filing.py:682 |
| `category_profiles` | src/memorymap/ai/lexical_filing.py:612 |
| `category_support` | src/memorymap/ai/lexical_filing.py:168 |
| `clean` | src/memorymap/ai/lexical_filing.py:123 |
| `decide` | src/memorymap/ai/lexical_filing.py:497 |
| `forget_corpus` | src/memorymap/ai/lexical_filing.py:1053 |
| `holds_sensitive` | src/memorymap/ai/lexical_filing.py:465 |
| `lexical_category` | src/memorymap/ai/lexical_filing.py:154 |
| `personal_lexicon` | src/memorymap/ai/lexical_filing.py:648 |
| `suggest_categories` | src/memorymap/ai/lexical_filing.py:200 |
| `suggest_categories_explained` | src/memorymap/ai/lexical_filing.py:210 |
| `tokens` | src/memorymap/ai/lexical_filing.py:95 |
| `topic_overlap` | src/memorymap/ai/lexical_filing.py:638 |

### src/memorymap/ai/librarian.py (33)

| Name | File:line |
|---|---|
| `_app_help` | src/memorymap/ai/librarian.py:586 |
| `_dates_hint` | src/memorymap/ai/librarian.py:479 |
| `_match_info_hint` | src/memorymap/ai/librarian.py:508 |
| `_pictures_hint` | src/memorymap/ai/librarian.py:467 |
| `_tags_files_hint` | src/memorymap/ai/librarian.py:446 |
| `_written_hint` | src/memorymap/ai/librarian.py:429 |
| `answer` | src/memorymap/ai/librarian.py:713 |
| `build_conversational_messages` | src/memorymap/ai/librarian.py:392 |
| `build_messages` | src/memorymap/ai/librarian.py:595 |
| `converse` | src/memorymap/ai/librarian.py:813 |
| `corrections_note` | src/memorymap/ai/librarian.py:1344 |
| `draft_template` | src/memorymap/ai/librarian.py:1073 |
| `evidence_note` | src/memorymap/ai/librarian.py:1393 |
| `filing_corrections` | src/memorymap/ai/librarian.py:1303 |
| `filing_prompt` | src/memorymap/ai/librarian.py:1425 |
| `filing_style_note` | src/memorymap/ai/librarian.py:1381 |
| `fill_ai_name` | src/memorymap/ai/librarian.py:194 |
| `generate_link_reason` | src/memorymap/ai/librarian.py:953 |
| `generate_title` | src/memorymap/ai/librarian.py:926 |
| `history_messages` | src/memorymap/ai/librarian.py:295 |
| `improve_writing` | src/memorymap/ai/librarian.py:879 |
| `length_hint` | src/memorymap/ai/librarian.py:265 |
| `model_error_message` | src/memorymap/ai/librarian.py:30 |
| `note_for_prompt` | src/memorymap/ai/librarian.py:355 |
| `plan_budget` | src/memorymap/ai/librarian.py:559 |
| `profile_context` | src/memorymap/ai/librarian.py:229 |
| `profile_from_config` | src/memorymap/ai/librarian.py:250 |
| `propose_map_outline` | src/memorymap/ai/librarian.py:1220 |
| `resolve_persona_prompt` | src/memorymap/ai/librarian.py:164 |
| `suggest_tags` | src/memorymap/ai/librarian.py:1010 |
| `suggest_thinking_words` | src/memorymap/ai/librarian.py:1117 |
| `summarize_meeting` | src/memorymap/ai/librarian.py:1172 |
| `system_content` | src/memorymap/ai/librarian.py:532 |

### src/memorymap/ai/links.py (3)

| Name | File:line |
|---|---|
| `_clean_reason` | src/memorymap/ai/links.py:89 |
| `_is_vague_reason` | src/memorymap/ai/links.py:80 |
| `audit_vague_links` | src/memorymap/ai/links.py:97 |

### src/memorymap/ai/margin.py (8)

| Name | File:line |
|---|---|
| `_alike` | src/memorymap/ai/margin.py:82 |
| `_best_sentence` | src/memorymap/ai/margin.py:86 |
| `_candidates` | src/memorymap/ai/margin.py:103 |
| `_date_card` | src/memorymap/ai/margin.py:143 |
| `_judge` | src/memorymap/ai/margin.py:164 |
| `_open_questions` | src/memorymap/ai/margin.py:136 |
| `_vector` | src/memorymap/ai/margin.py:71 |
| `read` | src/memorymap/ai/margin.py:181 |

### src/memorymap/ai/meeting_summary.py (6)

| Name | File:line |
|---|---|
| `_found` | src/memorymap/ai/meeting_summary.py:49 |
| `_norm` | src/memorymap/ai/meeting_summary.py:45 |
| `_one_line` | src/memorymap/ai/meeting_summary.py:54 |
| `as_lines` | src/memorymap/ai/meeting_summary.py:99 |
| `parse_reply` | src/memorymap/ai/meeting_summary.py:58 |
| `summarise` | src/memorymap/ai/meeting_summary.py:111 |

### src/memorymap/ai/memory.py (1)

| Name | File:line |
|---|---|
| `persona_with_memory` | src/memorymap/ai/memory.py:44 |

### src/memorymap/ai/model_cards.py (8)

| Name | File:line |
|---|---|
| `_bad` | src/memorymap/ai/model_cards.py:195 |
| `decorate` | src/memorymap/ai/model_cards.py:120 |
| `fit_for` | src/memorymap/ai/model_cards.py:108 |
| `good_for` | src/memorymap/ai/model_cards.py:83 |
| `inspect_model_name` | src/memorymap/ai/model_cards.py:199 |
| `installed_uses` | src/memorymap/ai/model_cards.py:149 |
| `ram_needed_gb` | src/memorymap/ai/model_cards.py:65 |
| `size_gb` | src/memorymap/ai/model_cards.py:56 |

### src/memorymap/ai/model_manager.py (20)

| Name | File:line |
|---|---|
| `Embedder` | src/memorymap/ai/model_manager.py:29 |
| `Feature` | src/memorymap/ai/model_manager.py:311 |
| `Job` | src/memorymap/ai/model_manager.py:806 |
| `ModelManager` | src/memorymap/ai/model_manager.py:421 |
| `_reindex_pass` | src/memorymap/ai/model_manager.py:902 |
| `_run_pull` | src/memorymap/ai/model_manager.py:1017 |
| `_run_reindex` | src/memorymap/ai/model_manager.py:894 |
| `cancel_pull` | src/memorymap/ai/model_manager.py:859 |
| `cancel_reindex` | src/memorymap/ai/model_manager.py:849 |
| `choose_installed_chat_model` | src/memorymap/ai/model_manager.py:1067 |
| `feature_pref_key` | src/memorymap/ai/model_manager.py:403 |
| `is_ocr_model` | src/memorymap/ai/model_manager.py:216 |
| `is_small_model` | src/memorymap/ai/model_manager.py:270 |
| `known_feature` | src/memorymap/ai/model_manager.py:407 |
| `parameter_count` | src/memorymap/ai/model_manager.py:245 |
| `pull_statuses` | src/memorymap/ai/model_manager.py:844 |
| `reindex_status` | src/memorymap/ai/model_manager.py:839 |
| `reset_jobs` | src/memorymap/ai/model_manager.py:831 |
| `start_pull` | src/memorymap/ai/model_manager.py:1002 |
| `start_reindex` | src/memorymap/ai/model_manager.py:869 |

### src/memorymap/ai/needle_provider.py (10)

| Name | File:line |
|---|---|
| `NeedleProvider` | src/memorymap/ai/needle_provider.py:206 |
| `_Engine` | src/memorymap/ai/needle_provider.py:108 |
| `_date_fact` | src/memorymap/ai/needle_provider.py:201 |
| `_folder` | src/memorymap/ai/needle_provider.py:97 |
| `_get_engine` | src/memorymap/ai/needle_provider.py:168 |
| `_load_library` | src/memorymap/ai/needle_provider.py:103 |
| `_text` | src/memorymap/ai/needle_provider.py:190 |
| `library_name` | src/memorymap/ai/needle_provider.py:88 |
| `loaded` | src/memorymap/ai/needle_provider.py:179 |
| `reset_for_tests` | src/memorymap/ai/needle_provider.py:185 |

### src/memorymap/ai/notebook_stats.py (35)

| Name | File:line |
|---|---|
| `StatAnswer` | src/memorymap/ai/notebook_stats.py:54 |
| `_asks` | src/memorymap/ai/notebook_stats.py:196 |
| `_busiest` | src/memorymap/ai/notebook_stats.py:451 |
| `_category_count` | src/memorymap/ai/notebook_stats.py:371 |
| `_despell` | src/memorymap/ai/notebook_stats.py:167 |
| `_document_count` | src/memorymap/ai/notebook_stats.py:389 |
| `_general_stats` | src/memorymap/ai/notebook_stats.py:647 |
| `_longest_notes` | src/memorymap/ai/notebook_stats.py:538 |
| `_month_keys` | src/memorymap/ai/notebook_stats.py:684 |
| `_most_linked` | src/memorymap/ai/notebook_stats.py:398 |
| `_note_count` | src/memorymap/ai/notebook_stats.py:380 |
| `_notebook_block` | src/memorymap/ai/notebook_stats.py:693 |
| `_orphans` | src/memorymap/ai/notebook_stats.py:432 |
| `_plural` | src/memorymap/ai/notebook_stats.py:90 |
| `_recent_count` | src/memorymap/ai/notebook_stats.py:490 |
| `_reminder_block` | src/memorymap/ai/notebook_stats.py:725 |
| `_stale_notes` | src/memorymap/ai/notebook_stats.py:571 |
| `_tag_count` | src/memorymap/ai/notebook_stats.py:361 |
| `_tag_pairs` | src/memorymap/ai/notebook_stats.py:611 |
| `_tags_of` | src/memorymap/ai/notebook_stats.py:82 |
| `_top_categories` | src/memorymap/ai/notebook_stats.py:332 |
| `_top_subjects` | src/memorymap/ai/notebook_stats.py:294 |
| `_top_tags` | src/memorymap/ai/notebook_stats.py:317 |
| `_transposition_of` | src/memorymap/ai/notebook_stats.py:149 |
| `_untagged` | src/memorymap/ai/notebook_stats.py:350 |
| `_visible` | src/memorymap/ai/notebook_stats.py:68 |
| `_week_counts` | src/memorymap/ai/notebook_stats.py:746 |
| `_window` | src/memorymap/ai/notebook_stats.py:467 |
| `_word_count` | src/memorymap/ai/notebook_stats.py:516 |
| `_words` | src/memorymap/ai/notebook_stats.py:680 |
| `answer` | src/memorymap/ai/notebook_stats.py:219 |
| `looks_like_a_question_about_the_notebook` | src/memorymap/ai/notebook_stats.py:200 |
| `page` | src/memorymap/ai/notebook_stats.py:776 |
| `week_review` | src/memorymap/ai/notebook_stats.py:763 |
| `week_start` | src/memorymap/ai/notebook_stats.py:740 |

### src/memorymap/ai/offers.py (12)

| Name | File:line |
|---|---|
| `_due` | src/memorymap/ai/offers.py:68 |
| `_filing` | src/memorymap/ai/offers.py:167 |
| `_inside` | src/memorymap/ai/offers.py:50 |
| `_links` | src/memorymap/ai/offers.py:146 |
| `_names` | src/memorymap/ai/offers.py:126 |
| `_reminder_words` | src/memorymap/ai/offers.py:60 |
| `_reminders` | src/memorymap/ai/offers.py:83 |
| `_sentence` | src/memorymap/ai/offers.py:54 |
| `_sums` | src/memorymap/ai/offers.py:102 |
| `date_chip` | src/memorymap/ai/offers.py:200 |
| `offers` | src/memorymap/ai/offers.py:178 |
| `quoted_ranges` | src/memorymap/ai/offers.py:45 |

### src/memorymap/ai/offline.py (4)

| Name | File:line |
|---|---|
| `forget_ollama_binary` | src/memorymap/ai/offline.py:47 |
| `offline_message` | src/memorymap/ai/offline.py:74 |
| `ollama_binary` | src/memorymap/ai/offline.py:39 |
| `ollama_hint` | src/memorymap/ai/offline.py:54 |

### src/memorymap/ai/ollama_client.py (2)

| Name | File:line |
|---|---|
| `OllamaClient` | src/memorymap/ai/ollama_client.py:152 |
| `describe_http_error` | src/memorymap/ai/ollama_client.py:61 |

### src/memorymap/ai/openai_client.py (2)

| Name | File:line |
|---|---|
| `OpenAICompatClient` | src/memorymap/ai/openai_client.py:108 |
| `_looks_like_tools_rejection` | src/memorymap/ai/openai_client.py:68 |

### src/memorymap/ai/passive_capture.py (6)

| Name | File:line |
|---|---|
| `_fingerprint` | src/memorymap/ai/passive_capture.py:129 |
| `_fingerprints` | src/memorymap/ai/passive_capture.py:91 |
| `_parse_facts` | src/memorymap/ai/passive_capture.py:133 |
| `_save_fingerprints` | src/memorymap/ai/passive_capture.py:98 |
| `capture_pass` | src/memorymap/ai/passive_capture.py:161 |
| `recent_questions` | src/memorymap/ai/passive_capture.py:107 |

### src/memorymap/ai/plan_writes.py (6)

| Name | File:line |
|---|---|
| `_safe` | src/memorymap/ai/plan_writes.py:71 |
| `edit_diff` | src/memorymap/ai/plan_writes.py:79 |
| `plan_tools` | src/memorymap/ai/plan_writes.py:66 |
| `plan_writes` | src/memorymap/ai/plan_writes.py:59 |
| `step_tools` | src/memorymap/ai/plan_writes.py:46 |
| `step_writes` | src/memorymap/ai/plan_writes.py:30 |

### src/memorymap/ai/presets.py (3)

| Name | File:line |
|---|---|
| `ResponseMode` | src/memorymap/ai/presets.py:48 |
| `resolve` | src/memorymap/ai/presets.py:180 |
| `sampling_options` | src/memorymap/ai/presets.py:196 |

### src/memorymap/ai/provider.py (27)

| Name | File:line |
|---|---|
| `Provider` | src/memorymap/ai/provider.py:336 |
| `ProviderError` | src/memorymap/ai/provider.py:65 |
| `ToolsUnsupportedError` | src/memorymap/ai/provider.py:69 |
| `_ThinkTagSplitter` | src/memorymap/ai/provider.py:679 |
| `_ToolTextGate` | src/memorymap/ai/provider.py:791 |
| `_balanced_json_objects` | src/memorymap/ai/provider.py:844 |
| `_close_open_json` | src/memorymap/ai/provider.py:1298 |
| `_first_json_object_after` | src/memorymap/ai/provider.py:1010 |
| `_json_too_deep` | src/memorymap/ai/provider.py:1327 |
| `_ns_to_ms` | src/memorymap/ai/provider.py:1234 |
| `_python_style_calls` | src/memorymap/ai/provider.py:1021 |
| `_squash_separators` | src/memorymap/ai/provider.py:209 |
| `_unfence` | src/memorymap/ai/provider.py:1286 |
| `context_from_catalog_entry` | src/memorymap/ai/provider.py:265 |
| `detect_provider` | src/memorymap/ai/provider.py:311 |
| `extract_text_tool_calls` | src/memorymap/ai/provider.py:1082 |
| `first_chat_model` | src/memorymap/ai/provider.py:303 |
| `is_transient_server_error` | src/memorymap/ai/provider.py:116 |
| `known_context` | src/memorymap/ai/provider.py:224 |
| `loads_lenient` | src/memorymap/ai/provider.py:1350 |
| `normalise_tool_calls` | src/memorymap/ai/provider.py:1389 |
| `offered_tool_names` | src/memorymap/ai/provider.py:1423 |
| `resolve_tool_name` | src/memorymap/ai/provider.py:936 |
| `set_sampling_overrides_getter` | src/memorymap/ai/provider.py:59 |
| `set_write_tools` | src/memorymap/ai/provider.py:1079 |
| `split_thinking` | src/memorymap/ai/provider.py:1242 |
| `tools_unsupported_message` | src/memorymap/ai/provider.py:90 |

### src/memorymap/ai/provider_http.py (7)

| Name | File:line |
|---|---|
| `OffHostRedirect` | src/memorymap/ai/provider_http.py:37 |
| `_address` | src/memorymap/ai/provider_http.py:42 |
| `_guarded` | src/memorymap/ai/provider_http.py:70 |
| `delete` | src/memorymap/ai/provider_http.py:87 |
| `get` | src/memorymap/ai/provider_http.py:79 |
| `post` | src/memorymap/ai/provider_http.py:83 |
| `refuse_off_host_redirect` | src/memorymap/ai/provider_http.py:52 |

### src/memorymap/ai/question_noise.py (14)

| Name | File:line |
|---|---|
| `_at_asking_place` | src/memorymap/ai/question_noise.py:2075 |
| `_cosine` | src/memorymap/ai/question_noise.py:2126 |
| `_split` | src/memorymap/ai/question_noise.py:2014 |
| `_sub_cost` | src/memorymap/ai/question_noise.py:1924 |
| `_trigrams` | src/memorymap/ai/question_noise.py:2121 |
| `_vector_cosine` | src/memorymap/ai/question_noise.py:2137 |
| `allowance` | src/memorymap/ai/question_noise.py:1952 |
| `alternative` | src/memorymap/ai/question_noise.py:1999 |
| `distance` | src/memorymap/ai/question_noise.py:1930 |
| `guess_kind` | src/memorymap/ai/question_noise.py:2144 |
| `nearest` | src/memorymap/ai/question_noise.py:1970 |
| `repair` | src/memorymap/ai/question_noise.py:2027 |
| `social_kind` | src/memorymap/ai/question_noise.py:1825 |
| `strip_symbols` | src/memorymap/ai/question_noise.py:405 |

### src/memorymap/ai/questions.py (12)

| Name | File:line |
|---|---|
| `_answers_by_question` | src/memorymap/ai/questions.py:55 |
| `_as_json` | src/memorymap/ai/questions.py:103 |
| `_payload` | src/memorymap/ai/questions.py:47 |
| `_plain` | src/memorymap/ai/questions.py:79 |
| `_title` | src/memorymap/ai/questions.py:87 |
| `listing` | src/memorymap/ai/questions.py:164 |
| `open_counts` | src/memorymap/ai/questions.py:146 |
| `open_note_ids` | src/memorymap/ai/questions.py:282 |
| `set_state` | src/memorymap/ai/questions.py:223 |
| `state_of` | src/memorymap/ai/questions.py:70 |
| `summary` | src/memorymap/ai/questions.py:210 |
| `visible_question` | src/memorymap/ai/questions.py:218 |

### src/memorymap/ai/reading.py (21)

| Name | File:line |
|---|---|
| `Reading` | src/memorymap/ai/reading.py:77 |
| `Repair` | src/memorymap/ai/reading.py:327 |
| `_ambiguity` | src/memorymap/ai/reading.py:148 |
| `_day_phrase` | src/memorymap/ai/reading.py:398 |
| `_follow_other` | src/memorymap/ai/reading.py:435 |
| `_follow_pronoun` | src/memorymap/ai/reading.py:450 |
| `_follow_same` | src/memorymap/ai/reading.py:459 |
| `_known` | src/memorymap/ai/reading.py:126 |
| `_plain` | src/memorymap/ai/reading.py:114 |
| `_redate` | src/memorymap/ai/reading.py:476 |
| `_reminder_slots` | src/memorymap/ai/reading.py:173 |
| `_repeat_slots` | src/memorymap/ai/reading.py:184 |
| `_resolving` | src/memorymap/ai/reading.py:219 |
| `_swap_object` | src/memorymap/ai/reading.py:394 |
| `_turn_object` | src/memorymap/ai/reading.py:383 |
| `_weigh` | src/memorymap/ai/reading.py:157 |
| `band_of` | src/memorymap/ai/reading.py:69 |
| `follow` | src/memorymap/ai/reading.py:411 |
| `read` | src/memorymap/ai/reading.py:242 |
| `repair` | src/memorymap/ai/reading.py:344 |
| `tool_of` | src/memorymap/ai/reading.py:198 |

### src/memorymap/ai/realise.py (35)

| Name | File:line |
|---|---|
| `_case_like` | src/memorymap/ai/realise.py:87 |
| `_cell` | src/memorymap/ai/realise.py:347 |
| `_first_five` | src/memorymap/ai/realise.py:426 |
| `_named` | src/memorymap/ai/realise.py:395 |
| `_rows_form` | src/memorymap/ai/realise.py:333 |
| `_say_count` | src/memorymap/ai/realise.py:420 |
| `_say_listed` | src/memorymap/ai/realise.py:453 |
| `_say_named` | src/memorymap/ai/realise.py:411 |
| `_say_overview` | src/memorymap/ai/realise.py:430 |
| `_say_reminders` | src/memorymap/ai/realise.py:442 |
| `_say_structure` | src/memorymap/ai/realise.py:436 |
| `_shift_part` | src/memorymap/ai/realise.py:114 |
| `_shift_words` | src/memorymap/ai/realise.py:107 |
| `_when` | src/memorymap/ai/realise.py:399 |
| `after_comma` | src/memorymap/ai/realise.py:240 |
| `bullets` | src/memorymap/ai/realise.py:361 |
| `card` | src/memorymap/ai/realise.py:365 |
| `chart` | src/memorymap/ai/realise.py:372 |
| `count_noun` | src/memorymap/ai/realise.py:208 |
| `count_word` | src/memorymap/ai/realise.py:176 |
| `cut_title` | src/memorymap/ai/realise.py:250 |
| `first_person` | src/memorymap/ai/realise.py:140 |
| `form_of` | src/memorymap/ai/realise.py:320 |
| `join_items` | src/memorymap/ai/realise.py:218 |
| `opener` | src/memorymap/ai/realise.py:281 |
| `past_plan` | src/memorymap/ai/realise.py:162 |
| `protected` | src/memorymap/ai/realise.py:275 |
| `relative_day` | src/memorymap/ai/realise.py:180 |
| `render` | src/memorymap/ai/realise.py:379 |
| `say` | src/memorymap/ai/realise.py:52 |
| `shift_person` | src/memorymap/ai/realise.py:125 |
| `table` | src/memorymap/ai/realise.py:352 |
| `tool_answer` | src/memorymap/ai/realise.py:476 |
| `variety` | src/memorymap/ai/realise.py:298 |
| `wording` | src/memorymap/ai/realise.py:292 |

### src/memorymap/ai/recognise.py (76)

| Name | File:line |
|---|---|
| `Span` | src/memorymap/ai/recognise.py:1328 |
| `_add_months` | src/memorymap/ai/recognise.py:409 |
| `_alert_cands` | src/memorymap/ai/recognise.py:1757 |
| `_amount` | src/memorymap/ai/recognise.py:684 |
| `_anchored_cands` | src/memorymap/ai/recognise.py:1894 |
| `_back` | src/memorymap/ai/recognise.py:748 |
| `_bare_hour` | src/memorymap/ai/recognise.py:1518 |
| `_clock` | src/memorymap/ai/recognise.py:222 |
| `_clock_match` | src/memorymap/ai/recognise.py:1500 |
| `_clock_words` | src/memorymap/ai/recognise.py:1372 |
| `_contact_cands` | src/memorymap/ai/recognise.py:1841 |
| `_count` | src/memorymap/ai/recognise.py:540 |
| `_date_cands` | src/memorymap/ai/recognise.py:1559 |
| `_date_phrase` | src/memorymap/ai/recognise.py:639 |
| `_date_range_cands` | src/memorymap/ai/recognise.py:1913 |
| `_day` | src/memorymap/ai/recognise.py:183 |
| `_day_fits` | src/memorymap/ai/recognise.py:399 |
| `_day_of_month` | src/memorymap/ai/recognise.py:725 |
| `_day_words` | src/memorymap/ai/recognise.py:1368 |
| `_duration_cands` | src/memorymap/ai/recognise.py:1779 |
| `_duration_words` | src/memorymap/ai/recognise.py:1380 |
| `_figure` | src/memorymap/ai/recognise.py:1800 |
| `_hour24` | src/memorymap/ai/recognise.py:245 |
| `_hour_from` | src/memorymap/ai/recognise.py:1494 |
| `_iso` | src/memorymap/ai/recognise.py:173 |
| `_jsonable` | src/memorymap/ai/recognise.py:1346 |
| `_lower` | src/memorymap/ai/recognise.py:1363 |
| `_measure_cands` | src/memorymap/ai/recognise.py:1805 |
| `_money_names` | src/memorymap/ai/recognise.py:1422 |
| `_month_end` | src/memorymap/ai/recognise.py:699 |
| `_month_span` | src/memorymap/ai/recognise.py:736 |
| `_months_back` | src/memorymap/ai/recognise.py:532 |
| `_nearest` | src/memorymap/ai/recognise.py:714 |
| `_nth_of_month` | src/memorymap/ai/recognise.py:380 |
| `_nth_weekday_cands` | src/memorymap/ai/recognise.py:1744 |
| `_num_words` | src/memorymap/ai/recognise.py:1376 |
| `_number_cands` | src/memorymap/ai/recognise.py:1883 |
| `_numeric_dates` | src/memorymap/ai/recognise.py:1529 |
| `_range_count` | src/memorymap/ai/recognise.py:1186 |
| `_range_for` | src/memorymap/ai/recognise.py:1197 |
| `_read_as` | src/memorymap/ai/recognise.py:1932 |
| `_recurrence_cands` | src/memorymap/ai/recognise.py:1687 |
| `_relative_cands` | src/memorymap/ai/recognise.py:1676 |
| `_repeat_and_alert` | src/memorymap/ai/recognise.py:510 |
| `_rule_parts` | src/memorymap/ai/recognise.py:374 |
| `_rx` | src/memorymap/ai/recognise.py:1410 |
| `_shift_months` | src/memorymap/ai/recognise.py:704 |
| `_span_days` | src/memorymap/ai/recognise.py:549 |
| `_time_cands` | src/memorymap/ai/recognise.py:1644 |
| `_unit` | src/memorymap/ai/recognise.py:954 |
| `_unit_names` | src/memorymap/ai/recognise.py:1418 |
| `_valid_day` | src/memorymap/ai/recognise.py:391 |
| `_week_of` | src/memorymap/ai/recognise.py:709 |
| `alert_words` | src/memorymap/ai/recognise.py:1770 |
| `count_of` | src/memorymap/ai/recognise.py:691 |
| `day_of_month` | src/memorymap/ai/recognise.py:1968 |
| `days_question` | src/memorymap/ai/recognise.py:1280 |
| `days_since` | src/memorymap/ai/recognise.py:560 |
| `find` | src/memorymap/ai/recognise.py:916 |
| `first_of` | src/memorymap/ai/recognise.py:439 |
| `next_occurrence` | src/memorymap/ai/recognise.py:422 |
| `offset_question` | src/memorymap/ai/recognise.py:1290 |
| `parse_reminder_text` | src/memorymap/ai/recognise.py:453 |
| `part_of_day` | src/memorymap/ai/recognise.py:1305 |
| `question_day` | src/memorymap/ai/recognise.py:1231 |
| `question_range` | src/memorymap/ai/recognise.py:1219 |
| `recognise` | src/memorymap/ai/recognise.py:1975 |
| `relative_delta` | src/memorymap/ai/recognise.py:74 |
| `relative_months` | src/memorymap/ai/recognise.py:103 |
| `resolve` | src/memorymap/ai/recognise.py:257 |
| `says_ahead` | src/memorymap/ai/recognise.py:1261 |
| `span` | src/memorymap/ai/recognise.py:763 |
| `stored_repeat` | src/memorymap/ai/recognise.py:360 |
| `strip_lead` | src/memorymap/ai/recognise.py:122 |
| `tense_of` | src/memorymap/ai/recognise.py:1395 |
| `window` | src/memorymap/ai/recognise.py:929 |

### src/memorymap/ai/relations.py (8)

| Name | File:line |
|---|---|
| `Candidate` | src/memorymap/ai/relations.py:64 |
| `NoteFacts` | src/memorymap/ai/relations.py:57 |
| `_named` | src/memorymap/ai/relations.py:87 |
| `_noisy_or` | src/memorymap/ai/relations.py:106 |
| `_rarity` | src/memorymap/ai/relations.py:113 |
| `_reason` | src/memorymap/ai/relations.py:94 |
| `explain_pair` | src/memorymap/ai/relations.py:230 |
| `recognise` | src/memorymap/ai/relations.py:118 |

### src/memorymap/ai/reminder_parser.py (5)

| Name | File:line |
|---|---|
| `_extract_json` | src/memorymap/ai/reminder_parser.py:82 |
| `_fallback` | src/memorymap/ai/reminder_parser.py:77 |
| `_tidy` | src/memorymap/ai/reminder_parser.py:34 |
| `parse_relative` | src/memorymap/ai/reminder_parser.py:44 |
| `parse_reminder` | src/memorymap/ai/reminder_parser.py:94 |

### src/memorymap/ai/resurface.py (9)

| Name | File:line |
|---|---|
| `_clamp` | src/memorymap/ai/resurface.py:61 |
| `_dismissed` | src/memorymap/ai/resurface.py:177 |
| `_relatedness` | src/memorymap/ai/resurface.py:279 |
| `compute_scores` | src/memorymap/ai/resurface.py:73 |
| `ensure_fresh` | src/memorymap/ai/resurface.py:147 |
| `for_context` | src/memorymap/ai/resurface.py:317 |
| `for_day` | src/memorymap/ai/resurface.py:230 |
| `ranked` | src/memorymap/ai/resurface.py:185 |
| `score_for` | src/memorymap/ai/resurface.py:65 |

### src/memorymap/ai/sampling.py (5)

| Name | File:line |
|---|---|
| `Knob` | src/memorymap/ai/sampling.py:53 |
| `as_dicts` | src/memorymap/ai/sampling.py:191 |
| `explain` | src/memorymap/ai/sampling.py:168 |
| `parse_model_parameters` | src/memorymap/ai/sampling.py:105 |
| `resolve` | src/memorymap/ai/sampling.py:143 |

### src/memorymap/ai/skill_folder.py (4)

| Name | File:line |
|---|---|
| `_load` | src/memorymap/ai/skill_folder.py:129 |
| `folder` | src/memorymap/ai/skill_folder.py:75 |
| `parse` | src/memorymap/ai/skill_folder.py:91 |
| `scan` | src/memorymap/ai/skill_folder.py:159 |

### src/memorymap/ai/skill_runner.py (29)

| Name | File:line |
|---|---|
| `Verification` | src/memorymap/ai/skill_runner.py:160 |
| `_RunSetup` | src/memorymap/ai/skill_runner.py:808 |
| `_RunState` | src/memorymap/ai/skill_runner.py:837 |
| `_absorb` | src/memorymap/ai/skill_runner.py:451 |
| `_absorb_change` | src/memorymap/ai/skill_runner.py:505 |
| `_announce_early` | src/memorymap/ai/skill_runner.py:687 |
| `_collect` | src/memorymap/ai/skill_runner.py:1609 |
| `_contract_met` | src/memorymap/ai/skill_runner.py:561 |
| `_event_mark` | src/memorymap/ai/skill_runner.py:770 |
| `_fallback_replan` | src/memorymap/ai/skill_runner.py:620 |
| `_pages_left` | src/memorymap/ai/skill_runner.py:513 |
| `_paging_nudge` | src/memorymap/ai/skill_runner.py:543 |
| `_plan_step_offer` | src/memorymap/ai/skill_runner.py:703 |
| `_plan_step_tools` | src/memorymap/ai/skill_runner.py:698 |
| `_reading` | src/memorymap/ai/skill_runner.py:209 |
| `_record_run` | src/memorymap/ai/skill_runner.py:311 |
| `_remember` | src/memorymap/ai/skill_runner.py:441 |
| `_replan_step` | src/memorymap/ai/skill_runner.py:634 |
| `_run_one_step` | src/memorymap/ai/skill_runner.py:871 |
| `_run_skill` | src/memorymap/ai/skill_runner.py:1301 |
| `_step_answer` | src/memorymap/ai/skill_runner.py:99 |
| `_step_tools` | src/memorymap/ai/skill_runner.py:710 |
| `_tag_arguments` | src/memorymap/ai/skill_runner.py:432 |
| `_touched_clause` | src/memorymap/ai/skill_runner.py:88 |
| `_touched_ids` | src/memorymap/ai/skill_runner.py:84 |
| `_undo_span` | src/memorymap/ai/skill_runner.py:779 |
| `_unmet_reason` | src/memorymap/ai/skill_runner.py:372 |
| `run_skill` | src/memorymap/ai/skill_runner.py:727 |
| `verify` | src/memorymap/ai/skill_runner.py:249 |

### src/memorymap/ai/skills.py (24)

| Name | File:line |
|---|---|
| `SkillError` | src/memorymap/ai/skills.py:166 |
| `_checked_folder_skill` | src/memorymap/ai/skills.py:1730 |
| `_one_step_spec` | src/memorymap/ai/skills.py:223 |
| `_step` | src/memorymap/ai/skills.py:836 |
| `_step_specs` | src/memorymap/ai/skills.py:185 |
| `_text` | src/memorymap/ai/skills.py:178 |
| `_verify_args` | src/memorymap/ai/skills.py:330 |
| `ad_hoc_plan` | src/memorymap/ai/skills.py:605 |
| `builtins` | src/memorymap/ai/skills.py:1693 |
| `catalog` | src/memorymap/ai/skills.py:1705 |
| `contract_nudge` | src/memorymap/ai/skills.py:398 |
| `fill` | src/memorymap/ai/skills.py:640 |
| `find` | src/memorymap/ai/skills.py:1768 |
| `folder_skills` | src/memorymap/ai/skills.py:1738 |
| `input_values` | src/memorymap/ai/skills.py:667 |
| `is_action` | src/memorymap/ai/skills.py:600 |
| `missing_inputs` | src/memorymap/ai/skills.py:656 |
| `normalise` | src/memorymap/ai/skills.py:488 |
| `run_instruction` | src/memorymap/ai/skills.py:678 |
| `state_line` | src/memorymap/ai/skills.py:452 |
| `step_instruction` | src/memorymap/ai/skills.py:725 |
| `step_specs` | src/memorymap/ai/skills.py:373 |
| `stored` | src/memorymap/ai/skills.py:1700 |
| `verify_spec` | src/memorymap/ai/skills.py:265 |

### src/memorymap/ai/source_check.py (5)

| Name | File:line |
|---|---|
| `Sources` | src/memorymap/ai/source_check.py:72 |
| `_number_key` | src/memorymap/ai/source_check.py:66 |
| `heads_up` | src/memorymap/ai/source_check.py:153 |
| `sources_from_messages` | src/memorymap/ai/source_check.py:102 |
| `unbacked_claims` | src/memorymap/ai/source_check.py:114 |

### src/memorymap/ai/starter_acts.py (20)

| Name | File:line |
|---|---|
| `_append_today` | src/memorymap/ai/starter_acts.py:258 |
| `_best_pairs` | src/memorymap/ai/starter_acts.py:216 |
| `_changed` | src/memorymap/ai/starter_acts.py:106 |
| `_conversation` | src/memorymap/ai/starter_acts.py:136 |
| `_digest_lines` | src/memorymap/ai/starter_acts.py:97 |
| `_due` | src/memorymap/ai/starter_acts.py:120 |
| `_link_related` | src/memorymap/ai/starter_acts.py:238 |
| `_linked` | src/memorymap/ai/starter_acts.py:212 |
| `_list_answer` | src/memorymap/ai/starter_acts.py:102 |
| `_listed` | src/memorymap/ai/starter_acts.py:168 |
| `_loose_ends` | src/memorymap/ai/starter_acts.py:113 |
| `_open_note` | src/memorymap/ai/starter_acts.py:148 |
| `_original_tail` | src/memorymap/ai/starter_acts.py:77 |
| `_since_a_day` | src/memorymap/ai/starter_acts.py:72 |
| `_tag_untagged` | src/memorymap/ai/starter_acts.py:181 |
| `_tags_of` | src/memorymap/ai/starter_acts.py:173 |
| `_today_note` | src/memorymap/ai/starter_acts.py:249 |
| `_vectors` | src/memorymap/ai/starter_acts.py:202 |
| `events` | src/memorymap/ai/starter_acts.py:82 |
| `read` | src/memorymap/ai/starter_acts.py:50 |

### src/memorymap/ai/tagging.py (32)

| Name | File:line |
|---|---|
| `_Ask` | src/memorymap/ai/tagging.py:178 |
| `_Vocab` | src/memorymap/ai/tagging.py:213 |
| `_choose` | src/memorymap/ai/tagging.py:403 |
| `_damp` | src/memorymap/ai/tagging.py:363 |
| `_key` | src/memorymap/ai/tagging.py:207 |
| `_link_votes` | src/memorymap/ai/tagging.py:308 |
| `_name_vote` | src/memorymap/ai/tagging.py:272 |
| `_name_votes` | src/memorymap/ai/tagging.py:287 |
| `_neighbour_votes` | src/memorymap/ai/tagging.py:252 |
| `_offered_again` | src/memorymap/ai/tagging.py:343 |
| `_owns_topic` | src/memorymap/ai/tagging.py:265 |
| `_purpose_grounds` | src/memorymap/ai/tagging.py:120 |
| `_query_bag` | src/memorymap/ai/tagging.py:200 |
| `_read` | src/memorymap/ai/tagging.py:189 |
| `_rides_a_sibling` | src/memorymap/ai/tagging.py:297 |
| `_said` | src/memorymap/ai/tagging.py:113 |
| `_said_outright` | src/memorymap/ai/tagging.py:260 |
| `_subsumed` | src/memorymap/ai/tagging.py:369 |
| `_vocabulary` | src/memorymap/ai/tagging.py:229 |
| `grounded` | src/memorymap/ai/tagging.py:164 |
| `grounded_keys` | src/memorymap/ai/tagging.py:418 |
| `grounds` | src/memorymap/ai/tagging.py:131 |
| `lead` | src/memorymap/ai/tagging.py:78 |
| `merged` | src/memorymap/ai/tagging.py:423 |
| `offer_again` | src/memorymap/ai/tagging.py:353 |
| `reason` | src/memorymap/ai/tagging.py:153 |
| `stem` | src/memorymap/ai/tagging.py:88 |
| `stems` | src/memorymap/ai/tagging.py:101 |
| `suggest` | src/memorymap/ai/tagging.py:376 |
| `tag_stems` | src/memorymap/ai/tagging.py:109 |
| `tag_words` | src/memorymap/ai/tagging.py:105 |
| `turned_down` | src/memorymap/ai/tagging.py:324 |

### src/memorymap/ai/taxonomy.py (43)

| Name | File:line |
|---|---|
| `__getattr__` | src/memorymap/ai/taxonomy.py:103 |
| `_analyze_topics` | src/memorymap/ai/taxonomy.py:179 |
| `_bundled_entities` | src/memorymap/ai/taxonomy.py:311 |
| `_data` | src/memorymap/ai/taxonomy.py:66 |
| `_filing_data` | src/memorymap/ai/taxonomy.py:481 |
| `_fold_plurals` | src/memorymap/ai/taxonomy.py:557 |
| `_functional` | src/memorymap/ai/taxonomy.py:86 |
| `_hits` | src/memorymap/ai/taxonomy.py:504 |
| `_keyword_index` | src/memorymap/ai/taxonomy.py:127 |
| `_labels` | src/memorymap/ai/taxonomy.py:582 |
| `_name_topics` | src/memorymap/ai/taxonomy.py:588 |
| `_normalize_term` | src/memorymap/ai/taxonomy.py:417 |
| `_occupation_data` | src/memorymap/ai/taxonomy.py:268 |
| `_occupation_processor` | src/memorymap/ai/taxonomy.py:273 |
| `_read` | src/memorymap/ai/taxonomy.py:61 |
| `_weak_terms` | src/memorymap/ai/taxonomy.py:95 |
| `analyze_note` | src/memorymap/ai/taxonomy.py:374 |
| `audit_taxonomy` | src/memorymap/ai/taxonomy.py:250 |
| `build_alias_index` | src/memorymap/ai/taxonomy.py:433 |
| `category_groups` | src/memorymap/ai/taxonomy.py:99 |
| `context_rules` | src/memorymap/ai/taxonomy.py:407 |
| `extract_categories` | src/memorymap/ai/taxonomy.py:170 |
| `extract_dynamic_categories` | src/memorymap/ai/taxonomy.py:236 |
| `extract_entities` | src/memorymap/ai/taxonomy.py:322 |
| `extract_keywords` | src/memorymap/ai/taxonomy.py:165 |
| `extract_occupations` | src/memorymap/ai/taxonomy.py:291 |
| `functional_categories` | src/memorymap/ai/taxonomy.py:81 |
| `functional_priority` | src/memorymap/ai/taxonomy.py:77 |
| `get_keyword_processor` | src/memorymap/ai/taxonomy.py:138 |
| `get_taxonomy_processor` | src/memorymap/ai/taxonomy.py:146 |
| `merge_reviewed_topic_terms` | src/memorymap/ai/taxonomy.py:452 |
| `merge_taxonomy` | src/memorymap/ai/taxonomy.py:423 |
| `name_topics` | src/memorymap/ai/taxonomy.py:572 |
| `normalize_text` | src/memorymap/ai/taxonomy.py:119 |
| `purpose_hits` | src/memorymap/ai/taxonomy.py:498 |
| `reload_taxonomy` | src/memorymap/ai/taxonomy.py:398 |
| `reset_taxonomy_processors` | src/memorymap/ai/taxonomy.py:154 |
| `sensitive_topics` | src/memorymap/ai/taxonomy.py:485 |
| `strong_topics` | src/memorymap/ai/taxonomy.py:541 |
| `taxonomy_map` | src/memorymap/ai/taxonomy.py:70 |
| `topic_hits` | src/memorymap/ai/taxonomy.py:490 |
| `topic_weights` | src/memorymap/ai/taxonomy.py:527 |
| `weak_terms` | src/memorymap/ai/taxonomy.py:90 |

### src/memorymap/ai/tensions.py (16)

| Name | File:line |
|---|---|
| `Tension` | src/memorymap/ai/tensions.py:114 |
| `_AllSpaces` | src/memorymap/ai/tensions.py:320 |
| `_clean_explanation` | src/memorymap/ai/tensions.py:162 |
| `_excerpt` | src/memorymap/ai/tensions.py:154 |
| `_finding` | src/memorymap/ai/tensions.py:368 |
| `_gap_days` | src/memorymap/ai/tensions.py:200 |
| `_stamp` | src/memorymap/ai/tensions.py:257 |
| `compare_pair` | src/memorymap/ai/tensions.py:206 |
| `derive` | src/memorymap/ai/tensions.py:374 |
| `listing` | src/memorymap/ai/tensions.py:527 |
| `order_by_time` | src/memorymap/ai/tensions.py:261 |
| `pair_key` | src/memorymap/ai/tensions.py:301 |
| `rebuild` | src/memorymap/ai/tensions.py:508 |
| `record_event` | src/memorymap/ai/tensions.py:308 |
| `refresh` | src/memorymap/ai/tensions.py:521 |
| `sources_version` | src/memorymap/ai/tensions.py:342 |

### src/memorymap/ai/timetravel.py (14)

| Name | File:line |
|---|---|
| `Then` | src/memorymap/ai/timetravel.py:41 |
| `_aware` | src/memorymap/ai/timetravel.py:52 |
| `_overlap` | src/memorymap/ai/timetravel.py:177 |
| `_revisions` | src/memorymap/ai/timetravel.py:58 |
| `_terms` | src/memorymap/ai/timetravel.py:93 |
| `_then` | src/memorymap/ai/timetravel.py:73 |
| `claims` | src/memorymap/ai/timetravel.py:171 |
| `day_words` | src/memorymap/ai/timetravel.py:148 |
| `end_of_day` | src/memorymap/ai/timetravel.py:140 |
| `notebook_began` | src/memorymap/ai/timetravel.py:154 |
| `revision_candidates` | src/memorymap/ai/timetravel.py:99 |
| `rewind` | src/memorymap/ai/timetravel.py:117 |
| `text_as_of` | src/memorymap/ai/timetravel.py:86 |
| `then_and_now` | src/memorymap/ai/timetravel.py:184 |

### src/memorymap/ai/tool_fallback.py (1)

| Name | File:line |
|---|---|
| `for_tools` | src/memorymap/ai/tool_fallback.py:27 |

### src/memorymap/ai/tools/__init__.py (90)

| Name | File:line |
|---|---|
| `_ai_actor` | src/memorymap/ai/tools/__init__.py:4647 |
| `_ask_user` | src/memorymap/ai/tools/__init__.py:1982 |
| `_audit_link_reasons` | src/memorymap/ai/tools/__init__.py:2490 |
| `_calculate` | src/memorymap/ai/tools/__init__.py:952 |
| `_check_answer` | src/memorymap/ai/tools/__init__.py:984 |
| `_coerce` | src/memorymap/ai/tools/__init__.py:4696 |
| `_coerce_array` | src/memorymap/ai/tools/__init__.py:4670 |
| `_complete_reminder` | src/memorymap/ai/tools/__init__.py:1777 |
| `_compress_chat` | src/memorymap/ai/tools/__init__.py:2266 |
| `_count_notes` | src/memorymap/ai/tools/__init__.py:753 |
| `_create_note` | src/memorymap/ai/tools/__init__.py:1317 |
| `_delete_note` | src/memorymap/ai/tools/__init__.py:1645 |
| `_delete_skill` | src/memorymap/ai/tools/__init__.py:1299 |
| `_delete_tag` | src/memorymap/ai/tools/__init__.py:1958 |
| `_describe_param` | src/memorymap/ai/tools/__init__.py:4754 |
| `_edit_note` | src/memorymap/ai/tools/__init__.py:1356 |
| `_example_value` | src/memorymap/ai/tools/__init__.py:4333 |
| `_find_contradictions` | src/memorymap/ai/tools/__init__.py:2509 |
| `_find_similar_notes` | src/memorymap/ai/tools/__init__.py:423 |
| `_first_sentence` | src/memorymap/ai/tools/__init__.py:4461 |
| `_fold_key` | src/memorymap/ai/tools/__init__.py:4664 |
| `_get_current_time` | src/memorymap/ai/tools/__init__.py:927 |
| `_get_note_tool` | src/memorymap/ai/tools/__init__.py:119 |
| `_graph_neighbours` | src/memorymap/ai/tools/__init__.py:179 |
| `_graph_summary` | src/memorymap/ai/tools/__init__.py:146 |
| `_is_plural_variant` | src/memorymap/ai/tools/__init__.py:4313 |
| `_link_notes` | src/memorymap/ai/tools/__init__.py:1559 |
| `_list_categories` | src/memorymap/ai/tools/__init__.py:845 |
| `_list_notes` | src/memorymap/ai/tools/__init__.py:671 |
| `_list_reminders` | src/memorymap/ai/tools/__init__.py:1735 |
| `_list_skills` | src/memorymap/ai/tools/__init__.py:1171 |
| `_list_tags` | src/memorymap/ai/tools/__init__.py:869 |
| `_make_plan` | src/memorymap/ai/tools/__init__.py:2164 |
| `_match_skill` | src/memorymap/ai/tools/__init__.py:2066 |
| `_notebook_overview` | src/memorymap/ai/tools/__init__.py:891 |
| `_notebook_structure` | src/memorymap/ai/tools/__init__.py:544 |
| `_path_between` | src/memorymap/ai/tools/__init__.py:445 |
| `_pin_note` | src/memorymap/ai/tools/__init__.py:1489 |
| `_plan_steps` | src/memorymap/ai/tools/__init__.py:2180 |
| `_propose_act` | src/memorymap/ai/tools/__init__.py:993 |
| `_read_text` | src/memorymap/ai/tools/__init__.py:972 |
| `_read_url` | src/memorymap/ai/tools/__init__.py:1880 |
| `_related_notes` | src/memorymap/ai/tools/__init__.py:336 |
| `_rename_tag` | src/memorymap/ai/tools/__init__.py:1795 |
| `_requested_ids` | src/memorymap/ai/tools/__init__.py:1402 |
| `_resolve_link_type` | src/memorymap/ai/tools/__init__.py:1542 |
| `_restore_note` | src/memorymap/ai/tools/__init__.py:1656 |
| `_run_skill` | src/memorymap/ai/tools/__init__.py:2040 |
| `_save_skill` | src/memorymap/ai/tools/__init__.py:1244 |
| `_save_user_preference` | src/memorymap/ai/tools/__init__.py:2410 |
| `_schema_key` | src/memorymap/ai/tools/__init__.py:4790 |
| `_scope_filters` | src/memorymap/ai/tools/__init__.py:622 |
| `_scope_label` | src/memorymap/ai/tools/__init__.py:659 |
| `_search_chat_history` | src/memorymap/ai/tools/__init__.py:1094 |
| `_search_help` | src/memorymap/ai/tools/__init__.py:914 |
| `_search_notes` | src/memorymap/ai/tools/__init__.py:72 |
| `_set_reminder` | src/memorymap/ai/tools/__init__.py:1680 |
| `_skill_key` | src/memorymap/ai/tools/__init__.py:2055 |
| `_suggested_neighbours` | src/memorymap/ai/tools/__init__.py:272 |
| `_summarize_notes` | src/memorymap/ai/tools/__init__.py:1011 |
| `_tag_note` | src/memorymap/ai/tools/__init__.py:1428 |
| `_unlink_notes` | src/memorymap/ai/tools/__init__.py:1601 |
| `_verify_block` | src/memorymap/ai/tools/__init__.py:1217 |
| `_web_search` | src/memorymap/ai/tools/__init__.py:1812 |
| `adds_to_a_named_note` | src/memorymap/ai/tools/__init__.py:4162 |
| `budget_for_window` | src/memorymap/ai/tools/__init__.py:4571 |
| `call_example` | src/memorymap/ai/tools/__init__.py:4281 |
| `check_arguments` | src/memorymap/ai/tools/__init__.py:4807 |
| `compact_schemas` | src/memorymap/ai/tools/__init__.py:4472 |
| `confirm_label` | src/memorymap/ai/tools/__init__.py:4615 |
| `example_arguments` | src/memorymap/ai/tools/__init__.py:4764 |
| `execute_tool` | src/memorymap/ai/tools/__init__.py:4848 |
| `focus_detail` | src/memorymap/ai/tools/__init__.py:4183 |
| `focus_for` | src/memorymap/ai/tools/__init__.py:4168 |
| `handoff_event` | src/memorymap/ai/tools/__init__.py:2387 |
| `is_follow_through` | src/memorymap/ai/tools/__init__.py:4146 |
| `link_type_description` | src/memorymap/ai/tools/__init__.py:1520 |
| `ollama_tools` | src/memorymap/ai/tools/__init__.py:4345 |
| `prefetch_web` | src/memorymap/ai/tools/__init__.py:1850 |
| `schema_chars` | src/memorymap/ai/tools/__init__.py:4440 |
| `summarise_turns` | src/memorymap/ai/tools/__init__.py:2231 |
| `tool_catalog` | src/memorymap/ai/tools/__init__.py:4588 |
| `tool_enabled` | src/memorymap/ai/tools/__init__.py:4251 |
| `validate_ask` | src/memorymap/ai/tools/__init__.py:1998 |
| `validate_compress_chat` | src/memorymap/ai/tools/__init__.py:2282 |
| `validate_make_plan` | src/memorymap/ai/tools/__init__.py:2313 |
| `validate_propose_act` | src/memorymap/ai/tools/__init__.py:2348 |
| `validate_run_skill` | src/memorymap/ai/tools/__init__.py:2081 |
| `with_relation_types` | src/memorymap/ai/tools/__init__.py:4372 |
| `within_budget` | src/memorymap/ai/tools/__init__.py:4526 |

### src/memorymap/ai/tools/_common.py (15)

| Name | File:line |
|---|---|
| `ToolError` | src/memorymap/ai/tools/_common.py:77 |
| `ToolSpec` | src/memorymap/ai/tools/_common.py:94 |
| `_category_clause` | src/memorymap/ai/tools/_common.py:349 |
| `_clip` | src/memorymap/ai/tools/_common.py:135 |
| `_keyword_context` | src/memorymap/ai/tools/_common.py:154 |
| `_limit_arg` | src/memorymap/ai/tools/_common.py:339 |
| `_note_summary` | src/memorymap/ai/tools/_common.py:250 |
| `_readable` | src/memorymap/ai/tools/_common.py:241 |
| `_refresh_embedding` | src/memorymap/ai/tools/_common.py:395 |
| `_require_note` | src/memorymap/ai/tools/_common.py:316 |
| `_since_days` | src/memorymap/ai/tools/_common.py:367 |
| `_undo_edit` | src/memorymap/ai/tools/_common.py:295 |
| `_visible` | src/memorymap/ai/tools/_common.py:222 |
| `mark_outside` | src/memorymap/ai/tools/_common.py:66 |
| `outside_seen` | src/memorymap/ai/tools/_common.py:72 |

### src/memorymap/ai/tools/board_edit.py (16)

| Name | File:line |
|---|---|
| `_add_board_shape` | src/memorymap/ai/tools/board_edit.py:280 |
| `_box` | src/memorymap/ai/tools/board_edit.py:133 |
| `_colour` | src/memorymap/ai/tools/board_edit.py:35 |
| `_data` | src/memorymap/ai/tools/board_edit.py:67 |
| `_delete_board_item` | src/memorymap/ai/tools/board_edit.py:216 |
| `_edit_board_item` | src/memorymap/ai/tools/board_edit.py:169 |
| `_entity` | src/memorymap/ai/tools/board_edit.py:76 |
| `_list_library` | src/memorymap/ai/tools/board_edit.py:319 |
| `_load` | src/memorymap/ai/tools/board_edit.py:46 |
| `_move_board_item` | src/memorymap/ai/tools/board_edit.py:140 |
| `_path_corner` | src/memorymap/ai/tools/board_edit.py:95 |
| `_place_library_item` | src/memorymap/ai/tools/board_edit.py:343 |
| `_record` | src/memorymap/ai/tools/board_edit.py:88 |
| `_restore_board_item` | src/memorymap/ai/tools/board_edit.py:240 |
| `_shape_path` | src/memorymap/ai/tools/board_edit.py:271 |
| `_state` | src/memorymap/ai/tools/board_edit.py:80 |

### src/memorymap/ai/tools/categories.py (5)

| Name | File:line |
|---|---|
| `_create_category` | src/memorymap/ai/tools/categories.py:60 |
| `_delete_category` | src/memorymap/ai/tools/categories.py:171 |
| `_find_category` | src/memorymap/ai/tools/categories.py:28 |
| `_merge_categories` | src/memorymap/ai/tools/categories.py:136 |
| `_rename_category` | src/memorymap/ai/tools/categories.py:99 |

### src/memorymap/ai/tools/contracts.py (27)

| Name | File:line |
|---|---|
| `_category_exists` | src/memorymap/ai/tools/contracts.py:279 |
| `_category_names` | src/memorymap/ai/tools/contracts.py:72 |
| `_entry` | src/memorymap/ai/tools/contracts.py:167 |
| `_fold` | src/memorymap/ai/tools/contracts.py:68 |
| `_ids` | src/memorymap/ai/tools/contracts.py:57 |
| `_linked` | src/memorymap/ai/tools/contracts.py:230 |
| `_loggable` | src/memorymap/ai/tools/contracts.py:340 |
| `_post_binned` | src/memorymap/ai/tools/contracts.py:259 |
| `_post_category_gone` | src/memorymap/ai/tools/contracts.py:296 |
| `_post_category_present` | src/memorymap/ai/tools/contracts.py:286 |
| `_post_linked` | src/memorymap/ai/tools/contracts.py:244 |
| `_post_note_written` | src/memorymap/ai/tools/contracts.py:175 |
| `_post_pinned` | src/memorymap/ai/tools/contracts.py:222 |
| `_post_reminder` | src/memorymap/ai/tools/contracts.py:269 |
| `_post_tag_gone` | src/memorymap/ai/tools/contracts.py:311 |
| `_post_tags` | src/memorymap/ai/tools/contracts.py:204 |
| `_post_unlinked` | src/memorymap/ai/tools/contracts.py:252 |
| `_pre_category` | src/memorymap/ai/tools/contracts.py:96 |
| `_pre_rename_differs` | src/memorymap/ai/tools/contracts.py:149 |
| `_pre_restorable` | src/memorymap/ai/tools/contracts.py:157 |
| `_pre_tag_change` | src/memorymap/ai/tools/contracts.py:130 |
| `_pre_tag_exists` | src/memorymap/ai/tools/contracts.py:136 |
| `_pre_targets_live` | src/memorymap/ai/tools/contracts.py:115 |
| `_wanted_tags` | src/memorymap/ai/tools/contracts.py:197 |
| `near_category` | src/memorymap/ai/tools/contracts.py:76 |
| `postcondition` | src/memorymap/ai/tools/contracts.py:359 |
| `precondition` | src/memorymap/ai/tools/contracts.py:345 |

### src/memorymap/ai/tools/documents.py (4)

| Name | File:line |
|---|---|
| `_create_document` | src/memorymap/ai/tools/documents.py:169 |
| `_delete_document` | src/memorymap/ai/tools/documents.py:219 |
| `_get_document` | src/memorymap/ai/tools/documents.py:89 |
| `_list_documents` | src/memorymap/ai/tools/documents.py:26 |

### src/memorymap/ai/tools/files.py (6)

| Name | File:line |
|---|---|
| `_attachment_row` | src/memorymap/ai/tools/files.py:105 |
| `_file_text` | src/memorymap/ai/tools/files.py:58 |
| `_matches` | src/memorymap/ai/tools/files.py:69 |
| `_media_row` | src/memorymap/ai/tools/files.py:83 |
| `_read_file` | src/memorymap/ai/tools/files.py:168 |
| `_search_files` | src/memorymap/ai/tools/files.py:121 |

### src/memorymap/ai/tools/whiteboard.py (17)

| Name | File:line |
|---|---|
| `_add_map_node` | src/memorymap/ai/tools/whiteboard.py:757 |
| `_add_whiteboard_card` | src/memorymap/ai/tools/whiteboard.py:325 |
| `_add_whiteboard_link` | src/memorymap/ai/tools/whiteboard.py:365 |
| `_create_mindmap` | src/memorymap/ai/tools/whiteboard.py:702 |
| `_diagram_tree_positions` | src/memorymap/ai/tools/whiteboard.py:416 |
| `_draw_link` | src/memorymap/ai/tools/whiteboard.py:93 |
| `_generate_diagram` | src/memorymap/ai/tools/whiteboard.py:470 |
| `_inside` | src/memorymap/ai/tools/whiteboard.py:151 |
| `_link_map_nodes` | src/memorymap/ai/tools/whiteboard.py:844 |
| `_new_board` | src/memorymap/ai/tools/whiteboard.py:130 |
| `_outline_lines` | src/memorymap/ai/tools/whiteboard.py:629 |
| `_place_card` | src/memorymap/ai/tools/whiteboard.py:58 |
| `_place_object` | src/memorymap/ai/tools/whiteboard.py:114 |
| `_read_mindmap` | src/memorymap/ai/tools/whiteboard.py:650 |
| `_read_whiteboard` | src/memorymap/ai/tools/whiteboard.py:159 |
| `_search_whiteboard` | src/memorymap/ai/tools/whiteboard.py:268 |
| `_whiteboard_board_filter` | src/memorymap/ai/tools/whiteboard.py:23 |

### src/memorymap/ai/toolwords.py (4)

| Name | File:line |
|---|---|
| `Focus` | src/memorymap/ai/toolwords.py:118 |
| `_compile` | src/memorymap/ai/toolwords.py:179 |
| `looks_like_a_question_about` | src/memorymap/ai/toolwords.py:235 |
| `score_groups` | src/memorymap/ai/toolwords.py:212 |

### src/memorymap/ai/translate.py (3)

| Name | File:line |
|---|---|
| `_folder` | src/memorymap/ai/translate.py:63 |
| `served` | src/memorymap/ai/translate.py:85 |
| `status` | src/memorymap/ai/translate.py:67 |

### src/memorymap/ai/utilities.py (23)

| Name | File:line |
|---|---|
| `_clean` | src/memorymap/ai/utilities.py:98 |
| `_compile_convert` | src/memorymap/ai/utilities.py:40 |
| `_compile_money` | src/memorymap/ai/utilities.py:60 |
| `_convert` | src/memorymap/ai/utilities.py:148 |
| `_currency` | src/memorymap/ai/utilities.py:169 |
| `_dates` | src/memorymap/ai/utilities.py:196 |
| `_day_words` | src/memorymap/ai/utilities.py:118 |
| `_heading_at` | src/memorymap/ai/utilities.py:382 |
| `_number` | src/memorymap/ai/utilities.py:105 |
| `_one` | src/memorymap/ai/utilities.py:129 |
| `_patterns` | src/memorymap/ai/utilities.py:71 |
| `_plural` | src/memorymap/ai/utilities.py:122 |
| `_said` | src/memorymap/ai/utilities.py:109 |
| `_salted` | src/memorymap/ai/utilities.py:191 |
| `_sum_of` | src/memorymap/ai/utilities.py:248 |
| `_temperature` | src/memorymap/ai/utilities.py:143 |
| `answer` | src/memorymap/ai/utilities.py:290 |
| `counts` | src/memorymap/ai/utilities.py:355 |
| `kind_of` | src/memorymap/ai/utilities.py:252 |
| `now_day` | src/memorymap/ai/utilities.py:234 |
| `outline` | src/memorymap/ai/utilities.py:398 |
| `reading_time` | src/memorymap/ai/utilities.py:370 |
| `until_subject` | src/memorymap/ai/utilities.py:238 |

### src/memorymap/ai/validate.py (12)

| Name | File:line |
|---|---|
| `Finding` | src/memorymap/ai/validate.py:58 |
| `_app_sentences` | src/memorymap/ai/validate.py:171 |
| `_measures_by_sentence` | src/memorymap/ai/validate.py:99 |
| `_title_of` | src/memorymap/ai/validate.py:166 |
| `_values` | src/memorymap/ai/validate.py:89 |
| `check_model_answer` | src/memorymap/ai/validate.py:234 |
| `computed_rule` | src/memorymap/ai/validate.py:193 |
| `grounding_marks` | src/memorymap/ai/validate.py:75 |
| `maxims` | src/memorymap/ai/validate.py:114 |
| `report` | src/memorymap/ai/validate.py:224 |
| `slots_missing` | src/memorymap/ai/validate.py:216 |
| `source_check` | src/memorymap/ai/validate.py:70 |

### src/memorymap/ai/vision_ocr.py (11)

| Name | File:line |
|---|---|
| `cut_reading_loops` | src/memorymap/ai/vision_ocr.py:122 |
| `finish_page_read` | src/memorymap/ai/vision_ocr.py:66 |
| `pdf_reader_or_none` | src/memorymap/ai/vision_ocr.py:201 |
| `pdf_vision_ocr_and_store` | src/memorymap/ai/vision_ocr.py:340 |
| `pdf_vision_ocr_in_background` | src/memorymap/ai/vision_ocr.py:415 |
| `pdf_vision_reader` | src/memorymap/ai/vision_ocr.py:244 |
| `register_page_read` | src/memorymap/ai/vision_ocr.py:56 |
| `running_page_reads` | src/memorymap/ai/vision_ocr.py:74 |
| `vision_ocr_and_store` | src/memorymap/ai/vision_ocr.py:288 |
| `vision_ocr_in_background` | src/memorymap/ai/vision_ocr.py:422 |
| `vision_ocr_text` | src/memorymap/ai/vision_ocr.py:161 |

### src/memorymap/ai/voice.py (3)

| Name | File:line |
|---|---|
| `_get_model` | src/memorymap/ai/voice.py:43 |
| `transcribe` | src/memorymap/ai/voice.py:54 |
| `whisper_available` | src/memorymap/ai/voice.py:39 |

### src/memorymap/api/app.py (32)

| Name | File:line |
|---|---|
| `RequestPulse` | src/memorymap/api/app.py:1082 |
| `RevalidatedStatic` | src/memorymap/api/app.py:306 |
| `SpaceGuard` | src/memorymap/api/app.py:1013 |
| `_UnversionedStatic` | src/memorymap/api/app.py:297 |
| `_add_middleware` | src/memorymap/api/app.py:1154 |
| `_add_system_routes` | src/memorymap/api/app.py:1328 |
| `_backup_if_due` | src/memorymap/api/app.py:703 |
| `_check_notebook_file` | src/memorymap/api/app.py:695 |
| `_choose_chat_model_if_missing` | src/memorymap/api/app.py:648 |
| `_code_for_status` | src/memorymap/api/app.py:800 |
| `_compact_event_log` | src/memorymap/api/app.py:573 |
| `_compact_step` | src/memorymap/api/app.py:619 |
| `_content_length` | src/memorymap/api/app.py:1065 |
| `_include_routers` | src/memorymap/api/app.py:1240 |
| `_install_pending_extras` | src/memorymap/api/app.py:627 |
| `_purge_expired_bin_entries` | src/memorymap/api/app.py:549 |
| `_purge_step` | src/memorymap/api/app.py:615 |
| `_register_error_handlers` | src/memorymap/api/app.py:811 |
| `_stamp_for` | src/memorymap/api/app.py:220 |
| `_start_autonomous_loop` | src/memorymap/api/app.py:755 |
| `_start_searxng_if_asked` | src/memorymap/api/app.py:723 |
| `_start_services` | src/memorymap/api/app.py:1097 |
| `_startup_maintenance` | src/memorymap/api/app.py:667 |
| `_static_gzip` | src/memorymap/api/app.py:488 |
| `asset_hash` | src/memorymap/api/app.py:196 |
| `asset_stamps` | src/memorymap/api/app.py:225 |
| `clear_static_cache` | src/memorymap/api/app.py:529 |
| `create_app` | src/memorymap/api/app.py:1438 |
| `out_of_space_body` | src/memorymap/api/app.py:983 |
| `pin_static_mime_types` | src/memorymap/api/app.py:163 |
| `served_index_html` | src/memorymap/api/app.py:262 |
| `served_offline_html` | src/memorymap/api/app.py:247 |

### src/memorymap/api/asset_strip.py (13)

| Name | File:line |
|---|---|
| `_html_tag_end` | src/memorymap/api/asset_strip.py:328 |
| `_js_regex_allowed` | src/memorymap/api/asset_strip.py:112 |
| `_keep` | src/memorymap/api/asset_strip.py:50 |
| `_rebuild` | src/memorymap/api/asset_strip.py:56 |
| `_skip_regex` | src/memorymap/api/asset_strip.py:164 |
| `_skip_string` | src/memorymap/api/asset_strip.py:147 |
| `css_comment_spans` | src/memorymap/api/asset_strip.py:275 |
| `html_comment_spans` | src/memorymap/api/asset_strip.py:344 |
| `js_comment_spans` | src/memorymap/api/asset_strip.py:190 |
| `strip_css` | src/memorymap/api/asset_strip.py:311 |
| `strip_for_path` | src/memorymap/api/asset_strip.py:391 |
| `strip_html` | src/memorymap/api/asset_strip.py:387 |
| `strip_js` | src/memorymap/api/asset_strip.py:266 |

### src/memorymap/api/edit_conflicts.py (5)

| Name | File:line |
|---|---|
| `_refuse` | src/memorymap/api/edit_conflicts.py:98 |
| `content_hash` | src/memorymap/api/edit_conflicts.py:33 |
| `entity_tag` | src/memorymap/api/edit_conflicts.py:67 |
| `refuse_if_stale` | src/memorymap/api/edit_conflicts.py:42 |
| `refuse_unless_match` | src/memorymap/api/edit_conflicts.py:77 |

### src/memorymap/api/paging.py (13)

| Name | File:line |
|---|---|
| `OffsetPage` | src/memorymap/api/paging.py:105 |
| `_jsonable` | src/memorymap/api/paging.py:54 |
| `_pack` | src/memorymap/api/paging.py:49 |
| `_revive` | src/memorymap/api/paging.py:71 |
| `_unpack` | src/memorymap/api/paging.py:60 |
| `cursor_param` | src/memorymap/api/paging.py:144 |
| `finish` | src/memorymap/api/paging.py:138 |
| `keyset_cursor` | src/memorymap/api/paging.py:80 |
| `offset_cursor` | src/memorymap/api/paging.py:85 |
| `read_keyset` | src/memorymap/api/paging.py:89 |
| `read_offset` | src/memorymap/api/paging.py:97 |
| `resolve` | src/memorymap/api/paging.py:126 |
| `start` | src/memorymap/api/paging.py:132 |

### src/memorymap/api/routes_ask_history.py (8)

| Name | File:line |
|---|---|
| `_live_grounding` | src/memorymap/api/routes_ask_history.py:136 |
| `_summary` | src/memorymap/api/routes_ask_history.py:33 |
| `ask_history_stats` | src/memorymap/api/routes_ask_history.py:84 |
| `clear_ask_history` | src/memorymap/api/routes_ask_history.py:182 |
| `delete_ask_turn` | src/memorymap/api/routes_ask_history.py:172 |
| `get_ask_turn` | src/memorymap/api/routes_ask_history.py:92 |
| `list_ask_history` | src/memorymap/api/routes_ask_history.py:48 |
| `pin_ask_turn` | src/memorymap/api/routes_ask_history.py:164 |

### src/memorymap/api/routes_auth.py (62)

| Name | File:line |
|---|---|
| `ChangePasswordBody` | src/memorymap/api/routes_auth.py:949 |
| `LanAccessBody` | src/memorymap/api/routes_auth.py:818 |
| `PasswordBody` | src/memorymap/api/routes_auth.py:477 |
| `PasswordOnOpenBody` | src/memorymap/api/routes_auth.py:776 |
| `RecoverBody` | src/memorymap/api/routes_auth.py:1245 |
| `RecoveryKeyBody` | src/memorymap/api/routes_auth.py:1241 |
| `ResetBody` | src/memorymap/api/routes_auth.py:1250 |
| `RotateVaultKeyBody` | src/memorymap/api/routes_auth.py:1066 |
| `SaveRecoveryKeyBody` | src/memorymap/api/routes_auth.py:1311 |
| `VaultScope` | src/memorymap/api/routes_auth.py:98 |
| `_auto_session_allowed` | src/memorymap/api/routes_auth.py:234 |
| `_bcrypt_input` | src/memorymap/api/routes_auth.py:399 |
| `_clear_unlock_failures` | src/memorymap/api/routes_auth.py:315 |
| `_client_key` | src/memorymap/api/routes_auth.py:323 |
| `_cookie_secure` | src/memorymap/api/routes_auth.py:155 |
| `_end_sessions_and_issue` | src/memorymap/api/routes_auth.py:1262 |
| `_forget_dead_tickets` | src/memorymap/api/routes_auth.py:149 |
| `_from_this_computer` | src/memorymap/api/routes_auth.py:211 |
| `_get_user` | src/memorymap/api/routes_auth.py:483 |
| `_grant_media` | src/memorymap/api/routes_auth.py:242 |
| `_hash_password` | src/memorymap/api/routes_auth.py:410 |
| `_is_loopback_address` | src/memorymap/api/routes_auth.py:200 |
| `_iso` | src/memorymap/api/routes_auth.py:984 |
| `_issue_token` | src/memorymap/api/routes_auth.py:572 |
| `_lan_state` | src/memorymap/api/routes_auth.py:823 |
| `_new_password_problem` | src/memorymap/api/routes_auth.py:439 |
| `_notebook_has_password_now` | src/memorymap/api/routes_auth.py:1440 |
| `_password_matches` | src/memorymap/api/routes_auth.py:414 |
| `_password_set` | src/memorymap/api/routes_auth.py:502 |
| `_refuse_if_throttled` | src/memorymap/api/routes_auth.py:347 |
| `_refuse_unless_this_computer` | src/memorymap/api/routes_auth.py:1254 |
| `_revoke_media` | src/memorymap/api/routes_auth.py:264 |
| `_sweep_expired` | src/memorymap/api/routes_auth.py:125 |
| `_token_valid` | src/memorymap/api/routes_auth.py:276 |
| `_unlock_failed` | src/memorymap/api/routes_auth.py:367 |
| `_unlock_succeeded` | src/memorymap/api/routes_auth.py:376 |
| `_wait_left` | src/memorymap/api/routes_auth.py:336 |
| `account` | src/memorymap/api/routes_auth.py:957 |
| `auto_session` | src/memorymap/api/routes_auth.py:694 |
| `change_password` | src/memorymap/api/routes_auth.py:989 |
| `download_lan_certificate` | src/memorymap/api/routes_auth.py:843 |
| `end_every_session` | src/memorymap/api/routes_auth.py:553 |
| `lan_access` | src/memorymap/api/routes_auth.py:837 |
| `lock` | src/memorymap/api/routes_auth.py:921 |
| `lock_all` | src/memorymap/api/routes_auth.py:1430 |
| `make_recovery_key` | src/memorymap/api/routes_auth.py:1274 |
| `media_session` | src/memorymap/api/routes_auth.py:681 |
| `password_on_open` | src/memorymap/api/routes_auth.py:195 |
| `password_warning` | src/memorymap/api/routes_auth.py:446 |
| `recover` | src/memorymap/api/routes_auth.py:1351 |
| `regenerate_lan_certificate` | src/memorymap/api/routes_auth.py:858 |
| `require_unlock` | src/memorymap/api/routes_auth.py:515 |
| `require_unlock_media` | src/memorymap/api/routes_auth.py:528 |
| `reset` | src/memorymap/api/routes_auth.py:1404 |
| `rotate_vault_key` | src/memorymap/api/routes_auth.py:1071 |
| `save_recovery_key` | src/memorymap/api/routes_auth.py:1321 |
| `set_lan_access` | src/memorymap/api/routes_auth.py:877 |
| `set_password_on_open` | src/memorymap/api/routes_auth.py:782 |
| `setup` | src/memorymap/api/routes_auth.py:604 |
| `status` | src/memorymap/api/routes_auth.py:580 |
| `unlock` | src/memorymap/api/routes_auth.py:625 |
| `unlock_vault` | src/memorymap/api/routes_auth.py:733 |

### src/memorymap/api/routes_backups.py (14)

| Name | File:line |
|---|---|
| `BundleBody` | src/memorymap/api/routes_backups.py:201 |
| `RestoreBody` | src/memorymap/api/routes_backups.py:150 |
| `RetentionBody` | src/memorymap/api/routes_backups.py:38 |
| `_retention` | src/memorymap/api/routes_backups.py:34 |
| `_unlink_quietly` | src/memorymap/api/routes_backups.py:205 |
| `backup_now` | src/memorymap/api/routes_backups.py:115 |
| `delete_backup` | src/memorymap/api/routes_backups.py:186 |
| `export_bundle` | src/memorymap/api/routes_backups.py:214 |
| `integrity_at_start` | src/memorymap/api/routes_backups.py:94 |
| `list_backups` | src/memorymap/api/routes_backups.py:106 |
| `restore_backup` | src/memorymap/api/routes_backups.py:155 |
| `restore_bundle` | src/memorymap/api/routes_backups.py:255 |
| `set_retention` | src/memorymap/api/routes_backups.py:137 |
| `storage_location` | src/memorymap/api/routes_backups.py:43 |

### src/memorymap/api/routes_bench.py (13)

| Name | File:line |
|---|---|
| `BenchBody` | src/memorymap/api/routes_bench.py:145 |
| `Budget` | src/memorymap/api/routes_bench.py:33 |
| `_last_report` | src/memorymap/api/routes_bench.py:162 |
| `_report_path` | src/memorymap/api/routes_bench.py:158 |
| `_run` | src/memorymap/api/routes_bench.py:169 |
| `budget_rows` | src/memorymap/api/routes_bench.py:101 |
| `budgets` | src/memorymap/api/routes_bench.py:124 |
| `heavy_ids` | src/memorymap/api/routes_bench.py:85 |
| `loopback` | src/memorymap/api/routes_bench.py:117 |
| `start` | src/memorymap/api/routes_bench.py:194 |
| `state` | src/memorymap/api/routes_bench.py:234 |
| `stop` | src/memorymap/api/routes_bench.py:243 |
| `time_share` | src/memorymap/api/routes_bench.py:69 |

### src/memorymap/api/routes_board_history.py (21)

| Name | File:line |
|---|---|
| `RestoreBody` | src/memorymap/api/routes_board_history.py:407 |
| `SnapshotBody` | src/memorymap/api/routes_board_history.py:311 |
| `_board_events` | src/memorymap/api/routes_board_history.py:106 |
| `_board_param` | src/memorymap/api/routes_board_history.py:76 |
| `_board_settings` | src/memorymap/api/routes_board_history.py:316 |
| `_current_rows` | src/memorymap/api/routes_board_history.py:89 |
| `_is_delete` | src/memorymap/api/routes_board_history.py:164 |
| `_link_ends` | src/memorymap/api/routes_board_history.py:412 |
| `_moments` | src/memorymap/api/routes_board_history.py:234 |
| `_names_board` | src/memorymap/api/routes_board_history.py:81 |
| `_require_board` | src/memorymap/api/routes_board_history.py:263 |
| `_row_out` | src/memorymap/api/routes_board_history.py:291 |
| `_snapshot_board` | src/memorymap/api/routes_board_history.py:324 |
| `_state_of` | src/memorymap/api/routes_board_history.py:98 |
| `_states_at` | src/memorymap/api/routes_board_history.py:169 |
| `board_at` | src/memorymap/api/routes_board_history.py:386 |
| `board_history` | src/memorymap/api/routes_board_history.py:272 |
| `delete_snapshot` | src/memorymap/api/routes_board_history.py:373 |
| `list_snapshots` | src/memorymap/api/routes_board_history.py:332 |
| `restore_board` | src/memorymap/api/routes_board_history.py:417 |
| `save_snapshot` | src/memorymap/api/routes_board_history.py:347 |

### src/memorymap/api/routes_board_library.py (45)

| Name | File:line |
|---|---|
| `ImportBody` | src/memorymap/api/routes_board_library.py:667 |
| `LibraryBody` | src/memorymap/api/routes_board_library.py:607 |
| `LibraryItemCreate` | src/memorymap/api/routes_board_library.py:479 |
| `LibraryItemOut` | src/memorymap/api/routes_board_library.py:370 |
| `LibraryItemUpdate` | src/memorymap/api/routes_board_library.py:513 |
| `MarkBody` | src/memorymap/api/routes_board_library.py:590 |
| `NewBoardBody` | src/memorymap/api/routes_board_library.py:1021 |
| `PlaceBody` | src/memorymap/api/routes_board_library.py:789 |
| `_builtin` | src/memorymap/api/routes_board_library.py:351 |
| `_builtin_index` | src/memorymap/api/routes_board_library.py:324 |
| `_clean_branch` | src/memorymap/api/routes_board_library.py:206 |
| `_clean_element` | src/memorymap/api/routes_board_library.py:128 |
| `_clean_number` | src/memorymap/api/routes_board_library.py:120 |
| `_clean_payload` | src/memorymap/api/routes_board_library.py:234 |
| `_clean_tags` | src/memorymap/api/routes_board_library.py:284 |
| `_drop_media` | src/memorymap/api/routes_board_library.py:716 |
| `_fail` | src/memorymap/api/routes_board_library.py:110 |
| `_icons` | src/memorymap/api/routes_board_library.py:343 |
| `_ink` | src/memorymap/api/routes_board_library.py:827 |
| `_item_or_404` | src/memorymap/api/routes_board_library.py:521 |
| `_item_out` | src/memorymap/api/routes_board_library.py:384 |
| `_library_or_404` | src/memorymap/api/routes_board_library.py:487 |
| `_library_out` | src/memorymap/api/routes_board_library.py:402 |
| `_map_has_no_centre` | src/memorymap/api/routes_board_library.py:906 |
| `_media_urls` | src/memorymap/api/routes_board_library.py:114 |
| `_place_branch` | src/memorymap/api/routes_board_library.py:923 |
| `_place_element` | src/memorymap/api/routes_board_library.py:831 |
| `_resolve` | src/memorymap/api/routes_board_library.py:805 |
| `_shape_sets` | src/memorymap/api/routes_board_library.py:309 |
| `_yours` | src/memorymap/api/routes_board_library.py:392 |
| `create_library` | src/memorymap/api/routes_board_library.py:612 |
| `create_library_item` | src/memorymap/api/routes_board_library.py:498 |
| `delete_library` | src/memorymap/api/routes_board_library.py:630 |
| `delete_library_item` | src/memorymap/api/routes_board_library.py:554 |
| `duplicate_library_item` | src/memorymap/api/routes_board_library.py:576 |
| `export_library` | src/memorymap/api/routes_board_library.py:646 |
| `import_library` | src/memorymap/api/routes_board_library.py:676 |
| `list_library` | src/memorymap/api/routes_board_library.py:407 |
| `mark_builtin` | src/memorymap/api/routes_board_library.py:596 |
| `new_board_from_template` | src/memorymap/api/routes_board_library.py:1030 |
| `place_library_item` | src/memorymap/api/routes_board_library.py:969 |
| `rename_library` | src/memorymap/api/routes_board_library.py:622 |
| `restore_library_item` | src/memorymap/api/routes_board_library.py:565 |
| `transform_path` | src/memorymap/api/routes_board_library.py:735 |
| `update_library_item` | src/memorymap/api/routes_board_library.py:530 |

### src/memorymap/api/routes_bookmarks.py (9)

| Name | File:line |
|---|---|
| `BookmarkCreate` | src/memorymap/api/routes_bookmarks.py:25 |
| `BookmarkUpdate` | src/memorymap/api/routes_bookmarks.py:36 |
| `_existing` | src/memorymap/api/routes_bookmarks.py:107 |
| `_normalise_url` | src/memorymap/api/routes_bookmarks.py:56 |
| `_to_out` | src/memorymap/api/routes_bookmarks.py:86 |
| `create_bookmark` | src/memorymap/api/routes_bookmarks.py:144 |
| `delete_bookmark` | src/memorymap/api/routes_bookmarks.py:184 |
| `list_bookmarks` | src/memorymap/api/routes_bookmarks.py:117 |
| `update_bookmark` | src/memorymap/api/routes_bookmarks.py:163 |

### src/memorymap/api/routes_capabilities.py (3)

| Name | File:line |
|---|---|
| `_installed` | src/memorymap/api/routes_capabilities.py:68 |
| `_mcp` | src/memorymap/api/routes_capabilities.py:37 |
| `capabilities` | src/memorymap/api/routes_capabilities.py:76 |

### src/memorymap/api/routes_captions.py (4)

| Name | File:line |
|---|---|
| `_save` | src/memorymap/api/routes_captions.py:31 |
| `audio` | src/memorymap/api/routes_captions.py:65 |
| `start` | src/memorymap/api/routes_captions.py:49 |
| `stop` | src/memorymap/api/routes_captions.py:84 |

### src/memorymap/api/routes_categories.py (20)

| Name | File:line |
|---|---|
| `ColourBody` | src/memorymap/api/routes_categories.py:58 |
| `CreateBody` | src/memorymap/api/routes_categories.py:81 |
| `MergeBody` | src/memorymap/api/routes_categories.py:86 |
| `MoveBody` | src/memorymap/api/routes_categories.py:90 |
| `RenameBody` | src/memorymap/api/routes_categories.py:42 |
| `SplitBody` | src/memorymap/api/routes_categories.py:97 |
| `_ai_groups` | src/memorymap/api/routes_categories.py:226 |
| `_existing_category` | src/memorymap/api/routes_categories.py:102 |
| `_ids_in` | src/memorymap/api/routes_categories.py:124 |
| `_move` | src/memorymap/api/routes_categories.py:128 |
| `_same_space` | src/memorymap/api/routes_categories.py:109 |
| `create_category` | src/memorymap/api/routes_categories.py:162 |
| `delete_category` | src/memorymap/api/routes_categories.py:346 |
| `list_categories` | src/memorymap/api/routes_categories.py:150 |
| `merge_category` | src/memorymap/api/routes_categories.py:180 |
| `move_notes` | src/memorymap/api/routes_categories.py:172 |
| `propose_split` | src/memorymap/api/routes_categories.py:276 |
| `rename_category` | src/memorymap/api/routes_categories.py:335 |
| `set_category_colour` | src/memorymap/api/routes_categories.py:324 |
| `split_category` | src/memorymap/api/routes_categories.py:194 |

### src/memorymap/api/routes_chat.py (82)

| Name | File:line |
|---|---|
| `ChatRequest` | src/memorymap/api/routes_chat.py:330 |
| `ChatResponse` | src/memorymap/api/routes_chat.py:700 |
| `ChatTurn` | src/memorymap/api/routes_chat.py:312 |
| `CommandRunBody` | src/memorymap/api/routes_chat.py:2393 |
| `CompressBody` | src/memorymap/api/routes_chat.py:3034 |
| `FollowupBody` | src/memorymap/api/routes_chat.py:277 |
| `PlanRun` | src/memorymap/api/routes_chat.py:317 |
| `ToolExecuteBody` | src/memorymap/api/routes_chat.py:3067 |
| `_StreamRequest` | src/memorymap/api/routes_chat.py:1808 |
| `_about` | src/memorymap/api/routes_chat.py:228 |
| `_act_events` | src/memorymap/api/routes_chat.py:2332 |
| `_agent_events` | src/memorymap/api/routes_chat.py:2415 |
| `_apply_scope` | src/memorymap/api/routes_chat.py:477 |
| `_asked_key` | src/memorymap/api/routes_chat.py:178 |
| `_assist` | src/memorymap/api/routes_chat.py:1867 |
| `_attached_boards` | src/memorymap/api/routes_chat.py:873 |
| `_attached_documents` | src/memorymap/api/routes_chat.py:795 |
| `_attached_files` | src/memorymap/api/routes_chat.py:818 |
| `_attached_notes` | src/memorymap/api/routes_chat.py:772 |
| `_attachment_readings` | src/memorymap/api/routes_chat.py:1144 |
| `_chat_model_sees_images` | src/memorymap/api/routes_chat.py:571 |
| `_checks_grounding` | src/memorymap/api/routes_chat.py:2555 |
| `_composed` | src/memorymap/api/routes_chat.py:1839 |
| `_composed_support` | src/memorymap/api/routes_chat.py:1972 |
| `_composer_embed` | src/memorymap/api/routes_chat.py:1856 |
| `_composer_voice` | src/memorymap/api/routes_chat.py:1846 |
| `_exact_events` | src/memorymap/api/routes_chat.py:2040 |
| `_feature_for` | src/memorymap/api/routes_chat.py:118 |
| `_filed_under` | src/memorymap/api/routes_chat.py:1217 |
| `_files_on` | src/memorymap/api/routes_chat.py:1122 |
| `_fill` | src/memorymap/api/routes_chat.py:204 |
| `_first_agent_event` | src/memorymap/api/routes_chat.py:2474 |
| `_first_events` | src/memorymap/api/routes_chat.py:2366 |
| `_follow_up` | src/memorymap/api/routes_chat.py:2534 |
| `_grounding_candidates` | src/memorymap/api/routes_chat.py:735 |
| `_image_caption_context` | src/memorymap/api/routes_chat.py:584 |
| `_insight_memory` | src/memorymap/api/routes_chat.py:2320 |
| `_interactive_lines` | src/memorymap/api/routes_chat.py:2965 |
| `_media_readings` | src/memorymap/api/routes_chat.py:1058 |
| `_mostly_pictures` | src/memorymap/api/routes_chat.py:1008 |
| `_note_dates` | src/memorymap/api/routes_chat.py:1016 |
| `_note_tool_read` | src/memorymap/api/routes_chat.py:2527 |
| `_one_line` | src/memorymap/api/routes_chat.py:1053 |
| `_outline_into` | src/memorymap/api/routes_chat.py:922 |
| `_picture_alts` | src/memorymap/api/routes_chat.py:964 |
| `_picture_notes` | src/memorymap/api/routes_chat.py:1235 |
| `_picture_sizes` | src/memorymap/api/routes_chat.py:991 |
| `_plain_events` | src/memorymap/api/routes_chat.py:2060 |
| `_prepare` | src/memorymap/api/routes_chat.py:1251 |
| `_recent_questions` | src/memorymap/api/routes_chat.py:128 |
| `_refuse_failed` | src/memorymap/api/routes_chat.py:3108 |
| `_related_elsewhere` | src/memorymap/api/routes_chat.py:1718 |
| `_resolve_chat_images` | src/memorymap/api/routes_chat.py:531 |
| `_resolve_mode` | src/memorymap/api/routes_chat.py:492 |
| `_resolve_persona` | src/memorymap/api/routes_chat.py:508 |
| `_resolve_plan` | src/memorymap/api/routes_chat.py:671 |
| `_resolve_skill` | src/memorymap/api/routes_chat.py:645 |
| `_save_ask_turn` | src/memorymap/api/routes_chat.py:1668 |
| `_searched_question` | src/memorymap/api/routes_chat.py:2547 |
| `_small_model_mode` | src/memorymap/api/routes_chat.py:624 |
| `_spoken_act` | src/memorymap/api/routes_chat.py:2512 |
| `_starter_events` | src/memorymap/api/routes_chat.py:2385 |
| `_starter_read` | src/memorymap/api/routes_chat.py:2377 |
| `_stats_chart` | src/memorymap/api/routes_chat.py:2009 |
| `_stream_lines` | src/memorymap/api/routes_chat.py:2565 |
| `_time_words` | src/memorymap/api/routes_chat.py:1036 |
| `_tool_read_events` | src/memorymap/api/routes_chat.py:2019 |
| `_web_allowed` | src/memorymap/api/routes_chat.py:1927 |
| `_web_answer` | src/memorymap/api/routes_chat.py:1936 |
| `_web_events` | src/memorymap/api/routes_chat.py:1983 |
| `_widened` | src/memorymap/api/routes_chat.py:1196 |
| `chat` | src/memorymap/api/routes_chat.py:1548 |
| `chat_followups` | src/memorymap/api/routes_chat.py:291 |
| `chat_stream` | src/memorymap/api/routes_chat.py:2885 |
| `compress_history` | src/memorymap/api/routes_chat.py:3041 |
| `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:3080 |
| `forget_recent_question` | src/memorymap/api/routes_chat.py:171 |
| `list_modes` | src/memorymap/api/routes_chat.py:2977 |
| `list_tools` | src/memorymap/api/routes_chat.py:2998 |
| `recent_questions` | src/memorymap/api/routes_chat.py:165 |
| `run_command` | src/memorymap/api/routes_chat.py:2401 |
| `suggestions` | src/memorymap/api/routes_chat.py:244 |

### src/memorymap/api/routes_conversations.py (36)

| Name | File:line |
|---|---|
| `AnswerBody` | src/memorymap/api/routes_conversations.py:827 |
| `FollowupsBody` | src/memorymap/api/routes_conversations.py:766 |
| `ForkBody` | src/memorymap/api/routes_conversations.py:712 |
| `PinBody` | src/memorymap/api/routes_conversations.py:154 |
| `RenameBody` | src/memorymap/api/routes_conversations.py:150 |
| `RestoreBody` | src/memorymap/api/routes_conversations.py:935 |
| `TruncateBody` | src/memorymap/api/routes_conversations.py:677 |
| `TurnBody` | src/memorymap/api/routes_conversations.py:28 |
| `TurnRestoreBody` | src/memorymap/api/routes_conversations.py:653 |
| `_clean_title` | src/memorymap/api/routes_conversations.py:548 |
| `_existing` | src/memorymap/api/routes_conversations.py:234 |
| `_hydrate_attachments` | src/memorymap/api/routes_conversations.py:431 |
| `_process_committed_media` | src/memorymap/api/routes_conversations.py:238 |
| `_restore_row` | src/memorymap/api/routes_conversations.py:905 |
| `_rewrite_answer_steps` | src/memorymap/api/routes_conversations.py:831 |
| `_summary` | src/memorymap/api/routes_conversations.py:215 |
| `_turn_messages` | src/memorymap/api/routes_conversations.py:158 |
| `append_turn` | src/memorymap/api/routes_conversations.py:529 |
| `archive_conversation` | src/memorymap/api/routes_conversations.py:377 |
| `conversation_matches` | src/memorymap/api/routes_conversations.py:252 |
| `create_conversation` | src/memorymap/api/routes_conversations.py:417 |
| `delete_conversation` | src/memorymap/api/routes_conversations.py:924 |
| `delete_turn` | src/memorymap/api/routes_conversations.py:624 |
| `edit_answer` | src/memorymap/api/routes_conversations.py:866 |
| `fork_conversation` | src/memorymap/api/routes_conversations.py:724 |
| `get_conversation` | src/memorymap/api/routes_conversations.py:519 |
| `list_conversations` | src/memorymap/api/routes_conversations.py:287 |
| `pin_conversation` | src/memorymap/api/routes_conversations.py:357 |
| `rename_conversation` | src/memorymap/api/routes_conversations.py:896 |
| `replace_last_turn` | src/memorymap/api/routes_conversations.py:606 |
| `restore_conversation` | src/memorymap/api/routes_conversations.py:947 |
| `restore_turn` | src/memorymap/api/routes_conversations.py:658 |
| `retitle_conversation` | src/memorymap/api/routes_conversations.py:558 |
| `set_turn_followups` | src/memorymap/api/routes_conversations.py:776 |
| `truncate_conversation` | src/memorymap/api/routes_conversations.py:684 |
| `unarchive_conversation` | src/memorymap/api/routes_conversations.py:400 |

### src/memorymap/api/routes_debug.py (6)

| Name | File:line |
|---|---|
| `_db_name` | src/memorymap/api/routes_debug.py:71 |
| `_dir_bytes` | src/memorymap/api/routes_debug.py:153 |
| `_trust` | src/memorymap/api/routes_debug.py:164 |
| `debug_health` | src/memorymap/api/routes_debug.py:80 |
| `integrity_check` | src/memorymap/api/routes_debug.py:187 |
| `shown_path` | src/memorymap/api/routes_debug.py:48 |

### src/memorymap/api/routes_documents.py (60)

| Name | File:line |
|---|---|
| `AiCheckBody` | src/memorymap/api/routes_documents.py:1129 |
| `AiEditBody` | src/memorymap/api/routes_documents.py:107 |
| `AttachBookmarkBody` | src/memorymap/api/routes_documents.py:222 |
| `ContentBatch` | src/memorymap/api/routes_documents.py:499 |
| `ContentItem` | src/memorymap/api/routes_documents.py:494 |
| `DocumentAiEditLogBody` | src/memorymap/api/routes_documents.py:1376 |
| `DocumentAiEditOut` | src/memorymap/api/routes_documents.py:1392 |
| `DocumentBody` | src/memorymap/api/routes_documents.py:77 |
| `DocumentPatch` | src/memorymap/api/routes_documents.py:89 |
| `DocumentRevisionOut` | src/memorymap/api/routes_documents.py:1213 |
| `LinkBody` | src/memorymap/api/routes_documents.py:822 |
| `RephraseBody` | src/memorymap/api/routes_documents.py:1169 |
| `RevisionNameBody` | src/memorymap/api/routes_documents.py:1295 |
| `SyntaxCheckBody` | src/memorymap/api/routes_documents.py:305 |
| `_ai_edit_out` | src/memorymap/api/routes_documents.py:1400 |
| `_backlinks` | src/memorymap/api/routes_documents.py:866 |
| `_binned` | src/memorymap/api/routes_documents.py:754 |
| `_document_headings` | src/memorymap/api/routes_documents.py:431 |
| `_existing` | src/memorymap/api/routes_documents.py:218 |
| `_full` | src/memorymap/api/routes_documents.py:192 |
| `_linked_notes` | src/memorymap/api/routes_documents.py:199 |
| `_preview` | src/memorymap/api/routes_documents.py:136 |
| `_process_committed_media` | src/memorymap/api/routes_documents.py:274 |
| `_record_document_revision` | src/memorymap/api/routes_documents.py:686 |
| `_safe_filename` | src/memorymap/api/routes_documents.py:815 |
| `_summary` | src/memorymap/api/routes_documents.py:170 |
| `ai_check` | src/memorymap/api/routes_documents.py:1136 |
| `ai_edit` | src/memorymap/api/routes_documents.py:1045 |
| `archive_document` | src/memorymap/api/routes_documents.py:792 |
| `attach_bookmark` | src/memorymap/api/routes_documents.py:246 |
| `attach_note` | src/memorymap/api/routes_documents.py:827 |
| `check_syntax` | src/memorymap/api/routes_documents.py:311 |
| `create_document` | src/memorymap/api/routes_documents.py:471 |
| `delete_document` | src/memorymap/api/routes_documents.py:742 |
| `detach_bookmark` | src/memorymap/api/routes_documents.py:263 |
| `detach_note` | src/memorymap/api/routes_documents.py:840 |
| `document_backlinks` | src/memorymap/api/routes_documents.py:920 |
| `document_bookmarks` | src/memorymap/api/routes_documents.py:227 |
| `document_connections` | src/memorymap/api/routes_documents.py:926 |
| `document_revision` | src/memorymap/api/routes_documents.py:1277 |
| `document_revisions` | src/memorymap/api/routes_documents.py:1232 |
| `documents_outline` | src/memorymap/api/routes_documents.py:439 |
| `export_bundle` | src/memorymap/api/routes_documents.py:1002 |
| `export_markdown` | src/memorymap/api/routes_documents.py:957 |
| `get_document` | src/memorymap/api/routes_documents.py:632 |
| `import_document` | src/memorymap/api/routes_documents.py:530 |
| `list_ai_edits` | src/memorymap/api/routes_documents.py:1451 |
| `list_documents` | src/memorymap/api/routes_documents.py:343 |
| `list_file_types` | src/memorymap/api/routes_documents.py:286 |
| `name_current_version` | src/memorymap/api/routes_documents.py:1301 |
| `purge_document` | src/memorymap/api/routes_documents.py:776 |
| `record_ai_edit` | src/memorymap/api/routes_documents.py:1411 |
| `rename_version` | src/memorymap/api/routes_documents.py:1324 |
| `rephrase_passage` | src/memorymap/api/routes_documents.py:1180 |
| `restore_document` | src/memorymap/api/routes_documents.py:765 |
| `restore_document_revision` | src/memorymap/api/routes_documents.py:1341 |
| `revert_ai_edit` | src/memorymap/api/routes_documents.py:1465 |
| `unarchive_document` | src/memorymap/api/routes_documents.py:806 |
| `update_document` | src/memorymap/api/routes_documents.py:637 |
| `write_contents` | src/memorymap/api/routes_documents.py:504 |

### src/memorymap/api/routes_drafts.py (6)

| Name | File:line |
|---|---|
| `ComposeBody` | src/memorymap/api/routes_drafts.py:33 |
| `TitleBody` | src/memorymap/api/routes_drafts.py:71 |
| `_sources` | src/memorymap/api/routes_drafts.py:52 |
| `compose_draft` | src/memorymap/api/routes_drafts.py:76 |
| `compose_draft_stream` | src/memorymap/api/routes_drafts.py:111 |
| `draft_title` | src/memorymap/api/routes_drafts.py:148 |

### src/memorymap/api/routes_duplicates.py (7)

| Name | File:line |
|---|---|
| `MergeBody` | src/memorymap/api/routes_duplicates.py:37 |
| `PreviewBody` | src/memorymap/api/routes_duplicates.py:43 |
| `_joined` | src/memorymap/api/routes_duplicates.py:64 |
| `_load` | src/memorymap/api/routes_duplicates.py:48 |
| `list_duplicates` | src/memorymap/api/routes_duplicates.py:79 |
| `merge_notes` | src/memorymap/api/routes_duplicates.py:136 |
| `preview_merge` | src/memorymap/api/routes_duplicates.py:117 |

### src/memorymap/api/routes_editor.py (2)

| Name | File:line |
|---|---|
| `ReadBody` | src/memorymap/api/routes_editor.py:23 |
| `read` | src/memorymap/api/routes_editor.py:35 |

### src/memorymap/api/routes_entities.py (11)

| Name | File:line |
|---|---|
| `EntityPatch` | src/memorymap/api/routes_entities.py:176 |
| `MergeInto` | src/memorymap/api/routes_entities.py:211 |
| `_hit` | src/memorymap/api/routes_entities.py:90 |
| `_live` | src/memorymap/api/routes_entities.py:56 |
| `_row` | src/memorymap/api/routes_entities.py:46 |
| `_visible_ids` | src/memorymap/api/routes_entities.py:40 |
| `entity_page` | src/memorymap/api/routes_entities.py:104 |
| `list_entities` | src/memorymap/api/routes_entities.py:69 |
| `merge_into` | src/memorymap/api/routes_entities.py:216 |
| `patch_entity` | src/memorymap/api/routes_entities.py:183 |
| `undo_merge_route` | src/memorymap/api/routes_entities.py:228 |

### src/memorymap/api/routes_entries.py (124)

| Name | File:line |
|---|---|
| `AttachBookmarkBody` | src/memorymap/api/routes_entries.py:2148 |
| `BackfillReasonsBody` | src/memorymap/api/routes_entries.py:2049 |
| `DailyDayOut` | src/memorymap/api/routes_entries.py:874 |
| `DailyJournalOut` | src/memorymap/api/routes_entries.py:879 |
| `ExtractCommitBody` | src/memorymap/api/routes_entries.py:3858 |
| `ExtractLinkIn` | src/memorymap/api/routes_entries.py:3848 |
| `ExtractNoteIn` | src/memorymap/api/routes_entries.py:3837 |
| `ExtractPreviewBody` | src/memorymap/api/routes_entries.py:3811 |
| `FilingDecisionBody` | src/memorymap/api/routes_entries.py:1071 |
| `FilingStopBody` | src/memorymap/api/routes_entries.py:1054 |
| `ImproveBody` | src/memorymap/api/routes_entries.py:1538 |
| `LinkBody` | src/memorymap/api/routes_entries.py:2768 |
| `LinkPatchBody` | src/memorymap/api/routes_entries.py:2809 |
| `LinkReasonBody` | src/memorymap/api/routes_entries.py:2825 |
| `LinkSuggestionReasonPair` | src/memorymap/api/routes_entries.py:2000 |
| `LinkSuggestionReasonsBody` | src/memorymap/api/routes_entries.py:2005 |
| `PrivacyBody` | src/memorymap/api/routes_entries.py:2832 |
| `SuggestTagsBody` | src/memorymap/api/routes_entries.py:1253 |
| `SuggestedTagsBody` | src/memorymap/api/routes_entries.py:1305 |
| `TensionPair` | src/memorymap/api/routes_entries.py:1950 |
| `ThenTextBody` | src/memorymap/api/routes_entries.py:3168 |
| `WikiRenameIn` | src/memorymap/api/routes_entries.py:2679 |
| `_LateFiling` | src/memorymap/api/routes_entries.py:364 |
| `_LazyNoteFacts` | src/memorymap/api/routes_entries.py:1639 |
| `_already_delivered` | src/memorymap/api/routes_entries.py:676 |
| `_backfill_reasons` | src/memorymap/api/routes_entries.py:2094 |
| `_board_reference_rows_batch` | src/memorymap/api/routes_entries.py:2867 |
| `_connected_files` | src/memorymap/api/routes_entries.py:3661 |
| `_connection_cue` | src/memorymap/api/routes_entries.py:3455 |
| `_connection_label` | src/memorymap/api/routes_entries.py:3649 |
| `_daily_date` | src/memorymap/api/routes_entries.py:889 |
| `_daily_note` | src/memorymap/api/routes_entries.py:927 |
| `_daily_notes` | src/memorymap/api/routes_entries.py:903 |
| `_dismissed_tensions` | src/memorymap/api/routes_entries.py:1798 |
| `_embed_entry_in_background` | src/memorymap/api/routes_entries.py:614 |
| `_engine_tags` | src/memorymap/api/routes_entries.py:265 |
| `_existing_entry` | src/memorymap/api/routes_entries.py:318 |
| `_file_entry_in_background` | src/memorymap/api/routes_entries.py:460 |
| `_file_entry_now` | src/memorymap/api/routes_entries.py:338 |
| `_filed_by` | src/memorymap/api/routes_entries.py:1219 |
| `_find_near_duplicate` | src/memorymap/api/routes_entries.py:300 |
| `_first_line` | src/memorymap/api/routes_entries.py:898 |
| `_interior_phrase` | src/memorymap/api/routes_entries.py:3099 |
| `_json_tags` | src/memorymap/api/routes_entries.py:204 |
| `_keep_suggestions` | src/memorymap/api/routes_entries.py:233 |
| `_linked_entry_ids` | src/memorymap/api/routes_entries.py:1408 |
| `_links_to` | src/memorymap/api/routes_entries.py:3122 |
| `_open_suggestions` | src/memorymap/api/routes_entries.py:212 |
| `_preview` | src/memorymap/api/routes_entries.py:77 |
| `_process_committed_media` | src/memorymap/api/routes_entries.py:325 |
| `_queue_embedding` | src/memorymap/api/routes_entries.py:642 |
| `_queue_filing` | src/memorymap/api/routes_entries.py:654 |
| `_readable` | src/memorymap/api/routes_entries.py:2850 |
| `_reevaluate_tags` | src/memorymap/api/routes_entries.py:1516 |
| `_reference_rows` | src/memorymap/api/routes_entries.py:3130 |
| `_reference_rows_batch` | src/memorymap/api/routes_entries.py:2956 |
| `_remember_delivery` | src/memorymap/api/routes_entries.py:693 |
| `_safe_filename` | src/memorymap/api/routes_entries.py:2518 |
| `_stored_form` | src/memorymap/api/routes_entries.py:2842 |
| `_tag_reasons` | src/memorymap/api/routes_entries.py:223 |
| `_tag_vocabulary` | src/memorymap/api/routes_entries.py:1241 |
| `_tension_key` | src/memorymap/api/routes_entries.py:1792 |
| `_to_out` | src/memorymap/api/routes_entries.py:90 |
| `_to_out_bulk` | src/memorymap/api/routes_entries.py:277 |
| `_wiki_link_targets_of` | src/memorymap/api/routes_entries.py:3612 |
| `accept_tension` | src/memorymap/api/routes_entries.py:1956 |
| `add_context` | src/memorymap/api/routes_entries.py:1343 |
| `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1315 |
| `archive_entry` | src/memorymap/api/routes_entries.py:2724 |
| `attach_bookmark` | src/memorymap/api/routes_entries.py:2177 |
| `backfill_link_reasons` | src/memorymap/api/routes_entries.py:2058 |
| `check_link_props` | src/memorymap/api/routes_entries.py:2793 |
| `count_entries` | src/memorymap/api/routes_entries.py:2385 |
| `create_entry` | src/memorymap/api/routes_entries.py:702 |
| `create_link` | src/memorymap/api/routes_entries.py:3687 |
| `daily_journal` | src/memorymap/api/routes_entries.py:936 |
| `daily_note` | src/memorymap/api/routes_entries.py:978 |
| `decide_filing` | src/memorymap/api/routes_entries.py:1078 |
| `delete_entry` | src/memorymap/api/routes_entries.py:2696 |
| `delete_link` | src/memorymap/api/routes_entries.py:3712 |
| `detach_bookmark` | src/memorymap/api/routes_entries.py:2197 |
| `dismiss_tension` | src/memorymap/api/routes_entries.py:1980 |
| `entry_bookmarks` | src/memorymap/api/routes_entries.py:2156 |
| `entry_connections` | src/memorymap/api/routes_entries.py:3469 |
| `entry_history` | src/memorymap/api/routes_entries.py:3187 |
| `entry_reference_counts` | src/memorymap/api/routes_entries.py:2405 |
| `entry_references` | src/memorymap/api/routes_entries.py:3141 |
| `export_entry` | src/memorymap/api/routes_entries.py:2532 |
| `extract_commit` | src/memorymap/api/routes_entries.py:3867 |
| `extract_preview` | src/memorymap/api/routes_entries.py:3821 |
| `filing_status` | src/memorymap/api/routes_entries.py:1128 |
| `find_tensions` | src/memorymap/api/routes_entries.py:1804 |
| `generate_entry_title` | src/memorymap/api/routes_entries.py:3384 |
| `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3767 |
| `get_entry` | src/memorymap/api/routes_entries.py:2455 |
| `improve_writing` | src/memorymap/api/routes_entries.py:1549 |
| `known_tensions` | src/memorymap/api/routes_entries.py:1900 |
| `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:2010 |
| `link_suggestions` | src/memorymap/api/routes_entries.py:1663 |
| `list_entries` | src/memorymap/api/routes_entries.py:2224 |
| `most_accessed` | src/memorymap/api/routes_entries.py:2373 |
| `open_daily_note` | src/memorymap/api/routes_entries.py:994 |
| `patch_link` | src/memorymap/api/routes_entries.py:3724 |
| `purge_entry` | src/memorymap/api/routes_entries.py:2743 |
| `query_entries` | src/memorymap/api/routes_entries.py:1601 |
| `reevaluate_entry` | src/memorymap/api/routes_entries.py:1426 |
| `related_entries` | src/memorymap/api/routes_entries.py:2121 |
| `remove_entry_title` | src/memorymap/api/routes_entries.py:3431 |
| `restore_entry` | src/memorymap/api/routes_entries.py:2716 |
| `restore_event` | src/memorymap/api/routes_entries.py:3269 |
| `restore_revision` | src/memorymap/api/routes_entries.py:3333 |
| `retry_stand_ins` | src/memorymap/api/routes_entries.py:580 |
| `seed_example_entries` | src/memorymap/api/routes_entries.py:2390 |
| `set_entry_privacy` | src/memorymap/api/routes_entries.py:3358 |
| `stop_all_filing` | src/memorymap/api/routes_entries.py:1099 |
| `stop_filing` | src/memorymap/api/routes_entries.py:1025 |
| `stop_filing_one` | src/memorymap/api/routes_entries.py:1059 |
| `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1265 |
| `then_and_now` | src/memorymap/api/routes_entries.py:3149 |
| `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3174 |
| `unarchive_entry` | src/memorymap/api/routes_entries.py:2735 |
| `update_entry` | src/memorymap/api/routes_entries.py:2563 |
| `update_link_reason` | src/memorymap/api/routes_entries.py:3746 |
| `wiki_rename` | src/memorymap/api/routes_entries.py:2684 |

### src/memorymap/api/routes_files.py (121)

| Name | File:line |
|---|---|
| `AttachedFileTextOut` | src/memorymap/api/routes_files.py:632 |
| `AttachmentAnalyseBody` | src/memorymap/api/routes_files.py:367 |
| `AttachmentGalleryOut` | src/memorymap/api/routes_files.py:192 |
| `AttachmentRenameBody` | src/memorymap/api/routes_files.py:923 |
| `CaptionBody` | src/memorymap/api/routes_files.py:1842 |
| `FileTextIn` | src/memorymap/api/routes_files.py:704 |
| `MediaOrphansOut` | src/memorymap/api/routes_files.py:1475 |
| `MediaRenameBody` | src/memorymap/api/routes_files.py:1814 |
| `MediaUploadOut` | src/memorymap/api/routes_files.py:1313 |
| `OcrBody` | src/memorymap/api/routes_files.py:1960 |
| `OcrLanguageBody` | src/memorymap/api/routes_files.py:3247 |
| `OcrPageReadOut` | src/memorymap/api/routes_files.py:2563 |
| `OcrRangeReadOut` | src/memorymap/api/routes_files.py:3265 |
| `OcrReadersOut` | src/memorymap/api/routes_files.py:3169 |
| `OcrRegionBox` | src/memorymap/api/routes_files.py:2038 |
| `OcrRegionOut` | src/memorymap/api/routes_files.py:2055 |
| `OcrRegionReadOut` | src/memorymap/api/routes_files.py:3468 |
| `OcrRegionsOut` | src/memorymap/api/routes_files.py:2119 |
| `OcrStoredReadingOut` | src/memorymap/api/routes_files.py:2078 |
| `OcrWordOut` | src/memorymap/api/routes_files.py:2047 |
| `PdfInfoOut` | src/memorymap/api/routes_files.py:752 |
| `ReadingBinnedOut` | src/memorymap/api/routes_files.py:3760 |
| `ReadingRestoredOut` | src/memorymap/api/routes_files.py:3802 |
| `SaveFileBody` | src/memorymap/api/routes_files.py:998 |
| `VisionOcrBody` | src/memorymap/api/routes_files.py:3909 |
| `_attachment_out` | src/memorymap/api/routes_files.py:424 |
| `_attachment_size` | src/memorymap/api/routes_files.py:394 |
| `_bin_file_reading` | src/memorymap/api/routes_files.py:3769 |
| `_checked_engine` | src/memorymap/api/routes_files.py:2740 |
| `_checked_reader` | src/memorymap/api/routes_files.py:2714 |
| `_clean_reading_fields` | src/memorymap/api/routes_files.py:3836 |
| `_describe_page` | src/memorymap/api/routes_files.py:3061 |
| `_embed_pattern` | src/memorymap/api/routes_files.py:1741 |
| `_engine_choice` | src/memorymap/api/routes_files.py:2734 |
| `_existing_attachment` | src/memorymap/api/routes_files.py:165 |
| `_exports_dir` | src/memorymap/api/routes_files.py:989 |
| `_forget_page_read` | src/memorymap/api/routes_files.py:3703 |
| `_forget_regions` | src/memorymap/api/routes_files.py:2330 |
| `_local_regions` | src/memorymap/api/routes_files.py:2763 |
| `_local_text` | src/memorymap/api/routes_files.py:2756 |
| `_media_size` | src/memorymap/api/routes_files.py:1590 |
| `_media_upload_path` | src/memorymap/api/routes_files.py:1656 |
| `_page_read_count_map` | src/memorymap/api/routes_files.py:2925 |
| `_page_read_key` | src/memorymap/api/routes_files.py:2768 |
| `_page_read_text_map` | src/memorymap/api/routes_files.py:2885 |
| `_parse_page_spec` | src/memorymap/api/routes_files.py:3289 |
| `_pdf_regions_for` | src/memorymap/api/routes_files.py:2166 |
| `_read_page` | src/memorymap/api/routes_files.py:3018 |
| `_read_range` | src/memorymap/api/routes_files.py:3324 |
| `_read_region` | src/memorymap/api/routes_files.py:3522 |
| `_reader_model` | src/memorymap/api/routes_files.py:2608 |
| `_region_image` | src/memorymap/api/routes_files.py:3499 |
| `_regions_for` | src/memorymap/api/routes_files.py:2395 |
| `_regions_text` | src/memorymap/api/routes_files.py:2962 |
| `_reindex_file` | src/memorymap/api/routes_files.py:2825 |
| `_remember_page_caption` | src/memorymap/api/routes_files.py:2843 |
| `_remember_page_read` | src/memorymap/api/routes_files.py:2777 |
| `_remember_regions` | src/memorymap/api/routes_files.py:2295 |
| `_set_edited_reading` | src/memorymap/api/routes_files.py:2363 |
| `_stored_page_reads` | src/memorymap/api/routes_files.py:2980 |
| `_stored_range` | src/memorymap/api/routes_files.py:3374 |
| `_stored_readings` | src/memorymap/api/routes_files.py:2088 |
| `_stored_regions` | src/memorymap/api/routes_files.py:2270 |
| `_strip_embeds` | src/memorymap/api/routes_files.py:1747 |
| `_tesseract_read_page` | src/memorymap/api/routes_files.py:3126 |
| `_vision_read_page` | src/memorymap/api/routes_files.py:2625 |
| `_within_dir` | src/memorymap/api/routes_files.py:1063 |
| `_within_exports` | src/memorymap/api/routes_files.py:1020 |
| `analyse_attachment` | src/memorymap/api/routes_files.py:449 |
| `attached_file_html_preview` | src/memorymap/api/routes_files.py:861 |
| `attached_file_pdf_info` | src/memorymap/api/routes_files.py:769 |
| `attached_file_pdf_page` | src/memorymap/api/routes_files.py:805 |
| `attached_file_text` | src/memorymap/api/routes_files.py:664 |
| `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3435 |
| `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3399 |
| `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2531 |
| `attachment_page_caption` | src/memorymap/api/routes_files.py:3640 |
| `attachment_page_reads` | src/memorymap/api/routes_files.py:3678 |
| `attachment_region_read` | src/memorymap/api/routes_files.py:3606 |
| `caption_media` | src/memorymap/api/routes_files.py:1874 |
| `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3857 |
| `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3883 |
| `clean_orphaned_media` | src/memorymap/api/routes_files.py:1524 |
| `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3735 |
| `delete_attachment_reading` | src/memorymap/api/routes_files.py:3794 |
| `delete_file` | src/memorymap/api/routes_files.py:906 |
| `delete_media` | src/memorymap/api/routes_files.py:1786 |
| `delete_media_page_read` | src/memorymap/api/routes_files.py:3749 |
| `delete_media_reading` | src/memorymap/api/routes_files.py:3784 |
| `download_export` | src/memorymap/api/routes_files.py:1171 |
| `download_file` | src/memorymap/api/routes_files.py:170 |
| `file_readings` | src/memorymap/api/routes_files.py:273 |
| `get_media` | src/memorymap/api/routes_files.py:4007 |
| `list_attachment_gallery` | src/memorymap/api/routes_files.py:297 |
| `list_exports` | src/memorymap/api/routes_files.py:1133 |
| `list_media` | src/memorymap/api/routes_files.py:1392 |
| `list_orphaned_media` | src/memorymap/api/routes_files.py:1493 |
| `media_meta` | src/memorymap/api/routes_files.py:1549 |
| `media_ocr_page_read` | src/memorymap/api/routes_files.py:3452 |
| `media_ocr_range_read` | src/memorymap/api/routes_files.py:3417 |
| `media_ocr_regions` | src/memorymap/api/routes_files.py:2497 |
| `media_page_caption` | src/memorymap/api/routes_files.py:3661 |
| `media_page_reads` | src/memorymap/api/routes_files.py:3694 |
| `media_pdf_info` | src/memorymap/api/routes_files.py:1667 |
| `media_pdf_page` | src/memorymap/api/routes_files.py:1707 |
| `media_region_read` | src/memorymap/api/routes_files.py:3626 |
| `media_text` | src/memorymap/api/routes_files.py:1599 |
| `ocr_media` | src/memorymap/api/routes_files.py:1979 |
| `ocr_readers` | src/memorymap/api/routes_files.py:3205 |
| `open_exports_folder` | src/memorymap/api/routes_files.py:1182 |
| `purge_binned_reading` | src/memorymap/api/routes_files.py:3828 |
| `rename_file` | src/memorymap/api/routes_files.py:928 |
| `rename_media` | src/memorymap/api/routes_files.py:1819 |
| `restore_binned_reading` | src/memorymap/api/routes_files.py:3810 |
| `safe_filename` | src/memorymap/api/routes_files.py:1006 |
| `save_attached_file_text` | src/memorymap/api/routes_files.py:711 |
| `save_generated_file` | src/memorymap/api/routes_files.py:1085 |
| `set_ocr_language` | src/memorymap/api/routes_files.py:3254 |
| `upload_file` | src/memorymap/api/routes_files.py:97 |
| `upload_media` | src/memorymap/api/routes_files.py:1243 |
| `vision_ocr_media` | src/memorymap/api/routes_files.py:3936 |

### src/memorymap/api/routes_graph.py (42)

| Name | File:line |
|---|---|
| `PinBody` | src/memorymap/api/routes_graph.py:1742 |
| `PinRow` | src/memorymap/api/routes_graph.py:1778 |
| `PinsBody` | src/memorymap/api/routes_graph.py:1784 |
| `TopicNameBody` | src/memorymap/api/routes_graph.py:1395 |
| `TopicSummaryBody` | src/memorymap/api/routes_graph.py:1412 |
| `_add_attachment_nodes` | src/memorymap/api/routes_graph.py:618 |
| `_add_document_nodes` | src/memorymap/api/routes_graph.py:420 |
| `_add_entity_nodes` | src/memorymap/api/routes_graph.py:351 |
| `_add_map_edges` | src/memorymap/api/routes_graph.py:483 |
| `_add_tag_nodes` | src/memorymap/api/routes_graph.py:563 |
| `_add_unresolved_nodes` | src/memorymap/api/routes_graph.py:577 |
| `_age_days` | src/memorymap/api/routes_graph.py:39 |
| `_build_graph` | src/memorymap/api/routes_graph.py:779 |
| `_build_structure` | src/memorymap/api/routes_graph.py:1501 |
| `_build_topics` | src/memorymap/api/routes_graph.py:1474 |
| `_cached` | src/memorymap/api/routes_graph.py:118 |
| `_centrality` | src/memorymap/api/routes_graph.py:285 |
| `_graph_fingerprint` | src/memorymap/api/routes_graph.py:97 |
| `_hop_reasons` | src/memorymap/api/routes_graph.py:1700 |
| `_load_entries` | src/memorymap/api/routes_graph.py:1145 |
| `_local_topology` | src/memorymap/api/routes_graph.py:1157 |
| `_note_texts` | src/memorymap/api/routes_graph.py:151 |
| `_path_node` | src/memorymap/api/routes_graph.py:1314 |
| `_payload_key` | src/memorymap/api/routes_graph.py:667 |
| `_preview` | src/memorymap/api/routes_graph.py:196 |
| `_preview_line` | src/memorymap/api/routes_graph.py:221 |
| `_similarity_edges` | src/memorymap/api/routes_graph.py:230 |
| `_slim` | src/memorymap/api/routes_graph.py:1126 |
| `_tags_of` | src/memorymap/api/routes_graph.py:47 |
| `_word_count` | src/memorymap/api/routes_graph.py:639 |
| `graph` | src/memorymap/api/routes_graph.py:743 |
| `graph_local` | src/memorymap/api/routes_graph.py:1202 |
| `graph_match` | src/memorymap/api/routes_graph.py:329 |
| `graph_path` | src/memorymap/api/routes_graph.py:1550 |
| `graph_structure` | src/memorymap/api/routes_graph.py:1326 |
| `graph_topics_of` | src/memorymap/api/routes_graph.py:1364 |
| `name_topic` | src/memorymap/api/routes_graph.py:1401 |
| `pin_node` | src/memorymap/api/routes_graph.py:1752 |
| `pin_nodes` | src/memorymap/api/routes_graph.py:1789 |
| `reset_graph_cache` | src/memorymap/api/routes_graph.py:135 |
| `topic_summary` | src/memorymap/api/routes_graph.py:1419 |
| `unpin_all_nodes` | src/memorymap/api/routes_graph.py:1810 |

### src/memorymap/api/routes_help.py (5)

| Name | File:line |
|---|---|
| `AskBody` | src/memorymap/api/routes_help.py:23 |
| `HistoryTurn` | src/memorymap/api/routes_help.py:18 |
| `ask` | src/memorymap/api/routes_help.py:60 |
| `ask_stream` | src/memorymap/api/routes_help.py:72 |
| `topics` | src/memorymap/api/routes_help.py:53 |

### src/memorymap/api/routes_import.py (6)

| Name | File:line |
|---|---|
| `_progress` | src/memorymap/api/routes_import.py:46 |
| `_received` | src/memorymap/api/routes_import.py:32 |
| `_summary` | src/memorymap/api/routes_import.py:57 |
| `export_notebook_folder` | src/memorymap/api/routes_import.py:120 |
| `import_app` | src/memorymap/api/routes_import.py:64 |
| `import_report_page` | src/memorymap/api/routes_import.py:111 |

### src/memorymap/api/routes_inbox.py (12)

| Name | File:line |
|---|---|
| `MergeAccept` | src/memorymap/api/routes_inbox.py:131 |
| `MergeDismiss` | src/memorymap/api/routes_inbox.py:137 |
| `TypeDecision` | src/memorymap/api/routes_inbox.py:164 |
| `_merges` | src/memorymap/api/routes_inbox.py:49 |
| `_sentence` | src/memorymap/api/routes_inbox.py:67 |
| `_types` | src/memorymap/api/routes_inbox.py:83 |
| `_visible` | src/memorymap/api/routes_inbox.py:38 |
| `accept_merge` | src/memorymap/api/routes_inbox.py:144 |
| `accept_type` | src/memorymap/api/routes_inbox.py:170 |
| `dismiss_merge` | src/memorymap/api/routes_inbox.py:158 |
| `dismiss_type` | src/memorymap/api/routes_inbox.py:187 |
| `suggestions` | src/memorymap/api/routes_inbox.py:125 |

### src/memorymap/api/routes_insights.py (23)

| Name | File:line |
|---|---|
| `InsightVerdict` | src/memorymap/api/routes_insights.py:405 |
| `_clean_greeting` | src/memorymap/api/routes_insights.py:136 |
| `_digest_notes` | src/memorymap/api/routes_insights.py:555 |
| `_greets_a_stranger` | src/memorymap/api/routes_insights.py:324 |
| `_long_date` | src/memorymap/api/routes_insights.py:529 |
| `_name_like_words` | src/memorymap/api/routes_insights.py:282 |
| `_name_mentions` | src/memorymap/api/routes_insights.py:293 |
| `_repair_misspelt_name` | src/memorymap/api/routes_insights.py:305 |
| `_sentence_case` | src/memorymap/api/routes_insights.py:157 |
| `_written_label` | src/memorymap/api/routes_insights.py:536 |
| `confirm_insight` | src/memorymap/api/routes_insights.py:416 |
| `day_digest_lines` | src/memorymap/api/routes_insights.py:377 |
| `digest_question` | src/memorymap/api/routes_insights.py:549 |
| `digest_structure_note` | src/memorymap/api/routes_insights.py:594 |
| `dismiss_insight` | src/memorymap/api/routes_insights.py:430 |
| `greeting` | src/memorymap/api/routes_insights.py:162 |
| `heatmap` | src/memorymap/api/routes_insights.py:342 |
| `on_this_day` | src/memorymap/api/routes_insights.py:454 |
| `patterns` | src/memorymap/api/routes_insights.py:394 |
| `stats` | src/memorymap/api/routes_insights.py:34 |
| `tag_cloud` | src/memorymap/api/routes_insights.py:443 |
| `weekly_digest` | src/memorymap/api/routes_insights.py:707 |
| `weekly_digest_stream` | src/memorymap/api/routes_insights.py:639 |

### src/memorymap/api/routes_learned.py (18)

| Name | File:line |
|---|---|
| `BulkBody` | src/memorymap/api/routes_learned.py:229 |
| `CorrectionBody` | src/memorymap/api/routes_learned.py:35 |
| `FactPatch` | src/memorymap/api/routes_learned.py:113 |
| `ForgetBody` | src/memorymap/api/routes_learned.py:128 |
| `SwitchBody` | src/memorymap/api/routes_learned.py:121 |
| `add_correction` | src/memorymap/api/routes_learned.py:54 |
| `bulk_action` | src/memorymap/api/routes_learned.py:237 |
| `delete_fact` | src/memorymap/api/routes_learned.py:314 |
| `export_learned` | src/memorymap/api/routes_learned.py:151 |
| `forget_everything` | src/memorymap/api/routes_learned.py:213 |
| `get_fact` | src/memorymap/api/routes_learned.py:276 |
| `get_switches` | src/memorymap/api/routes_learned.py:198 |
| `learned_summary` | src/memorymap/api/routes_learned.py:190 |
| `list_corrections` | src/memorymap/api/routes_learned.py:79 |
| `list_facts` | src/memorymap/api/routes_learned.py:133 |
| `patch_fact` | src/memorymap/api/routes_learned.py:284 |
| `put_switches` | src/memorymap/api/routes_learned.py:204 |
| `reset_fact` | src/memorymap/api/routes_learned.py:303 |

### src/memorymap/api/routes_library.py (20)

| Name | File:line |
|---|---|
| `_activity` | src/memorymap/api/routes_library.py:916 |
| `_archive` | src/memorymap/api/routes_library.py:357 |
| `_chats` | src/memorymap/api/routes_library.py:253 |
| `_clip` | src/memorymap/api/routes_library.py:120 |
| `_clip_plain` | src/memorymap/api/routes_library.py:144 |
| `_documents` | src/memorymap/api/routes_library.py:218 |
| `_drafts` | src/memorymap/api/routes_library.py:869 |
| `_entry_kind` | src/memorymap/api/routes_library.py:196 |
| `_first_inline_image_url` | src/memorymap/api/routes_library.py:168 |
| `_highlights` | src/memorymap/api/routes_library.py:752 |
| `_human_size` | src/memorymap/api/routes_library.py:186 |
| `_images` | src/memorymap/api/routes_library.py:302 |
| `_like` | src/memorymap/api/routes_library.py:54 |
| `_notes` | src/memorymap/api/routes_library.py:632 |
| `_other_binned` | src/memorymap/api/routes_library.py:418 |
| `_overview` | src/memorymap/api/routes_library.py:1031 |
| `_shelved` | src/memorymap/api/routes_library.py:505 |
| `_tags` | src/memorymap/api/routes_library.py:991 |
| `_totals` | src/memorymap/api/routes_library.py:1060 |
| `library` | src/memorymap/api/routes_library.py:1077 |

### src/memorymap/api/routes_map_from_notes.py (6)

| Name | File:line |
|---|---|
| `MapFromNotes` | src/memorymap/api/routes_map_from_notes.py:245 |
| `_key_category` | src/memorymap/api/routes_map_from_notes.py:66 |
| `_weight` | src/memorymap/api/routes_map_from_notes.py:209 |
| `build_tree` | src/memorymap/api/routes_map_from_notes.py:70 |
| `layout_both_sides` | src/memorymap/api/routes_map_from_notes.py:213 |
| `map_from_notes` | src/memorymap/api/routes_map_from_notes.py:257 |

### src/memorymap/api/routes_map_suggest.py (12)

| Name | File:line |
|---|---|
| `BranchItem` | src/memorymap/api/routes_map_suggest.py:188 |
| `BranchesBody` | src/memorymap/api/routes_map_suggest.py:193 |
| `_ask_for_summary` | src/memorymap/api/routes_map_suggest.py:282 |
| `_ask_model` | src/memorymap/api/routes_map_suggest.py:120 |
| `_branch_outline` | src/memorymap/api/routes_map_suggest.py:243 |
| `_candidates` | src/memorymap/api/routes_map_suggest.py:81 |
| `_node_or_404` | src/memorymap/api/routes_map_suggest.py:74 |
| `_said_plainly` | src/memorymap/api/routes_map_suggest.py:271 |
| `_topic_text` | src/memorymap/api/routes_map_suggest.py:59 |
| `add_branches` | src/memorymap/api/routes_map_suggest.py:198 |
| `suggest_branches` | src/memorymap/api/routes_map_suggest.py:147 |
| `summarise_branch` | src/memorymap/api/routes_map_suggest.py:309 |

### src/memorymap/api/routes_meetings.py (11)

| Name | File:line |
|---|---|
| `AppendBody` | src/memorymap/api/routes_meetings.py:167 |
| `MeetingCreate` | src/memorymap/api/routes_meetings.py:39 |
| `RemindBody` | src/memorymap/api/routes_meetings.py:117 |
| `_meeting_entry` | src/memorymap/api/routes_meetings.py:73 |
| `_read_due` | src/memorymap/api/routes_meetings.py:127 |
| `_reminders_for` | src/memorymap/api/routes_meetings.py:80 |
| `append_to_meeting` | src/memorymap/api/routes_meetings.py:176 |
| `create_meeting` | src/memorymap/api/routes_meetings.py:52 |
| `read_meeting` | src/memorymap/api/routes_meetings.py:90 |
| `remind_action` | src/memorymap/api/routes_meetings.py:135 |
| `summarise_meeting` | src/memorymap/api/routes_meetings.py:191 |

### src/memorymap/api/routes_mentions.py (5)

| Name | File:line |
|---|---|
| `MentionLinkIn` | src/memorymap/api/routes_mentions.py:162 |
| `_backlinks` | src/memorymap/api/routes_mentions.py:85 |
| `entry_backlinks` | src/memorymap/api/routes_mentions.py:156 |
| `link_mention` | src/memorymap/api/routes_mentions.py:172 |
| `note_names` | src/memorymap/api/routes_mentions.py:64 |

### src/memorymap/api/routes_models.py (43)

| Name | File:line |
|---|---|
| `ChatModelBody` | src/memorymap/api/routes_models.py:36 |
| `EmbeddingBackendBody` | src/memorymap/api/routes_models.py:40 |
| `FeatureModelBody` | src/memorymap/api/routes_models.py:54 |
| `InspectBody` | src/memorymap/api/routes_models.py:652 |
| `ProviderBody` | src/memorymap/api/routes_models.py:72 |
| `PullBody` | src/memorymap/api/routes_models.py:45 |
| `SamplingBody` | src/memorymap/api/routes_models.py:530 |
| `UtilityModelBody` | src/memorymap/api/routes_models.py:49 |
| `VisionModelBody` | src/memorymap/api/routes_models.py:66 |
| `_CachedCapabilities` | src/memorymap/api/routes_models.py:189 |
| `_ListFlight` | src/memorymap/api/routes_models.py:117 |
| `_backend_label` | src/memorymap/api/routes_models.py:90 |
| `_builtin_embedding_install_state` | src/memorymap/api/routes_models.py:247 |
| `_embedding_coverage` | src/memorymap/api/routes_models.py:286 |
| `_human_bytes` | src/memorymap/api/routes_models.py:684 |
| `_installed_models` | src/memorymap/api/routes_models.py:97 |
| `_installed_names` | src/memorymap/api/routes_models.py:656 |
| `_installed_or_last_known` | src/memorymap/api/routes_models.py:131 |
| `_model_ready` | src/memorymap/api/routes_models.py:311 |
| `_name_matches` | src/memorymap/api/routes_models.py:182 |
| `_run_list_flight` | src/memorymap/api/routes_models.py:164 |
| `_tools_engine` | src/memorymap/api/routes_models.py:302 |
| `_warm_capabilities` | src/memorymap/api/routes_models.py:225 |
| `cancel_job` | src/memorymap/api/routes_models.py:900 |
| `delete_model` | src/memorymap/api/routes_models.py:1004 |
| `hardware_memory` | src/memorymap/api/routes_models.py:647 |
| `inspect_model` | src/memorymap/api/routes_models.py:664 |
| `model_spec` | src/memorymap/api/routes_models.py:503 |
| `pull_model` | src/memorymap/api/routes_models.py:1038 |
| `rebuild_search_index` | src/memorymap/api/routes_models.py:964 |
| `reset_feature_models` | src/memorymap/api/routes_models.py:817 |
| `sampling_settings` | src/memorymap/api/routes_models.py:543 |
| `save_sampling_settings` | src/memorymap/api/routes_models.py:591 |
| `set_chat_model` | src/memorymap/api/routes_models.py:692 |
| `set_embedding_backend` | src/memorymap/api/routes_models.py:915 |
| `set_feature_model` | src/memorymap/api/routes_models.py:767 |
| `set_ocr_model` | src/memorymap/api/routes_models.py:746 |
| `set_provider` | src/memorymap/api/routes_models.py:834 |
| `set_utility_model` | src/memorymap/api/routes_models.py:711 |
| `set_vision_model` | src/memorymap/api/routes_models.py:729 |
| `status` | src/memorymap/api/routes_models.py:318 |
| `suggested` | src/memorymap/api/routes_models.py:605 |
| `warm_filing` | src/memorymap/api/routes_models.py:266 |

### src/memorymap/api/routes_night.py (4)

| Name | File:line |
|---|---|
| `RunBody` | src/memorymap/api/routes_night.py:34 |
| `latest` | src/memorymap/api/routes_night.py:85 |
| `run_facts` | src/memorymap/api/routes_night.py:93 |
| `run_now` | src/memorymap/api/routes_night.py:51 |

### src/memorymap/api/routes_privacy.py (3)

| Name | File:line |
|---|---|
| `_label` | src/memorymap/api/routes_privacy.py:83 |
| `_model_server` | src/memorymap/api/routes_privacy.py:52 |
| `receipt` | src/memorymap/api/routes_privacy.py:96 |

### src/memorymap/api/routes_properties.py (13)

| Name | File:line |
|---|---|
| `FieldIn` | src/memorymap/api/routes_properties.py:96 |
| `NoteTypeIn` | src/memorymap/api/routes_properties.py:101 |
| `NoteTypePatch` | src/memorymap/api/routes_properties.py:112 |
| `PropertiesIn` | src/memorymap/api/routes_properties.py:55 |
| `_existing_type` | src/memorymap/api/routes_properties.py:160 |
| `_fields` | src/memorymap/api/routes_properties.py:119 |
| `_type_row` | src/memorymap/api/routes_properties.py:35 |
| `create_note_type` | src/memorymap/api/routes_properties.py:146 |
| `delete_note_type` | src/memorymap/api/routes_properties.py:190 |
| `entry_properties` | src/memorymap/api/routes_properties.py:46 |
| `list_note_types` | src/memorymap/api/routes_properties.py:134 |
| `patch_note_type` | src/memorymap/api/routes_properties.py:168 |
| `put_properties` | src/memorymap/api/routes_properties.py:62 |

### src/memorymap/api/routes_questions.py (5)

| Name | File:line |
|---|---|
| `StateBody` | src/memorymap/api/routes_questions.py:59 |
| `counts` | src/memorymap/api/routes_questions.py:46 |
| `list_questions` | src/memorymap/api/routes_questions.py:27 |
| `set_state` | src/memorymap/api/routes_questions.py:66 |
| `summary` | src/memorymap/api/routes_questions.py:54 |

### src/memorymap/api/routes_read.py (10)

| Name | File:line |
|---|---|
| `DatesBody` | src/memorymap/api/routes_read.py:85 |
| `OffersBody` | src/memorymap/api/routes_read.py:54 |
| `_clock` | src/memorymap/api/routes_read.py:27 |
| `act_rows` | src/memorymap/api/routes_read.py:127 |
| `board_act` | src/memorymap/api/routes_read.py:77 |
| `date_chips` | src/memorymap/api/routes_read.py:92 |
| `note_offers` | src/memorymap/api/routes_read.py:65 |
| `phrase_filter` | src/memorymap/api/routes_read.py:100 |
| `read_text` | src/memorymap/api/routes_read.py:37 |
| `setting_words` | src/memorymap/api/routes_read.py:118 |

### src/memorymap/api/routes_recordings.py (16)

| Name | File:line |
|---|---|
| `RecordingCreate` | src/memorymap/api/routes_recordings.py:40 |
| `RecordingFinish` | src/memorymap/api/routes_recordings.py:48 |
| `RecordingPatch` | src/memorymap/api/routes_recordings.py:54 |
| `_get` | src/memorymap/api/routes_recordings.py:60 |
| `append_chunk` | src/memorymap/api/routes_recordings.py:132 |
| `bin_recording` | src/memorymap/api/routes_recordings.py:198 |
| `create_recording` | src/memorymap/api/routes_recordings.py:109 |
| `finish_recording` | src/memorymap/api/routes_recordings.py:160 |
| `list_recordings` | src/memorymap/api/routes_recordings.py:79 |
| `purge_recording` | src/memorymap/api/routes_recordings.py:217 |
| `read_recording` | src/memorymap/api/routes_recordings.py:178 |
| `recording_audio` | src/memorymap/api/routes_recordings.py:255 |
| `recover_recordings` | src/memorymap/api/routes_recordings.py:101 |
| `restore_recording` | src/memorymap/api/routes_recordings.py:208 |
| `transcribe_recording` | src/memorymap/api/routes_recordings.py:228 |
| `update_recording` | src/memorymap/api/routes_recordings.py:183 |

### src/memorymap/api/routes_relations.py (10)

| Name | File:line |
|---|---|
| `RelationIn` | src/memorymap/api/routes_relations.py:38 |
| `RelationPatch` | src/memorymap/api/routes_relations.py:52 |
| `_clean` | src/memorymap/api/routes_relations.py:33 |
| `_colour` | src/memorymap/api/routes_relations.py:59 |
| `_custom` | src/memorymap/api/routes_relations.py:101 |
| `_key` | src/memorymap/api/routes_relations.py:29 |
| `create_type` | src/memorymap/api/routes_relations.py:77 |
| `delete_type` | src/memorymap/api/routes_relations.py:131 |
| `list_types` | src/memorymap/api/routes_relations.py:66 |
| `patch_type` | src/memorymap/api/routes_relations.py:111 |

### src/memorymap/api/routes_reminders.py (28)

| Name | File:line |
|---|---|
| `MagicAddBody` | src/memorymap/api/routes_reminders.py:55 |
| `ReminderCreate` | src/memorymap/api/routes_reminders.py:39 |
| `ReminderUpdate` | src/memorymap/api/routes_reminders.py:63 |
| `WhenBody` | src/memorymap/api/routes_reminders.py:438 |
| `_binned` | src/memorymap/api/routes_reminders.py:609 |
| `_existing` | src/memorymap/api/routes_reminders.py:178 |
| `_ics_event` | src/memorymap/api/routes_reminders.py:298 |
| `_ics_fold` | src/memorymap/api/routes_reminders.py:275 |
| `_ics_response` | src/memorymap/api/routes_reminders.py:334 |
| `_ics_text` | src/memorymap/api/routes_reminders.py:264 |
| `_ics_time` | src/memorymap/api/routes_reminders.py:293 |
| `_reject_if_in_the_past` | src/memorymap/api/routes_reminders.py:77 |
| `_repeat_words` | src/memorymap/api/routes_reminders.py:150 |
| `_rule_words` | src/memorymap/api/routes_reminders.py:161 |
| `_target` | src/memorymap/api/routes_reminders.py:92 |
| `_to_out` | src/memorymap/api/routes_reminders.py:117 |
| `complete_reminder` | src/memorymap/api/routes_reminders.py:567 |
| `create_reminder` | src/memorymap/api/routes_reminders.py:410 |
| `delete_reminder` | src/memorymap/api/routes_reminders.py:599 |
| `export_ics` | src/memorymap/api/routes_reminders.py:349 |
| `export_one_ics` | src/memorymap/api/routes_reminders.py:358 |
| `list_reminders` | src/memorymap/api/routes_reminders.py:365 |
| `magic_add_reminder` | src/memorymap/api/routes_reminders.py:463 |
| `purge_reminder` | src/memorymap/api/routes_reminders.py:630 |
| `read_when` | src/memorymap/api/routes_reminders.py:444 |
| `reminder_counts` | src/memorymap/api/routes_reminders.py:201 |
| `restore_reminder` | src/memorymap/api/routes_reminders.py:620 |
| `update_reminder` | src/memorymap/api/routes_reminders.py:537 |

### src/memorymap/api/routes_resurface.py (7)

| Name | File:line |
|---|---|
| `_card` | src/memorymap/api/routes_resurface.py:25 |
| `_first_line` | src/memorymap/api/routes_resurface.py:60 |
| `_reason` | src/memorymap/api/routes_resurface.py:69 |
| `compute` | src/memorymap/api/routes_resurface.py:86 |
| `near` | src/memorymap/api/routes_resurface.py:146 |
| `ranked` | src/memorymap/api/routes_resurface.py:120 |
| `today` | src/memorymap/api/routes_resurface.py:97 |

### src/memorymap/api/routes_search.py (5)

| Name | File:line |
|---|---|
| `WarmBody` | src/memorymap/api/routes_search.py:31 |
| `_corrected_query` | src/memorymap/api/routes_search.py:122 |
| `search` | src/memorymap/api/routes_search.py:60 |
| `stats` | src/memorymap/api/routes_search.py:145 |
| `warm` | src/memorymap/api/routes_search.py:36 |

### src/memorymap/api/routes_settings.py (93)

| Name | File:line |
|---|---|
| `AvatarStyle` | src/memorymap/api/routes_settings.py:53 |
| `ClientError` | src/memorymap/api/routes_settings.py:1960 |
| `CustomThemeItem` | src/memorymap/api/routes_settings.py:229 |
| `DashboardLayout` | src/memorymap/api/routes_settings.py:651 |
| `DraftTemplateBody` | src/memorymap/api/routes_settings.py:208 |
| `EmbeddingChoiceBody` | src/memorymap/api/routes_settings.py:1831 |
| `EmbeddingPullBody` | src/memorymap/api/routes_settings.py:1887 |
| `ExtrasBulkBody` | src/memorymap/api/routes_settings.py:1768 |
| `ImportDirectoryRequest` | src/memorymap/api/routes_settings.py:2571 |
| `PersonaItem` | src/memorymap/api/routes_settings.py:142 |
| `PreferenceBody` | src/memorymap/api/routes_settings.py:1259 |
| `PreferencesBody` | src/memorymap/api/routes_settings.py:299 |
| `ProposalAnswer` | src/memorymap/api/routes_settings.py:1264 |
| `SavedSearch` | src/memorymap/api/routes_settings.py:625 |
| `SkillInput` | src/memorymap/api/routes_settings.py:258 |
| `SkillItem` | src/memorymap/api/routes_settings.py:267 |
| `SuggestThinkingWordsBody` | src/memorymap/api/routes_settings.py:182 |
| `TemplateItem` | src/memorymap/api/routes_settings.py:114 |
| `UndoBody` | src/memorymap/api/routes_settings.py:1612 |
| `_already_imported` | src/memorymap/api/routes_settings.py:2669 |
| `_clean_avatar_style` | src/memorymap/api/routes_settings.py:94 |
| `_create_document_notes` | src/memorymap/api/routes_settings.py:3006 |
| `_csv_safe` | src/memorymap/api/routes_settings.py:1496 |
| `_desktop_entry` | src/memorymap/api/routes_settings.py:1080 |
| `_export_rows` | src/memorymap/api/routes_settings.py:2308 |
| `_exported_created` | src/memorymap/api/routes_settings.py:2504 |
| `_feed_item` | src/memorymap/api/routes_settings.py:1585 |
| `_import_directory_files` | src/memorymap/api/routes_settings.py:2690 |
| `_import_markdown_files` | src/memorymap/api/routes_settings.py:2863 |
| `_import_root_for` | src/memorymap/api/routes_settings.py:2634 |
| `_import_roots` | src/memorymap/api/routes_settings.py:2618 |
| `_inside` | src/memorymap/api/routes_settings.py:2642 |
| `_keep_exported_state` | src/memorymap/api/routes_settings.py:2521 |
| `_link_imported` | src/memorymap/api/routes_settings.py:2849 |
| `_models_status_snapshot` | src/memorymap/api/routes_settings.py:2292 |
| `_not_private_events` | src/memorymap/api/routes_settings.py:1503 |
| `_parse_frontmatter` | src/memorymap/api/routes_settings.py:2531 |
| `_preference_detail` | src/memorymap/api/routes_settings.py:909 |
| `_preference_out` | src/memorymap/api/routes_settings.py:1270 |
| `_redacted_preferences` | src/memorymap/api/routes_settings.py:2163 |
| `_run_directory_import` | src/memorymap/api/routes_settings.py:2654 |
| `_slug` | src/memorymap/api/routes_settings.py:2408 |
| `_text_hash` | src/memorymap/api/routes_settings.py:2665 |
| `_under_root` | src/memorymap/api/routes_settings.py:2629 |
| `_validated_context_windows` | src/memorymap/api/routes_settings.py:940 |
| `_validated_export_dir` | src/memorymap/api/routes_settings.py:1175 |
| `_validated_import_directory` | src/memorymap/api/routes_settings.py:2574 |
| `_validated_quick_access` | src/memorymap/api/routes_settings.py:673 |
| `_validated_quick_tints` | src/memorymap/api/routes_settings.py:696 |
| `_validated_skills` | src/memorymap/api/routes_settings.py:1123 |
| `_validated_templates` | src/memorymap/api/routes_settings.py:1149 |
| `add_memory` | src/memorymap/api/routes_settings.py:1333 |
| `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1376 |
| `audit_export_csv` | src/memorymap/api/routes_settings.py:1530 |
| `audit_log` | src/memorymap/api/routes_settings.py:1439 |
| `build_markdown_export` | src/memorymap/api/routes_settings.py:2414 |
| `bulk_extras` | src/memorymap/api/routes_settings.py:1778 |
| `clear_audit_log` | src/memorymap/api/routes_settings.py:1715 |
| `clear_server_logs` | src/memorymap/api/routes_settings.py:2038 |
| `download_embedding_model` | src/memorymap/api/routes_settings.py:1929 |
| `draft_template` | src/memorymap/api/routes_settings.py:215 |
| `embedding_model_choices` | src/memorymap/api/routes_settings.py:1837 |
| `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1731 |
| `event_feed` | src/memorymap/api/routes_settings.py:1657 |
| `export_backup` | src/memorymap/api/routes_settings.py:2319 |
| `export_csv` | src/memorymap/api/routes_settings.py:3032 |
| `export_json` | src/memorymap/api/routes_settings.py:2344 |
| `export_markdown` | src/memorymap/api/routes_settings.py:2473 |
| `forget_memory` | src/memorymap/api/routes_settings.py:1429 |
| `get_preferences` | src/memorymap/api/routes_settings.py:717 |
| `import_directory` | src/memorymap/api/routes_settings.py:2814 |
| `import_document` | src/memorymap/api/routes_settings.py:2936 |
| `import_markdown` | src/memorymap/api/routes_settings.py:2830 |
| `install_extra` | src/memorymap/api/routes_settings.py:1787 |
| `list_embedding_models` | src/memorymap/api/routes_settings.py:1810 |
| `list_extras` | src/memorymap/api/routes_settings.py:1746 |
| `list_memory` | src/memorymap/api/routes_settings.py:1298 |
| `list_skills` | src/memorymap/api/routes_settings.py:1197 |
| `pull_embedding_model` | src/memorymap/api/routes_settings.py:1892 |
| `record_client_error` | src/memorymap/api/routes_settings.py:1974 |
| `remove_embedding_model` | src/memorymap/api/routes_settings.py:1948 |
| `restart_app` | src/memorymap/api/routes_settings.py:1099 |
| `server_log_stats` | src/memorymap/api/routes_settings.py:2026 |
| `server_logs` | src/memorymap/api/routes_settings.py:1955 |
| `set_console_mode` | src/memorymap/api/routes_settings.py:1030 |
| `stream_server_logs` | src/memorymap/api/routes_settings.py:2054 |
| `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:188 |
| `support_bundle` | src/memorymap/api/routes_settings.py:2219 |
| `undo_actor` | src/memorymap/api/routes_settings.py:1628 |
| `uninstall_extra` | src/memorymap/api/routes_settings.py:1800 |
| `update_memory` | src/memorymap/api/routes_settings.py:1410 |
| `update_preferences` | src/memorymap/api/routes_settings.py:961 |
| `use_embedding_model` | src/memorymap/api/routes_settings.py:1869 |

### src/memorymap/api/routes_spaces.py (16)

| Name | File:line |
|---|---|
| `MoveNotesBody` | src/memorymap/api/routes_spaces.py:458 |
| `SpaceDeleted` | src/memorymap/api/routes_spaces.py:268 |
| `SpaceRestore` | src/memorymap/api/routes_spaces.py:173 |
| `_detach_references` | src/memorymap/api/routes_spaces.py:238 |
| `_generate_space_id` | src/memorymap/api/routes_spaces.py:35 |
| `_move_space_contents` | src/memorymap/api/routes_spaces.py:109 |
| `_slugify` | src/memorymap/api/routes_spaces.py:30 |
| `_space_has_rows` | src/memorymap/api/routes_spaces.py:165 |
| `_validate_icon` | src/memorymap/api/routes_spaces.py:51 |
| `_validate_name` | src/memorymap/api/routes_spaces.py:57 |
| `create_space` | src/memorymap/api/routes_spaces.py:72 |
| `delete_space` | src/memorymap/api/routes_spaces.py:275 |
| `get_spaces` | src/memorymap/api/routes_spaces.py:67 |
| `move_notes_to_space` | src/memorymap/api/routes_spaces.py:463 |
| `restore_space` | src/memorymap/api/routes_spaces.py:183 |
| `update_space` | src/memorymap/api/routes_spaces.py:85 |

### src/memorymap/api/routes_statistics.py (1)

| Name | File:line |
|---|---|
| `statistics` | src/memorymap/api/routes_statistics.py:25 |

### src/memorymap/api/routes_tags.py (15)

| Name | File:line |
|---|---|
| `BulkBody` | src/memorymap/api/routes_tags.py:61 |
| `DeleteBody` | src/memorymap/api/routes_tags.py:26 |
| `MergeBody` | src/memorymap/api/routes_tags.py:56 |
| `OfferAgainBody` | src/memorymap/api/routes_tags.py:139 |
| `RenameBody` | src/memorymap/api/routes_tags.py:21 |
| `RestoreBody` | src/memorymap/api/routes_tags.py:67 |
| `_answer` | src/memorymap/api/routes_tags.py:72 |
| `bulk_edit_tags` | src/memorymap/api/routes_tags.py:105 |
| `delete_tag` | src/memorymap/api/routes_tags.py:96 |
| `list_tags` | src/memorymap/api/routes_tags.py:41 |
| `list_turned_down` | src/memorymap/api/routes_tags.py:121 |
| `merge_tags` | src/memorymap/api/routes_tags.py:87 |
| `offer_tag_again` | src/memorymap/api/routes_tags.py:144 |
| `rename_tag` | src/memorymap/api/routes_tags.py:77 |
| `restore_tags` | src/memorymap/api/routes_tags.py:111 |

### src/memorymap/api/routes_tasks.py (23)

| Name | File:line |
|---|---|
| `CancelTaskBody` | src/memorymap/api/routes_tasks.py:566 |
| `_model_state` | src/memorymap/api/routes_tasks.py:763 |
| `_percent` | src/memorymap/api/routes_tasks.py:42 |
| `_stamp_started` | src/memorymap/api/routes_tasks.py:415 |
| `_stop_filing` | src/memorymap/api/routes_tasks.py:441 |
| `activity_rows` | src/memorymap/api/routes_tasks.py:776 |
| `cancel_job` | src/memorymap/api/routes_tasks.py:508 |
| `cancel_task` | src/memorymap/api/routes_tasks.py:576 |
| `clear_history` | src/memorymap/api/routes_tasks.py:678 |
| `clear_last_autonomous_pass` | src/memorymap/api/routes_tasks.py:669 |
| `collect` | src/memorymap/api/routes_tasks.py:50 |
| `desktop_fullscreen_state` | src/memorymap/api/routes_tasks.py:693 |
| `desktop_fullscreen_toggle` | src/memorymap/api/routes_tasks.py:705 |
| `jobs_last_runs` | src/memorymap/api/routes_tasks.py:466 |
| `jobs_stream` | src/memorymap/api/routes_tasks.py:527 |
| `last_autonomous_pass` | src/memorymap/api/routes_tasks.py:652 |
| `list_activity` | src/memorymap/api/routes_tasks.py:815 |
| `list_jobs` | src/memorymap/api/routes_tasks.py:500 |
| `list_tasks` | src/memorymap/api/routes_tasks.py:452 |
| `run_pass_now` | src/memorymap/api/routes_tasks.py:486 |
| `shutdown` | src/memorymap/api/routes_tasks.py:717 |
| `stop_activity` | src/memorymap/api/routes_tasks.py:824 |
| `trigger_autonomous` | src/memorymap/api/routes_tasks.py:615 |

### src/memorymap/api/routes_tidy.py (15)

| Name | File:line |
|---|---|
| `ApplyBody` | src/memorymap/api/routes_tidy.py:36 |
| `AutoBody` | src/memorymap/api/routes_tidy.py:45 |
| `DismissBody` | src/memorymap/api/routes_tidy.py:41 |
| `_level` | src/memorymap/api/routes_tidy.py:32 |
| `_review` | src/memorymap/api/routes_tidy.py:25 |
| `tidy_apply` | src/memorymap/api/routes_tidy.py:119 |
| `tidy_auto` | src/memorymap/api/routes_tidy.py:61 |
| `tidy_dismiss` | src/memorymap/api/routes_tidy.py:105 |
| `tidy_history` | src/memorymap/api/routes_tidy.py:56 |
| `tidy_link_reasons_run` | src/memorymap/api/routes_tidy.py:79 |
| `tidy_link_reasons_stop` | src/memorymap/api/routes_tidy.py:89 |
| `tidy_rows` | src/memorymap/api/routes_tidy.py:95 |
| `tidy_summary` | src/memorymap/api/routes_tidy.py:51 |
| `tidy_undismiss` | src/memorymap/api/routes_tidy.py:113 |
| `tidy_undo` | src/memorymap/api/routes_tidy.py:71 |

### src/memorymap/api/routes_timeline.py (18)

| Name | File:line |
|---|---|
| `_MeetingAt` | src/memorymap/api/routes_timeline.py:263 |
| `_bands` | src/memorymap/api/routes_timeline.py:676 |
| `_bucket_start` | src/memorymap/api/routes_timeline.py:166 |
| `_clip` | src/memorymap/api/routes_timeline.py:71 |
| `_decode_cursor` | src/memorymap/api/routes_timeline.py:80 |
| `_decode_marks` | src/memorymap/api/routes_timeline.py:136 |
| `_density` | src/memorymap/api/routes_timeline.py:646 |
| `_encode_marks` | src/memorymap/api/routes_timeline.py:119 |
| `_first_line` | src/memorymap/api/routes_timeline.py:627 |
| `_meeting_dates` | src/memorymap/api/routes_timeline.py:274 |
| `_naive` | src/memorymap/api/routes_timeline.py:638 |
| `_older_than` | src/memorymap/api/routes_timeline.py:158 |
| `_place_documents` | src/memorymap/api/routes_timeline.py:303 |
| `_place_notes` | src/memorymap/api/routes_timeline.py:177 |
| `_place_reminders` | src/memorymap/api/routes_timeline.py:339 |
| `_requested_kinds` | src/memorymap/api/routes_timeline.py:98 |
| `_thread_bands` | src/memorymap/api/routes_timeline.py:705 |
| `timeline` | src/memorymap/api/routes_timeline.py:376 |

### src/memorymap/api/routes_translate.py (2)

| Name | File:line |
|---|---|
| `status` | src/memorymap/api/routes_translate.py:23 |
| `translate_file` | src/memorymap/api/routes_translate.py:28 |

### src/memorymap/api/routes_update.py (21)

| Name | File:line |
|---|---|
| `_ApplyState` | src/memorymap/api/routes_update.py:150 |
| `_ChoiceBody` | src/memorymap/api/routes_update.py:407 |
| `_SourceUpdateState` | src/memorymap/api/routes_update.py:599 |
| `_can_auto_apply` | src/memorymap/api/routes_update.py:143 |
| `_download` | src/memorymap/api/routes_update.py:197 |
| `_download_url_is_allowed` | src/memorymap/api/routes_update.py:87 |
| `_exit_once_launched` | src/memorymap/api/routes_update.py:757 |
| `_reset_source_status_for_tests` | src/memorymap/api/routes_update.py:618 |
| `_run_apply` | src/memorymap/api/routes_update.py:267 |
| `_version_tuple` | src/memorymap/api/routes_update.py:123 |
| `_windows_asset` | src/memorymap/api/routes_update.py:131 |
| `apply_launcher_choice` | src/memorymap/api/routes_update.py:395 |
| `apply_status` | src/memorymap/api/routes_update.py:753 |
| `apply_update` | src/memorymap/api/routes_update.py:659 |
| `check_for_update` | src/memorymap/api/routes_update.py:426 |
| `current` | src/memorymap/api/routes_update.py:179 |
| `list_releases` | src/memorymap/api/routes_update.py:554 |
| `record_update_choice` | src/memorymap/api/routes_update.py:378 |
| `reset_for_tests` | src/memorymap/api/routes_update.py:171 |
| `source_update_status` | src/memorymap/api/routes_update.py:624 |
| `update_choice` | src/memorymap/api/routes_update.py:412 |

### src/memorymap/api/routes_usage.py (6)

| Name | File:line |
|---|---|
| `KnownIn` | src/memorymap/api/routes_usage.py:24 |
| `UsageIn` | src/memorymap/api/routes_usage.py:20 |
| `capture_command` | src/memorymap/api/routes_usage.py:47 |
| `clear` | src/memorymap/api/routes_usage.py:41 |
| `count` | src/memorymap/api/routes_usage.py:31 |
| `summary` | src/memorymap/api/routes_usage.py:36 |

### src/memorymap/api/routes_vision.py (19)

| Name | File:line |
|---|---|
| `ChartQuestion` | src/memorymap/api/routes_vision.py:373 |
| `DismissBody` | src/memorymap/api/routes_vision.py:244 |
| `_bucket` | src/memorymap/api/routes_vision.py:316 |
| `_buckets` | src/memorymap/api/routes_vision.py:327 |
| `_live_notes` | src/memorymap/api/routes_vision.py:55 |
| `_meaning_alike` | src/memorymap/api/routes_vision.py:168 |
| `_norm` | src/memorymap/api/routes_vision.py:145 |
| `_pair_key` | src/memorymap/api/routes_vision.py:151 |
| `_period` | src/memorymap/api/routes_vision.py:267 |
| `_renamed_by_person` | src/memorymap/api/routes_vision.py:155 |
| `accept_filing` | src/memorymap/api/routes_vision.py:95 |
| `chart_for_question` | src/memorymap/api/routes_vision.py:381 |
| `count_notes` | src/memorymap/api/routes_vision.py:338 |
| `dismiss_tidy` | src/memorymap/api/routes_vision.py:250 |
| `most_opened` | src/memorymap/api/routes_vision.py:113 |
| `parse_chart_question` | src/memorymap/api/routes_vision.py:289 |
| `review_filter` | src/memorymap/api/routes_vision.py:67 |
| `review_queue` | src/memorymap/api/routes_vision.py:84 |
| `tidy_proposals` | src/memorymap/api/routes_vision.py:196 |

### src/memorymap/api/routes_voice.py (6)

| Name | File:line |
|---|---|
| `SummarizeBody` | src/memorymap/api/routes_voice.py:114 |
| `_transcribe_upload` | src/memorymap/api/routes_voice.py:46 |
| `status` | src/memorymap/api/routes_voice.py:31 |
| `summarize` | src/memorymap/api/routes_voice.py:119 |
| `transcribe` | src/memorymap/api/routes_voice.py:95 |
| `transcribe_meeting` | src/memorymap/api/routes_voice.py:102 |

### src/memorymap/api/routes_webclip.py (7)

| Name | File:line |
|---|---|
| `ClipIn` | src/memorymap/api/routes_webclip.py:40 |
| `ClipPageIn` | src/memorymap/api/routes_webclip.py:84 |
| `ClipPageOut` | src/memorymap/api/routes_webclip.py:91 |
| `_page_address` | src/memorymap/api/routes_webclip.py:97 |
| `_plain_title` | src/memorymap/api/routes_webclip.py:106 |
| `clip` | src/memorymap/api/routes_webclip.py:45 |
| `clip_page` | src/memorymap/api/routes_webclip.py:111 |

### src/memorymap/api/routes_websearch.py (9)

| Name | File:line |
|---|---|
| `_require_web_search` | src/memorymap/api/routes_websearch.py:23 |
| `detect_searxng` | src/memorymap/api/routes_websearch.py:94 |
| `searxng_reinstall` | src/memorymap/api/routes_websearch.py:168 |
| `searxng_start` | src/memorymap/api/routes_websearch.py:135 |
| `searxng_status` | src/memorymap/api/routes_websearch.py:121 |
| `searxng_stop` | src/memorymap/api/routes_websearch.py:199 |
| `web_read` | src/memorymap/api/routes_websearch.py:218 |
| `web_search` | src/memorymap/api/routes_websearch.py:54 |
| `web_search_providers` | src/memorymap/api/routes_websearch.py:37 |

### src/memorymap/api/routes_whiteboard.py (134)

| Name | File:line |
|---|---|
| `BoardBackground` | src/memorymap/api/routes_whiteboard.py:1250 |
| `BoardCreate` | src/memorymap/api/routes_whiteboard.py:1435 |
| `BoardImageOut` | src/memorymap/api/routes_whiteboard.py:2339 |
| `BoardLayer` | src/memorymap/api/routes_whiteboard.py:1192 |
| `BoardOut` | src/memorymap/api/routes_whiteboard.py:1340 |
| `BoardRename` | src/memorymap/api/routes_whiteboard.py:2576 |
| `BoardTypeMixin` | src/memorymap/api/routes_whiteboard.py:1409 |
| `MapClearStyleOut` | src/memorymap/api/routes_whiteboard.py:3927 |
| `MapGenerate` | src/memorymap/api/routes_whiteboard.py:5393 |
| `MapImport` | src/memorymap/api/routes_whiteboard.py:4625 |
| `MapNodeCreate` | src/memorymap/api/routes_whiteboard.py:3485 |
| `MapNodeMove` | src/memorymap/api/routes_whiteboard.py:3661 |
| `MapNodeMoveOne` | src/memorymap/api/routes_whiteboard.py:3752 |
| `MapNodesMove` | src/memorymap/api/routes_whiteboard.py:3767 |
| `MapOutlinePaste` | src/memorymap/api/routes_whiteboard.py:3590 |
| `MapProposal` | src/memorymap/api/routes_whiteboard.py:5235 |
| `MapTreeOut` | src/memorymap/api/routes_whiteboard.py:3419 |
| `WhiteboardComment` | src/memorymap/api/routes_whiteboard.py:266 |
| `WhiteboardNodeBase` | src/memorymap/api/routes_whiteboard.py:291 |
| `WhiteboardNodeOut` | src/memorymap/api/routes_whiteboard.py:314 |
| `WhiteboardObjectBase` | src/memorymap/api/routes_whiteboard.py:646 |
| `WhiteboardObjectData` | src/memorymap/api/routes_whiteboard.py:335 |
| `WhiteboardObjectOut` | src/memorymap/api/routes_whiteboard.py:669 |
| `WhiteboardSketchBase` | src/memorymap/api/routes_whiteboard.py:320 |
| `WhiteboardSketchOut` | src/memorymap/api/routes_whiteboard.py:329 |
| `WhiteboardStateOut` | src/memorymap/api/routes_whiteboard.py:768 |
| `_PathEnd` | src/memorymap/api/routes_whiteboard.py:1739 |
| `_apply_board_look` | src/memorymap/api/routes_whiteboard.py:2598 |
| `_apply_comments` | src/memorymap/api/routes_whiteboard.py:2719 |
| `_board_background` | src/memorymap/api/routes_whiteboard.py:1284 |
| `_board_entry` | src/memorymap/api/routes_whiteboard.py:3449 |
| `_board_filter` | src/memorymap/api/routes_whiteboard.py:778 |
| `_board_layers` | src/memorymap/api/routes_whiteboard.py:1210 |
| `_board_numbered` | src/memorymap/api/routes_whiteboard.py:1149 |
| `_board_palette` | src/memorymap/api/routes_whiteboard.py:1555 |
| `_board_preview` | src/memorymap/api/routes_whiteboard.py:1847 |
| `_board_settings` | src/memorymap/api/routes_whiteboard.py:943 |
| `_board_theme` | src/memorymap/api/routes_whiteboard.py:1072 |
| `_build_tree` | src/memorymap/api/routes_whiteboard.py:3312 |
| `_clean_import_style` | src/memorymap/api/routes_whiteboard.py:4715 |
| `_clean_levels` | src/memorymap/api/routes_whiteboard.py:1038 |
| `_clean_theme` | src/memorymap/api/routes_whiteboard.py:996 |
| `_cross_links` | src/memorymap/api/routes_whiteboard.py:3387 |
| `_delete_one_object` | src/memorymap/api/routes_whiteboard.py:3056 |
| `_drop_orphan_links` | src/memorymap/api/routes_whiteboard.py:893 |
| `_export_freemind` | src/memorymap/api/routes_whiteboard.py:4423 |
| `_export_markdown` | src/memorymap/api/routes_whiteboard.py:4140 |
| `_export_node_id` | src/memorymap/api/routes_whiteboard.py:4419 |
| `_export_opml` | src/memorymap/api/routes_whiteboard.py:4339 |
| `_export_text` | src/memorymap/api/routes_whiteboard.py:4181 |
| `_export_tree` | src/memorymap/api/routes_whiteboard.py:4038 |
| `_first_cycle` | src/memorymap/api/routes_whiteboard.py:3784 |
| `_flatten_parsed` | src/memorymap/api/routes_whiteboard.py:5516 |
| `_forget_links_to` | src/memorymap/api/routes_whiteboard.py:788 |
| `_freemind_style` | src/memorymap/api/routes_whiteboard.py:4749 |
| `_import_link_targets` | src/memorymap/api/routes_whiteboard.py:4791 |
| `_is_descendant` | src/memorymap/api/routes_whiteboard.py:3667 |
| `_is_link_sketch` | src/memorymap/api/routes_whiteboard.py:1330 |
| `_is_one_emoji` | src/memorymap/api/routes_whiteboard.py:228 |
| `_map_branch_colors` | src/memorymap/api/routes_whiteboard.py:1560 |
| `_map_kind_ok` | src/memorymap/api/routes_whiteboard.py:3106 |
| `_map_node_dict` | src/memorymap/api/routes_whiteboard.py:3284 |
| `_map_node_style` | src/memorymap/api/routes_whiteboard.py:3270 |
| `_map_objects` | src/memorymap/api/routes_whiteboard.py:3356 |
| `_markdown_note_lines` | src/memorymap/api/routes_whiteboard.py:4202 |
| `_next_position` | src/memorymap/api/routes_whiteboard.py:3500 |
| `_note_titles` | src/memorymap/api/routes_whiteboard.py:5262 |
| `_object_data` | src/memorymap/api/routes_whiteboard.py:3217 |
| `_object_to_out` | src/memorymap/api/routes_whiteboard.py:729 |
| `_opml_style` | src/memorymap/api/routes_whiteboard.py:4774 |
| `_outline_covering` | src/memorymap/api/routes_whiteboard.py:5306 |
| `_outline_from_filing` | src/memorymap/api/routes_whiteboard.py:5277 |
| `_outline_from_paste` | src/memorymap/api/routes_whiteboard.py:3600 |
| `_outline_numbers` | src/memorymap/api/routes_whiteboard.py:4077 |
| `_outline_rows` | src/memorymap/api/routes_whiteboard.py:4007 |
| `_parent_map` | src/memorymap/api/routes_whiteboard.py:3774 |
| `_parse_freemind` | src/memorymap/api/routes_whiteboard.py:4802 |
| `_parse_markdown_outline` | src/memorymap/api/routes_whiteboard.py:5008 |
| `_parse_opml` | src/memorymap/api/routes_whiteboard.py:4866 |
| `_parse_xmind` | src/memorymap/api/routes_whiteboard.py:4925 |
| `_parse_xml_document` | src/memorymap/api/routes_whiteboard.py:4650 |
| `_path_bbox` | src/memorymap/api/routes_whiteboard.py:1677 |
| `_place_map_nodes` | src/memorymap/api/routes_whiteboard.py:5091 |
| `_preview_fields` | src/memorymap/api/routes_whiteboard.py:2106 |
| `_preview_fingerprint` | src/memorymap/api/routes_whiteboard.py:2065 |
| `_preview_items` | src/memorymap/api/routes_whiteboard.py:1790 |
| `_preview_points` | src/memorymap/api/routes_whiteboard.py:1445 |
| `_preview_size` | src/memorymap/api/routes_whiteboard.py:1638 |
| `_proposal_notes` | src/memorymap/api/routes_whiteboard.py:5243 |
| `_record_map_creation` | src/memorymap/api/routes_whiteboard.py:5406 |
| `_reference_facets` | src/memorymap/api/routes_whiteboard.py:3186 |
| `_reference_label` | src/memorymap/api/routes_whiteboard.py:3150 |
| `_require_board` | src/memorymap/api/routes_whiteboard.py:840 |
| `_require_entry` | src/memorymap/api/routes_whiteboard.py:833 |
| `_require_object_data` | src/memorymap/api/routes_whiteboard.py:746 |
| `_require_reference` | src/memorymap/api/routes_whiteboard.py:3118 |
| `_restore_import_links` | src/memorymap/api/routes_whiteboard.py:5162 |
| `_sibling_key` | src/memorymap/api/routes_whiteboard.py:3378 |
| `_sketch_preview` | src/memorymap/api/routes_whiteboard.py:1750 |
| `_store_board_background` | src/memorymap/api/routes_whiteboard.py:1306 |
| `_store_board_layers` | src/memorymap/api/routes_whiteboard.py:1228 |
| `_store_board_numbered` | src/memorymap/api/routes_whiteboard.py:1167 |
| `_store_board_settings` | src/memorymap/api/routes_whiteboard.py:970 |
| `_store_board_theme` | src/memorymap/api/routes_whiteboard.py:1085 |
| `_strip_outline_numbers` | src/memorymap/api/routes_whiteboard.py:4111 |
| `_subtree` | src/memorymap/api/routes_whiteboard.py:3025 |
| `_themed_style` | src/memorymap/api/routes_whiteboard.py:1119 |
| `_without_pins` | src/memorymap/api/routes_whiteboard.py:1137 |
| `_xml_attribute` | src/memorymap/api/routes_whiteboard.py:4326 |
| `board_tree` | src/memorymap/api/routes_whiteboard.py:3459 |
| `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:3952 |
| `create_board` | src/memorymap/api/routes_whiteboard.py:2416 |
| `create_map_node` | src/memorymap/api/routes_whiteboard.py:3529 |
| `create_node` | src/memorymap/api/routes_whiteboard.py:2728 |
| `create_object` | src/memorymap/api/routes_whiteboard.py:2902 |
| `create_sketch` | src/memorymap/api/routes_whiteboard.py:2826 |
| `delete_node` | src/memorymap/api/routes_whiteboard.py:2805 |
| `delete_object` | src/memorymap/api/routes_whiteboard.py:2980 |
| `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2873 |
| `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2458 |
| `export_board` | src/memorymap/api/routes_whiteboard.py:4549 |
| `generate_map` | src/memorymap/api/routes_whiteboard.py:5454 |
| `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:868 |
| `import_board` | src/memorymap/api/routes_whiteboard.py:5528 |
| `list_boards` | src/memorymap/api/routes_whiteboard.py:2158 |
| `list_images` | src/memorymap/api/routes_whiteboard.py:2347 |
| `move_map_node` | src/memorymap/api/routes_whiteboard.py:3700 |
| `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3815 |
| `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3625 |
| `propose_map` | src/memorymap/api/routes_whiteboard.py:5325 |
| `rename_board` | src/memorymap/api/routes_whiteboard.py:2622 |
| `update_node` | src/memorymap/api/routes_whiteboard.py:2773 |
| `update_object` | src/memorymap/api/routes_whiteboard.py:2946 |
| `update_sketch` | src/memorymap/api/routes_whiteboard.py:2848 |

### src/memorymap/api/run_sandbox.py (20)

| Name | File:line |
|---|---|
| `RunJobBody` | src/memorymap/api/run_sandbox.py:1514 |
| `_MMDebugger` | src/memorymap/api/run_sandbox.py:1035 |
| `_MMFrameAt` | src/memorymap/api/run_sandbox.py:1202 |
| `_MMOut` | src/memorymap/api/run_sandbox.py:784 |
| `_mm_debug` | src/memorymap/api/run_sandbox.py:1139 |
| `_mm_eval` | src/memorymap/api/run_sandbox.py:879 |
| `_mm_input` | src/memorymap/api/run_sandbox.py:823 |
| `_mm_line` | src/memorymap/api/run_sandbox.py:906 |
| `_mm_names` | src/memorymap/api/run_sandbox.py:1024 |
| `_mm_run` | src/memorymap/api/run_sandbox.py:846 |
| `_mm_show` | src/memorymap/api/run_sandbox.py:1016 |
| `_mm_tests` | src/memorymap/api/run_sandbox.py:918 |
| `_run_job` | src/memorymap/api/run_sandbox.py:1518 |
| `beat_run_job` | src/memorymap/api/run_sandbox.py:1540 |
| `end_run_job` | src/memorymap/api/run_sandbox.py:1548 |
| `pyodide_file` | src/memorymap/api/run_sandbox.py:1459 |
| `python_csp` | src/memorymap/api/run_sandbox.py:760 |
| `run_sandbox` | src/memorymap/api/run_sandbox.py:714 |
| `run_sandbox_python` | src/memorymap/api/run_sandbox.py:1429 |
| `start_run_job` | src/memorymap/api/run_sandbox.py:1528 |

### src/memorymap/api/schemas.py (12)

| Name | File:line |
|---|---|
| `AttachmentOut` | src/memorymap/api/schemas.py:185 |
| `ContextBody` | src/memorymap/api/schemas.py:154 |
| `DocumentRefOut` | src/memorymap/api/schemas.py:204 |
| `EntryCreate` | src/memorymap/api/schemas.py:56 |
| `EntryDateOut` | src/memorymap/api/schemas.py:211 |
| `EntryOut` | src/memorymap/api/schemas.py:227 |
| `EntryUpdate` | src/memorymap/api/schemas.py:123 |
| `LinkOut` | src/memorymap/api/schemas.py:160 |
| `SimilarOut` | src/memorymap/api/schemas.py:196 |
| `SpaceCreate` | src/memorymap/api/schemas.py:13 |
| `SpaceResponse` | src/memorymap/api/schemas.py:32 |
| `SpaceUpdate` | src/memorymap/api/schemas.py:23 |

### src/memorymap/api/versioning.py (2)

| Name | File:line |
|---|---|
| `ApiVersionMiddleware` | src/memorymap/api/versioning.py:36 |
| `is_versioned` | src/memorymap/api/versioning.py:72 |

### src/memorymap/core/activity.py (13)

| Name | File:line |
|---|---|
| `Job` | src/memorymap/core/activity.py:45 |
| `_prune` | src/memorymap/core/activity.py:132 |
| `clear` | src/memorymap/core/activity.py:217 |
| `count` | src/memorymap/core/activity.py:138 |
| `finish` | src/memorymap/core/activity.py:144 |
| `get` | src/memorymap/core/activity.py:190 |
| `recent` | src/memorymap/core/activity.py:155 |
| `snapshot` | src/memorymap/core/activity.py:211 |
| `start` | src/memorymap/core/activity.py:117 |
| `stop` | src/memorymap/core/activity.py:196 |
| `stop_kind` | src/memorymap/core/activity.py:203 |
| `track` | src/memorymap/core/activity.py:163 |
| `tracked_stream` | src/memorymap/core/activity.py:173 |

### src/memorymap/core/atomic_io.py (3)

| Name | File:line |
|---|---|
| `_replace` | src/memorymap/core/atomic_io.py:30 |
| `atomic_write_json` | src/memorymap/core/atomic_io.py:79 |
| `atomic_write_text` | src/memorymap/core/atomic_io.py:53 |

### src/memorymap/core/backup.py (19)

| Name | File:line |
|---|---|
| `DamagedNotebookError` | src/memorymap/core/backup.py:261 |
| `_sweep_partials` | src/memorymap/core/backup.py:313 |
| `backup_files` | src/memorymap/core/backup.py:45 |
| `backup_if_due` | src/memorymap/core/backup.py:342 |
| `backup_is_due` | src/memorymap/core/backup.py:324 |
| `backup_now` | src/memorymap/core/backup.py:137 |
| `backup_path` | src/memorymap/core/backup.py:34 |
| `backups_dir` | src/memorymap/core/backup.py:28 |
| `check_at_boot` | src/memorymap/core/backup.py:226 |
| `damaged_notebook_words` | src/memorymap/core/backup.py:265 |
| `forget_boot_check` | src/memorymap/core/backup.py:287 |
| `list_backups` | src/memorymap/core/backup.py:73 |
| `optimize_fts` | src/memorymap/core/backup.py:96 |
| `prune` | src/memorymap/core/backup.py:293 |
| `restore_backup` | src/memorymap/core/backup.py:360 |
| `restore_file` | src/memorymap/core/backup.py:372 |
| `snapshot` | src/memorymap/core/backup.py:121 |
| `strip_leftovers` | src/memorymap/core/backup.py:110 |
| `verify_copy` | src/memorymap/core/backup.py:199 |

### src/memorymap/core/backup_bundle.py (9)

| Name | File:line |
|---|---|
| `BundleError` | src/memorymap/core/backup_bundle.py:63 |
| `_nonce` | src/memorymap/core/backup_bundle.py:67 |
| `_readable_preferences` | src/memorymap/core/backup_bundle.py:153 |
| `_safe_target` | src/memorymap/core/backup_bundle.py:165 |
| `build_zip` | src/memorymap/core/backup_bundle.py:120 |
| `decrypt_file` | src/memorymap/core/backup_bundle.py:93 |
| `encrypt_file` | src/memorymap/core/backup_bundle.py:71 |
| `is_sealed` | src/memorymap/core/backup_bundle.py:88 |
| `restore_zip` | src/memorymap/core/backup_bundle.py:176 |

### src/memorymap/core/bgtasks.py (11)

| Name | File:line |
|---|---|
| `_cancel_autonomous` | src/memorymap/core/bgtasks.py:73 |
| `_cancel_embed_switch` | src/memorymap/core/bgtasks.py:109 |
| `_cancel_embedding_model` | src/memorymap/core/bgtasks.py:115 |
| `_cancel_extra` | src/memorymap/core/bgtasks.py:103 |
| `_cancel_pull` | src/memorymap/core/bgtasks.py:60 |
| `_cancel_reindex` | src/memorymap/core/bgtasks.py:52 |
| `_cancel_searxng_install` | src/memorymap/core/bgtasks.py:121 |
| `_cancel_searxng_start` | src/memorymap/core/bgtasks.py:130 |
| `_cancel_tidy_link_reasons` | src/memorymap/core/bgtasks.py:150 |
| `cancel` | src/memorymap/core/bgtasks.py:188 |
| `stop_all` | src/memorymap/core/bgtasks.py:207 |

### src/memorymap/core/config.py (6)

| Name | File:line |
|---|---|
| `ConfigManager` | src/memorymap/core/config.py:263 |
| `_default_data_dir` | src/memorymap/core/config.py:197 |
| `_owner_only` | src/memorymap/core/config.py:246 |
| `days_from_today` | src/memorymap/core/config.py:365 |
| `resolved_data_dir` | src/memorymap/core/config.py:227 |
| `user_now` | src/memorymap/core/config.py:378 |

### src/memorymap/core/crypto.py (11)

| Name | File:line |
|---|---|
| `DecryptionError` | src/memorymap/core/crypto.py:55 |
| `decrypt` | src/memorymap/core/crypto.py:144 |
| `derive_kek` | src/memorymap/core/crypto.py:59 |
| `encrypt` | src/memorymap/core/crypto.py:137 |
| `is_encrypted` | src/memorymap/core/crypto.py:158 |
| `new_dek` | src/memorymap/core/crypto.py:76 |
| `new_recovery_key` | src/memorymap/core/crypto.py:118 |
| `new_salt` | src/memorymap/core/crypto.py:72 |
| `normalise_recovery_key` | src/memorymap/core/crypto.py:124 |
| `unwrap_dek` | src/memorymap/core/crypto.py:88 |
| `wrap_dek` | src/memorymap/core/crypto.py:81 |

### src/memorymap/core/database.py (64)

| Name | File:line |
|---|---|
| `AskTurn` | src/memorymap/core/database.py:1032 |
| `Attachment` | src/memorymap/core/database.py:955 |
| `AuditLog` | src/memorymap/core/database.py:2079 |
| `Base` | src/memorymap/core/database.py:128 |
| `BinnedReading` | src/memorymap/core/database.py:1616 |
| `BoardLibrary` | src/memorymap/core/database.py:1855 |
| `BoardLibraryItem` | src/memorymap/core/database.py:1873 |
| `BoardLibraryMark` | src/memorymap/core/database.py:1897 |
| `Bookmark` | src/memorymap/core/database.py:1078 |
| `Category` | src/memorymap/core/database.py:274 |
| `ChunkVector` | src/memorymap/core/database.py:880 |
| `Conversation` | src/memorymap/core/database.py:997 |
| `DatabaseManager` | src/memorymap/core/database.py:2260 |
| `DateTime` | src/memorymap/core/database.py:90 |
| `DerivedFact` | src/memorymap/core/database.py:1221 |
| `DerivedTension` | src/memorymap/core/database.py:1287 |
| `Document` | src/memorymap/core/database.py:1420 |
| `DocumentAiEdit` | src/memorymap/core/database.py:1474 |
| `DocumentBookmark` | src/memorymap/core/database.py:1134 |
| `DocumentLink` | src/memorymap/core/database.py:1451 |
| `DocumentRevision` | src/memorymap/core/database.py:1691 |
| `DurableJob` | src/memorymap/core/database.py:2008 |
| `EmbeddingRecord` | src/memorymap/core/database.py:865 |
| `Entity` | src/memorymap/core/database.py:536 |
| `EntityMention` | src/memorymap/core/database.py:576 |
| `Entry` | src/memorymap/core/database.py:309 |
| `EntryBookmark` | src/memorymap/core/database.py:1114 |
| `EntryDate` | src/memorymap/core/database.py:1398 |
| `EntryLink` | src/memorymap/core/database.py:691 |
| `EntryOpen` | src/memorymap/core/database.py:1377 |
| `EntryProperty` | src/memorymap/core/database.py:763 |
| `EntryRevision` | src/memorymap/core/database.py:1359 |
| `JobRun` | src/memorymap/core/database.py:1981 |
| `LinkProps` | src/memorymap/core/database.py:625 |
| `LinkReason` | src/memorymap/core/database.py:587 |
| `MediaUpload` | src/memorymap/core/database.py:1909 |
| `NightRun` | src/memorymap/core/database.py:1330 |
| `NoteScore` | src/memorymap/core/database.py:1191 |
| `NoteType` | src/memorymap/core/database.py:785 |
| `PageRead` | src/memorymap/core/database.py:1514 |
| `Recording` | src/memorymap/core/database.py:1649 |
| `RelationType` | src/memorymap/core/database.py:745 |
| `Reminder` | src/memorymap/core/database.py:1150 |
| `Space` | src/memorymap/core/database.py:131 |
| `StagedEmbedding` | src/memorymap/core/database.py:928 |
| `User` | src/memorymap/core/database.py:239 |
| `UserPreference` | src/memorymap/core/database.py:2051 |
| `Vault` | src/memorymap/core/database.py:250 |
| `WhiteboardNode` | src/memorymap/core/database.py:1733 |
| `WhiteboardObject` | src/memorymap/core/database.py:1792 |
| `WhiteboardSketch` | src/memorymap/core/database.py:1775 |
| `WorkspaceMixin` | src/memorymap/core/database.py:153 |
| `_add_workspace_filter` | src/memorymap/core/database.py:176 |
| `_ensure_alembic_baseline` | src/memorymap/core/database.py:2155 |
| `_hide_binned` | src/memorymap/core/database.py:215 |
| `_migrations_root` | src/memorymap/core/database.py:2120 |
| `_only_a_person_moves_a_boards_time` | src/memorymap/core/database.py:676 |
| `_safety_copy_before_migrating` | src/memorymap/core/database.py:2135 |
| `_set_workspace` | src/memorymap/core/database.py:230 |
| `_stamp_done_at` | src/memorymap/core/database.py:1184 |
| `like_escape` | src/memorymap/core/database.py:62 |
| `link_strength` | src/memorymap/core/database.py:842 |
| `utcnow` | src/memorymap/core/database.py:51 |
| `workspace_scoped_models` | src/memorymap/core/database.py:159 |

### src/memorymap/core/deps.py (26)

| Name | File:line |
|---|---|
| `MultipleWorkersError` | src/memorymap/core/deps.py:41 |
| `_embedding_model_in_use` | src/memorymap/core/deps.py:361 |
| `_init_app_state` | src/memorymap/core/deps.py:179 |
| `_requested_worker_count` | src/memorymap/core/deps.py:45 |
| `_reset_app_state` | src/memorymap/core/deps.py:261 |
| `build_llm_client` | src/memorymap/core/deps.py:115 |
| `clear_index_stale` | src/memorymap/core/deps.py:479 |
| `get_config` | src/memorymap/core/deps.py:311 |
| `get_db` | src/memorymap/core/deps.py:317 |
| `get_embeddings` | src/memorymap/core/deps.py:355 |
| `get_model_manager` | src/memorymap/core/deps.py:349 |
| `get_ollama` | src/memorymap/core/deps.py:338 |
| `get_or_404` | src/memorymap/core/deps.py:397 |
| `get_session` | src/memorymap/core/deps.py:372 |
| `impersonate_workspace` | src/memorymap/core/deps.py:489 |
| `index_stale_notes` | src/memorymap/core/deps.py:484 |
| `init_app_state` | src/memorymap/core/deps.py:173 |
| `mark_index_stale` | src/memorymap/core/deps.py:457 |
| `override_ai` | src/memorymap/core/deps.py:299 |
| `peek_db` | src/memorymap/core/deps.py:323 |
| `refuse_multiple_workers` | src/memorymap/core/deps.py:83 |
| `register_cache_reset` | src/memorymap/core/deps.py:249 |
| `reload_db` | src/memorymap/core/deps.py:225 |
| `reload_llm_client` | src/memorymap/core/deps.py:274 |
| `reset_app_state` | src/memorymap/core/deps.py:255 |
| `store_quietly` | src/memorymap/core/deps.py:423 |

### src/memorymap/core/desktop_dialog.py (2)

| Name | File:line |
|---|---|
| `documents_folder` | src/memorymap/core/desktop_dialog.py:24 |
| `save_dialog` | src/memorymap/core/desktop_dialog.py:31 |

### src/memorymap/core/diskspace.py (8)

| Name | File:line |
|---|---|
| `dir_bytes` | src/memorymap/core/diskspace.py:105 |
| `free_bytes` | src/memorymap/core/diskspace.py:64 |
| `has_room_for` | src/memorymap/core/diskspace.py:181 |
| `human_bytes` | src/memorymap/core/diskspace.py:167 |
| `out_of_space` | src/memorymap/core/diskspace.py:143 |
| `partial_write` | src/memorymap/core/diskspace.py:205 |
| `shortfall` | src/memorymap/core/diskspace.py:192 |
| `total_bytes` | src/memorymap/core/diskspace.py:82 |

### src/memorymap/core/docexport.py (8)

| Name | File:line |
|---|---|
| `Comment` | src/memorymap/core/docexport.py:43 |
| `_skip_mask` | src/memorymap/core/docexport.py:53 |
| `_stem` | src/memorymap/core/docexport.py:226 |
| `bundle` | src/memorymap/core/docexport.py:173 |
| `comments_to_footnotes` | src/memorymap/core/docexport.py:124 |
| `parse_comments` | src/memorymap/core/docexport.py:63 |
| `rewrite_media_links` | src/memorymap/core/docexport.py:153 |
| `strip_comments` | src/memorymap/core/docexport.py:96 |

### src/memorymap/core/docmeta.py (3)

| Name | File:line |
|---|---|
| `_split_key` | src/memorymap/core/docmeta.py:53 |
| `_unquote` | src/memorymap/core/docmeta.py:82 |
| `properties` | src/memorymap/core/docmeta.py:89 |

### src/memorymap/core/docview.py (14)

| Name | File:line |
|---|---|
| `ViewedFile` | src/memorymap/core/docview.py:136 |
| `_HtmlToMarkdown` | src/memorymap/core/docview.py:165 |
| `_clip` | src/memorymap/core/docview.py:588 |
| `_docx_list_kinds` | src/memorymap/core/docview.py:337 |
| `_docx_part` | src/memorymap/core/docview.py:325 |
| `_extract_converted` | src/memorymap/core/docview.py:697 |
| `_read_text_file` | src/memorymap/core/docview.py:594 |
| `docx_has_revisions` | src/memorymap/core/docview.py:358 |
| `docx_to_markdown` | src/memorymap/core/docview.py:370 |
| `editability` | src/memorymap/core/docview.py:616 |
| `extract` | src/memorymap/core/docview.py:668 |
| `html_to_markdown` | src/memorymap/core/docview.py:295 |
| `kind_for` | src/memorymap/core/docview.py:574 |
| `write_text_file` | src/memorymap/core/docview.py:653 |

### src/memorymap/core/egress.py (21)

| Name | File:line |
|---|---|
| `_caller` | src/memorymap/core/egress.py:151 |
| `_flush_job` | src/memorymap/core/egress.py:370 |
| `_flush_locked` | src/memorymap/core/egress.py:390 |
| `_hook` | src/memorymap/core/egress.py:204 |
| `_is_address` | src/memorymap/core/egress.py:143 |
| `_now_iso` | src/memorymap/core/egress.py:112 |
| `_read_ledger` | src/memorymap/core/egress.py:325 |
| `_record` | src/memorymap/core/egress.py:167 |
| `_row_out` | src/memorymap/core/egress.py:283 |
| `_schedule_flush` | src/memorymap/core/egress.py:349 |
| `configure` | src/memorymap/core/egress.py:336 |
| `destinations` | src/memorymap/core/egress.py:300 |
| `flush` | src/memorymap/core/egress.py:378 |
| `install` | src/memorymap/core/egress.py:238 |
| `installed` | src/memorymap/core/egress.py:257 |
| `recent` | src/memorymap/core/egress.py:307 |
| `reset` | src/memorymap/core/egress.py:261 |
| `scope_of` | src/memorymap/core/egress.py:116 |
| `since` | src/memorymap/core/egress.py:274 |
| `totals` | src/memorymap/core/egress.py:278 |
| `verdict` | src/memorymap/core/egress.py:316 |

### src/memorymap/core/embedfind.py (13)

| Name | File:line |
|---|---|
| `_has_weights` | src/memorymap/core/embedfind.py:69 |
| `_hub_rows` | src/memorymap/core/embedfind.py:87 |
| `_legacy_rows` | src/memorymap/core/embedfind.py:115 |
| `_lmstudio_roots` | src/memorymap/core/embedfind.py:53 |
| `_lmstudio_rows` | src/memorymap/core/embedfind.py:136 |
| `_needs_own_code` | src/memorymap/core/embedfind.py:79 |
| `_ollama_rows` | src/memorymap/core/embedfind.py:162 |
| `_row` | src/memorymap/core/embedfind.py:186 |
| `_sentence_transformers_home` | src/memorymap/core/embedfind.py:48 |
| `_snapshot` | src/memorymap/core/embedfind.py:60 |
| `found` | src/memorymap/core/embedfind.py:198 |
| `resolve` | src/memorymap/core/embedfind.py:216 |
| `usable_repo` | src/memorymap/core/embedfind.py:211 |

### src/memorymap/core/embedmodels.py (29)

| Name | File:line |
|---|---|
| `DownloadState` | src/memorymap/core/embedmodels.py:328 |
| `EmbedModel` | src/memorymap/core/embedmodels.py:47 |
| `OllamaEmbedModel` | src/memorymap/core/embedmodels.py:206 |
| `_begin_download` | src/memorymap/core/embedmodels.py:593 |
| `_dir_size` | src/memorymap/core/embedmodels.py:389 |
| `_human_size` | src/memorymap/core/embedmodels.py:405 |
| `_in_use` | src/memorymap/core/embedmodels.py:788 |
| `_log` | src/memorymap/core/embedmodels.py:475 |
| `_looks_like_a_dropped_connection` | src/memorymap/core/embedmodels.py:509 |
| `_model_dir` | src/memorymap/core/embedmodels.py:369 |
| `_run_download` | src/memorymap/core/embedmodels.py:513 |
| `_spawn_download` | src/memorymap/core/embedmodels.py:609 |
| `cache_root` | src/memorymap/core/embedmodels.py:351 |
| `can_download` | src/memorymap/core/embedmodels.py:413 |
| `cancel` | src/memorymap/core/embedmodels.py:453 |
| `catalogue` | src/memorymap/core/embedmodels.py:268 |
| `current` | src/memorymap/core/embedmodels.py:449 |
| `hub_metadata` | src/memorymap/core/embedmodels.py:642 |
| `hub_refusal` | src/memorymap/core/embedmodels.py:672 |
| `is_downloaded` | src/memorymap/core/embedmodels.py:377 |
| `parse_typed_name` | src/memorymap/core/embedmodels.py:626 |
| `prefix_for` | src/memorymap/core/embedmodels.py:262 |
| `remove` | src/memorymap/core/embedmodels.py:727 |
| `reset_for_tests` | src/memorymap/core/embedmodels.py:795 |
| `resolve_choice` | src/memorymap/core/embedmodels.py:317 |
| `set_in_use_check` | src/memorymap/core/embedmodels.py:783 |
| `start` | src/memorymap/core/embedmodels.py:577 |
| `start_typed` | src/memorymap/core/embedmodels.py:699 |
| `status` | src/memorymap/core/embedmodels.py:424 |

### src/memorymap/core/embedswitch.py (17)

| Name | File:line |
|---|---|
| `SwitchState` | src/memorymap/core/embedswitch.py:49 |
| `_Stopped` | src/memorymap/core/embedswitch.py:173 |
| `_begin` | src/memorymap/core/embedswitch.py:151 |
| `_check_stop` | src/memorymap/core/embedswitch.py:225 |
| `_drop_staged` | src/memorymap/core/embedswitch.py:373 |
| `_end` | src/memorymap/core/embedswitch.py:217 |
| `_naive` | src/memorymap/core/embedswitch.py:369 |
| `_prepare` | src/memorymap/core/embedswitch.py:230 |
| `_stage` | src/memorymap/core/embedswitch.py:250 |
| `_swap` | src/memorymap/core/embedswitch.py:295 |
| `cancel` | src/memorymap/core/embedswitch.py:165 |
| `label_for` | src/memorymap/core/embedswitch.py:87 |
| `reset_for_tests` | src/memorymap/core/embedswitch.py:389 |
| `run` | src/memorymap/core/embedswitch.py:177 |
| `start` | src/memorymap/core/embedswitch.py:122 |
| `status` | src/memorymap/core/embedswitch.py:71 |
| `task_row` | src/memorymap/core/embedswitch.py:98 |

### src/memorymap/core/events.py (31)

| Name | File:line |
|---|---|
| `_Write` | src/memorymap/core/events.py:161 |
| `_compact_one` | src/memorymap/core/events.py:522 |
| `_fold` | src/memorymap/core/events.py:182 |
| `_readable_now` | src/memorymap/core/events.py:742 |
| `_session_of` | src/memorymap/core/events.py:306 |
| `_state_upto` | src/memorymap/core/events.py:510 |
| `_undone_ids` | src/memorymap/core/events.py:731 |
| `acting_as` | src/memorymap/core/events.py:80 |
| `agent_actor` | src/memorymap/core/events.py:116 |
| `agent_name` | src/memorymap/core/events.py:111 |
| `as_agent` | src/memorymap/core/events.py:127 |
| `board_state` | src/memorymap/core/events.py:704 |
| `changed` | src/memorymap/core/events.py:714 |
| `compact` | src/memorymap/core/events.py:548 |
| `current_actor` | src/memorymap/core/events.py:74 |
| `current_agent` | src/memorymap/core/events.py:121 |
| `entry_state` | src/memorymap/core/events.py:620 |
| `events_for` | src/memorymap/core/events.py:316 |
| `is_compacted` | src/memorymap/core/events.py:477 |
| `node_state` | src/memorymap/core/events.py:655 |
| `object_state` | src/memorymap/core/events.py:685 |
| `payload_bytes` | src/memorymap/core/events.py:591 |
| `record` | src/memorymap/core/events.py:197 |
| `replay` | src/memorymap/core/events.py:344 |
| `sketch_state` | src/memorymap/core/events.py:673 |
| `snapshot_span` | src/memorymap/core/events.py:488 |
| `states_at` | src/memorymap/core/events.py:364 |
| `suppressed` | src/memorymap/core/events.py:144 |
| `tags_of` | src/memorymap/core/events.py:606 |
| `undo` | src/memorymap/core/events.py:758 |
| `writes` | src/memorymap/core/events.py:253 |

### src/memorymap/core/extra_downloads.py (20)

| Name | File:line |
|---|---|
| `Download` | src/memorymap/core/extra_downloads.py:77 |
| `DownloadFailed` | src/memorymap/core/extra_downloads.py:240 |
| `_check_engine` | src/memorymap/core/extra_downloads.py:323 |
| `_fetch` | src/memorymap/core/extra_downloads.py:295 |
| `_is_musl` | src/memorymap/core/extra_downloads.py:126 |
| `_mb` | src/memorymap/core/extra_downloads.py:291 |
| `_open_url` | src/memorymap/core/extra_downloads.py:233 |
| `_unpack` | src/memorymap/core/extra_downloads.py:341 |
| `downloads_for` | src/memorymap/core/extra_downloads.py:143 |
| `effective_url` | src/memorymap/core/extra_downloads.py:225 |
| `folder` | src/memorymap/core/extra_downloads.py:192 |
| `install` | src/memorymap/core/extra_downloads.py:382 |
| `is_installed` | src/memorymap/core/extra_downloads.py:196 |
| `platform_key` | src/memorymap/core/extra_downloads.py:107 |
| `platform_reason` | src/memorymap/core/extra_downloads.py:149 |
| `reason` | src/memorymap/core/extra_downloads.py:285 |
| `root_dir` | src/memorymap/core/extra_downloads.py:184 |
| `source` | src/memorymap/core/extra_downloads.py:209 |
| `uninstall` | src/memorymap/core/extra_downloads.py:423 |
| `url_allowed` | src/memorymap/core/extra_downloads.py:165 |

### src/memorymap/core/extras.py (54)

| Name | File:line |
|---|---|
| `BulkState` | src/memorymap/core/extras.py:915 |
| `Bundle` | src/memorymap/core/extras.py:791 |
| `Extra` | src/memorymap/core/extras.py:334 |
| `InstallState` | src/memorymap/core/extras.py:867 |
| `_busy` | src/memorymap/core/extras.py:1610 |
| `_canonical` | src/memorymap/core/extras.py:1166 |
| `_claim` | src/memorymap/core/extras.py:1598 |
| `_constraints_copy` | src/memorymap/core/extras.py:1340 |
| `_dispatch` | src/memorymap/core/extras.py:1616 |
| `_extra_size` | src/memorymap/core/extras.py:768 |
| `_finish_bulk` | src/memorymap/core/extras.py:1837 |
| `_forget_footprints` | src/memorymap/core/extras.py:1076 |
| `_frozen_target_args` | src/memorymap/core/extras.py:258 |
| `_install_refusal` | src/memorymap/core/extras.py:1672 |
| `_installed_snapshot` | src/memorymap/core/extras.py:1358 |
| `_interpreter_behind` | src/memorymap/core/extras.py:194 |
| `_loaded_in_process_reason` | src/memorymap/core/extras.py:1873 |
| `_pip_base_command` | src/memorymap/core/extras.py:315 |
| `_pip_platforms` | src/memorymap/core/extras.py:279 |
| `_pip_reason` | src/memorymap/core/extras.py:101 |
| `_python_candidates` | src/memorymap/core/extras.py:170 |
| `_read_footprint` | src/memorymap/core/extras.py:1046 |
| `_remove_from_frozen_target` | src/memorymap/core/extras.py:1171 |
| `_requirement_name` | src/memorymap/core/extras.py:1160 |
| `_requirements_path` | src/memorymap/core/extras.py:1326 |
| `_roll_back` | src/memorymap/core/extras.py:1369 |
| `_run_bulk` | src/memorymap/core/extras.py:1761 |
| `_run_bulk_item` | src/memorymap/core/extras.py:1791 |
| `_run_download_install` | src/memorymap/core/extras.py:1542 |
| `_run_download_uninstall` | src/memorymap/core/extras.py:1584 |
| `_run_install` | src/memorymap/core/extras.py:1401 |
| `_run_single` | src/memorymap/core/extras.py:1637 |
| `_run_uninstall` | src/memorymap/core/extras.py:1238 |
| `_status_row` | src/memorymap/core/extras.py:993 |
| `activate_frozen_extras` | src/memorymap/core/extras.py:244 |
| `bulk` | src/memorymap/core/extras.py:1095 |
| `bulk_label` | src/memorymap/core/extras.py:1755 |
| `bulk_status` | src/memorymap/core/extras.py:1080 |
| `bundles` | src/memorymap/core/extras.py:1015 |
| `cancel` | src/memorymap/core/extras.py:1114 |
| `current` | src/memorymap/core/extras.py:1110 |
| `download_mb` | src/memorymap/core/extras.py:777 |
| `download_ready` | src/memorymap/core/extras.py:1950 |
| `find_system_python` | src/memorymap/core/extras.py:132 |
| `footprint` | src/memorymap/core/extras.py:1023 |
| `frozen_extras_dir` | src/memorymap/core/extras.py:222 |
| `install_blocking` | src/memorymap/core/extras.py:1923 |
| `is_installed` | src/memorymap/core/extras.py:946 |
| `remove` | src/memorymap/core/extras.py:1685 |
| `reset_for_tests` | src/memorymap/core/extras.py:1914 |
| `start` | src/memorymap/core/extras.py:1644 |
| `start_bulk` | src/memorymap/core/extras.py:1707 |
| `status` | src/memorymap/core/extras.py:974 |
| `unavailable_reason` | src/memorymap/core/extras.py:1099 |

### src/memorymap/core/filejobs.py (2)

| Name | File:line |
|---|---|
| `reading` | src/memorymap/core/filejobs.py:51 |
| `running` | src/memorymap/core/filejobs.py:77 |

### src/memorymap/core/filetypes.py (4)

| Name | File:line |
|---|---|
| `FileType` | src/memorymap/core/filetypes.py:33 |
| `as_dicts` | src/memorymap/core/filetypes.py:150 |
| `get` | src/memorymap/core/filetypes.py:145 |
| `normalise` | src/memorymap/core/filetypes.py:127 |

### src/memorymap/core/first_password.py (2)

| Name | File:line |
|---|---|
| `seed` | src/memorymap/core/first_password.py:27 |
| `take_from_env` | src/memorymap/core/first_password.py:19 |

### src/memorymap/core/hardware.py (3)

| Name | File:line |
|---|---|
| `_windows_total` | src/memorymap/core/hardware.py:43 |
| `total_memory_bytes` | src/memorymap/core/hardware.py:20 |
| `total_memory_gb` | src/memorymap/core/hardware.py:68 |

### src/memorymap/core/imagesize.py (2)

| Name | File:line |
|---|---|
| `_size` | src/memorymap/core/imagesize.py:30 |
| `image_size` | src/memorymap/core/imagesize.py:17 |

### src/memorymap/core/instance_lock.py (20)

| Name | File:line |
|---|---|
| `LockInfo` | src/memorymap/core/instance_lock.py:57 |
| `_opener` | src/memorymap/core/instance_lock.py:196 |
| `answers` | src/memorymap/core/instance_lock.py:203 |
| `claim` | src/memorymap/core/instance_lock.py:273 |
| `classify` | src/memorymap/core/instance_lock.py:106 |
| `current_token` | src/memorymap/core/instance_lock.py:301 |
| `data_dir_id` | src/memorymap/core/instance_lock.py:164 |
| `decide` | src/memorymap/core/instance_lock.py:117 |
| `find_running` | src/memorymap/core/instance_lock.py:213 |
| `focus` | src/memorymap/core/instance_lock.py:310 |
| `lock_path` | src/memorymap/core/instance_lock.py:64 |
| `new_lock` | src/memorymap/core/instance_lock.py:68 |
| `pid_alive` | src/memorymap/core/instance_lock.py:126 |
| `read_lock` | src/memorymap/core/instance_lock.py:77 |
| `release` | src/memorymap/core/instance_lock.py:285 |
| `request_focus` | src/memorymap/core/instance_lock.py:244 |
| `served_data_dir_id` | src/memorymap/core/instance_lock.py:182 |
| `set_focus_handler` | src/memorymap/core/instance_lock.py:305 |
| `wait_until_answering` | src/memorymap/core/instance_lock.py:235 |
| `write_lock` | src/memorymap/core/instance_lock.py:98 |

### src/memorymap/core/jobruns.py (14)

| Name | File:line |
|---|---|
| `Run` | src/memorymap/core/jobruns.py:157 |
| `_clip` | src/memorymap/core/jobruns.py:84 |
| `_database` | src/memorymap/core/jobruns.py:117 |
| `_failure_reason` | src/memorymap/core/jobruns.py:89 |
| `begin` | src/memorymap/core/jobruns.py:326 |
| `current` | src/memorymap/core/jobruns.py:145 |
| `describe_night_pass` | src/memorymap/core/jobruns.py:452 |
| `job_run` | src/memorymap/core/jobruns.py:336 |
| `last_runs` | src/memorymap/core/jobruns.py:410 |
| `live` | src/memorymap/core/jobruns.py:138 |
| `mark_interrupted` | src/memorymap/core/jobruns.py:383 |
| `note_finished` | src/memorymap/core/jobruns.py:355 |
| `peek_database` | src/memorymap/core/jobruns.py:121 |
| `set_database_source` | src/memorymap/core/jobruns.py:110 |

### src/memorymap/core/jobs.py (11)

| Name | File:line |
|---|---|
| `Pool` | src/memorymap/core/jobs.py:206 |
| `_Job` | src/memorymap/core/jobs.py:172 |
| `_cpu_width` | src/memorymap/core/jobs.py:65 |
| `_start_heartbeat` | src/memorymap/core/jobs.py:144 |
| `enqueue` | src/memorymap/core/jobs.py:532 |
| `forget` | src/memorymap/core/jobs.py:551 |
| `pending` | src/memorymap/core/jobs.py:543 |
| `pool` | src/memorymap/core/jobs.py:518 |
| `resubmit` | src/memorymap/core/jobs.py:547 |
| `resume` | src/memorymap/core/jobs.py:559 |
| `shutdown` | src/memorymap/core/jobs.py:574 |

### src/memorymap/core/jobstore.py (35)

| Name | File:line |
|---|---|
| `NotDurable` | src/memorymap/core/jobstore.py:152 |
| `_as_key` | src/memorymap/core/jobstore.py:174 |
| `_beat` | src/memorymap/core/jobstore.py:444 |
| `_changed` | src/memorymap/core/jobstore.py:136 |
| `_clip` | src/memorymap/core/jobstore.py:111 |
| `_database` | src/memorymap/core/jobstore.py:116 |
| `_decode` | src/memorymap/core/jobstore.py:166 |
| `_dotted` | src/memorymap/core/jobstore.py:202 |
| `_encode` | src/memorymap/core/jobstore.py:156 |
| `_fail_unrun` | src/memorymap/core/jobstore.py:602 |
| `_hold` | src/memorymap/core/jobstore.py:426 |
| `_iso` | src/memorymap/core/jobstore.py:652 |
| `_now` | src/memorymap/core/jobstore.py:107 |
| `_release` | src/memorymap/core/jobstore.py:434 |
| `_schedule` | src/memorymap/core/jobstore.py:580 |
| `cancel` | src/memorymap/core/jobstore.py:344 |
| `cancel_queued` | src/memorymap/core/jobstore.py:378 |
| `decode_payload` | src/memorymap/core/jobstore.py:186 |
| `durable_kind` | src/memorymap/core/jobstore.py:206 |
| `encode_payload` | src/memorymap/core/jobstore.py:182 |
| `finish` | src/memorymap/core/jobstore.py:292 |
| `held` | src/memorymap/core/jobstore.py:439 |
| `lease` | src/memorymap/core/jobstore.py:254 |
| `list_jobs` | src/memorymap/core/jobstore.py:656 |
| `peek_db` | src/memorymap/core/jobstore.py:125 |
| `prune` | src/memorymap/core/jobstore.py:620 |
| `record` | src/memorymap/core/jobstore.py:228 |
| `register` | src/memorymap/core/jobstore.py:196 |
| `renew` | src/memorymap/core/jobstore.py:459 |
| `resolve` | src/memorymap/core/jobstore.py:213 |
| `resume` | src/memorymap/core/jobstore.py:486 |
| `set_forget` | src/memorymap/core/jobstore.py:408 |
| `stop` | src/memorymap/core/jobstore.py:593 |
| `supersede` | src/memorymap/core/jobstore.py:321 |
| `version` | src/memorymap/core/jobstore.py:142 |

### src/memorymap/core/lancert.py (16)

| Name | File:line |
|---|---|
| `CertInfo` | src/memorymap/core/lancert.py:48 |
| `_fingerprint` | src/memorymap/core/lancert.py:93 |
| `_norm` | src/memorymap/core/lancert.py:197 |
| `_not_after` | src/memorymap/core/lancert.py:112 |
| `_now` | src/memorymap/core/lancert.py:64 |
| `_private` | src/memorymap/core/lancert.py:119 |
| `_san_names` | src/memorymap/core/lancert.py:100 |
| `_write_private` | src/memorymap/core/lancert.py:124 |
| `default_names` | src/memorymap/core/lancert.py:73 |
| `ensure` | src/memorymap/core/lancert.py:211 |
| `generate` | src/memorymap/core/lancert.py:146 |
| `missing_names` | src/memorymap/core/lancert.py:205 |
| `paths` | src/memorymap/core/lancert.py:68 |
| `read` | src/memorymap/core/lancert.py:132 |
| `reload` | src/memorymap/core/lancert.py:241 |
| `set_live_context` | src/memorymap/core/lancert.py:236 |

### src/memorymap/core/launch_status.py (7)

| Name | File:line |
|---|---|
| `Step` | src/memorymap/core/launch_status.py:42 |
| `latest` | src/memorymap/core/launch_status.py:122 |
| `parse` | src/memorymap/core/launch_status.py:95 |
| `parse_line` | src/memorymap/core/launch_status.py:60 |
| `percent` | src/memorymap/core/launch_status.py:140 |
| `read_file` | src/memorymap/core/launch_status.py:105 |
| `summarise` | src/memorymap/core/launch_status.py:127 |

### src/memorymap/core/logbuffer.py (15)

| Name | File:line |
|---|---|
| `BufferHandler` | src/memorymap/core/logbuffer.py:114 |
| `NoiseFilter` | src/memorymap/core/logbuffer.py:62 |
| `QueryScrubFilter` | src/memorymap/core/logbuffer.py:227 |
| `TokenScrubFilter` | src/memorymap/core/logbuffer.py:156 |
| `_assign_seq` | src/memorymap/core/logbuffer.py:44 |
| `_scrub_query_string` | src/memorymap/core/logbuffer.py:206 |
| `clear` | src/memorymap/core/logbuffer.py:334 |
| `install` | src/memorymap/core/logbuffer.py:253 |
| `latest_seq` | src/memorymap/core/logbuffer.py:304 |
| `recent` | src/memorymap/core/logbuffer.py:283 |
| `safe_value` | src/memorymap/core/logbuffer.py:96 |
| `sanitise` | src/memorymap/core/logbuffer.py:84 |
| `scrub_query_strings` | src/memorymap/core/logbuffer.py:216 |
| `since` | src/memorymap/core/logbuffer.py:290 |
| `stats` | src/memorymap/core/logbuffer.py:314 |

### src/memorymap/core/lookahead.py (1)

| Name | File:line |
|---|---|
| `Ahead` | src/memorymap/core/lookahead.py:18 |

### src/memorymap/core/media_gc.py (7)

| Name | File:line |
|---|---|
| `_conversation_referenced_ids` | src/memorymap/core/media_gc.py:112 |
| `_could_name_a_file` | src/memorymap/core/media_gc.py:46 |
| `_referenced_filenames` | src/memorymap/core/media_gc.py:63 |
| `delete_orphaned_media` | src/memorymap/core/media_gc.py:237 |
| `find_orphaned_media` | src/memorymap/core/media_gc.py:219 |
| `referenced_names` | src/memorymap/core/media_gc.py:37 |
| `usage_map` | src/memorymap/core/media_gc.py:138 |

### src/memorymap/core/media_process.py (5)

| Name | File:line |
|---|---|
| `_module` | src/memorymap/core/media_process.py:36 |
| `media_text_for` | src/memorymap/core/media_process.py:124 |
| `process_committed_upload` | src/memorymap/core/media_process.py:51 |
| `process_committed_upload_ids` | src/memorymap/core/media_process.py:106 |
| `process_referenced_uploads` | src/memorymap/core/media_process.py:92 |

### src/memorymap/core/model_gate.py (3)

| Name | File:line |
|---|---|
| `busy` | src/memorymap/core/model_gate.py:47 |
| `interactive` | src/memorymap/core/model_gate.py:34 |
| `yield_to_interactive` | src/memorymap/core/model_gate.py:53 |

### src/memorymap/core/native_imports.py (11)

| Name | File:line |
|---|---|
| `NotANativeLibrary` | src/memorymap/core/native_imports.py:36 |
| `_cstr` | src/memorymap/core/native_imports.py:94 |
| `_elf` | src/memorymap/core/native_imports.py:104 |
| `_fat` | src/memorymap/core/native_imports.py:277 |
| `_macho` | src/memorymap/core/native_imports.py:247 |
| `_pe` | src/memorymap/core/native_imports.py:170 |
| `is_network_library` | src/memorymap/core/native_imports.py:89 |
| `is_network_symbol` | src/memorymap/core/native_imports.py:82 |
| `network_calls` | src/memorymap/core/native_imports.py:312 |
| `normalise` | src/memorymap/core/native_imports.py:72 |
| `read_imports` | src/memorymap/core/native_imports.py:297 |

### src/memorymap/core/netbind.py (21)

| Name | File:line |
|---|---|
| `_own_names` | src/memorymap/core/netbind.py:215 |
| `_proc_v6_addresses` | src/memorymap/core/netbind.py:261 |
| `_usable_v6` | src/memorymap/core/netbind.py:243 |
| `arrived_on_loopback` | src/memorymap/core/netbind.py:179 |
| `arrived_on_socket` | src/memorymap/core/netbind.py:202 |
| `bind_host` | src/memorymap/core/netbind.py:130 |
| `current` | src/memorymap/core/netbind.py:171 |
| `describe` | src/memorymap/core/netbind.py:338 |
| `dual_stack` | src/memorymap/core/netbind.py:120 |
| `env_bind` | src/memorymap/core/netbind.py:84 |
| `explicit_bind` | src/memorymap/core/netbind.py:105 |
| `host_allowed` | src/memorymap/core/netbind.py:224 |
| `is_loopback_bind` | src/memorymap/core/netbind.py:175 |
| `lan_addresses` | src/memorymap/core/netbind.py:279 |
| `lan_enabled` | src/memorymap/core/netbind.py:113 |
| `lan_port` | src/memorymap/core/netbind.py:58 |
| `listening_socket` | src/memorymap/core/netbind.py:141 |
| `set_current` | src/memorymap/core/netbind.py:165 |
| `set_explicit_bind` | src/memorymap/core/netbind.py:99 |
| `set_lan_port` | src/memorymap/core/netbind.py:67 |
| `url_host` | src/memorymap/core/netbind.py:160 |

### src/memorymap/core/ocr.py (37)

| Name | File:line |
|---|---|
| `_adopt_tesseract` | src/memorymap/core/ocr.py:136 |
| `_extra_size` | src/memorymap/core/ocr.py:620 |
| `_image_size` | src/memorymap/core/ocr.py:467 |
| `_language_kwargs` | src/memorymap/core/ocr.py:324 |
| `_line_words` | src/memorymap/core/ocr.py:865 |
| `_log_binary_missing` | src/memorymap/core/ocr.py:656 |
| `_log_package_missing` | src/memorymap/core/ocr.py:670 |
| `_one_thread_for_tesseract` | src/memorymap/core/ocr.py:641 |
| `_probe_windows_tesseract` | src/memorymap/core/ocr.py:107 |
| `_rapidocr_lines` | src/memorymap/core/ocr.py:425 |
| `_rapidocr_reader` | src/memorymap/core/ocr.py:411 |
| `_rapidocr_regions` | src/memorymap/core/ocr.py:490 |
| `_rapidocr_text` | src/memorymap/core/ocr.py:462 |
| `_reading_block_kind` | src/memorymap/core/ocr.py:936 |
| `_registry_tesseract_dir` | src/memorymap/core/ocr.py:75 |
| `_word_box` | src/memorymap/core/ocr.py:852 |
| `attempt_binary_install` | src/memorymap/core/ocr.py:1065 |
| `clear_language_cache` | src/memorymap/core/ocr.py:251 |
| `effective_language` | src/memorymap/core/ocr.py:311 |
| `engine` | src/memorymap/core/ocr.py:378 |
| `engine_name` | src/memorymap/core/ocr.py:396 |
| `engine_status` | src/memorymap/core/ocr.py:561 |
| `extra_size` | src/memorymap/core/ocr.py:612 |
| `extract_and_store` | src/memorymap/core/ocr.py:974 |
| `extract_in_background` | src/memorymap/core/ocr.py:1023 |
| `extract_regions` | src/memorymap/core/ocr.py:734 |
| `extract_text` | src/memorymap/core/ocr.py:679 |
| `installed_languages` | src/memorymap/core/ocr.py:213 |
| `local_available` | src/memorymap/core/ocr.py:404 |
| `packages_available` | src/memorymap/core/ocr.py:331 |
| `rapidocr_available` | src/memorymap/core/ocr.py:361 |
| `regions_from_reading` | src/memorymap/core/ocr.py:888 |
| `saved_language` | src/memorymap/core/ocr.py:280 |
| `set_language` | src/memorymap/core/ocr.py:290 |
| `tesseract_available` | src/memorymap/core/ocr.py:165 |
| `tesseract_version` | src/memorymap/core/ocr.py:257 |
| `unavailable_reason` | src/memorymap/core/ocr.py:624 |

### src/memorymap/core/passes.py (19)

| Name | File:line |
|---|---|
| `_backfill` | src/memorymap/core/passes.py:135 |
| `_backup` | src/memorymap/core/passes.py:111 |
| `_compact_history` | src/memorymap/core/passes.py:168 |
| `_label` | src/memorymap/core/passes.py:40 |
| `_maintenance` | src/memorymap/core/passes.py:176 |
| `_night_shift` | src/memorymap/core/passes.py:100 |
| `_purge_bin` | src/memorymap/core/passes.py:164 |
| `_resurface` | src/memorymap/core/passes.py:121 |
| `_run` | src/memorymap/core/passes.py:205 |
| `_run_housekeeping` | src/memorymap/core/passes.py:157 |
| `kind_for_label` | src/memorymap/core/passes.py:258 |
| `overview` | src/memorymap/core/passes.py:68 |
| `register_housekeeping` | src/memorymap/core/passes.py:152 |
| `reset_for_tests` | src/memorymap/core/passes.py:263 |
| `run_now` | src/memorymap/core/passes.py:215 |
| `running` | src/memorymap/core/passes.py:76 |
| `schedule` | src/memorymap/core/passes.py:46 |
| `stop` | src/memorymap/core/passes.py:243 |
| `stop_requested` | src/memorymap/core/passes.py:91 |

### src/memorymap/core/password_reset.py (3)

| Name | File:line |
|---|---|
| `ResetOutcome` | src/memorymap/core/password_reset.py:35 |
| `private_note_count` | src/memorymap/core/password_reset.py:43 |
| `reset_password` | src/memorymap/core/password_reset.py:52 |

### src/memorymap/core/pdfpages.py (5)

| Name | File:line |
|---|---|
| `_render_one` | src/memorymap/core/pdfpages.py:117 |
| `available` | src/memorymap/core/pdfpages.py:78 |
| `page_count` | src/memorymap/core/pdfpages.py:92 |
| `render_page` | src/memorymap/core/pdfpages.py:192 |
| `render_pages` | src/memorymap/core/pdfpages.py:147 |

### src/memorymap/core/privacy_http.py (3)

| Name | File:line |
|---|---|
| `PinnedAdapter` | src/memorymap/core/privacy_http.py:101 |
| `pin_url` | src/memorymap/core/privacy_http.py:79 |
| `strip_tracking` | src/memorymap/core/privacy_http.py:55 |

### src/memorymap/core/quit_hook.py (2)

| Name | File:line |
|---|---|
| `request_quit` | src/memorymap/core/quit_hook.py:35 |
| `set_quit_handler` | src/memorymap/core/quit_hook.py:29 |

### src/memorymap/core/reading_bin.py (9)

| Name | File:line |
|---|---|
| `_label` | src/memorymap/core/reading_bin.py:27 |
| `_owner` | src/memorymap/core/reading_bin.py:22 |
| `bin_field` | src/memorymap/core/reading_bin.py:62 |
| `bin_page` | src/memorymap/core/reading_bin.py:33 |
| `binned` | src/memorymap/core/reading_bin.py:125 |
| `empty` | src/memorymap/core/reading_bin.py:139 |
| `purge` | src/memorymap/core/reading_bin.py:130 |
| `purge_expired` | src/memorymap/core/reading_bin.py:144 |
| `restore` | src/memorymap/core/reading_bin.py:91 |

### src/memorymap/core/readings.py (4)

| Name | File:line |
|---|---|
| `_columns` | src/memorymap/core/readings.py:35 |
| `ensure_view` | src/memorymap/core/readings.py:63 |
| `for_file` | src/memorymap/core/readings.py:77 |
| `text_of` | src/memorymap/core/readings.py:96 |

### src/memorymap/core/recordings.py (14)

| Name | File:line |
|---|---|
| `_binned` | src/memorymap/core/recordings.py:126 |
| `as_dict` | src/memorymap/core/recordings.py:87 |
| `binned` | src/memorymap/core/recordings.py:143 |
| `clean_markers` | src/memorymap/core/recordings.py:80 |
| `clean_peaks` | src/memorymap/core/recordings.py:75 |
| `container` | src/memorymap/core/recordings.py:44 |
| `directory` | src/memorymap/core/recordings.py:61 |
| `empty` | src/memorymap/core/recordings.py:154 |
| `matches` | src/memorymap/core/recordings.py:56 |
| `new_filename` | src/memorymap/core/recordings.py:67 |
| `path_of` | src/memorymap/core/recordings.py:71 |
| `purge` | src/memorymap/core/recordings.py:148 |
| `purge_expired` | src/memorymap/core/recordings.py:162 |
| `recover_stale` | src/memorymap/core/recordings.py:104 |

### src/memorymap/core/security.py (24)

| Name | File:line |
|---|---|
| `BodyCapMiddleware` | src/memorymap/core/security.py:190 |
| `CspForPage` | src/memorymap/core/security.py:507 |
| `HostCheckMiddleware` | src/memorymap/core/security.py:93 |
| `OriginCheckMiddleware` | src/memorymap/core/security.py:303 |
| `SecurityHeadersMiddleware` | src/memorymap/core/security.py:555 |
| `UnsafeUrl` | src/memorymap/core/security.py:847 |
| `_BodyTooLarge` | src/memorymap/core/security.py:181 |
| `_backend_addresses` | src/memorymap/core/security.py:661 |
| `_body_limit` | src/memorymap/core/security.py:260 |
| `_is_same_site` | src/memorymap/core/security.py:58 |
| `_notebook_has_password` | src/memorymap/core/security.py:291 |
| `_origin_of` | src/memorymap/core/security.py:44 |
| `_refuses` | src/memorymap/core/security.py:725 |
| `_resolve` | src/memorymap/core/security.py:653 |
| `_session_is_live` | src/memorymap/core/security.py:286 |
| `_too_large` | src/memorymap/core/security.py:252 |
| `assert_public_url` | src/memorymap/core/security.py:908 |
| `build_csp` | src/memorymap/core/security.py:437 |
| `check_backend_url` | src/memorymap/core/security.py:755 |
| `inline_script_hashes` | src/memorymap/core/security.py:413 |
| `is_internal_address` | src/memorymap/core/security.py:851 |
| `public_addresses` | src/memorymap/core/security.py:875 |
| `register_auth` | src/memorymap/core/security.py:281 |
| `without_userinfo` | src/memorymap/core/security.py:80 |

### src/memorymap/core/startup_status.py (2)

| Name | File:line |
|---|---|
| `get_phase` | src/memorymap/core/startup_status.py:33 |
| `set_phase` | src/memorymap/core/startup_status.py:27 |

### src/memorymap/core/syntaxcheck.py (8)

| Name | File:line |
|---|---|
| `_diag` | src/memorymap/core/syntaxcheck.py:67 |
| `_python` | src/memorymap/core/syntaxcheck.py:79 |
| `_toml` | src/memorymap/core/syntaxcheck.py:97 |
| `_xml` | src/memorymap/core/syntaxcheck.py:110 |
| `_yaml` | src/memorymap/core/syntaxcheck.py:132 |
| `check` | src/memorymap/core/syntaxcheck.py:152 |
| `languages` | src/memorymap/core/syntaxcheck.py:59 |
| `yaml_available` | src/memorymap/core/syntaxcheck.py:51 |

### src/memorymap/core/taskhistory.py (5)

| Name | File:line |
|---|---|
| `_percentile` | src/memorymap/core/taskhistory.py:140 |
| `clear` | src/memorymap/core/taskhistory.py:134 |
| `latency_percentiles` | src/memorymap/core/taskhistory.py:150 |
| `recent` | src/memorymap/core/taskhistory.py:128 |
| `record` | src/memorymap/core/taskhistory.py:70 |

### src/memorymap/core/usage.py (5)

| Name | File:line |
|---|---|
| `_path` | src/memorymap/core/usage.py:38 |
| `clear` | src/memorymap/core/usage.py:86 |
| `read` | src/memorymap/core/usage.py:42 |
| `record` | src/memorymap/core/usage.py:50 |
| `summary` | src/memorymap/core/usage.py:70 |

### src/memorymap/core/vault.py (20)

| Name | File:line |
|---|---|
| `_loaded` | src/memorymap/core/vault.py:63 |
| `_row` | src/memorymap/core/vault.py:144 |
| `close` | src/memorymap/core/vault.py:137 |
| `create` | src/memorymap/core/vault.py:152 |
| `exists` | src/memorymap/core/vault.py:148 |
| `grant` | src/memorymap/core/vault.py:101 |
| `has_recovery` | src/memorymap/core/vault.py:235 |
| `is_granted` | src/memorymap/core/vault.py:107 |
| `is_open` | src/memorymap/core/vault.py:68 |
| `issue_recovery` | src/memorymap/core/vault.py:245 |
| `key` | src/memorymap/core/vault.py:74 |
| `open_with` | src/memorymap/core/vault.py:170 |
| `open_with_recovery` | src/memorymap/core/vault.py:262 |
| `recovery_created_at` | src/memorymap/core/vault.py:240 |
| `request_scope` | src/memorymap/core/vault.py:128 |
| `revoke` | src/memorymap/core/vault.py:111 |
| `revoke_all` | src/memorymap/core/vault.py:121 |
| `rewrap` | src/memorymap/core/vault.py:204 |
| `rewrap_with` | src/memorymap/core/vault.py:276 |
| `set_key` | src/memorymap/core/vault.py:191 |

### src/memorymap/core/webclip.py (17)

| Name | File:line |
|---|---|
| `ClipRefused` | src/memorymap/core/webclip.py:56 |
| `_Markdown` | src/memorymap/core/webclip.py:324 |
| `_Node` | src/memorymap/core/webclip.py:180 |
| `_Tree` | src/memorymap/core/webclip.py:190 |
| `_descendants` | src/memorymap/core/webclip.py:409 |
| `_link_text` | src/memorymap/core/webclip.py:258 |
| `_main` | src/memorymap/core/webclip.py:280 |
| `_new_session` | src/memorymap/core/webclip.py:67 |
| `_read` | src/memorymap/core/webclip.py:418 |
| `_safe_href` | src/memorymap/core/webclip.py:309 |
| `_score` | src/memorymap/core/webclip.py:266 |
| `_score_deep` | src/memorymap/core/webclip.py:305 |
| `_text` | src/memorymap/core/webclip.py:252 |
| `clean_url` | src/memorymap/core/webclip.py:77 |
| `extract` | src/memorymap/core/webclip.py:431 |
| `fetch_page` | src/memorymap/core/webclip.py:81 |
| `note_content` | src/memorymap/core/webclip.py:458 |

### src/memorymap/core/window_hook.py (4)

| Name | File:line |
|---|---|
| `available` | src/memorymap/core/window_hook.py:41 |
| `is_fullscreen` | src/memorymap/core/window_hook.py:45 |
| `set_fullscreen_handler` | src/memorymap/core/window_hook.py:33 |
| `toggle` | src/memorymap/core/window_hook.py:49 |

### src/memorymap/entry/app_import.py (26)

| Name | File:line |
|---|---|
| `Imported` | src/memorymap/entry/app_import.py:70 |
| `ReadResult` | src/memorymap/entry/app_import.py:86 |
| `TooBig` | src/memorymap/entry/app_import.py:94 |
| `_absolute_day` | src/memorymap/entry/app_import.py:405 |
| `_already_here` | src/memorymap/entry/app_import.py:455 |
| `_enex_time` | src/memorymap/entry/app_import.py:277 |
| `_enml` | src/memorymap/entry/app_import.py:287 |
| `_html_body` | src/memorymap/entry/app_import.py:172 |
| `_make` | src/memorymap/entry/app_import.py:470 |
| `_max_file` | src/memorymap/entry/app_import.py:374 |
| `_notion_links` | src/memorymap/entry/app_import.py:189 |
| `_notion_name` | src/memorymap/entry/app_import.py:181 |
| `_read_expanded` | src/memorymap/entry/app_import.py:380 |
| `_text` | src/memorymap/entry/app_import.py:144 |
| `_title_from_body` | src/memorymap/entry/app_import.py:153 |
| `_with_title` | src/memorymap/entry/app_import.py:161 |
| `expand` | src/memorymap/entry/app_import.py:101 |
| `people_and_places` | src/memorymap/entry/app_import.py:435 |
| `read` | src/memorymap/entry/app_import.py:362 |
| `read_apple` | src/memorymap/entry/app_import.py:342 |
| `read_evernote` | src/memorymap/entry/app_import.py:303 |
| `read_notion` | src/memorymap/entry/app_import.py:203 |
| `read_obsidian` | src/memorymap/entry/app_import.py:240 |
| `source_key` | src/memorymap/entry/app_import.py:450 |
| `write` | src/memorymap/entry/app_import.py:492 |
| `written_on` | src/memorymap/entry/app_import.py:423 |

### src/memorymap/entry/bin.py (6)

| Name | File:line |
|---|---|
| `_purge` | src/memorymap/entry/bin.py:96 |
| `binned` | src/memorymap/entry/bin.py:78 |
| `empty` | src/memorymap/entry/bin.py:104 |
| `including_binned` | src/memorymap/entry/bin.py:43 |
| `purge_document` | src/memorymap/entry/bin.py:56 |
| `purge_expired` | src/memorymap/entry/bin.py:119 |

### src/memorymap/entry/duplicates.py (10)

| Name | File:line |
|---|---|
| `_prefix_work` | src/memorymap/entry/duplicates.py:150 |
| `_prepare` | src/memorymap/entry/duplicates.py:52 |
| `_scan` | src/memorymap/entry/duplicates.py:224 |
| `_score` | src/memorymap/entry/duplicates.py:64 |
| `_similar_pairs` | src/memorymap/entry/duplicates.py:82 |
| `_similar_pairs_dense` | src/memorymap/entry/duplicates.py:169 |
| `_word_set` | src/memorymap/entry/duplicates.py:48 |
| `find_duplicates` | src/memorymap/entry/duplicates.py:245 |
| `normalise` | src/memorymap/entry/duplicates.py:43 |
| `similarity` | src/memorymap/entry/duplicates.py:73 |

### src/memorymap/entry/export_folder.py (53)

| Name | File:line |
|---|---|
| `ExportResult` | src/memorymap/entry/export_folder.py:336 |
| `Progress` | src/memorymap/entry/export_folder.py:760 |
| `_Parts` | src/memorymap/entry/export_folder.py:446 |
| `_Related` | src/memorymap/entry/export_folder.py:166 |
| `_attachment_names` | src/memorymap/entry/export_folder.py:137 |
| `_attachment_record` | src/memorymap/entry/export_folder.py:150 |
| `_categories` | src/memorymap/entry/export_folder.py:342 |
| `_categories_in` | src/memorymap/entry/export_folder.py:748 |
| `_decoded` | src/memorymap/entry/export_folder.py:411 |
| `_documents_in` | src/memorymap/entry/export_folder.py:545 |
| `_existing_documents` | src/memorymap/entry/export_folder.py:713 |
| `_existing_notes` | src/memorymap/entry/export_folder.py:587 |
| `_fingerprint` | src/memorymap/entry/export_folder.py:582 |
| `_from_markdown` | src/memorymap/entry/export_folder.py:491 |
| `_front_matter` | src/memorymap/entry/export_folder.py:272 |
| `_group` | src/memorymap/entry/export_folder.py:471 |
| `_grouped` | src/memorymap/entry/export_folder.py:177 |
| `_hang_canvas` | src/memorymap/entry/export_folder.py:659 |
| `_hang_links` | src/memorymap/entry/export_folder.py:642 |
| `_imported` | src/memorymap/entry/export_folder.py:525 |
| `_iso` | src/memorymap/entry/export_folder.py:69 |
| `_json` | src/memorymap/entry/export_folder.py:418 |
| `_keep_updated` | src/memorymap/entry/export_folder.py:688 |
| `_link_record` | src/memorymap/entry/export_folder.py:157 |
| `_make_entry` | src/memorymap/entry/export_folder.py:607 |
| `_note_base` | src/memorymap/entry/export_folder.py:301 |
| `_note_record` | src/memorymap/entry/export_folder.py:502 |
| `_parsed` | src/memorymap/entry/export_folder.py:82 |
| `_place` | src/memorymap/entry/export_folder.py:454 |
| `_prefix` | src/memorymap/entry/export_folder.py:427 |
| `_readable` | src/memorymap/entry/export_folder.py:124 |
| `_related` | src/memorymap/entry/export_folder.py:184 |
| `_reminder_record` | src/memorymap/entry/export_folder.py:161 |
| `_restore` | src/memorymap/entry/export_folder.py:92 |
| `_row` | src/memorymap/entry/export_folder.py:73 |
| `_safe_name` | src/memorymap/entry/export_folder.py:105 |
| `_second_pass` | src/memorymap/entry/export_folder.py:701 |
| `_sha1_file` | src/memorymap/entry/export_folder.py:111 |
| `_slug` | src/memorymap/entry/export_folder.py:99 |
| `_stored_names` | src/memorymap/entry/export_folder.py:326 |
| `_strip_attachments` | src/memorymap/entry/export_folder.py:440 |
| `_write_attachments` | src/memorymap/entry/export_folder.py:625 |
| `_write_documents` | src/memorymap/entry/export_folder.py:351 |
| `_write_documents_in` | src/memorymap/entry/export_folder.py:721 |
| `_write_note` | src/memorymap/entry/export_folder.py:307 |
| `board_canvas` | src/memorymap/entry/export_folder.py:225 |
| `document_record` | src/memorymap/entry/export_folder.py:218 |
| `export` | src/memorymap/entry/export_folder.py:366 |
| `note_markdown` | src/memorymap/entry/export_folder.py:292 |
| `note_record` | src/memorymap/entry/export_folder.py:200 |
| `read` | src/memorymap/entry/export_folder.py:557 |
| `snapshot` | src/memorymap/entry/export_folder.py:249 |
| `write` | src/memorymap/entry/export_folder.py:768 |

### src/memorymap/entry/highlights.py (2)

| Name | File:line |
|---|---|
| `has_highlight` | src/memorymap/entry/highlights.py:25 |
| `passages` | src/memorymap/entry/highlights.py:29 |

### src/memorymap/entry/import_report.py (6)

| Name | File:line |
|---|---|
| `_inside` | src/memorymap/entry/import_report.py:71 |
| `_item` | src/memorymap/entry/import_report.py:31 |
| `build` | src/memorymap/entry/import_report.py:37 |
| `folder` | src/memorymap/entry/import_report.py:27 |
| `load` | src/memorymap/entry/import_report.py:81 |
| `save` | src/memorymap/entry/import_report.py:58 |

### src/memorymap/entry/importer.py (3)

| Name | File:line |
|---|---|
| `convert_to_markdown` | src/memorymap/entry/importer.py:31 |
| `markitdown_available` | src/memorymap/entry/importer.py:27 |
| `split_into_sections` | src/memorymap/entry/importer.py:42 |

### src/memorymap/entry/link_facts.py (7)

| Name | File:line |
|---|---|
| `_live` | src/memorymap/entry/link_facts.py:32 |
| `_scope_key` | src/memorymap/entry/link_facts.py:28 |
| `_tags` | src/memorymap/entry/link_facts.py:36 |
| `counts` | src/memorymap/entry/link_facts.py:76 |
| `forget` | src/memorymap/entry/link_facts.py:93 |
| `notes` | src/memorymap/entry/link_facts.py:44 |
| `reason_for` | src/memorymap/entry/link_facts.py:99 |

### src/memorymap/entry/link_wording.py (15)

| Name | File:line |
|---|---|
| `Counts` | src/memorymap/entry/link_wording.py:165 |
| `PairNote` | src/memorymap/entry/link_wording.py:106 |
| `_and` | src/memorymap/entry/link_wording.py:238 |
| `_at_start` | src/memorymap/entry/link_wording.py:133 |
| `_close_in_time` | src/memorymap/entry/link_wording.py:279 |
| `_mentions` | src/memorymap/entry/link_wording.py:212 |
| `_names` | src/memorymap/entry/link_wording.py:142 |
| `_shared_names` | src/memorymap/entry/link_wording.py:242 |
| `_shared_tags` | src/memorymap/entry/link_wording.py:228 |
| `_shared_words` | src/memorymap/entry/link_wording.py:266 |
| `is_generic` | src/memorymap/entry/link_wording.py:198 |
| `specific_reason` | src/memorymap/entry/link_wording.py:294 |
| `strength_word` | src/memorymap/entry/link_wording.py:191 |
| `title` | src/memorymap/entry/link_wording.py:203 |
| `tokens` | src/memorymap/entry/link_wording.py:118 |

### src/memorymap/entry/manager.py (134)

| Name | File:line |
|---|---|
| `_TagCache` | src/memorymap/entry/manager.py:1503 |
| `_board_type_of` | src/memorymap/entry/manager.py:1042 |
| `_deduce_reason` | src/memorymap/entry/manager.py:1777 |
| `_encrypt_history` | src/memorymap/entry/manager.py:2819 |
| `_ensure_tag_cache_reset_registered` | src/memorymap/entry/manager.py:1543 |
| `_first_content_line` | src/memorymap/entry/manager.py:2679 |
| `_hard_delete` | src/memorymap/entry/manager.py:1076 |
| `_heading_text` | src/memorymap/entry/manager.py:2558 |
| `_ids_in` | src/memorymap/entry/manager.py:2980 |
| `_json_list` | src/memorymap/entry/manager.py:2994 |
| `_links_of` | src/memorymap/entry/manager.py:2850 |
| `_list_entries_filter` | src/memorymap/entry/manager.py:312 |
| `_md_links` | src/memorymap/entry/manager.py:2582 |
| `_quotes` | src/memorymap/entry/manager.py:2976 |
| `_reassign` | src/memorymap/entry/manager.py:2487 |
| `_redact_answers_quoting` | src/memorymap/entry/manager.py:3002 |
| `_redact_link_audit` | src/memorymap/entry/manager.py:1889 |
| `_restale_category_vectors` | src/memorymap/entry/manager.py:2400 |
| `_retag` | src/memorymap/entry/manager.py:1629 |
| `_retag_entry` | src/memorymap/entry/manager.py:1608 |
| `_seal_link_reasons` | src/memorymap/entry/manager.py:2860 |
| `_seal_props` | src/memorymap/entry/manager.py:1860 |
| `_seal_reason` | src/memorymap/entry/manager.py:1833 |
| `_set_stored_props` | src/memorymap/entry/manager.py:1872 |
| `_set_stored_reason` | src/memorymap/entry/manager.py:1847 |
| `_shares_a_date` | src/memorymap/entry/manager.py:1748 |
| `_split_block` | src/memorymap/entry/manager.py:2688 |
| `_tag_fingerprint` | src/memorymap/entry/manager.py:1521 |
| `_touches_private` | src/memorymap/entry/manager.py:1880 |
| `_unseal_link_reasons` | src/memorymap/entry/manager.py:2879 |
| `_update_entry_fields` | src/memorymap/entry/manager.py:612 |
| `_wiki_name_pattern` | src/memorymap/entry/manager.py:3349 |
| `_word_runs` | src/memorymap/entry/manager.py:2971 |
| `add_attachment` | src/memorymap/entry/manager.py:1341 |
| `all_categories` | src/memorymap/entry/manager.py:2350 |
| `all_tags` | src/memorymap/entry/manager.py:1568 |
| `apply_audited_reason` | src/memorymap/entry/manager.py:2255 |
| `apply_title` | src/memorymap/entry/manager.py:2697 |
| `archive_entry` | src/memorymap/entry/manager.py:985 |
| `attachments_for` | src/memorymap/entry/manager.py:1363 |
| `attachments_for_entries_bulk` | src/memorymap/entry/manager.py:1373 |
| `backfill_link_reasons` | src/memorymap/entry/manager.py:2057 |
| `board_type_of` | src/memorymap/entry/manager.py:1015 |
| `bulk_category_names` | src/memorymap/entry/manager.py:2320 |
| `came_from_outside` | src/memorymap/entry/manager.py:2498 |
| `category_name_for` | src/memorymap/entry/manager.py:2312 |
| `category_space` | src/memorymap/entry/manager.py:124 |
| `content_for_entry` | src/memorymap/entry/manager.py:2803 |
| `count_archived_entries` | src/memorymap/entry/manager.py:493 |
| `count_deleted_entries` | src/memorymap/entry/manager.py:470 |
| `count_entries` | src/memorymap/entry/manager.py:386 |
| `create_entry` | src/memorymap/entry/manager.py:258 |
| `create_link` | src/memorymap/entry/manager.py:1924 |
| `delete_attachment` | src/memorymap/entry/manager.py:1398 |
| `delete_category` | src/memorymap/entry/manager.py:2463 |
| `delete_link` | src/memorymap/entry/manager.py:2277 |
| `delete_tag` | src/memorymap/entry/manager.py:1693 |
| `document_came_from_outside` | src/memorymap/entry/manager.py:2511 |
| `documents_for_entries_bulk` | src/memorymap/entry/manager.py:871 |
| `documents_for_entry` | src/memorymap/entry/manager.py:857 |
| `edit_tags_on_notes` | src/memorymap/entry/manager.py:1698 |
| `empty_recycle_bin` | src/memorymap/entry/manager.py:1292 |
| `entries_for_document` | src/memorymap/entry/manager.py:935 |
| `entry_dates` | src/memorymap/entry/manager.py:665 |
| `entry_dates_bulk` | src/memorymap/entry/manager.py:676 |
| `entry_id_scope` | src/memorymap/entry/manager.py:403 |
| `entry_space` | src/memorymap/entry/manager.py:143 |
| `entry_tags` | src/memorymap/entry/manager.py:2342 |
| `extract_title` | src/memorymap/entry/manager.py:2660 |
| `find_by_wiki_name` | src/memorymap/entry/manager.py:3207 |
| `forget_relation_types` | src/memorymap/entry/manager.py:2176 |
| `get_entry` | src/memorymap/entry/manager.py:501 |
| `get_or_create_category` | src/memorymap/entry/manager.py:148 |
| `is_link_type` | src/memorymap/entry/manager.py:2180 |
| `is_two_way_link` | src/memorymap/entry/manager.py:2225 |
| `join_blocks` | src/memorymap/entry/manager.py:2755 |
| `link_document` | src/memorymap/entry/manager.py:815 |
| `links_for_entries_bulk` | src/memorymap/entry/manager.py:894 |
| `links_for_entry` | src/memorymap/entry/manager.py:2289 |
| `list_archived_entries` | src/memorymap/entry/manager.py:476 |
| `list_deleted_entries` | src/memorymap/entry/manager.py:456 |
| `list_entries` | src/memorymap/entry/manager.py:335 |
| `list_sort_key` | src/memorymap/entry/manager.py:381 |
| `log_action` | src/memorymap/entry/manager.py:91 |
| `mark_edited` | src/memorymap/entry/manager.py:213 |
| `most_accessed_entries` | src/memorymap/entry/manager.py:439 |
| `plain_label` | src/memorymap/entry/manager.py:2615 |
| `purge_entries` | src/memorymap/entry/manager.py:1258 |
| `purge_expired_deleted` | src/memorymap/entry/manager.py:1310 |
| `readable_content` | src/memorymap/entry/manager.py:2537 |
| `record_dates` | src/memorymap/entry/manager.py:735 |
| `record_filing` | src/memorymap/entry/manager.py:530 |
| `record_revision` | src/memorymap/entry/manager.py:3478 |
| `reindex_properties` | src/memorymap/entry/manager.py:700 |
| `rekey_private_extras` | src/memorymap/entry/manager.py:2892 |
| `relation_label` | src/memorymap/entry/manager.py:2187 |
| `relation_types` | src/memorymap/entry/manager.py:2141 |
| `remove_link` | src/memorymap/entry/manager.py:2092 |
| `remove_tags` | src/memorymap/entry/manager.py:1684 |
| `remove_title` | src/memorymap/entry/manager.py:2713 |
| `rename_attachment` | src/memorymap/entry/manager.py:1467 |
| `rename_category` | src/memorymap/entry/manager.py:2420 |
| `rename_tag` | src/memorymap/entry/manager.py:1678 |
| `rename_tags` | src/memorymap/entry/manager.py:1650 |
| `reset_tag_cache` | src/memorymap/entry/manager.py:1537 |
| `resolve_links_to` | src/memorymap/entry/manager.py:3291 |
| `restore_entry` | src/memorymap/entry/manager.py:967 |
| `review_queue_count` | src/memorymap/entry/manager.py:66 |
| `revisions_for` | src/memorymap/entry/manager.py:3515 |
| `rewrite_wiki_name` | src/memorymap/entry/manager.py:3370 |
| `scrub_private_leftovers` | src/memorymap/entry/manager.py:3134 |
| `seal_private_events` | src/memorymap/entry/manager.py:1053 |
| `seed_example_notes` | src/memorymap/entry/manager.py:3442 |
| `set_category` | src/memorymap/entry/manager.py:226 |
| `set_link_props` | src/memorymap/entry/manager.py:2199 |
| `set_link_reason` | src/memorymap/entry/manager.py:2119 |
| `set_link_two_way` | src/memorymap/entry/manager.py:2210 |
| `set_link_type` | src/memorymap/entry/manager.py:2235 |
| `set_private` | src/memorymap/entry/manager.py:3060 |
| `soft_delete_entry` | src/memorymap/entry/manager.py:949 |
| `strip_inline_markdown` | src/memorymap/entry/manager.py:2793 |
| `sync_wiki_links` | src/memorymap/entry/manager.py:3315 |
| `tags_from_json` | src/memorymap/entry/manager.py:2331 |
| `unarchive_entry` | src/memorymap/entry/manager.py:1002 |
| `undo_tag_edit` | src/memorymap/entry/manager.py:1721 |
| `unlink_document` | src/memorymap/entry/manager.py:838 |
| `update_entry` | src/memorymap/entry/manager.py:561 |
| `validate_attachment_filename` | src/memorymap/entry/manager.py:1426 |
| `wiki_holders` | src/memorymap/entry/manager.py:3354 |
| `wiki_link_targets` | src/memorymap/entry/manager.py:3193 |
| `wiki_opening` | src/memorymap/entry/manager.py:3282 |
| `wiki_plain` | src/memorymap/entry/manager.py:3188 |
| `wiki_shown` | src/memorymap/entry/manager.py:3182 |
| `wiki_target` | src/memorymap/entry/manager.py:3171 |

### src/memorymap/entry/meetings.py (15)

| Name | File:line |
|---|---|
| `_body_offset` | src/memorymap/entry/meetings.py:142 |
| `_clean` | src/memorymap/entry/meetings.py:96 |
| `_is_placeholder` | src/memorymap/entry/meetings.py:234 |
| `_section_of` | src/memorymap/entry/meetings.py:138 |
| `_sections` | src/memorymap/entry/meetings.py:151 |
| `action_items` | src/memorymap/entry/meetings.py:175 |
| `append_to_section` | src/memorymap/entry/meetings.py:243 |
| `attendees` | src/memorymap/entry/meetings.py:274 |
| `compose` | src/memorymap/entry/meetings.py:100 |
| `is_meeting` | src/memorymap/entry/meetings.py:129 |
| `meeting_date` | src/memorymap/entry/meetings.py:268 |
| `reminder_text` | src/memorymap/entry/meetings.py:279 |
| `section_items` | src/memorymap/entry/meetings.py:204 |
| `section_text` | src/memorymap/entry/meetings.py:224 |
| `strip_cite` | src/memorymap/entry/meetings.py:171 |

### src/memorymap/entry/mentions.py (3)

| Name | File:line |
|---|---|
| `backlink_rows` | src/memorymap/entry/mentions.py:127 |
| `backlink_spans` | src/memorymap/entry/mentions.py:99 |
| `sentence_around` | src/memorymap/entry/mentions.py:37 |

### src/memorymap/entry/opens.py (1)

| Name | File:line |
|---|---|
| `record_open` | src/memorymap/entry/opens.py:18 |

### src/memorymap/entry/paths.py (16)

| Name | File:line |
|---|---|
| `Cluster` | src/memorymap/entry/paths.py:489 |
| `Connections` | src/memorymap/entry/paths.py:108 |
| `Step` | src/memorymap/entry/paths.py:80 |
| `_connect` | src/memorymap/entry/paths.py:197 |
| `_dijkstra` | src/memorymap/entry/paths.py:287 |
| `_entry_tags` | src/memorymap/entry/paths.py:94 |
| `_route_key` | src/memorymap/entry/paths.py:434 |
| `build` | src/memorymap/entry/paths.py:137 |
| `build_light` | src/memorymap/entry/paths.py:167 |
| `clusters` | src/memorymap/entry/paths.py:500 |
| `degree` | src/memorymap/entry/paths.py:439 |
| `find` | src/memorymap/entry/paths.py:276 |
| `find_many` | src/memorymap/entry/paths.py:357 |
| `hubs` | src/memorymap/entry/paths.py:544 |
| `orphans` | src/memorymap/entry/paths.py:558 |
| `pagerank` | src/memorymap/entry/paths.py:465 |

### src/memorymap/entry/properties.py (10)

| Name | File:line |
|---|---|
| `_line` | src/memorymap/entry/properties.py:81 |
| `_scalar` | src/memorymap/entry/properties.py:70 |
| `block_end` | src/memorymap/entry/properties.py:33 |
| `ensure_builtin_types` | src/memorymap/entry/properties.py:121 |
| `find_type` | src/memorymap/entry/properties.py:138 |
| `note_type` | src/memorymap/entry/properties.py:65 |
| `split` | src/memorymap/entry/properties.py:51 |
| `strip` | src/memorymap/entry/properties.py:59 |
| `with_type_fields` | src/memorymap/entry/properties.py:144 |
| `write` | src/memorymap/entry/properties.py:88 |

### src/memorymap/entry/query.py (10)

| Name | File:line |
|---|---|
| `Term` | src/memorymap/entry/query.py:51 |
| `_ids_for` | src/memorymap/entry/query.py:132 |
| `_number` | src/memorymap/entry/query.py:97 |
| `_prop_ids` | src/memorymap/entry/query.py:104 |
| `_split_compare` | src/memorymap/entry/query.py:40 |
| `_unwrap` | src/memorymap/entry/query.py:59 |
| `is_structural` | src/memorymap/entry/query.py:93 |
| `parse` | src/memorymap/entry/query.py:68 |
| `rollups` | src/memorymap/entry/query.py:201 |
| `run` | src/memorymap/entry/query.py:175 |

### src/memorymap/entry/staleness.py (1)

| Name | File:line |
|---|---|
| `find_stale_orphaned_notes` | src/memorymap/entry/staleness.py:28 |

### src/memorymap/entry/tagnames.py (2)

| Name | File:line |
|---|---|
| `inline_tags` | src/memorymap/entry/tagnames.py:69 |
| `normalise_tags` | src/memorymap/entry/tagnames.py:23 |

### src/memorymap/entry/tidy.py (59)

| Name | File:line |
|---|---|
| `Review` | src/memorymap/entry/tidy.py:78 |
| `_actor_words` | src/memorymap/entry/tidy.py:314 |
| `_apply_bin` | src/memorymap/entry/tidy.py:857 |
| `_apply_done` | src/memorymap/entry/tidy.py:868 |
| `_apply_link_reasons` | src/memorymap/entry/tidy.py:724 |
| `_apply_merge_categories` | src/memorymap/entry/tidy.py:813 |
| `_apply_merge_notes` | src/memorymap/entry/tidy.py:786 |
| `_apply_merge_tags` | src/memorymap/entry/tidy.py:760 |
| `_apply_move` | src/memorymap/entry/tidy.py:775 |
| `_apply_remove_tags` | src/memorymap/entry/tidy.py:750 |
| `_apply_rename_categories` | src/memorymap/entry/tidy.py:842 |
| `_apply_unlink` | src/memorymap/entry/tidy.py:735 |
| `_auto_added` | src/memorymap/entry/tidy.py:284 |
| `_category_ids` | src/memorymap/entry/tidy.py:429 |
| `_count_duplicates` | src/memorymap/entry/tidy.py:655 |
| `_count_uncategorised` | src/memorymap/entry/tidy.py:557 |
| `_generic_links` | src/memorymap/entry/tidy.py:236 |
| `_id_number` | src/memorymap/entry/tidy.py:720 |
| `_live_entries` | src/memorymap/entry/tidy.py:217 |
| `_log` | src/memorymap/entry/tidy.py:909 |
| `_meaning_centroids` | src/memorymap/entry/tidy.py:435 |
| `_percent` | src/memorymap/entry/tidy.py:228 |
| `_row` | src/memorymap/entry/tidy.py:232 |
| `_rows_auto_tags` | src/memorymap/entry/tidy.py:324 |
| `_rows_category_names` | src/memorymap/entry/tidy.py:531 |
| `_rows_duplicates` | src/memorymap/entry/tidy.py:570 |
| `_rows_link_reasons` | src/memorymap/entry/tidy.py:258 |
| `_rows_lookalike_tags` | src/memorymap/entry/tidy.py:375 |
| `_rows_rare_tags` | src/memorymap/entry/tidy.py:365 |
| `_rows_short_notes` | src/memorymap/entry/tidy.py:588 |
| `_rows_similar_categories` | src/memorymap/entry/tidy.py:470 |
| `_rows_stale_reminders` | src/memorymap/entry/tidy.py:611 |
| `_rows_uncategorised` | src/memorymap/entry/tidy.py:391 |
| `_rows_weak_links` | src/memorymap/entry/tidy.py:274 |
| `_strength_detail` | src/memorymap/entry/tidy.py:250 |
| `_tag_counts` | src/memorymap/entry/tidy.py:355 |
| `_tags` | src/memorymap/entry/tidy.py:207 |
| `_title` | src/memorymap/entry/tidy.py:211 |
| `_top_topics` | src/memorymap/entry/tidy.py:465 |
| `_touched_entry_ids` | src/memorymap/entry/tidy.py:917 |
| `_undo_payload` | src/memorymap/entry/tidy.py:967 |
| `apply` | src/memorymap/entry/tidy.py:940 |
| `auto_settings` | src/memorymap/entry/tidy.py:1069 |
| `dismiss` | src/memorymap/entry/tidy.py:694 |
| `dismissed_ids` | src/memorymap/entry/tidy.py:688 |
| `history` | src/memorymap/entry/tidy.py:1044 |
| `is_running` | src/memorymap/entry/tidy.py:1152 |
| `is_short` | src/memorymap/entry/tidy.py:185 |
| `lookalike_groups` | src/memorymap/entry/tidy.py:171 |
| `lookalike_key` | src/memorymap/entry/tidy.py:159 |
| `request_stop` | src/memorymap/entry/tidy.py:1145 |
| `respecify_all` | src/memorymap/entry/tidy.py:1156 |
| `rows` | src/memorymap/entry/tidy.py:675 |
| `run_automatic` | src/memorymap/entry/tidy.py:1112 |
| `set_auto` | src/memorymap/entry/tidy.py:1074 |
| `summary` | src/memorymap/entry/tidy.py:1086 |
| `tag_fit` | src/memorymap/entry/tidy.py:194 |
| `undismiss` | src/memorymap/entry/tidy.py:708 |
| `undo` | src/memorymap/entry/tidy.py:1025 |

### src/memorymap/entry/timewords.py (9)

| Name | File:line |
|---|---|
| `Mention` | src/memorymap/entry/timewords.py:62 |
| `_add_months` | src/memorymap/entry/timewords.py:77 |
| `_clock` | src/memorymap/entry/timewords.py:186 |
| `_count` | src/memorymap/entry/timewords.py:88 |
| `_monday` | src/memorymap/entry/timewords.py:73 |
| `_offset` | src/memorymap/entry/timewords.py:143 |
| `_weekday` | src/memorymap/entry/timewords.py:151 |
| `_with_clock` | src/memorymap/entry/timewords.py:211 |
| `find` | src/memorymap/entry/timewords.py:232 |

### src/memorymap/entry/topics.py (7)

| Name | File:line |
|---|---|
| `_display` | src/memorymap/entry/topics.py:74 |
| `apply_names` | src/memorymap/entry/topics.py:163 |
| `build` | src/memorymap/entry/topics.py:78 |
| `detect` | src/memorymap/entry/topics.py:44 |
| `overlap` | src/memorymap/entry/topics.py:159 |
| `store_name` | src/memorymap/entry/topics.py:186 |
| `terms_sentence` | src/memorymap/entry/topics.py:127 |

### src/memorymap/mcp_server.py (8)

| Name | File:line |
|---|---|
| `_annotations` | src/memorymap/mcp_server.py:82 |
| `_call_tool` | src/memorymap/mcp_server.py:119 |
| `_clean_label` | src/memorymap/mcp_server.py:105 |
| `_is_read_only` | src/memorymap/mcp_server.py:78 |
| `_tool_list_payload` | src/memorymap/mcp_server.py:90 |
| `handle_request` | src/memorymap/mcp_server.py:140 |
| `offered_tools` | src/memorymap/mcp_server.py:56 |
| `serve` | src/memorymap/mcp_server.py:188 |

### src/memorymap/search/chunks.py (18)

| Name | File:line |
|---|---|
| `Best` | src/memorymap/search/chunks.py:261 |
| `_Chunks` | src/memorymap/search/chunks.py:58 |
| `_append` | src/memorymap/search/chunks.py:99 |
| `_compact` | src/memorymap/search/chunks.py:163 |
| `_fetch` | src/memorymap/search/chunks.py:125 |
| `_fingerprint` | src/memorymap/search/chunks.py:78 |
| `_forget` | src/memorymap/search/chunks.py:153 |
| `_key` | src/memorymap/search/chunks.py:83 |
| `_scores` | src/memorymap/search/chunks.py:244 |
| `_unit_rows` | src/memorymap/search/chunks.py:87 |
| `_valid_rows` | src/memorymap/search/chunks.py:212 |
| `best_paragraphs` | src/memorymap/search/chunks.py:270 |
| `current` | src/memorymap/search/chunks.py:172 |
| `lift` | src/memorymap/search/chunks.py:317 |
| `meaning_scorer` | src/memorymap/search/chunks.py:388 |
| `paragraphs_of` | src/memorymap/search/chunks.py:353 |
| `reset` | src/memorymap/search/chunks.py:374 |
| `stats` | src/memorymap/search/chunks.py:381 |

### src/memorymap/search/engine.py (44)

| Name | File:line |
|---|---|
| `Hit` | src/memorymap/search/engine.py:99 |
| `_Matrix` | src/memorymap/search/engine.py:146 |
| `_backend_id` | src/memorymap/search/engine.py:491 |
| `_candidates` | src/memorymap/search/engine.py:749 |
| `_compact` | src/memorymap/search/engine.py:654 |
| `_cosine_scores` | src/memorymap/search/engine.py:1338 |
| `_explain` | src/memorymap/search/engine.py:929 |
| `_filter_only` | src/memorymap/search/engine.py:790 |
| `_flag_filters` | src/memorymap/search/engine.py:988 |
| `_forget` | src/memorymap/search/engine.py:616 |
| `_forget_from` | src/memorymap/search/engine.py:625 |
| `_has_attachment_ids` | src/memorymap/search/engine.py:995 |
| `_has_ids` | src/memorymap/search/engine.py:1025 |
| `_hops_from` | src/memorymap/search/engine.py:869 |
| `_keep_matrix_in_step` | src/memorymap/search/engine.py:529 |
| `_keyword_pass` | src/memorymap/search/engine.py:843 |
| `_live_matrix` | src/memorymap/search/engine.py:514 |
| `_load_all_vectors` | src/memorymap/search/engine.py:274 |
| `_match_expression` | src/memorymap/search/engine.py:672 |
| `_matrix_key` | src/memorymap/search/engine.py:244 |
| `_mentions` | src/memorymap/search/engine.py:835 |
| `_normalised_bm25` | src/memorymap/search/engine.py:913 |
| `_put` | src/memorymap/search/engine.py:570 |
| `_reconcile` | src/memorymap/search/engine.py:425 |
| `_remember` | src/memorymap/search/engine.py:551 |
| `_row_has` | src/memorymap/search/engine.py:1061 |
| `_row_ids` | src/memorymap/search/engine.py:264 |
| `_session_space` | src/memorymap/search/engine.py:731 |
| `_snippet` | src/memorymap/search/engine.py:968 |
| `_space_clause` | src/memorymap/search/engine.py:711 |
| `_table_fingerprint` | src/memorymap/search/engine.py:249 |
| `_unit` | src/memorymap/search/engine.py:335 |
| `_with_meaning` | src/memorymap/search/engine.py:1245 |
| `cached_similar_pairs` | src/memorymap/search/engine.py:1452 |
| `current_matrix` | src/memorymap/search/engine.py:364 |
| `forget_vector` | src/memorymap/search/engine.py:602 |
| `index_counts` | src/memorymap/search/engine.py:667 |
| `related` | src/memorymap/search/engine.py:1382 |
| `rows_for` | src/memorymap/search/engine.py:399 |
| `search` | src/memorymap/search/engine.py:1085 |
| `stats` | src/memorymap/search/engine.py:1498 |
| `vector_view` | src/memorymap/search/engine.py:471 |
| `vectors_by_id` | src/memorymap/search/engine.py:1406 |
| `warm_vectors` | src/memorymap/search/engine.py:342 |

### src/memorymap/search/index.py (35)

| Name | File:line |
|---|---|
| `Row` | src/memorymap/search/index.py:121 |
| `Source` | src/memorymap/search/index.py:138 |
| `UnknownSource` | src/memorymap/search/index.py:159 |
| `_ask_turn_row` | src/memorymap/search/index.py:898 |
| `_attachment_row` | src/memorymap/search/index.py:801 |
| `_board_words` | src/memorymap/search/index.py:572 |
| `_boards_touched_by_objects` | src/memorymap/search/index.py:330 |
| `_bookmark_row` | src/memorymap/search/index.py:838 |
| `_conversation_row` | src/memorymap/search/index.py:867 |
| `_document_row` | src/memorymap/search/index.py:786 |
| `_entry_kind` | src/memorymap/search/index.py:552 |
| `_entry_row` | src/memorymap/search/index.py:602 |
| `_first_line` | src/memorymap/search/index.py:526 |
| `_index_on_flush` | src/memorymap/search/index.py:284 |
| `_media_row` | src/memorymap/search/index.py:823 |
| `_register_all` | src/memorymap/search/index.py:654 |
| `_reminder_row` | src/memorymap/search/index.py:852 |
| `_rowid` | src/memorymap/search/index.py:229 |
| `_scan_entries` | src/memorymap/search/index.py:640 |
| `_table_missing` | src/memorymap/search/index.py:265 |
| `_tagstext` | src/memorymap/search/index.py:536 |
| `_write` | src/memorymap/search/index.py:233 |
| `_written` | src/memorymap/search/index.py:544 |
| `counts` | src/memorymap/search/index.py:505 |
| `ensure_table` | src/memorymap/search/index.py:208 |
| `forget` | src/memorymap/search/index.py:432 |
| `last_rebuild` | src/memorymap/search/index.py:470 |
| `rebuild` | src/memorymap/search/index.py:474 |
| `reconcile_boards` | src/memorymap/search/index.py:376 |
| `reconcile_sources` | src/memorymap/search/index.py:917 |
| `register` | src/memorymap/search/index.py:163 |
| `source_for` | src/memorymap/search/index.py:180 |
| `sources` | src/memorymap/search/index.py:197 |
| `sources_for_kind` | src/memorymap/search/index.py:201 |
| `touch` | src/memorymap/search/index.py:416 |

### src/memorymap/search/query.py (11)

| Name | File:line |
|---|---|
| `Understood` | src/memorymap/search/query.py:49 |
| `_empty_filters` | src/memorymap/search/query.py:44 |
| `_has_content` | src/memorymap/search/query.py:425 |
| `_parse_date_operator` | src/memorymap/search/query.py:277 |
| `_parse_operators` | src/memorymap/search/query.py:305 |
| `_split_values` | src/memorymap/search/query.py:295 |
| `_strip_scaffolding` | src/memorymap/search/query.py:208 |
| `_strip_trailing_scaffold` | src/memorymap/search/query.py:194 |
| `_tidy` | src/memorymap/search/query.py:143 |
| `search_terms` | src/memorymap/search/query.py:453 |
| `understand` | src/memorymap/search/query.py:355 |

### src/memorymap/search/search_manager.py (33)

| Name | File:line |
|---|---|
| `Retrieval` | src/memorymap/search/search_manager.py:867 |
| `_category_notes` | src/memorymap/search/search_manager.py:1072 |
| `_category_only` | src/memorymap/search/search_manager.py:1066 |
| `_corrected_terms` | src/memorymap/search/search_manager.py:242 |
| `_fuse` | src/memorymap/search/search_manager.py:645 |
| `_learned_order` | src/memorymap/search/search_manager.py:1306 |
| `_linked_neighbours` | src/memorymap/search/search_manager.py:684 |
| `_meaningful_terms` | src/memorymap/search/search_manager.py:292 |
| `_named_category` | src/memorymap/search/search_manager.py:1032 |
| `_rank` | src/memorymap/search/search_manager.py:956 |
| `_rank_inner` | src/memorymap/search/search_manager.py:969 |
| `_recency_pin_ranking` | src/memorymap/search/search_manager.py:619 |
| `_retrieve` | src/memorymap/search/search_manager.py:1089 |
| `_score_from_matrix` | src/memorymap/search/search_manager.py:486 |
| `_score_from_table` | src/memorymap/search/search_manager.py:525 |
| `_user_today` | src/memorymap/search/search_manager.py:43 |
| `_within` | src/memorymap/search/search_manager.py:851 |
| `_without_private` | src/memorymap/search/search_manager.py:1360 |
| `_written_at` | src/memorymap/search/search_manager.py:843 |
| `configured_thresholds` | src/memorymap/search/search_manager.py:297 |
| `entries_between` | src/memorymap/search/search_manager.py:100 |
| `graph_expansion` | src/memorymap/search/search_manager.py:749 |
| `in_range` | src/memorymap/search/search_manager.py:815 |
| `is_recency_ask` | src/memorymap/search/search_manager.py:1009 |
| `keyword_search` | src/memorymap/search/search_manager.py:124 |
| `last_search` | src/memorymap/search/search_manager.py:951 |
| `note_search_mode` | src/memorymap/search/search_manager.py:964 |
| `query_vector` | src/memorymap/search/search_manager.py:324 |
| `recent_entries` | src/memorymap/search/search_manager.py:78 |
| `retrieve` | src/memorymap/search/search_manager.py:921 |
| `retrieve_detailed` | src/memorymap/search/search_manager.py:898 |
| `semantic_search` | src/memorymap/search/search_manager.py:381 |
| `warm` | src/memorymap/search/search_manager.py:341 |

### src/memorymap/search/searxng_docker.py (8)

| Name | File:line |
|---|---|
| `_docker_publishes_beyond_localhost` | src/memorymap/search/searxng_docker.py:152 |
| `_docker_state` | src/memorymap/search/searxng_docker.py:121 |
| `_publish_spec` | src/memorymap/search/searxng_docker.py:132 |
| `_remove_container` | src/memorymap/search/searxng_docker.py:182 |
| `_start_docker` | src/memorymap/search/searxng_docker.py:189 |
| `docker_available` | src/memorymap/search/searxng_docker.py:62 |
| `docker_installed` | src/memorymap/search/searxng_docker.py:57 |
| `forget_docker_daemon_state` | src/memorymap/search/searxng_docker.py:110 |

### src/memorymap/search/searxng_install.py (16)

| Name | File:line |
|---|---|
| `_download` | src/memorymap/search/searxng_install.py:218 |
| `_drop_readonly` | src/memorymap/search/searxng_install.py:510 |
| `_fetch_source` | src/memorymap/search/searxng_install.py:286 |
| `_install_log` | src/memorymap/search/searxng_install.py:123 |
| `_install_progress` | src/memorymap/search/searxng_install.py:142 |
| `_install_stage` | src/memorymap/search/searxng_install.py:133 |
| `_install_steps` | src/memorymap/search/searxng_install.py:332 |
| `_remove_tree` | src/memorymap/search/searxng_install.py:526 |
| `_unpack` | src/memorymap/search/searxng_install.py:247 |
| `_unsafe_member` | src/memorymap/search/searxng_install.py:201 |
| `install_source` | src/memorymap/search/searxng_install.py:369 |
| `is_checkout` | src/memorymap/search/searxng_install.py:148 |
| `reinstall_source` | src/memorymap/search/searxng_install.py:608 |
| `source_available` | src/memorymap/search/searxng_install.py:75 |
| `source_installed` | src/memorymap/search/searxng_install.py:167 |
| `uninstall_source` | src/memorymap/search/searxng_install.py:563 |

### src/memorymap/search/searxng_manager.py (27)

| Name | File:line |
|---|---|
| `SearxngError` | src/memorymap/search/searxng_manager.py:142 |
| `__dir__` | src/memorymap/search/searxng_manager.py:476 |
| `__getattr__` | src/memorymap/search/searxng_manager.py:465 |
| `_couldnt_run` | src/memorymap/search/searxng_manager.py:332 |
| `_log_command_failure` | src/memorymap/search/searxng_manager.py:336 |
| `_pid_file` | src/memorymap/search/searxng_manager.py:159 |
| `_port_clash` | src/memorymap/search/searxng_manager.py:305 |
| `_port_free` | src/memorymap/search/searxng_manager.py:98 |
| `_program` | src/memorymap/search/searxng_manager.py:327 |
| `_reason` | src/memorymap/search/searxng_manager.py:348 |
| `_run` | src/memorymap/search/searxng_manager.py:257 |
| `_run_streaming` | src/memorymap/search/searxng_manager.py:176 |
| `_settle_on` | src/memorymap/search/searxng_manager.py:77 |
| `_source_dir` | src/memorymap/search/searxng_manager.py:146 |
| `_venv_dir` | src/memorymap/search/searxng_manager.py:150 |
| `_venv_python` | src/memorymap/search/searxng_manager.py:154 |
| `_wait_until_ready` | src/memorymap/search/searxng_manager.py:276 |
| `base_url` | src/memorymap/search/searxng_manager.py:93 |
| `choose_port` | src/memorymap/search/searxng_manager.py:110 |
| `host_port` | src/memorymap/search/searxng_manager.py:83 |
| `port_report` | src/memorymap/search/searxng_manager.py:550 |
| `preferred_backend` | src/memorymap/search/searxng_manager.py:541 |
| `start` | src/memorymap/search/searxng_manager.py:673 |
| `starting` | src/memorymap/search/searxng_manager.py:668 |
| `status` | src/memorymap/search/searxng_manager.py:594 |
| `stop` | src/memorymap/search/searxng_manager.py:699 |
| `stop_streaming` | src/memorymap/search/searxng_manager.py:171 |

### src/memorymap/search/searxng_process.py (10)

| Name | File:line |
|---|---|
| `_alive` | src/memorymap/search/searxng_process.py:89 |
| `_alive_windows` | src/memorymap/search/searxng_process.py:61 |
| `_read_pid` | src/memorymap/search/searxng_process.py:49 |
| `_source_state` | src/memorymap/search/searxng_process.py:110 |
| `_start_from_source` | src/memorymap/search/searxng_process.py:217 |
| `_start_source` | src/memorymap/search/searxng_process.py:142 |
| `_stop_source` | src/memorymap/search/searxng_process.py:197 |
| `_terminate` | src/memorymap/search/searxng_process.py:103 |
| `log_path` | src/memorymap/search/searxng_process.py:118 |
| `recent_output` | src/memorymap/search/searxng_process.py:131 |

### src/memorymap/search/searxng_settings.py (12)

| Name | File:line |
|---|---|
| `_engines_sharing_removed_networks` | src/memorymap/search/searxng_settings.py:299 |
| `_entry` | src/memorymap/search/searxng_settings.py:194 |
| `_existing_secret_key` | src/memorymap/search/searxng_settings.py:269 |
| `_extra_removes` | src/memorymap/search/searxng_settings.py:324 |
| `_restrict` | src/memorymap/search/searxng_settings.py:350 |
| `_searxng_env` | src/memorymap/search/searxng_settings.py:215 |
| `_write_pwd_shim` | src/memorymap/search/searxng_settings.py:236 |
| `ensure_settings` | src/memorymap/search/searxng_settings.py:374 |
| `getpwall` | src/memorymap/search/searxng_settings.py:210 |
| `getpwnam` | src/memorymap/search/searxng_settings.py:206 |
| `getpwuid` | src/memorymap/search/searxng_settings.py:202 |
| `settings_path` | src/memorymap/search/searxng_settings.py:264 |

### src/memorymap/search/websearch.py (34)

| Name | File:line |
|---|---|
| `WebSearchError` | src/memorymap/search/websearch.py:94 |
| `_assert_external` | src/memorymap/search/websearch.py:687 |
| `_blocks_from_markdown` | src/memorymap/search/websearch.py:990 |
| `_cache_get` | src/memorymap/search/websearch.py:98 |
| `_cache_put` | src/memorymap/search/websearch.py:109 |
| `_content_body` | src/memorymap/search/websearch.py:892 |
| `_first_matches` | src/memorymap/search/websearch.py:632 |
| `_get_external` | src/memorymap/search/websearch.py:709 |
| `_host_addresses` | src/memorymap/search/websearch.py:665 |
| `_is_challenge` | src/memorymap/search/websearch.py:416 |
| `_page_links` | src/memorymap/search/websearch.py:909 |
| `_page_title` | src/memorymap/search/websearch.py:981 |
| `_parse_results` | src/memorymap/search/websearch.py:640 |
| `_private_session` | src/memorymap/search/websearch.py:67 |
| `_readable_blocks` | src/memorymap/search/websearch.py:938 |
| `_readable_text` | src/memorymap/search/websearch.py:1017 |
| `_real_url` | src/memorymap/search/websearch.py:606 |
| `_search_duckduckgo` | src/memorymap/search/websearch.py:530 |
| `_search_searxng` | src/memorymap/search/websearch.py:424 |
| `_searxng_target` | src/memorymap/search/websearch.py:144 |
| `_split_url` | src/memorymap/search/websearch.py:766 |
| `_strip_tags` | src/memorymap/search/websearch.py:602 |
| `_upstream_engines` | src/memorymap/search/websearch.py:498 |
| `answered_by` | src/memorymap/search/websearch.py:297 |
| `clear_cache` | src/memorymap/search/websearch.py:115 |
| `discover_searxng` | src/memorymap/search/websearch.py:229 |
| `domain_of` | src/memorymap/search/websearch.py:237 |
| `fetch_readable` | src/memorymap/search/websearch.py:804 |
| `fetch_readable_cached` | src/memorymap/search/websearch.py:796 |
| `normalise_provider` | src/memorymap/search/websearch.py:305 |
| `prefetch_readable` | src/memorymap/search/websearch.py:788 |
| `probe_searxng` | src/memorymap/search/websearch.py:201 |
| `search_web` | src/memorymap/search/websearch.py:329 |
| `settings_from` | src/memorymap/search/websearch.py:315 |

## Tests (9403)

`def test_` lines in each `tests/test_*.py`.

| File | Tests |
|---|---|
| tests/test_a11y_wcag22.py | 16 |
| tests/test_accent_text.py | 3 |
| tests/test_account.py | 16 |
| tests/test_activity.py | 10 |
| tests/test_activity_undo_row.py | 4 |
| tests/test_acts.py | 10 |
| tests/test_agent_context.py | 7 |
| tests/test_agent_followthrough.py | 7 |
| tests/test_agent_gate_778.py | 6 |
| tests/test_agent_link_types.py | 8 |
| tests/test_agent_plan.py | 13 |
| tests/test_agent_plan_writes.py | 5 |
| tests/test_agent_recovery.py | 14 |
| tests/test_agent_small_model.py | 15 |
| tests/test_agent_tools_api.py | 40 |
| tests/test_agent_undo_bar.py | 5 |
| tests/test_agent_utilities.py | 7 |
| tests/test_ai_board_edit.py | 9 |
| tests/test_ai_core.py | 27 |
| tests/test_ai_mindmap_tools.py | 14 |
| tests/test_ai_name.py | 9 |
| tests/test_ai_reach.py | 19 |
| tests/test_ai_whiteboard_tools.py | 23 |
| tests/test_alembic_baseline.py | 7 |
| tests/test_alembic_full_chain.py | 3 |
| tests/test_all_spaces_indexes.py | 2 |
| tests/test_answer_pictures_502.py | 11 |
| tests/test_answer_support.py | 10 |
| tests/test_answer_support_cleared.py | 1 |
| tests/test_answer_trim.py | 3 |
| tests/test_api_contract_b7.py | 11 |
| tests/test_api_entries.py | 18 |
| tests/test_app_import.py | 10 |
| tests/test_archive.py | 7 |
| tests/test_archive_links.py | 1 |
| tests/test_arithmetic.py | 3 |
| tests/test_ask_answer_object.py | 22 |
| tests/test_ask_category_scope.py | 3 |
| tests/test_ask_focus.py | 12 |
| tests/test_ask_head_714.py | 1 |
| tests/test_ask_history.py | 17 |
| tests/test_ask_overview_brief.py | 5 |
| tests/test_ask_records_voice.py | 4 |
| tests/test_ask_sees_tags_and_files.py | 5 |
| tests/test_ask_use_ai_714.py | 6 |
| tests/test_ask_user.py | 18 |
| tests/test_asset_cache_busting.py | 3 |
| tests/test_asset_strip.py | 20 |
| tests/test_atlas_access.py | 6 |
| tests/test_atlas_breath_687.py | 4 |
| tests/test_atlas_shape.py | 51 |
| tests/test_atlas_suggest_shape.py | 2 |
| tests/test_atlas_wisps_pose.py | 3 |
| tests/test_atomic_io_windows.py | 2 |
| tests/test_attachment_cards.py | 14 |
| tests/test_attachment_rename_route.py | 4 |
| tests/test_audio_section.py | 4 |
| tests/test_audit_export.py | 9 |
| tests/test_auth_hardening_1005.py | 16 |
| tests/test_auth_headers_space.py | 3 |
| tests/test_autonomous.py | 27 |
| tests/test_autonomous_state_isolation.py | 4 |
| tests/test_backend_switch_keeps_embeddings.py | 2 |
| tests/test_backend_url_safety.py | 23 |
| tests/test_background_filing.py | 19 |
| tests/test_background_filing_cost.py | 2 |
| tests/test_background_registry.py | 2 |
| tests/test_background_rows_keep_their_space.py | 3 |
| tests/test_backlog_status_rows.py | 6 |
| tests/test_backup_bundle.py | 8 |
| tests/test_backup_roundtrip_full.py | 2 |
| tests/test_backups_api.py | 12 |
| tests/test_badge_recipe.py | 14 |
| tests/test_bars_618.py | 7 |
| tests/test_bench_spec.py | 7 |
| tests/test_bg_art_styles.py | 23 |
| tests/test_bgtasks.py | 22 |
| tests/test_bin_documents_reminders_row30.py | 6 |
| tests/test_board_acts.py | 6 |
| tests/test_board_background.py | 8 |
| tests/test_board_duplicate.py | 5 |
| tests/test_board_history.py | 14 |
| tests/test_board_kind_switch.py | 5 |
| tests/test_board_library.py | 19 |
| tests/test_board_modified_time.py | 8 |
| tests/test_board_named_layers.py | 4 |
| tests/test_board_pan_layers.py | 2 |
| tests/test_board_preview.py | 14 |
| tests/test_board_shape_sets.py | 5 |
| tests/test_board_sidebar_596.py | 6 |
| tests/test_board_swimlanes.py | 2 |
| tests/test_board_templates_715.py | 11 |
| tests/test_bookmarks_api.py | 15 |
| tests/test_bookmarks_library.py | 3 |
| tests/test_bookmarks_said_once.py | 1 |
| tests/test_boot_budget.py | 4 |
| tests/test_boot_has_no_p5_or_d3.py | 5 |
| tests/test_boot_integrity.py | 6 |
| tests/test_breakpoints.py | 3 |
| tests/test_budgets.py | 6 |
| tests/test_canvasui_1010.py | 9 |
| tests/test_captioning.py | 16 |
| tests/test_captions.py | 15 |
| tests/test_captions_live.py | 2 |
| tests/test_capture_draft_blank.py | 2 |
| tests/test_capture_strip_first_paint.py | 3 |
| tests/test_catalogue_reveal.py | 7 |
| tests/test_categories_api.py | 9 |
| tests/test_category_colour.py | 16 |
| tests/test_category_manage.py | 8 |
| tests/test_category_race.py | 2 |
| tests/test_category_rename_vectors.py | 4 |
| tests/test_category_space_integrity.py | 8 |
| tests/test_category_tools.py | 19 |
| tests/test_changelog.py | 3 |
| tests/test_chat_api.py | 19 |
| tests/test_chat_app_help.py | 5 |
| tests/test_chat_attachments.py | 18 |
| tests/test_chat_checkpoint_race.py | 2 |
| tests/test_chat_dock.py | 9 |
| tests/test_chat_followups.py | 14 |
| tests/test_chat_intent.py | 13 |
| tests/test_chat_live_citations.py | 2 |
| tests/test_chat_metadata.py | 10 |
| tests/test_chat_organisation.py | 15 |
| tests/test_chat_persona_marks.py | 5 |
| tests/test_chat_resume_controls.py | 6 |
| tests/test_chat_scroll_534.py | 4 |
| tests/test_chat_transcript.py | 11 |
| tests/test_chat_vision.py | 9 |
| tests/test_chatui_1010.py | 23 |
| tests/test_cheap_animations.py | 6 |
| tests/test_chip_target.py | 2 |
| tests/test_chunk_vectors.py | 11 |
| tests/test_citation_after_heading.py | 1 |
| tests/test_claimed_work.py | 18 |
| tests/test_clear_app_cache.py | 4 |
| tests/test_client_key_idempotent.py | 2 |
| tests/test_clip_text.py | 1 |
| tests/test_clock_weekday.py | 5 |
| tests/test_code_completion.py | 28 |
| tests/test_code_editing.py | 24 |
| tests/test_code_ide_b42.py | 9 |
| tests/test_code_vscode.py | 23 |
| tests/test_codemap_fresh.py | 1 |
| tests/test_codeql_shapes.py | 2 |
| tests/test_coerce_number_finite.py | 3 |
| tests/test_command_row_shape.py | 3 |
| tests/test_companion_motion.py | 100 |
| tests/test_companion_stacking.py | 4 |
| tests/test_companion_toggle.py | 3 |
| tests/test_complexity.py | 4 |
| tests/test_composer_688.py | 40 |
| tests/test_composer_725.py | 23 |
| tests/test_composer_741.py | 5 |
| tests/test_composer_brief.py | 13 |
| tests/test_composer_commands.py | 3 |
| tests/test_composer_eval_725.py | 6 |
| tests/test_composer_eval_741.py | 6 |
| tests/test_composer_overview_787.py | 17 |
| tests/test_composer_route_688.py | 11 |
| tests/test_composer_social.py | 5 |
| tests/test_composer_tables.py | 32 |
| tests/test_composer_voice.py | 6 |
| tests/test_composer_voice_answers.py | 12 |
| tests/test_composer_voice_turns.py | 12 |
| tests/test_compress_chat_tool.py | 17 |
| tests/test_compress_context.py | 9 |
| tests/test_compression.py | 8 |
| tests/test_connected_results.py | 8 |
| tests/test_connection_row_cues.py | 7 |
| tests/test_connections_block.py | 9 |
| tests/test_consistency_contract.py | 8 |
| tests/test_constellation_glide_686.py | 8 |
| tests/test_contents_outline_496.py | 5 |
| tests/test_context_budget.py | 22 |
| tests/test_context_cjk_budget.py | 3 |
| tests/test_continue_where_you_left_off.py | 4 |
| tests/test_control_edge.py | 6 |
| tests/test_conversation_archive.py | 5 |
| tests/test_conversation_fork.py | 9 |
| tests/test_conversation_retention.py | 7 |
| tests/test_conversations_api.py | 34 |
| tests/test_core.py | 23 |
| tests/test_core_message_wording.py | 15 |
| tests/test_crypto.py | 11 |
| tests/test_css_braces.py | 1 |
| tests/test_css_invalidation.py | 9 |
| tests/test_daily_journal.py | 12 |
| tests/test_daily_strip.py | 9 |
| tests/test_dash_map_feature.py | 4 |
| tests/test_dash_widget_stall.py | 3 |
| tests/test_dashboard_boot_race.py | 1 |
| tests/test_dashboard_empty_actions.py | 5 |
| tests/test_dashboard_layout_cap.py | 3 |
| tests/test_dashboard_stats_memo.py | 2 |
| tests/test_dashboard_streak.py | 2 |
| tests/test_dashboard_widget_copy.py | 1 |
| tests/test_date_field_when.py | 2 |
| tests/test_day_digest.py | 5 |
| tests/test_db_pragmas_and_indexes.py | 13 |
| tests/test_debug_health.py | 10 |
| tests/test_debug_panel.py | 6 |
| tests/test_delete_dependants.py | 2 |
| tests/test_density_height.py | 3 |
| tests/test_derived_facts.py | 14 |
| tests/test_desk_counts_63.py | 5 |
| tests/test_desktop_fullscreen.py | 5 |
| tests/test_desktop_launcher.py | 17 |
| tests/test_digest_structure.py | 20 |
| tests/test_disclosure_marker.py | 4 |
| tests/test_doc_ai_check.py | 8 |
| tests/test_doc_backlinks.py | 18 |
| tests/test_doc_blockrefs.py | 2 |
| tests/test_doc_columns.py | 2 |
| tests/test_doc_commands.py | 7 |
| tests/test_doc_comments.py | 4 |
| tests/test_doc_dictionary_sheet.py | 5 |
| tests/test_doc_dock.py | 11 |
| tests/test_doc_edit_kept.py | 5 |
| tests/test_doc_focus_sidebar.py | 4 |
| tests/test_doc_format_back.py | 4 |
| tests/test_doc_frontmatter.py | 2 |
| tests/test_doc_image_options.py | 1 |
| tests/test_doc_long.py | 5 |
| tests/test_doc_math.py | 2 |
| tests/test_doc_mermaid.py | 5 |
| tests/test_doc_outline_reuse.py | 2 |
| tests/test_doc_page_break.py | 3 |
| tests/test_doc_properties.py | 10 |
| tests/test_doc_prose_panel_fit.py | 4 |
| tests/test_doc_rich_paste.py | 3 |
| tests/test_doc_sidebar_narrow.py | 2 |
| tests/test_doc_surface.py | 6 |
| tests/test_doc_tables.py | 3 |
| tests/test_doc_toolbar_reach.py | 7 |
| tests/test_doc_type_fields.py | 2 |
| tests/test_docexport_bundle.py | 5 |
| tests/test_dock_grammar.py | 12 |
| tests/test_dock_help_507.py | 9 |
| tests/test_dock_menu_closed_hidden.py | 2 |
| tests/test_docker_env.py | 4 |
| tests/test_docs_layout.py | 5 |
| tests/test_docs_links.py | 2 |
| tests/test_docs_site.py | 11 |
| tests/test_document_archive.py | 5 |
| tests/test_document_bookmarks.py | 7 |
| tests/test_document_diff.py | 3 |
| tests/test_document_export_html.py | 4 |
| tests/test_document_import.py | 9 |
| tests/test_document_links.py | 12 |
| tests/test_document_rephrase.py | 9 |
| tests/test_document_revisions.py | 14 |
| tests/test_document_tools.py | 6 |
| tests/test_document_untitled_names.py | 4 |
| tests/test_documents_api.py | 46 |
| tests/test_documents_outline.py | 5 |
| tests/test_documents_replace_all.py | 4 |
| tests/test_documents_undo_acts.py | 7 |
| tests/test_docview.py | 28 |
| tests/test_docview_import.py | 7 |
| tests/test_draft_links.py | 6 |
| tests/test_drafts_api.py | 21 |
| tests/test_duplicates.py | 15 |
| tests/test_duplicates_scan_speed.py | 5 |
| tests/test_edit_authorship.py | 3 |
| tests/test_edit_conflicts.py | 7 |
| tests/test_edit_conflicts_ui.py | 1 |
| tests/test_edit_embeds_off_request.py | 3 |
| tests/test_egress_ledger_writes.py | 7 |
| tests/test_embedding_backfill.py | 10 |
| tests/test_embedding_batches.py | 5 |
| tests/test_embedding_batches_reindex.py | 2 |
| tests/test_embedding_errors.py | 6 |
| tests/test_embedding_found.py | 9 |
| tests/test_embedding_models.py | 14 |
| tests/test_embedding_offline.py | 5 |
| tests/test_embedding_pull.py | 9 |
| tests/test_embedding_reset.py | 7 |
| tests/test_embedding_switch.py | 12 |
| tests/test_embedding_text.py | 5 |
| tests/test_embedding_threads.py | 5 |
| tests/test_embedding_warmup.py | 9 |
| tests/test_embeddings_core.py | 4 |
| tests/test_emblem_boot.py | 1 |
| tests/test_emblem_slots.py | 1 |
| tests/test_emblem_turns.py | 3 |
| tests/test_engine_acts.py | 10 |
| tests/test_engine_budgets.py | 2 |
| tests/test_engine_dialogue.py | 6 |
| tests/test_engine_evals_1010.py | 6 |
| tests/test_engine_identity.py | 6 |
| tests/test_engine_phase6_spec.py | 29 |
| tests/test_engine_plan.py | 19 |
| tests/test_engine_probe_step0.py | 12 |
| tests/test_engine_sources.py | 6 |
| tests/test_engine_web.py | 4 |
| tests/test_entities.py | 7 |
| tests/test_entities_kg5.py | 6 |
| tests/test_entity_merge_undo.py | 3 |
| tests/test_entity_page_private.py | 2 |
| tests/test_entries_by_ids.py | 4 |
| tests/test_entries_keyset_paging.py | 4 |
| tests/test_entry_bookmarks.py | 6 |
| tests/test_entry_edited_at.py | 4 |
| tests/test_entry_history.py | 15 |
| tests/test_entry_indexes.py | 5 |
| tests/test_entry_list_keys_in_fields.py | 2 |
| tests/test_entry_references.py | 31 |
| tests/test_error_contract.py | 4 |
| tests/test_error_toasts.py | 8 |
| tests/test_events.py | 23 |
| tests/test_events_undo.py | 13 |
| tests/test_every_route_is_locked.py | 4 |
| tests/test_evidence_spec.py | 12 |
| tests/test_export_backup_whole.py | 1 |
| tests/test_export_folder.py | 6 |
| tests/test_export_paint.py | 4 |
| tests/test_exports_list.py | 5 |
| tests/test_extract_notes.py | 21 |
| tests/test_extractive_answer.py | 9 |
| tests/test_extras.py | 44 |
| tests/test_extras_bundles.py | 29 |
| tests/test_extras_download.py | 22 |
| tests/test_f7_pool_moves.py | 2 |
| tests/test_factgraph.py | 11 |
| tests/test_failure_remedies.py | 4 |
| tests/test_failure_ways_out_row33.py | 2 |
| tests/test_feature_catalog.py | 7 |
| tests/test_feature_models.py | 39 |
| tests/test_fence_scrub.py | 4 |
| tests/test_field_clear.py | 8 |
| tests/test_file_editing.py | 20 |
| tests/test_file_read_tasks.py | 6 |
| tests/test_file_save.py | 21 |
| tests/test_file_tools.py | 14 |
| tests/test_files_analyse_pdf.py | 2 |
| tests/test_files_autoread.py | 8 |
| tests/test_files_describe.py | 7 |
| tests/test_files_row_summary.py | 11 |
| tests/test_filetypes.py | 11 |
| tests/test_filing_accuracy.py | 4 |
| tests/test_filing_certainty.py | 18 |
| tests/test_filing_decision.py | 9 |
| tests/test_filing_evidence_wired.py | 6 |
| tests/test_filing_standin_watch.py | 1 |
| tests/test_final_pass_bugs.py | 5 |
| tests/test_finder_star_790.py | 3 |
| tests/test_first_run_472.py | 11 |
| tests/test_flaw_class_lints.py | 2 |
| tests/test_folder_roundtrip.py | 5 |
| tests/test_followup_trail_490.py | 3 |
| tests/test_followups.py | 19 |
| tests/test_forgot_password.py | 29 |
| tests/test_forgot_password_ui.py | 9 |
| tests/test_frontend_handlers.py | 6 |
| tests/test_frontend_ids.py | 13 |
| tests/test_frontend_load_order.py | 7 |
| tests/test_frontend_shortcuts.py | 4 |
| tests/test_frontend_symbols.py | 4 |
| tests/test_frontend_tool_labels.py | 3 |
| tests/test_frontend_wake_sources.py | 2 |
| tests/test_frontend_workspace_header.py | 3 |
| tests/test_frozen_extras.py | 10 |
| tests/test_frozen_launch.py | 19 |
| tests/test_frozen_packaging.py | 13 |
| tests/test_fully_local.py | 3 |
| tests/test_gallery_paging.py | 2 |
| tests/test_gallery_size_backfill.py | 3 |
| tests/test_gate_changed_base.py | 5 |
| tests/test_gate_lint_set.py | 2 |
| tests/test_gate_owner_cache.py | 3 |
| tests/test_gate_staged_once.py | 3 |
| tests/test_global_scope_ratchet.py | 3 |
| tests/test_graph_api.py | 32 |
| tests/test_graph_centrality_slot.py | 3 |
| tests/test_graph_click_threshold.py | 2 |
| tests/test_graph_colour_rules.py | 7 |
| tests/test_graph_empty_filtered.py | 4 |
| tests/test_graph_encoded_off_loop.py | 2 |
| tests/test_graph_feel_775.py | 13 |
| tests/test_graph_first_frame.py | 5 |
| tests/test_graph_fit_balance.py | 7 |
| tests/test_graph_glide.py | 2 |
| tests/test_graph_grouping.py | 2 |
| tests/test_graph_hover_fade.py | 6 |
| tests/test_graph_layout_692.py | 8 |
| tests/test_graph_layout_order.py | 4 |
| tests/test_graph_layout_switch_fit.py | 2 |
| tests/test_graph_local_scaling.py | 4 |
| tests/test_graph_look.py | 10 |
| tests/test_graph_options_scroll.py | 1 |
| tests/test_graph_pane_collapse.py | 3 |
| tests/test_graph_parity_514.py | 9 |
| tests/test_graph_paths.py | 34 |
| tests/test_graph_payload_cache.py | 8 |
| tests/test_graph_settles.py | 3 |
| tests/test_graph_similarity.py | 7 |
| tests/test_graph_slim.py | 3 |
| tests/test_graph_topic_drag.py | 4 |
| tests/test_graph_view_positions.py | 5 |
| tests/test_greeting_name.py | 9 |
| tests/test_grounding.py | 28 |
| tests/test_grounding_fixtures.py | 10 |
| tests/test_guide_composed_787.py | 11 |
| tests/test_guide_gaps.py | 3 |
| tests/test_harness_evals.py | 3 |
| tests/test_harness_plan_card.py | 9 |
| tests/test_harness_robustness.py | 30 |
| tests/test_harness_tiers.py | 29 |
| tests/test_harness_verifier.py | 44 |
| tests/test_harness_verifier_spec.py | 4 |
| tests/test_has_invalidation.py | 3 |
| tests/test_health_page.py | 3 |
| tests/test_help_chat.py | 53 |
| tests/test_help_chat_reading.py | 5 |
| tests/test_help_controls.py | 17 |
| tests/test_help_coverage.py | 6 |
| tests/test_help_emphasis.py | 5 |
| tests/test_help_popover_in_dialogs.py | 3 |
| tests/test_help_retrieval.py | 8 |
| tests/test_help_search.py | 3 |
| tests/test_help_settings_paths.py | 8 |
| tests/test_help_toggles_built_later.py | 2 |
| tests/test_help_topic_routing.py | 5 |
| tests/test_highlight_colours.py | 2 |
| tests/test_highlights_collection.py | 7 |
| tests/test_icon_conventions.py | 18 |
| tests/test_icon_label_align.py | 7 |
| tests/test_icon_label_gap.py | 2 |
| tests/test_icon_names.py | 2 |
| tests/test_icon_only_buttons.py | 2 |
| tests/test_icon_picker.py | 5 |
| tests/test_ide_shell_b71.py | 16 |
| tests/test_import_dates.py | 4 |
| tests/test_import_directory_roots.py | 7 |
| tests/test_import_idempotent.py | 5 |
| tests/test_import_markdown_links.py | 3 |
| tests/test_import_module_cycles.py | 2 |
| tests/test_import_one_step.py | 5 |
| tests/test_import_report.py | 4 |
| tests/test_inbox_431_visuals.py | 3 |
| tests/test_inbox_434_capture.py | 8 |
| tests/test_inbox_435.py | 12 |
| tests/test_inbox_436_dashboard.py | 10 |
| tests/test_inbox_675_hero.py | 11 |
| tests/test_inbox_677_quick_access.py | 3 |
| tests/test_inbox_732_733.py | 14 |
| tests/test_injection_fence.py | 17 |
| tests/test_injection_guard.py | 3 |
| tests/test_inline_citations.py | 10 |
| tests/test_inline_math.py | 3 |
| tests/test_insight_verdicts.py | 7 |
| tests/test_insights.py | 13 |
| tests/test_insights_api.py | 30 |
| tests/test_instance_lock.py | 27 |
| tests/test_intent.py | 2 |
| tests/test_janitor_knn.py | 8 |
| tests/test_janitor_short.py | 5 |
| tests/test_job_backpressure.py | 2 |
| tests/test_job_runs.py | 46 |
| tests/test_jobs_pool.py | 10 |
| tests/test_jobstore.py | 17 |
| tests/test_kept_suggestions.py | 7 |
| tests/test_keydown_without_key.py | 1 |
| tests/test_keyword_context.py | 8 |
| tests/test_keyword_search.py | 22 |
| tests/test_lan_mode.py | 21 |
| tests/test_lan_restart_action.py | 5 |
| tests/test_lan_tls.py | 16 |
| tests/test_launch_splash.py | 24 |
| tests/test_launch_status.py | 25 |
| tests/test_launcher_scripts.py | 84 |
| tests/test_launcher_update_settings.py | 27 |
| tests/test_lazy_bundle_calls.py | 3 |
| tests/test_lazy_css.py | 3 |
| tests/test_lazy_heavy_imports.py | 4 |
| tests/test_lazy_listener_refs.py | 1 |
| tests/test_lazy_skeletons_598.py | 7 |
| tests/test_learned_accuracy.py | 5 |
| tests/test_learned_spec.py | 17 |
| tests/test_lexical_filing.py | 10 |
| tests/test_library.py | 21 |
| tests/test_library_activity_rows.py | 3 |
| tests/test_library_activity_scope.py | 1 |
| tests/test_library_board_counts.py | 2 |
| tests/test_library_boards.py | 5 |
| tests/test_library_boards_ticks.py | 3 |
| tests/test_library_docs_import.py | 5 |
| tests/test_library_ergonomics.py | 5 |
| tests/test_library_image_origin.py | 5 |
| tests/test_library_images_poll.py | 3 |
| tests/test_library_list_bundle.py | 2 |
| tests/test_library_pages_445.py | 7 |
| tests/test_library_pass2.py | 12 |
| tests/test_library_preview_plain.py | 7 |
| tests/test_library_previews.py | 14 |
| tests/test_library_render_race.py | 1 |
| tests/test_library_subtabs_hide_on_board.py | 2 |
| tests/test_library_tab_leaves_board.py | 1 |
| tests/test_library_visit_cost.py | 3 |
| tests/test_lightbox.py | 17 |
| tests/test_like_escaping.py | 5 |
| tests/test_line_clipboard.py | 5 |
| tests/test_line_gutter_look.py | 6 |
| tests/test_link_all_sure.py | 4 |
| tests/test_link_reasons.py | 40 |
| tests/test_link_suggestion_quality.py | 3 |
| tests/test_link_two_way.py | 5 |
| tests/test_link_types.py | 6 |
| tests/test_link_wording.py | 12 |
| tests/test_list_endpoints_page.py | 5 |
| tests/test_list_limits.py | 2 |
| tests/test_list_paging_f2.py | 4 |
| tests/test_list_routes_by_shape.py | 2 |
| tests/test_listener_arguments.py | 1 |
| tests/test_live_queries_kg7.py | 8 |
| tests/test_local_service_h4.py | 9 |
| tests/test_lock_boundary.py | 9 |
| tests/test_lock_reveal.py | 1 |
| tests/test_locked_downloads.py | 2 |
| tests/test_log_console.py | 45 |
| tests/test_log_query_scrub.py | 6 |
| tests/test_log_token_scrub.py | 2 |
| tests/test_long_list_scroll.py | 5 |
| tests/test_long_runs.py | 12 |
| tests/test_make_plan.py | 21 |
| tests/test_manage_lists_504.py | 5 |
| tests/test_manual_parity.py | 6 |
| tests/test_map_actions_clear_of_label.py | 1 |
| tests/test_map_add_speed.py | 6 |
| tests/test_map_branch_colour_order.py | 3 |
| tests/test_map_drag_cost.py | 12 |
| tests/test_map_from_headings.py | 4 |
| tests/test_map_from_notes.py | 8 |
| tests/test_map_generation.py | 13 |
| tests/test_map_layouts.py | 3 |
| tests/test_map_levels.py | 8 |
| tests/test_map_multi_select.py | 4 |
| tests/test_map_node_controls.py | 3 |
| tests/test_map_palette.py | 4 |
| tests/test_map_paste_outline.py | 5 |
| tests/test_map_preview_measure.py | 2 |
| tests/test_map_relink.py | 4 |
| tests/test_map_render_cost.py | 11 |
| tests/test_map_ribbon_smooth.py | 3 |
| tests/test_map_size_reset.py | 7 |
| tests/test_map_spine_pinned.py | 2 |
| tests/test_map_strip_handle.py | 2 |
| tests/test_map_strip_over_menu.py | 2 |
| tests/test_map_study.py | 4 |
| tests/test_map_suggest.py | 6 |
| tests/test_map_summary.py | 5 |
| tests/test_map_theme_palette.py | 13 |
| tests/test_map_to_document.py | 3 |
| tests/test_map_topics.py | 3 |
| tests/test_maps_are_not_notes.py | 10 |
| tests/test_margin_reader_spec.py | 12 |
| tests/test_markdown_export_import.py | 11 |
| tests/test_markdown_link_schemes.py | 3 |
| tests/test_marquee_cost.py | 4 |
| tests/test_mcp_server.py | 17 |
| tests/test_md_blocks.py | 12 |
| tests/test_md_footnotes.py | 7 |
| tests/test_media_api.py | 54 |
| tests/test_media_cookie.py | 14 |
| tests/test_media_gc.py | 18 |
| tests/test_media_process.py | 15 |
| tests/test_media_size.py | 3 |
| tests/test_media_size_backfill.py | 3 |
| tests/test_meeting_notes.py | 15 |
| tests/test_meeting_summary.py | 6 |
| tests/test_meeting_undo.py | 2 |
| tests/test_meetings_644.py | 23 |
| tests/test_memory_stream.py | 22 |
| tests/test_mention_link_names.py | 4 |
| tests/test_menu_keyboard.py | 7 |
| tests/test_menu_toggles.py | 4 |
| tests/test_menu_window_fit.py | 3 |
| tests/test_menus_close_others.py | 3 |
| tests/test_middleware_disconnect.py | 3 |
| tests/test_mindmap.py | 114 |
| tests/test_mindmap_colour_discoverability.py | 5 |
| tests/test_mindmap_dashed_bar.py | 1 |
| tests/test_mindmap_fill.py | 3 |
| tests/test_model_cards.py | 24 |
| tests/test_model_connect_timeout.py | 2 |
| tests/test_model_delete.py | 3 |
| tests/test_model_gate.py | 4 |
| tests/test_model_json_deep_nesting.py | 5 |
| tests/test_model_manager_choice.py | 2 |
| tests/test_model_offer.py | 2 |
| tests/test_model_sizes.py | 5 |
| tests/test_model_specs.py | 17 |
| tests/test_models_api.py | 34 |
| tests/test_models_doc_sizes.py | 4 |
| tests/test_motion_endings.py | 2 |
| tests/test_motion_recipes.py | 6 |
| tests/test_motion_tokens.py | 12 |
| tests/test_name_mood.py | 40 |
| tests/test_namemark_follow_cost.py | 2 |
| tests/test_native_imports.py | 12 |
| tests/test_nav_history_rows.py | 7 |
| tests/test_nav_history_seed.py | 2 |
| tests/test_needle_provider.py | 17 |
| tests/test_nested_interactive.py | 11 |
| tests/test_new_document_opens_new.py | 6 |
| tests/test_night_card_grows.py | 1 |
| tests/test_night_pairs.py | 12 |
| tests/test_night_runs.py | 12 |
| tests/test_no_bare_fetch.py | 3 |
| tests/test_no_em_dashes.py | 2 |
| tests/test_no_glyph_icons.py | 1 |
| tests/test_no_import_cycles.py | 1 |
| tests/test_no_innerhtml_interpolation.py | 2 |
| tests/test_no_report_on_expected.py | 3 |
| tests/test_no_silent_except.py | 2 |
| tests/test_no_style_attribute_writes.py | 1 |
| tests/test_no_tracked_symlinks.py | 3 |
| tests/test_no_ui_emoji.py | 3 |
| tests/test_note_backlinks_kg1.py | 11 |
| tests/test_note_edit_kept.py | 3 |
| tests/test_note_edit_strip_options.py | 1 |
| tests/test_note_editing_api.py | 10 |
| tests/test_note_flow_0432.py | 25 |
| tests/test_note_form_property_block.py | 3 |
| tests/test_note_kinds_d5.py | 5 |
| tests/test_note_link_chips.py | 2 |
| tests/test_note_making.py | 1 |
| tests/test_note_meta_line.py | 5 |
| tests/test_note_offers.py | 9 |
| tests/test_note_pick_preview.py | 6 |
| tests/test_note_preview_groups.py | 5 |
| tests/test_note_preview_lines.py | 5 |
| tests/test_note_properties_kg4.py | 10 |
| tests/test_note_surface.py | 6 |
| tests/test_note_surface_readonly.py | 2 |
| tests/test_note_template_picker.py | 5 |
| tests/test_note_types_graph_d5.py | 8 |
| tests/test_notebook_access.py | 21 |
| tests/test_notebook_stats.py | 23 |
| tests/test_notebook_stats_chat.py | 2 |
| tests/test_notebook_stats_page.py | 7 |
| tests/test_notes_extras_api.py | 26 |
| tests/test_notes_rail.py | 7 |
| tests/test_notes_rows_719.py | 8 |
| tests/test_notif_dismiss.py | 2 |
| tests/test_notification_actions.py | 10 |
| tests/test_notifications_centre.py | 8 |
| tests/test_object_actions.py | 6 |
| tests/test_ocr.py | 19 |
| tests/test_ocr_clean_loops.py | 7 |
| tests/test_ocr_edit.py | 3 |
| tests/test_ocr_engine.py | 12 |
| tests/test_ocr_engine_choice_717.py | 8 |
| tests/test_ocr_engine_ui.py | 6 |
| tests/test_ocr_model.py | 17 |
| tests/test_ocr_page_range.py | 7 |
| tests/test_ocr_page_read.py | 4 |
| tests/test_ocr_page_read_tasks.py | 4 |
| tests/test_ocr_page_reads_persist.py | 9 |
| tests/test_ocr_pdf_regions.py | 6 |
| tests/test_ocr_rapidocr.py | 9 |
| tests/test_ocr_reader_split.py | 4 |
| tests/test_ocr_readers.py | 4 |
| tests/test_ocr_reading_bin.py | 5 |
| tests/test_ocr_region_cache.py | 6 |
| tests/test_ocr_regions.py | 17 |
| tests/test_ocr_workspace_717.py | 18 |
| tests/test_offline_hint.py | 6 |
| tests/test_offline_promise.py | 5 |
| tests/test_ollama_tools_reliability.py | 6 |
| tests/test_one_download_helper.py | 3 |
| tests/test_one_reader.py | 2 |
| tests/test_openapi_gate.py | 3 |
| tests/test_optional_sign_in.py | 22 |
| tests/test_orient_script.py | 2 |
| tests/test_out_of_space.py | 8 |
| tests/test_outbound_fetch_guard.py | 5 |
| tests/test_outbound_inventory.py | 4 |
| tests/test_output_forms.py | 7 |
| tests/test_packaging_spec.py | 13 |
| tests/test_page_captions.py | 12 |
| tests/test_palette_contract.py | 3 |
| tests/test_palette_coverage.py | 7 |
| tests/test_palette_head_gap.py | 2 |
| tests/test_palette_synonyms.py | 4 |
| tests/test_passes.py | 7 |
| tests/test_passive_capture.py | 9 |
| tests/test_password_floor.py | 6 |
| tests/test_path_alternatives.py | 7 |
| tests/test_path_explain_kg8.py | 4 |
| tests/test_pdf_first_page_only_when_renderable.py | 3 |
| tests/test_pdfpages.py | 16 |
| tests/test_pending_note_rows.py | 5 |
| tests/test_per_model_context_window.py | 8 |
| tests/test_perf_budget.py | 2 |
| tests/test_perf_hot_paths.py | 10 |
| tests/test_perf_mode.py | 3 |
| tests/test_persona_atlas.py | 6 |
| tests/test_phone_note_page_edit.py | 3 |
| tests/test_phone_notes_audit.py | 6 |
| tests/test_phone_select_mode_tap.py | 2 |
| tests/test_phrase_filters.py | 4 |
| tests/test_placed_0909_row31.py | 6 |
| tests/test_plain_errors.py | 3 |
| tests/test_plan_hygiene.py | 7 |
| tests/test_popup_agent_persona_avatar.py | 3 |
| tests/test_portable_strftime.py | 1 |
| tests/test_preferences_api.py | 26 |
| tests/test_preferences_roundtrip.py | 4 |
| tests/test_prefs_module.py | 4 |
| tests/test_prefs_pending_save_survives_pane_switch.py | 3 |
| tests/test_presets.py | 24 |
| tests/test_privacy_receipt.py | 18 |
| tests/test_private_answer_scrub.py | 3 |
| tests/test_private_link_props.py | 6 |
| tests/test_private_link_reason.py | 9 |
| tests/test_private_note_no_ai_offer.py | 2 |
| tests/test_private_notes.py | 24 |
| tests/test_private_scrub.py | 3 |
| tests/test_private_suggested_tags.py | 6 |
| tests/test_profile_api.py | 5 |
| tests/test_progress_phases.py | 10 |
| tests/test_prompt_budget.py | 38 |
| tests/test_prompt_prefix_stability.py | 4 |
| tests/test_properties_never_in_previews.py | 13 |
| tests/test_prose_autofill.py | 25 |
| tests/test_prose_tools.py | 19 |
| tests/test_provider_redirects.py | 4 |
| tests/test_provider_sockets.py | 8 |
| tests/test_providers.py | 70 |
| tests/test_pwa_shell.py | 25 |
| tests/test_qa_1005_polish.py | 10 |
| tests/test_quadratic_scans.py | 6 |
| tests/test_query_plans.py | 2 |
| tests/test_query_rollups_kg7.py | 4 |
| tests/test_query_understanding.py | 20 |
| tests/test_question_noise.py | 26 |
| tests/test_questions_own.py | 8 |
| tests/test_questions_spec.py | 9 |
| tests/test_quick_access.py | 26 |
| tests/test_quickadd.py | 12 |
| tests/test_raw_fetch_headers.py | 2 |
| tests/test_reading.py | 12 |
| tests/test_readings_f10.py | 4 |
| tests/test_readme_freshness.py | 7 |
| tests/test_realise.py | 11 |
| tests/test_realise_ui.py | 3 |
| tests/test_recency_questions.py | 9 |
| tests/test_recent_questions_surface.py | 7 |
| tests/test_recognise.py | 7 |
| tests/test_recordings.py | 14 |
| tests/test_recordings_library.py | 6 |
| tests/test_recurrence_1010.py | 7 |
| tests/test_recycle_bin.py | 18 |
| tests/test_reevaluate.py | 4 |
| tests/test_reevaluate_private.py | 3 |
| tests/test_refresh_entries.py | 3 |
| tests/test_regex_whitespace_runs.py | 3 |
| tests/test_region_read.py | 16 |
| tests/test_related_elsewhere.py | 9 |
| tests/test_related_notes.py | 38 |
| tests/test_relation_types_kg3.py | 8 |
| tests/test_relations_kg2.py | 15 |
| tests/test_release_smoke_step.py | 21 |
| tests/test_reminder_audio_deferred.py | 2 |
| tests/test_reminder_snooze_row34.py | 4 |
| tests/test_reminder_targets_row15.py | 5 |
| tests/test_reminder_times.py | 19 |
| tests/test_reminders_api.py | 17 |
| tests/test_reminders_ics.py | 10 |
| tests/test_restore_roundtrip.py | 2 |
| tests/test_resurface_spec.py | 14 |
| tests/test_review_queue_17.py | 6 |
| tests/test_ring_room.py | 5 |
| tests/test_round2_sweep_fixes.py | 3 |
| tests/test_router.py | 13 |
| tests/test_routes_named.py | 2 |
| tests/test_rows_676.py | 6 |
| tests/test_run_debug_js.py | 5 |
| tests/test_run_debugger.py | 10 |
| tests/test_run_protocol.py | 17 |
| tests/test_run_sandbox.py | 16 |
| tests/test_run_skill.py | 41 |
| tests/test_sampling.py | 17 |
| tests/test_save_cost_flat.py | 4 |
| tests/test_scale_query_counts.py | 9 |
| tests/test_scratchpad_size.py | 1 |
| tests/test_script_paths.py | 6 |
| tests/test_scroll_keys.py | 3 |
| tests/test_search_box.py | 22 |
| tests/test_search_engine.py | 51 |
| tests/test_search_engine_spec.py | 5 |
| tests/test_search_maps.py | 7 |
| tests/test_search_prefix.py | 7 |
| tests/test_search_provider.py | 13 |
| tests/test_search_recall.py | 3 |
| tests/test_search_spaces.py | 2 |
| tests/test_search_surfaces.py | 10 |
| tests/test_searxng_install.py | 42 |
| tests/test_searxng_recovery.py | 33 |
| tests/test_security_boundaries.py | 43 |
| tests/test_security_hardening.py | 13 |
| tests/test_seed_examples.py | 6 |
| tests/test_select_focus.py | 2 |
| tests/test_selection_actions_row30.py | 6 |
| tests/test_selection_context.py | 7 |
| tests/test_selection_menu.py | 12 |
| tests/test_semantic_auto_install.py | 15 |
| tests/test_semantic_search_matrix.py | 10 |
| tests/test_server_detail_wording.py | 3 |
| tests/test_server_down_banner.py | 8 |
| tests/test_server_shutdown.py | 3 |
| tests/test_server_time_readers.py | 1 |
| tests/test_session_navigation.py | 6 |
| tests/test_setting_label_toggles.py | 3 |
| tests/test_settings_field_edge.py | 2 |
| tests/test_settings_group_heads.py | 2 |
| tests/test_settings_ia.py | 7 |
| tests/test_settings_no_sideways.py | 4 |
| tests/test_settings_pane_actions.py | 3 |
| tests/test_settings_pane_intro.py | 2 |
| tests/test_settings_skeletons.py | 4 |
| tests/test_settings_switch_divider.py | 2 |
| tests/test_settings_weight.py | 3 |
| tests/test_share_target.py | 3 |
| tests/test_shortcut_hints.py | 9 |
| tests/test_sidebar_peek_head.py | 2 |
| tests/test_silent_mutations.py | 2 |
| tests/test_similar_pairs_cache.py | 6 |
| tests/test_sketch_620.py | 4 |
| tests/test_sketch_media.py | 15 |
| tests/test_skill_evals.py | 3 |
| tests/test_skill_run_undo.py | 5 |
| tests/test_skills.py | 83 |
| tests/test_skills_evals.py | 5 |
| tests/test_smooth_boot.py | 16 |
| tests/test_source_check.py | 7 |
| tests/test_space_delete_cascades.py | 1 |
| tests/test_spaces.py | 22 |
| tests/test_speculative_retrieval.py | 4 |
| tests/test_spinner_recipe.py | 16 |
| tests/test_spoken_followups.py | 6 |
| tests/test_staged_images.py | 4 |
| tests/test_staleness.py | 8 |
| tests/test_starter_acts.py | 7 |
| tests/test_startup_maintenance_off_path.py | 1 |
| tests/test_static_compression.py | 6 |
| tests/test_static_freshness.py | 5 |
| tests/test_static_precompressed.py | 7 |
| tests/test_status_bar_fit.py | 4 |
| tests/test_status_bar_grammar.py | 5 |
| tests/test_storage_footprint.py | 3 |
| tests/test_store_module.py | 4 |
| tests/test_stray_paste_720.py | 3 |
| tests/test_streaming_laziness.py | 7 |
| tests/test_strip_dead_embeds.py | 10 |
| tests/test_style_scale.py | 23 |
| tests/test_subprocess_no_window.py | 2 |
| tests/test_subtab_strip_surface.py | 1 |
| tests/test_suggest_tags_no_model.py | 3 |
| tests/test_suggestions_inbox_kg9.py | 16 |
| tests/test_suggestions_reads_ids.py | 1 |
| tests/test_support_email.py | 5 |
| tests/test_svg_paint_attributes.py | 2 |
| tests/test_sweep_1004_deep_json.py | 3 |
| tests/test_sweep_1004_inbox_bounds.py | 3 |
| tests/test_sweep_1004_log_scrub_speed.py | 2 |
| tests/test_sweep_1004_private_entities.py | 1 |
| tests/test_syntax_check.py | 18 |
| tests/test_system_site_packages.py | 6 |
| tests/test_tab_dblclick_659.py | 2 |
| tests/test_tab_label_width.py | 2 |
| tests/test_tab_strip_measure.py | 1 |
| tests/test_table_menu_widget.py | 3 |
| tests/test_tag_document_skill.py | 3 |
| tests/test_tag_grounding.py | 4 |
| tests/test_tag_manager_routes.py | 13 |
| tests/test_tag_normalisation.py | 5 |
| tests/test_tag_suggestions.py | 13 |
| tests/test_tag_vocabulary.py | 6 |
| tests/test_task_checkbox.py | 3 |
| tests/test_task_progress.py | 7 |
| tests/test_tasks.py | 28 |
| tests/test_taxonomy_pack.py | 64 |
| tests/test_template_draft.py | 4 |
| tests/test_tensions.py | 14 |
| tests/test_tensions_table_b4.py | 7 |
| tests/test_terms.py | 2 |
| tests/test_test_imports.py | 1 |
| tests/test_text_indent.py | 3 |
| tests/test_text_utilities.py | 6 |
| tests/test_thinking_and_stream.py | 7 |
| tests/test_thinking_budget.py | 8 |
| tests/test_thinking_words.py | 10 |
| tests/test_thinking_words_rotation.py | 27 |
| tests/test_tidy.py | 28 |
| tests/test_tidy_categories.py | 5 |
| tests/test_tidy_ui.py | 11 |
| tests/test_time_travel_spec.py | 9 |
| tests/test_timeline.py | 31 |
| tests/test_timeline_auto_scale.py | 3 |
| tests/test_timeline_on_this_day.py | 4 |
| tests/test_timewords.py | 19 |
| tests/test_timezone.py | 6 |
| tests/test_toast_over_sheets.py | 2 |
| tests/test_tool_call_dialects.py | 15 |
| tests/test_tool_cards.py | 20 |
| tests/test_tool_catalog_groups.py | 3 |
| tests/test_tool_contracts.py | 14 |
| tests/test_tool_result_summary.py | 6 |
| tests/test_tool_sources.py | 9 |
| tests/test_tool_switch_save.py | 3 |
| tests/test_toolwords.py | 14 |
| tests/test_topbar_mode.py | 3 |
| tests/test_topic_names.py | 9 |
| tests/test_topic_summary_kg6.py | 5 |
| tests/test_topics_kg6.py | 7 |
| tests/test_touched_notes.py | 15 |
| tests/test_tour_follow.py | 7 |
| tests/test_translate_offline.py | 7 |
| tests/test_tray.py | 18 |
| tests/test_ui_batch_726.py | 8 |
| tests/test_ui_recipes.py | 173 |
| tests/test_ui_signatures.py | 2 |
| tests/test_ui_state.py | 6 |
| tests/test_undo_contract.py | 3 |
| tests/test_undo_deletes_1005.py | 10 |
| tests/test_undo_store.py | 5 |
| tests/test_unlock_idempotent.py | 1 |
| tests/test_unlock_throttle_per_client.py | 4 |
| tests/test_unsaved_work_guard.py | 6 |
| tests/test_untagged_filter.py | 5 |
| tests/test_unwatched_answer.py | 4 |
| tests/test_update.py | 40 |
| tests/test_update_ask_once.py | 10 |
| tests/test_update_channel_packaged.py | 2 |
| tests/test_usage_ledger.py | 8 |
| tests/test_user_profile_context.py | 8 |
| tests/test_ux1005_copy.py | 6 |
| tests/test_validate.py | 11 |
| tests/test_validation_error_shape.py | 2 |
| tests/test_vault_import.py | 7 |
| tests/test_vault_sessions.py | 12 |
| tests/test_vendor_licences.py | 7 |
| tests/test_vendor_manifest.py | 5 |
| tests/test_vendor_utilisation.py | 4 |
| tests/test_vision_ocr.py | 26 |
| tests/test_vision_rows_row11.py | 9 |
| tests/test_voice_api.py | 14 |
| tests/test_voice_tables.py | 5 |
| tests/test_wb_anchor_hints_clear.py | 3 |
| tests/test_wb_audit_keys.py | 23 |
| tests/test_wb_clone_grips_follow.py | 6 |
| tests/test_wb_commands.py | 7 |
| tests/test_wb_context_menu_place.py | 4 |
| tests/test_wb_context_pin.py | 1 |
| tests/test_wb_drawio_import.py | 6 |
| tests/test_wb_drop_place.py | 13 |
| tests/test_wb_edge_pan.py | 4 |
| tests/test_wb_elbow.py | 13 |
| tests/test_wb_export_inline_images.py | 3 |
| tests/test_wb_export_png.py | 4 |
| tests/test_wb_find_replace.py | 2 |
| tests/test_wb_format.py | 10 |
| tests/test_wb_frame_title_target.py | 2 |
| tests/test_wb_guides.py | 5 |
| tests/test_wb_help_sheet.py | 5 |
| tests/test_wb_interchange.py | 10 |
| tests/test_wb_laser.py | 2 |
| tests/test_wb_line_ends.py | 3 |
| tests/test_wb_menu_rows_close.py | 2 |
| tests/test_wb_mermaid_kinds.py | 6 |
| tests/test_wb_middle_pan.py | 4 |
| tests/test_wb_navigator_cost.py | 6 |
| tests/test_wb_navigator_drag.py | 5 |
| tests/test_wb_node_menu_place.py | 7 |
| tests/test_wb_note_rows.py | 2 |
| tests/test_wb_pages.py | 5 |
| tests/test_wb_paste_text.py | 4 |
| tests/test_wb_path_bbox.py | 7 |
| tests/test_wb_place_box.py | 5 |
| tests/test_wb_place_ghost.py | 2 |
| tests/test_wb_ports.py | 7 |
| tests/test_wb_rail_kind.py | 1 |
| tests/test_wb_rotate_links.py | 2 |
| tests/test_wb_valign.py | 3 |
| tests/test_wb_waypoints.py | 14 |
| tests/test_wb_zorder_step.py | 9 |
| tests/test_wcag_pass.py | 1 |
| tests/test_web_reader_site_builders.py | 4 |
| tests/test_web_result_highlight.py | 7 |
| tests/test_webclip.py | 20 |
| tests/test_webclip_page.py | 9 |
| tests/test_websearch_api.py | 9 |
| tests/test_websearch_diagnosis.py | 23 |
| tests/test_websearch_privacy.py | 24 |
| tests/test_websearch_privacy_copy.py | 6 |
| tests/test_websearch_reader.py | 7 |
| tests/test_webview2_detection.py | 8 |
| tests/test_when.py | 9 |
| tests/test_when_windows.py | 6 |
| tests/test_whiteboard.py | 44 |
| tests/test_whiteboard_selection.py | 11 |
| tests/test_wiki_alias_frontend.py | 5 |
| tests/test_wiki_link_labels.py | 3 |
| tests/test_wiki_link_origin_518.py | 7 |
| tests/test_wiki_links.py | 13 |
| tests/test_wiki_links_alias.py | 10 |
| tests/test_wiki_links_headings.py | 4 |
| tests/test_wiki_picker_ranking.py | 4 |
| tests/test_window_report.py | 10 |
| tests/test_windowed_streams.py | 4 |
| tests/test_word_files_b42.py | 4 |
| tests/test_words_review.py | 7 |
| tests/test_worker_guard.py | 6 |
| tests/test_wrapup_0927_visuals.py | 6 |
| tests/test_write_lock_during_passes.py | 3 |
| tests/test_writing_dictionary_persists.py | 4 |
| tests/test_xmind_import.py | 3 |
| tests/test_zoom_wheel_delta.py | 3 |

## Plan headings (962)

Every `##` and `###` heading in `docs/ROADMAP.md` and `docs/roadmap/*.md`, except the HISTORY.md archive. Sorted by heading.

| Heading | File:line |
|---|---|
| 0. Checked in the code, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:955 |
| 0. Performance and "not device heavy" (cross-cutting, first) | docs/roadmap/PLAN.md:26 |
| 0. The diagnosis in one page | docs/roadmap/WORLD_CLASS_PLAN.md:25 |
| 0. The operating protocol (read every session, it is short) | docs/roadmap/SESSION_BRIEFS.md:17 |
| 1. Decisions made (do not remake) | docs/roadmap/SESSION_BRIEFS.md:975 |
| 1. Format panel, Style tab | docs/roadmap/WHITEBOARD_PLAN.md:977 |
| 1. Live log console (started, not finished) | docs/roadmap/BACKLOG.md:32 |
| 1. Research read, 2026-10-10, and what each changes here | docs/roadmap/CHAT_PLAN.md:1568 |
| 1. The consistency contract (the system under the little things) | docs/roadmap/WORLD_CLASS_PLAN.md:84 |
| 1. The instruction, verbatim | docs/roadmap/DOCUMENTS_PLAN.md:11 |
| 1. The instruction, verbatim | docs/roadmap/MINDMAP_PLAN.md:13 |
| 1. What changed since 2026-09-14 | docs/roadmap/ANALYSIS.md:4254 |
| 1. What exists (checked in the code) | docs/roadmap/CHAT_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/TIMELINE_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:12 |
| 1. What exists (checked in the code, not assumed) | docs/roadmap/GRAPH_PLAN.md:14 |
| 1. What it is, its size, its licence, how alive | docs/roadmap/ANALYSIS.md:2284 |
| 1. What the best rule-based and offline assistants do | docs/roadmap/CHAT_PLAN.md:1001 |
| 1. Whiteboard: to the level of Miro / FigJam / tldraw | docs/roadmap/PLAN.md:41 |
| 1. Why this file exists | docs/roadmap/FABLE_BRIEF.md:8 |
| 1.1 Stack | docs/roadmap/MODERNISATION_AUDIT.md:59 |
| 1.1 Surfaces (four levels, no more) | docs/roadmap/WORLD_CLASS_PLAN.md:93 |
| 1.2 Controls (six recipes, one height) | docs/roadmap/WORLD_CLASS_PLAN.md:108 |
| 1.2 Folders | docs/roadmap/MODERNISATION_AUDIT.md:74 |
| 1.3 Data flow, UI → backend → AI → storage | docs/roadmap/MODERNISATION_AUDIT.md:98 |
| 1.3 Menus (one recipe) | docs/roadmap/WORLD_CLASS_PLAN.md:128 |
| 1.4 Bars (docks, heads, toolbars, footers) | docs/roadmap/WORLD_CLASS_PLAN.md:162 |
| 1.4 Build, run, test, package | docs/roadmap/MODERNISATION_AUDIT.md:130 |
| 1.5 Copy | docs/roadmap/WORLD_CLASS_PLAN.md:175 |
| 1.5 Frontend architecture: judged on its merits, as the brief asks | docs/roadmap/MODERNISATION_AUDIT.md:144 |
| 1.6 Backend architecture | docs/roadmap/MODERNISATION_AUDIT.md:179 |
| 1.6 Keys (the same everywhere) | docs/roadmap/WORLD_CLASS_PLAN.md:185 |
| 1.7 Local AI integration, read, not run | docs/roadmap/MODERNISATION_AUDIT.md:197 |
| 1.7 Responsive (designed, not wrapped) | docs/roadmap/WORLD_CLASS_PLAN.md:196 |
| 1.8 Deployment targets | docs/roadmap/MODERNISATION_AUDIT.md:231 |
| 1.8 Undo (one contract; decision 53, 2026-10-10) | docs/roadmap/WORLD_CLASS_PLAN.md:210 |
| 1.9 The main user journeys | docs/roadmap/MODERNISATION_AUDIT.md:241 |
| 10. Built: Phase 2 (frontend) | docs/roadmap/MINDMAP_PLAN.md:295 |
| 10. Chat and the agent surface | docs/roadmap/PLAN.md:198 |
| 10. Deepened 2026-10-10: the timeline (Brief 72b, decision 71) | docs/roadmap/TIMELINE_PLAN.md:255 |
| 10. Flaws found by static probes (cheap to reproduce, each with its command) | docs/roadmap/WORLD_CLASS_PLAN.md:861 |
| 10. Not verified | docs/roadmap/ANALYSIS.md:4470 |
| 10. Outline, navigation and view | docs/roadmap/WHITEBOARD_PLAN.md:1214 |
| 10. The spelling check: decided 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:717 |
| 10. Timeline tab, and time-aware notes | docs/roadmap/BACKLOG.md:651 |
| 104. Sub-categories, asked about directly, and whether the graph needs a new mechanism to answer it | docs/roadmap/ANALYSIS.md:1001 |
| 109.1 Fixed, and how each was actually proven | docs/roadmap/BACKLOG.md:3447 |
| 109.2 Text highlighting: built | docs/roadmap/BACKLOG.md:3545 |
| 109.3 The competitor gap analysis, triaged | docs/roadmap/BACKLOG.md:3549 |
| 109.4 Brainstormed: not asked for, worth doing | docs/roadmap/BACKLOG.md:3588 |
| 11. Built: the previews, Phase 4 and Phase 5 | docs/roadmap/MINDMAP_PLAN.md:299 |
| 11. Deepened 2026-10-10: reminders and notifications (Brief 72b, decisions 69 and 71) | docs/roadmap/TIMELINE_PLAN.md:293 |
| 11. Graph | docs/roadmap/PLAN.md:210 |
| 11. Keyboard shortcuts | docs/roadmap/WHITEBOARD_PLAN.md:1229 |
| 11. Performance, accuracy and AI efficiency | docs/roadmap/BACKLOG.md:708 |
| 11. Phase 4 decisions, made 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:794 |
| 11. The week, session by session (Opus/Sonnet), and the quarter | docs/roadmap/WORLD_CLASS_PLAN.md:908 |
| 110.1 Built | docs/roadmap/BACKLOG.md:3621 |
| 110.2 The five bugs, and the measurement that found each | docs/roadmap/BACKLOG.md:3625 |
| 110.3 Still open | docs/roadmap/BACKLOG.md:3662 |
| 111.1 Inefficiencies, measured or read rather than guessed | docs/roadmap/BACKLOG.md:3680 |
| 111.2 Features worth building, ranked by value per unit of work | docs/roadmap/BACKLOG.md:3707 |
| 111.3 Directions, not features | docs/roadmap/BACKLOG.md:3735 |
| 112.1 The one thing this app has that the others structurally cannot | docs/roadmap/BACKLOG.md:3765 |
| 112.2 Missing features, ranked by "would someone pay for this" | docs/roadmap/BACKLOG.md:3797 |
| 112.3 Scaling and optimisation, in the order it will actually bite | docs/roadmap/BACKLOG.md:3834 |
| 112.4 What "professionalise" actually means here | docs/roadmap/BACKLOG.md:3857 |
| 112.5 Deliberately not doing | docs/roadmap/BACKLOG.md:3882 |
| 114. A product-strategy read: competitive teardown, per-feature upgrades, inventions, and a 90-day plan | docs/roadmap/ANALYSIS.md:1045 |
| 114.0 The brief, filled in from the code | docs/roadmap/ANALYSIS.md:1061 |
| 114.0b Three stale claims caught while grounding this | docs/roadmap/ANALYSIS.md:1086 |
| 114.1 Competitive teardown | docs/roadmap/ANALYSIS.md:1114 |
| 114.2 Every existing feature, and what category-leading looks like | docs/roadmap/ANALYSIS.md:1154 |
| 114.3 New inventions | docs/roadmap/ANALYSIS.md:1422 |
| 114.4 Prioritisation | docs/roadmap/ANALYSIS.md:1582 |
| 114.5 Risk, moat, and how to measure anything without telemetry | docs/roadmap/ANALYSIS.md:1656 |
| 114.6 Start tomorrow: the five highest-leverage actions | docs/roadmap/ANALYSIS.md:1706 |
| 115. After PR 144: professional use (the owner's stated next block, 2026-09-14) | docs/roadmap/BACKLOG.md:3928 |
| 116.1 Dropped or half-done, and therefore first | docs/roadmap/BACKLOG.md:3904 |
| 116.2 Mindmaps, Phases 4-5 (MINDMAP_PLAN.md §5 items 14-21) | docs/roadmap/BACKLOG.md:3911 |
| 116.3 PLAN.md rows not started (by track) | docs/roadmap/BACKLOG.md:3915 |
| 116.4 Tooling | docs/roadmap/BACKLOG.md:3922 |
| 12. Deepened 2026-10-10: the calendar (Brief 72b, decision 71) | docs/roadmap/TIMELINE_PLAN.md:334 |
| 12. Does the AI know it is an agent? | docs/roadmap/BACKLOG.md:956 |
| 12. Library | docs/roadmap/PLAN.md:220 |
| 12. Security review (read, not penetration-tested; each item names the file) | docs/roadmap/WORLD_CLASS_PLAN.md:917 |
| 12. Selection, grouping, containers, swimlanes, tables | docs/roadmap/WHITEBOARD_PLAN.md:1290 |
| 12. The map as its own tool (INBOX 93, the owner's ask, 2026-09-09) | docs/roadmap/MINDMAP_PLAN.md:303 |
| 12. The writing intelligence as one feature: decided 2026-09-13 | docs/roadmap/DOCUMENTS_PLAN.md:849 |
| 12.0 Decisions made (do not remake) | docs/roadmap/MINDMAP_PLAN.md:315 |
| 12.1 Phase 6a, the controls | docs/roadmap/MINDMAP_PLAN.md:466 |
| 12.2 Phase 6b, structure and richness (1 session) | docs/roadmap/MINDMAP_PLAN.md:471 |
| 12.3 Phase 6c, what only a notebook can do (½ session) | docs/roadmap/MINDMAP_PLAN.md:505 |
| 12.4 Not built until asked | docs/roadmap/MINDMAP_PLAN.md:531 |
| 12.5 One place per action (INBOX 200 and 201, the owner, 2026-09-13 night) | docs/roadmap/MINDMAP_PLAN.md:536 |
| 12z Learnability, 2026-10-10 (INBOX 749) | docs/roadmap/UI_MODERNISATION_PLAN.md:1336 |
| 13. Images, math, links and tooltips | docs/roadmap/WHITEBOARD_PLAN.md:1303 |
| 13. Open bugs and gaps from the merged agent reports (with owners) | docs/roadmap/WORLD_CLASS_PLAN.md:967 |
| 13. The map, read against its six complaints: measured 2026-09-21, phases open | docs/roadmap/MINDMAP_PLAN.md:604 |
| 13. Timeline | docs/roadmap/PLAN.md:234 |
| 13. Web search effectiveness | docs/roadmap/BACKLOG.md:999 |
| 13. What a self-contained HTML export is: decided 2026-09-13 | docs/roadmap/DOCUMENTS_PLAN.md:858 |
| 13.1 Is it slow? The one claim measured before anything was designed | docs/roadmap/MINDMAP_PLAN.md:632 |
| 13.1 The principles, each as a rule with a measurement | docs/roadmap/UI_MODERNISATION_PLAN.md:1375 |
| 13.2 Surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:1400 |
| 13.2 The two kinds of connection | docs/roadmap/MINDMAP_PLAN.md:762 |
| 13.3 Decisions, 2026-10-10 (do not re-decide; numbered after Phase 12's 8) | docs/roadmap/UI_MODERNISATION_PLAN.md:1422 |
| 13.3 What the surface offers, and by how many doors | docs/roadmap/MINDMAP_PLAN.md:806 |
| 13.4 Phases with gates | docs/roadmap/UI_MODERNISATION_PLAN.md:1462 |
| 13.4 What can be customised, against what a map tool offers | docs/roadmap/MINDMAP_PLAN.md:843 |
| 13.5 Clean and professional: the same measurements section 17 took | docs/roadmap/MINDMAP_PLAN.md:867 |
| 14. Core nodes, levels and the icon library (INBOX 641, 642; mc1, 2026-10-05) | docs/roadmap/MINDMAP_PLAN.md:1650 |
| 14. Export and import formats | docs/roadmap/WHITEBOARD_PLAN.md:1316 |
| 14. More tools worth adding | docs/roadmap/BACKLOG.md:1082 |
| 14. Reminders | docs/roadmap/PLAN.md:243 |
| 14. The core algorithms, read line by line (2026-09-08) | docs/roadmap/WORLD_CLASS_PLAN.md:1004 |
| 14. What a document daily note is: decided 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:922 |
| 14.1 Measured before anything was designed | docs/roadmap/MINDMAP_PLAN.md:1659 |
| 14.2 What the five apps do, and what is taken | docs/roadmap/MINDMAP_PLAN.md:1663 |
| 14.3 Decisions made (do not remake) | docs/roadmap/MINDMAP_PLAN.md:1678 |
| 14.4 What is open | docs/roadmap/MINDMAP_PLAN.md:1755 |
| 15. Appearance: more of everything | docs/roadmap/BACKLOG.md:1117 |
| 15. Deepened 2026-10-10 (Brief 72a, decision 71) | docs/roadmap/MINDMAP_PLAN.md:1776 |
| 15. Insert menu, shape picker and the sidebar search | docs/roadmap/WHITEBOARD_PLAN.md:1333 |
| 15. Inventions: eight things no notebook does, specified for Opus and Sonnet | docs/roadmap/WORLD_CLASS_PLAN.md:1062 |
| 15. Settings: section by section | docs/roadmap/PLAN.md:252 |
| 15. The code block's own bar, and where it belongs: measured 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:971 |
| 16. Layouts | docs/roadmap/WHITEBOARD_PLAN.md:1344 |
| 16. Sweeping UI quality-of-life | docs/roadmap/BACKLOG.md:1142 |
| 16. The backend, read for structure, silent failure and lag (2026-09-08) | docs/roadmap/WORLD_CLASS_PLAN.md:1396 |
| 16. The engine's three omissions, and the table menu: decided 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:1010 |
| 16. Utilities and overlays | docs/roadmap/PLAN.md:272 |
| 17. Cross-cutting quality bars (apply to every row above) | docs/roadmap/PLAN.md:287 |
| 17. The Format panel with nothing selected, and diagram options | docs/roadmap/WHITEBOARD_PLAN.md:1354 |
| 17. The live view for professional use: measured 2026-09-21, phases open | docs/roadmap/DOCUMENTS_PLAN.md:1088 |
| 17. The original vision, audited (2026-09-09) | docs/roadmap/WORLD_CLASS_PLAN.md:1632 |
| 17. Use cases the app can't serve yet | docs/roadmap/BACKLOG.md:1187 |
| 18. Agent quality | docs/roadmap/BACKLOG.md:1227 |
| 18. Order for Part II (after Part I sprints 1–3) | docs/roadmap/PLAN.md:295 |
| 18. Out of scope, with the reason | docs/roadmap/WHITEBOARD_PLAN.md:1364 |
| 18. The next horizon, written 2026-09-14 at the close of PR 144 | docs/roadmap/WORLD_CLASS_PLAN.md:1726 |
| 18. The slash menus as one system: built 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1255 |
| 19. A board or a map as an object in a note, and a note's reminders: built 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1469 |
| 19. Accessibility audit | docs/roadmap/BACKLOG.md:1265 |
| 19. The architecture and framework review (2026-09-20, INBOX 266) | docs/roadmap/WORLD_CLASS_PLAN.md:1911 |
| 19.1 The one number that matters: 776 MB resident, idle | docs/roadmap/WORLD_CLASS_PLAN.md:1924 |
| 19.2 The frontend is 5.9 MB decoded, and that is mostly fine | docs/roadmap/WORLD_CLASS_PLAN.md:1964 |
| 19.3 SQLite is the right store, and the reasons are not the obvious ones | docs/roadmap/WORLD_CLASS_PLAN.md:2003 |
| 19.4 Idle compute: the assumption did not hold | docs/roadmap/WORLD_CLASS_PLAN.md:2030 |
| 19.5 What the review has not covered yet | docs/roadmap/WORLD_CLASS_PLAN.md:2057 |
| 2. Competitors: what they have that MemoryMap does not (checked, not | docs/roadmap/WORLD_CLASS_PLAN.md:225 |
| 2. Documents: to the level of Obsidian / Typora / iA Writer | docs/roadmap/PLAN.md:61 |
| 2. Done when | docs/roadmap/SESSION_BRIEFS.md:1005 |
| 2. Format panel, Text tab, and the Arrange tab | docs/roadmap/WHITEBOARD_PLAN.md:1010 |
| 2. Packaging and distribution | docs/roadmap/ANALYSIS.md:4284 |
| 2. Quick wins | docs/roadmap/BACKLOG.md:85 |
| 2. Surface by surface, against this app | docs/roadmap/ANALYSIS.md:2328 |
| 2. The capability catalogue without a model | docs/roadmap/CHAT_PLAN.md:1237 |
| 2. The prompt | docs/roadmap/FABLE_BRIEF.md:16 |
| 2. What already exists (checked in the code, not assumed) | docs/roadmap/MINDMAP_PLAN.md:44 |
| 2. What exists (checked in the code, not assumed) | docs/roadmap/DOCUMENTS_PLAN.md:31 |
| 2. Where the layer joins each surface | docs/roadmap/CHAT_PLAN.md:1580 |
| 2. Why it disappoints (from the screenshots, each checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:28 |
| 2. Why it disappoints (measured against the screenshots) | docs/roadmap/CHAT_PLAN.md:28 |
| 2. Why it disappoints (measured, 48 notes across six months, 1358px) | docs/roadmap/TIMELINE_PLAN.md:24 |
| 2. Why it disappoints: measured and read | docs/roadmap/GRAPH_PLAN.md:27 |
| 20. A model per feature (asked for directly, 2026-09-21) | docs/roadmap/WORLD_CLASS_PLAN.md:2220 |
| 20. Backend | docs/roadmap/BACKLOG.md:1293 |
| 20. The 2026-10-05 feature audit: decisions | docs/roadmap/DOCUMENTS_PLAN.md:1158 |
| 2026-09-08, the third night: read this block first, whoever you are | docs/roadmap/HANDOVER.md:26 |
| 21. Every failure names its way out (INBOX 272 part 1, 2026-09-21) | docs/roadmap/WORLD_CLASS_PLAN.md:2290 |
| 21. Skills: rebuilt; what is left | docs/roadmap/BACKLOG.md:1428 |
| 21. The code editor against VS Code, and writing checks everywhere (INBOX 646) | docs/roadmap/DOCUMENTS_PLAN.md:544 |
| 22. Reported in use, not yet done | docs/roadmap/BACKLOG.md:1503 |
| 22. The professional baseline and the devibecode programme (2026-09-27) | docs/roadmap/WORLD_CLASS_PLAN.md:2303 |
| 22.1 Large gaps (what every professional app has) | docs/roadmap/WORLD_CLASS_PLAN.md:2317 |
| 22.2 Small things people expect (each S, Sonnet unless noted) | docs/roadmap/WORLD_CLASS_PLAN.md:2361 |
| 22.3 Where the design is below standard (measured or seen, 2026-09-27) | docs/roadmap/WORLD_CLASS_PLAN.md:2381 |
| 22.4 The devibecode programme: one surface at a time, every skill | docs/roadmap/WORLD_CLASS_PLAN.md:2396 |
| 22.5 Where the app goes next (release path) | docs/roadmap/WORLD_CLASS_PLAN.md:2425 |
| 23. Filing and the taxonomy: candidates, a decision, an explanation (2026-10-10; Brief 39b) | docs/roadmap/WORLD_CLASS_PLAN.md:1465 |
| 23. Organisation: manual grouping and multi-category notes | docs/roadmap/BACKLOG.md:1597 |
| 23. The code editor as an IDE: run, preview, test and debug (INBOX 748) | docs/roadmap/DOCUMENTS_PLAN.md:1267 |
| 24. Codebase census, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3217 |
| 24. Dashboard: more widgets, and layout depth | docs/roadmap/BACKLOG.md:1629 |
| 24. Deepened 2026-10-10: the documents editor (Brief 72a, decision 71) | docs/roadmap/DOCUMENTS_PLAN.md:1364 |
| 24.1 Size and complexity | docs/roadmap/WORLD_CLASS_PLAN.md:3221 |
| 24.2 Duplicated blocks | docs/roadmap/WORLD_CLASS_PLAN.md:3343 |
| 24.3 Dead-code candidates | docs/roadmap/WORLD_CLASS_PLAN.md:3383 |
| 24.4 Coupling of the classic scripts | docs/roadmap/WORLD_CLASS_PLAN.md:3436 |
| 24.5 Counts | docs/roadmap/WORLD_CLASS_PLAN.md:3523 |
| 24.6 Console errors per surface | docs/roadmap/WORLD_CLASS_PLAN.md:3629 |
| 24.6b Interaction timings, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3642 |
| 25. App control: tray, health checks, and dependency repair | docs/roadmap/BACKLOG.md:1661 |
| 25. Deepened 2026-10-10: the code editor (Brief 72a, decision 71) | docs/roadmap/DOCUMENTS_PLAN.md:1405 |
| 25. The whole app against world class, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3719 |
| 25.1 The bar | docs/roadmap/WORLD_CLASS_PLAN.md:3738 |
| 25.2 Surface by surface | docs/roadmap/WORLD_CLASS_PLAN.md:3755 |
| 25.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3790 |
| 25.4 Phases with gates (each a brief; measure first) | docs/roadmap/WORLD_CLASS_PLAN.md:3830 |
| 25.5 Not verified | docs/roadmap/WORLD_CLASS_PLAN.md:3846 |
| 26. Data lifecycle: archive, a full wipe, and a real trust page | docs/roadmap/BACKLOG.md:1727 |
| 26. The backend against world class, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3854 |
| 26.1 Judgement, by layer | docs/roadmap/WORLD_CLASS_PLAN.md:3876 |
| 26.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3892 |
| 26.3 Phases with gates | docs/roadmap/WORLD_CLASS_PLAN.md:3921 |
| 26.4 Measured, 2026-10-10 (Brief 60, numbers only) | docs/roadmap/WORLD_CLASS_PLAN.md:3931 |
| 26.5 Complexity, cycles, hot routes and frames, 2026-10-10 (decision 63, numbers only) | docs/roadmap/WORLD_CLASS_PLAN.md:3952 |
| 27. Every feature, its utility and its popups, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3967 |
| 27. Onboarding and first-run experience | docs/roadmap/BACKLOG.md:1803 |
| 27.1 Feature by feature: what it offers, what a professional expects, the gap | docs/roadmap/WORLD_CLASS_PLAN.md:3981 |
| 27.2 The popups, one by one | docs/roadmap/WORLD_CLASS_PLAN.md:4009 |
| 27.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4030 |
| 28. In-app help: an AI that knows the docs, built | docs/roadmap/BACKLOG.md:1833 |
| 28. The trust contract, 2026-10-10 (INBOX 750) | docs/roadmap/WORLD_CLASS_PLAN.md:4044 |
| 28.1 The rules, each with its measure | docs/roadmap/WORLD_CLASS_PLAN.md:4053 |
| 28.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4072 |
| 28.3 Phases | docs/roadmap/WORLD_CLASS_PLAN.md:4094 |
| 28.4 Deepened 2026-10-10: the OCR workspace (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4103 |
| 28.5 Deepened 2026-10-10: the audio set (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4137 |
| 28.6 T0 numbers, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:4179 |
| 29. Extensibility ideas, not yet scoped | docs/roadmap/BACKLOG.md:1839 |
| 29b. Carried out of the §40 audit | docs/roadmap/BACKLOG.md:2022 |
| 29c. Whiteboard, brainstormed: not yet triaged | docs/roadmap/BACKLOG.md:1866 |
| 29d. Whiteboard: scoped and next, not brainstormed | docs/roadmap/BACKLOG.md:1887 |
| 29e. Whiteboard master spec (uploaded, MS Whiteboard/OneNote/draw.io/ | docs/roadmap/BACKLOG.md:1944 |
| 3. Backend: fix and redesign | docs/roadmap/PLAN.md:81 |
| 3. Chat page: Chat / Agent / Browse sub-tabs | docs/roadmap/BACKLOG.md:118 |
| 3. Edit style, Edit data, placeholders, tooltips | docs/roadmap/WHITEBOARD_PLAN.md:1054 |
| 3. Files | docs/roadmap/SESSION_BRIEFS.md:1032 |
| 3. Frontend dossiers (one per surface, each a hand-off brief) | docs/roadmap/WORLD_CLASS_PLAN.md:289 |
| 3. Metadata and dependencies | docs/roadmap/ANALYSIS.md:4311 |
| 3. Research: what the field actually offers | docs/roadmap/MINDMAP_PLAN.md:79 |
| 3. The diagnosis | docs/roadmap/DOCUMENTS_PLAN.md:54 |
| 3. The five modules | docs/roadmap/CHAT_PLAN.md:1597 |
| 3. The strongest things worth taking | docs/roadmap/ANALYSIS.md:2471 |
| 3. The target, in one paragraph | docs/roadmap/CHAT_PLAN.md:60 |
| 3. The target, in one paragraph | docs/roadmap/GRAPH_PLAN.md:61 |
| 3. The target, in one paragraph | docs/roadmap/TIMELINE_PLAN.md:44 |
| 3. The target, in one paragraph | docs/roadmap/WHITEBOARD_PLAN.md:61 |
| 3. The universal layer: the same capability, with a model and without | docs/roadmap/CHAT_PLAN.md:1390 |
| 3. What this session left behind | docs/roadmap/FABLE_BRIEF.md:152 |
| 3.1 Structure and layout | docs/roadmap/MINDMAP_PLAN.md:83 |
| 3.1 The surface is a `<textarea>`, and everything the user misses follows from that | docs/roadmap/DOCUMENTS_PLAN.md:59 |
| 3.1 What "good" looks like, in five sentences | docs/roadmap/MODERNISATION_AUDIT.md:819 |
| 3.2 Semantics beyond a tree | docs/roadmap/MINDMAP_PLAN.md:98 |
| 3.2 The chrome is an inventory, not a design | docs/roadmap/DOCUMENTS_PLAN.md:78 |
| 3.2 The principles | docs/roadmap/MODERNISATION_AUDIT.md:832 |
| 3.3 Features that exist and do not show themselves | docs/roadmap/DOCUMENTS_PLAN.md:96 |
| 3.3 Integration patterns | docs/roadmap/MINDMAP_PLAN.md:110 |
| 3.3 Target architecture | docs/roadmap/MODERNISATION_AUDIT.md:856 |
| 30. External review, filtered: what didn't make the cut | docs/roadmap/ANALYSIS.md:13 |
| 31. Claude's own read: what I'd flag | docs/roadmap/ANALYSIS.md:111 |
| 32. Product direction: asked for directly, kept short on purpose | docs/roadmap/ANALYSIS.md:195 |
| 33. Odysseus, read and triaged | docs/roadmap/ANALYSIS.md:242 |
| 34. Where I'd take this: an outside read | docs/roadmap/ANALYSIS.md:541 |
| 34b. Judging another agent's branch: what was kept, and on what grounds | docs/roadmap/ANALYSIS.md:672 |
| 4. Agent harness: "the ultimate agent harness" | docs/roadmap/PLAN.md:99 |
| 4. Agents | docs/roadmap/SESSION_BRIEFS.md:1041 |
| 4. Connectors: edge styles, waypoints, jumps, arrowheads, labels | docs/roadmap/WHITEBOARD_PLAN.md:1068 |
| 4. Decisions made (do not re-decide) | docs/roadmap/CHAT_PLAN.md:74 |
| 4. Decisions made (do not re-decide) | docs/roadmap/TIMELINE_PLAN.md:58 |
| 4. Decisions made (do not re-decide) | docs/roadmap/WHITEBOARD_PLAN.md:76 |
| 4. Decisions to make first | docs/roadmap/GRAPH_PLAN.md:73 |
| 4. Decisions, 2026-10-10 (not to be remade; numbered after Phase 6's 45) | docs/roadmap/CHAT_PLAN.md:1607 |
| 4. Library tab: chats, documents, images, archive | docs/roadmap/BACKLOG.md:204 |
| 4. Provenance and publication practice | docs/roadmap/ANALYSIS.md:4323 |
| 4. Scope decision (make this call first) | docs/roadmap/MINDMAP_PLAN.md:119 |
| 4. The backend, made revolutionary (and still SQLite, still offline) | docs/roadmap/WORLD_CLASS_PLAN.md:472 |
| 4. The decision to make first: the editing surface | docs/roadmap/DOCUMENTS_PLAN.md:108 |
| 4. The eval sets this implies for Brief 39 step 10 | docs/roadmap/CHAT_PLAN.md:1461 |
| 4. What it does worse than us | docs/roadmap/ANALYSIS.md:2551 |
| 4a. A real whiteboard, not just a bigger sketch | docs/roadmap/BACKLOG.md:271 |
| 4b. Templates and base layouts (boards, maps, documents) | docs/roadmap/BACKLOG.md:283 |
| 5. Abilities without AI (the app must be excellent with the model off) | docs/roadmap/WORLD_CLASS_PLAN.md:666 |
| 5. Build first: fifteen capabilities by value over cost | docs/roadmap/CHAT_PLAN.md:1502 |
| 5. Connection points and constraints | docs/roadmap/WHITEBOARD_PLAN.md:1088 |
| 5. Documents | docs/roadmap/BACKLOG.md:287 |
| 5. Features by surface, not covered before | docs/roadmap/ANALYSIS.md:4355 |
| 5. Phases | docs/roadmap/CHAT_PLAN.md:321 |
| 5. Phases | docs/roadmap/GRAPH_PLAN.md:95 |
| 5. Phases | docs/roadmap/TIMELINE_PLAN.md:114 |
| 5. Phases | docs/roadmap/WHITEBOARD_PLAN.md:488 |
| 5. Phases with gates | docs/roadmap/CHAT_PLAN.md:1629 |
| 5. Ship order (suggested sprints, each ends green + measured) | docs/roadmap/PLAN.md:114 |
| 5. The feature set, in build order | docs/roadmap/MINDMAP_PLAN.md:156 |
| 5. The phases | docs/roadmap/DOCUMENTS_PLAN.md:160 |
| 5. Traps | docs/roadmap/SESSION_BRIEFS.md:1052 |
| 5. Warnings: bug classes, not features to copy | docs/roadmap/ANALYSIS.md:2576 |
| 59. Three sibling repos, read and triaged, claude-obsidian, cognee, graphify | docs/roadmap/ANALYSIS.md:729 |
| 6. Competitor matrix (what the plan takes from whom) | docs/roadmap/DOCUMENTS_PLAN.md:482 |
| 6. Consistency rules | docs/roadmap/CHAT_PLAN.md:523 |
| 6. Consistency rules | docs/roadmap/TIMELINE_PLAN.md:138 |
| 6. Consistency rules | docs/roadmap/WHITEBOARD_PLAN.md:522 |
| 6. Consistency rules (learnability) | docs/roadmap/GRAPH_PLAN.md:161 |
| 6. Files this will touch | docs/roadmap/MINDMAP_PLAN.md:240 |
| 6. Layers and pages | docs/roadmap/WHITEBOARD_PLAN.md:1102 |
| 6. Measuring "professional" without telemetry | docs/roadmap/WORLD_CLASS_PLAN.md:713 |
| 6. Not verified | docs/roadmap/CHAT_PLAN.md:1640 |
| 6. OpenAI-compatible backends: **done** | docs/roadmap/BACKLOG.md:389 |
| 6. Rows added after this brief (the owner's later asks land here) | docs/roadmap/SESSION_BRIEFS.md:1062 |
| 6. Semantic search and the knowledge graph, "the ultimate upgrade" | docs/roadmap/PLAN.md:128 |
| 6. The companion and device pairing | docs/roadmap/ANALYSIS.md:4384 |
| 60. Odysseus, re-read: the repo tripled in size, and this time the question was answered from its own words | docs/roadmap/ANALYSIS.md:839 |
| 62. Extract notes: from the Writing Room, Documents, and Graph selections | docs/roadmap/BACKLOG.md:2060 |
| 63. Ship a starter skills library, DONE, this claim was stale | docs/roadmap/BACKLOG.md:2074 |
| 64. Documents editor: built, moved to HISTORY.md | docs/roadmap/BACKLOG.md:2078 |
| 65. Highlight/web-clip capture | docs/roadmap/BACKLOG.md:2083 |
| 66. Kortex.co, read and triaged, and the second-frontend question decided | docs/roadmap/ANALYSIS.md:959 |
| 7. Acceptance | docs/roadmap/MINDMAP_PLAN.md:255 |
| 7. Deepened 2026-10-10: the deterministic features (Brief 72b, decision 71) | docs/roadmap/CHAT_PLAN.md:1644 |
| 7. Design system | docs/roadmap/ANALYSIS.md:4401 |
| 7. Desktop packaging | docs/roadmap/BACKLOG.md:393 |
| 7. Files this will touch | docs/roadmap/DOCUMENTS_PLAN.md:506 |
| 7. Not verified until built | docs/roadmap/CHAT_PLAN.md:531 |
| 7. Not verified until built | docs/roadmap/GRAPH_PLAN.md:170 |
| 7. Not verified until built | docs/roadmap/TIMELINE_PLAN.md:147 |
| 7. Not verified until built | docs/roadmap/WHITEBOARD_PLAN.md:528 |
| 7. Shape libraries and the stencil format | docs/roadmap/WHITEBOARD_PLAN.md:1118 |
| 7. Startup and thermal behaviour (reported: "fan noticeably speeds up when starting") | docs/roadmap/PLAN.md:147 |
| 7. The small things (a checklist that sessions keep reopening) | docs/roadmap/WORLD_CLASS_PLAN.md:740 |
| 7.1 The top risks, and how to de-risk each | docs/roadmap/MODERNISATION_AUDIT.md:1429 |
| 7.2 The moat, in three strategies | docs/roadmap/MODERNISATION_AUDIT.md:1441 |
| 7.3 Metrics: north star and phase KPIs, with no telemetry | docs/roadmap/MODERNISATION_AUDIT.md:1463 |
| 75. Voice memos: capture, storage, playback, and a dedicated library page | docs/roadmap/BACKLOG.md:2109 |
| 76. Keyword-only note filing while the AI is unavailable, flagged for later AI review | docs/roadmap/BACKLOG.md:2132 |
| 77. Notes-tab pagination and page-aware note links | docs/roadmap/BACKLOG.md:2139 |
| 78. Whether the backend needs more concurrency than it already has | docs/roadmap/BACKLOG.md:2220 |
| 79. Linux release packaging: done; macOS still open | docs/roadmap/BACKLOG.md:2229 |
| 79b. New items, raised by the §85/§86 audit, not yet triaged | docs/roadmap/BACKLOG.md:2260 |
| 8. Acceptance for the whole plan | docs/roadmap/DOCUMENTS_PLAN.md:516 |
| 8. Dashboard | docs/roadmap/PLAN.md:176 |
| 8. Deepened 2026-10-10: chat access to information (Brief 72b, decision 71) | docs/roadmap/CHAT_PLAN.md:1676 |
| 8. Execution order for the coming week (Opus/Sonnet sessions) | docs/roadmap/WORLD_CLASS_PLAN.md:791 |
| 8. Open bug list | docs/roadmap/BACKLOG.md:491 |
| 8. Research: tldraw, Excalidraw, Miro, FigJam, and what it changes here | docs/roadmap/WHITEBOARD_PLAN.md:560 |
| 8. Research: what the reference products actually do, and what it changes here | docs/roadmap/CHAT_PLAN.md:538 |
| 8. Research: what the reference products do, and what it changes here | docs/roadmap/TIMELINE_PLAN.md:174 |
| 8. Risks | docs/roadmap/MINDMAP_PLAN.md:268 |
| 8. Templates | docs/roadmap/WHITEBOARD_PLAN.md:1195 |
| 8. The strongest things worth taking, ranked | docs/roadmap/ANALYSIS.md:4433 |
| 8b. Web search: two Windows bugs found, and what is left | docs/roadmap/BACKLOG.md:525 |
| 9. Built: Phase 1 (backend) | docs/roadmap/MINDMAP_PLAN.md:291 |
| 9. Declined, with why | docs/roadmap/ANALYSIS.md:4453 |
| 9. Deepened 2026-10-10: the Guide (Brief 72b, decisions 59 and 71) | docs/roadmap/CHAT_PLAN.md:1704 |
| 9. Find and replace | docs/roadmap/WHITEBOARD_PLAN.md:1204 |
| 9. Notes (capture + list) | docs/roadmap/PLAN.md:186 |
| 9. On testing with a real model in the sandbox | docs/roadmap/WORLD_CLASS_PLAN.md:847 |
| 9. Phase 5: the calendar as the third view (Fable, 2026-10-10; WORLD_CLASS_PLAN 25, decision 47; Brief 55) | docs/roadmap/TIMELINE_PLAN.md:207 |
| 9. Risks | docs/roadmap/DOCUMENTS_PLAN.md:528 |
| 9. The graph: make it a tool, and give it a look | docs/roadmap/BACKLOG.md:574 |
| A real, narrow bug this comparison surfaced | docs/roadmap/ANALYSIS.md:891 |
| A. Bugs and fixes first (INBOX, Fable or Sonnet, one day) | docs/roadmap/SESSION_BRIEFS.md:667 |
| A. Bugs that had gone unnoticed (found this session) | docs/roadmap/AUDIT.md:20 |
| A. Model and backend | docs/roadmap/BACKLOG.md:2363 |
| A. UI design and visual consistency | docs/roadmap/MODERNISATION_AUDIT.md:264 |
| A1 · One component family has up to 22 recipes on a single screen, Critical | docs/roadmap/MODERNISATION_AUDIT.md:266 |
| A2 · Glass and shadow scale with content, not with structure, High | docs/roadmap/MODERNISATION_AUDIT.md:294 |
| A3 · The design system documents a fix that never reached three named controls, Medium | docs/roadmap/MODERNISATION_AUDIT.md:326 |
| A4 · Not a finding, recorded so the next sweep stops flagging it | docs/roadmap/MODERNISATION_AUDIT.md:346 |
| Acceptance | docs/roadmap/AGENT_SKILLS_REFORM.md:155 |
| Added after the first night (by direct instruction) | docs/roadmap/FABLE_BRIEF.md:24 |
| Adopted this session | docs/roadmap/ANALYSIS.md:298 |
| After the bugs: the parity programme (the owner, 2026-10-10) | docs/ROADMAP.md:132 |
| Architecture review, 2026-09-24 (INBOX 400, asked for directly) | docs/roadmap/ANALYSIS.md:3755 |
| Asked for this session, not yet built | docs/roadmap/BACKLOG.md:310 |
| Audio in the notebook: the architecture decided 2026-09-21, the build deferred | docs/roadmap/WORLD_CLASS_PLAN.md:2135 |
| Audio notes and meetings, against soundcraft | docs/roadmap/ANALYSIS.md:4077 |
| Audit, 2026-09-13 night (INBOX 209: "poke holes in this application") | docs/roadmap/WORLD_CLASS_PLAN.md:783 |
| B. Documents (DOCUMENTS_PLAN), the owner's first priority | docs/roadmap/SESSION_BRIEFS.md:678 |
| B. Retrieval and context: where the real quality ceiling is | docs/roadmap/BACKLOG.md:2388 |
| B. Schema and backend: what a professional backend would change | docs/roadmap/AUDIT.md:41 |
| B. UX, feedback states and accessibility | docs/roadmap/MODERNISATION_AUDIT.md:364 |
| B1 The event log: every change is a fact, the tables are views | docs/roadmap/WORLD_CLASS_PLAN.md:478 |
| B1 · Three quarters of a phone screen is chrome, Critical | docs/roadmap/MODERNISATION_AUDIT.md:366 |
| B2 The job runtime: durable, resumable, observable | docs/roadmap/WORLD_CLASS_PLAN.md:535 |
| B2 · The note card's actions sit on top of the note's text on touch, High, and new | docs/roadmap/MODERNISATION_AUDIT.md:389 |
| B3 The retrieval engine: one index, three signals, explained | docs/roadmap/WORLD_CLASS_PLAN.md:541 |
| B3 · There is no viewport below 600 px in the entire stylesheet, High | docs/roadmap/MODERNISATION_AUDIT.md:408 |
| B4 The knowledge kernel: entities, claims, links, tensions | docs/roadmap/WORLD_CLASS_PLAN.md:567 |
| B4 · Every counted metric is identical at 1024 and 1440, Medium | docs/roadmap/MODERNISATION_AUDIT.md:419 |
| B5 The AI harness: plan, act, verify, budget, learn | docs/roadmap/WORLD_CLASS_PLAN.md:599 |
| B5 · Accessibility, better than the codebase's reputation, with three real gaps, Medium | docs/roadmap/MODERNISATION_AUDIT.md:432 |
| B6 Local-first sync (L, later; design now) | docs/roadmap/WORLD_CLASS_PLAN.md:631 |
| B6 · Designed states: Medium | docs/roadmap/MODERNISATION_AUDIT.md:454 |
| B7 The API contract | docs/roadmap/WORLD_CLASS_PLAN.md:642 |
| B8 Extensions | docs/roadmap/WORLD_CLASS_PLAN.md:654 |
| Brief 10 (Fri, Sonnet): Library one card recipe, Dashboard widget frame | docs/roadmap/SESSION_BRIEFS.md:399 |
| Brief 11: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:426 |
| Brief 12: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:428 |
| Brief 13 (Sun, Opus): the harness verifier, budget and corrections (B5) | docs/roadmap/SESSION_BRIEFS.md:430 |
| Brief 14 (Sun, Sonnet): the docs, condensed | docs/roadmap/SESSION_BRIEFS.md:443 |
| Brief 15: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:460 |
| Brief 16 (any day, Sonnet): the documentation, refined | docs/roadmap/SESSION_BRIEFS.md:507 |
| Brief 17 (any day, Opus): the launchers, the uninstallers and the splash, made impressive | docs/roadmap/SESSION_BRIEFS.md:549 |
| Brief 18 (the next session, Fable orchestrating): the complete open scope | docs/roadmap/SESSION_BRIEFS.md:660 |
| Brief 19: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:732 |
| Brief 1: W3-1: one visibility-aware scheduler (PLAN P1) | docs/roadmap/MODERNISATION_AUDIT.md:1111 |
| Brief 1: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:70 |
| Brief 2 (Mon, Sonnet): the consistency lints | docs/roadmap/SESSION_BRIEFS.md:72 |
| Brief 20: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:734 |
| Brief 21: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:736 |
| Brief 22: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:738 |
| Brief 23: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:740 |
| Brief 24: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:742 |
| Brief 25 (Opus): TIMELINE Phases 1 to 4 | docs/roadmap/SESSION_BRIEFS.md:767 |
| Brief 26 (Opus): CHAT Phases 2 and 3 | docs/roadmap/SESSION_BRIEFS.md:779 |
| Brief 27 (Opus): UI Phase 11, the phone | docs/roadmap/SESSION_BRIEFS.md:792 |
| Brief 28 (Opus): DOCUMENTS Phases 5 to 8 | docs/roadmap/SESSION_BRIEFS.md:802 |
| Brief 29 (Opus): GRAPH Phase 4 part two, the local pane | docs/roadmap/SESSION_BRIEFS.md:811 |
| Brief 2: W2-1: collapse the Notes chrome stack | docs/roadmap/MODERNISATION_AUDIT.md:1157 |
| Brief 3 (Tue, Sonnet): `prefs`, `api.stream/upload`, the two `innerHTML`s | docs/roadmap/SESSION_BRIEFS.md:117 |
| Brief 30 (Opus): MINDMAP section 12 | docs/roadmap/SESSION_BRIEFS.md:837 |
| Brief 31 (Opus or Sonnet): SKILLS Phase D, recovery | docs/roadmap/SESSION_BRIEFS.md:844 |
| Brief 32 (Opus): templates and base layouts, for boards, maps and documents | docs/roadmap/SESSION_BRIEFS.md:891 |
| Brief 33 (the PR after #144, Fable orchestrating): the rest of WORLD_CLASS_PLAN, every untouched plan, then professional use | docs/roadmap/SESSION_BRIEFS.md:850 |
| Brief 34 (Opus, two agents): characters, the faces, the companion and Atlas, to the end | docs/roadmap/SESSION_BRIEFS.md:952 |
| Brief 34 continues (Opus, high): Atlas and the companion | docs/roadmap/SESSION_BRIEFS.md:1390 |
| Brief 35 (Opus, high): the Gemini branch triaged | docs/roadmap/SESSION_BRIEFS.md:1247 |
| Brief 36 (Opus, high): whiteboard and mind map | docs/roadmap/SESSION_BRIEFS.md:1259 |
| Brief 37 (Opus, high): Chat, Ask, first run and the owner's UI bugs | docs/roadmap/SESSION_BRIEFS.md:1270 |
| Brief 38 (Opus, high): the graph, topics first-class, note properties | docs/roadmap/SESSION_BRIEFS.md:1283 |
| Brief 39 (Opus, high): the deterministic engine | docs/roadmap/SESSION_BRIEFS.md:1290 |
| Brief 39b (Opus, high): filing and the taxonomy | docs/roadmap/SESSION_BRIEFS.md:1305 |
| Brief 3: W4-1: the error contract (PLAN B3) | docs/roadmap/MODERNISATION_AUDIT.md:1199 |
| Brief 4 (Tue, Sonnet): Settings two-pane, and the last 54 paragraphs | docs/roadmap/SESSION_BRIEFS.md:168 |
| Brief 40 (Sonnet, medium; Haiku for the placement pass): research and placement | docs/roadmap/SESSION_BRIEFS.md:1315 |
| Brief 41 (Opus, high): UI density, refinement and WCAG 2.2 | docs/roadmap/SESSION_BRIEFS.md:1341 |
| Brief 42 (Opus, high): documents | docs/roadmap/SESSION_BRIEFS.md:1351 |
| Brief 43 (Opus, high; Sonnet medium for the fixes it names): the expert audit | docs/roadmap/SESSION_BRIEFS.md:1406 |
| Brief 44 (Sonnet high for the catalogue and converter; Opus high for the editor phases): the draw.io programme | docs/roadmap/SESSION_BRIEFS.md:1447 |
| Brief 45 (Sonnet medium for the census; Opus high for the review): structure and complexity | docs/roadmap/SESSION_BRIEFS.md:1496 |
| Brief 46 (Sonnet, medium): measure the table | docs/roadmap/SESSION_BRIEFS.md:1526 |
| Brief 47 (Opus, high): search everywhere (25a, decision 46) | docs/roadmap/SESSION_BRIEFS.md:1536 |
| Brief 48 (Opus, high): import and export round trip (25b) | docs/roadmap/SESSION_BRIEFS.md:1541 |
| Brief 49 (Opus, high): first run and the manual (25c) | docs/roadmap/SESSION_BRIEFS.md:1546 |
| Brief 4: W1-3: glass as shell furniture, with an O(1) invariant | docs/roadmap/MODERNISATION_AUDIT.md:1243 |
| Brief 5 (Wed, Opus): the Timeline, Phases 1 and 2 | docs/roadmap/SESSION_BRIEFS.md:216 |
| Brief 50 (Sonnet, high): the PWA shell (25d, decision 49) | docs/roadmap/SESSION_BRIEFS.md:1550 |
| Brief 51 (Opus, high): never lose a note (25e, decision 48; rule 1.8) | docs/roadmap/SESSION_BRIEFS.md:1554 |
| Brief 52 (Opus, high): settings as a product (25f, decision 52) | docs/roadmap/SESSION_BRIEFS.md:1559 |
| Brief 53 (Sonnet, high): budgets per interaction (25g, decision 54) | docs/roadmap/SESSION_BRIEFS.md:1563 |
| Brief 54 (Opus, high): skill reliability (AGENT_SKILLS_REFORM Phase E) | docs/roadmap/SESSION_BRIEFS.md:1567 |
| Brief 55 (Opus, high): the calendar view (TIMELINE_PLAN Phase 5) | docs/roadmap/SESSION_BRIEFS.md:1571 |
| Brief 56 (Sonnet, medium): measure the design review | docs/roadmap/SESSION_BRIEFS.md:1580 |
| Brief 57 (Opus, high): the stylesheet's grammar (13a) | docs/roadmap/SESSION_BRIEFS.md:1588 |
| Brief 58 (Opus, high): the stylesheet's structure (13b) | docs/roadmap/SESSION_BRIEFS.md:1592 |
| Brief 59 (Opus, high): the surfaces (13c) | docs/roadmap/SESSION_BRIEFS.md:1596 |
| Brief 5: W2-3: the note card's actions stop covering its text on touch | docs/roadmap/MODERNISATION_AUDIT.md:1281 |
| Brief 6 (Wed, Opus): pagination on all 25 lists, and one scheduler | docs/roadmap/SESSION_BRIEFS.md:265 |
| Brief 60 (Sonnet, medium): measure and the three ratchets (26.0, 26a) | docs/roadmap/SESSION_BRIEFS.md:1606 |
| Brief 61 (Opus, high): services for whiteboard and files (26b) | docs/roadmap/SESSION_BRIEFS.md:1618 |
| Brief 62 (Opus, high): data out of code (26c) | docs/roadmap/SESSION_BRIEFS.md:1622 |
| Brief 63 (Opus, high): the runners and the embedder (26d) | docs/roadmap/SESSION_BRIEFS.md:1627 |
| Brief 64 (Sonnet, medium): measure the foundation (F0) | docs/roadmap/SESSION_BRIEFS.md:1634 |
| Brief 65 (Opus, high): the recogniser and the reading (F1) | docs/roadmap/SESSION_BRIEFS.md:1643 |
| Brief 66 (Opus, high): quick add and the palette (F2) | docs/roadmap/SESSION_BRIEFS.md:1653 |
| Brief 67 (Opus, high): the realiser, the validators and the acts (F3) | docs/roadmap/SESSION_BRIEFS.md:1662 |
| Brief 68 (Opus, high): the surfaces (F4, after 65 to 67) | docs/roadmap/SESSION_BRIEFS.md:1669 |
| Brief 69 (Opus, high): run, preview and test (I1) | docs/roadmap/SESSION_BRIEFS.md:1678 |
| Brief 6: W8-1: the audit scripts become the e2e suite | docs/roadmap/MODERNISATION_AUDIT.md:1310 |
| Brief 70 (Opus, high): the debugger (I2) | docs/roadmap/SESSION_BRIEFS.md:1686 |
| Brief 71 (Opus, high): the IDE shell (I3) | docs/roadmap/SESSION_BRIEFS.md:1693 |
| Brief 75 (Sonnet, high): every vendored library at full use (INBOX 751) | docs/roadmap/SESSION_BRIEFS.md:1703 |
| Brief 7: W5-4: `ai/scheduler.py`, one gate in front of every model call | docs/roadmap/MODERNISATION_AUDIT.md:1347 |
| Brief 7: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:310 |
| Brief 8 (Thu, Opus): `[[` autocomplete and the connections rail | docs/roadmap/SESSION_BRIEFS.md:312 |
| Brief 84 (Opus, high): Atlas everywhere (F5, after 68) | docs/roadmap/SESSION_BRIEFS.md:1723 |
| Brief 8: W1-4: the three 18.4px switches, and making DESIGN.md true | docs/roadmap/MODERNISATION_AUDIT.md:1392 |
| Brief 9 (Fri, Opus): the job runtime (B2) and thread isolation | docs/roadmap/SESSION_BRIEFS.md:358 |
| Briefs 25 to 31: the plans the owner asked to see finished | docs/roadmap/SESSION_BRIEFS.md:744 |
| Briefs 35 to 42 (2026-10-10, Fable orchestrating): the owner's list, the engine, the direction | docs/roadmap/SESSION_BRIEFS.md:1238 |
| Briefs 46 to 55 (2026-10-10, Fable): the whole app against world class | docs/roadmap/SESSION_BRIEFS.md:1520 |
| Briefs 56 to 59 (2026-10-10, Fable): the design review | docs/roadmap/SESSION_BRIEFS.md:1575 |
| Briefs 60 to 63 (2026-10-10, Fable): the backend review | docs/roadmap/SESSION_BRIEFS.md:1601 |
| Briefs 64 to 68 (CHAT_PLAN "The deterministic foundation") | docs/roadmap/SESSION_BRIEFS.md:1632 |
| Briefs 69 to 71 (DOCUMENTS_PLAN 23: the IDE; after Brief 42) | docs/roadmap/SESSION_BRIEFS.md:1676 |
| Briefs 72 to 74 (WORLD_CLASS_PLAN 28: the trust contract) | docs/roadmap/SESSION_BRIEFS.md:1700 |
| Briefs 76 onward (from Briefs 72a and 72b) | docs/roadmap/SESSION_BRIEFS.md:1706 |
| Bugs | docs/roadmap/CHAT_PLAN.md:831 |
| Bugs | docs/roadmap/DOCUMENTS_PLAN.md:1534 |
| Bugs | docs/roadmap/TIMELINE_PLAN.md:202 |
| Bugs | docs/roadmap/UI_MODERNISATION_PLAN.md:1284 |
| Bugs | docs/roadmap/WORLD_CLASS_PLAN.md:3084 |
| Build first | docs/roadmap/WHITEBOARD_PLAN.md:1376 |
| Built, 2026-09-09: one surface per panel, and the Arrange section | docs/roadmap/WHITEBOARD_PLAN.md:437 |
| Built, Phase 1 (the chrome), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:567 |
| Built, Phase 2 (the space) | docs/roadmap/GRAPH_PLAN.md:202 |
| Built, Phase 2 step 1 (the engine, vendored and verified under the CSP), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:571 |
| Built, Phase 2 steps 2 to 4 (the engine under the editor), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:575 |
| Built, Phase 3 (colour rules and groups), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:194 |
| Built, Phase 3 (tables, blocks, embeds, properties, columns), 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:583 |
| Built, Phase 4 (utility), part one, 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:186 |
| Built, Phase 4 (utility), part two: the local map, 2026-09-13 | docs/roadmap/GRAPH_PLAN.md:190 |
| Built, Phase 5 (backend), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:182 |
| Built, Phase 6 (the node panel), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:178 |
| Built, second sitting | docs/roadmap/UI_MODERNISATION_PLAN.md:537 |
| Built, the sidebar redesign (INBOX 115), 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:1446 |
| Built: Phase 0 | docs/roadmap/DOCUMENTS_PLAN.md:579 |
| Built: Phase 1 (the canvas renderer and physical drag) | docs/roadmap/GRAPH_PLAN.md:198 |
| Built: Phase 9 | docs/roadmap/UI_MODERNISATION_PLAN.md:581 |
| Built: Phase C, the run as a readable object | docs/roadmap/AGENT_SKILLS_REFORM.md:172 |
| Built: Phases A and B, backend only | docs/roadmap/AGENT_SKILLS_REFORM.md:168 |
| Built: items 1, 3, 4 and 5 | docs/roadmap/UI_MODERNISATION_PLAN.md:262 |
| C. Capture: the half the app is named for | docs/roadmap/BACKLOG.md:2412 |
| C. Frontend architecture and code quality | docs/roadmap/MODERNISATION_AUDIT.md:462 |
| C. Graph (GRAPH_PLAN), the owner's second priority | docs/roadmap/SESSION_BRIEFS.md:691 |
| C. Whiteboard: sub-par against Miro / FigJam / tldraw (after this session's fixes) | docs/roadmap/AUDIT.md:62 |
| C1 · `app.js` is the architecture, and it is 26,113 lines, Critical | docs/roadmap/MODERNISATION_AUDIT.md:464 |
| C2 · Four kinds of state, no store, High | docs/roadmap/MODERNISATION_AUDIT.md:496 |
| C3 · Everything is loaded on every boot, Medium | docs/roadmap/MODERNISATION_AUDIT.md:515 |
| C4 · Static assets are `no-cache`, and the version stamp cannot make them `immutable`, Medium | docs/roadmap/MODERNISATION_AUDIT.md:536 |
| Candidate libraries | docs/roadmap/ANALYSIS.md:4197 |
| Composer decisions, taken with the owner, 2026-10-06 | docs/roadmap/CHAT_PLAN.md:802 |
| D. Backend architecture and reliability | docs/roadmap/MODERNISATION_AUDIT.md:550 |
| D. Chat (CHAT_PLAN), folded with the owner's reports | docs/roadmap/SESSION_BRIEFS.md:696 |
| D. Documents: sub-par against Obsidian / Typora / iA Writer | docs/roadmap/AUDIT.md:78 |
| D. Trust and safety | docs/roadmap/BACKLOG.md:2432 |
| D1 Dashboard (M, Sonnet after a Fable/Opus design pass) | docs/roadmap/WORLD_CLASS_PLAN.md:295 |
| D1 · Errors are not a contract, and nothing catches what falls through, High | docs/roadmap/MODERNISATION_AUDIT.md:552 |
| D10 Documents and PDFs (L, see DOCUMENTS_PLAN.md; add PDF annotation as | docs/roadmap/WORLD_CLASS_PLAN.md:412 |
| D11 Whiteboard and mind maps (M, in progress; then MINDMAP_PLAN Phases | docs/roadmap/WORLD_CLASS_PLAN.md:417 |
| D12 Graph (L, GRAPH_PLAN.md) | docs/roadmap/WORLD_CLASS_PLAN.md:422 |
| D13 Settings (M, Sonnet) | docs/roadmap/WORLD_CLASS_PLAN.md:426 |
| D14 Help, onboarding and the command palette (S, Sonnet) | docs/roadmap/WORLD_CLASS_PLAN.md:438 |
| D15 The shell: top bar, tab bar, bottom bar, sidebars (M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:451 |
| D16 Write with AI, the writing desk (M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:462 |
| D2 Notes: list, capture, edit (L, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:315 |
| D2 · Long work has no queue, no persistence and no resume, High | docs/roadmap/MODERNISATION_AUDIT.md:565 |
| D3 Chat (M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:323 |
| D3 · FTS5 exists for notes only; everything else is still a scan, Medium | docs/roadmap/MODERNISATION_AUDIT.md:580 |
| D4 Library (M, Sonnet) | docs/roadmap/WORLD_CLASS_PLAN.md:338 |
| D4 · Pagination is one-third done, Medium | docs/roadmap/MODERNISATION_AUDIT.md:596 |
| D5 Properties and tags (M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:352 |
| D5 · The OpenAPI schema is served to anyone who can reach the port, Medium | docs/roadmap/MODERNISATION_AUDIT.md:609 |
| D6 Daily notes and the journal (S, Sonnet) | docs/roadmap/WORLD_CLASS_PLAN.md:368 |
| D6 · What is *already right*, so nobody re-does it | docs/roadmap/MODERNISATION_AUDIT.md:624 |
| D7 Timeline (L, in progress: see TIMELINE_PLAN.md) | docs/roadmap/WORLD_CLASS_PLAN.md:393 |
| D8 Reminders (S, Sonnet) | docs/roadmap/WORLD_CLASS_PLAN.md:397 |
| D9 Links and the web clipper (M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:408 |
| Decided, 2026-09-12: what a Files row is for (do not remake) | docs/roadmap/UI_MODERNISATION_PLAN.md:302 |
| Decided, 2026-09-12: what the bottom of a picture card is (do not remake) | docs/roadmap/UI_MODERNISATION_PLAN.md:325 |
| Decided, 2026-09-13: how the page reader is reached (do not remake) | docs/roadmap/UI_MODERNISATION_PLAN.md:266 |
| Decision changed, 2026-09-09: a drag places, Shift pins | docs/roadmap/GRAPH_PLAN.md:292 |
| Decision made, 2026-09-13: a Show switch that is off means absent | docs/roadmap/GRAPH_PLAN.md:273 |
| Decision made, 2026-09-20: three of the six options sections are folds | docs/roadmap/GRAPH_PLAN.md:243 |
| Decision made, 2026-09-21: a restored view holds, it does not re-settle | docs/roadmap/GRAPH_PLAN.md:335 |
| Decision made, 2026-09-24: similarity is each note's two closest matches | docs/roadmap/GRAPH_PLAN.md:358 |
| Decision made, 2026-09-26: the hubs are named, over a dot if they must be | docs/roadmap/GRAPH_PLAN.md:387 |
| Decision made, 2026-10-03: the shape follows the links, and the unlinked sit on a ring | docs/roadmap/GRAPH_PLAN.md:413 |
| Decision made, 2026-10-04: a Display fold | docs/roadmap/GRAPH_PLAN.md:462 |
| Decision made, 2026-10-04: a Filter fold | docs/roadmap/GRAPH_PLAN.md:475 |
| Decision made, 2026-10-04: names on plates, clear of lines, and a calmer palette | docs/roadmap/GRAPH_PLAN.md:441 |
| Decision made, 2026-10-05: one PageRank, the map's | docs/roadmap/GRAPH_PLAN.md:483 |
| Decision made, 2026-10-10: a category is where a note is filed, a topic is what its links say it is about | docs/roadmap/GRAPH_PLAN.md:565 |
| Decisions left to the owner | docs/roadmap/ANALYSIS.md:3722 |
| Decisions made | docs/roadmap/AGENT_SKILLS_REFORM.md:141 |
| Decisions made | docs/roadmap/MINDMAP_PLAN.md:911 |
| Decisions made | docs/roadmap/UI_MODERNISATION_PLAN.md:70 |
| Decisions made | docs/roadmap/UI_MODERNISATION_PLAN.md:1174 |
| Decisions made | docs/roadmap/WORLD_CLASS_PLAN.md:2232 |
| Decisions made (do not re-decide) | docs/roadmap/DOCUMENTS_PLAN.md:1290 |
| Decisions made (do not re-decide) | docs/roadmap/TIMELINE_PLAN.md:214 |
| Decisions made, 2026-10-05: draw.io phase 2 (wb-phase2) | docs/roadmap/WHITEBOARD_PLAN.md:359 |
| Decisions made, 2026-10-05: the draw.io pass (INBOX 557, 558) | docs/roadmap/WHITEBOARD_PLAN.md:295 |
| Decisions, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:1427 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/UI_MODERNISATION_PLAN.md:1040 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:1487 |
| Deepened 2026-10-10 (Brief 72a, decision 71) | docs/roadmap/WHITEBOARD_PLAN.md:1501 |
| Deepened 2026-10-10: statistics (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1483 |
| Deepened 2026-10-10: the agent and its harness (Brief 72b, decision 71) | docs/roadmap/AGENT_SKILLS_REFORM.md:424 |
| Deepened 2026-10-10: the command palette and Find anything (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1540 |
| Deepened 2026-10-10: utilities (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1514 |
| Deliberately not on this list | docs/roadmap/BACKLOG.md:2488 |
| Design requests | docs/roadmap/CHAT_PLAN.md:882 |
| Design requests | docs/roadmap/DOCUMENTS_PLAN.md:1545 |
| Design requests | docs/roadmap/UI_MODERNISATION_PLAN.md:1303 |
| Design requests | docs/roadmap/WORLD_CLASS_PLAN.md:3101 |
| Deta Surf (deta) | docs/roadmap/ANALYSIS.md:2038 |
| Diagrams: mermaid as the interchange format | docs/roadmap/BACKLOG.md:2543 |
| Direction, 2026-10-10 (Fable orchestrating): the thesis, the policies, the tracks | docs/ROADMAP.md:26 |
| Documents (code), against VS Code's editor features | docs/roadmap/ANALYSIS.md:3940 |
| Documents (prose), against wordcraft | docs/roadmap/ANALYSIS.md:3897 |
| E. App-wide usability and accessibility, the things that read as "side project" | docs/roadmap/AUDIT.md:95 |
| E. Local AI: where it is overused or misused | docs/roadmap/MODERNISATION_AUDIT.md:640 |
| E. Polish worth doing as one pass | docs/roadmap/BACKLOG.md:2451 |
| E. Whiteboard (WHITEBOARD_PLAN Phase 1) and mind maps (MINDMAP §12) | docs/roadmap/SESSION_BRIEFS.md:702 |
| E1 · A step is a turn, not a goal, Critical (reasoned) | docs/roadmap/MODERNISATION_AUDIT.md:645 |
| E2 · The complexity of the AI path is where the next bug will be, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:653 |
| E3 · Model calls are scattered across request handlers, background threads and module singletons, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:666 |
| E4 · The honest positives, so the section is not one-sided (read) | docs/roadmap/MODERNISATION_AUDIT.md:676 |
| Earlier sessions | docs/roadmap/HANDOVER.md:523 |
| Expert audit, 2026-10-10 | docs/roadmap/BACKLOG.md:4269 |
| F. Agent harness: what "ultimate" needs that is not there | docs/roadmap/AUDIT.md:113 |
| F. Library, dashboard, settings | docs/roadmap/SESSION_BRIEFS.md:707 |
| F. Performance and perceived speed | docs/roadmap/MODERNISATION_AUDIT.md:685 |
| F1 · Boot is ~1 s and tab switches are ~10–50 ms. The app is not slow; it is *heavy*: Medium | docs/roadmap/MODERNISATION_AUDIT.md:687 |
| F2 · Fourteen requests in sixty idle seconds, from three separate timers, High | docs/roadmap/MODERNISATION_AUDIT.md:708 |
| F3 · List rendering is solved; list *fetching* is not, Medium | docs/roadmap/MODERNISATION_AUDIT.md:733 |
| Fable's working notes for Opus (2026-09-09 05:10 UTC) | docs/roadmap/HANDOVER.md:178 |
| Found by an agent while measuring something else (2026-09-08, graph) | docs/roadmap/CHAT_PLAN.md:589 |
| G. Mobile and responsive | docs/roadmap/MODERNISATION_AUDIT.md:743 |
| G. Test-suite gaps | docs/roadmap/AUDIT.md:123 |
| G. The plans' own remainders | docs/roadmap/SESSION_BRIEFS.md:712 |
| G1 · Primary navigation scrolls off the phone screen, High | docs/roadmap/MODERNISATION_AUDIT.md:748 |
| G2 · The category sidebar becomes a 182 px banner, Medium | docs/roadmap/MODERNISATION_AUDIT.md:761 |
| Gates | docs/roadmap/TIMELINE_PLAN.md:236 |
| Guides: curated instructions the AI writes to | docs/roadmap/BACKLOG.md:2505 |
| H. Missing table stakes, security and privacy | docs/roadmap/MODERNISATION_AUDIT.md:768 |
| H. Suggested order (feeds PLAN.md's sprints) | docs/roadmap/AUDIT.md:162 |
| H1 The night shift, finished (I1 second pass; L, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1750 |
| H1 · Security posture is genuinely strong, recorded as a positive | docs/roadmap/MODERNISATION_AUDIT.md:770 |
| H2 Evidence cards and open questions (I6 then I3; L, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1766 |
| H2 · The gaps that are actually missing, High | docs/roadmap/MODERNISATION_AUDIT.md:795 |
| H3 The model bench (I8; M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1781 |
| H3 · Privacy is a claim without an artefact, Medium | docs/roadmap/MODERNISATION_AUDIT.md:806 |
| H4 The notebook as a local service for other agents (B7 and B8; M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1785 |
| H5 Sync without a server (B6; L, design first) | docs/roadmap/WORLD_CLASS_PLAN.md:1799 |
| H6 Professional use (the PR after 144; M, mixed) | docs/roadmap/WORLD_CLASS_PLAN.md:1811 |
| H7 The speed budget (A1 continued; S each) | docs/roadmap/WORLD_CLASS_PLAN.md:1856 |
| H8 Time travel and the margin reader (I5, I2; M each, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1885 |
| H9 Polish in use (the owner's question, 2026-09-14; S to M each) | docs/roadmap/WORLD_CLASS_PLAN.md:1899 |
| Harness robustness, 2026-10-04 (INBOX 527) | docs/roadmap/AGENT_SKILLS_REFORM.md:202 |
| Harper (Automattic) | docs/roadmap/ANALYSIS.md:1830 |
| Headroom: evaluated, not adopted | docs/roadmap/BACKLOG.md:710 |
| How far each plan actually is (honest, as of 2026-10-03) | docs/roadmap/HANDOVER.md:314 |
| How to proceed after PR 149 (the owner asked, 2026-09-14) | docs/roadmap/HANDOVER.md:477 |
| How to proceed after PR 149 (written 2026-09-14; the live order is CLAUDE.md standing order 1 and HANDOVER's Now line) | docs/ROADMAP.md:295 |
| How to read the evidence in here | docs/roadmap/MODERNISATION_AUDIT.md:23 |
| How to work on this repo | docs/ROADMAP.md:364 |
| I. Bug, security and complexity scan (asked for directly) | docs/roadmap/AUDIT.md:131 |
| I1 The night shift: the notebook that understands itself while you sleep | docs/roadmap/WORLD_CLASS_PLAN.md:1085 |
| I2 The margin reader: a second reader in the editor, from your own notes | docs/roadmap/WORLD_CLASS_PLAN.md:1160 |
| I3 Open questions: the notebook keeps a list of what you have not answered | docs/roadmap/WORLD_CLASS_PLAN.md:1164 |
| I4 Resurfacing: the ideas you are about to forget, when they matter | docs/roadmap/WORLD_CLASS_PLAN.md:1168 |
| I5 Time travel over meaning: what did I think about X in March? | docs/roadmap/WORLD_CLASS_PLAN.md:1174 |
| I6 Evidence cards: answers you can audit sentence by sentence | docs/roadmap/WORLD_CLASS_PLAN.md:1212 |
| I7 The corrections loop: every "no" makes the notebook better | docs/roadmap/WORLD_CLASS_PLAN.md:1216 |
| I8 The model bench: which local model is best on *your* notebook | docs/roadmap/WORLD_CLASS_PLAN.md:1268 |
| I9 What the notebook learned: one place to see, edit, delete and switch it all off | docs/roadmap/WORLD_CLASS_PLAN.md:1272 |
| Ideas | docs/roadmap/BACKLOG.md:4165 |
| Ideas | docs/roadmap/CHAT_PLAN.md:926 |
| Ideas | docs/roadmap/DOCUMENTS_PLAN.md:1556 |
| Ideas | docs/roadmap/WORLD_CLASS_PLAN.md:3126 |
| If Opus is the orchestrator (no Fable available) | docs/roadmap/HANDOVER.md:36 |
| Image notes and the Library, against photocraft and lightcraft | docs/roadmap/ANALYSIS.md:4044 |
| Is its backend better designed? No: and it says so about itself | docs/roadmap/ANALYSIS.md:857 |
| KnowNote (MrSibe) | docs/roadmap/ANALYSIS.md:1979 |
| Later: weeks 9–12+: "structure that lasts" | docs/roadmap/MODERNISATION_AUDIT.md:1064 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:476 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:760 |
| Looked at and not recommended | docs/roadmap/ANALYSIS.md:929 |
| Mind map, against designcraft's canvas and MINDMAP_PLAN's references | docs/roadmap/ANALYSIS.md:3858 |
| Next PR, first (the owner, 2026-10-05: "maybe push these to next pr at the top of the roadmap") | docs/ROADMAP.md:212 |
| Next up, ranked by what it unlocks | docs/ROADMAP.md:344 |
| Next: weeks 5–8: "a small model can finish a job, and so can the app" | docs/roadmap/MODERNISATION_AUDIT.md:1049 |
| Not in this plan | docs/roadmap/UI_MODERNISATION_PLAN.md:585 |
| Not verified, and to be taken first by whoever opens this | docs/roadmap/MINDMAP_PLAN.md:1428 |
| Now: weeks 0–4: "the app stops hiding its own content" | docs/roadmap/MODERNISATION_AUDIT.md:1034 |
| Odysseus read deeply, 2026-09-21 | docs/roadmap/ANALYSIS.md:2262 |
| Odysseus, fourth read 2026-10-10 (INBOX 747) | docs/roadmap/ANALYSIS.md:4233 |
| Open items | docs/roadmap/INBOX.md:35 |
| OpenJarvis (open-jarvis) | docs/roadmap/ANALYSIS.md:2983 |
| Order and dependencies | docs/roadmap/WORLD_CLASS_PLAN.md:1373 |
| PDF viewer and OCR workspace, against pdfcraft | docs/roadmap/ANALYSIS.md:4011 |
| PR 144 is done when (the owner's checklist, 2026-09-09 05:30 UTC) | docs/roadmap/HANDOVER.md:75 |
| Parity matrix, 2026-10-10 | docs/roadmap/ANALYSIS.md:3792 |
| Performance on small laptops, measured 2026-09-08 23:30 UTC (Chromium, 1366x768, no GPU) | docs/roadmap/WHITEBOARD_PLAN.md:635 |
| Phase 0: the bridge: click an underline, see suggestions (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:167 |
| Phase 10: the Liquid Glass adoptions (½ session) | docs/roadmap/UI_MODERNISATION_PLAN.md:590 |
| Phase 11: the phone, done properly (1 to 2 sessions, next session or later) | docs/roadmap/UI_MODERNISATION_PLAN.md:601 |
| Phase 12: density, refinement and WCAG 2.2 (the owner, 2026-10-10; Brief 41) | docs/roadmap/UI_MODERNISATION_PLAN.md:1013 |
| Phase 13: the design review, every surface against the principles (Fable, 2026-10-10) | docs/roadmap/UI_MODERNISATION_PLAN.md:1353 |
| Phase 1: chrome: three questions, three places (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:192 |
| Phase 1: grounding and marks (one session; Brief 12) | docs/roadmap/CHAT_PLAN.md:323 |
| Phase 1: the canvas renderer and physical drag (1–2 sessions) | docs/roadmap/GRAPH_PLAN.md:97 |
| Phase 1: the map object (foundation) | docs/roadmap/MINDMAP_PLAN.md:158 |
| Phase 1: the rail and the keys: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:490 |
| Phase 1: the row model and the feed: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:116 |
| Phase 2: editing that feels like a mindmap | docs/roadmap/MINDMAP_PLAN.md:177 |
| Phase 2: one composer, bubbles, streaming: **built 2026-09-13**, see | docs/roadmap/CHAT_PLAN.md:334 |
| Phase 2: the context bar: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:496 |
| Phase 2: the engine: CodeMirror 6 as the surface (2 sessions) | docs/roadmap/DOCUMENTS_PLAN.md:224 |
| Phase 2: the space (½ session) | docs/roadmap/GRAPH_PLAN.md:110 |
| Phase 2: the table view: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:120 |
| Phase 3: Ask unified, popup agent: **built 2026-09-13**, see | docs/roadmap/CHAT_PLAN.md:339 |
| Phase 3: blocks and structure: built, 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:249 |
| Phase 3: colour rules and groups (½ session) | docs/roadmap/GRAPH_PLAN.md:116 |
| Phase 3: export dialog, handles, highlighter: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:502 |
| Phase 3: the map as a citizen of the app | docs/roadmap/MINDMAP_PLAN.md:192 |
| Phase 3: the scrubber and pagination: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:124 |
| Phase 4: AI and export | docs/roadmap/MINDMAP_PLAN.md:208 |
| Phase 4: kinds and the journal: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:128 |
| Phase 4: mind map regressions and Tidy: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:512 |
| Phase 4: skills that finish (one session; Brief 13) | docs/roadmap/CHAT_PLAN.md:349 |
| Phase 4: the connected document (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:261 |
| Phase 5: backend (built; one row deliberately deferred, see below) | docs/roadmap/GRAPH_PLAN.md:135 |
| Phase 5: review, history and AI (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:298 |
| Phase 5: the composer, after INBOX 725 (open) | docs/roadmap/CHAT_PLAN.md:369 |
| Phase 5: utility | docs/roadmap/MINDMAP_PLAN.md:228 |
| Phase 6: responsive by device (partly built; UI Phase 9 did the bands) | docs/roadmap/DOCUMENTS_PLAN.md:314 |
| Phase 6: the deterministic engine (the owner, 2026-10-10; Brief 39) | docs/roadmap/CHAT_PLAN.md:389 |
| Phase 6: the node panel (½ session, INBOX 59) | docs/roadmap/GRAPH_PLAN.md:121 |
| Phase 7: export and interchange: **built 2026-09-13** | docs/roadmap/DOCUMENTS_PLAN.md:468 |
| Phase 7: the reports from the v0.2.2 round that are still open | docs/roadmap/UI_MODERNISATION_PLAN.md:229 |
| Phase 8: control docks: one grammar for every tab's head (2 sessions) | docs/roadmap/UI_MODERNISATION_PLAN.md:398 |
| Phase 8: one editor everywhere (1 session, the owner's ask, 2026-09-09) | docs/roadmap/DOCUMENTS_PLAN.md:396 |
| Phase 9: responsive by device, on purpose (1 session) | docs/roadmap/UI_MODERNISATION_PLAN.md:541 |
| Phase A: a step has a contract (1 session) | docs/roadmap/AGENT_SKILLS_REFORM.md:54 |
| Phase B: small-model mode (1 session) | docs/roadmap/AGENT_SKILLS_REFORM.md:72 |
| Phase C: the run as a readable object (1 session) | docs/roadmap/AGENT_SKILLS_REFORM.md:86 |
| Phase D: recovery | docs/roadmap/AGENT_SKILLS_REFORM.md:104 |
| Phase E: measured reliability per skill (Fable, 2026-10-10; WORLD_CLASS_PLAN 25; Brief 54) | docs/roadmap/AGENT_SKILLS_REFORM.md:395 |
| Phases | docs/roadmap/DOCUMENTS_PLAN.md:1348 |
| Phases 0 to 6: built | docs/roadmap/UI_MODERNISATION_PLAN.md:216 |
| Phases, each with the gate it is finished against | docs/roadmap/MINDMAP_PLAN.md:1294 |
| Placed (last 20, newest first) | docs/roadmap/INBOX.md:159 |
| Placed from Brief 40, 2026-10-10 (does the MCP server work) | docs/roadmap/AGENT_SKILLS_REFORM.md:345 |
| Placed from Brief 40, 2026-10-10 (research and placement) | docs/roadmap/BACKLOG.md:4175 |
| Placed from Brief 40, 2026-10-10 (the phone over HTTPS) | docs/roadmap/WORLD_CLASS_PLAN.md:3137 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/CHAT_PLAN.md:1747 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/DOCUMENTS_PLAN.md:1572 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/GRAPH_PLAN.md:601 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/MINDMAP_PLAN.md:1822 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/WHITEBOARD_PLAN.md:1548 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/CHAT_PLAN.md:579 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:206 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/MINDMAP_PLAN.md:1448 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/UI_MODERNISATION_PLAN.md:1107 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WHITEBOARD_PLAN.md:595 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WORLD_CLASS_PLAN.md:1540 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/CHAT_PLAN.md:611 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/DOCUMENTS_PLAN.md:617 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/GRAPH_PLAN.md:238 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/MINDMAP_PLAN.md:1453 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/UI_MODERNISATION_PLAN.md:1124 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/WHITEBOARD_PLAN.md:689 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/GRAPH_PLAN.md:322 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/MINDMAP_PLAN.md:1460 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/UI_MODERNISATION_PLAN.md:1128 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/WORLD_CLASS_PLAN.md:1721 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1452 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/GRAPH_PLAN.md:330 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/MINDMAP_PLAN.md:1465 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/UI_MODERNISATION_PLAN.md:1136 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WHITEBOARD_PLAN.md:694 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WORLD_CLASS_PLAN.md:2067 |
| Placed from INBOX, 2026-09-21 (the Ask sub-tab, four reports in one pass) | docs/roadmap/CHAT_PLAN.md:619 |
| Placed from INBOX, 2026-09-21 (the dashboard's focused hero) | docs/roadmap/UI_MODERNISATION_PLAN.md:1140 |
| Placed from INBOX, 2026-09-21 (two app-wide contracts) | docs/roadmap/WORLD_CLASS_PLAN.md:2124 |
| Placed from INBOX, 2026-09-23 | docs/roadmap/WHITEBOARD_PLAN.md:768 |
| Placed from INBOX, 2026-09-23 (392) | docs/roadmap/DOCUMENTS_PLAN.md:1474 |
| Placed from INBOX, 2026-09-25 | docs/roadmap/WHITEBOARD_PLAN.md:796 |
| Placed from INBOX, 2026-09-27 | docs/roadmap/WHITEBOARD_PLAN.md:828 |
| Placed from INBOX, 2026-09-27 (399) | docs/roadmap/WORLD_CLASS_PLAN.md:2443 |
| Placed from INBOX, 2026-10-03 (445 (2) audit, found not fixed) | docs/roadmap/MINDMAP_PLAN.md:1483 |
| Placed from INBOX, 2026-10-03 (INBOX 213) | docs/roadmap/BACKLOG.md:3974 |
| Placed from INBOX, 2026-10-03 (INBOX 266) | docs/roadmap/BACKLOG.md:4018 |
| Placed from INBOX, 2026-10-03 (INBOX 268) | docs/roadmap/AGENT_SKILLS_REFORM.md:176 |
| Placed from INBOX, 2026-10-03 (INBOX 303, music) | docs/roadmap/BACKLOG.md:3954 |
| Placed from INBOX, 2026-10-03 (INBOX 391, 392) | docs/roadmap/WORLD_CLASS_PLAN.md:2498 |
| Placed from INBOX, 2026-10-03 (INBOX 393) | docs/roadmap/UI_MODERNISATION_PLAN.md:1144 |
| Placed from INBOX, 2026-10-03 (INBOX 397) | docs/roadmap/BACKLOG.md:4131 |
| Placed from INBOX, 2026-10-03 (INBOX 403, the standing bar) | docs/roadmap/WORLD_CLASS_PLAN.md:2477 |
| Placed from INBOX, 2026-10-03 (INBOX 409: the AI assistant bar is what stays open) | docs/roadmap/DOCUMENTS_PLAN.md:1487 |
| Placed from INBOX, 2026-10-03 (the chat stutter, INBOX 413) | docs/roadmap/CHAT_PLAN.md:673 |
| Placed from INBOX, 2026-10-03 (the tray at its cap) | docs/roadmap/WORLD_CLASS_PLAN.md:2576 |
| Placed from INBOX, 2026-10-04 (design work for the next Opus slots) | docs/roadmap/WORLD_CLASS_PLAN.md:3035 |
| Placed from INBOX, 2026-10-04: parity with Obsidian's graph | docs/roadmap/GRAPH_PLAN.md:515 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/MINDMAP_PLAN.md:1487 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/WHITEBOARD_PLAN.md:843 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/AGENT_SKILLS_REFORM.md:339 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/CHAT_PLAN.md:696 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/DOCUMENTS_PLAN.md:1513 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/UI_MODERNISATION_PLAN.md:1239 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WHITEBOARD_PLAN.md:850 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WORLD_CLASS_PLAN.md:3047 |
| Placed from INBOX, 2026-10-05 (boardmap-1005) | docs/roadmap/WHITEBOARD_PLAN.md:858 |
| Placed from INBOX, 2026-10-05 (header bars, Settings navigation) | docs/roadmap/UI_MODERNISATION_PLAN.md:1271 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/DOCUMENTS_PLAN.md:1518 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/WHITEBOARD_PLAN.md:870 |
| Placed from INBOX, 2026-10-10 (code as documents) | docs/roadmap/DOCUMENTS_PLAN.md:1576 |
| Placed from INBOX, 2026-10-10 (filing suggestions) | docs/roadmap/WORLD_CLASS_PLAN.md:4183 |
| Placed from INBOX, 2026-10-10 (the coverage pass over 729 to 744) | docs/roadmap/CHAT_PLAN.md:1738 |
| Placed from INBOX, 2026-10-10 (the owner on feature depth) | docs/roadmap/MINDMAP_PLAN.md:1826 |
| Placed from INBOX, 2026-10-10 (the owner on feature depth) | docs/roadmap/WHITEBOARD_PLAN.md:1552 |
| Placed from INBOX, 2026-10-10 (the owner on the graph, again) | docs/roadmap/GRAPH_PLAN.md:606 |
| Placed from INBOX, 2026-10-10 (the owner's afternoon reports) | docs/roadmap/UI_MODERNISATION_PLAN.md:1581 |
| Placed from INBOX, 2026-10-10 (the owner's morning UI reports) | docs/roadmap/UI_MODERNISATION_PLAN.md:1570 |
| Placed from INBOX: 107d, the segmented mini bars | docs/roadmap/DOCUMENTS_PLAN.md:589 |
| Placed from INBOX: the composer everywhere (the owner, 2026-10-06) | docs/roadmap/CHAT_PLAN.md:702 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/BACKLOG.md:4161 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:827 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/DOCUMENTS_PLAN.md:1530 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/GRAPH_PLAN.md:588 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/MINDMAP_PLAN.md:1772 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/TIMELINE_PLAN.md:198 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/UI_MODERNISATION_PLAN.md:1275 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:917 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3080 |
| Policies (taken 2026-10-10) | docs/ROADMAP.md:49 |
| Presentations from boards and maps, against deckcraft | docs/roadmap/ANALYSIS.md:4111 |
| Promoted to ROADMAP.md, Tier 3, items 32–36 | docs/roadmap/ANALYSIS.md:788 |
| R1. What is actually wrong, measured | docs/roadmap/REDESIGN.md:29 |
| R1.1 The app is laid out as a web page, not as an application | docs/roadmap/REDESIGN.md:33 |
| R1.2 Files were a dead end, not just ugly | docs/roadmap/REDESIGN.md:70 |
| R1.3 Saving a note made you wait for the AI | docs/roadmap/REDESIGN.md:114 |
| R1.4 Spaces leaked | docs/roadmap/REDESIGN.md:131 |
| R1.5 The graph is the wrong tool for what it is being asked to do | docs/roadmap/REDESIGN.md:148 |
| R1.6 Uploads that are not images or PDFs are refused outright | docs/roadmap/REDESIGN.md:166 |
| R2. The diagnosis | docs/roadmap/REDESIGN.md:181 |
| R3. The target shape | docs/roadmap/REDESIGN.md:207 |
| R3.1 The shell | docs/roadmap/REDESIGN.md:215 |
| R3.2 Documents, files and "elements" | docs/roadmap/REDESIGN.md:252 |
| R3.3 The whiteboard | docs/roadmap/REDESIGN.md:317 |
| R4. Concept maps: the authored map, separate from the derived graph | docs/roadmap/REDESIGN.md:326 |
| R5. The agent harness | docs/roadmap/REDESIGN.md:374 |
| R5b. Local, offline, private: audited | docs/roadmap/REDESIGN.md:413 |
| R6. Sequencing | docs/roadmap/REDESIGN.md:441 |
| R7. What is still open, ranked, start here next session | docs/roadmap/REDESIGN.md:468 |
| R7.1 The document/file editor, the largest single gap | docs/roadmap/REDESIGN.md:477 |
| R7.2 Stage every file until the thing it belongs to is committed | docs/roadmap/REDESIGN.md:532 |
| R7.3 Cross-linking everything | docs/roadmap/REDESIGN.md:572 |
| R7.4 The agent harness | docs/roadmap/REDESIGN.md:591 |
| R7.5 The rest of the UI, surface by surface | docs/roadmap/REDESIGN.md:603 |
| R7.6 Concept maps: manage, not just make | docs/roadmap/REDESIGN.md:629 |
| R7.7 Backend | docs/roadmap/REDESIGN.md:635 |
| R7.8 A dismissed image placeholder comes back | docs/roadmap/REDESIGN.md:763 |
| R7.9 Filtering inside "All spaces" | docs/roadmap/REDESIGN.md:779 |
| R8. The complete request ledger | docs/roadmap/REDESIGN.md:698 |
| R8.1 The stuck loading screen, and what was actually found | docs/roadmap/REDESIGN.md:828 |
| R8.2 Shortcuts worked while the notebook was locked | docs/roadmap/REDESIGN.md:855 |
| R8.3 The UI, re-imagined: what the remaining work is *for* | docs/roadmap/REDESIGN.md:876 |
| R8.4 Three regressions I introduced, and what they have in common | docs/roadmap/REDESIGN.md:798 |
| R9. Where the numbers stand at the end of this session | docs/roadmap/REDESIGN.md:923 |
| Read before you touch anything | docs/roadmap/FABLE_BRIEF.md:35 |
| Related, and cheap: finish the rendering story | docs/roadmap/BACKLOG.md:2658 |
| Repositories and libraries read, 2026-10-10 | docs/roadmap/ANALYSIS.md:4140 |
| Revisited: where theirs is better, project by project | docs/roadmap/ANALYSIS.md:3616 |
| Rules for the whole plan | docs/roadmap/UI_MODERNISATION_PLAN.md:50 |
| Section 8's two cheap additions: **built 2026-10-05**, see | docs/roadmap/TIMELINE_PLAN.md:134 |
| Settings information architecture (INBOX 444) | docs/roadmap/UI_MODERNISATION_PLAN.md:1151 |
| Six repositories read for MemoryMap, 2026-09-20 | docs/roadmap/ANALYSIS.md:1807 |
| Sources | docs/roadmap/MINDMAP_PLAN.md:280 |
| Speech, four projects read by name, and what this app already does | docs/roadmap/ANALYSIS.md:3191 |
| Standing orders for this session (whoever the model is) | docs/roadmap/HANDOVER.md:250 |
| State of the branch (`claude/notes-flow-rebuild`, PR #162) | docs/roadmap/HANDOVER.md:334 |
| Steps | docs/roadmap/UI_MODERNISATION_PLAN.md:1091 |
| Steps | docs/roadmap/WORLD_CLASS_PLAN.md:1534 |
| Still open | docs/roadmap/WORLD_CLASS_PLAN.md:2267 |
| Still open after KG1 to KG9 | docs/roadmap/GRAPH_PLAN.md:536 |
| Still open: the upload split, and what it collides with | docs/roadmap/BACKLOG.md:2779 |
| Tables in notes and documents, against gridcraft | docs/roadmap/ANALYSIS.md:3980 |
| The `pytesseract` vendoring question, measured | docs/roadmap/ANALYSIS.md:2149 |
| The app's stack (outside boards and documents) | docs/roadmap/WHITEBOARD_PLAN.md:473 |
| The assistant catalogue, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:938 |
| The asymmetry these exploit | docs/roadmap/WORLD_CLASS_PLAN.md:1072 |
| The constraint that governs everything below, **now half-lifted** | docs/roadmap/ANALYSIS.md:257 |
| The deterministic foundation, 2026-10-10 (INBOX 746) | docs/roadmap/CHAT_PLAN.md:1551 |
| The dock grammar (the rule the whole phase enforces) | docs/roadmap/UI_MODERNISATION_PLAN.md:433 |
| The draw.io programme, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:921 |
| The features audit's Phase G, what is left (placed 2026-10-05, op3-1005) | docs/roadmap/MINDMAP_PLAN.md:1629 |
| The forks and draw.io | docs/roadmap/ANALYSIS.md:4151 |
| The four reports, verbatim | docs/roadmap/CHAT_PLAN.md:657 |
| The gates that do not move | docs/roadmap/SESSION_BRIEFS.md:722 |
| The general lesson, which is not about this agent | docs/roadmap/ANALYSIS.md:704 |
| The harness does the work the model is worst at: decided 2026-09-21 | docs/roadmap/AGENT_SKILLS_REFORM.md:134 |
| The instruction, verbatim | docs/roadmap/AGENT_SKILLS_REFORM.md:7 |
| The instruction, verbatim | docs/roadmap/UI_MODERNISATION_PLAN.md:8 |
| The knowledge graph, 2026-10-04 (INBOX 528) | docs/roadmap/GRAPH_PLAN.md:521 |
| The moves that would outshine everything else, in order of leverage | docs/roadmap/WORLD_CLASS_PLAN.md:1025 |
| The night's merges reviewed line by line, 2026-09-21 | docs/roadmap/ANALYSIS.md:2631 |
| The one process change worth making | docs/roadmap/ANALYSIS.md:659 |
| The one thing deliberately not decided | docs/roadmap/ANALYSIS.md:717 |
| The one-line answers to the three questions asked | docs/roadmap/ANALYSIS.md:946 |
| The order, and the rule | docs/roadmap/WORLD_CLASS_PLAN.md:1903 |
| The peer apps: fourteen triaged, five read properly | docs/roadmap/ANALYSIS.md:3339 |
| The plan documents, in one list (read this before opening any of them) | docs/ROADMAP.md:268 |
| The quarter's briefs (shorter; expand each into the shape above when | docs/roadmap/SESSION_BRIEFS.md:462 |
| The reform, in phases | docs/roadmap/AGENT_SKILLS_REFORM.md:52 |
| The road to 1.0: milestones with exit criteria (the owner, 2026-10-10: "still very much a demo and beta") | docs/ROADMAP.md:171 |
| The scripts, and what each produced | docs/roadmap/MODERNISATION_AUDIT.md:40 |
| The specific work waiting for you | docs/roadmap/FABLE_BRIEF.md:134 |
| The thesis | docs/ROADMAP.md:39 |
| The thing this app is actually good at, which is not what it says on the tin | docs/roadmap/ANALYSIS.md:547 |
| The three killer combos | docs/roadmap/MODERNISATION_AUDIT.md:1079 |
| The tracks, in order (each a brief; the agent model in brackets) | docs/ROADMAP.md:113 |
| The two bars that are not docks (added by direct instruction) | docs/roadmap/UI_MODERNISATION_PLAN.md:522 |
| The work, surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:475 |
| Three rules that are not negotiable here | docs/roadmap/FABLE_BRIEF.md:51 |
| Three things I would prioritise, and why | docs/roadmap/ANALYSIS.md:563 |
| Tools and skills: is odysseus leaner for small models? Measured, and no | docs/roadmap/ANALYSIS.md:352 |
| Traps that have each cost real time | docs/ROADMAP.md:383 |
| Twenty-four repositories read for MemoryMap, 2026-09-21 | docs/roadmap/ANALYSIS.md:2677 |
| Undo coverage, audited 2026-10-05 (INBOX 537) | docs/roadmap/WHITEBOARD_PLAN.md:441 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/CHAT_PLAN.md:1731 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/DOCUMENTS_PLAN.md:1561 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/GRAPH_PLAN.md:595 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/MINDMAP_PLAN.md:1816 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/TIMELINE_PLAN.md:249 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/UI_MODERNISATION_PLAN.md:1475 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WHITEBOARD_PLAN.md:1541 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WORLD_CLASS_PLAN.md:4174 |
| Verification, every phase | docs/roadmap/UI_MODERNISATION_PLAN.md:220 |
| W1: Design system (owner: DS) | docs/roadmap/MODERNISATION_AUDIT.md:910 |
| W2: UX overhauls for the core journeys (owner: FE + DS) | docs/roadmap/MODERNISATION_AUDIT.md:925 |
| W3: Frontend refactor and performance (owner: FE) | docs/roadmap/MODERNISATION_AUDIT.md:942 |
| W4: Backend hardening and API cleanup (owner: BE) | docs/roadmap/MODERNISATION_AUDIT.md:958 |
| W5: Local AI redesign (owner: AI) | docs/roadmap/MODERNISATION_AUDIT.md:975 |
| W6: Mobile and responsive (owner: FE + DS) | docs/roadmap/MODERNISATION_AUDIT.md:992 |
| W7: The table-stakes backlog (owner: BE + FE) | docs/roadmap/MODERNISATION_AUDIT.md:1003 |
| W8: Reliability, testing and observability (owner: QA) | docs/roadmap/MODERNISATION_AUDIT.md:1013 |
| What "fake / vibe coded / performative" means here, concretely | docs/roadmap/UI_MODERNISATION_PLAN.md:26 |
| What "quality" means for a smaller model here, in one paragraph | docs/roadmap/SESSION_BRIEFS.md:497 |
| What Coggle specifically does that the phases below must keep | docs/roadmap/MINDMAP_PLAN.md:132 |
| What exists (checked) | docs/roadmap/WORLD_CLASS_PLAN.md:1480 |
| What is actually open, 2026-09-14 | docs/roadmap/INBOX.md:24 |
| What is already good | docs/roadmap/WORLD_CLASS_PLAN.md:1011 |
| What is left, 2026-09-24 (INBOX 399: "what is left in the world class plan??") | docs/roadmap/WORLD_CLASS_PLAN.md:793 |
| What is missing that nobody has asked for | docs/roadmap/ANALYSIS.md:642 |
| What reading it changed about how I'd judge this app | docs/roadmap/ANALYSIS.md:517 |
| What the code actually does today | docs/roadmap/AGENT_SKILLS_REFORM.md:27 |
| What this audit did not verify | docs/roadmap/MODERNISATION_AUDIT.md:1522 |
| What this read could not verify | docs/roadmap/ANALYSIS.md:3681 |
| What was built | docs/roadmap/BACKLOG.md:2775 |
| What was deliberately left out | docs/roadmap/WORLD_CLASS_PLAN.md:1388 |
| What was wrong, and is fixed this session | docs/roadmap/WORLD_CLASS_PLAN.md:1021 |
| Where I think the roadmap is over-invested | docs/roadmap/ANALYSIS.md:624 |
| Whiteboard, against draw.io and designcraft | docs/roadmap/ANALYSIS.md:3805 |
| Why the app feels "off" even where each screen is fine | docs/roadmap/WORLD_CLASS_PLAN.md:54 |
| Worth building, not this session | docs/roadmap/ANALYSIS.md:415 |
| Worth building: features, ranked by fit, and what actually happened | docs/roadmap/ANALYSIS.md:914 |
| Your standing task, alongside the plans | docs/roadmap/FABLE_BRIEF.md:71 |
| better-clawd (x1xhlol) and Clawd-Code (GPT-AGI) | docs/roadmap/ANALYSIS.md:2104 |
| blobatar (Alain00) | docs/roadmap/ANALYSIS.md:1924 |
| canvasdepth, ranked by how often a person meets the gap (2026-10-10) | docs/roadmap/MINDMAP_PLAN.md:1830 |
| canvasdepth, ranked by how often a person meets the gap (2026-10-10) | docs/roadmap/WHITEBOARD_PLAN.md:1556 |
| cognee (topoteretes) | docs/roadmap/ANALYSIS.md:2854 |
| cupid-music-player (cupidbity), and the music question attached to it | docs/roadmap/ANALYSIS.md:3065 |
| haifengl/smile: algorithms worth re-implementing small | docs/roadmap/ANALYSIS.md:4175 |
| needle (cactus-compute) | docs/roadmap/ANALYSIS.md:2773 |
| openwolf (cytostack) | docs/roadmap/ANALYSIS.md:2927 |
| quickLiquid (amarnath3003) | docs/roadmap/ANALYSIS.md:2718 |
| ~~Found while measuring the board bar at 820 (2026-09-20, not the owner)~~ | docs/roadmap/WHITEBOARD_PLAN.md:599 |
| §101: the knowledge graph should be second nature to the AI, everywhere | docs/roadmap/BACKLOG.md:2828 |
| §102: a live competitor read (Kortex, Granola, Mem.ai), audited before logging | docs/roadmap/BACKLOG.md:2879 |
| §103, reported live this session, and a batch of feature asks, logged, none built yet | docs/roadmap/BACKLOG.md:2986 |
| §105: Library "All" tab: the create button now follows the filter chip, the rest is scoped not built | docs/roadmap/BACKLOG.md:3071 |
| §106: Links, Contents and note References built; §102 items 5 and 6 checked, not built as originally scoped | docs/roadmap/BACKLOG.md:3120 |
| §107: a fast live-report round: nav-history contrast, Contents redesign, a bookmark-edit gap, and three items logged not built | docs/roadmap/BACKLOG.md:3263 |
| §108: a fast bug-fix round: three real front-end bugs and a batch of small polish | docs/roadmap/BACKLOG.md:3358 |
| §109: the measured bug round, the competitor gap list triaged, and what is genuinely still open | docs/roadmap/BACKLOG.md:3440 |
| §110: the toolbar round: formatting in Notes, and five more measured bugs | docs/roadmap/BACKLOG.md:3619 |
| §111: where this app should go next, grounded in what the code actually does | docs/roadmap/BACKLOG.md:3674 |
| §112: the strategic pass: what would make this app hard to compete with | docs/roadmap/BACKLOG.md:3752 |
| §114 addendum, two external write-ups folded in and removed | docs/roadmap/ANALYSIS.md:1764 |
| §114 addendum: after the whiteboard / documents / search sprint | docs/roadmap/ANALYSIS.md:1727 |
| §116: capability gaps identified in the Fable session | docs/roadmap/BACKLOG.md:3896 |
| §95: the forward list | docs/roadmap/BACKLOG.md:2352 |
| §96: Guides, and diagrams the whiteboard can take | docs/roadmap/BACKLOG.md:2500 |
| §98: reported live during the §90.2 small-screen pass, logged not built | docs/roadmap/BACKLOG.md:2669 |
| §99: the lightbox as a showcase, and uploads split by file type | docs/roadmap/BACKLOG.md:2769 |
