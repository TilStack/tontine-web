# Tontine Départementale — Règles projet Claude Code

## Stack technique
- Frontend : Angular 17+ avec standalone components
- Backend : Firebase (Firestore, Auth, Cloud Functions, Hosting)
- Style : SCSS avec Angular Material
- Langage : TypeScript strict mode
- Tests : Jest + Playwright (E2E)

## Règles métier ABSOLUES — Ne jamais dévier de ces règles

### Cotisation
- Montant fixe : 15 000 FCFA par membre par cycle
- Deadline : avant le 5 du mois suivant l'ouverture du cycle
- Rappel automatique : J-5 avant la deadline via Cloud Function + notification
- Chaque paiement est enregistré avec timestamp et marqué comme payé
- Le statut de paiement de chaque membre est VISIBLE PAR TOUS les membres du département

### Calcul de distribution
- Montant bénéficiaire = 120 000 FCFA × nombre de membres actifs du cycle
- Solde restant (cotisations totales - 120 000 × membres) → caisse commune
- La caisse commune sert aux sorties et événements du département

### Ordre des bénéficiaires
- Rang 1 et Rang 2 : élus à l'unanimité, ce sont les membres les plus anciens
- Rangs suivants : déterminés par l'admin au choix entre :
  - Mode 1 : tirage au sort automatique
  - Mode 2 : rotation fixe définie manuellement par l'admin
- Le mode est choisi par l'admin avant le démarrage du premier cycle
- L'ordre est IMMUABLE une fois le cycle lancé, sauf pénalité

### Pénalités
- Condition : membre en retard ET n'ayant pas encore reçu son tour
- Conséquence 1 : montant dû retranché de la cotisation globale du cycle
- Conséquence 2 : passage automatique en DERNIÈRE position dans l'ordre des rangs
- Cette logique doit OBLIGATOIREMENT être une Cloud Function côté serveur
- Jamais de logique de pénalité côté Angular (risque de manipulation client)

### Confirmation de réception
- Le bénéficiaire du cycle confirme avoir reçu son argent
- Cette confirmation est visible par tous les membres du département
- La confirmation déclenche automatiquement l'activation du prochain rang

### Transparence en temps réel
- Chaque membre voit : qui a payé, qui n'a pas payé, total collecté
- Le bénéficiaire voit : combien ont payé, montant déjà réuni, montant restant
- Toutes ces données sont en temps réel via Firestore listeners

## Architecture multi-tenant (CRITIQUE)
- Chaque département est une entité isolée
- Un membre du département A ne peut JAMAIS voir les données du département B
- Les Firestore Security Rules doivent enforcer cette isolation
- Le Super Admin peut lire (pas écrire) les données de tous les départements
- Le Super Admin n'intervient sur une tontine que sur décision explicite

## Rôles et permissions
- super_admin : lecture globale, intervention exceptionnelle uniquement
- admin : CRUD complet sur sa tontine, invite membres, ouvre/ferme les cycles
- bureau : valide les paiements, confirme réceptions, gère la caisse
- membre : voit l'avancement, confirme son propre paiement, confirme réception si bénéficiaire

## Structure Firestore
departments/{deptId}
  name, adminId, createdAt, settings
  users/{userId}
    displayName, role, rang, hasBenefited, joinedAt
  cycles/{cycleId}
    status, deadline, beneficiaryId, orderMode, startedAt, closedAt
    cotisations/{cotisationId}
      userId, amount, paidAt, penalty, penaltyAmount
  caisse/{transactionId}
    amount, type, description, date, createdBy

## Conventions de code
- TypeScript strict, pas de `any`
- Chaque feature est un module Angular lazy-loaded
- Cloud Functions dans /functions/src/
- Interfaces TypeScript dans /src/app/core/models/
- Services Firebase dans /src/app/core/services/
- Nommage : kebab-case fichiers, PascalCase classes
- Chaque composant a son fichier .spec.ts

## Ce que Claude NE DOIT PAS faire
- Ajouter de la logique de paiement virtuel (hors scope)
- Modifier l'ordre des rangs sans passer par la logique de pénalité définie
- Créer des raccourcis qui bypassent les Firestore Security Rules
- Utiliser des patterns Angular obsolètes (pas de NgModules classiques)
- Mettre de la logique métier sensible côté client Angular
