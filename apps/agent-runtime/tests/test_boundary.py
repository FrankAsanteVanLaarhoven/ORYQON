"""The agent safety boundary, as executable assertions."""

import dataclasses

import pytest

from oryqon_agent_runtime import Agent, AgentContext, ToolProposal


def make_agent() -> Agent:
    return Agent(
        AgentContext(
            tenant_id="tenant-a",
            agent="channel-compiler",
            allowed_tool_ids=frozenset({"shopify.publish"}),
        )
    )


def test_agent_can_only_propose():
    agent = make_agent()
    proposal = agent.propose("shopify.publish", {"variant": "v1"}, "launch")
    assert isinstance(proposal, ToolProposal)
    assert proposal.tool_id == "shopify.publish"
    assert proposal.arguments["variant"] == "v1"


def test_agent_has_no_execution_surface():
    agent = make_agent()
    for forbidden in ("execute", "invoke", "connect", "fetch", "run", "credential", "token"):
        assert not hasattr(agent, forbidden), f"agent must not expose {forbidden!r}"


def test_proposal_is_immutable():
    proposal = ToolProposal("shopify.publish", {"a": 1})
    with pytest.raises(dataclasses.FrozenInstanceError):
        proposal.tool_id = "other"  # type: ignore[misc]


def test_proposal_arguments_cannot_be_mutated():
    proposal = ToolProposal("shopify.publish", {"a": 1})
    with pytest.raises(TypeError):
        proposal.arguments["a"] = 2  # type: ignore[index]


def test_context_carries_no_credential():
    ctx = AgentContext("tenant-a", "channel-compiler", frozenset())
    field_names = {f.name for f in dataclasses.fields(ctx)}
    assert field_names == {"tenant_id", "agent", "allowed_tool_ids"}
    assert "credential" not in field_names and "token" not in field_names
