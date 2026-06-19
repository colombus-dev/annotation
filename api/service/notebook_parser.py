import enum
import typing

import ujson


class Step(enum.Enum):
    DATA_ACQUISITION = "data-acquisition"
    DATA_PREPARATION = "data-preparation"
    MODELING = "modeling"
    TRAINING = "training"
    EVALUATION = "evaluation"
    PREDICTION = "prediction"
    UNKNOWN = "unknown"


class NotebookLine(typing.TypedDict):
    line: int
    content: str
    step: Step


def parse_code_lines(content: bytes) -> list[NotebookLine]:
    nb = ujson.loads(content)
    lines: list[NotebookLine] = []

    for cell_index, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue

        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)

        for line_index, line in enumerate(source.splitlines()):
            lines.append(NotebookLine(line=line_index, content=line, step=Step.UNKNOWN))

    return lines
