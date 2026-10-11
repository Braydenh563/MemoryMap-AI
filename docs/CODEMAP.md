# Code map

Generated 2026-10-11 by `python scripts/codemap.py` from the repository. Every row is `name | file:line`: grep this file, then `sed -n 'A,Bp'` the lines you need. A stale map fails `tests/test_codemap_fresh.py`.

Counts: frontend functions 5659, frontend ids 2423, CSS sections 490, backend routes 562, backend modules 4776, test files 1090, tests 9959, plan headings 996.

## Frontend functions (5659)

Top-level `function name(`, `async function name(` and `const name = (` in `frontend/js/` and `frontend/sw.js`, in index.html's script order; lazily loaded files after, by name. Rows sorted by name within each file.

### frontend/js/app.js (47)

| Name | File:line |
|---|---|
| `$` | frontend/js/app.js:166 |
| `api` | frontend/js/app.js:396 |
| `apiJson` | frontend/js/app.js:635 |
| `apiPagedList` | frontend/js/app.js:570 |
| `askPasswordPrompt` | frontend/js/app.js:753 |
| `authToken` | frontend/js/app.js:172 |
| `chip` | frontend/js/app.js:1365 |
| `chipWords` | frontend/js/app.js:1360 |
| `clearApiCache` | frontend/js/app.js:631 |
| `confirmDialog` | frontend/js/app.js:1453 |
| `confirmVerb` | frontend/js/app.js:1446 |
| `ensureModule` | frontend/js/app.js:2023 |
| `enterWithoutPassword` | frontend/js/app.js:710 |
| `hide` | frontend/js/app.js:168 |
| `hideBootSplash` | frontend/js/app.js:913 |
| `initAuth` | frontend/js/app.js:926 |
| `kickBackgroundTaskPoll` | frontend/js/app.js:600 |
| `lazyAssetStamp` | frontend/js/app.js:1962 |
| `lazyScript` | frontend/js/app.js:2003 |
| `lockNow` | frontend/js/app.js:887 |
| `mediaSrc` | frontend/js/app.js:255 |
| `mountNoteSurfaceNow` | frontend/js/app.js:2058 |
| `onDomReady` | frontend/js/app.js:1994 |
| `promptDialog` | frontend/js/app.js:1563 |
| `purgeLockedContent` | frontend/js/app.js:873 |
| `recordBrowserLog` | frontend/js/app.js:23 |
| `refreshActiveTab` | frontend/js/app.js:1210 |
| `refuseStagedUrls` | frontend/js/app.js:232 |
| `replaceMissingMedia` | frontend/js/app.js:303 |
| `resumeWithoutPassword` | frontend/js/app.js:720 |
| `setBusy` | frontend/js/app.js:1405 |
| `setLabel` | frontend/js/app.js:1279 |
| `settingsModalOpen` | frontend/js/app.js:1353 |
| `settleLockPrompt` | frontend/js/app.js:731 |
| `sharedCaptureText` | frontend/js/app.js:987 |
| `show` | frontend/js/app.js:167 |
| `showLockScreen` | frontend/js/app.js:794 |
| `smallButton` | frontend/js/app.js:1751 |
| `spinnerEl` | frontend/js/app.js:1396 |
| `stagePrimary` | frontend/js/app.js:1389 |
| `stagedImageByUrl` | frontend/js/app.js:200 |
| `startApp` | frontend/js/app.js:1019 |
| `startWithoutPassword` | frontend/js/app.js:695 |
| `takeSharedIntake` | frontend/js/app.js:998 |
| `whenScriptsLoaded` | frontend/js/app.js:1943 |
| `wireBackdropClose` | frontend/js/app.js:1739 |
| `zoomWheelDelta` | frontend/js/app.js:249 |

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

### frontend/js/note-cards.js (37)

| Name | File:line |
|---|---|
| `answerTags` | frontend/js/note-cards.js:140 |
| `askAtlasAboutNote` | frontend/js/note-cards.js:2386 |
| `askAtlasAboutThing` | frontend/js/note-cards.js:2393 |
| `binNoteWithUndo` | frontend/js/note-cards.js:1189 |
| `entryCardControls` | frontend/js/note-cards.js:2406 |
| `entryItem` | frontend/js/note-cards.js:1381 |
| `entryListFocusStop` | frontend/js/note-cards.js:2419 |
| `entryListSetStop` | frontend/js/note-cards.js:2424 |
| `favouriteButton` | frontend/js/note-cards.js:1149 |
| `fitNoteMetas` | frontend/js/note-cards.js:1259 |
| `formatFileSize` | frontend/js/note-cards.js:1103 |
| `libraryListsBoard` | frontend/js/note-cards.js:1027 |
| `loadMapBoardIndex` | frontend/js/note-cards.js:962 |
| `makeUnlinkAccessible` | frontend/js/note-cards.js:2437 |
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
| `noteReviewActions` | frontend/js/note-cards.js:2337 |
| `notesSpanSpaces` | frontend/js/note-cards.js:1210 |
| `publishDraft` | frontend/js/note-cards.js:1338 |
| `renderAttachmentCards` | frontend/js/note-cards.js:1223 |
| `round2` | frontend/js/note-cards.js:242 |
| `showNoteInGraph` | frontend/js/note-cards.js:2378 |
| `tagAddChipKind` | frontend/js/note-cards.js:1374 |

### frontend/js/menus.js (34)

| Name | File:line |
|---|---|
| `afterMenuExit` | frontend/js/menus.js:680 |
| `buildMenuGroupButton` | frontend/js/menus.js:1342 |
| `buildMenuItemButton` | frontend/js/menus.js:1312 |
| `cardOpener` | frontend/js/menus.js:372 |
| `closeActionMenus` | frontend/js/menus.js:70 |
| `closeActionMenusOnScroll` | frontend/js/menus.js:25 |
| `closeHelpPopovers` | frontend/js/menus.js:237 |
| `docBacklinkContext` | frontend/js/menus.js:1095 |
| `entryOverflowMenu` | frontend/js/menus.js:1506 |
| `escapeAndCapMenu` | frontend/js/menus.js:729 |
| `escapeMenuIfClipped` | frontend/js/menus.js:628 |
| `escapeMenuToBody` | frontend/js/menus.js:650 |
| `explainNote` | frontend/js/menus.js:1927 |
| `fitActionMenuInWindow` | frontend/js/menus.js:419 |
| `focusMenuItem` | frontend/js/menus.js:541 |
| `generateEntryTitle` | frontend/js/menus.js:1199 |
| `historyActorLabel` | frontend/js/menus.js:1138 |
| `inlineActionIs` | frontend/js/menus.js:8 |
| `isEditConflict` | frontend/js/menus.js:1917 |
| `menuClippingAncestor` | frontend/js/menus.js:555 |
| `menuExitMs` | frontend/js/menus.js:687 |
| `menuSidePlan` | frontend/js/menus.js:397 |
| `nearestScrollParent` | frontend/js/menus.js:120 |
| `openActionMenu` | frontend/js/menus.js:439 |
| `placeEscapedMenu` | frontend/js/menus.js:595 |
| `placeHelpPopover` | frontend/js/menus.js:151 |
| `removeEntryTitle` | frontend/js/menus.js:1223 |
| `restoreEscapedMenu` | frontend/js/menus.js:694 |
| `restoreEscapedMenuAfterExit` | frontend/js/menus.js:675 |
| `toggleEntryPrivacy` | frontend/js/menus.js:1161 |
| `wireEscapedActionMenu` | frontend/js/menus.js:798 |
| `wireEscapedMenuResize` | frontend/js/menus.js:1078 |
| `wireHelpPopover` | frontend/js/menus.js:290 |
| `wireMenuKeyboard` | frontend/js/menus.js:1251 |

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
| `appendInline` | frontend/js/notes-list.js:1174 |
| `appendInlineRun` | frontend/js/notes-list.js:946 |
| `applyEntryListTabOrder` | frontend/js/notes-list.js:2388 |
| `applyNotesViewMode` | frontend/js/notes-list.js:2036 |
| `attachmentCard` | frontend/js/notes-list.js:636 |
| `attachmentExt` | frontend/js/notes-list.js:588 |
| `attachmentFacts` | frontend/js/notes-list.js:605 |
| `attachmentIconClass` | frontend/js/notes-list.js:521 |
| `attachmentKind` | frontend/js/notes-list.js:596 |
| `boardEmbedRef` | frontend/js/notes-list.js:1285 |
| `boardEmbedTarget` | frontend/js/notes-list.js:1305 |
| `bodyWithoutTitleLine` | frontend/js/notes-list.js:1191 |
| `categoryAutoDot` | frontend/js/notes-list.js:2482 |
| `categoryColour` | frontend/js/notes-list.js:2477 |
| `categoryColoursChanged` | frontend/js/notes-list.js:2494 |
| `categoryDotColour` | frontend/js/notes-list.js:2487 |
| `categoryMenuItems` | frontend/js/notes-list.js:2730 |
| `clearSkeletons` | frontend/js/notes-list.js:2796 |
| `compareCategoryNames` | frontend/js/notes-list.js:2686 |
| `dockConnectionsInRail` | frontend/js/notes-list.js:3506 |
| `engineQueryIds` | frontend/js/notes-list.js:194 |
| `ensureCardCounts` | frontend/js/notes-list.js:3197 |
| `ensureMapChipsFor` | frontend/js/notes-list.js:3239 |
| `ensureOneCardCount` | frontend/js/notes-list.js:3201 |
| `entryListItems` | frontend/js/notes-list.js:2386 |
| `entryListOrder` | frontend/js/notes-list.js:2968 |
| `entryNeedsReview` | frontend/js/notes-list.js:225 |
| `expandAngleAutolinks` | frontend/js/notes-list.js:858 |
| `fileCard` | frontend/js/notes-list.js:709 |
| `fileChip` | frontend/js/notes-list.js:554 |
| `fileKindLabel` | frontend/js/notes-list.js:547 |
| `fillCategoryOptions` | frontend/js/notes-list.js:100 |
| `filterNotesBy` | frontend/js/notes-list.js:2197 |
| `filterNotesByTag` | frontend/js/notes-list.js:2184 |
| `focusNoteRow` | frontend/js/notes-list.js:62 |
| `foldNoteToolbarForFirstPaint` | frontend/js/notes-list.js:17 |
| `highlightIconsInto` | frontend/js/notes-list.js:1637 |
| `highlightInto` | frontend/js/notes-list.js:1664 |
| `initEntryListKeyboardNav` | frontend/js/notes-list.js:2398 |
| `isRenderableUrl` | frontend/js/notes-list.js:489 |
| `libraryVisibleRows` | frontend/js/notes-list.js:2211 |
| `linkAppAddresses` | frontend/js/notes-list.js:869 |
| `listedNoteIds` | frontend/js/notes-list.js:2055 |
| `liveQueryBar` | frontend/js/notes-list.js:314 |
| `liveQueryIds` | frontend/js/notes-list.js:163 |
| `loadCategories` | frontend/js/notes-list.js:2503 |
| `loadEntries` | frontend/js/notes-list.js:2840 |
| `markSidebarRowCurrent` | frontend/js/notes-list.js:2690 |
| `matchesSearch` | frontend/js/notes-list.js:381 |
| `matchesTagCount` | frontend/js/notes-list.js:360 |
| `noteCountExcludingDrafts` | frontend/js/notes-list.js:2174 |
| `noteEditedTime` | frontend/js/notes-list.js:1765 |
| `noteFormMayClose` | frontend/js/notes-list.js:56 |
| `noteListed` | frontend/js/notes-list.js:2170 |
| `noteQueryIsEmpty` | frontend/js/notes-list.js:343 |
| `noteSemanticLoaded` | frontend/js/notes-list.js:377 |
| `noteSortName` | frontend/js/notes-list.js:1769 |
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
| `orderedNotesForCurrentView` | frontend/js/notes-list.js:1969 |
| `paginateNotesForDisplay` | frontend/js/notes-list.js:1935 |
| `paintCategoryDot` | frontend/js/notes-list.js:2490 |
| `paintEntriesProgress` | frontend/js/notes-list.js:2828 |
| `parseNoteQuery` | frontend/js/notes-list.js:247 |
| `propQuery` | frontend/js/notes-list.js:2191 |
| `readableUrl` | frontend/js/notes-list.js:885 |
| `referenceCountChip` | frontend/js/notes-list.js:3065 |
| `referenceCountText` | frontend/js/notes-list.js:3053 |
| `refreshEntries` | frontend/js/notes-list.js:2976 |
| `refreshNoteSearchWhy` | frontend/js/notes-list.js:1727 |
| `reminderCountChip` | frontend/js/notes-list.js:3108 |
| `renderEntries` | frontend/js/notes-list.js:2232 |
| `renderIncrementally` | frontend/js/notes-list.js:1840 |
| `renderInlineMarkdown` | frontend/js/notes-list.js:902 |
| `renderNoteInline` | frontend/js/notes-list.js:1554 |
| `renderNoteText` | frontend/js/notes-list.js:1423 |
| `renderNotesRail` | frontend/js/notes-list.js:3373 |
| `renderSidebar` | frontend/js/notes-list.js:2518 |
| `resolveCategoryChoice` | frontend/js/notes-list.js:127 |
| `resolveNotePage` | frontend/js/notes-list.js:2009 |
| `resolveWikiTarget` | frontend/js/notes-list.js:1313 |
| `safeHref` | frontend/js/notes-list.js:835 |
| `scheduleEntriesProgress` | frontend/js/notes-list.js:2835 |
| `scheduleNotesRail` | frontend/js/notes-list.js:3349 |
| `searchHighlightTerms` | frontend/js/notes-list.js:1699 |
| `setNotesRailHidden` | frontend/js/notes-list.js:3512 |
| `setNotesViewMode` | frontend/js/notes-list.js:2092 |
| `showEntrySkeletons` | frontend/js/notes-list.js:2767 |
| `showNotesFilter` | frontend/js/notes-list.js:236 |
| `showSkeletons` | frontend/js/notes-list.js:2785 |
| `sortEntries` | frontend/js/notes-list.js:1773 |
| `syncNotesRailToggle` | frontend/js/notes-list.js:3362 |
| `toggleExpandAllRows` | frontend/js/notes-list.js:2081 |
| `toggleRowExpanded` | frontend/js/notes-list.js:2114 |
| `unlatex` | frontend/js/notes-list.js:753 |
| `updateExpandAllButton` | frontend/js/notes-list.js:2061 |
| `whyThisResultChip` | frontend/js/notes-list.js:1711 |
| `wikiForms` | frontend/js/notes-list.js:1233 |
| `wikiStem` | frontend/js/notes-list.js:1251 |
| `wireCategoryDropTarget` | frontend/js/notes-list.js:2749 |
| `wireSidebarRowKeys` | frontend/js/notes-list.js:2699 |

### frontend/js/capture-ask.js (90)

| Name | File:line |
|---|---|
| `addInlineCitations` | frontend/js/capture-ask.js:1129 |
| `announce` | frontend/js/capture-ask.js:797 |
| `answerFigure` | frontend/js/capture-ask.js:1967 |
| `answerObject` | frontend/js/capture-ask.js:2060 |
| `askAsOf` | frontend/js/capture-ask.js:3325 |
| `askNotesOnTheRight` | frontend/js/capture-ask.js:2182 |
| `askQuestion` | frontend/js/capture-ask.js:2928 |
| `askStatusBusy` | frontend/js/capture-ask.js:2898 |
| `askStatusText` | frontend/js/capture-ask.js:2883 |
| `citationInsertionPoint` | frontend/js/capture-ask.js:1101 |
| `citationKey` | frontend/js/capture-ask.js:1054 |
| `citationMarker` | frontend/js/capture-ask.js:1220 |
| `citationNumbers` | frontend/js/capture-ask.js:1021 |
| `citationPeekText` | frontend/js/capture-ask.js:1387 |
| `citationTextIndex` | frontend/js/capture-ask.js:1068 |
| `clearAskAnswerFoot` | frontend/js/capture-ask.js:2111 |
| `clearCaptureStatusOnInput` | frontend/js/capture-ask.js:545 |
| `clearCaptureTagSuggestions` | frontend/js/capture-ask.js:486 |
| `clearCitedPassage` | frontend/js/capture-ask.js:1593 |
| `clickableResult` | frontend/js/capture-ask.js:980 |
| `closeCitationPeek` | frontend/js/capture-ask.js:1494 |
| `collapseCitationRuns` | frontend/js/capture-ask.js:1195 |
| `copyAnswer` | frontend/js/capture-ask.js:3257 |
| `createDocumentNamed` | frontend/js/capture-ask.js:287 |
| `everyRowScored` | frontend/js/capture-ask.js:2412 |
| `evidenceBlock` | frontend/js/capture-ask.js:1355 |
| `evidenceRows` | frontend/js/capture-ask.js:1891 |
| `evidenceSignals` | frontend/js/capture-ask.js:1333 |
| `evidenceSpan` | frontend/js/capture-ask.js:1326 |
| `evidenceToggle` | frontend/js/capture-ask.js:1858 |
| `filedByText` | frontend/js/capture-ask.js:220 |
| `filingOutcomeText` | frontend/js/capture-ask.js:181 |
| `flashCategory` | frontend/js/capture-ask.js:950 |
| `flashEntry` | frontend/js/capture-ask.js:846 |
| `flashReminder` | frontend/js/capture-ask.js:924 |
| `focusCaptureBox` | frontend/js/capture-ask.js:449 |
| `groundingThumbs` | frontend/js/capture-ask.js:1744 |
| `heldOffline` | frontend/js/capture-ask.js:559 |
| `holdPictureTokens` | frontend/js/capture-ask.js:1961 |
| `liveMarkdownRenderer` | frontend/js/capture-ask.js:2760 |
| `loadAskHistoryBadge` | frontend/js/capture-ask.js:3289 |
| `loadCaptureDocuments` | frontend/js/capture-ask.js:276 |
| `loadSuggestions` | frontend/js/capture-ask.js:3263 |
| `loadTemplates` | frontend/js/capture-ask.js:3358 |
| `matchReasonBadge` | frontend/js/capture-ask.js:2416 |
| `newChat` | frontend/js/capture-ask.js:2841 |
| `notePictures` | frontend/js/capture-ask.js:1729 |
| `noteSurfaceIfAny` | frontend/js/capture-ask.js:414 |
| `noteTemplateForUse` | frontend/js/capture-ask.js:396 |
| `noteTemplateText` | frontend/js/capture-ask.js:385 |
| `numberMatchingRecords` | frontend/js/capture-ask.js:1648 |
| `offerJumpToNewNote` | frontend/js/capture-ask.js:12 |
| `openCitationPeek` | frontend/js/capture-ask.js:1410 |
| `openDocumentFromNote` | frontend/js/capture-ask.js:418 |
| `openNoteAtPassage` | frontend/js/capture-ask.js:919 |
| `pictureItems` | frontend/js/capture-ask.js:1741 |
| `placeAnswerFigures` | frontend/js/capture-ask.js:2002 |
| `placeResultBadge` | frontend/js/capture-ask.js:975 |
| `renderAnswerGrounding` | frontend/js/capture-ask.js:1779 |
| `renderAnswerSupport` | frontend/js/capture-ask.js:1677 |
| `renderAskAnswerFoot` | frontend/js/capture-ask.js:2128 |
| `renderAskFollowups` | frontend/js/capture-ask.js:2197 |
| `renderAskHint` | frontend/js/capture-ask.js:2241 |
| `renderAskTrail` | frontend/js/capture-ask.js:2815 |
| `renderAskedQuestion` | frontend/js/capture-ask.js:2859 |
| `renderCaptureDocumentAdder` | frontend/js/capture-ask.js:345 |
| `renderCaptureDocuments` | frontend/js/capture-ask.js:307 |
| `renderCaptureTagSuggestions` | frontend/js/capture-ask.js:494 |
| `renderChatMeta` | frontend/js/capture-ask.js:2280 |
| `renderEvidenceView` | frontend/js/capture-ask.js:1913 |
| `renderRelatedElsewhere` | frontend/js/capture-ask.js:1605 |
| `renderToolsUnsupportedNotice` | frontend/js/capture-ask.js:1709 |
| `resetCaptureForm` | frontend/js/capture-ask.js:456 |
| `retryAnswer` | frontend/js/capture-ask.js:3253 |
| `saveEntry` | frontend/js/capture-ask.js:573 |
| `saveEntryAsDraft` | frontend/js/capture-ask.js:698 |
| `scheduleCaptureTagSuggestions` | frontend/js/capture-ask.js:520 |
| `scheduleCitationPeek` | frontend/js/capture-ask.js:1368 |
| `scheduleCitationPeekClose` | frontend/js/capture-ask.js:1379 |
| `scrollEditingEntryIntoView` | frontend/js/capture-ask.js:821 |
| `setAnsweredBy` | frontend/js/capture-ask.js:2271 |
| `setAsking` | frontend/js/capture-ask.js:2801 |
| `settleCaptureStatus` | frontend/js/capture-ask.js:125 |
| `showAskAsOf` | frontend/js/capture-ask.js:3331 |
| `showCitedPassage` | frontend/js/capture-ask.js:1562 |
| `stopAnswer` | frontend/js/capture-ask.js:2807 |
| `streamChat` | frontend/js/capture-ask.js:2447 |
| `streamChatEvents` | frontend/js/capture-ask.js:2490 |
| `watchFiling` | frontend/js/capture-ask.js:48 |
| `withTitle` | frontend/js/capture-ask.js:434 |

### frontend/js/chat.js (82)

| Name | File:line |
|---|---|
| `aiWritingTrace` | frontend/js/chat.js:2187 |
| `applyCompression` | frontend/js/chat.js:2047 |
| `askAboutPage` | frontend/js/chat.js:1436 |
| `assistantLabel` | frontend/js/chat.js:52 |
| `assistantMessageActions` | frontend/js/chat.js:162 |
| `atlasSuggestion` | frontend/js/chat.js:674 |
| `batteryModeOn` | frontend/js/chat.js:2089 |
| `bookmarkWebResult` | frontend/js/chat.js:1250 |
| `buildWebResultRow` | frontend/js/chat.js:1127 |
| `chatHistoryToSend` | frontend/js/chat.js:36 |
| `chatMessageActions` | frontend/js/chat.js:65 |
| `chatTranscriptText` | frontend/js/chat.js:1985 |
| `chatTurnTranscript` | frontend/js/chat.js:125 |
| `citeWebPage` | frontend/js/chat.js:1493 |
| `clearChatEmptyState` | frontend/js/chat.js:803 |
| `clearWebSearchHistory` | frontend/js/chat.js:1307 |
| `closeWebReader` | frontend/js/chat.js:872 |
| `compactTokens` | frontend/js/chat.js:490 |
| `compressChatContext` | frontend/js/chat.js:2013 |
| `continueRunControls` | frontend/js/chat.js:226 |
| `copyToClipboard` | frontend/js/chat.js:547 |
| `copyViaTextarea` | frontend/js/chat.js:514 |
| `copyWebLink` | frontend/js/chat.js:1242 |
| `fillPersonaMark` | frontend/js/chat.js:1768 |
| `flashCopied` | frontend/js/chat.js:536 |
| `forkFromBubble` | frontend/js/chat.js:626 |
| `livingInterval` | frontend/js/chat.js:2173 |
| `loadResponseModes` | frontend/js/chat.js:1723 |
| `loadWebSearchHistory` | frontend/js/chat.js:1282 |
| `manualPauseControls` | frontend/js/chat.js:272 |
| `messageMetaLine` | frontend/js/chat.js:340 |
| `metaItem` | frontend/js/chat.js:306 |
| `mountChatActionsMenu` | frontend/js/chat.js:1909 |
| `openWebPageExternally` | frontend/js/chat.js:1238 |
| `openWebReader` | frontend/js/chat.js:1453 |
| `personaOptions` | frontend/js/chat.js:1785 |
| `progressLine` | frontend/js/chat.js:2515 |
| `progressMotionWanted` | frontend/js/chat.js:2125 |
| `progressPhaseText` | frontend/js/chat.js:2383 |
| `pushWebSearchHistory` | frontend/js/chat.js:1291 |
| `questionForBubble` | frontend/js/chat.js:580 |
| `reducedMotionWanted` | frontend/js/chat.js:2095 |
| `refreshWebSearxngStrip` | frontend/js/chat.js:1043 |
| `regenerateFromBubble` | frontend/js/chat.js:598 |
| `regenerateLastAnswer` | frontend/js/chat.js:653 |
| `removeChatBubble` | frontend/js/chat.js:500 |
| `renderChatContextMeter` | frontend/js/chat.js:1859 |
| `renderChatEmptyState` | frontend/js/chat.js:694 |
| `renderChatTurnCount` | frontend/js/chat.js:1889 |
| `renderChatUsage` | frontend/js/chat.js:1842 |
| `renderCompressionState` | frontend/js/chat.js:2060 |
| `renderModelContextBox` | frontend/js/chat.js:1586 |
| `renderModelHealthNote` | frontend/js/chat.js:1686 |
| `renderModelSpec` | frontend/js/chat.js:1614 |
| `renderWebPageAttachment` | frontend/js/chat.js:1520 |
| `renderWebPanelMenu` | frontend/js/chat.js:977 |
| `renderWebSearchHistory` | frontend/js/chat.js:1316 |
| `rewriteAnswerWith` | frontend/js/chat.js:617 |
| `runWebSearch` | frontend/js/chat.js:1351 |
| `saveChatAsDocument` | frontend/js/chat.js:1961 |
| `scheduleThinkingWordTick` | frontend/js/chat.js:2301 |
| `setResponseMode` | frontend/js/chat.js:1746 |
| `setWebEngineDot` | frontend/js/chat.js:963 |
| `setWebSearxngRunning` | frontend/js/chat.js:1028 |
| `showCompressReview` | frontend/js/chat.js:2035 |
| `startThinkingWordRotation` | frontend/js/chat.js:2329 |
| `stopThinkingWordRotation` | frontend/js/chat.js:2351 |
| `stopWebRequest` | frontend/js/chat.js:857 |
| `togglePersonaPrompt` | frontend/js/chat.js:1834 |
| `toggleWebPanel` | frontend/js/chat.js:885 |
| `toolPhaseVerb` | frontend/js/chat.js:2398 |
| `typingDots` | frontend/js/chat.js:2412 |
| `webEngineWords` | frontend/js/chat.js:946 |
| `webPageContextBlock` | frontend/js/chat.js:1551 |
| `webPageMarkdown` | frontend/js/chat.js:1460 |
| `webQueryTerms` | frontend/js/chat.js:1114 |
| `webReaderIsOpen` | frontend/js/chat.js:868 |
| `webRequestEnd` | frontend/js/chat.js:847 |
| `webRequestStart` | frontend/js/chat.js:838 |
| `webResultMark` | frontend/js/chat.js:1093 |
| `wheelScrollsHorizontally` | frontend/js/chat.js:2236 |
| `wireHorizontalWheelScrolling` | frontend/js/chat.js:2269 |

### frontend/js/chat-agent.js (71)

| Name | File:line |
|---|---|
| `actNavigate` | frontend/js/chat-agent.js:1823 |
| `addAssistantBubble` | frontend/js/chat-agent.js:1130 |
| `addBubble` | frontend/js/chat-agent.js:414 |
| `agentTimeline` | frontend/js/chat-agent.js:505 |
| `assistantAvatar` | frontend/js/chat-agent.js:1083 |
| `cancelDraft` | frontend/js/chat-agent.js:2768 |
| `cardTextPreview` | frontend/js/chat-agent.js:1519 |
| `changeDiff` | frontend/js/chat-agent.js:1267 |
| `changeRow` | frontend/js/chat-agent.js:1180 |
| `chatAttachmentStrip` | frontend/js/chat-agent.js:212 |
| `chatHeadIsAtlas` | frontend/js/chat-agent.js:1031 |
| `chatHeadKey` | frontend/js/chat-agent.js:1036 |
| `chatPositions` | frontend/js/chat-agent.js:99 |
| `chatScrollToEnd` | frontend/js/chat-agent.js:188 |
| `chatSourcesFrom` | frontend/js/chat-agent.js:2057 |
| `chatSourcesPanel` | frontend/js/chat-agent.js:2189 |
| `clearDraftTarget` | frontend/js/chat-agent.js:2659 |
| `deactivateControls` | frontend/js/chat-agent.js:2043 |
| `draftTranslateKind` | frontend/js/chat-agent.js:2519 |
| `followBottom` | frontend/js/chat-agent.js:39 |
| `followReleased` | frontend/js/chat-agent.js:28 |
| `isImageCardUrl` | frontend/js/chat-agent.js:1511 |
| `keepAtBottom` | frontend/js/chat-agent.js:136 |
| `markDraftQuickstart` | frontend/js/chat-agent.js:2554 |
| `markToolStep` | frontend/js/chat-agent.js:1684 |
| `nestedTakesWheelUp` | frontend/js/chat-agent.js:33 |
| `noteChatPosition` | frontend/js/chat-agent.js:104 |
| `paintAssistantAvatar` | frontend/js/chat-agent.js:1104 |
| `paintAssistantHeads` | frontend/js/chat-agent.js:1116 |
| `paintPersonaAvatar` | frontend/js/chat-agent.js:1043 |
| `paintUserMarks` | frontend/js/chat-agent.js:392 |
| `paneWordCount` | frontend/js/chat-agent.js:2675 |
| `planProposalCard` | frontend/js/chat-agent.js:1319 |
| `planStepWrites` | frontend/js/chat-agent.js:1284 |
| `pushAgentChangeUndo` | frontend/js/chat-agent.js:1300 |
| `pushDraftUndo` | frontend/js/chat-agent.js:2699 |
| `putDraftBack` | frontend/js/chat-agent.js:2724 |
| `refreshAfterToolChanges` | frontend/js/chat-agent.js:1987 |
| `rememberDraftVersion` | frontend/js/chat-agent.js:2627 |
| `renderAgentQuestion` | frontend/js/chat-agent.js:1917 |
| `renderDraftQuickstarts` | frontend/js/chat-agent.js:2529 |
| `renderDraftSources` | frontend/js/chat-agent.js:2566 |
| `renderDraftTarget` | frontend/js/chat-agent.js:2647 |
| `renderDraftVersions` | frontend/js/chat-agent.js:2598 |
| `renderMemoryProposal` | frontend/js/chat-agent.js:1842 |
| `renderRecordsDetails` | frontend/js/chat-agent.js:2368 |
| `renderToolConfirm` | frontend/js/chat-agent.js:1758 |
| `repaintAssistantAvatars` | frontend/js/chat-agent.js:1109 |
| `restoreChatPosition` | frontend/js/chat-agent.js:124 |
| `restoreDraftLocally` | frontend/js/chat-agent.js:2451 |
| `saveDraftLocally` | frontend/js/chat-agent.js:2429 |
| `savedPersona` | frontend/js/chat-agent.js:1006 |
| `setDraftStatus` | frontend/js/chat-agent.js:2667 |
| `settlePendingAgentQuestion` | frontend/js/chat-agent.js:1913 |
| `sourceHost` | frontend/js/chat-agent.js:2164 |
| `syncChatJumpLatest` | frontend/js/chat-agent.js:158 |
| `thinkingFold` | frontend/js/chat-agent.js:467 |
| `thinkingFoldIn` | frontend/js/chat-agent.js:487 |
| `thinkingPaint` | frontend/js/chat-agent.js:481 |
| `toolCardChips` | frontend/js/chat-agent.js:1599 |
| `toolCardsRow` | frontend/js/chat-agent.js:1658 |
| `toolChip` | frontend/js/chat-agent.js:1689 |
| `toolPreviewBody` | frontend/js/chat-agent.js:1542 |
| `toolPreviewPanel` | frontend/js/chat-agent.js:1577 |
| `toolTouchedRow` | frontend/js/chat-agent.js:1672 |
| `translateNoteInDesk` | frontend/js/chat-agent.js:2505 |
| `undoDraft` | frontend/js/chat-agent.js:2748 |
| `updateDraftCount` | frontend/js/chat-agent.js:2681 |
| `updateDraftUndoButton` | frontend/js/chat-agent.js:2735 |
| `userMarkEl` | frontend/js/chat-agent.js:405 |
| `userMarkSeed` | frontend/js/chat-agent.js:381 |

### frontend/js/chat-attach.js (73)

| Name | File:line |
|---|---|
| `appendRunResumeControls` | frontend/js/chat-attach.js:1412 |
| `attachBoardToChat` | frontend/js/chat-attach.js:577 |
| `attachChatFiles` | frontend/js/chat-attach.js:385 |
| `attachDocumentToChat` | frontend/js/chat-attach.js:630 |
| `attachImageFiles` | frontend/js/chat-attach.js:297 |
| `attachLibraryFile` | frontend/js/chat-attach.js:522 |
| `attachSelectionContext` | frontend/js/chat-attach.js:685 |
| `attachedNotes` | frontend/js/chat-attach.js:832 |
| `buildFollowupStrip` | frontend/js/chat-attach.js:2740 |
| `chatDeleteUndo` | frontend/js/chat-attach.js:3071 |
| `chatDockMoreOpen` | frontend/js/chat-attach.js:1351 |
| `chatTidyTyped` | frontend/js/chat-attach.js:1521 |
| `chatTurnObjects` | frontend/js/chat-attach.js:840 |
| `chatWriteRecord` | frontend/js/chat-attach.js:3089 |
| `clearSelectionAttachment` | frontend/js/chat-attach.js:709 |
| `closeChatDockMore` | frontend/js/chat-attach.js:1388 |
| `closeExtractPreview` | frontend/js/chat-attach.js:164 |
| `closeNotePicker` | frontend/js/chat-attach.js:1336 |
| `commitExtractPreview` | frontend/js/chat-attach.js:169 |
| `commitStagedImages` | frontend/js/chat-attach.js:337 |
| `deleteChatTurn` | frontend/js/chat-attach.js:2846 |
| `deleteCurrentChat` | frontend/js/chat-attach.js:3045 |
| `exportChatMarkdown` | frontend/js/chat-attach.js:3094 |
| `extractRefLabel` | frontend/js/chat-attach.js:53 |
| `flattenNoteMarkdown` | frontend/js/chat-attach.js:869 |
| `followupChain` | frontend/js/chat-attach.js:2769 |
| `followupMatches` | frontend/js/chat-attach.js:2767 |
| `followupParent` | frontend/js/chat-attach.js:2760 |
| `followupTrail` | frontend/js/chat-attach.js:2786 |
| `importChatDocuments` | frontend/js/chat-attach.js:427 |
| `isImageFile` | frontend/js/chat-attach.js:378 |
| `isStreamingConversation` | frontend/js/chat-attach.js:2973 |
| `keepUnreadableChatFile` | frontend/js/chat-attach.js:398 |
| `markFollowup` | frontend/js/chat-attach.js:2810 |
| `mountChatTimer` | frontend/js/chat-attach.js:2899 |
| `newChatConversation` | frontend/js/chat-attach.js:2993 |
| `noteLabel` | frontend/js/chat-attach.js:846 |
| `noteNamePlain` | frontend/js/chat-attach.js:905 |
| `notePickerColumns` | frontend/js/chat-attach.js:1200 |
| `notePickerEmpty` | frontend/js/chat-attach.js:1164 |
| `notePickerFacts` | frontend/js/chat-attach.js:1010 |
| `notePickerKeydown` | frontend/js/chat-attach.js:1214 |
| `notePickerOpen` | frontend/js/chat-attach.js:1345 |
| `notePickerPage` | frontend/js/chat-attach.js:1181 |
| `notePickerRoving` | frontend/js/chat-attach.js:1190 |
| `notePickerShape` | frontend/js/chat-attach.js:1020 |
| `notePickerUsedIn` | frontend/js/chat-attach.js:1002 |
| `offerFollowups` | frontend/js/chat-attach.js:2671 |
| `openChatDockMore` | frontend/js/chat-attach.js:1364 |
| `openExtractPreview` | frontend/js/chat-attach.js:22 |
| `openNotePicker` | frontend/js/chat-attach.js:1301 |
| `paintChatTimer` | frontend/js/chat-attach.js:2912 |
| `plainText` | frontend/js/chat-attach.js:883 |
| `reattachStreamingTurn` | frontend/js/chat-attach.js:2984 |
| `refreshFollowupVisibility` | frontend/js/chat-attach.js:2720 |
| `releaseChatComposer` | frontend/js/chat-attach.js:2943 |
| `renderAttachments` | frontend/js/chat-attach.js:958 |
| `renderBoardAttachments` | frontend/js/chat-attach.js:590 |
| `renderDocumentAttachments` | frontend/js/chat-attach.js:643 |
| `renderExtractPreview` | frontend/js/chat-attach.js:59 |
| `renderFileAttachments` | frontend/js/chat-attach.js:531 |
| `renderFollowups` | frontend/js/chat-attach.js:2706 |
| `renderImageAttachments` | frontend/js/chat-attach.js:253 |
| `renderSelectionAttachment` | frontend/js/chat-attach.js:714 |
| `revalidateSelection` | frontend/js/chat-attach.js:761 |
| `saveFollowups` | frontend/js/chat-attach.js:2829 |
| `selectionContextBlock` | frontend/js/chat-attach.js:812 |
| `sendChatMessage` | frontend/js/chat-attach.js:1526 |
| `setActiveChoice` | frontend/js/chat-attach.js:891 |
| `setNoteLabel` | frontend/js/chat-attach.js:915 |
| `setNotePickerSource` | frontend/js/chat-attach.js:1274 |
| `startChatTimer` | frontend/js/chat-attach.js:2924 |
| `stopChatTimer` | frontend/js/chat-attach.js:2933 |

### frontend/js/sheets-selects.js (53)

| Name | File:line |
|---|---|
| `aiNameNow` | frontend/js/sheets-selects.js:2181 |
| `annotateSliders` | frontend/js/sheets-selects.js:990 |
| `applySidebarSheetMode` | frontend/js/sheets-selects.js:199 |
| `applySidebarWidth` | frontend/js/sheets-selects.js:100 |
| `applyWebPanelWidth` | frontend/js/sheets-selects.js:506 |
| `builtinPersonas` | frontend/js/sheets-selects.js:2280 |
| `builtinThinkingWords` | frontend/js/sheets-selects.js:2230 |
| `clampToolbarMenu` | frontend/js/sheets-selects.js:1357 |
| `dateFieldFace` | frontend/js/sheets-selects.js:1019 |
| `eachSidebar` | frontend/js/sheets-selects.js:192 |
| `editChatAnswer` | frontend/js/sheets-selects.js:1822 |
| `editedMarker` | frontend/js/sheets-selects.js:1811 |
| `enhanceAllSelects` | frontend/js/sheets-selects.js:1001 |
| `enhanceDateField` | frontend/js/sheets-selects.js:1029 |
| `enhanceSelect` | frontend/js/sheets-selects.js:697 |
| `focusSelect` | frontend/js/sheets-selects.js:1092 |
| `formatTokens` | frontend/js/sheets-selects.js:1576 |
| `initResizableSidebars` | frontend/js/sheets-selects.js:455 |
| `initSidebarSheetDismissal` | frontend/js/sheets-selects.js:262 |
| `kebabMenu` | frontend/js/sheets-selects.js:1210 |
| `labelledMenu` | frontend/js/sheets-selects.js:620 |
| `layoutIsStacked` | frontend/js/sheets-selects.js:42 |
| `layoutIsTablet` | frontend/js/sheets-selects.js:79 |
| `lightboxReadingsFor` | frontend/js/sheets-selects.js:1547 |
| `loadChatSuggestions` | frontend/js/sheets-selects.js:2111 |
| `loadConversationList` | frontend/js/sheets-selects.js:1645 |
| `makeMenuItem` | frontend/js/sheets-selects.js:600 |
| `makeSidebarResizable` | frontend/js/sheets-selects.js:318 |
| `makeWebPanelResizable` | frontend/js/sheets-selects.js:543 |
| `openConversation` | frontend/js/sheets-selects.js:1885 |
| `openKebabSheet` | frontend/js/sheets-selects.js:1135 |
| `parseServerTime` | frontend/js/sheets-selects.js:1585 |
| `personaDisplayName` | frontend/js/sheets-selects.js:2187 |
| `personaNamesNow` | frontend/js/sheets-selects.js:2305 |
| `relativeTime` | frontend/js/sheets-selects.js:1595 |
| `renderDashboardPersonaSelect` | frontend/js/sheets-selects.js:2521 |
| `renderPersonas` | frontend/js/sheets-selects.js:2310 |
| `replaceOpenToolbarMenus` | frontend/js/sheets-selects.js:1463 |
| `resetWebPanelWidth` | frontend/js/sheets-selects.js:524 |
| `rowActions` | frontend/js/sheets-selects.js:1196 |
| `savePersonaList` | frontend/js/sheets-selects.js:2295 |
| `shortModelName` | frontend/js/sheets-selects.js:1502 |
| `sidebarDefault` | frontend/js/sheets-selects.js:23 |
| `sidebarFittedWidth` | frontend/js/sheets-selects.js:86 |
| `sidebarWidth` | frontend/js/sheets-selects.js:25 |
| `sortConversations` | frontend/js/sheets-selects.js:1632 |
| `thinkingWordsFor` | frontend/js/sheets-selects.js:2246 |
| `trackSeparatorValue` | frontend/js/sheets-selects.js:297 |
| `wantsThinkingWords` | frontend/js/sheets-selects.js:2267 |
| `watchForSelects` | frontend/js/sheets-selects.js:1104 |
| `webPanelIsNarrow` | frontend/js/sheets-selects.js:490 |
| `webPanelMaxWidth` | frontend/js/sheets-selects.js:500 |
| `wireInPlaceSheetDismissal` | frontend/js/sheets-selects.js:244 |

### frontend/js/skills.js (57)

| Name | File:line |
|---|---|
| `allSkills` | frontend/js/skills.js:28 |
| `appendToolRow` | frontend/js/skills.js:952 |
| `applyToolFilter` | frontend/js/skills.js:1016 |
| `askSkillInputs` | frontend/js/skills.js:226 |
| `batchArchive` | frontend/js/skills.js:1330 |
| `batchDelete` | frontend/js/skills.js:1373 |
| `batchEach` | frontend/js/skills.js:1297 |
| `batchExport` | frontend/js/skills.js:1367 |
| `batchFavourite` | frontend/js/skills.js:1324 |
| `batchMove` | frontend/js/skills.js:1275 |
| `batchNoun` | frontend/js/skills.js:1320 |
| `batchPublish` | frontend/js/skills.js:1341 |
| `batchPut` | frontend/js/skills.js:1316 |
| `batchSelection` | frontend/js/skills.js:1269 |
| `batchTag` | frontend/js/skills.js:1289 |
| `blobToBase64` | frontend/js/skills.js:1082 |
| `buildSkillsPanel` | frontend/js/skills.js:431 |
| `customSkills` | frontend/js/skills.js:35 |
| `desktopShell` | frontend/js/skills.js:1074 |
| `downloadBlob` | frontend/js/skills.js:1114 |
| `downloadFromApi` | frontend/js/skills.js:1098 |
| `downloadJson` | frontend/js/skills.js:1052 |
| `enterSelectMode` | frontend/js/skills.js:1241 |
| `exitSelectMode` | frontend/js/skills.js:1259 |
| `fillBatchCategories` | frontend/js/skills.js:1214 |
| `fillBatchMore` | frontend/js/skills.js:1347 |
| `fillSkillSelect` | frontend/js/skills.js:379 |
| `inputsToText` | frontend/js/skills.js:49 |
| `loadChatSkills` | frontend/js/skills.js:308 |
| `loadSkills` | frontend/js/skills.js:19 |
| `looksLikeAnAgentRequest` | frontend/js/skills.js:610 |
| `renderChatNudge` | frontend/js/skills.js:653 |
| `renderRunBudget` | frontend/js/skills.js:880 |
| `renderSkillFolderLine` | frontend/js/skills.js:822 |
| `renderSkillSettings` | frontend/js/skills.js:805 |
| `renderSkillToolPicker` | frontend/js/skills.js:88 |
| `renderSkillVerifyPicker` | frontend/js/skills.js:116 |
| `renderSmallModelMode` | frontend/js/skills.js:869 |
| `renderToolFocus` | frontend/js/skills.js:843 |
| `renderToolSettings` | frontend/js/skills.js:909 |
| `resetChatNudge` | frontend/js/skills.js:721 |
| `runSkill` | frontend/js/skills.js:159 |
| `saveFile` | frontend/js/skills.js:1130 |
| `saveSkillList` | frontend/js/skills.js:739 |
| `saveToolSwitch` | frontend/js/skills.js:891 |
| `setSkillVerify` | frontend/js/skills.js:136 |
| `skillMatchingDraft` | frontend/js/skills.js:620 |
| `skillPacePill` | frontend/js/skills.js:508 |
| `skillRow` | frontend/js/skills.js:749 |
| `skillSummary` | frontend/js/skills.js:726 |
| `startEditingSkill` | frontend/js/skills.js:55 |
| `startPlannedRun` | frontend/js/skills.js:171 |
| `startSkill` | frontend/js/skills.js:176 |
| `stepsToText` | frontend/js/skills.js:45 |
| `stopEditingSkill` | frontend/js/skills.js:73 |
| `syncSkillVerifyRow` | frontend/js/skills.js:151 |
| `updateBatchCount` | frontend/js/skills.js:1190 |

### frontend/js/shell-reminders.js (50)

| Name | File:line |
|---|---|
| `addReminder` | frontend/js/shell-reminders.js:1515 |
| `buildSelect` | frontend/js/shell-reminders.js:1703 |
| `clearDoneReminders` | frontend/js/shell-reminders.js:983 |
| `clipText` | frontend/js/shell-reminders.js:766 |
| `curtainShell` | frontend/js/shell-reminders.js:1665 |
| `defaultDueValue` | frontend/js/shell-reminders.js:1576 |
| `glideStrip` | frontend/js/shell-reminders.js:296 |
| `liftLockScreen` | frontend/js/shell-reminders.js:1686 |
| `loadReminders` | frontend/js/shell-reminders.js:837 |
| `markScrollEdge` | frontend/js/shell-reminders.js:430 |
| `markTabBarRecede` | frontend/js/shell-reminders.js:501 |
| `noteFirstImage` | frontend/js/shell-reminders.js:703 |
| `notePreviewText` | frontend/js/shell-reminders.js:788 |
| `nudgeDue` | frontend/js/shell-reminders.js:1363 |
| `onScrollEdge` | frontend/js/shell-reminders.js:533 |
| `paginateDoneReminders` | frontend/js/shell-reminders.js:933 |
| `presetDate` | frontend/js/shell-reminders.js:1252 |
| `refreshMediaSession` | frontend/js/shell-reminders.js:1629 |
| `refreshReminderDefaults` | frontend/js/shell-reminders.js:1384 |
| `relativeWhen` | frontend/js/shell-reminders.js:1219 |
| `reminderComposeIsPristine` | frontend/js/shell-reminders.js:1372 |
| `reminderEditForm` | frontend/js/shell-reminders.js:1416 |
| `reminderItem` | frontend/js/shell-reminders.js:1022 |
| `reminderMadeUndo` | frontend/js/shell-reminders.js:1506 |
| `reminderPutUndoably` | frontend/js/shell-reminders.js:1494 |
| `reminderTarget` | frontend/js/shell-reminders.js:1200 |
| `revealActiveTab` | frontend/js/shell-reminders.js:256 |
| `safeMdSlice` | frontend/js/shell-reminders.js:659 |
| `setDue` | frontend/js/shell-reminders.js:1301 |
| `snoozeReminderTo` | frontend/js/shell-reminders.js:1393 |
| `startClockTicker` | frontend/js/shell-reminders.js:59 |
| `startMinuteTicker` | frontend/js/shell-reminders.js:34 |
| `stopClockTicker` | frontend/js/shell-reminders.js:63 |
| `stripFrontmatter` | frontend/js/shell-reminders.js:776 |
| `syncDueFromParts` | frontend/js/shell-reminders.js:1315 |
| `syncEdgeFade` | frontend/js/shell-reminders.js:369 |
| `syncPartsFromDue` | frontend/js/shell-reminders.js:1307 |
| `syncScrollEdges` | frontend/js/shell-reminders.js:584 |
| `syncTabOverflowFade` | frontend/js/shell-reminders.js:214 |
| `tabBarMode` | frontend/js/shell-reminders.js:208 |
| `tabCentreSpace` | frontend/js/shell-reminders.js:145 |
| `tabContentWidth` | frontend/js/shell-reminders.js:185 |
| `tabRowSpace` | frontend/js/shell-reminders.js:120 |
| `tickClocks` | frontend/js/shell-reminders.js:12 |
| `toLocalInputValue` | frontend/js/shell-reminders.js:1245 |
| `updateDueReadout` | frontend/js/shell-reminders.js:1327 |
| `updateReminderBadge` | frontend/js/shell-reminders.js:952 |
| `wikiLinkLabel` | frontend/js/shell-reminders.js:727 |
| `wikiLinkShown` | frontend/js/shell-reminders.js:753 |
| `wikiLinkTarget` | frontend/js/shell-reminders.js:744 |

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
| `catalogueRun` | frontend/js/settings-panes.js:1231 |
| `changePassword` | frontend/js/settings-panes.js:563 |
| `chatDockReleaseRing` | frontend/js/settings-panes.js:348 |
| `chatDockSuppressRing` | frontend/js/settings-panes.js:329 |
| `checkForSourceUpdateNotice` | frontend/js/settings-panes.js:840 |
| `currentZoom` | frontend/js/settings-panes.js:1082 |
| `downloadExport` | frontend/js/settings-panes.js:1056 |
| `fitChatEmpty` | frontend/js/settings-panes.js:290 |
| `fitComposerToDock` | frontend/js/settings-panes.js:244 |
| `flashRevealed` | frontend/js/settings-panes.js:1188 |
| `hud` | frontend/js/settings-panes.js:1127 |
| `initAutoGrow` | frontend/js/settings-panes.js:441 |
| `initComposerResize` | frontend/js/settings-panes.js:363 |
| `loadPreferences` | frontend/js/settings-panes.js:675 |
| `markPrefsDirty` | frontend/js/settings-panes.js:985 |
| `markPrefsSaved` | frontend/js/settings-panes.js:1001 |
| `nudgeZoom` | frontend/js/settings-panes.js:1148 |
| `paletteAbouts` | frontend/js/settings-panes.js:1506 |
| `paletteCommands` | frontend/js/settings-panes.js:1240 |
| `paletteKeys` | frontend/js/settings-panes.js:1492 |
| `paletteRowParts` | frontend/js/settings-panes.js:1517 |
| `refitComposer` | frontend/js/settings-panes.js:269 |
| `renderAccount` | frontend/js/settings-panes.js:488 |
| `renderAutonomousSettings` | frontend/js/settings-panes.js:757 |
| `renderPrefs` | frontend/js/settings-panes.js:693 |
| `renderWebSearch` | frontend/js/settings-panes.js:779 |
| `reportTimezone` | frontend/js/settings-panes.js:638 |
| `savePrefs` | frontend/js/settings-panes.js:880 |
| `saveSearchProvider` | frontend/js/settings-panes.js:818 |
| `setPreference` | frontend/js/settings-panes.js:862 |
| `setZoom` | frontend/js/settings-panes.js:1086 |
| `updateProfileCount` | frontend/js/settings-panes.js:1044 |
| `watchOverlays` | frontend/js/settings-panes.js:453 |
| `wirePrefsDirtyMarks` | frontend/js/settings-panes.js:1020 |

### frontend/js/media.js (21)

| Name | File:line |
|---|---|
| `closeSketch` | frontend/js/media.js:278 |
| `highlighterBlend` | frontend/js/media.js:61 |
| `highlighterWidth` | frontend/js/media.js:48 |
| `micAudioConstraints` | frontend/js/media.js:559 |
| `openSketch` | frontend/js/media.js:227 |
| `saveSketch` | frontend/js/media.js:460 |
| `sketchApplyBrush` | frontend/js/media.js:68 |
| `sketchContext` | frontend/js/media.js:196 |
| `sketchDrawBackground` | frontend/js/media.js:214 |
| `sketchEnd` | frontend/js/media.js:409 |
| `sketchMove` | frontend/js/media.js:330 |
| `sketchPaintHighlighter` | frontend/js/media.js:126 |
| `sketchPointer` | frontend/js/media.js:285 |
| `sketchSaveSnapshot` | frontend/js/media.js:182 |
| `sketchStart` | frontend/js/media.js:296 |
| `sketchStrokeLayer` | frontend/js/media.js:113 |
| `sketchUploadImage` | frontend/js/media.js:265 |
| `speakText` | frontend/js/media.js:721 |
| `startMicLevelMeter` | frontend/js/media.js:569 |
| `syncSketchSizeReadout` | frontend/js/media.js:260 |
| `toggleDictation` | frontend/js/media.js:650 |

### frontend/js/status.js (107)

| Name | File:line |
|---|---|
| `agentActivityNotice` | frontend/js/status.js:635 |
| `agentActivityQuiet` | frontend/js/status.js:627 |
| `agentModeAvailable` | frontend/js/status.js:2561 |
| `aiIsOff` | frontend/js/status.js:1809 |
| `aiOffGlyph` | frontend/js/status.js:2178 |
| `aiOfflineDismissed` | frontend/js/status.js:1984 |
| `aiStatusState` | frontend/js/status.js:2065 |
| `announcedReminders` | frontend/js/status.js:42 |
| `appStackIsNewer` | frontend/js/status.js:1355 |
| `armReminderTimer` | frontend/js/status.js:510 |
| `askNotificationPermission` | frontend/js/status.js:380 |
| `backendLabel` | frontend/js/status.js:2624 |
| `boardHistoryActive` | frontend/js/status.js:1324 |
| `checkDueReminders` | frontend/js/status.js:526 |
| `closeModelGate` | frontend/js/status.js:1826 |
| `closeNotifications` | frontend/js/status.js:360 |
| `dismissAiOffline` | frontend/js/status.js:1993 |
| `dismissToast` | frontend/js/status.js:738 |
| `dismissedNotificationIds` | frontend/js/status.js:234 |
| `emailSupportReport` | frontend/js/status.js:781 |
| `forcedReadIds` | frontend/js/status.js:202 |
| `forcedUnreadIds` | frontend/js/status.js:171 |
| `insightLine` | frontend/js/status.js:1251 |
| `insightSend` | frontend/js/status.js:1224 |
| `insightVerdicts` | frontend/js/status.js:1228 |
| `integrityWords` | frontend/js/status.js:1063 |
| `isNotificationUnread` | frontend/js/status.js:220 |
| `jobsRunning` | frontend/js/status.js:1673 |
| `keepToastAction` | frontend/js/status.js:339 |
| `lastAnswerLine` | frontend/js/status.js:2200 |
| `loadMostUsed` | frontend/js/status.js:1559 |
| `loadRecentQuestions` | frontend/js/status.js:1532 |
| `noteDamagedNotebook` | frontend/js/status.js:1067 |
| `noteServerDown` | frontend/js/status.js:1123 |
| `noteServerUp` | frontend/js/status.js:1132 |
| `noticeTaskTransitions` | frontend/js/status.js:2870 |
| `noticeUnwatchedAnswer` | frontend/js/status.js:670 |
| `notificationsMuted` | frontend/js/status.js:612 |
| `notificationsReadAt` | frontend/js/status.js:153 |
| `notify` | frontend/js/status.js:454 |
| `nudgeEmbeddingProblem` | frontend/js/status.js:2243 |
| `offerUndo` | frontend/js/status.js:1266 |
| `openModelGate` | frontend/js/status.js:1836 |
| `openModelOffer` | frontend/js/status.js:1843 |
| `openUndoHistoryMenu` | frontend/js/status.js:1473 |
| `paintStatusItem` | frontend/js/status.js:2297 |
| `paintTitle` | frontend/js/status.js:487 |
| `paintUndoDoor` | frontend/js/status.js:1433 |
| `performRedo` | frontend/js/status.js:1387 |
| `performUndo` | frontend/js/status.js:1364 |
| `plainHttpError` | frontend/js/status.js:854 |
| `playReminderChime` | frontend/js/status.js:420 |
| `pollServerHealth` | frontend/js/status.js:1160 |
| `primeReminderAudio` | frontend/js/status.js:395 |
| `pushEntryPutUndo` | frontend/js/status.js:1299 |
| `pushUndo` | frontend/js/status.js:1197 |
| `recordNotification` | frontend/js/status.js:97 |
| `refreshBackgroundTasks` | frontend/js/status.js:2799 |
| `refreshModelStatus` | frontend/js/status.js:1701 |
| `rememberAnnounced` | frontend/js/status.js:50 |
| `renderAgentActivityMode` | frontend/js/status.js:706 |
| `renderAiOfflineNotice` | frontend/js/status.js:2008 |
| `renderAiPill` | frontend/js/status.js:2208 |
| `renderBackendPicker` | frontend/js/status.js:2634 |
| `renderChatModeSeg` | frontend/js/status.js:2565 |
| `renderNotifMuteToggle` | frontend/js/status.js:269 |
| `renderNotificationBadge` | frontend/js/status.js:249 |
| `renderSearchEngineHealth` | frontend/js/status.js:2490 |
| `renderSettings` | frontend/js/status.js:2667 |
| `renderStatusBar` | frontend/js/status.js:2333 |
| `renderUndoBar` | frontend/js/status.js:1418 |
| `reopenAnswerPanel` | frontend/js/status.js:685 |
| `resetStatusCadence` | frontend/js/status.js:1623 |
| `retryServerNow` | frontend/js/status.js:1173 |
| `scheduleServerDownRetry` | frontend/js/status.js:1147 |
| `scheduleUndoBar` | frontend/js/status.js:1410 |
| `setChatMode` | frontend/js/status.js:2608 |
| `setForcedReadIds` | frontend/js/status.js:211 |
| `setForcedUnreadIds` | frontend/js/status.js:180 |
| `setTitleCount` | frontend/js/status.js:492 |
| `setTitleView` | frontend/js/status.js:497 |
| `settingsOpen` | frontend/js/status.js:1640 |
| `settleNotification` | frontend/js/status.js:118 |
| `settleStartedNotification` | frontend/js/status.js:138 |
| `settleUndoFromToast` | frontend/js/status.js:1287 |
| `showAgentNoModelHint` | frontend/js/status.js:2603 |
| `showServerDownBanner` | frontend/js/status.js:1106 |
| `startReminderWatch` | frontend/js/status.js:589 |
| `storedNotifications` | frontend/js/status.js:84 |
| `surfaceHistory` | frontend/js/status.js:1337 |
| `syncAgentPaletteAvailability` | frontend/js/status.js:2047 |
| `syncModelGatedControls` | frontend/js/status.js:1890 |
| `syncNotifBlocked` | frontend/js/status.js:375 |
| `taskEndingWords` | frontend/js/status.js:145 |
| `taskKey` | frontend/js/status.js:2851 |
| `toast` | frontend/js/status.js:909 |
| `toastAction` | frontend/js/status.js:1043 |
| `toastActionButton` | frontend/js/status.js:1023 |
| `toastActions` | frontend/js/status.js:1014 |
| `toastCloseButton` | frontend/js/status.js:746 |
| `toastHost` | frontend/js/status.js:823 |
| `toastProgress` | frontend/js/status.js:979 |
| `toastStack` | frontend/js/status.js:722 |
| `toggleAiStatusPopup` | frontend/js/status.js:2475 |
| `toggleNotificationMute` | frontend/js/status.js:285 |
| `unreadNotifications` | frontend/js/status.js:243 |
| `voiceLine` | frontend/js/status.js:903 |

### frontend/js/ai-tools.js (50)

| Name | File:line |
|---|---|
| `_namesSignature` | frontend/js/ai-tools.js:372 |
| `applyEmbeddingBackend` | frontend/js/ai-tools.js:1391 |
| `applyFeatureModel` | frontend/js/ai-tools.js:736 |
| `applyImprove` | frontend/js/ai-tools.js:1373 |
| `applyPalette` | frontend/js/ai-tools.js:1734 |
| `clearEmbeddingBackendLatch` | frontend/js/ai-tools.js:1438 |
| `closeImprove` | frontend/js/ai-tools.js:1330 |
| `featureModelChoiceLabel` | frontend/js/ai-tools.js:730 |
| `featureModelMenuItem` | frontend/js/ai-tools.js:929 |
| `featureModelRow` | frontend/js/ai-tools.js:712 |
| `featureModelState` | frontend/js/ai-tools.js:720 |
| `fillModelSelect` | frontend/js/ai-tools.js:376 |
| `followTaskLines` | frontend/js/ai-tools.js:185 |
| `improveReady` | frontend/js/ai-tools.js:1319 |
| `looksLikeEmbeddingModel` | frontend/js/ai-tools.js:1387 |
| `mirroredUiKeys` | frontend/js/ai-tools.js:1542 |
| `openChatModelPanel` | frontend/js/ai-tools.js:543 |
| `openFeatureModelSheet` | frontend/js/ai-tools.js:854 |
| `openImprove` | frontend/js/ai-tools.js:1295 |
| `paintLiveRunLines` | frontend/js/ai-tools.js:221 |
| `paintTaskRunLines` | frontend/js/ai-tools.js:161 |
| `placeChatModelPanel` | frontend/js/ai-tools.js:511 |
| `renderAutonomousModelPicker` | frontend/js/ai-tools.js:1062 |
| `renderChatActiveModelBadge` | frontend/js/ai-tools.js:436 |
| `renderChatModelPicker` | frontend/js/ai-tools.js:409 |
| `renderEmbeddingPicker` | frontend/js/ai-tools.js:1077 |
| `renderFeatureModels` | frontend/js/ai-tools.js:756 |
| `renderOcrModelPicker` | frontend/js/ai-tools.js:1043 |
| `renderReindex` | frontend/js/ai-tools.js:1239 |
| `renderTaskHistory` | frontend/js/ai-tools.js:278 |
| `renderTasks` | frontend/js/ai-tools.js:20 |
| `renderUtilityModelPicker` | frontend/js/ai-tools.js:637 |
| `renderVisionModelPicker` | frontend/js/ai-tools.js:660 |
| `runImprove` | frontend/js/ai-tools.js:1336 |
| `saveUiState` | frontend/js/ai-tools.js:1600 |
| `seedUiStateFromServer` | frontend/js/ai-tools.js:1676 |
| `syncEmbeddingPickerState` | frontend/js/ai-tools.js:1176 |
| `syncFeatureModelSelects` | frontend/js/ai-tools.js:964 |
| `taskElapsed` | frontend/js/ai-tools.js:229 |
| `taskLinesWanted` | frontend/js/ai-tools.js:181 |
| `taskOriginWords` | frontend/js/ai-tools.js:122 |
| `taskRunFold` | frontend/js/ai-tools.js:138 |
| `taskRunLinesText` | frontend/js/ai-tools.js:128 |
| `taskSteps` | frontend/js/ai-tools.js:247 |
| `uiStateFingerprint` | frontend/js/ai-tools.js:1589 |
| `uiStatePayload` | frontend/js/ai-tools.js:1576 |
| `uiStateRememberSynced` | frontend/js/ai-tools.js:1710 |
| `watchMirroredUiKeys` | frontend/js/ai-tools.js:1645 |
| `wireFeatureModelSelects` | frontend/js/ai-tools.js:1025 |
| `wireReindexButton` | frontend/js/ai-tools.js:1218 |

### frontend/js/phone-shell.js (51)

| Name | File:line |
|---|---|
| `buildSettingsJumpList` | frontend/js/phone-shell.js:1670 |
| `clearAppCache` | frontend/js/phone-shell.js:2048 |
| `closeNotePageIfGone` | frontend/js/phone-shell.js:990 |
| `dockArrangeLabel` | frontend/js/phone-shell.js:1832 |
| `dockArrangeSlot` | frontend/js/phone-shell.js:1821 |
| `dockChatAttachments` | frontend/js/phone-shell.js:1104 |
| `dockChatTools` | frontend/js/phone-shell.js:1162 |
| `dockPhoneStatus` | frontend/js/phone-shell.js:719 |
| `dockTabBar` | frontend/js/phone-shell.js:581 |
| `emblemHue` | frontend/js/phone-shell.js:98 |
| `emblemRandom` | frontend/js/phone-shell.js:87 |
| `ensureP5` | frontend/js/phone-shell.js:60 |
| `floatPrimaryActions` | frontend/js/phone-shell.js:1758 |
| `focusTabPage` | frontend/js/phone-shell.js:390 |
| `foldDockActions` | frontend/js/phone-shell.js:1935 |
| `foldDockArrange` | frontend/js/phone-shell.js:1891 |
| `foldSiblingsIntoMenu` | frontend/js/phone-shell.js:1863 |
| `foldZoneIntoMenu` | frontend/js/phone-shell.js:1844 |
| `forceReloadApp` | frontend/js/phone-shell.js:2063 |
| `initBottomTabBar` | frontend/js/phone-shell.js:612 |
| `initDockActionFolding` | frontend/js/phone-shell.js:1978 |
| `initDockFolding` | frontend/js/phone-shell.js:1909 |
| `initHeaderHeightToken` | frontend/js/phone-shell.js:514 |
| `initKeyboardInset` | frontend/js/phone-shell.js:1602 |
| `initNotePage` | frontend/js/phone-shell.js:995 |
| `initNotesSubtabHeightToken` | frontend/js/phone-shell.js:537 |
| `initOcrPhonePage` | frontend/js/phone-shell.js:1082 |
| `initPhoneChatRow` | frontend/js/phone-shell.js:1217 |
| `initPhoneHeaderMore` | frontend/js/phone-shell.js:650 |
| `initPhoneStatus` | frontend/js/phone-shell.js:755 |
| `initPrimaryFab` | frontend/js/phone-shell.js:1784 |
| `initRowSwipe` | frontend/js/phone-shell.js:850 |
| `mountPhoneSidebarOpeners` | frontend/js/phone-shell.js:789 |
| `ocrPhonePage` | frontend/js/phone-shell.js:1046 |
| `openNotePage` | frontend/js/phone-shell.js:948 |
| `openPhoneMoreSheet` | frontend/js/phone-shell.js:1451 |
| `openSheet` | frontend/js/phone-shell.js:1257 |
| `phoneMoreRunCount` | frontend/js/phone-shell.js:1532 |
| `quitApp` | frontend/js/phone-shell.js:2017 |
| `releaseDetachedEmblems` | frontend/js/phone-shell.js:134 |
| `releaseEmblem` | frontend/js/phone-shell.js:117 |
| `renderAutonomousReview` | frontend/js/phone-shell.js:2135 |
| `renderBrandLogo` | frontend/js/phone-shell.js:245 |
| `renderEmblem` | frontend/js/phone-shell.js:140 |
| `renderEmblemWhenShown` | frontend/js/phone-shell.js:267 |
| `renderExportsList` | frontend/js/phone-shell.js:2074 |
| `sheetRow` | frontend/js/phone-shell.js:1425 |
| `syncPhoneMoreButton` | frontend/js/phone-shell.js:1564 |
| `syncPhoneMoreRuns` | frontend/js/phone-shell.js:1541 |
| `toggleAutonomousPanel` | frontend/js/phone-shell.js:2110 |
| `watchEmblemVisibility` | frontend/js/phone-shell.js:40 |

### frontend/js/wiring.js (34)

| Name | File:line |
|---|---|
| `addAtlasLine` | frontend/js/wiring.js:210 |
| `applyPendingChatTitle` | frontend/js/wiring.js:740 |
| `applyPlanMode` | frontend/js/wiring.js:1449 |
| `askAtlasAbout` | frontend/js/wiring.js:199 |
| `chatRecallStep` | frontend/js/wiring.js:800 |
| `clearDueNudges` | frontend/js/wiring.js:1712 |
| `closeGlobalFind` | frontend/js/wiring.js:626 |
| `dashboardGreetingPersona` | frontend/js/wiring.js:905 |
| `escapeForFind` | frontend/js/wiring.js:404 |
| `globalFindClearHighlights` | frontend/js/wiring.js:462 |
| `globalFindRun` | frontend/js/wiring.js:473 |
| `globalFindShowActive` | frontend/js/wiring.js:545 |
| `globalFindStep` | frontend/js/wiring.js:558 |
| `globalFindWalkableRoot` | frontend/js/wiring.js:437 |
| `initGraphOptionFolds` | frontend/js/wiring.js:1022 |
| `initHelpToggles` | frontend/js/wiring.js:219 |
| `noteSourceOn` | frontend/js/wiring.js:871 |
| `nudgeDueShown` | frontend/js/wiring.js:1716 |
| `openGlobalFind` | frontend/js/wiring.js:564 |
| `openReminderCompose` | frontend/js/wiring.js:1612 |
| `paintDashboardPersonaMark` | frontend/js/wiring.js:911 |
| `reflectOnlineState` | frontend/js/wiring.js:16 |
| `renameCurrentConversation` | frontend/js/wiring.js:713 |
| `renderPlanToggle` | frontend/js/wiring.js:1436 |
| `renderWebSearchToggle` | frontend/js/wiring.js:1392 |
| `setFullscreenSurface` | frontend/js/wiring.js:1259 |
| `setGraphOptionsOpen` | frontend/js/wiring.js:1043 |
| `setNoteSource` | frontend/js/wiring.js:886 |
| `settingsSectionContaining` | frontend/js/wiring.js:450 |
| `startNewNote` | frontend/js/wiring.js:1315 |
| `syncNoteSourceButtons` | frontend/js/wiring.js:879 |
| `timelineSelectableRows` | frontend/js/wiring.js:1367 |
| `toggleSelectAllRows` | frontend/js/wiring.js:1353 |
| `watchFullscreenSurface` | frontend/js/wiring.js:1265 |

### frontend/js/settings-wiring.js (43)

| Name | File:line |
|---|---|
| `_isChatComposer` | frontend/js/settings-wiring.js:1848 |
| `activeOverlay` | frontend/js/settings-wiring.js:838 |
| `buildShortcutList` | frontend/js/settings-wiring.js:1343 |
| `captureCountText` | frontend/js/settings-wiring.js:1646 |
| `captureShortcutKey` | frontend/js/settings-wiring.js:1398 |
| `clearStagedImages` | frontend/js/settings-wiring.js:1987 |
| `closeOverlaysForChord` | frontend/js/settings-wiring.js:1132 |
| `closeShortcuts` | frontend/js/settings-wiring.js:1460 |
| `comboFromEvent` | frontend/js/settings-wiring.js:1171 |
| `commitCaptureImages` | frontend/js/settings-wiring.js:1972 |
| `fileDropBox` | frontend/js/settings-wiring.js:1857 |
| `flashSaved` | frontend/js/settings-wiring.js:400 |
| `handleFileUpload` | frontend/js/settings-wiring.js:2019 |
| `hideChordGuide` | frontend/js/settings-wiring.js:1152 |
| `loadForgottenOrder` | frontend/js/settings-wiring.js:1532 |
| `loadShortcuts` | frontend/js/settings-wiring.js:1009 |
| `localizeStaticChords` | frontend/js/settings-wiring.js:1052 |
| `matchesShortcut` | frontend/js/settings-wiring.js:1189 |
| `maybeShowOnboarding` | frontend/js/settings-wiring.js:859 |
| `notebookLocked` | frontend/js/settings-wiring.js:385 |
| `openShortcuts` | frontend/js/settings-wiring.js:1428 |
| `persistSavedSearches` | frontend/js/settings-wiring.js:53 |
| `renderCaptureFiles` | frontend/js/settings-wiring.js:1619 |
| `renderEntryAttachmentChips` | frontend/js/settings-wiring.js:1599 |
| `renderInstallRow` | frontend/js/settings-wiring.js:1772 |
| `renderSavedSearches` | frontend/js/settings-wiring.js:17 |
| `renderShortcutList` | frontend/js/settings-wiring.js:1331 |
| `resetShortcuts` | frontend/js/settings-wiring.js:1302 |
| `restampShortcutHints` | frontend/js/settings-wiring.js:1062 |
| `rewriteStagedUrls` | frontend/js/settings-wiring.js:1960 |
| `runShortcut` | frontend/js/settings-wiring.js:1194 |
| `saveCurrentSearch` | frontend/js/settings-wiring.js:61 |
| `saveShortcutOverrides` | frontend/js/settings-wiring.js:1159 |
| `saveWhatIsInFront` | frontend/js/settings-wiring.js:463 |
| `savedSearches` | frontend/js/settings-wiring.js:13 |
| `setShortcutStatus` | frontend/js/settings-wiring.js:1318 |
| `setShortcutStatusError` | frontend/js/settings-wiring.js:1325 |
| `singleKeysOn` | frontend/js/settings-wiring.js:2155 |
| `stagedImageUrl` | frontend/js/settings-wiring.js:1937 |
| `stampShortcutTitles` | frontend/js/settings-wiring.js:1038 |
| `submitLockForm` | frontend/js/settings-wiring.js:247 |
| `textCounts` | frontend/js/settings-wiring.js:1636 |
| `uploadStagedFiles` | frontend/js/settings-wiring.js:1996 |

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
| `nameMarkBuddyAct` | frontend/js/avatars.js:6960 |
| `nameMarkBuddyActOff` | frontend/js/avatars.js:3477 |
| `nameMarkBuddyActions` | frontend/js/avatars.js:3654 |
| `nameMarkBuddyActivitiesOff` | frontend/js/avatars.js:3470 |
| `nameMarkBuddyAim` | frontend/js/avatars.js:7126 |
| `nameMarkBuddyAnimProps` | frontend/js/avatars.js:5297 |
| `nameMarkBuddyApplyPreset` | frontend/js/avatars.js:3547 |
| `nameMarkBuddyArrive` | frontend/js/avatars.js:6607 |
| `nameMarkBuddyAsleep` | frontend/js/avatars.js:7963 |
| `nameMarkBuddyAwake` | frontend/js/avatars.js:7876 |
| `nameMarkBuddyBand` | frontend/js/avatars.js:5031 |
| `nameMarkBuddyBeat` | frontend/js/avatars.js:6461 |
| `nameMarkBuddyBellErrand` | frontend/js/avatars.js:8364 |
| `nameMarkBuddyBlend` | frontend/js/avatars.js:7989 |
| `nameMarkBuddyBody` | frontend/js/avatars.js:3803 |
| `nameMarkBuddyBoredom` | frontend/js/avatars.js:8082 |
| `nameMarkBuddyBuild` | frontend/js/avatars.js:8718 |
| `nameMarkBuddyBurst` | frontend/js/avatars.js:6215 |
| `nameMarkBuddyCallBack` | frontend/js/avatars.js:6936 |
| `nameMarkBuddyCalmAllows` | frontend/js/avatars.js:7950 |
| `nameMarkBuddyCatchUp` | frontend/js/avatars.js:5230 |
| `nameMarkBuddyChatErrand` | frontend/js/avatars.js:8374 |
| `nameMarkBuddyCheck` | frontend/js/avatars.js:6379 |
| `nameMarkBuddyChoose` | frontend/js/avatars.js:4506 |
| `nameMarkBuddyClickReaction` | frontend/js/avatars.js:7936 |
| `nameMarkBuddyColours` | frontend/js/avatars.js:3788 |
| `nameMarkBuddyContext` | frontend/js/avatars.js:8437 |
| `nameMarkBuddyCoverPoint` | frontend/js/avatars.js:4164 |
| `nameMarkBuddyCovers` | frontend/js/avatars.js:4129 |
| `nameMarkBuddyCrossfade` | frontend/js/avatars.js:5654 |
| `nameMarkBuddyCue` | frontend/js/avatars.js:7669 |
| `nameMarkBuddyCurlUp` | frontend/js/avatars.js:7221 |
| `nameMarkBuddyCurtained` | frontend/js/avatars.js:6600 |
| `nameMarkBuddyCustom` | frontend/js/avatars.js:352 |
| `nameMarkBuddyDecide` | frontend/js/avatars.js:7292 |
| `nameMarkBuddyDodge` | frontend/js/avatars.js:3969 |
| `nameMarkBuddyDrift` | frontend/js/avatars.js:7537 |
| `nameMarkBuddyDrop` | frontend/js/avatars.js:4757 |
| `nameMarkBuddyEase` | frontend/js/avatars.js:8053 |
| `nameMarkBuddyEdges` | frontend/js/avatars.js:4290 |
| `nameMarkBuddyEmote` | frontend/js/avatars.js:3487 |
| `nameMarkBuddyEnter` | frontend/js/avatars.js:6709 |
| `nameMarkBuddyErrand` | frontend/js/avatars.js:8346 |
| `nameMarkBuddyExpress` | frontend/js/avatars.js:7449 |
| `nameMarkBuddyFarWay` | frontend/js/avatars.js:5613 |
| `nameMarkBuddyFeel` | frontend/js/avatars.js:7911 |
| `nameMarkBuddyFlies` | frontend/js/avatars.js:5637 |
| `nameMarkBuddyFlip` | frontend/js/avatars.js:6139 |
| `nameMarkBuddyFollow` | frontend/js/avatars.js:5111 |
| `nameMarkBuddyFollowFrame` | frontend/js/avatars.js:5273 |
| `nameMarkBuddyFrames` | frontend/js/avatars.js:7199 |
| `nameMarkBuddyGait` | frontend/js/avatars.js:5627 |
| `nameMarkBuddyGetUp` | frontend/js/avatars.js:7225 |
| `nameMarkBuddyGlue` | frontend/js/avatars.js:5062 |
| `nameMarkBuddyGlueBand` | frontend/js/avatars.js:5098 |
| `nameMarkBuddyGo` | frontend/js/avatars.js:5780 |
| `nameMarkBuddyGone` | frontend/js/avatars.js:8598 |
| `nameMarkBuddyHalt` | frontend/js/avatars.js:7241 |
| `nameMarkBuddyHasAtlas` | frontend/js/avatars.js:7196 |
| `nameMarkBuddyHeadAt` | frontend/js/avatars.js:8221 |
| `nameMarkBuddyHide` | frontend/js/avatars.js:8637 |
| `nameMarkBuddyHint` | frontend/js/avatars.js:9283 |
| `nameMarkBuddyHits` | frontend/js/avatars.js:4111 |
| `nameMarkBuddyHold` | frontend/js/avatars.js:7532 |
| `nameMarkBuddyHome` | frontend/js/avatars.js:2827 |
| `nameMarkBuddyHover` | frontend/js/avatars.js:6042 |
| `nameMarkBuddyHoverReaction` | frontend/js/avatars.js:8074 |
| `nameMarkBuddyIndexReset` | frontend/js/avatars.js:4219 |
| `nameMarkBuddyInsideCard` | frontend/js/avatars.js:4355 |
| `nameMarkBuddyJoy` | frontend/js/avatars.js:7497 |
| `nameMarkBuddyKeepCustom` | frontend/js/avatars.js:365 |
| `nameMarkBuddyKeepFrame` | frontend/js/avatars.js:7232 |
| `nameMarkBuddyKeepPresets` | frontend/js/avatars.js:3516 |
| `nameMarkBuddyKeepSpots` | frontend/js/avatars.js:4621 |
| `nameMarkBuddyKeepUp` | frontend/js/avatars.js:5268 |
| `nameMarkBuddyLean` | frontend/js/avatars.js:8301 |
| `nameMarkBuddyLeanSide` | frontend/js/avatars.js:8296 |
| `nameMarkBuddyLeave` | frontend/js/avatars.js:6865 |
| `nameMarkBuddyLedges` | frontend/js/avatars.js:3901 |
| `nameMarkBuddyLieDown` | frontend/js/avatars.js:7214 |
| `nameMarkBuddyLieRoom` | frontend/js/avatars.js:7047 |
| `nameMarkBuddyLimbs` | frontend/js/avatars.js:5726 |
| `nameMarkBuddyLockSync` | frontend/js/avatars.js:6331 |
| `nameMarkBuddyLoud` | frontend/js/avatars.js:7955 |
| `nameMarkBuddyMade` | frontend/js/avatars.js:3157 |
| `nameMarkBuddyMakeHint` | frontend/js/avatars.js:3177 |
| `nameMarkBuddyMakeIt` | frontend/js/avatars.js:3170 |
| `nameMarkBuddyMenuOpen` | frontend/js/avatars.js:6457 |
| `nameMarkBuddyMotion` | frontend/js/avatars.js:3730 |
| `nameMarkBuddyMotionApply` | frontend/js/avatars.js:3762 |
| `nameMarkBuddyMoveTo` | frontend/js/avatars.js:5515 |
| `nameMarkBuddyNextSpot` | frontend/js/avatars.js:6580 |
| `nameMarkBuddyNoTravel` | frontend/js/avatars.js:3774 |
| `nameMarkBuddyNoteOpen` | frontend/js/avatars.js:7644 |
| `nameMarkBuddyNoteOpened` | frontend/js/avatars.js:7637 |
| `nameMarkBuddyNotice` | frontend/js/avatars.js:8231 |
| `nameMarkBuddyObstacles` | frontend/js/avatars.js:3910 |
| `nameMarkBuddyOrigin` | frontend/js/avatars.js:4069 |
| `nameMarkBuddyOverCanvas` | frontend/js/avatars.js:4344 |
| `nameMarkBuddyOverhang` | frontend/js/avatars.js:4977 |
| `nameMarkBuddyPainted` | frontend/js/avatars.js:4284 |
| `nameMarkBuddyPanelMoving` | frontend/js/avatars.js:5311 |
| `nameMarkBuddyPerchShown` | frontend/js/avatars.js:3893 |
| `nameMarkBuddyPerches` | frontend/js/avatars.js:4454 |
| `nameMarkBuddyPet` | frontend/js/avatars.js:6061 |
| `nameMarkBuddyPickVariant` | frontend/js/avatars.js:7060 |
| `nameMarkBuddyPointer` | frontend/js/avatars.js:8489 |
| `nameMarkBuddyPoof` | frontend/js/avatars.js:6163 |
| `nameMarkBuddyPopups` | frontend/js/avatars.js:3956 |
| `nameMarkBuddyPout` | frontend/js/avatars.js:8064 |
| `nameMarkBuddyPresets` | frontend/js/avatars.js:3508 |
| `nameMarkBuddyPrewarm` | frontend/js/avatars.js:7519 |
| `nameMarkBuddyPut` | frontend/js/avatars.js:4818 |
| `nameMarkBuddyQueuePlace` | frontend/js/avatars.js:6446 |
| `nameMarkBuddyReact` | frontend/js/avatars.js:7573 |
| `nameMarkBuddyRefit` | frontend/js/avatars.js:6887 |
| `nameMarkBuddyRefitClear` | frontend/js/avatars.js:6922 |
| `nameMarkBuddyRelease` | frontend/js/avatars.js:7258 |
| `nameMarkBuddyResetSize` | frontend/js/avatars.js:4039 |
| `nameMarkBuddyRestore` | frontend/js/avatars.js:4668 |
| `nameMarkBuddyRide` | frontend/js/avatars.js:4841 |
| `nameMarkBuddyRideBox` | frontend/js/avatars.js:4924 |
| `nameMarkBuddyRideClip` | frontend/js/avatars.js:4911 |
| `nameMarkBuddyRideFrames` | frontend/js/avatars.js:4898 |
| `nameMarkBuddyRoute` | frontend/js/avatars.js:5688 |
| `nameMarkBuddyRubbed` | frontend/js/avatars.js:6106 |
| `nameMarkBuddySavePreset` | frontend/js/avatars.js:3524 |
| `nameMarkBuddyScaleSaved` | frontend/js/avatars.js:4010 |
| `nameMarkBuddyScaled` | frontend/js/avatars.js:4073 |
| `nameMarkBuddyScene` | frontend/js/avatars.js:7086 |
| `nameMarkBuddySchedule` | frontend/js/avatars.js:7276 |
| `nameMarkBuddyScrollAgo` | frontend/js/avatars.js:7959 |
| `nameMarkBuddyScroller` | frontend/js/avatars.js:5018 |
| `nameMarkBuddyScrollsWith` | frontend/js/avatars.js:5086 |
| `nameMarkBuddySeed` | frontend/js/avatars.js:3043 |
| `nameMarkBuddySeen` | frontend/js/avatars.js:4997 |
| `nameMarkBuddySelector` | frontend/js/avatars.js:4631 |
| `nameMarkBuddySetSize` | frontend/js/avatars.js:4019 |
| `nameMarkBuddySettle` | frontend/js/avatars.js:6640 |
| `nameMarkBuddyShape` | frontend/js/avatars.js:4080 |
| `nameMarkBuddyShapeAt1` | frontend/js/avatars.js:4083 |
| `nameMarkBuddyShowing` | frontend/js/avatars.js:8680 |
| `nameMarkBuddyShown` | frontend/js/avatars.js:3879 |
| `nameMarkBuddyShy` | frontend/js/avatars.js:8506 |
| `nameMarkBuddySizeSelect` | frontend/js/avatars.js:4048 |
| `nameMarkBuddySound` | frontend/js/avatars.js:8415 |
| `nameMarkBuddySpotFor` | frontend/js/avatars.js:4653 |
| `nameMarkBuddySpots` | frontend/js/avatars.js:4612 |
| `nameMarkBuddySquash` | frontend/js/avatars.js:6002 |
| `nameMarkBuddyStances` | frontend/js/avatars.js:4436 |
| `nameMarkBuddyStepAside` | frontend/js/avatars.js:4716 |
| `nameMarkBuddyStill` | frontend/js/avatars.js:3771 |
| `nameMarkBuddyStillGood` | frontend/js/avatars.js:6366 |
| `nameMarkBuddyStir` | frontend/js/avatars.js:8191 |
| `nameMarkBuddyStreak` | frontend/js/avatars.js:7622 |
| `nameMarkBuddyStrokes` | frontend/js/avatars.js:6079 |
| `nameMarkBuddySupportSoon` | frontend/js/avatars.js:6294 |
| `nameMarkBuddySupported` | frontend/js/avatars.js:6257 |
| `nameMarkBuddySurfaceWalk` | frontend/js/avatars.js:4228 |
| `nameMarkBuddyTab` | frontend/js/avatars.js:3871 |
| `nameMarkBuddyTabChanged` | frontend/js/avatars.js:6534 |
| `nameMarkBuddyTabSide` | frontend/js/avatars.js:6570 |
| `nameMarkBuddyTempo` | frontend/js/avatars.js:5350 |
| `nameMarkBuddyTextBoxes` | frontend/js/avatars.js:4184 |
| `nameMarkBuddyTick` | frontend/js/avatars.js:7363 |
| `nameMarkBuddyTilt` | frontend/js/avatars.js:7175 |
| `nameMarkBuddyToggle` | frontend/js/avatars.js:8695 |
| `nameMarkBuddyToggles` | frontend/js/avatars.js:3481 |
| `nameMarkBuddyToss` | frontend/js/avatars.js:6023 |
| `nameMarkBuddyTravel` | frontend/js/avatars.js:5770 |
| `nameMarkBuddyUnheld` | frontend/js/avatars.js:5246 |
| `nameMarkBuddyVary` | frontend/js/avatars.js:7069 |
| `nameMarkBuddyViewChanged` | frontend/js/avatars.js:6496 |
| `nameMarkBuddyVisit` | frontend/js/avatars.js:2774 |
| `nameMarkBuddyWake` | frontend/js/avatars.js:8151 |
| `nameMarkBuddyWander` | frontend/js/avatars.js:8095 |
| `nameMarkBuddyWarmthAt` | frontend/js/avatars.js:7907 |
| `nameMarkBuddyWatch` | frontend/js/avatars.js:5454 |
| `nameMarkBuddyWay` | frontend/js/avatars.js:5763 |
| `nameMarkBuddyWordsUnder` | frontend/js/avatars.js:4378 |
| `nameMarkBuddyWork` | frontend/js/avatars.js:7762 |
| `nameMarkBuddyWorkFor` | frontend/js/avatars.js:7758 |
| `nameMarkBuddyYoursObstacles` | frontend/js/avatars.js:4747 |
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
| `placeNameMarkBuddy` | frontend/js/avatars.js:6236 |
| `queueNameMarkBuddyCheck` | frontend/js/avatars.js:6429 |
| `registerCharacter` | frontend/js/avatars.js:1230 |
| `repaintOwnFace` | frontend/js/avatars.js:3106 |
| `setOwnNameMarkStyle` | frontend/js/avatars.js:294 |
| `syncNameMarkBuddy` | frontend/js/avatars.js:9191 |
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
| `askAboutSelection` | frontend/js/editor.js:2048 |
| `calloutHint` | frontend/js/editor.js:284 |
| `calloutKindOf` | frontend/js/editor.js:292 |
| `calloutRewriteHead` | frontend/js/editor.js:306 |
| `chatCommands` | frontend/js/editor.js:577 |
| `codeFamilyFor` | frontend/js/editor.js:2251 |
| `editorApplyAction` | frontend/js/editor.js:451 |
| `editorApplyNamed` | frontend/js/editor.js:509 |
| `editorBackOverTrail` | frontend/js/editor.js:895 |
| `editorBlock` | frontend/js/editor.js:760 |
| `editorBlockRows` | frontend/js/editor.js:801 |
| `editorCaretPoint` | frontend/js/editor.js:1015 |
| `editorChoiceDialog` | frontend/js/editor.js:2072 |
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
| `inlineAiAvailable` | frontend/js/editor.js:2436 |
| `inlineAiClose` | frontend/js/editor.js:2475 |
| `inlineAiDescribeScope` | frontend/js/editor.js:2416 |
| `inlineAiElement` | frontend/js/editor.js:2310 |
| `inlineAiOpen` | frontend/js/editor.js:2441 |
| `inlineAiPosition` | frontend/js/editor.js:2395 |
| `inlineAiRetry` | frontend/js/editor.js:2497 |
| `inlineAiSubmit` | frontend/js/editor.js:2508 |
| `inlineAiUndo` | frontend/js/editor.js:2488 |
| `isEditorSurface` | frontend/js/editor.js:1950 |
| `offerToCreateWikiTarget` | frontend/js/editor.js:2137 |
| `pickIconOrEmoji` | frontend/js/editor.js:424 |
| `selectionBarElement` | frontend/js/editor.js:1799 |
| `selectionBarHide` | frontend/js/editor.js:1860 |
| `selectionBarShow` | frontend/js/editor.js:1865 |
| `selectionBarSync` | frontend/js/editor.js:1954 |
| `selectionContextFrom` | frontend/js/editor.js:1996 |
| `selectionContextSource` | frontend/js/editor.js:2029 |
| `selectionOffsets` | frontend/js/editor.js:2006 |
| `skillCommands` | frontend/js/editor.js:645 |

### frontend/js/dashboard.js (148)

| Name | File:line |
|---|---|
| `activityActorName` | frontend/js/dashboard.js:4527 |
| `activityUndoControl` | frontend/js/dashboard.js:4605 |
| `activityUndoPlanText` | frontend/js/dashboard.js:4534 |
| `activityUndoStarts` | frontend/js/dashboard.js:4590 |
| `afterFrames` | frontend/js/dashboard.js:1885 |
| `applyDashDensity` | frontend/js/dashboard.js:1189 |
| `artDriftMs` | frontend/js/dashboard.js:2196 |
| `artEaseOut` | frontend/js/dashboard.js:2352 |
| `artLineFade` | frontend/js/dashboard.js:2360 |
| `artRetarget` | frontend/js/dashboard.js:2370 |
| `artSeed` | frontend/js/dashboard.js:2236 |
| `buildArtParticles` | frontend/js/dashboard.js:2295 |
| `cachedGreetingPhrase` | frontend/js/dashboard.js:283 |
| `categoryHue` | frontend/js/dashboard.js:2220 |
| `closeFeatures` | frontend/js/dashboard.js:1529 |
| `dashActionRow` | frontend/js/dashboard.js:4086 |
| `dashActivityItems` | frontend/js/dashboard.js:4438 |
| `dashContinueNote` | frontend/js/dashboard.js:1386 |
| `dashCustomiseItems` | frontend/js/dashboard.js:1435 |
| `dashDensity` | frontend/js/dashboard.js:1084 |
| `dashDragOverCard` | frontend/js/dashboard.js:22 |
| `dashEmpty` | frontend/js/dashboard.js:4138 |
| `dashEntries` | frontend/js/dashboard.js:455 |
| `dashFillingSkeleton` | frontend/js/dashboard.js:1896 |
| `dashFillingSkeletonDone` | frontend/js/dashboard.js:1923 |
| `dashGlanceFacts` | frontend/js/dashboard.js:575 |
| `dashGridShape` | frontend/js/dashboard.js:1690 |
| `dashLayout` | frontend/js/dashboard.js:161 |
| `dashMarkMenu` | frontend/js/dashboard.js:1157 |
| `dashMeetingWhen` | frontend/js/dashboard.js:654 |
| `dashMoreItems` | frontend/js/dashboard.js:1403 |
| `dashRelativeTime` | frontend/js/dashboard.js:4696 |
| `dashReminders` | frontend/js/dashboard.js:435 |
| `dashStreak` | frontend/js/dashboard.js:2736 |
| `dashTensionRow` | frontend/js/dashboard.js:4928 |
| `dashWidgetRow` | frontend/js/dashboard.js:1979 |
| `dashWidgetToggle` | frontend/js/dashboard.js:1953 |
| `dashWidgetsSummary` | frontend/js/dashboard.js:2091 |
| `dashboardGreetingText` | frontend/js/dashboard.js:268 |
| `fallbackGreetingPhrase` | frontend/js/dashboard.js:240 |
| `fetchDashGraph` | frontend/js/dashboard.js:415 |
| `fetchDashStats` | frontend/js/dashboard.js:390 |
| `firstNoteImage` | frontend/js/dashboard.js:2820 |
| `focusChime` | frontend/js/dashboard.js:3872 |
| `focusRing` | frontend/js/dashboard.js:3813 |
| `focusStep` | frontend/js/dashboard.js:3946 |
| `focusTimeLabel` | frontend/js/dashboard.js:3795 |
| `focusTimerEnded` | frontend/js/dashboard.js:3893 |
| `focusTimerTick` | frontend/js/dashboard.js:3861 |
| `focusTodaySeconds` | frontend/js/dashboard.js:3802 |
| `generateDigest` | frontend/js/dashboard.js:3083 |
| `greetingBlock` | frontend/js/dashboard.js:231 |
| `greetingCacheSlot` | frontend/js/dashboard.js:274 |
| `hueFor` | frontend/js/dashboard.js:2210 |
| `loadDigestCache` | frontend/js/dashboard.js:3069 |
| `miniEntryList` | frontend/js/dashboard.js:2856 |
| `mountWidgetBody` | frontend/js/dashboard.js:1617 |
| `moveDashWidget` | frontend/js/dashboard.js:1960 |
| `nightFactRow` | frontend/js/dashboard.js:4195 |
| `nightKindLine` | frontend/js/dashboard.js:4285 |
| `nightKindWords` | frontend/js/dashboard.js:4183 |
| `nightRunSummary` | frontend/js/dashboard.js:4188 |
| `noteRowFile` | frontend/js/dashboard.js:2851 |
| `noteRowImage` | frontend/js/dashboard.js:2837 |
| `noteSkillRun` | frontend/js/dashboard.js:948 |
| `openAskFromDashboard` | frontend/js/dashboard.js:854 |
| `openFeatures` | frontend/js/dashboard.js:1514 |
| `paintDashClock` | frontend/js/dashboard.js:359 |
| `paintDashEmblem` | frontend/js/dashboard.js:1111 |
| `paintFadedNotes` | frontend/js/dashboard.js:3597 |
| `paintFocusTimer` | frontend/js/dashboard.js:3834 |
| `quickAccessCurrent` | frontend/js/dashboard.js:1343 |
| `quickAccessItems` | frontend/js/dashboard.js:1307 |
| `quickCatalogue` | frontend/js/dashboard.js:1290 |
| `quickLinkButton` | frontend/js/dashboard.js:1250 |
| `quickTintColours` | frontend/js/dashboard.js:1244 |
| `quickTintKey` | frontend/js/dashboard.js:1233 |
| `quickTints` | frontend/js/dashboard.js:1320 |
| `recentSkillLinks` | frontend/js/dashboard.js:1019 |
| `refreshAiGreeting` | frontend/js/dashboard.js:303 |
| `refreshArtForTheme` | frontend/js/dashboard.js:2264 |
| `refreshDashWidgets` | frontend/js/dashboard.js:1665 |
| `renderActivityWidget` | frontend/js/dashboard.js:4451 |
| `renderArtWidget` | frontend/js/dashboard.js:2382 |
| `renderBoardsWidget` | frontend/js/dashboard.js:4159 |
| `renderBookmarksWidget` | frontend/js/dashboard.js:4672 |
| `renderCategoriesWidget` | frontend/js/dashboard.js:3490 |
| `renderDashGlance` | frontend/js/dashboard.js:671 |
| `renderDashMore` | frontend/js/dashboard.js:1484 |
| `renderDashSubmessage` | frontend/js/dashboard.js:461 |
| `renderDashWidgetsList` | frontend/js/dashboard.js:2120 |
| `renderDashboard` | frontend/js/dashboard.js:1694 |
| `renderDashboardGreeting` | frontend/js/dashboard.js:529 |
| `renderDayDigest` | frontend/js/dashboard.js:3146 |
| `renderDigestWidget` | frontend/js/dashboard.js:3202 |
| `renderDocumentsWidget` | frontend/js/dashboard.js:4636 |
| `renderFeatures` | frontend/js/dashboard.js:1535 |
| `renderFirstStepsLazy` | frontend/js/dashboard.js:1605 |
| `renderFocusTimerWidget` | frontend/js/dashboard.js:3953 |
| `renderHeatmapWidget` | frontend/js/dashboard.js:3372 |
| `renderMostLinkedWidget` | frontend/js/dashboard.js:2989 |
| `renderMostOpenedWidget` | frontend/js/dashboard.js:2952 |
| `renderMostUsedWidget` | frontend/js/dashboard.js:2978 |
| `renderNameNudge` | frontend/js/dashboard.js:735 |
| `renderNightCard` | frontend/js/dashboard.js:4368 |
| `renderNightWidget` | frontend/js/dashboard.js:4340 |
| `renderOnThisDayWidget` | frontend/js/dashboard.js:4985 |
| `renderOrphanNotesWidget` | frontend/js/dashboard.js:4754 |
| `renderPaceWidget` | frontend/js/dashboard.js:5060 |
| `renderPinnedWidget` | frontend/js/dashboard.js:2947 |
| `renderQuestionsWidget` | frontend/js/dashboard.js:3038 |
| `renderQuickCaptureWidget` | frontend/js/dashboard.js:3281 |
| `renderQuickLinks` | frontend/js/dashboard.js:1347 |
| `renderRandomNoteWidget` | frontend/js/dashboard.js:3569 |
| `renderRandomShuffle` | frontend/js/dashboard.js:3653 |
| `renderRecentNotesWidget` | frontend/js/dashboard.js:3008 |
| `renderRemindersWidget` | frontend/js/dashboard.js:3334 |
| `renderReviewWidget` | frontend/js/dashboard.js:2957 |
| `renderStatsWidget` | frontend/js/dashboard.js:2777 |
| `renderStreakWidget` | frontend/js/dashboard.js:2745 |
| `renderTagCloudWidget` | frontend/js/dashboard.js:3756 |
| `renderTensionsWidget` | frontend/js/dashboard.js:4866 |
| `renderTopTagsWidget` | frontend/js/dashboard.js:3017 |
| `renderUnfinishedWidget` | frontend/js/dashboard.js:4717 |
| `saveDashLayout` | frontend/js/dashboard.js:194 |
| `saveQuickAccess` | frontend/js/dashboard.js:1316 |
| `saveQuickTint` | frontend/js/dashboard.js:1328 |
| `saveQuickTints` | frontend/js/dashboard.js:1335 |
| `setFocusTimer` | frontend/js/dashboard.js:3936 |
| `sizeDashWidgetSpan` | frontend/js/dashboard.js:783 |
| `sizeDashWidgets` | frontend/js/dashboard.js:787 |
| `skillRunTimes` | frontend/js/dashboard.js:939 |
| `startArt` | frontend/js/dashboard.js:2442 |
| `startDashClock` | frontend/js/dashboard.js:332 |
| `startFocusTimer` | frontend/js/dashboard.js:3916 |
| `stopArt` | frontend/js/dashboard.js:2244 |
| `stopDashClock` | frontend/js/dashboard.js:327 |
| `stopFocusTimer` | frontend/js/dashboard.js:3925 |
| `streamDigest` | frontend/js/dashboard.js:3102 |
| `todayStamp` | frontend/js/dashboard.js:3065 |
| `toggleDashWidgetHidden` | frontend/js/dashboard.js:205 |
| `toggleDashWidgetWide` | frontend/js/dashboard.js:213 |
| `truncateMarkdownSafe` | frontend/js/dashboard.js:3554 |
| `undoActorFrom` | frontend/js/dashboard.js:4552 |
| `watchDashWidgets` | frontend/js/dashboard.js:805 |
| `wireDashDensity` | frontend/js/dashboard.js:1218 |
| `withDisplayName` | frontend/js/dashboard.js:252 |
| `withoutLeadingEmoji` | frontend/js/dashboard.js:1005 |

### frontend/js/timeline.js (70)

| Name | File:line |
|---|---|
| `appendTimelineRows` | frontend/js/timeline.js:732 |
| `applyTimelineRowTabOrder` | frontend/js/timeline.js:1416 |
| `closeTimelineRow` | frontend/js/timeline.js:1632 |
| `dailyNotePair` | frontend/js/timeline.js:1091 |
| `dailyNoteTitle` | frontend/js/timeline.js:182 |
| `drawTimelineScrubber` | frontend/js/timeline.js:1957 |
| `drawTimelineWindow` | frontend/js/timeline.js:2025 |
| `fillTimelineBandOptions` | frontend/js/timeline.js:815 |
| `focusTimelineRow` | frontend/js/timeline.js:1582 |
| `openDayPage` | frontend/js/timeline.js:1059 |
| `openTimelineRowDetail` | frontend/js/timeline.js:1643 |
| `openTimelineTableDetail` | frontend/js/timeline.js:2355 |
| `openTodaysPage` | frontend/js/timeline.js:1047 |
| `paintTimeline` | frontend/js/timeline.js:878 |
| `paintTimelineFeed` | frontend/js/timeline.js:920 |
| `paintTimelineTable` | frontend/js/timeline.js:2179 |
| `renderTimeline` | frontend/js/timeline.js:556 |
| `renderTimelineDayStrip` | frontend/js/timeline.js:1176 |
| `renderTimelineKinds` | frontend/js/timeline.js:338 |
| `renderTimelineMonthPop` | frontend/js/timeline.js:1297 |
| `renderTimelineRecall` | frontend/js/timeline.js:611 |
| `renderTimelineRowMedia` | frontend/js/timeline.js:1737 |
| `setTimelineRowSelected` | frontend/js/timeline.js:2343 |
| `shortDate` | frontend/js/timeline.js:1886 |
| `startDayNote` | frontend/js/timeline.js:1122 |
| `startTodaysNote` | frontend/js/timeline.js:1118 |
| `syncTimelineDetailSpans` | frontend/js/timeline.js:2234 |
| `syncTimelineFilterChip` | frontend/js/timeline.js:845 |
| `syncTimelineKindsLabel` | frontend/js/timeline.js:394 |
| `syncTimelineSelectUi` | frontend/js/timeline.js:2372 |
| `syncTimelineViewSeg` | frontend/js/timeline.js:2423 |
| `syncTimelineYears` | frontend/js/timeline.js:662 |
| `timelineAutoScale` | frontend/js/timeline.js:448 |
| `timelineBucketKey` | frontend/js/timeline.js:215 |
| `timelineBucketLabel` | frontend/js/timeline.js:232 |
| `timelineBucketSection` | frontend/js/timeline.js:972 |
| `timelineCalendarCall` | frontend/js/timeline.js:2407 |
| `timelineDailyNote` | frontend/js/timeline.js:199 |
| `timelineDayKeys` | frontend/js/timeline.js:1240 |
| `timelineDayLabel` | frontend/js/timeline.js:1171 |
| `timelineDayPages` | frontend/js/timeline.js:1155 |
| `timelineDayShift` | frontend/js/timeline.js:1112 |
| `timelineDensitySpan` | frontend/js/timeline.js:1934 |
| `timelineDensitySpanOf` | frontend/js/timeline.js:1940 |
| `timelineForgetRows` | frontend/js/timeline.js:2020 |
| `timelineIsDailyNote` | frontend/js/timeline.js:304 |
| `timelineJumpToDay` | frontend/js/timeline.js:1284 |
| `timelineKindChoice` | frontend/js/timeline.js:288 |
| `timelineLoadMore` | frontend/js/timeline.js:687 |
| `timelineMonthKeys` | frontend/js/timeline.js:1351 |
| `timelineMonthShift` | frontend/js/timeline.js:1278 |
| `timelineMonthStart` | frontend/js/timeline.js:1274 |
| `timelineQuery` | frontend/js/timeline.js:526 |
| `timelineResolvedScale` | frontend/js/timeline.js:475 |
| `timelineRow` | frontend/js/timeline.js:115 |
| `timelineRowElement` | frontend/js/timeline.js:1444 |
| `timelineRowGroups` | frontend/js/timeline.js:801 |
| `timelineRowMoment` | frontend/js/timeline.js:102 |
| `timelineScaleChoice` | frontend/js/timeline.js:432 |
| `timelineScrubTo` | frontend/js/timeline.js:2073 |
| `timelineSortValue` | frontend/js/timeline.js:2150 |
| `timelineSortedRows` | frontend/js/timeline.js:2161 |
| `timelineStepScale` | frontend/js/timeline.js:1855 |
| `timelineTableColumnCount` | frontend/js/timeline.js:2214 |
| `timelineTableRow` | frontend/js/timeline.js:2241 |
| `timelineViewMode` | frontend/js/timeline.js:2123 |
| `timelineVisibleRows` | frontend/js/timeline.js:858 |
| `timelineWatchRow` | frontend/js/timeline.js:2009 |
| `toggleTimelineKind` | frontend/js/timeline.js:413 |
| `toggleTimelineRow` | frontend/js/timeline.js:1606 |

### frontend/js/palette.js (30)

| Name | File:line |
|---|---|
| `agentActStarters` | frontend/js/palette.js:184 |
| `agentCurrentTab` | frontend/js/palette.js:119 |
| `agentFocusStarter` | frontend/js/palette.js:1361 |
| `agentOpenSubject` | frontend/js/palette.js:260 |
| `agentPaletteShut` | frontend/js/palette.js:449 |
| `agentPhoneSheet` | frontend/js/palette.js:417 |
| `agentScopeForRun` | frontend/js/palette.js:313 |
| `agentStarterButtons` | frontend/js/palette.js:1357 |
| `agentStarterRecents` | frontend/js/palette.js:147 |
| `agentTabLabel` | frontend/js/palette.js:134 |
| `cmdNoteLink` | frontend/js/palette.js:799 |
| `cmdNoteName` | frontend/js/palette.js:786 |
| `cmdPaletteAsk` | frontend/js/palette.js:884 |
| `cmdPaletteBusy` | frontend/js/palette.js:582 |
| `cmdPaletteFacts` | frontend/js/palette.js:616 |
| `cmdPaletteGoToNote` | frontend/js/palette.js:654 |
| `cmdPaletteGrow` | frontend/js/palette.js:1339 |
| `cmdPaletteLinkNotes` | frontend/js/palette.js:834 |
| `cmdPaletteReset` | frontend/js/palette.js:493 |
| `cmdPaletteSaveAsChat` | frontend/js/palette.js:512 |
| `cmdPaletteSources` | frontend/js/palette.js:669 |
| `cmdSourceRow` | frontend/js/palette.js:708 |
| `paletteGoToCategory` | frontend/js/palette.js:1453 |
| `paletteLater` | frontend/js/palette.js:1439 |
| `paletteNotesInHand` | frontend/js/palette.js:1443 |
| `rememberAgentStarter` | frontend/js/palette.js:164 |
| `renderAgentStarters` | frontend/js/palette.js:197 |
| `renderCmdPaletteMenu` | frontend/js/palette.js:555 |
| `syncAgentOpenNoteToggle` | frontend/js/palette.js:336 |
| `toggleAgentPalette` | frontend/js/palette.js:394 |

### frontend/js/bg-art.js (29)

| Name | File:line |
|---|---|
| `bgArtApplyPause` | frontend/js/bg-art.js:2139 |
| `bgArtCovered` | frontend/js/bg-art.js:2157 |
| `bgArtFrameRate` | frontend/js/bg-art.js:2101 |
| `bgArtGenome` | frontend/js/bg-art.js:293 |
| `bgArtHalt` | frontend/js/bg-art.js:2205 |
| `bgArtPreview` | frontend/js/bg-art.js:2411 |
| `bgArtRetire` | frontend/js/bg-art.js:2195 |
| `bgArtRun` | frontend/js/bg-art.js:2235 |
| `bgArtSeedOf` | frontend/js/bg-art.js:317 |
| `bgArtSeedText` | frontend/js/bg-art.js:354 |
| `bgArtSpeciesName` | frontend/js/bg-art.js:342 |
| `bgArtStrainCount` | frontend/js/bg-art.js:348 |
| `bgArtStrains` | frontend/js/bg-art.js:326 |
| `bgArtSurface` | frontend/js/bg-art.js:2117 |
| `bgArtTier` | frontend/js/bg-art.js:2400 |
| `bgArtWatch` | frontend/js/bg-art.js:2177 |
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

### frontend/js/settings.js (144)

| Name | File:line |
|---|---|
| `_segActive` | frontend/js/settings.js:2481 |
| `accentInk` | frontend/js/settings.js:2122 |
| `accentTone` | frontend/js/settings.js:2126 |
| `activeAccent` | frontend/js/settings.js:1355 |
| `activeLogContainer` | frontend/js/settings.js:912 |
| `activePalette` | frontend/js/settings.js:2801 |
| `activeThemePreset` | frontend/js/settings.js:1684 |
| `appearancePref` | frontend/js/settings.js:1700 |
| `applyAccent` | frontend/js/settings.js:1377 |
| `applyAppearance` | frontend/js/settings.js:2334 |
| `applyContrast` | frontend/js/settings.js:1429 |
| `applyCustomAccent` | frontend/js/settings.js:2150 |
| `applyCustomCss` | frontend/js/settings.js:2194 |
| `applyCustomCssLegacy` | frontend/js/settings.js:2217 |
| `applyEffectiveAccent` | frontend/js/settings.js:1413 |
| `applyHarmony` | frontend/js/settings.js:1862 |
| `applyPageBackground` | frontend/js/settings.js:2167 |
| `applyResolvedMode` | frontend/js/settings.js:2429 |
| `applySavedTheme` | frontend/js/settings.js:1966 |
| `applyThemeChoice` | frontend/js/settings.js:2451 |
| `applyThemePreset` | frontend/js/settings.js:1719 |
| `bgArtOn` | frontend/js/settings.js:2897 |
| `bgArtRefreshSeed` | frontend/js/settings.js:2892 |
| `bgArtStyle` | frontend/js/settings.js:3002 |
| `browserLogRecords` | frontend/js/settings.js:790 |
| `bumpLogErrorBadge` | frontend/js/settings.js:1025 |
| `clearLogs` | frontend/js/settings.js:1200 |
| `clearManualOverrides` | frontend/js/settings.js:1762 |
| `closeLogs` | frontend/js/settings.js:1157 |
| `closeSettingsModal` | frontend/js/settings.js:709 |
| `collapseLongSettingHints` | frontend/js/settings.js:3819 |
| `contrastOn` | frontend/js/settings.js:1425 |
| `copyLogs` | frontend/js/settings.js:1166 |
| `cssVarNow` | frontend/js/settings.js:2091 |
| `currentAccentHex` | frontend/js/settings.js:1366 |
| `currentLookValues` | frontend/js/settings.js:1921 |
| `currentPageBackground` | frontend/js/settings.js:2178 |
| `deleteSavedTheme` | frontend/js/settings.js:1989 |
| `downloadSupportBundle` | frontend/js/settings.js:1223 |
| `effectiveDensity` | frontend/js/settings.js:2269 |
| `effectiveTheme` | frontend/js/settings.js:2391 |
| `ensureSettingsPaneTitle` | frontend/js/settings.js:74 |
| `filterSettings` | frontend/js/settings.js:653 |
| `focusSettingsHeading` | frontend/js/settings.js:3392 |
| `focusSettingsPane` | frontend/js/settings.js:3384 |
| `harmonyScheme` | frontend/js/settings.js:1842 |
| `hexRatio` | frontend/js/settings.js:2113 |
| `hexToHsl` | frontend/js/settings.js:1794 |
| `hexToRgbParts` | frontend/js/settings.js:2096 |
| `hslToHex` | frontend/js/settings.js:1815 |
| `jobDurationWords` | frontend/js/settings.js:4615 |
| `jobLineEl` | frontend/js/settings.js:4676 |
| `jobRunLine` | frontend/js/settings.js:4626 |
| `learnedBulk` | frontend/js/settings.js:4158 |
| `learnedDelete` | frontend/js/settings.js:4337 |
| `learnedEdit` | frontend/js/settings.js:4302 |
| `learnedExport` | frontend/js/settings.js:4377 |
| `learnedForget` | frontend/js/settings.js:4358 |
| `learnedFromYouText` | frontend/js/settings.js:4475 |
| `learnedKindLabel` | frontend/js/settings.js:4019 |
| `learnedReset` | frontend/js/settings.js:4327 |
| `learnedRow` | frontend/js/settings.js:4185 |
| `learnedRunNow` | frontend/js/settings.js:4396 |
| `learnedSetSwitch` | frontend/js/settings.js:4126 |
| `lessTransparencyWanted` | frontend/js/settings.js:2241 |
| `loadChangelog` | frontend/js/settings.js:437 |
| `loadSamplingSettings` | frontend/js/settings.js:3605 |
| `logLevelRank` | frontend/js/settings.js:764 |
| `logMatchesFilters` | frontend/js/settings.js:812 |
| `logRecordText` | frontend/js/settings.js:905 |
| `logRow` | frontend/js/settings.js:834 |
| `logTerminalLineText` | frontend/js/settings.js:969 |
| `logTerminalRow` | frontend/js/settings.js:976 |
| `logTerminalTraceRow` | frontend/js/settings.js:990 |
| `manualOverrides` | frontend/js/settings.js:1756 |
| `measureLabelOptics` | frontend/js/settings.js:2298 |
| `nearLogBottom` | frontend/js/settings.js:916 |
| `noticePerfMode` | frontend/js/settings.js:3566 |
| `openSettingsModal` | frontend/js/settings.js:246 |
| `openTaskLog` | frontend/js/settings.js:3496 |
| `paintIntegrity` | frontend/js/settings.js:469 |
| `paintJobLine` | frontend/js/settings.js:4658 |
| `perfModeOn` | frontend/js/settings.js:2247 |
| `perfModeReason` | frontend/js/settings.js:2256 |
| `placeFoldHelp` | frontend/js/settings.js:4560 |
| `refreshJobRuns` | frontend/js/settings.js:4686 |
| `renderActiveLogView` | frontend/js/settings.js:1012 |
| `renderAppearance` | frontend/js/settings.js:2537 |
| `renderBgMotionHint` | frontend/js/settings.js:2685 |
| `renderBgStyleGrid` | frontend/js/settings.js:2927 |
| `renderBgStyleHint` | frontend/js/settings.js:2670 |
| `renderCopyLogsLabel` | frontend/js/settings.js:1181 |
| `renderCustomThemes` | frontend/js/settings.js:2000 |
| `renderHealthBlock` | frontend/js/settings.js:486 |
| `renderJobOverview` | frontend/js/settings.js:4708 |
| `renderLearned` | frontend/js/settings.js:4496 |
| `renderLearnedFromYou` | frontend/js/settings.js:4487 |
| `renderLearnedList` | frontend/js/settings.js:4262 |
| `renderLearnedSwitches` | frontend/js/settings.js:4023 |
| `renderLogErrorBadge` | frontend/js/settings.js:1031 |
| `renderLogGap` | frontend/js/settings.js:774 |
| `renderLogList` | frontend/js/settings.js:944 |
| `renderLogSharedUI` | frontend/js/settings.js:929 |
| `renderLogTerminal` | frontend/js/settings.js:997 |
| `renderLogs` | frontend/js/settings.js:1131 |
| `renderPaletteGrid` | frontend/js/settings.js:2808 |
| `renderProgressMotionHint` | frontend/js/settings.js:2652 |
| `renderSamplingRows` | frontend/js/settings.js:3612 |
| `renderThemePresets` | frontend/js/settings.js:2487 |
| `renderThemeToggle` | frontend/js/settings.js:2419 |
| `repaintThemeAtOnce` | frontend/js/settings.js:1268 |
| `resetAppearance` | frontend/js/settings.js:2860 |
| `resetThemeOnly` | frontend/js/settings.js:1774 |
| `resolvedTheme` | frontend/js/settings.js:2402 |
| `saveCurrentLook` | frontend/js/settings.js:1939 |
| `savedThemeCard` | frontend/js/settings.js:2034 |
| `savedThemes` | frontend/js/settings.js:1934 |
| `scheduleThemeArt` | frontend/js/settings.js:1284 |
| `scrollLogToBottom` | frontend/js/settings.js:922 |
| `serverLogRecord` | frontend/js/settings.js:799 |
| `setCustomAccent` | frontend/js/settings.js:3223 |
| `setLogLive` | frontend/js/settings.js:1017 |
| `setSettingsPeek` | frontend/js/settings.js:218 |
| `settingsFoldState` | frontend/js/settings.js:4515 |
| `settingsPeekIsOn` | frontend/js/settings.js:230 |
| `settingsScroller` | frontend/js/settings.js:99 |
| `settingsSectionText` | frontend/js/settings.js:625 |
| `showSettingsSection` | frontend/js/settings.js:108 |
| `smallMachine` | frontend/js/settings.js:2234 |
| `sortLogRecords` | frontend/js/settings.js:803 |
| `startBgArt` | frontend/js/settings.js:3007 |
| `startLogStream` | frontend/js/settings.js:1061 |
| `stopBgArt` | frontend/js/settings.js:2901 |
| `stopLogStream` | frontend/js/settings.js:1120 |
| `syncLearnedSelectbar` | frontend/js/settings.js:4146 |
| `taskLogButton` | frontend/js/settings.js:3492 |
| `themeSwatch` | frontend/js/settings.js:1677 |
| `themeValue` | frontend/js/settings.js:1693 |
| `toggleBgArt` | frontend/js/settings.js:3072 |
| `toggleTheme` | frontend/js/settings.js:1296 |
| `updatePeekAvailability` | frontend/js/settings.js:234 |
| `wireFoldHelps` | frontend/js/settings.js:4571 |
| `wireLearnedSection` | frontend/js/settings.js:4430 |
| `wireSettingsFolds` | frontend/js/settings.js:4524 |

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
| `openActivityReport` | frontend/js/activity-panel.js:106 |
| `paintActivity` | frontend/js/activity-panel.js:89 |
| `renderActivity` | frontend/js/activity-panel.js:19 |
| `setActivityTab` | frontend/js/activity-panel.js:159 |
| `stopActivityJob` | frontend/js/activity-panel.js:110 |
| `stopActivityModel` | frontend/js/activity-panel.js:120 |
| `stopAllActivity` | frontend/js/activity-panel.js:131 |

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

### frontend/js/app-palette.js (35)

| Name | File:line |
|---|---|
| `closePalette` | frontend/js/app-palette.js:91 |
| `notesPaletteCommands` | frontend/js/app-palette.js:681 |
| `openPalette` | frontend/js/app-palette.js:55 |
| `paletteActRows` | frontend/js/app-palette.js:340 |
| `paletteBase` | frontend/js/app-palette.js:295 |
| `paletteDistance` | frontend/js/app-palette.js:512 |
| `paletteEditorMatches` | frontend/js/app-palette.js:130 |
| `paletteFeature` | frontend/js/app-palette.js:37 |
| `paletteFeatureRows` | frontend/js/app-palette.js:323 |
| `paletteFind` | frontend/js/app-palette.js:558 |
| `paletteFuzzyScore` | frontend/js/app-palette.js:110 |
| `paletteKeydown` | frontend/js/app-palette.js:639 |
| `paletteLight` | frontend/js/app-palette.js:621 |
| `paletteMatches` | frontend/js/app-palette.js:140 |
| `paletteNearRows` | frontend/js/app-palette.js:538 |
| `paletteNearest` | frontend/js/app-palette.js:492 |
| `paletteNearestCommand` | frontend/js/app-palette.js:563 |
| `paletteNearestRows` | frontend/js/app-palette.js:527 |
| `palettePick` | frontend/js/app-palette.js:467 |
| `palettePicks` | frontend/js/app-palette.js:463 |
| `palettePool` | frontend/js/app-palette.js:301 |
| `paletteRanked` | frontend/js/app-palette.js:439 |
| `paletteRefresh` | frontend/js/app-palette.js:315 |
| `paletteRun` | frontend/js/app-palette.js:44 |
| `paletteScore` | frontend/js/app-palette.js:411 |
| `paletteSettingRows` | frontend/js/app-palette.js:375 |
| `paletteStartAct` | frontend/js/app-palette.js:362 |
| `paletteTarget` | frontend/js/app-palette.js:306 |
| `paletteText` | frontend/js/app-palette.js:101 |
| `paletteVocab` | frontend/js/app-palette.js:427 |
| `paletteWhy` | frontend/js/app-palette.js:481 |
| `paletteWords` | frontend/js/app-palette.js:398 |
| `renderPalette` | frontend/js/app-palette.js:574 |
| `scrollPaletteToActive` | frontend/js/app-palette.js:666 |
| `utilityPaletteRows` | frontend/js/app-palette.js:213 |

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
| `renderWebSources` | frontend/js/ask-compose.js:245 |
| `wireAskUseAi` | frontend/js/ask-compose.js:46 |

### frontend/js/ask-history.js (9)

| Name | File:line |
|---|---|
| `askAgainMenu` | frontend/js/ask-history.js:250 |
| `askHistoryRow` | frontend/js/ask-history.js:14 |
| `clearAskHistory` | frontend/js/ask-history.js:273 |
| `deleteAskHistoryTurn` | frontend/js/ask-history.js:232 |
| `forgetRecentQuestion` | frontend/js/ask-history.js:262 |
| `loadAskHistoryPage` | frontend/js/ask-history.js:82 |
| `toggleAskHistoryPanel` | frontend/js/ask-history.js:102 |
| `toggleAskHistoryPin` | frontend/js/ask-history.js:224 |
| `viewAskHistoryTurn` | frontend/js/ask-history.js:112 |

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
| `notePickerRows` | frontend/js/attach-to.js:213 |
| `renderAttachToBoard` | frontend/js/attach-to.js:26 |
| `renderAttachToDocument` | frontend/js/attach-to.js:118 |
| `renderNotePickerList` | frontend/js/attach-to.js:268 |

### frontend/js/attachment-actions.js (6)

| Name | File:line |
|---|---|
| `attachmentAction` | frontend/js/attachment-actions.js:237 |
| `attachmentBlob` | frontend/js/attachment-actions.js:35 |
| `attachmentFileId` | frontend/js/attachment-actions.js:29 |
| `attachmentLabel` | frontend/js/attachment-actions.js:25 |
| `attachmentPlayer` | frontend/js/attachment-actions.js:47 |
| `attachmentUpload` | frontend/js/attachment-actions.js:17 |

### frontend/js/autocorrect.js (12)

| Name | File:line |
|---|---|
| `autocorrectAt` | frontend/js/autocorrect.js:86 |
| `autocorrectField` | frontend/js/autocorrect.js:180 |
| `autocorrectFieldRect` | frontend/js/autocorrect.js:227 |
| `autocorrectFind` | frontend/js/autocorrect.js:67 |
| `autocorrectForget` | frontend/js/autocorrect.js:128 |
| `autocorrectFresh` | frontend/js/autocorrect.js:261 |
| `autocorrectLayer` | frontend/js/autocorrect.js:169 |
| `autocorrectMark` | frontend/js/autocorrect.js:140 |
| `autocorrectMoved` | frontend/js/autocorrect.js:254 |
| `autocorrectPlace` | frontend/js/autocorrect.js:157 |
| `autocorrectSurface` | frontend/js/autocorrect.js:199 |
| `autocorrectUndo` | frontend/js/autocorrect.js:111 |

### frontend/js/batch-space.js (3)

| Name | File:line |
|---|---|
| `batchMoveToSpace` | frontend/js/batch-space.js:43 |
| `batchSpaceRequest` | frontend/js/batch-space.js:13 |
| `pickSpaceDialog` | frontend/js/batch-space.js:21 |

### frontend/js/captions.js (11)

| Name | File:line |
|---|---|
| `captionDecimate` | frontend/js/captions.js:55 |
| `captionPaint` | frontend/js/captions.js:74 |
| `captionRelease` | frontend/js/captions.js:198 |
| `captionRunMerge` | frontend/js/captions.js:136 |
| `captionSendNext` | frontend/js/captions.js:85 |
| `captionsText` | frontend/js/captions.js:47 |
| `holdLiveCaptions` | frontend/js/captions.js:238 |
| `startLiveCaptions` | frontend/js/captions.js:146 |
| `stopLiveCaptions` | frontend/js/captions.js:206 |
| `stopRecorderWords` | frontend/js/captions.js:234 |
| `toggleLiveCaptions` | frontend/js/captions.js:242 |

### frontend/js/categories-panel.js (27)

| Name | File:line |
|---|---|
| `categoryColourName` | frontend/js/categories-panel.js:946 |
| `chooseCategorySheet` | frontend/js/categories-panel.js:558 |
| `chooseNoteCategory` | frontend/js/categories-panel.js:862 |
| `colourCategoriesFromPanel` | frontend/js/categories-panel.js:461 |
| `createCategoryFromPanel` | frontend/js/categories-panel.js:544 |
| `deleteCategoriesFromPanel` | frontend/js/categories-panel.js:422 |
| `deleteCategory` | frontend/js/categories-panel.js:811 |
| `deleteCategoryFromPanel` | frontend/js/categories-panel.js:609 |
| `drawCategoryTidy` | frontend/js/categories-panel.js:277 |
| `drawManageCategoryFooter` | frontend/js/categories-panel.js:391 |
| `drawManageCategoryRows` | frontend/js/categories-panel.js:173 |
| `dropEmptyCategory` | frontend/js/categories-panel.js:929 |
| `manageCatHead` | frontend/js/categories-panel.js:147 |
| `mergeCategoriesFromPanel` | frontend/js/categories-panel.js:509 |
| `mergeCategoryFromPanel` | frontend/js/categories-panel.js:591 |
| `moveNotesToCategory` | frontend/js/categories-panel.js:903 |
| `offerCategoryUndo` | frontend/js/categories-panel.js:1043 |
| `openManageCategories` | frontend/js/categories-panel.js:21 |
| `pickCategoryColour` | frontend/js/categories-panel.js:1003 |
| `refreshAfterCategoryChange` | frontend/js/categories-panel.js:1053 |
| `renameCategory` | frontend/js/categories-panel.js:761 |
| `restoreCategoryMoves` | frontend/js/categories-panel.js:840 |
| `saveCategoryColour` | frontend/js/categories-panel.js:995 |
| `showCategoryNotes` | frontend/js/categories-panel.js:332 |
| `splitCategoryFromPanel` | frontend/js/categories-panel.js:637 |
| `swatchPicker` | frontend/js/categories-panel.js:948 |
| `wireManageCategoryKeys` | frontend/js/categories-panel.js:353 |

### frontend/js/chat-edit.js (2)

| Name | File:line |
|---|---|
| `editAndResend` | frontend/js/chat-edit.js:19 |
| `showCopyFallback` | frontend/js/chat-edit.js:104 |

### frontend/js/chat-time.js (5)

| Name | File:line |
|---|---|
| `adoptChatBubble` | frontend/js/chat-time.js:102 |
| `chatTimeLabel` | frontend/js/chat-time.js:12 |
| `paintChatTime` | frontend/js/chat-time.js:35 |
| `placeChatTime` | frontend/js/chat-time.js:54 |
| `stampChatTimes` | frontend/js/chat-time.js:78 |

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
| `docApplyCodeFix` | frontend/js/documents-code.js:5743 |
| `docBalanceRange` | frontend/js/documents-code.js:1012 |
| `docBeautifyText` | frontend/js/documents-code.js:1428 |
| `docBracketColours` | frontend/js/documents-code.js:2086 |
| `docBracketDepths` | frontend/js/documents-code.js:2069 |
| `docCmSyncCodeTools` | frontend/js/documents-code.js:677 |
| `docCodeActions` | frontend/js/documents-code.js:5758 |
| `docCodeCompletionData` | frontend/js/documents-code.js:636 |
| `docCodeCompletionSource` | frontend/js/documents-code.js:607 |
| `docCodeEditing` | frontend/js/documents-code.js:5495 |
| `docCodeFixNow` | frontend/js/documents-code.js:5725 |
| `docCodeFixes` | frontend/js/documents-code.js:5220 |
| `docCodeIndentAt` | frontend/js/documents-code.js:5480 |
| `docCodeIndentLevel` | frontend/js/documents-code.js:4768 |
| `docCodeInsertPoint` | frontend/js/documents-code.js:5211 |
| `docCodeInsertPointForString` | frontend/js/documents-code.js:5298 |
| `docCodeLastCodeBefore` | frontend/js/documents-code.js:5281 |
| `docCodeLineOf` | frontend/js/documents-code.js:4757 |
| `docCodeLintSource` | frontend/js/documents-code.js:340 |
| `docCodePairs` | frontend/js/documents-code.js:5469 |
| `docCodeProblemMessage` | frontend/js/documents-code.js:4783 |
| `docCodeProfile` | frontend/js/documents-code.js:4242 |
| `docCodeScan` | frontend/js/documents-code.js:4330 |
| `docCodeSnippetOptions` | frontend/js/documents-code.js:577 |
| `docCodeSymbols` | frontend/js/documents-code.js:2128 |
| `docCodeTools` | frontend/js/documents-code.js:647 |
| `docColorAt` | frontend/js/documents-code.js:1827 |
| `docColorSwatches` | frontend/js/documents-code.js:1867 |
| `docCompleteTab` | frontend/js/documents-code.js:1688 |
| `docCompletionExtras` | frontend/js/documents-code.js:4176 |
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
| `docFormatChanges` | frontend/js/documents-code.js:5600 |
| `docFormatCode` | frontend/js/documents-code.js:5624 |
| `docFormatCodeText` | frontend/js/documents-code.js:4820 |
| `docFormatJsonText` | frontend/js/documents-code.js:5137 |
| `docFormatMarkupText` | frontend/js/documents-code.js:4900 |
| `docFormatRemoteRefusal` | frontend/js/documents-code.js:5579 |
| `docFormatTreeRefusal` | frontend/js/documents-code.js:5565 |
| `docGhostPlugin` | frontend/js/documents-code.js:1700 |
| `docGhostSuffix` | frontend/js/documents-code.js:994 |
| `docGoToDefinition` | frontend/js/documents-code.js:2407 |
| `docHoverDocs` | frontend/js/documents-code.js:1944 |
| `docHoverLine` | frontend/js/documents-code.js:1352 |
| `docHtmlDiagnostics` | frontend/js/documents-code.js:270 |
| `docHtmlTextAt` | frontend/js/documents-code.js:1450 |
| `docIndentGuides` | frontend/js/documents-code.js:2008 |
| `docIndentMixFixes` | frontend/js/documents-code.js:5384 |
| `docIndentSteps` | frontend/js/documents-code.js:1989 |
| `docJsonDiagnostics` | frontend/js/documents-code.js:221 |
| `docJsonErrorAt` | frontend/js/documents-code.js:103 |
| `docJsonFixes` | frontend/js/documents-code.js:5308 |
| `docJsxChildAt` | frontend/js/documents-code.js:1461 |
| `docLoadBeautify` | frontend/js/documents-code.js:1409 |
| `docLoadEmmet` | frontend/js/documents-code.js:1383 |
| `docNativeSnippets` | frontend/js/documents-code.js:591 |
| `docOpenCodeFixes` | frontend/js/documents-code.js:5773 |
| `docOpenSymbols` | frontend/js/documents-code.js:4155 |
| `docPanelChord` | frontend/js/documents-code.js:3376 |
| `docPanelToggle` | frontend/js/documents-code.js:3360 |
| `docPickDefinition` | frontend/js/documents-code.js:2396 |
| `docProblemsRender` | frontend/js/documents-code.js:3397 |
| `docPythonColonFix` | frontend/js/documents-code.js:5361 |
| `docPythonDefines` | frontend/js/documents-code.js:2352 |
| `docReferencesOf` | frontend/js/documents-code.js:2328 |
| `docRemoteDiagnostics` | frontend/js/documents-code.js:300 |
| `docRgbToHex` | frontend/js/documents-code.js:1093 |
| `docRunAfterSave` | frontend/js/documents-code.js:3551 |
| `docRunArmTimeout` | frontend/js/documents-code.js:3885 |
| `docRunAsk` | frontend/js/documents-code.js:3798 |
| `docRunCell` | frontend/js/documents-code.js:4029 |
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
| `docRunSelection` | frontend/js/documents-code.js:4018 |
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
| `docTreeHasJsx` | frontend/js/documents-code.js:5550 |
| `docWordAt` | frontend/js/documents-code.js:2317 |
| `docXmlAutoClose` | frontend/js/documents-code.js:1793 |
| `docXmlOpenedBy` | frontend/js/documents-code.js:1067 |
| `docXmlTextAt` | frontend/js/documents-code.js:1471 |
| `docXmlUnclosed` | frontend/js/documents-code.js:1074 |
| `docYamlBlockLines` | frontend/js/documents-code.js:5110 |

### frontend/js/documents-codekit.js (32)

| Name | File:line |
|---|---|
| `docAssistAnswerArea` | frontend/js/documents-codekit.js:458 |
| `docAssistApply` | frontend/js/documents-codekit.js:556 |
| `docAssistAsk` | frontend/js/documents-codekit.js:472 |
| `docAssistCaretTo` | frontend/js/documents-codekit.js:594 |
| `docAssistDiagnostic` | frontend/js/documents-codekit.js:444 |
| `docAssistModelOff` | frontend/js/documents-codekit.js:418 |
| `docAssistPropose` | frontend/js/documents-codekit.js:524 |
| `docAssistSay` | frontend/js/documents-codekit.js:464 |
| `docAssistShow` | frontend/js/documents-codekit.js:500 |
| `docAssistSyncScope` | frontend/js/documents-codekit.js:431 |
| `docAssistTarget` | frontend/js/documents-codekit.js:422 |
| `docAssistTool` | frontend/js/documents-codekit.js:575 |
| `docCodeSideClose` | frontend/js/documents-codekit.js:76 |
| `docCodeSideOpen` | frontend/js/documents-codekit.js:28 |
| `docCodeSideSheet` | frontend/js/documents-codekit.js:53 |
| `docCodeSideToggle` | frontend/js/documents-codekit.js:88 |
| `docKitBin` | frontend/js/documents-codekit.js:350 |
| `docKitBuiltins` | frontend/js/documents-codekit.js:151 |
| `docKitEntries` | frontend/js/documents-codekit.js:172 |
| `docKitFetch` | frontend/js/documents-codekit.js:187 |
| `docKitLanguageName` | frontend/js/documents-codekit.js:145 |
| `docKitMatches` | frontend/js/documents-codekit.js:182 |
| `docKitSplitName` | frontend/js/documents-codekit.js:310 |
| `docSnippetDelete` | frontend/js/documents-codekit.js:356 |
| `docSnippetInsert` | frontend/js/documents-codekit.js:289 |
| `docSnippetKeys` | frontend/js/documents-codekit.js:382 |
| `docSnippetMoreRow` | frontend/js/documents-codekit.js:237 |
| `docSnippetRename` | frontend/js/documents-codekit.js:366 |
| `docSnippetRow` | frontend/js/documents-codekit.js:252 |
| `docSnippetSave` | frontend/js/documents-codekit.js:322 |
| `docSnippetsRender` | frontend/js/documents-codekit.js:204 |
| `docSnippetsShow` | frontend/js/documents-codekit.js:199 |

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

### frontend/js/documents-prose.js (63)

| Name | File:line |
|---|---|
| `docAccessFindings` | frontend/js/documents-prose.js:660 |
| `docEmojiList` | frontend/js/documents-prose.js:1404 |
| `docEmojiMatches` | frontend/js/documents-prose.js:1417 |
| `docFillDate` | frontend/js/documents-prose.js:1277 |
| `docFillGhost` | frontend/js/documents-prose.js:1523 |
| `docFillOptions` | frontend/js/documents-prose.js:1457 |
| `docFillSig` | frontend/js/documents-prose.js:1334 |
| `docFillTable` | frontend/js/documents-prose.js:1294 |
| `docFillToc` | frontend/js/documents-prose.js:1308 |
| `docFillToken` | frontend/js/documents-prose.js:1438 |
| `docGrammarAsk` | frontend/js/documents-prose.js:100 |
| `docGrammarEnabled` | frontend/js/documents-prose.js:59 |
| `docGrammarFail` | frontend/js/documents-prose.js:65 |
| `docGrammarFindings` | frontend/js/documents-prose.js:170 |
| `docGrammarMessage` | frontend/js/documents-prose.js:145 |
| `docGrammarOutside` | frontend/js/documents-prose.js:159 |
| `docGrammarRequest` | frontend/js/documents-prose.js:233 |
| `docGrammarWhy` | frontend/js/documents-prose.js:82 |
| `docInCodeAt` | frontend/js/documents-prose.js:1661 |
| `docIsoDay` | frontend/js/documents-prose.js:1267 |
| `docListEnter` | frontend/js/documents-prose.js:1633 |
| `docLorem` | frontend/js/documents-prose.js:1255 |
| `docPairBackspace` | frontend/js/documents-prose.js:1618 |
| `docPairInput` | frontend/js/documents-prose.js:1578 |
| `docProseExtras` | frontend/js/documents-prose.js:248 |
| `docProseFillExtensions` | frontend/js/documents-prose.js:1827 |
| `docProseFillOn` | frontend/js/documents-prose.js:1647 |
| `docProseGhostPlugin` | frontend/js/documents-prose.js:1742 |
| `docProseGhostSet` | frontend/js/documents-prose.js:1727 |
| `docProseInputHandler` | frontend/js/documents-prose.js:1675 |
| `docProsePairKeymap` | frontend/js/documents-prose.js:1788 |
| `docProseRemap` | frontend/js/documents-prose.js:204 |
| `docProseToolExtensions` | frontend/js/documents-prose.js:1190 |
| `docReadAloudExtension` | frontend/js/documents-prose.js:1146 |
| `docReadAloudNext` | frontend/js/documents-prose.js:1075 |
| `docReadAloudSentences` | frontend/js/documents-prose.js:1002 |
| `docReadAloudStart` | frontend/js/documents-prose.js:1055 |
| `docReadAloudStop` | frontend/js/documents-prose.js:1124 |
| `docReadAloudVoice` | frontend/js/documents-prose.js:1039 |
| `docSmartPunct` | frontend/js/documents-prose.js:1540 |
| `docSmartPunctOn` | frontend/js/documents-prose.js:1654 |
| `docSpeakable` | frontend/js/documents-prose.js:982 |
| `docSuggestActive` | frontend/js/documents-prose.js:736 |
| `docSuggestAll` | frontend/js/documents-prose.js:905 |
| `docSuggestApply` | frontend/js/documents-prose.js:863 |
| `docSuggestCodeMask` | frontend/js/documents-prose.js:416 |
| `docSuggestEdit` | frontend/js/documents-prose.js:490 |
| `docSuggestExtensions` | frontend/js/documents-prose.js:769 |
| `docSuggestFindingFor` | frontend/js/documents-prose.js:602 |
| `docSuggestForRead` | frontend/js/documents-prose.js:584 |
| `docSuggestMenu` | frontend/js/documents-prose.js:874 |
| `docSuggestMenuItems` | frontend/js/documents-prose.js:621 |
| `docSuggestModes` | frontend/js/documents-prose.js:728 |
| `docSuggestNext` | frontend/js/documents-prose.js:920 |
| `docSuggestNormalize` | frontend/js/documents-prose.js:454 |
| `docSuggestParse` | frontend/js/documents-prose.js:434 |
| `docSuggestResolve` | frontend/js/documents-prose.js:566 |
| `docSuggestResolveAll` | frontend/js/documents-prose.js:572 |
| `noteGrammarMenu` | frontend/js/documents-prose.js:364 |
| `noteGrammarPlugin` | frontend/js/documents-prose.js:283 |
| `renderDocReadAloudState` | frontend/js/documents-prose.js:1132 |
| `renderDocSuggestState` | frontend/js/documents-prose.js:936 |
| `setDocSuggestMode` | frontend/js/documents-prose.js:741 |

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

### frontend/js/documents.js (582)

| Name | File:line |
|---|---|
| `acceptDocAiEdit` | frontend/js/documents.js:11577 |
| `applyDocComplete` | frontend/js/documents.js:16706 |
| `applyDocDim` | frontend/js/documents.js:13735 |
| `applyDocGutter` | frontend/js/documents.js:14488 |
| `applyDocProseDock` | frontend/js/documents.js:17611 |
| `applyDocSerif` | frontend/js/documents.js:13772 |
| `applyDocToolbarCollapsed` | frontend/js/documents.js:14557 |
| `applyDocToolbarLayoutButtons` | frontend/js/documents.js:14731 |
| `applyDocToolbarMode` | frontend/js/documents.js:14384 |
| `applyDocTypewriter` | frontend/js/documents.js:13752 |
| `applyDocWidth` | frontend/js/documents.js:13607 |
| `applyMarkdown` | frontend/js/documents.js:10145 |
| `archiveDocumentWithUndo` | frontend/js/documents.js:11120 |
| `asSurface` | frontend/js/documents.js:631 |
| `attachBookmarkToDocument` | frontend/js/documents.js:1435 |
| `calloutMenuItems` | frontend/js/documents.js:21575 |
| `chooseDocTemplate` | frontend/js/documents.js:1855 |
| `clearInlineFormatting` | frontend/js/documents.js:10345 |
| `closeDocAiPanel` | frontend/js/documents.js:11455 |
| `closeDocProsePanel` | frontend/js/documents.js:16082 |
| `closeDocSuggest` | frontend/js/documents.js:17849 |
| `cmSurface` | frontend/js/documents.js:469 |
| `createDocument` | frontend/js/documents.js:1827 |
| `deleteCurrentDocument` | frontend/js/documents.js:11243 |
| `deleteDocumentWithUndo` | frontend/js/documents.js:11074 |
| `docActiveBox` | frontend/js/documents.js:15026 |
| `docAfterFirstPaint` | frontend/js/documents.js:903 |
| `docAiCheckStatus` | frontend/js/documents.js:18751 |
| `docAiDiffTarget` | frontend/js/documents.js:11307 |
| `docAiDiscussInChat` | frontend/js/documents.js:18592 |
| `docAiDismiss` | frontend/js/documents.js:18663 |
| `docAiFindings` | frontend/js/documents.js:18641 |
| `docAiResultEdited` | frontend/js/documents.js:11370 |
| `docAiReview` | frontend/js/documents.js:18668 |
| `docAiVerb` | frontend/js/documents.js:11261 |
| `docAiVerbChanged` | frontend/js/documents.js:11426 |
| `docAiVerbIcon` | frontend/js/documents.js:11640 |
| `docAnnotateSelection` | frontend/js/documents.js:6952 |
| `docAppendRendered` | frontend/js/documents.js:3675 |
| `docApplyImageOptions` | frontend/js/documents.js:9501 |
| `docApplyPrintSetup` | frontend/js/documents.js:10912 |
| `docAutocorrectAt` | frontend/js/documents.js:16780 |
| `docAutocorrectEnabled` | frontend/js/documents.js:16771 |
| `docBacklinkItem` | frontend/js/documents.js:1289 |
| `docBlockBarClose` | frontend/js/documents.js:21218 |
| `docBlockBarEl` | frontend/js/documents.js:21199 |
| `docBlockBarShow` | frontend/js/documents.js:21247 |
| `docBlockBarSoon` | frontend/js/documents.js:21213 |
| `docBlockBounds` | frontend/js/documents.js:6319 |
| `docBlockDelete` | frontend/js/documents.js:21300 |
| `docBlockDocumentText` | frontend/js/documents.js:6488 |
| `docBlockEdit` | frontend/js/documents.js:21287 |
| `docBlockEnsureIdEdits` | frontend/js/documents.js:6406 |
| `docBlockFind` | frontend/js/documents.js:6434 |
| `docBlockIdOf` | frontend/js/documents.js:6358 |
| `docBlockIds` | frontend/js/documents.js:6371 |
| `docBlockInFence` | frontend/js/documents.js:6305 |
| `docBlockLines` | frontend/js/documents.js:21226 |
| `docBlockNewId` | frontend/js/documents.js:6386 |
| `docBlockRefAtCaret` | frontend/js/documents.js:6498 |
| `docBlockRefSplit` | frontend/js/documents.js:6290 |
| `docBlockStripIds` | frontend/js/documents.js:6465 |
| `docBookmarkWithUndo` | frontend/js/documents.js:11185 |
| `docBoxEl` | frontend/js/documents.js:378 |
| `docBuildVocabulary` | frontend/js/documents.js:16515 |
| `docCalloutFold` | frontend/js/documents.js:21114 |
| `docCalloutFoldRange` | frontend/js/documents.js:21103 |
| `docCalloutFolded` | frontend/js/documents.js:21124 |
| `docCalloutKindMenu` | frontend/js/documents.js:21343 |
| `docCanOutdent` | frontend/js/documents.js:4070 |
| `docCaretLine` | frontend/js/documents.js:2444 |
| `docCaretPoint` | frontend/js/documents.js:15099 |
| `docCaretStats` | frontend/js/documents.js:15116 |
| `docCaretVisibleLine` | frontend/js/documents.js:3334 |
| `docCmApplySpellcheck` | frontend/js/documents.js:20641 |
| `docCmDrawFor` | frontend/js/documents.js:20886 |
| `docCmExtensions` | frontend/js/documents.js:20516 |
| `docCmGutter` | frontend/js/documents.js:20986 |
| `docCmHighlight` | frontend/js/documents.js:20337 |
| `docCmIsolate` | frontend/js/documents.js:18991 |
| `docCmKeymap` | frontend/js/documents.js:20394 |
| `docCmLanguageFor` | frontend/js/documents.js:19141 |
| `docCmPartIs` | frontend/js/documents.js:7255 |
| `docCmRepaintFindings` | frontend/js/documents.js:20774 |
| `docCmSpellcheck` | frontend/js/documents.js:20631 |
| `docCmSyncFileType` | frontend/js/documents.js:20921 |
| `docCmSyncGutter` | frontend/js/documents.js:20972 |
| `docCmSyncLanguage` | frontend/js/documents.js:20955 |
| `docCmTheme` | frontend/js/documents.js:19294 |
| `docCmUpdate` | frontend/js/documents.js:20652 |
| `docCmViewLanguage` | frontend/js/documents.js:20947 |
| `docCmViewShown` | frontend/js/documents.js:21523 |
| `docCodeCommentAtCaret` | frontend/js/documents.js:4230 |
| `docCodeCommentRun` | frontend/js/documents.js:4226 |
| `docCodeSideFrom` | frontend/js/documents.js:12587 |
| `docColumnsArrowKeymap` | frontend/js/documents.js:8915 |
| `docColumnsAt` | frontend/js/documents.js:6192 |
| `docColumnsBlocks` | frontend/js/documents.js:6129 |
| `docColumnsField` | frontend/js/documents.js:8821 |
| `docCommentContext` | frontend/js/documents.js:6810 |
| `docCommentFootnotes` | frontend/js/documents.js:6742 |
| `docCommentResolveEdit` | frontend/js/documents.js:6694 |
| `docCommentRow` | frontend/js/documents.js:6820 |
| `docCommentSkipMask` | frontend/js/documents.js:6607 |
| `docCommentStrip` | frontend/js/documents.js:6721 |
| `docComments` | frontend/js/documents.js:6803 |
| `docCommentsParse` | frontend/js/documents.js:6644 |
| `docCompleteEnabled` | frontend/js/documents.js:16508 |
| `docCompleteKeydown` | frontend/js/documents.js:16738 |
| `docCopyBlockRef` | frontend/js/documents.js:6514 |
| `docCrumbsEl` | frontend/js/documents.js:2367 |
| `docDesktopFs` | frontend/js/documents.js:14086 |
| `docDesktopFullscreenToggle` | frontend/js/documents.js:14091 |
| `docDictionary` | frontend/js/documents.js:17785 |
| `docDictionaryAdd` | frontend/js/documents.js:17820 |
| `docDictionaryAddTyped` | frontend/js/documents.js:18888 |
| `docDictionaryExport` | frontend/js/documents.js:18918 |
| `docDictionaryImport` | frontend/js/documents.js:18903 |
| `docDictionaryWordOk` | frontend/js/documents.js:18884 |
| `docDictionaryWrite` | frontend/js/documents.js:17799 |
| `docDiffApply` | frontend/js/documents.js:11891 |
| `docDiffHunkHead` | frontend/js/documents.js:12037 |
| `docDiffHunks` | frontend/js/documents.js:11872 |
| `docDiffLcs` | frontend/js/documents.js:11748 |
| `docDiffLines` | frontend/js/documents.js:11787 |
| `docDiffRows` | frontend/js/documents.js:11839 |
| `docDiffSplit` | frontend/js/documents.js:11818 |
| `docDiffSplitLayout` | frontend/js/documents.js:11986 |
| `docDiffStat` | frontend/js/documents.js:11823 |
| `docEditDistance` | frontend/js/documents.js:17903 |
| `docEditsOnce` | frontend/js/documents.js:15614 |
| `docEmbedChip` | frontend/js/documents.js:9674 |
| `docEmbedFill` | frontend/js/documents.js:9685 |
| `docEmbedNode` | frontend/js/documents.js:9425 |
| `docEmbedTarget` | frontend/js/documents.js:9409 |
| `docEventFromCm` | frontend/js/documents.js:625 |
| `docExportClean` | frontend/js/documents.js:10697 |
| `docExportEscape` | frontend/js/documents.js:10619 |
| `docExportHtmlDocument` | frontend/js/documents.js:10635 |
| `docExportInlineImages` | frontend/js/documents.js:10738 |
| `docExportPromoteHeadings` | frontend/js/documents.js:10684 |
| `docExportUnwrapControls` | frontend/js/documents.js:10660 |
| `docFenceGutterOn` | frontend/js/documents.js:20968 |
| `docFileType` | frontend/js/documents.js:101 |
| `docFillAt` | frontend/js/documents.js:16580 |
| `docFindMatches` | frontend/js/documents.js:2196 |
| `docFindSelect` | frontend/js/documents.js:2213 |
| `docFindStep` | frontend/js/documents.js:2227 |
| `docFindingAnchor` | frontend/js/documents.js:17109 |
| `docFindingAnswerRows` | frontend/js/documents.js:18116 |
| `docFindingAtOffset` | frontend/js/documents.js:17009 |
| `docFindingAtPoint` | frontend/js/documents.js:17174 |
| `docFindingIsPassage` | frontend/js/documents.js:18104 |
| `docFindingKeyBox` | frontend/js/documents.js:17359 |
| `docFindingKind` | frontend/js/documents.js:15996 |
| `docFindingLabel` | frontend/js/documents.js:17990 |
| `docFindingLine` | frontend/js/documents.js:18072 |
| `docFindingMarks` | frontend/js/documents.js:17047 |
| `docFindingOfMark` | frontend/js/documents.js:17137 |
| `docFindingStep` | frontend/js/documents.js:17372 |
| `docFindingsPlugin` | frontend/js/documents.js:20723 |
| `docFmNeedsQuote` | frontend/js/documents.js:5454 |
| `docFmRaw` | frontend/js/documents.js:5446 |
| `docFmSpan` | frontend/js/documents.js:5424 |
| `docFmSplitInline` | frontend/js/documents.js:5479 |
| `docFmWrite` | frontend/js/documents.js:5465 |
| `docFocusFill` | frontend/js/documents.js:13982 |
| `docFocusKey` | frontend/js/documents.js:14056 |
| `docFocusOn` | frontend/js/documents.js:13853 |
| `docFocusPointer` | frontend/js/documents.js:14049 |
| `docFocusRest` | frontend/js/documents.js:14037 |
| `docFocusSyncFullscreen` | frontend/js/documents.js:14102 |
| `docFocusSyncProse` | frontend/js/documents.js:16094 |
| `docFocusToggleFullscreen` | frontend/js/documents.js:14113 |
| `docFocusWake` | frontend/js/documents.js:14025 |
| `docFocusWatch` | frontend/js/documents.js:14004 |
| `docFoldMarkedCallouts` | frontend/js/documents.js:21379 |
| `docFrontmatterAddEdits` | frontend/js/documents.js:5660 |
| `docFrontmatterCreateEdits` | frontend/js/documents.js:5681 |
| `docFrontmatterEntry` | frontend/js/documents.js:5594 |
| `docFrontmatterParse` | frontend/js/documents.js:5506 |
| `docFrontmatterRemoveEdits` | frontend/js/documents.js:5672 |
| `docFrontmatterSetEdits` | frontend/js/documents.js:5604 |
| `docFrontmatterSetListEdits` | frontend/js/documents.js:5616 |
| `docFrontmatterStrip` | frontend/js/documents.js:5692 |
| `docFrontmatterTypeFields` | frontend/js/documents.js:5705 |
| `docGoToComment` | frontend/js/documents.js:6898 |
| `docGoToFinding` | frontend/js/documents.js:17389 |
| `docGoToFootnote` | frontend/js/documents.js:21396 |
| `docGuardGlobalShortcuts` | frontend/js/documents.js:20853 |
| `docGutterPref` | frontend/js/documents.js:14453 |
| `docGutterWanted` | frontend/js/documents.js:14461 |
| `docGutters` | frontend/js/documents.js:3823 |
| `docHeadingFold` | frontend/js/documents.js:21411 |
| `docHeadingTrail` | frontend/js/documents.js:2335 |
| `docHistoryDelta` | frontend/js/documents.js:12075 |
| `docHistoryPersist` | frontend/js/documents.js:21508 |
| `docHistoryRestore` | frontend/js/documents.js:21491 |
| `docHistoryRow` | frontend/js/documents.js:12164 |
| `docHistoryRowMenu` | frontend/js/documents.js:12266 |
| `docHistoryStamp` | frontend/js/documents.js:19016 |
| `docHtmlToMarkdown` | frontend/js/documents.js:5072 |
| `docImageAltWith` | frontend/js/documents.js:6236 |
| `docImageOptions` | frontend/js/documents.js:6200 |
| `docImageOptionsFromAlt` | frontend/js/documents.js:9648 |
| `docInsertProperties` | frontend/js/documents.js:6065 |
| `docInsertReferenceLink` | frontend/js/documents.js:1218 |
| `docKnownWords` | frontend/js/documents.js:17933 |
| `docLayerImageOptions` | frontend/js/documents.js:9659 |
| `docLiftToViewport` | frontend/js/documents.js:18361 |
| `docLineClipboardEvent` | frontend/js/documents.js:21037 |
| `docLineClipboardExtension` | frontend/js/documents.js:21064 |
| `docLineClipboardRange` | frontend/js/documents.js:21025 |
| `docLineOffset` | frontend/js/documents.js:21241 |
| `docLinePasteEvent` | frontend/js/documents.js:21050 |
| `docLinkBack` | frontend/js/documents.js:1229 |
| `docLinkMention` | frontend/js/documents.js:1244 |
| `docLinksTo` | frontend/js/documents.js:1191 |
| `docListGuides` | frontend/js/documents.js:19277 |
| `docLiveExtensions` | frontend/js/documents.js:8908 |
| `docLivePlugin` | frontend/js/documents.js:7281 |
| `docLoadNoteTypes` | frontend/js/documents.js:5885 |
| `docLoadWordlist` | frontend/js/documents.js:15512 |
| `docMapThroughAnchors` | frontend/js/documents.js:9971 |
| `docMarkAnchor` | frontend/js/documents.js:17084 |
| `docMarkRects` | frontend/js/documents.js:17072 |
| `docMatchCase` | frontend/js/documents.js:17949 |
| `docMathArgument` | frontend/js/documents.js:7096 |
| `docMathCommand` | frontend/js/documents.js:7121 |
| `docMathElement` | frontend/js/documents.js:7233 |
| `docMathLooksLikeMath` | frontend/js/documents.js:7219 |
| `docMathNodes` | frontend/js/documents.js:7164 |
| `docMathRender` | frontend/js/documents.js:7241 |
| `docMathRow` | frontend/js/documents.js:7091 |
| `docMathToken` | frontend/js/documents.js:7107 |
| `docMathTokens` | frontend/js/documents.js:7039 |
| `docMathTree` | frontend/js/documents.js:7202 |
| `docMentionsHost` | frontend/js/documents.js:1154 |
| `docMermaidBlocks` | frontend/js/documents.js:9327 |
| `docMermaidField` | frontend/js/documents.js:9336 |
| `docMermaidSvg` | frontend/js/documents.js:9282 |
| `docMirrorPoint` | frontend/js/documents.js:15063 |
| `docNameCurrentVersion` | frontend/js/documents.js:12331 |
| `docNameVersion` | frontend/js/documents.js:12307 |
| `docNearestWords` | frontend/js/documents.js:17963 |
| `docNextFootnote` | frontend/js/documents.js:10321 |
| `docNextName` | frontend/js/documents.js:1825 |
| `docOffsetOf` | frontend/js/documents.js:17016 |
| `docOpenBacklinkSource` | frontend/js/documents.js:1203 |
| `docOpenLink` | frontend/js/documents.js:9828 |
| `docOpenResolvedWikiTarget` | frontend/js/documents.js:9801 |
| `docOpenSuggestAtCaret` | frontend/js/documents.js:17241 |
| `docOpenSuggestAtPoint` | frontend/js/documents.js:17311 |
| `docOpenSuggestFor` | frontend/js/documents.js:17209 |
| `docOpenWikiTarget` | frontend/js/documents.js:9820 |
| `docOutlineClearDrop` | frontend/js/documents.js:2947 |
| `docOutlineDropAfter` | frontend/js/documents.js:2942 |
| `docOutlineFilterText` | frontend/js/documents.js:2518 |
| `docOutlineFoldKey` | frontend/js/documents.js:2514 |
| `docOutlineFoldStore` | frontend/js/documents.js:2482 |
| `docOutlineFolds` | frontend/js/documents.js:2490 |
| `docOutlineMoveSection` | frontend/js/documents.js:2904 |
| `docOutlineNudge` | frontend/js/documents.js:2963 |
| `docOutlineSetFolds` | frontend/js/documents.js:2503 |
| `docOutlineVisibility` | frontend/js/documents.js:2531 |
| `docPaletteCommands` | frontend/js/documents.js:2845 |
| `docPlaceFixed` | frontend/js/documents.js:18385 |
| `docPointerMenuOpen` | frontend/js/documents.js:17165 |
| `docPositionsRead` | frontend/js/documents.js:994 |
| `docPositionsWrite` | frontend/js/documents.js:1003 |
| `docPreviewShowing` | frontend/js/documents.js:326 |
| `docPrintCssString` | frontend/js/documents.js:10908 |
| `docPrintIsOurs` | frontend/js/documents.js:10843 |
| `docPrintMarginBoxes` | frontend/js/documents.js:10903 |
| `docPrintSetupDialog` | frontend/js/documents.js:10927 |
| `docPrintSetupRead` | frontend/js/documents.js:10890 |
| `docPromptInModal` | frontend/js/documents.js:12296 |
| `docPropsAddRow` | frontend/js/documents.js:5961 |
| `docPropsAdder` | frontend/js/documents.js:5834 |
| `docPropsChip` | frontend/js/documents.js:5812 |
| `docPropsDispatch` | frontend/js/documents.js:5753 |
| `docPropsField` | frontend/js/documents.js:5865 |
| `docPropsHost` | frontend/js/documents.js:5774 |
| `docPropsIconButton` | frontend/js/documents.js:5795 |
| `docPropsNow` | frontend/js/documents.js:5762 |
| `docPropsReadNode` | frontend/js/documents.js:3689 |
| `docPropsShowing` | frontend/js/documents.js:5766 |
| `docPropsTypeRows` | frontend/js/documents.js:5905 |
| `docProseApply` | frontend/js/documents.js:16440 |
| `docProseApplyWidth` | frontend/js/documents.js:17528 |
| `docProseDockChoice` | frontend/js/documents.js:17513 |
| `docProseDockSide` | frontend/js/documents.js:17522 |
| `docProseFindings` | frontend/js/documents.js:15787 |
| `docProseFix` | frontend/js/documents.js:16444 |
| `docProseFixAll` | frontend/js/documents.js:16464 |
| `docProseGroupList` | frontend/js/documents.js:16324 |
| `docProseHeader` | frontend/js/documents.js:16013 |
| `docProseIgnore` | frontend/js/documents.js:16302 |
| `docProseJump` | frontend/js/documents.js:16408 |
| `docProseKey` | frontend/js/documents.js:17835 |
| `docProseResizeHandle` | frontend/js/documents.js:17560 |
| `docProseRowAnswers` | frontend/js/documents.js:16225 |
| `docProseRowCollapse` | frontend/js/documents.js:16216 |
| `docProseRowKeys` | frontend/js/documents.js:16314 |
| `docProseSavedWidth` | frontend/js/documents.js:17546 |
| `docProseSkipMask` | frontend/js/documents.js:15764 |
| `docPutFields` | frontend/js/documents.js:11104 |
| `docReadingPlugin` | frontend/js/documents.js:13673 |
| `docRectHolds` | frontend/js/documents.js:17077 |
| `docRectUsable` | frontend/js/documents.js:17104 |
| `docRedo` | frontend/js/documents.js:19045 |
| `docRememberPosition` | frontend/js/documents.js:1044 |
| `docRememberPositionNow` | frontend/js/documents.js:1025 |
| `docRememberReading` | frontend/js/documents.js:13781 |
| `docRenderBody` | frontend/js/documents.js:3574 |
| `docRenderDiff` | frontend/js/documents.js:11920 |
| `docRenderFlow` | frontend/js/documents.js:3645 |
| `docRenderMermaidIn` | frontend/js/documents.js:9308 |
| `docReplaceAll` | frontend/js/documents.js:2257 |
| `docReplaceOne` | frontend/js/documents.js:2238 |
| `docReplacePattern` | frontend/js/documents.js:12415 |
| `docReplaceRange` | frontend/js/documents.js:4009 |
| `docReplaceScan` | frontend/js/documents.js:12442 |
| `docResetDocument` | frontend/js/documents.js:21449 |
| `docResolveComment` | frontend/js/documents.js:6932 |
| `docResolveConflict` | frontend/js/documents.js:2068 |
| `docResolveWikiTarget` | frontend/js/documents.js:9757 |
| `docRestorePosition` | frontend/js/documents.js:1108 |
| `docRestoreReading` | frontend/js/documents.js:13804 |
| `docReturnFromViewport` | frontend/js/documents.js:18370 |
| `docRevealBlock` | frontend/js/documents.js:6536 |
| `docRevealForSuggest` | frontend/js/documents.js:17198 |
| `docRevisionText` | frontend/js/documents.js:12122 |
| `docRichPasteEvent` | frontend/js/documents.js:5196 |
| `docRunControl` | frontend/js/documents.js:2660 |
| `docSaveToolPref` | frontend/js/documents.js:16868 |
| `docScanHeadings` | frontend/js/documents.js:2562 |
| `docScheduleSuggestFollow` | frontend/js/documents.js:18511 |
| `docScrollAnchors` | frontend/js/documents.js:9905 |
| `docSectionCount` | frontend/js/documents.js:1182 |
| `docSectionRange` | frontend/js/documents.js:2607 |
| `docSelectedLines` | frontend/js/documents.js:3992 |
| `docSetBookmark` | frontend/js/documents.js:11178 |
| `docSetCalloutHead` | frontend/js/documents.js:21168 |
| `docSetLiveDecorations` | frontend/js/documents.js:7260 |
| `docSetNoteLink` | frontend/js/documents.js:11159 |
| `docSetPlaceholder` | frontend/js/documents.js:387 |
| `docSetStatusText` | frontend/js/documents.js:15149 |
| `docSetVersionName` | frontend/js/documents.js:12314 |
| `docShowComment` | frontend/js/documents.js:6916 |
| `docShowSaved` | frontend/js/documents.js:11211 |
| `docSourceLineTop` | frontend/js/documents.js:9888 |
| `docSpellConfident` | frontend/js/documents.js:15692 |
| `docSpellGuesses` | frontend/js/documents.js:15644 |
| `docSpellLookup` | frontend/js/documents.js:15719 |
| `docSpellRoot` | frontend/js/documents.js:15634 |
| `docSpellable` | frontend/js/documents.js:15563 |
| `docSpellingVariant` | frontend/js/documents.js:17742 |
| `docSuggestAlternatives` | frontend/js/documents.js:17997 |
| `docSuggestAnswers` | frontend/js/documents.js:18167 |
| `docSuggestBand` | frontend/js/documents.js:18421 |
| `docSuggestFollowAnchor` | frontend/js/documents.js:18489 |
| `docSurface` | frontend/js/documents.js:599 |
| `docSurfaceById` | frontend/js/documents.js:613 |
| `docSurfaceChanged` | frontend/js/documents.js:592 |
| `docSurfaceInput` | frontend/js/documents.js:12650 |
| `docSyncFormatShow` | frontend/js/documents.js:14615 |
| `docTableAddColumnEdits` | frontend/js/documents.js:4537 |
| `docTableAddRowEdits` | frontend/js/documents.js:4510 |
| `docTableAlignEdits` | frontend/js/documents.js:4637 |
| `docTableAlignOf` | frontend/js/documents.js:4397 |
| `docTableApplyEdits` | frontend/js/documents.js:4653 |
| `docTableCaretTo` | frontend/js/documents.js:4923 |
| `docTableCellAt` | frontend/js/documents.js:4661 |
| `docTableCellClick` | frontend/js/documents.js:20473 |
| `docTableCellSpan` | frontend/js/documents.js:4481 |
| `docTableColumnPad` | frontend/js/documents.js:4495 |
| `docTableCommand` | frontend/js/documents.js:5330 |
| `docTableContext` | frontend/js/documents.js:4835 |
| `docTableDispatch` | frontend/js/documents.js:4847 |
| `docTableEscapeCell` | frontend/js/documents.js:4718 |
| `docTableFillRowEdits` | frontend/js/documents.js:4619 |
| `docTableFromGrid` | frontend/js/documents.js:4742 |
| `docTableGo` | frontend/js/documents.js:4872 |
| `docTableGridFromText` | frontend/js/documents.js:4731 |
| `docTableGridRules` | frontend/js/documents.js:19226 |
| `docTableIsDelimiter` | frontend/js/documents.js:4390 |
| `docTableJoinRow` | frontend/js/documents.js:4371 |
| `docTableKeyMove` | frontend/js/documents.js:4957 |
| `docTableMenu` | frontend/js/documents.js:5344 |
| `docTableParse` | frontend/js/documents.js:4415 |
| `docTablePasteEdits` | frontend/js/documents.js:4782 |
| `docTablePasteEvent` | frontend/js/documents.js:5009 |
| `docTableRemoveColumnEdits` | frontend/js/documents.js:4590 |
| `docTableRemoveEdits` | frontend/js/documents.js:5219 |
| `docTableRemoveRowEdits` | frontend/js/documents.js:4527 |
| `docTableRowLike` | frontend/js/documents.js:4384 |
| `docTableSetCellEdits` | frontend/js/documents.js:4754 |
| `docTableSplitRow` | frontend/js/documents.js:4332 |
| `docTableStepCell` | frontend/js/documents.js:4678 |
| `docTableStepRow` | frontend/js/documents.js:4708 |
| `docTableTab` | frontend/js/documents.js:16958 |
| `docTableTabStep` | frontend/js/documents.js:4909 |
| `docTakeTabEscape` | frontend/js/documents.js:4052 |
| `docTemplateFill` | frontend/js/documents.js:1783 |
| `docTemplateListKeys` | frontend/js/documents.js:1878 |
| `docText` | frontend/js/documents.js:605 |
| `docTocJump` | frontend/js/documents.js:21143 |
| `docToggleCalloutFold` | frontend/js/documents.js:21358 |
| `docToggleCodeDraw` | frontend/js/documents.js:20895 |
| `docToolPref` | frontend/js/documents.js:16859 |
| `docToolbarCollapsed` | frontend/js/documents.js:14539 |
| `docToolbarLayoutSignature` | frontend/js/documents.js:14949 |
| `docToolbarMarksAt` | frontend/js/documents.js:15230 |
| `docToolbarMode` | frontend/js/documents.js:14370 |
| `docToolsBoxFor` | frontend/js/documents.js:16917 |
| `docToolsOnInput` | frontend/js/documents.js:16881 |
| `docTopOffset` | frontend/js/documents.js:1018 |
| `docTranslatePassage` | frontend/js/documents.js:18526 |
| `docTypewriterExtension` | frontend/js/documents.js:13720 |
| `docUndo` | frontend/js/documents.js:18998 |
| `docUndoBreak` | frontend/js/documents.js:18984 |
| `docUndoDiffRange` | frontend/js/documents.js:18962 |
| `docUntitledName` | frontend/js/documents.js:1815 |
| `docVariantLookup` | frontend/js/documents.js:17746 |
| `docVisibleTopLine` | frontend/js/documents.js:3279 |
| `docWatchAppearance` | frontend/js/documents.js:20870 |
| `docWatchLock` | frontend/js/documents.js:21543 |
| `docWhereLine` | frontend/js/documents.js:3367 |
| `docWikiTargetLabel` | frontend/js/documents.js:9783 |
| `docWireImageEdit` | frontend/js/documents.js:9526 |
| `docWordFragment` | frontend/js/documents.js:16549 |
| `docWordGoalKey` | frontend/js/documents.js:2126 |
| `docWordKnown` | frontend/js/documents.js:15587 |
| `docWordlistReady` | frontend/js/documents.js:15508 |
| `docWriteContents` | frontend/js/documents.js:12482 |
| `docWriteOutsideHistory` | frontend/js/documents.js:11199 |
| `downloadDocumentExport` | frontend/js/documents.js:10433 |
| `ensureDocEditor` | frontend/js/documents.js:20812 |
| `ensureDocumentExists` | frontend/js/documents.js:1974 |
| `expandNoteIntoDocument` | frontend/js/documents.js:2097 |
| `exportDocumentBundle` | frontend/js/documents.js:10454 |
| `exportDocumentDocx` | frontend/js/documents.js:10460 |
| `exportDocumentHtml` | frontend/js/documents.js:10781 |
| `exportDocumentMarkdown` | frontend/js/documents.js:10467 |
| `exportDocumentPdf` | frontend/js/documents.js:11041 |
| `finishMarkdownEdit` | frontend/js/documents.js:10331 |
| `fitDocToolbarRow` | frontend/js/documents.js:14766 |
| `fitDocToolbars` | frontend/js/documents.js:14989 |
| `foldDocMenuGroup` | frontend/js/documents.js:237 |
| `forgetDocEditLocally` | frontend/js/documents.js:1071 |
| `getDocWordGoal` | frontend/js/documents.js:2130 |
| `hideDocComplete` | frontend/js/documents.js:16564 |
| `indentDocSelection` | frontend/js/documents.js:4076 |
| `initDocSidebarTabs` | frontend/js/documents.js:12559 |
| `initMarkdownToolbars` | frontend/js/documents.js:13529 |
| `insertAround` | frontend/js/documents.js:10292 |
| `jumpToDocLine` | frontend/js/documents.js:3451 |
| `keepDocEditLocally` | frontend/js/documents.js:1062 |
| `keepOutlineRowInView` | frontend/js/documents.js:3378 |
| `layerDocWikiLinks` | frontend/js/documents.js:3725 |
| `loadCodeMirror` | frontend/js/documents.js:19082 |
| `loadDocFileTypes` | frontend/js/documents.js:79 |
| `loadDocuments` | frontend/js/documents.js:735 |
| `loadDocumentsNow` | frontend/js/documents.js:746 |
| `markDocDirty` | frontend/js/documents.js:1999 |
| `markDocOutline` | frontend/js/documents.js:3392 |
| `markDocToolbarSepEdges` | frontend/js/documents.js:14896 |
| `mermaidFlowLayout` | frontend/js/documents.js:9077 |
| `mermaidFlowLink` | frontend/js/documents.js:9001 |
| `mermaidFlowNode` | frontend/js/documents.js:8985 |
| `mermaidFlowParse` | frontend/js/documents.js:9026 |
| `mermaidFlowSummary` | frontend/js/documents.js:9272 |
| `mermaidFlowSvgTree` | frontend/js/documents.js:9230 |
| `mermaidFlowUnquote` | frontend/js/documents.js:8978 |
| `mountDocEditor` | frontend/js/documents.js:20783 |
| `mountDocToolbarControls` | frontend/js/documents.js:14710 |
| `mountDocToolbarControlsFor` | frontend/js/documents.js:14636 |
| `mountEditorToolbarExtras` | frontend/js/documents.js:12784 |
| `mountGutterFor` | frontend/js/documents.js:3939 |
| `mountNoteSurface` | frontend/js/documents.js:13387 |
| `noteSourceWanted` | frontend/js/documents.js:13248 |
| `noteSurfaceExtensions` | frontend/js/documents.js:13088 |
| `noteSurfaceFor` | frontend/js/documents.js:13061 |
| `noteSurfaceGutter` | frontend/js/documents.js:21080 |
| `noteSurfaceKeymap` | frontend/js/documents.js:13173 |
| `noteSurfaceMeta` | frontend/js/documents.js:13076 |
| `noteSurfaceMirror` | frontend/js/documents.js:13284 |
| `noteSurfaceName` | frontend/js/documents.js:13156 |
| `noteSurfaceOwnValue` | frontend/js/documents.js:13313 |
| `noteSurfaceUpdate` | frontend/js/documents.js:13266 |
| `offerCreateUndo` | frontend/js/documents.js:11142 |
| `offerKeptDocEdit` | frontend/js/documents.js:1086 |
| `openDocAiHistory` | frontend/js/documents.js:11644 |
| `openDocAiPanel` | frontend/js/documents.js:11437 |
| `openDocDictionary` | frontend/js/documents.js:18804 |
| `openDocExtractPreview` | frontend/js/documents.js:11462 |
| `openDocHistory` | frontend/js/documents.js:12080 |
| `openDocPhoneInsert` | frontend/js/documents.js:12968 |
| `openDocReplace` | frontend/js/documents.js:12427 |
| `openDocSuggest` | frontend/js/documents.js:18294 |
| `openDocTemplateDialog` | frontend/js/documents.js:1898 |
| `openDocument` | frontend/js/documents.js:911 |
| `placeDocSuggest` | frontend/js/documents.js:18434 |
| `promptDocWordGoal` | frontend/js/documents.js:2182 |
| `pushDocAiUndo` | frontend/js/documents.js:11532 |
| `recordDocAiEditLog` | frontend/js/documents.js:11556 |
| `renameDocumentWithUndo` | frontend/js/documents.js:11108 |
| `renderDocAiDiff` | frontend/js/documents.js:11326 |
| `renderDocBacklinks` | frontend/js/documents.js:1322 |
| `renderDocBookmarks` | frontend/js/documents.js:1388 |
| `renderDocCaret` | frontend/js/documents.js:15161 |
| `renderDocComments` | frontend/js/documents.js:6873 |
| `renderDocComplete` | frontend/js/documents.js:16601 |
| `renderDocCounts` | frontend/js/documents.js:15277 |
| `renderDocCrumbs` | frontend/js/documents.js:2387 |
| `renderDocDictionary` | frontend/js/documents.js:18832 |
| `renderDocGutter` | frontend/js/documents.js:3904 |
| `renderDocHistoryList` | frontend/js/documents.js:12130 |
| `renderDocList` | frontend/js/documents.js:782 |
| `renderDocNotes` | frontend/js/documents.js:1356 |
| `renderDocOutline` | frontend/js/documents.js:2981 |
| `renderDocPreview` | frontend/js/documents.js:3506 |
| `renderDocProperties` | frontend/js/documents.js:6012 |
| `renderDocProse` | frontend/js/documents.js:15930 |
| `renderDocProsePanel` | frontend/js/documents.js:16108 |
| `renderDocReplace` | frontend/js/documents.js:12453 |
| `renderDocShortcutSheet` | frontend/js/documents.js:2867 |
| `renderDocStats` | frontend/js/documents.js:2155 |
| `renderDocStatusBar` | frontend/js/documents.js:15306 |
| `renderDocStorage` | frontend/js/documents.js:3467 |
| `renderDocToolbarState` | frontend/js/documents.js:15251 |
| `renderDocTools` | frontend/js/documents.js:17669 |
| `restoreDocVersionWithUndo` | frontend/js/documents.js:11229 |
| `runDocAiEdit` | frontend/js/documents.js:11470 |
| `runDocReplace` | frontend/js/documents.js:12489 |
| `saveDocument` | frontend/js/documents.js:2021 |
| `scheduleDocFacts` | frontend/js/documents.js:15329 |
| `scheduleDocOutlineSpy` | frontend/js/documents.js:3439 |
| `scheduleDocPreview` | frontend/js/documents.js:3492 |
| `setDocAiProposal` | frontend/js/documents.js:11313 |
| `setDocFocusSidebar` | frontend/js/documents.js:13895 |
| `setDocFocusTools` | frontend/js/documents.js:13865 |
| `setDocGutter` | frontend/js/documents.js:14476 |
| `setDocToolbarCollapsed` | frontend/js/documents.js:14589 |
| `setDocToolbarMode` | frontend/js/documents.js:14410 |
| `setDocView` | frontend/js/documents.js:646 |
| `setDocWidth` | frontend/js/documents.js:13630 |
| `setDocWordGoal` | frontend/js/documents.js:2135 |
| `setNoteSurfaceSource` | frontend/js/documents.js:13257 |
| `shiftDocIndent` | frontend/js/documents.js:10302 |
| `showDocAiResult` | frontend/js/documents.js:11272 |
| `showDocSidebarSection` | frontend/js/documents.js:12533 |
| `showDocTemplatePreview` | frontend/js/documents.js:1951 |
| `showNoDocument` | frontend/js/documents.js:880 |
| `slugify` | frontend/js/documents.js:1677 |
| `syncDocAiPanel` | frontend/js/documents.js:11386 |
| `syncDocFileType` | frontend/js/documents.js:110 |
| `syncDocGutterMetrics` | frontend/js/documents.js:3863 |
| `syncDocScroll` | frontend/js/documents.js:9987 |
| `syncDocToolbarMore` | frontend/js/documents.js:14874 |
| `textareaSurface` | frontend/js/documents.js:398 |
| `toggleDocAiHunk` | frontend/js/documents.js:11356 |
| `toggleDocComment` | frontend/js/documents.js:4162 |
| `toggleDocFindBar` | frontend/js/documents.js:2275 |
| `toggleDocFocus` | frontend/js/documents.js:13918 |
| `toggleDocHistoryDiff` | frontend/js/documents.js:12348 |
| `toggleDocProseDock` | frontend/js/documents.js:17632 |
| `toggleDocToolbar` | frontend/js/documents.js:14623 |
| `toggleDocWidth` | frontend/js/documents.js:13639 |
| `trimDocToolbarGroup` | frontend/js/documents.js:14832 |
| `unlinkDocNoteWithUndo` | frontend/js/documents.js:11172 |
| `useDocTemplate` | frontend/js/documents.js:1869 |
| `watchDocGutter` | frontend/js/documents.js:3891 |
| `watchDocToolbarContents` | frontend/js/documents.js:14959 |
| `watchDocToolbarWidth` | frontend/js/documents.js:14920 |
| `wireDocScrollSync` | frontend/js/documents.js:10038 |
| `wireDocSurfaceScroll` | frontend/js/documents.js:10023 |
| `wireMarkdownToolbar` | frontend/js/documents.js:12853 |
| `wireMdFormatShortcuts` | frontend/js/documents.js:12933 |
| `withDocPreviewShown` | frontend/js/documents.js:3791 |
| `wrapDocSelection` | frontend/js/documents.js:10358 |

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

### frontend/js/first-run.js (8)

| Name | File:line |
|---|---|
| `firstStepButton` | frontend/js/first-run.js:27 |
| `firstStepName` | frontend/js/first-run.js:52 |
| `firstStepsCard` | frontend/js/first-run.js:129 |
| `firstStepsDoor` | frontend/js/first-run.js:118 |
| `firstStepsHide` | frontend/js/first-run.js:124 |
| `firstStepsSample` | frontend/js/first-run.js:87 |
| `firstStepsState` | frontend/js/first-run.js:12 |
| `renderFirstSteps` | frontend/js/first-run.js:186 |

### frontend/js/graph-canvas.js (139)

| Name | File:line |
|---|---|
| `gcArmTouchLasso` | frontend/js/graph-canvas.js:3695 |
| `gcArriving` | frontend/js/graph-canvas.js:5745 |
| `gcArrows` | frontend/js/graph-canvas.js:806 |
| `gcAutoFitDone` | frontend/js/graph-canvas.js:180 |
| `gcBalanceFit` | frontend/js/graph-canvas.js:1514 |
| `gcBornAlpha` | frontend/js/graph-canvas.js:1663 |
| `gcBowPoint` | frontend/js/graph-canvas.js:820 |
| `gcBoxLineCount` | frontend/js/graph-canvas.js:677 |
| `gcCachedPositions` | frontend/js/graph-canvas.js:4499 |
| `gcClampBox` | frontend/js/graph-canvas.js:591 |
| `gcClickNode` | frontend/js/graph-canvas.js:4076 |
| `gcClipEdge` | frontend/js/graph-canvas.js:664 |
| `gcCloseNodeMenu` | frontend/js/graph-canvas.js:3920 |
| `gcCurvedLinks` | frontend/js/graph-canvas.js:775 |
| `gcDraw` | frontend/js/graph-canvas.js:2032 |
| `gcDrawDrift` | frontend/js/graph-canvas.js:2853 |
| `gcDrawEdgeHover` | frontend/js/graph-canvas.js:2866 |
| `gcDrawLabels` | frontend/js/graph-canvas.js:2926 |
| `gcDrawLeaving` | frontend/js/graph-canvas.js:1726 |
| `gcDrawLeavingLines` | frontend/js/graph-canvas.js:1717 |
| `gcDrawNebulae` | frontend/js/graph-canvas.js:1096 |
| `gcDrawPill` | frontend/js/graph-canvas.js:2903 |
| `gcDrawSelection` | frontend/js/graph-canvas.js:3744 |
| `gcDrawTopicHulls` | frontend/js/graph-canvas.js:1137 |
| `gcDrawTrace` | frontend/js/graph-canvas.js:3086 |
| `gcEaseOut` | frontend/js/graph-canvas.js:1751 |
| `gcEdgeAtWorld` | frontend/js/graph-canvas.js:3169 |
| `gcEdgeLook` | frontend/js/graph-canvas.js:843 |
| `gcEdgeStyle` | frontend/js/graph-canvas.js:872 |
| `gcEl` | frontend/js/graph-canvas.js:1928 |
| `gcEnsureCanvas` | frontend/js/graph-canvas.js:913 |
| `gcExportPng` | frontend/js/graph-canvas.js:1979 |
| `gcFadeStep` | frontend/js/graph-canvas.js:1831 |
| `gcFadeToward` | frontend/js/graph-canvas.js:1818 |
| `gcFillSparks` | frontend/js/graph-canvas.js:2833 |
| `gcFilterChip` | frontend/js/graph-canvas.js:1218 |
| `gcFitInsets` | frontend/js/graph-canvas.js:1589 |
| `gcFrameIntro` | frontend/js/graph-canvas.js:4514 |
| `gcGlideFinish` | frontend/js/graph-canvas.js:1873 |
| `gcGlideStep` | frontend/js/graph-canvas.js:1854 |
| `gcHexToRgb` | frontend/js/graph-canvas.js:1001 |
| `gcHideTopic` | frontend/js/graph-canvas.js:1285 |
| `gcHighlight` | frontend/js/graph-canvas.js:1942 |
| `gcHoverChanged` | frontend/js/graph-canvas.js:1759 |
| `gcHoverGrow` | frontend/js/graph-canvas.js:1770 |
| `gcHoverStep` | frontend/js/graph-canvas.js:1778 |
| `gcIsNote` | frontend/js/graph-canvas.js:361 |
| `gcKeyboardId` | frontend/js/graph-canvas.js:192 |
| `gcLabelCut` | frontend/js/graph-canvas.js:3063 |
| `gcLabelPlates` | frontend/js/graph-canvas.js:787 |
| `gcLabelText` | frontend/js/graph-canvas.js:3073 |
| `gcLabelWidth` | frontend/js/graph-canvas.js:3031 |
| `gcLabelZoom` | frontend/js/graph-canvas.js:794 |
| `gcLegendEdgeKey` | frontend/js/graph-canvas.js:5208 |
| `gcLineGrid` | frontend/js/graph-canvas.js:608 |
| `gcLinkKindHidden` | frontend/js/graph-canvas.js:1209 |
| `gcLinkSpark` | frontend/js/graph-canvas.js:2788 |
| `gcLinkWidth` | frontend/js/graph-canvas.js:800 |
| `gcLitAlpha` | frontend/js/graph-canvas.js:1824 |
| `gcMarkLeaving` | frontend/js/graph-canvas.js:1682 |
| `gcMaxDegree` | frontend/js/graph-canvas.js:236 |
| `gcMixRgb` | frontend/js/graph-canvas.js:1017 |
| `gcMs` | frontend/js/graph-canvas.js:321 |
| `gcNodeAtWorld` | frontend/js/graph-canvas.js:3145 |
| `gcNodeSprite` | frontend/js/graph-canvas.js:1042 |
| `gcOpenTopic` | frontend/js/graph-canvas.js:1486 |
| `gcPaintCore` | frontend/js/graph-canvas.js:1020 |
| `gcPlaceLabels` | frontend/js/graph-canvas.js:466 |
| `gcPlacePill` | frontend/js/graph-canvas.js:724 |
| `gcPlateAtWorld` | frontend/js/graph-canvas.js:1458 |
| `gcPlateTitle` | frontend/js/graph-canvas.js:1465 |
| `gcPointInPolygon` | frontend/js/graph-canvas.js:3674 |
| `gcPositionsSig` | frontend/js/graph-canvas.js:4484 |
| `gcPost` | frontend/js/graph-canvas.js:4130 |
| `gcPruneSimilarity` | frontend/js/graph-canvas.js:409 |
| `gcQuadAt` | frontend/js/graph-canvas.js:2778 |
| `gcRadius` | frontend/js/graph-canvas.js:248 |
| `gcReadTokens` | frontend/js/graph-canvas.js:300 |
| `gcRefitForPanels` | frontend/js/graph-canvas.js:1619 |
| `gcRelinkPairs` | frontend/js/graph-canvas.js:5725 |
| `gcRenameTopicInline` | frontend/js/graph-canvas.js:1393 |
| `gcRenderFilterChips` | frontend/js/graph-canvas.js:1230 |
| `gcRequestDraw` | frontend/js/graph-canvas.js:1889 |
| `gcRequestMinimapFrame` | frontend/js/graph-canvas.js:1910 |
| `gcReshuffle` | frontend/js/graph-canvas.js:4183 |
| `gcResize` | frontend/js/graph-canvas.js:885 |
| `gcReveal` | frontend/js/graph-canvas.js:5753 |
| `gcRuleDomain` | frontend/js/graph-canvas.js:5013 |
| `gcRuleKey` | frontend/js/graph-canvas.js:4995 |
| `gcRuleScale` | frontend/js/graph-canvas.js:5019 |
| `gcSavePositions` | frontend/js/graph-canvas.js:4487 |
| `gcSaveTopicName` | frontend/js/graph-canvas.js:1370 |
| `gcSeedBesideNeighbours` | frontend/js/graph-canvas.js:4634 |
| `gcSelectedNodes` | frontend/js/graph-canvas.js:3787 |
| `gcSelectionChanged` | frontend/js/graph-canvas.js:3777 |
| `gcSetAutoFitDone` | frontend/js/graph-canvas.js:184 |
| `gcSetHovered` | frontend/js/graph-canvas.js:196 |
| `gcShape` | frontend/js/graph-canvas.js:4166 |
| `gcShowEmpty` | frontend/js/graph-canvas.js:4580 |
| `gcShowEveryNote` | frontend/js/graph-canvas.js:4609 |
| `gcShowNodeMenu` | frontend/js/graph-canvas.js:3977 |
| `gcShowTopic` | frontend/js/graph-canvas.js:1291 |
| `gcSimilarityBand` | frontend/js/graph-canvas.js:452 |
| `gcSimilarityCutoff` | frontend/js/graph-canvas.js:754 |
| `gcSmooth` | frontend/js/graph-canvas.js:1813 |
| `gcStartWorker` | frontend/js/graph-canvas.js:4209 |
| `gcStill` | frontend/js/graph-canvas.js:331 |
| `gcStop` | frontend/js/graph-canvas.js:4134 |
| `gcSurface` | frontend/js/graph-canvas.js:43 |
| `gcTogglePin` | frontend/js/graph-canvas.js:3651 |
| `gcTooltip` | frontend/js/graph-canvas.js:4035 |
| `gcTooltipMatches` | frontend/js/graph-canvas.js:4060 |
| `gcTopicColour` | frontend/js/graph-canvas.js:1493 |
| `gcTopicCore` | frontend/js/graph-canvas.js:1480 |
| `gcTopicMembers` | frontend/js/graph-canvas.js:1473 |
| `gcTreeIndex` | frontend/js/graph-canvas.js:3131 |
| `gcTweenFromPrior` | frontend/js/graph-canvas.js:1633 |
| `gcUnlinkPairs` | frontend/js/graph-canvas.js:5718 |
| `gcVisibleAtTime` | frontend/js/graph-canvas.js:1966 |
| `gcWireInteraction` | frontend/js/graph-canvas.js:3211 |
| `gcWireLasso` | frontend/js/graph-canvas.js:3710 |
| `gcWireNodeMenu` | frontend/js/graph-canvas.js:3924 |
| `gcWireSelectionDock` | frontend/js/graph-canvas.js:3791 |
| `gcWorkerParams` | frontend/js/graph-canvas.js:4141 |
| `gcWorldFor` | frontend/js/graph-canvas.js:4531 |
| `gcWorldPoint` | frontend/js/graph-canvas.js:3155 |
| `gcWriteUnresolved` | frontend/js/graph-canvas.js:4114 |
| `graphPaneColour` | frontend/js/graph-canvas.js:5510 |
| `graphPaneDocumentNote` | frontend/js/graph-canvas.js:5646 |
| `graphPaneEnsure` | frontend/js/graph-canvas.js:5488 |
| `graphPaneFollow` | frontend/js/graph-canvas.js:5600 |
| `graphPaneWire` | frontend/js/graph-canvas.js:5655 |
| `graphRenderLegend` | frontend/js/graph-canvas.js:5036 |
| `graphRenderStats` | frontend/js/graph-canvas.js:5248 |
| `graphSyncLayoutChip` | frontend/js/graph-canvas.js:5288 |
| `graphSyncTimeSlider` | frontend/js/graph-canvas.js:5315 |
| `graphWireTimePlay` | frontend/js/graph-canvas.js:5354 |
| `renderGraphCanvas` | frontend/js/graph-canvas.js:4665 |
| `renderGraphPane` | frontend/js/graph-canvas.js:5516 |

### frontend/js/graph-worker.js (52)

| Name | File:line |
|---|---|
| `KIND_LENGTH` | frontend/js/graph-worker.js:332 |
| `alphaDecayFor` | frontend/js/graph-worker.js:143 |
| `applyForces` | frontend/js/graph-worker.js:1344 |
| `applyGrouping` | frontend/js/graph-worker.js:1290 |
| `bridgeGroup` | frontend/js/graph-worker.js:592 |
| `centreScale` | frontend/js/graph-worker.js:391 |
| `clampToWorld` | frontend/js/graph-worker.js:1416 |
| `clearCurve` | frontend/js/graph-worker.js:1034 |
| `clearNearest` | frontend/js/graph-worker.js:1061 |
| `clearPush` | frontend/js/graph-worker.js:1082 |
| `clearanceForce` | frontend/js/graph-worker.js:1113 |
| `clustered` | frontend/js/graph-worker.js:580 |
| `collidePadFor` | frontend/js/graph-worker.js:289 |
| `crossStrength` | frontend/js/graph-worker.js:357 |
| `densityScale` | frontend/js/graph-worker.js:367 |
| `dragHeat` | frontend/js/graph-worker.js:164 |
| `ellipseWalk` | frontend/js/graph-worker.js:679 |
| `groupAnchors` | frontend/js/graph-worker.js:739 |
| `groupAnchorsOrganic` | frontend/js/graph-worker.js:723 |
| `groupCohesion` | frontend/js/graph-worker.js:486 |
| `groupDiscs` | frontend/js/graph-worker.js:668 |
| `groupGather` | frontend/js/graph-worker.js:497 |
| `groupOrder` | frontend/js/graph-worker.js:517 |
| `groupingOn` | frontend/js/graph-worker.js:1284 |
| `hubForce` | frontend/js/graph-worker.js:1172 |
| `introCancel` | frontend/js/graph-worker.js:267 |
| `introPick` | frontend/js/graph-worker.js:211 |
| `introSnapshot` | frontend/js/graph-worker.js:218 |
| `introStep` | frontend/js/graph-worker.js:259 |
| `leafForce` | frontend/js/graph-worker.js:1246 |
| `linkStrength` | frontend/js/graph-worker.js:360 |
| `loop` | frontend/js/graph-worker.js:1465 |
| `orbitForce` | frontend/js/graph-worker.js:997 |
| `orbitRadiusAt` | frontend/js/graph-worker.js:866 |
| `orbitReach` | frontend/js/graph-worker.js:833 |
| `orbitUpdate` | frontend/js/graph-worker.js:939 |
| `orbitUpdateGrouped` | frontend/js/graph-worker.js:885 |
| `portraitPull` | frontend/js/graph-worker.js:448 |
| `post` | frontend/js/graph-worker.js:1425 |
| `releaseDropped` | frontend/js/graph-worker.js:77 |
| `reshuffle` | frontend/js/graph-worker.js:1374 |
| `rimOffset` | frontend/js/graph-worker.js:1198 |
| `ringFor` | frontend/js/graph-worker.js:705 |
| `run` | frontend/js/graph-worker.js:1535 |
| `seededRandom` | frontend/js/graph-worker.js:615 |
| `setRingSeed` | frontend/js/graph-worker.js:626 |
| `shapeForce` | frontend/js/graph-worker.js:1220 |
| `shuffleStep` | frontend/js/graph-worker.js:1400 |
| `smallSpread` | frontend/js/graph-worker.js:381 |
| `stopLoop` | frontend/js/graph-worker.js:1454 |
| `tuning` | frontend/js/graph-worker.js:401 |
| `warmLayout` | frontend/js/graph-worker.js:229 |

### frontend/js/graph.js (117)

| Name | File:line |
|---|---|
| `applyGraphHighlight` | frontend/js/graph.js:3471 |
| `arcPath` | frontend/js/graph.js:454 |
| `askLinkDetails` | frontend/js/graph.js:1353 |
| `clearGraphKeyboardFocus` | frontend/js/graph.js:4556 |
| `clearTrace` | frontend/js/graph.js:821 |
| `closeGraphLinkPeek` | frontend/js/graph.js:3723 |
| `closeGraphNewNote` | frontend/js/graph.js:4641 |
| `closeGraphPopup` | frontend/js/graph.js:4542 |
| `drawTrace` | frontend/js/graph.js:1202 |
| `exportGraphPng` | frontend/js/graph.js:4774 |
| `fillTracePickers` | frontend/js/graph.js:629 |
| `fitGraphToView` | frontend/js/graph.js:3374 |
| `focusGraphNode` | frontend/js/graph.js:3138 |
| `frameTree` | frontend/js/graph.js:473 |
| `graphApplySettings` | frontend/js/graph.js:5979 |
| `graphApplyView` | frontend/js/graph.js:5511 |
| `graphCalmScheme` | frontend/js/graph.js:1749 |
| `graphCaptureSettings` | frontend/js/graph.js:5948 |
| `graphCaptureView` | frontend/js/graph.js:5457 |
| `graphCategoryScale` | frontend/js/graph.js:1759 |
| `graphCloseOtherMenus` | frontend/js/graph.js:5715 |
| `graphColourMode` | frontend/js/graph.js:1568 |
| `graphControlsSheetParts` | frontend/js/graph.js:6054 |
| `graphEndpoint` | frontend/js/graph.js:1793 |
| `graphFill` | frontend/js/graph.js:1819 |
| `graphFitFrame` | frontend/js/graph.js:3351 |
| `graphGlideMs` | frontend/js/graph.js:5147 |
| `graphGroupColour` | frontend/js/graph.js:1599 |
| `graphGroupNode` | frontend/js/graph.js:212 |
| `graphGroups` | frontend/js/graph.js:1584 |
| `graphInlineComputedStyle` | frontend/js/graph.js:4720 |
| `graphLayout` | frontend/js/graph.js:133 |
| `graphLayoutIsComputed` | frontend/js/graph.js:157 |
| `graphLinkKind` | frontend/js/graph.js:3730 |
| `graphLocalQuery` | frontend/js/graph.js:1784 |
| `graphMinimapCanShow` | frontend/js/graph.js:4936 |
| `graphMinimapChildren` | frontend/js/graph.js:4965 |
| `graphMinimapEdgePairs` | frontend/js/graph.js:4877 |
| `graphMinimapFinite` | frontend/js/graph.js:5158 |
| `graphMinimapFrame` | frontend/js/graph.js:5172 |
| `graphMinimapPaint` | frontend/js/graph.js:4991 |
| `graphMinimapQueuePaint` | frontend/js/graph.js:4943 |
| `graphMinimapSet` | frontend/js/graph.js:4984 |
| `graphMinimapShown` | frontend/js/graph.js:4914 |
| `graphNeighbourInDirection` | frontend/js/graph.js:3117 |
| `graphNodeById` | frontend/js/graph.js:3110 |
| `graphNodeLabel` | frontend/js/graph.js:3836 |
| `graphNodeRadius` | frontend/js/graph.js:101 |
| `graphNodeScreenPoint` | frontend/js/graph.js:3162 |
| `graphNodeUnder` | frontend/js/graph.js:1314 |
| `graphPopupActionList` | frontend/js/graph.js:4311 |
| `graphPopupFileCard` | frontend/js/graph.js:4016 |
| `graphPopupMediaRefs` | frontend/js/graph.js:3993 |
| `graphQueryMatch` | frontend/js/graph.js:3464 |
| `graphRasterizeSvg` | frontend/js/graph.js:4731 |
| `graphReadPhrase` | frontend/js/graph.js:3449 |
| `graphRemoveLink` | frontend/js/graph.js:3678 |
| `graphRenderGroups` | frontend/js/graph.js:1621 |
| `graphRenderer` | frontend/js/graph.js:1730 |
| `graphResetToDefaults` | frontend/js/graph.js:6011 |
| `graphResolveGroups` | frontend/js/graph.js:1606 |
| `graphRestoreSwitches` | frontend/js/graph.js:5648 |
| `graphSaveCurrentView` | frontend/js/graph.js:5501 |
| `graphSavedViews` | frontend/js/graph.js:5448 |
| `graphSetGroups` | frontend/js/graph.js:1593 |
| `graphSettingsEqual` | frontend/js/graph.js:5968 |
| `graphShowNote` | frontend/js/graph.js:4127 |
| `graphSizeMode` | frontend/js/graph.js:1531 |
| `graphSizeRadius` | frontend/js/graph.js:1536 |
| `graphSyncFocusChip` | frontend/js/graph.js:1693 |
| `graphSyncSimilarityRow` | frontend/js/graph.js:5852 |
| `graphTopicFor` | frontend/js/graph.js:4183 |
| `graphZoomBy` | frontend/js/graph.js:5729 |
| `hierarchyPath` | frontend/js/graph.js:436 |
| `initGraphDockHeightToken` | frontend/js/graph.js:5259 |
| `initGraphGroups` | frontend/js/graph.js:1655 |
| `initGraphKeyboard` | frontend/js/graph.js:3180 |
| `initGraphMinimap` | frontend/js/graph.js:5277 |
| `initGraphViews` | frontend/js/graph.js:5605 |
| `layoutHierarchy` | frontend/js/graph.js:306 |
| `linkByDrop` | frontend/js/graph.js:1462 |
| `openGraphControlsSheet` | frontend/js/graph.js:6070 |
| `openGraphLinkPanel` | frontend/js/graph.js:3851 |
| `openGraphLinkPeek` | frontend/js/graph.js:3738 |
| `openGraphNewNote` | frontend/js/graph.js:4610 |
| `openGraphPopup` | frontend/js/graph.js:3584 |
| `pickTraceEnd` | frontend/js/graph.js:705 |
| `placeGraphPopup` | frontend/js/graph.js:4075 |
| `positionTraceLines` | frontend/js/graph.js:1186 |
| `radialFlip` | frontend/js/graph.js:268 |
| `radialRings` | frontend/js/graph.js:277 |
| `renderGraph` | frontend/js/graph.js:1767 |
| `renderGraphPopupActions` | frontend/js/graph.js:4464 |
| `renderGraphPopupHeader` | frontend/js/graph.js:3551 |
| `renderGraphPopupInfo` | frontend/js/graph.js:4248 |
| `renderGraphPopupMedia` | frontend/js/graph.js:4020 |
| `renderGraphPopupProps` | frontend/js/graph.js:4220 |
| `renderGraphPopupTopic` | frontend/js/graph.js:4158 |
| `renderGraphSvg` | frontend/js/graph.js:1842 |
| `renderGraphViews` | frontend/js/graph.js:5575 |
| `renderTraceReadout` | frontend/js/graph.js:1017 |
| `renderTraceState` | frontend/js/graph.js:733 |
| `replyLoops` | frontend/js/graph.js:297 |
| `runTrace` | frontend/js/graph.js:847 |
| `saveGraphNewNote` | frontend/js/graph.js:4646 |
| `saveGraphPopup` | frontend/js/graph.js:4571 |
| `selectTraceRoute` | frontend/js/graph.js:916 |
| `setGraphPhysicsEnabled` | frontend/js/graph.js:165 |
| `setTraceEnd` | frontend/js/graph.js:790 |
| `setTracePanelOpen` | frontend/js/graph.js:636 |
| `showTopicInGraph` | frontend/js/graph.js:4202 |
| `showTraceMessage` | frontend/js/graph.js:813 |
| `storyPrompt` | frontend/js/graph.js:1004 |
| `syncGraphPopupSave` | frontend/js/graph.js:3667 |
| `toggleGraphFullscreen` | frontend/js/graph.js:5744 |
| `traceLabel` | frontend/js/graph.js:726 |
| `tracePath` | frontend/js/graph.js:1172 |

### frontend/js/harper-worker.js (3)

| Name | File:line |
|---|---|
| `dialectOf` | frontend/js/harper-worker.js:47 |
| `linterFor` | frontend/js/harper-worker.js:51 |
| `suggestionOf` | frontend/js/harper-worker.js:69 |

### frontend/js/help-chat.js (22)

| Name | File:line |
|---|---|
| `askAtlas` | frontend/js/help-chat.js:726 |
| `assistantHeadRow` | frontend/js/help-chat.js:874 |
| `atlasStartersFor` | frontend/js/help-chat.js:859 |
| `guideFirstControl` | frontend/js/help-chat.js:134 |
| `guideLand` | frontend/js/help-chat.js:139 |
| `guideOnScreen` | frontend/js/help-chat.js:129 |
| `guideShown` | frontend/js/help-chat.js:116 |
| `helpChatAppendRow` | frontend/js/help-chat.js:69 |
| `helpChatIsNearBottom` | frontend/js/help-chat.js:63 |
| `helpChatNewChat` | frontend/js/help-chat.js:617 |
| `helpChatOnScreenHelp` | frontend/js/help-chat.js:287 |
| `helpChatOpenButton` | frontend/js/help-chat.js:88 |
| `helpChatReveal` | frontend/js/help-chat.js:573 |
| `helpChatSetBusy` | frontend/js/help-chat.js:325 |
| `helpChatStop` | frontend/js/help-chat.js:346 |
| `helpChatStreamTurn` | frontend/js/help-chat.js:459 |
| `openHelpChat` | frontend/js/help-chat.js:757 |
| `renderAtlasStarters` | frontend/js/help-chat.js:673 |
| `renderHelpChatGreeting` | frontend/js/help-chat.js:706 |
| `renderHelpChatMenu` | frontend/js/help-chat.js:634 |
| `renderHelpChatMessage` | frontend/js/help-chat.js:166 |
| `submitHelpChatQuestion` | frontend/js/help-chat.js:351 |

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

### frontend/js/lan-watch.js (5)

| Name | File:line |
|---|---|
| `lanAnswerDevice` | frontend/js/lan-watch.js:53 |
| `lanNoticeDevice` | frontend/js/lan-watch.js:63 |
| `lanNoticeHeld` | frontend/js/lan-watch.js:87 |
| `lanWatch` | frontend/js/lan-watch.js:32 |
| `lanWatchOnce` | frontend/js/lan-watch.js:16 |

### frontend/js/library.js (245)

| Name | File:line |
|---|---|
| `activityDetailText` | frontend/js/library.js:1248 |
| `activitySettingValue` | frontend/js/library.js:1232 |
| `allBookmarkGroups` | frontend/js/library.js:10723 |
| `analyseMediaRow` | frontend/js/library.js:7847 |
| `applyLibraryMediaView` | frontend/js/library.js:3526 |
| `attachBoardTick` | frontend/js/library.js:10398 |
| `binRoutes` | frontend/js/library.js:1024 |
| `bookmarkAddress` | frontend/js/library.js:3732 |
| `bookmarkRow` | frontend/js/library.js:11092 |
| `bookmarkSiteSection` | frontend/js/library.js:11055 |
| `bookmarkSort` | frontend/js/library.js:10982 |
| `buildFileReadingSummary` | frontend/js/library.js:8005 |
| `bulkDeleteLibraryBoards` | frontend/js/library.js:10437 |
| `bulkDeleteLibraryLinks` | frontend/js/library.js:10640 |
| `bulkDeleteLibraryMedia` | frontend/js/library.js:8136 |
| `bulkMoveLibraryLinks` | frontend/js/library.js:10667 |
| `bulkUpdateLibraryLinks` | frontend/js/library.js:10650 |
| `clearLibraryBoardsSelection` | frontend/js/library.js:10429 |
| `clearLibraryLinksSelection` | frontend/js/library.js:10588 |
| `clearLibraryMediaSelection` | frontend/js/library.js:8130 |
| `closeBinnedReader` | frontend/js/library.js:1616 |
| `closeOcrWorkspace` | frontend/js/library.js:5307 |
| `contentsBuildSection` | frontend/js/library.js:11823 |
| `contentsDocRow` | frontend/js/library.js:11736 |
| `contentsGlyph` | frontend/js/library.js:11671 |
| `contentsGroupMark` | frontend/js/library.js:11807 |
| `contentsGroups` | frontend/js/library.js:11515 |
| `contentsMonthKey` | frontend/js/library.js:11508 |
| `contentsNoteFacts` | frontend/js/library.js:11698 |
| `contentsNoteMark` | frontend/js/library.js:11678 |
| `contentsNoteName` | frontend/js/library.js:11611 |
| `contentsNoteRow` | frontend/js/library.js:11710 |
| `contentsOpenDocument` | frontend/js/library.js:11629 |
| `contentsOrderedKeys` | frontend/js/library.js:11584 |
| `contentsRenameTopic` | frontend/js/library.js:11898 |
| `contentsRowBody` | frontend/js/library.js:11658 |
| `contentsSectionLabel` | frontend/js/library.js:11564 |
| `contentsSetAll` | frontend/js/library.js:12099 |
| `contentsTopicNames` | frontend/js/library.js:11573 |
| `contentsTreeItem` | frontend/js/library.js:11644 |
| `contentsTreeKeys` | frontend/js/library.js:12114 |
| `contentsWireTopicHeading` | frontend/js/library.js:11872 |
| `createLibrarySelectbar` | frontend/js/library.js:10333 |
| `deleteBookmarkGroup` | frontend/js/library.js:10759 |
| `deleteBookmarksWithUndo` | frontend/js/library.js:10599 |
| `deleteSkillWithUndo` | frontend/js/library.js:2477 |
| `duplicateSkill` | frontend/js/library.js:2449 |
| `emptyBookmarkGroups` | frontend/js/library.js:10700 |
| `ensureLibraryGridStop` | frontend/js/library.js:1484 |
| `fetchAllBookmarks` | frontend/js/library.js:10550 |
| `fileMetaLine` | frontend/js/library.js:3713 |
| `filterBookmarks` | frontend/js/library.js:10997 |
| `filterLibraryImagesGallery` | frontend/js/library.js:8388 |
| `flashLibraryItem` | frontend/js/library.js:1660 |
| `focusLibraryFile` | frontend/js/library.js:3660 |
| `importLibraryDocuments` | frontend/js/library.js:3072 |
| `isImageUrl` | frontend/js/library.js:3488 |
| `keepLibraryScroll` | frontend/js/library.js:1143 |
| `libraryActions` | frontend/js/library.js:754 |
| `libraryBackgroundRun` | frontend/js/library.js:3885 |
| `libraryCard` | frontend/js/library.js:1266 |
| `libraryColumnCount` | frontend/js/library.js:449 |
| `libraryCopyActions` | frontend/js/library.js:715 |
| `libraryDocSort` | frontend/js/library.js:3048 |
| `libraryDocsMatchesProperty` | frontend/js/library.js:2969 |
| `libraryDocsPropertyOptions` | frontend/js/library.js:2954 |
| `libraryImageOrigin` | frontend/js/library.js:8321 |
| `libraryImagesFingerprint` | frontend/js/library.js:3443 |
| `libraryKeyOf` | frontend/js/library.js:186 |
| `libraryLightboxItems` | frontend/js/library.js:7949 |
| `libraryMediaSort` | frontend/js/library.js:8278 |
| `librarySelectedItems` | frontend/js/library.js:1101 |
| `librarySorted` | frontend/js/library.js:361 |
| `libraryTitleAndPreview` | frontend/js/library.js:1184 |
| `libraryView` | frontend/js/library.js:182 |
| `linkNoteFromLibrary` | frontend/js/library.js:1045 |
| `loadLibrary` | frontend/js/library.js:202 |
| `manageBookmarkGroups` | frontend/js/library.js:10785 |
| `mediaFileIcon` | frontend/js/library.js:3674 |
| `mediaFileKind` | frontend/js/library.js:3756 |
| `mediaHasBeenRead` | frontend/js/library.js:7875 |
| `mediaReading` | frontend/js/library.js:7871 |
| `mediaReadingBadge` | frontend/js/library.js:7883 |
| `mediaReadingSummary` | frontend/js/library.js:7912 |
| `mediaRowDeleteEndpoint` | frontend/js/library.js:8116 |
| `mediaRowKey` | frontend/js/library.js:8109 |
| `metaLine` | frontend/js/library.js:3696 |
| `newBookmarkGroup` | frontend/js/library.js:10763 |
| `noteAnyImage` | frontend/js/library.js:12267 |
| `ocrAllText` | frontend/js/library.js:7163 |
| `ocrApplyFind` | frontend/js/library.js:6539 |
| `ocrApplyZoom` | frontend/js/library.js:5831 |
| `ocrAskRange` | frontend/js/library.js:7056 |
| `ocrBase` | frontend/js/library.js:7766 |
| `ocrBinField` | frontend/js/library.js:7822 |
| `ocrBinPage` | frontend/js/library.js:7817 |
| `ocrBuildPageRail` | frontend/js/library.js:5239 |
| `ocrBuildScrollPages` | frontend/js/library.js:6048 |
| `ocrCan` | frontend/js/library.js:6390 |
| `ocrCanOpen` | frontend/js/library.js:5450 |
| `ocrChooseReader` | frontend/js/library.js:6426 |
| `ocrCleanLoops` | frontend/js/library.js:7830 |
| `ocrClearRegionSelection` | frontend/js/library.js:4592 |
| `ocrCloseEdit` | frontend/js/library.js:7157 |
| `ocrDockApply` | frontend/js/library.js:6861 |
| `ocrDockFits` | frontend/js/library.js:6837 |
| `ocrDocumentReading` | frontend/js/library.js:4884 |
| `ocrFetchFileText` | frontend/js/library.js:5457 |
| `ocrFieldText` | frontend/js/library.js:7781 |
| `ocrFillPageCaptions` | frontend/js/library.js:4973 |
| `ocrFindMarkRegion` | frontend/js/library.js:6516 |
| `ocrFindShowCurrent` | frontend/js/library.js:6566 |
| `ocrFindStep` | frontend/js/library.js:6595 |
| `ocrFitDock` | frontend/js/library.js:6871 |
| `ocrFitLiveText` | frontend/js/library.js:4082 |
| `ocrFitStage` | frontend/js/library.js:5727 |
| `ocrIsLocal` | frontend/js/library.js:6383 |
| `ocrIsPdf` | frontend/js/library.js:3822 |
| `ocrIsTextFile` | frontend/js/library.js:5443 |
| `ocrKeepCentre` | frontend/js/library.js:5914 |
| `ocrLiveTextSelection` | frontend/js/library.js:4099 |
| `ocrLoadPage` | frontend/js/library.js:4984 |
| `ocrLoadReaders` | frontend/js/library.js:6174 |
| `ocrLoadReadersNow` | frontend/js/library.js:6179 |
| `ocrLoadSiblings` | frontend/js/library.js:5410 |
| `ocrLocalName` | frontend/js/library.js:6399 |
| `ocrMoveOverlays` | frontend/js/library.js:4584 |
| `ocrNaturalScale` | frontend/js/library.js:5827 |
| `ocrOfferBinUndo` | frontend/js/library.js:7801 |
| `ocrOfferTextUndo` | frontend/js/library.js:7795 |
| `ocrOpenEdit` | frontend/js/library.js:7147 |
| `ocrOpenReaderSettings` | frontend/js/library.js:6986 |
| `ocrOpenSibling` | frontend/js/library.js:5604 |
| `ocrPageImageUrl` | frontend/js/library.js:3845 |
| `ocrPaintCaption` | frontend/js/library.js:4950 |
| `ocrPaintEmpty` | frontend/js/library.js:7075 |
| `ocrPaintLiveText` | frontend/js/library.js:4056 |
| `ocrPaintRegionRect` | frontend/js/library.js:4602 |
| `ocrPlaceRegionPopover` | frontend/js/library.js:4619 |
| `ocrRailKey` | frontend/js/library.js:5289 |
| `ocrReadImage` | frontend/js/library.js:6607 |
| `ocrReadInFlight` | frontend/js/library.js:3927 |
| `ocrReadMenuItems` | frontend/js/library.js:7001 |
| `ocrReadRange` | frontend/js/library.js:6741 |
| `ocrReader` | frontend/js/library.js:6376 |
| `ocrReaderName` | frontend/js/library.js:6414 |
| `ocrReaderNameFor` | frontend/js/library.js:6403 |
| `ocrRefusedPress` | frontend/js/library.js:6368 |
| `ocrRegionCrop` | frontend/js/library.js:4683 |
| `ocrRegionPage` | frontend/js/library.js:6457 |
| `ocrRegionPoint` | frontend/js/library.js:4667 |
| `ocrRegionsUrl` | frontend/js/library.js:3826 |
| `ocrRenderOtherReadings` | frontend/js/library.js:3977 |
| `ocrRenderRail` | frontend/js/library.js:5555 |
| `ocrRenderRailSwitch` | frontend/js/library.js:5471 |
| `ocrRenderRegions` | frontend/js/library.js:4120 |
| `ocrRepaintReading` | frontend/js/library.js:7770 |
| `ocrRevealRegionsForPage` | frontend/js/library.js:6485 |
| `ocrRoveKeys` | frontend/js/library.js:7118 |
| `ocrRoveSync` | frontend/js/library.js:7109 |
| `ocrRunRegion` | frontend/js/library.js:4781 |
| `ocrScheduleFitDock` | frontend/js/library.js:6912 |
| `ocrScrollToPage` | frontend/js/library.js:6107 |
| `ocrSelectImage` | frontend/js/library.js:4576 |
| `ocrSelectRegion` | frontend/js/library.js:3954 |
| `ocrSelectStage` | frontend/js/library.js:4572 |
| `ocrSetViewMode` | frontend/js/library.js:5985 |
| `ocrSetZoom` | frontend/js/library.js:6991 |
| `ocrShowRegionResult` | frontend/js/library.js:4704 |
| `ocrShownZoom` | frontend/js/library.js:5869 |
| `ocrSizeStage` | frontend/js/library.js:5744 |
| `ocrStageRead` | frontend/js/library.js:7051 |
| `ocrStepPage` | frontend/js/library.js:6142 |
| `ocrStepZoom` | frontend/js/library.js:5897 |
| `ocrStopRead` | frontend/js/library.js:3934 |
| `ocrStoredPageReads` | frontend/js/library.js:4853 |
| `ocrStoredViewMode` | frontend/js/library.js:5960 |
| `ocrSyncCanRead` | frontend/js/library.js:6346 |
| `ocrSyncMoreMenu` | frontend/js/library.js:6674 |
| `ocrSyncPager` | frontend/js/library.js:6121 |
| `ocrSyncReadMenu` | frontend/js/library.js:7022 |
| `ocrSyncReaderButton` | frontend/js/library.js:6298 |
| `ocrSyncStopButton` | frontend/js/library.js:3944 |
| `ocrSyncToolsMenu` | frontend/js/library.js:6933 |
| `ocrSyncViewButtons` | frontend/js/library.js:5974 |
| `ocrSyncZoomButtons` | frontend/js/library.js:5928 |
| `ocrTearDownScroll` | frontend/js/library.js:6030 |
| `ocrTextWriter` | frontend/js/library.js:7788 |
| `ocrVisibleStages` | frontend/js/library.js:5734 |
| `ocrWatchDock` | frontend/js/library.js:6919 |
| `ocrWatchPane` | frontend/js/library.js:5793 |
| `ocrWatchScroll` | frontend/js/library.js:6082 |
| `ocrWireRegionJump` | frontend/js/library.js:6465 |
| `ocrZoomAbout` | frontend/js/library.js:5881 |
| `openBinnedNote` | frontend/js/library.js:1587 |
| `openLibraryCreatePicker` | frontend/js/library.js:2093 |
| `openLibraryItem` | frontend/js/library.js:1504 |
| `openOcrWorkspace` | frontend/js/library.js:5636 |
| `openPageReader` | frontend/js/library.js:5353 |
| `refreshLibraryPhrase` | frontend/js/library.js:1739 |
| `refreshLibrarySemantic` | frontend/js/library.js:408 |
| `refreshLibraryServerSearch` | frontend/js/library.js:1713 |
| `remindAbout` | frontend/js/library.js:12240 |
| `renameBookmarkGroup` | frontend/js/library.js:10735 |
| `renderBookmarkGroupChips` | frontend/js/library.js:10889 |
| `renderBookmarks` | frontend/js/library.js:10561 |
| `renderContents` | frontend/js/library.js:11948 |
| `renderLibrary` | frontend/js/library.js:482 |
| `renderLibraryContextBars` | frontend/js/library.js:1063 |
| `renderLibraryDocsPropertyFilter` | frontend/js/library.js:2986 |
| `renderLibraryDocuments` | frontend/js/library.js:3110 |
| `renderLibraryFilters` | frontend/js/library.js:289 |
| `renderLibraryImageOrigins` | frontend/js/library.js:8339 |
| `renderLibraryImagesGallery` | frontend/js/library.js:8170 |
| `renderLibraryOverview` | frontend/js/library.js:267 |
| `renderLibraryView` | frontend/js/library.js:190 |
| `renderSkillCards` | frontend/js/library.js:2524 |
| `renderSkillLogs` | frontend/js/library.js:2779 |
| `renderSkillsDashboard` | frontend/js/library.js:2627 |
| `reopenOcrWorkspace` | frontend/js/library.js:5326 |
| `runLibrarySearch` | frontend/js/library.js:1752 |
| `setEmptyBookmarkGroups` | frontend/js/library.js:10711 |
| `setLibraryCardStop` | frontend/js/library.js:1480 |
| `setLibraryMediaKind` | frontend/js/library.js:3598 |
| `setLibraryMediaView` | frontend/js/library.js:3556 |
| `showDetailDialog` | frontend/js/library.js:12191 |
| `shownTicksIn` | frontend/js/library.js:10302 |
| `skillCard` | frontend/js/library.js:2240 |
| `skillColumnCount` | frontend/js/library.js:2503 |
| `skillLastRunIndex` | frontend/js/library.js:2229 |
| `skillSort` | frontend/js/library.js:2436 |
| `startLibraryImagesPoll` | frontend/js/library.js:3465 |
| `stopLibraryImagesPoll` | frontend/js/library.js:3474 |
| `syncLibraryBoardsTicks` | frontend/js/library.js:10384 |
| `syncLibraryDocsSelectbar` | frontend/js/library.js:3371 |
| `syncLibraryFilterButton` | frontend/js/library.js:1789 |
| `syncLibraryMediaSelectbar` | frontend/js/library.js:8121 |
| `syncSelectAllLabels` | frontend/js/library.js:10306 |
| `syncSelectbarCount` | frontend/js/library.js:10279 |
| `toggleLibrarySelection` | frontend/js/library.js:1105 |
| `trackOcrRead` | frontend/js/library.js:3896 |
| `updateLibraryCreateButton` | frontend/js/library.js:2178 |
| `watchLibraryColumns` | frontend/js/library.js:468 |
| `watchSkillColumns` | frontend/js/library.js:2514 |
| `withLibraryCopyActions` | frontend/js/library.js:734 |

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

### frontend/js/manual.js (7)

| Name | File:line |
|---|---|
| `manualBuild` | frontend/js/manual.js:75 |
| `manualByName` | frontend/js/manual.js:35 |
| `manualFilter` | frontend/js/manual.js:119 |
| `manualMatches` | frontend/js/manual.js:28 |
| `manualTopicEl` | frontend/js/manual.js:44 |
| `manualWords` | frontend/js/manual.js:16 |
| `openManual` | frontend/js/manual.js:145 |

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

### frontend/js/meaning.js (18)

| Name | File:line |
|---|---|
| `MEANING_NEAR` | frontend/js/meaning.js:56 |
| `meaningAllowance` | frontend/js/meaning.js:94 |
| `meaningAlts` | frontend/js/meaning.js:132 |
| `meaningAsk` | frontend/js/meaning.js:25 |
| `meaningAt` | frontend/js/meaning.js:183 |
| `meaningCloseness` | frontend/js/meaning.js:201 |
| `meaningDistance` | frontend/js/meaning.js:75 |
| `meaningFold` | frontend/js/meaning.js:108 |
| `meaningGroupOf` | frontend/js/meaning.js:124 |
| `meaningHolds` | frontend/js/meaning.js:193 |
| `meaningMissing` | frontend/js/meaning.js:188 |
| `meaningNamed` | frontend/js/meaning.js:214 |
| `meaningNear` | frontend/js/meaning.js:228 |
| `meaningPattern` | frontend/js/meaning.js:168 |
| `meaningStem` | frontend/js/meaning.js:48 |
| `meaningText` | frontend/js/meaning.js:177 |
| `meaningVocab` | frontend/js/meaning.js:100 |
| `meaningWords` | frontend/js/meaning.js:41 |

### frontend/js/meetings.js (96)

| Name | File:line |
|---|---|
| `addMeetingMarker` | frontend/js/meetings.js:2182 |
| `addRecordingMark` | frontend/js/meetings.js:1775 |
| `binRecording` | frontend/js/meetings.js:1918 |
| `closeMeetingRecorder` | frontend/js/meetings.js:954 |
| `discardMeetingTake` | frontend/js/meetings.js:968 |
| `editRecordingMark` | frontend/js/meetings.js:1790 |
| `enhanceGain` | frontend/js/meetings.js:1197 |
| `enhanceRecording` | frontend/js/meetings.js:1219 |
| `fillMicDevices` | frontend/js/meetings.js:2331 |
| `meetingAcceptOriginal` | frontend/js/meetings.js:1273 |
| `meetingActionRow` | frontend/js/meetings.js:265 |
| `meetingAppendUndoable` | frontend/js/meetings.js:539 |
| `meetingBinPair` | frontend/js/meetings.js:108 |
| `meetingClockText` | frontend/js/meetings.js:625 |
| `meetingContainerName` | frontend/js/meetings.js:638 |
| `meetingCreateUndoable` | frontend/js/meetings.js:558 |
| `meetingElapsedMs` | frontend/js/meetings.js:620 |
| `meetingElapsedText` | frontend/js/meetings.js:633 |
| `meetingEnhanceTake` | frontend/js/meetings.js:1257 |
| `meetingFormRow` | frontend/js/meetings.js:89 |
| `meetingLiveWords` | frontend/js/meetings.js:1067 |
| `meetingLiveWordsStart` | frontend/js/meetings.js:1073 |
| `meetingLiveWordsStop` | frontend/js/meetings.js:1088 |
| `meetingNowValue` | frontend/js/meetings.js:18 |
| `meetingPeaksSummary` | frontend/js/meetings.js:673 |
| `meetingPeopleField` | frontend/js/meetings.js:40 |
| `meetingRecordInto` | frontend/js/meetings.js:573 |
| `meetingRecordingStarted` | frontend/js/meetings.js:1038 |
| `meetingRecordingStopped` | frontend/js/meetings.js:1097 |
| `meetingRemind` | frontend/js/meetings.js:306 |
| `meetingSaveTranscript` | frontend/js/meetings.js:519 |
| `meetingSay` | frontend/js/meetings.js:1033 |
| `meetingShowSaved` | frontend/js/meetings.js:1286 |
| `meetingSummarise` | frontend/js/meetings.js:424 |
| `meetingTakeAppend` | frontend/js/meetings.js:658 |
| `meetingTakeBegin` | frontend/js/meetings.js:642 |
| `meetingTakeDiscard` | frontend/js/meetings.js:1304 |
| `meetingTakeFinish` | frontend/js/meetings.js:684 |
| `meetingTick` | frontend/js/meetings.js:891 |
| `meetingTranscribeTake` | frontend/js/meetings.js:1140 |
| `meetingWhenText` | frontend/js/meetings.js:29 |
| `micControlsInto` | frontend/js/meetings.js:2271 |
| `micLevelInto` | frontend/js/meetings.js:2391 |
| `nameMeetingMic` | frontend/js/meetings.js:2432 |
| `nameRecordingSpeakers` | frontend/js/meetings.js:1899 |
| `noteRecoveredRecordings` | frontend/js/meetings.js:1401 |
| `openLiveCaptionsFrom` | frontend/js/meetings.js:2197 |
| `openMeetingRecorder` | frontend/js/meetings.js:921 |
| `openMeetingSheet` | frontend/js/meetings.js:334 |
| `openNewMeeting` | frontend/js/meetings.js:131 |
| `openRecordingTrim` | frontend/js/meetings.js:2061 |
| `openRecordings` | frontend/js/meetings.js:1438 |
| `openVoiceNote` | frontend/js/meetings.js:938 |
| `playRecordingFrom` | frontend/js/meetings.js:1739 |
| `recordingCardsRun` | frontend/js/meetings.js:2026 |
| `recordingFacts` | frontend/js/meetings.js:1476 |
| `recordingMarksFill` | frontend/js/meetings.js:1714 |
| `recordingMenu` | frontend/js/meetings.js:1880 |
| `recordingPaint` | frontend/js/meetings.js:1673 |
| `recordingReady` | frontend/js/meetings.js:1569 |
| `recordingRow` | frontend/js/meetings.js:1499 |
| `recordingRunLine` | frontend/js/meetings.js:2035 |
| `recordingShowLine` | frontend/js/meetings.js:1749 |
| `recordingSpeed` | frontend/js/meetings.js:1591 |
| `recordingTranscript` | frontend/js/meetings.js:1817 |
| `recordingTranscriptFill` | frontend/js/meetings.js:1833 |
| `recordingTranscriptNow` | frontend/js/meetings.js:1871 |
| `recordingTranscriptState` | frontend/js/meetings.js:1486 |
| `recordingTranscriptionEnded` | frontend/js/meetings.js:2000 |
| `recordingTrimField` | frontend/js/meetings.js:2106 |
| `recordingWav` | frontend/js/meetings.js:2150 |
| `recordingWave` | frontend/js/meetings.js:1610 |
| `recordingsEmpty` | frontend/js/meetings.js:1469 |
| `removeRecordingMark` | frontend/js/meetings.js:1800 |
| `renameRecording` | frontend/js/meetings.js:1909 |
| `renderRecordings` | frontend/js/meetings.js:1452 |
| `resetMeetingUI` | frontend/js/meetings.js:899 |
| `saveMeetingDocument` | frontend/js/meetings.js:1354 |
| `saveMeetingNote` | frontend/js/meetings.js:1390 |
| `saveRecordingMarks` | frontend/js/meetings.js:1762 |
| `saveVoiceNoteText` | frontend/js/meetings.js:1408 |
| `setMeetingState` | frontend/js/meetings.js:851 |
| `showMeetingRecorder` | frontend/js/meetings.js:943 |
| `startMeetingWave` | frontend/js/meetings.js:712 |
| `startRecordingTranscription` | frontend/js/meetings.js:1965 |
| `stopMeetingTimer` | frontend/js/meetings.js:832 |
| `stopMeetingTranscription` | frontend/js/meetings.js:1298 |
| `stopRecordingTranscription` | frontend/js/meetings.js:1972 |
| `syncMicSelects` | frontend/js/meetings.js:2343 |
| `syncRecordingDock` | frontend/js/meetings.js:876 |
| `testMicrophone` | frontend/js/meetings.js:2352 |
| `toggleMeetingPause` | frontend/js/meetings.js:1326 |
| `toggleMeetingRecording` | frontend/js/meetings.js:985 |
| `transcribeRecording` | frontend/js/meetings.js:1934 |
| `trimRecording` | frontend/js/meetings.js:2126 |
| `watchRecordingTranscription` | frontend/js/meetings.js:1981 |

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
| `closeNoteForm` | frontend/js/note-edit-panels.js:585 |
| `forgetNoteEditLocally` | frontend/js/note-edit-panels.js:612 |
| `keepNoteEditLocally` | frontend/js/note-edit-panels.js:608 |
| `noteEditToolbar` | frontend/js/note-edit-panels.js:707 |
| `noteFormParts` | frontend/js/note-edit-panels.js:198 |
| `offerKeptNoteEdit` | frontend/js/note-edit-panels.js:638 |
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

### frontend/js/notifications.js (8)

| Name | File:line |
|---|---|
| `dismissNotification` | frontend/js/notifications.js:307 |
| `noticeLiveValid` | frontend/js/notifications.js:9 |
| `notificationActionButton` | frontend/js/notifications.js:51 |
| `notificationGoes` | frontend/js/notifications.js:42 |
| `openExportsFromNotification` | frontend/js/notifications.js:327 |
| `openNotifications` | frontend/js/notifications.js:89 |
| `runNotificationGo` | frontend/js/notifications.js:28 |
| `setNotificationUnread` | frontend/js/notifications.js:297 |

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
| `closeOnboarding` | frontend/js/onboarding.js:357 |
| `firstRunSurfaceOpen` | frontend/js/onboarding.js:299 |
| `firstRunTurn` | frontend/js/onboarding.js:318 |
| `loadOnboardingDiagnostics` | frontend/js/onboarding.js:68 |
| `maybeShowConsoleViewIntro` | frontend/js/onboarding.js:411 |
| `onboardingBack` | frontend/js/onboarding.js:393 |
| `onboardingNext` | frontend/js/onboarding.js:374 |
| `openOnboarding` | frontend/js/onboarding.js:344 |
| `renderOnboardingActions` | frontend/js/onboarding.js:129 |
| `renderOnboardingSlide` | frontend/js/onboarding.js:227 |
| `showOnboarding` | frontend/js/onboarding.js:349 |
| `showOnboardingTurn` | frontend/js/onboarding.js:327 |
| `whenFirstRunClear` | frontend/js/onboarding.js:311 |

### frontend/js/pick-row.js (3)

| Name | File:line |
|---|---|
| `notePickerRow` | frontend/js/pick-row.js:7 |
| `notePickerThumb` | frontend/js/pick-row.js:64 |
| `updateNotePickerCount` | frontend/js/pick-row.js:79 |

### frontend/js/questions-view.js (7)

| Name | File:line |
|---|---|
| `initQuestionsView` | frontend/js/questions-view.js:149 |
| `loadQuestions` | frontend/js/questions-view.js:73 |
| `questionButton` | frontend/js/questions-view.js:20 |
| `questionRow` | frontend/js/questions-view.js:26 |
| `questionWhen` | frontend/js/questions-view.js:15 |
| `questionsForNote` | frontend/js/questions-view.js:141 |
| `setAskScope` | frontend/js/questions-view.js:183 |

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

### frontend/js/quickadd.js (38)

| Name | File:line |
|---|---|
| `magicAddReminder` | frontend/js/quickadd.js:436 |
| `noteOfferKey` | frontend/js/quickadd.js:602 |
| `noteOfferReplace` | frontend/js/quickadd.js:684 |
| `noteOfferTake` | frontend/js/quickadd.js:706 |
| `noteOffersAttach` | frontend/js/quickadd.js:609 |
| `noteOffersDraw` | frontend/js/quickadd.js:665 |
| `noteOffersFetch` | frontend/js/quickadd.js:636 |
| `noteOffersSchedule` | frontend/js/quickadd.js:631 |
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
| `qaPrewarm` | frontend/js/quickadd.js:546 |
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

### frontend/js/reminder-notify.js (4)

| Name | File:line |
|---|---|
| `announceReminders` | frontend/js/reminder-notify.js:86 |
| `launcherNotifies` | frontend/js/reminder-notify.js:15 |
| `listenToReminderWorker` | frontend/js/reminder-notify.js:25 |
| `showReminderNotification` | frontend/js/reminder-notify.js:35 |

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
| `runLanguage` | frontend/js/run-core.js:195 |
| `runPrepare` | frontend/js/run-core.js:202 |
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

### frontend/js/search-suggest.js (19)

| Name | File:line |
|---|---|
| `clearRecentSearches` | frontend/js/search-suggest.js:389 |
| `clearSearchSuggestRecents` | frontend/js/search-suggest.js:404 |
| `closeSearchSuggest` | frontend/js/search-suggest.js:206 |
| `fillSearchSuggest` | frontend/js/search-suggest.js:277 |
| `openSearchSuggest` | frontend/js/search-suggest.js:421 |
| `placeSearchGhost` | frontend/js/search-suggest.js:248 |
| `placeSearchSuggest` | frontend/js/search-suggest.js:223 |
| `placeSearchSuggestSoon` | frontend/js/search-suggest.js:354 |
| `removeSearchSuggest` | frontend/js/search-suggest.js:376 |
| `searchSuggestEnabled` | frontend/js/search-suggest.js:56 |
| `searchSuggestItems` | frontend/js/search-suggest.js:139 |
| `searchSuggestListTitles` | frontend/js/search-suggest.js:114 |
| `searchSuggestRank` | frontend/js/search-suggest.js:84 |
| `searchSuggestRemember` | frontend/js/search-suggest.js:413 |
| `searchSuggestScopeOf` | frontend/js/search-suggest.js:60 |
| `searchSuggestTitleHits` | frontend/js/search-suggest.js:129 |
| `searchSuggestToken` | frontend/js/search-suggest.js:92 |
| `searchSuggestWords` | frontend/js/search-suggest.js:66 |
| `takeSearchSuggest` | frontend/js/search-suggest.js:361 |

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

### frontend/js/settings-controls.js (40)

| Name | File:line |
|---|---|
| `addMemoryByHand` | frontend/js/settings-controls.js:1586 |
| `addPersona` | frontend/js/settings-controls.js:1197 |
| `addSkill` | frontend/js/settings-controls.js:1820 |
| `addTemplate` | frontend/js/settings-controls.js:1387 |
| `applyBackendChoice` | frontend/js/settings-controls.js:1129 |
| `applyChatModel` | frontend/js/settings-controls.js:1311 |
| `applyOcrModel` | frontend/js/settings-controls.js:1327 |
| `applyUtilityModel` | frontend/js/settings-controls.js:1346 |
| `applyVisionModel` | frontend/js/settings-controls.js:1365 |
| `chosenSkillTools` | frontend/js/settings-controls.js:1882 |
| `chosenSkillVerify` | frontend/js/settings-controls.js:1861 |
| `deleteProfile` | frontend/js/settings-controls.js:1775 |
| `exportFullBackup` | frontend/js/settings-controls.js:1763 |
| `findDuplicates` | frontend/js/settings-controls.js:1544 |
| `lanCall` | frontend/js/settings-controls.js:2131 |
| `lanEmptyRow` | frontend/js/settings-controls.js:2124 |
| `lanListRow` | frontend/js/settings-controls.js:2110 |
| `mergeDuplicateGroup` | frontend/js/settings-controls.js:1665 |
| `mergeNamedPrompts` | frontend/js/settings-controls.js:1788 |
| `pickJsonFile` | frontend/js/settings-controls.js:2245 |
| `refreshSearxngHost` | frontend/js/settings-controls.js:1011 |
| `renderDuplicateGroups` | frontend/js/settings-controls.js:1607 |
| `renderLanAccess` | frontend/js/settings-controls.js:2235 |
| `renderLanAddresses` | frontend/js/settings-controls.js:2062 |
| `renderLanState` | frontend/js/settings-controls.js:2015 |
| `renderLanTrust` | frontend/js/settings-controls.js:2140 |
| `renderMcpSnippet` | frontend/js/settings-controls.js:1991 |
| `renderStatusBarSettings` | frontend/js/settings-controls.js:1935 |
| `resetAllFeatureModels` | frontend/js/settings-controls.js:1294 |
| `restartMemoryMap` | frontend/js/settings-controls.js:1495 |
| `restoreFullBackup` | frontend/js/settings-controls.js:1726 |
| `runEmbeddingFallback` | frontend/js/settings-controls.js:1230 |
| `saveExportSaveDir` | frontend/js/settings-controls.js:1569 |
| `saveModelContextWindow` | frontend/js/settings-controls.js:1164 |
| `saveRunBudget` | frontend/js/settings-controls.js:1425 |
| `saveWebSearchSettings` | frontend/js/settings-controls.js:1462 |
| `setLanOption` | frontend/js/settings-controls.js:2190 |
| `textToInputs` | frontend/js/settings-controls.js:2267 |
| `textToSteps` | frontend/js/settings-controls.js:2260 |
| `waitForRestart` | frontend/js/settings-controls.js:1521 |

### frontend/js/settings-data.js (44)

| Name | File:line |
|---|---|
| `backupNow` | frontend/js/settings-data.js:347 |
| `clearPreviews` | frontend/js/settings-data.js:545 |
| `dismissedWords` | frontend/js/settings-data.js:611 |
| `guideTurns` | frontend/js/settings-data.js:551 |
| `humanBytes` | frontend/js/settings-data.js:282 |
| `importDirectory` | frontend/js/settings-data.js:358 |
| `importDocument` | frontend/js/settings-data.js:465 |
| `importMarkdown` | frontend/js/settings-data.js:410 |
| `noteSettingChange` | frontend/js/settings-data.js:767 |
| `paintClearRow` | frontend/js/settings-data.js:556 |
| `previewCaches` | frontend/js/settings-data.js:531 |
| `previewCount` | frontend/js/settings-data.js:540 |
| `privacyAddressLine` | frontend/js/settings-data.js:39 |
| `privacyDestinationRow` | frontend/js/settings-data.js:45 |
| `privacyGroups` | frontend/js/settings-data.js:23 |
| `privacyWhen` | frontend/js/settings-data.js:10 |
| `renderBackupRetention` | frontend/js/settings-data.js:334 |
| `renderBackups` | frontend/js/settings-data.js:196 |
| `renderIntegrityNotice` | frontend/js/settings-data.js:322 |
| `renderPrivacyRange` | frontend/js/settings-data.js:90 |
| `renderPrivacyReceipt` | frontend/js/settings-data.js:138 |
| `renderSettingsClear` | frontend/js/settings-data.js:563 |
| `renderSettingsHistory` | frontend/js/settings-data.js:973 |
| `renderStorageSpaceNotice` | frontend/js/settings-data.js:301 |
| `restoreGuideTurns` | frontend/js/settings-data.js:672 |
| `searchRecentAll` | frontend/js/settings-data.js:796 |
| `searchRecentClearAll` | frontend/js/settings-data.js:808 |
| `searchRecentRestore` | frontend/js/settings-data.js:814 |
| `settingChangeWords` | frontend/js/settings-data.js:734 |
| `settingName` | frontend/js/settings-data.js:729 |
| `settingShown` | frontend/js/settings-data.js:718 |
| `settingsClearCount` | frontend/js/settings-data.js:525 |
| `settingsClearDone` | frontend/js/settings-data.js:624 |
| `settingsHistoryAdd` | frontend/js/settings-data.js:848 |
| `settingsHistoryApply` | frontend/js/settings-data.js:864 |
| `settingsHistoryEntry` | frontend/js/settings-data.js:834 |
| `settingsHistoryFind` | frontend/js/settings-data.js:859 |
| `settingsHistoryLoad` | frontend/js/settings-data.js:823 |
| `settingsHistoryRedo` | frontend/js/settings-data.js:927 |
| `settingsHistoryRow` | frontend/js/settings-data.js:940 |
| `settingsHistorySave` | frontend/js/settings-data.js:827 |
| `settingsHistoryUndo` | frontend/js/settings-data.js:913 |
| `settingsPrefsSeen` | frontend/js/settings-data.js:746 |
| `undoImport` | frontend/js/settings-data.js:381 |

### frontend/js/settings-find.js (33)

| Name | File:line |
|---|---|
| `findSettings` | frontend/js/settings-find.js:113 |
| `helpAlternation` | frontend/js/settings-find.js:594 |
| `helpApplySearch` | frontend/js/settings-find.js:714 |
| `helpEmphasis` | frontend/js/settings-find.js:600 |
| `helpFill` | frontend/js/settings-find.js:621 |
| `helpMarks` | frontend/js/settings-find.js:634 |
| `helpMatches` | frontend/js/settings-find.js:698 |
| `helpQueryTerms` | frontend/js/settings-find.js:690 |
| `helpSearchBind` | frontend/js/settings-find.js:764 |
| `helpTopicLink` | frontend/js/settings-find.js:563 |
| `helpTopicPaint` | frontend/js/settings-find.js:648 |
| `helpTopicRow` | frontend/js/settings-find.js:662 |
| `openSettingRow` | frontend/js/settings-find.js:179 |
| `renderHelpTopics` | frontend/js/settings-find.js:781 |
| `renderSettingResults` | frontend/js/settings-find.js:217 |
| `settingNearAdd` | frontend/js/settings-find.js:232 |
| `settingQueryAlts` | frontend/js/settings-find.js:101 |
| `settingResultItem` | frontend/js/settings-find.js:200 |
| `settingResultsKey` | frontend/js/settings-find.js:252 |
| `settingRowText` | frontend/js/settings-find.js:33 |
| `settingRows` | frontend/js/settings-find.js:45 |
| `settingVocab` | frontend/js/settings-find.js:89 |
| `settingsIndexBuild` | frontend/js/settings-find.js:440 |
| `settingsIndexClear` | frontend/js/settings-find.js:406 |
| `settingsIndexGo` | frontend/js/settings-find.js:323 |
| `settingsIndexHeads` | frontend/js/settings-find.js:284 |
| `settingsIndexJump` | frontend/js/settings-find.js:415 |
| `settingsIndexList` | frontend/js/settings-find.js:315 |
| `settingsIndexMark` | frontend/js/settings-find.js:374 |
| `settingsIndexOffset` | frontend/js/settings-find.js:309 |
| `settingsIndexWatchSection` | frontend/js/settings-find.js:529 |
| `settingsNavFollow` | frontend/js/settings-find.js:351 |
| `settingsPaneTitleHead` | frontend/js/settings-find.js:301 |

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

### frontend/js/settings-rows.js (34)

| Name | File:line |
|---|---|
| `allSettingRows` | frontend/js/settings-rows.js:286 |
| `applyLookSettings` | frontend/js/settings-rows.js:422 |
| `applySettingsFile` | frontend/js/settings-rows.js:437 |
| `browserOnlySettings` | frontend/js/settings-rows.js:391 |
| `exportSettingsFile` | frontend/js/settings-rows.js:407 |
| `fireSettingEvents` | frontend/js/settings-rows.js:324 |
| `importSettingsFile` | frontend/js/settings-rows.js:452 |
| `lookBase` | frontend/js/settings-rows.js:163 |
| `paintSectionReset` | frontend/js/settings-rows.js:305 |
| `paintSettingRow` | frontend/js/settings-rows.js:275 |
| `paintSettingRows` | frontend/js/settings-rows.js:297 |
| `resetSettingRow` | frontend/js/settings-rows.js:331 |
| `resetSettingSection` | frontend/js/settings-rows.js:353 |
| `sameSettingValue` | frontend/js/settings-rows.js:157 |
| `scheduleSettingRowsPaint` | frontend/js/settings-rows.js:361 |
| `settingDefaultShown` | frontend/js/settings-rows.js:168 |
| `settingDefaults` | frontend/js/settings-rows.js:116 |
| `settingIsModified` | frontend/js/settings-rows.js:174 |
| `settingMarkHost` | frontend/js/settings-rows.js:218 |
| `settingNameLine` | frontend/js/settings-rows.js:229 |
| `settingNow` | frontend/js/settings-rows.js:139 |
| `settingRadio` | frontend/js/settings-rows.js:129 |
| `settingResetButton` | frontend/js/settings-rows.js:241 |
| `settingRowEl` | frontend/js/settings-rows.js:191 |
| `settingRowName` | frontend/js/settings-rows.js:198 |
| `settingRowShown` | frontend/js/settings-rows.js:208 |
| `settingRowsIn` | frontend/js/settings-rows.js:290 |
| `settingRowsWatch` | frontend/js/settings-rows.js:372 |
| `settingScopeChip` | frontend/js/settings-rows.js:266 |
| `settingSegButton` | frontend/js/settings-rows.js:133 |
| `settingShows` | frontend/js/settings-rows.js:149 |
| `settingsFileSnapshot` | frontend/js/settings-rows.js:402 |
| `settingsImportWords` | frontend/js/settings-rows.js:444 |
| `wireSettingsFile` | frontend/js/settings-rows.js:476 |

### frontend/js/sketch-pad.js (2)

| Name | File:line |
|---|---|
| `sketchShowInk` | frontend/js/sketch-pad.js:6 |
| `sketchTogglePalette` | frontend/js/sketch-pad.js:122 |

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

### frontend/js/tag-suggest.js (11)

| Name | File:line |
|---|---|
| `answerSuggestedTags` | frontend/js/tag-suggest.js:224 |
| `closeNoteTagPopover` | frontend/js/tag-suggest.js:248 |
| `closeTagSuggest` | frontend/js/tag-suggest.js:25 |
| `fillTagSuggest` | frontend/js/tag-suggest.js:58 |
| `noteTagChoices` | frontend/js/tag-suggest.js:260 |
| `openNoteTagPopover` | frontend/js/tag-suggest.js:280 |
| `openTagSuggest` | frontend/js/tag-suggest.js:147 |
| `placeTagSuggest` | frontend/js/tag-suggest.js:39 |
| `tagSuggestSaid` | frontend/js/tag-suggest.js:121 |
| `tagSuggestToken` | frontend/js/tag-suggest.js:19 |
| `takeTagSuggest` | frontend/js/tag-suggest.js:132 |

### frontend/js/tidy.js (21)

| Name | File:line |
|---|---|
| `openTidySheet` | frontend/js/tidy.js:84 |
| `tidyAfterChange` | frontend/js/tidy.js:600 |
| `tidyApply` | frontend/js/tidy.js:561 |
| `tidyApplyWords` | frontend/js/tidy.js:548 |
| `tidyBadge` | frontend/js/tidy.js:35 |
| `tidyCounts` | frontend/js/tidy.js:225 |
| `tidyDismiss` | frontend/js/tidy.js:475 |
| `tidyFoot` | frontend/js/tidy.js:494 |
| `tidyHead` | frontend/js/tidy.js:188 |
| `tidyHistory` | frontend/js/tidy.js:618 |
| `tidyOverview` | frontend/js/tidy.js:295 |
| `tidyOverviewDraw` | frontend/js/tidy.js:244 |
| `tidyOverviewRow` | frontend/js/tidy.js:253 |
| `tidyPatterns` | frontend/js/tidy.js:165 |
| `tidyRow` | frontend/js/tidy.js:421 |
| `tidyRows` | frontend/js/tidy.js:408 |
| `tidyRunLinkReasons` | frontend/js/tidy.js:609 |
| `tidyShow` | frontend/js/tidy.js:307 |
| `tidyTitle` | frontend/js/tidy.js:234 |
| `tidyTools` | frontend/js/tidy.js:348 |
| `tidyWatchList` | frontend/js/tidy.js:59 |

### frontend/js/timeline-calendar.js (38)

| Name | File:line |
|---|---|
| `paintTimelineCalendar` | frontend/js/timeline-calendar.js:126 |
| `timelineCalCell` | frontend/js/timeline-calendar.js:305 |
| `timelineCalCellHead` | frontend/js/timeline-calendar.js:348 |
| `timelineCalDate` | frontend/js/timeline-calendar.js:56 |
| `timelineCalDayLabel` | frontend/js/timeline-calendar.js:262 |
| `timelineCalDays` | frontend/js/timeline-calendar.js:108 |
| `timelineCalDots` | frontend/js/timeline-calendar.js:369 |
| `timelineCalDragEnd` | frontend/js/timeline-calendar.js:631 |
| `timelineCalDragOver` | frontend/js/timeline-calendar.js:619 |
| `timelineCalDragStart` | frontend/js/timeline-calendar.js:610 |
| `timelineCalDraw` | frontend/js/timeline-calendar.js:158 |
| `timelineCalDrop` | frontend/js/timeline-calendar.js:638 |
| `timelineCalDropTarget` | frontend/js/timeline-calendar.js:606 |
| `timelineCalFetch` | frontend/js/timeline-calendar.js:92 |
| `timelineCalFocus` | frontend/js/timeline-calendar.js:575 |
| `timelineCalHead` | frontend/js/timeline-calendar.js:205 |
| `timelineCalItem` | frontend/js/timeline-calendar.js:392 |
| `timelineCalKeyMove` | frontend/js/timeline-calendar.js:559 |
| `timelineCalKeys` | frontend/js/timeline-calendar.js:533 |
| `timelineCalMonth` | frontend/js/timeline-calendar.js:270 |
| `timelineCalMove` | frontend/js/timeline-calendar.js:500 |
| `timelineCalMovePage` | frontend/js/timeline-calendar.js:680 |
| `timelineCalMoveReminder` | frontend/js/timeline-calendar.js:653 |
| `timelineCalNewReminder` | frontend/js/timeline-calendar.js:593 |
| `timelineCalOpenDay` | frontend/js/timeline-calendar.js:477 |
| `timelineCalOpenRow` | frontend/js/timeline-calendar.js:462 |
| `timelineCalRange` | frontend/js/timeline-calendar.js:70 |
| `timelineCalRefocus` | frontend/js/timeline-calendar.js:190 |
| `timelineCalSetSpan` | frontend/js/timeline-calendar.js:454 |
| `timelineCalSpan` | frontend/js/timeline-calendar.js:62 |
| `timelineCalSpanSeg` | frontend/js/timeline-calendar.js:241 |
| `timelineCalStop` | frontend/js/timeline-calendar.js:297 |
| `timelineCalTimed` | frontend/js/timeline-calendar.js:343 |
| `timelineCalUrl` | frontend/js/timeline-calendar.js:84 |
| `timelineCalWeek` | frontend/js/timeline-calendar.js:407 |
| `timelineCalWeekHead` | frontend/js/timeline-calendar.js:441 |
| `timelineCalendarReminders` | frontend/js/timeline-calendar.js:522 |
| `timelineCalendarToday` | frontend/js/timeline-calendar.js:514 |

### frontend/js/tour.js (47)

| Name | File:line |
|---|---|
| `openTour` | frontend/js/tour.js:1749 |
| `renderTourReplay` | frontend/js/tour.js:1947 |
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
| `tourDisable` | frontend/js/tour.js:1989 |
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
| `renderWbShortcutSheet` | frontend/js/whiteboard-commands.js:352 |
| `wbClickId` | frontend/js/whiteboard-commands.js:88 |
| `wbCloseHelpSheet` | frontend/js/whiteboard-commands.js:681 |
| `wbCommandApplies` | frontend/js/whiteboard-commands.js:236 |
| `wbCommandMenuRow` | frontend/js/whiteboard-commands.js:275 |
| `wbCommandOneSketch` | frontend/js/whiteboard-commands.js:37 |
| `wbCommandSelectionCount` | frontend/js/whiteboard-commands.js:32 |
| `wbCommandTextTarget` | frontend/js/whiteboard-commands.js:43 |
| `wbCommandsLive` | frontend/js/whiteboard-commands.js:283 |
| `wbHelpRows` | frontend/js/whiteboard-commands.js:603 |
| `wbHelpSections` | frontend/js/whiteboard-commands.js:614 |
| `wbInitMoreMenu` | frontend/js/whiteboard-commands.js:499 |
| `wbOpenHelpSheet` | frontend/js/whiteboard-commands.js:669 |
| `wbPaletteActRow` | frontend/js/whiteboard-commands.js:317 |
| `wbPaletteCommands` | frontend/js/whiteboard-commands.js:297 |
| `wbPhoneCarries` | frontend/js/whiteboard-commands.js:420 |
| `wbPhoneReachable` | frontend/js/whiteboard-commands.js:404 |
| `wbRenderHelpSheet` | frontend/js/whiteboard-commands.js:620 |
| `wbRunBoardAct` | frontend/js/whiteboard-commands.js:339 |
| `wbRunCommand` | frontend/js/whiteboard-commands.js:246 |
| `wbSetSelectValue` | frontend/js/whiteboard-commands.js:393 |
| `wbSyncCommandRows` | frontend/js/whiteboard-commands.js:375 |
| `wbSyncMoreMapRows` | frontend/js/whiteboard-commands.js:465 |
| `wbSyncMoreMenu` | frontend/js/whiteboard-commands.js:434 |
| `wbTool` | frontend/js/whiteboard-commands.js:89 |

### frontend/js/whiteboard-format.js (51)

| Name | File:line |
|---|---|
| `wbBuildTable` | frontend/js/whiteboard-format.js:813 |
| `wbColourButton` | frontend/js/whiteboard-format.js:1148 |
| `wbColourHeading` | frontend/js/whiteboard-format.js:1163 |
| `wbColourMenu` | frontend/js/whiteboard-format.js:1119 |
| `wbColourName` | frontend/js/whiteboard-format.js:1049 |
| `wbColourPairOf` | frontend/js/whiteboard-format.js:1060 |
| `wbDrawsRough` | frontend/js/whiteboard-format.js:711 |
| `wbEditTableCell` | frontend/js/whiteboard-format.js:875 |
| `wbFmtAngle` | frontend/js/whiteboard-format.js:190 |
| `wbFmtApply` | frontend/js/whiteboard-format.js:120 |
| `wbFmtBox` | frontend/js/whiteboard-format.js:148 |
| `wbFmtEntries` | frontend/js/whiteboard-format.js:34 |
| `wbFmtFlip` | frontend/js/whiteboard-format.js:196 |
| `wbFmtGeometry` | frontend/js/whiteboard-format.js:160 |
| `wbFmtKind` | frontend/js/whiteboard-format.js:44 |
| `wbFmtPropRow` | frontend/js/whiteboard-format.js:445 |
| `wbFmtProps` | frontend/js/whiteboard-format.js:440 |
| `wbFmtSaveProps` | frontend/js/whiteboard-format.js:488 |
| `wbFmtShowMixed` | frontend/js/whiteboard-format.js:291 |
| `wbFmtSketch` | frontend/js/whiteboard-format.js:77 |
| `wbFmtSyncProps` | frontend/js/whiteboard-format.js:469 |
| `wbFmtValue` | frontend/js/whiteboard-format.js:86 |
| `wbFmtWriteProps` | frontend/js/whiteboard-format.js:493 |
| `wbFormatClose` | frontend/js/whiteboard-format.js:257 |
| `wbFormatCommandButtons` | frontend/js/whiteboard-format.js:516 |
| `wbFormatIsOpen` | frontend/js/whiteboard-format.js:238 |
| `wbFormatOpen` | frontend/js/whiteboard-format.js:243 |
| `wbFormatPanel` | frontend/js/whiteboard-format.js:234 |
| `wbFormatSync` | frontend/js/whiteboard-format.js:316 |
| `wbFormatSyncSoon` | frontend/js/whiteboard-format.js:277 |
| `wbFormatToggle` | frontend/js/whiteboard-format.js:270 |
| `wbHexOf` | frontend/js/whiteboard-format.js:1031 |
| `wbInsertTable` | frontend/js/whiteboard-format.js:851 |
| `wbOpenColourMenu` | frontend/js/whiteboard-format.js:1172 |
| `wbPaintTable` | frontend/js/whiteboard-format.js:830 |
| `wbRecentColours` | frontend/js/whiteboard-format.js:1009 |
| `wbRememberColour` | frontend/js/whiteboard-format.js:1018 |
| `wbRoughD` | frontend/js/whiteboard-format.js:756 |
| `wbRoughProbe` | frontend/js/whiteboard-format.js:728 |
| `wbRoughRandom` | frontend/js/whiteboard-format.js:717 |
| `wbRoughSpline` | frontend/js/whiteboard-format.js:743 |
| `wbSampleColour` | frontend/js/whiteboard-format.js:1340 |
| `wbSetColourField` | frontend/js/whiteboard-format.js:1071 |
| `wbSetLinkRoute` | frontend/js/whiteboard-format.js:220 |
| `wbSetTable` | frontend/js/whiteboard-format.js:865 |
| `wbStartEyedrop` | frontend/js/whiteboard-format.js:1316 |
| `wbStopEyedrop` | frontend/js/whiteboard-format.js:1329 |
| `wbTableCells` | frontend/js/whiteboard-format.js:808 |
| `wbTableMenuRows` | frontend/js/whiteboard-format.js:954 |
| `wbTableReshape` | frontend/js/whiteboard-format.js:928 |
| `wbWriteColourPair` | frontend/js/whiteboard-format.js:1084 |

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

### frontend/js/whiteboard-interchange.js (35)

| Name | File:line |
|---|---|
| `wbBoardOutline` | frontend/js/whiteboard-interchange.js:323 |
| `wbBoardRowsFromSvg` | frontend/js/whiteboard-interchange.js:715 |
| `wbBoardSvgMetadata` | frontend/js/whiteboard-interchange.js:365 |
| `wbBoardToMermaid` | frontend/js/whiteboard-interchange.js:42 |
| `wbCardTitleForExport` | frontend/js/whiteboard-interchange.js:938 |
| `wbDrawioBox` | frontend/js/whiteboard-interchange.js:1038 |
| `wbDrawioCells` | frontend/js/whiteboard-interchange.js:990 |
| `wbDrawioLook` | frontend/js/whiteboard-interchange.js:605 |
| `wbDrawioModelCells` | frontend/js/whiteboard-interchange.js:1015 |
| `wbDrawioPath` | frontend/js/whiteboard-interchange.js:699 |
| `wbDrawioPlace` | frontend/js/whiteboard-interchange.js:1045 |
| `wbDrawioPlan` | frontend/js/whiteboard-interchange.js:638 |
| `wbDrawioShape` | frontend/js/whiteboard-interchange.js:622 |
| `wbDrawioStyle` | frontend/js/whiteboard-interchange.js:567 |
| `wbDrawioText` | frontend/js/whiteboard-interchange.js:584 |
| `wbExportMermaid` | frontend/js/whiteboard-interchange.js:957 |
| `wbExportOutline` | frontend/js/whiteboard-interchange.js:967 |
| `wbExportRows` | frontend/js/whiteboard-interchange.js:731 |
| `wbImportBoardRows` | frontend/js/whiteboard-interchange.js:764 |
| `wbImportDrawio` | frontend/js/whiteboard-interchange.js:1090 |
| `wbImportMermaid` | frontend/js/whiteboard-interchange.js:802 |
| `wbImportMermaidSequence` | frontend/js/whiteboard-interchange.js:885 |
| `wbImportText` | frontend/js/whiteboard-interchange.js:1137 |
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

### frontend/js/whiteboard-library.js (88)

| Name | File:line |
|---|---|
| `wbCloseSidebar` | frontend/js/whiteboard-library.js:115 |
| `wbKeepOwnLayer` | frontend/js/whiteboard-library.js:1653 |
| `wbLayerButton` | frontend/js/whiteboard-library.js:1541 |
| `wbLayerEntry` | frontend/js/whiteboard-library.js:1883 |
| `wbLayerEntryByKey` | frontend/js/whiteboard-library.js:1474 |
| `wbLayerFocus` | frontend/js/whiteboard-library.js:1889 |
| `wbLayerIcon` | frontend/js/whiteboard-library.js:1872 |
| `wbLayerName` | frontend/js/whiteboard-library.js:1465 |
| `wbLayerOwning` | frontend/js/whiteboard-library.js:1573 |
| `wbLayerRename` | frontend/js/whiteboard-library.js:1958 |
| `wbLayerRestack` | frontend/js/whiteboard-library.js:1986 |
| `wbLayerRows` | frontend/js/whiteboard-library.js:1480 |
| `wbLayerSaysOwner` | frontend/js/whiteboard-library.js:1578 |
| `wbLayerSelect` | frontend/js/whiteboard-library.js:1897 |
| `wbLayerToggleHidden` | frontend/js/whiteboard-library.js:1928 |
| `wbLayerToggleLock` | frontend/js/whiteboard-library.js:1943 |
| `wbLayersSelectedHead` | frontend/js/whiteboard-library.js:1865 |
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
| `wbMoveSelectionToLayer` | frontend/js/whiteboard-library.js:1606 |
| `wbNamedLayerItems` | frontend/js/whiteboard-library.js:1677 |
| `wbNamedLayerMenu` | frontend/js/whiteboard-library.js:1685 |
| `wbNamedLayerOf` | frontend/js/whiteboard-library.js:1563 |
| `wbNamedLayerSet` | frontend/js/whiteboard-library.js:1673 |
| `wbNewNamedLayer` | frontend/js/whiteboard-library.js:1639 |
| `wbOpenSidebar` | frontend/js/whiteboard-library.js:63 |
| `wbOpenStickerPicker` | frontend/js/whiteboard-library.js:285 |
| `wbPageFocus` | frontend/js/whiteboard-library.js:2170 |
| `wbPageGo` | frontend/js/whiteboard-library.js:2180 |
| `wbPageMenu` | frontend/js/whiteboard-library.js:2233 |
| `wbPageMove` | frontend/js/whiteboard-library.js:2192 |
| `wbPagePresent` | frontend/js/whiteboard-library.js:2249 |
| `wbPageRename` | frontend/js/whiteboard-library.js:2215 |
| `wbPlaceSticker` | frontend/js/whiteboard-library.js:263 |
| `wbRenderLayers` | frontend/js/whiteboard-library.js:1773 |
| `wbRenderLibrary` | frontend/js/whiteboard-library.js:416 |
| `wbRenderNamedLayers` | frontend/js/whiteboard-library.js:1714 |
| `wbRenderPages` | frontend/js/whiteboard-library.js:2130 |
| `wbRenderSideMap` | frontend/js/whiteboard-library.js:153 |
| `wbSaveBoardAsTemplate` | frontend/js/whiteboard-library.js:1121 |
| `wbSaveBranchToLibrary` | frontend/js/whiteboard-library.js:1107 |
| `wbSaveNamedLayers` | frontend/js/whiteboard-library.js:1583 |
| `wbSavePaletteToLibrary` | frontend/js/whiteboard-library.js:1051 |
| `wbSavePresetToLibrary` | frontend/js/whiteboard-library.js:1071 |
| `wbSaveSelectionToLibrary` | frontend/js/whiteboard-library.js:989 |
| `wbSaveShapeToLibrary` | frontend/js/whiteboard-library.js:1003 |
| `wbSaveSideState` | frontend/js/whiteboard-library.js:53 |
| `wbSaveStyleToLibrary` | frontend/js/whiteboard-library.js:1029 |
| `wbSetCurrentLayer` | frontend/js/whiteboard-library.js:1667 |
| `wbSideRefreshSoon` | frontend/js/whiteboard-library.js:2347 |
| `wbSideState` | frontend/js/whiteboard-library.js:48 |
| `wbSyncSidebarKind` | frontend/js/whiteboard-library.js:134 |

### frontend/js/whiteboard-map.js (308)

| Name | File:line |
|---|---|
| `mapPaletteCommands` | frontend/js/whiteboard-map.js:4516 |
| `wbApplyMapFont` | frontend/js/whiteboard-map.js:330 |
| `wbBuildMapNode` | frontend/js/whiteboard-map.js:1683 |
| `wbClearMapNodeSizeCache` | frontend/js/whiteboard-map.js:3109 |
| `wbCloseMapLinkRadial` | frontend/js/whiteboard-map.js:7941 |
| `wbCloseMapRadial` | frontend/js/whiteboard-map.js:7409 |
| `wbColourChannels` | frontend/js/whiteboard-map.js:2052 |
| `wbCoreInkFor` | frontend/js/whiteboard-map.js:2094 |
| `wbDismissMapTemplates` | frontend/js/whiteboard-map.js:1358 |
| `wbFitMapRadialBand` | frontend/js/whiteboard-map.js:7213 |
| `wbForgetMapNodeSize` | frontend/js/whiteboard-map.js:3143 |
| `wbIndexMapNodeElements` | frontend/js/whiteboard-map.js:3126 |
| `wbInfoDialog` | frontend/js/whiteboard-map.js:1226 |
| `wbIsMap` | frontend/js/whiteboard-map.js:99 |
| `wbMapAccentInk` | frontend/js/whiteboard-map.js:2083 |
| `wbMapAddChild` | frontend/js/whiteboard-map.js:4312 |
| `wbMapAddReference` | frontend/js/whiteboard-map.js:4704 |
| `wbMapAddRootAt` | frontend/js/whiteboard-map.js:4675 |
| `wbMapAddSibling` | frontend/js/whiteboard-map.js:4735 |
| `wbMapAddStamp` | frontend/js/whiteboard-map.js:7627 |
| `wbMapAdoptProvisional` | frontend/js/whiteboard-map.js:4618 |
| `wbMapAfterRender` | frontend/js/whiteboard-map.js:9671 |
| `wbMapAgeBucket` | frontend/js/whiteboard-map.js:491 |
| `wbMapAskStructureWords` | frontend/js/whiteboard-map.js:8689 |
| `wbMapBraceGeometry` | frontend/js/whiteboard-map.js:8558 |
| `wbMapBranchBox` | frontend/js/whiteboard-map.js:8516 |
| `wbMapBranchDragOrigin` | frontend/js/whiteboard-map.js:2733 |
| `wbMapBySiblingOrder` | frontend/js/whiteboard-map.js:1430 |
| `wbMapCatchTypeahead` | frontend/js/whiteboard-map.js:4281 |
| `wbMapChooseMarkerFilter` | frontend/js/whiteboard-map.js:9620 |
| `wbMapClearDropTarget` | frontend/js/whiteboard-map.js:2787 |
| `wbMapClearEveryTopic` | frontend/js/whiteboard-map.js:920 |
| `wbMapClearFocus` | frontend/js/whiteboard-map.js:712 |
| `wbMapClearLinkCue` | frontend/js/whiteboard-map.js:3036 |
| `wbMapClearToOneTopic` | frontend/js/whiteboard-map.js:4962 |
| `wbMapCloseMarkers` | frontend/js/whiteboard-map.js:9429 |
| `wbMapCloseNote` | frontend/js/whiteboard-map.js:2364 |
| `wbMapCloudD` | frontend/js/whiteboard-map.js:8539 |
| `wbMapColors` | frontend/js/whiteboard-map.js:1521 |
| `wbMapColumnPositions` | frontend/js/whiteboard-map.js:5318 |
| `wbMapConcealed` | frontend/js/whiteboard-map.js:694 |
| `wbMapCopyBranch` | frontend/js/whiteboard-map.js:7530 |
| `wbMapCreateNode` | frontend/js/whiteboard-map.js:4224 |
| `wbMapCrossLinkInfo` | frontend/js/whiteboard-map.js:7955 |
| `wbMapCrossLinkLook` | frontend/js/whiteboard-map.js:5984 |
| `wbMapCrossLinkToBranch` | frontend/js/whiteboard-map.js:8285 |
| `wbMapCrossLinkType` | frontend/js/whiteboard-map.js:6043 |
| `wbMapCubicAt` | frontend/js/whiteboard-map.js:3436 |
| `wbMapCutCrossLink` | frontend/js/whiteboard-map.js:8307 |
| `wbMapDeleteEmptiesMap` | frontend/js/whiteboard-map.js:4940 |
| `wbMapDeleteSubtree` | frontend/js/whiteboard-map.js:4988 |
| `wbMapDrawn` | frontend/js/whiteboard-map.js:308 |
| `wbMapDropTargetAt` | frontend/js/whiteboard-map.js:2752 |
| `wbMapDueRow` | frontend/js/whiteboard-map.js:9385 |
| `wbMapDueWords` | frontend/js/whiteboard-map.js:9304 |
| `wbMapDuplicateTopic` | frontend/js/whiteboard-map.js:4764 |
| `wbMapEdgeAnchors` | frontend/js/whiteboard-map.js:3157 |
| `wbMapEdgeApply` | frontend/js/whiteboard-map.js:3926 |
| `wbMapEdgeContext` | frontend/js/whiteboard-map.js:3567 |
| `wbMapEdgeCubic` | frontend/js/whiteboard-map.js:3280 |
| `wbMapEdgeElbowTurn` | frontend/js/whiteboard-map.js:3308 |
| `wbMapEdgeElement` | frontend/js/whiteboard-map.js:3806 |
| `wbMapEdgeFractions` | frontend/js/whiteboard-map.js:3246 |
| `wbMapEdgeGeometry` | frontend/js/whiteboard-map.js:3747 |
| `wbMapEdgeHandlePoint` | frontend/js/whiteboard-map.js:3325 |
| `wbMapEdgeHasArrow` | frontend/js/whiteboard-map.js:3429 |
| `wbMapEdgeIsRibbon` | frontend/js/whiteboard-map.js:3540 |
| `wbMapEdgePathD` | frontend/js/whiteboard-map.js:3337 |
| `wbMapEdgePlusButton` | frontend/js/whiteboard-map.js:4085 |
| `wbMapEdgePlusPoint` | frontend/js/whiteboard-map.js:3984 |
| `wbMapEdgeStyle` | frontend/js/whiteboard-map.js:5314 |
| `wbMapEdgeWaypoint` | frontend/js/whiteboard-map.js:3221 |
| `wbMapEdgeWeight` | frontend/js/whiteboard-map.js:3416 |
| `wbMapEdgesFor` | frontend/js/whiteboard-map.js:3589 |
| `wbMapEditCallout` | frontend/js/whiteboard-map.js:7693 |
| `wbMapEditLabels` | frontend/js/whiteboard-map.js:7681 |
| `wbMapEditLink` | frontend/js/whiteboard-map.js:6927 |
| `wbMapEditNode` | frontend/js/whiteboard-map.js:4882 |
| `wbMapEditPicture` | frontend/js/whiteboard-map.js:6972 |
| `wbMapEndStudy` | frontend/js/whiteboard-map.js:8892 |
| `wbMapExpandAll` | frontend/js/whiteboard-map.js:2671 |
| `wbMapFacets` | frontend/js/whiteboard-map.js:476 |
| `wbMapFillOf` | frontend/js/whiteboard-map.js:280 |
| `wbMapFills` | frontend/js/whiteboard-map.js:1572 |
| `wbMapFocusHidden` | frontend/js/whiteboard-map.js:648 |
| `wbMapFoldToLevel` | frontend/js/whiteboard-map.js:2693 |
| `wbMapFontStack` | frontend/js/whiteboard-map.js:326 |
| `wbMapFreshPlace` | frontend/js/whiteboard-map.js:4587 |
| `wbMapFromDocument` | frontend/js/whiteboard-map.js:9729 |
| `wbMapGapBreadth` | frontend/js/whiteboard-map.js:77 |
| `wbMapGapDepth` | frontend/js/whiteboard-map.js:80 |
| `wbMapHeadingsOutline` | frontend/js/whiteboard-map.js:9694 |
| `wbMapHidden` | frontend/js/whiteboard-map.js:1596 |
| `wbMapIconOption` | frontend/js/whiteboard-map.js:6482 |
| `wbMapIndex` | frontend/js/whiteboard-map.js:1377 |
| `wbMapInlineText` | frontend/js/whiteboard-map.js:1635 |
| `wbMapInsertBetween` | frontend/js/whiteboard-map.js:4142 |
| `wbMapIsFollow` | frontend/js/whiteboard-map.js:6288 |
| `wbMapJoinByLink` | frontend/js/whiteboard-map.js:2963 |
| `wbMapJoinPlan` | frontend/js/whiteboard-map.js:2977 |
| `wbMapKeyBetween` | frontend/js/whiteboard-map.js:1443 |
| `wbMapLabel` | frontend/js/whiteboard-map.js:1611 |
| `wbMapLabelEdge` | frontend/js/whiteboard-map.js:7810 |
| `wbMapLayout` | frontend/js/whiteboard-map.js:103 |
| `wbMapLayoutPositions` | frontend/js/whiteboard-map.js:5531 |
| `wbMapLaysOut` | frontend/js/whiteboard-map.js:109 |
| `wbMapLevelLook` | frontend/js/whiteboard-map.js:272 |
| `wbMapLevelLooks` | frontend/js/whiteboard-map.js:258 |
| `wbMapLevelOf` | frontend/js/whiteboard-map.js:254 |
| `wbMapLevels` | frontend/js/whiteboard-map.js:238 |
| `wbMapLinkCue` | frontend/js/whiteboard-map.js:3015 |
| `wbMapLiveDatum` | frontend/js/whiteboard-map.js:1671 |
| `wbMapMarkBranchLayouts` | frontend/js/whiteboard-map.js:1405 |
| `wbMapMarkerGlyph` | frontend/js/whiteboard-map.js:9473 |
| `wbMapMarkerKeyWords` | frontend/js/whiteboard-map.js:9601 |
| `wbMapMarkerKeys` | frontend/js/whiteboard-map.js:9590 |
| `wbMapMarkerParts` | frontend/js/whiteboard-map.js:9291 |
| `wbMapMarkerSeg` | frontend/js/whiteboard-map.js:9442 |
| `wbMapMarkerWords` | frontend/js/whiteboard-map.js:9321 |
| `wbMapMarkersInUse` | frontend/js/whiteboard-map.js:9611 |
| `wbMapMoveAmongSiblings` | frontend/js/whiteboard-map.js:1456 |
| `wbMapMultiState` | frontend/js/whiteboard-map.js:6576 |
| `wbMapMultiTopics` | frontend/js/whiteboard-map.js:6538 |
| `wbMapNavigate` | frontend/js/whiteboard-map.js:4837 |
| `wbMapNodeColors` | frontend/js/whiteboard-map.js:524 |
| `wbMapNodeSize` | frontend/js/whiteboard-map.js:3093 |
| `wbMapNumberOf` | frontend/js/whiteboard-map.js:2274 |
| `wbMapNumbers` | frontend/js/whiteboard-map.js:2252 |
| `wbMapOpenIconPicker` | frontend/js/whiteboard-map.js:6469 |
| `wbMapOpenLink` | frontend/js/whiteboard-map.js:2563 |
| `wbMapOpenMarkers` | frontend/js/whiteboard-map.js:9490 |
| `wbMapOpenNote` | frontend/js/whiteboard-map.js:2312 |
| `wbMapOpenReference` | frontend/js/whiteboard-map.js:3046 |
| `wbMapOrderKey` | frontend/js/whiteboard-map.js:1425 |
| `wbMapOutdent` | frontend/js/whiteboard-map.js:4792 |
| `wbMapPaintExtras` | frontend/js/whiteboard-map.js:7638 |
| `wbMapPaintMarkerFilter` | frontend/js/whiteboard-map.js:9646 |
| `wbMapPaintMarkers` | frontend/js/whiteboard-map.js:9337 |
| `wbMapPalette` | frontend/js/whiteboard-map.js:502 |
| `wbMapPasteText` | frontend/js/whiteboard-map.js:4394 |
| `wbMapPerspective` | frontend/js/whiteboard-map.js:453 |
| `wbMapPickGlyph` | frontend/js/whiteboard-map.js:6268 |
| `wbMapPickPreview` | frontend/js/whiteboard-map.js:6247 |
| `wbMapPickRow` | frontend/js/whiteboard-map.js:6292 |
| `wbMapPinOnDrag` | frontend/js/whiteboard-map.js:8496 |
| `wbMapPlaceAsChild` | frontend/js/whiteboard-map.js:2917 |
| `wbMapPresentSteps` | frontend/js/whiteboard-map.js:8721 |
| `wbMapProgressWords` | frontend/js/whiteboard-map.js:9313 |
| `wbMapQuietColour` | frontend/js/whiteboard-map.js:516 |
| `wbMapRadialBandFor` | frontend/js/whiteboard-map.js:7298 |
| `wbMapRadialClearance` | frontend/js/whiteboard-map.js:7277 |
| `wbMapRadialLabelSizes` | frontend/js/whiteboard-map.js:7259 |
| `wbMapRadialNode` | frontend/js/whiteboard-map.js:7513 |
| `wbMapRadialPx` | frontend/js/whiteboard-map.js:7161 |
| `wbMapRadialSectorPath` | frontend/js/whiteboard-map.js:7194 |
| `wbMapRadialSectorRect` | frontend/js/whiteboard-map.js:7344 |
| `wbMapRadialStep` | frontend/js/whiteboard-map.js:7367 |
| `wbMapRadialToward` | frontend/js/whiteboard-map.js:7385 |
| `wbMapRefuseLastTopic` | frontend/js/whiteboard-map.js:4947 |
| `wbMapRemoveKeepingBranch` | frontend/js/whiteboard-map.js:7719 |
| `wbMapRemovePicture` | frontend/js/whiteboard-map.js:7014 |
| `wbMapResetToBranch` | frontend/js/whiteboard-map.js:7838 |
| `wbMapResetTopicSize` | frontend/js/whiteboard-map.js:4571 |
| `wbMapRestoreRows` | frontend/js/whiteboard-map.js:5056 |
| `wbMapReverseCrossLink` | frontend/js/whiteboard-map.js:8245 |
| `wbMapReverseEdge` | frontend/js/whiteboard-map.js:8329 |
| `wbMapRibbonD` | frontend/js/whiteboard-map.js:3448 |
| `wbMapSetBranchLayout` | frontend/js/whiteboard-map.js:8480 |
| `wbMapSetExtra` | frontend/js/whiteboard-map.js:7704 |
| `wbMapSetFocus` | frontend/js/whiteboard-map.js:704 |
| `wbMapSetLayout` | frontend/js/whiteboard-map.js:8451 |
| `wbMapSetLevelField` | frontend/js/whiteboard-map.js:1091 |
| `wbMapSetMarkerFilter` | frontend/js/whiteboard-map.js:9635 |
| `wbMapSetNodeStyle` | frontend/js/whiteboard-map.js:6909 |
| `wbMapSetNumbered` | frontend/js/whiteboard-map.js:2281 |
| `wbMapSetPerspective` | frontend/js/whiteboard-map.js:462 |
| `wbMapSetStructure` | frontend/js/whiteboard-map.js:8680 |
| `wbMapSetTask` | frontend/js/whiteboard-map.js:2390 |
| `wbMapSetTheme` | frontend/js/whiteboard-map.js:883 |
| `wbMapSetTopicIcon` | frontend/js/whiteboard-map.js:6460 |
| `wbMapSever` | frontend/js/whiteboard-map.js:7766 |
| `wbMapShowDropTarget` | frontend/js/whiteboard-map.js:2779 |
| `wbMapSiblingsOf` | frontend/js/whiteboard-map.js:1435 |
| `wbMapSizeStepper` | frontend/js/whiteboard-map.js:6384 |
| `wbMapSmoothThrough` | frontend/js/whiteboard-map.js:3521 |
| `wbMapSpacing` | frontend/js/whiteboard-map.js:74 |
| `wbMapSpillsOffCanvas` | frontend/js/whiteboard-map.js:5847 |
| `wbMapStartResizeDrag` | frontend/js/whiteboard-map.js:2603 |
| `wbMapStartStudy` | frontend/js/whiteboard-map.js:8836 |
| `wbMapStats` | frontend/js/whiteboard-map.js:760 |
| `wbMapStatsList` | frontend/js/whiteboard-map.js:1166 |
| `wbMapStepFocus` | frontend/js/whiteboard-map.js:719 |
| `wbMapStraightenEdge` | frontend/js/whiteboard-map.js:8110 |
| `wbMapStructureGroup` | frontend/js/whiteboard-map.js:8582 |
| `wbMapStructureText` | frontend/js/whiteboard-map.js:8593 |
| `wbMapStructuredPositions` | frontend/js/whiteboard-map.js:5462 |
| `wbMapStudyKey` | frontend/js/whiteboard-map.js:8797 |
| `wbMapStudyLoad` | frontend/js/whiteboard-map.js:8801 |
| `wbMapStudyMark` | frontend/js/whiteboard-map.js:8874 |
| `wbMapStudyQuestions` | frontend/js/whiteboard-map.js:8765 |
| `wbMapStudySave` | frontend/js/whiteboard-map.js:8807 |
| `wbMapStudyShow` | frontend/js/whiteboard-map.js:8864 |
| `wbMapStudySteps` | frontend/js/whiteboard-map.js:8817 |
| `wbMapStudySyncBar` | frontend/js/whiteboard-map.js:8856 |
| `wbMapStudyTally` | frontend/js/whiteboard-map.js:8790 |
| `wbMapStyleMany` | frontend/js/whiteboard-map.js:6555 |
| `wbMapSubtree` | frontend/js/whiteboard-map.js:1492 |
| `wbMapSuggestBranches` | frontend/js/whiteboard-map.js:9806 |
| `wbMapSummarise` | frontend/js/whiteboard-map.js:8699 |
| `wbMapSummariseBranch` | frontend/js/whiteboard-map.js:9779 |
| `wbMapSummaryRun` | frontend/js/whiteboard-map.js:8530 |
| `wbMapTakePicture` | frontend/js/whiteboard-map.js:6983 |
| `wbMapTaskTally` | frontend/js/whiteboard-map.js:2214 |
| `wbMapTemplatesDismissedKey` | frontend/js/whiteboard-map.js:1296 |
| `wbMapTheme` | frontend/js/whiteboard-map.js:126 |
| `wbMapThemeCheck` | frontend/js/whiteboard-map.js:1131 |
| `wbMapThemeDefault` | frontend/js/whiteboard-map.js:172 |
| `wbMapThemeDialog` | frontend/js/whiteboard-map.js:956 |
| `wbMapThemeLevelRows` | frontend/js/whiteboard-map.js:1045 |
| `wbMapThemeMapRows` | frontend/js/whiteboard-map.js:1015 |
| `wbMapThemeSelect` | frontend/js/whiteboard-map.js:1101 |
| `wbMapThemedData` | frontend/js/whiteboard-map.js:144 |
| `wbMapTidy` | frontend/js/whiteboard-map.js:5761 |
| `wbMapTidyBranch` | frontend/js/whiteboard-map.js:5866 |
| `wbMapTidyBranchPlan` | frontend/js/whiteboard-map.js:5886 |
| `wbMapTidyBranchScope` | frontend/js/whiteboard-map.js:5874 |
| `wbMapTidyFresh` | frontend/js/whiteboard-map.js:5830 |
| `wbMapTidyOrigin` | frontend/js/whiteboard-map.js:5795 |
| `wbMapTidyPositions` | frontend/js/whiteboard-map.js:5448 |
| `wbMapToggleCollapse` | frontend/js/whiteboard-map.js:5155 |
| `wbMapToggleTaskDone` | frontend/js/whiteboard-map.js:2399 |
| `wbMapToggleValue` | frontend/js/whiteboard-map.js:346 |
| `wbMapTopicStyle` | frontend/js/whiteboard-map.js:7866 |
| `wbMapTransplant` | frontend/js/whiteboard-map.js:2814 |
| `wbMapTreeMarkdown` | frontend/js/whiteboard-map.js:4444 |
| `wbMapTypeaheadLive` | frontend/js/whiteboard-map.js:4264 |
| `wbMapUseLookForLevel` | frontend/js/whiteboard-map.js:7879 |
| `wbMapWriteDocument` | frontend/js/whiteboard-map.js:4476 |
| `wbMarkMapRadialNode` | frontend/js/whiteboard-map.js:7401 |
| `wbMarkMapRadialSector` | frontend/js/whiteboard-map.js:7319 |
| `wbOpenMapCrossLinkRadial` | frontend/js/whiteboard-map.js:8172 |
| `wbOpenMapLinkRadial` | frontend/js/whiteboard-map.js:8151 |
| `wbOpenMapRadial` | frontend/js/whiteboard-map.js:7456 |
| `wbOutlineAddAfter` | frontend/js/whiteboard-map.js:9159 |
| `wbOutlineAfterSurface` | frontend/js/whiteboard-map.js:8940 |
| `wbOutlineCommit` | frontend/js/whiteboard-map.js:9099 |
| `wbOutlineEdit` | frontend/js/whiteboard-map.js:9006 |
| `wbOutlineEditing` | frontend/js/whiteboard-map.js:9000 |
| `wbOutlineFocus` | frontend/js/whiteboard-map.js:9078 |
| `wbOutlineFocusSelected` | frontend/js/whiteboard-map.js:8946 |
| `wbOutlineIndent` | frontend/js/whiteboard-map.js:9118 |
| `wbOutlineMirror` | frontend/js/whiteboard-map.js:9092 |
| `wbOutlineOutdent` | frontend/js/whiteboard-map.js:9139 |
| `wbOutlineRemoveEmpty` | frontend/js/whiteboard-map.js:9177 |
| `wbOutlineRowEl` | frontend/js/whiteboard-map.js:8963 |
| `wbOutlineRowOf` | frontend/js/whiteboard-map.js:9071 |
| `wbOutlineRowsNow` | frontend/js/whiteboard-map.js:8952 |
| `wbOutlineShowing` | frontend/js/whiteboard-map.js:8921 |
| `wbOutlineStep` | frontend/js/whiteboard-map.js:9193 |
| `wbOutlineStopEdit` | frontend/js/whiteboard-map.js:9017 |
| `wbOutlineSwitchShows` | frontend/js/whiteboard-map.js:8927 |
| `wbOutlineSync` | frontend/js/whiteboard-map.js:9032 |
| `wbOutlineTakeNewTopic` | frontend/js/whiteboard-map.js:9171 |
| `wbOutlineToggle` | frontend/js/whiteboard-map.js:8932 |
| `wbPaintMapNode` | frontend/js/whiteboard-map.js:2106 |
| `wbPaintMapNodeStyle` | frontend/js/whiteboard-map.js:2414 |
| `wbPathEnds` | frontend/js/whiteboard-map.js:6034 |
| `wbPlaceMapRadial` | frontend/js/whiteboard-map.js:7070 |
| `wbRefreshMapState` | frontend/js/whiteboard-map.js:367 |
| `wbRelativeLuminance` | frontend/js/whiteboard-map.js:2068 |
| `wbRenderMapEdgePluses` | frontend/js/whiteboard-map.js:4032 |
| `wbRenderMapEdges` | frontend/js/whiteboard-map.js:3657 |
| `wbRenderMapLegend` | frontend/js/whiteboard-map.js:569 |
| `wbRenderMapStructure` | frontend/js/whiteboard-map.js:8605 |
| `wbSelectedMapNode` | frontend/js/whiteboard-map.js:4204 |
| `wbShowMapStats` | frontend/js/whiteboard-map.js:1149 |
| `wbSizeMapRadial` | frontend/js/whiteboard-map.js:7169 |
| `wbSyncConnectWords` | frontend/js/whiteboard-map.js:6074 |
| `wbSyncMapChrome` | frontend/js/whiteboard-map.js:8352 |
| `wbSyncMapEdgeHandles` | frontend/js/whiteboard-map.js:7988 |
| `wbSyncMapEmpty` | frontend/js/whiteboard-map.js:1289 |
| `wbSyncMapFill` | frontend/js/whiteboard-map.js:6837 |
| `wbSyncMapFirstHint` | frontend/js/whiteboard-map.js:1336 |
| `wbSyncMapFocusChrome` | frontend/js/whiteboard-map.js:730 |
| `wbSyncMapLinkGlyph` | frontend/js/whiteboard-map.js:6054 |
| `wbSyncMapLinkRadial` | frontend/js/whiteboard-map.js:8194 |
| `wbSyncMapMulti` | frontend/js/whiteboard-map.js:6626 |
| `wbSyncMapRadialAlt` | frontend/js/whiteboard-map.js:7427 |
| `wbSyncMapStrip` | frontend/js/whiteboard-map.js:6658 |
| `wbSyncMapTemplates` | frontend/js/whiteboard-map.js:1302 |
| `wbSyncMapToolState` | frontend/js/whiteboard-map.js:6136 |
| `wbSyncMapViews` | frontend/js/whiteboard-map.js:1270 |
| `wbSyncToolSurfaces` | frontend/js/whiteboard-map.js:6106 |
| `wbTidyAncestor` | frontend/js/whiteboard-map.js:5243 |
| `wbTidyApportion` | frontend/js/whiteboard-map.js:5252 |
| `wbTidyDistance` | frontend/js/whiteboard-map.js:5209 |
| `wbTidyExecuteShifts` | frontend/js/whiteboard-map.js:5231 |
| `wbTidyFirstWalk` | frontend/js/whiteboard-map.js:5181 |
| `wbTidyMoveSubtree` | frontend/js/whiteboard-map.js:5221 |
| `wbTidyNextLeft` | frontend/js/whiteboard-map.js:5213 |
| `wbTidyNextRight` | frontend/js/whiteboard-map.js:5217 |
| `wbUpdateMapEdges` | frontend/js/whiteboard-map.js:3626 |
| `wbWireEdgeLabelDrag` | frontend/js/whiteboard-map.js:3885 |
| `wbWireMapChoices` | frontend/js/whiteboard-map.js:6510 |
| `wbWireMapEdgeGestures` | frontend/js/whiteboard-map.js:8126 |
| `wbWireMapEdgeHandle` | frontend/js/whiteboard-map.js:8030 |
| `wbWireMapIconMore` | frontend/js/whiteboard-map.js:6500 |
| `wbWireMapMulti` | frontend/js/whiteboard-map.js:6647 |

### frontend/js/whiteboard-templates.js (12)

| Name | File:line |
|---|---|
| `wbApplyMapTemplate` | frontend/js/whiteboard-templates.js:574 |
| `wbBlankThumbSpec` | frontend/js/whiteboard-templates.js:302 |
| `wbBoardThumbSpec` | frontend/js/whiteboard-templates.js:214 |
| `wbMapThumbSpec` | frontend/js/whiteboard-templates.js:47 |
| `wbOpenTemplateGallery` | frontend/js/whiteboard-templates.js:384 |
| `wbRenderMapTemplates` | frontend/js/whiteboard-templates.js:541 |
| `wbTemplateChoices` | frontend/js/whiteboard-templates.js:340 |
| `wbTemplateEntry` | frontend/js/whiteboard-templates.js:336 |
| `wbTemplatePicture` | frontend/js/whiteboard-templates.js:356 |
| `wbThumbRound` | frontend/js/whiteboard-templates.js:37 |
| `wbThumbSvg` | frontend/js/whiteboard-templates.js:307 |
| `wbUntitledNames` | frontend/js/whiteboard-templates.js:369 |

### frontend/js/whiteboard.js (491)

| Name | File:line |
|---|---|
| `addBoardToNote` | frontend/js/whiteboard.js:21555 |
| `boardItemCount` | frontend/js/whiteboard.js:20598 |
| `boardSort` | frontend/js/whiteboard.js:20602 |
| `boardTypeFilter` | frontend/js/whiteboard.js:20645 |
| `clearWbSelection` | frontend/js/whiteboard.js:5052 |
| `createConceptMap` | frontend/js/whiteboard.js:21083 |
| `createNewBoard` | frontend/js/whiteboard.js:15904 |
| `deleteWbSelection` | frontend/js/whiteboard.js:5616 |
| `dragEndNode` | frontend/js/whiteboard.js:20361 |
| `dragStart` | frontend/js/whiteboard.js:20188 |
| `dragging` | frontend/js/whiteboard.js:20247 |
| `drawLibraryBoardsGallery` | frontend/js/whiteboard.js:20734 |
| `fetchWhiteboardState` | frontend/js/whiteboard.js:15626 |
| `handleWbZoom` | frontend/js/whiteboard.js:499 |
| `initWhiteboard` | frontend/js/whiteboard.js:11643 |
| `openWhiteboardBoard` | frontend/js/whiteboard.js:20942 |
| `pickNotesDialog` | frontend/js/whiteboard.js:21467 |
| `redrawLibraryBoardsGallery` | frontend/js/whiteboard.js:20703 |
| `refreshBoardList` | frontend/js/whiteboard.js:15665 |
| `renameCurrentBoard` | frontend/js/whiteboard.js:15769 |
| `renderBoardTypeFilter` | frontend/js/whiteboard.js:20664 |
| `renderLibraryBoardsGallery` | frontend/js/whiteboard.js:20708 |
| `renderWbGestureHints` | frontend/js/whiteboard.js:21014 |
| `renderWbLibrary` | frontend/js/whiteboard.js:15549 |
| `renderWbObjects` | frontend/js/whiteboard.js:19212 |
| `renderWhiteboard` | frontend/js/whiteboard.js:17994 |
| `renderWhiteboardNow` | frontend/js/whiteboard.js:17972 |
| `selectWbItem` | frontend/js/whiteboard.js:4935 |
| `toggleWhiteboardFullscreen` | frontend/js/whiteboard.js:21162 |
| `uploadToLibrary` | frontend/js/whiteboard.js:11204 |
| `wbAddBoardToNote` | frontend/js/whiteboard.js:10132 |
| `wbAlignGuideColor` | frontend/js/whiteboard.js:1073 |
| `wbAlignSelection` | frontend/js/whiteboard.js:3775 |
| `wbAlignmentGuides` | frontend/js/whiteboard.js:939 |
| `wbAnchorDelta` | frontend/js/whiteboard.js:6893 |
| `wbAnchorPlaced` | frontend/js/whiteboard.js:6938 |
| `wbAnchorPoint` | frontend/js/whiteboard.js:2872 |
| `wbAnchorPositions` | frontend/js/whiteboard.js:2857 |
| `wbAngleFromCenterDeg` | frontend/js/whiteboard.js:8680 |
| `wbAnnounce` | frontend/js/whiteboard.js:5010 |
| `wbApplyBackground` | frontend/js/whiteboard.js:1135 |
| `wbApplyBulkMove` | frontend/js/whiteboard.js:6038 |
| `wbApplyContextRow` | frontend/js/whiteboard.js:4287 |
| `wbApplyGrid` | frontend/js/whiteboard.js:1107 |
| `wbApplyHistoryEntry` | frontend/js/whiteboard.js:8687 |
| `wbApplyLineJumps` | frontend/js/whiteboard.js:3596 |
| `wbApplySearchHighlight` | frontend/js/whiteboard.js:2539 |
| `wbApplySelectionHighlight` | frontend/js/whiteboard.js:4883 |
| `wbApplyZoomTransform` | frontend/js/whiteboard.js:382 |
| `wbArrangeGridSelection` | frontend/js/whiteboard.js:3866 |
| `wbArrangeMindMap` | frontend/js/whiteboard.js:4579 |
| `wbArrowHeadPath` | frontend/js/whiteboard.js:1405 |
| `wbAttachEditorMenu` | frontend/js/whiteboard.js:8448 |
| `wbAxisLock` | frontend/js/whiteboard.js:6355 |
| `wbBarSideEdges` | frontend/js/whiteboard.js:5290 |
| `wbBase64` | frontend/js/whiteboard.js:11048 |
| `wbBeginGesture` | frontend/js/whiteboard.js:6109 |
| `wbBeginTextEdit` | frontend/js/whiteboard.js:8393 |
| `wbBinBoard` | frontend/js/whiteboard.js:10163 |
| `wbBoardBackground` | frontend/js/whiteboard.js:1121 |
| `wbBoardBounds` | frontend/js/whiteboard.js:10280 |
| `wbBoardCountWords` | frontend/js/whiteboard.js:15747 |
| `wbBoardPointOf` | frontend/js/whiteboard.js:9269 |
| `wbBoardReplaceAll` | frontend/js/whiteboard.js:2466 |
| `wbBoardRows` | frontend/js/whiteboard.js:8122 |
| `wbBoardSearchGo` | frontend/js/whiteboard.js:2570 |
| `wbBoardSearchRun` | frontend/js/whiteboard.js:2502 |
| `wbBoardSettings` | frontend/js/whiteboard.js:8133 |
| `wbBoardTitleForExport` | frontend/js/whiteboard.js:11156 |
| `wbBoxCenter` | frontend/js/whiteboard.js:2703 |
| `wbBoxRayIntersection` | frontend/js/whiteboard.js:2988 |
| `wbBoxesOverlap` | frontend/js/whiteboard.js:5711 |
| `wbBucketFillSketch` | frontend/js/whiteboard.js:16682 |
| `wbBuildContextMenu` | frontend/js/whiteboard.js:7167 |
| `wbBuildExportSvg` | frontend/js/whiteboard.js:10467 |
| `wbBuildFrame` | frontend/js/whiteboard.js:10041 |
| `wbBulkGroupBox` | frontend/js/whiteboard.js:894 |
| `wbBulkMoveElement` | frontend/js/whiteboard.js:6032 |
| `wbBulkUndoEntries` | frontend/js/whiteboard.js:6365 |
| `wbBulletTextLines` | frontend/js/whiteboard.js:8376 |
| `wbCancelGesture` | frontend/js/whiteboard.js:6121 |
| `wbCanvasOrigin` | frontend/js/whiteboard.js:443 |
| `wbCanvasOriginRect` | frontend/js/whiteboard.js:413 |
| `wbCapPath` | frontend/js/whiteboard.js:1469 |
| `wbCaptureBulkMoveOrigin` | frontend/js/whiteboard.js:5882 |
| `wbCarryWaypoints` | frontend/js/whiteboard.js:6475 |
| `wbCenterOn` | frontend/js/whiteboard.js:2001 |
| `wbClearAlignmentGuides` | frontend/js/whiteboard.js:1103 |
| `wbClearAnchorHints` | frontend/js/whiteboard.js:3725 |
| `wbClearBoard` | frontend/js/whiteboard.js:10195 |
| `wbClearCanvasRectCache` | frontend/js/whiteboard.js:408 |
| `wbClearGuideBoxCache` | frontend/js/whiteboard.js:863 |
| `wbClearSelectionOverlays` | frontend/js/whiteboard.js:203 |
| `wbClearSketchHandles` | frontend/js/whiteboard.js:16825 |
| `wbClientToBoard` | frontend/js/whiteboard.js:459 |
| `wbClipboardText` | frontend/js/whiteboard.js:6718 |
| `wbClippedCardCount` | frontend/js/whiteboard.js:11441 |
| `wbCloneConnect` | frontend/js/whiteboard.js:6992 |
| `wbCloneSource` | frontend/js/whiteboard.js:6980 |
| `wbCloseBoardSearch` | frontend/js/whiteboard.js:2590 |
| `wbCloseComments` | frontend/js/whiteboard.js:9854 |
| `wbCloseContextMenu` | frontend/js/whiteboard.js:7612 |
| `wbCloseMapStripMenus` | frontend/js/whiteboard.js:5102 |
| `wbCommentAttachMarkdown` | frontend/js/whiteboard.js:9835 |
| `wbCommentRow` | frontend/js/whiteboard.js:9694 |
| `wbCommentWikiChips` | frontend/js/whiteboard.js:9820 |
| `wbCommitOpenEdit` | frontend/js/whiteboard.js:8910 |
| `wbContentBounds` | frontend/js/whiteboard.js:1814 |
| `wbContextKindOf` | frontend/js/whiteboard.js:4256 |
| `wbContextMoreWrap` | frontend/js/whiteboard.js:4316 |
| `wbCopySelectedStyle` | frontend/js/whiteboard.js:4156 |
| `wbCopySelection` | frontend/js/whiteboard.js:6643 |
| `wbCopyableSelection` | frontend/js/whiteboard.js:6612 |
| `wbCreateBlankBoard` | frontend/js/whiteboard.js:15974 |
| `wbCreateCopies` | frontend/js/whiteboard.js:6415 |
| `wbCreateFrame` | frontend/js/whiteboard.js:9895 |
| `wbCreateObject` | frontend/js/whiteboard.js:8952 |
| `wbCreateSticky` | frontend/js/whiteboard.js:9008 |
| `wbCreateTextBox` | frontend/js/whiteboard.js:9064 |
| `wbCubicAt` | frontend/js/whiteboard.js:3445 |
| `wbCullNow` | frontend/js/whiteboard.js:606 |
| `wbCursorForTool` | frontend/js/whiteboard.js:1561 |
| `wbCursorUrl` | frontend/js/whiteboard.js:1225 |
| `wbCurvePathD` | frontend/js/whiteboard.js:3455 |
| `wbCurveThroughSegs` | frontend/js/whiteboard.js:3427 |
| `wbCutSelection` | frontend/js/whiteboard.js:7137 |
| `wbDashArray` | frontend/js/whiteboard.js:1383 |
| `wbDeleteBoard` | frontend/js/whiteboard.js:10180 |
| `wbDeleteCurrentBoard` | frontend/js/whiteboard.js:10146 |
| `wbDetachEditorMenu` | frontend/js/whiteboard.js:8462 |
| `wbDetectArrowStyle` | frontend/js/whiteboard.js:16754 |
| `wbDistributeSelection` | frontend/js/whiteboard.js:3824 |
| `wbDragExcludeKeys` | frontend/js/whiteboard.js:934 |
| `wbDragIsBulkMove` | frontend/js/whiteboard.js:5873 |
| `wbDrawSketchHandles` | frontend/js/whiteboard.js:17741 |
| `wbDropCopies` | frontend/js/whiteboard.js:6397 |
| `wbDropUndoEntry` | frontend/js/whiteboard.js:8033 |
| `wbDuplicateSelection` | frontend/js/whiteboard.js:7119 |
| `wbEdgeNormal` | frontend/js/whiteboard.js:2911 |
| `wbEdgePoint` | frontend/js/whiteboard.js:2743 |
| `wbEditCommentRow` | frontend/js/whiteboard.js:9765 |
| `wbEditFrameTitle` | frontend/js/whiteboard.js:10009 |
| `wbEditLinkLabel` | frontend/js/whiteboard.js:16601 |
| `wbEditNodeText` | frontend/js/whiteboard.js:4723 |
| `wbEditShapeLabel` | frontend/js/whiteboard.js:16455 |
| `wbEditableSurface` | frontend/js/whiteboard.js:8468 |
| `wbEditedText` | frontend/js/whiteboard.js:8585 |
| `wbElbowCrosses` | frontend/js/whiteboard.js:3300 |
| `wbElbowDetour` | frontend/js/whiteboard.js:3391 |
| `wbElbowEnds` | frontend/js/whiteboard.js:3647 |
| `wbElbowFloat` | frontend/js/whiteboard.js:3631 |
| `wbElbowLeg` | frontend/js/whiteboard.js:3311 |
| `wbElbowPathD` | frontend/js/whiteboard.js:3406 |
| `wbElbowRoute` | frontend/js/whiteboard.js:3331 |
| `wbElbowSide` | frontend/js/whiteboard.js:3294 |
| `wbEllipseRayIntersection` | frontend/js/whiteboard.js:2943 |
| `wbEndGesture` | frontend/js/whiteboard.js:6114 |
| `wbEndPanShield` | frontend/js/whiteboard.js:495 |
| `wbEndTextEdit` | frontend/js/whiteboard.js:8647 |
| `wbEnsureReplaceRow` | frontend/js/whiteboard.js:2603 |
| `wbEntryBox` | frontend/js/whiteboard.js:17286 |
| `wbEntryOutlineBox` | frontend/js/whiteboard.js:17318 |
| `wbExportBoard` | frontend/js/whiteboard.js:11466 |
| `wbExportColour` | frontend/js/whiteboard.js:10384 |
| `wbExportDescription` | frontend/js/whiteboard.js:11191 |
| `wbExportFileName` | frontend/js/whiteboard.js:11165 |
| `wbExportFrame` | frontend/js/whiteboard.js:11457 |
| `wbExportMapText` | frontend/js/whiteboard.js:10851 |
| `wbExportPaint` | frontend/js/whiteboard.js:10415 |
| `wbExportPdf` | frontend/js/whiteboard.js:11287 |
| `wbExportPng` | frontend/js/whiteboard.js:11249 |
| `wbExportPngPrefs` | frontend/js/whiteboard.js:11175 |
| `wbExportSegment` | frontend/js/whiteboard.js:11403 |
| `wbExportSvg` | frontend/js/whiteboard.js:11123 |
| `wbExportTopicEffect` | frontend/js/whiteboard.js:10429 |
| `wbExportTopicGlyph` | frontend/js/whiteboard.js:10448 |
| `wbExtractNotes` | frontend/js/whiteboard.js:3951 |
| `wbFillComments` | frontend/js/whiteboard.js:9653 |
| `wbFillContextBar` | frontend/js/whiteboard.js:4373 |
| `wbFillPaperSwatches` | frontend/js/whiteboard.js:9026 |
| `wbFindItem` | frontend/js/whiteboard.js:9360 |
| `wbFinishDrag` | frontend/js/whiteboard.js:6458 |
| `wbFitToText` | frontend/js/whiteboard.js:18941 |
| `wbFlushNudge` | frontend/js/whiteboard.js:4020 |
| `wbFlushZoomFrame` | frontend/js/whiteboard.js:550 |
| `wbFollowLiveShape` | frontend/js/whiteboard.js:17707 |
| `wbForgetLinkItems` | frontend/js/whiteboard.js:3065 |
| `wbForgetLinks` | frontend/js/whiteboard.js:8215 |
| `wbForwardGripContextMenu` | frontend/js/whiteboard.js:16839 |
| `wbFrameContents` | frontend/js/whiteboard.js:9915 |
| `wbFrameDragOrigin` | frontend/js/whiteboard.js:10001 |
| `wbFrameFit` | frontend/js/whiteboard.js:9942 |
| `wbFrameMapOnOpen` | frontend/js/whiteboard.js:1987 |
| `wbFrameTitle` | frontend/js/whiteboard.js:9882 |
| `wbFrameZ` | frontend/js/whiteboard.js:9888 |
| `wbFramesInOrder` | frontend/js/whiteboard.js:21212 |
| `wbFreeArea` | frontend/js/whiteboard.js:1849 |
| `wbFreeCanvasRect` | frontend/js/whiteboard.js:6833 |
| `wbGenerateMapFromNotes` | frontend/js/whiteboard.js:10903 |
| `wbGridType` | frontend/js/whiteboard.js:789 |
| `wbGroupSelection` | frontend/js/whiteboard.js:1651 |
| `wbGuardMenuCorner` | frontend/js/whiteboard.js:7656 |
| `wbGuideBoxes` | frontend/js/whiteboard.js:836 |
| `wbHandleItemClick` | frontend/js/whiteboard.js:5572 |
| `wbHiddenOnBoard` | frontend/js/whiteboard.js:9178 |
| `wbHideSelectionActions` | frontend/js/whiteboard.js:4320 |
| `wbHighlighterBlend` | frontend/js/whiteboard.js:1337 |
| `wbHighlighterWidth` | frontend/js/whiteboard.js:1324 |
| `wbHistoryFor` | frontend/js/whiteboard.js:7986 |
| `wbHistoryFromRows` | frontend/js/whiteboard.js:8146 |
| `wbHistoryRestore` | frontend/js/whiteboard.js:8004 |
| `wbHollowInset` | frontend/js/whiteboard.js:1455 |
| `wbImportOutlineFile` | frontend/js/whiteboard.js:11055 |
| `wbIndentEditableLines` | frontend/js/whiteboard.js:8596 |
| `wbInlineSvgImages` | frontend/js/whiteboard.js:10785 |
| `wbIsBareCanvas` | frontend/js/whiteboard.js:128 |
| `wbIsEditingTarget` | frontend/js/whiteboard.js:7929 |
| `wbIsLinkRow` | frontend/js/whiteboard.js:8138 |
| `wbIsLocked` | frontend/js/whiteboard.js:9102 |
| `wbIsSecondTouch` | frontend/js/whiteboard.js:6175 |
| `wbIsSticky` | frontend/js/whiteboard.js:9002 |
| `wbItemBBox` | frontend/js/whiteboard.js:1725 |
| `wbItemComments` | frontend/js/whiteboard.js:9354 |
| `wbItemEdgeDir` | frontend/js/whiteboard.js:2785 |
| `wbItemElement` | frontend/js/whiteboard.js:1706 |
| `wbItemHidden` | frontend/js/whiteboard.js:5773 |
| `wbItemRotation` | frontend/js/whiteboard.js:2689 |
| `wbItemSpokenName` | frontend/js/whiteboard.js:4990 |
| `wbItemTransform` | frontend/js/whiteboard.js:8654 |
| `wbKeepAspect` | frontend/js/whiteboard.js:16224 |
| `wbKeepMenuBesideBar` | frontend/js/whiteboard.js:7592 |
| `wbLaserTrail` | frontend/js/whiteboard.js:21352 |
| `wbLayoutCloneGrips` | frontend/js/whiteboard.js:7090 |
| `wbLayoutLinkLabel` | frontend/js/whiteboard.js:16570 |
| `wbLayoutShapeLabel` | frontend/js/whiteboard.js:16353 |
| `wbLeaveFullscreen` | frontend/js/whiteboard.js:20930 |
| `wbLineJumpsD` | frontend/js/whiteboard.js:3509 |
| `wbLinkAdjacency` | frontend/js/whiteboard.js:4537 |
| `wbLinkCandidateAt` | frontend/js/whiteboard.js:3119 |
| `wbLinkCandidates` | frontend/js/whiteboard.js:3086 |
| `wbLinkCaps` | frontend/js/whiteboard.js:3203 |
| `wbLinkDrawnLine` | frontend/js/whiteboard.js:17111 |
| `wbLinkEnd` | frontend/js/whiteboard.js:2935 |
| `wbLinkEndpoints` | frontend/js/whiteboard.js:3131 |
| `wbLinkItem` | frontend/js/whiteboard.js:3069 |
| `wbLinkLabelT` | frontend/js/whiteboard.js:17205 |
| `wbLinkMidpoint` | frontend/js/whiteboard.js:16548 |
| `wbLinkNearestT` | frontend/js/whiteboard.js:17212 |
| `wbLinkPathD` | frontend/js/whiteboard.js:3224 |
| `wbLinkRouteName` | frontend/js/whiteboard.js:3676 |
| `wbLinkSelectionBox` | frontend/js/whiteboard.js:5268 |
| `wbLinkShape` | frontend/js/whiteboard.js:3684 |
| `wbLinkSketchIndex` | frontend/js/whiteboard.js:20089 |
| `wbLinkTakesLabel` | frontend/js/whiteboard.js:16538 |
| `wbLinkWaypoints` | frontend/js/whiteboard.js:17099 |
| `wbLinkedSketchesFor` | frontend/js/whiteboard.js:20118 |
| `wbLinksTouching` | frontend/js/whiteboard.js:8205 |
| `wbLockHoverWanted` | frontend/js/whiteboard.js:9308 |
| `wbLockSelection` | frontend/js/whiteboard.js:9141 |
| `wbLockedItemAt` | frontend/js/whiteboard.js:9256 |
| `wbLockedItems` | frontend/js/whiteboard.js:9109 |
| `wbMapNodeScreenBox` | frontend/js/whiteboard.js:7644 |
| `wbMapNodeTakeBack` | frontend/js/whiteboard.js:19134 |
| `wbMapStripClearOfHandle` | frontend/js/whiteboard.js:5237 |
| `wbMapStripMenuOffTopic` | frontend/js/whiteboard.js:5134 |
| `wbMapStripToggles` | frontend/js/whiteboard.js:5091 |
| `wbMapTaskTallyKey` | frontend/js/whiteboard.js:20070 |
| `wbMenuAnchorOk` | frontend/js/whiteboard.js:7638 |
| `wbMenuSpotBeside` | frontend/js/whiteboard.js:7750 |
| `wbMigrateBackground` | frontend/js/whiteboard.js:1191 |
| `wbMindMapAddCard` | frontend/js/whiteboard.js:4658 |
| `wbMindMapAddChild` | frontend/js/whiteboard.js:4844 |
| `wbMindMapAddSibling` | frontend/js/whiteboard.js:4872 |
| `wbMindMapEnsureMap` | frontend/js/whiteboard.js:4647 |
| `wbMindMapSpanningTree` | frontend/js/whiteboard.js:4561 |
| `wbMoveItemBy` | frontend/js/whiteboard.js:3747 |
| `wbMultiKey` | frontend/js/whiteboard.js:1642 |
| `wbMultiSelectionEntries` | frontend/js/whiteboard.js:17259 |
| `wbMultiSnapshot` | frontend/js/whiteboard.js:17341 |
| `wbNamedLayerFlag` | frontend/js/whiteboard.js:5782 |
| `wbNavigatorDragEnd` | frontend/js/whiteboard.js:2362 |
| `wbNavigatorDragFrame` | frontend/js/whiteboard.js:2341 |
| `wbNavigatorDragMove` | frontend/js/whiteboard.js:2334 |
| `wbNavigatorDragStart` | frontend/js/whiteboard.js:2287 |
| `wbNavigatorFrozenProjection` | frontend/js/whiteboard.js:2135 |
| `wbNavigatorIsSelected` | frontend/js/whiteboard.js:2149 |
| `wbNavigatorMapping` | frontend/js/whiteboard.js:2121 |
| `wbNavigatorOpen` | frontend/js/whiteboard.js:2031 |
| `wbNavigatorPlaceViewport` | frontend/js/whiteboard.js:2202 |
| `wbNavigatorProjectionFor` | frontend/js/whiteboard.js:2096 |
| `wbNavigatorSelectionKey` | frontend/js/whiteboard.js:2144 |
| `wbNavigatorSnapshot` | frontend/js/whiteboard.js:2069 |
| `wbNavigatorUpdateViewport` | frontend/js/whiteboard.js:2232 |
| `wbNearestAnchor` | frontend/js/whiteboard.js:2883 |
| `wbNewUntitledBoard` | frontend/js/whiteboard.js:15837 |
| `wbNudgeSelection` | frontend/js/whiteboard.js:4032 |
| `wbNudgeShapeLabel` | frontend/js/whiteboard.js:16401 |
| `wbObjectPaintKey` | frontend/js/whiteboard.js:20041 |
| `wbOnBoardCopy` | frontend/js/whiteboard.js:6736 |
| `wbOnLockHoverMove` | frontend/js/whiteboard.js:9316 |
| `wbOnLockPress` | frontend/js/whiteboard.js:9330 |
| `wbOpenBoardSearch` | frontend/js/whiteboard.js:2651 |
| `wbOpenComments` | frontend/js/whiteboard.js:9461 |
| `wbOpenContextMenuFor` | frontend/js/whiteboard.js:7815 |
| `wbOpenMapNodeMenu` | frontend/js/whiteboard.js:7677 |
| `wbOpenSketchLabelEditor` | frontend/js/whiteboard.js:16476 |
| `wbOwnsChord` | frontend/js/whiteboard.js:3995 |
| `wbPaintCommentMarks` | frontend/js/whiteboard.js:9387 |
| `wbPaintFrame` | frontend/js/whiteboard.js:10061 |
| `wbPaintHidden` | frontend/js/whiteboard.js:9191 |
| `wbPaintLinkLabel` | frontend/js/whiteboard.js:16581 |
| `wbPaintLockHover` | frontend/js/whiteboard.js:9273 |
| `wbPaintLocks` | frontend/js/whiteboard.js:9229 |
| `wbPaintShapeLabel` | frontend/js/whiteboard.js:16417 |
| `wbPaintStickyDates` | frontend/js/whiteboard.js:19161 |
| `wbPaintTextContent` | frontend/js/whiteboard.js:8341 |
| `wbParkContextOnRail` | frontend/js/whiteboard.js:4331 |
| `wbPasteClipboard` | frontend/js/whiteboard.js:6699 |
| `wbPasteCopiedStyle` | frontend/js/whiteboard.js:4180 |
| `wbPastePlan` | frontend/js/whiteboard.js:6757 |
| `wbPasteText` | frontend/js/whiteboard.js:6768 |
| `wbPastedLines` | frontend/js/whiteboard.js:6747 |
| `wbPathBBox` | frontend/js/whiteboard.js:16162 |
| `wbPathPolyline` | frontend/js/whiteboard.js:2710 |
| `wbPickStyle` | frontend/js/whiteboard.js:4145 |
| `wbPillRayIntersection` | frontend/js/whiteboard.js:2953 |
| `wbPlaceBox` | frontend/js/whiteboard.js:10081 |
| `wbPlaceCopies` | frontend/js/whiteboard.js:6677 |
| `wbPlacedBounds` | frontend/js/whiteboard.js:6907 |
| `wbPointInItem` | frontend/js/whiteboard.js:3111 |
| `wbPointerOnBoard` | frontend/js/whiteboard.js:6596 |
| `wbPolylineAt` | frontend/js/whiteboard.js:3657 |
| `wbPortFractions` | frontend/js/whiteboard.js:2805 |
| `wbPortsForPath` | frontend/js/whiteboard.js:2825 |
| `wbPresentLaser` | frontend/js/whiteboard.js:21322 |
| `wbPresentLaserButton` | frontend/js/whiteboard.js:21314 |
| `wbPresentShow` | frontend/js/whiteboard.js:21277 |
| `wbPresentSteps` | frontend/js/whiteboard.js:21233 |
| `wbPublishInvZoom` | frontend/js/whiteboard.js:767 |
| `wbPushDragUndo` | frontend/js/whiteboard.js:6450 |
| `wbPushMoveBatch` | frontend/js/whiteboard.js:3766 |
| `wbPushUndo` | frontend/js/whiteboard.js:8039 |
| `wbQueueSelectionBar` | frontend/js/whiteboard.js:5211 |
| `wbRasterizeSvg` | frontend/js/whiteboard.js:10808 |
| `wbRecordGesture` | frontend/js/whiteboard.js:8176 |
| `wbRedo` | frontend/js/whiteboard.js:8936 |
| `wbRefitIfFitted` | frontend/js/whiteboard.js:1887 |
| `wbRefreshHighlighterBlend` | frontend/js/whiteboard.js:1349 |
| `wbRefreshRaster` | frontend/js/whiteboard.js:759 |
| `wbRegenerateShapeCaps` | frontend/js/whiteboard.js:16734 |
| `wbRegisterCommentSurfaces` | frontend/js/whiteboard.js:9847 |
| `wbRegisterEditorContexts` | frontend/js/whiteboard.js:8444 |
| `wbRemapUndoIds` | frontend/js/whiteboard.js:8060 |
| `wbRememberedBoardKind` | frontend/js/whiteboard.js:15886 |
| `wbRenderCloneGrips` | frontend/js/whiteboard.js:7045 |
| `wbRenderLinkEndpointHandles` | frontend/js/whiteboard.js:16857 |
| `wbRenderLinkLabelGrip` | frontend/js/whiteboard.js:17156 |
| `wbRenderMultiSelectionHandles` | frontend/js/whiteboard.js:17392 |
| `wbRenderNavigator` | frontend/js/whiteboard.js:2154 |
| `wbRenderRelease` | frontend/js/whiteboard.js:5311 |
| `wbRenderSketchHandles` | frontend/js/whiteboard.js:17719 |
| `wbRenderWaypointHandles` | frontend/js/whiteboard.js:17005 |
| `wbReplaceText` | frontend/js/whiteboard.js:2449 |
| `wbResetRotation` | frontend/js/whiteboard.js:18907 |
| `wbResolveLinkEndpoints` | frontend/js/whiteboard.js:3158 |
| `wbRestoreBox` | frontend/js/whiteboard.js:6342 |
| `wbRestoreLinks` | frontend/js/whiteboard.js:8222 |
| `wbRestoreMove` | frontend/js/whiteboard.js:6314 |
| `wbRestoreMultiSnapshot` | frontend/js/whiteboard.js:17354 |
| `wbReviewMapProposal` | frontend/js/whiteboard.js:10950 |
| `wbRotatePoint` | frontend/js/whiteboard.js:2695 |
| `wbSameSizeSelection` | frontend/js/whiteboard.js:3898 |
| `wbSameView` | frontend/js/whiteboard.js:1881 |
| `wbSaveBulkMove` | frontend/js/whiteboard.js:6550 |
| `wbSaveExpandedNodes` | frontend/js/whiteboard.js:263 |
| `wbSaveMapBulkMove` | frontend/js/whiteboard.js:6524 |
| `wbSaveMultiSnapshot` | frontend/js/whiteboard.js:17372 |
| `wbSaveNode` | frontend/js/whiteboard.js:19064 |
| `wbSaveObject` | frontend/js/whiteboard.js:19087 |
| `wbSaveSketchD` | frontend/js/whiteboard.js:16673 |
| `wbSaveSketchProps` | frontend/js/whiteboard.js:16644 |
| `wbSaveToLibrary` | frontend/js/whiteboard.js:11278 |
| `wbScheduleCardClampSync` | frontend/js/whiteboard.js:311 |
| `wbScheduleCull` | frontend/js/whiteboard.js:589 |
| `wbScheduleRender` | frontend/js/whiteboard.js:17957 |
| `wbScheduleStickyDates` | frontend/js/whiteboard.js:19156 |
| `wbScreenToBoard` | frontend/js/whiteboard.js:434 |
| `wbSearchItem` | frontend/js/whiteboard.js:2535 |
| `wbSearchTextFor` | frontend/js/whiteboard.js:2416 |
| `wbSegmentCross` | frontend/js/whiteboard.js:3493 |
| `wbSelectAllItems` | frontend/js/whiteboard.js:4955 |
| `wbSelectableItems` | frontend/js/whiteboard.js:4968 |
| `wbSelectedKeys` | frontend/js/whiteboard.js:10364 |
| `wbSelectedSketchOrNull` | frontend/js/whiteboard.js:4110 |
| `wbSelectedTextObjectOrNull` | frontend/js/whiteboard.js:4115 |
| `wbSelectionBounds` | frontend/js/whiteboard.js:10327 |
| `wbSelectionEntries` | frontend/js/whiteboard.js:3732 |
| `wbSendSelectionZOrder` | frontend/js/whiteboard.js:5852 |
| `wbSetBackground` | frontend/js/whiteboard.js:1162 |
| `wbSetComments` | frontend/js/whiteboard.js:9365 |
| `wbSetExportPngPrefs` | frontend/js/whiteboard.js:11183 |
| `wbSetHidden` | frontend/js/whiteboard.js:9207 |
| `wbSetHiddenKeys` | frontend/js/whiteboard.js:9182 |
| `wbSetLocked` | frontend/js/whiteboard.js:9119 |
| `wbSetMenuSpot` | frontend/js/whiteboard.js:7786 |
| `wbSetStickyPaper` | frontend/js/whiteboard.js:9046 |
| `wbSetZOrder` | frontend/js/whiteboard.js:5672 |
| `wbShaftEnd` | frontend/js/whiteboard.js:1461 |
| `wbShaftPoints` | frontend/js/whiteboard.js:3557 |
| `wbShapeAt` | frontend/js/whiteboard.js:1244 |
| `wbShapeDims` | frontend/js/whiteboard.js:1398 |
| `wbShapeLabelArea` | frontend/js/whiteboard.js:16295 |
| `wbShapeLabelInk` | frontend/js/whiteboard.js:16411 |
| `wbShapeLabelKind` | frontend/js/whiteboard.js:16283 |
| `wbShapePoly` | frontend/js/whiteboard.js:1245 |
| `wbShowAlignmentGuides` | frontend/js/whiteboard.js:1080 |
| `wbShowAnchorHints` | frontend/js/whiteboard.js:3696 |
| `wbShowBoardsLanding` | frontend/js/whiteboard.js:20564 |
| `wbShowCanvasView` | frontend/js/whiteboard.js:20558 |
| `wbShowToolSettings` | frontend/js/whiteboard.js:4096 |
| `wbSizeItemTo` | frontend/js/whiteboard.js:3921 |
| `wbSketchAngleFromCenterDeg` | frontend/js/whiteboard.js:8672 |
| `wbSketchCaps` | frontend/js/whiteboard.js:16790 |
| `wbSketchData` | frontend/js/whiteboard.js:9093 |
| `wbSketchHiddenOnBoard` | frontend/js/whiteboard.js:9170 |
| `wbSketchIsArrow` | frontend/js/whiteboard.js:16703 |
| `wbSketchIsClosedShape` | frontend/js/whiteboard.js:16264 |
| `wbSketchIsDrawable` | frontend/js/whiteboard.js:3024 |
| `wbSketchParsedData` | frontend/js/whiteboard.js:16625 |
| `wbSketchResizeTransform` | frontend/js/whiteboard.js:16229 |
| `wbSketchTakesCaps` | frontend/js/whiteboard.js:16710 |
| `wbSnap` | frontend/js/whiteboard.js:805 |
| `wbSnapOn` | frontend/js/whiteboard.js:793 |
| `wbSpacingSeries` | frontend/js/whiteboard.js:1030 |
| `wbSquareCorner` | frontend/js/whiteboard.js:10095 |
| `wbStableDragContainer` | frontend/js/whiteboard.js:8318 |
| `wbStampMenuRoles` | frontend/js/whiteboard.js:11627 |
| `wbStartPanShield` | frontend/js/whiteboard.js:488 |
| `wbStartPresenting` | frontend/js/whiteboard.js:21249 |
| `wbStepSelectionZOrder` | frontend/js/whiteboard.js:5790 |
| `wbStickerSize` | frontend/js/whiteboard.js:4152 |
| `wbStickyFolds` | frontend/js/whiteboard.js:8998 |
| `wbStickyRemind` | frontend/js/whiteboard.js:19194 |
| `wbStopPresenting` | frontend/js/whiteboard.js:21366 |
| `wbSvgEscape` | frontend/js/whiteboard.js:10237 |
| `wbSvgText` | frontend/js/whiteboard.js:10268 |
| `wbSvgWrapLines` | frontend/js/whiteboard.js:10249 |
| `wbSyncBoardCount` | frontend/js/whiteboard.js:15753 |
| `wbSyncCardClamps` | frontend/js/whiteboard.js:288 |
| `wbSyncExportSeg` | frontend/js/whiteboard.js:11420 |
| `wbSyncGridToTransform` | frontend/js/whiteboard.js:685 |
| `wbTakesComments` | frontend/js/whiteboard.js:9349 |
| `wbThemeBoardHex` | frontend/js/whiteboard.js:1127 |
| `wbToggleNavigator` | frontend/js/whiteboard.js:2381 |
| `wbToggleReplace` | frontend/js/whiteboard.js:2641 |
| `wbToolCaps` | frontend/js/whiteboard.js:16718 |
| `wbTouchSlopStep` | frontend/js/whiteboard.js:6162 |
| `wbTrackMapStripMenu` | frontend/js/whiteboard.js:5115 |
| `wbTransformPathD` | frontend/js/whiteboard.js:16064 |
| `wbTranslateSelectionChrome` | frontend/js/whiteboard.js:5994 |
| `wbTrashDelete` | frontend/js/whiteboard.js:6273 |
| `wbTrashHide` | frontend/js/whiteboard.js:6222 |
| `wbTrashSetHot` | frontend/js/whiteboard.js:6215 |
| `wbTrashTake` | frontend/js/whiteboard.js:6258 |
| `wbTrashTarget` | frontend/js/whiteboard.js:6199 |
| `wbUndo` | frontend/js/whiteboard.js:8915 |
| `wbUngroupSelection` | frontend/js/whiteboard.js:1674 |
| `wbUnlockAll` | frontend/js/whiteboard.js:9158 |
| `wbUpdateContextBar` | frontend/js/whiteboard.js:4362 |
| `wbUpdateLinkedSketches` | frontend/js/whiteboard.js:20154 |
| `wbUpdateSearchCount` | frontend/js/whiteboard.js:2556 |
| `wbUpdateSelectionBar` | frontend/js/whiteboard.js:5328 |
| `wbUpdateUndoRedoButtons` | frontend/js/whiteboard.js:8018 |
| `wbViewCentre` | frontend/js/whiteboard.js:6866 |
| `wbVisibleBounds` | frontend/js/whiteboard.js:10347 |
| `wbVisibleCanvasRect` | frontend/js/whiteboard.js:6855 |
| `wbWalkItems` | frontend/js/whiteboard.js:5021 |
| `wbWaypointAddSpots` | frontend/js/whiteboard.js:17124 |
| `wbWaypointInsert` | frontend/js/whiteboard.js:3474 |
| `wbWireContextMenu` | frontend/js/whiteboard.js:7934 |
| `wbWithDir` | frontend/js/whiteboard.js:2927 |
| `wbWrapShapeLabel` | frontend/js/whiteboard.js:16320 |
| `wbWrapTextSelection` | frontend/js/whiteboard.js:8356 |
| `wbWriteZ` | frontend/js/whiteboard.js:5814 |
| `wbZOrderPeers` | frontend/js/whiteboard.js:5662 |
| `wbZOrderStepPeers` | frontend/js/whiteboard.js:5757 |
| `wbZOrderStepPlan` | frontend/js/whiteboard.js:5715 |
| `wbZOrderTargets` | frontend/js/whiteboard.js:5834 |
| `wbZoomFilter` | frontend/js/whiteboard.js:79 |
| `wbZoomFrameWork` | frontend/js/whiteboard.js:511 |
| `wbZoomToFit` | frontend/js/whiteboard.js:1899 |

### frontend/js/writing-desk.js (6)

| Name | File:line |
|---|---|
| `composeDraft` | frontend/js/writing-desk.js:19 |
| `draftWithHeading` | frontend/js/writing-desk.js:218 |
| `saveDraftAsNote` | frontend/js/writing-desk.js:223 |
| `setDraftBusy` | frontend/js/writing-desk.js:296 |
| `streamDraft` | frontend/js/writing-desk.js:136 |
| `suggestDraftTitle` | frontend/js/writing-desk.js:174 |

### frontend/sw.js (6)

| Name | File:line |
|---|---|
| `actOnReminder` | frontend/sw.js:170 |
| `appWindows` | frontend/sw.js:165 |
| `cacheable` | frontend/sw.js:55 |
| `keepOfflinePage` | frontend/sw.js:72 |
| `openReminders` | frontend/sw.js:180 |
| `storable` | frontend/sw.js:64 |

## Frontend ids (2423)

Every `id="..."` in `frontend/index.html`, sorted by id.

| Id | File:line |
|---|---|
| `about-emblem` | frontend/index.html:13516 |
| `about-force-reload` | frontend/index.html:13535 |
| `about-install` | frontend/index.html:13545 |
| `about-install-help` | frontend/index.html:13553 |
| `about-install-note` | frontend/index.html:13546 |
| `about-install-row` | frontend/index.html:13544 |
| `about-motion` | frontend/index.html:13526 |
| `about-restart` | frontend/index.html:13534 |
| `about-restart-row` | frontend/index.html:13533 |
| `about-shortcuts` | frontend/index.html:13864 |
| `about-take-tour` | frontend/index.html:13845 |
| `about-version` | frontend/index.html:13523 |
| `accent-custom` | frontend/index.html:10714 |
| `accent-custom-clear` | frontend/index.html:10715 |
| `accent-offer` | frontend/index.html:10722 |
| `accent-offer-dot` | frontend/index.html:10724 |
| `accent-offer-label` | frontend/index.html:10724 |
| `accent-offer-text` | frontend/index.html:10723 |
| `accent-offer-use` | frontend/index.html:10724 |
| `accent-preview` | frontend/index.html:10716 |
| `accent-swatches` | frontend/index.html:10704 |
| `account-allow-lan` | frontend/index.html:12946 |
| `account-change` | frontend/index.html:13075 |
| `account-confirm` | frontend/index.html:13072 |
| `account-current` | frontend/index.html:13066 |
| `account-facts` | frontend/index.html:12853 |
| `account-help` | frontend/index.html:12842 |
| `account-idle-ttl` | frontend/index.html:13129 |
| `account-lan-addresses` | frontend/index.html:12965 |
| `account-lan-allow-here` | frontend/index.html:12959 |
| `account-lan-any` | frontend/index.html:12975 |
| `account-lan-ask` | frontend/index.html:12968 |
| `account-lan-authority` | frontend/index.html:13001 |
| `account-lan-cert` | frontend/index.html:12995 |
| `account-lan-cert-expiry` | frontend/index.html:12999 |
| `account-lan-cert-names` | frontend/index.html:12998 |
| `account-lan-devices` | frontend/index.html:12986 |
| `account-lan-download` | frontend/index.html:13003 |
| `account-lan-fingerprint` | frontend/index.html:12997 |
| `account-lan-held` | frontend/index.html:12956 |
| `account-lan-held-text` | frontend/index.html:12957 |
| `account-lan-networks` | frontend/index.html:12988 |
| `account-lan-pending` | frontend/index.html:12983 |
| `account-lan-pending-wrap` | frontend/index.html:12981 |
| `account-lan-regenerate` | frontend/index.html:13009 |
| `account-lan-restart` | frontend/index.html:12990 |
| `account-lan-state` | frontend/index.html:12952 |
| `account-lan-trust` | frontend/index.html:12966 |
| `account-lock-all` | frontend/index.html:13139 |
| `account-new` | frontend/index.html:13069 |
| `account-password-on-open` | frontend/index.html:12875 |
| `account-recovery-make` | frontend/index.html:13172 |
| `account-recovery-state` | frontend/index.html:13156 |
| `account-recovery-status` | frontend/index.html:13173 |
| `account-rekey` | frontend/index.html:13105 |
| `account-rekey-status` | frontend/index.html:13106 |
| `account-status` | frontend/index.html:13076 |
| `activity-empty` | frontend/index.html:893 |
| `activity-finished` | frontend/index.html:896 |
| `activity-help` | frontend/index.html:875 |
| `activity-list` | frontend/index.html:892 |
| `activity-model` | frontend/index.html:891 |
| `activity-more` | frontend/index.html:865 |
| `activity-running` | frontend/index.html:890 |
| `activity-runs` | frontend/index.html:898 |
| `activity-tab-running` | frontend/index.html:887 |
| `activity-tab-runs` | frontend/index.html:888 |
| `activity-tabs` | frontend/index.html:886 |
| `agent-monitor` | frontend/index.html:853 |
| `agent-monitor-clear` | frontend/index.html:866 |
| `agent-monitor-close` | frontend/index.html:871 |
| `agent-monitor-empty` | frontend/index.html:900 |
| `agent-monitor-log-toggle` | frontend/index.html:868 |
| `agent-monitor-logs` | frontend/index.html:901 |
| `agent-monitor-runs` | frontend/index.html:899 |
| `ai-answer` | frontend/index.html:2242 |
| `ai-answer-grounding` | frontend/index.html:2247 |
| `ai-mark` | frontend/index.html:8474 |
| `ai-status` | frontend/index.html:8476 |
| `ai-status-detail` | frontend/index.html:8483 |
| `ai-status-label` | frontend/index.html:8479 |
| `ai-status-popup` | frontend/index.html:8481 |
| `ai-status-title` | frontend/index.html:8482 |
| `always-available-help` | frontend/index.html:11529 |
| `answered-by` | frontend/index.html:2215 |
| `app-cache-help` | frontend/index.html:12732 |
| `app-main` | frontend/index.html:1275 |
| `app-quit` | frontend/index.html:12321 |
| `appearance-reset` | frontend/index.html:11380 |
| `ask` | frontend/index.html:2011 |
| `ask-answer-foot` | frontend/index.html:2257 |
| `ask-answer-related` | frontend/index.html:2258 |
| `ask-answer-sources` | frontend/index.html:2259 |
| `ask-as-of` | frontend/index.html:2093 |
| `ask-as-of-clear` | frontend/index.html:2094 |
| `ask-as-of-row` | frontend/index.html:2090 |
| `ask-btn` | frontend/index.html:2125 |
| `ask-chart` | frontend/index.html:2241 |
| `ask-clear` | frontend/index.html:2103 |
| `ask-feature-model` | frontend/index.html:2040 |
| `ask-followups` | frontend/index.html:2260 |
| `ask-history-badge` | frontend/index.html:2046 |
| `ask-history-clear` | frontend/index.html:2153 |
| `ask-history-close` | frontend/index.html:2159 |
| `ask-history-empty` | frontend/index.html:2164 |
| `ask-history-list` | frontend/index.html:2163 |
| `ask-history-more` | frontend/index.html:2167 |
| `ask-history-panel` | frontend/index.html:2144 |
| `ask-history-pinned-only` | frontend/index.html:2151 |
| `ask-history-search` | frontend/index.html:2147 |
| `ask-history-toggle` | frontend/index.html:2043 |
| `ask-idle` | frontend/index.html:2174 |
| `ask-mode-select` | frontend/index.html:2109 |
| `ask-offline` | frontend/index.html:2135 |
| `ask-scope` | frontend/index.html:2080 |
| `ask-scope-clear` | frontend/index.html:2083 |
| `ask-scope-text` | frontend/index.html:2082 |
| `ask-search-tune` | frontend/index.html:2122 |
| `ask-source-help` | frontend/index.html:2051 |
| `ask-status` | frontend/index.html:2169 |
| `ask-time-travel` | frontend/index.html:2119 |
| `ask-trail` | frontend/index.html:2234 |
| `ask-use-ai` | frontend/index.html:2024 |
| `ask-use-ai-row` | frontend/index.html:2023 |
| `asked-question` | frontend/index.html:2235 |
| `assistant-avatar` | frontend/index.html:11190 |
| `assistant-avatar-row` | frontend/index.html:11185 |
| `atlas-host` | frontend/index.html:527 |
| `atlas-look` | frontend/index.html:11201 |
| `atlas-look-row` | frontend/index.html:11196 |
| `atlas-open` | frontend/index.html:13493 |
| `atlas-row-help` | frontend/index.html:13496 |
| `atlas-row-starters` | frontend/index.html:13504 |
| `atlas-style` | frontend/index.html:11179 |
| `atlas-style-row` | frontend/index.html:11174 |
| `attach-image` | frontend/index.html:3034 |
| `attach-note` | frontend/index.html:2955 |
| `autonomous-ai-help` | frontend/index.html:12105 |
| `autonomous-review` | frontend/index.html:12268 |
| `autonomous-review-clear` | frontend/index.html:12272 |
| `autonomous-review-list` | frontend/index.html:12270 |
| `autonomous-review-title` | frontend/index.html:12269 |
| `autonomous-settings-panel` | frontend/index.html:12212 |
| `autonomous-trigger` | frontend/index.html:12259 |
| `avatar-buddy` | frontend/index.html:11078 |
| `avatar-buddy-actions` | frontend/index.html:11115 |
| `avatar-buddy-actions-row` | frontend/index.html:11110 |
| `avatar-buddy-activities` | frontend/index.html:11153 |
| `avatar-buddy-activities-fold` | frontend/index.html:11151 |
| `avatar-buddy-custom` | frontend/index.html:11158 |
| `avatar-buddy-make` | frontend/index.html:11090 |
| `avatar-buddy-make-go` | frontend/index.html:11090 |
| `avatar-buddy-make-text` | frontend/index.html:11090 |
| `avatar-buddy-motion` | frontend/index.html:11129 |
| `avatar-buddy-motion-row` | frontend/index.html:11124 |
| `avatar-buddy-motion-why` | frontend/index.html:11127 |
| `avatar-buddy-name` | frontend/index.html:11164 |
| `avatar-buddy-parts` | frontend/index.html:11171 |
| `avatar-buddy-preset-name` | frontend/index.html:11147 |
| `avatar-buddy-preset-save` | frontend/index.html:11148 |
| `avatar-buddy-presets` | frontend/index.html:11145 |
| `avatar-buddy-presets-fold` | frontend/index.html:11143 |
| `avatar-buddy-recall` | frontend/index.html:11085 |
| `avatar-buddy-row` | frontend/index.html:11072 |
| `avatar-buddy-shuffle` | frontend/index.html:11167 |
| `avatar-buddy-size` | frontend/index.html:11100 |
| `avatar-buddy-size-row` | frontend/index.html:11095 |
| `avatar-follow` | frontend/index.html:11065 |
| `avatar-follow-row` | frontend/index.html:11064 |
| `avatar-motion` | frontend/index.html:11056 |
| `avatar-motion-row` | frontend/index.html:11051 |
| `backend-config` | frontend/index.html:9299 |
| `backend-help` | frontend/index.html:9308 |
| `backup-list` | frontend/index.html:12683 |
| `backup-now` | frontend/index.html:12679 |
| `backup-retention` | frontend/index.html:12691 |
| `backup-retention-row` | frontend/index.html:12689 |
| `backup-retention-status` | frontend/index.html:12692 |
| `backup-status` | frontend/index.html:12680 |
| `backups-help` | frontend/index.html:12695 |
| `batch-bar` | frontend/index.html:2462 |
| `batch-cancel` | frontend/index.html:2475 |
| `batch-category-host` | frontend/index.html:2470 |
| `batch-count` | frontend/index.html:2463 |
| `batch-delete` | frontend/index.html:2472 |
| `batch-more-host` | frontend/index.html:2474 |
| `batch-select-all` | frontend/index.html:2464 |
| `batch-tag` | frontend/index.html:2471 |
| `battery-mode-help` | frontend/index.html:12288 |
| `bench-box` | frontend/index.html:9608 |
| `bench-help` | frontend/index.html:9618 |
| `bench-models` | frontend/index.html:9633 |
| `bench-results` | frontend/index.html:9643 |
| `bench-run` | frontend/index.html:9635 |
| `bench-status` | frontend/index.html:9642 |
| `bench-stop` | frontend/index.html:9639 |
| `bg-art-style` | frontend/index.html:11257 |
| `bg-art-toggle` | frontend/index.html:11239 |
| `bg-intensity` | frontend/index.html:11283 |
| `bg-intensity-row` | frontend/index.html:11277 |
| `bg-intensity-value` | frontend/index.html:11285 |
| `bg-motion` | frontend/index.html:11269 |
| `bg-motion-hint` | frontend/index.html:11267 |
| `bg-motion-row` | frontend/index.html:11260 |
| `bg-style-hint` | frontend/index.html:11252 |
| `bg-style-row` | frontend/index.html:11246 |
| `binned-body` | frontend/index.html:13989 |
| `binned-card` | frontend/index.html:13980 |
| `binned-close` | frontend/index.html:13984 |
| `binned-meta` | frontend/index.html:13988 |
| `binned-overlay` | frontend/index.html:13978 |
| `binned-purge` | frontend/index.html:13992 |
| `binned-restore` | frontend/index.html:13991 |
| `bookmark-add` | frontend/index.html:8182 |
| `bookmark-count` | frontend/index.html:8207 |
| `bookmark-empty` | frontend/index.html:8209 |
| `bookmark-form` | frontend/index.html:8193 |
| `bookmark-form-done` | frontend/index.html:8204 |
| `bookmark-group-chips` | frontend/index.html:8206 |
| `bookmark-group-input` | frontend/index.html:8198 |
| `bookmark-group-manage` | frontend/index.html:8178 |
| `bookmark-group-new` | frontend/index.html:8176 |
| `bookmark-group-options` | frontend/index.html:8200 |
| `bookmark-help` | frontend/index.html:8166 |
| `bookmark-help-toggle` | frontend/index.html:8163 |
| `bookmark-list` | frontend/index.html:8208 |
| `bookmark-more-menu` | frontend/index.html:8169 |
| `bookmark-no-match` | frontend/index.html:8215 |
| `bookmark-no-match-clear` | frontend/index.html:8219 |
| `bookmark-no-match-text` | frontend/index.html:8218 |
| `bookmark-note-input` | frontend/index.html:8201 |
| `bookmark-search` | frontend/index.html:8146 |
| `bookmark-sort` | frontend/index.html:8154 |
| `bookmark-title-input` | frontend/index.html:8196 |
| `bookmark-url-input` | frontend/index.html:8194 |
| `boot-splash` | frontend/index.html:91 |
| `boot-splash-progress-fill` | frontend/index.html:105 |
| `border-style-seg` | frontend/index.html:10858 |
| `brand-logo` | frontend/index.html:124 |
| `browse` | frontend/index.html:2323 |
| `builtin-embed-note` | frontend/index.html:9776 |
| `builtin-model-name` | frontend/index.html:9771 |
| `captions-copy` | frontend/index.html:8431 |
| `captions-dock` | frontend/index.html:8421 |
| `captions-help` | frontend/index.html:8435 |
| `captions-help-toggle` | frontend/index.html:8432 |
| `captions-meta` | frontend/index.html:8424 |
| `captions-past` | frontend/index.html:8427 |
| `captions-running` | frontend/index.html:8428 |
| `captions-stop` | frontend/index.html:8438 |
| `capture` | frontend/index.html:1486 |
| `capture-anywhere-box` | frontend/index.html:11574 |
| `capture-anywhere-help` | frontend/index.html:11584 |
| `capture-clear` | frontend/index.html:1631 |
| `capture-command` | frontend/index.html:11596 |
| `capture-command-copy` | frontend/index.html:11597 |
| `capture-help` | frontend/index.html:1499 |
| `capture-help-hint` | frontend/index.html:1516 |
| `capture-space-hint` | frontend/index.html:1737 |
| `category-list` | frontend/index.html:1395 |
| `change-password-help` | frontend/index.html:13057 |
| `changelog-body` | frontend/index.html:13838 |
| `changelog-fold` | frontend/index.html:13836 |
| `chat-actions-menu` | frontend/index.html:2809 |
| `chat-active-model` | frontend/index.html:2691 |
| `chat-agent-hint` | frontend/index.html:3067 |
| `chat-attachments` | frontend/index.html:2894 |
| `chat-board-attachments` | frontend/index.html:2920 |
| `chat-clear` | frontend/index.html:3059 |
| `chat-compress` | frontend/index.html:2795 |
| `chat-compress-apply` | frontend/index.html:2822 |
| `chat-compress-cancel` | frontend/index.html:2823 |
| `chat-compress-panel` | frontend/index.html:2816 |
| `chat-compress-stats` | frontend/index.html:2818 |
| `chat-compress-text` | frontend/index.html:2819 |
| `chat-compressed` | frontend/index.html:2747 |
| `chat-context` | frontend/index.html:2716 |
| `chat-context-compact` | frontend/index.html:2730 |
| `chat-context-pop` | frontend/index.html:2719 |
| `chat-context-pop-fill` | frontend/index.html:2721 |
| `chat-context-pop-rows` | frontend/index.html:2722 |
| `chat-context-pop-total` | frontend/index.html:2720 |
| `chat-context-window` | frontend/index.html:2732 |
| `chat-doc-attachments` | frontend/index.html:2905 |
| `chat-dock-more-btn` | frontend/index.html:3185 |
| `chat-dock-more-panel` | frontend/index.html:3190 |
| `chat-elapsed` | frontend/index.html:3268 |
| `chat-feature-model` | frontend/index.html:3147 |
| `chat-file-attachments` | frontend/index.html:2912 |
| `chat-fork` | frontend/index.html:2792 |
| `chat-help` | frontend/index.html:2806 |
| `chat-help-text` | frontend/index.html:2807 |
| `chat-help-toggle` | frontend/index.html:2803 |
| `chat-image-attachments` | frontend/index.html:2899 |
| `chat-image-input` | frontend/index.html:3050 |
| `chat-input` | frontend/index.html:3057 |
| `chat-jump-latest` | frontend/index.html:2860 |
| `chat-jump-latest-dots` | frontend/index.html:2863 |
| `chat-jump-latest-label` | frontend/index.html:2864 |
| `chat-main` | frontend/index.html:2615 |
| `chat-messages` | frontend/index.html:2843 |
| `chat-mode-seg` | frontend/index.html:3150 |
| `chat-model-apply` | frontend/index.html:9361 |
| `chat-model-note` | frontend/index.html:9365 |
| `chat-model-panel` | frontend/index.html:8615 |
| `chat-model-select` | frontend/index.html:9360 |
| `chat-model-stop` | frontend/index.html:9363 |
| `chat-new` | frontend/index.html:2600 |
| `chat-nudge` | frontend/index.html:2942 |
| `chat-offline` | frontend/index.html:2889 |
| `chat-plan` | frontend/index.html:3113 |
| `chat-results` | frontend/index.html:2182 |
| `chat-selection-attachment` | frontend/index.html:2926 |
| `chat-send` | frontend/index.html:3061 |
| `chat-sidebar` | frontend/index.html:2579 |
| `chat-sidebar-sort` | frontend/index.html:2593 |
| `chat-skills` | frontend/index.html:3079 |
| `chat-status` | frontend/index.html:3256 |
| `chat-stop` | frontend/index.html:3062 |
| `chat-suggest` | frontend/index.html:2868 |
| `chat-title` | frontend/index.html:2680 |
| `chat-tune-search` | frontend/index.html:3233 |
| `chat-turns` | frontend/index.html:2699 |
| `chat-uncompress` | frontend/index.html:2749 |
| `chat-usage` | frontend/index.html:2742 |
| `chat-web-attachment` | frontend/index.html:2930 |
| `clear-app-cache` | frontend/index.html:12741 |
| `clear-box` | frontend/index.html:12750 |
| `clear-dismissed` | frontend/index.html:12799 |
| `clear-dismissed-what` | frontend/index.html:12797 |
| `clear-guide` | frontend/index.html:12792 |
| `clear-guide-what` | frontend/index.html:12790 |
| `clear-help` | frontend/index.html:12760 |
| `clear-previews` | frontend/index.html:12785 |
| `clear-previews-what` | frontend/index.html:12783 |
| `clear-recents` | frontend/index.html:12778 |
| `clear-recents-what` | frontend/index.html:12776 |
| `command-palette-clear` | frontend/index.html:672 |
| `command-palette-close` | frontend/index.html:638 |
| `command-palette-help` | frontend/index.html:642 |
| `command-palette-input` | frontend/index.html:669 |
| `command-palette-intro` | frontend/index.html:681 |
| `command-palette-menu` | frontend/index.html:727 |
| `command-palette-offline` | frontend/index.html:686 |
| `command-palette-overlay` | frontend/index.html:600 |
| `command-palette-results` | frontend/index.html:674 |
| `command-palette-starters` | frontend/index.html:703 |
| `command-palette-status` | frontend/index.html:718 |
| `command-palette-stop` | frontend/index.html:736 |
| `command-palette-use-note` | frontend/index.html:716 |
| `command-palette-use-note-label` | frontend/index.html:715 |
| `command-palette-use-note-text` | frontend/index.html:717 |
| `composer-voice-help` | frontend/index.html:9997 |
| `connections-card` | frontend/index.html:13950 |
| `connections-close` | frontend/index.html:13956 |
| `connections-dock` | frontend/index.html:13954 |
| `connections-list` | frontend/index.html:13962 |
| `connections-overlay` | frontend/index.html:13948 |
| `connections-status` | frontend/index.html:13961 |
| `connections-subject` | frontend/index.html:13960 |
| `connections-title` | frontend/index.html:13952 |
| `contents-collapse` | frontend/index.html:8317 |
| `contents-empty` | frontend/index.html:8335 |
| `contents-expand` | frontend/index.html:8315 |
| `contents-filter` | frontend/index.html:8285 |
| `contents-group` | frontend/index.html:8293 |
| `contents-help` | frontend/index.html:8305 |
| `contents-hint` | frontend/index.html:8332 |
| `contents-intro` | frontend/index.html:8323 |
| `contents-more` | frontend/index.html:8312 |
| `contents-no-match` | frontend/index.html:8334 |
| `contents-outline` | frontend/index.html:8333 |
| `contents-refresh` | frontend/index.html:8302 |
| `contents-summary` | frontend/index.html:8331 |
| `contrast-toggle` | frontend/index.html:10980 |
| `conv-browse-all` | frontend/index.html:2611 |
| `conv-empty` | frontend/index.html:2609 |
| `conversation-list` | frontend/index.html:2610 |
| `copy-btn` | frontend/index.html:2225 |
| `custom-css` | frontend/index.html:11368 |
| `custom-css-apply` | frontend/index.html:11371 |
| `custom-css-clear` | frontend/index.html:11372 |
| `custom-css-help` | frontend/index.html:11361 |
| `custom-css-status` | frontend/index.html:11373 |
| `custom-download` | frontend/index.html:9680 |
| `custom-model-cards` | frontend/index.html:9690 |
| `custom-model-check` | frontend/index.html:9687 |
| `custom-model-name` | frontend/index.html:9684 |
| `custom-model-note` | frontend/index.html:9689 |
| `custom-theme-name` | frontend/index.html:10652 |
| `custom-theme-save` | frontend/index.html:10656 |
| `custom-themes` | frontend/index.html:10650 |
| `dash-clock-date` | frontend/index.html:1307 |
| `dash-clock-time` | frontend/index.html:1306 |
| `dash-customise` | frontend/index.html:1348 |
| `dash-edit` | frontend/index.html:1377 |
| `dash-editbar` | frontend/index.html:1369 |
| `dash-find` | frontend/index.html:1339 |
| `dash-first-steps` | frontend/index.html:1381 |
| `dash-glance` | frontend/index.html:1304 |
| `dash-greeting` | frontend/index.html:1296 |
| `dash-grid` | frontend/index.html:1382 |
| `dash-help` | frontend/index.html:1354 |
| `dash-help-toggle` | frontend/index.html:1351 |
| `dash-hero` | frontend/index.html:1289 |
| `dash-hero-emblem` | frontend/index.html:1293 |
| `dash-hero-new` | frontend/index.html:1303 |
| `dash-hint` | frontend/index.html:1370 |
| `dash-mark` | frontend/index.html:11225 |
| `dash-mark-row` | frontend/index.html:11220 |
| `dash-more` | frontend/index.html:1357 |
| `dash-quicklinks` | frontend/index.html:1363 |
| `dash-submessage` | frontend/index.html:1297 |
| `dash-widgets-dialog` | frontend/index.html:1255 |
| `dash-widgets-list` | frontend/index.html:1264 |
| `dash-widgets-open` | frontend/index.html:1376 |
| `dash-widgets-search` | frontend/index.html:1263 |
| `dashboard-greeting-regenerate` | frontend/index.html:10021 |
| `dashboard-greeting-status` | frontend/index.html:10024 |
| `dashboard-persona-mark` | frontend/index.html:10019 |
| `dashboard-persona-select` | frontend/index.html:10020 |
| `density-seg` | frontend/index.html:10804 |
| `desktop-advanced-fold` | frontend/index.html:13824 |
| `desktop-console-hint` | frontend/index.html:13790 |
| `desktop-console-row` | frontend/index.html:13786 |
| `desktop-tray-hint` | frontend/index.html:13810 |
| `desktop-tray-row` | frontend/index.html:13806 |
| `doc-ai` | frontend/index.html:4802 |
| `doc-ai-accept` | frontend/index.html:5460 |
| `doc-ai-cancel` | frontend/index.html:5459 |
| `doc-ai-cancel-run` | frontend/index.html:5434 |
| `doc-ai-close` | frontend/index.html:5395 |
| `doc-ai-diff` | frontend/index.html:5454 |
| `doc-ai-diff-block` | frontend/index.html:5452 |
| `doc-ai-diff-head` | frontend/index.html:5453 |
| `doc-ai-history` | frontend/index.html:5392 |
| `doc-ai-history-dialog` | frontend/index.html:1193 |
| `doc-ai-history-empty` | frontend/index.html:1202 |
| `doc-ai-history-list` | frontend/index.html:1201 |
| `doc-ai-instruction` | frontend/index.html:5430 |
| `doc-ai-model` | frontend/index.html:4883 |
| `doc-ai-panel` | frontend/index.html:5369 |
| `doc-ai-result` | frontend/index.html:5457 |
| `doc-ai-result-block` | frontend/index.html:5443 |
| `doc-ai-run` | frontend/index.html:5433 |
| `doc-ai-scope` | frontend/index.html:5424 |
| `doc-ai-status` | frontend/index.html:5437 |
| `doc-ai-title` | frontend/index.html:5380 |
| `doc-ai-verb` | frontend/index.html:5409 |
| `doc-ai-verb-help` | frontend/index.html:5415 |
| `doc-assist-answer` | frontend/index.html:5264 |
| `doc-assist-form` | frontend/index.html:5252 |
| `doc-assist-model-line` | frontend/index.html:5257 |
| `doc-assist-question` | frontend/index.html:5253 |
| `doc-assist-scope` | frontend/index.html:5236 |
| `doc-assist-send` | frontend/index.html:5255 |
| `doc-attach-bookmark` | frontend/index.html:4646 |
| `doc-autocorrect` | frontend/index.html:4993 |
| `doc-autocorrect-row` | frontend/index.html:4990 |
| `doc-back` | frontend/index.html:4692 |
| `doc-backlinks` | frontend/index.html:4630 |
| `doc-backlinks-wrap` | frontend/index.html:4628 |
| `doc-bookmarks` | frontend/index.html:4645 |
| `doc-bookmarks-wrap` | frontend/index.html:4643 |
| `doc-browse-all` | frontend/index.html:4570 |
| `doc-caret` | frontend/index.html:5316 |
| `doc-code-assist` | frontend/index.html:5235 |
| `doc-code-assist-open` | frontend/index.html:4826 |
| `doc-code-format` | frontend/index.html:4810 |
| `doc-code-run` | frontend/index.html:4817 |
| `doc-code-run-why` | frontend/index.html:4822 |
| `doc-code-side` | frontend/index.html:5202 |
| `doc-code-side-close` | frontend/index.html:5213 |
| `doc-code-side-help` | frontend/index.html:5216 |
| `doc-code-side-tabs` | frontend/index.html:5204 |
| `doc-code-snippets` | frontend/index.html:5266 |
| `doc-code-snippets-open` | frontend/index.html:4828 |
| `doc-code-wrap` | frontend/index.html:4944 |
| `doc-code-wrap-row` | frontend/index.html:4941 |
| `doc-comments` | frontend/index.html:4618 |
| `doc-comments-count` | frontend/index.html:4617 |
| `doc-comments-wrap` | frontend/index.html:4616 |
| `doc-complete` | frontend/index.html:4998 |
| `doc-complete-list` | frontend/index.html:5338 |
| `doc-complete-row` | frontend/index.html:4995 |
| `doc-connections` | frontend/index.html:4866 |
| `doc-content` | frontend/index.html:5182 |
| `doc-copy-link` | frontend/index.html:4877 |
| `doc-counts` | frontend/index.html:5295 |
| `doc-crumbs` | frontend/index.html:5167 |
| `doc-delete` | frontend/index.html:5016 |
| `doc-dictionary-add` | frontend/index.html:9078 |
| `doc-dictionary-close` | frontend/index.html:9042 |
| `doc-dictionary-count` | frontend/index.html:9048 |
| `doc-dictionary-dialog` | frontend/index.html:9022 |
| `doc-dictionary-export` | frontend/index.html:9040 |
| `doc-dictionary-field-hint` | frontend/index.html:9080 |
| `doc-dictionary-file` | frontend/index.html:9082 |
| `doc-dictionary-help` | frontend/index.html:9049 |
| `doc-dictionary-import` | frontend/index.html:9038 |
| `doc-dictionary-list` | frontend/index.html:9081 |
| `doc-dictionary-search` | frontend/index.html:9075 |
| `doc-dictionary-title` | frontend/index.html:9026 |
| `doc-dim-others` | frontend/index.html:4964 |
| `doc-dock-menu` | frontend/index.html:4847 |
| `doc-editor` | frontend/index.html:5190 |
| `doc-empty` | frontend/index.html:4569 |
| `doc-export-docx` | frontend/index.html:4911 |
| `doc-export-html` | frontend/index.html:4898 |
| `doc-export-md` | frontend/index.html:4889 |
| `doc-export-pdf` | frontend/index.html:4913 |
| `doc-export-zip` | frontend/index.html:4907 |
| `doc-extract` | frontend/index.html:4885 |
| `doc-file-type` | frontend/index.html:4854 |
| `doc-file-type-label` | frontend/index.html:4853 |
| `doc-find-bar` | frontend/index.html:5151 |
| `doc-find-close` | frontend/index.html:5159 |
| `doc-find-count` | frontend/index.html:5153 |
| `doc-find-input` | frontend/index.html:5152 |
| `doc-find-next` | frontend/index.html:5155 |
| `doc-find-prev` | frontend/index.html:5154 |
| `doc-find-toggle` | frontend/index.html:5101 |
| `doc-focus-bar` | frontend/index.html:4501 |
| `doc-focus-exit` | frontend/index.html:4523 |
| `doc-focus-facts` | frontend/index.html:4503 |
| `doc-focus-fullscreen` | frontend/index.html:4521 |
| `doc-focus-prose` | frontend/index.html:4519 |
| `doc-focus-prose-count` | frontend/index.html:4520 |
| `doc-focus-saved` | frontend/index.html:4505 |
| `doc-focus-sidebar` | frontend/index.html:4511 |
| `doc-focus-title` | frontend/index.html:4502 |
| `doc-focus-toggle` | frontend/index.html:4844 |
| `doc-focus-tools` | frontend/index.html:4513 |
| `doc-focus-words` | frontend/index.html:4504 |
| `doc-format-show` | frontend/index.html:4800 |
| `doc-format-toggle` | frontend/index.html:4857 |
| `doc-format-toggle-label` | frontend/index.html:4858 |
| `doc-goal-label` | frontend/index.html:5302 |
| `doc-grammar-check` | frontend/index.html:9096 |
| `doc-gutter` | frontend/index.html:5181 |
| `doc-history` | frontend/index.html:4875 |
| `doc-history-dialog` | frontend/index.html:1162 |
| `doc-history-empty` | frontend/index.html:1187 |
| `doc-history-filter` | frontend/index.html:1178 |
| `doc-history-list` | frontend/index.html:1186 |
| `doc-history-name` | frontend/index.html:1166 |
| `doc-list` | frontend/index.html:4568 |
| `doc-map-headings` | frontend/index.html:4887 |
| `doc-margin` | frontend/index.html:5193 |
| `doc-margin-reader` | frontend/index.html:4971 |
| `doc-minimap` | frontend/index.html:4954 |
| `doc-minimap-row` | frontend/index.html:4951 |
| `doc-new` | frontend/index.html:4553 |
| `doc-new-template` | frontend/index.html:4563 |
| `doc-notes` | frontend/index.html:4637 |
| `doc-notes-wrap` | frontend/index.html:4635 |
| `doc-outline` | frontend/index.html:4596 |
| `doc-outline-count` | frontend/index.html:4578 |
| `doc-outline-empty` | frontend/index.html:4584 |
| `doc-outline-filter` | frontend/index.html:4593 |
| `doc-outline-wrap` | frontend/index.html:4577 |
| `doc-panes` | frontend/index.html:5170 |
| `doc-phone-bar` | frontend/index.html:5128 |
| `doc-phone-insert` | frontend/index.html:5142 |
| `doc-preview` | frontend/index.html:5281 |
| `doc-prose` | frontend/index.html:5305 |
| `doc-prose-count` | frontend/index.html:5307 |
| `doc-prose-panel` | frontend/index.html:5333 |
| `doc-read-aloud` | frontend/index.html:5014 |
| `doc-read-stop` | frontend/index.html:5313 |
| `doc-replace-all` | frontend/index.html:5158 |
| `doc-replace-case` | frontend/index.html:1223 |
| `doc-replace-dialog` | frontend/index.html:1209 |
| `doc-replace-find` | frontend/index.html:1218 |
| `doc-replace-input` | frontend/index.html:5156 |
| `doc-replace-list` | frontend/index.html:1226 |
| `doc-replace-one` | frontend/index.html:5157 |
| `doc-replace-regex` | frontend/index.html:1222 |
| `doc-replace-run` | frontend/index.html:1229 |
| `doc-replace-summary` | frontend/index.html:1225 |
| `doc-replace-title` | frontend/index.html:1211 |
| `doc-replace-with` | frontend/index.html:1220 |
| `doc-saved` | frontend/index.html:4722 |
| `doc-serif` | frontend/index.html:4974 |
| `doc-sidebar` | frontend/index.html:4535 |
| `doc-sidebar-list` | frontend/index.html:4549 |
| `doc-sidebar-outline` | frontend/index.html:4574 |
| `doc-sidebar-tabs` | frontend/index.html:4541 |
| `doc-smart-punctuation` | frontend/index.html:9103 |
| `doc-snippet-empty` | frontend/index.html:5277 |
| `doc-snippet-list` | frontend/index.html:5276 |
| `doc-snippet-save` | frontend/index.html:5273 |
| `doc-snippet-search` | frontend/index.html:5270 |
| `doc-source-wrap` | frontend/index.html:5176 |
| `doc-spelling-variant` | frontend/index.html:9089 |
| `doc-status` | frontend/index.html:5283 |
| `doc-statusbar` | frontend/index.html:5294 |
| `doc-storage-dialog` | frontend/index.html:977 |
| `doc-storage-path` | frontend/index.html:989 |
| `doc-storage-toggle` | frontend/index.html:4654 |
| `doc-suggest-accept-all` | frontend/index.html:5010 |
| `doc-suggest-menu` | frontend/index.html:5345 |
| `doc-suggest-mode` | frontend/index.html:5006 |
| `doc-suggest-next` | frontend/index.html:5008 |
| `doc-suggest-reject-all` | frontend/index.html:5012 |
| `doc-suggest-row` | frontend/index.html:5003 |
| `doc-suggest-status` | frontend/index.html:5310 |
| `doc-template-dialog` | frontend/index.html:1005 |
| `doc-template-list` | frontend/index.html:1022 |
| `doc-template-preview` | frontend/index.html:1023 |
| `doc-template-use` | frontend/index.html:1027 |
| `doc-title` | frontend/index.html:4694 |
| `doc-toolbar` | frontend/index.html:5024 |
| `doc-toolbar-colour` | frontend/index.html:5066 |
| `doc-toolbar-insert` | frontend/index.html:5089 |
| `doc-toolbar-mode` | frontend/index.html:4934 |
| `doc-toolbar-mode-label` | frontend/index.html:4936 |
| `doc-typewriter` | frontend/index.html:4967 |
| `doc-view-menu` | frontend/index.html:4759 |
| `doc-view-seg` | frontend/index.html:4747 |
| `doc-whitespace` | frontend/index.html:4949 |
| `doc-whitespace-row` | frontend/index.html:4946 |
| `doc-width-menu` | frontend/index.html:4931 |
| `doc-width-menu-label` | frontend/index.html:4933 |
| `doc-width-toggle` | frontend/index.html:5107 |
| `doc-word-goal` | frontend/index.html:5301 |
| `doc-word-goal-dialog` | frontend/index.html:1233 |
| `doc-word-goal-input` | frontend/index.html:1245 |
| `doc-word-goal-submit` | frontend/index.html:1248 |
| `draft-add-source` | frontend/index.html:1937 |
| `draft-cancel` | frontend/index.html:1785 |
| `draft-compose` | frontend/index.html:1828 |
| `draft-continue-note` | frontend/index.html:1815 |
| `draft-copy` | frontend/index.html:2000 |
| `draft-count` | frontend/index.html:1954 |
| `draft-discard` | frontend/index.html:1824 |
| `draft-extract` | frontend/index.html:1808 |
| `draft-feature-model` | frontend/index.html:1782 |
| `draft-help` | frontend/index.html:1792 |
| `draft-help-body` | frontend/index.html:1831 |
| `draft-insert` | frontend/index.html:2002 |
| `draft-instruction` | frontend/index.html:1979 |
| `draft-kind` | frontend/index.html:1891 |
| `draft-length` | frontend/index.html:1931 |
| `draft-model` | frontend/index.html:1822 |
| `draft-more-menu` | frontend/index.html:1797 |
| `draft-offline` | frontend/index.html:1848 |
| `draft-quickstarts` | frontend/index.html:1855 |
| `draft-refine` | frontend/index.html:1982 |
| `draft-save` | frontend/index.html:2004 |
| `draft-sources` | frontend/index.html:1943 |
| `draft-sources-count` | frontend/index.html:1879 |
| `draft-status` | frontend/index.html:1945 |
| `draft-tags` | frontend/index.html:1993 |
| `draft-target` | frontend/index.html:1953 |
| `draft-text` | frontend/index.html:1966 |
| `draft-thinking` | frontend/index.html:1959 |
| `draft-thoughts` | frontend/index.html:1883 |
| `draft-thoughts-count` | frontend/index.html:1880 |
| `draft-title` | frontend/index.html:1805 |
| `draft-tone` | frontend/index.html:1923 |
| `draft-undo` | frontend/index.html:1787 |
| `draft-versions` | frontend/index.html:1972 |
| `duplicate-groups` | frontend/index.html:12478 |
| `duplicate-status` | frontend/index.html:12476 |
| `duplicate-threshold` | frontend/index.html:12472 |
| `duplicate-threshold-value` | frontend/index.html:12474 |
| `duplicates-help` | frontend/index.html:12461 |
| `editor-menu` | frontend/index.html:14553 |
| `editor-menu-list` | frontend/index.html:14554 |
| `editor-menu-preview` | frontend/index.html:14556 |
| `embed-choices` | frontend/index.html:9831 |
| `embed-choices-status` | frontend/index.html:9832 |
| `embed-found` | frontend/index.html:9837 |
| `embed-found-empty` | frontend/index.html:9838 |
| `embed-models-cache` | frontend/index.html:11490 |
| `embed-models-list` | frontend/index.html:11489 |
| `embed-models-status` | frontend/index.html:11491 |
| `embed-pull-go` | frontend/index.html:9847 |
| `embed-pull-name` | frontend/index.html:9844 |
| `embed-pull-status` | frontend/index.html:9849 |
| `embedding-apply` | frontend/index.html:9816 |
| `embedding-error` | frontend/index.html:9704 |
| `embedding-error-fix` | frontend/index.html:9713 |
| `embedding-error-fix-row` | frontend/index.html:9712 |
| `embedding-error-fix-status` | frontend/index.html:9716 |
| `embedding-model-select` | frontend/index.html:9815 |
| `embedding-models-help` | frontend/index.html:11480 |
| `embedding-offline-note` | frontend/index.html:9822 |
| `embedding-ollama-note` | frontend/index.html:9818 |
| `empty-message` | frontend/index.html:2504 |
| `entries-heading` | frontend/index.html:2347 |
| `entries-heading-label` | frontend/index.html:2347 |
| `entry-attach-existing` | frontend/index.html:1682 |
| `entry-attach-file` | frontend/index.html:1672 |
| `entry-attach-file-input` | frontend/index.html:1674 |
| `entry-attachment-chips` | frontend/index.html:1638 |
| `entry-category` | frontend/index.html:1708 |
| `entry-content` | frontend/index.html:1626 |
| `entry-count` | frontend/index.html:1632 |
| `entry-document-adder` | frontend/index.html:1720 |
| `entry-document-chips` | frontend/index.html:1721 |
| `entry-list` | frontend/index.html:2498 |
| `entry-preview-toggle` | frontend/index.html:1620 |
| `entry-tag-suggestions` | frontend/index.html:1656 |
| `entry-tags` | frontend/index.html:1646 |
| `entry-template` | frontend/index.html:1507 |
| `entry-title` | frontend/index.html:1573 |
| `export-backup-password` | frontend/index.html:12364 |
| `export-backup-zip` | frontend/index.html:12360 |
| `export-csv` | frontend/index.html:12357 |
| `export-folder` | frontend/index.html:12359 |
| `export-help` | frontend/index.html:12341 |
| `export-json` | frontend/index.html:12356 |
| `export-md` | frontend/index.html:12358 |
| `export-save-dir-row` | frontend/index.html:12386 |
| `export-save-dir-status` | frontend/index.html:12391 |
| `exports-empty` | frontend/index.html:12406 |
| `exports-list` | frontend/index.html:12407 |
| `exports-recent` | frontend/index.html:12399 |
| `exports-refresh` | frontend/index.html:12401 |
| `extract-cancel` | frontend/index.html:9127 |
| `extract-close` | frontend/index.html:9117 |
| `extract-commit` | frontend/index.html:9128 |
| `extract-links-list` | frontend/index.html:9123 |
| `extract-notes-list` | frontend/index.html:9122 |
| `extract-panel` | frontend/index.html:9111 |
| `extract-status` | frontend/index.html:9121 |
| `extras-bulk-done` | frontend/index.html:11434 |
| `extras-bulk-install` | frontend/index.html:11431 |
| `extras-bulk-reinstall` | frontend/index.html:11432 |
| `extras-bulk-remove` | frontend/index.html:11433 |
| `extras-bundles` | frontend/index.html:11426 |
| `extras-list` | frontend/index.html:11437 |
| `extras-log` | frontend/index.html:11441 |
| `extras-log-wrap` | frontend/index.html:11439 |
| `extras-selectbar` | frontend/index.html:11428 |
| `extras-selected-count` | frontend/index.html:11429 |
| `extras-status` | frontend/index.html:11438 |
| `face-look` | frontend/index.html:11213 |
| `face-look-row` | frontend/index.html:11208 |
| `feature-models-help` | frontend/index.html:9534 |
| `feature-models-list` | frontend/index.html:9528 |
| `feature-models-reset` | frontend/index.html:9530 |
| `feature-models-reset-note` | frontend/index.html:9533 |
| `features-card` | frontend/index.html:14438 |
| `features-close` | frontend/index.html:14442 |
| `features-count` | frontend/index.html:14454 |
| `features-list` | frontend/index.html:14455 |
| `features-overlay` | frontend/index.html:14436 |
| `features-search` | frontend/index.html:14451 |
| `find-duplicates` | frontend/index.html:12470 |
| `finder-close` | frontend/index.html:777 |
| `finder-filters` | frontend/index.html:824 |
| `finder-help` | frontend/index.html:781 |
| `finder-input` | frontend/index.html:813 |
| `finder-overlay` | frontend/index.html:761 |
| `finder-results` | frontend/index.html:839 |
| `finder-save` | frontend/index.html:775 |
| `finder-sort` | frontend/index.html:828 |
| `finder-summary` | frontend/index.html:838 |
| `font-seg` | frontend/index.html:10791 |
| `fontsize-seg` | frontend/index.html:10773 |
| `forgot-password-help` | frontend/index.html:13187 |
| `glass-blur` | frontend/index.html:10961 |
| `glass-blur-row` | frontend/index.html:10955 |
| `glass-blur-value` | frontend/index.html:10963 |
| `glass-opacity` | frontend/index.html:10973 |
| `glass-opacity-row` | frontend/index.html:10967 |
| `glass-opacity-value` | frontend/index.html:10975 |
| `glass-row` | frontend/index.html:10920 |
| `glass-sheen-row` | frontend/index.html:10936 |
| `glass-sheen-strength` | frontend/index.html:10949 |
| `glass-sheen-strength-row` | frontend/index.html:10944 |
| `glass-sheen-strength-value` | frontend/index.html:10951 |
| `glass-sheen-toggle` | frontend/index.html:10937 |
| `glass-toggle` | frontend/index.html:10921 |
| `global-find-bar` | frontend/index.html:13885 |
| `global-find-close` | frontend/index.html:13890 |
| `global-find-count` | frontend/index.html:13887 |
| `global-find-input` | frontend/index.html:13886 |
| `global-find-next` | frontend/index.html:13889 |
| `global-find-prev` | frontend/index.html:13888 |
| `graph-add-node` | frontend/index.html:3833 |
| `graph-arrows` | frontend/index.html:4196 |
| `graph-attachments` | frontend/index.html:4149 |
| `graph-box` | frontend/index.html:4353 |
| `graph-canvas` | frontend/index.html:4378 |
| `graph-card` | frontend/index.html:3703 |
| `graph-colour` | frontend/index.html:3954 |
| `graph-colour-label` | frontend/index.html:3953 |
| `graph-concept-maps` | frontend/index.html:3763 |
| `graph-curved` | frontend/index.html:4184 |
| `graph-display` | frontend/index.html:4175 |
| `graph-display-label` | frontend/index.html:4176 |
| `graph-documents` | frontend/index.html:4132 |
| `graph-empty` | frontend/index.html:4453 |
| `graph-empty-emblem` | frontend/index.html:4459 |
| `graph-empty-filtered` | frontend/index.html:4473 |
| `graph-empty-filtered-why` | frontend/index.html:4475 |
| `graph-empty-fresh` | frontend/index.html:4465 |
| `graph-empty-show-all` | frontend/index.html:4476 |
| `graph-entities` | frontend/index.html:4128 |
| `graph-export-png` | frontend/index.html:3830 |
| `graph-filter-label` | frontend/index.html:4214 |
| `graph-filter-section` | frontend/index.html:4213 |
| `graph-focus-clear` | frontend/index.html:3774 |
| `graph-focus-depth` | frontend/index.html:4001 |
| `graph-focus-in` | frontend/index.html:4007 |
| `graph-focus-label` | frontend/index.html:3998 |
| `graph-focus-neighbours` | frontend/index.html:4015 |
| `graph-focus-out` | frontend/index.html:4011 |
| `graph-focus-section` | frontend/index.html:3996 |
| `graph-fullscreen` | frontend/index.html:4451 |
| `graph-gravity` | frontend/index.html:4031 |
| `graph-group` | frontend/index.html:4053 |
| `graph-group-add` | frontend/index.html:4264 |
| `graph-group-query` | frontend/index.html:4262 |
| `graph-groups` | frontend/index.html:4267 |
| `graph-groups-label` | frontend/index.html:4253 |
| `graph-groups-section` | frontend/index.html:4252 |
| `graph-help-panel` | frontend/index.html:3856 |
| `graph-help-toggle` | frontend/index.html:3783 |
| `graph-hide-orphans` | frontend/index.html:4157 |
| `graph-highlight-clear` | frontend/index.html:3773 |
| `graph-label-fade` | frontend/index.html:4201 |
| `graph-label-plates` | frontend/index.html:4192 |
| `graph-labels` | frontend/index.html:4180 |
| `graph-layout` | frontend/index.html:3924 |
| `graph-layout-chip` | frontend/index.html:3754 |
| `graph-layout-label` | frontend/index.html:3920 |
| `graph-legend` | frontend/index.html:4351 |
| `graph-legend-toggle` | frontend/index.html:3984 |
| `graph-length-score` | frontend/index.html:4047 |
| `graph-link-force` | frontend/index.html:4041 |
| `graph-link-kinds` | frontend/index.html:4216 |
| `graph-link-width` | frontend/index.html:4206 |
| `graph-maps` | frontend/index.html:4141 |
| `graph-minimap` | frontend/index.html:4356 |
| `graph-minimap-corner` | frontend/index.html:4274 |
| `graph-minimap-dots` | frontend/index.html:4367 |
| `graph-minimap-edges` | frontend/index.html:4366 |
| `graph-minimap-frame` | frontend/index.html:4369 |
| `graph-minimap-here` | frontend/index.html:4368 |
| `graph-minimap-label` | frontend/index.html:4271 |
| `graph-minimap-section` | frontend/index.html:4270 |
| `graph-minimap-size` | frontend/index.html:4285 |
| `graph-minimap-svg` | frontend/index.html:4364 |
| `graph-more-menu` | frontend/index.html:3808 |
| `graph-nebula` | frontend/index.html:4188 |
| `graph-new` | frontend/index.html:4429 |
| `graph-new-close` | frontend/index.html:4433 |
| `graph-new-content` | frontend/index.html:4438 |
| `graph-new-hint` | frontend/index.html:4435 |
| `graph-new-note-title` | frontend/index.html:4436 |
| `graph-new-save` | frontend/index.html:4443 |
| `graph-new-status` | frontend/index.html:4444 |
| `graph-new-tags` | frontend/index.html:4440 |
| `graph-new-title` | frontend/index.html:4432 |
| `graph-options` | frontend/index.html:3904 |
| `graph-options-reset` | frontend/index.html:4307 |
| `graph-options-toggle` | frontend/index.html:3803 |
| `graph-pane` | frontend/index.html:1418 |
| `graph-pane-body` | frontend/index.html:1434 |
| `graph-pane-box` | frontend/index.html:1435 |
| `graph-pane-canvas` | frontend/index.html:1436 |
| `graph-pane-count` | frontend/index.html:1421 |
| `graph-pane-depth` | frontend/index.html:1445 |
| `graph-pane-empty` | frontend/index.html:1438 |
| `graph-pane-focus` | frontend/index.html:1423 |
| `graph-pane-in` | frontend/index.html:1451 |
| `graph-pane-neighbours` | frontend/index.html:1459 |
| `graph-pane-options` | frontend/index.html:1441 |
| `graph-pane-out` | frontend/index.html:1455 |
| `graph-pane-toggle` | frontend/index.html:1427 |
| `graph-physics` | frontend/index.html:4020 |
| `graph-physics-label` | frontend/index.html:4028 |
| `graph-popup` | frontend/index.html:4381 |
| `graph-popup-actions` | frontend/index.html:4424 |
| `graph-popup-category` | frontend/index.html:4392 |
| `graph-popup-close` | frontend/index.html:4394 |
| `graph-popup-confidence` | frontend/index.html:4391 |
| `graph-popup-content` | frontend/index.html:4411 |
| `graph-popup-info` | frontend/index.html:4398 |
| `graph-popup-media` | frontend/index.html:4410 |
| `graph-popup-props` | frontend/index.html:4405 |
| `graph-popup-save` | frontend/index.html:4420 |
| `graph-popup-saverow` | frontend/index.html:4419 |
| `graph-popup-status` | frontend/index.html:4421 |
| `graph-popup-tags` | frontend/index.html:4412 |
| `graph-popup-title` | frontend/index.html:4390 |
| `graph-popup-topic` | frontend/index.html:4401 |
| `graph-prop-chips` | frontend/index.html:4218 |
| `graph-refresh` | frontend/index.html:3782 |
| `graph-reshuffle` | frontend/index.html:4062 |
| `graph-search` | frontend/index.html:3770 |
| `graph-selection-clear` | frontend/index.html:3854 |
| `graph-selection-count` | frontend/index.html:3849 |
| `graph-selection-dock` | frontend/index.html:3848 |
| `graph-selection-link` | frontend/index.html:3851 |
| `graph-selection-map` | frontend/index.html:3853 |
| `graph-selection-tag` | frontend/index.html:3850 |
| `graph-selection-unlink` | frontend/index.html:3852 |
| `graph-shape` | frontend/index.html:3941 |
| `graph-shape-label` | frontend/index.html:3940 |
| `graph-shape-row` | frontend/index.html:3939 |
| `graph-show-help` | frontend/index.html:4086 |
| `graph-show-label` | frontend/index.html:4070 |
| `graph-similarity` | frontend/index.html:4124 |
| `graph-similarity-min` | frontend/index.html:4167 |
| `graph-similarity-min-row` | frontend/index.html:4165 |
| `graph-size` | frontend/index.html:3973 |
| `graph-size-label` | frontend/index.html:3972 |
| `graph-spread` | frontend/index.html:4036 |
| `graph-stats` | frontend/index.html:3749 |
| `graph-svg` | frontend/index.html:4379 |
| `graph-tags` | frontend/index.html:4145 |
| `graph-temporal` | frontend/index.html:4220 |
| `graph-time-heading` | frontend/index.html:4222 |
| `graph-time-label` | frontend/index.html:4233 |
| `graph-time-play` | frontend/index.html:4225 |
| `graph-time-slider` | frontend/index.html:4227 |
| `graph-toggle-group` | frontend/index.html:4067 |
| `graph-topic` | frontend/index.html:4336 |
| `graph-trace` | frontend/index.html:4318 |
| `graph-trace-clear` | frontend/index.html:4330 |
| `graph-trace-ends` | frontend/index.html:4326 |
| `graph-trace-result` | frontend/index.html:4333 |
| `graph-trace-toggle` | frontend/index.html:3982 |
| `graph-unpin-all` | frontend/index.html:4056 |
| `graph-unresolved` | frontend/index.html:4153 |
| `graph-view-delete` | frontend/index.html:3828 |
| `graph-view-label` | frontend/index.html:3918 |
| `graph-view-picker` | frontend/index.html:3824 |
| `graph-view-save` | frontend/index.html:3826 |
| `graph-view-section` | frontend/index.html:3916 |
| `graph-zoom` | frontend/index.html:4447 |
| `graph-zoom-fit` | frontend/index.html:4450 |
| `graph-zoom-in` | frontend/index.html:4448 |
| `graph-zoom-out` | frontend/index.html:4449 |
| `harmony-apply` | frontend/index.html:10761 |
| `harmony-base` | frontend/index.html:10753 |
| `harmony-kind` | frontend/index.html:10755 |
| `harmony-note` | frontend/index.html:10763 |
| `health-checked` | frontend/index.html:13576 |
| `health-counts` | frontend/index.html:13620 |
| `health-data-dir` | frontend/index.html:13589 |
| `health-db-size` | frontend/index.html:13606 |
| `health-files-size` | frontend/index.html:13613 |
| `health-group` | frontend/index.html:13574 |
| `health-integrity` | frontend/index.html:13598 |
| `health-integrity-check` | frontend/index.html:13597 |
| `health-jobs` | frontend/index.html:13627 |
| `health-last-backup` | frontend/index.html:13582 |
| `health-last-error` | frontend/index.html:13655 |
| `health-latency` | frontend/index.html:13648 |
| `health-search` | frontend/index.html:13641 |
| `help-chat-empty` | frontend/index.html:562 |
| `help-chat-form` | frontend/index.html:577 |
| `help-chat-group` | frontend/index.html:528 |
| `help-chat-help` | frontend/index.html:587 |
| `help-chat-input` | frontend/index.html:578 |
| `help-chat-menu` | frontend/index.html:585 |
| `help-chat-messages` | frontend/index.html:536 |
| `help-chat-send` | frontend/index.html:579 |
| `help-chat-starters` | frontend/index.html:568 |
| `help-empty` | frontend/index.html:13472 |
| `help-open-manual` | frontend/index.html:13469 |
| `help-search` | frontend/index.html:13449 |
| `help-search-status` | frontend/index.html:13452 |
| `help-topics` | frontend/index.html:13471 |
| `history-card` | frontend/index.html:13922 |
| `history-close` | frontend/index.html:13926 |
| `history-list` | frontend/index.html:13931 |
| `history-overlay` | frontend/index.html:13920 |
| `history-status` | frontend/index.html:13930 |
| `hud` | frontend/index.html:13900 |
| `import-app-box` | frontend/index.html:12571 |
| `import-app-help` | frontend/index.html:12581 |
| `import-app-status` | frontend/index.html:12620 |
| `import-apple` | frontend/index.html:12615 |
| `import-apple-file` | frontend/index.html:12613 |
| `import-dir` | frontend/index.html:12536 |
| `import-dir-path` | frontend/index.html:12535 |
| `import-dir-status` | frontend/index.html:12538 |
| `import-document` | frontend/index.html:12554 |
| `import-document-file` | frontend/index.html:12553 |
| `import-document-help` | frontend/index.html:12558 |
| `import-document-status` | frontend/index.html:12556 |
| `import-evernote` | frontend/index.html:12612 |
| `import-evernote-file` | frontend/index.html:12610 |
| `import-md` | frontend/index.html:12524 |
| `import-md-files` | frontend/index.html:12523 |
| `import-md-folder` | frontend/index.html:12525 |
| `import-md-folder-btn` | frontend/index.html:12528 |
| `import-md-status` | frontend/index.html:12531 |
| `import-memorymap` | frontend/index.html:12618 |
| `import-memorymap-file` | frontend/index.html:12616 |
| `import-notion` | frontend/index.html:12606 |
| `import-notion-file` | frontend/index.html:12604 |
| `import-obsidian` | frontend/index.html:12609 |
| `import-obsidian-file` | frontend/index.html:12607 |
| `improve-apply` | frontend/index.html:14158 |
| `improve-btn` | frontend/index.html:1698 |
| `improve-card` | frontend/index.html:14124 |
| `improve-close` | frontend/index.html:14128 |
| `improve-custom-go` | frontend/index.html:14141 |
| `improve-custom-input` | frontend/index.html:14139 |
| `improve-custom-row` | frontend/index.html:14138 |
| `improve-modes` | frontend/index.html:14132 |
| `improve-original` | frontend/index.html:14146 |
| `improve-overlay` | frontend/index.html:14123 |
| `improve-result` | frontend/index.html:14150 |
| `improve-retry` | frontend/index.html:14157 |
| `improve-status` | frontend/index.html:14153 |
| `installed-box` | frontend/index.html:9600 |
| `installed-list` | frontend/index.html:9603 |
| `integrity-notice` | frontend/index.html:12677 |
| `job-runs-group` | frontend/index.html:12068 |
| `job-runs-help` | frontend/index.html:12078 |
| `job-runs-list` | frontend/index.html:12092 |
| `lan-help` | frontend/index.html:12897 |
| `lan-trust-help` | frontend/index.html:13011 |
| `learned-bulk-delete` | frontend/index.html:10392 |
| `learned-bulk-done` | frontend/index.html:10393 |
| `learned-bulk-reset` | frontend/index.html:10391 |
| `learned-count` | frontend/index.html:10402 |
| `learned-empty` | frontend/index.html:10397 |
| `learned-export` | frontend/index.html:10411 |
| `learned-forget` | frontend/index.html:10412 |
| `learned-from-you` | frontend/index.html:10331 |
| `learned-help` | frontend/index.html:10332 |
| `learned-kind` | frontend/index.html:10378 |
| `learned-list` | frontend/index.html:10396 |
| `learned-next` | frontend/index.html:10403 |
| `learned-pager` | frontend/index.html:10400 |
| `learned-paused-banner` | frontend/index.html:10359 |
| `learned-prev` | frontend/index.html:10401 |
| `learned-run-note` | frontend/index.html:10368 |
| `learned-run-now` | frontend/index.html:10367 |
| `learned-search` | frontend/index.html:10381 |
| `learned-selectbar` | frontend/index.html:10388 |
| `learned-selected-count` | frontend/index.html:10389 |
| `learned-status` | frontend/index.html:10384 |
| `learned-switches` | frontend/index.html:10360 |
| `learned-switches-group` | frontend/index.html:10356 |
| `library-activity-export` | frontend/index.html:5850 |
| `library-activitybar` | frontend/index.html:5847 |
| `library-bin-empty` | frontend/index.html:5843 |
| `library-bin-note` | frontend/index.html:5841 |
| `library-binbar` | frontend/index.html:5840 |
| `library-boards-empty` | frontend/index.html:6310 |
| `library-boards-filter` | frontend/index.html:6307 |
| `library-boards-grid` | frontend/index.html:6309 |
| `library-boards-more` | frontend/index.html:6264 |
| `library-boards-new-map` | frontend/index.html:6319 |
| `library-boards-no-match` | frontend/index.html:6322 |
| `library-boards-refresh` | frontend/index.html:6238 |
| `library-boards-search` | frontend/index.html:6193 |
| `library-boards-sort` | frontend/index.html:6202 |
| `library-boards-view` | frontend/index.html:6215 |
| `library-bulk-delete` | frontend/index.html:5862 |
| `library-bulk-open` | frontend/index.html:5860 |
| `library-bulk-restore` | frontend/index.html:5861 |
| `library-clear-selection` | frontend/index.html:5863 |
| `library-docs-bulk-delete` | frontend/index.html:6010 |
| `library-docs-clear-selection` | frontend/index.html:6011 |
| `library-docs-empty` | frontend/index.html:6020 |
| `library-docs-help` | frontend/index.html:5955 |
| `library-docs-help-toggle` | frontend/index.html:5952 |
| `library-docs-import` | frontend/index.html:5969 |
| `library-docs-import-input` | frontend/index.html:5971 |
| `library-docs-list` | frontend/index.html:6014 |
| `library-docs-more-menu` | frontend/index.html:5958 |
| `library-docs-new` | frontend/index.html:5990 |
| `library-docs-no-match` | frontend/index.html:6026 |
| `library-docs-page-next` | frontend/index.html:6018 |
| `library-docs-page-prev` | frontend/index.html:6016 |
| `library-docs-page-size` | frontend/index.html:5981 |
| `library-docs-page-status` | frontend/index.html:6017 |
| `library-docs-pagination` | frontend/index.html:6015 |
| `library-docs-property` | frontend/index.html:5933 |
| `library-docs-refresh` | frontend/index.html:5950 |
| `library-docs-search` | frontend/index.html:5919 |
| `library-docs-selectbar` | frontend/index.html:6005 |
| `library-docs-selected-count` | frontend/index.html:6007 |
| `library-docs-sort` | frontend/index.html:5941 |
| `library-empty` | frontend/index.html:5873 |
| `library-empty-clear` | frontend/index.html:5882 |
| `library-empty-create` | frontend/index.html:5886 |
| `library-empty-text` | frontend/index.html:5878 |
| `library-empty-title` | frontend/index.html:5875 |
| `library-filter-menu` | frontend/index.html:5777 |
| `library-filters` | frontend/index.html:5834 |
| `library-grid` | frontend/index.html:5866 |
| `library-help` | frontend/index.html:5811 |
| `library-help-toggle` | frontend/index.html:5808 |
| `library-images-empty` | frontend/index.html:8094 |
| `library-images-grid` | frontend/index.html:8093 |
| `library-images-help` | frontend/index.html:8058 |
| `library-images-intro` | frontend/index.html:8076 |
| `library-images-no-match` | frontend/index.html:8100 |
| `library-images-refresh` | frontend/index.html:8057 |
| `library-images-search` | frontend/index.html:7992 |
| `library-images-upload` | frontend/index.html:8073 |
| `library-images-upload-input` | frontend/index.html:8056 |
| `library-media-bulk-delete` | frontend/index.html:8089 |
| `library-media-clear-selection` | frontend/index.html:8090 |
| `library-media-empty-body` | frontend/index.html:8097 |
| `library-media-empty-icon` | frontend/index.html:8095 |
| `library-media-empty-title` | frontend/index.html:8096 |
| `library-media-more-menu` | frontend/index.html:8069 |
| `library-media-origin-btn` | frontend/index.html:8026 |
| `library-media-origin-label` | frontend/index.html:8027 |
| `library-media-origin-menu` | frontend/index.html:8025 |
| `library-media-origins` | frontend/index.html:8028 |
| `library-media-read` | frontend/index.html:8010 |
| `library-media-selectbar` | frontend/index.html:8084 |
| `library-media-selected-count` | frontend/index.html:8086 |
| `library-media-sort` | frontend/index.html:8035 |
| `library-media-title` | frontend/index.html:7983 |
| `library-media-view-preview` | frontend/index.html:8049 |
| `library-media-view-type` | frontend/index.html:8051 |
| `library-more-menu` | frontend/index.html:5814 |
| `library-new-doc` | frontend/index.html:5828 |
| `library-overview` | frontend/index.html:5832 |
| `library-page-next` | frontend/index.html:5871 |
| `library-page-prev` | frontend/index.html:5869 |
| `library-page-size` | frontend/index.html:5819 |
| `library-page-status` | frontend/index.html:5870 |
| `library-pagination` | frontend/index.html:5868 |
| `library-refresh` | frontend/index.html:5806 |
| `library-search` | frontend/index.html:5773 |
| `library-selectbar` | frontend/index.html:5855 |
| `library-selected-count` | frontend/index.html:5857 |
| `library-semantic-toggle` | frontend/index.html:5782 |
| `library-show-binned` | frontend/index.html:5786 |
| `library-skills-section` | frontend/index.html:6033 |
| `library-sort` | frontend/index.html:5793 |
| `library-subtab-docs` | frontend/index.html:5731 |
| `library-subtabs` | frontend/index.html:5718 |
| `library-truncated` | frontend/index.html:5867 |
| `library-view` | frontend/index.html:5799 |
| `library-view-contents` | frontend/index.html:8268 |
| `library-view-docs` | frontend/index.html:5896 |
| `library-view-documents` | frontend/index.html:5750 |
| `library-view-links` | frontend/index.html:8108 |
| `library-view-media` | frontend/index.html:7963 |
| `library-view-recordings` | frontend/index.html:8235 |
| `library-view-skills` | frontend/index.html:6030 |
| `library-view-whiteboard` | frontend/index.html:6151 |
| `link-suggest-btn` | frontend/index.html:4305 |
| `live-region` | frontend/index.html:13903 |
| `llm-base-url` | frontend/index.html:9328 |
| `llm-privacy-warning` | frontend/index.html:9353 |
| `llm-provider-apply` | frontend/index.html:9329 |
| `llm-provider-note` | frontend/index.html:9333 |
| `llm-provider-select` | frontend/index.html:9324 |
| `llm-provider-status` | frontend/index.html:9349 |
| `local-only-ai` | frontend/index.html:9337 |
| `local-only-wrap` | frontend/index.html:9336 |
| `lock-btn` | frontend/index.html:293 |
| `lock-cancel` | frontend/index.html:329 |
| `lock-card` | frontend/index.html:302 |
| `lock-emblem` | frontend/index.html:303 |
| `lock-error` | frontend/index.html:338 |
| `lock-forgot` | frontend/index.html:337 |
| `lock-forgot-card` | frontend/index.html:381 |
| `lock-forgot-close` | frontend/index.html:390 |
| `lock-forgot-error` | frontend/index.html:452 |
| `lock-forgot-have` | frontend/index.html:418 |
| `lock-forgot-help` | frontend/index.html:394 |
| `lock-forgot-key-pane` | frontend/index.html:421 |
| `lock-forgot-lost` | frontend/index.html:419 |
| `lock-forgot-paths` | frontend/index.html:416 |
| `lock-forgot-remote` | frontend/index.html:412 |
| `lock-forgot-reset-pane` | frontend/index.html:434 |
| `lock-forgot-title` | frontend/index.html:383 |
| `lock-lan-cert` | frontend/index.html:345 |
| `lock-lan-cert-help` | frontend/index.html:351 |
| `lock-message` | frontend/index.html:305 |
| `lock-overlay` | frontend/index.html:301 |
| `lock-password` | frontend/index.html:307 |
| `lock-password-show` | frontend/index.html:309 |
| `lock-recovery-confirm` | frontend/index.html:430 |
| `lock-recovery-key` | frontend/index.html:424 |
| `lock-recovery-new` | frontend/index.html:427 |
| `lock-recovery-submit` | frontend/index.html:432 |
| `lock-reset-command` | frontend/index.html:442 |
| `lock-reset-confirm` | frontend/index.html:447 |
| `lock-reset-copy` | frontend/index.html:443 |
| `lock-reset-submit` | frontend/index.html:449 |
| `lock-setup-note` | frontend/index.html:324 |
| `lock-submit` | frontend/index.html:325 |
| `lock-title` | frontend/index.html:304 |
| `log-filter` | frontend/index.html:13316 |
| `log-follow` | frontend/index.html:13379 |
| `log-follow-label` | frontend/index.html:13377 |
| `log-level` | frontend/index.html:13367 |
| `log-list` | frontend/index.html:13411 |
| `log-live` | frontend/index.html:13311 |
| `log-requests` | frontend/index.html:13375 |
| `log-source` | frontend/index.html:13359 |
| `log-terminal` | frontend/index.html:13412 |
| `log-terminal-hint` | frontend/index.html:13406 |
| `log-view-toggle` | frontend/index.html:13321 |
| `logs-bundle` | frontend/index.html:13392 |
| `logs-clear` | frontend/index.html:13389 |
| `logs-copy` | frontend/index.html:13388 |
| `logs-dropped` | frontend/index.html:13410 |
| `logs-email-bundle` | frontend/index.html:13386 |
| `logs-empty` | frontend/index.html:13414 |
| `logs-filtered-out` | frontend/index.html:13415 |
| `logs-help` | frontend/index.html:13332 |
| `logs-help-toggle` | frontend/index.html:13329 |
| `logs-more-menu` | frontend/index.html:13335 |
| `manage-categories-btn` | frontend/index.html:1393 |
| `manage-categories-foot` | frontend/index.html:1399 |
| `mcp-config-copy` | frontend/index.html:10594 |
| `mcp-config-group` | frontend/index.html:10568 |
| `mcp-config-help` | frontend/index.html:10579 |
| `mcp-config-note` | frontend/index.html:10592 |
| `mcp-config-snippet` | frontend/index.html:10591 |
| `meeting-captions` | frontend/index.html:14357 |
| `meeting-card` | frontend/index.html:14282 |
| `meeting-close` | frontend/index.html:14300 |
| `meeting-controls` | frontend/index.html:14350 |
| `meeting-copy` | frontend/index.html:14420 |
| `meeting-discard` | frontend/index.html:14421 |
| `meeting-discard-take` | frontend/index.html:14360 |
| `meeting-done` | frontend/index.html:14425 |
| `meeting-done-again` | frontend/index.html:14429 |
| `meeting-done-lines` | frontend/index.html:14426 |
| `meeting-done-open` | frontend/index.html:14428 |
| `meeting-help` | frontend/index.html:14305 |
| `meeting-live` | frontend/index.html:14381 |
| `meeting-marker` | frontend/index.html:14354 |
| `meeting-mic` | frontend/index.html:14338 |
| `meeting-mic-controls` | frontend/index.html:14340 |
| `meeting-mic-name` | frontend/index.html:14339 |
| `meeting-overlay` | frontend/index.html:14280 |
| `meeting-pause` | frontend/index.html:14352 |
| `meeting-progress` | frontend/index.html:14385 |
| `meeting-record` | frontend/index.html:14351 |
| `meeting-save` | frontend/index.html:14409 |
| `meeting-save-doc` | frontend/index.html:14415 |
| `meeting-save-row` | frontend/index.html:14405 |
| `meeting-stage` | frontend/index.html:14349 |
| `meeting-status` | frontend/index.html:14390 |
| `meeting-stop-transcribe` | frontend/index.html:14388 |
| `meeting-timer` | frontend/index.html:14355 |
| `meeting-title` | frontend/index.html:14333 |
| `meeting-transcript` | frontend/index.html:14395 |
| `meeting-wave` | frontend/index.html:14377 |
| `memory-add` | frontend/index.html:10296 |
| `memory-budget` | frontend/index.html:10290 |
| `memory-empty` | frontend/index.html:10300 |
| `memory-help` | frontend/index.html:10274 |
| `memory-list` | frontend/index.html:10299 |
| `memory-new` | frontend/index.html:10294 |
| `memory-status` | frontend/index.html:10298 |
| `mic-chat` | frontend/index.html:3060 |
| `mic-note` | frontend/index.html:1694 |
| `mic-settings` | frontend/index.html:11789 |
| `mic-settings-controls` | frontend/index.html:11792 |
| `model-context-help` | frontend/index.html:9398 |
| `model-context-note` | frontend/index.html:9397 |
| `model-context-row` | frontend/index.html:9385 |
| `model-context-window` | frontend/index.html:9387 |
| `model-spec` | frontend/index.html:9371 |
| `model-spec-health` | frontend/index.html:9372 |
| `models-config` | frontend/index.html:9356 |
| `models-skeleton` | frontend/index.html:9279 |
| `most-used` | frontend/index.html:1402 |
| `most-used-box` | frontend/index.html:1400 |
| `motion-help` | frontend/index.html:10890 |
| `nav-group-about` | frontend/index.html:9266 |
| `nav-group-ai` | frontend/index.html:9222 |
| `nav-group-look` | frontend/index.html:9247 |
| `nav-group-security` | frontend/index.html:9253 |
| `nav-group-system` | frontend/index.html:9259 |
| `nav-group-you` | frontend/index.html:9234 |
| `new-chat-btn` | frontend/index.html:2047 |
| `no-match-message` | frontend/index.html:2510 |
| `note-outbox-notice` | frontend/index.html:1562 |
| `note-outbox-retry` | frontend/index.html:1564 |
| `note-picker-clear` | frontend/index.html:3020 |
| `note-picker-close` | frontend/index.html:2973 |
| `note-picker-count` | frontend/index.html:3019 |
| `note-picker-done` | frontend/index.html:3021 |
| `note-picker-help` | frontend/index.html:2977 |
| `note-picker-list` | frontend/index.html:3014 |
| `note-picker-panel` | frontend/index.html:2959 |
| `note-picker-search` | frontend/index.html:3011 |
| `note-picker-sources` | frontend/index.html:2990 |
| `note-search` | frontend/index.html:2352 |
| `note-sort` | frontend/index.html:2369 |
| `note-template-dialog` | frontend/index.html:1035 |
| `note-template-list` | frontend/index.html:1045 |
| `note-template-manage` | frontend/index.html:1049 |
| `note-template-preview` | frontend/index.html:1046 |
| `note-template-title` | frontend/index.html:1038 |
| `note-template-use` | frontend/index.html:1051 |
| `note-toolbar` | frontend/index.html:1585 |
| `notes-expand-all` | frontend/index.html:2429 |
| `notes-filter-menu` | frontend/index.html:2357 |
| `notes-manage-tags` | frontend/index.html:2427 |
| `notes-more-menu` | frontend/index.html:2404 |
| `notes-new-note` | frontend/index.html:2457 |
| `notes-page-next` | frontend/index.html:2502 |
| `notes-page-prev` | frontend/index.html:2500 |
| `notes-page-size` | frontend/index.html:2440 |
| `notes-page-status` | frontend/index.html:2501 |
| `notes-pagination` | frontend/index.html:2499 |
| `notes-rail` | frontend/index.html:2527 |
| `notes-rail-body` | frontend/index.html:2556 |
| `notes-rail-close` | frontend/index.html:2536 |
| `notes-rail-count` | frontend/index.html:2530 |
| `notes-rail-help` | frontend/index.html:2541 |
| `notes-rail-subject` | frontend/index.html:2555 |
| `notes-rail-title` | frontend/index.html:2529 |
| `notes-rail-toggle` | frontend/index.html:2436 |
| `notes-refresh` | frontend/index.html:2425 |
| `notes-subtabs` | frontend/index.html:1471 |
| `notes-tidy` | frontend/index.html:2402 |
| `notes-tidy-count` | frontend/index.html:2403 |
| `notes-view-cards` | frontend/index.html:2385 |
| `notes-view-rows` | frontend/index.html:2383 |
| `notif-activity-mode` | frontend/index.html:254 |
| `notif-btn` | frontend/index.html:204 |
| `notif-clear` | frontend/index.html:267 |
| `notif-close` | frontend/index.html:227 |
| `notif-list` | frontend/index.html:231 |
| `notif-mark-all-read` | frontend/index.html:265 |
| `notif-mute-toggle` | frontend/index.html:224 |
| `notif-panel` | frontend/index.html:207 |
| `notif-unread` | frontend/index.html:221 |
| `notifications-help` | frontend/index.html:11737 |
| `ocr-boxes` | frontend/index.html:8833 |
| `ocr-caption` | frontend/index.html:8871 |
| `ocr-clean-loops` | frontend/index.html:8928 |
| `ocr-close` | frontend/index.html:8672 |
| `ocr-copy-all` | frontend/index.html:8949 |
| `ocr-delete-reading` | frontend/index.html:8921 |
| `ocr-describe` | frontend/index.html:8942 |
| `ocr-describe-label` | frontend/index.html:8943 |
| `ocr-dock` | frontend/index.html:8688 |
| `ocr-edit-box` | frontend/index.html:8898 |
| `ocr-edit-cancel` | frontend/index.html:8901 |
| `ocr-edit-panel` | frontend/index.html:8896 |
| `ocr-edit-save` | frontend/index.html:8900 |
| `ocr-empty` | frontend/index.html:8907 |
| `ocr-engine` | frontend/index.html:8767 |
| `ocr-engine-dot` | frontend/index.html:8736 |
| `ocr-file` | frontend/index.html:8659 |
| `ocr-find` | frontend/index.html:8865 |
| `ocr-find-count` | frontend/index.html:8867 |
| `ocr-find-next` | frontend/index.html:8869 |
| `ocr-find-prev` | frontend/index.html:8868 |
| `ocr-help` | frontend/index.html:8675 |
| `ocr-help-toggle` | frontend/index.html:8774 |
| `ocr-image` | frontend/index.html:8815 |
| `ocr-live-text` | frontend/index.html:8836 |
| `ocr-message` | frontend/index.html:8872 |
| `ocr-model-apply` | frontend/index.html:9489 |
| `ocr-model-help` | frontend/index.html:9493 |
| `ocr-model-note` | frontend/index.html:9491 |
| `ocr-model-select` | frontend/index.html:9488 |
| `ocr-more` | frontend/index.html:8970 |
| `ocr-next-page` | frontend/index.html:8669 |
| `ocr-other-readings` | frontend/index.html:8876 |
| `ocr-page-label` | frontend/index.html:8668 |
| `ocr-page-pane` | frontend/index.html:8813 |
| `ocr-pager` | frontend/index.html:8665 |
| `ocr-prev-page` | frontend/index.html:8666 |
| `ocr-rail` | frontend/index.html:8811 |
| `ocr-rail-switch` | frontend/index.html:8809 |
| `ocr-rapidocr-install` | frontend/index.html:8758 |
| `ocr-rapidocr-missing` | frontend/index.html:8756 |
| `ocr-read-menu-slot` | frontend/index.html:8794 |
| `ocr-read-page` | frontend/index.html:8789 |
| `ocr-read-page-label` | frontend/index.html:8790 |
| `ocr-read-split` | frontend/index.html:8788 |
| `ocr-reader` | frontend/index.html:8745 |
| `ocr-reader-menu` | frontend/index.html:8734 |
| `ocr-reader-name` | frontend/index.html:8737 |
| `ocr-region-cancel` | frontend/index.html:8850 |
| `ocr-region-describe` | frontend/index.html:8848 |
| `ocr-region-list` | frontend/index.html:8908 |
| `ocr-region-popover` | frontend/index.html:8843 |
| `ocr-region-read` | frontend/index.html:8846 |
| `ocr-region-results` | frontend/index.html:8892 |
| `ocr-region-size` | frontend/index.html:8845 |
| `ocr-regions` | frontend/index.html:8694 |
| `ocr-scroll` | frontend/index.html:8856 |
| `ocr-select` | frontend/index.html:8832 |
| `ocr-source` | frontend/index.html:8660 |
| `ocr-stage` | frontend/index.html:8814 |
| `ocr-stop-read` | frontend/index.html:8882 |
| `ocr-to-chat` | frontend/index.html:8962 |
| `ocr-to-note` | frontend/index.html:8971 |
| `ocr-tools-more` | frontend/index.html:8781 |
| `ocr-view` | frontend/index.html:8717 |
| `ocr-workspace` | frontend/index.html:8639 |
| `ocr-zoom` | frontend/index.html:8704 |
| `ocr-zoom-fit` | frontend/index.html:8711 |
| `ocr-zoom-in` | frontend/index.html:8709 |
| `ocr-zoom-level` | frontend/index.html:8707 |
| `ocr-zoom-out` | frontend/index.html:8705 |
| `offline-indicator` | frontend/index.html:8512 |
| `ollama-help` | frontend/index.html:9289 |
| `ollama-status` | frontend/index.html:9276 |
| `onboarding-actions` | frontend/index.html:14473 |
| `onboarding-atlas` | frontend/index.html:14465 |
| `onboarding-back` | frontend/index.html:14479 |
| `onboarding-card` | frontend/index.html:14462 |
| `onboarding-dots` | frontend/index.html:14475 |
| `onboarding-emblem` | frontend/index.html:14464 |
| `onboarding-icon` | frontend/index.html:14466 |
| `onboarding-next` | frontend/index.html:14480 |
| `onboarding-overlay` | frontend/index.html:14460 |
| `onboarding-skip` | frontend/index.html:14477 |
| `onboarding-slide` | frontend/index.html:14463 |
| `onboarding-text` | frontend/index.html:14468 |
| `onboarding-title` | frontend/index.html:14467 |
| `open-exports-folder` | frontend/index.html:12373 |
| `open-exports-row` | frontend/index.html:12372 |
| `packages-help` | frontend/index.html:11406 |
| `page-bg-clear` | frontend/index.html:10736 |
| `page-bg-custom` | frontend/index.html:10735 |
| `page-wash-row` | frontend/index.html:10928 |
| `page-wash-toggle` | frontend/index.html:10929 |
| `palette-card` | frontend/index.html:13906 |
| `palette-grid` | frontend/index.html:10684 |
| `palette-input` | frontend/index.html:13907 |
| `palette-list` | frontend/index.html:13910 |
| `palette-overlay` | frontend/index.html:13905 |
| `palette-preview` | frontend/index.html:13911 |
| `perf-mode` | frontend/index.html:10913 |
| `perf-mode-hint` | frontend/index.html:10911 |
| `perf-mode-row` | frontend/index.html:10907 |
| `persona-add` | frontend/index.html:10034 |
| `persona-export` | frontend/index.html:10041 |
| `persona-import` | frontend/index.html:10042 |
| `persona-import-file` | frontend/index.html:10043 |
| `persona-list` | frontend/index.html:9967 |
| `persona-name` | frontend/index.html:10029 |
| `persona-peek` | frontend/index.html:3207 |
| `persona-peek-panel` | frontend/index.html:3223 |
| `persona-placeholder-hint` | frontend/index.html:10032 |
| `persona-prompt` | frontend/index.html:3211 |
| `persona-prompt` | frontend/index.html:10030 |
| `persona-prompt-text` | frontend/index.html:3225 |
| `persona-select` | frontend/index.html:3202 |
| `persona-select-mark` | frontend/index.html:3201 |
| `persona-status` | frontend/index.html:10035 |
| `personas-help` | frontend/index.html:9958 |
| `phone-more-btn` | frontend/index.html:8398 |
| `phone-tab-dock` | frontend/index.html:8393 |
| `power-saver-indicator` | frontend/index.html:8502 |
| `pref-ai-first-filing` | frontend/index.html:12169 |
| `pref-auto-caption-images` | frontend/index.html:12204 |
| `pref-auto-capture` | frontend/index.html:12236 |
| `pref-auto-dedupe` | frontend/index.html:12222 |
| `pref-auto-file-sensitive` | frontend/index.html:12176 |
| `pref-auto-link` | frontend/index.html:12218 |
| `pref-auto-read-image-text` | frontend/index.html:12208 |
| `pref-auto-stale-review` | frontend/index.html:12226 |
| `pref-auto-tag` | frontend/index.html:12214 |
| `pref-auto-update` | frontend/index.html:13700 |
| `pref-autocorrect` | frontend/index.html:11751 |
| `pref-autonomous-interval` | frontend/index.html:12251 |
| `pref-autonomous-model` | frontend/index.html:12254 |
| `pref-autonomous-tasks` | frontend/index.html:12121 |
| `pref-background-filing` | frontend/index.html:12185 |
| `pref-battery-mode` | frontend/index.html:12299 |
| `pref-bin-days` | frontend/index.html:11696 |
| `pref-chat-retention` | frontend/index.html:11702 |
| `pref-close-to-tray` | frontend/index.html:13807 |
| `pref-display-name` | frontend/index.html:11646 |
| `pref-export-dir` | frontend/index.html:12388 |
| `pref-export-dir-reset` | frontend/index.html:12389 |
| `pref-filing-style` | frontend/index.html:12162 |
| `pref-filing-style-name` | frontend/index.html:12159 |
| `pref-filing-wait` | frontend/index.html:12199 |
| `pref-filing-wait-reset` | frontend/index.html:12201 |
| `pref-new-window-on-launch` | frontend/index.html:13827 |
| `pref-notif-mute-except-reminders` | frontend/index.html:11720 |
| `pref-profile` | frontend/index.html:11660 |
| `pref-profile-count` | frontend/index.html:11662 |
| `pref-profile-enabled` | frontend/index.html:11657 |
| `pref-search-min-sim` | frontend/index.html:9930 |
| `pref-search-reset` | frontend/index.html:9937 |
| `pref-search-suggest` | frontend/index.html:11768 |
| `pref-search-z-margin` | frontend/index.html:9934 |
| `pref-searxng` | frontend/index.html:11910 |
| `pref-semantic-auto-install` | frontend/index.html:9784 |
| `pref-show-console` | frontend/index.html:13787 |
| `pref-show-thinking-words` | frontend/index.html:11015 |
| `pref-simple-mode` | frontend/index.html:11807 |
| `pref-single-keys` | frontend/index.html:11507 |
| `pref-smart-model-routing` | frontend/index.html:9430 |
| `pref-smart-punctuation` | frontend/index.html:11746 |
| `pref-style` | frontend/index.html:9976 |
| `pref-update-channel-main` | frontend/index.html:13726 |
| `pref-update-check` | frontend/index.html:13676 |
| `pref-voice` | frontend/index.html:9984 |
| `pref-warm-search-model` | frontend/index.html:12191 |
| `pref-web-search` | frontend/index.html:11887 |
| `prefs-save` | frontend/index.html:11669 |
| `prefs-status` | frontend/index.html:11670 |
| `prefs-unsaved` | frontend/index.html:11671 |
| `privacy-covers` | frontend/index.html:13226 |
| `privacy-destinations` | frontend/index.html:13250 |
| `privacy-empty` | frontend/index.html:13251 |
| `privacy-help` | frontend/index.html:13225 |
| `privacy-lan-addresses` | frontend/index.html:13263 |
| `privacy-listening` | frontend/index.html:13262 |
| `privacy-model` | frontend/index.html:13256 |
| `privacy-model-meta` | frontend/index.html:13257 |
| `privacy-range` | frontend/index.html:13244 |
| `privacy-range-note` | frontend/index.html:13249 |
| `privacy-refresh` | frontend/index.html:13273 |
| `privacy-switches` | frontend/index.html:13269 |
| `privacy-verdict` | frontend/index.html:13239 |
| `profile-avatar` | frontend/index.html:11609 |
| `profile-delete` | frontend/index.html:11681 |
| `profile-head-name` | frontend/index.html:11611 |
| `profile-look` | frontend/index.html:11615 |
| `profile-look-parts` | frontend/index.html:11626 |
| `profile-look-reset` | frontend/index.html:11622 |
| `profile-look-shuffle` | frontend/index.html:11619 |
| `progress-motion` | frontend/index.html:11003 |
| `progress-motion-hint` | frontend/index.html:11001 |
| `progress-motion-row` | frontend/index.html:10992 |
| `question` | frontend/index.html:2100 |
| `questions` | frontend/index.html:2276 |
| `questions-ask` | frontend/index.html:2294 |
| `questions-heading` | frontend/index.html:2279 |
| `questions-help-body` | frontend/index.html:2305 |
| `questions-help-toggle` | frontend/index.html:2298 |
| `questions-lead` | frontend/index.html:2317 |
| `questions-list` | frontend/index.html:2318 |
| `questions-more` | frontend/index.html:2319 |
| `questions-refresh` | frontend/index.html:2296 |
| `questions-state` | frontend/index.html:2287 |
| `quick-note` | frontend/index.html:1105 |
| `quick-note-clear` | frontend/index.html:1135 |
| `quick-note-close` | frontend/index.html:1114 |
| `quick-note-help` | frontend/index.html:1118 |
| `quick-note-more` | frontend/index.html:1136 |
| `quick-note-save` | frontend/index.html:1137 |
| `quick-note-status` | frontend/index.html:1133 |
| `quick-note-text` | frontend/index.html:1131 |
| `quick-note-title` | frontend/index.html:1107 |
| `quit-btn` | frontend/index.html:294 |
| `quit-help` | frontend/index.html:12314 |
| `radius-slider` | frontend/index.html:10818 |
| `radius-value` | frontend/index.html:10820 |
| `raw-results` | frontend/index.html:2268 |
| `recent-changes-box` | frontend/index.html:12805 |
| `recent-changes-help` | frontend/index.html:12815 |
| `recent-changes-list` | frontend/index.html:12824 |
| `recent-questions` | frontend/index.html:2137 |
| `recording-dock` | frontend/index.html:8405 |
| `recording-dock-open` | frontend/index.html:8412 |
| `recording-dock-pause` | frontend/index.html:8413 |
| `recording-dock-stop` | frontend/index.html:8414 |
| `recording-dock-time` | frontend/index.html:8409 |
| `recording-dock-title` | frontend/index.html:8408 |
| `recordings-captions` | frontend/index.html:8250 |
| `recordings-help` | frontend/index.html:8255 |
| `recordings-list` | frontend/index.html:8264 |
| `recordings-record` | frontend/index.html:8259 |
| `recordings-search` | frontend/index.html:8244 |
| `recovery-key-copy` | frontend/index.html:503 |
| `recovery-key-dialog` | frontend/index.html:462 |
| `recovery-key-dialog-help` | frontend/index.html:475 |
| `recovery-key-done` | frontend/index.html:507 |
| `recovery-key-download` | frontend/index.html:504 |
| `recovery-key-error` | frontend/index.html:510 |
| `recovery-key-help` | frontend/index.html:13157 |
| `recovery-key-lead` | frontend/index.html:500 |
| `recovery-key-make` | frontend/index.html:496 |
| `recovery-key-offer` | frontend/index.html:492 |
| `recovery-key-show` | frontend/index.html:499 |
| `recovery-key-skip` | frontend/index.html:495 |
| `recovery-key-title` | frontend/index.html:464 |
| `recovery-key-value` | frontend/index.html:501 |
| `reduce-motion-row` | frontend/index.html:11020 |
| `reduce-motion-toggle` | frontend/index.html:11021 |
| `reindex-blurb` | frontend/index.html:9883 |
| `reindex-box` | frontend/index.html:9857 |
| `reindex-help` | frontend/index.html:9866 |
| `reindex-label` | frontend/index.html:9876 |
| `reindex-progress` | frontend/index.html:9875 |
| `reindex-stale` | frontend/index.html:9881 |
| `reindex-start` | frontend/index.html:9884 |
| `rekey-help` | frontend/index.html:13092 |
| `reminder-add` | frontend/index.html:5525 |
| `reminder-clear-done` | frontend/index.html:5621 |
| `reminder-clock` | frontend/index.html:5482 |
| `reminder-compose` | frontend/index.html:5479 |
| `reminder-date` | frontend/index.html:5511 |
| `reminder-due` | frontend/index.html:5513 |
| `reminder-due-day-down` | frontend/index.html:5581 |
| `reminder-due-day-up` | frontend/index.html:5584 |
| `reminder-due-nudge-down` | frontend/index.html:5574 |
| `reminder-due-nudge-up` | frontend/index.html:5577 |
| `reminder-due-readout` | frontend/index.html:5593 |
| `reminder-due-row` | frontend/index.html:5547 |
| `reminder-filter` | frontend/index.html:5684 |
| `reminder-groups` | frontend/index.html:5689 |
| `reminder-list-card` | frontend/index.html:5600 |
| `reminder-magic` | frontend/index.html:5494 |
| `reminder-magic-add` | frontend/index.html:5499 |
| `reminder-magic-row` | frontend/index.html:5488 |
| `reminder-magic-status` | frontend/index.html:5501 |
| `reminder-presets` | frontend/index.html:5550 |
| `reminder-presets-menu` | frontend/index.html:5548 |
| `reminder-priority` | frontend/index.html:5514 |
| `reminder-recurring` | frontend/index.html:5519 |
| `reminder-text` | frontend/index.html:5503 |
| `reminder-time` | frontend/index.html:5512 |
| `reminder-view-calendar` | frontend/index.html:5615 |
| `reminder-view-toggle` | frontend/index.html:5613 |
| `reminders-done-page-next` | frontend/index.html:5695 |
| `reminders-done-page-prev` | frontend/index.html:5693 |
| `reminders-done-page-status` | frontend/index.html:5694 |
| `reminders-done-pagination` | frontend/index.html:5692 |
| `reminders-empty` | frontend/index.html:5697 |
| `reminders-export-ics` | frontend/index.html:5637 |
| `reminders-help` | frontend/index.html:5628 |
| `reminders-help-toggle` | frontend/index.html:5625 |
| `reminders-import-ics` | frontend/index.html:5642 |
| `reminders-import-ics-file` | frontend/index.html:5645 |
| `reminders-more-menu` | frontend/index.html:5631 |
| `reminders-new` | frontend/index.html:5662 |
| `reminders-notif-help` | frontend/index.html:5677 |
| `reminders-page-size` | frontend/index.html:5648 |
| `response-mode-select` | frontend/index.html:3194 |
| `restore-bundle` | frontend/index.html:12505 |
| `restore-bundle-file` | frontend/index.html:12504 |
| `restore-bundle-help` | frontend/index.html:12491 |
| `restore-bundle-password` | frontend/index.html:12507 |
| `restore-bundle-status` | frontend/index.html:12510 |
| `retry-btn` | frontend/index.html:2223 |
| `run-budget-help` | frontend/index.html:10510 |
| `run-budget-seconds` | frontend/index.html:10542 |
| `run-budget-status` | frontend/index.html:10545 |
| `run-budget-tokens` | frontend/index.html:10534 |
| `sampling-box` | frontend/index.html:9574 |
| `sampling-help` | frontend/index.html:9582 |
| `sampling-model` | frontend/index.html:9589 |
| `sampling-note` | frontend/index.html:9597 |
| `sampling-reset` | frontend/index.html:9592 |
| `sampling-rows` | frontend/index.html:9590 |
| `save-btn` | frontend/index.html:1751 |
| `save-draft-btn` | frontend/index.html:1748 |
| `save-search` | frontend/index.html:2363 |
| `save-status` | frontend/index.html:1753 |
| `saved-finds` | frontend/index.html:1409 |
| `saved-finds-box` | frontend/index.html:1407 |
| `saved-searches` | frontend/index.html:2479 |
| `search-engine-config` | frontend/index.html:9724 |
| `search-engine-health` | frontend/index.html:9701 |
| `search-engine-help` | frontend/index.html:9733 |
| `search-help` | frontend/index.html:2391 |
| `search-help-hint` | frontend/index.html:2482 |
| `search-mode` | frontend/index.html:2266 |
| `search-provider-picker` | frontend/index.html:11894 |
| `search-provider-status` | frontend/index.html:11896 |
| `search-relevance-group` | frontend/index.html:9900 |
| `search-relevance-help` | frontend/index.html:9909 |
| `search-relevance-intro` | frontend/index.html:9916 |
| `search-suggest-box` | frontend/index.html:11758 |
| `search-suggest-help` | frontend/index.html:11772 |
| `searxng-autostart` | frontend/index.html:11981 |
| `searxng-backend` | frontend/index.html:11949 |
| `searxng-detect` | frontend/index.html:11912 |
| `searxng-help` | frontend/index.html:11917 |
| `searxng-host-help` | frontend/index.html:11943 |
| `searxng-host-state` | frontend/index.html:11940 |
| `searxng-host-status` | frontend/index.html:11969 |
| `searxng-install-line` | frontend/index.html:11988 |
| `searxng-install-progress` | frontend/index.html:11986 |
| `searxng-output` | frontend/index.html:11993 |
| `searxng-output-fold` | frontend/index.html:11991 |
| `searxng-port` | frontend/index.html:11952 |
| `searxng-reinstall` | frontend/index.html:11966 |
| `searxng-start` | frontend/index.html:11964 |
| `searxng-status` | frontend/index.html:11915 |
| `searxng-stop` | frontend/index.html:11965 |
| `select-btn` | frontend/index.html:2390 |
| `semantic-auto-install-help` | frontend/index.html:9794 |
| `semantic-search-toggle` | frontend/index.html:2361 |
| `sessions-help` | frontend/index.html:13120 |
| `settings-about` | frontend/index.html:13508 |
| `settings-account` | frontend/index.html:12830 |
| `settings-appearance` | frontend/index.html:10600 |
| `settings-btn` | frontend/index.html:286 |
| `settings-close` | frontend/index.html:9192 |
| `settings-data` | frontend/index.html:12326 |
| `settings-extras` | frontend/index.html:11393 |
| `settings-file-export` | frontend/index.html:12439 |
| `settings-file-group` | frontend/index.html:12412 |
| `settings-file-help` | frontend/index.html:12422 |
| `settings-file-import` | frontend/index.html:12442 |
| `settings-file-input` | frontend/index.html:12445 |
| `settings-file-status` | frontend/index.html:12448 |
| `settings-general` | frontend/index.html:11691 |
| `settings-guide-btn` | frontend/index.html:9173 |
| `settings-help` | frontend/index.html:13420 |
| `settings-learned` | frontend/index.html:10319 |
| `settings-logs` | frontend/index.html:13278 |
| `settings-manage-categories` | frontend/index.html:12146 |
| `settings-manage-tags` | frontend/index.html:12153 |
| `settings-memory` | frontend/index.html:10262 |
| `settings-modal` | frontend/index.html:9134 |
| `settings-modal-nav` | frontend/index.html:9175 |
| `settings-models` | frontend/index.html:9275 |
| `settings-nav` | frontend/index.html:9201 |
| `settings-nav-appearance` | frontend/index.html:9249 |
| `settings-nav-back` | frontend/index.html:9176 |
| `settings-nav-forward` | frontend/index.html:9177 |
| `settings-nav-help` | frontend/index.html:9268 |
| `settings-nav-models` | frontend/index.html:9224 |
| `settings-notif-help` | frontend/index.html:11730 |
| `settings-peek` | frontend/index.html:9188 |
| `settings-personas` | frontend/index.html:9944 |
| `settings-preferences` | frontend/index.html:11603 |
| `settings-privacy` | frontend/index.html:13213 |
| `settings-profile-btn` | frontend/index.html:9171 |
| `settings-results` | frontend/index.html:9214 |
| `settings-search` | frontend/index.html:9207 |
| `settings-search-count` | frontend/index.html:9210 |
| `settings-searchindex` | frontend/index.html:9700 |
| `settings-shortcuts` | frontend/index.html:11496 |
| `settings-skills` | frontend/index.html:10049 |
| `settings-skills-help` | frontend/index.html:10066 |
| `settings-tasks` | frontend/index.html:12017 |
| `settings-templates` | frontend/index.html:10209 |
| `settings-tools` | frontend/index.html:10417 |
| `settings-websearch` | frontend/index.html:11851 |
| `shadow-intensity` | frontend/index.html:10871 |
| `shadow-intensity-value` | frontend/index.html:10873 |
| `shortcut-head-whiteboard` | frontend/index.html:14069 |
| `shortcut-list` | frontend/index.html:14029 |
| `shortcut-list-documents` | frontend/index.html:14065 |
| `shortcut-list-documents-note` | frontend/index.html:14066 |
| `shortcut-list-settings` | frontend/index.html:11504 |
| `shortcut-list-whiteboard` | frontend/index.html:14074 |
| `shortcut-list-whiteboard-note` | frontend/index.html:14075 |
| `shortcut-status` | frontend/index.html:14030 |
| `shortcut-status-settings` | frontend/index.html:11505 |
| `shortcuts-card` | frontend/index.html:14020 |
| `shortcuts-close` | frontend/index.html:14024 |
| `shortcuts-overlay` | frontend/index.html:14018 |
| `shortcuts-overlay-always-help` | frontend/index.html:14044 |
| `shortcuts-reset` | frontend/index.html:14032 |
| `shortcuts-reset-settings` | frontend/index.html:11511 |
| `show-guide-btn` | frontend/index.html:13436 |
| `sidebar` | frontend/index.html:1389 |
| `sign-in-help` | frontend/index.html:12865 |
| `simple-mode-box` | frontend/index.html:11797 |
| `simple-mode-help` | frontend/index.html:11810 |
| `sketch-bg-canvas` | frontend/index.html:14253 |
| `sketch-bg-color-picker` | frontend/index.html:14248 |
| `sketch-btn` | frontend/index.html:1693 |
| `sketch-canvas` | frontend/index.html:14254 |
| `sketch-canvas-wrap` | frontend/index.html:14252 |
| `sketch-caption` | frontend/index.html:14264 |
| `sketch-card` | frontend/index.html:14193 |
| `sketch-clear` | frontend/index.html:14246 |
| `sketch-close` | frontend/index.html:14197 |
| `sketch-foot` | frontend/index.html:14263 |
| `sketch-image-input` | frontend/index.html:14251 |
| `sketch-ink-chip` | frontend/index.html:14223 |
| `sketch-overlay` | frontend/index.html:14192 |
| `sketch-palette` | frontend/index.html:14225 |
| `sketch-redo` | frontend/index.html:14245 |
| `sketch-save` | frontend/index.html:14266 |
| `sketch-size` | frontend/index.html:14239 |
| `sketch-size-value` | frontend/index.html:14240 |
| `sketch-status` | frontend/index.html:14265 |
| `sketch-tool-arrow` | frontend/index.html:14215 |
| `sketch-tool-circ` | frontend/index.html:14217 |
| `sketch-tool-eraser` | frontend/index.html:14213 |
| `sketch-tool-highlighter` | frontend/index.html:14212 |
| `sketch-tool-line` | frontend/index.html:14214 |
| `sketch-tool-pen` | frontend/index.html:14211 |
| `sketch-tool-rect` | frontend/index.html:14216 |
| `sketch-tool-text` | frontend/index.html:14218 |
| `sketch-toolbar` | frontend/index.html:14209 |
| `sketch-undo` | frontend/index.html:14244 |
| `sketch-upload-image` | frontend/index.html:14247 |
| `skill-add` | frontend/index.html:10193 |
| `skill-add-fold` | frontend/index.html:10093 |
| `skill-cancel` | frontend/index.html:10194 |
| `skill-description` | frontend/index.html:10096 |
| `skill-export` | frontend/index.html:10201 |
| `skill-folder-line` | frontend/index.html:10091 |
| `skill-import` | frontend/index.html:10202 |
| `skill-import-file` | frontend/index.html:10203 |
| `skill-inputs` | frontend/index.html:10106 |
| `skill-list` | frontend/index.html:10090 |
| `skill-manual-toggle` | frontend/index.html:3246 |
| `skill-name` | frontend/index.html:10095 |
| `skill-prompt` | frontend/index.html:10098 |
| `skill-run-cancel` | frontend/index.html:14006 |
| `skill-run-card` | frontend/index.html:14002 |
| `skill-run-description` | frontend/index.html:14010 |
| `skill-run-fields` | frontend/index.html:14011 |
| `skill-run-go` | frontend/index.html:14013 |
| `skill-run-overlay` | frontend/index.html:14000 |
| `skill-run-title` | frontend/index.html:14004 |
| `skill-status` | frontend/index.html:10195 |
| `skill-steps` | frontend/index.html:10103 |
| `skill-tool-list` | frontend/index.html:10131 |
| `skill-tools-help` | frontend/index.html:10122 |
| `skill-verify-expect` | frontend/index.html:10172 |
| `skill-verify-help` | frontend/index.html:10155 |
| `skill-verify-tool` | frontend/index.html:10170 |
| `skill-verify-untagged` | frontend/index.html:10182 |
| `skill-verify-value` | frontend/index.html:10178 |
| `skills-add-new` | frontend/index.html:6096 |
| `skills-dashboard-list` | frontend/index.html:6108 |
| `skills-help` | frontend/index.html:6090 |
| `skills-intro` | frontend/index.html:6100 |
| `skills-kind` | frontend/index.html:6075 |
| `skills-logs-clear` | frontend/index.html:6143 |
| `skills-logs-heading` | frontend/index.html:6142 |
| `skills-logs-list` | frontend/index.html:6145 |
| `skills-search` | frontend/index.html:6061 |
| `skills-sidebar` | frontend/index.html:6140 |
| `skills-sort` | frontend/index.html:6083 |
| `skip-link` | frontend/index.html:120 |
| `small-model-mode` | frontend/index.html:10487 |
| `small-model-mode-help` | frontend/index.html:10469 |
| `small-model-mode-status` | frontend/index.html:10494 |
| `space-create-dialog` | frontend/index.html:913 |
| `space-create-error` | frontend/index.html:926 |
| `space-create-icon` | frontend/index.html:925 |
| `space-create-icon-picker` | frontend/index.html:924 |
| `space-create-name` | frontend/index.html:922 |
| `space-create-submit` | frontend/index.html:929 |
| `space-current-icon` | frontend/index.html:140 |
| `space-current-name` | frontend/index.html:141 |
| `space-delete-dialog` | frontend/index.html:953 |
| `space-delete-error` | frontend/index.html:966 |
| `space-delete-fate` | frontend/index.html:962 |
| `space-delete-id` | frontend/index.html:965 |
| `space-delete-submit` | frontend/index.html:969 |
| `space-edit-dialog` | frontend/index.html:933 |
| `space-edit-error` | frontend/index.html:946 |
| `space-edit-icon` | frontend/index.html:945 |
| `space-edit-icon-picker` | frontend/index.html:944 |
| `space-edit-id` | frontend/index.html:940 |
| `space-edit-name` | frontend/index.html:942 |
| `space-edit-submit` | frontend/index.html:949 |
| `space-menu` | frontend/index.html:144 |
| `space-switcher-btn` | frontend/index.html:137 |
| `speak-btn` | frontend/index.html:2227 |
| `status-activity` | frontend/index.html:8501 |
| `status-agent` | frontend/index.html:8526 |
| `status-back` | frontend/index.html:8563 |
| `status-bar` | frontend/index.html:8442 |
| `status-bar-clock-toggle` | frontend/index.html:11337 |
| `status-bar-items` | frontend/index.html:11323 |
| `status-clock` | frontend/index.html:8547 |
| `status-clock-detail` | frontend/index.html:8579 |
| `status-clock-detail-date` | frontend/index.html:8580 |
| `status-clock-detail-time` | frontend/index.html:8581 |
| `status-clock-detail-zone` | frontend/index.html:8582 |
| `status-command` | frontend/index.html:8517 |
| `status-find` | frontend/index.html:8538 |
| `status-forward` | frontend/index.html:8564 |
| `status-guide` | frontend/index.html:8533 |
| `status-nav-history` | frontend/index.html:8570 |
| `status-nav-history-menu` | frontend/index.html:8601 |
| `status-notes` | frontend/index.html:8486 |
| `status-redo` | frontend/index.html:8577 |
| `status-reminders` | frontend/index.html:8487 |
| `status-task` | frontend/index.html:8491 |
| `status-timer` | frontend/index.html:8494 |
| `status-undo` | frontend/index.html:8576 |
| `statusbar-help` | frontend/index.html:11315 |
| `stop-btn` | frontend/index.html:2126 |
| `storage-space-notice` | frontend/index.html:12676 |
| `suggested-box` | frontend/index.html:9650 |
| `suggested-hardware` | frontend/index.html:9659 |
| `suggested-help` | frontend/index.html:9660 |
| `suggested-hide-big` | frontend/index.html:9676 |
| `suggested-hide-wrap` | frontend/index.html:9675 |
| `suggested-list` | frontend/index.html:9679 |
| `suggested-questions` | frontend/index.html:2136 |
| `tab-bar` | frontend/index.html:147 |
| `tab-btn-chat` | frontend/index.html:152 |
| `tab-btn-dashboard` | frontend/index.html:148 |
| `tab-btn-graph` | frontend/index.html:154 |
| `tab-btn-library` | frontend/index.html:164 |
| `tab-btn-notes` | frontend/index.html:150 |
| `tab-btn-reminders` | frontend/index.html:168 |
| `tab-btn-timeline` | frontend/index.html:166 |
| `tab-chat` | frontend/index.html:2562 |
| `tab-dashboard` | frontend/index.html:1277 |
| `tab-documents` | frontend/index.html:4488 |
| `tab-graph` | frontend/index.html:3702 |
| `tab-library` | frontend/index.html:5717 |
| `tab-notes` | frontend/index.html:1386 |
| `tab-reminders` | frontend/index.html:5477 |
| `tab-timeline` | frontend/index.html:3389 |
| `task-history` | frontend/index.html:12058 |
| `task-history-box` | frontend/index.html:12051 |
| `task-history-clear` | frontend/index.html:12059 |
| `task-list` | frontend/index.html:12045 |
| `tasks-empty` | frontend/index.html:12046 |
| `tasks-live-group` | frontend/index.html:12023 |
| `tasks-live-help` | frontend/index.html:12033 |
| `template-add` | frontend/index.html:10251 |
| `template-body` | frontend/index.html:10243 |
| `template-cancel` | frontend/index.html:10255 |
| `template-description` | frontend/index.html:10241 |
| `template-draft` | frontend/index.html:10253 |
| `template-list` | frontend/index.html:10237 |
| `template-name` | frontend/index.html:10240 |
| `template-status` | frontend/index.html:10256 |
| `templates-help` | frontend/index.html:10223 |
| `theme-btn` | frontend/index.html:285 |
| `theme-clear-overrides` | frontend/index.html:10664 |
| `theme-override-note` | frontend/index.html:10623 |
| `theme-presets` | frontend/index.html:10622 |
| `theme-reset` | frontend/index.html:10661 |
| `theme-seg` | frontend/index.html:10692 |
| `themes-help` | frontend/index.html:10615 |
| `thinking-box` | frontend/index.html:2238 |
| `timeline-band` | frontend/index.html:3498 |
| `timeline-band-section` | frontend/index.html:3496 |
| `timeline-batch-bar` | frontend/index.html:3619 |
| `timeline-batch-category-host` | frontend/index.html:3626 |
| `timeline-batch-count` | frontend/index.html:3620 |
| `timeline-batch-delete` | frontend/index.html:3628 |
| `timeline-batch-done` | frontend/index.html:3633 |
| `timeline-batch-more-host` | frontend/index.html:3632 |
| `timeline-batch-select-all` | frontend/index.html:3621 |
| `timeline-batch-tag` | frontend/index.html:3627 |
| `timeline-calendar` | frontend/index.html:3648 |
| `timeline-clear-search` | frontend/index.html:3697 |
| `timeline-count` | frontend/index.html:3413 |
| `timeline-custom-range` | frontend/index.html:3526 |
| `timeline-days` | frontend/index.html:3514 |
| `timeline-days-earlier` | frontend/index.html:3574 |
| `timeline-days-later` | frontend/index.html:3581 |
| `timeline-daystrip` | frontend/index.html:3572 |
| `timeline-daystrip-days` | frontend/index.html:3589 |
| `timeline-density-path` | frontend/index.html:3679 |
| `timeline-empty` | frontend/index.html:3684 |
| `timeline-end-date` | frontend/index.html:3529 |
| `timeline-feed` | frontend/index.html:3649 |
| `timeline-filter-clear` | frontend/index.html:3454 |
| `timeline-group` | frontend/index.html:3485 |
| `timeline-help` | frontend/index.html:3536 |
| `timeline-intro` | frontend/index.html:3546 |
| `timeline-jump-today` | frontend/index.html:3541 |
| `timeline-kinds` | frontend/index.html:3448 |
| `timeline-kinds-btn` | frontend/index.html:3446 |
| `timeline-kinds-label` | frontend/index.html:3447 |
| `timeline-kinds-menu` | frontend/index.html:3445 |
| `timeline-month-btn` | frontend/index.html:3578 |
| `timeline-month-grid` | frontend/index.html:3605 |
| `timeline-month-next` | frontend/index.html:3603 |
| `timeline-month-pop` | frontend/index.html:3599 |
| `timeline-month-prev` | frontend/index.html:3601 |
| `timeline-month-text` | frontend/index.html:3580 |
| `timeline-month-title` | frontend/index.html:3602 |
| `timeline-no-match` | frontend/index.html:3693 |
| `timeline-options` | frontend/index.html:3469 |
| `timeline-options-menu` | frontend/index.html:3467 |
| `timeline-recall` | frontend/index.html:3598 |
| `timeline-scale` | frontend/index.html:3472 |
| `timeline-scale-group` | frontend/index.html:3470 |
| `timeline-scroll` | frontend/index.html:3644 |
| `timeline-scrubber` | frontend/index.html:3676 |
| `timeline-scrubber-window` | frontend/index.html:3680 |
| `timeline-search` | frontend/index.html:3420 |
| `timeline-select-btn` | frontend/index.html:3507 |
| `timeline-start-date` | frontend/index.html:3527 |
| `timeline-table` | frontend/index.html:3659 |
| `timeline-table-body` | frontend/index.html:3673 |
| `timeline-table-head` | frontend/index.html:3661 |
| `timeline-view-calendar` | frontend/index.html:3465 |
| `timeline-view-feed` | frontend/index.html:3463 |
| `timeline-view-seg` | frontend/index.html:3462 |
| `timeline-view-table` | frontend/index.html:3464 |
| `timeline-year` | frontend/index.html:3586 |
| `toast-box` | frontend/index.html:13894 |
| `tool-count` | frontend/index.html:10561 |
| `tool-filter` | frontend/index.html:10559 |
| `tool-filter-empty` | frontend/index.html:10564 |
| `tool-focus-auto` | frontend/index.html:10442 |
| `tool-focus-help` | frontend/index.html:10432 |
| `tool-focus-status` | frontend/index.html:10451 |
| `tool-list` | frontend/index.html:10563 |
| `tools-toggle` | frontend/index.html:3097 |
| `top-bar` | frontend/index.html:123 |
| `tour-back` | frontend/index.html:14539 |
| `tour-block` | frontend/index.html:14517 |
| `tour-block-bottom` | frontend/index.html:14520 |
| `tour-block-left` | frontend/index.html:14521 |
| `tour-block-right` | frontend/index.html:14519 |
| `tour-block-top` | frontend/index.html:14518 |
| `tour-card` | frontend/index.html:14524 |
| `tour-close` | frontend/index.html:14530 |
| `tour-count` | frontend/index.html:14529 |
| `tour-next` | frontend/index.html:14540 |
| `tour-replay-buttons` | frontend/index.html:13440 |
| `tour-section` | frontend/index.html:14527 |
| `tour-skip` | frontend/index.html:14537 |
| `tour-spot` | frontend/index.html:14523 |
| `tour-start-btn` | frontend/index.html:13435 |
| `tour-text` | frontend/index.html:14535 |
| `tour-title` | frontend/index.html:14534 |
| `ui-motion-row` | frontend/index.html:11031 |
| `ui-motion-toggle` | frontend/index.html:11032 |
| `undo-history-menu` | frontend/index.html:8608 |
| `update-apply-now` | frontend/index.html:13687 |
| `update-channel-help` | frontend/index.html:13738 |
| `update-check-now` | frontend/index.html:13680 |
| `update-check-row` | frontend/index.html:13679 |
| `update-check-status` | frontend/index.html:13688 |
| `update-install-version` | frontend/index.html:13772 |
| `update-show-versions` | frontend/index.html:13770 |
| `update-version-row` | frontend/index.html:13769 |
| `update-version-select` | frontend/index.html:13771 |
| `update-version-status` | frontend/index.html:13774 |
| `usage-box` | frontend/index.html:11820 |
| `usage-clear` | frontend/index.html:11843 |
| `usage-help` | frontend/index.html:11830 |
| `usage-most` | frontend/index.html:11840 |
| `usage-unused` | frontend/index.html:11841 |
| `utility-model-apply` | frontend/index.html:9422 |
| `utility-model-help` | frontend/index.html:9435 |
| `utility-model-note` | frontend/index.html:9427 |
| `utility-model-select` | frontend/index.html:9421 |
| `vision-model-apply` | frontend/index.html:9459 |
| `vision-model-help` | frontend/index.html:9463 |
| `vision-model-note` | frontend/index.html:9461 |
| `vision-model-select` | frontend/index.html:9458 |
| `voice-model-select` | frontend/index.html:11449 |
| `voice-model-wrap` | frontend/index.html:11447 |
| `wb-add-image` | frontend/index.html:7079 |
| `wb-add-note` | frontend/index.html:6783 |
| `wb-add-sticker` | frontend/index.html:7086 |
| `wb-add-to-note` | frontend/index.html:6753 |
| `wb-align-bottom` | frontend/index.html:7381 |
| `wb-align-hcenter` | frontend/index.html:7377 |
| `wb-align-left` | frontend/index.html:7376 |
| `wb-align-right` | frontend/index.html:7378 |
| `wb-align-top` | frontend/index.html:7379 |
| `wb-align-vcenter` | frontend/index.html:7380 |
| `wb-announcer` | frontend/index.html:6418 |
| `wb-arrange-menu` | frontend/index.html:6579 |
| `wb-arrow-head` | frontend/index.html:7243 |
| `wb-arrow-style` | frontend/index.html:7234 |
| `wb-back-to-boards` | frontend/index.html:6503 |
| `wb-bg-color-picker` | frontend/index.html:6643 |
| `wb-bg-color-reset` | frontend/index.html:6644 |
| `wb-bg-image` | frontend/index.html:6645 |
| `wb-bg-image-input` | frontend/index.html:6703 |
| `wb-board-kind` | frontend/index.html:6747 |
| `wb-board-kind-label` | frontend/index.html:6747 |
| `wb-board-menu` | frontend/index.html:6707 |
| `wb-board-select` | frontend/index.html:6505 |
| `wb-boards-generate` | frontend/index.html:6267 |
| `wb-boards-help` | frontend/index.html:6239 |
| `wb-boards-import` | frontend/index.html:6268 |
| `wb-boards-intro` | frontend/index.html:6298 |
| `wb-boards-landing` | frontend/index.html:6157 |
| `wb-boards-new` | frontend/index.html:6291 |
| `wb-boards-new-map` | frontend/index.html:6293 |
| `wb-boards-new-menu` | frontend/index.html:6287 |
| `wb-boards-new-template` | frontend/index.html:6292 |
| `wb-canvas-view` | frontend/index.html:6325 |
| `wb-clear-board` | frontend/index.html:6777 |
| `wb-context` | frontend/index.html:7225 |
| `wb-context-menu` | frontend/index.html:7411 |
| `wb-copy-link` | frontend/index.html:6761 |
| `wb-copy-style` | frontend/index.html:7418 |
| `wb-copy-style-row` | frontend/index.html:7415 |
| `wb-delete-board` | frontend/index.html:6778 |
| `wb-distribute-h` | frontend/index.html:7384 |
| `wb-distribute-v` | frontend/index.html:7385 |
| `wb-dock-toggle` | frontend/index.html:6636 |
| `wb-edit-menu` | frontend/index.html:6549 |
| `wb-empty-hint` | frontend/index.html:6463 |
| `wb-empty-hint-actions` | frontend/index.html:6477 |
| `wb-empty-hint-close` | frontend/index.html:6474 |
| `wb-empty-hint-dismiss` | frontend/index.html:6481 |
| `wb-empty-hint-keys` | frontend/index.html:6478 |
| `wb-export` | frontend/index.html:6737 |
| `wb-extract-notes` | frontend/index.html:7449 |
| `wb-fill-color` | frontend/index.html:7250 |
| `wb-fill-on` | frontend/index.html:7251 |
| `wb-fill-opacity` | frontend/index.html:7428 |
| `wb-fill-opacity-row` | frontend/index.html:7428 |
| `wb-fmt-align` | frontend/index.html:7915 |
| `wb-fmt-alpha` | frontend/index.html:7868 |
| `wb-fmt-alpha-out` | frontend/index.html:7868 |
| `wb-fmt-angle` | frontend/index.html:7936 |
| `wb-fmt-bold` | frontend/index.html:7910 |
| `wb-fmt-copy-style` | frontend/index.html:7899 |
| `wb-fmt-dash` | frontend/index.html:7861 |
| `wb-fmt-endcap` | frontend/index.html:7892 |
| `wb-fmt-fill` | frontend/index.html:7856 |
| `wb-fmt-fill-on` | frontend/index.html:7856 |
| `wb-fmt-flip-h` | frontend/index.html:7939 |
| `wb-fmt-flip-v` | frontend/index.html:7940 |
| `wb-fmt-fold` | frontend/index.html:7870 |
| `wb-fmt-h` | frontend/index.html:7934 |
| `wb-fmt-ink` | frontend/index.html:7907 |
| `wb-fmt-italic` | frontend/index.html:7911 |
| `wb-fmt-jumps` | frontend/index.html:7881 |
| `wb-fmt-label-t` | frontend/index.html:7895 |
| `wb-fmt-paste-style` | frontend/index.html:7900 |
| `wb-fmt-prop-add` | frontend/index.html:7950 |
| `wb-fmt-props` | frontend/index.html:7949 |
| `wb-fmt-rough` | frontend/index.html:7872 |
| `wb-fmt-route` | frontend/index.html:7874 |
| `wb-fmt-save-style` | frontend/index.html:7901 |
| `wb-fmt-shadow` | frontend/index.html:7871 |
| `wb-fmt-size` | frontend/index.html:7906 |
| `wb-fmt-startcap` | frontend/index.html:7889 |
| `wb-fmt-stroke` | frontend/index.html:7858 |
| `wb-fmt-stroke-word` | frontend/index.html:7858 |
| `wb-fmt-valign` | frontend/index.html:7922 |
| `wb-fmt-w` | frontend/index.html:7933 |
| `wb-fmt-width` | frontend/index.html:7859 |
| `wb-fmt-x` | frontend/index.html:7931 |
| `wb-fmt-y` | frontend/index.html:7932 |
| `wb-format` | frontend/index.html:7840 |
| `wb-format-body` | frontend/index.html:7851 |
| `wb-format-close` | frontend/index.html:7843 |
| `wb-format-commands` | frontend/index.html:7943 |
| `wb-format-empty` | frontend/index.html:7852 |
| `wb-format-none` | frontend/index.html:7853 |
| `wb-format-tab-arrange` | frontend/index.html:7848 |
| `wb-format-tab-data` | frontend/index.html:7849 |
| `wb-format-tab-style` | frontend/index.html:7846 |
| `wb-format-tab-text` | frontend/index.html:7847 |
| `wb-format-tabs` | frontend/index.html:7845 |
| `wb-format-title` | frontend/index.html:7842 |
| `wb-fullscreen` | frontend/index.html:6784 |
| `wb-gestures` | frontend/index.html:6338 |
| `wb-gestures-dismiss` | frontend/index.html:6343 |
| `wb-grid-select` | frontend/index.html:6650 |
| `wb-guide-color-center` | frontend/index.html:7444 |
| `wb-guide-color-edge` | frontend/index.html:7443 |
| `wb-guide-color-spacing` | frontend/index.html:7445 |
| `wb-help-about` | frontend/index.html:14105 |
| `wb-help-btn` | frontend/index.html:6768 |
| `wb-help-card` | frontend/index.html:14094 |
| `wb-help-close` | frontend/index.html:14101 |
| `wb-help-none` | frontend/index.html:14117 |
| `wb-help-overlay` | frontend/index.html:14092 |
| `wb-help-search` | frontend/index.html:14113 |
| `wb-help-sections` | frontend/index.html:14116 |
| `wb-help-title` | frontend/index.html:14096 |
| `wb-history-bar` | frontend/index.html:7175 |
| `wb-history-end` | frontend/index.html:7181 |
| `wb-history-restore` | frontend/index.html:7179 |
| `wb-history-restore-selection` | frontend/index.html:7180 |
| `wb-history-slider` | frontend/index.html:7177 |
| `wb-history-when` | frontend/index.html:7178 |
| `wb-html-layer` | frontend/index.html:6439 |
| `wb-image-file-input` | frontend/index.html:7089 |
| `wb-import-about` | frontend/index.html:1066 |
| `wb-import-choose` | frontend/index.html:1070 |
| `wb-import-dialog` | frontend/index.html:1059 |
| `wb-import-file` | frontend/index.html:1068 |
| `wb-import-go` | frontend/index.html:1072 |
| `wb-import-map-file` | frontend/index.html:6235 |
| `wb-import-text` | frontend/index.html:1067 |
| `wb-import-title` | frontend/index.html:1061 |
| `wb-insert-menu` | frontend/index.html:6525 |
| `wb-layers-clear` | frontend/index.html:7795 |
| `wb-layers-selected-count` | frontend/index.html:7794 |
| `wb-layers-tree` | frontend/index.html:7797 |
| `wb-lib-import` | frontend/index.html:7786 |
| `wb-lib-keys` | frontend/index.html:7785 |
| `wb-lib-list` | frontend/index.html:7784 |
| `wb-lib-more` | frontend/index.html:7775 |
| `wb-lib-search` | frontend/index.html:7781 |
| `wb-lib-status` | frontend/index.html:7783 |
| `wb-library-list` | frontend/index.html:7790 |
| `wb-lines-group` | frontend/index.html:6434 |
| `wb-link-cut` | frontend/index.html:7722 |
| `wb-link-label` | frontend/index.html:7721 |
| `wb-link-reverse` | frontend/index.html:7720 |
| `wb-map-add-root` | frontend/index.html:6876 |
| `wb-map-add-sticker` | frontend/index.html:6882 |
| `wb-map-align` | frontend/index.html:7526 |
| `wb-map-arrow` | frontend/index.html:6427 |
| `wb-map-bold` | frontend/index.html:7520 |
| `wb-map-chip` | frontend/index.html:6515 |
| `wb-map-core` | frontend/index.html:7564 |
| `wb-map-edge-arrow` | frontend/index.html:7656 |
| `wb-map-edge-dashed` | frontend/index.html:7650 |
| `wb-map-edge-shape` | frontend/index.html:7641 |
| `wb-map-edge-width` | frontend/index.html:7633 |
| `wb-map-effect` | frontend/index.html:7608 |
| `wb-map-empty` | frontend/index.html:6409 |
| `wb-map-empty-add` | frontend/index.html:6413 |
| `wb-map-expand-all` | frontend/index.html:6686 |
| `wb-map-fill` | frontend/index.html:7595 |
| `wb-map-filter` | frontend/index.html:6359 |
| `wb-map-filter-clear` | frontend/index.html:6362 |
| `wb-map-filter-item` | frontend/index.html:6687 |
| `wb-map-filter-label` | frontend/index.html:6361 |
| `wb-map-first-hint` | frontend/index.html:6396 |
| `wb-map-focus` | frontend/index.html:6349 |
| `wb-map-focus-clear` | frontend/index.html:6355 |
| `wb-map-focus-depth` | frontend/index.html:6352 |
| `wb-map-focus-here` | frontend/index.html:6879 |
| `wb-map-focus-label` | frontend/index.html:6351 |
| `wb-map-focus-less` | frontend/index.html:6353 |
| `wb-map-focus-more` | frontend/index.html:6354 |
| `wb-map-italic` | frontend/index.html:7521 |
| `wb-map-layout` | frontend/index.html:6953 |
| `wb-map-legend` | frontend/index.html:6366 |
| `wb-map-line-menu` | frontend/index.html:7629 |
| `wb-map-link-radial` | frontend/index.html:7719 |
| `wb-map-numbered` | frontend/index.html:6684 |
| `wb-map-perspective` | frontend/index.html:6669 |
| `wb-map-picture-input` | frontend/index.html:7097 |
| `wb-map-places-help` | frontend/index.html:6900 |
| `wb-map-radial` | frontend/index.html:7693 |
| `wb-map-reset` | frontend/index.html:7667 |
| `wb-map-shape` | frontend/index.html:7569 |
| `wb-map-shape-menu` | frontend/index.html:7555 |
| `wb-map-spine` | frontend/index.html:7583 |
| `wb-map-stats-item` | frontend/index.html:6688 |
| `wb-map-strip` | frontend/index.html:7495 |
| `wb-map-strip-color` | frontend/index.html:7496 |
| `wb-map-strip-icon` | frontend/index.html:7535 |
| `wb-map-study` | frontend/index.html:6760 |
| `wb-map-template-row` | frontend/index.html:6380 |
| `wb-map-templates` | frontend/index.html:6374 |
| `wb-map-templates-dismiss` | frontend/index.html:6378 |
| `wb-map-templates-title` | frontend/index.html:6376 |
| `wb-map-text-menu` | frontend/index.html:7515 |
| `wb-map-text-size` | frontend/index.html:7506 |
| `wb-map-theme-item` | frontend/index.html:6685 |
| `wb-map-tidy` | frontend/index.html:6965 |
| `wb-map-to-doc` | frontend/index.html:6757 |
| `wb-mapmulti-bold` | frontend/index.html:7401 |
| `wb-mapmulti-color` | frontend/index.html:7400 |
| `wb-mapmulti-fold` | frontend/index.html:7403 |
| `wb-mapmulti-summary` | frontend/index.html:7404 |
| `wb-mapmulti-task` | frontend/index.html:7402 |
| `wb-mindmap-radial` | frontend/index.html:7454 |
| `wb-mindmap-tree` | frontend/index.html:7453 |
| `wb-multi-group` | frontend/index.html:7372 |
| `wb-multi-ungroup` | frontend/index.html:7373 |
| `wb-navigator` | frontend/index.html:7731 |
| `wb-navigator-close` | frontend/index.html:7735 |
| `wb-navigator-empty` | frontend/index.html:7738 |
| `wb-navigator-fit` | frontend/index.html:7734 |
| `wb-navigator-map` | frontend/index.html:7737 |
| `wb-navigator-toggle` | frontend/index.html:6519 |
| `wb-new-board` | frontend/index.html:6721 |
| `wb-outline-tree` | frontend/index.html:7831 |
| `wb-overlay-layer` | frontend/index.html:6451 |
| `wb-overlay-zoom-group` | frontend/index.html:6452 |
| `wb-pages-keys` | frontend/index.html:7802 |
| `wb-pages-list` | frontend/index.html:7801 |
| `wb-panel-library` | frontend/index.html:6633 |
| `wb-panel-outline` | frontend/index.html:6634 |
| `wb-panel-overview` | frontend/index.html:6632 |
| `wb-panel-props` | frontend/index.html:6631 |
| `wb-panel-search` | frontend/index.html:6635 |
| `wb-paste-style` | frontend/index.html:7419 |
| `wb-present-bar` | frontend/index.html:7183 |
| `wb-present-count` | frontend/index.html:7185 |
| `wb-present-end` | frontend/index.html:7190 |
| `wb-present-next` | frontend/index.html:7186 |
| `wb-present-prev` | frontend/index.html:7184 |
| `wb-prop-align` | frontend/index.html:7360 |
| `wb-prop-bg` | frontend/index.html:7438 |
| `wb-prop-bg-none` | frontend/index.html:7438 |
| `wb-prop-bold` | frontend/index.html:7358 |
| `wb-prop-border` | frontend/index.html:7439 |
| `wb-prop-border-none` | frontend/index.html:7439 |
| `wb-prop-bullets` | frontend/index.html:7426 |
| `wb-prop-bullets-row` | frontend/index.html:7424 |
| `wb-prop-color` | frontend/index.html:7273 |
| `wb-prop-color-word` | frontend/index.html:7272 |
| `wb-prop-dash` | frontend/index.html:7343 |
| `wb-prop-endcap` | frontend/index.html:7318 |
| `wb-prop-fontsize` | frontend/index.html:7356 |
| `wb-prop-italic` | frontend/index.html:7359 |
| `wb-prop-label` | frontend/index.html:7292 |
| `wb-prop-md` | frontend/index.html:7423 |
| `wb-prop-md-row` | frontend/index.html:7423 |
| `wb-prop-nostroke` | frontend/index.html:7422 |
| `wb-prop-nostroke-row` | frontend/index.html:7422 |
| `wb-prop-route` | frontend/index.html:7284 |
| `wb-prop-shapefill` | frontend/index.html:7262 |
| `wb-prop-shapefill-on` | frontend/index.html:7265 |
| `wb-prop-startcap` | frontend/index.html:7295 |
| `wb-prop-width` | frontend/index.html:7277 |
| `wb-radial-child` | frontend/index.html:7694 |
| `wb-radial-collapse` | frontend/index.html:7696 |
| `wb-radial-connect` | frontend/index.html:7698 |
| `wb-radial-delete` | frontend/index.html:7697 |
| `wb-radial-more` | frontend/index.html:7699 |
| `wb-radial-sibling` | frontend/index.html:7695 |
| `wb-rail-ink` | frontend/index.html:7146 |
| `wb-redo` | frontend/index.html:7120 |
| `wb-rename-board` | frontend/index.html:6720 |
| `wb-rough-toggle` | frontend/index.html:6659 |
| `wb-same-height` | frontend/index.html:7389 |
| `wb-same-width` | frontend/index.html:7388 |
| `wb-search-bar` | frontend/index.html:7746 |
| `wb-search-close` | frontend/index.html:7752 |
| `wb-search-count` | frontend/index.html:7749 |
| `wb-search-input` | frontend/index.html:7748 |
| `wb-search-next` | frontend/index.html:7751 |
| `wb-search-prev` | frontend/index.html:7750 |
| `wb-search-toggle` | frontend/index.html:6518 |
| `wb-selbar-back` | frontend/index.html:7392 |
| `wb-selbar-delete` | frontend/index.html:7408 |
| `wb-selbar-duplicate` | frontend/index.html:7407 |
| `wb-selbar-export` | frontend/index.html:7458 |
| `wb-selbar-forward` | frontend/index.html:7393 |
| `wb-shape-menu` | frontend/index.html:7000 |
| `wb-shape-picker` | frontend/index.html:6995 |
| `wb-shape-toggle` | frontend/index.html:6996 |
| `wb-shape-toggle-icon` | frontend/index.html:6997 |
| `wb-shapes-group` | frontend/index.html:6433 |
| `wb-side-map-expand` | frontend/index.html:7812 |
| `wb-side-map-facts` | frontend/index.html:7809 |
| `wb-side-map-help` | frontend/index.html:7823 |
| `wb-side-map-look` | frontend/index.html:7811 |
| `wb-side-map-tidy` | frontend/index.html:7813 |
| `wb-side-tab-layers` | frontend/index.html:7767 |
| `wb-side-tab-library` | frontend/index.html:7765 |
| `wb-side-tab-map` | frontend/index.html:7769 |
| `wb-side-tab-notes` | frontend/index.html:7766 |
| `wb-side-tab-outline` | frontend/index.html:7770 |
| `wb-side-tab-pages` | frontend/index.html:7768 |
| `wb-sidebar` | frontend/index.html:7763 |
| `wb-sidebar-close` | frontend/index.html:7776 |
| `wb-sidebar-panel` | frontend/index.html:7772 |
| `wb-sidebar-title` | frontend/index.html:7774 |
| `wb-snap-toggle` | frontend/index.html:6657 |
| `wb-sticky-fold` | frontend/index.html:6658 |
| `wb-stroke-none` | frontend/index.html:7429 |
| `wb-stroke-none-row` | frontend/index.html:7429 |
| `wb-stroke-style` | frontend/index.html:7244 |
| `wb-stroke-width` | frontend/index.html:7232 |
| `wb-stroke-width-badge` | frontend/index.html:7463 |
| `wb-strokes-group` | frontend/index.html:6435 |
| `wb-study-knew` | frontend/index.html:7188 |
| `wb-study-missed` | frontend/index.html:7189 |
| `wb-study-show` | frontend/index.html:7187 |
| `wb-svg-layer` | frontend/index.html:6421 |
| `wb-template-create` | frontend/index.html:1100 |
| `wb-template-dialog` | frontend/index.html:1076 |
| `wb-template-kind` | frontend/index.html:1088 |
| `wb-template-list` | frontend/index.html:1095 |
| `wb-template-name` | frontend/index.html:1093 |
| `wb-template-preview` | frontend/index.html:1096 |
| `wb-template-title` | frontend/index.html:1079 |
| `wb-tool-group` | frontend/index.html:6788 |
| `wb-tools-opener` | frontend/index.html:7160 |
| `wb-tools-opener-label` | frontend/index.html:7163 |
| `wb-tools-panel` | frontend/index.html:6787 |
| `wb-topbar` | frontend/index.html:6501 |
| `wb-undo` | frontend/index.html:7117 |
| `wb-view-map-section` | frontend/index.html:6665 |
| `wb-view-menu` | frontend/index.html:6617 |
| `wb-zoom-actual` | frontend/index.html:6697 |
| `wb-zoom-fit` | frontend/index.html:7195 |
| `wb-zoom-group` | frontend/index.html:6432 |
| `wb-zoom-in` | frontend/index.html:7196 |
| `wb-zoom-out` | frontend/index.html:7194 |
| `web-clip-bookmarklet` | frontend/index.html:12652 |
| `web-clip-box` | frontend/index.html:12626 |
| `web-clip-copy` | frontend/index.html:12654 |
| `web-clip-help` | frontend/index.html:12636 |
| `web-clip-status` | frontend/index.html:12656 |
| `web-engine-dot` | frontend/index.html:3316 |
| `web-panel` | frontend/index.html:3307 |
| `web-panel-close` | frontend/index.html:3321 |
| `web-panel-menu` | frontend/index.html:3320 |
| `web-panel-title` | frontend/index.html:3310 |
| `web-query` | frontend/index.html:3330 |
| `web-reader` | frontend/index.html:3343 |
| `web-reader-ask` | frontend/index.html:3362 |
| `web-reader-back` | frontend/index.html:3348 |
| `web-reader-bookmark` | frontend/index.html:3375 |
| `web-reader-cite` | frontend/index.html:3368 |
| `web-reader-copy` | frontend/index.html:3353 |
| `web-reader-find` | frontend/index.html:3351 |
| `web-reader-open` | frontend/index.html:3355 |
| `web-reader-save` | frontend/index.html:3370 |
| `web-reader-source` | frontend/index.html:3360 |
| `web-reader-text` | frontend/index.html:3378 |
| `web-reader-title` | frontend/index.html:3359 |
| `web-results` | frontend/index.html:3342 |
| `web-search-history` | frontend/index.html:3340 |
| `web-search-toggle` | frontend/index.html:3100 |
| `web-status` | frontend/index.html:3336 |
| `web-stop` | frontend/index.html:3333 |
| `websearch-help` | frontend/index.html:11863 |
| `whiteboard-container` | frontend/index.html:6419 |
| `writing-room` | frontend/index.html:1758 |
| `writing-room-heading` | frontend/index.html:1773 |
| `zoom-in` | frontend/index.html:10846 |
| `zoom-out` | frontend/index.html:10842 |
| `zoom-reset` | frontend/index.html:10849 |
| `zoom-slider` | frontend/index.html:10844 |
| `zoom-value` | frontend/index.html:10848 |

## CSS sections (490)

Banner comments (`/* ===` or `/* ---`) in `frontend/css/*.css`, sorted by title.

| Section | File:line |
|---|---|
| "Tools it can use": the row, measured against a normal one | frontend/css/03-dashboard-widgets.css:4686 |
| "how are these connected?" | frontend/css/02-chat-graph.css:4405 |
| 08-consistency.css - one recipe per repeated shape | frontend/css/08-consistency.css:1 |
| 1. One menu row | frontend/css/08-consistency.css:24 |
| 1. touch targets, one step, one block | frontend/css/07-whiteboard-misc.css:9623 |
| 2. A disclosure inside a card is a header, not a button | frontend/css/08-consistency.css:301 |
| 2. the safe area | frontend/css/07-whiteboard-misc.css:9662 |
| 3. A dock is one bar, and its controls belong to it | frontend/css/08-consistency.css:460 |
| 4. One gap between an icon and the label it leads | frontend/css/08-consistency.css:895 |
| 5. The Write-with-AI footers are one row, primary on the right | frontend/css/08-consistency.css:1182 |
| 6. One toggle-row recipe: the switch says on, not the row | frontend/css/08-consistency.css:831 |
| 7. Meta looks like meta | frontend/css/08-consistency.css:1028 |
| 8. A panel head is identity, one fact, then the actions, and it does not | frontend/css/08-consistency.css:2363 |
| A CALMER TOP, NOTHING TAKEN AWAY (Full view) | frontend/css/03-dashboard-widgets.css:4859 |
| A card's date is in the same corner on every card (INBOX 719) | frontend/css/08-consistency.css:10360 |
| A chip's x: a round target inset evenly (INBOX 403) | frontend/css/08-consistency.css:4674 |
| A dialog's head: title, its '?', icon-only actions, Close last | frontend/css/08-consistency.css:8980 |
| A diff of two versions of the same text (DOCUMENTS_PLAN Phase 5 items 2, 3) | frontend/css/09-editor.css:556 |
| A member of a group selection shows that it is selected, not how to | frontend/css/library-lazy.css:5005 |
| A note card's text leads; its metadata steps back (INBOX 505) | frontend/css/08-consistency.css:9850 |
| A note's buttons stay while its own menu is open (INBOX 679) | frontend/css/08-consistency.css:10243 |
| A note's time: the same corner on every card | frontend/css/08-consistency.css:8358 |
| A notification's two controls are a column of their own (INBOX 874) | frontend/css/06-timeline-dialogs.css:3459 |
| A rail row's ⋮ overlays the row; it never reserves a column (INBOX 722) | frontend/css/08-consistency.css:10420 |
| A row is a pointer target (INBOX 719) | frontend/css/08-consistency.css:10344 |
| Ask history: the personal-notes-browser panel (§ROADMAP item 6) | frontend/css/01-forms-settings.css:2827 |
| Atlas's life: loops while the mark is on screen and motion is on | frontend/css/08-consistency.css:7951 |
| Atlas, the app's guide (INBOX 224) | frontend/css/08-consistency.css:1783 |
| Atlas, the assistant's own character (atlas.js) | frontend/css/08-consistency.css:6543 |
| BOARD NAVIGATOR AND BOARD SEARCH | frontend/css/07-whiteboard-misc.css:6377 |
| BREADCRUMBS: WHERE THE CARET IS | frontend/css/05-sidebars-themes.css:6010 |
| Boards, 2026-10-10 (boardmap-1010): lazy with the board, off the boot | frontend/css/library-lazy.css:4188 |
| Capture: the add tools as a quiet toolbar (INBOX 395) | frontend/css/08-consistency.css:4484 |
| Capture: the two labelled rows under the note box | frontend/css/07-whiteboard-misc.css:2745 |
| Capture: three families, three rows | frontend/css/07-whiteboard-misc.css:4741 |
| Carbon: near-monochrome, minimal colour, maximum text contrast. | frontend/css/05-sidebars-themes.css:3461 |
| Chat sources: every card reads from the top | frontend/css/08-consistency.css:8325 |
| Chat: the user's bubble as a quiet surface, not an accent slab | frontend/css/08-consistency.css:4817 |
| Columns and image options (DOCUMENTS_PLAN Phase 3 item 5) | frontend/css/09-editor.css:338 |
| Curated palettes (Settings → Appearance → Theme) | frontend/css/05-sidebars-themes.css:3218 |
| Documents: focus mode | frontend/css/07-whiteboard-misc.css:6078 |
| Editorial paper: off-white paper, black type, one red-orange for what | frontend/css/05-sidebars-themes.css:3619 |
| Ember: warm oranges over a dim ground. Best in the evening. | frontend/css/05-sidebars-themes.css:3391 |
| Files as a reading list | frontend/css/library-lazy.css:1898 |
| Files sub-tab: rows, not cards | frontend/css/library-lazy.css:1925 |
| Find anything | frontend/css/07-whiteboard-misc.css:10744 |
| Find anything, de-vibecoded | frontend/css/08-consistency.css:3646 |
| Find anything: group heads read as heads | frontend/css/08-consistency.css:4778 |
| GLASS THAT DOES NOT COST WHAT IT USED TO | frontend/css/03-dashboard-widgets.css:798 |
| GRIPS AT A CONSTANT SIZE ON SCREEN | frontend/css/07-whiteboard-misc.css:10675 |
| Graph options: one section-head style | frontend/css/08-consistency.css:4369 |
| Help & guide: the topics box and the "Ask the guide" box are two | frontend/css/08-consistency.css:1779 |
| INBOX 68: the board and map previews | frontend/css/10-responsive.css:352 |
| Icons | frontend/css/07-whiteboard-misc.css:2307 |
| Inline AI (editor.js) | frontend/css/07-whiteboard-misc.css:6483 |
| Lagoon: indigo and teal together | frontend/css/05-sidebars-themes.css:3339 |
| Library -> Contents: an outline (INBOX 496) | frontend/css/01-forms-settings.css:2447 |
| Library → Documents | frontend/css/03-dashboard-widgets.css:4293 |
| Library → Whiteboards | frontend/css/03-dashboard-widgets.css:4318 |
| Live preview | frontend/css/04-chat-dock-appearance.css:4595 |
| MICRO-ANIMATIONS | frontend/css/07-whiteboard-misc.css:593 |
| Midnight: deep navy and gold (Brief 95, INBOX 858: "truly good themes"). | frontend/css/05-sidebars-themes.css:3496 |
| Ocean: cool teal and deep blue. Crisp rather than cosy. | frontend/css/05-sidebars-themes.css:3304 |
| On paper (DOCUMENTS_PLAN Phase 5 item 4, the print stylesheet) | frontend/css/09-editor.css:916 |
| On this day | frontend/css/03-dashboard-widgets.css:4636 |
| One sidebar row recipe for every rail (INBOX 702) | frontend/css/08-consistency.css:10313 |
| One ⋯ opener, styled once (INBOX 722) | frontend/css/08-consistency.css:10389 |
| PLAN.md D1: the documents dock's formatting strip hides entirely | frontend/css/07-whiteboard-misc.css:7918 |
| Parchment: paper, ink and a little gold. Made for long writing. | frontend/css/05-sidebars-themes.css:3231 |
| Phase 10, INBOX 100: the scroll edge effect | frontend/css/10-responsive.css:159 |
| Phase 10, INBOX 101: concentric corners | frontend/css/10-responsive.css:185 |
| Phase 11 item 12: a dock's head is one row on a phone | frontend/css/10-responsive.css:1532 |
| Phase 11 item 12: a note row designed for a thumb | frontend/css/10-responsive.css:1483 |
| Phase 11 item 12: one bar at the foot of a phone, not two | frontend/css/10-responsive.css:1190 |
| Phase 11 item 12: the status bar on a tablet is a touch bar | frontend/css/10-responsive.css:1118 |
| Phase 11 item 1: the phone top bar is three controls, not six | frontend/css/10-responsive.css:1072 |
| Phase 11 item 2: a row swiped, star right and bin left | frontend/css/10-responsive.css:1405 |
| Phase 11 item 2: the note page, the sheet recipe's `page` variant | frontend/css/10-responsive.css:1854 |
| Phase 11 item 3: the chat composer on a phone | frontend/css/10-responsive.css:1881 |
| Phase 11 item 4: the graph's controls are one sheet on a phone | frontend/css/10-responsive.css:1942 |
| Phase 11 item 5: the Library reader as the page | frontend/css/10-responsive.css:2070 |
| Phase 11 item 7: the whiteboard and the mind map on a phone | frontend/css/10-responsive.css:2002 |
| Phase 11 item 9: 44px targets, the ones the docks sweep cannot see | frontend/css/10-responsive.css:946 |
| Phase 11 item 9: no hover-only affordance | frontend/css/10-responsive.css:1932 |
| Phase 11 items 2 and 3: no rail on a phone, an opener in the head | frontend/css/10-responsive.css:1290 |
| Phase 5: quick access + toasts | frontend/css/01-forms-settings.css:2808 |
| Phase 5: the three things a map says about itself | frontend/css/07-whiteboard-misc.css:4376 |
| Phones (roadmap §8: the layout had breakpoints but had never been driven at | frontend/css/05-sidebars-themes.css:3967 |
| Placed at the end of this file on purpose. A panel keeps its original class | frontend/css/03-dashboard-widgets.css:4329 |
| Plum: deep violet and magenta. The most saturated. | frontend/css/05-sidebars-themes.css:3426 |
| Progress that keeps moving (INBOX 95) | frontend/css/08-consistency.css:2182 |
| Quick access, and arranging it (INBOX 461) | frontend/css/03-dashboard-widgets.css:2053 |
| Quiet utilitarian: the default look (UI_MODERNISATION_PLAN decisions, | frontend/css/05-sidebars-themes.css:3569 |
| RESPONSIVE BY DEVICE (UI_MODERNISATION_PLAN.md: Phase 9) | frontend/css/07-whiteboard-misc.css:9545 |
| RESPONSIVE, CONTINUED, AND THE LIQUID GLASS ADOPTIONS | frontend/css/10-responsive.css:1 |
| Reading and focus (DOCUMENTS_PLAN Phase 5 item 4, PLAN D9) | frontend/css/library-lazy.css:527 |
| Reminders: the time at the row's end, actions over it on hover | frontend/css/08-consistency.css:4381 |
| Ring room (INBOX 685, "a lot of borders get cut off on an edge") | frontend/css/08-consistency.css:10039 |
| Rosewood: dusty rose and wine. Warm without being orange. | frontend/css/05-sidebars-themes.css:3534 |
| Rows: the default way a list of notes is shown | frontend/css/01-forms-settings.css:1439 |
| Rules that used to be inline style="" attributes. | frontend/css/06-timeline-dialogs.css:632 |
| SETTINGS: one control height, one right edge | frontend/css/01-forms-settings.css:5062 |
| SETTINGS: spacing, hierarchy and proximity | frontend/css/01-forms-settings.css:5210 |
| SIDEBAR COLLAPSE & PEEK | frontend/css/07-whiteboard-misc.css:402 |
| SKILLS TAB | frontend/css/07-whiteboard-misc.css:746 |
| Sage: quiet greens. The calmest of the set. | frontend/css/05-sidebars-themes.css:3269 |
| Sans-serif system font override (macOS fix) | frontend/css/00-tokens-shell.css:1200 |
| Settings at phone width: nothing scrolls sideways (Phase 5.1, 390px) | frontend/css/07-whiteboard-misc.css:8011 |
| Settings form rows share a label column (Phase 5.1) | frontend/css/07-whiteboard-misc.css:7805 |
| Settings headings sit at one left edge | frontend/css/08-consistency.css:1422 |
| Settings rows that wrap their actions under the title (INBOX 82) | frontend/css/08-consistency.css:2195 |
| Settings: a section's intro sits under its heading, not above it | frontend/css/08-consistency.css:4476 |
| TENSIONS: THE DISAGREEMENT REVIEW | frontend/css/06-timeline-dialogs.css:3370 |
| THE CHAT ON A PHONE, MEASURED | frontend/css/04-chat-dock-appearance.css:5586 |
| THE OCR WORKSPACE | frontend/css/07-whiteboard-misc.css:5312 |
| THE QUIET SIDE OF THE BUTTON RAMP: A RUN OF ROW ACTIONS | frontend/css/08-consistency.css:2286 |
| THE WRITE WITH AI ROW, ON A NARROW COLUMN | frontend/css/04-chat-dock-appearance.css:5633 |
| THE WRITING PHASE: nodes, and an edge drawing itself | frontend/css/01-forms-settings.css:4929 |
| Technical mono: a cool graphite ground, monospace for the numbers and | frontend/css/05-sidebars-themes.css:3657 |
| Templates (INBOX 715) | frontend/css/library-lazy.css:3336 |
| Text on accent-coloured surfaces (roadmap §7: colour contrast was listed as | frontend/css/05-sidebars-themes.css:4085 |
| The Ask tab's records speak in the Notes list's voice (INBOX 510) | frontend/css/08-consistency.css:9901 |
| The Library's hover tick says what it is (INBOX 722) | frontend/css/library-lazy.css:4160 |
| The OCR workspace tool row (INBOX 717). Here rather than in the boot | frontend/css/library-lazy.css:3665 |
| The chat header stays one line (INBOX 91) | frontend/css/08-consistency.css:2229 |
| The compact row: one line, one anchor, one chevron (INBOX 676) | frontend/css/08-consistency.css:10175 |
| The connection pill's menu button, concentric with the pill | frontend/css/08-consistency.css:8338 |
| The documents editor: layout around the engine (DOCUMENTS_PLAN Phase 2) | frontend/css/09-editor.css:1 |
| The five whiteboard menus (Insert, Edit, Arrange, View, Board) | frontend/css/08-consistency.css:1251 |
| The guide panel as one surface (INBOX 270 part 4, the redesign) | frontend/css/08-consistency.css:1919 |
| The last icon-to-label gap family | frontend/css/08-consistency.css:1587 |
| The last two head rows that were not on the bar recipe | frontend/css/08-consistency.css:1390 |
| The m guide: one panel of key rows | frontend/css/08-consistency.css:4541 |
| The note surface (DOCUMENTS_PLAN Phase 8): one editor everywhere | frontend/css/09-editor.css:815 |
| The properties panel (DOCUMENTS_PLAN Phase 3 item 4) | frontend/css/09-editor.css:185 |
| The second level: `.tabs-line` (INBOX 522) | frontend/css/05-sidebars-themes.css:4125 |
| The surface model pickers on a phone | frontend/css/10-responsive.css:2135 |
| The thumb bar (DESIGN.md's recipe index: a bar of actions above the | frontend/css/09-editor.css:754 |
| The two dialogs reported as off the modal recipe | frontend/css/08-consistency.css:1455 |
| The two rows that still wrapped at 1024 | frontend/css/08-consistency.css:1325 |
| The whiteboard top bar's controls | frontend/css/08-consistency.css:1606 |
| Timeline rows with a snippet: mark and time on the title's line | frontend/css/08-consistency.css:4345 |
| Timeline: the density strip (TIMELINE_PLAN.md Phase 3) | frontend/css/06-timeline-dialogs.css:300 |
| Timeline: the feed (TIMELINE_PLAN.md Phase 1) | frontend/css/06-timeline-dialogs.css:1 |
| Timeline: the table view (TIMELINE_PLAN.md Phase 2) | frontend/css/06-timeline-dialogs.css:346 |
| Trace mode on the graph (§41) | frontend/css/07-whiteboard-misc.css:1999 |
| Two floating buttons that sit over content: opaque, readable hover | frontend/css/08-consistency.css:4868 |
| WCAG 2.5.8 target size | frontend/css/06-timeline-dialogs.css:3179 |
| WHITEBOARD TAB | frontend/css/06-timeline-dialogs.css:2272 |
| Wave B: threads, inline actions, templates | frontend/css/02-chat-graph.css:386 |
| Wave E: graph view | frontend/css/02-chat-graph.css:905 |
| Wave F: command palette | frontend/css/02-chat-graph.css:1580 |
| Wave F: mobile / PWA responsive pass | frontend/css/02-chat-graph.css:1916 |
| Wave F: whiteboard-lite | frontend/css/02-chat-graph.css:1640 |
| Wave G: agentic tools + skills | frontend/css/02-chat-graph.css:472 |
| Wave H: voice + read-aloud | frontend/css/02-chat-graph.css:1951 |
| Wave I: skeletons, focus, reduced motion | frontend/css/02-chat-graph.css:2129 |
| Wave J: accent presets + appearance picker | frontend/css/05-sidebars-themes.css:1 |
| Wave J: generative art + note tools + undo toast | frontend/css/02-chat-graph.css:2285 |
| Wave K: empty states, mobile tap targets, high-contrast | frontend/css/02-chat-graph.css:2749 |
| Wave L: skip link, action menus, contrast + type polish | frontend/css/02-chat-graph.css:2869 |
| Wave M: graph filters, thumbnails, lightbox, batch bar | frontend/css/02-chat-graph.css:3326 |
| Wave N: improve-writing, link suggestions, tasks | frontend/css/03-dashboard-widgets.css:1 |
| Wave O: AI Tools toggles | frontend/css/03-dashboard-widgets.css:970 |
| Wave O: brand logo + a more present background | frontend/css/03-dashboard-widgets.css:556 |
| Wave O: expanded appearance (theme/size/density/glass) | frontend/css/03-dashboard-widgets.css:620 |
| Whiteboard chrome, restructured: one top bar, a centred tool dock, a | frontend/css/07-whiteboard-misc.css:6777 |
| Writing pace | frontend/css/03-dashboard-widgets.css:4645 |
| [[wiki links]] | frontend/css/05-sidebars-themes.css:755 |
| `.seg-multi`'s word, and the width that decides it | frontend/css/10-responsive.css:542 |
| `.seg-multi`: one well, independent toggles | frontend/css/03-dashboard-widgets.css:685 |
| `.selectbar`: the bar stays with you while the selection does | frontend/css/00-tokens-shell.css:1860 |
| a Files row's facts line, one register (INBOX 421 f) | frontend/css/08-consistency.css:3869 |
| a board or a map as an object in a note (INBOX 309) | frontend/css/05-sidebars-themes.css:1586 |
| a callout that folds (REDESIGN.md §R7.3 item 3) | frontend/css/05-sidebars-themes.css:1304 |
| a card that opens does not inflate the six beside it | frontend/css/08-consistency.css:2485 |
| a chip lane scrolls without drawing a scrollbar | frontend/css/07-whiteboard-misc.css:3825 |
| a chosen radio option is outlined, not only tinted (INBOX 464) | frontend/css/08-consistency.css:9419 |
| a disclosure arrow that matches the app's own carets | frontend/css/07-whiteboard-misc.css:3844 |
| a disclosure is a control, so it answers the pointer | frontend/css/07-whiteboard-misc.css:3434 |
| a face drawn once (avatars.js, `nameMarkCompose`) | frontend/css/08-consistency.css:5065 |
| a file says what it is attached to | frontend/css/07-whiteboard-misc.css:4898 |
| a file tile shows what it has, not what it lacks | frontend/css/07-whiteboard-misc.css:3399 |
| a fold head's '?', beside its <summary> (INBOX 433) | frontend/css/08-consistency.css:3379 |
| a generated face that moves (the owner: "can they be animated as a | frontend/css/08-consistency.css:4913 |
| a help popover opens over the surface that asked for it (INBOX 205) | frontend/css/08-consistency.css:2532 |
| a label that lost its capitals keeps its rank | frontend/css/08-consistency.css:4317 |
| a list of rows reads as a list | frontend/css/07-whiteboard-misc.css:4311 |
| a map's levels and a solid fill (MINDMAP_PLAN §14, decisions 38, 39) | frontend/css/library-lazy.css:3244 |
| a menu is one column: rows, section labels and icons (INBOX 403) | frontend/css/08-consistency.css:8589 |
| a model per feature (Settings → Models) | frontend/css/01-forms-settings.css:5579 |
| a named item in a Settings list: title, label, facts | frontend/css/08-consistency.css:3430 |
| a narrow measure for prose, wide chrome around it | frontend/css/07-whiteboard-misc.css:4973 |
| a note's connections: one pill each, its menu inside it | frontend/css/08-consistency.css:3206 |
| a notice: one line the app says about what is on screen | frontend/css/08-consistency.css:2581 |
| a poke, a look, a large view and a companion (avatars.js) | frontend/css/08-consistency.css:5032 |
| a segmented choice inside a dialog | frontend/css/06-timeline-dialogs.css:1019 |
| a settings group that says what depends on what | frontend/css/07-whiteboard-misc.css:4331 |
| a settings row where nothing squashes anything else | frontend/css/07-whiteboard-misc.css:4076 |
| a sheet (DESIGN.md's recipe index, "A sheet") | frontend/css/10-responsive.css:769 |
| a sticker (MINDMAP_PLAN decision 44, INBOX 642) | frontend/css/library-lazy.css:3278 |
| a stored file that is no longer stored | frontend/css/02-chat-graph.css:4788 |
| a traced path (§9) | frontend/css/02-chat-graph.css:1243 |
| a turn that is still working says so, for as long as it is | frontend/css/03-dashboard-widgets.css:4400 |
| a zone that cannot shrink says so, instead of spilling | frontend/css/10-responsive.css:1022 |
| account & security | frontend/css/01-forms-settings.css:3414 |
| activity heatmap + tag cloud widgets | frontend/css/03-dashboard-widgets.css:2301 |
| activity log | frontend/css/01-forms-settings.css:2783 |
| activity, as a timeline rather than as cards | frontend/css/library-lazy.css:3066 |
| an embedded document, drawn as a card (INBOX 421 b) | frontend/css/05-sidebars-themes.css:6118 |
| and inside a small phone | frontend/css/05-sidebars-themes.css:5896 |
| appearance settings: grouped, scannable rows | frontend/css/04-chat-dock-appearance.css:2014 |
| assistant message layout | frontend/css/05-sidebars-themes.css:4411 |
| attaching notes to a chat message | frontend/css/04-chat-dock-appearance.css:2889 |
| back / forward through pages | frontend/css/00-tokens-shell.css:4047 |
| back-to-top button | frontend/css/04-chat-dock-appearance.css:2708 |
| band 2 (820 to 1200): the tabs keep their names, set small | frontend/css/10-responsive.css:61 |
| band 2: 820-1100, iPad landscape and small laptops | frontend/css/07-whiteboard-misc.css:9719 |
| band 3 (600 to 820): the tab strip fits on its own row | frontend/css/10-responsive.css:20 |
| band 3: 600-820, iPad portrait, and the sheet that band 4 inherits | frontend/css/07-whiteboard-misc.css:9806 |
| band 4 (under 600): the editor's own targets (DOCUMENTS_PLAN Phase 6) | frontend/css/10-responsive.css:456 |
| band 4: an icon-only chip is still a target (Phase 11) | frontend/css/10-responsive.css:506 |
| band 4: below 600, the phone | frontend/css/07-whiteboard-misc.css:9989 |
| band 4: five columns, and the fifth is a sheet | frontend/css/10-responsive.css:592 |
| band 4: the settings sheet's head may wrap, but not be squashed | frontend/css/10-responsive.css:897 |
| boot splash | frontend/css/00-tokens-shell.css:4069 |
| callouts ("specialised boxes and frames") | frontend/css/05-sidebars-themes.css:1229 |
| category rename / delete | frontend/css/04-chat-dock-appearance.css:2777 |
| chat dock density pass (§37C) | frontend/css/04-chat-dock-appearance.css:1336 |
| chat page layout | frontend/css/04-chat-dock-appearance.css:542 |
| chat panel: answer and raw records side by side | frontend/css/01-forms-settings.css:1066 |
| chat polish | frontend/css/03-dashboard-widgets.css:3526 |
| chat tab (Wave C) | frontend/css/02-chat-graph.css:1 |
| chat, de-vibecoded | frontend/css/08-consistency.css:3028 |
| chat: an organised sidebar, readable code, correctable answers | frontend/css/05-sidebars-themes.css:2435 |
| choice controls, the owner's 2026-09-24 pass (INBOX 409, 411) | frontend/css/08-consistency.css:8519 |
| column-flex cards keep their full width | frontend/css/07-whiteboard-misc.css:3645 |
| compressing a long conversation (§35I) | frontend/css/02-chat-graph.css:791 |
| curated themes | frontend/css/01-forms-settings.css:3450 |
| dark glass reads flatter, and here is which half of it does | frontend/css/10-responsive.css:296 |
| dashboard + reminders (Wave D) | frontend/css/01-forms-settings.css:3635 |
| dashboard quick links | frontend/css/03-dashboard-widgets.css:1838 |
| dashboard widgets, de-vibecoded | frontend/css/08-consistency.css:4156 |
| document formatting toolbar | frontend/css/05-sidebars-themes.css:1912 |
| documents tab | frontend/css/04-chat-dock-appearance.css:3679 |
| documents: outline, live stats, and where the file actually is | frontend/css/05-sidebars-themes.css:2783 |
| documents: the comments panel (DOCUMENTS_PLAN Phase 5 item 1) | frontend/css/05-sidebars-themes.css:3077 |
| drag to delete (INBOX 660) | frontend/css/library-lazy.css:3301 |
| duplicate tidy-up | frontend/css/05-sidebars-themes.css:1658 |
| editing a question in place | frontend/css/05-sidebars-themes.css:315 |
| empty states that sit where they should | frontend/css/08-consistency.css:4253 |
| entry actions + links (Phase 4) | frontend/css/01-forms-settings.css:2145 |
| entry lists | frontend/css/01-forms-settings.css:1398 |
| every control in a dock takes the touch floor | frontend/css/07-whiteboard-misc.css:10452 |
| every menu scrolls down, never sideways, and never runs off the page | frontend/css/07-whiteboard-misc.css:7721 |
| fields answer the pointer too | frontend/css/07-whiteboard-misc.css:3563 |
| filter help (the list inside `#search-help-hint`, a `.help-body`) | frontend/css/05-sidebars-themes.css:643 |
| finding a setting (§36B) | frontend/css/06-timeline-dialogs.css:1369 |
| finding your way about inside Settings (INBOX 444) | frontend/css/01-forms-settings.css:5685 |
| first-run onboarding tour | frontend/css/04-chat-dock-appearance.css:2356 |
| forms | frontend/css/01-forms-settings.css:221 |
| glass reaches the floating chrome that sat outside it | frontend/css/08-consistency.css:2627 |
| glass restraint (UI_MODERNISATION_PLAN.md, Phase 3) | frontend/css/07-whiteboard-misc.css:7791 |
| graph minimap | frontend/css/02-chat-graph.css:4255 |
| graph polish | frontend/css/03-dashboard-widgets.css:3748 |
| graph: depth, halos and legible labels | frontend/css/04-chat-dock-appearance.css:1571 |
| graph: physics sliders + node popup | frontend/css/04-chat-dock-appearance.css:1614 |
| heading hierarchy (§35L) | frontend/css/01-forms-settings.css:1 |
| held space pans, from any tool | frontend/css/07-whiteboard-misc.css:4821 |
| help guide accordion | frontend/css/04-chat-dock-appearance.css:2415 |
| help mini AI chat (item 40's second half) | frontend/css/04-chat-dock-appearance.css:2447 |
| hovering a node | frontend/css/02-chat-graph.css:1390 |
| icon-only buttons are square, everywhere | frontend/css/07-whiteboard-misc.css:3358 |
| left-aligned button lists stay left-aligned | frontend/css/07-whiteboard-misc.css:3619 |
| line numbers for any textarea (UI_MODERNISATION_PLAN Phase 7.2) | frontend/css/07-whiteboard-misc.css:7931 |
| live clock (reminders tab) | frontend/css/01-forms-settings.css:3636 |
| lock screen (Phase 4) | frontend/css/01-forms-settings.css:2035 |
| map nodes and their edges (MINDMAP_PLAN.md §5, Phase 2) | frontend/css/07-whiteboard-misc.css:8053 |
| markdown tables | frontend/css/04-chat-dock-appearance.css:1952 |
| meeting notes (§17) | frontend/css/02-chat-graph.css:2024 |
| model cards: the Models screen's suggested downloads (INBOX 444) | frontend/css/01-forms-settings.css:5833 |
| more than one route between the same two notes | frontend/css/02-chat-graph.css:1258 |
| motion: a heavy page's first visit (INBOX 580) | frontend/css/08-consistency.css:9696 |
| motion: a hover eases (2026-10-05) | frontend/css/08-consistency.css:9588 |
| motion: a list settles in where its skeleton was (2026-10-05) | frontend/css/08-consistency.css:9568 |
| motion: a menu or popover grows from what opened it (INBOX 103, 2026-10-05) | frontend/css/10-responsive.css:230 |
| motion: a page arrives (INBOX 459 (2), 580) | frontend/css/08-consistency.css:9669 |
| motion: a popup arrives, and leaves the way it came (INBOX 580, 2026-10-05) | frontend/css/08-consistency.css:9744 |
| motion: a sidebar's contents arrive from its edge (INBOX 459 (2)) | frontend/css/08-consistency.css:9598 |
| motion: one sliding indicator for every strip (INBOX 459 (2), 2026-10-05) | frontend/css/08-consistency.css:9456 |
| motion: the opening curtain lifts (INBOX 577) | frontend/css/08-consistency.css:9784 |
| moved from 07-whiteboard-misc.css (canvasui, the boot CSS budget): board-only rules whose class names no boot file draws and no later boot rule competes with, in their old order | frontend/css/library-lazy.css:4841 |
| moved from the boot sheets (Brief 101a, room under the boot CSS cap): rules whose selectors name only the Library | frontend/css/library-lazy.css:16 |
| moved from the boot sheets (the boot CSS budget, test_boot_budget.py): rules only the Library | frontend/css/library-lazy.css:710 |
| note card density (§36B) | frontend/css/06-timeline-dialogs.css:1550 |
| note history | frontend/css/05-sidebars-themes.css:1708 |
| notes page polish | frontend/css/03-dashboard-widgets.css:2484 |
| nothing interactive is bare text | frontend/css/07-whiteboard-misc.css:3899 |
| notifications | frontend/css/08-consistency.css:3669 |
| numbered citations inside an answer | frontend/css/02-chat-graph.css:4467 |
| one control height per Library header row | frontend/css/07-whiteboard-misc.css:5273 |
| one gap under every card heading | frontend/css/01-forms-settings.css:4816 |
| one line of facts: a note's meta row | frontend/css/08-consistency.css:2659 |
| one popup, three tiers (INBOX 456, DESIGN.md "A popup window or panel") | frontend/css/08-consistency.css:9128 |
| one size for every dropdown | frontend/css/01-forms-settings.css:4779 |
| one switch, everywhere a checkbox means "on or off" | frontend/css/06-timeline-dialogs.css:2053 |
| one ⋯ button, everywhere (INBOX 722) | frontend/css/00-tokens-shell.css:4226 |
| optional extras (Settings) | frontend/css/00-tokens-shell.css:1619 |
| page margins (Appearance > Page Margins) | frontend/css/07-whiteboard-misc.css:2660 |
| previews on the Library's document and board cards | frontend/css/library-lazy.css:1342 |
| radio groups as choices, not as a list of dots (§35L) | frontend/css/06-timeline-dialogs.css:1236 |
| reading a scan against its own pages | frontend/css/02-chat-graph.css:3511 |
| rebindable shortcuts | frontend/css/05-sidebars-themes.css:697 |
| reminders page polish | frontend/css/03-dashboard-widgets.css:3140 |
| reminders, de-vibecoded | frontend/css/08-consistency.css:3096 |
| reminders: "when" is one decision, so it is one group | frontend/css/07-whiteboard-misc.css:3579 |
| resizable sidebars | frontend/css/05-sidebars-themes.css:1739 |
| results: the list-row recipe | frontend/css/03-dashboard-widgets.css:1508 |
| rich markdown blocks (tables, quotes, rules, task lists) | frontend/css/01-forms-settings.css:1232 |
| rows instead of cards | frontend/css/00-tokens-shell.css:2247 |
| rules recovered from inline style attributes (audit of §40) | frontend/css/07-whiteboard-misc.css:1023 |
| saved filters | frontend/css/05-sidebars-themes.css:656 |
| screen-reader-only announcements | frontend/css/04-chat-dock-appearance.css:2761 |
| scrollbars | frontend/css/07-whiteboard-misc.css:3513 |
| search match highlighting | frontend/css/05-sidebars-themes.css:351 |
| settings / model manager | frontend/css/01-forms-settings.css:1991 |
| settings modal + logs (Wave A) | frontend/css/01-forms-settings.css:3221 |
| settings rows: one shape at rest | frontend/css/01-forms-settings.css:4586 |
| settings, de-vibecoded | frontend/css/08-consistency.css:3111 |
| settings: one column for every "?", and a pane title that is a title | frontend/css/08-consistency.css:3313 |
| sidebar | frontend/css/01-forms-settings.css:108 |
| sidebar heading rows | frontend/css/05-sidebars-themes.css:75 |
| space dialogs | frontend/css/07-whiteboard-misc.css:2540 |
| space switcher (top bar) | frontend/css/07-whiteboard-misc.css:2368 |
| spacious density (third option alongside comfortable/compact) | frontend/css/04-chat-dock-appearance.css:2012 |
| tab navigation (Wave A; pill style inside the top bar in Wave L) | frontend/css/00-tokens-shell.css:3467 |
| text inputs (§36B) | frontend/css/01-forms-settings.css:222 |
| the "/" menu and block frames | frontend/css/05-sidebars-themes.css:827 |
| the "?" head row and its help body | frontend/css/01-forms-settings.css:5341 |
| the 464 round: Settings groups, switch rows, the phone's chrome | frontend/css/08-consistency.css:9794 |
| the AI skills dock: one row where it fits (INBOX 450, 599) | frontend/css/08-consistency.css:9378 |
| the AI status dot | frontend/css/00-tokens-shell.css:1482 |
| the Ask box explaining itself (§35A) | frontend/css/06-timeline-dialogs.css:1215 |
| the Ask box reads as one composer | frontend/css/07-whiteboard-misc.css:3016 |
| the Connections dialog (REDESIGN.md §R7.3) | frontend/css/07-whiteboard-misc.css:5089 |
| the Dashboard's dock on a phone (INBOX 436) | frontend/css/10-responsive.css:2387 |
| the Documents editor on a phone (INBOX 430) | frontend/css/10-responsive.css:2194 |
| the Documents editor on a small laptop (INBOX 430's re-scope) | frontend/css/10-responsive.css:2313 |
| the Graph dock's second row, and the nine pixels that cause it | frontend/css/08-consistency.css:2338 |
| the HUD: a momentary readout, not a notification | frontend/css/07-whiteboard-misc.css:7577 |
| the Library (§4, §36F) | frontend/css/00-tokens-shell.css:1767 |
| the Library on a phone (BACKLOG §116.1 item 3) | frontend/css/07-whiteboard-misc.css:9135 |
| the Library tab's floating action is not the whiteboard's | frontend/css/07-whiteboard-misc.css:10652 |
| the Library's Activity rows (library.js, `library-${item.kind}`) | frontend/css/library-lazy.css:3062 |
| the Library, de-vibecoded (the owner: "devibecode all the ui") | frontend/css/08-consistency.css:2872 |
| the Library, second pass: cards in reading order, one anatomy | frontend/css/library-lazy.css:263 |
| the OCR rail's own switch | frontend/css/07-whiteboard-misc.css:6577 |
| the Skills dropdown | frontend/css/04-chat-dock-appearance.css:1196 |
| the Sources panel | frontend/css/02-chat-graph.css:4970 |
| the accessible card: the title opens it (INBOX 433) | frontend/css/08-consistency.css:2932 |
| the agent activity panel: nothing scrolls sideways, nothing folds onto | frontend/css/07-whiteboard-misc.css:10500 |
| the agent's run, as a timeline | frontend/css/02-chat-graph.css:581 |
| the app emblem, reused across the UI | frontend/css/03-dashboard-widgets.css:3376 |
| the app's one help popover | frontend/css/03-dashboard-widgets.css:4338 |
| the app's own dropdown | frontend/css/07-whiteboard-misc.css:3672 |
| the arrange zone, once it is inside the overflow menu | frontend/css/07-whiteboard-misc.css:9737 |
| the assistant's head and its three verbs (the owner, 2026-09-24: | frontend/css/04-chat-dock-appearance.css:4851 |
| the assistant's three verbs (INBOX 192) | frontend/css/09-editor.css:693 |
| the attachment card (INBOX 440 (2), DESIGN.md "A file attached to a | frontend/css/05-sidebars-themes.css:415 |
| the bar's three zones | frontend/css/00-tokens-shell.css:3213 |
| the block bar (INBOX 421 b) | frontend/css/09-editor.css:1005 |
| the board panel, sorted into the questions it answers | frontend/css/07-whiteboard-misc.css:4870 |
| the board's bar takes the floor of the whole touch band, not just 600 | frontend/css/10-responsive.css:2050 |
| the boot splash: one progress indicator, not two | frontend/css/08-consistency.css:4240 |
| the bottom docks | frontend/css/07-whiteboard-misc.css:9689 |
| the chat dock follows its own width (INBOX 694) | frontend/css/10-responsive.css:2479 |
| the chat page fills its height (§36A) | frontend/css/06-timeline-dialogs.css:1325 |
| the chat sidebar on a phone | frontend/css/02-chat-graph.css:5486 |
| the chat toolbar, grouped (§36B) | frontend/css/06-timeline-dialogs.css:1444 |
| the citation peek (INBOX 80) | frontend/css/02-chat-graph.css:4529 |
| the code editor: gutter + monospace | frontend/css/04-chat-dock-appearance.css:4446 |
| the code panel, one compact header and a padded body (the owner, | frontend/css/library-lazy.css:4774 |
| the composer dock (asked for directly) | frontend/css/04-chat-dock-appearance.css:940 |
| the composer, as one surface | frontend/css/04-chat-dock-appearance.css:5220 |
| the connections rail (WORLD_CLASS_PLAN D2; `renderNotesRail`) | frontend/css/04-chat-dock-appearance.css:323 |
| the context bar (WHITEBOARD_PLAN.md Phase 2, decision 2) | frontend/css/07-whiteboard-misc.css:7068 |
| the dashboard and the labels, de-vibecoded | frontend/css/08-consistency.css:2987 |
| the dashboard's greeting banner, on a phone | frontend/css/07-whiteboard-misc.css:10395 |
| the dashboard's quick actions stop wrapping | frontend/css/07-whiteboard-misc.css:10350 |
| the dashboard's three densities | frontend/css/07-whiteboard-misc.css:11091 |
| the day-one dashboard | frontend/css/05-sidebars-themes.css:3867 |
| the desk's own rows (WORLD_CLASS_PLAN D16) | frontend/css/04-chat-dock-appearance.css:3524 |
| the dock (UI_MODERNISATION_PLAN.md Phase 8) | frontend/css/07-whiteboard-misc.css:9183 |
| the dock above the editor | frontend/css/04-chat-dock-appearance.css:4111 |
| the dock row below 1100 | frontend/css/07-whiteboard-misc.css:9788 |
| the document editor's instruments | frontend/css/05-sidebars-themes.css:4645 |
| the document history, side by side (DOCUMENTS 24 row 4, Brief 76) | frontend/css/library-lazy.css:4599 |
| the document toolbar's two folds | frontend/css/07-whiteboard-misc.css:5196 |
| the documents editor | frontend/css/library-lazy.css:3154 |
| the documents sidebar's vertical budget (§41) | frontend/css/07-whiteboard-misc.css:2125 |
| the documents sidebar, redrawn as one tree (the owner, 2026-10-10: | frontend/css/library-lazy.css:4646 |
| the export dialog (WHITEBOARD_PLAN.md Phase 3, decision 4) | frontend/css/06-timeline-dialogs.css:2538 |
| the faded notes card (WORLD_CLASS_PLAN 15, I4) | frontend/css/03-dashboard-widgets.css:4795 |
| the field: the glyph inside, Stop only while something is loading | frontend/css/03-dashboard-widgets.css:1344 |
| the file picker, in the app's own clothes | frontend/css/08-consistency.css:8822 |
| the flat looks carry no glow on a button | frontend/css/08-consistency.css:3634 |
| the flat looks: a selected tab is a place, not an action | frontend/css/08-consistency.css:2854 |
| the formatting strip says what the caret is already in | frontend/css/09-editor.css:984 |
| the glass card | frontend/css/00-tokens-shell.css:3740 |
| the graph node panel becomes a sheet (GRAPH_PLAN Phase 6) | frontend/css/07-whiteboard-misc.css:10009 |
| the graph's floating controls clear its New note (INBOX 430) | frontend/css/10-responsive.css:2180 |
| the graph's legend: one container, not a pill in a box | frontend/css/08-consistency.css:3066 |
| the graph's options panel | frontend/css/08-consistency.css:3271 |
| the guided tour (DESIGN.md, "A guided tour step") | frontend/css/04-chat-dock-appearance.css:5691 |
| the head: identity, one fact as a dot, an all-icon group | frontend/css/03-dashboard-widgets.css:1284 |
| the help popover is a popover, not a page (INBOX 206) | frontend/css/08-consistency.css:2509 |
| the in-app confirm dialog (§35F) | frontend/css/06-timeline-dialogs.css:1109 |
| the lightbox on a phone (INBOX 430) | frontend/css/10-responsive.css:2165 |
| the live action line | frontend/css/02-chat-graph.css:4819 |
| the lock screen | frontend/css/08-consistency.css:3705 |
| the log console (§1) | frontend/css/06-timeline-dialogs.css:728 |
| the map is the tab, and its controls float over it | frontend/css/02-chat-graph.css:5510 |
| the mind map's outline and markers (MINDMAP_PLAN decisions 33, 34) | frontend/css/library-lazy.css:2835 |
| the node edit strip (MINDMAP_PLAN.md §12.1 item 2) | frontend/css/07-whiteboard-misc.css:8504 |
| the node radial (MINDMAP_PLAN.md §12.1 item 3) | frontend/css/07-whiteboard-misc.css:8763 |
| the note card's metadata, ordered (§36B) | frontend/css/06-timeline-dialogs.css:1488 |
| the notifications centre (§36E) | frontend/css/06-timeline-dialogs.css:1647 |
| the one control in a dock that was not the dock's height | frontend/css/10-responsive.css:337 |
| the one generating animation | frontend/css/01-forms-settings.css:4719 |
| the one map chip (MINDMAP_PLAN.md §5 item 12) | frontend/css/05-sidebars-themes.css:776 |
| the one popover shell (UI_MODERNISATION_PLAN.md, Phase 2) | frontend/css/07-whiteboard-misc.css:7752 |
| the orphan-row pattern, everywhere else it appears (§36B) | frontend/css/06-timeline-dialogs.css:1629 |
| the overview strip | frontend/css/00-tokens-shell.css:1829 |
| the page scrollers scroll on the compositor | frontend/css/08-consistency.css:4271 |
| the page shell (§35L) | frontend/css/00-tokens-shell.css:3557 |
| the palette on a touch screen (INBOX 464) | frontend/css/10-responsive.css:2465 |
| the phone header fits inside the phone | frontend/css/05-sidebars-themes.css:5865 |
| the picker itself | frontend/css/05-sidebars-themes.css:3750 |
| the primary action floats, where a dock has one | frontend/css/07-whiteboard-misc.css:10244 |
| the quick-nav chord's guide | frontend/css/10-responsive.css:418 |
| the reader: one scroller, the page set as prose | frontend/css/03-dashboard-widgets.css:1659 |
| the reply head on Ask's answer, the draft and the guide (INBOX 471) | frontend/css/08-consistency.css:9436 |
| the rich picker (rich-picker.js; DESIGN.md's recipe index) | frontend/css/05-sidebars-themes.css:864 |
| the run list (AGENT_SKILLS_REFORM.md, Phase C) | frontend/css/07-whiteboard-misc.css:1404 |
| the scroll container (§36A) | frontend/css/00-tokens-shell.css:1093 |
| the selection tick in Rows (INBOX 426 z, image 91) | frontend/css/08-consistency.css:8941 |
| the selection tick, in the app's own language | frontend/css/07-whiteboard-misc.css:4192 |
| the settings jump list | frontend/css/07-whiteboard-misc.css:10414 |
| the settings sheet takes the touch floor | frontend/css/01-forms-settings.css:5474 |
| the sketch pad's bar: a dock (INBOX 839) | frontend/css/02-chat-graph.css:1699 |
| the spine | frontend/css/00-tokens-shell.css:2197 |
| the spine on the other edge (MINDMAP_PLAN.md §13e) | frontend/css/07-whiteboard-misc.css:8305 |
| the status bar (§36D) | frontend/css/00-tokens-shell.css:3131 |
| the status bar from 820 to 959: one item fewer | frontend/css/10-responsive.css:1148 |
| the status bar on a small phone | frontend/css/00-tokens-shell.css:3440 |
| the status line and the recent searches | frontend/css/03-dashboard-widgets.css:1413 |
| the step group (Perplexity's "Finished N steps") | frontend/css/02-chat-graph.css:4892 |
| the strip's three doors (MINDMAP_PLAN.md §13b) | frontend/css/07-whiteboard-misc.css:8599 |
| the strips that appear only when they apply | frontend/css/00-tokens-shell.css:1844 |
| the structural blocks (INBOX 421 b) | frontend/css/05-sidebars-themes.css:1413 |
| the suggestion menu, the dictionary, and the goal | frontend/css/05-sidebars-themes.css:5156 |
| the switch's hit target (MODERNISATION_AUDIT.md Brief 8) | frontend/css/07-whiteboard-misc.css:7897 |
| the tab strip is centred on the window, not on whatever is left of it | frontend/css/07-whiteboard-misc.css:7620 |
| the timeline, de-vibecoded | frontend/css/08-consistency.css:3079 |
| the tool rail (WHITEBOARD_PLAN.md Phase 1, decision 1) | frontend/css/07-whiteboard-misc.css:10570 |
| the tools panel, sorted into what each group of icons does | frontend/css/06-timeline-dialogs.css:2693 |
| the touch floor, for the two surfaces the dock rule cannot reach | frontend/css/03-dashboard-widgets.css:4759 |
| the trace strip | frontend/css/04-chat-dock-appearance.css:1 |
| the two radio-backed segmented bars | frontend/css/03-dashboard-widgets.css:3830 |
| the two whiteboard controls that never joined the strip | frontend/css/07-whiteboard-misc.css:3276 |
| the web-search engine picker | frontend/css/04-chat-dock-appearance.css:2576 |
| the whiteboard top bar and the documents editor join the families | frontend/css/07-whiteboard-misc.css:7825 |
| the whiteboard's panels are one surface each | frontend/css/07-whiteboard-misc.css:3476 |
| the whiteboard's tools become a bottom strip | frontend/css/07-whiteboard-misc.css:10310 |
| the writing room | frontend/css/04-chat-dock-appearance.css:3377 |
| tools & features browser | frontend/css/03-dashboard-widgets.css:2229 |
| top bar polish | frontend/css/05-sidebars-themes.css:4366 |
| transcluded notes (![[note]]) | frontend/css/05-sidebars-themes.css:1559 |
| two-up cards in tablet portrait | frontend/css/07-whiteboard-misc.css:9950 |
| user-tunable corner rounding | frontend/css/04-chat-dock-appearance.css:1981 |
| web panel (search + reader) | frontend/css/03-dashboard-widgets.css:1249 |
| what a wide screen is for | frontend/css/00-tokens-shell.css:3567 |
| what it learned (WORLD_CLASS_PLAN I9) | frontend/css/01-forms-settings.css:5532 |
| what the AI remembers (ROADMAP §39B) | frontend/css/07-whiteboard-misc.css:1928 |
| what the agent found, as things you can open | frontend/css/07-whiteboard-misc.css:5232 |
| what the answering model is | frontend/css/02-chat-graph.css:5318 |
| what the phone block assumed, and the sheet undoes | frontend/css/07-whiteboard-misc.css:9963 |
| whiteboard fixes (§41) | frontend/css/07-whiteboard-misc.css:2055 |
| whiteboard objects: images and text boxes, neither tied to a note | frontend/css/07-whiteboard-misc.css:1 |
| widget picker modal (roadmap §26) | frontend/css/07-whiteboard-misc.css:3158 |

### Lines per stylesheet

| File | Lines |
|---|---|
| frontend/css/00-tokens-shell.css | 4256 |
| frontend/css/01-forms-settings.css | 6160 |
| frontend/css/02-chat-graph.css | 5914 |
| frontend/css/03-dashboard-widgets.css | 5217 |
| frontend/css/04-chat-dock-appearance.css | 6510 |
| frontend/css/05-sidebars-themes.css | 6228 |
| frontend/css/06-timeline-dialogs.css | 3713 |
| frontend/css/07-whiteboard-misc.css | 11943 |
| frontend/css/08-consistency.css | 10461 |
| frontend/css/09-editor.css | 1116 |
| frontend/css/10-responsive.css | 2586 |
| frontend/css/ask-compose-lazy.css | 33 |
| frontend/css/atlas-lazy.css | 52 |
| frontend/css/captions-lazy.css | 83 |
| frontend/css/first-run-lazy.css | 41 |
| frontend/css/graph-lazy.css | 157 |
| frontend/css/help-chat-lazy.css | 32 |
| frontend/css/icon-picker.css | 101 |
| frontend/css/lan-lazy.css | 56 |
| frontend/css/library-lazy.css | 6012 |
| frontend/css/manual-lazy.css | 139 |
| frontend/css/meetings-lazy.css | 477 |
| frontend/css/nav-history-lazy.css | 144 |
| frontend/css/questions-lazy.css | 92 |
| frontend/css/quickadd-lazy.css | 35 |
| frontend/css/recovery-lazy.css | 115 |
| frontend/css/reveal-lazy.css | 10 |
| frontend/css/search-lazy.css | 86 |
| frontend/css/tidy-lazy.css | 333 |
| frontend/css/timeline-calendar-lazy.css | 232 |
| frontend/css/usage-lazy.css | 34 |
| frontend/css/utilities-lazy.css | 116 |

## Backend routes (562)

`@router.<method>(` and `@app.<method>(` decorators in `src/memorymap/api/*.py`, sorted by path. The line is the decorator's.

| Path | Method | Function | File:line |
|---|---|---|---|
|  | DELETE | `clear` | src/memorymap/api/routes_usage.py:40 |
|  | DELETE | `clear_ask_history` | src/memorymap/api/routes_ask_history.py:181 |
|  | DELETE | `forget_everything` | src/memorymap/api/routes_learned.py:212 |
|  | GET | `list_ask_history` | src/memorymap/api/routes_ask_history.py:47 |
|  | GET | `list_bookmarks` | src/memorymap/api/routes_bookmarks.py:116 |
|  | GET | `list_categories` | src/memorymap/api/routes_categories.py:149 |
|  | GET | `list_conversations` | src/memorymap/api/routes_conversations.py:300 |
|  | GET | `list_documents` | src/memorymap/api/routes_documents.py:342 |
|  | GET | `list_duplicates` | src/memorymap/api/routes_duplicates.py:78 |
|  | GET | `list_entities` | src/memorymap/api/routes_entities.py:68 |
|  | GET | `list_entries` | src/memorymap/api/routes_entries.py:2247 |
|  | GET | `list_facts` | src/memorymap/api/routes_learned.py:132 |
|  | GET | `list_questions` | src/memorymap/api/routes_questions.py:26 |
|  | GET | `list_reminders` | src/memorymap/api/routes_reminders.py:431 |
|  | GET | `list_tags` | src/memorymap/api/routes_tags.py:40 |
|  | GET | `list_types` | src/memorymap/api/routes_relations.py:65 |
|  | GET | `search` | src/memorymap/api/routes_search.py:59 |
|  | GET | `state` | src/memorymap/api/routes_bench.py:236 |
|  | GET | `suggestions` | src/memorymap/api/routes_inbox.py:124 |
|  | GET | `tidy_summary` | src/memorymap/api/routes_tidy.py:50 |
|  | GET | `timeline` | src/memorymap/api/routes_timeline.py:375 |
|  | GET | `today` | src/memorymap/api/routes_resurface.py:96 |
|  | POST | `chat` | src/memorymap/api/routes_chat.py:1557 |
|  | POST | `count` | src/memorymap/api/routes_usage.py:30 |
|  | POST | `create_bookmark` | src/memorymap/api/routes_bookmarks.py:143 |
|  | POST | `create_category` | src/memorymap/api/routes_categories.py:161 |
|  | POST | `create_conversation` | src/memorymap/api/routes_conversations.py:430 |
|  | POST | `create_document` | src/memorymap/api/routes_documents.py:470 |
|  | POST | `create_entry` | src/memorymap/api/routes_entries.py:714 |
|  | POST | `create_reminder` | src/memorymap/api/routes_reminders.py:476 |
|  | POST | `create_type` | src/memorymap/api/routes_relations.py:76 |
|  | POST | `start` | src/memorymap/api/routes_bench.py:196 |
| `/` | GET | `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:927 |
| `/account` | GET | `account` | src/memorymap/api/routes_auth.py:1220 |
| `/activity` | GET | `list_activity` | src/memorymap/api/routes_tasks.py:892 |
| `/activity/{job_id:path}/stop` | POST | `stop_activity` | src/memorymap/api/routes_tasks.py:901 |
| `/all` | GET | `ranked` | src/memorymap/api/routes_resurface.py:119 |
| `/apply` | POST | `apply_update` | src/memorymap/api/routes_update.py:663 |
| `/apply/status` | GET | `apply_status` | src/memorymap/api/routes_update.py:758 |
| `/ask` | POST | `ask` | src/memorymap/api/routes_help.py:64 |
| `/ask/stream` | POST | `ask_stream` | src/memorymap/api/routes_help.py:76 |
| `/audit` | DELETE | `clear_audit_log` | src/memorymap/api/routes_settings.py:1846 |
| `/audit` | GET | `audit_log` | src/memorymap/api/routes_settings.py:1570 |
| `/audit/export.csv` | GET | `audit_export_csv` | src/memorymap/api/routes_settings.py:1661 |
| `/auto` | PUT | `tidy_auto` | src/memorymap/api/routes_tidy.py:60 |
| `/auto-session` | POST | `auto_session` | src/memorymap/api/routes_auth.py:803 |
| `/backups` | GET | `list_backups` | src/memorymap/api/routes_backups.py:106 |
| `/backups` | POST | `backup_now` | src/memorymap/api/routes_backups.py:115 |
| `/backups/bundle` | POST | `export_bundle` | src/memorymap/api/routes_backups.py:215 |
| `/backups/bundle/restore` | POST | `restore_bundle` | src/memorymap/api/routes_backups.py:256 |
| `/backups/integrity` | GET | `integrity_at_start` | src/memorymap/api/routes_backups.py:94 |
| `/backups/restore` | POST | `restore_backup` | src/memorymap/api/routes_backups.py:155 |
| `/backups/retention` | PUT | `set_retention` | src/memorymap/api/routes_backups.py:137 |
| `/backups/{name}` | DELETE | `delete_backup` | src/memorymap/api/routes_backups.py:186 |
| `/board-library` | GET | `list_library` | src/memorymap/api/routes_board_library.py:411 |
| `/board-library` | POST | `create_library_item` | src/memorymap/api/routes_board_library.py:500 |
| `/board-library/export` | GET | `export_library` | src/memorymap/api/routes_board_library.py:649 |
| `/board-library/import` | POST | `import_library` | src/memorymap/api/routes_board_library.py:682 |
| `/board-library/libraries` | POST | `create_library` | src/memorymap/api/routes_board_library.py:615 |
| `/board-library/libraries/{library_id}` | DELETE | `delete_library` | src/memorymap/api/routes_board_library.py:633 |
| `/board-library/libraries/{library_id}` | PUT | `rename_library` | src/memorymap/api/routes_board_library.py:625 |
| `/board-library/marks` | POST | `mark_builtin` | src/memorymap/api/routes_board_library.py:599 |
| `/board-library/new-board` | POST | `new_board_from_template` | src/memorymap/api/routes_board_library.py:1044 |
| `/board-library/{item_id}` | DELETE | `delete_library_item` | src/memorymap/api/routes_board_library.py:556 |
| `/board-library/{item_id}` | PUT | `update_library_item` | src/memorymap/api/routes_board_library.py:532 |
| `/board-library/{item_id}/duplicate` | POST | `duplicate_library_item` | src/memorymap/api/routes_board_library.py:578 |
| `/board-library/{item_id}/restore` | POST | `restore_library_item` | src/memorymap/api/routes_board_library.py:567 |
| `/boards` | GET | `list_boards` | src/memorymap/api/routes_whiteboard.py:2256 |
| `/boards` | POST | `create_board` | src/memorymap/api/routes_whiteboard.py:2513 |
| `/boards/generate` | POST | `generate_map` | src/memorymap/api/routes_whiteboard.py:5675 |
| `/boards/import` | POST | `import_board` | src/memorymap/api/routes_whiteboard.py:5749 |
| `/boards/propose` | POST | `propose_map` | src/memorymap/api/routes_whiteboard.py:5546 |
| `/boards/{board_id}` | PUT | `rename_board` | src/memorymap/api/routes_whiteboard.py:2720 |
| `/boards/{board_id}/duplicate` | POST | `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2555 |
| `/boards/{board_id}/export` | GET | `export_board` | src/memorymap/api/routes_whiteboard.py:4740 |
| `/boards/{board_id}/nodes` | POST | `create_map_node` | src/memorymap/api/routes_whiteboard.py:3636 |
| `/boards/{board_id}/nodes/clear-style` | POST | `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:4061 |
| `/boards/{board_id}/nodes/move-many` | PUT | `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3924 |
| `/boards/{board_id}/nodes/outline` | POST | `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3731 |
| `/boards/{board_id}/nodes/{node_id}/branches` | POST | `add_branches` | src/memorymap/api/routes_map_suggest.py:197 |
| `/boards/{board_id}/nodes/{node_id}/move` | PUT | `move_map_node` | src/memorymap/api/routes_whiteboard.py:3807 |
| `/boards/{board_id}/nodes/{node_id}/suggest` | POST | `suggest_branches` | src/memorymap/api/routes_map_suggest.py:146 |
| `/boards/{board_id}/nodes/{node_id}/summary` | POST | `summarise_branch` | src/memorymap/api/routes_map_suggest.py:308 |
| `/boards/{board_id}/tree` | GET | `board_tree` | src/memorymap/api/routes_whiteboard.py:3569 |
| `/budgets` | GET | `budgets` | src/memorymap/api/routes_bench.py:123 |
| `/bulk` | POST | `bulk_action` | src/memorymap/api/routes_learned.py:236 |
| `/bulk` | POST | `bulk_edit_tags` | src/memorymap/api/routes_tags.py:104 |
| `/capabilities` | GET | `capabilities` | src/memorymap/api/routes_capabilities.py:75 |
| `/change-password` | POST | `change_password` | src/memorymap/api/routes_auth.py:1252 |
| `/changelog` | GET | `changelog` | src/memorymap/api/app.py:1426 |
| `/charts/question` | POST | `chart_for_question` | src/memorymap/api/routes_vision.py:380 |
| `/chat-model` | POST | `set_chat_model` | src/memorymap/api/routes_models.py:696 |
| `/check` | GET | `check_for_update` | src/memorymap/api/routes_update.py:428 |
| `/check-syntax` | POST | `check_syntax` | src/memorymap/api/routes_documents.py:310 |
| `/choice` | POST | `update_choice` | src/memorymap/api/routes_update.py:414 |
| `/clip` | POST | `clip` | src/memorymap/api/routes_webclip.py:44 |
| `/clip-page` | POST | `clip_page` | src/memorymap/api/routes_webclip.py:110 |
| `/code-snippets` | GET | `list_snippets` | src/memorymap/api/routes_code_snippets.py:64 |
| `/code-snippets` | POST | `create_snippet` | src/memorymap/api/routes_code_snippets.py:89 |
| `/code-snippets/{snippet_id}` | PUT | `update_snippet` | src/memorymap/api/routes_code_snippets.py:105 |
| `/command/run` | POST | `run_command` | src/memorymap/api/routes_chat.py:2411 |
| `/compose` | POST | `compose_draft` | src/memorymap/api/routes_drafts.py:75 |
| `/compose/stream` | POST | `compose_draft_stream` | src/memorymap/api/routes_drafts.py:110 |
| `/compress` | POST | `compress_history` | src/memorymap/api/routes_chat.py:3089 |
| `/compute` | POST | `compute` | src/memorymap/api/routes_resurface.py:85 |
| `/confirm` | POST | `confirm_insight` | src/memorymap/api/routes_insights.py:426 |
| `/contents` | POST | `write_contents` | src/memorymap/api/routes_documents.py:503 |
| `/corrections` | GET | `list_corrections` | src/memorymap/api/routes_learned.py:78 |
| `/corrections` | POST | `add_correction` | src/memorymap/api/routes_learned.py:53 |
| `/count` | GET | `count_entries` | src/memorymap/api/routes_entries.py:2408 |
| `/counts` | GET | `counts` | src/memorymap/api/routes_questions.py:45 |
| `/counts` | GET | `reminder_counts` | src/memorymap/api/routes_reminders.py:208 |
| `/daily` | GET | `daily_journal` | src/memorymap/api/routes_entries.py:948 |
| `/daily/{day}` | GET | `daily_note` | src/memorymap/api/routes_entries.py:990 |
| `/daily/{day}` | POST | `open_daily_note` | src/memorymap/api/routes_entries.py:1006 |
| `/day` | GET | `day_digest_lines` | src/memorymap/api/routes_insights.py:387 |
| `/delete` | POST | `delete_model` | src/memorymap/api/routes_models.py:1008 |
| `/delete` | POST | `delete_tag` | src/memorymap/api/routes_tags.py:95 |
| `/desktop/fullscreen` | GET | `desktop_fullscreen_state` | src/memorymap/api/routes_tasks.py:762 |
| `/desktop/fullscreen` | POST | `desktop_fullscreen_toggle` | src/memorymap/api/routes_tasks.py:774 |
| `/digest` | POST | `weekly_digest` | src/memorymap/api/routes_insights.py:717 |
| `/digest/stream` | POST | `weekly_digest_stream` | src/memorymap/api/routes_insights.py:649 |
| `/dismiss` | POST | `dismiss_insight` | src/memorymap/api/routes_insights.py:440 |
| `/dismissed` | GET | `dismissed_suggestions` | src/memorymap/api/routes_inbox.py:217 |
| `/dismissed/clear` | POST | `clear_dismissed_suggestions` | src/memorymap/api/routes_inbox.py:225 |
| `/dismissed/restore` | POST | `restore_dismissed_suggestions` | src/memorymap/api/routes_inbox.py:239 |
| `/documents/run-sandbox` | GET | `run_sandbox` | src/memorymap/api/run_sandbox.py:713 |
| `/documents/run-sandbox/python` | GET | `run_sandbox_python` | src/memorymap/api/run_sandbox.py:1455 |
| `/documents/{document_id}/code-assist` | POST | `code_assist_route` | src/memorymap/api/routes_code_assist.py:34 |
| `/embedding-backend` | POST | `set_embedding_backend` | src/memorymap/api/routes_models.py:919 |
| `/embedding-models` | GET | `list_embedding_models` | src/memorymap/api/routes_settings.py:1941 |
| `/embedding-models/choices` | GET | `embedding_model_choices` | src/memorymap/api/routes_settings.py:1968 |
| `/embedding-models/pull` | POST | `pull_embedding_model` | src/memorymap/api/routes_settings.py:2023 |
| `/embedding-models/use` | POST | `use_embedding_model` | src/memorymap/api/routes_settings.py:2000 |
| `/embedding-models/{model_id}` | DELETE | `remove_embedding_model` | src/memorymap/api/routes_settings.py:2079 |
| `/embedding-models/{model_id}/download` | POST | `download_embedding_model` | src/memorymap/api/routes_settings.py:2060 |
| `/entries/{entry_id}/files` | POST | `upload_file` | src/memorymap/api/routes_files.py:97 |
| `/entries/{entry_id}/meeting` | GET | `read_meeting` | src/memorymap/api/routes_meetings.py:90 |
| `/entries/{entry_id}/meeting/append` | POST | `append_to_meeting` | src/memorymap/api/routes_meetings.py:176 |
| `/entries/{entry_id}/meeting/remind` | POST | `remind_action` | src/memorymap/api/routes_meetings.py:135 |
| `/entries/{entry_id}/meeting/summarise` | POST | `summarise_meeting` | src/memorymap/api/routes_meetings.py:234 |
| `/entries/{entry_id}/properties` | GET | `entry_properties` | src/memorymap/api/routes_properties.py:45 |
| `/entries/{entry_id}/properties` | PUT | `put_properties` | src/memorymap/api/routes_properties.py:61 |
| `/events` | GET | `event_feed` | src/memorymap/api/routes_settings.py:1788 |
| `/events/undo` | POST | `undo_actor` | src/memorymap/api/routes_settings.py:1759 |
| `/export` | GET | `export_learned` | src/memorymap/api/routes_learned.py:150 |
| `/export.ics` | GET | `export_ics` | src/memorymap/api/routes_reminders.py:356 |
| `/export/backup` | GET | `export_backup` | src/memorymap/api/routes_settings.py:2450 |
| `/export/csv` | GET | `export_csv` | src/memorymap/api/routes_settings.py:3163 |
| `/export/folder` | GET | `export_notebook_folder` | src/memorymap/api/routes_import.py:121 |
| `/export/json` | GET | `export_json` | src/memorymap/api/routes_settings.py:2474 |
| `/export/markdown` | GET | `export_markdown` | src/memorymap/api/routes_settings.py:2604 |
| `/extract/commit` | POST | `extract_commit` | src/memorymap/api/routes_entries.py:3890 |
| `/extract/preview` | POST | `extract_preview` | src/memorymap/api/routes_entries.py:3844 |
| `/extras` | GET | `list_extras` | src/memorymap/api/routes_settings.py:1877 |
| `/extras/bulk` | POST | `bulk_extras` | src/memorymap/api/routes_settings.py:1909 |
| `/extras/{extra_id}/install` | POST | `install_extra` | src/memorymap/api/routes_settings.py:1918 |
| `/extras/{extra_id}/uninstall` | POST | `uninstall_extra` | src/memorymap/api/routes_settings.py:1931 |
| `/feature-model` | POST | `set_feature_model` | src/memorymap/api/routes_models.py:771 |
| `/feature-models/reset` | POST | `reset_feature_models` | src/memorymap/api/routes_models.py:821 |
| `/file-types` | GET | `list_file_types` | src/memorymap/api/routes_documents.py:285 |
| `/files/exports` | GET | `list_exports` | src/memorymap/api/routes_files.py:1133 |
| `/files/exports/{filename}` | GET | `download_export` | src/memorymap/api/routes_files.py:1171 |
| `/files/gallery` | GET | `list_attachment_gallery` | src/memorymap/api/routes_files.py:297 |
| `/files/open-exports-folder` | POST | `open_exports_folder` | src/memorymap/api/routes_files.py:1182 |
| `/files/readings` | GET | `file_readings` | src/memorymap/api/routes_files.py:273 |
| `/files/save` | POST | `save_generated_file` | src/memorymap/api/routes_files.py:1085 |
| `/files/{attachment_id}` | DELETE | `delete_file` | src/memorymap/api/routes_files.py:906 |
| `/files/{attachment_id}` | PUT | `rename_file` | src/memorymap/api/routes_files.py:928 |
| `/files/{attachment_id}/analyse` | POST | `analyse_attachment` | src/memorymap/api/routes_files.py:449 |
| `/files/{attachment_id}/ocr-clean-loops` | POST | `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3857 |
| `/files/{attachment_id}/ocr-page-read` | POST | `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3435 |
| `/files/{attachment_id}/ocr-range-read` | POST | `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3399 |
| `/files/{attachment_id}/ocr-regions` | GET | `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2531 |
| `/files/{attachment_id}/page-caption` | POST | `attachment_page_caption` | src/memorymap/api/routes_files.py:3640 |
| `/files/{attachment_id}/page-reads` | GET | `attachment_page_reads` | src/memorymap/api/routes_files.py:3678 |
| `/files/{attachment_id}/page-reads/{page}` | DELETE | `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3735 |
| `/files/{attachment_id}/pdf-info` | GET | `attached_file_pdf_info` | src/memorymap/api/routes_files.py:769 |
| `/files/{attachment_id}/readings/{source}` | DELETE | `delete_attachment_reading` | src/memorymap/api/routes_files.py:3794 |
| `/files/{attachment_id}/region-read` | POST | `attachment_region_read` | src/memorymap/api/routes_files.py:3606 |
| `/files/{attachment_id}/text` | GET | `attached_file_text` | src/memorymap/api/routes_files.py:664 |
| `/files/{attachment_id}/text` | PUT | `save_attached_file_text` | src/memorymap/api/routes_files.py:711 |
| `/followups` | POST | `chat_followups` | src/memorymap/api/routes_chat.py:291 |
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
| `/greeting` | GET | `greeting` | src/memorymap/api/routes_insights.py:172 |
| `/hardware` | GET | `hardware_memory` | src/memorymap/api/routes_models.py:651 |
| `/health` | GET | `debug_health` | src/memorymap/api/routes_debug.py:79 |
| `/health` | GET | `health` | src/memorymap/api/app.py:1368 |
| `/health/integrity` | POST | `integrity_check` | src/memorymap/api/routes_debug.py:186 |
| `/heatmap` | GET | `heatmap` | src/memorymap/api/routes_insights.py:352 |
| `/history` | GET | `board_history` | src/memorymap/api/routes_board_history.py:271 |
| `/history` | GET | `tidy_history` | src/memorymap/api/routes_tidy.py:55 |
| `/history/snapshots` | GET | `list_snapshots` | src/memorymap/api/routes_board_history.py:331 |
| `/history/snapshots` | POST | `save_snapshot` | src/memorymap/api/routes_board_history.py:346 |
| `/history/snapshots/{snapshot_id}` | DELETE | `delete_snapshot` | src/memorymap/api/routes_board_history.py:372 |
| `/history/{event_id}` | GET | `board_at` | src/memorymap/api/routes_board_history.py:385 |
| `/history/{event_id}/restore` | POST | `restore_board` | src/memorymap/api/routes_board_history.py:416 |
| `/images` | GET | `list_images` | src/memorymap/api/routes_whiteboard.py:2445 |
| `/import` | POST | `import_document` | src/memorymap/api/routes_documents.py:529 |
| `/import.ics` | POST | `import_ics` | src/memorymap/api/routes_reminders.py:401 |
| `/import/app` | POST | `import_app` | src/memorymap/api/routes_import.py:63 |
| `/import/directory` | POST | `import_directory` | src/memorymap/api/routes_settings.py:2945 |
| `/import/document` | POST | `import_document` | src/memorymap/api/routes_settings.py:3067 |
| `/import/markdown` | POST | `import_markdown` | src/memorymap/api/routes_settings.py:2960 |
| `/import/reports/{report_id}` | GET | `import_report_page` | src/memorymap/api/routes_import.py:112 |
| `/improve` | POST | `improve_writing` | src/memorymap/api/routes_entries.py:1572 |
| `/inspect` | POST | `inspect_model` | src/memorymap/api/routes_models.py:668 |
| `/instance` | GET | `instance` | src/memorymap/api/app.py:1387 |
| `/instance/focus` | POST | `instance_focus` | src/memorymap/api/app.py:1401 |
| `/jobs` | GET | `list_jobs` | src/memorymap/api/routes_tasks.py:558 |
| `/jobs/cancel` | POST | `cancel_job` | src/memorymap/api/routes_models.py:904 |
| `/jobs/last-runs` | GET | `jobs_last_runs` | src/memorymap/api/routes_tasks.py:524 |
| `/jobs/passes/{kind}/run` | POST | `run_pass_now` | src/memorymap/api/routes_tasks.py:544 |
| `/jobs/stream` | GET | `jobs_stream` | src/memorymap/api/routes_tasks.py:585 |
| `/jobs/{job_id}/cancel` | POST | `cancel_job` | src/memorymap/api/routes_tasks.py:566 |
| `/lan-access` | GET | `lan_access` | src/memorymap/api/routes_auth.py:957 |
| `/lan-access` | POST | `set_lan_access` | src/memorymap/api/routes_auth.py:1136 |
| `/lan-certificate` | POST | `regenerate_lan_certificate` | src/memorymap/api/routes_auth.py:984 |
| `/lan-certificate.pem` | GET | `download_lan_certificate` | src/memorymap/api/routes_auth.py:963 |
| `/lan-devices/{device_id}` | DELETE | `forget_device` | src/memorymap/api/routes_auth.py:1096 |
| `/lan-devices/{device_id}/{verdict}` | POST | `answer_device` | src/memorymap/api/routes_auth.py:1075 |
| `/lan-networks/allow` | POST | `allow_this_network` | src/memorymap/api/routes_auth.py:1033 |
| `/lan-networks/{key}` | DELETE | `forget_network` | src/memorymap/api/routes_auth.py:1049 |
| `/lan-options` | POST | `set_lan_option` | src/memorymap/api/routes_auth.py:1057 |
| `/lan-watch` | GET | `lan_watch` | src/memorymap/api/routes_auth.py:1113 |
| `/latest` | GET | `latest` | src/memorymap/api/routes_night.py:84 |
| `/library` | GET | `library` | src/memorymap/api/routes_library.py:1076 |
| `/link-reasons/run` | POST | `tidy_link_reasons_run` | src/memorymap/api/routes_tidy.py:78 |
| `/link-reasons/stop` | POST | `tidy_link_reasons_stop` | src/memorymap/api/routes_tidy.py:88 |
| `/link-suggestions` | GET | `link_suggestions` | src/memorymap/api/routes_entries.py:1686 |
| `/link-suggestions/reasons` | POST | `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:2033 |
| `/links/backfill-reasons` | POST | `backfill_link_reasons` | src/memorymap/api/routes_entries.py:2081 |
| `/lock` | POST | `lock` | src/memorymap/api/routes_auth.py:1182 |
| `/lock-all` | POST | `lock_all` | src/memorymap/api/routes_auth.py:1693 |
| `/logs` | DELETE | `clear_server_logs` | src/memorymap/api/routes_settings.py:2169 |
| `/logs` | GET | `server_logs` | src/memorymap/api/routes_settings.py:2086 |
| `/logs/stats` | GET | `server_log_stats` | src/memorymap/api/routes_settings.py:2157 |
| `/logs/stream` | GET | `stream_server_logs` | src/memorymap/api/routes_settings.py:2185 |
| `/maps/from-notes` | POST | `map_from_notes` | src/memorymap/api/routes_map_from_notes.py:256 |
| `/media` | GET | `list_media` | src/memorymap/api/routes_files.py:1392 |
| `/media-session` | POST | `media_session` | src/memorymap/api/routes_auth.py:790 |
| `/media/meta/{filename}` | GET | `media_meta` | src/memorymap/api/routes_files.py:1549 |
| `/media/orphans` | DELETE | `clean_orphaned_media` | src/memorymap/api/routes_files.py:1524 |
| `/media/orphans` | GET | `list_orphaned_media` | src/memorymap/api/routes_files.py:1493 |
| `/media/pdf-info/{filename}` | GET | `media_pdf_info` | src/memorymap/api/routes_files.py:1667 |
| `/media/text/{filename}` | GET | `media_text` | src/memorymap/api/routes_files.py:1599 |
| `/media/upload` | POST | `upload_media` | src/memorymap/api/routes_files.py:1243 |
| `/media/{upload_id}` | DELETE | `delete_media` | src/memorymap/api/routes_files.py:1786 |
| `/media/{upload_id}` | PUT | `rename_media` | src/memorymap/api/routes_files.py:1819 |
| `/media/{upload_id}/caption` | POST | `caption_media` | src/memorymap/api/routes_files.py:1874 |
| `/media/{upload_id}/ocr` | POST | `ocr_media` | src/memorymap/api/routes_files.py:1979 |
| `/media/{upload_id}/ocr-clean-loops` | POST | `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3883 |
| `/media/{upload_id}/ocr-page-read` | POST | `media_ocr_page_read` | src/memorymap/api/routes_files.py:3452 |
| `/media/{upload_id}/ocr-range-read` | POST | `media_ocr_range_read` | src/memorymap/api/routes_files.py:3417 |
| `/media/{upload_id}/ocr-regions` | GET | `media_ocr_regions` | src/memorymap/api/routes_files.py:2497 |
| `/media/{upload_id}/page-caption` | POST | `media_page_caption` | src/memorymap/api/routes_files.py:3661 |
| `/media/{upload_id}/page-reads` | GET | `media_page_reads` | src/memorymap/api/routes_files.py:3694 |
| `/media/{upload_id}/page-reads/{page}` | DELETE | `delete_media_page_read` | src/memorymap/api/routes_files.py:3749 |
| `/media/{upload_id}/readings/{source}` | DELETE | `delete_media_reading` | src/memorymap/api/routes_files.py:3784 |
| `/media/{upload_id}/region-read` | POST | `media_region_read` | src/memorymap/api/routes_files.py:3626 |
| `/media/{upload_id}/vision-ocr` | POST | `vision_ocr_media` | src/memorymap/api/routes_files.py:3936 |
| `/meetings` | POST | `create_meeting` | src/memorymap/api/routes_meetings.py:52 |
| `/memory` | GET | `list_memory` | src/memorymap/api/routes_settings.py:1429 |
| `/memory` | POST | `add_memory` | src/memorymap/api/routes_settings.py:1464 |
| `/memory/{preference_id}` | DELETE | `forget_memory` | src/memorymap/api/routes_settings.py:1560 |
| `/memory/{preference_id}` | PATCH | `update_memory` | src/memorymap/api/routes_settings.py:1541 |
| `/memory/{preference_id}/answer` | POST | `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1507 |
| `/merge` | POST | `merge_notes` | src/memorymap/api/routes_duplicates.py:135 |
| `/merge` | POST | `merge_tags` | src/memorymap/api/routes_tags.py:86 |
| `/merges/accept` | POST | `accept_merge` | src/memorymap/api/routes_inbox.py:143 |
| `/merges/dismiss` | POST | `dismiss_merge` | src/memorymap/api/routes_inbox.py:157 |
| `/merges/{undo_id}/undo` | POST | `undo_merge_route` | src/memorymap/api/routes_entities.py:227 |
| `/modes` | GET | `list_modes` | src/memorymap/api/routes_chat.py:3025 |
| `/most-accessed` | GET | `most_accessed` | src/memorymap/api/routes_entries.py:2396 |
| `/most-opened` | GET | `most_opened` | src/memorymap/api/routes_vision.py:112 |
| `/move` | POST | `move_notes` | src/memorymap/api/routes_categories.py:171 |
| `/near/{entry_id}` | GET | `near` | src/memorymap/api/routes_resurface.py:145 |
| `/nodes` | POST | `create_node` | src/memorymap/api/routes_whiteboard.py:2825 |
| `/nodes/{node_id}` | DELETE | `delete_node` | src/memorymap/api/routes_whiteboard.py:2902 |
| `/nodes/{node_id}` | PUT | `update_node` | src/memorymap/api/routes_whiteboard.py:2870 |
| `/note-types` | GET | `list_note_types` | src/memorymap/api/routes_properties.py:133 |
| `/note-types` | POST | `create_note_type` | src/memorymap/api/routes_properties.py:145 |
| `/note-types/{type_id}` | DELETE | `delete_note_type` | src/memorymap/api/routes_properties.py:189 |
| `/note-types/{type_id}` | PATCH | `patch_note_type` | src/memorymap/api/routes_properties.py:167 |
| `/objects` | POST | `create_object` | src/memorymap/api/routes_whiteboard.py:3007 |
| `/objects/{object_id}` | DELETE | `delete_object` | src/memorymap/api/routes_whiteboard.py:3085 |
| `/objects/{object_id}` | PUT | `update_object` | src/memorymap/api/routes_whiteboard.py:3051 |
| `/ocr-model` | POST | `set_ocr_model` | src/memorymap/api/routes_models.py:750 |
| `/ocr-readers` | GET | `ocr_readers` | src/memorymap/api/routes_files.py:3205 |
| `/ocr/language` | POST | `set_ocr_language` | src/memorymap/api/routes_files.py:3254 |
| `/on-this-day` | GET | `on_this_day` | src/memorymap/api/routes_insights.py:464 |
| `/openapi.json` | GET | `openapi_schema` | src/memorymap/api/app.py:1351 |
| `/outline` | GET | `documents_outline` | src/memorymap/api/routes_documents.py:438 |
| `/parse` | POST | `magic_add_reminder` | src/memorymap/api/routes_reminders.py:529 |
| `/password-on-open` | POST | `set_password_on_open` | src/memorymap/api/routes_auth.py:891 |
| `/patterns` | GET | `patterns` | src/memorymap/api/routes_insights.py:404 |
| `/personas/suggest-thinking-words` | POST | `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:189 |
| `/preferences` | GET | `get_preferences` | src/memorymap/api/routes_settings.py:723 |
| `/preferences` | PUT | `update_preferences` | src/memorymap/api/routes_settings.py:983 |
| `/preferences/defaults` | GET | `get_preference_defaults` | src/memorymap/api/routes_settings.py:1052 |
| `/preferences/export` | GET | `export_preferences` | src/memorymap/api/routes_settings.py:1091 |
| `/preferences/import` | POST | `import_preferences` | src/memorymap/api/routes_settings.py:1104 |
| `/preview` | POST | `preview_merge` | src/memorymap/api/routes_duplicates.py:116 |
| `/provider` | POST | `set_provider` | src/memorymap/api/routes_models.py:838 |
| `/pull` | POST | `pull_model` | src/memorymap/api/routes_models.py:1042 |
| `/query` | GET | `query_entries` | src/memorymap/api/routes_entries.py:1624 |
| `/read` | GET | `read_text` | src/memorymap/api/routes_read.py:36 |
| `/read` | POST | `read` | src/memorymap/api/routes_editor.py:34 |
| `/read/acts` | GET | `act_rows` | src/memorymap/api/routes_read.py:151 |
| `/read/board` | GET | `board_act` | src/memorymap/api/routes_read.py:76 |
| `/read/dates` | POST | `date_chips` | src/memorymap/api/routes_read.py:91 |
| `/read/filter` | GET | `phrase_filter` | src/memorymap/api/routes_read.py:99 |
| `/read/near` | POST | `near_rows` | src/memorymap/api/routes_read.py:132 |
| `/read/offers` | POST | `note_offers` | src/memorymap/api/routes_read.py:64 |
| `/read/words` | GET | `setting_words` | src/memorymap/api/routes_read.py:117 |
| `/reading-bin/{bin_id}/purge` | DELETE | `purge_binned_reading` | src/memorymap/api/routes_files.py:3828 |
| `/reading-bin/{bin_id}/restore` | POST | `restore_binned_reading` | src/memorymap/api/routes_files.py:3810 |
| `/receipt` | GET | `receipt` | src/memorymap/api/routes_privacy.py:95 |
| `/recent` | DELETE | `forget_recent_question` | src/memorymap/api/routes_chat.py:171 |
| `/recent` | GET | `recent_questions` | src/memorymap/api/routes_chat.py:165 |
| `/recordings` | GET | `list_recordings` | src/memorymap/api/routes_recordings.py:86 |
| `/recordings` | POST | `create_recording` | src/memorymap/api/routes_recordings.py:116 |
| `/recordings/recover` | POST | `recover_recordings` | src/memorymap/api/routes_recordings.py:108 |
| `/recordings/{recording_id}` | DELETE | `bin_recording` | src/memorymap/api/routes_recordings.py:206 |
| `/recordings/{recording_id}` | GET | `read_recording` | src/memorymap/api/routes_recordings.py:186 |
| `/recordings/{recording_id}` | PATCH | `update_recording` | src/memorymap/api/routes_recordings.py:191 |
| `/recordings/{recording_id}/chunk` | POST | `append_chunk` | src/memorymap/api/routes_recordings.py:140 |
| `/recordings/{recording_id}/finish` | POST | `finish_recording` | src/memorymap/api/routes_recordings.py:168 |
| `/recordings/{recording_id}/purge` | POST | `purge_recording` | src/memorymap/api/routes_recordings.py:225 |
| `/recordings/{recording_id}/restore` | POST | `restore_recording` | src/memorymap/api/routes_recordings.py:216 |
| `/recordings/{recording_id}/speakers` | POST | `name_speakers` | src/memorymap/api/routes_recordings.py:391 |
| `/recordings/{recording_id}/transcribe` | POST | `transcribe_recording` | src/memorymap/api/routes_recordings.py:236 |
| `/recordings/{recording_id}/transcribe/start` | POST | `start_transcription` | src/memorymap/api/routes_recordings.py:268 |
| `/recordings/{recording_id}/transcribe/stop` | POST | `stop_transcription` | src/memorymap/api/routes_recordings.py:295 |
| `/recordings/{recording_id}/transcript` | GET | `read_transcript` | src/memorymap/api/routes_recordings.py:383 |
| `/recordings/{recording_id}/transcript.srt` | GET | `transcript_srt` | src/memorymap/api/routes_recordings.py:416 |
| `/recordings/{recording_id}/transcript.vtt` | GET | `transcript_vtt` | src/memorymap/api/routes_recordings.py:421 |
| `/recover` | POST | `recover` | src/memorymap/api/routes_auth.py:1614 |
| `/recovery-key` | POST | `make_recovery_key` | src/memorymap/api/routes_auth.py:1537 |
| `/recovery-key/save` | POST | `save_recovery_key` | src/memorymap/api/routes_auth.py:1584 |
| `/recycle-bin/empty` | POST | `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1862 |
| `/reference-counts` | GET | `entry_reference_counts` | src/memorymap/api/routes_entries.py:2428 |
| `/reindex` | POST | `rebuild_search_index` | src/memorymap/api/routes_models.py:968 |
| `/releases` | GET | `list_releases` | src/memorymap/api/routes_update.py:557 |
| `/rename` | POST | `rename_tag` | src/memorymap/api/routes_tags.py:76 |
| `/reset` | POST | `reset` | src/memorymap/api/routes_auth.py:1667 |
| `/restore` | POST | `restore_conversation` | src/memorymap/api/routes_conversations.py:960 |
| `/restore` | POST | `restore_tags` | src/memorymap/api/routes_tags.py:110 |
| `/review-queue` | GET | `review_queue` | src/memorymap/api/routes_vision.py:83 |
| `/review-queue/{entry_id}/accept` | POST | `accept_filing` | src/memorymap/api/routes_vision.py:94 |
| `/rotate-vault-key` | POST | `rotate_vault_key` | src/memorymap/api/routes_auth.py:1334 |
| `/run` | POST | `run_now` | src/memorymap/api/routes_night.py:50 |
| `/runs/{run_id}/facts` | GET | `run_facts` | src/memorymap/api/routes_night.py:92 |
| `/sample-notebook` | DELETE | `remove_sample_notebook` | src/memorymap/api/routes_help.py:149 |
| `/sample-notebook` | GET | `sample_notebook_state` | src/memorymap/api/routes_help.py:118 |
| `/sample-notebook` | POST | `add_sample_notebook` | src/memorymap/api/routes_help.py:127 |
| `/sampling` | GET | `sampling_settings` | src/memorymap/api/routes_models.py:547 |
| `/sampling` | PUT | `save_sampling_settings` | src/memorymap/api/routes_models.py:595 |
| `/seed-examples` | POST | `seed_example_entries` | src/memorymap/api/routes_entries.py:2413 |
| `/setup` | POST | `setup` | src/memorymap/api/routes_auth.py:627 |
| `/shutdown` | POST | `shutdown` | src/memorymap/api/routes_tasks.py:786 |
| `/sketches` | POST | `create_sketch` | src/memorymap/api/routes_whiteboard.py:2923 |
| `/sketches/{sketch_id}` | DELETE | `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2978 |
| `/sketches/{sketch_id}` | PUT | `update_sketch` | src/memorymap/api/routes_whiteboard.py:2953 |
| `/skills` | GET | `list_skills` | src/memorymap/api/routes_settings.py:1324 |
| `/source-status` | GET | `source_update_status` | src/memorymap/api/routes_update.py:628 |
| `/spaces` | GET | `get_spaces` | src/memorymap/api/routes_spaces.py:66 |
| `/spaces` | POST | `create_space` | src/memorymap/api/routes_spaces.py:71 |
| `/spaces/restore` | POST | `restore_space` | src/memorymap/api/routes_spaces.py:182 |
| `/spaces/{space_id}` | DELETE | `delete_space` | src/memorymap/api/routes_spaces.py:274 |
| `/spaces/{space_id}` | PUT | `update_space` | src/memorymap/api/routes_spaces.py:84 |
| `/spaces/{space_id}/move-notes` | POST | `move_notes_to_space` | src/memorymap/api/routes_spaces.py:462 |
| `/spec` | GET | `model_spec` | src/memorymap/api/routes_models.py:507 |
| `/start` | POST | `start` | src/memorymap/api/routes_captions.py:49 |
| `/statistics` | GET | `statistics` | src/memorymap/api/routes_statistics.py:24 |
| `/stats` | GET | `ask_history_stats` | src/memorymap/api/routes_ask_history.py:83 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_insights.py:33 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_search.py:144 |
| `/status` | GET | `status` | src/memorymap/api/routes_auth.py:603 |
| `/status` | GET | `status` | src/memorymap/api/routes_models.py:322 |
| `/status` | GET | `status` | src/memorymap/api/routes_translate.py:22 |
| `/status` | GET | `status` | src/memorymap/api/routes_voice.py:30 |
| `/stop` | POST | `stop` | src/memorymap/api/routes_bench.py:245 |
| `/storage` | GET | `storage_location` | src/memorymap/api/routes_backups.py:43 |
| `/stream` | POST | `chat_stream` | src/memorymap/api/routes_chat.py:2917 |
| `/suggest-tags` | POST | `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1277 |
| `/suggested` | GET | `suggested` | src/memorymap/api/routes_models.py:609 |
| `/suggestions` | GET | `suggestions` | src/memorymap/api/routes_chat.py:244 |
| `/summarize` | POST | `summarize` | src/memorymap/api/routes_voice.py:118 |
| `/summary` | GET | `learned_summary` | src/memorymap/api/routes_learned.py:189 |
| `/summary` | GET | `summary` | src/memorymap/api/routes_questions.py:53 |
| `/summary` | POST | `summary` | src/memorymap/api/routes_usage.py:35 |
| `/support-bundle` | GET | `support_bundle` | src/memorymap/api/routes_settings.py:2350 |
| `/switches` | GET | `get_switches` | src/memorymap/api/routes_learned.py:197 |
| `/switches` | PUT | `put_switches` | src/memorymap/api/routes_learned.py:203 |
| `/system/clear-static-cache` | POST | `system_clear_static_cache` | src/memorymap/api/app.py:1361 |
| `/system/console-mode` | POST | `set_console_mode` | src/memorymap/api/routes_settings.py:1156 |
| `/system/restart` | POST | `restart_app` | src/memorymap/api/routes_settings.py:1225 |
| `/tag-cloud` | GET | `tag_cloud` | src/memorymap/api/routes_insights.py:453 |
| `/tasks` | GET | `list_tasks` | src/memorymap/api/routes_tasks.py:510 |
| `/tasks/autonomous/last` | GET | `last_autonomous_pass` | src/memorymap/api/routes_tasks.py:721 |
| `/tasks/autonomous/last/clear` | POST | `clear_last_autonomous_pass` | src/memorymap/api/routes_tasks.py:738 |
| `/tasks/cancel` | POST | `cancel_task` | src/memorymap/api/routes_tasks.py:645 |
| `/tasks/history/clear` | POST | `clear_history` | src/memorymap/api/routes_tasks.py:747 |
| `/tasks/trigger-autonomous` | POST | `trigger_autonomous` | src/memorymap/api/routes_tasks.py:684 |
| `/templates/draft` | POST | `draft_template` | src/memorymap/api/routes_settings.py:216 |
| `/tensions` | GET | `find_tensions` | src/memorymap/api/routes_entries.py:1827 |
| `/tensions/accept` | POST | `accept_tension` | src/memorymap/api/routes_entries.py:1979 |
| `/tensions/dismiss` | POST | `dismiss_tension` | src/memorymap/api/routes_entries.py:2003 |
| `/tensions/known` | GET | `known_tensions` | src/memorymap/api/routes_entries.py:1923 |
| `/tidy-proposals` | GET | `tidy_proposals` | src/memorymap/api/routes_vision.py:195 |
| `/tidy-proposals/dismiss` | POST | `dismiss_tidy` | src/memorymap/api/routes_vision.py:249 |
| `/title` | POST | `draft_title` | src/memorymap/api/routes_drafts.py:147 |
| `/tools` | GET | `list_tools` | src/memorymap/api/routes_chat.py:3046 |
| `/tools/execute` | POST | `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:3128 |
| `/topics` | GET | `topics` | src/memorymap/api/routes_help.py:57 |
| `/transcribe` | POST | `transcribe` | src/memorymap/api/routes_voice.py:94 |
| `/transcribe-meeting` | POST | `transcribe_meeting` | src/memorymap/api/routes_voice.py:101 |
| `/turned-down` | GET | `list_turned_down` | src/memorymap/api/routes_tags.py:120 |
| `/turned-down/offer-again` | POST | `offer_tag_again` | src/memorymap/api/routes_tags.py:143 |
| `/types/accept` | POST | `accept_type` | src/memorymap/api/routes_inbox.py:169 |
| `/types/dismiss` | POST | `dismiss_type` | src/memorymap/api/routes_inbox.py:186 |
| `/undo/{undo_id}` | POST | `tidy_undo` | src/memorymap/api/routes_tidy.py:70 |
| `/unlock` | POST | `unlock` | src/memorymap/api/routes_auth.py:723 |
| `/unlock-vault` | POST | `unlock_vault` | src/memorymap/api/routes_auth.py:842 |
| `/utility-model` | POST | `set_utility_model` | src/memorymap/api/routes_models.py:715 |
| `/vision-model` | POST | `set_vision_model` | src/memorymap/api/routes_models.py:733 |
| `/warm` | POST | `warm` | src/memorymap/api/routes_search.py:35 |
| `/warm-filing` | POST | `warm_filing` | src/memorymap/api/routes_models.py:266 |
| `/websearch` | GET | `web_search` | src/memorymap/api/routes_websearch.py:54 |
| `/websearch/detect-searxng` | POST | `detect_searxng` | src/memorymap/api/routes_websearch.py:94 |
| `/websearch/providers` | GET | `web_search_providers` | src/memorymap/api/routes_websearch.py:37 |
| `/websearch/read` | GET | `web_read` | src/memorymap/api/routes_websearch.py:218 |
| `/websearch/searxng/reinstall` | POST | `searxng_reinstall` | src/memorymap/api/routes_websearch.py:168 |
| `/websearch/searxng/start` | POST | `searxng_start` | src/memorymap/api/routes_websearch.py:135 |
| `/websearch/searxng/status` | GET | `searxng_status` | src/memorymap/api/routes_websearch.py:121 |
| `/websearch/searxng/stop` | POST | `searxng_stop` | src/memorymap/api/routes_websearch.py:199 |
| `/when` | POST | `read_when` | src/memorymap/api/routes_reminders.py:510 |
| `/whiteboard/boards/{board_id}/place` | POST | `place_library_item` | src/memorymap/api/routes_board_library.py:983 |
| `/{bookmark_id}` | DELETE | `delete_bookmark` | src/memorymap/api/routes_bookmarks.py:183 |
| `/{bookmark_id}` | PUT | `update_bookmark` | src/memorymap/api/routes_bookmarks.py:162 |
| `/{category_id}` | DELETE | `delete_category` | src/memorymap/api/routes_categories.py:345 |
| `/{category_id}` | PUT | `rename_category` | src/memorymap/api/routes_categories.py:334 |
| `/{category_id}/colour` | PUT | `set_category_colour` | src/memorymap/api/routes_categories.py:323 |
| `/{category_id}/merge` | POST | `merge_category` | src/memorymap/api/routes_categories.py:179 |
| `/{category_id}/split` | POST | `split_category` | src/memorymap/api/routes_categories.py:193 |
| `/{category_id}/split/propose` | POST | `propose_split` | src/memorymap/api/routes_categories.py:275 |
| `/{conversation_id}` | DELETE | `delete_conversation` | src/memorymap/api/routes_conversations.py:937 |
| `/{conversation_id}` | GET | `get_conversation` | src/memorymap/api/routes_conversations.py:532 |
| `/{conversation_id}` | PUT | `rename_conversation` | src/memorymap/api/routes_conversations.py:909 |
| `/{conversation_id}/archive` | PUT | `archive_conversation` | src/memorymap/api/routes_conversations.py:390 |
| `/{conversation_id}/fork` | POST | `fork_conversation` | src/memorymap/api/routes_conversations.py:737 |
| `/{conversation_id}/pin` | PUT | `pin_conversation` | src/memorymap/api/routes_conversations.py:370 |
| `/{conversation_id}/retitle` | POST | `retitle_conversation` | src/memorymap/api/routes_conversations.py:571 |
| `/{conversation_id}/truncate` | POST | `truncate_conversation` | src/memorymap/api/routes_conversations.py:697 |
| `/{conversation_id}/turns` | POST | `append_turn` | src/memorymap/api/routes_conversations.py:542 |
| `/{conversation_id}/turns/last` | PUT | `replace_last_turn` | src/memorymap/api/routes_conversations.py:619 |
| `/{conversation_id}/turns/{index}` | DELETE | `delete_turn` | src/memorymap/api/routes_conversations.py:637 |
| `/{conversation_id}/turns/{index}/answer` | PUT | `edit_answer` | src/memorymap/api/routes_conversations.py:879 |
| `/{conversation_id}/turns/{index}/followups` | PUT | `set_turn_followups` | src/memorymap/api/routes_conversations.py:789 |
| `/{conversation_id}/turns/{index}/restore` | POST | `restore_turn` | src/memorymap/api/routes_conversations.py:671 |
| `/{conversation_id}/unarchive` | PUT | `unarchive_conversation` | src/memorymap/api/routes_conversations.py:413 |
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
| `/{entry_id}` | DELETE | `delete_entry` | src/memorymap/api/routes_entries.py:2719 |
| `/{entry_id}` | GET | `get_entry` | src/memorymap/api/routes_entries.py:2478 |
| `/{entry_id}` | PUT | `update_entry` | src/memorymap/api/routes_entries.py:2586 |
| `/{entry_id}/archive` | POST | `archive_entry` | src/memorymap/api/routes_entries.py:2747 |
| `/{entry_id}/backlinks` | GET | `entry_backlinks` | src/memorymap/api/routes_mentions.py:155 |
| `/{entry_id}/bookmarks` | GET | `entry_bookmarks` | src/memorymap/api/routes_entries.py:2179 |
| `/{entry_id}/bookmarks` | POST | `attach_bookmark` | src/memorymap/api/routes_entries.py:2200 |
| `/{entry_id}/bookmarks/{bookmark_id}` | DELETE | `detach_bookmark` | src/memorymap/api/routes_entries.py:2220 |
| `/{entry_id}/connections` | GET | `entry_connections` | src/memorymap/api/routes_entries.py:3492 |
| `/{entry_id}/context` | POST | `add_context` | src/memorymap/api/routes_entries.py:1366 |
| `/{entry_id}/export.md` | GET | `export_entry` | src/memorymap/api/routes_entries.py:2555 |
| `/{entry_id}/filing` | GET | `filing_status` | src/memorymap/api/routes_entries.py:1140 |
| `/{entry_id}/filing` | POST | `decide_filing` | src/memorymap/api/routes_entries.py:1090 |
| `/{entry_id}/filing/stop` | POST | `stop_filing_one` | src/memorymap/api/routes_entries.py:1071 |
| `/{entry_id}/generate-title` | POST | `generate_entry_title` | src/memorymap/api/routes_entries.py:3407 |
| `/{entry_id}/history` | GET | `entry_history` | src/memorymap/api/routes_entries.py:3210 |
| `/{entry_id}/history/{revision_id}/restore` | POST | `restore_revision` | src/memorymap/api/routes_entries.py:3356 |
| `/{entry_id}/links` | POST | `create_link` | src/memorymap/api/routes_entries.py:3710 |
| `/{entry_id}/links/{link_id}` | DELETE | `delete_link` | src/memorymap/api/routes_entries.py:3735 |
| `/{entry_id}/links/{link_id}` | PATCH | `patch_link` | src/memorymap/api/routes_entries.py:3747 |
| `/{entry_id}/links/{link_id}/generate-reason` | POST | `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3790 |
| `/{entry_id}/links/{link_id}/reason` | PUT | `update_link_reason` | src/memorymap/api/routes_entries.py:3769 |
| `/{entry_id}/mentions/link` | POST | `link_mention` | src/memorymap/api/routes_mentions.py:171 |
| `/{entry_id}/privacy` | POST | `set_entry_privacy` | src/memorymap/api/routes_entries.py:3381 |
| `/{entry_id}/purge` | DELETE | `purge_entry` | src/memorymap/api/routes_entries.py:2766 |
| `/{entry_id}/reevaluate` | POST | `reevaluate_entry` | src/memorymap/api/routes_entries.py:1449 |
| `/{entry_id}/references` | GET | `entry_references` | src/memorymap/api/routes_entries.py:3164 |
| `/{entry_id}/related` | GET | `related_entries` | src/memorymap/api/routes_entries.py:2144 |
| `/{entry_id}/remove-title` | POST | `remove_entry_title` | src/memorymap/api/routes_entries.py:3454 |
| `/{entry_id}/restore` | POST | `restore_entry` | src/memorymap/api/routes_entries.py:2739 |
| `/{entry_id}/restore/{event_id}` | POST | `restore_event` | src/memorymap/api/routes_entries.py:3292 |
| `/{entry_id}/suggested-tags` | POST | `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1341 |
| `/{entry_id}/then-and-now` | GET | `then_and_now` | src/memorymap/api/routes_entries.py:3172 |
| `/{entry_id}/then-and-now` | POST | `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3197 |
| `/{entry_id}/unarchive` | POST | `unarchive_entry` | src/memorymap/api/routes_entries.py:2758 |
| `/{entry_id}/wiki-rename` | POST | `wiki_rename` | src/memorymap/api/routes_entries.py:2707 |
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
| `/{reminder_id}` | DELETE | `delete_reminder` | src/memorymap/api/routes_reminders.py:712 |
| `/{reminder_id}` | PUT | `update_reminder` | src/memorymap/api/routes_reminders.py:603 |
| `/{reminder_id}/complete` | POST | `complete_reminder` | src/memorymap/api/routes_reminders.py:633 |
| `/{reminder_id}/export.ics` | GET | `export_one_ics` | src/memorymap/api/routes_reminders.py:365 |
| `/{reminder_id}/notification-token` | POST | `notification_token` | src/memorymap/api/routes_reminders.py:670 |
| `/{reminder_id}/purge` | DELETE | `purge_reminder` | src/memorymap/api/routes_reminders.py:743 |
| `/{reminder_id}/restore` | POST | `restore_reminder` | src/memorymap/api/routes_reminders.py:733 |
| `/{session_id}/audio` | POST | `audio` | src/memorymap/api/routes_captions.py:65 |
| `/{session_id}/stop` | POST | `stop` | src/memorymap/api/routes_captions.py:90 |
| `/{turn_id}` | DELETE | `delete_ask_turn` | src/memorymap/api/routes_ask_history.py:171 |
| `/{turn_id}` | GET | `get_ask_turn` | src/memorymap/api/routes_ask_history.py:91 |
| `/{turn_id}/pin` | PUT | `pin_ask_turn` | src/memorymap/api/routes_ask_history.py:163 |
| `PYODIDE_PATH + '{name}'` | GET | `pyodide_file` | src/memorymap/api/run_sandbox.py:1485 |

## Backend modules (4776)

Module-level `def`, `async def` and `class` in `src/memorymap/**/*.py`, excluding `vendor/`, grouped by file.

### src/memorymap/__main__.py (53)

| Name | File:line |
|---|---|
| `_ancestor_console_hwnds` | src/memorymap/__main__.py:1383 |
| `_apply_console_visibility` | src/memorymap/__main__.py:1514 |
| `_boot_and_swap` | src/memorymap/__main__.py:1049 |
| `_bootloader_splash` | src/memorymap/__main__.py:745 |
| `_bring_forward` | src/memorymap/__main__.py:1708 |
| `_capture` | src/memorymap/__main__.py:2637 |
| `_claim_notebook` | src/memorymap/__main__.py:1028 |
| `_close_bootloader_splash` | src/memorymap/__main__.py:783 |
| `_close_launch_splash` | src/memorymap/__main__.py:801 |
| `_console_window_targets` | src/memorymap/__main__.py:1499 |
| `_desktop_port` | src/memorymap/__main__.py:972 |
| `_ensure_std_streams` | src/memorymap/__main__.py:428 |
| `_existing_instance` | src/memorymap/__main__.py:1719 |
| `_export_markdown` | src/memorymap/__main__.py:2476 |
| `_finish_splash_start_step` | src/memorymap/__main__.py:830 |
| `_focus_window` | src/memorymap/__main__.py:1101 |
| `_get_console_hwnd` | src/memorymap/__main__.py:1133 |
| `_hand_off_to_running` | src/memorymap/__main__.py:1733 |
| `_loading_html` | src/memorymap/__main__.py:363 |
| `_mark_start_step_done` | src/memorymap/__main__.py:900 |
| `_maybe_relaunch_hidden` | src/memorymap/__main__.py:1344 |
| `_open_window_onto` | src/memorymap/__main__.py:1765 |
| `_password_exists` | src/memorymap/__main__.py:2515 |
| `_port_from_env` | src/memorymap/__main__.py:35 |
| `_port_holder` | src/memorymap/__main__.py:916 |
| `_push_status_to_window` | src/memorymap/__main__.py:883 |
| `_pythonw_path` | src/memorymap/__main__.py:1151 |
| `_recolour_loading_page` | src/memorymap/__main__.py:330 |
| `_relaunch_argv` | src/memorymap/__main__.py:1257 |
| `_repair_install` | src/memorymap/__main__.py:2598 |
| `_replace_process` | src/memorymap/__main__.py:1584 |
| `_reset_password` | src/memorymap/__main__.py:2528 |
| `_run_desktop` | src/memorymap/__main__.py:1792 |
| `_run_server` | src/memorymap/__main__.py:455 |
| `_run_server_holding_lock` | src/memorymap/__main__.py:2753 |
| `_serve_with_lan` | src/memorymap/__main__.py:539 |
| `_serves_this_notebook` | src/memorymap/__main__.py:955 |
| `_spawn_desktop` | src/memorymap/__main__.py:1162 |
| `_spawn_detached` | src/memorymap/__main__.py:1275 |
| `_splash_status` | src/memorymap/__main__.py:768 |
| `_start_reminder_notifier` | src/memorymap/__main__.py:2113 |
| `_start_tray` | src/memorymap/__main__.py:2143 |
| `_stop_background_work` | src/memorymap/__main__.py:1550 |
| `_stop_lingering_worker_threads` | src/memorymap/__main__.py:680 |
| `_wait_for_exit` | src/memorymap/__main__.py:1329 |
| `_wait_for_server` | src/memorymap/__main__.py:716 |
| `_wait_for_server_with_progress` | src/memorymap/__main__.py:1000 |
| `_warn_webview2_missing` | src/memorymap/__main__.py:1674 |
| `_webview2_runtime_missing` | src/memorymap/__main__.py:1610 |
| `_window_class_name` | src/memorymap/__main__.py:1483 |
| `main` | src/memorymap/__main__.py:2655 |
| `restart_app` | src/memorymap/__main__.py:1305 |
| `restart_in_console_mode` | src/memorymap/__main__.py:1234 |

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

### src/memorymap/ai/agent.py (53)

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
| `_count_call` | src/memorymap/ai/agent.py:2356 |
| `_dispatch_call` | src/memorymap/ai/agent.py:2528 |
| `_finish_handover` | src/memorymap/ai/agent.py:2306 |
| `_first_round_tools` | src/memorymap/ai/agent.py:2163 |
| `_fit_result` | src/memorymap/ai/agent.py:2033 |
| `_focus` | src/memorymap/ai/agent.py:1635 |
| `_handoff_refused` | src/memorymap/ai/agent.py:2503 |
| `_hosts_named` | src/memorymap/ai/agent.py:1307 |
| `_labelled` | src/memorymap/ai/agent.py:246 |
| `_names_an_existing_category` | src/memorymap/ai/agent.py:2141 |
| `_one_option_ask` | src/memorymap/ai/agent.py:2491 |
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
| `_run_and_record` | src/memorymap/ai/agent.py:2363 |
| `_seen_ids` | src/memorymap/ai/agent.py:869 |
| `_tidied_arguments` | src/memorymap/ai/agent.py:2466 |
| `_tool_event` | src/memorymap/ai/agent.py:2223 |
| `_tool_events` | src/memorymap/ai/agent.py:2288 |
| `_tool_sources` | src/memorymap/ai/agent.py:916 |
| `_touched_items` | src/memorymap/ai/agent.py:806 |
| `_touched_kind` | src/memorymap/ai/agent.py:788 |
| `_wrap_up_round` | src/memorymap/ai/agent.py:2806 |
| `announces_unacted_tool` | src/memorymap/ai/agent.py:297 |
| `build_agent_messages` | src/memorymap/ai/agent.py:1346 |
| `plan_now` | src/memorymap/ai/agent.py:2333 |
| `run_agent` | src/memorymap/ai/agent.py:2843 |
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
| `spoken` | src/memorymap/ai/arithmetic.py:108 |
| `sum_in` | src/memorymap/ai/arithmetic.py:90 |

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

### src/memorymap/ai/budget.py (6)

| Name | File:line |
|---|---|
| `RunBudget` | src/memorymap/ai/budget.py:97 |
| `_tighter` | src/memorymap/ai/budget.py:296 |
| `current` | src/memorymap/ai/budget.py:223 |
| `for_skill` | src/memorymap/ai/budget.py:303 |
| `from_settings` | src/memorymap/ai/budget.py:269 |
| `spending` | src/memorymap/ai/budget.py:233 |

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

### src/memorymap/ai/code_assist.py (5)

| Name | File:line |
|---|---|
| `_from_model` | src/memorymap/ai/code_assist.py:107 |
| `_from_tools` | src/memorymap/ai/code_assist.py:117 |
| `answer` | src/memorymap/ai/code_assist.py:128 |
| `build_messages` | src/memorymap/ai/code_assist.py:96 |
| `fenced_code` | src/memorymap/ai/code_assist.py:87 |

### src/memorymap/ai/commands.py (48)

| Name | File:line |
|---|---|
| `Command` | src/memorymap/ai/commands.py:527 |
| `__getattr__` | src/memorymap/ai/commands.py:59 |
| `_append` | src/memorymap/ai/commands.py:481 |
| `_attached` | src/memorymap/ai/commands.py:604 |
| `_bin_reminder` | src/memorymap/ai/commands.py:944 |
| `_cap` | src/memorymap/ai/commands.py:111 |
| `_card` | src/memorymap/ai/commands.py:660 |
| `_clip` | src/memorymap/ai/commands.py:886 |
| `_clock` | src/memorymap/ai/commands.py:695 |
| `_content_words` | src/memorymap/ai/commands.py:571 |
| `_delete` | src/memorymap/ai/commands.py:416 |
| `_drop_article` | src/memorymap/ai/commands.py:116 |
| `_existing_category` | src/memorymap/ai/commands.py:624 |
| `_find` | src/memorymap/ai/commands.py:339 |
| `_fold` | src/memorymap/ai/commands.py:89 |
| `_link` | src/memorymap/ai/commands.py:452 |
| `_meeting` | src/memorymap/ai/commands.py:367 |
| `_move` | src/memorymap/ai/commands.py:272 |
| `_navigate` | src/memorymap/ai/commands.py:390 |
| `_new_note` | src/memorymap/ai/commands.py:305 |
| `_note_topic` | src/memorymap/ai/commands.py:332 |
| `_notes_about` | src/memorymap/ai/commands.py:578 |
| `_one_target` | src/memorymap/ai/commands.py:402 |
| `_pin` | src/memorymap/ai/commands.py:428 |
| `_plan_one` | src/memorymap/ai/commands.py:845 |
| `_plan_read` | src/memorymap/ai/commands.py:890 |
| `_reminder` | src/memorymap/ai/commands.py:191 |
| `_reminder_note` | src/memorymap/ai/commands.py:723 |
| `_rename` | src/memorymap/ai/commands.py:466 |
| `_resolve_one` | src/memorymap/ai/commands.py:825 |
| `_split_allowed` | src/memorymap/ai/commands.py:634 |
| `_split_last` | src/memorymap/ai/commands.py:124 |
| `_start_meeting` | src/memorymap/ai/commands.py:929 |
| `_summarise` | src/memorymap/ai/commands.py:496 |
| `_tag` | src/memorymap/ai/commands.py:239 |
| `_tags` | src/memorymap/ai/commands.py:172 |
| `_target` | src/memorymap/ai/commands.py:146 |
| `_title` | src/memorymap/ai/commands.py:615 |
| `_untag` | src/memorymap/ai/commands.py:437 |
| `_when_words` | src/memorymap/ai/commands.py:691 |
| `_which` | src/memorymap/ai/commands.py:647 |
| `not_done` | src/memorymap/ai/commands.py:674 |
| `parse` | src/memorymap/ai/commands.py:539 |
| `plan` | src/memorymap/ai/commands.py:736 |
| `read` | src/memorymap/ai/commands.py:506 |
| `reminder_when` | src/memorymap/ai/commands.py:704 |
| `run` | src/memorymap/ai/commands.py:951 |
| `summarise_done` | src/memorymap/ai/commands.py:682 |

### src/memorymap/ai/composer.py (130)

| Name | File:line |
|---|---|
| `Dialogue` | src/memorymap/ai/composer.py:2705 |
| `FollowOn` | src/memorymap/ai/composer.py:2523 |
| `NoteView` | src/memorymap/ai/composer.py:704 |
| `Plan` | src/memorymap/ai/composer.py:3186 |
| `Sentence` | src/memorymap/ai/composer.py:678 |
| `_Answer` | src/memorymap/ai/composer.py:1281 |
| `_Meaning` | src/memorymap/ai/composer.py:1172 |
| `_WORDED_PHRASES` | src/memorymap/ai/composer.py:2766 |
| `_absent` | src/memorymap/ai/composer.py:3654 |
| `_acknowledged` | src/memorymap/ai/composer.py:3805 |
| `_alternatives` | src/memorymap/ai/composer.py:605 |
| `_answer_turn` | src/memorymap/ai/composer.py:3822 |
| `_as_typed` | src/memorymap/ai/composer.py:3664 |
| `_asked_span` | src/memorymap/ai/composer.py:2190 |
| `_body` | src/memorymap/ai/composer.py:2327 |
| `_brief_text` | src/memorymap/ai/composer.py:4101 |
| `_broad_pool` | src/memorymap/ai/composer.py:2306 |
| `_build_synonyms` | src/memorymap/ai/composer.py:596 |
| `_clarify` | src/memorymap/ai/composer.py:2844 |
| `_clusters` | src/memorymap/ai/composer.py:1927 |
| `_compare` | src/memorymap/ai/composer.py:2120 |
| `_compose` | src/memorymap/ai/composer.py:3831 |
| `_confirmed_lead` | src/memorymap/ai/composer.py:2224 |
| `_count_word` | src/memorymap/ai/composer.py:1535 |
| `_cue` | src/memorymap/ai/composer.py:1002 |
| `_did_you_mean` | src/memorymap/ai/composer.py:3646 |
| `_disagreement` | src/memorymap/ai/composer.py:2052 |
| `_disagreements` | src/memorymap/ai/composer.py:2060 |
| `_distinct_ids` | src/memorymap/ai/composer.py:891 |
| `_due` | src/memorymap/ai/composer.py:1521 |
| `_earlier` | src/memorymap/ai/composer.py:2032 |
| `_filtered` | src/memorymap/ai/composer.py:3629 |
| `_fit_terms` | src/memorymap/ai/composer.py:2904 |
| `_follow_one` | src/memorymap/ai/composer.py:2591 |
| `_fusable` | src/memorymap/ai/composer.py:1703 |
| `_help_answer` | src/memorymap/ai/composer.py:3258 |
| `_help_result` | src/memorymap/ai/composer.py:3765 |
| `_holds` | src/memorymap/ai/composer.py:610 |
| `_in_window` | src/memorymap/ai/composer.py:3351 |
| `_insight_close` | src/memorymap/ai/composer.py:2243 |
| `_insight_lead` | src/memorymap/ai/composer.py:2262 |
| `_insights_for` | src/memorymap/ai/composer.py:2203 |
| `_jaccard` | src/memorymap/ai/composer.py:1092 |
| `_joined` | src/memorymap/ai/composer.py:1721 |
| `_lead_block` | src/memorymap/ai/composer.py:1876 |
| `_list_block` | src/memorymap/ai/composer.py:1749 |
| `_list_sentence` | src/memorymap/ai/composer.py:1738 |
| `_lowered` | src/memorymap/ai/composer.py:1577 |
| `_mentions` | src/memorymap/ai/composer.py:2274 |
| `_missing` | src/memorymap/ai/composer.py:2089 |
| `_month` | src/memorymap/ai/composer.py:3425 |
| `_multi` | src/memorymap/ai/composer.py:2804 |
| `_named_notes` | src/memorymap/ai/composer.py:2537 |
| `_newest` | src/memorymap/ai/composer.py:2400 |
| `_next_questions` | src/memorymap/ai/composer.py:2428 |
| `_note_words` | src/memorymap/ai/composer.py:3797 |
| `_nothing` | src/memorymap/ai/composer.py:3670 |
| `_one_syllable_cvc` | src/memorymap/ai/composer.py:526 |
| `_opening` | src/memorymap/ai/composer.py:1811 |
| `_others` | src/memorymap/ai/composer.py:1951 |
| `_overview_answer` | src/memorymap/ai/composer.py:3392 |
| `_overview_bullets` | src/memorymap/ai/composer.py:3515 |
| `_overview_groups` | src/memorymap/ai/composer.py:3499 |
| `_overview_lead` | src/memorymap/ai/composer.py:3476 |
| `_overview_line` | src/memorymap/ai/composer.py:3531 |
| `_overview_links` | src/memorymap/ai/composer.py:3567 |
| `_overview_list` | src/memorymap/ai/composer.py:3552 |
| `_overview_name_chip` | src/memorymap/ai/composer.py:3593 |
| `_overview_next` | src/memorymap/ai/composer.py:3579 |
| `_overview_over_broad` | src/memorymap/ai/composer.py:3450 |
| `_overview_subject` | src/memorymap/ai/composer.py:3432 |
| `_overview_tag_chip` | src/memorymap/ai/composer.py:3605 |
| `_pick` | src/memorymap/ai/composer.py:1553 |
| `_picture_run` | src/memorymap/ai/composer.py:1675 |
| `_picture_said` | src/memorymap/ai/composer.py:1647 |
| `_picture_spans` | src/memorymap/ai/composer.py:850 |
| `_picture_units` | src/memorymap/ai/composer.py:868 |
| `_quoted_lines` | src/memorymap/ai/composer.py:1667 |
| `_quotes` | src/memorymap/ai/composer.py:1609 |
| `_raw` | src/memorymap/ai/composer.py:4001 |
| `_read_in_dialogue` | src/memorymap/ai/composer.py:3779 |
| `_readings` | src/memorymap/ai/composer.py:2883 |
| `_recall` | src/memorymap/ai/composer.py:3359 |
| `_recall_next` | src/memorymap/ai/composer.py:3617 |
| `_relation` | src/memorymap/ai/composer.py:1910 |
| `_respell` | src/memorymap/ai/composer.py:461 |
| `_result` | src/memorymap/ai/composer.py:3325 |
| `_said_before` | src/memorymap/ai/composer.py:1802 |
| `_said_insight` | src/memorymap/ai/composer.py:2217 |
| `_said_with_before` | src/memorymap/ai/composer.py:1641 |
| `_score` | src/memorymap/ai/composer.py:1024 |
| `_sentence_case` | src/memorymap/ai/composer.py:1713 |
| `_span` | src/memorymap/ai/composer.py:1858 |
| `_span_of` | src/memorymap/ai/composer.py:3463 |
| `_standing` | src/memorymap/ai/composer.py:2578 |
| `_stem` | src/memorymap/ai/composer.py:536 |
| `_subject_stems` | src/memorymap/ai/composer.py:3444 |
| `_summary` | src/memorymap/ai/composer.py:2293 |
| `_templates_in` | src/memorymap/ai/composer.py:2756 |
| `_time_phrase` | src/memorymap/ai/composer.py:3204 |
| `_timeline` | src/memorymap/ai/composer.py:2010 |
| `_title` | src/memorymap/ai/composer.py:784 |
| `_unit` | src/memorymap/ai/composer.py:802 |
| `_unlike_before` | src/memorymap/ai/composer.py:1795 |
| `_utility` | src/memorymap/ai/composer.py:3341 |
| `_was_said` | src/memorymap/ai/composer.py:1083 |
| `_with_context` | src/memorymap/ai/composer.py:1593 |
| `_without_length` | src/memorymap/ai/composer.py:2515 |
| `_words` | src/memorymap/ai/composer.py:619 |
| `_written` | src/memorymap/ai/composer.py:766 |
| `_yes_no_wrapped` | src/memorymap/ai/composer.py:490 |
| `brief` | src/memorymap/ai/composer.py:4007 |
| `centrality` | src/memorymap/ai/composer.py:1229 |
| `classify` | src/memorymap/ai/composer.py:495 |
| `compare_sides` | src/memorymap/ai/composer.py:663 |
| `compose` | src/memorymap/ai/composer.py:3695 |
| `disagree` | src/memorymap/ai/composer.py:1260 |
| `follow_on` | src/memorymap/ai/composer.py:2548 |
| `help_line` | src/memorymap/ai/composer.py:3291 |
| `length_wish` | src/memorymap/ai/composer.py:2176 |
| `phrase_options` | src/memorymap/ai/composer.py:320 |
| `plan` | src/memorymap/ai/composer.py:3209 |
| `read_note` | src/memorymap/ai/composer.py:912 |
| `rephrase` | src/memorymap/ai/composer.py:468 |
| `select` | src/memorymap/ai/composer.py:1097 |
| `social` | src/memorymap/ai/composer.py:3131 |
| `social_kind` | src/memorymap/ai/composer.py:3122 |
| `source_kind` | src/memorymap/ai/composer.py:904 |
| `split_parts` | src/memorymap/ai/composer.py:2787 |
| `subject_terms` | src/memorymap/ai/composer.py:626 |

### src/memorymap/ai/composer_ack.py (3)

| Name | File:line |
|---|---|
| `acknowledge` | src/memorymap/ai/composer_ack.py:60 |
| `last_used` | src/memorymap/ai/composer_ack.py:49 |
| `reading_of` | src/memorymap/ai/composer_ack.py:76 |

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
| `setting_words` | src/memorymap/ai/filters.py:232 |

### src/memorymap/ai/followups.py (3)

| Name | File:line |
|---|---|
| `_clean` | src/memorymap/ai/followups.py:101 |
| `parse_followups` | src/memorymap/ai/followups.py:124 |
| `suggest_followups` | src/memorymap/ai/followups.py:150 |

### src/memorymap/ai/greeting_compose.py (8)

| Name | File:line |
|---|---|
| `NotebookFacts` | src/memorymap/ai/greeting_compose.py:67 |
| `_context_phrases` | src/memorymap/ai/greeting_compose.py:83 |
| `_naive` | src/memorymap/ai/greeting_compose.py:122 |
| `_recent_category` | src/memorymap/ai/greeting_compose.py:139 |
| `_streak` | src/memorymap/ai/greeting_compose.py:129 |
| `compose` | src/memorymap/ai/greeting_compose.py:107 |
| `gather` | src/memorymap/ai/greeting_compose.py:159 |
| `slot_for` | src/memorymap/ai/greeting_compose.py:76 |

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

### src/memorymap/ai/help_chat.py (25)

| Name | File:line |
|---|---|
| `_act_of` | src/memorymap/ai/help_chat.py:2269 |
| `_edit_distance_at_most_one` | src/memorymap/ai/help_chat.py:2200 |
| `_guide_lead` | src/memorymap/ai/help_chat.py:2677 |
| `_guide_opening` | src/memorymap/ai/help_chat.py:2685 |
| `_help_sentences` | src/memorymap/ai/help_chat.py:2660 |
| `_keyword_pattern` | src/memorymap/ai/help_chat.py:2154 |
| `_matching_topics` | src/memorymap/ai/help_chat.py:2308 |
| `_meaning_topics` | src/memorymap/ai/help_chat.py:2388 |
| `_normalise_keys` | src/memorymap/ai/help_chat.py:2177 |
| `_place` | src/memorymap/ai/help_chat.py:2655 |
| `_prompt_for` | src/memorymap/ai/help_chat.py:2528 |
| `_reading_topics` | src/memorymap/ai/help_chat.py:2291 |
| `_second_sentence` | src/memorymap/ai/help_chat.py:2664 |
| `answer` | src/memorymap/ai/help_chat.py:2821 |
| `answer_stream` | src/memorymap/ai/help_chat.py:2759 |
| `badges_for` | src/memorymap/ai/help_chat.py:2476 |
| `composed_answer` | src/memorymap/ai/help_chat.py:2699 |
| `help_block_for` | src/memorymap/ai/help_chat.py:2885 |
| `help_listing` | src/memorymap/ai/help_chat.py:2447 |
| `offline_answer` | src/memorymap/ai/help_chat.py:2717 |
| `social_reply` | src/memorymap/ai/help_chat.py:2628 |
| `source_names` | src/memorymap/ai/help_chat.py:2443 |
| `system_answer` | src/memorymap/ai/help_chat.py:2425 |
| `topic_title` | src/memorymap/ai/help_chat.py:2411 |
| `topics_for` | src/memorymap/ai/help_chat.py:2490 |

### src/memorymap/ai/help_topics_more.py (1)

| Name | File:line |
|---|---|
| `_act_topic` | src/memorymap/ai/help_topics_more.py:2281 |

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

### src/memorymap/ai/learning.py (17)

| Name | File:line |
|---|---|
| `Correction` | src/memorymap/ai/learning.py:134 |
| `_as_correction` | src/memorymap/ai/learning.py:164 |
| `_live_dismissal_rows` | src/memorymap/ai/learning.py:280 |
| `_payload` | src/memorymap/ai/learning.py:151 |
| `_words` | src/memorymap/ai/learning.py:653 |
| `boosts` | src/memorymap/ai/learning.py:407 |
| `centroid_excluded` | src/memorymap/ai/learning.py:515 |
| `corrections` | src/memorymap/ai/learning.py:226 |
| `decayed` | src/memorymap/ai/learning.py:402 |
| `dismissal_counts` | src/memorymap/ai/learning.py:290 |
| `excluded_categories` | src/memorymap/ai/learning.py:546 |
| `filing_accuracy` | src/memorymap/ai/learning.py:342 |
| `filing_evidence` | src/memorymap/ai/learning.py:580 |
| `record` | src/memorymap/ai/learning.py:184 |
| `restore_dismissals` | src/memorymap/ai/learning.py:318 |
| `revive_dismissals` | src/memorymap/ai/learning.py:300 |
| `signal_weights` | src/memorymap/ai/learning.py:466 |

### src/memorymap/ai/lexical_filing.py (32)

| Name | File:line |
|---|---|
| `Candidate` | src/memorymap/ai/lexical_filing.py:374 |
| `Decision` | src/memorymap/ai/lexical_filing.py:406 |
| `LexicalMatch` | src/memorymap/ai/lexical_filing.py:139 |
| `Proposal` | src/memorymap/ai/lexical_filing.py:392 |
| `_Corpus` | src/memorymap/ai/lexical_filing.py:799 |
| `_Doc` | src/memorymap/ai/lexical_filing.py:767 |
| `_auto_file_sensitive` | src/memorymap/ai/lexical_filing.py:489 |
| `_category_aggregates` | src/memorymap/ai/lexical_filing.py:714 |
| `_corpus_for` | src/memorymap/ai/lexical_filing.py:971 |
| `_cosine` | src/memorymap/ai/lexical_filing.py:452 |
| `_make_doc` | src/memorymap/ai/lexical_filing.py:937 |
| `_name_words` | src/memorymap/ai/lexical_filing.py:462 |
| `_quote_list` | src/memorymap/ai/lexical_filing.py:421 |
| `_scope` | src/memorymap/ai/lexical_filing.py:1037 |
| `_scope_key` | src/memorymap/ai/lexical_filing.py:1049 |
| `_tag_words` | src/memorymap/ai/lexical_filing.py:933 |
| `_tags` | src/memorymap/ai/lexical_filing.py:148 |
| `_tally` | src/memorymap/ai/lexical_filing.py:252 |
| `_why_line` | src/memorymap/ai/lexical_filing.py:428 |
| `_with_proposal` | src/memorymap/ai/lexical_filing.py:684 |
| `category_profiles` | src/memorymap/ai/lexical_filing.py:614 |
| `category_support` | src/memorymap/ai/lexical_filing.py:170 |
| `clean` | src/memorymap/ai/lexical_filing.py:125 |
| `decide` | src/memorymap/ai/lexical_filing.py:499 |
| `forget_corpus` | src/memorymap/ai/lexical_filing.py:1055 |
| `holds_sensitive` | src/memorymap/ai/lexical_filing.py:467 |
| `lexical_category` | src/memorymap/ai/lexical_filing.py:156 |
| `personal_lexicon` | src/memorymap/ai/lexical_filing.py:650 |
| `suggest_categories` | src/memorymap/ai/lexical_filing.py:202 |
| `suggest_categories_explained` | src/memorymap/ai/lexical_filing.py:212 |
| `tokens` | src/memorymap/ai/lexical_filing.py:95 |
| `topic_overlap` | src/memorymap/ai/lexical_filing.py:640 |

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

### src/memorymap/ai/meaning.py (15)

| Name | File:line |
|---|---|
| `_add_word` | src/memorymap/ai/meaning.py:152 |
| `_at` | src/memorymap/ai/meaning.py:189 |
| `_group_of` | src/memorymap/ai/meaning.py:104 |
| `_take_phrases` | src/memorymap/ai/meaning.py:138 |
| `_text` | src/memorymap/ai/meaning.py:185 |
| `_vocabulary` | src/memorymap/ai/meaning.py:115 |
| `alts` | src/memorymap/ai/meaning.py:168 |
| `closeness` | src/memorymap/ai/meaning.py:207 |
| `fold_typo` | src/memorymap/ai/meaning.py:123 |
| `holds` | src/memorymap/ai/meaning.py:202 |
| `missing` | src/memorymap/ai/meaning.py:196 |
| `near` | src/memorymap/ai/meaning.py:222 |
| `stem` | src/memorymap/ai/meaning.py:95 |
| `table` | src/memorymap/ai/meaning.py:253 |
| `words_of` | src/memorymap/ai/meaning.py:89 |

### src/memorymap/ai/meeting_summary.py (9)

| Name | File:line |
|---|---|
| `_cite` | src/memorymap/ai/meeting_summary.py:99 |
| `_found` | src/memorymap/ai/meeting_summary.py:49 |
| `_norm` | src/memorymap/ai/meeting_summary.py:45 |
| `_one_line` | src/memorymap/ai/meeting_summary.py:54 |
| `_same_source` | src/memorymap/ai/meeting_summary.py:120 |
| `as_lines` | src/memorymap/ai/meeting_summary.py:108 |
| `merge` | src/memorymap/ai/meeting_summary.py:125 |
| `parse_reply` | src/memorymap/ai/meeting_summary.py:58 |
| `summarise` | src/memorymap/ai/meeting_summary.py:145 |

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

### src/memorymap/ai/needle_provider.py (14)

| Name | File:line |
|---|---|
| `NeedleProvider` | src/memorymap/ai/needle_provider.py:279 |
| `_Engine` | src/memorymap/ai/needle_provider.py:110 |
| `_cleaned_arguments` | src/memorymap/ai/needle_provider.py:232 |
| `_cleaned_calls` | src/memorymap/ai/needle_provider.py:216 |
| `_date_fact` | src/memorymap/ai/needle_provider.py:203 |
| `_folder` | src/memorymap/ai/needle_provider.py:99 |
| `_get_engine` | src/memorymap/ai/needle_provider.py:170 |
| `_load_library` | src/memorymap/ai/needle_provider.py:105 |
| `_said_by_one` | src/memorymap/ai/needle_provider.py:259 |
| `_said_by_tools` | src/memorymap/ai/needle_provider.py:245 |
| `_text` | src/memorymap/ai/needle_provider.py:192 |
| `library_name` | src/memorymap/ai/needle_provider.py:90 |
| `loaded` | src/memorymap/ai/needle_provider.py:181 |
| `reset_for_tests` | src/memorymap/ai/needle_provider.py:187 |

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

### src/memorymap/ai/question_noise.py (26)

| Name | File:line |
|---|---|
| `_at_asking_place` | src/memorymap/ai/question_noise.py:2220 |
| `_cosine` | src/memorymap/ai/question_noise.py:2271 |
| `_is_spelt` | src/memorymap/ai/question_noise.py:2168 |
| `_join_asking` | src/memorymap/ai/question_noise.py:2082 |
| `_repair_by_speller` | src/memorymap/ai/question_noise.py:2195 |
| `_repair_late_space` | src/memorymap/ai/question_noise.py:2117 |
| `_repair_misspelt` | src/memorymap/ai/question_noise.py:2174 |
| `_repair_slang` | src/memorymap/ai/question_noise.py:2137 |
| `_repair_token` | src/memorymap/ai/question_noise.py:2091 |
| `_report_alternative` | src/memorymap/ai/question_noise.py:2145 |
| `_speller_may_read` | src/memorymap/ai/question_noise.py:2162 |
| `_split` | src/memorymap/ai/question_noise.py:2047 |
| `_strip_stray_tail` | src/memorymap/ai/question_noise.py:418 |
| `_trigrams` | src/memorymap/ai/question_noise.py:2266 |
| `_vector_cosine` | src/memorymap/ai/question_noise.py:2282 |
| `_word_core` | src/memorymap/ai/question_noise.py:2155 |
| `allowance` | src/memorymap/ai/question_noise.py:1985 |
| `alternative` | src/memorymap/ai/question_noise.py:2032 |
| `guess_kind` | src/memorymap/ai/question_noise.py:2289 |
| `nearest` | src/memorymap/ai/question_noise.py:2003 |
| `repair` | src/memorymap/ai/question_noise.py:2064 |
| `social_kind` | src/memorymap/ai/question_noise.py:1901 |
| `strip_strays` | src/memorymap/ai/question_noise.py:439 |
| `strip_symbols` | src/memorymap/ai/question_noise.py:460 |
| `tidy` | src/memorymap/ai/question_noise.py:446 |
| `topic_of` | src/memorymap/ai/question_noise.py:477 |

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
| `_follow_pronoun` | src/memorymap/ai/reading.py:452 |
| `_follow_same` | src/memorymap/ai/reading.py:461 |
| `_known` | src/memorymap/ai/reading.py:126 |
| `_plain` | src/memorymap/ai/reading.py:114 |
| `_redate` | src/memorymap/ai/reading.py:478 |
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

### src/memorymap/ai/realise.py (39)

| Name | File:line |
|---|---|
| `_case_like` | src/memorymap/ai/realise.py:87 |
| `_cell` | src/memorymap/ai/realise.py:347 |
| `_first_five` | src/memorymap/ai/realise.py:426 |
| `_named` | src/memorymap/ai/realise.py:395 |
| `_rows_form` | src/memorymap/ai/realise.py:333 |
| `_say_count` | src/memorymap/ai/realise.py:420 |
| `_say_found` | src/memorymap/ai/realise.py:479 |
| `_say_listed` | src/memorymap/ai/realise.py:453 |
| `_say_named` | src/memorymap/ai/realise.py:411 |
| `_say_overview` | src/memorymap/ai/realise.py:430 |
| `_say_reminders` | src/memorymap/ai/realise.py:442 |
| `_say_structure` | src/memorymap/ai/realise.py:436 |
| `_say_time` | src/memorymap/ai/realise.py:495 |
| `_say_worked` | src/memorymap/ai/realise.py:500 |
| `_shift_part` | src/memorymap/ai/realise.py:114 |
| `_shift_words` | src/memorymap/ai/realise.py:107 |
| `_title_and_line` | src/memorymap/ai/realise.py:469 |
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
| `tool_answer` | src/memorymap/ai/realise.py:514 |
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

### src/memorymap/ai/skill_runner.py (31)

| Name | File:line |
|---|---|
| `Verification` | src/memorymap/ai/skill_runner.py:160 |
| `_RunSetup` | src/memorymap/ai/skill_runner.py:808 |
| `_RunState` | src/memorymap/ai/skill_runner.py:837 |
| `_absorb` | src/memorymap/ai/skill_runner.py:451 |
| `_absorb_change` | src/memorymap/ai/skill_runner.py:505 |
| `_announce_early` | src/memorymap/ai/skill_runner.py:687 |
| `_collect` | src/memorymap/ai/skill_runner.py:1625 |
| `_contract_met` | src/memorymap/ai/skill_runner.py:561 |
| `_count_step` | src/memorymap/ai/skill_runner.py:871 |
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
| `_run_one_step` | src/memorymap/ai/skill_runner.py:882 |
| `_run_skill` | src/memorymap/ai/skill_runner.py:1313 |
| `_step_answer` | src/memorymap/ai/skill_runner.py:99 |
| `_step_tools` | src/memorymap/ai/skill_runner.py:710 |
| `_tag_arguments` | src/memorymap/ai/skill_runner.py:432 |
| `_touched_clause` | src/memorymap/ai/skill_runner.py:88 |
| `_touched_ids` | src/memorymap/ai/skill_runner.py:84 |
| `_undo_span` | src/memorymap/ai/skill_runner.py:779 |
| `_unmet_reason` | src/memorymap/ai/skill_runner.py:372 |
| `_usage` | src/memorymap/ai/skill_runner.py:878 |
| `run_skill` | src/memorymap/ai/skill_runner.py:727 |
| `verify` | src/memorymap/ai/skill_runner.py:249 |

### src/memorymap/ai/skills.py (30)

| Name | File:line |
|---|---|
| `SkillError` | src/memorymap/ai/skills.py:170 |
| `_checked_folder_skill` | src/memorymap/ai/skills.py:1825 |
| `_declared_blocks` | src/memorymap/ai/skills.py:602 |
| `_one_step_spec` | src/memorymap/ai/skills.py:227 |
| `_step` | src/memorymap/ai/skills.py:873 |
| `_step_specs` | src/memorymap/ai/skills.py:189 |
| `_text` | src/memorymap/ai/skills.py:182 |
| `_verify_args` | src/memorymap/ai/skills.py:334 |
| `ad_hoc_plan` | src/memorymap/ai/skills.py:642 |
| `budget_caps` | src/memorymap/ai/skills.py:615 |
| `builtins` | src/memorymap/ai/skills.py:1788 |
| `catalog` | src/memorymap/ai/skills.py:1800 |
| `contract_nudge` | src/memorymap/ai/skills.py:402 |
| `fill` | src/memorymap/ai/skills.py:677 |
| `find` | src/memorymap/ai/skills.py:1863 |
| `folder_skills` | src/memorymap/ai/skills.py:1833 |
| `held_back_reason` | src/memorymap/ai/skills.py:1779 |
| `input_values` | src/memorymap/ai/skills.py:704 |
| `is_action` | src/memorymap/ai/skills.py:637 |
| `larger_model_reason` | src/memorymap/ai/skills.py:1746 |
| `measured_rates` | src/memorymap/ai/skills.py:1737 |
| `missing_inputs` | src/memorymap/ai/skills.py:693 |
| `normalise` | src/memorymap/ai/skills.py:492 |
| `run_instruction` | src/memorymap/ai/skills.py:715 |
| `small_class` | src/memorymap/ai/skills.py:1763 |
| `state_line` | src/memorymap/ai/skills.py:456 |
| `step_instruction` | src/memorymap/ai/skills.py:762 |
| `step_specs` | src/memorymap/ai/skills.py:377 |
| `stored` | src/memorymap/ai/skills.py:1795 |
| `verify_spec` | src/memorymap/ai/skills.py:269 |

### src/memorymap/ai/source_check.py (5)

| Name | File:line |
|---|---|
| `Sources` | src/memorymap/ai/source_check.py:72 |
| `_number_key` | src/memorymap/ai/source_check.py:66 |
| `heads_up` | src/memorymap/ai/source_check.py:153 |
| `sources_from_messages` | src/memorymap/ai/source_check.py:102 |
| `unbacked_claims` | src/memorymap/ai/source_check.py:114 |

### src/memorymap/ai/speakers.py (3)

| Name | File:line |
|---|---|
| `_prompt` | src/memorymap/ai/speakers.py:37 |
| `label` | src/memorymap/ai/speakers.py:66 |
| `parse_names` | src/memorymap/ai/speakers.py:51 |

### src/memorymap/ai/spelling.py (35)

| Name | File:line |
|---|---|
| `_accept` | src/memorymap/ai/spelling.py:261 |
| `_app_counts` | src/memorymap/ai/spelling.py:125 |
| `_candidates` | src/memorymap/ai/spelling.py:283 |
| `_dictionary` | src/memorymap/ai/spelling.py:141 |
| `_ending_fits` | src/memorymap/ai/spelling.py:314 |
| `_fix` | src/memorymap/ai/spelling.py:352 |
| `_fix_short` | src/memorymap/ai/spelling.py:450 |
| `_fixed_phrase` | src/memorymap/ai/spelling.py:469 |
| `_gap_cost` | src/memorymap/ai/spelling.py:618 |
| `_hidden_small` | src/memorymap/ai/spelling.py:393 |
| `_index` | src/memorymap/ai/spelling.py:177 |
| `_is_word` | src/memorymap/ai/spelling.py:231 |
| `_joined_or_cut` | src/memorymap/ai/spelling.py:518 |
| `_limit` | src/memorymap/ai/spelling.py:93 |
| `_mask` | src/memorymap/ai/spelling.py:169 |
| `_one_off` | src/memorymap/ai/spelling.py:377 |
| `_own` | src/memorymap/ai/spelling.py:300 |
| `_reading_row` | src/memorymap/ai/spelling.py:326 |
| `_readings` | src/memorymap/ai/spelling.py:209 |
| `_rebuild` | src/memorymap/ai/spelling.py:240 |
| `_recognised` | src/memorymap/ai/spelling.py:161 |
| `_resegment` | src/memorymap/ai/spelling.py:501 |
| `_same_shape` | src/memorymap/ai/spelling.py:408 |
| `_short_candidates` | src/memorymap/ai/spelling.py:433 |
| `_stems` | src/memorymap/ai/spelling.py:186 |
| `_sub_cost` | src/memorymap/ai/spelling.py:609 |
| `_two_letter_reading` | src/memorymap/ai/spelling.py:414 |
| `_vowel_slip` | src/memorymap/ai/spelling.py:253 |
| `distance` | src/memorymap/ai/spelling.py:623 |
| `drop_stray` | src/memorymap/ai/spelling.py:562 |
| `fix` | src/memorymap/ai/spelling.py:483 |
| `is_word` | src/memorymap/ai/spelling.py:219 |
| `rejoin` | src/memorymap/ai/spelling.py:533 |
| `set_topic_source` | src/memorymap/ai/spelling.py:115 |
| `split_run_on` | src/memorymap/ai/spelling.py:577 |

### src/memorymap/ai/starter_acts.py (25)

| Name | File:line |
|---|---|
| `_append_today` | src/memorymap/ai/starter_acts.py:335 |
| `_best_pairs` | src/memorymap/ai/starter_acts.py:293 |
| `_changed` | src/memorymap/ai/starter_acts.py:115 |
| `_conversation` | src/memorymap/ai/starter_acts.py:145 |
| `_digest_lines` | src/memorymap/ai/starter_acts.py:106 |
| `_due` | src/memorymap/ai/starter_acts.py:129 |
| `_link_related` | src/memorymap/ai/starter_acts.py:315 |
| `_linked` | src/memorymap/ai/starter_acts.py:289 |
| `_list_answer` | src/memorymap/ai/starter_acts.py:111 |
| `_listed` | src/memorymap/ai/starter_acts.py:218 |
| `_loose_ends` | src/memorymap/ai/starter_acts.py:122 |
| `_open_board` | src/memorymap/ai/starter_acts.py:188 |
| `_open_links` | src/memorymap/ai/starter_acts.py:200 |
| `_open_note` | src/memorymap/ai/starter_acts.py:168 |
| `_original_tail` | src/memorymap/ai/starter_acts.py:85 |
| `_outline_answer` | src/memorymap/ai/starter_acts.py:157 |
| `_save_answer` | src/memorymap/ai/starter_acts.py:266 |
| `_since_a_day` | src/memorymap/ai/starter_acts.py:80 |
| `_tag_open` | src/memorymap/ai/starter_acts.py:252 |
| `_tag_untagged` | src/memorymap/ai/starter_acts.py:231 |
| `_tags_of` | src/memorymap/ai/starter_acts.py:223 |
| `_today_note` | src/memorymap/ai/starter_acts.py:326 |
| `_vectors` | src/memorymap/ai/starter_acts.py:279 |
| `events` | src/memorymap/ai/starter_acts.py:90 |
| `read` | src/memorymap/ai/starter_acts.py:58 |

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

### src/memorymap/ai/tools/__init__.py (91)

| Name | File:line |
|---|---|
| `OneOptionAsk` | src/memorymap/ai/tools/__init__.py:1998 |
| `_ai_actor` | src/memorymap/ai/tools/__init__.py:4677 |
| `_ask_user` | src/memorymap/ai/tools/__init__.py:2006 |
| `_audit_link_reasons` | src/memorymap/ai/tools/__init__.py:2520 |
| `_calculate` | src/memorymap/ai/tools/__init__.py:971 |
| `_check_answer` | src/memorymap/ai/tools/__init__.py:1003 |
| `_coerce` | src/memorymap/ai/tools/__init__.py:4726 |
| `_coerce_array` | src/memorymap/ai/tools/__init__.py:4700 |
| `_complete_reminder` | src/memorymap/ai/tools/__init__.py:1796 |
| `_compress_chat` | src/memorymap/ai/tools/__init__.py:2296 |
| `_count_notes` | src/memorymap/ai/tools/__init__.py:753 |
| `_create_note` | src/memorymap/ai/tools/__init__.py:1336 |
| `_delete_note` | src/memorymap/ai/tools/__init__.py:1664 |
| `_delete_skill` | src/memorymap/ai/tools/__init__.py:1318 |
| `_delete_tag` | src/memorymap/ai/tools/__init__.py:1977 |
| `_describe_param` | src/memorymap/ai/tools/__init__.py:4784 |
| `_edit_note` | src/memorymap/ai/tools/__init__.py:1375 |
| `_example_value` | src/memorymap/ai/tools/__init__.py:4363 |
| `_find_contradictions` | src/memorymap/ai/tools/__init__.py:2539 |
| `_find_similar_notes` | src/memorymap/ai/tools/__init__.py:423 |
| `_first_sentence` | src/memorymap/ai/tools/__init__.py:4491 |
| `_fold_key` | src/memorymap/ai/tools/__init__.py:4694 |
| `_get_current_time` | src/memorymap/ai/tools/__init__.py:927 |
| `_get_note_tool` | src/memorymap/ai/tools/__init__.py:119 |
| `_graph_neighbours` | src/memorymap/ai/tools/__init__.py:179 |
| `_graph_summary` | src/memorymap/ai/tools/__init__.py:146 |
| `_is_plural_variant` | src/memorymap/ai/tools/__init__.py:4343 |
| `_link_notes` | src/memorymap/ai/tools/__init__.py:1578 |
| `_list_categories` | src/memorymap/ai/tools/__init__.py:845 |
| `_list_notes` | src/memorymap/ai/tools/__init__.py:671 |
| `_list_reminders` | src/memorymap/ai/tools/__init__.py:1754 |
| `_list_skills` | src/memorymap/ai/tools/__init__.py:1190 |
| `_list_tags` | src/memorymap/ai/tools/__init__.py:869 |
| `_make_plan` | src/memorymap/ai/tools/__init__.py:2194 |
| `_match_skill` | src/memorymap/ai/tools/__init__.py:2090 |
| `_notebook_overview` | src/memorymap/ai/tools/__init__.py:891 |
| `_notebook_structure` | src/memorymap/ai/tools/__init__.py:544 |
| `_path_between` | src/memorymap/ai/tools/__init__.py:445 |
| `_pin_note` | src/memorymap/ai/tools/__init__.py:1508 |
| `_plan_steps` | src/memorymap/ai/tools/__init__.py:2210 |
| `_propose_act` | src/memorymap/ai/tools/__init__.py:1012 |
| `_read_text` | src/memorymap/ai/tools/__init__.py:991 |
| `_read_url` | src/memorymap/ai/tools/__init__.py:1899 |
| `_related_notes` | src/memorymap/ai/tools/__init__.py:336 |
| `_rename_tag` | src/memorymap/ai/tools/__init__.py:1814 |
| `_requested_ids` | src/memorymap/ai/tools/__init__.py:1421 |
| `_resolve_link_type` | src/memorymap/ai/tools/__init__.py:1561 |
| `_restore_note` | src/memorymap/ai/tools/__init__.py:1675 |
| `_run_skill` | src/memorymap/ai/tools/__init__.py:2064 |
| `_save_skill` | src/memorymap/ai/tools/__init__.py:1263 |
| `_save_user_preference` | src/memorymap/ai/tools/__init__.py:2440 |
| `_schema_key` | src/memorymap/ai/tools/__init__.py:4820 |
| `_scope_filters` | src/memorymap/ai/tools/__init__.py:622 |
| `_scope_label` | src/memorymap/ai/tools/__init__.py:659 |
| `_search_chat_history` | src/memorymap/ai/tools/__init__.py:1113 |
| `_search_help` | src/memorymap/ai/tools/__init__.py:914 |
| `_search_notes` | src/memorymap/ai/tools/__init__.py:72 |
| `_set_reminder` | src/memorymap/ai/tools/__init__.py:1699 |
| `_skill_key` | src/memorymap/ai/tools/__init__.py:2079 |
| `_suggested_neighbours` | src/memorymap/ai/tools/__init__.py:272 |
| `_summarize_notes` | src/memorymap/ai/tools/__init__.py:1030 |
| `_tag_note` | src/memorymap/ai/tools/__init__.py:1447 |
| `_unlink_notes` | src/memorymap/ai/tools/__init__.py:1620 |
| `_verify_block` | src/memorymap/ai/tools/__init__.py:1236 |
| `_web_search` | src/memorymap/ai/tools/__init__.py:1831 |
| `adds_to_a_named_note` | src/memorymap/ai/tools/__init__.py:4192 |
| `budget_for_window` | src/memorymap/ai/tools/__init__.py:4601 |
| `call_example` | src/memorymap/ai/tools/__init__.py:4311 |
| `check_arguments` | src/memorymap/ai/tools/__init__.py:4837 |
| `compact_schemas` | src/memorymap/ai/tools/__init__.py:4502 |
| `confirm_label` | src/memorymap/ai/tools/__init__.py:4645 |
| `example_arguments` | src/memorymap/ai/tools/__init__.py:4794 |
| `execute_tool` | src/memorymap/ai/tools/__init__.py:4878 |
| `focus_detail` | src/memorymap/ai/tools/__init__.py:4213 |
| `focus_for` | src/memorymap/ai/tools/__init__.py:4198 |
| `handoff_event` | src/memorymap/ai/tools/__init__.py:2417 |
| `is_follow_through` | src/memorymap/ai/tools/__init__.py:4176 |
| `link_type_description` | src/memorymap/ai/tools/__init__.py:1539 |
| `ollama_tools` | src/memorymap/ai/tools/__init__.py:4375 |
| `prefetch_web` | src/memorymap/ai/tools/__init__.py:1869 |
| `schema_chars` | src/memorymap/ai/tools/__init__.py:4470 |
| `summarise_turns` | src/memorymap/ai/tools/__init__.py:2261 |
| `tool_catalog` | src/memorymap/ai/tools/__init__.py:4618 |
| `tool_enabled` | src/memorymap/ai/tools/__init__.py:4281 |
| `validate_ask` | src/memorymap/ai/tools/__init__.py:2022 |
| `validate_compress_chat` | src/memorymap/ai/tools/__init__.py:2312 |
| `validate_make_plan` | src/memorymap/ai/tools/__init__.py:2343 |
| `validate_propose_act` | src/memorymap/ai/tools/__init__.py:2378 |
| `validate_run_skill` | src/memorymap/ai/tools/__init__.py:2105 |
| `with_relation_types` | src/memorymap/ai/tools/__init__.py:4402 |
| `within_budget` | src/memorymap/ai/tools/__init__.py:4556 |

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

### src/memorymap/ai/tools/verify.py (20)

| Name | File:line |
|---|---|
| `_card_placed` | src/memorymap/ai/tools/verify.py:84 |
| `_diagram_placed` | src/memorymap/ai/tools/verify.py:97 |
| `_document_created` | src/memorymap/ai/tools/verify.py:69 |
| `_document_deleted` | src/memorymap/ai/tools/verify.py:78 |
| `_item` | src/memorymap/ai/tools/verify.py:120 |
| `_item_moved` | src/memorymap/ai/tools/verify.py:131 |
| `_item_present` | src/memorymap/ai/tools/verify.py:125 |
| `_item_removed` | src/memorymap/ai/tools/verify.py:148 |
| `_library_placed` | src/memorymap/ai/tools/verify.py:154 |
| `_link_drawn` | src/memorymap/ai/tools/verify.py:93 |
| `_links_audited` | src/memorymap/ai/tools/verify.py:164 |
| `_map_node_added` | src/memorymap/ai/tools/verify.py:113 |
| `_mindmap_created` | src/memorymap/ai/tools/verify.py:104 |
| `_missing` | src/memorymap/ai/tools/verify.py:61 |
| `_row` | src/memorymap/ai/tools/verify.py:54 |
| `_skill_deleted` | src/memorymap/ai/tools/verify.py:185 |
| `_skill_names` | src/memorymap/ai/tools/verify.py:174 |
| `_skill_saved` | src/memorymap/ai/tools/verify.py:179 |
| `check` | src/memorymap/ai/tools/verify.py:220 |
| `has_verifier` | src/memorymap/ai/tools/verify.py:215 |

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

### src/memorymap/ai/utilities.py (35)

| Name | File:line |
|---|---|
| `_calculation_kind` | src/memorymap/ai/utilities.py:279 |
| `_clean` | src/memorymap/ai/utilities.py:100 |
| `_clock` | src/memorymap/ai/utilities.py:421 |
| `_compile_convert` | src/memorymap/ai/utilities.py:42 |
| `_compile_money` | src/memorymap/ai/utilities.py:62 |
| `_convert` | src/memorymap/ai/utilities.py:150 |
| `_currency` | src/memorymap/ai/utilities.py:171 |
| `_date_kind` | src/memorymap/ai/utilities.py:293 |
| `_dates` | src/memorymap/ai/utilities.py:198 |
| `_day_words` | src/memorymap/ai/utilities.py:120 |
| `_heading_at` | src/memorymap/ai/utilities.py:579 |
| `_heard` | src/memorymap/ai/utilities.py:254 |
| `_is_clock` | src/memorymap/ai/utilities.py:408 |
| `_kind_of` | src/memorymap/ai/utilities.py:272 |
| `_number` | src/memorymap/ai/utilities.py:107 |
| `_one` | src/memorymap/ai/utilities.py:131 |
| `_other_kind` | src/memorymap/ai/utilities.py:304 |
| `_patterns` | src/memorymap/ai/utilities.py:73 |
| `_place_said` | src/memorymap/ai/utilities.py:415 |
| `_plural` | src/memorymap/ai/utilities.py:124 |
| `_said` | src/memorymap/ai/utilities.py:111 |
| `_salted` | src/memorymap/ai/utilities.py:193 |
| `_sum_of` | src/memorymap/ai/utilities.py:250 |
| `_temperature` | src/memorymap/ai/utilities.py:145 |
| `_web_capability` | src/memorymap/ai/utilities.py:473 |
| `_zone_cities` | src/memorymap/ai/utilities.py:384 |
| `answer` | src/memorymap/ai/utilities.py:488 |
| `counts` | src/memorymap/ai/utilities.py:552 |
| `kind_of` | src/memorymap/ai/utilities.py:266 |
| `now_day` | src/memorymap/ai/utilities.py:236 |
| `outline` | src/memorymap/ai/utilities.py:595 |
| `reading_time` | src/memorymap/ai/utilities.py:567 |
| `until_subject` | src/memorymap/ai/utilities.py:240 |
| `web_on` | src/memorymap/ai/utilities.py:460 |
| `zone_for` | src/memorymap/ai/utilities.py:396 |

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

### src/memorymap/ai/voice.py (6)

| Name | File:line |
|---|---|
| `_decode_samples` | src/memorymap/ai/voice.py:110 |
| `_get_model` | src/memorymap/ai/voice.py:44 |
| `iter_segments` | src/memorymap/ai/voice.py:65 |
| `transcribe` | src/memorymap/ai/voice.py:55 |
| `transcribe_segments` | src/memorymap/ai/voice.py:60 |
| `whisper_available` | src/memorymap/ai/voice.py:40 |

### src/memorymap/api/app.py (32)

| Name | File:line |
|---|---|
| `RequestPulse` | src/memorymap/api/app.py:1094 |
| `RevalidatedStatic` | src/memorymap/api/app.py:309 |
| `SpaceGuard` | src/memorymap/api/app.py:1025 |
| `_UnversionedStatic` | src/memorymap/api/app.py:300 |
| `_add_middleware` | src/memorymap/api/app.py:1166 |
| `_add_system_routes` | src/memorymap/api/app.py:1347 |
| `_backup_if_due` | src/memorymap/api/app.py:710 |
| `_check_notebook_file` | src/memorymap/api/app.py:702 |
| `_choose_chat_model_if_missing` | src/memorymap/api/app.py:655 |
| `_code_for_status` | src/memorymap/api/app.py:812 |
| `_compact_event_log` | src/memorymap/api/app.py:580 |
| `_compact_step` | src/memorymap/api/app.py:626 |
| `_content_length` | src/memorymap/api/app.py:1077 |
| `_include_routers` | src/memorymap/api/app.py:1252 |
| `_install_pending_extras` | src/memorymap/api/app.py:634 |
| `_purge_expired_bin_entries` | src/memorymap/api/app.py:556 |
| `_purge_step` | src/memorymap/api/app.py:622 |
| `_register_error_handlers` | src/memorymap/api/app.py:823 |
| `_stamp_for` | src/memorymap/api/app.py:223 |
| `_start_autonomous_loop` | src/memorymap/api/app.py:767 |
| `_start_searxng_if_asked` | src/memorymap/api/app.py:735 |
| `_start_services` | src/memorymap/api/app.py:1109 |
| `_startup_maintenance` | src/memorymap/api/app.py:674 |
| `_static_gzip` | src/memorymap/api/app.py:495 |
| `asset_hash` | src/memorymap/api/app.py:199 |
| `asset_stamps` | src/memorymap/api/app.py:228 |
| `clear_static_cache` | src/memorymap/api/app.py:536 |
| `create_app` | src/memorymap/api/app.py:1462 |
| `out_of_space_body` | src/memorymap/api/app.py:995 |
| `pin_static_mime_types` | src/memorymap/api/app.py:166 |
| `served_index_html` | src/memorymap/api/app.py:265 |
| `served_offline_html` | src/memorymap/api/app.py:250 |

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

### src/memorymap/api/routes_auth.py (78)

| Name | File:line |
|---|---|
| `ChangePasswordBody` | src/memorymap/api/routes_auth.py:1213 |
| `LanAccessBody` | src/memorymap/api/routes_auth.py:928 |
| `LanOptionBody` | src/memorymap/api/routes_auth.py:1022 |
| `LanPasswordBody` | src/memorymap/api/routes_auth.py:1018 |
| `PasswordBody` | src/memorymap/api/routes_auth.py:489 |
| `PasswordOnOpenBody` | src/memorymap/api/routes_auth.py:886 |
| `RecoverBody` | src/memorymap/api/routes_auth.py:1509 |
| `RecoveryKeyBody` | src/memorymap/api/routes_auth.py:1505 |
| `ResetBody` | src/memorymap/api/routes_auth.py:1514 |
| `RotateVaultKeyBody` | src/memorymap/api/routes_auth.py:1330 |
| `SaveRecoveryKeyBody` | src/memorymap/api/routes_auth.py:1575 |
| `VaultScope` | src/memorymap/api/routes_auth.py:110 |
| `_auto_session_allowed` | src/memorymap/api/routes_auth.py:246 |
| `_bcrypt_input` | src/memorymap/api/routes_auth.py:411 |
| `_check_password_for_lan` | src/memorymap/api/routes_auth.py:1003 |
| `_clear_unlock_failures` | src/memorymap/api/routes_auth.py:327 |
| `_client_key` | src/memorymap/api/routes_auth.py:335 |
| `_cookie_secure` | src/memorymap/api/routes_auth.py:167 |
| `_device_cookie` | src/memorymap/api/routes_auth.py:661 |
| `_device_must_wait` | src/memorymap/api/routes_auth.py:685 |
| `_end_sessions_and_issue` | src/memorymap/api/routes_auth.py:1526 |
| `_forget_dead_tickets` | src/memorymap/api/routes_auth.py:161 |
| `_from_the_network` | src/memorymap/api/routes_auth.py:674 |
| `_from_this_computer` | src/memorymap/api/routes_auth.py:223 |
| `_get_user` | src/memorymap/api/routes_auth.py:495 |
| `_grant_media` | src/memorymap/api/routes_auth.py:254 |
| `_hash_password` | src/memorymap/api/routes_auth.py:422 |
| `_hold_new_device` | src/memorymap/api/routes_auth.py:696 |
| `_is_loopback_address` | src/memorymap/api/routes_auth.py:212 |
| `_iso` | src/memorymap/api/routes_auth.py:1248 |
| `_issue_token` | src/memorymap/api/routes_auth.py:596 |
| `_lan_state` | src/memorymap/api/routes_auth.py:933 |
| `_new_password_problem` | src/memorymap/api/routes_auth.py:451 |
| `_notebook_has_password_now` | src/memorymap/api/routes_auth.py:1704 |
| `_password_matches` | src/memorymap/api/routes_auth.py:426 |
| `_password_set` | src/memorymap/api/routes_auth.py:514 |
| `_refuse_if_throttled` | src/memorymap/api/routes_auth.py:359 |
| `_refuse_unless_this_computer` | src/memorymap/api/routes_auth.py:1518 |
| `_require_this_computer` | src/memorymap/api/routes_auth.py:1028 |
| `_revoke_media` | src/memorymap/api/routes_auth.py:276 |
| `_set_device_cookie` | src/memorymap/api/routes_auth.py:666 |
| `_sweep_expired` | src/memorymap/api/routes_auth.py:137 |
| `_token_valid` | src/memorymap/api/routes_auth.py:288 |
| `_unlock_failed` | src/memorymap/api/routes_auth.py:379 |
| `_unlock_succeeded` | src/memorymap/api/routes_auth.py:388 |
| `_wait_left` | src/memorymap/api/routes_auth.py:348 |
| `account` | src/memorymap/api/routes_auth.py:1221 |
| `allow_this_network` | src/memorymap/api/routes_auth.py:1034 |
| `answer_device` | src/memorymap/api/routes_auth.py:1076 |
| `auto_session` | src/memorymap/api/routes_auth.py:804 |
| `change_password` | src/memorymap/api/routes_auth.py:1253 |
| `download_lan_certificate` | src/memorymap/api/routes_auth.py:964 |
| `end_every_session` | src/memorymap/api/routes_auth.py:576 |
| `forget_device` | src/memorymap/api/routes_auth.py:1097 |
| `forget_network` | src/memorymap/api/routes_auth.py:1050 |
| `lan_access` | src/memorymap/api/routes_auth.py:958 |
| `lan_watch` | src/memorymap/api/routes_auth.py:1114 |
| `lock` | src/memorymap/api/routes_auth.py:1183 |
| `lock_all` | src/memorymap/api/routes_auth.py:1694 |
| `make_recovery_key` | src/memorymap/api/routes_auth.py:1538 |
| `media_session` | src/memorymap/api/routes_auth.py:791 |
| `notebook_open` | src/memorymap/api/routes_auth.py:527 |
| `password_on_open` | src/memorymap/api/routes_auth.py:207 |
| `password_warning` | src/memorymap/api/routes_auth.py:458 |
| `recover` | src/memorymap/api/routes_auth.py:1615 |
| `regenerate_lan_certificate` | src/memorymap/api/routes_auth.py:985 |
| `require_unlock` | src/memorymap/api/routes_auth.py:538 |
| `require_unlock_media` | src/memorymap/api/routes_auth.py:551 |
| `reset` | src/memorymap/api/routes_auth.py:1668 |
| `rotate_vault_key` | src/memorymap/api/routes_auth.py:1335 |
| `save_recovery_key` | src/memorymap/api/routes_auth.py:1585 |
| `set_lan_access` | src/memorymap/api/routes_auth.py:1137 |
| `set_lan_option` | src/memorymap/api/routes_auth.py:1058 |
| `set_password_on_open` | src/memorymap/api/routes_auth.py:892 |
| `setup` | src/memorymap/api/routes_auth.py:628 |
| `status` | src/memorymap/api/routes_auth.py:604 |
| `unlock` | src/memorymap/api/routes_auth.py:724 |
| `unlock_vault` | src/memorymap/api/routes_auth.py:843 |

### src/memorymap/api/routes_backups.py (14)

| Name | File:line |
|---|---|
| `BundleBody` | src/memorymap/api/routes_backups.py:203 |
| `RestoreBody` | src/memorymap/api/routes_backups.py:151 |
| `RetentionBody` | src/memorymap/api/routes_backups.py:39 |
| `_retention` | src/memorymap/api/routes_backups.py:35 |
| `_unlink_quietly` | src/memorymap/api/routes_backups.py:207 |
| `backup_now` | src/memorymap/api/routes_backups.py:116 |
| `delete_backup` | src/memorymap/api/routes_backups.py:187 |
| `export_bundle` | src/memorymap/api/routes_backups.py:216 |
| `integrity_at_start` | src/memorymap/api/routes_backups.py:95 |
| `list_backups` | src/memorymap/api/routes_backups.py:107 |
| `restore_backup` | src/memorymap/api/routes_backups.py:156 |
| `restore_bundle` | src/memorymap/api/routes_backups.py:257 |
| `set_retention` | src/memorymap/api/routes_backups.py:138 |
| `storage_location` | src/memorymap/api/routes_backups.py:44 |

### src/memorymap/api/routes_bench.py (13)

| Name | File:line |
|---|---|
| `BenchBody` | src/memorymap/api/routes_bench.py:148 |
| `Budget` | src/memorymap/api/routes_bench.py:33 |
| `_last_report` | src/memorymap/api/routes_bench.py:165 |
| `_report_path` | src/memorymap/api/routes_bench.py:161 |
| `_run` | src/memorymap/api/routes_bench.py:172 |
| `budget_rows` | src/memorymap/api/routes_bench.py:101 |
| `budgets` | src/memorymap/api/routes_bench.py:124 |
| `heavy_ids` | src/memorymap/api/routes_bench.py:85 |
| `loopback` | src/memorymap/api/routes_bench.py:117 |
| `start` | src/memorymap/api/routes_bench.py:197 |
| `state` | src/memorymap/api/routes_bench.py:237 |
| `stop` | src/memorymap/api/routes_bench.py:246 |
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

### src/memorymap/api/routes_board_library.py (46)

| Name | File:line |
|---|---|
| `ImportBody` | src/memorymap/api/routes_board_library.py:675 |
| `LibraryBody` | src/memorymap/api/routes_board_library.py:611 |
| `LibraryItemCreate` | src/memorymap/api/routes_board_library.py:483 |
| `LibraryItemOut` | src/memorymap/api/routes_board_library.py:375 |
| `LibraryItemUpdate` | src/memorymap/api/routes_board_library.py:517 |
| `MarkBody` | src/memorymap/api/routes_board_library.py:594 |
| `NewBoardBody` | src/memorymap/api/routes_board_library.py:1037 |
| `PlaceBody` | src/memorymap/api/routes_board_library.py:797 |
| `_builtin` | src/memorymap/api/routes_board_library.py:356 |
| `_builtin_index` | src/memorymap/api/routes_board_library.py:329 |
| `_clean_branch` | src/memorymap/api/routes_board_library.py:211 |
| `_clean_element` | src/memorymap/api/routes_board_library.py:133 |
| `_clean_number` | src/memorymap/api/routes_board_library.py:125 |
| `_clean_payload` | src/memorymap/api/routes_board_library.py:239 |
| `_clean_tags` | src/memorymap/api/routes_board_library.py:289 |
| `_drop_media` | src/memorymap/api/routes_board_library.py:724 |
| `_fail` | src/memorymap/api/routes_board_library.py:115 |
| `_icons` | src/memorymap/api/routes_board_library.py:348 |
| `_ink` | src/memorymap/api/routes_board_library.py:835 |
| `_item_or_404` | src/memorymap/api/routes_board_library.py:525 |
| `_item_out` | src/memorymap/api/routes_board_library.py:389 |
| `_library_or_404` | src/memorymap/api/routes_board_library.py:491 |
| `_library_out` | src/memorymap/api/routes_board_library.py:407 |
| `_map_has_no_centre` | src/memorymap/api/routes_board_library.py:914 |
| `_media_urls` | src/memorymap/api/routes_board_library.py:119 |
| `_onto_current_layer` | src/memorymap/api/routes_board_library.py:976 |
| `_place_branch` | src/memorymap/api/routes_board_library.py:931 |
| `_place_element` | src/memorymap/api/routes_board_library.py:839 |
| `_resolve` | src/memorymap/api/routes_board_library.py:813 |
| `_shape_sets` | src/memorymap/api/routes_board_library.py:314 |
| `_yours` | src/memorymap/api/routes_board_library.py:397 |
| `create_library` | src/memorymap/api/routes_board_library.py:616 |
| `create_library_item` | src/memorymap/api/routes_board_library.py:502 |
| `delete_library` | src/memorymap/api/routes_board_library.py:634 |
| `delete_library_item` | src/memorymap/api/routes_board_library.py:558 |
| `duplicate_library_item` | src/memorymap/api/routes_board_library.py:580 |
| `export_library` | src/memorymap/api/routes_board_library.py:650 |
| `import_library` | src/memorymap/api/routes_board_library.py:684 |
| `list_library` | src/memorymap/api/routes_board_library.py:412 |
| `mark_builtin` | src/memorymap/api/routes_board_library.py:600 |
| `new_board_from_template` | src/memorymap/api/routes_board_library.py:1046 |
| `place_library_item` | src/memorymap/api/routes_board_library.py:984 |
| `rename_library` | src/memorymap/api/routes_board_library.py:626 |
| `restore_library_item` | src/memorymap/api/routes_board_library.py:569 |
| `transform_path` | src/memorymap/api/routes_board_library.py:743 |
| `update_library_item` | src/memorymap/api/routes_board_library.py:534 |

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

### src/memorymap/api/routes_captions.py (5)

| Name | File:line |
|---|---|
| `StopBody` | src/memorymap/api/routes_captions.py:84 |
| `_save` | src/memorymap/api/routes_captions.py:32 |
| `audio` | src/memorymap/api/routes_captions.py:66 |
| `start` | src/memorymap/api/routes_captions.py:50 |
| `stop` | src/memorymap/api/routes_captions.py:91 |

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

### src/memorymap/api/routes_chat.py (85)

| Name | File:line |
|---|---|
| `ChatRequest` | src/memorymap/api/routes_chat.py:335 |
| `ChatResponse` | src/memorymap/api/routes_chat.py:705 |
| `ChatTurn` | src/memorymap/api/routes_chat.py:313 |
| `CommandRunBody` | src/memorymap/api/routes_chat.py:2404 |
| `CompressBody` | src/memorymap/api/routes_chat.py:3083 |
| `FollowupBody` | src/memorymap/api/routes_chat.py:278 |
| `PlanRun` | src/memorymap/api/routes_chat.py:322 |
| `ToolExecuteBody` | src/memorymap/api/routes_chat.py:3116 |
| `_StreamRequest` | src/memorymap/api/routes_chat.py:1818 |
| `_about` | src/memorymap/api/routes_chat.py:229 |
| `_act_events` | src/memorymap/api/routes_chat.py:2342 |
| `_agent_events` | src/memorymap/api/routes_chat.py:2426 |
| `_apply_scope` | src/memorymap/api/routes_chat.py:482 |
| `_asked_key` | src/memorymap/api/routes_chat.py:179 |
| `_assist` | src/memorymap/api/routes_chat.py:1877 |
| `_attached_boards` | src/memorymap/api/routes_chat.py:878 |
| `_attached_documents` | src/memorymap/api/routes_chat.py:800 |
| `_attached_files` | src/memorymap/api/routes_chat.py:823 |
| `_attached_notes` | src/memorymap/api/routes_chat.py:777 |
| `_attachment_readings` | src/memorymap/api/routes_chat.py:1149 |
| `_chat_model_sees_images` | src/memorymap/api/routes_chat.py:576 |
| `_checks_grounding` | src/memorymap/api/routes_chat.py:2568 |
| `_composed` | src/memorymap/api/routes_chat.py:1849 |
| `_composed_support` | src/memorymap/api/routes_chat.py:1982 |
| `_composer_embed` | src/memorymap/api/routes_chat.py:1866 |
| `_composer_voice` | src/memorymap/api/routes_chat.py:1856 |
| `_engine_answers` | src/memorymap/api/routes_chat.py:2578 |
| `_exact_events` | src/memorymap/api/routes_chat.py:2050 |
| `_feature_for` | src/memorymap/api/routes_chat.py:119 |
| `_filed_under` | src/memorymap/api/routes_chat.py:1227 |
| `_files_on` | src/memorymap/api/routes_chat.py:1127 |
| `_fill` | src/memorymap/api/routes_chat.py:205 |
| `_first_agent_event` | src/memorymap/api/routes_chat.py:2483 |
| `_first_events` | src/memorymap/api/routes_chat.py:2376 |
| `_follow_up` | src/memorymap/api/routes_chat.py:2547 |
| `_grounding_candidates` | src/memorymap/api/routes_chat.py:740 |
| `_image_caption_context` | src/memorymap/api/routes_chat.py:589 |
| `_insight_memory` | src/memorymap/api/routes_chat.py:2330 |
| `_interactive_lines` | src/memorymap/api/routes_chat.py:3000 |
| `_media_readings` | src/memorymap/api/routes_chat.py:1063 |
| `_mostly_pictures` | src/memorymap/api/routes_chat.py:1013 |
| `_note_dates` | src/memorymap/api/routes_chat.py:1021 |
| `_note_tool_read` | src/memorymap/api/routes_chat.py:2536 |
| `_one_line` | src/memorymap/api/routes_chat.py:1058 |
| `_outline_into` | src/memorymap/api/routes_chat.py:927 |
| `_picture_alts` | src/memorymap/api/routes_chat.py:969 |
| `_picture_notes` | src/memorymap/api/routes_chat.py:1245 |
| `_picture_sizes` | src/memorymap/api/routes_chat.py:996 |
| `_plain_events` | src/memorymap/api/routes_chat.py:2070 |
| `_prepare` | src/memorymap/api/routes_chat.py:1261 |
| `_recent_questions` | src/memorymap/api/routes_chat.py:129 |
| `_refuse_failed` | src/memorymap/api/routes_chat.py:3157 |
| `_related_elsewhere` | src/memorymap/api/routes_chat.py:1728 |
| `_resolve_chat_images` | src/memorymap/api/routes_chat.py:536 |
| `_resolve_mode` | src/memorymap/api/routes_chat.py:497 |
| `_resolve_persona` | src/memorymap/api/routes_chat.py:513 |
| `_resolve_plan` | src/memorymap/api/routes_chat.py:676 |
| `_resolve_skill` | src/memorymap/api/routes_chat.py:650 |
| `_run_title` | src/memorymap/api/routes_chat.py:3011 |
| `_save_ask_turn` | src/memorymap/api/routes_chat.py:1678 |
| `_searched_question` | src/memorymap/api/routes_chat.py:2560 |
| `_small_model_mode` | src/memorymap/api/routes_chat.py:629 |
| `_spoken_act` | src/memorymap/api/routes_chat.py:2521 |
| `_starter_events` | src/memorymap/api/routes_chat.py:2395 |
| `_starter_read` | src/memorymap/api/routes_chat.py:2387 |
| `_stats_chart` | src/memorymap/api/routes_chat.py:2019 |
| `_stream_lines` | src/memorymap/api/routes_chat.py:2607 |
| `_time_words` | src/memorymap/api/routes_chat.py:1041 |
| `_tool_read_events` | src/memorymap/api/routes_chat.py:2029 |
| `_tools_provider` | src/memorymap/api/routes_chat.py:2593 |
| `_web_allowed` | src/memorymap/api/routes_chat.py:1937 |
| `_web_answer` | src/memorymap/api/routes_chat.py:1946 |
| `_web_events` | src/memorymap/api/routes_chat.py:1993 |
| `_widened` | src/memorymap/api/routes_chat.py:1201 |
| `chat` | src/memorymap/api/routes_chat.py:1558 |
| `chat_followups` | src/memorymap/api/routes_chat.py:292 |
| `chat_stream` | src/memorymap/api/routes_chat.py:2918 |
| `compress_history` | src/memorymap/api/routes_chat.py:3090 |
| `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:3129 |
| `forget_recent_question` | src/memorymap/api/routes_chat.py:172 |
| `list_modes` | src/memorymap/api/routes_chat.py:3026 |
| `list_tools` | src/memorymap/api/routes_chat.py:3047 |
| `recent_questions` | src/memorymap/api/routes_chat.py:166 |
| `run_command` | src/memorymap/api/routes_chat.py:2412 |
| `suggestions` | src/memorymap/api/routes_chat.py:245 |

### src/memorymap/api/routes_code_assist.py (2)

| Name | File:line |
|---|---|
| `CodeAssistBody` | src/memorymap/api/routes_code_assist.py:27 |
| `code_assist_route` | src/memorymap/api/routes_code_assist.py:35 |

### src/memorymap/api/routes_code_snippets.py (7)

| Name | File:line |
|---|---|
| `SnippetCreate` | src/memorymap/api/routes_code_snippets.py:36 |
| `SnippetUpdate` | src/memorymap/api/routes_code_snippets.py:43 |
| `_payload` | src/memorymap/api/routes_code_snippets.py:51 |
| `_snippet_or_404` | src/memorymap/api/routes_code_snippets.py:57 |
| `create_snippet` | src/memorymap/api/routes_code_snippets.py:91 |
| `list_snippets` | src/memorymap/api/routes_code_snippets.py:65 |
| `update_snippet` | src/memorymap/api/routes_code_snippets.py:107 |

### src/memorymap/api/routes_conversations.py (37)

| Name | File:line |
|---|---|
| `AnswerBody` | src/memorymap/api/routes_conversations.py:841 |
| `FollowupsBody` | src/memorymap/api/routes_conversations.py:780 |
| `ForkBody` | src/memorymap/api/routes_conversations.py:726 |
| `PinBody` | src/memorymap/api/routes_conversations.py:154 |
| `RenameBody` | src/memorymap/api/routes_conversations.py:150 |
| `RestoreBody` | src/memorymap/api/routes_conversations.py:949 |
| `TruncateBody` | src/memorymap/api/routes_conversations.py:691 |
| `TurnBody` | src/memorymap/api/routes_conversations.py:28 |
| `TurnRestoreBody` | src/memorymap/api/routes_conversations.py:667 |
| `_clean_title` | src/memorymap/api/routes_conversations.py:562 |
| `_existing` | src/memorymap/api/routes_conversations.py:248 |
| `_hydrate_attachments` | src/memorymap/api/routes_conversations.py:445 |
| `_process_committed_media` | src/memorymap/api/routes_conversations.py:252 |
| `_restore_row` | src/memorymap/api/routes_conversations.py:919 |
| `_rewrite_answer_steps` | src/memorymap/api/routes_conversations.py:845 |
| `_summary` | src/memorymap/api/routes_conversations.py:225 |
| `_turn_messages` | src/memorymap/api/routes_conversations.py:174 |
| `_user_message` | src/memorymap/api/routes_conversations.py:158 |
| `append_turn` | src/memorymap/api/routes_conversations.py:543 |
| `archive_conversation` | src/memorymap/api/routes_conversations.py:391 |
| `conversation_matches` | src/memorymap/api/routes_conversations.py:266 |
| `create_conversation` | src/memorymap/api/routes_conversations.py:431 |
| `delete_conversation` | src/memorymap/api/routes_conversations.py:938 |
| `delete_turn` | src/memorymap/api/routes_conversations.py:638 |
| `edit_answer` | src/memorymap/api/routes_conversations.py:880 |
| `fork_conversation` | src/memorymap/api/routes_conversations.py:738 |
| `get_conversation` | src/memorymap/api/routes_conversations.py:533 |
| `list_conversations` | src/memorymap/api/routes_conversations.py:301 |
| `pin_conversation` | src/memorymap/api/routes_conversations.py:371 |
| `rename_conversation` | src/memorymap/api/routes_conversations.py:910 |
| `replace_last_turn` | src/memorymap/api/routes_conversations.py:620 |
| `restore_conversation` | src/memorymap/api/routes_conversations.py:961 |
| `restore_turn` | src/memorymap/api/routes_conversations.py:672 |
| `retitle_conversation` | src/memorymap/api/routes_conversations.py:572 |
| `set_turn_followups` | src/memorymap/api/routes_conversations.py:790 |
| `truncate_conversation` | src/memorymap/api/routes_conversations.py:698 |
| `unarchive_conversation` | src/memorymap/api/routes_conversations.py:414 |

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

### src/memorymap/api/routes_entries.py (126)

| Name | File:line |
|---|---|
| `AttachBookmarkBody` | src/memorymap/api/routes_entries.py:2172 |
| `BackfillReasonsBody` | src/memorymap/api/routes_entries.py:2073 |
| `DailyDayOut` | src/memorymap/api/routes_entries.py:887 |
| `DailyJournalOut` | src/memorymap/api/routes_entries.py:892 |
| `ExtractCommitBody` | src/memorymap/api/routes_entries.py:3882 |
| `ExtractLinkIn` | src/memorymap/api/routes_entries.py:3872 |
| `ExtractNoteIn` | src/memorymap/api/routes_entries.py:3861 |
| `ExtractPreviewBody` | src/memorymap/api/routes_entries.py:3835 |
| `FilingDecisionBody` | src/memorymap/api/routes_entries.py:1084 |
| `FilingStopBody` | src/memorymap/api/routes_entries.py:1067 |
| `ImproveBody` | src/memorymap/api/routes_entries.py:1562 |
| `LinkBody` | src/memorymap/api/routes_entries.py:2792 |
| `LinkPatchBody` | src/memorymap/api/routes_entries.py:2833 |
| `LinkReasonBody` | src/memorymap/api/routes_entries.py:2849 |
| `LinkSuggestionReasonPair` | src/memorymap/api/routes_entries.py:2024 |
| `LinkSuggestionReasonsBody` | src/memorymap/api/routes_entries.py:2029 |
| `PrivacyBody` | src/memorymap/api/routes_entries.py:2856 |
| `SuggestTagsBody` | src/memorymap/api/routes_entries.py:1266 |
| `SuggestedTagsBody` | src/memorymap/api/routes_entries.py:1318 |
| `TensionPair` | src/memorymap/api/routes_entries.py:1974 |
| `ThenTextBody` | src/memorymap/api/routes_entries.py:3192 |
| `WikiRenameIn` | src/memorymap/api/routes_entries.py:2703 |
| `_LateFiling` | src/memorymap/api/routes_entries.py:369 |
| `_LazyNoteFacts` | src/memorymap/api/routes_entries.py:1663 |
| `_already_delivered` | src/memorymap/api/routes_entries.py:689 |
| `_backfill_reasons` | src/memorymap/api/routes_entries.py:2118 |
| `_board_reference_rows_batch` | src/memorymap/api/routes_entries.py:2891 |
| `_connected_files` | src/memorymap/api/routes_entries.py:3685 |
| `_connection_cue` | src/memorymap/api/routes_entries.py:3479 |
| `_connection_label` | src/memorymap/api/routes_entries.py:3673 |
| `_daily_date` | src/memorymap/api/routes_entries.py:902 |
| `_daily_note` | src/memorymap/api/routes_entries.py:940 |
| `_daily_notes` | src/memorymap/api/routes_entries.py:916 |
| `_discard_tags` | src/memorymap/api/routes_entries.py:1329 |
| `_dismissed_tensions` | src/memorymap/api/routes_entries.py:1822 |
| `_embed_entry_in_background` | src/memorymap/api/routes_entries.py:627 |
| `_engine_tags` | src/memorymap/api/routes_entries.py:270 |
| `_existing_entry` | src/memorymap/api/routes_entries.py:323 |
| `_file_entry_in_background` | src/memorymap/api/routes_entries.py:465 |
| `_file_entry_now` | src/memorymap/api/routes_entries.py:343 |
| `_filed_by` | src/memorymap/api/routes_entries.py:1232 |
| `_find_near_duplicate` | src/memorymap/api/routes_entries.py:305 |
| `_first_line` | src/memorymap/api/routes_entries.py:911 |
| `_interior_phrase` | src/memorymap/api/routes_entries.py:3123 |
| `_json_tags` | src/memorymap/api/routes_entries.py:205 |
| `_keep_suggestions` | src/memorymap/api/routes_entries.py:238 |
| `_linked_entry_ids` | src/memorymap/api/routes_entries.py:1432 |
| `_links_to` | src/memorymap/api/routes_entries.py:3146 |
| `_open_suggestions` | src/memorymap/api/routes_entries.py:213 |
| `_preview` | src/memorymap/api/routes_entries.py:77 |
| `_process_committed_media` | src/memorymap/api/routes_entries.py:330 |
| `_queue_embedding` | src/memorymap/api/routes_entries.py:655 |
| `_queue_filing` | src/memorymap/api/routes_entries.py:667 |
| `_readable` | src/memorymap/api/routes_entries.py:2874 |
| `_reevaluate_tags` | src/memorymap/api/routes_entries.py:1540 |
| `_reference_rows` | src/memorymap/api/routes_entries.py:3154 |
| `_reference_rows_batch` | src/memorymap/api/routes_entries.py:2980 |
| `_remember_delivery` | src/memorymap/api/routes_entries.py:706 |
| `_safe_filename` | src/memorymap/api/routes_entries.py:2542 |
| `_stored_form` | src/memorymap/api/routes_entries.py:2866 |
| `_tag_reasons` | src/memorymap/api/routes_entries.py:228 |
| `_tag_vocabulary` | src/memorymap/api/routes_entries.py:1254 |
| `_tension_key` | src/memorymap/api/routes_entries.py:1816 |
| `_to_out` | src/memorymap/api/routes_entries.py:90 |
| `_to_out_bulk` | src/memorymap/api/routes_entries.py:282 |
| `_wiki_link_targets_of` | src/memorymap/api/routes_entries.py:3636 |
| `accept_tension` | src/memorymap/api/routes_entries.py:1980 |
| `add_context` | src/memorymap/api/routes_entries.py:1367 |
| `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1342 |
| `archive_entry` | src/memorymap/api/routes_entries.py:2748 |
| `attach_bookmark` | src/memorymap/api/routes_entries.py:2201 |
| `backfill_link_reasons` | src/memorymap/api/routes_entries.py:2082 |
| `check_link_props` | src/memorymap/api/routes_entries.py:2817 |
| `count_entries` | src/memorymap/api/routes_entries.py:2409 |
| `create_entry` | src/memorymap/api/routes_entries.py:715 |
| `create_link` | src/memorymap/api/routes_entries.py:3711 |
| `daily_journal` | src/memorymap/api/routes_entries.py:949 |
| `daily_note` | src/memorymap/api/routes_entries.py:991 |
| `decide_filing` | src/memorymap/api/routes_entries.py:1091 |
| `delete_entry` | src/memorymap/api/routes_entries.py:2720 |
| `delete_link` | src/memorymap/api/routes_entries.py:3736 |
| `detach_bookmark` | src/memorymap/api/routes_entries.py:2221 |
| `dismiss_tension` | src/memorymap/api/routes_entries.py:2004 |
| `entry_bookmarks` | src/memorymap/api/routes_entries.py:2180 |
| `entry_connections` | src/memorymap/api/routes_entries.py:3493 |
| `entry_history` | src/memorymap/api/routes_entries.py:3211 |
| `entry_reference_counts` | src/memorymap/api/routes_entries.py:2429 |
| `entry_references` | src/memorymap/api/routes_entries.py:3165 |
| `export_entry` | src/memorymap/api/routes_entries.py:2556 |
| `extract_commit` | src/memorymap/api/routes_entries.py:3891 |
| `extract_preview` | src/memorymap/api/routes_entries.py:3845 |
| `filing_status` | src/memorymap/api/routes_entries.py:1141 |
| `find_tensions` | src/memorymap/api/routes_entries.py:1828 |
| `generate_entry_title` | src/memorymap/api/routes_entries.py:3408 |
| `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3791 |
| `get_entry` | src/memorymap/api/routes_entries.py:2479 |
| `improve_writing` | src/memorymap/api/routes_entries.py:1573 |
| `known_tensions` | src/memorymap/api/routes_entries.py:1924 |
| `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:2034 |
| `link_suggestions` | src/memorymap/api/routes_entries.py:1687 |
| `list_entries` | src/memorymap/api/routes_entries.py:2248 |
| `most_accessed` | src/memorymap/api/routes_entries.py:2397 |
| `open_daily_note` | src/memorymap/api/routes_entries.py:1007 |
| `patch_link` | src/memorymap/api/routes_entries.py:3748 |
| `purge_entry` | src/memorymap/api/routes_entries.py:2767 |
| `query_entries` | src/memorymap/api/routes_entries.py:1625 |
| `reevaluate_entry` | src/memorymap/api/routes_entries.py:1450 |
| `related_entries` | src/memorymap/api/routes_entries.py:2145 |
| `remove_entry_title` | src/memorymap/api/routes_entries.py:3455 |
| `restore_entry` | src/memorymap/api/routes_entries.py:2740 |
| `restore_event` | src/memorymap/api/routes_entries.py:3293 |
| `restore_revision` | src/memorymap/api/routes_entries.py:3357 |
| `retry_stand_ins` | src/memorymap/api/routes_entries.py:593 |
| `seed_example_entries` | src/memorymap/api/routes_entries.py:2414 |
| `set_entry_privacy` | src/memorymap/api/routes_entries.py:3382 |
| `stand_ins_waiting` | src/memorymap/api/routes_entries.py:585 |
| `stop_all_filing` | src/memorymap/api/routes_entries.py:1112 |
| `stop_filing` | src/memorymap/api/routes_entries.py:1038 |
| `stop_filing_one` | src/memorymap/api/routes_entries.py:1072 |
| `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1278 |
| `then_and_now` | src/memorymap/api/routes_entries.py:3173 |
| `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3198 |
| `unarchive_entry` | src/memorymap/api/routes_entries.py:2759 |
| `update_entry` | src/memorymap/api/routes_entries.py:2587 |
| `update_link_reason` | src/memorymap/api/routes_entries.py:3770 |
| `wiki_rename` | src/memorymap/api/routes_entries.py:2708 |

### src/memorymap/api/routes_files.py (121)

| Name | File:line |
|---|---|
| `AttachedFileTextOut` | src/memorymap/api/routes_files.py:633 |
| `AttachmentAnalyseBody` | src/memorymap/api/routes_files.py:368 |
| `AttachmentGalleryOut` | src/memorymap/api/routes_files.py:193 |
| `AttachmentRenameBody` | src/memorymap/api/routes_files.py:924 |
| `CaptionBody` | src/memorymap/api/routes_files.py:1843 |
| `FileTextIn` | src/memorymap/api/routes_files.py:705 |
| `MediaOrphansOut` | src/memorymap/api/routes_files.py:1476 |
| `MediaRenameBody` | src/memorymap/api/routes_files.py:1815 |
| `MediaUploadOut` | src/memorymap/api/routes_files.py:1314 |
| `OcrBody` | src/memorymap/api/routes_files.py:1961 |
| `OcrLanguageBody` | src/memorymap/api/routes_files.py:3248 |
| `OcrPageReadOut` | src/memorymap/api/routes_files.py:2564 |
| `OcrRangeReadOut` | src/memorymap/api/routes_files.py:3266 |
| `OcrReadersOut` | src/memorymap/api/routes_files.py:3170 |
| `OcrRegionBox` | src/memorymap/api/routes_files.py:2039 |
| `OcrRegionOut` | src/memorymap/api/routes_files.py:2056 |
| `OcrRegionReadOut` | src/memorymap/api/routes_files.py:3469 |
| `OcrRegionsOut` | src/memorymap/api/routes_files.py:2120 |
| `OcrStoredReadingOut` | src/memorymap/api/routes_files.py:2079 |
| `OcrWordOut` | src/memorymap/api/routes_files.py:2048 |
| `PdfInfoOut` | src/memorymap/api/routes_files.py:753 |
| `ReadingBinnedOut` | src/memorymap/api/routes_files.py:3761 |
| `ReadingRestoredOut` | src/memorymap/api/routes_files.py:3803 |
| `SaveFileBody` | src/memorymap/api/routes_files.py:999 |
| `VisionOcrBody` | src/memorymap/api/routes_files.py:3910 |
| `_attachment_out` | src/memorymap/api/routes_files.py:425 |
| `_attachment_size` | src/memorymap/api/routes_files.py:395 |
| `_bin_file_reading` | src/memorymap/api/routes_files.py:3770 |
| `_checked_engine` | src/memorymap/api/routes_files.py:2741 |
| `_checked_reader` | src/memorymap/api/routes_files.py:2715 |
| `_clean_reading_fields` | src/memorymap/api/routes_files.py:3837 |
| `_describe_page` | src/memorymap/api/routes_files.py:3062 |
| `_embed_pattern` | src/memorymap/api/routes_files.py:1742 |
| `_engine_choice` | src/memorymap/api/routes_files.py:2735 |
| `_existing_attachment` | src/memorymap/api/routes_files.py:166 |
| `_exports_dir` | src/memorymap/api/routes_files.py:990 |
| `_forget_page_read` | src/memorymap/api/routes_files.py:3704 |
| `_forget_regions` | src/memorymap/api/routes_files.py:2331 |
| `_local_regions` | src/memorymap/api/routes_files.py:2764 |
| `_local_text` | src/memorymap/api/routes_files.py:2757 |
| `_media_size` | src/memorymap/api/routes_files.py:1591 |
| `_media_upload_path` | src/memorymap/api/routes_files.py:1657 |
| `_page_read_count_map` | src/memorymap/api/routes_files.py:2926 |
| `_page_read_key` | src/memorymap/api/routes_files.py:2769 |
| `_page_read_text_map` | src/memorymap/api/routes_files.py:2886 |
| `_parse_page_spec` | src/memorymap/api/routes_files.py:3290 |
| `_pdf_regions_for` | src/memorymap/api/routes_files.py:2167 |
| `_read_page` | src/memorymap/api/routes_files.py:3019 |
| `_read_range` | src/memorymap/api/routes_files.py:3325 |
| `_read_region` | src/memorymap/api/routes_files.py:3523 |
| `_reader_model` | src/memorymap/api/routes_files.py:2609 |
| `_region_image` | src/memorymap/api/routes_files.py:3500 |
| `_regions_for` | src/memorymap/api/routes_files.py:2396 |
| `_regions_text` | src/memorymap/api/routes_files.py:2963 |
| `_reindex_file` | src/memorymap/api/routes_files.py:2826 |
| `_remember_page_caption` | src/memorymap/api/routes_files.py:2844 |
| `_remember_page_read` | src/memorymap/api/routes_files.py:2778 |
| `_remember_regions` | src/memorymap/api/routes_files.py:2296 |
| `_set_edited_reading` | src/memorymap/api/routes_files.py:2364 |
| `_stored_page_reads` | src/memorymap/api/routes_files.py:2981 |
| `_stored_range` | src/memorymap/api/routes_files.py:3375 |
| `_stored_readings` | src/memorymap/api/routes_files.py:2089 |
| `_stored_regions` | src/memorymap/api/routes_files.py:2271 |
| `_strip_embeds` | src/memorymap/api/routes_files.py:1748 |
| `_tesseract_read_page` | src/memorymap/api/routes_files.py:3127 |
| `_vision_read_page` | src/memorymap/api/routes_files.py:2626 |
| `_within_dir` | src/memorymap/api/routes_files.py:1064 |
| `_within_exports` | src/memorymap/api/routes_files.py:1021 |
| `analyse_attachment` | src/memorymap/api/routes_files.py:450 |
| `attached_file_html_preview` | src/memorymap/api/routes_files.py:862 |
| `attached_file_pdf_info` | src/memorymap/api/routes_files.py:770 |
| `attached_file_pdf_page` | src/memorymap/api/routes_files.py:806 |
| `attached_file_text` | src/memorymap/api/routes_files.py:665 |
| `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3436 |
| `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3400 |
| `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2532 |
| `attachment_page_caption` | src/memorymap/api/routes_files.py:3641 |
| `attachment_page_reads` | src/memorymap/api/routes_files.py:3679 |
| `attachment_region_read` | src/memorymap/api/routes_files.py:3607 |
| `caption_media` | src/memorymap/api/routes_files.py:1875 |
| `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3858 |
| `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3884 |
| `clean_orphaned_media` | src/memorymap/api/routes_files.py:1525 |
| `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3736 |
| `delete_attachment_reading` | src/memorymap/api/routes_files.py:3795 |
| `delete_file` | src/memorymap/api/routes_files.py:907 |
| `delete_media` | src/memorymap/api/routes_files.py:1787 |
| `delete_media_page_read` | src/memorymap/api/routes_files.py:3750 |
| `delete_media_reading` | src/memorymap/api/routes_files.py:3785 |
| `download_export` | src/memorymap/api/routes_files.py:1172 |
| `download_file` | src/memorymap/api/routes_files.py:171 |
| `file_readings` | src/memorymap/api/routes_files.py:274 |
| `get_media` | src/memorymap/api/routes_files.py:4008 |
| `list_attachment_gallery` | src/memorymap/api/routes_files.py:298 |
| `list_exports` | src/memorymap/api/routes_files.py:1134 |
| `list_media` | src/memorymap/api/routes_files.py:1393 |
| `list_orphaned_media` | src/memorymap/api/routes_files.py:1494 |
| `media_meta` | src/memorymap/api/routes_files.py:1550 |
| `media_ocr_page_read` | src/memorymap/api/routes_files.py:3453 |
| `media_ocr_range_read` | src/memorymap/api/routes_files.py:3418 |
| `media_ocr_regions` | src/memorymap/api/routes_files.py:2498 |
| `media_page_caption` | src/memorymap/api/routes_files.py:3662 |
| `media_page_reads` | src/memorymap/api/routes_files.py:3695 |
| `media_pdf_info` | src/memorymap/api/routes_files.py:1668 |
| `media_pdf_page` | src/memorymap/api/routes_files.py:1708 |
| `media_region_read` | src/memorymap/api/routes_files.py:3627 |
| `media_text` | src/memorymap/api/routes_files.py:1600 |
| `ocr_media` | src/memorymap/api/routes_files.py:1980 |
| `ocr_readers` | src/memorymap/api/routes_files.py:3206 |
| `open_exports_folder` | src/memorymap/api/routes_files.py:1183 |
| `purge_binned_reading` | src/memorymap/api/routes_files.py:3829 |
| `rename_file` | src/memorymap/api/routes_files.py:929 |
| `rename_media` | src/memorymap/api/routes_files.py:1820 |
| `restore_binned_reading` | src/memorymap/api/routes_files.py:3811 |
| `safe_filename` | src/memorymap/api/routes_files.py:1007 |
| `save_attached_file_text` | src/memorymap/api/routes_files.py:712 |
| `save_generated_file` | src/memorymap/api/routes_files.py:1086 |
| `set_ocr_language` | src/memorymap/api/routes_files.py:3255 |
| `upload_file` | src/memorymap/api/routes_files.py:98 |
| `upload_media` | src/memorymap/api/routes_files.py:1244 |
| `vision_ocr_media` | src/memorymap/api/routes_files.py:3937 |

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

### src/memorymap/api/routes_help.py (8)

| Name | File:line |
|---|---|
| `AskBody` | src/memorymap/api/routes_help.py:28 |
| `HistoryTurn` | src/memorymap/api/routes_help.py:23 |
| `add_sample_notebook` | src/memorymap/api/routes_help.py:128 |
| `ask` | src/memorymap/api/routes_help.py:65 |
| `ask_stream` | src/memorymap/api/routes_help.py:77 |
| `remove_sample_notebook` | src/memorymap/api/routes_help.py:150 |
| `sample_notebook_state` | src/memorymap/api/routes_help.py:119 |
| `topics` | src/memorymap/api/routes_help.py:58 |

### src/memorymap/api/routes_import.py (6)

| Name | File:line |
|---|---|
| `_progress` | src/memorymap/api/routes_import.py:46 |
| `_received` | src/memorymap/api/routes_import.py:32 |
| `_summary` | src/memorymap/api/routes_import.py:57 |
| `export_notebook_folder` | src/memorymap/api/routes_import.py:122 |
| `import_app` | src/memorymap/api/routes_import.py:64 |
| `import_report_page` | src/memorymap/api/routes_import.py:113 |

### src/memorymap/api/routes_inbox.py (17)

| Name | File:line |
|---|---|
| `DismissedRestore` | src/memorymap/api/routes_inbox.py:205 |
| `MergeAccept` | src/memorymap/api/routes_inbox.py:131 |
| `MergeDismiss` | src/memorymap/api/routes_inbox.py:137 |
| `TypeDecision` | src/memorymap/api/routes_inbox.py:164 |
| `_merges` | src/memorymap/api/routes_inbox.py:49 |
| `_sentence` | src/memorymap/api/routes_inbox.py:67 |
| `_tension_keys` | src/memorymap/api/routes_inbox.py:210 |
| `_types` | src/memorymap/api/routes_inbox.py:83 |
| `_visible` | src/memorymap/api/routes_inbox.py:38 |
| `accept_merge` | src/memorymap/api/routes_inbox.py:144 |
| `accept_type` | src/memorymap/api/routes_inbox.py:170 |
| `clear_dismissed_suggestions` | src/memorymap/api/routes_inbox.py:226 |
| `dismiss_merge` | src/memorymap/api/routes_inbox.py:158 |
| `dismiss_type` | src/memorymap/api/routes_inbox.py:187 |
| `dismissed_suggestions` | src/memorymap/api/routes_inbox.py:218 |
| `restore_dismissed_suggestions` | src/memorymap/api/routes_inbox.py:240 |
| `suggestions` | src/memorymap/api/routes_inbox.py:125 |

### src/memorymap/api/routes_insights.py (24)

| Name | File:line |
|---|---|
| `InsightVerdict` | src/memorymap/api/routes_insights.py:416 |
| `_clean_greeting` | src/memorymap/api/routes_insights.py:136 |
| `_composed_greeting` | src/memorymap/api/routes_insights.py:161 |
| `_digest_notes` | src/memorymap/api/routes_insights.py:566 |
| `_greets_a_stranger` | src/memorymap/api/routes_insights.py:335 |
| `_long_date` | src/memorymap/api/routes_insights.py:540 |
| `_name_like_words` | src/memorymap/api/routes_insights.py:293 |
| `_name_mentions` | src/memorymap/api/routes_insights.py:304 |
| `_repair_misspelt_name` | src/memorymap/api/routes_insights.py:316 |
| `_sentence_case` | src/memorymap/api/routes_insights.py:157 |
| `_written_label` | src/memorymap/api/routes_insights.py:547 |
| `confirm_insight` | src/memorymap/api/routes_insights.py:427 |
| `day_digest_lines` | src/memorymap/api/routes_insights.py:388 |
| `digest_question` | src/memorymap/api/routes_insights.py:560 |
| `digest_structure_note` | src/memorymap/api/routes_insights.py:605 |
| `dismiss_insight` | src/memorymap/api/routes_insights.py:441 |
| `greeting` | src/memorymap/api/routes_insights.py:173 |
| `heatmap` | src/memorymap/api/routes_insights.py:353 |
| `on_this_day` | src/memorymap/api/routes_insights.py:465 |
| `patterns` | src/memorymap/api/routes_insights.py:405 |
| `stats` | src/memorymap/api/routes_insights.py:34 |
| `tag_cloud` | src/memorymap/api/routes_insights.py:454 |
| `weekly_digest` | src/memorymap/api/routes_insights.py:718 |
| `weekly_digest_stream` | src/memorymap/api/routes_insights.py:650 |

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

### src/memorymap/api/routes_meetings.py (14)

| Name | File:line |
|---|---|
| `AppendBody` | src/memorymap/api/routes_meetings.py:168 |
| `MeetingCreate` | src/memorymap/api/routes_meetings.py:40 |
| `RemindBody` | src/memorymap/api/routes_meetings.py:118 |
| `_held_at` | src/memorymap/api/routes_meetings.py:225 |
| `_meeting_entry` | src/memorymap/api/routes_meetings.py:74 |
| `_model_pass` | src/memorymap/api/routes_meetings.py:196 |
| `_not_yet_written` | src/memorymap/api/routes_meetings.py:212 |
| `_read_due` | src/memorymap/api/routes_meetings.py:128 |
| `_reminders_for` | src/memorymap/api/routes_meetings.py:81 |
| `append_to_meeting` | src/memorymap/api/routes_meetings.py:177 |
| `create_meeting` | src/memorymap/api/routes_meetings.py:53 |
| `read_meeting` | src/memorymap/api/routes_meetings.py:91 |
| `remind_action` | src/memorymap/api/routes_meetings.py:136 |
| `summarise_meeting` | src/memorymap/api/routes_meetings.py:235 |

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
| `ChatModelBody` | src/memorymap/api/routes_models.py:37 |
| `EmbeddingBackendBody` | src/memorymap/api/routes_models.py:41 |
| `FeatureModelBody` | src/memorymap/api/routes_models.py:55 |
| `InspectBody` | src/memorymap/api/routes_models.py:657 |
| `ProviderBody` | src/memorymap/api/routes_models.py:73 |
| `PullBody` | src/memorymap/api/routes_models.py:46 |
| `SamplingBody` | src/memorymap/api/routes_models.py:535 |
| `UtilityModelBody` | src/memorymap/api/routes_models.py:50 |
| `VisionModelBody` | src/memorymap/api/routes_models.py:67 |
| `_CachedCapabilities` | src/memorymap/api/routes_models.py:190 |
| `_ListFlight` | src/memorymap/api/routes_models.py:118 |
| `_backend_label` | src/memorymap/api/routes_models.py:91 |
| `_builtin_embedding_install_state` | src/memorymap/api/routes_models.py:248 |
| `_embedding_coverage` | src/memorymap/api/routes_models.py:291 |
| `_human_bytes` | src/memorymap/api/routes_models.py:689 |
| `_installed_models` | src/memorymap/api/routes_models.py:98 |
| `_installed_names` | src/memorymap/api/routes_models.py:661 |
| `_installed_or_last_known` | src/memorymap/api/routes_models.py:132 |
| `_model_ready` | src/memorymap/api/routes_models.py:316 |
| `_name_matches` | src/memorymap/api/routes_models.py:183 |
| `_run_list_flight` | src/memorymap/api/routes_models.py:165 |
| `_tools_engine` | src/memorymap/api/routes_models.py:307 |
| `_warm_capabilities` | src/memorymap/api/routes_models.py:226 |
| `cancel_job` | src/memorymap/api/routes_models.py:905 |
| `delete_model` | src/memorymap/api/routes_models.py:1009 |
| `hardware_memory` | src/memorymap/api/routes_models.py:652 |
| `inspect_model` | src/memorymap/api/routes_models.py:669 |
| `model_spec` | src/memorymap/api/routes_models.py:508 |
| `pull_model` | src/memorymap/api/routes_models.py:1043 |
| `rebuild_search_index` | src/memorymap/api/routes_models.py:969 |
| `reset_feature_models` | src/memorymap/api/routes_models.py:822 |
| `sampling_settings` | src/memorymap/api/routes_models.py:548 |
| `save_sampling_settings` | src/memorymap/api/routes_models.py:596 |
| `set_chat_model` | src/memorymap/api/routes_models.py:697 |
| `set_embedding_backend` | src/memorymap/api/routes_models.py:920 |
| `set_feature_model` | src/memorymap/api/routes_models.py:772 |
| `set_ocr_model` | src/memorymap/api/routes_models.py:751 |
| `set_provider` | src/memorymap/api/routes_models.py:839 |
| `set_utility_model` | src/memorymap/api/routes_models.py:716 |
| `set_vision_model` | src/memorymap/api/routes_models.py:734 |
| `status` | src/memorymap/api/routes_models.py:323 |
| `suggested` | src/memorymap/api/routes_models.py:610 |
| `warm_filing` | src/memorymap/api/routes_models.py:267 |

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

### src/memorymap/api/routes_read.py (12)

| Name | File:line |
|---|---|
| `DatesBody` | src/memorymap/api/routes_read.py:85 |
| `NearRequest` | src/memorymap/api/routes_read.py:127 |
| `OffersBody` | src/memorymap/api/routes_read.py:54 |
| `_clock` | src/memorymap/api/routes_read.py:27 |
| `act_rows` | src/memorymap/api/routes_read.py:152 |
| `board_act` | src/memorymap/api/routes_read.py:77 |
| `date_chips` | src/memorymap/api/routes_read.py:92 |
| `near_rows` | src/memorymap/api/routes_read.py:133 |
| `note_offers` | src/memorymap/api/routes_read.py:65 |
| `phrase_filter` | src/memorymap/api/routes_read.py:100 |
| `read_text` | src/memorymap/api/routes_read.py:37 |
| `setting_words` | src/memorymap/api/routes_read.py:118 |

### src/memorymap/api/routes_recordings.py (28)

| Name | File:line |
|---|---|
| `RecordingCreate` | src/memorymap/api/routes_recordings.py:45 |
| `RecordingFinish` | src/memorymap/api/routes_recordings.py:55 |
| `RecordingPatch` | src/memorymap/api/routes_recordings.py:61 |
| `_get` | src/memorymap/api/routes_recordings.py:68 |
| `_keep_segments` | src/memorymap/api/routes_recordings.py:338 |
| `_named` | src/memorymap/api/routes_recordings.py:363 |
| `_people_at` | src/memorymap/api/routes_recordings.py:356 |
| `_segments_of` | src/memorymap/api/routes_recordings.py:375 |
| `_subtitles` | src/memorymap/api/routes_recordings.py:405 |
| `_transcribe_in_background` | src/memorymap/api/routes_recordings.py:305 |
| `append_chunk` | src/memorymap/api/routes_recordings.py:141 |
| `bin_recording` | src/memorymap/api/routes_recordings.py:207 |
| `create_recording` | src/memorymap/api/routes_recordings.py:117 |
| `finish_recording` | src/memorymap/api/routes_recordings.py:169 |
| `list_recordings` | src/memorymap/api/routes_recordings.py:87 |
| `name_speakers` | src/memorymap/api/routes_recordings.py:392 |
| `purge_recording` | src/memorymap/api/routes_recordings.py:226 |
| `read_recording` | src/memorymap/api/routes_recordings.py:187 |
| `read_transcript` | src/memorymap/api/routes_recordings.py:384 |
| `recording_audio` | src/memorymap/api/routes_recordings.py:427 |
| `recover_recordings` | src/memorymap/api/routes_recordings.py:109 |
| `restore_recording` | src/memorymap/api/routes_recordings.py:217 |
| `start_transcription` | src/memorymap/api/routes_recordings.py:269 |
| `stop_transcription` | src/memorymap/api/routes_recordings.py:296 |
| `transcribe_recording` | src/memorymap/api/routes_recordings.py:237 |
| `transcript_srt` | src/memorymap/api/routes_recordings.py:417 |
| `transcript_vtt` | src/memorymap/api/routes_recordings.py:422 |
| `update_recording` | src/memorymap/api/routes_recordings.py:192 |

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

### src/memorymap/api/routes_reminders.py (35)

| Name | File:line |
|---|---|
| `MagicAddBody` | src/memorymap/api/routes_reminders.py:63 |
| `NotificationAct` | src/memorymap/api/routes_reminders.py:680 |
| `ReminderCreate` | src/memorymap/api/routes_reminders.py:47 |
| `ReminderUpdate` | src/memorymap/api/routes_reminders.py:71 |
| `WhenBody` | src/memorymap/api/routes_reminders.py:505 |
| `_binned` | src/memorymap/api/routes_reminders.py:723 |
| `_complete` | src/memorymap/api/routes_reminders.py:652 |
| `_existing` | src/memorymap/api/routes_reminders.py:186 |
| `_ics_event` | src/memorymap/api/routes_reminders.py:306 |
| `_ics_fold` | src/memorymap/api/routes_reminders.py:283 |
| `_ics_response` | src/memorymap/api/routes_reminders.py:342 |
| `_ics_text` | src/memorymap/api/routes_reminders.py:272 |
| `_ics_time` | src/memorymap/api/routes_reminders.py:301 |
| `_import_one` | src/memorymap/api/routes_reminders.py:386 |
| `_past_and_open` | src/memorymap/api/routes_reminders.py:380 |
| `_reject_if_in_the_past` | src/memorymap/api/routes_reminders.py:85 |
| `_repeat_words` | src/memorymap/api/routes_reminders.py:158 |
| `_rule_words` | src/memorymap/api/routes_reminders.py:169 |
| `_target` | src/memorymap/api/routes_reminders.py:100 |
| `_to_out` | src/memorymap/api/routes_reminders.py:125 |
| `act_from_notification` | src/memorymap/api/routes_reminders.py:688 |
| `complete_reminder` | src/memorymap/api/routes_reminders.py:634 |
| `create_reminder` | src/memorymap/api/routes_reminders.py:477 |
| `delete_reminder` | src/memorymap/api/routes_reminders.py:713 |
| `export_ics` | src/memorymap/api/routes_reminders.py:357 |
| `export_one_ics` | src/memorymap/api/routes_reminders.py:366 |
| `import_ics` | src/memorymap/api/routes_reminders.py:402 |
| `list_reminders` | src/memorymap/api/routes_reminders.py:432 |
| `magic_add_reminder` | src/memorymap/api/routes_reminders.py:530 |
| `notification_token` | src/memorymap/api/routes_reminders.py:671 |
| `purge_reminder` | src/memorymap/api/routes_reminders.py:744 |
| `read_when` | src/memorymap/api/routes_reminders.py:511 |
| `reminder_counts` | src/memorymap/api/routes_reminders.py:209 |
| `restore_reminder` | src/memorymap/api/routes_reminders.py:734 |
| `update_reminder` | src/memorymap/api/routes_reminders.py:604 |

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

### src/memorymap/api/routes_settings.py (101)

| Name | File:line |
|---|---|
| `AvatarStyle` | src/memorymap/api/routes_settings.py:55 |
| `ClientError` | src/memorymap/api/routes_settings.py:2092 |
| `CustomThemeItem` | src/memorymap/api/routes_settings.py:231 |
| `DashboardLayout` | src/memorymap/api/routes_settings.py:658 |
| `DraftTemplateBody` | src/memorymap/api/routes_settings.py:210 |
| `EmbeddingChoiceBody` | src/memorymap/api/routes_settings.py:1963 |
| `EmbeddingPullBody` | src/memorymap/api/routes_settings.py:2019 |
| `ExtrasBulkBody` | src/memorymap/api/routes_settings.py:1900 |
| `ImportDirectoryRequest` | src/memorymap/api/routes_settings.py:2703 |
| `PersonaItem` | src/memorymap/api/routes_settings.py:144 |
| `PreferenceBody` | src/memorymap/api/routes_settings.py:1391 |
| `PreferencesBody` | src/memorymap/api/routes_settings.py:301 |
| `ProposalAnswer` | src/memorymap/api/routes_settings.py:1396 |
| `SavedSearch` | src/memorymap/api/routes_settings.py:632 |
| `SkillInput` | src/memorymap/api/routes_settings.py:260 |
| `SkillItem` | src/memorymap/api/routes_settings.py:269 |
| `SuggestThinkingWordsBody` | src/memorymap/api/routes_settings.py:184 |
| `TemplateItem` | src/memorymap/api/routes_settings.py:116 |
| `UndoBody` | src/memorymap/api/routes_settings.py:1744 |
| `_FreshConfig` | src/memorymap/api/routes_settings.py:732 |
| `_already_imported` | src/memorymap/api/routes_settings.py:2801 |
| `_clean_avatar_style` | src/memorymap/api/routes_settings.py:96 |
| `_create_document_notes` | src/memorymap/api/routes_settings.py:3138 |
| `_csv_safe` | src/memorymap/api/routes_settings.py:1628 |
| `_desktop_entry` | src/memorymap/api/routes_settings.py:1207 |
| `_export_rows` | src/memorymap/api/routes_settings.py:2440 |
| `_exportable_keys` | src/memorymap/api/routes_settings.py:1087 |
| `_exported_created` | src/memorymap/api/routes_settings.py:2636 |
| `_feed_item` | src/memorymap/api/routes_settings.py:1717 |
| `_import_directory_files` | src/memorymap/api/routes_settings.py:2822 |
| `_import_markdown_files` | src/memorymap/api/routes_settings.py:2995 |
| `_import_root_for` | src/memorymap/api/routes_settings.py:2766 |
| `_import_roots` | src/memorymap/api/routes_settings.py:2750 |
| `_inside` | src/memorymap/api/routes_settings.py:2774 |
| `_keep_exported_state` | src/memorymap/api/routes_settings.py:2653 |
| `_link_imported` | src/memorymap/api/routes_settings.py:2981 |
| `_merged_list` | src/memorymap/api/routes_settings.py:1077 |
| `_models_status_snapshot` | src/memorymap/api/routes_settings.py:2424 |
| `_not_private_events` | src/memorymap/api/routes_settings.py:1635 |
| `_parse_frontmatter` | src/memorymap/api/routes_settings.py:2663 |
| `_preference_detail` | src/memorymap/api/routes_settings.py:932 |
| `_preference_out` | src/memorymap/api/routes_settings.py:1402 |
| `_preferences_from` | src/memorymap/api/routes_settings.py:740 |
| `_redacted_preferences` | src/memorymap/api/routes_settings.py:2295 |
| `_run_directory_import` | src/memorymap/api/routes_settings.py:2786 |
| `_slug` | src/memorymap/api/routes_settings.py:2540 |
| `_small_class` | src/memorymap/api/routes_settings.py:1320 |
| `_text_hash` | src/memorymap/api/routes_settings.py:2797 |
| `_under_root` | src/memorymap/api/routes_settings.py:2761 |
| `_validated_context_windows` | src/memorymap/api/routes_settings.py:963 |
| `_validated_export_dir` | src/memorymap/api/routes_settings.py:1299 |
| `_validated_import_directory` | src/memorymap/api/routes_settings.py:2706 |
| `_validated_quick_access` | src/memorymap/api/routes_settings.py:680 |
| `_validated_quick_tints` | src/memorymap/api/routes_settings.py:703 |
| `_validated_skills` | src/memorymap/api/routes_settings.py:1247 |
| `_validated_templates` | src/memorymap/api/routes_settings.py:1273 |
| `add_memory` | src/memorymap/api/routes_settings.py:1465 |
| `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1508 |
| `audit_export_csv` | src/memorymap/api/routes_settings.py:1662 |
| `audit_log` | src/memorymap/api/routes_settings.py:1571 |
| `build_markdown_export` | src/memorymap/api/routes_settings.py:2546 |
| `bulk_extras` | src/memorymap/api/routes_settings.py:1910 |
| `clear_audit_log` | src/memorymap/api/routes_settings.py:1847 |
| `clear_server_logs` | src/memorymap/api/routes_settings.py:2170 |
| `download_embedding_model` | src/memorymap/api/routes_settings.py:2061 |
| `draft_template` | src/memorymap/api/routes_settings.py:217 |
| `embedding_model_choices` | src/memorymap/api/routes_settings.py:1969 |
| `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1863 |
| `event_feed` | src/memorymap/api/routes_settings.py:1789 |
| `export_backup` | src/memorymap/api/routes_settings.py:2451 |
| `export_csv` | src/memorymap/api/routes_settings.py:3164 |
| `export_json` | src/memorymap/api/routes_settings.py:2476 |
| `export_markdown` | src/memorymap/api/routes_settings.py:2605 |
| `export_preferences` | src/memorymap/api/routes_settings.py:1092 |
| `forget_memory` | src/memorymap/api/routes_settings.py:1561 |
| `get_preference_defaults` | src/memorymap/api/routes_settings.py:1053 |
| `get_preferences` | src/memorymap/api/routes_settings.py:724 |
| `import_directory` | src/memorymap/api/routes_settings.py:2946 |
| `import_document` | src/memorymap/api/routes_settings.py:3068 |
| `import_markdown` | src/memorymap/api/routes_settings.py:2962 |
| `import_preferences` | src/memorymap/api/routes_settings.py:1105 |
| `install_extra` | src/memorymap/api/routes_settings.py:1919 |
| `list_embedding_models` | src/memorymap/api/routes_settings.py:1942 |
| `list_extras` | src/memorymap/api/routes_settings.py:1878 |
| `list_memory` | src/memorymap/api/routes_settings.py:1430 |
| `list_skills` | src/memorymap/api/routes_settings.py:1325 |
| `pull_embedding_model` | src/memorymap/api/routes_settings.py:2024 |
| `record_client_error` | src/memorymap/api/routes_settings.py:2106 |
| `remove_embedding_model` | src/memorymap/api/routes_settings.py:2080 |
| `restart_app` | src/memorymap/api/routes_settings.py:1226 |
| `server_log_stats` | src/memorymap/api/routes_settings.py:2158 |
| `server_logs` | src/memorymap/api/routes_settings.py:2087 |
| `set_console_mode` | src/memorymap/api/routes_settings.py:1157 |
| `stream_server_logs` | src/memorymap/api/routes_settings.py:2186 |
| `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:190 |
| `support_bundle` | src/memorymap/api/routes_settings.py:2351 |
| `undo_actor` | src/memorymap/api/routes_settings.py:1760 |
| `uninstall_extra` | src/memorymap/api/routes_settings.py:1932 |
| `update_memory` | src/memorymap/api/routes_settings.py:1542 |
| `update_preferences` | src/memorymap/api/routes_settings.py:984 |
| `use_embedding_model` | src/memorymap/api/routes_settings.py:2001 |

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

### src/memorymap/api/routes_tasks.py (24)

| Name | File:line |
|---|---|
| `CancelTaskBody` | src/memorymap/api/routes_tasks.py:636 |
| `_ledger_rows` | src/memorymap/api/routes_tasks.py:413 |
| `_model_state` | src/memorymap/api/routes_tasks.py:833 |
| `_percent` | src/memorymap/api/routes_tasks.py:43 |
| `_stamp_started` | src/memorymap/api/routes_tasks.py:474 |
| `_stop_filing` | src/memorymap/api/routes_tasks.py:500 |
| `activity_rows` | src/memorymap/api/routes_tasks.py:846 |
| `cancel_job` | src/memorymap/api/routes_tasks.py:567 |
| `cancel_task` | src/memorymap/api/routes_tasks.py:646 |
| `clear_history` | src/memorymap/api/routes_tasks.py:748 |
| `clear_last_autonomous_pass` | src/memorymap/api/routes_tasks.py:739 |
| `collect` | src/memorymap/api/routes_tasks.py:51 |
| `desktop_fullscreen_state` | src/memorymap/api/routes_tasks.py:763 |
| `desktop_fullscreen_toggle` | src/memorymap/api/routes_tasks.py:775 |
| `jobs_last_runs` | src/memorymap/api/routes_tasks.py:525 |
| `jobs_stream` | src/memorymap/api/routes_tasks.py:586 |
| `last_autonomous_pass` | src/memorymap/api/routes_tasks.py:722 |
| `list_activity` | src/memorymap/api/routes_tasks.py:893 |
| `list_jobs` | src/memorymap/api/routes_tasks.py:559 |
| `list_tasks` | src/memorymap/api/routes_tasks.py:511 |
| `run_pass_now` | src/memorymap/api/routes_tasks.py:545 |
| `shutdown` | src/memorymap/api/routes_tasks.py:787 |
| `stop_activity` | src/memorymap/api/routes_tasks.py:902 |
| `trigger_autonomous` | src/memorymap/api/routes_tasks.py:685 |

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

### src/memorymap/api/routes_timeline.py (22)

| Name | File:line |
|---|---|
| `_MeetingAt` | src/memorymap/api/routes_timeline.py:263 |
| `_bands` | src/memorymap/api/routes_timeline.py:732 |
| `_bucket_start` | src/memorymap/api/routes_timeline.py:166 |
| `_clip` | src/memorymap/api/routes_timeline.py:71 |
| `_decode_cursor` | src/memorymap/api/routes_timeline.py:80 |
| `_decode_marks` | src/memorymap/api/routes_timeline.py:136 |
| `_density` | src/memorymap/api/routes_timeline.py:709 |
| `_encode_marks` | src/memorymap/api/routes_timeline.py:119 |
| `_entries_in_window` | src/memorymap/api/routes_timeline.py:689 |
| `_first_line` | src/memorymap/api/routes_timeline.py:627 |
| `_first_mentioned` | src/memorymap/api/routes_timeline.py:646 |
| `_meeting_date` | src/memorymap/api/routes_timeline.py:658 |
| `_meeting_dates` | src/memorymap/api/routes_timeline.py:274 |
| `_naive` | src/memorymap/api/routes_timeline.py:638 |
| `_older_than` | src/memorymap/api/routes_timeline.py:158 |
| `_place_documents` | src/memorymap/api/routes_timeline.py:303 |
| `_place_notes` | src/memorymap/api/routes_timeline.py:177 |
| `_place_reminders` | src/memorymap/api/routes_timeline.py:339 |
| `_ranged_entries` | src/memorymap/api/routes_timeline.py:680 |
| `_requested_kinds` | src/memorymap/api/routes_timeline.py:98 |
| `_thread_bands` | src/memorymap/api/routes_timeline.py:761 |
| `timeline` | src/memorymap/api/routes_timeline.py:376 |

### src/memorymap/api/routes_translate.py (2)

| Name | File:line |
|---|---|
| `status` | src/memorymap/api/routes_translate.py:23 |
| `translate_file` | src/memorymap/api/routes_translate.py:28 |

### src/memorymap/api/routes_update.py (21)

| Name | File:line |
|---|---|
| `_ApplyState` | src/memorymap/api/routes_update.py:152 |
| `_ChoiceBody` | src/memorymap/api/routes_update.py:410 |
| `_SourceUpdateState` | src/memorymap/api/routes_update.py:604 |
| `_can_auto_apply` | src/memorymap/api/routes_update.py:145 |
| `_download` | src/memorymap/api/routes_update.py:200 |
| `_download_url_is_allowed` | src/memorymap/api/routes_update.py:89 |
| `_exit_once_launched` | src/memorymap/api/routes_update.py:763 |
| `_reset_source_status_for_tests` | src/memorymap/api/routes_update.py:623 |
| `_run_apply` | src/memorymap/api/routes_update.py:270 |
| `_version_tuple` | src/memorymap/api/routes_update.py:125 |
| `_windows_asset` | src/memorymap/api/routes_update.py:133 |
| `apply_launcher_choice` | src/memorymap/api/routes_update.py:398 |
| `apply_status` | src/memorymap/api/routes_update.py:759 |
| `apply_update` | src/memorymap/api/routes_update.py:665 |
| `check_for_update` | src/memorymap/api/routes_update.py:430 |
| `current` | src/memorymap/api/routes_update.py:181 |
| `list_releases` | src/memorymap/api/routes_update.py:559 |
| `record_update_choice` | src/memorymap/api/routes_update.py:381 |
| `reset_for_tests` | src/memorymap/api/routes_update.py:173 |
| `source_update_status` | src/memorymap/api/routes_update.py:629 |
| `update_choice` | src/memorymap/api/routes_update.py:415 |

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
| `_require_web_search` | src/memorymap/api/routes_websearch.py:24 |
| `detect_searxng` | src/memorymap/api/routes_websearch.py:95 |
| `searxng_reinstall` | src/memorymap/api/routes_websearch.py:169 |
| `searxng_start` | src/memorymap/api/routes_websearch.py:136 |
| `searxng_status` | src/memorymap/api/routes_websearch.py:122 |
| `searxng_stop` | src/memorymap/api/routes_websearch.py:200 |
| `web_read` | src/memorymap/api/routes_websearch.py:219 |
| `web_search` | src/memorymap/api/routes_websearch.py:55 |
| `web_search_providers` | src/memorymap/api/routes_websearch.py:38 |

### src/memorymap/api/routes_whiteboard.py (141)

| Name | File:line |
|---|---|
| `BoardBackground` | src/memorymap/api/routes_whiteboard.py:1343 |
| `BoardCreate` | src/memorymap/api/routes_whiteboard.py:1534 |
| `BoardImageOut` | src/memorymap/api/routes_whiteboard.py:2438 |
| `BoardLayer` | src/memorymap/api/routes_whiteboard.py:1252 |
| `BoardOut` | src/memorymap/api/routes_whiteboard.py:1439 |
| `BoardRename` | src/memorymap/api/routes_whiteboard.py:2675 |
| `BoardTypeMixin` | src/memorymap/api/routes_whiteboard.py:1508 |
| `MapClearStyleOut` | src/memorymap/api/routes_whiteboard.py:4038 |
| `MapGenerate` | src/memorymap/api/routes_whiteboard.py:5615 |
| `MapImport` | src/memorymap/api/routes_whiteboard.py:4821 |
| `MapNodeCreate` | src/memorymap/api/routes_whiteboard.py:3596 |
| `MapNodeMove` | src/memorymap/api/routes_whiteboard.py:3772 |
| `MapNodeMoveOne` | src/memorymap/api/routes_whiteboard.py:3863 |
| `MapNodesMove` | src/memorymap/api/routes_whiteboard.py:3878 |
| `MapOutlinePaste` | src/memorymap/api/routes_whiteboard.py:3701 |
| `MapProposal` | src/memorymap/api/routes_whiteboard.py:5457 |
| `MapTreeOut` | src/memorymap/api/routes_whiteboard.py:3530 |
| `WhiteboardComment` | src/memorymap/api/routes_whiteboard.py:270 |
| `WhiteboardNodeBase` | src/memorymap/api/routes_whiteboard.py:295 |
| `WhiteboardNodeOut` | src/memorymap/api/routes_whiteboard.py:318 |
| `WhiteboardObjectBase` | src/memorymap/api/routes_whiteboard.py:694 |
| `WhiteboardObjectData` | src/memorymap/api/routes_whiteboard.py:339 |
| `WhiteboardObjectOut` | src/memorymap/api/routes_whiteboard.py:717 |
| `WhiteboardSketchBase` | src/memorymap/api/routes_whiteboard.py:324 |
| `WhiteboardSketchOut` | src/memorymap/api/routes_whiteboard.py:333 |
| `WhiteboardStateOut` | src/memorymap/api/routes_whiteboard.py:828 |
| `_PathEnd` | src/memorymap/api/routes_whiteboard.py:1838 |
| `_apply_board_look` | src/memorymap/api/routes_whiteboard.py:2697 |
| `_apply_comments` | src/memorymap/api/routes_whiteboard.py:2818 |
| `_board_background` | src/memorymap/api/routes_whiteboard.py:1381 |
| `_board_entry` | src/memorymap/api/routes_whiteboard.py:3560 |
| `_board_filter` | src/memorymap/api/routes_whiteboard.py:838 |
| `_board_layers` | src/memorymap/api/routes_whiteboard.py:1273 |
| `_board_numbered` | src/memorymap/api/routes_whiteboard.py:1209 |
| `_board_palette` | src/memorymap/api/routes_whiteboard.py:1654 |
| `_board_preview` | src/memorymap/api/routes_whiteboard.py:1946 |
| `_board_settings` | src/memorymap/api/routes_whiteboard.py:1003 |
| `_board_theme` | src/memorymap/api/routes_whiteboard.py:1132 |
| `_build_tree` | src/memorymap/api/routes_whiteboard.py:3423 |
| `_clean_import_style` | src/memorymap/api/routes_whiteboard.py:4911 |
| `_clean_levels` | src/memorymap/api/routes_whiteboard.py:1098 |
| `_clean_theme` | src/memorymap/api/routes_whiteboard.py:1056 |
| `_cross_links` | src/memorymap/api/routes_whiteboard.py:3498 |
| `_delete_one_object` | src/memorymap/api/routes_whiteboard.py:3163 |
| `_drop_orphan_links` | src/memorymap/api/routes_whiteboard.py:953 |
| `_export_freemind` | src/memorymap/api/routes_whiteboard.py:4536 |
| `_export_markdown` | src/memorymap/api/routes_whiteboard.py:4251 |
| `_export_node_id` | src/memorymap/api/routes_whiteboard.py:4532 |
| `_export_opml` | src/memorymap/api/routes_whiteboard.py:4452 |
| `_export_text` | src/memorymap/api/routes_whiteboard.py:4292 |
| `_export_tree` | src/memorymap/api/routes_whiteboard.py:4149 |
| `_export_xmind` | src/memorymap/api/routes_whiteboard.py:4696 |
| `_first_cycle` | src/memorymap/api/routes_whiteboard.py:3895 |
| `_flatten_parsed` | src/memorymap/api/routes_whiteboard.py:5738 |
| `_forget_links_to` | src/memorymap/api/routes_whiteboard.py:848 |
| `_freemind_style` | src/memorymap/api/routes_whiteboard.py:4945 |
| `_import_link_targets` | src/memorymap/api/routes_whiteboard.py:4987 |
| `_is_descendant` | src/memorymap/api/routes_whiteboard.py:3778 |
| `_is_link_sketch` | src/memorymap/api/routes_whiteboard.py:1429 |
| `_is_one_emoji` | src/memorymap/api/routes_whiteboard.py:228 |
| `_map_branch_colors` | src/memorymap/api/routes_whiteboard.py:1659 |
| `_map_kind_ok` | src/memorymap/api/routes_whiteboard.py:3213 |
| `_map_node_dict` | src/memorymap/api/routes_whiteboard.py:3395 |
| `_map_node_style` | src/memorymap/api/routes_whiteboard.py:3381 |
| `_map_objects` | src/memorymap/api/routes_whiteboard.py:3467 |
| `_markdown_note_lines` | src/memorymap/api/routes_whiteboard.py:4313 |
| `_next_position` | src/memorymap/api/routes_whiteboard.py:3611 |
| `_note_titles` | src/memorymap/api/routes_whiteboard.py:5484 |
| `_object_data` | src/memorymap/api/routes_whiteboard.py:3324 |
| `_object_to_out` | src/memorymap/api/routes_whiteboard.py:777 |
| `_on_current_layer` | src/memorymap/api/routes_whiteboard.py:1328 |
| `_opml_style` | src/memorymap/api/routes_whiteboard.py:4970 |
| `_outline_covering` | src/memorymap/api/routes_whiteboard.py:5528 |
| `_outline_from_filing` | src/memorymap/api/routes_whiteboard.py:5499 |
| `_outline_from_paste` | src/memorymap/api/routes_whiteboard.py:3711 |
| `_outline_numbers` | src/memorymap/api/routes_whiteboard.py:4188 |
| `_outline_rows` | src/memorymap/api/routes_whiteboard.py:4118 |
| `_parent_map` | src/memorymap/api/routes_whiteboard.py:3885 |
| `_parse_freemind` | src/memorymap/api/routes_whiteboard.py:4998 |
| `_parse_markdown_outline` | src/memorymap/api/routes_whiteboard.py:5230 |
| `_parse_opml` | src/memorymap/api/routes_whiteboard.py:5062 |
| `_parse_xmind` | src/memorymap/api/routes_whiteboard.py:5149 |
| `_parse_xml_document` | src/memorymap/api/routes_whiteboard.py:4846 |
| `_path_bbox` | src/memorymap/api/routes_whiteboard.py:1776 |
| `_place_map_nodes` | src/memorymap/api/routes_whiteboard.py:5313 |
| `_preview_fields` | src/memorymap/api/routes_whiteboard.py:2205 |
| `_preview_fingerprint` | src/memorymap/api/routes_whiteboard.py:2164 |
| `_preview_items` | src/memorymap/api/routes_whiteboard.py:1889 |
| `_preview_points` | src/memorymap/api/routes_whiteboard.py:1544 |
| `_preview_size` | src/memorymap/api/routes_whiteboard.py:1737 |
| `_proposal_notes` | src/memorymap/api/routes_whiteboard.py:5465 |
| `_record_map_creation` | src/memorymap/api/routes_whiteboard.py:5628 |
| `_reference_facets` | src/memorymap/api/routes_whiteboard.py:3293 |
| `_reference_label` | src/memorymap/api/routes_whiteboard.py:3257 |
| `_require_board` | src/memorymap/api/routes_whiteboard.py:900 |
| `_require_entry` | src/memorymap/api/routes_whiteboard.py:893 |
| `_require_object_data` | src/memorymap/api/routes_whiteboard.py:804 |
| `_require_reference` | src/memorymap/api/routes_whiteboard.py:3225 |
| `_require_table_cells` | src/memorymap/api/routes_whiteboard.py:794 |
| `_restore_import_links` | src/memorymap/api/routes_whiteboard.py:5384 |
| `_sibling_key` | src/memorymap/api/routes_whiteboard.py:3489 |
| `_sketch_preview` | src/memorymap/api/routes_whiteboard.py:1849 |
| `_store_board_background` | src/memorymap/api/routes_whiteboard.py:1405 |
| `_store_board_layers` | src/memorymap/api/routes_whiteboard.py:1291 |
| `_store_board_numbered` | src/memorymap/api/routes_whiteboard.py:1227 |
| `_store_board_settings` | src/memorymap/api/routes_whiteboard.py:1030 |
| `_store_board_theme` | src/memorymap/api/routes_whiteboard.py:1145 |
| `_strip_outline_numbers` | src/memorymap/api/routes_whiteboard.py:4222 |
| `_subtree` | src/memorymap/api/routes_whiteboard.py:3132 |
| `_themed_style` | src/memorymap/api/routes_whiteboard.py:1179 |
| `_without_pins` | src/memorymap/api/routes_whiteboard.py:1197 |
| `_xmind_marks` | src/memorymap/api/routes_whiteboard.py:5139 |
| `_xmind_style` | src/memorymap/api/routes_whiteboard.py:5121 |
| `_xmind_topic` | src/memorymap/api/routes_whiteboard.py:4667 |
| `_xml_attribute` | src/memorymap/api/routes_whiteboard.py:4437 |
| `board_tree` | src/memorymap/api/routes_whiteboard.py:3570 |
| `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:4063 |
| `create_board` | src/memorymap/api/routes_whiteboard.py:2515 |
| `create_map_node` | src/memorymap/api/routes_whiteboard.py:3640 |
| `create_node` | src/memorymap/api/routes_whiteboard.py:2827 |
| `create_object` | src/memorymap/api/routes_whiteboard.py:3009 |
| `create_sketch` | src/memorymap/api/routes_whiteboard.py:2925 |
| `current_layer` | src/memorymap/api/routes_whiteboard.py:1316 |
| `delete_node` | src/memorymap/api/routes_whiteboard.py:2904 |
| `delete_object` | src/memorymap/api/routes_whiteboard.py:3087 |
| `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2980 |
| `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2557 |
| `export_board` | src/memorymap/api/routes_whiteboard.py:4741 |
| `generate_map` | src/memorymap/api/routes_whiteboard.py:5676 |
| `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:928 |
| `import_board` | src/memorymap/api/routes_whiteboard.py:5750 |
| `list_boards` | src/memorymap/api/routes_whiteboard.py:2257 |
| `list_images` | src/memorymap/api/routes_whiteboard.py:2446 |
| `move_map_node` | src/memorymap/api/routes_whiteboard.py:3811 |
| `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3926 |
| `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3736 |
| `propose_map` | src/memorymap/api/routes_whiteboard.py:5547 |
| `rename_board` | src/memorymap/api/routes_whiteboard.py:2721 |
| `update_node` | src/memorymap/api/routes_whiteboard.py:2872 |
| `update_object` | src/memorymap/api/routes_whiteboard.py:3053 |
| `update_sketch` | src/memorymap/api/routes_whiteboard.py:2955 |

### src/memorymap/api/run_sandbox.py (20)

| Name | File:line |
|---|---|
| `RunJobBody` | src/memorymap/api/run_sandbox.py:1541 |
| `_MMDebugger` | src/memorymap/api/run_sandbox.py:1041 |
| `_MMFrameAt` | src/memorymap/api/run_sandbox.py:1219 |
| `_MMOut` | src/memorymap/api/run_sandbox.py:784 |
| `_mm_debug` | src/memorymap/api/run_sandbox.py:1150 |
| `_mm_eval` | src/memorymap/api/run_sandbox.py:879 |
| `_mm_input` | src/memorymap/api/run_sandbox.py:823 |
| `_mm_line` | src/memorymap/api/run_sandbox.py:906 |
| `_mm_names` | src/memorymap/api/run_sandbox.py:1030 |
| `_mm_run` | src/memorymap/api/run_sandbox.py:846 |
| `_mm_show` | src/memorymap/api/run_sandbox.py:1022 |
| `_mm_tests` | src/memorymap/api/run_sandbox.py:918 |
| `_run_job` | src/memorymap/api/run_sandbox.py:1545 |
| `beat_run_job` | src/memorymap/api/run_sandbox.py:1567 |
| `end_run_job` | src/memorymap/api/run_sandbox.py:1575 |
| `pyodide_file` | src/memorymap/api/run_sandbox.py:1486 |
| `python_csp` | src/memorymap/api/run_sandbox.py:760 |
| `run_sandbox` | src/memorymap/api/run_sandbox.py:714 |
| `run_sandbox_python` | src/memorymap/api/run_sandbox.py:1456 |
| `start_run_job` | src/memorymap/api/run_sandbox.py:1555 |

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

### src/memorymap/api/this_computer.py (2)

| Name | File:line |
|---|---|
| `is_another_device` | src/memorymap/api/this_computer.py:32 |
| `this_computer_only` | src/memorymap/api/this_computer.py:46 |

### src/memorymap/api/versioning.py (2)

| Name | File:line |
|---|---|
| `ApiVersionMiddleware` | src/memorymap/api/versioning.py:36 |
| `is_versioned` | src/memorymap/api/versioning.py:72 |

### src/memorymap/core/activity.py (16)

| Name | File:line |
|---|---|
| `Job` | src/memorymap/core/activity.py:46 |
| `StreamNarrator` | src/memorymap/core/activity.py:269 |
| `_no_icon` | src/memorymap/core/activity.py:263 |
| `_prune` | src/memorymap/core/activity.py:150 |
| `clear` | src/memorymap/core/activity.py:395 |
| `count` | src/memorymap/core/activity.py:156 |
| `finish` | src/memorymap/core/activity.py:162 |
| `get` | src/memorymap/core/activity.py:368 |
| `recent` | src/memorymap/core/activity.py:179 |
| `snapshot` | src/memorymap/core/activity.py:389 |
| `start` | src/memorymap/core/activity.py:125 |
| `stop` | src/memorymap/core/activity.py:374 |
| `stop_kind` | src/memorymap/core/activity.py:381 |
| `tool_arguments_in_words` | src/memorymap/core/activity.py:242 |
| `track` | src/memorymap/core/activity.py:187 |
| `tracked_stream` | src/memorymap/core/activity.py:214 |

### src/memorymap/core/atomic_io.py (3)

| Name | File:line |
|---|---|
| `_replace` | src/memorymap/core/atomic_io.py:30 |
| `atomic_write_json` | src/memorymap/core/atomic_io.py:79 |
| `atomic_write_text` | src/memorymap/core/atomic_io.py:53 |

### src/memorymap/core/backup.py (24)

| Name | File:line |
|---|---|
| `DamagedNotebookError` | src/memorymap/core/backup.py:324 |
| `_newest_key` | src/memorymap/core/backup.py:112 |
| `_read_record` | src/memorymap/core/backup.py:54 |
| `_record_path` | src/memorymap/core/backup.py:42 |
| `_sweep_partials` | src/memorymap/core/backup.py:377 |
| `_write_record` | src/memorymap/core/backup.py:46 |
| `backup_files` | src/memorymap/core/backup.py:84 |
| `backup_if_due` | src/memorymap/core/backup.py:406 |
| `backup_is_due` | src/memorymap/core/backup.py:388 |
| `backup_now` | src/memorymap/core/backup.py:196 |
| `backup_path` | src/memorymap/core/backup.py:73 |
| `backups_dir` | src/memorymap/core/backup.py:67 |
| `check_at_boot` | src/memorymap/core/backup.py:289 |
| `damaged_notebook_words` | src/memorymap/core/backup.py:328 |
| `forget_boot_check` | src/memorymap/core/backup.py:350 |
| `forget_record` | src/memorymap/core/backup.py:62 |
| `list_backups` | src/memorymap/core/backup.py:124 |
| `optimize_fts` | src/memorymap/core/backup.py:155 |
| `prune` | src/memorymap/core/backup.py:356 |
| `restore_backup` | src/memorymap/core/backup.py:424 |
| `restore_file` | src/memorymap/core/backup.py:436 |
| `snapshot` | src/memorymap/core/backup.py:180 |
| `strip_leftovers` | src/memorymap/core/backup.py:169 |
| `verify_copy` | src/memorymap/core/backup.py:262 |

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

### src/memorymap/core/config.py (7)

| Name | File:line |
|---|---|
| `ConfigManager` | src/memorymap/core/config.py:286 |
| `_default_data_dir` | src/memorymap/core/config.py:197 |
| `_owner_only` | src/memorymap/core/config.py:246 |
| `days_from_today` | src/memorymap/core/config.py:375 |
| `default_preferences` | src/memorymap/core/config.py:263 |
| `resolved_data_dir` | src/memorymap/core/config.py:227 |
| `user_now` | src/memorymap/core/config.py:388 |

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
| `AskTurn` | src/memorymap/core/database.py:1036 |
| `Attachment` | src/memorymap/core/database.py:959 |
| `AuditLog` | src/memorymap/core/database.py:2092 |
| `Base` | src/memorymap/core/database.py:128 |
| `BinnedReading` | src/memorymap/core/database.py:1620 |
| `BoardLibrary` | src/memorymap/core/database.py:1868 |
| `BoardLibraryItem` | src/memorymap/core/database.py:1886 |
| `BoardLibraryMark` | src/memorymap/core/database.py:1910 |
| `Bookmark` | src/memorymap/core/database.py:1082 |
| `Category` | src/memorymap/core/database.py:274 |
| `ChunkVector` | src/memorymap/core/database.py:884 |
| `Conversation` | src/memorymap/core/database.py:1001 |
| `DatabaseManager` | src/memorymap/core/database.py:2273 |
| `DateTime` | src/memorymap/core/database.py:90 |
| `DerivedFact` | src/memorymap/core/database.py:1225 |
| `DerivedTension` | src/memorymap/core/database.py:1291 |
| `Document` | src/memorymap/core/database.py:1424 |
| `DocumentAiEdit` | src/memorymap/core/database.py:1478 |
| `DocumentBookmark` | src/memorymap/core/database.py:1138 |
| `DocumentLink` | src/memorymap/core/database.py:1455 |
| `DocumentRevision` | src/memorymap/core/database.py:1704 |
| `DurableJob` | src/memorymap/core/database.py:2021 |
| `EmbeddingRecord` | src/memorymap/core/database.py:869 |
| `Entity` | src/memorymap/core/database.py:540 |
| `EntityMention` | src/memorymap/core/database.py:580 |
| `Entry` | src/memorymap/core/database.py:309 |
| `EntryBookmark` | src/memorymap/core/database.py:1118 |
| `EntryDate` | src/memorymap/core/database.py:1402 |
| `EntryLink` | src/memorymap/core/database.py:695 |
| `EntryOpen` | src/memorymap/core/database.py:1381 |
| `EntryProperty` | src/memorymap/core/database.py:767 |
| `EntryRevision` | src/memorymap/core/database.py:1363 |
| `JobRun` | src/memorymap/core/database.py:1994 |
| `LinkProps` | src/memorymap/core/database.py:629 |
| `LinkReason` | src/memorymap/core/database.py:591 |
| `MediaUpload` | src/memorymap/core/database.py:1922 |
| `NightRun` | src/memorymap/core/database.py:1334 |
| `NoteScore` | src/memorymap/core/database.py:1195 |
| `NoteType` | src/memorymap/core/database.py:789 |
| `PageRead` | src/memorymap/core/database.py:1518 |
| `Recording` | src/memorymap/core/database.py:1653 |
| `RelationType` | src/memorymap/core/database.py:749 |
| `Reminder` | src/memorymap/core/database.py:1154 |
| `Space` | src/memorymap/core/database.py:131 |
| `StagedEmbedding` | src/memorymap/core/database.py:932 |
| `User` | src/memorymap/core/database.py:239 |
| `UserPreference` | src/memorymap/core/database.py:2064 |
| `Vault` | src/memorymap/core/database.py:250 |
| `WhiteboardNode` | src/memorymap/core/database.py:1746 |
| `WhiteboardObject` | src/memorymap/core/database.py:1805 |
| `WhiteboardSketch` | src/memorymap/core/database.py:1788 |
| `WorkspaceMixin` | src/memorymap/core/database.py:153 |
| `_add_workspace_filter` | src/memorymap/core/database.py:176 |
| `_ensure_alembic_baseline` | src/memorymap/core/database.py:2168 |
| `_hide_binned` | src/memorymap/core/database.py:215 |
| `_migrations_root` | src/memorymap/core/database.py:2133 |
| `_only_a_person_moves_a_boards_time` | src/memorymap/core/database.py:680 |
| `_safety_copy_before_migrating` | src/memorymap/core/database.py:2148 |
| `_set_workspace` | src/memorymap/core/database.py:230 |
| `_stamp_done_at` | src/memorymap/core/database.py:1188 |
| `like_escape` | src/memorymap/core/database.py:62 |
| `link_strength` | src/memorymap/core/database.py:846 |
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

### src/memorymap/core/egress.py (29)

| Name | File:line |
|---|---|
| `_add_purpose` | src/memorymap/core/egress.py:181 |
| `_caller` | src/memorymap/core/egress.py:227 |
| `_current_purpose` | src/memorymap/core/egress.py:173 |
| `_flush_job` | src/memorymap/core/egress.py:452 |
| `_flush_locked` | src/memorymap/core/egress.py:517 |
| `_hook` | src/memorymap/core/egress.py:285 |
| `_is_address` | src/memorymap/core/egress.py:219 |
| `_now_iso` | src/memorymap/core/egress.py:188 |
| `_read_ledger` | src/memorymap/core/egress.py:407 |
| `_record` | src/memorymap/core/egress.py:246 |
| `_row_out` | src/memorymap/core/egress.py:364 |
| `_row_with_history` | src/memorymap/core/egress.py:501 |
| `_schedule_flush` | src/memorymap/core/egress.py:431 |
| `_stored_rows` | src/memorymap/core/egress.py:493 |
| `_take_unflushed` | src/memorymap/core/egress.py:472 |
| `configure` | src/memorymap/core/egress.py:418 |
| `destinations` | src/memorymap/core/egress.py:382 |
| `flush` | src/memorymap/core/egress.py:460 |
| `install` | src/memorymap/core/egress.py:319 |
| `installed` | src/memorymap/core/egress.py:338 |
| `labelled` | src/memorymap/core/egress.py:148 |
| `purpose` | src/memorymap/core/egress.py:132 |
| `recent` | src/memorymap/core/egress.py:389 |
| `reset` | src/memorymap/core/egress.py:342 |
| `scope_of` | src/memorymap/core/egress.py:192 |
| `short` | src/memorymap/core/egress.py:167 |
| `since` | src/memorymap/core/egress.py:355 |
| `totals` | src/memorymap/core/egress.py:359 |
| `verdict` | src/memorymap/core/egress.py:398 |

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
| `DownloadState` | src/memorymap/core/embedmodels.py:330 |
| `EmbedModel` | src/memorymap/core/embedmodels.py:49 |
| `OllamaEmbedModel` | src/memorymap/core/embedmodels.py:208 |
| `_begin_download` | src/memorymap/core/embedmodels.py:596 |
| `_dir_size` | src/memorymap/core/embedmodels.py:391 |
| `_human_size` | src/memorymap/core/embedmodels.py:407 |
| `_in_use` | src/memorymap/core/embedmodels.py:791 |
| `_log` | src/memorymap/core/embedmodels.py:477 |
| `_looks_like_a_dropped_connection` | src/memorymap/core/embedmodels.py:511 |
| `_model_dir` | src/memorymap/core/embedmodels.py:371 |
| `_run_download` | src/memorymap/core/embedmodels.py:515 |
| `_spawn_download` | src/memorymap/core/embedmodels.py:612 |
| `cache_root` | src/memorymap/core/embedmodels.py:353 |
| `can_download` | src/memorymap/core/embedmodels.py:415 |
| `cancel` | src/memorymap/core/embedmodels.py:455 |
| `catalogue` | src/memorymap/core/embedmodels.py:270 |
| `current` | src/memorymap/core/embedmodels.py:451 |
| `hub_metadata` | src/memorymap/core/embedmodels.py:645 |
| `hub_refusal` | src/memorymap/core/embedmodels.py:675 |
| `is_downloaded` | src/memorymap/core/embedmodels.py:379 |
| `parse_typed_name` | src/memorymap/core/embedmodels.py:629 |
| `prefix_for` | src/memorymap/core/embedmodels.py:264 |
| `remove` | src/memorymap/core/embedmodels.py:730 |
| `reset_for_tests` | src/memorymap/core/embedmodels.py:798 |
| `resolve_choice` | src/memorymap/core/embedmodels.py:319 |
| `set_in_use_check` | src/memorymap/core/embedmodels.py:786 |
| `start` | src/memorymap/core/embedmodels.py:580 |
| `start_typed` | src/memorymap/core/embedmodels.py:702 |
| `status` | src/memorymap/core/embedmodels.py:426 |

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
| `Download` | src/memorymap/core/extra_downloads.py:79 |
| `DownloadFailed` | src/memorymap/core/extra_downloads.py:242 |
| `_check_engine` | src/memorymap/core/extra_downloads.py:325 |
| `_fetch` | src/memorymap/core/extra_downloads.py:297 |
| `_is_musl` | src/memorymap/core/extra_downloads.py:128 |
| `_mb` | src/memorymap/core/extra_downloads.py:293 |
| `_open_url` | src/memorymap/core/extra_downloads.py:235 |
| `_unpack` | src/memorymap/core/extra_downloads.py:343 |
| `downloads_for` | src/memorymap/core/extra_downloads.py:145 |
| `effective_url` | src/memorymap/core/extra_downloads.py:227 |
| `folder` | src/memorymap/core/extra_downloads.py:194 |
| `install` | src/memorymap/core/extra_downloads.py:384 |
| `is_installed` | src/memorymap/core/extra_downloads.py:198 |
| `platform_key` | src/memorymap/core/extra_downloads.py:109 |
| `platform_reason` | src/memorymap/core/extra_downloads.py:151 |
| `reason` | src/memorymap/core/extra_downloads.py:287 |
| `root_dir` | src/memorymap/core/extra_downloads.py:186 |
| `source` | src/memorymap/core/extra_downloads.py:211 |
| `uninstall` | src/memorymap/core/extra_downloads.py:426 |
| `url_allowed` | src/memorymap/core/extra_downloads.py:167 |

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

### src/memorymap/core/ics_import.py (13)

| Name | File:line |
|---|---|
| `IcsReading` | src/memorymap/core/ics_import.py:52 |
| `IcsReminder` | src/memorymap/core/ics_import.py:35 |
| `_alert` | src/memorymap/core/ics_import.py:129 |
| `_apply` | src/memorymap/core/ics_import.py:159 |
| `_close` | src/memorymap/core/ics_import.py:204 |
| `_own_id` | src/memorymap/core/ics_import.py:151 |
| `_priority` | src/memorymap/core/ics_import.py:116 |
| `_split` | src/memorymap/core/ics_import.py:68 |
| `_to_utc` | src/memorymap/core/ics_import.py:112 |
| `_unescape` | src/memorymap/core/ics_import.py:79 |
| `_unfold` | src/memorymap/core/ics_import.py:57 |
| `_when` | src/memorymap/core/ics_import.py:93 |
| `read` | src/memorymap/core/ics_import.py:179 |

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

### src/memorymap/core/jobruns.py (21)

| Name | File:line |
|---|---|
| `Run` | src/memorymap/core/jobruns.py:229 |
| `_bump` | src/memorymap/core/jobruns.py:159 |
| `_clip` | src/memorymap/core/jobruns.py:85 |
| `_database` | src/memorymap/core/jobruns.py:118 |
| `_failure_reason` | src/memorymap/core/jobruns.py:90 |
| `begin` | src/memorymap/core/jobruns.py:497 |
| `clear_finished` | src/memorymap/core/jobruns.py:187 |
| `clear_live` | src/memorymap/core/jobruns.py:201 |
| `current` | src/memorymap/core/jobruns.py:217 |
| `describe_night_pass` | src/memorymap/core/jobruns.py:625 |
| `finished` | src/memorymap/core/jobruns.py:181 |
| `job_run` | src/memorymap/core/jobruns.py:507 |
| `last_runs` | src/memorymap/core/jobruns.py:583 |
| `live` | src/memorymap/core/jobruns.py:210 |
| `mark_interrupted` | src/memorymap/core/jobruns.py:556 |
| `merged_history` | src/memorymap/core/jobruns.py:468 |
| `note_finished` | src/memorymap/core/jobruns.py:528 |
| `peek_database` | src/memorymap/core/jobruns.py:122 |
| `set_database_source` | src/memorymap/core/jobruns.py:111 |
| `started_by` | src/memorymap/core/jobruns.py:169 |
| `version` | src/memorymap/core/jobruns.py:164 |

### src/memorymap/core/jobs.py (12)

| Name | File:line |
|---|---|
| `Pool` | src/memorymap/core/jobs.py:236 |
| `_Job` | src/memorymap/core/jobs.py:202 |
| `_cpu_width` | src/memorymap/core/jobs.py:65 |
| `_ledger_run` | src/memorymap/core/jobs.py:162 |
| `_start_heartbeat` | src/memorymap/core/jobs.py:174 |
| `enqueue` | src/memorymap/core/jobs.py:567 |
| `forget` | src/memorymap/core/jobs.py:586 |
| `pending` | src/memorymap/core/jobs.py:578 |
| `pool` | src/memorymap/core/jobs.py:553 |
| `resubmit` | src/memorymap/core/jobs.py:582 |
| `resume` | src/memorymap/core/jobs.py:594 |
| `shutdown` | src/memorymap/core/jobs.py:609 |

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

### src/memorymap/core/lancert.py (22)

| Name | File:line |
|---|---|
| `CertInfo` | src/memorymap/core/lancert.py:71 |
| `_constraint_trees` | src/memorymap/core/lancert.py:195 |
| `_covers` | src/memorymap/core/lancert.py:219 |
| `_fingerprint` | src/memorymap/core/lancert.py:124 |
| `_new_authority` | src/memorymap/core/lancert.py:242 |
| `_norm` | src/memorymap/core/lancert.py:366 |
| `_not_after` | src/memorymap/core/lancert.py:143 |
| `_now` | src/memorymap/core/lancert.py:90 |
| `_private` | src/memorymap/core/lancert.py:150 |
| `_read_authority` | src/memorymap/core/lancert.py:182 |
| `_san_names` | src/memorymap/core/lancert.py:131 |
| `_write_private` | src/memorymap/core/lancert.py:155 |
| `authority_paths` | src/memorymap/core/lancert.py:99 |
| `authority_pem` | src/memorymap/core/lancert.py:358 |
| `default_names` | src/memorymap/core/lancert.py:104 |
| `ensure` | src/memorymap/core/lancert.py:380 |
| `generate` | src/memorymap/core/lancert.py:288 |
| `missing_names` | src/memorymap/core/lancert.py:374 |
| `paths` | src/memorymap/core/lancert.py:94 |
| `read` | src/memorymap/core/lancert.py:163 |
| `reload` | src/memorymap/core/lancert.py:421 |
| `set_live_context` | src/memorymap/core/lancert.py:416 |

### src/memorymap/core/lanserve.py (11)

| Name | File:line |
|---|---|
| `_FirstByteWatcher` | src/memorymap/core/lanserve.py:116 |
| `_accept` | src/memorymap/core/lanserve.py:297 |
| `_answer_plain_http` | src/memorymap/core/lanserve.py:229 |
| `_port_step` | src/memorymap/core/lanserve.py:273 |
| `_refresh_network` | src/memorymap/core/lanserve.py:265 |
| `_route` | src/memorymap/core/lanserve.py:244 |
| `client_allowed` | src/memorymap/core/lanserve.py:101 |
| `own_v6_prefixes` | src/memorymap/core/lanserve.py:73 |
| `redirect_response` | src/memorymap/core/lanserve.py:198 |
| `refresh_own_prefixes` | src/memorymap/core/lanserve.py:91 |
| `serve` | src/memorymap/core/lanserve.py:315 |

### src/memorymap/core/lantrust.py (30)

| Name | File:line |
|---|---|
| `_bump` | src/memorymap/core/lantrust.py:55 |
| `_expire` | src/memorymap/core/lantrust.py:300 |
| `_now_text` | src/memorymap/core/lantrust.py:107 |
| `_path` | src/memorymap/core/lantrust.py:68 |
| `_remember` | src/memorymap/core/lantrust.py:132 |
| `allow_current` | src/memorymap/core/lantrust.py:214 |
| `current_network` | src/memorymap/core/lantrust.py:178 |
| `decide` | src/memorymap/core/lantrust.py:334 |
| `device_hash` | src/memorymap/core/lantrust.py:254 |
| `device_known` | src/memorymap/core/lantrust.py:260 |
| `device_name` | src/memorymap/core/lantrust.py:277 |
| `devices` | src/memorymap/core/lantrust.py:379 |
| `evaluate` | src/memorymap/core/lantrust.py:114 |
| `forget_device` | src/memorymap/core/lantrust.py:386 |
| `forget_network` | src/memorymap/core/lantrust.py:229 |
| `hold` | src/memorymap/core/lantrust.py:305 |
| `is_open` | src/memorymap/core/lantrust.py:174 |
| `load` | src/memorymap/core/lantrust.py:72 |
| `network_for_display` | src/memorymap/core/lantrust.py:185 |
| `pending` | src/memorymap/core/lantrust.py:324 |
| `refresh` | src/memorymap/core/lantrust.py:151 |
| `remember_current` | src/memorymap/core/lantrust.py:202 |
| `reset_for_tests` | src/memorymap/core/lantrust.py:399 |
| `save` | src/memorymap/core/lantrust.py:95 |
| `set_flag` | src/memorymap/core/lantrust.py:241 |
| `settle` | src/memorymap/core/lantrust.py:372 |
| `status` | src/memorymap/core/lantrust.py:193 |
| `touch_device` | src/memorymap/core/lantrust.py:265 |
| `version` | src/memorymap/core/lantrust.py:61 |
| `wait_decision` | src/memorymap/core/lantrust.py:354 |

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

### src/memorymap/core/netbind.py (23)

| Name | File:line |
|---|---|
| `_own_names` | src/memorymap/core/netbind.py:228 |
| `_proc_v6_addresses` | src/memorymap/core/netbind.py:274 |
| `_usable_v6` | src/memorymap/core/netbind.py:256 |
| `arrived_on_loopback` | src/memorymap/core/netbind.py:192 |
| `arrived_on_socket` | src/memorymap/core/netbind.py:215 |
| `bind_host` | src/memorymap/core/netbind.py:143 |
| `current` | src/memorymap/core/netbind.py:184 |
| `describe` | src/memorymap/core/netbind.py:351 |
| `dual_stack` | src/memorymap/core/netbind.py:133 |
| `env_bind` | src/memorymap/core/netbind.py:97 |
| `explicit_bind` | src/memorymap/core/netbind.py:118 |
| `host_allowed` | src/memorymap/core/netbind.py:237 |
| `is_loopback_bind` | src/memorymap/core/netbind.py:188 |
| `lan_addresses` | src/memorymap/core/netbind.py:292 |
| `lan_enabled` | src/memorymap/core/netbind.py:126 |
| `lan_port` | src/memorymap/core/netbind.py:58 |
| `lan_port_candidates` | src/memorymap/core/netbind.py:72 |
| `listening_socket` | src/memorymap/core/netbind.py:154 |
| `order_addresses` | src/memorymap/core/netbind.py:391 |
| `set_current` | src/memorymap/core/netbind.py:178 |
| `set_explicit_bind` | src/memorymap/core/netbind.py:112 |
| `set_lan_port` | src/memorymap/core/netbind.py:80 |
| `url_host` | src/memorymap/core/netbind.py:173 |

### src/memorymap/core/netid.py (20)

| Name | File:line |
|---|---|
| `Network` | src/memorymap/core/netid.py:37 |
| `_default_route` | src/memorymap/core/netid.py:109 |
| `_hex_ip` | src/memorymap/core/netid.py:105 |
| `_linux_address` | src/memorymap/core/netid.py:181 |
| `_linux_virtual` | src/memorymap/core/netid.py:157 |
| `_route_subnet` | src/memorymap/core/netid.py:123 |
| `_run` | src/memorymap/core/netid.py:91 |
| `_subnet` | src/memorymap/core/netid.py:84 |
| `_windows_category` | src/memorymap/core/netid.py:259 |
| `_windows_subnet` | src/memorymap/core/netid.py:264 |
| `normal_mac` | src/memorymap/core/netid.py:74 |
| `parse_proc_arp` | src/memorymap/core/netid.py:147 |
| `parse_proc_route` | src/memorymap/core/netid.py:137 |
| `parse_route_get` | src/memorymap/core/netid.py:211 |
| `parse_route_print` | src/memorymap/core/netid.py:295 |
| `parse_windows_json` | src/memorymap/core/netid.py:269 |
| `read` | src/memorymap/core/netid.py:326 |
| `read_linux` | src/memorymap/core/netid.py:192 |
| `read_macos` | src/memorymap/core/netid.py:222 |
| `read_windows` | src/memorymap/core/netid.py:311 |

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
| `kind_for_label` | src/memorymap/core/passes.py:262 |
| `overview` | src/memorymap/core/passes.py:68 |
| `register_housekeeping` | src/memorymap/core/passes.py:152 |
| `reset_for_tests` | src/memorymap/core/passes.py:267 |
| `run_now` | src/memorymap/core/passes.py:219 |
| `running` | src/memorymap/core/passes.py:76 |
| `schedule` | src/memorymap/core/passes.py:46 |
| `stop` | src/memorymap/core/passes.py:247 |
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

### src/memorymap/core/recordings.py (21)

| Name | File:line |
|---|---|
| `_binned` | src/memorymap/core/recordings.py:216 |
| `_forget_runs` | src/memorymap/core/recordings.py:159 |
| `as_dict` | src/memorymap/core/recordings.py:169 |
| `begin_transcription` | src/memorymap/core/recordings.py:127 |
| `binned` | src/memorymap/core/recordings.py:233 |
| `clean_markers` | src/memorymap/core/recordings.py:82 |
| `clean_peaks` | src/memorymap/core/recordings.py:77 |
| `container` | src/memorymap/core/recordings.py:46 |
| `directory` | src/memorymap/core/recordings.py:63 |
| `empty` | src/memorymap/core/recordings.py:244 |
| `end_transcription` | src/memorymap/core/recordings.py:143 |
| `marks_of` | src/memorymap/core/recordings.py:99 |
| `matches` | src/memorymap/core/recordings.py:58 |
| `new_filename` | src/memorymap/core/recordings.py:69 |
| `note_progress` | src/memorymap/core/recordings.py:137 |
| `path_of` | src/memorymap/core/recordings.py:73 |
| `purge` | src/memorymap/core/recordings.py:238 |
| `purge_expired` | src/memorymap/core/recordings.py:252 |
| `recover_stale` | src/memorymap/core/recordings.py:194 |
| `transcription_of` | src/memorymap/core/recordings.py:121 |
| `wait_transcription` | src/memorymap/core/recordings.py:152 |

### src/memorymap/core/reminder_notifier.py (17)

| Name | File:line |
|---|---|
| `Due` | src/memorymap/core/reminder_notifier.py:66 |
| `FiredStore` | src/memorymap/core/reminder_notifier.py:107 |
| `ReminderNotifier` | src/memorymap/core/reminder_notifier.py:289 |
| `_gvariant_string` | src/memorymap/core/reminder_notifier.py:133 |
| `_naive_utc` | src/memorymap/core/reminder_notifier.py:75 |
| `_notebook_open` | src/memorymap/core/reminder_notifier.py:261 |
| `_notify_send_reads_actions` | src/memorymap/core/reminder_notifier.py:137 |
| `_open_reminders` | src/memorymap/core/reminder_notifier.py:253 |
| `_times` | src/memorymap/core/reminder_notifier.py:79 |
| `active` | src/memorymap/core/reminder_notifier.py:448 |
| `apply_action` | src/memorymap/core/reminder_notifier.py:269 |
| `build_command` | src/memorymap/core/reminder_notifier.py:190 |
| `due_now` | src/memorymap/core/reminder_notifier.py:88 |
| `local_offset_minutes` | src/memorymap/core/reminder_notifier.py:246 |
| `pick_backend` | src/memorymap/core/reminder_notifier.py:148 |
| `start` | src/memorymap/core/reminder_notifier.py:453 |
| `toast_xml` | src/memorymap/core/reminder_notifier.py:177 |

### src/memorymap/core/reminder_token.py (4)

| Name | File:line |
|---|---|
| `_sign` | src/memorymap/core/reminder_token.py:42 |
| `mint` | src/memorymap/core/reminder_token.py:47 |
| `rotate` | src/memorymap/core/reminder_token.py:36 |
| `verify` | src/memorymap/core/reminder_token.py:53 |

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
| `_percentile` | src/memorymap/core/taskhistory.py:145 |
| `clear` | src/memorymap/core/taskhistory.py:134 |
| `latency_percentiles` | src/memorymap/core/taskhistory.py:155 |
| `recent` | src/memorymap/core/taskhistory.py:128 |
| `record` | src/memorymap/core/taskhistory.py:70 |

### src/memorymap/core/transcript.py (9)

| Name | File:line |
|---|---|
| `_ms` | src/memorymap/core/transcript.py:24 |
| `_stamp` | src/memorymap/core/transcript.py:63 |
| `_vtt_text` | src/memorymap/core/transcript.py:80 |
| `clean` | src/memorymap/core/transcript.py:31 |
| `dumps` | src/memorymap/core/transcript.py:52 |
| `loads` | src/memorymap/core/transcript.py:56 |
| `to_srt` | src/memorymap/core/transcript.py:70 |
| `to_vtt` | src/memorymap/core/transcript.py:84 |
| `turns` | src/memorymap/core/transcript.py:94 |

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
| `ClipRefused` | src/memorymap/core/webclip.py:57 |
| `_Markdown` | src/memorymap/core/webclip.py:326 |
| `_Node` | src/memorymap/core/webclip.py:182 |
| `_Tree` | src/memorymap/core/webclip.py:192 |
| `_descendants` | src/memorymap/core/webclip.py:411 |
| `_link_text` | src/memorymap/core/webclip.py:260 |
| `_main` | src/memorymap/core/webclip.py:282 |
| `_new_session` | src/memorymap/core/webclip.py:68 |
| `_read` | src/memorymap/core/webclip.py:420 |
| `_safe_href` | src/memorymap/core/webclip.py:311 |
| `_score` | src/memorymap/core/webclip.py:268 |
| `_score_deep` | src/memorymap/core/webclip.py:307 |
| `_text` | src/memorymap/core/webclip.py:254 |
| `clean_url` | src/memorymap/core/webclip.py:78 |
| `extract` | src/memorymap/core/webclip.py:433 |
| `fetch_page` | src/memorymap/core/webclip.py:83 |
| `note_content` | src/memorymap/core/webclip.py:460 |

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

### src/memorymap/entry/meetings.py (22)

| Name | File:line |
|---|---|
| `_as_owned` | src/memorymap/entry/meetings.py:353 |
| `_body_offset` | src/memorymap/entry/meetings.py:142 |
| `_clean` | src/memorymap/entry/meetings.py:96 |
| `_content_words` | src/memorymap/entry/meetings.py:400 |
| `_is_placeholder` | src/memorymap/entry/meetings.py:234 |
| `_owner_of` | src/memorymap/entry/meetings.py:335 |
| `_read_line` | src/memorymap/entry/meetings.py:364 |
| `_section_of` | src/memorymap/entry/meetings.py:138 |
| `_sections` | src/memorymap/entry/meetings.py:151 |
| `_sentences` | src/memorymap/entry/meetings.py:322 |
| `action_items` | src/memorymap/entry/meetings.py:175 |
| `already_written` | src/memorymap/entry/meetings.py:404 |
| `append_to_section` | src/memorymap/entry/meetings.py:243 |
| `attendees` | src/memorymap/entry/meetings.py:274 |
| `compose` | src/memorymap/entry/meetings.py:100 |
| `find_items` | src/memorymap/entry/meetings.py:380 |
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

### src/memorymap/entry/sample_notebook.py (3)

| Name | File:line |
|---|---|
| `category_ids` | src/memorymap/entry/sample_notebook.py:109 |
| `drop_emptied_categories` | src/memorymap/entry/sample_notebook.py:113 |
| `live_samples` | src/memorymap/entry/sample_notebook.py:101 |

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
| `_category_notes` | src/memorymap/search/search_manager.py:1075 |
| `_category_only` | src/memorymap/search/search_manager.py:1069 |
| `_corrected_terms` | src/memorymap/search/search_manager.py:242 |
| `_fuse` | src/memorymap/search/search_manager.py:645 |
| `_learned_order` | src/memorymap/search/search_manager.py:1309 |
| `_linked_neighbours` | src/memorymap/search/search_manager.py:684 |
| `_meaningful_terms` | src/memorymap/search/search_manager.py:292 |
| `_named_category` | src/memorymap/search/search_manager.py:1035 |
| `_rank` | src/memorymap/search/search_manager.py:959 |
| `_rank_inner` | src/memorymap/search/search_manager.py:972 |
| `_recency_pin_ranking` | src/memorymap/search/search_manager.py:619 |
| `_retrieve` | src/memorymap/search/search_manager.py:1092 |
| `_score_from_matrix` | src/memorymap/search/search_manager.py:486 |
| `_score_from_table` | src/memorymap/search/search_manager.py:525 |
| `_user_today` | src/memorymap/search/search_manager.py:43 |
| `_within` | src/memorymap/search/search_manager.py:851 |
| `_without_private` | src/memorymap/search/search_manager.py:1363 |
| `_written_at` | src/memorymap/search/search_manager.py:843 |
| `configured_thresholds` | src/memorymap/search/search_manager.py:297 |
| `entries_between` | src/memorymap/search/search_manager.py:100 |
| `graph_expansion` | src/memorymap/search/search_manager.py:749 |
| `in_range` | src/memorymap/search/search_manager.py:815 |
| `is_recency_ask` | src/memorymap/search/search_manager.py:1012 |
| `keyword_search` | src/memorymap/search/search_manager.py:124 |
| `last_search` | src/memorymap/search/search_manager.py:954 |
| `note_search_mode` | src/memorymap/search/search_manager.py:967 |
| `query_vector` | src/memorymap/search/search_manager.py:324 |
| `recent_entries` | src/memorymap/search/search_manager.py:78 |
| `retrieve` | src/memorymap/search/search_manager.py:924 |
| `retrieve_detailed` | src/memorymap/search/search_manager.py:900 |
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
| `_download` | src/memorymap/search/searxng_install.py:220 |
| `_drop_readonly` | src/memorymap/search/searxng_install.py:512 |
| `_fetch_source` | src/memorymap/search/searxng_install.py:288 |
| `_install_log` | src/memorymap/search/searxng_install.py:124 |
| `_install_progress` | src/memorymap/search/searxng_install.py:143 |
| `_install_stage` | src/memorymap/search/searxng_install.py:134 |
| `_install_steps` | src/memorymap/search/searxng_install.py:334 |
| `_remove_tree` | src/memorymap/search/searxng_install.py:528 |
| `_unpack` | src/memorymap/search/searxng_install.py:249 |
| `_unsafe_member` | src/memorymap/search/searxng_install.py:202 |
| `install_source` | src/memorymap/search/searxng_install.py:371 |
| `is_checkout` | src/memorymap/search/searxng_install.py:149 |
| `reinstall_source` | src/memorymap/search/searxng_install.py:610 |
| `source_available` | src/memorymap/search/searxng_install.py:76 |
| `source_installed` | src/memorymap/search/searxng_install.py:168 |
| `uninstall_source` | src/memorymap/search/searxng_install.py:565 |

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
| `WebSearchError` | src/memorymap/search/websearch.py:95 |
| `_assert_external` | src/memorymap/search/websearch.py:689 |
| `_blocks_from_markdown` | src/memorymap/search/websearch.py:993 |
| `_cache_get` | src/memorymap/search/websearch.py:99 |
| `_cache_put` | src/memorymap/search/websearch.py:110 |
| `_content_body` | src/memorymap/search/websearch.py:895 |
| `_first_matches` | src/memorymap/search/websearch.py:634 |
| `_get_external` | src/memorymap/search/websearch.py:711 |
| `_host_addresses` | src/memorymap/search/websearch.py:667 |
| `_is_challenge` | src/memorymap/search/websearch.py:418 |
| `_page_links` | src/memorymap/search/websearch.py:912 |
| `_page_title` | src/memorymap/search/websearch.py:984 |
| `_parse_results` | src/memorymap/search/websearch.py:642 |
| `_private_session` | src/memorymap/search/websearch.py:68 |
| `_readable_blocks` | src/memorymap/search/websearch.py:941 |
| `_readable_text` | src/memorymap/search/websearch.py:1020 |
| `_real_url` | src/memorymap/search/websearch.py:608 |
| `_search_duckduckgo` | src/memorymap/search/websearch.py:532 |
| `_search_searxng` | src/memorymap/search/websearch.py:426 |
| `_searxng_target` | src/memorymap/search/websearch.py:145 |
| `_split_url` | src/memorymap/search/websearch.py:768 |
| `_strip_tags` | src/memorymap/search/websearch.py:604 |
| `_upstream_engines` | src/memorymap/search/websearch.py:500 |
| `answered_by` | src/memorymap/search/websearch.py:298 |
| `clear_cache` | src/memorymap/search/websearch.py:116 |
| `discover_searxng` | src/memorymap/search/websearch.py:230 |
| `domain_of` | src/memorymap/search/websearch.py:238 |
| `fetch_readable` | src/memorymap/search/websearch.py:807 |
| `fetch_readable_cached` | src/memorymap/search/websearch.py:798 |
| `normalise_provider` | src/memorymap/search/websearch.py:306 |
| `prefetch_readable` | src/memorymap/search/websearch.py:790 |
| `probe_searxng` | src/memorymap/search/websearch.py:202 |
| `search_web` | src/memorymap/search/websearch.py:331 |
| `settings_from` | src/memorymap/search/websearch.py:316 |

## Tests (9959)

`def test_` lines in each `tests/test_*.py`.

| File | Tests |
|---|---|
| tests/test_a11y_wcag22.py | 16 |
| tests/test_accent_text.py | 3 |
| tests/test_account.py | 16 |
| tests/test_activity.py | 10 |
| tests/test_activity_narrator_guide.py | 2 |
| tests/test_activity_undo_row.py | 4 |
| tests/test_acts.py | 10 |
| tests/test_agent_context.py | 7 |
| tests/test_agent_followthrough.py | 7 |
| tests/test_agent_gate_778.py | 6 |
| tests/test_agent_link_types.py | 8 |
| tests/test_agent_no_model_801.py | 24 |
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
| tests/test_appearance_sync.py | 5 |
| tests/test_archive.py | 7 |
| tests/test_archive_links.py | 1 |
| tests/test_arithmetic.py | 3 |
| tests/test_ask_answer_object.py | 22 |
| tests/test_ask_category_scope.py | 4 |
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
| tests/test_autocorrect_1011.py | 10 |
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
| tests/test_backup_details.py | 5 |
| tests/test_backup_roundtrip_full.py | 2 |
| tests/test_backups_api.py | 13 |
| tests/test_badge_recipe.py | 14 |
| tests/test_bars_618.py | 7 |
| tests/test_bench_spec.py | 7 |
| tests/test_bg_art_styles.py | 24 |
| tests/test_bgtasks.py | 22 |
| tests/test_bin_documents_reminders_row30.py | 6 |
| tests/test_board_acts.py | 6 |
| tests/test_board_background.py | 8 |
| tests/test_board_current_layer.py | 3 |
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
| tests/test_board_templates_715.py | 12 |
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
| tests/test_captions.py | 16 |
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
| tests/test_chat_act_card_once.py | 1 |
| tests/test_chat_api.py | 19 |
| tests/test_chat_app_help.py | 5 |
| tests/test_chat_attachments.py | 18 |
| tests/test_chat_checkpoint_race.py | 2 |
| tests/test_chat_dock.py | 11 |
| tests/test_chat_followups.py | 14 |
| tests/test_chat_intent.py | 13 |
| tests/test_chat_live_citations.py | 2 |
| tests/test_chat_metadata.py | 10 |
| tests/test_chat_organisation.py | 15 |
| tests/test_chat_persona_marks.py | 5 |
| tests/test_chat_resume_controls.py | 6 |
| tests/test_chat_scroll_534.py | 4 |
| tests/test_chat_stray_keys.py | 2 |
| tests/test_chat_times.py | 8 |
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
| tests/test_code_documents.py | 19 |
| tests/test_code_editing.py | 24 |
| tests/test_code_ide_b42.py | 9 |
| tests/test_code_vscode.py | 23 |
| tests/test_codemap_fresh.py | 1 |
| tests/test_codeql_shapes.py | 2 |
| tests/test_coerce_number_finite.py | 3 |
| tests/test_command_row_shape.py | 3 |
| tests/test_companion_motion.py | 101 |
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
| tests/test_device_sizes.py | 11 |
| tests/test_digest_structure.py | 20 |
| tests/test_disclosure_marker.py | 4 |
| tests/test_dismissed_suggestions_1011.py | 3 |
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
| tests/test_egress_purposes.py | 9 |
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
| tests/test_first_run_472.py | 12 |
| tests/test_flaw_class_lints.py | 2 |
| tests/test_focus_timer.py | 5 |
| tests/test_folder_roundtrip.py | 5 |
| tests/test_followup_trail_490.py | 3 |
| tests/test_followups.py | 19 |
| tests/test_foreign_browser_errors.py | 2 |
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
| tests/test_graph_feel_100.py | 14 |
| tests/test_graph_feel_775.py | 13 |
| tests/test_graph_first_frame.py | 5 |
| tests/test_graph_fit_balance.py | 7 |
| tests/test_graph_glide.py | 2 |
| tests/test_graph_grouping.py | 2 |
| tests/test_graph_hover_fade.py | 6 |
| tests/test_graph_layout_692.py | 8 |
| tests/test_graph_layout_chip.py | 3 |
| tests/test_graph_layout_order.py | 4 |
| tests/test_graph_layout_switch_fit.py | 2 |
| tests/test_graph_local_scaling.py | 4 |
| tests/test_graph_look.py | 10 |
| tests/test_graph_options_scroll.py | 1 |
| tests/test_graph_pane_collapse.py | 3 |
| tests/test_graph_parity_514.py | 9 |
| tests/test_graph_paths.py | 34 |
| tests/test_graph_payload_cache.py | 8 |
| tests/test_graph_popup_phone.py | 5 |
| tests/test_graph_settles.py | 3 |
| tests/test_graph_similarity.py | 7 |
| tests/test_graph_slim.py | 3 |
| tests/test_graph_topic_drag.py | 4 |
| tests/test_graph_view_positions.py | 5 |
| tests/test_greeting_compose.py | 5 |
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
| tests/test_help_controls.py | 18 |
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
| tests/test_hover_focus_pairs.py | 3 |
| tests/test_hover_grounds_have_a_radius.py | 1 |
| tests/test_icon_conventions.py | 18 |
| tests/test_icon_label_align.py | 7 |
| tests/test_icon_label_gap.py | 2 |
| tests/test_icon_names.py | 2 |
| tests/test_icon_only_buttons.py | 2 |
| tests/test_icon_picker.py | 5 |
| tests/test_ics.py | 6 |
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
| tests/test_lan_mode.py | 22 |
| tests/test_lan_restart_action.py | 5 |
| tests/test_lan_serve.py | 11 |
| tests/test_lan_tls.py | 24 |
| tests/test_lan_trust.py | 25 |
| tests/test_launch_splash.py | 24 |
| tests/test_launch_status.py | 25 |
| tests/test_launcher_scripts.py | 89 |
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
| tests/test_library_subtab_flick.py | 3 |
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
| tests/test_manual_parity.py | 8 |
| tests/test_map_actions_clear_of_label.py | 1 |
| tests/test_map_add_speed.py | 6 |
| tests/test_map_branch_colour_order.py | 3 |
| tests/test_map_branch_structure.py | 4 |
| tests/test_map_callout.py | 7 |
| tests/test_map_drag_cost.py | 12 |
| tests/test_map_from_headings.py | 4 |
| tests/test_map_from_notes.py | 8 |
| tests/test_map_generation.py | 13 |
| tests/test_map_layouts.py | 3 |
| tests/test_map_levels.py | 8 |
| tests/test_map_multi_select.py | 4 |
| tests/test_map_node_controls.py | 11 |
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
| tests/test_map_xmind_export.py | 2 |
| tests/test_maps_are_not_notes.py | 10 |
| tests/test_margin_reader_spec.py | 12 |
| tests/test_markdown_export_import.py | 11 |
| tests/test_markdown_link_schemes.py | 3 |
| tests/test_marquee_cost.py | 4 |
| tests/test_mcp_server.py | 17 |
| tests/test_md_blocks.py | 12 |
| tests/test_md_footnotes.py | 7 |
| tests/test_meaning_1011.py | 11 |
| tests/test_media_api.py | 54 |
| tests/test_media_cookie.py | 14 |
| tests/test_media_gc.py | 18 |
| tests/test_media_process.py | 15 |
| tests/test_media_size.py | 3 |
| tests/test_media_size_backfill.py | 3 |
| tests/test_meeting_notes.py | 15 |
| tests/test_meeting_rules_81.py | 9 |
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
| tests/test_models_api.py | 36 |
| tests/test_models_doc_sizes.py | 4 |
| tests/test_motion_endings.py | 2 |
| tests/test_motion_recipes.py | 6 |
| tests/test_motion_tokens.py | 15 |
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
| tests/test_note_edit_kept.py | 6 |
| tests/test_note_edit_strip_options.py | 1 |
| tests/test_note_editing_api.py | 10 |
| tests/test_note_flow_0432.py | 27 |
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
| tests/test_notes_select_tick.py | 2 |
| tests/test_notif_dismiss.py | 2 |
| tests/test_notification_actions.py | 12 |
| tests/test_notifications_centre.py | 8 |
| tests/test_object_actions.py | 6 |
| tests/test_ocr.py | 19 |
| tests/test_ocr_clean_loops.py | 7 |
| tests/test_ocr_edit.py | 3 |
| tests/test_ocr_engine.py | 12 |
| tests/test_ocr_engine_choice_717.py | 8 |
| tests/test_ocr_engine_ui.py | 6 |
| tests/test_ocr_find_marks.py | 3 |
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
| tests/test_owner_typos.py | 15 |
| tests/test_ownerfix2_1011.py | 4 |
| tests/test_ownerfix_1011.py | 8 |
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
| tests/test_phone2_1011.py | 8 |
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
| tests/test_process_ledger.py | 14 |
| tests/test_profile_api.py | 5 |
| tests/test_progress_phases.py | 10 |
| tests/test_prompt_budget.py | 38 |
| tests/test_prompt_prefix_stability.py | 4 |
| tests/test_properties_never_in_previews.py | 13 |
| tests/test_prose_autofill.py | 25 |
| tests/test_prose_tools.py | 20 |
| tests/test_provider_redirects.py | 4 |
| tests/test_provider_sockets.py | 8 |
| tests/test_providers.py | 70 |
| tests/test_pwa_shell.py | 25 |
| tests/test_qa_1005_polish.py | 10 |
| tests/test_quadratic_scans.py | 6 |
| tests/test_query_plans.py | 2 |
| tests/test_query_rollups_kg7.py | 4 |
| tests/test_query_understanding.py | 20 |
| tests/test_question_noise.py | 27 |
| tests/test_questions_own.py | 8 |
| tests/test_questions_spec.py | 9 |
| tests/test_quick_access.py | 26 |
| tests/test_quickadd.py | 13 |
| tests/test_raw_fetch_headers.py | 2 |
| tests/test_reading.py | 12 |
| tests/test_readings_f10.py | 4 |
| tests/test_readme_freshness.py | 7 |
| tests/test_realise.py | 11 |
| tests/test_realise_ui.py | 3 |
| tests/test_recency_questions.py | 9 |
| tests/test_recent_questions_surface.py | 7 |
| tests/test_recognise.py | 7 |
| tests/test_recordings.py | 16 |
| tests/test_recordings_background.py | 4 |
| tests/test_recordings_library.py | 18 |
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
| tests/test_reminder_notifier.py | 13 |
| tests/test_reminder_scoped_token.py | 13 |
| tests/test_reminder_snooze_row34.py | 4 |
| tests/test_reminder_sw_notify.py | 4 |
| tests/test_reminder_targets_row15.py | 5 |
| tests/test_reminder_times.py | 19 |
| tests/test_reminders_api.py | 17 |
| tests/test_reminders_ics.py | 10 |
| tests/test_reminders_reschedule.py | 4 |
| tests/test_restart_everywhere.py | 7 |
| tests/test_restore_roundtrip.py | 2 |
| tests/test_resurface_spec.py | 14 |
| tests/test_review_queue_17.py | 6 |
| tests/test_ring_room.py | 5 |
| tests/test_round2_sweep_fixes.py | 3 |
| tests/test_router.py | 13 |
| tests/test_routes_named.py | 2 |
| tests/test_rows_676.py | 6 |
| tests/test_run_caps.py | 7 |
| tests/test_run_debug_js.py | 5 |
| tests/test_run_debugger.py | 16 |
| tests/test_run_protocol.py | 17 |
| tests/test_run_sandbox.py | 16 |
| tests/test_run_skill.py | 41 |
| tests/test_sample_notebook.py | 3 |
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
| tests/test_search_suggest_1011.py | 6 |
| tests/test_search_suggest_lists.py | 2 |
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
| tests/test_settings_clear_1011.py | 4 |
| tests/test_settings_field_edge.py | 2 |
| tests/test_settings_group_heads.py | 2 |
| tests/test_settings_history_1011.py | 9 |
| tests/test_settings_ia.py | 7 |
| tests/test_settings_no_sideways.py | 4 |
| tests/test_settings_pane_actions.py | 3 |
| tests/test_settings_pane_intro.py | 2 |
| tests/test_settings_row_heads.py | 2 |
| tests/test_settings_rows.py | 12 |
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
| tests/test_skill_fixtures.py | 11 |
| tests/test_skill_run_undo.py | 5 |
| tests/test_skills.py | 83 |
| tests/test_skills_evals.py | 6 |
| tests/test_smooth_boot.py | 16 |
| tests/test_source_check.py | 7 |
| tests/test_space_delete_cascades.py | 1 |
| tests/test_spaces.py | 22 |
| tests/test_speakers_81.py | 6 |
| tests/test_speculative_retrieval.py | 4 |
| tests/test_spinner_recipe.py | 16 |
| tests/test_spoken_followups.py | 8 |
| tests/test_staged_images.py | 4 |
| tests/test_staleness.py | 8 |
| tests/test_starter_acts.py | 7 |
| tests/test_starter_acts_tabs.py | 2 |
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
| tests/test_style_scale.py | 31 |
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
| tests/test_tags89.py | 9 |
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
| tests/test_theme_pins.py | 3 |
| tests/test_thinking_and_stream.py | 7 |
| tests/test_thinking_budget.py | 8 |
| tests/test_thinking_words.py | 10 |
| tests/test_thinking_words_rotation.py | 27 |
| tests/test_this_computer_only.py | 4 |
| tests/test_tidy.py | 28 |
| tests/test_tidy_categories.py | 5 |
| tests/test_tidy_ui.py | 13 |
| tests/test_time_travel_spec.py | 9 |
| tests/test_timeline.py | 31 |
| tests/test_timeline_auto_scale.py | 3 |
| tests/test_timeline_calendar_window.py | 3 |
| tests/test_timeline_on_this_day.py | 5 |
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
| tests/test_tool_verifiers.py | 8 |
| tests/test_toolwords.py | 14 |
| tests/test_topbar_mode.py | 3 |
| tests/test_topic_names.py | 9 |
| tests/test_topic_summary_kg6.py | 5 |
| tests/test_topics_kg6.py | 7 |
| tests/test_touched_notes.py | 15 |
| tests/test_tour_follow.py | 7 |
| tests/test_transcript_81.py | 6 |
| tests/test_translate_offline.py | 7 |
| tests/test_tray.py | 18 |
| tests/test_ui_batch_726.py | 8 |
| tests/test_ui_recipes.py | 193 |
| tests/test_ui_signatures.py | 2 |
| tests/test_ui_state.py | 6 |
| tests/test_uisweep_1011.py | 11 |
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
| tests/test_utilities_zones.py | 3 |
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
| tests/test_voice_api.py | 16 |
| tests/test_voice_tables.py | 5 |
| tests/test_wb_anchor_hints_clear.py | 3 |
| tests/test_wb_audit_keys.py | 23 |
| tests/test_wb_clone_grips_follow.py | 6 |
| tests/test_wb_colour.py | 6 |
| tests/test_wb_commands.py | 7 |
| tests/test_wb_context_menu_place.py | 4 |
| tests/test_wb_context_pin.py | 1 |
| tests/test_wb_drawio_import.py | 7 |
| tests/test_wb_drop_place.py | 13 |
| tests/test_wb_edge_pan.py | 4 |
| tests/test_wb_edit_data.py | 2 |
| tests/test_wb_elbow.py | 13 |
| tests/test_wb_export_inline_images.py | 3 |
| tests/test_wb_export_png.py | 4 |
| tests/test_wb_find_replace.py | 2 |
| tests/test_wb_format.py | 11 |
| tests/test_wb_frame_title_target.py | 2 |
| tests/test_wb_guides.py | 5 |
| tests/test_wb_hand_drawn.py | 3 |
| tests/test_wb_help_sheet.py | 5 |
| tests/test_wb_interchange.py | 10 |
| tests/test_wb_laser.py | 2 |
| tests/test_wb_layer_and_hollow_ends.py | 3 |
| tests/test_wb_line_ends.py | 4 |
| tests/test_wb_menu_rows_close.py | 2 |
| tests/test_wb_mermaid_kinds.py | 6 |
| tests/test_wb_middle_pan.py | 4 |
| tests/test_wb_more_shapes.py | 3 |
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
| tests/test_wb_table.py | 3 |
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

## Plan headings (996)

Every `##` and `###` heading in `docs/ROADMAP.md` and `docs/roadmap/*.md`, except the HISTORY.md archive. Sorted by heading.

| Heading | File:line |
|---|---|
| 0. Checked in the code, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:969 |
| 0. Performance and "not device heavy" (cross-cutting, first) | docs/roadmap/PLAN.md:26 |
| 0. The diagnosis in one page | docs/roadmap/WORLD_CLASS_PLAN.md:25 |
| 0. The operating protocol (read every session, it is short) | docs/roadmap/SESSION_BRIEFS.md:17 |
| 1. Decisions made (do not remake) | docs/roadmap/SESSION_BRIEFS.md:975 |
| 1. Format panel, Style tab | docs/roadmap/WHITEBOARD_PLAN.md:977 |
| 1. Live log console (started, not finished) | docs/roadmap/BACKLOG.md:32 |
| 1. Research read, 2026-10-10, and what each changes here | docs/roadmap/CHAT_PLAN.md:1582 |
| 1. The consistency contract (the system under the little things) | docs/roadmap/WORLD_CLASS_PLAN.md:84 |
| 1. The instruction, verbatim | docs/roadmap/DOCUMENTS_PLAN.md:11 |
| 1. The instruction, verbatim | docs/roadmap/MINDMAP_PLAN.md:13 |
| 1. What changed since 2026-09-14 | docs/roadmap/ANALYSIS.md:4165 |
| 1. What exists (checked in the code) | docs/roadmap/CHAT_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/TIMELINE_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:12 |
| 1. What exists (checked in the code, not assumed) | docs/roadmap/GRAPH_PLAN.md:14 |
| 1. What it is, its size, its licence, how alive | docs/roadmap/ANALYSIS.md:2237 |
| 1. What the best rule-based and offline assistants do | docs/roadmap/CHAT_PLAN.md:1015 |
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
| 10. Deepened 2026-10-10: the timeline (Brief 72b, decision 71) | docs/roadmap/TIMELINE_PLAN.md:254 |
| 10. Flaws found by static probes (cheap to reproduce, each with its command) | docs/roadmap/WORLD_CLASS_PLAN.md:861 |
| 10. Not verified | docs/roadmap/ANALYSIS.md:4381 |
| 10. Outline, navigation and view | docs/roadmap/WHITEBOARD_PLAN.md:1214 |
| 10. The spelling check: decided 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:717 |
| 10. Timeline tab, and time-aware notes | docs/roadmap/BACKLOG.md:651 |
| 104. Sub-categories, asked about directly, and whether the graph needs a new mechanism to answer it | docs/roadmap/ANALYSIS.md:954 |
| 109.1 Fixed, and how each was actually proven | docs/roadmap/BACKLOG.md:3447 |
| 109.2 Text highlighting: built | docs/roadmap/BACKLOG.md:3545 |
| 109.3 The competitor gap analysis, triaged | docs/roadmap/BACKLOG.md:3549 |
| 109.4 Brainstormed: not asked for, worth doing | docs/roadmap/BACKLOG.md:3588 |
| 11. Built: the previews, Phase 4 and Phase 5 | docs/roadmap/MINDMAP_PLAN.md:299 |
| 11. Deepened 2026-10-10: reminders and notifications (Brief 72b, decisions 69 and 71) | docs/roadmap/TIMELINE_PLAN.md:292 |
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
| 114. A product-strategy read: competitive teardown, per-feature upgrades, inventions, and a 90-day plan | docs/roadmap/ANALYSIS.md:998 |
| 114.0 The brief, filled in from the code | docs/roadmap/ANALYSIS.md:1014 |
| 114.0b Three stale claims caught while grounding this | docs/roadmap/ANALYSIS.md:1039 |
| 114.1 Competitive teardown | docs/roadmap/ANALYSIS.md:1067 |
| 114.2 Every existing feature, and what category-leading looks like | docs/roadmap/ANALYSIS.md:1107 |
| 114.3 New inventions | docs/roadmap/ANALYSIS.md:1375 |
| 114.4 Prioritisation | docs/roadmap/ANALYSIS.md:1535 |
| 114.5 Risk, moat, and how to measure anything without telemetry | docs/roadmap/ANALYSIS.md:1609 |
| 114.6 Start tomorrow: the five highest-leverage actions | docs/roadmap/ANALYSIS.md:1659 |
| 115. After PR 144: professional use (the owner's stated next block, 2026-09-14) | docs/roadmap/BACKLOG.md:3928 |
| 116.1 Dropped or half-done, and therefore first | docs/roadmap/BACKLOG.md:3904 |
| 116.2 Mindmaps, Phases 4-5 (MINDMAP_PLAN.md §5 items 14-21) | docs/roadmap/BACKLOG.md:3911 |
| 116.3 PLAN.md rows not started (by track) | docs/roadmap/BACKLOG.md:3915 |
| 116.4 Tooling | docs/roadmap/BACKLOG.md:3922 |
| 12. Deepened 2026-10-10: the calendar (Brief 72b, decision 71) | docs/roadmap/TIMELINE_PLAN.md:333 |
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
| 12z Learnability, 2026-10-10 (INBOX 749) | docs/roadmap/UI_MODERNISATION_PLAN.md:1297 |
| 13. Images, math, links and tooltips | docs/roadmap/WHITEBOARD_PLAN.md:1303 |
| 13. Open bugs and gaps from the merged agent reports (with owners) | docs/roadmap/WORLD_CLASS_PLAN.md:967 |
| 13. The map, read against its six complaints: measured 2026-09-21, phases open | docs/roadmap/MINDMAP_PLAN.md:604 |
| 13. Timeline | docs/roadmap/PLAN.md:234 |
| 13. Web search effectiveness | docs/roadmap/BACKLOG.md:999 |
| 13. What a self-contained HTML export is: decided 2026-09-13 | docs/roadmap/DOCUMENTS_PLAN.md:858 |
| 13.1 Is it slow? The one claim measured before anything was designed | docs/roadmap/MINDMAP_PLAN.md:632 |
| 13.1 The principles, each as a rule with a measurement | docs/roadmap/UI_MODERNISATION_PLAN.md:1336 |
| 13.2 Surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:1361 |
| 13.2 The two kinds of connection | docs/roadmap/MINDMAP_PLAN.md:762 |
| 13.3 Decisions, 2026-10-10 (do not re-decide; numbered after Phase 12's 8) | docs/roadmap/UI_MODERNISATION_PLAN.md:1383 |
| 13.3 What the surface offers, and by how many doors | docs/roadmap/MINDMAP_PLAN.md:806 |
| 13.4 Phases with gates | docs/roadmap/UI_MODERNISATION_PLAN.md:1423 |
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
| 2. Packaging and distribution | docs/roadmap/ANALYSIS.md:4195 |
| 2. Quick wins | docs/roadmap/BACKLOG.md:85 |
| 2. Surface by surface, against this app | docs/roadmap/ANALYSIS.md:2281 |
| 2. The capability catalogue without a model | docs/roadmap/CHAT_PLAN.md:1251 |
| 2. The prompt | docs/roadmap/FABLE_BRIEF.md:16 |
| 2. What already exists (checked in the code, not assumed) | docs/roadmap/MINDMAP_PLAN.md:44 |
| 2. What exists (checked in the code, not assumed) | docs/roadmap/DOCUMENTS_PLAN.md:31 |
| 2. Where the layer joins each surface | docs/roadmap/CHAT_PLAN.md:1594 |
| 2. Why it disappoints (from the screenshots, each checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:28 |
| 2. Why it disappoints (measured against the screenshots) | docs/roadmap/CHAT_PLAN.md:28 |
| 2. Why it disappoints (measured, 48 notes across six months, 1358px) | docs/roadmap/TIMELINE_PLAN.md:24 |
| 2. Why it disappoints: measured and read | docs/roadmap/GRAPH_PLAN.md:27 |
| 20. A model per feature (asked for directly, 2026-09-21) | docs/roadmap/WORLD_CLASS_PLAN.md:2220 |
| 20. Backend | docs/roadmap/BACKLOG.md:1293 |
| 20. The 2026-10-05 feature audit: decisions | docs/roadmap/DOCUMENTS_PLAN.md:1158 |
| 2026-09-08, the third night: read this block first, whoever you are | docs/roadmap/HANDOVER.md:35 |
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
| 25.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3793 |
| 25.4 Phases with gates (each a brief; measure first) | docs/roadmap/WORLD_CLASS_PLAN.md:3833 |
| 25.5 Not verified | docs/roadmap/WORLD_CLASS_PLAN.md:3849 |
| 26. Data lifecycle: archive, a full wipe, and a real trust page | docs/roadmap/BACKLOG.md:1727 |
| 26. The backend against world class, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3857 |
| 26.1 Judgement, by layer | docs/roadmap/WORLD_CLASS_PLAN.md:3879 |
| 26.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3895 |
| 26.3 Phases with gates | docs/roadmap/WORLD_CLASS_PLAN.md:3924 |
| 26.4 Measured, 2026-10-10 (Brief 60, numbers only) | docs/roadmap/WORLD_CLASS_PLAN.md:3934 |
| 26.5 Complexity, cycles, hot routes and frames, 2026-10-10 (decision 63, numbers only) | docs/roadmap/WORLD_CLASS_PLAN.md:3955 |
| 27. Every feature, its utility and its popups, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3970 |
| 27. Onboarding and first-run experience | docs/roadmap/BACKLOG.md:1803 |
| 27.1 Feature by feature: what it offers, what a professional expects, the gap | docs/roadmap/WORLD_CLASS_PLAN.md:3984 |
| 27.2 The popups, one by one | docs/roadmap/WORLD_CLASS_PLAN.md:4012 |
| 27.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4033 |
| 28. In-app help: an AI that knows the docs, built | docs/roadmap/BACKLOG.md:1833 |
| 28. The trust contract, 2026-10-10 (INBOX 750) | docs/roadmap/WORLD_CLASS_PLAN.md:4047 |
| 28.1 The rules, each with its measure | docs/roadmap/WORLD_CLASS_PLAN.md:4056 |
| 28.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4075 |
| 28.3 Phases | docs/roadmap/WORLD_CLASS_PLAN.md:4097 |
| 28.4 Deepened 2026-10-10: the OCR workspace (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4106 |
| 28.5 Deepened 2026-10-10: the audio set (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4140 |
| 28.6 T0 numbers, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:4182 |
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
| 3. Metadata and dependencies | docs/roadmap/ANALYSIS.md:4222 |
| 3. Research: what the field actually offers | docs/roadmap/MINDMAP_PLAN.md:79 |
| 3. The diagnosis | docs/roadmap/DOCUMENTS_PLAN.md:54 |
| 3. The five modules | docs/roadmap/CHAT_PLAN.md:1611 |
| 3. The strongest things worth taking | docs/roadmap/ANALYSIS.md:2424 |
| 3. The target, in one paragraph | docs/roadmap/CHAT_PLAN.md:60 |
| 3. The target, in one paragraph | docs/roadmap/GRAPH_PLAN.md:61 |
| 3. The target, in one paragraph | docs/roadmap/TIMELINE_PLAN.md:44 |
| 3. The target, in one paragraph | docs/roadmap/WHITEBOARD_PLAN.md:61 |
| 3. The universal layer: the same capability, with a model and without | docs/roadmap/CHAT_PLAN.md:1404 |
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
| 34. Where I'd take this: an outside read | docs/roadmap/ANALYSIS.md:494 |
| 34b. Judging another agent's branch: what was kept, and on what grounds | docs/roadmap/ANALYSIS.md:625 |
| 4. Agent harness: "the ultimate agent harness" | docs/roadmap/PLAN.md:99 |
| 4. Agents | docs/roadmap/SESSION_BRIEFS.md:1041 |
| 4. Connectors: edge styles, waypoints, jumps, arrowheads, labels | docs/roadmap/WHITEBOARD_PLAN.md:1068 |
| 4. Decisions made (do not re-decide) | docs/roadmap/CHAT_PLAN.md:74 |
| 4. Decisions made (do not re-decide) | docs/roadmap/TIMELINE_PLAN.md:58 |
| 4. Decisions made (do not re-decide) | docs/roadmap/WHITEBOARD_PLAN.md:76 |
| 4. Decisions to make first | docs/roadmap/GRAPH_PLAN.md:73 |
| 4. Decisions, 2026-10-10 (not to be remade; numbered after Phase 6's 45) | docs/roadmap/CHAT_PLAN.md:1621 |
| 4. Library tab: chats, documents, images, archive | docs/roadmap/BACKLOG.md:204 |
| 4. Provenance and publication practice | docs/roadmap/ANALYSIS.md:4234 |
| 4. Scope decision (make this call first) | docs/roadmap/MINDMAP_PLAN.md:119 |
| 4. The backend, made revolutionary (and still SQLite, still offline) | docs/roadmap/WORLD_CLASS_PLAN.md:472 |
| 4. The decision to make first: the editing surface | docs/roadmap/DOCUMENTS_PLAN.md:108 |
| 4. The eval sets this implies for Brief 39 step 10 | docs/roadmap/CHAT_PLAN.md:1475 |
| 4. What it does worse than us | docs/roadmap/ANALYSIS.md:2504 |
| 4a. A real whiteboard, not just a bigger sketch | docs/roadmap/BACKLOG.md:271 |
| 4b. Templates and base layouts (boards, maps, documents) | docs/roadmap/BACKLOG.md:283 |
| 5. Abilities without AI (the app must be excellent with the model off) | docs/roadmap/WORLD_CLASS_PLAN.md:666 |
| 5. Build first: fifteen capabilities by value over cost | docs/roadmap/CHAT_PLAN.md:1516 |
| 5. Connection points and constraints | docs/roadmap/WHITEBOARD_PLAN.md:1088 |
| 5. Documents | docs/roadmap/BACKLOG.md:287 |
| 5. Features by surface, not covered before | docs/roadmap/ANALYSIS.md:4266 |
| 5. Phases | docs/roadmap/CHAT_PLAN.md:337 |
| 5. Phases | docs/roadmap/GRAPH_PLAN.md:95 |
| 5. Phases | docs/roadmap/TIMELINE_PLAN.md:114 |
| 5. Phases | docs/roadmap/WHITEBOARD_PLAN.md:488 |
| 5. Phases with gates | docs/roadmap/CHAT_PLAN.md:1643 |
| 5. Ship order (suggested sprints, each ends green + measured) | docs/roadmap/PLAN.md:114 |
| 5. The feature set, in build order | docs/roadmap/MINDMAP_PLAN.md:156 |
| 5. The phases | docs/roadmap/DOCUMENTS_PLAN.md:160 |
| 5. Traps | docs/roadmap/SESSION_BRIEFS.md:1052 |
| 5. Warnings: bug classes, not features to copy | docs/roadmap/ANALYSIS.md:2529 |
| 59. Three sibling repos, read and triaged, claude-obsidian, cognee, graphify | docs/roadmap/ANALYSIS.md:682 |
| 6. Competitor matrix (what the plan takes from whom) | docs/roadmap/DOCUMENTS_PLAN.md:482 |
| 6. Consistency rules | docs/roadmap/CHAT_PLAN.md:539 |
| 6. Consistency rules | docs/roadmap/TIMELINE_PLAN.md:138 |
| 6. Consistency rules | docs/roadmap/WHITEBOARD_PLAN.md:522 |
| 6. Consistency rules (learnability) | docs/roadmap/GRAPH_PLAN.md:161 |
| 6. Files this will touch | docs/roadmap/MINDMAP_PLAN.md:240 |
| 6. Layers and pages | docs/roadmap/WHITEBOARD_PLAN.md:1102 |
| 6. Measuring "professional" without telemetry | docs/roadmap/WORLD_CLASS_PLAN.md:713 |
| 6. Not verified | docs/roadmap/CHAT_PLAN.md:1654 |
| 6. OpenAI-compatible backends: **done** | docs/roadmap/BACKLOG.md:389 |
| 6. Rows added after this brief (the owner's later asks land here) | docs/roadmap/SESSION_BRIEFS.md:1062 |
| 6. Semantic search and the knowledge graph, "the ultimate upgrade" | docs/roadmap/PLAN.md:128 |
| 6. The companion and device pairing | docs/roadmap/ANALYSIS.md:4295 |
| 60. Odysseus, re-read: the repo tripled in size, and this time the question was answered from its own words | docs/roadmap/ANALYSIS.md:792 |
| 62. Extract notes: from the Writing Room, Documents, and Graph selections | docs/roadmap/BACKLOG.md:2060 |
| 63. Ship a starter skills library, DONE, this claim was stale | docs/roadmap/BACKLOG.md:2074 |
| 64. Documents editor: built, moved to HISTORY.md | docs/roadmap/BACKLOG.md:2078 |
| 65. Highlight/web-clip capture | docs/roadmap/BACKLOG.md:2083 |
| 66. Kortex.co, read and triaged, and the second-frontend question decided | docs/roadmap/ANALYSIS.md:912 |
| 7. Acceptance | docs/roadmap/MINDMAP_PLAN.md:255 |
| 7. Deepened 2026-10-10: the deterministic features (Brief 72b, decision 71) | docs/roadmap/CHAT_PLAN.md:1658 |
| 7. Design system | docs/roadmap/ANALYSIS.md:4312 |
| 7. Desktop packaging | docs/roadmap/BACKLOG.md:393 |
| 7. Files this will touch | docs/roadmap/DOCUMENTS_PLAN.md:506 |
| 7. Not verified until built | docs/roadmap/CHAT_PLAN.md:547 |
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
| 8. Deepened 2026-10-10: chat access to information (Brief 72b, decision 71) | docs/roadmap/CHAT_PLAN.md:1690 |
| 8. Execution order for the coming week (Opus/Sonnet sessions) | docs/roadmap/WORLD_CLASS_PLAN.md:791 |
| 8. Open bug list | docs/roadmap/BACKLOG.md:491 |
| 8. Research: tldraw, Excalidraw, Miro, FigJam, and what it changes here | docs/roadmap/WHITEBOARD_PLAN.md:560 |
| 8. Research: what the reference products actually do, and what it changes here | docs/roadmap/CHAT_PLAN.md:554 |
| 8. Research: what the reference products do, and what it changes here | docs/roadmap/TIMELINE_PLAN.md:174 |
| 8. Risks | docs/roadmap/MINDMAP_PLAN.md:268 |
| 8. Templates | docs/roadmap/WHITEBOARD_PLAN.md:1195 |
| 8. The strongest things worth taking, ranked | docs/roadmap/ANALYSIS.md:4344 |
| 8b. Web search: two Windows bugs found, and what is left | docs/roadmap/BACKLOG.md:525 |
| 9. Built: Phase 1 (backend) | docs/roadmap/MINDMAP_PLAN.md:291 |
| 9. Declined, with why | docs/roadmap/ANALYSIS.md:4364 |
| 9. Deepened 2026-10-10: the Guide (Brief 72b, decisions 59 and 71) | docs/roadmap/CHAT_PLAN.md:1718 |
| 9. Find and replace | docs/roadmap/WHITEBOARD_PLAN.md:1204 |
| 9. Notes (capture + list) | docs/roadmap/PLAN.md:186 |
| 9. On testing with a real model in the sandbox | docs/roadmap/WORLD_CLASS_PLAN.md:847 |
| 9. Phase 5: the calendar as the third view (Fable, 2026-10-10; WORLD_CLASS_PLAN 25, decision 47; Brief 55) | docs/roadmap/TIMELINE_PLAN.md:207 |
| 9. Risks | docs/roadmap/DOCUMENTS_PLAN.md:528 |
| 9. The graph: make it a tool, and give it a look | docs/roadmap/BACKLOG.md:574 |
| A real, narrow bug this comparison surfaced | docs/roadmap/ANALYSIS.md:844 |
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
| Architecture review, 2026-09-24 (INBOX 400, asked for directly) | docs/roadmap/ANALYSIS.md:3666 |
| Asked for this session, not yet built | docs/roadmap/BACKLOG.md:310 |
| Audio in the notebook: the architecture decided 2026-09-21, the build deferred | docs/roadmap/WORLD_CLASS_PLAN.md:2135 |
| Audio notes and meetings, against soundcraft | docs/roadmap/ANALYSIS.md:3988 |
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
| Brief 100 (Opus, graph): the graph's feel (INBOX 802, 864, 865) | docs/roadmap/SESSION_BRIEFS.md:1817 |
| Brief 101 (Sonnet, three agents): the found-not-fixed ledger, placed (the owner: "make sure you cover all bugs and issues found and not fixed as well") | docs/roadmap/SESSION_BRIEFS.md:1822 |
| Brief 102 (Opus, lansafe): LAN safe by default on any network (INBOX 867) | docs/roadmap/SESSION_BRIEFS.md:1831 |
| Brief 103 (Sonnet, chattime): a time on every chat message (INBOX 868) | docs/roadmap/SESSION_BRIEFS.md:1840 |
| Brief 104 (Opus, after atlas): typos read in context, not as slang (INBOX 869) | docs/roadmap/SESSION_BRIEFS.md:1844 |
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
| Brief 85 (Opus): the launch splash, reimagined (INBOX 834) | docs/roadmap/SESSION_BRIEFS.md:1733 |
| Brief 86 (built 2026-10-11, search86): search suggestions, history and undo in Settings | docs/roadmap/SESSION_BRIEFS.md:1738 |
| Brief 87 (Sonnet, research then Opus build): voice, dictation and what to vendor (INBOX 833) | docs/roadmap/SESSION_BRIEFS.md:1742 |
| Brief 88 (Opus): Atlas and the companions, alive (INBOX 835) | docs/roadmap/SESSION_BRIEFS.md:1748 |
| Brief 89 (Sonnet): Add tags on lightly tagged notes (INBOX 836) | docs/roadmap/SESSION_BRIEFS.md:1753 |
| Brief 8: W1-4: the three 18.4px switches, and making DESIGN.md true | docs/roadmap/MODERNISATION_AUDIT.md:1392 |
| Brief 9 (Fri, Opus): the job runtime (B2) and thread isolation | docs/roadmap/SESSION_BRIEFS.md:358 |
| Brief 90 (Sonnet, standing): the owner's own typos as composer fixtures (INBOX 837) | docs/roadmap/SESSION_BRIEFS.md:1757 |
| Brief 91 (Sonnet, ownerfix2): the owner's small UI reports, 2026-10-11 afternoon (INBOX 838 to 842) | docs/roadmap/SESSION_BRIEFS.md:1762 |
| Brief 92 (Opus, after the queue): the whole-app pass the owner asked for (INBOX 843) | docs/roadmap/SESSION_BRIEFS.md:1766 |
| Brief 93 (Sonnet, ownerfix3): the owner's small UI reports, 2026-10-11 evening (INBOX 847, 851 to 856) | docs/roadmap/SESSION_BRIEFS.md:1772 |
| Brief 94 (Opus): find by meaning everywhere, autocorrect everywhere with undo (INBOX 850, 857) | docs/roadmap/SESSION_BRIEFS.md:1782 |
| Brief 95 (Opus): themes, dug deep (INBOX 858) | docs/roadmap/SESSION_BRIEFS.md:1788 |
| Brief 96 (Opus, with voiceup): the recording row and player (INBOX 859) | docs/roadmap/SESSION_BRIEFS.md:1793 |
| Brief 97 (Opus, after Atlas): the composer as the place to go, the graph maker (INBOX 860) | docs/roadmap/SESSION_BRIEFS.md:1798 |
| Brief 98 (Opus): goals and lists (INBOX 861) | docs/roadmap/SESSION_BRIEFS.md:1806 |
| Brief 99 (Sonnet, scan): every feature, element and action, used once (INBOX 862) | docs/roadmap/SESSION_BRIEFS.md:1812 |
| Briefs 25 to 31: the plans the owner asked to see finished | docs/roadmap/SESSION_BRIEFS.md:744 |
| Briefs 35 to 42 (2026-10-10, Fable orchestrating): the owner's list, the engine, the direction | docs/roadmap/SESSION_BRIEFS.md:1238 |
| Briefs 46 to 55 (2026-10-10, Fable): the whole app against world class | docs/roadmap/SESSION_BRIEFS.md:1520 |
| Briefs 56 to 59 (2026-10-10, Fable): the design review | docs/roadmap/SESSION_BRIEFS.md:1575 |
| Briefs 60 to 63 (2026-10-10, Fable): the backend review | docs/roadmap/SESSION_BRIEFS.md:1601 |
| Briefs 64 to 68 (CHAT_PLAN "The deterministic foundation") | docs/roadmap/SESSION_BRIEFS.md:1632 |
| Briefs 69 to 71 (DOCUMENTS_PLAN 23: the IDE; after Brief 42) | docs/roadmap/SESSION_BRIEFS.md:1676 |
| Briefs 72 to 74 (WORLD_CLASS_PLAN 28: the trust contract) | docs/roadmap/SESSION_BRIEFS.md:1700 |
| Briefs 76 onward (from Briefs 72a and 72b) | docs/roadmap/SESSION_BRIEFS.md:1706 |
| Bugs | docs/roadmap/CHAT_PLAN.md:845 |
| Bugs | docs/roadmap/DOCUMENTS_PLAN.md:1534 |
| Bugs | docs/roadmap/TIMELINE_PLAN.md:202 |
| Bugs | docs/roadmap/UI_MODERNISATION_PLAN.md:1245 |
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
| Candidate libraries | docs/roadmap/ANALYSIS.md:4108 |
| Composer decisions, taken with the owner, 2026-10-06 | docs/roadmap/CHAT_PLAN.md:816 |
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
| Decisions left to the owner | docs/roadmap/ANALYSIS.md:3633 |
| Decisions made | docs/roadmap/AGENT_SKILLS_REFORM.md:141 |
| Decisions made | docs/roadmap/MINDMAP_PLAN.md:911 |
| Decisions made | docs/roadmap/UI_MODERNISATION_PLAN.md:70 |
| Decisions made | docs/roadmap/UI_MODERNISATION_PLAN.md:1135 |
| Decisions made | docs/roadmap/WORLD_CLASS_PLAN.md:2232 |
| Decisions made (do not re-decide) | docs/roadmap/DOCUMENTS_PLAN.md:1290 |
| Decisions made (do not re-decide) | docs/roadmap/TIMELINE_PLAN.md:214 |
| Decisions made, 2026-10-05: draw.io phase 2 (wb-phase2) | docs/roadmap/WHITEBOARD_PLAN.md:359 |
| Decisions made, 2026-10-05: the draw.io pass (INBOX 557, 558) | docs/roadmap/WHITEBOARD_PLAN.md:295 |
| Decisions, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:1427 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/UI_MODERNISATION_PLAN.md:1040 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:1487 |
| Deepened 2026-10-10 (Brief 72a, decision 71) | docs/roadmap/WHITEBOARD_PLAN.md:1501 |
| Deepened 2026-10-10: statistics (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1444 |
| Deepened 2026-10-10: the agent and its harness (Brief 72b, decision 71) | docs/roadmap/AGENT_SKILLS_REFORM.md:438 |
| Deepened 2026-10-10: the command palette and Find anything (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1501 |
| Deepened 2026-10-10: utilities (Brief 72b, decision 71) | docs/roadmap/UI_MODERNISATION_PLAN.md:1475 |
| Deliberately not on this list | docs/roadmap/BACKLOG.md:2488 |
| Design requests | docs/roadmap/CHAT_PLAN.md:896 |
| Design requests | docs/roadmap/DOCUMENTS_PLAN.md:1545 |
| Design requests | docs/roadmap/UI_MODERNISATION_PLAN.md:1264 |
| Design requests | docs/roadmap/WORLD_CLASS_PLAN.md:3101 |
| Deta Surf (deta) | docs/roadmap/ANALYSIS.md:1991 |
| Diagrams: mermaid as the interchange format | docs/roadmap/BACKLOG.md:2543 |
| Direction, 2026-10-10 (Fable orchestrating): the thesis, the policies, the tracks | docs/ROADMAP.md:26 |
| Documents (code), against VS Code's editor features | docs/roadmap/ANALYSIS.md:3851 |
| Documents (prose), against wordcraft | docs/roadmap/ANALYSIS.md:3808 |
| E. App-wide usability and accessibility, the things that read as "side project" | docs/roadmap/AUDIT.md:95 |
| E. Local AI: where it is overused or misused | docs/roadmap/MODERNISATION_AUDIT.md:640 |
| E. Polish worth doing as one pass | docs/roadmap/BACKLOG.md:2451 |
| E. Whiteboard (WHITEBOARD_PLAN Phase 1) and mind maps (MINDMAP §12) | docs/roadmap/SESSION_BRIEFS.md:702 |
| E1 · A step is a turn, not a goal, Critical (reasoned) | docs/roadmap/MODERNISATION_AUDIT.md:645 |
| E2 · The complexity of the AI path is where the next bug will be, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:653 |
| E3 · Model calls are scattered across request handlers, background threads and module singletons, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:666 |
| E4 · The honest positives, so the section is not one-sided (read) | docs/roadmap/MODERNISATION_AUDIT.md:676 |
| Earlier sessions | docs/roadmap/HANDOVER.md:532 |
| Expert audit, 2026-10-10 | docs/roadmap/BACKLOG.md:4269 |
| F. Agent harness: what "ultimate" needs that is not there | docs/roadmap/AUDIT.md:113 |
| F. Library, dashboard, settings | docs/roadmap/SESSION_BRIEFS.md:707 |
| F. Performance and perceived speed | docs/roadmap/MODERNISATION_AUDIT.md:685 |
| F1 · Boot is ~1 s and tab switches are ~10–50 ms. The app is not slow; it is *heavy*: Medium | docs/roadmap/MODERNISATION_AUDIT.md:687 |
| F2 · Fourteen requests in sixty idle seconds, from three separate timers, High | docs/roadmap/MODERNISATION_AUDIT.md:708 |
| F3 · List rendering is solved; list *fetching* is not, Medium | docs/roadmap/MODERNISATION_AUDIT.md:733 |
| Fable's working notes for Opus (2026-09-09 05:10 UTC) | docs/roadmap/HANDOVER.md:187 |
| Found by an agent while measuring something else (2026-09-08, graph) | docs/roadmap/CHAT_PLAN.md:605 |
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
| Harper (Automattic) | docs/roadmap/ANALYSIS.md:1783 |
| Headroom: evaluated, not adopted | docs/roadmap/BACKLOG.md:710 |
| How far each plan actually is (honest, as of 2026-10-03) | docs/roadmap/HANDOVER.md:323 |
| How to proceed after PR 149 (the owner asked, 2026-09-14) | docs/roadmap/HANDOVER.md:486 |
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
| Ideas | docs/roadmap/CHAT_PLAN.md:940 |
| Ideas | docs/roadmap/DOCUMENTS_PLAN.md:1556 |
| Ideas | docs/roadmap/WORLD_CLASS_PLAN.md:3126 |
| If Opus is the orchestrator (no Fable available) | docs/roadmap/HANDOVER.md:45 |
| Image notes and the Library, against photocraft and lightcraft | docs/roadmap/ANALYSIS.md:3955 |
| Is its backend better designed? No: and it says so about itself | docs/roadmap/ANALYSIS.md:810 |
| KnowNote (MrSibe) | docs/roadmap/ANALYSIS.md:1932 |
| Later: weeks 9–12+: "structure that lasts" | docs/roadmap/MODERNISATION_AUDIT.md:1064 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:429 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:713 |
| Looked at and not recommended | docs/roadmap/ANALYSIS.md:882 |
| Mind map, against designcraft's canvas and MINDMAP_PLAN's references | docs/roadmap/ANALYSIS.md:3769 |
| Next PR, first (the owner, 2026-10-05: "maybe push these to next pr at the top of the roadmap") | docs/ROADMAP.md:212 |
| Next up, ranked by what it unlocks | docs/ROADMAP.md:344 |
| Next: weeks 5–8: "a small model can finish a job, and so can the app" | docs/roadmap/MODERNISATION_AUDIT.md:1049 |
| Not in this plan | docs/roadmap/UI_MODERNISATION_PLAN.md:585 |
| Not verified, and to be taken first by whoever opens this | docs/roadmap/MINDMAP_PLAN.md:1428 |
| Not verified, stated plainly | docs/roadmap/ANALYSIS.md:4492 |
| Now: weeks 0–4: "the app stops hiding its own content" | docs/roadmap/MODERNISATION_AUDIT.md:1034 |
| Odysseus read deeply, 2026-09-21 | docs/roadmap/ANALYSIS.md:2215 |
| Odysseus, fourth read 2026-10-10 (INBOX 747) | docs/roadmap/ANALYSIS.md:4144 |
| Open items | docs/roadmap/INBOX.md:35 |
| OpenJarvis (open-jarvis) | docs/roadmap/ANALYSIS.md:2894 |
| Order and dependencies | docs/roadmap/WORLD_CLASS_PLAN.md:1373 |
| PDF viewer and OCR workspace, against pdfcraft | docs/roadmap/ANALYSIS.md:3922 |
| PR 144 is done when (the owner's checklist, 2026-09-09 05:30 UTC) | docs/roadmap/HANDOVER.md:84 |
| Parity matrix, 2026-10-10 | docs/roadmap/ANALYSIS.md:3703 |
| Performance on small laptops, measured 2026-09-08 23:30 UTC (Chromium, 1366x768, no GPU) | docs/roadmap/WHITEBOARD_PLAN.md:635 |
| Phase 0: the bridge: click an underline, see suggestions (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:167 |
| Phase 10: the Liquid Glass adoptions (½ session) | docs/roadmap/UI_MODERNISATION_PLAN.md:590 |
| Phase 11: the phone, done properly (1 to 2 sessions, next session or later) | docs/roadmap/UI_MODERNISATION_PLAN.md:601 |
| Phase 12: density, refinement and WCAG 2.2 (the owner, 2026-10-10; Brief 41) | docs/roadmap/UI_MODERNISATION_PLAN.md:1013 |
| Phase 13: the design review, every surface against the principles (Fable, 2026-10-10) | docs/roadmap/UI_MODERNISATION_PLAN.md:1314 |
| Phase 1: chrome: three questions, three places (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:192 |
| Phase 1: grounding and marks (one session; Brief 12) | docs/roadmap/CHAT_PLAN.md:339 |
| Phase 1: the canvas renderer and physical drag (1–2 sessions) | docs/roadmap/GRAPH_PLAN.md:97 |
| Phase 1: the map object (foundation) | docs/roadmap/MINDMAP_PLAN.md:158 |
| Phase 1: the rail and the keys: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:490 |
| Phase 1: the row model and the feed: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:116 |
| Phase 2: editing that feels like a mindmap | docs/roadmap/MINDMAP_PLAN.md:177 |
| Phase 2: one composer, bubbles, streaming: **built 2026-09-13**, see | docs/roadmap/CHAT_PLAN.md:350 |
| Phase 2: the context bar: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:496 |
| Phase 2: the engine: CodeMirror 6 as the surface (2 sessions) | docs/roadmap/DOCUMENTS_PLAN.md:224 |
| Phase 2: the space (½ session) | docs/roadmap/GRAPH_PLAN.md:110 |
| Phase 2: the table view: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:120 |
| Phase 3: Ask unified, popup agent: **built 2026-09-13**, see | docs/roadmap/CHAT_PLAN.md:355 |
| Phase 3: blocks and structure: built, 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:249 |
| Phase 3: colour rules and groups (½ session) | docs/roadmap/GRAPH_PLAN.md:116 |
| Phase 3: export dialog, handles, highlighter: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:502 |
| Phase 3: the map as a citizen of the app | docs/roadmap/MINDMAP_PLAN.md:192 |
| Phase 3: the scrubber and pagination: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:124 |
| Phase 4: AI and export | docs/roadmap/MINDMAP_PLAN.md:208 |
| Phase 4: kinds and the journal: **built 2026-09-13**, see | docs/roadmap/TIMELINE_PLAN.md:128 |
| Phase 4: mind map regressions and Tidy: BUILT, 2026-09-12 | docs/roadmap/WHITEBOARD_PLAN.md:512 |
| Phase 4: skills that finish (one session; Brief 13) | docs/roadmap/CHAT_PLAN.md:365 |
| Phase 4: the connected document (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:261 |
| Phase 5: backend (built; one row deliberately deferred, see below) | docs/roadmap/GRAPH_PLAN.md:135 |
| Phase 5: review, history and AI (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:298 |
| Phase 5: the composer, after INBOX 725 (open) | docs/roadmap/CHAT_PLAN.md:385 |
| Phase 5: utility | docs/roadmap/MINDMAP_PLAN.md:228 |
| Phase 6: responsive by device (partly built; UI Phase 9 did the bands) | docs/roadmap/DOCUMENTS_PLAN.md:314 |
| Phase 6: the deterministic engine (the owner, 2026-10-10; Brief 39) | docs/roadmap/CHAT_PLAN.md:405 |
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
| Placed (last 20, newest first) | docs/roadmap/INBOX.md:272 |
| Placed from Brief 40, 2026-10-10 (does the MCP server work) | docs/roadmap/AGENT_SKILLS_REFORM.md:345 |
| Placed from Brief 40, 2026-10-10 (research and placement) | docs/roadmap/BACKLOG.md:4175 |
| Placed from Brief 40, 2026-10-10 (the phone over HTTPS) | docs/roadmap/WORLD_CLASS_PLAN.md:3137 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/CHAT_PLAN.md:1761 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/DOCUMENTS_PLAN.md:1572 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/GRAPH_PLAN.md:601 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/MINDMAP_PLAN.md:1822 |
| Placed from Brief 60, 2026-10-10 (the measured census) | docs/roadmap/WHITEBOARD_PLAN.md:1548 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/CHAT_PLAN.md:595 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:206 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/MINDMAP_PLAN.md:1448 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WHITEBOARD_PLAN.md:595 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WORLD_CLASS_PLAN.md:1540 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/CHAT_PLAN.md:627 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/DOCUMENTS_PLAN.md:617 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/GRAPH_PLAN.md:238 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/MINDMAP_PLAN.md:1453 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/WHITEBOARD_PLAN.md:689 |
| Placed from INBOX, 2026-09-09 to 2026-10-03 (all built) | docs/roadmap/UI_MODERNISATION_PLAN.md:1107 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/GRAPH_PLAN.md:322 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/MINDMAP_PLAN.md:1460 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/WORLD_CLASS_PLAN.md:1721 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1452 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/GRAPH_PLAN.md:330 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/MINDMAP_PLAN.md:1465 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WHITEBOARD_PLAN.md:694 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WORLD_CLASS_PLAN.md:2067 |
| Placed from INBOX, 2026-09-21 (the Ask sub-tab, four reports in one pass) | docs/roadmap/CHAT_PLAN.md:635 |
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
| Placed from INBOX, 2026-10-03 (INBOX 397) | docs/roadmap/BACKLOG.md:4131 |
| Placed from INBOX, 2026-10-03 (INBOX 403, the standing bar) | docs/roadmap/WORLD_CLASS_PLAN.md:2477 |
| Placed from INBOX, 2026-10-03 (INBOX 409: the AI assistant bar is what stays open) | docs/roadmap/DOCUMENTS_PLAN.md:1487 |
| Placed from INBOX, 2026-10-03 (the chat stutter, INBOX 413) | docs/roadmap/CHAT_PLAN.md:689 |
| Placed from INBOX, 2026-10-03 (the tray at its cap) | docs/roadmap/WORLD_CLASS_PLAN.md:2576 |
| Placed from INBOX, 2026-10-04 (design work for the next Opus slots) | docs/roadmap/WORLD_CLASS_PLAN.md:3035 |
| Placed from INBOX, 2026-10-04: parity with Obsidian's graph | docs/roadmap/GRAPH_PLAN.md:515 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/MINDMAP_PLAN.md:1487 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/WHITEBOARD_PLAN.md:843 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/AGENT_SKILLS_REFORM.md:339 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/CHAT_PLAN.md:712 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/DOCUMENTS_PLAN.md:1513 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/UI_MODERNISATION_PLAN.md:1200 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WHITEBOARD_PLAN.md:850 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WORLD_CLASS_PLAN.md:3047 |
| Placed from INBOX, 2026-10-05 (boardmap-1005) | docs/roadmap/WHITEBOARD_PLAN.md:858 |
| Placed from INBOX, 2026-10-05 (header bars, Settings navigation) | docs/roadmap/UI_MODERNISATION_PLAN.md:1232 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/DOCUMENTS_PLAN.md:1518 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/WHITEBOARD_PLAN.md:870 |
| Placed from INBOX, 2026-10-10 (code as documents) | docs/roadmap/DOCUMENTS_PLAN.md:1576 |
| Placed from INBOX, 2026-10-10 (filing suggestions) | docs/roadmap/WORLD_CLASS_PLAN.md:4186 |
| Placed from INBOX, 2026-10-10 (the coverage pass over 729 to 744) | docs/roadmap/CHAT_PLAN.md:1752 |
| Placed from INBOX, 2026-10-10 (the owner on feature depth) | docs/roadmap/MINDMAP_PLAN.md:1826 |
| Placed from INBOX, 2026-10-10 (the owner on feature depth) | docs/roadmap/WHITEBOARD_PLAN.md:1552 |
| Placed from INBOX, 2026-10-10 (the owner on the graph, again) | docs/roadmap/GRAPH_PLAN.md:606 |
| Placed from INBOX, 2026-10-10 (the owner's afternoon reports) | docs/roadmap/UI_MODERNISATION_PLAN.md:1533 |
| Placed from INBOX, 2026-10-11 (Files, Recordings and Links; libraryup) | docs/roadmap/DOCUMENTS_PLAN.md:1580 |
| Placed from INBOX, 2026-10-11 (Tidy, undoing a pattern, menu gaps) | docs/roadmap/UI_MODERNISATION_PLAN.md:1585 |
| Placed from INBOX, 2026-10-11 (bars, notifications and tours; grammar57) | docs/roadmap/UI_MODERNISATION_PLAN.md:1560 |
| Placed from INBOX, 2026-10-11 (board and map previews) | docs/roadmap/WHITEBOARD_PLAN.md:1651 |
| Placed from INBOX, 2026-10-11 (ends, edge arrows, guides while drawing; canvasdepth3) | docs/roadmap/WHITEBOARD_PLAN.md:1631 |
| Placed from INBOX, 2026-10-11 (fit a frame to its contents) | docs/roadmap/WHITEBOARD_PLAN.md:1614 |
| Placed from INBOX, 2026-10-11 (one export panel for the whole app) | docs/roadmap/WHITEBOARD_PLAN.md:1573 |
| Placed from INBOX, 2026-10-11 (the owner on buttons, OCR and the constellation) | docs/roadmap/UI_MODERNISATION_PLAN.md:1554 |
| Placed from INBOX, 2026-10-11 (the owner on dragging the force graph) | docs/roadmap/GRAPH_PLAN.md:611 |
| Placed from INBOX, 2026-10-11 (the owner's sweep request) | docs/roadmap/UI_MODERNISATION_PLAN.md:1548 |
| Placed from INBOX, 2026-10-11 (the owner: Atlas as the app's assistant) | docs/roadmap/CHAT_PLAN.md:1765 |
| Placed from INBOX, 2026-10-11 (the topic's tools) | docs/roadmap/MINDMAP_PLAN.md:1843 |
| Placed from INBOX, 2026-10-11 (voice notes, live captions, the focus timer; voiceup) | docs/roadmap/UI_MODERNISATION_PLAN.md:1566 |
| Placed from INBOX: 107d, the segmented mini bars | docs/roadmap/DOCUMENTS_PLAN.md:589 |
| Placed from INBOX: the composer everywhere (the owner, 2026-10-06) | docs/roadmap/CHAT_PLAN.md:716 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/BACKLOG.md:4161 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:841 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/DOCUMENTS_PLAN.md:1530 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/GRAPH_PLAN.md:588 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/MINDMAP_PLAN.md:1772 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/TIMELINE_PLAN.md:198 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/UI_MODERNISATION_PLAN.md:1236 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:917 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3080 |
| Placed from the owner, 2026-10-11: a tessellation view (next PR) | docs/roadmap/GRAPH_PLAN.md:617 |
| Placed from the settings agent, 2026-10-11 (a decision taken by standing order 3) | docs/roadmap/WORLD_CLASS_PLAN.md:4190 |
| Policies (taken 2026-10-10) | docs/ROADMAP.md:49 |
| Presentations from boards and maps, against deckcraft | docs/roadmap/ANALYSIS.md:4022 |
| Promoted to ROADMAP.md, Tier 3, items 32–36 | docs/roadmap/ANALYSIS.md:741 |
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
| Repositories and libraries read, 2026-10-10 | docs/roadmap/ANALYSIS.md:4051 |
| Revisited: where theirs is better, project by project | docs/roadmap/ANALYSIS.md:3527 |
| Rules for the whole plan | docs/roadmap/UI_MODERNISATION_PLAN.md:50 |
| Section 8's two cheap additions: **built 2026-10-05**, see | docs/roadmap/TIMELINE_PLAN.md:134 |
| Settings information architecture (INBOX 444) | docs/roadmap/UI_MODERNISATION_PLAN.md:1112 |
| Six repositories read for MemoryMap, 2026-09-20 | docs/roadmap/ANALYSIS.md:1760 |
| Sources | docs/roadmap/MINDMAP_PLAN.md:280 |
| Speech, four projects read by name, and what this app already does | docs/roadmap/ANALYSIS.md:3102 |
| Standing orders for this session (whoever the model is) | docs/roadmap/HANDOVER.md:259 |
| State of the branch (`claude/notes-flow-rebuild`, PR #162) | docs/roadmap/HANDOVER.md:343 |
| Steps | docs/roadmap/UI_MODERNISATION_PLAN.md:1091 |
| Steps | docs/roadmap/WORLD_CLASS_PLAN.md:1534 |
| Still open | docs/roadmap/WORLD_CLASS_PLAN.md:2267 |
| Still open after KG1 to KG9 | docs/roadmap/GRAPH_PLAN.md:536 |
| Still open: the upload split, and what it collides with | docs/roadmap/BACKLOG.md:2779 |
| Table | docs/roadmap/ANALYSIS.md:4430 |
| Tables in notes and documents, against gridcraft | docs/roadmap/ANALYSIS.md:3891 |
| The `pytesseract` vendoring question, measured | docs/roadmap/ANALYSIS.md:2102 |
| The app's stack (outside boards and documents) | docs/roadmap/WHITEBOARD_PLAN.md:473 |
| The assistant catalogue, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:952 |
| The asymmetry these exploit | docs/roadmap/WORLD_CLASS_PLAN.md:1072 |
| The constraint that governs everything below, **now half-lifted** | docs/roadmap/ANALYSIS.md:257 |
| The deterministic foundation, 2026-10-10 (INBOX 746) | docs/roadmap/CHAT_PLAN.md:1565 |
| The dock grammar (the rule the whole phase enforces) | docs/roadmap/UI_MODERNISATION_PLAN.md:433 |
| The draw.io programme, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:921 |
| The features audit's Phase G, what is left (placed 2026-10-05, op3-1005) | docs/roadmap/MINDMAP_PLAN.md:1629 |
| The forks and draw.io | docs/roadmap/ANALYSIS.md:4062 |
| The four reports, verbatim | docs/roadmap/CHAT_PLAN.md:673 |
| The gates that do not move | docs/roadmap/SESSION_BRIEFS.md:722 |
| The general lesson, which is not about this agent | docs/roadmap/ANALYSIS.md:657 |
| The harness does the work the model is worst at: decided 2026-09-21 | docs/roadmap/AGENT_SKILLS_REFORM.md:134 |
| The instruction, verbatim | docs/roadmap/AGENT_SKILLS_REFORM.md:7 |
| The instruction, verbatim | docs/roadmap/UI_MODERNISATION_PLAN.md:8 |
| The knowledge graph, 2026-10-04 (INBOX 528) | docs/roadmap/GRAPH_PLAN.md:521 |
| The moves that would outshine everything else, in order of leverage | docs/roadmap/WORLD_CLASS_PLAN.md:1025 |
| The night's merges reviewed line by line, 2026-09-21 | docs/roadmap/ANALYSIS.md:2584 |
| The one process change worth making | docs/roadmap/ANALYSIS.md:612 |
| The one thing deliberately not decided | docs/roadmap/ANALYSIS.md:670 |
| The one-line answers to the three questions asked | docs/roadmap/ANALYSIS.md:899 |
| The order, and the rule | docs/roadmap/WORLD_CLASS_PLAN.md:1903 |
| The owner's brainstorm, 2026-10-11 (after INBOX 812) | docs/roadmap/CHAT_PLAN.md:1847 |
| The peer apps: fourteen triaged, five read properly | docs/roadmap/ANALYSIS.md:3250 |
| The plan documents, in one list (read this before opening any of them) | docs/ROADMAP.md:268 |
| The quarter's briefs (shorter; expand each into the shape above when | docs/roadmap/SESSION_BRIEFS.md:462 |
| The reform, in phases | docs/roadmap/AGENT_SKILLS_REFORM.md:52 |
| The road to 1.0: milestones with exit criteria (the owner, 2026-10-10: "still very much a demo and beta") | docs/ROADMAP.md:171 |
| The scripts, and what each produced | docs/roadmap/MODERNISATION_AUDIT.md:40 |
| The specific work waiting for you | docs/roadmap/FABLE_BRIEF.md:134 |
| The thesis | docs/ROADMAP.md:39 |
| The thing this app is actually good at, which is not what it says on the tin | docs/roadmap/ANALYSIS.md:500 |
| The three killer combos | docs/roadmap/MODERNISATION_AUDIT.md:1079 |
| The tracks, in order (each a brief; the agent model in brackets) | docs/ROADMAP.md:113 |
| The two bars that are not docks (added by direct instruction) | docs/roadmap/UI_MODERNISATION_PLAN.md:522 |
| The work, surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:475 |
| Three rules that are not negotiable here | docs/roadmap/FABLE_BRIEF.md:51 |
| Three things I would prioritise, and why | docs/roadmap/ANALYSIS.md:516 |
| Tools and skills: is odysseus leaner for small models? Measured, and no | docs/roadmap/ANALYSIS.md:305 |
| Top five, ranked | docs/roadmap/ANALYSIS.md:4467 |
| Traps that have each cost real time | docs/ROADMAP.md:383 |
| Twenty-four repositories read for MemoryMap, 2026-09-21 | docs/roadmap/ANALYSIS.md:2588 |
| Undo coverage, audited 2026-10-05 (INBOX 537) | docs/roadmap/WHITEBOARD_PLAN.md:441 |
| Vendor candidates, 2026-10-11 | docs/roadmap/ANALYSIS.md:4400 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/CHAT_PLAN.md:1745 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/DOCUMENTS_PLAN.md:1561 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/GRAPH_PLAN.md:595 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/MINDMAP_PLAN.md:1816 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/TIMELINE_PLAN.md:248 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/UI_MODERNISATION_PLAN.md:1436 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WHITEBOARD_PLAN.md:1541 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WORLD_CLASS_PLAN.md:4177 |
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
| What is missing that nobody has asked for | docs/roadmap/ANALYSIS.md:595 |
| What reading it changed about how I'd judge this app | docs/roadmap/ANALYSIS.md:470 |
| What the code actually does today | docs/roadmap/AGENT_SKILLS_REFORM.md:27 |
| What this audit did not verify | docs/roadmap/MODERNISATION_AUDIT.md:1522 |
| What this read could not verify | docs/roadmap/ANALYSIS.md:3592 |
| What was built | docs/roadmap/BACKLOG.md:2775 |
| What was deliberately left out | docs/roadmap/WORLD_CLASS_PLAN.md:1388 |
| What was wrong, and is fixed this session | docs/roadmap/WORLD_CLASS_PLAN.md:1021 |
| Where I think the roadmap is over-invested | docs/roadmap/ANALYSIS.md:577 |
| Whiteboard, against draw.io and designcraft | docs/roadmap/ANALYSIS.md:3716 |
| Why the app feels "off" even where each screen is fine | docs/roadmap/WORLD_CLASS_PLAN.md:54 |
| Worth building, not this session | docs/roadmap/ANALYSIS.md:368 |
| Worth building: features, ranked by fit, and what actually happened | docs/roadmap/ANALYSIS.md:867 |
| Your standing task, alongside the plans | docs/roadmap/FABLE_BRIEF.md:71 |
| better-clawd (x1xhlol) and Clawd-Code (GPT-AGI) | docs/roadmap/ANALYSIS.md:2057 |
| blobatar (Alain00) | docs/roadmap/ANALYSIS.md:1877 |
| canvasdepth, ranked by how often a person meets the gap (2026-10-10) | docs/roadmap/MINDMAP_PLAN.md:1830 |
| canvasdepth, ranked by how often a person meets the gap (2026-10-10) | docs/roadmap/WHITEBOARD_PLAN.md:1556 |
| cognee (topoteretes) | docs/roadmap/ANALYSIS.md:2765 |
| cupid-music-player (cupidbity), and the music question attached to it | docs/roadmap/ANALYSIS.md:2976 |
| haifengl/smile: algorithms worth re-implementing small | docs/roadmap/ANALYSIS.md:4086 |
| needle (cactus-compute) | docs/roadmap/ANALYSIS.md:2684 |
| openwolf (cytostack) | docs/roadmap/ANALYSIS.md:2838 |
| quickLiquid (amarnath3003) | docs/roadmap/ANALYSIS.md:2629 |
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
| §114 addendum, two external write-ups folded in and removed | docs/roadmap/ANALYSIS.md:1717 |
| §114 addendum: after the whiteboard / documents / search sprint | docs/roadmap/ANALYSIS.md:1680 |
| §116: capability gaps identified in the Fable session | docs/roadmap/BACKLOG.md:3896 |
| §95: the forward list | docs/roadmap/BACKLOG.md:2352 |
| §96: Guides, and diagrams the whiteboard can take | docs/roadmap/BACKLOG.md:2500 |
| §98: reported live during the §90.2 small-screen pass, logged not built | docs/roadmap/BACKLOG.md:2669 |
| §99: the lightbox as a showcase, and uploads split by file type | docs/roadmap/BACKLOG.md:2769 |
