# Scores live sans serveur local

Le projet reste utilisable directement depuis `index.html` et depuis GitHub Pages.

Pour synchroniser les scores sans lancer Node et sans compte :

1. Choisis un numero de room, par exemple `4821`.
2. Les eleves ouvrent `index.html?room=4821`.
3. La page de gestion des scores s'ouvre avec `scores.html?room=4821`.

Les pages publient et lisent de petits evenements de score via le relais public `ntfy.sh`. Si le relais est indisponible, l'application repasse en score local et les jeux continuent de fonctionner.

Sans `room`, aucun score n'est envoye : le classement reste local au navigateur.

Le numero de room n'est pas un mot de passe. Pour eviter les collisions avec une autre classe, choisis un numero assez long, par exemple `482193`.
