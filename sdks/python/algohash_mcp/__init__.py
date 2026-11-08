"""Typed client for the AlgoHash Studio, Team and Open API MCP servers."""
from .client import AlgoHashError, ApprovalRequest, McpClient, ToolResult
from ._generated.open import OPEN_ACTION_SCOPES, OpenClient
from ._generated.studio import STUDIO_ACTION_SCOPES, StudioClient
from ._generated.team import TEAM_ACTION_SCOPES, TeamClient

__version__ = "0.1.0"
__all__ = ["AlgoHashError", "ApprovalRequest", "McpClient", "ToolResult", "StudioClient", "TeamClient", "OpenClient",
           "STUDIO_ACTION_SCOPES", "TEAM_ACTION_SCOPES", "OPEN_ACTION_SCOPES"]
