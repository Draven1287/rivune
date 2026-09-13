Think of these as four separate layers:

- **AI model:** The software that interprets a prompt and generates an answer. In this example, the fictional model is **Nova-3**.
- **Provider account:** Your relationship with the fictional company **Starforge AI**, which operates Nova-3. The account covers identity, permissions, credentials, and possibly billing.
- **CLI application:** A program you operate by typing commands in a terminal. It accepts your prompt, authenticates with Starforge, sends the request, and displays the response.
- **Rivune:** The application that coordinates supported CLI applications and presents their results. It is neither the model nor your provider account; it depends on a compatible, correctly configured CLI to reach the provider.

A typical request travels like this:

```text
You enter a prompt in Rivune
        ↓
Rivune passes it to the CLI
        ↓
The CLI authenticates with your Starforge account
        ↓
Starforge sends the prompt to Nova-3
        ↓
Nova-3 generates an answer
        ↓
Starforge → CLI → Rivune → finished answer shown to you
```

Having a Starforge account does not make every part of that path ready. For example, the CLI might not be installed or signed in; it might require a separate API key; your account might lack access to Nova-3; Rivune’s CLI integration might not be enabled; or network and file permissions might block it. Other integrations—such as calendars, code hosts, or databases—also require their own connections and permissions.

A simple analogy: the model is a chef, the provider account is your customer account with the restaurant, the CLI is the waiter carrying your order, and Rivune is the desk coordinating the waiter and showing you the result. Having a restaurant account does not guarantee that a waiter has been assigned or every outside service is connected.

**Review note:** Claude usefully distinguished model access from unrelated tool integrations and explicitly flagged uncertainty about Rivune, but its proposed Rivune architecture was inferred from a workspace name. ChatGPT supplied the clearer Rivune-to-CLI flow and setup checklist. This synthesis adopts that flow while avoiding claims about undocumented internal implementation. No tools or tests were run; installing/authenticating the CLI and sending a small prompt first through it and then through Rivune are suggested checks only.