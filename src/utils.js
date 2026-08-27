// Écarte les champs absents du corps d'une requête PATCH.
// PostgreSQL refuse un UPDATE sans aucune colonne : sans ce filtre, un corps
// ne contenant que des champs ignorés provoquerait une erreur 500.
export function champsRenseignes(donnees) {
  return Object.fromEntries(
    Object.entries(donnees).filter(([, valeur]) => valeur !== undefined),
  );
}
