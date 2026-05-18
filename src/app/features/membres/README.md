# features/membres/

Ce dossier gère l'**invitation de nouveaux membres** dans un département.

## Composant

### `invite-dialog/invite-dialog.component.ts`

Dialog (fenêtre modale) ouvert depuis le dashboard admin pour inviter un nouveau membre.

**Formulaire :**
- Email de l'invité
- Rôle à assigner : `membre` ou `bureau`

**À la soumission :**
1. Appelle `UserService.sendInvitation({ deptId, email, role })`
2. → `POST /invitation/send` sur l'API
3. L'API crée un document d'invitation dans Firestore avec un token UUID unique, valable 7 jours

**Après ça, que se passe-t-il ?**
L'admin doit partager manuellement le lien d'invitation à l'invité :
```
https://ton-app.com/auth/accept-invitation?dept={deptId}&token={token}
```
L'invité clique sur ce lien, remplit le formulaire `AcceptInvitationComponent`, et rejoint le département.

## Pourquoi un système d'invitation et pas la création directe ?

Il existe deux façons d'ajouter un membre :

| Méthode | Route API | Cas d'usage |
|---|---|---|
| **Invitation** | `POST /invitation/send` | L'invité crée lui-même son mot de passe |
| **Création gérée** | `POST /member/create` | L'admin crée le compte complet (mot de passe temporaire) |

L'invitation est préférable pour les membres qui ont une adresse email et veulent gérer leur propre compte. La création gérée est utile pour des membres moins à l'aise avec la technologie.

## Lien avec les autres dossiers

- `features/auth/accept-invitation/` → page qui traite le lien d'invitation
- `core/services/user.service.ts` → `sendInvitation()` fait l'appel API
- `tontine-api/src/routes/invitation.ts` → logique côté serveur
