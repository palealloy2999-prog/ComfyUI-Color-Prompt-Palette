from comfy_api.latest import ComfyExtension, io
from .nodes import ColorPromptPalette

WEB_DIRECTORY = "./web"


class ColorPaletteExtension(ComfyExtension):
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [ColorPromptPalette]


async def comfy_entrypoint() -> ColorPaletteExtension:
    return ColorPaletteExtension()
