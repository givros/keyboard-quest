# Serveur local de scores

Keyboard Quest reste un site statique : `index.html` et GitHub Pages continuent de fonctionner sans serveur. Le serveur local est seulement une option pour partager un classement en direct dans une salle ou sur un reseau local.

## Lancer

```bash
node server.js
```

Ouvre ensuite :

```text
http://127.0.0.1:8770/index.html
```

Pour une classe, lance le serveur sur l'ordinateur professeur. Les eleves ouvrent l'adresse affichee dans le terminal, par exemple :

```text
http://192.168.1.42:8770/index.html
```

## Repli automatique

Si le serveur n'est pas lance, ne repond pas, ou tombe pendant une partie, le navigateur repasse en score local. Les mini-jeux et la page GitHub Pages ne dependent donc pas du serveur.

Les scores du serveur sont gardes dans `server-data/leaderboard.json`. Ce dossier est ignore par Git pour eviter de publier les donnees de classe.
