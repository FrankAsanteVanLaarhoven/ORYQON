"""Typed, inert tool proposals — the only thing an agent may emit.

A :class:`ToolProposal` is plain data: a tool id and arguments. It carries no
handler, no credential and no network. Producing one has no side effect; the
control-plane broker is the sole party that can turn a proposal into an action,
and only under allowlist, tenant, approval and kill-switch checks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping


@dataclass(frozen=True)
class ToolProposal:
    """An inert request to run a tool. Immutable; no execution capability."""

    tool_id: str
    arguments: Mapping[str, object] = field(default_factory=dict)
    rationale: str = ""

    def __post_init__(self) -> None:
        # Freeze the arguments mapping so a proposal cannot be mutated in flight.
        object.__setattr__(self, "arguments", MappingProxyType(dict(self.arguments)))


@dataclass(frozen=True)
class AgentContext:
    """Read-only scope handed to an agent. No credentials, ever."""

    tenant_id: str
    agent: str
    allowed_tool_ids: frozenset[str]


class Agent:
    """Base agent. Its entire public surface is :meth:`propose`.

    There is deliberately no ``execute``, ``invoke``, ``connect``, ``fetch`` or
    credential accessor: an agent cannot reach a connector, a database or the
    network. It can only describe an action it believes should happen.
    """

    def __init__(self, context: AgentContext) -> None:
        self._context = context

    @property
    def context(self) -> AgentContext:
        return self._context

    def propose(
        self,
        tool_id: str,
        arguments: Mapping[str, object] | None = None,
        rationale: str = "",
    ) -> ToolProposal:
        """Emit an inert proposal. Enforcement happens later, at the broker."""
        return ToolProposal(
            tool_id=tool_id,
            arguments=arguments or {},
            rationale=rationale,
        )
