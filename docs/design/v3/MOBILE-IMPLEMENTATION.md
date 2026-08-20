# V3 mobile implementation decisions

These rules are implementation requirements, not optional responsive polish.

- The masthead precedes the product hero and uses the real NO3D dot wordmark.
- Druk is reserved for display headings. Doto is weight 700. Silka Mono is uppercase UI language. ASCII plates use a classic terminal monospace stack.
- Links and controls inherit the monochrome palette; default browser blue is prohibited.
- The catalog is an inline disclosure. Opening it increases document height and pushes following content down; closing it restores the prior flow. It never overlays content.
- Product identity appears before the hero on mobile.
- The hero block is horizontally centered. It must not carry a compensating left or right translation.
- Product specifications use a consistent one-pixel hairline system.
- Product function blocks use horizontal dividers only; no enclosing side borders.
- The ASCII node plate is pure text, 48 columns wide, and has no background panel.
- Input sockets replace the left boundary character and output sockets replace the right boundary character. The socket is centered on the boundary, not inset beside it.
- Gizmo-enabled values use `[^]`; the old crosshair is prohibited.
- Product description headings use the shared compact section-heading class, not an oversized display class.
- Paid products show price, Add to Library, and Get Full Catalog. The language presents acquisition as entry into the NO3D Tools library rather than an isolated file download. Products without an individual price omit the price block and let the two actions fill the row.
- Chain Generator is a presentation alias for the existing `chrome-crayon` catalog handle; it does not rename the backend identity.

## Account and onboarding

- Account creation is a conventional modal over the page that initiated onboarding, not a branded standalone microsite.
- The authenticated email is the Account page's first read and remains Druk. The library is the second read; supporting status uses the existing flat Silka/Doto hierarchy.
- Installation and connection happen in one compact, fixed wizard region inside the final Account layout. Each state shows only the decision or action needed at that moment.
- During required setup, the wizard uses the shared modal border and hard shadow while the rest of the Account surface remains visible, muted, and locked.
- Blender version selection is a vertical radio list. The choice determines native-extension versus legacy-ZIP installation; it is not a separate page.
- The normal Blender connection return automatically approves the pending short-lived device code for the signed-in identity. Manual code entry appears only as recovery.
- The library is populated only from the Commerce account summary. Empty is a legitimate state; sample or assumed free assets are prohibited in the real interface.
