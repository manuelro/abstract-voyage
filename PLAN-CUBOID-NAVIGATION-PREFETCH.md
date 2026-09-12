# Plan: Cuboid Navigation Prefetch

## Objective

Warm every mobile Cuboid Navigation destination early enough that selecting an
item in Face E can load the destination into Face A without an avoidable wait,
while preserving the existing route-complete return rotation.

## Context

`MobileNavCube` is persistent at the Pages Router app shell. Face E remains
visible while `router.push()` loads the selected destination; after
`routeChangeComplete`, the new page replaces Face A and the cuboid rotates back
to A.

The current Next.js version is 13.5.11. Its automatic `<Link>` prefetching is
not sufficient for this interaction:

- In production, viewport prefetching depends on the link being visible.
- Face E is `display: none` while the cuboid is closed.
- A timeline link's touch/hover prefetch happens only once the user has already
  reached Face E and selected an item.
- `router.prefetch()` warms page code and SSG data, but not necessarily every
  runtime asset requested by the destination.

## Strategy

### 1. Background warming after idle

When all of the following are true:

- Cuboid Navigation is enabled.
- The viewport is narrower than 768px.
- `router.isReady` is true.
- Initial page work has had an opportunity to settle.

Schedule a low-priority prefetch with `requestIdleCallback`, using a timeout
fallback for browsers without that API. Prefetch all navigation destinations
except the current route:

```text
/
/about
/journal
/contact
```

Use one shared, deduplicated prefetch coordinator so idle warming and explicit
user-intent warming cannot issue duplicate requests.

### 2. User-intent escalation

Run the same coordinator on the burger button's `pointerenter`, `focus`,
`touchstart`, and `openMenu` events. This is the last useful opportunity before
selection and provides the cuboid's opening sequence as additional lead time.

The current geometry provides approximately 2.7 seconds from opening Face E to
the end of its rotation and settle phases (`590ms + 590ms + 1500ms`). Opening
must remain immediate; prefetch readiness must never block the animation.

### 3. Network-aware policy

Do not perform speculative idle warming when the browser reports:

- `navigator.connection.saveData === true`
- `effectiveType === 'slow-2g'` or `'2g'`

Still run intent-driven prefetch after an explicit burger interaction. If a
destination is not ready when selected, retain the current fallback: Face E
stays visible until `routeChangeComplete`.

### 4. Readiness and failure handling

Track each destination as `idle`, `warming`, `ready`, or `failed`.

- Resolve successful entries when `router.prefetch()` completes.
- Clear failed entries so a later intent event can retry them.
- Use `Promise.allSettled()` for the batch; one failed destination must not
  prevent the others from warming.
- Do not add a visible loading message to Face E. `aria-busy` can expose the
  warming/route-pending state to assistive technology.

### 5. Route transition contract

The selection flow remains:

```text
Face E item selected
  -> mark route pending
  -> router.push(destination)
  -> destination page/component and data become current
  -> routeChangeComplete
  -> replace Face A content
  -> rotate E -> A
  -> restore focus and scrolling
```

If prefetch has completed, the transition should be near-immediate. If it has
not, the same sequence still works without revealing stale Face A content.

## Implementation Notes

- Keep the destination list as the single source of truth used by Face E and
  the prefetch coordinator.
- Exclude the current canonical route, treating `/abstract` and `/` as the
  same Home destination for deduplication.
- Re-run a low-priority top-up after a route completes so any remaining
  destinations are warmed from the new page context.
- Use production builds for verification; Next.js intentionally disables
  `router.prefetch()` in development.
- Do not mount hidden destination pages merely to make their runtime effects
  load. Prefetch route code/data instead.

## Acceptance Criteria

- With Cuboid Navigation disabled, no prefetch work is scheduled.
- On a capable mobile connection, all non-current navigation routes enter the
  ready state during idle time or burger intent before selection.
- Selecting a ready destination begins navigation without waiting for a second
  fetch.
- Selecting a still-warming destination keeps Face E visible until the route is
  complete, then reveals the updated Face A through the return rotation.
- A failed prefetch can be retried and does not break navigation.
- Tablet and larger viewports do not schedule mobile Cuboid prefetching.
- `saveData` and constrained connections avoid speculative background work.
- Browser verification confirms the destination DOM is present in Face A before
  the return rotation starts.

## Risks

- Speculative warming consumes bandwidth on users who never open the menu.
- Slow connections may not finish all destinations before selection; the route
  pending fallback remains necessary.
- Prefetch does not guarantee that images, WebGL resources, or component-owned
  runtime requests are already complete.
- Because this runs at the app shell, the navigation coordinator must remain
  side-effect free when the feature is disabled and on non-mobile viewports.
