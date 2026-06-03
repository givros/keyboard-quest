# Scores live avec room unique

Le projet reste utilisable directement depuis `index.html` et depuis GitHub Pages.

Fonctionnement actuel :

1. Les eleves ouvrent `index.html`.
2. Ils entrent seulement leur pseudo.
3. La page de gestion des scores s'ouvre avec `scores.html`.
4. Tous les scores utilisent la meme room unique configuree dans `src/score-config.js`.

Les pages publient et lisent de petits evenements de score via le relais public `ntfy.sh`. L'application garde aussi une verification reguliere en arriere-plan afin que le tableau se mette a jour meme si le flux direct est temporairement instable.

Le bouton `Vider la room` sur la page score publie un evenement de reset. Les anciens scores de la room sont alors ignores, y compris apres un rafraichissement de page.

Si le relais est indisponible, les jeux continuent de fonctionner avec des scores locaux.
