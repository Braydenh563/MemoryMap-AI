# Code map

Generated 2026-10-10 by `python scripts/codemap.py` from the repository. Every row is `name | file:line`: grep this file, then `sed -n 'A,Bp'` the lines you need. A stale map fails `tests/test_codemap_fresh.py`.

Counts: frontend functions 4750, frontend ids 2241, CSS sections 486, backend routes 481, backend modules 3573, test files 916, tests 8562, plan headings 934.

## Frontend functions (4750)

Top-level `function name(`, `async function name(` and `const name = (` in `frontend/js/` and `frontend/sw.js`, in index.html's script order; lazily loaded files after, by name. Rows sorted by name within each file.

### frontend/js/app.js (51)

| Name | File:line |
|---|---|
| `$` | frontend/js/app.js:167 |
| `api` | frontend/js/app.js:403 |
| `apiJson` | frontend/js/app.js:632 |
| `apiPagedList` | frontend/js/app.js:567 |
| `askPasswordPrompt` | frontend/js/app.js:750 |
| `authToken` | frontend/js/app.js:173 |
| `chip` | frontend/js/app.js:1456 |
| `chipWords` | frontend/js/app.js:1451 |
| `clearApiCache` | frontend/js/app.js:628 |
| `confirmDialog` | frontend/js/app.js:1561 |
| `confirmVerb` | frontend/js/app.js:1554 |
| `ensureModule` | frontend/js/app.js:2110 |
| `enterWithoutPassword` | frontend/js/app.js:707 |
| `hide` | frontend/js/app.js:169 |
| `hideBootSplash` | frontend/js/app.js:976 |
| `initAuth` | frontend/js/app.js:989 |
| `kickBackgroundTaskPoll` | frontend/js/app.js:597 |
| `lazyAssetStamp` | frontend/js/app.js:2049 |
| `lazyScript` | frontend/js/app.js:2090 |
| `lockNow` | frontend/js/app.js:950 |
| `makeUnlinkAccessible` | frontend/js/app.js:1527 |
| `mediaSrc` | frontend/js/app.js:262 |
| `mountNoteSurfaceNow` | frontend/js/app.js:2145 |
| `onDomReady` | frontend/js/app.js:2081 |
| `promptDialog` | frontend/js/app.js:1671 |
| `purgeLockedContent` | frontend/js/app.js:936 |
| `recordBrowserLog` | frontend/js/app.js:23 |
| `refreshActiveTab` | frontend/js/app.js:1301 |
| `refuseStagedUrls` | frontend/js/app.js:239 |
| `replaceMissingMedia` | frontend/js/app.js:310 |
| `reportTimezone` | frontend/js/app.js:1278 |
| `resumeWithoutPassword` | frontend/js/app.js:717 |
| `setBusy` | frontend/js/app.js:1496 |
| `setLabel` | frontend/js/app.js:1370 |
| `settingsModalOpen` | frontend/js/app.js:1444 |
| `settleLockPrompt` | frontend/js/app.js:728 |
| `sharedCaptureText` | frontend/js/app.js:1051 |
| `show` | frontend/js/app.js:168 |
| `showLockScreen` | frontend/js/app.js:791 |
| `smallButton` | frontend/js/app.js:1859 |
| `spinnerEl` | frontend/js/app.js:1487 |
| `stagePrimary` | frontend/js/app.js:1480 |
| `stagedImageByUrl` | frontend/js/app.js:207 |
| `stagedImageUrl` | frontend/js/app.js:203 |
| `startApp` | frontend/js/app.js:1083 |
| `startWithoutPassword` | frontend/js/app.js:692 |
| `submitLockForm` | frontend/js/app.js:828 |
| `takeSharedIntake` | frontend/js/app.js:1062 |
| `whenScriptsLoaded` | frontend/js/app.js:2030 |
| `wireBackdropClose` | frontend/js/app.js:1847 |
| `zoomWheelDelta` | frontend/js/app.js:256 |

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

### frontend/js/note-cards.js (35)

| Name | File:line |
|---|---|
| `answerSuggestedTags` | frontend/js/note-cards.js:140 |
| `askAtlasAboutNote` | frontend/js/note-cards.js:2355 |
| `askAtlasAboutThing` | frontend/js/note-cards.js:2362 |
| `binNoteWithUndo` | frontend/js/note-cards.js:1196 |
| `entryCardControls` | frontend/js/note-cards.js:2375 |
| `entryItem` | frontend/js/note-cards.js:1371 |
| `entryListFocusStop` | frontend/js/note-cards.js:2388 |
| `entryListSetStop` | frontend/js/note-cards.js:2393 |
| `favouriteButton` | frontend/js/note-cards.js:1156 |
| `fitNoteMetas` | frontend/js/note-cards.js:1266 |
| `formatFileSize` | frontend/js/note-cards.js:1110 |
| `libraryListsBoard` | frontend/js/note-cards.js:1034 |
| `loadMapBoardIndex` | frontend/js/note-cards.js:969 |
| `mapBoardById` | frontend/js/note-cards.js:997 |
| `mapBoardRows` | frontend/js/note-cards.js:1023 |
| `mapBoardTitled` | frontend/js/note-cards.js:1009 |
| `mapChip` | frontend/js/note-cards.js:907 |
| `mapCountLabel` | frontend/js/note-cards.js:858 |
| `mapPreview` | frontend/js/note-cards.js:386 |
| `mapPreviewEdge` | frontend/js/note-cards.js:269 |
| `mapPreviewFitText` | frontend/js/note-cards.js:171 |
| `mapPreviewMeasurer` | frontend/js/note-cards.js:115 |
| `mapPreviewOnColour` | frontend/js/note-cards.js:214 |
| `mapPreviewOnPaper` | frontend/js/note-cards.js:189 |
| `mapPreviewOverlaps` | frontend/js/note-cards.js:196 |
| `mapPreviewSketch` | frontend/js/note-cards.js:308 |
| `mapPreviewTextWidth` | frontend/js/note-cards.js:151 |
| `noteIsMeeting` | frontend/js/note-cards.js:1152 |
| `noteMetaMore` | frontend/js/note-cards.js:1354 |
| `noteReviewActions` | frontend/js/note-cards.js:2306 |
| `notesSpanSpaces` | frontend/js/note-cards.js:1217 |
| `publishDraft` | frontend/js/note-cards.js:1341 |
| `renderAttachmentCards` | frontend/js/note-cards.js:1230 |
| `round2` | frontend/js/note-cards.js:249 |
| `showNoteInGraph` | frontend/js/note-cards.js:2347 |

### frontend/js/menus.js (38)

| Name | File:line |
|---|---|
| `afterMenuExit` | frontend/js/menus.js:673 |
| `buildConnectionGroups` | frontend/js/menus.js:1216 |
| `buildMenuGroupButton` | frontend/js/menus.js:1583 |
| `buildMenuItemButton` | frontend/js/menus.js:1553 |
| `cardOpener` | frontend/js/menus.js:372 |
| `closeActionMenus` | frontend/js/menus.js:70 |
| `closeActionMenusOnScroll` | frontend/js/menus.js:25 |
| `closeHelpPopovers` | frontend/js/menus.js:237 |
| `connectionRowCues` | frontend/js/menus.js:1125 |
| `docBacklinkContext` | frontend/js/menus.js:1171 |
| `entryOverflowMenu` | frontend/js/menus.js:1747 |
| `escapeAndCapMenu` | frontend/js/menus.js:722 |
| `escapeMenuIfClipped` | frontend/js/menus.js:628 |
| `explainNote` | frontend/js/menus.js:2168 |
| `fitActionMenuInWindow` | frontend/js/menus.js:419 |
| `focusMenuItem` | frontend/js/menus.js:541 |
| `generateEntryTitle` | frontend/js/menus.js:1440 |
| `historyActorLabel` | frontend/js/menus.js:1379 |
| `inlineActionIs` | frontend/js/menus.js:8 |
| `isEditConflict` | frontend/js/menus.js:2158 |
| `linkNoteMention` | frontend/js/menus.js:1197 |
| `menuClippingAncestor` | frontend/js/menus.js:555 |
| `menuExitMs` | frontend/js/menus.js:680 |
| `menuSidePlan` | frontend/js/menus.js:397 |
| `nearestScrollParent` | frontend/js/menus.js:120 |
| `openActionMenu` | frontend/js/menus.js:439 |
| `openConnections` | frontend/js/menus.js:1088 |
| `placeEscapedMenu` | frontend/js/menus.js:595 |
| `placeHelpPopover` | frontend/js/menus.js:151 |
| `removeEntryTitle` | frontend/js/menus.js:1464 |
| `restoreEscapedMenu` | frontend/js/menus.js:687 |
| `restoreEscapedMenuAfterExit` | frontend/js/menus.js:668 |
| `toggleEntryPrivacy` | frontend/js/menus.js:1402 |
| `wireEscapedActionMenu` | frontend/js/menus.js:791 |
| `wireEscapedMenuResize` | frontend/js/menus.js:1071 |
| `wireHelpPopover` | frontend/js/menus.js:290 |
| `wireMenuKeyboard` | frontend/js/menus.js:1492 |
| `withBacklinks` | frontend/js/menus.js:1187 |

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

### frontend/js/notes-list.js (109)

| Name | File:line |
|---|---|
| `_loadEntries` | frontend/js/notes-list.js:2832 |
| `appendInline` | frontend/js/notes-list.js:1164 |
| `appendInlineRun` | frontend/js/notes-list.js:936 |
| `applyEntryListTabOrder` | frontend/js/notes-list.js:2370 |
| `applyNotesViewMode` | frontend/js/notes-list.js:2018 |
| `attachmentCard` | frontend/js/notes-list.js:626 |
| `attachmentExt` | frontend/js/notes-list.js:578 |
| `attachmentFacts` | frontend/js/notes-list.js:595 |
| `attachmentIconClass` | frontend/js/notes-list.js:511 |
| `attachmentKind` | frontend/js/notes-list.js:586 |
| `boardEmbedRef` | frontend/js/notes-list.js:1275 |
| `boardEmbedTarget` | frontend/js/notes-list.js:1295 |
| `bodyWithoutTitleLine` | frontend/js/notes-list.js:1181 |
| `categoryAutoDot` | frontend/js/notes-list.js:2464 |
| `categoryColour` | frontend/js/notes-list.js:2459 |
| `categoryColoursChanged` | frontend/js/notes-list.js:2476 |
| `categoryDotColour` | frontend/js/notes-list.js:2469 |
| `categoryMenuItems` | frontend/js/notes-list.js:2714 |
| `clearSkeletons` | frontend/js/notes-list.js:2780 |
| `compareCategoryNames` | frontend/js/notes-list.js:2668 |
| `engineQueryIds` | frontend/js/notes-list.js:187 |
| `ensureCardCounts` | frontend/js/notes-list.js:3163 |
| `ensureMapChipsFor` | frontend/js/notes-list.js:3205 |
| `ensureOneCardCount` | frontend/js/notes-list.js:3167 |
| `entryListItems` | frontend/js/notes-list.js:2368 |
| `entryListOrder` | frontend/js/notes-list.js:2952 |
| `entryNeedsReview` | frontend/js/notes-list.js:218 |
| `expandAngleAutolinks` | frontend/js/notes-list.js:848 |
| `fileCard` | frontend/js/notes-list.js:699 |
| `fileChip` | frontend/js/notes-list.js:544 |
| `fileKindLabel` | frontend/js/notes-list.js:537 |
| `fillCategoryOptions` | frontend/js/notes-list.js:93 |
| `filterNotesBy` | frontend/js/notes-list.js:2179 |
| `filterNotesByTag` | frontend/js/notes-list.js:2166 |
| `focusNoteRow` | frontend/js/notes-list.js:54 |
| `foldNoteToolbarForFirstPaint` | frontend/js/notes-list.js:17 |
| `highlightIconsInto` | frontend/js/notes-list.js:1619 |
| `highlightInto` | frontend/js/notes-list.js:1646 |
| `initEntryListKeyboardNav` | frontend/js/notes-list.js:2380 |
| `isRenderableUrl` | frontend/js/notes-list.js:479 |
| `libraryVisibleRows` | frontend/js/notes-list.js:2193 |
| `linkAppAddresses` | frontend/js/notes-list.js:859 |
| `listedNoteIds` | frontend/js/notes-list.js:2037 |
| `liveQueryBar` | frontend/js/notes-list.js:304 |
| `liveQueryIds` | frontend/js/notes-list.js:156 |
| `loadCategories` | frontend/js/notes-list.js:2485 |
| `loadEntries` | frontend/js/notes-list.js:2824 |
| `markSidebarRowCurrent` | frontend/js/notes-list.js:2672 |
| `matchesSearch` | frontend/js/notes-list.js:371 |
| `matchesTagCount` | frontend/js/notes-list.js:350 |
| `noteCountExcludingDrafts` | frontend/js/notes-list.js:2156 |
| `noteEditedTime` | frontend/js/notes-list.js:1747 |
| `noteFormMayClose` | frontend/js/notes-list.js:48 |
| `noteListed` | frontend/js/notes-list.js:2152 |
| `noteQueryIsEmpty` | frontend/js/notes-list.js:333 |
| `noteSemanticLoaded` | frontend/js/notes-list.js:367 |
| `noteSortName` | frontend/js/notes-list.js:1751 |
| `noteTopicChip` | frontend/js/notes-list.js:3112 |
| `notesRailFocusSubject` | frontend/js/notes-list.js:3463 |
| `notesRailHiddenByChoice` | frontend/js/notes-list.js:3292 |
| `notesRailNearGroup` | frontend/js/notes-list.js:3434 |
| `notesRailSync` | frontend/js/notes-list.js:3303 |
| `notesRailWanted` | frontend/js/notes-list.js:3320 |
| `nudgeReviewQueue` | frontend/js/notes-list.js:3216 |
| `nudgeUntaggedNotes` | frontend/js/notes-list.js:3237 |
| `offerWikiRename` | frontend/js/notes-list.js:3546 |
| `openNoteEditor` | frontend/js/notes-list.js:68 |
| `orderedNotesForCurrentView` | frontend/js/notes-list.js:1951 |
| `paginateNotesForDisplay` | frontend/js/notes-list.js:1917 |
| `paintCategoryDot` | frontend/js/notes-list.js:2472 |
| `paintEntriesProgress` | frontend/js/notes-list.js:2812 |
| `parseNoteQuery` | frontend/js/notes-list.js:237 |
| `propQuery` | frontend/js/notes-list.js:2173 |
| `readableUrl` | frontend/js/notes-list.js:875 |
| `referenceCountChip` | frontend/js/notes-list.js:3049 |
| `referenceCountText` | frontend/js/notes-list.js:3037 |
| `refreshEntries` | frontend/js/notes-list.js:2960 |
| `refreshNoteSearchWhy` | frontend/js/notes-list.js:1709 |
| `reminderCountChip` | frontend/js/notes-list.js:3092 |
| `renderEntries` | frontend/js/notes-list.js:2214 |
| `renderIncrementally` | frontend/js/notes-list.js:1822 |
| `renderInlineMarkdown` | frontend/js/notes-list.js:892 |
| `renderNoteInline` | frontend/js/notes-list.js:1536 |
| `renderNoteText` | frontend/js/notes-list.js:1413 |
| `renderNotesRail` | frontend/js/notes-list.js:3339 |
| `renderSidebar` | frontend/js/notes-list.js:2500 |
| `resolveCategoryChoice` | frontend/js/notes-list.js:120 |
| `resolveNotePage` | frontend/js/notes-list.js:1991 |
| `resolveWikiTarget` | frontend/js/notes-list.js:1303 |
| `safeHref` | frontend/js/notes-list.js:825 |
| `scheduleEntriesProgress` | frontend/js/notes-list.js:2819 |
| `scheduleNotesRail` | frontend/js/notes-list.js:3315 |
| `searchHighlightTerms` | frontend/js/notes-list.js:1681 |
| `setNotesRailHidden` | frontend/js/notes-list.js:3468 |
| `setNotesViewMode` | frontend/js/notes-list.js:2074 |
| `showEntrySkeletons` | frontend/js/notes-list.js:2751 |
| `showNotesFilter` | frontend/js/notes-list.js:229 |
| `showSkeletons` | frontend/js/notes-list.js:2769 |
| `sortEntries` | frontend/js/notes-list.js:1755 |
| `syncNotesRailToggle` | frontend/js/notes-list.js:3328 |
| `toggleExpandAllRows` | frontend/js/notes-list.js:2063 |
| `toggleRowExpanded` | frontend/js/notes-list.js:2096 |
| `unlatex` | frontend/js/notes-list.js:743 |
| `updateExpandAllButton` | frontend/js/notes-list.js:2043 |
| `whyThisResultChip` | frontend/js/notes-list.js:1693 |
| `wikiForms` | frontend/js/notes-list.js:1223 |
| `wikiStem` | frontend/js/notes-list.js:1241 |
| `wireCategoryDropTarget` | frontend/js/notes-list.js:2733 |
| `wireSidebarRowKeys` | frontend/js/notes-list.js:2681 |

### frontend/js/capture-ask.js (88)

| Name | File:line |
|---|---|
| `addInlineCitations` | frontend/js/capture-ask.js:1091 |
| `announce` | frontend/js/capture-ask.js:783 |
| `answerFigure` | frontend/js/capture-ask.js:1924 |
| `answerObject` | frontend/js/capture-ask.js:2017 |
| `askAsOf` | frontend/js/capture-ask.js:3237 |
| `askNotesOnTheRight` | frontend/js/capture-ask.js:2139 |
| `askQuestion` | frontend/js/capture-ask.js:2850 |
| `askStatusBusy` | frontend/js/capture-ask.js:2820 |
| `askStatusText` | frontend/js/capture-ask.js:2805 |
| `citationInsertionPoint` | frontend/js/capture-ask.js:1063 |
| `citationKey` | frontend/js/capture-ask.js:1016 |
| `citationMarker` | frontend/js/capture-ask.js:1178 |
| `citationNumbers` | frontend/js/capture-ask.js:983 |
| `citationPeekText` | frontend/js/capture-ask.js:1343 |
| `citationTextIndex` | frontend/js/capture-ask.js:1030 |
| `clearAskAnswerFoot` | frontend/js/capture-ask.js:2068 |
| `clearCaptureStatusOnInput` | frontend/js/capture-ask.js:532 |
| `clearCaptureTagSuggestions` | frontend/js/capture-ask.js:467 |
| `clearCitedPassage` | frontend/js/capture-ask.js:1549 |
| `clickableResult` | frontend/js/capture-ask.js:951 |
| `closeCitationPeek` | frontend/js/capture-ask.js:1450 |
| `collapseCitationRuns` | frontend/js/capture-ask.js:1153 |
| `copyAnswer` | frontend/js/capture-ask.js:3166 |
| `createDocumentNamed` | frontend/js/capture-ask.js:270 |
| `evidenceBlock` | frontend/js/capture-ask.js:1311 |
| `evidenceRows` | frontend/js/capture-ask.js:1848 |
| `evidenceSignals` | frontend/js/capture-ask.js:1289 |
| `evidenceSpan` | frontend/js/capture-ask.js:1282 |
| `evidenceToggle` | frontend/js/capture-ask.js:1815 |
| `filedByText` | frontend/js/capture-ask.js:199 |
| `filingOutcomeText` | frontend/js/capture-ask.js:169 |
| `flashCategory` | frontend/js/capture-ask.js:927 |
| `flashEntry` | frontend/js/capture-ask.js:832 |
| `flashReminder` | frontend/js/capture-ask.js:901 |
| `focusCaptureBox` | frontend/js/capture-ask.js:428 |
| `groundingThumbs` | frontend/js/capture-ask.js:1701 |
| `heldOffline` | frontend/js/capture-ask.js:546 |
| `holdPictureTokens` | frontend/js/capture-ask.js:1918 |
| `liveMarkdownRenderer` | frontend/js/capture-ask.js:2682 |
| `loadAskHistoryBadge` | frontend/js/capture-ask.js:3201 |
| `loadCaptureDocuments` | frontend/js/capture-ask.js:255 |
| `loadSuggestions` | frontend/js/capture-ask.js:3172 |
| `loadTemplates` | frontend/js/capture-ask.js:3271 |
| `matchReasonBadge` | frontend/js/capture-ask.js:2361 |
| `newChat` | frontend/js/capture-ask.js:2763 |
| `notePictures` | frontend/js/capture-ask.js:1686 |
| `noteSurfaceIfAny` | frontend/js/capture-ask.js:393 |
| `noteTemplateForUse` | frontend/js/capture-ask.js:375 |
| `noteTemplateText` | frontend/js/capture-ask.js:364 |
| `numberMatchingRecords` | frontend/js/capture-ask.js:1604 |
| `offerJumpToNewNote` | frontend/js/capture-ask.js:12 |
| `openCitationPeek` | frontend/js/capture-ask.js:1366 |
| `openDocumentFromNote` | frontend/js/capture-ask.js:397 |
| `pictureItems` | frontend/js/capture-ask.js:1698 |
| `placeAnswerFigures` | frontend/js/capture-ask.js:1959 |
| `renderAnswerGrounding` | frontend/js/capture-ask.js:1736 |
| `renderAnswerSupport` | frontend/js/capture-ask.js:1633 |
| `renderAskAnswerFoot` | frontend/js/capture-ask.js:2085 |
| `renderAskFollowups` | frontend/js/capture-ask.js:2156 |
| `renderAskHint` | frontend/js/capture-ask.js:2200 |
| `renderAskTrail` | frontend/js/capture-ask.js:2737 |
| `renderAskedQuestion` | frontend/js/capture-ask.js:2781 |
| `renderCaptureDocumentAdder` | frontend/js/capture-ask.js:328 |
| `renderCaptureDocuments` | frontend/js/capture-ask.js:290 |
| `renderCaptureTagSuggestions` | frontend/js/capture-ask.js:475 |
| `renderChatMeta` | frontend/js/capture-ask.js:2239 |
| `renderEvidenceView` | frontend/js/capture-ask.js:1870 |
| `renderRelatedElsewhere` | frontend/js/capture-ask.js:1561 |
| `renderToolsUnsupportedNotice` | frontend/js/capture-ask.js:1666 |
| `resetCaptureForm` | frontend/js/capture-ask.js:435 |
| `retryAnswer` | frontend/js/capture-ask.js:3162 |
| `saveEntry` | frontend/js/capture-ask.js:560 |
| `saveEntryAsDraft` | frontend/js/capture-ask.js:685 |
| `scheduleCaptureTagSuggestions` | frontend/js/capture-ask.js:501 |
| `scheduleCitationPeek` | frontend/js/capture-ask.js:1324 |
| `scheduleCitationPeekClose` | frontend/js/capture-ask.js:1335 |
| `scrollEditingEntryIntoView` | frontend/js/capture-ask.js:807 |
| `setAnsweredBy` | frontend/js/capture-ask.js:2230 |
| `setAskScope` | frontend/js/capture-ask.js:3229 |
| `setAsking` | frontend/js/capture-ask.js:2723 |
| `settleCaptureStatus` | frontend/js/capture-ask.js:123 |
| `showAskAsOf` | frontend/js/capture-ask.js:3243 |
| `showCitedPassage` | frontend/js/capture-ask.js:1518 |
| `stopAnswer` | frontend/js/capture-ask.js:2729 |
| `streamChat` | frontend/js/capture-ask.js:2392 |
| `streamChatEvents` | frontend/js/capture-ask.js:2429 |
| `watchFiling` | frontend/js/capture-ask.js:46 |
| `withTitle` | frontend/js/capture-ask.js:413 |

### frontend/js/chat.js (84)

| Name | File:line |
|---|---|
| `aiWritingTrace` | frontend/js/chat.js:2394 |
| `applyCompression` | frontend/js/chat.js:2254 |
| `askAboutPage` | frontend/js/chat.js:1558 |
| `assistantLabel` | frontend/js/chat.js:52 |
| `assistantMessageActions` | frontend/js/chat.js:162 |
| `atlasSuggestion` | frontend/js/chat.js:803 |
| `batteryModeOn` | frontend/js/chat.js:2296 |
| `bookmarkWebResult` | frontend/js/chat.js:1387 |
| `buildWebResultRow` | frontend/js/chat.js:1264 |
| `chatHistoryToSend` | frontend/js/chat.js:36 |
| `chatMessageActions` | frontend/js/chat.js:65 |
| `chatTranscriptText` | frontend/js/chat.js:2192 |
| `chatTurnTranscript` | frontend/js/chat.js:125 |
| `citeWebPage` | frontend/js/chat.js:1697 |
| `clearChatEmptyState` | frontend/js/chat.js:932 |
| `closeWebReader` | frontend/js/chat.js:1001 |
| `compactTokens` | frontend/js/chat.js:490 |
| `compressChatContext` | frontend/js/chat.js:2220 |
| `continueRunControls` | frontend/js/chat.js:226 |
| `copyToClipboard` | frontend/js/chat.js:547 |
| `copyViaTextarea` | frontend/js/chat.js:514 |
| `copyWebLink` | frontend/js/chat.js:1379 |
| `editAndResend` | frontend/js/chat.js:627 |
| `fillPersonaMark` | frontend/js/chat.js:1972 |
| `flashCopied` | frontend/js/chat.js:536 |
| `forkFromBubble` | frontend/js/chat.js:761 |
| `livingInterval` | frontend/js/chat.js:2380 |
| `loadResponseModes` | frontend/js/chat.js:1927 |
| `loadWebSearchHistory` | frontend/js/chat.js:1418 |
| `manualPauseControls` | frontend/js/chat.js:272 |
| `messageMetaLine` | frontend/js/chat.js:340 |
| `metaItem` | frontend/js/chat.js:306 |
| `mountChatActionsMenu` | frontend/js/chat.js:2117 |
| `openWebPageExternally` | frontend/js/chat.js:1375 |
| `openWebReader` | frontend/js/chat.js:1574 |
| `personaOptions` | frontend/js/chat.js:1989 |
| `progressLine` | frontend/js/chat.js:2718 |
| `progressMotionWanted` | frontend/js/chat.js:2332 |
| `progressPhaseText` | frontend/js/chat.js:2586 |
| `pushWebSearchHistory` | frontend/js/chat.js:1427 |
| `questionForBubble` | frontend/js/chat.js:715 |
| `reducedMotionWanted` | frontend/js/chat.js:2302 |
| `refreshWebSearxngStrip` | frontend/js/chat.js:1180 |
| `regenerateFromBubble` | frontend/js/chat.js:733 |
| `regenerateLastAnswer` | frontend/js/chat.js:784 |
| `removeChatBubble` | frontend/js/chat.js:500 |
| `renderChatContextMeter` | frontend/js/chat.js:2063 |
| `renderChatEmptyState` | frontend/js/chat.js:823 |
| `renderChatTurnCount` | frontend/js/chat.js:2096 |
| `renderChatUsage` | frontend/js/chat.js:2046 |
| `renderCompressionState` | frontend/js/chat.js:2267 |
| `renderModelContextBox` | frontend/js/chat.js:1790 |
| `renderModelHealthNote` | frontend/js/chat.js:1890 |
| `renderModelSpec` | frontend/js/chat.js:1818 |
| `renderWebPageAttachment` | frontend/js/chat.js:1724 |
| `renderWebPanelMenu` | frontend/js/chat.js:1106 |
| `renderWebSearchHistory` | frontend/js/chat.js:1446 |
| `rewriteAnswerWith` | frontend/js/chat.js:752 |
| `runWebSearch` | frontend/js/chat.js:1475 |
| `saveChatAsDocument` | frontend/js/chat.js:2169 |
| `saveWebPageAsNote` | frontend/js/chat.js:1649 |
| `scheduleThinkingWordTick` | frontend/js/chat.js:2508 |
| `setResponseMode` | frontend/js/chat.js:1950 |
| `setWebEngineDot` | frontend/js/chat.js:1092 |
| `setWebSearxngRunning` | frontend/js/chat.js:1166 |
| `showCompressReview` | frontend/js/chat.js:2242 |
| `showCopyFallback` | frontend/js/chat.js:571 |
| `startThinkingWordRotation` | frontend/js/chat.js:2536 |
| `stopThinkingWordRotation` | frontend/js/chat.js:2558 |
| `stopWebRequest` | frontend/js/chat.js:986 |
| `togglePersonaPrompt` | frontend/js/chat.js:2038 |
| `toggleWebPanel` | frontend/js/chat.js:1014 |
| `toolPhaseVerb` | frontend/js/chat.js:2601 |
| `typingDots` | frontend/js/chat.js:2615 |
| `webEngineWords` | frontend/js/chat.js:1075 |
| `webPageContextBlock` | frontend/js/chat.js:1755 |
| `webPageMarkdown` | frontend/js/chat.js:1669 |
| `webQueryTerms` | frontend/js/chat.js:1251 |
| `webReaderIsOpen` | frontend/js/chat.js:997 |
| `webRequestEnd` | frontend/js/chat.js:976 |
| `webRequestStart` | frontend/js/chat.js:967 |
| `webResultMark` | frontend/js/chat.js:1230 |
| `wheelScrollsHorizontally` | frontend/js/chat.js:2443 |
| `wireHorizontalWheelScrolling` | frontend/js/chat.js:2476 |

### frontend/js/chat-agent.js (72)

| Name | File:line |
|---|---|
| `addAssistantBubble` | frontend/js/chat-agent.js:1139 |
| `addBubble` | frontend/js/chat-agent.js:414 |
| `agentTimeline` | frontend/js/chat-agent.js:504 |
| `assistantAvatar` | frontend/js/chat-agent.js:1074 |
| `assistantHeadRow` | frontend/js/chat-agent.js:1112 |
| `cancelDraft` | frontend/js/chat-agent.js:2658 |
| `cardTextPreview` | frontend/js/chat-agent.js:1444 |
| `changeRow` | frontend/js/chat-agent.js:1189 |
| `chatAttachmentStrip` | frontend/js/chat-agent.js:212 |
| `chatHeadIsAtlas` | frontend/js/chat-agent.js:1022 |
| `chatHeadKey` | frontend/js/chat-agent.js:1027 |
| `chatPositions` | frontend/js/chat-agent.js:99 |
| `chatScrollToEnd` | frontend/js/chat-agent.js:188 |
| `chatSourcesFrom` | frontend/js/chat-agent.js:1973 |
| `chatSourcesPanel` | frontend/js/chat-agent.js:2099 |
| `clearDraftTarget` | frontend/js/chat-agent.js:2568 |
| `composeDraft` | frontend/js/chat-agent.js:2678 |
| `deactivateControls` | frontend/js/chat-agent.js:1959 |
| `draftTranslateKind` | frontend/js/chat-agent.js:2428 |
| `draftWithHeading` | frontend/js/chat-agent.js:2877 |
| `followBottom` | frontend/js/chat-agent.js:39 |
| `followReleased` | frontend/js/chat-agent.js:28 |
| `isImageCardUrl` | frontend/js/chat-agent.js:1436 |
| `keepAtBottom` | frontend/js/chat-agent.js:136 |
| `markDraftQuickstart` | frontend/js/chat-agent.js:2463 |
| `markToolStep` | frontend/js/chat-agent.js:1609 |
| `nestedTakesWheelUp` | frontend/js/chat-agent.js:33 |
| `noteChatPosition` | frontend/js/chat-agent.js:104 |
| `paintAssistantAvatar` | frontend/js/chat-agent.js:1095 |
| `paintAssistantHeads` | frontend/js/chat-agent.js:1125 |
| `paintPersonaAvatar` | frontend/js/chat-agent.js:1034 |
| `paintUserMarks` | frontend/js/chat-agent.js:392 |
| `paneWordCount` | frontend/js/chat-agent.js:2584 |
| `pushDraftUndo` | frontend/js/chat-agent.js:2603 |
| `refreshAfterToolChanges` | frontend/js/chat-agent.js:1904 |
| `rememberDraftVersion` | frontend/js/chat-agent.js:2536 |
| `renderAgentQuestion` | frontend/js/chat-agent.js:1834 |
| `renderDraftQuickstarts` | frontend/js/chat-agent.js:2438 |
| `renderDraftSources` | frontend/js/chat-agent.js:2475 |
| `renderDraftTarget` | frontend/js/chat-agent.js:2556 |
| `renderDraftVersions` | frontend/js/chat-agent.js:2507 |
| `renderMemoryProposal` | frontend/js/chat-agent.js:1759 |
| `renderRecordsDetails` | frontend/js/chat-agent.js:2278 |
| `renderToolConfirm` | frontend/js/chat-agent.js:1683 |
| `repaintAssistantAvatars` | frontend/js/chat-agent.js:1100 |
| `restoreChatPosition` | frontend/js/chat-agent.js:124 |
| `restoreDraftLocally` | frontend/js/chat-agent.js:2360 |
| `saveDraftAsNote` | frontend/js/chat-agent.js:2882 |
| `saveDraftLocally` | frontend/js/chat-agent.js:2338 |
| `savedPersona` | frontend/js/chat-agent.js:997 |
| `setDraftBusy` | frontend/js/chat-agent.js:2647 |
| `setDraftStatus` | frontend/js/chat-agent.js:2576 |
| `settlePendingAgentQuestion` | frontend/js/chat-agent.js:1830 |
| `sourceHost` | frontend/js/chat-agent.js:2074 |
| `streamDraft` | frontend/js/chat-agent.js:2795 |
| `suggestDraftTitle` | frontend/js/chat-agent.js:2833 |
| `syncChatJumpLatest` | frontend/js/chat-agent.js:158 |
| `thinkingFold` | frontend/js/chat-agent.js:466 |
| `thinkingFoldIn` | frontend/js/chat-agent.js:486 |
| `thinkingPaint` | frontend/js/chat-agent.js:480 |
| `toolCardChips` | frontend/js/chat-agent.js:1524 |
| `toolCardsRow` | frontend/js/chat-agent.js:1583 |
| `toolChip` | frontend/js/chat-agent.js:1614 |
| `toolPreviewBody` | frontend/js/chat-agent.js:1467 |
| `toolPreviewPanel` | frontend/js/chat-agent.js:1502 |
| `toolTouchedRow` | frontend/js/chat-agent.js:1597 |
| `translateNoteInDesk` | frontend/js/chat-agent.js:2414 |
| `undoDraft` | frontend/js/chat-agent.js:2625 |
| `updateDraftCount` | frontend/js/chat-agent.js:2590 |
| `updateDraftUndoButton` | frontend/js/chat-agent.js:2612 |
| `userMarkEl` | frontend/js/chat-agent.js:405 |
| `userMarkSeed` | frontend/js/chat-agent.js:381 |

### frontend/js/chat-attach.js (68)

| Name | File:line |
|---|---|
| `appendRunResumeControls` | frontend/js/chat-attach.js:1371 |
| `attachBoardToChat` | frontend/js/chat-attach.js:577 |
| `attachChatFiles` | frontend/js/chat-attach.js:385 |
| `attachDocumentToChat` | frontend/js/chat-attach.js:630 |
| `attachImageFiles` | frontend/js/chat-attach.js:297 |
| `attachLibraryFile` | frontend/js/chat-attach.js:522 |
| `attachSelectionContext` | frontend/js/chat-attach.js:685 |
| `attachedNotes` | frontend/js/chat-attach.js:820 |
| `buildFollowupStrip` | frontend/js/chat-attach.js:2644 |
| `chatDeleteUndo` | frontend/js/chat-attach.js:2971 |
| `chatDockMoreOpen` | frontend/js/chat-attach.js:1310 |
| `clearSelectionAttachment` | frontend/js/chat-attach.js:697 |
| `closeChatDockMore` | frontend/js/chat-attach.js:1347 |
| `closeExtractPreview` | frontend/js/chat-attach.js:164 |
| `closeNotePicker` | frontend/js/chat-attach.js:1295 |
| `commitExtractPreview` | frontend/js/chat-attach.js:169 |
| `commitStagedImages` | frontend/js/chat-attach.js:337 |
| `deleteChatTurn` | frontend/js/chat-attach.js:2750 |
| `deleteCurrentChat` | frontend/js/chat-attach.js:2945 |
| `exportChatMarkdown` | frontend/js/chat-attach.js:2992 |
| `extractRefLabel` | frontend/js/chat-attach.js:53 |
| `flattenNoteMarkdown` | frontend/js/chat-attach.js:849 |
| `followupChain` | frontend/js/chat-attach.js:2673 |
| `followupMatches` | frontend/js/chat-attach.js:2671 |
| `followupParent` | frontend/js/chat-attach.js:2664 |
| `followupTrail` | frontend/js/chat-attach.js:2690 |
| `importChatDocuments` | frontend/js/chat-attach.js:427 |
| `isImageFile` | frontend/js/chat-attach.js:378 |
| `isStreamingConversation` | frontend/js/chat-attach.js:2873 |
| `keepUnreadableChatFile` | frontend/js/chat-attach.js:398 |
| `markFollowup` | frontend/js/chat-attach.js:2714 |
| `mountChatTimer` | frontend/js/chat-attach.js:2801 |
| `newChatConversation` | frontend/js/chat-attach.js:2893 |
| `noteLabel` | frontend/js/chat-attach.js:826 |
| `notePickerColumns` | frontend/js/chat-attach.js:1159 |
| `notePickerEmpty` | frontend/js/chat-attach.js:1123 |
| `notePickerFacts` | frontend/js/chat-attach.js:969 |
| `notePickerKeydown` | frontend/js/chat-attach.js:1173 |
| `notePickerOpen` | frontend/js/chat-attach.js:1304 |
| `notePickerPage` | frontend/js/chat-attach.js:1140 |
| `notePickerRoving` | frontend/js/chat-attach.js:1149 |
| `notePickerShape` | frontend/js/chat-attach.js:979 |
| `notePickerUsedIn` | frontend/js/chat-attach.js:961 |
| `offerFollowups` | frontend/js/chat-attach.js:2575 |
| `openChatDockMore` | frontend/js/chat-attach.js:1323 |
| `openExtractPreview` | frontend/js/chat-attach.js:22 |
| `openNotePicker` | frontend/js/chat-attach.js:1260 |
| `paintChatTimer` | frontend/js/chat-attach.js:2814 |
| `plainText` | frontend/js/chat-attach.js:863 |
| `reattachStreamingTurn` | frontend/js/chat-attach.js:2884 |
| `refreshFollowupVisibility` | frontend/js/chat-attach.js:2624 |
| `releaseChatComposer` | frontend/js/chat-attach.js:2845 |
| `renderAttachments` | frontend/js/chat-attach.js:914 |
| `renderBoardAttachments` | frontend/js/chat-attach.js:590 |
| `renderDocumentAttachments` | frontend/js/chat-attach.js:643 |
| `renderExtractPreview` | frontend/js/chat-attach.js:59 |
| `renderFileAttachments` | frontend/js/chat-attach.js:531 |
| `renderFollowups` | frontend/js/chat-attach.js:2610 |
| `renderImageAttachments` | frontend/js/chat-attach.js:253 |
| `renderSelectionAttachment` | frontend/js/chat-attach.js:702 |
| `revalidateSelection` | frontend/js/chat-attach.js:749 |
| `saveFollowups` | frontend/js/chat-attach.js:2733 |
| `selectionContextBlock` | frontend/js/chat-attach.js:800 |
| `sendChatMessage` | frontend/js/chat-attach.js:1478 |
| `setNoteLabel` | frontend/js/chat-attach.js:871 |
| `setNotePickerSource` | frontend/js/chat-attach.js:1233 |
| `startChatTimer` | frontend/js/chat-attach.js:2826 |
| `stopChatTimer` | frontend/js/chat-attach.js:2835 |

### frontend/js/sheets-selects.js (50)

| Name | File:line |
|---|---|
| `aiNameNow` | frontend/js/sheets-selects.js:2063 |
| `annotateSliders` | frontend/js/sheets-selects.js:973 |
| `applySidebarSheetMode` | frontend/js/sheets-selects.js:199 |
| `applySidebarWidth` | frontend/js/sheets-selects.js:100 |
| `applyWebPanelWidth` | frontend/js/sheets-selects.js:500 |
| `builtinPersonas` | frontend/js/sheets-selects.js:2162 |
| `builtinThinkingWords` | frontend/js/sheets-selects.js:2112 |
| `clampToolbarMenu` | frontend/js/sheets-selects.js:1244 |
| `eachSidebar` | frontend/js/sheets-selects.js:192 |
| `editChatAnswer` | frontend/js/sheets-selects.js:1705 |
| `editedMarker` | frontend/js/sheets-selects.js:1694 |
| `enhanceAllSelects` | frontend/js/sheets-selects.js:984 |
| `enhanceSelect` | frontend/js/sheets-selects.js:680 |
| `focusSelect` | frontend/js/sheets-selects.js:1001 |
| `formatTokens` | frontend/js/sheets-selects.js:1463 |
| `initResizableSidebars` | frontend/js/sheets-selects.js:449 |
| `initSidebarSheetDismissal` | frontend/js/sheets-selects.js:262 |
| `kebabMenu` | frontend/js/sheets-selects.js:1097 |
| `labelledMenu` | frontend/js/sheets-selects.js:614 |
| `layoutIsStacked` | frontend/js/sheets-selects.js:42 |
| `layoutIsTablet` | frontend/js/sheets-selects.js:79 |
| `lightboxReadingsFor` | frontend/js/sheets-selects.js:1434 |
| `loadChatSuggestions` | frontend/js/sheets-selects.js:1993 |
| `loadConversationList` | frontend/js/sheets-selects.js:1532 |
| `makeMenuItem` | frontend/js/sheets-selects.js:594 |
| `makeSidebarResizable` | frontend/js/sheets-selects.js:312 |
| `makeWebPanelResizable` | frontend/js/sheets-selects.js:537 |
| `openConversation` | frontend/js/sheets-selects.js:1768 |
| `openKebabSheet` | frontend/js/sheets-selects.js:1043 |
| `parseServerTime` | frontend/js/sheets-selects.js:1472 |
| `personaDisplayName` | frontend/js/sheets-selects.js:2069 |
| `personaNamesNow` | frontend/js/sheets-selects.js:2187 |
| `relativeTime` | frontend/js/sheets-selects.js:1482 |
| `renderDashboardPersonaSelect` | frontend/js/sheets-selects.js:2403 |
| `renderPersonas` | frontend/js/sheets-selects.js:2192 |
| `replaceOpenToolbarMenus` | frontend/js/sheets-selects.js:1350 |
| `resetWebPanelWidth` | frontend/js/sheets-selects.js:518 |
| `savePersonaList` | frontend/js/sheets-selects.js:2177 |
| `shortModelName` | frontend/js/sheets-selects.js:1389 |
| `sidebarDefault` | frontend/js/sheets-selects.js:23 |
| `sidebarFittedWidth` | frontend/js/sheets-selects.js:86 |
| `sidebarWidth` | frontend/js/sheets-selects.js:25 |
| `sortConversations` | frontend/js/sheets-selects.js:1519 |
| `thinkingWordsFor` | frontend/js/sheets-selects.js:2128 |
| `trackSeparatorValue` | frontend/js/sheets-selects.js:297 |
| `wantsThinkingWords` | frontend/js/sheets-selects.js:2149 |
| `watchForSelects` | frontend/js/sheets-selects.js:1013 |
| `webPanelIsNarrow` | frontend/js/sheets-selects.js:484 |
| `webPanelMaxWidth` | frontend/js/sheets-selects.js:494 |
| `wireInPlaceSheetDismissal` | frontend/js/sheets-selects.js:244 |

### frontend/js/skills.js (60)

| Name | File:line |
|---|---|
| `allSkills` | frontend/js/skills.js:28 |
| `appendToolRow` | frontend/js/skills.js:954 |
| `applyToolFilter` | frontend/js/skills.js:1018 |
| `askSkillInputs` | frontend/js/skills.js:240 |
| `batchArchive` | frontend/js/skills.js:1347 |
| `batchDelete` | frontend/js/skills.js:1390 |
| `batchEach` | frontend/js/skills.js:1314 |
| `batchExport` | frontend/js/skills.js:1384 |
| `batchFavourite` | frontend/js/skills.js:1341 |
| `batchMove` | frontend/js/skills.js:1292 |
| `batchNoun` | frontend/js/skills.js:1337 |
| `batchPublish` | frontend/js/skills.js:1358 |
| `batchPut` | frontend/js/skills.js:1333 |
| `batchSelection` | frontend/js/skills.js:1286 |
| `batchTag` | frontend/js/skills.js:1306 |
| `blobToBase64` | frontend/js/skills.js:1084 |
| `buildSkillsPanel` | frontend/js/skills.js:438 |
| `customSkills` | frontend/js/skills.js:35 |
| `desktopShell` | frontend/js/skills.js:1076 |
| `downloadBlob` | frontend/js/skills.js:1116 |
| `downloadFromApi` | frontend/js/skills.js:1100 |
| `downloadJson` | frontend/js/skills.js:1054 |
| `enterSelectMode` | frontend/js/skills.js:1259 |
| `exitSelectMode` | frontend/js/skills.js:1276 |
| `fillBatchCategories` | frontend/js/skills.js:1232 |
| `fillBatchMore` | frontend/js/skills.js:1364 |
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
| `addReminder` | frontend/js/shell-reminders.js:1626 |
| `buildSelect` | frontend/js/shell-reminders.js:1804 |
| `clearDoneReminders` | frontend/js/shell-reminders.js:1117 |
| `clipText` | frontend/js/shell-reminders.js:771 |
| `curtainShell` | frontend/js/shell-reminders.js:1766 |
| `defaultDueValue` | frontend/js/shell-reminders.js:1709 |
| `glideStrip` | frontend/js/shell-reminders.js:296 |
| `liftLockScreen` | frontend/js/shell-reminders.js:1787 |
| `loadReminders` | frontend/js/shell-reminders.js:855 |
| `magicAddReminder` | frontend/js/shell-reminders.js:1657 |
| `markScrollEdge` | frontend/js/shell-reminders.js:424 |
| `markTabBarRecede` | frontend/js/shell-reminders.js:495 |
| `nextRecurringDate` | frontend/js/shell-reminders.js:1368 |
| `noteAnyImage` | frontend/js/shell-reminders.js:701 |
| `noteFirstImage` | frontend/js/shell-reminders.js:708 |
| `notePreviewText` | frontend/js/shell-reminders.js:793 |
| `nudgeDue` | frontend/js/shell-reminders.js:1498 |
| `onScrollEdge` | frontend/js/shell-reminders.js:527 |
| `paginateDoneReminders` | frontend/js/shell-reminders.js:953 |
| `presetDate` | frontend/js/shell-reminders.js:1387 |
| `refreshMediaSession` | frontend/js/shell-reminders.js:1730 |
| `refreshReminderDefaults` | frontend/js/shell-reminders.js:1519 |
| `relativeWhen` | frontend/js/shell-reminders.js:1333 |
| `reminderComposeIsPristine` | frontend/js/shell-reminders.js:1507 |
| `reminderEditForm` | frontend/js/shell-reminders.js:1551 |
| `reminderItem` | frontend/js/shell-reminders.js:1156 |
| `reminderTarget` | frontend/js/shell-reminders.js:1314 |
| `renderReminderCalendar` | frontend/js/shell-reminders.js:976 |
| `revealActiveTab` | frontend/js/shell-reminders.js:256 |
| `safeMdSlice` | frontend/js/shell-reminders.js:653 |
| `setDue` | frontend/js/shell-reminders.js:1436 |
| `snoozeReminderTo` | frontend/js/shell-reminders.js:1528 |
| `startClockTicker` | frontend/js/shell-reminders.js:59 |
| `startMinuteTicker` | frontend/js/shell-reminders.js:34 |
| `stopClockTicker` | frontend/js/shell-reminders.js:63 |
| `stripFrontmatter` | frontend/js/shell-reminders.js:781 |
| `syncDueFromParts` | frontend/js/shell-reminders.js:1450 |
| `syncEdgeFade` | frontend/js/shell-reminders.js:363 |
| `syncPartsFromDue` | frontend/js/shell-reminders.js:1442 |
| `syncScrollEdges` | frontend/js/shell-reminders.js:578 |
| `syncTabOverflowFade` | frontend/js/shell-reminders.js:214 |
| `tabBarMode` | frontend/js/shell-reminders.js:208 |
| `tabCentreSpace` | frontend/js/shell-reminders.js:145 |
| `tabContentWidth` | frontend/js/shell-reminders.js:185 |
| `tabRowSpace` | frontend/js/shell-reminders.js:120 |
| `tickClocks` | frontend/js/shell-reminders.js:12 |
| `toLocalInputValue` | frontend/js/shell-reminders.js:1359 |
| `updateDueReadout` | frontend/js/shell-reminders.js:1462 |
| `updateReminderBadge` | frontend/js/shell-reminders.js:1086 |
| `wikiLinkLabel` | frontend/js/shell-reminders.js:732 |
| `wikiLinkShown` | frontend/js/shell-reminders.js:758 |
| `wikiLinkTarget` | frontend/js/shell-reminders.js:749 |

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
| `activeNotesSection` | frontend/js/navigation.js:2219 |
| `arrowNavTarget` | frontend/js/navigation.js:201 |
| `backgroundWriteFailed` | frontend/js/navigation.js:1740 |
| `chatMessagesEl` | frontend/js/navigation.js:2364 |
| `closeNavHistoryMenu` | frontend/js/navigation.js:845 |
| `confirmLeavingUnsavedWork` | frontend/js/navigation.js:1711 |
| `coversAFormPrimary` | frontend/js/navigation.js:2523 |
| `entryLabel` | frontend/js/navigation.js:943 |
| `formPrimaryButtons` | frontend/js/navigation.js:2484 |
| `goToTabHistory` | frontend/js/navigation.js:1034 |
| `hasUnsavedWork` | frontend/js/navigation.js:1678 |
| `initNotesSubtabs` | frontend/js/navigation.js:2278 |
| `initScrollTopButton` | frontend/js/navigation.js:2543 |
| `insideClosedDetails` | frontend/js/navigation.js:1516 |
| `loadSurface` | frontend/js/navigation.js:1276 |
| `measureSpacingPx` | frontend/js/navigation.js:2514 |
| `menuOfOpener` | frontend/js/navigation.js:1538 |
| `menuRowsOf` | frontend/js/navigation.js:1523 |
| `openHistoryEntry` | frontend/js/navigation.js:1094 |
| `openNavHistoryMenu` | frontend/js/navigation.js:865 |
| `openRowMenu` | frontend/js/navigation.js:144 |
| `openSelectionScope` | frontend/js/navigation.js:307 |
| `paintTabHistory` | frontend/js/navigation.js:892 |
| `placeDockMenuInWindow` | frontend/js/navigation.js:1347 |
| `positionScrollTopForNested` | frontend/js/navigation.js:2386 |
| `recordTabVisit` | frontend/js/navigation.js:980 |
| `renderMarkdown` | frontend/js/navigation.js:355 |
| `renderMemorySettings` | frontend/js/navigation.js:2684 |
| `resetNavigationForNewSession` | frontend/js/navigation.js:2181 |
| `resetNavigationToDefaults` | frontend/js/navigation.js:2200 |
| `restoreSettingsScroll` | frontend/js/navigation.js:1081 |
| `revealTab` | frontend/js/navigation.js:775 |
| `rowMenuAtEvent` | frontend/js/navigation.js:123 |
| `scrollTopTargetEl` | frontend/js/navigation.js:2368 |
| `scrollingPage` | frontend/js/navigation.js:2317 |
| `showNotesSection` | frontend/js/navigation.js:2224 |
| `spacingPx` | frontend/js/navigation.js:2507 |
| `stepTabHistory` | frontend/js/navigation.js:1024 |
| `stripMarkdownPreview` | frontend/js/navigation.js:2108 |
| `surfaceFailed` | frontend/js/navigation.js:1207 |
| `surfaceRecovered` | frontend/js/navigation.js:1254 |
| `switchTab` | frontend/js/navigation.js:1789 |
| `syncScrollLock` | frontend/js/navigation.js:2826 |
| `tabLabel` | frontend/js/navigation.js:931 |
| `tabPlaceholder` | frontend/js/navigation.js:2044 |
| `tabSkeletonBar` | frontend/js/navigation.js:2025 |
| `tabSkeletonDock` | frontend/js/navigation.js:2035 |
| `tabSkeletonPiece` | frontend/js/navigation.js:2014 |
| `usageCount` | frontend/js/navigation.js:1750 |
| `usageFeatureName` | frontend/js/navigation.js:1746 |
| `usageFlush` | frontend/js/navigation.js:1754 |
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
| `routerOpen` | frontend/js/router.js:208 |
| `routerPaintTitle` | frontend/js/router.js:161 |
| `routerRestore` | frontend/js/router.js:234 |
| `routerSettle` | frontend/js/router.js:244 |

### frontend/js/settings-panes.js (38)

| Name | File:line |
|---|---|
| `autoGrow` | frontend/js/settings-panes.js:40 |
| `autoGrowInputs` | frontend/js/settings-panes.js:188 |
| `autoGrowLimit` | frontend/js/settings-panes.js:32 |
| `autoGrowStillFits` | frontend/js/settings-panes.js:170 |
| `autoGrowVisible` | frontend/js/settings-panes.js:201 |
| `catalogueRun` | frontend/js/settings-panes.js:1199 |
| `changePassword` | frontend/js/settings-panes.js:564 |
| `chatDockReleaseRing` | frontend/js/settings-panes.js:348 |
| `chatDockSuppressRing` | frontend/js/settings-panes.js:329 |
| `checkForSourceUpdateNotice` | frontend/js/settings-panes.js:807 |
| `currentZoom` | frontend/js/settings-panes.js:1050 |
| `downloadExport` | frontend/js/settings-panes.js:1023 |
| `fitChatEmpty` | frontend/js/settings-panes.js:290 |
| `fitComposerToDock` | frontend/js/settings-panes.js:244 |
| `flashRevealed` | frontend/js/settings-panes.js:1156 |
| `hud` | frontend/js/settings-panes.js:1095 |
| `initAutoGrow` | frontend/js/settings-panes.js:441 |
| `initComposerResize` | frontend/js/settings-panes.js:363 |
| `loadPreferences` | frontend/js/settings-panes.js:644 |
| `markPrefsDirty` | frontend/js/settings-panes.js:952 |
| `markPrefsSaved` | frontend/js/settings-panes.js:968 |
| `nudgeZoom` | frontend/js/settings-panes.js:1116 |
| `paletteAbouts` | frontend/js/settings-panes.js:1457 |
| `paletteCommands` | frontend/js/settings-panes.js:1208 |
| `paletteKeys` | frontend/js/settings-panes.js:1443 |
| `paletteRowParts` | frontend/js/settings-panes.js:1468 |
| `refitComposer` | frontend/js/settings-panes.js:269 |
| `renderAccount` | frontend/js/settings-panes.js:488 |
| `renderAutonomousSettings` | frontend/js/settings-panes.js:725 |
| `renderPrefs` | frontend/js/settings-panes.js:662 |
| `renderWebSearch` | frontend/js/settings-panes.js:746 |
| `savePrefs` | frontend/js/settings-panes.js:848 |
| `saveSearchProvider` | frontend/js/settings-panes.js:785 |
| `setPreference` | frontend/js/settings-panes.js:830 |
| `setZoom` | frontend/js/settings-panes.js:1054 |
| `updateProfileCount` | frontend/js/settings-panes.js:1011 |
| `watchOverlays` | frontend/js/settings-panes.js:453 |
| `wirePrefsDirtyMarks` | frontend/js/settings-panes.js:987 |

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

### frontend/js/status.js (94)

| Name | File:line |
|---|---|
| `agentActivityNotice` | frontend/js/status.js:867 |
| `agentActivityQuiet` | frontend/js/status.js:859 |
| `aiIsOff` | frontend/js/status.js:1865 |
| `aiOffGlyph` | frontend/js/status.js:2151 |
| `aiOfflineDismissed` | frontend/js/status.js:1956 |
| `aiStatusState` | frontend/js/status.js:2038 |
| `announcedReminders` | frontend/js/status.js:42 |
| `askNotificationPermission` | frontend/js/status.js:636 |
| `backendLabel` | frontend/js/status.js:2571 |
| `boardHistoryActive` | frontend/js/status.js:1424 |
| `checkDueReminders` | frontend/js/status.js:758 |
| `closeNotifications` | frontend/js/status.js:623 |
| `dismissAiOffline` | frontend/js/status.js:1965 |
| `dismissNotification` | frontend/js/status.js:213 |
| `dismissToast` | frontend/js/status.js:970 |
| `dismissedNotificationIds` | frontend/js/status.js:204 |
| `emailSupportReport` | frontend/js/status.js:1013 |
| `forcedReadIds` | frontend/js/status.js:162 |
| `forcedUnreadIds` | frontend/js/status.js:131 |
| `isNotificationUnread` | frontend/js/status.js:180 |
| `jobsRunning` | frontend/js/status.js:1729 |
| `keepToastAction` | frontend/js/status.js:325 |
| `lastAnswerLine` | frontend/js/status.js:2173 |
| `loadMostUsed` | frontend/js/status.js:1643 |
| `loadRecentQuestions` | frontend/js/status.js:1617 |
| `noteServerDown` | frontend/js/status.js:1297 |
| `noteServerUp` | frontend/js/status.js:1306 |
| `noticeLiveValid` | frontend/js/status.js:347 |
| `noticeTaskTransitions` | frontend/js/status.js:2817 |
| `noticeUnwatchedAnswer` | frontend/js/status.js:902 |
| `notificationActionButton` | frontend/js/status.js:385 |
| `notificationGoes` | frontend/js/status.js:378 |
| `notificationsMuted` | frontend/js/status.js:844 |
| `notificationsReadAt` | frontend/js/status.js:113 |
| `notify` | frontend/js/status.js:710 |
| `nudgeEmbeddingProblem` | frontend/js/status.js:2216 |
| `openNotifications` | frontend/js/status.js:425 |
| `openUndoHistoryMenu` | frontend/js/status.js:1558 |
| `paintStatusItem` | frontend/js/status.js:2270 |
| `paintTitle` | frontend/js/status.js:743 |
| `performRedo` | frontend/js/status.js:1469 |
| `performUndo` | frontend/js/status.js:1447 |
| `plainHttpError` | frontend/js/status.js:1086 |
| `playReminderChime` | frontend/js/status.js:676 |
| `pollServerHealth` | frontend/js/status.js:1334 |
| `primeReminderAudio` | frontend/js/status.js:651 |
| `pushEntryPutUndo` | frontend/js/status.js:1399 |
| `pushUndo` | frontend/js/status.js:1371 |
| `recordNotification` | frontend/js/status.js:97 |
| `refreshBackgroundTasks` | frontend/js/status.js:2746 |
| `refreshModelStatus` | frontend/js/status.js:1757 |
| `rememberAnnounced` | frontend/js/status.js:50 |
| `renderAgentActivityMode` | frontend/js/status.js:938 |
| `renderAiOfflineNotice` | frontend/js/status.js:1976 |
| `renderAiPill` | frontend/js/status.js:2181 |
| `renderBackendPicker` | frontend/js/status.js:2581 |
| `renderChatModeSeg` | frontend/js/status.js:2525 |
| `renderNotifMuteToggle` | frontend/js/status.js:255 |
| `renderNotificationBadge` | frontend/js/status.js:235 |
| `renderSearchEngineHealth` | frontend/js/status.js:2459 |
| `renderSettings` | frontend/js/status.js:2614 |
| `renderStatusBar` | frontend/js/status.js:2306 |
| `renderUndoBar` | frontend/js/status.js:1500 |
| `reopenAnswerPanel` | frontend/js/status.js:917 |
| `resetStatusCadence` | frontend/js/status.js:1707 |
| `retryServerNow` | frontend/js/status.js:1347 |
| `runNotificationGo` | frontend/js/status.js:364 |
| `scheduleServerDownRetry` | frontend/js/status.js:1321 |
| `scheduleUndoBar` | frontend/js/status.js:1492 |
| `setChatMode` | frontend/js/status.js:2559 |
| `setForcedReadIds` | frontend/js/status.js:171 |
| `setForcedUnreadIds` | frontend/js/status.js:140 |
| `setNotificationUnread` | frontend/js/status.js:186 |
| `setTitleCount` | frontend/js/status.js:748 |
| `setTitleView` | frontend/js/status.js:753 |
| `settingsOpen` | frontend/js/status.js:1724 |
| `settleUndoFromToast` | frontend/js/status.js:1388 |
| `showServerDownBanner` | frontend/js/status.js:1280 |
| `startReminderWatch` | frontend/js/status.js:825 |
| `storedNotifications` | frontend/js/status.js:84 |
| `surfaceHistory` | frontend/js/status.js:1436 |
| `syncAgentPaletteAvailability` | frontend/js/status.js:2012 |
| `syncModelGatedControls` | frontend/js/status.js:1876 |
| `taskKey` | frontend/js/status.js:2798 |
| `toast` | frontend/js/status.js:1118 |
| `toastAction` | frontend/js/status.js:1234 |
| `toastActionButton` | frontend/js/status.js:1215 |
| `toastCloseButton` | frontend/js/status.js:978 |
| `toastHost` | frontend/js/status.js:1055 |
| `toastProgress` | frontend/js/status.js:1183 |
| `toastStack` | frontend/js/status.js:954 |
| `toggleAiStatusPopup` | frontend/js/status.js:2444 |
| `toggleNotificationMute` | frontend/js/status.js:271 |
| `unreadNotifications` | frontend/js/status.js:229 |

### frontend/js/ai-tools.js (42)

| Name | File:line |
|---|---|
| `_namesSignature` | frontend/js/ai-tools.js:262 |
| `applyEmbeddingBackend` | frontend/js/ai-tools.js:1273 |
| `applyFeatureModel` | frontend/js/ai-tools.js:618 |
| `applyImprove` | frontend/js/ai-tools.js:1255 |
| `applyPalette` | frontend/js/ai-tools.js:1560 |
| `clearEmbeddingBackendLatch` | frontend/js/ai-tools.js:1320 |
| `closeImprove` | frontend/js/ai-tools.js:1212 |
| `featureModelChoiceLabel` | frontend/js/ai-tools.js:612 |
| `featureModelMenuItem` | frontend/js/ai-tools.js:811 |
| `featureModelRow` | frontend/js/ai-tools.js:594 |
| `featureModelState` | frontend/js/ai-tools.js:602 |
| `fillModelSelect` | frontend/js/ai-tools.js:266 |
| `improveReady` | frontend/js/ai-tools.js:1201 |
| `looksLikeEmbeddingModel` | frontend/js/ai-tools.js:1269 |
| `mirroredUiKeys` | frontend/js/ai-tools.js:1394 |
| `openChatModelPanel` | frontend/js/ai-tools.js:425 |
| `openFeatureModelSheet` | frontend/js/ai-tools.js:736 |
| `openImprove` | frontend/js/ai-tools.js:1177 |
| `placeChatModelPanel` | frontend/js/ai-tools.js:393 |
| `renderAutonomousModelPicker` | frontend/js/ai-tools.js:944 |
| `renderChatActiveModelBadge` | frontend/js/ai-tools.js:318 |
| `renderChatModelPicker` | frontend/js/ai-tools.js:299 |
| `renderEmbeddingPicker` | frontend/js/ai-tools.js:959 |
| `renderFeatureModels` | frontend/js/ai-tools.js:638 |
| `renderOcrModelPicker` | frontend/js/ai-tools.js:925 |
| `renderReindex` | frontend/js/ai-tools.js:1121 |
| `renderTaskHistory` | frontend/js/ai-tools.js:191 |
| `renderTasks` | frontend/js/ai-tools.js:20 |
| `renderUtilityModelPicker` | frontend/js/ai-tools.js:519 |
| `renderVisionModelPicker` | frontend/js/ai-tools.js:542 |
| `runImprove` | frontend/js/ai-tools.js:1218 |
| `saveUiState` | frontend/js/ai-tools.js:1452 |
| `seedUiStateFromServer` | frontend/js/ai-tools.js:1522 |
| `syncEmbeddingPickerState` | frontend/js/ai-tools.js:1058 |
| `syncFeatureModelSelects` | frontend/js/ai-tools.js:846 |
| `taskElapsed` | frontend/js/ai-tools.js:142 |
| `taskSteps` | frontend/js/ai-tools.js:160 |
| `uiStateFingerprint` | frontend/js/ai-tools.js:1441 |
| `uiStatePayload` | frontend/js/ai-tools.js:1428 |
| `watchMirroredUiKeys` | frontend/js/ai-tools.js:1496 |
| `wireFeatureModelSelects` | frontend/js/ai-tools.js:907 |
| `wireReindexButton` | frontend/js/ai-tools.js:1100 |

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

### frontend/js/wiring.js (35)

| Name | File:line |
|---|---|
| `addAtlasLine` | frontend/js/wiring.js:248 |
| `applyPendingChatTitle` | frontend/js/wiring.js:787 |
| `applyPlanMode` | frontend/js/wiring.js:1489 |
| `askAtlasAbout` | frontend/js/wiring.js:237 |
| `chatRecallStep` | frontend/js/wiring.js:850 |
| `clearDueNudges` | frontend/js/wiring.js:1760 |
| `closeGlobalFind` | frontend/js/wiring.js:674 |
| `dashboardGreetingPersona` | frontend/js/wiring.js:955 |
| `escapeForFind` | frontend/js/wiring.js:452 |
| `escapeHtml` | frontend/js/wiring.js:437 |
| `globalFindClearHighlights` | frontend/js/wiring.js:510 |
| `globalFindRun` | frontend/js/wiring.js:521 |
| `globalFindShowActive` | frontend/js/wiring.js:593 |
| `globalFindStep` | frontend/js/wiring.js:606 |
| `globalFindWalkableRoot` | frontend/js/wiring.js:485 |
| `initGraphOptionFolds` | frontend/js/wiring.js:1070 |
| `initHelpToggles` | frontend/js/wiring.js:257 |
| `noteSourceOn` | frontend/js/wiring.js:921 |
| `nudgeDueShown` | frontend/js/wiring.js:1764 |
| `openGlobalFind` | frontend/js/wiring.js:612 |
| `openReminderCompose` | frontend/js/wiring.js:1653 |
| `paintDashboardPersonaMark` | frontend/js/wiring.js:961 |
| `reflectOnlineState` | frontend/js/wiring.js:16 |
| `renameCurrentConversation` | frontend/js/wiring.js:761 |
| `renderPlanToggle` | frontend/js/wiring.js:1476 |
| `renderWebSearchToggle` | frontend/js/wiring.js:1440 |
| `setFullscreenSurface` | frontend/js/wiring.js:1307 |
| `setGraphOptionsOpen` | frontend/js/wiring.js:1091 |
| `setNoteSource` | frontend/js/wiring.js:936 |
| `settingsSectionContaining` | frontend/js/wiring.js:498 |
| `startNewNote` | frontend/js/wiring.js:1363 |
| `syncNoteSourceButtons` | frontend/js/wiring.js:929 |
| `timelineSelectableRows` | frontend/js/wiring.js:1415 |
| `toggleSelectAllRows` | frontend/js/wiring.js:1401 |
| `watchFullscreenSurface` | frontend/js/wiring.js:1313 |

### frontend/js/settings-wiring.js (39)

| Name | File:line |
|---|---|
| `_isChatComposer` | frontend/js/settings-wiring.js:1826 |
| `activeOverlay` | frontend/js/settings-wiring.js:771 |
| `buildShortcutList` | frontend/js/settings-wiring.js:1267 |
| `captureCountText` | frontend/js/settings-wiring.js:1548 |
| `captureShortcutKey` | frontend/js/settings-wiring.js:1315 |
| `clearStagedImages` | frontend/js/settings-wiring.js:1958 |
| `closeOverlaysForChord` | frontend/js/settings-wiring.js:1061 |
| `closeShortcuts` | frontend/js/settings-wiring.js:1377 |
| `comboFromEvent` | frontend/js/settings-wiring.js:1100 |
| `commitCaptureImages` | frontend/js/settings-wiring.js:1943 |
| `fileDropBox` | frontend/js/settings-wiring.js:1835 |
| `flashSaved` | frontend/js/settings-wiring.js:333 |
| `handleFileUpload` | frontend/js/settings-wiring.js:1990 |
| `hideChordGuide` | frontend/js/settings-wiring.js:1081 |
| `loadForgottenOrder` | frontend/js/settings-wiring.js:1449 |
| `loadShortcuts` | frontend/js/settings-wiring.js:942 |
| `localizeStaticChords` | frontend/js/settings-wiring.js:985 |
| `matchesShortcut` | frontend/js/settings-wiring.js:1118 |
| `maybeShowOnboarding` | frontend/js/settings-wiring.js:792 |
| `notebookLocked` | frontend/js/settings-wiring.js:318 |
| `openShortcuts` | frontend/js/settings-wiring.js:1345 |
| `persistSavedSearches` | frontend/js/settings-wiring.js:53 |
| `renderCaptureFiles` | frontend/js/settings-wiring.js:1536 |
| `renderEntryAttachmentChips` | frontend/js/settings-wiring.js:1516 |
| `renderSavedSearches` | frontend/js/settings-wiring.js:17 |
| `renderShortcutList` | frontend/js/settings-wiring.js:1260 |
| `resetShortcuts` | frontend/js/settings-wiring.js:1231 |
| `restampShortcutHints` | frontend/js/settings-wiring.js:995 |
| `rewriteStagedUrls` | frontend/js/settings-wiring.js:1931 |
| `runShortcut` | frontend/js/settings-wiring.js:1123 |
| `saveCurrentSearch` | frontend/js/settings-wiring.js:61 |
| `saveShortcutOverrides` | frontend/js/settings-wiring.js:1088 |
| `saveWhatIsInFront` | frontend/js/settings-wiring.js:396 |
| `savedSearches` | frontend/js/settings-wiring.js:13 |
| `setShortcutStatus` | frontend/js/settings-wiring.js:1247 |
| `setShortcutStatusError` | frontend/js/settings-wiring.js:1254 |
| `singleKeysOn` | frontend/js/settings-wiring.js:2126 |
| `stampShortcutTitles` | frontend/js/settings-wiring.js:971 |
| `uploadStagedFiles` | frontend/js/settings-wiring.js:1967 |

### frontend/js/spaces-find.js (40)

| Name | File:line |
|---|---|
| `activeSpaceId` | frontend/js/spaces-find.js:206 |
| `applyStatusBarSlots` | frontend/js/spaces-find.js:25 |
| `applyStatusClock` | frontend/js/spaces-find.js:49 |
| `authHeaders` | frontend/js/spaces-find.js:216 |
| `closeFinder` | frontend/js/spaces-find.js:1270 |
| `closeSpaceMenu` | frontend/js/spaces-find.js:411 |
| `closeStatusClockDetail` | frontend/js/spaces-find.js:135 |
| `customTemplates` | frontend/js/spaces-find.js:644 |
| `finderActions` | frontend/js/spaces-find.js:851 |
| `finderMove` | frontend/js/spaces-find.js:1234 |
| `finderOverlay` | frontend/js/spaces-find.js:846 |
| `finderRender` | frontend/js/spaces-find.js:1067 |
| `finderRenderEmpty` | frontend/js/spaces-find.js:968 |
| `finderRenderFilters` | frontend/js/spaces-find.js:1006 |
| `finderResultsRole` | frontend/js/spaces-find.js:964 |
| `finderSearch` | frontend/js/spaces-find.js:878 |
| `finderSorted` | frontend/js/spaces-find.js:946 |
| `finderSyncFilterEdges` | frontend/js/spaces-find.js:1000 |
| `hiddenStatusSlots` | frontend/js/spaces-find.js:14 |
| `initSpaceSwitcher` | frontend/js/spaces-find.js:508 |
| `loadSpaces` | frontend/js/spaces-find.js:466 |
| `openFinder` | frontend/js/spaces-find.js:1254 |
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
| `wireFinder` | frontend/js/spaces-find.js:1281 |

### frontend/js/agent-activity.js (19)

| Name | File:line |
|---|---|
| `addAgentRun` | frontend/js/agent-activity.js:166 |
| `agentRunAddStep` | frontend/js/agent-activity.js:256 |
| `agentRunPaintStep` | frontend/js/agent-activity.js:277 |
| `agentRunStep` | frontend/js/agent-activity.js:301 |
| `agentRunTitle` | frontend/js/agent-activity.js:157 |
| `agentRunTool` | frontend/js/agent-activity.js:333 |
| `agentRunWantsPanel` | frontend/js/agent-activity.js:387 |
| `appendAgentLog` | frontend/js/agent-activity.js:553 |
| `endAgentRun` | frontend/js/agent-activity.js:344 |
| `nudgeAgentMonitorIdle` | frontend/js/agent-activity.js:484 |
| `openPanelForRun` | frontend/js/agent-activity.js:395 |
| `renderActivityStatusItem` | frontend/js/agent-activity.js:406 |
| `renderAgentRunSummary` | frontend/js/agent-activity.js:105 |
| `runStateLabel` | frontend/js/agent-activity.js:96 |
| `setAgentMonitorLogVisible` | frontend/js/agent-activity.js:421 |
| `setAgentMonitorVisible` | frontend/js/agent-activity.js:456 |
| `stepStateWords` | frontend/js/agent-activity.js:59 |
| `streamAgentLogs` | frontend/js/agent-activity.js:593 |
| `verificationRow` | frontend/js/agent-activity.js:291 |

### frontend/js/avatars.js (231)

| Name | File:line |
|---|---|
| `atlasMark` | frontend/js/avatars.js:1167 |
| `characterFor` | frontend/js/avatars.js:1253 |
| `characterRendererFor` | frontend/js/avatars.js:1236 |
| `dashboardMarkSeed` | frontend/js/avatars.js:3066 |
| `drawCharacter` | frontend/js/avatars.js:1721 |
| `isAtlasSeed` | frontend/js/avatars.js:1247 |
| `mountBuddyActivities` | frontend/js/avatars.js:3618 |
| `mountBuddyCustom` | frontend/js/avatars.js:3192 |
| `mountBuddyPresets` | frontend/js/avatars.js:3565 |
| `mountProfileLook` | frontend/js/avatars.js:3222 |
| `nameCharacterFigure` | frontend/js/avatars.js:3840 |
| `nameCharacterHeld` | frontend/js/avatars.js:2533 |
| `nameMark` | frontend/js/avatars.js:1450 |
| `nameMarkBuddyAct` | frontend/js/avatars.js:6798 |
| `nameMarkBuddyActOff` | frontend/js/avatars.js:3475 |
| `nameMarkBuddyActions` | frontend/js/avatars.js:3652 |
| `nameMarkBuddyActivitiesOff` | frontend/js/avatars.js:3468 |
| `nameMarkBuddyAim` | frontend/js/avatars.js:6964 |
| `nameMarkBuddyAnimProps` | frontend/js/avatars.js:5281 |
| `nameMarkBuddyApplyPreset` | frontend/js/avatars.js:3545 |
| `nameMarkBuddyArrive` | frontend/js/avatars.js:6445 |
| `nameMarkBuddyAsleep` | frontend/js/avatars.js:7791 |
| `nameMarkBuddyAwake` | frontend/js/avatars.js:7704 |
| `nameMarkBuddyBand` | frontend/js/avatars.js:5015 |
| `nameMarkBuddyBeat` | frontend/js/avatars.js:6299 |
| `nameMarkBuddyBellErrand` | frontend/js/avatars.js:8192 |
| `nameMarkBuddyBlend` | frontend/js/avatars.js:7817 |
| `nameMarkBuddyBody` | frontend/js/avatars.js:3801 |
| `nameMarkBuddyBoredom` | frontend/js/avatars.js:7910 |
| `nameMarkBuddyBuild` | frontend/js/avatars.js:8526 |
| `nameMarkBuddyBurst` | frontend/js/avatars.js:6086 |
| `nameMarkBuddyCallBack` | frontend/js/avatars.js:6774 |
| `nameMarkBuddyCalmAllows` | frontend/js/avatars.js:7778 |
| `nameMarkBuddyCatchUp` | frontend/js/avatars.js:5214 |
| `nameMarkBuddyChatErrand` | frontend/js/avatars.js:8202 |
| `nameMarkBuddyCheck` | frontend/js/avatars.js:6217 |
| `nameMarkBuddyChoose` | frontend/js/avatars.js:4490 |
| `nameMarkBuddyClickReaction` | frontend/js/avatars.js:7764 |
| `nameMarkBuddyColours` | frontend/js/avatars.js:3786 |
| `nameMarkBuddyContext` | frontend/js/avatars.js:8265 |
| `nameMarkBuddyCoverPoint` | frontend/js/avatars.js:4158 |
| `nameMarkBuddyCovers` | frontend/js/avatars.js:4123 |
| `nameMarkBuddyCrossfade` | frontend/js/avatars.js:5621 |
| `nameMarkBuddyCue` | frontend/js/avatars.js:7497 |
| `nameMarkBuddyCurlUp` | frontend/js/avatars.js:7059 |
| `nameMarkBuddyCurtained` | frontend/js/avatars.js:6438 |
| `nameMarkBuddyCustom` | frontend/js/avatars.js:352 |
| `nameMarkBuddyDecide` | frontend/js/avatars.js:7130 |
| `nameMarkBuddyDodge` | frontend/js/avatars.js:3963 |
| `nameMarkBuddyDrift` | frontend/js/avatars.js:7365 |
| `nameMarkBuddyDrop` | frontend/js/avatars.js:4741 |
| `nameMarkBuddyEase` | frontend/js/avatars.js:7881 |
| `nameMarkBuddyEdges` | frontend/js/avatars.js:4284 |
| `nameMarkBuddyEmote` | frontend/js/avatars.js:3485 |
| `nameMarkBuddyEnter` | frontend/js/avatars.js:6547 |
| `nameMarkBuddyErrand` | frontend/js/avatars.js:8174 |
| `nameMarkBuddyExpress` | frontend/js/avatars.js:7277 |
| `nameMarkBuddyFarWay` | frontend/js/avatars.js:5580 |
| `nameMarkBuddyFeel` | frontend/js/avatars.js:7739 |
| `nameMarkBuddyFlies` | frontend/js/avatars.js:5604 |
| `nameMarkBuddyFollow` | frontend/js/avatars.js:5095 |
| `nameMarkBuddyFollowFrame` | frontend/js/avatars.js:5257 |
| `nameMarkBuddyFrames` | frontend/js/avatars.js:7037 |
| `nameMarkBuddyGait` | frontend/js/avatars.js:5594 |
| `nameMarkBuddyGetUp` | frontend/js/avatars.js:7063 |
| `nameMarkBuddyGlue` | frontend/js/avatars.js:5046 |
| `nameMarkBuddyGlueBand` | frontend/js/avatars.js:5082 |
| `nameMarkBuddyGo` | frontend/js/avatars.js:5737 |
| `nameMarkBuddyGone` | frontend/js/avatars.js:8426 |
| `nameMarkBuddyHalt` | frontend/js/avatars.js:7079 |
| `nameMarkBuddyHasAtlas` | frontend/js/avatars.js:7034 |
| `nameMarkBuddyHeadAt` | frontend/js/avatars.js:8049 |
| `nameMarkBuddyHide` | frontend/js/avatars.js:8465 |
| `nameMarkBuddyHint` | frontend/js/avatars.js:9063 |
| `nameMarkBuddyHits` | frontend/js/avatars.js:4105 |
| `nameMarkBuddyHold` | frontend/js/avatars.js:7360 |
| `nameMarkBuddyHome` | frontend/js/avatars.js:2827 |
| `nameMarkBuddyHover` | frontend/js/avatars.js:5999 |
| `nameMarkBuddyHoverReaction` | frontend/js/avatars.js:7902 |
| `nameMarkBuddyIndexReset` | frontend/js/avatars.js:4213 |
| `nameMarkBuddyInsideCard` | frontend/js/avatars.js:4349 |
| `nameMarkBuddyJoy` | frontend/js/avatars.js:7325 |
| `nameMarkBuddyKeepCustom` | frontend/js/avatars.js:365 |
| `nameMarkBuddyKeepFrame` | frontend/js/avatars.js:7070 |
| `nameMarkBuddyKeepPresets` | frontend/js/avatars.js:3514 |
| `nameMarkBuddyKeepSpots` | frontend/js/avatars.js:4605 |
| `nameMarkBuddyKeepUp` | frontend/js/avatars.js:5252 |
| `nameMarkBuddyLean` | frontend/js/avatars.js:8129 |
| `nameMarkBuddyLeanSide` | frontend/js/avatars.js:8124 |
| `nameMarkBuddyLeave` | frontend/js/avatars.js:6703 |
| `nameMarkBuddyLedges` | frontend/js/avatars.js:3899 |
| `nameMarkBuddyLieDown` | frontend/js/avatars.js:7052 |
| `nameMarkBuddyLieRoom` | frontend/js/avatars.js:6885 |
| `nameMarkBuddyLimbs` | frontend/js/avatars.js:5683 |
| `nameMarkBuddyLoud` | frontend/js/avatars.js:7783 |
| `nameMarkBuddyMade` | frontend/js/avatars.js:3157 |
| `nameMarkBuddyMakeHint` | frontend/js/avatars.js:3177 |
| `nameMarkBuddyMakeIt` | frontend/js/avatars.js:3170 |
| `nameMarkBuddyMenuOpen` | frontend/js/avatars.js:6295 |
| `nameMarkBuddyMotion` | frontend/js/avatars.js:3728 |
| `nameMarkBuddyMotionApply` | frontend/js/avatars.js:3760 |
| `nameMarkBuddyMoveTo` | frontend/js/avatars.js:5482 |
| `nameMarkBuddyNextSpot` | frontend/js/avatars.js:6418 |
| `nameMarkBuddyNoTravel` | frontend/js/avatars.js:3772 |
| `nameMarkBuddyNoteOpen` | frontend/js/avatars.js:7472 |
| `nameMarkBuddyNoteOpened` | frontend/js/avatars.js:7465 |
| `nameMarkBuddyNotice` | frontend/js/avatars.js:8059 |
| `nameMarkBuddyObstacles` | frontend/js/avatars.js:3908 |
| `nameMarkBuddyOrigin` | frontend/js/avatars.js:4063 |
| `nameMarkBuddyOverCanvas` | frontend/js/avatars.js:4338 |
| `nameMarkBuddyOverhang` | frontend/js/avatars.js:4961 |
| `nameMarkBuddyPainted` | frontend/js/avatars.js:4278 |
| `nameMarkBuddyPanelMoving` | frontend/js/avatars.js:5295 |
| `nameMarkBuddyPerchShown` | frontend/js/avatars.js:3891 |
| `nameMarkBuddyPerches` | frontend/js/avatars.js:4438 |
| `nameMarkBuddyPet` | frontend/js/avatars.js:6018 |
| `nameMarkBuddyPickVariant` | frontend/js/avatars.js:6898 |
| `nameMarkBuddyPointer` | frontend/js/avatars.js:8317 |
| `nameMarkBuddyPoof` | frontend/js/avatars.js:6034 |
| `nameMarkBuddyPopups` | frontend/js/avatars.js:3950 |
| `nameMarkBuddyPout` | frontend/js/avatars.js:7892 |
| `nameMarkBuddyPresets` | frontend/js/avatars.js:3506 |
| `nameMarkBuddyPrewarm` | frontend/js/avatars.js:7347 |
| `nameMarkBuddyPut` | frontend/js/avatars.js:4802 |
| `nameMarkBuddyQueuePlace` | frontend/js/avatars.js:6284 |
| `nameMarkBuddyReact` | frontend/js/avatars.js:7401 |
| `nameMarkBuddyRefit` | frontend/js/avatars.js:6725 |
| `nameMarkBuddyRefitClear` | frontend/js/avatars.js:6760 |
| `nameMarkBuddyRelease` | frontend/js/avatars.js:7096 |
| `nameMarkBuddyResetSize` | frontend/js/avatars.js:4033 |
| `nameMarkBuddyRestore` | frontend/js/avatars.js:4652 |
| `nameMarkBuddyRide` | frontend/js/avatars.js:4825 |
| `nameMarkBuddyRideBox` | frontend/js/avatars.js:4908 |
| `nameMarkBuddyRideClip` | frontend/js/avatars.js:4895 |
| `nameMarkBuddyRideFrames` | frontend/js/avatars.js:4882 |
| `nameMarkBuddyRoute` | frontend/js/avatars.js:5654 |
| `nameMarkBuddySavePreset` | frontend/js/avatars.js:3522 |
| `nameMarkBuddyScaleSaved` | frontend/js/avatars.js:4004 |
| `nameMarkBuddyScaled` | frontend/js/avatars.js:4067 |
| `nameMarkBuddyScene` | frontend/js/avatars.js:6924 |
| `nameMarkBuddySchedule` | frontend/js/avatars.js:7114 |
| `nameMarkBuddyScrollAgo` | frontend/js/avatars.js:7787 |
| `nameMarkBuddyScroller` | frontend/js/avatars.js:5002 |
| `nameMarkBuddyScrollsWith` | frontend/js/avatars.js:5070 |
| `nameMarkBuddySeed` | frontend/js/avatars.js:3043 |
| `nameMarkBuddySeen` | frontend/js/avatars.js:4981 |
| `nameMarkBuddySelector` | frontend/js/avatars.js:4615 |
| `nameMarkBuddySetSize` | frontend/js/avatars.js:4013 |
| `nameMarkBuddySettle` | frontend/js/avatars.js:6478 |
| `nameMarkBuddyShape` | frontend/js/avatars.js:4074 |
| `nameMarkBuddyShapeAt1` | frontend/js/avatars.js:4077 |
| `nameMarkBuddyShowing` | frontend/js/avatars.js:8488 |
| `nameMarkBuddyShown` | frontend/js/avatars.js:3877 |
| `nameMarkBuddyShy` | frontend/js/avatars.js:8334 |
| `nameMarkBuddySizeSelect` | frontend/js/avatars.js:4042 |
| `nameMarkBuddySound` | frontend/js/avatars.js:8243 |
| `nameMarkBuddySpotFor` | frontend/js/avatars.js:4637 |
| `nameMarkBuddySpots` | frontend/js/avatars.js:4596 |
| `nameMarkBuddySquash` | frontend/js/avatars.js:5959 |
| `nameMarkBuddyStances` | frontend/js/avatars.js:4420 |
| `nameMarkBuddyStepAside` | frontend/js/avatars.js:4700 |
| `nameMarkBuddyStill` | frontend/js/avatars.js:3769 |
| `nameMarkBuddyStillGood` | frontend/js/avatars.js:6204 |
| `nameMarkBuddyStir` | frontend/js/avatars.js:8019 |
| `nameMarkBuddyStreak` | frontend/js/avatars.js:7450 |
| `nameMarkBuddySupportSoon` | frontend/js/avatars.js:6165 |
| `nameMarkBuddySupported` | frontend/js/avatars.js:6128 |
| `nameMarkBuddySurfaceWalk` | frontend/js/avatars.js:4222 |
| `nameMarkBuddyTab` | frontend/js/avatars.js:3869 |
| `nameMarkBuddyTabChanged` | frontend/js/avatars.js:6372 |
| `nameMarkBuddyTabSide` | frontend/js/avatars.js:6408 |
| `nameMarkBuddyTempo` | frontend/js/avatars.js:5332 |
| `nameMarkBuddyTextBoxes` | frontend/js/avatars.js:4178 |
| `nameMarkBuddyTick` | frontend/js/avatars.js:7201 |
| `nameMarkBuddyTilt` | frontend/js/avatars.js:7013 |
| `nameMarkBuddyToggle` | frontend/js/avatars.js:8503 |
| `nameMarkBuddyToggles` | frontend/js/avatars.js:3479 |
| `nameMarkBuddyToss` | frontend/js/avatars.js:5980 |
| `nameMarkBuddyTravel` | frontend/js/avatars.js:5727 |
| `nameMarkBuddyUnheld` | frontend/js/avatars.js:5230 |
| `nameMarkBuddyVary` | frontend/js/avatars.js:6907 |
| `nameMarkBuddyViewChanged` | frontend/js/avatars.js:6334 |
| `nameMarkBuddyVisit` | frontend/js/avatars.js:2774 |
| `nameMarkBuddyWake` | frontend/js/avatars.js:7979 |
| `nameMarkBuddyWander` | frontend/js/avatars.js:7923 |
| `nameMarkBuddyWarmthAt` | frontend/js/avatars.js:7735 |
| `nameMarkBuddyWatch` | frontend/js/avatars.js:5421 |
| `nameMarkBuddyWay` | frontend/js/avatars.js:5720 |
| `nameMarkBuddyWordsUnder` | frontend/js/avatars.js:4372 |
| `nameMarkBuddyWork` | frontend/js/avatars.js:7590 |
| `nameMarkBuddyWorkFor` | frontend/js/avatars.js:7586 |
| `nameMarkBuddyYoursObstacles` | frontend/js/avatars.js:4731 |
| `nameMarkCompose` | frontend/js/avatars.js:1302 |
| `nameMarkFigure` | frontend/js/avatars.js:3856 |
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
| `nameMarkShade` | frontend/js/avatars.js:3776 |
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
| `placeNameMarkBuddy` | frontend/js/avatars.js:6107 |
| `queueNameMarkBuddyCheck` | frontend/js/avatars.js:6267 |
| `registerCharacter` | frontend/js/avatars.js:1230 |
| `repaintOwnFace` | frontend/js/avatars.js:3106 |
| `setOwnNameMarkStyle` | frontend/js/avatars.js:294 |
| `syncNameMarkBuddy` | frontend/js/avatars.js:8971 |
| `syncProfileLook` | frontend/js/avatars.js:3248 |
| `watchNameMark` | frontend/js/avatars.js:1119 |

### frontend/js/atlas.js (91)

| Name | File:line |
|---|---|
| `atlasAlmond` | frontend/js/atlas.js:1543 |
| `atlasApply` | frontend/js/atlas.js:3257 |
| `atlasArmHand` | frontend/js/atlas.js:987 |
| `atlasArmPath` | frontend/js/atlas.js:982 |
| `atlasArmSegs` | frontend/js/atlas.js:973 |
| `atlasAuraAt` | frontend/js/atlas.js:2762 |
| `atlasAvatar` | frontend/js/atlas.js:3188 |
| `atlasBand` | frontend/js/atlas.js:1890 |
| `atlasBandPaths` | frontend/js/atlas.js:1470 |
| `atlasBandSplit` | frontend/js/atlas.js:1492 |
| `atlasBody` | frontend/js/atlas.js:2155 |
| `atlasBookProp` | frontend/js/atlas.js:1942 |
| `atlasBuild` | frontend/js/atlas.js:1070 |
| `atlasBuildDefs` | frontend/js/atlas.js:2503 |
| `atlasClassicFigure` | frontend/js/atlas.js:3413 |
| `atlasClassicMark` | frontend/js/atlas.js:3291 |
| `atlasCoilProp` | frontend/js/atlas.js:1975 |
| `atlasDefs` | frontend/js/atlas.js:2486 |
| `atlasDraw` | frontend/js/atlas.js:3130 |
| `atlasDrawFigure` | frontend/js/atlas.js:2785 |
| `atlasDressMarks` | frontend/js/atlas.js:3192 |
| `atlasDrop` | frontend/js/atlas.js:1533 |
| `atlasEars` | frontend/js/atlas.js:1804 |
| `atlasExtras` | frontend/js/atlas.js:1646 |
| `atlasEye` | frontend/js/atlas.js:1559 |
| `atlasFigure` | frontend/js/atlas.js:3209 |
| `atlasFix` | frontend/js/atlas.js:211 |
| `atlasFoot` | frontend/js/atlas.js:391 |
| `atlasGroup` | frontend/js/atlas.js:169 |
| `atlasHairCap` | frontend/js/atlas.js:1741 |
| `atlasHand` | frontend/js/atlas.js:390 |
| `atlasHandProps` | frontend/js/atlas.js:2016 |
| `atlasHead` | frontend/js/atlas.js:2040 |
| `atlasHeadProps` | frontend/js/atlas.js:1915 |
| `atlasHeart` | frontend/js/atlas.js:1526 |
| `atlasHelixAt` | frontend/js/atlas.js:1410 |
| `atlasHelixSegs` | frontend/js/atlas.js:1423 |
| `atlasHelixSpan` | frontend/js/atlas.js:1459 |
| `atlasHelixWidth` | frontend/js/atlas.js:1449 |
| `atlasHemTip` | frontend/js/atlas.js:998 |
| `atlasLevelFor` | frontend/js/atlas.js:2738 |
| `atlasLids` | frontend/js/atlas.js:3098 |
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
| `atlasOn` | frontend/js/atlas.js:3570 |
| `atlasOrbits` | frontend/js/atlas.js:2968 |
| `atlasPaw` | frontend/js/atlas.js:884 |
| `atlasPivot` | frontend/js/atlas.js:163 |
| `atlasPlay` | frontend/js/atlas.js:3557 |
| `atlasRepaint` | frontend/js/atlas.js:3438 |
| `atlasRestingMood` | frontend/js/atlas.js:3483 |
| `atlasRetune` | frontend/js/atlas.js:1366 |
| `atlasRing` | frontend/js/atlas.js:2104 |
| `atlasRings` | frontend/js/atlas.js:3037 |
| `atlasScalePath` | frontend/js/atlas.js:485 |
| `atlasScalePathX` | frontend/js/atlas.js:1359 |
| `atlasSegsAt` | frontend/js/atlas.js:216 |
| `atlasSegsCut` | frontend/js/atlas.js:228 |
| `atlasSmooth` | frontend/js/atlas.js:262 |
| `atlasSpark` | frontend/js/atlas.js:1519 |
| `atlasSpecks` | frontend/js/atlas.js:411 |
| `atlasStarsProp` | frontend/js/atlas.js:1959 |
| `atlasStem` | frontend/js/atlas.js:282 |
| `atlasStemEdge` | frontend/js/atlas.js:403 |
| `atlasStemSides` | frontend/js/atlas.js:184 |
| `atlasStreak` | frontend/js/atlas.js:3587 |
| `atlasStyle` | frontend/js/atlas.js:3287 |
| `atlasTail` | frontend/js/atlas.js:1852 |
| `atlasTailMasks` | frontend/js/atlas.js:2452 |
| `atlasTailWake` | frontend/js/atlas.js:3202 |
| `atlasTaper` | frontend/js/atlas.js:418 |
| `atlasTipShape` | frontend/js/atlas.js:324 |
| `atlasTorsoEdge` | frontend/js/atlas.js:947 |
| `atlasTune` | frontend/js/atlas.js:1038 |
| `atlasTuneSegs` | frontend/js/atlas.js:1053 |
| `atlasTuneStyle` | frontend/js/atlas.js:2746 |
| `atlasTurnAbout` | frontend/js/atlas.js:968 |
| `atlasWake` | frontend/js/atlas.js:3618 |
| `atlasWatchFigure` | frontend/js/atlas.js:3241 |
| `setAtlasMood` | frontend/js/atlas.js:3501 |

### frontend/js/rich-picker.js (9)

| Name | File:line |
|---|---|
| `richPickerFillLabel` | frontend/js/rich-picker.js:42 |
| `richPickerGroup` | frontend/js/rich-picker.js:103 |
| `richPickerIconClass` | frontend/js/rich-picker.js:27 |
| `richPickerLines` | frontend/js/rich-picker.js:170 |
| `richPickerPreview` | frontend/js/rich-picker.js:187 |
| `richPickerRow` | frontend/js/rich-picker.js:118 |
| `richPickerSetActive` | frontend/js/rich-picker.js:154 |
| `richPickerSplitLabel` | frontend/js/rich-picker.js:33 |
| `richPickerTile` | frontend/js/rich-picker.js:86 |

### frontend/js/editor.js (70)

| Name | File:line |
|---|---|
| `askAboutSelection` | frontend/js/editor.js:1999 |
| `calloutHint` | frontend/js/editor.js:284 |
| `calloutKindOf` | frontend/js/editor.js:292 |
| `calloutRewriteHead` | frontend/js/editor.js:306 |
| `chatCommands` | frontend/js/editor.js:577 |
| `codeFamilyFor` | frontend/js/editor.js:2202 |
| `editorApplyAction` | frontend/js/editor.js:451 |
| `editorApplyNamed` | frontend/js/editor.js:509 |
| `editorBackOverTrail` | frontend/js/editor.js:880 |
| `editorBlock` | frontend/js/editor.js:745 |
| `editorBlockRows` | frontend/js/editor.js:786 |
| `editorCaretPoint` | frontend/js/editor.js:1000 |
| `editorChoiceDialog` | frontend/js/editor.js:2023 |
| `editorCloseMenu` | frontend/js/editor.js:1041 |
| `editorCodeLanguageRows` | frontend/js/editor.js:774 |
| `editorCommands` | frontend/js/editor.js:893 |
| `editorEnsureSurfaceModule` | frontend/js/editor.js:129 |
| `editorFinishFence` | frontend/js/editor.js:1058 |
| `editorFuzzyMatch` | frontend/js/editor.js:314 |
| `editorFuzzyRank` | frontend/js/editor.js:334 |
| `editorGroupStarts` | frontend/js/editor.js:1410 |
| `editorHandleInput` | frontend/js/editor.js:1555 |
| `editorHintAllPlaceholders` | frontend/js/editor.js:216 |
| `editorHintPlaceholder` | frontend/js/editor.js:190 |
| `editorInsertBlock` | frontend/js/editor.js:525 |
| `editorInsertBoardObject` | frontend/js/editor.js:555 |
| `editorInsertBookmarkLink` | frontend/js/editor.js:542 |
| `editorLinkMatches` | frontend/js/editor.js:1105 |
| `editorLoadFiles` | frontend/js/editor.js:1226 |
| `editorMenuIcon` | frontend/js/editor.js:1266 |
| `editorMenuList` | frontend/js/editor.js:1271 |
| `editorNextGroupStart` | frontend/js/editor.js:1420 |
| `editorNotifyHost` | frontend/js/editor.js:373 |
| `editorOpenMenu` | frontend/js/editor.js:1476 |
| `editorOpenMenuByShortcut` | frontend/js/editor.js:173 |
| `editorPickGlyph` | frontend/js/editor.js:432 |
| `editorPositionMenu` | frontend/js/editor.js:1014 |
| `editorRankCommands` | frontend/js/editor.js:1098 |
| `editorRecentIds` | frontend/js/editor.js:718 |
| `editorRefreshMenu` | frontend/js/editor.js:1490 |
| `editorRememberBlock` | frontend/js/editor.js:727 |
| `editorRenderMenu` | frontend/js/editor.js:1275 |
| `editorRenderPreview` | frontend/js/editor.js:1338 |
| `editorRevealRow` | frontend/js/editor.js:1387 |
| `editorRunItem` | frontend/js/editor.js:1432 |
| `editorSetActive` | frontend/js/editor.js:1367 |
| `editorSplice` | frontend/js/editor.js:398 |
| `editorSurfaceFor` | frontend/js/editor.js:105 |
| `editorSurfaceKind` | frontend/js/editor.js:72 |
| `editorTokenAt` | frontend/js/editor.js:1074 |
| `inlineAiAvailable` | frontend/js/editor.js:2387 |
| `inlineAiClose` | frontend/js/editor.js:2426 |
| `inlineAiDescribeScope` | frontend/js/editor.js:2367 |
| `inlineAiElement` | frontend/js/editor.js:2261 |
| `inlineAiOpen` | frontend/js/editor.js:2392 |
| `inlineAiPosition` | frontend/js/editor.js:2346 |
| `inlineAiRetry` | frontend/js/editor.js:2448 |
| `inlineAiSubmit` | frontend/js/editor.js:2459 |
| `inlineAiUndo` | frontend/js/editor.js:2439 |
| `isEditorSurface` | frontend/js/editor.js:1901 |
| `offerToCreateWikiTarget` | frontend/js/editor.js:2088 |
| `pickIconOrEmoji` | frontend/js/editor.js:424 |
| `selectionBarElement` | frontend/js/editor.js:1768 |
| `selectionBarHide` | frontend/js/editor.js:1829 |
| `selectionBarShow` | frontend/js/editor.js:1834 |
| `selectionBarSync` | frontend/js/editor.js:1905 |
| `selectionContextFrom` | frontend/js/editor.js:1947 |
| `selectionContextSource` | frontend/js/editor.js:1980 |
| `selectionOffsets` | frontend/js/editor.js:1957 |
| `skillCommands` | frontend/js/editor.js:630 |

### frontend/js/dashboard.js (141)

| Name | File:line |
|---|---|
| `activityActorName` | frontend/js/dashboard.js:4466 |
| `activityUndoControl` | frontend/js/dashboard.js:4544 |
| `activityUndoPlanText` | frontend/js/dashboard.js:4473 |
| `activityUndoStarts` | frontend/js/dashboard.js:4529 |
| `applyDashDensity` | frontend/js/dashboard.js:1164 |
| `artEaseOut` | frontend/js/dashboard.js:2537 |
| `artLineFade` | frontend/js/dashboard.js:2545 |
| `artRetarget` | frontend/js/dashboard.js:2555 |
| `artSeed` | frontend/js/dashboard.js:2452 |
| `buildArtParticles` | frontend/js/dashboard.js:2480 |
| `cachedGreetingPhrase` | frontend/js/dashboard.js:280 |
| `categoryHue` | frontend/js/dashboard.js:2436 |
| `closeFeatures` | frontend/js/dashboard.js:1679 |
| `dashActionRow` | frontend/js/dashboard.js:4029 |
| `dashActivityItems` | frontend/js/dashboard.js:4381 |
| `dashContinueNote` | frontend/js/dashboard.js:1352 |
| `dashCustomiseItems` | frontend/js/dashboard.js:1401 |
| `dashDensity` | frontend/js/dashboard.js:1061 |
| `dashDragOverCard` | frontend/js/dashboard.js:22 |
| `dashEmpty` | frontend/js/dashboard.js:4081 |
| `dashEntries` | frontend/js/dashboard.js:452 |
| `dashFillingSkeleton` | frontend/js/dashboard.js:2116 |
| `dashFillingSkeletonDone` | frontend/js/dashboard.js:2143 |
| `dashGlanceFacts` | frontend/js/dashboard.js:552 |
| `dashGridShape` | frontend/js/dashboard.js:1919 |
| `dashLayout` | frontend/js/dashboard.js:158 |
| `dashMarkMenu` | frontend/js/dashboard.js:1134 |
| `dashMeetingWhen` | frontend/js/dashboard.js:631 |
| `dashMoreItems` | frontend/js/dashboard.js:1369 |
| `dashRelativeTime` | frontend/js/dashboard.js:4635 |
| `dashReminders` | frontend/js/dashboard.js:432 |
| `dashStreak` | frontend/js/dashboard.js:2916 |
| `dashTensionRow` | frontend/js/dashboard.js:4867 |
| `dashWidgetRow` | frontend/js/dashboard.js:2199 |
| `dashWidgetToggle` | frontend/js/dashboard.js:2173 |
| `dashWidgetsSummary` | frontend/js/dashboard.js:2311 |
| `dashboardGreetingText` | frontend/js/dashboard.js:265 |
| `fallbackGreetingPhrase` | frontend/js/dashboard.js:237 |
| `featureCatalog` | frontend/js/dashboard.js:1479 |
| `fetchDashGraph` | frontend/js/dashboard.js:412 |
| `fetchDashStats` | frontend/js/dashboard.js:387 |
| `firstNoteImage` | frontend/js/dashboard.js:3000 |
| `focusTimeLabel` | frontend/js/dashboard.js:3883 |
| `focusTimerTick` | frontend/js/dashboard.js:3899 |
| `generateDigest` | frontend/js/dashboard.js:3263 |
| `gettingStartedCard` | frontend/js/dashboard.js:1755 |
| `greetingBlock` | frontend/js/dashboard.js:228 |
| `greetingCacheSlot` | frontend/js/dashboard.js:271 |
| `hueFor` | frontend/js/dashboard.js:2426 |
| `loadDigestCache` | frontend/js/dashboard.js:3249 |
| `miniEntryList` | frontend/js/dashboard.js:3036 |
| `mountWidgetBody` | frontend/js/dashboard.js:1846 |
| `moveDashWidget` | frontend/js/dashboard.js:2180 |
| `nightFactRow` | frontend/js/dashboard.js:4138 |
| `nightKindLine` | frontend/js/dashboard.js:4228 |
| `nightKindWords` | frontend/js/dashboard.js:4126 |
| `nightRunSummary` | frontend/js/dashboard.js:4131 |
| `noteRowFile` | frontend/js/dashboard.js:3031 |
| `noteRowImage` | frontend/js/dashboard.js:3017 |
| `noteSkillRun` | frontend/js/dashboard.js:925 |
| `openAskFromDashboard` | frontend/js/dashboard.js:831 |
| `openFeatures` | frontend/js/dashboard.js:1665 |
| `paintDashClock` | frontend/js/dashboard.js:356 |
| `paintDashEmblem` | frontend/js/dashboard.js:1088 |
| `paintFadedNotes` | frontend/js/dashboard.js:3698 |
| `paintFocusTimer` | frontend/js/dashboard.js:3889 |
| `quickAccessCurrent` | frontend/js/dashboard.js:1318 |
| `quickAccessItems` | frontend/js/dashboard.js:1282 |
| `quickCatalogue` | frontend/js/dashboard.js:1265 |
| `quickLinkButton` | frontend/js/dashboard.js:1225 |
| `quickTintColours` | frontend/js/dashboard.js:1219 |
| `quickTintKey` | frontend/js/dashboard.js:1208 |
| `quickTints` | frontend/js/dashboard.js:1295 |
| `recentSkillLinks` | frontend/js/dashboard.js:996 |
| `refreshAiGreeting` | frontend/js/dashboard.js:300 |
| `refreshArtForTheme` | frontend/js/dashboard.js:2472 |
| `refreshDashWidgets` | frontend/js/dashboard.js:1894 |
| `renderActivityWidget` | frontend/js/dashboard.js:4394 |
| `renderArtWidget` | frontend/js/dashboard.js:2567 |
| `renderBoardsWidget` | frontend/js/dashboard.js:4102 |
| `renderBookmarksWidget` | frontend/js/dashboard.js:4611 |
| `renderCategoriesWidget` | frontend/js/dashboard.js:3591 |
| `renderDashGlance` | frontend/js/dashboard.js:648 |
| `renderDashMore` | frontend/js/dashboard.js:1450 |
| `renderDashSubmessage` | frontend/js/dashboard.js:458 |
| `renderDashWidgetsList` | frontend/js/dashboard.js:2340 |
| `renderDashboard` | frontend/js/dashboard.js:1923 |
| `renderDashboardGreeting` | frontend/js/dashboard.js:506 |
| `renderDigestWidget` | frontend/js/dashboard.js:3321 |
| `renderDocumentsWidget` | frontend/js/dashboard.js:4575 |
| `renderFeatures` | frontend/js/dashboard.js:1685 |
| `renderFocusTimerWidget` | frontend/js/dashboard.js:3936 |
| `renderHeatmapWidget` | frontend/js/dashboard.js:3487 |
| `renderMostLinkedWidget` | frontend/js/dashboard.js:3169 |
| `renderMostOpenedWidget` | frontend/js/dashboard.js:3132 |
| `renderMostUsedWidget` | frontend/js/dashboard.js:3158 |
| `renderNameNudge` | frontend/js/dashboard.js:712 |
| `renderNightCard` | frontend/js/dashboard.js:4311 |
| `renderNightWidget` | frontend/js/dashboard.js:4283 |
| `renderOnThisDayWidget` | frontend/js/dashboard.js:4924 |
| `renderOrphanNotesWidget` | frontend/js/dashboard.js:4693 |
| `renderPaceWidget` | frontend/js/dashboard.js:4997 |
| `renderPinnedWidget` | frontend/js/dashboard.js:3127 |
| `renderQuestionsWidget` | frontend/js/dashboard.js:3218 |
| `renderQuickCaptureWidget` | frontend/js/dashboard.js:3396 |
| `renderQuickLinks` | frontend/js/dashboard.js:1322 |
| `renderRandomNoteWidget` | frontend/js/dashboard.js:3670 |
| `renderRandomShuffle` | frontend/js/dashboard.js:3754 |
| `renderRecentNotesWidget` | frontend/js/dashboard.js:3188 |
| `renderRemindersWidget` | frontend/js/dashboard.js:3449 |
| `renderReviewWidget` | frontend/js/dashboard.js:3137 |
| `renderStatsWidget` | frontend/js/dashboard.js:2957 |
| `renderStreakWidget` | frontend/js/dashboard.js:2925 |
| `renderTagCloudWidget` | frontend/js/dashboard.js:3857 |
| `renderTensionsWidget` | frontend/js/dashboard.js:4805 |
| `renderTopTagsWidget` | frontend/js/dashboard.js:3197 |
| `renderUnfinishedWidget` | frontend/js/dashboard.js:4656 |
| `saveDashLayout` | frontend/js/dashboard.js:191 |
| `saveQuickAccess` | frontend/js/dashboard.js:1291 |
| `saveQuickTint` | frontend/js/dashboard.js:1303 |
| `saveQuickTints` | frontend/js/dashboard.js:1310 |
| `setFocusTimer` | frontend/js/dashboard.js:3927 |
| `sizeDashWidgetSpan` | frontend/js/dashboard.js:760 |
| `sizeDashWidgets` | frontend/js/dashboard.js:764 |
| `skillRunTimes` | frontend/js/dashboard.js:916 |
| `startArt` | frontend/js/dashboard.js:2627 |
| `startDashClock` | frontend/js/dashboard.js:329 |
| `startFocusTimer` | frontend/js/dashboard.js:3911 |
| `stopArt` | frontend/js/dashboard.js:2460 |
| `stopDashClock` | frontend/js/dashboard.js:324 |
| `stopFocusTimer` | frontend/js/dashboard.js:3920 |
| `streamDigest` | frontend/js/dashboard.js:3282 |
| `todayStamp` | frontend/js/dashboard.js:3245 |
| `toggleDashWidgetHidden` | frontend/js/dashboard.js:202 |
| `toggleDashWidgetWide` | frontend/js/dashboard.js:210 |
| `truncateMarkdownSafe` | frontend/js/dashboard.js:3655 |
| `undoActorFrom` | frontend/js/dashboard.js:4491 |
| `watchDashWidgets` | frontend/js/dashboard.js:782 |
| `wireDashDensity` | frontend/js/dashboard.js:1193 |
| `withDisplayName` | frontend/js/dashboard.js:249 |
| `withoutLeadingEmoji` | frontend/js/dashboard.js:982 |

### frontend/js/timeline.js (67)

| Name | File:line |
|---|---|
| `appendTimelineRows` | frontend/js/timeline.js:640 |
| `applyTimelineRowTabOrder` | frontend/js/timeline.js:1312 |
| `closeTimelineRow` | frontend/js/timeline.js:1528 |
| `dailyNotePair` | frontend/js/timeline.js:987 |
| `dailyNoteTitle` | frontend/js/timeline.js:182 |
| `drawTimelineScrubber` | frontend/js/timeline.js:1853 |
| `drawTimelineWindow` | frontend/js/timeline.js:1921 |
| `fillTimelineBandOptions` | frontend/js/timeline.js:723 |
| `focusTimelineRow` | frontend/js/timeline.js:1478 |
| `openDayPage` | frontend/js/timeline.js:955 |
| `openTimelineRowDetail` | frontend/js/timeline.js:1539 |
| `openTimelineTableDetail` | frontend/js/timeline.js:2251 |
| `openTodaysPage` | frontend/js/timeline.js:943 |
| `paintTimeline` | frontend/js/timeline.js:786 |
| `paintTimelineFeed` | frontend/js/timeline.js:816 |
| `paintTimelineTable` | frontend/js/timeline.js:2075 |
| `renderTimeline` | frontend/js/timeline.js:548 |
| `renderTimelineDayStrip` | frontend/js/timeline.js:1072 |
| `renderTimelineKinds` | frontend/js/timeline.js:338 |
| `renderTimelineMonthPop` | frontend/js/timeline.js:1193 |
| `renderTimelineRowMedia` | frontend/js/timeline.js:1633 |
| `setTimelineRowSelected` | frontend/js/timeline.js:2239 |
| `shortDate` | frontend/js/timeline.js:1782 |
| `startDayNote` | frontend/js/timeline.js:1018 |
| `startTodaysNote` | frontend/js/timeline.js:1014 |
| `syncTimelineDetailSpans` | frontend/js/timeline.js:2130 |
| `syncTimelineFilterChip` | frontend/js/timeline.js:753 |
| `syncTimelineKindsLabel` | frontend/js/timeline.js:394 |
| `syncTimelineSelectUi` | frontend/js/timeline.js:2268 |
| `syncTimelineViewSeg` | frontend/js/timeline.js:2312 |
| `timelineAutoScale` | frontend/js/timeline.js:448 |
| `timelineBucketKey` | frontend/js/timeline.js:215 |
| `timelineBucketLabel` | frontend/js/timeline.js:232 |
| `timelineBucketSection` | frontend/js/timeline.js:868 |
| `timelineDailyNote` | frontend/js/timeline.js:199 |
| `timelineDayKeys` | frontend/js/timeline.js:1136 |
| `timelineDayLabel` | frontend/js/timeline.js:1067 |
| `timelineDayPages` | frontend/js/timeline.js:1051 |
| `timelineDayShift` | frontend/js/timeline.js:1008 |
| `timelineDensitySpan` | frontend/js/timeline.js:1830 |
| `timelineDensitySpanOf` | frontend/js/timeline.js:1836 |
| `timelineForgetRows` | frontend/js/timeline.js:1916 |
| `timelineIsDailyNote` | frontend/js/timeline.js:304 |
| `timelineJumpToDay` | frontend/js/timeline.js:1180 |
| `timelineKindChoice` | frontend/js/timeline.js:288 |
| `timelineLoadMore` | frontend/js/timeline.js:596 |
| `timelineMonthKeys` | frontend/js/timeline.js:1247 |
| `timelineMonthShift` | frontend/js/timeline.js:1174 |
| `timelineMonthStart` | frontend/js/timeline.js:1170 |
| `timelineQuery` | frontend/js/timeline.js:518 |
| `timelineResolvedScale` | frontend/js/timeline.js:475 |
| `timelineRow` | frontend/js/timeline.js:115 |
| `timelineRowElement` | frontend/js/timeline.js:1340 |
| `timelineRowGroups` | frontend/js/timeline.js:709 |
| `timelineRowMoment` | frontend/js/timeline.js:102 |
| `timelineScaleChoice` | frontend/js/timeline.js:432 |
| `timelineScrubTo` | frontend/js/timeline.js:1969 |
| `timelineSortValue` | frontend/js/timeline.js:2046 |
| `timelineSortedRows` | frontend/js/timeline.js:2057 |
| `timelineStepScale` | frontend/js/timeline.js:1751 |
| `timelineTableColumnCount` | frontend/js/timeline.js:2110 |
| `timelineTableRow` | frontend/js/timeline.js:2137 |
| `timelineViewMode` | frontend/js/timeline.js:2019 |
| `timelineVisibleRows` | frontend/js/timeline.js:766 |
| `timelineWatchRow` | frontend/js/timeline.js:1905 |
| `toggleTimelineKind` | frontend/js/timeline.js:413 |
| `toggleTimelineRow` | frontend/js/timeline.js:1502 |

### frontend/js/palette.js (27)

| Name | File:line |
|---|---|
| `agentCurrentTab` | frontend/js/palette.js:119 |
| `agentFocusStarter` | frontend/js/palette.js:1278 |
| `agentOpenSubject` | frontend/js/palette.js:240 |
| `agentScopeForRun` | frontend/js/palette.js:290 |
| `agentStarterButtons` | frontend/js/palette.js:1274 |
| `agentStarterRecents` | frontend/js/palette.js:147 |
| `agentTabLabel` | frontend/js/palette.js:134 |
| `cmdNoteLink` | frontend/js/palette.js:746 |
| `cmdNoteName` | frontend/js/palette.js:733 |
| `cmdPaletteAsk` | frontend/js/palette.js:831 |
| `cmdPaletteBusy` | frontend/js/palette.js:526 |
| `cmdPaletteFacts` | frontend/js/palette.js:562 |
| `cmdPaletteGoToNote` | frontend/js/palette.js:600 |
| `cmdPaletteGrow` | frontend/js/palette.js:1256 |
| `cmdPaletteLinkNotes` | frontend/js/palette.js:781 |
| `cmdPaletteReset` | frontend/js/palette.js:437 |
| `cmdPaletteSaveAsChat` | frontend/js/palette.js:456 |
| `cmdPaletteSources` | frontend/js/palette.js:615 |
| `cmdSourceRow` | frontend/js/palette.js:654 |
| `paletteGoToCategory` | frontend/js/palette.js:1370 |
| `paletteLater` | frontend/js/palette.js:1356 |
| `paletteNotesInHand` | frontend/js/palette.js:1360 |
| `rememberAgentStarter` | frontend/js/palette.js:164 |
| `renderAgentStarters` | frontend/js/palette.js:177 |
| `renderCmdPaletteMenu` | frontend/js/palette.js:499 |
| `syncAgentOpenNoteToggle` | frontend/js/palette.js:313 |
| `toggleAgentPalette` | frontend/js/palette.js:369 |

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

### frontend/js/settings.js (136)

| Name | File:line |
|---|---|
| `_segActive` | frontend/js/settings.js:2365 |
| `activeAccent` | frontend/js/settings.js:1303 |
| `activeLogContainer` | frontend/js/settings.js:873 |
| `activePalette` | frontend/js/settings.js:2673 |
| `activeThemePreset` | frontend/js/settings.js:1623 |
| `appearancePref` | frontend/js/settings.js:1639 |
| `applyAccent` | frontend/js/settings.js:1325 |
| `applyAppearance` | frontend/js/settings.js:2224 |
| `applyContrast` | frontend/js/settings.js:1377 |
| `applyCustomAccent` | frontend/js/settings.js:2043 |
| `applyCustomCss` | frontend/js/settings.js:2084 |
| `applyCustomCssLegacy` | frontend/js/settings.js:2107 |
| `applyEffectiveAccent` | frontend/js/settings.js:1361 |
| `applyHarmony` | frontend/js/settings.js:1801 |
| `applyPageBackground` | frontend/js/settings.js:2057 |
| `applyResolvedMode` | frontend/js/settings.js:2315 |
| `applySavedTheme` | frontend/js/settings.js:1905 |
| `applyThemeChoice` | frontend/js/settings.js:2335 |
| `applyThemePreset` | frontend/js/settings.js:1658 |
| `bgArtOn` | frontend/js/settings.js:2769 |
| `bgArtRefreshSeed` | frontend/js/settings.js:2764 |
| `bgArtStyle` | frontend/js/settings.js:2783 |
| `browserLogRecords` | frontend/js/settings.js:751 |
| `bumpLogErrorBadge` | frontend/js/settings.js:986 |
| `clearLogs` | frontend/js/settings.js:1161 |
| `clearManualOverrides` | frontend/js/settings.js:1701 |
| `closeLogs` | frontend/js/settings.js:1118 |
| `closeSettingsModal` | frontend/js/settings.js:670 |
| `collapseLongSettingHints` | frontend/js/settings.js:3557 |
| `contrastOn` | frontend/js/settings.js:1373 |
| `copyLogs` | frontend/js/settings.js:1127 |
| `cssVarNow` | frontend/js/settings.js:2028 |
| `currentAccentHex` | frontend/js/settings.js:1314 |
| `currentLookValues` | frontend/js/settings.js:1860 |
| `currentPageBackground` | frontend/js/settings.js:2068 |
| `deleteSavedTheme` | frontend/js/settings.js:1926 |
| `downloadSupportBundle` | frontend/js/settings.js:1184 |
| `effectiveDensity` | frontend/js/settings.js:2159 |
| `effectiveTheme` | frontend/js/settings.js:2277 |
| `ensureSettingsPaneTitle` | frontend/js/settings.js:74 |
| `filterSettings` | frontend/js/settings.js:622 |
| `focusSettingsHeading` | frontend/js/settings.js:3146 |
| `focusSettingsPane` | frontend/js/settings.js:3138 |
| `harmonyScheme` | frontend/js/settings.js:1781 |
| `hexToHsl` | frontend/js/settings.js:1733 |
| `hexToRgbParts` | frontend/js/settings.js:2033 |
| `hslToHex` | frontend/js/settings.js:1754 |
| `jobDurationWords` | frontend/js/settings.js:4350 |
| `jobLineEl` | frontend/js/settings.js:4411 |
| `jobRunLine` | frontend/js/settings.js:4361 |
| `learnedBulk` | frontend/js/settings.js:3896 |
| `learnedDelete` | frontend/js/settings.js:4072 |
| `learnedEdit` | frontend/js/settings.js:4037 |
| `learnedExport` | frontend/js/settings.js:4112 |
| `learnedForget` | frontend/js/settings.js:4093 |
| `learnedFromYouText` | frontend/js/settings.js:4210 |
| `learnedKindLabel` | frontend/js/settings.js:3757 |
| `learnedReset` | frontend/js/settings.js:4062 |
| `learnedRow` | frontend/js/settings.js:3923 |
| `learnedRunNow` | frontend/js/settings.js:4131 |
| `learnedSetSwitch` | frontend/js/settings.js:3864 |
| `lessTransparencyWanted` | frontend/js/settings.js:2131 |
| `loadChangelog` | frontend/js/settings.js:429 |
| `loadSamplingSettings` | frontend/js/settings.js:3343 |
| `logLevelRank` | frontend/js/settings.js:725 |
| `logMatchesFilters` | frontend/js/settings.js:773 |
| `logRecordText` | frontend/js/settings.js:866 |
| `logRow` | frontend/js/settings.js:795 |
| `logTerminalLineText` | frontend/js/settings.js:930 |
| `logTerminalRow` | frontend/js/settings.js:937 |
| `logTerminalTraceRow` | frontend/js/settings.js:951 |
| `manualOverrides` | frontend/js/settings.js:1695 |
| `measureLabelOptics` | frontend/js/settings.js:2188 |
| `nearLogBottom` | frontend/js/settings.js:877 |
| `noticePerfMode` | frontend/js/settings.js:3304 |
| `openSettingsModal` | frontend/js/settings.js:238 |
| `paintJobLine` | frontend/js/settings.js:4393 |
| `perfModeOn` | frontend/js/settings.js:2137 |
| `perfModeReason` | frontend/js/settings.js:2146 |
| `placeFoldHelp` | frontend/js/settings.js:4295 |
| `refreshJobRuns` | frontend/js/settings.js:4421 |
| `renderActiveLogView` | frontend/js/settings.js:973 |
| `renderAppearance` | frontend/js/settings.js:2421 |
| `renderBgMotionHint` | frontend/js/settings.js:2571 |
| `renderBgStyleHint` | frontend/js/settings.js:2556 |
| `renderCopyLogsLabel` | frontend/js/settings.js:1142 |
| `renderCustomThemes` | frontend/js/settings.js:1937 |
| `renderHealthBlock` | frontend/js/settings.js:461 |
| `renderJobOverview` | frontend/js/settings.js:4443 |
| `renderLearned` | frontend/js/settings.js:4231 |
| `renderLearnedFromYou` | frontend/js/settings.js:4222 |
| `renderLearnedList` | frontend/js/settings.js:3997 |
| `renderLearnedSwitches` | frontend/js/settings.js:3761 |
| `renderLogErrorBadge` | frontend/js/settings.js:992 |
| `renderLogGap` | frontend/js/settings.js:735 |
| `renderLogList` | frontend/js/settings.js:905 |
| `renderLogSharedUI` | frontend/js/settings.js:890 |
| `renderLogTerminal` | frontend/js/settings.js:958 |
| `renderLogs` | frontend/js/settings.js:1092 |
| `renderPaletteGrid` | frontend/js/settings.js:2680 |
| `renderProgressMotionHint` | frontend/js/settings.js:2538 |
| `renderSamplingRows` | frontend/js/settings.js:3350 |
| `renderThemePresets` | frontend/js/settings.js:2371 |
| `renderThemeToggle` | frontend/js/settings.js:2305 |
| `repaintThemeAtOnce` | frontend/js/settings.js:1229 |
| `resetAppearance` | frontend/js/settings.js:2732 |
| `resetThemeOnly` | frontend/js/settings.js:1713 |
| `resolvedTheme` | frontend/js/settings.js:2288 |
| `saveCurrentLook` | frontend/js/settings.js:1878 |
| `savedThemeCard` | frontend/js/settings.js:1971 |
| `savedThemes` | frontend/js/settings.js:1873 |
| `scheduleThemeArt` | frontend/js/settings.js:1245 |
| `scrollLogToBottom` | frontend/js/settings.js:883 |
| `serverLogRecord` | frontend/js/settings.js:760 |
| `setLogLive` | frontend/js/settings.js:978 |
| `setSettingsPeek` | frontend/js/settings.js:210 |
| `settingsFoldState` | frontend/js/settings.js:4250 |
| `settingsPeekIsOn` | frontend/js/settings.js:222 |
| `settingsScroller` | frontend/js/settings.js:99 |
| `settingsSectionText` | frontend/js/settings.js:594 |
| `showSettingsSection` | frontend/js/settings.js:108 |
| `smallMachine` | frontend/js/settings.js:2124 |
| `sortLogRecords` | frontend/js/settings.js:764 |
| `startBgArt` | frontend/js/settings.js:2788 |
| `startLogStream` | frontend/js/settings.js:1022 |
| `stopBgArt` | frontend/js/settings.js:2773 |
| `stopLogStream` | frontend/js/settings.js:1081 |
| `syncLearnedSelectbar` | frontend/js/settings.js:3884 |
| `themeSwatch` | frontend/js/settings.js:1616 |
| `themeValue` | frontend/js/settings.js:1632 |
| `toggleBgArt` | frontend/js/settings.js:2853 |
| `toggleTheme` | frontend/js/settings.js:1257 |
| `updatePeekAvailability` | frontend/js/settings.js:226 |
| `wireFoldHelps` | frontend/js/settings.js:4306 |
| `wireLearnedSection` | frontend/js/settings.js:4165 |
| `wireSettingsFolds` | frontend/js/settings.js:4259 |

### frontend/js/account-recovery.js (15)

| Name | File:line |
|---|---|
| `closeForgotPassword` | frontend/js/account-recovery.js:104 |
| `forgotChoose` | frontend/js/account-recovery.js:41 |
| `forgotError` | frontend/js/account-recovery.js:112 |
| `makeRecoveryKey` | frontend/js/account-recovery.js:335 |
| `offerRecoveryKey` | frontend/js/account-recovery.js:285 |
| `openForgotPassword` | frontend/js/account-recovery.js:89 |
| `recoveryAccountRow` | frontend/js/account-recovery.js:372 |
| `recoveryFields` | frontend/js/account-recovery.js:31 |
| `saveRecoveryKeyFile` | frontend/js/account-recovery.js:213 |
| `showRecoveryKey` | frontend/js/account-recovery.js:268 |
| `submitPasswordReset` | frontend/js/account-recovery.js:162 |
| `submitRecovery` | frontend/js/account-recovery.js:119 |
| `whenLockLifted` | frontend/js/account-recovery.js:194 |
| `wireForgotCard` | frontend/js/account-recovery.js:55 |
| `wireRecoveryDialog` | frontend/js/account-recovery.js:232 |

### frontend/js/app-import.js (1)

| Name | File:line |
|---|---|
| `importFromApp` | frontend/js/app-import.js:20 |

### frontend/js/app-palette.js (11)

| Name | File:line |
|---|---|
| `closePalette` | frontend/js/app-palette.js:72 |
| `notesPaletteCommands` | frontend/js/app-palette.js:249 |
| `openPalette` | frontend/js/app-palette.js:47 |
| `paletteFeature` | frontend/js/app-palette.js:31 |
| `paletteKeydown` | frontend/js/app-palette.js:207 |
| `paletteLight` | frontend/js/app-palette.js:189 |
| `paletteMatches` | frontend/js/app-palette.js:86 |
| `paletteRun` | frontend/js/app-palette.js:38 |
| `paletteText` | frontend/js/app-palette.js:82 |
| `renderPalette` | frontend/js/app-palette.js:143 |
| `scrollPaletteToActive` | frontend/js/app-palette.js:234 |

### frontend/js/ask-chart.js (7)

| Name | File:line |
|---|---|
| `askChartLabel` | frontend/js/ask-chart.js:36 |
| `askChartPng` | frontend/js/ask-chart.js:124 |
| `askChartSvg` | frontend/js/ask-chart.js:47 |
| `askChartSvgEl` | frontend/js/ask-chart.js:23 |
| `askChartTable` | frontend/js/ask-chart.js:98 |
| `askChartTicks` | frontend/js/ask-chart.js:30 |
| `renderAskChart` | frontend/js/ask-chart.js:167 |

### frontend/js/ask-compose.js (4)

| Name | File:line |
|---|---|
| `askAnswerFrom` | frontend/js/ask-compose.js:29 |
| `linkCitedTitles` | frontend/js/ask-compose.js:78 |
| `renderAskUseAi` | frontend/js/ask-compose.js:34 |
| `wireAskUseAi` | frontend/js/ask-compose.js:46 |

### frontend/js/ask-history.js (7)

| Name | File:line |
|---|---|
| `askHistoryRow` | frontend/js/ask-history.js:8 |
| `clearAskHistory` | frontend/js/ask-history.js:237 |
| `deleteAskHistoryTurn` | frontend/js/ask-history.js:225 |
| `loadAskHistoryPage` | frontend/js/ask-history.js:76 |
| `toggleAskHistoryPanel` | frontend/js/ask-history.js:96 |
| `toggleAskHistoryPin` | frontend/js/ask-history.js:217 |
| `viewAskHistoryTurn` | frontend/js/ask-history.js:106 |

### frontend/js/assistant-avatar.js (2)

| Name | File:line |
|---|---|
| `assistantEmblemInto` | frontend/js/assistant-avatar.js:46 |
| `assistantEmblemShot` | frontend/js/assistant-avatar.js:22 |

### frontend/js/atlas-life.js (13)

| Name | File:line |
|---|---|
| `atlasBreathFrame` | frontend/js/atlas-life.js:447 |
| `atlasPropLoops` | frontend/js/atlas-life.js:379 |
| `atlasPropsFrame` | frontend/js/atlas-life.js:403 |
| `atlasRigLower` | frontend/js/atlas-life.js:533 |
| `atlasRigLowerAttach` | frontend/js/atlas-life.js:510 |
| `atlasRingLoops` | frontend/js/atlas-life.js:20 |
| `atlasTailAttach` | frontend/js/atlas-life.js:154 |
| `atlasTailBend` | frontend/js/atlas-life.js:105 |
| `atlasTailDraw` | frontend/js/atlas-life.js:306 |
| `atlasTailFrame` | frontend/js/atlas-life.js:247 |
| `atlasTailPaths` | frontend/js/atlas-life.js:140 |
| `atlasTailPick` | frontend/js/atlas-life.js:224 |
| `atlasTailShape` | frontend/js/atlas-life.js:115 |

### frontend/js/atlas-motion.js (12)

| Name | File:line |
|---|---|
| `atlasBlink` | frontend/js/atlas-motion.js:11 |
| `atlasBlinkMay` | frontend/js/atlas-motion.js:30 |
| `atlasBlinkStart` | frontend/js/atlas-motion.js:58 |
| `atlasBlinkTick` | frontend/js/atlas-motion.js:45 |
| `atlasLowerState` | frontend/js/atlas-motion.js:91 |
| `atlasMotionOK` | frontend/js/atlas-motion.js:105 |
| `atlasRigAttach` | frontend/js/atlas-motion.js:111 |
| `atlasRigFrame` | frontend/js/atlas-motion.js:212 |
| `atlasRigGesture` | frontend/js/atlas-motion.js:163 |
| `atlasRigRead` | frontend/js/atlas-motion.js:145 |
| `atlasRigSpring` | frontend/js/atlas-motion.js:183 |
| `atlasRigWake` | frontend/js/atlas-motion.js:196 |

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

### frontend/js/categories-panel.js (26)

| Name | File:line |
|---|---|
| `categoryColourName` | frontend/js/categories-panel.js:933 |
| `chooseCategorySheet` | frontend/js/categories-panel.js:561 |
| `chooseNoteCategory` | frontend/js/categories-panel.js:861 |
| `colourCategoriesFromPanel` | frontend/js/categories-panel.js:459 |
| `createCategoryFromPanel` | frontend/js/categories-panel.js:547 |
| `deleteCategoriesFromPanel` | frontend/js/categories-panel.js:420 |
| `deleteCategory` | frontend/js/categories-panel.js:814 |
| `deleteCategoryFromPanel` | frontend/js/categories-panel.js:612 |
| `drawCategoryTidy` | frontend/js/categories-panel.js:275 |
| `drawManageCategoryFooter` | frontend/js/categories-panel.js:389 |
| `drawManageCategoryRows` | frontend/js/categories-panel.js:171 |
| `manageCatHead` | frontend/js/categories-panel.js:145 |
| `mergeCategoriesFromPanel` | frontend/js/categories-panel.js:512 |
| `mergeCategoryFromPanel` | frontend/js/categories-panel.js:594 |
| `moveNotesToCategory` | frontend/js/categories-panel.js:902 |
| `offerCategoryUndo` | frontend/js/categories-panel.js:1033 |
| `openManageCategories` | frontend/js/categories-panel.js:19 |
| `pickCategoryColour` | frontend/js/categories-panel.js:988 |
| `refreshAfterCategoryChange` | frontend/js/categories-panel.js:1044 |
| `renameCategory` | frontend/js/categories-panel.js:764 |
| `restoreCategoryMoves` | frontend/js/categories-panel.js:843 |
| `saveCategoryColour` | frontend/js/categories-panel.js:980 |
| `showCategoryNotes` | frontend/js/categories-panel.js:330 |
| `splitCategoryFromPanel` | frontend/js/categories-panel.js:640 |
| `swatchPicker` | frontend/js/categories-panel.js:935 |
| `wireManageCategoryKeys` | frontend/js/categories-panel.js:351 |

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

### frontend/js/dash-boards.js (4)

| Name | File:line |
|---|---|
| `dashBoardThumb` | frontend/js/dash-boards.js:136 |
| `dashMapFeature` | frontend/js/dash-boards.js:30 |
| `dashMapFeatureHeight` | frontend/js/dash-boards.js:20 |
| `dashRenderBoards` | frontend/js/dash-boards.js:62 |

### frontend/js/documents-code.js (111)

| Name | File:line |
|---|---|
| `DOC_CSS_COLORS` | frontend/js/documents-code.js:696 |
| `docApplyCodeFix` | frontend/js/documents-code.js:4316 |
| `docBalanceRange` | frontend/js/documents-code.js:980 |
| `docBracketColours` | frontend/js/documents-code.js:2007 |
| `docBracketDepths` | frontend/js/documents-code.js:1990 |
| `docCmSyncCodeTools` | frontend/js/documents-code.js:645 |
| `docCodeActions` | frontend/js/documents-code.js:4331 |
| `docCodeCompletionData` | frontend/js/documents-code.js:604 |
| `docCodeCompletionSource` | frontend/js/documents-code.js:575 |
| `docCodeEditing` | frontend/js/documents-code.js:4071 |
| `docCodeFixNow` | frontend/js/documents-code.js:4298 |
| `docCodeFixes` | frontend/js/documents-code.js:3796 |
| `docCodeIndentAt` | frontend/js/documents-code.js:4056 |
| `docCodeIndentLevel` | frontend/js/documents-code.js:3344 |
| `docCodeInsertPoint` | frontend/js/documents-code.js:3787 |
| `docCodeInsertPointForString` | frontend/js/documents-code.js:3874 |
| `docCodeLastCodeBefore` | frontend/js/documents-code.js:3857 |
| `docCodeLineOf` | frontend/js/documents-code.js:3333 |
| `docCodeLintSource` | frontend/js/documents-code.js:310 |
| `docCodePairs` | frontend/js/documents-code.js:4045 |
| `docCodeProblemMessage` | frontend/js/documents-code.js:3359 |
| `docCodeProfile` | frontend/js/documents-code.js:2818 |
| `docCodeScan` | frontend/js/documents-code.js:2906 |
| `docCodeSnippetOptions` | frontend/js/documents-code.js:545 |
| `docCodeSymbols` | frontend/js/documents-code.js:2049 |
| `docCodeTools` | frontend/js/documents-code.js:615 |
| `docColorAt` | frontend/js/documents-code.js:1748 |
| `docColorSwatches` | frontend/js/documents-code.js:1788 |
| `docCompleteTab` | frontend/js/documents-code.js:1609 |
| `docCompletionExtras` | frontend/js/documents-code.js:2757 |
| `docCssColorFormat` | frontend/js/documents-code.js:1071 |
| `docCssCompletionSource` | frontend/js/documents-code.js:1565 |
| `docCssInBlock` | frontend/js/documents-code.js:1405 |
| `docCssPropertyApply` | frontend/js/documents-code.js:1547 |
| `docCssSources` | frontend/js/documents-code.js:1601 |
| `docCssValueContext` | frontend/js/documents-code.js:903 |
| `docCssValueOptions` | frontend/js/documents-code.js:944 |
| `docCssValueTable` | frontend/js/documents-code.js:915 |
| `docDefinitionsOf` | frontend/js/documents-code.js:2284 |
| `docDiagnosticRange` | frontend/js/documents-code.js:82 |
| `docEmmetAt` | frontend/js/documents-code.js:840 |
| `docEmmetBalance` | frontend/js/documents-code.js:1528 |
| `docEmmetExpandAtCaret` | frontend/js/documents-code.js:1465 |
| `docEmmetExpansion` | frontend/js/documents-code.js:875 |
| `docEmmetInfo` | frontend/js/documents-code.js:1428 |
| `docEmmetIntended` | frontend/js/documents-code.js:801 |
| `docEmmetMarkupSyntax` | frontend/js/documents-code.js:1477 |
| `docEmmetMatch` | frontend/js/documents-code.js:1414 |
| `docEmmetPlace` | frontend/js/documents-code.js:1397 |
| `docEmmetSnippets` | frontend/js/documents-code.js:784 |
| `docEmmetSource` | frontend/js/documents-code.js:1440 |
| `docEmmetWrap` | frontend/js/documents-code.js:1490 |
| `docEmmetWrapText` | frontend/js/documents-code.js:1001 |
| `docFindInDocuments` | frontend/js/documents-code.js:2375 |
| `docFormatChanges` | frontend/js/documents-code.js:4176 |
| `docFormatCode` | frontend/js/documents-code.js:4200 |
| `docFormatCodeText` | frontend/js/documents-code.js:3396 |
| `docFormatJsonText` | frontend/js/documents-code.js:3713 |
| `docFormatMarkupText` | frontend/js/documents-code.js:3476 |
| `docFormatRemoteRefusal` | frontend/js/documents-code.js:4155 |
| `docFormatTreeRefusal` | frontend/js/documents-code.js:4141 |
| `docGhostPlugin` | frontend/js/documents-code.js:1621 |
| `docGhostSuffix` | frontend/js/documents-code.js:962 |
| `docGoToDefinition` | frontend/js/documents-code.js:2328 |
| `docHoverDocs` | frontend/js/documents-code.js:1865 |
| `docHoverLine` | frontend/js/documents-code.js:1320 |
| `docHtmlTextAt` | frontend/js/documents-code.js:1371 |
| `docIndentGuides` | frontend/js/documents-code.js:1929 |
| `docIndentMixFixes` | frontend/js/documents-code.js:3960 |
| `docIndentSteps` | frontend/js/documents-code.js:1910 |
| `docJsonDiagnostics` | frontend/js/documents-code.js:221 |
| `docJsonErrorAt` | frontend/js/documents-code.js:103 |
| `docJsonFixes` | frontend/js/documents-code.js:3884 |
| `docJsxChildAt` | frontend/js/documents-code.js:1382 |
| `docLoadEmmet` | frontend/js/documents-code.js:1351 |
| `docNativeSnippets` | frontend/js/documents-code.js:559 |
| `docOpenCodeFixes` | frontend/js/documents-code.js:4346 |
| `docOpenSymbols` | frontend/js/documents-code.js:2736 |
| `docPickDefinition` | frontend/js/documents-code.js:2317 |
| `docPythonColonFix` | frontend/js/documents-code.js:3937 |
| `docPythonDefines` | frontend/js/documents-code.js:2273 |
| `docReferencesOf` | frontend/js/documents-code.js:2249 |
| `docRemoteDiagnostics` | frontend/js/documents-code.js:270 |
| `docRgbToHex` | frontend/js/documents-code.js:1061 |
| `docRunArmTimeout` | frontend/js/documents-code.js:2621 |
| `docRunClear` | frontend/js/documents-code.js:2543 |
| `docRunClose` | frontend/js/documents-code.js:2595 |
| `docRunCode` | frontend/js/documents-code.js:2633 |
| `docRunExtension` | frontend/js/documents-code.js:2521 |
| `docRunOpenPythonExtra` | frontend/js/documents-code.js:2437 |
| `docRunPanel` | frontend/js/documents-code.js:2459 |
| `docRunPythonMissing` | frontend/js/documents-code.js:2603 |
| `docRunPythonReady` | frontend/js/documents-code.js:2430 |
| `docRunRow` | frontend/js/documents-code.js:2552 |
| `docRunSend` | frontend/js/documents-code.js:2577 |
| `docRunSetStatus` | frontend/js/documents-code.js:2536 |
| `docRunStop` | frontend/js/documents-code.js:2586 |
| `docRunnable` | frontend/js/documents-code.js:2423 |
| `docShowReferences` | frontend/js/documents-code.js:2349 |
| `docStickyHeaders` | frontend/js/documents-code.js:2122 |
| `docStickyScroll` | frontend/js/documents-code.js:2139 |
| `docTagLink` | frontend/js/documents-code.js:1679 |
| `docTagRename` | frontend/js/documents-code.js:1012 |
| `docTreeDiagnostics` | frontend/js/documents-code.js:244 |
| `docTreeHasJsx` | frontend/js/documents-code.js:4126 |
| `docWordAt` | frontend/js/documents-code.js:2238 |
| `docXmlAutoClose` | frontend/js/documents-code.js:1714 |
| `docXmlOpenedBy` | frontend/js/documents-code.js:1035 |
| `docXmlTextAt` | frontend/js/documents-code.js:1392 |
| `docXmlUnclosed` | frontend/js/documents-code.js:1042 |
| `docYamlBlockLines` | frontend/js/documents-code.js:3686 |

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

### frontend/js/documents.js (552)

| Name | File:line |
|---|---|
| `acceptDocAiEdit` | frontend/js/documents.js:11089 |
| `applyDocComplete` | frontend/js/documents.js:15944 |
| `applyDocDim` | frontend/js/documents.js:12978 |
| `applyDocGutter` | frontend/js/documents.js:13725 |
| `applyDocProseDock` | frontend/js/documents.js:16845 |
| `applyDocSerif` | frontend/js/documents.js:13015 |
| `applyDocToolbarCollapsed` | frontend/js/documents.js:13794 |
| `applyDocToolbarLayoutButtons` | frontend/js/documents.js:13968 |
| `applyDocToolbarMode` | frontend/js/documents.js:13622 |
| `applyDocTypewriter` | frontend/js/documents.js:12995 |
| `applyDocWidth` | frontend/js/documents.js:12850 |
| `applyMarkdown` | frontend/js/documents.js:9805 |
| `asSurface` | frontend/js/documents.js:619 |
| `attachBookmarkToDocument` | frontend/js/documents.js:1426 |
| `calloutMenuItems` | frontend/js/documents.js:20597 |
| `chooseDocTemplate` | frontend/js/documents.js:1610 |
| `clearInlineFormatting` | frontend/js/documents.js:10005 |
| `closeDocAiPanel` | frontend/js/documents.js:10967 |
| `closeDocProsePanel` | frontend/js/documents.js:15324 |
| `closeDocSuggest` | frontend/js/documents.js:17080 |
| `cmSurface` | frontend/js/documents.js:457 |
| `createDocument` | frontend/js/documents.js:1583 |
| `deleteCurrentDocument` | frontend/js/documents.js:10755 |
| `deleteDocumentWithUndo` | frontend/js/documents.js:10731 |
| `docActiveBox` | frontend/js/documents.js:14263 |
| `docAiCheckStatus` | frontend/js/documents.js:17982 |
| `docAiDiffTarget` | frontend/js/documents.js:10819 |
| `docAiDiscussInChat` | frontend/js/documents.js:17823 |
| `docAiDismiss` | frontend/js/documents.js:17894 |
| `docAiFindings` | frontend/js/documents.js:17872 |
| `docAiResultEdited` | frontend/js/documents.js:10882 |
| `docAiReview` | frontend/js/documents.js:17899 |
| `docAiVerb` | frontend/js/documents.js:10773 |
| `docAiVerbChanged` | frontend/js/documents.js:10938 |
| `docAiVerbIcon` | frontend/js/documents.js:11152 |
| `docAnnotateSelection` | frontend/js/documents.js:6625 |
| `docAppendRendered` | frontend/js/documents.js:3348 |
| `docApplyImageOptions` | frontend/js/documents.js:9161 |
| `docApplyPrintSetup` | frontend/js/documents.js:10569 |
| `docAutocorrectAt` | frontend/js/documents.js:16018 |
| `docAutocorrectEnabled` | frontend/js/documents.js:16009 |
| `docBacklinkItem` | frontend/js/documents.js:1270 |
| `docBlockBarClose` | frontend/js/documents.js:20244 |
| `docBlockBarEl` | frontend/js/documents.js:20225 |
| `docBlockBarShow` | frontend/js/documents.js:20273 |
| `docBlockBarSoon` | frontend/js/documents.js:20239 |
| `docBlockBounds` | frontend/js/documents.js:5992 |
| `docBlockDelete` | frontend/js/documents.js:20326 |
| `docBlockDocumentText` | frontend/js/documents.js:6161 |
| `docBlockEdit` | frontend/js/documents.js:20313 |
| `docBlockEnsureIdEdits` | frontend/js/documents.js:6079 |
| `docBlockFind` | frontend/js/documents.js:6107 |
| `docBlockIdOf` | frontend/js/documents.js:6031 |
| `docBlockIds` | frontend/js/documents.js:6044 |
| `docBlockInFence` | frontend/js/documents.js:5978 |
| `docBlockLines` | frontend/js/documents.js:20252 |
| `docBlockNewId` | frontend/js/documents.js:6059 |
| `docBlockRefAtCaret` | frontend/js/documents.js:6171 |
| `docBlockRefSplit` | frontend/js/documents.js:5963 |
| `docBlockStripIds` | frontend/js/documents.js:6138 |
| `docBoxEl` | frontend/js/documents.js:366 |
| `docBuildVocabulary` | frontend/js/documents.js:15753 |
| `docCalloutFold` | frontend/js/documents.js:20140 |
| `docCalloutFoldRange` | frontend/js/documents.js:20129 |
| `docCalloutFolded` | frontend/js/documents.js:20150 |
| `docCalloutKindMenu` | frontend/js/documents.js:20369 |
| `docCanOutdent` | frontend/js/documents.js:3743 |
| `docCaretLine` | frontend/js/documents.js:2183 |
| `docCaretPoint` | frontend/js/documents.js:14336 |
| `docCaretStats` | frontend/js/documents.js:14354 |
| `docCaretVisibleLine` | frontend/js/documents.js:3007 |
| `docCmApplySpellcheck` | frontend/js/documents.js:19669 |
| `docCmDrawFor` | frontend/js/documents.js:19913 |
| `docCmExtensions` | frontend/js/documents.js:19544 |
| `docCmGutter` | frontend/js/documents.js:20012 |
| `docCmHighlight` | frontend/js/documents.js:19384 |
| `docCmIsolate` | frontend/js/documents.js:18222 |
| `docCmKeymap` | frontend/js/documents.js:19437 |
| `docCmLanguageFor` | frontend/js/documents.js:18339 |
| `docCmRepaintFindings` | frontend/js/documents.js:19801 |
| `docCmSpellcheck` | frontend/js/documents.js:19659 |
| `docCmSyncFileType` | frontend/js/documents.js:19948 |
| `docCmSyncGutter` | frontend/js/documents.js:19999 |
| `docCmSyncLanguage` | frontend/js/documents.js:19982 |
| `docCmTheme` | frontend/js/documents.js:18486 |
| `docCmUpdate` | frontend/js/documents.js:19680 |
| `docCmViewLanguage` | frontend/js/documents.js:19974 |
| `docCmViewShown` | frontend/js/documents.js:20545 |
| `docCodeCommentAtCaret` | frontend/js/documents.js:3903 |
| `docCodeCommentRun` | frontend/js/documents.js:3899 |
| `docColumnsArrowKeymap` | frontend/js/documents.js:8575 |
| `docColumnsAt` | frontend/js/documents.js:5865 |
| `docColumnsBlocks` | frontend/js/documents.js:5802 |
| `docColumnsField` | frontend/js/documents.js:8481 |
| `docCommentContext` | frontend/js/documents.js:6483 |
| `docCommentFootnotes` | frontend/js/documents.js:6415 |
| `docCommentResolveEdit` | frontend/js/documents.js:6367 |
| `docCommentRow` | frontend/js/documents.js:6493 |
| `docCommentSkipMask` | frontend/js/documents.js:6280 |
| `docCommentStrip` | frontend/js/documents.js:6394 |
| `docComments` | frontend/js/documents.js:6476 |
| `docCommentsParse` | frontend/js/documents.js:6317 |
| `docCompleteEnabled` | frontend/js/documents.js:15746 |
| `docCompleteKeydown` | frontend/js/documents.js:15976 |
| `docCopyBlockRef` | frontend/js/documents.js:6187 |
| `docCrumbsEl` | frontend/js/documents.js:2106 |
| `docDesktopFs` | frontend/js/documents.js:13329 |
| `docDesktopFullscreenToggle` | frontend/js/documents.js:13334 |
| `docDictionary` | frontend/js/documents.js:17019 |
| `docDictionaryAdd` | frontend/js/documents.js:17054 |
| `docDictionaryAddTyped` | frontend/js/documents.js:18119 |
| `docDictionaryExport` | frontend/js/documents.js:18149 |
| `docDictionaryImport` | frontend/js/documents.js:18134 |
| `docDictionaryWordOk` | frontend/js/documents.js:18115 |
| `docDictionaryWrite` | frontend/js/documents.js:17033 |
| `docDiffApply` | frontend/js/documents.js:11403 |
| `docDiffHunkHead` | frontend/js/documents.js:11491 |
| `docDiffHunks` | frontend/js/documents.js:11384 |
| `docDiffLcs` | frontend/js/documents.js:11260 |
| `docDiffLines` | frontend/js/documents.js:11299 |
| `docDiffRows` | frontend/js/documents.js:11351 |
| `docDiffSplit` | frontend/js/documents.js:11330 |
| `docDiffStat` | frontend/js/documents.js:11335 |
| `docEditDistance` | frontend/js/documents.js:17134 |
| `docEditsOnce` | frontend/js/documents.js:14856 |
| `docEmbedChip` | frontend/js/documents.js:9334 |
| `docEmbedFill` | frontend/js/documents.js:9345 |
| `docEmbedNode` | frontend/js/documents.js:9085 |
| `docEmbedTarget` | frontend/js/documents.js:9069 |
| `docEventFromCm` | frontend/js/documents.js:613 |
| `docExportClean` | frontend/js/documents.js:10354 |
| `docExportEscape` | frontend/js/documents.js:10276 |
| `docExportHtmlDocument` | frontend/js/documents.js:10292 |
| `docExportInlineImages` | frontend/js/documents.js:10395 |
| `docExportPromoteHeadings` | frontend/js/documents.js:10341 |
| `docExportUnwrapControls` | frontend/js/documents.js:10317 |
| `docFenceGutterOn` | frontend/js/documents.js:19995 |
| `docFileType` | frontend/js/documents.js:101 |
| `docFillAt` | frontend/js/documents.js:15818 |
| `docFindMatches` | frontend/js/documents.js:1935 |
| `docFindSelect` | frontend/js/documents.js:1952 |
| `docFindStep` | frontend/js/documents.js:1966 |
| `docFindingAnchor` | frontend/js/documents.js:16343 |
| `docFindingAnswerRows` | frontend/js/documents.js:17347 |
| `docFindingAtOffset` | frontend/js/documents.js:16243 |
| `docFindingAtPoint` | frontend/js/documents.js:16408 |
| `docFindingIsPassage` | frontend/js/documents.js:17335 |
| `docFindingKeyBox` | frontend/js/documents.js:16593 |
| `docFindingKind` | frontend/js/documents.js:15238 |
| `docFindingLabel` | frontend/js/documents.js:17221 |
| `docFindingLine` | frontend/js/documents.js:17303 |
| `docFindingMarks` | frontend/js/documents.js:16281 |
| `docFindingOfMark` | frontend/js/documents.js:16371 |
| `docFindingStep` | frontend/js/documents.js:16606 |
| `docFindingsPlugin` | frontend/js/documents.js:19750 |
| `docFmNeedsQuote` | frontend/js/documents.js:5127 |
| `docFmRaw` | frontend/js/documents.js:5119 |
| `docFmSpan` | frontend/js/documents.js:5097 |
| `docFmSplitInline` | frontend/js/documents.js:5152 |
| `docFmWrite` | frontend/js/documents.js:5138 |
| `docFocusFill` | frontend/js/documents.js:13225 |
| `docFocusKey` | frontend/js/documents.js:13299 |
| `docFocusOn` | frontend/js/documents.js:13096 |
| `docFocusPointer` | frontend/js/documents.js:13292 |
| `docFocusRest` | frontend/js/documents.js:13280 |
| `docFocusSyncFullscreen` | frontend/js/documents.js:13345 |
| `docFocusSyncProse` | frontend/js/documents.js:15336 |
| `docFocusToggleFullscreen` | frontend/js/documents.js:13356 |
| `docFocusWake` | frontend/js/documents.js:13268 |
| `docFocusWatch` | frontend/js/documents.js:13247 |
| `docFoldMarkedCallouts` | frontend/js/documents.js:20405 |
| `docFrontmatterAddEdits` | frontend/js/documents.js:5333 |
| `docFrontmatterCreateEdits` | frontend/js/documents.js:5354 |
| `docFrontmatterEntry` | frontend/js/documents.js:5267 |
| `docFrontmatterParse` | frontend/js/documents.js:5179 |
| `docFrontmatterRemoveEdits` | frontend/js/documents.js:5345 |
| `docFrontmatterSetEdits` | frontend/js/documents.js:5277 |
| `docFrontmatterSetListEdits` | frontend/js/documents.js:5289 |
| `docFrontmatterStrip` | frontend/js/documents.js:5365 |
| `docFrontmatterTypeFields` | frontend/js/documents.js:5378 |
| `docGoToComment` | frontend/js/documents.js:6571 |
| `docGoToFinding` | frontend/js/documents.js:16623 |
| `docGoToFootnote` | frontend/js/documents.js:20422 |
| `docGuardGlobalShortcuts` | frontend/js/documents.js:19880 |
| `docGutterPref` | frontend/js/documents.js:13691 |
| `docGutterWanted` | frontend/js/documents.js:13699 |
| `docGutters` | frontend/js/documents.js:3496 |
| `docHeadingFold` | frontend/js/documents.js:20437 |
| `docHeadingTrail` | frontend/js/documents.js:2074 |
| `docHistoryDelta` | frontend/js/documents.js:11529 |
| `docHistoryPersist` | frontend/js/documents.js:20530 |
| `docHistoryRestore` | frontend/js/documents.js:20513 |
| `docHistoryRow` | frontend/js/documents.js:11617 |
| `docHtmlToMarkdown` | frontend/js/documents.js:4745 |
| `docImageAltWith` | frontend/js/documents.js:5909 |
| `docImageOptions` | frontend/js/documents.js:5873 |
| `docImageOptionsFromAlt` | frontend/js/documents.js:9308 |
| `docInsertProperties` | frontend/js/documents.js:5738 |
| `docInsertReferenceLink` | frontend/js/documents.js:1199 |
| `docKnownWords` | frontend/js/documents.js:17164 |
| `docLayerImageOptions` | frontend/js/documents.js:9319 |
| `docLiftToViewport` | frontend/js/documents.js:17592 |
| `docLineClipboardEvent` | frontend/js/documents.js:20063 |
| `docLineClipboardExtension` | frontend/js/documents.js:20090 |
| `docLineClipboardRange` | frontend/js/documents.js:20051 |
| `docLineOffset` | frontend/js/documents.js:20267 |
| `docLinePasteEvent` | frontend/js/documents.js:20076 |
| `docLinkBack` | frontend/js/documents.js:1210 |
| `docLinkMention` | frontend/js/documents.js:1225 |
| `docLinksTo` | frontend/js/documents.js:1172 |
| `docListGuides` | frontend/js/documents.js:18469 |
| `docLiveExtensions` | frontend/js/documents.js:8568 |
| `docLivePlugin` | frontend/js/documents.js:6941 |
| `docLoadNoteTypes` | frontend/js/documents.js:5558 |
| `docLoadWordlist` | frontend/js/documents.js:14754 |
| `docMapThroughAnchors` | frontend/js/documents.js:9631 |
| `docMarkAnchor` | frontend/js/documents.js:16318 |
| `docMarkRects` | frontend/js/documents.js:16306 |
| `docMatchCase` | frontend/js/documents.js:17180 |
| `docMathArgument` | frontend/js/documents.js:6769 |
| `docMathCommand` | frontend/js/documents.js:6794 |
| `docMathElement` | frontend/js/documents.js:6906 |
| `docMathLooksLikeMath` | frontend/js/documents.js:6892 |
| `docMathNodes` | frontend/js/documents.js:6837 |
| `docMathRender` | frontend/js/documents.js:6914 |
| `docMathRow` | frontend/js/documents.js:6764 |
| `docMathToken` | frontend/js/documents.js:6780 |
| `docMathTokens` | frontend/js/documents.js:6712 |
| `docMathTree` | frontend/js/documents.js:6875 |
| `docMentionsHost` | frontend/js/documents.js:1136 |
| `docMermaidBlocks` | frontend/js/documents.js:8987 |
| `docMermaidField` | frontend/js/documents.js:8996 |
| `docMermaidSvg` | frontend/js/documents.js:8942 |
| `docMirrorPoint` | frontend/js/documents.js:14300 |
| `docNearestWords` | frontend/js/documents.js:17194 |
| `docNextFootnote` | frontend/js/documents.js:9981 |
| `docOffsetOf` | frontend/js/documents.js:16250 |
| `docOpenBacklinkSource` | frontend/js/documents.js:1184 |
| `docOpenLink` | frontend/js/documents.js:9488 |
| `docOpenResolvedWikiTarget` | frontend/js/documents.js:9461 |
| `docOpenSuggestAtCaret` | frontend/js/documents.js:16475 |
| `docOpenSuggestAtPoint` | frontend/js/documents.js:16545 |
| `docOpenSuggestFor` | frontend/js/documents.js:16443 |
| `docOpenWikiTarget` | frontend/js/documents.js:9480 |
| `docOutlineClearDrop` | frontend/js/documents.js:2620 |
| `docOutlineDropAfter` | frontend/js/documents.js:2615 |
| `docOutlineFilterText` | frontend/js/documents.js:2257 |
| `docOutlineFoldKey` | frontend/js/documents.js:2253 |
| `docOutlineFoldStore` | frontend/js/documents.js:2221 |
| `docOutlineFolds` | frontend/js/documents.js:2229 |
| `docOutlineMoveSection` | frontend/js/documents.js:2577 |
| `docOutlineNudge` | frontend/js/documents.js:2636 |
| `docOutlineSetFolds` | frontend/js/documents.js:2242 |
| `docOutlineVisibility` | frontend/js/documents.js:2270 |
| `docPaletteCommands` | frontend/js/documents.js:2518 |
| `docPlaceFixed` | frontend/js/documents.js:17616 |
| `docPointerMenuOpen` | frontend/js/documents.js:16399 |
| `docPositionsRead` | frontend/js/documents.js:976 |
| `docPositionsWrite` | frontend/js/documents.js:985 |
| `docPreviewShowing` | frontend/js/documents.js:314 |
| `docPrintCssString` | frontend/js/documents.js:10565 |
| `docPrintIsOurs` | frontend/js/documents.js:10500 |
| `docPrintMarginBoxes` | frontend/js/documents.js:10560 |
| `docPrintSetupDialog` | frontend/js/documents.js:10584 |
| `docPrintSetupRead` | frontend/js/documents.js:10547 |
| `docPropsAddRow` | frontend/js/documents.js:5634 |
| `docPropsAdder` | frontend/js/documents.js:5507 |
| `docPropsChip` | frontend/js/documents.js:5485 |
| `docPropsDispatch` | frontend/js/documents.js:5426 |
| `docPropsField` | frontend/js/documents.js:5538 |
| `docPropsHost` | frontend/js/documents.js:5447 |
| `docPropsIconButton` | frontend/js/documents.js:5468 |
| `docPropsNow` | frontend/js/documents.js:5435 |
| `docPropsReadNode` | frontend/js/documents.js:3362 |
| `docPropsShowing` | frontend/js/documents.js:5439 |
| `docPropsTypeRows` | frontend/js/documents.js:5578 |
| `docProseApply` | frontend/js/documents.js:15682 |
| `docProseApplyWidth` | frontend/js/documents.js:16762 |
| `docProseDockChoice` | frontend/js/documents.js:16747 |
| `docProseDockSide` | frontend/js/documents.js:16756 |
| `docProseFindings` | frontend/js/documents.js:15029 |
| `docProseFix` | frontend/js/documents.js:15686 |
| `docProseFixAll` | frontend/js/documents.js:15703 |
| `docProseGroupList` | frontend/js/documents.js:15566 |
| `docProseHeader` | frontend/js/documents.js:15255 |
| `docProseIgnore` | frontend/js/documents.js:15544 |
| `docProseJump` | frontend/js/documents.js:15650 |
| `docProseKey` | frontend/js/documents.js:17066 |
| `docProseResizeHandle` | frontend/js/documents.js:16794 |
| `docProseRowAnswers` | frontend/js/documents.js:15467 |
| `docProseRowCollapse` | frontend/js/documents.js:15458 |
| `docProseRowKeys` | frontend/js/documents.js:15556 |
| `docProseSavedWidth` | frontend/js/documents.js:16780 |
| `docProseSkipMask` | frontend/js/documents.js:15006 |
| `docReadingPlugin` | frontend/js/documents.js:12916 |
| `docRectHolds` | frontend/js/documents.js:16311 |
| `docRectUsable` | frontend/js/documents.js:16338 |
| `docRedo` | frontend/js/documents.js:18243 |
| `docRememberPosition` | frontend/js/documents.js:1026 |
| `docRememberPositionNow` | frontend/js/documents.js:1007 |
| `docRememberReading` | frontend/js/documents.js:13024 |
| `docRenderBody` | frontend/js/documents.js:3247 |
| `docRenderDiff` | frontend/js/documents.js:11432 |
| `docRenderFlow` | frontend/js/documents.js:3318 |
| `docRenderMermaidIn` | frontend/js/documents.js:8968 |
| `docReplaceAll` | frontend/js/documents.js:1996 |
| `docReplaceOne` | frontend/js/documents.js:1977 |
| `docReplaceRange` | frontend/js/documents.js:3682 |
| `docResetDocument` | frontend/js/documents.js:20471 |
| `docResolveComment` | frontend/js/documents.js:6605 |
| `docResolveConflict` | frontend/js/documents.js:1807 |
| `docResolveWikiTarget` | frontend/js/documents.js:9417 |
| `docRestorePosition` | frontend/js/documents.js:1090 |
| `docRestoreReading` | frontend/js/documents.js:13047 |
| `docReturnFromViewport` | frontend/js/documents.js:17601 |
| `docRevealBlock` | frontend/js/documents.js:6209 |
| `docRevealForSuggest` | frontend/js/documents.js:16432 |
| `docRevisionText` | frontend/js/documents.js:11576 |
| `docRichPasteEvent` | frontend/js/documents.js:4869 |
| `docRunControl` | frontend/js/documents.js:2394 |
| `docSaveToolPref` | frontend/js/documents.js:16102 |
| `docScanHeadings` | frontend/js/documents.js:2301 |
| `docScheduleSuggestFollow` | frontend/js/documents.js:17742 |
| `docScrollAnchors` | frontend/js/documents.js:9565 |
| `docSectionCount` | frontend/js/documents.js:1163 |
| `docSectionRange` | frontend/js/documents.js:2346 |
| `docSelectedLines` | frontend/js/documents.js:3665 |
| `docSetCalloutHead` | frontend/js/documents.js:20194 |
| `docSetLiveDecorations` | frontend/js/documents.js:6921 |
| `docSetPlaceholder` | frontend/js/documents.js:375 |
| `docSetStatusText` | frontend/js/documents.js:14387 |
| `docShowComment` | frontend/js/documents.js:6589 |
| `docSourceLineTop` | frontend/js/documents.js:9548 |
| `docSpellConfident` | frontend/js/documents.js:14934 |
| `docSpellGuesses` | frontend/js/documents.js:14886 |
| `docSpellLookup` | frontend/js/documents.js:14961 |
| `docSpellRoot` | frontend/js/documents.js:14876 |
| `docSpellable` | frontend/js/documents.js:14805 |
| `docSpellingVariant` | frontend/js/documents.js:16976 |
| `docSuggestAlternatives` | frontend/js/documents.js:17228 |
| `docSuggestAnswers` | frontend/js/documents.js:17398 |
| `docSuggestBand` | frontend/js/documents.js:17652 |
| `docSuggestFollowAnchor` | frontend/js/documents.js:17720 |
| `docSurface` | frontend/js/documents.js:587 |
| `docSurfaceById` | frontend/js/documents.js:601 |
| `docSurfaceChanged` | frontend/js/documents.js:580 |
| `docSurfaceInput` | frontend/js/documents.js:11898 |
| `docSyncFormatShow` | frontend/js/documents.js:13852 |
| `docTableAddColumnEdits` | frontend/js/documents.js:4210 |
| `docTableAddRowEdits` | frontend/js/documents.js:4183 |
| `docTableAlignEdits` | frontend/js/documents.js:4310 |
| `docTableAlignOf` | frontend/js/documents.js:4070 |
| `docTableApplyEdits` | frontend/js/documents.js:4326 |
| `docTableCaretTo` | frontend/js/documents.js:4596 |
| `docTableCellAt` | frontend/js/documents.js:4334 |
| `docTableCellClick` | frontend/js/documents.js:19512 |
| `docTableCellSpan` | frontend/js/documents.js:4154 |
| `docTableColumnPad` | frontend/js/documents.js:4168 |
| `docTableCommand` | frontend/js/documents.js:5003 |
| `docTableContext` | frontend/js/documents.js:4508 |
| `docTableDispatch` | frontend/js/documents.js:4520 |
| `docTableEscapeCell` | frontend/js/documents.js:4391 |
| `docTableFillRowEdits` | frontend/js/documents.js:4292 |
| `docTableFromGrid` | frontend/js/documents.js:4415 |
| `docTableGo` | frontend/js/documents.js:4545 |
| `docTableGridFromText` | frontend/js/documents.js:4404 |
| `docTableGridRules` | frontend/js/documents.js:18418 |
| `docTableIsDelimiter` | frontend/js/documents.js:4063 |
| `docTableJoinRow` | frontend/js/documents.js:4044 |
| `docTableKeyMove` | frontend/js/documents.js:4630 |
| `docTableMenu` | frontend/js/documents.js:5017 |
| `docTableParse` | frontend/js/documents.js:4088 |
| `docTablePasteEdits` | frontend/js/documents.js:4455 |
| `docTablePasteEvent` | frontend/js/documents.js:4682 |
| `docTableRemoveColumnEdits` | frontend/js/documents.js:4263 |
| `docTableRemoveEdits` | frontend/js/documents.js:4892 |
| `docTableRemoveRowEdits` | frontend/js/documents.js:4200 |
| `docTableRowLike` | frontend/js/documents.js:4057 |
| `docTableSetCellEdits` | frontend/js/documents.js:4427 |
| `docTableSplitRow` | frontend/js/documents.js:4005 |
| `docTableStepCell` | frontend/js/documents.js:4351 |
| `docTableStepRow` | frontend/js/documents.js:4381 |
| `docTableTab` | frontend/js/documents.js:16192 |
| `docTableTabStep` | frontend/js/documents.js:4582 |
| `docTakeTabEscape` | frontend/js/documents.js:3725 |
| `docTemplateFill` | frontend/js/documents.js:1559 |
| `docTemplateListKeys` | frontend/js/documents.js:1633 |
| `docText` | frontend/js/documents.js:593 |
| `docTocJump` | frontend/js/documents.js:20169 |
| `docToggleCalloutFold` | frontend/js/documents.js:20384 |
| `docToggleCodeDraw` | frontend/js/documents.js:19922 |
| `docToolPref` | frontend/js/documents.js:16093 |
| `docToolbarCollapsed` | frontend/js/documents.js:13776 |
| `docToolbarLayoutSignature` | frontend/js/documents.js:14186 |
| `docToolbarMarksAt` | frontend/js/documents.js:14468 |
| `docToolbarMode` | frontend/js/documents.js:13608 |
| `docToolsBoxFor` | frontend/js/documents.js:16151 |
| `docToolsOnInput` | frontend/js/documents.js:16115 |
| `docTopOffset` | frontend/js/documents.js:1000 |
| `docTranslatePassage` | frontend/js/documents.js:17757 |
| `docTypewriterExtension` | frontend/js/documents.js:12963 |
| `docUndo` | frontend/js/documents.js:18229 |
| `docUndoBreak` | frontend/js/documents.js:18215 |
| `docUndoDiffRange` | frontend/js/documents.js:18193 |
| `docVariantLookup` | frontend/js/documents.js:16980 |
| `docVisibleTopLine` | frontend/js/documents.js:2952 |
| `docWatchAppearance` | frontend/js/documents.js:19897 |
| `docWatchLock` | frontend/js/documents.js:20565 |
| `docWhereLine` | frontend/js/documents.js:3040 |
| `docWikiTargetLabel` | frontend/js/documents.js:9443 |
| `docWireImageEdit` | frontend/js/documents.js:9186 |
| `docWordFragment` | frontend/js/documents.js:15787 |
| `docWordGoalKey` | frontend/js/documents.js:1865 |
| `docWordKnown` | frontend/js/documents.js:14829 |
| `docWordlistReady` | frontend/js/documents.js:14750 |
| `downloadDocumentExport` | frontend/js/documents.js:10093 |
| `ensureDocEditor` | frontend/js/documents.js:19839 |
| `ensureDocumentExists` | frontend/js/documents.js:1717 |
| `expandNoteIntoDocument` | frontend/js/documents.js:1836 |
| `exportDocumentBundle` | frontend/js/documents.js:10114 |
| `exportDocumentDocx` | frontend/js/documents.js:10118 |
| `exportDocumentHtml` | frontend/js/documents.js:10438 |
| `exportDocumentMarkdown` | frontend/js/documents.js:10124 |
| `exportDocumentPdf` | frontend/js/documents.js:10698 |
| `finishMarkdownEdit` | frontend/js/documents.js:9991 |
| `fitDocToolbarRow` | frontend/js/documents.js:14003 |
| `fitDocToolbars` | frontend/js/documents.js:14226 |
| `foldDocMenuGroup` | frontend/js/documents.js:226 |
| `forgetDocEditLocally` | frontend/js/documents.js:1053 |
| `getDocWordGoal` | frontend/js/documents.js:1869 |
| `hideDocComplete` | frontend/js/documents.js:15802 |
| `indentDocSelection` | frontend/js/documents.js:3749 |
| `initDocSidebarTabs` | frontend/js/documents.js:11816 |
| `initMarkdownToolbars` | frontend/js/documents.js:12772 |
| `insertAround` | frontend/js/documents.js:9952 |
| `jumpToDocLine` | frontend/js/documents.js:3124 |
| `keepDocEditLocally` | frontend/js/documents.js:1044 |
| `keepOutlineRowInView` | frontend/js/documents.js:3051 |
| `layerDocWikiLinks` | frontend/js/documents.js:3398 |
| `loadCodeMirror` | frontend/js/documents.js:18280 |
| `loadDocFileTypes` | frontend/js/documents.js:79 |
| `loadDocuments` | frontend/js/documents.js:723 |
| `loadDocumentsNow` | frontend/js/documents.js:734 |
| `markDocDirty` | frontend/js/documents.js:1742 |
| `markDocOutline` | frontend/js/documents.js:3065 |
| `markDocToolbarSepEdges` | frontend/js/documents.js:14133 |
| `mermaidFlowLayout` | frontend/js/documents.js:8737 |
| `mermaidFlowLink` | frontend/js/documents.js:8661 |
| `mermaidFlowNode` | frontend/js/documents.js:8645 |
| `mermaidFlowParse` | frontend/js/documents.js:8686 |
| `mermaidFlowSummary` | frontend/js/documents.js:8932 |
| `mermaidFlowSvgTree` | frontend/js/documents.js:8890 |
| `mermaidFlowUnquote` | frontend/js/documents.js:8638 |
| `mountDocEditor` | frontend/js/documents.js:19810 |
| `mountDocToolbarControls` | frontend/js/documents.js:13947 |
| `mountDocToolbarControlsFor` | frontend/js/documents.js:13873 |
| `mountEditorToolbarExtras` | frontend/js/documents.js:12032 |
| `mountGutterFor` | frontend/js/documents.js:3612 |
| `mountNoteSurface` | frontend/js/documents.js:12630 |
| `noteSourceWanted` | frontend/js/documents.js:12496 |
| `noteSurfaceExtensions` | frontend/js/documents.js:12336 |
| `noteSurfaceFor` | frontend/js/documents.js:12309 |
| `noteSurfaceGutter` | frontend/js/documents.js:20106 |
| `noteSurfaceKeymap` | frontend/js/documents.js:12421 |
| `noteSurfaceMeta` | frontend/js/documents.js:12324 |
| `noteSurfaceMirror` | frontend/js/documents.js:12527 |
| `noteSurfaceName` | frontend/js/documents.js:12404 |
| `noteSurfaceOwnValue` | frontend/js/documents.js:12556 |
| `noteSurfaceUpdate` | frontend/js/documents.js:12514 |
| `offerKeptDocEdit` | frontend/js/documents.js:1068 |
| `openDocAiHistory` | frontend/js/documents.js:11156 |
| `openDocAiPanel` | frontend/js/documents.js:10949 |
| `openDocDictionary` | frontend/js/documents.js:18035 |
| `openDocExtractPreview` | frontend/js/documents.js:10974 |
| `openDocHistory` | frontend/js/documents.js:11534 |
| `openDocPhoneInsert` | frontend/js/documents.js:12216 |
| `openDocSuggest` | frontend/js/documents.js:17525 |
| `openDocTemplateDialog` | frontend/js/documents.js:1653 |
| `openDocument` | frontend/js/documents.js:898 |
| `placeDocSuggest` | frontend/js/documents.js:17665 |
| `promptDocWordGoal` | frontend/js/documents.js:1921 |
| `pushDocAiUndo` | frontend/js/documents.js:11044 |
| `recordDocAiEditLog` | frontend/js/documents.js:11068 |
| `renderDocAiDiff` | frontend/js/documents.js:10838 |
| `renderDocBacklinks` | frontend/js/documents.js:1303 |
| `renderDocBookmarks` | frontend/js/documents.js:1379 |
| `renderDocCaret` | frontend/js/documents.js:14399 |
| `renderDocComments` | frontend/js/documents.js:6546 |
| `renderDocComplete` | frontend/js/documents.js:15839 |
| `renderDocCounts` | frontend/js/documents.js:14515 |
| `renderDocCrumbs` | frontend/js/documents.js:2126 |
| `renderDocDictionary` | frontend/js/documents.js:18063 |
| `renderDocGutter` | frontend/js/documents.js:3577 |
| `renderDocHistoryList` | frontend/js/documents.js:11584 |
| `renderDocList` | frontend/js/documents.js:770 |
| `renderDocNotes` | frontend/js/documents.js:1337 |
| `renderDocOutline` | frontend/js/documents.js:2654 |
| `renderDocPreview` | frontend/js/documents.js:3179 |
| `renderDocProperties` | frontend/js/documents.js:5685 |
| `renderDocProse` | frontend/js/documents.js:15172 |
| `renderDocProsePanel` | frontend/js/documents.js:15350 |
| `renderDocShortcutSheet` | frontend/js/documents.js:2540 |
| `renderDocStats` | frontend/js/documents.js:1894 |
| `renderDocStatusBar` | frontend/js/documents.js:14548 |
| `renderDocStorage` | frontend/js/documents.js:3140 |
| `renderDocToolbarState` | frontend/js/documents.js:14489 |
| `renderDocTools` | frontend/js/documents.js:16903 |
| `runDocAiEdit` | frontend/js/documents.js:10982 |
| `saveDocument` | frontend/js/documents.js:1764 |
| `scheduleDocFacts` | frontend/js/documents.js:14571 |
| `scheduleDocOutlineSpy` | frontend/js/documents.js:3112 |
| `scheduleDocPreview` | frontend/js/documents.js:3165 |
| `setDocAiProposal` | frontend/js/documents.js:10825 |
| `setDocFocusSidebar` | frontend/js/documents.js:13138 |
| `setDocFocusTools` | frontend/js/documents.js:13108 |
| `setDocGutter` | frontend/js/documents.js:13714 |
| `setDocToolbarCollapsed` | frontend/js/documents.js:13826 |
| `setDocToolbarMode` | frontend/js/documents.js:13648 |
| `setDocView` | frontend/js/documents.js:634 |
| `setDocWidth` | frontend/js/documents.js:12873 |
| `setDocWordGoal` | frontend/js/documents.js:1874 |
| `setNoteSurfaceSource` | frontend/js/documents.js:12505 |
| `shiftDocIndent` | frontend/js/documents.js:9962 |
| `showDocAiResult` | frontend/js/documents.js:10784 |
| `showDocSidebarSection` | frontend/js/documents.js:11790 |
| `showDocTemplatePreview` | frontend/js/documents.js:1695 |
| `showNoDocument` | frontend/js/documents.js:877 |
| `syncDocAiPanel` | frontend/js/documents.js:10898 |
| `syncDocFileType` | frontend/js/documents.js:108 |
| `syncDocGutterMetrics` | frontend/js/documents.js:3536 |
| `syncDocScroll` | frontend/js/documents.js:9647 |
| `syncDocToolbarMore` | frontend/js/documents.js:14111 |
| `textareaSurface` | frontend/js/documents.js:386 |
| `toggleDocAiHunk` | frontend/js/documents.js:10868 |
| `toggleDocComment` | frontend/js/documents.js:3835 |
| `toggleDocFindBar` | frontend/js/documents.js:2014 |
| `toggleDocFocus` | frontend/js/documents.js:13161 |
| `toggleDocHistoryDiff` | frontend/js/documents.js:11726 |
| `toggleDocProseDock` | frontend/js/documents.js:16866 |
| `toggleDocToolbar` | frontend/js/documents.js:13860 |
| `toggleDocWidth` | frontend/js/documents.js:12882 |
| `trimDocToolbarGroup` | frontend/js/documents.js:14069 |
| `useDocTemplate` | frontend/js/documents.js:1624 |
| `watchDocGutter` | frontend/js/documents.js:3564 |
| `watchDocToolbarContents` | frontend/js/documents.js:14196 |
| `watchDocToolbarWidth` | frontend/js/documents.js:14157 |
| `wireDocScrollSync` | frontend/js/documents.js:9698 |
| `wireDocSurfaceScroll` | frontend/js/documents.js:9683 |
| `wireMarkdownToolbar` | frontend/js/documents.js:12101 |
| `wireMdFormatShortcuts` | frontend/js/documents.js:12181 |
| `withDocPreviewShown` | frontend/js/documents.js:3464 |
| `wrapDocSelection` | frontend/js/documents.js:10018 |

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

### frontend/js/graph-canvas.js (120)

| Name | File:line |
|---|---|
| `gcArmTouchLasso` | frontend/js/graph-canvas.js:3368 |
| `gcArrows` | frontend/js/graph-canvas.js:783 |
| `gcAutoFitDone` | frontend/js/graph-canvas.js:180 |
| `gcBalanceFit` | frontend/js/graph-canvas.js:1380 |
| `gcBowPoint` | frontend/js/graph-canvas.js:794 |
| `gcBoxLineCount` | frontend/js/graph-canvas.js:654 |
| `gcClampBox` | frontend/js/graph-canvas.js:568 |
| `gcClickNode` | frontend/js/graph-canvas.js:3749 |
| `gcClipEdge` | frontend/js/graph-canvas.js:641 |
| `gcCloseNodeMenu` | frontend/js/graph-canvas.js:3593 |
| `gcCurvedLinks` | frontend/js/graph-canvas.js:752 |
| `gcDraw` | frontend/js/graph-canvas.js:1708 |
| `gcDrawDrift` | frontend/js/graph-canvas.js:2528 |
| `gcDrawEdgeHover` | frontend/js/graph-canvas.js:2541 |
| `gcDrawLabels` | frontend/js/graph-canvas.js:2601 |
| `gcDrawNebulae` | frontend/js/graph-canvas.js:992 |
| `gcDrawPill` | frontend/js/graph-canvas.js:2578 |
| `gcDrawSelection` | frontend/js/graph-canvas.js:3417 |
| `gcDrawTopicHulls` | frontend/js/graph-canvas.js:1033 |
| `gcDrawTrace` | frontend/js/graph-canvas.js:2761 |
| `gcEaseOut` | frontend/js/graph-canvas.js:1433 |
| `gcEdgeAtWorld` | frontend/js/graph-canvas.js:2844 |
| `gcEdgeStyle` | frontend/js/graph-canvas.js:804 |
| `gcEl` | frontend/js/graph-canvas.js:1604 |
| `gcEnsureCanvas` | frontend/js/graph-canvas.js:845 |
| `gcExportPng` | frontend/js/graph-canvas.js:1655 |
| `gcFadeStep` | frontend/js/graph-canvas.js:1512 |
| `gcFadeToward` | frontend/js/graph-canvas.js:1499 |
| `gcFillSparks` | frontend/js/graph-canvas.js:2508 |
| `gcFilterChip` | frontend/js/graph-canvas.js:1105 |
| `gcGlideFinish` | frontend/js/graph-canvas.js:1550 |
| `gcGlideStep` | frontend/js/graph-canvas.js:1534 |
| `gcHexToRgb` | frontend/js/graph-canvas.js:929 |
| `gcHideTopic` | frontend/js/graph-canvas.js:1176 |
| `gcHighlight` | frontend/js/graph-canvas.js:1618 |
| `gcHoverChanged` | frontend/js/graph-canvas.js:1441 |
| `gcHoverGrow` | frontend/js/graph-canvas.js:1452 |
| `gcHoverStep` | frontend/js/graph-canvas.js:1460 |
| `gcIsNote` | frontend/js/graph-canvas.js:338 |
| `gcKeyboardId` | frontend/js/graph-canvas.js:192 |
| `gcLabelCut` | frontend/js/graph-canvas.js:2738 |
| `gcLabelPlates` | frontend/js/graph-canvas.js:764 |
| `gcLabelText` | frontend/js/graph-canvas.js:2748 |
| `gcLabelWidth` | frontend/js/graph-canvas.js:2706 |
| `gcLabelZoom` | frontend/js/graph-canvas.js:771 |
| `gcLegendEdgeKey` | frontend/js/graph-canvas.js:4745 |
| `gcLineGrid` | frontend/js/graph-canvas.js:585 |
| `gcLinkKindHidden` | frontend/js/graph-canvas.js:1101 |
| `gcLinkSpark` | frontend/js/graph-canvas.js:2463 |
| `gcLinkWidth` | frontend/js/graph-canvas.js:777 |
| `gcLitAlpha` | frontend/js/graph-canvas.js:1505 |
| `gcMaxDegree` | frontend/js/graph-canvas.js:236 |
| `gcNodeAtWorld` | frontend/js/graph-canvas.js:2820 |
| `gcNodeSprite` | frontend/js/graph-canvas.js:936 |
| `gcOpenTopic` | frontend/js/graph-canvas.js:1352 |
| `gcPlaceLabels` | frontend/js/graph-canvas.js:443 |
| `gcPlacePill` | frontend/js/graph-canvas.js:701 |
| `gcPlateAtWorld` | frontend/js/graph-canvas.js:1324 |
| `gcPlateTitle` | frontend/js/graph-canvas.js:1331 |
| `gcPointInPolygon` | frontend/js/graph-canvas.js:3347 |
| `gcPost` | frontend/js/graph-canvas.js:3803 |
| `gcPruneSimilarity` | frontend/js/graph-canvas.js:386 |
| `gcQuadAt` | frontend/js/graph-canvas.js:2453 |
| `gcRadius` | frontend/js/graph-canvas.js:248 |
| `gcReadTokens` | frontend/js/graph-canvas.js:300 |
| `gcRelinkPairs` | frontend/js/graph-canvas.js:5236 |
| `gcRenameTopicInline` | frontend/js/graph-canvas.js:1278 |
| `gcRenderFilterChips` | frontend/js/graph-canvas.js:1121 |
| `gcRequestDraw` | frontend/js/graph-canvas.js:1565 |
| `gcRequestMinimapFrame` | frontend/js/graph-canvas.js:1586 |
| `gcReshuffle` | frontend/js/graph-canvas.js:3856 |
| `gcResize` | frontend/js/graph-canvas.js:817 |
| `gcReveal` | frontend/js/graph-canvas.js:5245 |
| `gcRuleDomain` | frontend/js/graph-canvas.js:4550 |
| `gcRuleKey` | frontend/js/graph-canvas.js:4532 |
| `gcRuleScale` | frontend/js/graph-canvas.js:4556 |
| `gcSaveTopicName` | frontend/js/graph-canvas.js:1255 |
| `gcSelectedNodes` | frontend/js/graph-canvas.js:3460 |
| `gcSelectionChanged` | frontend/js/graph-canvas.js:3450 |
| `gcSetAutoFitDone` | frontend/js/graph-canvas.js:184 |
| `gcSetHovered` | frontend/js/graph-canvas.js:196 |
| `gcShape` | frontend/js/graph-canvas.js:3839 |
| `gcShowEmpty` | frontend/js/graph-canvas.js:4167 |
| `gcShowEveryNote` | frontend/js/graph-canvas.js:4196 |
| `gcShowNodeMenu` | frontend/js/graph-canvas.js:3650 |
| `gcShowTopic` | frontend/js/graph-canvas.js:1182 |
| `gcSimilarityBand` | frontend/js/graph-canvas.js:429 |
| `gcSimilarityCutoff` | frontend/js/graph-canvas.js:731 |
| `gcSmooth` | frontend/js/graph-canvas.js:1494 |
| `gcStartWorker` | frontend/js/graph-canvas.js:3880 |
| `gcStop` | frontend/js/graph-canvas.js:3807 |
| `gcSurface` | frontend/js/graph-canvas.js:43 |
| `gcTogglePin` | frontend/js/graph-canvas.js:3324 |
| `gcTooltip` | frontend/js/graph-canvas.js:3708 |
| `gcTooltipMatches` | frontend/js/graph-canvas.js:3733 |
| `gcTopicColour` | frontend/js/graph-canvas.js:1359 |
| `gcTopicCore` | frontend/js/graph-canvas.js:1346 |
| `gcTopicMembers` | frontend/js/graph-canvas.js:1339 |
| `gcTreeIndex` | frontend/js/graph-canvas.js:2806 |
| `gcUnlinkPairs` | frontend/js/graph-canvas.js:5229 |
| `gcVisibleAtTime` | frontend/js/graph-canvas.js:1642 |
| `gcWireInteraction` | frontend/js/graph-canvas.js:2886 |
| `gcWireLasso` | frontend/js/graph-canvas.js:3383 |
| `gcWireNodeMenu` | frontend/js/graph-canvas.js:3597 |
| `gcWireSelectionDock` | frontend/js/graph-canvas.js:3464 |
| `gcWorkerParams` | frontend/js/graph-canvas.js:3814 |
| `gcWorldFor` | frontend/js/graph-canvas.js:4118 |
| `gcWorldPoint` | frontend/js/graph-canvas.js:2830 |
| `gcWriteUnresolved` | frontend/js/graph-canvas.js:3787 |
| `graphPaneColour` | frontend/js/graph-canvas.js:5021 |
| `graphPaneDocumentNote` | frontend/js/graph-canvas.js:5157 |
| `graphPaneEnsure` | frontend/js/graph-canvas.js:4999 |
| `graphPaneFollow` | frontend/js/graph-canvas.js:5111 |
| `graphPaneWire` | frontend/js/graph-canvas.js:5166 |
| `graphRenderLegend` | frontend/js/graph-canvas.js:4573 |
| `graphRenderStats` | frontend/js/graph-canvas.js:4785 |
| `graphSyncTimeSlider` | frontend/js/graph-canvas.js:4826 |
| `graphWireTimePlay` | frontend/js/graph-canvas.js:4865 |
| `renderGraphCanvas` | frontend/js/graph-canvas.js:4214 |
| `renderGraphPane` | frontend/js/graph-canvas.js:5027 |

### frontend/js/graph-worker.js (44)

| Name | File:line |
|---|---|
| `KIND_LENGTH` | frontend/js/graph-worker.js:207 |
| `alphaDecayFor` | frontend/js/graph-worker.js:124 |
| `applyForces` | frontend/js/graph-worker.js:1203 |
| `applyGrouping` | frontend/js/graph-worker.js:1150 |
| `bridgeGroup` | frontend/js/graph-worker.js:452 |
| `centreScale` | frontend/js/graph-worker.js:251 |
| `clampToWorld` | frontend/js/graph-worker.js:1275 |
| `clearCurve` | frontend/js/graph-worker.js:894 |
| `clearNearest` | frontend/js/graph-worker.js:921 |
| `clearPush` | frontend/js/graph-worker.js:942 |
| `clearanceForce` | frontend/js/graph-worker.js:973 |
| `clustered` | frontend/js/graph-worker.js:440 |
| `collidePadFor` | frontend/js/graph-worker.js:164 |
| `crossStrength` | frontend/js/graph-worker.js:232 |
| `densityScale` | frontend/js/graph-worker.js:242 |
| `ellipseWalk` | frontend/js/graph-worker.js:539 |
| `groupAnchors` | frontend/js/graph-worker.js:599 |
| `groupAnchorsOrganic` | frontend/js/graph-worker.js:583 |
| `groupCohesion` | frontend/js/graph-worker.js:346 |
| `groupDiscs` | frontend/js/graph-worker.js:528 |
| `groupGather` | frontend/js/graph-worker.js:357 |
| `groupOrder` | frontend/js/graph-worker.js:377 |
| `groupingOn` | frontend/js/graph-worker.js:1144 |
| `hubForce` | frontend/js/graph-worker.js:1032 |
| `leafForce` | frontend/js/graph-worker.js:1106 |
| `linkStrength` | frontend/js/graph-worker.js:235 |
| `loop` | frontend/js/graph-worker.js:1324 |
| `orbitForce` | frontend/js/graph-worker.js:857 |
| `orbitRadiusAt` | frontend/js/graph-worker.js:726 |
| `orbitReach` | frontend/js/graph-worker.js:693 |
| `orbitUpdate` | frontend/js/graph-worker.js:799 |
| `orbitUpdateGrouped` | frontend/js/graph-worker.js:745 |
| `portraitPull` | frontend/js/graph-worker.js:308 |
| `post` | frontend/js/graph-worker.js:1284 |
| `reshuffle` | frontend/js/graph-worker.js:1233 |
| `rimOffset` | frontend/js/graph-worker.js:1058 |
| `ringFor` | frontend/js/graph-worker.js:565 |
| `run` | frontend/js/graph-worker.js:1388 |
| `seededRandom` | frontend/js/graph-worker.js:475 |
| `setRingSeed` | frontend/js/graph-worker.js:486 |
| `shapeForce` | frontend/js/graph-worker.js:1080 |
| `shuffleStep` | frontend/js/graph-worker.js:1259 |
| `stopLoop` | frontend/js/graph-worker.js:1313 |
| `tuning` | frontend/js/graph-worker.js:261 |

### frontend/js/graph.js (111)

| Name | File:line |
|---|---|
| `applyGraphHighlight` | frontend/js/graph.js:3389 |
| `arcPath` | frontend/js/graph.js:454 |
| `askLinkDetails` | frontend/js/graph.js:1339 |
| `clearGraphKeyboardFocus` | frontend/js/graph.js:4378 |
| `clearTrace` | frontend/js/graph.js:807 |
| `closeGraphLinkPeek` | frontend/js/graph.js:3641 |
| `closeGraphNewNote` | frontend/js/graph.js:4463 |
| `closeGraphPopup` | frontend/js/graph.js:4365 |
| `drawTrace` | frontend/js/graph.js:1188 |
| `exportGraphPng` | frontend/js/graph.js:4596 |
| `fillTracePickers` | frontend/js/graph.js:615 |
| `fitGraphToView` | frontend/js/graph.js:3309 |
| `focusGraphNode` | frontend/js/graph.js:3123 |
| `frameTree` | frontend/js/graph.js:473 |
| `graphApplySettings` | frontend/js/graph.js:5762 |
| `graphApplyView` | frontend/js/graph.js:5320 |
| `graphCalmScheme` | frontend/js/graph.js:1735 |
| `graphCaptureSettings` | frontend/js/graph.js:5731 |
| `graphCaptureView` | frontend/js/graph.js:5266 |
| `graphCategoryScale` | frontend/js/graph.js:1745 |
| `graphColourMode` | frontend/js/graph.js:1554 |
| `graphControlsSheetParts` | frontend/js/graph.js:5837 |
| `graphEndpoint` | frontend/js/graph.js:1779 |
| `graphFill` | frontend/js/graph.js:1805 |
| `graphGroupColour` | frontend/js/graph.js:1585 |
| `graphGroupNode` | frontend/js/graph.js:212 |
| `graphGroups` | frontend/js/graph.js:1570 |
| `graphInlineComputedStyle` | frontend/js/graph.js:4542 |
| `graphLayout` | frontend/js/graph.js:133 |
| `graphLayoutIsComputed` | frontend/js/graph.js:157 |
| `graphLinkKind` | frontend/js/graph.js:3648 |
| `graphLocalQuery` | frontend/js/graph.js:1770 |
| `graphMinimapCanShow` | frontend/js/graph.js:4758 |
| `graphMinimapChildren` | frontend/js/graph.js:4787 |
| `graphMinimapEdgePairs` | frontend/js/graph.js:4699 |
| `graphMinimapFinite` | frontend/js/graph.js:4967 |
| `graphMinimapFrame` | frontend/js/graph.js:4981 |
| `graphMinimapPaint` | frontend/js/graph.js:4813 |
| `graphMinimapQueuePaint` | frontend/js/graph.js:4765 |
| `graphMinimapSet` | frontend/js/graph.js:4806 |
| `graphMinimapShown` | frontend/js/graph.js:4736 |
| `graphNeighbourInDirection` | frontend/js/graph.js:3102 |
| `graphNodeById` | frontend/js/graph.js:3095 |
| `graphNodeLabel` | frontend/js/graph.js:3754 |
| `graphNodeRadius` | frontend/js/graph.js:101 |
| `graphNodeScreenPoint` | frontend/js/graph.js:3147 |
| `graphNodeUnder` | frontend/js/graph.js:1300 |
| `graphPopupFileCard` | frontend/js/graph.js:3934 |
| `graphPopupMediaRefs` | frontend/js/graph.js:3911 |
| `graphRasterizeSvg` | frontend/js/graph.js:4553 |
| `graphRemoveLink` | frontend/js/graph.js:3596 |
| `graphRenderGroups` | frontend/js/graph.js:1607 |
| `graphRenderer` | frontend/js/graph.js:1716 |
| `graphResetToDefaults` | frontend/js/graph.js:5794 |
| `graphResolveGroups` | frontend/js/graph.js:1592 |
| `graphRestoreSwitches` | frontend/js/graph.js:5457 |
| `graphSaveCurrentView` | frontend/js/graph.js:5310 |
| `graphSavedViews` | frontend/js/graph.js:5257 |
| `graphSetGroups` | frontend/js/graph.js:1579 |
| `graphSettingsEqual` | frontend/js/graph.js:5751 |
| `graphShowNote` | frontend/js/graph.js:4045 |
| `graphSizeMode` | frontend/js/graph.js:1517 |
| `graphSizeRadius` | frontend/js/graph.js:1522 |
| `graphSyncFocusChip` | frontend/js/graph.js:1679 |
| `graphSyncSimilarityRow` | frontend/js/graph.js:5635 |
| `graphTopicFor` | frontend/js/graph.js:4101 |
| `graphZoomBy` | frontend/js/graph.js:5515 |
| `hierarchyPath` | frontend/js/graph.js:436 |
| `initGraphDockHeightToken` | frontend/js/graph.js:5068 |
| `initGraphGroups` | frontend/js/graph.js:1641 |
| `initGraphKeyboard` | frontend/js/graph.js:3165 |
| `initGraphMinimap` | frontend/js/graph.js:5086 |
| `initGraphViews` | frontend/js/graph.js:5414 |
| `layoutHierarchy` | frontend/js/graph.js:306 |
| `linkByDrop` | frontend/js/graph.js:1448 |
| `openGraphControlsSheet` | frontend/js/graph.js:5853 |
| `openGraphLinkPanel` | frontend/js/graph.js:3769 |
| `openGraphLinkPeek` | frontend/js/graph.js:3656 |
| `openGraphNewNote` | frontend/js/graph.js:4432 |
| `openGraphPopup` | frontend/js/graph.js:3504 |
| `pickTraceEnd` | frontend/js/graph.js:691 |
| `placeGraphPopup` | frontend/js/graph.js:3993 |
| `positionTraceLines` | frontend/js/graph.js:1172 |
| `radialFlip` | frontend/js/graph.js:268 |
| `radialRings` | frontend/js/graph.js:277 |
| `renderGraph` | frontend/js/graph.js:1753 |
| `renderGraphPopupActions` | frontend/js/graph.js:4216 |
| `renderGraphPopupHeader` | frontend/js/graph.js:3468 |
| `renderGraphPopupInfo` | frontend/js/graph.js:4166 |
| `renderGraphPopupMedia` | frontend/js/graph.js:3938 |
| `renderGraphPopupProps` | frontend/js/graph.js:4138 |
| `renderGraphPopupTopic` | frontend/js/graph.js:4076 |
| `renderGraphSvg` | frontend/js/graph.js:1828 |
| `renderGraphViews` | frontend/js/graph.js:5384 |
| `renderTraceReadout` | frontend/js/graph.js:1003 |
| `renderTraceState` | frontend/js/graph.js:719 |
| `replyLoops` | frontend/js/graph.js:297 |
| `runTrace` | frontend/js/graph.js:833 |
| `saveGraphNewNote` | frontend/js/graph.js:4468 |
| `saveGraphPopup` | frontend/js/graph.js:4393 |
| `selectTraceRoute` | frontend/js/graph.js:902 |
| `setGraphPhysicsEnabled` | frontend/js/graph.js:165 |
| `setTraceEnd` | frontend/js/graph.js:776 |
| `setTracePanelOpen` | frontend/js/graph.js:622 |
| `showTopicInGraph` | frontend/js/graph.js:4120 |
| `showTraceMessage` | frontend/js/graph.js:799 |
| `storyPrompt` | frontend/js/graph.js:990 |
| `syncGraphPopupSave` | frontend/js/graph.js:3585 |
| `toggleGraphFullscreen` | frontend/js/graph.js:5527 |
| `traceLabel` | frontend/js/graph.js:712 |
| `tracePath` | frontend/js/graph.js:1158 |

### frontend/js/harper-worker.js (3)

| Name | File:line |
|---|---|
| `dialectOf` | frontend/js/harper-worker.js:47 |
| `linterFor` | frontend/js/harper-worker.js:51 |
| `suggestionOf` | frontend/js/harper-worker.js:69 |

### frontend/js/help-chat.js (16)

| Name | File:line |
|---|---|
| `askAtlas` | frontend/js/help-chat.js:589 |
| `atlasStartersFor` | frontend/js/help-chat.js:722 |
| `helpChatAppendRow` | frontend/js/help-chat.js:30 |
| `helpChatIsNearBottom` | frontend/js/help-chat.js:24 |
| `helpChatNewChat` | frontend/js/help-chat.js:505 |
| `helpChatOnScreenHelp` | frontend/js/help-chat.js:182 |
| `helpChatOpenButton` | frontend/js/help-chat.js:50 |
| `helpChatReveal` | frontend/js/help-chat.js:461 |
| `helpChatSetBusy` | frontend/js/help-chat.js:220 |
| `helpChatStop` | frontend/js/help-chat.js:241 |
| `helpChatStreamTurn` | frontend/js/help-chat.js:353 |
| `openHelpChat` | frontend/js/help-chat.js:620 |
| `renderAtlasStarters` | frontend/js/help-chat.js:555 |
| `renderHelpChatMenu` | frontend/js/help-chat.js:522 |
| `renderHelpChatMessage` | frontend/js/help-chat.js:61 |
| `submitHelpChatQuestion` | frontend/js/help-chat.js:246 |

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

### frontend/js/library.js (220)

| Name | File:line |
|---|---|
| `activityDetailText` | frontend/js/library.js:1237 |
| `activitySettingValue` | frontend/js/library.js:1221 |
| `allBookmarkGroups` | frontend/js/library.js:10214 |
| `analyseMediaRow` | frontend/js/library.js:7353 |
| `applyLibraryMediaView` | frontend/js/library.js:3476 |
| `attachBoardTick` | frontend/js/library.js:9889 |
| `binRoutes` | frontend/js/library.js:1022 |
| `bookmarkAddress` | frontend/js/library.js:3682 |
| `bookmarkRow` | frontend/js/library.js:10583 |
| `bookmarkSiteSection` | frontend/js/library.js:10546 |
| `bookmarkSort` | frontend/js/library.js:10473 |
| `buildFileReadingSummary` | frontend/js/library.js:7511 |
| `bulkDeleteLibraryBoards` | frontend/js/library.js:9928 |
| `bulkDeleteLibraryLinks` | frontend/js/library.js:10131 |
| `bulkDeleteLibraryMedia` | frontend/js/library.js:7642 |
| `bulkMoveLibraryLinks` | frontend/js/library.js:10158 |
| `bulkUpdateLibraryLinks` | frontend/js/library.js:10141 |
| `clearLibraryBoardsSelection` | frontend/js/library.js:9920 |
| `clearLibraryLinksSelection` | frontend/js/library.js:10079 |
| `clearLibraryMediaSelection` | frontend/js/library.js:7636 |
| `closeBinnedReader` | frontend/js/library.js:1604 |
| `closeOcrWorkspace` | frontend/js/library.js:5146 |
| `contentsBuildSection` | frontend/js/library.js:11314 |
| `contentsDocRow` | frontend/js/library.js:11227 |
| `contentsGlyph` | frontend/js/library.js:11162 |
| `contentsGroupMark` | frontend/js/library.js:11298 |
| `contentsGroups` | frontend/js/library.js:11006 |
| `contentsMonthKey` | frontend/js/library.js:10999 |
| `contentsNoteFacts` | frontend/js/library.js:11189 |
| `contentsNoteMark` | frontend/js/library.js:11169 |
| `contentsNoteName` | frontend/js/library.js:11102 |
| `contentsNoteRow` | frontend/js/library.js:11201 |
| `contentsOpenDocument` | frontend/js/library.js:11120 |
| `contentsOrderedKeys` | frontend/js/library.js:11075 |
| `contentsRenameTopic` | frontend/js/library.js:11389 |
| `contentsRowBody` | frontend/js/library.js:11149 |
| `contentsSectionLabel` | frontend/js/library.js:11055 |
| `contentsSetAll` | frontend/js/library.js:11576 |
| `contentsTopicNames` | frontend/js/library.js:11064 |
| `contentsTreeItem` | frontend/js/library.js:11135 |
| `contentsTreeKeys` | frontend/js/library.js:11591 |
| `contentsWireTopicHeading` | frontend/js/library.js:11363 |
| `createLibrarySelectbar` | frontend/js/library.js:9824 |
| `deleteBookmarkGroup` | frontend/js/library.js:10250 |
| `deleteBookmarksWithUndo` | frontend/js/library.js:10090 |
| `deleteSkillWithUndo` | frontend/js/library.js:2441 |
| `duplicateSkill` | frontend/js/library.js:2413 |
| `emptyBookmarkGroups` | frontend/js/library.js:10191 |
| `ensureLibraryGridStop` | frontend/js/library.js:1472 |
| `fetchAllBookmarks` | frontend/js/library.js:10041 |
| `fileMetaLine` | frontend/js/library.js:3663 |
| `filterBookmarks` | frontend/js/library.js:10488 |
| `filterLibraryImagesGallery` | frontend/js/library.js:7890 |
| `flashLibraryItem` | frontend/js/library.js:1648 |
| `focusLibraryFile` | frontend/js/library.js:3610 |
| `importLibraryDocuments` | frontend/js/library.js:3036 |
| `isImageUrl` | frontend/js/library.js:3438 |
| `keepLibraryScroll` | frontend/js/library.js:1132 |
| `libraryActions` | frontend/js/library.js:754 |
| `libraryBackgroundRun` | frontend/js/library.js:3835 |
| `libraryCard` | frontend/js/library.js:1255 |
| `libraryColumnCount` | frontend/js/library.js:454 |
| `libraryCopyActions` | frontend/js/library.js:715 |
| `libraryDocSort` | frontend/js/library.js:3012 |
| `libraryDocsMatchesProperty` | frontend/js/library.js:2933 |
| `libraryDocsPropertyOptions` | frontend/js/library.js:2918 |
| `libraryImageOrigin` | frontend/js/library.js:7823 |
| `libraryImagesFingerprint` | frontend/js/library.js:3393 |
| `libraryKeyOf` | frontend/js/library.js:189 |
| `libraryLightboxItems` | frontend/js/library.js:7455 |
| `libraryMediaSort` | frontend/js/library.js:7780 |
| `librarySelectedItems` | frontend/js/library.js:1090 |
| `librarySorted` | frontend/js/library.js:364 |
| `libraryTitleAndPreview` | frontend/js/library.js:1173 |
| `libraryView` | frontend/js/library.js:185 |
| `linkNoteFromLibrary` | frontend/js/library.js:1034 |
| `loadLibrary` | frontend/js/library.js:205 |
| `manageBookmarkGroups` | frontend/js/library.js:10276 |
| `mediaFileIcon` | frontend/js/library.js:3624 |
| `mediaFileKind` | frontend/js/library.js:3706 |
| `mediaHasBeenRead` | frontend/js/library.js:7381 |
| `mediaReading` | frontend/js/library.js:7377 |
| `mediaReadingBadge` | frontend/js/library.js:7389 |
| `mediaReadingSummary` | frontend/js/library.js:7418 |
| `mediaRowDeleteEndpoint` | frontend/js/library.js:7622 |
| `mediaRowKey` | frontend/js/library.js:7615 |
| `metaLine` | frontend/js/library.js:3646 |
| `newBookmarkGroup` | frontend/js/library.js:10254 |
| `ocrAllText` | frontend/js/library.js:6814 |
| `ocrApplyFind` | frontend/js/library.js:6284 |
| `ocrApplyZoom` | frontend/js/library.js:5670 |
| `ocrAskRange` | frontend/js/library.js:6707 |
| `ocrBuildPageRail` | frontend/js/library.js:5078 |
| `ocrBuildScrollPages` | frontend/js/library.js:5865 |
| `ocrCan` | frontend/js/library.js:6170 |
| `ocrCanOpen` | frontend/js/library.js:5289 |
| `ocrChooseReader` | frontend/js/library.js:6206 |
| `ocrClearRegionSelection` | frontend/js/library.js:4473 |
| `ocrCloseEdit` | frontend/js/library.js:6808 |
| `ocrDockFits` | frontend/js/library.js:6534 |
| `ocrDocumentReading` | frontend/js/library.js:4754 |
| `ocrFetchFileText` | frontend/js/library.js:5296 |
| `ocrFitDock` | frontend/js/library.js:6553 |
| `ocrFitStage` | frontend/js/library.js:5566 |
| `ocrIsLocal` | frontend/js/library.js:6163 |
| `ocrIsPdf` | frontend/js/library.js:3772 |
| `ocrIsTextFile` | frontend/js/library.js:5282 |
| `ocrKeepCentre` | frontend/js/library.js:5730 |
| `ocrLoadPage` | frontend/js/library.js:4814 |
| `ocrLoadReaders` | frontend/js/library.js:5991 |
| `ocrLoadReadersNow` | frontend/js/library.js:5996 |
| `ocrLoadSiblings` | frontend/js/library.js:5249 |
| `ocrLocalName` | frontend/js/library.js:6179 |
| `ocrMoveOverlays` | frontend/js/library.js:4465 |
| `ocrNaturalScale` | frontend/js/library.js:5666 |
| `ocrOpenEdit` | frontend/js/library.js:6798 |
| `ocrOpenReaderSettings` | frontend/js/library.js:6637 |
| `ocrOpenSibling` | frontend/js/library.js:5443 |
| `ocrPageImageUrl` | frontend/js/library.js:3795 |
| `ocrPaintEmpty` | frontend/js/library.js:6726 |
| `ocrPaintRegionRect` | frontend/js/library.js:4483 |
| `ocrPlaceRegionPopover` | frontend/js/library.js:4500 |
| `ocrRailKey` | frontend/js/library.js:5128 |
| `ocrReadImage` | frontend/js/library.js:6314 |
| `ocrReadInFlight` | frontend/js/library.js:3877 |
| `ocrReadMenuItems` | frontend/js/library.js:6652 |
| `ocrReadRange` | frontend/js/library.js:6440 |
| `ocrReader` | frontend/js/library.js:6156 |
| `ocrReaderName` | frontend/js/library.js:6194 |
| `ocrReaderNameFor` | frontend/js/library.js:6183 |
| `ocrRegionCrop` | frontend/js/library.js:4564 |
| `ocrRegionPage` | frontend/js/library.js:6237 |
| `ocrRegionPoint` | frontend/js/library.js:4548 |
| `ocrRegionsUrl` | frontend/js/library.js:3776 |
| `ocrRenderOtherReadings` | frontend/js/library.js:3927 |
| `ocrRenderRail` | frontend/js/library.js:5394 |
| `ocrRenderRailSwitch` | frontend/js/library.js:5310 |
| `ocrRenderRegions` | frontend/js/library.js:4002 |
| `ocrRevealRegionsForPage` | frontend/js/library.js:6265 |
| `ocrRoveKeys` | frontend/js/library.js:6769 |
| `ocrRoveSync` | frontend/js/library.js:6760 |
| `ocrRunRegion` | frontend/js/library.js:4651 |
| `ocrScrollToPage` | frontend/js/library.js:5924 |
| `ocrSelectImage` | frontend/js/library.js:4457 |
| `ocrSelectRegion` | frontend/js/library.js:3904 |
| `ocrSelectStage` | frontend/js/library.js:4453 |
| `ocrSetViewMode` | frontend/js/library.js:5802 |
| `ocrSetZoom` | frontend/js/library.js:6642 |
| `ocrShowRegionResult` | frontend/js/library.js:4585 |
| `ocrSizeStage` | frontend/js/library.js:5583 |
| `ocrStageRead` | frontend/js/library.js:6702 |
| `ocrStepPage` | frontend/js/library.js:5959 |
| `ocrStepZoom` | frontend/js/library.js:5706 |
| `ocrStopRead` | frontend/js/library.js:3884 |
| `ocrStoredPageReads` | frontend/js/library.js:4723 |
| `ocrStoredViewMode` | frontend/js/library.js:5777 |
| `ocrSyncMoreMenu` | frontend/js/library.js:6373 |
| `ocrSyncPager` | frontend/js/library.js:5938 |
| `ocrSyncReadMenu` | frontend/js/library.js:6673 |
| `ocrSyncReaderButton` | frontend/js/library.js:6115 |
| `ocrSyncStopButton` | frontend/js/library.js:3894 |
| `ocrSyncToolsMenu` | frontend/js/library.js:6584 |
| `ocrSyncViewButtons` | frontend/js/library.js:5791 |
| `ocrSyncZoomButtons` | frontend/js/library.js:5744 |
| `ocrTearDownScroll` | frontend/js/library.js:5847 |
| `ocrVisibleStages` | frontend/js/library.js:5573 |
| `ocrWatchDock` | frontend/js/library.js:6569 |
| `ocrWatchPane` | frontend/js/library.js:5632 |
| `ocrWatchScroll` | frontend/js/library.js:5899 |
| `ocrWireRegionJump` | frontend/js/library.js:6245 |
| `openBinnedNote` | frontend/js/library.js:1575 |
| `openLibraryCreatePicker` | frontend/js/library.js:2057 |
| `openLibraryItem` | frontend/js/library.js:1492 |
| `openOcrWorkspace` | frontend/js/library.js:5475 |
| `openPageReader` | frontend/js/library.js:5192 |
| `refreshLibrarySemantic` | frontend/js/library.js:412 |
| `refreshLibraryServerSearch` | frontend/js/library.js:1701 |
| `remindAbout` | frontend/js/library.js:11717 |
| `renameBookmarkGroup` | frontend/js/library.js:10226 |
| `renderBookmarkGroupChips` | frontend/js/library.js:10380 |
| `renderBookmarks` | frontend/js/library.js:10052 |
| `renderContents` | frontend/js/library.js:11425 |
| `renderLibrary` | frontend/js/library.js:487 |
| `renderLibraryContextBars` | frontend/js/library.js:1052 |
| `renderLibraryDocsPropertyFilter` | frontend/js/library.js:2950 |
| `renderLibraryDocuments` | frontend/js/library.js:3066 |
| `renderLibraryFilters` | frontend/js/library.js:292 |
| `renderLibraryImageOrigins` | frontend/js/library.js:7841 |
| `renderLibraryImagesGallery` | frontend/js/library.js:7676 |
| `renderLibraryOverview` | frontend/js/library.js:270 |
| `renderLibraryView` | frontend/js/library.js:193 |
| `renderSkillCards` | frontend/js/library.js:2488 |
| `renderSkillLogs` | frontend/js/library.js:2743 |
| `renderSkillsDashboard` | frontend/js/library.js:2591 |
| `reopenOcrWorkspace` | frontend/js/library.js:5165 |
| `runLibrarySearch` | frontend/js/library.js:1720 |
| `setEmptyBookmarkGroups` | frontend/js/library.js:10202 |
| `setLibraryCardStop` | frontend/js/library.js:1468 |
| `setLibraryMediaKind` | frontend/js/library.js:3548 |
| `setLibraryMediaView` | frontend/js/library.js:3506 |
| `showDetailDialog` | frontend/js/library.js:11668 |
| `shownTicksIn` | frontend/js/library.js:9793 |
| `skillCard` | frontend/js/library.js:2204 |
| `skillColumnCount` | frontend/js/library.js:2467 |
| `skillLastRunIndex` | frontend/js/library.js:2193 |
| `skillSort` | frontend/js/library.js:2400 |
| `startLibraryImagesPoll` | frontend/js/library.js:3415 |
| `stopLibraryImagesPoll` | frontend/js/library.js:3424 |
| `syncLibraryBoardsTicks` | frontend/js/library.js:9875 |
| `syncLibraryDocsSelectbar` | frontend/js/library.js:3327 |
| `syncLibraryFilterButton` | frontend/js/library.js:1757 |
| `syncLibraryMediaSelectbar` | frontend/js/library.js:7627 |
| `syncSelectAllLabels` | frontend/js/library.js:9797 |
| `syncSelectbarCount` | frontend/js/library.js:9770 |
| `toggleLibrarySelection` | frontend/js/library.js:1094 |
| `trackOcrRead` | frontend/js/library.js:3846 |
| `updateLibraryCreateButton` | frontend/js/library.js:2142 |
| `watchLibraryColumns` | frontend/js/library.js:473 |
| `watchSkillColumns` | frontend/js/library.js:2478 |
| `withLibraryCopyActions` | frontend/js/library.js:734 |

### frontend/js/lightbox-view.js (3)

| Name | File:line |
|---|---|
| `codeScanner` | frontend/js/lightbox-view.js:1948 |
| `highlightCodeInto` | frontend/js/lightbox-view.js:1921 |
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

### frontend/js/meetings.js (22)

| Name | File:line |
|---|---|
| `closeMeetingRecorder` | frontend/js/meetings.js:725 |
| `meetingActionRow` | frontend/js/meetings.js:215 |
| `meetingElapsedText` | frontend/js/meetings.js:537 |
| `meetingFormRow` | frontend/js/meetings.js:89 |
| `meetingNowValue` | frontend/js/meetings.js:18 |
| `meetingPeopleField` | frontend/js/meetings.js:40 |
| `meetingRecordInto` | frontend/js/meetings.js:500 |
| `meetingRemind` | frontend/js/meetings.js:256 |
| `meetingSaveTranscript` | frontend/js/meetings.js:462 |
| `meetingSummarise` | frontend/js/meetings.js:372 |
| `meetingWhenText` | frontend/js/meetings.js:29 |
| `openMeetingRecorder` | frontend/js/meetings.js:713 |
| `openMeetingSheet` | frontend/js/meetings.js:282 |
| `openNewMeeting` | frontend/js/meetings.js:108 |
| `resetMeetingUI` | frontend/js/meetings.js:692 |
| `saveMeetingDocument` | frontend/js/meetings.js:875 |
| `saveMeetingNote` | frontend/js/meetings.js:908 |
| `setMeetingState` | frontend/js/meetings.js:676 |
| `startMeetingWave` | frontend/js/meetings.js:561 |
| `stopMeetingTimer` | frontend/js/meetings.js:659 |
| `toggleMeetingPause` | frontend/js/meetings.js:847 |
| `toggleMeetingRecording` | frontend/js/meetings.js:743 |

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

### frontend/js/nav-history.js (8)

| Name | File:line |
|---|---|
| `navHistoryCaption` | frontend/js/nav-history.js:25 |
| `navHistoryGroups` | frontend/js/nav-history.js:106 |
| `navHistoryItem` | frontend/js/nav-history.js:122 |
| `navHistoryNoteTitle` | frontend/js/nav-history.js:35 |
| `navHistoryPlain` | frontend/js/nav-history.js:47 |
| `navHistoryRow` | frontend/js/nav-history.js:62 |
| `navHistoryTabIcon` | frontend/js/nav-history.js:53 |
| `renderNavHistoryMenu` | frontend/js/nav-history.js:177 |

### frontend/js/note-edit-panels.js (10)

| Name | File:line |
|---|---|
| `closeNoteForm` | frontend/js/note-edit-panels.js:565 |
| `forgetNoteEditLocally` | frontend/js/note-edit-panels.js:592 |
| `keepNoteEditLocally` | frontend/js/note-edit-panels.js:588 |
| `noteEditToolbar` | frontend/js/note-edit-panels.js:662 |
| `noteFormParts` | frontend/js/note-edit-panels.js:198 |
| `offerKeptNoteEdit` | frontend/js/note-edit-panels.js:599 |
| `openBookmarkAttachPicker` | frontend/js/note-edit-panels.js:175 |
| `renderEditForm` | frontend/js/note-edit-panels.js:212 |
| `renderNoteBookmarksWhileEditing` | frontend/js/note-edit-panels.js:83 |
| `renderRelatedWhileEditing` | frontend/js/note-edit-panels.js:26 |

### frontend/js/note-history.js (3)

| Name | File:line |
|---|---|
| `openEntryHistory` | frontend/js/note-history.js:8 |
| `toggleThenAndNow` | frontend/js/note-history.js:229 |
| `undoSkillRun` | frontend/js/note-history.js:301 |

### frontend/js/note-panels.js (8)

| Name | File:line |
|---|---|
| `beginOrCompleteLink` | frontend/js/note-panels.js:335 |
| `notePanelStillOpen` | frontend/js/note-panels.js:46 |
| `similarNoteRow` | frontend/js/note-panels.js:280 |
| `toggleFaded` | frontend/js/note-panels.js:111 |
| `toggleNotePanel` | frontend/js/note-panels.js:36 |
| `toggleNoteReminders` | frontend/js/note-panels.js:162 |
| `toggleReferences` | frontend/js/note-panels.js:205 |
| `toggleRelated` | frontend/js/note-panels.js:51 |

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

### frontend/js/ocr-engine.js (8)

| Name | File:line |
|---|---|
| `ocrEngineFollow` | frontend/js/ocr-engine.js:265 |
| `ocrEngineLanguageName` | frontend/js/ocr-engine.js:71 |
| `ocrEngineLanguagePicker` | frontend/js/ocr-engine.js:187 |
| `ocrEngineMount` | frontend/js/ocr-engine.js:36 |
| `ocrEnginePaint` | frontend/js/ocr-engine.js:78 |
| `ocrEnginePaintAll` | frontend/js/ocr-engine.js:60 |
| `ocrEngineStartInstall` | frontend/js/ocr-engine.js:238 |
| `ocrEngineStatusLine` | frontend/js/ocr-engine.js:175 |

### frontend/js/onboarding.js (8)

| Name | File:line |
|---|---|
| `closeOnboarding` | frontend/js/onboarding.js:268 |
| `loadOnboardingDiagnostics` | frontend/js/onboarding.js:68 |
| `maybeShowConsoleViewIntro` | frontend/js/onboarding.js:321 |
| `onboardingBack` | frontend/js/onboarding.js:303 |
| `onboardingNext` | frontend/js/onboarding.js:283 |
| `openOnboarding` | frontend/js/onboarding.js:260 |
| `renderOnboardingActions` | frontend/js/onboarding.js:129 |
| `renderOnboardingSlide` | frontend/js/onboarding.js:202 |

### frontend/js/pick-row.js (3)

| Name | File:line |
|---|---|
| `notePickerRow` | frontend/js/pick-row.js:7 |
| `notePickerThumb` | frontend/js/pick-row.js:64 |
| `updateNotePickerCount` | frontend/js/pick-row.js:79 |

### frontend/js/questions-view.js (5)

| Name | File:line |
|---|---|
| `initQuestionsView` | frontend/js/questions-view.js:102 |
| `loadQuestions` | frontend/js/questions-view.js:71 |
| `questionButton` | frontend/js/questions-view.js:19 |
| `questionRow` | frontend/js/questions-view.js:25 |
| `questionWhen` | frontend/js/questions-view.js:14 |

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

### frontend/js/quick-note.js (22)

| Name | File:line |
|---|---|
| `clearQuickNote` | frontend/js/quick-note.js:244 |
| `clipPastedLink` | frontend/js/quick-note.js:326 |
| `createNoteSafely` | frontend/js/quick-note.js:74 |
| `flushNoteOutbox` | frontend/js/quick-note.js:96 |
| `keepQuickNoteDraft` | frontend/js/quick-note.js:234 |
| `newNoteClientKey` | frontend/js/quick-note.js:54 |
| `noteOutbox` | frontend/js/quick-note.js:30 |
| `noteOutboxAdd` | frontend/js/quick-note.js:64 |
| `noteServerGone` | frontend/js/quick-note.js:59 |
| `openQuickNote` | frontend/js/quick-note.js:208 |
| `pasteClipboardAsNote` | frontend/js/quick-note.js:390 |
| `quickNoteBox` | frontend/js/quick-note.js:198 |
| `quickNoteStatus` | frontend/js/quick-note.js:202 |
| `quickNoteToCapture` | frontend/js/quick-note.js:304 |
| `reminderFromChatAnswer` | frontend/js/quick-note.js:456 |
| `renderNoteOutbox` | frontend/js/quick-note.js:139 |
| `renderPendingNoteRows` | frontend/js/quick-note.js:157 |
| `returnNoteToCapture` | frontend/js/quick-note.js:129 |
| `saveChatAnswerAsNote` | frontend/js/quick-note.js:429 |
| `saveQuickNote` | frontend/js/quick-note.js:251 |
| `scheduleNoteOutboxFlush` | frontend/js/quick-note.js:88 |
| `writeNoteOutbox` | frontend/js/quick-note.js:42 |

### frontend/js/reveal-targets.js (13)

| Name | File:line |
|---|---|
| `revealBoard` | frontend/js/reveal-targets.js:155 |
| `revealBoardsGallery` | frontend/js/reveal-targets.js:521 |
| `revealDashWidget` | frontend/js/reveal-targets.js:174 |
| `revealDetails` | frontend/js/reveal-targets.js:65 |
| `revealDocument` | frontend/js/reveal-targets.js:145 |
| `revealEntryMenu` | frontend/js/reveal-targets.js:82 |
| `revealFeature` | frontend/js/reveal-targets.js:534 |
| `revealGraphOptions` | frontend/js/reveal-targets.js:135 |
| `revealLibrarySub` | frontend/js/reveal-targets.js:530 |
| `revealQuery` | frontend/js/reveal-targets.js:72 |
| `revealStrip` | frontend/js/reveal-targets.js:127 |
| `revealSubmenuFor` | frontend/js/reveal-targets.js:109 |
| `revealWait` | frontend/js/reveal-targets.js:45 |

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
| `addMemoryByHand` | frontend/js/settings-controls.js:1539 |
| `addPersona` | frontend/js/settings-controls.js:1175 |
| `addSkill` | frontend/js/settings-controls.js:1773 |
| `addTemplate` | frontend/js/settings-controls.js:1365 |
| `applyBackendChoice` | frontend/js/settings-controls.js:1107 |
| `applyChatModel` | frontend/js/settings-controls.js:1289 |
| `applyOcrModel` | frontend/js/settings-controls.js:1305 |
| `applyUtilityModel` | frontend/js/settings-controls.js:1324 |
| `applyVisionModel` | frontend/js/settings-controls.js:1343 |
| `chosenSkillTools` | frontend/js/settings-controls.js:1835 |
| `chosenSkillVerify` | frontend/js/settings-controls.js:1814 |
| `deleteProfile` | frontend/js/settings-controls.js:1728 |
| `exportFullBackup` | frontend/js/settings-controls.js:1716 |
| `findDuplicates` | frontend/js/settings-controls.js:1497 |
| `mergeDuplicateGroup` | frontend/js/settings-controls.js:1618 |
| `mergeNamedPrompts` | frontend/js/settings-controls.js:1741 |
| `refreshSearxngHost` | frontend/js/settings-controls.js:989 |
| `renderDuplicateGroups` | frontend/js/settings-controls.js:1560 |
| `renderLanAccess` | frontend/js/settings-controls.js:2008 |
| `renderLanState` | frontend/js/settings-controls.js:1968 |
| `renderMcpSnippet` | frontend/js/settings-controls.js:1944 |
| `renderStatusBarSettings` | frontend/js/settings-controls.js:1888 |
| `resetAllFeatureModels` | frontend/js/settings-controls.js:1272 |
| `restartMemoryMap` | frontend/js/settings-controls.js:1473 |
| `restoreFullBackup` | frontend/js/settings-controls.js:1679 |
| `runEmbeddingFallback` | frontend/js/settings-controls.js:1208 |
| `saveExportSaveDir` | frontend/js/settings-controls.js:1522 |
| `saveModelContextWindow` | frontend/js/settings-controls.js:1142 |
| `saveRunBudget` | frontend/js/settings-controls.js:1403 |
| `saveWebSearchSettings` | frontend/js/settings-controls.js:1440 |

### frontend/js/settings-data.js (13)

| Name | File:line |
|---|---|
| `backupNow` | frontend/js/settings-data.js:256 |
| `humanBytes` | frontend/js/settings-data.js:206 |
| `importDirectory` | frontend/js/settings-data.js:267 |
| `importDocument` | frontend/js/settings-data.js:362 |
| `importMarkdown` | frontend/js/settings-data.js:307 |
| `privacyDestinationRow` | frontend/js/settings-data.js:13 |
| `privacyWhen` | frontend/js/settings-data.js:8 |
| `renderBackupRetention` | frontend/js/settings-data.js:244 |
| `renderBackups` | frontend/js/settings-data.js:142 |
| `renderPrivacyRange` | frontend/js/settings-data.js:42 |
| `renderPrivacyReceipt` | frontend/js/settings-data.js:91 |
| `renderStorageSpaceNotice` | frontend/js/settings-data.js:225 |
| `undoImport` | frontend/js/settings-data.js:290 |

### frontend/js/settings-find.js (29)

| Name | File:line |
|---|---|
| `findSettings` | frontend/js/settings-find.js:77 |
| `helpAlternation` | frontend/js/settings-find.js:511 |
| `helpApplySearch` | frontend/js/settings-find.js:618 |
| `helpEmphasis` | frontend/js/settings-find.js:517 |
| `helpFill` | frontend/js/settings-find.js:538 |
| `helpMarks` | frontend/js/settings-find.js:551 |
| `helpMatches` | frontend/js/settings-find.js:609 |
| `helpQueryTerms` | frontend/js/settings-find.js:605 |
| `helpSearchBind` | frontend/js/settings-find.js:659 |
| `helpTopicLink` | frontend/js/settings-find.js:480 |
| `helpTopicPaint` | frontend/js/settings-find.js:565 |
| `helpTopicRow` | frontend/js/settings-find.js:579 |
| `openSettingRow` | frontend/js/settings-find.js:124 |
| `renderHelpTopics` | frontend/js/settings-find.js:674 |
| `renderSettingResults` | frontend/js/settings-find.js:145 |
| `settingResultsKey` | frontend/js/settings-find.js:171 |
| `settingRowText` | frontend/js/settings-find.js:33 |
| `settingRows` | frontend/js/settings-find.js:45 |
| `settingsIndexBuild` | frontend/js/settings-find.js:359 |
| `settingsIndexClear` | frontend/js/settings-find.js:325 |
| `settingsIndexGo` | frontend/js/settings-find.js:242 |
| `settingsIndexHeads` | frontend/js/settings-find.js:203 |
| `settingsIndexJump` | frontend/js/settings-find.js:334 |
| `settingsIndexList` | frontend/js/settings-find.js:234 |
| `settingsIndexMark` | frontend/js/settings-find.js:293 |
| `settingsIndexOffset` | frontend/js/settings-find.js:228 |
| `settingsIndexWatchSection` | frontend/js/settings-find.js:448 |
| `settingsNavFollow` | frontend/js/settings-find.js:270 |
| `settingsPaneTitleHead` | frontend/js/settings-find.js:220 |

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
| `packagesBulk` | frontend/js/settings-packages.js:431 |
| `packagesBulkFromBar` | frontend/js/settings-packages.js:477 |
| `packagesCan` | frontend/js/settings-packages.js:105 |
| `packagesInstallOne` | frontend/js/settings-packages.js:380 |
| `packagesPost` | frontend/js/settings-packages.js:417 |
| `packagesReinstallOne` | frontend/js/settings-packages.js:397 |
| `packagesRemoveOne` | frontend/js/settings-packages.js:407 |
| `packagesRenderBundles` | frontend/js/settings-packages.js:114 |
| `packagesRow` | frontend/js/settings-packages.js:231 |
| `packagesRowMenu` | frontend/js/settings-packages.js:359 |
| `packagesStatusLine` | frontend/js/settings-packages.js:90 |
| `packagesSyncBar` | frontend/js/settings-packages.js:456 |
| `renderEmbedModels` | frontend/js/settings-packages.js:499 |
| `renderExtras` | frontend/js/settings-packages.js:30 |

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

### frontend/js/tag-manager.js (28)

| Name | File:line |
|---|---|
| `chooseTagSheet` | frontend/js/tag-manager.js:99 |
| `drawManageSuggestions` | frontend/js/tag-manager.js:333 |
| `drawTagFooter` | frontend/js/tag-manager.js:645 |
| `drawTagRows` | frontend/js/tag-manager.js:520 |
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
| `openBulkTags` | frontend/js/tag-manager.js:674 |
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
| `wireTagKeys` | frontend/js/tag-manager.js:611 |

### frontend/js/tag-suggest.js (6)

| Name | File:line |
|---|---|
| `closeTagSuggest` | frontend/js/tag-suggest.js:25 |
| `fillTagSuggest` | frontend/js/tag-suggest.js:58 |
| `openTagSuggest` | frontend/js/tag-suggest.js:128 |
| `placeTagSuggest` | frontend/js/tag-suggest.js:39 |
| `tagSuggestToken` | frontend/js/tag-suggest.js:19 |
| `takeTagSuggest` | frontend/js/tag-suggest.js:113 |

### frontend/js/tidy.js (19)

| Name | File:line |
|---|---|
| `openTidySheet` | frontend/js/tidy.js:82 |
| `tidyAfterChange` | frontend/js/tidy.js:520 |
| `tidyApply` | frontend/js/tidy.js:482 |
| `tidyApplyWords` | frontend/js/tidy.js:476 |
| `tidyBadge` | frontend/js/tidy.js:35 |
| `tidyCounts` | frontend/js/tidy.js:189 |
| `tidyFoot` | frontend/js/tidy.js:427 |
| `tidyHead` | frontend/js/tidy.js:152 |
| `tidyHistory` | frontend/js/tidy.js:538 |
| `tidyOverview` | frontend/js/tidy.js:259 |
| `tidyOverviewDraw` | frontend/js/tidy.js:208 |
| `tidyOverviewRow` | frontend/js/tidy.js:217 |
| `tidyRow` | frontend/js/tidy.js:383 |
| `tidyRows` | frontend/js/tidy.js:370 |
| `tidyRunLinkReasons` | frontend/js/tidy.js:529 |
| `tidyShow` | frontend/js/tidy.js:270 |
| `tidyTitle` | frontend/js/tidy.js:198 |
| `tidyTools` | frontend/js/tidy.js:310 |
| `tidyWatchList` | frontend/js/tidy.js:59 |

### frontend/js/tour.js (46)

| Name | File:line |
|---|---|
| `openTour` | frontend/js/tour.js:1735 |
| `renderTourReplay` | frontend/js/tour.js:1918 |
| `tourActiveTab` | frontend/js/tour.js:1243 |
| `tourAnchorFor` | frontend/js/tour.js:629 |
| `tourBack` | frontend/js/tour.js:1815 |
| `tourBlockPanels` | frontend/js/tour.js:930 |
| `tourBringIntoView` | frontend/js/tour.js:1039 |
| `tourCandidates` | frontend/js/tour.js:843 |
| `tourChoose` | frontend/js/tour.js:898 |
| `tourClamp` | frontend/js/tour.js:825 |
| `tourClearSpotlight` | frontend/js/tour.js:986 |
| `tourClearTheWay` | frontend/js/tour.js:1331 |
| `tourClose` | frontend/js/tour.js:1775 |
| `tourContext` | frontend/js/tour.js:1465 |
| `tourCovered` | frontend/js/tour.js:677 |
| `tourDisable` | frontend/js/tour.js:1956 |
| `tourFrame` | frontend/js/tour.js:1225 |
| `tourLibraryView` | frontend/js/tour.js:1399 |
| `tourNavigate` | frontend/js/tour.js:1371 |
| `tourNext` | frontend/js/tour.js:1804 |
| `tourOnScreen` | frontend/js/tour.js:645 |
| `tourOpenFoldsAround` | frontend/js/tour.js:1432 |
| `tourOpenSettings` | frontend/js/tour.js:1447 |
| `tourOrigin` | frontend/js/tour.js:809 |
| `tourOverlap` | frontend/js/tour.js:832 |
| `tourPinShell` | frontend/js/tour.js:1557 |
| `tourPlaceFixed` | frontend/js/tour.js:728 |
| `tourPosition` | frontend/js/tour.js:1078 |
| `tourPrepareSection` | frontend/js/tour.js:1491 |
| `tourReflow` | frontend/js/tour.js:1889 |
| `tourRender` | frontend/js/tour.js:1161 |
| `tourResolve` | frontend/js/tour.js:704 |
| `tourSectionPlace` | frontend/js/tour.js:1212 |
| `tourSheetPlace` | frontend/js/tour.js:1143 |
| `tourShow` | frontend/js/tour.js:1616 |
| `tourSpotlight` | frontend/js/tour.js:1012 |
| `tourStep` | frontend/js/tour.js:1524 |
| `tourStepsFor` | frontend/js/tour.js:1714 |
| `tourStrand` | frontend/js/tour.js:1540 |
| `tourUsable` | frontend/js/tour.js:714 |
| `tourVerifyCard` | frontend/js/tour.js:1570 |
| `tourVisible` | frontend/js/tour.js:603 |
| `tourWaitForTarget` | frontend/js/tour.js:1293 |
| `tourWatch` | frontend/js/tour.js:776 |
| `tourWatchFrame` | frontend/js/tour.js:781 |
| `tourWhiteboard` | frontend/js/tour.js:1411 |

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
| `applyUpdateNow` | frontend/js/update-dialogs.js:124 |
| `askUpdateChoiceOnce` | frontend/js/update-dialogs.js:81 |
| `checkForUpdate` | frontend/js/update-dialogs.js:18 |
| `showSourceUpdatedDialog` | frontend/js/update-dialogs.js:234 |
| `showUpdateAvailableDialog` | frontend/js/update-dialogs.js:142 |

### frontend/js/usage-ledger.js (5)

| Name | File:line |
|---|---|
| `applySimpleMode` | frontend/js/usage-ledger.js:53 |
| `renderCaptureCommand` | frontend/js/usage-ledger.js:72 |
| `renderSimpleMode` | frontend/js/usage-ledger.js:65 |
| `renderUsage` | frontend/js/usage-ledger.js:31 |
| `usageLabels` | frontend/js/usage-ledger.js:18 |

### frontend/js/vault-unlock.js (2)

| Name | File:line |
|---|---|
| `ensureVaultOpen` | frontend/js/vault-unlock.js:32 |
| `unlockPrivateNotes` | frontend/js/vault-unlock.js:11 |

### frontend/js/web-clip.js (2)

| Name | File:line |
|---|---|
| `renderWebClip` | frontend/js/web-clip.js:31 |
| `webClipBookmarklet` | frontend/js/web-clip.js:15 |

### frontend/js/whiteboard-commands.js (17)

| Name | File:line |
|---|---|
| `renderWbShortcutSheet` | frontend/js/whiteboard-commands.js:278 |
| `wbClickId` | frontend/js/whiteboard-commands.js:86 |
| `wbCloseHelpSheet` | frontend/js/whiteboard-commands.js:465 |
| `wbCommandApplies` | frontend/js/whiteboard-commands.js:204 |
| `wbCommandMenuRow` | frontend/js/whiteboard-commands.js:243 |
| `wbCommandOneSketch` | frontend/js/whiteboard-commands.js:37 |
| `wbCommandSelectionCount` | frontend/js/whiteboard-commands.js:32 |
| `wbCommandTextTarget` | frontend/js/whiteboard-commands.js:43 |
| `wbCommandsLive` | frontend/js/whiteboard-commands.js:251 |
| `wbHelpRows` | frontend/js/whiteboard-commands.js:387 |
| `wbHelpSections` | frontend/js/whiteboard-commands.js:398 |
| `wbOpenHelpSheet` | frontend/js/whiteboard-commands.js:453 |
| `wbPaletteCommands` | frontend/js/whiteboard-commands.js:265 |
| `wbRenderHelpSheet` | frontend/js/whiteboard-commands.js:404 |
| `wbRunCommand` | frontend/js/whiteboard-commands.js:214 |
| `wbSyncCommandRows` | frontend/js/whiteboard-commands.js:301 |
| `wbTool` | frontend/js/whiteboard-commands.js:87 |

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
| `wbFormatCommandButtons` | frontend/js/whiteboard-format.js:366 |
| `wbFormatIsOpen` | frontend/js/whiteboard-format.js:233 |
| `wbFormatOpen` | frontend/js/whiteboard-format.js:238 |
| `wbFormatPanel` | frontend/js/whiteboard-format.js:229 |
| `wbFormatSync` | frontend/js/whiteboard-format.js:282 |
| `wbFormatSyncSoon` | frontend/js/whiteboard-format.js:272 |
| `wbFormatToggle` | frontend/js/whiteboard-format.js:265 |
| `wbSetLinkRoute` | frontend/js/whiteboard-format.js:215 |

### frontend/js/whiteboard-history.js (10)

| Name | File:line |
|---|---|
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

### frontend/js/whiteboard-interchange.js (16)

| Name | File:line |
|---|---|
| `wbBoardOutline` | frontend/js/whiteboard-interchange.js:323 |
| `wbBoardRowsFromSvg` | frontend/js/whiteboard-interchange.js:371 |
| `wbBoardSvgMetadata` | frontend/js/whiteboard-interchange.js:365 |
| `wbBoardToMermaid` | frontend/js/whiteboard-interchange.js:42 |
| `wbCardTitleForExport` | frontend/js/whiteboard-interchange.js:511 |
| `wbExportMermaid` | frontend/js/whiteboard-interchange.js:530 |
| `wbExportOutline` | frontend/js/whiteboard-interchange.js:540 |
| `wbExportRows` | frontend/js/whiteboard-interchange.js:387 |
| `wbImportBoardRows` | frontend/js/whiteboard-interchange.js:420 |
| `wbImportMermaid` | frontend/js/whiteboard-interchange.js:457 |
| `wbImportText` | frontend/js/whiteboard-interchange.js:557 |
| `wbMermaidFrameOf` | frontend/js/whiteboard-interchange.js:518 |
| `wbMermaidLayout` | frontend/js/whiteboard-interchange.js:209 |
| `wbMermaidParse` | frontend/js/whiteboard-interchange.js:110 |
| `wbMermaidText` | frontend/js/whiteboard-interchange.js:33 |
| `wbOpenImportDialog` | frontend/js/whiteboard-interchange.js:548 |

### frontend/js/whiteboard-library.js (71)

| Name | File:line |
|---|---|
| `wbCloseSidebar` | frontend/js/whiteboard-library.js:115 |
| `wbLayerButton` | frontend/js/whiteboard-library.js:1461 |
| `wbLayerEntry` | frontend/js/whiteboard-library.js:1552 |
| `wbLayerFocus` | frontend/js/whiteboard-library.js:1558 |
| `wbLayerIcon` | frontend/js/whiteboard-library.js:1541 |
| `wbLayerName` | frontend/js/whiteboard-library.js:1414 |
| `wbLayerRename` | frontend/js/whiteboard-library.js:1623 |
| `wbLayerRestack` | frontend/js/whiteboard-library.js:1651 |
| `wbLayerRows` | frontend/js/whiteboard-library.js:1419 |
| `wbLayerSelect` | frontend/js/whiteboard-library.js:1566 |
| `wbLayerToggleHidden` | frontend/js/whiteboard-library.js:1597 |
| `wbLayerToggleLock` | frontend/js/whiteboard-library.js:1610 |
| `wbLibAnnounceCount` | frontend/js/whiteboard-library.js:481 |
| `wbLibApplyPalette` | frontend/js/whiteboard-library.js:730 |
| `wbLibApplyStyle` | frontend/js/whiteboard-library.js:715 |
| `wbLibBranchOf` | frontend/js/whiteboard-library.js:1058 |
| `wbLibCentre` | frontend/js/whiteboard-library.js:518 |
| `wbLibContentBox` | frontend/js/whiteboard-library.js:536 |
| `wbLibCreate` | frontend/js/whiteboard-library.js:939 |
| `wbLibDelete` | frontend/js/whiteboard-library.js:852 |
| `wbLibDuplicate` | frontend/js/whiteboard-library.js:841 |
| `wbLibEmptyYours` | frontend/js/whiteboard-library.js:472 |
| `wbLibEntries` | frontend/js/whiteboard-library.js:204 |
| `wbLibExport` | frontend/js/whiteboard-library.js:1122 |
| `wbLibFits` | frontend/js/whiteboard-library.js:278 |
| `wbLibGrabPoint` | frontend/js/whiteboard-library.js:566 |
| `wbLibGroup` | frontend/js/whiteboard-library.js:361 |
| `wbLibIconEntry` | frontend/js/whiteboard-library.js:228 |
| `wbLibImportFile` | frontend/js/whiteboard-library.js:1133 |
| `wbLibInk` | frontend/js/whiteboard-library.js:507 |
| `wbLibMenuItems` | frontend/js/whiteboard-library.js:763 |
| `wbLibMove` | frontend/js/whiteboard-library.js:847 |
| `wbLibNewBoardFrom` | frontend/js/whiteboard-library.js:699 |
| `wbLibNewLibrary` | frontend/js/whiteboard-library.js:1152 |
| `wbLibOpenMenu` | frontend/js/whiteboard-library.js:803 |
| `wbLibPanelMenu` | frontend/js/whiteboard-library.js:1159 |
| `wbLibPlace` | frontend/js/whiteboard-library.js:598 |
| `wbLibRefBody` | frontend/js/whiteboard-library.js:588 |
| `wbLibRename` | frontend/js/whiteboard-library.js:824 |
| `wbLibReplace` | frontend/js/whiteboard-library.js:862 |
| `wbLibSelectionPayload` | frontend/js/whiteboard-library.js:875 |
| `wbLibSetActive` | frontend/js/whiteboard-library.js:487 |
| `wbLibTags` | frontend/js/whiteboard-library.js:831 |
| `wbLibThumb` | frontend/js/whiteboard-library.js:288 |
| `wbLibTile` | frontend/js/whiteboard-library.js:331 |
| `wbLibToggleFavourite` | frontend/js/whiteboard-library.js:810 |
| `wbLibVisibleTiles` | frontend/js/whiteboard-library.js:501 |
| `wbLoadIcons` | frontend/js/whiteboard-library.js:191 |
| `wbLoadLibrary` | frontend/js/whiteboard-library.js:161 |
| `wbOpenSidebar` | frontend/js/whiteboard-library.js:63 |
| `wbOpenStickerPicker` | frontend/js/whiteboard-library.js:267 |
| `wbPageFocus` | frontend/js/whiteboard-library.js:1811 |
| `wbPageGo` | frontend/js/whiteboard-library.js:1821 |
| `wbPageMove` | frontend/js/whiteboard-library.js:1833 |
| `wbPagePresent` | frontend/js/whiteboard-library.js:1851 |
| `wbPlaceSticker` | frontend/js/whiteboard-library.js:245 |
| `wbRenderLayers` | frontend/js/whiteboard-library.js:1474 |
| `wbRenderLibrary` | frontend/js/whiteboard-library.js:393 |
| `wbRenderPages` | frontend/js/whiteboard-library.js:1771 |
| `wbRenderSideMap` | frontend/js/whiteboard-library.js:153 |
| `wbSaveBoardAsTemplate` | frontend/js/whiteboard-library.js:1086 |
| `wbSaveBranchToLibrary` | frontend/js/whiteboard-library.js:1072 |
| `wbSavePaletteToLibrary` | frontend/js/whiteboard-library.js:1016 |
| `wbSavePresetToLibrary` | frontend/js/whiteboard-library.js:1036 |
| `wbSaveSelectionToLibrary` | frontend/js/whiteboard-library.js:954 |
| `wbSaveShapeToLibrary` | frontend/js/whiteboard-library.js:968 |
| `wbSaveSideState` | frontend/js/whiteboard-library.js:53 |
| `wbSaveStyleToLibrary` | frontend/js/whiteboard-library.js:994 |
| `wbSideRefreshSoon` | frontend/js/whiteboard-library.js:1939 |
| `wbSideState` | frontend/js/whiteboard-library.js:48 |
| `wbSyncSidebarKind` | frontend/js/whiteboard-library.js:134 |

### frontend/js/whiteboard-map.js (292)

| Name | File:line |
|---|---|
| `mapPaletteCommands` | frontend/js/whiteboard-map.js:4382 |
| `wbApplyMapFont` | frontend/js/whiteboard-map.js:325 |
| `wbBuildMapNode` | frontend/js/whiteboard-map.js:1627 |
| `wbClearMapNodeSizeCache` | frontend/js/whiteboard-map.js:3015 |
| `wbCloseMapLinkRadial` | frontend/js/whiteboard-map.js:7445 |
| `wbCloseMapRadial` | frontend/js/whiteboard-map.js:7009 |
| `wbColourChannels` | frontend/js/whiteboard-map.js:1971 |
| `wbCoreInkFor` | frontend/js/whiteboard-map.js:2003 |
| `wbDismissMapTemplates` | frontend/js/whiteboard-map.js:1321 |
| `wbFitMapRadialBand` | frontend/js/whiteboard-map.js:6813 |
| `wbForgetMapNodeSize` | frontend/js/whiteboard-map.js:3049 |
| `wbIndexMapNodeElements` | frontend/js/whiteboard-map.js:3032 |
| `wbInfoDialog` | frontend/js/whiteboard-map.js:1189 |
| `wbIsMap` | frontend/js/whiteboard-map.js:99 |
| `wbMapAccentInk` | frontend/js/whiteboard-map.js:1996 |
| `wbMapAddChild` | frontend/js/whiteboard-map.js:4178 |
| `wbMapAddReference` | frontend/js/whiteboard-map.js:4548 |
| `wbMapAddRootAt` | frontend/js/whiteboard-map.js:4519 |
| `wbMapAddSibling` | frontend/js/whiteboard-map.js:4579 |
| `wbMapAdoptProvisional` | frontend/js/whiteboard-map.js:4465 |
| `wbMapAfterRender` | frontend/js/whiteboard-map.js:9072 |
| `wbMapAgeBucket` | frontend/js/whiteboard-map.js:486 |
| `wbMapAskStructureWords` | frontend/js/whiteboard-map.js:8161 |
| `wbMapBraceGeometry` | frontend/js/whiteboard-map.js:8030 |
| `wbMapBranchBox` | frontend/js/whiteboard-map.js:7988 |
| `wbMapBranchDragOrigin` | frontend/js/whiteboard-map.js:2642 |
| `wbMapBySiblingOrder` | frontend/js/whiteboard-map.js:1374 |
| `wbMapCatchTypeahead` | frontend/js/whiteboard-map.js:4147 |
| `wbMapChooseMarkerFilter` | frontend/js/whiteboard-map.js:9021 |
| `wbMapClearDropTarget` | frontend/js/whiteboard-map.js:2696 |
| `wbMapClearEveryTopic` | frontend/js/whiteboard-map.js:915 |
| `wbMapClearFocus` | frontend/js/whiteboard-map.js:707 |
| `wbMapClearLinkCue` | frontend/js/whiteboard-map.js:2945 |
| `wbMapClearToOneTopic` | frontend/js/whiteboard-map.js:4806 |
| `wbMapCloseMarkers` | frontend/js/whiteboard-map.js:8830 |
| `wbMapCloseNote` | frontend/js/whiteboard-map.js:2273 |
| `wbMapCloudD` | frontend/js/whiteboard-map.js:8011 |
| `wbMapColors` | frontend/js/whiteboard-map.js:1465 |
| `wbMapConcealed` | frontend/js/whiteboard-map.js:689 |
| `wbMapCopyBranch` | frontend/js/whiteboard-map.js:7130 |
| `wbMapCreateNode` | frontend/js/whiteboard-map.js:4090 |
| `wbMapCrossLinkInfo` | frontend/js/whiteboard-map.js:7459 |
| `wbMapCrossLinkLook` | frontend/js/whiteboard-map.js:5591 |
| `wbMapCrossLinkToBranch` | frontend/js/whiteboard-map.js:7777 |
| `wbMapCrossLinkType` | frontend/js/whiteboard-map.js:5650 |
| `wbMapCubicAt` | frontend/js/whiteboard-map.js:3317 |
| `wbMapCutCrossLink` | frontend/js/whiteboard-map.js:7799 |
| `wbMapDeleteEmptiesMap` | frontend/js/whiteboard-map.js:4784 |
| `wbMapDeleteSubtree` | frontend/js/whiteboard-map.js:4832 |
| `wbMapDrawn` | frontend/js/whiteboard-map.js:303 |
| `wbMapDropTargetAt` | frontend/js/whiteboard-map.js:2661 |
| `wbMapDueRow` | frontend/js/whiteboard-map.js:8786 |
| `wbMapDueWords` | frontend/js/whiteboard-map.js:8705 |
| `wbMapDuplicateTopic` | frontend/js/whiteboard-map.js:4608 |
| `wbMapEdgeAnchors` | frontend/js/whiteboard-map.js:3063 |
| `wbMapEdgeApply` | frontend/js/whiteboard-map.js:3797 |
| `wbMapEdgeContext` | frontend/js/whiteboard-map.js:3448 |
| `wbMapEdgeCubic` | frontend/js/whiteboard-map.js:3166 |
| `wbMapEdgeElbowTurn` | frontend/js/whiteboard-map.js:3194 |
| `wbMapEdgeElement` | frontend/js/whiteboard-map.js:3677 |
| `wbMapEdgeFractions` | frontend/js/whiteboard-map.js:3132 |
| `wbMapEdgeGeometry` | frontend/js/whiteboard-map.js:3618 |
| `wbMapEdgeHandlePoint` | frontend/js/whiteboard-map.js:3211 |
| `wbMapEdgeHasArrow` | frontend/js/whiteboard-map.js:3310 |
| `wbMapEdgeIsRibbon` | frontend/js/whiteboard-map.js:3421 |
| `wbMapEdgePathD` | frontend/js/whiteboard-map.js:3223 |
| `wbMapEdgePlusButton` | frontend/js/whiteboard-map.js:3951 |
| `wbMapEdgePlusPoint` | frontend/js/whiteboard-map.js:3850 |
| `wbMapEdgeWaypoint` | frontend/js/whiteboard-map.js:3107 |
| `wbMapEdgeWeight` | frontend/js/whiteboard-map.js:3297 |
| `wbMapEdgesFor` | frontend/js/whiteboard-map.js:3469 |
| `wbMapEditLink` | frontend/js/whiteboard-map.js:6527 |
| `wbMapEditNode` | frontend/js/whiteboard-map.js:4726 |
| `wbMapEditPicture` | frontend/js/whiteboard-map.js:6572 |
| `wbMapEndStudy` | frontend/js/whiteboard-map.js:8364 |
| `wbMapExpandAll` | frontend/js/whiteboard-map.js:2580 |
| `wbMapFacets` | frontend/js/whiteboard-map.js:471 |
| `wbMapFillOf` | frontend/js/whiteboard-map.js:275 |
| `wbMapFills` | frontend/js/whiteboard-map.js:1516 |
| `wbMapFocusHidden` | frontend/js/whiteboard-map.js:643 |
| `wbMapFoldToLevel` | frontend/js/whiteboard-map.js:2602 |
| `wbMapFontStack` | frontend/js/whiteboard-map.js:321 |
| `wbMapFreshPlace` | frontend/js/whiteboard-map.js:4434 |
| `wbMapFromDocument` | frontend/js/whiteboard-map.js:9130 |
| `wbMapGapBreadth` | frontend/js/whiteboard-map.js:77 |
| `wbMapGapDepth` | frontend/js/whiteboard-map.js:80 |
| `wbMapHeadingsOutline` | frontend/js/whiteboard-map.js:9095 |
| `wbMapHidden` | frontend/js/whiteboard-map.js:1540 |
| `wbMapIconOption` | frontend/js/whiteboard-map.js:6082 |
| `wbMapIndex` | frontend/js/whiteboard-map.js:1340 |
| `wbMapInlineText` | frontend/js/whiteboard-map.js:1579 |
| `wbMapInsertBetween` | frontend/js/whiteboard-map.js:4008 |
| `wbMapIsFollow` | frontend/js/whiteboard-map.js:5895 |
| `wbMapJoinByLink` | frontend/js/whiteboard-map.js:2872 |
| `wbMapJoinPlan` | frontend/js/whiteboard-map.js:2886 |
| `wbMapKeyBetween` | frontend/js/whiteboard-map.js:1387 |
| `wbMapLabel` | frontend/js/whiteboard-map.js:1555 |
| `wbMapLabelEdge` | frontend/js/whiteboard-map.js:7314 |
| `wbMapLayout` | frontend/js/whiteboard-map.js:103 |
| `wbMapLevelLook` | frontend/js/whiteboard-map.js:267 |
| `wbMapLevelLooks` | frontend/js/whiteboard-map.js:253 |
| `wbMapLevelOf` | frontend/js/whiteboard-map.js:249 |
| `wbMapLevels` | frontend/js/whiteboard-map.js:232 |
| `wbMapLinkCue` | frontend/js/whiteboard-map.js:2924 |
| `wbMapLiveDatum` | frontend/js/whiteboard-map.js:1615 |
| `wbMapMarkerGlyph` | frontend/js/whiteboard-map.js:8874 |
| `wbMapMarkerKeyWords` | frontend/js/whiteboard-map.js:9002 |
| `wbMapMarkerKeys` | frontend/js/whiteboard-map.js:8991 |
| `wbMapMarkerParts` | frontend/js/whiteboard-map.js:8692 |
| `wbMapMarkerSeg` | frontend/js/whiteboard-map.js:8843 |
| `wbMapMarkerWords` | frontend/js/whiteboard-map.js:8722 |
| `wbMapMarkersInUse` | frontend/js/whiteboard-map.js:9012 |
| `wbMapMoveAmongSiblings` | frontend/js/whiteboard-map.js:1400 |
| `wbMapMultiState` | frontend/js/whiteboard-map.js:6176 |
| `wbMapMultiTopics` | frontend/js/whiteboard-map.js:6138 |
| `wbMapNavigate` | frontend/js/whiteboard-map.js:4681 |
| `wbMapNodeColors` | frontend/js/whiteboard-map.js:519 |
| `wbMapNodeSize` | frontend/js/whiteboard-map.js:3002 |
| `wbMapNumberOf` | frontend/js/whiteboard-map.js:2183 |
| `wbMapNumbers` | frontend/js/whiteboard-map.js:2161 |
| `wbMapOpenIconPicker` | frontend/js/whiteboard-map.js:6069 |
| `wbMapOpenLink` | frontend/js/whiteboard-map.js:2472 |
| `wbMapOpenMarkers` | frontend/js/whiteboard-map.js:8891 |
| `wbMapOpenNote` | frontend/js/whiteboard-map.js:2221 |
| `wbMapOpenReference` | frontend/js/whiteboard-map.js:2955 |
| `wbMapOrderKey` | frontend/js/whiteboard-map.js:1369 |
| `wbMapOutdent` | frontend/js/whiteboard-map.js:4636 |
| `wbMapPaintMarkerFilter` | frontend/js/whiteboard-map.js:9047 |
| `wbMapPaintMarkers` | frontend/js/whiteboard-map.js:8738 |
| `wbMapPalette` | frontend/js/whiteboard-map.js:497 |
| `wbMapPasteText` | frontend/js/whiteboard-map.js:4260 |
| `wbMapPerspective` | frontend/js/whiteboard-map.js:448 |
| `wbMapPickGlyph` | frontend/js/whiteboard-map.js:5875 |
| `wbMapPickPreview` | frontend/js/whiteboard-map.js:5854 |
| `wbMapPickRow` | frontend/js/whiteboard-map.js:5899 |
| `wbMapPinOnDrag` | frontend/js/whiteboard-map.js:7968 |
| `wbMapPlaceAsChild` | frontend/js/whiteboard-map.js:2826 |
| `wbMapPresentSteps` | frontend/js/whiteboard-map.js:8193 |
| `wbMapProgressWords` | frontend/js/whiteboard-map.js:8714 |
| `wbMapQuietColour` | frontend/js/whiteboard-map.js:511 |
| `wbMapRadialBandFor` | frontend/js/whiteboard-map.js:6898 |
| `wbMapRadialClearance` | frontend/js/whiteboard-map.js:6877 |
| `wbMapRadialLabelSizes` | frontend/js/whiteboard-map.js:6859 |
| `wbMapRadialNode` | frontend/js/whiteboard-map.js:7113 |
| `wbMapRadialPx` | frontend/js/whiteboard-map.js:6761 |
| `wbMapRadialSectorPath` | frontend/js/whiteboard-map.js:6794 |
| `wbMapRadialSectorRect` | frontend/js/whiteboard-map.js:6944 |
| `wbMapRadialStep` | frontend/js/whiteboard-map.js:6967 |
| `wbMapRadialToward` | frontend/js/whiteboard-map.js:6985 |
| `wbMapRefuseLastTopic` | frontend/js/whiteboard-map.js:4791 |
| `wbMapRemoveKeepingBranch` | frontend/js/whiteboard-map.js:7223 |
| `wbMapRemovePicture` | frontend/js/whiteboard-map.js:6614 |
| `wbMapResetToBranch` | frontend/js/whiteboard-map.js:7342 |
| `wbMapRestoreRows` | frontend/js/whiteboard-map.js:4900 |
| `wbMapReverseCrossLink` | frontend/js/whiteboard-map.js:7737 |
| `wbMapReverseEdge` | frontend/js/whiteboard-map.js:7821 |
| `wbMapRibbonD` | frontend/js/whiteboard-map.js:3329 |
| `wbMapSetFocus` | frontend/js/whiteboard-map.js:699 |
| `wbMapSetLayout` | frontend/js/whiteboard-map.js:7943 |
| `wbMapSetLevelField` | frontend/js/whiteboard-map.js:1086 |
| `wbMapSetMarkerFilter` | frontend/js/whiteboard-map.js:9036 |
| `wbMapSetNodeStyle` | frontend/js/whiteboard-map.js:6509 |
| `wbMapSetNumbered` | frontend/js/whiteboard-map.js:2190 |
| `wbMapSetPerspective` | frontend/js/whiteboard-map.js:457 |
| `wbMapSetStructure` | frontend/js/whiteboard-map.js:8152 |
| `wbMapSetTask` | frontend/js/whiteboard-map.js:2299 |
| `wbMapSetTheme` | frontend/js/whiteboard-map.js:878 |
| `wbMapSetTopicIcon` | frontend/js/whiteboard-map.js:6060 |
| `wbMapSever` | frontend/js/whiteboard-map.js:7270 |
| `wbMapShowDropTarget` | frontend/js/whiteboard-map.js:2688 |
| `wbMapSiblingsOf` | frontend/js/whiteboard-map.js:1379 |
| `wbMapSizeStepper` | frontend/js/whiteboard-map.js:5984 |
| `wbMapSmoothThrough` | frontend/js/whiteboard-map.js:3402 |
| `wbMapSpacing` | frontend/js/whiteboard-map.js:74 |
| `wbMapSpillsOffCanvas` | frontend/js/whiteboard-map.js:5456 |
| `wbMapStartResizeDrag` | frontend/js/whiteboard-map.js:2512 |
| `wbMapStartStudy` | frontend/js/whiteboard-map.js:8308 |
| `wbMapStats` | frontend/js/whiteboard-map.js:755 |
| `wbMapStatsList` | frontend/js/whiteboard-map.js:1155 |
| `wbMapStepFocus` | frontend/js/whiteboard-map.js:714 |
| `wbMapStraightenEdge` | frontend/js/whiteboard-map.js:7602 |
| `wbMapStructureGroup` | frontend/js/whiteboard-map.js:8054 |
| `wbMapStructureText` | frontend/js/whiteboard-map.js:8065 |
| `wbMapStudyKey` | frontend/js/whiteboard-map.js:8269 |
| `wbMapStudyLoad` | frontend/js/whiteboard-map.js:8273 |
| `wbMapStudyMark` | frontend/js/whiteboard-map.js:8346 |
| `wbMapStudyQuestions` | frontend/js/whiteboard-map.js:8237 |
| `wbMapStudySave` | frontend/js/whiteboard-map.js:8279 |
| `wbMapStudyShow` | frontend/js/whiteboard-map.js:8336 |
| `wbMapStudySteps` | frontend/js/whiteboard-map.js:8289 |
| `wbMapStudySyncBar` | frontend/js/whiteboard-map.js:8328 |
| `wbMapStudyTally` | frontend/js/whiteboard-map.js:8262 |
| `wbMapStyleMany` | frontend/js/whiteboard-map.js:6155 |
| `wbMapSubtree` | frontend/js/whiteboard-map.js:1436 |
| `wbMapSuggestBranches` | frontend/js/whiteboard-map.js:9207 |
| `wbMapSummarise` | frontend/js/whiteboard-map.js:8171 |
| `wbMapSummariseBranch` | frontend/js/whiteboard-map.js:9180 |
| `wbMapSummaryRun` | frontend/js/whiteboard-map.js:8002 |
| `wbMapTakePicture` | frontend/js/whiteboard-map.js:6583 |
| `wbMapTaskTally` | frontend/js/whiteboard-map.js:2123 |
| `wbMapTemplatesDismissedKey` | frontend/js/whiteboard-map.js:1259 |
| `wbMapTheme` | frontend/js/whiteboard-map.js:120 |
| `wbMapThemeCheck` | frontend/js/whiteboard-map.js:1126 |
| `wbMapThemeDefault` | frontend/js/whiteboard-map.js:166 |
| `wbMapThemeDialog` | frontend/js/whiteboard-map.js:951 |
| `wbMapThemeLevelRows` | frontend/js/whiteboard-map.js:1040 |
| `wbMapThemeMapRows` | frontend/js/whiteboard-map.js:1010 |
| `wbMapThemeSelect` | frontend/js/whiteboard-map.js:1096 |
| `wbMapThemedData` | frontend/js/whiteboard-map.js:138 |
| `wbMapTidy` | frontend/js/whiteboard-map.js:5370 |
| `wbMapTidyBranch` | frontend/js/whiteboard-map.js:5475 |
| `wbMapTidyBranchPlan` | frontend/js/whiteboard-map.js:5492 |
| `wbMapTidyBranchScope` | frontend/js/whiteboard-map.js:5483 |
| `wbMapTidyFresh` | frontend/js/whiteboard-map.js:5439 |
| `wbMapTidyOrigin` | frontend/js/whiteboard-map.js:5404 |
| `wbMapTidyPositions` | frontend/js/whiteboard-map.js:5143 |
| `wbMapToggleCollapse` | frontend/js/whiteboard-map.js:4999 |
| `wbMapToggleTaskDone` | frontend/js/whiteboard-map.js:2308 |
| `wbMapToggleValue` | frontend/js/whiteboard-map.js:341 |
| `wbMapTopicStyle` | frontend/js/whiteboard-map.js:7370 |
| `wbMapTransplant` | frontend/js/whiteboard-map.js:2723 |
| `wbMapTreeMarkdown` | frontend/js/whiteboard-map.js:4310 |
| `wbMapTypeaheadLive` | frontend/js/whiteboard-map.js:4130 |
| `wbMapUseLookForLevel` | frontend/js/whiteboard-map.js:7383 |
| `wbMapWriteDocument` | frontend/js/whiteboard-map.js:4342 |
| `wbMarkMapRadialNode` | frontend/js/whiteboard-map.js:7001 |
| `wbMarkMapRadialSector` | frontend/js/whiteboard-map.js:6919 |
| `wbOpenMapCrossLinkRadial` | frontend/js/whiteboard-map.js:7664 |
| `wbOpenMapLinkRadial` | frontend/js/whiteboard-map.js:7643 |
| `wbOpenMapRadial` | frontend/js/whiteboard-map.js:7056 |
| `wbOutlineAddAfter` | frontend/js/whiteboard-map.js:8585 |
| `wbOutlineAfterSurface` | frontend/js/whiteboard-map.js:8412 |
| `wbOutlineCommit` | frontend/js/whiteboard-map.js:8525 |
| `wbOutlineFocus` | frontend/js/whiteboard-map.js:8504 |
| `wbOutlineFocusSelected` | frontend/js/whiteboard-map.js:8418 |
| `wbOutlineIndent` | frontend/js/whiteboard-map.js:8544 |
| `wbOutlineMirror` | frontend/js/whiteboard-map.js:8518 |
| `wbOutlineOutdent` | frontend/js/whiteboard-map.js:8565 |
| `wbOutlineRemoveEmpty` | frontend/js/whiteboard-map.js:8603 |
| `wbOutlineRowEl` | frontend/js/whiteboard-map.js:8435 |
| `wbOutlineRowOf` | frontend/js/whiteboard-map.js:8497 |
| `wbOutlineRowsNow` | frontend/js/whiteboard-map.js:8424 |
| `wbOutlineShowing` | frontend/js/whiteboard-map.js:8393 |
| `wbOutlineStep` | frontend/js/whiteboard-map.js:8619 |
| `wbOutlineSwitchShows` | frontend/js/whiteboard-map.js:8399 |
| `wbOutlineSync` | frontend/js/whiteboard-map.js:8461 |
| `wbOutlineTakeNewTopic` | frontend/js/whiteboard-map.js:8597 |
| `wbOutlineToggle` | frontend/js/whiteboard-map.js:8404 |
| `wbPaintMapNode` | frontend/js/whiteboard-map.js:2015 |
| `wbPaintMapNodeStyle` | frontend/js/whiteboard-map.js:2323 |
| `wbPathEnds` | frontend/js/whiteboard-map.js:5641 |
| `wbPlaceMapRadial` | frontend/js/whiteboard-map.js:6670 |
| `wbRefreshMapState` | frontend/js/whiteboard-map.js:362 |
| `wbRelativeLuminance` | frontend/js/whiteboard-map.js:1987 |
| `wbRenderMapEdgePluses` | frontend/js/whiteboard-map.js:3898 |
| `wbRenderMapEdges` | frontend/js/whiteboard-map.js:3528 |
| `wbRenderMapLegend` | frontend/js/whiteboard-map.js:564 |
| `wbRenderMapStructure` | frontend/js/whiteboard-map.js:8077 |
| `wbSelectedMapNode` | frontend/js/whiteboard-map.js:4070 |
| `wbShowMapStats` | frontend/js/whiteboard-map.js:1144 |
| `wbSizeMapRadial` | frontend/js/whiteboard-map.js:6769 |
| `wbSyncConnectWords` | frontend/js/whiteboard-map.js:5681 |
| `wbSyncMapChrome` | frontend/js/whiteboard-map.js:7844 |
| `wbSyncMapEdgeHandles` | frontend/js/whiteboard-map.js:7492 |
| `wbSyncMapEmpty` | frontend/js/whiteboard-map.js:1252 |
| `wbSyncMapFill` | frontend/js/whiteboard-map.js:6437 |
| `wbSyncMapFirstHint` | frontend/js/whiteboard-map.js:1299 |
| `wbSyncMapFocusChrome` | frontend/js/whiteboard-map.js:725 |
| `wbSyncMapLinkGlyph` | frontend/js/whiteboard-map.js:5661 |
| `wbSyncMapLinkRadial` | frontend/js/whiteboard-map.js:7686 |
| `wbSyncMapMulti` | frontend/js/whiteboard-map.js:6226 |
| `wbSyncMapRadialAlt` | frontend/js/whiteboard-map.js:7027 |
| `wbSyncMapStrip` | frontend/js/whiteboard-map.js:6258 |
| `wbSyncMapTemplates` | frontend/js/whiteboard-map.js:1265 |
| `wbSyncMapToolState` | frontend/js/whiteboard-map.js:5743 |
| `wbSyncMapViews` | frontend/js/whiteboard-map.js:1233 |
| `wbSyncToolSurfaces` | frontend/js/whiteboard-map.js:5713 |
| `wbTidyAncestor` | frontend/js/whiteboard-map.js:5087 |
| `wbTidyApportion` | frontend/js/whiteboard-map.js:5096 |
| `wbTidyDistance` | frontend/js/whiteboard-map.js:5053 |
| `wbTidyExecuteShifts` | frontend/js/whiteboard-map.js:5075 |
| `wbTidyFirstWalk` | frontend/js/whiteboard-map.js:5025 |
| `wbTidyMoveSubtree` | frontend/js/whiteboard-map.js:5065 |
| `wbTidyNextLeft` | frontend/js/whiteboard-map.js:5057 |
| `wbTidyNextRight` | frontend/js/whiteboard-map.js:5061 |
| `wbUpdateMapEdges` | frontend/js/whiteboard-map.js:3502 |
| `wbWireEdgeLabelDrag` | frontend/js/whiteboard-map.js:3756 |
| `wbWireMapChoices` | frontend/js/whiteboard-map.js:6110 |
| `wbWireMapEdgeGestures` | frontend/js/whiteboard-map.js:7618 |
| `wbWireMapEdgeHandle` | frontend/js/whiteboard-map.js:7522 |
| `wbWireMapIconMore` | frontend/js/whiteboard-map.js:6100 |
| `wbWireMapMulti` | frontend/js/whiteboard-map.js:6247 |

### frontend/js/whiteboard-templates.js (12)

| Name | File:line |
|---|---|
| `wbApplyMapTemplate` | frontend/js/whiteboard-templates.js:540 |
| `wbBlankThumbSpec` | frontend/js/whiteboard-templates.js:268 |
| `wbBoardThumbSpec` | frontend/js/whiteboard-templates.js:189 |
| `wbMapThumbSpec` | frontend/js/whiteboard-templates.js:47 |
| `wbOpenTemplateGallery` | frontend/js/whiteboard-templates.js:350 |
| `wbRenderMapTemplates` | frontend/js/whiteboard-templates.js:507 |
| `wbTemplateChoices` | frontend/js/whiteboard-templates.js:306 |
| `wbTemplateEntry` | frontend/js/whiteboard-templates.js:302 |
| `wbTemplatePicture` | frontend/js/whiteboard-templates.js:322 |
| `wbThumbRound` | frontend/js/whiteboard-templates.js:37 |
| `wbThumbSvg` | frontend/js/whiteboard-templates.js:273 |
| `wbUntitledNames` | frontend/js/whiteboard-templates.js:335 |

### frontend/js/whiteboard.js (461)

| Name | File:line |
|---|---|
| `addBoardToNote` | frontend/js/whiteboard.js:20462 |
| `boardItemCount` | frontend/js/whiteboard.js:19565 |
| `boardSort` | frontend/js/whiteboard.js:19569 |
| `boardTypeFilter` | frontend/js/whiteboard.js:19612 |
| `clearWbSelection` | frontend/js/whiteboard.js:4638 |
| `createConceptMap` | frontend/js/whiteboard.js:20050 |
| `createNewBoard` | frontend/js/whiteboard.js:14974 |
| `deleteWbSelection` | frontend/js/whiteboard.js:5122 |
| `dragEndNode` | frontend/js/whiteboard.js:19327 |
| `dragStart` | frontend/js/whiteboard.js:19156 |
| `dragging` | frontend/js/whiteboard.js:19215 |
| `drawLibraryBoardsGallery` | frontend/js/whiteboard.js:19701 |
| `fetchWhiteboardState` | frontend/js/whiteboard.js:14785 |
| `handleWbZoom` | frontend/js/whiteboard.js:496 |
| `initWhiteboard` | frontend/js/whiteboard.js:10915 |
| `openWhiteboardBoard` | frontend/js/whiteboard.js:19909 |
| `pickNotesDialog` | frontend/js/whiteboard.js:20374 |
| `redrawLibraryBoardsGallery` | frontend/js/whiteboard.js:19670 |
| `refreshBoardList` | frontend/js/whiteboard.js:14824 |
| `renameCurrentBoard` | frontend/js/whiteboard.js:14923 |
| `renderBoardTypeFilter` | frontend/js/whiteboard.js:19631 |
| `renderLibraryBoardsGallery` | frontend/js/whiteboard.js:19675 |
| `renderWbGestureHints` | frontend/js/whiteboard.js:19981 |
| `renderWbLibrary` | frontend/js/whiteboard.js:14707 |
| `renderWbObjects` | frontend/js/whiteboard.js:18191 |
| `renderWhiteboard` | frontend/js/whiteboard.js:17044 |
| `renderWhiteboardNow` | frontend/js/whiteboard.js:17022 |
| `selectWbItem` | frontend/js/whiteboard.js:4522 |
| `toggleWhiteboardFullscreen` | frontend/js/whiteboard.js:20129 |
| `uploadToLibrary` | frontend/js/whiteboard.js:10481 |
| `wbAddBoardToNote` | frontend/js/whiteboard.js:9462 |
| `wbAlignGuideColor` | frontend/js/whiteboard.js:1045 |
| `wbAlignSelection` | frontend/js/whiteboard.js:3407 |
| `wbAlignmentGuides` | frontend/js/whiteboard.js:911 |
| `wbAnchorDelta` | frontend/js/whiteboard.js:6347 |
| `wbAnchorPlaced` | frontend/js/whiteboard.js:6392 |
| `wbAnchorPoint` | frontend/js/whiteboard.js:2516 |
| `wbAnchorPositions` | frontend/js/whiteboard.js:2501 |
| `wbAngleFromCenterDeg` | frontend/js/whiteboard.js:8093 |
| `wbAnnounce` | frontend/js/whiteboard.js:4596 |
| `wbApplyBackground` | frontend/js/whiteboard.js:1107 |
| `wbApplyBulkMove` | frontend/js/whiteboard.js:5537 |
| `wbApplyContextRow` | frontend/js/whiteboard.js:3887 |
| `wbApplyGrid` | frontend/js/whiteboard.js:1079 |
| `wbApplyHistoryEntry` | frontend/js/whiteboard.js:8100 |
| `wbApplyLineJumps` | frontend/js/whiteboard.js:3228 |
| `wbApplySearchHighlight` | frontend/js/whiteboard.js:2249 |
| `wbApplySelectionHighlight` | frontend/js/whiteboard.js:4470 |
| `wbApplyZoomTransform` | frontend/js/whiteboard.js:379 |
| `wbArrangeMindMap` | frontend/js/whiteboard.js:4166 |
| `wbArrowHeadPath` | frontend/js/whiteboard.js:1303 |
| `wbAttachEditorMenu` | frontend/js/whiteboard.js:7861 |
| `wbAxisLock` | frontend/js/whiteboard.js:5809 |
| `wbBarSideEdges` | frontend/js/whiteboard.js:4801 |
| `wbBase64` | frontend/js/whiteboard.js:10325 |
| `wbBeginGesture` | frontend/js/whiteboard.js:5608 |
| `wbBeginTextEdit` | frontend/js/whiteboard.js:7806 |
| `wbBinBoard` | frontend/js/whiteboard.js:9493 |
| `wbBoardBackground` | frontend/js/whiteboard.js:1093 |
| `wbBoardBounds` | frontend/js/whiteboard.js:9610 |
| `wbBoardCountWords` | frontend/js/whiteboard.js:14906 |
| `wbBoardPointOf` | frontend/js/whiteboard.js:8670 |
| `wbBoardRows` | frontend/js/whiteboard.js:7535 |
| `wbBoardSearchGo` | frontend/js/whiteboard.js:2280 |
| `wbBoardSearchRun` | frontend/js/whiteboard.js:2212 |
| `wbBoardSettings` | frontend/js/whiteboard.js:7546 |
| `wbBoardTitleForExport` | frontend/js/whiteboard.js:10433 |
| `wbBoxCenter` | frontend/js/whiteboard.js:2354 |
| `wbBoxRayIntersection` | frontend/js/whiteboard.js:2632 |
| `wbBoxesOverlap` | frontend/js/whiteboard.js:5217 |
| `wbBucketFillSketch` | frontend/js/whiteboard.js:15752 |
| `wbBuildContextMenu` | frontend/js/whiteboard.js:6621 |
| `wbBuildExportSvg` | frontend/js/whiteboard.js:9756 |
| `wbBuildFrame` | frontend/js/whiteboard.js:9371 |
| `wbBulkGroupBox` | frontend/js/whiteboard.js:866 |
| `wbBulkMoveElement` | frontend/js/whiteboard.js:5531 |
| `wbBulkUndoEntries` | frontend/js/whiteboard.js:5819 |
| `wbBulletTextLines` | frontend/js/whiteboard.js:7789 |
| `wbCancelGesture` | frontend/js/whiteboard.js:5620 |
| `wbCanvasOrigin` | frontend/js/whiteboard.js:440 |
| `wbCanvasOriginRect` | frontend/js/whiteboard.js:410 |
| `wbCapPath` | frontend/js/whiteboard.js:1334 |
| `wbCaptureBulkMoveOrigin` | frontend/js/whiteboard.js:5381 |
| `wbCarryWaypoints` | frontend/js/whiteboard.js:5929 |
| `wbCenterOn` | frontend/js/whiteboard.js:1772 |
| `wbClearAlignmentGuides` | frontend/js/whiteboard.js:1075 |
| `wbClearAnchorHints` | frontend/js/whiteboard.js:3357 |
| `wbClearBoard` | frontend/js/whiteboard.js:9525 |
| `wbClearCanvasRectCache` | frontend/js/whiteboard.js:405 |
| `wbClearGuideBoxCache` | frontend/js/whiteboard.js:835 |
| `wbClearSelectionOverlays` | frontend/js/whiteboard.js:200 |
| `wbClearSketchHandles` | frontend/js/whiteboard.js:15875 |
| `wbClientToBoard` | frontend/js/whiteboard.js:456 |
| `wbClipboardText` | frontend/js/whiteboard.js:6172 |
| `wbClippedCardCount` | frontend/js/whiteboard.js:10713 |
| `wbCloneConnect` | frontend/js/whiteboard.js:6446 |
| `wbCloneSource` | frontend/js/whiteboard.js:6434 |
| `wbCloseBoardSearch` | frontend/js/whiteboard.js:2293 |
| `wbCloseComments` | frontend/js/whiteboard.js:9255 |
| `wbCloseContextMenu` | frontend/js/whiteboard.js:7025 |
| `wbCloseMapStripMenus` | frontend/js/whiteboard.js:4688 |
| `wbCommentAttachMarkdown` | frontend/js/whiteboard.js:9236 |
| `wbCommentRow` | frontend/js/whiteboard.js:9095 |
| `wbCommentWikiChips` | frontend/js/whiteboard.js:9221 |
| `wbCommitOpenEdit` | frontend/js/whiteboard.js:8317 |
| `wbContentBounds` | frontend/js/whiteboard.js:1644 |
| `wbContextKindOf` | frontend/js/whiteboard.js:3856 |
| `wbContextMoreWrap` | frontend/js/whiteboard.js:3916 |
| `wbCopySelectedStyle` | frontend/js/whiteboard.js:3756 |
| `wbCopySelection` | frontend/js/whiteboard.js:6097 |
| `wbCopyableSelection` | frontend/js/whiteboard.js:6066 |
| `wbCreateBlankBoard` | frontend/js/whiteboard.js:15044 |
| `wbCreateCopies` | frontend/js/whiteboard.js:5869 |
| `wbCreateFrame` | frontend/js/whiteboard.js:9296 |
| `wbCreateObject` | frontend/js/whiteboard.js:8359 |
| `wbCreateSticky` | frontend/js/whiteboard.js:8408 |
| `wbCreateTextBox` | frontend/js/whiteboard.js:8464 |
| `wbCubicAt` | frontend/js/whiteboard.js:3081 |
| `wbCullNow` | frontend/js/whiteboard.js:597 |
| `wbCursorForTool` | frontend/js/whiteboard.js:1391 |
| `wbCursorUrl` | frontend/js/whiteboard.js:1191 |
| `wbCurvePathD` | frontend/js/whiteboard.js:3091 |
| `wbCurveThroughSegs` | frontend/js/whiteboard.js:3063 |
| `wbCutSelection` | frontend/js/whiteboard.js:6591 |
| `wbDashArray` | frontend/js/whiteboard.js:1281 |
| `wbDeleteBoard` | frontend/js/whiteboard.js:9510 |
| `wbDeleteCurrentBoard` | frontend/js/whiteboard.js:9476 |
| `wbDetachEditorMenu` | frontend/js/whiteboard.js:7875 |
| `wbDetectArrowStyle` | frontend/js/whiteboard.js:15804 |
| `wbDistributeSelection` | frontend/js/whiteboard.js:3456 |
| `wbDragExcludeKeys` | frontend/js/whiteboard.js:906 |
| `wbDragIsBulkMove` | frontend/js/whiteboard.js:5372 |
| `wbDrawSketchHandles` | frontend/js/whiteboard.js:16791 |
| `wbDropCopies` | frontend/js/whiteboard.js:5851 |
| `wbDropUndoEntry` | frontend/js/whiteboard.js:7446 |
| `wbDuplicateSelection` | frontend/js/whiteboard.js:6573 |
| `wbEdgeNormal` | frontend/js/whiteboard.js:2555 |
| `wbEdgePoint` | frontend/js/whiteboard.js:2394 |
| `wbEditCommentRow` | frontend/js/whiteboard.js:9166 |
| `wbEditFrameTitle` | frontend/js/whiteboard.js:9339 |
| `wbEditLinkLabel` | frontend/js/whiteboard.js:15671 |
| `wbEditNodeText` | frontend/js/whiteboard.js:4310 |
| `wbEditShapeLabel` | frontend/js/whiteboard.js:15525 |
| `wbEditableSurface` | frontend/js/whiteboard.js:7881 |
| `wbEditedText` | frontend/js/whiteboard.js:7998 |
| `wbElbowCrosses` | frontend/js/whiteboard.js:2941 |
| `wbElbowDetour` | frontend/js/whiteboard.js:3032 |
| `wbElbowEnds` | frontend/js/whiteboard.js:3279 |
| `wbElbowFloat` | frontend/js/whiteboard.js:3263 |
| `wbElbowLeg` | frontend/js/whiteboard.js:2952 |
| `wbElbowPathD` | frontend/js/whiteboard.js:3047 |
| `wbElbowRoute` | frontend/js/whiteboard.js:2972 |
| `wbElbowSide` | frontend/js/whiteboard.js:2935 |
| `wbEllipseRayIntersection` | frontend/js/whiteboard.js:2587 |
| `wbEndGesture` | frontend/js/whiteboard.js:5613 |
| `wbEndPanShield` | frontend/js/whiteboard.js:492 |
| `wbEndTextEdit` | frontend/js/whiteboard.js:8060 |
| `wbEntryBox` | frontend/js/whiteboard.js:16336 |
| `wbEntryOutlineBox` | frontend/js/whiteboard.js:16368 |
| `wbExportBoard` | frontend/js/whiteboard.js:10738 |
| `wbExportColour` | frontend/js/whiteboard.js:9714 |
| `wbExportDescription` | frontend/js/whiteboard.js:10468 |
| `wbExportFileName` | frontend/js/whiteboard.js:10442 |
| `wbExportFrame` | frontend/js/whiteboard.js:10729 |
| `wbExportMapText` | frontend/js/whiteboard.js:10129 |
| `wbExportPaint` | frontend/js/whiteboard.js:9745 |
| `wbExportPdf` | frontend/js/whiteboard.js:10564 |
| `wbExportPng` | frontend/js/whiteboard.js:10526 |
| `wbExportPngPrefs` | frontend/js/whiteboard.js:10452 |
| `wbExportSegment` | frontend/js/whiteboard.js:10675 |
| `wbExportSvg` | frontend/js/whiteboard.js:10400 |
| `wbExtractNotes` | frontend/js/whiteboard.js:3552 |
| `wbFillComments` | frontend/js/whiteboard.js:9054 |
| `wbFillContextBar` | frontend/js/whiteboard.js:3973 |
| `wbFillPaperSwatches` | frontend/js/whiteboard.js:8426 |
| `wbFindItem` | frontend/js/whiteboard.js:8761 |
| `wbFinishDrag` | frontend/js/whiteboard.js:5912 |
| `wbFitToText` | frontend/js/whiteboard.js:17984 |
| `wbFlushNudge` | frontend/js/whiteboard.js:3621 |
| `wbFlushZoomFrame` | frontend/js/whiteboard.js:541 |
| `wbFollowLiveShape` | frontend/js/whiteboard.js:16757 |
| `wbForgetLinkItems` | frontend/js/whiteboard.js:2709 |
| `wbForgetLinks` | frontend/js/whiteboard.js:7628 |
| `wbForwardGripContextMenu` | frontend/js/whiteboard.js:15889 |
| `wbFrameContents` | frontend/js/whiteboard.js:9316 |
| `wbFrameDragOrigin` | frontend/js/whiteboard.js:9331 |
| `wbFrameMapOnOpen` | frontend/js/whiteboard.js:1758 |
| `wbFrameTitle` | frontend/js/whiteboard.js:9283 |
| `wbFrameZ` | frontend/js/whiteboard.js:9289 |
| `wbFramesInOrder` | frontend/js/whiteboard.js:20179 |
| `wbFreeCanvasRect` | frontend/js/whiteboard.js:6287 |
| `wbGenerateMapFromNotes` | frontend/js/whiteboard.js:10180 |
| `wbGridType` | frontend/js/whiteboard.js:761 |
| `wbGroupSelection` | frontend/js/whiteboard.js:1481 |
| `wbGuardMenuCorner` | frontend/js/whiteboard.js:7069 |
| `wbGuideBoxes` | frontend/js/whiteboard.js:808 |
| `wbHandleItemClick` | frontend/js/whiteboard.js:5078 |
| `wbHiddenOnBoard` | frontend/js/whiteboard.js:8579 |
| `wbHideSelectionActions` | frontend/js/whiteboard.js:3920 |
| `wbHighlighterBlend` | frontend/js/whiteboard.js:1235 |
| `wbHighlighterWidth` | frontend/js/whiteboard.js:1222 |
| `wbHistoryFor` | frontend/js/whiteboard.js:7399 |
| `wbHistoryFromRows` | frontend/js/whiteboard.js:7559 |
| `wbHistoryRestore` | frontend/js/whiteboard.js:7417 |
| `wbImportOutlineFile` | frontend/js/whiteboard.js:10332 |
| `wbIndentEditableLines` | frontend/js/whiteboard.js:8009 |
| `wbInlineSvgImages` | frontend/js/whiteboard.js:10063 |
| `wbIsBareCanvas` | frontend/js/whiteboard.js:128 |
| `wbIsEditingTarget` | frontend/js/whiteboard.js:7342 |
| `wbIsLinkRow` | frontend/js/whiteboard.js:7551 |
| `wbIsLocked` | frontend/js/whiteboard.js:8502 |
| `wbIsSticky` | frontend/js/whiteboard.js:8402 |
| `wbItemBBox` | frontend/js/whiteboard.js:1555 |
| `wbItemComments` | frontend/js/whiteboard.js:8755 |
| `wbItemEdgeDir` | frontend/js/whiteboard.js:2436 |
| `wbItemElement` | frontend/js/whiteboard.js:1536 |
| `wbItemHidden` | frontend/js/whiteboard.js:5279 |
| `wbItemRotation` | frontend/js/whiteboard.js:2340 |
| `wbItemSpokenName` | frontend/js/whiteboard.js:4577 |
| `wbItemTransform` | frontend/js/whiteboard.js:8067 |
| `wbKeepAspect` | frontend/js/whiteboard.js:15294 |
| `wbKeepMenuBesideBar` | frontend/js/whiteboard.js:7005 |
| `wbLayoutCloneGrips` | frontend/js/whiteboard.js:6544 |
| `wbLayoutLinkLabel` | frontend/js/whiteboard.js:15640 |
| `wbLayoutShapeLabel` | frontend/js/whiteboard.js:15423 |
| `wbLeaveFullscreen` | frontend/js/whiteboard.js:19897 |
| `wbLineJumpsD` | frontend/js/whiteboard.js:3141 |
| `wbLinkAdjacency` | frontend/js/whiteboard.js:4124 |
| `wbLinkCandidateAt` | frontend/js/whiteboard.js:2763 |
| `wbLinkCandidates` | frontend/js/whiteboard.js:2730 |
| `wbLinkCaps` | frontend/js/whiteboard.js:2847 |
| `wbLinkDrawnLine` | frontend/js/whiteboard.js:16161 |
| `wbLinkEnd` | frontend/js/whiteboard.js:2579 |
| `wbLinkEndpoints` | frontend/js/whiteboard.js:2775 |
| `wbLinkItem` | frontend/js/whiteboard.js:2713 |
| `wbLinkLabelT` | frontend/js/whiteboard.js:16255 |
| `wbLinkMidpoint` | frontend/js/whiteboard.js:15618 |
| `wbLinkNearestT` | frontend/js/whiteboard.js:16262 |
| `wbLinkPathD` | frontend/js/whiteboard.js:2868 |
| `wbLinkRouteName` | frontend/js/whiteboard.js:3308 |
| `wbLinkSelectionBox` | frontend/js/whiteboard.js:4779 |
| `wbLinkShape` | frontend/js/whiteboard.js:3316 |
| `wbLinkSketchIndex` | frontend/js/whiteboard.js:19057 |
| `wbLinkTakesLabel` | frontend/js/whiteboard.js:15608 |
| `wbLinkWaypoints` | frontend/js/whiteboard.js:16149 |
| `wbLinkedSketchesFor` | frontend/js/whiteboard.js:19086 |
| `wbLinksTouching` | frontend/js/whiteboard.js:7618 |
| `wbLockHoverWanted` | frontend/js/whiteboard.js:8709 |
| `wbLockSelection` | frontend/js/whiteboard.js:8542 |
| `wbLockedItemAt` | frontend/js/whiteboard.js:8657 |
| `wbLockedItems` | frontend/js/whiteboard.js:8510 |
| `wbMapNodeScreenBox` | frontend/js/whiteboard.js:7057 |
| `wbMapNodeTakeBack` | frontend/js/whiteboard.js:18177 |
| `wbMapStripClearOfHandle` | frontend/js/whiteboard.js:4748 |
| `wbMapStripToggles` | frontend/js/whiteboard.js:4677 |
| `wbMapTaskTallyKey` | frontend/js/whiteboard.js:19038 |
| `wbMenuAnchorOk` | frontend/js/whiteboard.js:7051 |
| `wbMenuSpotBeside` | frontend/js/whiteboard.js:7163 |
| `wbMigrateBackground` | frontend/js/whiteboard.js:1157 |
| `wbMindMapAddCard` | frontend/js/whiteboard.js:4245 |
| `wbMindMapAddChild` | frontend/js/whiteboard.js:4431 |
| `wbMindMapAddSibling` | frontend/js/whiteboard.js:4459 |
| `wbMindMapEnsureMap` | frontend/js/whiteboard.js:4234 |
| `wbMindMapSpanningTree` | frontend/js/whiteboard.js:4148 |
| `wbMoveItemBy` | frontend/js/whiteboard.js:3379 |
| `wbMultiKey` | frontend/js/whiteboard.js:1472 |
| `wbMultiSelectionEntries` | frontend/js/whiteboard.js:16309 |
| `wbMultiSnapshot` | frontend/js/whiteboard.js:16391 |
| `wbNavigatorDragEnd` | frontend/js/whiteboard.js:2133 |
| `wbNavigatorDragFrame` | frontend/js/whiteboard.js:2112 |
| `wbNavigatorDragMove` | frontend/js/whiteboard.js:2105 |
| `wbNavigatorDragStart` | frontend/js/whiteboard.js:2058 |
| `wbNavigatorFrozenProjection` | frontend/js/whiteboard.js:1906 |
| `wbNavigatorIsSelected` | frontend/js/whiteboard.js:1920 |
| `wbNavigatorMapping` | frontend/js/whiteboard.js:1892 |
| `wbNavigatorOpen` | frontend/js/whiteboard.js:1802 |
| `wbNavigatorPlaceViewport` | frontend/js/whiteboard.js:1973 |
| `wbNavigatorProjectionFor` | frontend/js/whiteboard.js:1867 |
| `wbNavigatorSelectionKey` | frontend/js/whiteboard.js:1915 |
| `wbNavigatorSnapshot` | frontend/js/whiteboard.js:1840 |
| `wbNavigatorUpdateViewport` | frontend/js/whiteboard.js:2003 |
| `wbNearestAnchor` | frontend/js/whiteboard.js:2527 |
| `wbNudgeSelection` | frontend/js/whiteboard.js:3633 |
| `wbNudgeShapeLabel` | frontend/js/whiteboard.js:15471 |
| `wbObjectPaintKey` | frontend/js/whiteboard.js:19011 |
| `wbOnBoardCopy` | frontend/js/whiteboard.js:6190 |
| `wbOnLockHoverMove` | frontend/js/whiteboard.js:8717 |
| `wbOnLockPress` | frontend/js/whiteboard.js:8731 |
| `wbOpenBoardSearch` | frontend/js/whiteboard.js:2304 |
| `wbOpenComments` | frontend/js/whiteboard.js:8862 |
| `wbOpenContextMenuFor` | frontend/js/whiteboard.js:7228 |
| `wbOpenMapNodeMenu` | frontend/js/whiteboard.js:7090 |
| `wbOpenSketchLabelEditor` | frontend/js/whiteboard.js:15546 |
| `wbOwnsChord` | frontend/js/whiteboard.js:3596 |
| `wbPaintCommentMarks` | frontend/js/whiteboard.js:8788 |
| `wbPaintFrame` | frontend/js/whiteboard.js:9391 |
| `wbPaintHidden` | frontend/js/whiteboard.js:8592 |
| `wbPaintLinkLabel` | frontend/js/whiteboard.js:15651 |
| `wbPaintLockHover` | frontend/js/whiteboard.js:8674 |
| `wbPaintLocks` | frontend/js/whiteboard.js:8630 |
| `wbPaintShapeLabel` | frontend/js/whiteboard.js:15487 |
| `wbPaintTextContent` | frontend/js/whiteboard.js:7754 |
| `wbParkContextOnRail` | frontend/js/whiteboard.js:3931 |
| `wbPasteClipboard` | frontend/js/whiteboard.js:6153 |
| `wbPasteCopiedStyle` | frontend/js/whiteboard.js:3780 |
| `wbPastePlan` | frontend/js/whiteboard.js:6211 |
| `wbPasteText` | frontend/js/whiteboard.js:6222 |
| `wbPastedLines` | frontend/js/whiteboard.js:6201 |
| `wbPathBBox` | frontend/js/whiteboard.js:15232 |
| `wbPathPolyline` | frontend/js/whiteboard.js:2361 |
| `wbPickStyle` | frontend/js/whiteboard.js:3745 |
| `wbPillRayIntersection` | frontend/js/whiteboard.js:2597 |
| `wbPlaceBox` | frontend/js/whiteboard.js:9411 |
| `wbPlaceCopies` | frontend/js/whiteboard.js:6131 |
| `wbPlacedBounds` | frontend/js/whiteboard.js:6361 |
| `wbPointInItem` | frontend/js/whiteboard.js:2755 |
| `wbPointerOnBoard` | frontend/js/whiteboard.js:6050 |
| `wbPolylineAt` | frontend/js/whiteboard.js:3289 |
| `wbPortFractions` | frontend/js/whiteboard.js:2456 |
| `wbPortsForPath` | frontend/js/whiteboard.js:2469 |
| `wbPresentShow` | frontend/js/whiteboard.js:20243 |
| `wbPresentSteps` | frontend/js/whiteboard.js:20200 |
| `wbPublishInvZoom` | frontend/js/whiteboard.js:742 |
| `wbPushDragUndo` | frontend/js/whiteboard.js:5904 |
| `wbPushMoveBatch` | frontend/js/whiteboard.js:3398 |
| `wbPushUndo` | frontend/js/whiteboard.js:7452 |
| `wbQueueSelectionBar` | frontend/js/whiteboard.js:4722 |
| `wbRasterizeSvg` | frontend/js/whiteboard.js:10086 |
| `wbRecordGesture` | frontend/js/whiteboard.js:7589 |
| `wbRedo` | frontend/js/whiteboard.js:8343 |
| `wbRefreshHighlighterBlend` | frontend/js/whiteboard.js:1247 |
| `wbRegenerateShapeCaps` | frontend/js/whiteboard.js:15784 |
| `wbRegisterCommentSurfaces` | frontend/js/whiteboard.js:9248 |
| `wbRegisterEditorContexts` | frontend/js/whiteboard.js:7857 |
| `wbRemapUndoIds` | frontend/js/whiteboard.js:7473 |
| `wbRememberedBoardKind` | frontend/js/whiteboard.js:14956 |
| `wbRenderCloneGrips` | frontend/js/whiteboard.js:6499 |
| `wbRenderLinkEndpointHandles` | frontend/js/whiteboard.js:15907 |
| `wbRenderLinkLabelGrip` | frontend/js/whiteboard.js:16206 |
| `wbRenderMultiSelectionHandles` | frontend/js/whiteboard.js:16442 |
| `wbRenderNavigator` | frontend/js/whiteboard.js:1925 |
| `wbRenderRelease` | frontend/js/whiteboard.js:4822 |
| `wbRenderSketchHandles` | frontend/js/whiteboard.js:16769 |
| `wbRenderWaypointHandles` | frontend/js/whiteboard.js:16055 |
| `wbResetRotation` | frontend/js/whiteboard.js:17950 |
| `wbResolveLinkEndpoints` | frontend/js/whiteboard.js:2802 |
| `wbRestoreBox` | frontend/js/whiteboard.js:5796 |
| `wbRestoreLinks` | frontend/js/whiteboard.js:7635 |
| `wbRestoreMove` | frontend/js/whiteboard.js:5768 |
| `wbRestoreMultiSnapshot` | frontend/js/whiteboard.js:16404 |
| `wbReviewMapProposal` | frontend/js/whiteboard.js:10227 |
| `wbRotatePoint` | frontend/js/whiteboard.js:2346 |
| `wbSameSizeSelection` | frontend/js/whiteboard.js:3499 |
| `wbSaveBulkMove` | frontend/js/whiteboard.js:6004 |
| `wbSaveExpandedNodes` | frontend/js/whiteboard.js:260 |
| `wbSaveMapBulkMove` | frontend/js/whiteboard.js:5978 |
| `wbSaveMultiSnapshot` | frontend/js/whiteboard.js:16422 |
| `wbSaveNode` | frontend/js/whiteboard.js:18107 |
| `wbSaveObject` | frontend/js/whiteboard.js:18130 |
| `wbSaveSketchD` | frontend/js/whiteboard.js:15743 |
| `wbSaveSketchProps` | frontend/js/whiteboard.js:15714 |
| `wbSaveToLibrary` | frontend/js/whiteboard.js:10555 |
| `wbScheduleCardClampSync` | frontend/js/whiteboard.js:308 |
| `wbScheduleCull` | frontend/js/whiteboard.js:580 |
| `wbScheduleRender` | frontend/js/whiteboard.js:17007 |
| `wbScreenToBoard` | frontend/js/whiteboard.js:431 |
| `wbSearchItem` | frontend/js/whiteboard.js:2245 |
| `wbSearchTextFor` | frontend/js/whiteboard.js:2187 |
| `wbSegmentCross` | frontend/js/whiteboard.js:3125 |
| `wbSelectAllItems` | frontend/js/whiteboard.js:4542 |
| `wbSelectableItems` | frontend/js/whiteboard.js:4555 |
| `wbSelectedKeys` | frontend/js/whiteboard.js:9694 |
| `wbSelectedSketchOrNull` | frontend/js/whiteboard.js:3710 |
| `wbSelectedTextObjectOrNull` | frontend/js/whiteboard.js:3715 |
| `wbSelectionBounds` | frontend/js/whiteboard.js:9657 |
| `wbSelectionEntries` | frontend/js/whiteboard.js:3364 |
| `wbSendSelectionZOrder` | frontend/js/whiteboard.js:5351 |
| `wbSetBackground` | frontend/js/whiteboard.js:1130 |
| `wbSetComments` | frontend/js/whiteboard.js:8766 |
| `wbSetExportPngPrefs` | frontend/js/whiteboard.js:10460 |
| `wbSetHidden` | frontend/js/whiteboard.js:8608 |
| `wbSetHiddenKeys` | frontend/js/whiteboard.js:8583 |
| `wbSetLocked` | frontend/js/whiteboard.js:8520 |
| `wbSetMenuSpot` | frontend/js/whiteboard.js:7199 |
| `wbSetStickyPaper` | frontend/js/whiteboard.js:8446 |
| `wbSetZOrder` | frontend/js/whiteboard.js:5178 |
| `wbShaftPoints` | frontend/js/whiteboard.js:3189 |
| `wbShapeDims` | frontend/js/whiteboard.js:1296 |
| `wbShapeLabelArea` | frontend/js/whiteboard.js:15365 |
| `wbShapeLabelInk` | frontend/js/whiteboard.js:15481 |
| `wbShapeLabelKind` | frontend/js/whiteboard.js:15353 |
| `wbShowAlignmentGuides` | frontend/js/whiteboard.js:1052 |
| `wbShowAnchorHints` | frontend/js/whiteboard.js:3328 |
| `wbShowBoardsLanding` | frontend/js/whiteboard.js:19531 |
| `wbShowCanvasView` | frontend/js/whiteboard.js:19525 |
| `wbShowToolSettings` | frontend/js/whiteboard.js:3696 |
| `wbSizeItemTo` | frontend/js/whiteboard.js:3522 |
| `wbSketchAngleFromCenterDeg` | frontend/js/whiteboard.js:8085 |
| `wbSketchCaps` | frontend/js/whiteboard.js:15840 |
| `wbSketchData` | frontend/js/whiteboard.js:8493 |
| `wbSketchHiddenOnBoard` | frontend/js/whiteboard.js:8571 |
| `wbSketchIsArrow` | frontend/js/whiteboard.js:15773 |
| `wbSketchIsClosedShape` | frontend/js/whiteboard.js:15334 |
| `wbSketchIsDrawable` | frontend/js/whiteboard.js:2668 |
| `wbSketchParsedData` | frontend/js/whiteboard.js:15695 |
| `wbSketchResizeTransform` | frontend/js/whiteboard.js:15299 |
| `wbSnap` | frontend/js/whiteboard.js:777 |
| `wbSnapOn` | frontend/js/whiteboard.js:765 |
| `wbSpacingSeries` | frontend/js/whiteboard.js:1002 |
| `wbSquareCorner` | frontend/js/whiteboard.js:9425 |
| `wbStableDragContainer` | frontend/js/whiteboard.js:7731 |
| `wbStampMenuRoles` | frontend/js/whiteboard.js:10899 |
| `wbStartPanShield` | frontend/js/whiteboard.js:485 |
| `wbStartPresenting` | frontend/js/whiteboard.js:20216 |
| `wbStepSelectionZOrder` | frontend/js/whiteboard.js:5289 |
| `wbStickerSize` | frontend/js/whiteboard.js:3752 |
| `wbStopPresenting` | frontend/js/whiteboard.js:20276 |
| `wbSvgEscape` | frontend/js/whiteboard.js:9567 |
| `wbSvgText` | frontend/js/whiteboard.js:9598 |
| `wbSvgWrapLines` | frontend/js/whiteboard.js:9579 |
| `wbSyncBoardCount` | frontend/js/whiteboard.js:14912 |
| `wbSyncCardClamps` | frontend/js/whiteboard.js:285 |
| `wbSyncExportSeg` | frontend/js/whiteboard.js:10692 |
| `wbSyncGridToTransform` | frontend/js/whiteboard.js:676 |
| `wbTakesComments` | frontend/js/whiteboard.js:8750 |
| `wbThemeBoardHex` | frontend/js/whiteboard.js:1099 |
| `wbToggleNavigator` | frontend/js/whiteboard.js:2152 |
| `wbTrackMapStripMenu` | frontend/js/whiteboard.js:4701 |
| `wbTransformPathD` | frontend/js/whiteboard.js:15134 |
| `wbTranslateSelectionChrome` | frontend/js/whiteboard.js:5493 |
| `wbTrashDelete` | frontend/js/whiteboard.js:5727 |
| `wbTrashHide` | frontend/js/whiteboard.js:5676 |
| `wbTrashSetHot` | frontend/js/whiteboard.js:5669 |
| `wbTrashTake` | frontend/js/whiteboard.js:5712 |
| `wbTrashTarget` | frontend/js/whiteboard.js:5653 |
| `wbUndo` | frontend/js/whiteboard.js:8322 |
| `wbUngroupSelection` | frontend/js/whiteboard.js:1504 |
| `wbUnlockAll` | frontend/js/whiteboard.js:8559 |
| `wbUpdateContextBar` | frontend/js/whiteboard.js:3962 |
| `wbUpdateLinkedSketches` | frontend/js/whiteboard.js:19122 |
| `wbUpdateSearchCount` | frontend/js/whiteboard.js:2266 |
| `wbUpdateSelectionBar` | frontend/js/whiteboard.js:4839 |
| `wbUpdateUndoRedoButtons` | frontend/js/whiteboard.js:7431 |
| `wbViewCentre` | frontend/js/whiteboard.js:6320 |
| `wbVisibleBounds` | frontend/js/whiteboard.js:9677 |
| `wbVisibleCanvasRect` | frontend/js/whiteboard.js:6309 |
| `wbWalkItems` | frontend/js/whiteboard.js:4607 |
| `wbWaypointAddSpots` | frontend/js/whiteboard.js:16174 |
| `wbWaypointInsert` | frontend/js/whiteboard.js:3106 |
| `wbWireContextMenu` | frontend/js/whiteboard.js:7347 |
| `wbWithDir` | frontend/js/whiteboard.js:2571 |
| `wbWrapShapeLabel` | frontend/js/whiteboard.js:15390 |
| `wbWrapTextSelection` | frontend/js/whiteboard.js:7769 |
| `wbWriteZ` | frontend/js/whiteboard.js:5313 |
| `wbZOrderPeers` | frontend/js/whiteboard.js:5168 |
| `wbZOrderStepPeers` | frontend/js/whiteboard.js:5263 |
| `wbZOrderStepPlan` | frontend/js/whiteboard.js:5221 |
| `wbZOrderTargets` | frontend/js/whiteboard.js:5333 |
| `wbZoomFilter` | frontend/js/whiteboard.js:79 |
| `wbZoomFrameWork` | frontend/js/whiteboard.js:505 |
| `wbZoomToFit` | frontend/js/whiteboard.js:1673 |

## Frontend ids (2241)

Every `id="..."` in `frontend/index.html`, sorted by id.

| Id | File:line |
|---|---|
| `about-emblem` | frontend/index.html:12682 |
| `about-force-reload` | frontend/index.html:12701 |
| `about-motion` | frontend/index.html:12692 |
| `about-restart` | frontend/index.html:12700 |
| `about-restart-row` | frontend/index.html:12699 |
| `about-shortcuts` | frontend/index.html:12980 |
| `about-take-tour` | frontend/index.html:12961 |
| `about-version` | frontend/index.html:12689 |
| `accent-custom` | frontend/index.html:10196 |
| `accent-custom-clear` | frontend/index.html:10197 |
| `accent-swatches` | frontend/index.html:10187 |
| `account-allow-lan` | frontend/index.html:12178 |
| `account-change` | frontend/index.html:12257 |
| `account-confirm` | frontend/index.html:12254 |
| `account-current` | frontend/index.html:12248 |
| `account-facts` | frontend/index.html:12102 |
| `account-help` | frontend/index.html:12091 |
| `account-idle-ttl` | frontend/index.html:12311 |
| `account-lan-cert` | frontend/index.html:12189 |
| `account-lan-cert-expiry` | frontend/index.html:12193 |
| `account-lan-cert-names` | frontend/index.html:12192 |
| `account-lan-download` | frontend/index.html:12195 |
| `account-lan-fingerprint` | frontend/index.html:12191 |
| `account-lan-regenerate` | frontend/index.html:12201 |
| `account-lan-state` | frontend/index.html:12184 |
| `account-lock-all` | frontend/index.html:12321 |
| `account-new` | frontend/index.html:12251 |
| `account-password-on-open` | frontend/index.html:12124 |
| `account-recovery-make` | frontend/index.html:12354 |
| `account-recovery-state` | frontend/index.html:12338 |
| `account-recovery-status` | frontend/index.html:12355 |
| `account-rekey` | frontend/index.html:12287 |
| `account-rekey-status` | frontend/index.html:12288 |
| `account-status` | frontend/index.html:12258 |
| `agent-monitor` | frontend/index.html:797 |
| `agent-monitor-clear` | frontend/index.html:805 |
| `agent-monitor-close` | frontend/index.html:810 |
| `agent-monitor-empty` | frontend/index.html:815 |
| `agent-monitor-log-toggle` | frontend/index.html:807 |
| `agent-monitor-logs` | frontend/index.html:816 |
| `agent-monitor-runs` | frontend/index.html:814 |
| `ai-answer` | frontend/index.html:2116 |
| `ai-answer-grounding` | frontend/index.html:2121 |
| `ai-mark` | frontend/index.html:7972 |
| `ai-status` | frontend/index.html:7974 |
| `ai-status-detail` | frontend/index.html:7981 |
| `ai-status-label` | frontend/index.html:7977 |
| `ai-status-popup` | frontend/index.html:7979 |
| `ai-status-title` | frontend/index.html:7980 |
| `always-available-help` | frontend/index.html:11010 |
| `answered-by` | frontend/index.html:2089 |
| `app-cache-help` | frontend/index.html:12063 |
| `app-main` | frontend/index.html:1159 |
| `app-quit` | frontend/index.html:11724 |
| `appearance-reset` | frontend/index.html:10861 |
| `ask` | frontend/index.html:1885 |
| `ask-answer-foot` | frontend/index.html:2131 |
| `ask-answer-related` | frontend/index.html:2132 |
| `ask-answer-sources` | frontend/index.html:2133 |
| `ask-as-of` | frontend/index.html:1967 |
| `ask-as-of-clear` | frontend/index.html:1968 |
| `ask-as-of-row` | frontend/index.html:1964 |
| `ask-btn` | frontend/index.html:1999 |
| `ask-chart` | frontend/index.html:2115 |
| `ask-clear` | frontend/index.html:1977 |
| `ask-feature-model` | frontend/index.html:1914 |
| `ask-followups` | frontend/index.html:2134 |
| `ask-history-badge` | frontend/index.html:1920 |
| `ask-history-clear` | frontend/index.html:2027 |
| `ask-history-close` | frontend/index.html:2033 |
| `ask-history-empty` | frontend/index.html:2038 |
| `ask-history-list` | frontend/index.html:2037 |
| `ask-history-more` | frontend/index.html:2041 |
| `ask-history-panel` | frontend/index.html:2018 |
| `ask-history-pinned-only` | frontend/index.html:2025 |
| `ask-history-search` | frontend/index.html:2021 |
| `ask-history-toggle` | frontend/index.html:1917 |
| `ask-idle` | frontend/index.html:2048 |
| `ask-mode-select` | frontend/index.html:1983 |
| `ask-offline` | frontend/index.html:2009 |
| `ask-scope` | frontend/index.html:1954 |
| `ask-scope-clear` | frontend/index.html:1957 |
| `ask-scope-text` | frontend/index.html:1956 |
| `ask-search-tune` | frontend/index.html:1996 |
| `ask-source-help` | frontend/index.html:1925 |
| `ask-status` | frontend/index.html:2043 |
| `ask-time-travel` | frontend/index.html:1993 |
| `ask-trail` | frontend/index.html:2108 |
| `ask-use-ai` | frontend/index.html:1898 |
| `ask-use-ai-row` | frontend/index.html:1897 |
| `asked-question` | frontend/index.html:2109 |
| `assistant-avatar` | frontend/index.html:10662 |
| `assistant-avatar-row` | frontend/index.html:10657 |
| `atlas-host` | frontend/index.html:494 |
| `atlas-look` | frontend/index.html:10673 |
| `atlas-look-row` | frontend/index.html:10668 |
| `atlas-open` | frontend/index.html:12659 |
| `atlas-row-help` | frontend/index.html:12662 |
| `atlas-row-starters` | frontend/index.html:12670 |
| `atlas-style` | frontend/index.html:10651 |
| `atlas-style-row` | frontend/index.html:10646 |
| `attach-image` | frontend/index.html:2886 |
| `attach-note` | frontend/index.html:2807 |
| `autonomous-ai-help` | frontend/index.html:11523 |
| `autonomous-review` | frontend/index.html:11671 |
| `autonomous-review-clear` | frontend/index.html:11675 |
| `autonomous-review-list` | frontend/index.html:11673 |
| `autonomous-review-title` | frontend/index.html:11672 |
| `autonomous-settings-panel` | frontend/index.html:11615 |
| `autonomous-trigger` | frontend/index.html:11662 |
| `avatar-buddy` | frontend/index.html:10550 |
| `avatar-buddy-actions` | frontend/index.html:10587 |
| `avatar-buddy-actions-row` | frontend/index.html:10582 |
| `avatar-buddy-activities` | frontend/index.html:10625 |
| `avatar-buddy-activities-fold` | frontend/index.html:10623 |
| `avatar-buddy-custom` | frontend/index.html:10630 |
| `avatar-buddy-make` | frontend/index.html:10562 |
| `avatar-buddy-make-go` | frontend/index.html:10562 |
| `avatar-buddy-make-text` | frontend/index.html:10562 |
| `avatar-buddy-motion` | frontend/index.html:10601 |
| `avatar-buddy-motion-row` | frontend/index.html:10596 |
| `avatar-buddy-motion-why` | frontend/index.html:10599 |
| `avatar-buddy-name` | frontend/index.html:10636 |
| `avatar-buddy-parts` | frontend/index.html:10643 |
| `avatar-buddy-preset-name` | frontend/index.html:10619 |
| `avatar-buddy-preset-save` | frontend/index.html:10620 |
| `avatar-buddy-presets` | frontend/index.html:10617 |
| `avatar-buddy-presets-fold` | frontend/index.html:10615 |
| `avatar-buddy-recall` | frontend/index.html:10557 |
| `avatar-buddy-row` | frontend/index.html:10544 |
| `avatar-buddy-shuffle` | frontend/index.html:10639 |
| `avatar-buddy-size` | frontend/index.html:10572 |
| `avatar-buddy-size-row` | frontend/index.html:10567 |
| `avatar-follow` | frontend/index.html:10537 |
| `avatar-follow-row` | frontend/index.html:10536 |
| `avatar-motion` | frontend/index.html:10528 |
| `avatar-motion-row` | frontend/index.html:10523 |
| `backend-config` | frontend/index.html:8788 |
| `backend-help` | frontend/index.html:8797 |
| `backup-list` | frontend/index.html:12027 |
| `backup-now` | frontend/index.html:12023 |
| `backup-retention` | frontend/index.html:12035 |
| `backup-retention-row` | frontend/index.html:12033 |
| `backup-retention-status` | frontend/index.html:12036 |
| `backup-status` | frontend/index.html:12024 |
| `backups-help` | frontend/index.html:12039 |
| `batch-bar` | frontend/index.html:2334 |
| `batch-cancel` | frontend/index.html:2347 |
| `batch-category-host` | frontend/index.html:2342 |
| `batch-count` | frontend/index.html:2335 |
| `batch-delete` | frontend/index.html:2344 |
| `batch-more-host` | frontend/index.html:2346 |
| `batch-select-all` | frontend/index.html:2336 |
| `batch-tag` | frontend/index.html:2343 |
| `battery-mode-help` | frontend/index.html:11691 |
| `bench-box` | frontend/index.html:9095 |
| `bench-help` | frontend/index.html:9105 |
| `bench-models` | frontend/index.html:9120 |
| `bench-results` | frontend/index.html:9130 |
| `bench-run` | frontend/index.html:9122 |
| `bench-status` | frontend/index.html:9129 |
| `bench-stop` | frontend/index.html:9126 |
| `bg-art-style` | frontend/index.html:10730 |
| `bg-art-toggle` | frontend/index.html:10711 |
| `bg-intensity` | frontend/index.html:10764 |
| `bg-intensity-row` | frontend/index.html:10758 |
| `bg-intensity-value` | frontend/index.html:10766 |
| `bg-motion` | frontend/index.html:10750 |
| `bg-motion-hint` | frontend/index.html:10748 |
| `bg-motion-row` | frontend/index.html:10741 |
| `bg-style-hint` | frontend/index.html:10723 |
| `bg-style-row` | frontend/index.html:10718 |
| `binned-body` | frontend/index.html:13103 |
| `binned-card` | frontend/index.html:13094 |
| `binned-close` | frontend/index.html:13098 |
| `binned-meta` | frontend/index.html:13102 |
| `binned-overlay` | frontend/index.html:13092 |
| `binned-purge` | frontend/index.html:13106 |
| `binned-restore` | frontend/index.html:13105 |
| `bookmark-add` | frontend/index.html:7759 |
| `bookmark-count` | frontend/index.html:7784 |
| `bookmark-empty` | frontend/index.html:7786 |
| `bookmark-form` | frontend/index.html:7770 |
| `bookmark-form-done` | frontend/index.html:7781 |
| `bookmark-group-chips` | frontend/index.html:7783 |
| `bookmark-group-input` | frontend/index.html:7775 |
| `bookmark-group-manage` | frontend/index.html:7755 |
| `bookmark-group-new` | frontend/index.html:7753 |
| `bookmark-group-options` | frontend/index.html:7777 |
| `bookmark-help` | frontend/index.html:7743 |
| `bookmark-help-toggle` | frontend/index.html:7740 |
| `bookmark-list` | frontend/index.html:7785 |
| `bookmark-more-menu` | frontend/index.html:7746 |
| `bookmark-no-match` | frontend/index.html:7792 |
| `bookmark-no-match-clear` | frontend/index.html:7796 |
| `bookmark-no-match-text` | frontend/index.html:7795 |
| `bookmark-note-input` | frontend/index.html:7778 |
| `bookmark-search` | frontend/index.html:7723 |
| `bookmark-sort` | frontend/index.html:7731 |
| `bookmark-title-input` | frontend/index.html:7773 |
| `bookmark-url-input` | frontend/index.html:7771 |
| `boot-splash` | frontend/index.html:91 |
| `boot-splash-progress-fill` | frontend/index.html:105 |
| `border-style-seg` | frontend/index.html:10330 |
| `brand-logo` | frontend/index.html:124 |
| `browse` | frontend/index.html:2195 |
| `builtin-embed-note` | frontend/index.html:9263 |
| `builtin-model-name` | frontend/index.html:9258 |
| `capture` | frontend/index.html:1360 |
| `capture-anywhere-box` | frontend/index.html:11055 |
| `capture-anywhere-help` | frontend/index.html:11065 |
| `capture-clear` | frontend/index.html:1505 |
| `capture-command` | frontend/index.html:11077 |
| `capture-command-copy` | frontend/index.html:11078 |
| `capture-help` | frontend/index.html:1373 |
| `capture-help-hint` | frontend/index.html:1390 |
| `capture-space-hint` | frontend/index.html:1611 |
| `category-list` | frontend/index.html:1276 |
| `change-password-help` | frontend/index.html:12239 |
| `changelog-body` | frontend/index.html:12954 |
| `changelog-fold` | frontend/index.html:12952 |
| `chat-actions-menu` | frontend/index.html:2661 |
| `chat-active-model` | frontend/index.html:2557 |
| `chat-attachments` | frontend/index.html:2746 |
| `chat-board-attachments` | frontend/index.html:2772 |
| `chat-clear` | frontend/index.html:2911 |
| `chat-compress` | frontend/index.html:2629 |
| `chat-compress-apply` | frontend/index.html:2674 |
| `chat-compress-cancel` | frontend/index.html:2675 |
| `chat-compress-panel` | frontend/index.html:2668 |
| `chat-compress-stats` | frontend/index.html:2670 |
| `chat-compress-text` | frontend/index.html:2671 |
| `chat-compressed` | frontend/index.html:2581 |
| `chat-context` | frontend/index.html:2574 |
| `chat-delete` | frontend/index.html:2641 |
| `chat-doc-attachments` | frontend/index.html:2757 |
| `chat-dock-more-btn` | frontend/index.html:3030 |
| `chat-dock-more-panel` | frontend/index.html:3035 |
| `chat-elapsed` | frontend/index.html:3113 |
| `chat-export` | frontend/index.html:2632 |
| `chat-feature-model` | frontend/index.html:2992 |
| `chat-file-attachments` | frontend/index.html:2764 |
| `chat-fork` | frontend/index.html:2626 |
| `chat-help` | frontend/index.html:2658 |
| `chat-help-text` | frontend/index.html:2659 |
| `chat-help-toggle` | frontend/index.html:2655 |
| `chat-image-attachments` | frontend/index.html:2751 |
| `chat-image-input` | frontend/index.html:2902 |
| `chat-input` | frontend/index.html:2909 |
| `chat-jump-latest` | frontend/index.html:2712 |
| `chat-jump-latest-dots` | frontend/index.html:2715 |
| `chat-jump-latest-label` | frontend/index.html:2716 |
| `chat-main` | frontend/index.html:2481 |
| `chat-messages` | frontend/index.html:2695 |
| `chat-mode-seg` | frontend/index.html:2995 |
| `chat-model-apply` | frontend/index.html:8850 |
| `chat-model-note` | frontend/index.html:8852 |
| `chat-model-panel` | frontend/index.html:8110 |
| `chat-model-select` | frontend/index.html:8849 |
| `chat-new` | frontend/index.html:2471 |
| `chat-nudge` | frontend/index.html:2794 |
| `chat-offline` | frontend/index.html:2741 |
| `chat-plan` | frontend/index.html:2958 |
| `chat-results` | frontend/index.html:2056 |
| `chat-selection-attachment` | frontend/index.html:2778 |
| `chat-send` | frontend/index.html:2913 |
| `chat-sidebar` | frontend/index.html:2450 |
| `chat-sidebar-sort` | frontend/index.html:2464 |
| `chat-skills` | frontend/index.html:2924 |
| `chat-status` | frontend/index.html:3101 |
| `chat-stop` | frontend/index.html:2914 |
| `chat-suggest` | frontend/index.html:2720 |
| `chat-title` | frontend/index.html:2546 |
| `chat-tune-search` | frontend/index.html:3078 |
| `chat-turns` | frontend/index.html:2565 |
| `chat-uncompress` | frontend/index.html:2583 |
| `chat-usage` | frontend/index.html:2576 |
| `chat-web-attachment` | frontend/index.html:2782 |
| `clear-app-cache` | frontend/index.html:12072 |
| `command-palette-clear` | frontend/index.html:634 |
| `command-palette-close` | frontend/index.html:605 |
| `command-palette-help` | frontend/index.html:609 |
| `command-palette-input` | frontend/index.html:631 |
| `command-palette-intro` | frontend/index.html:643 |
| `command-palette-menu` | frontend/index.html:689 |
| `command-palette-offline` | frontend/index.html:648 |
| `command-palette-overlay` | frontend/index.html:567 |
| `command-palette-results` | frontend/index.html:636 |
| `command-palette-starters` | frontend/index.html:665 |
| `command-palette-status` | frontend/index.html:680 |
| `command-palette-stop` | frontend/index.html:698 |
| `command-palette-use-note` | frontend/index.html:678 |
| `command-palette-use-note-label` | frontend/index.html:677 |
| `command-palette-use-note-text` | frontend/index.html:679 |
| `composer-voice-help` | frontend/index.html:9484 |
| `connections-card` | frontend/index.html:13066 |
| `connections-close` | frontend/index.html:13070 |
| `connections-list` | frontend/index.html:13076 |
| `connections-overlay` | frontend/index.html:13064 |
| `connections-status` | frontend/index.html:13075 |
| `connections-subject` | frontend/index.html:13074 |
| `connections-title` | frontend/index.html:13068 |
| `contents-collapse` | frontend/index.html:7855 |
| `contents-empty` | frontend/index.html:7873 |
| `contents-expand` | frontend/index.html:7853 |
| `contents-filter` | frontend/index.html:7823 |
| `contents-group` | frontend/index.html:7831 |
| `contents-help` | frontend/index.html:7843 |
| `contents-hint` | frontend/index.html:7870 |
| `contents-intro` | frontend/index.html:7861 |
| `contents-more` | frontend/index.html:7850 |
| `contents-no-match` | frontend/index.html:7872 |
| `contents-outline` | frontend/index.html:7871 |
| `contents-refresh` | frontend/index.html:7840 |
| `contents-summary` | frontend/index.html:7869 |
| `contrast-toggle` | frontend/index.html:10452 |
| `conv-browse-all` | frontend/index.html:2477 |
| `conv-empty` | frontend/index.html:2476 |
| `conversation-list` | frontend/index.html:2475 |
| `copy-btn` | frontend/index.html:2099 |
| `custom-css` | frontend/index.html:10849 |
| `custom-css-apply` | frontend/index.html:10852 |
| `custom-css-clear` | frontend/index.html:10853 |
| `custom-css-help` | frontend/index.html:10842 |
| `custom-css-status` | frontend/index.html:10854 |
| `custom-download` | frontend/index.html:9167 |
| `custom-model-cards` | frontend/index.html:9177 |
| `custom-model-check` | frontend/index.html:9174 |
| `custom-model-name` | frontend/index.html:9171 |
| `custom-model-note` | frontend/index.html:9176 |
| `custom-theme-name` | frontend/index.html:10135 |
| `custom-theme-save` | frontend/index.html:10139 |
| `custom-themes` | frontend/index.html:10133 |
| `dash-clock-date` | frontend/index.html:1191 |
| `dash-clock-time` | frontend/index.html:1190 |
| `dash-customise` | frontend/index.html:1232 |
| `dash-edit` | frontend/index.html:1261 |
| `dash-editbar` | frontend/index.html:1253 |
| `dash-find` | frontend/index.html:1223 |
| `dash-glance` | frontend/index.html:1188 |
| `dash-greeting` | frontend/index.html:1180 |
| `dash-grid` | frontend/index.html:1263 |
| `dash-help` | frontend/index.html:1238 |
| `dash-help-toggle` | frontend/index.html:1235 |
| `dash-hero` | frontend/index.html:1173 |
| `dash-hero-emblem` | frontend/index.html:1177 |
| `dash-hero-new` | frontend/index.html:1187 |
| `dash-hint` | frontend/index.html:1254 |
| `dash-mark` | frontend/index.html:10697 |
| `dash-mark-row` | frontend/index.html:10692 |
| `dash-more` | frontend/index.html:1241 |
| `dash-quicklinks` | frontend/index.html:1247 |
| `dash-submessage` | frontend/index.html:1181 |
| `dash-widgets-dialog` | frontend/index.html:1139 |
| `dash-widgets-list` | frontend/index.html:1148 |
| `dash-widgets-open` | frontend/index.html:1260 |
| `dash-widgets-search` | frontend/index.html:1147 |
| `dashboard-greeting-regenerate` | frontend/index.html:9508 |
| `dashboard-greeting-status` | frontend/index.html:9511 |
| `dashboard-persona-mark` | frontend/index.html:9506 |
| `dashboard-persona-select` | frontend/index.html:9507 |
| `density-seg` | frontend/index.html:10276 |
| `desktop-advanced-fold` | frontend/index.html:12940 |
| `desktop-console-hint` | frontend/index.html:12906 |
| `desktop-console-row` | frontend/index.html:12902 |
| `desktop-tray-hint` | frontend/index.html:12926 |
| `desktop-tray-row` | frontend/index.html:12922 |
| `doc-ai` | frontend/index.html:4608 |
| `doc-ai-accept` | frontend/index.html:5160 |
| `doc-ai-cancel` | frontend/index.html:5159 |
| `doc-ai-cancel-run` | frontend/index.html:5134 |
| `doc-ai-close` | frontend/index.html:5095 |
| `doc-ai-diff` | frontend/index.html:5154 |
| `doc-ai-diff-block` | frontend/index.html:5152 |
| `doc-ai-diff-head` | frontend/index.html:5153 |
| `doc-ai-history` | frontend/index.html:5092 |
| `doc-ai-history-dialog` | frontend/index.html:1103 |
| `doc-ai-history-empty` | frontend/index.html:1112 |
| `doc-ai-history-list` | frontend/index.html:1111 |
| `doc-ai-instruction` | frontend/index.html:5130 |
| `doc-ai-model` | frontend/index.html:4677 |
| `doc-ai-panel` | frontend/index.html:5069 |
| `doc-ai-result` | frontend/index.html:5157 |
| `doc-ai-result-block` | frontend/index.html:5143 |
| `doc-ai-run` | frontend/index.html:5133 |
| `doc-ai-scope` | frontend/index.html:5124 |
| `doc-ai-status` | frontend/index.html:5137 |
| `doc-ai-title` | frontend/index.html:5080 |
| `doc-ai-verb` | frontend/index.html:5109 |
| `doc-ai-verb-help` | frontend/index.html:5115 |
| `doc-attach-bookmark` | frontend/index.html:4452 |
| `doc-autocorrect` | frontend/index.html:4785 |
| `doc-autocorrect-row` | frontend/index.html:4782 |
| `doc-back` | frontend/index.html:4498 |
| `doc-backlinks` | frontend/index.html:4436 |
| `doc-backlinks-wrap` | frontend/index.html:4434 |
| `doc-bookmarks` | frontend/index.html:4451 |
| `doc-bookmarks-wrap` | frontend/index.html:4449 |
| `doc-browse-all` | frontend/index.html:4376 |
| `doc-caret` | frontend/index.html:5022 |
| `doc-code-format` | frontend/index.html:4616 |
| `doc-code-run` | frontend/index.html:4622 |
| `doc-code-wrap` | frontend/index.html:4741 |
| `doc-code-wrap-row` | frontend/index.html:4738 |
| `doc-comments` | frontend/index.html:4424 |
| `doc-comments-count` | frontend/index.html:4423 |
| `doc-comments-wrap` | frontend/index.html:4422 |
| `doc-complete` | frontend/index.html:4790 |
| `doc-complete-list` | frontend/index.html:5044 |
| `doc-complete-row` | frontend/index.html:4787 |
| `doc-connections` | frontend/index.html:4660 |
| `doc-content` | frontend/index.html:4974 |
| `doc-copy-link` | frontend/index.html:4671 |
| `doc-counts` | frontend/index.html:5001 |
| `doc-crumbs` | frontend/index.html:4959 |
| `doc-delete` | frontend/index.html:4808 |
| `doc-dictionary-add` | frontend/index.html:8567 |
| `doc-dictionary-close` | frontend/index.html:8532 |
| `doc-dictionary-count` | frontend/index.html:8538 |
| `doc-dictionary-dialog` | frontend/index.html:8512 |
| `doc-dictionary-export` | frontend/index.html:8530 |
| `doc-dictionary-field-hint` | frontend/index.html:8569 |
| `doc-dictionary-file` | frontend/index.html:8571 |
| `doc-dictionary-help` | frontend/index.html:8539 |
| `doc-dictionary-import` | frontend/index.html:8528 |
| `doc-dictionary-list` | frontend/index.html:8570 |
| `doc-dictionary-search` | frontend/index.html:8564 |
| `doc-dictionary-title` | frontend/index.html:8516 |
| `doc-dim-others` | frontend/index.html:4756 |
| `doc-dock-menu` | frontend/index.html:4641 |
| `doc-editor` | frontend/index.html:4982 |
| `doc-empty` | frontend/index.html:4375 |
| `doc-export-docx` | frontend/index.html:4708 |
| `doc-export-html` | frontend/index.html:4692 |
| `doc-export-md` | frontend/index.html:4683 |
| `doc-export-pdf` | frontend/index.html:4710 |
| `doc-export-zip` | frontend/index.html:4701 |
| `doc-extract` | frontend/index.html:4679 |
| `doc-file-type` | frontend/index.html:4648 |
| `doc-file-type-label` | frontend/index.html:4647 |
| `doc-find-bar` | frontend/index.html:4943 |
| `doc-find-close` | frontend/index.html:4951 |
| `doc-find-count` | frontend/index.html:4945 |
| `doc-find-input` | frontend/index.html:4944 |
| `doc-find-next` | frontend/index.html:4947 |
| `doc-find-prev` | frontend/index.html:4946 |
| `doc-find-toggle` | frontend/index.html:4893 |
| `doc-focus-bar` | frontend/index.html:4307 |
| `doc-focus-exit` | frontend/index.html:4329 |
| `doc-focus-facts` | frontend/index.html:4309 |
| `doc-focus-fullscreen` | frontend/index.html:4327 |
| `doc-focus-prose` | frontend/index.html:4325 |
| `doc-focus-prose-count` | frontend/index.html:4326 |
| `doc-focus-saved` | frontend/index.html:4311 |
| `doc-focus-sidebar` | frontend/index.html:4317 |
| `doc-focus-title` | frontend/index.html:4308 |
| `doc-focus-toggle` | frontend/index.html:4638 |
| `doc-focus-tools` | frontend/index.html:4319 |
| `doc-focus-words` | frontend/index.html:4310 |
| `doc-format-show` | frontend/index.html:4606 |
| `doc-format-toggle` | frontend/index.html:4651 |
| `doc-format-toggle-label` | frontend/index.html:4652 |
| `doc-goal-label` | frontend/index.html:5008 |
| `doc-grammar-check` | frontend/index.html:8585 |
| `doc-gutter` | frontend/index.html:4973 |
| `doc-history` | frontend/index.html:4669 |
| `doc-history-dialog` | frontend/index.html:1074 |
| `doc-history-empty` | frontend/index.html:1097 |
| `doc-history-filter` | frontend/index.html:1090 |
| `doc-history-list` | frontend/index.html:1096 |
| `doc-list` | frontend/index.html:4374 |
| `doc-map-headings` | frontend/index.html:4681 |
| `doc-margin` | frontend/index.html:4985 |
| `doc-margin-reader` | frontend/index.html:4763 |
| `doc-new` | frontend/index.html:4359 |
| `doc-new-template` | frontend/index.html:4369 |
| `doc-notes` | frontend/index.html:4443 |
| `doc-notes-wrap` | frontend/index.html:4441 |
| `doc-outline` | frontend/index.html:4402 |
| `doc-outline-count` | frontend/index.html:4384 |
| `doc-outline-empty` | frontend/index.html:4390 |
| `doc-outline-filter` | frontend/index.html:4399 |
| `doc-outline-wrap` | frontend/index.html:4383 |
| `doc-panes` | frontend/index.html:4962 |
| `doc-phone-bar` | frontend/index.html:4920 |
| `doc-phone-insert` | frontend/index.html:4934 |
| `doc-preview` | frontend/index.html:4987 |
| `doc-prose` | frontend/index.html:5011 |
| `doc-prose-count` | frontend/index.html:5013 |
| `doc-prose-panel` | frontend/index.html:5039 |
| `doc-read-aloud` | frontend/index.html:4806 |
| `doc-read-stop` | frontend/index.html:5019 |
| `doc-replace-all` | frontend/index.html:4950 |
| `doc-replace-input` | frontend/index.html:4948 |
| `doc-replace-one` | frontend/index.html:4949 |
| `doc-saved` | frontend/index.html:4528 |
| `doc-serif` | frontend/index.html:4766 |
| `doc-sidebar` | frontend/index.html:4341 |
| `doc-sidebar-list` | frontend/index.html:4355 |
| `doc-sidebar-outline` | frontend/index.html:4380 |
| `doc-sidebar-tabs` | frontend/index.html:4347 |
| `doc-smart-punctuation` | frontend/index.html:8592 |
| `doc-source-wrap` | frontend/index.html:4968 |
| `doc-spelling-variant` | frontend/index.html:8578 |
| `doc-status` | frontend/index.html:4989 |
| `doc-statusbar` | frontend/index.html:5000 |
| `doc-storage-dialog` | frontend/index.html:891 |
| `doc-storage-path` | frontend/index.html:903 |
| `doc-storage-toggle` | frontend/index.html:4460 |
| `doc-suggest-accept-all` | frontend/index.html:4802 |
| `doc-suggest-menu` | frontend/index.html:5051 |
| `doc-suggest-mode` | frontend/index.html:4798 |
| `doc-suggest-next` | frontend/index.html:4800 |
| `doc-suggest-reject-all` | frontend/index.html:4804 |
| `doc-suggest-row` | frontend/index.html:4795 |
| `doc-suggest-status` | frontend/index.html:5016 |
| `doc-template-dialog` | frontend/index.html:919 |
| `doc-template-list` | frontend/index.html:936 |
| `doc-template-preview` | frontend/index.html:937 |
| `doc-template-use` | frontend/index.html:941 |
| `doc-title` | frontend/index.html:4500 |
| `doc-toolbar` | frontend/index.html:4816 |
| `doc-toolbar-colour` | frontend/index.html:4858 |
| `doc-toolbar-insert` | frontend/index.html:4881 |
| `doc-toolbar-mode` | frontend/index.html:4731 |
| `doc-toolbar-mode-label` | frontend/index.html:4733 |
| `doc-typewriter` | frontend/index.html:4759 |
| `doc-view-menu` | frontend/index.html:4565 |
| `doc-view-seg` | frontend/index.html:4553 |
| `doc-whitespace` | frontend/index.html:4746 |
| `doc-whitespace-row` | frontend/index.html:4743 |
| `doc-width-menu` | frontend/index.html:4728 |
| `doc-width-menu-label` | frontend/index.html:4730 |
| `doc-width-toggle` | frontend/index.html:4899 |
| `doc-word-goal` | frontend/index.html:5007 |
| `doc-word-goal-dialog` | frontend/index.html:1117 |
| `doc-word-goal-input` | frontend/index.html:1129 |
| `doc-word-goal-submit` | frontend/index.html:1132 |
| `draft-add-source` | frontend/index.html:1811 |
| `draft-cancel` | frontend/index.html:1659 |
| `draft-compose` | frontend/index.html:1702 |
| `draft-continue-note` | frontend/index.html:1689 |
| `draft-copy` | frontend/index.html:1874 |
| `draft-count` | frontend/index.html:1828 |
| `draft-discard` | frontend/index.html:1698 |
| `draft-extract` | frontend/index.html:1682 |
| `draft-feature-model` | frontend/index.html:1656 |
| `draft-help` | frontend/index.html:1666 |
| `draft-help-body` | frontend/index.html:1705 |
| `draft-insert` | frontend/index.html:1876 |
| `draft-instruction` | frontend/index.html:1853 |
| `draft-kind` | frontend/index.html:1765 |
| `draft-length` | frontend/index.html:1805 |
| `draft-model` | frontend/index.html:1696 |
| `draft-more-menu` | frontend/index.html:1671 |
| `draft-offline` | frontend/index.html:1722 |
| `draft-quickstarts` | frontend/index.html:1729 |
| `draft-refine` | frontend/index.html:1856 |
| `draft-save` | frontend/index.html:1878 |
| `draft-sources` | frontend/index.html:1817 |
| `draft-sources-count` | frontend/index.html:1753 |
| `draft-status` | frontend/index.html:1819 |
| `draft-tags` | frontend/index.html:1867 |
| `draft-target` | frontend/index.html:1827 |
| `draft-text` | frontend/index.html:1840 |
| `draft-thinking` | frontend/index.html:1833 |
| `draft-thoughts` | frontend/index.html:1757 |
| `draft-thoughts-count` | frontend/index.html:1754 |
| `draft-title` | frontend/index.html:1679 |
| `draft-tone` | frontend/index.html:1797 |
| `draft-undo` | frontend/index.html:1661 |
| `draft-versions` | frontend/index.html:1846 |
| `duplicate-groups` | frontend/index.html:11832 |
| `duplicate-status` | frontend/index.html:11830 |
| `duplicate-threshold` | frontend/index.html:11826 |
| `duplicate-threshold-value` | frontend/index.html:11828 |
| `duplicates-help` | frontend/index.html:11815 |
| `editor-menu` | frontend/index.html:13647 |
| `editor-menu-list` | frontend/index.html:13648 |
| `editor-menu-preview` | frontend/index.html:13650 |
| `embed-choices` | frontend/index.html:9318 |
| `embed-choices-status` | frontend/index.html:9319 |
| `embed-found` | frontend/index.html:9324 |
| `embed-found-empty` | frontend/index.html:9325 |
| `embed-models-cache` | frontend/index.html:10971 |
| `embed-models-list` | frontend/index.html:10970 |
| `embed-models-status` | frontend/index.html:10972 |
| `embed-pull-go` | frontend/index.html:9334 |
| `embed-pull-name` | frontend/index.html:9331 |
| `embed-pull-status` | frontend/index.html:9336 |
| `embedding-apply` | frontend/index.html:9303 |
| `embedding-error` | frontend/index.html:9191 |
| `embedding-error-fix` | frontend/index.html:9200 |
| `embedding-error-fix-row` | frontend/index.html:9199 |
| `embedding-error-fix-status` | frontend/index.html:9203 |
| `embedding-model-select` | frontend/index.html:9302 |
| `embedding-models-help` | frontend/index.html:10961 |
| `embedding-offline-note` | frontend/index.html:9309 |
| `embedding-ollama-note` | frontend/index.html:9305 |
| `empty-message` | frontend/index.html:2376 |
| `entries-heading` | frontend/index.html:2219 |
| `entries-heading-label` | frontend/index.html:2219 |
| `entry-attach-existing` | frontend/index.html:1556 |
| `entry-attach-file` | frontend/index.html:1546 |
| `entry-attach-file-input` | frontend/index.html:1548 |
| `entry-attachment-chips` | frontend/index.html:1512 |
| `entry-category` | frontend/index.html:1582 |
| `entry-content` | frontend/index.html:1500 |
| `entry-count` | frontend/index.html:1506 |
| `entry-document-adder` | frontend/index.html:1594 |
| `entry-document-chips` | frontend/index.html:1595 |
| `entry-list` | frontend/index.html:2370 |
| `entry-preview-toggle` | frontend/index.html:1494 |
| `entry-tag-suggestions` | frontend/index.html:1530 |
| `entry-tags` | frontend/index.html:1520 |
| `entry-template` | frontend/index.html:1381 |
| `entry-title` | frontend/index.html:1447 |
| `export-backup-password` | frontend/index.html:11759 |
| `export-backup-zip` | frontend/index.html:11755 |
| `export-csv` | frontend/index.html:11753 |
| `export-help` | frontend/index.html:11744 |
| `export-json` | frontend/index.html:11752 |
| `export-md` | frontend/index.html:11754 |
| `export-save-dir-row` | frontend/index.html:11781 |
| `export-save-dir-status` | frontend/index.html:11786 |
| `exports-empty` | frontend/index.html:11801 |
| `exports-list` | frontend/index.html:11802 |
| `exports-recent` | frontend/index.html:11794 |
| `exports-refresh` | frontend/index.html:11796 |
| `extract-cancel` | frontend/index.html:8616 |
| `extract-close` | frontend/index.html:8606 |
| `extract-commit` | frontend/index.html:8617 |
| `extract-links-list` | frontend/index.html:8612 |
| `extract-notes-list` | frontend/index.html:8611 |
| `extract-panel` | frontend/index.html:8600 |
| `extract-status` | frontend/index.html:8610 |
| `extras-bulk-done` | frontend/index.html:10915 |
| `extras-bulk-install` | frontend/index.html:10912 |
| `extras-bulk-reinstall` | frontend/index.html:10913 |
| `extras-bulk-remove` | frontend/index.html:10914 |
| `extras-bundles` | frontend/index.html:10907 |
| `extras-list` | frontend/index.html:10918 |
| `extras-log` | frontend/index.html:10922 |
| `extras-log-wrap` | frontend/index.html:10920 |
| `extras-selectbar` | frontend/index.html:10909 |
| `extras-selected-count` | frontend/index.html:10910 |
| `extras-status` | frontend/index.html:10919 |
| `face-look` | frontend/index.html:10685 |
| `face-look-row` | frontend/index.html:10680 |
| `feature-models-help` | frontend/index.html:9021 |
| `feature-models-list` | frontend/index.html:9015 |
| `feature-models-reset` | frontend/index.html:9017 |
| `feature-models-reset-note` | frontend/index.html:9020 |
| `features-card` | frontend/index.html:13532 |
| `features-close` | frontend/index.html:13536 |
| `features-count` | frontend/index.html:13548 |
| `features-list` | frontend/index.html:13549 |
| `features-overlay` | frontend/index.html:13530 |
| `features-search` | frontend/index.html:13545 |
| `find-duplicates` | frontend/index.html:11824 |
| `finder-close` | frontend/index.html:737 |
| `finder-filters` | frontend/index.html:768 |
| `finder-help` | frontend/index.html:741 |
| `finder-input` | frontend/index.html:757 |
| `finder-overlay` | frontend/index.html:723 |
| `finder-results` | frontend/index.html:783 |
| `finder-sort` | frontend/index.html:772 |
| `finder-summary` | frontend/index.html:782 |
| `font-seg` | frontend/index.html:10263 |
| `fontsize-seg` | frontend/index.html:10245 |
| `forgot-password-help` | frontend/index.html:12369 |
| `glass-blur` | frontend/index.html:10433 |
| `glass-blur-row` | frontend/index.html:10427 |
| `glass-blur-value` | frontend/index.html:10435 |
| `glass-opacity` | frontend/index.html:10445 |
| `glass-opacity-row` | frontend/index.html:10439 |
| `glass-opacity-value` | frontend/index.html:10447 |
| `glass-row` | frontend/index.html:10392 |
| `glass-sheen-row` | frontend/index.html:10408 |
| `glass-sheen-strength` | frontend/index.html:10421 |
| `glass-sheen-strength-row` | frontend/index.html:10416 |
| `glass-sheen-strength-value` | frontend/index.html:10423 |
| `glass-sheen-toggle` | frontend/index.html:10409 |
| `glass-toggle` | frontend/index.html:10393 |
| `global-find-bar` | frontend/index.html:13001 |
| `global-find-close` | frontend/index.html:13006 |
| `global-find-count` | frontend/index.html:13003 |
| `global-find-input` | frontend/index.html:13002 |
| `global-find-next` | frontend/index.html:13005 |
| `global-find-prev` | frontend/index.html:13004 |
| `graph-add-node` | frontend/index.html:3641 |
| `graph-arrows` | frontend/index.html:4002 |
| `graph-attachments` | frontend/index.html:3955 |
| `graph-box` | frontend/index.html:4159 |
| `graph-canvas` | frontend/index.html:4184 |
| `graph-card` | frontend/index.html:3517 |
| `graph-colour` | frontend/index.html:3760 |
| `graph-colour-label` | frontend/index.html:3759 |
| `graph-concept-maps` | frontend/index.html:3571 |
| `graph-curved` | frontend/index.html:3990 |
| `graph-display` | frontend/index.html:3981 |
| `graph-display-label` | frontend/index.html:3982 |
| `graph-documents` | frontend/index.html:3938 |
| `graph-empty` | frontend/index.html:4259 |
| `graph-empty-emblem` | frontend/index.html:4265 |
| `graph-empty-filtered` | frontend/index.html:4279 |
| `graph-empty-filtered-why` | frontend/index.html:4281 |
| `graph-empty-fresh` | frontend/index.html:4271 |
| `graph-empty-show-all` | frontend/index.html:4282 |
| `graph-entities` | frontend/index.html:3934 |
| `graph-export-png` | frontend/index.html:3638 |
| `graph-filter-label` | frontend/index.html:4020 |
| `graph-filter-section` | frontend/index.html:4019 |
| `graph-focus-clear` | frontend/index.html:3582 |
| `graph-focus-depth` | frontend/index.html:3807 |
| `graph-focus-in` | frontend/index.html:3813 |
| `graph-focus-label` | frontend/index.html:3804 |
| `graph-focus-neighbours` | frontend/index.html:3821 |
| `graph-focus-out` | frontend/index.html:3817 |
| `graph-focus-section` | frontend/index.html:3802 |
| `graph-fullscreen` | frontend/index.html:4257 |
| `graph-gravity` | frontend/index.html:3837 |
| `graph-group` | frontend/index.html:3859 |
| `graph-group-add` | frontend/index.html:4070 |
| `graph-group-query` | frontend/index.html:4068 |
| `graph-groups` | frontend/index.html:4073 |
| `graph-groups-label` | frontend/index.html:4059 |
| `graph-groups-section` | frontend/index.html:4058 |
| `graph-help-panel` | frontend/index.html:3664 |
| `graph-help-toggle` | frontend/index.html:3591 |
| `graph-hide-orphans` | frontend/index.html:3963 |
| `graph-highlight-clear` | frontend/index.html:3581 |
| `graph-label-fade` | frontend/index.html:4007 |
| `graph-label-plates` | frontend/index.html:3998 |
| `graph-labels` | frontend/index.html:3986 |
| `graph-layout` | frontend/index.html:3730 |
| `graph-layout-label` | frontend/index.html:3726 |
| `graph-legend` | frontend/index.html:4157 |
| `graph-legend-toggle` | frontend/index.html:3790 |
| `graph-length-score` | frontend/index.html:3853 |
| `graph-link-force` | frontend/index.html:3847 |
| `graph-link-kinds` | frontend/index.html:4022 |
| `graph-link-width` | frontend/index.html:4012 |
| `graph-maps` | frontend/index.html:3947 |
| `graph-minimap` | frontend/index.html:4162 |
| `graph-minimap-corner` | frontend/index.html:4080 |
| `graph-minimap-dots` | frontend/index.html:4173 |
| `graph-minimap-edges` | frontend/index.html:4172 |
| `graph-minimap-frame` | frontend/index.html:4175 |
| `graph-minimap-here` | frontend/index.html:4174 |
| `graph-minimap-label` | frontend/index.html:4077 |
| `graph-minimap-section` | frontend/index.html:4076 |
| `graph-minimap-size` | frontend/index.html:4091 |
| `graph-minimap-svg` | frontend/index.html:4170 |
| `graph-more-menu` | frontend/index.html:3616 |
| `graph-nebula` | frontend/index.html:3994 |
| `graph-new` | frontend/index.html:4235 |
| `graph-new-close` | frontend/index.html:4239 |
| `graph-new-content` | frontend/index.html:4244 |
| `graph-new-hint` | frontend/index.html:4241 |
| `graph-new-note-title` | frontend/index.html:4242 |
| `graph-new-save` | frontend/index.html:4249 |
| `graph-new-status` | frontend/index.html:4250 |
| `graph-new-tags` | frontend/index.html:4246 |
| `graph-new-title` | frontend/index.html:4238 |
| `graph-options` | frontend/index.html:3710 |
| `graph-options-reset` | frontend/index.html:4113 |
| `graph-options-toggle` | frontend/index.html:3611 |
| `graph-pane` | frontend/index.html:1292 |
| `graph-pane-body` | frontend/index.html:1308 |
| `graph-pane-box` | frontend/index.html:1309 |
| `graph-pane-canvas` | frontend/index.html:1310 |
| `graph-pane-count` | frontend/index.html:1295 |
| `graph-pane-depth` | frontend/index.html:1319 |
| `graph-pane-empty` | frontend/index.html:1312 |
| `graph-pane-focus` | frontend/index.html:1297 |
| `graph-pane-in` | frontend/index.html:1325 |
| `graph-pane-neighbours` | frontend/index.html:1333 |
| `graph-pane-options` | frontend/index.html:1315 |
| `graph-pane-out` | frontend/index.html:1329 |
| `graph-pane-toggle` | frontend/index.html:1301 |
| `graph-physics` | frontend/index.html:3826 |
| `graph-physics-label` | frontend/index.html:3834 |
| `graph-popup` | frontend/index.html:4187 |
| `graph-popup-actions` | frontend/index.html:4230 |
| `graph-popup-category` | frontend/index.html:4198 |
| `graph-popup-close` | frontend/index.html:4200 |
| `graph-popup-confidence` | frontend/index.html:4197 |
| `graph-popup-content` | frontend/index.html:4217 |
| `graph-popup-info` | frontend/index.html:4204 |
| `graph-popup-media` | frontend/index.html:4216 |
| `graph-popup-props` | frontend/index.html:4211 |
| `graph-popup-save` | frontend/index.html:4226 |
| `graph-popup-saverow` | frontend/index.html:4225 |
| `graph-popup-status` | frontend/index.html:4227 |
| `graph-popup-tags` | frontend/index.html:4218 |
| `graph-popup-title` | frontend/index.html:4196 |
| `graph-popup-topic` | frontend/index.html:4207 |
| `graph-prop-chips` | frontend/index.html:4024 |
| `graph-refresh` | frontend/index.html:3590 |
| `graph-reshuffle` | frontend/index.html:3868 |
| `graph-search` | frontend/index.html:3578 |
| `graph-selection-clear` | frontend/index.html:3662 |
| `graph-selection-count` | frontend/index.html:3657 |
| `graph-selection-dock` | frontend/index.html:3656 |
| `graph-selection-link` | frontend/index.html:3659 |
| `graph-selection-map` | frontend/index.html:3661 |
| `graph-selection-tag` | frontend/index.html:3658 |
| `graph-selection-unlink` | frontend/index.html:3660 |
| `graph-shape` | frontend/index.html:3747 |
| `graph-shape-label` | frontend/index.html:3746 |
| `graph-shape-row` | frontend/index.html:3745 |
| `graph-show-help` | frontend/index.html:3892 |
| `graph-show-label` | frontend/index.html:3876 |
| `graph-similarity` | frontend/index.html:3930 |
| `graph-similarity-min` | frontend/index.html:3973 |
| `graph-similarity-min-row` | frontend/index.html:3971 |
| `graph-size` | frontend/index.html:3779 |
| `graph-size-label` | frontend/index.html:3778 |
| `graph-spread` | frontend/index.html:3842 |
| `graph-stats` | frontend/index.html:3563 |
| `graph-svg` | frontend/index.html:4185 |
| `graph-tags` | frontend/index.html:3951 |
| `graph-temporal` | frontend/index.html:4026 |
| `graph-time-heading` | frontend/index.html:4028 |
| `graph-time-label` | frontend/index.html:4039 |
| `graph-time-play` | frontend/index.html:4031 |
| `graph-time-slider` | frontend/index.html:4033 |
| `graph-toggle-group` | frontend/index.html:3873 |
| `graph-topic` | frontend/index.html:4142 |
| `graph-trace` | frontend/index.html:4124 |
| `graph-trace-clear` | frontend/index.html:4136 |
| `graph-trace-ends` | frontend/index.html:4132 |
| `graph-trace-result` | frontend/index.html:4139 |
| `graph-trace-toggle` | frontend/index.html:3788 |
| `graph-unpin-all` | frontend/index.html:3862 |
| `graph-unresolved` | frontend/index.html:3959 |
| `graph-view-delete` | frontend/index.html:3636 |
| `graph-view-label` | frontend/index.html:3724 |
| `graph-view-picker` | frontend/index.html:3632 |
| `graph-view-save` | frontend/index.html:3634 |
| `graph-view-section` | frontend/index.html:3722 |
| `graph-zoom` | frontend/index.html:4253 |
| `graph-zoom-fit` | frontend/index.html:4256 |
| `graph-zoom-in` | frontend/index.html:4254 |
| `graph-zoom-out` | frontend/index.html:4255 |
| `harmony-apply` | frontend/index.html:10233 |
| `harmony-base` | frontend/index.html:10225 |
| `harmony-kind` | frontend/index.html:10227 |
| `harmony-note` | frontend/index.html:10235 |
| `health-counts` | frontend/index.html:12736 |
| `health-db-size` | frontend/index.html:12722 |
| `health-files-size` | frontend/index.html:12729 |
| `health-jobs` | frontend/index.html:12743 |
| `health-last-error` | frontend/index.html:12771 |
| `health-latency` | frontend/index.html:12764 |
| `health-search` | frontend/index.html:12757 |
| `help-chat-empty` | frontend/index.html:529 |
| `help-chat-form` | frontend/index.html:544 |
| `help-chat-group` | frontend/index.html:495 |
| `help-chat-help` | frontend/index.html:554 |
| `help-chat-input` | frontend/index.html:545 |
| `help-chat-menu` | frontend/index.html:552 |
| `help-chat-messages` | frontend/index.html:503 |
| `help-chat-send` | frontend/index.html:546 |
| `help-chat-starters` | frontend/index.html:535 |
| `help-empty` | frontend/index.html:12638 |
| `help-search` | frontend/index.html:12602 |
| `help-search-status` | frontend/index.html:12605 |
| `help-topics` | frontend/index.html:12637 |
| `history-card` | frontend/index.html:13038 |
| `history-close` | frontend/index.html:13042 |
| `history-list` | frontend/index.html:13047 |
| `history-overlay` | frontend/index.html:13036 |
| `history-status` | frontend/index.html:13046 |
| `hud` | frontend/index.html:13016 |
| `import-app-box` | frontend/index.html:11925 |
| `import-app-help` | frontend/index.html:11935 |
| `import-app-status` | frontend/index.html:11965 |
| `import-apple` | frontend/index.html:11963 |
| `import-apple-file` | frontend/index.html:11961 |
| `import-dir` | frontend/index.html:11890 |
| `import-dir-path` | frontend/index.html:11889 |
| `import-dir-status` | frontend/index.html:11892 |
| `import-document` | frontend/index.html:11908 |
| `import-document-file` | frontend/index.html:11907 |
| `import-document-help` | frontend/index.html:11912 |
| `import-document-status` | frontend/index.html:11910 |
| `import-evernote` | frontend/index.html:11960 |
| `import-evernote-file` | frontend/index.html:11958 |
| `import-md` | frontend/index.html:11878 |
| `import-md-files` | frontend/index.html:11877 |
| `import-md-folder` | frontend/index.html:11879 |
| `import-md-folder-btn` | frontend/index.html:11882 |
| `import-md-status` | frontend/index.html:11885 |
| `import-notion` | frontend/index.html:11954 |
| `import-notion-file` | frontend/index.html:11952 |
| `import-obsidian` | frontend/index.html:11957 |
| `import-obsidian-file` | frontend/index.html:11955 |
| `improve-apply` | frontend/index.html:13271 |
| `improve-btn` | frontend/index.html:1572 |
| `improve-card` | frontend/index.html:13237 |
| `improve-close` | frontend/index.html:13241 |
| `improve-custom-go` | frontend/index.html:13254 |
| `improve-custom-input` | frontend/index.html:13252 |
| `improve-custom-row` | frontend/index.html:13251 |
| `improve-modes` | frontend/index.html:13245 |
| `improve-original` | frontend/index.html:13259 |
| `improve-overlay` | frontend/index.html:13236 |
| `improve-result` | frontend/index.html:13263 |
| `improve-retry` | frontend/index.html:13270 |
| `improve-status` | frontend/index.html:13266 |
| `installed-box` | frontend/index.html:9087 |
| `installed-list` | frontend/index.html:9090 |
| `job-runs-group` | frontend/index.html:11486 |
| `job-runs-help` | frontend/index.html:11496 |
| `job-runs-list` | frontend/index.html:11510 |
| `lan-help` | frontend/index.html:12146 |
| `lan-trust-help` | frontend/index.html:12203 |
| `learned-bulk-delete` | frontend/index.html:9875 |
| `learned-bulk-done` | frontend/index.html:9876 |
| `learned-bulk-reset` | frontend/index.html:9874 |
| `learned-count` | frontend/index.html:9885 |
| `learned-empty` | frontend/index.html:9880 |
| `learned-export` | frontend/index.html:9894 |
| `learned-forget` | frontend/index.html:9895 |
| `learned-from-you` | frontend/index.html:9814 |
| `learned-help` | frontend/index.html:9815 |
| `learned-kind` | frontend/index.html:9861 |
| `learned-list` | frontend/index.html:9879 |
| `learned-next` | frontend/index.html:9886 |
| `learned-pager` | frontend/index.html:9883 |
| `learned-paused-banner` | frontend/index.html:9842 |
| `learned-prev` | frontend/index.html:9884 |
| `learned-run-note` | frontend/index.html:9851 |
| `learned-run-now` | frontend/index.html:9850 |
| `learned-search` | frontend/index.html:9864 |
| `learned-selectbar` | frontend/index.html:9871 |
| `learned-selected-count` | frontend/index.html:9872 |
| `learned-status` | frontend/index.html:9867 |
| `learned-switches` | frontend/index.html:9843 |
| `learned-switches-group` | frontend/index.html:9839 |
| `library-activity-export` | frontend/index.html:5526 |
| `library-activitybar` | frontend/index.html:5523 |
| `library-bin-empty` | frontend/index.html:5519 |
| `library-bin-note` | frontend/index.html:5517 |
| `library-binbar` | frontend/index.html:5516 |
| `library-boards-empty` | frontend/index.html:5985 |
| `library-boards-filter` | frontend/index.html:5982 |
| `library-boards-grid` | frontend/index.html:5984 |
| `library-boards-more` | frontend/index.html:5940 |
| `library-boards-new-map` | frontend/index.html:5994 |
| `library-boards-no-match` | frontend/index.html:5997 |
| `library-boards-refresh` | frontend/index.html:5914 |
| `library-boards-search` | frontend/index.html:5869 |
| `library-boards-sort` | frontend/index.html:5878 |
| `library-boards-view` | frontend/index.html:5891 |
| `library-bulk-delete` | frontend/index.html:5538 |
| `library-bulk-open` | frontend/index.html:5536 |
| `library-bulk-restore` | frontend/index.html:5537 |
| `library-clear-selection` | frontend/index.html:5539 |
| `library-docs-bulk-delete` | frontend/index.html:5686 |
| `library-docs-clear-selection` | frontend/index.html:5687 |
| `library-docs-empty` | frontend/index.html:5696 |
| `library-docs-help` | frontend/index.html:5631 |
| `library-docs-help-toggle` | frontend/index.html:5628 |
| `library-docs-import` | frontend/index.html:5645 |
| `library-docs-import-input` | frontend/index.html:5647 |
| `library-docs-list` | frontend/index.html:5690 |
| `library-docs-more-menu` | frontend/index.html:5634 |
| `library-docs-new` | frontend/index.html:5666 |
| `library-docs-no-match` | frontend/index.html:5702 |
| `library-docs-page-next` | frontend/index.html:5694 |
| `library-docs-page-prev` | frontend/index.html:5692 |
| `library-docs-page-size` | frontend/index.html:5657 |
| `library-docs-page-status` | frontend/index.html:5693 |
| `library-docs-pagination` | frontend/index.html:5691 |
| `library-docs-property` | frontend/index.html:5609 |
| `library-docs-refresh` | frontend/index.html:5626 |
| `library-docs-search` | frontend/index.html:5595 |
| `library-docs-selectbar` | frontend/index.html:5681 |
| `library-docs-selected-count` | frontend/index.html:5683 |
| `library-docs-sort` | frontend/index.html:5617 |
| `library-empty` | frontend/index.html:5549 |
| `library-empty-clear` | frontend/index.html:5558 |
| `library-empty-create` | frontend/index.html:5562 |
| `library-empty-text` | frontend/index.html:5554 |
| `library-empty-title` | frontend/index.html:5551 |
| `library-filter-menu` | frontend/index.html:5453 |
| `library-filters` | frontend/index.html:5510 |
| `library-grid` | frontend/index.html:5542 |
| `library-help` | frontend/index.html:5487 |
| `library-help-toggle` | frontend/index.html:5484 |
| `library-images-empty` | frontend/index.html:7671 |
| `library-images-grid` | frontend/index.html:7670 |
| `library-images-help` | frontend/index.html:7635 |
| `library-images-intro` | frontend/index.html:7653 |
| `library-images-no-match` | frontend/index.html:7677 |
| `library-images-refresh` | frontend/index.html:7634 |
| `library-images-search` | frontend/index.html:7569 |
| `library-images-upload` | frontend/index.html:7650 |
| `library-images-upload-input` | frontend/index.html:7633 |
| `library-media-bulk-delete` | frontend/index.html:7666 |
| `library-media-clear-selection` | frontend/index.html:7667 |
| `library-media-empty-body` | frontend/index.html:7674 |
| `library-media-empty-icon` | frontend/index.html:7672 |
| `library-media-empty-title` | frontend/index.html:7673 |
| `library-media-more-menu` | frontend/index.html:7646 |
| `library-media-origin-btn` | frontend/index.html:7603 |
| `library-media-origin-label` | frontend/index.html:7604 |
| `library-media-origin-menu` | frontend/index.html:7602 |
| `library-media-origins` | frontend/index.html:7605 |
| `library-media-read` | frontend/index.html:7587 |
| `library-media-selectbar` | frontend/index.html:7661 |
| `library-media-selected-count` | frontend/index.html:7663 |
| `library-media-sort` | frontend/index.html:7612 |
| `library-media-title` | frontend/index.html:7560 |
| `library-media-view-preview` | frontend/index.html:7626 |
| `library-media-view-type` | frontend/index.html:7628 |
| `library-more-menu` | frontend/index.html:5490 |
| `library-new-doc` | frontend/index.html:5504 |
| `library-overview` | frontend/index.html:5508 |
| `library-page-next` | frontend/index.html:5547 |
| `library-page-prev` | frontend/index.html:5545 |
| `library-page-size` | frontend/index.html:5495 |
| `library-page-status` | frontend/index.html:5546 |
| `library-pagination` | frontend/index.html:5544 |
| `library-refresh` | frontend/index.html:5482 |
| `library-search` | frontend/index.html:5449 |
| `library-selectbar` | frontend/index.html:5531 |
| `library-selected-count` | frontend/index.html:5533 |
| `library-semantic-toggle` | frontend/index.html:5458 |
| `library-show-binned` | frontend/index.html:5462 |
| `library-skills-section` | frontend/index.html:5709 |
| `library-sort` | frontend/index.html:5469 |
| `library-subtab-docs` | frontend/index.html:5410 |
| `library-subtabs` | frontend/index.html:5397 |
| `library-truncated` | frontend/index.html:5543 |
| `library-view` | frontend/index.html:5475 |
| `library-view-contents` | frontend/index.html:7806 |
| `library-view-docs` | frontend/index.html:5572 |
| `library-view-documents` | frontend/index.html:5426 |
| `library-view-links` | frontend/index.html:7685 |
| `library-view-media` | frontend/index.html:7540 |
| `library-view-skills` | frontend/index.html:5706 |
| `library-view-whiteboard` | frontend/index.html:5827 |
| `link-suggest-btn` | frontend/index.html:4111 |
| `live-region` | frontend/index.html:13019 |
| `llm-base-url` | frontend/index.html:8817 |
| `llm-privacy-warning` | frontend/index.html:8842 |
| `llm-provider-apply` | frontend/index.html:8818 |
| `llm-provider-note` | frontend/index.html:8822 |
| `llm-provider-select` | frontend/index.html:8813 |
| `llm-provider-status` | frontend/index.html:8838 |
| `local-only-ai` | frontend/index.html:8826 |
| `local-only-wrap` | frontend/index.html:8825 |
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
| `log-filter` | frontend/index.html:12491 |
| `log-follow` | frontend/index.html:12554 |
| `log-follow-label` | frontend/index.html:12552 |
| `log-level` | frontend/index.html:12542 |
| `log-list` | frontend/index.html:12586 |
| `log-live` | frontend/index.html:12486 |
| `log-requests` | frontend/index.html:12550 |
| `log-source` | frontend/index.html:12534 |
| `log-terminal` | frontend/index.html:12587 |
| `log-terminal-hint` | frontend/index.html:12581 |
| `log-view-toggle` | frontend/index.html:12496 |
| `logs-bundle` | frontend/index.html:12567 |
| `logs-clear` | frontend/index.html:12564 |
| `logs-copy` | frontend/index.html:12563 |
| `logs-dropped` | frontend/index.html:12585 |
| `logs-email-bundle` | frontend/index.html:12561 |
| `logs-empty` | frontend/index.html:12589 |
| `logs-filtered-out` | frontend/index.html:12590 |
| `logs-help` | frontend/index.html:12507 |
| `logs-help-toggle` | frontend/index.html:12504 |
| `logs-more-menu` | frontend/index.html:12510 |
| `manage-categories-btn` | frontend/index.html:1274 |
| `manage-categories-foot` | frontend/index.html:1280 |
| `mcp-config-copy` | frontend/index.html:10077 |
| `mcp-config-group` | frontend/index.html:10051 |
| `mcp-config-help` | frontend/index.html:10062 |
| `mcp-config-note` | frontend/index.html:10075 |
| `mcp-config-snippet` | frontend/index.html:10074 |
| `meeting-card` | frontend/index.html:13419 |
| `meeting-close` | frontend/index.html:13435 |
| `meeting-controls` | frontend/index.html:13465 |
| `meeting-copy` | frontend/index.html:13522 |
| `meeting-discard` | frontend/index.html:13523 |
| `meeting-help` | frontend/index.html:13440 |
| `meeting-overlay` | frontend/index.html:13417 |
| `meeting-pause` | frontend/index.html:13467 |
| `meeting-progress` | frontend/index.html:13490 |
| `meeting-record` | frontend/index.html:13466 |
| `meeting-save` | frontend/index.html:13511 |
| `meeting-save-doc` | frontend/index.html:13517 |
| `meeting-save-row` | frontend/index.html:13507 |
| `meeting-stage` | frontend/index.html:13464 |
| `meeting-status` | frontend/index.html:13492 |
| `meeting-timer` | frontend/index.html:13468 |
| `meeting-title` | frontend/index.html:13454 |
| `meeting-transcript` | frontend/index.html:13497 |
| `meeting-wave` | frontend/index.html:13485 |
| `memory-add` | frontend/index.html:9779 |
| `memory-budget` | frontend/index.html:9773 |
| `memory-empty` | frontend/index.html:9783 |
| `memory-help` | frontend/index.html:9757 |
| `memory-list` | frontend/index.html:9782 |
| `memory-new` | frontend/index.html:9777 |
| `memory-status` | frontend/index.html:9781 |
| `mic-chat` | frontend/index.html:2912 |
| `mic-note` | frontend/index.html:1568 |
| `model-context-help` | frontend/index.html:8885 |
| `model-context-note` | frontend/index.html:8884 |
| `model-context-row` | frontend/index.html:8872 |
| `model-context-window` | frontend/index.html:8874 |
| `model-spec` | frontend/index.html:8858 |
| `model-spec-health` | frontend/index.html:8859 |
| `models-config` | frontend/index.html:8845 |
| `models-skeleton` | frontend/index.html:8768 |
| `most-used` | frontend/index.html:1283 |
| `most-used-box` | frontend/index.html:1281 |
| `motion-help` | frontend/index.html:10362 |
| `nav-group-about` | frontend/index.html:8755 |
| `nav-group-ai` | frontend/index.html:8711 |
| `nav-group-look` | frontend/index.html:8736 |
| `nav-group-security` | frontend/index.html:8742 |
| `nav-group-system` | frontend/index.html:8748 |
| `nav-group-you` | frontend/index.html:8723 |
| `new-chat-btn` | frontend/index.html:1921 |
| `no-match-message` | frontend/index.html:2382 |
| `note-outbox-notice` | frontend/index.html:1436 |
| `note-outbox-retry` | frontend/index.html:1438 |
| `note-picker-clear` | frontend/index.html:2872 |
| `note-picker-close` | frontend/index.html:2825 |
| `note-picker-count` | frontend/index.html:2871 |
| `note-picker-done` | frontend/index.html:2873 |
| `note-picker-help` | frontend/index.html:2829 |
| `note-picker-list` | frontend/index.html:2866 |
| `note-picker-panel` | frontend/index.html:2811 |
| `note-picker-search` | frontend/index.html:2863 |
| `note-picker-sources` | frontend/index.html:2842 |
| `note-search` | frontend/index.html:2224 |
| `note-sort` | frontend/index.html:2241 |
| `note-template-dialog` | frontend/index.html:949 |
| `note-template-list` | frontend/index.html:959 |
| `note-template-manage` | frontend/index.html:963 |
| `note-template-preview` | frontend/index.html:960 |
| `note-template-title` | frontend/index.html:952 |
| `note-template-use` | frontend/index.html:965 |
| `note-toolbar` | frontend/index.html:1459 |
| `notes-expand-all` | frontend/index.html:2301 |
| `notes-filter-menu` | frontend/index.html:2229 |
| `notes-manage-tags` | frontend/index.html:2299 |
| `notes-more-menu` | frontend/index.html:2276 |
| `notes-new-note` | frontend/index.html:2329 |
| `notes-page-next` | frontend/index.html:2374 |
| `notes-page-prev` | frontend/index.html:2372 |
| `notes-page-size` | frontend/index.html:2312 |
| `notes-page-status` | frontend/index.html:2373 |
| `notes-pagination` | frontend/index.html:2371 |
| `notes-rail` | frontend/index.html:2398 |
| `notes-rail-body` | frontend/index.html:2427 |
| `notes-rail-close` | frontend/index.html:2407 |
| `notes-rail-count` | frontend/index.html:2401 |
| `notes-rail-help` | frontend/index.html:2412 |
| `notes-rail-subject` | frontend/index.html:2426 |
| `notes-rail-title` | frontend/index.html:2400 |
| `notes-rail-toggle` | frontend/index.html:2308 |
| `notes-refresh` | frontend/index.html:2297 |
| `notes-subtabs` | frontend/index.html:1345 |
| `notes-tidy` | frontend/index.html:2274 |
| `notes-tidy-count` | frontend/index.html:2275 |
| `notes-view-cards` | frontend/index.html:2257 |
| `notes-view-rows` | frontend/index.html:2255 |
| `notif-activity-mode` | frontend/index.html:254 |
| `notif-btn` | frontend/index.html:204 |
| `notif-clear` | frontend/index.html:267 |
| `notif-close` | frontend/index.html:227 |
| `notif-list` | frontend/index.html:231 |
| `notif-mark-all-read` | frontend/index.html:265 |
| `notif-mute-toggle` | frontend/index.html:224 |
| `notif-panel` | frontend/index.html:207 |
| `notif-unread` | frontend/index.html:221 |
| `notifications-help` | frontend/index.html:11205 |
| `ocr-boxes` | frontend/index.html:8328 |
| `ocr-caption` | frontend/index.html:8361 |
| `ocr-clean-loops` | frontend/index.html:8418 |
| `ocr-close` | frontend/index.html:8167 |
| `ocr-copy-all` | frontend/index.html:8439 |
| `ocr-delete-reading` | frontend/index.html:8411 |
| `ocr-describe` | frontend/index.html:8432 |
| `ocr-describe-label` | frontend/index.html:8433 |
| `ocr-dock` | frontend/index.html:8183 |
| `ocr-edit-box` | frontend/index.html:8388 |
| `ocr-edit-cancel` | frontend/index.html:8391 |
| `ocr-edit-panel` | frontend/index.html:8386 |
| `ocr-edit-save` | frontend/index.html:8390 |
| `ocr-empty` | frontend/index.html:8397 |
| `ocr-engine` | frontend/index.html:8262 |
| `ocr-engine-dot` | frontend/index.html:8231 |
| `ocr-file` | frontend/index.html:8154 |
| `ocr-find` | frontend/index.html:8357 |
| `ocr-find-count` | frontend/index.html:8359 |
| `ocr-help` | frontend/index.html:8170 |
| `ocr-help-toggle` | frontend/index.html:8269 |
| `ocr-image` | frontend/index.html:8310 |
| `ocr-message` | frontend/index.html:8362 |
| `ocr-model-apply` | frontend/index.html:8976 |
| `ocr-model-help` | frontend/index.html:8980 |
| `ocr-model-note` | frontend/index.html:8978 |
| `ocr-model-select` | frontend/index.html:8975 |
| `ocr-more` | frontend/index.html:8460 |
| `ocr-next-page` | frontend/index.html:8164 |
| `ocr-other-readings` | frontend/index.html:8366 |
| `ocr-page-label` | frontend/index.html:8163 |
| `ocr-page-pane` | frontend/index.html:8308 |
| `ocr-pager` | frontend/index.html:8160 |
| `ocr-prev-page` | frontend/index.html:8161 |
| `ocr-rail` | frontend/index.html:8306 |
| `ocr-rail-switch` | frontend/index.html:8304 |
| `ocr-rapidocr-install` | frontend/index.html:8253 |
| `ocr-rapidocr-missing` | frontend/index.html:8251 |
| `ocr-read-menu-slot` | frontend/index.html:8289 |
| `ocr-read-page` | frontend/index.html:8284 |
| `ocr-read-page-label` | frontend/index.html:8285 |
| `ocr-read-split` | frontend/index.html:8283 |
| `ocr-reader` | frontend/index.html:8240 |
| `ocr-reader-menu` | frontend/index.html:8229 |
| `ocr-reader-name` | frontend/index.html:8232 |
| `ocr-region-cancel` | frontend/index.html:8342 |
| `ocr-region-describe` | frontend/index.html:8340 |
| `ocr-region-list` | frontend/index.html:8398 |
| `ocr-region-popover` | frontend/index.html:8335 |
| `ocr-region-read` | frontend/index.html:8338 |
| `ocr-region-results` | frontend/index.html:8382 |
| `ocr-region-size` | frontend/index.html:8337 |
| `ocr-regions` | frontend/index.html:8189 |
| `ocr-scroll` | frontend/index.html:8348 |
| `ocr-select` | frontend/index.html:8327 |
| `ocr-source` | frontend/index.html:8155 |
| `ocr-stage` | frontend/index.html:8309 |
| `ocr-stop-read` | frontend/index.html:8372 |
| `ocr-to-chat` | frontend/index.html:8452 |
| `ocr-to-note` | frontend/index.html:8461 |
| `ocr-tools-more` | frontend/index.html:8276 |
| `ocr-view` | frontend/index.html:8212 |
| `ocr-workspace` | frontend/index.html:8134 |
| `ocr-zoom` | frontend/index.html:8199 |
| `ocr-zoom-fit` | frontend/index.html:8206 |
| `ocr-zoom-in` | frontend/index.html:8204 |
| `ocr-zoom-level` | frontend/index.html:8202 |
| `ocr-zoom-out` | frontend/index.html:8200 |
| `offline-indicator` | frontend/index.html:8007 |
| `ollama-help` | frontend/index.html:8778 |
| `ollama-status` | frontend/index.html:8765 |
| `onboarding-actions` | frontend/index.html:13567 |
| `onboarding-atlas` | frontend/index.html:13559 |
| `onboarding-back` | frontend/index.html:13573 |
| `onboarding-card` | frontend/index.html:13556 |
| `onboarding-dots` | frontend/index.html:13569 |
| `onboarding-emblem` | frontend/index.html:13558 |
| `onboarding-icon` | frontend/index.html:13560 |
| `onboarding-next` | frontend/index.html:13574 |
| `onboarding-overlay` | frontend/index.html:13554 |
| `onboarding-skip` | frontend/index.html:13571 |
| `onboarding-slide` | frontend/index.html:13557 |
| `onboarding-text` | frontend/index.html:13562 |
| `onboarding-title` | frontend/index.html:13561 |
| `open-exports-folder` | frontend/index.html:11768 |
| `open-exports-row` | frontend/index.html:11767 |
| `packages-help` | frontend/index.html:10887 |
| `page-bg-clear` | frontend/index.html:10208 |
| `page-bg-custom` | frontend/index.html:10207 |
| `page-wash-row` | frontend/index.html:10400 |
| `page-wash-toggle` | frontend/index.html:10401 |
| `palette-card` | frontend/index.html:13022 |
| `palette-grid` | frontend/index.html:10167 |
| `palette-input` | frontend/index.html:13023 |
| `palette-list` | frontend/index.html:13026 |
| `palette-overlay` | frontend/index.html:13021 |
| `palette-preview` | frontend/index.html:13027 |
| `perf-mode` | frontend/index.html:10385 |
| `perf-mode-hint` | frontend/index.html:10383 |
| `perf-mode-row` | frontend/index.html:10379 |
| `persona-add` | frontend/index.html:9521 |
| `persona-export` | frontend/index.html:9528 |
| `persona-import` | frontend/index.html:9529 |
| `persona-import-file` | frontend/index.html:9530 |
| `persona-list` | frontend/index.html:9454 |
| `persona-name` | frontend/index.html:9516 |
| `persona-peek` | frontend/index.html:3052 |
| `persona-peek-panel` | frontend/index.html:3068 |
| `persona-placeholder-hint` | frontend/index.html:9519 |
| `persona-prompt` | frontend/index.html:3056 |
| `persona-prompt` | frontend/index.html:9517 |
| `persona-prompt-text` | frontend/index.html:3070 |
| `persona-select` | frontend/index.html:3047 |
| `persona-select-mark` | frontend/index.html:3046 |
| `persona-status` | frontend/index.html:9522 |
| `personas-help` | frontend/index.html:9445 |
| `phone-more-btn` | frontend/index.html:7936 |
| `phone-tab-dock` | frontend/index.html:7931 |
| `power-saver-indicator` | frontend/index.html:7997 |
| `pref-ai-first-filing` | frontend/index.html:11579 |
| `pref-auto-caption-images` | frontend/index.html:11607 |
| `pref-auto-capture` | frontend/index.html:11639 |
| `pref-auto-dedupe` | frontend/index.html:11625 |
| `pref-auto-link` | frontend/index.html:11621 |
| `pref-auto-read-image-text` | frontend/index.html:11611 |
| `pref-auto-stale-review` | frontend/index.html:11629 |
| `pref-auto-tag` | frontend/index.html:11617 |
| `pref-auto-update` | frontend/index.html:12816 |
| `pref-autonomous-interval` | frontend/index.html:11654 |
| `pref-autonomous-model` | frontend/index.html:11657 |
| `pref-autonomous-tasks` | frontend/index.html:11531 |
| `pref-background-filing` | frontend/index.html:11588 |
| `pref-battery-mode` | frontend/index.html:11702 |
| `pref-bin-days` | frontend/index.html:11177 |
| `pref-chat-retention` | frontend/index.html:11183 |
| `pref-close-to-tray` | frontend/index.html:12923 |
| `pref-display-name` | frontend/index.html:11127 |
| `pref-export-dir` | frontend/index.html:11783 |
| `pref-export-dir-reset` | frontend/index.html:11784 |
| `pref-filing-style` | frontend/index.html:11572 |
| `pref-filing-wait` | frontend/index.html:11602 |
| `pref-filing-wait-reset` | frontend/index.html:11604 |
| `pref-new-window-on-launch` | frontend/index.html:12943 |
| `pref-notif-mute-except-reminders` | frontend/index.html:11201 |
| `pref-profile` | frontend/index.html:11141 |
| `pref-profile-count` | frontend/index.html:11143 |
| `pref-profile-enabled` | frontend/index.html:11138 |
| `pref-search-min-sim` | frontend/index.html:9417 |
| `pref-search-reset` | frontend/index.html:9424 |
| `pref-search-z-margin` | frontend/index.html:9421 |
| `pref-searxng` | frontend/index.html:11333 |
| `pref-semantic-auto-install` | frontend/index.html:9271 |
| `pref-show-console` | frontend/index.html:12903 |
| `pref-show-thinking-words` | frontend/index.html:10487 |
| `pref-simple-mode` | frontend/index.html:11232 |
| `pref-single-keys` | frontend/index.html:10988 |
| `pref-smart-model-routing` | frontend/index.html:8917 |
| `pref-smart-punctuation` | frontend/index.html:11214 |
| `pref-style` | frontend/index.html:9463 |
| `pref-update-channel-main` | frontend/index.html:12842 |
| `pref-update-check` | frontend/index.html:12792 |
| `pref-voice` | frontend/index.html:9471 |
| `pref-warm-search-model` | frontend/index.html:11594 |
| `pref-web-search` | frontend/index.html:11310 |
| `prefs-save` | frontend/index.html:11150 |
| `prefs-status` | frontend/index.html:11151 |
| `prefs-unsaved` | frontend/index.html:11152 |
| `privacy-covers` | frontend/index.html:12408 |
| `privacy-destinations` | frontend/index.html:12426 |
| `privacy-empty` | frontend/index.html:12427 |
| `privacy-help` | frontend/index.html:12407 |
| `privacy-listening` | frontend/index.html:12438 |
| `privacy-model` | frontend/index.html:12432 |
| `privacy-model-meta` | frontend/index.html:12433 |
| `privacy-range` | frontend/index.html:12420 |
| `privacy-range-note` | frontend/index.html:12425 |
| `privacy-refresh` | frontend/index.html:12448 |
| `privacy-switches` | frontend/index.html:12444 |
| `privacy-verdict` | frontend/index.html:12415 |
| `profile-avatar` | frontend/index.html:11090 |
| `profile-delete` | frontend/index.html:11162 |
| `profile-head-name` | frontend/index.html:11092 |
| `profile-look` | frontend/index.html:11096 |
| `profile-look-parts` | frontend/index.html:11107 |
| `profile-look-reset` | frontend/index.html:11103 |
| `profile-look-shuffle` | frontend/index.html:11100 |
| `progress-motion` | frontend/index.html:10475 |
| `progress-motion-hint` | frontend/index.html:10473 |
| `progress-motion-row` | frontend/index.html:10464 |
| `question` | frontend/index.html:1974 |
| `questions` | frontend/index.html:2150 |
| `questions-ask` | frontend/index.html:2168 |
| `questions-heading` | frontend/index.html:2153 |
| `questions-help-body` | frontend/index.html:2179 |
| `questions-help-toggle` | frontend/index.html:2172 |
| `questions-lead` | frontend/index.html:2189 |
| `questions-list` | frontend/index.html:2190 |
| `questions-more` | frontend/index.html:2191 |
| `questions-refresh` | frontend/index.html:2170 |
| `questions-state` | frontend/index.html:2161 |
| `quick-note` | frontend/index.html:1019 |
| `quick-note-clear` | frontend/index.html:1047 |
| `quick-note-close` | frontend/index.html:1028 |
| `quick-note-help` | frontend/index.html:1032 |
| `quick-note-more` | frontend/index.html:1048 |
| `quick-note-save` | frontend/index.html:1049 |
| `quick-note-status` | frontend/index.html:1045 |
| `quick-note-text` | frontend/index.html:1043 |
| `quick-note-title` | frontend/index.html:1021 |
| `quit-btn` | frontend/index.html:294 |
| `quit-help` | frontend/index.html:11717 |
| `radius-slider` | frontend/index.html:10290 |
| `radius-value` | frontend/index.html:10292 |
| `raw-results` | frontend/index.html:2142 |
| `recent-questions` | frontend/index.html:2011 |
| `recovery-key-copy` | frontend/index.html:470 |
| `recovery-key-dialog` | frontend/index.html:429 |
| `recovery-key-dialog-help` | frontend/index.html:442 |
| `recovery-key-done` | frontend/index.html:474 |
| `recovery-key-download` | frontend/index.html:471 |
| `recovery-key-error` | frontend/index.html:477 |
| `recovery-key-help` | frontend/index.html:12339 |
| `recovery-key-lead` | frontend/index.html:467 |
| `recovery-key-make` | frontend/index.html:463 |
| `recovery-key-offer` | frontend/index.html:459 |
| `recovery-key-show` | frontend/index.html:466 |
| `recovery-key-skip` | frontend/index.html:462 |
| `recovery-key-title` | frontend/index.html:431 |
| `recovery-key-value` | frontend/index.html:468 |
| `reduce-motion-row` | frontend/index.html:10492 |
| `reduce-motion-toggle` | frontend/index.html:10493 |
| `reindex-blurb` | frontend/index.html:9370 |
| `reindex-box` | frontend/index.html:9344 |
| `reindex-help` | frontend/index.html:9353 |
| `reindex-label` | frontend/index.html:9363 |
| `reindex-progress` | frontend/index.html:9362 |
| `reindex-stale` | frontend/index.html:9368 |
| `reindex-start` | frontend/index.html:9371 |
| `rekey-help` | frontend/index.html:12274 |
| `reminder-add` | frontend/index.html:5225 |
| `reminder-calendar` | frontend/index.html:5375 |
| `reminder-clear-done` | frontend/index.html:5319 |
| `reminder-clock` | frontend/index.html:5182 |
| `reminder-compose` | frontend/index.html:5179 |
| `reminder-date` | frontend/index.html:5211 |
| `reminder-due` | frontend/index.html:5213 |
| `reminder-due-day-down` | frontend/index.html:5281 |
| `reminder-due-day-up` | frontend/index.html:5284 |
| `reminder-due-nudge-down` | frontend/index.html:5274 |
| `reminder-due-nudge-up` | frontend/index.html:5277 |
| `reminder-due-readout` | frontend/index.html:5293 |
| `reminder-due-row` | frontend/index.html:5247 |
| `reminder-filter` | frontend/index.html:5358 |
| `reminder-groups` | frontend/index.html:5363 |
| `reminder-list-card` | frontend/index.html:5300 |
| `reminder-magic` | frontend/index.html:5194 |
| `reminder-magic-add` | frontend/index.html:5199 |
| `reminder-magic-row` | frontend/index.html:5188 |
| `reminder-magic-status` | frontend/index.html:5201 |
| `reminder-presets` | frontend/index.html:5250 |
| `reminder-presets-menu` | frontend/index.html:5248 |
| `reminder-priority` | frontend/index.html:5214 |
| `reminder-recurring` | frontend/index.html:5219 |
| `reminder-text` | frontend/index.html:5203 |
| `reminder-time` | frontend/index.html:5212 |
| `reminder-view-toggle` | frontend/index.html:5313 |
| `reminders-done-page-next` | frontend/index.html:5369 |
| `reminders-done-page-prev` | frontend/index.html:5367 |
| `reminders-done-page-status` | frontend/index.html:5368 |
| `reminders-done-pagination` | frontend/index.html:5366 |
| `reminders-empty` | frontend/index.html:5376 |
| `reminders-export-ics` | frontend/index.html:5335 |
| `reminders-help` | frontend/index.html:5326 |
| `reminders-help-toggle` | frontend/index.html:5323 |
| `reminders-more-menu` | frontend/index.html:5329 |
| `reminders-new` | frontend/index.html:5354 |
| `reminders-page-size` | frontend/index.html:5340 |
| `response-mode-select` | frontend/index.html:3039 |
| `restore-bundle` | frontend/index.html:11859 |
| `restore-bundle-file` | frontend/index.html:11858 |
| `restore-bundle-help` | frontend/index.html:11845 |
| `restore-bundle-password` | frontend/index.html:11861 |
| `restore-bundle-status` | frontend/index.html:11864 |
| `retry-btn` | frontend/index.html:2097 |
| `run-budget-help` | frontend/index.html:9993 |
| `run-budget-seconds` | frontend/index.html:10025 |
| `run-budget-status` | frontend/index.html:10028 |
| `run-budget-tokens` | frontend/index.html:10017 |
| `sampling-box` | frontend/index.html:9061 |
| `sampling-help` | frontend/index.html:9069 |
| `sampling-model` | frontend/index.html:9076 |
| `sampling-note` | frontend/index.html:9084 |
| `sampling-reset` | frontend/index.html:9079 |
| `sampling-rows` | frontend/index.html:9077 |
| `save-btn` | frontend/index.html:1625 |
| `save-draft-btn` | frontend/index.html:1622 |
| `save-search` | frontend/index.html:2235 |
| `save-status` | frontend/index.html:1627 |
| `saved-searches` | frontend/index.html:2351 |
| `search-engine-config` | frontend/index.html:9211 |
| `search-engine-health` | frontend/index.html:9188 |
| `search-engine-help` | frontend/index.html:9220 |
| `search-help` | frontend/index.html:2263 |
| `search-help-hint` | frontend/index.html:2354 |
| `search-mode` | frontend/index.html:2140 |
| `search-provider-picker` | frontend/index.html:11317 |
| `search-provider-status` | frontend/index.html:11319 |
| `search-relevance-group` | frontend/index.html:9387 |
| `search-relevance-help` | frontend/index.html:9396 |
| `search-relevance-intro` | frontend/index.html:9403 |
| `searxng-autostart` | frontend/index.html:11404 |
| `searxng-backend` | frontend/index.html:11372 |
| `searxng-detect` | frontend/index.html:11335 |
| `searxng-help` | frontend/index.html:11340 |
| `searxng-host-help` | frontend/index.html:11366 |
| `searxng-host-state` | frontend/index.html:11363 |
| `searxng-host-status` | frontend/index.html:11392 |
| `searxng-install-line` | frontend/index.html:11411 |
| `searxng-install-progress` | frontend/index.html:11409 |
| `searxng-output` | frontend/index.html:11416 |
| `searxng-output-fold` | frontend/index.html:11414 |
| `searxng-port` | frontend/index.html:11375 |
| `searxng-reinstall` | frontend/index.html:11389 |
| `searxng-start` | frontend/index.html:11387 |
| `searxng-status` | frontend/index.html:11338 |
| `searxng-stop` | frontend/index.html:11388 |
| `select-btn` | frontend/index.html:2262 |
| `semantic-auto-install-help` | frontend/index.html:9281 |
| `semantic-search-toggle` | frontend/index.html:2233 |
| `sessions-help` | frontend/index.html:12302 |
| `settings-about` | frontend/index.html:12674 |
| `settings-account` | frontend/index.html:12079 |
| `settings-appearance` | frontend/index.html:10083 |
| `settings-btn` | frontend/index.html:286 |
| `settings-close` | frontend/index.html:8681 |
| `settings-data` | frontend/index.html:11729 |
| `settings-extras` | frontend/index.html:10874 |
| `settings-general` | frontend/index.html:11172 |
| `settings-guide-btn` | frontend/index.html:8662 |
| `settings-help` | frontend/index.html:12595 |
| `settings-learned` | frontend/index.html:9802 |
| `settings-logs` | frontend/index.html:12453 |
| `settings-manage-categories` | frontend/index.html:11556 |
| `settings-manage-tags` | frontend/index.html:11563 |
| `settings-memory` | frontend/index.html:9745 |
| `settings-modal` | frontend/index.html:8623 |
| `settings-modal-nav` | frontend/index.html:8664 |
| `settings-models` | frontend/index.html:8764 |
| `settings-nav` | frontend/index.html:8690 |
| `settings-nav-appearance` | frontend/index.html:8738 |
| `settings-nav-back` | frontend/index.html:8665 |
| `settings-nav-forward` | frontend/index.html:8666 |
| `settings-nav-help` | frontend/index.html:8757 |
| `settings-nav-models` | frontend/index.html:8713 |
| `settings-peek` | frontend/index.html:8677 |
| `settings-personas` | frontend/index.html:9431 |
| `settings-preferences` | frontend/index.html:11084 |
| `settings-privacy` | frontend/index.html:12395 |
| `settings-profile-btn` | frontend/index.html:8660 |
| `settings-results` | frontend/index.html:8703 |
| `settings-search` | frontend/index.html:8696 |
| `settings-search-count` | frontend/index.html:8699 |
| `settings-searchindex` | frontend/index.html:9187 |
| `settings-shortcuts` | frontend/index.html:10977 |
| `settings-skills` | frontend/index.html:9536 |
| `settings-skills-help` | frontend/index.html:9553 |
| `settings-tasks` | frontend/index.html:11440 |
| `settings-templates` | frontend/index.html:9696 |
| `settings-tools` | frontend/index.html:9900 |
| `settings-websearch` | frontend/index.html:11274 |
| `shadow-intensity` | frontend/index.html:10343 |
| `shadow-intensity-value` | frontend/index.html:10345 |
| `shortcut-head-whiteboard` | frontend/index.html:13183 |
| `shortcut-list` | frontend/index.html:13143 |
| `shortcut-list-documents` | frontend/index.html:13179 |
| `shortcut-list-documents-note` | frontend/index.html:13180 |
| `shortcut-list-settings` | frontend/index.html:10985 |
| `shortcut-list-whiteboard` | frontend/index.html:13188 |
| `shortcut-list-whiteboard-note` | frontend/index.html:13189 |
| `shortcut-status` | frontend/index.html:13144 |
| `shortcut-status-settings` | frontend/index.html:10986 |
| `shortcuts-card` | frontend/index.html:13134 |
| `shortcuts-close` | frontend/index.html:13138 |
| `shortcuts-overlay` | frontend/index.html:13132 |
| `shortcuts-overlay-always-help` | frontend/index.html:13158 |
| `shortcuts-reset` | frontend/index.html:13146 |
| `shortcuts-reset-settings` | frontend/index.html:10992 |
| `show-guide-btn` | frontend/index.html:12620 |
| `sidebar` | frontend/index.html:1270 |
| `sign-in-help` | frontend/index.html:12114 |
| `simple-mode-box` | frontend/index.html:11222 |
| `simple-mode-help` | frontend/index.html:11235 |
| `sketch-bg-canvas` | frontend/index.html:13390 |
| `sketch-bg-color-picker` | frontend/index.html:13384 |
| `sketch-btn` | frontend/index.html:1567 |
| `sketch-canvas` | frontend/index.html:13391 |
| `sketch-canvas-wrap` | frontend/index.html:13389 |
| `sketch-caption` | frontend/index.html:13401 |
| `sketch-card` | frontend/index.html:13306 |
| `sketch-clear` | frontend/index.html:13382 |
| `sketch-close` | frontend/index.html:13310 |
| `sketch-foot` | frontend/index.html:13400 |
| `sketch-image-input` | frontend/index.html:13388 |
| `sketch-overlay` | frontend/index.html:13305 |
| `sketch-redo` | frontend/index.html:13381 |
| `sketch-save` | frontend/index.html:13403 |
| `sketch-size` | frontend/index.html:13364 |
| `sketch-size-value` | frontend/index.html:13365 |
| `sketch-status` | frontend/index.html:13402 |
| `sketch-tool-arrow` | frontend/index.html:13327 |
| `sketch-tool-circ` | frontend/index.html:13329 |
| `sketch-tool-eraser` | frontend/index.html:13320 |
| `sketch-tool-highlighter` | frontend/index.html:13319 |
| `sketch-tool-line` | frontend/index.html:13326 |
| `sketch-tool-pen` | frontend/index.html:13318 |
| `sketch-tool-rect` | frontend/index.html:13328 |
| `sketch-tool-text` | frontend/index.html:13330 |
| `sketch-toolbar` | frontend/index.html:13314 |
| `sketch-undo` | frontend/index.html:13380 |
| `sketch-upload-image` | frontend/index.html:13383 |
| `skill-add` | frontend/index.html:9680 |
| `skill-add-fold` | frontend/index.html:9580 |
| `skill-cancel` | frontend/index.html:9681 |
| `skill-description` | frontend/index.html:9583 |
| `skill-export` | frontend/index.html:9688 |
| `skill-folder-line` | frontend/index.html:9578 |
| `skill-import` | frontend/index.html:9689 |
| `skill-import-file` | frontend/index.html:9690 |
| `skill-inputs` | frontend/index.html:9593 |
| `skill-list` | frontend/index.html:9577 |
| `skill-manual-toggle` | frontend/index.html:3091 |
| `skill-name` | frontend/index.html:9582 |
| `skill-prompt` | frontend/index.html:9585 |
| `skill-run-cancel` | frontend/index.html:13120 |
| `skill-run-card` | frontend/index.html:13116 |
| `skill-run-description` | frontend/index.html:13124 |
| `skill-run-fields` | frontend/index.html:13125 |
| `skill-run-go` | frontend/index.html:13127 |
| `skill-run-overlay` | frontend/index.html:13114 |
| `skill-run-title` | frontend/index.html:13118 |
| `skill-status` | frontend/index.html:9682 |
| `skill-steps` | frontend/index.html:9590 |
| `skill-tool-list` | frontend/index.html:9618 |
| `skill-tools-help` | frontend/index.html:9609 |
| `skill-verify-expect` | frontend/index.html:9659 |
| `skill-verify-help` | frontend/index.html:9642 |
| `skill-verify-tool` | frontend/index.html:9657 |
| `skill-verify-untagged` | frontend/index.html:9669 |
| `skill-verify-value` | frontend/index.html:9665 |
| `skills-add-new` | frontend/index.html:5772 |
| `skills-dashboard-list` | frontend/index.html:5784 |
| `skills-help` | frontend/index.html:5766 |
| `skills-intro` | frontend/index.html:5776 |
| `skills-kind` | frontend/index.html:5751 |
| `skills-logs-clear` | frontend/index.html:5819 |
| `skills-logs-heading` | frontend/index.html:5818 |
| `skills-logs-list` | frontend/index.html:5821 |
| `skills-search` | frontend/index.html:5737 |
| `skills-sidebar` | frontend/index.html:5816 |
| `skills-sort` | frontend/index.html:5759 |
| `skip-link` | frontend/index.html:120 |
| `small-model-mode` | frontend/index.html:9970 |
| `small-model-mode-help` | frontend/index.html:9952 |
| `small-model-mode-status` | frontend/index.html:9977 |
| `space-create-dialog` | frontend/index.html:827 |
| `space-create-error` | frontend/index.html:840 |
| `space-create-icon` | frontend/index.html:839 |
| `space-create-icon-picker` | frontend/index.html:838 |
| `space-create-name` | frontend/index.html:836 |
| `space-create-submit` | frontend/index.html:843 |
| `space-current-icon` | frontend/index.html:140 |
| `space-current-name` | frontend/index.html:141 |
| `space-delete-dialog` | frontend/index.html:867 |
| `space-delete-error` | frontend/index.html:880 |
| `space-delete-fate` | frontend/index.html:876 |
| `space-delete-id` | frontend/index.html:879 |
| `space-delete-submit` | frontend/index.html:883 |
| `space-edit-dialog` | frontend/index.html:847 |
| `space-edit-error` | frontend/index.html:860 |
| `space-edit-icon` | frontend/index.html:859 |
| `space-edit-icon-picker` | frontend/index.html:858 |
| `space-edit-id` | frontend/index.html:854 |
| `space-edit-name` | frontend/index.html:856 |
| `space-edit-submit` | frontend/index.html:863 |
| `space-menu` | frontend/index.html:144 |
| `space-switcher-btn` | frontend/index.html:137 |
| `speak-btn` | frontend/index.html:2101 |
| `status-activity` | frontend/index.html:7996 |
| `status-agent` | frontend/index.html:8021 |
| `status-back` | frontend/index.html:8058 |
| `status-bar` | frontend/index.html:7940 |
| `status-bar-clock-toggle` | frontend/index.html:10818 |
| `status-bar-items` | frontend/index.html:10804 |
| `status-clock` | frontend/index.html:8042 |
| `status-clock-detail` | frontend/index.html:8074 |
| `status-clock-detail-date` | frontend/index.html:8075 |
| `status-clock-detail-time` | frontend/index.html:8076 |
| `status-clock-detail-zone` | frontend/index.html:8077 |
| `status-command` | frontend/index.html:8012 |
| `status-find` | frontend/index.html:8033 |
| `status-forward` | frontend/index.html:8059 |
| `status-guide` | frontend/index.html:8028 |
| `status-nav-history` | frontend/index.html:8065 |
| `status-nav-history-menu` | frontend/index.html:8096 |
| `status-notes` | frontend/index.html:7984 |
| `status-redo` | frontend/index.html:8072 |
| `status-reminders` | frontend/index.html:7985 |
| `status-task` | frontend/index.html:7989 |
| `status-undo` | frontend/index.html:8071 |
| `statusbar-help` | frontend/index.html:10796 |
| `stop-btn` | frontend/index.html:2000 |
| `storage-space-notice` | frontend/index.html:12021 |
| `suggested-box` | frontend/index.html:9137 |
| `suggested-hardware` | frontend/index.html:9146 |
| `suggested-help` | frontend/index.html:9147 |
| `suggested-hide-big` | frontend/index.html:9163 |
| `suggested-hide-wrap` | frontend/index.html:9162 |
| `suggested-list` | frontend/index.html:9166 |
| `suggested-questions` | frontend/index.html:2010 |
| `tab-bar` | frontend/index.html:147 |
| `tab-btn-chat` | frontend/index.html:152 |
| `tab-btn-dashboard` | frontend/index.html:148 |
| `tab-btn-graph` | frontend/index.html:154 |
| `tab-btn-library` | frontend/index.html:164 |
| `tab-btn-notes` | frontend/index.html:150 |
| `tab-btn-reminders` | frontend/index.html:168 |
| `tab-btn-timeline` | frontend/index.html:166 |
| `tab-chat` | frontend/index.html:2433 |
| `tab-dashboard` | frontend/index.html:1161 |
| `tab-documents` | frontend/index.html:4294 |
| `tab-graph` | frontend/index.html:3516 |
| `tab-library` | frontend/index.html:5396 |
| `tab-notes` | frontend/index.html:1267 |
| `tab-reminders` | frontend/index.html:5177 |
| `tab-timeline` | frontend/index.html:3234 |
| `task-history` | frontend/index.html:11476 |
| `task-history-box` | frontend/index.html:11470 |
| `task-history-clear` | frontend/index.html:11477 |
| `task-list` | frontend/index.html:11464 |
| `tasks-empty` | frontend/index.html:11465 |
| `tasks-live-group` | frontend/index.html:11446 |
| `tasks-live-help` | frontend/index.html:11456 |
| `template-add` | frontend/index.html:9734 |
| `template-body` | frontend/index.html:9726 |
| `template-cancel` | frontend/index.html:9738 |
| `template-description` | frontend/index.html:9724 |
| `template-draft` | frontend/index.html:9736 |
| `template-list` | frontend/index.html:9720 |
| `template-name` | frontend/index.html:9723 |
| `template-status` | frontend/index.html:9739 |
| `templates-help` | frontend/index.html:9710 |
| `theme-btn` | frontend/index.html:285 |
| `theme-clear-overrides` | frontend/index.html:10147 |
| `theme-override-note` | frontend/index.html:10106 |
| `theme-presets` | frontend/index.html:10105 |
| `theme-reset` | frontend/index.html:10144 |
| `theme-seg` | frontend/index.html:10175 |
| `themes-help` | frontend/index.html:10098 |
| `thinking-box` | frontend/index.html:2112 |
| `timeline-band` | frontend/index.html:3342 |
| `timeline-band-section` | frontend/index.html:3340 |
| `timeline-batch-bar` | frontend/index.html:3441 |
| `timeline-batch-category-host` | frontend/index.html:3448 |
| `timeline-batch-count` | frontend/index.html:3442 |
| `timeline-batch-delete` | frontend/index.html:3450 |
| `timeline-batch-done` | frontend/index.html:3451 |
| `timeline-batch-select-all` | frontend/index.html:3443 |
| `timeline-batch-tag` | frontend/index.html:3449 |
| `timeline-clear-search` | frontend/index.html:3511 |
| `timeline-count` | frontend/index.html:3258 |
| `timeline-custom-range` | frontend/index.html:3370 |
| `timeline-days` | frontend/index.html:3358 |
| `timeline-days-earlier` | frontend/index.html:3410 |
| `timeline-days-later` | frontend/index.html:3417 |
| `timeline-daystrip` | frontend/index.html:3408 |
| `timeline-daystrip-days` | frontend/index.html:3419 |
| `timeline-density-path` | frontend/index.html:3493 |
| `timeline-empty` | frontend/index.html:3498 |
| `timeline-end-date` | frontend/index.html:3373 |
| `timeline-feed` | frontend/index.html:3463 |
| `timeline-filter-clear` | frontend/index.html:3299 |
| `timeline-group` | frontend/index.html:3329 |
| `timeline-help` | frontend/index.html:3380 |
| `timeline-intro` | frontend/index.html:3390 |
| `timeline-jump-today` | frontend/index.html:3385 |
| `timeline-kinds` | frontend/index.html:3293 |
| `timeline-kinds-btn` | frontend/index.html:3291 |
| `timeline-kinds-label` | frontend/index.html:3292 |
| `timeline-kinds-menu` | frontend/index.html:3290 |
| `timeline-month-btn` | frontend/index.html:3414 |
| `timeline-month-grid` | frontend/index.html:3427 |
| `timeline-month-next` | frontend/index.html:3425 |
| `timeline-month-pop` | frontend/index.html:3421 |
| `timeline-month-prev` | frontend/index.html:3423 |
| `timeline-month-text` | frontend/index.html:3416 |
| `timeline-month-title` | frontend/index.html:3424 |
| `timeline-no-match` | frontend/index.html:3507 |
| `timeline-options` | frontend/index.html:3313 |
| `timeline-options-menu` | frontend/index.html:3311 |
| `timeline-scale` | frontend/index.html:3316 |
| `timeline-scale-group` | frontend/index.html:3314 |
| `timeline-scroll` | frontend/index.html:3462 |
| `timeline-scrubber` | frontend/index.html:3490 |
| `timeline-scrubber-window` | frontend/index.html:3494 |
| `timeline-search` | frontend/index.html:3265 |
| `timeline-select-btn` | frontend/index.html:3351 |
| `timeline-start-date` | frontend/index.html:3371 |
| `timeline-table` | frontend/index.html:3473 |
| `timeline-table-body` | frontend/index.html:3487 |
| `timeline-table-head` | frontend/index.html:3475 |
| `timeline-view-feed` | frontend/index.html:3308 |
| `timeline-view-seg` | frontend/index.html:3307 |
| `timeline-view-table` | frontend/index.html:3309 |
| `toast-box` | frontend/index.html:13010 |
| `tool-count` | frontend/index.html:10044 |
| `tool-filter` | frontend/index.html:10042 |
| `tool-filter-empty` | frontend/index.html:10047 |
| `tool-focus-help` | frontend/index.html:9915 |
| `tool-focus-status` | frontend/index.html:9934 |
| `tool-list` | frontend/index.html:10046 |
| `tools-toggle` | frontend/index.html:2942 |
| `top-bar` | frontend/index.html:123 |
| `tour-back` | frontend/index.html:13633 |
| `tour-block` | frontend/index.html:13611 |
| `tour-block-bottom` | frontend/index.html:13614 |
| `tour-block-left` | frontend/index.html:13615 |
| `tour-block-right` | frontend/index.html:13613 |
| `tour-block-top` | frontend/index.html:13612 |
| `tour-card` | frontend/index.html:13618 |
| `tour-close` | frontend/index.html:13624 |
| `tour-count` | frontend/index.html:13623 |
| `tour-next` | frontend/index.html:13634 |
| `tour-replay-buttons` | frontend/index.html:12621 |
| `tour-section` | frontend/index.html:13621 |
| `tour-skip` | frontend/index.html:13631 |
| `tour-spot` | frontend/index.html:13617 |
| `tour-text` | frontend/index.html:13629 |
| `tour-title` | frontend/index.html:13628 |
| `ui-motion-row` | frontend/index.html:10503 |
| `ui-motion-toggle` | frontend/index.html:10504 |
| `undo-history-menu` | frontend/index.html:8103 |
| `update-apply-now` | frontend/index.html:12803 |
| `update-channel-help` | frontend/index.html:12854 |
| `update-check-now` | frontend/index.html:12796 |
| `update-check-row` | frontend/index.html:12795 |
| `update-check-status` | frontend/index.html:12804 |
| `update-install-version` | frontend/index.html:12888 |
| `update-show-versions` | frontend/index.html:12886 |
| `update-version-row` | frontend/index.html:12885 |
| `update-version-select` | frontend/index.html:12887 |
| `update-version-status` | frontend/index.html:12890 |
| `usage-box` | frontend/index.html:11245 |
| `usage-clear` | frontend/index.html:11266 |
| `usage-help` | frontend/index.html:11255 |
| `usage-most` | frontend/index.html:11263 |
| `usage-unused` | frontend/index.html:11264 |
| `utility-model-apply` | frontend/index.html:8909 |
| `utility-model-help` | frontend/index.html:8922 |
| `utility-model-note` | frontend/index.html:8914 |
| `utility-model-select` | frontend/index.html:8908 |
| `vision-model-apply` | frontend/index.html:8946 |
| `vision-model-help` | frontend/index.html:8950 |
| `vision-model-note` | frontend/index.html:8948 |
| `vision-model-select` | frontend/index.html:8945 |
| `voice-model-select` | frontend/index.html:10930 |
| `voice-model-wrap` | frontend/index.html:10928 |
| `wb-add-image` | frontend/index.html:6723 |
| `wb-add-note` | frontend/index.html:6464 |
| `wb-add-sticker` | frontend/index.html:6730 |
| `wb-add-to-note` | frontend/index.html:6433 |
| `wb-align-bottom` | frontend/index.html:6985 |
| `wb-align-hcenter` | frontend/index.html:6981 |
| `wb-align-left` | frontend/index.html:6980 |
| `wb-align-right` | frontend/index.html:6982 |
| `wb-align-top` | frontend/index.html:6983 |
| `wb-align-vcenter` | frontend/index.html:6984 |
| `wb-announcer` | frontend/index.html:6093 |
| `wb-arrange-menu` | frontend/index.html:6252 |
| `wb-arrow-style` | frontend/index.html:6878 |
| `wb-back-to-boards` | frontend/index.html:6178 |
| `wb-bg-color-picker` | frontend/index.html:6302 |
| `wb-bg-color-reset` | frontend/index.html:6303 |
| `wb-bg-image` | frontend/index.html:6304 |
| `wb-bg-image-input` | frontend/index.html:6372 |
| `wb-board-kind` | frontend/index.html:6410 |
| `wb-board-kind-label` | frontend/index.html:6410 |
| `wb-board-menu` | frontend/index.html:6376 |
| `wb-board-select` | frontend/index.html:6180 |
| `wb-boards-generate` | frontend/index.html:5943 |
| `wb-boards-help` | frontend/index.html:5915 |
| `wb-boards-import` | frontend/index.html:5944 |
| `wb-boards-intro` | frontend/index.html:5973 |
| `wb-boards-landing` | frontend/index.html:5833 |
| `wb-boards-new` | frontend/index.html:5967 |
| `wb-boards-new-map` | frontend/index.html:5968 |
| `wb-boards-new-menu` | frontend/index.html:5963 |
| `wb-canvas-view` | frontend/index.html:6000 |
| `wb-clear-board` | frontend/index.html:6414 |
| `wb-context` | frontend/index.html:6869 |
| `wb-context-menu` | frontend/index.html:7015 |
| `wb-copy-link` | frontend/index.html:6450 |
| `wb-copy-style` | frontend/index.html:7022 |
| `wb-copy-style-row` | frontend/index.html:7019 |
| `wb-delete-board` | frontend/index.html:6454 |
| `wb-distribute-h` | frontend/index.html:6988 |
| `wb-distribute-v` | frontend/index.html:6989 |
| `wb-dock-toggle` | frontend/index.html:6357 |
| `wb-edit-menu` | frontend/index.html:6223 |
| `wb-empty-hint` | frontend/index.html:6138 |
| `wb-empty-hint-actions` | frontend/index.html:6152 |
| `wb-empty-hint-close` | frontend/index.html:6149 |
| `wb-empty-hint-dismiss` | frontend/index.html:6156 |
| `wb-empty-hint-keys` | frontend/index.html:6153 |
| `wb-export` | frontend/index.html:6397 |
| `wb-extract-notes` | frontend/index.html:7053 |
| `wb-fill-color` | frontend/index.html:6890 |
| `wb-fill-on` | frontend/index.html:6891 |
| `wb-fill-opacity` | frontend/index.html:7032 |
| `wb-fill-opacity-row` | frontend/index.html:7032 |
| `wb-fmt-align` | frontend/index.html:7500 |
| `wb-fmt-alpha` | frontend/index.html:7455 |
| `wb-fmt-alpha-out` | frontend/index.html:7455 |
| `wb-fmt-angle` | frontend/index.html:7521 |
| `wb-fmt-bold` | frontend/index.html:7495 |
| `wb-fmt-copy-style` | frontend/index.html:7484 |
| `wb-fmt-dash` | frontend/index.html:7445 |
| `wb-fmt-endcap` | frontend/index.html:7477 |
| `wb-fmt-fill` | frontend/index.html:7452 |
| `wb-fmt-fill-on` | frontend/index.html:7452 |
| `wb-fmt-flip-h` | frontend/index.html:7524 |
| `wb-fmt-flip-v` | frontend/index.html:7525 |
| `wb-fmt-h` | frontend/index.html:7519 |
| `wb-fmt-ink` | frontend/index.html:7492 |
| `wb-fmt-italic` | frontend/index.html:7496 |
| `wb-fmt-jumps` | frontend/index.html:7466 |
| `wb-fmt-label-t` | frontend/index.html:7480 |
| `wb-fmt-paste-style` | frontend/index.html:7485 |
| `wb-fmt-route` | frontend/index.html:7459 |
| `wb-fmt-save-style` | frontend/index.html:7486 |
| `wb-fmt-shadow` | frontend/index.html:7457 |
| `wb-fmt-size` | frontend/index.html:7491 |
| `wb-fmt-startcap` | frontend/index.html:7474 |
| `wb-fmt-stroke` | frontend/index.html:7442 |
| `wb-fmt-valign` | frontend/index.html:7507 |
| `wb-fmt-w` | frontend/index.html:7518 |
| `wb-fmt-width` | frontend/index.html:7443 |
| `wb-fmt-x` | frontend/index.html:7516 |
| `wb-fmt-y` | frontend/index.html:7517 |
| `wb-format` | frontend/index.html:7428 |
| `wb-format-body` | frontend/index.html:7438 |
| `wb-format-close` | frontend/index.html:7431 |
| `wb-format-commands` | frontend/index.html:7528 |
| `wb-format-empty` | frontend/index.html:7439 |
| `wb-format-none` | frontend/index.html:7440 |
| `wb-format-tab-arrange` | frontend/index.html:7436 |
| `wb-format-tab-style` | frontend/index.html:7434 |
| `wb-format-tab-text` | frontend/index.html:7435 |
| `wb-format-tabs` | frontend/index.html:7433 |
| `wb-format-title` | frontend/index.html:7430 |
| `wb-fullscreen` | frontend/index.html:6465 |
| `wb-gestures` | frontend/index.html:6013 |
| `wb-gestures-dismiss` | frontend/index.html:6018 |
| `wb-grid-select` | frontend/index.html:6309 |
| `wb-guide-color-center` | frontend/index.html:7048 |
| `wb-guide-color-edge` | frontend/index.html:7047 |
| `wb-guide-color-spacing` | frontend/index.html:7049 |
| `wb-help-about` | frontend/index.html:13219 |
| `wb-help-btn` | frontend/index.html:6459 |
| `wb-help-card` | frontend/index.html:13208 |
| `wb-help-close` | frontend/index.html:13215 |
| `wb-help-none` | frontend/index.html:13230 |
| `wb-help-overlay` | frontend/index.html:13206 |
| `wb-help-search` | frontend/index.html:13226 |
| `wb-help-sections` | frontend/index.html:13229 |
| `wb-help-title` | frontend/index.html:13210 |
| `wb-history-bar` | frontend/index.html:6819 |
| `wb-history-end` | frontend/index.html:6825 |
| `wb-history-restore` | frontend/index.html:6823 |
| `wb-history-restore-selection` | frontend/index.html:6824 |
| `wb-history-slider` | frontend/index.html:6821 |
| `wb-history-when` | frontend/index.html:6822 |
| `wb-html-layer` | frontend/index.html:6114 |
| `wb-image-file-input` | frontend/index.html:6733 |
| `wb-import-about` | frontend/index.html:980 |
| `wb-import-choose` | frontend/index.html:984 |
| `wb-import-dialog` | frontend/index.html:973 |
| `wb-import-file` | frontend/index.html:982 |
| `wb-import-go` | frontend/index.html:986 |
| `wb-import-map-file` | frontend/index.html:5911 |
| `wb-import-text` | frontend/index.html:981 |
| `wb-import-title` | frontend/index.html:975 |
| `wb-insert-menu` | frontend/index.html:6200 |
| `wb-layers-tree` | frontend/index.html:7397 |
| `wb-lib-import` | frontend/index.html:7390 |
| `wb-lib-keys` | frontend/index.html:7389 |
| `wb-lib-list` | frontend/index.html:7388 |
| `wb-lib-more` | frontend/index.html:7379 |
| `wb-lib-search` | frontend/index.html:7385 |
| `wb-lib-status` | frontend/index.html:7387 |
| `wb-library-list` | frontend/index.html:7394 |
| `wb-lines-group` | frontend/index.html:6109 |
| `wb-link-cut` | frontend/index.html:7326 |
| `wb-link-label` | frontend/index.html:7325 |
| `wb-link-reverse` | frontend/index.html:7324 |
| `wb-map-add-root` | frontend/index.html:6557 |
| `wb-map-add-sticker` | frontend/index.html:6563 |
| `wb-map-align` | frontend/index.html:7130 |
| `wb-map-arrow` | frontend/index.html:6102 |
| `wb-map-bold` | frontend/index.html:7124 |
| `wb-map-chip` | frontend/index.html:6190 |
| `wb-map-core` | frontend/index.html:7168 |
| `wb-map-edge-arrow` | frontend/index.html:7260 |
| `wb-map-edge-dashed` | frontend/index.html:7254 |
| `wb-map-edge-shape` | frontend/index.html:7245 |
| `wb-map-edge-width` | frontend/index.html:7237 |
| `wb-map-effect` | frontend/index.html:7212 |
| `wb-map-empty` | frontend/index.html:6084 |
| `wb-map-empty-add` | frontend/index.html:6088 |
| `wb-map-expand-all` | frontend/index.html:6345 |
| `wb-map-fill` | frontend/index.html:7199 |
| `wb-map-filter` | frontend/index.html:6034 |
| `wb-map-filter-clear` | frontend/index.html:6037 |
| `wb-map-filter-item` | frontend/index.html:6346 |
| `wb-map-filter-label` | frontend/index.html:6036 |
| `wb-map-first-hint` | frontend/index.html:6071 |
| `wb-map-focus` | frontend/index.html:6024 |
| `wb-map-focus-clear` | frontend/index.html:6030 |
| `wb-map-focus-depth` | frontend/index.html:6027 |
| `wb-map-focus-here` | frontend/index.html:6560 |
| `wb-map-focus-label` | frontend/index.html:6026 |
| `wb-map-focus-less` | frontend/index.html:6028 |
| `wb-map-focus-more` | frontend/index.html:6029 |
| `wb-map-italic` | frontend/index.html:7125 |
| `wb-map-layout` | frontend/index.html:6634 |
| `wb-map-legend` | frontend/index.html:6041 |
| `wb-map-line-menu` | frontend/index.html:7233 |
| `wb-map-link-radial` | frontend/index.html:7323 |
| `wb-map-numbered` | frontend/index.html:6343 |
| `wb-map-perspective` | frontend/index.html:6328 |
| `wb-map-picture-input` | frontend/index.html:6741 |
| `wb-map-places-help` | frontend/index.html:6581 |
| `wb-map-radial` | frontend/index.html:7297 |
| `wb-map-reset` | frontend/index.html:7271 |
| `wb-map-shape` | frontend/index.html:7173 |
| `wb-map-shape-menu` | frontend/index.html:7159 |
| `wb-map-spine` | frontend/index.html:7187 |
| `wb-map-stats-item` | frontend/index.html:6347 |
| `wb-map-strip` | frontend/index.html:7099 |
| `wb-map-strip-color` | frontend/index.html:7100 |
| `wb-map-strip-icon` | frontend/index.html:7139 |
| `wb-map-study` | frontend/index.html:6446 |
| `wb-map-template-row` | frontend/index.html:6055 |
| `wb-map-templates` | frontend/index.html:6049 |
| `wb-map-templates-dismiss` | frontend/index.html:6053 |
| `wb-map-templates-title` | frontend/index.html:6051 |
| `wb-map-text-menu` | frontend/index.html:7119 |
| `wb-map-text-size` | frontend/index.html:7110 |
| `wb-map-theme-item` | frontend/index.html:6344 |
| `wb-map-tidy` | frontend/index.html:6642 |
| `wb-map-to-doc` | frontend/index.html:6440 |
| `wb-mapmulti-bold` | frontend/index.html:7005 |
| `wb-mapmulti-color` | frontend/index.html:7004 |
| `wb-mapmulti-fold` | frontend/index.html:7007 |
| `wb-mapmulti-summary` | frontend/index.html:7008 |
| `wb-mapmulti-task` | frontend/index.html:7006 |
| `wb-mindmap-radial` | frontend/index.html:7058 |
| `wb-mindmap-tree` | frontend/index.html:7057 |
| `wb-multi-group` | frontend/index.html:6976 |
| `wb-multi-ungroup` | frontend/index.html:6977 |
| `wb-navigator` | frontend/index.html:7335 |
| `wb-navigator-close` | frontend/index.html:7339 |
| `wb-navigator-empty` | frontend/index.html:7342 |
| `wb-navigator-fit` | frontend/index.html:7338 |
| `wb-navigator-map` | frontend/index.html:7341 |
| `wb-navigator-toggle` | frontend/index.html:6194 |
| `wb-new-board` | frontend/index.html:6390 |
| `wb-outline-tree` | frontend/index.html:7419 |
| `wb-overlay-layer` | frontend/index.html:6126 |
| `wb-overlay-zoom-group` | frontend/index.html:6127 |
| `wb-pages-keys` | frontend/index.html:7402 |
| `wb-pages-list` | frontend/index.html:7401 |
| `wb-panel-library` | frontend/index.html:6352 |
| `wb-panel-outline` | frontend/index.html:6353 |
| `wb-panel-overview` | frontend/index.html:6351 |
| `wb-panel-props` | frontend/index.html:6350 |
| `wb-panel-search` | frontend/index.html:6354 |
| `wb-paste-style` | frontend/index.html:7023 |
| `wb-present-bar` | frontend/index.html:6827 |
| `wb-present-count` | frontend/index.html:6829 |
| `wb-present-end` | frontend/index.html:6834 |
| `wb-present-next` | frontend/index.html:6830 |
| `wb-present-prev` | frontend/index.html:6828 |
| `wb-prop-align` | frontend/index.html:6964 |
| `wb-prop-bg` | frontend/index.html:7042 |
| `wb-prop-bg-none` | frontend/index.html:7042 |
| `wb-prop-bold` | frontend/index.html:6962 |
| `wb-prop-border` | frontend/index.html:7043 |
| `wb-prop-border-none` | frontend/index.html:7043 |
| `wb-prop-bullets` | frontend/index.html:7030 |
| `wb-prop-bullets-row` | frontend/index.html:7028 |
| `wb-prop-color` | frontend/index.html:6896 |
| `wb-prop-dash` | frontend/index.html:6941 |
| `wb-prop-endcap` | frontend/index.html:6926 |
| `wb-prop-fontsize` | frontend/index.html:6960 |
| `wb-prop-italic` | frontend/index.html:6963 |
| `wb-prop-md` | frontend/index.html:7027 |
| `wb-prop-md-row` | frontend/index.html:7027 |
| `wb-prop-nostroke` | frontend/index.html:7026 |
| `wb-prop-nostroke-row` | frontend/index.html:7026 |
| `wb-prop-route` | frontend/index.html:6906 |
| `wb-prop-shapefill` | frontend/index.html:6948 |
| `wb-prop-shapefill-on` | frontend/index.html:6950 |
| `wb-prop-startcap` | frontend/index.html:6913 |
| `wb-prop-width` | frontend/index.html:6899 |
| `wb-radial-child` | frontend/index.html:7298 |
| `wb-radial-collapse` | frontend/index.html:7300 |
| `wb-radial-connect` | frontend/index.html:7302 |
| `wb-radial-delete` | frontend/index.html:7301 |
| `wb-radial-more` | frontend/index.html:7303 |
| `wb-radial-sibling` | frontend/index.html:7299 |
| `wb-rail-ink` | frontend/index.html:6790 |
| `wb-redo` | frontend/index.html:6764 |
| `wb-rename-board` | frontend/index.html:6389 |
| `wb-same-height` | frontend/index.html:6993 |
| `wb-same-width` | frontend/index.html:6992 |
| `wb-search-bar` | frontend/index.html:7350 |
| `wb-search-close` | frontend/index.html:7356 |
| `wb-search-count` | frontend/index.html:7353 |
| `wb-search-input` | frontend/index.html:7352 |
| `wb-search-next` | frontend/index.html:7355 |
| `wb-search-prev` | frontend/index.html:7354 |
| `wb-search-toggle` | frontend/index.html:6193 |
| `wb-selbar-back` | frontend/index.html:6996 |
| `wb-selbar-delete` | frontend/index.html:7012 |
| `wb-selbar-duplicate` | frontend/index.html:7011 |
| `wb-selbar-export` | frontend/index.html:7062 |
| `wb-selbar-forward` | frontend/index.html:6997 |
| `wb-shape-menu` | frontend/index.html:6677 |
| `wb-shape-picker` | frontend/index.html:6672 |
| `wb-shape-toggle` | frontend/index.html:6673 |
| `wb-shape-toggle-icon` | frontend/index.html:6674 |
| `wb-shapes-group` | frontend/index.html:6108 |
| `wb-side-map-expand` | frontend/index.html:7411 |
| `wb-side-map-facts` | frontend/index.html:7409 |
| `wb-side-map-look` | frontend/index.html:7410 |
| `wb-side-map-tidy` | frontend/index.html:7412 |
| `wb-side-tab-layers` | frontend/index.html:7371 |
| `wb-side-tab-library` | frontend/index.html:7369 |
| `wb-side-tab-map` | frontend/index.html:7373 |
| `wb-side-tab-notes` | frontend/index.html:7370 |
| `wb-side-tab-outline` | frontend/index.html:7374 |
| `wb-side-tab-pages` | frontend/index.html:7372 |
| `wb-sidebar` | frontend/index.html:7367 |
| `wb-sidebar-close` | frontend/index.html:7380 |
| `wb-sidebar-panel` | frontend/index.html:7376 |
| `wb-sidebar-title` | frontend/index.html:7378 |
| `wb-snap-toggle` | frontend/index.html:6318 |
| `wb-stroke-none` | frontend/index.html:7033 |
| `wb-stroke-none-row` | frontend/index.html:7033 |
| `wb-stroke-style` | frontend/index.html:6884 |
| `wb-stroke-width` | frontend/index.html:6876 |
| `wb-stroke-width-badge` | frontend/index.html:7067 |
| `wb-strokes-group` | frontend/index.html:6110 |
| `wb-study-knew` | frontend/index.html:6832 |
| `wb-study-missed` | frontend/index.html:6833 |
| `wb-study-show` | frontend/index.html:6831 |
| `wb-svg-layer` | frontend/index.html:6096 |
| `wb-template-create` | frontend/index.html:1014 |
| `wb-template-dialog` | frontend/index.html:990 |
| `wb-template-kind` | frontend/index.html:1002 |
| `wb-template-list` | frontend/index.html:1009 |
| `wb-template-name` | frontend/index.html:1007 |
| `wb-template-preview` | frontend/index.html:1010 |
| `wb-template-title` | frontend/index.html:993 |
| `wb-tool-group` | frontend/index.html:6469 |
| `wb-tools-opener` | frontend/index.html:6804 |
| `wb-tools-opener-label` | frontend/index.html:6807 |
| `wb-tools-panel` | frontend/index.html:6468 |
| `wb-topbar` | frontend/index.html:6176 |
| `wb-undo` | frontend/index.html:6761 |
| `wb-view-map-section` | frontend/index.html:6325 |
| `wb-view-menu` | frontend/index.html:6290 |
| `wb-zoom-actual` | frontend/index.html:6366 |
| `wb-zoom-fit` | frontend/index.html:6839 |
| `wb-zoom-group` | frontend/index.html:6107 |
| `wb-zoom-in` | frontend/index.html:6840 |
| `wb-zoom-out` | frontend/index.html:6838 |
| `web-clip-bookmarklet` | frontend/index.html:11997 |
| `web-clip-box` | frontend/index.html:11971 |
| `web-clip-copy` | frontend/index.html:11999 |
| `web-clip-help` | frontend/index.html:11981 |
| `web-clip-status` | frontend/index.html:12001 |
| `web-engine-dot` | frontend/index.html:3161 |
| `web-panel` | frontend/index.html:3152 |
| `web-panel-close` | frontend/index.html:3166 |
| `web-panel-menu` | frontend/index.html:3165 |
| `web-panel-title` | frontend/index.html:3155 |
| `web-query` | frontend/index.html:3175 |
| `web-reader` | frontend/index.html:3188 |
| `web-reader-ask` | frontend/index.html:3207 |
| `web-reader-back` | frontend/index.html:3193 |
| `web-reader-bookmark` | frontend/index.html:3220 |
| `web-reader-cite` | frontend/index.html:3213 |
| `web-reader-copy` | frontend/index.html:3198 |
| `web-reader-find` | frontend/index.html:3196 |
| `web-reader-open` | frontend/index.html:3200 |
| `web-reader-save` | frontend/index.html:3215 |
| `web-reader-source` | frontend/index.html:3205 |
| `web-reader-text` | frontend/index.html:3223 |
| `web-reader-title` | frontend/index.html:3204 |
| `web-results` | frontend/index.html:3187 |
| `web-search-history` | frontend/index.html:3185 |
| `web-search-toggle` | frontend/index.html:2945 |
| `web-status` | frontend/index.html:3181 |
| `web-stop` | frontend/index.html:3178 |
| `websearch-help` | frontend/index.html:11286 |
| `whiteboard-container` | frontend/index.html:6094 |
| `writing-room` | frontend/index.html:1632 |
| `writing-room-heading` | frontend/index.html:1647 |
| `zoom-in` | frontend/index.html:10318 |
| `zoom-out` | frontend/index.html:10314 |
| `zoom-reset` | frontend/index.html:10321 |
| `zoom-slider` | frontend/index.html:10316 |
| `zoom-value` | frontend/index.html:10320 |

## CSS sections (486)

Banner comments (`/* ===` or `/* ---`) in `frontend/css/*.css`, sorted by title.

| Section | File:line |
|---|---|
| "Tools it can use": the row, measured against a normal one | frontend/css/03-dashboard-widgets.css:4599 |
| "how are these connected?" | frontend/css/02-chat-graph.css:4982 |
| 08-consistency.css - one recipe per repeated shape | frontend/css/08-consistency.css:1 |
| 1. One menu row | frontend/css/08-consistency.css:29 |
| 1. touch targets, one step, one block | frontend/css/07-whiteboard-misc.css:10829 |
| 2. A disclosure inside a card is a header, not a button | frontend/css/08-consistency.css:336 |
| 2. the safe area | frontend/css/07-whiteboard-misc.css:10872 |
| 3. A dock is one bar, and its controls belong to it | frontend/css/08-consistency.css:507 |
| 4. One gap between an icon and the label it leads | frontend/css/08-consistency.css:979 |
| 5. The Write-with-AI footers are one row, primary on the right | frontend/css/08-consistency.css:1350 |
| 6. One toggle-row recipe: the switch says on, not the row | frontend/css/08-consistency.css:906 |
| 7. Meta looks like meta | frontend/css/08-consistency.css:1134 |
| 8. A panel head is identity, one fact, then the actions, and it does not | frontend/css/08-consistency.css:2722 |
| A CALMER TOP, NOTHING TAKEN AWAY (Full view) | frontend/css/03-dashboard-widgets.css:4772 |
| A card's date is in the same corner on every card (INBOX 719) | frontend/css/08-consistency.css:11520 |
| A chip's x: a round target inset evenly (INBOX 403) | frontend/css/08-consistency.css:5401 |
| A dialog's head: title, its '?', icon-only actions, Close last | frontend/css/08-consistency.css:10014 |
| A diff of two versions of the same text (DOCUMENTS_PLAN Phase 5 items 2, 3) | frontend/css/09-editor.css:633 |
| A member of a group selection shows that it is selected, not how to | frontend/css/07-whiteboard-misc.css:12079 |
| A note card's text leads; its metadata steps back (INBOX 505) | frontend/css/08-consistency.css:10986 |
| A note's buttons stay while its own menu is open (INBOX 679) | frontend/css/08-consistency.css:11390 |
| A note's time: the same corner on every card | frontend/css/08-consistency.css:9260 |
| A notification's two controls take no width of their own (INBOX 523) | frontend/css/06-timeline-dialogs.css:3915 |
| A rail row's ⋮ overlays the row; it never reserves a column (INBOX 722) | frontend/css/08-consistency.css:11586 |
| A row is a pointer target (INBOX 719) | frontend/css/08-consistency.css:11502 |
| AN INK DOT FOR A FINGER | frontend/css/02-chat-graph.css:2130 |
| Ask history: the personal-notes-browser panel (§ROADMAP item 6) | frontend/css/01-forms-settings.css:3075 |
| Atlas's life: loops while the mark is on screen and motion is on | frontend/css/08-consistency.css:8841 |
| Atlas, the app's guide (INBOX 224) | frontend/css/08-consistency.css:2026 |
| Atlas, the assistant's own character (atlas.js) | frontend/css/08-consistency.css:7417 |
| BOARD NAVIGATOR AND BOARD SEARCH | frontend/css/07-whiteboard-misc.css:7092 |
| BREADCRUMBS: WHERE THE CARET IS | frontend/css/05-sidebars-themes.css:6487 |
| Boards, 2026-10-10 (boardmap-1010): lazy with the board, off the boot | frontend/css/library-lazy.css:3163 |
| Capture: the add tools as a quiet toolbar (INBOX 395) | frontend/css/08-consistency.css:5186 |
| Capture: the two labelled rows under the note box | frontend/css/07-whiteboard-misc.css:3088 |
| Capture: three families, three rows | frontend/css/07-whiteboard-misc.css:5302 |
| Carbon: near-monochrome, minimal colour, maximum text contrast. | frontend/css/05-sidebars-themes.css:3698 |
| Chat sources: every card reads from the top | frontend/css/08-consistency.css:9223 |
| Chat: the user's bubble as a quiet surface, not an accent slab | frontend/css/08-consistency.css:5564 |
| Columns and image options (DOCUMENTS_PLAN Phase 3 item 5) | frontend/css/09-editor.css:408 |
| Curated palettes (Settings → Appearance → Theme) | frontend/css/05-sidebars-themes.css:3443 |
| Documents: focus mode | frontend/css/07-whiteboard-misc.css:6751 |
| Editorial paper: off-white paper, black type, one red-orange for what | frontend/css/05-sidebars-themes.css:3787 |
| Ember: warm oranges over a dim ground. Best in the evening. | frontend/css/05-sidebars-themes.css:3624 |
| Files as a reading list | frontend/css/library-lazy.css:1188 |
| Files sub-tab: rows, not cards | frontend/css/library-lazy.css:1215 |
| Find anything | frontend/css/07-whiteboard-misc.css:12134 |
| Find anything, de-vibecoded | frontend/css/08-consistency.css:4178 |
| Find anything: group heads read as heads | frontend/css/08-consistency.css:5519 |
| GLASS THAT DOES NOT COST WHAT IT USED TO | frontend/css/03-dashboard-widgets.css:795 |
| GRIPS AT A CONSTANT SIZE ON SCREEN | frontend/css/07-whiteboard-misc.css:11996 |
| Graph options: one section-head style | frontend/css/08-consistency.css:5058 |
| Help & guide: the topics box and the "Ask the guide" box are two | frontend/css/08-consistency.css:2022 |
| INBOX 68: the board and map previews | frontend/css/10-responsive.css:413 |
| Icons | frontend/css/07-whiteboard-misc.css:2606 |
| Inline AI (editor.js) | frontend/css/07-whiteboard-misc.css:7227 |
| Lagoon: indigo and teal together | frontend/css/05-sidebars-themes.css:3569 |
| Library -> Contents: an outline (INBOX 496) | frontend/css/01-forms-settings.css:2638 |
| Library Activity, one line per record (INBOX 426 z, images 89, 90) | frontend/css/08-consistency.css:9946 |
| Library → Documents | frontend/css/03-dashboard-widgets.css:4206 |
| Library → Whiteboards | frontend/css/03-dashboard-widgets.css:4231 |
| Live preview | frontend/css/04-chat-dock-appearance.css:4555 |
| MICRO-ANIMATIONS | frontend/css/07-whiteboard-misc.css:709 |
| Ocean: cool teal and deep blue. Crisp rather than cosy. | frontend/css/05-sidebars-themes.css:3532 |
| On paper (DOCUMENTS_PLAN Phase 5 item 4, the print stylesheet) | frontend/css/09-editor.css:1073 |
| On this day | frontend/css/03-dashboard-widgets.css:4549 |
| One sidebar row recipe for every rail (INBOX 702) | frontend/css/08-consistency.css:11469 |
| One ⋯ opener, styled once (INBOX 722) | frontend/css/08-consistency.css:11552 |
| PLAN.md D1: the documents dock's formatting strip hides entirely | frontend/css/07-whiteboard-misc.css:8928 |
| Parchment: paper, ink and a little gold. Made for long writing. | frontend/css/05-sidebars-themes.css:3455 |
| Phase 10, INBOX 100: the scroll edge effect | frontend/css/10-responsive.css:188 |
| Phase 10, INBOX 101: concentric corners | frontend/css/10-responsive.css:220 |
| Phase 11 item 12: a dock's head is one row on a phone | frontend/css/10-responsive.css:1766 |
| Phase 11 item 12: a note row designed for a thumb | frontend/css/10-responsive.css:1710 |
| Phase 11 item 12: one bar at the foot of a phone, not two | frontend/css/10-responsive.css:1372 |
| Phase 11 item 12: the status bar on a tablet is a touch bar | frontend/css/10-responsive.css:1287 |
| Phase 11 item 1: the phone top bar is three controls, not six | frontend/css/10-responsive.css:1235 |
| Phase 11 item 2: a row swiped, star right and bin left | frontend/css/10-responsive.css:1620 |
| Phase 11 item 2: the note page, the sheet recipe's `page` variant | frontend/css/10-responsive.css:2138 |
| Phase 11 item 3: the chat composer on a phone | frontend/css/10-responsive.css:2170 |
| Phase 11 item 4: the graph's controls are one sheet on a phone | frontend/css/10-responsive.css:2237 |
| Phase 11 item 5: the Library reader as the page | frontend/css/10-responsive.css:2407 |
| Phase 11 item 7: the whiteboard and the mind map on a phone | frontend/css/10-responsive.css:2306 |
| Phase 11 item 9: 44px targets, the ones the docks sweep cannot see | frontend/css/10-responsive.css:1087 |
| Phase 11 item 9: no hover-only affordance | frontend/css/10-responsive.css:2225 |
| Phase 11 items 2 and 3: no rail on a phone, an opener in the head | frontend/css/10-responsive.css:1487 |
| Phase 5: quick access + toasts | frontend/css/01-forms-settings.css:3054 |
| Phase 5: the three things a map says about itself | frontend/css/07-whiteboard-misc.css:4903 |
| Phones (roadmap §8: the layout had breakpoints but had never been driven at | frontend/css/05-sidebars-themes.css:4175 |
| Placed at the end of this file on purpose. A panel keeps its original class | frontend/css/03-dashboard-widgets.css:4242 |
| Plum: deep violet and magenta. The most saturated. | frontend/css/05-sidebars-themes.css:3661 |
| Progress that keeps moving (INBOX 95) | frontend/css/08-consistency.css:2468 |
| Quick access, and arranging it (INBOX 461) | frontend/css/03-dashboard-widgets.css:2027 |
| Quiet utilitarian: the default look (UI_MODERNISATION_PLAN decisions, | frontend/css/05-sidebars-themes.css:3735 |
| RESPONSIVE BY DEVICE (UI_MODERNISATION_PLAN.md: Phase 9) | frontend/css/07-whiteboard-misc.css:10736 |
| RESPONSIVE, CONTINUED, AND THE LIQUID GLASS ADOPTIONS | frontend/css/10-responsive.css:1 |
| Reading and focus (DOCUMENTS_PLAN Phase 5 item 4, PLAN D9) | frontend/css/09-editor.css:787 |
| Reminders: the time at the row's end, actions over it on hover | frontend/css/08-consistency.css:5071 |
| Ring room (INBOX 685, "a lot of borders get cut off on an edge") | frontend/css/08-consistency.css:11186 |
| Rows: the default way a list of notes is shown | frontend/css/01-forms-settings.css:1520 |
| Rules that used to be inline style="" attributes. | frontend/css/06-timeline-dialogs.css:707 |
| SETTINGS: one control height, one right edge | frontend/css/01-forms-settings.css:5606 |
| SETTINGS: spacing, hierarchy and proximity | frontend/css/01-forms-settings.css:5770 |
| SIDEBAR COLLAPSE & PEEK | frontend/css/07-whiteboard-misc.css:506 |
| SKILLS TAB | frontend/css/07-whiteboard-misc.css:865 |
| Sage: quiet greens. The calmest of the set. | frontend/css/05-sidebars-themes.css:3495 |
| Sans-serif system font override (macOS fix) | frontend/css/00-tokens-shell.css:1279 |
| Settings at phone width: nothing scrolls sideways (Phase 5.1, 390px) | frontend/css/07-whiteboard-misc.css:9022 |
| Settings form rows share a label column (Phase 5.1) | frontend/css/07-whiteboard-misc.css:8802 |
| Settings headings sit at one left edge | frontend/css/08-consistency.css:1629 |
| Settings rows that wrap their actions under the title (INBOX 82) | frontend/css/08-consistency.css:2483 |
| Settings: a section's intro sits under its heading, not above it | frontend/css/08-consistency.css:5177 |
| TENSIONS: THE DISAGREEMENT REVIEW | frontend/css/06-timeline-dialogs.css:3799 |
| THE CHAT ON A PHONE, MEASURED | frontend/css/04-chat-dock-appearance.css:5546 |
| THE OCR WORKSPACE | frontend/css/07-whiteboard-misc.css:5907 |
| THE QUIET SIDE OF THE BUTTON RAMP: A RUN OF ROW ACTIONS | frontend/css/08-consistency.css:2586 |
| THE WRITE WITH AI ROW, ON A NARROW COLUMN | frontend/css/04-chat-dock-appearance.css:5593 |
| THE WRITING PHASE: nodes, and an edge drawing itself | frontend/css/01-forms-settings.css:5456 |
| Technical mono: a cool graphite ground, monospace for the numbers and | frontend/css/05-sidebars-themes.css:3827 |
| Templates (INBOX 715) | frontend/css/library-lazy.css:2445 |
| Text on accent-coloured surfaces (roadmap §7: colour contrast was listed as | frontend/css/05-sidebars-themes.css:4313 |
| The Ask tab's records speak in the Notes list's voice (INBOX 510) | frontend/css/08-consistency.css:11026 |
| The Library's hover tick says what it is (INBOX 722) | frontend/css/library-lazy.css:3136 |
| The OCR workspace tool row (INBOX 717). Here rather than in the boot | frontend/css/library-lazy.css:2716 |
| The chat header stays one line (INBOX 91) | frontend/css/08-consistency.css:2521 |
| The compact row: one line, one anchor, one chevron (INBOX 676) | frontend/css/08-consistency.css:11313 |
| The connection pill's menu button, concentric with the pill | frontend/css/08-consistency.css:9238 |
| The documents editor: layout around the engine (DOCUMENTS_PLAN Phase 2) | frontend/css/09-editor.css:1 |
| The five whiteboard menus (Insert, Edit, Arrange, View, Board) | frontend/css/08-consistency.css:1431 |
| The guide panel as one surface (INBOX 270 part 4, the redesign) | frontend/css/08-consistency.css:2181 |
| The last icon-to-label gap family | frontend/css/08-consistency.css:1815 |
| The last two head rows that were not on the bar recipe | frontend/css/08-consistency.css:1590 |
| The m guide: one panel of key rows | frontend/css/08-consistency.css:5252 |
| The note surface (DOCUMENTS_PLAN Phase 8): one editor everywhere | frontend/css/09-editor.css:967 |
| The properties panel (DOCUMENTS_PLAN Phase 3 item 4) | frontend/css/09-editor.css:190 |
| The second level: `.tabs-line` (INBOX 522) | frontend/css/05-sidebars-themes.css:4358 |
| The surface model pickers on a phone | frontend/css/10-responsive.css:2489 |
| The thumb bar (DESIGN.md's recipe index: a bar of actions above the | frontend/css/09-editor.css:906 |
| The two dialogs reported as off the modal recipe | frontend/css/08-consistency.css:1666 |
| The two rows that still wrapped at 1024 | frontend/css/08-consistency.css:1515 |
| The whiteboard top bar's controls | frontend/css/08-consistency.css:1838 |
| Timeline rows with a snippet: mark and time on the title's line | frontend/css/08-consistency.css:5029 |
| Timeline: the density strip (TIMELINE_PLAN.md Phase 3) | frontend/css/06-timeline-dialogs.css:336 |
| Timeline: the feed (TIMELINE_PLAN.md Phase 1) | frontend/css/06-timeline-dialogs.css:1 |
| Timeline: the table view (TIMELINE_PLAN.md Phase 2) | frontend/css/06-timeline-dialogs.css:388 |
| Trace mode on the graph (§41) | frontend/css/07-whiteboard-misc.css:2264 |
| Two floating buttons that sit over content: opaque, readable hover | frontend/css/08-consistency.css:5622 |
| WCAG 2.5.8 target size | frontend/css/06-timeline-dialogs.css:3577 |
| WHITEBOARD TAB | frontend/css/06-timeline-dialogs.css:2568 |
| Wave B: threads, inline actions, templates | frontend/css/02-chat-graph.css:443 |
| Wave E: graph view | frontend/css/02-chat-graph.css:1046 |
| Wave F: command palette | frontend/css/02-chat-graph.css:1811 |
| Wave F: mobile / PWA responsive pass | frontend/css/02-chat-graph.css:2291 |
| Wave F: whiteboard-lite | frontend/css/02-chat-graph.css:1882 |
| Wave G: agentic tools + skills | frontend/css/02-chat-graph.css:548 |
| Wave H: voice + read-aloud | frontend/css/02-chat-graph.css:2334 |
| Wave I: skeletons, focus, reduced motion | frontend/css/02-chat-graph.css:2536 |
| Wave J: accent presets + appearance picker | frontend/css/02-chat-graph.css:2858 |
| Wave J: generative art + note tools + undo toast | frontend/css/02-chat-graph.css:2705 |
| Wave K: empty states, mobile tap targets, high-contrast | frontend/css/02-chat-graph.css:3128 |
| Wave L: skip link, action menus, contrast + type polish | frontend/css/02-chat-graph.css:3268 |
| Wave M: graph filters, thumbnails, lightbox, batch bar | frontend/css/02-chat-graph.css:3775 |
| Wave N: improve-writing, link suggestions, tasks | frontend/css/03-dashboard-widgets.css:1 |
| Wave O: AI Tools toggles | frontend/css/03-dashboard-widgets.css:967 |
| Wave O: brand logo + a more present background | frontend/css/03-dashboard-widgets.css:555 |
| Wave O: expanded appearance (theme/size/density/glass) | frontend/css/03-dashboard-widgets.css:618 |
| Whiteboard chrome, restructured: one top bar, a centred tool dock, a | frontend/css/07-whiteboard-misc.css:7556 |
| Writing pace | frontend/css/03-dashboard-widgets.css:4558 |
| [[wiki links]] | frontend/css/05-sidebars-themes.css:757 |
| `.seg-multi`'s word, and the width that decides it | frontend/css/10-responsive.css:629 |
| `.seg-multi`: one well, independent toggles | frontend/css/03-dashboard-widgets.css:682 |
| `.selectbar`: the bar stays with you while the selection does | frontend/css/00-tokens-shell.css:2024 |
| a Files row's facts line, one register (INBOX 421 f) | frontend/css/08-consistency.css:4515 |
| a board or a map as an object in a note (INBOX 309) | frontend/css/05-sidebars-themes.css:1567 |
| a callout that folds (REDESIGN.md §R7.3 item 3) | frontend/css/05-sidebars-themes.css:1234 |
| a card that opens does not inflate the six beside it | frontend/css/08-consistency.css:2859 |
| a chip lane scrolls without drawing a scrollbar | frontend/css/07-whiteboard-misc.css:4294 |
| a chosen radio option is outlined, not only tinted (INBOX 464) | frontend/css/08-consistency.css:10504 |
| a disclosure arrow that matches the app's own carets | frontend/css/07-whiteboard-misc.css:4316 |
| a disclosure is a control, so it answers the pointer | frontend/css/07-whiteboard-misc.css:3859 |
| a face drawn once (avatars.js, `nameMarkCompose`) | frontend/css/08-consistency.css:5830 |
| a file says what it is attached to | frontend/css/07-whiteboard-misc.css:5480 |
| a file tile shows what it has, not what it lacks | frontend/css/07-whiteboard-misc.css:3820 |
| a fold head's '?', beside its <summary> (INBOX 433) | frontend/css/08-consistency.css:3880 |
| a generated face that moves (the owner: "can they be animated as a | frontend/css/08-consistency.css:5671 |
| a help popover opens over the surface that asked for it (INBOX 205) | frontend/css/08-consistency.css:2913 |
| a label that lost its capitals keeps its rank | frontend/css/08-consistency.css:4998 |
| a list of rows reads as a list | frontend/css/07-whiteboard-misc.css:4827 |
| a map's levels and a solid fill (MINDMAP_PLAN §14, decisions 38, 39) | frontend/css/library-lazy.css:2353 |
| a menu is one column: rows, section labels and icons (INBOX 403) | frontend/css/08-consistency.css:9531 |
| a model per feature (Settings → Models) | frontend/css/01-forms-settings.css:6190 |
| a named item in a Settings list: title, label, facts | frontend/css/08-consistency.css:3937 |
| a narrow measure for prose, wide chrome around it | frontend/css/07-whiteboard-misc.css:5564 |
| a note's connections: one pill each, its menu inside it | frontend/css/08-consistency.css:3684 |
| a notice: one line the app says about what is on screen | frontend/css/08-consistency.css:2984 |
| a poke, a look, a large view and a companion (avatars.js) | frontend/css/08-consistency.css:5791 |
| a segmented choice inside a dialog | frontend/css/06-timeline-dialogs.css:1145 |
| a settings group that says what depends on what | frontend/css/07-whiteboard-misc.css:4851 |
| a settings row where nothing squashes anything else | frontend/css/07-whiteboard-misc.css:4568 |
| a sheet (DESIGN.md's recipe index, "A sheet") | frontend/css/10-responsive.css:887 |
| a sticker (MINDMAP_PLAN decision 44, INBOX 642) | frontend/css/library-lazy.css:2387 |
| a stored file that is no longer stored | frontend/css/02-chat-graph.css:5418 |
| a traced path (§9) | frontend/css/02-chat-graph.css:1429 |
| a turn that is still working says so, for as long as it is | frontend/css/03-dashboard-widgets.css:4313 |
| a zone that cannot shrink says so, instead of spilling | frontend/css/10-responsive.css:1177 |
| account & security | frontend/css/01-forms-settings.css:3712 |
| activity heatmap + tag cloud widgets | frontend/css/03-dashboard-widgets.css:2275 |
| activity log | frontend/css/01-forms-settings.css:3025 |
| activity, as a timeline rather than as cards | frontend/css/library-lazy.css:2176 |
| an embedded document, drawn as a card (INBOX 421 b) | frontend/css/05-sidebars-themes.css:6605 |
| and inside a small phone | frontend/css/05-sidebars-themes.css:6378 |
| appearance settings: grouped, scannable rows | frontend/css/04-chat-dock-appearance.css:1993 |
| assistant message layout | frontend/css/05-sidebars-themes.css:4666 |
| attaching notes to a chat message | frontend/css/04-chat-dock-appearance.css:2857 |
| back / forward through pages | frontend/css/00-tokens-shell.css:4450 |
| back-to-top button | frontend/css/04-chat-dock-appearance.css:2682 |
| band 2 (820 to 1200): the tabs keep their names, set small | frontend/css/10-responsive.css:73 |
| band 2: 820-1100, iPad landscape and small laptops | frontend/css/07-whiteboard-misc.css:10937 |
| band 3 (600 to 820): the tab strip fits on its own row | frontend/css/10-responsive.css:24 |
| band 3: 600-820, iPad portrait, and the sheet that band 4 inherits | frontend/css/07-whiteboard-misc.css:11038 |
| band 4 (under 600): the editor's own targets (DOCUMENTS_PLAN Phase 6) | frontend/css/10-responsive.css:531 |
| band 4: an icon-only chip is still a target (Phase 11) | frontend/css/10-responsive.css:588 |
| band 4: below 600, the phone | frontend/css/07-whiteboard-misc.css:11246 |
| band 4: five columns, and the fifth is a sheet | frontend/css/10-responsive.css:689 |
| band 4: the settings sheet's head may wrap, but not be squashed | frontend/css/10-responsive.css:1030 |
| boot splash | frontend/css/00-tokens-shell.css:4474 |
| callouts ("specialised boxes and frames") | frontend/css/05-sidebars-themes.css:1151 |
| category rename / delete | frontend/css/04-chat-dock-appearance.css:2751 |
| chat dock density pass (§37C) | frontend/css/04-chat-dock-appearance.css:1316 |
| chat page layout | frontend/css/04-chat-dock-appearance.css:547 |
| chat panel: answer and raw records side by side | frontend/css/01-forms-settings.css:1092 |
| chat polish | frontend/css/03-dashboard-widgets.css:3448 |
| chat tab (Wave C) | frontend/css/02-chat-graph.css:1 |
| chat, de-vibecoded | frontend/css/08-consistency.css:3487 |
| chat: an organised sidebar, readable code, correctable answers | frontend/css/05-sidebars-themes.css:2523 |
| choice controls, the owner's 2026-09-24 pass (INBOX 409, 411) | frontend/css/08-consistency.css:9448 |
| column-flex cards keep their full width | frontend/css/07-whiteboard-misc.css:4097 |
| compressing a long conversation (§35I) | frontend/css/02-chat-graph.css:911 |
| curated themes | frontend/css/01-forms-settings.css:3753 |
| dark glass reads flatter, and here is which half of it does | frontend/css/10-responsive.css:348 |
| dashboard + reminders (Wave D) | frontend/css/01-forms-settings.css:3929 |
| dashboard quick links | frontend/css/03-dashboard-widgets.css:1815 |
| dashboard widgets, de-vibecoded | frontend/css/08-consistency.css:4796 |
| document formatting toolbar | frontend/css/05-sidebars-themes.css:1939 |
| documents tab | frontend/css/04-chat-dock-appearance.css:3642 |
| documents: outline, live stats, and where the file actually is | frontend/css/05-sidebars-themes.css:2919 |
| documents: the comments panel (DOCUMENTS_PLAN Phase 5 item 1) | frontend/css/05-sidebars-themes.css:3285 |
| drag to delete (INBOX 660) | frontend/css/library-lazy.css:2410 |
| duplicate tidy-up | frontend/css/05-sidebars-themes.css:1651 |
| editing a question in place | frontend/css/05-sidebars-themes.css:270 |
| empty states that sit where they should | frontend/css/08-consistency.css:4917 |
| entry actions + links (Phase 4) | frontend/css/01-forms-settings.css:2293 |
| entry lists | frontend/css/01-forms-settings.css:1475 |
| every control in a dock takes the touch floor | frontend/css/07-whiteboard-misc.css:11746 |
| every menu scrolls down, never sideways, and never runs off the page | frontend/css/07-whiteboard-misc.css:8708 |
| fields answer the pointer too | frontend/css/07-whiteboard-misc.css:4006 |
| filter help (the list inside `#search-help-hint`, a `.help-body`) | frontend/css/05-sidebars-themes.css:638 |
| finding a setting (§36B) | frontend/css/06-timeline-dialogs.css:1548 |
| finding your way about inside Settings (INBOX 444) | frontend/css/01-forms-settings.css:6310 |
| first-run onboarding tour | frontend/css/04-chat-dock-appearance.css:2333 |
| forms | frontend/css/01-forms-settings.css:248 |
| glass reaches the floating chrome that sat outside it | frontend/css/08-consistency.css:3037 |
| glass restraint (UI_MODERNISATION_PLAN.md, Phase 3) | frontend/css/07-whiteboard-misc.css:8787 |
| graph minimap | frontend/css/02-chat-graph.css:4813 |
| graph polish | frontend/css/03-dashboard-widgets.css:3668 |
| graph: depth, halos and legible labels | frontend/css/04-chat-dock-appearance.css:1551 |
| graph: physics sliders + node popup | frontend/css/04-chat-dock-appearance.css:1593 |
| heading hierarchy (§35L) | frontend/css/01-forms-settings.css:1 |
| held space pans, from any tool | frontend/css/07-whiteboard-misc.css:5394 |
| help guide accordion | frontend/css/04-chat-dock-appearance.css:2392 |
| help mini AI chat (item 40's second half) | frontend/css/04-chat-dock-appearance.css:2424 |
| hovering a node | frontend/css/02-chat-graph.css:1596 |
| icon-only buttons are square, everywhere | frontend/css/07-whiteboard-misc.css:3775 |
| left-aligned button lists stay left-aligned | frontend/css/07-whiteboard-misc.css:4068 |
| line numbers for any textarea (UI_MODERNISATION_PLAN Phase 7.2) | frontend/css/07-whiteboard-misc.css:8943 |
| live clock (reminders tab) | frontend/css/01-forms-settings.css:3930 |
| lock screen (Phase 4) | frontend/css/01-forms-settings.css:2182 |
| map nodes and their edges (MINDMAP_PLAN.md §5, Phase 2) | frontend/css/07-whiteboard-misc.css:9069 |
| markdown tables | frontend/css/04-chat-dock-appearance.css:1931 |
| meeting notes (§17) | frontend/css/02-chat-graph.css:2417 |
| model cards: the Models screen's suggested downloads (INBOX 444) | frontend/css/01-forms-settings.css:6468 |
| more than one route between the same two notes | frontend/css/02-chat-graph.css:1445 |
| motion: a heavy page's first visit (INBOX 580) | frontend/css/08-consistency.css:10812 |
| motion: a hover eases (2026-10-05) | frontend/css/08-consistency.css:10692 |
| motion: a list settles in where its skeleton was (2026-10-05) | frontend/css/08-consistency.css:10669 |
| motion: a menu or popover grows from what opened it (INBOX 103, 2026-10-05) | frontend/css/10-responsive.css:273 |
| motion: a page arrives (INBOX 459 (2), 580) | frontend/css/08-consistency.css:10782 |
| motion: a popup arrives, and leaves the way it came (INBOX 580, 2026-10-05) | frontend/css/08-consistency.css:10869 |
| motion: a sidebar's contents arrive from its edge (INBOX 459 (2)) | frontend/css/08-consistency.css:10703 |
| motion: one sliding indicator for every strip (INBOX 459 (2), 2026-10-05) | frontend/css/08-consistency.css:10543 |
| motion: the opening curtain lifts (INBOX 577) | frontend/css/08-consistency.css:10916 |
| moved from the boot sheets (the boot CSS budget, test_boot_budget.py): rules only the Library | frontend/css/library-lazy.css:16 |
| note card density (§36B) | frontend/css/06-timeline-dialogs.css:1755 |
| note history | frontend/css/05-sidebars-themes.css:1709 |
| notes page polish | frontend/css/03-dashboard-widgets.css:2458 |
| nothing interactive is bare text | frontend/css/07-whiteboard-misc.css:4377 |
| notifications | frontend/css/08-consistency.css:4209 |
| numbered citations inside an answer | frontend/css/02-chat-graph.css:5053 |
| one control height per Library header row | frontend/css/07-whiteboard-misc.css:5862 |
| one gap under every card heading | frontend/css/01-forms-settings.css:5325 |
| one line of facts: a note's meta row | frontend/css/08-consistency.css:3072 |
| one popup, three tiers (INBOX 456, DESIGN.md "A popup window or panel") | frontend/css/08-consistency.css:10178 |
| one size for every dropdown | frontend/css/01-forms-settings.css:5282 |
| one switch, everywhere a checkbox means "on or off" | frontend/css/06-timeline-dialogs.css:2343 |
| one ⋯ button, everywhere (INBOX 722) | frontend/css/00-tokens-shell.css:4648 |
| optional extras (Settings) | frontend/css/00-tokens-shell.css:1755 |
| page margins (Appearance > Page Margins) | frontend/css/07-whiteboard-misc.css:2993 |
| previews on the Library's document and board cards | frontend/css/library-lazy.css:633 |
| radio groups as choices, not as a list of dots (§35L) | frontend/css/06-timeline-dialogs.css:1399 |
| reading a scan against its own pages | frontend/css/02-chat-graph.css:3981 |
| rebindable shortcuts | frontend/css/05-sidebars-themes.css:702 |
| reminders page polish | frontend/css/03-dashboard-widgets.css:3062 |
| reminders, de-vibecoded | frontend/css/08-consistency.css:3560 |
| reminders: "when" is one decision, so it is one group | frontend/css/07-whiteboard-misc.css:4023 |
| reminders: month-grid view (ROADMAP.md gap 4) | frontend/css/01-forms-settings.css:4349 |
| resizable sidebars | frontend/css/05-sidebars-themes.css:1746 |
| results: the list-row recipe | frontend/css/03-dashboard-widgets.css:1486 |
| rich markdown blocks (tables, quotes, rules, task lists) | frontend/css/01-forms-settings.css:1283 |
| rows instead of cards | frontend/css/00-tokens-shell.css:2457 |
| rules recovered from inline style attributes (audit of §40) | frontend/css/07-whiteboard-misc.css:1174 |
| saved filters | frontend/css/05-sidebars-themes.css:653 |
| screen-reader-only announcements | frontend/css/04-chat-dock-appearance.css:2735 |
| scrollbars | frontend/css/07-whiteboard-misc.css:3948 |
| search match highlighting | frontend/css/05-sidebars-themes.css:312 |
| settings / model manager | frontend/css/01-forms-settings.css:2132 |
| settings modal + logs (Wave A) | frontend/css/01-forms-settings.css:3518 |
| settings rows: one shape at rest | frontend/css/01-forms-settings.css:5059 |
| settings, de-vibecoded | frontend/css/08-consistency.css:3577 |
| settings: one column for every "?", and a pane title that is a title | frontend/css/08-consistency.css:3804 |
| sidebar | frontend/css/01-forms-settings.css:125 |
| sidebar heading rows | frontend/css/05-sidebars-themes.css:1 |
| space dialogs | frontend/css/07-whiteboard-misc.css:2862 |
| space switcher (top bar) | frontend/css/07-whiteboard-misc.css:2671 |
| spacious density (third option alongside comfortable/compact) | frontend/css/04-chat-dock-appearance.css:1991 |
| tab navigation (Wave A; pill style inside the top bar in Wave L) | frontend/css/00-tokens-shell.css:3818 |
| text inputs (§36B) | frontend/css/01-forms-settings.css:249 |
| the "/" menu and block frames | frontend/css/05-sidebars-themes.css:839 |
| the "?" head row and its help body | frontend/css/01-forms-settings.css:5916 |
| the 464 round: Settings groups, switch rows, the phone's chrome | frontend/css/08-consistency.css:10926 |
| the AI skills dock: one row where it fits (INBOX 450, 599) | frontend/css/08-consistency.css:10456 |
| the AI status dot | frontend/css/00-tokens-shell.css:1604 |
| the Ask box explaining itself (§35A) | frontend/css/06-timeline-dialogs.css:1375 |
| the Ask box reads as one composer | frontend/css/07-whiteboard-misc.css:3388 |
| the Connections dialog (REDESIGN.md §R7.3) | frontend/css/07-whiteboard-misc.css:5693 |
| the Dashboard's dock on a phone (INBOX 436) | frontend/css/10-responsive.css:2783 |
| the Documents editor on a phone (INBOX 430) | frontend/css/10-responsive.css:2556 |
| the Documents editor on a small laptop (INBOX 430's re-scope) | frontend/css/10-responsive.css:2699 |
| the Graph dock's second row, and the nine pixels that cause it | frontend/css/08-consistency.css:2644 |
| the HUD: a momentary readout, not a notification | frontend/css/07-whiteboard-misc.css:8551 |
| the Library (§4, §36F) | frontend/css/00-tokens-shell.css:1921 |
| the Library on a phone (BACKLOG §116.1 item 3) | frontend/css/07-whiteboard-misc.css:10296 |
| the Library tab's floating action is not the whiteboard's | frontend/css/07-whiteboard-misc.css:11970 |
| the Library's Activity rows (library.js, `library-${item.kind}`) | frontend/css/library-lazy.css:2172 |
| the Library, de-vibecoded (the owner: "devibecode all the ui") | frontend/css/08-consistency.css:3311 |
| the Library, second pass: cards in reading order, one anatomy | frontend/css/08-consistency.css:4269 |
| the OCR rail's own switch | frontend/css/07-whiteboard-misc.css:7335 |
| the Skills dropdown | frontend/css/04-chat-dock-appearance.css:1179 |
| the Sources panel | frontend/css/02-chat-graph.css:5623 |
| the accessible card: the title opens it (INBOX 433) | frontend/css/08-consistency.css:3378 |
| the agent activity panel: nothing scrolls sideways, nothing folds onto | frontend/css/07-whiteboard-misc.css:11799 |
| the agent's run, as a timeline | frontend/css/02-chat-graph.css:673 |
| the app emblem, reused across the UI | frontend/css/03-dashboard-widgets.css:3298 |
| the app's one help popover | frontend/css/03-dashboard-widgets.css:4251 |
| the app's own dropdown | frontend/css/07-whiteboard-misc.css:4127 |
| the arrange zone, once it is inside the overflow menu | frontend/css/07-whiteboard-misc.css:10958 |
| the assistant's head and its three verbs (the owner, 2026-09-24: | frontend/css/04-chat-dock-appearance.css:4811 |
| the assistant's three verbs (INBOX 192) | frontend/css/09-editor.css:845 |
| the attachment card (INBOX 440 (2), DESIGN.md "A file attached to a | frontend/css/05-sidebars-themes.css:383 |
| the bar's three zones | frontend/css/00-tokens-shell.css:3532 |
| the block bar (INBOX 421 b) | frontend/css/09-editor.css:1225 |
| the board panel, sorted into the questions it answers | frontend/css/07-whiteboard-misc.css:5449 |
| the board's bar takes the floor of the whole touch band, not just 600 | frontend/css/10-responsive.css:2383 |
| the boot splash: one progress indicator, not two | frontend/css/08-consistency.css:4903 |
| the bottom docks | frontend/css/07-whiteboard-misc.css:10903 |
| the chat dock follows its own width (INBOX 694) | frontend/css/10-responsive.css:2878 |
| the chat page fills its height (§36A) | frontend/css/06-timeline-dialogs.css:1496 |
| the chat sidebar on a phone | frontend/css/02-chat-graph.css:6201 |
| the chat toolbar, grouped (§36B) | frontend/css/06-timeline-dialogs.css:1633 |
| the citation peek (INBOX 80) | frontend/css/02-chat-graph.css:5123 |
| the code editor: gutter + monospace | frontend/css/04-chat-dock-appearance.css:4406 |
| the composer dock (asked for directly) | frontend/css/04-chat-dock-appearance.css:943 |
| the composer, as one surface | frontend/css/04-chat-dock-appearance.css:5180 |
| the connections rail (WORLD_CLASS_PLAN D2; `renderNotesRail`) | frontend/css/04-chat-dock-appearance.css:321 |
| the context bar (WHITEBOARD_PLAN.md Phase 2, decision 2) | frontend/css/07-whiteboard-misc.css:7947 |
| the dashboard and the labels, de-vibecoded | frontend/css/08-consistency.css:3442 |
| the dashboard's greeting banner, on a phone | frontend/css/07-whiteboard-misc.css:11679 |
| the dashboard's quick actions stop wrapping | frontend/css/07-whiteboard-misc.css:11626 |
| the dashboard's three densities | frontend/css/07-whiteboard-misc.css:12492 |
| the day-one dashboard | frontend/css/05-sidebars-themes.css:4062 |
| the desk's own rows (WORLD_CLASS_PLAN D16) | frontend/css/04-chat-dock-appearance.css:3487 |
| the dock (UI_MODERNISATION_PLAN.md Phase 8) | frontend/css/07-whiteboard-misc.css:10350 |
| the dock above the editor | frontend/css/04-chat-dock-appearance.css:4073 |
| the dock row below 1100 | frontend/css/07-whiteboard-misc.css:11017 |
| the document editor's instruments | frontend/css/05-sidebars-themes.css:4928 |
| the document toolbar's two folds | frontend/css/07-whiteboard-misc.css:5773 |
| the documents editor | frontend/css/library-lazy.css:2263 |
| the documents sidebar's vertical budget (§41) | frontend/css/07-whiteboard-misc.css:2408 |
| the export dialog (WHITEBOARD_PLAN.md Phase 3, decision 4) | frontend/css/06-timeline-dialogs.css:2858 |
| the faded notes card (WORLD_CLASS_PLAN 15, I4) | frontend/css/03-dashboard-widgets.css:4708 |
| the field: the glyph inside, Stop only while something is loading | frontend/css/03-dashboard-widgets.css:1348 |
| the file picker, in the app's own clothes | frontend/css/08-consistency.css:9813 |
| the flat looks carry no glow on a button | frontend/css/08-consistency.css:4166 |
| the flat looks: a selected tab is a place, not an action | frontend/css/08-consistency.css:3292 |
| the formatting strip says what the caret is already in | frontend/css/09-editor.css:1204 |
| the glass card | frontend/css/00-tokens-shell.css:4115 |
| the graph node panel becomes a sheet (GRAPH_PLAN Phase 6) | frontend/css/07-whiteboard-misc.css:11269 |
| the graph's floating controls clear its New note (INBOX 430) | frontend/css/10-responsive.css:2541 |
| the graph's legend: one container, not a pill in a box | frontend/css/08-consistency.css:3527 |
| the graph's options panel | frontend/css/08-consistency.css:3757 |
| the guided tour (DESIGN.md, "A guided tour step") | frontend/css/04-chat-dock-appearance.css:5651 |
| the head: identity, one fact as a dot, an all-icon group | frontend/css/03-dashboard-widgets.css:1288 |
| the help popover is a popover, not a page (INBOX 206) | frontend/css/08-consistency.css:2886 |
| the in-app confirm dialog (§35F) | frontend/css/06-timeline-dialogs.css:1253 |
| the lightbox on a phone (INBOX 430) | frontend/css/10-responsive.css:2524 |
| the live action line | frontend/css/02-chat-graph.css:5452 |
| the lock screen | frontend/css/08-consistency.css:4248 |
| the log console (§1) | frontend/css/06-timeline-dialogs.css:821 |
| the map is the tab, and its controls float over it | frontend/css/02-chat-graph.css:6228 |
| the mind map's outline and markers (MINDMAP_PLAN decisions 33, 34) | frontend/css/library-lazy.css:1988 |
| the node edit strip (MINDMAP_PLAN.md §12.1 item 2) | frontend/css/07-whiteboard-misc.css:9570 |
| the node radial (MINDMAP_PLAN.md §12.1 item 3) | frontend/css/07-whiteboard-misc.css:9866 |
| the note card's metadata, ordered (§36B) | frontend/css/06-timeline-dialogs.css:1684 |
| the notifications centre (§36E) | frontend/css/06-timeline-dialogs.css:1872 |
| the one control in a dock that was not the dock's height | frontend/css/10-responsive.css:395 |
| the one generating animation | frontend/css/01-forms-settings.css:5212 |
| the one map chip (MINDMAP_PLAN.md §5 item 12) | frontend/css/05-sidebars-themes.css:781 |
| the one popover shell (UI_MODERNISATION_PLAN.md, Phase 2) | frontend/css/07-whiteboard-misc.css:8743 |
| the orphan-row pattern, everywhere else it appears (§36B) | frontend/css/06-timeline-dialogs.css:1851 |
| the overview strip | frontend/css/00-tokens-shell.css:1989 |
| the page scrollers scroll on the compositor | frontend/css/08-consistency.css:4938 |
| the page shell (§35L) | frontend/css/00-tokens-shell.css:3911 |
| the palette on a touch screen (INBOX 464) | frontend/css/10-responsive.css:2863 |
| the phone header fits inside the phone | frontend/css/05-sidebars-themes.css:6341 |
| the picker itself | frontend/css/05-sidebars-themes.css:3933 |
| the primary action floats, where a dock has one | frontend/css/07-whiteboard-misc.css:11509 |
| the quick-nav chord's guide | frontend/css/10-responsive.css:489 |
| the reader: one scroller, the page set as prose | frontend/css/03-dashboard-widgets.css:1637 |
| the reply head on Ask's answer, the draft and the guide (INBOX 471) | frontend/css/08-consistency.css:10520 |
| the rich picker (rich-picker.js; DESIGN.md's recipe index) | frontend/css/05-sidebars-themes.css:880 |
| the run list (AGENT_SKILLS_REFORM.md, Phase C) | frontend/css/07-whiteboard-misc.css:1589 |
| the scroll container (§36A) | frontend/css/00-tokens-shell.css:1156 |
| the selection tick in Rows (INBOX 426 z, image 91) | frontend/css/08-consistency.css:9971 |
| the selection tick, in the app's own language | frontend/css/07-whiteboard-misc.css:4706 |
| the settings jump list | frontend/css/07-whiteboard-misc.css:11702 |
| the settings sheet takes the touch floor | frontend/css/01-forms-settings.css:6070 |
| the sketch pad's tool palette | frontend/css/02-chat-graph.css:1947 |
| the spine | frontend/css/00-tokens-shell.css:2396 |
| the spine on the other edge (MINDMAP_PLAN.md §13e) | frontend/css/07-whiteboard-misc.css:9350 |
| the status bar (§36D) | frontend/css/00-tokens-shell.css:3443 |
| the status bar from 820 to 959: one item fewer | frontend/css/10-responsive.css:1323 |
| the status bar on a small phone | frontend/css/00-tokens-shell.css:3786 |
| the status line and the recent searches | frontend/css/03-dashboard-widgets.css:1417 |
| the step group (Perplexity's "Finished N steps") | frontend/css/02-chat-graph.css:5536 |
| the strip's three doors (MINDMAP_PLAN.md §13b) | frontend/css/07-whiteboard-misc.css:9674 |
| the strips that appear only when they apply | frontend/css/00-tokens-shell.css:2006 |
| the structural blocks (INBOX 421 b) | frontend/css/05-sidebars-themes.css:1364 |
| the suggestion menu, the dictionary, and the goal | frontend/css/05-sidebars-themes.css:5511 |
| the switch's hit target (MODERNISATION_AUDIT.md Brief 8) | frontend/css/07-whiteboard-misc.css:8906 |
| the tab strip is centred on the window, not on whatever is left of it | frontend/css/07-whiteboard-misc.css:8596 |
| the timeline, de-vibecoded | frontend/css/08-consistency.css:3541 |
| the tool rail (WHITEBOARD_PLAN.md Phase 1, decision 1) | frontend/css/07-whiteboard-misc.css:11879 |
| the tools panel, sorted into what each group of icons does | frontend/css/06-timeline-dialogs.css:3035 |
| the touch floor, for the two surfaces the dock rule cannot reach | frontend/css/03-dashboard-widgets.css:4672 |
| the trace strip | frontend/css/04-chat-dock-appearance.css:1 |
| the two radio-backed segmented bars | frontend/css/03-dashboard-widgets.css:3749 |
| the two whiteboard controls that never joined the strip | frontend/css/07-whiteboard-misc.css:3683 |
| the web-search engine picker | frontend/css/04-chat-dock-appearance.css:2565 |
| the whiteboard top bar and the documents editor join the families | frontend/css/07-whiteboard-misc.css:8824 |
| the whiteboard's panels are one surface each | frontend/css/07-whiteboard-misc.css:3905 |
| the whiteboard's tools become a bottom strip | frontend/css/07-whiteboard-misc.css:11582 |
| the writing room | frontend/css/04-chat-dock-appearance.css:3340 |
| tools & features browser | frontend/css/03-dashboard-widgets.css:2203 |
| top bar polish | frontend/css/05-sidebars-themes.css:4617 |
| transcluded notes (![[note]]) | frontend/css/05-sidebars-themes.css:1536 |
| two-up cards in tablet portrait | frontend/css/07-whiteboard-misc.css:11199 |
| user-tunable corner rounding | frontend/css/04-chat-dock-appearance.css:1960 |
| web panel (search + reader) | frontend/css/03-dashboard-widgets.css:1253 |
| what a wide screen is for | frontend/css/00-tokens-shell.css:3922 |
| what it learned (WORLD_CLASS_PLAN I9) | frontend/css/01-forms-settings.css:6137 |
| what the AI remembers (ROADMAP §39B) | frontend/css/07-whiteboard-misc.css:2183 |
| what the agent found, as things you can open | frontend/css/07-whiteboard-misc.css:5815 |
| what the answering model is | frontend/css/02-chat-graph.css:6013 |
| what the phone block assumed, and the sheet undoes | frontend/css/07-whiteboard-misc.css:11215 |
| whiteboard fixes (§41) | frontend/css/07-whiteboard-misc.css:2328 |
| whiteboard objects: images and text boxes, neither tied to a note | frontend/css/07-whiteboard-misc.css:1 |
| widget picker modal (roadmap §26) | frontend/css/07-whiteboard-misc.css:3547 |

### Lines per stylesheet

| File | Lines |
|---|---|
| frontend/css/00-tokens-shell.css | 4681 |
| frontend/css/01-forms-settings.css | 6747 |
| frontend/css/02-chat-graph.css | 6694 |
| frontend/css/03-dashboard-widgets.css | 5161 |
| frontend/css/04-chat-dock-appearance.css | 6392 |
| frontend/css/05-sidebars-themes.css | 6726 |
| frontend/css/06-timeline-dialogs.css | 4202 |
| frontend/css/07-whiteboard-misc.css | 13496 |
| frontend/css/08-consistency.css | 11631 |
| frontend/css/09-editor.css | 1375 |
| frontend/css/10-responsive.css | 3002 |
| frontend/css/graph-lazy.css | 46 |
| frontend/css/icon-picker.css | 100 |
| frontend/css/library-lazy.css | 3258 |
| frontend/css/nav-history-lazy.css | 54 |
| frontend/css/recovery-lazy.css | 115 |
| frontend/css/tidy-lazy.css | 298 |

## Backend routes (481)

`@router.<method>(` and `@app.<method>(` decorators in `src/memorymap/api/*.py`, sorted by path. The line is the decorator's.

| Path | Method | Function | File:line |
|---|---|---|---|
|  | DELETE | `clear` | src/memorymap/api/routes_usage.py:40 |
|  | DELETE | `clear_ask_history` | src/memorymap/api/routes_ask_history.py:177 |
|  | DELETE | `forget_everything` | src/memorymap/api/routes_learned.py:212 |
|  | GET | `list_ask_history` | src/memorymap/api/routes_ask_history.py:45 |
|  | GET | `list_bookmarks` | src/memorymap/api/routes_bookmarks.py:116 |
|  | GET | `list_categories` | src/memorymap/api/routes_categories.py:144 |
|  | GET | `list_conversations` | src/memorymap/api/routes_conversations.py:286 |
|  | GET | `list_documents` | src/memorymap/api/routes_documents.py:340 |
|  | GET | `list_duplicates` | src/memorymap/api/routes_duplicates.py:78 |
|  | GET | `list_entities` | src/memorymap/api/routes_entities.py:68 |
|  | GET | `list_entries` | src/memorymap/api/routes_entries.py:2132 |
|  | GET | `list_facts` | src/memorymap/api/routes_learned.py:132 |
|  | GET | `list_questions` | src/memorymap/api/routes_questions.py:26 |
|  | GET | `list_reminders` | src/memorymap/api/routes_reminders.py:319 |
|  | GET | `list_tags` | src/memorymap/api/routes_tags.py:40 |
|  | GET | `list_types` | src/memorymap/api/routes_relations.py:65 |
|  | GET | `search` | src/memorymap/api/routes_search.py:55 |
|  | GET | `state` | src/memorymap/api/routes_bench.py:124 |
|  | GET | `suggestions` | src/memorymap/api/routes_inbox.py:124 |
|  | GET | `tidy_summary` | src/memorymap/api/routes_tidy.py:45 |
|  | GET | `timeline` | src/memorymap/api/routes_timeline.py:375 |
|  | GET | `today` | src/memorymap/api/routes_resurface.py:96 |
|  | POST | `chat` | src/memorymap/api/routes_chat.py:1410 |
|  | POST | `count` | src/memorymap/api/routes_usage.py:30 |
|  | POST | `create_bookmark` | src/memorymap/api/routes_bookmarks.py:143 |
|  | POST | `create_category` | src/memorymap/api/routes_categories.py:156 |
|  | POST | `create_conversation` | src/memorymap/api/routes_conversations.py:416 |
|  | POST | `create_document` | src/memorymap/api/routes_documents.py:469 |
|  | POST | `create_entry` | src/memorymap/api/routes_entries.py:671 |
|  | POST | `create_reminder` | src/memorymap/api/routes_reminders.py:364 |
|  | POST | `create_type` | src/memorymap/api/routes_relations.py:76 |
|  | POST | `start` | src/memorymap/api/routes_bench.py:84 |
| `/` | GET | `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:855 |
| `/account` | GET | `account` | src/memorymap/api/routes_auth.py:956 |
| `/all` | GET | `ranked` | src/memorymap/api/routes_resurface.py:119 |
| `/apply` | POST | `apply_update` | src/memorymap/api/routes_update.py:658 |
| `/apply/status` | GET | `apply_status` | src/memorymap/api/routes_update.py:752 |
| `/ask` | POST | `ask` | src/memorymap/api/routes_help.py:59 |
| `/ask/stream` | POST | `ask_stream` | src/memorymap/api/routes_help.py:71 |
| `/audit` | DELETE | `clear_audit_log` | src/memorymap/api/routes_settings.py:1706 |
| `/audit` | GET | `audit_log` | src/memorymap/api/routes_settings.py:1430 |
| `/audit/export.csv` | GET | `audit_export_csv` | src/memorymap/api/routes_settings.py:1521 |
| `/auto` | PUT | `tidy_auto` | src/memorymap/api/routes_tidy.py:55 |
| `/auto-session` | POST | `auto_session` | src/memorymap/api/routes_auth.py:693 |
| `/backups` | GET | `list_backups` | src/memorymap/api/routes_backups.py:92 |
| `/backups` | POST | `backup_now` | src/memorymap/api/routes_backups.py:101 |
| `/backups/bundle` | POST | `export_bundle` | src/memorymap/api/routes_backups.py:200 |
| `/backups/bundle/restore` | POST | `restore_bundle` | src/memorymap/api/routes_backups.py:241 |
| `/backups/restore` | POST | `restore_backup` | src/memorymap/api/routes_backups.py:141 |
| `/backups/retention` | PUT | `set_retention` | src/memorymap/api/routes_backups.py:123 |
| `/backups/{name}` | DELETE | `delete_backup` | src/memorymap/api/routes_backups.py:172 |
| `/board-library` | GET | `list_library` | src/memorymap/api/routes_board_library.py:380 |
| `/board-library` | POST | `create_library_item` | src/memorymap/api/routes_board_library.py:469 |
| `/board-library/export` | GET | `export_library` | src/memorymap/api/routes_board_library.py:618 |
| `/board-library/import` | POST | `import_library` | src/memorymap/api/routes_board_library.py:647 |
| `/board-library/libraries` | POST | `create_library` | src/memorymap/api/routes_board_library.py:584 |
| `/board-library/libraries/{library_id}` | DELETE | `delete_library` | src/memorymap/api/routes_board_library.py:602 |
| `/board-library/libraries/{library_id}` | PUT | `rename_library` | src/memorymap/api/routes_board_library.py:594 |
| `/board-library/marks` | POST | `mark_builtin` | src/memorymap/api/routes_board_library.py:568 |
| `/board-library/new-board` | POST | `new_board_from_template` | src/memorymap/api/routes_board_library.py:1001 |
| `/board-library/{item_id}` | DELETE | `delete_library_item` | src/memorymap/api/routes_board_library.py:525 |
| `/board-library/{item_id}` | PUT | `update_library_item` | src/memorymap/api/routes_board_library.py:501 |
| `/board-library/{item_id}/duplicate` | POST | `duplicate_library_item` | src/memorymap/api/routes_board_library.py:547 |
| `/board-library/{item_id}/restore` | POST | `restore_library_item` | src/memorymap/api/routes_board_library.py:536 |
| `/boards` | GET | `list_boards` | src/memorymap/api/routes_whiteboard.py:2074 |
| `/boards` | POST | `create_board` | src/memorymap/api/routes_whiteboard.py:2330 |
| `/boards/generate` | POST | `generate_map` | src/memorymap/api/routes_whiteboard.py:5354 |
| `/boards/import` | POST | `import_board` | src/memorymap/api/routes_whiteboard.py:5428 |
| `/boards/propose` | POST | `propose_map` | src/memorymap/api/routes_whiteboard.py:5225 |
| `/boards/{board_id}` | PUT | `rename_board` | src/memorymap/api/routes_whiteboard.py:2512 |
| `/boards/{board_id}/duplicate` | POST | `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2372 |
| `/boards/{board_id}/export` | GET | `export_board` | src/memorymap/api/routes_whiteboard.py:4449 |
| `/boards/{board_id}/nodes` | POST | `create_map_node` | src/memorymap/api/routes_whiteboard.py:3426 |
| `/boards/{board_id}/nodes/clear-style` | POST | `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:3851 |
| `/boards/{board_id}/nodes/move-many` | PUT | `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3714 |
| `/boards/{board_id}/nodes/outline` | POST | `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3521 |
| `/boards/{board_id}/nodes/{node_id}/branches` | POST | `add_branches` | src/memorymap/api/routes_map_suggest.py:197 |
| `/boards/{board_id}/nodes/{node_id}/move` | PUT | `move_map_node` | src/memorymap/api/routes_whiteboard.py:3597 |
| `/boards/{board_id}/nodes/{node_id}/suggest` | POST | `suggest_branches` | src/memorymap/api/routes_map_suggest.py:146 |
| `/boards/{board_id}/nodes/{node_id}/summary` | POST | `summarise_branch` | src/memorymap/api/routes_map_suggest.py:308 |
| `/boards/{board_id}/tree` | GET | `board_tree` | src/memorymap/api/routes_whiteboard.py:3359 |
| `/bulk` | POST | `bulk_action` | src/memorymap/api/routes_learned.py:236 |
| `/bulk` | POST | `bulk_edit_tags` | src/memorymap/api/routes_tags.py:104 |
| `/capabilities` | GET | `capabilities` | src/memorymap/api/routes_capabilities.py:75 |
| `/change-password` | POST | `change_password` | src/memorymap/api/routes_auth.py:988 |
| `/changelog` | GET | `changelog` | src/memorymap/api/app.py:1354 |
| `/charts/question` | POST | `chart_for_question` | src/memorymap/api/routes_vision.py:408 |
| `/chat-model` | POST | `set_chat_model` | src/memorymap/api/routes_models.py:677 |
| `/check` | GET | `check_for_update` | src/memorymap/api/routes_update.py:425 |
| `/check-syntax` | POST | `check_syntax` | src/memorymap/api/routes_documents.py:308 |
| `/choice` | POST | `update_choice` | src/memorymap/api/routes_update.py:411 |
| `/clip` | POST | `clip` | src/memorymap/api/routes_webclip.py:44 |
| `/clip-page` | POST | `clip_page` | src/memorymap/api/routes_webclip.py:110 |
| `/compose` | POST | `compose_draft` | src/memorymap/api/routes_drafts.py:75 |
| `/compose/stream` | POST | `compose_draft_stream` | src/memorymap/api/routes_drafts.py:110 |
| `/compress` | POST | `compress_history` | src/memorymap/api/routes_chat.py:2529 |
| `/compute` | POST | `compute` | src/memorymap/api/routes_resurface.py:85 |
| `/corrections` | GET | `list_corrections` | src/memorymap/api/routes_learned.py:78 |
| `/corrections` | POST | `add_correction` | src/memorymap/api/routes_learned.py:53 |
| `/count` | GET | `count_entries` | src/memorymap/api/routes_entries.py:2293 |
| `/counts` | GET | `reminder_counts` | src/memorymap/api/routes_reminders.py:157 |
| `/daily` | GET | `daily_journal` | src/memorymap/api/routes_entries.py:905 |
| `/daily/{day}` | GET | `daily_note` | src/memorymap/api/routes_entries.py:947 |
| `/daily/{day}` | POST | `open_daily_note` | src/memorymap/api/routes_entries.py:963 |
| `/delete` | POST | `delete_model` | src/memorymap/api/routes_models.py:989 |
| `/delete` | POST | `delete_tag` | src/memorymap/api/routes_tags.py:95 |
| `/desktop/fullscreen` | GET | `desktop_fullscreen_state` | src/memorymap/api/routes_tasks.py:692 |
| `/desktop/fullscreen` | POST | `desktop_fullscreen_toggle` | src/memorymap/api/routes_tasks.py:704 |
| `/digest` | POST | `weekly_digest` | src/memorymap/api/routes_insights.py:639 |
| `/digest/stream` | POST | `weekly_digest_stream` | src/memorymap/api/routes_insights.py:571 |
| `/documents/run-sandbox` | GET | `run_sandbox` | src/memorymap/api/run_sandbox.py:132 |
| `/documents/run-sandbox/python` | GET | `run_sandbox_python` | src/memorymap/api/run_sandbox.py:366 |
| `/embedding-backend` | POST | `set_embedding_backend` | src/memorymap/api/routes_models.py:900 |
| `/embedding-models` | GET | `list_embedding_models` | src/memorymap/api/routes_settings.py:1801 |
| `/embedding-models/choices` | GET | `embedding_model_choices` | src/memorymap/api/routes_settings.py:1828 |
| `/embedding-models/pull` | POST | `pull_embedding_model` | src/memorymap/api/routes_settings.py:1883 |
| `/embedding-models/use` | POST | `use_embedding_model` | src/memorymap/api/routes_settings.py:1860 |
| `/embedding-models/{model_id}` | DELETE | `remove_embedding_model` | src/memorymap/api/routes_settings.py:1939 |
| `/embedding-models/{model_id}/download` | POST | `download_embedding_model` | src/memorymap/api/routes_settings.py:1920 |
| `/entries/{entry_id}/files` | POST | `upload_file` | src/memorymap/api/routes_files.py:93 |
| `/entries/{entry_id}/meeting` | GET | `read_meeting` | src/memorymap/api/routes_meetings.py:89 |
| `/entries/{entry_id}/meeting/append` | POST | `append_to_meeting` | src/memorymap/api/routes_meetings.py:175 |
| `/entries/{entry_id}/meeting/remind` | POST | `remind_action` | src/memorymap/api/routes_meetings.py:134 |
| `/entries/{entry_id}/meeting/summarise` | POST | `summarise_meeting` | src/memorymap/api/routes_meetings.py:190 |
| `/entries/{entry_id}/properties` | GET | `entry_properties` | src/memorymap/api/routes_properties.py:45 |
| `/entries/{entry_id}/properties` | PUT | `put_properties` | src/memorymap/api/routes_properties.py:61 |
| `/events` | GET | `event_feed` | src/memorymap/api/routes_settings.py:1648 |
| `/events/undo` | POST | `undo_actor` | src/memorymap/api/routes_settings.py:1619 |
| `/export` | GET | `export_learned` | src/memorymap/api/routes_learned.py:150 |
| `/export.ics` | GET | `export_ics` | src/memorymap/api/routes_reminders.py:303 |
| `/export/backup` | GET | `export_backup` | src/memorymap/api/routes_settings.py:2310 |
| `/export/csv` | GET | `export_csv` | src/memorymap/api/routes_settings.py:3023 |
| `/export/json` | GET | `export_json` | src/memorymap/api/routes_settings.py:2334 |
| `/export/markdown` | GET | `export_markdown` | src/memorymap/api/routes_settings.py:2464 |
| `/extract/commit` | POST | `extract_commit` | src/memorymap/api/routes_entries.py:3775 |
| `/extract/preview` | POST | `extract_preview` | src/memorymap/api/routes_entries.py:3729 |
| `/extras` | GET | `list_extras` | src/memorymap/api/routes_settings.py:1737 |
| `/extras/bulk` | POST | `bulk_extras` | src/memorymap/api/routes_settings.py:1769 |
| `/extras/{extra_id}/install` | POST | `install_extra` | src/memorymap/api/routes_settings.py:1778 |
| `/extras/{extra_id}/uninstall` | POST | `uninstall_extra` | src/memorymap/api/routes_settings.py:1791 |
| `/feature-model` | POST | `set_feature_model` | src/memorymap/api/routes_models.py:752 |
| `/feature-models/reset` | POST | `reset_feature_models` | src/memorymap/api/routes_models.py:802 |
| `/file-types` | GET | `list_file_types` | src/memorymap/api/routes_documents.py:283 |
| `/files/exports` | GET | `list_exports` | src/memorymap/api/routes_files.py:1125 |
| `/files/exports/{filename}` | GET | `download_export` | src/memorymap/api/routes_files.py:1163 |
| `/files/gallery` | GET | `list_attachment_gallery` | src/memorymap/api/routes_files.py:293 |
| `/files/open-exports-folder` | POST | `open_exports_folder` | src/memorymap/api/routes_files.py:1174 |
| `/files/readings` | GET | `file_readings` | src/memorymap/api/routes_files.py:269 |
| `/files/save` | POST | `save_generated_file` | src/memorymap/api/routes_files.py:1077 |
| `/files/{attachment_id}` | DELETE | `delete_file` | src/memorymap/api/routes_files.py:898 |
| `/files/{attachment_id}` | PUT | `rename_file` | src/memorymap/api/routes_files.py:920 |
| `/files/{attachment_id}/analyse` | POST | `analyse_attachment` | src/memorymap/api/routes_files.py:445 |
| `/files/{attachment_id}/ocr-clean-loops` | POST | `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3760 |
| `/files/{attachment_id}/ocr-page-read` | POST | `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3410 |
| `/files/{attachment_id}/ocr-range-read` | POST | `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3374 |
| `/files/{attachment_id}/ocr-regions` | GET | `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2510 |
| `/files/{attachment_id}/page-caption` | POST | `attachment_page_caption` | src/memorymap/api/routes_files.py:3615 |
| `/files/{attachment_id}/page-reads` | GET | `attachment_page_reads` | src/memorymap/api/routes_files.py:3653 |
| `/files/{attachment_id}/page-reads/{page}` | DELETE | `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3714 |
| `/files/{attachment_id}/pdf-info` | GET | `attached_file_pdf_info` | src/memorymap/api/routes_files.py:761 |
| `/files/{attachment_id}/region-read` | POST | `attachment_region_read` | src/memorymap/api/routes_files.py:3581 |
| `/files/{attachment_id}/text` | GET | `attached_file_text` | src/memorymap/api/routes_files.py:657 |
| `/files/{attachment_id}/text` | PUT | `save_attached_file_text` | src/memorymap/api/routes_files.py:703 |
| `/followups` | POST | `chat_followups` | src/memorymap/api/routes_chat.py:263 |
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
| `/greeting` | GET | `greeting` | src/memorymap/api/routes_insights.py:160 |
| `/hardware` | GET | `hardware_memory` | src/memorymap/api/routes_models.py:632 |
| `/health` | GET | `debug_health` | src/memorymap/api/routes_debug.py:79 |
| `/health` | GET | `health` | src/memorymap/api/app.py:1301 |
| `/heatmap` | GET | `heatmap` | src/memorymap/api/routes_insights.py:340 |
| `/history` | GET | `board_history` | src/memorymap/api/routes_board_history.py:271 |
| `/history` | GET | `tidy_history` | src/memorymap/api/routes_tidy.py:50 |
| `/history/{event_id}` | GET | `board_at` | src/memorymap/api/routes_board_history.py:302 |
| `/history/{event_id}/restore` | POST | `restore_board` | src/memorymap/api/routes_board_history.py:333 |
| `/images` | GET | `list_images` | src/memorymap/api/routes_whiteboard.py:2262 |
| `/import` | POST | `import_document` | src/memorymap/api/routes_documents.py:493 |
| `/import/app` | POST | `import_app` | src/memorymap/api/routes_import.py:25 |
| `/import/directory` | POST | `import_directory` | src/memorymap/api/routes_settings.py:2805 |
| `/import/document` | POST | `import_document` | src/memorymap/api/routes_settings.py:2927 |
| `/import/markdown` | POST | `import_markdown` | src/memorymap/api/routes_settings.py:2820 |
| `/improve` | POST | `improve_writing` | src/memorymap/api/routes_entries.py:1457 |
| `/inspect` | POST | `inspect_model` | src/memorymap/api/routes_models.py:649 |
| `/instance` | GET | `instance` | src/memorymap/api/app.py:1315 |
| `/instance/focus` | POST | `instance_focus` | src/memorymap/api/app.py:1329 |
| `/jobs` | GET | `list_jobs` | src/memorymap/api/routes_tasks.py:499 |
| `/jobs/cancel` | POST | `cancel_job` | src/memorymap/api/routes_models.py:885 |
| `/jobs/last-runs` | GET | `jobs_last_runs` | src/memorymap/api/routes_tasks.py:465 |
| `/jobs/passes/{kind}/run` | POST | `run_pass_now` | src/memorymap/api/routes_tasks.py:485 |
| `/jobs/stream` | GET | `jobs_stream` | src/memorymap/api/routes_tasks.py:526 |
| `/jobs/{job_id}/cancel` | POST | `cancel_job` | src/memorymap/api/routes_tasks.py:507 |
| `/lan-access` | GET | `lan_access` | src/memorymap/api/routes_auth.py:836 |
| `/lan-access` | POST | `set_lan_access` | src/memorymap/api/routes_auth.py:876 |
| `/lan-certificate` | POST | `regenerate_lan_certificate` | src/memorymap/api/routes_auth.py:857 |
| `/lan-certificate.pem` | GET | `download_lan_certificate` | src/memorymap/api/routes_auth.py:842 |
| `/latest` | GET | `latest` | src/memorymap/api/routes_night.py:84 |
| `/library` | GET | `library` | src/memorymap/api/routes_library.py:1035 |
| `/link-reasons/run` | POST | `tidy_link_reasons_run` | src/memorymap/api/routes_tidy.py:73 |
| `/link-reasons/stop` | POST | `tidy_link_reasons_stop` | src/memorymap/api/routes_tidy.py:83 |
| `/link-suggestions` | GET | `link_suggestions` | src/memorymap/api/routes_entries.py:1571 |
| `/link-suggestions/reasons` | POST | `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:1918 |
| `/links/backfill-reasons` | POST | `backfill_link_reasons` | src/memorymap/api/routes_entries.py:1966 |
| `/lock` | POST | `lock` | src/memorymap/api/routes_auth.py:920 |
| `/lock-all` | POST | `lock_all` | src/memorymap/api/routes_auth.py:1429 |
| `/logs` | DELETE | `clear_server_logs` | src/memorymap/api/routes_settings.py:2029 |
| `/logs` | GET | `server_logs` | src/memorymap/api/routes_settings.py:1946 |
| `/logs/stats` | GET | `server_log_stats` | src/memorymap/api/routes_settings.py:2017 |
| `/logs/stream` | GET | `stream_server_logs` | src/memorymap/api/routes_settings.py:2045 |
| `/maps/from-notes` | POST | `map_from_notes` | src/memorymap/api/routes_map_from_notes.py:256 |
| `/media` | GET | `list_media` | src/memorymap/api/routes_files.py:1384 |
| `/media-session` | POST | `media_session` | src/memorymap/api/routes_auth.py:680 |
| `/media/meta/{filename}` | GET | `media_meta` | src/memorymap/api/routes_files.py:1541 |
| `/media/orphans` | DELETE | `clean_orphaned_media` | src/memorymap/api/routes_files.py:1516 |
| `/media/orphans` | GET | `list_orphaned_media` | src/memorymap/api/routes_files.py:1485 |
| `/media/pdf-info/{filename}` | GET | `media_pdf_info` | src/memorymap/api/routes_files.py:1658 |
| `/media/text/{filename}` | GET | `media_text` | src/memorymap/api/routes_files.py:1591 |
| `/media/upload` | POST | `upload_media` | src/memorymap/api/routes_files.py:1235 |
| `/media/{upload_id}` | DELETE | `delete_media` | src/memorymap/api/routes_files.py:1777 |
| `/media/{upload_id}` | PUT | `rename_media` | src/memorymap/api/routes_files.py:1810 |
| `/media/{upload_id}/caption` | POST | `caption_media` | src/memorymap/api/routes_files.py:1865 |
| `/media/{upload_id}/ocr` | POST | `ocr_media` | src/memorymap/api/routes_files.py:1970 |
| `/media/{upload_id}/ocr-clean-loops` | POST | `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3786 |
| `/media/{upload_id}/ocr-page-read` | POST | `media_ocr_page_read` | src/memorymap/api/routes_files.py:3427 |
| `/media/{upload_id}/ocr-range-read` | POST | `media_ocr_range_read` | src/memorymap/api/routes_files.py:3392 |
| `/media/{upload_id}/ocr-regions` | GET | `media_ocr_regions` | src/memorymap/api/routes_files.py:2476 |
| `/media/{upload_id}/page-caption` | POST | `media_page_caption` | src/memorymap/api/routes_files.py:3636 |
| `/media/{upload_id}/page-reads` | GET | `media_page_reads` | src/memorymap/api/routes_files.py:3669 |
| `/media/{upload_id}/page-reads/{page}` | DELETE | `delete_media_page_read` | src/memorymap/api/routes_files.py:3728 |
| `/media/{upload_id}/region-read` | POST | `media_region_read` | src/memorymap/api/routes_files.py:3601 |
| `/media/{upload_id}/vision-ocr` | POST | `vision_ocr_media` | src/memorymap/api/routes_files.py:3839 |
| `/meetings` | POST | `create_meeting` | src/memorymap/api/routes_meetings.py:51 |
| `/memory` | GET | `list_memory` | src/memorymap/api/routes_settings.py:1289 |
| `/memory` | POST | `add_memory` | src/memorymap/api/routes_settings.py:1324 |
| `/memory/{preference_id}` | DELETE | `forget_memory` | src/memorymap/api/routes_settings.py:1420 |
| `/memory/{preference_id}` | PATCH | `update_memory` | src/memorymap/api/routes_settings.py:1401 |
| `/memory/{preference_id}/answer` | POST | `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1367 |
| `/merge` | POST | `merge_notes` | src/memorymap/api/routes_duplicates.py:135 |
| `/merge` | POST | `merge_tags` | src/memorymap/api/routes_tags.py:86 |
| `/merges/accept` | POST | `accept_merge` | src/memorymap/api/routes_inbox.py:143 |
| `/merges/dismiss` | POST | `dismiss_merge` | src/memorymap/api/routes_inbox.py:157 |
| `/merges/{undo_id}/undo` | POST | `undo_merge_route` | src/memorymap/api/routes_entities.py:227 |
| `/modes` | GET | `list_modes` | src/memorymap/api/routes_chat.py:2465 |
| `/most-accessed` | GET | `most_accessed` | src/memorymap/api/routes_entries.py:2281 |
| `/most-opened` | GET | `most_opened` | src/memorymap/api/routes_vision.py:112 |
| `/move` | POST | `move_notes` | src/memorymap/api/routes_categories.py:166 |
| `/near/{entry_id}` | GET | `near` | src/memorymap/api/routes_resurface.py:145 |
| `/nodes` | POST | `create_node` | src/memorymap/api/routes_whiteboard.py:2627 |
| `/nodes/{node_id}` | DELETE | `delete_node` | src/memorymap/api/routes_whiteboard.py:2704 |
| `/nodes/{node_id}` | PUT | `update_node` | src/memorymap/api/routes_whiteboard.py:2672 |
| `/note-types` | GET | `list_note_types` | src/memorymap/api/routes_properties.py:133 |
| `/note-types` | POST | `create_note_type` | src/memorymap/api/routes_properties.py:145 |
| `/note-types/{type_id}` | DELETE | `delete_note_type` | src/memorymap/api/routes_properties.py:189 |
| `/note-types/{type_id}` | PATCH | `patch_note_type` | src/memorymap/api/routes_properties.py:167 |
| `/objects` | POST | `create_object` | src/memorymap/api/routes_whiteboard.py:2801 |
| `/objects/{object_id}` | DELETE | `delete_object` | src/memorymap/api/routes_whiteboard.py:2879 |
| `/objects/{object_id}` | PUT | `update_object` | src/memorymap/api/routes_whiteboard.py:2845 |
| `/ocr-model` | POST | `set_ocr_model` | src/memorymap/api/routes_models.py:731 |
| `/ocr-readers` | GET | `ocr_readers` | src/memorymap/api/routes_files.py:3183 |
| `/ocr/language` | POST | `set_ocr_language` | src/memorymap/api/routes_files.py:3232 |
| `/on-this-day` | GET | `on_this_day` | src/memorymap/api/routes_insights.py:386 |
| `/openapi.json` | GET | `openapi_schema` | src/memorymap/api/app.py:1284 |
| `/outline` | GET | `documents_outline` | src/memorymap/api/routes_documents.py:437 |
| `/parse` | POST | `magic_add_reminder` | src/memorymap/api/routes_reminders.py:392 |
| `/password-on-open` | POST | `set_password_on_open` | src/memorymap/api/routes_auth.py:781 |
| `/personas/suggest-thinking-words` | POST | `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:187 |
| `/preferences` | GET | `get_preferences` | src/memorymap/api/routes_settings.py:710 |
| `/preferences` | PUT | `update_preferences` | src/memorymap/api/routes_settings.py:952 |
| `/preview` | POST | `preview_merge` | src/memorymap/api/routes_duplicates.py:116 |
| `/provider` | POST | `set_provider` | src/memorymap/api/routes_models.py:819 |
| `/pull` | POST | `pull_model` | src/memorymap/api/routes_models.py:1023 |
| `/query` | GET | `query_entries` | src/memorymap/api/routes_entries.py:1509 |
| `/read` | POST | `read` | src/memorymap/api/routes_editor.py:34 |
| `/receipt` | GET | `receipt` | src/memorymap/api/routes_privacy.py:95 |
| `/recent` | GET | `recent_questions` | src/memorymap/api/routes_chat.py:145 |
| `/recover` | POST | `recover` | src/memorymap/api/routes_auth.py:1350 |
| `/recovery-key` | POST | `make_recovery_key` | src/memorymap/api/routes_auth.py:1273 |
| `/recovery-key/save` | POST | `save_recovery_key` | src/memorymap/api/routes_auth.py:1320 |
| `/recycle-bin/empty` | POST | `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1722 |
| `/reference-counts` | GET | `entry_reference_counts` | src/memorymap/api/routes_entries.py:2313 |
| `/reindex` | POST | `rebuild_search_index` | src/memorymap/api/routes_models.py:949 |
| `/releases` | GET | `list_releases` | src/memorymap/api/routes_update.py:553 |
| `/rename` | POST | `rename_tag` | src/memorymap/api/routes_tags.py:76 |
| `/reset` | POST | `reset` | src/memorymap/api/routes_auth.py:1403 |
| `/restore` | POST | `restore_conversation` | src/memorymap/api/routes_conversations.py:912 |
| `/restore` | POST | `restore_tags` | src/memorymap/api/routes_tags.py:110 |
| `/review-queue` | GET | `review_queue` | src/memorymap/api/routes_vision.py:83 |
| `/review-queue/{entry_id}/accept` | POST | `accept_filing` | src/memorymap/api/routes_vision.py:94 |
| `/rotate-vault-key` | POST | `rotate_vault_key` | src/memorymap/api/routes_auth.py:1070 |
| `/run` | POST | `run_now` | src/memorymap/api/routes_night.py:50 |
| `/runs/{run_id}/facts` | GET | `run_facts` | src/memorymap/api/routes_night.py:92 |
| `/sampling` | GET | `sampling_settings` | src/memorymap/api/routes_models.py:528 |
| `/sampling` | PUT | `save_sampling_settings` | src/memorymap/api/routes_models.py:576 |
| `/seed-examples` | POST | `seed_example_entries` | src/memorymap/api/routes_entries.py:2298 |
| `/setup` | POST | `setup` | src/memorymap/api/routes_auth.py:603 |
| `/shutdown` | POST | `shutdown` | src/memorymap/api/routes_tasks.py:716 |
| `/sketches` | POST | `create_sketch` | src/memorymap/api/routes_whiteboard.py:2725 |
| `/sketches/{sketch_id}` | DELETE | `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2772 |
| `/sketches/{sketch_id}` | PUT | `update_sketch` | src/memorymap/api/routes_whiteboard.py:2747 |
| `/skills` | GET | `list_skills` | src/memorymap/api/routes_settings.py:1188 |
| `/source-status` | GET | `source_update_status` | src/memorymap/api/routes_update.py:623 |
| `/spaces` | GET | `get_spaces` | src/memorymap/api/routes_spaces.py:66 |
| `/spaces` | POST | `create_space` | src/memorymap/api/routes_spaces.py:71 |
| `/spaces/restore` | POST | `restore_space` | src/memorymap/api/routes_spaces.py:182 |
| `/spaces/{space_id}` | DELETE | `delete_space` | src/memorymap/api/routes_spaces.py:274 |
| `/spaces/{space_id}` | PUT | `update_space` | src/memorymap/api/routes_spaces.py:84 |
| `/spaces/{space_id}/move-notes` | POST | `move_notes_to_space` | src/memorymap/api/routes_spaces.py:462 |
| `/spec` | GET | `model_spec` | src/memorymap/api/routes_models.py:488 |
| `/stats` | GET | `ask_history_stats` | src/memorymap/api/routes_ask_history.py:81 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_insights.py:32 |
| `/stats` | GET | `stats` | src/memorymap/api/routes_search.py:133 |
| `/status` | GET | `status` | src/memorymap/api/routes_auth.py:579 |
| `/status` | GET | `status` | src/memorymap/api/routes_models.py:311 |
| `/status` | GET | `status` | src/memorymap/api/routes_voice.py:30 |
| `/stop` | POST | `stop` | src/memorymap/api/routes_bench.py:133 |
| `/storage` | GET | `storage_location` | src/memorymap/api/routes_backups.py:42 |
| `/stream` | POST | `chat_stream` | src/memorymap/api/routes_chat.py:2375 |
| `/suggest-tags` | POST | `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1201 |
| `/suggested` | GET | `suggested` | src/memorymap/api/routes_models.py:590 |
| `/suggestions` | GET | `suggestions` | src/memorymap/api/routes_chat.py:216 |
| `/summarize` | POST | `summarize` | src/memorymap/api/routes_voice.py:110 |
| `/summary` | GET | `learned_summary` | src/memorymap/api/routes_learned.py:189 |
| `/summary` | GET | `summary` | src/memorymap/api/routes_questions.py:43 |
| `/summary` | POST | `summary` | src/memorymap/api/routes_usage.py:35 |
| `/support-bundle` | GET | `support_bundle` | src/memorymap/api/routes_settings.py:2210 |
| `/switches` | GET | `get_switches` | src/memorymap/api/routes_learned.py:197 |
| `/switches` | PUT | `put_switches` | src/memorymap/api/routes_learned.py:203 |
| `/system/clear-static-cache` | POST | `system_clear_static_cache` | src/memorymap/api/app.py:1294 |
| `/system/console-mode` | POST | `set_console_mode` | src/memorymap/api/routes_settings.py:1021 |
| `/system/restart` | POST | `restart_app` | src/memorymap/api/routes_settings.py:1090 |
| `/tag-cloud` | GET | `tag_cloud` | src/memorymap/api/routes_insights.py:375 |
| `/tasks` | GET | `list_tasks` | src/memorymap/api/routes_tasks.py:451 |
| `/tasks/autonomous/last` | GET | `last_autonomous_pass` | src/memorymap/api/routes_tasks.py:651 |
| `/tasks/autonomous/last/clear` | POST | `clear_last_autonomous_pass` | src/memorymap/api/routes_tasks.py:668 |
| `/tasks/cancel` | POST | `cancel_task` | src/memorymap/api/routes_tasks.py:575 |
| `/tasks/history/clear` | POST | `clear_history` | src/memorymap/api/routes_tasks.py:677 |
| `/tasks/trigger-autonomous` | POST | `trigger_autonomous` | src/memorymap/api/routes_tasks.py:614 |
| `/templates/draft` | POST | `draft_template` | src/memorymap/api/routes_settings.py:214 |
| `/tensions` | GET | `find_tensions` | src/memorymap/api/routes_entries.py:1712 |
| `/tensions/accept` | POST | `accept_tension` | src/memorymap/api/routes_entries.py:1864 |
| `/tensions/dismiss` | POST | `dismiss_tension` | src/memorymap/api/routes_entries.py:1888 |
| `/tensions/known` | GET | `known_tensions` | src/memorymap/api/routes_entries.py:1808 |
| `/tidy-proposals` | GET | `tidy_proposals` | src/memorymap/api/routes_vision.py:195 |
| `/tidy-proposals/dismiss` | POST | `dismiss_tidy` | src/memorymap/api/routes_vision.py:249 |
| `/title` | POST | `draft_title` | src/memorymap/api/routes_drafts.py:147 |
| `/tools` | GET | `list_tools` | src/memorymap/api/routes_chat.py:2486 |
| `/tools/execute` | POST | `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:2568 |
| `/topics` | GET | `topics` | src/memorymap/api/routes_help.py:52 |
| `/transcribe` | POST | `transcribe` | src/memorymap/api/routes_voice.py:86 |
| `/transcribe-meeting` | POST | `transcribe_meeting` | src/memorymap/api/routes_voice.py:93 |
| `/types/accept` | POST | `accept_type` | src/memorymap/api/routes_inbox.py:169 |
| `/types/dismiss` | POST | `dismiss_type` | src/memorymap/api/routes_inbox.py:186 |
| `/undo/{undo_id}` | POST | `tidy_undo` | src/memorymap/api/routes_tidy.py:65 |
| `/unlock` | POST | `unlock` | src/memorymap/api/routes_auth.py:624 |
| `/unlock-vault` | POST | `unlock_vault` | src/memorymap/api/routes_auth.py:732 |
| `/utility-model` | POST | `set_utility_model` | src/memorymap/api/routes_models.py:696 |
| `/vision-model` | POST | `set_vision_model` | src/memorymap/api/routes_models.py:714 |
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
| `/whiteboard/boards/{board_id}/place` | POST | `place_library_item` | src/memorymap/api/routes_board_library.py:941 |
| `/{bookmark_id}` | DELETE | `delete_bookmark` | src/memorymap/api/routes_bookmarks.py:183 |
| `/{bookmark_id}` | PUT | `update_bookmark` | src/memorymap/api/routes_bookmarks.py:162 |
| `/{category_id}` | DELETE | `delete_category` | src/memorymap/api/routes_categories.py:340 |
| `/{category_id}` | PUT | `rename_category` | src/memorymap/api/routes_categories.py:329 |
| `/{category_id}/colour` | PUT | `set_category_colour` | src/memorymap/api/routes_categories.py:318 |
| `/{category_id}/merge` | POST | `merge_category` | src/memorymap/api/routes_categories.py:174 |
| `/{category_id}/split` | POST | `split_category` | src/memorymap/api/routes_categories.py:188 |
| `/{category_id}/split/propose` | POST | `propose_split` | src/memorymap/api/routes_categories.py:270 |
| `/{conversation_id}` | DELETE | `delete_conversation` | src/memorymap/api/routes_conversations.py:878 |
| `/{conversation_id}` | GET | `get_conversation` | src/memorymap/api/routes_conversations.py:518 |
| `/{conversation_id}` | PUT | `rename_conversation` | src/memorymap/api/routes_conversations.py:868 |
| `/{conversation_id}/archive` | PUT | `archive_conversation` | src/memorymap/api/routes_conversations.py:376 |
| `/{conversation_id}/fork` | POST | `fork_conversation` | src/memorymap/api/routes_conversations.py:696 |
| `/{conversation_id}/pin` | PUT | `pin_conversation` | src/memorymap/api/routes_conversations.py:356 |
| `/{conversation_id}/retitle` | POST | `retitle_conversation` | src/memorymap/api/routes_conversations.py:557 |
| `/{conversation_id}/truncate` | POST | `truncate_conversation` | src/memorymap/api/routes_conversations.py:656 |
| `/{conversation_id}/turns` | POST | `append_turn` | src/memorymap/api/routes_conversations.py:528 |
| `/{conversation_id}/turns/last` | PUT | `replace_last_turn` | src/memorymap/api/routes_conversations.py:605 |
| `/{conversation_id}/turns/{index}` | DELETE | `delete_turn` | src/memorymap/api/routes_conversations.py:623 |
| `/{conversation_id}/turns/{index}/answer` | PUT | `edit_answer` | src/memorymap/api/routes_conversations.py:838 |
| `/{conversation_id}/turns/{index}/followups` | PUT | `set_turn_followups` | src/memorymap/api/routes_conversations.py:748 |
| `/{conversation_id}/unarchive` | PUT | `unarchive_conversation` | src/memorymap/api/routes_conversations.py:399 |
| `/{document_id}` | DELETE | `delete_document` | src/memorymap/api/routes_documents.py:705 |
| `/{document_id}` | GET | `get_document` | src/memorymap/api/routes_documents.py:595 |
| `/{document_id}` | PUT | `update_document` | src/memorymap/api/routes_documents.py:600 |
| `/{document_id}/ai-check` | POST | `ai_check` | src/memorymap/api/routes_documents.py:1140 |
| `/{document_id}/ai-edit` | POST | `ai_edit` | src/memorymap/api/routes_documents.py:1049 |
| `/{document_id}/ai-edit-log` | GET | `list_ai_edits` | src/memorymap/api/routes_documents.py:1406 |
| `/{document_id}/ai-edit-log` | POST | `record_ai_edit` | src/memorymap/api/routes_documents.py:1366 |
| `/{document_id}/ai-edit-log/{entry_id}/revert` | POST | `revert_ai_edit` | src/memorymap/api/routes_documents.py:1420 |
| `/{document_id}/archive` | PUT | `archive_document` | src/memorymap/api/routes_documents.py:755 |
| `/{document_id}/backlinks` | GET | `document_backlinks` | src/memorymap/api/routes_documents.py:883 |
| `/{document_id}/bookmarks` | GET | `document_bookmarks` | src/memorymap/api/routes_documents.py:224 |
| `/{document_id}/bookmarks` | POST | `attach_bookmark` | src/memorymap/api/routes_documents.py:243 |
| `/{document_id}/bookmarks/{bookmark_id}` | DELETE | `detach_bookmark` | src/memorymap/api/routes_documents.py:260 |
| `/{document_id}/connections` | GET | `document_connections` | src/memorymap/api/routes_documents.py:889 |
| `/{document_id}/export.docx` | GET | `export_docx` | src/memorymap/api/routes_documents.py:1008 |
| `/{document_id}/export.md` | GET | `export_markdown` | src/memorymap/api/routes_documents.py:920 |
| `/{document_id}/export.zip` | GET | `export_bundle` | src/memorymap/api/routes_documents.py:965 |
| `/{document_id}/notes` | POST | `attach_note` | src/memorymap/api/routes_documents.py:790 |
| `/{document_id}/notes/{entry_id}` | DELETE | `detach_note` | src/memorymap/api/routes_documents.py:803 |
| `/{document_id}/purge` | DELETE | `purge_document` | src/memorymap/api/routes_documents.py:739 |
| `/{document_id}/rephrase` | POST | `rephrase_passage` | src/memorymap/api/routes_documents.py:1184 |
| `/{document_id}/restore` | POST | `restore_document` | src/memorymap/api/routes_documents.py:728 |
| `/{document_id}/revisions` | GET | `document_revisions` | src/memorymap/api/routes_documents.py:1234 |
| `/{document_id}/revisions/{revision_id}` | GET | `document_revision` | src/memorymap/api/routes_documents.py:1278 |
| `/{document_id}/revisions/{revision_id}/restore` | POST | `restore_document_revision` | src/memorymap/api/routes_documents.py:1296 |
| `/{document_id}/unarchive` | PUT | `unarchive_document` | src/memorymap/api/routes_documents.py:769 |
| `/{entity_id}` | GET | `entity_page` | src/memorymap/api/routes_entities.py:103 |
| `/{entity_id}` | PATCH | `patch_entity` | src/memorymap/api/routes_entities.py:182 |
| `/{entity_id}/merge` | POST | `merge_into` | src/memorymap/api/routes_entities.py:215 |
| `/{entry_id}` | DELETE | `delete_entry` | src/memorymap/api/routes_entries.py:2604 |
| `/{entry_id}` | GET | `get_entry` | src/memorymap/api/routes_entries.py:2363 |
| `/{entry_id}` | PUT | `update_entry` | src/memorymap/api/routes_entries.py:2471 |
| `/{entry_id}/archive` | POST | `archive_entry` | src/memorymap/api/routes_entries.py:2632 |
| `/{entry_id}/backlinks` | GET | `entry_backlinks` | src/memorymap/api/routes_mentions.py:155 |
| `/{entry_id}/bookmarks` | GET | `entry_bookmarks` | src/memorymap/api/routes_entries.py:2064 |
| `/{entry_id}/bookmarks` | POST | `attach_bookmark` | src/memorymap/api/routes_entries.py:2085 |
| `/{entry_id}/bookmarks/{bookmark_id}` | DELETE | `detach_bookmark` | src/memorymap/api/routes_entries.py:2105 |
| `/{entry_id}/connections` | GET | `entry_connections` | src/memorymap/api/routes_entries.py:3377 |
| `/{entry_id}/context` | POST | `add_context` | src/memorymap/api/routes_entries.py:1263 |
| `/{entry_id}/export.md` | GET | `export_entry` | src/memorymap/api/routes_entries.py:2440 |
| `/{entry_id}/filing` | GET | `filing_status` | src/memorymap/api/routes_entries.py:1097 |
| `/{entry_id}/filing` | POST | `decide_filing` | src/memorymap/api/routes_entries.py:1047 |
| `/{entry_id}/filing/stop` | POST | `stop_filing_one` | src/memorymap/api/routes_entries.py:1028 |
| `/{entry_id}/generate-title` | POST | `generate_entry_title` | src/memorymap/api/routes_entries.py:3292 |
| `/{entry_id}/history` | GET | `entry_history` | src/memorymap/api/routes_entries.py:3095 |
| `/{entry_id}/history/{revision_id}/restore` | POST | `restore_revision` | src/memorymap/api/routes_entries.py:3241 |
| `/{entry_id}/links` | POST | `create_link` | src/memorymap/api/routes_entries.py:3595 |
| `/{entry_id}/links/{link_id}` | DELETE | `delete_link` | src/memorymap/api/routes_entries.py:3620 |
| `/{entry_id}/links/{link_id}` | PATCH | `patch_link` | src/memorymap/api/routes_entries.py:3632 |
| `/{entry_id}/links/{link_id}/generate-reason` | POST | `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3675 |
| `/{entry_id}/links/{link_id}/reason` | PUT | `update_link_reason` | src/memorymap/api/routes_entries.py:3654 |
| `/{entry_id}/mentions/link` | POST | `link_mention` | src/memorymap/api/routes_mentions.py:171 |
| `/{entry_id}/privacy` | POST | `set_entry_privacy` | src/memorymap/api/routes_entries.py:3266 |
| `/{entry_id}/purge` | DELETE | `purge_entry` | src/memorymap/api/routes_entries.py:2651 |
| `/{entry_id}/reevaluate` | POST | `reevaluate_entry` | src/memorymap/api/routes_entries.py:1346 |
| `/{entry_id}/references` | GET | `entry_references` | src/memorymap/api/routes_entries.py:3049 |
| `/{entry_id}/related` | GET | `related_entries` | src/memorymap/api/routes_entries.py:2029 |
| `/{entry_id}/remove-title` | POST | `remove_entry_title` | src/memorymap/api/routes_entries.py:3339 |
| `/{entry_id}/restore` | POST | `restore_entry` | src/memorymap/api/routes_entries.py:2624 |
| `/{entry_id}/restore/{event_id}` | POST | `restore_event` | src/memorymap/api/routes_entries.py:3177 |
| `/{entry_id}/suggested-tags` | POST | `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1237 |
| `/{entry_id}/then-and-now` | GET | `then_and_now` | src/memorymap/api/routes_entries.py:3057 |
| `/{entry_id}/then-and-now` | POST | `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3082 |
| `/{entry_id}/unarchive` | POST | `unarchive_entry` | src/memorymap/api/routes_entries.py:2643 |
| `/{entry_id}/wiki-rename` | POST | `wiki_rename` | src/memorymap/api/routes_entries.py:2592 |
| `/{fact_id}` | DELETE | `delete_fact` | src/memorymap/api/routes_learned.py:313 |
| `/{fact_id}` | GET | `get_fact` | src/memorymap/api/routes_learned.py:275 |
| `/{fact_id}` | PATCH | `patch_fact` | src/memorymap/api/routes_learned.py:283 |
| `/{fact_id}` | POST | `set_state` | src/memorymap/api/routes_questions.py:55 |
| `/{fact_id}/reset` | POST | `reset_fact` | src/memorymap/api/routes_learned.py:302 |
| `/{key}` | DELETE | `delete_type` | src/memorymap/api/routes_relations.py:130 |
| `/{key}` | GET | `tidy_rows` | src/memorymap/api/routes_tidy.py:89 |
| `/{key}` | PATCH | `patch_type` | src/memorymap/api/routes_relations.py:110 |
| `/{key}/apply` | POST | `tidy_apply` | src/memorymap/api/routes_tidy.py:99 |
| `/{reminder_id}` | DELETE | `delete_reminder` | src/memorymap/api/routes_reminders.py:488 |
| `/{reminder_id}` | PUT | `update_reminder` | src/memorymap/api/routes_reminders.py:460 |
| `/{reminder_id}/export.ics` | GET | `export_one_ics` | src/memorymap/api/routes_reminders.py:312 |
| `/{reminder_id}/purge` | DELETE | `purge_reminder` | src/memorymap/api/routes_reminders.py:519 |
| `/{reminder_id}/restore` | POST | `restore_reminder` | src/memorymap/api/routes_reminders.py:509 |
| `/{turn_id}` | DELETE | `delete_ask_turn` | src/memorymap/api/routes_ask_history.py:169 |
| `/{turn_id}` | GET | `get_ask_turn` | src/memorymap/api/routes_ask_history.py:89 |
| `/{turn_id}/pin` | PUT | `pin_ask_turn` | src/memorymap/api/routes_ask_history.py:161 |
| `PYODIDE_PATH + '{name}'` | GET | `pyodide_file` | src/memorymap/api/run_sandbox.py:395 |

## Backend modules (3573)

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

### src/memorymap/ai/agent.py (43)

| Name | File:line |
|---|---|
| `SizeTier` | src/memorymap/ai/agent.py:54 |
| `_TurnCard` | src/memorymap/ai/agent.py:167 |
| `_TurnPlan` | src/memorymap/ai/agent.py:1654 |
| `_TurnState` | src/memorymap/ai/agent.py:1950 |
| `_bare_host` | src/memorymap/ai/agent.py:1301 |
| `_change_category_name` | src/memorymap/ai/agent.py:1089 |
| `_change_document_id` | src/memorymap/ai/agent.py:1045 |
| `_change_note_id` | src/memorymap/ai/agent.py:1027 |
| `_change_reminder_id` | src/memorymap/ai/agent.py:1067 |
| `_check_sources` | src/memorymap/ai/agent.py:233 |
| `_cleared_page` | src/memorymap/ai/agent.py:1332 |
| `_clip_strings` | src/memorymap/ai/agent.py:2021 |
| `_copies_what_was_read` | src/memorymap/ai/agent.py:1587 |
| `_dispatch_call` | src/memorymap/ai/agent.py:2397 |
| `_first_round_tools` | src/memorymap/ai/agent.py:2162 |
| `_fit_result` | src/memorymap/ai/agent.py:2032 |
| `_focus` | src/memorymap/ai/agent.py:1634 |
| `_hosts_named` | src/memorymap/ai/agent.py:1306 |
| `_labelled` | src/memorymap/ai/agent.py:245 |
| `_names_an_existing_category` | src/memorymap/ai/agent.py:2140 |
| `_page_key` | src/memorymap/ai/agent.py:1285 |
| `_picture_in_hand` | src/memorymap/ai/agent.py:1608 |
| `_prefetch_outbound` | src/memorymap/ai/agent.py:2069 |
| `_prepare_turn` | src/memorymap/ai/agent.py:1682 |
| `_recent_text` | src/memorymap/ai/agent.py:1547 |
| `_recovery_hint` | src/memorymap/ai/agent.py:679 |
| `_requires_a_call` | src/memorymap/ai/agent.py:2097 |
| `_result_summary` | src/memorymap/ai/agent.py:748 |
| `_result_urls` | src/memorymap/ai/agent.py:1311 |
| `_round_stream` | src/memorymap/ai/agent.py:2210 |
| `_run_and_record` | src/memorymap/ai/agent.py:2287 |
| `_seen_ids` | src/memorymap/ai/agent.py:868 |
| `_tool_event` | src/memorymap/ai/agent.py:2222 |
| `_tool_sources` | src/memorymap/ai/agent.py:915 |
| `_touched_items` | src/memorymap/ai/agent.py:805 |
| `_touched_kind` | src/memorymap/ai/agent.py:787 |
| `_wrap_up_round` | src/memorymap/ai/agent.py:2701 |
| `announces_unacted_tool` | src/memorymap/ai/agent.py:296 |
| `build_agent_messages` | src/memorymap/ai/agent.py:1345 |
| `run_agent` | src/memorymap/ai/agent.py:2738 |
| `size_tier` | src/memorymap/ai/agent.py:87 |
| `tools_guide` | src/memorymap/ai/agent.py:509 |
| `unsupported_claims` | src/memorymap/ai/agent.py:1218 |

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
| `NotArithmetic` | src/memorymap/ai/arithmetic.py:41 |
| `_walk` | src/memorymap/ai/arithmetic.py:45 |
| `evaluate` | src/memorymap/ai/arithmetic.py:67 |
| `spoken` | src/memorymap/ai/arithmetic.py:96 |
| `sum_in` | src/memorymap/ai/arithmetic.py:82 |

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
| `_rows` | src/memorymap/ai/cards.py:353 |
| `result_cards` | src/memorymap/ai/cards.py:360 |

### src/memorymap/ai/composer.py (74)

| Name | File:line |
|---|---|
| `FollowOn` | src/memorymap/ai/composer.py:2077 |
| `NoteView` | src/memorymap/ai/composer.py:615 |
| `Sentence` | src/memorymap/ai/composer.py:589 |
| `_Answer` | src/memorymap/ai/composer.py:1102 |
| `_Meaning` | src/memorymap/ai/composer.py:998 |
| `_alternatives` | src/memorymap/ai/composer.py:517 |
| `_asked_span` | src/memorymap/ai/composer.py:1853 |
| `_body` | src/memorymap/ai/composer.py:1905 |
| `_brief_text` | src/memorymap/ai/composer.py:2768 |
| `_broad_pool` | src/memorymap/ai/composer.py:1884 |
| `_build_synonyms` | src/memorymap/ai/composer.py:508 |
| `_clarify` | src/memorymap/ai/composer.py:2257 |
| `_clusters` | src/memorymap/ai/composer.py:1588 |
| `_compare` | src/memorymap/ai/composer.py:1781 |
| `_count_word` | src/memorymap/ai/composer.py:1272 |
| `_cue` | src/memorymap/ai/composer.py:839 |
| `_did_you_mean` | src/memorymap/ai/composer.py:2513 |
| `_disagreement` | src/memorymap/ai/composer.py:1713 |
| `_disagreements` | src/memorymap/ai/composer.py:1721 |
| `_earlier` | src/memorymap/ai/composer.py:1693 |
| `_fit_terms` | src/memorymap/ai/composer.py:2289 |
| `_fusable` | src/memorymap/ai/composer.py:1364 |
| `_holds` | src/memorymap/ai/composer.py:522 |
| `_jaccard` | src/memorymap/ai/composer.py:920 |
| `_joined` | src/memorymap/ai/composer.py:1382 |
| `_lead_block` | src/memorymap/ai/composer.py:1537 |
| `_list_block` | src/memorymap/ai/composer.py:1410 |
| `_list_sentence` | src/memorymap/ai/composer.py:1399 |
| `_lowered` | src/memorymap/ai/composer.py:1298 |
| `_mentions` | src/memorymap/ai/composer.py:1866 |
| `_missing` | src/memorymap/ai/composer.py:1750 |
| `_multi` | src/memorymap/ai/composer.py:2217 |
| `_named_notes` | src/memorymap/ai/composer.py:2088 |
| `_newest` | src/memorymap/ai/composer.py:1977 |
| `_next_questions` | src/memorymap/ai/composer.py:2007 |
| `_nothing` | src/memorymap/ai/composer.py:2541 |
| `_opening` | src/memorymap/ai/composer.py:1472 |
| `_others` | src/memorymap/ai/composer.py:1612 |
| `_pick` | src/memorymap/ai/composer.py:1276 |
| `_picture_units` | src/memorymap/ai/composer.py:746 |
| `_quotes` | src/memorymap/ai/composer.py:1330 |
| `_raw` | src/memorymap/ai/composer.py:2668 |
| `_relation` | src/memorymap/ai/composer.py:1571 |
| `_respell` | src/memorymap/ai/composer.py:394 |
| `_said_before` | src/memorymap/ai/composer.py:1463 |
| `_score` | src/memorymap/ai/composer.py:861 |
| `_sentence_case` | src/memorymap/ai/composer.py:1374 |
| `_span` | src/memorymap/ai/composer.py:1519 |
| `_stem` | src/memorymap/ai/composer.py:453 |
| `_sum` | src/memorymap/ai/composer.py:2521 |
| `_timeline` | src/memorymap/ai/composer.py:1671 |
| `_title` | src/memorymap/ai/composer.py:691 |
| `_unit` | src/memorymap/ai/composer.py:709 |
| `_unlike_before` | src/memorymap/ai/composer.py:1456 |
| `_with_context` | src/memorymap/ai/composer.py:1314 |
| `_words` | src/memorymap/ai/composer.py:531 |
| `_written` | src/memorymap/ai/composer.py:673 |
| `_yes_no_wrapped` | src/memorymap/ai/composer.py:423 |
| `brief` | src/memorymap/ai/composer.py:2674 |
| `centrality` | src/memorymap/ai/composer.py:1050 |
| `classify` | src/memorymap/ai/composer.py:428 |
| `compare_sides` | src/memorymap/ai/composer.py:574 |
| `compose` | src/memorymap/ai/composer.py:2555 |
| `disagree` | src/memorymap/ai/composer.py:1081 |
| `follow_on` | src/memorymap/ai/composer.py:2099 |
| `length_wish` | src/memorymap/ai/composer.py:1839 |
| `phrase_options` | src/memorymap/ai/composer.py:269 |
| `read_note` | src/memorymap/ai/composer.py:760 |
| `rephrase` | src/memorymap/ai/composer.py:401 |
| `select` | src/memorymap/ai/composer.py:925 |
| `social` | src/memorymap/ai/composer.py:2490 |
| `social_kind` | src/memorymap/ai/composer.py:2481 |
| `split_parts` | src/memorymap/ai/composer.py:2200 |
| `subject_terms` | src/memorymap/ai/composer.py:538 |

### src/memorymap/ai/composer_tables.py (2)

| Name | File:line |
|---|---|
| `_build` | src/memorymap/ai/composer_tables.py:638 |
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

### src/memorymap/ai/embeddings.py (26)

| Name | File:line |
|---|---|
| `EmbeddingCacheBroken` | src/memorymap/ai/embeddings.py:51 |
| `EmbeddingService` | src/memorymap/ai/embeddings.py:743 |
| `_PinnedModels` | src/memorymap/ai/embeddings.py:1213 |
| `_backfill_chunks` | src/memorymap/ai/embeddings.py:361 |
| `_backfill_missing` | src/memorymap/ai/embeddings.py:303 |
| `_blocks_with_offsets` | src/memorymap/ai/embeddings.py:553 |
| `_digest` | src/memorymap/ai/embeddings.py:639 |
| `_limit_torch_threads` | src/memorymap/ai/embeddings.py:262 |
| `_notebook_has_notes` | src/memorymap/ai/embeddings.py:102 |
| `_split_long` | src/memorymap/ai/embeddings.py:569 |
| `_wait_for_idle` | src/memorymap/ai/embeddings.py:91 |
| `_word_count` | src/memorymap/ai/embeddings.py:549 |
| `backfill_missing` | src/memorymap/ai/embeddings.py:279 |
| `bytes_to_vector` | src/memorymap/ai/embeddings.py:650 |
| `chunk_text` | src/memorymap/ai/embeddings.py:626 |
| `clean_orphaned_vectors` | src/memorymap/ai/embeddings.py:404 |
| `cosine_similarity` | src/memorymap/ai/embeddings.py:656 |
| `embed_threads` | src/memorymap/ai/embeddings.py:252 |
| `embedding_text` | src/memorymap/ai/embeddings.py:449 |
| `note_request` | src/memorymap/ai/embeddings.py:85 |
| `paragraph_chunks` | src/memorymap/ai/embeddings.py:594 |
| `similar_pairs` | src/memorymap/ai/embeddings.py:677 |
| `start_warmup` | src/memorymap/ai/embeddings.py:122 |
| `vector_to_bytes` | src/memorymap/ai/embeddings.py:643 |
| `warmup_failed` | src/memorymap/ai/embeddings.py:400 |
| `warmup_running` | src/memorymap/ai/embeddings.py:396 |

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

### src/memorymap/ai/facts.py (43)

| Name | File:line |
|---|---|
| `Candidate` | src/memorymap/ai/facts.py:176 |
| `_Similar` | src/memorymap/ai/facts.py:655 |
| `_entries_to_read` | src/memorymap/ai/facts.py:351 |
| `_fingerprint` | src/memorymap/ai/facts.py:272 |
| `_judge` | src/memorymap/ai/facts.py:631 |
| `_known_pairs` | src/memorymap/ai/facts.py:755 |
| `_local_answer` | src/memorymap/ai/facts.py:613 |
| `_local_disagreement` | src/memorymap/ai/facts.py:592 |
| `_narrow` | src/memorymap/ai/facts.py:296 |
| `_open_claims_and_questions` | src/memorymap/ai/facts.py:773 |
| `_pair_fact` | src/memorymap/ai/facts.py:787 |
| `_pair_json` | src/memorymap/ai/facts.py:1132 |
| `_pair_key` | src/memorymap/ai/facts.py:750 |
| `_pair_passes` | src/memorymap/ai/facts.py:822 |
| `_plain_words` | src/memorymap/ai/facts.py:588 |
| `_pref_key` | src/memorymap/ai/facts.py:96 |
| `_release` | src/memorymap/ai/facts.py:336 |
| `_run_json` | src/memorymap/ai/facts.py:969 |
| `_sentence_spans` | src/memorymap/ai/facts.py:119 |
| `_terms` | src/memorymap/ai/facts.py:578 |
| `_visible` | src/memorymap/ai/facts.py:1047 |
| `_words_alike` | src/memorymap/ai/facts.py:584 |
| `_written` | src/memorymap/ai/facts.py:778 |
| `as_json` | src/memorymap/ai/facts.py:1113 |
| `candidates` | src/memorymap/ai/facts.py:253 |
| `edit` | src/memorymap/ai/facts.py:1150 |
| `enabled` | src/memorymap/ai/facts.py:227 |
| `fingerprint_of` | src/memorymap/ai/facts.py:283 |
| `forget` | src/memorymap/ai/facts.py:1176 |
| `json_payload_value` | src/memorymap/ai/facts.py:953 |
| `latest_card` | src/memorymap/ai/facts.py:1015 |
| `listing` | src/memorymap/ai/facts.py:1065 |
| `remove` | src/memorymap/ai/facts.py:1170 |
| `reset` | src/memorymap/ai/facts.py:1160 |
| `run` | src/memorymap/ai/facts.py:387 |
| `run_facts` | src/memorymap/ai/facts.py:994 |
| `runner_enabled` | src/memorymap/ai/facts.py:1218 |
| `sentences` | src/memorymap/ai/facts.py:235 |
| `set_switches` | src/memorymap/ai/facts.py:212 |
| `stored_switches` | src/memorymap/ai/facts.py:189 |
| `switches` | src/memorymap/ai/facts.py:197 |
| `visible` | src/memorymap/ai/facts.py:1106 |
| `visible_counts` | src/memorymap/ai/facts.py:984 |

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

### src/memorymap/ai/followups.py (3)

| Name | File:line |
|---|---|
| `_clean` | src/memorymap/ai/followups.py:101 |
| `parse_followups` | src/memorymap/ai/followups.py:124 |
| `suggest_followups` | src/memorymap/ai/followups.py:150 |

### src/memorymap/ai/grounding.py (17)

| Name | File:line |
|---|---|
| `SentenceGrounder` | src/memorymap/ai/grounding.py:465 |
| `_blocks` | src/memorymap/ai/grounding.py:317 |
| `_bm25` | src/memorymap/ai/grounding.py:201 |
| `_figures` | src/memorymap/ai/grounding.py:189 |
| `_graph_nearness` | src/memorymap/ai/grounding.py:394 |
| `_mark` | src/memorymap/ai/grounding.py:697 |
| `_note_passage_scores` | src/memorymap/ai/grounding.py:270 |
| `_passages` | src/memorymap/ai/grounding.py:121 |
| `_pool_passages` | src/memorymap/ai/grounding.py:235 |
| `_word_set` | src/memorymap/ai/grounding.py:372 |
| `_words_with_offsets` | src/memorymap/ai/grounding.py:110 |
| `best_passage` | src/memorymap/ai/grounding.py:144 |
| `ground_answer_sentences` | src/memorymap/ai/grounding.py:435 |
| `note_passage_scores` | src/memorymap/ai/grounding.py:300 |
| `paragraph_ordinal` | src/memorymap/ai/grounding.py:407 |
| `split_sentences` | src/memorymap/ai/grounding.py:352 |
| `support` | src/memorymap/ai/grounding.py:661 |

### src/memorymap/ai/help_chat.py (15)

| Name | File:line |
|---|---|
| `_edit_distance_at_most_one` | src/memorymap/ai/help_chat.py:1981 |
| `_keyword_pattern` | src/memorymap/ai/help_chat.py:1935 |
| `_matching_topics` | src/memorymap/ai/help_chat.py:2038 |
| `_normalise_keys` | src/memorymap/ai/help_chat.py:1958 |
| `_prompt_for` | src/memorymap/ai/help_chat.py:2227 |
| `answer` | src/memorymap/ai/help_chat.py:2414 |
| `answer_stream` | src/memorymap/ai/help_chat.py:2352 |
| `badges_for` | src/memorymap/ai/help_chat.py:2179 |
| `help_block_for` | src/memorymap/ai/help_chat.py:2478 |
| `help_listing` | src/memorymap/ai/help_chat.py:2150 |
| `offline_answer` | src/memorymap/ai/help_chat.py:2311 |
| `source_names` | src/memorymap/ai/help_chat.py:2146 |
| `system_answer` | src/memorymap/ai/help_chat.py:2128 |
| `topic_title` | src/memorymap/ai/help_chat.py:2114 |
| `topics_for` | src/memorymap/ai/help_chat.py:2193 |

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

### src/memorymap/ai/intent.py (4)

| Name | File:line |
|---|---|
| `_matches_any` | src/memorymap/ai/intent.py:84 |
| `_normalise` | src/memorymap/ai/intent.py:75 |
| `classify` | src/memorymap/ai/intent.py:91 |
| `needs_retrieval` | src/memorymap/ai/intent.py:119 |

### src/memorymap/ai/janitor.py (23)

| Name | File:line |
|---|---|
| `CentroidMatch` | src/memorymap/ai/janitor.py:97 |
| `NeighbourMatch` | src/memorymap/ai/janitor.py:103 |
| `_Labelled` | src/memorymap/ai/janitor.py:408 |
| `_ask_llm` | src/memorymap/ai/janitor.py:586 |
| `_best_centroid_match` | src/memorymap/ai/janitor.py:464 |
| `_chat_within_deadline` | src/memorymap/ai/janitor.py:761 |
| `_confidence_of` | src/memorymap/ai/janitor.py:725 |
| `_extract_json` | src/memorymap/ai/janitor.py:827 |
| `_knn_match` | src/memorymap/ai/janitor.py:510 |
| `_labelled_vectors` | src/memorymap/ai/janitor.py:418 |
| `_late_answer` | src/memorymap/ai/janitor.py:729 |
| `_row` | src/memorymap/ai/janitor.py:694 |
| `_semantic_category` | src/memorymap/ai/janitor.py:328 |
| `_too_short_to_trust` | src/memorymap/ai/janitor.py:389 |
| `_uncount_late` | src/memorymap/ai/janitor.py:689 |
| `activity_rows` | src/memorymap/ai/janitor.py:680 |
| `categorise` | src/memorymap/ai/janitor.py:133 |
| `filed_by_label` | src/memorymap/ai/janitor.py:699 |
| `filing_deadline` | src/memorymap/ai/janitor.py:714 |
| `is_ai_method` | src/memorymap/ai/janitor.py:119 |
| `review_words_filed` | src/memorymap/ai/janitor.py:259 |
| `settled_state` | src/memorymap/ai/janitor.py:123 |
| `warm_filing_model` | src/memorymap/ai/janitor.py:741 |

### src/memorymap/ai/learning.py (13)

| Name | File:line |
|---|---|
| `Correction` | src/memorymap/ai/learning.py:124 |
| `_as_correction` | src/memorymap/ai/learning.py:154 |
| `_payload` | src/memorymap/ai/learning.py:141 |
| `_words` | src/memorymap/ai/learning.py:574 |
| `boosts` | src/memorymap/ai/learning.py:328 |
| `centroid_excluded` | src/memorymap/ai/learning.py:436 |
| `corrections` | src/memorymap/ai/learning.py:216 |
| `decayed` | src/memorymap/ai/learning.py:323 |
| `excluded_categories` | src/memorymap/ai/learning.py:467 |
| `filing_accuracy` | src/memorymap/ai/learning.py:263 |
| `filing_evidence` | src/memorymap/ai/learning.py:501 |
| `record` | src/memorymap/ai/learning.py:174 |
| `signal_weights` | src/memorymap/ai/learning.py:387 |

### src/memorymap/ai/lexical_filing.py (15)

| Name | File:line |
|---|---|
| `LexicalMatch` | src/memorymap/ai/lexical_filing.py:110 |
| `_Corpus` | src/memorymap/ai/lexical_filing.py:394 |
| `_Doc` | src/memorymap/ai/lexical_filing.py:365 |
| `_corpus_for` | src/memorymap/ai/lexical_filing.py:557 |
| `_make_doc` | src/memorymap/ai/lexical_filing.py:526 |
| `_scope` | src/memorymap/ai/lexical_filing.py:623 |
| `_tag_words` | src/memorymap/ai/lexical_filing.py:522 |
| `_tags` | src/memorymap/ai/lexical_filing.py:116 |
| `_tally` | src/memorymap/ai/lexical_filing.py:278 |
| `category_support` | src/memorymap/ai/lexical_filing.py:149 |
| `forget_corpus` | src/memorymap/ai/lexical_filing.py:635 |
| `lexical_category` | src/memorymap/ai/lexical_filing.py:124 |
| `suggest_categories` | src/memorymap/ai/lexical_filing.py:181 |
| `suggest_tags` | src/memorymap/ai/lexical_filing.py:226 |
| `tokens` | src/memorymap/ai/lexical_filing.py:93 |

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

### src/memorymap/ai/notebook_stats.py (25)

| Name | File:line |
|---|---|
| `StatAnswer` | src/memorymap/ai/notebook_stats.py:54 |
| `_asks` | src/memorymap/ai/notebook_stats.py:192 |
| `_busiest` | src/memorymap/ai/notebook_stats.py:398 |
| `_category_count` | src/memorymap/ai/notebook_stats.py:318 |
| `_despell` | src/memorymap/ai/notebook_stats.py:163 |
| `_document_count` | src/memorymap/ai/notebook_stats.py:336 |
| `_general_stats` | src/memorymap/ai/notebook_stats.py:571 |
| `_longest_notes` | src/memorymap/ai/notebook_stats.py:462 |
| `_most_linked` | src/memorymap/ai/notebook_stats.py:345 |
| `_note_count` | src/memorymap/ai/notebook_stats.py:327 |
| `_orphans` | src/memorymap/ai/notebook_stats.py:379 |
| `_plural` | src/memorymap/ai/notebook_stats.py:86 |
| `_recent_count` | src/memorymap/ai/notebook_stats.py:414 |
| `_stale_notes` | src/memorymap/ai/notebook_stats.py:495 |
| `_tag_count` | src/memorymap/ai/notebook_stats.py:308 |
| `_tag_pairs` | src/memorymap/ai/notebook_stats.py:535 |
| `_tags_of` | src/memorymap/ai/notebook_stats.py:78 |
| `_top_categories` | src/memorymap/ai/notebook_stats.py:279 |
| `_top_tags` | src/memorymap/ai/notebook_stats.py:264 |
| `_transposition_of` | src/memorymap/ai/notebook_stats.py:145 |
| `_untagged` | src/memorymap/ai/notebook_stats.py:297 |
| `_visible` | src/memorymap/ai/notebook_stats.py:68 |
| `_word_count` | src/memorymap/ai/notebook_stats.py:440 |
| `answer` | src/memorymap/ai/notebook_stats.py:215 |
| `looks_like_a_question_about_the_notebook` | src/memorymap/ai/notebook_stats.py:196 |

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
| `_ThinkTagSplitter` | src/memorymap/ai/provider.py:670 |
| `_ToolTextGate` | src/memorymap/ai/provider.py:782 |
| `_balanced_json_objects` | src/memorymap/ai/provider.py:835 |
| `_close_open_json` | src/memorymap/ai/provider.py:1289 |
| `_first_json_object_after` | src/memorymap/ai/provider.py:1001 |
| `_json_too_deep` | src/memorymap/ai/provider.py:1318 |
| `_ns_to_ms` | src/memorymap/ai/provider.py:1225 |
| `_python_style_calls` | src/memorymap/ai/provider.py:1012 |
| `_squash_separators` | src/memorymap/ai/provider.py:209 |
| `_unfence` | src/memorymap/ai/provider.py:1277 |
| `context_from_catalog_entry` | src/memorymap/ai/provider.py:265 |
| `detect_provider` | src/memorymap/ai/provider.py:311 |
| `extract_text_tool_calls` | src/memorymap/ai/provider.py:1073 |
| `first_chat_model` | src/memorymap/ai/provider.py:303 |
| `is_transient_server_error` | src/memorymap/ai/provider.py:116 |
| `known_context` | src/memorymap/ai/provider.py:224 |
| `loads_lenient` | src/memorymap/ai/provider.py:1341 |
| `normalise_tool_calls` | src/memorymap/ai/provider.py:1380 |
| `offered_tool_names` | src/memorymap/ai/provider.py:1414 |
| `resolve_tool_name` | src/memorymap/ai/provider.py:927 |
| `set_sampling_overrides_getter` | src/memorymap/ai/provider.py:59 |
| `set_write_tools` | src/memorymap/ai/provider.py:1070 |
| `split_thinking` | src/memorymap/ai/provider.py:1233 |
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
| `_at_asking_place` | src/memorymap/ai/question_noise.py:2072 |
| `_cosine` | src/memorymap/ai/question_noise.py:2123 |
| `_split` | src/memorymap/ai/question_noise.py:2014 |
| `_sub_cost` | src/memorymap/ai/question_noise.py:1924 |
| `_trigrams` | src/memorymap/ai/question_noise.py:2118 |
| `_vector_cosine` | src/memorymap/ai/question_noise.py:2134 |
| `allowance` | src/memorymap/ai/question_noise.py:1952 |
| `alternative` | src/memorymap/ai/question_noise.py:1999 |
| `distance` | src/memorymap/ai/question_noise.py:1930 |
| `guess_kind` | src/memorymap/ai/question_noise.py:2141 |
| `nearest` | src/memorymap/ai/question_noise.py:1970 |
| `repair` | src/memorymap/ai/question_noise.py:2027 |
| `social_kind` | src/memorymap/ai/question_noise.py:1825 |
| `strip_symbols` | src/memorymap/ai/question_noise.py:405 |

### src/memorymap/ai/questions.py (10)

| Name | File:line |
|---|---|
| `_answers_by_question` | src/memorymap/ai/questions.py:53 |
| `_as_json` | src/memorymap/ai/questions.py:93 |
| `_payload` | src/memorymap/ai/questions.py:45 |
| `_title` | src/memorymap/ai/questions.py:77 |
| `listing` | src/memorymap/ai/questions.py:135 |
| `open_note_ids` | src/memorymap/ai/questions.py:245 |
| `set_state` | src/memorymap/ai/questions.py:186 |
| `state_of` | src/memorymap/ai/questions.py:68 |
| `summary` | src/memorymap/ai/questions.py:173 |
| `visible_question` | src/memorymap/ai/questions.py:181 |

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

### src/memorymap/ai/reminder_parser.py (6)

| Name | File:line |
|---|---|
| `_extract_json` | src/memorymap/ai/reminder_parser.py:159 |
| `_fallback` | src/memorymap/ai/reminder_parser.py:154 |
| `_tidy` | src/memorymap/ai/reminder_parser.py:112 |
| `parse_relative` | src/memorymap/ai/reminder_parser.py:126 |
| `parse_reminder` | src/memorymap/ai/reminder_parser.py:171 |
| `relative_delta` | src/memorymap/ai/reminder_parser.py:80 |

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

### src/memorymap/ai/skill_runner.py (26)

| Name | File:line |
|---|---|
| `Verification` | src/memorymap/ai/skill_runner.py:160 |
| `_RunSetup` | src/memorymap/ai/skill_runner.py:785 |
| `_RunState` | src/memorymap/ai/skill_runner.py:814 |
| `_absorb` | src/memorymap/ai/skill_runner.py:451 |
| `_absorb_change` | src/memorymap/ai/skill_runner.py:505 |
| `_collect` | src/memorymap/ai/skill_runner.py:1580 |
| `_contract_met` | src/memorymap/ai/skill_runner.py:561 |
| `_event_mark` | src/memorymap/ai/skill_runner.py:747 |
| `_fallback_replan` | src/memorymap/ai/skill_runner.py:620 |
| `_pages_left` | src/memorymap/ai/skill_runner.py:513 |
| `_paging_nudge` | src/memorymap/ai/skill_runner.py:543 |
| `_reading` | src/memorymap/ai/skill_runner.py:209 |
| `_record_run` | src/memorymap/ai/skill_runner.py:311 |
| `_remember` | src/memorymap/ai/skill_runner.py:441 |
| `_replan_step` | src/memorymap/ai/skill_runner.py:634 |
| `_run_one_step` | src/memorymap/ai/skill_runner.py:848 |
| `_run_skill` | src/memorymap/ai/skill_runner.py:1275 |
| `_step_answer` | src/memorymap/ai/skill_runner.py:99 |
| `_step_tools` | src/memorymap/ai/skill_runner.py:687 |
| `_tag_arguments` | src/memorymap/ai/skill_runner.py:432 |
| `_touched_clause` | src/memorymap/ai/skill_runner.py:88 |
| `_touched_ids` | src/memorymap/ai/skill_runner.py:84 |
| `_undo_span` | src/memorymap/ai/skill_runner.py:756 |
| `_unmet_reason` | src/memorymap/ai/skill_runner.py:372 |
| `run_skill` | src/memorymap/ai/skill_runner.py:704 |
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
| `Sources` | src/memorymap/ai/source_check.py:67 |
| `_number_key` | src/memorymap/ai/source_check.py:61 |
| `heads_up` | src/memorymap/ai/source_check.py:148 |
| `sources_from_messages` | src/memorymap/ai/source_check.py:97 |
| `unbacked_claims` | src/memorymap/ai/source_check.py:109 |

### src/memorymap/ai/taxonomy.py (1)

| Name | File:line |
|---|---|
| `extract_categories` | src/memorymap/ai/taxonomy.py:44 |

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

### src/memorymap/ai/tools/__init__.py (85)

| Name | File:line |
|---|---|
| `_ai_actor` | src/memorymap/ai/tools/__init__.py:4549 |
| `_ask_user` | src/memorymap/ai/tools/__init__.py:1915 |
| `_audit_link_reasons` | src/memorymap/ai/tools/__init__.py:2408 |
| `_coerce` | src/memorymap/ai/tools/__init__.py:4598 |
| `_coerce_array` | src/memorymap/ai/tools/__init__.py:4572 |
| `_complete_reminder` | src/memorymap/ai/tools/__init__.py:1710 |
| `_compress_chat` | src/memorymap/ai/tools/__init__.py:2199 |
| `_count_notes` | src/memorymap/ai/tools/__init__.py:753 |
| `_create_note` | src/memorymap/ai/tools/__init__.py:1250 |
| `_delete_note` | src/memorymap/ai/tools/__init__.py:1578 |
| `_delete_skill` | src/memorymap/ai/tools/__init__.py:1232 |
| `_delete_tag` | src/memorymap/ai/tools/__init__.py:1891 |
| `_describe_param` | src/memorymap/ai/tools/__init__.py:4656 |
| `_edit_note` | src/memorymap/ai/tools/__init__.py:1289 |
| `_example_value` | src/memorymap/ai/tools/__init__.py:4235 |
| `_find_contradictions` | src/memorymap/ai/tools/__init__.py:2427 |
| `_find_similar_notes` | src/memorymap/ai/tools/__init__.py:423 |
| `_first_sentence` | src/memorymap/ai/tools/__init__.py:4363 |
| `_fold_key` | src/memorymap/ai/tools/__init__.py:4566 |
| `_get_current_time` | src/memorymap/ai/tools/__init__.py:927 |
| `_get_note_tool` | src/memorymap/ai/tools/__init__.py:119 |
| `_graph_neighbours` | src/memorymap/ai/tools/__init__.py:179 |
| `_graph_summary` | src/memorymap/ai/tools/__init__.py:146 |
| `_is_plural_variant` | src/memorymap/ai/tools/__init__.py:4215 |
| `_link_notes` | src/memorymap/ai/tools/__init__.py:1492 |
| `_list_categories` | src/memorymap/ai/tools/__init__.py:845 |
| `_list_notes` | src/memorymap/ai/tools/__init__.py:671 |
| `_list_reminders` | src/memorymap/ai/tools/__init__.py:1668 |
| `_list_skills` | src/memorymap/ai/tools/__init__.py:1104 |
| `_list_tags` | src/memorymap/ai/tools/__init__.py:869 |
| `_make_plan` | src/memorymap/ai/tools/__init__.py:2097 |
| `_match_skill` | src/memorymap/ai/tools/__init__.py:1999 |
| `_notebook_overview` | src/memorymap/ai/tools/__init__.py:891 |
| `_notebook_structure` | src/memorymap/ai/tools/__init__.py:544 |
| `_path_between` | src/memorymap/ai/tools/__init__.py:445 |
| `_pin_note` | src/memorymap/ai/tools/__init__.py:1422 |
| `_plan_steps` | src/memorymap/ai/tools/__init__.py:2113 |
| `_read_url` | src/memorymap/ai/tools/__init__.py:1813 |
| `_related_notes` | src/memorymap/ai/tools/__init__.py:336 |
| `_rename_tag` | src/memorymap/ai/tools/__init__.py:1728 |
| `_requested_ids` | src/memorymap/ai/tools/__init__.py:1335 |
| `_resolve_link_type` | src/memorymap/ai/tools/__init__.py:1475 |
| `_restore_note` | src/memorymap/ai/tools/__init__.py:1589 |
| `_run_skill` | src/memorymap/ai/tools/__init__.py:1973 |
| `_save_skill` | src/memorymap/ai/tools/__init__.py:1177 |
| `_save_user_preference` | src/memorymap/ai/tools/__init__.py:2328 |
| `_schema_key` | src/memorymap/ai/tools/__init__.py:4692 |
| `_scope_filters` | src/memorymap/ai/tools/__init__.py:622 |
| `_scope_label` | src/memorymap/ai/tools/__init__.py:659 |
| `_search_chat_history` | src/memorymap/ai/tools/__init__.py:1027 |
| `_search_help` | src/memorymap/ai/tools/__init__.py:914 |
| `_search_notes` | src/memorymap/ai/tools/__init__.py:72 |
| `_set_reminder` | src/memorymap/ai/tools/__init__.py:1613 |
| `_skill_key` | src/memorymap/ai/tools/__init__.py:1988 |
| `_suggested_neighbours` | src/memorymap/ai/tools/__init__.py:272 |
| `_summarize_notes` | src/memorymap/ai/tools/__init__.py:944 |
| `_tag_note` | src/memorymap/ai/tools/__init__.py:1361 |
| `_unlink_notes` | src/memorymap/ai/tools/__init__.py:1534 |
| `_verify_block` | src/memorymap/ai/tools/__init__.py:1150 |
| `_web_search` | src/memorymap/ai/tools/__init__.py:1745 |
| `adds_to_a_named_note` | src/memorymap/ai/tools/__init__.py:4064 |
| `budget_for_window` | src/memorymap/ai/tools/__init__.py:4473 |
| `call_example` | src/memorymap/ai/tools/__init__.py:4183 |
| `check_arguments` | src/memorymap/ai/tools/__init__.py:4709 |
| `compact_schemas` | src/memorymap/ai/tools/__init__.py:4374 |
| `confirm_label` | src/memorymap/ai/tools/__init__.py:4517 |
| `example_arguments` | src/memorymap/ai/tools/__init__.py:4666 |
| `execute_tool` | src/memorymap/ai/tools/__init__.py:4750 |
| `focus_detail` | src/memorymap/ai/tools/__init__.py:4085 |
| `focus_for` | src/memorymap/ai/tools/__init__.py:4070 |
| `handoff_event` | src/memorymap/ai/tools/__init__.py:2305 |
| `is_follow_through` | src/memorymap/ai/tools/__init__.py:4048 |
| `link_type_description` | src/memorymap/ai/tools/__init__.py:1453 |
| `ollama_tools` | src/memorymap/ai/tools/__init__.py:4247 |
| `prefetch_web` | src/memorymap/ai/tools/__init__.py:1783 |
| `schema_chars` | src/memorymap/ai/tools/__init__.py:4342 |
| `summarise_turns` | src/memorymap/ai/tools/__init__.py:2164 |
| `tool_catalog` | src/memorymap/ai/tools/__init__.py:4490 |
| `tool_enabled` | src/memorymap/ai/tools/__init__.py:4153 |
| `validate_ask` | src/memorymap/ai/tools/__init__.py:1931 |
| `validate_compress_chat` | src/memorymap/ai/tools/__init__.py:2215 |
| `validate_make_plan` | src/memorymap/ai/tools/__init__.py:2246 |
| `validate_run_skill` | src/memorymap/ai/tools/__init__.py:2014 |
| `with_relation_types` | src/memorymap/ai/tools/__init__.py:4274 |
| `within_budget` | src/memorymap/ai/tools/__init__.py:4428 |

### src/memorymap/ai/tools/_common.py (15)

| Name | File:line |
|---|---|
| `ToolError` | src/memorymap/ai/tools/_common.py:77 |
| `ToolSpec` | src/memorymap/ai/tools/_common.py:94 |
| `_category_clause` | src/memorymap/ai/tools/_common.py:346 |
| `_clip` | src/memorymap/ai/tools/_common.py:135 |
| `_keyword_context` | src/memorymap/ai/tools/_common.py:154 |
| `_limit_arg` | src/memorymap/ai/tools/_common.py:336 |
| `_note_summary` | src/memorymap/ai/tools/_common.py:247 |
| `_readable` | src/memorymap/ai/tools/_common.py:238 |
| `_refresh_embedding` | src/memorymap/ai/tools/_common.py:392 |
| `_require_note` | src/memorymap/ai/tools/_common.py:313 |
| `_since_days` | src/memorymap/ai/tools/_common.py:364 |
| `_undo_edit` | src/memorymap/ai/tools/_common.py:292 |
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

### src/memorymap/ai/when.py (10)

| Name | File:line |
|---|---|
| `_clock` | src/memorymap/ai/when.py:128 |
| `_count` | src/memorymap/ai/when.py:303 |
| `_day` | src/memorymap/ai/when.py:89 |
| `_hour24` | src/memorymap/ai/when.py:151 |
| `_iso` | src/memorymap/ai/when.py:79 |
| `_months_back` | src/memorymap/ai/when.py:295 |
| `_span_days` | src/memorymap/ai/when.py:312 |
| `days_since` | src/memorymap/ai/when.py:323 |
| `parse_reminder_text` | src/memorymap/ai/when.py:246 |
| `resolve` | src/memorymap/ai/when.py:163 |

### src/memorymap/api/app.py (30)

| Name | File:line |
|---|---|
| `RequestPulse` | src/memorymap/api/app.py:1049 |
| `RevalidatedStatic` | src/memorymap/api/app.py:289 |
| `SpaceGuard` | src/memorymap/api/app.py:980 |
| `_UnversionedStatic` | src/memorymap/api/app.py:280 |
| `_add_middleware` | src/memorymap/api/app.py:1121 |
| `_add_system_routes` | src/memorymap/api/app.py:1280 |
| `_backup_if_due` | src/memorymap/api/app.py:670 |
| `_choose_chat_model_if_missing` | src/memorymap/api/app.py:624 |
| `_code_for_status` | src/memorymap/api/app.py:767 |
| `_compact_event_log` | src/memorymap/api/app.py:552 |
| `_compact_step` | src/memorymap/api/app.py:598 |
| `_content_length` | src/memorymap/api/app.py:1032 |
| `_include_routers` | src/memorymap/api/app.py:1207 |
| `_install_pending_extras` | src/memorymap/api/app.py:606 |
| `_purge_expired_bin_entries` | src/memorymap/api/app.py:528 |
| `_purge_step` | src/memorymap/api/app.py:594 |
| `_register_error_handlers` | src/memorymap/api/app.py:778 |
| `_stamp_for` | src/memorymap/api/app.py:215 |
| `_start_autonomous_loop` | src/memorymap/api/app.py:722 |
| `_start_searxng_if_asked` | src/memorymap/api/app.py:690 |
| `_start_services` | src/memorymap/api/app.py:1064 |
| `_startup_maintenance` | src/memorymap/api/app.py:643 |
| `_static_gzip` | src/memorymap/api/app.py:467 |
| `asset_hash` | src/memorymap/api/app.py:191 |
| `asset_stamps` | src/memorymap/api/app.py:220 |
| `clear_static_cache` | src/memorymap/api/app.py:508 |
| `create_app` | src/memorymap/api/app.py:1390 |
| `out_of_space_body` | src/memorymap/api/app.py:950 |
| `pin_static_mime_types` | src/memorymap/api/app.py:158 |
| `served_index_html` | src/memorymap/api/app.py:245 |

### src/memorymap/api/asset_strip.py (13)

| Name | File:line |
|---|---|
| `_html_tag_end` | src/memorymap/api/asset_strip.py:320 |
| `_js_regex_allowed` | src/memorymap/api/asset_strip.py:111 |
| `_keep` | src/memorymap/api/asset_strip.py:49 |
| `_rebuild` | src/memorymap/api/asset_strip.py:55 |
| `_skip_regex` | src/memorymap/api/asset_strip.py:163 |
| `_skip_string` | src/memorymap/api/asset_strip.py:146 |
| `css_comment_spans` | src/memorymap/api/asset_strip.py:274 |
| `html_comment_spans` | src/memorymap/api/asset_strip.py:336 |
| `js_comment_spans` | src/memorymap/api/asset_strip.py:189 |
| `strip_css` | src/memorymap/api/asset_strip.py:307 |
| `strip_for_path` | src/memorymap/api/asset_strip.py:383 |
| `strip_html` | src/memorymap/api/asset_strip.py:379 |
| `strip_js` | src/memorymap/api/asset_strip.py:265 |

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
| `_live_grounding` | src/memorymap/api/routes_ask_history.py:134 |
| `_summary` | src/memorymap/api/routes_ask_history.py:31 |
| `ask_history_stats` | src/memorymap/api/routes_ask_history.py:82 |
| `clear_ask_history` | src/memorymap/api/routes_ask_history.py:178 |
| `delete_ask_turn` | src/memorymap/api/routes_ask_history.py:170 |
| `get_ask_turn` | src/memorymap/api/routes_ask_history.py:90 |
| `list_ask_history` | src/memorymap/api/routes_ask_history.py:46 |
| `pin_ask_turn` | src/memorymap/api/routes_ask_history.py:162 |

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

### src/memorymap/api/routes_backups.py (13)

| Name | File:line |
|---|---|
| `BundleBody` | src/memorymap/api/routes_backups.py:188 |
| `RestoreBody` | src/memorymap/api/routes_backups.py:137 |
| `RetentionBody` | src/memorymap/api/routes_backups.py:38 |
| `_retention` | src/memorymap/api/routes_backups.py:34 |
| `_unlink_quietly` | src/memorymap/api/routes_backups.py:192 |
| `backup_now` | src/memorymap/api/routes_backups.py:102 |
| `delete_backup` | src/memorymap/api/routes_backups.py:173 |
| `export_bundle` | src/memorymap/api/routes_backups.py:201 |
| `list_backups` | src/memorymap/api/routes_backups.py:93 |
| `restore_backup` | src/memorymap/api/routes_backups.py:142 |
| `restore_bundle` | src/memorymap/api/routes_backups.py:242 |
| `set_retention` | src/memorymap/api/routes_backups.py:124 |
| `storage_location` | src/memorymap/api/routes_backups.py:43 |

### src/memorymap/api/routes_bench.py (7)

| Name | File:line |
|---|---|
| `BenchBody` | src/memorymap/api/routes_bench.py:36 |
| `_last_report` | src/memorymap/api/routes_bench.py:53 |
| `_report_path` | src/memorymap/api/routes_bench.py:49 |
| `_run` | src/memorymap/api/routes_bench.py:60 |
| `start` | src/memorymap/api/routes_bench.py:85 |
| `state` | src/memorymap/api/routes_bench.py:125 |
| `stop` | src/memorymap/api/routes_bench.py:134 |

### src/memorymap/api/routes_board_history.py (15)

| Name | File:line |
|---|---|
| `RestoreBody` | src/memorymap/api/routes_board_history.py:324 |
| `_board_events` | src/memorymap/api/routes_board_history.py:106 |
| `_board_param` | src/memorymap/api/routes_board_history.py:76 |
| `_current_rows` | src/memorymap/api/routes_board_history.py:89 |
| `_is_delete` | src/memorymap/api/routes_board_history.py:164 |
| `_link_ends` | src/memorymap/api/routes_board_history.py:329 |
| `_moments` | src/memorymap/api/routes_board_history.py:234 |
| `_names_board` | src/memorymap/api/routes_board_history.py:81 |
| `_require_board` | src/memorymap/api/routes_board_history.py:263 |
| `_row_out` | src/memorymap/api/routes_board_history.py:291 |
| `_state_of` | src/memorymap/api/routes_board_history.py:98 |
| `_states_at` | src/memorymap/api/routes_board_history.py:169 |
| `board_at` | src/memorymap/api/routes_board_history.py:303 |
| `board_history` | src/memorymap/api/routes_board_history.py:272 |
| `restore_board` | src/memorymap/api/routes_board_history.py:334 |

### src/memorymap/api/routes_board_library.py (44)

| Name | File:line |
|---|---|
| `ImportBody` | src/memorymap/api/routes_board_library.py:640 |
| `LibraryBody` | src/memorymap/api/routes_board_library.py:580 |
| `LibraryItemCreate` | src/memorymap/api/routes_board_library.py:452 |
| `LibraryItemOut` | src/memorymap/api/routes_board_library.py:344 |
| `LibraryItemUpdate` | src/memorymap/api/routes_board_library.py:486 |
| `MarkBody` | src/memorymap/api/routes_board_library.py:563 |
| `NewBoardBody` | src/memorymap/api/routes_board_library.py:994 |
| `PlaceBody` | src/memorymap/api/routes_board_library.py:762 |
| `_builtin` | src/memorymap/api/routes_board_library.py:325 |
| `_builtin_index` | src/memorymap/api/routes_board_library.py:299 |
| `_clean_branch` | src/memorymap/api/routes_board_library.py:206 |
| `_clean_element` | src/memorymap/api/routes_board_library.py:128 |
| `_clean_number` | src/memorymap/api/routes_board_library.py:120 |
| `_clean_payload` | src/memorymap/api/routes_board_library.py:234 |
| `_clean_tags` | src/memorymap/api/routes_board_library.py:284 |
| `_drop_media` | src/memorymap/api/routes_board_library.py:689 |
| `_fail` | src/memorymap/api/routes_board_library.py:110 |
| `_icons` | src/memorymap/api/routes_board_library.py:317 |
| `_ink` | src/memorymap/api/routes_board_library.py:800 |
| `_item_or_404` | src/memorymap/api/routes_board_library.py:494 |
| `_item_out` | src/memorymap/api/routes_board_library.py:358 |
| `_library_or_404` | src/memorymap/api/routes_board_library.py:460 |
| `_library_out` | src/memorymap/api/routes_board_library.py:376 |
| `_map_has_no_centre` | src/memorymap/api/routes_board_library.py:879 |
| `_media_urls` | src/memorymap/api/routes_board_library.py:114 |
| `_place_branch` | src/memorymap/api/routes_board_library.py:896 |
| `_place_element` | src/memorymap/api/routes_board_library.py:804 |
| `_resolve` | src/memorymap/api/routes_board_library.py:778 |
| `_yours` | src/memorymap/api/routes_board_library.py:366 |
| `create_library` | src/memorymap/api/routes_board_library.py:585 |
| `create_library_item` | src/memorymap/api/routes_board_library.py:471 |
| `delete_library` | src/memorymap/api/routes_board_library.py:603 |
| `delete_library_item` | src/memorymap/api/routes_board_library.py:527 |
| `duplicate_library_item` | src/memorymap/api/routes_board_library.py:549 |
| `export_library` | src/memorymap/api/routes_board_library.py:619 |
| `import_library` | src/memorymap/api/routes_board_library.py:649 |
| `list_library` | src/memorymap/api/routes_board_library.py:381 |
| `mark_builtin` | src/memorymap/api/routes_board_library.py:569 |
| `new_board_from_template` | src/memorymap/api/routes_board_library.py:1003 |
| `place_library_item` | src/memorymap/api/routes_board_library.py:942 |
| `rename_library` | src/memorymap/api/routes_board_library.py:595 |
| `restore_library_item` | src/memorymap/api/routes_board_library.py:538 |
| `transform_path` | src/memorymap/api/routes_board_library.py:708 |
| `update_library_item` | src/memorymap/api/routes_board_library.py:503 |

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

### src/memorymap/api/routes_categories.py (20)

| Name | File:line |
|---|---|
| `ColourBody` | src/memorymap/api/routes_categories.py:58 |
| `CreateBody` | src/memorymap/api/routes_categories.py:81 |
| `MergeBody` | src/memorymap/api/routes_categories.py:86 |
| `MoveBody` | src/memorymap/api/routes_categories.py:90 |
| `RenameBody` | src/memorymap/api/routes_categories.py:42 |
| `SplitBody` | src/memorymap/api/routes_categories.py:95 |
| `_ai_groups` | src/memorymap/api/routes_categories.py:221 |
| `_existing_category` | src/memorymap/api/routes_categories.py:100 |
| `_ids_in` | src/memorymap/api/routes_categories.py:122 |
| `_move` | src/memorymap/api/routes_categories.py:126 |
| `_same_space` | src/memorymap/api/routes_categories.py:107 |
| `create_category` | src/memorymap/api/routes_categories.py:157 |
| `delete_category` | src/memorymap/api/routes_categories.py:341 |
| `list_categories` | src/memorymap/api/routes_categories.py:145 |
| `merge_category` | src/memorymap/api/routes_categories.py:175 |
| `move_notes` | src/memorymap/api/routes_categories.py:167 |
| `propose_split` | src/memorymap/api/routes_categories.py:271 |
| `rename_category` | src/memorymap/api/routes_categories.py:330 |
| `set_category_colour` | src/memorymap/api/routes_categories.py:319 |
| `split_category` | src/memorymap/api/routes_categories.py:189 |

### src/memorymap/api/routes_chat.py (58)

| Name | File:line |
|---|---|
| `ChatRequest` | src/memorymap/api/routes_chat.py:303 |
| `ChatResponse` | src/memorymap/api/routes_chat.py:669 |
| `ChatTurn` | src/memorymap/api/routes_chat.py:285 |
| `CompressBody` | src/memorymap/api/routes_chat.py:2523 |
| `FollowupBody` | src/memorymap/api/routes_chat.py:250 |
| `PlanRun` | src/memorymap/api/routes_chat.py:290 |
| `ToolExecuteBody` | src/memorymap/api/routes_chat.py:2556 |
| `_StreamRequest` | src/memorymap/api/routes_chat.py:1671 |
| `_about` | src/memorymap/api/routes_chat.py:201 |
| `_agent_events` | src/memorymap/api/routes_chat.py:1986 |
| `_apply_scope` | src/memorymap/api/routes_chat.py:446 |
| `_asked_key` | src/memorymap/api/routes_chat.py:151 |
| `_assist` | src/memorymap/api/routes_chat.py:1730 |
| `_attached_boards` | src/memorymap/api/routes_chat.py:841 |
| `_attached_documents` | src/memorymap/api/routes_chat.py:764 |
| `_attached_files` | src/memorymap/api/routes_chat.py:787 |
| `_attached_notes` | src/memorymap/api/routes_chat.py:741 |
| `_attachment_readings` | src/memorymap/api/routes_chat.py:1102 |
| `_chat_model_sees_images` | src/memorymap/api/routes_chat.py:540 |
| `_composed` | src/memorymap/api/routes_chat.py:1702 |
| `_composer_embed` | src/memorymap/api/routes_chat.py:1719 |
| `_composer_voice` | src/memorymap/api/routes_chat.py:1709 |
| `_feature_for` | src/memorymap/api/routes_chat.py:114 |
| `_files_on` | src/memorymap/api/routes_chat.py:1080 |
| `_fill` | src/memorymap/api/routes_chat.py:177 |
| `_first_agent_event` | src/memorymap/api/routes_chat.py:2045 |
| `_grounding_candidates` | src/memorymap/api/routes_chat.py:704 |
| `_image_caption_context` | src/memorymap/api/routes_chat.py:553 |
| `_interactive_lines` | src/memorymap/api/routes_chat.py:2456 |
| `_media_readings` | src/memorymap/api/routes_chat.py:1020 |
| `_mostly_pictures` | src/memorymap/api/routes_chat.py:975 |
| `_note_dates` | src/memorymap/api/routes_chat.py:983 |
| `_outline_into` | src/memorymap/api/routes_chat.py:889 |
| `_picture_alts` | src/memorymap/api/routes_chat.py:931 |
| `_picture_sizes` | src/memorymap/api/routes_chat.py:958 |
| `_plain_events` | src/memorymap/api/routes_chat.py:1784 |
| `_prepare` | src/memorymap/api/routes_chat.py:1146 |
| `_recent_questions` | src/memorymap/api/routes_chat.py:124 |
| `_refuse_failed` | src/memorymap/api/routes_chat.py:2597 |
| `_related_elsewhere` | src/memorymap/api/routes_chat.py:1581 |
| `_resolve_chat_images` | src/memorymap/api/routes_chat.py:500 |
| `_resolve_mode` | src/memorymap/api/routes_chat.py:461 |
| `_resolve_persona` | src/memorymap/api/routes_chat.py:477 |
| `_resolve_plan` | src/memorymap/api/routes_chat.py:640 |
| `_resolve_skill` | src/memorymap/api/routes_chat.py:614 |
| `_save_ask_turn` | src/memorymap/api/routes_chat.py:1531 |
| `_small_model_mode` | src/memorymap/api/routes_chat.py:593 |
| `_stream_lines` | src/memorymap/api/routes_chat.py:2083 |
| `_time_words` | src/memorymap/api/routes_chat.py:1003 |
| `chat` | src/memorymap/api/routes_chat.py:1411 |
| `chat_followups` | src/memorymap/api/routes_chat.py:264 |
| `chat_stream` | src/memorymap/api/routes_chat.py:2376 |
| `compress_history` | src/memorymap/api/routes_chat.py:2530 |
| `execute_confirmed_tool` | src/memorymap/api/routes_chat.py:2569 |
| `list_modes` | src/memorymap/api/routes_chat.py:2466 |
| `list_tools` | src/memorymap/api/routes_chat.py:2487 |
| `recent_questions` | src/memorymap/api/routes_chat.py:146 |
| `suggestions` | src/memorymap/api/routes_chat.py:217 |

### src/memorymap/api/routes_conversations.py (33)

| Name | File:line |
|---|---|
| `AnswerBody` | src/memorymap/api/routes_conversations.py:800 |
| `FollowupsBody` | src/memorymap/api/routes_conversations.py:739 |
| `ForkBody` | src/memorymap/api/routes_conversations.py:685 |
| `PinBody` | src/memorymap/api/routes_conversations.py:154 |
| `RenameBody` | src/memorymap/api/routes_conversations.py:150 |
| `RestoreBody` | src/memorymap/api/routes_conversations.py:901 |
| `TruncateBody` | src/memorymap/api/routes_conversations.py:650 |
| `TurnBody` | src/memorymap/api/routes_conversations.py:28 |
| `_clean_title` | src/memorymap/api/routes_conversations.py:548 |
| `_existing` | src/memorymap/api/routes_conversations.py:234 |
| `_hydrate_attachments` | src/memorymap/api/routes_conversations.py:431 |
| `_process_committed_media` | src/memorymap/api/routes_conversations.py:238 |
| `_rewrite_answer_steps` | src/memorymap/api/routes_conversations.py:804 |
| `_summary` | src/memorymap/api/routes_conversations.py:215 |
| `_turn_messages` | src/memorymap/api/routes_conversations.py:158 |
| `append_turn` | src/memorymap/api/routes_conversations.py:529 |
| `archive_conversation` | src/memorymap/api/routes_conversations.py:377 |
| `conversation_matches` | src/memorymap/api/routes_conversations.py:252 |
| `create_conversation` | src/memorymap/api/routes_conversations.py:417 |
| `delete_conversation` | src/memorymap/api/routes_conversations.py:879 |
| `delete_turn` | src/memorymap/api/routes_conversations.py:624 |
| `edit_answer` | src/memorymap/api/routes_conversations.py:839 |
| `fork_conversation` | src/memorymap/api/routes_conversations.py:697 |
| `get_conversation` | src/memorymap/api/routes_conversations.py:519 |
| `list_conversations` | src/memorymap/api/routes_conversations.py:287 |
| `pin_conversation` | src/memorymap/api/routes_conversations.py:357 |
| `rename_conversation` | src/memorymap/api/routes_conversations.py:869 |
| `replace_last_turn` | src/memorymap/api/routes_conversations.py:606 |
| `restore_conversation` | src/memorymap/api/routes_conversations.py:913 |
| `retitle_conversation` | src/memorymap/api/routes_conversations.py:558 |
| `set_turn_followups` | src/memorymap/api/routes_conversations.py:749 |
| `truncate_conversation` | src/memorymap/api/routes_conversations.py:657 |
| `unarchive_conversation` | src/memorymap/api/routes_conversations.py:400 |

### src/memorymap/api/routes_debug.py (3)

| Name | File:line |
|---|---|
| `_db_name` | src/memorymap/api/routes_debug.py:71 |
| `debug_health` | src/memorymap/api/routes_debug.py:80 |
| `shown_path` | src/memorymap/api/routes_debug.py:48 |

### src/memorymap/api/routes_documents.py (55)

| Name | File:line |
|---|---|
| `AiCheckBody` | src/memorymap/api/routes_documents.py:1134 |
| `AiEditBody` | src/memorymap/api/routes_documents.py:105 |
| `AttachBookmarkBody` | src/memorymap/api/routes_documents.py:220 |
| `DocumentAiEditLogBody` | src/memorymap/api/routes_documents.py:1332 |
| `DocumentAiEditOut` | src/memorymap/api/routes_documents.py:1348 |
| `DocumentBody` | src/memorymap/api/routes_documents.py:75 |
| `DocumentPatch` | src/memorymap/api/routes_documents.py:87 |
| `DocumentRevisionOut` | src/memorymap/api/routes_documents.py:1218 |
| `LinkBody` | src/memorymap/api/routes_documents.py:786 |
| `RephraseBody` | src/memorymap/api/routes_documents.py:1174 |
| `SyntaxCheckBody` | src/memorymap/api/routes_documents.py:303 |
| `_ai_edit_out` | src/memorymap/api/routes_documents.py:1356 |
| `_backlinks` | src/memorymap/api/routes_documents.py:830 |
| `_binned` | src/memorymap/api/routes_documents.py:718 |
| `_document_headings` | src/memorymap/api/routes_documents.py:416 |
| `_existing` | src/memorymap/api/routes_documents.py:216 |
| `_full` | src/memorymap/api/routes_documents.py:190 |
| `_linked_notes` | src/memorymap/api/routes_documents.py:197 |
| `_preview` | src/memorymap/api/routes_documents.py:134 |
| `_process_committed_media` | src/memorymap/api/routes_documents.py:272 |
| `_record_document_revision` | src/memorymap/api/routes_documents.py:650 |
| `_safe_filename` | src/memorymap/api/routes_documents.py:779 |
| `_summary` | src/memorymap/api/routes_documents.py:168 |
| `ai_check` | src/memorymap/api/routes_documents.py:1141 |
| `ai_edit` | src/memorymap/api/routes_documents.py:1050 |
| `archive_document` | src/memorymap/api/routes_documents.py:756 |
| `attach_bookmark` | src/memorymap/api/routes_documents.py:244 |
| `attach_note` | src/memorymap/api/routes_documents.py:791 |
| `check_syntax` | src/memorymap/api/routes_documents.py:309 |
| `create_document` | src/memorymap/api/routes_documents.py:470 |
| `delete_document` | src/memorymap/api/routes_documents.py:706 |
| `detach_bookmark` | src/memorymap/api/routes_documents.py:261 |
| `detach_note` | src/memorymap/api/routes_documents.py:804 |
| `document_backlinks` | src/memorymap/api/routes_documents.py:884 |
| `document_bookmarks` | src/memorymap/api/routes_documents.py:225 |
| `document_connections` | src/memorymap/api/routes_documents.py:890 |
| `document_revision` | src/memorymap/api/routes_documents.py:1279 |
| `document_revisions` | src/memorymap/api/routes_documents.py:1235 |
| `documents_outline` | src/memorymap/api/routes_documents.py:438 |
| `export_bundle` | src/memorymap/api/routes_documents.py:966 |
| `export_docx` | src/memorymap/api/routes_documents.py:1009 |
| `export_markdown` | src/memorymap/api/routes_documents.py:921 |
| `get_document` | src/memorymap/api/routes_documents.py:596 |
| `import_document` | src/memorymap/api/routes_documents.py:494 |
| `list_ai_edits` | src/memorymap/api/routes_documents.py:1407 |
| `list_documents` | src/memorymap/api/routes_documents.py:341 |
| `list_file_types` | src/memorymap/api/routes_documents.py:284 |
| `purge_document` | src/memorymap/api/routes_documents.py:740 |
| `record_ai_edit` | src/memorymap/api/routes_documents.py:1367 |
| `rephrase_passage` | src/memorymap/api/routes_documents.py:1185 |
| `restore_document` | src/memorymap/api/routes_documents.py:729 |
| `restore_document_revision` | src/memorymap/api/routes_documents.py:1297 |
| `revert_ai_edit` | src/memorymap/api/routes_documents.py:1421 |
| `unarchive_document` | src/memorymap/api/routes_documents.py:770 |
| `update_document` | src/memorymap/api/routes_documents.py:601 |

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

### src/memorymap/api/routes_entries.py (121)

| Name | File:line |
|---|---|
| `AttachBookmarkBody` | src/memorymap/api/routes_entries.py:2057 |
| `BackfillReasonsBody` | src/memorymap/api/routes_entries.py:1958 |
| `DailyDayOut` | src/memorymap/api/routes_entries.py:844 |
| `DailyJournalOut` | src/memorymap/api/routes_entries.py:849 |
| `ExtractCommitBody` | src/memorymap/api/routes_entries.py:3767 |
| `ExtractLinkIn` | src/memorymap/api/routes_entries.py:3757 |
| `ExtractNoteIn` | src/memorymap/api/routes_entries.py:3746 |
| `ExtractPreviewBody` | src/memorymap/api/routes_entries.py:3720 |
| `FilingDecisionBody` | src/memorymap/api/routes_entries.py:1041 |
| `FilingStopBody` | src/memorymap/api/routes_entries.py:1024 |
| `ImproveBody` | src/memorymap/api/routes_entries.py:1447 |
| `LinkBody` | src/memorymap/api/routes_entries.py:2677 |
| `LinkPatchBody` | src/memorymap/api/routes_entries.py:2718 |
| `LinkReasonBody` | src/memorymap/api/routes_entries.py:2734 |
| `LinkSuggestionReasonPair` | src/memorymap/api/routes_entries.py:1909 |
| `LinkSuggestionReasonsBody` | src/memorymap/api/routes_entries.py:1914 |
| `PrivacyBody` | src/memorymap/api/routes_entries.py:2741 |
| `SuggestTagsBody` | src/memorymap/api/routes_entries.py:1196 |
| `SuggestedTagsBody` | src/memorymap/api/routes_entries.py:1232 |
| `TensionPair` | src/memorymap/api/routes_entries.py:1859 |
| `ThenTextBody` | src/memorymap/api/routes_entries.py:3077 |
| `WikiRenameIn` | src/memorymap/api/routes_entries.py:2588 |
| `_LateFiling` | src/memorymap/api/routes_entries.py:340 |
| `_LazyNoteFacts` | src/memorymap/api/routes_entries.py:1548 |
| `_already_delivered` | src/memorymap/api/routes_entries.py:646 |
| `_backfill_reasons` | src/memorymap/api/routes_entries.py:2003 |
| `_board_reference_rows_batch` | src/memorymap/api/routes_entries.py:2776 |
| `_connected_files` | src/memorymap/api/routes_entries.py:3570 |
| `_connection_cue` | src/memorymap/api/routes_entries.py:3364 |
| `_connection_label` | src/memorymap/api/routes_entries.py:3558 |
| `_daily_date` | src/memorymap/api/routes_entries.py:859 |
| `_daily_note` | src/memorymap/api/routes_entries.py:897 |
| `_daily_notes` | src/memorymap/api/routes_entries.py:873 |
| `_dismissed_tensions` | src/memorymap/api/routes_entries.py:1707 |
| `_embed_entry_in_background` | src/memorymap/api/routes_entries.py:584 |
| `_existing_entry` | src/memorymap/api/routes_entries.py:294 |
| `_file_entry_in_background` | src/memorymap/api/routes_entries.py:431 |
| `_file_entry_now` | src/memorymap/api/routes_entries.py:314 |
| `_filed_by` | src/memorymap/api/routes_entries.py:1162 |
| `_find_near_duplicate` | src/memorymap/api/routes_entries.py:276 |
| `_first_line` | src/memorymap/api/routes_entries.py:868 |
| `_interior_phrase` | src/memorymap/api/routes_entries.py:3008 |
| `_json_tags` | src/memorymap/api/routes_entries.py:199 |
| `_keep_suggestions` | src/memorymap/api/routes_entries.py:218 |
| `_linked_entry_ids` | src/memorymap/api/routes_entries.py:1329 |
| `_links_to` | src/memorymap/api/routes_entries.py:3031 |
| `_open_suggestions` | src/memorymap/api/routes_entries.py:207 |
| `_preview` | src/memorymap/api/routes_entries.py:77 |
| `_process_committed_media` | src/memorymap/api/routes_entries.py:301 |
| `_queue_embedding` | src/memorymap/api/routes_entries.py:612 |
| `_queue_filing` | src/memorymap/api/routes_entries.py:624 |
| `_readable` | src/memorymap/api/routes_entries.py:2759 |
| `_reference_rows` | src/memorymap/api/routes_entries.py:3039 |
| `_reference_rows_batch` | src/memorymap/api/routes_entries.py:2865 |
| `_remember_delivery` | src/memorymap/api/routes_entries.py:663 |
| `_safe_filename` | src/memorymap/api/routes_entries.py:2427 |
| `_stored_form` | src/memorymap/api/routes_entries.py:2751 |
| `_tag_vocabulary` | src/memorymap/api/routes_entries.py:1184 |
| `_tension_key` | src/memorymap/api/routes_entries.py:1701 |
| `_to_out` | src/memorymap/api/routes_entries.py:90 |
| `_to_out_bulk` | src/memorymap/api/routes_entries.py:253 |
| `_wiki_link_targets_of` | src/memorymap/api/routes_entries.py:3521 |
| `accept_tension` | src/memorymap/api/routes_entries.py:1865 |
| `add_context` | src/memorymap/api/routes_entries.py:1264 |
| `answer_suggested_tags` | src/memorymap/api/routes_entries.py:1238 |
| `archive_entry` | src/memorymap/api/routes_entries.py:2633 |
| `attach_bookmark` | src/memorymap/api/routes_entries.py:2086 |
| `backfill_link_reasons` | src/memorymap/api/routes_entries.py:1967 |
| `check_link_props` | src/memorymap/api/routes_entries.py:2702 |
| `count_entries` | src/memorymap/api/routes_entries.py:2294 |
| `create_entry` | src/memorymap/api/routes_entries.py:672 |
| `create_link` | src/memorymap/api/routes_entries.py:3596 |
| `daily_journal` | src/memorymap/api/routes_entries.py:906 |
| `daily_note` | src/memorymap/api/routes_entries.py:948 |
| `decide_filing` | src/memorymap/api/routes_entries.py:1048 |
| `delete_entry` | src/memorymap/api/routes_entries.py:2605 |
| `delete_link` | src/memorymap/api/routes_entries.py:3621 |
| `detach_bookmark` | src/memorymap/api/routes_entries.py:2106 |
| `dismiss_tension` | src/memorymap/api/routes_entries.py:1889 |
| `entry_bookmarks` | src/memorymap/api/routes_entries.py:2065 |
| `entry_connections` | src/memorymap/api/routes_entries.py:3378 |
| `entry_history` | src/memorymap/api/routes_entries.py:3096 |
| `entry_reference_counts` | src/memorymap/api/routes_entries.py:2314 |
| `entry_references` | src/memorymap/api/routes_entries.py:3050 |
| `export_entry` | src/memorymap/api/routes_entries.py:2441 |
| `extract_commit` | src/memorymap/api/routes_entries.py:3776 |
| `extract_preview` | src/memorymap/api/routes_entries.py:3730 |
| `filing_status` | src/memorymap/api/routes_entries.py:1098 |
| `find_tensions` | src/memorymap/api/routes_entries.py:1713 |
| `generate_entry_title` | src/memorymap/api/routes_entries.py:3293 |
| `generate_link_reason_endpoint` | src/memorymap/api/routes_entries.py:3676 |
| `get_entry` | src/memorymap/api/routes_entries.py:2364 |
| `improve_writing` | src/memorymap/api/routes_entries.py:1458 |
| `known_tensions` | src/memorymap/api/routes_entries.py:1809 |
| `link_suggestion_reasons` | src/memorymap/api/routes_entries.py:1919 |
| `link_suggestions` | src/memorymap/api/routes_entries.py:1572 |
| `list_entries` | src/memorymap/api/routes_entries.py:2133 |
| `most_accessed` | src/memorymap/api/routes_entries.py:2282 |
| `open_daily_note` | src/memorymap/api/routes_entries.py:964 |
| `patch_link` | src/memorymap/api/routes_entries.py:3633 |
| `purge_entry` | src/memorymap/api/routes_entries.py:2652 |
| `query_entries` | src/memorymap/api/routes_entries.py:1510 |
| `reevaluate_entry` | src/memorymap/api/routes_entries.py:1347 |
| `related_entries` | src/memorymap/api/routes_entries.py:2030 |
| `remove_entry_title` | src/memorymap/api/routes_entries.py:3340 |
| `restore_entry` | src/memorymap/api/routes_entries.py:2625 |
| `restore_event` | src/memorymap/api/routes_entries.py:3178 |
| `restore_revision` | src/memorymap/api/routes_entries.py:3242 |
| `retry_stand_ins` | src/memorymap/api/routes_entries.py:551 |
| `seed_example_entries` | src/memorymap/api/routes_entries.py:2299 |
| `set_entry_privacy` | src/memorymap/api/routes_entries.py:3267 |
| `stop_all_filing` | src/memorymap/api/routes_entries.py:1069 |
| `stop_filing` | src/memorymap/api/routes_entries.py:995 |
| `stop_filing_one` | src/memorymap/api/routes_entries.py:1029 |
| `suggest_tags_for_draft` | src/memorymap/api/routes_entries.py:1202 |
| `then_and_now` | src/memorymap/api/routes_entries.py:3058 |
| `then_and_now_of_text` | src/memorymap/api/routes_entries.py:3083 |
| `unarchive_entry` | src/memorymap/api/routes_entries.py:2644 |
| `update_entry` | src/memorymap/api/routes_entries.py:2472 |
| `update_link_reason` | src/memorymap/api/routes_entries.py:3655 |
| `wiki_rename` | src/memorymap/api/routes_entries.py:2593 |

### src/memorymap/api/routes_files.py (113)

| Name | File:line |
|---|---|
| `AttachedFileTextOut` | src/memorymap/api/routes_files.py:629 |
| `AttachmentAnalyseBody` | src/memorymap/api/routes_files.py:364 |
| `AttachmentGalleryOut` | src/memorymap/api/routes_files.py:189 |
| `AttachmentRenameBody` | src/memorymap/api/routes_files.py:916 |
| `CaptionBody` | src/memorymap/api/routes_files.py:1834 |
| `FileTextIn` | src/memorymap/api/routes_files.py:697 |
| `MediaOrphansOut` | src/memorymap/api/routes_files.py:1468 |
| `MediaRenameBody` | src/memorymap/api/routes_files.py:1806 |
| `MediaUploadOut` | src/memorymap/api/routes_files.py:1306 |
| `OcrBody` | src/memorymap/api/routes_files.py:1952 |
| `OcrLanguageBody` | src/memorymap/api/routes_files.py:3226 |
| `OcrPageReadOut` | src/memorymap/api/routes_files.py:2543 |
| `OcrRangeReadOut` | src/memorymap/api/routes_files.py:3244 |
| `OcrReadersOut` | src/memorymap/api/routes_files.py:3148 |
| `OcrRegionBox` | src/memorymap/api/routes_files.py:2030 |
| `OcrRegionOut` | src/memorymap/api/routes_files.py:2039 |
| `OcrRegionReadOut` | src/memorymap/api/routes_files.py:3444 |
| `OcrRegionsOut` | src/memorymap/api/routes_files.py:2099 |
| `OcrStoredReadingOut` | src/memorymap/api/routes_files.py:2058 |
| `PdfInfoOut` | src/memorymap/api/routes_files.py:745 |
| `SaveFileBody` | src/memorymap/api/routes_files.py:991 |
| `VisionOcrBody` | src/memorymap/api/routes_files.py:3813 |
| `_attachment_out` | src/memorymap/api/routes_files.py:421 |
| `_attachment_size` | src/memorymap/api/routes_files.py:391 |
| `_checked_engine` | src/memorymap/api/routes_files.py:2720 |
| `_checked_reader` | src/memorymap/api/routes_files.py:2694 |
| `_clean_reading_fields` | src/memorymap/api/routes_files.py:3740 |
| `_describe_page` | src/memorymap/api/routes_files.py:3040 |
| `_embed_pattern` | src/memorymap/api/routes_files.py:1733 |
| `_engine_choice` | src/memorymap/api/routes_files.py:2714 |
| `_existing_attachment` | src/memorymap/api/routes_files.py:162 |
| `_exports_dir` | src/memorymap/api/routes_files.py:982 |
| `_forget_page_read` | src/memorymap/api/routes_files.py:3679 |
| `_forget_regions` | src/memorymap/api/routes_files.py:2310 |
| `_local_regions` | src/memorymap/api/routes_files.py:2742 |
| `_local_text` | src/memorymap/api/routes_files.py:2736 |
| `_media_size` | src/memorymap/api/routes_files.py:1583 |
| `_media_upload_path` | src/memorymap/api/routes_files.py:1648 |
| `_page_read_count_map` | src/memorymap/api/routes_files.py:2904 |
| `_page_read_key` | src/memorymap/api/routes_files.py:2747 |
| `_page_read_text_map` | src/memorymap/api/routes_files.py:2864 |
| `_parse_page_spec` | src/memorymap/api/routes_files.py:3265 |
| `_pdf_regions_for` | src/memorymap/api/routes_files.py:2146 |
| `_read_page` | src/memorymap/api/routes_files.py:2997 |
| `_read_range` | src/memorymap/api/routes_files.py:3300 |
| `_read_region` | src/memorymap/api/routes_files.py:3498 |
| `_reader_model` | src/memorymap/api/routes_files.py:2588 |
| `_region_image` | src/memorymap/api/routes_files.py:3475 |
| `_regions_for` | src/memorymap/api/routes_files.py:2375 |
| `_regions_text` | src/memorymap/api/routes_files.py:2941 |
| `_reindex_file` | src/memorymap/api/routes_files.py:2804 |
| `_remember_page_caption` | src/memorymap/api/routes_files.py:2822 |
| `_remember_page_read` | src/memorymap/api/routes_files.py:2756 |
| `_remember_regions` | src/memorymap/api/routes_files.py:2275 |
| `_set_edited_reading` | src/memorymap/api/routes_files.py:2343 |
| `_stored_page_reads` | src/memorymap/api/routes_files.py:2959 |
| `_stored_range` | src/memorymap/api/routes_files.py:3350 |
| `_stored_readings` | src/memorymap/api/routes_files.py:2068 |
| `_stored_regions` | src/memorymap/api/routes_files.py:2250 |
| `_strip_embeds` | src/memorymap/api/routes_files.py:1739 |
| `_tesseract_read_page` | src/memorymap/api/routes_files.py:3105 |
| `_vision_read_page` | src/memorymap/api/routes_files.py:2605 |
| `_within_dir` | src/memorymap/api/routes_files.py:1056 |
| `_within_exports` | src/memorymap/api/routes_files.py:1013 |
| `analyse_attachment` | src/memorymap/api/routes_files.py:446 |
| `attached_file_html_preview` | src/memorymap/api/routes_files.py:854 |
| `attached_file_pdf_info` | src/memorymap/api/routes_files.py:762 |
| `attached_file_pdf_page` | src/memorymap/api/routes_files.py:798 |
| `attached_file_text` | src/memorymap/api/routes_files.py:658 |
| `attachment_ocr_page_read` | src/memorymap/api/routes_files.py:3411 |
| `attachment_ocr_range_read` | src/memorymap/api/routes_files.py:3375 |
| `attachment_ocr_regions` | src/memorymap/api/routes_files.py:2511 |
| `attachment_page_caption` | src/memorymap/api/routes_files.py:3616 |
| `attachment_page_reads` | src/memorymap/api/routes_files.py:3654 |
| `attachment_region_read` | src/memorymap/api/routes_files.py:3582 |
| `caption_media` | src/memorymap/api/routes_files.py:1866 |
| `clean_attachment_reading_loops` | src/memorymap/api/routes_files.py:3761 |
| `clean_media_reading_loops` | src/memorymap/api/routes_files.py:3787 |
| `clean_orphaned_media` | src/memorymap/api/routes_files.py:1517 |
| `delete_attachment_page_read` | src/memorymap/api/routes_files.py:3715 |
| `delete_file` | src/memorymap/api/routes_files.py:899 |
| `delete_media` | src/memorymap/api/routes_files.py:1778 |
| `delete_media_page_read` | src/memorymap/api/routes_files.py:3729 |
| `download_export` | src/memorymap/api/routes_files.py:1164 |
| `download_file` | src/memorymap/api/routes_files.py:167 |
| `file_readings` | src/memorymap/api/routes_files.py:270 |
| `get_media` | src/memorymap/api/routes_files.py:3911 |
| `list_attachment_gallery` | src/memorymap/api/routes_files.py:294 |
| `list_exports` | src/memorymap/api/routes_files.py:1126 |
| `list_media` | src/memorymap/api/routes_files.py:1385 |
| `list_orphaned_media` | src/memorymap/api/routes_files.py:1486 |
| `media_meta` | src/memorymap/api/routes_files.py:1542 |
| `media_ocr_page_read` | src/memorymap/api/routes_files.py:3428 |
| `media_ocr_range_read` | src/memorymap/api/routes_files.py:3393 |
| `media_ocr_regions` | src/memorymap/api/routes_files.py:2477 |
| `media_page_caption` | src/memorymap/api/routes_files.py:3637 |
| `media_page_reads` | src/memorymap/api/routes_files.py:3670 |
| `media_pdf_info` | src/memorymap/api/routes_files.py:1659 |
| `media_pdf_page` | src/memorymap/api/routes_files.py:1699 |
| `media_region_read` | src/memorymap/api/routes_files.py:3602 |
| `media_text` | src/memorymap/api/routes_files.py:1592 |
| `ocr_media` | src/memorymap/api/routes_files.py:1971 |
| `ocr_readers` | src/memorymap/api/routes_files.py:3184 |
| `open_exports_folder` | src/memorymap/api/routes_files.py:1175 |
| `rename_file` | src/memorymap/api/routes_files.py:921 |
| `rename_media` | src/memorymap/api/routes_files.py:1811 |
| `safe_filename` | src/memorymap/api/routes_files.py:999 |
| `save_attached_file_text` | src/memorymap/api/routes_files.py:704 |
| `save_generated_file` | src/memorymap/api/routes_files.py:1078 |
| `set_ocr_language` | src/memorymap/api/routes_files.py:3233 |
| `upload_file` | src/memorymap/api/routes_files.py:94 |
| `upload_media` | src/memorymap/api/routes_files.py:1236 |
| `vision_ocr_media` | src/memorymap/api/routes_files.py:3840 |

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

### src/memorymap/api/routes_import.py (1)

| Name | File:line |
|---|---|
| `import_app` | src/memorymap/api/routes_import.py:26 |

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

### src/memorymap/api/routes_insights.py (18)

| Name | File:line |
|---|---|
| `_clean_greeting` | src/memorymap/api/routes_insights.py:135 |
| `_digest_notes` | src/memorymap/api/routes_insights.py:488 |
| `_greets_a_stranger` | src/memorymap/api/routes_insights.py:323 |
| `_long_date` | src/memorymap/api/routes_insights.py:462 |
| `_name_like_words` | src/memorymap/api/routes_insights.py:281 |
| `_name_mentions` | src/memorymap/api/routes_insights.py:292 |
| `_repair_misspelt_name` | src/memorymap/api/routes_insights.py:304 |
| `_sentence_case` | src/memorymap/api/routes_insights.py:156 |
| `_written_label` | src/memorymap/api/routes_insights.py:469 |
| `digest_question` | src/memorymap/api/routes_insights.py:482 |
| `digest_structure_note` | src/memorymap/api/routes_insights.py:527 |
| `greeting` | src/memorymap/api/routes_insights.py:161 |
| `heatmap` | src/memorymap/api/routes_insights.py:341 |
| `on_this_day` | src/memorymap/api/routes_insights.py:387 |
| `stats` | src/memorymap/api/routes_insights.py:33 |
| `tag_cloud` | src/memorymap/api/routes_insights.py:376 |
| `weekly_digest` | src/memorymap/api/routes_insights.py:640 |
| `weekly_digest_stream` | src/memorymap/api/routes_insights.py:572 |

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

### src/memorymap/api/routes_library.py (19)

| Name | File:line |
|---|---|
| `_activity` | src/memorymap/api/routes_library.py:875 |
| `_archive` | src/memorymap/api/routes_library.py:367 |
| `_chats` | src/memorymap/api/routes_library.py:263 |
| `_clip` | src/memorymap/api/routes_library.py:120 |
| `_clip_plain` | src/memorymap/api/routes_library.py:144 |
| `_documents` | src/memorymap/api/routes_library.py:228 |
| `_drafts` | src/memorymap/api/routes_library.py:828 |
| `_entry_kind` | src/memorymap/api/routes_library.py:201 |
| `_first_inline_image_url` | src/memorymap/api/routes_library.py:168 |
| `_highlights` | src/memorymap/api/routes_library.py:716 |
| `_human_size` | src/memorymap/api/routes_library.py:186 |
| `_images` | src/memorymap/api/routes_library.py:312 |
| `_like` | src/memorymap/api/routes_library.py:54 |
| `_notes` | src/memorymap/api/routes_library.py:596 |
| `_overview` | src/memorymap/api/routes_library.py:990 |
| `_shelved` | src/memorymap/api/routes_library.py:469 |
| `_tags` | src/memorymap/api/routes_library.py:950 |
| `_totals` | src/memorymap/api/routes_library.py:1019 |
| `library` | src/memorymap/api/routes_library.py:1036 |

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

### src/memorymap/api/routes_models.py (42)

| Name | File:line |
|---|---|
| `ChatModelBody` | src/memorymap/api/routes_models.py:36 |
| `EmbeddingBackendBody` | src/memorymap/api/routes_models.py:40 |
| `FeatureModelBody` | src/memorymap/api/routes_models.py:54 |
| `InspectBody` | src/memorymap/api/routes_models.py:638 |
| `ProviderBody` | src/memorymap/api/routes_models.py:72 |
| `PullBody` | src/memorymap/api/routes_models.py:45 |
| `SamplingBody` | src/memorymap/api/routes_models.py:516 |
| `UtilityModelBody` | src/memorymap/api/routes_models.py:49 |
| `VisionModelBody` | src/memorymap/api/routes_models.py:66 |
| `_CachedCapabilities` | src/memorymap/api/routes_models.py:189 |
| `_ListFlight` | src/memorymap/api/routes_models.py:117 |
| `_backend_label` | src/memorymap/api/routes_models.py:90 |
| `_builtin_embedding_install_state` | src/memorymap/api/routes_models.py:247 |
| `_embedding_coverage` | src/memorymap/api/routes_models.py:286 |
| `_human_bytes` | src/memorymap/api/routes_models.py:670 |
| `_installed_models` | src/memorymap/api/routes_models.py:97 |
| `_installed_names` | src/memorymap/api/routes_models.py:642 |
| `_installed_or_last_known` | src/memorymap/api/routes_models.py:131 |
| `_name_matches` | src/memorymap/api/routes_models.py:182 |
| `_run_list_flight` | src/memorymap/api/routes_models.py:164 |
| `_tools_engine` | src/memorymap/api/routes_models.py:302 |
| `_warm_capabilities` | src/memorymap/api/routes_models.py:225 |
| `cancel_job` | src/memorymap/api/routes_models.py:886 |
| `delete_model` | src/memorymap/api/routes_models.py:990 |
| `hardware_memory` | src/memorymap/api/routes_models.py:633 |
| `inspect_model` | src/memorymap/api/routes_models.py:650 |
| `model_spec` | src/memorymap/api/routes_models.py:489 |
| `pull_model` | src/memorymap/api/routes_models.py:1024 |
| `rebuild_search_index` | src/memorymap/api/routes_models.py:950 |
| `reset_feature_models` | src/memorymap/api/routes_models.py:803 |
| `sampling_settings` | src/memorymap/api/routes_models.py:529 |
| `save_sampling_settings` | src/memorymap/api/routes_models.py:577 |
| `set_chat_model` | src/memorymap/api/routes_models.py:678 |
| `set_embedding_backend` | src/memorymap/api/routes_models.py:901 |
| `set_feature_model` | src/memorymap/api/routes_models.py:753 |
| `set_ocr_model` | src/memorymap/api/routes_models.py:732 |
| `set_provider` | src/memorymap/api/routes_models.py:820 |
| `set_utility_model` | src/memorymap/api/routes_models.py:697 |
| `set_vision_model` | src/memorymap/api/routes_models.py:715 |
| `status` | src/memorymap/api/routes_models.py:312 |
| `suggested` | src/memorymap/api/routes_models.py:591 |
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

### src/memorymap/api/routes_questions.py (4)

| Name | File:line |
|---|---|
| `StateBody` | src/memorymap/api/routes_questions.py:49 |
| `list_questions` | src/memorymap/api/routes_questions.py:27 |
| `set_state` | src/memorymap/api/routes_questions.py:56 |
| `summary` | src/memorymap/api/routes_questions.py:44 |

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

### src/memorymap/api/routes_reminders.py (23)

| Name | File:line |
|---|---|
| `MagicAddBody` | src/memorymap/api/routes_reminders.py:46 |
| `ReminderCreate` | src/memorymap/api/routes_reminders.py:31 |
| `ReminderUpdate` | src/memorymap/api/routes_reminders.py:54 |
| `_binned` | src/memorymap/api/routes_reminders.py:499 |
| `_existing` | src/memorymap/api/routes_reminders.py:135 |
| `_ics_event` | src/memorymap/api/routes_reminders.py:255 |
| `_ics_fold` | src/memorymap/api/routes_reminders.py:232 |
| `_ics_response` | src/memorymap/api/routes_reminders.py:289 |
| `_ics_text` | src/memorymap/api/routes_reminders.py:221 |
| `_ics_time` | src/memorymap/api/routes_reminders.py:250 |
| `_reject_if_in_the_past` | src/memorymap/api/routes_reminders.py:66 |
| `_target` | src/memorymap/api/routes_reminders.py:81 |
| `_to_out` | src/memorymap/api/routes_reminders.py:106 |
| `create_reminder` | src/memorymap/api/routes_reminders.py:365 |
| `delete_reminder` | src/memorymap/api/routes_reminders.py:489 |
| `export_ics` | src/memorymap/api/routes_reminders.py:304 |
| `export_one_ics` | src/memorymap/api/routes_reminders.py:313 |
| `list_reminders` | src/memorymap/api/routes_reminders.py:320 |
| `magic_add_reminder` | src/memorymap/api/routes_reminders.py:393 |
| `purge_reminder` | src/memorymap/api/routes_reminders.py:520 |
| `reminder_counts` | src/memorymap/api/routes_reminders.py:158 |
| `restore_reminder` | src/memorymap/api/routes_reminders.py:510 |
| `update_reminder` | src/memorymap/api/routes_reminders.py:461 |

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
| `_corrected_query` | src/memorymap/api/routes_search.py:111 |
| `search` | src/memorymap/api/routes_search.py:56 |
| `stats` | src/memorymap/api/routes_search.py:134 |
| `warm` | src/memorymap/api/routes_search.py:36 |

### src/memorymap/api/routes_settings.py (93)

| Name | File:line |
|---|---|
| `AvatarStyle` | src/memorymap/api/routes_settings.py:53 |
| `ClientError` | src/memorymap/api/routes_settings.py:1952 |
| `CustomThemeItem` | src/memorymap/api/routes_settings.py:229 |
| `DashboardLayout` | src/memorymap/api/routes_settings.py:645 |
| `DraftTemplateBody` | src/memorymap/api/routes_settings.py:208 |
| `EmbeddingChoiceBody` | src/memorymap/api/routes_settings.py:1823 |
| `EmbeddingPullBody` | src/memorymap/api/routes_settings.py:1879 |
| `ExtrasBulkBody` | src/memorymap/api/routes_settings.py:1760 |
| `ImportDirectoryRequest` | src/memorymap/api/routes_settings.py:2563 |
| `PersonaItem` | src/memorymap/api/routes_settings.py:142 |
| `PreferenceBody` | src/memorymap/api/routes_settings.py:1251 |
| `PreferencesBody` | src/memorymap/api/routes_settings.py:299 |
| `ProposalAnswer` | src/memorymap/api/routes_settings.py:1256 |
| `SavedSearch` | src/memorymap/api/routes_settings.py:619 |
| `SkillInput` | src/memorymap/api/routes_settings.py:258 |
| `SkillItem` | src/memorymap/api/routes_settings.py:267 |
| `SuggestThinkingWordsBody` | src/memorymap/api/routes_settings.py:182 |
| `TemplateItem` | src/memorymap/api/routes_settings.py:114 |
| `UndoBody` | src/memorymap/api/routes_settings.py:1604 |
| `_already_imported` | src/memorymap/api/routes_settings.py:2661 |
| `_clean_avatar_style` | src/memorymap/api/routes_settings.py:94 |
| `_create_document_notes` | src/memorymap/api/routes_settings.py:2998 |
| `_csv_safe` | src/memorymap/api/routes_settings.py:1488 |
| `_desktop_entry` | src/memorymap/api/routes_settings.py:1072 |
| `_export_rows` | src/memorymap/api/routes_settings.py:2300 |
| `_exported_created` | src/memorymap/api/routes_settings.py:2496 |
| `_feed_item` | src/memorymap/api/routes_settings.py:1577 |
| `_import_directory_files` | src/memorymap/api/routes_settings.py:2682 |
| `_import_markdown_files` | src/memorymap/api/routes_settings.py:2855 |
| `_import_root_for` | src/memorymap/api/routes_settings.py:2626 |
| `_import_roots` | src/memorymap/api/routes_settings.py:2610 |
| `_inside` | src/memorymap/api/routes_settings.py:2634 |
| `_keep_exported_state` | src/memorymap/api/routes_settings.py:2513 |
| `_link_imported` | src/memorymap/api/routes_settings.py:2841 |
| `_models_status_snapshot` | src/memorymap/api/routes_settings.py:2284 |
| `_not_private_events` | src/memorymap/api/routes_settings.py:1495 |
| `_parse_frontmatter` | src/memorymap/api/routes_settings.py:2523 |
| `_preference_detail` | src/memorymap/api/routes_settings.py:901 |
| `_preference_out` | src/memorymap/api/routes_settings.py:1262 |
| `_redacted_preferences` | src/memorymap/api/routes_settings.py:2155 |
| `_run_directory_import` | src/memorymap/api/routes_settings.py:2646 |
| `_slug` | src/memorymap/api/routes_settings.py:2400 |
| `_text_hash` | src/memorymap/api/routes_settings.py:2657 |
| `_under_root` | src/memorymap/api/routes_settings.py:2621 |
| `_validated_context_windows` | src/memorymap/api/routes_settings.py:932 |
| `_validated_export_dir` | src/memorymap/api/routes_settings.py:1167 |
| `_validated_import_directory` | src/memorymap/api/routes_settings.py:2566 |
| `_validated_quick_access` | src/memorymap/api/routes_settings.py:667 |
| `_validated_quick_tints` | src/memorymap/api/routes_settings.py:690 |
| `_validated_skills` | src/memorymap/api/routes_settings.py:1115 |
| `_validated_templates` | src/memorymap/api/routes_settings.py:1141 |
| `add_memory` | src/memorymap/api/routes_settings.py:1325 |
| `answer_memory_proposal` | src/memorymap/api/routes_settings.py:1368 |
| `audit_export_csv` | src/memorymap/api/routes_settings.py:1522 |
| `audit_log` | src/memorymap/api/routes_settings.py:1431 |
| `build_markdown_export` | src/memorymap/api/routes_settings.py:2406 |
| `bulk_extras` | src/memorymap/api/routes_settings.py:1770 |
| `clear_audit_log` | src/memorymap/api/routes_settings.py:1707 |
| `clear_server_logs` | src/memorymap/api/routes_settings.py:2030 |
| `download_embedding_model` | src/memorymap/api/routes_settings.py:1921 |
| `draft_template` | src/memorymap/api/routes_settings.py:215 |
| `embedding_model_choices` | src/memorymap/api/routes_settings.py:1829 |
| `empty_recycle_bin` | src/memorymap/api/routes_settings.py:1723 |
| `event_feed` | src/memorymap/api/routes_settings.py:1649 |
| `export_backup` | src/memorymap/api/routes_settings.py:2311 |
| `export_csv` | src/memorymap/api/routes_settings.py:3024 |
| `export_json` | src/memorymap/api/routes_settings.py:2336 |
| `export_markdown` | src/memorymap/api/routes_settings.py:2465 |
| `forget_memory` | src/memorymap/api/routes_settings.py:1421 |
| `get_preferences` | src/memorymap/api/routes_settings.py:711 |
| `import_directory` | src/memorymap/api/routes_settings.py:2806 |
| `import_document` | src/memorymap/api/routes_settings.py:2928 |
| `import_markdown` | src/memorymap/api/routes_settings.py:2822 |
| `install_extra` | src/memorymap/api/routes_settings.py:1779 |
| `list_embedding_models` | src/memorymap/api/routes_settings.py:1802 |
| `list_extras` | src/memorymap/api/routes_settings.py:1738 |
| `list_memory` | src/memorymap/api/routes_settings.py:1290 |
| `list_skills` | src/memorymap/api/routes_settings.py:1189 |
| `pull_embedding_model` | src/memorymap/api/routes_settings.py:1884 |
| `record_client_error` | src/memorymap/api/routes_settings.py:1966 |
| `remove_embedding_model` | src/memorymap/api/routes_settings.py:1940 |
| `restart_app` | src/memorymap/api/routes_settings.py:1091 |
| `server_log_stats` | src/memorymap/api/routes_settings.py:2018 |
| `server_logs` | src/memorymap/api/routes_settings.py:1947 |
| `set_console_mode` | src/memorymap/api/routes_settings.py:1022 |
| `stream_server_logs` | src/memorymap/api/routes_settings.py:2046 |
| `suggest_persona_thinking_words` | src/memorymap/api/routes_settings.py:188 |
| `support_bundle` | src/memorymap/api/routes_settings.py:2211 |
| `undo_actor` | src/memorymap/api/routes_settings.py:1620 |
| `uninstall_extra` | src/memorymap/api/routes_settings.py:1792 |
| `update_memory` | src/memorymap/api/routes_settings.py:1402 |
| `update_preferences` | src/memorymap/api/routes_settings.py:953 |
| `use_embedding_model` | src/memorymap/api/routes_settings.py:1861 |

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

### src/memorymap/api/routes_tags.py (12)

| Name | File:line |
|---|---|
| `BulkBody` | src/memorymap/api/routes_tags.py:61 |
| `DeleteBody` | src/memorymap/api/routes_tags.py:26 |
| `MergeBody` | src/memorymap/api/routes_tags.py:56 |
| `RenameBody` | src/memorymap/api/routes_tags.py:21 |
| `RestoreBody` | src/memorymap/api/routes_tags.py:67 |
| `_answer` | src/memorymap/api/routes_tags.py:72 |
| `bulk_edit_tags` | src/memorymap/api/routes_tags.py:105 |
| `delete_tag` | src/memorymap/api/routes_tags.py:96 |
| `list_tags` | src/memorymap/api/routes_tags.py:41 |
| `merge_tags` | src/memorymap/api/routes_tags.py:87 |
| `rename_tag` | src/memorymap/api/routes_tags.py:77 |
| `restore_tags` | src/memorymap/api/routes_tags.py:111 |

### src/memorymap/api/routes_tasks.py (19)

| Name | File:line |
|---|---|
| `CancelTaskBody` | src/memorymap/api/routes_tasks.py:566 |
| `_percent` | src/memorymap/api/routes_tasks.py:42 |
| `_stamp_started` | src/memorymap/api/routes_tasks.py:415 |
| `_stop_filing` | src/memorymap/api/routes_tasks.py:441 |
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
| `list_jobs` | src/memorymap/api/routes_tasks.py:500 |
| `list_tasks` | src/memorymap/api/routes_tasks.py:452 |
| `run_pass_now` | src/memorymap/api/routes_tasks.py:486 |
| `shutdown` | src/memorymap/api/routes_tasks.py:717 |
| `trigger_autonomous` | src/memorymap/api/routes_tasks.py:615 |

### src/memorymap/api/routes_tidy.py (12)

| Name | File:line |
|---|---|
| `ApplyBody` | src/memorymap/api/routes_tidy.py:35 |
| `AutoBody` | src/memorymap/api/routes_tidy.py:40 |
| `_level` | src/memorymap/api/routes_tidy.py:31 |
| `_review` | src/memorymap/api/routes_tidy.py:24 |
| `tidy_apply` | src/memorymap/api/routes_tidy.py:100 |
| `tidy_auto` | src/memorymap/api/routes_tidy.py:56 |
| `tidy_history` | src/memorymap/api/routes_tidy.py:51 |
| `tidy_link_reasons_run` | src/memorymap/api/routes_tidy.py:74 |
| `tidy_link_reasons_stop` | src/memorymap/api/routes_tidy.py:84 |
| `tidy_rows` | src/memorymap/api/routes_tidy.py:90 |
| `tidy_summary` | src/memorymap/api/routes_tidy.py:46 |
| `tidy_undo` | src/memorymap/api/routes_tidy.py:66 |

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

### src/memorymap/api/routes_vision.py (20)

| Name | File:line |
|---|---|
| `ChartQuestion` | src/memorymap/api/routes_vision.py:401 |
| `DismissBody` | src/memorymap/api/routes_vision.py:244 |
| `_bucket` | src/memorymap/api/routes_vision.py:344 |
| `_buckets` | src/memorymap/api/routes_vision.py:355 |
| `_live_notes` | src/memorymap/api/routes_vision.py:55 |
| `_meaning_alike` | src/memorymap/api/routes_vision.py:168 |
| `_month_bounds` | src/memorymap/api/routes_vision.py:275 |
| `_norm` | src/memorymap/api/routes_vision.py:145 |
| `_pair_key` | src/memorymap/api/routes_vision.py:151 |
| `_period` | src/memorymap/api/routes_vision.py:281 |
| `_renamed_by_person` | src/memorymap/api/routes_vision.py:155 |
| `accept_filing` | src/memorymap/api/routes_vision.py:95 |
| `chart_for_question` | src/memorymap/api/routes_vision.py:409 |
| `count_notes` | src/memorymap/api/routes_vision.py:366 |
| `dismiss_tidy` | src/memorymap/api/routes_vision.py:250 |
| `most_opened` | src/memorymap/api/routes_vision.py:113 |
| `parse_chart_question` | src/memorymap/api/routes_vision.py:317 |
| `review_filter` | src/memorymap/api/routes_vision.py:67 |
| `review_queue` | src/memorymap/api/routes_vision.py:84 |
| `tidy_proposals` | src/memorymap/api/routes_vision.py:196 |

### src/memorymap/api/routes_voice.py (6)

| Name | File:line |
|---|---|
| `SummarizeBody` | src/memorymap/api/routes_voice.py:106 |
| `_transcribe_upload` | src/memorymap/api/routes_voice.py:40 |
| `status` | src/memorymap/api/routes_voice.py:31 |
| `summarize` | src/memorymap/api/routes_voice.py:111 |
| `transcribe` | src/memorymap/api/routes_voice.py:87 |
| `transcribe_meeting` | src/memorymap/api/routes_voice.py:94 |

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

### src/memorymap/api/routes_whiteboard.py (130)

| Name | File:line |
|---|---|
| `BoardBackground` | src/memorymap/api/routes_whiteboard.py:1175 |
| `BoardCreate` | src/memorymap/api/routes_whiteboard.py:1352 |
| `BoardImageOut` | src/memorymap/api/routes_whiteboard.py:2255 |
| `BoardOut` | src/memorymap/api/routes_whiteboard.py:1259 |
| `BoardRename` | src/memorymap/api/routes_whiteboard.py:2492 |
| `BoardTypeMixin` | src/memorymap/api/routes_whiteboard.py:1326 |
| `MapClearStyleOut` | src/memorymap/api/routes_whiteboard.py:3828 |
| `MapGenerate` | src/memorymap/api/routes_whiteboard.py:5294 |
| `MapImport` | src/memorymap/api/routes_whiteboard.py:4526 |
| `MapNodeCreate` | src/memorymap/api/routes_whiteboard.py:3386 |
| `MapNodeMove` | src/memorymap/api/routes_whiteboard.py:3562 |
| `MapNodeMoveOne` | src/memorymap/api/routes_whiteboard.py:3653 |
| `MapNodesMove` | src/memorymap/api/routes_whiteboard.py:3668 |
| `MapOutlinePaste` | src/memorymap/api/routes_whiteboard.py:3491 |
| `MapProposal` | src/memorymap/api/routes_whiteboard.py:5136 |
| `MapTreeOut` | src/memorymap/api/routes_whiteboard.py:3320 |
| `WhiteboardComment` | src/memorymap/api/routes_whiteboard.py:261 |
| `WhiteboardNodeBase` | src/memorymap/api/routes_whiteboard.py:286 |
| `WhiteboardNodeOut` | src/memorymap/api/routes_whiteboard.py:309 |
| `WhiteboardObjectBase` | src/memorymap/api/routes_whiteboard.py:636 |
| `WhiteboardObjectData` | src/memorymap/api/routes_whiteboard.py:330 |
| `WhiteboardObjectOut` | src/memorymap/api/routes_whiteboard.py:659 |
| `WhiteboardSketchBase` | src/memorymap/api/routes_whiteboard.py:315 |
| `WhiteboardSketchOut` | src/memorymap/api/routes_whiteboard.py:324 |
| `WhiteboardStateOut` | src/memorymap/api/routes_whiteboard.py:758 |
| `_PathEnd` | src/memorymap/api/routes_whiteboard.py:1656 |
| `_apply_comments` | src/memorymap/api/routes_whiteboard.py:2620 |
| `_board_background` | src/memorymap/api/routes_whiteboard.py:1205 |
| `_board_entry` | src/memorymap/api/routes_whiteboard.py:3350 |
| `_board_filter` | src/memorymap/api/routes_whiteboard.py:766 |
| `_board_numbered` | src/memorymap/api/routes_whiteboard.py:1136 |
| `_board_palette` | src/memorymap/api/routes_whiteboard.py:1472 |
| `_board_preview` | src/memorymap/api/routes_whiteboard.py:1764 |
| `_board_settings` | src/memorymap/api/routes_whiteboard.py:930 |
| `_board_theme` | src/memorymap/api/routes_whiteboard.py:1059 |
| `_build_tree` | src/memorymap/api/routes_whiteboard.py:3213 |
| `_clean_import_style` | src/memorymap/api/routes_whiteboard.py:4616 |
| `_clean_levels` | src/memorymap/api/routes_whiteboard.py:1025 |
| `_clean_theme` | src/memorymap/api/routes_whiteboard.py:983 |
| `_cross_links` | src/memorymap/api/routes_whiteboard.py:3288 |
| `_delete_one_object` | src/memorymap/api/routes_whiteboard.py:2957 |
| `_drop_orphan_links` | src/memorymap/api/routes_whiteboard.py:880 |
| `_export_freemind` | src/memorymap/api/routes_whiteboard.py:4324 |
| `_export_markdown` | src/memorymap/api/routes_whiteboard.py:4041 |
| `_export_node_id` | src/memorymap/api/routes_whiteboard.py:4320 |
| `_export_opml` | src/memorymap/api/routes_whiteboard.py:4240 |
| `_export_text` | src/memorymap/api/routes_whiteboard.py:4082 |
| `_export_tree` | src/memorymap/api/routes_whiteboard.py:3939 |
| `_first_cycle` | src/memorymap/api/routes_whiteboard.py:3685 |
| `_flatten_parsed` | src/memorymap/api/routes_whiteboard.py:5417 |
| `_forget_links_to` | src/memorymap/api/routes_whiteboard.py:776 |
| `_freemind_style` | src/memorymap/api/routes_whiteboard.py:4650 |
| `_import_link_targets` | src/memorymap/api/routes_whiteboard.py:4692 |
| `_is_descendant` | src/memorymap/api/routes_whiteboard.py:3568 |
| `_is_link_sketch` | src/memorymap/api/routes_whiteboard.py:1249 |
| `_is_one_emoji` | src/memorymap/api/routes_whiteboard.py:223 |
| `_map_branch_colors` | src/memorymap/api/routes_whiteboard.py:1477 |
| `_map_kind_ok` | src/memorymap/api/routes_whiteboard.py:3007 |
| `_map_node_dict` | src/memorymap/api/routes_whiteboard.py:3185 |
| `_map_node_style` | src/memorymap/api/routes_whiteboard.py:3171 |
| `_map_objects` | src/memorymap/api/routes_whiteboard.py:3257 |
| `_markdown_note_lines` | src/memorymap/api/routes_whiteboard.py:4103 |
| `_next_position` | src/memorymap/api/routes_whiteboard.py:3401 |
| `_note_titles` | src/memorymap/api/routes_whiteboard.py:5163 |
| `_object_data` | src/memorymap/api/routes_whiteboard.py:3118 |
| `_object_to_out` | src/memorymap/api/routes_whiteboard.py:719 |
| `_opml_style` | src/memorymap/api/routes_whiteboard.py:4675 |
| `_outline_covering` | src/memorymap/api/routes_whiteboard.py:5207 |
| `_outline_from_filing` | src/memorymap/api/routes_whiteboard.py:5178 |
| `_outline_from_paste` | src/memorymap/api/routes_whiteboard.py:3501 |
| `_outline_numbers` | src/memorymap/api/routes_whiteboard.py:3978 |
| `_outline_rows` | src/memorymap/api/routes_whiteboard.py:3908 |
| `_parent_map` | src/memorymap/api/routes_whiteboard.py:3675 |
| `_parse_freemind` | src/memorymap/api/routes_whiteboard.py:4703 |
| `_parse_markdown_outline` | src/memorymap/api/routes_whiteboard.py:4909 |
| `_parse_opml` | src/memorymap/api/routes_whiteboard.py:4767 |
| `_parse_xmind` | src/memorymap/api/routes_whiteboard.py:4826 |
| `_parse_xml_document` | src/memorymap/api/routes_whiteboard.py:4551 |
| `_path_bbox` | src/memorymap/api/routes_whiteboard.py:1594 |
| `_place_map_nodes` | src/memorymap/api/routes_whiteboard.py:4992 |
| `_preview_fields` | src/memorymap/api/routes_whiteboard.py:2023 |
| `_preview_fingerprint` | src/memorymap/api/routes_whiteboard.py:1982 |
| `_preview_items` | src/memorymap/api/routes_whiteboard.py:1707 |
| `_preview_points` | src/memorymap/api/routes_whiteboard.py:1362 |
| `_preview_size` | src/memorymap/api/routes_whiteboard.py:1555 |
| `_proposal_notes` | src/memorymap/api/routes_whiteboard.py:5144 |
| `_record_map_creation` | src/memorymap/api/routes_whiteboard.py:5307 |
| `_reference_facets` | src/memorymap/api/routes_whiteboard.py:3087 |
| `_reference_label` | src/memorymap/api/routes_whiteboard.py:3051 |
| `_require_board` | src/memorymap/api/routes_whiteboard.py:828 |
| `_require_entry` | src/memorymap/api/routes_whiteboard.py:821 |
| `_require_object_data` | src/memorymap/api/routes_whiteboard.py:736 |
| `_require_reference` | src/memorymap/api/routes_whiteboard.py:3019 |
| `_restore_import_links` | src/memorymap/api/routes_whiteboard.py:5063 |
| `_sibling_key` | src/memorymap/api/routes_whiteboard.py:3279 |
| `_sketch_preview` | src/memorymap/api/routes_whiteboard.py:1667 |
| `_store_board_background` | src/memorymap/api/routes_whiteboard.py:1225 |
| `_store_board_numbered` | src/memorymap/api/routes_whiteboard.py:1154 |
| `_store_board_settings` | src/memorymap/api/routes_whiteboard.py:957 |
| `_store_board_theme` | src/memorymap/api/routes_whiteboard.py:1072 |
| `_strip_outline_numbers` | src/memorymap/api/routes_whiteboard.py:4012 |
| `_subtree` | src/memorymap/api/routes_whiteboard.py:2926 |
| `_themed_style` | src/memorymap/api/routes_whiteboard.py:1106 |
| `_without_pins` | src/memorymap/api/routes_whiteboard.py:1124 |
| `_xml_attribute` | src/memorymap/api/routes_whiteboard.py:4227 |
| `board_tree` | src/memorymap/api/routes_whiteboard.py:3360 |
| `clear_map_node_styles` | src/memorymap/api/routes_whiteboard.py:3853 |
| `create_board` | src/memorymap/api/routes_whiteboard.py:2332 |
| `create_map_node` | src/memorymap/api/routes_whiteboard.py:3430 |
| `create_node` | src/memorymap/api/routes_whiteboard.py:2629 |
| `create_object` | src/memorymap/api/routes_whiteboard.py:2803 |
| `create_sketch` | src/memorymap/api/routes_whiteboard.py:2727 |
| `delete_node` | src/memorymap/api/routes_whiteboard.py:2706 |
| `delete_object` | src/memorymap/api/routes_whiteboard.py:2881 |
| `delete_sketch` | src/memorymap/api/routes_whiteboard.py:2774 |
| `duplicate_board` | src/memorymap/api/routes_whiteboard.py:2374 |
| `export_board` | src/memorymap/api/routes_whiteboard.py:4450 |
| `generate_map` | src/memorymap/api/routes_whiteboard.py:5355 |
| `get_whiteboard_state` | src/memorymap/api/routes_whiteboard.py:856 |
| `import_board` | src/memorymap/api/routes_whiteboard.py:5429 |
| `list_boards` | src/memorymap/api/routes_whiteboard.py:2075 |
| `list_images` | src/memorymap/api/routes_whiteboard.py:2263 |
| `move_map_node` | src/memorymap/api/routes_whiteboard.py:3601 |
| `move_map_nodes` | src/memorymap/api/routes_whiteboard.py:3716 |
| `paste_map_outline` | src/memorymap/api/routes_whiteboard.py:3526 |
| `propose_map` | src/memorymap/api/routes_whiteboard.py:5226 |
| `rename_board` | src/memorymap/api/routes_whiteboard.py:2513 |
| `update_node` | src/memorymap/api/routes_whiteboard.py:2674 |
| `update_object` | src/memorymap/api/routes_whiteboard.py:2847 |
| `update_sketch` | src/memorymap/api/routes_whiteboard.py:2749 |

### src/memorymap/api/run_sandbox.py (6)

| Name | File:line |
|---|---|
| `_MMOut` | src/memorymap/api/run_sandbox.py:202 |
| `_mm_run` | src/memorymap/api/run_sandbox.py:235 |
| `pyodide_file` | src/memorymap/api/run_sandbox.py:396 |
| `python_csp` | src/memorymap/api/run_sandbox.py:178 |
| `run_sandbox` | src/memorymap/api/run_sandbox.py:133 |
| `run_sandbox_python` | src/memorymap/api/run_sandbox.py:367 |

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

### src/memorymap/core/atomic_io.py (3)

| Name | File:line |
|---|---|
| `_replace` | src/memorymap/core/atomic_io.py:30 |
| `atomic_write_json` | src/memorymap/core/atomic_io.py:79 |
| `atomic_write_text` | src/memorymap/core/atomic_io.py:53 |

### src/memorymap/core/backup.py (15)

| Name | File:line |
|---|---|
| `_sweep_partials` | src/memorymap/core/backup.py:232 |
| `backup_files` | src/memorymap/core/backup.py:43 |
| `backup_if_due` | src/memorymap/core/backup.py:261 |
| `backup_is_due` | src/memorymap/core/backup.py:243 |
| `backup_now` | src/memorymap/core/backup.py:135 |
| `backup_path` | src/memorymap/core/backup.py:32 |
| `backups_dir` | src/memorymap/core/backup.py:26 |
| `list_backups` | src/memorymap/core/backup.py:71 |
| `optimize_fts` | src/memorymap/core/backup.py:94 |
| `prune` | src/memorymap/core/backup.py:212 |
| `restore_backup` | src/memorymap/core/backup.py:279 |
| `restore_file` | src/memorymap/core/backup.py:291 |
| `snapshot` | src/memorymap/core/backup.py:119 |
| `strip_leftovers` | src/memorymap/core/backup.py:108 |
| `verify_copy` | src/memorymap/core/backup.py:197 |

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

### src/memorymap/core/database.py (60)

| Name | File:line |
|---|---|
| `AskTurn` | src/memorymap/core/database.py:981 |
| `Attachment` | src/memorymap/core/database.py:904 |
| `AuditLog` | src/memorymap/core/database.py:1931 |
| `Base` | src/memorymap/core/database.py:126 |
| `BoardLibrary` | src/memorymap/core/database.py:1707 |
| `BoardLibraryItem` | src/memorymap/core/database.py:1725 |
| `BoardLibraryMark` | src/memorymap/core/database.py:1749 |
| `Bookmark` | src/memorymap/core/database.py:1027 |
| `Category` | src/memorymap/core/database.py:271 |
| `ChunkVector` | src/memorymap/core/database.py:829 |
| `Conversation` | src/memorymap/core/database.py:946 |
| `DatabaseManager` | src/memorymap/core/database.py:2112 |
| `DateTime` | src/memorymap/core/database.py:88 |
| `DerivedFact` | src/memorymap/core/database.py:1152 |
| `DerivedTension` | src/memorymap/core/database.py:1218 |
| `Document` | src/memorymap/core/database.py:1351 |
| `DocumentAiEdit` | src/memorymap/core/database.py:1405 |
| `DocumentBookmark` | src/memorymap/core/database.py:1083 |
| `DocumentLink` | src/memorymap/core/database.py:1382 |
| `DocumentRevision` | src/memorymap/core/database.py:1547 |
| `DurableJob` | src/memorymap/core/database.py:1860 |
| `EmbeddingRecord` | src/memorymap/core/database.py:814 |
| `Entity` | src/memorymap/core/database.py:515 |
| `EntityMention` | src/memorymap/core/database.py:555 |
| `Entry` | src/memorymap/core/database.py:306 |
| `EntryBookmark` | src/memorymap/core/database.py:1063 |
| `EntryDate` | src/memorymap/core/database.py:1329 |
| `EntryLink` | src/memorymap/core/database.py:640 |
| `EntryOpen` | src/memorymap/core/database.py:1308 |
| `EntryProperty` | src/memorymap/core/database.py:712 |
| `EntryRevision` | src/memorymap/core/database.py:1290 |
| `JobRun` | src/memorymap/core/database.py:1833 |
| `LinkProps` | src/memorymap/core/database.py:604 |
| `LinkReason` | src/memorymap/core/database.py:566 |
| `MediaUpload` | src/memorymap/core/database.py:1761 |
| `NightRun` | src/memorymap/core/database.py:1261 |
| `NoteScore` | src/memorymap/core/database.py:1122 |
| `NoteType` | src/memorymap/core/database.py:734 |
| `PageRead` | src/memorymap/core/database.py:1445 |
| `RelationType` | src/memorymap/core/database.py:694 |
| `Reminder` | src/memorymap/core/database.py:1099 |
| `Space` | src/memorymap/core/database.py:129 |
| `StagedEmbedding` | src/memorymap/core/database.py:877 |
| `User` | src/memorymap/core/database.py:236 |
| `UserPreference` | src/memorymap/core/database.py:1903 |
| `Vault` | src/memorymap/core/database.py:247 |
| `WhiteboardNode` | src/memorymap/core/database.py:1585 |
| `WhiteboardObject` | src/memorymap/core/database.py:1644 |
| `WhiteboardSketch` | src/memorymap/core/database.py:1627 |
| `WorkspaceMixin` | src/memorymap/core/database.py:151 |
| `_add_workspace_filter` | src/memorymap/core/database.py:174 |
| `_ensure_alembic_baseline` | src/memorymap/core/database.py:2007 |
| `_hide_binned` | src/memorymap/core/database.py:213 |
| `_migrations_root` | src/memorymap/core/database.py:1972 |
| `_safety_copy_before_migrating` | src/memorymap/core/database.py:1987 |
| `_set_workspace` | src/memorymap/core/database.py:227 |
| `like_escape` | src/memorymap/core/database.py:60 |
| `link_strength` | src/memorymap/core/database.py:791 |
| `utcnow` | src/memorymap/core/database.py:49 |
| `workspace_scoped_models` | src/memorymap/core/database.py:157 |

### src/memorymap/core/deps.py (26)

| Name | File:line |
|---|---|
| `MultipleWorkersError` | src/memorymap/core/deps.py:40 |
| `_embedding_model_in_use` | src/memorymap/core/deps.py:347 |
| `_init_app_state` | src/memorymap/core/deps.py:178 |
| `_requested_worker_count` | src/memorymap/core/deps.py:44 |
| `_reset_app_state` | src/memorymap/core/deps.py:247 |
| `build_llm_client` | src/memorymap/core/deps.py:114 |
| `clear_index_stale` | src/memorymap/core/deps.py:465 |
| `get_config` | src/memorymap/core/deps.py:297 |
| `get_db` | src/memorymap/core/deps.py:303 |
| `get_embeddings` | src/memorymap/core/deps.py:341 |
| `get_model_manager` | src/memorymap/core/deps.py:335 |
| `get_ollama` | src/memorymap/core/deps.py:324 |
| `get_or_404` | src/memorymap/core/deps.py:383 |
| `get_session` | src/memorymap/core/deps.py:358 |
| `impersonate_workspace` | src/memorymap/core/deps.py:475 |
| `index_stale_notes` | src/memorymap/core/deps.py:470 |
| `init_app_state` | src/memorymap/core/deps.py:172 |
| `mark_index_stale` | src/memorymap/core/deps.py:443 |
| `override_ai` | src/memorymap/core/deps.py:285 |
| `peek_db` | src/memorymap/core/deps.py:309 |
| `refuse_multiple_workers` | src/memorymap/core/deps.py:82 |
| `register_cache_reset` | src/memorymap/core/deps.py:235 |
| `reload_db` | src/memorymap/core/deps.py:211 |
| `reload_llm_client` | src/memorymap/core/deps.py:260 |
| `reset_app_state` | src/memorymap/core/deps.py:241 |
| `store_quietly` | src/memorymap/core/deps.py:409 |

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

### src/memorymap/core/docexport.py (19)

| Name | File:line |
|---|---|
| `Comment` | src/memorymap/core/docexport.py:44 |
| `_block_picture` | src/memorymap/core/docexport.py:521 |
| `_cells` | src/memorymap/core/docexport.py:550 |
| `_embed` | src/memorymap/core/docexport.py:497 |
| `_inline` | src/memorymap/core/docexport.py:575 |
| `_plain` | src/memorymap/core/docexport.py:570 |
| `_skip_mask` | src/memorymap/core/docexport.py:54 |
| `_stem` | src/memorymap/core/docexport.py:227 |
| `_table` | src/memorymap/core/docexport.py:559 |
| `bundle` | src/memorymap/core/docexport.py:174 |
| `comments_to_footnotes` | src/memorymap/core/docexport.py:125 |
| `docx_available` | src/memorymap/core/docexport.py:238 |
| `inline_split` | src/memorymap/core/docexport.py:278 |
| `media_path` | src/memorymap/core/docexport.py:390 |
| `parse_comments` | src/memorymap/core/docexport.py:64 |
| `picture_options` | src/memorymap/core/docexport.py:357 |
| `rewrite_media_links` | src/memorymap/core/docexport.py:154 |
| `strip_comments` | src/memorymap/core/docexport.py:97 |
| `to_docx` | src/memorymap/core/docexport.py:409 |

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
| `_HtmlToMarkdown` | src/memorymap/core/docview.py:162 |
| `_clip` | src/memorymap/core/docview.py:585 |
| `_docx_list_kinds` | src/memorymap/core/docview.py:334 |
| `_docx_part` | src/memorymap/core/docview.py:322 |
| `_extract_converted` | src/memorymap/core/docview.py:694 |
| `_read_text_file` | src/memorymap/core/docview.py:591 |
| `docx_has_revisions` | src/memorymap/core/docview.py:355 |
| `docx_to_markdown` | src/memorymap/core/docview.py:367 |
| `editability` | src/memorymap/core/docview.py:613 |
| `extract` | src/memorymap/core/docview.py:665 |
| `html_to_markdown` | src/memorymap/core/docview.py:292 |
| `kind_for` | src/memorymap/core/docview.py:571 |
| `write_text_file` | src/memorymap/core/docview.py:650 |

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
| `Download` | src/memorymap/core/extra_downloads.py:76 |
| `DownloadFailed` | src/memorymap/core/extra_downloads.py:237 |
| `_check_engine` | src/memorymap/core/extra_downloads.py:320 |
| `_fetch` | src/memorymap/core/extra_downloads.py:292 |
| `_is_musl` | src/memorymap/core/extra_downloads.py:123 |
| `_mb` | src/memorymap/core/extra_downloads.py:288 |
| `_open_url` | src/memorymap/core/extra_downloads.py:230 |
| `_unpack` | src/memorymap/core/extra_downloads.py:338 |
| `downloads_for` | src/memorymap/core/extra_downloads.py:140 |
| `effective_url` | src/memorymap/core/extra_downloads.py:222 |
| `folder` | src/memorymap/core/extra_downloads.py:189 |
| `install` | src/memorymap/core/extra_downloads.py:371 |
| `is_installed` | src/memorymap/core/extra_downloads.py:193 |
| `platform_key` | src/memorymap/core/extra_downloads.py:104 |
| `platform_reason` | src/memorymap/core/extra_downloads.py:146 |
| `reason` | src/memorymap/core/extra_downloads.py:282 |
| `root_dir` | src/memorymap/core/extra_downloads.py:181 |
| `source` | src/memorymap/core/extra_downloads.py:206 |
| `uninstall` | src/memorymap/core/extra_downloads.py:412 |
| `url_allowed` | src/memorymap/core/extra_downloads.py:162 |

### src/memorymap/core/extras.py (53)

| Name | File:line |
|---|---|
| `BulkState` | src/memorymap/core/extras.py:807 |
| `Bundle` | src/memorymap/core/extras.py:695 |
| `Extra` | src/memorymap/core/extras.py:334 |
| `InstallState` | src/memorymap/core/extras.py:759 |
| `_busy` | src/memorymap/core/extras.py:1502 |
| `_canonical` | src/memorymap/core/extras.py:1058 |
| `_claim` | src/memorymap/core/extras.py:1490 |
| `_constraints_copy` | src/memorymap/core/extras.py:1232 |
| `_dispatch` | src/memorymap/core/extras.py:1508 |
| `_finish_bulk` | src/memorymap/core/extras.py:1729 |
| `_forget_footprints` | src/memorymap/core/extras.py:968 |
| `_frozen_target_args` | src/memorymap/core/extras.py:258 |
| `_install_refusal` | src/memorymap/core/extras.py:1564 |
| `_installed_snapshot` | src/memorymap/core/extras.py:1250 |
| `_interpreter_behind` | src/memorymap/core/extras.py:194 |
| `_loaded_in_process_reason` | src/memorymap/core/extras.py:1765 |
| `_pip_base_command` | src/memorymap/core/extras.py:315 |
| `_pip_platforms` | src/memorymap/core/extras.py:279 |
| `_pip_reason` | src/memorymap/core/extras.py:101 |
| `_python_candidates` | src/memorymap/core/extras.py:170 |
| `_read_footprint` | src/memorymap/core/extras.py:938 |
| `_remove_from_frozen_target` | src/memorymap/core/extras.py:1063 |
| `_requirement_name` | src/memorymap/core/extras.py:1052 |
| `_requirements_path` | src/memorymap/core/extras.py:1218 |
| `_roll_back` | src/memorymap/core/extras.py:1261 |
| `_run_bulk` | src/memorymap/core/extras.py:1653 |
| `_run_bulk_item` | src/memorymap/core/extras.py:1683 |
| `_run_download_install` | src/memorymap/core/extras.py:1434 |
| `_run_download_uninstall` | src/memorymap/core/extras.py:1476 |
| `_run_install` | src/memorymap/core/extras.py:1293 |
| `_run_single` | src/memorymap/core/extras.py:1529 |
| `_run_uninstall` | src/memorymap/core/extras.py:1130 |
| `_status_row` | src/memorymap/core/extras.py:885 |
| `activate_frozen_extras` | src/memorymap/core/extras.py:244 |
| `bulk` | src/memorymap/core/extras.py:987 |
| `bulk_label` | src/memorymap/core/extras.py:1647 |
| `bulk_status` | src/memorymap/core/extras.py:972 |
| `bundles` | src/memorymap/core/extras.py:907 |
| `cancel` | src/memorymap/core/extras.py:1006 |
| `current` | src/memorymap/core/extras.py:1002 |
| `download_mb` | src/memorymap/core/extras.py:681 |
| `download_ready` | src/memorymap/core/extras.py:1842 |
| `find_system_python` | src/memorymap/core/extras.py:132 |
| `footprint` | src/memorymap/core/extras.py:915 |
| `frozen_extras_dir` | src/memorymap/core/extras.py:222 |
| `install_blocking` | src/memorymap/core/extras.py:1815 |
| `is_installed` | src/memorymap/core/extras.py:838 |
| `remove` | src/memorymap/core/extras.py:1577 |
| `reset_for_tests` | src/memorymap/core/extras.py:1806 |
| `start` | src/memorymap/core/extras.py:1536 |
| `start_bulk` | src/memorymap/core/extras.py:1599 |
| `status` | src/memorymap/core/extras.py:866 |
| `unavailable_reason` | src/memorymap/core/extras.py:991 |

### src/memorymap/core/filejobs.py (2)

| Name | File:line |
|---|---|
| `reading` | src/memorymap/core/filejobs.py:51 |
| `running` | src/memorymap/core/filejobs.py:77 |

### src/memorymap/core/filetypes.py (4)

| Name | File:line |
|---|---|
| `FileType` | src/memorymap/core/filetypes.py:33 |
| `as_dicts` | src/memorymap/core/filetypes.py:139 |
| `get` | src/memorymap/core/filetypes.py:134 |
| `normalise` | src/memorymap/core/filetypes.py:116 |

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
| `Run` | src/memorymap/core/jobruns.py:155 |
| `_clip` | src/memorymap/core/jobruns.py:82 |
| `_database` | src/memorymap/core/jobruns.py:115 |
| `_failure_reason` | src/memorymap/core/jobruns.py:87 |
| `begin` | src/memorymap/core/jobruns.py:324 |
| `current` | src/memorymap/core/jobruns.py:143 |
| `describe_night_pass` | src/memorymap/core/jobruns.py:450 |
| `job_run` | src/memorymap/core/jobruns.py:334 |
| `last_runs` | src/memorymap/core/jobruns.py:408 |
| `live` | src/memorymap/core/jobruns.py:136 |
| `mark_interrupted` | src/memorymap/core/jobruns.py:381 |
| `note_finished` | src/memorymap/core/jobruns.py:353 |
| `peek_database` | src/memorymap/core/jobruns.py:119 |
| `set_database_source` | src/memorymap/core/jobruns.py:108 |

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

### src/memorymap/core/ocr.py (33)

| Name | File:line |
|---|---|
| `_adopt_tesseract` | src/memorymap/core/ocr.py:136 |
| `_image_size` | src/memorymap/core/ocr.py:467 |
| `_language_kwargs` | src/memorymap/core/ocr.py:324 |
| `_log_binary_missing` | src/memorymap/core/ocr.py:634 |
| `_log_package_missing` | src/memorymap/core/ocr.py:648 |
| `_one_thread_for_tesseract` | src/memorymap/core/ocr.py:619 |
| `_probe_windows_tesseract` | src/memorymap/core/ocr.py:107 |
| `_rapidocr_lines` | src/memorymap/core/ocr.py:425 |
| `_rapidocr_reader` | src/memorymap/core/ocr.py:411 |
| `_rapidocr_regions` | src/memorymap/core/ocr.py:490 |
| `_rapidocr_text` | src/memorymap/core/ocr.py:462 |
| `_reading_block_kind` | src/memorymap/core/ocr.py:883 |
| `_registry_tesseract_dir` | src/memorymap/core/ocr.py:75 |
| `attempt_binary_install` | src/memorymap/core/ocr.py:1012 |
| `clear_language_cache` | src/memorymap/core/ocr.py:251 |
| `effective_language` | src/memorymap/core/ocr.py:311 |
| `engine` | src/memorymap/core/ocr.py:378 |
| `engine_name` | src/memorymap/core/ocr.py:396 |
| `engine_status` | src/memorymap/core/ocr.py:556 |
| `extract_and_store` | src/memorymap/core/ocr.py:921 |
| `extract_in_background` | src/memorymap/core/ocr.py:970 |
| `extract_regions` | src/memorymap/core/ocr.py:712 |
| `extract_text` | src/memorymap/core/ocr.py:657 |
| `installed_languages` | src/memorymap/core/ocr.py:213 |
| `local_available` | src/memorymap/core/ocr.py:404 |
| `packages_available` | src/memorymap/core/ocr.py:331 |
| `rapidocr_available` | src/memorymap/core/ocr.py:361 |
| `regions_from_reading` | src/memorymap/core/ocr.py:835 |
| `saved_language` | src/memorymap/core/ocr.py:280 |
| `set_language` | src/memorymap/core/ocr.py:290 |
| `tesseract_available` | src/memorymap/core/ocr.py:165 |
| `tesseract_version` | src/memorymap/core/ocr.py:257 |
| `unavailable_reason` | src/memorymap/core/ocr.py:602 |

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

### src/memorymap/core/readings.py (4)

| Name | File:line |
|---|---|
| `_columns` | src/memorymap/core/readings.py:35 |
| `ensure_view` | src/memorymap/core/readings.py:63 |
| `for_file` | src/memorymap/core/readings.py:77 |
| `text_of` | src/memorymap/core/readings.py:96 |

### src/memorymap/core/security.py (24)

| Name | File:line |
|---|---|
| `BodyCapMiddleware` | src/memorymap/core/security.py:190 |
| `CspForPage` | src/memorymap/core/security.py:507 |
| `HostCheckMiddleware` | src/memorymap/core/security.py:93 |
| `OriginCheckMiddleware` | src/memorymap/core/security.py:303 |
| `SecurityHeadersMiddleware` | src/memorymap/core/security.py:555 |
| `UnsafeUrl` | src/memorymap/core/security.py:836 |
| `_BodyTooLarge` | src/memorymap/core/security.py:181 |
| `_backend_addresses` | src/memorymap/core/security.py:650 |
| `_body_limit` | src/memorymap/core/security.py:260 |
| `_is_same_site` | src/memorymap/core/security.py:58 |
| `_notebook_has_password` | src/memorymap/core/security.py:291 |
| `_origin_of` | src/memorymap/core/security.py:44 |
| `_refuses` | src/memorymap/core/security.py:714 |
| `_resolve` | src/memorymap/core/security.py:642 |
| `_session_is_live` | src/memorymap/core/security.py:286 |
| `_too_large` | src/memorymap/core/security.py:252 |
| `assert_public_url` | src/memorymap/core/security.py:897 |
| `build_csp` | src/memorymap/core/security.py:437 |
| `check_backend_url` | src/memorymap/core/security.py:744 |
| `inline_script_hashes` | src/memorymap/core/security.py:413 |
| `is_internal_address` | src/memorymap/core/security.py:840 |
| `public_addresses` | src/memorymap/core/security.py:864 |
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

### src/memorymap/entry/app_import.py (19)

| Name | File:line |
|---|---|
| `Imported` | src/memorymap/entry/app_import.py:69 |
| `ReadResult` | src/memorymap/entry/app_import.py:81 |
| `TooBig` | src/memorymap/entry/app_import.py:86 |
| `_enex_time` | src/memorymap/entry/app_import.py:263 |
| `_enml` | src/memorymap/entry/app_import.py:273 |
| `_html_body` | src/memorymap/entry/app_import.py:159 |
| `_notion_links` | src/memorymap/entry/app_import.py:176 |
| `_notion_name` | src/memorymap/entry/app_import.py:168 |
| `_text` | src/memorymap/entry/app_import.py:131 |
| `_title_from_body` | src/memorymap/entry/app_import.py:140 |
| `_with_title` | src/memorymap/entry/app_import.py:148 |
| `expand` | src/memorymap/entry/app_import.py:93 |
| `read` | src/memorymap/entry/app_import.py:348 |
| `read_apple` | src/memorymap/entry/app_import.py:328 |
| `read_evernote` | src/memorymap/entry/app_import.py:289 |
| `read_notion` | src/memorymap/entry/app_import.py:190 |
| `read_obsidian` | src/memorymap/entry/app_import.py:227 |
| `source_key` | src/memorymap/entry/app_import.py:369 |
| `write` | src/memorymap/entry/app_import.py:374 |

### src/memorymap/entry/bin.py (6)

| Name | File:line |
|---|---|
| `_purge` | src/memorymap/entry/bin.py:96 |
| `binned` | src/memorymap/entry/bin.py:78 |
| `empty` | src/memorymap/entry/bin.py:104 |
| `including_binned` | src/memorymap/entry/bin.py:43 |
| `purge_document` | src/memorymap/entry/bin.py:56 |
| `purge_expired` | src/memorymap/entry/bin.py:115 |

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

### src/memorymap/entry/highlights.py (2)

| Name | File:line |
|---|---|
| `has_highlight` | src/memorymap/entry/highlights.py:25 |
| `passages` | src/memorymap/entry/highlights.py:29 |

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
| `_TagCache` | src/memorymap/entry/manager.py:1497 |
| `_board_type_of` | src/memorymap/entry/manager.py:1036 |
| `_deduce_reason` | src/memorymap/entry/manager.py:1771 |
| `_encrypt_history` | src/memorymap/entry/manager.py:2813 |
| `_ensure_tag_cache_reset_registered` | src/memorymap/entry/manager.py:1537 |
| `_first_content_line` | src/memorymap/entry/manager.py:2673 |
| `_hard_delete` | src/memorymap/entry/manager.py:1070 |
| `_heading_text` | src/memorymap/entry/manager.py:2552 |
| `_ids_in` | src/memorymap/entry/manager.py:2974 |
| `_json_list` | src/memorymap/entry/manager.py:2988 |
| `_links_of` | src/memorymap/entry/manager.py:2844 |
| `_list_entries_filter` | src/memorymap/entry/manager.py:312 |
| `_md_links` | src/memorymap/entry/manager.py:2576 |
| `_quotes` | src/memorymap/entry/manager.py:2970 |
| `_reassign` | src/memorymap/entry/manager.py:2481 |
| `_redact_answers_quoting` | src/memorymap/entry/manager.py:2996 |
| `_redact_link_audit` | src/memorymap/entry/manager.py:1883 |
| `_restale_category_vectors` | src/memorymap/entry/manager.py:2394 |
| `_retag` | src/memorymap/entry/manager.py:1623 |
| `_retag_entry` | src/memorymap/entry/manager.py:1602 |
| `_seal_link_reasons` | src/memorymap/entry/manager.py:2854 |
| `_seal_props` | src/memorymap/entry/manager.py:1854 |
| `_seal_reason` | src/memorymap/entry/manager.py:1827 |
| `_set_stored_props` | src/memorymap/entry/manager.py:1866 |
| `_set_stored_reason` | src/memorymap/entry/manager.py:1841 |
| `_shares_a_date` | src/memorymap/entry/manager.py:1742 |
| `_split_block` | src/memorymap/entry/manager.py:2682 |
| `_tag_fingerprint` | src/memorymap/entry/manager.py:1515 |
| `_touches_private` | src/memorymap/entry/manager.py:1874 |
| `_unseal_link_reasons` | src/memorymap/entry/manager.py:2873 |
| `_update_entry_fields` | src/memorymap/entry/manager.py:612 |
| `_wiki_name_pattern` | src/memorymap/entry/manager.py:3343 |
| `_word_runs` | src/memorymap/entry/manager.py:2965 |
| `add_attachment` | src/memorymap/entry/manager.py:1335 |
| `all_categories` | src/memorymap/entry/manager.py:2344 |
| `all_tags` | src/memorymap/entry/manager.py:1562 |
| `apply_audited_reason` | src/memorymap/entry/manager.py:2249 |
| `apply_title` | src/memorymap/entry/manager.py:2691 |
| `archive_entry` | src/memorymap/entry/manager.py:979 |
| `attachments_for` | src/memorymap/entry/manager.py:1357 |
| `attachments_for_entries_bulk` | src/memorymap/entry/manager.py:1367 |
| `backfill_link_reasons` | src/memorymap/entry/manager.py:2051 |
| `board_type_of` | src/memorymap/entry/manager.py:1009 |
| `bulk_category_names` | src/memorymap/entry/manager.py:2314 |
| `came_from_outside` | src/memorymap/entry/manager.py:2492 |
| `category_name_for` | src/memorymap/entry/manager.py:2306 |
| `category_space` | src/memorymap/entry/manager.py:124 |
| `content_for_entry` | src/memorymap/entry/manager.py:2797 |
| `count_archived_entries` | src/memorymap/entry/manager.py:493 |
| `count_deleted_entries` | src/memorymap/entry/manager.py:470 |
| `count_entries` | src/memorymap/entry/manager.py:386 |
| `create_entry` | src/memorymap/entry/manager.py:258 |
| `create_link` | src/memorymap/entry/manager.py:1918 |
| `delete_attachment` | src/memorymap/entry/manager.py:1392 |
| `delete_category` | src/memorymap/entry/manager.py:2457 |
| `delete_link` | src/memorymap/entry/manager.py:2271 |
| `delete_tag` | src/memorymap/entry/manager.py:1687 |
| `document_came_from_outside` | src/memorymap/entry/manager.py:2505 |
| `documents_for_entries_bulk` | src/memorymap/entry/manager.py:865 |
| `documents_for_entry` | src/memorymap/entry/manager.py:851 |
| `edit_tags_on_notes` | src/memorymap/entry/manager.py:1692 |
| `empty_recycle_bin` | src/memorymap/entry/manager.py:1286 |
| `entries_for_document` | src/memorymap/entry/manager.py:929 |
| `entry_dates` | src/memorymap/entry/manager.py:665 |
| `entry_dates_bulk` | src/memorymap/entry/manager.py:676 |
| `entry_id_scope` | src/memorymap/entry/manager.py:403 |
| `entry_space` | src/memorymap/entry/manager.py:143 |
| `entry_tags` | src/memorymap/entry/manager.py:2336 |
| `extract_title` | src/memorymap/entry/manager.py:2654 |
| `find_by_wiki_name` | src/memorymap/entry/manager.py:3201 |
| `forget_relation_types` | src/memorymap/entry/manager.py:2170 |
| `get_entry` | src/memorymap/entry/manager.py:501 |
| `get_or_create_category` | src/memorymap/entry/manager.py:148 |
| `is_link_type` | src/memorymap/entry/manager.py:2174 |
| `is_two_way_link` | src/memorymap/entry/manager.py:2219 |
| `join_blocks` | src/memorymap/entry/manager.py:2749 |
| `link_document` | src/memorymap/entry/manager.py:809 |
| `links_for_entries_bulk` | src/memorymap/entry/manager.py:888 |
| `links_for_entry` | src/memorymap/entry/manager.py:2283 |
| `list_archived_entries` | src/memorymap/entry/manager.py:476 |
| `list_deleted_entries` | src/memorymap/entry/manager.py:456 |
| `list_entries` | src/memorymap/entry/manager.py:335 |
| `list_sort_key` | src/memorymap/entry/manager.py:381 |
| `log_action` | src/memorymap/entry/manager.py:91 |
| `mark_edited` | src/memorymap/entry/manager.py:213 |
| `most_accessed_entries` | src/memorymap/entry/manager.py:439 |
| `plain_label` | src/memorymap/entry/manager.py:2609 |
| `purge_entries` | src/memorymap/entry/manager.py:1252 |
| `purge_expired_deleted` | src/memorymap/entry/manager.py:1304 |
| `readable_content` | src/memorymap/entry/manager.py:2531 |
| `record_dates` | src/memorymap/entry/manager.py:735 |
| `record_filing` | src/memorymap/entry/manager.py:530 |
| `record_revision` | src/memorymap/entry/manager.py:3472 |
| `reindex_properties` | src/memorymap/entry/manager.py:700 |
| `rekey_private_extras` | src/memorymap/entry/manager.py:2886 |
| `relation_label` | src/memorymap/entry/manager.py:2181 |
| `relation_types` | src/memorymap/entry/manager.py:2135 |
| `remove_link` | src/memorymap/entry/manager.py:2086 |
| `remove_tags` | src/memorymap/entry/manager.py:1678 |
| `remove_title` | src/memorymap/entry/manager.py:2707 |
| `rename_attachment` | src/memorymap/entry/manager.py:1461 |
| `rename_category` | src/memorymap/entry/manager.py:2414 |
| `rename_tag` | src/memorymap/entry/manager.py:1672 |
| `rename_tags` | src/memorymap/entry/manager.py:1644 |
| `reset_tag_cache` | src/memorymap/entry/manager.py:1531 |
| `resolve_links_to` | src/memorymap/entry/manager.py:3285 |
| `restore_entry` | src/memorymap/entry/manager.py:961 |
| `review_queue_count` | src/memorymap/entry/manager.py:66 |
| `revisions_for` | src/memorymap/entry/manager.py:3509 |
| `rewrite_wiki_name` | src/memorymap/entry/manager.py:3364 |
| `scrub_private_leftovers` | src/memorymap/entry/manager.py:3128 |
| `seal_private_events` | src/memorymap/entry/manager.py:1047 |
| `seed_example_notes` | src/memorymap/entry/manager.py:3436 |
| `set_category` | src/memorymap/entry/manager.py:226 |
| `set_link_props` | src/memorymap/entry/manager.py:2193 |
| `set_link_reason` | src/memorymap/entry/manager.py:2113 |
| `set_link_two_way` | src/memorymap/entry/manager.py:2204 |
| `set_link_type` | src/memorymap/entry/manager.py:2229 |
| `set_private` | src/memorymap/entry/manager.py:3054 |
| `soft_delete_entry` | src/memorymap/entry/manager.py:943 |
| `strip_inline_markdown` | src/memorymap/entry/manager.py:2787 |
| `sync_wiki_links` | src/memorymap/entry/manager.py:3309 |
| `tags_from_json` | src/memorymap/entry/manager.py:2325 |
| `unarchive_entry` | src/memorymap/entry/manager.py:996 |
| `undo_tag_edit` | src/memorymap/entry/manager.py:1715 |
| `unlink_document` | src/memorymap/entry/manager.py:832 |
| `update_entry` | src/memorymap/entry/manager.py:561 |
| `validate_attachment_filename` | src/memorymap/entry/manager.py:1420 |
| `wiki_holders` | src/memorymap/entry/manager.py:3348 |
| `wiki_link_targets` | src/memorymap/entry/manager.py:3187 |
| `wiki_opening` | src/memorymap/entry/manager.py:3276 |
| `wiki_plain` | src/memorymap/entry/manager.py:3182 |
| `wiki_shown` | src/memorymap/entry/manager.py:3176 |
| `wiki_target` | src/memorymap/entry/manager.py:3165 |

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

### src/memorymap/entry/tidy.py (49)

| Name | File:line |
|---|---|
| `Review` | src/memorymap/entry/tidy.py:74 |
| `_actor_words` | src/memorymap/entry/tidy.py:300 |
| `_apply_bin` | src/memorymap/entry/tidy.py:616 |
| `_apply_done` | src/memorymap/entry/tidy.py:627 |
| `_apply_link_reasons` | src/memorymap/entry/tidy.py:527 |
| `_apply_merge_notes` | src/memorymap/entry/tidy.py:589 |
| `_apply_merge_tags` | src/memorymap/entry/tidy.py:563 |
| `_apply_move` | src/memorymap/entry/tidy.py:578 |
| `_apply_remove_tags` | src/memorymap/entry/tidy.py:553 |
| `_apply_unlink` | src/memorymap/entry/tidy.py:538 |
| `_auto_added` | src/memorymap/entry/tidy.py:270 |
| `_count_duplicates` | src/memorymap/entry/tidy.py:490 |
| `_count_uncategorised` | src/memorymap/entry/tidy.py:394 |
| `_generic_links` | src/memorymap/entry/tidy.py:222 |
| `_id_number` | src/memorymap/entry/tidy.py:523 |
| `_live_entries` | src/memorymap/entry/tidy.py:203 |
| `_log` | src/memorymap/entry/tidy.py:664 |
| `_percent` | src/memorymap/entry/tidy.py:214 |
| `_row` | src/memorymap/entry/tidy.py:218 |
| `_rows_auto_tags` | src/memorymap/entry/tidy.py:310 |
| `_rows_duplicates` | src/memorymap/entry/tidy.py:407 |
| `_rows_link_reasons` | src/memorymap/entry/tidy.py:244 |
| `_rows_lookalike_tags` | src/memorymap/entry/tidy.py:361 |
| `_rows_rare_tags` | src/memorymap/entry/tidy.py:351 |
| `_rows_short_notes` | src/memorymap/entry/tidy.py:425 |
| `_rows_stale_reminders` | src/memorymap/entry/tidy.py:448 |
| `_rows_uncategorised` | src/memorymap/entry/tidy.py:377 |
| `_rows_weak_links` | src/memorymap/entry/tidy.py:260 |
| `_strength_detail` | src/memorymap/entry/tidy.py:236 |
| `_tag_counts` | src/memorymap/entry/tidy.py:341 |
| `_tags` | src/memorymap/entry/tidy.py:193 |
| `_title` | src/memorymap/entry/tidy.py:197 |
| `_touched_entry_ids` | src/memorymap/entry/tidy.py:672 |
| `_undo_payload` | src/memorymap/entry/tidy.py:720 |
| `apply` | src/memorymap/entry/tidy.py:693 |
| `auto_settings` | src/memorymap/entry/tidy.py:811 |
| `history` | src/memorymap/entry/tidy.py:786 |
| `is_running` | src/memorymap/entry/tidy.py:894 |
| `is_short` | src/memorymap/entry/tidy.py:171 |
| `lookalike_groups` | src/memorymap/entry/tidy.py:157 |
| `lookalike_key` | src/memorymap/entry/tidy.py:145 |
| `request_stop` | src/memorymap/entry/tidy.py:887 |
| `respecify_all` | src/memorymap/entry/tidy.py:898 |
| `rows` | src/memorymap/entry/tidy.py:510 |
| `run_automatic` | src/memorymap/entry/tidy.py:854 |
| `set_auto` | src/memorymap/entry/tidy.py:816 |
| `summary` | src/memorymap/entry/tidy.py:828 |
| `tag_fit` | src/memorymap/entry/tidy.py:180 |
| `undo` | src/memorymap/entry/tidy.py:767 |

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
| `_cosine_scores` | src/memorymap/search/engine.py:1328 |
| `_explain` | src/memorymap/search/engine.py:921 |
| `_filter_only` | src/memorymap/search/engine.py:790 |
| `_flag_filters` | src/memorymap/search/engine.py:980 |
| `_forget` | src/memorymap/search/engine.py:616 |
| `_forget_from` | src/memorymap/search/engine.py:625 |
| `_has_attachment_ids` | src/memorymap/search/engine.py:987 |
| `_has_ids` | src/memorymap/search/engine.py:1017 |
| `_hops_from` | src/memorymap/search/engine.py:861 |
| `_keep_matrix_in_step` | src/memorymap/search/engine.py:529 |
| `_keyword_pass` | src/memorymap/search/engine.py:835 |
| `_live_matrix` | src/memorymap/search/engine.py:514 |
| `_load_all_vectors` | src/memorymap/search/engine.py:274 |
| `_match_expression` | src/memorymap/search/engine.py:672 |
| `_matrix_key` | src/memorymap/search/engine.py:244 |
| `_mentions` | src/memorymap/search/engine.py:827 |
| `_normalised_bm25` | src/memorymap/search/engine.py:905 |
| `_put` | src/memorymap/search/engine.py:570 |
| `_reconcile` | src/memorymap/search/engine.py:425 |
| `_remember` | src/memorymap/search/engine.py:551 |
| `_row_has` | src/memorymap/search/engine.py:1053 |
| `_row_ids` | src/memorymap/search/engine.py:264 |
| `_session_space` | src/memorymap/search/engine.py:731 |
| `_snippet` | src/memorymap/search/engine.py:960 |
| `_space_clause` | src/memorymap/search/engine.py:711 |
| `_table_fingerprint` | src/memorymap/search/engine.py:249 |
| `_unit` | src/memorymap/search/engine.py:335 |
| `_with_meaning` | src/memorymap/search/engine.py:1235 |
| `cached_similar_pairs` | src/memorymap/search/engine.py:1442 |
| `current_matrix` | src/memorymap/search/engine.py:364 |
| `forget_vector` | src/memorymap/search/engine.py:602 |
| `index_counts` | src/memorymap/search/engine.py:667 |
| `related` | src/memorymap/search/engine.py:1372 |
| `rows_for` | src/memorymap/search/engine.py:399 |
| `search` | src/memorymap/search/engine.py:1077 |
| `stats` | src/memorymap/search/engine.py:1488 |
| `vector_view` | src/memorymap/search/engine.py:471 |
| `vectors_by_id` | src/memorymap/search/engine.py:1396 |
| `warm_vectors` | src/memorymap/search/engine.py:342 |

### src/memorymap/search/index.py (32)

| Name | File:line |
|---|---|
| `Row` | src/memorymap/search/index.py:118 |
| `Source` | src/memorymap/search/index.py:135 |
| `UnknownSource` | src/memorymap/search/index.py:156 |
| `_attachment_row` | src/memorymap/search/index.py:772 |
| `_board_words` | src/memorymap/search/index.py:569 |
| `_boards_touched_by_objects` | src/memorymap/search/index.py:327 |
| `_bookmark_row` | src/memorymap/search/index.py:809 |
| `_document_row` | src/memorymap/search/index.py:757 |
| `_entry_kind` | src/memorymap/search/index.py:549 |
| `_entry_row` | src/memorymap/search/index.py:599 |
| `_first_line` | src/memorymap/search/index.py:523 |
| `_index_on_flush` | src/memorymap/search/index.py:281 |
| `_media_row` | src/memorymap/search/index.py:794 |
| `_register_all` | src/memorymap/search/index.py:651 |
| `_reminder_row` | src/memorymap/search/index.py:823 |
| `_rowid` | src/memorymap/search/index.py:226 |
| `_scan_entries` | src/memorymap/search/index.py:637 |
| `_table_missing` | src/memorymap/search/index.py:262 |
| `_tagstext` | src/memorymap/search/index.py:533 |
| `_write` | src/memorymap/search/index.py:230 |
| `_written` | src/memorymap/search/index.py:541 |
| `counts` | src/memorymap/search/index.py:502 |
| `ensure_table` | src/memorymap/search/index.py:205 |
| `forget` | src/memorymap/search/index.py:429 |
| `last_rebuild` | src/memorymap/search/index.py:467 |
| `rebuild` | src/memorymap/search/index.py:471 |
| `reconcile_boards` | src/memorymap/search/index.py:373 |
| `register` | src/memorymap/search/index.py:160 |
| `source_for` | src/memorymap/search/index.py:177 |
| `sources` | src/memorymap/search/index.py:194 |
| `sources_for_kind` | src/memorymap/search/index.py:198 |
| `touch` | src/memorymap/search/index.py:413 |

### src/memorymap/search/query.py (15)

| Name | File:line |
|---|---|
| `Understood` | src/memorymap/search/query.py:50 |
| `_count` | src/memorymap/search/query.py:145 |
| `_empty_filters` | src/memorymap/search/query.py:45 |
| `_has_content` | src/memorymap/search/query.py:532 |
| `_month_end` | src/memorymap/search/query.py:517 |
| `_parse_date_operator` | src/memorymap/search/query.py:343 |
| `_parse_operators` | src/memorymap/search/query.py:372 |
| `_range_for` | src/memorymap/search/query.py:156 |
| `_split_values` | src/memorymap/search/query.py:362 |
| `_strip_scaffolding` | src/memorymap/search/query.py:274 |
| `_strip_trailing_scaffold` | src/memorymap/search/query.py:260 |
| `_tidy` | src/memorymap/search/query.py:209 |
| `_widen` | src/memorymap/search/query.py:492 |
| `search_terms` | src/memorymap/search/query.py:560 |
| `understand` | src/memorymap/search/query.py:422 |

### src/memorymap/search/search_manager.py (32)

| Name | File:line |
|---|---|
| `Retrieval` | src/memorymap/search/search_manager.py:832 |
| `_category_notes` | src/memorymap/search/search_manager.py:1037 |
| `_category_only` | src/memorymap/search/search_manager.py:1031 |
| `_corrected_terms` | src/memorymap/search/search_manager.py:210 |
| `_fuse` | src/memorymap/search/search_manager.py:612 |
| `_learned_order` | src/memorymap/search/search_manager.py:1270 |
| `_linked_neighbours` | src/memorymap/search/search_manager.py:651 |
| `_meaningful_terms` | src/memorymap/search/search_manager.py:260 |
| `_named_category` | src/memorymap/search/search_manager.py:997 |
| `_rank` | src/memorymap/search/search_manager.py:921 |
| `_rank_inner` | src/memorymap/search/search_manager.py:934 |
| `_recency_pin_ranking` | src/memorymap/search/search_manager.py:586 |
| `_retrieve` | src/memorymap/search/search_manager.py:1053 |
| `_score_from_matrix` | src/memorymap/search/search_manager.py:453 |
| `_score_from_table` | src/memorymap/search/search_manager.py:492 |
| `_user_today` | src/memorymap/search/search_manager.py:43 |
| `_within` | src/memorymap/search/search_manager.py:816 |
| `_without_private` | src/memorymap/search/search_manager.py:1324 |
| `_written_at` | src/memorymap/search/search_manager.py:808 |
| `configured_thresholds` | src/memorymap/search/search_manager.py:265 |
| `graph_expansion` | src/memorymap/search/search_manager.py:716 |
| `in_range` | src/memorymap/search/search_manager.py:781 |
| `is_recency_ask` | src/memorymap/search/search_manager.py:974 |
| `keyword_search` | src/memorymap/search/search_manager.py:93 |
| `last_search` | src/memorymap/search/search_manager.py:916 |
| `note_search_mode` | src/memorymap/search/search_manager.py:929 |
| `query_vector` | src/memorymap/search/search_manager.py:292 |
| `recent_entries` | src/memorymap/search/search_manager.py:78 |
| `retrieve` | src/memorymap/search/search_manager.py:886 |
| `retrieve_detailed` | src/memorymap/search/search_manager.py:863 |
| `semantic_search` | src/memorymap/search/search_manager.py:349 |
| `warm` | src/memorymap/search/search_manager.py:309 |

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

## Tests (8562)

`def test_` lines in each `tests/test_*.py`.

| File | Tests |
|---|---|
| tests/test_a11y_wcag22.py | 12 |
| tests/test_accent_text.py | 3 |
| tests/test_account.py | 16 |
| tests/test_activity_undo_row.py | 4 |
| tests/test_agent_context.py | 7 |
| tests/test_agent_followthrough.py | 7 |
| tests/test_agent_link_types.py | 8 |
| tests/test_agent_plan.py | 13 |
| tests/test_agent_recovery.py | 14 |
| tests/test_agent_small_model.py | 15 |
| tests/test_agent_tools_api.py | 40 |
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
| tests/test_asset_strip.py | 19 |
| tests/test_atlas_breath_687.py | 4 |
| tests/test_atlas_shape.py | 51 |
| tests/test_atlas_suggest_shape.py | 2 |
| tests/test_atlas_wisps_pose.py | 3 |
| tests/test_atomic_io_windows.py | 2 |
| tests/test_attachment_cards.py | 14 |
| tests/test_attachment_rename_route.py | 4 |
| tests/test_audit_export.py | 9 |
| tests/test_auth_hardening_1005.py | 16 |
| tests/test_auth_headers_space.py | 3 |
| tests/test_autonomous.py | 27 |
| tests/test_autonomous_state_isolation.py | 4 |
| tests/test_backend_switch_keeps_embeddings.py | 2 |
| tests/test_backend_url_safety.py | 23 |
| tests/test_background_filing.py | 19 |
| tests/test_background_filing_cost.py | 2 |
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
| tests/test_board_background.py | 5 |
| tests/test_board_duplicate.py | 5 |
| tests/test_board_history.py | 11 |
| tests/test_board_kind_switch.py | 5 |
| tests/test_board_library.py | 19 |
| tests/test_board_pan_layers.py | 2 |
| tests/test_board_preview.py | 14 |
| tests/test_board_sidebar_596.py | 6 |
| tests/test_board_templates_715.py | 11 |
| tests/test_bookmarks_api.py | 15 |
| tests/test_bookmarks_library.py | 3 |
| tests/test_bookmarks_said_once.py | 1 |
| tests/test_boot_budget.py | 4 |
| tests/test_boot_has_no_p5_or_d3.py | 5 |
| tests/test_breakpoints.py | 3 |
| tests/test_captioning.py | 16 |
| tests/test_capture_draft_blank.py | 2 |
| tests/test_capture_strip_first_paint.py | 3 |
| tests/test_catalogue_reveal.py | 7 |
| tests/test_categories_api.py | 9 |
| tests/test_category_colour.py | 16 |
| tests/test_category_manage.py | 7 |
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
| tests/test_chat_intent.py | 12 |
| tests/test_chat_live_citations.py | 2 |
| tests/test_chat_metadata.py | 10 |
| tests/test_chat_organisation.py | 15 |
| tests/test_chat_persona_marks.py | 5 |
| tests/test_chat_resume_controls.py | 6 |
| tests/test_chat_scroll_534.py | 4 |
| tests/test_chat_transcript.py | 11 |
| tests/test_chat_vision.py | 9 |
| tests/test_cheap_animations.py | 6 |
| tests/test_chip_target.py | 2 |
| tests/test_chunk_vectors.py | 11 |
| tests/test_citation_after_heading.py | 1 |
| tests/test_claimed_work.py | 18 |
| tests/test_clear_app_cache.py | 4 |
| tests/test_client_key_idempotent.py | 2 |
| tests/test_clip_text.py | 1 |
| tests/test_clock_weekday.py | 5 |
| tests/test_code_completion.py | 26 |
| tests/test_code_editing.py | 24 |
| tests/test_code_vscode.py | 23 |
| tests/test_codemap_fresh.py | 1 |
| tests/test_codeql_shapes.py | 2 |
| tests/test_coerce_number_finite.py | 3 |
| tests/test_command_row_shape.py | 3 |
| tests/test_companion_motion.py | 96 |
| tests/test_companion_stacking.py | 4 |
| tests/test_companion_toggle.py | 3 |
| tests/test_composer_688.py | 40 |
| tests/test_composer_725.py | 23 |
| tests/test_composer_741.py | 5 |
| tests/test_composer_brief.py | 13 |
| tests/test_composer_eval_725.py | 6 |
| tests/test_composer_eval_741.py | 6 |
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
| tests/test_conversations_api.py | 32 |
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
| tests/test_db_pragmas_and_indexes.py | 13 |
| tests/test_debug_health.py | 10 |
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
| tests/test_doc_commands.py | 6 |
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
| tests/test_docexport_bundle.py | 8 |
| tests/test_docexport_pictures.py | 8 |
| tests/test_dock_grammar.py | 12 |
| tests/test_dock_help_507.py | 9 |
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
| tests/test_document_revisions.py | 11 |
| tests/test_document_tools.py | 6 |
| tests/test_documents_api.py | 46 |
| tests/test_documents_outline.py | 5 |
| tests/test_docview.py | 27 |
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
| tests/test_engine_phase6_spec.py | 29 |
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
| tests/test_error_toasts.py | 5 |
| tests/test_events.py | 23 |
| tests/test_events_undo.py | 13 |
| tests/test_every_route_is_locked.py | 4 |
| tests/test_evidence_spec.py | 12 |
| tests/test_export_backup_whole.py | 1 |
| tests/test_export_paint.py | 4 |
| tests/test_exports_list.py | 5 |
| tests/test_extract_notes.py | 21 |
| tests/test_extractive_answer.py | 9 |
| tests/test_extras.py | 45 |
| tests/test_extras_bundles.py | 29 |
| tests/test_extras_download.py | 22 |
| tests/test_f7_pool_moves.py | 2 |
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
| tests/test_filetypes.py | 10 |
| tests/test_filing_accuracy.py | 3 |
| tests/test_filing_certainty.py | 18 |
| tests/test_filing_evidence_wired.py | 6 |
| tests/test_filing_standin_watch.py | 1 |
| tests/test_final_pass_bugs.py | 5 |
| tests/test_first_run_472.py | 7 |
| tests/test_flaw_class_lints.py | 2 |
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
| tests/test_graph_first_frame.py | 5 |
| tests/test_graph_fit_balance.py | 3 |
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
| tests/test_harness_evals.py | 3 |
| tests/test_harness_plan_card.py | 9 |
| tests/test_harness_robustness.py | 30 |
| tests/test_harness_tiers.py | 29 |
| tests/test_harness_verifier.py | 44 |
| tests/test_harness_verifier_spec.py | 4 |
| tests/test_has_invalidation.py | 3 |
| tests/test_help_chat.py | 53 |
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
| tests/test_import_directory_roots.py | 7 |
| tests/test_import_idempotent.py | 5 |
| tests/test_import_markdown_links.py | 3 |
| tests/test_import_module_cycles.py | 2 |
| tests/test_import_one_step.py | 5 |
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
| tests/test_library_boards.py | 4 |
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
| tests/test_manual_parity.py | 5 |
| tests/test_map_actions_clear_of_label.py | 1 |
| tests/test_map_add_speed.py | 6 |
| tests/test_map_branch_colour_order.py | 3 |
| tests/test_map_drag_cost.py | 12 |
| tests/test_map_from_headings.py | 4 |
| tests/test_map_from_notes.py | 8 |
| tests/test_map_generation.py | 13 |
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
| tests/test_meetings_644.py | 23 |
| tests/test_memory_stream.py | 22 |
| tests/test_mention_link_names.py | 4 |
| tests/test_menu_keyboard.py | 7 |
| tests/test_menu_toggles.py | 4 |
| tests/test_menu_window_fit.py | 3 |
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
| tests/test_note_meta_line.py | 4 |
| tests/test_note_preview_groups.py | 5 |
| tests/test_note_preview_lines.py | 5 |
| tests/test_note_properties_kg4.py | 10 |
| tests/test_note_surface.py | 6 |
| tests/test_note_surface_readonly.py | 2 |
| tests/test_note_template_picker.py | 5 |
| tests/test_note_types_graph_d5.py | 8 |
| tests/test_notebook_access.py | 21 |
| tests/test_notebook_stats.py | 22 |
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
| tests/test_ocr_region_cache.py | 6 |
| tests/test_ocr_regions.py | 15 |
| tests/test_ocr_workspace_717.py | 17 |
| tests/test_offline_hint.py | 6 |
| tests/test_offline_promise.py | 5 |
| tests/test_ollama_tools_reliability.py | 6 |
| tests/test_one_download_helper.py | 3 |
| tests/test_openapi_gate.py | 3 |
| tests/test_optional_sign_in.py | 22 |
| tests/test_orient_script.py | 2 |
| tests/test_out_of_space.py | 8 |
| tests/test_outbound_fetch_guard.py | 5 |
| tests/test_outbound_inventory.py | 4 |
| tests/test_packaging_spec.py | 13 |
| tests/test_page_captions.py | 12 |
| tests/test_palette_contract.py | 3 |
| tests/test_palette_head_gap.py | 2 |
| tests/test_palette_synonyms.py | 3 |
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
| tests/test_prose_tools.py | 20 |
| tests/test_provider_redirects.py | 4 |
| tests/test_provider_sockets.py | 8 |
| tests/test_providers.py | 70 |
| tests/test_qa_1005_polish.py | 10 |
| tests/test_quadratic_scans.py | 8 |
| tests/test_query_plans.py | 2 |
| tests/test_query_rollups_kg7.py | 4 |
| tests/test_query_understanding.py | 20 |
| tests/test_question_noise.py | 26 |
| tests/test_questions_spec.py | 9 |
| tests/test_quick_access.py | 26 |
| tests/test_raw_fetch_headers.py | 2 |
| tests/test_readings_f10.py | 4 |
| tests/test_readme_freshness.py | 7 |
| tests/test_recency_questions.py | 9 |
| tests/test_recent_questions_surface.py | 5 |
| tests/test_recycle_bin.py | 18 |
| tests/test_reevaluate.py | 4 |
| tests/test_reevaluate_private.py | 3 |
| tests/test_refresh_entries.py | 3 |
| tests/test_regex_whitespace_runs.py | 5 |
| tests/test_region_read.py | 16 |
| tests/test_related_elsewhere.py | 9 |
| tests/test_related_notes.py | 38 |
| tests/test_relation_types_kg3.py | 8 |
| tests/test_relations_kg2.py | 15 |
| tests/test_release_smoke_step.py | 21 |
| tests/test_reminder_audio_deferred.py | 2 |
| tests/test_reminder_snooze_row34.py | 4 |
| tests/test_reminder_targets_row15.py | 5 |
| tests/test_reminder_times.py | 18 |
| tests/test_reminders_api.py | 17 |
| tests/test_reminders_ics.py | 10 |
| tests/test_resurface_spec.py | 14 |
| tests/test_review_queue_17.py | 6 |
| tests/test_ring_room.py | 5 |
| tests/test_round2_sweep_fixes.py | 3 |
| tests/test_router.py | 13 |
| tests/test_rows_676.py | 6 |
| tests/test_run_sandbox.py | 11 |
| tests/test_run_skill.py | 41 |
| tests/test_sampling.py | 17 |
| tests/test_save_cost_flat.py | 4 |
| tests/test_scale_query_counts.py | 9 |
| tests/test_scratchpad_size.py | 1 |
| tests/test_script_paths.py | 6 |
| tests/test_scroll_keys.py | 3 |
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
| tests/test_staged_images.py | 4 |
| tests/test_staleness.py | 8 |
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
| tests/test_style_scale.py | 22 |
| tests/test_subprocess_no_window.py | 2 |
| tests/test_subtab_strip_surface.py | 1 |
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
| tests/test_tag_manager_routes.py | 13 |
| tests/test_tag_normalisation.py | 5 |
| tests/test_tag_vocabulary.py | 6 |
| tests/test_task_checkbox.py | 3 |
| tests/test_task_progress.py | 7 |
| tests/test_tasks.py | 28 |
| tests/test_template_draft.py | 4 |
| tests/test_tensions.py | 14 |
| tests/test_tensions_table_b4.py | 7 |
| tests/test_test_imports.py | 1 |
| tests/test_text_indent.py | 3 |
| tests/test_thinking_and_stream.py | 7 |
| tests/test_thinking_budget.py | 8 |
| tests/test_thinking_words.py | 10 |
| tests/test_thinking_words_rotation.py | 27 |
| tests/test_tidy.py | 25 |
| tests/test_tidy_ui.py | 10 |
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
| tests/test_tour_follow.py | 6 |
| tests/test_tray.py | 18 |
| tests/test_ui_batch_726.py | 8 |
| tests/test_ui_recipes.py | 166 |
| tests/test_ui_signatures.py | 2 |
| tests/test_ui_state.py | 6 |
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
| tests/test_validation_error_shape.py | 2 |
| tests/test_vault_import.py | 7 |
| tests/test_vault_sessions.py | 12 |
| tests/test_vendor_licences.py | 7 |
| tests/test_vendor_manifest.py | 4 |
| tests/test_vendor_utilisation.py | 4 |
| tests/test_vision_ocr.py | 26 |
| tests/test_vision_rows_row11.py | 9 |
| tests/test_voice_api.py | 14 |
| tests/test_wb_anchor_hints_clear.py | 3 |
| tests/test_wb_audit_keys.py | 23 |
| tests/test_wb_clone_grips_follow.py | 6 |
| tests/test_wb_commands.py | 7 |
| tests/test_wb_context_menu_place.py | 4 |
| tests/test_wb_context_pin.py | 1 |
| tests/test_wb_drop_place.py | 13 |
| tests/test_wb_edge_pan.py | 4 |
| tests/test_wb_elbow.py | 13 |
| tests/test_wb_export_inline_images.py | 3 |
| tests/test_wb_export_png.py | 4 |
| tests/test_wb_format.py | 10 |
| tests/test_wb_frame_title_target.py | 2 |
| tests/test_wb_guides.py | 5 |
| tests/test_wb_help_sheet.py | 5 |
| tests/test_wb_interchange.py | 10 |
| tests/test_wb_menu_rows_close.py | 2 |
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
| tests/test_words_review.py | 7 |
| tests/test_worker_guard.py | 6 |
| tests/test_wrapup_0927_visuals.py | 6 |
| tests/test_write_lock_during_passes.py | 3 |
| tests/test_writing_dictionary_persists.py | 4 |
| tests/test_xmind_import.py | 3 |
| tests/test_zoom_wheel_delta.py | 3 |

## Plan headings (934)

Every `##` and `###` heading in `docs/ROADMAP.md` and `docs/roadmap/*.md`, except the HISTORY.md archive. Sorted by heading.

| Heading | File:line |
|---|---|
| 0. Checked in the code, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:1081 |
| 0. Performance and "not device heavy" (cross-cutting, first) | docs/roadmap/PLAN.md:26 |
| 0. The diagnosis in one page | docs/roadmap/WORLD_CLASS_PLAN.md:25 |
| 0. The operating protocol (read every session, it is short) | docs/roadmap/SESSION_BRIEFS.md:17 |
| 1. Decisions made (do not remake) | docs/roadmap/SESSION_BRIEFS.md:975 |
| 1. Format panel, Style tab | docs/roadmap/WHITEBOARD_PLAN.md:977 |
| 1. Live log console (started, not finished) | docs/roadmap/BACKLOG.md:32 |
| 1. Research read, 2026-10-10, and what each changes here | docs/roadmap/CHAT_PLAN.md:1694 |
| 1. The consistency contract (the system under the little things) | docs/roadmap/WORLD_CLASS_PLAN.md:84 |
| 1. The instruction, verbatim | docs/roadmap/DOCUMENTS_PLAN.md:11 |
| 1. The instruction, verbatim | docs/roadmap/MINDMAP_PLAN.md:13 |
| 1. What changed since 2026-09-14 | docs/roadmap/ANALYSIS.md:4244 |
| 1. What exists (checked in the code) | docs/roadmap/CHAT_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/TIMELINE_PLAN.md:11 |
| 1. What exists (checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:12 |
| 1. What exists (checked in the code, not assumed) | docs/roadmap/GRAPH_PLAN.md:14 |
| 1. What it is, its size, its licence, how alive | docs/roadmap/ANALYSIS.md:2284 |
| 1. What the best rule-based and offline assistants do | docs/roadmap/CHAT_PLAN.md:1127 |
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
| 10. Flaws found by static probes (cheap to reproduce, each with its command) | docs/roadmap/WORLD_CLASS_PLAN.md:881 |
| 10. Not verified | docs/roadmap/ANALYSIS.md:4460 |
| 10. Outline, navigation and view | docs/roadmap/WHITEBOARD_PLAN.md:1214 |
| 10. The spelling check: decided 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:712 |
| 10. Timeline tab, and time-aware notes | docs/roadmap/BACKLOG.md:651 |
| 104. Sub-categories, asked about directly, and whether the graph needs a new mechanism to answer it | docs/roadmap/ANALYSIS.md:1001 |
| 109.1 Fixed, and how each was actually proven | docs/roadmap/BACKLOG.md:3447 |
| 109.2 Text highlighting: built | docs/roadmap/BACKLOG.md:3545 |
| 109.3 The competitor gap analysis, triaged | docs/roadmap/BACKLOG.md:3549 |
| 109.4 Brainstormed: not asked for, worth doing | docs/roadmap/BACKLOG.md:3588 |
| 11. Built: the previews, Phase 4 and Phase 5 | docs/roadmap/MINDMAP_PLAN.md:299 |
| 11. Graph | docs/roadmap/PLAN.md:210 |
| 11. Keyboard shortcuts | docs/roadmap/WHITEBOARD_PLAN.md:1229 |
| 11. Performance, accuracy and AI efficiency | docs/roadmap/BACKLOG.md:708 |
| 11. Phase 4 decisions, made 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:789 |
| 11. The week, session by session (Opus/Sonnet), and the quarter | docs/roadmap/WORLD_CLASS_PLAN.md:928 |
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
| 12. Does the AI know it is an agent? | docs/roadmap/BACKLOG.md:956 |
| 12. Library | docs/roadmap/PLAN.md:220 |
| 12. Security review (read, not penetration-tested; each item names the file) | docs/roadmap/WORLD_CLASS_PLAN.md:937 |
| 12. Selection, grouping, containers, swimlanes, tables | docs/roadmap/WHITEBOARD_PLAN.md:1290 |
| 12. The map as its own tool (INBOX 93, the owner's ask, 2026-09-09) | docs/roadmap/MINDMAP_PLAN.md:303 |
| 12. The writing intelligence as one feature: decided 2026-09-13 | docs/roadmap/DOCUMENTS_PLAN.md:844 |
| 12.0 Decisions made (do not remake) | docs/roadmap/MINDMAP_PLAN.md:315 |
| 12.1 Phase 6a, the controls | docs/roadmap/MINDMAP_PLAN.md:466 |
| 12.2 Phase 6b, structure and richness (1 session) | docs/roadmap/MINDMAP_PLAN.md:471 |
| 12.3 Phase 6c, what only a notebook can do (½ session) | docs/roadmap/MINDMAP_PLAN.md:505 |
| 12.4 Not built until asked | docs/roadmap/MINDMAP_PLAN.md:531 |
| 12.5 One place per action (INBOX 200 and 201, the owner, 2026-09-13 night) | docs/roadmap/MINDMAP_PLAN.md:536 |
| 12z Learnability, 2026-10-10 (INBOX 749) | docs/roadmap/UI_MODERNISATION_PLAN.md:1380 |
| 13. Images, math, links and tooltips | docs/roadmap/WHITEBOARD_PLAN.md:1303 |
| 13. Open bugs and gaps from the merged agent reports (with owners) | docs/roadmap/WORLD_CLASS_PLAN.md:987 |
| 13. The map, read against its six complaints: measured 2026-09-21, phases open | docs/roadmap/MINDMAP_PLAN.md:604 |
| 13. Timeline | docs/roadmap/PLAN.md:234 |
| 13. Web search effectiveness | docs/roadmap/BACKLOG.md:999 |
| 13. What a self-contained HTML export is: decided 2026-09-13 | docs/roadmap/DOCUMENTS_PLAN.md:853 |
| 13.1 Is it slow? The one claim measured before anything was designed | docs/roadmap/MINDMAP_PLAN.md:632 |
| 13.1 The principles, each as a rule with a measurement | docs/roadmap/UI_MODERNISATION_PLAN.md:1419 |
| 13.2 Surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:1444 |
| 13.2 The two kinds of connection | docs/roadmap/MINDMAP_PLAN.md:762 |
| 13.3 Decisions, 2026-10-10 (do not re-decide; numbered after Phase 12's 8) | docs/roadmap/UI_MODERNISATION_PLAN.md:1466 |
| 13.3 What the surface offers, and by how many doors | docs/roadmap/MINDMAP_PLAN.md:806 |
| 13.4 Phases with gates | docs/roadmap/UI_MODERNISATION_PLAN.md:1506 |
| 13.4 What can be customised, against what a map tool offers | docs/roadmap/MINDMAP_PLAN.md:843 |
| 13.5 Clean and professional: the same measurements section 17 took | docs/roadmap/MINDMAP_PLAN.md:867 |
| 14. Core nodes, levels and the icon library (INBOX 641, 642; mc1, 2026-10-05) | docs/roadmap/MINDMAP_PLAN.md:1650 |
| 14. Export and import formats | docs/roadmap/WHITEBOARD_PLAN.md:1316 |
| 14. More tools worth adding | docs/roadmap/BACKLOG.md:1082 |
| 14. Reminders | docs/roadmap/PLAN.md:243 |
| 14. The core algorithms, read line by line (2026-09-08) | docs/roadmap/WORLD_CLASS_PLAN.md:1024 |
| 14. What a document daily note is: decided 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:917 |
| 14.1 Measured before anything was designed | docs/roadmap/MINDMAP_PLAN.md:1659 |
| 14.2 What the five apps do, and what is taken | docs/roadmap/MINDMAP_PLAN.md:1663 |
| 14.3 Decisions made (do not remake) | docs/roadmap/MINDMAP_PLAN.md:1678 |
| 14.4 What is open | docs/roadmap/MINDMAP_PLAN.md:1755 |
| 15. Appearance: more of everything | docs/roadmap/BACKLOG.md:1117 |
| 15. Deepened 2026-10-10 (Brief 72a, decision 71) | docs/roadmap/MINDMAP_PLAN.md:1776 |
| 15. Insert menu, shape picker and the sidebar search | docs/roadmap/WHITEBOARD_PLAN.md:1333 |
| 15. Inventions: eight things no notebook does, specified for Opus and Sonnet | docs/roadmap/WORLD_CLASS_PLAN.md:1082 |
| 15. Settings: section by section | docs/roadmap/PLAN.md:252 |
| 15. The code block's own bar, and where it belongs: measured 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:966 |
| 16. Layouts | docs/roadmap/WHITEBOARD_PLAN.md:1344 |
| 16. Sweeping UI quality-of-life | docs/roadmap/BACKLOG.md:1142 |
| 16. The backend, read for structure, silent failure and lag (2026-09-08) | docs/roadmap/WORLD_CLASS_PLAN.md:1416 |
| 16. The engine's three omissions, and the table menu: decided 2026-09-20 | docs/roadmap/DOCUMENTS_PLAN.md:1005 |
| 16. Utilities and overlays | docs/roadmap/PLAN.md:272 |
| 17. Cross-cutting quality bars (apply to every row above) | docs/roadmap/PLAN.md:287 |
| 17. The Format panel with nothing selected, and diagram options | docs/roadmap/WHITEBOARD_PLAN.md:1354 |
| 17. The live view for professional use: measured 2026-09-21, phases open | docs/roadmap/DOCUMENTS_PLAN.md:1083 |
| 17. The original vision, audited (2026-09-09) | docs/roadmap/WORLD_CLASS_PLAN.md:1652 |
| 17. Use cases the app can't serve yet | docs/roadmap/BACKLOG.md:1187 |
| 18. Agent quality | docs/roadmap/BACKLOG.md:1227 |
| 18. Order for Part II (after Part I sprints 1–3) | docs/roadmap/PLAN.md:295 |
| 18. Out of scope, with the reason | docs/roadmap/WHITEBOARD_PLAN.md:1364 |
| 18. The next horizon, written 2026-09-14 at the close of PR 144 | docs/roadmap/WORLD_CLASS_PLAN.md:1748 |
| 18. The slash menus as one system: built 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1250 |
| 19. A board or a map as an object in a note, and a note's reminders: built 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1462 |
| 19. Accessibility audit | docs/roadmap/BACKLOG.md:1265 |
| 19. The architecture and framework review (2026-09-20, INBOX 266) | docs/roadmap/WORLD_CLASS_PLAN.md:1933 |
| 19.1 The one number that matters: 776 MB resident, idle | docs/roadmap/WORLD_CLASS_PLAN.md:1946 |
| 19.2 The frontend is 5.9 MB decoded, and that is mostly fine | docs/roadmap/WORLD_CLASS_PLAN.md:1986 |
| 19.3 SQLite is the right store, and the reasons are not the obvious ones | docs/roadmap/WORLD_CLASS_PLAN.md:2025 |
| 19.4 Idle compute: the assumption did not hold | docs/roadmap/WORLD_CLASS_PLAN.md:2052 |
| 19.5 What the review has not covered yet | docs/roadmap/WORLD_CLASS_PLAN.md:2079 |
| 2. Competitors: what they have that MemoryMap does not (checked, not | docs/roadmap/WORLD_CLASS_PLAN.md:225 |
| 2. Documents: to the level of Obsidian / Typora / iA Writer | docs/roadmap/PLAN.md:61 |
| 2. Done when | docs/roadmap/SESSION_BRIEFS.md:1005 |
| 2. Format panel, Text tab, and the Arrange tab | docs/roadmap/WHITEBOARD_PLAN.md:1010 |
| 2. Packaging and distribution | docs/roadmap/ANALYSIS.md:4274 |
| 2. Quick wins | docs/roadmap/BACKLOG.md:85 |
| 2. Surface by surface, against this app | docs/roadmap/ANALYSIS.md:2328 |
| 2. The capability catalogue without a model | docs/roadmap/CHAT_PLAN.md:1363 |
| 2. The prompt | docs/roadmap/FABLE_BRIEF.md:16 |
| 2. What already exists (checked in the code, not assumed) | docs/roadmap/MINDMAP_PLAN.md:44 |
| 2. What exists (checked in the code, not assumed) | docs/roadmap/DOCUMENTS_PLAN.md:31 |
| 2. Where the layer joins each surface | docs/roadmap/CHAT_PLAN.md:1706 |
| 2. Why it disappoints (from the screenshots, each checked in the code) | docs/roadmap/WHITEBOARD_PLAN.md:28 |
| 2. Why it disappoints (measured against the screenshots) | docs/roadmap/CHAT_PLAN.md:28 |
| 2. Why it disappoints (measured, 48 notes across six months, 1358px) | docs/roadmap/TIMELINE_PLAN.md:24 |
| 2. Why it disappoints: measured and read | docs/roadmap/GRAPH_PLAN.md:27 |
| 20. A model per feature (asked for directly, 2026-09-21) | docs/roadmap/WORLD_CLASS_PLAN.md:2243 |
| 20. Backend | docs/roadmap/BACKLOG.md:1293 |
| 20. The 2026-10-05 feature audit: decisions | docs/roadmap/DOCUMENTS_PLAN.md:1153 |
| 2026-09-08, the third night: read this block first, whoever you are | docs/roadmap/HANDOVER.md:21 |
| 21. Every failure names its way out (INBOX 272 part 1, 2026-09-21) | docs/roadmap/WORLD_CLASS_PLAN.md:2313 |
| 21. Skills: rebuilt; what is left | docs/roadmap/BACKLOG.md:1428 |
| 21. The code editor against VS Code, and writing checks everywhere (INBOX 646) | docs/roadmap/DOCUMENTS_PLAN.md:539 |
| 22. Reported in use, not yet done | docs/roadmap/BACKLOG.md:1503 |
| 22. The professional baseline and the devibecode programme (2026-09-27) | docs/roadmap/WORLD_CLASS_PLAN.md:2326 |
| 22.1 Large gaps (what every professional app has) | docs/roadmap/WORLD_CLASS_PLAN.md:2340 |
| 22.2 Small things people expect (each S, Sonnet unless noted) | docs/roadmap/WORLD_CLASS_PLAN.md:2384 |
| 22.3 Where the design is below standard (measured or seen, 2026-09-27) | docs/roadmap/WORLD_CLASS_PLAN.md:2404 |
| 22.4 The devibecode programme: one surface at a time, every skill | docs/roadmap/WORLD_CLASS_PLAN.md:2419 |
| 22.5 Where the app goes next (release path) | docs/roadmap/WORLD_CLASS_PLAN.md:2448 |
| 23. Filing and the taxonomy: candidates, a decision, an explanation (2026-10-10; Brief 39b) | docs/roadmap/WORLD_CLASS_PLAN.md:1485 |
| 23. Organisation: manual grouping and multi-category notes | docs/roadmap/BACKLOG.md:1597 |
| 23. The code editor as an IDE: run, preview, test and debug (INBOX 748) | docs/roadmap/DOCUMENTS_PLAN.md:1262 |
| 24. Codebase census, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3276 |
| 24. Dashboard: more widgets, and layout depth | docs/roadmap/BACKLOG.md:1629 |
| 24. Deepened 2026-10-10: the documents editor (Brief 72a, decision 71) | docs/roadmap/DOCUMENTS_PLAN.md:1357 |
| 24.1 Size and complexity | docs/roadmap/WORLD_CLASS_PLAN.md:3280 |
| 24.2 Duplicated blocks | docs/roadmap/WORLD_CLASS_PLAN.md:3402 |
| 24.3 Dead-code candidates | docs/roadmap/WORLD_CLASS_PLAN.md:3442 |
| 24.4 Coupling of the classic scripts | docs/roadmap/WORLD_CLASS_PLAN.md:3495 |
| 24.5 Counts | docs/roadmap/WORLD_CLASS_PLAN.md:3582 |
| 24.6 Console errors per surface | docs/roadmap/WORLD_CLASS_PLAN.md:3689 |
| 24.6b Interaction timings, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3702 |
| 25. App control: tray, health checks, and dependency repair | docs/roadmap/BACKLOG.md:1661 |
| 25. Deepened 2026-10-10: the code editor (Brief 72a, decision 71) | docs/roadmap/DOCUMENTS_PLAN.md:1398 |
| 25. The whole app against world class, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3779 |
| 25.1 The bar | docs/roadmap/WORLD_CLASS_PLAN.md:3798 |
| 25.2 Surface by surface | docs/roadmap/WORLD_CLASS_PLAN.md:3815 |
| 25.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3850 |
| 25.4 Phases with gates (each a brief; measure first) | docs/roadmap/WORLD_CLASS_PLAN.md:3887 |
| 25.5 Not verified | docs/roadmap/WORLD_CLASS_PLAN.md:3903 |
| 26. Data lifecycle: archive, a full wipe, and a real trust page | docs/roadmap/BACKLOG.md:1727 |
| 26. The backend against world class, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3911 |
| 26.1 Judgement, by layer | docs/roadmap/WORLD_CLASS_PLAN.md:3933 |
| 26.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:3949 |
| 26.3 Phases with gates | docs/roadmap/WORLD_CLASS_PLAN.md:3978 |
| 27. Every feature, its utility and its popups, 2026-10-10 (Fable) | docs/roadmap/WORLD_CLASS_PLAN.md:3988 |
| 27. Onboarding and first-run experience | docs/roadmap/BACKLOG.md:1803 |
| 27.1 Feature by feature: what it offers, what a professional expects, the gap | docs/roadmap/WORLD_CLASS_PLAN.md:4002 |
| 27.2 The popups, one by one | docs/roadmap/WORLD_CLASS_PLAN.md:4030 |
| 27.3 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4051 |
| 28. In-app help: an AI that knows the docs, built | docs/roadmap/BACKLOG.md:1833 |
| 28. The trust contract, 2026-10-10 (INBOX 750) | docs/roadmap/WORLD_CLASS_PLAN.md:4065 |
| 28.1 The rules, each with its measure | docs/roadmap/WORLD_CLASS_PLAN.md:4074 |
| 28.2 Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:4093 |
| 28.3 Phases | docs/roadmap/WORLD_CLASS_PLAN.md:4115 |
| 28.4 Deepened 2026-10-10: the OCR workspace (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4124 |
| 28.5 Deepened 2026-10-10: the audio set (Brief 72a, decision 71) | docs/roadmap/WORLD_CLASS_PLAN.md:4158 |
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
| 3. Metadata and dependencies | docs/roadmap/ANALYSIS.md:4301 |
| 3. Research: what the field actually offers | docs/roadmap/MINDMAP_PLAN.md:79 |
| 3. The diagnosis | docs/roadmap/DOCUMENTS_PLAN.md:54 |
| 3. The five modules | docs/roadmap/CHAT_PLAN.md:1723 |
| 3. The strongest things worth taking | docs/roadmap/ANALYSIS.md:2471 |
| 3. The target, in one paragraph | docs/roadmap/CHAT_PLAN.md:60 |
| 3. The target, in one paragraph | docs/roadmap/GRAPH_PLAN.md:61 |
| 3. The target, in one paragraph | docs/roadmap/TIMELINE_PLAN.md:44 |
| 3. The target, in one paragraph | docs/roadmap/WHITEBOARD_PLAN.md:61 |
| 3. The universal layer: the same capability, with a model and without | docs/roadmap/CHAT_PLAN.md:1516 |
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
| 4. Decisions, 2026-10-10 (not to be remade; numbered after Phase 6's 45) | docs/roadmap/CHAT_PLAN.md:1733 |
| 4. Library tab: chats, documents, images, archive | docs/roadmap/BACKLOG.md:204 |
| 4. Provenance and publication practice | docs/roadmap/ANALYSIS.md:4313 |
| 4. Scope decision (make this call first) | docs/roadmap/MINDMAP_PLAN.md:119 |
| 4. The backend, made revolutionary (and still SQLite, still offline) | docs/roadmap/WORLD_CLASS_PLAN.md:472 |
| 4. The decision to make first: the editing surface | docs/roadmap/DOCUMENTS_PLAN.md:108 |
| 4. The eval sets this implies for Brief 39 step 10 | docs/roadmap/CHAT_PLAN.md:1587 |
| 4. What it does worse than us | docs/roadmap/ANALYSIS.md:2551 |
| 4a. A real whiteboard, not just a bigger sketch | docs/roadmap/BACKLOG.md:271 |
| 4b. Templates and base layouts (boards, maps, documents) | docs/roadmap/BACKLOG.md:283 |
| 5. Abilities without AI (the app must be excellent with the model off) | docs/roadmap/WORLD_CLASS_PLAN.md:685 |
| 5. Build first: fifteen capabilities by value over cost | docs/roadmap/CHAT_PLAN.md:1628 |
| 5. Connection points and constraints | docs/roadmap/WHITEBOARD_PLAN.md:1088 |
| 5. Documents | docs/roadmap/BACKLOG.md:287 |
| 5. Features by surface, not covered before | docs/roadmap/ANALYSIS.md:4345 |
| 5. Phases | docs/roadmap/CHAT_PLAN.md:321 |
| 5. Phases | docs/roadmap/GRAPH_PLAN.md:95 |
| 5. Phases | docs/roadmap/TIMELINE_PLAN.md:114 |
| 5. Phases | docs/roadmap/WHITEBOARD_PLAN.md:488 |
| 5. Phases with gates | docs/roadmap/CHAT_PLAN.md:1750 |
| 5. Ship order (suggested sprints, each ends green + measured) | docs/roadmap/PLAN.md:114 |
| 5. The feature set, in build order | docs/roadmap/MINDMAP_PLAN.md:156 |
| 5. The phases | docs/roadmap/DOCUMENTS_PLAN.md:160 |
| 5. Traps | docs/roadmap/SESSION_BRIEFS.md:1052 |
| 5. Warnings: bug classes, not features to copy | docs/roadmap/ANALYSIS.md:2576 |
| 59. Three sibling repos, read and triaged, claude-obsidian, cognee, graphify | docs/roadmap/ANALYSIS.md:729 |
| 6. Competitor matrix (what the plan takes from whom) | docs/roadmap/DOCUMENTS_PLAN.md:477 |
| 6. Consistency rules | docs/roadmap/CHAT_PLAN.md:649 |
| 6. Consistency rules | docs/roadmap/TIMELINE_PLAN.md:138 |
| 6. Consistency rules | docs/roadmap/WHITEBOARD_PLAN.md:522 |
| 6. Consistency rules (learnability) | docs/roadmap/GRAPH_PLAN.md:161 |
| 6. Files this will touch | docs/roadmap/MINDMAP_PLAN.md:240 |
| 6. Layers and pages | docs/roadmap/WHITEBOARD_PLAN.md:1102 |
| 6. Measuring "professional" without telemetry | docs/roadmap/WORLD_CLASS_PLAN.md:732 |
| 6. Not verified | docs/roadmap/CHAT_PLAN.md:1761 |
| 6. OpenAI-compatible backends: **done** | docs/roadmap/BACKLOG.md:389 |
| 6. Rows added after this brief (the owner's later asks land here) | docs/roadmap/SESSION_BRIEFS.md:1062 |
| 6. Semantic search and the knowledge graph, "the ultimate upgrade" | docs/roadmap/PLAN.md:128 |
| 6. The companion and device pairing | docs/roadmap/ANALYSIS.md:4374 |
| 60. Odysseus, re-read: the repo tripled in size, and this time the question was answered from its own words | docs/roadmap/ANALYSIS.md:839 |
| 62. Extract notes: from the Writing Room, Documents, and Graph selections | docs/roadmap/BACKLOG.md:2060 |
| 63. Ship a starter skills library, DONE, this claim was stale | docs/roadmap/BACKLOG.md:2074 |
| 64. Documents editor: built, moved to HISTORY.md | docs/roadmap/BACKLOG.md:2078 |
| 65. Highlight/web-clip capture | docs/roadmap/BACKLOG.md:2083 |
| 66. Kortex.co, read and triaged, and the second-frontend question decided | docs/roadmap/ANALYSIS.md:959 |
| 7. Acceptance | docs/roadmap/MINDMAP_PLAN.md:255 |
| 7. Design system | docs/roadmap/ANALYSIS.md:4391 |
| 7. Desktop packaging | docs/roadmap/BACKLOG.md:393 |
| 7. Files this will touch | docs/roadmap/DOCUMENTS_PLAN.md:501 |
| 7. Not verified until built | docs/roadmap/CHAT_PLAN.md:657 |
| 7. Not verified until built | docs/roadmap/GRAPH_PLAN.md:170 |
| 7. Not verified until built | docs/roadmap/TIMELINE_PLAN.md:147 |
| 7. Not verified until built | docs/roadmap/WHITEBOARD_PLAN.md:528 |
| 7. Shape libraries and the stencil format | docs/roadmap/WHITEBOARD_PLAN.md:1118 |
| 7. Startup and thermal behaviour (reported: "fan noticeably speeds up when starting") | docs/roadmap/PLAN.md:147 |
| 7. The small things (a checklist that sessions keep reopening) | docs/roadmap/WORLD_CLASS_PLAN.md:759 |
| 7.1 The top risks, and how to de-risk each | docs/roadmap/MODERNISATION_AUDIT.md:1429 |
| 7.2 The moat, in three strategies | docs/roadmap/MODERNISATION_AUDIT.md:1441 |
| 7.3 Metrics: north star and phase KPIs, with no telemetry | docs/roadmap/MODERNISATION_AUDIT.md:1463 |
| 75. Voice memos: capture, storage, playback, and a dedicated library page | docs/roadmap/BACKLOG.md:2109 |
| 76. Keyword-only note filing while the AI is unavailable, flagged for later AI review | docs/roadmap/BACKLOG.md:2132 |
| 77. Notes-tab pagination and page-aware note links | docs/roadmap/BACKLOG.md:2139 |
| 78. Whether the backend needs more concurrency than it already has | docs/roadmap/BACKLOG.md:2220 |
| 79. Linux release packaging: done; macOS still open | docs/roadmap/BACKLOG.md:2229 |
| 79b. New items, raised by the §85/§86 audit, not yet triaged | docs/roadmap/BACKLOG.md:2260 |
| 8. Acceptance for the whole plan | docs/roadmap/DOCUMENTS_PLAN.md:511 |
| 8. Dashboard | docs/roadmap/PLAN.md:176 |
| 8. Execution order for the coming week (Opus/Sonnet sessions) | docs/roadmap/WORLD_CLASS_PLAN.md:811 |
| 8. Open bug list | docs/roadmap/BACKLOG.md:491 |
| 8. Research: tldraw, Excalidraw, Miro, FigJam, and what it changes here | docs/roadmap/WHITEBOARD_PLAN.md:560 |
| 8. Research: what the reference products actually do, and what it changes here | docs/roadmap/CHAT_PLAN.md:664 |
| 8. Research: what the reference products do, and what it changes here | docs/roadmap/TIMELINE_PLAN.md:174 |
| 8. Risks | docs/roadmap/MINDMAP_PLAN.md:268 |
| 8. Templates | docs/roadmap/WHITEBOARD_PLAN.md:1195 |
| 8. The strongest things worth taking, ranked | docs/roadmap/ANALYSIS.md:4423 |
| 8b. Web search: two Windows bugs found, and what is left | docs/roadmap/BACKLOG.md:525 |
| 9. Built: Phase 1 (backend) | docs/roadmap/MINDMAP_PLAN.md:291 |
| 9. Declined, with why | docs/roadmap/ANALYSIS.md:4443 |
| 9. Find and replace | docs/roadmap/WHITEBOARD_PLAN.md:1204 |
| 9. Notes (capture + list) | docs/roadmap/PLAN.md:186 |
| 9. On testing with a real model in the sandbox | docs/roadmap/WORLD_CLASS_PLAN.md:867 |
| 9. Phase 5: the calendar as the third view (Fable, 2026-10-10; WORLD_CLASS_PLAN 25, decision 47; Brief 55) | docs/roadmap/TIMELINE_PLAN.md:207 |
| 9. Risks | docs/roadmap/DOCUMENTS_PLAN.md:523 |
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
| After the bugs: the parity programme (the owner, 2026-10-10) | docs/ROADMAP.md:130 |
| Architecture review, 2026-09-24 (INBOX 400, asked for directly) | docs/roadmap/ANALYSIS.md:3755 |
| Asked for this session, not yet built | docs/roadmap/BACKLOG.md:310 |
| Audio in the notebook: the architecture decided 2026-09-21, the build deferred | docs/roadmap/WORLD_CLASS_PLAN.md:2158 |
| Audio notes and meetings, against soundcraft | docs/roadmap/ANALYSIS.md:4067 |
| Audit, 2026-09-13 night (INBOX 209: "poke holes in this application") | docs/roadmap/WORLD_CLASS_PLAN.md:803 |
| B. Documents (DOCUMENTS_PLAN), the owner's first priority | docs/roadmap/SESSION_BRIEFS.md:678 |
| B. Retrieval and context: where the real quality ceiling is | docs/roadmap/BACKLOG.md:2388 |
| B. Schema and backend: what a professional backend would change | docs/roadmap/AUDIT.md:41 |
| B. UX, feedback states and accessibility | docs/roadmap/MODERNISATION_AUDIT.md:364 |
| B1 The event log: every change is a fact, the tables are views | docs/roadmap/WORLD_CLASS_PLAN.md:478 |
| B1 · Three quarters of a phone screen is chrome, Critical | docs/roadmap/MODERNISATION_AUDIT.md:366 |
| B2 The job runtime: durable, resumable, observable | docs/roadmap/WORLD_CLASS_PLAN.md:544 |
| B2 · The note card's actions sit on top of the note's text on touch, High, and new | docs/roadmap/MODERNISATION_AUDIT.md:389 |
| B3 The retrieval engine: one index, three signals, explained | docs/roadmap/WORLD_CLASS_PLAN.md:550 |
| B3 · There is no viewport below 600 px in the entire stylesheet, High | docs/roadmap/MODERNISATION_AUDIT.md:408 |
| B4 The knowledge kernel: entities, claims, links, tensions | docs/roadmap/WORLD_CLASS_PLAN.md:586 |
| B4 · Every counted metric is identical at 1024 and 1440, Medium | docs/roadmap/MODERNISATION_AUDIT.md:419 |
| B5 The AI harness: plan, act, verify, budget, learn | docs/roadmap/WORLD_CLASS_PLAN.md:618 |
| B5 · Accessibility, better than the codebase's reputation, with three real gaps, Medium | docs/roadmap/MODERNISATION_AUDIT.md:432 |
| B6 Local-first sync (L, later; design now) | docs/roadmap/WORLD_CLASS_PLAN.md:650 |
| B6 · Designed states: Medium | docs/roadmap/MODERNISATION_AUDIT.md:454 |
| B7 The API contract | docs/roadmap/WORLD_CLASS_PLAN.md:661 |
| B8 Extensions | docs/roadmap/WORLD_CLASS_PLAN.md:673 |
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
| Brief 34 continues (Opus, high): Atlas and the companion | docs/roadmap/SESSION_BRIEFS.md:1387 |
| Brief 35 (Opus, high): the Gemini branch triaged | docs/roadmap/SESSION_BRIEFS.md:1247 |
| Brief 36 (Opus, high): whiteboard and mind map | docs/roadmap/SESSION_BRIEFS.md:1259 |
| Brief 37 (Opus, high): Chat, Ask, first run and the owner's UI bugs | docs/roadmap/SESSION_BRIEFS.md:1270 |
| Brief 38 (Opus, high): the graph, topics first-class, note properties | docs/roadmap/SESSION_BRIEFS.md:1280 |
| Brief 39 (Opus, high): the deterministic engine | docs/roadmap/SESSION_BRIEFS.md:1287 |
| Brief 39b (Opus, high): filing and the taxonomy | docs/roadmap/SESSION_BRIEFS.md:1302 |
| Brief 3: W4-1: the error contract (PLAN B3) | docs/roadmap/MODERNISATION_AUDIT.md:1199 |
| Brief 4 (Tue, Sonnet): Settings two-pane, and the last 54 paragraphs | docs/roadmap/SESSION_BRIEFS.md:168 |
| Brief 40 (Sonnet, medium; Haiku for the placement pass): research and placement | docs/roadmap/SESSION_BRIEFS.md:1312 |
| Brief 41 (Opus, high): UI density, refinement and WCAG 2.2 | docs/roadmap/SESSION_BRIEFS.md:1338 |
| Brief 42 (Opus, high): documents | docs/roadmap/SESSION_BRIEFS.md:1348 |
| Brief 43 (Opus, high; Sonnet medium for the fixes it names): the expert audit | docs/roadmap/SESSION_BRIEFS.md:1403 |
| Brief 44 (Sonnet high for the catalogue and converter; Opus high for the editor phases): the draw.io programme | docs/roadmap/SESSION_BRIEFS.md:1444 |
| Brief 45 (Sonnet medium for the census; Opus high for the review): structure and complexity | docs/roadmap/SESSION_BRIEFS.md:1493 |
| Brief 46 (Sonnet, medium): measure the table | docs/roadmap/SESSION_BRIEFS.md:1523 |
| Brief 47 (Opus, high): search everywhere (25a, decision 46) | docs/roadmap/SESSION_BRIEFS.md:1533 |
| Brief 48 (Opus, high): import and export round trip (25b) | docs/roadmap/SESSION_BRIEFS.md:1538 |
| Brief 49 (Opus, high): first run and the manual (25c) | docs/roadmap/SESSION_BRIEFS.md:1543 |
| Brief 4: W1-3: glass as shell furniture, with an O(1) invariant | docs/roadmap/MODERNISATION_AUDIT.md:1243 |
| Brief 5 (Wed, Opus): the Timeline, Phases 1 and 2 | docs/roadmap/SESSION_BRIEFS.md:216 |
| Brief 50 (Sonnet, high): the PWA shell (25d, decision 49) | docs/roadmap/SESSION_BRIEFS.md:1547 |
| Brief 51 (Opus, high): never lose a note (25e, decision 48; rule 1.8) | docs/roadmap/SESSION_BRIEFS.md:1551 |
| Brief 52 (Opus, high): settings as a product (25f, decision 52) | docs/roadmap/SESSION_BRIEFS.md:1556 |
| Brief 53 (Sonnet, high): budgets per interaction (25g, decision 54) | docs/roadmap/SESSION_BRIEFS.md:1560 |
| Brief 54 (Opus, high): skill reliability (AGENT_SKILLS_REFORM Phase E) | docs/roadmap/SESSION_BRIEFS.md:1564 |
| Brief 55 (Opus, high): the calendar view (TIMELINE_PLAN Phase 5) | docs/roadmap/SESSION_BRIEFS.md:1568 |
| Brief 56 (Sonnet, medium): measure the design review | docs/roadmap/SESSION_BRIEFS.md:1577 |
| Brief 57 (Opus, high): the stylesheet's grammar (13a) | docs/roadmap/SESSION_BRIEFS.md:1585 |
| Brief 58 (Opus, high): the stylesheet's structure (13b) | docs/roadmap/SESSION_BRIEFS.md:1589 |
| Brief 59 (Opus, high): the surfaces (13c) | docs/roadmap/SESSION_BRIEFS.md:1593 |
| Brief 5: W2-3: the note card's actions stop covering its text on touch | docs/roadmap/MODERNISATION_AUDIT.md:1281 |
| Brief 6 (Wed, Opus): pagination on all 25 lists, and one scheduler | docs/roadmap/SESSION_BRIEFS.md:265 |
| Brief 60 (Sonnet, medium): measure and the three ratchets (26.0, 26a) | docs/roadmap/SESSION_BRIEFS.md:1603 |
| Brief 61 (Opus, high): services for whiteboard and files (26b) | docs/roadmap/SESSION_BRIEFS.md:1615 |
| Brief 62 (Opus, high): data out of code (26c) | docs/roadmap/SESSION_BRIEFS.md:1619 |
| Brief 63 (Opus, high): the runners and the embedder (26d) | docs/roadmap/SESSION_BRIEFS.md:1624 |
| Brief 64 (Sonnet, medium): measure the foundation (F0) | docs/roadmap/SESSION_BRIEFS.md:1631 |
| Brief 65 (Opus, high): the recogniser and the reading (F1) | docs/roadmap/SESSION_BRIEFS.md:1640 |
| Brief 66 (Opus, high): quick add and the palette (F2) | docs/roadmap/SESSION_BRIEFS.md:1650 |
| Brief 67 (Opus, high): the realiser, the validators and the acts (F3) | docs/roadmap/SESSION_BRIEFS.md:1659 |
| Brief 68 (Opus, high): the surfaces (F4, after 65 to 67) | docs/roadmap/SESSION_BRIEFS.md:1666 |
| Brief 69 (Opus, high): run, preview and test (I1) | docs/roadmap/SESSION_BRIEFS.md:1675 |
| Brief 6: W8-1: the audit scripts become the e2e suite | docs/roadmap/MODERNISATION_AUDIT.md:1310 |
| Brief 70 (Opus, high): the debugger (I2) | docs/roadmap/SESSION_BRIEFS.md:1683 |
| Brief 71 (Opus, high): the IDE shell (I3) | docs/roadmap/SESSION_BRIEFS.md:1690 |
| Brief 75 (Sonnet, high): every vendored library at full use (INBOX 751) | docs/roadmap/SESSION_BRIEFS.md:1700 |
| Brief 7: W5-4: `ai/scheduler.py`, one gate in front of every model call | docs/roadmap/MODERNISATION_AUDIT.md:1347 |
| Brief 7: built; moved to HISTORY.md ("Moved from the plans, 2026-10-10 (SESSION_BRIEFS Briefs 1 to 33)") | docs/roadmap/SESSION_BRIEFS.md:310 |
| Brief 8 (Thu, Opus): `[[` autocomplete and the connections rail | docs/roadmap/SESSION_BRIEFS.md:312 |
| Brief 84 (Opus, high): Atlas everywhere (F5, after 68) | docs/roadmap/SESSION_BRIEFS.md:1714 |
| Brief 8: W1-4: the three 18.4px switches, and making DESIGN.md true | docs/roadmap/MODERNISATION_AUDIT.md:1392 |
| Brief 9 (Fri, Opus): the job runtime (B2) and thread isolation | docs/roadmap/SESSION_BRIEFS.md:358 |
| Briefs 25 to 31: the plans the owner asked to see finished | docs/roadmap/SESSION_BRIEFS.md:744 |
| Briefs 35 to 42 (2026-10-10, Fable orchestrating): the owner's list, the engine, the direction | docs/roadmap/SESSION_BRIEFS.md:1238 |
| Briefs 46 to 55 (2026-10-10, Fable): the whole app against world class | docs/roadmap/SESSION_BRIEFS.md:1517 |
| Briefs 56 to 59 (2026-10-10, Fable): the design review | docs/roadmap/SESSION_BRIEFS.md:1572 |
| Briefs 60 to 63 (2026-10-10, Fable): the backend review | docs/roadmap/SESSION_BRIEFS.md:1598 |
| Briefs 64 to 68 (CHAT_PLAN "The deterministic foundation") | docs/roadmap/SESSION_BRIEFS.md:1629 |
| Briefs 69 to 71 (DOCUMENTS_PLAN 23: the IDE; after Brief 42) | docs/roadmap/SESSION_BRIEFS.md:1673 |
| Briefs 72 to 74 (WORLD_CLASS_PLAN 28: the trust contract) | docs/roadmap/SESSION_BRIEFS.md:1697 |
| Briefs 76 onward (from Brief 72a) | docs/roadmap/SESSION_BRIEFS.md:1703 |
| Bugs | docs/roadmap/CHAT_PLAN.md:957 |
| Bugs | docs/roadmap/DOCUMENTS_PLAN.md:1527 |
| Bugs | docs/roadmap/TIMELINE_PLAN.md:202 |
| Bugs | docs/roadmap/UI_MODERNISATION_PLAN.md:1328 |
| Bugs | docs/roadmap/WORLD_CLASS_PLAN.md:3142 |
| Build first | docs/roadmap/WHITEBOARD_PLAN.md:1376 |
| Built, 2026-09-09: one surface per panel, and the Arrange section | docs/roadmap/WHITEBOARD_PLAN.md:437 |
| Built, Phase 1 (the chrome), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:562 |
| Built, Phase 2 (the space) | docs/roadmap/GRAPH_PLAN.md:202 |
| Built, Phase 2 step 1 (the engine, vendored and verified under the CSP), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:566 |
| Built, Phase 2 steps 2 to 4 (the engine under the editor), 2026-09-09 | docs/roadmap/DOCUMENTS_PLAN.md:570 |
| Built, Phase 3 (colour rules and groups), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:194 |
| Built, Phase 3 (tables, blocks, embeds, properties, columns), 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:578 |
| Built, Phase 4 (utility), part one, 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:186 |
| Built, Phase 4 (utility), part two: the local map, 2026-09-13 | docs/roadmap/GRAPH_PLAN.md:190 |
| Built, Phase 5 (backend), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:182 |
| Built, Phase 6 (the node panel), 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:178 |
| Built, second sitting | docs/roadmap/UI_MODERNISATION_PLAN.md:537 |
| Built, the sidebar redesign (INBOX 115), 2026-09-12 | docs/roadmap/DOCUMENTS_PLAN.md:1439 |
| Built: Phase 0 | docs/roadmap/DOCUMENTS_PLAN.md:574 |
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
| Candidate libraries | docs/roadmap/ANALYSIS.md:4187 |
| Composer decisions, taken with the owner, 2026-10-06 | docs/roadmap/CHAT_PLAN.md:928 |
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
| Decisions made | docs/roadmap/UI_MODERNISATION_PLAN.md:1219 |
| Decisions made | docs/roadmap/WORLD_CLASS_PLAN.md:2255 |
| Decisions made (do not re-decide) | docs/roadmap/DOCUMENTS_PLAN.md:1285 |
| Decisions made (do not re-decide) | docs/roadmap/TIMELINE_PLAN.md:214 |
| Decisions made, 2026-10-05: draw.io phase 2 (wb-phase2) | docs/roadmap/WHITEBOARD_PLAN.md:359 |
| Decisions made, 2026-10-05: the draw.io pass (INBOX 557, 558) | docs/roadmap/WHITEBOARD_PLAN.md:295 |
| Decisions, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:1427 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/UI_MODERNISATION_PLAN.md:1095 |
| Decisions, 2026-10-10 (do not re-decide) | docs/roadmap/WORLD_CLASS_PLAN.md:1507 |
| Deepened 2026-10-10 (Brief 72a, decision 71) | docs/roadmap/WHITEBOARD_PLAN.md:1501 |
| Deliberately not on this list | docs/roadmap/BACKLOG.md:2488 |
| Design requests | docs/roadmap/CHAT_PLAN.md:1008 |
| Design requests | docs/roadmap/DOCUMENTS_PLAN.md:1538 |
| Design requests | docs/roadmap/UI_MODERNISATION_PLAN.md:1347 |
| Design requests | docs/roadmap/WORLD_CLASS_PLAN.md:3159 |
| Deta Surf (deta) | docs/roadmap/ANALYSIS.md:2038 |
| Diagrams: mermaid as the interchange format | docs/roadmap/BACKLOG.md:2543 |
| Direction, 2026-10-10 (Fable orchestrating): the thesis, the policies, the tracks | docs/ROADMAP.md:26 |
| Documents (code), against VS Code's editor features | docs/roadmap/ANALYSIS.md:3930 |
| Documents (prose), against wordcraft | docs/roadmap/ANALYSIS.md:3887 |
| E. App-wide usability and accessibility, the things that read as "side project" | docs/roadmap/AUDIT.md:95 |
| E. Local AI: where it is overused or misused | docs/roadmap/MODERNISATION_AUDIT.md:640 |
| E. Polish worth doing as one pass | docs/roadmap/BACKLOG.md:2451 |
| E. Whiteboard (WHITEBOARD_PLAN Phase 1) and mind maps (MINDMAP §12) | docs/roadmap/SESSION_BRIEFS.md:702 |
| E1 · A step is a turn, not a goal, Critical (reasoned) | docs/roadmap/MODERNISATION_AUDIT.md:645 |
| E2 · The complexity of the AI path is where the next bug will be, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:653 |
| E3 · Model calls are scattered across request handlers, background threads and module singletons, High (read) | docs/roadmap/MODERNISATION_AUDIT.md:666 |
| E4 · The honest positives, so the section is not one-sided (read) | docs/roadmap/MODERNISATION_AUDIT.md:676 |
| Earlier sessions | docs/roadmap/HANDOVER.md:488 |
| Expert audit, 2026-10-10 | docs/roadmap/BACKLOG.md:4269 |
| F. Agent harness: what "ultimate" needs that is not there | docs/roadmap/AUDIT.md:113 |
| F. Library, dashboard, settings | docs/roadmap/SESSION_BRIEFS.md:707 |
| F. Performance and perceived speed | docs/roadmap/MODERNISATION_AUDIT.md:685 |
| F1 · Boot is ~1 s and tab switches are ~10–50 ms. The app is not slow; it is *heavy*: Medium | docs/roadmap/MODERNISATION_AUDIT.md:687 |
| F2 · Fourteen requests in sixty idle seconds, from three separate timers, High | docs/roadmap/MODERNISATION_AUDIT.md:708 |
| F3 · List rendering is solved; list *fetching* is not, Medium | docs/roadmap/MODERNISATION_AUDIT.md:733 |
| Fable's working notes for Opus (2026-09-09 05:10 UTC) | docs/roadmap/HANDOVER.md:173 |
| Found by an agent while measuring something else (2026-09-08, graph) | docs/roadmap/CHAT_PLAN.md:715 |
| G. Mobile and responsive | docs/roadmap/MODERNISATION_AUDIT.md:743 |
| G. Test-suite gaps | docs/roadmap/AUDIT.md:123 |
| G. The plans' own remainders | docs/roadmap/SESSION_BRIEFS.md:712 |
| G1 · Primary navigation scrolls off the phone screen, High | docs/roadmap/MODERNISATION_AUDIT.md:748 |
| G2 · The category sidebar becomes a 182 px banner, Medium | docs/roadmap/MODERNISATION_AUDIT.md:761 |
| Gates | docs/roadmap/TIMELINE_PLAN.md:233 |
| Guides: curated instructions the AI writes to | docs/roadmap/BACKLOG.md:2505 |
| H. Missing table stakes, security and privacy | docs/roadmap/MODERNISATION_AUDIT.md:768 |
| H. Suggested order (feeds PLAN.md's sprints) | docs/roadmap/AUDIT.md:162 |
| H1 The night shift, finished (I1 second pass; L, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1772 |
| H1 · Security posture is genuinely strong, recorded as a positive | docs/roadmap/MODERNISATION_AUDIT.md:770 |
| H2 Evidence cards and open questions (I6 then I3; L, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1788 |
| H2 · The gaps that are actually missing, High | docs/roadmap/MODERNISATION_AUDIT.md:795 |
| H3 The model bench (I8; M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1803 |
| H3 · Privacy is a claim without an artefact, Medium | docs/roadmap/MODERNISATION_AUDIT.md:806 |
| H4 The notebook as a local service for other agents (B7 and B8; M, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1807 |
| H5 Sync without a server (B6; L, design first) | docs/roadmap/WORLD_CLASS_PLAN.md:1821 |
| H6 Professional use (the PR after 144; M, mixed) | docs/roadmap/WORLD_CLASS_PLAN.md:1833 |
| H7 The speed budget (A1 continued; S each) | docs/roadmap/WORLD_CLASS_PLAN.md:1878 |
| H8 Time travel and the margin reader (I5, I2; M each, Opus) | docs/roadmap/WORLD_CLASS_PLAN.md:1907 |
| H9 Polish in use (the owner's question, 2026-09-14; S to M each) | docs/roadmap/WORLD_CLASS_PLAN.md:1921 |
| Harness robustness, 2026-10-04 (INBOX 527) | docs/roadmap/AGENT_SKILLS_REFORM.md:202 |
| Harper (Automattic) | docs/roadmap/ANALYSIS.md:1830 |
| Headroom: evaluated, not adopted | docs/roadmap/BACKLOG.md:710 |
| How far each plan actually is (honest, as of 2026-10-03) | docs/roadmap/HANDOVER.md:309 |
| How to proceed after PR 149 (the owner asked, 2026-09-14) | docs/roadmap/HANDOVER.md:442 |
| How to proceed after PR 149 (written 2026-09-14; the live order is CLAUDE.md standing order 1 and HANDOVER's Now line) | docs/ROADMAP.md:293 |
| How to read the evidence in here | docs/roadmap/MODERNISATION_AUDIT.md:23 |
| How to work on this repo | docs/ROADMAP.md:362 |
| I. Bug, security and complexity scan (asked for directly) | docs/roadmap/AUDIT.md:131 |
| I1 The night shift: the notebook that understands itself while you sleep | docs/roadmap/WORLD_CLASS_PLAN.md:1105 |
| I2 The margin reader: a second reader in the editor, from your own notes | docs/roadmap/WORLD_CLASS_PLAN.md:1180 |
| I3 Open questions: the notebook keeps a list of what you have not answered | docs/roadmap/WORLD_CLASS_PLAN.md:1184 |
| I4 Resurfacing: the ideas you are about to forget, when they matter | docs/roadmap/WORLD_CLASS_PLAN.md:1188 |
| I5 Time travel over meaning: what did I think about X in March? | docs/roadmap/WORLD_CLASS_PLAN.md:1194 |
| I6 Evidence cards: answers you can audit sentence by sentence | docs/roadmap/WORLD_CLASS_PLAN.md:1232 |
| I7 The corrections loop: every "no" makes the notebook better | docs/roadmap/WORLD_CLASS_PLAN.md:1236 |
| I8 The model bench: which local model is best on *your* notebook | docs/roadmap/WORLD_CLASS_PLAN.md:1288 |
| I9 What the notebook learned: one place to see, edit, delete and switch it all off | docs/roadmap/WORLD_CLASS_PLAN.md:1292 |
| Ideas | docs/roadmap/BACKLOG.md:4165 |
| Ideas | docs/roadmap/CHAT_PLAN.md:1052 |
| Ideas | docs/roadmap/DOCUMENTS_PLAN.md:1549 |
| Ideas | docs/roadmap/WORLD_CLASS_PLAN.md:3184 |
| If Opus is the orchestrator (no Fable available) | docs/roadmap/HANDOVER.md:31 |
| Image notes and the Library, against photocraft and lightcraft | docs/roadmap/ANALYSIS.md:4034 |
| Is its backend better designed? No: and it says so about itself | docs/roadmap/ANALYSIS.md:857 |
| KnowNote (MrSibe) | docs/roadmap/ANALYSIS.md:1979 |
| Later: weeks 9–12+: "structure that lasts" | docs/roadmap/MODERNISATION_AUDIT.md:1064 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:476 |
| Looked at and deliberately not taken | docs/roadmap/ANALYSIS.md:760 |
| Looked at and not recommended | docs/roadmap/ANALYSIS.md:929 |
| Mind map, against designcraft's canvas and MINDMAP_PLAN's references | docs/roadmap/ANALYSIS.md:3852 |
| Next PR, first (the owner, 2026-10-05: "maybe push these to next pr at the top of the roadmap") | docs/ROADMAP.md:210 |
| Next up, ranked by what it unlocks | docs/ROADMAP.md:342 |
| Next: weeks 5–8: "a small model can finish a job, and so can the app" | docs/roadmap/MODERNISATION_AUDIT.md:1049 |
| Not in this plan | docs/roadmap/UI_MODERNISATION_PLAN.md:585 |
| Not verified, and to be taken first by whoever opens this | docs/roadmap/MINDMAP_PLAN.md:1428 |
| Now: weeks 0–4: "the app stops hiding its own content" | docs/roadmap/MODERNISATION_AUDIT.md:1034 |
| Odysseus read deeply, 2026-09-21 | docs/roadmap/ANALYSIS.md:2262 |
| Odysseus, fourth read 2026-10-10 (INBOX 747) | docs/roadmap/ANALYSIS.md:4223 |
| Open items | docs/roadmap/INBOX.md:35 |
| OpenJarvis (open-jarvis) | docs/roadmap/ANALYSIS.md:2983 |
| Order and dependencies | docs/roadmap/WORLD_CLASS_PLAN.md:1393 |
| PDF viewer and OCR workspace, against pdfcraft | docs/roadmap/ANALYSIS.md:4001 |
| PR 144 is done when (the owner's checklist, 2026-09-09 05:30 UTC) | docs/roadmap/HANDOVER.md:70 |
| Parity matrix, 2026-10-10 | docs/roadmap/ANALYSIS.md:3792 |
| Performance on small laptops, measured 2026-09-08 23:30 UTC (Chromium, 1366x768, no GPU) | docs/roadmap/WHITEBOARD_PLAN.md:635 |
| Phase 0: the bridge: click an underline, see suggestions (1 session) | docs/roadmap/DOCUMENTS_PLAN.md:167 |
| Phase 10: the Liquid Glass adoptions (½ session) | docs/roadmap/UI_MODERNISATION_PLAN.md:590 |
| Phase 11: the phone, done properly (1 to 2 sessions, next session or later) | docs/roadmap/UI_MODERNISATION_PLAN.md:601 |
| Phase 12: density, refinement and WCAG 2.2 (the owner, 2026-10-10; Brief 41) | docs/roadmap/UI_MODERNISATION_PLAN.md:1068 |
| Phase 13: the design review, every surface against the principles (Fable, 2026-10-10) | docs/roadmap/UI_MODERNISATION_PLAN.md:1397 |
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
| Phases | docs/roadmap/DOCUMENTS_PLAN.md:1343 |
| Phases 0 to 6: built | docs/roadmap/UI_MODERNISATION_PLAN.md:216 |
| Phases, each with the gate it is finished against | docs/roadmap/MINDMAP_PLAN.md:1294 |
| Placed (last 20, newest first) | docs/roadmap/INBOX.md:260 |
| Placed from Brief 40, 2026-10-10 (does the MCP server work) | docs/roadmap/AGENT_SKILLS_REFORM.md:345 |
| Placed from Brief 40, 2026-10-10 (research and placement) | docs/roadmap/BACKLOG.md:4175 |
| Placed from Brief 40, 2026-10-10 (the phone over HTTPS) | docs/roadmap/WORLD_CLASS_PLAN.md:3196 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/CHAT_PLAN.md:705 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/GRAPH_PLAN.md:206 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/MINDMAP_PLAN.md:1448 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/UI_MODERNISATION_PLAN.md:1152 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WHITEBOARD_PLAN.md:595 |
| Placed from INBOX, 2026-09-09 | docs/roadmap/WORLD_CLASS_PLAN.md:1560 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/CHAT_PLAN.md:737 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/DOCUMENTS_PLAN.md:612 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/GRAPH_PLAN.md:238 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/MINDMAP_PLAN.md:1453 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/UI_MODERNISATION_PLAN.md:1169 |
| Placed from INBOX, 2026-09-09 (the owner's evening batch) | docs/roadmap/WHITEBOARD_PLAN.md:689 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/GRAPH_PLAN.md:322 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/MINDMAP_PLAN.md:1460 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/UI_MODERNISATION_PLAN.md:1173 |
| Placed from INBOX, 2026-09-13 | docs/roadmap/WORLD_CLASS_PLAN.md:1741 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/DOCUMENTS_PLAN.md:1445 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/GRAPH_PLAN.md:330 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/MINDMAP_PLAN.md:1465 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/UI_MODERNISATION_PLAN.md:1181 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WHITEBOARD_PLAN.md:694 |
| Placed from INBOX, 2026-09-21 | docs/roadmap/WORLD_CLASS_PLAN.md:2089 |
| Placed from INBOX, 2026-09-21 (the Ask sub-tab, four reports in one pass) | docs/roadmap/CHAT_PLAN.md:745 |
| Placed from INBOX, 2026-09-21 (the dashboard's focused hero) | docs/roadmap/UI_MODERNISATION_PLAN.md:1185 |
| Placed from INBOX, 2026-09-21 (two app-wide contracts) | docs/roadmap/WORLD_CLASS_PLAN.md:2147 |
| Placed from INBOX, 2026-09-23 | docs/roadmap/WHITEBOARD_PLAN.md:768 |
| Placed from INBOX, 2026-09-23 (392) | docs/roadmap/DOCUMENTS_PLAN.md:1467 |
| Placed from INBOX, 2026-09-25 | docs/roadmap/WHITEBOARD_PLAN.md:796 |
| Placed from INBOX, 2026-09-27 | docs/roadmap/WHITEBOARD_PLAN.md:828 |
| Placed from INBOX, 2026-09-27 (399) | docs/roadmap/WORLD_CLASS_PLAN.md:2466 |
| Placed from INBOX, 2026-10-03 (445 (2) audit, found not fixed) | docs/roadmap/MINDMAP_PLAN.md:1483 |
| Placed from INBOX, 2026-10-03 (INBOX 213) | docs/roadmap/BACKLOG.md:3974 |
| Placed from INBOX, 2026-10-03 (INBOX 266) | docs/roadmap/BACKLOG.md:4018 |
| Placed from INBOX, 2026-10-03 (INBOX 268) | docs/roadmap/AGENT_SKILLS_REFORM.md:176 |
| Placed from INBOX, 2026-10-03 (INBOX 303, music) | docs/roadmap/BACKLOG.md:3954 |
| Placed from INBOX, 2026-10-03 (INBOX 391, 392) | docs/roadmap/WORLD_CLASS_PLAN.md:2521 |
| Placed from INBOX, 2026-10-03 (INBOX 393) | docs/roadmap/UI_MODERNISATION_PLAN.md:1189 |
| Placed from INBOX, 2026-10-03 (INBOX 397) | docs/roadmap/BACKLOG.md:4131 |
| Placed from INBOX, 2026-10-03 (INBOX 403, the standing bar) | docs/roadmap/WORLD_CLASS_PLAN.md:2500 |
| Placed from INBOX, 2026-10-03 (INBOX 409: the AI assistant bar is what stays open) | docs/roadmap/DOCUMENTS_PLAN.md:1480 |
| Placed from INBOX, 2026-10-03 (the chat stutter, INBOX 413) | docs/roadmap/CHAT_PLAN.md:799 |
| Placed from INBOX, 2026-10-03 (the tray at its cap) | docs/roadmap/WORLD_CLASS_PLAN.md:2599 |
| Placed from INBOX, 2026-10-04 (design work for the next Opus slots) | docs/roadmap/WORLD_CLASS_PLAN.md:3058 |
| Placed from INBOX, 2026-10-04: parity with Obsidian's graph | docs/roadmap/GRAPH_PLAN.md:515 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/MINDMAP_PLAN.md:1487 |
| Placed from INBOX, 2026-10-05 | docs/roadmap/WHITEBOARD_PLAN.md:843 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/AGENT_SKILLS_REFORM.md:339 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/CHAT_PLAN.md:822 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/DOCUMENTS_PLAN.md:1506 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/UI_MODERNISATION_PLAN.md:1284 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WHITEBOARD_PLAN.md:850 |
| Placed from INBOX, 2026-10-05 (OPEN.md triage) | docs/roadmap/WORLD_CLASS_PLAN.md:3070 |
| Placed from INBOX, 2026-10-05 (boardmap-1005) | docs/roadmap/WHITEBOARD_PLAN.md:858 |
| Placed from INBOX, 2026-10-05 (header bars, Settings navigation) | docs/roadmap/UI_MODERNISATION_PLAN.md:1316 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/DOCUMENTS_PLAN.md:1511 |
| Placed from INBOX, 2026-10-07 (next PR) | docs/roadmap/WHITEBOARD_PLAN.md:870 |
| Placed from INBOX: 107d, the segmented mini bars | docs/roadmap/DOCUMENTS_PLAN.md:584 |
| Placed from INBOX: the composer everywhere (the owner, 2026-10-06) | docs/roadmap/CHAT_PLAN.md:828 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/BACKLOG.md:4161 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:953 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/DOCUMENTS_PLAN.md:1523 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/GRAPH_PLAN.md:588 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/MINDMAP_PLAN.md:1772 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/TIMELINE_PLAN.md:198 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/UI_MODERNISATION_PLAN.md:1320 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:917 |
| Placed from the owner's list, 2026-10-10 | docs/roadmap/WORLD_CLASS_PLAN.md:3138 |
| Policies (taken 2026-10-10) | docs/ROADMAP.md:47 |
| Presentations from boards and maps, against deckcraft | docs/roadmap/ANALYSIS.md:4101 |
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
| Repositories and libraries read, 2026-10-10 | docs/roadmap/ANALYSIS.md:4130 |
| Revisited: where theirs is better, project by project | docs/roadmap/ANALYSIS.md:3616 |
| Rules for the whole plan | docs/roadmap/UI_MODERNISATION_PLAN.md:50 |
| Section 8's two cheap additions: **built 2026-10-05**, see | docs/roadmap/TIMELINE_PLAN.md:134 |
| Settings information architecture (INBOX 444) | docs/roadmap/UI_MODERNISATION_PLAN.md:1196 |
| Six repositories read for MemoryMap, 2026-09-20 | docs/roadmap/ANALYSIS.md:1807 |
| Sources | docs/roadmap/MINDMAP_PLAN.md:280 |
| Speech, four projects read by name, and what this app already does | docs/roadmap/ANALYSIS.md:3191 |
| Standing orders for this session (whoever the model is) | docs/roadmap/HANDOVER.md:245 |
| State of the branch (`claude/notes-flow-rebuild`, PR #162) | docs/roadmap/HANDOVER.md:329 |
| Steps | docs/roadmap/UI_MODERNISATION_PLAN.md:1142 |
| Steps | docs/roadmap/WORLD_CLASS_PLAN.md:1552 |
| Still open | docs/roadmap/WORLD_CLASS_PLAN.md:2290 |
| Still open after KG1 to KG9 | docs/roadmap/GRAPH_PLAN.md:536 |
| Still open: the upload split, and what it collides with | docs/roadmap/BACKLOG.md:2779 |
| Tables in notes and documents, against gridcraft | docs/roadmap/ANALYSIS.md:3970 |
| The `pytesseract` vendoring question, measured | docs/roadmap/ANALYSIS.md:2149 |
| The app's stack (outside boards and documents) | docs/roadmap/WHITEBOARD_PLAN.md:473 |
| The assistant catalogue, 2026-10-10 | docs/roadmap/CHAT_PLAN.md:1064 |
| The asymmetry these exploit | docs/roadmap/WORLD_CLASS_PLAN.md:1092 |
| The constraint that governs everything below, **now half-lifted** | docs/roadmap/ANALYSIS.md:257 |
| The deterministic foundation, 2026-10-10 (INBOX 746) | docs/roadmap/CHAT_PLAN.md:1677 |
| The dock grammar (the rule the whole phase enforces) | docs/roadmap/UI_MODERNISATION_PLAN.md:433 |
| The draw.io programme, 2026-10-10 | docs/roadmap/WHITEBOARD_PLAN.md:921 |
| The features audit's Phase G, what is left (placed 2026-10-05, op3-1005) | docs/roadmap/MINDMAP_PLAN.md:1629 |
| The forks and draw.io | docs/roadmap/ANALYSIS.md:4141 |
| The four reports, verbatim | docs/roadmap/CHAT_PLAN.md:783 |
| The gates that do not move | docs/roadmap/SESSION_BRIEFS.md:722 |
| The general lesson, which is not about this agent | docs/roadmap/ANALYSIS.md:704 |
| The harness does the work the model is worst at: decided 2026-09-21 | docs/roadmap/AGENT_SKILLS_REFORM.md:134 |
| The instruction, verbatim | docs/roadmap/AGENT_SKILLS_REFORM.md:7 |
| The instruction, verbatim | docs/roadmap/UI_MODERNISATION_PLAN.md:8 |
| The knowledge graph, 2026-10-04 (INBOX 528) | docs/roadmap/GRAPH_PLAN.md:521 |
| The moves that would outshine everything else, in order of leverage | docs/roadmap/WORLD_CLASS_PLAN.md:1045 |
| The night's merges reviewed line by line, 2026-09-21 | docs/roadmap/ANALYSIS.md:2631 |
| The one process change worth making | docs/roadmap/ANALYSIS.md:659 |
| The one thing deliberately not decided | docs/roadmap/ANALYSIS.md:717 |
| The one-line answers to the three questions asked | docs/roadmap/ANALYSIS.md:946 |
| The order, and the rule | docs/roadmap/WORLD_CLASS_PLAN.md:1925 |
| The peer apps: fourteen triaged, five read properly | docs/roadmap/ANALYSIS.md:3339 |
| The plan documents, in one list (read this before opening any of them) | docs/ROADMAP.md:266 |
| The quarter's briefs (shorter; expand each into the shape above when | docs/roadmap/SESSION_BRIEFS.md:462 |
| The reform, in phases | docs/roadmap/AGENT_SKILLS_REFORM.md:52 |
| The road to 1.0: milestones with exit criteria (the owner, 2026-10-10: "still very much a demo and beta") | docs/ROADMAP.md:169 |
| The scripts, and what each produced | docs/roadmap/MODERNISATION_AUDIT.md:40 |
| The specific work waiting for you | docs/roadmap/FABLE_BRIEF.md:134 |
| The thesis | docs/ROADMAP.md:37 |
| The thing this app is actually good at, which is not what it says on the tin | docs/roadmap/ANALYSIS.md:547 |
| The three killer combos | docs/roadmap/MODERNISATION_AUDIT.md:1079 |
| The tracks, in order (each a brief; the agent model in brackets) | docs/ROADMAP.md:111 |
| The two bars that are not docks (added by direct instruction) | docs/roadmap/UI_MODERNISATION_PLAN.md:522 |
| The work, surface by surface | docs/roadmap/UI_MODERNISATION_PLAN.md:475 |
| Three rules that are not negotiable here | docs/roadmap/FABLE_BRIEF.md:51 |
| Three things I would prioritise, and why | docs/roadmap/ANALYSIS.md:563 |
| Tools and skills: is odysseus leaner for small models? Measured, and no | docs/roadmap/ANALYSIS.md:352 |
| Traps that have each cost real time | docs/ROADMAP.md:381 |
| Twenty-four repositories read for MemoryMap, 2026-09-21 | docs/roadmap/ANALYSIS.md:2677 |
| Undo coverage, audited 2026-10-05 (INBOX 537) | docs/roadmap/WHITEBOARD_PLAN.md:441 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/CHAT_PLAN.md:1765 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/DOCUMENTS_PLAN.md:1554 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/GRAPH_PLAN.md:595 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/MINDMAP_PLAN.md:1816 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/TIMELINE_PLAN.md:246 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/UI_MODERNISATION_PLAN.md:1519 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WHITEBOARD_PLAN.md:1541 |
| Vendored capabilities to use, 2026-10-10 (Brief 75) | docs/roadmap/WORLD_CLASS_PLAN.md:4195 |
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
| What exists (checked) | docs/roadmap/WORLD_CLASS_PLAN.md:1500 |
| What is actually open, 2026-09-14 | docs/roadmap/INBOX.md:24 |
| What is already good | docs/roadmap/WORLD_CLASS_PLAN.md:1031 |
| What is left, 2026-09-24 (INBOX 399: "what is left in the world class plan??") | docs/roadmap/WORLD_CLASS_PLAN.md:813 |
| What is missing that nobody has asked for | docs/roadmap/ANALYSIS.md:642 |
| What reading it changed about how I'd judge this app | docs/roadmap/ANALYSIS.md:517 |
| What the code actually does today | docs/roadmap/AGENT_SKILLS_REFORM.md:27 |
| What this audit did not verify | docs/roadmap/MODERNISATION_AUDIT.md:1522 |
| What this read could not verify | docs/roadmap/ANALYSIS.md:3681 |
| What was built | docs/roadmap/BACKLOG.md:2775 |
| What was deliberately left out | docs/roadmap/WORLD_CLASS_PLAN.md:1408 |
| What was wrong, and is fixed this session | docs/roadmap/WORLD_CLASS_PLAN.md:1041 |
| Where I think the roadmap is over-invested | docs/roadmap/ANALYSIS.md:624 |
| Whiteboard, against draw.io and designcraft | docs/roadmap/ANALYSIS.md:3805 |
| Why the app feels "off" even where each screen is fine | docs/roadmap/WORLD_CLASS_PLAN.md:54 |
| Worth building, not this session | docs/roadmap/ANALYSIS.md:415 |
| Worth building: features, ranked by fit, and what actually happened | docs/roadmap/ANALYSIS.md:914 |
| Your standing task, alongside the plans | docs/roadmap/FABLE_BRIEF.md:71 |
| better-clawd (x1xhlol) and Clawd-Code (GPT-AGI) | docs/roadmap/ANALYSIS.md:2104 |
| blobatar (Alain00) | docs/roadmap/ANALYSIS.md:1924 |
| cognee (topoteretes) | docs/roadmap/ANALYSIS.md:2854 |
| cupid-music-player (cupidbity), and the music question attached to it | docs/roadmap/ANALYSIS.md:3065 |
| haifengl/smile: algorithms worth re-implementing small | docs/roadmap/ANALYSIS.md:4165 |
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
