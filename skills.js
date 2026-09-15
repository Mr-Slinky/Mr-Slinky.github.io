/*
 * <skill-chart>
 *
 * Draws a soft bar chart of ratings, one row per item. Each bar is split into one rounded step
 * per point on the scale, and the steps up to the item's rating are filled.
 *
 * The element builds its rows from the list written inside it, so the ratings stay readable as a
 * plain list when the script does not run:
 *
 *   <skill-chart>
 *     <ul>
 *       <li>Java <data value="5">5/5</data></li>
 *       <li>Python <data value="1">1/5</data></li>
 *     </ul>
 *   </skill-chart>
 *
 *   - Each li becomes one row, drawn in the order written.
 *   - The li's text, leaving out its data element, gives the row's name.
 *   - The data element's value gives the rating, rounded to a whole step. A rating above the
 *     maximum fills the whole bar.
 *   - A max attribute on the element sets the number of steps, which is 5 by default.
 *
 * An li whose rating is missing, zero or not a number is left out.
 *
 * Colours and fonts come from the page's custom properties (--ink, --accent and the rest), which
 * pass into the shadow root, so the chart follows the page's light and dark themes.
 */

const DEFAULT_MAX = 5;

const STYLES = `
    :host {
        --sc-ink: var(--ink, #222222);
        --sc-muted: var(--muted, #555555);
        --sc-accent: var(--accent, #550c18);
        --sc-accent-soft: var(--accent-soft, rgb(85 12 24 / 0.15));
        --sc-text: var(--text, Georgia, serif);
        --sc-mono: var(--mono, ui-monospace, monospace);

        display: block;
        color: var(--sc-ink);
        font-family: var(--sc-text);
    }

    :host([hidden]) { display: none; }

    * { box-sizing: border-box; }

    /* Rows share the list's three columns, so every bar starts where the longest name ends. */
    .rows {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr) max-content;
        gap: 0.75rem 0.9rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .row {
        position: relative;
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: subgrid;
        align-items: center;
    }

    .name {
        font-size: 0.95rem;
        line-height: 1.3;
    }

    .bar {
        display: grid;
        grid-template-columns: repeat(var(--steps), minmax(0, 1fr));
        gap: 3px;
        height: 0.6rem;
    }

    .step {
        border-radius: 999px;
        background: var(--sc-accent-soft);
    }

    .step.is-filled { background: var(--sc-accent); }

    .score {
        font-family: var(--sc-mono);
        font-size: 0.75rem;
        font-variant-numeric: tabular-nums;
        text-align: right;
        color: var(--sc-muted);
    }

    /* Read by screen readers in place of the bar and the short score beside it. */
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
    }
`;

// ========================================================================================== \\
//                                          Element                                           \\
// ========================================================================================== \\

class SkillChart extends HTMLElement {

    connectedCallback() {
        if (this.shadowRoot) {
            return;
        }
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.#build(), { once: true });
        } else {
            this.#build();
        }
    }

    #build() {
        if (this.shadowRoot) {
            return;
        }

        const max = readMax(this.getAttribute("max"));
        const skills = readSkills(this, max);

        // With nothing to draw, the list written inside the element stays on show.
        if (skills.length === 0) {
            return;
        }

        const root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = STYLES;

        const rows = createElement("ul", "rows");
        rows.setAttribute("aria-label", `Ratings out of ${max}`);
        rows.style.setProperty("--steps", String(max));

        for (const skill of skills) {
            rows.append(createRow(skill, max));
        }

        root.append(style, rows);
    }
}

// ========================================================================================== \\
//                                      Helper Functions                                      \\
// ========================================================================================== \\

function readMax(value) {
    const max = Number(value);
    return Number.isInteger(max) && max > 0 ? max : DEFAULT_MAX;
}

function readSkills(host, max) {
    return [...host.querySelectorAll("li")]
        .map((item) => readSkill(item, max))
        .filter((skill) => skill !== null);
}

/**
 * Reads one list item into a name and a whole-step rating.
 * <pre>
 * <li>Java <data value="5">5/5</data></li>    ->  { name: "Java", level: 5 }
 * <li>Rust <data value="3.4">3/5</data></li>  ->  { name: "Rust", level: 3 }
 * <li>Go <data value="9">9/5</data></li>      ->  { name: "Go", level: 5 }
 * <li>C</li>                                  ->  null
 * </pre>
 */
function readSkill(item, max) {
    const data = item.querySelector("data[value]");
    const rating = Math.round(Number(data?.getAttribute("value")));
    if (!data || !Number.isFinite(rating) || rating <= 0) {
        return null;
    }

    const copy = item.cloneNode(true);
    copy.querySelector("data")?.remove();
    const name = copy.textContent.replace(/\s+/g, " ").trim();
    if (name === "") {
        return null;
    }

    return { name, level: Math.min(rating, max) };
}

function createRow(skill, max) {
    const row = createElement("li", "row");

    const bar = createElement("span", "bar");
    bar.setAttribute("aria-hidden", "true");
    for (let step = 1; step <= max; step++) {
        bar.append(createElement("span", step <= skill.level ? "step is-filled" : "step"));
    }

    const score = createElement("span", "score", `${skill.level}/${max}`);
    score.setAttribute("aria-hidden", "true");

    row.append(
        createElement("span", "name", skill.name),
        bar,
        score,
        createElement("span", "visually-hidden", `, ${skill.level} out of ${max}`),
    );
    return row;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

if (!customElements.get("skill-chart")) {
    customElements.define("skill-chart", SkillChart);
}
