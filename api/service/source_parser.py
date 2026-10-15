import enum
import typing

import ujson


class Step(enum.Enum):
    DATA_ACQUISITION = "Data Acquisition"
    DATA_PREPARATION = "Data Preparation"
    MODELING = "Modeling"
    TRAINING = "Training"
    EVALUATION = "Evaluation"
    PREDICTION = "Prediction"


class AlgorithmFamily(enum.Enum):
    LINEAR_MODELS = "Linear Models"
    DECISION_TREE = "Decision Tree"
    RANDOM_FOREST = "Random Forest"
    GRADIENT_BOOSTING = "Gradient Boosting"
    SVM = "SVM"
    KNN = "KNN"
    NAIVE_BAYES = "Naive Bayes"
    NEURAL_NETWORK = "Neural Network"
    CLUSTERING = "Clustering"
    DIMENSIONALITY_REDUCTION = "Dimensionality Reduction"


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
