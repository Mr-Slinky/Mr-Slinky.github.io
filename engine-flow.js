/*
 * <engine-flow>
 *
 * Draws a pipeline as a row of stages joined by arrows, with a dot running along each arrow to show
 * data moving from one stage to the next. A card beneath the row shows one stage's detail, and at
 * rest that is the first stage. Hovering over a stage, focusing it with the keyboard, or tapping it
 * switches the card to that stage. Tapping a stage pins its card open until the reader taps the
 * stage again, taps elsewhere or presses Escape, and the card then returns to the first stage.
 *
 * The element builds its stages from the ordered list written inside it, so the pipeline stays
 * readable when the script does not run:
 *
 *   <engine-flow>
 *     <ol aria-label="How the reporting engine works">
 *       <li>
 *         <span class="flow-name">1 database</span>
 *         <span class="flow-note">SQL Server, synced on a schedule</span>
 *         <p class="flow-detail">I designed the schema and administer the database.</p>
 *       </li>
 *     </ol>
 *   </engine-flow>
 *
 *   - Each li becomes one stage, drawn in the order written. An li without a flow-name is left out.
 *   - The flow-name element gives the stage's title, and the flow-note element gives the short line
 *     beneath it.
 *   - The flow-detail element gives the text of the stage's card.
 *   - The list's aria-label becomes the label of the drawn pipeline.
 *
 * Below a width of 38rem the stages stack vertically, with the arrows pointing down. A printed page
 * shows each stage's detail inside its own box, and leaves the card area out.
 *
 * The attribute layout="steps" draws the stages as a numbered list instead, with the card in a
 * column beside it. It suits a sequence the reader steps through, such as problems met in order,
 * where the arrows of a pipeline would imply data moving between them.
 *
 *   <engine-flow layout="steps">...</engine-flow>
 *
 * Colours and fonts come from the page's custom properties (--paper, --ink, --accent and the
 * rest). Custom properties pass into the shadow root, so the pipeline follows the page's light and
 * dark themes.
 */

const STYLES = `
    :host {
        --ef-paper: var(--paper, #ffffff);
        --ef-surface: var(--surface, rgb(0 0 0 / 0.04));
        --ef-ink: var(--ink, #222222);
        --ef-strong: var(--strong, #111111);
        --ef-muted: var(--muted, #555555);
        --ef-line: var(--line, #bbbbbb);
        --ef-accent: var(--accent, #40798c);
        --ef-shadow: var(--shadow, 0 8px 20px -10px rgb(0 0 0 / 0.4));
        --ef-display: var(--display, system-ui, sans-serif);
        --ef-text: var(--text, Georgia, serif);
        --ef-mono: var(--mono, ui-monospace, monospace);

        --gap: 2.25rem;

        display: block;
        margin: 0.4rem 0;
        container-type: inline-size;
        color: var(--ef-ink);
        font-family: var(--ef-text);
    }

    :host([hidden]) { display: none; }

    * { box-sizing: border-box; }

    p { margin: 0; }

    .stages {
        display: grid;
        grid-template-columns: repeat(var(--count, 1), minmax(0, 1fr));
        gap: var(--gap);
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .stages > li {
        position: relative;
        display: grid;
    }

    .stage {
        position: relative;
        display: grid;
        align-content: start;
        gap: 0.4rem;
        width: 100%;
        margin: 0;
        padding: 1rem 1.1rem 1.15rem;
        border: 1px solid var(--ef-line);
        border-radius: 4px;
        background: var(--ef-surface);
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }

    .stage.is-active {
        border-color: var(--ef-accent);
        box-shadow: var(--ef-shadow);
        transform: translateY(-2px);
    }

    .stage:focus { outline: none; }

    .stage:focus-visible {
        outline: 2px solid var(--ef-accent);
        outline-offset: 3px;
    }

    .stage-name {
        color: var(--ef-strong);
        font-family: var(--ef-display);
        font-weight: 500;
        font-size: 1.2rem;
        line-height: 1.2;
        letter-spacing: -0.01em;
    }

    .stage-note {
        font-family: var(--ef-mono);
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--ef-muted);
    }

    /* The detail stays in the button for screen readers and for print, and the card shows it on
       screen. */
    .stage-detail {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
        white-space: nowrap;
    }

    /* The arrow fills the gap to the left of every stage after the first. */
    .link {
        position: absolute;
        top: 50%;
        right: calc(100% + 0.4rem);
        width: calc(var(--gap) - 0.8rem);
        height: 1px;
        background: var(--ef-line);
    }

    .link::after {
        content: "";
        position: absolute;
        top: 50%;
        right: 1px;
        width: 0.4rem;
        height: 0.4rem;
        border-top: 1px solid var(--ef-accent);
        border-right: 1px solid var(--ef-accent);
        transform: translateY(-50%) rotate(45deg);
    }

    .dot {
        position: absolute;
        top: 50%;
        left: 0;
        width: 5px;
        height: 5px;
        margin-top: -2.5px;
        border-radius: 50%;
        background: var(--ef-accent);
        opacity: 0;
        animation: travel 2.4s ease-in-out infinite;
        animation-delay: var(--delay, 0s);
    }

    @keyframes travel {
        0% { left: 0; opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { left: calc(100% - 5px); opacity: 0; }
    }

    @keyframes travel-down {
        0% { top: 0; opacity: 0; }
        15% { opacity: 1; }
        85% { opacity: 1; }
        100% { top: calc(100% - 5px); opacity: 0; }
    }

    /* Every card shares one cell, so the space below the stages is as tall as the tallest card, and
       the page below never moves when the card changes. */
    .details {
        display: grid;
        margin-top: 0.9rem;
    }

    .details > * {
        grid-area: 1 / 1;
        align-self: start;
    }

    .card-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 0.2rem 1rem;
    }

    /* The hint shows only while the card is at rest on the first stage. */
    .card-hint {
        font-family: var(--ef-mono);
        font-size: 0.6875rem;
        letter-spacing: 0.04em;
        color: var(--ef-muted);
    }

    .details:not(.is-resting) .card-hint { visibility: hidden; }

    .hint-touch { display: none; }

    @media (hover: none) {
        .hint-hover { display: none; }
        .hint-touch { display: inline; }
    }

    .card {
        position: relative;
        display: grid;
        gap: 0.3rem;
        padding: 0.85rem 1.1rem 0.95rem;
        border: 1px solid var(--ef-line);
        border-radius: 4px;
        background: var(--ef-paper);
        line-height: 1.55;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-0.25rem);
        transition: opacity 0.15s ease, transform 0.15s ease, visibility 0s linear 0.15s;
        pointer-events: none;
    }

    .card.is-open {
        opacity: 1;
        visibility: visible;
        transform: none;
        transition: opacity 0.15s ease, transform 0.15s ease;
    }

    /* A caret on the card's top edge, centred under the stage the card describes. */
    .card::before {
        content: "";
        position: absolute;
        top: -0.36rem;
        left: calc((100% - (var(--count) - 1) * var(--gap)) / var(--count) * (var(--index) + 0.5) + var(--index) * var(--gap));
        width: 0.7rem;
        height: 0.7rem;
        border-top: 1px solid var(--ef-line);
        border-left: 1px solid var(--ef-line);
        background: var(--ef-paper);
        transform: translateX(-50%) rotate(45deg);
    }

    .card-label {
        font-family: var(--ef-mono);
        font-size: 0.6875rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ef-muted);
    }

    @container (max-width: 38rem) {
        .stages {
            --gap: 1.75rem;
            grid-template-columns: minmax(0, 1fr);
        }

        .link {
            top: auto;
            right: auto;
            bottom: calc(100% + 0.4rem);
            left: 1.4rem;
            width: 1px;
            height: calc(var(--gap) - 0.8rem);
        }

        .link::after {
            top: auto;
            right: 50%;
            bottom: 1px;
            transform: translateX(50%) rotate(135deg);
        }

        .dot {
            top: 0;
            left: 50%;
            margin: 0 0 0 -2.5px;
            animation-name: travel-down;
        }

        .card::before { display: none; }
    }

    .stage-index { display: none; }

    /* Steps: a numbered list on the left and the card beside it. */
    :host([layout="steps"]) .frame {
        display: grid;
        grid-template-columns: minmax(15rem, 19rem) minmax(0, 1fr);
        gap: 1.25rem;
        align-items: start;
    }

    :host([layout="steps"]) .stages {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.5rem;
    }

    :host([layout="steps"]) .link { display: none; }

    :host([layout="steps"]) .stage {
        grid-template-columns: 1.6rem minmax(0, 1fr);
        column-gap: 0.6rem;
        row-gap: 0.15rem;
        padding: 0.6rem 0.8rem 0.65rem;
    }

    :host([layout="steps"]) .stage.is-active { transform: translateX(3px); }

    :host([layout="steps"]) .stage-index {
        display: block;
        grid-row: 1 / span 2;
        padding-top: 0.2rem;
        font-family: var(--ef-mono);
        font-size: 0.75rem;
        color: var(--ef-muted);
    }

    :host([layout="steps"]) .stage.is-active .stage-index { color: var(--ef-accent); }

    :host([layout="steps"]) .stage-name {
        grid-column: 2;
        font-size: 1rem;
    }

    :host([layout="steps"]) .stage-note { grid-column: 2; }

    :host([layout="steps"]) .details { margin-top: 0; }

    :host([layout="steps"]) .card {
        gap: 0.5rem;
        padding: 1.1rem 1.25rem 1.2rem;
    }

    :host([layout="steps"]) .card::before { display: none; }

    @container (max-width: 38rem) {
        :host([layout="steps"]) .frame { grid-template-columns: minmax(0, 1fr); }
    }

    @media (prefers-reduced-motion: reduce) {
        .dot { display: none; }

        .stage,
        .card,
        .card.is-open {
            transition: none;
        }

        .stage.is-active { transform: none; }
    }

    @media print {
        .details,
        .dot {
            display: none;
        }

        :host([layout="steps"]) .frame { display: block; }

        .stage {
            break-inside: avoid;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .stage-detail {
            position: static;
            width: auto;
            height: auto;
            overflow: visible;
            clip-path: none;
            white-space: normal;
            font-size: 0.9em;
            line-height: 1.45;
        }
    }
`;

// ========================================================================================== \\
//                                          Element                                           \\
// ========================================================================================== \\

class EngineFlow extends HTMLElement {

    #buttons = [];
    #cards = [];
    #details = null;

    // Index of the stage under the mouse, focused from the keyboard, or pinned by a click or tap.
    #hovered = null;
    #focused = null;
    #pinned = null;

    #handleDocumentPointerDown = (event) => {
        if (this.#pinned !== null && !event.composedPath().includes(this)) {
            this.#pinned = null;
            this.#update();
        }
    };

    connectedCallback() {
        if (!this.shadowRoot) {
            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", () => this.#build(), { once: true });
            } else {
                this.#build();
            }
        }
        document.addEventListener("pointerdown", this.#handleDocumentPointerDown);
    }

    disconnectedCallback() {
        document.removeEventListener("pointerdown", this.#handleDocumentPointerDown);
    }

    #build() {
        if (this.shadowRoot) {
            return;
        }

        const stages = readStages(this);

        // With nothing to draw, the list written inside the element stays on show.
        if (stages.length === 0) {
            return;
        }

        const root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = STYLES;

        const list = createElement("ol", "stages");
        list.setAttribute("aria-label", this.querySelector("ol")?.getAttribute("aria-label") ?? "Pipeline");
        list.style.setProperty("--count", String(stages.length));

        this.#details = createElement("div", "details");
        this.#details.style.setProperty("--count", String(stages.length));

        const noun = this.getAttribute("layout") === "steps" ? "step" : "stage";

        stages.forEach((stage, index) => {
            const item = document.createElement("li");
            if (index > 0) {
                item.append(createLink(index));
            }

            const button = createElement("button", "stage");
            button.type = "button";
            button.append(
                createElement("span", "stage-index", String(index + 1).padStart(2, "0")),
                createElement("span", "stage-name", stage.name),
                createElement("span", "stage-note", stage.note),
                createElement("span", "stage-detail", stage.detail),
            );
            this.#bindStage(button, index);

            item.append(button);
            list.append(item);
            this.#buttons.push(button);

            const card = createCard(stage, index, noun);
            this.#cards.push(card);
            this.#details.append(card);
        });

        const frame = createElement("div", "frame");
        frame.append(list, this.#details);
        root.append(style, frame);
        this.#update();

        root.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.#dismiss();
            }
        });
    }

    #bindStage(button, index) {
        // Touch has no hover, so a tap reaches the card through the click handler instead.
        button.addEventListener("pointerenter", (event) => {
            if (event.pointerType !== "touch") {
                this.#hovered = index;
                this.#update();
            }
        });

        button.addEventListener("pointerleave", (event) => {
            if (event.pointerType !== "touch" && this.#hovered === index) {
                this.#hovered = null;
                this.#update();
            }
        });

        // Only keyboard focus opens the card, so a mouse click leaves nothing open behind it.
        button.addEventListener("focus", () => {
            if (isFocusVisible(button)) {
                this.#focused = index;
                this.#update();
            }
        });

        button.addEventListener("blur", () => {
            if (this.#focused === index) {
                this.#focused = null;
                this.#update();
            }
        });

        button.addEventListener("click", () => {
            this.#pinned = this.#pinned === index ? null : index;
            this.#update();
        });
    }

    #dismiss() {
        this.#hovered = null;
        this.#focused = null;
        this.#pinned = null;
        this.#update();
    }

    #update() {
        const index = this.#hovered ?? this.#focused ?? this.#pinned;
        const shown = index ?? 0;

        this.#buttons.forEach((button, i) => button.classList.toggle("is-active", i === shown));
        this.#cards.forEach((card, i) => card.classList.toggle("is-open", i === shown));
        this.#details.classList.toggle("is-resting", index === null);
    }
}

// ========================================================================================== \\
//                                      Helper Functions                                      \\
// ========================================================================================== \\

/**
 * Reads each li of the list inside the host into a stage of name, note and detail. An li without
 * a flow-name is left out.
 */
function readStages(host) {
    return [...host.querySelectorAll("ol > li")]
        .map(readStage)
        .filter((stage) => stage !== null);
}

function readStage(item) {
    const name = readText(item.querySelector(".flow-name"));
    if (name === "") {
        return null;
    }

    return {
        name,
        note: readText(item.querySelector(".flow-note")),
        detail: readText(item.querySelector(".flow-detail")),
    };
}

/**
 * Creates the arrow drawn before a stage, with its travelling dot. Each arrow's dot starts half a
 * second after the one before it, so the dots move through the pipeline in sequence.
 */
function createLink(index) {
    const link = createElement("span", "link");
    link.setAttribute("aria-hidden", "true");

    const dot = createElement("span", "dot");
    dot.style.setProperty("--delay", `${(index - 1) * 0.5}s`);

    link.append(dot);
    return link;
}

/**
 * Creates the card for one stage. The noun is "stage" or "step", and it completes the hint that
 * the card shows while at rest.
 */
function createCard(stage, index, noun) {
    const card = createElement("div", "card");
    card.setAttribute("aria-hidden", "true");
    card.style.setProperty("--index", String(index));
    const hint = createElement("p", "card-hint");
    hint.append(
        createElement("span", "hint-hover", `Hover over a ${noun} to switch`),
        createElement("span", "hint-touch", `Tap a ${noun} to switch`),
    );

    const head = createElement("div", "card-head");
    head.append(createElement("p", "card-label", stage.name), hint);

    card.append(head, createElement("p", "card-text", stage.detail));
    return card;
}

function readText(element) {
    return element ? element.textContent.replace(/\s+/g, " ").trim() : "";
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function isFocusVisible(element) {
    try {
        return element.matches(":focus-visible");
    } catch {
        return true;
    }
}

if (!customElements.get("engine-flow")) {
    customElements.define("engine-flow", EngineFlow);
}
