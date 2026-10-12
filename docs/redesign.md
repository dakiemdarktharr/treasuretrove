# TreasureTrove component catalog

## Layout and inventory workflow

The desktop home has a large search field in its upper half and illustrated component groups below. Eight broad families organize 56 specific groups. Each family shows four posters at once, with drag, arrow keys, arrow buttons and a draggable position bar. Vertical scrolling reveals the next family. No sidebar, seeded inventory, decorative chip, slogans or quotes.

Selecting a poster expands a focused group inventory. Esc closes a part inspector first, then returns from its group to the original home scroll position. The home browser stays mounted, retaining horizontal positions. The logo uses a pixel curtain to return home, including from nested dialogs. Search matches saved IDs, names, types, usage, locations and groups, and also surfaces matching groups when there are no saved parts. An unknown ID can be created with Enter.

Required fields remain ID, picture and whole-number quantity. Component group is visible in the main form, with an automatic suggestion and manual override. Usage describes purpose; it does not determine the primary navigation. Quantity updates remain atomic on the server. Success animation runs after a confirmed response. Uploaded transparent images remain unframed and retain alpha.

## Component taxonomy

The taxonomy follows the separation of passives, discrete semiconductors, ICs, sensors, electromechanical parts, interconnects and power products seen in [DigiKey's product catalog](https://www.digikey.com/en/products). It is adapted for a personal maker inventory, where an assembled regulator module and an individual regulator IC need recognizable destinations. [Mouser's IMU category](https://www.mouser.com/en/c/sensors/motion-position-sensors/imus-inertial-measurement-units/) supports a dedicated motion-sensor group instead of hiding it under a broad usage label.

| Family | Specific groups |
| --- | --- |
| Passive components | Resistors; Potentiometers; Capacitors; Inductors; Crystals & oscillators; Transformers |
| Discrete semiconductors | Transistors; MOSFETs & JFETs; Diodes & rectifiers; Thyristors & triacs; Optocouplers; Voltage references |
| Power & protection | Voltage step-down; Voltage step-up; Buck-boost converters; Linear regulators; Battery chargers; Batteries & holders; Fuses & breakers; Surge protection |
| Sensors | IMUs; Temperature & humidity; Pressure sensors; Distance & proximity; Light sensors; Current & voltage sensors; Magnetic sensors; Force & load sensors; Gas & air sensors; Encoders |
| ICs & boards | Microcontrollers; Development boards; Logic ICs; Memory ICs; Amplifiers & timers; ADC & DAC; Interface ICs; Wireless modules |
| Switching & motion | Switches & buttons; Relays; Motors & solenoids; Servos; Motor drivers; Fans & cooling |
| Light & sound | LEDs; Displays; Buzzers & piezos; Speakers & microphones |
| Wiring & prototyping | Wires; Cables; Connectors; Pin headers; Breadboards; PCBs & adapters; Antennas; Uncategorized |

This is a practical, broad catalog rather than a claim to enumerate every industrial component. Uncategorized accepts unusual or custom assemblies. Store a part in one group; keep cross-cutting applications in searchable usage notes. Choose the most specific physical type: a MOSFET goes under MOSFETs, not general Transistors; a buck module goes under Voltage step-down, not Linear regulators. Multifunction parts can be assigned manually.

Automatic suggestion checks explicit type, then recognized part-ID patterns, then usage. More specific patterns precede broad words (motor driver before motor, photodiode before diode). It is a convenience heuristic, not a datasheet lookup. Existing purpose-group records resolve to the new groups on read without rewriting stock, photos or notes. Unknown legacy parts become Uncategorized.

## Art and typography

Warm paper, ink, sage, butter yellow and lilac; Bricolage Grotesque with DM Mono. Bauhaus circles and bars sit behind original ink-and-halftone component illustrations. The 1990s print references influence texture and restrained color rather than adding characters or comic captions to the inventory.

Each group was researched with three reference images (168 total, including component photos and identification charts). Image generation edited these reference sheets into consistent illustrated posters, with three component forms per tile. Four tiles share each of 14 optimized WebP atlases. Reference originals are not served by the application. These are navigation illustrations, not authoritative electrical or pinout diagrams.

- [Image source manifest](poster-sources.json): group, image-search query, source images and atlas tile.
- [Exact image-generation prompts](poster-prompts.json): reference-guided image-edit tool mode and prompts.
- Runtime artwork: `public/groups/atlas-0.webp` through `atlas-13.webp`.

## Animation reference → implementation

| Reference | Implemented behavior |
| --- | --- |
| [Footer reveal](https://motion.dev/examples/react-footer-reveal) | Footer lies behind the catalog and fades/slides into view as the last family scrolls away. |
| [Lenis smooth scroll](https://motion.dev/examples/js-lenis-smooth-scroll), [Lenis documentation](https://github.com/darkroomengineering/lenis) | Lenis smooth wheel scrolling; pauses for native dialogs, preserves native dialog scrolling, cleans up on unmount. |
| [Draggable ticker](https://motion.dev/examples/vue-ticker-draggable) | Bounded poster rows with momentum, card snapping, drag/click distinction, accessible arrow controls and a range scrubber. |
| [Shared-layout modal](https://motion.dev/examples/vue-modal-shared-layout), [App Store](https://motion.dev/examples/js-app-store) | Group expands from the clicked poster's geometry; closes toward that poster. Native dialogs provide focus containment and Esc handling. |
| [Iris from click](https://motion.dev/examples/js-curtains-iris-click) | Circular curtain expands from the last click, changes the view while covered, then reveals the destination. Used for part details and authentication transitions. |
| [Pixel curtains](https://motion.dev/examples/js-curtains-pixels) | Staggered grid of ink/sage pixels covers and reveals home when using a logo button. |
| [Add to basket](https://motion.dev/examples/js-add-to-basket) | Confirmed stock changes send a small part image along an arc between its image and quantity, with a quantity delta and arrival ring. |
| [Scramble text](https://motion.dev/examples/vue-scramble-text) | The username reveals progressively on opening the site; its accessible name stays stable. |
| [iOS pointer](https://motion.dev/examples/react-ios-pointer), [Motion cursor](https://motion.dev/docs/cursor) | A soft spring cursor morphs to small controls with slight magnetic tracking and a press response. Native text input behavior remains available. |
| [Hide header on scroll](https://motion.dev/examples/vue-scroll-hide-header) | Header moves away on downward scrolling, reappears on upward scrolling or keyboard focus. |

Free Motion primitives implement the iris, pixels, pointer and poster motion; no paid Motion+ source or subscription is required. Lenis handles scrolling. Reduced-motion preferences disable curtains, scrambling, stock flights and the custom pointer, and use immediate scrolling. The previous Anime.js chip illustration and its dependency have been removed.
