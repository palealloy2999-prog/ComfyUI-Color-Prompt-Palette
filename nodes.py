import json
import logging
import re
from functools import lru_cache
from pathlib import Path

import torch
from comfy_api.latest import io

LOGGER = logging.getLogger(__name__)
PLACEHOLDER = re.compile(r"__color([1-5])__")


def validate_catalog(data):
    if not isinstance(data, dict) or type(data.get("schema_version")) is not int or data["schema_version"] != 1:
        raise ValueError("Palette catalog: schema_version must be 1")
    for key in ("categories", "palettes"):
        if not isinstance(data.get(key), list):
            raise ValueError(f"Palette catalog: {key} must be an array")
        ids = set()
        for item in data[key]:
            if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not re.fullmatch(r"[A-Za-z0-9_-]+", item["id"]):
                raise ValueError(f"Palette catalog: invalid {key} id")
            if item["id"] in ids:
                raise ValueError(f"Palette catalog: duplicate {key} id {item['id']}")
            ids.add(item["id"])
            if type(item.get("order", 0)) not in (int, float) or not float("-inf") < item.get("order", 0) < float("inf"):
                raise ValueError(f"Palette catalog: invalid order for {item['id']}")
        data[key] = sorted(data[key], key=lambda item: item.get("order", 0))
    categories = {item["id"] for item in data["categories"]}
    for palette in data["palettes"]:
        if not isinstance(palette.get("category"), str) or palette["category"] not in categories:
            raise ValueError(f"Palette {palette['id']}: unknown category")
        colors = palette.get("colors")
        if not isinstance(colors, list) or not 2 <= len(colors) <= 5:
            raise ValueError(f"Palette {palette['id']}: colors must contain 2 to 5 entries")
        for color in colors:
            if not isinstance(color, dict) or not isinstance(color.get("hex"), str) or not re.fullmatch(r"#[0-9a-fA-F]{6}", color["hex"]):
                raise ValueError(f"Palette {palette['id']}: invalid #RRGGBB color")
            if not isinstance(color.get("prompt"), str) or not color["prompt"].strip() or re.fullmatch(r"#[0-9a-fA-F]{6}", color["prompt"].strip()):
                raise ValueError(f"Palette {palette['id']}: prompt must be a nonempty color expression")
            color["hex"] = color["hex"].upper()
    return data


@lru_cache(maxsize=1)
def load_catalog():
    try:
        return validate_catalog(json.loads((Path(__file__).parent / "web" / "palettes.json").read_text(encoding="utf-8")))
    except (ValueError, OSError):
        LOGGER.exception("Cannot load color palette catalog; fix web/palettes.json and restart ComfyUI")
        raise


def replace_colors(text, colors):
    return PLACEHOLDER.sub(lambda match: colors[int(match[1]) - 1]["prompt"] if int(match[1]) <= len(colors) else match[0], text)


def palette_image(colors):
    image = torch.empty((1, 128, 128, 3), dtype=torch.float32, device="cpu")
    for index, color in enumerate(colors):
        rgb = [int(color["hex"][offset:offset + 2], 16) / 255 for offset in (1, 3, 5)]
        image[:, :, index * 128 // len(colors):(index + 1) * 128 // len(colors), :] = torch.tensor(rgb, dtype=torch.float32, device="cpu")
    return image


class ColorPromptPalette(io.ComfyNode):
    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="ColorPromptPalette",
            display_name="Color Prompt Palette",
            category="PALEALLOY / Prompt",
            inputs=[
                io.String.Input("template_text", force_input=True, optional=True),
                io.String.Input("palette_id", default="", socketless=True),
            ],
            outputs=[io.String.Output("replaced_text"), *[io.String.Output(f"color{i}") for i in range(1, 6)], io.Image.Output("palette_image"), io.String.Output("theme")],
        )

    @classmethod
    def execute(cls, template_text="", palette_id="") -> io.NodeOutput:
        palette = next((item for item in load_catalog()["palettes"] if item["id"] == palette_id), None)
        if palette is None:
            LOGGER.error("Unknown color palette id %r; select an existing palette", palette_id)
            return io.NodeOutput(template_text, "", "", "", "", "", torch.zeros((1, 128, 128, 3), dtype=torch.float32), "")
        colors = palette["colors"]
        prompts = [color["prompt"] for color in colors] + [""] * (5 - len(colors))
        theme = ", ".join(f"{color['prompt']} theme" for color in colors)
        return io.NodeOutput(replace_colors(template_text, colors), *prompts, palette_image(colors), theme)
