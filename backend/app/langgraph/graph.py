from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.services.llm import generate_answer


class QAState(TypedDict, total=False):
    question: str
    context: str
    model: str
    history: list[dict[str, str]]
    answer: str


def build_qa_graph():
    graph = StateGraph(QAState)

    def answer_node(state: QAState) -> QAState:
        answer = generate_answer(
            question=state["question"],
            context=state.get("context") or "",
            model=state.get("model"),
            history=state.get("history") or [],
        )
        return {"answer": answer}

    graph.add_node("answer", answer_node)
    graph.set_entry_point("answer")
    graph.add_edge("answer", END)
    return graph.compile()
