from __future__ import annotations

from html import escape

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["preview"])


def _limited_preview_html(request: Request) -> str:
    path = escape(request.url.path, quote=True)
    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agrodomain Limited Preview</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4efe6;
        --panel: #fffaf2;
        --ink: #1f2a1f;
        --muted: #5f695f;
        --accent: #236d4d;
        --accent-soft: rgba(35, 109, 77, 0.12);
        --border: rgba(31, 42, 31, 0.12);
      }}

      * {{
        box-sizing: border-box;
      }}

      body {{
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Arial, sans-serif;
        background:
          radial-gradient(circle at top left, rgba(35, 109, 77, 0.12), transparent 28rem),
          linear-gradient(180deg, #f8f3ea 0%, var(--bg) 100%);
        color: var(--ink);
      }}

      main {{
        width: min(44rem, calc(100vw - 2rem));
        margin: 4rem auto;
        padding: 2rem;
        border: 1px solid var(--border);
        border-radius: 1.5rem;
        background: var(--panel);
        box-shadow: 0 1.5rem 3rem rgba(31, 42, 31, 0.08);
      }}

      .eyebrow {{
        margin: 0 0 0.75rem;
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }}

      h1 {{
        margin: 0 0 1rem;
        font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.05;
      }}

      p {{
        margin: 0 0 1rem;
        line-height: 1.6;
        color: var(--muted);
      }}

      ul {{
        margin: 1.5rem 0;
        padding-left: 1.2rem;
        color: var(--muted);
      }}

      li + li {{
        margin-top: 0.55rem;
      }}

      .path {{
        display: inline-flex;
        padding: 0.35rem 0.65rem;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-weight: 600;
      }}

      .meta {{
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid var(--border);
        font-size: 0.95rem;
      }}
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Agrodomain recovery hotfix</p>
      <h1>Limited preview. Public sign-in and product entry are not live on this service.</h1>
      <p>
        This endpoint is the API service, not the public web application. During recovery, any browser path that is
        not an API or health endpoint resolves to this truthful holding page instead of a fake product flow.
      </p>
      <p>
        Requested path: <span class="path">{path}</span>
      </p>
      <ul>
        <li>No user account action should be attempted on this service URL.</li>
        <li>Operational health endpoints remain available for deployment checks.</li>
        <li>The real browser runtime must be deployed from the Next.js web app before sign-in or app routes are exposed again.</li>
      </ul>
      <p class="meta">
        Recovery rule: route reachability never counts as product readiness without end-to-end workflow proof.
      </p>
    </main>
  </body>
</html>"""


def _preview_response(request: Request) -> HTMLResponse:
    response = HTMLResponse(_limited_preview_html(request), status_code=503)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    response.headers["X-Robots-Tag"] = "noindex, nofollow"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "style-src 'unsafe-inline'; "
        "img-src 'self' data:; "
        "base-uri 'none'; "
        "form-action 'none'; "
        "frame-ancestors 'none'"
    )
    return response


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
def limited_preview_root(request: Request) -> HTMLResponse:
    return _preview_response(request)


@router.get("/{path:path}", response_class=HTMLResponse, include_in_schema=False)
def limited_preview_fallback(path: str, request: Request) -> HTMLResponse:
    return _preview_response(request)
