[日本語](README_JA.md) | English

# ComfyUI Color Prompt Palette

Select one palette visually and replace `__color1__`–`__color5__` in a multiline prompt. Categories navigate within one continuous, scrollable list. Categories, palettes, and their 2–5 colors are loaded from `web/palettes.json`.

## Installation and use

Place this directory in `ComfyUI/custom_nodes`, restart ComfyUI, and refresh the browser. Requires a ComfyUI version providing `comfy_api.latest` and DOM widgets; no additional dependencies or online services are needed.

Add **PALEALLOY / Prompt → Color Prompt Palette**, connect an external STRING to `template_text`, and click a palette. There are no prompt text fields on the node. Resize the node as needed. Leave `template_text` unconnected when only the colors, image, or theme are needed; `replaced_text` is then empty.

Outputs, in order: `replaced_text`, `color1`, `color2`, `color3`, `color4`, `color5` (STRING), `palette_image` (IMAGE), and `theme` (STRING). Undefined color outputs are empty, while their placeholders remain unchanged. Replacement is case-sensitive, single-pass, and preserves all other text.

`theme` joins the palette's defined color names in order, each followed by ` theme`, separated by a comma and space. Example: `slate navy theme, dusty mauve theme, muted coral theme, warm beige theme`. A missing palette ID returns an empty theme.

The image is a plain 128×128 RGB palette reference with equal-width vertical stripes, not a guarantee of ControlNet/T2I-Adapter compatibility. Nothing is saved to disk during execution.

Selection and the last category navigation target are saved in the workflow. A missing palette ID requires explicit reselection; execution logs an error and returns the original text, empty color strings, and a black image.

Use the `color` dropdown (`2`, `3`, `4`, `5`, `all`; default `all`) to rebuild the list with only palettes whose `colors` array has exactly that length. Cards and category headings outside the filter are removed from the list, and empty category navigation buttons are hidden. The filter is saved per node in the workflow. When the selected palette does not match a newly chosen length, its selection is cleared and the node remains unselected until the user chooses a visible palette. This unselected state is also restored from the workflow. Choosing `all`, or choosing the current palette's color count, preserves selection.

## Palette data

Edit only `web/palettes.json` to add categories and palettes. Keep stable unique IDs, valid category references, 2–5 ordered colors, `#RRGGBB` HEX values, and nonempty color expressions in `prompt`. Category and palette `order` values sort ascending, with ties retaining JSON order. Restart ComfyUI and refresh the browser after edits. Invalid data is reported rather than silently skipped.

Load `example_workflows/color_prompt_palette.json` for an external text input and replaced-text, image, and theme previews. Tests: run `tests/test_palette.py` using ComfyUI's Python, and `node tests/frontend.mjs`.

