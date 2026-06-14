from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph

from app.services.llm import generate_answer


class QAState(TypedDict, total=False):
    question: str
    context: str
    model: str
    answer: str


def build_qa_graph():
    graph = StateGraph(QAState)

    def answer_node(state: QAState) -> QAState:
        prompt = (
            "Question:\n"
            f"{state['question']}\n\n"
            "Context:\n"
            f"{state['context']}\n\n"
            "Return a concise answer grounded in the context and include inline citations."
        )
        return {"answer": generate_answer(prompt, state.get("model"))}

    graph.add_node("answer", answer_node)
    graph.set_entry_point("answer")
    graph.add_edge("answer", END)
    return graph.compile()
