// Utilitate pentru compararea profundă a obiectelor
// Optimizată pentru detectarea modificărilor în formulare

/**
 * Compară două valori pentru egalitatea profundă
 * 
 * @param {any} a - Prima valoare
 * @param {any} b - A doua valoare
 * @returns {boolean} - True dacă valorile sunt egale
 */
export function deepEqual(a, b) {
  // Verificare identitate referință
  if (a === b) return true;

  // Verificare null/undefined
  if (a == null || b == null) return a === b;

  // Verificare tipuri primitive
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }

  // Verificare array-uri
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Verificare obiecte
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Compară două obiecte ignorând anumite câmpuri
 * 
 * @param {Object} a - Primul obiect
 * @param {Object} b - Al doilea obiect
 * @param {string[]} ignoreFields - Câmpurile de ignorat
 * @returns {boolean} - True dacă obiectele sunt egale
 */
export function deepEqualIgnoreFields(a, b, ignoreFields = []) {
  const filterFields = (obj) => {
    const filtered = { ...obj };
    ignoreFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  };

  return deepEqual(filterFields(a), filterFields(b));
}

export default deepEqual;