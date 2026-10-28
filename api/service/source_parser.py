import enum
import typing

import ujson


class Step(enum.Enum):
    DATA_COLLECTION = (
        "Data Collection",
        "The process of gathering and importing data from various sources into a data analysis environment for further processing and analysis.",
    )
    DATA_PREPARATION = (
        "Data Preparation",
        "The initial phase of data science where  raw data is cleaned, filtered, transformed, and normalized to ensure quality and relevance for analysis.",
    )
    DATA_MODELING = (
        "Data Modeling",
        "The process of creating mathematical or computational representations of real-world phenomena using statistical and machine learning techniques to extract insights and make predictions.",
    )
    MODEL_DEPLOYMENT = (
        "Model Deployment",
        "The application of a previously trained  machine learning model to new, unseen data for the purpose of making predictions or decisions.",
    )
    MODEL_EVALUATION = (
        "Model Evaluation",
        "The process of assessing a trained  model's performance using specific metrics and comparing it against new datasets or real-world scenarios to determine its effectiveness and reliability.",
    )
    SAVE_RESULTS = (
        "Save Results",
        "The process of serializing and persisting data for future use or analysis.",
    )


class AlgorithmFamily(enum.Enum):
    LINEAR_MODELS = "Linear Models", ""
    DECISION_TREE = "Decision Tree", ""
    RANDOM_FOREST = "Random Forest", ""
    GRADIENT_BOOSTING = "Gradient Boosting", ""
    SVM = "SVM", ""
    KNN = "KNN", ""
    NAIVE_BAYES = "Naive Bayes", ""
    NEURAL_NETWORK = "Neural Network", ""
    CLUSTERING = "Clustering", ""
    DIMENSIONALITY_REDUCTION = "Dimensionality Reduction", ""


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
