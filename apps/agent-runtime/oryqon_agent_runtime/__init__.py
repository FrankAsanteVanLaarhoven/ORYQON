"""ORYQON agent runtime.

Agents reason and *propose*. They hold no credentials and have no execution
path: the only thing an agent can emit is a typed, inert :class:`ToolProposal`,
which the TypeScript control-plane tool broker admits (or refuses) under policy
and human approval. This boundary is the central safety property of ORYQON.
"""

from .proposal import Agent, AgentContext, ToolProposal

__all__ = ["Agent", "AgentContext", "ToolProposal"]
