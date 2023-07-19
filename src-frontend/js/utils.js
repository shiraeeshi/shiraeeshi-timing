
export function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export function listEqOrBothUndefined(listA, listB) {
  if (listA === undefined) {
    if (listB === undefined) {
      return true;
    } else {
      return false;
    }
  }
  if (listB === undefined) {
    return false;
  }
  if (listA.length !== listB.length) {
    return false;
  }
  for (let idx = 0; idx < listA.length; idx++) {
    if (listA[idx] !== listB[idx]) {
      return false;
    }
  }
  return true;
}
