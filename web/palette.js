import { app } from "../../scripts/app.js";
import { validateCatalog } from "./catalog.mjs";

const base = new URL(".", import.meta.url);
const catalog = fetch(new URL("palettes.json", base), { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error(`Palette catalog: HTTP ${response.status}`);
    return response.json();
}).then(validateCatalog);
// Nodes may be created after the initial fetch has already failed.
catalog.catch(() => {});
const style = document.createElement("link");
style.rel = "stylesheet";
style.href = new URL("palette.css", base).href;
document.head.append(style);

function createPalette(node) {
    const selected = node.widgets.find(widget => widget.name === "palette_id");
    selected.type = "converted-widget";
    selected.computeSize = () => [0, -4];
    selected.draw = () => {};
    const element = (tag, className, text) => {
        const item = document.createElement(tag);
        if (className) item.className = className;
        if (text !== undefined) item.textContent = text;
        return item;
    };
    const root = element("div", "color-prompt-palette");
    const filterLabel = element("label", "cpp-filter", "color ");
    const colorFilter = element("select");
    for (const value of ["2", "3", "4", "5", "all"]) {
        const option = element("option", "", value);
        option.value = value;
        colorFilter.append(option);
    }
    colorFilter.value = "all";
    filterLabel.append(colorFilter);
    const navigation = element("nav", "cpp-nav");
    navigation.setAttribute("aria-label", "Categories / カテゴリへ移動");
    const grid = element("div", "cpp-grid");
    const status = element("div", "cpp-status", "Loading palettes / 読み込み中…");
    status.setAttribute("role", "status");
    const details = element("div", "cpp-details");
    root.append(filterLabel, navigation, grid, status, details);
    const events = new AbortController();
    const cards = new Map(), headings = new Map();
    let data = null, removed = false, frame = 0;
    node.properties ??= {};
    const label = item => [item.name ?? item.id, item.name_ja].filter(Boolean).join(" / ");
    function swatches(colors) {
        const bar = element("div", "cpp-swatches");
        for (const color of colors) {
            const swatch = element("span");
            swatch.style.backgroundColor = color.hex;
            swatch.title = `${color.prompt} (${color.hex})`;
            bar.append(swatch);
        }
        return bar;
    }
    function matchesFilter(palette) {
        return colorFilter.value === "all" || palette.colors.length === Number(colorFilter.value);
    }
    function renderList() {
        grid.replaceChildren();
        cards.clear();
        headings.clear();
        for (const category of data.categories) {
            const entries = data.palettes.filter(item => item.category === category.id && matchesFilter(item));
            const button = [...navigation.children].find(item => item.dataset.category === category.id);
            button.hidden = entries.length === 0;
            if (!entries.length) continue;
            const heading = element("h3", "cpp-heading", label(category));
            headings.set(category.id, heading);
            grid.append(heading);
            for (const palette of entries) {
                const card = element("button", "cpp-card");
                card.dataset.id = palette.id;
                card.title = [label(palette), palette.description_ja, ...palette.colors.map(color => `${color.prompt} (${color.hex})`)].filter(Boolean).join("\n");
                card.append(swatches(palette.colors), element("strong", "", label(palette)));
                grid.append(card);
                cards.set(palette.id, card);
            }
        }
    }
    function refresh() {
        if (!data) return;
        const filter = node.properties.color_palette_filter;
        colorFilter.value = ["2", "3", "4", "5"].includes(filter) ? filter : "all";
        const palette = data.palettes.find(item => item.id === selected.value);
        for (const [id, card] of cards) {
            card.classList.toggle("selected", id === selected.value);
            card.setAttribute("aria-pressed", String(id === selected.value));
        }
        for (const button of navigation.children) {
            const key = button.dataset.category;
            button.setAttribute("aria-current", key === node.properties.color_palette_category ? "location" : "false");
        }
        details.replaceChildren();
        status.classList.toggle("cpp-error", selected.value !== "" && !palette);
        if (!palette) {
            if (!data.palettes.length) status.textContent = "No palettes / JSONにパレットを追加してください";
            else if (selected.value === "") status.textContent = "No palette selected / パレット未選択";
            else status.textContent = `Palette unavailable: ${selected.value}. Select a palette / パレットを再選択してください`;
            return;
        }
        status.textContent = `Selected: ${label(palette)} (${palette.colors.length} colors)`;
        details.append(swatches(palette.colors));
        for (let i = 0; i < 5; i++) details.append(element("div", "cpp-color", `color${i + 1}: ${palette.colors[i] ? `${palette.colors[i].prompt} (${palette.colors[i].hex})` : "未定義 / undefined"}`));
    }
    function change(edit) {
        const graph = node.graph;
        graph?.beforeChange();
        try {
            edit();
            refresh();
            graph?.change();
            node.setDirtyCanvas(true, true);
        } finally {
            graph?.afterChange();
        }
    }
    function jump(key, behavior) {
        const heading = headings.get(key);
        if (heading && !heading.hidden) grid.scrollTo({ top: heading.offsetTop, behavior });
    }
    function restore() {
        if (!data || removed) return;
        const filter = node.properties.color_palette_filter;
        colorFilter.value = ["2", "3", "4", "5"].includes(filter) ? filter : "all";
        // Only a fresh, empty selection receives a default; deleted IDs stay visible.
        if (selected.value === "" && !node.properties.color_palette_unselected && data.palettes.length) {
            const first = data.categories.flatMap(category => data.palettes.filter(item => item.category === category.id)).find(matchesFilter);
            if (first) selected.value = first.id;
        }
        renderList();
        refresh();
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
            if (!removed) jump(node.properties.color_palette_category, "instant");
        });
    }
    navigation.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button) return;
        change(() => { node.properties.color_palette_category = button.dataset.category; });
        jump(button.dataset.category, "smooth");
    }, { signal: events.signal });
    colorFilter.addEventListener("change", () => {
        change(() => {
            node.properties.color_palette_filter = colorFilter.value;
            const palette = data.palettes.find(item => item.id === selected.value);
            if (palette && colorFilter.value !== "all" && palette.colors.length !== Number(colorFilter.value)) {
                selected.value = "";
                selected.callback?.(selected.value);
                node.properties.color_palette_unselected = true;
            }
            renderList();
        });
        grid.scrollTo({ top: 0, behavior: "instant" });
    }, { signal: events.signal });
    grid.addEventListener("click", event => {
        const card = event.target.closest(".cpp-card");
        if (!card || card.dataset.id === selected.value) return;
        change(() => {
            selected.value = card.dataset.id;
            selected.callback?.(selected.value);
            node.properties.color_palette_unselected = false;
        });
    }, { signal: events.signal });
    for (const name of ["pointerdown", "wheel", "keydown"]) root.addEventListener(name, event => event.stopPropagation(), { signal: events.signal });
    const display = node.addDOMWidget("color_palette", "color_palette", root, {
        serialize: false, hideOnZoom: false, getMinHeight: () => 390,
    });
    display.serialize = false;
    node.size = [390, 650];
    const configure = node.onConfigure;
    node.onConfigure = function (...args) {
        const result = configure?.apply(this, args);
        restore();
        return result;
    };
    const onRemoved = node.onRemoved;
    node.onRemoved = function (...args) {
        removed = true;
        cancelAnimationFrame(frame);
        events.abort();
        return onRemoved?.apply(this, args);
    };
    catalog.then(value => {
        if (removed) return;
        data = value;
        for (const category of data.categories) {
            const button = element("button", "", label(category));
            button.dataset.category = category.id;
            navigation.append(button);
        }
        restore();
    }).catch(error => {
        if (removed) return;
        status.classList.add("cpp-error");
        status.textContent = `Catalog error / web/palettes.jsonを確認してください: ${error.message}`;
        console.error("Color Prompt Palette", error);
    });
}

app.registerExtension({
    name: "PALEALLOY.ColorPromptPalette",
    nodeCreated(node) {
        if (node.comfyClass === "ColorPromptPalette") createPalette(node);
    },
});
