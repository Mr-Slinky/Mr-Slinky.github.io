/*
 * <career-timeline>
 *
 * Draws the page's dated entries as a horizontal timeline, stepping one year at a time from left
 * to right. Hovering over a period, focusing it with the keyboard, or tapping it opens a card
 * beneath the timeline with the period's title, role, dates and length. Tapping a period pins its
 * card open until the reader taps the period again, taps elsewhere or presses Escape.
 *
 * The element builds its periods from the page. Every element with a data-timeline attribute
 * becomes one period:
 *
 *   <li data-timeline="work">
 *     <h3>IT Anywhere</h3>
 *     <p><span class="entry-role">Fullstack Developer</span>
 *        <time datetime="2025-05">May 2025</time> to present</p>
 *   </li>
 *
 *   - The first h3 gives the title, and an element with the class entry-role gives the role.
 *   - The first <time> gives the start and the second gives the end. A period with a single
 *     <time> runs to the present.
 *   - A datetime is a year (2016) or a month (2025-05). A year counts in full, so a start of 2016
 *     means January 2016 and an end of 2018 means December 2018.
 *   - data-timeline="study" draws the period as an outlined bar. Any other value draws it solid.
 *
 * All periods share one bar, so the entries are expected not to overlap.
 *
 * The bars always take pointer events. A page can therefore set pointer-events: none on the
 * element, and a click anywhere else on the timeline reaches whatever lies beneath it, such as a
 * link covering the card the timeline sits in.
 *
 * Colours and fonts come from the page's custom properties (--paper, --ink, --accent and the
 * rest). Custom properties pass into the shadow root, so the timeline follows the page's light
 * and dark themes.
 */

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const STYLES = `
    :host {
        --tl-paper: var(--paper, #ffffff);
        --tl-ink: var(--ink, #222222);
        --tl-strong: var(--strong, #111111);
        --tl-muted: var(--muted, #555555);
        --tl-line: var(--line, #bbbbbb);
        --tl-accent: var(--accent, #550c18);
        --tl-accent-soft: var(--accent-soft, rgb(85 12 24 / 0.15));
        --tl-display: var(--display, system-ui, sans-serif);
        --tl-text: var(--text, Georgia, serif);
        --tl-mono: var(--mono, ui-monospace, monospace);

        --card-width: 18rem;
        --card-gap: 0.9rem;

        display: block;
        container-type: inline-size;
        color: var(--tl-ink);
        font-family: var(--tl-text);
    }

    :host([hidden]) { display: none; }

    * { box-sizing: border-box; }

    p { margin: 0; }

    .axis {
        position: relative;
        height: 0.9rem;
    }

    /* Each label sits just right of the tick that marks the start of its year. */
    .year {
        position: absolute;
        bottom: 0;
        padding-left: 0.3rem;
        font-family: var(--tl-mono);
        font-size: 0.6875rem;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        color: var(--tl-muted);
    }

    /* Below this width a label per year would collide, so only every second year is labelled. */
    @container (max-width: 32rem) {
        .year:nth-child(even) { visibility: hidden; }
    }

    .track {
        position: relative;
        height: 1.75rem;
        margin-top: 0.3rem;
    }

    /* The spine runs the full width of the track, behind the ticks and the periods. */
    .track::before {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 1px;
        transform: translateY(-50%);
        background: var(--tl-line);
    }

    .tick {
        position: absolute;
        top: -1.2rem;
        bottom: 20%;
        width: 1px;
        background: var(--tl-line);
    }

    /* Joins the open card to the period it describes. */
    .pointer {
        position: absolute;
        top: 50%;
        height: calc(50% + var(--card-gap));
        width: 1px;
        background: var(--tl-accent);
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .pointer.is-open { opacity: 1; }

    .periods {
        position: absolute;
        inset: 0;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .periods li {
        position: absolute;
        top: 0;
        bottom: 0;
    }

    .period {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        height: 0.75rem;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 2px;
        transform: translateY(-50%);
        appearance: none;
        -webkit-appearance: none;
        -webkit-tap-highlight-color: transparent;
        background: var(--tl-accent);
        cursor: pointer;
        pointer-events: auto;
        transition: height 0.15s ease;
    }

    /* Widens the target past the drawn bar, so a period a few months long is still easy to hit. */
    .period::after {
        content: "";
        position: absolute;
        inset: -0.5rem -0.3rem;
    }

    .period.study {
        background: var(--tl-accent-soft);
        box-shadow: inset 0 0 0 1px var(--tl-accent);
    }

    .period.is-active { height: 1.25rem; }

    .period:focus { outline: none; }

    .period:focus-visible {
        outline: 2px solid var(--tl-accent);
        outline-offset: 3px;
    }

    .now {
        position: absolute;
        top: 50%;
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: var(--tl-strong);
    }

    /* The hint and every card share one cell, so the space below the timeline is as tall as the
       tallest card whether a card is open or not, and the page below never moves. */
    .details {
        display: grid;
        margin-top: var(--card-gap);
    }

    .details > * {
        grid-area: 1 / 1;
        align-self: start;
    }

    .hint {
        font-family: var(--tl-mono);
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        color: var(--tl-muted);
        transition: opacity 0.15s ease;
    }

    .details.is-open .hint {
        opacity: 0;
        visibility: hidden;
    }

    .hint-touch { display: none; }

    @media (hover: none) {
        .hint-hover { display: none; }
        .hint-touch { display: inline; }
    }

    /* A card starts level with its period, and stops at the right edge where it would pass it. */
    .card {
        width: min(100%, var(--card-width));
        margin-left: clamp(0px, var(--at, 0%), calc(100% - min(100%, var(--card-width))));
        display: grid;
        gap: 0.15rem;
        padding: 0.8rem 1rem 0.9rem;
        border: 1px solid var(--tl-line);
        border-radius: 4px;
        background: var(--tl-paper);
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

    .card-title {
        font-family: var(--tl-display);
        font-weight: 700;
        font-size: 1.2rem;
        line-height: 1.2;
        letter-spacing: -0.01em;
        color: var(--tl-strong);
    }

    .card-role {
        font-size: 0.95rem;
        line-height: 1.4;
    }

    .card-role:empty { display: none; }

    .card-dates {
        margin-top: 0.35rem;
        font-family: var(--tl-mono);
        font-size: 0.75rem;
        line-height: 1.5;
        color: var(--tl-muted);
    }

    @media (prefers-reduced-motion: reduce) {
        .pointer,
        .period,
        .hint,
        .card,
        .card.is-open {
            transition: none;
        }
    }
`;

// ========================================================================================== \\
//                                          Element                                           \\
// ========================================================================================== \\

class CareerTimeline extends HTMLElement {

    #buttons = [];
    #cards = [];
    #centres = [];
    #details = null;
    #pointer = null;

    // Index of the period under the mouse, focused from the keyboard, or pinned by a click or tap.
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

        const periods = readPeriods(document);
        if (periods.length === 0) {
            this.hidden = true;
            return;
        }

        const now = readMonthPosition(new Date());
        const currentMonth = Math.floor(now);
        const axis = computeAxis(periods, now);

        const root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = STYLES;

        const yearAxis = createElement("div", "axis");
        yearAxis.setAttribute("aria-hidden", "true");
        const track = createElement("div", "track");

        // A tick at the start of every year the axis reaches, and a label for every year it spans.
        for (let year = axis.start / 12; year * 12 <= axis.end; year++) {
            const left = `${computePercent(axis, year * 12)}%`;

            const tick = createElement("span", "tick");
            tick.setAttribute("aria-hidden", "true");
            tick.style.left = left;
            track.append(tick);

            if (year * 12 < axis.end) {
                const label = createElement("span", "year", String(year));
                label.style.left = left;
                yearAxis.append(label);
            }
        }

        this.#pointer = createElement("span", "pointer");
        this.#pointer.setAttribute("aria-hidden", "true");

        const list = createElement("ol", "periods");
        list.setAttribute("aria-label", "Career timeline");
        periods.forEach((period, index) => {
            const left = computePercent(axis, period.start.index);
            const right = computePercent(axis, period.end ? period.end.index + 1 : now);

            const item = document.createElement("li");
            item.style.left = `${left}%`;
            item.style.width = `${right - left}%`;

            const button = createElement("button", `period ${period.kind}`);
            button.type = "button";
            button.setAttribute("aria-label", describePeriod(period, currentMonth));
            this.#bindPeriod(button, index);

            item.append(button);
            list.append(item);
            this.#buttons.push(button);
            this.#cards.push(createCard(period, left, currentMonth));
            this.#centres.push((left + right) / 2);
        });

        const nowMark = createElement("span", "now");
        nowMark.setAttribute("aria-hidden", "true");
        nowMark.style.left = `${computePercent(axis, now)}%`;
        track.append(this.#pointer, list, nowMark);

        const hint = createElement("p", "hint");
        hint.append(
            createElement("span", "hint-hover", "Hover over a bar to see what I was doing."),
            createElement("span", "hint-touch", "Tap a bar to see what I was doing."),
        );

        this.#details = createElement("div", "details");
        this.#details.append(hint, ...this.#cards);

        root.append(style, yearAxis, track, this.#details);

        root.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                this.#dismiss();
            }
        });
    }

    #bindPeriod(button, index) {
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
        const open = index !== null;

        this.#buttons.forEach((button, i) => button.classList.toggle("is-active", i === index));
        this.#cards.forEach((card, i) => card.classList.toggle("is-open", i === index));
        this.#details.classList.toggle("is-open", open);
        this.#pointer.classList.toggle("is-open", open);

        if (open) {
            this.#pointer.style.left = `${this.#centres[index]}%`;
        }
    }
}

// ========================================================================================== \\
//                                      Helper Functions                                      \\
// ========================================================================================== \\

/**
 * Reads every element marked with data-timeline into a period, earliest start first. An element
 * whose dates are missing or run backwards is left out.
 */
function readPeriods(scope) {
    return [...scope.querySelectorAll("[data-timeline]")]
        .map(readPeriod)
        .filter((period) => period !== null)
        .sort((a, b) => a.start.index - b.start.index);
}

function readPeriod(entry) {
    const times = entry.querySelectorAll("time[datetime]");
    const start = parseMonth(times[0]?.getAttribute("datetime"), "start");
    if (start === null) {
        return null;
    }

    let end = null;
    if (times.length > 1) {
        end = parseMonth(times[1].getAttribute("datetime"), "end");
        if (end === null || end.index < start.index) {
            return null;
        }
    }

    return {
        kind: entry.dataset.timeline === "study" ? "study" : "work",
        title: readText(entry.querySelector("h3")),
        role: readText(entry.querySelector(".entry-role")),
        start,
        end,
    };
}

/**
 * Parses a datetime of the form YYYY or YYYY-MM into a month index, counted as year * 12 plus
 * the month, where January is 0. A bare year resolves to January at the start of a period and to
 * December at its end.
 * <pre>
 * "2025-05", "start"  ->  { index: 24304, hasMonth: true }
 * "2018",    "end"    ->  { index: 24227, hasMonth: false }
 * "2018",    "start"  ->  { index: 24216, hasMonth: false }
 * "May 2025"          ->  null
 * </pre>
 */
function parseMonth(value, edge) {
    const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value ?? "");
    if (match === null) {
        return null;
    }

    const hasMonth = match[2] !== undefined;
    const month = hasMonth ? Number(match[2]) - 1 : (edge === "end" ? 11 : 0);
    if (month < 0 || month > 11) {
        return null;
    }

    return { index: Number(match[1]) * 12 + month, hasMonth };
}

/**
 * Returns today's position on the month scale, with the day as a fraction of its month, so a
 * period running to the present ends at today rather than at the end of the month.
 */
function readMonthPosition(date) {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getFullYear() * 12 + date.getMonth() + (date.getDate() - 1) / daysInMonth;
}

/**
 * Computes the axis the periods are drawn against, in months. It starts at January of the
 * earliest year and ends at the close of the year containing today or the latest period end,
 * whichever is later, so the final year keeps room for its label.
 */
function computeAxis(periods, now) {
    const first = Math.min(...periods.map((period) => period.start.index));
    const last = Math.max(now, ...periods.map((period) => (period.end ? period.end.index + 1 : now)));
    const start = Math.floor(first / 12) * 12;
    const end = Math.ceil(last / 12) * 12;
    return { start, end, span: end - start };
}

function computePercent(axis, month) {
    return ((month - axis.start) / axis.span) * 100;
}

function createCard(period, left, currentMonth) {
    const card = createElement("div", "card");
    card.setAttribute("aria-hidden", "true");
    card.style.setProperty("--at", `${left}%`);
    card.append(
        createElement("p", "card-title", period.title),
        createElement("p", "card-role", period.role),
        createElement("p", "card-dates", `${formatRange(period)} · ${formatLength(period, currentMonth)}`),
    );
    return card;
}

/**
 * Formats a period's dates as a reader would write them.
 * <pre>
 * 2015-01 to 2015-05  ->  "January to May 2015"
 * 2020 to 2024-07     ->  "2020 to July 2024"
 * 2016 to 2018        ->  "2016 to 2018"
 * 2025-05 to present  ->  "May 2025 to present"
 * </pre>
 */
function formatRange(period) {
    const startText = formatMonth(period.start);
    if (period.end === null) {
        return `${startText} to present`;
    }

    const startYear = Math.floor(period.start.index / 12);
    const endYear = Math.floor(period.end.index / 12);
    if (startYear === endYear) {
        if (!period.start.hasMonth && !period.end.hasMonth) {
            return String(startYear);
        }
        if (period.start.hasMonth && period.end.hasMonth) {
            return `${MONTHS[period.start.index % 12]} to ${formatMonth(period.end)}`;
        }
    }

    return `${startText} to ${formatMonth(period.end)}`;
}

function formatMonth({ index, hasMonth }) {
    const year = Math.floor(index / 12);
    return hasMonth ? `${MONTHS[index % 12]} ${year}` : String(year);
}

/**
 * Formats how long a period lasted, counting its first and last months in full.
 * <pre>
 * January to May 2015  ->  "5 months"
 * 2016 to 2018         ->  "3 years"
 * 2020 to July 2024    ->  "4 years and 7 months"
 * </pre>
 */
function formatLength(period, currentMonth) {
    const lastMonth = period.end ? period.end.index : currentMonth;
    const months = Math.max(1, lastMonth - period.start.index + 1);
    const years = Math.floor(months / 12);
    const remainder = months % 12;

    const parts = [];
    if (years > 0) {
        parts.push(`${years} ${years === 1 ? "year" : "years"}`);
    }
    if (remainder > 0) {
        parts.push(`${remainder} ${remainder === 1 ? "month" : "months"}`);
    }
    return parts.join(" and ");
}

function describePeriod(period, currentMonth) {
    return [period.title, period.role, formatRange(period), formatLength(period, currentMonth)]
        .filter((part) => part !== "")
        .join(", ");
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

if (!customElements.get("career-timeline")) {
    customElements.define("career-timeline", CareerTimeline);
}
