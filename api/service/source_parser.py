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


class AlgorithmFamily(enum.Enum):
    LINEAR_MODELS = "linear-models"
    DECISION_TREE = "decision-tree"
    RANDOM_FOREST = "random-forest"
    GRADIENT_BOOSTING = "gradient-boosting"
    SVM = "svm"
    KNN = "knn"
    NAIVE_BAYES = "naive-bayes"
    NEURAL_NETWORK = "neural-network"
    CLUSTERING = "clustering"
    DIMENSIONALITY_REDUCTION = "dimensionality-reduction"


class SourceLine(typing.TypedDict):
    line: int
    content: str
    annotations: dict[str, str]


def parse_notebook(content: bytes) -> list[SourceLine]:
    nb = ujson.loads(content)
    lines: list[SourceLine] = []
    line_index = 0

    for cell_index, cell in enumerate(nb.get("cells", [])):
        if cell.get("cell_type") != "code":
            continue

        source = cell.get("source", "")
        if isinstance(source, list):
            source = "".join(source)

        for line in source.splitlines():
            lines.append(SourceLine(line=line_index, content=line, annotations={}))
            line_index += 1

    return lines


def parse_python(content: bytes) -> list[SourceLine]:
    text = content.decode()
    return [
        SourceLine(line=i, content=line, annotations={})
        for i, line in enumerate(text.splitlines())
    ]


PARSERS: dict[str, typing.Callable[[bytes], list[SourceLine]]] = {
    ".ipynb": parse_notebook,
    ".py": parse_python,
}
