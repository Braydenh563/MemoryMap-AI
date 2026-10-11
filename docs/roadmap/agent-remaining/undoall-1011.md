# undoall-1011: remaining (INBOX 898, undo and redo everywhere)

Ratchet: `tests/test_undo_coverage.py` (EXEMPT only shrinks). Helpers: `frontend/js/undo-kit.js` (lazy), `wbPushCall` (board history).

Numbers: 89 GAP entries left in EXEMPT; the rest are classed auth, read, send, settings, telemetry, job, inverse, board, purge with a reason each.

Not verified: nothing here was driven in a browser (Playwright); every helper is checked by `node --check` and the scanner only. Undo of a board step that is a `call` is not persisted across a reload by design.

Needs the server (no restore route): media/file deletes and uploads, ask-history delete/clear, learned delete/forget, tidy and tension dismiss, wiki-rename (rewrites other notes, ids not returned), attachment delete.

Open design: stand-alone capture.js and clip.js windows have no stack; the board library 'new library' and 'delete library'; board objects the board history may already cover through callers (verify per function).


## other

- ask-history.js:clearAskHistory  DELETE /ask-history
- ask-history.js:deleteAskHistoryTurn  DELETE /ask-history/${id}
- ask-history.js:forgetRecentQuestion  DELETE /chat/recent?question=${encodeURIComponent(quest
- attach-to.js:renderAttachToBoard  POST /whiteboard/nodes
- attachment-actions.js:remove  DELETE /files/${spec.attachment.id}
- capture-ask.js:renderAnswerGrounding  POST /learned/corrections
- capture.js:save  POST /entries
- categories-panel.js:drawCategoryTidy  POST /tidy-proposals/dismiss
- chat-agent.js:answer  POST /memory/${proposal.id}/answer
- chat-edit.js:editAndResend  POST /conversations/${chatConv.id}/truncate
- clip.js:save  POST /links/clip-page
- dashboard.js:nightFactRow  POST /entries/tensions/accept
- dashboard.js:paintFadedNotes  POST /learned/corrections
- documents.js:runDocAiEdit  POST /documents/${currentDoc.id}/ai-edit
- editor.js:inlineAiSubmit  POST /documents/${currentDoc.id}/ai-edit
- graph-canvas.js:gcDragEnd  PUT /graph/pins
- graph-canvas.js:gcSaveTopicName  PUT /graph/topics/name
- graph-canvas.js:gcTogglePin  PUT /graph/pin/${node.id}
- graph-canvas.js:gcWireSelectionDock  PUT /entries/${node.id}
- graph.js:renderGraphSvg  PUT /graph/pin/${d.id}
- library.js:bulkDeleteLibraryMedia  DELETE endpoint
- library.js:filterLibraryImagesGallery  DELETE endpoint
- library.js:finish  PUT /graph/topics/name
- library.js:libraryActions  PUT /conversations/${item.id}/pin
- library.js:noteRead  PUT /bookmarks/${bookmark.id}
- lightbox-view.js:readingDelete  POST /media/${id}/${source === vision ? vision-ocr : 
- lightbox-view.js:run  PUT /media/${item.id}
- meetings.js:meetingTakeBegin  POST /recordings
- meetings.js:meetingTakeDiscard  DELETE /recordings/${id}
- meetings.js:meetingTakeFinish  POST /recordings/${meetingTake.id}/finish
- note-cards.js:entryItem  PUT /entries/${entry.id}
- notes-list.js:offerWikiRename  POST /entries/${entryId}/wiki-rename
- quick-note.js:flushNoteOutbox  POST /entries
- settings.js:learnedBulk  POST /learned/bulk
- settings.js:learnedDelete  DELETE /learned/${fact.id}
- settings.js:learnedForget  DELETE /learned
- skills.js:saveFile  POST /files/save
- spaces-find.js:initSpaceSwitcher  POST /spaces
- suggestions-inbox.js:inboxCorrection  POST /learned/corrections
- suggestions-inbox.js:inboxTypeRow  POST /suggestions/types/accept
- suggestions-inbox.js:tensionCard  POST /entries/tensions/accept
- tidy.js:tidyDismiss  POST ${path}/dismiss
- wiring.js:applyPendingChatTitle  PUT /conversations/${conversationId}

## uploads (/media/upload)

- chat-attach.js:commitStagedImages  POST /media/upload
- documents-word.js:docWordUploadPicture  POST /media/upload
- library.js:(anonymous /media/upload)  POST /media/upload
- media.js:saveSketch  POST /media/upload
- settings-wiring.js:commitCaptureImages  POST /media/upload
- settings-wiring.js:handleFileUpload  POST /media/upload

## board (whiteboard*.js)

- whiteboard-interchange.js:post  POST /whiteboard/sketches
- whiteboard-interchange.js:wbDrawioPlace  POST /whiteboard/sketches
- whiteboard-interchange.js:wbImportBoardRows  POST /whiteboard/sketches
- whiteboard-interchange.js:wbImportMermaid  POST /whiteboard/sketches
- whiteboard-interchange.js:wbMermaidPlaceNode  POST /whiteboard/sketches
- whiteboard-library.js:run  DELETE /board-library/libraries/${lib.id}
- whiteboard-library.js:wbLibImportFile  POST /board-library/import
- whiteboard-library.js:wbLibNewBoardFrom  POST /board-library/new-board
- whiteboard-library.js:wbLibNewLibrary  POST /board-library/libraries
- whiteboard-library.js:wbLibPlace  POST /whiteboard/boards/${boardId}/place
- whiteboard-library.js:wbLibReplace  PUT /board-library/${entry.ref.slice(5)}
- whiteboard-map.js:wbMapAdoptProvisional  POST /whiteboard/boards/${row.board_id}/nodes
- whiteboard-map.js:wbMapClearEveryTopic  POST /whiteboard/boards/${boardId}/nodes/clear-style
- whiteboard-map.js:wbMapClearToOneTopic  DELETE /whiteboard/objects/${root.id}
- whiteboard-map.js:wbMapCrossLinkToBranch  DELETE /whiteboard/sketches/${sketchId}
- whiteboard-map.js:wbMapCutCrossLink  DELETE /whiteboard/sketches/${sketchId}
- whiteboard-map.js:wbMapFromDocument  POST /whiteboard/boards/import
- whiteboard-map.js:wbMapPasteText  POST /whiteboard/boards/${boardId}/nodes/outline
- whiteboard-map.js:wbMapRemoveKeepingBranch  PUT /whiteboard/boards/${boardId}/nodes/move-many
- whiteboard-map.js:wbMapRestoreRows  POST /whiteboard/boards/${boardId}/nodes
- whiteboard-map.js:wbMapReverseCrossLink  PUT /whiteboard/sketches/${sketchId}
- whiteboard-map.js:wbMapReverseEdge  PUT /whiteboard/boards/${boardId}/nodes/${id}/move
- whiteboard-map.js:wbMapSetLayout  PUT /whiteboard/boards/${boardId}
- whiteboard-map.js:wbMapSetNumbered  PUT /whiteboard/boards/${boardId}
- whiteboard-map.js:wbMapSetTheme  PUT /whiteboard/boards/${boardId}
- whiteboard-map.js:wbMapSever  PUT /whiteboard/boards/${boardId}/nodes/${id}/move
- whiteboard-map.js:wbMapTakePicture  POST /media/upload
- whiteboard-map.js:wbMapWriteDocument  POST /documents
- whiteboard.js:createConceptMap  POST /whiteboard/boards
- whiteboard.js:createNewBoard  POST /board-library/new-board
- whiteboard.js:finish  PUT /whiteboard/boards/${boardId}
- whiteboard.js:initWhiteboard  POST /media/upload
- whiteboard.js:uploadToLibrary  POST /media/upload
- whiteboard.js:wbClearBoard  DELETE ${base}/${item.id}
- whiteboard.js:wbCloneConnect  POST /whiteboard/sketches
- whiteboard.js:wbCreateBlankBoard  POST /whiteboard/boards
- whiteboard.js:wbImportOutlineFile  POST /whiteboard/boards/import
- whiteboard.js:wbNewUntitledBoard  PUT /whiteboard/boards/${boardId}
- whiteboard.js:wbPlaceUploadedImage  POST /media/upload
- whiteboard.js:wbRestoreLinks  POST /whiteboard/sketches
