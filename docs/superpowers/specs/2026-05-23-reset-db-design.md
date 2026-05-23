# Reset Database Design

**Goal:** Script TypeScript dans `tontine-api/scripts/` qui efface toutes les données Firestore et tous les comptes Firebase Auth, sauf le super admin `israel01tientcheu@gmail.com`.

**Architecture:** Script one-shot utilisant Firebase Admin SDK (déjà configuré dans `tontine-api`). Même pattern que `scripts/set-super-admin.ts` existant.

**Tech Stack:** TypeScript, Firebase Admin SDK v12, ts-node

---

## Fichier produit

`tontine-api/scripts/reset-db.ts`

Exécution :
```bash
cd tontine-api && npx ts-node scripts/reset-db.ts
```

---

## Séquence d'exécution

1. Init Firebase Admin via `service-account.json` ou `.env` (FIREBASE_SERVICE_ACCOUNT_JSON)
2. Récupérer le super admin par email `israel01tientcheu@gmail.com`
3. Vérifier que le claim `role: "super_admin"` est présent — si absent ou compte introuvable → arrêt immédiat, rien n'est supprimé
4. Lister tous les comptes Firebase Auth par pages de 1000
5. Supprimer tous les comptes sauf le super admin (par UID)
6. `recursiveDelete("departments")` — supprime la collection et toutes ses sous-collections
7. `recursiveDelete("department_requests")`
8. `recursiveDelete("users")`
9. `recursiveDelete("mail")`
10. Afficher le rapport : nombre de comptes Auth supprimés + collections vidées

---

## Ce qui est supprimé

### Firebase Auth
- Tous les comptes utilisateurs **sauf** `israel01tientcheu@gmail.com`

### Firestore (récursif, sous-collections incluses)

| Collection | Sous-collections |
|---|---|
| `departments/{deptId}` | `users`, `notifications`, `invitations`, `saisons/cycles/cotisations`, `caisse`, `transactions` |
| `department_requests` | — |
| `users` | — |
| `mail` | — |

---

## Ce qui est conservé

| Élément | Détail |
|---|---|
| Compte Firebase Auth | `israel01tientcheu@gmail.com` — UID et mot de passe inchangés |
| Custom claim | `{ role: "super_admin" }` — inchangé |
| Configuration Firebase | Auth settings, Hosting, règles Firestore — non touchés |
| Code source | `tontine-web` et `tontine-api` — non touchés |

---

## Gestion d'erreurs

- Super admin introuvable par email → log d'erreur + `process.exit(1)` avant toute suppression
- Super admin trouvé mais claim manquant → log d'avertissement + `process.exit(1)` avant toute suppression
- Erreur pendant la suppression → log de l'erreur + `process.exit(1)`

---

## Contraintes

- Pas de confirmation interactive (script entièrement automatique)
- `recursiveDelete` utilise `admin.firestore().recursiveDelete()` (disponible dans Firebase Admin SDK v11+)
- Le script ne crée aucune donnée de test — les départements sont créés via l'interface (formulaire de demande + provision super admin)
- Compatible avec le `tsconfig.json` existant (`rootDir: "./src"`) → le script est compilé indépendamment avec `ts-node`
