export function validateCatalog(data) {
    if (!data || data.schema_version !== 1) throw new Error("Palette catalog: schema_version must be 1");
    for (const key of ["categories", "palettes"]) {
        if (!Array.isArray(data[key])) throw new Error(`Palette catalog: ${key} must be an array`);
        const ids = new Set();
        for (const item of data[key]) {
            if (!item || typeof item.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(item.id)) throw new Error(`Palette catalog: invalid ${key} id`);
            if (ids.has(item.id)) throw new Error(`Palette catalog: duplicate ${key} id ${item.id}`);
            ids.add(item.id);
            const order = item.order === undefined ? 0 : item.order;
            if (typeof order !== "number" || !Number.isFinite(order)) throw new Error(`Palette catalog: invalid order for ${item.id}`);
        }
        data[key].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    const categories = new Set(data.categories.map(item => item.id));
    for (const palette of data.palettes) {
        if (!categories.has(palette.category)) throw new Error(`Palette ${palette.id}: unknown category`);
        if (!Array.isArray(palette.colors) || palette.colors.length < 2 || palette.colors.length > 5) throw new Error(`Palette ${palette.id}: colors must contain 2 to 5 entries`);
        for (const color of palette.colors) {
            if (!color || typeof color.hex !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color.hex)) throw new Error(`Palette ${palette.id}: invalid #RRGGBB color`);
            if (typeof color.prompt !== "string" || !color.prompt.trim() || /^#[0-9a-fA-F]{6}$/.test(color.prompt.trim())) throw new Error(`Palette ${palette.id}: prompt must be a nonempty color expression`);
            color.hex = color.hex.toUpperCase();
        }
    }
    return data;
}

