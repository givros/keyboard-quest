# Scores live sur GitHub Pages

Le projet reste un site statique lance depuis `index.html`. Pour partager le classement entre plusieurs navigateurs sur GitHub Pages, il faut un service externe cote client.

## Firebase Realtime Database

1. Cree un projet dans la console Firebase.
2. Ajoute une application Web et copie la configuration `firebaseConfig`.
3. Active Authentication > Sign-in method > Anonymous.
4. Cree une Realtime Database.
5. Publie les regles depuis `firebase.rules.json`.
6. Dans `src/score-config.js`, remplace `provider: "local"` par `provider: "firebase"` et renseigne `apiKey`, `authDomain`, `databaseURL`, `projectId` et `appId`.

Sans cette configuration, le tableau fonctionne en mode local pour les tests, mais il ne sera pas partage entre machines.

Le cooldown de classement est regle a 10 minutes par combinaison `jeu + niveau + difficulte`.
