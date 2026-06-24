---
name: devops-ansible-playbook-builder
description: Automatisation d'infrastructure avec Ansible — playbooks, roles, inventaires, vault et modules. Se déclenche avec "Ansible", "playbook", "ansible-playbook", "Ansible role", "Ansible vault", "automatisation serveur".
---

# Ansible Playbook Builder

## Workflow

### 1. Analyser l'infrastructure cible

Recenser : systèmes d'exploitation (RHEL/Ubuntu/Debian), accès SSH (clé ou bastion), utilisateur de connexion (`ansible_user`), privilèges sudo.

**Critères de décision — inventaire statique vs dynamique :**
- < 20 hôtes stables → inventaire statique INI/YAML
- Cloud (AWS, Azure, GCP) ou infra éphémère → plugin dynamique (`amazon.aws.ec2`, `azure.azcollection.azure_rm`)

### 2. Structurer l'inventaire

```ini
# inventories/production/hosts.ini
[web]
web01.prod.example.com ansible_user=deploy
web02.prod.example.com ansible_user=deploy

[db]
db01.prod.example.com ansible_user=deploy

[all:vars]
ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

```
inventories/
  production/
    hosts.ini
    group_vars/
      all.yml          # variables communes
      web.yml          # variables groupe web
    host_vars/
      db01.prod.example.com.yml
  staging/
    hosts.ini
    group_vars/
```

Tester la connectivité avant tout playbook :
```bash
ansible all -i inventories/production/hosts.ini -m ping
```

### 3. Concevoir les playbooks

Structure minimale production-ready :

```yaml
# site.yml
---
- name: Configure web servers
  hosts: web
  become: true
  gather_facts: true
  tags: [web]

  pre_tasks:
    - name: Ensure Python3 is present
      raw: apt-get install -y python3
      changed_when: false

  roles:
    - role: common
    - role: nginx
      vars:
        nginx_port: 443

  post_tasks:
    - name: Verify nginx is responding
      uri:
        url: "https://{{ ansible_fqdn }}"
        status_code: 200
      delegate_to: localhost
```

**Commandes courantes :**
```bash
# Dry-run avec diff
ansible-playbook -i inventories/production/hosts.ini site.yml --check --diff

# Exécution ciblée par tag
ansible-playbook site.yml -i inventories/production/hosts.ini --tags nginx

# Limiter à un hôte
ansible-playbook site.yml -i inventories/production/hosts.ini --limit web01.prod.example.com

# Verbose pour debug
ansible-playbook site.yml -vvv
```

### 4. Développer les roles

Structure standard à respecter :
```
roles/nginx/
  tasks/
    main.yml
    install.yml
    configure.yml
  handlers/
    main.yml          # notify: Restart nginx
  templates/
    nginx.conf.j2
  files/
    dhparam.pem
  defaults/
    main.yml          # variables surchargeables (priorité basse)
  vars/
    main.yml          # variables internes (priorité haute)
  meta/
    main.yml          # dépendances, galaxy_info
```

`defaults/main.yml` — toujours documenter :
```yaml
# Port d'écoute HTTP
nginx_http_port: 80
# Port d'écoute HTTPS (0 = désactivé)
nginx_https_port: 443
# Nombre de workers (auto = nb CPUs)
nginx_worker_processes: auto
```

Handler exemple :
```yaml
# handlers/main.yml
- name: Restart nginx
  service:
    name: nginx
    state: restarted
  listen: Restart nginx
```

### 5. Sécuriser avec Ansible Vault

```bash
# Chiffrer un fichier de secrets
ansible-vault encrypt inventories/production/group_vars/all/vault.yml

# Éditer un fichier chiffré
ansible-vault edit inventories/production/group_vars/all/vault.yml

# Exécuter avec le mot de passe vault
ansible-playbook site.yml --vault-password-file ~/.vault_pass.txt
# ou via variable d'environnement CI/CD
ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass.txt ansible-playbook site.yml
```

Convention de nommage — préfixe `vault_` pour les variables chiffrées :
```yaml
# group_vars/all/vars.yml (clair)
db_password: "{{ vault_db_password }}"

# group_vars/all/vault.yml (chiffré)
vault_db_password: "S3cr3t!"
```

### 6. Templates Jinja2

```jinja2
{# templates/nginx.conf.j2 #}
worker_processes {{ nginx_worker_processes }};

server {
    listen {{ nginx_https_port }} ssl;
    server_name {{ ansible_fqdn }};

    {% for location in nginx_locations %}
    location {{ location.path }} {
        proxy_pass {{ location.backend }};
    }
    {% endfor %}
}
```

Filtres utiles :
```yaml
# Convertir en majuscules
- debug: msg="{{ env | upper }}"
# Valeur par défaut
- debug: msg="{{ timeout | default(30) }}"
# Joindre une liste
- debug: msg="{{ groups['web'] | join(',') }}"
```

### 7. Tester les playbooks

```bash
# Lint (ansible-lint >= 6)
pip install ansible-lint
ansible-lint site.yml

# Syntaxe seule
ansible-playbook --syntax-check site.yml

# Test de role avec Molecule (driver Docker)
pip install molecule molecule-docker
cd roles/nginx
molecule init scenario --driver-name docker
molecule test   # create → converge → verify → destroy
```

`molecule/default/verify.yml` minimal :
```yaml
- name: Verify nginx
  hosts: all
  tasks:
    - name: Check nginx service is running
      service_facts:
    - assert:
        that: "'nginx' in services and services['nginx'].state == 'running'"
```

### 8. Orchestrer les déploiements

**Rolling update :**
```yaml
- hosts: web
  serial: "25%"        # 25% des hôtes à la fois
  max_fail_percentage: 0
  roles:
    - nginx
```

**Intégration CI/CD (GitHub Actions) :**
```yaml
- name: Deploy to production
  run: |
    ansible-playbook -i inventories/production/hosts.ini site.yml \
      --vault-password-file <(echo "$VAULT_PASS") \
      --diff
  env:
    VAULT_PASS: ${{ secrets.ANSIBLE_VAULT_PASS }}
```

## Garde-fous / Anti-patterns / Pièges

| Anti-pattern | Risque | Correction |
|---|---|---|
| `shell: rm -rf /tmp/{{ app }}` | Idempotence cassée + risque injection | `file: path=... state=absent` |
| `command: service nginx restart` | Non-idempotent | Module `service` + handler |
| Variables en clair dans git | Fuite de secrets | Ansible Vault obligatoire |
| `ignore_errors: true` systématique | Erreurs silencieuses en prod | Gérer explicitement les cas d'échec |
| `gather_facts: false` par défaut | Perte des variables `ansible_*` | Désactiver seulement si perf critique et bien documenté |
| Pas de `--check` avant prod | Changements imprévus | Toujours dry-run sur staging d'abord |
| `become: true` sur tout le playbook | Surface d'attaque élargie | `become: true` uniquement sur les tâches qui le nécessitent |

## Bonnes pratiques 2026

- **Collections > rôles communautaires** : utiliser `ansible.posix`, `community.general`, `community.docker` via `requirements.yml` + `ansible-galaxy collection install -r requirements.yml`.
- **`ansible.cfg` versionné** dans le dépôt : `[defaults] host_key_checking = True`, `forks = 10`, `callback_whitelist = profile_tasks`.
- **Épingler la version Ansible** dans le CI (`pip install ansible-core==2.17.*`) pour éviter les régressions.
- **Pas de boucle `with_items`** → remplacer par `loop` (syntaxe moderne depuis Ansible 2.5).
- **`changed_when` et `failed_when`** explicites sur les modules `command`/`shell` inévitables.
- **Secrets rotation** : intégrer HashiCorp Vault ou AWS Secrets Manager via le lookup `community.hashi_vault.vault_read` plutôt que Ansible Vault seul pour les environnements multi-équipes.


## Communication Rules — MANDATORY

- Ultra-concise. No filler, no preamble, no pleasantries.
- Never say "happy to help", "sure!", "great question", "let me", or similar.
- Tool first, talk second. Act before explaining.
- Result first. Lead with outcome, not process.
- Stop when done. No summary, no recap, no trailing commentary.
- No politeness wrappers. Direct and blunt.
- Minimum words. If one word works, do not use ten.
- No unsolicited explanations.
- No emoji unless asked.
