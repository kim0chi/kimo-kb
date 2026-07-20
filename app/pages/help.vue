<script setup lang="ts">
// In-app guide: how to run the app and what the JS/Nuxt tooling is, written for
// someone coming from a Laravel/PHP background and new to this stack.
useHead({ title: 'Help — SI Handbook' })
</script>

<template>
  <div class="help prose">
    <h1>Running &amp; understanding this app</h1>
    <p class="lede">
      Your private knowledge-base reader. This page explains the tools and how to run
      it — written for someone new to the JavaScript / Nuxt world (with Laravel
      analogies where they help).
    </p>

    <h2>Quick start</h2>
    <pre><code>cd ~/Documents/kb
mise exec -- npm run dev</code></pre>
    <p>Then open <a href="http://localhost:3000">http://localhost:3000</a>. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal to stop it.</p>

    <h2>The tools, in plain terms</h2>
    <dl>
      <dt>Node.js</dt>
      <dd>The program that runs JavaScript outside a browser. This app's server runs on it. <em>Laravel analogy:</em> Node is to JS what PHP is to your Laravel app — the runtime.</dd>

      <dt>npm</dt>
      <dd>Node's package manager: it installs libraries and runs project scripts. <em>Like Composer.</em> <code>npm run dev</code> runs the “dev” script defined in <code>package.json</code>.</dd>

      <dt>mise</dt>
      <dd>A <strong>version manager</strong>. It reads <code>mise.toml</code> in this folder and makes sure the project uses <strong>Node 22</strong>, even though your system default is Node 26. <code>mise exec -- &lt;command&gt;</code> runs that command with the project's Node. <em>Why pinned?</em> Nuxt targets Node 22, and Node 26 once broke a build — so this repo stays on 22 without touching your global setup.</dd>

      <dt>Nuxt</dt>
      <dd>The framework this app is built on — a <strong>Vue</strong> framework that bundles pages, a server, and markdown rendering into one project. <em>Laravel analogy:</em> Nuxt is to Vue what Laravel is to PHP — routing, a server layer, and conventions, all in one.</dd>

      <dt>Vue</dt>
      <dd>The UI library the pages and components are written in — your daily stack. The interactive explainers, the glossary page, the nav: all Vue components under <code>app/</code>.</dd>

      <dt>Nuxt Content</dt>
      <dd>The Nuxt module that reads your markdown files and turns them into rendered pages. It's what lets the app read the corpus in place.</dd>

      <dt>SQLite / better-sqlite3</dt>
      <dd>A tiny file-based database (<code>data/kb.sqlite</code>) that stores only your <strong>reading state and notes</strong> — never the document content. The markdown files stay the single source of truth.</dd>
    </dl>

    <h2>Running it</h2>
    <ul>
      <li><strong>Normal:</strong> <code>mise exec -- npm run dev</code> → <a href="http://localhost:3000">localhost:3000</a></li>
      <li><strong>From your phone (over Tailscale):</strong> <code>mise exec -- npm run dev:host</code>, then open the <strong>Network</strong> URL it prints (e.g. <code>http://100.x.y.z:3000</code>).</li>
      <li><strong>Stop:</strong> <kbd>Ctrl</kbd>+<kbd>C</kbd> in that terminal.</li>
      <li><strong>Port 3000 busy?</strong> It auto-uses 3001 — check the startup output for the real URL.</li>
      <li><strong>After a <code>git pull</code>, or if something looks off:</strong> run <code>mise exec -- npm install</code> once, then start it again.</li>
    </ul>
    <p class="tip">
      <strong>Why the <code>mise exec --</code> prefix?</strong> It guarantees Node 22 is used. If mise is
      activated in your shell (its shell hook), plain <code>npm run dev</code> works too.
    </p>

    <h2>Where things live</h2>
    <ul>
      <li><strong>The content</strong> comes from <code>~/Documents/evo-work</code> (<code>SI_Docs</code>, <code>notes</code>, <code>decisions</code>) — read <em>in place</em>, never modified. Keep editing it in Obsidian as before.</li>
      <li><strong>Your reading state &amp; notes</strong> live in <code>kb/data/kb.sqlite</code> (local, gitignored).</li>
      <li><strong>The app itself</strong> is <code>kb/app</code> (pages &amp; components) and <code>kb/server</code> (a small API for state, notes, and nav).</li>
    </ul>

    <h2>Good to know</h2>
    <ul>
      <li>Nothing leaves your machine — there's no login; access is local + Tailscale only.</li>
      <li>Markdown stays the source of truth. If you edit the <strong>glossary</strong>, restart the dev server so the app rebuilds its term index.</li>
      <li>The full technical write-up is in <code>kb/README.md</code>.</li>
    </ul>
  </div>
</template>

<style scoped>
.help { max-width: 100%; }
.lede { color: var(--muted); }
h1 { font-size: 1.7rem; margin-top: 0; }
h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 0.3rem; }
dl { margin: 0; }
dt { font-weight: 700; margin-top: 1rem; }
dd { margin: 0.25rem 0 0; color: var(--muted); }
code { background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 0.1rem 0.35rem; font-size: 0.88em; }
pre { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 0.9rem 1rem; overflow-x: auto; }
pre code { background: none; border: none; padding: 0; }
kbd { background: var(--panel); border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 4px; padding: 0.05rem 0.35rem; font-size: 0.82em; font-family: inherit; }
ul { padding-left: 1.2rem; }
li { margin: 0.3rem 0; }
.tip { background: var(--panel); border-left: 3px solid var(--accent); border-radius: 0 6px 6px 0; padding: 0.6rem 0.9rem; font-size: 0.92rem; }
a { color: var(--accent); }
</style>
