# Scores live sans serveur local

Le projet reste utilisable directement depuis `index.html` et depuis GitHub Pages.

Pour synchroniser les scores sans lancer Node et sans compte :

1. Choisis un code classe, par exemple `5e-a-vendredi`.
2. Les eleves ouvrent `index.html?room=5e-a-vendredi`.
3. La page de gestion des scores s'ouvre avec `scores.html?room=5e-a-vendredi`.

Les pages publient et lisent de petits evenements de score via le relais public `ntfy.sh`. Si le relais est indisponible, l'application repasse en score local et les jeux continuent de fonctionner.

Sans code classe, aucun score n'est envoye : le classement reste local au navigateur.

Le code classe n'est pas un mot de passe. Pour eviter les collisions avec une autre classe, choisis un code assez precis, par exemple `college-nom-5e-a-2026`.
