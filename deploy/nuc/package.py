"""Create a private deployment context; copy source and Markdown snapshots only."""
import json
import pathlib
import shutil
import subprocess
import sys

repo = pathlib.Path(__file__).resolve().parents[2]
target = pathlib.Path(sys.argv[1]).resolve()
if target.exists():
    raise SystemExit('Use a new destination outside the repository.')
if target.is_relative_to(repo):
    raise SystemExit('Deployment snapshots must live outside the repository.')
target.mkdir(mode=0o700, parents=True)
files = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=repo).decode().split('\0')
for name in filter(None, files):
    source = repo / name
    if not source.is_file() or source.is_symlink():
        continue
    dest = target / 'app' / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)

library = pathlib.Path.home() / 'Documents/knowledge'
count = 0
for manifest in sorted(library.glob('*.kb.json')) + sorted(library.glob('*/kb.json')):
    raw = json.loads(manifest.read_text())
    root = pathlib.Path(raw.get('root', manifest.parent)).resolve()
    ident = raw['id']
    if not ident.replace('-', '').replace('_', '').isalnum():
        raise SystemExit('Unexpected notebook identifier')
    internal = manifest.name == 'kb.json' and 'root' not in raw
    dest_root = target / ('knowledge' if internal else 'content') / ident
    relative_files = set()
    for tree in raw.get('trees', ['.']):
        relative_files.update(p.relative_to(root) for p in (root / tree).rglob('*.md') if p.is_file() and not p.is_symlink() and '.git' not in p.parts)
    for extra in [raw.get('glossary'), raw.get('nav', {}).get('file')]:
        if extra and (root / extra).is_file():
            relative_files.add(pathlib.Path(extra))
    for relative in relative_files:
        if relative.is_absolute() or '..' in relative.parts:
            raise SystemExit('Notebook file escapes its root')
        dest = dest_root / relative
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / relative, dest)
        count += 1
    raw['root'] = '/srv/kimo/' + ('knowledge/' if internal else 'content/') + ident
    dest_manifest = target / 'knowledge' / ident / 'kb.json' if internal else target / 'knowledge' / (ident + '.kb.json')
    dest_manifest.parent.mkdir(parents=True, exist_ok=True)
    dest_manifest.write_text(json.dumps(raw, indent=2) + '\n')
shutil.copy2(repo / 'deploy/nuc/compose.yaml', target / 'compose.yaml')
print(f'Prepared {count} Markdown files in {target}')
