
export const removeDuplicatesStringValuesFromArray = (list_to_remove: string[]) => {
  const list = list_to_remove.filter((element, index) => {
    return list_to_remove.indexOf(element) === index;
  });

  return list.filter(element => element);
}

export const groupAndSumBy = <T, >(array: T[], groupBy: keyof T, sumBy: keyof T) => {
  const initialValues = {} as any

  const resultArrayGrouped = array.reduce((previousValue, currentValue: T) => {
    //Not exist in initial values, then add
    if (!previousValue[currentValue[groupBy]]) {
      previousValue[currentValue[groupBy]] = { 
        ...currentValue, 
        [groupBy]: currentValue[groupBy], 
        [sumBy]: 0,
      };
    }

    //IF already exist, then refresh the value keyof sumBy
    previousValue[currentValue[groupBy]][sumBy] += currentValue[sumBy];
    return previousValue;
  }, initialValues);

  //Get values inside result reduce, its like a input array
  const resultLikeArrayInput = Object.keys(resultArrayGrouped).map(function(key, index) {
    return resultArrayGrouped[key];
  })

  //Remove key object different keyof groupBy and sumBy
  resultLikeArrayInput.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if(key !== groupBy && key !== sumBy) {
        delete item[key]; 
      }
    })  
  })

  return resultLikeArrayInput;
}

export const sumObjectValuesFromArray = <T, >(array: T[], sumBy: keyof T) => {
  const initialValues = { sum: 0 };

  const result = array.reduce((previousValue, currentValue: T) => {
    previousValue.sum += typeof currentValue[sumBy] == 'number' ? currentValue[sumBy] as number : 0;
    return previousValue;
  }, initialValues);

  return result.sum;
}

export const orderAsc = (value_a: string | number | undefined, value_b: string | number | undefined) => {
  if(!value_a || !value_b) return 0;
  if(value_a > value_b) return 1;
  if(value_a < value_b) return -1;
  return 0;
}

export const isEqual = (a: any[], b: any[]) => {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];

    // Comparação simples por valor
    if (typeof item !== 'object' || item === null) {
      return item === other;
    }

    // Comparação profunda para objetos
    return JSON.stringify(item) === JSON.stringify(other);
  });
};

