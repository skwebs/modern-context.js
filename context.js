class Context {
    constructor(target_selector, contents = []) {
        const style = document.createElement("style");
        style.textContent = `
:root {
    --text_color: #333333;
    --background_color: rgba(255, 255, 255, 0.7);
    --corner_radius: 0.25em;
    --font-family: sans-serif;
}

@media (prefers-color-scheme: dark) {
    :root {
        --text_color: white;
        --background_color: rgba(51, 51, 51, 0.7);
    }
}

.context_menu_js_outer {
    background: var(--background_color);
    position: absolute;
    border-radius: var(--corner_radius);
    box-shadow: 0.1em 0.1em 0.75em rgba(0, 0, 0, 0.3);
    padding: 0.5em 0;
    display: none;
    overflow: hidden;
    transition: 0.3s cubic-bezier(0.5, 0, 0, 1);
    cursor: default;
    user-select: none;
    backdrop-filter: blur(0.25em);
    font-family: var(--font-family);
}

.context_menu_js_outer hr {
    width: calc(100% - 2em);
    height: 0.1em;
    background: var(--text_color);
    border: none;
    margin: 0.25em 1em;
    opacity: 0.5;
}

.context_menu_js_outer .context_item {
    width: 100%;
    padding: 0.5em 1em;
    color: var(--text_color);
    box-sizing: border-box;
    position: relative;
}

.context_menu_js_outer .context_item::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    transition: 0.1s;
    position: absolute;
    top: 0;
    left: 0;
    background: var(--text_color);
    opacity: 0;
}

.context_menu_js_outer .context_item.hover::before {
    opacity: 0.15;
}

.context_menu_js_outer .context_item .context_item_inner {
    transition: 0.1s;
}

.context_menu_js_outer .context_item:active .context_item_inner {
    transform: scale(0.9);
}
        `;
        document.body.appendChild(style);

        this.context = document.createElement("div");
        this.context.className = "context_menu_js_outer";
        document.body.appendChild(this.context);

        this.add_contents(contents);

        document.querySelectorAll(target_selector).forEach((target) => {
            target.addEventListener("contextmenu", () => {
                this.open(event);
                event.preventDefault();
            });
        });

        document.addEventListener("click", () => {
            if (event.target !== this.context) this.close();
        }, false);

        document.addEventListener("keydown", this._watch_keydown.bind(this), false);
        this.is_visible = false;
    }

    add_item(label, callback = () => { }) {
        const item = document.createElement("div");
        item.className = "context_item";
        item.addEventListener("click", () => {
            callback();
        });
        item.addEventListener("mouseover", () => {
            this._hover(item);
        });
        item.addEventListener("mouseleave", () => {
            this._reset_all_hover_status();
        });

        const inner = document.createElement("div");
        inner.className = "context_item_inner";
        inner.textContent = label;

        item.appendChild(inner);
        this.context.appendChild(item);
    }

    add_separator() {
        this.context.appendChild(document.createElement("hr"));
    }

    add_contents(contents) {
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];

            const types = ["item", "separator"];

            if (types.includes(content.type) === false) continue;

            switch (content.type) {
                case "item":
                    const item = {
                        ...{
                            label: "",
                            callback: () => { }
                        },
                        ...content
                    };
                    this.add_item(item.label, item.callback);
                    break;

                case "separator":
                    this.add_separator();
                    break;
            }
        }
    }

    open(event) {
        const context_show_transition_ms = "300";
        this.context.style.transition = "none";

        if (event.screenY < window.innerHeight / 2) {
            this.context.style.bottom = "auto";
            this.context.style.top = `${event.pageY}px`;
        } else {
            this.context.style.top = "auto";
            this.context.style.bottom = `${window.innerHeight - event.pageY}px`;
        }

        if (event.screenX < window.innerWidth / 2) {
            this.context.style.right = "auto";
            this.context.style.left = `${event.pageX}px`;
        } else {
            this.context.style.left = "auto";
            this.context.style.right = `${window.innerWidth - event.pageX}px`;
        }

        this.context.style.display = "block";

        const context_height = window.getComputedStyle(this.context).getPropertyValue("height");
        this.context.style.height = "0";
        this.context.style.transition = `${context_show_transition_ms}ms`;

        setTimeout(() => {
            this.context.style.height = `${context_height}`;

            setTimeout(() => {
                this.context.style.height = "auto";
            }, context_show_transition_ms);
        }, 1);

        this.is_visible = true;
    }

    close() {
        this.context.style.display = "none";

        this._reset_all_hover_status();
        this.is_visible = false;
    }

    _watch_keydown(key) {
        if (this.is_visible === false) return;

        const current_selected_item = this.context.querySelector(".context_item.hover") || this.context.querySelector(".context_item");
        const number_of_items = this.context.querySelectorAll(".context_item").length;
        const hovered_item_index = this._hovered_item_index();
        const no_selected = hovered_item_index === null;

        switch (key.key) {
            case "Escape":
                const div = document.createElement("div");
                div.style.display = "none";
                document.body.appendChild(div);
                div.click();
                div.remove();
                break;

            case "ArrowDown":
                if (no_selected) {
                    this._hover(0);
                    break;
                }

                const next_item_index = hovered_item_index + 1 < number_of_items ? hovered_item_index + 1 : 0;
                this._hover(next_item_index);
                break;

            case "ArrowUp":
                if (no_selected) {
                    this._hover(number_of_items - 1);
                    break;
                }

                const previous_item_index = hovered_item_index - 1 >= 0 ? hovered_item_index - 1 : number_of_items - 1;
                this._hover(previous_item_index);
                break;

            case "Enter":
                current_selected_item.click();
                break;
        }

        event.preventDefault();
    }

    _reset_all_hover_status() {
        this.context.querySelectorAll(".context_item.hover").forEach((element) => {
            element.classList.remove("hover");
        });
    }

    _hover(item) {
        this._reset_all_hover_status();

        if (typeof (item) == "number") {
            this.context.querySelectorAll(".context_item").item(item).classList.add("hover");
        } else if (typeof (item) === "object") {
            item.classList.add("hover");
        }
    }

    _hovered_item_index() {
        const hovered_item = this.context.querySelector(".context_item.hover");
        const context_items = this.context.querySelectorAll(".context_item");
        if (!hovered_item) {
            return null;
        }
        for (let i = 0; i < context_items.length; i++) {
            if (hovered_item === context_items[i]) return i;
        }
    }
}
