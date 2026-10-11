# TreasureTrove: the parts atelier

## Direction before implementation

An airy physical collection, influenced by Bauhaus shape construction, printed comic ink and the precision of exploded engineering drawings. The parts themselves are the focal point. No persistent sidebar, framed product pictures, decorative dashboard tiles, or corporate blue palette.

- Paper `#f5f2e8`, ink `#292a24`, leaf `#c4d6b0`, persimmon `#c65336`, butter `#ebca68`, lilac `#cdbedf`.
- Bricolage Grotesque: expressive headings and readable interface. DM Mono: part IDs and quantities where aligned numbers help.
- Desktop composition: compact brand/account header; collection title and search; horizontal purpose tokens; airy four-column object shelf; compact list alternative. Centered inspector puts a large transparent cutout beside editable stock. New-component form places the image beside required fields, with optional fields disclosed below.
- One memorable graphic: an original, interactive exploded IC illustration. Ink outlines, geometric masses and local halftone reflect the references. Real part images have transparent surroundings everywhere.
- Motion responds to actions: purpose selection slides into place; filtered parts rearrange; opening a part grows from its origin; stock digits roll with a small confirmation pulse; the IC separates and reassembles on request. Reduced motion uses immediate state changes.

```
brand                                        sync / account
The collection.                [ search........ / ] [+ Add]
(All) (Power) (Sensing) (Control) (Signals) (Drive) ...
All parts / In stock / Out of stock              sort / view
    cutout          cutout          cutout          cutout
    ID / name       ID / name       ID / name       ID / name
    purpose  - n +  purpose  - n +  purpose  - n +  purpose  - n +
```

## Self-review

A wall of pastel rounded cards would still be a generic dashboard. Revised to open shelves: no perimeter boxes around each photo or card. Color belongs to purpose tokens and the illustration. Likewise, a full-page blueprint would compete with small parts; drafting lines stay inside the illustration. Comic texture is restrained to the art and momentary feedback, never behind form text. Keep the utilitarian list for dense inventories, but default to the visual shelf.

## Reference research and implementation map

- [Motion: iOS app folder](https://motion.dev/examples/react-ios-app-folder) and [shared-layout modal](https://motion.dev/examples/vue-modal-shared-layout): spatial continuity when expanding an item, adapted for a focused part inspector.
- [Motion: add to basket](https://motion.dev/examples/js-add-to-basket): concise spring and impact feedback, adapted for stock quantities.
- [Motion: draggable ticker](https://motion.dev/examples/vue-ticker-draggable): horizontal browsing, adapted into a bounded purpose strip that supports wheel/trackpad and keyboard use without infinite motion.
- [Motion: iris from click](https://motion.dev/examples/js-curtains-iris-click): studied its spatial cue; the inspector adapts it through shared-element photo expansion rather than a page-wide iris.
- [Motion: Three.js shader lens](https://motion.dev/examples/js-three-uniforms) and [TSL particle morph](https://motion.dev/examples/js-three-tsl): physical response and object focus; a lightweight isometric SVG provides the engineering object without a continuously running WebGL canvas.
- [Motion: scramble text](https://motion.dev/examples/vue-scramble-text), [loading reveal](https://motion.dev/examples/vue-loading-line-reveal), [Lenis scroll](https://motion.dev/examples/js-lenis-smooth-scroll): studied; readable IDs, immediate search and native scrolling take priority over decorative text scrambling or scroll interception.
- [Anime.js](https://animejs.com/), [React integration](https://animejs.com/documentation/getting-started/using-with-react/), [SVG drawing](https://animejs.com/documentation/svg/createdrawable/): original exploded IC animated through scoped, cleaned-up SVG sequences.
- [Motion layout documentation](https://motion.dev/docs/react-layout-animations) and [accessibility guidance](https://motion.dev/docs/react-accessibility): layout projection and reduced-motion behavior.
- [MoMA: Bauhaus graphic design](https://www.moma.org/explore/inside_out/2009/11/06/bauhaus-the-graphic-design-department-goes-back-to-school/): geometric construction and deliberate typography.
- [Pinterest: exploded-view references](https://www.pinterest.com/john722/exploded-views-hacks/), [Bauhaus graphics](https://br.pinterest.com/oianamercurio/bauhaus/), [90s anime / JoJo reference](https://br.pinterest.com/pin/774759942129999572/): search discovery; the pin itself required login. The user's supplied images are the primary visual references for ink, halftone, paper and muted cel colors. Images are references, not copied interface assets or instructions.
- [Falstad circuit simulator](https://www.falstad.com/circuit/): purpose-led electronic symbols and direct manipulation inform the visual vocabulary.

Additional reviewed references: [horizontal gallery](https://motion.dev/examples/vue-scroll-horizontal), [footer reveal](https://motion.dev/examples/react-footer-reveal), [iOS pointer](https://motion.dev/examples/react-ios-pointer), and [typewriter](https://motion.dev/examples/react-typewriter). We keep native page scrolling, a standard pointer, and stable inventory labels. Focused picture zoom and pointer panning help read component markings without altering their stored images.

The application uses original artwork and implementations, with free Motion and Anime.js APIs. Paid Motion+ source is not used.
