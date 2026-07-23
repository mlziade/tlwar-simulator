# tldraw Offline — Developer Reference

A comprehensive reference for building scripted and agent-driven applications with **tldraw offline**. Covers the desktop app itself, the local HTTP API exposed to agents, document scripts, the tldraw SDK Editor API, custom shapes, custom tools, toolbar customisation, and the `.tldraw` file format.

---

## Table of Contents

1. [What is tldraw offline?](#1-what-is-tldraw-offline)
2. [Installation and Platforms](#2-installation-and-platforms)
3. [The .tldraw File Format](#3-the-tldraw-file-format)
4. [Agent Integration and the Local HTTP API](#4-agent-integration-and-the-local-http-api)
5. [Document Scripts](#5-document-scripts)
6. [The Editor API](#6-the-editor-api)
7. [Custom Shapes (ShapeUtil)](#7-custom-shapes-shapeutil)
8. [Custom Tools (StateNode)](#8-custom-tools-statenode)
9. [UI and Toolbar Customisation](#9-ui-and-toolbar-customisation)
10. [Persistence, Snapshots, and Assets](#10-persistence-snapshots-and-assets)
11. [Events, Signals, and Reactive State](#11-events-signals-and-reactive-state)
12. [Built-in Shape Types and Their Props](#12-built-in-shape-types-and-their-props)
13. [Performance Characteristics and Known Limits](#13-performance-characteristics-and-known-limits)
14. [Security Considerations](#14-security-considerations)
15. [Further Reading](#15-further-reading)

---

## 1. What is tldraw offline?

> "A local whiteboard for you and your agents."

**tldraw offline** is a cross-platform desktop application (macOS, Windows, Linux) built on top of the open-source [tldraw SDK](https://tldraw.dev). It provides an infinite-canvas whiteboarding and diagramming environment with no accounts, no servers, and no internet requirement. Documents are stored as portable `.tldraw` files on the local file system.

Key properties at a glance:

| Property | Detail |
|---|---|
| Canvas model | Infinite canvas, multi-page |
| File format | `.tldraw` (JSON, cross-platform) |
| Network requirement | None |
| Agent / AI support | Yes — local HTTP API per document |
| Scripting | Embedded JavaScript ("document scripts") |
| Source availability | Proprietary — not open source |
| License | All rights reserved |

The app is built on the [tldraw SDK](https://tldraw.dev) and therefore shares the same Editor API, shape model, and rendering pipeline as the web-based SDK. Everything you can do with the SDK's `Editor` class can be done from a document script or an agent connected through the local API.

---

## 2. Installation and Platforms

Download from [offline.tldraw.com](https://offline.tldraw.com) or the [GitHub releases page](https://github.com/tldraw/tldraw-offline/releases/latest). The app checks for updates automatically on startup.

| Platform | Available builds |
|---|---|
| macOS | Universal DMG (Apple silicon + Intel) |
| Windows | Installer for x64 or Arm64 |
| Linux | AppImage for x64 or Arm64; Debian package for x64 |

**Get started:**
1. Open tldraw offline and select **New file**.
2. Draw, add text and media, or build a diagram on the canvas.
3. Choose **File → Save** and select a name and location.
4. Reopen the document from the Home screen, the application menu, or your file browser.

Each document opens in its own window. The app automatically keeps working copies of open documents and can restore unsaved work after an unexpected exit. Recovery is not a replacement for saving and backing up files.

---

## 3. The .tldraw File Format

`.tldraw` is the native and preferred file format. It is a JSON file containing:

- **Canvas data** — all shapes on all pages
- **Pages** — the page records (name, order)
- **Embedded media** — images, videos, and other assets stored directly in the file
- **Document scripts** — embedded JavaScript that runs when the file is opened

Files work across macOS, Windows, and Linux.

**Legacy format:** Legacy `.tldr` files can be opened and exported. Opening one imports it as a new, unsaved `.tldraw` document; the original `.tldr` is left unchanged. Note that the tldraw VS Code extension uses `.tldr`, so `.tldraw` files must be renamed to `.tldr` to open them in that extension (tracked in [issue #76](https://github.com/tldraw/tldraw-offline/issues/76)).

**Important external-edit warning:**

> tldraw offline does not currently merge changes made to an open file by another program, sync client, Git operation, or computer. Close the document before replacing it externally, then reopen it.

### Snapshot / store shape

At the SDK level the document state is represented as a versioned JSON snapshot. You can capture and restore it with `getSnapshot` / `loadSnapshot`:

```typescript
import { getSnapshot, loadSnapshot } from 'tldraw'

// Export the current document to a plain JS object
const { document, session } = getSnapshot(editor.store)

// Restore from a previously exported snapshot
loadSnapshot(editor.store, { document })
```

- `document` — shapes, pages, bindings, assets; safe to persist server-side
- `session` — camera position, current selection, UI state; local per-user

The store uses automatic migrations: loading an older snapshot upgrades the schema transparently.

---

## 4. Agent Integration and the Local HTTP API

### Overview

tldraw offline exposes a **per-document local HTTP server** that coding agents (Claude Code, Codex, OpenCode, Pi, and others) use to read and write the canvas. Each document window starts its own HTTP listener on a random port when opened.

### server.json

The application writes a `server.json` file to the installation data directory (e.g., `/opt/tldraw/@tldesktop/` on Linux). This file records the **latest active port** so that agents can discover where to connect.

Example structure (inferred from [issue #60](https://github.com/tldraw/tldraw-offline/issues/60)):

```json
{
  "port": 42175
}
```

> **Known issue:** `server.json` records only the most recent port. If multiple documents are open, older ports used by earlier windows are not listed. Stale processes can also continue occupying ports after their document window is closed (issue [#60](https://github.com/tldraw/tldraw-offline/issues/60)).

The local HTTP listener responds with a document array. An example response for an idle (no-document) process looks like:

```
port=42175  pid=305529  docs=[]
```

### Agent setup

From the README:

> tldraw offline can work with coding agents such as Codex, Claude Code, Pi, and OpenCode. An agent can inspect an open canvas, make changes, and create reusable document scripts that add new behavior to a file.

Installation for agent access is done from inside the app (there is a button labelled something like "Install for agents"). On Windows the location of the installed files was unclear to some users (see [issue #74](https://github.com/tldraw/tldraw-offline/issues/74)); consult the user manual linked in [Section 15](#15-further-reading) for platform-specific setup steps.

### api.getScreenshot

One confirmed API method that agents call is `api.getScreenshot`. It captures the current canvas state as an image file written to a temporary directory path in the format:

```
<tmp>/tldraw-canvas-api/screenshot-<docId>-<timestamp>.jpg
```

**Known bug on Windows (issue [#84](https://github.com/tldraw/tldraw-offline/issues/84)):** Document IDs contain colons (`tldr:file:<base64>`) which are illegal in Windows filenames, causing `ENOENT`/`EINVAL` errors. The base64 encoding can also include forward slashes when paths contain non-ASCII characters, which breaks the path on all platforms.

---

## 5. Document Scripts

Document scripts are **JavaScript programs embedded directly in a `.tldraw` file**. They run automatically when the file is opened and can add persistent new behaviour to a document.

### What scripts can do

- Read and write all shapes on the canvas via the tldraw Editor API
- Respond to canvas events (shape changes, user input, page switches)
- Register custom shape types and tools that activate for this document only
- Expose custom toolbar buttons or menu items
- Call the local HTTP API for inter-process communication

### Scripting model

An agent (e.g., Claude Code) creates a document script by writing JavaScript into the script section of the `.tldraw` file. The script receives the `editor` instance as its entry point and has access to the full tldraw SDK surface.

The typical pattern is to:
1. Register any custom shape utils or tools
2. Subscribe to store or editor events to react to changes
3. Optionally add UI overrides for custom toolbar buttons

> **Security note:** Scripts stored in a `.tldraw` file run when the file is opened. Only open files from sources you trust.

---

## 6. The Editor API

The `Editor` class is the primary interface for programmatic canvas control. An instance is available in scripts via the `onMount` callback or the `useEditor` hook (within JSX context).

```typescript
// In a React component within the Tldraw tree
const editor = useEditor()

// Via the onMount prop
<Tldraw onMount={(editor) => { /* editor is available here */ }} />
```

### Batching changes with Editor.run()

Batch multiple operations into a single transaction for performance and unified undo/redo:

```typescript
editor.run(() => {
  editor.updateShapes([
    { id: shape1.id, type: 'geo', x: 100 },
    { id: shape2.id, type: 'geo', x: 200 },
  ])
  editor.createBinding({ type: 'arrow', fromId: arrow.id, toId: targetShape.id })
  editor.setCamera({ x: 0, y: 0, z: 1 })
})
// All changes committed as one operation; a single undo reverses all of them
```

History mode options for `run()`:

| Mode | Behaviour |
|---|---|
| `'record'` (default) | Adds to undo stack, clears redo |
| `'record-preserveRedoStack'` | Adds to undo, keeps redo |
| `'ignore'` | Skips undo stack entirely |

```typescript
editor.run(
  () => { editor.updateShape({ id: myShapeId, type: 'geo', x: 100 }) },
  { history: 'ignore' }
)
```

### Shape CRUD

```typescript
import { createShapeId } from 'tldraw'

// Create a geo (rectangle) shape
editor.createShape({
  id: createShapeId('my-box'),
  type: 'geo',
  x: 128,
  y: 128,
  props: {
    geo: 'rectangle',
    w: 120,
    h: 100,
    dash: 'draw',
    color: 'blue',
    size: 'm',
  },
})

// Update a shape's props
const shape = editor.getShape(id)
editor.updateShape({
  id,
  type: 'geo',
  props: { h: shape.props.h * 2 },
})

// Delete shapes
editor.deleteShape(id)
editor.deleteShapes([id1, id2])

// Duplicate shapes with optional offset
editor.duplicateShapes(['box1', 'box2'], { x: 8, y: 8 })
```

### Querying shapes

```typescript
// All shapes on the current page
const shapes = editor.getCurrentPageShapes()

// A specific shape by ID
const shape = editor.getShape(shapeId)

// Shapes within a bounding box
const idsInBounds = editor.getShapeIdsInsideBounds({ x, y, w, h })

// Find the shape under a point
const hit = editor.getShapeAtPoint({ x: 200, y: 150 })
```

### Selection

```typescript
editor.select(id)                    // select one shape
editor.selectAll()                   // select every shape on the page
editor.selectNone()                  // clear selection
editor.setSelectedShapes([id1, id2]) // replace the selection
const ids = editor.getSelectedShapeIds()
```

### Transform and arrange

```typescript
editor.rotateShapesBy([id], Math.PI / 8)         // rotate by radians
editor.resizeShape(id, { scaleX: 2, scaleY: 1 }) // resize
editor.flipShapes([id], 'horizontal')             // mirror
editor.alignShapes([id1, id2], 'left')            // alignment options: left | right | top | bottom | center-horizontal | center-vertical
editor.distributeShapes([id1, id2], 'horizontal') // even spacing
editor.stackShapes([id1, id2], 'vertical', 16)   // stack with gap
editor.bringToFront([id])
editor.sendToBack([id])
editor.bringForward([id])
editor.sendBackward([id])
```

### Grouping and frames

```typescript
editor.groupShapes([id1, id2])   // create a group
editor.ungroupShapes([groupId])  // dissolve group

// Create a frame (named container with clipping)
editor.createShape({
  type: 'frame',
  x: 0, y: 0,
  props: { w: 500, h: 400, name: 'My Frame' },
})
```

### Pages

```typescript
editor.createPage({ name: 'Page 2' })
editor.deletePage(pageId)
editor.renamePage(pageId, 'New Name')
editor.duplicatePage(pageId)
editor.setCurrentPage(pageId)

const pages = editor.getPages()
const currentPage = editor.getCurrentPage()
```

### Camera and viewport

```typescript
editor.zoomIn()
editor.zoomOut()
editor.resetZoom()
editor.zoomToFit()
editor.zoomToSelection()
editor.zoomToBounds({ x, y, w, h })
editor.setCamera({ x: 0, y: 0, z: 1 })   // z is zoom level
editor.centerOnPoint({ x: 100, y: 100 })
editor.slideCamera({ x: 10, y: 0 })       // animate camera pan

const zoom = editor.getZoomLevel()
const viewportBounds = editor.getViewportPageBounds()
```

### Coordinate conversion

```typescript
editor.screenToPage({ x: 300, y: 200 })  // screen px → page coords
editor.pageToScreen({ x: 100, y: 100 })  // page coords → screen px
editor.getPointInShapeSpace(shape, pagePoint) // page → shape-local
```

### History / Undo-Redo

```typescript
editor.undo()
editor.redo()
editor.canUndo()
editor.canRedo()
editor.clearHistory()

const markId = editor.markHistoryStoppingPoint('before drag')
// ... make changes ...
editor.bailToMark(markId)     // revert to mark, discard redo
editor.squashToMark(markId)   // compress all changes since mark into one step
```

### Styling

```typescript
editor.setStyleForSelectedShapes(DefaultColorStyle, 'blue')
editor.setStyleForNextShapes(DefaultColorStyle, 'red')
editor.setOpacityForSelectedShapes(0.5)
```

### Export

```typescript
// Export as PNG blob
const blob = await editor.toImage([shapeId1, shapeId2], {
  format: 'png',
  scale: 2,
  background: true,
})

// Export as SVG string
const svg = await editor.getSvgString([shapeId], { background: false })

// Get a data URL
const dataUrl = await editor.toImageDataUrl([shapeId], { format: 'jpeg' })
```

### Bindings (connecting shapes)

```typescript
// Create an arrow binding
editor.createBinding({
  type: 'arrow',
  fromId: arrowShapeId,
  toId: targetShapeId,
  props: { normalizedAnchor: { x: 0.5, y: 0.5 } },
})

// Query bindings
const outgoing = editor.getBindingsFromShape(shapeId, 'arrow')
const incoming = editor.getBindingsToShape(shapeId, 'arrow')
const all     = editor.getBindingsInvolvingShape(shapeId)

editor.deleteBinding(bindingId)
```

### Animations

```typescript
editor.animateShape(shapeId, {
  x: 200,
  y: 300,
  props: { w: 200, h: 200 },
}, { duration: 500, easing: 'ease-in-out' })
```

---

## 7. Custom Shapes (ShapeUtil)

Custom shapes are defined by extending the `ShapeUtil` abstract class and registering the util with the `<Tldraw>` component (or with the document's editor in a script context).

### Type declaration

```typescript
import { TLShape } from 'tldraw'

const CARD_TYPE = 'card'

// Augment the global type map so TypeScript knows about your shape's props
declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [CARD_TYPE]: { w: number; h: number; title: string }
  }
}

type CardShape = TLShape<typeof CARD_TYPE>
```

### ShapeUtil implementation

```typescript
import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  RecordProps,
} from 'tldraw'

class CardShapeUtil extends ShapeUtil<CardShape> {
  // Required: the string type identifier
  static override type = CARD_TYPE as const

  // Validators run on every create/update to reject bad data
  static override props: RecordProps<CardShape> = {
    w: T.number,
    h: T.number,
    title: T.string,
  }

  // Provide sensible defaults for new instances
  override getDefaultProps(): CardShape['props'] {
    return { w: 200, h: 120, title: 'New Card' }
  }

  // Geometry object drives hit-testing and bounds calculation
  override getGeometry(shape: CardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  // The React component that renders the shape on the canvas
  override component(shape: CardShape) {
    return (
      <HTMLContainer>
        <div style={{
          width: shape.props.w,
          height: shape.props.h,
          padding: 12,
          border: '2px solid #333',
          borderRadius: 8,
          background: '#fff',
        }}>
          <h3 style={{ margin: 0 }}>{shape.props.title}</h3>
        </div>
      </HTMLContainer>
    )
  }

  // Drawn as a highlight when the shape is selected or hovered
  override getIndicatorPath(shape: CardShape) {
    const path = new Path2D()
    path.rect(0, 0, shape.props.w, shape.props.h)
    return path
  }

  // Text content exposed for screen readers and AI
  override getText(shape: CardShape) {
    return shape.props.title
  }

  // Interaction capability flags
  override canResize() { return true }
  override canEdit()   { return false }
}
```

### Registering the shape

```typescript
<Tldraw
  shapeUtils={[CardShapeUtil]}
  onMount={(editor) => {
    editor.createShape({ type: 'card', x: 100, y: 100 })
  }}
/>
```

### Lifecycle hooks on ShapeUtil

| Hook | When it fires |
|---|---|
| `onBeforeCreate(shape)` | Before the shape record is written to the store |
| `onAfterCreate(shape)` | After the shape is in the store |
| `onBeforeChange(prev, next)` | Before a property update; return a modified shape to override |
| `onAfterChange(prev, next)` | After a property update |
| `onResize(shape, info)` | During resize; use `resizeBox` helper for box-like shapes |
| `onRotate(initial, current)` | During rotation |
| `onTranslate(initial, current)` | During drag/move |
| `onChildrenChange(shape)` | When child shapes are added/removed |
| `onDoubleClick(shape)` | On double-click; return a partial to update props |
| `onDragShapesOver(shape, dragged)` | Shapes dragged over this one |
| `onDropShapesOver(shape, dragged)` | Shapes dropped onto this one |

### Capability flags

```typescript
override canEdit()                   { return false }
override canResize()                 { return true }
override canCrop()                   { return false }
override canBind({ toShapeType })    { return true }   // allows arrows to bind
override canScrollContent()          { return false }
override canReceiveNewChildrenOfType(type) { return type === 'text' }
override isAspectRatioLocked()       { return false }
override hideResizeHandles()         { return false }
override hideRotateHandle()          { return false }
```

### Prop validators (the T library)

```typescript
import { T } from 'tldraw'

static override props = {
  text:      T.string,
  count:     T.number,
  visible:   T.boolean,
  color:     T.literalEnum('red', 'blue', 'green'),
  nullable:  T.string.nullable(),
  position:  T.object({ x: T.number, y: T.number }),
  items:     T.arrayOf(T.string),
}
```

### Animations in custom shapes

Implement `getInterpolatedProps` to control how a shape's props animate between keyframes:

```typescript
override getInterpolatedProps(
  startShape: CardShape,
  endShape: CardShape,
  t: number              // 0 → 1 easing progress
): CardShape['props'] {
  return {
    w: startShape.props.w + (endShape.props.w - startShape.props.w) * t,
    h: startShape.props.h + (endShape.props.h - startShape.props.h) * t,
    title: t < 0.5 ? startShape.props.title : endShape.props.title,
  }
}
```

### Geometry classes

| Class | Use case |
|---|---|
| `Rectangle2d` | Axis-aligned rectangles |
| `Circle2d` | True circles |
| `Ellipse2d` | Ellipses |
| `Polygon2d` | Closed polygons |
| `Polyline2d` | Open paths |
| `Arc2d` | Circular arcs |
| `Stadium2d` | Rounded rectangles (pill shapes) |
| `Group2d` | Composite geometry (combine multiple primitives) |

---

## 8. Custom Tools (StateNode)

A **tool** is a top-level state in the editor's state chart. Extend `StateNode` to define how the editor responds to pointer, keyboard, and other events while your tool is active.

```typescript
import { StateNode, TLPointerEventInfo, Tldraw, createShapeId } from 'tldraw'

class StampTool extends StateNode {
  static override id = 'stamp'

  // Called whenever this tool becomes the active tool
  override onEnter() {
    this.editor.setCursor({ type: 'cross' })
  }

  // Called when the tool is deactivated
  override onExit() {
    this.editor.setCursor({ type: 'default' })
  }

  override onPointerDown(info: TLPointerEventInfo) {
    const { x, y } = this.editor.inputs.currentPagePoint
    this.editor.createShape({
      id: createShapeId(),
      type: 'geo',
      x,
      y,
      props: { geo: 'star', w: 50, h: 50, color: 'yellow', fill: 'solid' },
    })
  }

  // Keyboard shortcut handler
  override onKeyDown(info: TLKeyboardEventInfo) {
    if (info.key === 'Escape') this.editor.setCurrentTool('select')
  }
}

export default function App() {
  return (
    <Tldraw
      tools={[StampTool]}
      onMount={(editor) => {
        editor.setCurrentTool('stamp')
      }}
    />
  )
}
```

### Available event handlers on StateNode

| Handler | Event type |
|---|---|
| `onPointerDown(info)` | Mouse/touch press |
| `onPointerMove(info)` | Mouse/touch move |
| `onPointerUp(info)` | Mouse/touch release |
| `onDoubleClick(info)` | Double-click |
| `onRightClick(info)` | Right-click |
| `onKeyDown(info)` | Key pressed |
| `onKeyUp(info)` | Key released |
| `onWheel(info)` | Scroll wheel |
| `onCancel()` | Escape / cancel |
| `onComplete()` | Enter / finish |
| `onInterrupt()` | Interrupted by another tool |
| `onEnter(info)` | Tool activated |
| `onExit(info)` | Tool deactivated |
| `onTick(elapsed)` | Frame tick (60+ fps) |

### Switching tools programmatically

```typescript
editor.setCurrentTool('select')
editor.setCurrentTool('hand')
editor.setCurrentTool('draw')
editor.setCurrentTool('stamp')     // your custom tool
editor.getCurrentToolId()          // returns the active tool's id string
```

---

## 9. UI and Toolbar Customisation

The `<Tldraw>` component accepts an `overrides` prop of type `TLUiOverrides`. This is the primary way to add custom toolbar buttons, remap keyboard shortcuts, and build custom menus.

### Adding a custom action

```typescript
import { Tldraw, TLUiOverrides } from 'tldraw'

const overrides: TLUiOverrides = {
  actions(editor, actions, helpers) {
    // Add a new action
    actions['export-png'] = {
      id: 'export-png',
      label: 'action.export-png',   // key looked up in translations
      kbd: 'cmd+shift+e,ctrl+shift+e',
      async onSelect(source) {
        const blob = await editor.toImage(editor.getSelectedShapeIds(), {
          format: 'png',
          scale: 2,
        })
        // ... download blob
        helpers.addToast({ title: 'Exported!' })
      },
    }
    return actions
  },
}

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw overrides={overrides} />
    </div>
  )
}
```

### Customising the toolbar

```typescript
const overrides: TLUiOverrides = {
  toolbar(editor, toolbar, helpers) {
    // Remove the draw tool from the toolbar
    return toolbar.filter((item) => item.id !== 'draw')
  },
}
```

### Customising menus

```typescript
const overrides: TLUiOverrides = {
  menu(editor, menu, helpers) {
    // Remove the preferences menu entry
    return menu.filter((item) => item.id !== 'preferences')
  },
}
```

### Custom menu components

```typescript
import {
  TldrawUiMenuGroup,
  TldrawUiMenuActionItem,
  TldrawUiMenuActionCheckboxItem,
} from 'tldraw'

function MyCustomMenu() {
  return (
    <TldrawUiMenuGroup id="custom">
      <TldrawUiMenuActionItem actionId="undo" />
      <TldrawUiMenuActionItem actionId="redo" />
      <TldrawUiMenuActionItem actionId="export-png" />
      <TldrawUiMenuActionCheckboxItem actionId="toggle-snap" />
    </TldrawUiMenuGroup>
  )
}
```

### Replacing entire UI component slots

Pass the `components` prop to replace or hide individual UI zones:

```typescript
<Tldraw
  components={{
    Toolbar: MyCustomToolbar,   // replace toolbar entirely
    MenuPanel: null,            // hide the menu panel
    HelpMenu: null,             // hide help menu
  }}
/>
```

### Hooks for reading UI state

```typescript
const actions  = useActions()   // all registered actions
const tools    = useTools()     // all registered tools
const editor   = useEditor()    // editor instance
const bp       = useBreakpoint() // responsive breakpoint index
```

### Listening to UI events

```typescript
<Tldraw
  onUiEvent={(name, data) => {
    console.log('UI event:', name, data)
  }}
/>
```

### Hiding the entire UI

```typescript
<Tldraw hideUi />
// All toolbars, menus, and keyboard shortcuts are removed
// Programmatic editor control still works normally
```

---

## 10. Persistence, Snapshots, and Assets

### Local persistence (IndexedDB)

```typescript
<Tldraw persistenceKey="my-document" />
// Automatically saves to IndexedDB; syncs across browser tabs sharing the key
```

### Manual snapshots for custom backends

```typescript
import { getSnapshot, loadSnapshot } from 'tldraw'

// Save
const { document, session } = getSnapshot(editor.store)
await myDb.save(JSON.stringify(document))

// Load
const doc = JSON.parse(await myDb.load())
loadSnapshot(editor.store, { document: doc })
editor.clearHistory()
```

### Creating a store externally

```typescript
import { createTLStore, loadSnapshot, Tldraw } from 'tldraw'

const store = createTLStore()
const saved = localStorage.getItem('my-drawing')
if (saved) {
  loadSnapshot(store, JSON.parse(saved))
}

return <Tldraw store={store} />
```

### Custom asset storage

Implement `TLAssetStore` to control where embedded media is stored:

```typescript
import { TLAssetStore } from 'tldraw'

const assetStore: TLAssetStore = {
  // Called when a user pastes or drags in a file
  async upload(asset, file) {
    const url = await uploadToMyServer(file)
    return { src: url }
  },

  // Called when the editor needs to render an asset
  resolve(asset, ctx) {
    return asset.props.src
  },

  // Called when assets are deleted from the document
  async remove(assetIds) {
    await deleteFromMyServer(assetIds)
  },
}

<Tldraw assets={assetStore} />
```

### Schema migrations

Custom shape prop changes over time are handled with migration sequences:

```typescript
import { createShapePropsMigrationSequence } from 'tldraw'

class MyShapeUtil extends ShapeUtil<MyShape> {
  static override migrations = createShapePropsMigrationSequence({
    sequence: [
      {
        id: 'my-shape/add-color',
        up(props) { props.color = 'blue' },
        down(props) { delete props.color },
      },
    ],
  })
}
```

---

## 11. Events, Signals, and Reactive State

### Subscribing to editor events

```typescript
// Subscribe
editor.on('change', (entry) => {
  const { added, updated, removed } = entry.changes
  console.log('Shapes changed:', added, updated, removed)
})

// Unsubscribe
editor.off('change', handler)
```

### Event categories

| Category | Events |
|---|---|
| Input | `pointer_down`, `pointer_move`, `pointer_up`, `click`, `key_down`, `key_up`, `wheel`, `pinch_*` |
| Shape | `created-shapes`, `edited-shapes`, `deleted-shapes` |
| Store | `change` (fires on every store transaction) |
| Frame | `tick`, `frame` (60+ fps) |
| Lifecycle | `mount`, `dispose`, `crash`, `update` |

```typescript
// Low-level store listener (finer control)
const cleanup = editor.store.listen(
  (entry) => {
    const { added, updated, removed } = entry.changes
  },
  { source: 'user', scope: 'all' }
)
cleanup() // call to unsubscribe
```

### Reactive signals

The tldraw state library uses **atoms**, **computed values**, and **effects**:

```typescript
import { atom, computed, react } from '@tldraw/state'

// Atom: mutable container
const count = atom('count', 0)
count.get()            // read
count.set(1)           // write
count.update(n => n+1) // update with function

// Computed: derived, cached, lazy
const doubled = computed('doubled', () => count.get() * 2)

// Effect: side effect that re-runs when dependencies change
const stop = react('log-count', () => {
  console.log('count is', count.get())
})
stop() // unsubscribe
```

### React integration

```typescript
import { useValue, track, useAtom } from '@tldraw/state-react'

// Read a signal and re-render when it changes
const shapeCount = useValue(
  'shape-count',
  () => editor.getCurrentPageShapes().length,
  [editor]
)

// Wrap a component to auto-track signal reads during render
const MyComponent = track(function MyComponent() {
  const shapes = editor.getCurrentPageShapes()
  return <div>{shapes.length} shapes</div>
})
```

---

## 12. Built-in Shape Types and Their Props

tldraw offline includes all 13 default shape types from the SDK:

| Type | Category | Key Props |
|---|---|---|
| `geo` | Drawing | `geo` (rectangle/ellipse/etc), `w`, `h`, `color`, `fill`, `dash`, `size`, `text` |
| `text` | Text | `text`, `color`, `size`, `font`, `align`, `autoSize` |
| `note` | Text | `text`, `color`, `size`, `font` |
| `draw` | Drawing | `segments`, `color`, `fill`, `dash`, `size`, `isPen` |
| `line` | Drawing | `points`, `color`, `dash`, `size`, `spline` |
| `highlight` | Drawing | `segments`, `color`, `size` |
| `arrow` | Connector | `start`, `end`, `bend`, `color`, `arrowheadStart`, `arrowheadEnd`, `text` |
| `frame` | Structural | `w`, `h`, `name` |
| `group` | Structural | *(no custom props; children managed by parent-child relationship)* |
| `image` | Media | `assetId`, `w`, `h`, `crop`, `flipX`, `flipY` |
| `video` | Media | `assetId`, `w`, `h`, `time` |
| `bookmark` | Media | `url`, `assetId`, `w`, `h` |
| `embed` | Media | `src`, `w`, `h` |

The `geo` shape supports 20 sub-geometries via its `geo` prop: `rectangle`, `ellipse`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `star`, `rhombus`, `rhombus-2`, `oval`, `trapezoid`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `x-box`, `check-box`, `cloud`, `heart`.

### Creating geo shapes

```typescript
editor.createShape({
  type: 'geo',
  x: 100,
  y: 100,
  props: {
    geo: 'rectangle',
    w: 200,
    h: 150,
    color: 'blue',
    fill: 'solid',
    dash: 'draw',
    size: 'm',
    text: 'Hello',
  },
})
```

### Creating text shapes

```typescript
import { toRichText } from 'tldraw'

editor.createShape({
  type: 'text',
  x: 50,
  y: 50,
  props: {
    richText: toRichText('Hello, world!'),
    color: 'black',
    size: 'l',
    font: 'sans',
    align: 'middle',
  },
})
```

### Creating arrows

```typescript
editor.createShape({
  type: 'arrow',
  x: 0,
  y: 0,
  props: {
    start: { type: 'point', x: 0, y: 0 },
    end:   { type: 'point', x: 200, y: 100 },
    color: 'black',
    arrowheadEnd: 'arrow',
    arrowheadStart: 'none',
  },
})
```

---

## 13. Performance Characteristics and Known Limits

### Document size

No hard limits are documented, but performance degrades with very large numbers of shapes or embedded media. The tldraw SDK is optimised for interactive use cases (thousands of shapes) rather than data-heavy batch processing (tens of thousands).

### Viewport culling

The editor automatically culls shapes outside the current viewport: off-screen shapes are not rendered. Check culling state with:

```typescript
const culled = editor.getCulledShapes()      // Set<TLShapeId>
const notVisible = editor.getNotVisibleShapes()
```

### External file changes

> tldraw offline does not currently merge changes made to an open file by another program, sync client, Git operation, or computer.

Always close the document window before making external edits (e.g., programmatic writes from a script, Git checkout, sync client), then reopen.

### Local HTTP API — port management

Each open document spawns its own HTTP listener process. Stale processes can accumulate if documents are closed without the server process being terminated (issue [#60](https://github.com/tldraw/tldraw-offline/issues/60)). `server.json` only tracks the most recent port, so older ports are invisible to agents; port accumulation can cause resource exhaustion over long sessions.

### Multi-file tabs

Native multi-file tabs within a single window are not yet supported; each document opens in its own window (feature request [#56](https://github.com/tldraw/tldraw-offline/issues/56)).

### Platform-specific known issues

| Issue | Platform | Status |
|---|---|---|
| Menu bar missing | Windows | Open ([#77](https://github.com/tldraw/tldraw-offline/issues/77)) |
| App fails to launch (macOS 26 Tahoe) | macOS | Open ([#79](https://github.com/tldraw/tldraw-offline/issues/79)) |
| `api.getScreenshot` fails — colons in doc ID on Windows | Windows | Open ([#84](https://github.com/tldraw/tldraw-offline/issues/84)) |
| Hamburger menu missing in Linux AppImage | Linux | Open ([#71](https://github.com/tldraw/tldraw-offline/issues/71)) |
| `.tldraw` files not readable by VS Code tldraw extension | Cross-platform | Open ([#76](https://github.com/tldraw/tldraw-offline/issues/76)); workaround: rename to `.tldr` |

---

## 14. Security Considerations

From the README:

> This is powerful by design. An agent with access to the app can read and edit your documents, and scripts stored in a `.tldraw` file can run when the file is opened. Only grant access to agents you trust and only open files from sources you trust.

Practical rules:

1. **Agent access** — Only install agent integrations from the tldraw app's own setup flow. Be aware that an agent with access to the local HTTP API can read and modify all open documents.
2. **File provenance** — Do not open `.tldraw` files from untrusted sources; embedded document scripts execute automatically on open.
3. **Asset security** — When building custom asset storage, the SDK recommends: SVG sanitisation (strips scripts and event handlers), a restrictive Content Security Policy, and serving user uploads from a separate domain.

---

## 15. Further Reading

| Resource | URL |
|---|---|
| tldraw offline user manual (Notion) | https://tldraw.notion.site/User-manual-tldraw-offline-39a3e4c324c080e7b2eacc5afd078e85 |
| tldraw offline GitHub repo | https://github.com/tldraw/tldraw-offline |
| tldraw offline GitHub releases | https://github.com/tldraw/tldraw-offline/releases/latest |
| tldraw offline download page | https://offline.tldraw.com |
| tldraw SDK documentation | https://tldraw.dev |
| tldraw SDK quick start | https://tldraw.dev/quick-start |
| Editor class reference | https://tldraw.dev/reference/editor/Editor |
| Shapes documentation | https://tldraw.dev/docs/shapes |
| Tools documentation | https://tldraw.dev/docs/tools |
| User interface documentation | https://tldraw.dev/docs/user-interface |
| Persistence documentation | https://tldraw.dev/docs/persistence |
| AI integrations documentation | https://tldraw.dev/docs/ai |
| tldraw SDK LLM-optimised docs (full) | https://tldraw.dev/llms-full.txt |
| tldraw SDK LLM-optimised docs (features only) | https://tldraw.dev/llms-docs.txt |
| tldraw SDK LLM-optimised docs (examples) | https://tldraw.dev/llms-examples.txt |
| tldraw Discord community | https://discord.tldraw.com |
| tldraw on X/Twitter | https://x.com/tldraw |

---

*This document was compiled from the tldraw offline README, GitHub issues, the tldraw SDK documentation at tldraw.dev, and the tldraw LLM-optimised documentation files. The tldraw offline Notion user manual (linked above) is the authoritative source for installation details, agent setup steps, keyboard shortcuts, and troubleshooting — consult it for anything not covered here.*
