/*
 * Opens every closed <details> element before the page prints, and closes the same elements again
 * afterwards. A printed page therefore includes the text that a reader on screen opens by clicking.
 */

const opened = [];

window.addEventListener("beforeprint", () => {
    for (const details of document.querySelectorAll("details:not([open])")) {
        details.open = true;
        opened.push(details);
    }
});

window.addEventListener("afterprint", () => {
    for (const details of opened.splice(0)) {
        details.open = false;
    }
});
