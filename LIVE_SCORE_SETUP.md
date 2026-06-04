# Scores live avec Supabase

Le projet reste utilisable directement depuis `index.html` et depuis GitHub Pages.

Fonctionnement actuel :

1. Les eleves ouvrent `index.html`.
2. Ils entrent leur pseudo.
3. Une ligne est creee dans Supabase.
4. Les points gagnes ou perdus mettent cette ligne a jour.
5. La page de gestion des scores s'ouvre avec `scores.html`.
6. `scores.html` relit Supabase automatiquement toutes les 3 secondes.

Il n'y a qu'une seule table : `keyboard_quest_scores`.

Le bouton `Vider les scores` supprime toutes les lignes de cette table. Il sert a repartir de zero pour une nouvelle session.

Si Supabase est indisponible, les jeux continuent de fonctionner avec des scores locaux, puis la page retente regulierement.
