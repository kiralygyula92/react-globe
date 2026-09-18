---
description: One Markdown file with every page and every example, so a coding agent works from the documentation instead of from memory.
---

## Prerequisites

- A coding agent that can read a file in your project or fetch a URL — Claude Code, Cursor, GitHub
  Copilot, Windsurf and similar tools all can.
- React Globe installed, as in [Installation](/react-globe/getting-started/installation/).

## Installation

Save the file in your project, where your agent looks for context:

```bash
curl -o docs/react-globe.md {{site}}/react-globe/llms-full.md
```

Or give the agent the address itself: `{{site}}/react-globe/llms-full.md`. Download it again after
upgrading the package; the file describes the version this site documents.

## What is in the file

Every page of this documentation in the sidebar's reading order: getting started, every capability
page, customization, the guides and integrations, and the whole API reference. Each live demo appears
as its source code, where its page shows it — on the site those examples are running globes; in the
file each one is the code that runs them. Every page starts with its address, so an agent can say
which page an answer came from.

It is generated from the same Markdown as the site, in the same build, so it cannot say anything the
site does not.

## Which file to use

| File | What it holds | Use it when |
|---|---|---|
| [`llms-full.md`](/react-globe/llms-full.md) | Every page and the source of every example | the agent should know the whole library |
| [`llms-full.txt`](/react-globe/llms-full.txt) | The same file, under the name tools look for | a tool asks for a documentation URL |
| [`llms.txt`](/react-globe/llms.txt) | An index: one line per page, each linking its Markdown | the agent should fetch only what it needs |
| A page's URL with `.md` | That one page as Markdown, with the reference for its API | you are working on a single feature |

The full file is about 200 KB — roughly 50,000 to 70,000 tokens, depending on the tokenizer — so
it fits whole in the context window of a current frontier model. If your tool's window is smaller, give
it `llms.txt` and let it fetch the pages it needs.

## Minimal working example

With the file in `docs/`, a request like this has everything it needs to be answered from the
documentation rather than from guesswork:

> Using docs/react-globe.md, add a globe to the dashboard page that shows our warehouses as clustered
> pins, with a popup naming each warehouse and its stock level.

## Verification

Ask the agent something only the documentation answers — for example, how close the camera has to be
before capitals appear, and which prop changes that. An agent reading the file answers `2.5`, set with
`capitalsMinZoom`, and can name the [Capitals](/react-globe/capitals/) page it came from; one that is
not reading it guesses.

## Next steps

- [Installation](/react-globe/getting-started/installation/) — the package, its peers and the
  stylesheet.
- [Usage](/react-globe/getting-started/usage/) — pins, a popup and controls in one component.
- [Globe reference](/react-globe/api/globe/) — every prop, generated from the TypeScript declarations.
