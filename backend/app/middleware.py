"""Middlewares personalizados."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class PrivateNetworkAccessMiddleware(BaseHTTPMiddleware):
    """Adiciona headers para permitir Private Network Access.

    Necessário para que sites públicos (ex: idealista.pt) possam fazer
    pedidos para servidores em redes privadas (ex: localhost, 192.168.x.x).

    Política do Chrome 2023+ (Private Network Access / CORS-RFC1918).
    """

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response