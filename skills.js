/*
 * <skill-bands>
 *
 * Draws a short summary of languages and tools, grouped into bands of confidence. The first band
 * is drawn boldest and each band after it a little quieter, so the reader sees where the weight
 * lies without a score attached to anything.
 *
 * The element builds its bands from the description list written inside it, so the grouping stays
 * readable when the script does not run:
 *
 *   <skill-bands>
 *     <dl>
 *       <div>
 *         <dt>Primary</dt>
 *         <dd>Java, SQL Server</dd>
 *       </div>
 *     </dl>
 *   </skill-bands>
 *
 *   - Each dt gives a band's name, and the dd after it lists that band's items, separated by
 *     commas.
 *   - Bands are drawn in the order written, and a band with no items is left out.
 *
 * Colours and fonts come from the page's custom properties (--ink, --accent and the rest), which
 * pass into the shadow root, so the summary follows the page's light and dark themes.
 */

const STYLES = `
    :host {
        --sb-paper: var(--paper, #ffffff);
        --sb-ink: var(--ink, #222222);
        --sb-muted: var(--muted, #555555);
        --sb-line: var(--line, #bbbbbb);
        --sb-accent: var(--accent, #550c18);
        --sb-accent-soft: var(--accent-soft, rgb(85 12 24 / 0.15));
        --sb-text: var(--text, Georgia, serif);
        --sb-mono: var(--mono, ui-monospace, monospace);

        display: block;
        color: var(--sb-ink);
        font-family: var(--sb-text);
    }

    :host([hidden]) { display: none; }

    * { box-sizing: border-box; }

    p { margin: 0; }

    .bands {
        display: grid;
        gap: 1.1rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .band {
        display: grid;
        gap: 0.45rem;
    }

    .band-name {
        font-family: var(--sb-mono);
        font-size: 0.6875rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--sb-muted);
    }

    .items {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .item {
        padding: 0.4rem 0.7rem;
        border: 1px solid transparent;
        border-radius: 999px;
        font-family: var(--sb-mono);
        font-size: 0.8125rem;
        line-height: 1;
        white-space: nowrap;
    }

    /* The first band is filled, the second tinted, and the rest outlined. */
    .band:first-child .item {
        background: var(--sb-accent);
        color: var(--sb-paper);
    }

    .band:nth-child(2) .item {
        background: var(--sb-accent-soft);
        color: var(--sb-ink);
    }

    .band:nth-child(n + 3) .item {
        border-color: var(--sb-line);
        color: var(--sb-muted);
    }
`;

// ========================================================================================== \\
//                                          Element                                           \\
// ========================================================================================== \\

class SkillBands extends HTMLElement {

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

        const bands = readBands(this);

        // With nothing to draw, the list written inside the element stays on show.
        if (bands.length === 0) {
            return;
        }

        const root = this.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = STYLES;

        const list = createElement("ul", "bands");
        list.setAttribute("aria-label", "Languages and tools by confidence");
        for (const band of bands) {
            list.append(createBand(band));
        }

        root.append(style, list);
    }
}

// ========================================================================================== \\
//                                      Helper Functions                                      \\
// ========================================================================================== \\

/**
 * Reads each dt and the dd after it into a band. A band with no items is left out.
 */
function readBands(host) {
    return [...host.querySelectorAll("dt")]
        .map(readBand)
        .filter((band) => band !== null);
}

function readBand(term) {
    const name = readText(term);
    const description = term.nextElementSibling;
    if (name === "" || description === null || description.tagName !== "DD") {
        return null;
    }

    const items = readText(description)
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

    return items.length === 0 ? null : { name, items };
}

function createBand(band) {
    const row = createElement("li", "band");
    const items = createElement("ul", "items");
    for (const item of band.items) {
        items.append(createElement("li", "item", item));
    }

    row.append(createElement("p", "band-name", band.name), items);
    return row;
}

function readText(element) {
    return element.textContent.replace(/\s+/g, " ").trim();
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

if (!customElements.get("skill-bands")) {
    customElements.define("skill-bands", SkillBands);
}
